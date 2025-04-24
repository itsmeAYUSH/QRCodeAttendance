import React, { useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrScannerId = "qr-reader";
  const mountedRef = useRef(true);

  // Memoize the callbacks with proper dependencies
  const handleScan = useCallback(
    (text: string) => {
      if (mountedRef.current) {
        onScan(text);
      }
    },
    [onScan]
  );

  const handleError = useCallback(
    (error: Error) => {
      if (!mountedRef.current) return;
      
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("NotAllowedError")) {
        onError("Camera access denied. Please grant camera permissions.");
      } else if (errorMessage.includes("NotFoundError")) {
        onError("No camera found. Please ensure your device has a camera.");
      } else {
        onError(`Scanner error: ${errorMessage}`);
      }
    },
    [onError]
  );

  useEffect(() => {
    mountedRef.current = true;
    let scannerInstance: Html5Qrcode | null = null;

    const initScanner = async () => {
      try {
        scannerInstance = new Html5Qrcode(qrScannerId);
        scannerRef.current = scannerInstance;

        const config = {
          fps: 2,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scannerInstance.start(
          { facingMode: "environment" },
          config,
          handleScan,
          () => {} // Quiet console
        );
      } catch (err) {
        handleError(err as Error);
      }
    };

    const timer = setTimeout(initScanner, 1000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);

      const cleanupScanner = async () => {
        if (scannerInstance && scannerInstance.isScanning) {
          try {
            await scannerInstance.stop();
            scannerInstance.clear();
          } catch (err) {
            console.debug("Scanner cleanup error:", err);
          }
        }
        scannerRef.current = null;
      };

      cleanupScanner();
    };
  }, [handleScan, handleError]);

  return (
    <div
      id={qrScannerId}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "300px",
        backgroundColor: "#000",
      }}
    />
  );
};

export default QRCodeScanner;