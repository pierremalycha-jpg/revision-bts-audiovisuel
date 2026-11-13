// LA PARTITION DU FILM — « Compression vidéo · Module 4 · Le codage entropique : de Huffman au CABAC »
// Source unique pour la musique ET l'image : le plan, les chapitres et l'heure de chaque apparition.
// Tout ce qui est commun aux films (horloge, harmonie, thème, titre, « À retenir », fin) vient de partition.js.
// Les exemples sont ceux du cours (modules/tes-compression-video/contenu.js, MODULE_4) :
// ABRACADABRA (23 bits contre 33), source à 90 % de 0 (0,47 bit), intervalle 1 → 0,8 → 0,64 → 0,512.
(function () {
  const Partition = typeof require !== 'undefined' ? require('./partition') : globalThis.Partition;
  const P = Partition.creer({
    app: 'Compression vidéo', module: 4,
    titre: 'Le codage entropique', sousTitre: 'De Huffman au CABAC.',
    transpose: 5,
    plan: [['titre', 2], ['role', 4], ['cout', 4], ['entropie', 4], ['huffman', 6], ['mot', 4], ['arith', 4], ['cabac', 6], ['choix', 5], ['retenir', 4], ['fin', 2]],
    calme: ['role'], // le premier chapitre pose le décor sans batterie ; elle entre avec la formule du coût
    chapitres: [['role', 'La dernière étape'], ['cout', 'Le coût d’un symbole'], ['entropie', 'L’entropie'], ['huffman', 'Le code de Huffman'], ['mot', 'Coder ABRACADABRA'], ['arith', 'Le codage arithmétique'], ['cabac', 'Le CABAC'], ['choix', 'CAVLC ou CABAC ?'], ['retenir', 'À retenir']],
    retenir: 6,
  });
  const { t, hit, ev, BEAT } = P;

  // 1 · LA DERNIÈRE ÉTAPE : la chaîne du codec, puis la suite de nombres qu'il reste à écrire
  ev.role = {
    ...ev.role,
    phrase: t('role', 0, 0.3),
    blocs: [0, 1, 2, 3].map((i) => hit(t('role', 0, 1 + i * 0.5), 'note', { k: i, pan: -0.45 + i * 0.3 })),
    suite: t('role', 1, 0),
    // seize cases, une par double croche ; un tic toutes les quatre cases
    cases: Array.from({ length: 16 }, (_, i) => t('role', 1, 1 + i * 0.125)),
    codes: hit(t('role', 2, 0), 'accord'),
    sms: hit(t('role', 2, 2), 'note', { k: 1, pan: 0.2 }),
    sansPerte: hit(t('role', 3, 0), 'note', { k: 3 }),
  };
  [0, 4, 8, 12].forEach((i, k) => hit(ev.role.cases[i], 'tick', { pitch: 0.9 + k * 0.08, pan: -0.4 + k * 0.27 }));

  // 2 · LE COÛT D'UN SYMBOLE : coût = −log2(p), trois exemples
  ev.cout = {
    ...ev.cout,
    phrase: t('cout', 0, 0.3),
    formule: hit(t('cout', 0, 2), 'note', { k: 2, pan: -0.3 }),
    cartes: [hit(t('cout', 1, 0), 'note', { k: 1, pan: -0.5 }), hit(t('cout', 1, 2), 'note', { k: 2 }), hit(t('cout', 2, 0), 'pop', { pan: 0.5 })],
    conclusion: hit(t('cout', 3, 0), 'note', { k: 3 }),
  };

  // 3 · L'ENTROPIE : la limite ; trois sources
  ev.entropie = {
    ...ev.entropie,
    phrase: t('entropie', 0, 0.3),
    formule: hit(t('entropie', 0, 2.5), 'note', { k: 2, pan: -0.3 }),
    sources: [hit(t('entropie', 1, 0), 'note', { k: 1, pan: -0.5 }), hit(t('entropie', 1, 2), 'note', { k: 2 }), hit(t('entropie', 2, 0), 'note', { k: 3, pan: 0.5 })],
    conclusion: hit(t('entropie', 3, 0), 'accord'),
  };

  // 4 · LE CODE DE HUFFMAN : l'arbre d'ABRACADABRA se construit branche par branche
  ev.huffman = {
    ...ev.huffman,
    phrase: t('huffman', 0, 0.3),
    mot: hit(t('huffman', 0, 2), 'note', { k: 1, pan: -0.4 }),
    // les cinq feuilles : A, C, D, B, R (de gauche à droite), une par croche
    feuilles: [0, 1, 2, 3, 4].map((i) => hit(t('huffman', 1, i * 0.5), 'tick', { pitch: 0.9 + i * 0.08, pan: -0.1 + i * 0.15 })),
    cd: hit(t('huffman', 2, 0), 'note', { k: 1, pan: 0.1 }),
    br: hit(t('huffman', 2, 2), 'note', { k: 2, pan: 0.4 }),
    six: hit(t('huffman', 3, 0), 'note', { k: 3, pan: 0.25 }),
    racine: hit(t('huffman', 3, 2), 'note', { k: 4 }),
    codes: hit(t('huffman', 4, 0), 'accord', { pan: 0.2 }),
    morale: hit(t('huffman', 5, 0), 'note', { k: 2, pan: -0.3 }),
  };

  // 5 · CODER ABRACADABRA : une lettre par croche, le compteur de bits monte jusqu'à 23
  ev.mot = {
    ...ev.mot,
    phrase: t('mot', 0, 0.3),
    lettres: Array.from({ length: 11 }, (_, i) => hit(t('mot', 0, 2 + i * 0.5), 'tick', { pitch: 0.85 + i * 0.05, pan: -0.5 + i * 0.1 })),
    prefixe: t('mot', 1, 0),
    total: hit(t('mot', 2, 0), 'accord'),
    fixe: hit(t('mot', 2, 2), 'note', { k: 1, pan: -0.3 }),
    limite: hit(t('mot', 3, 0), 'alerte'),
  };

  // 6 · LE CODAGE ARITHMÉTIQUE : l'intervalle se resserre à chaque bin
  ev.arith = {
    ...ev.arith,
    phrase: t('arith', 0, 0.3),
    rangs: [hit(t('arith', 0, 2), 'note', { k: 1, pan: -0.3 }), hit(t('arith', 1, 0), 'note', { k: 2, pan: -0.3 }), hit(t('arith', 1, 2), 'note', { k: 3, pan: -0.3 }), hit(t('arith', 2, 0), 'note', { k: 4, pan: -0.3 })],
    calcul: hit(t('arith', 2, 2), 'note', { k: 2, pan: 0.2 }),
    resultat: hit(t('arith', 3, 0), 'accord'),
  };

  // 7 · LE CABAC : trois étapes, et la probabilité qui se met à jour
  ev.cabac = {
    ...ev.cabac,
    sigle: t('cabac', 0, 0.3),
    blocs: [hit(t('cabac', 1, 0), 'note', { k: 1, pan: -0.5 }), hit(t('cabac', 1, 2), 'note', { k: 2, pan: -0.2 }), hit(t('cabac', 2, 2), 'note', { k: 3, pan: 0.2 }), hit(t('cabac', 3, 2), 'note', { k: 4, pan: 0.5 })],
    // la binarisation : quatre bins, un par double croche
    bins: [0, 1, 2, 3].map((i) => hit(t('cabac', 1, 2.5 + i * 0.25), 'tick', { pitch: 1 + i * 0.1, pan: -0.2 })),
    bits: hit(t('cabac', 4, 0), 'pop', { pan: 0.5 }),
    boucle: hit(t('cabac', 4, 2), 'presse', { len: BEAT * 0.9, monte: true, pan: 0.3 }),
    piege: hit(t('cabac', 5, 0), 'alerte'),
  };

  // 8 · CAVLC OU CABAC ?
  ev.choix = {
    ...ev.choix,
    gauche: hit(t('choix', 0, 0), 'note', { k: 2, pan: -0.5 }),
    droite: hit(t('choix', 1, 0), 'note', { k: 3, pan: 0.5 }),
    presse0: hit(t('choix', 1, 2), 'presse', { len: BEAT * 1.6, pan: 0.5 }),
    gain: hit(t('choix', 2, 0), 'accord', { pan: 0.4 }),
    lourd: hit(t('choix', 2, 2), 'note', { k: 1, pan: 0.5 }),
    piege1: hit(t('choix', 3, 0), 'alerte'),
    piege2: hit(t('choix', 4, 0), 'alerte'),
  };

  // ---------- repères (planche de contrôle, images fixes, contrôle de la synchronisation) ----------
  P.markers = {
    titre: t('titre', 1, 3),
    role: t('role', 3, 2),
    cout_pop: { t: ev.cout.cartes[2], sync: 'av' },
    cout: t('cout', 3, 2),
    entropie: t('entropie', 3, 2),
    huffman_arbre: t('huffman', 3, 3.5),
    huffman_codes: { t: ev.huffman.codes, sync: 'av' },
    huffman: t('huffman', 5, 2),
    mot_total: { t: ev.mot.total, sync: 'av' },
    mot: t('mot', 3, 2),
    arith_resultat: { t: ev.arith.resultat, sync: 'av' },
    arith: t('arith', 3, 2),
    cabac_chaine: t('cabac', 4, 1),
    cabac: t('cabac', 5, 2),
    choix_gain: { t: ev.choix.gain, sync: 'av' },
    choix: t('choix', 4, 2),
    retenir: t('retenir', 3, 2),
    fin: t('fin', 1, 3.5),
  };

  if (typeof module !== 'undefined') module.exports = P; else globalThis.SCORE = P;
})();
