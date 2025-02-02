const crypto = require("crypto");
const Attendance = require("../models/Attendance");
const User = require("../models/User");

// Generate QR code data for a session
const generateSessionQR = async (req, res) => {
  try {
    const { subject, classRoom } = req.body;
    const faculty = req.user ? req.user._id : null;

    // Validate required fields
    if (!faculty) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Faculty ID missing" });
    }
    if (!subject || !classRoom) {
      return res
        .status(400)
        .json({ message: "Subject and Classroom are required" });
    }

    // Generate unique QR code
    let qrData;
    try {
      qrData = crypto.randomBytes(32).toString("hex");
    } catch (err) {
      console.error("QR Code Generation Error:", err);
      return res.status(500).json({ message: "Error generating QR code" });
    }

    const sessionDate = new Date();

    // Create new attendance session
    const attendanceSession = new Attendance({
      faculty,
      subject,
      sessionDate,
      qrCode: qrData,
      classRoom,
      markedStudents: [],
    });

    await attendanceSession.save();

    res.json({
      message: "Session QR code generated successfully",
      qrCode: qrData,
      sessionId: attendanceSession._id,
      expiresIn: "10 minutes",
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res
      .status(500)
      .json({ message: "Error generating QR code", error: error.message });
  }
};

// Mark attendance using QR code
const markAttendance = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const student = req.user._id;

    const session = await Attendance.findOne({
      qrCode,
      sessionDate: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });

    if (!session) {
      return res.status(400).json({ message: "Invalid or expired QR code" });
    }

    if (session.markedStudents.includes(student.toString())) {
      return res
        .status(400)
        .json({ message: "Attendance already marked for this session" });
    }

    session.markedStudents.push(student);
    await session.save();

    res.json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res
      .status(500)
      .json({ message: "Error marking attendance", error: error.message });
  }
};

// Get attendance report for faculty
const getAttendanceReport = async (req, res) => {
  try {
    const { subject, startDate, endDate } = req.body;
    const faculty = req.user._id;

    const query = {
      faculty,
      ...(subject && { subject }),
      ...(startDate &&
        endDate && {
          sessionDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }),
    };

    const attendanceRecords = await Attendance.find(query)
      .populate("markedStudents", "name email")
      .sort({ sessionDate: -1 });

    const report = new Map();

    attendanceRecords.forEach((record) => {
      if (!report.has(record.subject)) {
        report.set(record.subject, { totalSessions: new Set(), students: {} });
      }

      const subjectData = report.get(record.subject);
      subjectData.totalSessions.add(
        record.sessionDate.toISOString().split("T")[0]
      );

      record.markedStudents.forEach((student) => {
        if (!subjectData.students[student._id]) {
          subjectData.students[student._id] = {
            name: student.name,
            email: student.email,
            attendanceCount: 0,
          };
        }
        subjectData.students[student._id].attendanceCount++;
      });
    });

    const formattedReport = {};
    report.forEach((data, subject) => {
      const totalSessions = data.totalSessions.size;
      const students = Object.values(data.students).map((s) => ({
        ...s,
        attendancePercentage: Number(((s.attendanceCount / totalSessions) * 100).toFixed(2))
      }));

      formattedReport[subject] = { totalSessions, students };
    });

    res.json(formattedReport);
  } catch (error) {
    console.error("Error generating report:", error);
    res
      .status(500)
      .json({ message: "Error generating report", error: error.message });
  }
};

// Get student's own attendance
const getStudentAttendance = async (req, res) => {
  try {
    const student = req.user._id;
    const { subject } = req.query;

    const query = { markedStudents: student, ...(subject && { subject }) };

    const attendanceRecords = await Attendance.find(query)
      .populate("faculty", "name")
      .sort({ sessionDate: -1 });

    const report = {};
    attendanceRecords.forEach((record) => {
      if (!report[record.subject]) {
        report[record.subject] = { totalClasses: 0, attended: 0 };
      }

      report[record.subject].totalClasses++;
      report[record.subject].attended++;

      report[record.subject].attendancePercentage = Number(
        ((report[record.subject].attended / report[record.subject].totalClasses) * 100).toFixed(2)
      );
    });

    res.json(report);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res
      .status(500)
      .json({ message: "Error fetching attendance", error: error.message });
  }
};

module.exports = {
  generateSessionQR,
  markAttendance,
  getAttendanceReport,
  getStudentAttendance,
};
