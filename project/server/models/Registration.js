const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  rollNumber: { type: String, required: true }
});

const gameIdSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  gameId: { type: String, required: true },
  characterName: { type: String }
});

const registrationSchema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  eventName: { type: String, required: true },
  participantName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  college: { type: String, required: true },
  rollNumber: { type: String, required: true },
  teamMembers: [teamMemberSchema],
  gameIds: [gameIdSchema],
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String },
  transactionDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['upi', 'qr'] },
  merchantTransactionId: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);