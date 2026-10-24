import { Page, Locator, expect } from '@playwright/test';

/** Slugify a car name for use in data-testid lookup */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class SkodaPage {
  readonly page: Page;
  // Settings → App → Škoda connection
  readonly settings: Locator;
  readonly enableToggle: Locator;
  readonly proxyUrl: Locator;
  readonly testConnectionButton: Locator;
  readonly connectionResult: Locator;
  // Password protection (vault)
  readonly vaultSettings: Locator;
  readonly vaultStatus: Locator;
  // Car editor
  readonly linkSection: Locator;
  readonly linkError: Locator;
  // Input form
  readonly vehicleStatus: Locator;
  readonly vehicleSummary: Locator;
  readonly vehicleChargeLimit: Locator;
  readonly vehicleError: Locator;
  readonly unlockForm: Locator;
  // Sync
  readonly exportOptions: Locator;
  readonly includeAccessCheckbox: Locator;
  readonly exportCode: Locator;
  // Add a car from Škoda
  readonly addCarForm: Locator;
  readonly addCarCheckDetails: Locator;

  constructor(page: Page) {
    this.page = page;
    this.settings = page.getByTestId('skoda-settings');
    this.enableToggle = page.getByTestId('skoda-enable-toggle');
    this.proxyUrl = page.getByTestId('skoda-proxy-url');
    this.testConnectionButton = page.getByTestId('skoda-test-connection-button');
    this.connectionResult = page.getByTestId('skoda-connection-result');
    this.vaultSettings = page.getByTestId('skoda-vault-settings');
    this.vaultStatus = page.getByTestId('skoda-vault-status');
    this.linkSection = page.getByTestId('skoda-link-section');
    this.linkError = page.getByTestId('skoda-link-error');
    this.vehicleStatus = page.getByTestId('skoda-vehicle-status');
    this.vehicleSummary = page.getByTestId('skoda-vehicle-summary');
    this.vehicleChargeLimit = page.getByTestId('skoda-vehicle-charge-limit');
    this.vehicleError = page.getByTestId('skoda-vehicle-error');
    this.unlockForm = page.getByTestId('skoda-unlock-form');
    this.exportOptions = page.getByTestId('skoda-export-options');
    this.includeAccessCheckbox = page.getByTestId('skoda-include-access-checkbox');
    this.exportCode = page.getByTestId('skoda-export-code');
    this.addCarForm = page.getByTestId('add-skoda-car-form');
    this.addCarCheckDetails = page.getByTestId('add-skoda-car-check-details');
  }

  /** Link status text on a car card in Settings → Cars */
  carLinkStatus(carName: string): Locator {
    return this.page.getByTestId(`car-card-${slugify(carName)}`).getByTestId('skoda-link-status');
  }

  // ========== Settings ==========

  async enableProxy(): Promise<void> {
    await this.enableToggle.check();
  }

  async testConnection(): Promise<void> {
    await this.testConnectionButton.click();
  }

  // ========== Linking ==========

  /** Open the car editor and link the car. Leaves the editor open. */
  async linkCar(carName: string, vin: string, apiKey: string): Promise<void> {
    const editButton = this.page.getByTestId(`car-card-${slugify(carName)}`).getByTestId('edit-car-button');
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();
    await this.page.getByTestId('skoda-link-button').click();
    await this.page.getByTestId('skoda-vin-input').fill(vin);
    await this.page.getByTestId('skoda-api-key-input').fill(apiKey);
    await this.page.getByTestId('skoda-link-submit-button').click();
  }

  /** In Settings → Cars: add a car from its VIN and API key. Stops at the car form, with the name filled in. */
  async lookUpNewCar(vin: string, apiKey: string): Promise<void> {
    const addCard = this.page.getByTestId('add-skoda-car-card');
    await addCard.scrollIntoViewIfNeeded();
    await addCard.click();
    await this.addCarForm.getByTestId('skoda-vin-input').fill(vin);
    await this.addCarForm.getByTestId('skoda-api-key-input').fill(apiKey);
    await this.page.getByTestId('add-skoda-car-lookup-button').click();
  }

  async saveCar(): Promise<void> {
    const saveButton = this.page.getByTestId('save-car-button');
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click({ force: true });
  }

  // ========== Password protection ==========

  async turnOnVault(password: string): Promise<void> {
    await this.page.getByTestId('skoda-vault-enable-button').click();
    await this.page.getByTestId('skoda-vault-new-password-input').fill(password);
    await this.page.getByTestId('skoda-vault-confirm-password-input').fill(password);
    await this.page.getByTestId('skoda-vault-turn-on-button').click();
    await expect(this.vaultStatus).toBeVisible();
  }

  async lockVault(): Promise<void> {
    await this.page.getByTestId('skoda-vault-lock-button').click();
  }

  /** Unlock from the input form */
  async unlock(password: string): Promise<void> {
    await this.page.getByTestId('skoda-unlock-password-input').fill(password);
    await this.page.getByTestId('skoda-unlock-button').click();
  }

  // ========== Sync ==========

  /** Read the sync code in Settings → Sync → Export */
  async getSyncCode(): Promise<string> {
    const codeTab = this.page.getByTestId('export-code-tab');
    // On mobile the code is behind a tab
    if (await codeTab.isVisible()) await codeTab.click();
    const output = this.page.getByTestId('sync-code-output');
    await expect(output).not.toHaveValue('');
    return output.inputValue();
  }

  /** Include the Škoda access in the export, and read the export code that unlocks it */
  async includeAccess(): Promise<string> {
    await this.includeAccessCheckbox.check();
    await expect(this.exportCode).not.toBeEmpty();
    return (await this.exportCode.textContent()) ?? '';
  }

  /**
   * Paste a sync code in Settings → Sync → Import and import everything.
   * With an export code, the Škoda access in the sync code is imported as well; otherwise it is skipped.
   */
  async importSyncCode(code: string, exportCode?: string): Promise<void> {
    await this.page.getByTestId('sync-import-tab').click();
    await this.page.getByTestId('sync-paste-input').fill(code);
    await this.page.getByTestId('sync-import-button').click();
    await this.page.getByTestId('import-preview-confirm-button').click();
    const accessDialog = this.page.getByTestId('skoda-access-import-dialog');
    if (exportCode !== undefined) {
      await accessDialog.getByTestId('skoda-import-export-code-input').fill(exportCode);
      await accessDialog.getByTestId('skoda-import-submit-button').click();
      await expect(accessDialog).not.toBeVisible();
    } else if (await accessDialog.isVisible()) {
      await accessDialog.getByTestId('skoda-import-skip-button').click();
    }
    await this.page.getByTestId('import-result-done-button').click();
  }
}
