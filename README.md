# Grid Dynasty

An F1 career simulator. Start in karting at 7 (or join British F4 at 16 with the real 2026 grids) and climb F4, F3, F2 and F1, with lateral moves into IndyCar, WEC, Formula E, Super Formula, GT and more.

## Run it

No install, no build. Open `index.html` in any browser, or serve the folder:

    python3 -m http.server 8000   # then visit http://localhost:8000

Keep `index.html`, `f1-data.js` and `f1-engine.js` in the same folder. Your career saves in the browser's local storage.

## What's in it

- 5 talent tiers (Prospect, Talented, Late bloomer, Wonderkid, Generational) that shape your career curve
- Probabilistic promotion, retirements, academy deals and a driver market
- Two mid-season wheel spins per year with real career effects
- Evolving F1/IndyCar/WEC/Formula E car cycles with regulation resets
- Real 2026 lineups where available (F1, F2, F3, British F4, IndyCar, WEC, Formula E, Super Formula and more)

## Gameplay notes

- Pick a talent tier at the start (or leave it random) to test different career paths
- Choose Push, Balance or Coast before each race: push is faster but riskier (worse if your racecraft is low), coast is steadier with fewer DNFs
- F1 weekends include sprints and FP1 sessions, and FP1 results nudge your reputation
- Family funds pay for seats in the junior series. If they run out, only a strong record keeps sponsors around
- Red Bull juniors debut at Racing Bulls. A mid-season promotion to Red Bull is rare, a demotion is common
- Pick or randomise family wealth (poor, middle class, rich, generational wealth). Poor families can run out of money in karting unless you keep finishing top five
- Contracts: sign for 1-4 years and press Continue at the end of a season instead of re-deciding every year
- F1 rookies need time. Titles in your first two F1 seasons are very rare

## Files

- `index.html`: UI and styling
- `f1-engine.js`: game logic
- `f1-data.js`: teams, drivers and series data
