const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Парсинг аргументов командной строки для поддержки Firebase Studio
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const hostnameArgIndex = args.indexOf('--hostname');

const PORT = (portArgIndex !== -1 && args[portArgIndex + 1]) ? parseInt(args[portArgIndex + 1]) : (process.env.PORT || 3000);
const HOSTNAME = (hostnameArgIndex !== -1 && args[hostnameArgIndex + 1]) ? args[hostnameArgIndex + 1] : (process.env.HOSTNAME || '0.0.0.0');

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Инициализация Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('[Socket] User connected:', socket.id);

    // Привязываем сокет-соединение к конкретному User ID
    socket.on('register', (userId) => {
      socket.join(userId);
      console.log(`[Socket] Linked socket ${socket.id} to user ${userId}`);
    });

    // Ретрансляция зашифрованных сообщений лично получателю
    socket.on('send_message', (data) => {
      if (data.targetId) {
        socket.to(data.targetId).emit('receive_message', data);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] User disconnected:', socket.id);
    });
  });

  server.listen(PORT, HOSTNAME, (err) => {
    if (err) throw err;
    console.log(`> Web3 Chat: HTTP + WebSocket Server ready on http://${HOSTNAME}:${PORT}`);
  });
});
