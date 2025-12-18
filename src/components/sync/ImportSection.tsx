import React, { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
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

  // Check which cars are duplicates
  const existingNames = new Set(existingCars.map(c => c.name.toLowerCase().trim()));

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

      {/* Preview Dialog */}
      <Dialog open={previewCars !== null} onOpenChange={(_, data) => !data.open && handleClosePreview()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Import Cars</DialogTitle>
            <DialogContent>
              <Text size={300} style={{ marginBottom: 12, display: 'block' }}>
                Found {previewCars?.length} car{previewCars?.length !== 1 ? 's' : ''} to import:
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {previewCars?.map((car, i) => {
                  const isDuplicate = existingNames.has(car.name.toLowerCase().trim());
                  return (
                    <div
                      key={i}
                      style={{
                        padding: 8,
                        background: isDuplicate
                          ? tokens.colorPaletteYellowBackground1
                          : tokens.colorNeutralBackground3,
                        borderRadius: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <Text weight="semibold">{car.name}</Text>
                        <Text
                          size={200}
                          style={{ display: 'block', color: tokens.colorNeutralForeground3 }}
                        >
                          {car.batterySize} kWh · {car.maxPower} kW
                        </Text>
                      </div>
                      {isDuplicate && (
                        <Text
                          size={200}
                          style={{ color: tokens.colorPaletteYellowForeground2 }}
                        >
                          Duplicate
                        </Text>
                      )}
                    </div>
                  );
                })}
              </div>
              {previewCars?.every(c => existingNames.has(c.name.toLowerCase().trim())) && (
                <Text
                  size={200}
                  style={{
                    display: 'block',
                    marginTop: 12,
                    color: tokens.colorPaletteYellowForeground2,
                  }}
                >
                  All cars already exist and will be skipped.
                </Text>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={handleClosePreview}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleConfirmImport}>
                Import
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={importResult !== null} onOpenChange={(_, data) => !data.open && handleCloseResult()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Import Complete</DialogTitle>
            <DialogContent>
              {importResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {importResult.added.length > 0 && (
                    <Text>
                      Added {importResult.added.length} car{importResult.added.length !== 1 ? 's' : ''}:
                      {' '}{importResult.added.map(c => c.name).join(', ')}
                    </Text>
                  )}
                  {importResult.skipped.length > 0 && (
                    <Text style={{ color: tokens.colorNeutralForeground3 }}>
                      Skipped {importResult.skipped.length} duplicate{importResult.skipped.length !== 1 ? 's' : ''}:
                      {' '}{importResult.skipped.map(c => c.name).join(', ')}
                    </Text>
                  )}
                  {importResult.added.length === 0 && importResult.skipped.length === 0 && (
                    <Text>No cars were imported.</Text>
                  )}
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={handleCloseResult}>
                Done
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
