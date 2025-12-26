import React, { useMemo, useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Text,
  tokens,
} from '@fluentui/react-components';

import { findCompanyById, findProductById, findSupplierById } from '@/data';
import type { Company, Supplier } from '@/data';
import { useCompaniesQuery, useSuppliersQuery } from '@/hooks';
import type { SyncData } from '@/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedCarIndices: number[], importSettings: boolean) => void;
  syncData: SyncData | null;
  existingCarNames: Set<string>;
};

/** Compute initial selection for a given syncData */
function computeInitialSelection(
  syncData: SyncData | null,
  existingCarNames: Set<string>
): Set<number> {
  const initial = new Set<number>();
  const cars = syncData?.cars ?? [];
  cars.forEach((car, i) => {
    if (!existingCarNames.has(car.name.toLowerCase().trim())) {
      initial.add(i);
    }
  });
  return initial;
}

/** Inner dialog content that resets when syncData changes via key prop */
const ImportPreviewDialogContent: React.FC<{
  syncData: SyncData;
  existingCarNames: Set<string>;
  onClose: () => void;
  onConfirm: (selectedCarIndices: number[], importSettings: boolean) => void;
  suppliers: Supplier[];
  companies: Company[];
}> = ({ syncData, existingCarNames, onClose, onConfirm, suppliers, companies }) => {
  const cars = syncData.cars;
  const settings = syncData.settings;

  // Track which cars are selected for import
  const [selectedCars, setSelectedCars] = useState<Set<number>>(() =>
    computeInitialSelection(syncData, existingCarNames)
  );

  // Track whether to import settings
  const [importSettings, setImportSettings] = useState(!!settings);

  // Resolve settings to display names
  const resolvedSettings = useMemo(() => {
    if (!settings) return null;

    const supplier = settings.supplierId ? findSupplierById(suppliers, settings.supplierId) : null;
    const company = settings.companyId
      ? findCompanyById(companies, settings.companyId)
      : null;
    const product = settings.productId
      ? findProductById(companies, settings.productId)
      : null;

    return { supplier, company, product, postalCode: settings.postalCode };
  }, [settings, suppliers, companies]);

  const toggleCar = (index: number) => {
    setSelectedCars(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCars(new Set(cars.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedCars(new Set());
  };

  const selectedCount = selectedCars.size;
  const hasSelections = selectedCount > 0 || (settings && importSettings);

  const handleConfirm = () => {
    onConfirm(Array.from(selectedCars), importSettings);
  };

  return (
    <>
      <DialogTitle>Import Preview</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cars section */}
          {cars.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold">
                  Cars ({cars.length} found)
                </Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="small" appearance="subtle" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button size="small" appearance="subtle" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cars.map((car, i) => {
                  const isDuplicate = existingCarNames.has(car.name.toLowerCase().trim());
                  const isSelected = selectedCars.has(i);

                  return (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        background: isDuplicate
                          ? tokens.colorPaletteYellowBackground1
                          : tokens.colorNeutralBackground3,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleCar(i)}
                      />
                      <div style={{ flex: 1 }}>
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
            </div>
          )}

          {/* Settings section */}
          {settings && resolvedSettings && (
            <>
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Checkbox
                    checked={importSettings}
                    onChange={(_, data) => setImportSettings(!!data.checked)}
                    label="Import electricity settings"
                  />
                </div>

                {importSettings && (
                  <div
                    style={{
                      padding: 12,
                      background: tokens.colorNeutralBackground3,
                      borderRadius: 6,
                      marginLeft: 28,
                    }}
                  >
                    {resolvedSettings.postalCode && (
                      <Text size={200} style={{ display: 'block' }}>
                        Postal code: {resolvedSettings.postalCode}
                        {resolvedSettings.supplier && (
                          <> → {resolvedSettings.supplier.name} ({resolvedSettings.supplier.priceArea})</>
                        )}
                      </Text>
                    )}
                    {resolvedSettings.company && (
                      <Text size={200} style={{ display: 'block' }}>
                        Company: {resolvedSettings.company.name}
                        {resolvedSettings.product && (
                          <> - {resolvedSettings.product.name}</>
                        )}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty state */}
          {cars.length === 0 && !settings && (
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              No data found to import.
            </Text>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleConfirm}
          disabled={!hasSelections}
        >
          Import{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </Button>
      </DialogActions>
    </>
  );
};

export const ImportPreviewDialog: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  syncData,
  existingCarNames,
}) => {
  // Fetch suppliers and companies data for resolving settings preview
  const { data: suppliers = [] } = useSuppliersQuery();

  // Get the priceArea from the supplier in syncData to fetch the right companies
  const supplierId = syncData?.settings?.supplierId;
  const syncSupplier = useMemo(() => {
    if (!supplierId) return null;
    return findSupplierById(suppliers, supplierId);
  }, [supplierId, suppliers]);

  const { data: companies = [] } = useCompaniesQuery(syncSupplier?.priceArea ?? null);

  // Use a counter to generate unique keys when syncData changes
  // This remounts the inner component to reset its state
  // Pattern: "Adjusting state during rendering" - see React docs
  const [keyCounter, setKeyCounter] = useState(0);
  const [prevSyncData, setPrevSyncData] = useState(syncData);

  if (syncData !== prevSyncData) {
    setPrevSyncData(syncData);
    setKeyCounter(c => c + 1);
  }

  const contentKey = syncData ? `sync-${keyCounter}` : 'empty';

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ maxWidth: 500 }}>
        <DialogBody>
          {syncData ? (
            <ImportPreviewDialogContent
              key={contentKey}
              syncData={syncData}
              existingCarNames={existingCarNames}
              onClose={onClose}
              onConfirm={onConfirm}
              suppliers={suppliers}
              companies={companies}
            />
          ) : (
            <>
              <DialogTitle>Import Preview</DialogTitle>
              <DialogContent>
                <Text style={{ color: tokens.colorNeutralForeground3 }}>
                  No data found to import.
                </Text>
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={onClose}>
                  Cancel
                </Button>
              </DialogActions>
            </>
          )}
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
