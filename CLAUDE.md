# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **serverless financial dashboard** for Icelandic municipalities (sveitarfélög) that visualizes financial data over time. The application displays financial metrics like debt ratios, revenue per capita, and other financial indicators for various Icelandic municipalities.

**Important**: This dashboard is designed to be fully serverless and client-side only. All data is embedded directly in JavaScript files to avoid any backend dependencies.

## Architecture

- **Serverless Static Frontend**: Pure client-side HTML/CSS/JS application with no backend dependencies
- **Embedded Data**: All financial data is pre-processed and embedded as JavaScript constants
- **Data Processing**: Node.js script (`convert-data.js`) converts CSV data to JavaScript constants (development-time only)
- **Visualization**: D3.js for interactive line charts with multi-municipality comparison
- **UI Components**: Bootstrap 5 for styling, Selectize.js for multi-select dropdowns
- **Data Source**: CSV file in `/data/throun_data.csv` processed into `data.js` for client-side consumption

## Key Files

- `index.html` - Main application page with Icelandic UI
- `dashboard.js` - Main FinancialDashboard class handling data visualization and interactions  
- `data.js` - Auto-generated JavaScript data file (don't edit manually)
- `convert-data.js` - Node.js script to convert CSV to JavaScript
- `data/throun_data.csv` - Source financial data in CSV format

## Development Commands

Start development server:
```bash
npm run dev
# or 
npm start
```

Convert CSV data to JavaScript (after updating CSV):
```bash
node convert-data.js
```

## Data Structure

Financial data contains:
- `sveitarfelag`: Municipality name (string)
- `ar`: Year (number)  
- `hluti`: Financial section (A-hluti, B-hluti, A og B-hluti)
- `name`: Metric name (string)
- `y`: Metric value (number)
- `is_percent`: Whether value should be displayed as percentage (boolean)

## UI Features

- Multi-municipality selection with Selectize.js
- Interactive D3.js line charts with hover tooltips
- Dynamic legend with intelligent wrapping
- Zero reference lines for metrics that cross zero
- Responsive Bootstrap layout
- Icelandic language interface

## Styling

Uses CSS custom properties for theming:
- `--theme-primary`: Main color (dark blue-gray)
- `--theme-secondary`: Background (off-white)  
- `--theme-success`: Accent color (teal)
- `--theme-hover`: Hover state color

Font stack: Lato (primary), Playfair Display (headers), with web font fallbacks.