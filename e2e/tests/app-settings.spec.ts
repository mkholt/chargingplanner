import { test, expect } from '../fixtures/test-fixtures';
import { seedDefaultEarliest, seedDefaultLatest } from '../fixtures/localStorage';

test.describe('App Settings', () => {
  test.describe('Data Source', () => {
    test('shows mock data badge when using mock API', async ({
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // E2E tests run with mock API, so badge should be visible
      const isMockBadgeVisible = await settingsPanePage.isMockDataBadgeVisible();
      expect(isMockBadgeVisible).toBe(true);
    });
  });

  test.describe('Cache', () => {
    test('can clear price cache', async ({
      page,
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();
      await settingsPanePage.switchToAppTab();

      // Check initial button state
      const initialText = await settingsPanePage.getClearCacheButtonText();
      expect(initialText).toContain('Clear');

      // Click the clear cache button
      await settingsPanePage.clickClearCacheButton();

      // Button should show "Cache cleared!" and be disabled temporarily
      await expect(page.getByTestId('clear-cache-button')).toBeDisabled();
      const clearedText = await settingsPanePage.getClearCacheButtonText();
      expect(clearedText).toContain('cleared');

      // Wait for button to re-enable (after 2 seconds)
      await expect(page.getByTestId('clear-cache-button')).toBeEnabled({ timeout: 3000 });
    });
  });

  test.describe('Default Time Window', () => {
    test('earliest start defaults to "Now" mode', async ({
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Toggle should be checked (Now mode)
      const isNowChecked = await settingsPanePage.isEarliestNowToggleChecked();
      expect(isNowChecked).toBe(true);

      // Time input should be disabled when Now is selected
      const isTimeDisabled = await settingsPanePage.isEarliestTimeInputDisabled();
      expect(isTimeDisabled).toBe(true);
    });

    test('can switch earliest start to specific time mode', async ({
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Initially in Now mode
      expect(await settingsPanePage.isEarliestNowToggleChecked()).toBe(true);
      expect(await settingsPanePage.isEarliestTimeInputDisabled()).toBe(true);

      // Toggle off Now mode
      await settingsPanePage.toggleEarliestNow();

      // Now the toggle should be unchecked and time input enabled
      expect(await settingsPanePage.isEarliestNowToggleChecked()).toBe(false);
      expect(await settingsPanePage.isEarliestTimeInputDisabled()).toBe(false);
    });

    test('can set specific earliest time', async ({
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Switch to specific time mode
      await settingsPanePage.toggleEarliestNow();
      expect(await settingsPanePage.isEarliestTimeInputDisabled()).toBe(false);

      // Set a specific time
      await settingsPanePage.setEarliestTime('09:30');

      // Verify the value was set
      const timeValue = await settingsPanePage.getEarliestTimeValue();
      expect(timeValue).toBe('09:30');
    });

    test('can set latest end time', async ({
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Set latest time
      await settingsPanePage.setLatestTime('22:00');

      // Verify the value was set
      const timeValue = await settingsPanePage.getLatestTimeValue();
      expect(timeValue).toBe('22:00');
    });

    test('respects seeded earliest specific time preference', async ({
      page,
      appPage,
      settingsPanePage,
    }) => {
      // Seed a specific earliest time before navigating
      await seedDefaultEarliest(page, '10:15');

      await appPage.goto();
      await appPage.openSettings();

      // Toggle should be unchecked (specific time mode)
      expect(await settingsPanePage.isEarliestNowToggleChecked()).toBe(false);

      // Time input should be enabled and show the seeded value
      expect(await settingsPanePage.isEarliestTimeInputDisabled()).toBe(false);
      const timeValue = await settingsPanePage.getEarliestTimeValue();
      expect(timeValue).toBe('10:15');
    });

    test('respects seeded latest time preference', async ({
      page,
      appPage,
      settingsPanePage,
    }) => {
      // Seed a specific latest time before navigating
      await seedDefaultLatest(page, '23:45');

      await appPage.goto();
      await appPage.openSettings();

      // Latest time input should show the seeded value
      const timeValue = await settingsPanePage.getLatestTimeValue();
      expect(timeValue).toBe('23:45');
    });

    test('time window settings persist after closing and reopening settings', async ({
      page,
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Set specific earliest time
      await settingsPanePage.toggleEarliestNow();
      await settingsPanePage.setEarliestTime('08:30');

      // Set latest time
      await settingsPanePage.setLatestTime('20:00');

      // Close settings
      await settingsPanePage.close();

      // Reopen settings
      await appPage.openSettings();

      // Verify the values persisted
      expect(await settingsPanePage.isEarliestNowToggleChecked()).toBe(false);
      expect(await settingsPanePage.getEarliestTimeValue()).toBe('08:30');
      expect(await settingsPanePage.getLatestTimeValue()).toBe('20:00');
    });

    test('time window settings persist after page reload', async ({
      page,
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Set specific earliest time
      await settingsPanePage.toggleEarliestNow();
      await settingsPanePage.setEarliestTime('06:45');

      // Set latest time
      await settingsPanePage.setLatestTime('18:30');

      // Close settings and reload
      await settingsPanePage.close();
      await page.reload();
      await appPage.waitForReady();

      // Reopen settings
      await appPage.openSettings();

      // Verify the values persisted
      expect(await settingsPanePage.isEarliestNowToggleChecked()).toBe(false);
      expect(await settingsPanePage.getEarliestTimeValue()).toBe('06:45');
      expect(await settingsPanePage.getLatestTimeValue()).toBe('18:30');
    });

    test('switching back to Now mode re-disables time input', async ({
      appPage,
      settingsPanePage,
    }) => {
      await appPage.goto();
      await appPage.openSettings();

      // Switch to specific time mode
      await settingsPanePage.toggleEarliestNow();
      expect(await settingsPanePage.isEarliestTimeInputDisabled()).toBe(false);

      // Set a time
      await settingsPanePage.setEarliestTime('11:00');

      // Switch back to Now mode
      await settingsPanePage.toggleEarliestNow();

      // Time input should be disabled again
      expect(await settingsPanePage.isEarliestNowToggleChecked()).toBe(true);
      expect(await settingsPanePage.isEarliestTimeInputDisabled()).toBe(true);
    });
  });
});
