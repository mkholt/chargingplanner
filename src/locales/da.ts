export const da = {
  translation: {
    // App
    appTitle: 'EV Opladningsplanlægger',
    logoAlt: 'EV Opladningslogo',

    // Common
    common: {
      settings: 'Indstillinger',
      done: 'Færdig',
      cancel: 'Annuller',
      save: 'Gem',
      delete: 'Slet',
      close: 'Luk',
      loading: 'Indlæser...',
      refresh: 'Opdater',
      about: 'Om',
      expandSettings: 'Udvid indstillinger',
      collapseSettings: 'Skjul indstillinger',
    },

    // Input form
    input: {
      chargingSettings: 'Opladningsindstillinger',
      startPercent: 'Start %',
      endPercent: 'Slut %',
      batterySize: 'Batteristørrelse (kWh)',
      chargingPower: 'Ladeeffekt',
      earliestStart: 'Tidligste start',
      latestEnd: 'Seneste slut',
      setToNow: 'Sæt til nu',
      showVehicleSettings: 'Vis bilindstillinger',
      hideVehicleSettings: 'Skjul bilindstillinger',
      vehicleSettingsSummary: '{{batterySize}} kWh · {{chargingSpeed}} kW',
    },

    // Results
    results: {
      chargingPlan: 'Opladningsplan',
      noResult: 'Intet resultat at vise.',
      start: 'Start',
      end: 'Slut',
      duration: 'Varighed',
      energy: 'Energi',
      estCost: 'Est. pris',
      spotPrice: 'Spotpris {{area}}',
      energyBreakdown: 'Energiopdeling',
      toBattery: '{{amount}} kWh til batteri',
      chargingLoss: '+{{percent}}% ladetab',
      fromGrid: '= {{amount}} kWh fra nettet',
      costBreakdown: 'Prisopdeling',
      spotPortion: 'Spotpris: {{amount}} DKK',
      tariffsPortion: 'Tariffer: {{amount}} DKK',
      totalCost: '= {{amount}} DKK',
    },

    // Result errors
    errors: {
      enterParameters: 'Indtast opladningsparametre for at beregne.',
      notEnoughTime: 'Ikke nok tid. Opladning kræver {{required}}, men kun {{available}} tilgængelig i det valgte tidsrum.',
      noPriceData: 'Ingen prisdata tilgængelig for det valgte tidsrum.',
      windowTooShort: 'Tidsrummet er for kort.',
      noPriceDataYet: 'Ingen prisdata tilgængelig endnu. Priser for i morgen offentliggøres normalt omkring kl. 13:00.',
      endGreaterThanStart: 'Slutprocent skal være større end startprocent.',
      positiveValues: 'Batteristørrelse og ladeeffekt skal være positive.',
      unableToCalculate: 'Kan ikke beregne optimalt opladningsvindue.',
      incompleteData: 'Ingen prisdata tilgængelig for dette tidsrum. Priser er kun tilgængelige indtil {{time}}. Prøv at vælge et tidligere sluttidspunkt.',
      pricingUnavailable: 'Prisdata utilgængelig',
      pricingUnavailableDetail: 'Kunne ikke hente priser for det valgte produkt. Prøv at vælge en anden leverandør eller et andet produkt.',
      openSettings: 'Åbn indstillinger',
      somethingWentWrong: 'Noget gik galt',
      technicalDetails: 'Tekniske detaljer',
      tryAgain: 'Prøv igen',
    },

    // Warnings
    warnings: {
      partialData: 'Prisdata er kun tilgængelig indtil {{time}}. Opladningsvinduet er begrænset til denne periode.',
    },

    // Settings dialog
    settings: {
      title: 'Indstillinger',
      tabs: {
        cars: 'Biler',
        electricity: 'Elektricitet',
        sync: 'Synkronisering',
        app: 'App',
      },
      clearSettings: 'Ryd indstillinger',
      language: {
        title: 'Sprog',
        english: 'English',
        danish: 'Dansk',
      },
      dataSource: {
        title: 'Datakilde',
        live: 'Live data fra Strømligning.dk',
        mock: 'Bruger testdata (udviklingstilstand)',
      },
      cache: {
        title: 'Cache',
        description: 'Ryd cachede prisdata for at hente friske priser',
        clearButton: 'Ryd priscache',
        cleared: 'Cache ryddet!',
      },
      defaults: {
        title: 'Standard tidsvindue',
        earliestStart: 'Tidligste start',
        latestEnd: 'Seneste slut',
        now: 'Nu',
        specificTime: 'Bestemt tidspunkt',
        description: 'Disse standardværdier bruges når appen åbnes',
      },
    },

    // Supplier section
    supplier: {
      title: 'Netselskab',
      placeholder: 'Indtast postnummer (f.eks. 2100)',
      useMyLocation: 'Brug min placering',
      usingGps: 'Bruger GPS-placering',
      lookingUp: 'Søger efter netselskaber...',
      notFound: 'Intet netselskab fundet',
      notFoundForPostal: 'Intet netselskab fundet for postnummer {{code}}',
      notFoundAtLocation: 'Intet netselskab fundet ved din placering',
      westDenmark: 'Vestdanmark',
      eastDenmark: 'Østdanmark',
      invalidNumber: 'Indtast et gyldigt tal',
      postalCodeRange: 'Danske postnumre er 1000-9999',
      geolocationNotSupported: 'Geolokation understøttes ikke af din browser',
      locationDenied: 'Placeringsadgang blev nægtet',
      locationUnavailable: 'Placeringsinformation er ikke tilgængelig',
      locationTimeout: 'Placeringsanmodning fik timeout',
      unknownError: 'Der opstod en ukendt fejl',
    },

    // Company section
    company: {
      title: 'Elselskab',
      loadingSuppliers: 'Indlæser leverandører...',
      searchPlaceholder: 'Søg eller vælg leverandør',
      productCount_one: '{{count}} produkt',
      productCount_other: '{{count}} produkter',
    },

    // Aggregation section
    aggregation: {
      title: 'Avanceret',
      useHourly: 'Brug 1-times aggregering',
      using: 'med',
      selectMethod: 'Vælg metode',
      hourlyDescription: 'Aggregerer til timepriser med {{method}}',
      quarterHourDescription: 'Viser priser i original 15-minutters opløsning',
      methods: {
        mean: {
          label: 'Gennemsnit',
          description: 'Gennemsnit af værdier i interval',
        },
        min: {
          label: 'Minimum',
          description: 'Laveste værdi i interval',
        },
        max: {
          label: 'Maksimum',
          description: 'Højeste værdi i interval',
        },
      },
    },

    // Cars
    cars: {
      noCarSaved: 'Ingen bil gemt',
      addCar: 'Tilføj bil',
      selectCar: 'Vælg bil',
      carDetails: '{{name}} · {{batterySize}} kWh · {{maxPower}} kW',
      carName: 'Bilnavn',
      editCar: 'Rediger bil',
      deleteCar: 'Slet bil',
      saveCar: 'Gem bil',
      carCount_one: '{{count}} bil',
      carCount_other: '{{count}} biler',
    },

    // Delete car dialog
    deleteCar: {
      title: 'Slet bil',
      confirmMessage: 'Er du sikker på, at du vil slette <strong>{{name}}</strong>?',
      warning: 'Denne handling kan ikke fortrydes.',
    },

    // Time window
    time: {
      earliestStart: 'Tidligste start',
      latestEnd: 'Seneste slut',
      setToNow: 'Sæt til nu',
      today: 'I dag',
      tomorrow: 'I morgen',
    },

    // About dialog
    about: {
      about: 'Om',
      title: 'Om EV Opladningsplanlægger',
      description: 'Et simpelt værktøj til at hjælpe elbilsejere med at finde det billigste tidspunkt at oplade deres elbil baseret på timepriser på elektricitet.',
      dataSource: 'Datakilde',
      dataSourceDescription: 'Elpriser leveret af',
      usingMockData: 'Bruger testdata',
      openSource: 'Open Source',
      openSourceDescription: 'Dette projekt er open source.',
      viewOnGitHub: 'Se på GitHub',
      cache: 'Cache',
      clearPriceCache: 'Ryd priscache',
      cacheCleared: 'Cache ryddet!',
      madeWith: 'Lavet med',
      inDenmark: 'i Danmark',
      copyright: '© {{year}} Morten Holt',
    },

    // Price area toggle
    priceArea: {
      westDenmark: 'Vestdanmark',
      eastDenmark: 'Østdanmark',
    },

    // Refresh button
    refreshButton: {
      lastUpdated: 'Sidst opdateret: {{time}}',
      refresh: 'Opdater priser',
    },

    // Pull to refresh
    pullToRefresh: {
      refreshing: 'Opdaterer...',
      release: 'Slip for at opdatere',
      pull: 'Træk for at opdatere',
    },

    // Price timeline
    priceTimeline: {
      dataProvidedBy: 'Data leveret af Strømligning.',
      lessThan: '< {{price}}',
      range: '{{min}} - {{max}}',
      moreThan: '> {{price}}',
      unit: 'DKK/kWh',
    },

    // Selected hour detail
    selectedHour: {
      spotPrice: 'Spotpris',
      supplier: 'Leverandør',
      transmission: 'Transmission',
      distribution: 'Distribution',
      tax: 'Afgift',
      oneHour: '1 time',
      minutes: '{{minutes}} min',
      costFor: 'Pris for {{duration}} @ {{power}} kW: {{cost}} DKK',
      chargingPortion: 'Opladningsdel ({{minutes}} min): {{cost}} DKK',
      charging: 'Oplader',
      chargingRange: 'Oplader {{start}} - {{end}}',
    },

    // Sync panel
    sync: {
      export: 'Eksporter',
      import: 'Importer',
      noDataToExport: 'Ingen data at eksportere. Tilføj en bil eller konfigurer indstillinger først.',
      generating: 'Genererer...',
      includeElectricity: 'Inkluder elindstillinger',
      qrCode: 'QR-kode',
      link: 'Link',
      code: 'Kode',
      scanToImport: 'Scan for at importere {{summary}}',
      dataTooLarge: 'Data for stor til URL. Brug QR-kode eller kode i stedet.',
      copyLink: 'Kopier link',
      copied: 'Kopieret!',
      copyCode: 'Kopier kode',
      shareLink: 'Del dette link for at importere {{summary}}',
      pasteCode: 'Indsæt denne kode for at importere {{summary}}',
      paste: 'Indsæt',
      scanQr: 'Scan QR',
      pastePlaceholder: 'Indsæt et link eller en kode her...',
      importButton: 'Importer',
      parseError: 'Kunne ikke læse data. Sørg for at du har kopieret den fulde kode eller link.',
    },

    // Import preview dialog
    importPreview: {
      title: 'Importforhåndsvisning',
      carsFound: 'Biler ({{count}} fundet)',
      selectAll: 'Vælg alle',
      deselectAll: 'Fravælg alle',
      duplicate: 'Duplikat',
      importElectricity: 'Importer elindstillinger',
      gridOperator: 'Netselskab: {{name}} ({{area}})',
      companyProduct: 'Selskab: {{name}} - {{product}}',
      noDataFound: 'Ingen data fundet at importere.',
      importCount: 'Importer ({{count}})',
    },

    // Import result dialog
    importResult: {
      title: 'Import fuldført',
      addedCars_one: 'Tilføjede {{count}} bil: {{names}}',
      addedCars_other: 'Tilføjede {{count}} biler: {{names}}',
      skippedDuplicates_one: 'Sprunget {{count}} duplikat over: {{names}}',
      skippedDuplicates_other: 'Sprunget {{count}} duplikater over: {{names}}',
      noCarsImported: 'Ingen biler blev importeret.',
    },

    // QR Scanner
    qrScanner: {
      startCamera: 'Start kamera',
      scanInstructions: 'Peg dit kamera mod en QR-kode for at importere biler',
      stopCamera: 'Stop kamera',
      permissionDenied: 'Kameratilladelse nægtet. Tillad kameraadgang for at scanne QR-koder.',
      noCamera: 'Intet kamera fundet på denne enhed.',
      cameraError: 'Kamerafejl: {{error}}',
      failedToStart: 'Kunne ikke starte kamera',
    },
  },
};
