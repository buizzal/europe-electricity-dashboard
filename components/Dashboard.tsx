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
  Bar
} from 'recharts'
import { Zap, Leaf, TrendingUp, Clock, Calendar } from 'lucide-react'
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

interface DashboardProps {
  countryCode: string
}

export default function Dashboard({ countryCode }: DashboardProps) {
  const [data, setData] = useState<CountryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d')

  useEffect(() => {
    setLoading(true)
    fetch(`/data/${countryCode}.json`)
      .then(res => res.json())
      .then(countryData => {
        setData(countryData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading country data:', err)
        setLoading(false)
      })
  }, [countryCode])

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

  // Calculate current stats
  const currentPrice = data.recentHourly.length > 0
    ? data.recentHourly[data.recentHourly.length - 1].price
    : null
  const recentCarbon = data.carbonIntensity.length > 0
    ? data.carbonIntensity[data.carbonIntensity.length - 1].carbonIntensity
    : null

  // Calculate 24h price change
  const price24hAgo = data.recentHourly.length > 24
    ? data.recentHourly[data.recentHourly.length - 25]?.price
    : null
  const priceChange = currentPrice && price24hAgo
    ? ((currentPrice - price24hAgo) / price24hAgo * 100)
    : null

  return (
    <div className="space-y-4">
      {/* Country Header */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
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
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500">Carbon Intensity</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {recentCarbon?.toFixed(0) || '-'}
            <span className="text-sm font-normal text-slate-500">gCO₂/kWh</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Latest available</p>
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
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-800">Hourly Prices (Last 7 Days)</h3>
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
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Daily Price Range & Carbon Intensity
        </h3>
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
