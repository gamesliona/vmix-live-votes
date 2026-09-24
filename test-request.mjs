import { readSheet } from './sheets.mjs';
try {
  const result = await readSheet();
  console.log(`HTTP ${result.status}\n${result.body}`);
  if (!result.ok) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
