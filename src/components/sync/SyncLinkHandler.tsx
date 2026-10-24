import React, { useEffect, useState } from 'react';

import { SyncImportFlow } from '@/components/sync';
import { parseShareableUrl, type SyncData } from '@/utils';

export const SyncLinkHandler: React.FC = () => {
  const [dataToImport, setDataToImport] = useState<SyncData | null>(null);

  // Check URL hash for sync data on mount (async due to compression)
  useEffect(() => {
    if (!window.location.hash.startsWith('#sync=')) return;
    const url = window.location.href;
    // Remove the sync data from the address bar and history right away, also when it can't be imported,
    // as it may contain sealed Škoda access
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    void parseShareableUrl(url).then(parsed => {
      if (parsed && (parsed.cars.length > 0 || parsed.settings)) setDataToImport(parsed);
    });
  }, []);

  return <SyncImportFlow data={dataToImport} onDone={() => setDataToImport(null)} />;
};
