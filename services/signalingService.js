const { Server } = require('socket.io');

const rooms = {}; // { roomId: { hostId, participants: [{ socketId, name, muted }] } }
const chatPermissions = {}; // { roomId: { isChatEnabled: true } }

function initSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });
  console.log('Socket.io server started');

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, userId, role }) => {
      socket.join(roomId);
      socket.data = { roomId, userId, role };

      // Initialize room if it doesn't exist
      if (!rooms[roomId]) {
        rooms[roomId] = { hostId: '', participants: [] };
        chatPermissions[roomId] = { isChatEnabled: true };
      }

      if (role === 'host') {
        rooms[roomId].hostId = socket.id;
        console.log(`Host ${userId} joined room ${roomId}`);
        
        // Send existing participants to the host
        socket.emit('participant-list', rooms[roomId].participants);
      } else {
        // Add participant to the room
        const participant = { socketId: socket.id, name: userId, muted: false };
        rooms[roomId].participants.push(participant);
        console.log(`Participant ${userId} joined room ${roomId}`);

        // Send all existing users (host + participants) to the new participant
        const existingUsers = [];
        
        // Add host if exists
        if (rooms[roomId].hostId) {
          existingUsers.push({ 
            socketId: rooms[roomId].hostId, 
            name: 'Host' 
          });
          socket.emit('host-info', { socketId: rooms[roomId].hostId });
        }
        
        // Add other participants
        rooms[roomId].participants
          .filter(p => p.socketId !== socket.id)
          .forEach(p => {
            existingUsers.push({ 
              socketId: p.socketId, 
              name: p.name 
            });
          });
        
        // Send existing users to the new participant
        socket.emit('existing-users', existingUsers);

        // Inform everyone about the new participant
        io.to(roomId).emit('user-connected', {
          socketId: socket.id,
          name: userId,
        });

        // Send updated participant list to host
        if (rooms[roomId].hostId) {
          io.to(rooms[roomId].hostId).emit('participant-list', rooms[roomId].participants);
        }
      }

      // Send current chat permission status
      socket.emit('chat-permission-updated', {
        enabled: chatPermissions[roomId].isChatEnabled,
      });
    });

    // WebRTC signaling events
    socket.on('offer', ({ targetSocketId, offer }) => {
      console.log(`Forwarding offer from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('offer', {
        senderSocketId: socket.id,
        offer,
      });
    });

    socket.on('answer', ({ targetSocketId, answer }) => {
      console.log(`Forwarding answer from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('answer', {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      console.log(`Forwarding ICE candidate from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('ice-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // Chat functionality
    socket.on('send-chat', ({ roomId, message, to }) => {
      const { userId, role } = socket.data;
      const chatAllowed = chatPermissions[roomId]?.isChatEnabled;

      if (!chatAllowed && role !== 'host') {
        console.log(`Chat blocked for ${userId} in room ${roomId}`);
        return;
      }

      const payload = {
        from: userId,
        message,
        to: to || 'all',
        timestamp: Date.now(),
      };

      if (to) {
        // Private message
        io.to(to).emit('receive-chat', payload);
        socket.emit('receive-chat', payload); // Send to sender as well
      } else {
        // Broadcast to room
        io.to(roomId).emit('receive-chat', payload);
      }

      console.log(`Chat message from ${userId} in room ${roomId}: ${message}`);
    });

    // Chat toggle (host only)
    socket.on('toggle-chat', ({ roomId, enabled }) => {
      const { role } = socket.data;
      if (role !== 'host') return;

      chatPermissions[roomId] = { isChatEnabled: enabled };
      io.to(roomId).emit('chat-permission-updated', { enabled });
      console.log(`Chat ${enabled ? 'enabled' : 'disabled'} in room ${roomId}`);
    });

    // Mute/Unmute logic
    socket.on('mute-user', ({ roomId, targetSocketId }) => {
      const room = rooms[roomId];
      const participant = room?.participants.find(p => p.socketId === targetSocketId);
      if (participant) {
        participant.muted = true;
        io.to(targetSocketId).emit('muted');
        io.to(room.hostId).emit('participant-list', room.participants);
        console.log(`Muted user ${targetSocketId} in room ${roomId}`);
      }
    });

    socket.on('unmute-user', ({ roomId, targetSocketId }) => {
      const room = rooms[roomId];
      const participant = room?.participants.find(p => p.socketId === targetSocketId);
      if (participant) {
        participant.muted = false;
        io.to(targetSocketId).emit('unmuted');
        io.to(room.hostId).emit('participant-list', room.participants);
        console.log(`Unmuted user ${targetSocketId} in room ${roomId}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const { roomId, role, userId } = socket.data || {};
      if (!roomId || !rooms[roomId]) return;

      console.log(`User ${userId} disconnected from room ${roomId}`);

      if (role === 'participant') {
        // Remove participant from room
        rooms[roomId].participants = rooms[roomId].participants.filter(p => p.socketId !== socket.id);
        
        // Notify others
        socket.to(roomId).emit('user-disconnected', socket.id);
        
        // Update host's participant list
        if (rooms[roomId].hostId) {
          io.to(rooms[roomId].hostId).emit('participant-list', rooms[roomId].participants);
        }
      } else if (role === 'host') {
        // End the room if host leaves
        io.to(roomId).emit('host-disconnected');
        delete rooms[roomId];
        delete chatPermissions[roomId];
        console.log(`Room ${roomId} ended as host left`);
      }
    });
  });
}

module.exports = initSocket;