import React, { createContext, useCallback, useContext, useState } from 'react';

// ============ Types ============

export type SettingsTab = 'cars' | 'electricity' | 'sync' | 'app';

type SettingsUIContextType = {
  /** Whether the settings pane is visible */
  isOpen: boolean;
  /** Currently active tab */
  activeTab: SettingsTab;
  /** Open settings pane, optionally to a specific tab */
  openSettings: (tab?: SettingsTab) => void;
  /** Close settings pane and return to results */
  closeSettings: () => void;
  /** Toggle settings pane open/closed */
  toggleSettings: () => void;
  /** Switch to a different tab while settings is open */
  setActiveTab: (tab: SettingsTab) => void;
};

// ============ Context ============

const SettingsUIContext = createContext<SettingsUIContextType | null>(null);

// ============ Provider ============

export const SettingsUIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('cars');

  const openSettings = useCallback((tab?: SettingsTab) => {
    if (tab) {
      setActiveTab(tab);
    }
    setIsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleSettings = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <SettingsUIContext.Provider
      value={{
        isOpen,
        activeTab,
        openSettings,
        closeSettings,
        toggleSettings,
        setActiveTab,
      }}
    >
      {children}
    </SettingsUIContext.Provider>
  );
};

// ============ Hook ============

// eslint-disable-next-line react-refresh/only-export-components
export function useSettingsUI(): SettingsUIContextType {
  const context = useContext(SettingsUIContext);
  if (!context) {
    throw new Error('useSettingsUI must be used within a SettingsUIProvider');
  }
  return context;
}
