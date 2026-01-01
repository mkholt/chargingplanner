import { test, expect } from '../fixtures/test-fixtures';
import { seedDefaultEarliest, seedDefaultLatest } from '../fixtures/localStorage';

test.describe('App Settings', () => {
  test.describe('Data Source', () => {
    test('shows mock data badge when using mock API', async ({
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // E2E tests run with mock API, so badge should be visible
      const isMockBadgeVisible = await settingsDialogPage.isMockDataBadgeVisible();
      expect(isMockBadgeVisible).toBe(true);
    });
  });

  test.describe('Cache', () => {
    test('can clear price cache', async ({
      page,
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();
      await settingsDialogPage.switchToAppTab();

      // Check initial button state
      const initialText = await settingsDialogPage.getClearCacheButtonText();
      expect(initialText).toContain('Clear');

      // Click the clear cache button
      await settingsDialogPage.clickClearCacheButton();

      // Button should show "Cache cleared!" and be disabled temporarily
      await expect(page.getByTestId('clear-cache-button')).toBeDisabled();
      const clearedText = await settingsDialogPage.getClearCacheButtonText();
      expect(clearedText).toContain('cleared');

      // Wait for button to re-enable (after 2 seconds)
      await expect(page.getByTestId('clear-cache-button')).toBeEnabled({ timeout: 3000 });
    });
  });

  test.describe('Default Time Window', () => {
    test('earliest start defaults to "Now" mode', async ({
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Toggle should be checked (Now mode)
      const isNowChecked = await settingsDialogPage.isEarliestNowToggleChecked();
      expect(isNowChecked).toBe(true);

      // Time input should be disabled when Now is selected
      const isTimeDisabled = await settingsDialogPage.isEarliestTimeInputDisabled();
      expect(isTimeDisabled).toBe(true);
    });

    test('can switch earliest start to specific time mode', async ({
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Initially in Now mode
      expect(await settingsDialogPage.isEarliestNowToggleChecked()).toBe(true);
      expect(await settingsDialogPage.isEarliestTimeInputDisabled()).toBe(true);

      // Toggle off Now mode
      await settingsDialogPage.toggleEarliestNow();

      // Now the toggle should be unchecked and time input enabled
      expect(await settingsDialogPage.isEarliestNowToggleChecked()).toBe(false);
      expect(await settingsDialogPage.isEarliestTimeInputDisabled()).toBe(false);
    });

    test('can set specific earliest time', async ({
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Switch to specific time mode
      await settingsDialogPage.toggleEarliestNow();
      expect(await settingsDialogPage.isEarliestTimeInputDisabled()).toBe(false);

      // Set a specific time
      await settingsDialogPage.setEarliestTime('09:30');

      // Verify the value was set
      const timeValue = await settingsDialogPage.getEarliestTimeValue();
      expect(timeValue).toBe('09:30');
    });

    test('can set latest end time', async ({
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Set latest time
      await settingsDialogPage.setLatestTime('22:00');

      // Verify the value was set
      const timeValue = await settingsDialogPage.getLatestTimeValue();
      expect(timeValue).toBe('22:00');
    });

    test('respects seeded earliest specific time preference', async ({
      page,
      appPage,
      settingsDialogPage,
    }) => {
      // Seed a specific earliest time before navigating
      await seedDefaultEarliest(page, '10:15');

      await appPage.goto();
      await appPage.openSettings();

      // Toggle should be unchecked (specific time mode)
      expect(await settingsDialogPage.isEarliestNowToggleChecked()).toBe(false);

      // Time input should be enabled and show the seeded value
      expect(await settingsDialogPage.isEarliestTimeInputDisabled()).toBe(false);
      const timeValue = await settingsDialogPage.getEarliestTimeValue();
      expect(timeValue).toBe('10:15');
    });

    test('respects seeded latest time preference', async ({
      page,
      appPage,
      settingsDialogPage,
    }) => {
      // Seed a specific latest time before navigating
      await seedDefaultLatest(page, '23:45');

      await appPage.goto();
      await appPage.openSettings();

      // Latest time input should show the seeded value
      const timeValue = await settingsDialogPage.getLatestTimeValue();
      expect(timeValue).toBe('23:45');
    });

    test('time window settings persist after closing and reopening settings', async ({
      page,
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Set specific earliest time
      await settingsDialogPage.toggleEarliestNow();
      await settingsDialogPage.setEarliestTime('08:30');

      // Set latest time
      await settingsDialogPage.setLatestTime('20:00');

      // Close settings
      await settingsDialogPage.close();

      // Reopen settings
      await appPage.openSettings();

      // Verify the values persisted
      expect(await settingsDialogPage.isEarliestNowToggleChecked()).toBe(false);
      expect(await settingsDialogPage.getEarliestTimeValue()).toBe('08:30');
      expect(await settingsDialogPage.getLatestTimeValue()).toBe('20:00');
    });

    test('time window settings persist after page reload', async ({
      page,
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Set specific earliest time
      await settingsDialogPage.toggleEarliestNow();
      await settingsDialogPage.setEarliestTime('06:45');

      // Set latest time
      await settingsDialogPage.setLatestTime('18:30');

      // Close settings and reload
      await settingsDialogPage.close();
      await page.reload();
      await appPage.waitForReady();

      // Reopen settings
      await appPage.openSettings();

      // Verify the values persisted
      expect(await settingsDialogPage.isEarliestNowToggleChecked()).toBe(false);
      expect(await settingsDialogPage.getEarliestTimeValue()).toBe('06:45');
      expect(await settingsDialogPage.getLatestTimeValue()).toBe('18:30');
    });

    test('switching back to Now mode re-disables time input', async ({
      appPage,
      settingsDialogPage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Switch to specific time mode
      await settingsDialogPage.toggleEarliestNow();
      expect(await settingsDialogPage.isEarliestTimeInputDisabled()).toBe(false);

      // Set a time
      await settingsDialogPage.setEarliestTime('11:00');

      // Switch back to Now mode
      await settingsDialogPage.toggleEarliestNow();

      // Time input should be disabled again
      expect(await settingsDialogPage.isEarliestNowToggleChecked()).toBe(true);
      expect(await settingsDialogPage.isEarliestTimeInputDisabled()).toBe(true);
    });
  });
});
