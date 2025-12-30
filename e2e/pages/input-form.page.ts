import { Page, Locator, expect } from '@playwright/test';

export class InputFormPage {
  readonly page: Page;
  readonly startPercentInput: Locator;
  readonly endPercentInput: Locator;
  readonly batterySizeInput: Locator;
  readonly chargingPowerDropdown: Locator;
  readonly earliestTimePicker: Locator;
  readonly latestTimePicker: Locator;
  readonly resultCost: Locator;
  readonly resultError: Locator;
  readonly expandButton: Locator;
  readonly vehicleSettingsButton: Locator;
  readonly setToNowButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Number inputs in order: start %, end %, battery size (when advanced section is open)
    this.startPercentInput = page.locator('input[type="number"]').nth(0);
    this.endPercentInput = page.locator('input[type="number"]').nth(1);
    this.batterySizeInput = page.locator('input[type="number"]').nth(2);
    // Charging power is the second combobox (first is car selector)
    this.chargingPowerDropdown = page.getByRole('combobox').nth(1);
    // Time pickers (Fluent UI TimePicker with data-testid)
    this.earliestTimePicker = page.getByTestId('earliest-time-picker');
    this.latestTimePicker = page.getByTestId('latest-time-picker');
    // Result elements for waiting on calculation completion
    this.resultCost = page.getByTestId('result-cost');
    this.resultError = page.getByTestId('result-error');
    // Expand button (only visible on mobile when collapsed)
    this.expandButton = page.getByRole('button', { name: 'Expand settings' });
    // Vehicle settings toggle button (collapsible advanced section)
    this.vehicleSettingsButton = page.getByRole('button', { name: /vehicle settings/ });
    // Set to now button in earliest time picker
    this.setToNowButton = page.getByTestId('set-to-now-button');
  }

  /**
   * Ensure the form is expanded (on mobile it may be collapsed)
   */
  async ensureExpanded(): Promise<void> {
    // If expand button is visible, click it to expand the form
    if (await this.expandButton.isVisible()) {
      await this.expandButton.click();
      // Wait for form fields to be visible
      await expect(this.earliestTimePicker).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Ensure the vehicle settings (advanced) section is expanded.
   * Battery size and charging power fields are inside this collapsible section.
   */
  async ensureVehicleSettingsExpanded(): Promise<void> {
    // First ensure the main form is expanded
    await this.ensureExpanded();
    // Check if battery size input is already visible (section is open)
    if (!(await this.batterySizeInput.isVisible())) {
      // Click the vehicle settings button to expand
      await this.vehicleSettingsButton.click();
      // Wait for battery size input to be visible
      await expect(this.batterySizeInput).toBeVisible({ timeout: 5000 });
    }
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
    await this.ensureVehicleSettingsExpanded();
    await this.batterySizeInput.fill(String(value));
  }

  async getBatterySize(): Promise<number> {
    await this.ensureVehicleSettingsExpanded();
    const value = await this.batterySizeInput.inputValue();
    return parseInt(value, 10);
  }

  async setChargingPower(label: string): Promise<void> {
    await this.ensureVehicleSettingsExpanded();
    await this.chargingPowerDropdown.click();
    await this.page.getByRole('option', { name: new RegExp(label) }).click();
  }

  async getChargingPowerText(): Promise<string> {
    await this.ensureVehicleSettingsExpanded();
    return await this.chargingPowerDropdown.textContent() ?? '';
  }

  /**
   * Click the "Set to now" button to set earliest time to current time (rounded to next 15 min).
   */
  async clickSetToNow(): Promise<void> {
    await this.ensureExpanded();
    await this.setToNowButton.click();
  }

  /**
   * Get the earliest time value from the time picker.
   * Returns time in HH:mm format.
   */
  async getEarliestTime(): Promise<string> {
    await this.ensureExpanded();
    return await this.earliestTimePicker.inputValue();
  }

  /**
   * Set time using the native time input.
   */
  private async setTime(picker: Locator, time: string): Promise<void> {
    // The data-testid is on the native input element itself
    await picker.scrollIntoViewIfNeeded();
    await picker.fill(time);
    // Blur to trigger change event
    await picker.blur();
  }

  /**
   * Set the time window using HH:mm format strings.
   * The TimePicker will automatically determine Today/Tomorrow based on current time.
   */
  async setTimeWindow(earliestTime: string, latestTime: string): Promise<void> {
    // Ensure form is expanded on mobile
    await this.ensureExpanded();
    await this.setTime(this.earliestTimePicker, earliestTime);
    await this.setTime(this.latestTimePicker, latestTime);
  }

  async waitForCalculation(): Promise<void> {
    // Wait for the app's debounce delay (300ms) plus a small buffer
    // This ensures the calculation has been triggered after input changes
    await this.page.waitForTimeout(350);
    // Then wait for either result cost or error to be visible
    await expect(this.resultCost.or(this.resultError)).toBeVisible({ timeout: 5000 });
  }

  // Helper to format time as HH:mm (24-hour format)
  static formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Create a time window relative to now.
   * The TimePicker automatically determines Today/Tomorrow based on current time,
   * so we just need to pass the target times in HH:mm format.
   */
  async setRelativeTimeWindow(startOffsetHours: number, endOffsetHours: number): Promise<void> {
    const now = new Date();
    const start = new Date(now.getTime() + startOffsetHours * 60 * 60 * 1000);
    const end = new Date(now.getTime() + endOffsetHours * 60 * 60 * 1000);
    await this.setTimeWindow(
      InputFormPage.formatTime(start),
      InputFormPage.formatTime(end)
    );
  }
}
