const express = require('express');
const router = express.Router();
const { auth, isFaculty, isStudent } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.put('/change-password', auth, changePassword);

// Role-specific routes
router.get('/verify-faculty', auth, isFaculty, (req, res) => {
  res.json({ message: 'Faculty verified', user: req.user });
});

router.get('/verify-student', auth, isStudent, (req, res) => {
  res.json({ message: 'Student verified', user: req.user });
});

module.exports = router;