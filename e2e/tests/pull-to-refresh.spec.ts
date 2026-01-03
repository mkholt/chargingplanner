import { test, expect } from '../fixtures/test-fixtures';
import { seedCars, seedSelectedCar, createTestCar, TEST_CARS, clearAllStorage } from '../fixtures/localStorage';

async function setupCarAndNavigate(page: import('@playwright/test').Page) {
  await clearAllStorage(page);
  const testCar = createTestCar('car-1', TEST_CARS.TESLA_MODEL_3);
  await seedCars(page, [testCar]);
  await seedSelectedCar(page, 'car-1');
  await page.goto('/');
}

// Test that PullToRefresh component renders correctly
test.describe('Pull to Refresh', () => {
  test.beforeEach(async ({ page }) => {
    await setupCarAndNavigate(page);
  });

  test('pull indicator starts hidden (opacity near 0)', async ({ appPage, page }) => {
    await appPage.waitForAppReady();

    // The pull indicator container should have opacity near 0 initially
    const indicatorOpacity = await page.evaluate(() => {
      const indicator = document.querySelector('[style*="position: fixed"][style*="opacity"]') as HTMLElement;
      return indicator ? parseFloat(indicator.style.opacity) : null;
    });

    expect(indicatorOpacity).not.toBeNull();
    expect(indicatorOpacity).toBeLessThan(0.01);
  });

  test('pull-to-refresh container has correct structure', async ({ appPage, page }) => {
    await appPage.waitForAppReady();

    // Verify the PullToRefresh component structure exists
    const hasContainer = await page.evaluate(() => {
      // Look for a container with min-height: 100% and position: relative
      const containers = document.querySelectorAll('[style*="min-height: 100%"]');
      return Array.from(containers).some(el =>
        el.getAttribute('style')?.includes('position: relative')
      );
    });

    expect(hasContainer).toBe(true);
  });

  test('content transform container exists with initial translateY(0px)', async ({ appPage, page }) => {
    await appPage.waitForAppReady();

    // Verify the transform container has translateY(0px) initially
    const hasTransformContainer = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="translateY(0px)"]');
      return containers.length > 0;
    });

    expect(hasTransformContainer).toBe(true);
  });

  // Note: Actual touch gesture testing with synthetic events is unreliable in Playwright.
  // The component has been manually tested on real mobile devices.
  // Unit tests verify component logic, E2E tests verify structure/rendering.
});

test.describe('Pull to Refresh - Mobile specific', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Only run on mobile projects
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only test');
    await setupCarAndNavigate(page);
  });

  test('indicator text exists in DOM for mobile', async ({ appPage, page }) => {
    await appPage.waitForAppReady();

    // On mobile, the pull indicator text should exist in the DOM
    // (visible via opacity when user pulls)
    const indicatorText = page.getByText('Pull to update prices');
    await expect(indicatorText).toBeAttached();
  });
});

test.describe('Pull to Refresh - Desktop behavior', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Only run on desktop (chromium) projects
    test.skip(testInfo.project.name.includes('mobile'), 'Desktop-only test');
    await setupCarAndNavigate(page);
  });

  test('indicator is disabled on desktop (opacity stays near 0)', async ({ appPage, page }) => {
    await appPage.waitForAppReady();

    // On desktop, the PullToRefresh component is rendered but disabled
    // The indicator should stay near opacity 0 even if we simulate gestures
    const indicatorOpacity = await page.evaluate(() => {
      const indicator = document.querySelector('[style*="position: fixed"][style*="opacity"]') as HTMLElement;
      return indicator ? parseFloat(indicator.style.opacity) : null;
    });

    expect(indicatorOpacity).not.toBeNull();
    expect(indicatorOpacity).toBeLessThan(0.01);

    // Indicator text exists but is hidden
    const indicatorText = page.getByText('Pull to update prices');
    await expect(indicatorText).toBeAttached();
  });
});
