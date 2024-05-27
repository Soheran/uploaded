const http = require("http");
const { Server } = require("socket.io");

const httpServer = http.createServer();
const io = new Server();

io.attach(httpServer);

const rooms = {};

io.on("connection", (socket) => {
    console.log("A user connected");

    // Join a room
    socket.on("joinRoom", (roomName) => {
        if (!rooms[roomName]) {
            rooms[roomName] = [];
        }
        socket.join(roomName);
        rooms[roomName].push(socket.id);
        console.log(`User ${socket.id} joined room ${roomName}`);
    });

    // Leave a room
    socket.on("leaveRoom", (roomName) => {
        if (rooms[roomName]) {
            const index = rooms[roomName].indexOf(socket.id);
            if (index !== -1) {
                rooms[roomName].splice(index, 1);
                socket.leave(roomName);
                console.log(`User ${socket.id} left room ${roomName}`);
            }
            if (rooms[roomName].length === 0) {
                delete rooms[roomName];
            }
        }
    });

    // Event handler for disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected");
        // Remove user from all rooms
        for (const roomName in rooms) {
            const index = rooms[roomName].indexOf(socket.id);
            if (index !== -1) {
                rooms[roomName].splice(index, 1);
                if (rooms[roomName].length === 0) {
                    delete rooms[roomName];
                }
            }
        }
    });
});

const PORT = process.env.port || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
