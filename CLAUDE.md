# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Start development server (Vite)
npm run build       # TypeScript check + production build
npm run lint        # Run ESLint
npm run preview     # Preview production build
npm run codegen:api # Generate API types from stromligning.dk swagger
```

## Architecture

This is an EV Charging Optimizer - a React + TypeScript + Vite application that helps users find the cheapest time window to charge their electric vehicle based on hourly electricity prices.

## Code style

Path aliases are enabled and must always be used. Always refer to a component or hook using the aliased names.

Example: `import { useCars } from "@/contexts"`

Folders are barelled, and imports must always be from the folder not the specific component. Components, contexts and utilities should always be added to their barrels.

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
