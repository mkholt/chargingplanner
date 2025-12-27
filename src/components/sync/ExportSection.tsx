import React, { useEffect, useState } from 'react';

import {
  Button,
  Checkbox,
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
  Warning20Regular,
} from '@fluentui/react-icons';
import { QRCodeSVG } from 'qrcode.react';

import type { Car, PriceSettings } from '@/contexts';
import { encodeSyncData, generateShareableUrl, generateSyncCode } from '@/utils';

type Props = {
  cars: Car[];
  priceSettings?: PriceSettings | null;
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

function hasAnySettings(settings?: PriceSettings | null): boolean {
  if (!settings) return false;
  return !!(settings.postalCode || settings.supplierId || settings.companyId || settings.productId);
}

export const ExportSection: React.FC<Props> = ({ cars, priceSettings }) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('qr');
  const [copied, setCopied] = useState(false);
  const [includeSettings, setIncludeSettings] = useState(true);

  const hasSettings = hasAnySettings(priceSettings);
  const settingsToInclude = includeSettings && hasSettings ? priceSettings : null;

  // Generate export data (async due to compression)
  const [exportData, setExportData] = useState<{
    qrData: string;
    shareUrl: string | null;
    syncCode: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      const [qrData, shareUrl, syncCode] = await Promise.all([
        encodeSyncData(cars, settingsToInclude),
        generateShareableUrl(cars, settingsToInclude),
        generateSyncCode(cars, settingsToInclude),
      ]);

      if (!cancelled) {
        setExportData({ qrData, shareUrl, syncCode });
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [cars, settingsToInclude]);

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Build summary text
  const summaryParts: string[] = [];
  if (cars.length > 0) {
    summaryParts.push(`${cars.length} car${cars.length !== 1 ? 's' : ''}`);
  }
  if (settingsToInclude) {
    summaryParts.push('settings');
  }
  const summaryText = summaryParts.join(' + ');

  if (cars.length === 0 && !hasSettings) {
    return (
      <div style={{ textAlign: 'center', padding: 16, color: tokens.colorNeutralForeground3 }}>
        <Text size={200}>No data to export. Add a car or configure settings first.</Text>
      </div>
    );
  }

  if (!exportData) {
    return (
      <div style={{ textAlign: 'center', padding: 16, color: tokens.colorNeutralForeground3 }}>
        <Text size={200}>Generating...</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Include settings checkbox */}
      {hasSettings && (
        <Checkbox
          checked={includeSettings}
          onChange={(_, data) => setIncludeSettings(!!data.checked)}
          label="Include electricity settings"
        />
      )}

      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as ExportTab)}
        size="small"
      >
        <Tab value="qr" icon={<QrCode20Regular />}>QR Code</Tab>
        <Tab
          value="link"
          icon={exportData.shareUrl ? <Link20Regular /> : <Warning20Regular />}
          disabled={!exportData.shareUrl}
        >
          Link
        </Tab>
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
            <QRCodeSVG value={exportData.qrData} size={180} />
          </div>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Scan to import {summaryText}
          </Text>
        </div>
      )}

      {activeTab === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exportData.shareUrl ? (
            <>
              <Textarea
                value={exportData.shareUrl}
                readOnly
                resize="none"
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                rows={3}
              />
              <Button
                appearance="primary"
                icon={copied ? <Checkmark20Regular /> : <Copy20Regular />}
                onClick={() => handleCopy(exportData.shareUrl!)}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Share this link to import {summaryText}
              </Text>
            </>
          ) : (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
                Data too large for URL. Use QR Code or Code instead.
              </Text>
            </div>
          )}
        </div>
      )}

      {activeTab === 'code' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Textarea
            value={exportData.syncCode}
            readOnly
            resize="none"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            rows={3}
          />
          <Button
            appearance="primary"
            icon={copied ? <Checkmark20Regular /> : <Copy20Regular />}
            onClick={() => handleCopy(exportData.syncCode)}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Paste this code to import {summaryText}
          </Text>
        </div>
      )}
    </div>
  );
};
