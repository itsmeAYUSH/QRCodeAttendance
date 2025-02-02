declare module 'react-qr-scanner' {
  import { ComponentType } from 'react';

  interface QrScannerProps {
    onError: (error: any) => void;
    onScan: (data: { text: string } | null) => void;
    style?: React.CSSProperties;
    constraints?: {
      video?: {
        facingMode?: string;
        width?: { ideal: number };
        height?: { ideal: number };
      };
    };
  }

  const QrScanner: ComponentType<QrScannerProps>;
  export default QrScanner;
}