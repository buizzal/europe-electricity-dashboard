'use client'

import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts'
import { Zap, Leaf, TrendingUp, Clock, Calendar, Database, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface HourlyData {
  datetime: string
  price: number
}

interface DailyPrice {
  date: string
  avgPrice: number
  minPrice: number
  maxPrice: number
}

interface CarbonData {
  date: string
  carbonIntensity: number
}

interface FlexibilityMetric {
  avgSavingsPerMWh: number
  savingsPerGWh: number
  percentageOfAvgPrice: number
}

interface CountryData {
  iso3: string
  name: string
  recentHourly: HourlyData[]
  dailyPrices: DailyPrice[]
  carbonIntensity: CarbonData[]
  flexibilityMetrics: {
    '1h': FlexibilityMetric
    '2h': FlexibilityMetric
    '4h': FlexibilityMetric
    '8h': FlexibilityMetric
  } | null
  stats: {
    avgPrice: number
    avgCarbon: number
  }
}

interface LiveCarbonData {
  source: 'live' | 'static' | 'error'
  api?: string
  carbonIntensity?: number
  datetime?: string
  fetchedAt?: string
  data?: Array<{
    from: string
    to: string
    intensity: {
      forecast: number
      actual: number
      index: string
    }
  }>
}

interface DataSourceInfo {
  priceSource: 'static' | 'live' | 'error'
  carbonSource: 'static' | 'live' | 'error'
  priceApi?: string
  carbonApi?: string
  priceFetchedAt?: string
  carbonFetchedAt?: string
  priceDataType: 'historical' | 'real-time'
  carbonDataType: 'historical' | 'real-time'
}

interface DashboardProps {
  countryCode: string
}

// Map ISO3 to Electricity Maps zones
const ISO3_TO_ZONE: { [key: string]: string } = {
  'AUT': 'AT', 'BEL': 'BE', 'BGR': 'BG', 'CHE': 'CH', 'CZE': 'CZ',
  'DEU': 'DE', 'DNK': 'DK-DK1', 'ESP': 'ES', 'EST': 'EE', 'FIN': 'FI',
  'FRA': 'FR', 'GBR': 'GB', 'GRC': 'GR', 'HRV': 'HR', 'HUN': 'HU',
  'IRL': 'IE', 'ITA': 'IT-NO', 'LTU': 'LT', 'LUX': 'LU', 'LVA': 'LV',
  'MKD': 'MK', 'MNE': 'ME', 'NLD': 'NL', 'NOR': 'NO-NO1', 'POL': 'PL',
  'PRT': 'PT', 'ROU': 'RO', 'SRB': 'RS', 'SVK': 'SK', 'SVN': 'SI',
  'SWE': 'SE-SE1',
}

export default function Dashboard({ countryCode }: DashboardProps) {
  const [data, setData] = useState<CountryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d')
  const [liveCarbon, setLiveCarbon] = useState<LiveCarbonData | null>(null)
  const [dataSource, setDataSource] = useState<DataSourceInfo>({
    priceSource: 'static',
    carbonSource: 'static',
    priceDataType: 'historical',
    carbonDataType: 'historical',
  })
  const [refreshing, setRefreshing] = useState(false)

  // Fetch static data
  useEffect(() => {
    setLoading(true)
    fetch(`/data/${countryCode}.json`)
      .then(res => res.json())
      .then(countryData => {
        setData(countryData)
        setDataSource(prev => ({
          ...prev,
          priceSource: 'static',
          priceDataType: 'historical',
          priceFetchedAt: new Date().toISOString(),
        }))
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading country data:', err)
        setLoading(false)
      })
  }, [countryCode])

  // Fetch live carbon intensity data
  useEffect(() => {
    const fetchLiveCarbon = async () => {
      // For UK, use NESO API (free, no auth)
      if (countryCode === 'GBR') {
        try {
          const response = await fetch('/api/neso?type=current')
          const result = await response.json()

          if (result.source === 'live' && result.data?.[0]) {
            setLiveCarbon({
              source: 'live',
              api: 'NESO',
              carbonIntensity: result.data[0].intensity.actual || result.data[0].intensity.forecast,
              datetime: result.data[0].from,
              fetchedAt: result.fetchedAt,
            })
            setDataSource(prev => ({
              ...prev,
              carbonSource: 'live',
              carbonApi: 'NESO Carbon Intensity',
              carbonDataType: 'real-time',
              carbonFetchedAt: result.fetchedAt,
            }))
          }
        } catch (error) {
          console.error('Error fetching NESO data:', error)
          setDataSource(prev => ({ ...prev, carbonSource: 'static', carbonDataType: 'historical' }))
        }
      } else {
        // For other countries, try Electricity Maps API
        const zone = ISO3_TO_ZONE[countryCode]
        if (zone) {
          try {
            const response = await fetch(`/api/carbon-intensity?zone=${zone}&type=latest`)
            const result = await response.json()

            if (result.source === 'live') {
              setLiveCarbon({
                source: 'live',
                api: 'Electricity Maps',
                carbonIntensity: result.carbonIntensity,
                datetime: result.datetime,
                fetchedAt: result.fetchedAt,
              })
              setDataSource(prev => ({
                ...prev,
                carbonSource: 'live',
                carbonApi: 'Electricity Maps',
                carbonDataType: 'real-time',
                carbonFetchedAt: result.fetchedAt,
              }))
            } else {
              setDataSource(prev => ({ ...prev, carbonSource: 'static', carbonDataType: 'historical' }))
            }
          } catch (error) {
            console.error('Error fetching Electricity Maps data:', error)
            setDataSource(prev => ({ ...prev, carbonSource: 'static', carbonDataType: 'historical' }))
          }
        }
      }
    }

    fetchLiveCarbon()
  }, [countryCode])

  const handleRefresh = async () => {
    setRefreshing(true)

    // Refresh live carbon data
    if (countryCode === 'GBR') {
      try {
        const response = await fetch('/api/neso?type=current')
        const result = await response.json()
        if (result.source === 'live' && result.data?.[0]) {
          setLiveCarbon({
            source: 'live',
            api: 'NESO',
            carbonIntensity: result.data[0].intensity.actual || result.data[0].intensity.forecast,
            datetime: result.data[0].from,
            fetchedAt: result.fetchedAt,
          })
          setDataSource(prev => ({
            ...prev,
            carbonSource: 'live',
            carbonFetchedAt: result.fetchedAt,
          }))
        }
      } catch (error) {
        console.error('Error refreshing:', error)
      }
    } else {
      const zone = ISO3_TO_ZONE[countryCode]
      if (zone) {
        try {
          const response = await fetch(`/api/carbon-intensity?zone=${zone}&type=latest`)
          const result = await response.json()
          if (result.source === 'live') {
            setLiveCarbon({
              source: 'live',
              api: 'Electricity Maps',
              carbonIntensity: result.carbonIntensity,
              datetime: result.datetime,
              fetchedAt: result.fetchedAt,
            })
            setDataSource(prev => ({
              ...prev,
              carbonSource: 'live',
              carbonFetchedAt: result.fetchedAt,
            }))
          }
        } catch (error) {
          console.error('Error refreshing:', error)
        }
      }
    }

    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center">
          <div className="spinner w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          <span className="ml-3 text-slate-600">Loading data...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card p-8">
        <p className="text-center text-slate-500">Failed to load data for this country.</p>
      </div>
    )
  }

  // Filter data based on time range
  const daysToShow = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[timeRange]
  const filteredDailyPrices = data.dailyPrices.slice(-daysToShow)
  const filteredCarbon = data.carbonIntensity.slice(-daysToShow)

  // Combine price and carbon data for the combined chart
  const combinedData = filteredDailyPrices.map(price => {
    const carbonEntry = filteredCarbon.find(c => c.date === price.date)
    return {
      date: price.date,
      avgPrice: price.avgPrice,
      minPrice: price.minPrice,
      maxPrice: price.maxPrice,
      carbonIntensity: carbonEntry?.carbonIntensity || null
    }
  })

  // Format hourly data for the chart
  const hourlyChartData = data.recentHourly.map(h => ({
    datetime: h.datetime,
    hour: format(parseISO(h.datetime), 'HH:mm'),
    day: format(parseISO(h.datetime), 'MMM d'),
    price: h.price
  }))

  // Calculate current stats - use live data if available
  const currentPrice = data.recentHourly.length > 0
    ? data.recentHourly[data.recentHourly.length - 1].price
    : null

  const currentCarbon = liveCarbon?.carbonIntensity ?? (
    data.carbonIntensity.length > 0
      ? data.carbonIntensity[data.carbonIntensity.length - 1].carbonIntensity
      : null
  )

  // Calculate 24h price change
  const price24hAgo = data.recentHourly.length > 24
    ? data.recentHourly[data.recentHourly.length - 25]?.price
    : null
  const priceChange = currentPrice && price24hAgo
    ? ((currentPrice - price24hAgo) / price24hAgo * 100)
    : null

  return (
    <div className="space-y-4">
      {/* Country Header with Data Source Info */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{data.name}</h2>
            <p className="text-sm text-slate-500">ISO Code: {data.iso3}</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', '365d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Data Source Indicators */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Price Data Source */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${
                dataSource.priceSource === 'live'
                  ? 'bg-green-100 text-green-700'
                  : dataSource.priceSource === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {dataSource.priceSource === 'live' ? (
                  <Wifi className="w-3 h-3" />
                ) : dataSource.priceSource === 'error' ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <Database className="w-3 h-3" />
                )}
                <span className="font-medium">Price:</span>
                <span>{dataSource.priceSource === 'live' ? 'Live' : dataSource.priceSource === 'error' ? 'Error' : 'Static'}</span>
              </div>
              <span className={`px-2 py-1 rounded ${
                dataSource.priceDataType === 'real-time' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {dataSource.priceDataType === 'real-time' ? '⚡ Real-time' : '📊 Historical'}
              </span>
            </div>

            {/* Carbon Data Source */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${
                dataSource.carbonSource === 'live'
                  ? 'bg-green-100 text-green-700'
                  : dataSource.carbonSource === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {dataSource.carbonSource === 'live' ? (
                  <Wifi className="w-3 h-3" />
                ) : dataSource.carbonSource === 'error' ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <Database className="w-3 h-3" />
                )}
                <span className="font-medium">Carbon:</span>
                <span>{dataSource.carbonSource === 'live' ? `Live (${dataSource.carbonApi})` : dataSource.carbonSource === 'error' ? 'Error' : 'Static'}</span>
              </div>
              <span className={`px-2 py-1 rounded ${
                dataSource.carbonDataType === 'real-time' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {dataSource.carbonDataType === 'real-time' ? '⚡ Real-time' : '📊 Historical'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Last Updated Timestamps */}
          {(dataSource.carbonFetchedAt || dataSource.priceFetchedAt) && (
            <div className="mt-2 text-xs text-slate-400">
              {dataSource.carbonFetchedAt && dataSource.carbonSource === 'live' && (
                <span>Carbon updated: {format(parseISO(dataSource.carbonFetchedAt), 'MMM d, HH:mm:ss')}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Current Price</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            €{currentPrice?.toFixed(1) || '-'}
            <span className="text-sm font-normal text-slate-500">/MWh</span>
          </p>
          {priceChange !== null && (
            <p className={`text-xs mt-1 ${priceChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(1)}% vs 24h ago
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {dataSource.priceSource === 'live' ? '🟢 Live' : '📁 Static data'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500">Carbon Intensity</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {currentCarbon?.toFixed(0) || '-'}
            <span className="text-sm font-normal text-slate-500">gCO₂/kWh</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {dataSource.carbonSource === 'live' ? `🟢 Live (${dataSource.carbonApi})` : '📁 Static data'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Avg Price ({timeRange})</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            €{(filteredDailyPrices.reduce((s, p) => s + p.avgPrice, 0) / filteredDailyPrices.length).toFixed(1)}
            <span className="text-sm font-normal text-slate-500">/MWh</span>
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-slate-500">Flexibility Value</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            €{data.flexibilityMetrics?.['4h']?.avgSavingsPerMWh.toFixed(1) || '-'}
            <span className="text-sm font-normal text-slate-500">/MWh</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">4h shift savings</p>
        </div>
      </div>

      {/* Hourly Price Chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-800">Hourly Prices (Last 7 Days)</h3>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">📊 Historical</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyChartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`€${value.toFixed(2)}/MWh`, 'Price']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return format(parseISO(payload[0].payload.datetime), 'MMM d, HH:mm')
                  }
                  return label
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Combined Daily Chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Daily Price Range & Carbon Intensity
          </h3>
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">📊 Historical</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                interval="preserveStartEnd"
                tickFormatter={(date) => format(parseISO(date), 'MMM d')}
              />
              <YAxis
                yAxisId="price"
                orientation="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${v}`}
                label={{ value: 'Price (€/MWh)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
              />
              <YAxis
                yAxisId="carbon"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'CO₂ (g/kWh)', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#64748b' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'carbonIntensity') return [`${value?.toFixed(0)} gCO₂/kWh`, 'Carbon']
                  if (name === 'avgPrice') return [`€${value?.toFixed(2)}/MWh`, 'Avg Price']
                  if (name === 'minPrice') return [`€${value?.toFixed(2)}/MWh`, 'Min Price']
                  if (name === 'maxPrice') return [`€${value?.toFixed(2)}/MWh`, 'Max Price']
                  return [value, name]
                }}
                labelFormatter={(date) => format(parseISO(date as string), 'MMMM d, yyyy')}
              />
              <Legend />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="maxPrice"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth={1}
                name="Max Price"
                fillOpacity={0.5}
              />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="minPrice"
                fill="#dcfce7"
                stroke="#22c55e"
                strokeWidth={1}
                name="Min Price"
                fillOpacity={0.5}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="avgPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Avg Price"
              />
              <Line
                yAxisId="carbon"
                type="monotone"
                dataKey="carbonIntensity"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Carbon Intensity"
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
