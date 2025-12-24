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

import { ExportSection, ImportSection } from '@/components/sync';
import type { Car, PriceSettings } from '@/hooks';
import type { MergeResult, SyncData } from '@/utils';

type Props = {
  cars: Car[];
  priceSettings?: PriceSettings | null;
  onImport: (data: SyncData, selectedCarIndices: number[], importSettings: boolean) => MergeResult;
  onApplyPriceSettings?: (settings: PriceSettings) => void;
};

type SyncTab = 'export' | 'import';

export const SyncPanel: React.FC<Props> = ({
  cars,
  priceSettings,
  onImport,
  onApplyPriceSettings,
}) => {
  const [activeTab, setActiveTab] = useState<SyncTab>('export');

  return (
    <div>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as SyncTab)}
        style={{ marginBottom: 12 }}
      >
        <Tab value="export" icon={<ArrowUpload20Regular />}>Export</Tab>
        <Tab value="import" icon={<ArrowDownload20Regular />}>Import</Tab>
      </TabList>

      <div
        style={{
          padding: 12,
          background: tokens.colorNeutralBackground3,
          borderRadius: 8,
        }}
      >
        {activeTab === 'export' && <ExportSection cars={cars} priceSettings={priceSettings} />}
        {activeTab === 'import' && (
          <ImportSection
            existingCars={cars}
            onImport={onImport}
            onApplyPriceSettings={onApplyPriceSettings}
          />
        )}
      </div>
    </div>
  );
};
