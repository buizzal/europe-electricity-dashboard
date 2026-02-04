# European Electricity Dashboard

An interactive dashboard for visualizing European electricity prices, carbon emissions, and calculating the value of demand flexibility across 31 European countries.

![Dashboard Preview](./docs/preview.png)

## Features

- **Interactive Europe Map**: Click on any country to view detailed electricity data
- **Real-time Price Visualization**: Hourly and daily electricity prices in EUR/MWh
- **Carbon Intensity Tracking**: Daily carbon intensity data (gCO₂/kWh)
- **Flexibility Value Calculator**: Calculate potential cost and carbon savings from load shifting
- **Multiple Time Windows**: Analyze flexibility value for 1h, 2h, 4h, and 8h shifting windows

## Data Sources

- **Electricity Prices**: Day-ahead market prices from European power exchanges (2015-2026)
- **Carbon Intensity**: Power sector carbon intensity from environmental agencies (2015-2024)

## Countries Covered

Austria, Belgium, Bulgaria, Croatia, Czechia, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Montenegro, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, United Kingdom

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/europe-electricity-dashboard.git
cd europe-electricity-dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Deploy to Vercel

The easiest way to deploy this dashboard is using Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/europe-electricity-dashboard)

Or manually:

1. Push this repository to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Vercel will automatically detect Next.js and configure the build
4. Deploy!

## Project Structure

```
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main page component
│   └── globals.css     # Global styles
├── components/
│   ├── EuropeMap.tsx   # Interactive SVG map
│   ├── Dashboard.tsx   # Charts and visualizations
│   └── FlexibilityCalculator.tsx  # Value calculator
├── public/
│   └── data/           # Processed JSON data files
├── scripts/
│   └── process-data.js # Data processing script
└── package.json
```

## Understanding Flexibility Value

**Cost Savings**: The value of being able to shift electricity consumption to cheaper hours. For each hour, we calculate the minimum price available within the flexibility window and the potential savings.

**Carbon Savings**: By shifting load to hours with lower carbon intensity (typically when renewable generation is higher), overall emissions can be reduced.

### Example Calculation

For a 1 GWh daily load with 4-hour flexibility in Germany:
- Average savings: ~€15/MWh
- Daily savings: ~€15,000
- Annual savings: ~€5.5 million
- Carbon reduction: ~100+ tonnes CO₂/year

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## License

MIT License - feel free to use this for your own projects!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
