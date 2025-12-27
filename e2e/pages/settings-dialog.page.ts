import { Page, Locator, expect } from '@playwright/test';

export class SettingsDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly carsTab: Locator;
  readonly electricityTab: Locator;
  readonly syncTab: Locator;
  readonly doneButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.carsTab = page.getByRole('tab', { name: 'Cars' });
    this.electricityTab = page.getByRole('tab', { name: 'Electricity' });
    this.syncTab = page.getByRole('tab', { name: 'Sync' });
    this.doneButton = page.getByRole('button', { name: 'Done' });
  }

  async switchToCarsTab(): Promise<void> {
    await this.carsTab.click();
  }

  async switchToElectricityTab(): Promise<void> {
    await this.electricityTab.click();
  }

  async switchToSyncTab(): Promise<void> {
    await this.syncTab.click();
  }

  async close(): Promise<void> {
    await this.doneButton.click();
    await expect(this.dialog).not.toBeVisible();
  }

  // ========== Cars Section Methods ==========

  async clickAddCarCard(): Promise<void> {
    // Click the "Add Car" card in the cars grid
    await this.page.locator('text=Add Car').last().click();
  }

  async fillCarForm(name: string, batterySize: number, maxPower: number): Promise<void> {
    await this.page.getByPlaceholder('Car name').fill(name);

    // Battery size input - find the input near "kWh" label
    const batteryInput = this.page.locator('input[type="number"]').first();
    await batteryInput.fill(String(batterySize));

    // Max power combobox - type and blur to close dropdown
    // Don't press Escape as it closes the parent Dialog
    const powerInput = this.page.getByRole('combobox').last();
    await powerInput.fill(`${maxPower}`);
    // Click on the name input to blur the combobox and close its dropdown
    await this.page.getByPlaceholder('Car name').click();
    // Wait for dropdown to close and DOM to stabilize
    await this.page.waitForTimeout(100);
  }

  async saveNewCar(): Promise<void> {
    // Use exact match to avoid matching "Add Car" card button
    // Wait for button to be stable before clicking
    const addButton = this.page.getByRole('button', { name: 'Add car', exact: true });
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();
  }

  async addCar(name: string, batterySize: number, maxPower: number): Promise<void> {
    await this.clickAddCarCard();
    await this.fillCarForm(name, batterySize, maxPower);
    await this.saveNewCar();
    // Wait for the card to appear
    await this.page.waitForTimeout(100);
  }

  async editCar(
    currentName: string,
    updates: { name?: string; batterySize?: number; maxPower?: number }
  ): Promise<void> {
    // Find the car card and click edit
    const carCard = this.page.locator(`text="${currentName}"`).locator('xpath=ancestor::div[contains(@style, "border")]');
    await carCard.getByRole('button', { name: 'Edit car' }).click();

    if (updates.name !== undefined) {
      await this.page.getByPlaceholder('Car name').fill(updates.name);
    }
    if (updates.batterySize !== undefined) {
      const batteryInput = this.page.locator('input[type="number"]').first();
      await batteryInput.fill(String(updates.batterySize));
    }
    if (updates.maxPower !== undefined) {
      const powerInput = this.page.getByRole('combobox').last();
      await powerInput.fill(`${updates.maxPower}`);
      await this.page.keyboard.press('Enter');
    }

    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async deleteCar(carName: string): Promise<void> {
    const carCard = this.page.locator(`text="${carName}"`).locator('xpath=ancestor::div[contains(@style, "border")]');
    await carCard.getByRole('button', { name: 'Delete car' }).click();

    // Confirm deletion in dialog - use exact match to avoid "Delete car" button
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
  }

  async selectCar(carName: string): Promise<void> {
    await this.page.locator(`text="${carName}"`).click();
  }

  async getCarCardNames(): Promise<string[]> {
    // Get all car names from cards (look for the name text which has fontWeight: 600)
    const nameElements = this.page.locator('div[style*="fontWeight: 600"], div[style*="font-weight: 600"]');
    const names = await nameElements.allTextContents();
    // Filter out "Add Car" if present
    return names.filter(n => n !== 'Add Car' && n.trim() !== '');
  }

  // ========== Electricity Section Methods ==========

  async setPostalCode(code: number): Promise<void> {
    await this.switchToElectricityTab();
    const input = this.page.getByPlaceholder(/postal code/i);
    await input.fill(String(code));
    // Wait for supplier lookup
    await this.page.waitForTimeout(300);
  }

  async getPostalCodeValue(): Promise<string> {
    const input = this.page.getByPlaceholder(/postal code/i);
    return await input.inputValue();
  }

  async selectSupplier(name: string): Promise<void> {
    const dropdown = this.page.getByRole('combobox').filter({ hasText: /Select.*operator|grid operator/i });
    await dropdown.click();
    await this.page.getByRole('option', { name: new RegExp(name, 'i') }).click();
  }

  async selectCompany(name: string): Promise<void> {
    const dropdown = this.page.getByRole('combobox').filter({ hasText: /Select.*supplier|electricity/i });
    await dropdown.click();
    await this.page.getByRole('option', { name: new RegExp(name, 'i') }).click();
  }

  async selectProduct(name: string): Promise<void> {
    const dropdown = this.page.getByRole('combobox').filter({ hasText: /Select.*product/i });
    await dropdown.click();
    await this.page.getByRole('option', { name: new RegExp(name, 'i') }).click();
  }

  async clearSettings(): Promise<void> {
    await this.switchToElectricityTab();
    const clearButton = this.page.getByRole('button', { name: /clear/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }
}
