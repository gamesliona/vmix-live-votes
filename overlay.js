(() => {
  const params = new URLSearchParams(location.search);
  const demo = params.has('demo');
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
