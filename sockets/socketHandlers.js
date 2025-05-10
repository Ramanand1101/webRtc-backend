// const rooms = {}; // { roomId: { hostId: '', participants: Map<socketId, userId> } }
// const chatPermissions = {}; // { roomId: { isChatEnabled: true } }

// module.exports = (io, socket) => {
//   console.log('✅ User connected:', socket.id);

//   socket.on('join-room', ({ roomId, userId, role }) => {
//     if (!rooms[roomId]) {
//       rooms[roomId] = { hostId: '', participants: new Map() };
//       chatPermissions[roomId] = { isChatEnabled: false }; // default: chat off
//     }

//     socket.join(roomId);
//     socket.data = { roomId, userId, role };

//     if (role === 'host') {
//       rooms[roomId].hostId = socket.id;
//       console.log(`🎥 Host "${userId}" joined room "${roomId}"`);
//     } else {
//       rooms[roomId].participants.set(socket.id, userId);
//       console.log(`👤 Participant "${userId}" joined room "${roomId}"`);

//       // Send host socket ID to the participant
//       io.to(socket.id).emit('host-info', { socketId: rooms[roomId].hostId });

//       // Notify the host that a new participant has joined
//       io.to(rooms[roomId].hostId).emit('user-connected', {
//         socketId: socket.id,
//         name: userId,
//       });
//     }

//     // Send current chat permission state to this socket
//     io.to(socket.id).emit('chat-permission-updated', {
//       enabled: chatPermissions[roomId].isChatEnabled,
//     });
//   });

//   socket.on('send-offer', ({ offer, to }) => {
//     io.to(to).emit('receive-offer', { offer, from: socket.id });
//   });

//   socket.on('send-answer', ({ answer, to }) => {
//     io.to(to).emit('receive-answer', { answer, from: socket.id });
//   });

//   socket.on('send-ice-candidate', ({ candidate, to }) => {
//     io.to(to).emit('receive-ice-candidate', { candidate, from: socket.id });
//   });

//   socket.on('mute-toggle', ({ roomId, userId, isMuted }) => {
//     socket.to(roomId).emit('user-muted', { userId, isMuted });
//   });

//   socket.on('camera-toggle', ({ roomId, userId, isCameraOff }) => {
//     socket.to(roomId).emit('user-camera-toggle', { userId, isCameraOff });
//   });

//   // ✅ Host toggles chat on/off
//   socket.on('toggle-chat', ({ roomId, enabled }) => {
//     if (socket.id !== rooms[roomId]?.hostId) return; // only host can toggle
//     chatPermissions[roomId] = { isChatEnabled: enabled };
//     io.to(roomId).emit('chat-permission-updated', { enabled });
//     console.log(`💬 Chat ${enabled ? 'enabled' : 'disabled'} in room ${roomId}`);
//   });

//   // ✅ Send chat (broadcast or private)
//   socket.on('send-chat', ({ roomId, message, to }) => {
//     const { userId, role } = socket.data;
//     const chatAllowed = chatPermissions[roomId]?.isChatEnabled;

//     if (!chatAllowed && role !== 'host') {
//       console.log(`❌ Chat blocked for ${userId} in room ${roomId}`);
//       return;
//     }

//     const chatPayload = {
//       from: userId,
//       message,
//       to: to || 'all',
//       timestamp: Date.now(),
//     };

//     if (to) {
//       io.to(to).emit('receive-chat', chatPayload);
//       socket.emit('receive-chat', chatPayload); // echo to sender
//     } else {
//       io.to(roomId).emit('receive-chat', chatPayload);
//     }

//     console.log(`💬 Chat from "${userId}" in room "${roomId}": ${message}`);
//   });

//   socket.on('disconnect', () => {
//     const { roomId, role } = socket.data || {};
//     console.log('❌ User disconnected:', socket.id);
//     const room = rooms[roomId];
//     if (!room) return;

//     if (role === 'host') {
//       io.to(roomId).emit('host-disconnected');
//       delete rooms[roomId];
//       delete chatPermissions[roomId];
//       console.log(`⚠️ Host left, room "${roomId}" closed`);
//     } else {
//       room.participants.delete(socket.id);
//       io.to(room.hostId).emit('participant-left', { socketId: socket.id });
//       console.log(`ℹ️ Removed participant ${socket.id} from room "${roomId}"`);
//     }
//   });
// };
const rooms = {}; // { roomId: { hostId: '', participants: Map<socketId, userId> } }
const chatPermissions = {}; // { roomId: { isChatEnabled: true } }

module.exports = (io, socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, role }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { hostId: '', participants: new Map() };
      chatPermissions[roomId] = { isChatEnabled: false };
    }

    socket.join(roomId);
    socket.data = { roomId, userId, role };

    if (role === 'host') {
      rooms[roomId].hostId = socket.id;
      console.log(`🎥 Host "${userId}" joined room "${roomId}"`);
    } else {
      rooms[roomId].participants.set(socket.id, userId);
      console.log(`👤 Participant "${userId}" joined room "${roomId}"`);

      io.to(socket.id).emit('host-info', { socketId: rooms[roomId].hostId });
      io.to(rooms[roomId].hostId).emit('user-connected', {
        socketId: socket.id,
        name: userId,
      });
    }

    io.to(socket.id).emit('chat-permission-updated', {
      enabled: chatPermissions[roomId].isChatEnabled,
    });
  });

  socket.on('send-offer', ({ offer, to }) => {
    io.to(to).emit('receive-offer', { offer, from: socket.id });
  });

  socket.on('send-answer', ({ answer, to }) => {
    io.to(to).emit('receive-answer', { answer, from: socket.id });
  });

  socket.on('send-ice-candidate', ({ candidate, to }) => {
    io.to(to).emit('receive-ice-candidate', { candidate, from: socket.id });
  });

  socket.on('mute-toggle', ({ roomId, userId, isMuted }) => {
    socket.to(roomId).emit('user-muted', { userId, isMuted });
  });

  socket.on('camera-toggle', ({ roomId, userId, isCameraOff }) => {
    socket.to(roomId).emit('user-camera-toggle', { userId, isCameraOff });
  });

  // Host toggles chat
  socket.on('toggle-chat', ({ roomId, enabled }) => {
    if (socket.id !== rooms[roomId]?.hostId) return;
    chatPermissions[roomId] = { isChatEnabled: enabled };
    io.to(roomId).emit('chat-permission-updated', { enabled });
    console.log(`💬 Chat ${enabled ? 'enabled' : 'disabled'} in room ${roomId}`);
  });

  // Broadcast/private message
  socket.on('send-chat', ({ roomId, message, to }) => {
    const { userId, role } = socket.data;
    const chatAllowed = chatPermissions[roomId]?.isChatEnabled;

    if (!chatAllowed && role !== 'host') {
      console.log(`❌ Chat blocked for ${userId} in room ${roomId}`);
      return;
    }

    const payload = {
      from: userId,
      message,
      to: to || 'all',
      timestamp: Date.now(),
    };

    if (to) {
      io.to(to).emit('receive-chat', payload);
      socket.emit('receive-chat', payload);
    } else {
      io.to(roomId).emit('receive-chat', payload);
    }

    console.log(`💬 ${userId} (${role}) in ${roomId}: ${message}`);
  });

  // Optional: Screen sharing state logs (frontend emits manually)
  socket.on('screen-share-started', () => {
    const { userId, roomId } = socket.data || {};
    console.log(`📺 ${userId} started screen sharing in room ${roomId}`);
  });

  socket.on('screen-share-stopped', () => {
    const { userId, roomId } = socket.data || {};
    console.log(`🛑 ${userId} stopped screen sharing in room ${roomId}`);
  });

  socket.on('disconnect', () => {
    const { roomId, role } = socket.data || {};
    console.log('❌ User disconnected:', socket.id);
    const room = rooms[roomId];
    if (!room) return;

    if (role === 'host') {
      io.to(roomId).emit('host-disconnected');
      delete rooms[roomId];
      delete chatPermissions[roomId];
      console.log(`⚠️ Host left, room "${roomId}" closed`);
    } else {
      room.participants.delete(socket.id);
      io.to(room.hostId).emit('participant-left', { socketId: socket.id });
      console.log(`ℹ️ Removed participant ${socket.id} from room "${roomId}"`);
    }
  });
};
