import React, { useState } from 'react';

import {
  Button,
  Tab,
  TabList,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import {
  Checkmark20Regular,
  Copy20Regular,
  Link20Regular,
  QrCode20Regular,
} from '@fluentui/react-icons';
import { QRCodeSVG } from 'qrcode.react';

import type { Car } from '../../hooks/useCars';
import {
  encodeCars,
  generateShareableUrl,
  generateSyncCode,
} from '../../utils/carSyncCodec';

type Props = {
  cars: Car[];
};

type ExportTab = 'qr' | 'link' | 'code';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

export const ExportSection: React.FC<Props> = ({ cars }) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('qr');
  const [copied, setCopied] = useState(false);

  const qrData = encodeCars(cars);
  const shareUrl = generateShareableUrl(cars);
  const syncCode = generateSyncCode(cars);

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (cars.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 16, color: tokens.colorNeutralForeground3 }}>
        <Text size={200}>No cars to export. Add a car first.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as ExportTab)}
        size="small"
      >
        <Tab value="qr" icon={<QrCode20Regular />}>QR Code</Tab>
        <Tab value="link" icon={<Link20Regular />}>Link</Tab>
        <Tab value="code" icon={<Copy20Regular />}>Code</Tab>
      </TabList>

      {activeTab === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: '#ffffff',
              padding: 16,
              borderRadius: 8,
              display: 'inline-block',
            }}
          >
            <QRCodeSVG value={qrData} size={180} />
          </div>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Scan this QR code on another device to import {cars.length} car{cars.length !== 1 ? 's' : ''}
          </Text>
        </div>
      )}

      {activeTab === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Textarea
            value={shareUrl}
            readOnly
            resize="none"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            rows={3}
          />
          <Button
            appearance="primary"
            icon={copied ? <Checkmark20Regular /> : <Copy20Regular />}
            onClick={() => handleCopy(shareUrl)}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Share this link to import {cars.length} car{cars.length !== 1 ? 's' : ''} on another device
          </Text>
        </div>
      )}

      {activeTab === 'code' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Textarea
            value={syncCode}
            readOnly
            resize="none"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            rows={3}
          />
          <Button
            appearance="primary"
            icon={copied ? <Checkmark20Regular /> : <Copy20Regular />}
            onClick={() => handleCopy(syncCode)}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Paste this code on another device to import {cars.length} car{cars.length !== 1 ? 's' : ''}
          </Text>
        </div>
      )}
    </div>
  );
};
