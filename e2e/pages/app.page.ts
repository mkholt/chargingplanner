import { Page, Locator, expect } from '@playwright/test';
import { clearAllStorage } from '../fixtures/localStorage';

export class AppPage {
  readonly page: Page;
  readonly title: Locator;
  readonly settingsButton: Locator;
  readonly carSelectorDropdown: Locator;
  readonly addCarButton: Locator;
  readonly noCarMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { name: 'EV Charging Planner' });
    this.settingsButton = page.getByRole('button', { name: 'Settings' });
    this.carSelectorDropdown = page.getByTestId('car-selector');
    this.addCarButton = page.getByRole('button', { name: 'Add Car' });
    this.noCarMessage = page.getByText('No car saved');
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
    // Wait for mock API data to load (100-300ms mock delays)
    await this.page.waitForTimeout(400);
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
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
