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
- Race pace is fitted to lap-by-lap timing from OpenF1 (2023-2026) and Jolpica (2022). The race-pace spread behind the leaders (about 1.9% of a lap for the P10 car in a reset year, about 1.3% after that), teammate race-pace gaps, how much race day reshuffles the qualifying order, safety-car rates and timing, slow stops and time penalties all come from that data. One-lap gaps converge as the rules mature. A dominant car also gets a small one-lap edge, so it locks out the front row more often.
- Retiring in the last 10% of a race still gets you classified, laps down, as in real F1.
- The 2026 start is fitted team by team to the real 2026 season so far (17 rounds): each team's strength, its race pace against its qualifying pace, and its reliability. Mean qualifying position, mean finish and points per race match real 2026 for all eleven teams (for example Racing Bulls score points in about 62% of starts and Alpine in about 49%, as in real life). The race-pace edge fades by half each winter and a rule reset wipes it.
- Wet races: about 7.5% of grands prix are properly wet (OpenF1 2023-26: 6% start on inters, 18% see any rain at all).
- F1 team moves (F1DB 2010-25): about 10% of drivers at the top three teams change team a year, 26% at teams ranked 4-6 and 31% lower down. Reigning champions almost never move.
- After F1, offers depend on age: young leavers go to Formula E and WEC, early thirties to IndyCar and DTM, veterans to WEC and IMSA, almost nobody to NASCAR or Supercars (54 drivers matched to Wikipedia series standings).
- Retirement rates per series come from the Ret/DNF cells of the Wikipedia results grids: about 12% of starts in F4/FRECA/F3, 17% in F2, 14% in DTM, 15% in Formula E, 7% in Supercars.
- Junior seat costs follow published estimates: F4 about 100-250k euros, FRECA 350k-1M, F3 about $1.2M, F2 about $3M.
- F1 pay is fitted to reported base salaries of the 2026 grid (2014-2026, in GBP). It rises with F1 experience, last season's championship position, the team and titles; rookies sign for about half.
- The junior ladder follows Wikipedia standings for GP2/F2 (2005-2025), GP3/F3, Formula Renault Eurocup/FRECA and Italian and British F4. That covers the chance of a step up by final position (an F2 champion reaches F1 the next year about 60% of the time, P2-3 about 40%, P6-10 about 5%), the rookie learning year, and how dominant champions are. F2 and F3 champions cannot defend their title. Every season debrief ends with a report card: season in context (result against what the car should deliver), car extraction (against the team-mate, adjusted for the rating gap), one-lap pace, racecraft, consistency, progress through the year and clean driving, each with a grade and a one-line explanation. When a step up does not come, the contract desk now says why (the grid is already locked, teams wanted someone younger, the seats went to academy drivers). An F2 champion or podium finisher without an F1 seat is offered a reserve contract with an F1 team while racing elsewhere, which puts them first in line for next winter's vacancies. F4 graduates step up to FRECA first (about half of F4 champions go straight to F3), as most real F4 drivers do. The step-up odds are tuned so simulated careers reproduce the real next-season rates for each step.
- Ageing follows the F1DB curve for everyone, including the player: flat to 28, then slower each year from 29.
- The senior series (IndyCar, NASCAR, Formula E, Supercars, DTM, WEC, IMSA) are fitted to Wikipedia season standings 2008-2025: how often the champion repeats (IndyCar ~25%, NASCAR almost never, Supercars ~40%), the champion's share of wins, how many drivers win in a season, and how tight the top of the table is. Every winter each of those series reshuffles its line-ups: about 20% new faces and about 30% of drivers changing team, skewed towards the faster cars (Wikipedia entry lists 2008-2025). Series you are not racing in used to freeze their line-ups, which is why the same names kept winning titles. Past champions stay in their seats longer and can win again after a gap, as real stars do (about 40% of IndyCar and NASCAR champions had won before).
- Validation targets the sim is scored against include pole-to-win rate (52-56%), front-row and top-3 win rates, mean finish by grid slot, race gaps, qualifying gaps by position, teammate gaps, DNF rates, the champion's car rank, wins by car rank and the title-margin split.

Data: F1DB (https://github.com/f1db/f1db), CC BY 4.0; lap timing, stints and race control from OpenF1 (https://openf1.org) and the Jolpica F1 API (https://api.jolpi.ca).

## Files

- `index.html`: UI and styling
- `f1-engine.js`: game logic
- `f1-data.js`: teams, drivers and series data
