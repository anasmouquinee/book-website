const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your domain
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// Store active reading rooms and their participants
const readingRooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a reading room
  socket.on('join_room', (data) => {
    const { room, userId, userName, bookId, pageNumber } = data;
    
    // Join the socket.io room
    socket.join(room);
    
    // Initialize room if it doesn't exist
    if (!readingRooms[room]) {
      readingRooms[room] = {
        participants: []
      };
    }
    
    // Add user to participants
    readingRooms[room].participants.push({
      socketId: socket.id,
      userId,
      userName,
      pageNumber: pageNumber || 1
    });
    
    // Store user data in socket for easy access later
    socket.userData = { userId, userName, room, bookId };
    
    // Notify others that user joined
    socket.to(room).emit('user_joined', { userId, userName });
    
    // Send updated participants list to everyone in the room
    io.to(room).emit('participants_list', {
      participants: readingRooms[room].participants
    });
    
    console.log(`${userName} (${userId}) joined room ${room}`);
  });
  
  // Handle leaving a room
  socket.on('leave_room', (data) => {
    const { room, userId, userName } = data;
    
    if (socket.userData && readingRooms[room]) {
      // Remove user from participants list
      readingRooms[room].participants = readingRooms[room].participants.filter(
        p => p.userId !== userId
      );
      
      // Notify others
      socket.to(room).emit('user_left', { userId, userName });
      
      // Send updated participants list
      io.to(room).emit('participants_list', {
        participants: readingRooms[room].participants
      });
      
      // Leave the socket.io room
      socket.leave(room);
      
      console.log(`${userName} (${userId}) left room ${room}`);
    }
  });
  
  // Handle sending comments
  socket.on('send_comment', (data) => {
    const { room } = data;
    // Broadcast to all users in the room
    io.to(room).emit('new_comment', data);
  });
  
  // Handle typing indicator
  socket.on('user_typing', (data) => {
    const { room, userId, userName } = data;
    socket.to(room).emit('user_typing', { userId, userName });
  });
  
  // Handle stop typing
  socket.on('stop_typing', (data) => {
    const { room, userId } = data;
    socket.to(room).emit('stop_typing', { userId });
  });
  
  // Handle adding highlights
  socket.on('add_highlight', (data) => {
    const { room } = data;
    io.to(room).emit('new_highlight', data);
  });
  
  // Handle page changes
  socket.on('change_page', (data) => {
    const { room, userId, userName, pageNumber } = data;
    
    // Update stored page number
    if (readingRooms[room]) {
      const participant = readingRooms[room].participants.find(p => p.userId === userId);
      if (participant) {
        participant.pageNumber = pageNumber;
      }
      
      // Notify others
      socket.to(room).emit('page_change', { userId, userName, pageNumber });
      
      // Send updated participants list
      io.to(room).emit('participants_list', {
        participants: readingRooms[room].participants
      });
    }
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    if (socket.userData) {
      const { userId, userName, room } = socket.userData;
      
      if (readingRooms[room]) {
        // Remove user from participants
        readingRooms[room].participants = readingRooms[room].participants.filter(
          p => p.userId !== userId
        );
        
        // Notify others
        socket.to(room).emit('user_left', { userId, userName });
        
        // Send updated participants
        io.to(room).emit('participants_list', {
          participants: readingRooms[room].participants
        });
        
        console.log(`${userName} (${userId}) disconnected from room ${room}`);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});