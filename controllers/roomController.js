const Room = require('../models/Room');

exports.createRoom = async (req, res) => {
  try {
    const { roomId, hostId } = req.body;
    const room = new Room({ roomId, host: hostId });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Room creation failed', error: err.message });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { roomId, participantId } = req.body;
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    room.participants.push(participantId);
    await room.save();
    res.status(200).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Failed to join room', error: err.message });
  }
};
