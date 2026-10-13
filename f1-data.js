/* Grid Dynasty – static data: nationalities, categories, real teams/drivers (2026 snapshot) */
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
  const PIND = [50, 40, 35, 32, 30, 28, 26, 24, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 5, 5, 5, 5, 5];

  const KB = ['Tony Kart Racing Team', 'Kart Republic', 'Birel ART Racing', 'CRG Racing', 'Parolin Motorsport', 'Ricciardo Kart', 'Exprit Racing', 'LN Kart Racing'];
  const KO = [5, 4, 3, 1, 0, -1, -3, -5];
  const kteams = () => KB.map((n, i) => [n, KO[i], '']);
  const R = n => Array.from({ length: n }, (_, i) => 'Round ' + (i + 1));

  const CATS = {
    kart1: { id: 'kart1', name: 'Mini Kart · Regional', short: 'Regional Karting', tier: 0, lvl: 46, rounds: 8, rpr: 1, dpt: 3, pay: true, cost: [4, 12], titleName: 'Regional Karting Champion',
      rf: [{ n: 'Final', pts: PKART, grid: 'q' }], names: R(8), teams: kteams() },
    kart2: { id: 'kart2', name: 'Cadet / Mini · National', short: 'National Karting', tier: 0, lvl: 55, rounds: 8, rpr: 1, dpt: 3, pay: true, cost: [10, 28], titleName: 'National Karting Champion',
      rf: [{ n: 'Final', pts: PKART, grid: 'q' }], names: R(8), teams: kteams() },
    kart3: { id: 'kart3', name: 'OK-Junior · European / World', short: 'OK-Junior', tier: 0, lvl: 61, rounds: 6, rpr: 1, dpt: 3, pay: true, cost: [25, 70], titleName: 'Karting European Champion',
      rf: [{ n: 'Final', pts: PKART, grid: 'q' }], names: ['Euro R1', 'Euro R2', 'Euro R3', 'Euro R4', 'Euro R5', 'World Championship'], kartWC: true, teams: kteams() },
    kart4: { id: 'kart4', name: 'OK · European / World', short: 'OK Karting', tier: 0, lvl: 67, rounds: 6, rpr: 1, dpt: 3, pay: true, cost: [40, 110], titleName: 'Karting European Champion',
      rf: [{ n: 'Final', pts: PKART, grid: 'q' }], names: ['Euro R1', 'Euro R2', 'Euro R3', 'Euro R4', 'Euro R5', 'World Championship'], kartWC: true, teams: kteams() },

    f4: { id: 'f4', name: 'British F4', short: 'F4', tier: 1, lvl: 68, rounds: 8, rpr: 3, dpt: 4, pay: true, cost: [90, 230], titleName: 'F4 Champion',
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
    f3: { id: 'f3', name: 'FIA Formula 3', short: 'F3', tier: 2, lvl: 73, rounds: 10, rpr: 2, dpt: 3, pay: true, cost: [450, 950], titleName: 'F3 Champion',
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
    f2: { id: 'f2', name: 'FIA Formula 2', short: 'F2', tier: 3, lvl: 78, rounds: 14, rpr: 2, dpt: 2, pay: true, cost: [1400, 2900], titleName: 'F2 Champion',
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
    f1: { id: 'f1', name: 'Formula 1', short: 'F1', tier: 4, lvl: 84, rounds: 24, rpr: 1, dpt: 2, pay: false, sal: [700, 13000], titleName: 'F1 World Champion',
      rf: [{ n: 'Grand Prix', pts: PF1, grid: 'q' }],
      names: ['Australia', 'China', 'Japan', 'Bahrain', 'Saudi Arabia', 'Miami', 'Canada', 'Monaco', 'Barcelona', 'Austria', 'Great Britain', 'Belgium', 'Hungary', 'Netherlands', 'Italy', 'Madrid', 'Azerbaijan', 'Singapore', 'United States', 'Mexico City', 'Brazil', 'Las Vegas', 'Qatar', 'Abu Dhabi'],
      special: { 7: 'Monaco GP win' },
      teams: [
        ['Mercedes', 7, 'George Russell|Kimi Antonelli'],
        ['McLaren', 5, 'Lando Norris|Oscar Piastri'],
        ['Ferrari', 5.5, 'Charles Leclerc|Lewis Hamilton'],
        ['Red Bull Racing', 3.5, 'Max Verstappen|Isack Hadjar'],
        ['Williams', 1, 'Alex Albon|Carlos Sainz'],
        ['Racing Bulls', 0, 'Liam Lawson|Arvid Lindblad'],
        ['Aston Martin', 0, 'Fernando Alonso|Lance Stroll'],
        ['Alpine', 1.5, 'Pierre Gasly|Franco Colapinto'],
        ['Haas', -2, 'Esteban Ocon|Oliver Bearman'],
        ['Audi', -3, 'Nico Hülkenberg|Gabriel Bortoleto'],
        ['Cadillac', -5, 'Sergio Pérez|Valtteri Bottas'],
      ],
    },

    /* lateral categories (real team names; drivers partly real, rest generated) */
    frec: { id: 'frec', name: 'Formula Regional Europe', short: 'FRECA', tier: 1, lvl: 70, rounds: 10, rpr: 2, dpt: 3, pay: true, cost: [350, 720], titleName: 'FRECA Champion',
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
    gt4: { id: 'gt4', name: 'GT4 European Series', short: 'GT4', tier: 1, lvl: 66, rounds: 12, rpr: 1, dpt: 2, pay: true, crew: true, cost: [90, 210], titleName: 'GT4 Champion',
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
    sfl: { id: 'sfl', name: 'Super Formula Lights', short: 'SF Lights', tier: 2, lvl: 71, rounds: 14, rpr: 1, dpt: 2, pay: true, cost: [150, 360], titleName: 'Super Formula Lights Champion',
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
    nxt: { id: 'nxt', name: 'Indy NXT', short: 'Indy NXT', tier: 2, lvl: 73, rounds: 14, rpr: 1, dpt: 3, pay: true, cost: [500, 1150], titleName: 'Indy NXT Champion',
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
    gt3: { id: 'gt3', name: 'GT World Challenge Europe', short: 'GT3', tier: 2, lvl: 73, rounds: 12, rpr: 1, dpt: 3, pay: true, crew: true, cost: [200, 520], titleName: 'GT3 Champion',
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
    sf: { id: 'sf', name: 'Super Formula', short: 'Super Formula', tier: 3, lvl: 77, rounds: 9, rpr: 2, dpt: 2, pay: false, sal: [140, 480], titleName: 'Super Formula Champion',
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
    indy: { id: 'indy', name: 'IndyCar Series', short: 'IndyCar', tier: 3, lvl: 79, rounds: 17, rpr: 1, dpt: 2, pay: false, sal: [300, 3000], titleName: 'IndyCar Champion',
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
    wec: { id: 'wec', name: 'WEC Hypercar', short: 'WEC', tier: 3, lvl: 78, rounds: 8, rpr: 1, dpt: 3, pay: false, crew: true, sal: [200, 1400], titleName: 'WEC Hypercar Champion',
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
    fe: { id: 'fe', name: 'Formula E', short: 'Formula E', tier: 3, lvl: 78, rounds: 16, rpr: 1, dpt: 2, pay: false, sal: [250, 1900], titleName: 'Formula E Champion',
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
  };

  const ACADEMIES = [
    { n: 'Red Bull Junior Team', f1: ['Red Bull Racing', 'Racing Bulls'] },
    { n: 'Ferrari Driver Academy', f1: ['Ferrari', 'Haas'] },
    { n: 'Mercedes Junior Team', f1: ['Mercedes'] },
    { n: 'McLaren Driver Development Programme', f1: ['McLaren'] },
    { n: 'Alpine Academy', f1: ['Alpine'] },
    { n: 'Williams Driver Academy', f1: ['Williams'] },
    { n: 'Aston Martin Driver Development', f1: ['Aston Martin'] },
  ];

  // ladder logic
  const PROMO = { f4: ['f3'], frec: ['f3'], gt4: ['gt3'], f3: ['f2'], sfl: ['sf'], nxt: ['indy'], gt3: ['wec'], f2: ['f1'], sf: ['f1'], indy: ['f1'], wec: ['f1'], fe: ['f1'] };
  const LATERAL = { f4: ['frec', 'gt4'], frec: ['gt4'], gt4: ['frec'], f3: ['sfl', 'nxt', 'gt3'], sfl: ['nxt', 'gt3'], nxt: ['sfl', 'gt3'], gt3: ['sfl', 'nxt'], f2: ['indy', 'sf', 'wec', 'fe'] };
  const STUCK_CATS = ['f4', 'frec', 'gt4', 'f3', 'sfl', 'nxt', 'gt3', 'f2'];
  const TIER3_SIDE = ['sf', 'indy', 'wec', 'fe'];
  const STATS = ['PAC', 'QUA', 'RAC', 'CON', 'WET', 'TYR', 'FIT', 'MEN'];
  const STAT_NAMES = { PAC: 'Pace', QUA: 'Qualifying', RAC: 'Racecraft', CON: 'Consistency', WET: 'Wet weather', TYR: 'Tyre mgmt', FIT: 'Fitness', MEN: 'Mentality' };

  // dynamic (cycling) series vs spec series
  const dyn = (id, regYears, elite) => { CATS[id].dyn = true; CATS[id].regYears = regYears; CATS[id].elite = elite; };
  dyn('f1', [2026, 2031, 2037, 2042, 2048, 2053, 2059], ['Ferrari', 'McLaren', 'Mercedes', 'Red Bull Racing']);
  dyn('indy', [2028, 2034, 2040, 2046, 2052, 2058], ['Chip Ganassi Racing', 'Team Penske', 'Arrow McLaren']);
  dyn('wec', [2030, 2035, 2040, 2046, 2051, 2057], ['Toyota Gazoo Racing #7', 'Toyota Gazoo Racing #8', 'Ferrari AF Corse #51']);
  dyn('fe', [2027, 2031, 2035, 2039, 2043, 2047, 2051, 2055, 2059], ['Jaguar TCS Racing', 'Porsche Formula E Team']);
  dyn('sf', [2029, 2035, 2041, 2047, 2053, 2059], ['Team Mugen', 'Vantelin Team TOM\'S']);

  // talent tiers: share of new careers, and OVR advantage over the "on-path" level by age band
  // bands: 7-11, 12-13, 14-15, 16-18, 19-22, 23+
  const TIERS = [
    { id: 'prospect', n: 'Prospect', p: 0.51, col: '#8b8fb0', adv: [2.5, 2.5, 2.5, -3.5, -7.5, -7], blurb: 'Below-average F1 ceiling. Podiums in karting, then a midfield grind.' },
    { id: 'talented', n: 'Talented', p: 0.30, col: '#4da3ff', adv: [4, 4.5, 4.5, 0, -3, 0.5], blurb: 'A solid F1 driver. Results depend on the car.' },
    { id: 'late', n: 'Late bloomer', p: 0.09, col: '#ff8a5c', adv: [-3, -1, 8, 5, 2.5, 2], blurb: 'Quiet early on, then dominant in the last karting years and the junior formulas.' },
    { id: 'wonder', n: 'Wonderkid', p: 0.08, col: '#ffd23f', adv: [6.5, 7, 7.5, 5, 4.5, 4.5], blurb: 'Wins early, wins often. A future title contender.' },
    { id: 'gen', n: 'Generational', p: 0.02, col: '#ff6fae', adv: [10, 11, 11, 9, 9, 9], blurb: 'Once in a generation. Dominates everything.' },
  ];
  // chance of a step-up by finishing bucket [<=4, 5-7, 8-10, 11-15, 16+], per tier [prospect, talented, late, wonder, gen]
  const PROMO_P = [[1, 1, 1, 1, 1], [0.50, 0.45, 0.45, 0.45, 0.38], [0.22, 0.20, 0.20, 0.20, 0.14], [0.06, 0.05, 0.05, 0.05, 0.03], [0.01, 0.01, 0.01, 0.01, 0]];

  // F1 driver pool: [birth year, skill]
  const F1P = {
    'Max Verstappen': [1997, 93], 'Lando Norris': [1999, 90], 'Oscar Piastri': [2001, 89], 'George Russell': [1998, 89], 'Charles Leclerc': [1997, 90],
    'Lewis Hamilton': [1985, 88], 'Kimi Antonelli': [2006, 85], 'Isack Hadjar': [2004, 83], 'Alex Albon': [1996, 84], 'Carlos Sainz': [1994, 85],
    'Liam Lawson': [2002, 82], 'Arvid Lindblad': [2007, 80], 'Fernando Alonso': [1981, 86], 'Lance Stroll': [1998, 80], 'Pierre Gasly': [1996, 84],
    'Franco Colapinto': [2003, 80], 'Esteban Ocon': [1996, 83], 'Oliver Bearman': [2005, 83], 'Nico Hülkenberg': [1987, 83], 'Gabriel Bortoleto': [2004, 82],
    'Sergio Pérez': [1990, 80], 'Valtteri Bottas': [1989, 80],
  };
  const ROOKIES = ['Rafael Câmara', 'Dino Beganovic', 'Nikola Tsolov', 'Sebastián Montoya', 'Kush Maini', 'Gabriele Minì', 'Ugo Ugochukwu', 'Martinius Stenshorne', 'Noah Strømsted', 'Freddie Slater', 'Théophile Naël', 'Tuukka Taponen', 'Ritomo Miyata', 'Oliver Goethe', 'Laurens van Hoepen', 'Mari Boya'];
  const RETIRE_2028 = ['Lewis Hamilton', 'Fernando Alonso'];

  const D = { NATS, CATS, ACADEMIES, PROMO, LATERAL, STUCK_CATS, TIER3_SIDE, STATS, STAT_NAMES, TIERS, PROMO_P, F1P, ROOKIES, RETIRE_2028 };
  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.F1D = D;
})(typeof window !== 'undefined' ? window : globalThis);
