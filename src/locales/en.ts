export const en = {
  translation: {
    // App
    appTitle: 'EV Charging Planner',
    logoAlt: 'EV Charging Logo',

    // Common
    common: {
      settings: 'Settings',
      done: 'Done',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      close: 'Close',
      loading: 'Loading...',
      refresh: 'Refresh',
      about: 'About',
      expandSettings: 'Expand settings',
      collapseSettings: 'Collapse settings',
    },

    // Input form
    input: {
      chargingSettings: 'Charging Settings',
      startPercent: 'Start %',
      endPercent: 'End %',
      batterySize: 'Battery Size (kWh)',
      chargingPower: 'Charging Power',
      earliestStart: 'Earliest Start',
      latestEnd: 'Latest End',
      setToNow: 'Set to now',
      showVehicleSettings: 'Show vehicle settings',
      hideVehicleSettings: 'Hide vehicle settings',
      vehicleSettingsSummary: '{{batterySize}} kWh · {{chargingSpeed}} kW',
    },

    // Results
    results: {
      chargingPlan: 'Charging Plan',
      noResult: 'No result to display.',
      start: 'Start',
      end: 'End',
      duration: 'Duration',
      energy: 'Energy',
      estCost: 'Est. Cost',
      spotPrice: 'Spot price {{area}}',
      energyBreakdown: 'Energy breakdown',
      toBattery: '{{amount}} kWh to battery',
      chargingLoss: '+{{percent}}% charging loss',
      fromGrid: '= {{amount}} kWh from grid',
      costBreakdown: 'Cost breakdown',
      spotPortion: 'Spot price: {{amount}} DKK',
      tariffsPortion: 'Tariffs: {{amount}} DKK',
      totalCost: '= {{amount}} DKK',
    },

    // Result errors
    errors: {
      enterParameters: 'Enter charging parameters to calculate.',
      notEnoughTime: 'Not enough time. Charging requires {{required}}, but only {{available}} available in the selected window.',
      noPriceData: 'No price data available for the selected time window.',
      windowTooShort: 'The time window is too short.',
      noPriceDataYet: 'No price data available yet. Prices for tomorrow are usually published around 13:00.',
      endGreaterThanStart: 'End percentage must be greater than start percentage.',
      positiveValues: 'Battery size and charging speed must be positive.',
      unableToCalculate: 'Unable to calculate optimal charging window.',
      incompleteData: 'No price data available for this time window. Prices are only available until {{time}}. Try selecting an earlier end time.',
      pricingUnavailable: 'Pricing data unavailable',
      pricingUnavailableDetail: 'Could not load prices for the selected product. Try selecting a different supplier or product.',
      openSettings: 'Open Settings',
      somethingWentWrong: 'Something went wrong',
      technicalDetails: 'Technical details',
      tryAgain: 'Try again',
    },

    // Warnings
    warnings: {
      partialData: 'Price data is only available until {{time}}. The charging window is constrained to this period.',
    },

    // Settings dialog
    settings: {
      title: 'Settings',
      tabs: {
        cars: 'Cars',
        electricity: 'Electricity',
        sync: 'Sync',
        app: 'App',
      },
      clearSettings: 'Clear Settings',
      language: {
        title: 'Language',
        english: 'English',
        danish: 'Dansk',
      },
      dataSource: {
        title: 'Data Source',
        live: 'Live data from Strømligning.dk',
        mock: 'Using mock data (development mode)',
      },
      cache: {
        title: 'Cache',
        description: 'Clear cached price data to fetch fresh prices',
        clearButton: 'Clear Price Cache',
        cleared: 'Cache cleared!',
      },
      defaults: {
        title: 'Default Time Window',
        earliestStart: 'Earliest Start',
        latestEnd: 'Latest End',
        now: 'Now',
        specificTime: 'Specific time',
        description: 'These defaults are used when the app opens',
      },
    },

    // Supplier section
    supplier: {
      title: 'Grid Operator (Netselskab)',
      placeholder: 'Enter postal code (e.g., 2100)',
      useMyLocation: 'Use my location',
      usingGps: 'Using GPS location',
      lookingUp: 'Looking up grid operators...',
      notFound: 'No grid operator found',
      notFoundForPostal: 'No grid operator found for postal code {{code}}',
      notFoundAtLocation: 'No grid operator found at your location',
      westDenmark: 'West Denmark',
      eastDenmark: 'East Denmark',
      invalidNumber: 'Enter a valid number',
      postalCodeRange: 'Danish postal codes are 1000-9999',
      geolocationNotSupported: 'Geolocation is not supported by your browser',
      locationDenied: 'Location access was denied',
      locationUnavailable: 'Location information is unavailable',
      locationTimeout: 'Location request timed out',
      unknownError: 'An unknown error occurred',
    },

    // Company section
    company: {
      title: 'Electricity Supplier (Elselskab)',
      loadingSuppliers: 'Loading suppliers...',
      searchPlaceholder: 'Search or select supplier',
      productCount_one: '{{count}} product',
      productCount_other: '{{count}} products',
    },

    // Aggregation section
    aggregation: {
      title: 'Advanced',
      useHourly: 'Use 1-hour aggregation',
      using: 'using',
      selectMethod: 'Select method',
      hourlyDescription: 'Aggregating to hourly using {{method}}',
      quarterHourDescription: 'Showing prices at original 15-minute resolution',
      methods: {
        mean: {
          label: 'Mean',
          description: 'Average of values in interval',
        },
        min: {
          label: 'Minimum',
          description: 'Lowest value in interval',
        },
        max: {
          label: 'Maximum',
          description: 'Highest value in interval',
        },
      },
    },

    // Cars
    cars: {
      noCarSaved: 'No car saved',
      addCar: 'Add Car',
      selectCar: 'Select car',
      carDetails: '{{name}} · {{batterySize}} kWh · {{maxPower}} kW',
      carName: 'Car name',
      editCar: 'Edit car',
      deleteCar: 'Delete car',
      saveCar: 'Save car',
      carCount_one: '{{count}} car',
      carCount_other: '{{count}} cars',
    },

    // Delete car dialog
    deleteCar: {
      title: 'Delete Car',
      confirmMessage: 'Are you sure you want to delete <strong>{{name}}</strong>?',
      warning: 'This action cannot be undone.',
    },

    // Time window
    time: {
      earliestStart: 'Earliest Start',
      latestEnd: 'Latest End',
      setToNow: 'Set to now',
      today: 'Today',
      tomorrow: 'Tomorrow',
    },

    // About dialog
    about: {
      about: 'About',
      title: 'About EV Charging Planner',
      description: 'A simple tool to help EV owners find the cheapest time to charge their electric vehicle based on hourly electricity prices.',
      builtWith: 'Built with',
      builtWithDescription: 'This entire project was built using',
      builtWithClaude: 'Claude',
      builtWithSuffix: ', Anthropic\'s AI assistant. Not a single line of code was written by a human.',
      dataSource: 'Data Source',
      dataSourceDescription: 'Electricity prices provided by',
      usingMockData: 'Using mock data',
      openSource: 'Open Source',
      openSourceDescription: 'This project is open source.',
      viewOnGitHub: 'View on GitHub',
      cache: 'Cache',
      clearPriceCache: 'Clear price cache',
      cacheCleared: 'Cache cleared!',
      madeWith: 'Made with',
      inDenmark: 'in Denmark',
      copyright: '© {{year}} Morten Holt',
    },

    // Price area toggle
    priceArea: {
      westDenmark: 'West Denmark',
      eastDenmark: 'East Denmark',
    },

    // Refresh button
    refreshButton: {
      lastUpdated: 'Last updated: {{time}}',
      refresh: 'Refresh prices',
    },

    // Pull to refresh
    pullToRefresh: {
      refreshing: 'Refreshing...',
      release: 'Release to refresh',
      pull: 'Pull to refresh',
    },

    // Price timeline
    priceTimeline: {
      dataProvidedBy: 'Data provided by Strømligning.',
      lessThan: '< {{price}}',
      range: '{{min}} - {{max}}',
      moreThan: '> {{price}}',
      unit: 'DKK/kWh',
    },

    // Selected hour detail
    selectedHour: {
      spotPrice: 'Spot price',
      supplier: 'Supplier',
      transmission: 'Transmission',
      distribution: 'Distribution',
      tax: 'Tax',
      oneHour: '1 hour',
      minutes: '{{minutes}} min',
      costFor: 'Cost for {{duration}} @ {{power}} kW: {{cost}} DKK',
      chargingPortion: 'Charging portion ({{minutes}} min): {{cost}} DKK',
      charging: 'Charging',
      chargingRange: 'Charging {{start}} - {{end}}',
    },

    // Sync panel
    sync: {
      export: 'Export',
      import: 'Import',
      noDataToExport: 'No data to export. Add a car or configure settings first.',
      generating: 'Generating...',
      includeElectricity: 'Include electricity settings',
      qrCode: 'QR Code',
      link: 'Link',
      code: 'Code',
      scanToImport: 'Scan to import {{summary}}',
      dataTooLarge: 'Data too large for URL. Use QR Code or Code instead.',
      copyLink: 'Copy Link',
      copied: 'Copied!',
      copyCode: 'Copy Code',
      shareLink: 'Share this link to import {{summary}}',
      pasteCode: 'Paste this code to import {{summary}}',
      paste: 'Paste',
      scanQr: 'Scan QR',
      pastePlaceholder: 'Paste a link or code here...',
      importButton: 'Import',
      parseError: 'Could not parse data. Make sure you copied the full code or link.',
    },

    // Import preview dialog
    importPreview: {
      title: 'Import Preview',
      carsFound: 'Cars ({{count}} found)',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      duplicate: 'Duplicate',
      importElectricity: 'Import electricity settings',
      gridOperator: 'Grid operator: {{name}} ({{area}})',
      companyProduct: 'Company: {{name}} - {{product}}',
      noDataFound: 'No data found to import.',
      importCount: 'Import ({{count}})',
    },

    // Import result dialog
    importResult: {
      title: 'Import Complete',
      addedCars_one: 'Added {{count}} car: {{names}}',
      addedCars_other: 'Added {{count}} cars: {{names}}',
      skippedDuplicates_one: 'Skipped {{count}} duplicate: {{names}}',
      skippedDuplicates_other: 'Skipped {{count}} duplicates: {{names}}',
      noCarsImported: 'No cars were imported.',
    },

    // QR Scanner
    qrScanner: {
      startCamera: 'Start Camera',
      scanInstructions: 'Point your camera at a QR code to import cars',
      stopCamera: 'Stop Camera',
      permissionDenied: 'Camera permission denied. Please allow camera access to scan QR codes.',
      noCamera: 'No camera found on this device.',
      cameraError: 'Camera error: {{error}}',
      failedToStart: 'Failed to start camera',
    },
  },
};
