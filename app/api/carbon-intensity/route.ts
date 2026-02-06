import { NextRequest, NextResponse } from 'next/server'
import { ELECTRICITY_MAPS_ZONES } from '@/lib/api-config'

const ELECTRICITY_MAPS_API = 'https://api.electricitymap.org/v3'

// The configured zone for the free tier API key (set in .env.local)
// Free tier is limited to ONE zone only
const CONFIGURED_ZONE = process.env.ELECTRICITY_MAPS_ZONE || ''

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const zone = searchParams.get('zone')
  const type = searchParams.get('type') || 'latest' // 'latest', 'history', or 'past-range'

  if (!zone) {
    return NextResponse.json({ error: 'Zone parameter required' }, { status: 400 })
  }

  const apiKey = process.env.ELECTRICITY_MAPS_API_KEY

  if (!apiKey) {
    // Return fallback response when API key is not configured
    return NextResponse.json({
      source: 'static',
      message: 'API key not configured, using static data',
      zone,
      configuredZone: CONFIGURED_ZONE,
    }, { status: 200 })
  }

  // Check if requested zone matches the configured zone (free tier limitation)
  // If zone doesn't match and we're trying to get history, it will fail
  const isConfiguredZone = CONFIGURED_ZONE === zone || CONFIGURED_ZONE === ''

  try {
    let endpoint: string

    if (type === 'past-range') {
      // Get the last 48 hours of data for flexibility calculations
      const now = new Date()
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
      const start = twoDaysAgo.toISOString()
      const end = now.toISOString()
      endpoint = `${ELECTRICITY_MAPS_API}/carbon-intensity/past-range?zone=${zone}&start=${start}&end=${end}`
    } else if (type === 'history') {
      endpoint = `${ELECTRICITY_MAPS_API}/carbon-intensity/history?zone=${zone}`
    } else {
      endpoint = `${ELECTRICITY_MAPS_API}/carbon-intensity/latest?zone=${zone}`
    }

    const response = await fetch(endpoint, {
      headers: {
        'auth-token': apiKey,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      source: 'live',
      zone,
      configuredZone: CONFIGURED_ZONE,
      isConfiguredZone,
      type,
      ...data,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching carbon intensity:', error)

    // If zone doesn't match configured zone, return helpful error
    if (!isConfiguredZone) {
      return NextResponse.json({
        source: 'error',
        error: `Zone ${zone} not available. Free tier only supports zone: ${CONFIGURED_ZONE}`,
        zone,
        configuredZone: CONFIGURED_ZONE,
        isConfiguredZone: false,
      }, { status: 200 }) // Return 200 so the frontend can handle gracefully
    }

    return NextResponse.json({
      source: 'error',
      error: 'Failed to fetch live data',
      zone,
    }, { status: 500 })
  }
}

// Also support power breakdown
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { zone } = body

  if (!zone) {
    return NextResponse.json({ error: 'Zone parameter required' }, { status: 400 })
  }

  const apiKey = process.env.ELECTRICITY_MAPS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      source: 'static',
      message: 'API key not configured',
      zone,
    }, { status: 200 })
  }

  try {
    const response = await fetch(
      `${ELECTRICITY_MAPS_API}/power-breakdown/latest?zone=${zone}`,
      {
        headers: {
          'auth-token': apiKey,
        },
        next: { revalidate: 300 },
      }
    )

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      source: 'live',
      zone,
      ...data,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching power breakdown:', error)
    return NextResponse.json({
      source: 'error',
      error: 'Failed to fetch live data',
      zone,
    }, { status: 500 })
  }
}
