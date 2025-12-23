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

import type { Car, MergeResult } from '../../hooks/useCars';
import { parseAnyFormat } from '../../utils/carSyncCodec';
import { CarImportPreviewDialog } from './CarImportPreviewDialog';
import { CarImportResultDialog } from './CarImportResultDialog';
import { QRCodeScanner } from './QRCodeScanner';

type Props = {
  existingCars: Car[];
  onImport: (cars: Omit<Car, 'id'>[]) => MergeResult;
};

type ImportTab = 'scan' | 'paste';

export const ImportSection: React.FC<Props> = ({ existingCars, onImport }) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('paste');
  const [pasteValue, setPasteValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewCars, setPreviewCars] = useState<Omit<Car, 'id'>[] | null>(null);
  const [importResult, setImportResult] = useState<MergeResult | null>(null);

  const handleParse = (input: string) => {
    setError(null);

    const parsed = parseAnyFormat(input);
    if (!parsed || parsed.length === 0) {
      setError('Could not parse car data. Make sure you copied the full code or link.');
      return;
    }

    setPreviewCars(parsed);
  };

  const handleScan = (data: string) => {
    handleParse(data);
  };

  const handlePasteSubmit = () => {
    handleParse(pasteValue);
  };

  const handleConfirmImport = () => {
    if (!previewCars) return;

    const result = onImport(previewCars);
    setImportResult(result);
    setPreviewCars(null);
    setPasteValue('');
  };

  const handleCloseResult = () => {
    setImportResult(null);
  };

  const handleClosePreview = () => {
    setPreviewCars(null);
  };

  // Memoize existing car names for duplicate detection
  const existingCarNames = useMemo(
    () => new Set(existingCars.map(c => c.name.toLowerCase().trim())),
    [existingCars]
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

      <CarImportPreviewDialog
        open={previewCars !== null}
        onClose={handleClosePreview}
        onConfirm={handleConfirmImport}
        cars={previewCars}
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
