import React, { useEffect, useRef } from 'react';

import {
  Button,
  Card,
  Divider,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Dismiss20Regular,
  Flash20Regular,
  Settings20Regular,
  Share20Regular,
  VehicleCar20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SyncPanel } from '@/components/sync';
import { type SettingsTab, usePriceSettings, useSettingsUI } from '@/contexts';
import { useIsMobile } from '@/hooks';

import { AggregationSection } from './AggregationSection';
import { AppSettingsSection } from './AppSettingsSection';
import { CarsSection } from './CarsSection';
import { CompanySection } from './CompanySection';
import { SupplierSection } from './SupplierSection';

export const SettingsPane: React.FC = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, closeSettings } = useSettingsUI();
  const { clearAll: clearPriceSettings, refetchIfStale } = usePriceSettings();
  const isMobile = useIsMobile();
  const paneRef = useRef<HTMLDivElement>(null);

  // Scroll into view on mobile when pane mounts
  useEffect(() => {
    if (isMobile && paneRef.current) {
      paneRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isMobile]);

  const handleTabSelect = (_: unknown, data: { value: unknown }) => {
    const tab = data.value as SettingsTab;
    setActiveTab(tab);
    // Refetch supplier/company data when entering the electricity tab (if stale)
    if (tab === 'electricity') {
      refetchIfStale();
    }
  };

  return (
    <Card
      ref={paneRef}
      data-testid="settings-pane"
      style={{
        padding: tokens.spacingHorizontalL,
        background: tokens.colorNeutralBackground2,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
      }}
    >
      {/* Header with title and Done button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacingHorizontalM,
        }}
      >
        <Text size={500} weight="semibold">
          {t('settings.title')}
        </Text>
        <Button
          appearance="subtle"
          icon={<Dismiss20Regular />}
          onClick={closeSettings}
          data-testid="done-button"
        >
          {t('settings.closeButton')}
        </Button>
      </div>

      {/* Tab navigation */}
      <TabList
        selectedValue={activeTab}
        onTabSelect={handleTabSelect}
        size={isMobile ? 'small' : 'medium'}
        style={{ marginBottom: tokens.spacingHorizontalL }}
      >
        <Tab value="cars" icon={<VehicleCar20Regular />} data-testid="tab-cars">
          {(!isMobile || activeTab === 'cars') && t('settings.tabs.cars')}
        </Tab>
        <Tab value="electricity" icon={<Flash20Regular />} data-testid="tab-electricity">
          {(!isMobile || activeTab === 'electricity') && t('settings.tabs.electricity')}
        </Tab>
        <Tab value="sync" icon={<Share20Regular />} data-testid="tab-sync">
          {(!isMobile || activeTab === 'sync') && t('settings.tabs.sync')}
        </Tab>
        <Tab value="app" icon={<Settings20Regular />} data-testid="tab-app">
          {(!isMobile || activeTab === 'app') && t('settings.tabs.app')}
        </Tab>
      </TabList>

      {/* Tab content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalL }}>
        {activeTab === 'cars' && (
          <CarsSection />
        )}

        {activeTab === 'electricity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalXL }}>
            <SupplierSection />
            <Divider />
            <CompanySection />
            <Divider />
            <AggregationSection />
          </div>
        )}

        {activeTab === 'sync' && <SyncPanel />}

        {activeTab === 'app' && <AppSettingsSection />}
      </div>

      {/* Footer with Clear Settings button (only on electricity tab) */}
      {activeTab === 'electricity' && (
        <div style={{ marginTop: tokens.spacingHorizontalL }}>
          <Button
            appearance="secondary"
            onClick={clearPriceSettings}
            data-testid="clear-settings-button"
          >
            {t('settings.clearSettings')}
          </Button>
        </div>
      )}
    </Card>
  );
};
