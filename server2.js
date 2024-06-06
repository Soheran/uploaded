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
  
    // Store the username in the socket object
    socket.username = data.name;
  
    // Get all sockets in the room
    const socketsInRoom = await io.in(data.room).fetchSockets();
    const usernames = socketsInRoom.map(socket => socket.username);
    
    // Emit the list of usernames to all clients in the room
    io.to(data.room).emit('usernames', usernames);
    
    // Emit the number of clients to all clients in the room
    const connectedClientsCount = socketsInRoom.length;
    io.to(data.room).emit('clientCount', connectedClientsCount);
    console.log(`Number of Clients in Room ${data.room}: ${connectedClientsCount}`);
  
    // Emit a message to all clients in the room about the new client
    io.to(data.room).emit('message', { name: 'Server', message: `${data.name} has joined the room. Total clients: ${connectedClientsCount}` });
  });

  socket.on('message', (data) => {
    console.log(`Message from ${data.name}: ${data.message || data.content}`);
    io.to(data.room).emit('message', { name: data.name, message: data.message, type: data.type, content: data.content });
  });

  socket.on('leaveRoom', async (data) => {
    socket.leave(data.room);
    console.log(`${data.name} left room ${data.room}`);
  
    // Get all sockets in the room
    const socketsInRoom = await io.in(data.room).fetchSockets();
  
    // Remove the username from the socket object
    delete socket.username;
  
    // Recalculate the number of connected clients
    const connectedClientsCount = socketsInRoom.length;
  
    // Get the updated list of usernames
    const usernames = socketsInRoom.map(socket => socket.username);
  
    // Emit the updated list of usernames to all clients in the room
    io.to(data.room).emit('usernames', usernames);
  
    // Emit the updated number of clients to all clients in the room
    io.to(data.room).emit('clientCount', connectedClientsCount);
    console.log(`Number of Clients in Room ${data.room}: ${connectedClientsCount}`);
  
    // Emit a message to all clients in the room about the user leaving
    io.to(data.room).emit('message', { name: 'Server', message: `${data.name} has left the room. Total clients: ${connectedClientsCount}` });
  });

  socket.on('offer', (data) => {
    console.log(`Offer from ${data.sdp}`);
    io.to(data.target).emit('offer', {
      sdp: data.sdp,
      sender: socket.id,
    });
  });

  socket.on('answer', (data) => {
    console.log(`Answer from ${data.sdp}`);
    io.to(data.target).emit('answer', {
      sdp: data.sdp,
      sender: socket.id,
    });
  });

  socket.on('ice-candidate', (data) => {
    console.log(`ICE Candidate from ${data.candidate}`);
    io.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id,
    });
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected');
    const socketsInRoom = await io.in(socket.room).fetchSockets();
    const usernames = socketsInRoom.map(socket => socket.username);
    io.to(socket.room).emit('usernames', usernames);
    io.to(socket.room).emit('clientCount', socketsInRoom.length);
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
