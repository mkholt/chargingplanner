import React, { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Divider,
  Tab,
  TabList,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  Flash20Regular,
  Share20Regular,
  VehicleCar20Regular,
} from '@fluentui/react-icons';

import { SyncPanel } from '@/components/sync';
import type { AggregationMethod, AggregationSize, Car, PriceSettings, ResolvedPriceSettings } from '@/hooks';
import type { MergeResult, SyncData } from '@/utils';

import { AggregationSection } from './AggregationSection';
import { CarsSection } from './CarsSection';
import { CompanySection } from './CompanySection';
import { SupplierSection } from './SupplierSection';

type SettingsTab = 'cars' | 'electricity' | 'sync';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Car props
  cars: Car[];
  selectedCarId: string | null;
  onSelectCar: (car: Car) => void;
  onAddCar: (car: Omit<Car, 'id'>) => void;
  onUpdateCar: (id: string, updates: Partial<Omit<Car, 'id'>>) => void;
  onDeleteCar: (id: string) => void;
  // Price settings props
  priceSettings: ResolvedPriceSettings;
  rawPriceSettings: PriceSettings;
  onPostalCodeChange: (postalCode: number | null) => void;
  onCompanyChange: (companyId: string | null) => void;
  onProductChange: (productId: string | null) => void;
  onAggregationSizeChange: (size: AggregationSize) => void;
  onAggregationMethodChange: (method: AggregationMethod) => void;
  onClearPriceSettings: () => void;
  onApplyPriceSettings: (settings: PriceSettings) => void;
  // Import handler
  onImport: (data: SyncData, selectedCarIndices: number[], importSettings: boolean) => MergeResult;
};

export const SettingsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  cars,
  selectedCarId,
  onSelectCar,
  onAddCar,
  onUpdateCar,
  onDeleteCar,
  priceSettings,
  rawPriceSettings,
  onPostalCodeChange,
  onCompanyChange,
  onProductChange,
  onAggregationSizeChange,
  onAggregationMethodChange,
  onClearPriceSettings,
  onApplyPriceSettings,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('cars');

  const closeButton = (
    <Button
      appearance="subtle"
      aria-label="Close"
      icon={<Dismiss24Regular />}
      onClick={() => onOpenChange(false)}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface style={{ width: 600, maxHeight: '90vh' }}>
        <DialogBody>
          <DialogTitle action={closeButton}>Settings</DialogTitle>
          <DialogContent style={{ overflow: 'auto', height: 550 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tab navigation */}
              <TabList
                selectedValue={activeTab}
                onTabSelect={(_, data) => setActiveTab(data.value as SettingsTab)}
              >
                <Tab value="cars" icon={<VehicleCar20Regular />}>
                  Cars
                </Tab>
                <Tab value="electricity" icon={<Flash20Regular />}>
                  Electricity
                </Tab>
                <Tab value="sync" icon={<Share20Regular />}>
                  Sync
                </Tab>
              </TabList>

              {/* Tab content */}
              {activeTab === 'cars' && (
                <CarsSection
                  cars={cars}
                  selectedCarId={selectedCarId}
                  onSelect={onSelectCar}
                  onAdd={onAddCar}
                  onUpdate={onUpdateCar}
                  onDelete={onDeleteCar}
                  onCloseDialog={() => onOpenChange(false)}
                />
              )}

              {activeTab === 'electricity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <SupplierSection
                    postalCode={priceSettings.postalCode}
                    supplier={priceSettings.supplier}
                    onPostalCodeChange={onPostalCodeChange}
                  />

                  <Divider />

                  <CompanySection
                    priceArea={priceSettings.priceArea}
                    company={priceSettings.company}
                    product={priceSettings.product}
                    onCompanyChange={onCompanyChange}
                    onProductChange={onProductChange}
                  />

                  <Divider />

                  <AggregationSection
                    aggregationSize={priceSettings.aggregationSize}
                    aggregationMethod={priceSettings.aggregationMethod}
                    onAggregationSizeChange={onAggregationSizeChange}
                    onAggregationMethodChange={onAggregationMethodChange}
                  />
                </div>
              )}

              {activeTab === 'sync' && (
                <SyncPanel
                  cars={cars}
                  priceSettings={rawPriceSettings}
                  onImport={onImport}
                  onApplyPriceSettings={onApplyPriceSettings}
                />
              )}
            </div>
          </DialogContent>
          <DialogActions style={{ justifyContent: 'space-between' }}>
            {activeTab === 'electricity' ? (
              <Button appearance="secondary" onClick={onClearPriceSettings}>
                Clear Settings
              </Button>
            ) : (
              <div />
            )}
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary">Done</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
