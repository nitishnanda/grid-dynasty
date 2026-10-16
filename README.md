# Apex Ladder

An F1 career simulator. Start in karting at 7 (or join British F4 at 16 with the real 2026 grids) and climb F4, F3, F2 and F1, with lateral moves into IndyCar, WEC, Formula E, Super Formula, GT and more.

## Run it

No install, no build. Open `index.html` in any browser, or serve the folder:

    python3 -m http.server 8000   # then visit http://localhost:8000

Keep `index.html`, `f1-data.js` and `f1-engine.js` in the same folder. Your career saves in the browser's local storage.

## What's in it

- 5 talent tiers (Prospect, Talented, Late bloomer, Wonderkid, Generational) that shape your career curve
- Probabilistic promotion, retirements, academy deals and a driver market
- Two mid-season paddock briefings (card draws) per year with real career effects
- Evolving F1/IndyCar/WEC/Formula E car cycles with regulation resets
- Real 2026 lineups where available (F1, F2, F3, British F4, IndyCar, WEC, Formula E, Super Formula and more)

## Install on your phone

Open the Pages link in Safari (iPhone) or Chrome (Android), then Share, Add to Home Screen. It runs fullscreen like an app and works offline.

## Gameplay notes

- Pick a talent tier at the start (or leave it random) to test different career paths
- Choose Push, Balance or Coast before each race: push is faster but riskier (worse if your racecraft is low), coast is steadier with fewer DNFs
- F1 weekends include sprints. FP1 only appears as an academy outing or an F1 stand-in
- Qualifying and races show time gaps (to the leader, or the margin over P2 if you win). Gaps are scaled per series from real-world spreads and vary by weekend, wet weather, safety cars and the regulation era
- Karting weekends are a heat plus a final, over 10-11 rounds (the OK and OK-Junior seasons follow the WSK / European / World calendar)
- Family funds pay for seats in the junior series. If they run out, only a strong record keeps sponsors around
- Red Bull juniors debut at Racing Bulls. A mid-season promotion to Red Bull is rare, a demotion is common
- Pick or randomise family wealth (poor, middle class, rich, old money). Poor families can run out of money in karting unless you keep finishing top five
- Contracts: sign for 1-4 years and press Continue at the end of a season instead of re-deciding every year
- F1 rookies need time. Titles in your first two F1 seasons are very rare

## Calibration (F1)

F1 runs on a lap-time model fitted to the F1DB open database (every result, qualifying lap and retirement 2010-2026):

- Driver ratings for the 2026 grid come from a driver + team-season model on 6,890 qualifying laps (1 rating point is about 0.035 s a lap). Rookies carry a fitted experience penalty for their first three seasons.
- Car pace, track-by-track fit, knockout track evolution, one-lap noise and its heavy tail, race-day form, grid-position value, safety cars, grid penalties, and mechanical vs incident DNFs (by regulation age and grid slot) are all set from the data.
- The AI driver market (rookies, drops, retirements, transfers, debut ages, career lengths) is tuned to F1DB seat-change statistics.
- Validation targets the sim is scored against include pole-to-win rate (52-56%), front-row and top-3 win rates, mean finish by grid slot, race gaps, qualifying gaps by position, teammate gaps, DNF rates, the champion's car rank, wins by car rank and the title-margin split.

Data: F1DB (https://github.com/f1db/f1db), CC BY 4.0.

## Files

- `index.html`: UI and styling
- `f1-engine.js`: game logic
- `f1-data.js`: teams, drivers and series data
