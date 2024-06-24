const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};
const quizzes = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-room', ({ roomId, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push({ id: socket.id, username });
    socket.join(roomId);
    socket.username = username;

    io.to(roomId).emit('user-joined', {
      username,
      users: rooms[roomId].map(user => ({ peerId: user.id, username: user.username }))
    });
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

  socket.on('send-message', ({ roomId, message, username }) => {
    io.to(roomId).emit('receive-message', { username, message });
    console.log(`Message from ${username} in room ${roomId}: ${message}`);
  });

  socket.on('file-transfer', (data) => {
    io.to(data.roomId).emit('file-transfer', data);
    console.log(`File transfer from ${data.username} in room ${data.roomId}`);
  });

  socket.on('quiz-start', ({ roomId, questions }) => {
    quizzes[roomId] = { questions, scores: {} };
    io.to(roomId).emit('quiz-start', questions);
    console.log(`Quiz started in room ${roomId}`);
  });

  socket.on('quiz-answer', ({ roomId, username, score }) => {
    if (!quizzes[roomId].scores[username]) {
      quizzes[roomId].scores[username] = 0;
    }
    quizzes[roomId].scores[username] += score;
    io.to(roomId).emit('quiz-answer', { username, score });
    console.log(`Answer received from ${username} in room ${roomId} with score ${score}`);
  });

  socket.on('quiz-end', ({ roomId }) => {
    io.to(roomId).emit('quiz-end');
    delete quizzes[roomId];
    console.log(`Quiz ended in room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
      io.to(roomId).emit('user-left', {
        username: socket.username,
        users: rooms[roomId].map(user => ({ peerId: user.id, username: user.username }))
      });
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        delete quizzes[roomId];
      }
    }
  });

  socket.on('error', (err) => {
    console.error('Socket encountered error:', err.message);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
