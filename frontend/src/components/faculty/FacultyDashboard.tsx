import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../contexts/AuthContext";
import { useInterval } from "../../hooks/useInterval";

interface AttendanceReport {
  subject: string;
  totalSessions: number;
  students: {
    [key: string]: {
      name: string;
      email: string;
      attendanceCount: number;
      attendancePercentage: number;
    };
  };
}

const FacultyDashboard: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [classroom, setClassroom] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AttendanceReport | null>(
    null
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);

  const { user } = useAuth();

  const generateQRCode = async () => {
    if (!subject || !classroom) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "https://qrcodeattendance-y5k5.onrender.com/api/attendance/generate-qr",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            subject,
            classRoom: classroom,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate QR code");
      }

      setQrCode(data.qrCode);
      setShowQR(true);
      setSuccess("QR code generated successfully!");
      fetchReports(); // Refresh reports after generating new session
    } catch (err: any) {
      setError(err.message || "Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = useCallback(async () => {
    if (isUpdating) return; // Prevent multiple simultaneous updates
    setIsUpdating(true);
    try {
      const response = await fetch(
        "https://qrcodeattendance-y5k5.onrender.com/api/attendance/report",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch reports");
      }

      const newReports = Object.entries(data).map(
        ([subject, report]: [string, any]) => ({
          subject,
          ...report,
        })
      );

      // Compare with current reports to check for changes
      const hasChanges = JSON.stringify(newReports) !== JSON.stringify(reports);
      if (hasChanges) {
        setReports(newReports);
        setLastUpdate(new Date());
        // If a report is selected, update it as well
        if (selectedReport) {
          const updatedSelectedReport = newReports.find(
            (r) => r.subject === selectedReport.subject
          );
          if (updatedSelectedReport) {
            setSelectedReport(updatedSelectedReport);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch reports");
    } finally {
      setIsUpdating(false);
    }
  }, [reports, selectedReport]);

  // Initial fetch
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Set up interval for real-time updates
  useInterval(() => {
    fetchReports();
  }, 5000); // Check every 5 seconds

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Faculty Info Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Faculty Information
                </Typography>
                <Typography>Name: {user?.name}</Typography>
                <Typography>Department: {user?.department}</Typography>
                <Typography>Email: {user?.email}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* QR Generation Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generate Attendance QR Code
                </Typography>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Classroom"
                      value={classroom}
                      onChange={(e) => setClassroom(e.target.value)}
                      margin="normal"
                    />
                  </Grid>
                </Grid>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={generateQRCode}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Generate QR Code"
                  )}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Reports */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Attendance Reports</Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {isUpdating && (
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {lastUpdate.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Subject</TableCell>
                        <TableCell>Total Sessions</TableCell>
                        <TableCell>Total Students</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.subject}>
                          <TableCell>{report.subject}</TableCell>
                          <TableCell>{report.totalSessions}</TableCell>
                          <TableCell>
                            {Object.keys(report.students).length}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setSelectedReport(report)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {reports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            No attendance reports found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onClose={() => setShowQR(false)}>
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, textAlign: "center" }}>
            {qrCode && <QRCodeSVG value={qrCode} size={256} level="H" />}
            <Typography variant="body2" sx={{ mt: 2 }}>
              This QR code will expire in 10 minutes
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQR(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Report Details Dialog */}
      <Dialog
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Attendance Details - {selectedReport?.subject}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Attendance</TableCell>
                  <TableCell>Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedReport &&
                  Object.entries(selectedReport.students).map(
                    ([id, student]) => (
                      <TableRow key={id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {student.attendanceCount} /{" "}
                          {selectedReport.totalSessions}
                        </TableCell>
                        <TableCell>
                          {typeof student.attendancePercentage === "number"
                            ? `${student.attendancePercentage.toFixed(1)}%`
                            : `${(
                                (student.attendanceCount /
                                  selectedReport.totalSessions) *
                                100
                              ).toFixed(1)}%`}
                        </TableCell>
                      </TableRow>
                    )
                  )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReport(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FacultyDashboard;
