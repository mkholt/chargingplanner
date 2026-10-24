import React from 'react';

import { useSkodaVault } from '@/contexts';

import { SkodaUnlockForm } from './SkodaUnlockForm';

type Props = {
  /** Why the vault needs to be unlocked */
  prompt: string;
  onCancel?: () => void;
  children: React.ReactNode;
};

/**
 * Shows the children only while the Škoda tokens can be stored: with password protection off, or with the vault
 * unlocked. Otherwise asks for the password. Locking unmounts the children, which drops what they held in state.
 */
export const SkodaVaultGate: React.FC<Props> = ({ prompt, onCancel, children }) => {
  const { isProtected, isUnlocked } = useSkodaVault();
  if (isProtected && !isUnlocked) return <SkodaUnlockForm prompt={prompt} onCancel={onCancel} />;
  return <>{children}</>;
};
