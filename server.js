const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Pool } = require('pg');

// Парсинг аргументов командной строки (для Firebase Studio)
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const hostArg = args.indexOf('--hostname');

const PORT = portArg !== -1 ? parseInt(args[portArg + 1], 10) : (process.env.PORT || 3000);
const HOSTNAME = hostArg !== -1 ? args[hostArg + 1] : (process.env.HOSTNAME || '0.0.0.0');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Настройка пула БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Добавляем таймаут, чтобы не ждать вечно в среде без БД
  connectionTimeoutMillis: 5000,
});

async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.log('[DB] DATABASE_URL not set, skipping initialization');
    return;
  }
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
    console.log('[DB] Database initialized');
  } catch (err) {
    console.error('[DB] Initialization error:', err.message);
    // Не выбрасываем ошибку дальше, чтобы сервер мог запуститься без БД (для превью)
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
    console.error('[DB Error] Failed to log message:', err.message);
  }
}

app.prepare().then(async () => {
  await initDB();

  const server = createServer((req, res) => {
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
      if (userId) {
        socket.join(userId);
        console.log(`[Socket] User ${userId} joined room`);
      }
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
    console.log(`> Web3 Chat Ready: http://${HOSTNAME}:${PORT}`);
  });
});