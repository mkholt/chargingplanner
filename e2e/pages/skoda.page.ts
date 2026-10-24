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
  readonly proxyUrlInput: Locator;
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

  constructor(page: Page) {
    this.page = page;
    this.settings = page.getByTestId('skoda-settings');
    this.enableToggle = page.getByTestId('skoda-enable-toggle');
    this.proxyUrlInput = page.getByTestId('skoda-proxy-url-input');
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
  }

  /** Link status text on a car card in Settings → Cars */
  carLinkStatus(carName: string): Locator {
    return this.page.getByTestId(`car-card-${slugify(carName)}`).getByTestId('skoda-link-status');
  }

  // ========== Settings ==========

  async enableProxy(url: string): Promise<void> {
    await this.enableToggle.check();
    await this.proxyUrlInput.fill(url);
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

  /** Paste a sync code in Settings → Sync → Import and import everything */
  async importSyncCode(code: string): Promise<void> {
    await this.page.getByTestId('sync-import-tab').click();
    await this.page.getByTestId('sync-paste-input').fill(code);
    await this.page.getByTestId('sync-import-button').click();
    await this.page.getByTestId('import-preview-confirm-button').click();
    await this.page.getByTestId('import-result-done-button').click();
  }
}
