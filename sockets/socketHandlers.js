const rooms = {}; // { roomId: { participants: Map<socketId, userId> } }
const chatPermissions = {}; // { roomId: { isChatEnabled: true } }

module.exports = (io, socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, role }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { participants: new Map() };
      chatPermissions[roomId] = { isChatEnabled: true };
    }

    socket.join(roomId);
    socket.data = { roomId, userId, role };
    rooms[roomId].participants.set(socket.id, userId);

    console.log(`👤 ${role} "${userId}" joined room "${roomId}"`);

    // Send list of all existing users to the newly joined user
    const existingUsers = Array.from(rooms[roomId].participants.entries())
      .filter(([id]) => id !== socket.id)
      .map(([socketId, name]) => ({ socketId, name }));

    io.to(socket.id).emit('all-users', existingUsers);

    // Notify existing users about the new user
    socket.to(roomId).emit('user-connected', {
      socketId: socket.id,
      name: userId,
    });

    // Inform new user about current chat permission
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

  socket.on('toggle-chat', ({ roomId, enabled }) => {
    const { role } = socket.data;
    if (role !== 'host') return;

    chatPermissions[roomId] = { isChatEnabled: enabled };
    io.to(roomId).emit('chat-permission-updated', { enabled });
    console.log(`💬 Chat ${enabled ? 'enabled' : 'disabled'} in room ${roomId}`);
  });
socket.on('join-room', ({ roomId, userId }) => {
  socket.join(roomId);
  const otherUsers = [...io.sockets.adapter.rooms.get(roomId) || []].filter(id => id !== socket.id);
  socket.emit('all-users', otherUsers.map(id => ({ socketId: id })));
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

    if (to) {
      io.to(to).emit('receive-chat', payload);
      socket.emit('receive-chat', payload);
    } else {
      io.to(roomId).emit('receive-chat', payload);
    }

    console.log(`💬 ${userId} (${role}) in ${roomId}: ${message}`);
  });

  socket.on('screen-share-started', () => {
    const { userId, roomId } = socket.data || {};
    console.log(`📺 ${userId} started screen sharing in room ${roomId}`);
  });

  socket.on('screen-share-stopped', () => {
    const { userId, roomId } = socket.data || {};
    console.log(`🛑 ${userId} stopped screen sharing in room ${roomId}`);
  });

  socket.on('disconnect', () => {
    const { roomId } = socket.data || {};
    const room = rooms[roomId];
    console.log('❌ User disconnected:', socket.id);
    if (!room) return;

    room.participants.delete(socket.id);
    socket.to(roomId).emit('user-disconnected', socket.id);

    if (room.participants.size === 0) {
      delete rooms[roomId];
      delete chatPermissions[roomId];
      console.log(`🧹 Room "${roomId}" deleted after last user left.`);
    }
  });
};
