import { Page, Locator, expect } from '@playwright/test';
import { clearAllStorage } from '../fixtures/localStorage';

export class AppPage {
  readonly page: Page;
  readonly title: Locator;
  readonly settingsButton: Locator;
  readonly carSelectorDropdown: Locator;
  readonly addCarButton: Locator;
  readonly noCarMessage: Locator;
  readonly priceAttribution: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByTestId('app-title');
    this.settingsButton = page.getByTestId('settings-button');
    this.carSelectorDropdown = page.getByTestId('car-selector');
    this.addCarButton = page.getByTestId('add-car-button');
    this.noCarMessage = page.getByTestId('no-car-message');
    this.priceAttribution = page.getByTestId('price-attribution');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForAppReady();
  }

  async gotoClean(): Promise<void> {
    await this.page.goto('/');
    await clearAllStorage(this.page);
    await this.page.reload();
    await this.waitForAppReady();
  }

  async waitForAppReady(): Promise<void> {
    await expect(this.title).toBeVisible();
    // Wait for price data to load (indicated by attribution text appearing)
    await expect(this.priceAttribution).toBeVisible();
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click();
    await expect(this.page.getByTestId('settings-dialog')).toBeVisible();
  }

  async selectCar(carName: string): Promise<void> {
    await this.carSelectorDropdown.click();
    await this.page.getByRole('option', { name: new RegExp(carName) }).click();
  }

  async getSelectedCarText(): Promise<string> {
    return await this.carSelectorDropdown.textContent() ?? '';
  }

  async hasCarSelector(): Promise<boolean> {
    return await this.carSelectorDropdown.isVisible();
  }
}
