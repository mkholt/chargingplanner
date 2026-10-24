/** Form state for editing/adding a car */
export type CarFormState = {
  name: string;
  batterySize: number;
  maxPower: number;
};

export const DEFAULT_CAR_FORM: CarFormState = {
  name: '',
  batterySize: 60,
  maxPower: 11,
};

export function isCarFormValid({ name, batterySize, maxPower }: CarFormState): boolean {
  return name.trim() !== '' && batterySize > 0 && maxPower > 0;
}
