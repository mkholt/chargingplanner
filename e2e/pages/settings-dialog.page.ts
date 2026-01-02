import { Page, Locator, expect } from '@playwright/test';

/** Slugify a car name for use in data-testid lookup */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class SettingsDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly carsTab: Locator;
  readonly electricityTab: Locator;
  readonly syncTab: Locator;
  readonly appTab: Locator;
  readonly doneButton: Locator;
  readonly languageSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId('settings-dialog');
    this.carsTab = page.getByTestId('tab-cars');
    this.electricityTab = page.getByTestId('tab-electricity');
    this.syncTab = page.getByTestId('tab-sync');
    this.appTab = page.getByTestId('tab-app');
    this.doneButton = page.getByTestId('done-button');
    this.languageSelector = page.getByTestId('language-selector');
  }

  async switchToCarsTab(): Promise<void> {
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.carsTab.click({ force: true });
  }

  async switchToElectricityTab(): Promise<void> {
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.electricityTab.click({ force: true });
  }

  async switchToSyncTab(): Promise<void> {
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.syncTab.click({ force: true });
  }

  async switchToAppTab(): Promise<void> {
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.appTab.click({ force: true });
  }

  async close(): Promise<void> {
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.doneButton.click({ force: true });
    await expect(this.dialog).not.toBeVisible();
  }

  // ========== Cars Section Methods ==========

  async clickAddCarCard(): Promise<void> {
    // Click the "Add Car" card in the cars grid
    const addCarCard = this.page.getByTestId('add-car-card');
    await addCarCard.scrollIntoViewIfNeeded();
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await addCarCard.click({ force: true });
  }

  async fillCarForm(name: string, batterySize: number, maxPower: number): Promise<void> {
    await this.page.getByTestId('car-name-input').fill(name);

    // Battery size input
    const batteryInput = this.page.getByTestId('car-battery-input');
    await batteryInput.fill(String(batterySize));

    // Max power combobox - type and blur to close dropdown
    // Don't press Escape as it closes the parent Dialog
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
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
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
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await editButton.click({ force: true });

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
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await deleteButton.click({ force: true });

    // Confirm deletion in dialog
    const confirmButton = this.page.getByTestId('confirm-delete-button');
    await confirmButton.scrollIntoViewIfNeeded();
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await confirmButton.click({ force: true });
  }

  async selectCar(carName: string): Promise<void> {
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.page.getByTestId(`car-card-${slugify(carName)}`).click({ force: true });
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
    // Valid postal codes will show a supplier like Radius, Norlys, N1, etc.
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
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await dropdown.click({ force: true });
    await this.page.getByRole('option', { name: new RegExp(name, 'i') }).click({ force: true });
  }

  async selectCompany(name: string): Promise<void> {
    const dropdown = this.page.getByRole('combobox').filter({ hasText: /Select.*supplier|electricity/i });
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await dropdown.click({ force: true });
    await this.page.getByRole('option', { name: new RegExp(name, 'i') }).click({ force: true });
  }

  async selectProduct(name: string): Promise<void> {
    const dropdown = this.page.getByRole('combobox').filter({ hasText: /Select.*product/i });
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await dropdown.click({ force: true });
    await this.page.getByRole('option', { name: new RegExp(name, 'i') }).click({ force: true });
  }

  async clearSettings(): Promise<void> {
    await this.switchToElectricityTab();
    const clearButton = this.page.getByTestId('clear-settings-button');
    if (await clearButton.isVisible()) {
      // Use force:true to handle Fluent UI dialog backdrop interception on mobile
      await clearButton.click({ force: true });
    }
  }

  // ========== GPS Location Methods ==========

  async clickGpsButton(): Promise<void> {
    await this.switchToElectricityTab();
    const gpsButton = this.page.getByTestId('gps-location-button');
    // Scroll into view on mobile where dialog content may need scrolling
    await gpsButton.scrollIntoViewIfNeeded();
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await gpsButton.click({ force: true });
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
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.languageSelector.click({ force: true });
    // Select by the native language name
    const optionText = language === 'en' ? 'English' : 'Dansk';
    await this.page.getByRole('option', { name: optionText }).click({ force: true });
  }

  async getCurrentLanguage(): Promise<string> {
    await this.switchToAppTab();
    return await this.languageSelector.inputValue();
  }

  // ========== App Section / Cache Methods ==========

  async clickClearCacheButton(): Promise<void> {
    await this.switchToAppTab();
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.page.getByTestId('clear-cache-button').click({ force: true });
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
    // Use force:true to handle Fluent UI dialog backdrop interception on mobile
    await this.page.getByTestId('earliest-now-toggle').click({ force: true });
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
