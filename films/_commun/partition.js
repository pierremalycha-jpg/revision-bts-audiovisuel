// LA PARTITION COMMUNE — ce qui est identique d'un film à l'autre.
// Un film décrit seulement : son plan (les sections et leur durée en mesures), ses chapitres et
// l'heure de chaque apparition. Tout le reste est fabriqué ici : l'horloge, l'harmonie, le thème,
// l'arrangement (où joue la batterie), les événements du titre, du plan « À retenir » et de la fin.
//
//   const P = Partition.creer({
//     app: 'Compression vidéo', module: 2,
//     titre: 'La compression JPEG', sousTitre: 'Blocs, DCT, quantification.',
//     transpose: 2,                              // la tonalité change d'un film à l'autre (demi-tons)
//     plan: [['titre', 2], ['chaine', 4], …, ['retenir', 4], ['fin', 2]],   // « titre », « retenir » et « fin » sont obligatoires
//     calme: ['chaine'],                         // sections sans batterie (titre, retenir et fin le sont toujours)
//     chapitres: [['chaine', 'La chaîne JPEG'], …, ['retenir', 'À retenir']],   // barre de progression + chapitres de la page
//     retenir: 6,                                // nombre de lignes du plan « À retenir »
//     dernier: true,                             // (dernier module seulement) la fin dit « pour valider le parcours »
//   });
//   const { t, hit, ev } = P;
//   ev.chaine = { ...ev.chaine, image: t('chaine', 0, 2), etape: hit(t('chaine', 1, 0), 'note', { k: 1 }) };
//   P.markers = { chaine: t('chaine', 3, 2), … };
//   if (typeof module !== 'undefined') module.exports = P; else globalThis.SCORE = P;
//
// t(section, mesure, temps) → l'heure en secondes · hit(heure, son, options) → note l'événement sonore et renvoie l'heure.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar } = MU;

  // Les accords (le pack lo-fi ajoute la 7e ou la 9e : notes[0] + 10 demi-tons)
  const TABLE = {
    C: { notes: ['E3', 'G3', 'C4'], bass: 'C2' },
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    Dm: { notes: ['D3', 'A3', 'F4'], bass: 'D2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    Em: { notes: ['E3', 'G3', 'B3'], bass: 'E2' },
    Cmaj9: { notes: ['E3', 'G3', 'B3', 'D4'], bass: 'C2' },
  };
  // Le thème, une mesure par accord (grille de croches : [note, début, durée])
  const HOOK = {
    C: [['E5', 0, 2], ['G5', 2, 1], ['A5', 3, 1], ['G5', 4, 2], ['E5', 6, 2]],
    Am: [['D5', 0, 3], ['C5', 3, 1], ['A4', 4, 4]],
    Dm: [['D5', 0, 2], ['F5', 2, 1], ['A5', 3, 1], ['G5', 4, 2], ['F5', 6, 2]],
    G: [['D5', 0, 3], ['B4', 3, 1], ['D5', 4, 2], ['G5', 6, 2]],
    F: [['A5', 0, 2], ['G5', 2, 1], ['F5', 3, 1], ['C5', 4, 4]],
    Em: [['B4', 0, 2], ['D5', 2, 1], ['E5', 3, 1], ['G5', 4, 4]],
  };
  const BOUCLE_A = ['C', 'Am', 'Dm', 'G'], BOUCLE_B = ['F', 'Em', 'Dm', 'G'];
  const GAMME = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6']; // pentatonique : toujours juste

  function creer(o) {
    const FPS = 25; // la cadence de la vidéo en Europe… et celle des exemples des cours
    const FORMAT = U.pickFormat('16:9');
    const [W, H] = U.formatSize(FORMAT);
    const SAFE = U.safeArea(W, H);
    // 80 à la noire : 1 temps = 0,75 s, 1 mesure = 3 s (75 images). Lo-fi calme, pour réviser.
    const clock = makeClock({ bpm: 80, offset: 0.4 });
    const { T, BEAT } = clock;
    const tr = o.transpose || 0;

    // ---------- le plan, en mesures ----------
    const B = {}; let b = 0;
    for (const [id, n] of o.plan) { B[id] = b; b += n; }
    B.END = b;
    for (const id of ['titre', 'retenir', 'fin']) if (!(id in B)) throw new Error(`plan : la section « ${id} » est obligatoire`);
    const DURATION = T(B.END) + 2.0;
    const longueur = Object.fromEntries(o.plan);
    const corps = o.plan.map((p) => p[0]).filter((id) => id !== 'titre' && id !== 'fin');
    const calmes = new Set(['titre', 'retenir', 'fin', ...(o.calme || [])]);
    const sectionDe = (mesure) => { let s = o.plan[0][0]; for (const [id] of o.plan) if (B[id] <= mesure) s = id; return s; };
    const calme = (mesure) => calmes.has(sectionDe(mesure));
    // t('debit', 1, 2) : 2e mesure de la section, 3e temps (les mesures et les temps comptent à partir de 0)
    const t = (id, mesure = 0, temps = 0) => { if (!(id in B)) throw new Error(`t() : section inconnue « ${id} »`); return T(B[id] + mesure, temps); };

    // ---------- harmonie : deux boucles de quatre accords qui alternent toutes les huit mesures ----------
    const rows = [];
    ['C', 'Am', 'C', 'Am'].slice(0, B[corps[0]]).forEach((n, i) => rows.push([i, 0, 4, n]));
    for (let k = B[corps[0]], i = 0; k < B.fin; k++, i++) rows.push([k, 0, 4, k === B.fin - 1 ? 'G' : (Math.floor(i / 8) % 2 ? BOUCLE_B : BOUCLE_A)[i % 4]]);
    rows.push([B.fin, 0, 2, 'Dm'], [B.fin, 2, 2, 'G'], [B.fin + 1, 0, 4 * (B.END - B.fin - 1) + 4, 'Cmaj9']);
    const chords = rows.map(([bar, beat, beats, name]) => ({
      t0: T(bar, beat), t1: T(bar, beat + beats), bar, name,
      notes: TABLE[name].notes.map((n) => m(n) + tr), bass: m(TABLE[name].bass) + tr,
    }));
    const chordAt = (x) => chords.find((c) => x >= c.t0 && x < c.t1) || null;

    // ---------- le thème ----------
    const boite = [], theme = [];
    for (let k = 0; k < B[corps[0]]; k++) boite.push(...placeBar(clock, HOOK[chordAt(T(k) + 0.01).name], k, 12 + tr));
    for (let k = B[corps[0]]; k < B.fin; k++) { const c = chordAt(T(k) + 0.01); if (!calme(k) && HOOK[c.name]) theme.push(...placeBar(clock, HOOK[c.name], k, tr)); }

    // ---------- l'arrangement : la batterie ne joue pas dans les sections calmes ----------
    const arrangement = [{ from: 0, to: B[corps[0]], drums: false, bassline: false, gain: 1.4 }];
    for (let i = 0; i < corps.length; i++) {
      const id = corps[i], from = B[id], to = from + longueur[id], suivant = corps[i + 1];
      if (calmes.has(id)) arrangement.push({ from, to, drums: false, gain: 0.9 });
      else arrangement.push({ from, to, fill: !suivant || calmes.has(suivant) ? [to - 1] : [] }); // un roulement avant chaque respiration
    }
    arrangement.push({ from: B.fin, to: B.fin + 1, drums: false });

    // ---------- les événements ----------
    const hits = [];
    const hit = (heure, kind, opt) => {
      const e = { t: heure, kind, ...(opt || {}) };
      if (kind === 'cloche') e.midi = (e.midi !== undefined ? e.midi : m(GAMME[(e.degre || 0) % GAMME.length])) + tr;
      hits.push(e); return heure;
    };
    const ev = {};
    ev.titre = { icone: T(0, 0), sur: T(0, 0.5), titre: T(0, 1), sous: T(1, 0), pastille: T(1, 2) };
    for (const id of corps) ev[id] = { debut: hit(t(id), 'fwip') }; // chaque section s'ouvre sur un froissement
    // « À retenir » : une ligne tous les deux temps, sur des notes qui montent
    const nLignes = o.retenir || 6;
    if (2 + nLignes * 2 > longueur.retenir * 4) throw new Error('plan : la section « retenir » est trop courte pour ' + nLignes + ' lignes');
    ev.retenir.lignes = Array.from({ length: nLignes }, (_, i) => hit(t('retenir', 0, 2 + i * 2), 'cloche', { degre: i, pan: -0.2 + i * 0.08 }));
    ev.fin = {
      titre: t('fin'),
      etapes: [0, 1, 2, 3].map((i) => hit(t('fin', 0, 2 + i), 'cloche', { degre: 3 + i, pan: -0.45 + i * 0.3 })),
      note: t('fin', 1, 2.5), credit: t('fin', 1, 3),
    };

    // ---------- chapitres (barre de progression de l'image, chapitres cliquables de la page) ----------
    const CHAPITRES = o.chapitres.map(([id, nom], i) => ({ id, nom, t0: t(id), t1: i + 1 < o.chapitres.length ? t(o.chapitres[i + 1][0]) : t('fin') }));
    const S = Object.fromEntries(o.plan.map(([id, n]) => [id, [id === 'titre' ? 0 : t(id), id === 'fin' ? DURATION : T(B[id] + n)]]));

    const P = {
      FPS, FORMAT, W, H, SAFE, DURATION, STYLE: 'flat', clock, T, BEAT, B, S, CHAPITRES, m, chords, chordAt, HOOK,
      boite, theme, arrangement, calme, ev, hits, hit, t, markers: {},
      META: { app: o.app, module: o.module, titre: o.titre, sousTitre: o.sousTitre, dernier: !!o.dernier, pastille: o.pastille || `Module ${o.module} · l’essentiel en 2 minutes` },
    };
    return P;
  }

  const Partition = { creer };
  if (node) module.exports = Partition; else globalThis.Partition = Partition;
})();
