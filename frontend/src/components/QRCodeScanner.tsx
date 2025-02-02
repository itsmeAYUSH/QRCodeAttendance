import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrScannerId = 'qr-reader';

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Create scanner instance
        scannerRef.current = new Html5Qrcode(qrScannerId);

        // Basic configuration
        const config = {
          fps: 2, // Lower FPS for better stability
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        // Start scanning
        await scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          (text) => {
            if (mounted) onScan(text);
          },
          () => {} // Ignore interim errors
        );
      } catch (err) {
        if (!mounted) return;

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('NotAllowedError')) {
          onError('Camera access denied. Please grant camera permissions.');
        } else if (errorMessage.includes('NotFoundError')) {
          onError('No camera found. Please ensure your device has a camera.');
        } else {
          onError('Failed to start scanner. Please try again.');
        }
      }
    };

    // Add a delay before initialization
    const timeoutId = setTimeout(init, 1000);

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(timeoutId);

      // Ensure scanner is properly cleaned up
      if (scannerRef.current) {
        scannerRef.current.stop()
          .then(() => {
            if (scannerRef.current) {
              return scannerRef.current.clear();
            }
          })
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, []); // Only run once on mount

  return (
    <div
      id={qrScannerId}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '300px',
        backgroundColor: '#000'
      }}
    />
  );
};

export default QRCodeScanner;