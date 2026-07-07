export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Pin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ ok: true, service: 'Catalpronos admin' }, 200, cors);
    }

    try {
      if (env.ADMIN_PIN) {
        const pin = request.headers.get('X-Admin-Pin') || '';
        if (pin !== env.ADMIN_PIN) return json({ ok: false, error: 'Code admin incorrect' }, 401, cors);
      }

      const input = await request.json();
      const result = normalize(input);
      const repo = 'samihchaa-wq/Catalpronos-';
      const path = 'results.json';
      const token = env.GITHUB_TOKEN;
      if (!token) return json({ ok: false, error: 'GITHUB_TOKEN manquant dans Cloudflare' }, 500, cors);

      const file = await gh(`https://api.github.com/repos/${repo}/contents/${path}?ref=main`, token);
      const current = JSON.parse(decodeBase64(file.content || 'e30='));
      current.updatedAt = new Date().toISOString();
      current.r8 = current.r8 || {};
      current.qf = current.qf || {};
      current.sf = current.sf || {};
      current.final = current.final || {};

      const record = {
        teamA: result.teamA,
        teamB: result.teamB,
        score: result.score,
        winner: result.winner
      };

      if (result.round === 'final') current.final = record;
      else current[result.round][String(result.index)] = record;

      const content = JSON.stringify(current, null, 2) + '\n';
      const commit = await gh(`https://api.github.com/repos/${repo}/contents/${path}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Publie ${result.teamA} - ${result.teamB} depuis Catalpronos`,
          content: encodeBase64(content),
          sha: file.sha,
          branch: 'main'
        })
      });

      return json({ ok: true, commit: commit.commit?.sha || null, data: current }, 200, cors);
    } catch (error) {
      return json({ ok: false, error: error.message || String(error) }, 400, cors);
    }
  }
};

function normalize(input) {
  const allowed = new Set(['r8', 'qf', 'sf', 'final']);
  const round = String(input.round || '').trim();
  const index = Number(input.index || 0);
  const teamA = String(input.teamA || '').trim();
  const teamB = String(input.teamB || '').trim();
  const score = String(input.score || '').trim();
  const winner = String(input.winner || '').trim();

  if (!allowed.has(round)) throw new Error('Tour invalide');
  if (round !== 'final' && !Number.isInteger(index)) throw new Error('Index invalide');
  if (!teamA || !teamB || !score || !winner) throw new Error('Données incomplètes');
  if (![teamA, teamB].includes(winner)) throw new Error('Le vainqueur doit être une des deux équipes');
  return { round, index, teamA, teamB, score, winner };
}

async function gh(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'catalpronos-worker',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `GitHub ${response.status}`);
  return payload;
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function decodeBase64(value) {
  const clean = String(value).replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
