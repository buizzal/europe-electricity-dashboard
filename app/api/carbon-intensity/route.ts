import { NextRequest, NextResponse } from 'next/server'
import { ELECTRICITY_MAPS_ZONES } from '@/lib/api-config'

const ELECTRICITY_MAPS_API = 'https://api.electricitymap.org/v3'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const zone = searchParams.get('zone')
  const type = searchParams.get('type') || 'latest' // 'latest' or 'history'

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
    }, { status: 200 })
  }

  try {
    const endpoint = type === 'history'
      ? `${ELECTRICITY_MAPS_API}/carbon-intensity/history?zone=${zone}`
      : `${ELECTRICITY_MAPS_API}/carbon-intensity/latest?zone=${zone}`

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
      ...data,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching carbon intensity:', error)
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
