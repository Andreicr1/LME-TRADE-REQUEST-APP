const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const res = await fetch('https://www.gov.uk/bank-holidays.json');
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    const events = data['england-and-wales'].events;
    const holidays = {};
    for (const { date } of events) {
      const year = date.slice(0, 4);
      if (!holidays[year]) holidays[year] = [];
      if (!holidays[year].includes(date)) holidays[year].push(date);
    }
    // sort dates for each year
    for (const year of Object.keys(holidays)) {
      holidays[year].sort();
    }
    const file = path.join(__dirname, '..', 'holidays.json');
    fs.writeFileSync(file, JSON.stringify(holidays, null, 2) + '\n');
    console.log('Updated', file);
  } catch (err) {
    console.error('Failed to update holidays:', err);
    process.exitCode = 1;
  }
}

main();
