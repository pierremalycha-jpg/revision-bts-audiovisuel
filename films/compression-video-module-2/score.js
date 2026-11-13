// LA PARTITION — film « Compression vidéo · Module 2 · La compression JPEG »
// Le plan, les chapitres et l'heure de chaque apparition. L'horloge, l'harmonie, le thème et les
// plans communs (titre, « À retenir », fin) viennent de films/_commun/partition.js.
// t(section, mesure, temps) → heure en secondes · hit(heure, son, options) → note le son et renvoie l'heure.
(function () {
  const Partition = typeof require !== 'undefined' ? require('./partition') : globalThis.Partition;
  const P = Partition.creer({
    app: 'Compression vidéo', module: 2,
    titre: 'La compression JPEG', sousTitre: 'Blocs, DCT, quantification.',
    transpose: 2,
    plan: [['titre', 2], ['chaine', 5], ['preparer', 6], ['dct', 6], ['quantif', 6], ['qualite', 5], ['zigzag', 5], ['artefacts', 4], ['intra', 5], ['retenir', 4], ['fin', 2]],
    calme: ['chaine'],
    chapitres: [['chaine', 'La chaîne JPEG'], ['preparer', 'Y′CbCr, 4:2:0 et blocs 8 × 8'], ['dct', 'La DCT'], ['quantif', 'La quantification'], ['qualite', 'Erreur et facteur de qualité'], ['zigzag', 'Zigzag, RLE et Huffman'], ['artefacts', 'Les artefacts'], ['intra', 'La compression intra-image'], ['retenir', 'À retenir']],
    retenir: 6,
  });
  const { t, hit, ev } = P;

  // 1 · LA CHAÎNE : huit cases, une par temps, sur des notes qui montent
  ev.chaine = {
    ...ev.chaine,
    phrase: t('chaine', 0, 0.5),
    cases: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => hit(t('chaine', 0, 2 + i), 'note', { k: i % 6, pan: -0.5 + (i % 4) * 0.33 })),
    pertes: hit(t('chaine', 2, 3), 'alerte'),
    repere: hit(t('chaine', 3, 2), 'note', { k: 3 }),
  };

  // 2 · PRÉPARER L'IMAGE : Y′CbCr, 4:2:0, puis les blocs 8 × 8
  ev.preparer = {
    ...ev.preparer,
    rvb: t('preparer', 0, 0.5),
    luma: hit(t('preparer', 0, 2), 'note', { k: 1, pan: 0 }),
    chroma: hit(t('preparer', 0, 3), 'note', { k: 2, pan: 0.4 }),
    sous: hit(t('preparer', 1, 1), 'presse', { len: P.BEAT * 0.9, pan: 0.4 }),
    moitie: hit(t('preparer', 2, 0), 'alerte'),
    blocs: hit(t('preparer', 3, 0), 'fwip'),
    grille: hit(t('preparer', 3, 1), 'note', { k: 1, pan: -0.4 }),
    zoom: hit(t('preparer', 3, 3), 'pop', { pan: 0.3 }),
    separes: hit(t('preparer', 4, 1), 'note', { k: 2, pan: -0.3 }),
    formule: hit(t('preparer', 4, 3), 'note', { k: 3, pan: -0.3 }),
    resultat: hit(t('preparer', 5, 0), 'accord'),
  };

  // 3 · LA DCT : 64 pixels → 64 coefficients
  ev.dct = {
    ...ev.dct,
    phrase: t('dct', 0, 0.5),
    pixels: hit(t('dct', 0, 2), 'note', { k: 1, pan: -0.5 }),
    coefs: hit(t('dct', 1, 0), 'pop', { pan: 0.1 }),
    range: [0, 1, 2].map((i) => hit(t('dct', 1, 2 + i * 0.5), 'note', { k: 2 + i, pan: 0.5 })),
    dc: hit(t('dct', 2, 2), 'accord', { pan: 0.2 }),
    ac: hit(t('dct', 3, 2), 'note', { k: 3, pan: 0.2 }),
    piege: hit(t('dct', 4, 2), 'alerte'),
  };

  // 4 · LA QUANTIFICATION : diviser par un pas, arrondir
  ev.quantif = {
    ...ev.quantif,
    coefs: hit(t('quantif', 0, 1), 'note', { k: 1, pan: -0.5 }),
    table: hit(t('quantif', 0, 3), 'note', { k: 2, pan: 0 }),
    pas: hit(t('quantif', 1, 2), 'note', { k: 3, pan: 0 }),
    arrondi: hit(t('quantif', 2, 0), 'presse', { len: P.BEAT * 1.6, pan: 0.4 }),
    zeros: hit(t('quantif', 3, 0), 'accord', { pan: 0.4 }),
    formule: hit(t('quantif', 3, 2), 'note', { k: 2, pan: -0.4 }),
    ex1: hit(t('quantif', 4, 0), 'note', { k: 3, pan: 0.1 }),
    ex2: hit(t('quantif', 4, 2), 'note', { k: 4, pan: 0.1 }),
    irreversible: hit(t('quantif', 5, 0), 'thud', { pan: 0.4 }),
  };

  // 5 · ERREUR ET FACTEUR DE QUALITÉ
  ev.qualite = {
    ...ev.qualite,
    phrase: t('qualite', 0, 0.5),
    formule: hit(t('qualite', 0, 2), 'note', { k: 1, pan: -0.4 }),
    saut: hit(t('qualite', 1, 0), 'pop', { pan: 0.4 }),
    exemple: t('qualite', 1, 1),
    echelle: hit(t('qualite', 2, 0), 'note', { k: 2, pan: -0.4 }),
    cartes: [hit(t('qualite', 2, 2), 'cloche', { degre: 2, pan: 0 }), hit(t('qualite', 3, 0), 'cloche', { degre: 4, pan: -0.5 }), hit(t('qualite', 3, 2), 'cloche', { degre: 0, pan: 0.5 })],
    bilan: hit(t('qualite', 4, 0), 'note', { k: 3 }),
  };

  // 6 · ZIGZAG, RLE ET HUFFMAN
  ev.zigzag = {
    ...ev.zigzag,
    grille: t('zigzag', 0, 0.5),
    trajet0: t('zigzag', 0, 2), trajet1: t('zigzag', 2, 0),
    tics: Array.from({ length: 12 }, (_, i) => hit(t('zigzag', 0, 2 + i * 0.5), 'tick', { pitch: 0.8 + i * 0.05, pan: -0.5 + i * 0.08 })),
    zeros: hit(t('zigzag', 2, 0), 'thud', { pan: 0.4 }),
    rle: hit(t('zigzag', 2, 2), 'note', { k: 2, pan: 0.2 }),
    ex1: hit(t('zigzag', 3, 0), 'note', { k: 3, pan: 0.2 }),
    ex2: hit(t('zigzag', 3, 2), 'accord', { pan: 0.2 }),
    huffman: hit(t('zigzag', 4, 0), 'pop', { pan: 0.3 }),
  };

  // 7 · LES ARTEFACTS : quatre tuiles, quatre notes
  ev.artefacts = {
    ...ev.artefacts,
    tuiles: [0, 1, 2, 3].map((i) => hit(t('artefacts', 0, 1 + i * 2), 'cloche', { degre: i * 2, pan: -0.6 + i * 0.4 })),
    ou: hit(t('artefacts', 2, 2), 'note', { k: 2 }),
    piege: hit(t('artefacts', 3, 0), 'alerte'),
  };

  // 8 · LA COMPRESSION INTRA-IMAGE
  ev.intra = {
    ...ev.intra,
    phrase: t('intra', 0, 0.5),
    images: [0, 1, 2, 3, 4].map((i) => hit(t('intra', 0, 2 + i), 'tick', { pitch: 0.9 + i * 0.08, pan: -0.6 + i * 0.3 })),
    plus: hit(t('intra', 2, 0), 'note', { k: 2, pan: -0.4 }),
    moins: hit(t('intra', 2, 2), 'note', { k: 1, pan: 0.4 }),
    codecs: hit(t('intra', 3, 0), 'note', { k: 3 }),
    j2k: hit(t('intra', 3, 2), 'accord'),
  };

  // ---------- moments nommés (render.js board, stills @nom, verify) ----------
  P.markers = {
    titre: t('titre', 1, 3),
    chaine: t('chaine', 4, 2),
    preparer_couleur: t('preparer', 2, 2.5),
    blocs: { t: ev.preparer.resultat, sync: 'av' },
    preparer_fin: t('preparer', 5, 3),
    dct_milieu: t('dct', 2, 0),
    dct: t('dct', 5, 2),
    quantif_table: t('quantif', 1, 3),
    zeros: { t: ev.quantif.zeros, sync: 'av' },
    quantif: t('quantif', 5, 3),
    saut: { t: ev.qualite.saut, sync: 'av' },
    qualite: t('qualite', 4, 3),
    zigzag_trajet: t('zigzag', 1, 2),
    regroupes: { t: ev.zigzag.zeros, sync: 'av' },
    zigzag: t('zigzag', 4, 3),
    artefacts: t('artefacts', 3, 3),
    intra: t('intra', 4, 3),
    retenir: t('retenir', 3, 2),
    fin: t('fin', 1, 3.5),
  };

  if (typeof module !== 'undefined') module.exports = P; else globalThis.SCORE = P;
})();
