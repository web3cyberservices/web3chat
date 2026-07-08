const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

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

    // Ретрансляция зашифрованных сообщений
    socket.on('send_message', (data) => {
      // Broadcast всем, кроме отправителя
      socket.broadcast.emit('receive_message', data);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] User disconnected:', socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Web3 Chat: HTTP + WebSocket Server ready on http://localhost:${PORT}`);
  });
});