export type HourData = {
  index: number;
  hour: number;
  minute?: number;
  price: number;
  isCharging: boolean;
  date: Date;
  dayLabel: string;
};
