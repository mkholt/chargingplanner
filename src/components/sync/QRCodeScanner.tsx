import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Camera20Regular,
  Dismiss20Regular,
} from '@fluentui/react-icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';

type Props = {
  onScan: (data: string) => void;
};

export const QRCodeScanner: React.FC<Props> = ({ onScan }) => {
  const { t } = useTranslation();
  const [shouldScan, setShouldScan] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setShouldScan(false);
    setIsScanning(false);
  }, []);

  // Start scanning when shouldScan becomes true (after container is rendered)
  useEffect(() => {
    if (!shouldScan || isScanning) return;

    const startCamera = async () => {
      setError(null);

      try {
        const scanner = new Html5Qrcode('qr-scanner-container');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
          },
          (decodedText) => {
            onScan(decodedText);
            stopScanning();
          },
          () => {
            // QR code not found - ignore
          }
        );
        setIsScanning(true);
      } catch (err) {
        setShouldScan(false);
        if (err instanceof Error) {
          if (err.message.includes('NotAllowedError') || err.message.includes('Permission')) {
            setError(t('qrScanner.permissionDenied'));
          } else if (err.message.includes('NotFoundError')) {
            setError(t('qrScanner.noCamera'));
          } else {
            setError(t('qrScanner.cameraError', { error: err.message }));
          }
        } else {
          setError(t('qrScanner.failedToStart'));
        }
      }
    };

    startCamera();
  }, [shouldScan, isScanning, onScan, stopScanning, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleStartClick = () => {
    setError(null);
    setShouldScan(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!shouldScan ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Button
            appearance="primary"
            icon={<Camera20Regular />}
            onClick={handleStartClick}
          >
            {t('qrScanner.startCamera')}
          </Button>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, textAlign: 'center' }}>
            {t('qrScanner.scanInstructions')}
          </Text>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            id="qr-scanner-container"
            style={{
              width: '100%',
              maxWidth: 300,
              minHeight: 200,
              borderRadius: 8,
              overflow: 'hidden',
              background: tokens.colorNeutralBackground3,
            }}
          />
          <Button
            appearance="secondary"
            icon={<Dismiss20Regular />}
            onClick={stopScanning}
          >
            {t('qrScanner.stopCamera')}
          </Button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            background: tokens.colorPaletteRedBackground1,
            borderRadius: 6,
            color: tokens.colorPaletteRedForeground1,
          }}
        >
          <Text size={200}>{error}</Text>
        </div>
      )}
    </div>
  );
};
