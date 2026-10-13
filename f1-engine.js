/* Grid Dynasty – career engine (no DOM). Karting -> F4 -> F3 -> F2 -> F1 with lateral moves. */
(function (root) {
  const D = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./f1-data.js') : root.F1D;
  const { CATS, NATS, ACADEMIES, PROMO, LATERAL, STUCK_CATS, TIER3_SIDE, STATS, TIERS, PROMO_P, F1P, ROOKIES, RETIRE_2028 } = D;

  const rnd = Math.random;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const R1 = x => Math.round(x * 10) / 10;

  const MAX_AGE = 43, START_YEAR = 2026;
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
      tier: rollTier(), shape: rollShape(o.arch), train: {}, stats: {}, rep: 0, sponsor: 1, academy: null, buzz: 0,
      cat: startAge === 16 ? 'f4' : 'kart1', team: null, contract: 0, seasonsInCat: 0, deal: { cost: 0, sal: 0 },
      history: [], standIns: [], tot: { races: 0, wins: 0, podiums: 0, poles: 0, earn: 0, peak: 0, trophies: {}, titles: {} },
      tr: {}, trPrev: {}, gen: {}, names: {}, churn: {}, dyn: {}, f1: null, phase: 'intro', S: null, market: null, news: null, last: null,
    };
    G.rep = startAge === 16 ? [46, 52, 56, 62, 72][G.tier] + gauss() * 3 : 12 + rnd() * 8;
    Object.values(CATS).forEach(C => {
      G.tr[C.id] = {};
      if (C.dyn) { G.dyn[C.id] = { str: {}, trend: {}, streak: 0, last: null }; C.teams.forEach(t => { G.dyn[C.id].str[t[0]] = t[1]; G.dyn[C.id].trend[t[0]] = 0; }); }
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
    C.teams.forEach(t => { G.tr[c][t[0]] = R1(C.lvl + (C.dyn ? G.dyn[c].str[t[0]] : t[1] * 0.4)); });
  }
  const isElite = (G, c, team) => {
    const C = CATS[c]; if (C.elite.includes(team)) return true;
    if (c === 'f1') return G.f1.teams[team].some(d => !d.player && d.ski >= 91);
    return false;
  };
  function evolveCat(G, c, champ) {
    const C = CATS[c], d = G.dyn[c], ny = G.year + 1, reg = C.regYears.includes(ny), names = C.teams.map(t => t[0]);
    if (reg) {
      names.forEach(n => { const base = teamDef(c, n)[1]; d.str[n] = clamp(0.6 * base + gauss() * 3.2, -8, 8); d.trend[n] = -0.2 * d.str[n] + gauss() * 0.7; });
      d.streak = 0; d.last = null;
    } else {
      names.forEach(n => { const base = teamDef(c, n)[1]; d.str[n] += d.trend[n] + gauss() * 1.1 + 0.15 * (0.6 * base - d.str[n]); d.trend[n] *= 0.8; });
      if (champ) {
        d.streak = d.last === champ ? d.streak + 1 : 1; d.last = champ;
        const el = isElite(G, c, champ);
        if (d.streak === 1) d.str[champ] += 0.9; else if (d.streak === 2) d.str[champ] -= el ? 0.4 : 1.8; else d.str[champ] -= el ? 1.8 : 3.2;
        if (d.streak >= 2) names.filter(n => n !== champ).sort((a, b) => d.str[b] - d.str[a]).slice(0, 3).forEach(n => d.str[n] += 1.0);
      }
      names.forEach(n => d.str[n] = clamp(R1(d.str[n]), -9, 9));
    }
    setTR(G, c);
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
  const salOf = (G, cat, name) => { const C = CATS[cat]; return C.pay ? 0 : Math.round(lerp(C.sal[0], C.sal[1], Math.pow(pf(G, cat, name), 1.8)) * (0.35 + G.rep / 160)); };
  const funding = G => 8 * Math.exp(0.075 * G.rep) * G.sponsor;
  const affordable = (G, cat, name) => { const C = CATS[cat]; return !C.pay || costOf(G, cat, name) <= funding(G) || (G.academy && C.tier >= 1 && C.tier <= 3); };

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
        G.f1.teams[name].forEach(d => { const isP = !!d.player; drivers.push({ id: drivers.length, name: isP ? G.name : d.name, team: name, car, skill: isP ? 0 : d.ski + gauss() * 1.3, isPlayer: isP, pts: 0, w: 0, p: 0, pole: 0, races: 0, dnf: 0, tb: rnd() }); });
        return;
      }
      roster(G, C.id, name).forEach((nm, i) => {
        const isP = name === G.team && i === seats(C.id, name) - 1;
        drivers.push({ id: drivers.length, name: isP ? G.name : nm, team: name, car, skill: C.lvl + 0.4 * (car - C.lvl) + gauss() * 3.5, isPlayer: isP, pts: 0, w: 0, p: 0, pole: 0, races: 0, dnf: 0, tb: rnd() });
      });
    });
    const form = gauss() * 1.3;
    G.S = { cat: G.cat, round: 0, drivers, log: [], boost: form, carMod: 0, injured: 0, tmp: 0, tmpUntil: 0, wheelDue: false, spins: 0, stageEnds: [Math.floor(C.rounds / 3), Math.floor(2 * C.rounds / 3)], euro: false, wcWin: false, trophies: [], over: false, notes: [] };
    G.phase = 'season'; G.market = null; G.pendingEnd = null;
  }
  const player = G => G.S.drivers.find(d => d.isPlayer);
  const standings = G => G.S.drivers.slice().sort((a, b) => b.pts - a.pts || b.w - a.w || b.p - a.p || a.tb - b.tb);

  /* ---------- race sim ---------- */
  function playRound(G) {
    const S = G.S, C = CATS[S.cat];
    if (S.round >= C.rounds) return null;
    const st = G.stats, P = player(G), ri = S.round;
    const wet = rnd() < 0.18, out = S.injured > 0;
    const tmp = S.round < S.tmpUntil ? S.tmp : 0;
    const Dq = 0.35 * st.PAC + 0.45 * st.QUA + 0.1 * st.MEN + 0.1 * st.CON;
    const Dr = 0.28 * st.PAC + 0.28 * st.RAC + 0.14 * st.CON + 0.14 * st.TYR + 0.08 * st.MEN + 0.08 * st.FIT;
    const wetAdj = wet ? (st.WET - 60) * 0.3 : 0;
    const bonus = S.boost + tmp;
    const active = S.drivers.filter(d => !(d.isPlayer && out));
    // units: one per driver, or one per car in crew series (WEC / GT): crew-mates share the result
    const units = [];
    if (C.crew) { const m = {}; active.forEach(d => { (m[d.team] = m[d.team] || { members: [], team: d.team, car: d.car }).members.push(d); }); Object.values(m).forEach(u => units.push(u)); }
    else active.forEach(d => units.push({ members: [d], team: d.team, car: d.car }));
    units.forEach(u => { u.hasP = u.members.some(d => d.isPlayer); });
    const uSkill = (u, pv) => u.members.reduce((a, d) => a + (d.isPlayer ? pv + bonus + wetAdj : d.skill), 0) / u.members.length;
    const uCar = u => u.car + (u.hasP ? S.carMod : 0);
    const uP = units.find(u => u.hasP);

    units.forEach(u => { u.q = 0.55 * uSkill(u, Dq) + 0.45 * uCar(u) + gauss() * (wet ? 3.6 : 2.2); });
    const qOrder = units.slice().sort((a, b) => b.q - a.q);
    const qpos = out ? null : qOrder.indexOf(uP) + 1;
    if (qOrder.length) qOrder[0].members.forEach(d => d.pole++);

    const entry = { round: ri + 1, name: C.names[ri] || ('Round ' + (ri + 1)), wet, qpos, races: [], pole: !out && qOrder[0] === uP, out, field: units.length };
    let prev = qOrder;
    C.rf.forEach(rf => {
      let grid;
      if (rf.grid === 'q') grid = qOrder.slice();
      else if (rf.grid === 'prev') grid = prev.slice();
      else { const n = +rf.grid.replace('rev', ''); grid = qOrder.slice(); grid = grid.slice(0, n).reverse().concat(grid.slice(n)); }
      const n = grid.length;
      grid.forEach((u, gi) => {
        u.grid = gi + 1;
        const sig = u.hasP ? clamp(5.6 - st.CON / 38, 3, 5) : 4.2;
        u.s = 0.55 * uSkill(u, Dr) + 0.45 * uCar(u) + (n / 2 - gi) * 0.16 + gauss() * (sig + (wet ? 1.5 : 0));
        const pd = u.hasP ? clamp(0.075 - (st.CON - 60) * 0.0009, 0.02, 0.1) : 0.06;
        u.crash = rnd() < pd;
      });
      const res = grid.filter(u => !u.crash).sort((a, b) => b.s - a.s).concat(grid.filter(u => u.crash));
      res.forEach((u, i) => u.members.forEach(d => { d.races++; if (u.crash) { d.dnf++; return; } d.pts += rf.pts[i] || 0; if (i === 0) d.w++; if (i < 3) d.p++; }));
      if (!out) {
        const pos = res.indexOf(uP) + 1;
        entry.races.push({ n: rf.n, grid: uP.grid, pos, dnf: uP.crash, pts: uP.crash ? 0 : (rf.pts[pos - 1] || 0) });
        if (pos === 1 && !uP.crash) { if (C.special && C.special[ri]) S.trophies.push(C.special[ri]); if (C.kartWC && ri === C.rounds - 1) S.wcWin = true; }
      }
      prev = res;
    });
    S.log.push(entry);
    S.round++;
    if (S.injured > 0) S.injured--;
    if (C.kartWC && S.round === 5 && standings(G)[0].isPlayer) S.euro = true;
    if (S.round >= C.rounds) S.over = true;
    else if (S.spins < 2 && S.round >= S.stageEnds[S.spins]) S.wheelDue = true;
    return entry;
  }
  function simToEnd(G) { while (!G.S.over && !G.S.wheelDue) playRound(G); }

  /* ---------- the wheel (3 stages -> 2 spins a season) ---------- */
  function wheelList(G) {
    const S = G.S, C = CATS[S.cat], tb = standings(G), pos = tb.findIndex(d => d.isPlayer) + 1, N = tb.length;
    const low = pos > N * 0.7;
    const f1Path = ['f2', 'sf', 'indy', 'wec', 'fe'].includes(S.cat) && G.age <= 31 && (G.academy || G.rep >= 62);
    const L = [
      { id: 'crash', w: 11, ic: '💥', t: 'Heavy crash', fx: 'Miss the next 1–2 rounds (0 points) and lose 1 Fitness.' },
      { id: 'academy', w: 9, ok: !G.academy && G.rep >= 40 && C.tier >= 1 && C.tier <= 3 && G.age <= 24, ic: '🎓', t: 'Academy signing', fx: 'A manufacturer academy pays your seat in F4–F2, +4 rep, yearly development boost and priority from its F1 team. It can drop you after a bad year.' },
      { id: 'sponsorLost', w: 9, ok: C.pay && C.tier <= 3, ic: '📉', t: 'Sponsor backs out', fx: 'Funding −30% for good. Pay-to-drive series (karting to F2, Lights, NXT, GT) get pricier to afford, so next summer you see fewer or weaker seats.' },
      { id: 'sponsorNew', w: 9, ok: C.pay, ic: '💷', t: 'New sponsor', fx: 'Funding +35%. Opens bigger seats next summer.' },
      { id: 'standIn', w: 7, ok: f1Path, ic: '🚨', t: 'F1 stand-in', fx: 'You replace an injured F1 driver for 1–4 grands prix (missing 1–2 rounds here). Points boost your rep and make F1 teams notice you.' },
      { id: 'fp1', w: 8, ok: !!G.academy && C.tier >= 1 && C.tier <= 3, ic: '🏎️', t: 'FP1 outing', fx: 'Your academy puts you in a Friday practice session. +2 rep, +1 Mentality, small boost to F1 interest.' },
      { id: 'upgrade', w: 13, ic: '🔧', t: 'Car upgrade', fx: 'Your car is +2.5 rating for the rest of the season.' },
      { id: 'badup', w: 7, ok: C.tier >= 1, ic: '🛠️', t: 'Reliability woes', fx: 'A bad development path: car −2 rating for the rest of the season.' },
      { id: 'breakthrough', w: 11, ic: '⚡', t: 'Breakthrough', fx: 'One random attribute jumps +3 (permanent).' },
      { id: 'engineer', w: 9, ic: '🎧', t: 'Engineer clicks', fx: '+2 pace for the rest of the season.' },
      { id: 'form', w: 6, ic: '🔥', t: 'Purple patch', fx: 'Red-hot form: +4 pace for the rest of the season.' },
      { id: 'slump', w: 5, ic: '🥶', t: 'Confidence slump', fx: '−2 pace for the rest of the season and −1 Mentality.' },
      { id: 'illness', w: 5, ic: '🤒', t: 'Illness', fx: '−3 pace for the next two rounds.' },
      { id: 'sacked', w: low ? 9 : 1.2, ok: C.tier >= 1, ic: '✂️', t: 'Dropped by team', fx: 'Team sacks you for poor results (far likelier if you are in the bottom 30%). You finish the year in a worse seat: car −3.5, −3 rep, and no re-sign option.' },
      { id: 'careerEnd', w: 0.3, ok: C.tier >= 1, ic: '🩹', t: 'Career-ending injury', fx: 'A freak injury ends your racing career immediately. Very rare.' },
      { id: 'fatal', w: 0.04, ok: C.tier >= 1, ic: '🕯️', t: 'Fatal accident', fx: 'A tragic accident ends your career. Extremely rare.' },
    ].filter(o => o.ok === undefined || o.ok);
    const cols = ['#ff4d6d', '#1fbf75', '#ff8a5c', '#4da3ff', '#ffd23f', '#b57bff', '#2dd4bf', '#f97316', '#ec4899', '#84cc16', '#facc15', '#64748b', '#22d3ee', '#f43f5e', '#a3a3a3', '#475569'];
    L.forEach((o, i) => o.col = cols[i % cols.length]);
    return L;
  }
  function spinWheel(G) {
    const S = G.S, C = CATS[S.cat], st = G.stats, L = wheelList(G);
    let t = L.reduce((a, o) => a + o.w, 0) * rnd(), idx = 0;
    for (let i = 0; i < L.length; i++) { t -= L[i].w; if (t <= 0) { idx = i; break; } }
    const o = L[idx]; let desc = '', ended = false;
    switch (o.id) {
      case 'crash': S.injured = Math.max(S.injured, C.tier === 0 ? 1 : 1 + Math.floor(rnd() * 2)); st.FIT = Math.max(30, st.FIT - 1); desc = `You miss the next ${S.injured} round${S.injured > 1 ? 's' : ''}.`; break;
      case 'academy': G.academy = pick(ACADEMIES); G.rep = Math.min(100, G.rep + 4); desc = `${G.academy.n} signs you. Seat costs are covered from now on.`; break;
      case 'sponsorLost': G.sponsor = Math.max(0.35, G.sponsor * 0.7); desc = 'Funding is down 30%. Expect tighter seat options next summer.'; break;
      case 'sponsorNew': G.sponsor = Math.min(3, G.sponsor * 1.35); desc = 'Funding is up 35%. Bigger seats are in reach.'; break;
      case 'standIn': {
        const n = 1 + Math.floor(rnd() * 4); let pts = 0, best = 99; const ovr = ovrOf(st);
        for (let i = 0; i < n; i++) { const pos = clamp(Math.round(11 + (84 - (ovr + S.boost)) * 0.9 + gauss() * 3.5), 1, 20); if (rnd() < 0.08) continue; best = Math.min(best, pos); pts += [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][pos - 1] || 0; }
        S.injured = Math.max(S.injured, Math.ceil(n / 2)); G.rep = Math.min(100, G.rep + clamp(pts * 0.35 + (best <= 10 ? 3 : 1), 1, 8)); G.buzz = Math.min(15, G.buzz + 5 + Math.min(8, pts * 0.4));
        G.standIns.push({ year: G.year, n, pts, best: best === 99 ? null : best });
        desc = `${n} grand prix${n > 1 ? ' starts' : ' start'}: ${pts} pts${best < 99 ? ', best P' + best : ', no finishes'}. F1 teams are watching.`; break; }
      case 'fp1': G.rep = Math.min(100, G.rep + 2); st.MEN = Math.min(99, st.MEN + 1); G.buzz = Math.min(15, G.buzz + 3); desc = 'A strong Friday run gets noticed in the F1 paddock.'; break;
      case 'upgrade': S.carMod += 2.5; desc = 'The car is quicker for the rest of the year.'; break;
      case 'badup': S.carMod -= 2; desc = 'The car is slower for the rest of the year.'; break;
      case 'breakthrough': { const k = pick(STATS); st[k] = Math.min(99, st[k] + 3); G.train[k] = (G.train[k] || 0) + 3; desc = `+3 ${D.STAT_NAMES[k]}.`; break; }
      case 'engineer': S.boost += 2; desc = '+2 pace until the end of the season.'; break;
      case 'form': S.boost += 4; desc = '+4 pace until the end of the season.'; break;
      case 'slump': S.boost -= 2; st.MEN = Math.max(30, st.MEN - 1); G.train.MEN = (G.train.MEN || 0) - 1; desc = '−2 pace until the end of the season.'; break;
      case 'illness': S.tmp = -3; S.tmpUntil = S.round + 2; desc = '−3 pace for the next two rounds.'; break;
      case 'sacked': S.carMod -= 3.5; G.rep = Math.max(5, G.rep - 3); G.contract = 0; G.sacked = true; desc = 'You see out the season in a lesser drive.'; break;
      case 'careerEnd': ended = true; desc = 'Your racing career ends here.'; break;
      case 'fatal': ended = true; desc = 'A tragic end to a racing life.'; break;
    }
    S.wheelDue = false; S.spins++;
    if (ended) G.pendingEnd = o.id;
    return { idx, id: o.id, icon: o.ic, title: o.t, fx: o.fx, desc, ended };
  }
  function skipWheel(G) { G.S.wheelDue = false; G.S.spins++; }

  /* ---------- season end ---------- */
  const REP_W = [1.4, 1.25, 1.25, 1.3, 1.4];
  const kartRepW = age => age >= 14 ? 2.2 : 1.4;
  function finishSeason(G, partial) {
    const S = G.S, C = CATS[S.cat], P = player(G), tbl = standings(G);
    let pos = tbl.indexOf(P) + 1, N = tbl.length;
    if (C.crew) { const ts = []; tbl.forEach(d => { if (!ts.includes(d.team)) ts.push(d.team); }); pos = ts.indexOf(P.team) + 1; N = ts.length; }
    const q = N > 1 ? 1 - (pos - 1) / (N - 1) : 1;
    const champ = pos === 1 && !partial, ovr = ovrOf(G.stats);
    const tro = [];
    if (!partial) {
      if (C.kartWC) { if (S.euro) tro.push('Karting European Champion'); if (S.wcWin) tro.push('Karting World Champion'); }
      else if (champ) tro.push(C.titleName);
      S.trophies.forEach(t => tro.push(t));
    }
    const anyTitle = champ || (!partial && C.kartWC && (S.euro || S.wcWin));
    let earn = 0;
    if (!C.pay) earn = Math.round(salOf(G, S.cat, G.team) * (0.9 + q * 0.25) + P.w * salOf(G, S.cat, G.team) * 0.02);
    if (!partial) { const dRep = (C.tier === 0 ? kartRepW(G.age) : REP_W[C.tier]) * (q * 10 - 3.5) + (anyTitle ? 6 : 0) + Math.min(P.w, 10) * 0.15; G.rep = clamp(G.rep + dRep, 5, 100); }
    const h = { season: G.season, year: G.year, age: G.age, cat: S.cat, catName: C.name, short: C.short, team: G.team, races: P.races, wins: P.w, podiums: P.p, poles: P.pole, pts: P.pts, pos, N, ovr, trophies: tro, earn, champ: anyTitle, cost: G.deal.cost, partial: !!partial };
    G.history.push(h);
    const T = G.tot; T.races += P.races; T.wins += P.w; T.podiums += P.p; T.poles += P.pole; T.earn += earn; T.peak = Math.max(T.peak, ovr);
    tro.forEach(t => T.trophies[t] = (T.trophies[t] || 0) + 1);
    if (anyTitle) T.titles[S.cat] = (T.titles[S.cat] || 0) + 1;
    if (partial) return h;
    G.seasonsInCat++;
    G.contract = Math.max(0, G.contract - 1); G.sacked = false;
    G.buzz = Math.max(0, G.buzz - 2);
    G.last = { pos, N, q, champ: anyTitle, cat: S.cat, ovr, wins: P.w };

    const msgs = [];
    if (G.academy && C.tier >= 1 && q < 0.3 && rnd() < 0.5) { msgs.push(`${G.academy.n} drops you after a poor year.`); G.academy = null; }

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
    const show = ['f1', 'f2', 'f3', 'f4', 'indy', 'wec', 'fe', 'sf'];
    if (!show.includes(S.cat)) champs.push({ cat: C.short, who: tbl[0].name, team: tbl[0].team });
    show.forEach(c => {
      const CC = CATS[c];
      if (c === S.cat) { champs.push({ cat: CC.short, who: tbl[0].name, team: tbl[0].team }); return; }
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
    tickF1(G).forEach(r => retirees.push(r));
    const rank = Object.keys(G.tr[S.cat]).map(n => ({ n, r: Math.round(G.tr[S.cat][n]), d: Math.round(G.tr[S.cat][n]) - Math.round(G.trPrev[S.cat][n]) })).sort((a, b) => b.r - a.r);
    const rising = rank.slice().sort((a, b) => b.d - a.d).slice(0, 3).filter(x => x.d > 0);
    const falling = rank.slice().sort((a, b) => a.d - b.d).slice(0, 3).filter(x => x.d < 0);
    const regs = Object.keys(G.dyn).filter(c => CATS[c].regYears.includes(G.year + 1)).map(c => CATS[c].short);
    if (regs.length) msgs.push('New regulations next season in ' + regs.join(', ') + '. Expect the order to shuffle.');
    retirees.forEach(r => msgs.push(r.dropped ? `${r.name} (${r.age}) loses their F1 seat.` : `${r.name} (${r.age}) retires from F1.`));
    G.news = { champs, rank, rising, falling, msgs, table: tbl.slice(0, 10).map(d => ({ name: d.name, team: d.team, pts: d.pts, w: d.w, isPlayer: d.isPlayer })) };
    G.phase = 'wrap';
    return h;
  }

  /* ---------- market ---------- */
  const attract = (G, catId) => { const L = G.last, C = CATS[catId], f = catId === 'f1'; return clamp(45 * L.q + (f ? 3.2 : 1.8) * (L.ovr - C.lvl) + (f ? 0.25 : 0.35) * (G.rep - 50) + (L.champ ? 15 : 0) + (f ? 22 : 30) + (f ? G.buzz : 0), 0, 150); };
  function makeOffer(G, kind, catId, team, extra) {
    const C = CATS[catId], r = G.tr[catId][team], ros = roster(G, catId, team);
    const tm = ros.filter(n => n !== G.name)[0] || ros[0];
    const tmSkill = C.lvl + 0.4 * (r - C.lvl), ovr = ovrOf(G.stats);
    const role = ovr >= tmSkill + 2 ? 'Lead driver' : ovr >= tmSkill - 3 ? 'Equal status' : 'Second driver';
    const years = C.tier === 0 ? 1 : 1 + Math.floor(rnd() * 3);
    return Object.assign({ kind, cat: catId, team, r: Math.round(r), cost: costOf(G, catId, team), sal: salOf(G, catId, team), years, role, tm, tier: C.tier }, extra || {});
  }
  function offersFor(G, catId, A, n, excludeTeam) {
    const C = CATS[catId], res = [];
    C.teams.forEach(t => {
      const name = t[0]; if (name === excludeTeam && catId === G.cat) return;
      const P = 100 * pf(G, catId, name);
      let a = A; if (catId === 'f1' && G.academy && G.academy.f1.includes(name)) a += 25;
      if (a + gauss() * 7 >= P - 5 && affordable(G, catId, name)) res.push(name);
    });
    res.sort((a, b) => pf(G, catId, b) - pf(G, catId, a));
    let teams = res.slice(0, n);
    if (!teams.length) { const cheap = C.teams.map(t => t[0]).filter(x => !(x === excludeTeam && catId === G.cat)).sort((a, b) => pf(G, catId, a) - pf(G, catId, b)); teams = [cheap[0]]; }
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

  function buildMarket(G) {
    const L = G.last, C = CATS[G.cat], nextAge = G.age + 1;
    const M = { options: [], stuck: false, forced: false, academy: null, nextAge, note: '', roll: null };
    const stay = () => { const o = makeOffer(G, 'stay', G.cat, G.team); o.years = G.contract > 0 ? G.contract : (C.tier === 0 ? 1 : 1 + Math.floor(rnd() * 2)); return o; };
    if (nextAge >= MAX_AGE) { M.forced = true; M.note = 'Age catches up. Time to hang up the helmet.'; }
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
      const cat = G.cat, pos = L.pos, tgt = PROMO[cat];
      let promoted = false, promoCat = null;
      if (tgt) {
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
      const stuck = STUCK_CATS.includes(cat) && G.seasonsInCat >= 3 && !promoted;
      if (stuck) {
        M.stuck = true; M.note = (M.note ? M.note + ' ' : '') + `3 seasons in ${C.short} without moving up: retire or go sideways.`;
        // late call: a small extra chance of the step-up
        if (tgt) {
          const p = promoChance(G, cat, promoCat, pos, 0.35);
          if (rnd() < p) { M.options.push(...offersFor(G, promoCat, attract(G, promoCat) - 5, 2, null).map(o => Object.assign(o, { kind: 'promo' }))); M.note += ' A late call-up arrived.'; }
        }
        (LATERAL[cat] || []).forEach(lc => offersFor(G, lc, attract(G, lc), 2, null).forEach(o => M.options.push(Object.assign(o, { kind: 'lateral' }))));
      } else {
        if (!G.sacked || true) M.options.push(stay());
        M.options.push(...offersFor(G, cat, attract(G, cat), 3, G.team));
        if (G.age >= 21 && (TIER3_SIDE.includes(cat) || cat === 'f1')) {
          TIER3_SIDE.filter(c => c !== cat).sort(() => rnd() - 0.5).slice(0, 2).forEach(lc => offersFor(G, lc, attract(G, lc), 1, null).forEach(o => M.options.push(Object.assign(o, { kind: 'lateral' }))));
        }
      }
    }
    M.options = M.options.filter((o, i, a) => a.findIndex(x => x.cat === o.cat && x.team === o.team) === i);
    if (!G.academy && !M.forced && C.tier >= 1 && C.tier <= 3 && G.age <= 24 && L.q >= 0.75 && G.rep >= 40 && rnd() < 0.4) M.academy = pick(ACADEMIES);
    G.market = M; G.phase = 'market';
    return M;
  }

  function chooseOption(G, idx, trainStat, acceptAcademy) {
    const M = G.market, o = M.options[idx];
    if (!o || o.kind === 'retire') return retire(G);
    if (acceptAcademy && M.academy) { G.academy = M.academy; G.rep = Math.min(100, G.rep + 4); }
    if (G.cat === 'f1' && (o.cat !== 'f1' || o.team !== G.team)) vacateF1(G);
    G.age++; G.season++; G.year++;
    STATS.forEach(k => { if (G.train[k]) G.train[k] = R1(G.train[k] * 0.8); });
    if (trainStat) G.train[trainStat] = Math.min(4, (G.train[trainStat] || 0) + 2);
    if (G.academy) { const k = pick(STATS); G.train[k] = Math.min(4, (G.train[k] || 0) + 1); }
    setStats(G);
    if (o.cat !== G.cat) { G.seasonsInCat = 0; G.cat = o.cat; }
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
    const teams = []; G.history.forEach(h => { if (!teams.includes(h.team)) teams.push(h.team); });
    G.retire = { label, score, best, teams, age: G.age, seasons: G.history.length, cause: G.pendingEnd || null };
    return G.retire;
  }
  function endCareerNow(G) { finishSeason(G, true); return retire(G); }

  const api = { CATS, TIERS, rnd, newGame, rerollStats, rerollClub, startSeason, playRound, simToEnd, wheelList, spinWheel, skipWheel, finishSeason, buildMarket, chooseOption, retire, endCareerNow, standings, player, ovrOf, potLabel, funding, costOf, salOf, kartCat, MAX_AGE, tierOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.F1E = api;
})(typeof window !== 'undefined' ? window : globalThis);
