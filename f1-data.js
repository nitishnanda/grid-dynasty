/* Apex Ladder – static data: nationalities, categories, real teams/drivers (2026 snapshot) */
(function (root) {
  const NATS = {
    GB: { f: '🇬🇧', n: 'England / GB', first: ['Oliver','Jack','Harry','Callum','Freddie','Theo','Luke','Max'], last: ['Hartley','Whitmore','Calloway','Prescott','Ashworth','Thornton','Barlow','Fenwick'] },
    IT: { f: '🇮🇹', n: 'Italy', first: ['Luca','Matteo','Andrea','Marco','Giulio','Lorenzo','Davide','Enzo'], last: ['Ferretti','Bellandi','Rossetti','Moretti','Cattaneo','Valenti','Bruni','Sartori'] },
    DE: { f: '🇩🇪', n: 'Germany', first: ['Jonas','Lukas','Felix','Moritz','Tim','Niklas','Paul','Leon'], last: ['Brandt','Vogel','Keller','Hofmann','Richter','Lang','Becker','Sommer'] },
    FR: { f: '🇫🇷', n: 'France', first: ['Hugo','Louis','Theo','Nathan','Enzo','Arthur','Lucas','Maxime'], last: ['Laurent','Dubois','Marchand','Girard','Fontaine','Roche','Perrin','Chevalier'] },
    ES: { f: '🇪🇸', n: 'Spain', first: ['Pablo','Mateo','Hugo','Alvaro','Diego','Iker','Jorge','Dani'], last: ['Navarro','Ortega','Castillo','Herrera','Molina','Vidal','Serrano','Cabrera'] },
    NL: { f: '🇳🇱', n: 'Netherlands', first: ['Daan','Sem','Milan','Thijs','Bram','Luuk','Noah','Finn'], last: ['de Vries','van Dijk','Bakker','Visser','Smit','Mulder','Jansen','Hendriks'] },
    BR: { f: '🇧🇷', n: 'Brazil', first: ['Gabriel','Pedro','Lucas','Rafael','Thiago','Enzo','Caio','Felipe'], last: ['Souza','Almeida','Carvalho','Teixeira','Moreira','Pires','Barros','Campos'] },
    US: { f: '🇺🇸', n: 'USA', first: ['Cole','Tyler','Mason','Logan','Hunter','Colton','Jake','Ryan'], last: ['Mitchell','Bishop','Hayes','Sullivan','Gardner','Wells','Crawford','Dalton'] },
    JP: { f: '🇯🇵', n: 'Japan', first: ['Haruki','Ren','Sota','Kaito','Yuto','Riku','Takumi','Daiki'], last: ['Sato','Kobayashi','Nakamura','Hayashi','Ishikawa','Ogawa','Fujita','Tanaka'] },
    AU: { f: '🇦🇺', n: 'Australia', first: ['Jacob','Noah','Liam','Mitch','Tom','Will','Archie','Zac'], last: ['Gallagher','Kelly','Brennan','Hollis','Webb','Mercer','Doyle','Tate'] },
    IN: { f: '🇮🇳', n: 'India', first: ['Arjun','Rohan','Kabir','Aditya','Vihaan','Dev','Aarav','Karan'], last: ['Mehta','Sharma','Kapoor','Reddy','Chopra','Iyer','Bhatia','Nair'] },
    MX: { f: '🇲🇽', n: 'Mexico', first: ['Santiago','Mateo','Diego','Emiliano','Sebastian','Leo','Rodrigo','Alonso'], last: ['Aguilar','Ibarra','Salinas','Cortez','Mendoza','Rojas','Zamora','Villarreal'] },
    SE: { f: '🇸🇪', n: 'Sweden / Nordics', first: ['Oskar','Elias','Viktor','Axel','Emil','Linus','Noel','Kasper'], last: ['Lindqvist','Bergstrom','Nyberg','Holm','Strand','Dahl','Falk','Sjoberg'] },
  };

  // points tables
  const PF1 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const PSPR = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const PF2S = [10, 8, 6, 5, 4, 3, 2, 1];
  const PKART = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const PKARTH = [10, 8, 6, 5, 4, 3, 2, 1];
  const KRF = [{ n: 'Heat', pts: PKARTH, grid: 'q' }, { n: 'Final', pts: PKART, grid: 'prev' }];
  const WSK = ['WSK Champions Cup R1', 'WSK Champions Cup R2', 'Super Master R1', 'Super Master R2', 'Super Master R3', 'Super Master R4', 'Euro R1', 'Euro R2', 'Euro R3', 'Euro R4', 'World Championship'];
  const PNAS = [40, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];   // NASCAR Cup race points
  const PSTG = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];                                                                                                          // NASCAR stage points
  const PIMSA = [350, 320, 300, 280, 260, 250, 240, 230, 220, 210, 200, 190, 180, 170, 160, 150, 140, 130, 120, 110];                                      // IMSA
  const PSUP = [150, 138, 129, 120, 111, 102, 96, 90, 84, 78, 72, 69, 66, 63, 60, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30];                                 // Supercars
  const PIND = [50, 40, 35, 32, 30, 28, 26, 24, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 5, 5, 5, 5, 5];

  const KB = ['Tony Kart Racing Team', 'Kart Republic', 'Birel ART Racing', 'CRG Racing', 'Parolin Motorsport', 'Ricciardo Kart', 'Exprit Racing', 'LN Kart Racing'];
  const KO = [5, 4, 3, 1, 0, -1, -3, -5];
  const kteams = () => KB.map((n, i) => [n, KO[i], '']);
  const R = n => Array.from({ length: n }, (_, i) => 'Round ' + (i + 1));

  const CATS = {
    kart1: { id: 'kart1', lap: 40, qK: 0.052, rK: 0.1615, name: 'Mini Kart · Regional', short: 'Regional Karting', tier: 0, lvl: 46, rounds: 10, rpr: 2, dpt: 3, pay: true, cost: [4, 12], titleName: 'Regional Karting Champion', sigK: 1.3, eqK: 1.8, dnfK: 1.2, events: [{ n: 'Regional Championship', from: 0, to: 5, main: true, title: 'Regional Karting Champion' }, { n: 'Club Cup', from: 6, to: 7, title: 'Club Cup winner' }, { n: 'Winter Trophy', from: 8, to: 9, title: 'Winter Trophy winner' }],
      rf: KRF, names: R(10), teams: kteams() },
    kart2: { id: 'kart2', lap: 42, qK: 0.0866, rK: 0.2479, name: 'Cadet / Mini · National', short: 'National Karting', tier: 0, lvl: 55, rounds: 10, rpr: 2, dpt: 3, pay: true, cost: [10, 28], titleName: 'National Karting Champion', sigK: 1.3, eqK: 1.8, dnfK: 1.2, events: [{ n: 'National Championship', from: 0, to: 5, main: true, title: 'National Karting Champion' }, { n: 'Regional Cup', from: 6, to: 7, title: 'Regional Cup winner' }, { n: 'Winter Cup', from: 8, to: 9, title: 'Winter Cup winner' }],
      rf: KRF, names: R(10), teams: kteams() },
    kart3: { id: 'kart3', lap: 46, qK: 0.1302, rK: 0.254, name: 'OK-Junior · European / World', short: 'OK-Junior', tier: 0, lvl: 61, rounds: 11, rpr: 2, dpt: 3, pay: true, cost: [25, 70], titleName: 'Karting European Champion', sigK: 1.6, eqK: 1.8, dnfK: 1.7, events: [{ n: 'WSK Champions Cup', from: 0, to: 1, title: 'WSK Champions Cup winner' }, { n: 'WSK Super Master Series', from: 2, to: 5, title: 'WSK Super Master champion' }, { n: 'European Championship', from: 6, to: 9, main: true, title: 'Karting European Champion' }, { n: 'World Championship', from: 10, to: 10, wc: true, title: 'Karting World Champion' }],
      rf: KRF, names: WSK, kartWC: true, teams: kteams() },
    kart4: { id: 'kart4', lap: 46, qK: 0.1515, rK: 0.2496, name: 'OK · European / World', short: 'OK Karting', tier: 0, lvl: 67, rounds: 11, rpr: 2, dpt: 3, pay: true, cost: [40, 110], titleName: 'Karting European Champion', sigK: 1.6, eqK: 1.8, dnfK: 1.7, events: [{ n: 'WSK Champions Cup', from: 0, to: 1, title: 'WSK Champions Cup winner' }, { n: 'WSK Super Master Series', from: 2, to: 5, title: 'WSK Super Master champion' }, { n: 'European Championship', from: 6, to: 9, main: true, title: 'Karting European Champion' }, { n: 'World Championship', from: 10, to: 10, wc: true, title: 'Karting World Champion' }],
      rf: KRF, names: WSK, kartWC: true, teams: kteams() },

    f4: { id: 'f4', lap: 75, qK: 0.1403, rK: 1.0799, name: 'British F4', short: 'F4', tier: 1, wS: 0.42, sigK: 1.45, fitK: 4, lvl: 68, rounds: 8, rpr: 3, dpt: 4, pay: true, cost: [90, 230], titleName: 'F4 Champion',
      rf: [{ n: 'R1', pts: PF1, grid: 'q' }, { n: 'R2', pts: PF1, grid: 'rev6' }, { n: 'R3', pts: PF1, grid: 'prev' }],
      names: ['Donington Park', 'Brands Hatch Indy', 'Oulton Park', 'Thruxton', 'Snetterton', 'Silverstone', 'Croft', 'Brands Hatch GP'],
      teams: [
        ['Rodin Motorsport', 4, 'Dries Van Langendonck|Alfie Slater|Chiara Bättig|Theo Palmer'],
        ['Fortec Motorsport', 3, 'Kit Belofsky|Cash Felber|Roman Felber|Ethan Carney'],
        ['Argenti Motorsport', 2, 'Ethan Jeff-Hall|León Hedfors|Vegard Klemetsen|Sun Anzhe'],
        ['Xcel Motorsport', 1, 'Cole Hewetson|Mate Kobakhidze|Jaber Alsabah|Jackson Wolny'],
        ['JHR Developments', 0, 'Lewis Wherrell|Timo Jüngling|Cameron Nelson|Haarni Sadiq'],
        ['Virtuosi Racing', -1.5, 'Joseph Smith|Jarrett Clark|George Proudford-Nalder'],
        ['Chris Dittmann Racing', -3.5, 'Tommy Harfield|Henry Mercier'],
      ] },
    f3: { id: 'f3', lap: 90, qK: 0.1029, rK: 1.3563, name: 'FIA Formula 3', short: 'F3', tier: 2, wS: 0.5, sigK: 1.15, fitK: 4, lvl: 73, rounds: 10, rpr: 2, dpt: 3, pay: true, cost: [450, 950], titleName: 'F3 Champion',
      rf: [{ n: 'Sprint', pts: PSPR, grid: 'rev10' }, { n: 'Feature', pts: PF1, grid: 'q' }],
      names: ['Melbourne', 'Sakhir', 'Imola', 'Monaco', 'Barcelona', 'Spielberg', 'Silverstone', 'Spa', 'Budapest', 'Monza'],
      teams: [
        ['Campos Racing', 4, 'Ugo Ugochukwu|Théophile Naël|Ernesto Rivera'],
        ['Prema Racing', 3.5, 'James Wharton|Louis Sharp|Enzo Deligny'],
        ['Trident', 2.5, 'Noah Strømsted|Freddie Slater|Matteo De Palo'],
        ['ART Grand Prix', 2, 'Taito Kato|Maciej Gładysz|Kanato Le'],
        ['MP Motorsport', 1.5, 'Mattia Colnaghi|Tuukka Taponen|Alessandro Giusti'],
        ['Hitech TGR', 0.5, 'Fionn McLaughlin|Michael Shin|Jin Nakamura'],
        ['Rodin Motorsport', -0.5, 'Brando Badoer|Christian Ho|Pedro Clerot'],
        ['Van Amersfoort Racing', -1.5, 'Jesse Carrasquedo'],
        ['AIX Racing', -2.5, 'Brad Benavides|Fernando Barrichello|Yevan David'],
        ['DAMS', -3.5, ''],
      ] },
    f2: { id: 'f2', lap: 92, qK: 0.1067, rK: 1.8077, name: 'FIA Formula 2', short: 'F2', tier: 3, wS: 0.55, sigK: 1.1, fitK: 4, lvl: 78, rounds: 14, rpr: 2, dpt: 2, pay: true, cost: [1400, 2900], titleName: 'F2 Champion',
      rf: [{ n: 'Sprint', pts: PF2S, grid: 'rev10' }, { n: 'Feature', pts: PF1, grid: 'q' }],
      names: ['Melbourne', 'Sakhir', 'Jeddah', 'Imola', 'Monaco', 'Barcelona', 'Spielberg', 'Silverstone', 'Spa', 'Budapest', 'Monza', 'Baku', 'Lusail', 'Yas Marina'],
      teams: [
        ['Prema Racing', 4, 'Sebastián Montoya|Mari Boya'],
        ['ART Grand Prix', 3.5, 'Kush Maini|Tasanapol Inthraphuvasak'],
        ['Campos Racing', 3, 'Noel León|Nikola Tsolov'],
        ['Hitech', 2, 'Ritomo Miyata|Colton Herta'],
        ['DAMS Lucas Oil', 1.5, 'Dino Beganovic|Roman Bilinski'],
        ['Invicta Racing', 1, 'Rafael Câmara|Joshua Dürksen'],
        ['MP Motorsport', 0, 'Gabriele Minì|Oliver Goethe'],
        ['Trident', -0.5, 'Laurens van Hoepen|John Bennett'],
        ['Rodin Motorsport', -1.5, 'Martinius Stenshorne|Alexander Dunne'],
        ['AIX Racing', -2.5, 'Emerson Fittipaldi|Cian Shields'],
        ['Van Amersfoort Racing', -3.5, 'Nicolás Varrone|Rafael Villagómez'],
      ] },
    f1: { id: 'f1', lap: 90, qK: 0.0857, qMap: [[0, 0], [2.5, 0.21], [6.8, 0.5], [15.5, 0.82], [29.4, 2.25]], rK: 3.15, name: 'Formula 1', short: 'F1', tier: 4, lvl: 84, rounds: 24, rpr: 1, dpt: 2, pay: false, sal: [700, 13000], titleName: 'F1 World Champion',
      rf: [{ n: 'Grand Prix', pts: PF1, grid: 'q' }],
      names: ['Australia', 'China', 'Japan', 'Bahrain', 'Saudi Arabia', 'Miami', 'Canada', 'Monaco', 'Barcelona', 'Austria', 'Great Britain', 'Belgium', 'Hungary', 'Netherlands', 'Italy', 'Madrid', 'Azerbaijan', 'Singapore', 'United States', 'Mexico City', 'Brazil', 'Las Vegas', 'Qatar', 'Abu Dhabi'],
      special: { 7: 'Monaco GP win' }, sprints: [1, 5, 6, 10, 13, 17], sigK: 0.8, dnfK: 0.75, spread: 1.65, wS: 0.26, sMax: 13,
      // lap-time model calibrated on F1DB 2010-2026 (see README "Calibration"): everything in % of a lap unless noted
      time: {
        beta: 0.096,          // % of lap per car-rating point at a normal stage of the rule cycle (x gapEra: ~0.14 in a reset year, ~0.07 late in a cycle)
        knee: 3, tail: 0.35,  // qualifying: car gap beyond `knee` points counts `tail` x gapEra^2.5 as much (the field converges at the back)
        raceKnee: 4, raceBack: 2.0, raceBackPow: 0.7, raceReset: 1.7,   // race: beyond `raceKnee` a car loses raceBack x beta x (gap - knee)^raceBackPow, x raceReset in a reset year
                              // (OpenF1 2023-26 race pace: P10 car ~1.85% off in a reset year, ~1.3% after that; teammates ~0.29% apart)
        domQ: 0.3,            // a dominant car's extra one-lap edge (front-row lockouts: ~0.5 in dominant seasons)
        dPt: 0.039,           // % of lap per driver-rating point (fitted scale: 25.7 points per 1%)
        trackSd: 0.2,        // team-by-track car fit, re-drawn every weekend
        tfRace: 0.5,          // how much of the track fit carries into race pace
        raceTeamSd: 0.1,      // plus race-day-only car form (tyres, strategy, set-up)
        qSd: 0.22,            // one driver's one-lap execution noise
        badP: 0.14, badMean: 0.55,   // a scrappy lap: traffic, mistake, red flag (heavy tail seen in teammate gaps)
        evoQ1: 0.7, evoQ2: 0.35,      // fastest Q1 / Q2 lap vs fastest Q3 lap (track evolution, F1DB medians 2010-2026)
        formSd: 4.0,          // season form, rating points (0.145% of a lap, F1DB REML estimate)
        pen: [3.8, 3.2, 1.8, 0],   // rookie penalty in rating points for F1 seasons 1, 2, 3, 4+
        rookieRace: 2,        // AI rookies race worse than they qualify (F1DB: rookies win ~43% of quali duels but take only ~33% of the points)
        domP: 0.25, domEnd: 0.2, domBoost: 3,   // share of rule resets that produce a dominant car, chance a dominant era ends each year, its edge in car points
        devSd: 0.3, devCap: 2.5,   // in-season upgrade race between the top cars (car points per round, and its cap)
        laps: 57, sprintLaps: 19,
        rSd: 0.15,            // race-day pace noise per driver (OpenF1: driver part of the race-vs-quali reshuffle ~0.24%)
        gridS: 1.2, gridS2: 0.02, poleS: 2.5,   // seconds lost per grid slot (+ traffic for cars starting deep), plus the clean-air / first-corner value of pole
        raceVsQuali: 2.0,     // AI drivers: stable race-craft vs one-lap difference, rating points
        startSd: 4.5,         // first-lap / strategy chaos, seconds
        scP: 0.45, scSprint: 0.3, restartSd: 2.0,   // safety-car races and restart scatter (OpenF1 2023-26: SC 48% of GPs plus 9% red flags, 35% of sprints)
        scEarly: 0.3,               // share of safety cars in the opening laps, which erase almost none of the final gaps (real median: 40% of the gaps erased)
        cruiseAt: 4, cruiseK: 0.6,   // a leader more than ~4 s clear backs off: only 60% of the extra margin shows at the flag
        passS: 2.5,                  // seconds to pass each slower car that started ahead (track position matters more than a fixed per-slot cost)
        lossP: 0.26, lossMax: 12, dmgP: 0.04,   // per driver per race: a slow stop or time penalty costing 4-16 s (OpenF1: ~0.14 slow stops and ~0.13 time penalties a race); dmg: first-lap damage or a drive-through, 15-60 s
        lateP: 0.02,                // per driver per race: retires in the last 10% of the race but is still classified, laps down
        penP: 0.06,                 // per driver per race: a grid penalty (5 or 10 places, or the back of the grid)
        inc: [2.1, 3.0, 4.4, 5.1, 4.6],   // incident DNF % by grid bucket P1-3, 4-6, 7-10, 11-15, 16+ (F1DB 2010-2025, scaled to the 2022-25 level)
        mech: [12, 6.0, 4.2, 3.4],      // mechanical DNF % by regulation age 0, 1, 2, 3+ (F1DB)
      },
      teams: [
        ['Mercedes', 7, 'George Russell|Kimi Antonelli'],
        ['McLaren', 3, 'Lando Norris|Oscar Piastri'],
        ['Ferrari', 4.2, 'Charles Leclerc|Lewis Hamilton'],
        ['Red Bull Racing', 2.4, 'Max Verstappen|Isack Hadjar'],
        ['Williams', -8.5, 'Alex Albon|Carlos Sainz'],
        ['Racing Bulls', -4, 'Liam Lawson|Arvid Lindblad'],
        ['Aston Martin', -11, 'Fernando Alonso|Lance Stroll'],
        ['Alpine', -4.6, 'Pierre Gasly|Franco Colapinto'],
        ['Haas', -6, 'Esteban Ocon|Oliver Bearman'],
        ['Audi', -7, 'Nico Hülkenberg|Gabriel Bortoleto'],
        ['Cadillac', -12, 'Sergio Pérez|Valtteri Bottas'],
      ],
    },

    /* lateral categories (real team names; drivers partly real, rest generated) */
    frec: { id: 'frec', lap: 85, qK: 0.11, rK: 1.3952, name: 'Formula Regional Europe', short: 'FRECA', tier: 1, lvl: 70, rounds: 10, rpr: 2, dpt: 3, pay: true, cost: [350, 720], titleName: 'FRECA Champion',
      rf: [{ n: 'R1', pts: PF1, grid: 'q' }, { n: 'R2', pts: PF1, grid: 'rev6' }],
      names: ['Monza', 'Misano', 'Paul Ricard', 'Spa', 'Hungaroring', 'Imola', 'Zandvoort', 'Barcelona', 'Mugello', 'Red Bull Ring'],
      teams: [
        ['Prema Racing', 4, ''],
        ['R-ace GP', 3, 'Rashid Al-Dhaheri'],
        ['ART Grand Prix', 2.5, 'Matteo Giaccardi'],
        ['Trident Motorsport', 2, 'Kai Daryanani|Luka Sammalisto|Andrija Kostic|Maximilian Popov', 4],
        ['MP Motorsport', 1, ''],
        ['Rodin Motorsport', 0, ''],
        ['Van Amersfoort Racing', -0.5, 'Dion Gowda|Andrea Dupé|Francisco Macedo'],
        ['G4 Racing', -1.5, ''],
        ['RPM', -2, 'Miguel Costa|Giovanni Maschio|Jan Przyrowski'],
        ['CL Motorsport', -3, ''],
      ] },
    gt4: { id: 'gt4', lap: 105, qK: 0.09, rK: 3.0, name: 'GT4 European Series', short: 'GT4', tier: 1, lvl: 66, rounds: 12, rpr: 1, dpt: 2, pay: true, crew: true, cost: [90, 210], titleName: 'GT4 Champion',
      rf: [{ n: 'Race', pts: PF1, grid: 'q' }], names: ['Monza', 'Misano', 'Spa', 'Paul Ricard', 'Hockenheim', 'Zandvoort', 'Nürburgring', 'Barcelona', 'Imola', 'Mugello', 'Hungaroring', 'Valencia'],
      teams: [
        ['SR Motorsport #111', 3, ''],
        ['Borusan Otomotiv Motorsport #12', 2.5, 'Gabriele Piana|Thomas Rackl'],
        ['Comtoyou Racing', 2, ''],
        ['Racing Spirit of Léman', 1, ''],
        ['Elite Motorsport with Entire Race Engineering', 0.5, ''],
        ['NM Racing Team', -1, ''],
        ['Speedy Motorsport', -2.5, ''],
      ] },
    sfl: { id: 'sfl', lap: 78, qK: 0.0789, rK: 1.0873, name: 'Super Formula Lights', short: 'SF Lights', tier: 2, lvl: 71, rounds: 14, rpr: 1, dpt: 2, pay: true, cost: [150, 360], titleName: 'Super Formula Lights Champion',
      rf: [{ n: 'Race', pts: PF1, grid: 'q' }], names: ['Fuji', 'Suzuka', 'Motegi', 'Autopolis', 'Sugo', 'Okayama', 'Suzuka II', 'Fuji II', 'Motegi II', 'Autopolis II', 'Sugo II', 'Okayama II', 'Fuji III', 'Suzuka III'],
      teams: [
        ['TOM\'S', 4, 'Kiyoshi Umegaki|Oscar Wurz|Akshay Bohra|Tokiya Suzuki', 4],
        ['B-Max Racing Team', 3, 'Evan Giltaire'],
        ['Toda Racing', 2, ''],
        ['LM corsa', 1, 'Kenta Kumagai'],
        ['Rn-sports', 0.5, ''],
        ['Buzz Racing', -1, ''],
        ['Hitotsuyama Racing', -2, ''],
        ['Modulo Nakajima', -3, ''],
      ] },
    nxt: { id: 'nxt', lap: 62, qK: 0.0918, rK: 1.0671, name: 'Indy NXT', short: 'Indy NXT', tier: 2, lvl: 73, rounds: 14, rpr: 1, dpt: 3, pay: true, cost: [500, 1150], titleName: 'Indy NXT Champion',
      rf: [{ n: 'Race', pts: PF1, grid: 'q' }], names: ['St. Petersburg', 'Barber', 'Indianapolis GP', 'Road America', 'Mid-Ohio', 'Iowa', 'Toronto', 'Laguna Seca', 'Portland', 'Milwaukee', 'Nashville', 'Gateway', 'Detroit', 'Long Beach'],
      teams: [
        ['Andretti Global', 4, 'Max Taylor|Lochie Hughes|Seb Murray'],
        ['Chip Ganassi Racing', 3, 'Niels Koolen|Bryce Aron|James Roe|Carson Etter', 4],
        ['HMD Motorsports', 2, 'Jack Beeton|Enzo Fittipaldi|Salvador de Alba|Tymek Kucharczyk', 4],
        ['ABEL Motorsports', 1, 'Max Garcia|Jordan Missig|Myles Rowe|Colin Kaminsky', 4],
        ['Cusick Morgan Motorsports', 0, 'Juan Manuel Correa|Nicolas Stati', 2],
        ['Juncos Hollinger Racing', -1.5, '', 2],
        ['Cape Motorsports', -2.5, 'Nikita Johnson', 2],
      ] },
    gt3: { id: 'gt3', lap: 115, qK: 0.0909, rK: 3.5312, name: 'GT World Challenge Europe', short: 'GT3', tier: 2, lvl: 73, rounds: 12, rpr: 1, dpt: 3, pay: true, crew: true, cost: [200, 520], titleName: 'GT3 Champion',
      rf: [{ n: 'Race', pts: PF1, grid: 'q' }], names: ['Paul Ricard', 'Monza', 'Brands Hatch', 'Spa 24h', 'Nürburgring', 'Misano', 'Zandvoort', 'Barcelona', 'Hockenheim', 'Imola', 'Valencia', 'Mugello'],
      teams: [
        ['Team WRT #32', 4, 'Charles Weerts|Sheldon van der Linde|Kelvin Pepper'],
        ['AF Corse', 3.5, ''],
        ['Mercedes-AMG Team Verstappen Racing', 3, ''],
        ['Mercedes-AMG Team GetSpeed', 3, ''],
        ['Mercedes-AMG Team Mann-Filter', 2.5, ''],
        ['Winward Racing #48', 2, 'Luca Stolz|Maro Engel|Lucas Auer'],
        ['Walkenhorst Motorsport', 0.5, 'Christian Krognes|Henrique Chaves|Jamie Day'],
        ['Kessel Racing', 0, 'Dustin Blattner|Dennis Marschall|Lorenzo Patrese'],
        ['HRT Ford Racing', -0.5, 'Arjun Maini'],
        ['Oman Racing by Century Motorsport', -2, 'Ahmad Al Harthy|Calan Williams|Javier Sagrera'],
        ['Ecurie Ecosse Blackthorn', -2.5, 'Jonny Adam|Giacomo Petrobelli|Lorcan Hanafin'],
        ['JMW Motorsport', -3, 'Hunter Abbott|Rolf Ineichen|Tim Heinemann'],
      ] },
    sf: { id: 'sf', lap: 75, qK: 0.0977, rK: 1.864, name: 'Super Formula', short: 'Super Formula', tier: 3, lvl: 77, rounds: 9, rpr: 2, dpt: 2, pay: false, sal: [120, 700], titleName: 'Super Formula Champion',
      rf: [{ n: 'R1', pts: PF1, grid: 'q' }, { n: 'R2', pts: PF1, grid: 'rev6' }], names: ['Motegi', 'Fuji', 'Suzuka', 'Autopolis', 'Sugo', 'Okayama', 'Fuji II', 'Motegi II', 'Suzuka II'],
      teams: [
        ['Team Mugen', 4, 'Ayumu Iwasa|Tomoki Nojiri'],
        ['Vantelin Team TOM\'S', 3.5, 'Sho Tsuboi|Sacha Fenestraz'],
        ['Docomo Team Dandelion Racing', 2, 'Tadasuke Makino|Kakunoshin Ohta'],
        ['Realize Kondo Racing', 2, 'Luke Browning|Ukyo Sasahara'],
        ['Team Impul', 1.5, 'Zak O\'Sullivan'],
        ['TGMGP TGR-DC', 1, 'Kamui Kobayashi|Rikuto Kobayashi'],
        ['KCMG', 0.5, 'Kenta Yamashita|Seita Nonaka'],
        ['Ponos Nakajima Racing', 0, 'Ren Sato|Igor Omura Fraga'],
        ['Team Goh', -0.5, 'Charlie Wurz', 1],
        ['B-Max Racing', -1.5, 'Yuto Nomura'],
        ['Cerumo INGING', -2, ''],
        ['Hazama Ando Triple Tree Racing', -2.5, 'Juju Noda', 1],
        ['Buzz MK Racing', -3, 'Roman Staněk', 1],
        ['DELiGHTWORKS Racing', -3.5, 'Nobuharu Matsushita', 1],
      ] },
    indy: { id: 'indy', champComeback: 0.55, skSd: 2.7, sigK: 1.15, champT: 3.5, champRep: 0.7, champDrvRep: 0.2, lap: 65, qK: 0.0721, rK: 2.6551, name: 'IndyCar Series', short: 'IndyCar', tier: 3, lvl: 79, rounds: 17, rpr: 1, dpt: 2, pay: false, sal: [250, 6000], titleName: 'IndyCar Champion',
      rf: [{ n: 'Race', pts: PIND, grid: 'q' }], special: { 5: 'Indy 500 win' },
      names: ['St. Petersburg', 'Phoenix', 'Long Beach', 'Barber', 'Indianapolis GP', 'Indianapolis 500', 'Detroit', 'Road America', 'Mid-Ohio', 'Toronto', 'Iowa', 'Laguna Seca', 'Portland', 'Milwaukee', 'Nashville', 'Gateway', 'Markham'],
      teams: [
        ['Chip Ganassi Racing', 4.5, 'Alex Palou|Scott Dixon|Kyffin Simpson', 3],
        ['Team Penske', 4, 'Josef Newgarden|Scott McLaughlin'],
        ['Arrow McLaren', 3, 'Pato O\'Ward|Christian Lundgaard|Nolan Siegel', 3],
        ['Andretti Global', 2.5, 'Will Power|Kyle Kirkwood|Marcus Ericsson', 3],
        ['Meyer Shank Racing', 0.5, 'Felix Rosenqvist|Marcus Armstrong'],
        ['Rahal Letterman Lanigan', -1, 'Graham Rahal|Louis Foster|Mick Schumacher', 3],
        ['Ed Carpenter Racing', -1.5, 'Alexander Rossi|Christian Rasmussen'],
        ['Juncos Hollinger Racing', -2.5, 'Rinus VeeKay|Sting Ray Robb'],
        ['A.J. Foyt Racing', -3, 'Santino Ferrucci|Caio Collet'],
        ['Dale Coyne Racing', -4, 'Romain Grosjean|Dennis Hauger'],
      ] },
    wec: { id: 'wec', champComeback: 0.3, skSd: 2.5, sigK: 1.1, champT: 4, champRep: 0.7, champDrvRep: 0.15, lap: 200, qK: 0.1194, rK: 9.7287, name: 'WEC Hypercar', short: 'WEC', tier: 3, lvl: 78, rounds: 8, rpr: 1, dpt: 3, pay: false, crew: true, sal: [150, 1800], titleName: 'WEC Hypercar Champion',
      rf: [{ n: 'Race', pts: PF1, grid: 'q' }], special: { 3: '24 Hours of Le Mans win' },
      names: ['Qatar 1812km', 'Imola 6h', 'Spa 6h', '24 Hours of Le Mans', 'São Paulo 6h', 'COTA 6h', 'Fuji 6h', 'Bahrain 8h'],
      teams: [
        ['Toyota Gazoo Racing #7', 4, 'Mike Conway|Kamui Kobayashi|Nyck de Vries'],
        ['Toyota Gazoo Racing #8', 4, 'Sébastien Buemi|Brendon Hartley|Ryō Hirakawa'],
        ['Ferrari AF Corse #51', 4, 'Alessandro Pier Guidi|James Calado|Antonio Giovinazzi'],
        ['Ferrari AF Corse #50', 3.5, 'Antonio Fuoco|Miguel Molina|Nicklas Nielsen'],
        ['BMW M Team WRT #15', 2, 'Kevin Magnussen|Raffaele Marciello|Dries Vanthoor'],
        ['BMW M Team WRT #20', 2, 'Robin Frijns|René Rast|Sheldon van der Linde'],
        ['Cadillac Hertz Team Jota #12', 2.5, 'Alex Lynn|Will Stevens|Norman Nato'],
        ['Cadillac Hertz Team Jota #38', 2.5, 'Earl Bamber|Sébastien Bourdais|Jack Aitken'],
        ['Alpine Endurance Team #35', 0, 'António Félix da Costa|Victor Martins'],
        ['Alpine Endurance Team #36', -0.5, 'Frédéric Makowiecki'],
        ['Peugeot TotalEnergies #93', -0.5, 'Paul di Resta|Théo Pourchaire'],
        ['Peugeot TotalEnergies #94', -1, 'Loïc Duval|Nick Cassidy'],
        ['Genesis Magma Racing #17', -1, 'André Lotterer|Luis Felipe Derani|Mathys Jaubert'],
        ['Genesis Magma Racing #19', -1.5, 'Mathieu Jaminet|Paul-Loup Chatin|Daniel Juncadella'],
        ['Aston Martin THOR Team #007', -1.5, 'Tom Gamble|Harry Tincknell|Ross Gunn'],
        ['Aston Martin THOR Team #009', -2, 'Alex Riberas|Marco Sørensen|Roman De Angelis'],
      ] },
    fe: { id: 'fe', champComeback: 0, starKeep: 1, sigK: 1.55, champT: 8, champRep: 0.7, champDrvRep: 0.08, lap: 70, qK: 0.0578, rK: 1.0175, name: 'Formula E', short: 'Formula E', tier: 3, lvl: 78, rounds: 16, rpr: 1, dpt: 2, pay: false, sal: [200, 2500], titleName: 'Formula E Champion',
      rf: [{ n: 'E-Prix', pts: PF1, grid: 'q' }],
      names: ['São Paulo', 'Mexico City', 'Miami', 'Jeddah', 'Madrid', 'Berlin', 'Monaco', 'Sanya', 'Shanghai', 'Tokyo', 'London', 'Portland', 'Misano', 'Jakarta', 'Seoul', 'Cape Town'],
      teams: [
        ['Porsche Formula E Team', 4, 'Pascal Wehrlein|Nico Müller'],
        ['Jaguar TCS Racing', 3.5, 'Mitch Evans|António Félix da Costa'],
        ['Nissan Formula E Team', 2, 'Oliver Rowland|Norman Nato'],
        ['Mahindra Racing', 1, 'Nyck de Vries|Edoardo Mortara'],
        ['DS Penske', 0.5, 'Maximilian Günther|Taylor Barnard'],
        ['Envision Racing', -0.5, 'Sébastien Buemi|Joel Eriksson'],
        ['Citroën Racing', -1, 'Jean-Éric Vergne|Nick Cassidy'],
        ['Andretti Formula E', -1.5, 'Jake Dennis|Felipe Drugovich'],
        ['Cupra Kiro', -2.5, 'Pepe Martí|Dan Ticktum'],
        ['Lola Yamaha ABT', -3, 'Lucas di Grassi|Zane Maloney'],
      ] },
    nascar: { id: 'nascar', champComeback: 0.35, champT: 7, champRep: 0.05, champDrvRep: 0.0, lap: 55, qK: 0.04, rK: 1.7, name: 'NASCAR Cup Series', short: 'NASCAR', tier: 3, lvl: 76, rounds: 36, rpr: 3, dpt: 2, pay: false, sal: [300, 9000], titleName: 'NASCAR Cup Champion', sigK: 1.6, dnfK: 1.1,
      rf: [{ n: 'Stage 1', pts: PSTG, grid: 'q', stage: true }, { n: 'Stage 2', pts: PSTG, grid: 'prev', stage: true }, { n: 'Race', pts: PNAS, grid: 'prev' }], special: { 0: 'Daytona 500 win' },
      names: ['Daytona 500', 'Atlanta', 'Circuit of the Americas', 'Phoenix', 'Las Vegas', 'Homestead-Miami', 'Martinsville', 'Darlington', 'Bristol', 'Talladega', 'Texas', 'Kansas', 'North Wilkesboro', 'Charlotte 600', 'Nashville', 'Michigan', 'Pocono', 'San Diego', 'Sonoma', 'Chicagoland', 'Atlanta II', 'North Wilkesboro II', 'Indianapolis', 'Iowa', 'Richmond', 'New Hampshire', 'Daytona', 'Darlington II', 'Gateway', 'Bristol II', 'Kansas II', 'Talladega II', 'Charlotte Roval', 'Las Vegas II', 'Homestead II', 'Phoenix Finale'],
      teams: [
        ['Hendrick Motorsports', 4.5, 'Kyle Larson|Chase Elliott|William Byron|Alex Bowman', 4],
        ['Joe Gibbs Racing', 4, 'Denny Hamlin|Christopher Bell|Chase Briscoe|Ty Gibbs', 4],
        ['Team Penske', 3.5, 'Joey Logano|Ryan Blaney|Austin Cindric', 3],
        ['23XI Racing', 2.5, 'Tyler Reddick|Bubba Wallace|Riley Herbst', 3],
        ['Trackhouse Racing', 1.5, 'Shane van Gisbergen|Ross Chastain|Daniel Suárez', 3],
        ['RFK Racing', 0.5, 'Brad Keselowski|Chris Buescher', 2],
        ['Richard Childress Racing', 0, 'Kyle Busch|Austin Dillon|Austin Hill', 3],
        ['Legacy Motor Club', -1.5, 'Erik Jones|John Hunter Nemechek', 2],
        ['Spire Motorsports', -2, 'Carson Hocevar|Michael McDowell', 2],
        ['Front Row Motorsports', -2.5, 'Ryan Preece|Noah Gragson|Todd Gilliland', 3],
        ['Wood Brothers Racing', -3, 'Josh Berry', 1],
        ['Haas Factory Team', -3, 'Cole Custer|Ty Dillon', 2],
        ['Kaulig Racing', -3.5, 'AJ Allmendinger|Justin Haley', 2],
        ['Rick Ware Racing', -4.5, '', 2],
      ] },
    imsa: { id: 'imsa', starKeep: 1, skSd: 2.5, sigK: 1.1, champT: 6, champRep: 0.3, champDrvRep: 0.02, lap: 105, qK: 0.1, rK: 6.5, name: 'IMSA SportsCar Championship', short: 'IMSA', tier: 3, lvl: 78, rounds: 10, rpr: 1, dpt: 3, pay: false, crew: true, sal: [150, 1500], titleName: 'IMSA GTP Champion',
      rf: [{ n: 'Race', pts: PIMSA, grid: 'q' }], special: { 0: 'Rolex 24 at Daytona win' },
      names: ['Rolex 24 at Daytona', 'Sebring 12h', 'Long Beach', 'Laguna Seca', 'Detroit', 'Watkins Glen 6h', 'Road America', 'VIR', 'Indianapolis', 'Petit Le Mans'],
      teams: [
        ['Porsche Penske Motorsport #6', 4, 'Kévin Estre|Laurens Vanthoor|Matt Campbell'],
        ['Porsche Penske Motorsport #7', 4, 'Felipe Nasr|Nick Tandy|Julien Andlauer'],
        ['Cadillac Whelen #31', 3.5, 'Jack Aitken|Pipo Derani|Frederik Vesti'],
        ['Cadillac Wayne Taylor Racing #10', 3, 'Filipe Albuquerque|Ricky Taylor|Louis Delétraz'],
        ['Acura Meyer Shank Racing #60', 2, 'Tom Blomqvist|Colin Braun|Nick Yelloly'],
        ['BMW M Team RLL #24', 1.5, 'Philipp Eng|Marco Wittmann|Dries Vanthoor'],
        ['BMW M Team RLL #25', 1.5, 'Connor De Phillippi|Nick Yelloly|Kevin Magnussen'],
        ['Aston Martin Valkyrie #23', 0, 'Alex Riberas|Roman De Angelis|Ross Gunn'],
        ['Lamborghini Iron Lynx #63', -1, 'Romain Grosjean|Mirko Bortolotti|Daniil Kvyat'],
        ['Cadillac Action Express #311', 0.5, 'Sébastien Bourdais|Scott Dixon|Alex Palou'],
        ['Acura Wayne Taylor #40', -1.5, 'Brendon Hartley|Felipe Drugovich|Jordan Taylor'],
      ] },
    dtm: { id: 'dtm', champComeback: 0.1, starKeep: 1, moveP: 0.45, newFaces: 0.32, skSd: 3.3, sigK: 1.35, champT: 40, champRep: 0.3, champDrvRep: 0.06, lap: 85, qK: 0.09, rK: 1.8, name: 'DTM', short: 'DTM', tier: 3, lvl: 76, rounds: 8, rpr: 2, dpt: 2, pay: false, sal: [150, 1100], titleName: 'DTM Champion',
      rf: [{ n: 'Race 1', pts: PKART, grid: 'q' }, { n: 'Race 2', pts: PKART, grid: 'q' }],
      names: ['Oschersleben', 'Lausitzring', 'Red Bull Ring', 'Norisring', 'Nürburgring', 'Sachsenring', 'Zandvoort', 'Hockenheim'],
      teams: [
        ['Manthey EMA Porsche', 3.5, 'Thomas Preining|Ricardo Feller', 2],
        ['Team Landgraf Mercedes-AMG', 3, 'Jules Gounon|Lucas Auer', 2],
        ['ABT Lamborghini', 2.5, 'Mirko Bortolotti|Kelvin van der Linde', 2],
        ['Team WRT BMW', 2, 'Sheldon van der Linde|Marco Wittmann', 2],
        ['Schubert Motorsport BMW', 1, 'Dennis Olsen|Maximilian Götz', 2],
        ['Emil Frey Racing', 0, 'Jack Aitken|Arthur Leclerc', 2],
        ['Winward Racing', -0.5, 'Luca Stolz|Maro Engel', 2],
        ['Rowe Racing', -1.5, '', 2],
        ['Mücke Motorsport', -2.5, '', 2],
        ['KÜS Team Bernhard', -3, '', 2],
        ['Grasser Racing Team', -3.5, '', 2],
      ] },
    supercars: { id: 'supercars', champComeback: 0.2, skSd: 4.0, sigK: 0.72, champT: 2.8, champRep: 0.7, champDrvRep: 0.4, lap: 80, qK: 0.06, rK: 2.0, name: 'Repco Supercars Championship', short: 'Supercars', tier: 3, lvl: 75, rounds: 14, rpr: 2, dpt: 2, pay: false, sal: [200, 1600], titleName: 'Supercars Champion',
      rf: [{ n: 'Race 1', pts: PSUP, grid: 'q' }, { n: 'Race 2', pts: PSUP, grid: 'prev' }], special: { 10: 'Bathurst 1000 win' },
      names: ['Sydney', 'Melbourne', 'Taupō', 'Symmons Plains', 'Tasmania', 'Perth', 'Darwin', 'Townsville', 'Queensland', 'Sandown 500', 'Bathurst 1000', 'Gold Coast', 'Adelaide', 'Newcastle'],
      teams: [
        ['Triple Eight Race Engineering', 4, 'Broc Feeney|Will Brown', 2],
        ['Walkinshaw Andretti United', 3, 'Chaz Mostert|Ryan Wood', 2],
        ['Tickford Racing', 2.5, 'Cam Waters|Thomas Randle', 2],
        ['Erebus Motorsport', 2, 'Brodie Kostecki|Jayden Ojeda', 2],
        ['Dick Johnson Racing', 1, 'Matt Payne|Nick Percat', 2],
        ['Team 18', 0, 'Mark Winterbottom|Anton De Pasquale', 2],
        ['Grove Racing', -0.5, 'Kai Allen|Jack Le Brocq', 2],
        ['Brad Jones Racing', -1.5, '', 2],
        ['PremiAir Racing', -2, '', 2],
        ['Matt Stone Racing', -3, '', 2],
      ] },
    gt3w: { id: 'gt3w', lap: 115, qK: 0.0909, rK: 3.5312, name: 'GT3 Works Programmes', short: 'GT3 Works', tier: 3, lvl: 76, rounds: 10, rpr: 1, dpt: 3, pay: false, crew: true, sal: [100, 900], titleName: 'GT3 Works Champion',
      rf: [{ n: 'Race', pts: PF1, grid: 'q' }], special: { 3: 'Spa 24h win' },
      names: ['Paul Ricard', 'Monza 3h', 'Brands Hatch', 'Spa 24h', 'Nürburgring 24h', 'Misano', 'Zandvoort', 'Barcelona', 'Hockenheim', 'Valencia'],
      teams: [
        ['Mercedes-AMG Team Verstappen', 3.5, 'Jules Gounon|Daniel Juncadella|Lucas Auer'],
        ['Ferrari AF Corse Works', 3.5, 'Alessandro Pier Guidi|James Calado|Antonio Fuoco'],
        ['Porsche Manthey Works', 3, 'Kévin Estre|Laurens Vanthoor|Ricardo Feller'],
        ['BMW Team WRT Works', 3, 'Sheldon van der Linde|Dries Vanthoor|Charles Weerts'],
        ['Audi Sport WRT Works', 2, 'Kelvin van der Linde|Ricardo Feller|Dennis Marschall'],
        ['Lamborghini Iron Lynx Works', 1, 'Mirko Bortolotti|Andrea Caldarelli|Franck Perera'],
        ['McLaren Works Programme', 0, 'Ben Barnicoat|Marvin Kirchhöfer|Nicolai Kjærgaard'],
        ['Aston Martin Works', -0.5, 'Marco Sørensen|Nicki Thiim|Jonny Adam'],
        ['Ford Works Programme', -1.5, 'Dennis Olsen|Mikaël Grenier|Arjun Maini'],
      ] },
  };

  const ACADEMIES = [
    { n: 'Red Bull Junior Team', f1: ['Red Bull Racing', 'Racing Bulls'], feeder: 'Racing Bulls' },
    { n: 'Ferrari Driver Academy', f1: ['Ferrari', 'Haas'], feeder: 'Haas' },
    { n: 'Mercedes Junior Team', f1: ['Mercedes', 'Williams'], feeder: 'Williams' },
    { n: 'McLaren Driver Development Programme', f1: ['McLaren', 'Williams'], feeder: 'Williams' },
    { n: 'Alpine Academy', f1: ['Alpine'], feeder: 'Alpine' },
    { n: 'Williams Driver Academy', f1: ['Williams'], feeder: 'Williams' },
    { n: 'Aston Martin Driver Development', f1: ['Aston Martin'], feeder: 'Aston Martin' },
  ];

  // ladder logic
  const PROMO = { f4: ['frec'], frec: ['f3'], gt4: ['gt3'], f3: ['f2'], sfl: ['sf'], nxt: ['indy'], gt3: ['wec'], f2: ['f1'], sf: ['f1'], indy: ['f1'], wec: ['f1'], fe: ['f1'] };
  const LATERAL = { f4: ['gt4'], frec: ['gt4'], gt4: ['frec'], f3: ['sfl', 'nxt', 'gt3'], sfl: ['nxt', 'gt3'], nxt: ['sfl', 'gt3'], gt3: ['sfl', 'nxt'], f2: ['indy', 'sf', 'wec', 'fe', 'imsa', 'gt3w', 'dtm'] };
  const STUCK_CATS = ['f4', 'frec', 'gt4', 'f3', 'sfl', 'nxt', 'gt3', 'f2'];
  const SENIOR = ['wec', 'imsa', 'gt3w', 'fe', 'indy', 'nascar', 'dtm', 'supercars'];   // where F1 drivers and F2 graduates actually go (no Super Formula)
  const TIER3_SIDE = ['sf', ...SENIOR];
  const STATS = ['PAC', 'QUA', 'RAC', 'CON', 'WET', 'TYR', 'FIT', 'MEN'];
  const STAT_NAMES = { PAC: 'Pace', QUA: 'Qualifying', RAC: 'Racecraft', CON: 'Consistency', WET: 'Wet weather', TYR: 'Tyre mgmt', FIT: 'Fitness', MEN: 'Mentality' };

  // dynamic (cycling) series vs spec series
  const dyn = (id, regYears, elite) => { CATS[id].dyn = true; CATS[id].regYears = regYears; CATS[id].elite = elite; };
  dyn('f1', [2026, 2031, 2037, 2042, 2048, 2053, 2059], ['Ferrari', 'McLaren', 'Mercedes', 'Red Bull Racing']);
  dyn('indy', [2028, 2034, 2040, 2046, 2052, 2058], ['Chip Ganassi Racing', 'Team Penske', 'Arrow McLaren']);
  dyn('wec', [2030, 2035, 2040, 2046, 2051, 2057], ['Toyota Gazoo Racing #7', 'Toyota Gazoo Racing #8', 'Ferrari AF Corse #51']);
  dyn('fe', [2027, 2031, 2035, 2039, 2043, 2047, 2051, 2055, 2059], ['Jaguar TCS Racing', 'Porsche Formula E Team']);
  dyn('sf', [2029, 2035, 2041, 2047, 2053, 2059], ['Team Mugen', 'Vantelin Team TOM\'S']);

  dyn('nascar', [2031, 2038, 2045, 2052, 2059], ['Hendrick Motorsports', 'Joe Gibbs Racing', 'Team Penske']);
  dyn('imsa', [2030, 2036, 2042, 2048, 2054], ['Porsche Penske Motorsport #6', 'Porsche Penske Motorsport #7', 'Cadillac Whelen #31']);
  dyn('dtm', [2029, 2035, 2041, 2047, 2053], ['Manthey EMA Porsche', 'Team Landgraf Mercedes-AMG']);
  dyn('supercars', [2030, 2037, 2044, 2051, 2058], ['Triple Eight Race Engineering', 'Walkinshaw Andretti United']);
  CATS.nascar.floors = [['Hendrick Motorsports', 4], ['Joe Gibbs Racing', 4], ['Team Penske', 5]];
  CATS.imsa.floors = [['Porsche Penske Motorsport #6', 6], ['Porsche Penske Motorsport #7', 6], ['Cadillac Whelen #31', 6]];
  CATS.dtm.floors = [['Manthey EMA Porsche', 4], ['Team Landgraf Mercedes-AMG', 5]];
  CATS.supercars.floors = [['Triple Eight Race Engineering', 3], ['Walkinshaw Andretti United', 5]];
  CATS.f1.floors = [['Mercedes', 4], ['Red Bull Racing', 4], ['Ferrari', 6], ['McLaren', 6]];
  CATS.indy.floors = [['Chip Ganassi Racing', 5], ['Team Penske', 5], ['Arrow McLaren', 6]];
  CATS.wec.floors = [['Toyota Gazoo Racing #7', 6], ['Toyota Gazoo Racing #8', 6], ['Ferrari AF Corse #51', 6]];
  CATS.fe.floors = [['Porsche Formula E Team', 5], ['Jaguar TCS Racing', 5]];
  CATS.sf.floors = [['Team Mugen', 5], ['Vantelin Team TOM\'S', 5]];
  // team livery colours (substring match, first hit wins)
  const TEAM_COLORS = [['Racing Bulls', '#6692ff'], ['Red Bull', '#1e41ff'], ['Mercedes', '#00d2be'], ['Ferrari', '#dc0000'], ['McLaren', '#ff8000'], ['Aston Martin', '#00826f'], ['Alpine', '#0090ff'], ['Williams', '#005aff'], ['Haas', '#b6babd'], ['Audi', '#cf0a2c'], ['Cadillac', '#c9a227'], ['Toyota', '#eb0a1e'], ['Hendrick', '#1f4aa8'], ['Gibbs', '#f2b705'], ['Penske', '#ffd100'], ['Triple Eight', '#d71920'], ['Cadillac', '#c9a227'], ['BMW', '#1c69d4'], ['Porsche', '#b12b28'], ['Peugeot', '#2b6fd0'], ['Genesis', '#7aa7d9'], ['Jaguar', '#1a1a1a'], ['Penske', '#ffd100'], ['Ganassi', '#d6001c'], ['Andretti', '#e4002b'], ['Prema', '#d71920'], ['Trident', '#0f4fa8'], ['MP Motorsport', '#ff6a00'], ['ART Grand Prix', '#8a9099'], ['Campos', '#2f56c9'], ['DAMS', '#003a8c'], ['Invicta', '#10a45a'], ['Van Amersfoort', '#f58220'], ['Rodin', '#6c4bd1'], ['Hitech', '#e8c200']];
  // talent tiers: share of new careers, and OVR advantage over the "on-path" level by age band
  // bands: 7-11, 12-13, 14-15, 16-18, 19-22, 23+
  const TIERS = [
    { id: 'prospect', n: 'Prospect', p: 0.51, col: '#8b8fb0', adv: [5, 5, 5, -3.5, -7.5, -7], blurb: 'Below-average F1 ceiling. Podiums in karting, then a midfield grind.' },
    { id: 'talented', n: 'Talented', p: 0.30, col: '#4da3ff', adv: [7.5, 7, 7, 0, -3, 0.5], blurb: 'A solid F1 driver. Results depend on the car.' },
    { id: 'late', n: 'Late bloomer', p: 0.09, col: '#ff8a5c', adv: [3, 3.5, 12, 5, 3.5, 3.5], blurb: 'Regular points and the odd podium early on, then winning and podiums in the final karting years and the junior formulas.' },
    { id: 'wonder', n: 'Wonderkid', p: 0.08, col: '#ffd23f', adv: [9, 6.5, 6.5, 4, 4.5, 5.2], blurb: 'Quick everywhere and regularly in the karting top five. A future title contender.' },
    { id: 'gen', n: 'Generational', p: 0.02, col: '#ff6fae', adv: [12.5, 5.5, 5, 10, 9, 9.5], blurb: 'Once in a generation. Wins national titles early, then mixes big wins with top-five finishes and bad international events. The drives get noticed.' },
  ];
  // chance of a step-up by finishing bucket [<=4, 5-7, 8-10, 11-15, 16+], per tier [prospect, talented, late, wonder, gen]
  // junior ladder: chance of a step-up seat by final position [P1, P2-3, P4-5, P6-10, P11+] = share who raced the next series the
  // following season (Wikipedia standings 2005-2025: GP2/F2 -> F1 via F1DB, GP3/F3 -> F2, FR Eurocup/FRECA -> F3, Italian F4 -> FRECA/F3),
  // scaled so that with STEP_TIER and the call-ups below the bot careers reproduce those rates; F2/F3 champions may not return
  const STEP_P = { f2: [0.41, 0.24, 0.16, 0.022, 0.012], f3: [0.82, 0.86, 0.42, 0.5, 0.15], frec: [0.76, 0.78, 0.52, 0.37, 0.12], f4: [0.64, 0.47, 0.4, 0.27, 0.12] };
  const STEP_TIER = [0.85, 0.93, 1, 1.1, 1.2];   // at the same result, academies and teams chase the quicker, younger talent (prospect ... generational)
  const PROMO_P = [[1, 1, 1, 1, 1], [0.50, 0.45, 0.45, 0.45, 0.38], [0.22, 0.20, 0.20, 0.20, 0.14], [0.06, 0.05, 0.05, 0.05, 0.03], [0.01, 0.01, 0.01, 0.01, 0]];

  // F1 driver pool: [birth year, skill]
  // F1 driver pool: [birth year, base rating, F1 seasons raced before 2026]
  // Ratings are fitted from 2010-2026 qualifying (F1DB): a driver + team-season model on lap-time gaps, scaled so the
  // best active driver = 93 and the 2026 grid median = 84 (1 point ~ 0.039% of a lap ~ 0.035 s). "Base" is the
  // experience-neutral level: drivers in their first three seasons carry a rookie penalty on top (see CATS.f1.time.pen).
  const F1P = {
    'Oscar Piastri': [2001, 93.0, 3], 'Lando Norris': [1999, 92.3, 7], 'Max Verstappen': [1997, 92.1, 11], 'Charles Leclerc': [1997, 90.9, 8],
    'Kimi Antonelli': [2006, 90.2, 1], 'Fernando Alonso': [1981, 89.7, 22], 'Gabriel Bortoleto': [2004, 88.9, 1], 'Lewis Hamilton': [1985, 88.8, 19],
    'George Russell': [1998, 88.6, 7], 'Carlos Sainz': [1994, 88.2, 11], 'Arvid Lindblad': [2007, 88.0, 0], 'Isack Hadjar': [2004, 87.6, 1],
    'Oliver Bearman': [2005, 87.0, 2], 'Nico Hülkenberg': [1987, 86.6, 14], 'Alex Albon': [1996, 84.0, 6], 'Pierre Gasly': [1996, 84.0, 9],
    'Valtteri Bottas': [1989, 83.4, 12], 'Esteban Ocon': [1996, 82.4, 9], 'Liam Lawson': [2002, 82.1, 3], 'Sergio Pérez': [1990, 80.9, 14],
    'Lance Stroll': [1998, 79.1, 9], 'Franco Colapinto': [2003, 78.6, 2],
  };

  const ROOKIES = ['Rafael Câmara', 'Dino Beganovic', 'Nikola Tsolov', 'Sebastián Montoya', 'Kush Maini', 'Gabriele Minì', 'Ugo Ugochukwu', 'Martinius Stenshorne', 'Noah Strømsted', 'Freddie Slater', 'Théophile Naël', 'Tuukka Taponen', 'Ritomo Miyata', 'Oliver Goethe', 'Laurens van Hoepen', 'Mari Boya'];
  const RETIRE_2028 = ['Lewis Hamilton', 'Fernando Alonso'];

  const D = { SENIOR, TEAM_COLORS, NATS, CATS, ACADEMIES, PROMO, LATERAL, STUCK_CATS, TIER3_SIDE, STATS, STAT_NAMES, TIERS, PROMO_P, STEP_P, STEP_TIER, F1P, ROOKIES, RETIRE_2028 };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.F1D = D;
})(typeof window !== 'undefined' ? window : globalThis);
