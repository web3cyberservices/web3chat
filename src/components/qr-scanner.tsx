
'use client';

import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        // Silent error for continuous scanning
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Scan Sync QR</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <div id="reader" className="overflow-hidden rounded-2xl border border-primary/20"></div>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          Point your camera at the QR code on your other device.
        </p>
      </div>
    </div>
  );
}
