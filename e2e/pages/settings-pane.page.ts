import { Page, Locator, expect } from '@playwright/test';

/** Slugify a car name for use in data-testid lookup */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class SettingsPanePage {
  readonly page: Page;
  readonly pane: Locator;
  readonly carsTab: Locator;
  readonly electricityTab: Locator;
  readonly syncTab: Locator;
  readonly appTab: Locator;
  readonly doneButton: Locator;
  readonly languageSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pane = page.getByTestId('settings-pane');
    this.carsTab = page.getByTestId('tab-cars');
    this.electricityTab = page.getByTestId('tab-electricity');
    this.syncTab = page.getByTestId('tab-sync');
    this.appTab = page.getByTestId('tab-app');
    this.doneButton = page.getByTestId('done-button');
    this.languageSelector = page.getByTestId('language-selector');
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

  async switchToAppTab(): Promise<void> {
    await this.appTab.click();
  }

  async close(): Promise<void> {
    await this.doneButton.click();
    await expect(this.pane).not.toBeVisible();
  }

  // ========== Cars Section Methods ==========

  async clickAddCarCard(): Promise<void> {
    // Click the "Add Car" card in the cars grid
    const addCarCard = this.page.getByTestId('add-car-card');
    await addCarCard.scrollIntoViewIfNeeded();
    await addCarCard.click();
  }

  async fillCarForm(name: string, batterySize: number, maxPower: number): Promise<void> {
    await this.page.getByTestId('car-name-input').fill(name);

    // Battery size input
    const batteryInput = this.page.getByTestId('car-battery-input');
    await batteryInput.fill(String(batterySize));

    // Max power combobox - type and blur to close dropdown
    const powerInput = this.page.getByTestId('car-power-dropdown');
    await powerInput.fill(`${maxPower}`);
    // Click on the name input to blur the combobox and close its dropdown
    await this.page.getByTestId('car-name-input').click();
    // Wait for any dropdown listbox to close
    await expect(this.page.getByRole('listbox')).not.toBeVisible();
  }

  async saveNewCar(): Promise<void> {
    // Wait for button to be stable before clicking
    const saveButton = this.page.getByTestId('save-car-button');
    await saveButton.waitFor({ state: 'visible' });
    await saveButton.scrollIntoViewIfNeeded();
    // Use force:true to handle mobile layout where input fields may overlap button
    await saveButton.click({ force: true });
  }

  async addCar(name: string, batterySize: number, maxPower: number): Promise<void> {
    await this.clickAddCarCard();
    await this.fillCarForm(name, batterySize, maxPower);
    await this.saveNewCar();
    // Wait for the car card to appear with the new name
    await expect(this.page.getByTestId(`car-card-${slugify(name)}`)).toBeVisible();
  }

  async editCar(
    currentName: string,
    updates: { name?: string; batterySize?: number; maxPower?: number }
  ): Promise<void> {
    // Find the car card and click edit
    const carCard = this.page.getByTestId(`car-card-${slugify(currentName)}`);
    const editButton = carCard.getByTestId('edit-car-button');
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();

    if (updates.name !== undefined) {
      await this.page.getByTestId('car-name-input').fill(updates.name);
    }
    if (updates.batterySize !== undefined) {
      const batteryInput = this.page.getByTestId('car-battery-input');
      await batteryInput.fill(String(updates.batterySize));
    }
    if (updates.maxPower !== undefined) {
      const powerInput = this.page.getByTestId('car-power-dropdown');
      await powerInput.fill(`${updates.maxPower}`);
      await this.page.keyboard.press('Enter');
    }

    await this.page.getByTestId('save-car-button').click();
  }

  async deleteCar(carName: string): Promise<void> {
    const carCard = this.page.getByTestId(`car-card-${slugify(carName)}`);
    const deleteButton = carCard.getByTestId('delete-car-button');
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();

    // Confirm deletion in dialog
    const confirmButton = this.page.getByTestId('confirm-delete-button');
    await confirmButton.scrollIntoViewIfNeeded();
    await confirmButton.click();
  }

  async selectCar(carName: string): Promise<void> {
    await this.page.getByTestId(`car-card-${slugify(carName)}`).click();
  }

  async getCarCardNames(): Promise<string[]> {
    // Get all car names from cards using data-testid
    const nameElements = this.page.locator('[data-testid="car-name"]');
    const names = await nameElements.allTextContents();
    return names.filter(n => n.trim() !== '');
  }

  // ========== Electricity Section Methods ==========

  async setPostalCode(code: number): Promise<void> {
    await this.switchToElectricityTab();
    const input = this.page.getByTestId('postal-code-input');
    await input.fill(String(code));
    // Wait for supplier lookup to complete (supplier name appears)
    // Valid postal codes will show a supplier like Radius, Norlys, N1, TREFOR, etc.
    if (code >= 1000 && code <= 9999) {
      await expect(this.page.getByText(/Radius|Norlys|N1|TREFOR|EWII|Dinel|Elektrus|Ikast|RAH|Hammel|Hurup/i).first()).toBeVisible();
    }
  }

  async getPostalCodeValue(): Promise<string> {
    const input = this.page.getByTestId('postal-code-input');
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
    const clearButton = this.page.getByTestId('clear-settings-button');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  // ========== GPS Location Methods ==========

  async clickGpsButton(): Promise<void> {
    await this.switchToElectricityTab();
    const gpsButton = this.page.getByTestId('gps-location-button');
    // Scroll into view on mobile where content may need scrolling
    await gpsButton.scrollIntoViewIfNeeded();
    await gpsButton.click();
  }

  async getLocationError(): Promise<string | null> {
    // Location errors are displayed as red text in the SupplierSection
    const errorText = this.page.getByTestId('location-error');
    if (await errorText.isVisible().catch(() => false)) {
      return await errorText.textContent();
    }
    return null;
  }

  async isUsingGpsLocation(): Promise<boolean> {
    const gpsIndicator = this.page.getByTestId('gps-location-indicator');
    return await gpsIndicator.isVisible().catch(() => false);
  }

  async getPostalCodeError(): Promise<string | null> {
    // Postal code validation errors
    const errorText = this.page.getByTestId('postal-code-error');
    if (await errorText.isVisible().catch(() => false)) {
      return await errorText.textContent();
    }
    return null;
  }

  async getSupplierNotFoundMessage(): Promise<string | null> {
    // "No grid operator found" message
    const notFoundText = this.page.getByTestId('no-supplier-message');
    if (await notFoundText.isVisible().catch(() => false)) {
      return await notFoundText.textContent();
    }
    return null;
  }

  // ========== App Section / Language Methods ==========

  async selectLanguage(language: 'en' | 'da'): Promise<void> {
    await this.switchToAppTab();
    await this.languageSelector.click();
    // Select by the native language name
    const optionText = language === 'en' ? 'English' : 'Dansk';
    await this.page.getByRole('option', { name: optionText }).click();
  }

  async getCurrentLanguage(): Promise<string> {
    await this.switchToAppTab();
    return await this.languageSelector.inputValue();
  }

  // ========== App Section / Cache Methods ==========

  async clickClearCacheButton(): Promise<void> {
    await this.switchToAppTab();
    await this.page.getByTestId('clear-cache-button').click();
  }

  async isCacheButtonDisabled(): Promise<boolean> {
    const button = this.page.getByTestId('clear-cache-button');
    return await button.isDisabled();
  }

  async getClearCacheButtonText(): Promise<string> {
    const button = this.page.getByTestId('clear-cache-button');
    return await button.textContent() ?? '';
  }

  // ========== App Section / Data Source Methods ==========

  async isMockDataBadgeVisible(): Promise<boolean> {
    await this.switchToAppTab();
    const badge = this.page.getByTestId('mock-data-badge');
    return await badge.isVisible();
  }

  // ========== App Section / Default Time Window Methods ==========

  async isEarliestNowToggleChecked(): Promise<boolean> {
    await this.switchToAppTab();
    const toggle = this.page.getByTestId('earliest-now-toggle');
    return await toggle.isChecked();
  }

  async toggleEarliestNow(): Promise<void> {
    await this.switchToAppTab();
    await this.page.getByTestId('earliest-now-toggle').click();
  }

  async isEarliestTimeInputDisabled(): Promise<boolean> {
    await this.switchToAppTab();
    const input = this.page.getByTestId('earliest-time-input');
    return await input.isDisabled();
  }

  async setEarliestTime(time: string): Promise<void> {
    await this.switchToAppTab();
    const input = this.page.getByTestId('earliest-time-input');
    await input.fill(time);
  }

  async getEarliestTimeValue(): Promise<string> {
    await this.switchToAppTab();
    const input = this.page.getByTestId('earliest-time-input');
    return await input.inputValue();
  }

  async setLatestTime(time: string): Promise<void> {
    await this.switchToAppTab();
    const input = this.page.getByTestId('latest-time-input');
    await input.fill(time);
  }

  async getLatestTimeValue(): Promise<string> {
    await this.switchToAppTab();
    const input = this.page.getByTestId('latest-time-input');
    return await input.inputValue();
  }
}
