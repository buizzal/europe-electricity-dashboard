const fs = require('fs');
const path = require('path');

// Country data with ISO codes and map coordinates
const COUNTRY_DATA = {
  'AUT': { name: 'Austria', iso2: 'AT' },
  'BEL': { name: 'Belgium', iso2: 'BE' },
  'BGR': { name: 'Bulgaria', iso2: 'BG' },
  'CHE': { name: 'Switzerland', iso2: 'CH' },
  'CZE': { name: 'Czechia', iso2: 'CZ' },
  'DEU': { name: 'Germany', iso2: 'DE' },
  'DNK': { name: 'Denmark', iso2: 'DK' },
  'ESP': { name: 'Spain', iso2: 'ES' },
  'EST': { name: 'Estonia', iso2: 'EE' },
  'FIN': { name: 'Finland', iso2: 'FI' },
  'FRA': { name: 'France', iso2: 'FR' },
  'GBR': { name: 'United Kingdom', iso2: 'GB' },
  'GRC': { name: 'Greece', iso2: 'GR' },
  'HRV': { name: 'Croatia', iso2: 'HR' },
  'HUN': { name: 'Hungary', iso2: 'HU' },
  'IRL': { name: 'Ireland', iso2: 'IE' },
  'ITA': { name: 'Italy', iso2: 'IT' },
  'LTU': { name: 'Lithuania', iso2: 'LT' },
  'LUX': { name: 'Luxembourg', iso2: 'LU' },
  'LVA': { name: 'Latvia', iso2: 'LV' },
  'MKD': { name: 'North Macedonia', iso2: 'MK' },
  'MNE': { name: 'Montenegro', iso2: 'ME' },
  'NLD': { name: 'Netherlands', iso2: 'NL' },
  'NOR': { name: 'Norway', iso2: 'NO' },
  'POL': { name: 'Poland', iso2: 'PL' },
  'PRT': { name: 'Portugal', iso2: 'PT' },
  'ROU': { name: 'Romania', iso2: 'RO' },
  'SRB': { name: 'Serbia', iso2: 'RS' },
  'SVK': { name: 'Slovakia', iso2: 'SK' },
  'SVN': { name: 'Slovenia', iso2: 'SI' },
  'SWE': { name: 'Sweden', iso2: 'SE' },
};

// Name to ISO3 mapping for price data
const NAME_TO_ISO3 = {
  'Austria': 'AUT',
  'Belgium': 'BEL',
  'Bulgaria': 'BGR',
  'Switzerland': 'CHE',
  'Czechia': 'CZE',
  'Germany': 'DEU',
  'Denmark': 'DNK',
  'Spain': 'ESP',
  'Estonia': 'EST',
  'Finland': 'FIN',
  'France': 'FRA',
  'United Kingdom': 'GBR',
  'Greece': 'GRC',
  'Croatia': 'HRV',
  'Hungary': 'HUN',
  'Ireland': 'IRL',
  'Italy': 'ITA',
  'Lithuania': 'LTU',
  'Luxembourg': 'LUX',
  'Latvia': 'LVA',
  'North Macedonia': 'MKD',
  'Montenegro': 'MNE',
  'Netherlands': 'NLD',
  'Norway': 'NOR',
  'Poland': 'POL',
  'Portugal': 'PRT',
  'Romania': 'ROU',
  'Serbia': 'SRB',
  'Slovakia': 'SVK',
  'Slovenia': 'SVN',
  'Sweden': 'SWE',
};

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim();
    });
    return obj;
  });
}

function processData() {
  console.log('Processing electricity data...');

  const uploadsDir = '/sessions/epic-charming-allen/mnt/uploads';
  const outputDir = '/sessions/epic-charming-allen/europe-electricity-dashboard/public/data';

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read price data
  console.log('Reading price data...');
  const priceContent = fs.readFileSync(path.join(uploadsDir, 'all_countries.csv'), 'utf-8');
  const priceData = parseCSV(priceContent);
  console.log(`Loaded ${priceData.length} price records`);

  // Read carbon intensity data
  console.log('Reading carbon intensity data...');
  const carbonContent = fs.readFileSync(path.join(uploadsDir, 'ECON-PowerCI_2015_2024.csv'), 'utf-8');
  const carbonData = parseCSV(carbonContent);
  console.log(`Loaded ${carbonData.length} carbon intensity records`);

  // Process and organize data by country
  const countryPrices = {};
  const countryCarbon = {};

  // Process price data - organize by country and date
  priceData.forEach(row => {
    const countryName = row['Country'];
    const iso3 = NAME_TO_ISO3[countryName];
    if (!iso3) return;

    if (!countryPrices[iso3]) {
      countryPrices[iso3] = {};
    }

    const datetime = row['Datetime (UTC)'];
    const price = parseFloat(row['Price (EUR/MWhe)']);

    if (!isNaN(price)) {
      countryPrices[iso3][datetime] = price;
    }
  });

  // Process carbon intensity data
  carbonData.forEach(row => {
    const iso3 = row['ISO'];
    if (!COUNTRY_DATA[iso3]) return;

    if (!countryCarbon[iso3]) {
      countryCarbon[iso3] = {};
    }

    // Convert date format from YYYY/M/D to YYYY-MM-DD
    const dateParts = row['Timestamp'].split('/');
    const date = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
    const value = parseFloat(row['Value']);

    if (!isNaN(value)) {
      countryCarbon[iso3][date] = value;
    }
  });

  // Get available countries (those with both price and carbon data)
  const availableCountries = Object.keys(COUNTRY_DATA).filter(
    iso3 => countryPrices[iso3] && countryCarbon[iso3]
  );

  console.log(`Available countries: ${availableCountries.length}`);

  // Create country metadata
  const countryMeta = {};
  availableCountries.forEach(iso3 => {
    const priceDates = Object.keys(countryPrices[iso3]).sort();
    const carbonDates = Object.keys(countryCarbon[iso3]).sort();

    countryMeta[iso3] = {
      ...COUNTRY_DATA[iso3],
      iso3,
      priceRange: {
        start: priceDates[0],
        end: priceDates[priceDates.length - 1],
        count: priceDates.length
      },
      carbonRange: {
        start: carbonDates[0],
        end: carbonDates[carbonDates.length - 1],
        count: carbonDates.length
      }
    };
  });

  // Save country metadata
  fs.writeFileSync(
    path.join(outputDir, 'countries.json'),
    JSON.stringify(countryMeta, null, 2)
  );
  console.log('Saved countries.json');

  // For each country, save recent data (last 30 days of hourly data)
  // and daily aggregates for the full period
  availableCountries.forEach(iso3 => {
    console.log(`Processing ${iso3}...`);

    // Get all hourly prices and sort
    const hourlyPrices = Object.entries(countryPrices[iso3])
      .map(([datetime, price]) => ({ datetime, price }))
      .sort((a, b) => a.datetime.localeCompare(b.datetime));

    // Get last 7 days of hourly data for detailed view
    const recentHourly = hourlyPrices.slice(-168); // 7 days * 24 hours

    // Get last 30 days for flexibility calculations
    const last30Days = hourlyPrices.slice(-720); // 30 days * 24 hours

    // Create daily aggregates for price data
    const dailyPrices = {};
    hourlyPrices.forEach(({ datetime, price }) => {
      const date = datetime.split(' ')[0];
      if (!dailyPrices[date]) {
        dailyPrices[date] = { sum: 0, count: 0, min: price, max: price };
      }
      dailyPrices[date].sum += price;
      dailyPrices[date].count++;
      dailyPrices[date].min = Math.min(dailyPrices[date].min, price);
      dailyPrices[date].max = Math.max(dailyPrices[date].max, price);
    });

    const dailyPriceArray = Object.entries(dailyPrices)
      .map(([date, data]) => ({
        date,
        avgPrice: Math.round((data.sum / data.count) * 100) / 100,
        minPrice: data.min,
        maxPrice: data.max
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Carbon intensity (already daily)
    const carbonArray = Object.entries(countryCarbon[iso3])
      .map(([date, value]) => ({ date, carbonIntensity: Math.round(value * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate flexibility value metrics for different time windows
    const flexibilityMetrics = calculateFlexibilityMetrics(last30Days);

    // Save country data
    const countryData = {
      iso3,
      name: COUNTRY_DATA[iso3].name,
      recentHourly,
      dailyPrices: dailyPriceArray.slice(-365), // Last year
      carbonIntensity: carbonArray.slice(-365), // Last year
      flexibilityMetrics,
      stats: {
        avgPrice: Math.round((hourlyPrices.reduce((s, p) => s + p.price, 0) / hourlyPrices.length) * 100) / 100,
        avgCarbon: Math.round((carbonArray.reduce((s, c) => s + c.carbonIntensity, 0) / carbonArray.length) * 100) / 100
      }
    };

    fs.writeFileSync(
      path.join(outputDir, `${iso3}.json`),
      JSON.stringify(countryData)
    );
  });

  // Create a summary file with recent stats for all countries
  const summary = {};
  availableCountries.forEach(iso3 => {
    const hourlyPrices = Object.entries(countryPrices[iso3])
      .map(([datetime, price]) => ({ datetime, price }))
      .sort((a, b) => a.datetime.localeCompare(b.datetime));

    const recentPrices = hourlyPrices.slice(-168); // Last 7 days
    const carbonValues = Object.values(countryCarbon[iso3]);
    const recentCarbon = carbonValues.slice(-7); // Last 7 days

    summary[iso3] = {
      name: COUNTRY_DATA[iso3].name,
      iso2: COUNTRY_DATA[iso3].iso2,
      currentPrice: recentPrices.length > 0 ? recentPrices[recentPrices.length - 1].price : null,
      avgPrice7d: recentPrices.length > 0
        ? Math.round((recentPrices.reduce((s, p) => s + p.price, 0) / recentPrices.length) * 100) / 100
        : null,
      avgCarbon7d: recentCarbon.length > 0
        ? Math.round((recentCarbon.reduce((s, v) => s + v, 0) / recentCarbon.length) * 100) / 100
        : null
    };
  });

  fs.writeFileSync(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  console.log('Saved summary.json');

  console.log('Data processing complete!');
}

function calculateFlexibilityMetrics(hourlyData) {
  if (hourlyData.length < 24) {
    return null;
  }

  const windows = [1, 2, 4, 8]; // Hours of flexibility
  const results = {};

  windows.forEach(window => {
    let totalSavings = 0;
    let possibleShifts = 0;

    // For each hour, calculate potential savings from shifting load
    for (let i = 0; i < hourlyData.length - window; i++) {
      const currentPrice = hourlyData[i].price;

      // Find minimum price within the flexibility window
      let minPrice = currentPrice;
      for (let j = 1; j <= window; j++) {
        if (i + j < hourlyData.length) {
          minPrice = Math.min(minPrice, hourlyData[i + j].price);
        }
      }

      // Also check backward
      for (let j = 1; j <= window; j++) {
        if (i - j >= 0) {
          minPrice = Math.min(minPrice, hourlyData[i - j].price);
        }
      }

      const savings = currentPrice - minPrice;
      if (savings > 0) {
        totalSavings += savings;
        possibleShifts++;
      }
    }

    const avgSavings = possibleShifts > 0 ? totalSavings / hourlyData.length : 0;

    results[`${window}h`] = {
      avgSavingsPerMWh: Math.round(avgSavings * 100) / 100,
      savingsPerGWh: Math.round(avgSavings * 1000), // EUR per GWh
      percentageOfAvgPrice: Math.round((avgSavings / (hourlyData.reduce((s, p) => s + p.price, 0) / hourlyData.length)) * 10000) / 100
    };
  });

  return results;
}

processData();
