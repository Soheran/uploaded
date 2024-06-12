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

  socket.on('joinRoom', async (data) => {
    socket.join(data.room);
    console.log(`${data.name} joined room ${data.room} with ID ${data.peerID}`);
  
    // Store the username and peer id in the socket object
    socket.username = data.name;
    socket.peerID = data.peerID;
  
    // Get all sockets in the room
    const socketsInRoom = await io.in(data.room).fetchSockets();
    const users = socketsInRoom.map(socket => ({ username: socket.username, peerID: socket.peerID }));

    // Add room to rooms object if it doesn't exist
    if (!rooms[data.room]) {
      rooms[data.room] = { users: [], messages: [] };
    }

    rooms[data.room].users.push({ username: data.name, peerID: data.peerID });
    
    // Emit the list of users to all clients in the room
    io.to(data.room).emit('users', users);
    
    // Emit the number of clients to all clients in the room
    const connectedClientsCount = socketsInRoom.length;
    io.to(data.room).emit('clientCount', connectedClientsCount);
    console.log(`Number of Clients in Room ${data.room}: ${connectedClientsCount}`);
  
    // Emit the chat history to the new client
    io.to(socket.id).emit('chatHistory', rooms[data.room].messages);
  
    // Emit a message to all clients in the room about the new client
    io.to(data.room).emit('message', { name: 'Server', message: `${data.name} has joined the Room with the ID ${data.peerID}. Total clients: ${connectedClientsCount}` });
  });

  socket.on('message', (data) => {
    console.log(`Message from ${data.name}: ${data.message || data.content}`);

    // Add message to the room's message list
    const msg = { name: data.name, message: data.message, type: data.type, content: data.content };
    rooms[data.room].messages.push(msg);

    io.to(data.room).emit('message', msg);
  });

  socket.on('callStarted', (data) => {
    io.to(data.room).emit('userStartedCall', { peerId: socket.peerID, username: socket.username });
    console.log(`User started call in room ${data.room}`);
  });

  socket.on('offer', (data) => {
    socket.to(data.peerID).emit('offer', { offer: data.offer, peerId: socket.peerID });
  });

  socket.on('answer', (data) => {
    socket.to(data.peerID).emit('answer', { answer: data.answer, peerId: socket.peerID });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.peerID).emit('ice-candidate', { candidate: data.candidate, peerId: socket.peerID });
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

    // Update the room's users list
    rooms[data.room].users = rooms[data.room].users.filter(user => user.peerID !== data.peerID);

    // Get the updated list of usernames
    const users = socketsInRoom.map(socket => ({ username: socket.username, peerID: socket.peerID }));
  
    // Emit the updated list of users to all clients in the room
    io.to(data.room).emit('users', users);
  
    // Emit the updated number of clients to all clients in the room
    io.to(data.room).emit('clientCount', connectedClientsCount);
    console.log(`Number of Clients in Room ${data.room}: ${connectedClientsCount}`);
  
    // Emit a message to all clients in the room about the user leaving
    io.to(data.room).emit('message', { name: 'Server', message: `${data.name} has left the room. Total clients: ${connectedClientsCount}` });

    // If no clients are left in the room, delete the room
    if (connectedClientsCount === 0) {
      delete rooms[data.room];
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected');

    // Handle user disconnection and cleanup
    const room = Object.keys(socket.rooms).find(r => r !== socket.id);
    if (room) {
      socket.leave(room);
      const socketsInRoom = await io.in(room).fetchSockets();
      const connectedClientsCount = socketsInRoom.length;
      rooms[room].users = rooms[room].users.filter(user => user.peerID !== socket.peerID);
      const users = socketsInRoom.map(socket => ({ username: socket.username, peerID: socket.peerID }));
      io.to(room).emit('users', users);
      io.to(room).emit('clientCount', connectedClientsCount);
      console.log(`Number of Clients in Room ${room}: ${connectedClientsCount}`);
      io.to(room).emit('message', { name: 'Server', message: `${socket.username} has disconnected. Total clients: ${connectedClientsCount}` });

      if (connectedClientsCount === 0) {
        delete rooms[room];
      }
    }
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
