/* Apex Ladder – career engine (no DOM). Karting -> F4 -> F3 -> F2 -> F1 with lateral moves. */
(function (root) {
  const D = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./f1-data.js') : root.F1D;
  const { CATS, NATS, ACADEMIES, PROMO, LATERAL, STUCK_CATS, TIER3_SIDE, SENIOR, STATS, TIERS, PROMO_P, F1P, ROOKIES, RETIRE_2028 } = D;

  const rnd = Math.random;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const R1 = x => Math.round(x * 10) / 10;

  const MAX_AGE = 43, START_YEAR = 2026;
  const WEALTH = { poor: { n: 'Poor', base: 150, sd: 0.35, sponsor: 0.7 }, middle: { n: 'Middle class', base: 900, sd: 0.4, sponsor: 1 }, rich: { n: 'Rich parents', base: 4500, sd: 0.4, sponsor: 1.15 }, dynasty: { n: 'Old money', base: 25000, sd: 0.4, sponsor: 1.3 } };
  const W = { PAC: 0.2, QUA: 0.15, RAC: 0.2, CON: 0.15, WET: 0.07, TYR: 0.1, FIT: 0.05, MEN: 0.08 };
  const kartCat = age => age <= 8 ? 'kart1' : age <= 11 ? 'kart2' : age <= 13 ? 'kart3' : 'kart4';
  const ovrOf = s => Math.round(STATS.reduce((a, k) => a + W[k] * s[k], 0));
  const tierOf = G => TIERS[G.tier];
  const potLabel = t => TIERS[t].n;

  /* ---------- talent curve ---------- */
  const band = age => age <= 11 ? 0 : age <= 13 ? 1 : age <= 15 ? 2 : age <= 18 ? 3 : age <= 22 ? 4 : 5;
  function pathLvl(age) {
    if (age <= 8) return 46; if (age <= 11) return 55; if (age <= 13) return 61; if (age <= 15) return 67;
    return [68, 70, 73, 75.5, 78, 80.5][Math.min(5, age - 16)] || 84;
  }
  const targetOvr = (G, age) => pathLvl(age) + TIERS[G.tier].adv[band(age)] - (age >= 34 ? (age - 33) * 1.1 : 0);
  function rollTier() { let r = rnd(), i = 0; for (; i < TIERS.length; i++) { r -= TIERS[i].p; if (r <= 0) break; } return Math.min(i, TIERS.length - 1); }
  function rollShape(arch) {
    const s = {}; STATS.forEach(k => s[k] = gauss() * 2.2);
    if (arch === 'qualifier') { s.QUA += 8; s.PAC += 4; s.RAC -= 3; s.CON -= 2; }
    else if (arch === 'racer') { s.RAC += 8; s.TYR += 5; s.QUA -= 4; s.CON += 1; }
    else if (arch === 'wet') { s.WET += 14; s.CON += 3; s.PAC -= 2; }
    const m = STATS.reduce((a, k) => a + W[k] * s[k], 0); STATS.forEach(k => s[k] -= m);
    return s;
  }
  function setStats(G) {
    const age = G.age, t = targetOvr(G, age), st = {};
    STATS.forEach(k => {
      let v = t + G.shape[k] + (G.train[k] || 0);
      if (age >= 30 && (k === 'FIT' || k === 'PAC')) v -= (age - 29) * 0.4;
      if (age >= 28 && (k === 'MEN' || k === 'RAC')) v += 1;
      st[k] = clamp(Math.round(v), 25, 99);
    });
    G.stats = st;
    G.tot.peak = Math.max(G.tot.peak, ovrOf(st));
  }

  /* ---------- creation ---------- */
  function newGame(o) {
    const startAge = o.startAge === 16 ? 16 : 7;
    const G = {
      v: 2, name: o.name || 'Driver', nat: o.nat || 'GB', arch: o.arch || 'allround', age: startAge, season: 1, year: START_YEAR,
      tier: (o.tier === undefined || o.tier === null || o.tier === '') ? rollTier() : +o.tier, shape: rollShape(o.arch), train: {}, stats: {}, rep: 0, sponsor: 1, academy: null, buzz: 0,
      cat: startAge === 16 ? 'f4' : 'kart1', team: null, contract: 0, seasonsInCat: 0, deal: { cost: 0, sal: 0 },
      history: [], standIns: [], tot: { races: 0, wins: 0, podiums: 0, poles: 0, earn: 0, peak: 0, trophies: {}, titles: {} },
      tr: {}, trPrev: {}, gen: {}, names: {}, churn: {}, dyn: {}, f1: null, family: 0, wealth: 'middle', sponsorDeals: [], f1Years: 0, titleStreak: 0, reserve: null, demoted: false, agent: '', phase: 'intro', S: null, market: null, news: null, last: null,
    };
    { const r = rnd(); G.wealth = (o.wealth && WEALTH[o.wealth]) ? o.wealth : r < 0.27 ? 'poor' : r < 0.68 ? 'middle' : r < 0.92 ? 'rich' : 'dynasty';
      const W = WEALTH[G.wealth]; G.family = Math.round(W.base * Math.exp(gauss() * W.sd) * (startAge === 16 ? 0.7 : 1)); G.sponsor = W.sponsor; }
    G.agent = freshName(G, 'agent');
    G.rep = startAge === 16 ? [46, 52, 56, 62, 72][G.tier] + gauss() * 3 : 12 + rnd() * 8;
    Object.values(CATS).forEach(C => {
      G.tr[C.id] = {};
      if (C.dyn) { G.dyn[C.id] = { str: {}, trend: {}, streak: 0, last: null, regime: C.id === 'f1' ? 'dominant' : 'close', relEra: C.id === 'f1' ? 1.7 : 1, gapEra: C.id === 'f1' ? 1.45 : 1, relTeam: {} }; C.teams.forEach(t => { G.dyn[C.id].str[t[0]] = t[1]; G.dyn[C.id].trend[t[0]] = 0; G.dyn[C.id].relTeam[t[0]] = C.id === 'f1' ? clamp(1 + gauss() * 0.3, 0.6, 1.8) : 1; }); }
      setTR(G, C.id);
    });
    initF1(G);
    setStats(G);
    rerollClub(G);
    return G;
  }
  function rerollStats(G) { G.shape = rollShape(G.arch); setStats(G); }
  function rerollClub(G) {
    const C = CATS[G.cat];
    let t;
    if (G.age === 16) { const arr = C.teams.slice().sort((a, b) => a[1] - b[1]); t = arr[Math.floor(rnd() * Math.ceil(arr.length * (0.4 + 0.12 * G.tier)))]; }
    else t = pick(C.teams.slice(2));
    G.team = t[0]; G.contract = 1; G.deal = { cost: costOf(G, G.cat, t[0]), sal: 0 };
  }

  /* ---------- team strength: spec series are static, dynamic series cycle ---------- */
  function setTR(G, c) {
    const C = CATS[c];
    C.teams.forEach(t => { G.tr[c][t[0]] = R1(C.lvl + (C.dyn ? G.dyn[c].str[t[0]] : t[1] * (C.eqK || 0.4))); });
  }
  const isElite = (G, c, team) => {
    const C = CATS[c]; if (C.elite.includes(team)) return true;
    if (c === 'f1') return G.f1.teams[team].some(d => !d.player && d.ski >= 91);
    return false;
  };
  // the front of the grid is usually tight (think 2024 McLaren v Red Bull); a runaway team (2026 Mercedes) is the exception
  function compressTop(d, names, k, f) {
    const sorted = names.slice().sort((a, b) => d.str[b] - d.str[a]), top = sorted.slice(0, k), m = top.reduce((a, n) => a + d.str[n], 0) / k;
    top.forEach(n => { d.str[n] = m + f * (d.str[n] - m); });
    // the chasing pack sits clearly behind the contenders, so the title is a fight between 2-3 teams
    const floor = Math.min(...top.map(n => d.str[n])) - 2.5;
    sorted.slice(k).forEach(n => { if (d.str[n] > floor) d.str[n] = floor - Math.random() * 0.8; });
  }
  function evolveCat(G, c, champ) {
    const C = CATS[c], d = G.dyn[c], ny = G.year + 1, reg = C.regYears.includes(ny), names = C.teams.map(t => t[0]);
    if (reg) {
      // a reset shuffles the order, but the established powerhouses keep most of their edge
      names.forEach(n => { const base = teamDef(c, n)[1], el = (C.elite || []).includes(n); d.str[n] = clamp((el ? 0.85 : 0.5) * base + gauss() * (el ? 1.8 : 2.8), -(C.sMax || 8), C.sMax || 8); d.trend[n] = (el ? -0.08 : -0.2) * d.str[n] + gauss() * 0.7; });
      d.streak = 0; d.last = null;
      d.regime = rnd() < 0.25 ? 'dominant' : 'close';
      d.relEra = 1.7; d.gapEra = c === 'f1' ? 1.45 : 1.55; names.forEach(n => { d.relTeam[n] = clamp(1 + gauss() * 0.3, 0.6, 1.8); });
      if (d.regime === 'close') compressTop(d, names, 4, 0.4);
      else { const lead = names.slice().sort((a, b) => d.str[b] - d.str[a])[0]; d.str[lead] += 2.2; }
    } else {
      if (d.regime === 'dominant' && rnd() < 0.3) d.regime = 'close';
      d.relEra = 1 + (d.relEra - 1) * 0.6; { const lastReg = Math.max(...C.regYears.filter(y => y <= ny), 2026), age = ny - lastReg, tgt = age <= 2 ? 1 : age === 3 ? 0.9 : age === 4 ? 0.8 : 0.72; d.gapEra = tgt + (d.gapEra - tgt) * 0.72; }   // fields converge the longer the rules stay stable
      names.forEach(n => { d.relTeam[n] = clamp(1 + (d.relTeam[n] - 1) * 0.7 + gauss() * 0.08, 0.6, 1.8); });
      names.forEach(n => { const base = teamDef(c, n)[1], el = (C.elite || []).includes(n); d.str[n] += d.trend[n] + gauss() * (el ? 0.8 : 1.1) + 0.15 * ((el ? 0.85 : 0.6) * base - d.str[n]); d.trend[n] *= 0.8; });
      if (champ) {
        d.streak = d.last === champ ? d.streak + 1 : 1; d.last = champ;
        const el = isElite(G, c, champ);
        if (d.streak === 1) d.str[champ] += 0.9; else if (d.streak === 2) d.str[champ] -= el ? 0.4 : 1.8; else d.str[champ] -= el ? 1.8 : 3.2;
        if (d.streak >= 2) names.filter(n => n !== champ).sort((a, b) => d.str[b] - d.str[a]).slice(0, 3).forEach(n => d.str[n] += 1.0);
      }
      if (d.regime !== 'dominant') compressTop(d, names, 4, 0.85);
      names.forEach(n => d.str[n] = clamp(R1(d.str[n]), -(C.sMax || 8) - 1, (C.sMax || 8) + 1));
    }
    enforceFloors(G, c);
    setTR(G, c);
  }
  function enforceFloors(G, c) {
    const C = CATS[c], d = G.dyn[c], names = C.teams.map(t => t[0]);
    (C.floors || []).forEach(([team, floor]) => {
      const order = names.slice().sort((a, b) => d.str[b] - d.str[a]);
      if (order.indexOf(team) + 1 > floor && rnd() < 0.96) d.str[team] = R1(d.str[order[floor - 1]] + 0.05);
    });
  }

  /* ---------- helpers ---------- */
  const teamDef = (cat, name) => CATS[cat].teams.find(t => t[0] === name);
  const seats = (cat, name) => teamDef(cat, name)[3] || CATS[cat].dpt;
  const pf = (G, cat, name) => {
    const C = CATS[cat];
    if (C.dyn) return clamp((G.tr[cat][name] - (C.lvl - 10)) / 20, 0, 1);
    const offs = C.teams.map(t => t[1]); const mn = Math.min(...offs), mx = Math.max(...offs);
    return mx === mn ? 0.5 : (teamDef(cat, name)[1] - mn) / (mx - mn);
  };
  const costOf = (G, cat, name) => { const C = CATS[cat]; return C.pay ? Math.round(lerp(C.cost[0], C.cost[1], pf(G, cat, name))) : 0; };
  const salOf = (G, cat, name) => {
    const C = CATS[cat];
    if (cat === 'f1') {
      const rank = C.teams.map(t => t[0]).sort((a, b) => G.tr.f1[b] - G.tr.f1[a]).indexOf(name), frac = 1 - rank / (C.teams.length - 1);
      const titles = Math.min(5, (G.tot.trophies['F1 World Champion'] || 0));
      return Math.round(lerp(1500, 35000, Math.pow(frac, 1.2)) * (0.45 + 1.2 * Math.pow(G.rep / 100, 2) + 0.18 * titles));
    }
    return C.pay ? 0 : Math.round(lerp(C.sal[0], C.sal[1], Math.pow(pf(G, cat, name), 1.8)) * (0.35 + G.rep / 160));
  };
  const funding = G => 8 * Math.exp(0.075 * G.rep) * G.sponsor;
  const coverNeeded = (G, cat, name) => { const c = costOf(G, cat, name); return Math.max(0, c - Math.min(c, funding(G) * 0.6)); };
  const affordable = (G, cat, name) => { const C = CATS[cat]; return !C.pay || (G.academy && C.tier >= 1 && C.tier <= 3) || coverNeeded(G, cat, name) <= G.family; };

  function freshName(G, cat) {
    const reg = { sf: 'JP', sfl: 'JP', indy: 'US', nxt: 'US' };
    const nat = (reg[cat] && rnd() < 0.8) ? reg[cat] : pick(Object.keys(NATS)); const N = NATS[nat];
    let nm, g = 0; const used = new Set(Object.values(G.gen).concat(Object.values(G.names)));
    do { nm = pick(N.first) + ' ' + pick(N.last); } while (used.has(nm) && g++ < 30);
    return nm;
  }
  function seatName(G, cat, team, i) {
    const key = cat + '|' + team + '|' + i;
    if (G.names[key] !== undefined) return G.names[key];
    const real = teamDef(cat, team)[2] ? teamDef(cat, team)[2].split('|') : [];
    if (real[i]) return real[i];
    return G.gen[key] || (G.gen[key] = freshName(G, cat));
  }
  function churnSeats(G, cat) {
    if (cat === 'f1') return; // F1 uses the live driver pool
    const since = G.year - (G.churn[cat] === undefined ? START_YEAR : G.churn[cat]);
    G.churn[cat] = G.year; if (since <= 0) return;
    const p = 1 - Math.pow(1 - ({ f4: 0.6, f3: 0.5, f2: 0.45 }[cat] || (CATS[cat].dyn ? 0.12 : 0.35)), since);
    CATS[cat].teams.forEach(t => { for (let i = 0; i < seats(cat, t[0]); i++) if (rnd() < p) G.names[cat + '|' + t[0] + '|' + i] = freshName(G, cat); });
  }
  function roster(G, cat, team) {
    if (cat === 'f1') return G.f1.teams[team].map(d => d.player ? G.name : d.name);
    return Array.from({ length: seats(cat, team) }, (_, i) => seatName(G, cat, team, i));
  }

  /* ---------- F1 driver pool (retirements, rookies, free agents) ---------- */
  function initF1(G) {
    G.f1 = { teams: {}, free: [], queue: ROOKIES.slice(), retired: [] };
    CATS.f1.teams.forEach(t => { G.f1.teams[t[0]] = t[2].split('|').map(n => { const [b, k] = F1P[n]; return { name: n, birth: b, ski: k, pot: k + clamp((26 - (START_YEAR - b)) * 0.9, 0, 8) }; }); });
  }
  function newRookie(G) {
    const name = G.f1.queue.length ? G.f1.queue.shift() : freshName(G, 'f1');
    let r = rnd(), ti = 0; const pr = [0.28, 0.38, 0.12, 0.16, 0.06];
    for (; ti < 4; ti++) { r -= pr[ti]; if (r <= 0) break; }
    const pot = R1(84 + TIERS[ti].adv[5] + gauss() * 0.8);
    return { name, birth: G.year + 1 - 20 - (rnd() < 0.4 ? 1 : 0), ski: R1(pot - 5.5 + gauss() * 1.2), pot };
  }
  function fillSlot(G) {
    G.f1.free.sort((a, b) => b.ski - a.ski);
    if (G.f1.free.length && G.f1.free[0].ski >= 77 && rnd() < 0.8) return G.f1.free.shift();
    return newRookie(G);
  }
  function vacateF1(G) {
    Object.keys(G.f1.teams).forEach(t => { G.f1.teams[t] = G.f1.teams[t].map(d => d.player ? fillSlot(G) : d); });
  }
  function enterF1(G, team) {
    const slots = G.f1.teams[team];
    if (slots.some(d => d.player)) return;
    let wi = 0; slots.forEach((d, i) => { if (d.ski < slots[wi].ski) wi = i; });
    G.f1.free.push(slots[wi]); slots[wi] = { player: true, name: G.name };
  }
  const retP = a => a <= 34 ? 0.01 : a === 35 ? 0.04 : a === 36 ? 0.08 : a === 37 ? 0.14 : a === 38 ? 0.22 : a === 39 ? 0.34 : a === 40 ? 0.5 : a === 41 ? 0.7 : 0.95;
  const RETIRE_BIAS = { 'Nico Hülkenberg': 0.18, 'Sergio Pérez': 0.15, 'Valtteri Bottas': 0.15 };
  function tickF1(G) {
    const out = [];
    const age = d => G.year - d.birth;
    const step = d => { const a = age(d); d.ski = clamp(R1(a <= 27 ? Math.min(d.pot, d.ski + 1.6) + gauss() * 0.6 : a <= 32 ? d.ski + gauss() * 0.5 : d.ski - (a <= 35 ? 0.9 : 1.6) + gauss() * 0.5), 68, 97); };
    Object.keys(G.f1.teams).forEach(t => {
      G.f1.teams[t].forEach((d, i) => {
        if (d.player) return;
        const a = age(d);
        const scripted = RETIRE_2028.includes(d.name), forced = scripted && G.year >= 2028;
        const p = scripted ? 0 : retP(a) + (a >= 36 ? (RETIRE_BIAS[d.name] || 0) : 0) + (a < 33 && d.ski < 76 ? 0.12 : 0);
        if (forced || rnd() < p) { out.push({ name: d.name, age: a, team: t, dropped: a < 33 }); G.f1.retired.push(d.name); G.f1.teams[t][i] = null; }
        else step(d);
      });
    });
    G.f1.vac = out.map(r => r.team);
    G.f1.free.forEach(step);
    G.f1.free = G.f1.free.filter(d => age(d) < 40 && rnd() < 0.55);
    Object.keys(G.f1.teams).forEach(t => { G.f1.teams[t] = G.f1.teams[t].map(d => d || fillSlot(G)); });
    return out;
  }

  /* ---------- season setup ---------- */
  function startSeason(G) {
    const C = CATS[G.cat];
    churnSeats(G, G.cat);
    const drivers = [];
    if (G.cat === 'f1') enterF1(G, G.team);
    C.teams.forEach(t => {
      const name = t[0], car = G.tr[C.id][name];
      if (C.id === 'f1') {
        G.f1.teams[name].forEach(d => { const isP = !!d.player; drivers.push({ id: drivers.length, name: isP ? G.name : d.name, team: name, car, skill: isP ? 0 : 84 + 0.85 * (d.ski - 84) * (G.year - d.birth <= 19 ? 0.55 : G.year - d.birth === 20 ? 0.72 : G.year - d.birth === 21 ? 0.86 : G.year - d.birth === 22 ? 0.95 : 1) + gauss() * 1.3, isPlayer: isP, pts: 0, w: 0, p: 0, pole: 0, races: 0, dnf: 0, tb: rnd() }); });
        return;
      }
      roster(G, C.id, name).forEach((nm, i) => {
        const isP = name === G.team && i === seats(C.id, name) - 1;
        drivers.push({ id: drivers.length, name: isP ? G.name : nm, team: name, car, skill: C.lvl + 0.4 * (car - C.lvl) + gauss() * 3.5, isPlayer: isP, pts: 0, w: 0, p: 0, pole: 0, races: 0, dnf: 0, tb: rnd() });
      });
    });
    const S = G.S = { cat: G.cat, round: 0, drivers, log: [], boost: gauss() * 1.3, carMod: 0, injured: 0, tmp: 0, tmpUntil: 0, wheelDue: false, spins: 0, stageEnds: [Math.floor(C.rounds / 3), Math.floor(2 * C.rounds / 3)], euro: false, wcWin: false, trophies: [], over: false, notes: [], mode: 'balance', teams: [G.team], famPaid: 0, regime: G.dyn[G.cat] ? G.dyn[G.cat].regime : 'dominant' };
    // first year in a new category is a learning year: slow start, form arriving late in the season
    S.learn = G.history.some(h => h.cat === G.cat) ? 0 : (G.cat === 'f1' ? 1.5 : C.tier === 0 ? (G.history.length ? 2.2 : 0) : 4.2);
    // F1 rookies take time: years 1-2 are a learning curve, year 3 is where it starts to click, then full ceiling
    if (G.cat === 'f1') { S.exp = [0.3, 0.48, 0.76, 0.93, 1][Math.min(G.f1Years, 4)]; S.boost -= [1.5, 1, 0.5, 0, 0][Math.min(G.f1Years, 4)]; }
    // F1 know-how carries over to other series
    if (TIER3_SIDE.includes(G.cat) && G.f1Years > 0) S.boost += Math.min(5, G.f1Years * 0.5);
    // champions tend to go back to back; a third in a row is hard unless you are a top-3 tier talent
    if (G.cat === 'f1' && G.titleStreak > 0) S.carMod += G.titleStreak === 1 ? 1.2 : (G.tier >= 2 ? 0.4 : -3);
    // seat bill: sponsors cover part, family funds cover the rest (academies pay in F4-F2)
    if (C.pay && !(G.academy && C.tier >= 1 && C.tier <= 3)) {
      const c = G.deal.cost; S.famPaid = Math.max(0, c - Math.min(c, funding(G) * 0.6)); G.family = Math.max(0, G.family - S.famPaid);
    }
    G.phase = 'season'; G.market = null; G.pendingEnd = null;
  }
  const player = G => G.S.drivers.find(d => d.isPlayer);
  const standings = G => G.S.drivers.slice().sort((a, b) => b.pts - a.pts || b.w - a.w || b.p - a.p || a.tb - b.tb);
  const note = (G, text) => { G.S.log.push({ note: true, text }); };

  /* Red Bull family rules: Racing Bulls first, mid-season promotion/demotion */
  function moveF1(G, newTeam) {
    const old = G.team, A = G.f1.teams[old], B = G.f1.teams[newTeam], ai = A.findIndex(d => d.player);
    if (ai < 0) return;
    let wi = 0; B.forEach((d, i) => { if (d.ski < B[wi].ski) wi = i; });
    const disp = B[wi]; B[wi] = { player: true, name: G.name }; A[ai] = disp;
    G.team = newTeam; G.S.teams.push(newTeam);
    const P = player(G), Dd = G.S.drivers.find(d => !d.isPlayer && d.name === disp.name);
    if (P) { P.team = newTeam; P.car = G.tr.f1[newTeam]; } if (Dd) { Dd.team = old; Dd.car = G.tr.f1[old]; }
    G.deal = { cost: 0, sal: salOf(G, 'f1', newTeam) };
  }
  function rbEvent(G) {
    if (G.cat !== 'f1' || !G.academy || !G.academy.n.startsWith('Red Bull') || G.S.round < 3 || G.S.injured > 0) return;
    const S = G.S, tb = standings(G), pos = tb.findIndex(d => d.isPlayer) + 1, mate = S.drivers.find(d => d.team === G.team && !d.isPlayer), elite = G.tier >= 2;
    if (G.team === 'Racing Bulls') {
      if (rnd() < (pos <= 6 ? (elite ? 0.02 : 0.008) : 0)) { moveF1(G, 'Red Bull Racing'); G.rep = Math.min(100, G.rep + 3); note(G, '📈 Red Bull promote you from Racing Bulls mid-season.'); }
    } else if (G.team === 'Red Bull Racing') {
      const helps = pos <= 6 && mate && mate.w > 0;
      let p = elite ? 0.012 : helps ? 0.02 : 0.07; if (pos > 10) p = Math.max(p, elite ? 0.05 : 0.12);
      if (rnd() < p) { moveF1(G, 'Racing Bulls'); G.rep = Math.max(5, G.rep - 3); note(G, '📉 Red Bull send you back to Racing Bulls.'); }
    }
  }

  /* ---------- race sim ---------- */
  const SPR = [8, 7, 6, 5, 4, 3, 2, 1];
  function playRound(G) {
    const S = G.S, C = CATS[S.cat];
    if (S.round >= C.rounds) return null;
    const st = G.stats, P = player(G), ri = S.round;
    // F1 in-season swings: upgrade races between the top cars, and form that gives the chaser a push when the title is close
    if (C.id === 'f1') {
      const cs = S.drivers.map(d => d.car).filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => y - x);
      if (S.fg === undefined) { S.fg = cs[0] - cs[1]; S.dev = {}; S.dom = G.dyn.f1 && G.dyn.f1.regime === 'dominant'; S.domTeam = S.drivers.slice().sort((x, y) => y.car - x.car)[0].team; }
      const open = S.dom ? 0.35 : S.fg < 2.5 ? 1 : 0.55;
      C.teams.slice(0, 11).forEach(t => { const n = t[0], k = cs.indexOf(G.tr.f1[n]); if (k >= 0 && k <= 3) S.dev[n] = Math.max(-1.6, Math.min(k <= 1 ? 1.6 : 0.5, (S.dev[n] || 0) * 0.93 + gauss() * 0.16 * open)); });
      const ranked = S.drivers.filter(d => d.pts > 0 || S.round > 2).slice().sort((x, y) => y.pts - x.pts), lead = ranked[0] ? ranked[0].pts : 0;
      const cf = d => { const k = cs.indexOf(d.car); return k <= 1 ? 1 : k === 2 ? 0.3 : 0.08; };   // talent can't drag a third-best-or-worse car to a title: only the two fastest cars give a driver full upside
      S.drivers.forEach(d => { if (d.sf === undefined) d.sf = d.isPlayer ? 0 : gauss() * 0.85; d.form = d.sf > 0 ? d.sf * cf(d) : d.sf; });   // season-long form: some drivers click with the car, some don't
      if (S.dom && S.t2 === undefined) { const tm = S.drivers.filter(d => d.team === S.domTeam && !d.isPlayer).sort((x, y) => y.skill - x.skill); S.t2 = tm.length > 1 ? { id: tm[1].id, v: rnd() < 0.5 ? -(1 + rnd() * 2) : -rnd() * 0.8 } : false; }
      if (S.dom && S.t2) { const d2 = S.drivers.find(d => d.id === S.t2.id); if (d2) d2.form += S.t2.v; }
      // the season's title script, drawn to match real history: ~30% finale-tight (<=10), ~25% 11-70, ~25% 71-130, ~20% runaway (130+)
      if (!S.scr) { const w = S.dom ? [0.02, 0.08, 0.26, 0.64] : [0.40, 0.29, 0.25, 0.06], r0 = rnd() * (w[0] + w[1] + w[2] + w[3]); let k = 0, acc = w[0]; while (k < 3 && r0 > acc) acc += w[++k];
        S.scr = { k, M: [rnd() * 10, 11 + rnd() * 52, 80 + rnd() * 50, 139 + rnd() * rnd() * 170][k] }; }
      if (S.round >= Math.floor(C.rounds / 2) && ranked[0] && cs.indexOf(ranked[0].car) >= 2) {   // a title leader outside the two fastest cars gets reeled in
        const top2 = ranked.filter(d => cs.indexOf(d.car) <= 1 && !d.isPlayer)[0];
        if (top2 && ranked[0].pts - top2.pts < 80 && !ranked[0].isPlayer) { top2.form += 1.6; ranked[0].form -= 1.0; }
      }
      if (S.round >= 2 && ranked.length > 1 && !ranked[0].isPlayer && !ranked[1].isPlayer) {   // the script only runs AI-vs-AI fights; a player in the title fight is left to the cars and drivers
        const R = C.rounds, a = ranked[0], b = ranked[1], m = a.pts - b.pts, tgt = S.scr.M * Math.pow(S.round / R, 0.85), err = tgt - m, g = Math.min(S.scr.k === 3 ? 16 : 9, 0.12 * Math.abs(err) * (1 + 3 * S.round / R)) * Math.sign(err);
        const hu = !a.isPlayer, ch = !b.isPlayer;   // never steer the player: only the AI side of the fight
        if (g > 0) ranked.slice(1, 4).forEach(d => { if (!d.isPlayer) d.form -= g * (d === b ? 1 : 0.7); });   // fight too close for the script: everyone chasing falls back
        else if (ch) b.form -= g * (g < 0 ? cf(b) : 1);
        if (hu) a.form += g * (g > 0 ? 0.1 * cf(a) : 1);
      }
    }
    const wet = rnd() < 0.18, out = S.injured > 0;
    const evIdx = C.events ? C.events.findIndex(e => ri >= e.from && ri <= e.to) : -1;
    const tmp = S.round < S.tmpUntil ? S.tmp : 0;
    const Dq = 0.35 * st.PAC + 0.45 * st.QUA + 0.1 * st.MEN + 0.1 * st.CON;
    const Dr = 0.28 * st.PAC + 0.28 * st.RAC + 0.14 * st.CON + 0.14 * st.TYR + 0.08 * st.MEN + 0.08 * st.FIT;
    const wetAdj = wet ? (st.WET - 60) * 0.3 : 0;
    if (S.fit === undefined) S.fit = gauss() * (C.fitK !== undefined ? C.fitK : (C.tier >= 1 && C.tier <= 3 ? 3.2 : 1.2));   // how well the car/series suits you this year
    const bonus = S.boost + tmp + S.fit - (S.learn || 0) * Math.max(0, 1 - 1.25 * ri / C.rounds);
    const mode = S.mode || 'balance', RAC = st.RAC, sigK = (C.sigK || 1) * (S.dom ? 1 : 1), dnfK = C.dnfK || 1, K = C.spread || 1, wS = C.wS || 0.55;
    const active = S.drivers.filter(d => !(d.isPlayer && out));
    // units: one per driver, or one per car in crew series (WEC / GT): crew-mates share the result
    const units = [];
    if (C.crew) { const m = {}; active.forEach(d => { (m[d.team] = m[d.team] || { members: [], team: d.team, car: d.car }).members.push(d); }); Object.values(m).forEach(u => units.push(u)); }
    else active.forEach(d => units.push({ members: [d], team: d.team, car: d.car }));
    units.forEach(u => { u.hasP = u.members.some(d => d.isPlayer); });
    const uSkill = (u, pv) => u.members.reduce((a, d) => a + (d.isPlayer ? (S.exp !== undefined ? C.lvl + (pv - C.lvl) * S.exp : pv) + bonus + wetAdj : d.skill) + (d.form || 0), 0) / u.members.length;   // rookies only show part of their ceiling
    const carRankK = c => C.id === 'f1' ? S.drivers.map(d => d.car).filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => y - x).indexOf(c) : -1;
    const uCar = u => u.car + (u.hasP ? S.carMod : 0) + (S.dev ? (S.dev[u.team] || 0) + (carRankK(u.car) === 0 ? 1.1 : carRankK(u.car) === 1 ? 0.5 : carRankK(u.car) === 2 ? -0.6 : carRankK(u.car) === 3 ? -1.0 : 0) : 0) + (S.dom && S.domTeam === u.team ? 0 : 0);
    const uP = units.find(u => u.hasP);
    // car/driver interplay: in a poor car the car caps what the driver can do; in a good car talent is what separates the cars
    const cMean = units.reduce((t, u) => t + uCar(u), 0) / units.length, cSd = Math.sqrt(units.reduce((t, u) => t + (uCar(u) - cMean) ** 2, 0) / units.length) || 1;
    const carRank = C.id === 'f1' ? units.map(u => u.car).filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => y - x) : null;
    const wOf = u => wS * (0.6 + 0.8 / (1 + Math.exp(-1.6 * (uCar(u) - cMean) / cSd))) * (carRank ? (carRank.indexOf(u.car) <= 1 ? 1 : carRank.indexOf(u.car) === 2 ? 0.78 : 0.62) : 1);   // outside the two fastest cars the machinery caps what talent can do
    const mixOf = (u, pv) => { const w = wOf(u); return w * uSkill(u, pv) + (1 - w) * uCar(u); };

    const fp = null;
    // in a close era nobody runs away with it: the best pace is shaved back towards the next best
    // title fights follow the car gap: ~1pt between the best cars = three-way fight, ~2pts = a two-way fight if the other driver is good, 4+ = a runaway
    const capClose = (arr, key) => { if (!C.dyn) return; const o = arr.slice().sort((a, b) => b[key] - a[key]); if (o.length < 3) return; const c1 = o[0][key], c2 = o[1][key], c3 = o[2][key];
      const shave = gap => 0.75 * Math.max(0, 1 - Math.max(0, gap - 0.4) / 4.2);
      const g1 = Math.max(0, o[0].car - Math.max(o[1].car, o[2].car)), g2 = Math.max(0, Math.max(o[1].car, o[2].car) - o[3 % o.length].car);
      o[0][key] = c2 + (1 - shave(S.regime === 'dominant' ? g1 * 2.4 : g1)) * (c1 - c2);
      if (o[1].team !== o[0].team || true) o[1][key] = c3 + (1 - 0.8 * shave(g2)) * (c2 - c3); };
    const spreadOf = (key, pv) => { units.forEach(u => { u[key] = mixOf(u, pv); }); capClose(units, key); const m = units.reduce((a, u) => a + u[key], 0) / units.length; units.forEach(u => { u[key] = m + K * (u[key] - m); }); };
    spreadOf('q', Dq);
    if (C.id === 'f1') { const tq = {}; units.forEach(u => { (tq[u.team] = tq[u.team] || []).push(u); }); Object.values(tq).forEach(g => { const m = g.reduce((t, u) => t + u.q, 0) / g.length; g.forEach(u => { u.q = m + (S.dom && S.domTeam === u.team ? 0.38 : 0.5) * (u.q - m); }); }); }   // same car: teammates' one-lap pace sits closer than their race pace
    units.forEach(u => { u.q += gauss() * (wet ? 2.6 : (C.id === 'f1' ? 1.4 : 2.2)) + (C.id === 'f1' && rnd() < 0.13 ? -(1.2 + rnd() * 3.2) : 0) + (S.dom && S.domTeam === u.team ? 2.4 : 0) - (C.id === 'f1' && ri >= 5 ? u.members.reduce((m, d) => Math.max(m, Math.max(0, d.pole / ri - 0.63) * 14), 0) : 0); });   // sustained pole streaks regress: nobody takes 19 of 24   // bad Saturdays (traffic, mistakes, red flags); a dominant car also qualifies further clear
    const qOrder = units.slice().sort((a, b) => b.q - a.q);
    const qpos = out ? null : qOrder.indexOf(uP) + 1;
    // weekend character: gaps breathe from one event to the next, bigger in the wet and in a dominant era
    const dynS = C.dyn ? G.dyn[S.cat] : null, relOf = u => dynS ? (dynS.relEra || 1) * ((dynS.relTeam && dynS.relTeam[u.team]) || 1) : 1;
    const wk = Math.exp(gauss() * 0.22), wetK = wet ? 1.35 : 1, eraK = dynS ? (dynS.gapEra || 1) * (S.regime === 'dominant' ? 1.1 : 1) : 1;
    // composite pace difference -> seconds. Some series use anchor points (pace gap at P3, P10, last) interpolated linearly.
    const qg = D => {
      D = Math.max(D, 0); const M = C.qMap;
      if (!M) return Math.pow(D, C.qG || 1);
      for (let i = 1; i < M.length; i++) if (D <= M[i][0]) return M[i - 1][1] + (M[i][1] - M[i - 1][1]) * (D - M[i - 1][0]) / (M[i][0] - M[i - 1][0]);
      const a = M[M.length - 2], b = M[M.length - 1]; return b[1] + (b[1] - a[1]) / (b[0] - a[0]) * (D - b[0]);
    }, rg = D => Math.pow(Math.max(D, 0), C.rG || 1);
    const qScale = (C.qMap ? 1 : (C.qK || 0.05)) * wk * wetK * eraK;
    let qi = null;
    if (!out && qOrder.length > 1) qi = qpos === 1 ? { pos: 1, gap: Math.max(0.001, qg(qOrder[0].q - qOrder[1].q) * qScale * Math.exp(gauss() * 0.55)), lead: true } : { pos: qpos, gap: Math.max(0.001, qg(qOrder[0].q - uP.q) * qScale), lead: false };
    if (G.dbg) (G.dbg.qt = G.dbg.qt || []).push([qOrder[0].team, qOrder[1] && qOrder[1].team]);
    if (G.dbg) G.dbg.q.push(qOrder.map(u => qg(qOrder[0].q - u.q) * qScale));
    if (qOrder.length) qOrder[0].members.forEach(d => d.pole++);

    const entry = { ev: evIdx, round: ri + 1, name: C.names[ri] || ('Round ' + (ri + 1)), wet, qpos, qi, fp, races: [], pole: !out && qOrder[0] === uP, out, field: units.length, mode };
    let prev = qOrder;
    const run = (rf, grid, isSpr) => {
      const n = grid.length;
      grid.forEach(u => { u.cb = mixOf(u, Dr); });
      capClose(grid, 'cb');
      const rm = grid.reduce((a, u) => a + u.cb, 0) / n;
      grid.forEach((u, gi) => {
        u.grid = gi + 1;
        let sig = (u.hasP ? clamp(5.6 - st.CON / 38, 3, 5) : 4.2) * sigK;
        const sprK = isSpr ? 0.5 : 1;
        let pe = (u.hasP ? clamp(0.045 - (st.CON - 60) * 0.00055, 0.012, 0.06) * (S.exp !== undefined ? 1 + (1 - S.exp) * 0.9 : 1) : 0.036) * dnfK * sprK * (wet ? 1.35 : 1);   // driver error
        let pr = 0.024 * clamp(1 + (C.lvl - uCar(u)) / (C.dyn ? 14 : 10), 0.6, 1.9) * dnfK * sprK * relOf(u);                // reliability: weaker cars and fresh regulations fail more
        let bias = 0;
        if (u.hasP) {
          if (mode === 'push') { bias = 1.2 + (RAC - 60) * 0.025; sig *= 1.25; pe *= clamp(1.6 + (60 - RAC) * 0.03, 1.15, 3.4); pr *= 1.15; }
          else if (mode === 'coast') { bias = -0.3; sig *= 0.55; pe *= 0.4; pr *= 0.8; }
        }
        u.s = rm + K * (u.cb - rm) + (n / 2 - gi) * 0.16 + bias + gauss() * (sig + (wet ? 1.5 * sigK : 0));
        u.crash = rnd() < pe + pr; u.cause = u.crash ? (rnd() < pe / (pe + pr) ? 'error' : 'reliability') : null;
      });
      if (mode === 'coast' && uP && grid.includes(uP)) { const m = grid.reduce((a, u) => a + u.s, 0) / n; uP.s = 0.85 * uP.s + 0.15 * m; }
      const res = grid.filter(u => !u.crash).sort((a, b) => b.s - a.s).concat(grid.filter(u => u.crash));
      if (C.id === 'f1' && !isSpr && ri === C.rounds - 1 && S.scr) {   // finale: the real-life title script plays out through the top two's finishing places
        const rk = S.drivers.filter(d => d.pts >= 0).slice().sort((x, y) => y.pts - x.pts), A = rk[0], B = rk[1], ua = res.find(u => u.members.includes(A)), ub = res.find(u => u.members.includes(B));
        if (ua && ub && !ua.crash && !ub.crash && !A.isPlayer && !B.isPlayer) {
          const f0 = res.filter(u => !u.crash), P = rf.pts, lim = Math.min(12, f0.length), ca = f0.indexOf(ua), cb = f0.indexOf(ub), M = S.scr.M; let best = null;
          for (let pa = 0; pa < lim; pa++) for (let pb = 0; pb < lim; pb++) {
            if (pa === pb || (A.isPlayer && pa !== ca) || (B.isPlayer && pb !== cb)) continue;
            const mg = (A.pts + (P[pa] || 0)) - (B.pts + (P[pb] || 0)), cost = Math.abs((M <= 10 ? Math.abs(mg) : mg) - M) + 0.4 * (Math.abs(pa - ca) + Math.abs(pb - cb)) + rnd() * 0.5;
            if (!best || cost < best.cost) best = { cost, pa, pb };
          }
          if (best) { const rest = f0.filter(u => u !== ua && u !== ub), nf = []; for (let i = 0, r = 0; i < f0.length; i++) nf.push(i === best.pa ? ua : i === best.pb ? ub : rest[r++]); res.splice(0, res.length, ...nf, ...res.filter(u => u.crash)); }
        }
      }
      const fin = res.filter(u => !u.crash);
      const rScale = (C.rK || 0.1) * (isSpr || rf.n === 'Sprint' || rf.n === 'Heat' ? 0.55 : 1) * wk * wetK * eraK * (rnd() < 0.22 ? 0.5 : 1); // 22%: a safety car bunches the field
      if (G.dbg && !isSpr) G.dbg.r.push(fin.map(u => rg(fin[0].s - u.s) * rScale));
      res.forEach((u, i) => u.members.forEach(d => { if (!rf.stage) d.races++; if (u.crash) { if (!rf.stage) { d.dnf++; if (u.cause === 'error') d.dnfE = (d.dnfE || 0) + 1; else d.dnfR = (d.dnfR || 0) + 1; } return; } d.pts += rf.pts[i] || 0; if (evIdx >= 0 && !isSpr) { d.ev = d.ev || []; d.ev[evIdx] = (d.ev[evIdx] || 0) + (rf.pts[i] || 0); } if (!isSpr) { if (i === 0) d.w++; if (i < 3) d.p++; } }));
      if (!out) {
        const pos = res.indexOf(uP) + 1;
        let gap = null, lead = false, laps = 0;
        if (!uP.crash && fin.length > 1) { lead = pos === 1; gap = Math.max(0.001, lead ? rg(fin[0].s - fin[1].s) * rScale * Math.exp(gauss() * 0.55) : rg(fin[0].s - uP.s) * rScale); if (!lead && C.lap && gap >= C.lap) laps = gap >= C.lap * 2.4 ? 2 : 1; }
        entry.races.push({ n: rf.n, grid: uP.grid, pos, dnf: uP.crash, cause: uP.crash ? uP.cause : null, pts: uP.crash ? 0 : (rf.pts[pos - 1] || 0), spr: !!isSpr, gap, lead, laps });
        if (!isSpr && pos === 1 && !uP.crash) { if (C.special && C.special[ri]) S.trophies.push(C.special[ri]); }
      }
      return res;
    };
    if (C.sprints && C.sprints.includes(ri)) {
      units.forEach(u => { u.sq = mixOf(u, Dq) + gauss() * (wet ? 3.8 : 2.6); });
      run({ n: 'Sprint', pts: SPR }, units.slice().sort((a, b) => b.sq - a.sq), true);
      entry.sprint = true;
    }
    C.rf.forEach(rf => {
      let grid;
      if (rf.grid === 'q') grid = qOrder.slice();
      else if (rf.grid === 'prev') grid = prev.slice();
      else { const k = +rf.grid.replace('rev', ''); grid = qOrder.slice(); grid = grid.slice(0, k).reverse().concat(grid.slice(k)); }
      prev = run(rf, grid, !!rf.stage);   // NASCAR stages score stage points only: no wins, light incident rate
    });
    S.log.push(entry);
    S.round++;
    if (S.injured > 0) S.injured--;
    rbEvent(G);
    if (S.round >= C.rounds) S.over = true;
    else if (S.spins < 2 && S.round >= S.stageEnds[S.spins]) S.wheelDue = true;
    return entry;
  }
  function simToEnd(G) { while (!G.S.over && !G.S.wheelDue) playRound(G); }
  function setMode(G, m) { if (G.S) G.S.mode = m; }

  // standings for one competition (index into the series' events, or -1 for the whole championship)
  function standingsEv(G, i) {
    const S = G.S, C = CATS[S.cat], val = d => (i < 0 || !C.events) ? d.pts : ((d.ev && d.ev[i]) || 0);
    return S.drivers.slice().sort((a, b) => val(b) - val(a) || b.pts - a.pts || a.tb - b.tb).map(d => ({ d, v: val(d) }));
  }
  // one row per competition in the season: position, points and the points gap (lead over P2 if first, deficit to P1 otherwise)
  function compTable(G) {
    const S = G.S, C = CATS[S.cat], P = player(G);
    const defs = C.events || [{ n: C.short + ' championship', from: 0, to: C.rounds - 1, main: true, title: C.titleName }];
    return defs.map((ev, i) => {
      const key = C.events ? i : -1, val = d => key < 0 ? d.pts : ((d.ev && d.ev[key]) || 0);
      let rows = S.drivers.slice().sort((a, b) => val(b) - val(a) || b.pts - a.pts || a.tb - b.tb);
      if (C.crew && key < 0) { const seen = [], teams = []; rows.forEach(d => { if (!seen.includes(d.team)) { seen.push(d.team); teams.push({ team: d.team, v: val(d) }); } }); const me = teams.findIndex(t => t.team === P.team); rows = teams; var pos = me + 1, mine = teams[me].v; }
      else { var pos = rows.indexOf(P) + 1, mine = val(P); }
      const v = r => r.v !== undefined ? r.v : val(r), lead = pos === 1, gap = lead ? mine - (rows[1] ? v(rows[1]) : 0) : v(rows[0]) - mine;
      const total = ev.to - ev.from + 1, done = Math.max(0, Math.min(total, S.round - ev.from));
      return { n: ev.n, pos, N: rows.length, pts: mine, lead, gap, main: !!ev.main, wc: !!ev.wc, title: ev.title || null, done, total, status: done === 0 ? 'next' : done >= total ? 'final' : 'live' };
    });
  }

  /* ---------- the wheel (3 stages -> 2 spins a season). good and bad outcomes carry equal total weight ---------- */
  function wheelList(G) {
    const S = G.S, C = CATS[S.cat], tb = standings(G), pos = tb.findIndex(d => d.isPlayer) + 1, N = tb.length;
    const low = pos > N * 0.7;
    const lastSI = G.standIns.length ? G.standIns[G.standIns.length - 1].year : -99;
    const f1Path = ['f2', 'sf', 'indy', 'wec', 'fe', 'imsa', 'nascar', 'dtm', 'supercars', 'gt3w'].includes(S.cat) && G.age <= 31 && (G.academy || G.reserve || G.rep >= 62)
      && (G.year - lastSI) >= (G.reserve ? 2 : 3) && !G.history.some(h => h.cat === 'f1') && !G.demoted;
    const L = [
      { id: 'upgrade', g: 1, w: 13, ic: '🔧', t: 'Car upgrade', fx: 'Your car is +2.5 rating for the rest of the season.' },
      { id: 'breakthrough', g: 1, w: 11, ic: '⚡', t: 'Breakthrough', fx: 'One random attribute jumps +3 (permanent).' },
      { id: 'engineer', g: 1, w: 9, ic: '🎧', t: 'Engineer clicks', fx: '+2 pace for the rest of the season.' },
      { id: 'form', g: 1, w: 6, ic: '🔥', t: 'Purple patch', fx: 'Red-hot form: +4 pace for the rest of the season.' },
      { id: 'sponsorNew', g: 1, w: 9, ok: C.pay, ic: '💷', t: 'New sponsor', fx: 'Funding +35%. Opens bigger seats next summer.' },
      { id: 'academy', g: 1, w: 9, ok: !G.academy && G.rep >= 40 && C.tier >= 1 && C.tier <= 3 && G.age <= 24, ic: '🎓', t: 'Academy signing', fx: 'A manufacturer academy pays your seat in F4–F2, +4 rep, yearly development boost and priority from its F1 team. It can drop you after a bad year (Red Bull drops far more often).' },
      { id: 'standIn', g: 1, w: G.reserve ? 14 : 4, ok: f1Path, ic: '🚨', t: 'F1 stand-in', fx: 'You replace an injured F1 driver for 1–4 grands prix (you miss 1–2 rounds here). Your F1 results show up, then you return to your series. Points boost rep and F1 interest.' },
      { id: 'fp1', g: 1, w: 8, ok: !!G.academy && C.tier >= 1 && C.tier <= 3, ic: '🏎️', t: 'FP1 outing', fx: 'Your academy puts you in an F1 car for Friday practice. Where you finish decides how much rep you earn (+1 to +3).' },
      { id: 'crash', g: -1, w: 3, ic: '💥', t: 'Heavy crash', fx: 'A big shunt. You miss the next round (very rarely two) and lose 1 Fitness. Rare in real life, so the slice is small.' },
      { id: 'sponsorLost', g: -1, w: 9, ok: C.pay && C.tier <= 3, ic: '📉', t: 'Sponsor backs out', fx: 'Funding −30% for good. Pay-to-drive series get pricier to afford, so next summer you see fewer or weaker seats.' },
      { id: 'badup', g: -1, w: 7, ok: C.tier >= 1, ic: '🛠️', t: 'Reliability woes', fx: 'A bad development path: car −2 rating for the rest of the season.' },
      { id: 'slump', g: -1, w: 5, ic: '🥶', t: 'Confidence slump', fx: '−2 pace for the rest of the season and −1 Mentality.' },
      { id: 'illness', g: -1, w: 5, ic: '🤒', t: 'Illness', fx: '−3 pace for the next two rounds.' },
      { id: 'sacked', g: -1, w: low ? 9 : 1.2, ok: C.tier >= 1 && pos > Math.max(3, N * 0.5), ic: '✂️', t: 'Dropped by team', fx: C.tier === 4 ? 'The team drops you mid-season (far likelier in the bottom 30%). You sit out several races or the rest of the year, then get offers from lower F1 teams, a small chance from bigger ones, or other series.' : 'Team sacks you for poor results (far likelier if you are in the bottom 30%). You finish the year in a worse seat: car −3.5, −3 rep, and no re-sign option.' },
      { id: 'careerEnd', g: -1, fixed: true, w: 0.3, ok: C.tier >= 1, ic: '🩹', t: 'Career-ending injury', fx: 'A freak injury ends your racing career immediately. Very rare.' },
      { id: 'fatal', g: -1, fixed: true, w: 0.04, ok: C.tier >= 1, ic: '🕯️', t: 'Fatal accident', fx: 'A tragic accident ends your career. Extremely rare.' },
    ].filter(o => o.ok === undefined || o.ok);
    const sg = L.filter(o => o.g > 0).reduce((a, o) => a + o.w, 0), sb = L.filter(o => o.g < 0 && !o.fixed).reduce((a, o) => a + o.w, 0);
    if (sb > 0 && sg > 0) L.forEach(o => { if (o.g < 0 && !o.fixed) o.w = Math.round(o.w * sg / sb * 100) / 100; });
    const cols = ['#1fbf75', '#4da3ff', '#2dd4bf', '#ffd23f', '#84cc16', '#b57bff', '#22d3ee', '#a7f3d0', '#ff4d6d', '#ff8a5c', '#f97316', '#ec4899', '#f43f5e', '#fb7185', '#a3a3a3', '#64748b'];
    L.forEach((o, i) => o.col = cols[i % cols.length]);
    return L;
  }
  function spinWheel(G) {
    const S = G.S, C = CATS[S.cat], st = G.stats, L = wheelList(G);
    let t = L.reduce((a, o) => a + o.w, 0) * rnd(), idx = 0;
    for (let i = 0; i < L.length; i++) { t -= L[i].w; if (t <= 0) { idx = i; break; } }
    const o = L[idx]; let desc = '', ended = false, extra = null;
    switch (o.id) {
      case 'crash': S.injured = Math.max(S.injured, C.tier === 0 || rnd() < 0.85 ? 1 : 2); st.FIT = Math.max(30, st.FIT - 1); desc = `You miss the next ${S.injured} round${S.injured > 1 ? 's' : ''}.`; break;
      case 'academy': G.academy = pick(ACADEMIES); G.rep = Math.min(100, G.rep + 4); desc = `${G.academy.n} signs you. Seat costs are covered from now on.`; break;
      case 'sponsorLost': G.sponsor = Math.max(0.35, G.sponsor * 0.7); desc = 'Funding is down 30%. Expect tighter seat options next summer.'; break;
      case 'sponsorNew': G.sponsor = Math.min(3, G.sponsor * 1.35); desc = 'Funding is up 35%. Bigger seats are in reach.'; break;
      case 'standIn': {
        const n = 1 + Math.floor(rnd() * 4), gps = CATS.f1.names, s0 = Math.floor(rnd() * (gps.length - n)), ovr = ovrOf(st), rows = []; let pts = 0, best = 99;
        for (let i = 0; i < n; i++) {
          const dnf = rnd() < 0.08, pos = clamp(Math.round(11 + (84 - (ovr + S.boost)) * 0.9 + gauss() * 3.5), 1, 20), p = dnf ? 0 : ([25, 18, 15, 12, 10, 8, 6, 4, 2, 1][pos - 1] || 0);
          rows.push({ gp: gps[s0 + i], pos, dnf, pts: p }); if (!dnf) { best = Math.min(best, pos); pts += p; }
        }
        S.injured = Math.max(S.injured, Math.ceil(n / 2)); G.rep = Math.min(100, G.rep + clamp(pts * 0.35 + (best <= 10 ? 3 : 1), 1, 8)); G.buzz = Math.min(15, G.buzz + 5 + Math.min(8, pts * 0.4));
        G.standIns.push({ year: G.year, n, pts, best: best === 99 ? null : best });
        extra = { kind: 'standin', rows };
        note(G, '🚨 F1 stand-in: ' + rows.map(r => `${r.gp} ${r.dnf ? 'DNF' : 'P' + r.pos}`).join(', ') + ` (${pts} pts). Back to ${C.short} next.`);
        desc = `${n} grand prix${n > 1 ? ' starts' : ' start'}: ${pts} pts${best < 99 ? ', best P' + best : ', no finishes'}. F1 teams are watching. Now back to ${C.short}.`; break; }
      case 'fp1': {
        const gp = pick(CATS.f1.names), pos = clamp(Math.round(10 + (84 - (ovrOf(st) + S.boost)) * 0.8 + gauss() * 3.5), 1, 20), rp = pos <= 5 ? 3 : pos <= 12 ? 2 : 1;
        G.rep = Math.min(100, G.rep + rp); st.MEN = Math.min(99, st.MEN + 1); G.buzz = Math.min(15, G.buzz + rp);
        extra = { kind: 'fp1', gp, pos, rep: rp }; note(G, `🏎️ FP1 in an F1 car at ${gp}: P${pos} (+${rp} rep).`);
        desc = `FP1 at the ${gp} GP: P${pos}, worth +${rp} rep.`; break; }
      case 'upgrade': S.carMod += 2.5; desc = 'The car is quicker for the rest of the year.'; break;
      case 'badup': S.carMod -= 2; desc = 'The car is slower for the rest of the year.'; break;
      case 'breakthrough': { const k = pick(STATS); st[k] = Math.min(99, st[k] + 3); G.train[k] = (G.train[k] || 0) + 3; desc = `+3 ${D.STAT_NAMES[k]}.`; break; }
      case 'engineer': S.boost += 2; desc = '+2 pace until the end of the season.'; break;
      case 'form': S.boost += 4; desc = '+4 pace until the end of the season.'; break;
      case 'slump': S.boost -= 2; st.MEN = Math.max(30, st.MEN - 1); G.train.MEN = (G.train.MEN || 0) - 1; desc = '−2 pace until the end of the season.'; break;
      case 'illness': S.tmp = -3; S.tmpUntil = S.round + 2; desc = '−3 pace for the next two rounds.'; break;
      case 'sacked':
        G.rep = Math.max(5, G.rep - 3); G.contract = 0; G.sacked = true;
        if (C.tier === 4) {
          const rest = rnd() < 0.55; S.injured = rest ? 99 : 3 + Math.floor(rnd() * 4); G.demoted = true; vacateF1(G);
          note(G, `✂️ ${G.team} drop you and hand the seat to a reserve. You ${rest ? 'sit out the rest of the season' : 'sit out a few races'}.`);
          desc = rest ? 'You are out for the rest of the season. Offers will come in the summer.' : `You sit out ${S.injured} rounds. Offers will come in the summer.`;
        } else { S.carMod -= 3.5; desc = 'You see out the season in a lesser drive.'; }
        break;
      case 'careerEnd': ended = true; desc = 'Your racing career ends here.'; break;
      case 'fatal': ended = true; desc = 'A tragic end to a racing life.'; break;
    }
    S.wheelDue = false; S.spins++;
    if (ended) G.pendingEnd = o.id;
    return { idx, id: o.id, icon: o.ic, title: o.t, fx: o.fx, desc, ended, extra, good: o.g };
  }
  function skipWheel(G) { G.S.wheelDue = false; G.S.spins++; }

  /* ---------- season end ---------- */
  const REP_W = [1.4, 1.25, 1.25, 1.3, 1.4];
  const kartRepW = age => age >= 14 ? 2.0 : 1.3;
  const FLAIR = [0, 1.5, 1.0, 2.6, 4]; // rep earned for the drives themselves, by talent tier (karting only)
  const E_standings = (G, i) => standingsEv(G, i);
  function makeSummary(G, h, C, P, tbl, pos, N, tr, dRep, debut) {
    const T = C.teams.length;
    const mate = tbl.find(d => d.team === G.team && !d.isPlayer);
    const comp = h.events || [], main = comp.find(c => c.main) || comp[0] || { n: C.short + ' championship', pos, N, pts: P.pts, lead: pos === 1, gap: 0 };
    const champ = !!h.champ, wr = P.races ? P.w / P.races : 0, topKit = tr <= Math.max(2, Math.ceil(T / 4)), poorKit = tr > Math.ceil(T * 0.6);
    const sameCat = G.history.slice(0, -1).filter(x => x.cat === h.cat), lastSame = sameCat[sameCat.length - 1];
    const titlesHere = sameCat.filter(x => x.champ).length + (champ ? 1 : 0);
    const pk = a => a[Math.floor(rnd() * a.length)];
    // expected finish: the fastest car is P1/P2 (P2 fine if the teammate is P1), the second fastest P3/P4, and so on
    const mi = C.events ? C.events.findIndex(x => x.main) : -1, rows = E_standings(G, mi), mem = rows.filter(r => r.d.team === G.team), jj = Math.max(1, mem.findIndex(r => r.d.isPlayer) + 1), sz = Math.max(1, mem.length);
    const expPos = C.crew ? tr : sz * (tr - 1) + jj, diff = expPos - pos, good = h.ovr >= C.lvl + 5;
    const lo = good ? -1 : -2, hi = good ? 2 : 1;   // very good drivers: 2 ahead to 1 behind is "met"; average drivers: 1 ahead to 2 behind
    let expect = diff > hi ? 'exceeded' : diff < lo ? 'below' : 'met';
    if (champ) expect = topKit ? 'met' : 'exceeded';
    let extract = 'even';
    if (mate && !C.crew) extract = P.pts > mate.pts * 1.15 + 2 ? 'more' : P.pts < mate.pts * 0.85 - 2 ? 'less' : 'even';
    const stock = dRep >= 5 ? 'soaring' : dRep >= 2 ? 'rising' : dRep > -1 ? 'steady' : 'falling';
    const para = [];
    // 1. the headline: what actually happened
    if (champ) {
      if (debut) para.push(pk([`Champion in your debut season in ${C.short}. That is the kind of start people talk about for years.`, `You walked into ${C.short} and won the title first time. Nobody saw that coming.`, `A title on debut in ${C.short}. The paddock is already asking who you are.`]));
      else if (lastSame && lastSame.champ) para.push(titlesHere >= 3 ? `${titlesHere} titles in ${C.short} and counting. The rest are racing for second.` : `Back-to-back ${C.short} champion. Everyone is now chasing you.`);
      else para.push(titlesHere === 1 ? `Your first ${C.short} title.` : `Another ${C.short} title. That makes ${titlesHere}.`);
      para.push(`${P.w} win${P.w === 1 ? '' : 's'} and ${P.p} podium${P.p === 1 ? '' : 's'} from ${P.races} races, and ${main.gap} point${main.gap === 1 ? '' : 's'} clear of P2 in the ${main.n}.` + (wr >= 0.4 ? ' That was dominance, not a lucky year.' : main.gap <= 12 ? ' It went down to the wire.' : ''));
    } else if (pos <= 3) {
      para.push(`${ordStr(pos)} in the ${main.n}, ${main.gap} point${main.gap === 1 ? '' : 's'} off the top.` + (P.w ? ` ${P.w} win${P.w === 1 ? '' : 's'} on the way.` : ' No wins though, and that is the missing piece.'));
    } else if (pos <= Math.ceil(N * 0.25)) {
      para.push(`${ordStr(pos)} of ${N}: a strong top-quarter finish with ${P.pts} points` + (P.p ? `, ${P.p} podium${P.p === 1 ? '' : 's'}.` : ', but no podiums.'));
    } else if (pos <= Math.ceil(N * 0.5)) {
      para.push(`${ordStr(pos)} of ${N} with ${P.pts} points: a decent upper-midfield year` + (P.p ? `, with ${P.p} podium${P.p === 1 ? '' : 's'} to show for it.` : '.'));
    } else if (pos <= Math.ceil(N * 0.75)) {
      para.push(`${ordStr(pos)} of ${N}, ${P.pts} points. Midfield, and nobody pays attention to midfield.`);
    } else {
      para.push(`A tough year: ${ordStr(pos)} of ${N} with ${P.pts} points. This one hurt.`);
    }
    // 2. the tournaments within the season
    if (comp.length > 1) {
      const won = comp.filter(c => c.pos === 1);
      if (won.length) para.push(`Tournament wins: ${won.map(c => c.n).join(', ')}.` + (champ || !main || main.pos === 1 ? '' : ` But the ${main.n} slipped away (${ordStr(main.pos)}).`));
      const worst = comp.slice().sort((a, b) => b.pos / b.N - a.pos / a.N)[0];
      if (worst && worst.pos / worst.N > 0.5 && !won.includes(worst)) para.push(`Weak spot: the ${worst.n} (${ordStr(worst.pos)}).`);
    }
    // 3. the equipment you had
    if (champ && poorKit) para.push(`And you did it in the ${ordStr(tr)}-best equipment of ${T}. That is all driver.`);
    else if (champ && topKit) para.push(`You had top-two equipment, so now the pressure is to prove it when the kit is level.`);
    else if (!champ && topKit && pos > 3) para.push(`${G.team} ranked ${ordStr(tr)} on pace and you still finished ${ordStr(pos)}. That one is on you.`);
    else if (!champ) para.push((debut ? {
      exceeded: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${diff} place${diff > 1 ? 's' : ''} better: a standout rookie year.`,
      met: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is right where it should be for a rookie.`,
      below: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${-diff} place${-diff > 1 ? 's' : ''} short, but first seasons are about learning.`,
    } : {
      exceeded: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${diff} place${diff > 1 ? 's' : ''} better: you exceeded expectations.`,
      met: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} meets expectations.`,
      below: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${-diff} place${-diff > 1 ? 's' : ''} short: you underperformed.`,
    })[expect]);
    // 4. teammate and reliability
    if (mate && !C.crew) para.push(debut ? ({ more: `You out-scored ${mate.name} (${P.pts} to ${mate.pts}) in your rookie year, which says a lot.`, less: `${mate.name} knows the place better, so trailing them (${mate.pts} to ${P.pts}) is normal for a rookie.`, even: `You matched ${mate.name} (${P.pts} to ${mate.pts}) as a rookie. Strong start.` })[extract] : ({ more: `You beat ${mate.name} (${P.pts} to ${mate.pts}), so you clearly extracted more from the car.`, less: `${mate.name} out-scored you (${mate.pts} to ${P.pts}), so you left something in the car.`, even: `You and ${mate.name} were evenly matched (${P.pts} to ${mate.pts}).` })[extract]);
    const dE = P.dnfE || 0, dR = P.dnfR || 0;
    if (P.races >= 10 && P.dnf >= 3) para.push(dE >= dR * 2 ? `${P.dnf} DNFs, ${dE} of them your own errors. That is where the points went.` : dR >= dE * 2 ? `${P.dnf} DNFs, but ${dR} were reliability, not driver error. Bad luck, not bad driving.` : `${P.dnf} DNFs: ${dR} reliability and ${dE} driver error. Half of that is on the team, half on you.`);
    else if (P.races >= 10 && P.dnf > 0 && dE === 0) para.push(`${P.dnf} DNF${P.dnf > 1 ? 's' : ''}, all mechanical. No driver errors all year.`);
    else if (P.races >= 10 && P.dnf === 0) para.push('Not a single DNF all year. Bulletproof.');
    // 5. stock and contract
    para.push(({ soaring: 'Your stock is soaring and people are circling.', rising: 'Your stock is rising. People are noticing.', steady: 'Your stock is steady.', falling: 'Your stock is falling. People are starting to doubt you.' })[stock] + (G.contract > 0 ? ` You have ${G.contract} year${G.contract > 1 ? 's' : ''} left at ${G.team}. Let's plan the summer.` : " Your deal is up, so let's plan the summer."));
    return { agent: G.agent, para, expect, extract, stock, dRep: Math.round(dRep * 10) / 10 };
  }
  const ordStr = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

  function finishSeason(G, partial) {
    const S = G.S, C = CATS[S.cat], P = player(G), tbl = standings(G);
    const comp = compTable(G), mainC = comp.find(c => c.main) || comp[0];
    const mainRows = standingsEv(G, C.events ? C.events.findIndex(x => x.main) : -1), lead0 = mainRows[0].d;
    const pos = mainC.pos, N = mainC.N;
    const q = N > 1 ? 1 - (pos - 1) / (N - 1) : 1;
    const champ = pos === 1 && !partial, ovr = ovrOf(G.stats);
    const tro = []; const evRes = C.events ? comp : null;
    if (!partial) {
      if (evRes) evRes.forEach(r => { if (r.pos === 1 && r.title) tro.push(r.title); });
      else if (champ) tro.push(C.titleName);
      S.trophies.forEach(t => tro.push(t));
    }
    const anyTitle = evRes ? (!partial && evRes.some(r => r.pos === 1 && (r.main || r.wc))) : champ;
    let earn = 0;
    if (!C.pay) earn = Math.round(salOf(G, S.cat, G.team) * (0.9 + q * 0.25) + P.w * salOf(G, S.cat, G.team) * 0.02);
    const carRank = C.teams.map(t => t[0]).sort((a, b) => G.tr[S.cat][b] - G.tr[S.cat][a]).indexOf(S.teams[0]) + 1;
    const repBefore = G.rep;
    if (!partial) { const dRep = (C.tier === 0 ? kartRepW(G.age) : REP_W[C.tier]) * (q * 10 - 3.5) + (anyTitle ? 6 : 0) + Math.min(P.w, 10) * 0.15 + (C.tier === 0 ? FLAIR[G.tier] * (0.6 + 0.4 * q) : 0); G.rep = clamp(G.rep + dRep, 5, 100); }
    const h = { season: G.season, year: G.year, age: G.age, cat: S.cat, catName: C.name, short: C.short, team: S.teams.join(' → '), races: P.races, wins: P.w, podiums: P.p, poles: P.pole, pts: P.pts, pos, N, ovr, trophies: tro, earn, champ: anyTitle, cost: G.deal.cost, partial: !!partial, events: comp, dnfE: P.dnfE || 0, dnfR: P.dnfR || 0 };
    G.history.push(h);
    const T = G.tot; T.dnfE = (T.dnfE || 0) + (P.dnfE || 0); T.dnfR = (T.dnfR || 0) + (P.dnfR || 0); T.races += P.races; T.wins += P.w; T.podiums += P.p; T.poles += P.pole; T.earn += earn; T.peak = Math.max(T.peak, ovr);
    tro.forEach(t => T.trophies[t] = (T.trophies[t] || 0) + 1);
    if (anyTitle) T.titles[S.cat] = (T.titles[S.cat] || 0) + 1;
    if (partial) return h;
    G.seasonsInCat++;
    G.contract = Math.max(0, G.contract - 1); G.sacked = false;
    G.buzz = Math.max(0, G.buzz - 2);
    if (S.cat === 'f1') { G.f1Years++; G.titleStreak = champ ? G.titleStreak + 1 : 0; } else G.titleStreak = 0;
    G.last = { pos, N, q, champ: anyTitle, cat: S.cat, ovr, wins: P.w, races: P.races };
    const summary = makeSummary(G, h, C, P, tbl, pos, N, carRank, G.rep - repBefore, G.history.filter(x => x.cat === S.cat).length === 1);

    const msgs = [];
    if (G.academy && C.tier >= 1 && C.tier <= 3) {
      const rb = G.academy.n.startsWith('Red Bull');
      const p = (rb ? (q < 0.35 ? 0.7 : q < 0.55 ? 0.35 : q < 0.7 ? 0.1 : 0) : (q < 0.3 ? 0.45 : q < 0.45 ? 0.12 : 0)) * (G.tier >= 3 ? 0.4 : 1);
      if (rnd() < p) { msgs.push(`${G.academy.n} drop you after a poor year.`); G.academy = null; G.reserve = null; }
    }
    if (C.tier === 4 && !G.demoted && q < 0.15 && G.contract === 0 && rnd() < 0.5) { G.demoted = true; msgs.push(`${S.teams[S.teams.length - 1]} part ways with you after a rough season.`); }

    // world: team strength cycles + F1 driver pool
    G.trPrev = {}; Object.keys(G.tr).forEach(c => { G.trPrev[c] = Object.assign({}, G.tr[c]); });
    const teamPts = {}; tbl.forEach(d => teamPts[d.team] = (teamPts[d.team] || 0) + d.pts);
    const champs = [], retirees = [];
    Object.keys(G.dyn).forEach(c => {
      const CC = CATS[c]; let ct;
      if (c === S.cat) ct = Object.keys(teamPts).sort((a, b) => teamPts[b] - teamPts[a])[0];
      else { let tot = 0; const w = CC.teams.map(t => { const x = Math.exp(G.dyn[c].str[t[0]] / 1.6); tot += x; return x; }); let r = rnd() * tot, i = 0; for (; i < w.length; i++) { r -= w[i]; if (r <= 0) break; } ct = CC.teams[Math.min(i, CC.teams.length - 1)][0]; }
      G.dyn[c]._champ = ct; evolveCat(G, c, ct);
    });
    const show = ['f1', 'f2', 'f3', 'f4', 'wec', 'imsa', 'gt3w', 'gt3', 'indy', 'nascar', 'fe', 'dtm', 'supercars', 'sf'];
    if (!show.includes(S.cat)) champs.push({ cat: C.short, who: lead0.name, team: lead0.team });
    show.forEach(c => {
      const CC = CATS[c];
      if (c === S.cat) { champs.push({ cat: CC.short, who: lead0.name, team: lead0.team }); return; }
      if (CC.dyn) {
        const ct = G.dyn[c]._champ; let who;
        if (c === 'f1') { const ds = G.f1.teams[ct].filter(d => !d.player); who = ds.sort((a, b) => b.ski - a.ski)[0].name; }
        else who = roster(G, c, ct)[0];
        champs.push({ cat: CC.short, who, team: ct });
      } else {
        let tot = 0; const w = CC.teams.map(t => { const x = Math.exp(t[1] / 3); tot += x; return x; }); let r = rnd() * tot, i = 0; for (; i < w.length; i++) { r -= w[i]; if (r <= 0) break; }
        const t = CC.teams[Math.min(i, CC.teams.length - 1)]; champs.push({ cat: CC.short, who: roster(G, c, t[0])[0], team: t[0] });
      }
    });
    if (G.demoted && S.cat === 'f1' && !G.f1.teams[S.teams[S.teams.length - 1]].some(d => d.player)) { /* seat already vacated */ }
    const outList = tickF1(G); outList.forEach(r => retirees.push(r));
    if (G.demoted) G.f1.vac.push(S.teams[S.teams.length - 1]);
    const rank = Object.keys(G.tr[S.cat]).map(n => ({ n, r: Math.round(G.tr[S.cat][n]), d: Math.round(G.tr[S.cat][n]) - Math.round(G.trPrev[S.cat][n]), you: n === S.teams[S.teams.length - 1] })).sort((a, b) => b.r - a.r);
    const rising = rank.slice().sort((a, b) => b.d - a.d).slice(0, 3).filter(x => x.d > 0);
    const falling = rank.slice().sort((a, b) => a.d - b.d).slice(0, 3).filter(x => x.d < 0);
    const regs = Object.keys(G.dyn).filter(c => CATS[c].regYears.includes(G.year + 1)).map(c => CATS[c].short);
    if (regs.length) msgs.push('New regulations next season in ' + regs.join(', ') + '. Expect the order to shuffle.');
    retirees.forEach(r => msgs.push(r.dropped ? `${r.name} (${r.age}) loses their F1 seat.` : `${r.name} (${r.age}) retires from F1.`));
    G.news = { champs, rank, rising, falling, msgs, summary, table: mainRows.slice(0, 10).map(r => ({ name: r.d.name, team: r.d.team, pts: r.v, w: r.d.w, isPlayer: r.d.isPlayer })) };
    G.phase = 'wrap';
    buildMarket(G, true);
    { const M = G.market, ex = [], pr = M.options.filter(o => o.kind === 'promo' && !o.blocked);
      if (M.sponsors && M.sponsors.length) ex.push(`${M.sponsors.length > 1 ? M.sponsors.length + ' sponsors have' : 'A sponsor has'} been on the phone: ${M.sponsors.map(s => s.name).join(' and ')}.`);
      if (pr.length) ex.push(`${pr.length} step-up offer${pr.length > 1 ? 's are' : ' is'} on the table, starting with ${pr[0].team}.`);
      else if (M.broke) ex.push('Money is the problem: nothing on the table is affordable right now.');
      if (ex.length) { const ps = G.news.summary.para; ps.splice(ps.length - 1, 0, ...ex); } }
    return h;
  }

  /* ---------- market ---------- */
  const attract = (G, catId) => { const L = G.last, C = CATS[catId], f = catId === 'f1'; return clamp(45 * L.q + (f ? 3.2 : 1.8) * (L.ovr - C.lvl) + (f ? 0.25 : 0.35) * (G.rep - 50) + (L.champ ? 15 : 0) + (f ? 22 : 30) + (f ? G.buzz : 0), 0, 150); };
  const isRB = G => !!(G.academy && G.academy.n.startsWith('Red Bull'));
  function makeOffer(G, kind, catId, team, extra) {
    const C = CATS[catId], r = G.tr[catId][team], ros = roster(G, catId, team);
    const tm = ros.filter(n => n !== G.name)[0] || ros[0];
    const tmSkill = C.lvl + 0.4 * (r - C.lvl), ovr = ovrOf(G.stats);
    const role = ovr >= tmSkill + 2 ? 'Lead driver' : ovr >= tmSkill - 3 ? 'Equal status' : 'Second driver';
    const years = C.tier === 0 || JR1.includes(catId) ? 1 : C.tier >= 3 ? 1 + Math.floor(rnd() * 4) : 1 + Math.floor(rnd() * 3);
    return Object.assign({ kind, cat: catId, team, r: Math.round(r), cost: costOf(G, catId, team), sal: salOf(G, catId, team), years, role, tm, tier: C.tier }, extra || {});
  }
  // dominated every category you raced in (F4, F3, F2): the only way to walk into a top team on debut
  const JR1 = ['f4', 'f3', 'f2', 'frec'];   // junior single-seater deals are one-year
  const dominatedAll = G => {
    const last = {}; G.history.forEach(h => { if (['f4', 'f3', 'f2'].includes(h.cat)) last[h.cat] = h; });
    const cs = Object.keys(last); return cs.length >= 2 && cs.every(c => last[c].champ);
  };
  function offersFor(G, catId, A, n, excludeTeam) {
    const C = CATS[catId], res = [];
    if (catId === 'f1' && isRB(G)) return [makeOffer(G, 'move', 'f1', 'Racing Bulls', { rbRule: true })]; // Red Bull juniors debut at Racing Bulls
    if (catId === 'f1' && !G.history.some(h => h.cat === 'f1')) {   // F1 debut: top-four seats are almost never on offer
      const rank = C.teams.map(t => t[0]).sort((a, b) => G.tr.f1[b] - G.tr.f1[a]), top4 = rank.slice(0, 4), dom = dominatedAll(G), out = [];
      if (G.academy) {
        out.push(G.academy.feeder);   // Ferrari -> Haas, Mercedes/McLaren -> Williams, Red Bull -> Racing Bulls
        G.academy.f1.forEach(t => { if (!out.includes(t) && (!top4.includes(t) || (dom && rnd() < 0.4))) out.push(t); });
      }
      C.teams.forEach(t => {
        const nm = t[0]; if (out.includes(nm) || (nm === excludeTeam && catId === G.cat)) return;
        if (top4.includes(nm)) { if (dom && rnd() < 0.25) out.push(nm); return; }
        if (A + gauss() * 7 >= 100 * pf(G, catId, nm) - 5) out.push(nm);
      });
      const fd = G.academy && G.academy.feeder, ordered = out.sort((a, b) => pf(G, catId, b) - pf(G, catId, a)).slice(0, n);
      if (fd && !ordered.includes(fd)) ordered[ordered.length - 1 > 0 ? ordered.length - 1 : 0] = fd;
      return (ordered.length ? ordered : [rank[rank.length - 1]]).map(nm => makeOffer(G, 'move', catId, nm));
    }
    const pass = () => { const r = []; C.teams.forEach(t => {
      const name = t[0]; if (name === excludeTeam && catId === G.cat) return;
      const P = 100 * pf(G, catId, name);
      let a = A; if (catId === 'f1' && G.academy && G.academy.f1.includes(name)) a += 25;
      if (a + gauss() * 7 >= P - 5 && affordable(G, catId, name)) r.push(name);
    }); return r; };
    let res0 = pass();
    const rescueOK = G.last && (G.last.q >= 0.75 || (G.tier >= 3 && G.last.q >= 0.5));
    if (!res0.length && C.pay && C.tier >= 1 && !G._rescued && rescueOK && !(G.academy && C.tier <= 3)) {
      G.sponsor = Math.min(3, G.sponsor * 1.8); G.family += C.cost[1]; G._rescued = true;
      G._mk.push('💷 Family funds ran dry, but your results convinced a sponsor to step in and keep you in the sport.');
      res0 = pass();
    }
    res0.sort((a, b) => pf(G, catId, b) - pf(G, catId, a));
    let teams = res0.slice(0, n);
    if (!teams.length) {
      const all = C.teams.map(t => t[0]).filter(x => !(x === excludeTeam && catId === G.cat));
      if (C.pay && C.tier >= 1) { // can't afford anything: show locked seats
        G._mk.push('💸 Family funds exhausted. You cannot afford a seat in ' + C.short + ' and no sponsor is stepping in.');
        return all.sort((a, b) => pf(G, catId, a) - pf(G, catId, b)).slice(0, 2).map(nm => makeOffer(G, 'move', catId, nm, { blocked: true }));
      }
      teams = [all.sort((a, b) => pf(G, catId, a) - pf(G, catId, b))[0]];
    }
    return teams.map(nm => { const o = makeOffer(G, 'move', catId, nm); if (!affordable(G, catId, nm)) { o.cost = Math.round(o.cost * 0.6); o.scholarship = true; } return o; });
  }
  const f4Thr = age => age <= 16 ? 60 : age === 17 ? 54 : 48;
  const bucket = pos => pos <= 4 ? 0 : pos <= 7 ? 1 : pos <= 10 ? 2 : pos <= 15 ? 3 : 4;
  function promoChance(G, fromCat, toCat, pos, mult) {
    let p = PROMO_P[bucket(pos)][G.tier];
    if (toCat === 'f1' && fromCat === 'f2' && bucket(pos) > 0) p *= 0.3;
    if (TIER3_SIDE.includes(fromCat)) p *= pos <= 3 ? 0.03 : 0;
    return clamp(p * (mult || 1), 0, 1);
  }

  const SPONSORS = ['Halden Motors', 'Brightline Energy', 'Corvane Tyres', 'Northgate Logistics', 'Kestrel Foods', 'Meridian Bank', 'Apex Racewear', 'Voltmark Batteries', 'Larkfield Homes', 'Quill Insurance', 'Redmere Telecom', 'Ostler Engineering'];
  const CASH = [[12, 60], [70, 260], [250, 900], [900, 3200]];
  function sponsorOffers(G, L, C) {
    if (!C.pay || C.tier > 3 || (G.sponsorDeals || []).length >= 3) return [];
    const p = clamp(0.06 + 0.3 * L.q + (L.champ ? 0.3 : 0) + (L.pos <= 3 ? 0.15 : 0) + FLAIR[G.tier] * 0.03 + G.rep / 100 * 0.2 + (G.wealth === 'poor' ? 0.08 : 0), 0.04, 0.95);
    const out = [], n = rnd() < p ? (p > 0.75 && rnd() < 0.5 ? 2 : 1) : 0, used = (G.sponsorDeals || []).map(d => d.name);
    const pool = SPONSORS.filter(s => !used.includes(s)).sort(() => rnd() - 0.5);
    for (let i = 0; i < n; i++) {
      const [lo, hi] = CASH[C.tier], big = clamp(0.25 + 0.6 * L.q + (L.champ ? 0.3 : 0), 0, 1);
      out.push({ name: pool[i], cash: Math.round(lerp(lo, hi, big * (0.6 + rnd() * 0.4))), mult: R1(1.12 + 0.35 * big * rnd() + 0.1), years: 1 + Math.floor(rnd() * 3) });
    }
    return out;
  }
  function takeSponsor(G, i) {
    const M = G.market, s = M && M.sponsors && M.sponsors[i]; if (!s) return false;
    G.family += s.cash; G.sponsor = Math.min(3.5, G.sponsor * s.mult);
    G.sponsorDeals.push({ name: s.name, mult: s.mult, until: G.year + s.years });
    M.sponsors.splice(i, 1);
    M.options.forEach(o => { if (o.blocked && !o.scholarship && affordable(G, o.cat, o.team)) o.blocked = false; });
    M.broke = M.options.length > 0 && M.options.every(o => o.blocked);
    return true;
  }
  function buildMarket(G, keepPhase) {
    const L = G.last, C = CATS[G.cat], nextAge = G.age + 1, lh = G.history[G.history.length - 1];
    G._mk = []; G._rescued = false;
    const M = { options: [], stuck: false, forced: false, academy: null, nextAge, note: '', roll: null, msgs: G._mk, broke: false };
    const stay = () => { const o = makeOffer(G, 'stay', G.cat, G.team); o.years = G.contract > 0 ? G.contract : (C.tier === 0 || JR1.includes(G.cat) ? 1 : 1 + Math.floor(rnd() * 2)); if (C.pay && C.tier >= 1 && !affordable(G, G.cat, G.team)) o.blocked = true; return o; };
    const lat = (cats, A, k, kind) => cats.forEach(lc => offersFor(G, lc, A(lc), k, null).forEach(o => M.options.push(Object.assign(o, { kind: kind || 'lateral' }))));
    let quit = false;
    if (C.tier === 0 && G.wealth === 'poor') {
      if (L.pos > 5) { if (rnd() < (L.pos > 12 ? 0.22 : 0.14)) quit = true; }
      else { G.family += 30; G.sponsor = Math.min(3, G.sponsor * 1.12); G._mk.push('🤝 A local sponsor backs you after a top-five finish. The family purse gets a boost.'); }
    }
    if (nextAge >= MAX_AGE) { M.forced = true; M.note = 'Age catches up. Time to hang up the helmet.'; }
    else if (quit) { M.forced = true; M.broke = true; M.note = 'Money has run out. Your family cannot keep funding karting, and results outside the top five did not attract a sponsor.'; }
    else if (C.tier === 0) {
      if (nextAge <= 15) {
        const nc = kartCat(nextAge);
        if (nc !== G.cat) M.options.push(...offersFor(G, nc, attract(G, nc), 4, null).map(o => Object.assign(o, { kind: 'promo' })));
        else { M.options.push(stay()); M.options.push(...offersFor(G, G.cat, attract(G, G.cat), 3, G.team)); }
      } else {
        const thr = f4Thr(nextAge);
        if (G.rep >= thr) { M.options.push(...offersFor(G, 'f4', attract(G, 'f4'), 4, null).map(o => Object.assign(o, { kind: 'promo' }))); M.note = 'Your karting reputation earned you F4 offers.'; }
        else M.note = 'Not enough karting rep for an F4 seat yet (need ' + thr + ' rep).';
        if (nextAge <= 17) { if (G.cat !== 'kart4') M.options.push(...offersFor(G, 'kart4', attract(G, 'kart4'), 2, null)); else { M.options.push(stay()); M.options.push(...offersFor(G, 'kart4', attract(G, 'kart4'), 2, G.team)); } }
        else if (G.rep < thr) { M.forced = true; M.stuck = true; M.note = 'Out of karting years and no F4 seat. Go sideways to GT4 or call it a day.'; M.options.push(...offersFor(G, 'gt4', attract(G, 'gt4'), 2, null).map(o => Object.assign(o, { kind: 'lateral' }))); }
      }
    } else {
      const cat = G.cat, pos = L.pos, tgt = PROMO[cat], f1Demoted = cat === 'f1' && G.demoted;
      let promoted = false, promoCat = null;
      if (tgt && !f1Demoted) {
        promoCat = tgt[0];
        if (TIER3_SIDE.includes(cat) && !(G.age <= 29 && G.rep >= 70 && G.history.some(h => h.cat === 'f2' || h.cat === 'f3'))) { /* no F1 route */ }
        else {
          const p = promoChance(G, cat, promoCat, pos);
          promoted = rnd() < p;
          M.roll = { pos, p, got: promoted, to: CATS[promoCat].short };
          if (promoted) M.note = pos <= 4 ? `P${pos} in ${C.short}. Top 4 means the doors open.` : `P${pos} gave you a ${Math.round(p * 100)}% shot at ${CATS[promoCat].short}, and the call came.`;
          else if (p > 0.02) M.note = `P${pos} gave you a ${Math.round(p * 100)}% chance of a ${CATS[promoCat].short} seat. No call this time.`;
        }
        if (promoted) M.options.push(...offersFor(G, promoCat, attract(G, promoCat) + (pos <= 4 ? 8 : 0), 4, null).map(o => Object.assign(o, { kind: 'promo' })));
      }
      // sensational seasons skip a rung
      const dom = lh && lh.races ? lh.wins / lh.races : 0;
      if (cat === 'f4' && L.champ && dom >= 0.28 && rnd() < [0.04, 0.06, 0.15, 0.35, 0.6][G.tier]) {
        M.options.push(...offersFor(G, 'f2', attract(G, 'f2') + 6, 3, null).map(o => Object.assign(o, { kind: 'promo', skip: true })));
        M.note = (M.note ? M.note + ' ' : '') + 'A sensational F4 title: F2 teams want you and you can skip F3.';
      }
      if (cat === 'f3' && L.champ && dom >= 0.25 && rnd() < [0, 0.02, 0.05, 0.18, 0.4][G.tier]) {
        M.options.push(...offersFor(G, 'f1', attract(G, 'f1') + 6, 3, null).map(o => Object.assign(o, { kind: 'promo', skip: true })));
        M.note = (M.note ? M.note + ' ' : '') + 'A sensational F3 title: F1 teams want you and you can skip F2.';
      }
      // an F1 seat opens up (retirement / sacking) and you are in the frame
      if (cat !== 'f1' && nextAge <= 34 && G.f1.vac && G.f1.vac.length && (cat === 'f2' || TIER3_SIDE.includes(cat)) && !M.options.some(o => o.cat === 'f1')) {
        for (const t of [...new Set(G.f1.vac)]) {
          if (isRB(G) && t !== 'Racing Bulls') continue;
          if (!G.history.some(h => h.cat === 'f1') && Object.keys(G.tr.f1).sort((a, b) => G.tr.f1[b] - G.tr.f1[a]).slice(0, 4).includes(t) && !dominatedAll(G) && !(G.reserve === t && rnd() < 0.35)) continue;
          let p = 0;
          if (G.reserve === t) p = clamp(0.2 + 0.55 * L.q, 0, 0.75);
          else if (G.academy && G.academy.f1.includes(t)) p = cat === 'f2' ? 0.12 + 0.35 * L.q : 0.05;
          else if (cat === 'f2') p = pos <= 8 ? 0.02 : 0;
          else if (pos <= 2 && G.rep >= 70) p = 0.04 + 0.02 * Math.max(0, G.tier - 1);
          if (rnd() < p) { M.options.push(makeOffer(G, 'promo', 'f1', t, { vacancy: true })); M.note = (M.note ? M.note + ' ' : '') + `A seat opened up at ${t} and they want you.`; break; }
        }
      }
      const stuck = STUCK_CATS.includes(cat) && G.seasonsInCat >= 3 && !M.options.some(o => o.kind === 'promo');
      if (f1Demoted) {
        M.note = `You were dropped mid-season. Offers: lower F1 teams, an outside shot at a bigger team, or another series.`;
        M.options.push(...offersFor(G, 'f1', attract(G, 'f1') - 28, 3, G.team).map(o => Object.assign(o, { kind: 'move' })));
        lat(SENIOR.slice().sort(() => rnd() - 0.5).slice(0, 3), () => attract(G, 'f1') + 8, 1);
      } else if (stuck) {
        M.stuck = true; M.note = (M.note ? M.note + ' ' : '') + `3 seasons in ${C.short} without moving up: retire or go sideways.`;
        if (tgt) { const p = promoChance(G, cat, promoCat, pos, 0.35); if (rnd() < p) { M.options.push(...offersFor(G, promoCat, attract(G, promoCat) - 5, 2, null).map(o => Object.assign(o, { kind: 'promo' }))); M.note += ' A late call-up arrived.'; } }
        (LATERAL[cat] || []).forEach(lc => offersFor(G, lc, attract(G, lc), 2, null).forEach(o => M.options.push(Object.assign(o, { kind: 'lateral' }))));
      } else {
        M.options.push(stay());
        M.options.push(...offersFor(G, cat, attract(G, cat), 3, G.team));
        if (G.age >= 21 && (TIER3_SIDE.includes(cat) || cat === 'f1')) {
          const cats = (cat === 'f1' && nextAge >= 34) ? ['wec', 'imsa', 'gt3w', 'fe', 'indy', 'nascar'].sort(() => rnd() - 0.5).slice(0, 4) : (cat === 'f1' ? SENIOR : TIER3_SIDE).filter(c => c !== cat).sort(() => rnd() - 0.5).slice(0, cat === 'f1' ? 3 : 2);
          lat(cats, c => attract(G, c) + (cat === 'f1' ? 8 : 0), 1);
          if (cat === 'f1' && nextAge >= 34) M.note = (M.note ? M.note + ' ' : '') + 'Time to think about a final chapter: WEC, IMSA, GT3, Formula E or even NASCAR, where F1 experience still wins races.';
        }
      }
      // academy drivers without an F1 seat can take a reserve role
      if (G.academy && cat === 'f2' && !M.options.some(o => o.cat === 'f1')) {
        const rt = isRB(G) ? 'Racing Bulls' : G.academy.f1[0];
        ['fe', 'sf', 'indy', 'wec', 'imsa', 'gt3w'].sort(() => rnd() - 0.5).slice(0, 2).forEach(c => offersFor(G, c, attract(G, c) + 6, 1, null).forEach(o => M.options.push(Object.assign(o, { kind: 'reserve', reserveFor: rt, role: `${rt} F1 reserve` }))));
        M.note = (M.note ? M.note + ' ' : '') + `${G.academy.n} can keep you as ${rt} reserve while you race elsewhere.`;
      }
    }
    M.options = M.options.filter((o, i, a) => a.findIndex(x => x.cat === o.cat && x.team === o.team) === i);
    if (!G.academy && !M.forced && C.tier >= 1 && C.tier <= 3 && G.age <= 24 && L.q >= 0.75 && G.rep >= 40 && rnd() < 0.4) M.academy = pick(ACADEMIES);
    M.sponsors = M.forced ? [] : sponsorOffers(G, L, C);
    M.broke = M.options.length > 0 && M.options.every(o => o.blocked);
    G.market = M; if (!keepPhase) G.phase = 'market';
    return M;
  }
  const canContinue = G => !!(G.market && G.contract > 0 && !G.demoted && !G.market.forced && !G.market.stuck && G.market.options.some(o => o.kind === 'stay' && !o.blocked));
  function continueContract(G, trainStat) { const i = G.market.options.findIndex(o => o.kind === 'stay' && !o.blocked); if (i < 0) return false; return chooseOption(G, i, trainStat, false) !== false; }

  function chooseOption(G, idx, trainStat, acceptAcademy) {
    const M = G.market, o = M.options[idx];
    if (!o || o.kind === 'retire') return retire(G);
    if (o.blocked) return false;
    if (acceptAcademy && M.academy) { G.academy = M.academy; G.rep = Math.min(100, G.rep + 4); }
    if (G.cat === 'f1' && (o.cat !== 'f1' || o.team !== G.team)) vacateF1(G);
    G.age++; G.season++; G.year++;
    (G.sponsorDeals || []).filter(d => d.until < G.year).forEach(d => { G.sponsor = Math.max(0.35, G.sponsor / d.mult); });
    G.sponsorDeals = (G.sponsorDeals || []).filter(d => d.until >= G.year);
    STATS.forEach(k => { if (G.train[k]) G.train[k] = R1(G.train[k] * 0.8); });
    if (trainStat) G.train[trainStat] = Math.min(4, (G.train[trainStat] || 0) + 2);
    if (G.academy) { const k = pick(STATS); G.train[k] = Math.min(4, (G.train[k] || 0) + 1); }
    setStats(G);
    if (o.cat !== G.cat) { G.seasonsInCat = 0; G.cat = o.cat; }
    if (o.cat === 'f1') G.reserve = null;
    if (o.kind === 'reserve') G.reserve = o.reserveFor;
    if (!G.academy) G.reserve = null;
    G.demoted = false; G.f1 && (G.f1.vac = []);
    if (o.team !== G.team || o.kind !== 'stay') G.contract = o.years;
    G.team = o.team; G.deal = { cost: o.scholarship ? o.cost : costOf(G, o.cat, o.team), sal: salOf(G, o.cat, o.team) };
    startSeason(G);
  }

  function retire(G) {
    if (G.cat === 'f1') vacateF1(G);
    G.phase = 'retired';
    const T = G.tot, ti = T.titles;
    const f1w = G.history.filter(h => h.cat === 'f1').reduce((a, h) => a + h.wins, 0);
    const score = (T.trophies['F1 World Champion'] || 0) * 12 + ((ti.wec || 0) + (ti.indy || 0) + (ti.fe || 0) + (ti.sf || 0)) * 3 + (ti.f2 || 0) * 1.5 + (ti.f3 || 0) + (ti.f4 || 0) * 0.5 + f1w * 0.3 + (T.trophies['Karting World Champion'] || 0) * 1.5 + (T.trophies['24 Hours of Le Mans win'] || 0) * 2 + (T.trophies['Indy 500 win'] || 0) * 2 + (T.trophies['Monaco GP win'] || 0);
    const reachedF1 = G.history.some(h => h.cat === 'f1');
    const label = score >= 100 ? 'a GOAT' : score >= 50 ? 'an all-time legend' : score >= 22 ? 'a true great' : score >= 8 ? 'a star' : reachedF1 ? 'a grand prix driver' : score >= 2 ? 'a solid pro' : G.history.length > 8 ? 'a journeyman' : 'a dreamer';
    const best = G.history.slice().sort((a, b) => (b.champ - a.champ) || (b.wins - a.wins) || (a.pos - b.pos))[0];
    const teams = []; G.history.forEach(h => h.team.split(' → ').forEach(t => { if (!teams.includes(t)) teams.push(t); }));
    const winsBy = {}; G.history.forEach(h => { if (h.wins) winsBy[h.short] = (winsBy[h.short] || 0) + h.wins; });
    G.retire = { label, score, best, teams, winsBy, age: G.age, seasons: G.history.length, cause: G.pendingEnd || null };
    return G.retire;
  }
  function endCareerNow(G) { finishSeason(G, true); return retire(G); }

  // saves from older versions: make sure every series has its world state
  function migrate(G) {
    if (!G || !G.dyn) return G;
    Object.values(CATS).forEach(C => {
      if (!G.tr[C.id]) G.tr[C.id] = {};
      if (C.dyn && !G.dyn[C.id]) { G.dyn[C.id] = { str: {}, trend: {}, streak: 0, last: null, regime: 'close', relEra: 1, gapEra: 1, relTeam: {} }; C.teams.forEach(t => { G.dyn[C.id].str[t[0]] = t[1]; G.dyn[C.id].trend[t[0]] = 0; G.dyn[C.id].relTeam[t[0]] = 1; }); }
      if (!Object.keys(G.tr[C.id]).length) setTR(G, C.id);
    });
    return G;
  }
  const api = { migrate, SENIOR, standingsEv, compTable, takeSponsor, canContinue, continueContract, WEALTH, setStats, CATS, TIERS, rnd, newGame, rerollStats, rerollClub, startSeason, playRound, simToEnd, setMode, wheelList, spinWheel, skipWheel, finishSeason, buildMarket, chooseOption, retire, endCareerNow, standings, player, ovrOf, potLabel, funding, costOf, salOf, kartCat, MAX_AGE, tierOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.F1E = api;
})(typeof window !== 'undefined' ? window : globalThis);
