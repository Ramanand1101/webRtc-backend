const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  role: { type: String, enum: ['host', 'participant'], default: 'participant' },
});

module.exports = mongoose.model('User', userSchema);
