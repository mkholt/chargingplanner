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

import { ExportSection, ImportSection } from '@/components/sync';
import { useCars, usePriceSettings } from '@/contexts';

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
        style={{ marginBottom: 12 }}
      >
        <Tab value="export" icon={<ArrowUpload20Regular />}>{t('sync.export')}</Tab>
        <Tab value="import" icon={<ArrowDownload20Regular />}>{t('sync.import')}</Tab>
      </TabList>

      <div
        style={{
          padding: 12,
          background: tokens.colorNeutralBackground3,
          borderRadius: 8,
        }}
      >
        {activeTab === 'export' && <ExportSection cars={cars} priceSettings={priceSettings} />}
        {activeTab === 'import' && <ImportSection />}
      </div>
    </div>
  );
};
