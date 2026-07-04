import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // Allow large image chunks
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join_room', ({ roomCode, isHost }) => {
    socket.join(roomCode);
    console.log(`👤 User ${socket.id} joined room ${roomCode} as ${isHost ? 'Host' : 'Client'}`);
    
    // Notify others in the room that someone joined
    socket.to(roomCode).emit('peer_connected', { id: socket.id, isHost });
  });

  // Relay generic actions
  socket.on('action', ({ roomCode, action, payload }) => {
    socket.to(roomCode).emit('action', { action, payload });
  });

  // Relay core state sync (Host -> Client)
  socket.on('state_sync', ({ roomCode, state }) => {
    socket.to(roomCode).emit('state_sync', state);
  });

  // Relay cursor movements
  socket.on('cursor', ({ roomCode, x, y }) => {
    socket.to(roomCode).emit('cursor', { x, y });
  });

  // Relay puzzle image chunks
  socket.on('image_chunk', ({ roomCode, chunkIndex, totalChunks, data }) => {
    socket.to(roomCode).emit('image_chunk', { chunkIndex, totalChunks, data });
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    // Note: We could emit a peer_disconnected event here if we track which room the socket was in
  });
});

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.io relay server running on port ${PORT}`);
});
