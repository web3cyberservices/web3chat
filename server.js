const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Настройка пула БД для логирования сообщений (Immutable Audit Log)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Парсинг аргументов командной строки для поддержки портов и хостов
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const hostnameArgIndex = args.indexOf('--hostname');

const PORT = (portArgIndex !== -1 && args[portArgIndex + 1]) ? parseInt(args[portArgIndex + 1]) : (process.env.PORT || 3000);
const HOSTNAME = (hostnameArgIndex !== -1 && args[hostnameArgIndex + 1]) ? args[hostnameArgIndex + 1] : (process.env.HOSTNAME || '0.0.0.0');

async function logMessageToDB(targetId, payload, timestamp) {
  try {
    await pool.query(
      'INSERT INTO messages (timestamp, target_id, payload) VALUES ($1, $2, $3)',
      [timestamp || Date.now(), targetId, payload]
    );
  } catch (err) {
    console.error('[DB Error] Failed to log message:', err);
  }
}

app.prepare().then(() => {
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
    console.log('[Socket] Connection established:', socket.id);

    // Регистрация пользователя в персональной комнате по его ID
    socket.on('register', (userId) => {
      socket.join(userId);
      console.log(`[Socket] User ${userId} joined their private room`);
    });

    socket.on('send_message', async (data) => {
      if (data.targetId) {
        // Мгновенная доставка адресату через его комнату
        socket.to(data.targetId).emit('receive_message', data);
        
        // Персистентное сохранение в БД (Audit Log)
        await logMessageToDB(data.targetId, data.payload, data.timestamp);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] User disconnected');
    });
  });

  server.listen(PORT, HOSTNAME, (err) => {
    if (err) throw err;
    console.log(`> Web3 Chat Ready: http://${HOSTNAME}:${PORT}`);
  });
});