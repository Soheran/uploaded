const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const uploadDir = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }
  console.log('File uploaded:', req.file);
  res.json({ url: `http://192.168.1.159:8080/uploads/${req.file.filename}` });
});

let rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-room', async ({ roomId, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [], messages: [] };
    }
    rooms[roomId].users.push({ id: socket.id, username });
    socket.join(roomId);

    const socketsInRoom = await io.in(roomId).fetchSockets();
    const usernames = socketsInRoom.map(s => s.username || s.id);

    io.to(roomId).emit('user-joined', { username, users: rooms[roomId].users.map(user => ({ peerId: user.id, username: user.username })) });
    io.to(roomId).emit('usernames', usernames);
    io.to(socket.id).emit('chatHistory', rooms[roomId].messages);
    console.log(`${username} joined room ${roomId}`);
  });

  socket.on('start-call', ({ roomId }) => {
    io.to(roomId).emit('user-started-call', { peerId: socket.id, username: socket.username });
    console.log(`User started call in room ${roomId}`);
  });

  socket.on('offer', (data) => {
    socket.to(data.peerId).emit('offer', { offer: data.offer, peerId: socket.id });
  });

  socket.on('answer', (data) => {
    socket.to(data.peerId).emit('answer', { answer: data.answer, peerId: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.peerId).emit('ice-candidate', { candidate: data.candidate, peerId: socket.id });
  });

  socket.on('message', (data) => {
    const msg = { name: data.name, message: data.message, type: data.type, content: data.content };
    rooms[data.room].messages.push(msg);
    io.to(data.room).emit('message', msg);
  });

  socket.on('leaveRoom', async (data) => {
    socket.leave(data.room);
    console.log(`${data.name} left room ${data.room}`);

    const socketsInRoom = await io.in(data.room).fetchSockets();

    rooms[data.room].users = rooms[data.room].users.filter(user => user.username !== data.name);
    const usernames = socketsInRoom.map(s => s.username || s.id);

    io.to(data.room).emit('usernames', usernames);
    io.to(data.room).emit('clientCount', socketsInRoom.length);
    io.to(data.room).emit('message', { name: 'Server', message: `${data.name} has left the room. Total clients: ${socketsInRoom.length}` });

    if (socketsInRoom.length === 0) {
      delete rooms[data.room];
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected');

    const room = Object.keys(socket.rooms).find(r => r !== socket.id);
    if (room) {
      socket.leave(room);
      const socketsInRoom = await io.in(room).fetchSockets();
      rooms[room].users = rooms[room].users.filter(user => user.id !== socket.id);
      const usernames = socketsInRoom.map(s => s.username || s.id);

      io.to(room).emit('usernames', usernames);
      io.to(room).emit('clientCount', socketsInRoom.length);
      io.to(room).emit('message', { name: 'Server', message: `${socket.username || 'A user'} has disconnected. Total clients: ${socketsInRoom.length}` });

      if (socketsInRoom.length === 0) {
        delete rooms[room];
      }
    }
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
