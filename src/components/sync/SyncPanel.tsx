import React, { useState } from 'react';

import {
  Button,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  ArrowUpload20Regular,
  ChevronDown20Regular,
  ChevronUp20Regular,
  Share20Regular,
} from '@fluentui/react-icons';

import { ExportSection, ImportSection } from '@/components/sync';
import type { Car, MergeResult } from '@/hooks';

type Props = {
  cars: Car[];
  onImport: (cars: Omit<Car, 'id'>[]) => MergeResult;
};

type SyncTab = 'export' | 'import';

export const SyncPanel: React.FC<Props> = ({ cars, onImport }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<SyncTab>('export');

  return (
    <div
      style={{
        borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
        marginTop: 8,
        paddingTop: 8,
      }}
    >
      <Button
        appearance="subtle"
        icon={isExpanded ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
        iconPosition="after"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          justifyContent: 'space-between',
          padding: '8px 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Share20Regular />
          <Text>Share & Sync</Text>
        </div>
      </Button>

      {isExpanded && (
        <div
          style={{
            padding: 12,
            background: tokens.colorNeutralBackground3,
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as SyncTab)}
            style={{ marginBottom: 12 }}
          >
            <Tab value="export" icon={<ArrowUpload20Regular />}>Export</Tab>
            <Tab value="import" icon={<ArrowDownload20Regular />}>Import</Tab>
          </TabList>

          {activeTab === 'export' && <ExportSection cars={cars} />}
          {activeTab === 'import' && <ImportSection existingCars={cars} onImport={onImport} />}
        </div>
      )}
    </div>
  );
};
