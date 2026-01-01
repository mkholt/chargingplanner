import { Page, Locator, expect } from '@playwright/test';

export class ResultsPage {
  readonly page: Page;
  readonly chargingPlanHeader: Locator;
  readonly errorMessage: Locator;
  readonly warningMessage: Locator;
  readonly priceError: Locator;
  readonly timeline: Locator;
  readonly resultStart: Locator;
  readonly resultEnd: Locator;
  readonly resultDuration: Locator;
  readonly resultEnergy: Locator;
  readonly resultCost: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chargingPlanHeader = page.getByTestId('charging-plan-header');
    this.errorMessage = page.getByTestId('result-error');
    this.warningMessage = page.getByTestId('result-warning');
    this.priceError = page.getByTestId('price-error');
    this.timeline = page.getByTestId('price-attribution');
    this.resultStart = page.getByTestId('result-start');
    this.resultEnd = page.getByTestId('result-end');
    this.resultDuration = page.getByTestId('result-duration');
    this.resultEnergy = page.getByTestId('result-energy');
    this.resultCost = page.getByTestId('result-cost');
  }

  async getStartTime(): Promise<string> {
    return await this.resultStart.textContent() ?? '';
  }

  async getEndTime(): Promise<string> {
    return await this.resultEnd.textContent() ?? '';
  }

  async getDuration(): Promise<string> {
    // Get the value div (second child, after the label row)
    const valueDiv = this.resultDuration.locator('div').last();
    return await valueDiv.textContent() ?? '';
  }

  async getEnergy(): Promise<string> {
    // Energy uses a button with popover - get the button text
    const button = this.resultEnergy.locator('button');
    return await button.textContent() ?? '';
  }

  async getCost(): Promise<string> {
    // Cost uses a button with popover - get the button text
    const button = this.resultCost.locator('button');
    return await button.textContent() ?? '';
  }

  async hasResults(): Promise<boolean> {
    return await this.resultStart.isVisible() && await this.resultCost.isVisible();
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  async getErrorText(): Promise<string> {
    return await this.errorMessage.textContent() ?? '';
  }

  async expectResultsVisible(): Promise<void> {
    await expect(this.resultStart).toBeVisible();
    await expect(this.resultCost).toBeVisible();
  }

  async expectTimelineVisible(): Promise<void> {
    await expect(this.timeline).toBeVisible();
  }

  async expectNoError(): Promise<void> {
    await expect(this.errorMessage).not.toBeVisible();
  }

  // Get subtitle text (car name + price source)
  async getSubtitle(): Promise<string> {
    const subtitle = this.chargingPlanHeader.locator('xpath=following-sibling::*[1]');
    return await subtitle.textContent() ?? '';
  }

  // ========== Numeric Value Parsers ==========

  /**
   * Parse cost value from "XX.XX DKK" format
   */
  async getCostValue(): Promise<number> {
    const text = await this.getCost();
    const match = text.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : NaN;
  }

  /**
   * Parse energy value from "XX.XX kWh" format
   */
  async getEnergyValue(): Promise<number> {
    const text = await this.getEnergy();
    const match = text.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : NaN;
  }

  /**
   * Parse duration and convert to hours.
   * Handles formats: "3h 16m", "3h", "45m"
   */
  async getDurationHours(): Promise<number> {
    const text = await this.getDuration();
    let hours = 0;

    const hoursMatch = text.match(/(\d+)h/);
    if (hoursMatch) {
      hours += parseInt(hoursMatch[1], 10);
    }

    const minutesMatch = text.match(/(\d+)m/);
    if (minutesMatch) {
      hours += parseInt(minutesMatch[1], 10) / 60;
    }

    return hours;
  }

  // ========== Warning Methods ==========

  async hasWarning(): Promise<boolean> {
    return await this.warningMessage.isVisible().catch(() => false);
  }

  async getWarningText(): Promise<string> {
    return await this.warningMessage.textContent() ?? '';
  }

  async expectWarningVisible(): Promise<void> {
    await expect(this.warningMessage).toBeVisible();
  }

  // ========== Price Error Methods ==========

  async hasPriceError(): Promise<boolean> {
    return await this.priceError.isVisible().catch(() => false);
  }

  async getPriceErrorText(): Promise<string> {
    return await this.priceError.textContent() ?? '';
  }

  async expectPriceErrorVisible(): Promise<void> {
    await expect(this.priceError).toBeVisible();
  }
}
