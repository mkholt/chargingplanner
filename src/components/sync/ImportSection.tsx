import React, { useMemo, useState } from 'react';

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

import {
  CarImportResultDialog,
  ImportPreviewDialog,
  QRCodeScanner,
} from '@/components/sync';
import { useCars, usePriceSettings } from '@/contexts';
import { mergeCars, parseAnyFormat, type MergeResult, type SyncData } from '@/utils';

type ImportTab = 'scan' | 'paste';

export const ImportSection: React.FC = () => {
  const { cars, addCar } = useCars();
  const { applySettings } = usePriceSettings();

  const [activeTab, setActiveTab] = useState<ImportTab>('paste');
  const [pasteValue, setPasteValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<SyncData | null>(null);
  const [importResult, setImportResult] = useState<MergeResult | null>(null);

  const handleParse = (input: string) => {
    setError(null);

    const parsed = parseAnyFormat(input);
    if (!parsed || (parsed.cars.length === 0 && !parsed.settings)) {
      setError('Could not parse data. Make sure you copied the full code or link.');
      return;
    }

    setPreviewData(parsed);
  };

  const handleScan = (data: string) => {
    handleParse(data);
  };

  const handlePasteSubmit = () => {
    handleParse(pasteValue);
  };

  const handleConfirmImport = (selectedCarIndices: number[], importSettings: boolean) => {
    if (!previewData) return;

    // Filter cars by selected indices
    const selectedCars = selectedCarIndices.map(i => previewData.cars[i]);

    // Generate IDs for new cars
    const generateId = () => Math.random().toString(36).slice(2);

    // Merge cars
    const result = mergeCars(cars, selectedCars, generateId);

    // Add new cars
    result.added.forEach(car => {
      addCar({ name: car.name, batterySize: car.batterySize, maxPower: car.maxPower });
    });

    // Apply settings if requested
    if (importSettings && previewData.settings) {
      applySettings(previewData.settings);
    }

    setImportResult(result);
    setPreviewData(null);
    setPasteValue('');
  };

  const handleCloseResult = () => {
    setImportResult(null);
  };

  const handleClosePreview = () => {
    setPreviewData(null);
  };

  // Memoize existing car names for duplicate detection
  const existingCarNames = useMemo(
    () => new Set(cars.map(c => c.name.toLowerCase().trim())),
    [cars]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as ImportTab)}
        size="small"
      >
        <Tab value="paste" icon={<ClipboardPaste20Regular />}>Paste</Tab>
        <Tab value="scan" icon={<Camera20Regular />}>Scan QR</Tab>
      </TabList>

      {activeTab === 'paste' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Textarea
            value={pasteValue}
            onChange={(_, data) => setPasteValue(data.value)}
            placeholder="Paste a link or code here..."
            resize="vertical"
            rows={3}
          />
          <Button
            appearance="primary"
            onClick={handlePasteSubmit}
            disabled={!pasteValue.trim()}
          >
            Import
          </Button>
        </div>
      )}

      {activeTab === 'scan' && (
        <QRCodeScanner onScan={handleScan} />
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

      <ImportPreviewDialog
        open={previewData !== null}
        onClose={handleClosePreview}
        onConfirm={handleConfirmImport}
        syncData={previewData}
        existingCarNames={existingCarNames}
      />

      <CarImportResultDialog
        open={importResult !== null}
        onClose={handleCloseResult}
        result={importResult}
      />
    </div>
  );
};
