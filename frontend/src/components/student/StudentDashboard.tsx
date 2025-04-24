import React, { useState, useEffect, useCallback } from "react";
import { useInterval } from "../../hooks/useInterval";
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
} from "@mui/material";
import QRCodeScanner from "../QRCodeScanner";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";

interface AttendanceRecord {
  totalClasses: number;
  attended: number;
  attendancePercentage: number;
}

interface AttendanceHistory {
  [subject: string]: AttendanceRecord;
}

const StudentDashboard: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory>(
    {}
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const { token } = useAuth();

  const fetchAttendanceHistory = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await axios.get(
        "https://qrcodeattendance-y5k5.onrender.com/api/attendance/my-attendance",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newHistory = response.data;
      const hasChanges =
        JSON.stringify(newHistory) !== JSON.stringify(attendanceHistory);
      if (hasChanges) {
        setAttendanceHistory(newHistory);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Error fetching attendance history:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [attendanceHistory, token, isUpdating]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  const handleError = (err: any) => {
    setError(err?.message || "An error occurred while accessing the camera.");
    setScanning(false);
  };

  const [lastScanTime, setLastScanTime] = useState<number>(0);

  const handleScan = async (decodedText: string) => {
    const now = Date.now();
    if (now - lastScanTime < 3000) { // Prevent scanning more than once every 3 seconds
      return;
    }
    setLastScanTime(now);
    
    try {
      setLoading(true);
      const response = await axios.post(
        'https://qrcodeattendance-y5k5.onrender.com/api/attendance/mark',
        { qrCode: decodedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Attendance marked successfully!');
      setScanning(false);
      fetchAttendanceHistory();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to mark attendance';
      setError(errorMessage);
      if (errorMessage.includes('already marked')) {
        setScanning(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const startScanner = useCallback(() => {
    setError(null);
    setSuccess(null);
    // Add a small delay before starting the scanner
    setTimeout(() => {
      setScanning(true);
    }, 300);
  }, []);

  const stopScanner = useCallback(() => {
    setScanning(false);
    setError(null);
    setSuccess(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setScanning(false);
      setError(null);
      setSuccess(null);
    };
  }, []);

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Student Dashboard
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  QR Code Scanner
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
                {scanning ? (
                  <QRCodeScanner onError={handleError} onScan={handleScan} />
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={startScanner}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        Processing...
                      </>
                    ) : (
                      "Start Scanner"
                    )}
                  </Button>
                )}
                {scanning && (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={stopScanner}
                    sx={{ mt: 2 }}
                  >
                    Stop Scanner
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
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
                  <Typography variant="h6">Attendance History</Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {isUpdating && (
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {lastUpdate.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
                {Object.keys(attendanceHistory).length > 0 ? (
                  Object.entries(attendanceHistory).map(([subject, record]) => (
                    <Box
                      key={subject}
                      sx={{ mb: 2, p: 2, bgcolor: "background.paper" }}
                    >
                      <Typography variant="subtitle1">
                        Subject: {subject}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        Attendance: {record.attended}/{record.totalClasses} (
                        {record.attendancePercentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No attendance records found
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default StudentDashboard;
