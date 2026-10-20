/* Apex Ladder – career engine (no DOM). Karting -> F4 -> F3 -> F2 -> F1 with lateral moves. */
(function (root) {
  const D = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./f1-data.js') : root.F1D;
  const { HUNGER, TEST, SLP, CATS, NATS, ACADEMIES, PROMO, LATERAL, STUCK_CATS, TIER3_SIDE, SENIOR, STATS, TIERS, PROMO_P, STEP_P, STEP_TIER, F1P, ROOKIES, RETIRE_2028 } = D;

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
  // ageing follows the F1DB curve the AI drivers use (flat to 28, ~0.8 a year slower at 29-31, ~1.1 at 32-34, gentler after);
  // the Pace/Fitness fade in setStats already covers ~0.1 a year of it
  const ageDecl = a => a <= 29 ? 0 : a <= 32 ? (a - 29) * 0.8 : a <= 35 ? 2.4 + (a - 32) * 1.1 : 5.7 + (a - 35) * 0.6;
  // the best keep their peak longer: a generational driver holds it to ~34-35 (Schumacher, Hamilton, Verstappen), a wonderkid to ~32
  const primeOf = G => (TIERS[G.tier].prime || 0);
  const hungerOf = G => HUNGER[G.wealth] || 0;
  const targetOvr = (G, age) => { const a = age - primeOf(G); return pathLvl(age) + TIERS[G.tier].adv[band(age)] + (age >= 9 ? hungerOf(G) : 0) - Math.max(0, ageDecl(a) - Math.max(0, a - 29) * 0.1) - Math.max(0, age - 35) * 0.7; };   // past 35 the slide speeds up whoever you are
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
      if (age - primeOf(G) >= 30 && (k === 'FIT' || k === 'PAC')) v -= (age - primeOf(G) - 29) * 0.4;
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
      if (C.dyn) { G.dyn[C.id] = { str: {}, trend: {}, streak: 0, last: null, regime: C.id === 'f1' ? 'dominant' : 'close', relEra: C.id === 'f1' ? 1.7 : 1, gapEra: C.id === 'f1' ? 1.45 : 1, relTeam: {}, edge: C.edge2026 ? Object.assign({}, C.edge2026) : {} }; C.teams.forEach(t => { G.dyn[C.id].str[t[0]] = t[1]; G.dyn[C.id].trend[t[0]] = 0; G.dyn[C.id].relTeam[t[0]] = C.id === 'f1' ? (C.rel2026 && C.rel2026[t[0]] !== undefined ? C.rel2026[t[0]] : C.time ? clamp(Math.exp(gauss() * 0.9), 0.3, 6) : clamp(1 + gauss() * 0.3, 0.6, 1.8)) : 1; }); }   // the 2026 start uses each team's real reliability so far
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
  function compressTop(d, names, k, f, gapBelow) {
    const sorted = names.slice().sort((a, b) => d.str[b] - d.str[a]), top = sorted.slice(0, k), m = top.reduce((a, n) => a + d.str[n], 0) / k;
    top.forEach(n => { d.str[n] = m + f * (d.str[n] - m); });
    // the chasing pack sits clearly behind the contenders, so the title is a fight between 2-3 teams
    const floor = Math.min(...top.map(n => d.str[n])) - (gapBelow || 2.5);
    sorted.slice(k).forEach(n => { if (d.str[n] > floor) d.str[n] = floor - Math.random() * 0.8; });
  }
  function evolveCat(G, c, champ) {
    const C = CATS[c], d = G.dyn[c], ny = G.year + 1, reg = C.regYears.includes(ny), names = C.teams.map(t => t[0]);
    if (d.edge) { if (reg) d.edge = {}; else Object.keys(d.edge).forEach(k => { d.edge[k] *= 0.5; }); }   // a team's race-vs-qualifying edge fades and a rule reset wipes it
    if (reg) {
      // a reset shuffles the order, but the established powerhouses keep most of their edge
      names.forEach(n => { const base = teamDef(c, n)[1], el = (C.elite || []).includes(n); d.str[n] = clamp((el ? 0.85 : 0.5) * base + gauss() * (el ? 1.8 : 2.8), -(C.sMax || 8), C.sMax || 8); d.trend[n] = (el ? -0.08 : -0.2) * d.str[n] + gauss() * 0.7; });
      d.streak = 0; d.last = null;
      d.regime = rnd() < (C.time ? C.time.domP : 0.25) ? 'dominant' : 'close';
      d.relEra = 1.7; d.gapEra = c === 'f1' ? 1.45 : 1.55; names.forEach(n => { d.relTeam[n] = C.time ? clamp(Math.exp(gauss() * 0.9), 0.3, 6) : clamp(1 + gauss() * 0.3, 0.6, 1.8); });   // F1DB: in a reset year one team can fail half its starts (Aston Martin 2026) while another barely breaks
      if (d.regime === 'close') compressTop(d, names, 4, C.time ? 0.75 : 0.4);
      else { const lead = names.slice().sort((a, b) => d.str[b] - d.str[a])[0]; d.str[lead] += C.time ? C.time.domBoost : 2.2; }
    } else {
      if (d.regime === 'dominant' && rnd() < (C.time ? C.time.domEnd : 0.3)) d.regime = 'close';
      d.relEra = 1 + (d.relEra - 1) * 0.6; { const lastReg = Math.max(...C.regYears.filter(y => y <= ny), 2026), age = ny - lastReg, tgt = C.time ? (age <= 1 ? 1 : age === 2 ? 0.9 : age === 3 ? 0.76 : age === 4 ? 0.64 : 0.56) : (age <= 2 ? 1 : age === 3 ? 0.9 : age === 4 ? 0.8 : 0.72); d.gapEra = tgt + (d.gapEra - tgt) * 0.72; }   // fields converge the longer the rules stay stable
      names.forEach(n => { d.relTeam[n] = C.time ? clamp(Math.exp(Math.log(d.relTeam[n]) * 0.6 + gauss() * 0.25), 0.3, 4) : clamp(1 + (d.relTeam[n] - 1) * 0.7 + gauss() * 0.08, 0.6, 1.8); });
      names.forEach(n => { const base = teamDef(c, n)[1], el = (C.elite || []).includes(n); d.str[n] += d.trend[n] + gauss() * (el ? 0.8 : 1.1) + 0.15 * ((el ? 0.85 : 0.6) * base - d.str[n]); d.trend[n] *= 0.8; });
      if (champ) {
        d.streak = d.last === champ ? d.streak + 1 : 1; d.last = champ;
        const el = isElite(G, c, champ);
        if (d.streak === 1) d.str[champ] += 0.9; else if (d.streak === 2) d.str[champ] -= el ? 0.4 : 1.8; else d.str[champ] -= el ? 1.8 : 3.2;
        if (d.streak >= 2) names.filter(n => n !== champ).sort((a, b) => d.str[b] - d.str[a]).slice(0, 3).forEach(n => d.str[n] += 1.0);
      }
      if (d.regime !== 'dominant') compressTop(d, names, C.time ? (C.time.compK || 4) : 4, C.time ? (C.time.compF || 0.96) : 0.85, C.time ? C.time.compGap : 0);
      names.forEach(n => d.str[n] = clamp(R1(d.str[n]), -(C.sMax || 8) - 1, (C.sMax || 8) + 1));
    }
    if (c === 'f1' && d.str['Racing Bulls'] !== undefined && d.str['Red Bull Racing'] !== undefined && d.str['Racing Bulls'] > d.str['Red Bull Racing'] - 0.25) d.str['Racing Bulls'] = R1(d.str['Red Bull Racing'] - 0.25);
    enforceFloors(G, c);
    setTR(G, c);
    // McLaren 2012 / Red Bull 2010 / Ferrari 2022: now and then the fastest car of the year is also the most fragile, and the title goes elsewhere
    if (c === 'f1' && C.time) { d.fragile = null; const srt = names.slice().sort((a, b) => d.str[b] - d.str[a]), top = srt[0]; if (!reg && d.regime !== 'dominant' && d.str[top] - d.str[srt[1]] < 1.3 && rnd() < (C.time.fragileP || 0)) { d.fragile = { team: top, k: 8 + rnd() * 4, year: ny }; } }
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
  const trS = (G, c) => (G.fc && G.fc[c]) || G.tr[c];   // during the summer market: the forecast, not next season's real car
  const pf = (G, cat, name) => {
    const C = CATS[cat];
    if (C.dyn) return clamp((trS(G, cat)[name] - (C.lvl - 10)) / 20, 0, 1);
    const offs = C.teams.map(t => t[1]); const mn = Math.min(...offs), mx = Math.max(...offs);
    return mx === mn ? 0.5 : (teamDef(cat, name)[1] - mn) / (mx - mn);
  };
  const costOf = (G, cat, name) => { const C = CATS[cat]; return C.pay ? Math.round(lerp(C.cost[0], C.cost[1], pf(G, cat, name))) : 0; };
  const salOf = (G, cat, name) => {
    const C = CATS[cat];
    if (cat === 'f1') {   // base pay, £k a year: fitted to reported 2014-26 salaries of the 2026 grid (log pay ~ experience, last season's finish, team, titles; R² 0.84)
      const tr = trS(G, 'f1'), rank = C.teams.map(t => t[0]).sort((a, b) => tr[b] - tr[a]).indexOf(name), frac = 1 - rank / (C.teams.length - 1);
      const L = G.last || {}, prevQ = L.cat === 'f1' && L.pos ? 1 - (Math.min(L.pos, 20) - 1) / 19 : 0;
      const titles = Math.min(4, G.tot.trophies['F1 World Champion'] || 0), exp = Math.min(10, G.f1Years) / 10;
      return Math.round(Math.exp(6.75 + 0.64 * frac + 1.79 * exp + 0.27 * titles + 1.03 * prevQ - (G.f1Years === 0 ? 0.76 : 0)));
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
    if (G.f1) { Object.values(G.f1.teams).forEach(ds => ds.forEach(d => d && used.add(d.name))); (G.f1.free || []).forEach(d => used.add(d.name)); (G.f1.retired || []).forEach(n => used.add(n)); (G.f1.queue || []).forEach(n => used.add(n)); }
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
  // the winter driver market of a senior series: ~20% new faces, ~30% of the drivers change team (Wikipedia entry lists 2008-2025: a
  // third of each season's field is new, about a third of returners switch team), with moves skewed towards the stronger cars
  function driverMarket(G, cat) {
    const C = CATS[cat], D = G.dyn[cat]; if (!C.dyn || cat === 'f1' || !D) return;
    const teams = C.teams.map(t => t[0]), key = (t, i) => cat + '|' + t + '|' + i;
    const stars = D.champHist || [];
    teams.forEach(t => { for (let i = 0; i < seats(cat, t); i++) if (rnd() < (C.newFaces === undefined ? 0.2 : C.newFaces) * (stars.includes(seatName(G, cat, t, i)) ? (C.starKeep === undefined ? 0.2 : C.starKeep) : 1)) G.names[key(t, i)] = freshName(G, cat); });
    const seatsAll = []; teams.forEach(t => { for (let i = 0; i < seats(cat, t); i++) seatsAll.push([t, i]); });
    const pm = C.moveP === undefined ? 0.3 : C.moveP;
    seatsAll.forEach(([t, i]) => {
      if (rnd() >= pm / 2) return;   // each swap moves two drivers
      const w = teams.filter(x => x !== t).map(x => Math.exp((D.str[x] || 0) / 4)); let r = rnd() * w.reduce((a, b) => a + b, 0), k = 0;
      const others = teams.filter(x => x !== t); for (; k < w.length - 1; k++) { r -= w[k]; if (r <= 0) break; }
      const t2 = others[k], j = Math.floor(rnd() * seats(cat, t2)), a = seatName(G, cat, t, i), b = seatName(G, cat, t2, j);
      G.names[key(t, i)] = b; G.names[key(t2, j)] = a;
    });
  }
  function roster(G, cat, team) {
    if (cat === 'f1') return G.f1.teams[team].map(d => d.player ? G.name : d.name);
    return Array.from({ length: seats(cat, team) }, (_, i) => seatName(G, cat, team, i));
  }

  /* ---------- F1 driver pool (retirements, rookies, free agents, transfers) ---------- */
  // Calibrated on F1DB 2010-2025: ~3.6 rookies, ~4.9 exits and ~7.7 seat changes a season; debut age median ~22 (p10 19, p90 25);
  // career length median 3 seasons (21% one season, 36% 5+); last-season age median 28, ~34 for drivers with 5+ seasons.
  const penOf = n => CATS.f1.time ? CATS.f1.time.pen[Math.max(0, Math.min(3, n - 1))] : 0;   // rookie penalty for F1 season n
  const effOf = d => d.ski - penOf((d.yrs || 0) + 1);
  // season-to-season form swings shrink for the very best (F1DB: top-10 drivers' season residual sd ~2.3 rating points against ~2.9 for the wider field)
  const formK = r => { const f = CATS.f1.time && CATS.f1.time.formElite; return f ? Math.max(f.min, Math.min(f.max, 1 - f.slope * (r - f.from))) : 1; };
  // mean effective level of the fitted 2026 grid: the AI field is held to this level as drivers come and go
  const baseAnchor = () => { const v = Object.values(F1P); return v.reduce((a, [b, k, y]) => a + k - penOf((y || 0) + 1), 0) / v.length; };
  function initF1(G) {
    G.f1 = { teams: {}, free: [], queue: ROOKIES.slice(), retired: [] };
    CATS.f1.teams.forEach(t => { G.f1.teams[t[0]] = t[2].split('|').map(n => { const [b, k, y] = F1P[n]; return { name: n, birth: b, ski: k, pot: Math.min(k + (START_YEAR - b <= 23 ? 1.5 : 0), 94.5), yrs: y || 0 }; }); });
    G.f1.anchor = baseAnchor();
  }
  function newRookie(G) {
    const name = G.f1.queue.length ? G.f1.queue.shift() : freshName(G, 'f1');
    const ski = R1(clamp(87.5 + gauss() * 3, 80, 95)), age = Math.round(clamp(21.8 + gauss() * 2.2, 18, 27));
    return { name, birth: G.year + 1 - age, ski, pot: R1(ski + (age <= 21 ? 1 + rnd() * 2 : rnd())), yrs: 0 };
  }
  function fillSlot(G, team) {
    G.f1.free.sort((a, b) => effOf(b) - effOf(a));
    const k = G.f1.free.findIndex(d => !(team && d.exT === team && d.exY === G.year));   // a team does not re-sign the driver it just let go
    if (k >= 0 && effOf(G.f1.free[k]) >= 81 && rnd() < 0.5) return G.f1.free.splice(k, 1)[0];
    return newRookie(G);
  }
  function vacateF1(G) {
    Object.keys(G.f1.teams).forEach(t => {
      G.f1.teams[t] = G.f1.teams[t].map(d => {
        if (!d.player) return d;
        if (t === 'Red Bull Racing') {   // the second-seat revolving door: the best Racing Bulls driver is promoted
          const rb = G.f1.teams['Racing Bulls'] || [], c = rb.filter(x => x && !x.player && (x.yrs || 0) >= 1 && G.year - x.birth <= 31).sort((a, b) => effOf(b) - effOf(a))[0];
          if (c) { rb[rb.indexOf(c)] = fillSlot(G, 'Racing Bulls'); return c; } }
        return fillSlot(G); }); });
  }
  function enterF1(G, team) {
    const slots = G.f1.teams[team];
    if (slots.some(d => d.player)) return;
    let wi = 0; slots.forEach((d, i) => { if ((CATS.f1.time ? d.ski : effOf(d)) < (CATS.f1.time ? slots[wi].ski : effOf(slots[wi]))) wi = i; });
    G.f1.free.push(slots[wi]); slots[wi] = { player: true, name: G.name };
  }
  const retP = a => a <= 30 ? 0.01 : a <= 33 ? 0.03 : a === 34 ? 0.06 : a === 35 ? 0.1 : a === 36 ? 0.14 : a === 37 ? 0.2 : a === 38 ? 0.28 : a === 39 ? 0.38 : a === 40 ? 0.5 : a === 41 ? 0.7 : 0.95;
  const RETIRE_BIAS = { 'Nico Hülkenberg': 0.18, 'Sergio Pérez': 0.15, 'Valtteri Bottas': 0.15 };
  function tickF1(G, pos) {
    const out = [], age = d => G.year - d.birth, T = G.f1.teams; pos = pos || {};
    const rankT = Object.keys(T).sort((a, b) => G.tr.f1[b] - G.tr.f1[a]);
    // ageing (F1DB: flat to 28, ~0.8 pt a year slower at 29-31, ~1.1 at 32-34, gentler for the survivors after that); the elite start the slide later (a 92+ driver holds on to ~34)
    const step = d => { d.pk = Math.max(d.pk || 0, d.ski); const a = age(d) - clamp((d.pk - 87.5) * 1.5, 0, 6); d.ski = clamp(R1(d.ski + (a <= 28 ? 0.35 * Math.max(0, (d.pot || d.ski) - d.ski) : a <= 31 ? -0.8 : a <= 34 ? -1.1 : -0.6) + gauss() * 0.5), 68, 97); };
    // 1) retirements and drops, judged on this season's effective level against the team-mate and the grid
    const gridEff = (() => { const p = rankT.flatMap(t => T[t].filter(d => d && !d.player)); return p.reduce((a, d) => a + effOf(d), 0) / (p.length || 1); })();
    rankT.forEach(t => {
      T[t].forEach((d, i) => {
        if (!d || d.player) return;
        const a = age(d), mate = T[t].find(x => x && x !== d), eff = effOf(d), mEff = mate ? (mate.player ? ovrOf(G.stats) : effOf(mate)) : eff;
        const scripted = RETIRE_2028.includes(d.name), forced = scripted && G.year >= 2028;
        const pr = scripted ? 0 : retP(a) + (a >= 36 ? (RETIRE_BIAS[d.name] || 0) : 0);
        const z = (gridEff - eff) / 2.6 + Math.max(0, mEff - eff - 2) / 3.5;
        d.tn = d.tnT === t ? (d.tn || 0) + 1 : 1; d.tnT = t; if (pos[d.name] === 1) d.titles = (d.titles || 0) + 1;
        const sp = pos[d.name] || 0;   // championship position (F1DB 2010-25: no reigning champion lost a seat, ~4% of top-3 finishers did)
        const elite = (effOf(d) >= gridEff + 4.2 || d.ski >= 90.5 || (d.pk || 0) >= 90.5 && a < 34) && a < 38;   // a clear star (Verstappen, Norris, Piastri, Leclerc) is never dropped
        const pd = forced || sp === 1 || elite ? 0 : (sp && sp <= 3 ? 0.35 : 1) * (a >= 36 ? 0 : clamp(((d.yrs || 0) >= 3 ? 0.26 : 0.15) + 0.15 * z, 0.03, 0.75) * (rankT.indexOf(t) < 4 ? (CATS.f1.time.dropTop || 1.3) : rankT.indexOf(t) >= 7 ? (CATS.f1.time.dropBack || 1) : (CATS.f1.time.dropMid || 1)) * ((d.yrs || 0) < 1 ? 0.3 : (d.yrs || 0) < 2 ? 0.7 : 1) * (t === 'Racing Bulls' ? ((d.tn || 1) <= 1 ? 0.7 : (d.tn || 1) === 2 ? 1.2 : 1 + 0.6 * ((d.tn || 1) - 1)) : 1) * (CATS.f1.time.dropK || 1) * (eff >= gridEff + 1.5 ? 0.35 : 1));   // rookies usually get a second year; a driver clearly above the grid average rarely loses a seat
        d.yrs = (d.yrs || 0) + 1;
        if (forced || rnd() < pr) { out.push({ name: d.name, age: a, team: t, dropped: false }); G.f1.retired.push(d.name); T[t][i] = null; }
        else if (rnd() < pd) { out.push({ name: d.name, age: a, team: t, dropped: true }); d.exT = t; d.exY = G.year; G.f1.free.push(d); T[t][i] = null; }
        else step(d);
      });
    });
    { const rbr = T['Red Bull Racing'], rb2 = T['Racing Bulls'];   // a released Red Bull driver usually drops into Racing Bulls, whose best driver moves up
      if (rbr && rb2) rbr.forEach((d, i) => { if (d !== null) return; const ex = G.f1.free.find(x => x.exT === 'Red Bull Racing' && x.exY === G.year), cand = rb2.filter(x => x && !x.player && age(x) <= 30 && (x.yrs || 0) >= 1).sort((a, b) => effOf(b) - effOf(a))[0];
        if (cand && (!ex || effOf(cand) >= effOf(ex) - 1)) { const ci = rb2.indexOf(cand); rbr[i] = cand; if (ex && effOf(ex) >= 79 && rnd() < 0.8) { rb2[ci] = ex; G.f1.free.splice(G.f1.free.indexOf(ex), 1); } else rb2[ci] = null; } }); }
    G.f1.free.forEach(step);
    G.f1.free = G.f1.free.filter(d => age(d) < 38 && rnd() < 0.6);
    G.f1.vac = out.map(r => r.team);
    // 2) the market: open seats are filled from the top team down; big teams poach proven drivers, small teams take rookies
    const open = () => { const v = []; rankT.forEach(t => T[t].forEach((d, i) => { if (!d) v.push([t, i]); })); return v; };
    let guard = 0;
    for (let v = open(); v.length && guard++ < 40; v = open()) {
      const [t, i] = v[0], r = rankT.indexOf(t);
      const pool = rankT.slice(r + 1).flatMap(t2 => T[t2].filter(d => d && !d.player && !(t2 === 'Racing Bulls' && (d.tn || 1) < 2)).map(d => ({ d, t2 })));   // a first-year Racing Bulls driver is not poached
      const best = pool.filter(x => age(x.d) <= 33).sort((a, b) => effOf(b.d) - effOf(a.d))[0];
      const pMove = (r < 4 ? 0.45 : r < 7 ? 0.22 : 0.08) * (CATS.f1.time.poach || 1);
      if (best && effOf(best.d) >= 84 && rnd() < pMove) { T[best.t2][T[best.t2].indexOf(best.d)] = null; T[t][i] = best.d; continue; }
      T[t][i] = fillSlot(G, t);
    }
    // keep the scale anchored: ratings are relative to the grid (fitted median 84), so the AI field mean does not drift
    { const pool = rankT.flatMap(t => T[t].filter(d => d && !d.player)), m = pool.reduce((a, d) => a + effOf(d), 0) / (pool.length || 1);
      if (G.f1.anchor === undefined) G.f1.anchor = m; const sh = 0.6 * (m - G.f1.anchor); pool.concat(G.f1.free).forEach(d => { d.ski = R1(d.ski - sh); d.pot = R1((d.pot || d.ski) - sh); }); }
    // the second-seat revolving door: Red Bull replaces its weaker driver with the best Racing Bulls driver, who is nearly always ready after a year (Verstappen, Ricciardo, Albon, Lawson, Tsunoda)
    { const rbr = T['Red Bull Racing'], rb2 = T['Racing Bulls'];
      if (rbr && rb2) { const weak = rbr.filter(d => d && !d.player).sort((a, b) => effOf(a) - effOf(b))[0], cand = rb2.filter(d => d && !d.player && age(d) <= 30 && (d.yrs || 0) >= 1).sort((a, b) => effOf(b) - effOf(a))[0];
        if (weak && cand && effOf(cand) >= effOf(weak) - 0.5 && rnd() < 0.1) { const wi = rbr.indexOf(weak), ci = rb2.indexOf(cand); rbr[wi] = cand; rb2[ci] = weak; } } }
    // 3) a few moves without a vacancy: a top team swaps out its weaker driver for a stronger one lower down
    rankT.slice(0, 6).forEach((t, r) => {
      const ds = T[t].filter(d => d && !d.player); if (!ds.length) return;
      const weak = ds.sort((a, b) => effOf(a) - effOf(b))[0];
      const cand = rankT.slice(r + 1).flatMap(t2 => T[t2].filter(d => d && !d.player && age(d) <= 32 && !(t2 === 'Racing Bulls' && (d.tn || 1) < 2)).map(d => ({ d, t2 }))).sort((a, b) => effOf(b.d) - effOf(a.d))[0];
      if (cand && effOf(cand.d) - effOf(weak) >= 2.5 && rnd() < (CATS.f1.time.swapP || 0.15)) { const j = T[cand.t2].indexOf(cand.d), wi = T[t].indexOf(weak); T[cand.t2][j] = weak; T[t][wi] = cand.d; }
    });
    return out;
  }

  /* ---------- season setup ---------- */
  function startSeason(G) {
    const C = CATS[G.cat]; G.fc = null;
    churnSeats(G, G.cat);
    const drivers = [];
    if (G.cat === 'f1') enterF1(G, G.team);
    C.teams.forEach(t => {
      const name = t[0], car = G.tr[C.id][name];
      if (C.id === 'f1') {
        G.f1.teams[name].forEach(d => { const isP = !!d.player; drivers.push({ id: drivers.length, name: isP ? G.name : d.name, team: name, car, skill: isP ? 0 : (C.time ? effOf(d) : 84 + 0.85 * (d.ski - 84) + gauss() * 1.3), rk: !isP && !d.yrs, isPlayer: isP, pts: 0, w: 0, p: 0, pole: 0, races: 0, dnf: 0, tb: rnd() }); });
        return;
      }
      roster(G, C.id, name).forEach((nm, i) => {
        const isP = name === G.team && i === seats(C.id, name) - 1;
        drivers.push({ id: drivers.length, name: isP ? G.name : nm, team: name, car, skill: C.lvl + 0.4 * (car - C.lvl) + gauss() * (C.skSd || 3.5), isPlayer: isP, pts: 0, w: 0, p: 0, pole: 0, races: 0, dnf: 0, tb: rnd() });
      });
    });
    const S = G.S = { cat: G.cat, round: 0, drivers, log: [], boost: gauss() * 1.3, carMod: 0, injured: 0, tmp: 0, tmpUntil: 0, wheelDue: false, spins: 0, stageEnds: [Math.floor(C.rounds / 3), Math.floor(2 * C.rounds / 3)], euro: false, wcWin: false, trophies: [], over: false, notes: [], mode: 'balance', teams: [G.team], famPaid: 0, regime: G.dyn[G.cat] ? G.dyn[G.cat].regime : 'dominant' };
    if (C.time) { S.rbc = rbCurse(G, drivers); S.tpts = {}; }
    if (G.injCarry) { const ic = G.injCarry; G.injCarry = null; if (ic.n > 0) { S.injured = ic.n; S.injWhy = ic.why; note(G, `🩹 Still recovering from ${ic.why}: you miss the first ${ic.n} round${ic.n > 1 ? 's' : ''} of the season.`); }
      if (ic.weeks > 0 && C.tier >= 1) { const second = !!(S.rbc && S.rbc.other === G.name), ri2 = rehabInfo(G, ic.weeks, second), pen = ri2.pen, rounds = ri2.rounds; S.rehab = { pen, rounds };
        note(G, `🩹 The first weeks of winter went on rehab after ${ic.why}, so you have not fully calibrated to the new car${second ? ', and Red Bull\'s second car is already further from what you drive best, so it hurts more' : ''}: expect a slow start (about −${pen.toFixed(1)} pace, fading over ${rounds} rounds).`); } }
    if (TEST && TEST.genRedBull && G.tier === 4 && !G.academy && C.tier >= 1 && C.tier <= 3 && !G.history.some(h => h.cat === 'f1')) { G.academy = ACADEMIES[0]; G.rep = Math.min(100, G.rep + 4); note(G, '🧪 Test mode: the Red Bull Junior Team signs every generational talent. Seat costs are covered and the fast track to F1 is open.'); }
    // first year in a new category is a learning year: slow start, form arriving late in the season
    S.learn = G.history.some(h => h.cat === G.cat) ? 0 : (G.cat === 'f1' ? (C.time ? 2.5 : 1.5) : C.tier === 0 ? (G.history.length ? 2.2 : 0) : 5.5);   // juniors: rookies finish ~0.1 of the field lower than second-year drivers (Wikipedia standings)
    // F1 rookies take time: years 1-2 are a learning curve, year 3 is where it starts to click, then full ceiling
    if (G.cat === 'f1' && !C.time) { S.exp = [0.3, 0.48, 0.76, 0.93, 1][Math.min(G.f1Years, 4)]; S.boost -= [1.5, 1, 0.5, 0, 0][Math.min(G.f1Years, 4)]; }   // (the lap-time model uses the fitted rookie penalty instead)
    // F1 know-how carries over to other series
    if (TIER3_SIDE.includes(G.cat) && G.f1Years > 0) S.boost += Math.min(5, G.f1Years * 0.5);
    // champions tend to go back to back; a third in a row is hard unless you are a top-3 tier talent
    if (G.cat === 'f1' && G.titleStreak > 0 && !C.time) S.carMod += G.titleStreak === 1 ? 1.2 : (G.tier >= 2 ? 0.4 : -3);
    // seat bill: sponsors cover part, family funds cover the rest (academies pay in F4-F2)
    if (C.pay && !(G.academy && C.tier >= 1 && C.tier <= 3)) {
      const c = G.deal.cost; S.famPaid = Math.max(0, c - Math.min(c, funding(G) * 0.6)); G.family = Math.max(0, G.family - S.famPaid);
    }
    G.phase = 'season'; G.market = null; G.pendingEnd = null;
  }
  const player = G => G.S.drivers.find(d => d.isPlayer);
  // the rival: most close finishes (adjacent in the results) plus extra weight for years you fought for the same position in the standings
  const rivalOf = G => { const e = Object.entries(G.riv || {}).map(([n, v]) => [n, v.a + 0.35 * v.n + 4 * (v.t || 0)]).sort((a, b) => b[1] - a[1])[0]; return e && e[1] >= 7 ? e[0] : null; };
  // one line that says what the race was about, from what actually happened (start, pit stops, safety cars, penalties)
  function raceStory(u, pos, wet, neut, steward) {
    const g = u.grid, gain = g - pos, why = [];
    if (u.crash) return u.l1 ? `Caught up in a first-lap pile-up from P${g}.` : u.cause === 'error' ? `A mistake ended the race from P${g}${u.late ? ' late on' : ''}.` : `${pick(['Power unit', 'Hydraulics', 'Gearbox', 'Brake', 'Cooling'])} failure from P${g}${u.late ? ' while running well' : ''}: not your fault.`;
    if (u.dmg) why.push('first-lap damage cost a lot of time'); else if (u.slow && gain < 0) why.push('a slow pit stop cost places'); else if (u.pen && gain >= -2) why.push('you started with a grid penalty');
    else if (u.scBen === 1) why.push('a stop under the safety car was free'); else if (u.scBen === -1) why.push('pitting just before the safety car cost you'); else if (u.scBen === 3) why.push('a cheap stop under the virtual safety car'); else if (u.scBen === -3) why.push('pitting just before the VSC cost you'); else if (u.scBen === 2) why.push('free tyres under the red flag');
    if (u.ucd && gain > 0 && !why.length) why.push('an undercut at the stops won the place');
    if (u.stops === 3 && !why.length) why.push('a three-stop strategy');
    if (wet && !why.length) why.push('a wet race');
    if (steward && !why.length) why.push('a penalty from the stewards');
    if (neut === 'sc' && !why.length && Math.abs(gain) >= 3) why.push('the safety car shuffled the order');
    const tail = why.length ? ` ${why[0]}.` : '.';
    if (pos === 1) return (g === 1 ? (neut ? 'Pole to win through the neutralisation.' : 'Led from pole to the flag.') : `Won from P${g}:`) + (g === 1 ? '' : why.length ? tail : ' on pure pace.');
    if (gain >= 4) return `Charged from P${g} to P${pos}:${tail}`.replace(':.', '.');
    if (gain <= -4) return `Lost ${-gain} places from P${g}:${tail}`.replace(':.', '.');
    return why.length ? `P${g} to P${pos}:${tail}` : (g <= 3 && pos <= 3 ? 'A front-running race.' : gain === 0 ? 'Held your place all race.' : `P${g} to P${pos}, a race without much drama.`);
  }
  const STEW = ['f1', 'f2', 'f3', 'f4', 'frec'];
  // penalty points still on the licence: those from the last 12 months (about 24 rounds)
  const penActive = (G, ri) => (G.pen || []).filter(e => (G.year - e.y) * 24 + ((ri === undefined ? (G.S ? G.S.round : 0) : ri) - e.r) < 24).reduce((a, e) => a + e.pts, 0);
  // level on points: the FIA countback, most wins, then most second places, then thirds and so on (classified finishes in grands prix)
  const cmpDrv = (a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; const fa = a.fc || [], fb = b.fc || []; for (let i = 0; i < 24; i++) { const x = (fb[i] || 0) - (fa[i] || 0); if (x) return x; } return a.tb - b.tb; };
  const standings = G => G.S.drivers.slice().sort(cmpDrv);
  const note = (G, text) => { G.S.log.push({ note: true, text }); };

  /* Red Bull family rules: Racing Bulls first, mid-season promotion/demotion */
  function moveF1(G, newTeam) {
    const old = G.team, A = G.f1.teams[old], B = G.f1.teams[newTeam], ai = A.findIndex(d => d.player);
    if (ai < 0) return;
    const up = G.tr.f1[newTeam] > G.tr.f1[old]; let wi = 0; B.forEach((d, i) => { if (up ? effOf(d) < effOf(B[wi]) : effOf(d) > effOf(B[wi])) wi = i; });   // moving up you replace the slower driver; dropped down, the better junior goes up
    const disp = B[wi]; B[wi] = { player: true, name: G.name }; A[ai] = disp;
    G.team = newTeam; G.S.teams.push(newTeam);
    const P = player(G), Dd = G.S.drivers.find(d => !d.isPlayer && d.team === newTeam && d.name === disp.name);
    if (P) { P.team = newTeam; P.car = G.tr.f1[newTeam]; } if (Dd) { Dd.team = old; Dd.car = G.tr.f1[old]; }
    G.deal = { cost: 0, sal: salOf(G, 'f1', newTeam) };
  }
  function rbEvent(G) {
    if (G.cat !== 'f1' || !G.academy || !G.academy.n.startsWith('Red Bull') || G.S.round < 3 || G.S.injured > 0) return;
    const S = G.S, tb = standings(G), pos = tb.findIndex(d => d.isPlayer) + 1, mate = S.drivers.find(d => d.team === G.team && !d.isPlayer), elite = G.tier >= 2;
    if (G.team === 'Racing Bulls') {
      if (rnd() < (pos <= 6 ? (elite ? 0.02 : 0.008) : 0)) { moveF1(G, 'Red Bull Racing'); G.rep = Math.min(100, G.rep + 3); note(G, '📈 Red Bull promote you from Racing Bulls mid-season.'); }
    } else if (G.team === 'Red Bull Racing') {
      // harsh but not instant: only from round 8, only when clearly behind the team-mate on points, and a first season is protected
      const P0 = S.drivers.find(d => d.isPlayer), r = mate && P0 ? (P0.pts + 1) / (mate.pts + 1) : 1, ten = tenure(G, 'Red Bull Racing');
      let p = S.round < 8 ? 0 : r < 0.45 ? 0.05 : r < 0.6 ? 0.012 : 0; if (pos <= 6) p *= 0.3; if (elite) p *= 0.4; if (ten < 1) p *= 0.3;
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
      C.teams.slice(0, 11).forEach(t => { const n = t[0], k = cs.indexOf(G.tr.f1[n]); if (k >= 0 && k <= 3) { const cap = C.time ? C.time.devCap : 1.6; S.dev[n] = Math.max(-cap, Math.min(k <= 1 ? cap : 0.5, (S.dev[n] || 0) * 0.93 + gauss() * (C.time ? C.time.devSd : 0.16) * open)); } });
      const ranked = S.drivers.filter(d => d.pts > 0 || S.round > 2).slice().sort((x, y) => y.pts - x.pts), lead = ranked[0] ? ranked[0].pts : 0;
      const cf = d => { if (C.time) return 1; const k = cs.indexOf(d.car); return k <= 1 ? 1 : k === 2 ? 0.3 : 0.08; };   // talent can't drag a third-best-or-worse car to a title: only the two fastest cars give a driver full upside
      S.drivers.forEach(d => { if (d.sf === undefined) d.sf = d.isPlayer ? 0 : gauss() * (C.time ? C.time.formSd * formK(d.skill) : 0.85); d.form = d.sf > 0 ? d.sf * cf(d) : d.sf; });   // season-long form: some drivers click with the car, some don't
      // season arcs for the top drivers (and the player): flat, a slow start then locked in, or a flying start that the chasers eat into
      if (C.time && C.time.arc) { const A = C.time.arc, t = C.rounds > 1 ? ri / (C.rounds - 1) : 0;
        S.drivers.forEach(d => { if (d.arc === undefined) { const r = rnd(); d.arc = (d.isPlayer || (G.year > 2026 && d.skill >= 89)) ? (r < A.p[0] ? 0 : r < A.p[0] + A.p[1] ? 1 : -1) * (A.amp[0] + rnd() * (A.amp[1] - A.amp[0])) : 0; }
          if (d.arc && !d.isPlayer) d.form += d.arc * (1.5 * t - 0.75); });
        const pd = S.drivers.find(d => d.isPlayer); S.arcNow = pd && pd.arc ? pd.arc * (1.5 * t - 0.75) : 0; }
      if (S.dom && S.t2 === undefined) { const tm = S.drivers.filter(d => d.team === S.domTeam && !d.isPlayer).sort((x, y) => y.skill - x.skill); S.t2 = tm.length > 1 ? { id: tm[1].id, v: rnd() < 0.5 ? -(1 + rnd() * 2) : -rnd() * 0.8 } : false; }
      if (S.dom && S.t2) { const d2 = S.drivers.find(d => d.id === S.t2.id); if (d2) d2.form += S.t2.v; }
      // the season's title script, drawn so that the REALISED margins match 2010-2025: ~31% finale-tight (<=10), ~25% 11-70, ~25% 71-130, ~19% runaway (130+)
      // (draw weights are higher than the targets for tight and runaway seasons because some of those leak into the middle buckets)
      if (!S.scr) { const w = S.dom ? [0.02, 0.04, 0.22, 0.72] : [0.55, 0.135, 0.235, 0.08], r0 = rnd() * (w[0] + w[1] + w[2] + w[3]); let k = 0, acc = w[0]; while (k < 3 && r0 > acc) acc += w[++k];
        S.scr = { k, M: [rnd() * 10, 11 + rnd() * 52, 80 + rnd() * 50, 160 + rnd() * rnd() * 170][k] }; }
      if (!C.time && S.round >= Math.floor(C.rounds / 2) && ranked[0] && cs.indexOf(ranked[0].car) >= 2) {   // a title leader outside the two fastest cars gets reeled in
        const top2 = ranked.filter(d => cs.indexOf(d.car) <= 1 && !d.isPlayer)[0];
        if (top2 && ranked[0].pts - top2.pts < 80 && !ranked[0].isPlayer) { top2.form += 1.6; ranked[0].form -= 1.0; }
      }
      if (S.pIn0 === undefined) { const pc = S.drivers.find(d => d.isPlayer); S.pIn0 = !!pc && cs.indexOf(pc.car) <= 3; }   // a player in a top-four car: no script all season
      const pIn = S.pIn0 || ranked.slice(0, 5).some(d => d.isPlayer);   // the player anywhere near the title fight switches the script off entirely, so it never helps or hurts them
      if (S.round >= 2 && ranked.length > 1 && !pIn) {   // the script only runs AI-vs-AI fights; a player in the title fight is left to the cars and drivers
        const R = C.rounds, a = ranked[0], b = ranked[1], m = a.pts - b.pts, tgt = S.scr.M * Math.pow(S.round / R, 0.85), err = tgt - m, g = Math.min(S.scr.k === 3 ? (C.time ? 11 : 16) : (C.time ? 6.5 : 9), 0.12 * Math.abs(err) * (1 + 3 * S.round / R)) * Math.sign(err);
        const hu = !a.isPlayer, ch = !b.isPlayer;   // never steer the player: only the AI side of the fight
        if (g > 0) ranked.slice(1, 4).forEach(d => { if (!d.isPlayer) d.form -= g * (d === b ? 1 : 0.7); });   // fight too close for the script: everyone chasing falls back
        else if (ch) b.form -= g * (g < 0 ? cf(b) : 1);
        if (hu) a.form += g * (g > 0 ? 0.1 * cf(a) : 1);
      }
    }
    // Red Bull's harshness: a second driver who is well behind by mid-season is replaced by the best Racing Bulls driver (Albon 2020, Lawson 2025)
    if (C.time && ri === 11 && !S.rbSack && S.rbc) { S.rbSack = true;
      const pr = S.drivers.filter(d => d.team === 'Red Bull Racing' && !d.gone), lead = pr.find(d => d.name === S.rbc.lead), second = pr.find(d => d !== lead);
      if (lead && second && !second.isPlayer && second.pts < 0.4 * lead.pts && rnd() < C.time.rbSackP * (S.rbc.pen > 0 ? 1.0 : 0.6)) {
        const cand = S.drivers.filter(d => d.team === 'Racing Bulls' && !d.isPlayer && !d.gone).sort((a, b) => b.skill - a.skill)[0];
        if (cand) { const tm = G.f1.teams, a = tm['Red Bull Racing'], b = tm['Racing Bulls'], ai = a.findIndex(x => x && x.name === second.name), bi = b.findIndex(x => x && x.name === cand.name);
          second.team = 'Racing Bulls'; second.car = G.tr.f1['Racing Bulls']; cand.team = 'Red Bull Racing'; cand.car = G.tr.f1['Red Bull Racing']; cand.carPen = S.rbc.pen; second.carPen = 0;
          if (ai >= 0 && bi >= 0) { const t = a[ai]; a[ai] = b[bi]; b[bi] = t; } S.rbSackInfo = { out: second.name, in: cand.name, round: 12 }; note(G, `✂️ Red Bull drop ${second.name} after 11 rounds (${second.pts} pts to ${lead.pts}) and swap him with ${cand.name} from Racing Bulls.`); } } }
    const wet = rnd() < (C.time ? C.time.wetP : 0.18), out = S.injured > 0;
    const evIdx = C.events ? C.events.findIndex(e => ri >= e.from && ri <= e.to) : -1;
    const tmp = S.round < S.tmpUntil ? S.tmp : 0;
    const Dq = 0.35 * st.PAC + 0.45 * st.QUA + 0.1 * st.MEN + 0.1 * st.CON;
    const Dr = 0.28 * st.PAC + 0.28 * st.RAC + 0.14 * st.CON + 0.14 * st.TYR + 0.08 * st.MEN + 0.08 * st.FIT;
    const wetAdj = wet ? (st.WET - 60) * 0.3 : 0;
    if (S.fit === undefined) S.fit = gauss() * (C.time ? C.time.formSd * formK(ovrOf(st) - penOf(G.f1Years + 1)) : C.fitK !== undefined ? C.fitK : (C.tier >= 1 && C.tier <= 3 ? 3.2 : 1.2));   // how well the car/series suits you this year
    const bonus = S.boost + tmp + S.fit + (C.time ? S.arcNow || 0 : 0) - (S.rehab && S.round < S.rehab.rounds ? S.rehab.pen * (1 - S.round / S.rehab.rounds) : 0) - (S.learn || 0) * Math.max(0, 1 - 1.25 * ri / C.rounds);
    const mode = S.mode || 'balance', RAC = st.RAC, sigK = (C.sigK || 1) * (S.dom ? 1 : 1), dnfK = C.dnfK || 1, K = C.spread || 1, wS = C.wS || 0.55;
    const active = S.drivers.filter(d => !(d.isPlayer && out) && !d.gone);
    // units: one per driver, or one per car in crew series (WEC / GT): crew-mates share the result
    const units = [];
    if (C.crew) { const m = {}; active.forEach(d => { (m[d.team] = m[d.team] || { members: [], team: d.team, car: d.car }).members.push(d); }); Object.values(m).forEach(u => units.push(u)); }
    else active.forEach(d => units.push({ members: [d], team: d.team, car: d.car }));
    units.forEach(u => { u.hasP = u.members.some(d => d.isPlayer); });
    const uSkill = (u, pv) => u.members.reduce((a, d) => a + (d.isPlayer ? (S.exp !== undefined ? C.lvl + (pv - C.lvl) * S.exp : pv) + bonus + wetAdj : d.skill) + (d.form || 0), 0) / u.members.length;   // rookies only show part of their ceiling
    const carRankK = c => C.id === 'f1' ? S.drivers.map(d => d.car).filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => y - x).indexOf(c) : -1;
    const cpOf = u => ((u.members ? u.members[0] : u).carPen || 0), uCar = u => u.car - cpOf(u) + ((C.time ? u.team === S.teams[S.teams.length - 1] : u.hasP) ? S.carMod : 0) +   /* F1: a car upgrade or failure is the team's, so the team-mate gets it too */ (S.dev ? (S.dev[u.team] || 0) + (C.time ? 0 : carRankK(u.car) === 0 ? 1.1 : carRankK(u.car) === 1 ? 0.5 : carRankK(u.car) === 2 ? -0.6 : carRankK(u.car) === 3 ? -1.0 : 0) : 0) + (S.dom && S.domTeam === u.team ? 0 : 0);
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
    // ---- F1: lap-time model (F1DB-calibrated). Pace is in % of a lap behind the fastest car; lower = faster ----
    const TM = C.time, dynT = TM ? G.dyn[S.cat] : null, geT = TM ? (dynT.gapEra || 1) : 1, betaT = TM ? TM.beta * geT : 0;
    const regAgeT = TM ? Math.min(3, G.year - Math.max(...C.regYears.filter(y => y <= G.year), 2026)) : 0;
    // circuit character: passing difficulty, safety-car and incident propensity, tyre wear, pit loss, and which car traits it rewards (power / aero / mechanical grip)
    const TRK = TM ? ((TM.tracks && TM.tracks[C.names[ri]]) || TM.trackDefault) : null;
    if (TM && !TM.trackNorm) { const nm = C.names.map(n => (TM.tracks && TM.tracks[n]) || TM.trackDefault), av = k => nm.reduce((x, t) => x + t[k], 0) / nm.length; TM.trackNorm = { pass: av('pass'), sc: av('sc'), inc: av('inc') }; }
    let PROF = null;
    if (TM && G.dyn && G.dyn.f1) { const dF = G.dyn.f1, regStart = Math.max(...C.regYears.filter(y => y <= G.year), 2026);
      if (!dF.prof || dF.profReg !== regStart || Object.values(dF.prof).some(p => p.length < 4)) { dF.prof = {}; dF.profReg = regStart; C.teams.forEach(t => { dF.prof[t[0]] = [gauss() * TM.affSd, gauss() * TM.affSd, gauss() * TM.affSd, gauss() * TM.affSd]; }); }   // each car concept has its own strengths for the whole regulation cycle
      PROF = dF.prof; }
    const tfT = {}, trT = {}, tqT = {}; if (TM) C.teams.forEach(t => { tfT[t[0]] = gauss() * TM.trackSd * Math.sqrt(geT) + (PROF && PROF[t[0]] && TRK.w ? (PROF[t[0]][0] * TRK.w[0] + PROF[t[0]][1] * TRK.w[1] + PROF[t[0]][2] * TRK.w[2]) * Math.sqrt(geT) : 0); trT[t[0]] = gauss() * TM.raceTeamSd * Math.sqrt(geT); tqT[t[0]] = gauss() * (TM.qTeamSd || 0); });   // track fit (both days) and race-day-only car form (tyres, strategy, set-up)
    const carTopT = TM ? Math.max(...units.map(uCar)) : 0;
    const wetT = wet ? (st.WET - ovrOf(st)) * 0.3 : 0;   // wet skill relative to your own level (the AI's wet skill is centred on zero too)
    // 2026 per-driver form (one-lap/race offsets, spreads, fragility) is fitted to the 2026 season and fades by half each year after
    const fK = G.year > 2026 ? Math.pow(0.5, G.year - 2026) : 1, fAdd = (t, n) => ((t && t[n]) || 0) * fK, fMul = (t, n) => 1 + (((t && t[n]) || 1) - 1) * fK;
    // the very best barely have off weekends: execution noise and scrappy Saturdays shrink with level (the player always; the AI as the fitted 2026 tables fade)
    const pRt = TM ? ovrOf(st) - penOf(G.f1Years + 1) + (st.CON - ovrOf(st)) * 0.5 : 0, eK0 = r => TM ? clamp(1 - (r - 86) * (TM.eliteCons || 0), 0.72, 1.15) : 1;
    const eKraw = d => d.isPlayer ? eK0(pRt) : 1 + (eK0(d.skill) - 1) * (1 - fK), eKm = TM ? S.drivers.reduce((a, d) => a + eKraw(d), 0) / S.drivers.length : 1, eK = d => eKraw(d) / eKm;
    const rateT = (u, pv, race, spr) => u.members.reduce((a, d) => a + (d.isPlayer ? pv + bonus + wetT - penOf(G.f1Years + 1) : d.skill + (wet ? (d.wsk || (d.wsk = gauss() * 2.5)) : 0) + (race ? (d.rcr || (d.rcr = gauss() * TM.raceVsQuali * fMul(TM.cons, d.name))) - (d.rk ? TM.rookieRace : 0) + fAdd(TM.rc, d.name) * (spr ? (TM.sprRc === undefined ? 1 : TM.sprRc) : 1) : fAdd(TM.qc, d.name))) + (d.form || 0), 0) / u.members.length;
    const drvPctT = r => -(r - 84) * TM.dPt;
    const wkS = TM && TM.wkSd || 0, wkF = u => u.wkf === undefined ? (u.wkf = gauss() * wkS * (wet ? 1.5 : 1) * eK(u.members[0])) : u.wkf;   // a driver's good or bad weekend is shared between qualifying and the race
    const lapNoiseT = (k = 1, kb = 1) => TM ? gauss() * Math.sqrt(Math.max(0, TM.qSd * TM.qSd - wkS * wkS)) * k * (wet ? 1.8 : 1) + (rnd() < TM.badP * (wet ? 1.6 : 1) * kb ? -Math.log(1 - rnd()) * TM.badMean : 0) : 0;
    let carPctT = (u, race) => { const g = carTopT - uCar(u);
      // one-lap pace converges as the rules mature; race pace behind the front-runners does not: it is far wider in a reset year, then ~flat (OpenF1 2023-26)
      if (race) return betaT * Math.min(g, TM.raceKnee) + TM.beta * TM.raceBack * (regAgeT === 0 ? TM.raceReset : 1) * Math.pow(Math.max(0, g - TM.raceKnee), TM.raceBackPow);
      return betaT * (g <= TM.knee ? g : TM.knee + (g - TM.knee) * TM.tail * Math.pow(geT, 2.5)); };
    // in-season development (OpenF1 2023-26): over a season a team gains about 0.3% of a lap per 1% it starts behind the best car, +-0.4% either way; 2026 uses the real trends
    if (TM && !S.trend) { S.trend = {}; const tops = {}; S.drivers.forEach(d => { if (!tops[d.team] || (d.carPen || 0) < (tops[d.team].carPen || 0)) tops[d.team] = d; });
      const g0 = {}; Object.keys(tops).forEach(n => { const g = g0[n] = carPctT(tops[n], true); S.trend[n] = (TM.trend2026 && G.year === 2026 && TM.trend2026[n] != null) ? TM.trend2026[n] : -TM.trendK * g + gauss() * TM.trendSd * (regAgeT === 0 ? 1.3 : 1); });
      // development reshuffles, but within limits: the fastest car loses one place at most (rarely two), a top-four car one or two, and the midfield closes up but rarely breaks into the top four
      if (!(TM.trend2026 && G.year === 2026)) { const ns = Object.keys(tops), st0 = n => g0[n] - S.trend[n] / 2, en = n => g0[n] + S.trend[n] / 2, r0 = ns.slice().sort((a, b) => st0(a) - st0(b));
        const allow = {}; r0.forEach((n, i) => { allow[n] = i === 0 ? (rnd() < 0.05 ? 2 : 1) : i < 4 ? (rnd() < 0.08 ? 2 : 1) : 99; }); const crash = r0.slice(4).filter(() => rnd() < 0.02);   // real 2023-26: the fastest car dropped two places once (Red Bull 2024), a top-four car left the top four once (Aston 2023)
        // both orders are recomputed every pass (a car's trend shifts its starting place too); anyone who breaks a limit has its drift pulled towards the cars it jumped
        for (let it = 0; it < 60; it++) { const so = ns.slice().sort((x, y) => st0(x) - st0(y)), e = ns.slice().sort((x, y) => en(x) - en(y)); let bad = null;
          so.some((n, i) => { const q = e.indexOf(n);
            if (i < 4 && q > i + allow[n]) { bad = [n, e.filter((x, j) => j < q && so.indexOf(x) > i && j !== q)]; return true; }   // a top-four car fell too far
            if (i >= 4 && q < 4 && !crash.includes(n)) { bad = [n, e.slice(0, 4).filter(x => so.indexOf(x) < 4)]; return true; }   // a midfield car broke into the top four
            return false; });
          if (!bad) break; const grp = [bad[0]].concat(bad[1]), m = grp.reduce((x, n) => x + S.trend[n], 0) / grp.length; grp.forEach(n => { S.trend[n] += 0.35 * (m - S.trend[n]); }); } } }
    const trendSpan = TM && TM.trend2026 && G.year === 2026 ? (TM.trend2026Rounds || C.rounds) - 1 : C.rounds - 1;   // 2026: the real drift was measured over the races run so far, then holds
    const trendPOf = u => TM && TM.trend2026 && G.year === 2026 ? ((TM.trend2026Shape2 && TM.trend2026Shape2[u.team]) || TM.trend2026Shape || 1) : 1;   // 2026 development came late (Red Bull still behind Mercedes at mid-season, ahead from Malaysia)
    const bumpOf = u => { const b = TM && TM.trend2026 && G.year === 2026 && TM.trend2026Bump && TM.trend2026Bump[u.team]; return b ? b[2] * Math.exp(-Math.pow((S.round - b[0]) / b[1], 2)) : 0; };   // a one-off spell of form (McLaren, mid-2026)
    const trendNow = u => { const p = trendPOf(u); return ((S.trend || {})[u.team] || 0) * (Math.pow(Math.min(S.round, trendSpan) / Math.max(1, trendSpan), p) - 1 / (p + 1)) + bumpOf(u); };
    const carPct0 = carPctT;
    const rbrU = units.filter(u => u.team === 'Red Bull Racing').sort((a, b) => cpOf(a) - cpOf(b))[0];
    if (TM) carPctT = (u, race) => { const v = carPct0(u, race) + trendNow(u); if (u.team === 'Racing Bulls' && rbrU) { const ed = t => ((dynT.edge && dynT.edge[t]) || 0) * betaT; return Math.max(v, carPct0(rbrU, race) + trendNow(rbrU) + 0.03 + ed('Racing Bulls') - ed('Red Bull Racing')); } return v; };   // Racing Bulls is never quicker than Red Bull (and has never won a title)
    // the car order as it stands this round (race pace incl. upgrades and development), for the in-season car table
    if (TM) { const rep = {}; units.forEach(u => { if (!rep[u.team] || cpOf(u) < cpOf(rep[u.team])) rep[u.team] = u; });
      const rows = Object.values(rep).map(u => ({ t: u.team, p: carPctT(u, true) - ((dynT.edge && dynT.edge[u.team]) || 0) * betaT })).sort((a, b) => a.p - b.p), p0 = rows[0].p;
      rows.forEach((r, i) => { r.p = Math.round((r.p - p0) * 1000) / 1000; r.k = i + 1; });
      if (!S.car0) S.car0 = Object.fromEntries(rows.map(r => [r.t, r.k]));
      rows.forEach(r => { r.k0 = S.car0[r.t] || r.k; }); S.carNow = { round: ri + 1, rows };
      const me = rows.find(r => r.t === G.team); if (me) { (S.pCarK = S.pCarK || []).push(me.k); const mp = me.p + (P ? (P.carPen || 0) * betaT : 0); (S.pExp = S.pExp || []).push(1 + rows.reduce((a, r) => a + (r.t === G.team ? 0.5 : 2 / (1 + Math.exp((r.p - mp) / 0.12))), 0)); } }
    const PF = TM && TM.poleFade || [0.58, 2.5, 0.68, 6];
    const qPaceT = u => wkF(u) + carPctT(u) + tfT[u.team] + tqT[u.team] + drvPctT(rateT(u, Dq)) + lapNoiseT(u.members.reduce((a, m) => a + fMul(TM.qcons, m.name) * eK(m), 0) / u.members.length, u.members.reduce((a, m) => a + eK(m) ** 2, 0) / u.members.length) - (TM.domQ && S.dom && S.domTeam === u.team ? TM.domQ : 0);   // a dominant car is further clear over one lap (front-row lockouts)
    if (TM) {
      units.forEach(u => { u.qp = qPaceT(u) + (ri >= 5 ? u.members.reduce((m, d) => Math.max(m, Math.max(0, d.pole / ri - PF[0]) * PF[1] + Math.max(0, d.pole / ri - PF[2]) * PF[3]), 0) : 0); u.q = -u.qp; });   // nobody takes 19 poles from 24: long streaks regress (real max 79%, Vettel 2011)
      const qo = units.slice().sort((a, b) => a.qp - b.qp), e1 = Math.max(0.3, TM.evoQ1 + gauss() * 0.3), e2 = Math.max(0.1, TM.evoQ2 + gauss() * 0.15);
      // knockout: drivers out in Q2 / Q1 are timed on a slower track than the pole lap
      qo.forEach((u, i) => { u.qs = ((u.qp - qo[0].qp) + (i >= 16 ? e1 : i >= 10 ? e2 : 0)) / 100 * C.lap * (wet ? 1.07 : 1); });
    } else {
      spreadOf('q', Dq);
      if (C.id === 'f1') { const tq = {}; units.forEach(u => { (tq[u.team] = tq[u.team] || []).push(u); }); Object.values(tq).forEach(g => { const m = g.reduce((t, u) => t + u.q, 0) / g.length; g.forEach(u => { u.q = m + (S.dom && S.domTeam === u.team ? 0.38 : 0.5) * (u.q - m); }); }); }   // same car: teammates' one-lap pace sits closer than their race pace
      units.forEach(u => { u.q += gauss() * (wet ? 2.6 : (C.id === 'f1' ? 1.4 : 2.2)) + (C.id === 'f1' && rnd() < 0.13 ? -(1.2 + rnd() * 3.2) : 0) + (S.dom && S.domTeam === u.team ? 2.4 : 0) - (C.id === 'f1' && ri >= 5 ? u.members.reduce((m, d) => Math.max(m, Math.max(0, d.pole / ri - 0.63) * 14), 0) : 0); });   // sustained pole streaks regress: nobody takes 19 of 24   // bad Saturdays (traffic, mistakes, red flags); a dominant car also qualifies further clear
    }
    const qOrder = units.slice().sort((a, b) => b.q - a.q);
    if (!C.crew && uP) { const um = units.find(u => !u.hasP && u.team === uP.team); if (um) { const h = S.h2h || (S.h2h = { q: [0, 0], r: [0, 0] }); h.q[1]++; if (qOrder.indexOf(uP) < qOrder.indexOf(um)) h.q[0]++; } }
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
    const qGap = u => TM ? u.qs : qg(qOrder[0].q - u.q) * qScale;
    if (!out && qOrder.length > 1) qi = qpos === 1 ? { pos: 1, gap: Math.max(0.001, TM ? qOrder[1].qs : qg(qOrder[0].q - qOrder[1].q) * qScale * Math.exp(gauss() * 0.55)), lead: true } : { pos: qpos, gap: Math.max(0.001, qGap(uP)), lead: false };
    if (G.dbg) (G.dbg.qt = G.dbg.qt || []).push([qOrder[0].team, qOrder[1] && qOrder[1].team]);
    if (G.dbg) G.dbg.q.push(qOrder.map(qGap));
    if (G.dbg && G.dbg.full) G.dbg.qf.push(qOrder.map(u => ({ n: u.members[0].name, t: u.team, g: qGap(u), p: TM ? (u.qp - qOrder[0].qp) / 100 * C.lap : qGap(u) })));
    if (qOrder.length) qOrder[0].members.forEach(d => d.pole++);

    const entry = { ev: evIdx, round: ri + 1, name: C.names[ri] || ('Round ' + (ri + 1)), wet, qpos, qi, fp, races: [], pole: !out && qOrder[0] === uP, out, why: out ? (S.injWhy || (G.demoted ? 'dropped by the team' : null)) : null, field: units.length, mode };
    let prev = qOrder;
    const run = (rf, grid, isSpr) => {
      const n = grid.length; let scNow = false, vscNow = false;
      if (TM) {
        // race time = distance x (1 + race pace deficit) + track position + first-lap/strategy scatter; then reliability, incidents and safety cars
        const L = isSpr ? TM.sprintLaps : TM.laps, base = L * C.lap, sk = isSpr ? 0.5 : 1, gk = isSpr ? 0.45 : 1, lk = isSpr ? TM.sprintLaps / TM.laps : 1;
        const mfT = u => ((dynT.relTeam && dynT.relTeam[u.team]) || 1) * (dynT.fragile && dynT.fragile.year === G.year && dynT.fragile.team === u.team ? dynT.fragile.k : 1) * clamp(0.75 + (carTopT - uCar(u)) * (TM.relSlope || 0.045), TM.relMin || 0.7, TM.relMax || 1.9), mfM = grid.reduce((a, u) => a + mfT(u), 0) / grid.length;
        const consU = u => u.members.reduce((a, m) => a + fMul(TM.cons, m.name) * eK(m), 0) / u.members.length;   // some drivers turn their pace into results more steadily than others
        // chaos weekends: incidents and safety cars cluster in the same races (real: DNFs per race var/mean 1.4, and +25% retirements in safety-car races)
        const cP = TM.chaosP || 0, chaos = !isSpr && cP > 0 && rnd() < cP, chaosK = chaos ? TM.chaosK : (1 - cP * TM.chaosK) / (1 - cP || 1);
        const degR = TRK.deg * (TM.strat ? TM.strat.degScale : 1) * Math.exp(gauss() * (TM.strat ? TM.strat.degSd : 0)), pit = TRK.pit;   // this weekend's tyre wear (1 = the break-even between one and two stops) and pit-lane loss
        const trkPass = TRK.pass / TM.trackNorm.pass, trkSC = TRK.sc / TM.trackNorm.sc, trkInc = TRK.inc / TM.trackNorm.inc;
        const spT = {}; if (isSpr) C.teams.forEach(t => { spT[t[0]] = gauss() * (TM.sprintTeamSd || 0); });   // sprint-day car form is its own draw: the 19-lap dash suits cars differently from the Sunday race
        grid.forEach((u, gi) => {
          u.grid = gi + 1;
          let rp = carPctT(u, true) - ((dynT.edge && dynT.edge[u.team]) || 0) * betaT + tfT[u.team] * TM.tfRace + trT[u.team] + drvPctT(rateT(u, Dr, true, isSpr)) + wkF(u) - (!isSpr && PROF && PROF[u.team] ? PROF[u.team][3] * (degR - 1) * (TM.tyreK || 0) : 0) + gauss() * Math.sqrt(Math.max(0, TM.rSd * TM.rSd - wkS * wkS)) * consU(u) * (wet ? 1.6 : 1) + (isSpr ? spT[u.team] + gauss() * (TM.sprintDrvSd || 0) : 0)
            + (!isSpr && ri >= 6 ? u.members.reduce((m, d) => Math.max(m, Math.max(0, d.w / ri - (TM.winFade ? TM.winFade[0] : 0.66)) * (TM.winFade ? TM.winFade[1] : 3) * (S.dom ? (TM.domFade === undefined ? 1 : TM.domFade) : 1)), 0) : 0);   // win streaks fade too (rivals' upgrades, risk, reliability): real record 19 of 22
          let pe = TM.inc[gi < 3 ? 0 : gi < 6 ? 1 : gi < 10 ? 2 : gi < 15 ? 3 : 4] / 100 * (wet ? 1.8 : 1) * (isSpr ? 0.45 : 1) * (cP && !isSpr ? chaosK : 1) * trkInc * (!isSpr && TM.l1P ? TM.l1IncK : 1);
          let pr = TM.mech[regAgeT] / 100 * (G.year === 2026 ? TM.mech26 || 1 : 1) * mfT(u) / mfM * (isSpr ? 0.35 : 1);   // 2026 is an unusually fragile new-engine year
          if (cpOf(u) > 0) pe *= TM.rbPress;   // the second Red Bull seat: the team wants the lead driver ahead, mistakes are punished
          if (u.hasP) {
            pe *= clamp(1 + (65 - st.CON) * 0.012, 0.6, 1.5) * (G.f1Years < 2 ? 1.3 : 1);
            if (mode === 'push') { rp -= 0.05 + (RAC - 60) * 0.001; pe *= clamp(1.6 + (60 - RAC) * 0.03, 1.15, 3.4); pr *= 1.15; }
            else if (mode === 'coast') { rp += 0.05; pe *= 0.45; pr *= 0.8; }
          } else if (u.members.some(d => d.rk)) pe *= 1.5;
          u.tsec = base * (1 + rp / 100) + ((gi > 0 ? TM.poleS : 0) + gi * TM.gridS + gi * gi * TM.gridS2) * gk + gauss() * TM.startSd * (TM.startPos ? TM.startPos[gi < 3 ? 0 : gi < 8 ? 1 : 2] : 1) * consU(u) * sk * (wet ? 1.5 : 1) + (rnd() < TM.lossP * lk ? (u.slow = 1, 4 + rnd() * TM.lossMax) : 0) + (rnd() < TM.dmgP * lk ? (u.dmg = 1, 15 + rnd() * 45) : 0);   // + first-lap damage / drive-through   // slow stop, time penalty, strategy miss
          { const dk = fMul(TM.dnfD, u.members[0].name); pe *= dk; pr *= dk; }   // some drivers' seasons are more (or less) fragile than their car's
          u.crash = rnd() < pe + pr; u.cause = u.crash ? (rnd() < pe / (pe + pr) ? 'error' : 'reliability') : null; u.rp = rp;
          if (!isSpr && TM.strat) {   // tyre strategy: the team reads the weekend's tyre wear with some error and picks one or two stops; a wrong call costs time
            const ST = TM.strat, k = ST.k0 * degR, cost = s => s * pit + k * L * L / (2 * (s + 1)), est = degR * (1 + gauss() * (ST.estSd + ST.estGap * Math.min(10, Math.max(0, carTopT - uCar(u)))));
            const kE = ST.k0 * est * (wet ? 1.4 : 1), costE = s => s * pit + kE * L * L / (2 * (s + 1));
            u.stops = [1, 2, 3].reduce((b, s) => costE(s) < costE(b) ? s : b, 1); u.regret = cost(u.stops) - Math.min(cost(1), cost(2), cost(3)) + gauss() * ST.stopSd * u.stops;
            u.comp = u.stops === 1 ? (rnd() < 0.7 ? 'M-H' : 'H-M') : u.stops === 2 ? (rnd() < 0.45 ? 'M-H-M' : rnd() < 0.6 ? 'S-M-H' : 'M-H-H') : (rnd() < 0.5 ? 'S-M-M-H' : 'M-H-M-S');
            u.plan = u.stops === 1 ? [L * (0.42 + gauss() * 0.06)] : u.stops === 2 ? [L * (0.3 + gauss() * 0.05), L * (0.64 + gauss() * 0.05)] : [L * (0.22 + gauss() * 0.04), L * (0.47 + gauss() * 0.04), L * (0.72 + gauss() * 0.04)]; u.tsec += u.regret * ST.w; }
        });
        let forceSC = false;
        if (!isSpr && TM.l1P && rnd() < TM.l1P * (chaos ? TM.l1Chaos : 1)) {   // a first-lap pile-up: two or three cars around the same grid slot are out on the spot
          const c = Math.min(grid.length - 2, 3 + Math.floor(rnd() * 13)), vic = rnd() < 0.3 ? [c - 1, c, c + 1] : rnd() < 0.5 ? [c - 1, c] : [c, c + 1];
          vic.forEach(i => { const u = grid[i]; if (u && !u.crash) { u.crash = true; u.cause = 'error'; u.l1 = true; } }); forceSC = rnd() < 0.85;
        }
        if (!isSpr && TM.strat) { const mr = grid.reduce((x, u) => x + (u.regret || 0), 0) / grid.length; grid.forEach(u => { u.tsec -= mr * TM.strat.w; }); }   // only the difference between teams' calls matters: the average cost is already in the calibrated pace
        if (TM.passS) {   // overtaking: every slower car that started ahead of you costs time to pass
          const raw = grid.map(u => u.tsec);
          grid.forEach((u, gi) => { let k = 0;
            for (let j = 0; j < gi; j++) if (raw[j] > raw[gi]) { let c = TM.passNear ? TM.passFar + (TM.passNear - TM.passFar) * Math.exp(-(raw[j] - raw[gi]) / (TM.passScale || 15)) : 1;
              const UC = TM.undercut, v = grid[j]; if (UC && !isSpr && u.plan && v.plan && Math.abs(u.plan[0] - v.plan[0]) >= 2 && rnd() < UC.p) { c *= 1 - UC.cut; u.ucd = 1; }   // undercut or overcut: a different pit window gets you past without fighting on track
              k += c; }   // passing a car barely slower than you is hard; waltzing past a much slower one is not
            u.tsec += k * TM.passS * gk * trkPass; });
        }
        const red = !isSpr && TM.redP && rnd() < TM.redP * (chaos ? TM.redChaos : (1 - cP * TM.redChaos) / (1 - cP || 1)) * trkSC * (wet ? 1.8 : 1);   // red flag: the race is stopped, gaps reset, everyone gets free tyres
        if (red || forceSC || rnd() < Math.min(0.97, (isSpr ? TM.scSprint : cP ? (chaos ? TM.chaosSC : (TM.scP - cP * TM.chaosSC) / (1 - cP)) : TM.scP) * (wet ? 1.5 : 1) * trkSC)) {   // safety car: the field is bunched at some point and the order gets a shake at the restart
          // f = share of the gaps erased: about a third of real safety cars come in the first laps and erase almost nothing (OpenF1 2023-26)
          const f = red ? 0.9 + 0.1 * rnd() : forceSC ? 0.02 + 0.1 * rnd() : rnd() < (TM.scEarly || 0) ? 0.02 + 0.08 * rnd() : 0.15 + 0.85 * rnd(), live = grid.filter(u => !u.crash), t0 = Math.min(...live.map(u => u.tsec)); scNow = red ? 'red' : true;
          if (!isSpr && TM.strat && red) { const lapR = L * (0.1 + 0.8 * rnd()); live.forEach(u => { if (u.plan && u.plan.some(l => l > lapR)) { u.tsec -= TM.strat.redGain * pit; u.scBen = 2; } }); }   // a red flag is a free tyre change for anyone who still had a stop to make
          else if (!isSpr && TM.strat && !forceSC) { const lapSC = L * (0.05 + 0.9 * rnd()), ST = TM.strat; live.forEach(u => { if (!u.plan) return; u.scBen = 0;
              if (lapSC > 0.1 * L && u.plan.some(l => l > lapSC)) { u.tsec -= ST.scGain * pit; u.scBen = 1; }   // a stop still to make becomes cheap under the safety car
              else if (u.plan.some(l => l <= lapSC && l > lapSC - 3)) { u.tsec += ST.scLoss * pit; u.scBen = -1; } }); }   // stopped a lap or two earlier: a free stop wasted
          live.forEach(u => { u.tsec = t0 + (u.tsec - t0) * (1 - f) + Math.abs(gauss()) * TM.restartSd * (red ? TM.redRestart : 1); });
        }
        if (!isSpr && TM.vscP && rnd() < Math.min(0.9, TM.vscP * Math.sqrt(trkSC))) {   // virtual safety car: everyone slows, gaps shrink a little, a stop costs about half
          const f = 0.03 + 0.12 * rnd(), live = grid.filter(u => !u.crash), t0 = Math.min(...live.map(u => u.tsec)), lapV = L * (0.1 + 0.8 * rnd()); vscNow = true;
          live.forEach(u => { if (TM.strat && u.plan && !u.scBen) { if (u.plan.some(l => l > lapV)) { u.tsec -= TM.strat.vscGain * pit; u.scBen = 3; } else if (u.plan.some(l => l <= lapV && l > lapV - 2)) { u.tsec += TM.strat.vscLoss * pit; u.scBen = -3; } }
            u.tsec = t0 + (u.tsec - t0) * (1 - f); });
        }
        { const live = grid.filter(u => !u.crash).sort((a, b) => a.tsec - b.tsec);   // a leader with a big gap manages it rather than flat-out extending it
          if (live.length > 1) { const m = live[1].tsec - live[0].tsec, c = TM.cruiseAt * (isSpr ? 0.4 : 1); if (m > c) live[0].tsec = live[1].tsec - (c + (m - c) * TM.cruiseK); } }
        // retiring in the last 10% of the race still gets you classified, laps down (F1DB: ~2% of starters)
        grid.forEach(u => { if (!u.crash && rnd() < (TM.lateP || 0) * lk) { const done = Math.floor(L * (0.9 + 0.1 * rnd())); u.late = true; u.tsec += (L - done) * C.lap * 1.05; } u.s = -u.tsec; });
      } else {
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
          u.s = rm + K * (u.cb - rm) + (n / 2 - gi) * 0.16 + bias + gauss() * (sig + (wet ? 1.5 * sigK : 0)) + (C.upsetP && !u.hasP && rnd() < C.upsetP * (isSpr ? 0.5 : 1) ? Math.abs(gauss()) * sig * (C.upsetK || 1.5) : 0);   // a lottery result: safety-car timing, strategy, a lucky restart
          u.crash = rnd() < pe + pr; u.cause = u.crash ? (rnd() < pe / (pe + pr) ? 'error' : 'reliability') : null;
        });
        if (mode === 'coast' && uP && grid.includes(uP)) { const m = grid.reduce((a, u) => a + u.s, 0) / n; uP.s = 0.85 * uP.s + 0.15 * m; }
      }
      const res = grid.filter(u => !u.crash).sort((a, b) => b.s - a.s).concat(grid.filter(u => u.crash));
      if (C.id === 'f1' && !isSpr && ri === C.rounds - 1 && S.scr) {   // finale: the real-life title script plays out through the top two's finishing places
        const rk = S.drivers.filter(d => d.pts >= 0).slice().sort((x, y) => y.pts - x.pts), A = rk[0], B = rk[1], ua = res.find(u => u.members.includes(A)), ub = res.find(u => u.members.includes(B));
        if (ua && ub && !ua.crash && !ub.crash && !ua.late && !ub.late && !S.pIn0 && !rk.slice(0, 5).some(d => d.isPlayer)) {
          const f0 = res.filter(u => !u.crash && !u.late), P = rf.pts, lim = Math.min(12, f0.length), ca = f0.indexOf(ua), cb = f0.indexOf(ub), M = S.scr.M, pinP = f0.findIndex(u => u.hasP); let best = null;
          for (let pa = 0; pa < lim; pa++) for (let pb = 0; pb < lim; pb++) {
            if (pa === pb || pa === pinP || pb === pinP) continue;
            const mg = (A.pts + (P[pa] || 0)) - (B.pts + (P[pb] || 0)), cost = Math.abs((M <= 10 ? Math.abs(mg) : mg) - M) + 0.4 * (Math.abs(pa - ca) + Math.abs(pb - cb)) + rnd() * 0.5;
            if (!best || cost < best.cost) best = { cost, pa, pb };
          }
          if (best) { const rest = f0.filter((u, i) => u !== ua && u !== ub && i !== pinP), nf = []; for (let i = 0, r = 0; i < f0.length; i++) nf.push(i === best.pa ? ua : i === best.pb ? ub : i === pinP ? f0[pinP] : rest[r++]); if (TM) { const ts = f0.map(u => u.tsec); nf.forEach((u, i) => { u.tsec = ts[i]; u.s = -ts[i]; }); } res.splice(0, res.length, ...nf, ...res.filter(u => u.late && !u.crash), ...res.filter(u => u.crash)); }
        }
      }
      const fin = res.filter(u => !u.crash);
      const rScale = (C.rK || 0.1) * (isSpr || rf.n === 'Sprint' || rf.n === 'Heat' ? 0.55 : 1) * wk * wetK * eraK * (rnd() < 0.22 ? 0.5 : 1); // 22%: a safety car bunches the field
      const gapR = (a, b) => TM ? b.tsec - a.tsec : rg(a.s - b.s) * rScale;
      if (G.dbg && !isSpr) G.dbg.r.push(fin.map(u => gapR(fin[0], u)));
      if (G.dbg && G.dbg.pace && TM && !isSpr) G.dbg.pace.push({ sc: scNow, vsc: vscNow, base: TM.laps * C.lap, u: res.map(u => ({ n: u.members[0].name, t: u.team, qs: u.qs, rp: u.rp, ts: u.tsec, grid: u.grid, crash: !!u.crash, p: !!u.hasP, stops: u.stops, scBen: u.scBen })) });
      if (G.dbg && G.dbg.spr && isSpr) G.dbg.spr.push({ ri, grid: grid.map(u => u.members[0].name), res: res.map(u => ({ n: u.members[0].name, t: u.team, crash: !!u.crash })) });
      if (G.dbg && G.dbg.full && !isSpr) G.dbg.rf.push({ grid: grid.map(u => u.members[0].name), res: res.map(u => ({ n: u.members[0].name, t: u.team, crash: !!u.crash, cause: u.cause, g: u.crash ? null : gapR(fin[0], u) })) });
      res.forEach((u, i) => u.members.forEach(d => { if (!rf.stage) d.races++; if (isSpr) d.sr = (d.sr || 0) + 1; if (u.crash) { if (isSpr) d.sdnf = (d.sdnf || 0) + 1; if (!rf.stage) { d.dnf++; if (u.cause === 'error') d.dnfE = (d.dnfE || 0) + 1; else d.dnfR = (d.dnfR || 0) + 1; } return; } d.pts += rf.pts[i] || 0; if (S.tpts) S.tpts[d.team] = (S.tpts[d.team] || 0) + (rf.pts[i] || 0); if (evIdx >= 0 && !isSpr) { d.ev = d.ev || []; d.ev[evIdx] = (d.ev[evIdx] || 0) + (rf.pts[i] || 0); } if (!isSpr) { if (i === 0) d.w++; if (i < 3) d.p++; if (!rf.stage) { d.fc = d.fc || []; d.fc[i] = (d.fc[i] || 0) + 1; } } else { d.sw = (d.sw || 0) + (i === 0 ? 1 : 0); d.sp = (d.sp || 0) + (i < 3 ? 1 : 0); d.spts = (d.spts || 0) + (rf.pts[i] || 0); } }));
      if (!C.crew && !isSpr && uP && !uP.crash) { const um = res.find(u => !u.hasP && u.team === uP.team); if (um && !um.crash) { const h = S.h2h || (S.h2h = { q: [0, 0], r: [0, 0] }); h.r[1]++; if (res.indexOf(uP) < res.indexOf(um)) h.r[0]++; } }
      if (!out) {
        const pos = res.indexOf(uP) + 1;
        let gap = null, lead = false, laps = 0;
        if (!uP.crash && fin.length > 1) { lead = pos === 1; gap = Math.max(0.001, lead ? (TM ? gapR(fin[0], fin[1]) : rg(fin[0].s - fin[1].s) * rScale * Math.exp(gauss() * 0.55)) : gapR(fin[0], uP)); if (!lead && TM) laps = Math.max(0, Math.ceil((isSpr ? TM.sprintLaps : TM.laps) * gap / uP.tsec) - 1); else if (!lead && C.lap && gap >= C.lap) laps = gap >= C.lap * 2.4 ? 2 : 1; }
        // rivalries: who you keep finishing next to, and who has the upper hand (a rival is built from close finishes, not picked)
        if (!isSpr && !C.crew && !uP.crash && !out) { const ix = res.indexOf(uP); res.forEach((u, j) => { if (u === uP || u.crash || Math.abs(j - ix) > 3) return; const d = u.members[0]; if (d.isPlayer) return;
          const e = (G.riv = G.riv || {})[d.name] = (G.riv || {})[d.name] || { a: 0, w: 0, l: 0, n: 0, y: [] }; e.n++; if (j < ix) e.l++; else e.w++; if (Math.abs(j - ix) === 1) e.a++; if (!e.y.includes(G.year)) e.y.push(G.year);
          const se = (S.rivS = S.rivS || {})[d.name] = (S.rivS || {})[d.name] || { a: 0, w: 0, l: 0, n: 0 }; se.n++; if (j < ix) se.l++; else se.w++; if (Math.abs(j - ix) === 1) se.a++; }); }
        // stewards: penalty points for causing collisions, unsafe releases and the like (F1 and the junior single-seaters); 12 in a rolling year is a one-race ban
        let steward = null;
        if (!isSpr && STEW.includes(C.id)) {
          const crashErr = uP.crash && uP.cause === 'error' && !uP.l1, pr = crashErr ? 0.45 : uP.crash ? 0 : 0.065 * (mode === 'push' ? 2.5 : mode === 'coast' ? 0.5 : 1) * clamp(1 + (65 - st.CON) * 0.015, 0.6, 1.6);
          if (rnd() < pr) { const kind = crashErr || rnd() < 0.35 ? 'causing a collision' : pick(['an unsafe release', 'forcing another driver off the track', 'ignoring a blue flag', 'a dangerous move under braking']), pts = crashErr ? (rnd() < 0.3 ? 3 : 2) : kind === 'ignoring a blue flag' ? 1 : (rnd() < 0.7 ? 1 : 2);
            (G.pen = G.pen || []).push({ y: G.year, r: ri, n: rf.n, pts, why: kind }); G.penTot = (G.penTot || 0) + pts; const act = penActive(G, ri); steward = { txt: `stewards: ${crashErr ? '' : '5-second penalty for '}${kind}`, pts, act };
            if (act >= 12) { S.injured = Math.max(S.injured, 2); S.injWhy = 'banned for a race: 12 penalty points'; (G.injuries = G.injuries || []).push({ year: G.year, age: G.age, cat: C.short, why: 'a one-race ban after reaching 12 penalty points', missed: 1, kind: 'ban' }); G.pen = []; steward.ban = true; note(G, `🚫 12 penalty points: you are banned from the next race.`); } }
        }
        entry.races.push({ story: raceStory(uP, pos, wet, scNow === 'red' ? 'red' : scNow ? 'sc' : vscNow ? 'vsc' : null, steward), steward, n: rf.n, neut: scNow === 'red' ? 'red' : scNow ? 'sc' : vscNow ? 'vsc' : null, l1: !!uP.l1, stops: !isSpr && !uP.crash && uP.stops ? uP.stops : null, comp: !isSpr && uP.stops ? uP.comp : null, scpit: !isSpr ? uP.scBen || 0 : 0, grid: uP.grid, pen: (!isSpr && uP.pen) || null, qpos: (!isSpr && uP.pen && uP.qpos) || null, late: !!uP.late, pos, dnf: uP.crash, cause: uP.crash ? uP.cause : null, pts: uP.crash ? 0 : (rf.pts[pos - 1] || 0), spr: !!isSpr, gap, lead, laps });
        if (!isSpr && pos === 1 && !uP.crash) { if (C.special && C.special[ri]) S.trophies.push(C.special[ri]); }
      }
      return res;
    };
    if (C.sprints && C.sprints.includes(ri)) {
      units.forEach(u => { u.sq = TM ? -qPaceT(u) : mixOf(u, Dq) + gauss() * (wet ? 3.8 : 2.6); });
      run({ n: 'Sprint', pts: SPR }, units.slice().sort((a, b) => b.sq - a.sq), true);
      entry.sprint = true;
    }
    C.rf.forEach(rf => {
      let grid;
      if (rf.grid === 'q') {
        grid = qOrder.slice();
        if (TM) {   // power-unit / gearbox / sporting grid penalties: more of them as the season wears on
          const pp = TM.penP * (0.4 + 1.2 * ri / C.rounds), q0 = new Map(grid.map((u, i) => [u, i + 1])), pens = grid.filter(() => rnd() < pp);
          pens.forEach(u => { const i = grid.indexOf(u), toBack = rnd() < 0.4, n = rnd() < 0.5 ? 5 : 10, back = toBack ? grid.length : i + n; grid.splice(i, 1); grid.splice(Math.min(grid.length, back), 0, u); u.pen = toBack ? 'back' : n; u.qpos = q0.get(u); });   // qpos = where the car really qualified, whatever the other penalties did to the order
        }
      }
      else if (rf.grid === 'prev') grid = prev.slice();
      else { const k = +rf.grid.replace('rev', ''); grid = qOrder.slice(); grid = grid.slice(0, k).reverse().concat(grid.slice(k)); }
      prev = run(rf, grid, !!rf.stage);   // NASCAR stages score stage points only: no wins, light incident rate
    });
    S.log.push(entry);
    S.round++;
    if (S.injured > 0) { S.injured--; if (!S.injured) S.injWhy = null; }
    rbEvent(G);
    if (S.round >= C.rounds) S.over = true;
    else if (S.spins < 2 && S.round >= S.stageEnds[S.spins]) S.wheelDue = true;
    return entry;
  }
  function simToEnd(G) { while (!G.S.over && !G.S.wheelDue) playRound(G); }
  function setMode(G, m) { if (G.S) G.S.mode = m; }

  // constructors' championship: every point a team's cars scored, credited to the team that was running the car at the time
  function constructors(G) {
    const S = G.S, tp = S.tpts || {}, rows = {}; S.drivers.forEach(d => { if (!(d.team in rows)) rows[d.team] = { team: d.team, pts: 0, w: 0 }; rows[d.team].w += 0; });
    if (S.tpts) Object.keys(tp).forEach(t => { rows[t] = rows[t] || { team: t, pts: 0, w: 0 }; rows[t].pts = tp[t]; }); else S.drivers.forEach(d => { rows[d.team].pts += d.pts; });
    S.drivers.forEach(d => { if (rows[d.team]) rows[d.team].w += d.w; });
    return Object.values(rows).sort((a, b) => b.pts - a.pts || b.w - a.w);
  }
  // standings for one competition (index into the series' events, or -1 for the whole championship)
  function standingsEv(G, i) {
    const S = G.S, C = CATS[S.cat], val = d => (i < 0 || !C.events) ? d.pts : ((d.ev && d.ev[i]) || 0);
    return S.drivers.slice().sort((a, b) => val(b) - val(a) || cmpDrv(a, b)).map(d => ({ d, v: val(d) }));
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
  // F1: a team only drops you mid-season when the team-mate is beating you clearly (never in the first half of a rookie year)
  const f1Beaten = G => {
    const S = G.S, P = player(G), m = S.drivers.filter(d => !d.isPlayer && d.team === G.team && !d.gone).sort((a, b) => b.races - a.races)[0], h = S.h2h;
    if (!m || !h || h.q[1] < 4 || (G.f1Years === 0 && S.round < CATS[S.cat].rounds / 2)) return false;
    return (P.pts + 5) / (P.pts + m.pts + 10) < 0.35 || (h.q[0] + 1) / (h.q[1] + 2) < 0.35;
  };
  function wheelList(G) {
    const S = G.S, C = CATS[S.cat], tb = standings(G), pos = tb.findIndex(d => d.isPlayer) + 1, N = tb.length;
    const low = pos > N * 0.7;
    const lastSI = G.standIns.length ? G.standIns[G.standIns.length - 1].year : -99;
    const f1Path = ['f2', 'sf', 'indy', 'wec', 'fe', 'imsa', 'nascar', 'dtm', 'supercars', 'gt3w'].includes(S.cat) && G.age <= (G.reserve ? 38 : 31) && (G.academy || G.reserve || G.rep >= 62)
      && (G.year - lastSI) >= (G.reserve ? 2 : 3) && (!G.history.some(h => h.cat === 'f1') || !!G.reserve) && !G.demoted;
    const L = [
      { id: 'upgrade', g: 1, w: 13, ic: '🔧', t: 'Car upgrade', fx: 'Your car is +2.5 rating for the rest of the season.' },
      { id: 'breakthrough', g: 1, w: 11, ic: '⚡', t: 'Breakthrough', fx: 'One random attribute jumps +3 (permanent).' },
      { id: 'engineer', g: 1, w: 9, ic: '🎧', t: 'Engineer clicks', fx: '+2 pace for the rest of the season.' },
      { id: 'form', g: 1, w: 6, ic: '🔥', t: 'Purple patch', fx: 'Red-hot form: +4 pace for the rest of the season.' },
      { id: 'sponsorNew', g: 1, w: 9, ok: C.pay, ic: '💷', t: 'New sponsor', fx: 'Funding +35%. Opens bigger seats next summer.' },
      { id: 'academy', g: 1, w: 9, ok: !G.academy && G.rep >= 40 && C.tier >= 1 && C.tier <= 3 && G.age <= 24, ic: '🎓', t: 'Academy signing', fx: 'A manufacturer academy pays your seat in F4–F2, +4 rep, yearly development boost and priority from its F1 team. It can drop you after a bad year (Red Bull drops far more often).' },
      { id: 'standIn', g: 1, w: G.reserve ? 14 : 4, ok: f1Path, ic: '🚨', t: 'F1 stand-in', fx: 'You replace an injured F1 driver for 1–4 grands prix (you miss 1–2 rounds here). Your F1 results show up, then you return to your series. Points boost rep and F1 interest.' },
      { id: 'fp1', g: 1, w: perkOf(G) ? perkOf(G).fp1 : 8, ok: fp1Elig(G) && C.tier >= 1 && C.tier <= 3, ic: '🏎️', t: 'FP1 outing', fx: 'Your academy puts you in an F1 car for Friday practice. Rookies only (no more than 2 F1 starts): you need 25 super licence points or a full F2 season, and to be 18 (17 with Red Bull, which has two teams so twice the slots). Clean running earns 1 licence point a weekend, up to 10. Where you finish decides how much rep you earn (+1 to +3).' },
      { id: 'feud', g: 1, w: 4, ok: !!rivalOf(G) && S.drivers.some(d => d.name === rivalOf(G)) && C.tier >= 1 && !C.crew, ic: '🔥', t: 'Rivalry heats up', fx: 'Your rivalry with the driver you always end up next to is the story of the paddock: +2 rep, a boost to your profile and +1 pace for the rest of the season (you are fired up).' },
      { id: 'feudBad', g: -1, w: 4, ok: !!rivalOf(G) && S.drivers.some(d => d.name === rivalOf(G)) && C.tier >= 1 && !C.crew, ic: '🥊', t: 'Paddock feud', fx: 'A public row with your rival after a clash: the team boss is unhappy. −1 pace for the rest of the season and −2 rep.' },
      { id: 'crash', g: -1, fixed: true, w: 1.5, ok: !G.demoted && S.injured < 3, ic: '💥', t: 'Heavy crash', fx: 'A big shunt. You miss the next round (very rarely two) and lose 1 Fitness. Rare in real life (an F1 driver misses a race through injury or illness about once in 20 seasons), so the slice is small.' },
      { id: 'sponsorLost', g: -1, w: 9, ok: C.pay && C.tier <= 3, ic: '📉', t: 'Sponsor backs out', fx: 'Funding −30% for good. Pay-to-drive series get pricier to afford, so next summer you see fewer or weaker seats.' },
      { id: 'badup', g: -1, w: 7, ok: C.tier >= 1, ic: '🛠️', t: 'Reliability woes', fx: 'A bad development path: car −2 rating for the rest of the season.' },
      { id: 'slump', g: -1, w: 5, ic: '🥶', t: 'Confidence slump', fx: '−2 pace for the rest of the season and −1 Mentality.' },
      { id: 'illness', g: -1, w: 5, ic: '🤒', t: 'Illness', fx: '−3 pace for the next two rounds.' },
      { id: 'sacked', g: -1, w: C.time ? (S.rbc && S.rbc.other === G.name ? (tenure(G, 'Red Bull Racing') < 2 ? 2.5 : 4.5) : G.team === 'Racing Bulls' ? 3 : 2) : low ? 9 : 1.2, ok: C.time ? f1Beaten(G) && !(S.rbc && S.rbc.other === G.name && (P0 => { const ld = S.drivers.find(d => d.name === S.rbc.lead); return P0 && ld && P0.pts >= 0.62 * ld.pts; })(S.drivers.find(d => d.isPlayer))) : C.tier >= 1 && pos > Math.max(3, N * 0.5), ic: '✂️', t: 'Dropped by team', fx: C.tier === 4 ? 'The team drops you mid-season (far likelier in the bottom 30%). You sit out several races or the rest of the year, then get offers from lower F1 teams, a small chance from bigger ones, or other series.' : 'Team sacks you for poor results (far likelier if you are in the bottom 30%). You finish the year in a worse seat: car −3.5, −3 rep, and no re-sign option.' },
      { id: 'careerEnd', g: -1, fixed: true, w: 0.3, ok: C.tier >= 1, ic: '🩹', t: 'Career-ending injury', fx: 'A freak injury ends your racing career immediately. Very rare.' },
      { id: 'fatal', g: -1, fixed: true, w: 0.04, ok: C.tier >= 1, ic: '🕯️', t: 'Fatal accident', fx: 'A tragic accident ends your career. Extremely rare.' },
    ].filter(o => o.ok === undefined || o.ok);
    const sg = L.filter(o => o.g > 0).reduce((a, o) => a + o.w, 0), sb = L.filter(o => o.g < 0 && !o.fixed).reduce((a, o) => a + o.w, 0);
    if (sb > 0 && sg > 0) L.forEach(o => { if (o.g < 0 && !o.fixed) o.w = Math.round(o.w * sg / sb * 100) / 100; });
    const cols = ['#1fbf75', '#4da3ff', '#2dd4bf', '#ffd23f', '#84cc16', '#b57bff', '#22d3ee', '#a7f3d0', '#ff4d6d', '#ff8a5c', '#f97316', '#ec4899', '#f43f5e', '#fb7185', '#a3a3a3', '#64748b'];
    L.forEach((o, i) => o.col = cols[i % cols.length]);
    return L;
  }
  // what put you on the sidelines (mixed from real cases: Sainz's appendix, Stroll's cycling wrists, Albon's appendix, Bearman's stand-in call, Massa's Hungary spring)
  // [what happened, rounds out] (a round is about two weeks, so a 6-week break is 3 rounds)
  // what a recovery that runs into the winter will cost at the start of next season (shown when the injury happens and again at the finale)
  const rehabInfo = (G, weeks, second) => { const pen = clamp(0.5 + weeks * 0.3, 0.6, 3) * (second ? 1.6 : 1), rounds = 2 + Math.ceil(weeks / 4) + (second ? 2 : 0); return { pen, rounds }; };
  const rehabWarn = (G, weeks) => { const second = G.team === 'Red Bull Racing' && G.S && G.S.rbc && G.S.rbc.other === G.name, r = rehabInfo(G, weeks, second);
    return `You will be healed before next season, but the first weeks of winter go on rehab, so you will not be fully calibrated to the new car: expect a slow start next year (about −${r.pen.toFixed(1)} pace, fading over ${r.rounds} rounds)${second ? '. It hurts more at Red Bull: the second car is already further from what you drive best' : ''}.`; };
  const INJ = [['a heavy crash in practice: concussion protocol', 1, 1], ['a big shunt in qualifying left you with cracked ribs', 1, 2], ['appendicitis', 2, 2], ['a fractured wrist from a crash in the race', 3, 3], ['a cycling accident in training (broken wrist)', 3, 3], ['a back injury from a heavy landing over a kerb', 2, 2], ['a bad bout of flu', 1, 1], ['a neck strain from a high-g impact', 1, 1], ['a broken foot in a first-lap crash', 3, 3], ['a broken leg in a heavy crash', 3, 4]];
  const KART_INJ = [['a broken wrist in a kart flip', 1, 2], ['a rib injury from the seat in a heavy crash', 1, 1], ['a bad bout of flu', 1, 1], ['a sprained ankle in a pile-up', 1, 1]];
  const WINTER_INJ = [['a skiing accident over the winter break', 2, 4], ['a cycling crash in pre-season training', 1, 3], ['a fall at home that broke a bone in the hand', 2, 3], ['appendicitis in the off-season', 1, 2]];
  const END_INJ = ['a huge crash left you with a spinal injury', 'severe leg fractures from a crash that the doctors say will not fully heal', 'a serious head injury from flying debris', 'repeated concussions: the medical team will not clear you to race again', 'a crushed hand in a heavy impact with the wall'];
  function spinWheel(G) {
    const S = G.S, C = CATS[S.cat], st = G.stats, L = wheelList(G);
    let t = L.reduce((a, o) => a + o.w, 0) * rnd(), idx = 0;
    for (let i = 0; i < L.length; i++) { t -= L[i].w; if (t <= 0) { idx = i; break; } }
    const o = L[idx]; let desc = '', ended = false, extra = null;
    switch (o.id) {
      case 'crash': { const [why, lo, hi] = pick(C.tier === 0 ? KART_INJ : INJ), rounds = lo + Math.floor(rnd() * (hi - lo + 1)); st.FIT = Math.max(30, st.FIT - 1); S.injured = Math.max(S.injured, rounds); S.injWhy = why;
        const left = C.rounds - S.round, over = Math.max(0, rounds - left), weeks = rounds * 2, miss = rounds > 1 ? `the next ${rounds} rounds (about ${weeks} weeks)` : 'the next round (about 2 weeks)';
        (G.injuries = G.injuries || []).push({ year: G.year, age: G.age, cat: C.short, why, missed: rounds, kind: 'injury', carried: over });
        const warn = over ? rehabWarn(G, over * 2) : ''; note(G, `💥 Injury: ${why}. You miss ${miss}.${warn ? ' ' + warn : ''}`); desc = `${why[0].toUpperCase() + why.slice(1)}. You miss ${miss}.${warn ? ' ' + warn : ''}`; break; }
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
        G.rep = Math.min(100, G.rep + rp); st.MEN = Math.min(99, st.MEN + 1); G.buzz = Math.min(15, G.buzz + rp); if ((G.fp1Pts || 0) < 10) G.fp1Pts = (G.fp1Pts || 0) + 1;
        extra = { kind: 'fp1', gp, pos, rep: rp }; note(G, `🏎️ FP1 in an F1 car at ${gp}: P${pos} (+${rp} rep, +1 super licence point for 100 km of clean running; ${Math.min(10, G.fp1Pts || 0)}/10 banked).`);
        desc = `FP1 at the ${gp} GP: P${pos}, worth +${rp} rep and 1 super licence point (${Math.min(10, G.fp1Pts || 0)}/10 from FP1 so far).`; break; }
      case 'upgrade': S.carMod += 2.5; desc = 'The car is quicker for the rest of the year.'; break;
      case 'badup': S.carMod -= 2; desc = 'The car is slower for the rest of the year.'; break;
      case 'breakthrough': { const k = pick(STATS); st[k] = Math.min(99, st[k] + 3); G.train[k] = (G.train[k] || 0) + 3; desc = `+3 ${D.STAT_NAMES[k]}.`; break; }
      case 'engineer': S.boost += 2; desc = '+2 pace until the end of the season.'; break;
      case 'form': S.boost += 4; desc = '+4 pace until the end of the season.'; break;
      case 'slump': S.boost -= 2; st.MEN = Math.max(30, st.MEN - 1); G.train.MEN = (G.train.MEN || 0) - 1; desc = '−2 pace until the end of the season.'; break;
      case 'feud': G.rep = Math.min(100, G.rep + 2); G.buzz = Math.min(15, G.buzz + 3); S.boost += 1; desc = `Your fight with ${rivalOf(G)} is the story of the weekend: +2 rep, +1 pace.`; break;
      case 'feudBad': G.rep = Math.max(5, G.rep - 2); S.boost -= 1; desc = `A public row with ${rivalOf(G)}: the team boss is not happy. −2 rep, −1 pace.`; break;
      case 'illness': S.tmp = -3; S.tmpUntil = S.round + 2; desc = '−3 pace for the next two rounds.'; break;
      case 'sacked':
        G.rep = Math.max(5, G.rep - 3); G.contract = 0; G.sacked = true;
        if (C.tier === 4) {
          const rest = rnd() < 0.55; S.injured = rest ? 99 : 3 + Math.floor(rnd() * 4); G.demoted = true; vacateF1(G);
          note(G, `✂️ ${G.team} drop you and hand the seat to a reserve. You ${rest ? 'sit out the rest of the season' : 'sit out a few races'}.`);
          desc = rest ? 'You are out for the rest of the season. Offers will come in the summer.' : `You sit out ${S.injured} rounds. Offers will come in the summer.`;
        } else { S.carMod -= 3.5; desc = 'You see out the season in a lesser drive.'; }
        break;
      case 'careerEnd': { ended = true; G.endWhy = pick(END_INJ); (G.injuries = G.injuries || []).push({ year: G.year, age: G.age, cat: C.short, why: G.endWhy, kind: 'career' }); desc = `${G.endWhy[0].toUpperCase() + G.endWhy.slice(1)}. Your racing career ends here.`; break; }
      case 'fatal': ended = true; G.endWhy = pick(['a high-speed accident at ' + (C.names[Math.max(0, S.round - 1)] || 'a test'), 'a violent crash in a private test']); (G.injuries = G.injuries || []).push({ year: G.year, age: G.age, cat: C.short, why: G.endWhy, kind: 'fatal' }); desc = `A tragic end to a racing life: ${G.endWhy}.`; break;
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
  // season report card: every number is judged in the context of the car, the team-mate and the field, not just the result
  const gradeOf = x => x >= 90 ? 'A+' : x >= 80 ? 'A' : x >= 70 ? 'B+' : x >= 60 ? 'B' : x >= 50 ? 'C' : x >= 38 ? 'D' : 'E';
  function reportCard(G, C, P, mate, pos, N, expPos, tr, champ) {
    const S = G.S, cl = x => Math.max(3, Math.min(99, Math.round(x))), mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const ws = S.log.filter(l => !l.note && !l.out), gp = ws.flatMap(l => l.races.filter(r => !r.spr).map(r => Object.assign({ q: l.qpos }, r))), fin = gp.filter(r => !r.dnf);
    if (gp.length < 3) return null;
    // F1: expected finish from how close the other cars are (a car in a tight midfield pack can land anywhere in it), not just its rank
    const live = C.time && S.pExp && S.pExp.length >= 3, mn = a => a.reduce((x, y) => x + y, 0) / a.length;
    if (live) expPos = Math.round(mn(S.pExp) * 2) / 2;
    else if (C.time) { const cars = {}; S.drivers.forEach(d => { if (!d.isPlayer && d.car != null) cars[d.team] = d.car; }); const mine = cars[G.team];
      if (mine != null) expPos = Math.round((1 + Object.entries(cars).reduce((a, [t, c]) => a + (t === G.team ? 0.5 : 2 / (1 + Math.exp(-(c - mine) / 1.2))), 0)) * 2) / 2; }
    const diff = expPos - pos, card = [], add = (k, label, score, note) => card.push({ k, label, score: cl(score), grade: gradeOf(cl(score)), note });
    const h = S.h2h || { q: [0, 0], r: [0, 0] };
    const rookie = C.time ? G.f1Years <= 1 : C.tier >= 3 && C.id !== 'f2' && G.history.filter(x => x.cat === C.id).length <= 1;   // a first season is judged more kindly
    // a season that does what the car and team-mate say it should is a B; beating them is an A; only a clear failure gets a D or E
    const fs = 22 / N, egOf = g => { const x = g * fs; return x <= 3 ? -1 : x <= 9.5 ? -0.4 : (x - 9.5) * 0.55; };   // places a car normally gains from each grid slot (finishers, 2023-26)
    const dz = diff >= 0 ? diff : Math.min(0, diff + 1.5);   // a place or so behind the car is still par
    add('ctx', 'Season in context', 66 + 7.5 * dz * fs + (champ ? 16 : 0) + (pos <= 3 ? 4 : 0) + (rookie ? 6 : 0), `P${pos} against about P${expPos} expected for the ${ordStr(tr)}-ranked car${diff > 0 ? ': you beat the car' : diff < -1 ? ': the car was better than the result' : ''}.`);
    const carX = 66 + 7.5 * dz * fs + (pos === 1 ? 8 : 0);   // finishing where the car belongs (or above) is extracting it, whatever the team-mate did
    const penP = C.time ? ((S.drivers.find(d => d.isPlayer) || {}).carPen || 0) : 0, secs = C.time ? penP * C.time.beta / 100 * C.lap : 0;
    if (penP > 0) add('extract', 'Car extraction', carX, `Red Bull back ${S.rbc.lead} as their number 1: your car was about ${secs.toFixed(2)} s a lap slower than his, so you are judged against the car's pace, not against your team-mate.` + (mate ? ` (${P.pts} pts to ${mate.pts})` : ''));
    else if (mate && !C.crew) {
      const share = (P.pts + 3) / (P.pts + mate.pts + 6), qh = (h.q[0] + 1) / (h.q[1] + 2);
      // the share of the team's points is the core of it; against a much better team-mate (or as a rookie) trailing is expected, against a weaker one more is expected
      const gap = C.time ? (G.stats ? ovrOf(G.stats) - penOf(G.f1Years) - mate.skill : 0) : 0, exS = Math.max(0.2, Math.min(0.8, 0.5 + gap * 0.025)), exQ = Math.max(0.2, Math.min(0.8, 0.5 + gap * 0.02));
      add('extract', 'Car extraction', Math.max(66 + (share - exS) * 110 + (share - 0.5) * 25 + (qh - exQ) * 25 + (qh - 0.5) * 10, carX), `${P.pts} points to ${mate.name}'s ${mate.pts}` + (h.q[1] ? `; ahead in qualifying ${h.q[0]} of ${h.q[1]}` : '') + (h.r[1] ? `, in the race ${h.r[0]} of ${h.r[1]}.` : '.'));
    } else add('extract', 'Car extraction', carX, `No team-mate to measure against: judged on ${diff >= 0 ? 'beating' : 'missing'} the car's expected finish.`);
    // one-lap pace: against the car, but there is nothing above P1, so a front-row average is top marks whatever the car
    const aq = mean(gp.map(r => r.q)), qRel = 66 + (expPos - aq) * 6 * fs + (h.q[1] && !penP ? ((h.q[0] + 1) / (h.q[1] + 2) - 0.5) * 30 : 0), qAbs = 100 - (aq - 1) * 7.5 * fs;
    add('quali', 'One-lap pace', Math.max(qRel, qAbs), `Qualified P${aq.toFixed(1)} on average` + (h.q[1] ? ` and beat your team-mate on ${Math.round(100 * h.q[0] / h.q[1])}% of Saturdays.` : '.'));
    if (fin.length) {
      const gain = mean(fin.map(r => r.grid - r.pos)), xg = mean(fin.map(r => r.grid - r.pos - egOf(r.grid))), af = mean(fin.map(r => r.pos));
      add('race', 'Racecraft', Math.max(66 + xg * 9 * fs, 100 - (af - 1) * 7 * fs - 4), `${gain >= 0 ? '+' : ''}${gain.toFixed(1)} places a race from the grid to the flag` + (Math.abs(xg - gain) > 0.4 ? ` (${xg >= 0 ? '+' : ''}${xg.toFixed(1)} against what a car normally gains from those grid slots).` : '.'));
      // consistency: the spread of finishes against what is normal at that end of the field (front-runners swing ~1-2 places, the midfield ~3-4)
      const m = af, sd = Math.sqrt(mean(fin.map(r => (r.pos - m) ** 2))), mm = m * fs, xs = Math.max(0.8, Math.min(3.6, 0.3 + 0.62 * mm, 0.3 + 0.62 * (23 - mm))) / fs;
      add('cons', 'Consistency', 72 - (sd - xs) * 7 * fs + Math.max(0, 2.5 - sd * fs) * 6, `Finishes ranged around P${m.toFixed(1)} give or take ${sd.toFixed(1)} places` + (sd <= xs ? ', steadier than usual for that part of the grid.' : '.'));
      const half = Math.floor(fin.length / 2), a = mean(fin.slice(0, half || 1).map(r => r.pos)), b = mean(fin.slice(half).map(r => r.pos)), hx = live ? Math.floor(S.pExp.length / 2) : 0, eA = live ? mn(S.pExp.slice(0, hx)) : 0, eB = live ? mn(S.pExp.slice(hx)) : 0, kA = live ? mn(S.pCarK.slice(0, hx)) : 0, kB = live ? mn(S.pCarK.slice(hx)) : 0, dp = (a - b) - (eA - eB);   // a car that slipped down the order drags the second half: that is not on you
      add('prog', 'Progress through the year', Math.max(66 + (dp >= 0 ? dp : Math.min(0, dp + 1)) * 9 * fs, b * fs <= 2.5 ? 82 : 0), `Averaged P${a.toFixed(1)} in the first half and P${b.toFixed(1)} in the second.` + (live && Math.abs(kB - kA) >= 0.75 ? ` The car went from about ${ordStr(Math.round(kA))} to ${ordStr(Math.round(kB))} in the pecking order, and that is allowed for.` : ''));
    }
    const errs = P.dnfE || 0, rel = P.dnfR || 0; add('clean', 'Clean driving', 100 - (errs / Math.max(1, P.races)) * 420, errs ? `${errs} DNF${errs > 1 ? 's' : ''} down to your own mistakes` + (rel ? `, plus ${rel} reliability failure${rel > 1 ? 's' : ''} that were not your fault.` : '.') : `No DNFs from driver error` + (rel ? `; ${rel} reliability failure${rel > 1 ? 's' : ''} were not your fault.` : '.'));
    const wts = { ctx: 30, extract: 20, quali: 15, race: 10, cons: 10, clean: 10, prog: 5 }, tw = card.reduce((a, c) => a + wts[c.k], 0), ov = card.reduce((a, c) => a + c.score * wts[c.k], 0) / tw;
    return { overall: cl(ov), grade: gradeOf(cl(ov)), rows: card };
  }
  // controversies: a championship that ends close can come with a decision the fans never forgive (Abu Dhabi 2021, a car under the weight limit and not excluded, a team let off for cheating).
  // The result on the table never changes: it is what the fans, the press and the career file say about it.
  const CONTR_TYPES = [['rd', 3], ['tl', 2], ['cheat', 2], ['weight', 2], ['pen', 1.5]];
  function genContr(G, C, S, tbl, P, pos) {
    if (!['f1', 'f2', 'f3'].includes(C.id) || tbl.length < 3) return null;
    const lead = tbl[0], sec = tbl[1], gps = S.log.filter(l => !l.note && !l.out), lastGp = C.names[C.rounds - 1], rival = lead.isPlayer ? sec : lead;
    const relLoss = pos > 1 && lead.pts > 0 ? (lead.pts - P.pts) / lead.pts : 1, relWin = pos === 1 && P.pts > 0 ? (P.pts - sec.pts) / P.pts : 1, tied = pos > 1 && lead.pts === P.pts;
    let kind = null, p = 0;
    if (pos > 1 && pos <= 3) { p = tied ? 0.9 : relLoss <= 0.03 ? 0.75 : relLoss <= 0.06 ? 0.5 : relLoss <= 0.1 ? 0.22 : 0; kind = 'robbed'; }
    else if (pos === 1) { p = relWin <= 0.03 ? 0.4 : relWin <= 0.06 ? 0.2 : 0; kind = 'tainted'; }
    else { kind = 'news'; }
    const isNews = kind === 'news' || (!(rnd() < p)); if (isNews) { const rl = lead.isPlayer ? 0 : (lead.pts - sec.pts) / Math.max(1, lead.pts); const pn = rl <= 0.03 ? 0.4 : rl <= 0.06 ? 0.2 : 0.04; if (lead.isPlayer || rnd() >= pn) return null; kind = 'news'; }
    let r = rnd() * CONTR_TYPES.reduce((a, x) => a + x[1], 0), type = 'rd'; for (const [k, w] of CONTR_TYPES) { r -= w; if (r <= 0) { type = k; break; } }
    const finale = (kind === 'robbed' ? relLoss : kind === 'tainted' ? relWin : 0.02) <= 0.04 && rnd() < 0.5, pool = gps.filter(l => l.races && l.races.some(x => !x.spr && (kind === 'robbed' ? (x.dnf || x.pos > 2) : true))), l0 = pool.length ? pick(pool) : null;
    const gp = finale ? lastGp : (l0 ? l0.name : lastGp), rv = rival.isPlayer ? 'you' : rival.name, rt = rival.team, who = kind === 'tainted' ? sec.name : rv;
    const body = {
      rd: pick([`the race director misapplied the safety car rules at ${gp}, letting only some of the lapped cars through and restarting the race on a single lap`, `the race director changed the safety car procedure at the last moment at ${gp}, in a way that decided the race`]),
      tl: `the stewards never penalised ${who} at ${gp} for repeatedly going off the track and keeping the places`,
      cheat: `the FIA found that ${kind === 'tainted' ? 'your team' : rt} had broken the technical rules and let them off with a token fine, with no loss of points`,
      weight: `${kind === 'tainted' ? 'your' : who + "'s"} car was found under the minimum weight at ${gp}, and the FIA ruled it a measuring tolerance instead of disqualifying it`,
      pen: `a late time penalty at ${gp} split the paddock: the stewards' explanation convinced almost nobody`,
    }[type];
    let text;
    if (kind === 'robbed') text = `Controversy: ${body}. No title this season, but fans call that championship yours after what happened at ${gp}.`;
    else if (kind === 'tainted') text = `Controversy: ${body}. You are champion on paper, but plenty of fans refuse to count it as a clean title after ${gp}.`;
    else text = `Controversy: ${body}. ${lead.name} still took the ${C.short} title, but the argument about ${gp} is not going away.`;
    return { kind, type, gp, text, year: G.year, cat: C.short };
  }
  function makeSummary(G, h, C, P, tbl, pos, N, tr, dRep, debut) {
    const rk = debut && C.tier >= 3 && C.id !== 'f2';   // "rookie" wording only where a first year is a real thing (F1 and the senior series): not in karting, where nobody is experienced, nor in F4/F3/F2, where most drivers have one year anyway
    const T = C.teams.length;
    const mate = tbl.find(d => d.team === G.team && !d.isPlayer);
    const comp = h.events || [], main = comp.find(c => c.main) || comp[0] || { n: C.short + ' championship', pos, N, pts: P.pts, lead: pos === 1, gap: 0 };
    const champ = !!h.champ, wr = P.races ? P.w / P.races : 0; let topKit = tr <= Math.max(2, Math.ceil(T / 4)), poorKit = tr > Math.ceil(T * 0.6);
    const sameCat = G.history.slice(0, -1).filter(x => x.cat === h.cat), lastSame = sameCat[sameCat.length - 1];
    const titlesHere = sameCat.filter(x => x.champ).length + (champ ? 1 : 0);
    const pk = a => a[Math.floor(rnd() * a.length)];
    // expected finish: the fastest car is P1/P2 (P2 fine if the teammate is P1), the second fastest P3/P4, and so on
    const mi = C.events ? C.events.findIndex(x => x.main) : -1, rows = E_standings(G, mi), mem = rows.filter(r => r.d.team === G.team), jj = Math.max(1, mem.findIndex(r => r.d.isPlayer) + 1), sz = Math.max(1, mem.length);
    const mn = a => a.reduce((x, y) => x + y, 0) / a.length, S = G.S, live = C.time && S.pExp && S.pExp.length >= 3;
    if (live) { tr = Math.max(1, Math.round(mn(S.pCarK))); topKit = tr <= Math.max(2, Math.ceil(T / 4)); poorKit = tr > Math.ceil(T * 0.6); }   // the car's average place in the order over the season, upgrades included
    const expPos = live ? Math.round(mn(S.pExp)) : C.crew ? tr : sz * (tr - 1) + jj, diff = expPos - pos, good = h.ovr >= C.lvl + 5;
    const lo = good ? -2 : -3, hi = good ? 2 : 1;   // a place or two behind the car is par (a third-fastest car finishing sixth is fine)   // very good drivers: 2 ahead to 1 behind is "met"; average drivers: 1 ahead to 2 behind
    let expect = diff > hi ? 'exceeded' : diff < lo ? 'below' : 'met';
    if (champ) expect = topKit ? 'met' : 'exceeded';
    let extract = 'even';
    if (mate && !C.crew) extract = P.pts > mate.pts * 1.15 + 2 ? 'more' : P.pts < mate.pts * 0.85 - 2 ? 'less' : 'even';
    const frg = C.time && G.dyn.f1 && G.dyn.f1.fragile && G.dyn.f1.fragile.year === G.year && G.dyn.f1.fragile.team === G.team;
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
    if (h.contr && h.contr.kind !== 'news') para.splice(Math.min(para.length, 1), 0, h.contr.text);
    // level on points: say so, and say how the FIA countback settled it
    { const tie = [];
      for (let i = 0; i < Math.min(tbl.length - 1, 10); i++) { const a = tbl[i], b = tbl[i + 1]; if (a.pts === b.pts && a.pts > 0 && (i === 0 || ((a === P || b === P) && i < 5))) {
          const fa = a.fc || [], fb = b.fc || []; let k = 0; while (k < 24 && (fa[k] || 0) === (fb[k] || 0)) k++;
          const nm = d => d.isPlayer ? 'you' : d.name, cnt = (n, kk) => kk === 0 ? `${n} win${n === 1 ? '' : 's'}` : `${n} ${ordStr(kk + 1)}-place finish${n === 1 ? '' : 'es'}`, how = k < 24 ? `${nm(a)} had ${cnt(fa[k] || 0, k)} to ${fb[k] || 0}` : 'everything was level, so the tie went to the FIA\'s last resort';
          tie.push(`${i === 0 ? 'The title was level: ' : `${ordStr(i + 1)} place was level: `}${nm(a)} and ${nm(b)} both finished on ${a.pts} points. The FIA countback (most wins, then most second places, then thirds, and so on) settled it: ${how}.`); } }
      if (tie.length) { h.tie = tie[0]; para.splice(Math.min(para.length, 1), 0, tie[0]); } }
    // 3. the equipment you had
    if (champ && poorKit) para.push(`And you did it in the ${ordStr(tr)}-best equipment of ${T}. That is all driver.`);
    else if (champ && topKit) para.push(`You had ${tr <= 2 ? 'top-two' : 'front-running'} equipment, so now the pressure is to prove it when the kit is level.`);
    else if (!champ && topKit && expect === 'below') para.push(`${G.team} ranked ${ordStr(tr)} on pace and you still finished ${ordStr(pos)}. That one is on you.`);
    else if (!champ) para.push((rk ? {
      exceeded: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${diff} place${diff > 1 ? 's' : ''} better: a standout rookie year.`,
      met: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is right where it should be for a rookie.`,
      below: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${-diff} place${-diff > 1 ? 's' : ''} short, but first seasons are about learning.`,
    } : {
      exceeded: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${diff} place${diff > 1 ? 's' : ''} better: you exceeded expectations.`,
      met: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} meets expectations.`,
      below: `${G.team} ranked ${ordStr(tr)} on pace, so P${expPos} was the target. P${pos} is ${-diff} place${-diff > 1 ? 's' : ''} short: you underperformed.`,
    })[expect]);
    // 4. teammate and reliability
    if (mate && !C.crew) para.push(rk ? ({ more: `You out-scored ${mate.name} (${P.pts} to ${mate.pts}) in your rookie year, which says a lot.`, less: `${mate.name} knows the place better, so trailing them (${mate.pts} to ${P.pts}) is normal for a rookie.`, even: `You matched ${mate.name} (${P.pts} to ${mate.pts}) as a rookie. Strong start.` })[extract] : ({ more: `You beat ${mate.name} (${P.pts} to ${mate.pts}), so you clearly extracted more from the car.`, less: `${mate.name} out-scored you (${mate.pts} to ${P.pts}), so you left something in the car.`, even: `You and ${mate.name} were evenly matched (${P.pts} to ${mate.pts}).` })[extract]);
    const dE = P.dnfE || 0, dR = P.dnfR || 0;
    if (P.races >= 10 && P.dnf >= 3) para.push(dE >= dR * 2 ? `${P.dnf} DNFs, ${dE} of them your own errors. That is where the points went.` : dR >= dE * 2 ? `${P.dnf} DNFs, but ${dR} were reliability, not driver error. Bad luck, not bad driving.` : `${P.dnf} DNFs: ${dR} reliability and ${dE} driver error. Half of that is on the team, half on you.`);
    else if (P.races >= 10 && P.dnf > 0 && dE === 0) para.push(`${P.dnf} DNF${P.dnf > 1 ? 's' : ''}, all mechanical. No driver errors all year.`);
    else if (P.races >= 10 && P.dnf === 0) para.push('Not a single DNF all year. Bulletproof.');
    // 5. stock and contract
    para.push(({ soaring: 'Your stock is soaring and people are circling.', rising: 'Your stock is rising. People are noticing.', steady: 'Your stock is steady.', falling: 'Your stock is falling. People are starting to doubt you.' })[stock] + (G.contract > 0 ? ` You have ${G.contract} year${G.contract > 1 ? 's' : ''} left at ${G.team}. Let's plan the summer.` : " Your deal is up, so let's plan the summer."));
    if (C.time && S.rbc && G.team === 'Red Bull Racing' && S.rbc.pen > 0) { const sc = S.rbc.pen * C.time.beta / 100 * C.lap;
      if (S.rbc.other === G.name) para.push(`Red Bull built the team around ${S.rbc.lead}, so your car was about ${sc.toFixed(2)} s a lap slower than his (the number 2 seat at Red Bull is a hard one). That is why you were judged against the car, not your team-mate.` + (S.rbSackInfo ? '' : ' The pressure from the top is constant: a second driver who falls too far behind is replaced mid-season.'));
      else if (S.rbc.lead === G.name) para.push(S.rbc.clause ? `Your contract guaranteed you number 1 status at Red Bull, so the team prioritised your car over ${S.rbc.other}'s.` : `You were Red Bull's number 1 this year: the team prioritised your car over ${S.rbc.other}'s.`); }
    if (S.rbSackInfo && G.team !== 'Red Bull Racing' && S.rbSackInfo.out === G.name) para.push(`Red Bull dropped you to Racing Bulls after 11 rounds: the second seat at Red Bull does not give you time.`);
    { const se = Object.entries(S.rivS || {}).map(([n, v]) => [n, v.a * 2 + v.n]).sort((a, b) => b[1] - a[1])[0]; if (se && se[1] >= 12 && !C.crew) { const v = S.rivS[se[0]], rv = rivalOf(G) === se[0]; para.push(`${rv ? 'Your rival' : 'Your season rival'}: ${se[0]}. You finished next to each other ${v.a} time${v.a === 1 ? '' : 's'} and beat them in ${v.w} of ${v.w + v.l} races where you both saw the flag.`); } }
    if (frg) para.push(`This was the fastest car of the year and the most fragile: ${(P.dnfR || 0)} mechanical failure${(P.dnfR || 0) === 1 ? '' : 's'} for you alone. Like McLaren in 2012, the pace was there and the points were not.`);
    if (live) { const hx = Math.floor(S.pCarK.length / 2), kA = mn(S.pCarK.slice(0, hx)), kB = mn(S.pCarK.slice(hx));
      if (kB - kA >= 0.75) para.push(`The car slid from about ${ordStr(Math.round(kA))} to ${ordStr(Math.round(kB))} in the pecking order as the others developed, so the second half was always going to be harder.`);
      else if (kA - kB >= 0.75) para.push(`Upgrades lifted the car from about ${ordStr(Math.round(kA))} to ${ordStr(Math.round(kB))} in the pecking order through the year.`); }
    const card = reportCard(G, C, P, mate, pos, N, expPos, tr, champ);
    return { agent: G.agent, card, para, expect, extract, stock, dRep: Math.round(dRep * 10) / 10 };
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
    if (!C.pay) { const base = G.deal && G.deal.sal ? G.deal.sal : salOf(G, S.cat, G.team); earn = Math.round(base * (0.9 + q * 0.25) + P.w * base * 0.02); if (G.bonusClause && G.year <= G.bonusClause.until) earn += Math.round(base * (P.w * 0.1 + P.p * 0.03)); }
    const carRank = C.teams.map(t => t[0]).sort((a, b) => G.tr[S.cat][b] - G.tr[S.cat][a]).indexOf(S.teams[0]) + 1;
    const repBefore = G.rep;
    if (!partial) { const dRep = (C.tier === 0 ? kartRepW(G.age) : REP_W[C.tier]) * (q * 10 - 3.5) + (anyTitle ? 6 : 0) + Math.min(P.w, 10) * 0.15 + (C.tier === 0 ? FLAIR[G.tier] * (0.6 + 0.4 * q) : 0); G.rep = clamp(G.rep + dRep, 5, 100); }
    const h = { season: G.season, year: G.year, age: G.age, cat: S.cat, catName: C.name, short: C.short, team: S.teams.join(' → '), races: P.races, wins: P.w, podiums: P.p, poles: P.pole, pts: P.pts, pos, N, ovr, trophies: tro, earn, champ: anyTitle, cost: G.deal.cost, partial: !!partial, events: comp, dnfE: P.dnfE || 0, dnfR: P.dnfR || 0, spr: P.sr ? { races: P.sr, wins: P.sw || 0, podiums: P.sp || 0, pts: P.spts || 0, dnf: P.sdnf || 0 } : null };
    // winter series (FRME / Toyota Racing Series) before the main campaign add licence points; Red Bull always sends its juniors, other academies sometimes
    if (G.academy && (S.cat === 'frec' || S.cat === 'f3') && rnd() < perkOf(G).winterP) h.winter = Math.round(perkOf(G).winter * (0.35 + 0.9 * q) * (G.tier >= 3 ? 1.15 : 1));
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
    if (C.time) {   // F1: teams judge you against the only fair yardstick, your team-mate in the same car
      const mate = S.drivers.filter(d => !d.isPlayer && d.team === G.team && !d.gone).sort((a, b) => b.races - a.races)[0];
      const h = S.h2h || { q: [0, 0], r: [0, 0] };
      // points share pulled towards 50/50 by ~20 points, so one P10 in a backmarker does not swing it
      if (mate) { G.last.mateEff = mate.skill; G.last.tmShare = (P.pts + 10) / (P.pts + mate.pts + 20); G.last.qH2H = (h.q[0] + 1) / (h.q[1] + 2); G.last.rH2H = (h.r[0] + 1) / (h.r[1] + 2); }
    }
    h.contr = genContr(G, C, S, tbl, P, pos);
    if (h.contr && h.contr.kind === 'robbed') { (G.fanTitles = G.fanTitles || []).push({ year: G.year, cat: C.short, id: C.id, gp: h.contr.gp, type: h.contr.type }); G.rep = Math.min(100, G.rep + 3); G.buzz = Math.min(15, (G.buzz || 0) + 3); }
    else if (h.contr && h.contr.kind === 'tainted') { (G.taintedTitles = G.taintedTitles || []).push({ year: G.year, cat: C.short, id: C.id, gp: h.contr.gp, type: h.contr.type }); G.rep = Math.max(5, G.rep - 1); }
    const summary = makeSummary(G, h, C, P, tbl, pos, N, carRank, G.rep - repBefore, G.history.filter(x => x.cat === S.cat).length === 1);
    if (summary && summary.card) { h.rating = summary.card.overall; h.grade = summary.card.grade; }
    if (!C.crew) { const cw = constructors(G), mt = S.teams[S.teams.length - 1], mi = cw.findIndex(r => r.team === mt); if (mi >= 0) h.wcc = { pos: mi + 1, N: cw.length, pts: Math.round(cw[mi].pts), champ: mi === 0, top: cw.slice(0, 3).map(r => ({ team: r.team, pts: Math.round(r.pts) })) }; }
    if (S.rbc && S.rbc.pen > 0) h.rbPen = { lead: S.rbc.lead, other: S.rbc.other, pen: S.rbc.pen };
    // the car's average place in the pecking order: its rank after every round added up and divided by the rounds (F1); other series use the season's car rank
    h.carAvg = S.pCarK && S.pCarK.length ? Math.round(S.pCarK.reduce((a, b) => a + b, 0) / S.pCarK.length * 10) / 10 : carRank; h.carOf = C.teams.length;
    if (S.pCarK && S.pCarK.length) { h.carBest = Math.min(...S.pCarK); h.carWorst = Math.max(...S.pCarK); }

    const msgs = [];
    // the winter break is 3-4 months: a late-season injury heals before the lights go out, but weeks of rehab at the start of the winter leave you short of calibration with the new car
    if (!G.demoted && S.injured > 0 && S.injured < 20) { const wk = S.injured * 2; G.injCarry = { n: 0, weeks: wk, why: S.injWhy || 'an injury' }; msgs.push(`🩹 ${S.injWhy ? S.injWhy[0].toUpperCase() + S.injWhy.slice(1) : 'Your injury'} is still healing at the finale. ` + rehabWarn(G, wk)); }
    else if (!G.demoted && C.tier >= 1 && rnd() < 0.012) { const [why, lo, hi] = pick(WINTER_INJ), n = lo + Math.floor(rnd() * (hi - lo + 1)), wk = n * 2, t0 = rnd() * 14, endsAt = t0 + wk, missed = Math.max(0, Math.ceil((endsAt - 14) / 2)), rehabWk = Math.max(0, Math.min(wk, 4 - Math.max(0, 14 - endsAt)));
      G.injCarry = { n: missed, weeks: rehabWk, why, winter: true }; (G.injuries = G.injuries || []).push({ year: G.year, age: G.age, cat: C.short, why, missed, kind: 'injury', carried: 0 }); msgs.push(`🩹 Injury over the winter: ${why}. ${missed ? `You miss the first ${missed} round${missed > 1 ? 's' : ''} of next season.` : rehabWk ? 'You will be back for the season, but short on preparation.' : 'It will be healed well before testing.'}`); }
    if (h.winter) msgs.push(`🧊 Winter series (${isRB(G) ? 'Formula Regional Middle East, Red Bull stacks these' : 'Toyota Racing Series'}): +${h.winter} super licence points on top of the ${C.short} result.`);
    const fr = C.time && G.dyn.f1 && G.dyn.f1.fragile;
    if (fr && fr.year === G.year) { const ds = S.drivers.filter(d => d.team === fr.team), out = ds.reduce((a, d) => a + (d.dnfR || 0), 0); h.fragile = fr.team;
      if (G.team !== fr.team) msgs.push(`${fr.team} had the fastest car of the year and the worst reliability: ${out} mechanical failures across their two cars cost them the title fight.`); }
    if (G.academy && C.tier >= 1 && C.tier <= 3) {
      const rb = G.academy.n.startsWith('Red Bull');
      const p = (rb ? (q < 0.35 ? 0.7 : q < 0.55 ? 0.35 : q < 0.7 ? 0.1 : 0) : (q < 0.3 ? 0.45 : q < 0.45 ? 0.12 : 0)) * (G.tier >= 3 ? 0.4 : 1);
      if (rnd() < p) { msgs.push(`${G.academy.n} drop you after a poor year.`); G.academy = null; G.reserve = null; }
    }
    const relLevel = C.time && !champ && G.last.mateEff !== undefined && G.last.tmShare <= 0.5 && !(G.last.qH2H > 0.5 || G.last.rH2H > 0.5) && f1Value(G) < G.last.mateEff - 3.5 && rnd() < 0.55;
    const relAge = C.time && !champ && pos > 3 && G.age >= 36 && f1Value(G) < 84 && rnd() < 0.5;
    // Racing Bulls is a feeder: whoever is not good enough for the Red Bull seat is replaced by the next academy rookie after two or three years
    const rbBar = C.time && S.teams[S.teams.length - 1] === 'Racing Bulls' ? Math.min(...(G.f1.teams['Red Bull Racing'] || []).filter(d => d && !d.player).map(effOf), 99) : 0;
    const ten = C.time ? tenure(G, 'Racing Bulls') : 0, relFeeder = C.time && ten >= 3 && !champ && pos > 3 && f1Value(G) < rbBar - 1 && rnd() < (ten === 3 ? 0.4 : ten === 4 ? 0.65 : 0.85);
    if (relFeeder && C.tier === 4 && !G.demoted && G.contract === 0) { G.demoted = true; G.demotedWhy = 'academy'; msgs.push(`Racing Bulls won't renew your contract: after ${ten} years they have the next academy rookie ready, and you did not earn the Red Bull seat.`); }
    else if (C.tier === 4 && !G.demoted && G.contract === 0 && (C.time ? relLevel || relAge : q < 0.15 && rnd() < 0.5)) { G.demoted = true; G.demotedWhy = relAge && !relLevel ? 'age' : 'level'; msgs.push(relAge && !relLevel ? `${S.teams[S.teams.length - 1]} won't renew your contract: they want a younger driver.` : C.time ? `${S.teams[S.teams.length - 1]} won't renew your contract after your team-mate had the upper hand.` : `${S.teams[S.teams.length - 1]} part ways with you after a rough season.`); }

    // world: team strength cycles + F1 driver pool
    G.trPrev = {}; Object.keys(G.tr).forEach(c => { G.trPrev[c] = Object.assign({}, G.tr[c]); });
    const teamPts = {}; tbl.forEach(d => teamPts[d.team] = (teamPts[d.team] || 0) + d.pts);
    const champs = [], retirees = [];
    Object.keys(G.dyn).forEach(c => {
      const CC = CATS[c]; let ct;
      if (c !== 'f1' && CC.dyn) { driverMarket(G, c); G.churn[c] = G.year + 1; }
      if (c === S.cat) ct = Object.keys(teamPts).sort((a, b) => teamPts[b] - teamPts[a])[0];
      else {
        const D = G.dyn[c]; D.forceWho = null;
        // a defending champion often repeats whichever team he is with now (series' real repeat rate); otherwise the title goes by car strength
        const held = D.lastChampD && rnd() < (CC.champDrvRep || 0) ? CC.teams.map(t => t[0]).find(t => roster(G, c, t).includes(D.lastChampD)) : null;
        const back = !held && CC.champComeback && rnd() < CC.champComeback ? (D.champHist || []).filter(n => n !== D.lastChampD).map(n => [n, CC.teams.map(t => t[0]).find(t => roster(G, c, t).includes(n))]).filter(x => x[1]) : [];
        if (held) { ct = held; D.forceWho = D.lastChampD; }
        else if (back.length) { const [n, t] = back[Math.floor(rnd() * back.length)]; ct = t; D.forceWho = n; }
        else { let tot = 0; const w = CC.teams.map(t => { const x = Math.exp(D.str[t[0]] / (CC.champT || 1.6)) * (D.lastChampT === t[0] ? (CC.champRep === undefined ? 1 : CC.champRep) : 1); tot += x; return x; }); let r = rnd() * tot, i = 0; for (; i < w.length; i++) { r -= w[i]; if (r <= 0) break; } ct = CC.teams[Math.min(i, CC.teams.length - 1)][0]; }
        D.lastChampT = ct;
      }
      G.dyn[c]._champ = ct; evolveCat(G, c, ct);
    });
    // nobody knows next year's car order in the summer: offers and the pecking order show a forecast (very hazy before new rules)
    G.fc = {}; Object.keys(G.dyn).forEach(c => { const reg = CATS[c].regYears.includes(G.year + 1); G.fc[c] = {}; Object.keys(G.tr[c]).forEach(t => { const a = G.trPrev[c][t], b = G.tr[c][t]; G.fc[c][t] = a === undefined ? b : R1(a + (reg ? 0.25 : 0.5) * (b - a) + gauss() * (reg ? 2.5 : 1.2)); }); });
    const show = ['f1', 'f2', 'f3', 'f4', 'wec', 'imsa', 'gt3w', 'gt3', 'indy', 'nascar', 'fe', 'dtm', 'supercars', 'sf'];
    if (!show.includes(S.cat)) champs.push({ cat: C.short, who: lead0.name, team: lead0.team });
    show.forEach(c => {
      const CC = CATS[c];
      if (c === S.cat) { champs.push({ cat: CC.short, who: lead0.name, team: lead0.team }); return; }
      if (CC.dyn) {
        const ct = G.dyn[c]._champ; let who;
        if (c === 'f1') { const ds = G.f1.teams[ct].filter(d => !d.player); who = ds.sort((a, b) => effOf(b) - effOf(a))[0].name; }
        else {   // either of a team's drivers can take the title, the lead seat more often; last year's champion usually repeats if his team does
          const ros = roster(G, c, ct), D = G.dyn[c];
          who = D.forceWho && ros.includes(D.forceWho) ? D.forceWho : ros[rnd() < 0.62 ? 0 : Math.min(ros.length - 1, 1 + Math.floor(rnd() * (ros.length - 1)))];
          D.lastChampD = who; (D.champHist = D.champHist || []).includes(who) || D.champHist.push(who);
        }
        champs.push({ cat: CC.short, who, team: ct });
      } else {
        let tot = 0; const w = CC.teams.map(t => { const x = Math.exp(t[1] / 3); tot += x; return x; }); let r = rnd() * tot, i = 0; for (; i < w.length; i++) { r -= w[i]; if (r <= 0) break; }
        const t = CC.teams[Math.min(i, CC.teams.length - 1)]; champs.push({ cat: CC.short, who: roster(G, c, t[0])[0], team: t[0] });
      }
    });
    if (G.demoted && S.cat === 'f1' && !G.f1.teams[S.teams[S.teams.length - 1]].some(d => d.player)) { /* seat already vacated */ }
    if (S.cat === 'f1' && S.rbc) { const pr = S.drivers.filter(d => d.team === 'Red Bull Racing' && !d.gone), lead = pr.find(d => d.name === G.f1.rbLead), oth = pr.find(d => d !== lead);
      if (lead && oth && oth.pts > lead.pts) { const oi = rbInfo(G, oth), p = oi.gen ? 0.9 : (oi.wonder && oi.lvl >= 88) ? 0.5 : 0.2; if (rnd() < p) { G.f1.rbLead = oth.name; msgs.push(`${oth.isPlayer ? 'You' : oth.name} beat ${lead.isPlayer ? 'you' : lead.name} in the standings: Red Bull now treat ${oth.isPlayer ? 'you' : oth.name} as the number 1.`); } } }
    const f1pos = {}; if (S.cat === 'f1') mainRows.forEach((r, k) => { f1pos[r.d.name] = k + 1; }); else { const fc = champs.find(c => c.cat === CATS.f1.short); if (fc) f1pos[fc.who] = 1; }
    const outList = tickF1(G, f1pos); outList.forEach(r => retirees.push(r));
    if (G.demoted) G.f1.vac.push(S.teams[S.teams.length - 1]);
    const fcS = trS(G, S.cat), rank = Object.keys(G.tr[S.cat]).map(n => ({ n, r: Math.round(G.trPrev[S.cat][n]), d: Math.round(fcS[n]) - Math.round(G.trPrev[S.cat][n]), you: n === S.teams[S.teams.length - 1] })).sort((a, b) => b.r - a.r);
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
  const perkOf = G => G.academy ? (G.academy.perk || (ACADEMIES.find(a => a.n === G.academy.n) || {}).perk || { winter: 5, winterP: 0.5, fp1: 8, skip: 1.05, pet17: 0.25, petFM: 0.25, blurb: '' }) : null;   // saved games may hold an academy without its perks
  /* ---------- Red Bull: number 1 priority ("Verstappen curse") ---------- */
  // when Red Bull's lead driver is generational (or a wonderkid who has won a title and been there two years or more), the team builds around him and the other car is slower.
  // The second driver can take over as lead by beating him in the championship: a generational talent almost always does, a lesser one rarely.
  const rbInfo = (G, d) => {
    if (d.isPlayer) return { gen: G.tier === 4, wonder: G.tier >= 3, won: ((G.tot.titles || {}).f1 || 0) > 0, tn: tenure(G, 'Red Bull Racing'), lvl: ovrOf(G.stats) - penOf(G.f1Years + 1) };
    const a = (G.f1.teams['Red Bull Racing'] || []).find(x => x && x.name === d.name) || {}, pk = Math.max(a.pk || 0, a.ski || 0);
    return { gen: pk >= 91, wonder: pk >= 88.5, won: (a.titles || 0) > 0, tn: a.tn || 1, lvl: d.skill };
  };
  function rbCurse(G, drivers) {
    const TMt = CATS.f1.time, pair = drivers.filter(d => d.team === 'Red Bull Racing'); drivers.forEach(d => { d.carPen = 0; });
    if (pair.length < 2 || G.year <= 2026) return null;   // 2026 itself is fitted to the real season
    const lc = G.leadClause && G.leadClause.team === 'Red Bull Racing' && G.year <= G.leadClause.until, pl = pair.find(d => d.isPlayer);
    if (lc && pl) G.f1.rbLead = pl.name;   // a number 1 clause makes you the lead whatever the rating
    let lead = pair.find(d => d.name === G.f1.rbLead) || (pair.slice().sort((a, b) => rbInfo(G, b).lvl - rbInfo(G, a).lvl)[0]); G.f1.rbLead = lead.name;
    const li = rbInfo(G, lead), prio = (lc && lead.isPlayer) ? 'wonder' : li.gen ? 'gen' : (li.wonder && li.won && li.tn >= 2) ? 'wonder' : null; if (!prio) return { lead: lead.name, pen: 0, prio: null };
    const other = pair.find(d => d !== lead), oi = rbInfo(G, other), pen = TMt.rbCurse[prio === 'gen' ? 0 : 1] * (oi.gen ? 0.5 : 1);
    other.carPen = pen; return { lead: lead.name, other: other.name, pen, prio, clause: !!(lc && lead.isPlayer) };
  }
  const tenure = (G, team) => { let n = 0; for (let i = G.history.length - 1; i >= 0; i--) { const h = G.history[i]; if (h.cat !== 'f1' || h.team.split(' → ').pop() !== team) break; n++; } return n; };   // consecutive F1 seasons at one team, up to and including the last
  /* ---------- FIA Super Licence ---------- */
  // 40 points over the three seasons before the F1 season, age 18, FP1 licence from 25 points. Teams can petition: 30-39 points on force majeure (Herta was refused at 32),
  // or a 17-year-old with 40 points by age dispensation (2024 rule). Red Bull stacks winter series, TPC mileage and FP1 slots to get there first.
  function slView(G, y) {
    y = y || G.year + 1; const by = {};
    G.history.forEach(h => { if (h.year < y - 3 || h.year >= y || (h.partial && !h.races)) return; const t = SLP[h.cat], p = (t && t[h.pos - 1]) || 0, w = h.winter || 0; if (!p && !w) return;
      const e = by[h.year] = by[h.year] || { year: h.year, pts: 0, win: 0, src: '' }; if (p > e.pts) { e.pts = p; e.src = `${CATS[h.cat].short} P${h.pos}`; } e.win += w; });
    const rows = Object.values(by).sort((a, b) => a.year - b.year), bonus = Math.min(10, G.fp1Pts || 0);
    return { pts: rows.reduce((a, r) => a + r.pts + r.win, 0) + bonus, rows, bonus };
  }
  // FP1-only licence: 25 points OR a full F2 season, age 18 (17 by dispensation, Red Bull in practice). Friday slots go to rookies (at most 2 F1 starts), so anyone who has raced in F1 is out;
  // an F1 team's reserve driver is a different thing (stand-ins). Each FP1 weekend with 100 km of clean running is worth 1 super licence point, up to 10 in total.
  const fullF2 = G => G.history.some(h => h.cat === 'f2' && (h.races || 0) >= 18);
  const fp1Elig = G => { const v = slView(G, G.year), rb = isRB(G); return !!G.academy && !G.history.some(h => h.cat === 'f1') && (v.pts >= 25 || fullF2(G)) && (G.age >= 18 || (G.age === 17 && rb)); };
  function licDecision(G) {
    const key = G.year + ':' + G.age; if (G.licRoll && G.licRoll.key === key) return G.licRoll;
    const age = G.age + 1, pts = slView(G).pts, rb = isRB(G), pk = perkOf(G), acad = !!G.academy, last = G.history[G.history.length - 1], champ = !!(last && last.champ);
    const inj = (G.injuries || []).some(x => x.year >= G.year - 1 && x.kind === 'injury'), who = acad ? G.academy.feeder : 'an F1 team';
    let ok = false, via = null, why = '', p = 0, pet = null;
    if (age >= 18 && pts >= 40) { ok = true; via = 'points'; }
    else if (age >= 18 && pts >= 30) { p = clamp((pk ? pk.petFM : 0.1) * (inj ? 1.6 : 1) * (champ ? 1.2 : 1), 0, 0.8); ok = rnd() < p; via = ok ? 'force majeure' : null;
      why = ok ? '' : `you have ${pts} of the 40 super licence points and ${who}'s petition to the FIA was refused (no valid force majeure: the same fate as Colton Herta's 32 points in 2022).`; pet = { team: who, kind: 'force majeure', ok, p }; }
    else if (age === 17 && pts >= 40) { p = clamp((pk ? pk.pet17 : 0.12) + (G.tier === 4 ? 0.15 : G.tier === 3 ? 0.08 : 0) + (champ ? 0.1 : 0), 0, 0.92); ok = rnd() < p; via = ok ? 'age dispensation' : null;
      why = ok ? '' : `you will be 17 and the FIA refused ${who}'s petition for an age dispensation (you have the 40 points, but the rule is 18 unless the FIA decides otherwise).`; pet = { team: who, kind: 'age dispensation', ok, p }; }
    else if (age >= 21 && G.history.some(h => h.year >= G.year - 2 && ['indy', 'sf', 'fe', 'wec', 'imsa', 'dtm', 'supercars', 'gt3w'].includes(h.cat) && (h.champ || h.pos <= 3))) {   // a proven senior-series winner: the FIA can license on demonstrated ability
      const hs = G.history.filter(h => h.year >= G.year - 2 && ['indy', 'sf', 'fe', 'wec', 'imsa', 'dtm', 'supercars', 'gt3w'].includes(h.cat) && (h.champ || h.pos <= 3)).sort((a, b) => a.pos - b.pos)[0];
      p = clamp((pk ? pk.petFM + 0.1 : 0.35) * (hs.champ ? 1.25 : 1) * (pts >= 20 ? 1.2 : 1), 0, 0.8); ok = rnd() < p; via = ok ? 'discretionary exception' : null; pet = { team: who, kind: 'discretionary', ok, p, src: `${hs.champ ? 'the' : 'P' + hs.pos + ' in the'} ${CATS[hs.cat].short} ${hs.champ ? 'title' : 'standings'}` };
      why = ok ? '' : `you have ${pts} of the 40 super licence points and ${who}'s request for a discretionary licence on your ${CATS[hs.cat].short} results was refused.`; }
    else why = age < 17 ? `you will only be ${age}, and the FIA does not license anyone under 17.` : age === 17 ? `you will be 17 with ${pts} of 40 super licence points: the age dispensation needs the full 40.` : `you have ${pts} of the 40 super licence points needed (30 is the minimum for a petition).`;
    if (pet) { const rbT = rb ? ' Red Bull push the FIA hard on these.' : (pk && pk.petFM >= 0.35 ? ` ${G.academy.n.split(' ')[0]} carry some weight with the FIA.` : ''); pet.text = `📝 Super licence petition: ${pet.team} asked the FIA for ${pet.kind === 'force majeure' ? `a force majeure exception (you have ${pts} of 40 points)` : pet.kind === 'discretionary' ? `a discretionary licence on the strength of ${pet.src} (you have ${pts} of 40 points)` : `an age dispensation so you can race at 17 (you have ${pts} points)`}. ${pet.ok ? 'The FIA GRANTED it' : 'The FIA REFUSED it'} (about ${Math.round(pet.p * 100)}% chance).${rbT}`; }
    return G.licRoll = { key, ok, via, pts, age, p, why, pet };
  }
  function licenceView(G) {
    if (!G.history.length || G.history.some(h => h.cat === 'f1')) return null; const v = slView(G), age = G.age + 1, rb = isRB(G);
    const ageText = age >= 18 ? 'age ok' : age === 17 ? (rb ? 'dispensation likely' : G.academy ? 'dispensation possible' : 'dispensation unlikely') : 'too young';
    const note = v.pts >= 40 ? (age >= 18 ? 'You hold the 40 points: any F1 team can sign you.' : age === 17 ? 'You have the 40 points. At 17 a team must petition the FIA for an age dispensation.' : 'You have the points but will be too young next year.')
      : v.pts >= 30 ? `${40 - v.pts} points short: a team can petition for a force majeure exception (rarely granted).` : `${40 - v.pts} more points needed over the three-season window. An F2 top three gives 40 on its own.`;
    const lr = G.licRoll && G.licRoll.key === G.year + ':' + G.age ? G.licRoll : null;
    const gr = lr && lr.ok && lr.via && lr.via !== 'points' ? `Licence secured by petition (${lr.via}): any F1 team can sign you.` : null;
    return { petition: lr && lr.pet ? lr.pet.text : null, pts: v.pts, need: 40, rows: v.rows, bonus: v.bonus, fp1: fp1Elig(G), ageText, note: gr || note, tpc: !!G.academy && G.age >= 16 && (rb || v.pts >= 30), rb, blurb: perkOf(G) ? perkOf(G).blurb : '' };
  }
  // what F1 teams think you are worth: mostly what they can see (qualifying and points against your team-mate), a little of your actual level
  const probit = p => { const t = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p))), z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t); return p < 0.5 ? -z : z; };
  const f1Value = G => {
    const L = G.last || {}, eff = ovrOf(G.stats) - penOf(G.f1Years + 1);
    if (L.cat !== 'f1' || L.mateEff === undefined) return eff;
    const qd = L.qH2H !== undefined ? clamp(8 * probit(clamp(L.qH2H, 0.05, 0.95)), -10, 10) : 14 * (L.tmShare - 0.5);   // one rating point is ~4% of quali head-to-heads
    return 0.2 * eff + 0.8 * (L.mateEff + 0.6 * qd + 0.4 * 14 * (L.tmShare - 0.5));
  };
  function makeOffer(G, kind, catId, team, extra) {
    const C = CATS[catId], r = trS(G, catId)[team], ros = roster(G, catId, team);
    let tm = ros.filter(n => n !== G.name)[0] || ros[0], tmSkill = C.lvl + 0.4 * (r - C.lvl), ovr = ovrOf(G.stats);
    if (catId === 'f1' && G.f1 && G.f1.teams[team]) {   // F1: you would partner the stronger incumbent (you take the weaker one's seat), judged on next year's level
      const inc = G.f1.teams[team].filter(d => d && !d.player).sort((a, b) => b.ski - a.ski)[0];
      if (inc) { tm = inc.name; tmSkill = effOf(inc); ovr = ovr - penOf(G.f1Years + 1); }
    }
    const role = ovr >= tmSkill + 2 ? 'Lead driver' : ovr >= tmSkill - 3 ? 'Equal status' : 'Second driver';
    const years = C.tier === 0 || JR1.includes(catId) ? 1 : C.tier >= 3 ? 1 + Math.floor(rnd() * 4) : 1 + Math.floor(rnd() * 3);
    const sal = Math.round(salOf(G, catId, team) * (catId === 'f1' ? Math.exp(gauss() * 0.2) : 1));   // F1 deals are negotiated: ±20% around the going rate
    return Object.assign({ kind, cat: catId, team, r: Math.round(r), cost: costOf(G, catId, team), sal, years, role, tm, tier: C.tier }, extra || {});
  }
  // dominated every category you raced in (F4, F3, F2): the only way to walk into a top team on debut
  const JR1 = ['f4', 'f3', 'f2', 'frec'];   // junior single-seater deals are one-year
  const dominatedAll = G => {
    const last = {}; G.history.forEach(h => { if (['f4', 'f3', 'f2'].includes(h.cat)) last[h.cat] = h; });
    const cs = Object.keys(last); return cs.length >= 2 && cs.every(c => last[c].champ);
  };
  function offersFor(G, catId, A, n, excludeTeam) {
    const C = CATS[catId], res = [];
    if (catId === 'f1' && !G.history.some(h => h.cat === 'f1') && !licDecision(G).ok) return [];   // no super licence, no seat
    if (catId === 'f1' && isRB(G) && !G.history.some(h => h.cat === 'f1')) return [makeOffer(G, 'move', 'f1', 'Racing Bulls', { rbRule: true })]; // Red Bull juniors debut at Racing Bulls
    if (catId === 'f1' && !G.history.some(h => h.cat === 'f1')) {   // F1 debut: top-four seats are almost never on offer
      const tr = trS(G, 'f1'), rank = C.teams.map(t => t[0]).sort((a, b) => tr[b] - tr[a]), top4 = rank.slice(0, 4), dom = dominatedAll(G), out = [];
      if (G.academy) {
        out.push(G.academy.feeder);   // Ferrari -> Haas, Mercedes/McLaren -> Williams, Red Bull -> Racing Bulls
        G.academy.f1.forEach(t => { if (!out.includes(t) && (!top4.includes(t) || (dom && rnd() < 0.4))) out.push(t); });
      }
      C.teams.forEach(t => {
        const nm = t[0]; if (out.includes(nm) || (nm === excludeTeam && catId === G.cat)) return;
        if (nm === 'Racing Bulls' && !isRB(G)) return;   // the Red Bull junior team signs from its own academy
        if (top4.includes(nm)) { if (dom && rnd() < 0.25) out.push(nm); return; }
        if (A + gauss() * 7 >= 100 * pf(G, catId, nm) - 5) out.push(nm);
      });
      const fd = G.academy && G.academy.feeder, ordered = out.sort((a, b) => pf(G, catId, b) - pf(G, catId, a)).slice(0, n);
      if (fd && !ordered.includes(fd)) ordered[ordered.length - 1 > 0 ? ordered.length - 1 : 0] = fd;
      return (ordered.length ? ordered : [rank[rank.length - 1]]).map(nm => makeOffer(G, 'move', catId, nm));
    }
    if (catId === 'f1' && C.time && G.history.some(h => h.cat === 'f1')) {   // an established F1 driver: a team only calls if you beat the driver you would replace
      const tr = trS(G, 'f1'), rank = C.teams.map(t => t[0]).sort((a, b) => tr[b] - tr[a]), v = f1Value(G), out = [], L = G.last || {};
      const beatMate = L.cat === 'f1' && (L.tmShare > 0.5 || L.qH2H > 0.5);
      rank.forEach((nm, r) => {
        if (nm === excludeTeam) return;
        if (nm === 'Racing Bulls' && !isRB(G) && G.f1Years < 4) return;   // not an academy driver: only experienced drivers get a Racing Bulls call
        // a top-four team wants a champion, a top-five finisher, or someone who clearly destroyed a good team-mate
        const sister = excludeTeam === 'Racing Bulls' && nm === 'Red Bull Racing' && L.cat === 'f1';   // the second-seat revolving door: Red Bull promotes whoever is doing the job at Racing Bulls
        const proven = L.champ || (L.cat === 'f1' && L.pos <= 5) || (L.tmShare >= 0.58 && L.qH2H >= 0.55 && G.f1Years <= 7) || (sister && (beatMate || L.tmShare >= 0.5 || L.pos <= 9));
        if (excludeTeam && G.contract > 0 && !G.demoted && !sister && (tr[nm] < tr[excludeTeam] + 1.5 || rnd() < 0.5)) return;   // under contract: only a clearly faster team buys you out
        const inc = (G.f1.teams[nm] || []).filter(d => d && !d.player).map(d => d.yrs ? effOf(d) : d.ski - 1), low = inc.length ? Math.min(...inc) : 80;
        const need = low + (r < 4 ? 1 : r < 7 ? -0.5 : -2.5) + (G.f1Years <= 3 ? Math.max(0, G.age - 23) * 0.7 : 0) + (G.age >= 35 ? 1.5 + (G.age - 35) * 0.6 : 0) + (G.age >= 38 ? (G.age - 37) * 2 : 0) + (G.demoted ? 3 : 0) - (G.last && G.last.champ ? 3 : 0) - (sister ? 3 : 0);
        if (r < 4 && !proven && v < need + 2.5) return;   // a top-four team needs proof, or an outright star (value well above its weakest driver)
        if (v + gauss() * 1.6 >= need) out.push(nm);
      });
      return out.slice(0, n + 1).map(nm => makeOffer(G, 'move', catId, nm));
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
  const f4Thr = (age, tier) => (age <= 16 ? 60 : age === 17 ? 54 : 48) - (tier === 4 ? 10 : tier === 3 ? 5 : 0);   // generational talents and wonderkids are in F4 a year early (Verstappen, Antonelli)
  const bucket = pos => pos <= 4 ? 0 : pos <= 7 ? 1 : pos <= 10 ? 2 : pos <= 15 ? 3 : 4;
  function promoChance(G, fromCat, toCat, pos, mult) {
    const st = STEP_P[fromCat];
    let p = st ? st[pos === 1 ? 0 : pos <= 3 ? 1 : pos <= 5 ? 2 : pos <= 10 ? 3 : 4] * STEP_TIER[G.tier] : PROMO_P[bucket(pos)][G.tier];
    if (TIER3_SIDE.includes(fromCat)) p *= pos <= 3 ? 0.03 : 0;
    // a generational or wonderkid F2 champion (or podium finisher) gets a seat: a team clears out a weaker driver for them (Leclerc, Russell, Hamilton)
    if (fromCat === 'f2' && toCat === 'f1' && G.tier >= 3) p = Math.max(p, (G.tier === 4 ? [0.97, 0.85, 0.55] : [0.85, 0.6, 0.35])[pos === 1 ? 0 : pos <= 3 ? 1 : pos <= 5 ? 2 : 3] || 0);
    return clamp(p * (mult || 1), 0, st ? 0.97 : 1);
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
  // where F1 drivers really go next (54 drivers with 2+ F1 seasons, last F1 year 2008-2023, matched to Wikipedia series standings):
  // young leavers go to Formula E and WEC, early thirties to IndyCar and DTM, veterans to WEC and IMSA, almost nobody to NASCAR or Supercars
  const POSTF1 = { young: { fe: 34, wec: 21, dtm: 7, indy: 7, imsa: 7, supercars: 3, gt3w: 6, nascar: 1 }, mid: { indy: 22, dtm: 22, fe: 11, wec: 11, imsa: 6, gt3w: 6, supercars: 3, nascar: 2 }, old: { wec: 28, imsa: 14, indy: 10, fe: 10, dtm: 10, gt3w: 8, supercars: 3, nascar: 3 } };
  function postF1Pick(age, k) {
    const w = Object.assign({}, POSTF1[age <= 29 ? 'young' : age <= 33 ? 'mid' : 'old']), out = [];
    while (out.length < k && Object.keys(w).length) { const ks = Object.keys(w); let r = rnd() * ks.reduce((a, c) => a + w[c], 0), i = 0; for (; i < ks.length - 1; i++) { r -= w[ks[i]]; if (r <= 0) break; } out.push(ks[i]); delete w[ks[i]]; }
    return out;
  }
  // why a step up did not come: grid already full, teams wanted someone younger, or the seats went to academy drivers
  function noSeatWhy(G, promoCat, nextAge) {
    const target = CATS[promoCat].short, vac = promoCat === 'f1' ? new Set((G.f1.vac || [])).size : 0, w = [];
    w.push(['full', promoCat === 'f1' ? (vac <= 1 ? 5 : vac <= 3 ? 2 : 0.5) : 2.5]);
    w.push(['young', nextAge >= 22 ? 3 : nextAge >= 21 ? 1.5 : 0]);
    w.push(['wait', nextAge <= 19 ? 3 : 0]);
    w.push(['academy', !G.academy && (promoCat === 'f1' ? vac > 0 : true) ? 2 : 0]);
    let r = rnd() * w.reduce((a, x) => a + x[1], 0), k = 'full'; for (const [id, v] of w) { r -= v; if (r <= 0 && v > 0) { k = id; break; } }
    return ({
      full: promoCat === 'f1' ? (vac === 0 ? `Why: every ${target} seat is already under contract for next year, and not one opened up.` : `Why: the ${target} grid is nearly locked. Only ${vac} seat${vac > 1 ? 's' : ''} opened up and the teams signed their drivers early.`) : `Why: next year's ${target} line-ups were already signed before the season finished.`,
      young: `Why: the teams that had a seat wanted someone younger, and at ${nextAge} you are no longer the fresh prospect.`,
      wait: `Why: teams think you need one more year and have not offered a seat yet.`,
      academy: `Why: the seats that did open went to manufacturer academy drivers, who get priority.`,
    })[k];
  }
  function buildMarket(G, keepPhase) {
    const L = G.last, C = CATS[G.cat], nextAge = G.age + 1, lh = G.history[G.history.length - 1];
    G._mk = []; G._rescued = false;
    const M = { options: [], stuck: false, forced: false, academy: null, nextAge, note: '', roll: null, msgs: G._mk, broke: false };
    // staying on a running deal keeps its pay
    const stay = () => { const o = makeOffer(G, 'stay', G.cat, G.team); o.years = G.contract > 0 ? G.contract : (C.tier === 0 || JR1.includes(G.cat) ? 1 : 1 + Math.floor(rnd() * 2)); if (G.contract > 0 && G.deal && G.deal.sal) o.sal = G.deal.sal; if (C.pay && C.tier >= 1 && !affordable(G, G.cat, G.team)) o.blocked = true; return o; };
    const lat = (cats, A, k, kind) => cats.forEach(lc => offersFor(G, lc, A(lc), k, null).forEach(o => M.options.push(Object.assign(o, { kind: kind || 'lateral' }))));
    let quit = false;
    if (C.tier === 0 && G.wealth === 'poor') {
      if (L.pos > 5) { if (rnd() < (L.pos > 12 ? 0.22 : 0.14)) quit = true; }
      else { G.family += 30; G.sponsor = Math.min(3, G.sponsor * 1.12); G._mk.push('🤝 A local sponsor backs you after a top-five finish. The family purse gets a boost.'); }
    }
    if (nextAge >= MAX_AGE) { M.forced = true; M.note = 'Age catches up. Time to hang up the helmet.'; }
    else if (quit) { M.forced = true; M.broke = true; M.note = 'Money has run out. Your family cannot keep funding karting, and results outside the top five did not attract a sponsor.'; }
    else if (C.tier === 0) {
      if (nextAge <= 15 && !(nextAge === 15 && G.tier >= 3 && G.rep >= f4Thr(15, G.tier))) {   // a generational talent or wonderkid with the reputation can go straight into F4 at 15
        const nc = kartCat(nextAge);
        if (nc !== G.cat) M.options.push(...offersFor(G, nc, attract(G, nc), 4, null).map(o => Object.assign(o, { kind: 'promo' })));
        else { M.options.push(stay()); M.options.push(...offersFor(G, G.cat, attract(G, G.cat), 3, G.team)); }
      } else {
        const thr = f4Thr(nextAge, G.tier);
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
          if (promoted) M.note = p >= 0.9 ? `P${pos} in ${C.short}: the doors are open.` : `P${pos} gave you a ${Math.round(p * 100)}% shot at ${CATS[promoCat].short}, and the call came.`;
          else if (p > 0.02) M.note = `P${pos} gave you a ${Math.round(p * 100)}% chance of a ${CATS[promoCat].short} seat. No call this time. ${noSeatWhy(G, promoCat, nextAge)}`;
        }
        if (promoted) M.options.push(...offersFor(G, promoCat, attract(G, promoCat) + (pos <= 4 ? 8 : 0), 4, null).map(o => Object.assign(o, { kind: 'promo' })));
        if (promoted && promoCat === 'f1' && !M.options.some(o => o.cat === 'f1') && G.licRoll && !G.licRoll.ok) M.note = `P${pos} in ${C.short} earned an F1 call, but ${G.licRoll.why}`;
        // most F4 graduates step up to FRECA; about half of F4 champions go straight to FIA F3 (Italian F4 2014-2024)
        if (promoted && cat === 'f4' && pos === 1 && rnd() < 0.55) { M.options.push(...offersFor(G, 'f3', attract(G, 'f3') + 8, 2, null).map(o => Object.assign(o, { kind: 'promo' }))); M.note = (M.note ? M.note + ' ' : '') + 'F4 champions can go straight to F3.'; }
      }
      // sensational seasons skip a rung
      const dom = lh && lh.races ? lh.wins / lh.races : 0;
      if (cat === 'f4' && L.champ && dom >= 0.28 && rnd() < Math.min(0.9, [0.04, 0.06, 0.15, 0.35, 0.6][G.tier] * (perkOf(G) ? perkOf(G).skip : 1))) {
        M.options.push(...offersFor(G, 'f2', attract(G, 'f2') + 6, 3, null).map(o => Object.assign(o, { kind: 'promo', skip: true })));
        M.note = (M.note ? M.note + ' ' : '') + 'A sensational F4 title: F2 teams want you and you can skip F3.';
      }
      // Red Bull's fast track: a dominant FRECA champion can skip F3, and an F3 champion or runner-up goes straight to F1 (Verstappen, Lindblad), with winter-series points and TPC mileage already banked
      if (cat === 'f4' && L.champ && dom >= 0.28 && nextAge <= 17 && rnd() < Math.min(0.9, [0, 0, 0.05, 0.25, 0.5][G.tier] * (perkOf(G) ? 1 + (perkOf(G).skip - 1) * 0.8 : 1))) {
        M.options.push(...offersFor(G, 'f3', attract(G, 'f3') + 8, 3, null).map(o => Object.assign(o, { kind: 'promo', skip: true })));
        M.note = (M.note ? M.note + ' ' : '') + 'A dominant F4 title at this age: F3 teams want you now and you can skip FRECA.';
      }
      if (cat === 'frec' && perkOf(G) && perkOf(G).skip >= 1.3 && L.champ && dom >= 0.28 && rnd() < [0, 0.05, 0.12, 0.35, 0.6][G.tier] * (isRB(G) ? 1 : 0.6)) {
        M.options.push(...offersFor(G, 'f2', attract(G, 'f2') + 6, 3, null).map(o => Object.assign(o, { kind: 'promo', skip: true })));
        M.note = (M.note ? M.note + ' ' : '') + `A dominant FRECA title: ${G.academy.n.split(' ')[0]} want you in F2 now and you can skip F3.`;
      }
      if (cat === 'f3' && (L.champ || (isRB(G) && pos <= 2)) && dom >= (isRB(G) ? 0.2 : 0.25) && rnd() < Math.min(0.9, [0, 0.02, 0.05, 0.18, 0.4][G.tier] * (perkOf(G) ? 1 + (perkOf(G).skip - 1) * 1.5 : 1))) {
        const sk = offersFor(G, 'f1', attract(G, 'f1') + 6, 3, null).map(o => Object.assign(o, { kind: 'promo', skip: true }));
        if (sk.length) { M.options.push(...sk); M.note = (M.note ? M.note + ' ' : '') + 'A sensational F3 title: F1 teams want you and you can skip F2.'; }
        else if (G.licRoll && !G.licRoll.ok) M.note = (M.note ? M.note + ' ' : '') + `A sensational F3 title had F1 teams interested, but ${G.licRoll.why}`;
      }
      // an F1 seat opens up (retirement / sacking) and you are in the frame
      if (cat !== 'f1' && nextAge <= 34 && G.f1.vac && G.f1.vac.length && (cat === 'f2' || TIER3_SIDE.includes(cat)) && !M.options.some(o => o.cat === 'f1')) {
        for (const t of [...new Set(G.f1.vac)]) {
          if (!G.history.some(h => h.cat === 'f1') && !licDecision(G).ok) continue;
          if (isRB(G) && t !== 'Racing Bulls') continue;
          if (t === 'Racing Bulls' && !isRB(G) && G.f1Years < 4) continue;   // the Red Bull junior team signs from its own academy
          if (!G.history.some(h => h.cat === 'f1') && Object.keys(trS(G, 'f1')).sort((a, b) => trS(G, 'f1')[b] - trS(G, 'f1')[a]).slice(0, 4).includes(t) && !dominatedAll(G) && !(G.reserve === t && rnd() < 0.35)) continue;
          let p = 0;
          if (G.reserve === t) p = clamp(0.1 + 0.4 * L.q, 0, 0.5);
          else if (G.academy && G.academy.f1.includes(t)) p = cat === 'f2' ? 0.5 * promoChance(G, 'f2', 'f1', pos) : 0.05;   // the junior ladder odds (above) already include these call-ups
          else if (cat === 'f2') p = 0.2 * promoChance(G, 'f2', 'f1', pos);
          else if (pos <= 2 && G.rep >= 70) p = 0.04 + 0.02 * Math.max(0, G.tier - 1);
          if (rnd() < p) { M.options.push(makeOffer(G, 'promo', 'f1', t, { vacancy: true })); M.note = (M.note ? M.note + ' ' : '') + `A seat opened up at ${t} and they want you.`; break; }
        }
      }
      const champOut = (cat === 'f2' || cat === 'f3') && L.champ && !M.options.some(o => o.kind === 'promo');   // F2/F3 champions may not race in the series again
      const stuck = !champOut && STUCK_CATS.includes(cat) && G.seasonsInCat >= 3 && !M.options.some(o => o.kind === 'promo');
      if (f1Demoted) {
        M.note = G.demotedWhy ? `No new deal with ${G.team}. Offers: lower F1 teams, an outside shot at a bigger team, or another series.` : `You were dropped mid-season. Offers: lower F1 teams, an outside shot at a bigger team, or another series.`;
        M.options.push(...offersFor(G, 'f1', attract(G, 'f1') - 28, 3, G.team).map(o => Object.assign(o, { kind: 'move' })));
        if (G.team === 'Red Bull Racing' && !M.options.some(o => o.team === 'Racing Bulls')) { M.options.unshift(Object.assign(makeOffer(G, 'move', 'f1', 'Racing Bulls', { demotion: true }), { kind: 'move' })); M.note += ' Red Bull put you back into Racing Bulls, the usual route for a released Red Bull driver: the best driver there takes your seat.'; }
        lat(SENIOR.slice().sort(() => rnd() - 0.5).slice(0, 3), () => attract(G, 'f1') + 8, 1);
        // a dropped F1 driver can be kept as another team's reserve (Red Bull driver to Racing Bulls reserve, Alex Albon style): F1 stand-in calls go to reserves, not to drivers who left the grid
        const v = f1Value(G), pRes = nextAge > 37 ? 0 : v >= 88 ? 0.8 : v >= 84 ? 0.55 : v >= 80 ? 0.35 : 0.15;
        if (rnd() < pRes) { const tr = trS(G, 'f1'), top = Object.keys(tr).sort((a, b) => tr[b] - tr[a]).slice(0, 7).filter(t => t !== G.team);
          const rt = G.team === 'Red Bull Racing' || (isRB(G) && G.team !== 'Racing Bulls') ? 'Racing Bulls' : G.team === 'Racing Bulls' && isRB(G) ? 'Red Bull Racing' : top[Math.floor(rnd() * Math.min(5, top.length))];
          const lt = M.options.filter(o => o.kind === 'lateral' && o.cat !== 'f1' && !o.blocked).sort(() => rnd() - 0.5).slice(0, 2);
          if (lt.length && rt) { lt.forEach(o => Object.assign(o, { kind: 'reserve', reserveFor: rt, role: `${rt} F1 reserve` })); M.note += ` ${rt} would keep you on as their F1 reserve driver while you race elsewhere: first in line for a stand-in call or a vacancy.`; } }
      } else if (champOut) {
        M.note = (M.note ? M.note + ' ' : '') + `${C.short} champions can't defend their title, and no ${CATS[promoCat].short} seat came: go sideways or call it a day.`;
        (LATERAL[cat] || []).forEach(lc => offersFor(G, lc, attract(G, lc) + 6, 2, null).forEach(o => M.options.push(Object.assign(o, { kind: 'lateral' }))));
        if (!M.options.length) M.options.push(...offersFor(G, cat === 'f2' ? 'wec' : 'gt3', attract(G, cat === 'f2' ? 'wec' : 'gt3') + 10, 2, null).map(o => Object.assign(o, { kind: 'lateral' })));
      } else if (stuck) {
        M.stuck = true; M.note = (M.note ? M.note + ' ' : '') + `3 seasons in ${C.short} without moving up: retire or go sideways.`;
        if (tgt) { const p = promoChance(G, cat, promoCat, pos, 0.35); if (rnd() < p) { M.options.push(...offersFor(G, promoCat, attract(G, promoCat) - 5, 2, null).map(o => Object.assign(o, { kind: 'promo' }))); M.note += ' A late call-up arrived.'; } }
        (LATERAL[cat] || []).forEach(lc => offersFor(G, lc, attract(G, lc), 2, null).forEach(o => M.options.push(Object.assign(o, { kind: 'lateral' }))));
      } else {
        M.options.push(stay());
        M.options.push(...offersFor(G, cat, attract(G, cat), 3, G.team));
        if (CATS[cat].time && G.contract > 0) M.note = (M.note ? M.note + ' ' : '') + `You are under contract at ${G.team} for ${G.contract} more year${G.contract > 1 ? 's' : ''}: only a clearly faster team will pay to buy you out.`;
        if (G.age >= 21 && (TIER3_SIDE.includes(cat) || cat === 'f1')) {
          const cats = cat === 'f1' ? postF1Pick(nextAge, nextAge >= 34 ? 4 : 3) : TIER3_SIDE.filter(c => c !== cat).sort(() => rnd() - 0.5).slice(0, 2);
          lat(cats, c => attract(G, c) + (cat === 'f1' ? 8 : 0), 1);
          if (cat === 'f1' && nextAge >= 34) M.note = (M.note ? M.note + ' ' : '') + 'Time to think about a final chapter: WEC, IMSA, GT3, Formula E or even NASCAR, where F1 experience still wins races.';
        }
      }
      // academy drivers without an F1 seat can take a reserve role
      if (cat === 'f2' && !M.options.some(o => o.cat === 'f1') && (G.academy || L.champ || pos <= 3)) {
        // an F2 champion or podium finisher without a seat: a team keeps you on the books as reserve driver (simulator, Friday practice, stand-in calls) while you race elsewhere
        const tr = trS(G, 'f1'), top = Object.keys(tr).sort((a, b) => tr[b] - tr[a]).slice(0, 7);
        const rt = isRB(G) ? 'Racing Bulls' : G.academy ? G.academy.f1[0] : top[Math.floor(rnd() * Math.min(top.length, L.champ ? 7 : 5))];
        const tag = o => Object.assign(o, { kind: 'reserve', reserveFor: rt, role: `${rt} F1 reserve` });
        const lat = M.options.filter(o => o.kind === 'lateral' && o.cat !== 'f1' && !o.blocked).sort(() => rnd() - 0.5).slice(0, 2);   // the same seats, now with the reserve contract attached
        if (lat.length) lat.forEach(tag); else ['fe', 'sf', 'indy', 'wec', 'imsa', 'gt3w'].sort(() => rnd() - 0.5).slice(0, 2).forEach(c => offersFor(G, c, attract(G, c) + 6, 1, null).forEach(o => M.options.push(tag(o))));
        M.note = (M.note ? M.note + ' ' : '') + (G.academy ? `${G.academy.n} can keep you as ${rt} reserve while you race elsewhere.` : `${rt} offer you a reserve driver contract: you race elsewhere, work in their simulator, and are first in line when a seat opens or a driver is hurt.`);
      }
    }
    M.options = M.options.filter((o, i, a) => a.findIndex(x => x.cat === o.cat && x.team === o.team) === i);
    const LAD = { f1: 1, f2: 1, f3: 1, frec: 1.5, f4: 1 }, rk = o => (CATS[o.cat].tier || 0) * 2 + (LAD[o.cat] || 0);   // the single-seater ladder above a side series of the same tier
    M.options = M.options.map((o, i) => [o, i]).sort((a, b) => rk(b[0]) - rk(a[0]) || a[1] - b[1]).map(x => x[0]);   // higher categories at the top of the contract desk
    if (!G.academy && !M.forced && C.tier >= 1 && C.tier <= 3 && G.age <= 24 && L.q >= 0.75 && G.rep >= 40 && rnd() < 0.4) M.academy = pick(ACADEMIES);
    if (G.licRoll && G.licRoll.key === G.year + ':' + G.age && G.licRoll.pet && !M.msgs.includes(G.licRoll.pet.text)) M.msgs.push(G.licRoll.pet.text);   // a team asking the FIA to speed up the super licence is shown on the contract desk
    M.sponsors = M.forced ? [] : sponsorOffers(G, L, C);
    M.broke = M.options.length > 0 && M.options.every(o => o.blocked);
    G.market = M; if (!keepPhase) G.phase = 'market';
    return M;
  }
  const canContinue = G => !!(G.market && G.contract > 0 && !G.demoted && !G.market.forced && !G.market.stuck && G.market.options.some(o => o.kind === 'stay' && !o.blocked));
  function continueContract(G, trainStat) { const i = G.market.options.findIndex(o => o.kind === 'stay' && !o.blocked); if (i < 0) return false; return chooseOption(G, i, trainStat, false) !== false; }

  // contract talks for F1 seats: ask above the going rate, pick the length and a clause; the team can hold at the market rate or walk away from a greedy ask
  function negOdds(G, o) {
    const lev = (G.rep - 60) / 150 + (G.last && G.last.champ ? 0.2 : 0) + (G.tier >= 3 ? 0.05 : 0);
    return { ask: [1, clamp(0.62 + lev, 0.2, 0.92), clamp(0.32 + lev * 1.4, 0.08, 0.8)], lead: o.team === 'Red Bull Racing' ? clamp(0.2 + lev * 1.2 + (G.tier === 4 ? 0.25 : G.tier === 3 ? 0.1 : 0), 0.05, 0.85) : 0, bonus: 1 };
  }
  function negotiate(G, idx, t) {
    const M = G.market, o = M && M.options[idx]; if (!o || o.cat !== 'f1' || o.blocked || !t) return { ok: true, msgs: [] };
    const od = negOdds(G, o), msgs = [], askM = [1, 1.15, 1.3][t.ask || 0]; let mult = 1, years = t.years || o.years;
    if ((t.ask || 0) > 0) { if (rnd() < od.ask[t.ask]) { mult *= askM; msgs.push(`📝 Contract talks: ${o.team} agree to your ask, +${Math.round((askM - 1) * 100)}% on the going rate.`); }
      else if (rnd() < 0.4) { o.blocked = true; return { ok: false, withdrawn: true, msg: `${o.team} walked away from the table: the ask was too greedy. Pick another offer.` }; }
      else msgs.push(`📝 Contract talks: ${o.team} would not move above the going rate.`); }
    mult *= { 1: 1.04, 2: 1, 3: 0.96 }[years] || 1;
    if (t.clause === 'lead') { if (rnd() < od.lead) { G.leadClause = { team: o.team, until: G.year + 1 + years - 1 }; msgs.push(`📝 Contract talks: ${o.team} write number 1 driver status into the contract for ${years} year${years > 1 ? 's' : ''}: the team is built around you.`); } else msgs.push(`📝 Contract talks: ${o.team} refused to promise you number 1 status.`); }
    if (t.clause === 'bonus') { G.bonusClause = { until: G.year + years }; mult *= 0.88; msgs.push('📝 Contract talks: lower base salary, with a bonus for every win and podium.'); }
    o.sal = Math.round(o.sal * mult); o.years = years; G._negMsg = msgs; return { ok: true, msgs };
  }
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
    if (!G.academy && o.kind !== 'reserve' && !(o.kind === 'stay' && G.reserve)) G.reserve = null;
    G.demoted = false; G.demotedWhy = null; G.f1 && (G.f1.vac = []);
    if (o.team !== G.team || o.kind !== 'stay') G.contract = o.years;
    G.team = o.team; G.deal = { cost: o.scholarship ? o.cost : costOf(G, o.cat, o.team), sal: o.sal !== undefined ? o.sal : salOf(G, o.cat, o.team) };
    startSeason(G);
    if (G._negMsg) { G._negMsg.forEach(m => note(G, m)); G._negMsg = null; }
  }

  // what comes next: weighted by titles, reputation, money and age, then a few lines about how it went
  function afterRacing(G, score, reachedF1) {
    const T = G.tot, titles = Object.values(T.titles || {}).reduce((a, x) => a + x, 0), wdc = (T.trophies || {})['F1 World Champion'] || 0, ageNow = G.age, rich = (T.earn || 0) >= 60000, last = G.history[G.history.length - 1];
    const f1t = [...new Set(G.history.filter(h => h.cat === 'f1').map(h => h.team.split(' → ').pop()))], mine = f1t.length ? f1t[f1t.length - 1] : null, men = (G.stats && G.stats.MEN) || 70;
    const W = [['tp', reachedF1 ? (wdc * 2.5 + titles * 0.6 + (G.rep >= 85 ? 2 : 0) + (men - 70) / 12 + (score >= 22 ? 1.5 : 0)) : 0.2], ['tv', (reachedF1 ? 2.5 : 0.8) + (G.rep >= 70 ? 1.5 : 0) + wdc * 0.5 + (G.buzz || 0) / 8], ['biz', rich ? 3 + (T.earn >= 200000 ? 2 : 0) : 0.8], ['coach', 2 + (ageNow >= 33 ? 1.2 : 0) + (men - 70) / 15], ['team', rich && titles >= 2 ? 2 + wdc : 0], ['quiet', 1.2 + (G.cause ? 1 : 0)], ['hist', ageNow >= 38 ? 1.5 : 0.2]].filter(x => x[1] > 0);
    let r = rnd() * W.reduce((a, x) => a + x[1], 0), path = 'quiet'; for (const [k, w] of W) { r -= w; if (r <= 0) { path = k; break; } }
    const nm = G.name, ten = G.year + 10, gp = (CATS.f1.names || ['a grand prix'])[Math.floor(rnd() * 20)];
    const succ = clamp((titles * 0.12 + G.rep / 140 + gauss() * 0.15), 0, 1), gen = succ > 0.65 ? 'great' : succ > 0.4 ? 'solid' : 'rocky';
    const out = {
      tp: { t: 'Team principal', x: `${nm} moves into the pit wall as team principal of ${mine && rnd() < 0.6 ? mine : pick(['a midfield team', 'a rising customer team', 'an ambitious new entrant'])}. By ${ten} the team has ${gen === 'great' ? `won ${(() => { const n = 1 + Math.floor(rnd() * 4); return n + ' constructors\' title' + (n > 1 ? 's' : ''); })()} and the paddock calls it a dynasty` : gen === 'solid' ? `climbed into the top five and won a race at ${gp}` : `struggled for results and gone through three engineering chiefs`}.` },
      tv: { t: 'Broadcaster', x: `${nm} becomes a fixture on the grand prix broadcasts: pundit on Sundays, columnist, then a prime-time chat show. By ${ten} fans know the voice better than the driving record.` },
      biz: { t: 'Businessman', x: `${nm} turns the earnings into a portfolio: a sportswear line, a restaurant chain and a racing simulator company. By ${ten} the second career is ${gen === 'great' ? 'worth more than the first' : gen === 'solid' ? 'a comfortable success' : 'a lesson in how hard business is'}.` },
      coach: { t: 'Mentor and academy director', x: `${nm} runs a young driver programme and coaches the next generation. By ${ten} ${gen === 'great' ? `two of the drivers are on the F1 grid and one has won a race` : gen === 'solid' ? `one driver has reached F2 and the programme has a waiting list` : `the programme is respected and small`}.` },
      team: { t: 'Team owner', x: `${nm} buys into the sport and founds a team of their own. By ${ten} it is ${gen === 'great' ? 'a front-running outfit with a factory and a works engine deal' : gen === 'solid' ? 'a stable midfield team that turns a profit' : 'surviving on sponsors and promises'}.` },
      quiet: { t: 'Quiet life', x: `${nm} steps away from the paddock for good. Family, a garden, the occasional track day. By ${ten} the helmet sits on a shelf and the old rivals still get a Christmas card.` },
      hist: { t: 'Historic racing', x: `${nm} cannot stay away: historic races, endurance specials and charity events. By ${ten} the old cars are still the best days of the week.` },
    }[path];
    return { path, title: out.t, text: out.x };
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
    G.retire = { after: afterRacing(G, score, reachedF1), label, score, best, teams, winsBy, age: G.age, seasons: G.history.length, cause: G.pendingEnd || null, why: G.endWhy || null };
    return G.retire;
  }
  function endCareerNow(G) { finishSeason(G, true); return retire(G); }
  // the all-time F1 list to measure a career against (approximate, end of 2025): titles, GP wins, poles, podiums, starts
  const ALLTIME = [['Lewis Hamilton', 7, 105, 104, 202, 380], ['Michael Schumacher', 7, 91, 68, 155, 306], ['Max Verstappen', 4, 71, 48, 127, 233], ['Sebastian Vettel', 4, 53, 57, 122, 299], ['Alain Prost', 4, 51, 33, 106, 199], ['Ayrton Senna', 3, 41, 65, 80, 161], ['Juan Manuel Fangio', 5, 24, 29, 35, 51], ['Fernando Alonso', 2, 32, 22, 106, 425], ['Jim Clark', 2, 25, 33, 32, 72], ['Jackie Stewart', 3, 27, 17, 43, 99], ['Niki Lauda', 3, 25, 24, 54, 171], ['Nelson Piquet', 3, 23, 24, 60, 204], ['Jack Brabham', 3, 14, 13, 31, 123], ['Mika Häkkinen', 2, 20, 26, 51, 161], ['Kimi Räikkönen', 1, 21, 18, 103, 349], ['Nico Rosberg', 1, 23, 30, 57, 206], ['Nigel Mansell', 1, 31, 32, 59, 187], ['Jenson Button', 1, 15, 8, 50, 306], ['Graham Hill', 2, 14, 13, 36, 176], ['Emerson Fittipaldi', 2, 14, 6, 35, 144], ['Alberto Ascari', 2, 13, 14, 17, 32], ['Damon Hill', 1, 22, 20, 42, 115], ['Jacques Villeneuve', 1, 11, 13, 23, 163], ['James Hunt', 1, 10, 14, 23, 92], ['Mario Andretti', 1, 12, 18, 19, 128], ['Alan Jones', 1, 12, 6, 24, 116], ['Jody Scheckter', 1, 10, 3, 33, 112], ['Jochen Rindt', 1, 6, 10, 13, 60], ['Lando Norris', 1, 11, 16, 44, 152], ['Oscar Piastri', 0, 9, 6, 26, 70], ['Charles Leclerc', 0, 8, 27, 50, 171], ['George Russell', 0, 5, 7, 24, 152], ['Stirling Moss', 0, 16, 16, 24, 66], ['Valtteri Bottas', 0, 10, 20, 67, 246], ['Mark Webber', 0, 9, 13, 42, 215], ['Daniel Ricciardo', 0, 8, 3, 32, 257], ['Felipe Massa', 0, 11, 16, 41, 269], ['Rubens Barrichello', 0, 11, 14, 68, 322], ['David Coulthard', 0, 13, 12, 62, 246], ['Gerhard Berger', 0, 10, 12, 48, 210], ['Gilles Villeneuve', 0, 6, 2, 13, 67], ['Sergio Pérez', 0, 6, 3, 39, 281], ['Carlos Sainz', 0, 4, 6, 27, 230]];
  // titles first, then wins, with win rate so a long career of padding does not beat a short dominant one
  const legacy = (t, w, pl, pd, st) => t * 12 + w * 0.6 + pl * 0.2 + pd * 0.1 + (st >= 40 ? 60 * w / st : 0);
  function allTimeRank(G, f1, wdc) {
    if (!f1 || !f1.races) return null;
    const sc = legacy(wdc, f1.wins, f1.poles, f1.podiums, f1.races), list = ALLTIME.map(a => ({ n: a[0], s: legacy(...a.slice(1)) })).sort((a, b) => b.s - a.s);
    const rank = 1 + list.filter(x => x.s > sc).length, above = list[rank - 2], below = list[rank - 1];
    const verdict = rank === 1 ? 'Statistically the greatest of all time. There is no argument left.' : rank <= 3 ? 'In the GOAT conversation, and some will put you at the top of it.' : rank <= 6 ? 'One of the all-time greats: the debate is where in the top five, not whether.' : rank <= 12 ? 'A great of the sport, though not in the very top tier.' : rank <= 25 ? 'A very good driver whose record will be respected, but nobody will call it all-time great.' : rank <= 40 ? 'A solid career. The record books will remember it; the all-time lists will not.' : 'Brutally honest: outside the all-time top 40. You raced in F1, which almost nobody does, but you will not be on anyone\'s greatest list.';
    return { rank, verdict, above: above && above.n, below: below && below.n };
  }
  // career file: totals per category (karting as one) and a written summary of the whole career
  function careerFile(G) {
    const R = G.retire || {}, H = G.history.filter(h => !h.partial || h.races), rows = [], idx = {};
    H.forEach(h => { const k = /^kart/.test(h.cat) ? 'kart' : h.cat; if (!(k in idx)) { idx[k] = rows.length; rows.push({ k, n: k === 'kart' ? 'Karting' : CATS[h.cat].short, from: h.year, to: h.year, seasons: 0, races: 0, wins: 0, podiums: 0, poles: 0, dnf: 0, pts: 0, titles: 0, rs: [] }); }
      const r = rows[idx[k]]; r.to = h.year; r.seasons++; r.races += h.races || 0; r.wins += h.wins || 0; r.podiums += h.podiums || 0; r.poles += h.poles || 0; r.dnf += (h.dnfE || 0) + (h.dnfR || 0); r.pts += h.pts || 0; if (h.champ) r.titles++; if (h.rating != null) r.rs.push(h.rating);
      if (h.spr) { r.races -= h.spr.races; r.pts -= h.spr.pts; r.dnf -= h.spr.dnf; const q = r.spr = r.spr || { races: 0, wins: 0, podiums: 0, pts: 0, dnf: 0 }; ['races', 'wins', 'podiums', 'pts', 'dnf'].forEach(k => { q[k] += h.spr[k] || 0; }); } });   // main races and sprints apart (F1 records count grands prix only)
    const gradeAvg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    rows.forEach(r => { r.rating = gradeAvg(r.rs); r.grade = r.rating == null ? null : gradeOf(r.rating); delete r.rs; });
    const allR = gradeAvg(H.filter(h => h.rating != null).map(h => h.rating)), f1 = rows.find(r => r.k === 'f1'), f1h = H.filter(h => h.cat === 'f1');
    const story = [], first = H[0], last = H[H.length - 1], wdc = (G.tot.trophies || {})['F1 World Champion'] || 0;
    if (first) story.push(`${G.name} raced for ${H.length} season${H.length === 1 ? '' : 's'}, from ${first.year} (age ${first.age}) to ${last.year}, as ${R.label || 'a racing driver'}.`);
    const ladder = rows.filter(r => r.k !== 'kart' && ['f4', 'frec', 'f3', 'f2'].includes(r.k));
    if (ladder.length) story.push(`The junior ladder went ${ladder.map(r => `${r.n}${r.titles ? ' (champion)' : ''}`).join(', then ')}.`);
    if (f1) {
      const deb = f1h[0], bestF1 = f1h.slice().sort((a, b) => (b.champ - a.champ) || (b.wins - a.wins) || (a.pos - b.pos))[0];
      story.push(`F1 debut at ${deb.age} with ${deb.team.split(' → ')[0]}. ${f1.seasons} season${f1.seasons === 1 ? '' : 's'} on the grid: ${f1.races} grands prix, ${f1.wins} win${f1.wins === 1 ? '' : 's'}, ${f1.podiums} podium${f1.podiums === 1 ? '' : 's'} and ${f1.poles} pole${f1.poles === 1 ? '' : 's'}` + (f1.spr ? `, plus ${f1.spr.wins} sprint win${f1.spr.wins === 1 ? '' : 's'} from ${f1.spr.races} sprints.` : '.'));
      story.push(wdc ? `${wdc}× World Champion. The best year was ${bestF1.year}: ${bestF1.wins} wins for ${bestF1.team.split(' → ').pop()}.` : bestF1.pos <= 3 ? `No world title, but P${bestF1.pos} in ${bestF1.year} came closest.` : `Best championship finish: P${bestF1.pos} in ${bestF1.year}.`);
      if (f1.wins && f1.races) story.push(f1.wins / f1.races >= 0.3 ? 'A win rate that puts the career among the very greatest.' : f1.wins / f1.races >= 0.12 ? 'A regular winner across the years.' : f1.wins ? 'Wins came when the car allowed it.' : '');
    } else story.push(rows.length > 1 ? `F1 never came: the top level reached was ${rows.slice().sort((a, b) => (CATS[b.k === 'kart' ? 'kart4' : b.k].tier || 0) - (CATS[a.k === 'kart' ? 'kart4' : a.k].tier || 0))[0].n}.` : 'The career never left karting.');
    const other = rows.filter(r => r.k !== 'f1' && r.k !== 'kart' && !['f4', 'frec', 'f3', 'f2'].includes(r.k));
    if (other.length) story.push(`Outside the ladder: ${other.map(r => `${r.n} (${r.seasons} season${r.seasons === 1 ? '' : 's'}${r.wins ? `, ${r.wins} win${r.wins === 1 ? '' : 's'}` : ''}${r.titles ? `, ${r.titles} title${r.titles === 1 ? '' : 's'}` : ''})`).join(', ')}.`);
    const ch = f1h.filter(h => h.carAvg != null);
    if (ch.length) { const avg = ch.reduce((a, h) => a + h.carAvg, 0) / ch.length, top = ch.filter(h => h.carAvg <= 2.5).length, back = ch.filter(h => h.carAvg > 6.5).length;
      const fast = top, parts = [`Your F1 cars averaged P${avg.toFixed(1)} in the pecking order across the career`];
      if (fast) parts.push(`${fast} season${fast === 1 ? '' : 's'} in a top-two car`); if (back) parts.push(`${back} season${back === 1 ? '' : 's'} fighting from the back half`);
      story.push(parts.join('; ') + (wdc ? (avg <= 2.5 ? '. The car did a lot of the work on those titles.' : '. Those titles were mostly the driver.') : '.')); }
    { const rn = rivalOf(G), rv = rn && G.riv[rn]; if (rv) { const yrs = rv.y.length; story.push(`Career rival: ${rn}. ${yrs} season${yrs === 1 ? '' : 's'} of fighting over the same places, ${rv.a} times side by side at the flag, and you finished ahead of them in ${rv.w} of ${rv.w + rv.l} races where you both finished (${Math.round(100 * rv.w / Math.max(1, rv.w + rv.l))}%).`); } }
    { const ft = G.fanTitles || [], tt = G.taintedTitles || [];
      const names = x => `${x.gp} ${x.year}`;
      if (ft.length) { const f1ft = ft.filter(x => x.id === 'f1'), oth = ft.filter(x => x.id !== 'f1');
        if (f1ft.length) story.push(`${wdc ? `${wdc} F1 title${wdc === 1 ? '' : 's'} on paper, but fans say ${wdc + f1ft.length}` : 'No F1 title on paper, but fans count ' + (f1ft.length === 1 ? 'one championship' : f1ft.length + ' championships') + ' as yours'} after ${f1ft.map(names).join(' and ')}.`);
        if (oth.length) story.push(`Fans also count the ${oth.map(x => `${x.cat} championship of ${x.year}`).join(' and the ')} as yours after the controversy at ${oth.map(x => x.gp).join(' and ')}.`); }
      if (tt.length) story.push(`${tt.length === 1 ? 'One title' : tt.length + ' titles'} carry an asterisk for some fans: ${tt.map(x => `${x.cat} ${x.year} (${x.gp})`).join(', ')}.`); }
    const inj = G.injuries || [], hurt = inj.filter(x => x.kind === 'injury'), bans = inj.filter(x => x.kind === 'ban');
    if (G.penTot) story.push(`The stewards handed out ${G.penTot} penalty point${G.penTot === 1 ? '' : 's'} over the career` + (bans.length ? `, and ${bans.length === 1 ? 'one race ban' : bans.length + ' race bans'} (${bans.map(b => b.year).join(', ')}).` : '.'));
    if (hurt.length) story.push(`Injuries cost ${hurt.reduce((a, x) => a + x.missed, 0)} round${hurt.reduce((a, x) => a + x.missed, 0) === 1 ? '' : 's'} over the years (${hurt.map(x => `${x.why}, ${x.year}`).join('; ')}).`);
    if (allR != null) story.push(`Season report cards averaged ${gradeOf(allR)} (${allR}).`);
    const at = allTimeRank(G, f1, wdc);
    if (at) story.push(`Projected all-time F1 ranking: #${at.rank}${at.above ? `, between ${at.above} and ${at.below || 'the rest'}` : at.below ? `, ahead of ${at.below}` : ''}. ${at.verdict}`);
    story.push(R.cause === 'fatal' ? `The career ended in tragedy at ${R.age}: ${R.why || 'a fatal accident'}.` : R.cause ? `It ended suddenly at ${R.age}: ${R.why || 'a career-ending injury'}.` : `Retired at ${R.age}.`);
    const f1car = ch.length ? Math.round(ch.reduce((a, h) => a + h.carAvg, 0) / ch.length * 10) / 10 : null;
    return { after: R.after || null, f1car, rows, story: story.filter(Boolean), rating: allR, grade: allR == null ? null : gradeOf(allR), injuries: inj, allTime: at };
  }

  // saves from older versions: make sure every series has its world state
  function migrate(G) {
    if (!G || !G.dyn) return G;
    Object.values(CATS).forEach(C => {
      if (!G.tr[C.id]) G.tr[C.id] = {};
      if (C.dyn && !G.dyn[C.id]) { G.dyn[C.id] = { str: {}, trend: {}, streak: 0, last: null, regime: 'close', relEra: 1, gapEra: 1, relTeam: {} }; C.teams.forEach(t => { G.dyn[C.id].str[t[0]] = t[1]; G.dyn[C.id].trend[t[0]] = 0; G.dyn[C.id].relTeam[t[0]] = 1; }); }
      if (!Object.keys(G.tr[C.id]).length) setTR(G, C.id);
    });
    // older saves: F1 pool drivers had no experience count (needed by the lap-time model's rookie penalty)
    if (G.f1 && G.f1.anchor === undefined) {
      // saves from before the lap-time model: old ratings were already the drivers' current level, so treat them as experienced,
      // anchor the field at the fitted level, and take back the old rookie handicap from an F1 season in progress
      [...Object.values(G.f1.teams).flat(), ...(G.f1.free || [])].forEach(d => { if (d && !d.player && d.yrs === undefined) d.yrs = Math.max(3, clamp(G.year - d.birth - 21, 0, 12)); });
      G.f1.anchor = baseAnchor();
      if (G.S && G.S.cat === 'f1' && !G.S.over) {
        const k = Math.min(G.f1Years, 4), pen = [8, 6.2, 4.2, 2.4, 1][k] * (G.tier === 4 ? 1 : 1.1);
        // that handicap arrived together with G.wealth and S.regime; careers begun before it have neither, so fall back to the size of the saved boost
        const had = G.wealth !== undefined || G.S.regime !== undefined || G.S.boost < -pen / 2;
        G.S.boost += G.S.exp !== undefined ? [1.5, 1, 0.5, 0, 0][k] : had ? pen : 0; delete G.S.exp; G.S.learn = 0;
      }
    }
    return G;
  }
  const api = { hungerOf, negOdds, negotiate, rivalOf, penActive, constructors, licenceView, careerFile, migrate, SENIOR, standingsEv, compTable, takeSponsor, canContinue, continueContract, WEALTH, setStats, CATS, TIERS, rnd, newGame, rerollStats, rerollClub, startSeason, playRound, simToEnd, setMode, wheelList, spinWheel, skipWheel, finishSeason, buildMarket, chooseOption, retire, endCareerNow, standings, player, ovrOf, potLabel, funding, costOf, salOf, kartCat, MAX_AGE, tierOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.F1E = api;
})(typeof window !== 'undefined' ? window : globalThis);
