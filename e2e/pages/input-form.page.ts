import { Page, Locator } from '@playwright/test';

export class InputFormPage {
  readonly page: Page;
  readonly startPercentInput: Locator;
  readonly endPercentInput: Locator;
  readonly batterySizeInput: Locator;
  readonly chargingPowerDropdown: Locator;
  readonly earliestInput: Locator;
  readonly latestInput: Locator;

  constructor(page: Page) {
    this.page = page;
    // Number inputs in order: start %, end %, battery size
    this.startPercentInput = page.locator('input[type="number"]').nth(0);
    this.endPercentInput = page.locator('input[type="number"]').nth(1);
    this.batterySizeInput = page.locator('input[type="number"]').nth(2);
    // Charging power is the second combobox (first is car selector)
    this.chargingPowerDropdown = page.getByRole('combobox').nth(1);
    // Datetime inputs
    this.earliestInput = page.locator('input[type="datetime-local"]').first();
    this.latestInput = page.locator('input[type="datetime-local"]').last();
  }

  async setStartPercent(value: number): Promise<void> {
    await this.startPercentInput.fill(String(value));
  }

  async setEndPercent(value: number): Promise<void> {
    await this.endPercentInput.fill(String(value));
  }

  async getStartPercent(): Promise<number> {
    const value = await this.startPercentInput.inputValue();
    return parseInt(value, 10);
  }

  async getEndPercent(): Promise<number> {
    const value = await this.endPercentInput.inputValue();
    return parseInt(value, 10);
  }

  async setBatterySize(value: number): Promise<void> {
    await this.batterySizeInput.fill(String(value));
  }

  async getBatterySize(): Promise<number> {
    const value = await this.batterySizeInput.inputValue();
    return parseInt(value, 10);
  }

  async setChargingPower(label: string): Promise<void> {
    await this.chargingPowerDropdown.click();
    await this.page.getByRole('option', { name: new RegExp(label) }).click();
  }

  async getChargingPowerText(): Promise<string> {
    return await this.chargingPowerDropdown.textContent() ?? '';
  }

  async setTimeWindow(earliest: string, latest: string): Promise<void> {
    await this.earliestInput.fill(earliest);
    await this.latestInput.fill(latest);
  }

  async waitForCalculation(): Promise<void> {
    // Wait for debounce (300ms) + calculation time
    await this.page.waitForTimeout(400);
  }

  // Helper to create ISO datetime-local format string
  static formatDateTimeLocal(date: Date): string {
    return date.toISOString().slice(0, 16);
  }

  // Create a time window relative to now
  async setRelativeTimeWindow(startOffsetHours: number, endOffsetHours: number): Promise<void> {
    const now = new Date();
    const start = new Date(now.getTime() + startOffsetHours * 60 * 60 * 1000);
    const end = new Date(now.getTime() + endOffsetHours * 60 * 60 * 1000);
    await this.setTimeWindow(
      InputFormPage.formatDateTimeLocal(start),
      InputFormPage.formatDateTimeLocal(end)
    );
  }
}
