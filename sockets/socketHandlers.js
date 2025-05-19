// const rooms = {}; // { roomId: { participants: Map<socketId, { userId, role }> } }
// const chatPermissions = {}; // { roomId: { isChatEnabled: true } }

// module.exports = (io, socket) => {
//   console.log('✅ User connected:', socket.id);

//   // ===================== JOIN ROOM =====================
//   socket.on('join-room', ({ roomId, userId, role }) => {
//     if (!rooms[roomId]) {
//       rooms[roomId] = { participants: new Map() };
//       chatPermissions[roomId] = { isChatEnabled: true };
//     }

//     socket.join(roomId);
//     socket.data = { roomId, userId, role };
//     rooms[roomId].participants.set(socket.id, { userId, role });

//     console.log(`👤 ${role} "${userId}" joined room "${roomId}"`);

//     // Notify the new user about existing participants
//     const existingUsers = Array.from(rooms[roomId].participants.entries())
//       .filter(([id]) => id !== socket.id)
//       .map(([socketId, data]) => ({ socketId, name: data.userId }));

//     io.to(socket.id).emit('all-users', existingUsers);

//     // Notify others about the new user
//     socket.to(roomId).emit('user-connected', {
//       socketId: socket.id,
//       name: userId,
//     });

//     // Send current chat permission status
//     io.to(socket.id).emit('chat-permission-updated', {
//       enabled: chatPermissions[roomId].isChatEnabled,
//     });
//   });

//   // ===================== CHECK HOST PRESENCE =====================
//   socket.on('check-host', ({ roomId }, callback) => {
//     const room = rooms[roomId];
//     if (!room) return callback({ hostPresent: false });

//     const hostExists = Array.from(room.participants.values()).some(
//       (p) => p.role === 'host'
//     );

//     callback({ hostPresent: hostExists });
//   });

//   // ===================== WEBRTC SIGNALING =====================
//   socket.on('send-offer', ({ offer, to }) => {
//     const from = socket.id;
//     const userId = socket.data?.userId || 'Unknown User';
//     console.log(`📞 ${userId} (${from}) sending offer to ${to}`);
//     io.to(to).emit('receive-offer', { offer, from });
//   });

//   socket.on('send-answer', ({ answer, to }) => {
//     console.log(`📞 ${socket.data.userId} sending answer to ${to}`);
//     io.to(to).emit('receive-answer', { answer, from: socket.id });
//   });

//   socket.on('send-ice-candidate', ({ candidate, to }) => {
//     io.to(to).emit('receive-ice-candidate', { candidate, from: socket.id });
//   });

//   // ===================== MEDIA CONTROLS =====================
//   socket.on('mute-toggle', ({ roomId, userId, isMuted }) => {
//     socket.to(roomId).emit('user-muted', { userId, isMuted });
//   });

//   socket.on('camera-toggle', ({ roomId, userId, isCameraOff }) => {
//     socket.to(roomId).emit('user-camera-toggle', { userId, isCameraOff });
//   });

//   // ===================== CHAT =====================
//   socket.on('toggle-chat', ({ roomId, enabled }) => {
//     const { role } = socket.data;
//     if (role !== 'host') return;

//     chatPermissions[roomId] = { isChatEnabled: enabled };
//     io.to(roomId).emit('chat-permission-updated', { enabled });
//     console.log(`💬 Chat ${enabled ? 'enabled' : 'disabled'} in room ${roomId}`);
//   });

//   socket.on('send-chat', ({ roomId, message, to }) => {
//     const { userId, role } = socket.data;
//     const chatAllowed = chatPermissions[roomId]?.isChatEnabled;

//     if (!chatAllowed && role !== 'host') {
//       console.log(`❌ Chat blocked for ${userId} in room ${roomId}`);
//       return;
//     }

//     const payload = {
//       from: userId,
//       message,
//       to: to || 'all',
//       timestamp: Date.now(),
//     };

//     if (to) {
//       io.to(to).emit('receive-chat', payload);
//       socket.emit('receive-chat', payload); // echo back
//     } else {
//       io.to(roomId).emit('receive-chat', payload);
//     }

//     console.log(`💬 ${userId} (${role}) in ${roomId}: ${message}`);
//   });

//   // ===================== SCREEN SHARE =====================
//   socket.on('screen-share-started', () => {
//     const { userId, roomId } = socket.data || {};
//     console.log(`📺 ${userId} started screen sharing in room ${roomId}`);
//   });

//   socket.on('screen-share-stopped', () => {
//     const { userId, roomId } = socket.data || {};
//     console.log(`🛑 ${userId} stopped screen sharing in room ${roomId}`);
//   });

//  socket.on('toggle-participant-camera', ({ targetSocketId, isCameraOff }) => {
//   io.to(targetSocketId).emit('force-camera-toggle', { isCameraOff });
// });

//   // ===================== DISCONNECT =====================
//   socket.on('disconnect', () => {
//     const { roomId } = socket.data || {};
//     const room = rooms[roomId];

//     console.log('❌ User disconnected:', socket.id);
//     if (!room) return;

//     // Remove user from room
//     room.participants.delete(socket.id);
//     socket.to(roomId).emit('user-disconnected', socket.id);

//     // Cleanup if empty
//     if (room.participants.size === 0) {
//       delete rooms[roomId];
//       delete chatPermissions[roomId];
//       console.log(`🧹 Room "${roomId}" deleted after last user left.`);
//     }
//   });
// };
const rooms = {}; // { roomId: { participants: Map<socketId, { userId, role }> } }
const chatPermissions = {}; // { roomId: { isChatEnabled: true } }
const chatHistory = {}; // { roomId: [ { from, message, to, timestamp } ] }

module.exports = (io, socket) => {
  console.log('✅ User connected:', socket.id);

  // ===================== JOIN ROOM =====================
  // socket.on('join-room', ({ roomId, userId, role }) => {
  //    console.log(`✅ ${userId} joined room ${roomId} as ${role}`);
  //   if (!rooms[roomId]) {
  //     rooms[roomId] = { participants: new Map() };
  //     chatPermissions[roomId] = { isChatEnabled: true };
  //     chatHistory[roomId] = []; // initialize chat history
  //   }

  //   socket.join(roomId);
  //   socket.data = { roomId, userId, role };
  //   rooms[roomId].participants.set(socket.id, { userId, role });

  //   console.log(`👤 ${role} "${userId}" joined room "${roomId}"`);

  //   // Notify new user of current participants
  //   const existingUsers = Array.from(rooms[roomId].participants.entries())
  //     .filter(([id]) => id !== socket.id)
  //     .map(([socketId, data]) => ({ socketId, name: data.userId }));

  //   io.to(socket.id).emit('all-users', existingUsers);

  //   // Notify others of the new user
  //   socket.to(roomId).emit('user-connected', {
  //     socketId: socket.id,
  //     name: userId,
  //   });

  //   // Send chat permission state
  //   io.to(socket.id).emit('chat-permission-updated', {
  //     enabled: chatPermissions[roomId].isChatEnabled,
  //   });
  //   console.log("rdssfsf",roomID)
  //   // Send previous chat history to new participant
  //   if (chatHistory[roomId]) {
  //     console.log(`📜 Sent chat history to ${socket.id}:`, chatHistory[roomId]);
  //     io.to(socket.id).emit('chat-history', chatHistory[roomId]);
  //   }
  // });
socket.on('join-room', ({ roomId, userId, role }) => {
  console.log('📥 Received join-room from client:', { roomId, userId, role });

  if (!rooms[roomId]) {
    rooms[roomId] = { participants: new Map() };
    chatPermissions[roomId] = { isChatEnabled: true };
    chatHistory[roomId] = [];
  }

  socket.join(roomId);
  socket.data = { roomId, userId, role };
  rooms[roomId].participants.set(socket.id, { userId, role });

  console.log(`👤 ${role} "${userId}" joined room "${roomId}"`);

  const existingUsers = Array.from(rooms[roomId].participants.entries())
    .filter(([id]) => id !== socket.id)
    .map(([socketId, data]) => ({ socketId, name: data.userId }));

  io.to(socket.id).emit('all-users', existingUsers);

  socket.to(roomId).emit('user-connected', {
    socketId: socket.id,
    name: userId,
  });

  io.to(socket.id).emit('chat-permission-updated', {
    enabled: chatPermissions[roomId].isChatEnabled,
  });

  // ✅ FIXED LINE
  console.log("🔁 Final roomId in join-room:", roomId);

  if (chatHistory[roomId]) {
    console.log(`📜 Sent chat history to ${socket.id}:`, chatHistory[roomId]);
    io.to(socket.id).emit('chat-history', chatHistory[roomId]);
  }
});

  // ===================== CHECK HOST PRESENCE =====================
  socket.on('check-host', ({ roomId }, callback) => {
    const room = rooms[roomId];
    if (!room) return callback({ hostPresent: false });

    const hostExists = Array.from(room.participants.values()).some(
      (p) => p.role === 'host'
    );

    callback({ hostPresent: hostExists });
  });

  // ===================== WEBRTC SIGNALING =====================
  socket.on('send-offer', ({ offer, to }) => {
    const from = socket.id;
    const userId = socket.data?.userId || 'Unknown User';
    console.log(`📞 ${userId} (${from}) sending offer to ${to}`);
    io.to(to).emit('receive-offer', { offer, from });
  });

  socket.on('send-answer', ({ answer, to }) => {
    console.log(`📞 ${socket.data.userId} sending answer to ${to}`);
    io.to(to).emit('receive-answer', { answer, from: socket.id });
  });

  socket.on('send-ice-candidate', ({ candidate, to }) => {
    io.to(to).emit('receive-ice-candidate', { candidate, from: socket.id });
  });

  // ===================== MEDIA CONTROLS =====================
  socket.on('mute-toggle', ({ roomId, userId, isMuted }) => {
    socket.to(roomId).emit('user-muted', { userId, isMuted });
  });

  socket.on('camera-toggle', ({ roomId, userId, isCameraOff }) => {
    socket.to(roomId).emit('user-camera-toggle', { userId, isCameraOff });
  });

  // ===================== CHAT =====================
  socket.on('toggle-chat', ({ roomId, enabled }) => {
    const { role } = socket.data;
    if (role !== 'host') return;

    chatPermissions[roomId] = { isChatEnabled: enabled };
    io.to(roomId).emit('chat-permission-updated', { enabled });
    console.log(`💬 Chat ${enabled ? 'enabled' : 'disabled'} in room ${roomId}`);
  });

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

    // Save to chat history
    if (!chatHistory[roomId]) chatHistory[roomId] = [];
    chatHistory[roomId].push(payload);
    if (chatHistory[roomId].length > 100) {
      chatHistory[roomId].shift(); // Keep only last 100 messages
    }

    if (to) {
      io.to(to).emit('receive-chat', payload);
      socket.emit('receive-chat', payload); // echo back
    } else {
      io.to(roomId).emit('receive-chat', payload);
    }

    console.log(`💬 ${userId} (${role}) in ${roomId}: ${message}`);
  });

  // ===================== SCREEN SHARE =====================
  socket.on('screen-share-started', () => {
    const { userId, roomId } = socket.data || {};
    console.log(`📺 ${userId} started screen sharing in room ${roomId}`);
  });

  socket.on('screen-share-stopped', () => {
    const { userId, roomId } = socket.data || {};
    console.log(`🛑 ${userId} stopped screen sharing in room ${roomId}`);
  });

  socket.on('toggle-participant-camera', ({ targetSocketId, isCameraOff }) => {
    io.to(targetSocketId).emit('force-camera-toggle', { isCameraOff });
  });

  // ===================== DISCONNECT =====================
  socket.on('disconnect', () => {
    const { roomId } = socket.data || {};
    const room = rooms[roomId];

    console.log('❌ User disconnected:', socket.id);
    if (!room) return;

    // Remove from participants
    room.participants.delete(socket.id);
    socket.to(roomId).emit('user-disconnected', socket.id);

    // Clean up if room empty
    if (room.participants.size === 0) {
      delete rooms[roomId];
      delete chatPermissions[roomId];
      delete chatHistory[roomId];
      console.log(`🧹 Room "${roomId}" deleted after last user left.`);
    }
  });
};
