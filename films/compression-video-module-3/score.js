// LA PARTITION DU FILM — « Compression vidéo · Module 3 · La compression MPEG : exploiter le temps »
// Le plan, les chapitres et l'heure de chaque apparition. Le reste (horloge, harmonie, thème,
// arrangement, titre, « À retenir », fin) vient de films/_commun/partition.js.
// Les chiffres sont ceux du cours (modules/tes-compression-video/contenu.js, MODULE_3).
(function () {
  const Partition = typeof require !== 'undefined' ? require('./partition') : globalThis.Partition;
  const P = Partition.creer({
    app: 'Compression vidéo', module: 3,
    titre: 'La compression MPEG', sousTitre: 'Exploiter le temps.',
    transpose: -3,
    plan: [
      ['titre', 2],
      ['idee', 4], // 1 · prédire l'image au lieu de tout renvoyer
      ['types', 5], // 2 · images I, P, B
      ['gop', 5], // 3 · le GOP, N et M
      ['mouvement', 5], // 4 · estimation de mouvement, vecteur
      ['residu', 3], // 5 · compensation de mouvement et résidu
      ['ordre', 4], // 6 · ordre d'affichage et ordre de transmission
      ['debit', 4], // 7 · débit moyen d'un GOP
      ['choix', 5], // 8 · GOP long ou tout-intra
      ['generations', 4], // 9 · de MPEG-2 à VVC
      ['retenir', 4],
      ['fin', 2],
    ],
    calme: ['idee'],
    chapitres: [
      ['idee', 'L’idée : prédire'], ['types', 'Images I, P, B'], ['gop', 'Le GOP : N et M'], ['mouvement', 'L’estimation de mouvement'],
      ['residu', 'Compensation et résidu'], ['ordre', 'L’ordre de transmission'], ['debit', 'Le débit moyen d’un GOP'],
      ['choix', 'GOP long ou tout-intra'], ['generations', 'Les générations de codecs'], ['retenir', 'À retenir'],
    ],
    retenir: 6,
  });
  const { t, hit, ev, BEAT } = P;

  // 1 · L'IDÉE : deux images successives se ressemblent ; on prédit, on envoie vecteurs + résidu
  ev.idee = {
    ...ev.idee,
    image2: hit(t('idee', 0, 2), 'note', { k: 1, pan: -0.1 }),
    bouge: hit(t('idee', 1, 0), 'note', { k: 2, pan: 0.4 }),
    cartes: [hit(t('idee', 1, 2), 'note', { k: 1, pan: -0.5 }), hit(t('idee', 2, 0), 'note', { k: 2 }), hit(t('idee', 2, 2), 'note', { k: 3, pan: 0.5 })],
    conclusion: hit(t('idee', 3, 0), 'accord'),
  };

  // 2 · LES TROIS TYPES D'IMAGES
  ev.types = {
    ...ev.types,
    cartes: [hit(t('types', 0, 1), 'note', { k: 1, pan: -0.5 }), hit(t('types', 1, 0), 'note', { k: 2 }), hit(t('types', 2, 0), 'note', { k: 3, pan: 0.5 })],
    poids: hit(t('types', 3, 0), 'presse', { len: BEAT * 1.3 }),
    valeurs: hit(t('types', 3, 1.5), 'pop'),
    regle: hit(t('types', 4, 0), 'accord'),
  };

  // 3 · LE GOP : treize tuiles posées une par double croche (un tic par croche)
  ev.gop = {
    ...ev.gop,
    tuiles: Array.from({ length: 13 }, (_, i) => t('gop', 0, 2 + i * 0.25)),
    fleches: hit(t('gop', 1, 2), 'note', { k: 2 }),
    N: hit(t('gop', 2, 0), 'note', { k: 1, pan: -0.2 }),
    M: hit(t('gop', 2, 2), 'note', { k: 3, pan: -0.4 }),
    cartes: [hit(t('gop', 3, 0), 'note', { k: 1, pan: -0.5 }), hit(t('gop', 3, 2), 'note', { k: 2 }), hit(t('gop', 4, 0), 'accord', { pan: 0.4 })],
  };
  for (let i = 0; i < 13; i += 2) hit(ev.gop.tuiles[i], 'tick', { pitch: 0.85 + i * 0.03, pan: -0.6 + i * 0.1 });

  // 4 · L'ESTIMATION DE MOUVEMENT : le codeur essaie toutes les positions, puis trouve
  ev.mouvement = {
    ...ev.mouvement,
    images: hit(t('mouvement', 0, 2), 'note', { k: 1 }),
    bloc: hit(t('mouvement', 1, 0), 'note', { k: 2, pan: 0.2 }),
    zone: t('mouvement', 1, 2),
    trouve: hit(t('mouvement', 3, 0), 'pop', { pan: -0.4 }),
    vecteur: hit(t('mouvement', 3, 2), 'note', { k: 3, pan: 0.4 }),
    precision: hit(t('mouvement', 4, 0), 'note', { k: 1, pan: -0.3 }),
  };
  for (let i = 0; i < 12; i++) hit(t('mouvement', 1, 2 + i * 0.5), 'tick', { pitch: 0.8 + (i % 6) * 0.06, pan: -0.5 + (i % 6) * 0.08 });

  // 5 · COMPENSATION ET RÉSIDU
  ev.residu = {
    ...ev.residu,
    prediction: hit(t('residu', 0, 2), 'note', { k: 2 }),
    residu: hit(t('residu', 1, 0), 'pop', { pan: 0.4 }),
    dct: hit(t('residu', 1, 2), 'note', { k: 1 }),
    piege: hit(t('residu', 2, 0), 'alerte'),
  };

  // 6 · L'ORDRE DE TRANSMISSION : sept images descendent, une par croche
  ev.ordre = {
    ...ev.ordre,
    besoin: hit(t('ordre', 1, 0), 'note', { k: 2, pan: 0.3 }),
    vols: Array.from({ length: 7 }, (_, j) => hit(t('ordre', 1, 2 + j * 0.5), 'note', { k: j % 5, pan: -0.6 + j * 0.15 })),
    legende: hit(t('ordre', 2, 2), 'note', { k: 3, pan: 0.4 }),
    puces: hit(t('ordre', 3, 0), 'accord'),
  };

  // 7 · LE DÉBIT MOYEN D'UN GOP
  ev.debit = {
    ...ev.debit,
    barres: hit(t('debit', 0, 2), 'presse', { len: BEAT * 1.5, monte: true }),
    somme: hit(t('debit', 1, 2), 'note', { k: 2, pan: -0.3 }),
    calcul: hit(t('debit', 2, 2), 'note', { k: 3, pan: -0.3 }),
    resultat: hit(t('debit', 3, 0), 'accord', { pan: 0.2 }),
  };

  // 8 · GOP LONG OU TOUT-INTRA : une erreur frappe les deux
  ev.choix = {
    ...ev.choix,
    gauche: hit(t('choix', 0, 0), 'note', { k: 2, pan: -0.5 }),
    droite: hit(t('choix', 1, 0), 'note', { k: 3, pan: 0.5 }),
    erreur: hit(t('choix', 2, 0), 'thud'),
    usages: hit(t('choix', 3, 0), 'note', { k: 1 }),
    piege: hit(t('choix', 4, 0), 'alerte'),
  };

  // 9 · LES GÉNÉRATIONS
  ev.generations = {
    ...ev.generations,
    lignes: [0, 1, 2, 3, 4].map((i) => hit(t('generations', 0, 1 + i), 'note', { k: i, pan: -0.3 })),
    divise: [0, 1, 2].map((i) => hit(t('generations', 2, i), 'tick', { pitch: 1.1 - i * 0.12, pan: 0.2 })),
    conclusion: hit(t('generations', 3, 0), 'accord'),
  };

  // ---------- moments nommés (planche de contrôle, contrôle de la synchronisation) ----------
  P.markers = {
    titre: t('titre', 1, 3),
    idee: t('idee', 3, 3),
    types: t('types', 4, 3),
    gop_fleches: t('gop', 2, 3.5),
    gop: { t: ev.gop.cartes[2], sync: 'av' },
    gop_fin: t('gop', 4, 3),
    mouvement_recherche: t('mouvement', 2, 2),
    trouve: { t: ev.mouvement.trouve, sync: 'av' },
    mouvement: t('mouvement', 4, 3),
    residu: t('residu', 2, 3),
    ordre_vol: t('ordre', 2, 0.25),
    ordre: t('ordre', 3, 3),
    debit: { t: ev.debit.resultat, sync: 'av' },
    debit_fin: t('debit', 3, 3),
    erreur: { t: ev.choix.erreur, sync: 'av' },
    choix: t('choix', 4, 3),
    generations: t('generations', 3, 3),
    retenir: t('retenir', 3, 2),
    fin: t('fin', 1, 3.5),
  };

  if (typeof module !== 'undefined') module.exports = P; else globalThis.SCORE = P;
})();
