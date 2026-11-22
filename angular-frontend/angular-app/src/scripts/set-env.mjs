import { mkdirSync, writeFileSync } from 'node:fs';

const apiBaseUrl = process.env.API_BASE_URL;

// Nothing provided: keep the committed defaults
if (!apiBaseUrl) {
  console.log('API_BASE_URL not set, keeping src/environments/environment.ts');
  process.exit(0);
}

mkdirSync('src/environments', { recursive: true });
writeFileSync(
  'src/environments/environment.ts',
  `export const environment = {\n  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},\n};\n`,
);
console.log(`Wrote environment.ts with apiBaseUrl=${apiBaseUrl}`);