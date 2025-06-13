const fs = require('fs');
const Papa = require('papaparse');

// Read the CSV file
const csvData = fs.readFileSync('./data/throun_data.csv', 'utf8');

// Parse CSV to JSON
const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true
});

// Process the data
const processedData = parsed.data.filter(row => 
    row.sveitarfelag && row.ar && row.hluti && row.name && row.y
).map(row => ({
    sveitarfelag: row.sveitarfelag,
    ar: parseInt(row.ar),
    hluti: row.hluti,
    name: row.name,
    y: parseFloat(row.y),
    is_percent: row.is_percent === 'TRUE'
}));

// Create the JavaScript data file
const jsContent = `// Auto-generated data file
const FINANCIAL_DATA = ${JSON.stringify(processedData, null, 2)};

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FINANCIAL_DATA;
}`;

fs.writeFileSync('./data.js', jsContent);
console.log(`Converted ${processedData.length} records to data.js`);
console.log(`File size: ${Math.round(fs.statSync('./data.js').size / 1024)}KB`);