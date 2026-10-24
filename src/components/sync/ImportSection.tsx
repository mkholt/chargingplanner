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
  Camera20Regular,
  ClipboardPaste20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { QRCodeScanner, SyncImportFlow } from '@/components/sync';
import { parseAnyFormat, type SyncData } from '@/utils';

type ImportTab = 'scan' | 'paste';

export const ImportSection: React.FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<ImportTab>('paste');
  const [pasteValue, setPasteValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<SyncData | null>(null);

  const handleParse = async (input: string) => {
    setError(null);

    const parsed = await parseAnyFormat(input);
    if (!parsed || (parsed.cars.length === 0 && !parsed.settings)) {
      setError(t('sync.parseError'));
      return;
    }

    setPreviewData(parsed);
  };

  const handleScan = (data: string) => {
    void handleParse(data);
  };

  const handlePasteSubmit = () => {
    void handleParse(pasteValue);
  };

  const handleImportDone = () => {
    setPreviewData(null);
    setPasteValue('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalM }}>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as ImportTab)}
        size="small"
      >
        <Tab value="paste" icon={<ClipboardPaste20Regular />}>{t('sync.paste')}</Tab>
        <Tab value="scan" icon={<Camera20Regular />}>{t('sync.scanQr')}</Tab>
      </TabList>

      {activeTab === 'paste' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalS }}>
          <Textarea
            value={pasteValue}
            onChange={(_, data) => setPasteValue(data.value)}
            placeholder={t('sync.pastePlaceholder')}
            resize="vertical"
            rows={3}
            data-testid="sync-paste-input"
          />
          <Button
            appearance="primary"
            onClick={handlePasteSubmit}
            disabled={!pasteValue.trim()}
            data-testid="sync-import-button"
          >
            {t('sync.importButton')}
          </Button>
        </div>
      )}

      {activeTab === 'scan' && (
        <QRCodeScanner onScan={handleScan} />
      )}

      {error && (
        <div
          style={{
            padding: tokens.spacingHorizontalM,
            background: tokens.colorPaletteRedBackground1,
            borderRadius: tokens.borderRadiusLarge,
            color: tokens.colorPaletteRedForeground1,
          }}
        >
          <Text size={200}>{error}</Text>
        </div>
      )}

      <SyncImportFlow data={previewData} onDone={handleImportDone} />
    </div>
  );
};
