import React, { useEffect, useState } from 'react';

import {
  Button,
  Dropdown,
  Input,
  Option,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  Battery024Regular,
  Battery1024Regular,
  BatteryCharge24Regular,
  ChevronDown16Regular,
  ChevronDown20Regular,
  ChevronUp16Regular,
  ChevronUp20Regular,
  Flash24Regular,
  Settings20Regular,
  VehicleCarProfileLtr24Regular,
} from '@fluentui/react-icons';

import { CarSelector } from '@/components';
import { BatteryPercentageSlider, TimeWindowSelector } from '@/components/form';
import { LabeledFormField } from '@/components/ui';
import { type Car } from '@/contexts';
import { useDebouncedCallback, useIsMobile } from '@/hooks';
import {
  CHARGING_POWER_OPTIONS,
  DEBOUNCE_MS,
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
  onSettingsClick: () => void;
  onSubmit: (input: FormInput) => void;
};

/** Get default earliest time (now, rounded forward to next 15-minute interval) */
function getDefaultEarliest(): string {
  return toDateTimeLocalString(roundToNext15Minutes(new Date()));
}

/** Get default latest time (tomorrow 7am, or today 7am if before 7am) */
function getDefaultLatest(): string {
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getHours() < 7 ? now.getDate() : now.getDate() + 1);
  target.setHours(7, 0, 0, 0);
  return toDateTimeLocalString(target);
}

export const InputForm: React.FC<Props> = ({
  selectedCar,
  onSettingsClick,
  onSubmit,
}) => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Initialize form state from selected car (component remounts when car changes via key prop)
  const [startPercent, setStartPercent] = useState(20);
  const [endPercent, setEndPercent] = useState(80);
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

  // Submit once on mount to trigger initial calculation
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
  }, []);

  // Field update handlers that also trigger debounced submit
  const updateStartPercent = (value: number) => {
    const clamped = Math.min(value, endPercent - 1);
    setStartPercent(clamped);
    triggerSubmit({ startPercent: clamped });
  };

  const updateEndPercent = (value: number) => {
    const clamped = Math.max(value, startPercent + 1);
    setEndPercent(clamped);
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
    <div>
      <div
        style={{
          background: tokens.colorNeutralBackground2,
          borderRadius: 8,
          padding: 16,
          border: `1px solid ${tokens.colorNeutralStroke1}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: isContentVisible ? 16 : 0,
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
          <Text weight="semibold" size={400} style={{ flex: 1 }}>Charging Settings</Text>
          {showCollapsible && (
            <Button
              appearance="subtle"
              icon={isCollapsed ? <ChevronDown20Regular /> : <ChevronUp20Regular />}
              aria-label={isCollapsed ? "Expand settings" : "Collapse settings"}
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
            />
          )}
          <Tooltip content="Settings" relationship="label">
            <Button
              appearance="subtle"
              icon={<Settings20Regular />}
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick();
              }}
              aria-label="Settings"
              data-testid="settings-button"
            />
          </Tooltip>
        </div>
        {isContentVisible && (
          <>
            <CarSelector onAddCarClick={onSettingsClick} />
            <form
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              onSubmit={e => {
                e.preventDefault();
              }}
            >
              <LabeledFormField icon={<Battery024Regular />} label="Start %">
                <BatteryPercentageSlider
                  value={startPercent}
                  onChange={updateStartPercent}
                />
              </LabeledFormField>
              <LabeledFormField icon={<Battery1024Regular />} label="End %">
                <BatteryPercentageSlider
                  value={endPercent}
                  onChange={updateEndPercent}
                  snapPoint={80}
                />
              </LabeledFormField>
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
                  style={{
                    padding: '4px 0',
                    color: tokens.colorNeutralForeground2,
                  }}
                >
                  {isAdvancedOpen ? 'Hide' : 'Show'} vehicle settings ({batterySize} kWh · {chargingSpeed} kW)
                </Button>
                {isAdvancedOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                    <LabeledFormField icon={<VehicleCarProfileLtr24Regular />} label="Battery Size (kWh)">
                      <Input
                        type="number"
                        min={10}
                        max={150}
                        value={String(batterySize)}
                        onChange={(_ev, data) => updateBatterySize(Number(data.value))}
                        style={{ width: "100%" }}
                      />
                    </LabeledFormField>
                    <LabeledFormField icon={<Flash24Regular />} label="Charging Power">
                      <Dropdown
                        value={CHARGING_POWER_OPTIONS.find(p => p.value === chargingSpeed)?.label}
                        onOptionSelect={(_ev, data) => updateChargingSpeed(Number(data.optionValue))}
                        style={{ width: "100%" }}
                      >
                        {CHARGING_POWER_OPTIONS.map(power => (
                          <Option key={power.value} value={String(power.value)}>
                            {power.label}
                          </Option>
                        ))}
                      </Dropdown>
                    </LabeledFormField>
                  </div>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
