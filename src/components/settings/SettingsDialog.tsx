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
import { usePriceSettings } from '@/contexts';

import { AggregationSection } from './AggregationSection';
import { CarsSection } from './CarsSection';
import { CompanySection } from './CompanySection';
import { SupplierSection } from './SupplierSection';

type SettingsTab = 'cars' | 'electricity' | 'sync';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const SettingsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('cars');
  const { clearAll: clearPriceSettings, refetchIfStale } = usePriceSettings();

  const handleTabSelect = (_: unknown, data: { value: unknown }) => {
    const tab = data.value as SettingsTab;
    setActiveTab(tab);
    // Refetch supplier/company data when entering the electricity tab (if stale)
    if (tab === 'electricity') {
      refetchIfStale();
    }
  };

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
      <DialogSurface data-testid="settings-dialog" style={{ width: 600, maxHeight: '90vh' }}>
        <DialogBody>
          <DialogTitle action={closeButton}>Settings</DialogTitle>
          <DialogContent style={{ overflow: 'auto', minHeight: 300, maxHeight: 'calc(90vh - 150px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tab navigation */}
              <TabList
                selectedValue={activeTab}
                onTabSelect={handleTabSelect}
              >
                <Tab value="cars" icon={<VehicleCar20Regular />} data-testid="tab-cars">
                  Cars
                </Tab>
                <Tab value="electricity" icon={<Flash20Regular />} data-testid="tab-electricity">
                  Electricity
                </Tab>
                <Tab value="sync" icon={<Share20Regular />} data-testid="tab-sync">
                  Sync
                </Tab>
              </TabList>

              {/* Tab content */}
              {activeTab === 'cars' && (
                <CarsSection onCloseDialog={() => onOpenChange(false)} />
              )}

              {activeTab === 'electricity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 16 }}>
                  <SupplierSection />
                  <Divider />
                  <CompanySection />
                  <Divider />
                  <AggregationSection />
                </div>
              )}

              {activeTab === 'sync' && <SyncPanel />}
            </div>
          </DialogContent>
          <DialogActions style={{ justifyContent: 'space-between' }}>
            {activeTab === 'electricity' ? (
              <Button appearance="secondary" onClick={clearPriceSettings} data-testid="clear-settings-button">
                Clear Settings
              </Button>
            ) : (
              <div />
            )}
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary" data-testid="done-button">Done</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
