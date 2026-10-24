import { test, expect } from '../fixtures/test-fixtures';
import { clearAllStorage } from '../fixtures/localStorage';

test.describe('About', () => {
  test('shows the installed version', async ({ appPage, page }) => {
    await clearAllStorage(page);
    await page.goto('/');
    await appPage.waitForAppReady();

    await page.getByTestId('about-button').click();

    await expect(page.getByTestId('app-version')).toHaveText(/^Version \d+\.\d+\.\d+/);
  });
});
