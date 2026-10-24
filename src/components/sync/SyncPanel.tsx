import React, { useState } from 'react';

import {
  Tab,
  TabList,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  ArrowUpload20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { useCars, usePriceSettings } from '@/contexts';

import { ExportSection } from './ExportSection';
import { ImportSection } from './ImportSection';

type SyncTab = 'export' | 'import';

export const SyncPanel: React.FC = () => {
  const { t } = useTranslation();
  const { cars } = useCars();
  const { settings: priceSettings } = usePriceSettings();

  const [activeTab, setActiveTab] = useState<SyncTab>('export');

  return (
    <div>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as SyncTab)}
        style={{ marginBottom: tokens.spacingHorizontalM }}
      >
        <Tab value="export" icon={<ArrowUpload20Regular />} data-testid="sync-export-tab">{t('sync.export')}</Tab>
        <Tab value="import" icon={<ArrowDownload20Regular />} data-testid="sync-import-tab">{t('sync.import')}</Tab>
      </TabList>

      <div
        style={{
          padding: tokens.spacingHorizontalM,
          background: tokens.colorNeutralBackground3,
          borderRadius: tokens.borderRadiusLarge,
        }}
      >
        {activeTab === 'export' && <ExportSection cars={cars} priceSettings={priceSettings} />}
        {activeTab === 'import' && <ImportSection />}
      </div>
    </div>
  );
};
