import React, { useRef, useState } from 'react';

import { Link, Text, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import {
  ChargingIndicator,
  DayMarkers,
  getPriceColor,
  PriceLegend,
  SelectedHourDetail,
  TimeLabels,
  TimelineGrid,
} from '@/components/timeline';
import { Stack } from '@/components/ui';
import { useIsMobile, useTimelineData } from '@/hooks';
import { formatTime, type PriceSlot } from '@/utils';

type Props = {
  slots: PriceSlot[];
  /** Start time of optimal charging window */
  chargingStart?: Date;
  /** End time of optimal charging window */
  chargingEnd?: Date;
  chargingSpeed?: number;
  intervalMinutes?: number;
  /** Timestamp when price data was last fetched */
  dataUpdatedAt?: number;
};

export const PriceTimeline: React.FC<Props> = ({
  slots,
  chargingStart,
  chargingEnd,
  chargingSpeed,
  intervalMinutes = 60,
  dataUpdatedAt,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const timelineData = useTimelineData({
    slots,
    chargingStart,
    chargingEnd,
    intervalMinutes,
  });

  if (!timelineData) return null;

  const { hourData, dayBoundaries, minPrice, maxPrice } = timelineData;
  const selectedHour = selectedIndex !== null ? hourData[selectedIndex] : null;
  const hasChargingWindow = chargingStart && chargingEnd && chargingEnd > chargingStart;

  // Handle click outside to deselect
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setSelectedIndex(null);
    }
  };

  return (
    <Stack
      ref={containerRef}
      onClick={handleContainerClick}
      gap={tokens.spacingHorizontalS}
      style={{ marginTop: tokens.spacingHorizontalL, width: '100%' }}
    >
      <DayMarkers dayBoundaries={dayBoundaries} totalBars={hourData.length} />

      <TimelineGrid
        hourData={hourData}
        dayBoundaries={dayBoundaries}
        minPrice={minPrice}
        maxPrice={maxPrice}
        intervalMinutes={intervalMinutes}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
      />

      {hasChargingWindow && <ChargingIndicator hourData={hourData} />}

      <TimeLabels hourData={hourData} intervalMinutes={intervalMinutes} />

      {selectedHour && (
        <SelectedHourDetail
          hour={selectedHour}
          color={getPriceColor(selectedHour.price, minPrice, maxPrice)}
          chargingSpeed={chargingSpeed}
          intervalMinutes={intervalMinutes}
        />
      )}

      <PriceLegend minPrice={minPrice} maxPrice={maxPrice} />

      <Stack
        horizontal={!isMobile}
        align={isMobile ? 'flex-start' : 'center'}
        justify="space-between"
        gap={tokens.spacingHorizontalS}
        style={{ marginTop: tokens.spacingHorizontalS }}
      >
        <Text size={200} data-testid="price-attribution" style={{ color: tokens.colorNeutralForeground3 }}>
          {t('priceTimeline.dataProvidedBy')}{' '}
          <Link href="https://stromligning.dk" target="_blank" rel="noopener noreferrer">
            stromligning.dk
          </Link>
        </Text>
        {dataUpdatedAt && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {t('priceTimeline.lastUpdated', {
              time: formatTime(new Date(dataUpdatedAt))
            })}
          </Text>
        )}
      </Stack>
    </Stack>
  );
};
