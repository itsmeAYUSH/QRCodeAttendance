const express = require('express');
const router = express.Router();
const { auth, isFaculty, isStudent } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const {
  generateSessionQR,
  markAttendance,
  getAttendanceReport,
  getStudentAttendance
} = require('../controllers/attendanceController');

// Faculty routes
router.post('/generate-qr', auth, isFaculty, generateSessionQR);
router.get('/report', auth, isFaculty, getAttendanceReport);

// Student routes
router.post('/mark', auth, isStudent, markAttendance);
router.get('/my-attendance', auth, isStudent, getStudentAttendance);

// Common routes (protected)
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const session = await Attendance.findById(req.params.sessionId)
      .populate('faculty', 'name email')
      .populate('student', 'name email');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user has permission to view this session
    if (
      session.faculty._id.toString() !== req.user._id.toString() && 
      (!session.student || session.student._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching session', error: error.message });
  }
});

module.exports = router;