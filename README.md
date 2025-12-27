# EV Charging Planner

A React application that helps users find the cheapest time window to charge their electric vehicle based on hourly electricity prices from Danish energy suppliers.

## Features

- Calculate optimal charging windows based on real-time electricity prices
- Save and manage multiple car profiles (battery size, charging speed)
- GPS or postal code lookup for grid operator detection
- Searchable electricity supplier selection
- QR code and sync code sharing for car profiles
- PWA support for offline access

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and building
- **Fluent UI React** components
- **TanStack Query** for data fetching and caching
- **Vitest** for unit testing
- **Playwright** for E2E testing

## Development

```bash
npm install      # Install dependencies
npm run dev      # Start development server
npm run build    # Build for production (runs tests first)
npm run test     # Run unit tests
npm run test:e2e # Run E2E tests
npm run lint     # Run ESLint
```

## API

Price data is fetched from [stromligning.dk](https://stromligning.dk).

```bash
npm run codegen:api  # Regenerate API types from swagger
```

## License

MIT
