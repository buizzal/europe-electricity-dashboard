'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface CountrySummary {
  name: string
  iso2: string
  currentPrice: number | null
  avgPrice7d: number | null
  avgCarbon7d: number | null
}

interface EuropeMapProps {
  summaryData: { [iso3: string]: CountrySummary } | null
  selectedCountry: string | null
  onSelectCountry: (iso3: string) => void
  lastUpdated?: string | null
}

// Map various country identifiers to ISO3 codes
const COUNTRY_TO_ISO3: { [key: string]: string } = {
  // ISO2 codes
  'AT': 'AUT', 'BE': 'BEL', 'BG': 'BGR', 'CH': 'CHE', 'CZ': 'CZE',
  'DE': 'DEU', 'DK': 'DNK', 'ES': 'ESP', 'EE': 'EST', 'FI': 'FIN',
  'FR': 'FRA', 'GB': 'GBR', 'GR': 'GRC', 'HR': 'HRV', 'HU': 'HUN',
  'IE': 'IRL', 'IT': 'ITA', 'LT': 'LTU', 'LU': 'LUX', 'LV': 'LVA',
  'MK': 'MKD', 'ME': 'MNE', 'NL': 'NLD', 'NO': 'NOR', 'PL': 'POL',
  'PT': 'PRT', 'RO': 'ROU', 'RS': 'SRB', 'SK': 'SVK', 'SI': 'SVN',
  'SE': 'SWE', 'UA': 'UKR', 'AL': 'ALB', 'BA': 'BIH', 'XK': 'XKX',
  // ISO3 codes (identity mapping)
  'AUT': 'AUT', 'BEL': 'BEL', 'BGR': 'BGR', 'CHE': 'CHE', 'CZE': 'CZE',
  'DEU': 'DEU', 'DNK': 'DNK', 'ESP': 'ESP', 'EST': 'EST', 'FIN': 'FIN',
  'FRA': 'FRA', 'GBR': 'GBR', 'GRC': 'GRC', 'HRV': 'HRV', 'HUN': 'HUN',
  'IRL': 'IRL', 'ITA': 'ITA', 'LTU': 'LTU', 'LUX': 'LUX', 'LVA': 'LVA',
  'MKD': 'MKD', 'MNE': 'MNE', 'NLD': 'NLD', 'NOR': 'NOR', 'POL': 'POL',
  'PRT': 'PRT', 'ROU': 'ROU', 'SRB': 'SRB', 'SVK': 'SVK', 'SVN': 'SVN',
  'SWE': 'SWE',
  // Country names
  'Austria': 'AUT', 'Belgium': 'BEL', 'Bulgaria': 'BGR', 'Switzerland': 'CHE',
  'Czech Republic': 'CZE', 'Czechia': 'CZE', 'Germany': 'DEU', 'Denmark': 'DNK',
  'Spain': 'ESP', 'Estonia': 'EST', 'Finland': 'FIN', 'France': 'FRA',
  'United Kingdom': 'GBR', 'Greece': 'GRC', 'Croatia': 'HRV', 'Hungary': 'HUN',
  'Ireland': 'IRL', 'Italy': 'ITA', 'Lithuania': 'LTU', 'Luxembourg': 'LUX',
  'Latvia': 'LVA', 'North Macedonia': 'MKD', 'Montenegro': 'MNE',
  'Netherlands': 'NLD', 'Norway': 'NOR', 'Poland': 'POL', 'Portugal': 'PRT',
  'Romania': 'ROU', 'Serbia': 'SRB', 'Slovakia': 'SVK', 'Slovenia': 'SVN',
  'Sweden': 'SWE',
}

// Europe-focused projection settings
const EUROPE_CENTER: [number, number] = [10, 54]
const DEFAULT_ZOOM = 4

// Color scale for price visualization
function getPriceColor(price: number | null): string {
  if (price === null) return '#e2e8f0'
  if (price < 30) return '#22c55e'
  if (price < 60) return '#84cc16'
  if (price < 100) return '#eab308'
  if (price < 150) return '#f97316'
  return '#ef4444'
}

// GeoJSON URL for world countries (Natural Earth via CDN)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

// Helper to extract ISO3 code from geography properties
function getISO3FromGeo(geo: any): string | null {
  const props = geo.properties || {}

  // Try various property names used in different TopoJSON sources
  const candidates = [
    props.ISO_A3,
    props.iso_a3,
    props.ISO_A2,
    props.iso_a2,
    props.name,
    props.NAME,
    props.admin,
    props.ADMIN,
    geo.id,
  ].filter(Boolean)

  for (const candidate of candidates) {
    const iso3 = COUNTRY_TO_ISO3[candidate]
    if (iso3) return iso3
  }

  return null
}

export default function EuropeMap({
  summaryData,
  selectedCountry,
  onSelectCountry,
  lastUpdated
}: EuropeMapProps) {
  const [position, setPosition] = useState({ coordinates: EUROPE_CENTER, zoom: DEFAULT_ZOOM })
  const [tooltipContent, setTooltipContent] = useState<{
    name: string
    price: number | null
    carbon: number | null
    x: number
    y: number
  } | null>(null)

  const handleZoomIn = useCallback(() => {
    if (position.zoom >= 8) return
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }))
  }, [position.zoom])

  const handleZoomOut = useCallback(() => {
    if (position.zoom <= 1) return
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }))
  }, [position.zoom])

  const handleReset = useCallback(() => {
    setPosition({ coordinates: EUROPE_CENTER, zoom: DEFAULT_ZOOM })
  }, [])

  const handleMoveEnd = useCallback((position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position)
  }, [])

  // Set of all ISO3 codes we have data for
  const countriesWithData = useMemo(() => {
    return new Set(Object.keys(summaryData || {}))
  }, [summaryData])

  const handleCountryClick = useCallback((iso3: string | null) => {
    if (iso3 && countriesWithData.has(iso3)) {
      onSelectCountry(iso3)
    }
  }, [onSelectCountry, countriesWithData])

  return (
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors border border-slate-200"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors border border-slate-200"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors border border-slate-200"
          title="Reset view"
        >
          <RotateCcw className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="absolute z-20 px-3 py-2 bg-white rounded-lg shadow-lg border border-slate-200 pointer-events-none transform -translate-x-1/2"
          style={{ left: tooltipContent.x, top: Math.max(0, tooltipContent.y - 60) }}
        >
          <p className="font-semibold text-slate-800 text-sm">{tooltipContent.name}</p>
          <div className="flex gap-4 mt-1 text-xs">
            {tooltipContent.price !== null && (
              <span className="text-amber-600">
                €{tooltipContent.price.toFixed(0)}/MWh
              </span>
            )}
            {tooltipContent.carbon !== null && (
              <span className="text-green-600">
                {tooltipContent.carbon.toFixed(0)} gCO₂/kWh
              </span>
            )}
          </div>
          <p className="text-xs text-blue-500 mt-1">Click to select</p>
        </div>
      )}

      {/* Map */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: EUROPE_CENTER,
          scale: 400,
        }}
        style={{ width: '100%', height: '350px' }}
      >
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          onMoveEnd={handleMoveEnd}
          minZoom={1}
          maxZoom={8}
          filterZoomEvent={(evt) => {
            // Allow click events to pass through for country selection
            return evt.type !== 'click'
          }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso3 = getISO3FromGeo(geo)
                const countryData = iso3 ? summaryData?.[iso3] : null
                const hasData = iso3 && countriesWithData.has(iso3)
                const isSelected = selectedCountry === iso3

                const fillColor = countryData
                  ? getPriceColor(countryData.avgPrice7d)
                  : '#e2e8f0'

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke={isSelected ? '#1e40af' : hasData ? '#64748b' : '#e2e8f0'}
                    strokeWidth={isSelected ? 2 : hasData ? 0.5 : 0.25}
                    onClick={() => handleCountryClick(iso3)}
                    onMouseEnter={(e) => {
                      if (countryData && iso3) {
                        const svgElement = (e.target as SVGElement).closest('svg')
                        if (svgElement) {
                          const rect = svgElement.getBoundingClientRect()
                          setTooltipContent({
                            name: countryData.name,
                            price: countryData.avgPrice7d,
                            carbon: countryData.avgCarbon7d,
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          })
                        }
                      }
                    }}
                    onMouseLeave={() => setTooltipContent(null)}
                    style={{
                      default: {
                        outline: 'none',
                        cursor: hasData ? 'pointer' : 'default',
                        transition: 'all 0.15s ease-out',
                      },
                      hover: {
                        outline: 'none',
                        fill: hasData ? (isSelected ? fillColor : `${fillColor}dd`) : '#f1f5f9',
                        stroke: hasData ? '#3b82f6' : '#e2e8f0',
                        strokeWidth: hasData ? 1.5 : 0.25,
                      },
                      pressed: {
                        outline: 'none',
                        fill: fillColor,
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="text-xs text-slate-500">Price:</span>
        {[
          { color: '#22c55e', label: '<€30' },
          { color: '#84cc16', label: '€30-60' },
          { color: '#eab308', label: '€60-100' },
          { color: '#f97316', label: '€100-150' },
          { color: '#ef4444', label: '>€150' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-400">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}
