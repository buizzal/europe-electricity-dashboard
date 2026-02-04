'use client'

import { useState, useEffect } from 'react'
import EuropeMap from '@/components/EuropeMap'
import Dashboard from '@/components/Dashboard'
import FlexibilityCalculator from '@/components/FlexibilityCalculator'
import { Zap, Leaf, TrendingUp, Info } from 'lucide-react'

interface CountrySummary {
  name: string
  iso2: string
  currentPrice: number | null
  avgPrice7d: number | null
  avgCarbon7d: number | null
}

interface SummaryData {
  [iso3: string]: CountrySummary
}

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/summary.json')
      .then(res => res.json())
      .then(data => {
        setSummaryData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading summary data:', err)
        setLoading(false)
      })
  }, [])

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">European Electricity Dashboard</h1>
                <p className="text-xs text-slate-500">Prices, Emissions & Flexibility Value Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Live Data</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        {summaryData && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="stat-card from-blue-50 to-blue-100/50 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Countries Tracked</span>
              </div>
              <p className="text-3xl font-bold text-blue-700">{Object.keys(summaryData).length}</p>
              <p className="text-xs text-blue-600 mt-1">European electricity markets</p>
            </div>

            <div className="stat-card from-green-50 to-green-100/50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Avg Carbon Intensity</span>
              </div>
              <p className="text-3xl font-bold text-green-700">
                {Math.round(
                  Object.values(summaryData).reduce((s, c) => s + (c.avgCarbon7d || 0), 0) /
                  Object.values(summaryData).filter(c => c.avgCarbon7d).length
                )}
                <span className="text-lg font-normal ml-1">gCO₂/kWh</span>
              </p>
              <p className="text-xs text-green-600 mt-1">7-day European average</p>
            </div>

            <div className="stat-card from-amber-50 to-amber-100/50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Avg Electricity Price</span>
              </div>
              <p className="text-3xl font-bold text-amber-700">
                €{Math.round(
                  Object.values(summaryData).reduce((s, c) => s + (c.avgPrice7d || 0), 0) /
                  Object.values(summaryData).filter(c => c.avgPrice7d).length
                )}
                <span className="text-lg font-normal ml-1">/MWh</span>
              </p>
              <p className="text-xs text-amber-600 mt-1">7-day European average</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Select a Country</h2>
                {selectedCountry && summaryData && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {summaryData[selectedCountry]?.name}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="spinner w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                </div>
              ) : (
                <EuropeMap
                  summaryData={summaryData}
                  selectedCountry={selectedCountry}
                  onSelectCountry={setSelectedCountry}
                />
              )}

              {/* Country List */}
              <div className="mt-4 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {summaryData && Object.entries(summaryData)
                    .sort((a, b) => a[1].name.localeCompare(b[1].name))
                    .map(([iso3, data]) => (
                      <button
                        key={iso3}
                        onClick={() => setSelectedCountry(iso3)}
                        className={`px-3 py-2 text-left text-sm rounded-lg transition-all ${
                          selectedCountry === iso3
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {data.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Section */}
          <div className="lg:col-span-2">
            {selectedCountry ? (
              <Dashboard countryCode={selectedCountry} />
            ) : (
              <div className="card p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Country</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Click on a country on the map or select from the list below to view detailed
                    electricity prices, carbon emissions, and flexibility value analysis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flexibility Calculator */}
        {selectedCountry && (
          <div className="mt-6">
            <FlexibilityCalculator countryCode={selectedCountry} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>
              Data sources: ENTSO-E, EEA, European Commission
            </p>
            <p>
              Built for analyzing the value of electricity demand flexibility
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
