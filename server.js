const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const hostArg = args.indexOf('--hostname');

const PORT = portArg !== -1 ? parseInt(args[portArg + 1], 10) : (process.env.PORT || 3000);
const HOSTNAME = hostArg !== -1 ? args[hostArg + 1] : (process.env.HOSTNAME || '0.0.0.0');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

async function initDB() {
  if (!process.env.DATABASE_URL) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        target_id TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_target ON messages(target_id);
    `);
    console.log('[DB] Core initialized');
  } catch (err) {
    console.error('[DB Error]', err.message);
  }
}

async function logMessageToDB(targetId, payload, timestamp) {
  if (!process.env.DATABASE_URL) return;
  try {
    await pool.query(
      'INSERT INTO messages (timestamp, target_id, payload) VALUES ($1, $2, $3)',
      [timestamp || Date.now(), targetId, payload]
    );
  } catch (err) {
    console.error('[DB Error] Log failure:', err.message);
  }
}

app.prepare().then(async () => {
  await initDB();

  const server = createServer((req, res) => {
    // Cloud Proxy Stability: Handle forwarded headers for correct origin and protocol
    const forwardedHost = req.headers['x-forwarded-host'];
    const forwardedProto = req.headers['x-forwarded-proto'];
    
    if (forwardedHost) {
      req.headers['host'] = forwardedHost;
    }

    // Modern Security Headers & CORS support for cloud workstations
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    socket.on('register', (userId) => {
      if (userId) socket.join(userId);
    });

    socket.on('send_message', async (data) => {
      if (data.targetId && data.payload) {
        io.to(data.targetId).emit('receive_message', data);
        await logMessageToDB(data.targetId, data.payload, data.timestamp);
      }
    });
  });

  server.listen(PORT, HOSTNAME, (err) => {
    if (err) throw err;
    console.log(`> Web3 Service Active: http://${HOSTNAME}:${PORT}`);
  });
});
