const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subject: {
    type: String,
    required: true
  },
  sessionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  qrCode: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active'
  },
  classRoom: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Create index for QR code lookups
attendanceSchema.index({ qrCode: 1 });

// Create index for faculty lookups
attendanceSchema.index({ faculty: 1, sessionDate: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;