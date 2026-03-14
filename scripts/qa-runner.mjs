import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const qaDir = path.join(projectRoot, 'docs', 'qa');
const qaFiles = [
  'profit-scenario.md',
  'marketplace-comparison.md',
  'market-analysis.md',
  'price-position.md',
  'products.md'
];

console.log('Running Marketcal QA scenarios...\n');

if (!existsSync(qaDir)) {
  console.error('✖ QA directory missing:');
  console.error('docs/qa\n');
  console.error('Please create the QA scenario directory before running QA.');
  process.exit(1);
}

const missingFiles = qaFiles.filter((file) => !existsSync(path.join(qaDir, file)));

if (missingFiles.length > 0) {
  for (const file of missingFiles) {
    console.error('✖ QA file missing:');
    console.error(path.join('docs', 'qa', file));
    console.error('');
  }

  console.error('Please create the missing QA scenario before running QA.');
  process.exit(1);
}

let totalScenarios = 0;

for (const file of qaFiles) {
  const fullPath = path.join(qaDir, file);
  const content = readFileSync(fullPath, 'utf8');
  const matches = content.match(/^## Senaryo(?:\s+\d+)?(?:\s+-.*)?$/gm) ?? [];
  const scenarioCount = matches.length;
  totalScenarios += scenarioCount;

  console.log(`✓ ${file.replace(/\.md$/, '')} → ${scenarioCount} scenarios`);
}

console.log('\nQA summary');
console.log(`Total pages checked: ${qaFiles.length}`);
console.log(`Total scenarios: ${totalScenarios}\n`);
console.log('QA documentation looks good.');
