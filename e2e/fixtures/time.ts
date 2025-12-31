import { Page } from '@playwright/test';

/**
 * Fixed time for E2E tests to avoid flakiness near midnight.
 * Set to 10:00 AM on January 15, 2025 - a safe time that won't cross midnight boundaries.
 */
export const FIXED_TEST_TIME = new Date(2025, 0, 15, 10, 0, 0, 0);

/**
 * Freeze time in the browser context using Playwright's Clock API.
 * Must be called BEFORE navigating to the page (before page.goto).
 *
 * This sets `Date.now()` and `new Date()` to return the fixed time,
 * while allowing timers to continue functioning normally.
 *
 * Since MSW handlers run in the browser context, they will also use the frozen Date
 * when calling `new Date()`, ensuring consistent mock data generation.
 */
export async function freezeTime(page: Page, fixedTime: Date = FIXED_TEST_TIME): Promise<void> {
  await page.clock.setFixedTime(fixedTime);
}
