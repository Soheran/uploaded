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

io.on('connection', async (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', async (data) => {
    socket.join(data.room);
    console.log(`${data.name} joined room ${data.room}`);
    socket.username = data.name;
    const socketsInRoom = await io.in(data.room).fetchSockets();
    const usernames = socketsInRoom.map(socket => socket.username);
    io.to(data.room).emit('usernames', usernames);
    const connectedClientsCount = socketsInRoom.length;
    io.to(data.room).emit('clientCount', connectedClientsCount);
    console.log(`Number of Clients in Room ${data.room}: ${connectedClientsCount}`);
    io.to(data.room).emit('message', { name: 'Server', message: `${data.name} has joined the room. Total clients: ${connectedClientsCount}` });
  });

  // Handle WebRTC signaling messages
  socket.on('offer', (data) => {
    socket.to(data.room).emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to(data.room).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.room).emit('ice-candidate', data);
  });

  socket.on('message', (data) => {
    console.log(`Message from ${data.name}: ${data.message || data.content}`);
    io.to(data.room).emit('message', { name: data.name, message: data.message, type: data.type, content: data.content });
  });

  socket.on('leaveRoom', async (data) => {
    socket.leave(data.room);
    console.log(`${data.name} left room ${data.room}`);
    const socketsInRoom = await io.in(data.room).fetchSockets();
    delete socket.username;
    const connectedClientsCount = socketsInRoom.length;
    const usernames = socketsInRoom.map(socket => socket.username);
    io.to(data.room).emit('usernames', usernames);
    io.to(data.room).emit('clientCount', connectedClientsCount);
    console.log(`Number of Clients in Room ${data.room}: ${connectedClientsCount}`);
    io.to(data.room).emit('message', { name: 'Server', message: `${data.name} has left the room. Total clients: ${connectedClientsCount}` });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
