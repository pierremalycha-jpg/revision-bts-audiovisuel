// LA PARTITION — film « Compression vidéo · Module 5 · Régler le débit : CBR, VBR, profils et niveaux »
// Le plan, les chapitres et l'heure de chaque apparition. Tout le reste (horloge, harmonie, thème,
// titre, « À retenir », fin) vient de la partition commune : films/_commun/partition.js.
// Source des chiffres : MODULE_5 de modules/tes-compression-video/contenu.js.
(function () {
  const Partition = typeof require !== 'undefined' ? require('./partition') : globalThis.Partition;
  const P = Partition.creer({
    app: 'Compression vidéo', module: 5,
    titre: 'Régler le débit', sousTitre: 'CBR, VBR, profils et niveaux.',
    transpose: -1,
    plan: [
      ['titre', 2], ['question', 3], ['cbr', 5], ['vbr', 6], ['passes', 4], ['qp', 4],
      ['tampon', 4], ['profil', 4], ['niveau', 6], ['lecture', 4], ['retenir', 4], ['fin', 2],
    ],
    calme: ['question', 'tampon'], // deux respirations sans batterie : l'ouverture et le château d'eau
    chapitres: [
      ['question', 'Deux questions'], ['cbr', 'CBR : débit constant'], ['vbr', 'VBR : débit variable'],
      ['passes', 'Une ou deux passes'], ['qp', 'Le QP'], ['tampon', 'Le tampon'],
      ['profil', 'Le profil'], ['niveau', 'Le niveau'], ['lecture', 'Lire « High@L4.1 »'], ['retenir', 'À retenir'],
    ],
    retenir: 6,
  });
  const { t, hit, ev } = P;

  // 1 · DEUX QUESTIONS
  ev.question = {
    ...ev.question,
    phrase: t('question', 0, 0.5),
    gauche: hit(t('question', 0, 2), 'note', { k: 1, pan: -0.4 }),
    droite: hit(t('question', 1, 1), 'note', { k: 2, pan: 0.4 }),
    reponse: hit(t('question', 2, 0), 'accord'),
  };

  // 2 · CBR : la courbe se trace sur deux mesures ; au milieu, le plan chargé
  ev.cbr = {
    ...ev.cbr,
    phrase: hit(t('cbr', 0, 1), 'note', { k: 1, pan: 0.4 }),
    trace0: t('cbr', 1, 0), trace1: t('cbr', 3, 0),
    bourrage: hit(t('cbr', 1, 2), 'note', { k: 2, pan: 0.4 }),
    chute: hit(t('cbr', 2, 0), 'thud', { pan: -0.2 }),
    usages: hit(t('cbr', 3, 0), 'note', { k: 3, pan: 0.4 }),
    piege: hit(t('cbr', 4, 0), 'alerte'),
  };

  // 3 · VBR : même séquence, le débit suit la complexité
  ev.vbr = {
    ...ev.vbr,
    phrase: hit(t('vbr', 0, 1), 'note', { k: 1, pan: 0.4 }),
    trace0: t('vbr', 1, 0), trace1: t('vbr', 3, 0),
    suit: hit(t('vbr', 1, 2), 'note', { k: 2, pan: 0.4 }),
    qualite: hit(t('vbr', 2, 0), 'accord', { pan: 0.3 }),
    bluray: hit(t('vbr', 3, 0), 'note', { k: 3, pan: 0.4 }),
    formule: hit(t('vbr', 3, 2), 'note', { k: 1, pan: -0.4 }),
    exemple: hit(t('vbr', 4, 0), 'note', { k: 2, pan: -0.3 }),
    resultat: hit(t('vbr', 4, 2), 'pop', { pan: 0.1 }),
    piege: hit(t('vbr', 5, 0), 'alerte', { pan: 0.4 }),
  };

  // 4 · UNE OU DEUX PASSES, QUALITÉ CONSTANTE : trois volets
  ev.passes = {
    ...ev.passes,
    a: hit(t('passes', 0, 1), 'note', { k: 1, pan: -0.5 }),
    b: hit(t('passes', 1, 0), 'note', { k: 2 }),
    c: hit(t('passes', 2, 0), 'note', { k: 3, pan: 0.5 }),
    piege: hit(t('passes', 3, 0), 'alerte'),
  };

  // 5 · LE QP : le curseur glisse de 22 à 28 (pas × 2), puis à 34 (pas × 4), puis vers les blocs visibles
  ev.qp = {
    ...ev.qp,
    intro: hit(t('qp', 0, 1), 'note', { k: 1, pan: 0.3 }),
    formule: hit(t('qp', 1, 0), 'note', { k: 2, pan: 0.3 }),
    glisse1: hit(t('qp', 1, 2), 'presse', { len: P.BEAT * 1.6, pan: -0.4 }),
    double: hit(t('qp', 2, 0), 'accord', { pan: 0.3 }),
    glisse2: hit(t('qp', 2, 2), 'presse', { len: P.BEAT * 1.6, pan: -0.4 }),
    quadruple: hit(t('qp', 3, 0), 'pop', { pan: 0.3 }),
    glisse3: t('qp', 3, 1), glisse3fin: t('qp', 3, 2.5),
  };

  // 6 · LE TAMPON (sans batterie)
  ev.tampon = {
    ...ev.tampon,
    phrase: hit(t('tampon', 0, 1), 'note', { k: 1, pan: 0.4 }),
    poids: hit(t('tampon', 1, 0), 'note', { k: 2, pan: 0.4 }),
    garanties: hit(t('tampon', 2, 0), 'note', { k: 3, pan: 0.4 }),
    formule: hit(t('tampon', 2, 2), 'note', { k: 2, pan: 0.4 }),
    exemple: hit(t('tampon', 3, 0), 'accord', { pan: 0.4 }),
  };

  // 7 · LE PROFIL : six boîtes qui s'emboîtent, de Baseline à High 4:4:4, une par temps
  ev.profil = {
    ...ev.profil,
    phrase: hit(t('profil', 0, 1), 'note', { k: 1, pan: 0.4 }),
    boites: [0, 1, 2, 3, 4, 5].map((i) => hit(t('profil', 0, 2 + i), 'note', { k: i, pan: -0.5 + i * 0.1 })),
    ok: hit(t('profil', 2, 0), 'pop', { pan: 0.4 }),
    ko: hit(t('profil', 2, 2), 'thud', { pan: 0.4 }),
    reperes: hit(t('profil', 3, 0), 'note', { k: 2, pan: 0.4 }),
  };

  // 8 · LE NIVEAU : la formule, l'exemple 1080p50, puis la table des niveaux
  ev.niveau = {
    ...ev.niveau,
    phrase: hit(t('niveau', 0, 1), 'note', { k: 1, pan: -0.3 }),
    formule: hit(t('niveau', 1, 0), 'note', { k: 2, pan: -0.3 }),
    etape1: hit(t('niveau', 2, 0), 'note', { k: 3, pan: -0.3 }),
    etape2: hit(t('niveau', 2, 2), 'note', { k: 4, pan: -0.1 }),
    echelle: hit(t('niveau', 3, 0), 'note', { k: 1 }),
    trop: hit(t('niveau', 3, 2), 'thud', { pan: -0.2 }),
    ok: hit(t('niveau', 4, 0), 'accord', { pan: 0.1 }),
    dmax: hit(t('niveau', 4, 2), 'note', { k: 3, pan: -0.3 }),
    piege: hit(t('niveau', 5, 0), 'alerte', { pan: 0.4 }),
  };

  // 9 · LIRE « High@L4.1 »
  ev.lecture = {
    ...ev.lecture,
    mention: hit(t('lecture', 0, 1), 'pop'),
    profil: hit(t('lecture', 1, 0), 'accord', { pan: -0.3 }),
    niveau: hit(t('lecture', 1, 2), 'note', { k: 3, pan: 0.3 }),
    hevc: hit(t('lecture', 2, 0), 'note', { k: 2, pan: -0.3 }),
    tier: hit(t('lecture', 2, 1.5), 'note', { k: 4, pan: 0.3 }),
    regle: hit(t('lecture', 3, 0), 'note', { k: 1 }),
    bluray: hit(t('lecture', 3, 1.5), 'note', { k: 3, pan: 0.4 }),
  };

  // ---------- repères (planche de contrôle et vérification de la synchronisation) ----------
  // sync 'av' : seulement des coups sur le premier temps d'une mesure, dans une section avec batterie.
  P.markers = {
    titre: t('titre', 1, 2),
    question: t('question', 2, 2.5),
    cbr_chute: { t: ev.cbr.chute, sync: 'av' },
    cbr: t('cbr', 4, 2),
    vbr_qualite: { t: ev.vbr.qualite, sync: 'av' },
    vbr: t('vbr', 5, 2),
    passes: t('passes', 3, 2),
    qp_double: { t: ev.qp.double, sync: 'av' },
    qp: t('qp', 3, 3.5),
    tampon: t('tampon', 3, 2),
    profil: t('profil', 3, 2),
    niveau_ok: { t: ev.niveau.ok, sync: 'av' },
    niveau: t('niveau', 5, 2),
    lecture_profil: { t: ev.lecture.profil, sync: 'av' },
    lecture: t('lecture', 3, 3),
    retenir: t('retenir', 3, 2),
    fin: t('fin', 1, 3.5),
  };

  if (typeof module !== 'undefined') module.exports = P; else globalThis.SCORE = P;
})();
