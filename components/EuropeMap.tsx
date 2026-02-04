'use client'

import React from 'react'

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
}

// SVG paths for European countries (simplified)
const COUNTRY_PATHS: { [iso3: string]: { d: string; cx: number; cy: number } } = {
  'PRT': { d: 'M85,195 L95,195 L100,220 L90,240 L80,235 L80,210 Z', cx: 88, cy: 215 },
  'ESP': { d: 'M95,195 L150,185 L160,195 L165,220 L140,240 L100,240 L90,240 L100,220 Z', cx: 130, cy: 210 },
  'FRA': { d: 'M150,185 L185,155 L200,155 L210,175 L195,200 L165,220 L160,195 Z', cx: 180, cy: 180 },
  'BEL': { d: 'M185,155 L200,150 L205,155 L200,155 Z', cx: 193, cy: 153 },
  'NLD': { d: 'M195,140 L210,135 L210,150 L200,150 Z', cx: 203, cy: 143 },
  'LUX': { d: 'M200,155 L205,155 L207,160 L202,160 Z', cx: 203, cy: 158 },
  'DEU': { d: 'M200,150 L210,135 L245,130 L260,145 L250,170 L225,175 L210,175 L205,155 Z', cx: 230, cy: 155 },
  'CHE': { d: 'M195,175 L210,175 L215,185 L200,190 Z', cx: 205, cy: 182 },
  'ITA': { d: 'M215,185 L240,180 L260,195 L280,230 L260,260 L240,250 L225,210 L200,200 Z', cx: 245, cy: 220 },
  'AUT': { d: 'M225,175 L250,170 L270,175 L265,185 L240,180 Z', cx: 247, cy: 177 },
  'SVN': { d: 'M250,185 L265,185 L260,195 L245,192 Z', cx: 255, cy: 190 },
  'HRV': { d: 'M260,195 L280,190 L290,210 L270,220 L260,200 Z', cx: 275, cy: 205 },
  'HUN': { d: 'M270,175 L300,175 L310,190 L290,200 L270,195 Z', cx: 290, cy: 185 },
  'SVK': { d: 'M270,165 L300,165 L300,175 L270,175 Z', cx: 285, cy: 170 },
  'CZE': { d: 'M245,150 L260,145 L280,155 L270,165 L250,165 Z', cx: 262, cy: 157 },
  'POL': { d: 'M260,125 L310,120 L320,155 L300,165 L280,155 L260,145 Z', cx: 290, cy: 140 },
  'DNK': { d: 'M220,115 L235,105 L245,115 L235,125 L220,125 Z', cx: 232, cy: 115 },
  'SWE': { d: 'M250,50 L275,40 L290,80 L275,120 L255,115 L240,75 Z', cx: 265, cy: 80 },
  'NOR': { d: 'M220,30 L250,20 L260,50 L250,50 L240,75 L220,100 L200,80 L210,50 Z', cx: 230, cy: 55 },
  'FIN': { d: 'M290,30 L320,25 L340,80 L320,120 L290,100 L290,60 Z', cx: 310, cy: 70 },
  'EST': { d: 'M300,105 L325,100 L325,115 L300,115 Z', cx: 312, cy: 108 },
  'LVA': { d: 'M300,115 L325,115 L325,130 L300,130 Z', cx: 312, cy: 122 },
  'LTU': { d: 'M295,130 L320,130 L320,145 L295,145 Z', cx: 307, cy: 137 },
  'GBR': { d: 'M140,110 L170,100 L175,130 L160,155 L145,145 L135,130 Z', cx: 155, cy: 125 },
  'IRL': { d: 'M110,115 L135,110 L140,135 L125,145 L110,135 Z', cx: 125, cy: 125 },
  'GRC': { d: 'M290,220 L320,215 L330,250 L305,270 L285,255 Z', cx: 305, cy: 240 },
  'BGR': { d: 'M310,200 L350,195 L355,215 L325,220 L310,210 Z', cx: 332, cy: 207 },
  'ROU': { d: 'M305,175 L350,170 L355,195 L310,200 L305,185 Z', cx: 330, cy: 185 },
  'SRB': { d: 'M290,200 L310,200 L310,220 L295,225 L285,215 Z', cx: 298, cy: 212 },
  'MNE': { d: 'M280,220 L290,218 L290,230 L280,230 Z', cx: 285, cy: 224 },
  'MKD': { d: 'M295,225 L310,225 L312,240 L298,240 Z', cx: 303, cy: 232 },
}

// Color scale for price visualization
function getPriceColor(price: number | null): string {
  if (price === null) return '#e2e8f0'
  if (price < 30) return '#22c55e' // Green - cheap
  if (price < 60) return '#84cc16' // Light green
  if (price < 100) return '#eab308' // Yellow
  if (price < 150) return '#f97316' // Orange
  return '#ef4444' // Red - expensive
}

export default function EuropeMap({ summaryData, selectedCountry, onSelectCountry }: EuropeMapProps) {
  return (
    <div className="relative">
      <svg
        viewBox="60 0 320 290"
        className="w-full h-auto"
        style={{ maxHeight: '350px' }}
      >
        {/* Background */}
        <rect x="60" y="0" width="320" height="290" fill="#f8fafc" rx="8" />

        {/* Sea indication */}
        <ellipse cx="100" cy="200" rx="50" ry="60" fill="#e0f2fe" opacity="0.5" />
        <ellipse cx="300" cy="260" rx="60" ry="40" fill="#e0f2fe" opacity="0.5" />
        <ellipse cx="180" cy="100" rx="40" ry="30" fill="#e0f2fe" opacity="0.5" />

        {/* Countries */}
        {Object.entries(COUNTRY_PATHS).map(([iso3, path]) => {
          const countryData = summaryData?.[iso3]
          const isSelected = selectedCountry === iso3
          const fillColor = countryData
            ? getPriceColor(countryData.avgPrice7d)
            : '#e2e8f0'

          return (
            <g key={iso3}>
              <path
                d={path.d}
                fill={fillColor}
                className={`country-path ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectCountry(iso3)}
                style={{
                  filter: isSelected ? 'brightness(0.9)' : 'none',
                  strokeWidth: isSelected ? 2 : 0.5,
                  stroke: isSelected ? '#1e40af' : '#94a3b8'
                }}
              />
              {/* Country label for larger countries */}
              {countryData && ['DEU', 'FRA', 'ESP', 'ITA', 'POL', 'GBR', 'SWE', 'NOR', 'FIN', 'ROU'].includes(iso3) && (
                <text
                  x={path.cx}
                  y={path.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none"
                  style={{
                    fontSize: '8px',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    fill: '#1e293b'
                  }}
                >
                  {iso3}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-1">
        <span className="text-xs text-slate-500 mr-2">Price:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
          <span className="text-xs text-slate-500">&lt;€30</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#84cc16' }}></div>
          <span className="text-xs text-slate-500">€30-60</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#eab308' }}></div>
          <span className="text-xs text-slate-500">€60-100</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
          <span className="text-xs text-slate-500">€100-150</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span className="text-xs text-slate-500">&gt;€150</span>
        </div>
      </div>
    </div>
  )
}
