import { Page, Locator, expect } from '@playwright/test';

export class InputFormPage {
  readonly page: Page;
  readonly startPercentInput: Locator;
  readonly endPercentInput: Locator;
  readonly batterySizeInput: Locator;
  readonly chargingPowerDropdown: Locator;
  readonly earliestInput: Locator;
  readonly latestInput: Locator;
  readonly resultCost: Locator;
  readonly resultError: Locator;

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
    // Result elements for waiting on calculation completion
    this.resultCost = page.getByTestId('result-cost');
    this.resultError = page.getByTestId('result-error');
  }

  async setStartPercent(value: number): Promise<void> {
    await this.startPercentInput.clear();
    await this.startPercentInput.fill(String(value));
    // Trigger blur to ensure the change is processed
    await this.startPercentInput.blur();
  }

  async setEndPercent(value: number): Promise<void> {
    await this.endPercentInput.clear();
    await this.endPercentInput.fill(String(value));
    // Trigger blur to ensure the change is processed
    await this.endPercentInput.blur();
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
    await this.earliestInput.clear();
    await this.earliestInput.fill(earliest);
    await this.latestInput.clear();
    await this.latestInput.fill(latest);
    // Trigger blur on the last input to ensure change is processed
    await this.latestInput.blur();
  }

  async waitForCalculation(): Promise<void> {
    // Wait for the app's debounce delay (300ms) plus a small buffer
    // This ensures the calculation has been triggered after input changes
    await this.page.waitForTimeout(350);
    // Then wait for either result cost or error to be visible
    await expect(this.resultCost.or(this.resultError)).toBeVisible({ timeout: 5000 });
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
