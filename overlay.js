(() => {
  const params = new URLSearchParams(location.search);
  const demo = params.has('demo');
  const publicLive = location.hostname?.endsWith('.github.io') || params.get('live') === 'public';
  let publicConfig;
  const cases = [[2, 2], [2, 1], [0, 0]];
  let demoStep = 0;
  let busy = false;
  let lastSuccess;
  async function refresh() {
    if (busy) return;
    busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      let result;
      if (demo) {
        const selected = params.get('demo');
        const counts = selected === 'tie' ? cases[0] : selected === 'split' || selected === 'failure' ? cases[1] : selected === 'zero' ? cases[2] : cases[demoStep % cases.length];
        if (selected === 'failure' && demoStep > 0) {
          // Exercise the real HTTP-error branch using an intentionally missing route.
          const failed = await fetch('/demo-unavailable', { signal: controller.signal });
          throw new Error(`Demo HTTP ${failed.status}`);
        }
        demoStep++;
        const total = counts[0] + counts[1];
        result = { teams: counts.map((votes, i) => ({ label: ['supernOva', 'grumblebee'][i], votes, percentage: total ? votes / total * 100 : 0 })), updatedAt: new Date().toISOString() };
      } else if (publicLive) {
        if (!publicConfig) {
          const configResponse = await fetch('config.public.json', { cache: 'no-store', signal: controller.signal });
          if (!configResponse.ok) throw new Error(`Configuration HTTP ${configResponse.status}`);
          publicConfig = await configResponse.json();
        }
        const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(publicConfig.spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=Sheet1&range=A1:B3&_=${Date.now()}`;
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`Sheets HTTP ${response.status}`);
        const csv = await response.text();
        // Parse quoted CSV, including escaped quotes and embedded line breaks.
        const rows = []; let row = [], field = '', quoted = false;
        for (let i = 0; i < csv.length; i++) {
          const char = csv[i];
          if (char === '"') {
            if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
            else quoted = !quoted;
          } else if (char === ',' && !quoted) { row.push(field); field = ''; }
          else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && csv[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
          } else field += char;
        }
        if (field || row.length) { row.push(field); rows.push(row); }
        if (quoted) throw new Error('Invalid tally CSV.');
        const data = { values: rows };
        const cell = address => {
          if (!/^[A-C][1-3]$/.test(address)) throw new Error('Cell must be inside A1:C3.');
          return data.values?.[Number(address[1]) - 1]?.[address.charCodeAt(0) - 65];
        };
        const teams = publicConfig.countCells.map((address, i) => {
          const rawVotes = cell(address);
          return { votes: typeof rawVotes === 'string' && /^\d+$/.test(rawVotes.trim()) ? Number(rawVotes) : NaN, label: cell(publicConfig.labelCells[i]) };
        });
        if (teams.length !== 2 || teams.some(team => !Number.isSafeInteger(team.votes) || team.votes < 0 || typeof team.label !== 'string')) throw new Error('Invalid tally data.');
        const total = teams[0].votes + teams[1].votes;
        if (!Number.isSafeInteger(total)) throw new Error('Invalid vote total.');
        result = { teams: teams.map(team => ({ ...team, percentage: total ? team.votes / total * 100 : 0 })), updatedAt: new Date().toISOString() };
      } else {
        const response = await fetch('/api/votes', { cache: 'no-store', signal: controller.signal });
        result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      }
      result.teams.forEach((team, index) => {
        document.getElementById(`label-${index}`).textContent = team.label;
        document.getElementById(`percentage-${index}`).textContent = `${team.percentage.toFixed(1)}%`;
        document.getElementById(`count-${index}`).textContent = `${team.votes.toLocaleString()} ${team.votes === 1 ? 'vote' : 'votes'}`;
        const bar = document.getElementById(`bar-${index}`);
        bar.setAttribute('data-losing', String(team.votes < result.teams[1 - index].votes));
        bar.setAttribute('data-empty', String(team.votes === 0));
        bar.firstElementChild.style.width = `${team.percentage}%`;
        bar.setAttribute('aria-valuenow', team.percentage.toFixed(1));
        bar.setAttribute('aria-valuetext', `${team.votes} votes, ${team.percentage.toFixed(1)} percent`);
      });
      lastSuccess = result.updatedAt;
      document.getElementById('status').textContent = demo ? 'DEMO' : '';
    } catch (error) {
      // Preserve the last valid results during outages; never invent zero counts.
      document.getElementById('status').textContent = lastSuccess ? 'Updates paused · reconnecting…' : 'Waiting for vote data…';
      console.warn('Vote refresh failed:', error.message);
    } finally {
      clearTimeout(timeout);
      busy = false;
    }
  }
  refresh();
  setInterval(refresh, 7000);
})();
