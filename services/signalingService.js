const { Server } = require('socket.io');

const rooms = {}; // { roomId: { hostId, participants: [{ socketId, name, muted }] } }

function initSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, userId, role }) => {
      socket.join(roomId);
      socket.data = { roomId, userId, role };

      if (!rooms[roomId]) {
        rooms[roomId] = { hostId: '', participants: [] };
      }

      if (role === 'host') {
        rooms[roomId].hostId = socket.id;
      } else {
        rooms[roomId].participants.push({ socketId: socket.id, name: userId, muted: false });

        // Inform host about the new participant
        io.to(rooms[roomId].hostId).emit('user-connected', {
          socketId: socket.id,
          name: userId,
        });

        // Also send the host socketId to the participant for signaling
        socket.emit('host-info', { socketId: rooms[roomId].hostId });
      }

      socket.to(roomId).emit('user-connected', userId);
    });

    // WebRTC signaling events
    socket.on('offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('offer', {
        senderSocketId: socket.id,
        offer,
      });
    });

    socket.on('answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('answer', {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // Mute/Unmute logic
    socket.on('mute-user', ({ roomId, targetSocketId }) => {
      const room = rooms[roomId];
      const participant = room?.participants.find(p => p.socketId === targetSocketId);
      if (participant) {
        participant.muted = true;
        io.to(targetSocketId).emit('muted');
        io.to(room.hostId).emit('participant-list', room.participants);
      }
    });

    socket.on('unmute-user', ({ roomId, targetSocketId }) => {
      const room = rooms[roomId];
      const participant = room?.participants.find(p => p.socketId === targetSocketId);
      if (participant) {
        participant.muted = false;
        io.to(targetSocketId).emit('unmuted');
        io.to(room.hostId).emit('participant-list', room.participants);
      }
    });

    socket.on('disconnect', () => {
      const { roomId, role } = socket.data || {};
      const room = rooms[roomId];
      if (room) {
        if (role === 'participant') {
          room.participants = room.participants.filter(p => p.socketId !== socket.id);
          io.to(room.hostId).emit('participant-list', room.participants);
        } else if (role === 'host') {
          delete rooms[roomId]; // End the room if host leaves
        }
      }
    });
  });
}

module.exports = initSocket;
