const path = require('path');
const fs = require('fs/promises');

const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data', 'leads.json');
const exportDir = path.join(rootDir, 'exports');
const exportFile = path.join(exportDir, 'leads.csv');
const headers = ['submittedAt', 'name', 'phone', 'units', 'city', 'notes'];

function csvEscape(value) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
  return `"${normalized.replace(/"/g, '""')}"`;
}

async function main() {
  let leads = [];

  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    leads = JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(exportDir, { recursive: true });

  const rows = [headers.join(',')];
  for (const lead of leads) {
    rows.push(headers.map((header) => csvEscape(lead[header])).join(','));
  }

  await fs.writeFile(exportFile, rows.join('\n') + '\n', 'utf8');
  console.log(`Exported ${leads.length} leads to ${exportFile}`);
}

main().catch((error) => {
  console.error('Failed to export leads', error);
  process.exit(1);
});
