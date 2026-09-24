import { readFile } from 'node:fs/promises';

export async function readSheet() {
  const config = JSON.parse(await readFile(new URL('./config.local.json', import.meta.url), 'utf8'));
  if (!config.apiKey || config.apiKey.startsWith('PASTE_')) throw new Error('Set apiKey in config.local.json.');
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}`);
  url.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
  const response = await fetch(url, {
    headers: { 'X-Goog-Api-Key': config.apiKey }, signal: AbortSignal.timeout(6000)
  });
  const body = await response.text();
  return { status: response.status, ok: response.ok, body, config };
}

export function parseVotes(data, config) {
  // Cell coordinates are relative to the requested range, which starts at A1.
  const cell = address => {
    if (!/^[A-C][1-3]$/.test(address)) throw new Error('Count and label cells must be inside A1:C3.');
    return data.values?.[Number(address[1]) - 1]?.[address.charCodeAt(0) - 65];
  };
  if (config.countCells.length !== 2 || config.labelCells.length !== 2) throw new Error('Configure exactly two teams.');
  const teams = config.countCells.map((address, i) => {
    const votes = cell(address);
    const label = cell(config.labelCells[i]);
    if (typeof votes !== 'number' || !Number.isSafeInteger(votes) || votes < 0) throw new Error(`Invalid vote count in ${address}.`);
    if (typeof label !== 'string' || !label.trim()) throw new Error('Missing team label.');
    return { label, votes };
  });
  const total = teams[0].votes + teams[1].votes;
  if (!Number.isSafeInteger(total)) throw new Error('Vote total is too large.');
  return teams.map(team => ({ ...team, percentage: total ? team.votes / total * 100 : 0 }));
}
