# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start development server (Vite)
npm run build         # TypeScript check + production build (runs lint & tests first)
npm run test          # Run unit tests (runs lint first via pretest)
npm run test:watch    # Run unit tests in watch mode (no linting)
npm run test:coverage # Run unit tests with coverage report
npm run test:e2e      # Run E2E tests (starts dev server automatically)
npm run test:e2e:ui   # Run E2E tests with Playwright UI
npm run test:e2e:headed # Run E2E tests in headed browser mode
npm run lint          # Run ESLint
npm run preview       # Preview production build
npm run codegen:api   # Generate API types from stromligning.dk swagger
npm run generate:icons # Generate PWA icons from SVG (requires sharp)
```

## Architecture

This is an EV Charging Planner - a React + TypeScript + Vite application that helps users find the cheapest time window to charge their electric vehicle based on hourly electricity prices.

## Code style

Path aliases are enabled and must always be used. Always refer to a component or hook using the aliased names.

Example: `import { useCars } from "@/contexts"`

Folders are barelled, and imports must always be from the folder not the specific component. Components, contexts and utilities should always be added to their barrels.

Do not be afraid to make breaking changes. Do not keep things for "backwards compatibility". If things are to be marked as deprecated during a refactoring or change, remove them afterwards and update all references.

## State Management Patterns

### localStorage Usage

The app uses different patterns for localStorage based on complexity:

| Pattern | Use Case | Examples |
|---------|----------|----------|
| `useLocalStorage` hook | Simple key-value, no validation | `DEFAULT_EARLIEST`, `DEFAULT_LATEST` |
| Context + manual localStorage | Cross-key validation, API sync, cascading | `CarsContext`, `PriceSettingsContext` |

**Why CarsContext doesn't use `useLocalStorage`:**
- Cross-key validation: `selectedCarId` must exist in cars list
- Conditional removeItem: null clears the key entirely, not sets to null
- Merge logic for importing cars with duplicate detection

**Why PriceSettingsContext doesn't use `useLocalStorage`:**
- API sync: persists fresh API data to localStorage cache
- Cascading clears: location change → clears supplier → clears company
- Default value merging for backwards compatibility with old data

### Core Components

- **App.tsx** - Main component that orchestrates the calculation flow. Takes user input, fetches price data, calls the optimizer, and displays results.
- **InputForm.tsx** - Collects charging parameters (start/end percentage, battery size, charging speed, time window). Auto-calculates on input change with 300ms debounce.
- **CarManager.tsx** - Manages saved car profiles (persisted to localStorage). Users can save battery size and charging speed per car.
- **Results.tsx** - Displays the optimal charging window and price visualization.
- **PriceChart.tsx** - Visualizes hourly electricity prices.

### Calculation Logic

- **chargingCalculator.ts** - `findOptimalChargingWindow()` finds the lowest-cost continuous charging window. Calculates energy needed from battery percentage, then uses sliding window to find minimum cost.
- **mockPrices.ts** - Generates mock data in stromligning.dk API format. Uses `priceMapper.ts` to convert to hourly price arrays.

### Tech Stack

- **UI Framework**: Fluent UI React Components (`@fluentui/react-components`)
- **State**: React useState with localStorage for car persistence
- **Styling**: Inline styles with Fluent UI tokens for theming (dark theme)

## Testing

Two testing frameworks are implemented, both using MSW (Mock Service Worker) for API mocking.

### MSW (Shared API Mocking)

Located in `src/test/mocks/`. Provides consistent mock API responses for both unit and E2E tests.

- `handlers.ts` - API request handlers (add new endpoints here)
- `server.ts` - Node.js server for unit tests (Vitest)
- `browser.ts` - Browser service worker for E2E tests (Playwright)

When `VITE_USE_MOCK_API=true`, the app starts the MSW service worker in `main.tsx`, intercepting all API calls.

### Unit Tests (Vitest + React Testing Library)

Located in `src/test/`. Uses Vitest with jsdom environment for component and utility testing.

**Structure:**
- `src/test/setup.ts` - Test setup with MSW server initialization
- `src/test/utils/` - Unit tests for utility functions
- `src/test/hooks/` - Tests for React hooks
- `src/test/contexts/` - Tests for React contexts

**Writing unit tests:**
- Place tests in `src/test/` mirroring the source structure
- Use `*.test.ts` or `*.test.tsx` extension
- Import from `@testing-library/react` for component testing

### E2E Tests (Playwright)

Located in `e2e/`. Uses Playwright for browser-based end-to-end testing.

**Structure:**
- `e2e/playwright.config.ts` - Playwright configuration (runs on port 5174 with mock API)
- `e2e/tests/` - Test spec files (`*.spec.ts`)
- `e2e/pages/` - Page Object Model classes for UI interaction
- `e2e/fixtures/` - Test fixtures and localStorage helpers

**Page Objects:**
- `app.page.ts` - Main app interactions
- `input-form.page.ts` - Input form interactions
- `results.page.ts` - Results section interactions
- `settings-dialog.page.ts` - Settings dialog interactions

**Writing E2E tests:**
- Place tests in `e2e/tests/` with `*.spec.ts` extension
- Use Page Object classes for UI interactions
- Use `data-testid` identifiers to locate input fields and buttons, if they are missing, add them to the component.
- Tests run in parallel on Chromium and Mobile Chrome by default
- There are no "Pre-existing issues" - tests should pass when adding or changing functionality - it is never okay to just ignore them without user approval