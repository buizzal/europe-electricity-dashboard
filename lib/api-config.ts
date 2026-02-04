// API Configuration and Zone Mappings

// Electricity Maps zone codes for European countries
export const ELECTRICITY_MAPS_ZONES: { [iso3: string]: string } = {
  'AUT': 'AT',
  'BEL': 'BE',
  'BGR': 'BG',
  'CHE': 'CH',
  'CZE': 'CZ',
  'DEU': 'DE',
  'DNK': 'DK-DK1', // Denmark has multiple zones
  'ESP': 'ES',
  'EST': 'EE',
  'FIN': 'FI',
  'FRA': 'FR',
  'GBR': 'GB',
  'GRC': 'GR',
  'HRV': 'HR',
  'HUN': 'HU',
  'IRL': 'IE',
  'ITA': 'IT-NO', // Italy North
  'LTU': 'LT',
  'LUX': 'LU',
  'LVA': 'LV',
  'MKD': 'MK',
  'MNE': 'ME',
  'NLD': 'NL',
  'NOR': 'NO-NO1', // Norway has multiple zones
  'POL': 'PL',
  'PRT': 'PT',
  'ROU': 'RO',
  'SRB': 'RS',
  'SVK': 'SK',
  'SVN': 'SI',
  'SWE': 'SE-SE1', // Sweden has multiple zones
}

// ENTSO-E area codes for European countries
export const ENTSOE_AREAS: { [iso3: string]: string } = {
  'AUT': '10YAT-APG------L',
  'BEL': '10YBE----------2',
  'BGR': '10YCA-BULGARIA-R',
  'CHE': '10YCH-SWISSGRIDZ',
  'CZE': '10YCZ-CEPS-----N',
  'DEU': '10Y1001A1001A83F',
  'DNK': '10Y1001A1001A65H',
  'ESP': '10YES-REE------0',
  'EST': '10Y1001A1001A39I',
  'FIN': '10YFI-1--------U',
  'FRA': '10YFR-RTE------C',
  'GBR': '10YGB----------A',
  'GRC': '10YGR-HTSO-----Y',
  'HRV': '10YHR-HEP------M',
  'HUN': '10YHU-MAVIR----U',
  'IRL': '10Y1001A1001A59C',
  'ITA': '10YIT-GRTN-----B',
  'LTU': '10YLT-1001A0008Q',
  'LUX': '10YLU-CEGEDEL-NQ',
  'LVA': '10YLV-1001A00074',
  'NLD': '10YNL----------L',
  'NOR': '10YNO-0--------C',
  'POL': '10YPL-AREA-----S',
  'PRT': '10YPT-REN------W',
  'ROU': '10YRO-TEL------P',
  'SVK': '10YSK-SEPS-----K',
  'SVN': '10YSI-ELES-----O',
  'SWE': '10YSE-1--------K',
}

// Country metadata with coordinates for the map
export const COUNTRY_METADATA: { [iso3: string]: {
  name: string
  iso2: string
  lat: number
  lng: number
}} = {
  'AUT': { name: 'Austria', iso2: 'AT', lat: 47.5, lng: 14.5 },
  'BEL': { name: 'Belgium', iso2: 'BE', lat: 50.5, lng: 4.5 },
  'BGR': { name: 'Bulgaria', iso2: 'BG', lat: 42.7, lng: 25.5 },
  'CHE': { name: 'Switzerland', iso2: 'CH', lat: 46.8, lng: 8.2 },
  'CZE': { name: 'Czechia', iso2: 'CZ', lat: 49.8, lng: 15.5 },
  'DEU': { name: 'Germany', iso2: 'DE', lat: 51.2, lng: 10.5 },
  'DNK': { name: 'Denmark', iso2: 'DK', lat: 56.3, lng: 9.5 },
  'ESP': { name: 'Spain', iso2: 'ES', lat: 40.5, lng: -3.7 },
  'EST': { name: 'Estonia', iso2: 'EE', lat: 58.6, lng: 25.0 },
  'FIN': { name: 'Finland', iso2: 'FI', lat: 61.9, lng: 25.7 },
  'FRA': { name: 'France', iso2: 'FR', lat: 46.2, lng: 2.2 },
  'GBR': { name: 'United Kingdom', iso2: 'GB', lat: 55.4, lng: -3.4 },
  'GRC': { name: 'Greece', iso2: 'GR', lat: 39.1, lng: 21.8 },
  'HRV': { name: 'Croatia', iso2: 'HR', lat: 45.1, lng: 15.2 },
  'HUN': { name: 'Hungary', iso2: 'HU', lat: 47.2, lng: 19.5 },
  'IRL': { name: 'Ireland', iso2: 'IE', lat: 53.1, lng: -8.0 },
  'ITA': { name: 'Italy', iso2: 'IT', lat: 41.9, lng: 12.6 },
  'LTU': { name: 'Lithuania', iso2: 'LT', lat: 55.2, lng: 23.9 },
  'LUX': { name: 'Luxembourg', iso2: 'LU', lat: 49.8, lng: 6.1 },
  'LVA': { name: 'Latvia', iso2: 'LV', lat: 56.9, lng: 24.6 },
  'MKD': { name: 'North Macedonia', iso2: 'MK', lat: 41.5, lng: 21.7 },
  'MNE': { name: 'Montenegro', iso2: 'ME', lat: 42.7, lng: 19.4 },
  'NLD': { name: 'Netherlands', iso2: 'NL', lat: 52.1, lng: 5.3 },
  'NOR': { name: 'Norway', iso2: 'NO', lat: 60.5, lng: 8.5 },
  'POL': { name: 'Poland', iso2: 'PL', lat: 51.9, lng: 19.1 },
  'PRT': { name: 'Portugal', iso2: 'PT', lat: 39.4, lng: -8.2 },
  'ROU': { name: 'Romania', iso2: 'RO', lat: 45.9, lng: 25.0 },
  'SRB': { name: 'Serbia', iso2: 'RS', lat: 44.0, lng: 21.0 },
  'SVK': { name: 'Slovakia', iso2: 'SK', lat: 48.7, lng: 19.7 },
  'SVN': { name: 'Slovenia', iso2: 'SI', lat: 46.2, lng: 14.9 },
  'SWE': { name: 'Sweden', iso2: 'SE', lat: 60.1, lng: 18.6 },
}
