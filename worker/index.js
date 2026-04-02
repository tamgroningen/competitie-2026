const ADMIN_PASSWORD = 'admin2026';

const SEED_DATA = {
  poules: [
    {
      id: 'poule-a', name: 'Poule A', teams: [
        { id: 'tam-heren-1', name: 'TAM Heren 1', code: '', players: [] },
        { id: 'tam-1', name: 'TAM 1', code: '', players: [] },
        { id: 'gstc-1', name: 'GSTC 1', code: '', players: [] },
        { id: 'veracket-1', name: 'Veracket 1', code: '', players: [] },
        { id: 'gstc-dames-2', name: 'GSTC dames 2', code: '', players: [] },
        { id: 'gstc-2', name: 'GSTC 2', code: '', players: [] },
      ], matchups: []
    },
    {
      id: 'poule-b', name: 'Poule B', teams: [
        { id: 'tam-2', name: 'TAM 2', code: '', players: [] },
        { id: 'tam-3', name: 'TAM 3', code: '', players: [] },
        { id: 'tam-dames-1', name: 'TAM Dames 1', code: '', players: [] },
        { id: 'veracket-2', name: 'Veracket 2', code: '', players: [] },
        { id: 'tam-dames-3', name: 'TAM dames 3', code: '', players: [] },
        { id: 'gstc-dames-3', name: 'GSTC dames 3', code: '', players: [] },
      ], matchups: []
    },
    {
      id: 'poule-c', name: 'Poule C', teams: [
        { id: 'tam-4', name: 'TAM 4', code: '', players: [] },
        { id: 'tam-5', name: 'TAM 5', code: '', players: [] },
        { id: 'gstc-3', name: 'GSTC 3', code: '', players: [] },
        { id: 'veracket-4', name: 'Veracket 4', code: '', players: [] },
        { id: 'veracket-3', name: 'Veracket 3', code: '', players: [] },
        { id: 'tam-dames-2', name: 'TAM dames 2', code: '', players: [] },
      ], matchups: []
    },
    {
      id: 'poule-d', name: 'Poule D', teams: [
        { id: 'gstc-dames-1', name: 'GSTC dames 1', code: '', players: [] },
        { id: 'veracket-dames-1', name: 'Veracket dames 1', code: '', players: [] },
        { id: 'tam-6', name: 'TAM 6', code: '', players: [] },
        { id: 'tam-7', name: 'TAM 7', code: '', players: [] },
        { id: 'gstc-4', name: 'GSTC 4', code: '', players: [] },
      ], matchups: []
    },
  ]
};

const NAMES = [
  'federer', 'nadal', 'alcaraz', 'sinner', 'thiem', 'williams',
  'swiatek', 'medvedev', 'dimitrov', 'zverev', 'raducanu', 'fritz',
  'sabalenka', 'draper', 'djokovic', 'murray',
];

function generateCode() {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${name}${num}`;
}

function generateMatchups(teamIds) {
  const matchups = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matchups.push({
        id: `${teamIds[i]}-vs-${teamIds[j]}`,
        home: teamIds[i],
        away: teamIds[j],
        matches: [
          { type: 'singles', home_players: [], away_players: [], sets: [], played: false },
          { type: 'singles', home_players: [], away_players: [], sets: [], played: false },
          { type: 'doubles', home_players: [], away_players: [], sets: [], played: false },
          { type: 'doubles', home_players: [], away_players: [], sets: [], played: false },
        ],
      });
    }
  }
  return matchups;
}

function seedData() {
  const data = JSON.parse(JSON.stringify(SEED_DATA));
  const usedCodes = new Set();
  for (const poule of data.poules) {
    for (const team of poule.teams) {
      let code;
      do { code = generateCode(); } while (usedCodes.has(code));
      usedCodes.add(code);
      team.code = code;
    }
    poule.matchups = generateMatchups(poule.teams.map(t => t.id));
  }
  return data;
}

function findTeamByCode(data, code) {
  for (const poule of data.poules) {
    for (const team of poule.teams) {
      if (team.code === code) {
        return { team, poule };
      }
    }
  }
  return null;
}

function validateCode(data, code) {
  if (code === ADMIN_PASSWORD) {
    return { role: 'admin' };
  }
  const found = findTeamByCode(data, code);
  if (found) {
    return { role: 'team', team_id: found.team.id, team_name: found.team.name, poule_id: found.poule.id };
  }
  return null;
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // GET /data — public, returns competition data (strips team codes)
    if (request.method === 'GET' && path === '/data') {
      let raw = await env.COMPETITIE.get('data');
      if (!raw) {
        const data = seedData();
        await env.COMPETITIE.put('data', JSON.stringify(data));
        raw = JSON.stringify(data);
      }
      // Strip codes for public response
      const data = JSON.parse(raw);
      const publicData = JSON.parse(JSON.stringify(data));
      for (const poule of publicData.poules) {
        for (const team of poule.teams) {
          delete team.code;
        }
      }
      return json(publicData);
    }

    // POST /login — validate code, return role info + full data with codes if admin
    if (request.method === 'POST' && path === '/login') {
      const { code } = await request.json();
      let raw = await env.COMPETITIE.get('data');
      if (!raw) {
        const data = seedData();
        await env.COMPETITIE.put('data', JSON.stringify(data));
        raw = JSON.stringify(data);
      }
      const data = JSON.parse(raw);
      const auth = validateCode(data, code);
      if (!auth) {
        return json({ ok: false, error: 'Onjuiste code' }, 401);
      }
      // Return full data with codes for admin, or just auth info for team
      if (auth.role === 'admin') {
        return json({ ok: true, ...auth, data });
      }
      return json({ ok: true, ...auth });
    }

    // POST /players — update team player list
    if (request.method === 'POST' && path === '/players') {
      const { code, team_id, players } = await request.json();
      const raw = await env.COMPETITIE.get('data');
      if (!raw) return json({ error: 'No data' }, 500);
      const data = JSON.parse(raw);
      const auth = validateCode(data, code);
      if (!auth) return json({ error: 'Onjuiste code' }, 401);
      if (auth.role !== 'admin' && auth.team_id !== team_id) {
        return json({ error: 'Geen toegang' }, 403);
      }
      for (const poule of data.poules) {
        const team = poule.teams.find(t => t.id === team_id);
        if (team) {
          team.players = players;
          break;
        }
      }
      await env.COMPETITIE.put('data', JSON.stringify(data));
      return json({ ok: true });
    }

    // POST /result — save match result
    if (request.method === 'POST' && path === '/result') {
      const { code, poule_id, matchup_id, match_idx, home_players, away_players, sets } = await request.json();
      const raw = await env.COMPETITIE.get('data');
      if (!raw) return json({ error: 'No data' }, 500);
      const data = JSON.parse(raw);
      const auth = validateCode(data, code);
      if (!auth) return json({ error: 'Onjuiste code' }, 401);

      const poule = data.poules.find(p => p.id === poule_id);
      if (!poule) return json({ error: 'Poule niet gevonden' }, 404);
      const matchup = poule.matchups.find(mu => mu.id === matchup_id);
      if (!matchup) return json({ error: 'Ontmoeting niet gevonden' }, 404);

      // Only admin or home team can enter scores
      if (auth.role !== 'admin' && auth.team_id !== matchup.home) {
        return json({ error: 'Alleen het thuisteam kan scores invoeren' }, 403);
      }

      if (match_idx < 0 || match_idx >= 4) return json({ error: 'Ongeldige wedstrijd' }, 400);

      const match = matchup.matches[match_idx];
      match.home_players = home_players || [];
      match.away_players = away_players || [];
      match.sets = sets || [];
      match.played = sets && sets.length > 0 && home_players.length > 0 && away_players.length > 0;

      await env.COMPETITIE.put('data', JSON.stringify(data));
      return json({ ok: true });
    }

    // POST /reset — reset match result
    if (request.method === 'POST' && path === '/reset') {
      const { code, poule_id, matchup_id, match_idx } = await request.json();
      const raw = await env.COMPETITIE.get('data');
      if (!raw) return json({ error: 'No data' }, 500);
      const data = JSON.parse(raw);
      const auth = validateCode(data, code);
      if (!auth) return json({ error: 'Onjuiste code' }, 401);

      const poule = data.poules.find(p => p.id === poule_id);
      if (!poule) return json({ error: 'Poule niet gevonden' }, 404);
      const matchup = poule.matchups.find(mu => mu.id === matchup_id);
      if (!matchup) return json({ error: 'Ontmoeting niet gevonden' }, 404);

      if (auth.role !== 'admin' && auth.team_id !== matchup.home) {
        return json({ error: 'Geen toegang' }, 403);
      }

      if (match_idx < 0 || match_idx >= 4) return json({ error: 'Ongeldige wedstrijd' }, 400);

      const match = matchup.matches[match_idx];
      match.home_players = [];
      match.away_players = [];
      match.sets = [];
      match.played = false;

      await env.COMPETITIE.put('data', JSON.stringify(data));
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  },
};
