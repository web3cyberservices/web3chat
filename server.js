const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Настройка пула БД для логирования сообщений (Immutable Audit Log)
// Используем переменную окружения DATABASE_URL из docker-compose
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Инициализация таблицы при старте
async function initDB() {
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
    console.error('[DB] Initialization error:', err);
  }
}

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

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

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
    console.log('[Socket] Connection established:', socket.id);

    // Регистрация пользователя в персональной комнате по его ID
    socket.on('register', (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`[Socket] User ${userId} joined their private room`);
      }
    });

    socket.on('send_message', async (data) => {
      if (data.targetId && data.payload) {
        // Мгновенная доставка адресату через его комнату
        io.to(data.targetId).emit('receive_message', data);
        
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