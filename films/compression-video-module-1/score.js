// LA PARTITION — source unique pour la musique ET l'image.
// Film : « Compression vidéo · Module 1 · Pourquoi compresser ? Débit et taux de compression »
// Chaque apparition à l'écran est un événement daté ici ; song.js fabrique le son des mêmes
// événements. Changer un temps ici déplace l'image et le son ensemble.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 25; // la cadence de la vidéo en Europe… et celle des exemples du cours
  const FORMAT = U.pickFormat('16:9');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  // 80 à la noire : 1 temps = 0,75 s, 1 mesure = 3 s (75 images). Lo-fi calme, pour réviser.
  const clock = makeClock({ bpm: 80, offset: 0.4 });
  const { T, BEAT } = clock;

  // ---------- le plan du film, en mesures ----------
  const B = {
    titre: 0, probleme: 2, debit: 6, octet: 11, taux: 14, pertes: 19, inter: 22,
    spatiale: 23, temporelle: 26, statistique: 29, psycho: 32,
    place: 35, codec: 39, retenir: 41, fin: 45, END: 47,
  };
  const DURATION = T(B.END) + 2.0; // 143,4 s

  // Les chapitres (barre de progression en bas de l'image)
  const CHAPITRES = [
    { id: 'probleme', b0: B.probleme, b1: B.debit },
    { id: 'debit', b0: B.debit, b1: B.octet },
    { id: 'octet', b0: B.octet, b1: B.taux },
    { id: 'taux', b0: B.taux, b1: B.pertes },
    { id: 'pertes', b0: B.pertes, b1: B.inter },
    { id: 'redondances', b0: B.inter, b1: B.place },
    { id: 'place', b0: B.place, b1: B.codec },
    { id: 'codec', b0: B.codec, b1: B.retenir },
    { id: 'retenir', b0: B.retenir, b1: B.fin },
  ].map((c) => ({ ...c, t0: T(c.b0), t1: T(c.b1) }));

  // sections (mesurées par engine/tools/levels.js)
  const S = {
    titre: [0, T(B.probleme)],
    probleme: [T(B.probleme), T(B.debit)],
    debit: [T(B.debit), T(B.octet)],
    octet_taux: [T(B.octet), T(B.pertes)],
    pertes: [T(B.pertes), T(B.inter)],
    inter: [T(B.inter), T(B.spatiale)],
    redond: [T(B.spatiale), T(B.place)],
    place_codec: [T(B.place), T(B.retenir)],
    retenir: [T(B.retenir), T(B.fin)],
    fin: [T(B.fin), DURATION],
  };

  // ---------- harmonie (le pack lo-fi ajoute la 7e ou la 9e : notes[0] + 10 demi-tons) ----------
  const TABLE = {
    C: { notes: ['E3', 'G3', 'C4'], bass: 'C2' },
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    Dm: { notes: ['D3', 'A3', 'F4'], bass: 'D2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    Em: { notes: ['E3', 'G3', 'B3'], bass: 'E2' },
    Cmaj9: { notes: ['E3', 'G3', 'B3', 'D4'], bass: 'C2' },
  };
  const rows = [];
  const suite = (b0, noms) => noms.forEach((n, i) => rows.push([b0 + i, 0, 4, n]));
  suite(B.titre, ['C', 'Am']);
  suite(B.probleme, ['Am', 'F', 'Dm', 'G']);
  suite(B.debit, ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G']); // mesures 6 à 21
  suite(B.inter, ['F']);
  suite(B.spatiale, ['F', 'Em', 'Dm', 'G', 'F', 'Em', 'Dm', 'G', 'F', 'Em', 'Dm', 'G']); // 23 à 34
  suite(B.place, ['C', 'Am', 'Dm', 'G', 'F', 'G']); // 35 à 40
  suite(B.retenir, ['C', 'Am', 'F', 'G']); // 41 à 44
  rows.push([B.fin, 0, 2, 'Dm'], [B.fin, 2, 2, 'G'], [B.fin + 1, 0, 8, 'Cmaj9']);
  const { chords, chordAt } = makeChords(clock, TABLE, rows);

  // ---------- le thème (grille de croches : [note, début, durée]) ----------
  const HOOK = {
    C: [['E5', 0, 2], ['G5', 2, 1], ['A5', 3, 1], ['G5', 4, 2], ['E5', 6, 2]],
    Am: [['D5', 0, 3], ['C5', 3, 1], ['A4', 4, 4]],
    Dm: [['D5', 0, 2], ['F5', 2, 1], ['A5', 3, 1], ['G5', 4, 2], ['F5', 6, 2]],
    G: [['D5', 0, 3], ['B4', 3, 1], ['D5', 4, 2], ['G5', 6, 2]],
    F: [['A5', 0, 2], ['G5', 2, 1], ['F5', 3, 1], ['C5', 4, 4]],
    Em: [['B4', 0, 2], ['D5', 2, 1], ['E5', 3, 1], ['G5', 4, 4]],
  };
  // boîte à musique sur le titre, piano électrique ensuite
  const boite = [...placeBar(clock, HOOK.C, 0, 12), ...placeBar(clock, HOOK.Am, 1, 12)];
  const theme = [];
  for (let b = B.debit; b < B.retenir; b++) {
    if (b === B.inter) continue; // la respiration avant les redondances
    const c = chordAt(T(b) + 0.01);
    if (c && HOOK[c.name]) theme.push(...placeBar(clock, HOOK[c.name], b));
  }

  // ---------- les événements : chaque apparition a son heure (et son son) ----------
  const hits = []; // { t, kind, k, pan, … } → lus par song.js
  const hit = (t, kind, o) => { hits.push({ t, kind, ...(o || {}) }); return t; };
  const ev = {};

  // TITRE
  ev.titre = { icone: T(0, 0), sur: T(0, 0.5), titre: T(0, 1), sous: T(1, 0), pastille: T(1, 2) };

  // 1 · LE PROBLÈME
  {
    const b = B.probleme;
    ev.probleme = {
      debut: hit(T(b, 0), 'fwip'),
      image: T(b, 0), compte0: T(b, 2), compte1: hit(T(b + 1, 2), 'note', { k: 3, pan: -0.3 }),
      giga: hit(T(b + 2, 0), 'pop', { pan: 0.1 }),
      rempli0: T(b + 2, 1), plein: hit(T(b + 3, 0), 'thud', { pan: 0.45 }),
      conclusion: hit(T(b + 3, 2), 'note', { k: 1 }),
    };
    // la carte se remplit : un tic par croche, de plus en plus aigu
    ev.probleme.tics = [];
    for (let i = 0; i < 6; i++) ev.probleme.tics.push(hit(T(b + 2, 1 + i * 0.5), 'tick', { pitch: 0.8 + i * 0.09, pan: 0.45 }));
  }

  // 2 · LE DÉBIT
  {
    const b = B.debit;
    ev.debit = {
      debut: hit(T(b, 0), 'fwip'),
      definition: T(b, 0),
      // la formule se pose, un terme par croche : D = · l × h · e · q · f
      termes: [0, 1, 2, 3, 4].map((i) => hit(T(b, 1 + i * 0.5), 'note', { k: i, pan: -0.4 + i * 0.2 })),
      // puis chaque terme reçoit sa valeur et son illustration
      valeurs: [hit(T(b + 1, 0), 'note', { k: 2, pan: -0.4 }), hit(T(b + 1, 2), 'note', { k: 3, pan: -0.1 }), hit(T(b + 2, 0), 'note', { k: 4, pan: 0.15 }), hit(T(b + 2, 2), 'note', { k: 5, pan: 0.4 })],
      compte0: T(b + 3, 0), resultat: hit(T(b + 3, 2), 'pop', { pan: -0.2 }),
      environ: hit(T(b + 4, 0), 'accord'),
    };
  }

  // 3 · BIT OU OCTET
  {
    const b = B.octet;
    ev.octet = {
      debut: hit(T(b, 0), 'fwip'),
      bits: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => hit(T(b, i * 0.5), 'tick', { pitch: 0.9 + i * 0.07, pan: -0.5 + i * 0.14 })),
      octet: hit(T(b + 1, 0), 'pop'),
      unites: T(b + 1, 1),
      conv: hit(T(b + 1, 2), 'note', { k: 2, pan: -0.4 }), div: hit(T(b + 1, 3), 'note', { k: 3 }),
      resultat: hit(T(b + 2, 0), 'accord', { pan: 0.3 }),
      piege: hit(T(b + 2, 2), 'alerte'),
    };
  }

  // 4 · LE TAUX DE COMPRESSION
  {
    const b = B.taux;
    ev.taux = {
      debut: hit(T(b, 0), 'fwip'),
      avant: hit(T(b, 1), 'note', { k: 1, pan: -0.2 }),
      presse0: hit(T(b, 2.5), 'presse', { len: BEAT * 1.2 }), presse1: hit(T(b + 1, 0), 'pop'),
      formule: hit(T(b + 1, 2), 'note', { k: 2, pan: -0.3 }),
      nombres: hit(T(b + 2, 0), 'note', { k: 3 }),
      resultat: hit(T(b + 2, 2), 'accord', { pan: 0.3 }),
      grille: hit(T(b + 3, 0), 'note', { k: 1, pan: -0.4 }),
      efface0: hit(T(b + 3, 2), 'presse', { len: BEAT * 1.6 }),
      p95: hit(T(b + 4, 0), 'thud'),
      piege: hit(T(b + 4, 2), 'alerte'),
    };
  }

  // 5 · SANS PERTE OU AVEC PERTE
  {
    const b = B.pertes;
    ev.pertes = {
      debut: hit(T(b, 0), 'fwip'),
      gauche: hit(T(b, 0), 'note', { k: 2, pan: -0.5 }), gaucheBarre: T(b, 2),
      droite: hit(T(b + 1, 0), 'note', { k: 3, pan: 0.5 }), droiteBarre: hit(T(b + 1, 2), 'presse', { len: BEAT * 0.9, pan: 0.5 }),
      note: hit(T(b + 2, 0), 'alerte'),
    };
  }

  // 6 · LES QUATRE REDONDANCES : quatre tuiles, quatre notes ; chacune revient avec sa note
  {
    const b = B.inter;
    const CLOCHES = ['C5', 'E5', 'G5', 'C6'];
    ev.inter = {
      question: hit(T(b, 0), 'fwip'),
      tuiles: [0, 1, 2, 3].map((i) => hit(T(b, 1 + i * 0.5), 'cloche', { midi: m(CLOCHES[i]), pan: -0.6 + i * 0.4 })),
    };
    ev.redond = ['spatiale', 'temporelle', 'statistique', 'psycho'].map((id, i) => {
      const r = B[id];
      return {
        id, debut: hit(T(r, 0), 'cloche', { midi: m(CLOCHES[i]), pan: 0.3 }),
        a: hit(T(r, 2), 'note', { k: 1, pan: -0.4 }),
        b: hit(T(r + 1, 0), 'note', { k: 2, pan: -0.4 }),
        c: hit(T(r + 1, 2), 'note', { k: 3, pan: -0.4 }),
        outil: hit(T(r + 2, 0), i === 3 ? 'alerte' : 'pop', { pan: 0.4 }),
      };
    });
  }

  // 7 · LA PLACE OCCUPÉE
  {
    const b = B.place;
    ev.place = {
      debut: hit(T(b, 0), 'fwip'),
      formule: T(b, 0), exemple: hit(T(b, 2), 'note', { k: 2, pan: -0.3 }),
      resultat: hit(T(b + 1, 0), 'accord'),
      jauge1: hit(T(b + 1, 2), 'note', { k: 1, pan: -0.2 }),
      jauge2: hit(T(b + 2, 0), 'presse', { len: BEAT * 1.6, monte: true }), deborde: hit(T(b + 2, 2), 'thud', { pan: 0.4 }),
      astuce: hit(T(b + 3, 0), 'accord'),
    };
  }

  // 8 · CODEC ≠ CONTENEUR
  {
    const b = B.codec;
    ev.codec = {
      debut: hit(T(b, 0), 'fwip'),
      gauche: hit(T(b, 0), 'note', { k: 2, pan: -0.5 }), droite: hit(T(b, 2), 'note', { k: 3, pan: 0.5 }),
      different: hit(T(b + 1, 0), 'pop'), phrase: T(b + 1, 1),
    };
  }

  // À RETENIR : six lignes, six notes de boîte à musique qui montent
  {
    const b = B.retenir;
    const GAMME = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
    ev.retenir = {
      debut: hit(T(b, 0), 'fwip'),
      lignes: [0, 1, 2, 3, 4, 5].map((i) => hit(T(b, 2 + i * 2), 'cloche', { midi: m(GAMME[i]), pan: -0.2 + i * 0.08 })),
    };
  }

  // FIN
  {
    const b = B.fin;
    const FINAL = ['G5', 'A5', 'C6', 'E6'];
    ev.fin = {
      titre: T(b, 0),
      etapes: [0, 1, 2, 3].map((i) => hit(T(b, 2 + i), 'cloche', { midi: m(FINAL[i]), pan: -0.45 + i * 0.3 })),
      note: T(b + 1, 2.5), credit: T(b + 1, 3),
    };
  }

  // ---------- moments nommés (render.js stills @nom, board, verify) ----------
  const markers = {
    titre: T(1, 2),
    probleme: T(B.probleme + 2, 0.5),
    plein: { t: ev.probleme.plein, sync: 'v' }, // le coup tombe bien à +8 ms, mais la basse tenue rend la mesure du son ambiguë
    debit_formule: T(B.debit + 2, 3),
    debit: { t: ev.debit.resultat, sync: 'v' }, // sur le 3e temps : la grosse caisse voisine brouillerait la mesure du son
    debit_fin: T(B.debit + 4, 2),
    octet: { t: ev.octet.octet, sync: 'av' },
    octet_fin: T(B.octet + 2, 3),
    taux_barres: T(B.taux + 1, 1),
    taux: T(B.taux + 2, 3),
    p95: { t: ev.taux.p95, sync: 'av' },
    taux_fin: T(B.taux + 4, 3),
    pertes: T(B.pertes + 2, 2),
    inter: T(B.inter, 3.5),
    spatiale: T(B.spatiale + 2, 2),
    temporelle: T(B.temporelle + 2, 2),
    statistique: T(B.statistique + 2, 2),
    psycho: T(B.psycho + 2, 2),
    place: T(B.place + 3, 2),
    deborde: { t: ev.place.deborde, sync: 'v' },
    codec: T(B.codec + 1, 3),
    retenir: T(B.retenir + 3, 2),
    fin: T(B.fin + 1, 3.5),
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, STYLE: 'flat', clock, T, BEAT, B, S, CHAPITRES, m, chords, chordAt, HOOK, boite, theme, ev, hits, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
