import { Page, Locator, expect } from '@playwright/test';

export class ResultsPage {
  readonly page: Page;
  readonly chargingPlanHeader: Locator;
  readonly errorMessage: Locator;
  readonly timeline: Locator;
  readonly resultStart: Locator;
  readonly resultEnd: Locator;
  readonly resultDuration: Locator;
  readonly resultEnergy: Locator;
  readonly resultCost: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chargingPlanHeader = page.getByText('Charging Plan');
    this.errorMessage = page.getByTestId('result-error');
    this.timeline = page.getByText('stromligning');
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
    // Get the value div (second child, after the label row)
    const valueDiv = this.resultEnergy.locator('div').last();
    return await valueDiv.textContent() ?? '';
  }

  async getCost(): Promise<string> {
    // Get the value div (second child, after the label row)
    const valueDiv = this.resultCost.locator('div').last();
    return await valueDiv.textContent() ?? '';
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
}
