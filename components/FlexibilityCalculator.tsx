'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'
import { Calculator, Clock, Banknote, Leaf, Info, ArrowRight, Zap } from 'lucide-react'

interface FlexibilityMetric {
  avgSavingsPerMWh: number
  savingsPerGWh: number
  percentageOfAvgPrice: number
}

interface CarbonFlexibilityMetric {
  avgSavingsPerMWh: number // gCO2/kWh savings
  savingsPerGWh: number
  percentageOfAvgCarbon: number
}

interface CountryData {
  iso3: string
  name: string
  recentHourly: { datetime: string; price: number }[]
  carbonIntensity: { date: string; carbonIntensity: number }[]
  flexibilityMetrics: {
    '1h': FlexibilityMetric
    '2h': FlexibilityMetric
    '4h': FlexibilityMetric
    '8h': FlexibilityMetric
  } | null
  carbonFlexibilityMetrics?: {
    '1h': CarbonFlexibilityMetric
    '2h': CarbonFlexibilityMetric
    '4h': CarbonFlexibilityMetric
    '8h': CarbonFlexibilityMetric
  } | null
  stats: {
    avgPrice: number
    avgCarbon: number
  }
}

// Hourly carbon data that can come from live APIs (e.g., NESO)
interface HourlyCarbonData {
  datetime: string
  carbonIntensity: number
}

interface FlexibilityCalculatorProps {
  countryCode: string
  hourlyCarbonData?: HourlyCarbonData[] // Optional hourly carbon data from live APIs
}

// Calculate carbon flexibility metrics from hourly data (same algorithm as price)
function calculateCarbonFlexibility(hourlyData: HourlyCarbonData[]): {
  '1h': CarbonFlexibilityMetric
  '2h': CarbonFlexibilityMetric
  '4h': CarbonFlexibilityMetric
  '8h': CarbonFlexibilityMetric
} | null {
  if (hourlyData.length < 24) {
    return null
  }

  const windows = [1, 2, 4, 8] as const
  const results: Record<string, CarbonFlexibilityMetric> = {}

  // Calculate average carbon intensity for percentage calculations
  const avgCarbon = hourlyData.reduce((s, p) => s + p.carbonIntensity, 0) / hourlyData.length

  windows.forEach(window => {
    let totalSavings = 0
    let possibleShifts = 0

    // For each hour, calculate potential savings from shifting load
    for (let i = 0; i < hourlyData.length - window; i++) {
      const currentCarbon = hourlyData[i].carbonIntensity

      // Find minimum carbon intensity within the flexibility window
      let minCarbon = currentCarbon
      for (let j = 1; j <= window; j++) {
        if (i + j < hourlyData.length) {
          minCarbon = Math.min(minCarbon, hourlyData[i + j].carbonIntensity)
        }
      }

      // Also check backward
      for (let j = 1; j <= window; j++) {
        if (i - j >= 0) {
          minCarbon = Math.min(minCarbon, hourlyData[i - j].carbonIntensity)
        }
      }

      const savings = currentCarbon - minCarbon
      if (savings > 0) {
        totalSavings += savings
        possibleShifts++
      }
    }

    const avgSavings = possibleShifts > 0 ? totalSavings / hourlyData.length : 0

    results[`${window}h`] = {
      avgSavingsPerMWh: Math.round(avgSavings * 100) / 100, // gCO2/kWh
      savingsPerGWh: Math.round(avgSavings * 1000), // kg CO2 per GWh
      percentageOfAvgCarbon: Math.round((avgSavings / avgCarbon) * 10000) / 100
    }
  })

  return results as {
    '1h': CarbonFlexibilityMetric
    '2h': CarbonFlexibilityMetric
    '4h': CarbonFlexibilityMetric
    '8h': CarbonFlexibilityMetric
  }
}

export default function FlexibilityCalculator({ countryCode, hourlyCarbonData }: FlexibilityCalculatorProps) {
  const [data, setData] = useState<CountryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadSize, setLoadSize] = useState(1) // GWh
  const [selectedWindow, setSelectedWindow] = useState<'1h' | '2h' | '4h' | '8h'>('4h')
  const [calculatedCarbonMetrics, setCalculatedCarbonMetrics] = useState<{
    '1h': CarbonFlexibilityMetric
    '2h': CarbonFlexibilityMetric
    '4h': CarbonFlexibilityMetric
    '8h': CarbonFlexibilityMetric
  } | null>(null)
  const [carbonDataSource, setCarbonDataSource] = useState<'calculated' | 'estimated'>('estimated')

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

  // Fetch hourly carbon data for UK (NESO provides half-hourly data)
  useEffect(() => {
    const fetchHourlyCarbonData = async () => {
      if (countryCode === 'GBR') {
        try {
          // Fetch last 48 hours of data from NESO
          const now = new Date()
          const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
          const from = twoDaysAgo.toISOString()
          const to = now.toISOString()

          const response = await fetch(`/api/neso?type=history&from=${from}&to=${to}`)
          const result = await response.json()

          if (result.source === 'live' && result.data && result.data.length > 0) {
            // Convert NESO data to our hourly format
            const hourlyData: HourlyCarbonData[] = result.data.map((item: {
              from: string
              intensity: { actual: number; forecast: number }
            }) => ({
              datetime: item.from,
              carbonIntensity: item.intensity.actual || item.intensity.forecast
            }))

            // Calculate carbon flexibility from the hourly data
            const metrics = calculateCarbonFlexibility(hourlyData)
            if (metrics) {
              setCalculatedCarbonMetrics(metrics)
              setCarbonDataSource('calculated')
              return
            }
          }
        } catch (error) {
          console.error('Error fetching hourly carbon data:', error)
        }
      }

      // Fall back to pre-calculated metrics or estimation
      if (data?.carbonFlexibilityMetrics) {
        setCalculatedCarbonMetrics(data.carbonFlexibilityMetrics)
        setCarbonDataSource('calculated')
      } else {
        setCalculatedCarbonMetrics(null)
        setCarbonDataSource('estimated')
      }
    }

    if (data) {
      fetchHourlyCarbonData()
    }
  }, [countryCode, data])

  // Also calculate from prop data if provided (for other sources)
  useEffect(() => {
    if (hourlyCarbonData && hourlyCarbonData.length >= 24) {
      const metrics = calculateCarbonFlexibility(hourlyCarbonData)
      if (metrics) {
        setCalculatedCarbonMetrics(metrics)
        setCarbonDataSource('calculated')
      }
    }
  }, [hourlyCarbonData])

  if (loading || !data) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center">
          <div className="spinner w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          <span className="ml-3 text-slate-600">Loading flexibility data...</span>
        </div>
      </div>
    )
  }

  if (!data.flexibilityMetrics) {
    return (
      <div className="card p-6">
        <p className="text-center text-slate-500">
          Insufficient data to calculate flexibility metrics for this country.
        </p>
      </div>
    )
  }

  // Prepare chart data
  const chartData = [
    { window: '1h', savings: data.flexibilityMetrics['1h'].avgSavingsPerMWh, percentage: data.flexibilityMetrics['1h'].percentageOfAvgPrice },
    { window: '2h', savings: data.flexibilityMetrics['2h'].avgSavingsPerMWh, percentage: data.flexibilityMetrics['2h'].percentageOfAvgPrice },
    { window: '4h', savings: data.flexibilityMetrics['4h'].avgSavingsPerMWh, percentage: data.flexibilityMetrics['4h'].percentageOfAvgPrice },
    { window: '8h', savings: data.flexibilityMetrics['8h'].avgSavingsPerMWh, percentage: data.flexibilityMetrics['8h'].percentageOfAvgPrice },
  ]

  // Carbon savings calculation
  // Use calculated metrics from hourly data if available, otherwise estimate
  const avgCarbon = data.stats.avgCarbon

  let currentCarbonSavings: number
  let carbonPercentage: number

  if (calculatedCarbonMetrics) {
    // Use actual calculated carbon flexibility metrics
    currentCarbonSavings = calculatedCarbonMetrics[selectedWindow].avgSavingsPerMWh
    carbonPercentage = calculatedCarbonMetrics[selectedWindow].percentageOfAvgCarbon
  } else {
    // Fall back to estimation when hourly carbon data isn't available
    // Assuming carbon intensity varies by ~15% from mean during peak vs off-peak
    const estimatedCarbonVariation = avgCarbon * 0.15
    const estimatedCarbonSavingsPerMWh = {
      '1h': estimatedCarbonVariation * 0.3,
      '2h': estimatedCarbonVariation * 0.5,
      '4h': estimatedCarbonVariation * 0.7,
      '8h': estimatedCarbonVariation * 0.9,
    }
    currentCarbonSavings = estimatedCarbonSavingsPerMWh[selectedWindow]
    carbonPercentage = (currentCarbonSavings / avgCarbon) * 100
  }

  const currentMetrics = data.flexibilityMetrics[selectedWindow]

  // Calculate total savings based on load size
  const totalCostSavings = currentMetrics.avgSavingsPerMWh * loadSize * 1000 // Convert GWh to MWh
  const totalCarbonSavings = currentCarbonSavings * loadSize * 1000000 // Convert to kg (GWh = 1000000 kWh)

  // Annual projections (assuming 365 days of shifting)
  const annualCostSavings = totalCostSavings * 365
  const annualCarbonSavings = (totalCarbonSavings * 365) / 1000 // Convert to tonnes

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Flexibility Value Calculator</h2>
            <p className="text-sm text-slate-600">
              Calculate cost and carbon savings from shifting electricity load in {data.name}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Load Size Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Shiftable Load Size
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={loadSize}
                onChange={(e) => setLoadSize(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="w-24 px-3 py-2 bg-slate-100 rounded-lg text-center">
                <span className="font-bold text-slate-800">{loadSize.toFixed(1)}</span>
                <span className="text-sm text-slate-500 ml-1">GWh</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily shiftable electricity consumption
            </p>
          </div>

          {/* Flexibility Window */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Flexibility Window
            </label>
            <div className="flex gap-2">
              {(['1h', '2h', '4h', '8h'] as const).map(window => (
                <button
                  key={window}
                  onClick={() => setSelectedWindow(window)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedWindow === window
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-1" />
                  {window}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Maximum time load can be shifted forward or backward
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cost Savings Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Cost Savings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-green-700 mb-1">Daily Savings</p>
                <p className="text-3xl font-bold text-green-800">
                  €{totalCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="pt-3 border-t border-green-200">
                <p className="text-xs text-green-700 mb-1">Annual Savings (projected)</p>
                <p className="text-2xl font-bold text-green-800">
                  €{annualCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-green-700">
                  <span className="font-medium">€{currentMetrics.avgSavingsPerMWh.toFixed(2)}/MWh</span> average savings
                  ({currentMetrics.percentageOfAvgPrice.toFixed(1)}% of avg price)
                </p>
              </div>
            </div>
          </div>

          {/* Carbon Savings Card */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Carbon Savings</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                carbonDataSource === 'calculated'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {carbonDataSource === 'calculated' ? '✓ Calculated' : '~ Estimated'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-purple-700 mb-1">Daily Savings</p>
                <p className="text-3xl font-bold text-purple-800">
                  {(totalCarbonSavings / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  <span className="text-lg font-normal ml-1">tonnes CO₂</span>
                </p>
              </div>

              <div className="pt-3 border-t border-purple-200">
                <p className="text-xs text-purple-700 mb-1">Annual Savings (projected)</p>
                <p className="text-2xl font-bold text-purple-800">
                  {annualCarbonSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-lg font-normal ml-1">tonnes CO₂</span>
                </p>
              </div>

              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-purple-700">
                  <span className="font-medium">{currentCarbonSavings.toFixed(1)} gCO₂/kWh</span> {carbonDataSource === 'calculated' ? 'calculated' : 'estimated'} reduction
                  ({carbonPercentage.toFixed(1)}% of avg intensity)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Savings by Flexibility Window Chart */}
        <div className="mb-8">
          <h3 className="font-semibold text-slate-800 mb-4">Savings by Flexibility Window</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="window"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${v}`}
                  label={{ value: 'Savings (€/MWh)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    `€${value.toFixed(2)}/MWh`,
                    'Potential Savings'
                  ]}
                />
                <Bar dataKey="savings" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.window === selectedWindow ? '#3b82f6' : '#94a3b8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">How Flexibility Value is Calculated</h4>
              <div className="text-sm text-slate-600 space-y-2">
                <p>
                  <strong>Cost Savings:</strong> For each hour, we calculate the potential savings from shifting
                  consumption to the cheapest hour within the flexibility window. The average savings across
                  all hours in the last 30 days gives the expected value of flexibility.
                </p>
                <p>
                  <strong>Carbon Savings:</strong> {carbonDataSource === 'calculated' ? (
                    <>Calculated from hourly carbon intensity data{countryCode === 'GBR' ? ' (NESO API - last 48 hours)' : ''}.
                    We find the potential emissions reduction from shifting consumption to the lowest-carbon hour
                    within the flexibility window, using the same methodology as cost savings.</>
                  ) : (
                    <>Estimated based on typical daily variation patterns (~15% peak-to-trough). Countries with
                    live hourly carbon data (e.g., UK via NESO) show calculated values instead of estimates.</>
                  )}
                </p>
                <p className="flex items-center gap-2 text-blue-600 font-medium">
                  <ArrowRight className="w-4 h-4" />
                  Longer flexibility windows unlock greater savings potential
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
