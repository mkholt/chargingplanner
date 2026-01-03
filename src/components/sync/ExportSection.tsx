import React, { useEffect, useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogSurface,
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
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import type { Car, PriceSettings } from '@/contexts';
import { useIsMobile } from '@/hooks';
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
  // Note: location is not synced for privacy reasons
  // Check if we have any supplier/company/product selection worth syncing
  return settings.supplier !== null || settings.company !== null;
}

export const ExportSection: React.FC<Props> = ({ cars, priceSettings }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<ExportTab>('qr');
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const hasSettings = hasAnySettings(priceSettings);
  const settingsToInclude = includeSettings && hasSettings ? priceSettings : null;
  const qrCodeSize = isMobile ? 200 : 256;

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

  const handleCopy = async (text: string, type: 'link' | 'code') => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // Build summary text
  const summaryParts: string[] = [];
  if (cars.length > 0) {
    summaryParts.push(t('cars.carCount', { count: cars.length }));
  }
  if (settingsToInclude) {
    summaryParts.push(t('common.settings').toLowerCase());
  }
  const summaryText = summaryParts.join(' + ');

  if (cars.length === 0 && !hasSettings) {
    return (
      <div style={{ textAlign: 'center', padding: tokens.spacingHorizontalL, color: tokens.colorNeutralForeground3 }}>
        <Text size={200}>{t('sync.noDataToExport')}</Text>
      </div>
    );
  }

  if (!exportData) {
    return (
      <div style={{ textAlign: 'center', padding: tokens.spacingHorizontalL, color: tokens.colorNeutralForeground3 }}>
        <Text size={200}>{t('sync.generating')}</Text>
      </div>
    );
  }

  // Calculate fullscreen QR size to fill viewport with comfortable margins
  const dialogQrSize = Math.min(window.innerWidth, window.innerHeight) * 0.8;

  // Shared QR code component (clickable to open fullscreen)
  const qrCodeDisplay = (
    <Stack align="center" gap={tokens.spacingHorizontalM}>
      <div
        onClick={() => setQrDialogOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setQrDialogOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={t('sync.enlargeQr')}
        style={{
          background: '#ffffff',
          padding: tokens.spacingHorizontalL,
          borderRadius: tokens.borderRadiusLarge,
          display: 'inline-block',
          cursor: 'pointer',
        }}
      >
        <QRCodeSVG value={exportData.qrData} size={qrCodeSize} />
      </div>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3, textAlign: 'center' }}>
        {t('sync.scanToImport', { summary: summaryText })}
      </Text>
    </Stack>
  );

  // Fullscreen QR code dialog
  const qrDialog = (
    <Dialog open={qrDialogOpen} onOpenChange={(_, data) => !data.open && setQrDialogOpen(false)}>
      <DialogSurface
        onClick={() => setQrDialogOpen(false)}
        style={{
          background: '#ffffff',
          padding: tokens.spacingHorizontalL,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <DialogBody style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <QRCodeSVG value={exportData.qrData} size={dialogQrSize} />
          <Text size={200} style={{ marginTop: tokens.spacingHorizontalM, color: tokens.colorNeutralForeground3 }}>
            {t('sync.tapToClose')}
          </Text>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );

  // Shared link section component
  const linkDisplay = exportData.shareUrl ? (
    <Stack gap={tokens.spacingHorizontalS}>
      <Text weight="semibold" size={200}>{t('sync.link')}</Text>
      <Textarea
        value={exportData.shareUrl}
        readOnly
        resize="none"
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        rows={2}
      />
      <Button
        appearance="secondary"
        icon={copied === 'link' ? <Checkmark20Regular /> : <Copy20Regular />}
        onClick={() => handleCopy(exportData.shareUrl!, 'link')}
      >
        {copied === 'link' ? t('sync.copied') : t('sync.copyLink')}
      </Button>
    </Stack>
  ) : (
    <Stack gap={tokens.spacingHorizontalS}>
      <Text weight="semibold" size={200}>{t('sync.link')}</Text>
      <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
        {t('sync.dataTooLarge')}
      </Text>
    </Stack>
  );

  // Shared code section component
  const codeDisplay = (
    <Stack gap={tokens.spacingHorizontalS}>
      <Text weight="semibold" size={200}>{t('sync.code')}</Text>
      <Textarea
        value={exportData.syncCode}
        readOnly
        resize="none"
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        rows={2}
      />
      <Button
        appearance="secondary"
        icon={copied === 'code' ? <Checkmark20Regular /> : <Copy20Regular />}
        onClick={() => handleCopy(exportData.syncCode, 'code')}
      >
        {copied === 'code' ? t('sync.copied') : t('sync.copyCode')}
      </Button>
    </Stack>
  );

  // Settings checkbox component
  const settingsCheckbox = hasSettings && (
    <Checkbox
      checked={includeSettings}
      onChange={(_, data) => setIncludeSettings(!!data.checked)}
      label={t('sync.includeElectricity')}
    />
  );

  // Desktop layout: QR on left, Link + Code stacked on right
  if (!isMobile) {
    return (
      <>
        {qrDialog}
        <Stack gap={tokens.spacingHorizontalL}>
          {settingsCheckbox}
          <Stack horizontal gap={tokens.spacingHorizontalXL} align="start">
            {qrCodeDisplay}
            <Stack gap={tokens.spacingHorizontalL} style={{ flex: 1 }}>
              {linkDisplay}
              {codeDisplay}
            </Stack>
          </Stack>
        </Stack>
      </>
    );
  }

  // Mobile layout: Tabbed interface
  return (
    <>
      {qrDialog}
      <Stack gap={tokens.spacingHorizontalM}>
        {settingsCheckbox}

      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as ExportTab)}
        size="small"
      >
        <Tab value="qr" icon={<QrCode20Regular />}>{t('sync.qrCode')}</Tab>
        <Tab
          value="link"
          icon={exportData.shareUrl ? <Link20Regular /> : <Warning20Regular />}
          disabled={!exportData.shareUrl}
        >
          {t('sync.link')}
        </Tab>
        <Tab value="code" icon={<Copy20Regular />}>{t('sync.code')}</Tab>
      </TabList>

      {activeTab === 'qr' && qrCodeDisplay}

      {activeTab === 'link' && (
        <Stack gap={tokens.spacingHorizontalS}>
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
                icon={copied === 'link' ? <Checkmark20Regular /> : <Copy20Regular />}
                onClick={() => handleCopy(exportData.shareUrl!, 'link')}
              >
                {copied === 'link' ? t('sync.copied') : t('sync.copyLink')}
              </Button>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {t('sync.shareLink', { summary: summaryText })}
              </Text>
            </>
          ) : (
            <div style={{ padding: tokens.spacingHorizontalL, textAlign: 'center' }}>
              <Text size={200} style={{ color: tokens.colorPaletteYellowForeground2 }}>
                {t('sync.dataTooLarge')}
              </Text>
            </div>
          )}
        </Stack>
      )}

      {activeTab === 'code' && (
        <Stack gap={tokens.spacingHorizontalS}>
          <Textarea
            value={exportData.syncCode}
            readOnly
            resize="none"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            rows={3}
          />
          <Button
            appearance="primary"
            icon={copied === 'code' ? <Checkmark20Regular /> : <Copy20Regular />}
            onClick={() => handleCopy(exportData.syncCode, 'code')}
          >
            {copied === 'code' ? t('sync.copied') : t('sync.copyCode')}
          </Button>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {t('sync.pasteCode', { summary: summaryText })}
          </Text>
        </Stack>
      )}
      </Stack>
    </>
  );
};
