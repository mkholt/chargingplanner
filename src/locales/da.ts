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
      supplierSurchargePortion: 'Leverandørtillæg: {{amount}} DKK',
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
      closeButton: 'Luk indstillinger',
      tabs: {
        cars: 'Biler',
        electricity: 'Elektricitet',
        sync: 'Synkronisering',
        app: 'App',
      },
      clearSettings: 'Ryd indstillinger',
      app: {
        title: 'App-indstillinger',
      },
      language: {
        title: 'Sprog',
        english: 'English',
        danish: 'Dansk',
      },
      dataSource: {
        title: 'Datakilde',
        live: 'Live data fra',
        mock: 'Bruger testdata (udviklingstilstand)',
      },
      cache: {
        title: 'Cache',
        description: 'Cachede prisdata opdateres automatisk.',
        lastSync: 'Sidst synkroniseret: {{time}}.',
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
      builtWith: 'Bygget med',
      builtWithDescription: 'Hele dette projekt er bygget med',
      builtWithClaude: 'Claude',
      builtWithSuffix: ', Anthropics AI-assistent. Ikke en eneste linje kode er skrevet af et menneske.',
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
      version: 'Version {{version}}',
      copyright: '© {{year}} Morten Holt',
    },

    // Price area toggle
    priceArea: {
      westDenmark: 'Vestdanmark',
      eastDenmark: 'Østdanmark',
    },


    // Pull to refresh
    pullToRefresh: {
      refreshing: 'Opdaterer priser...',
      release: 'Slip for at opdatere priser',
      pull: 'Træk for at opdatere priser',
    },

    // Price timeline
    priceTimeline: {
      dataProvidedBy: 'Data leveret af',
      lastUpdated: 'Opdateret {{time}}',
      lessThan: '< {{price}}',
      range: '{{min}} - {{max}}',
      moreThan: '> {{price}}',
      unit: 'DKK/kWh',
    },

    // Selected hour detail
    selectedHour: {
      spotPrice: 'Spotpris',
      supplierSurcharge: 'Leverandørtillæg',
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
      enlargeQr: 'Tryk for at forstørre QR-koden',
      tapToClose: 'Tryk hvor som helst for at lukke',
      dataTooLarge: 'Data for stor til URL. Brug QR-kode eller kode i stedet.',
      qrTooLarge: 'For meget data til en QR-kode. Brug linket eller koden i stedet.',
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
    // Škoda-proxy integration
    skoda: {
      settings: {
        title: 'Škoda-forbindelse',
        description: 'Hent din Škodas batteriniveau og ladegrænse gennem din egen Škoda-proxy, og brug dem som start og mål for opladningen.',
        enable: 'Brug Škoda-proxy',
        proxy: 'Proxy',
        testConnection: 'Test forbindelse',
        connectionOk: 'Forbundet til proxyen',
        connectionFailed: 'Kunne ikke nå proxyen',
      },
      vault: {
        title: 'Adgangskodebeskyttelse',
        description: 'Beskyt den Škoda-adgang, der er gemt i denne browser, med en adgangskode.',
        recommendation: 'Anbefales på en delt computer eller familiecomputer. Valgfrit på en personlig telefon med skærmlås, da enhedens lås allerede beskytter browseren.',
        enable: 'Beskyt Škoda-adgang med en adgangskode',
        password: 'Adgangskode',
        confirmPassword: 'Gentag adgangskode',
        currentPassword: 'Nuværende adgangskode',
        newPassword: 'Ny adgangskode',
        passwordTooShort: 'Brug mindst {{count}} tegn',
        passwordMismatch: 'Adgangskoderne er ikke ens',
        wrongPassword: 'Forkert adgangskode',
        turnOn: 'Slå til',
        turnOff: 'Slå beskyttelse fra',
        turnOffDescription: 'Indtast din adgangskode for at gemme Škoda-adgangen uden adgangskode igen.',
        statusLocked: 'Beskyttet · låst',
        statusUnlocked: 'Beskyttet · låst op',
        lock: 'Lås',
        unlock: 'Lås op',
        skip: 'Spring over',
        unlockPrompt: 'Indtast din adgangskode for at hente live-data for {{name}}.',
        unlockSettingsPrompt: 'Indtast din adgangskode for at låse Škoda-adgangen op.',
        autoLock: 'Lås automatisk efter',
        autoLockMinutes: '{{count}} minutters inaktivitet',
        autoLockNever: 'Kun når fanen lukkes',
        changePassword: 'Skift adgangskode',
        reset: 'Nulstil boks',
        resetDescription: 'Glemt din adgangskode? Nulstilling sletter den gemte Škoda-adgang. Dine biler bliver, og du forbinder dem igen med deres Škoda API-nøgler.',
        resetConfirm: 'Slet gemt Škoda-adgang',
      },
      link: {
        title: 'Škoda',
        vin: 'Stelnummer (VIN)',
        vinInvalid: 'Et stelnummer har 17 bogstaver og tal (ingen I, O eller Q)',
        apiKey: 'Škoda API-nøgle',
        apiKeyHint: 'Opret en nøgle til denne bil i MyŠkoda-appen. Den byttes til et adgangstoken og gemmes aldrig.',
        vaultPassword: 'Adgangskode til boksen',
        link: 'Forbind med Škoda',
        relink: 'Forbind igen',
        unlink: 'Fjern forbindelse',
        unlinkHint: 'Slet også API-nøglen i MyŠkoda-appen for at fjerne adgangen helt.',
        status: {
          linked: 'Forbundet · adgang til {{date}}',
          expiring: 'Adgangen udløber {{date}} · forbind snart igen med en ny nøgle',
          expired: 'Adgangen udløb {{date}} · forbind igen med en ny nøgle',
          locked: 'Forbundet · lås op for at hente data',
          relink: 'Adgangen virker ikke længere · forbind igen',
        },
        errors: {
          invalidApiKey: 'API-nøglen er ikke gyldig for dette stelnummer',
          keyRevoked: 'API-nøglen er tilbagekaldt. Opret en ny nøgle i MyŠkoda-appen.',
          vehicleAccessDenied: 'API-nøglen giver ikke adgang til denne bil',
          vehicleNotFound: 'Der blev ikke fundet en bil med dette stelnummer',
          upstreamUnavailable: 'Škoda svarer ikke lige nu. Prøv igen senere.',
          invalidRequest: 'Kontrollér stelnummer og API-nøgle',
          rateLimited: 'For mange forsøg. Prøv igen om et minut.',
          networkError: 'Kunne ikke nå Škoda-proxyen',
          generic: 'Forbindelsen mislykkedes ({{status}})',
        },
      },
      vehicle: {
        loading: 'Henter data fra din Škoda…',
        summary: 'Škoda: {{soc}} % · {{range}} km',
        summaryNoRange: 'Škoda: {{soc}} %',
        chargeLimit: 'Ladegrænse {{target}} %',
        error: 'Kunne ikke hente data fra din Škoda',
        relink: 'Škoda-adgangen virker ikke længere. Forbind bilen igen under indstillinger.',
        atChargeLimit: 'Din Škoda er allerede ladet op til sin ladegrænse.',
      },
      addCar: {
        title: 'Tilføj Škoda-bil',
        description: 'Tilføj en bil ud fra dens stelnummer og en Škoda API-nøgle. Bilen bliver forbundet med det samme.',
        lookUp: 'Find bil',
        checkDetails: 'Forbundet med {{vin}}. Škoda oplyser ikke batteristørrelse og ladeeffekt, så kontrollér dem, før du tilføjer bilen.',
      },
      sync: {
        includeAccess: 'Medtag Škoda-adgang',
        unlockToExport: 'Indtast din adgangskode for at medtage Škoda-adgangen.',
        sealing: 'Krypterer Škoda-adgang…',
        noAccessToExport: 'Der er ingen Škoda-adgang at medtage. Forbind bilerne igen først.',
        exportCode: 'Eksportkode',
        exportCodeWarning_one: 'Adgangen til {{count}} bil er krypteret med denne kode. Giv koden til modtageren separat, f.eks. ved at læse den op, aldrig sammen med QR-koden, linket eller koden. Alle med begge dele kan læse batteri- og ladedata, indtil adgangen udløber.',
        exportCodeWarning_other: 'Adgangen til {{count}} biler er krypteret med denne kode. Giv koden til modtageren separat, f.eks. ved at læse den op, aldrig sammen med QR-koden, linket eller koden. Alle med begge dele kan læse batteri- og ladedata, indtil adgangen udløber.',
        wrongExportCode: 'Forkert eksportkode',
        importTitle: 'Importér Škoda-adgang',
        importDescription: 'De importerede biler indeholder Škoda-adgang. Indtast eksportkoden, der vises på den enhed, de blev eksporteret fra.',
        localPassword: 'Adgangskode til boksen på denne enhed',
        importButton: 'Importér adgang',
      },
    },
  },
};
