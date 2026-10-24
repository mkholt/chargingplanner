import React, { useEffect, useState } from 'react';

import { parseShareableUrl, type SyncData } from '@/utils';

import { SyncImportFlow } from './SyncImportFlow';

/** Imports sync data from a shared link, on load or when a link is opened in an already open tab */
export const SyncLinkHandler: React.FC = () => {
  const [dataToImport, setDataToImport] = useState<SyncData | null>(null);

  useEffect(() => {
    const importFromHash = () => {
      if (!window.location.hash.startsWith('#sync=')) return;
      const url = window.location.href;
      // Remove the sync data from the address bar and history right away, also when it can't be imported,
      // as it may contain sealed Škoda access
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      // Async due to compression
      void parseShareableUrl(url).then(parsed => {
        if (parsed && (parsed.cars.length > 0 || parsed.settings)) setDataToImport(parsed);
      });
    };

    importFromHash();
    window.addEventListener('hashchange', importFromHash);
    return () => window.removeEventListener('hashchange', importFromHash);
  }, []);

  return <SyncImportFlow data={dataToImport} onDone={() => setDataToImport(null)} />;
};
