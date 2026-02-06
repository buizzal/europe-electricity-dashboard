import { NextRequest, NextResponse } from 'next/server'

// NESO Carbon Intensity API - Free, no authentication required
// Documentation: https://carbon-intensity.github.io/api-definitions/
const NESO_API = 'https://api.carbonintensity.org.uk'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'current' // 'current', 'today', 'history'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  try {
    let endpoint: string

    switch (type) {
      case 'current':
        endpoint = `${NESO_API}/intensity`
        break
      case 'today':
        endpoint = `${NESO_API}/intensity/date`
        break
      case 'history':
        if (from && to) {
          endpoint = `${NESO_API}/intensity/${from}/${to}`
        } else {
          // Last 24 hours
          endpoint = `${NESO_API}/intensity/date`
        }
        break
      case 'generation':
        endpoint = `${NESO_API}/generation`
        break
      case 'stats':
        // Get stats for today
        const today = new Date().toISOString().split('T')[0]
        endpoint = `${NESO_API}/intensity/stats/${today}`
        break
      default:
        endpoint = `${NESO_API}/intensity`
    }

    const response = await fetch(endpoint, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`NESO API responded with ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      source: 'live',
      api: 'neso',
      type,
      ...data,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching NESO data:', error)
    return NextResponse.json({
      source: 'error',
      api: 'neso',
      error: 'Failed to fetch live data from NESO',
      fetchedAt: new Date().toISOString(),
    }, { status: 500 })
  }
}
