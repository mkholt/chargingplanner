import React, { useEffect, useState } from 'react';

import {
  Button,
  Dropdown,
  Field,
  Input,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  BatteryCharge24Regular,
  ChevronDown16Regular,
  ChevronDown20Regular,
  ChevronUp16Regular,
  ChevronUp20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { CarSelector } from '@/components';
import { BatteryPercentageSlider, TimeWindowSelector } from '@/components/form';
import { SkodaVehicleStatus } from '@/components/skoda';
import { type Car } from '@/contexts';
import { type ChargePrefill, getChargePrefill, useDebouncedCallback, useIsMobile, useSkodaVehicleQuery } from '@/hooks';
import {
  CHARGING_POWER_OPTIONS,
  DEBOUNCE_MS,
  LS_KEYS,
  roundToNext15Minutes,
  toDateTimeLocalString,
} from '@/utils';

type FormInput = {
  startPercent: number;
  endPercent: number;
  batterySize: number;
  chargingSpeed: number;
  earliest: string;
  latest: string;
};

type Props = {
  selectedCar: Car | null;
  onSubmit: (input: FormInput) => void;
};

/** Get default earliest time based on user preference */
function getDefaultEarliest(): string {
  try {
    const stored = localStorage.getItem(LS_KEYS.DEFAULT_EARLIEST);
    const value = stored ? (JSON.parse(stored) as string) : 'now';

    if (value === 'now') {
      // "Now" mode: use current time rounded to next 15 minutes
      return toDateTimeLocalString(roundToNext15Minutes(new Date()));
    }

    // Specific time mode: value is in "HH:mm" format
    const [hours, minutes] = value.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    // If the time has already passed, round to next 15 minutes instead
    if (target <= now) {
      return toDateTimeLocalString(roundToNext15Minutes(now));
    }

    return toDateTimeLocalString(target);
  } catch {
    // Fall through to default
  }
  return toDateTimeLocalString(roundToNext15Minutes(new Date()));
}

/** Get default latest time based on user preference */
function getDefaultLatest(): string {
  try {
    const stored = localStorage.getItem(LS_KEYS.DEFAULT_LATEST);
    if (stored) {
      const timeStr = JSON.parse(stored) as string; // "HH:mm" format
      const [hours, minutes] = timeStr.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      // If the time has already passed today, use tomorrow
      if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
        target.setDate(target.getDate() + 1);
      }
      target.setHours(hours, minutes, 0, 0);
      return toDateTimeLocalString(target);
    }
  } catch {
    // Fall through to default
  }
  // Default: tomorrow 7am, or today 7am if before 7am
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getHours() < 7 ? now.getDate() : now.getDate() + 1);
  target.setHours(7, 0, 0, 0);
  return toDateTimeLocalString(target);
}

export const InputForm: React.FC<Props> = ({
  selectedCar,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Battery levels from the linked Škoda, if any. Values the user picks take precedence.
  // Only the first data is used, so a refetch or a locked vault doesn't change the form under the user.
  const { data: vehicle } = useSkodaVehicleQuery(selectedCar);
  const [prefill, setPrefill] = useState<ChargePrefill | null>(null);
  const latestPrefill = getChargePrefill(vehicle);
  if (prefill === null && latestPrefill !== null) setPrefill(latestPrefill);
  const [startOverride, setStartOverride] = useState<number | null>(null);
  const [endOverride, setEndOverride] = useState<number | null>(null);
  const endPercent = Math.max(endOverride ?? prefill?.endPercent ?? 80, 1);
  const startPercent = Math.min(startOverride ?? prefill?.startPercent ?? 20, endPercent - 1);

  // Initialize form state from selected car (component remounts when car changes via key prop)
  const [batterySize, setBatterySize] = useState(selectedCar?.batterySize ?? 60);
  const [chargingSpeed, setChargingSpeed] = useState(selectedCar?.maxPower ?? 11);
  const [earliest, setEarliest] = useState(getDefaultEarliest);
  const [latest, setLatest] = useState(getDefaultLatest);

  // Debounced submit - triggers calculation after user stops typing
  const debouncedSubmit = useDebouncedCallback(
    (input: FormInput) => onSubmit(input),
    DEBOUNCE_MS,
  );

  // Wrapper that calls debounced submit with current form state
  const triggerSubmit = (overrides: Partial<FormInput> = {}) => {
    debouncedSubmit({
      startPercent,
      endPercent,
      batterySize,
      chargingSpeed,
      earliest,
      latest,
      ...overrides,
    });
  };

  // Submit on mount to trigger the initial calculation, and again when Škoda data arrives
  useEffect(() => {
    onSubmit({
      startPercent,
      endPercent,
      batterySize,
      chargingSpeed,
      earliest,
      latest,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.startPercent, prefill?.endPercent]);

  // Field update handlers that also trigger debounced submit
  const updateStartPercent = (value: number) => {
    const clamped = Math.min(value, endPercent - 1);
    setStartOverride(clamped);
    triggerSubmit({ startPercent: clamped });
  };

  const updateEndPercent = (value: number) => {
    const clamped = Math.max(value, startPercent + 1);
    setEndOverride(clamped);
    triggerSubmit({ endPercent: clamped });
  };

  const updateBatterySize = (value: number) => {
    setBatterySize(value);
    triggerSubmit({ batterySize: value });
  };

  const updateChargingSpeed = (value: number) => {
    setChargingSpeed(value);
    triggerSubmit({ chargingSpeed: value });
  };

  const updateEarliest = (value: string) => {
    setEarliest(value);
    triggerSubmit({ earliest: value });
  };

  const updateLatest = (value: string) => {
    setLatest(value);
    triggerSubmit({ latest: value });
  };

  const showCollapsible = isMobile;
  const isContentVisible = !showCollapsible || !isCollapsed;

  return (
    <div
      style={{
        background: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusLarge,
        padding: tokens.spacingHorizontalL,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: tokens.spacingHorizontalS,
          marginBottom: isContentVisible ? tokens.spacingHorizontalL : 0,
          cursor: showCollapsible ? 'pointer' : 'default',
        }}
        onClick={showCollapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        role={showCollapsible ? "button" : undefined}
        tabIndex={showCollapsible ? 0 : undefined}
        onKeyDown={showCollapsible ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        } : undefined}
      >
        <BatteryCharge24Regular />
        <Text weight="semibold" size={400} style={{ flex: 1 }}>{t('input.chargingSettings')}</Text>
        {showCollapsible && (
          <Button
            appearance="subtle"
            icon={isCollapsed ? <ChevronDown20Regular /> : <ChevronUp20Regular />}
            aria-label={isCollapsed ? t('common.expandSettings') : t('common.collapseSettings')}
            data-testid="expand-settings-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          />
        )}
      </div>
      {isContentVisible && (
        <>
          <CarSelector />
          <SkodaVehicleStatus car={selectedCar} />
          {prefill?.atChargeLimit && (
            <Text
              size={200}
              block
              style={{ color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM }}
              data-testid="skoda-at-charge-limit"
            >
              {t('skoda.vehicle.atChargeLimit')}
            </Text>
          )}
          <form
            style={{ display: "flex", flexDirection: "column", gap: tokens.spacingHorizontalL }}
            onSubmit={e => {
              e.preventDefault();
            }}
          >
            <Field label={t('input.startPercent')}>
              <BatteryPercentageSlider
                value={startPercent}
                onChange={updateStartPercent}
                data-testid="start-percent-input"
              />
            </Field>
            <Field label={t('input.endPercent')}>
              <BatteryPercentageSlider
                value={endPercent}
                onChange={updateEndPercent}
                snapPoint={80}
                data-testid="end-percent-input"
              />
            </Field>
            <TimeWindowSelector
              earliest={earliest}
              latest={latest}
              onEarliestChange={updateEarliest}
              onLatestChange={updateLatest}
            />
            {/* Collapsible advanced section for battery size and charging power */}
            <div>
              <Button
                appearance="transparent"
                size="small"
                icon={isAdvancedOpen ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                data-testid="vehicle-settings-button"
                style={{
                  padding: `${tokens.spacingHorizontalXS} 0`,
                  color: tokens.colorNeutralForeground2,
                }}
              >
                {isAdvancedOpen ? t('input.hideVehicleSettings') : t('input.showVehicleSettings')} ({batterySize} kWh · {chargingSpeed} kW)
              </Button>
              {isAdvancedOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalL, marginTop: tokens.spacingHorizontalM }}>
                  <Field label={t('input.batterySize')}>
                    <Input
                      type="number"
                      min={10}
                      max={150}
                      value={String(batterySize)}
                      onChange={(_ev, data) => updateBatterySize(Number(data.value))}
                      data-testid="battery-size-input"
                      style={{ width: "100%" }}
                    />
                  </Field>
                  <Field label={t('input.chargingPower')}>
                    <Dropdown
                      value={CHARGING_POWER_OPTIONS.find(p => p.value === chargingSpeed)?.label}
                      onOptionSelect={(_ev, data) => updateChargingSpeed(Number(data.optionValue))}
                      data-testid="charging-power-dropdown"
                      style={{ width: "100%" }}
                    >
                      {CHARGING_POWER_OPTIONS.map(power => (
                        <Option key={power.value} value={String(power.value)}>
                          {power.label}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </div>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
};
