import { NextRequest, NextResponse } from 'next/server'

// ENTSO-E Transparency Platform API
// Documentation: https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html
const ENTSOE_API = 'https://web-api.tp.entsoe.eu/api'

// ENTSO-E area codes (EIC codes) for European bidding zones
const ENTSOE_AREAS: { [iso3: string]: string } = {
  'AUT': '10YAT-APG------L',
  'BEL': '10YBE----------2',
  'BGR': '10YCA-BULGARIA-R',
  'CHE': '10YCH-SWISSGRIDZ',
  'CZE': '10YCZ-CEPS-----N',
  'DEU': '10Y1001A1001A83F', // Germany-Luxembourg
  'DNK': '10Y1001A1001A65H', // Denmark
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

// Parse ENTSO-E XML response for day-ahead prices
function parseENTSOEPrices(xml: string): Array<{ datetime: string; price: number }> {
  const prices: Array<{ datetime: string; price: number }> = []

  // Extract time series points using regex (simpler than XML parser for this case)
  const periodMatch = xml.match(/<Period>([\s\S]*?)<\/Period>/g)

  if (!periodMatch) return prices

  for (const period of periodMatch) {
    // Extract the start time
    const startMatch = period.match(/<start>(.*?)<\/start>/)
    if (!startMatch) continue

    const startTime = new Date(startMatch[1])

    // Extract resolution (usually PT60M for hourly)
    const resolutionMatch = period.match(/<resolution>(.*?)<\/resolution>/)
    const resolution = resolutionMatch ? resolutionMatch[1] : 'PT60M'
    const minutesPerPeriod = resolution === 'PT15M' ? 15 : 60

    // Extract all price points
    const pointRegex = /<Point>[\s\S]*?<position>(\d+)<\/position>[\s\S]*?<price\.amount>([\d.]+)<\/price\.amount>[\s\S]*?<\/Point>/g
    let match: RegExpExecArray | null

    while ((match = pointRegex.exec(period)) !== null) {
      const position = parseInt(match[1]) - 1 // Position is 1-indexed
      const price = parseFloat(match[2])

      const datetime = new Date(startTime.getTime() + position * minutesPerPeriod * 60 * 1000)

      prices.push({
        datetime: datetime.toISOString(),
        price: price
      })
    }
  }

  return prices.sort((a, b) => a.datetime.localeCompare(b.datetime))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const countryCode = searchParams.get('country') // ISO3 code
  const type = searchParams.get('type') || 'dayahead' // 'dayahead' or 'history'

  if (!countryCode) {
    return NextResponse.json({ error: 'Country parameter required' }, { status: 400 })
  }

  const areaCode = ENTSOE_AREAS[countryCode]
  if (!areaCode) {
    return NextResponse.json({
      error: `Country ${countryCode} not supported`,
      supportedCountries: Object.keys(ENTSOE_AREAS)
    }, { status: 400 })
  }

  const apiKey = process.env.ENTSOE_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      source: 'static',
      message: 'ENTSO-E API key not configured, using static data',
      country: countryCode,
    }, { status: 200 })
  }

  try {
    // Calculate date range
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date

    if (type === 'history') {
      // Last 7 days
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      periodEnd = now
    } else {
      // Day-ahead: today and tomorrow
      periodStart = new Date(now)
      periodStart.setHours(0, 0, 0, 0)
      periodEnd = new Date(periodStart.getTime() + 2 * 24 * 60 * 60 * 1000)
    }

    // Format dates for ENTSO-E API (YYYYMMDDHHmm)
    const formatDate = (d: Date) => {
      return d.toISOString().replace(/[-:T]/g, '').slice(0, 12)
    }

    // Document type A44 = Day-ahead prices
    const url = `${ENTSOE_API}?` + new URLSearchParams({
      securityToken: apiKey,
      documentType: 'A44',
      in_Domain: areaCode,
      out_Domain: areaCode,
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd),
    })

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/xml',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ENTSO-E API error:', response.status, errorText)
      throw new Error(`ENTSO-E API responded with ${response.status}`)
    }

    const xml = await response.text()
    const prices = parseENTSOEPrices(xml)

    if (prices.length === 0) {
      return NextResponse.json({
        source: 'error',
        error: 'No price data available for this period',
        country: countryCode,
      }, { status: 200 })
    }

    // Calculate statistics
    const avgPrice = prices.reduce((s, p) => s + p.price, 0) / prices.length
    const minPrice = Math.min(...prices.map(p => p.price))
    const maxPrice = Math.max(...prices.map(p => p.price))
    const currentPrice = prices[prices.length - 1]?.price

    return NextResponse.json({
      source: 'live',
      api: 'ENTSO-E',
      country: countryCode,
      areaCode,
      type,
      prices,
      stats: {
        count: prices.length,
        avgPrice: Math.round(avgPrice * 100) / 100,
        minPrice,
        maxPrice,
        currentPrice,
      },
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching ENTSO-E data:', error)
    return NextResponse.json({
      source: 'error',
      error: 'Failed to fetch live price data from ENTSO-E',
      country: countryCode,
    }, { status: 500 })
  }
}
