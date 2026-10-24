import React from 'react';

import { Text, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import type { Car } from '@/contexts';
import { useSkodaLinkStatus } from '@/hooks';
import type { SkodaLinkStatus } from '@/utils';

import { formatExpiryDate } from './skodaErrors';

const STATUS_COLORS: Record<SkodaLinkStatus, string> = {
  linked: tokens.colorNeutralForeground3,
  locked: tokens.colorNeutralForeground3,
  expiring: tokens.colorPaletteYellowForeground2,
  expired: tokens.colorPaletteRedForeground1,
  relink: tokens.colorPaletteRedForeground1,
};

/** One-line Škoda link status of a car (nothing if the car isn't linked or the connection is off) */
export const SkodaLinkStatusText: React.FC<{ car: Car }> = ({ car }) => {
  const { t, i18n } = useTranslation();
  const status = useSkodaLinkStatus(car);
  if (!status || !car.skoda) return null;

  return (
    <Text size={200} style={{ color: STATUS_COLORS[status] }} data-testid="skoda-link-status" data-status={status}>
      {t(`skoda.link.status.${status}`, { date: formatExpiryDate(car.skoda.expiresAt, i18n.language) })}
    </Text>
  );
};
