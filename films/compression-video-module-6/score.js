// LA PARTITION — source unique pour la musique ET l'image.
// Film : « Compression vidéo · Module 6 · Codecs et conteneurs : ce qu'il y a dans le fichier »
// Chaque apparition à l'écran est un événement daté ici ; la musique (films/_commun/musique.js)
// fabrique le son des mêmes événements. Changer un temps ici déplace l'image et le son ensemble.
// Tout ce qui est commun aux films (horloge, harmonie, thème, titre, « À retenir », fin) vient de partition.js.
(function () {
  const Partition = typeof require !== 'undefined' ? require('./partition') : globalThis.Partition;
  const P = Partition.creer({
    app: 'Compression vidéo', module: 6, dernier: true,
    titre: 'Codecs et conteneurs', sousTitre: 'Ce qu’il y a dans le fichier.',
    transpose: 3,
    // le plan du film, en mesures (1 mesure = 3 s)
    plan: [
      ['titre', 2],
      ['conteneur', 4], // 1 · Codec et conteneur : l'enveloppe et la langue
      ['pistes', 4], // 2 · Pistes et multiplexage
      ['extension', 4], // 3 · L'extension, renommer, rewrap
      ['mediainfo', 3], // 4 · Lire une fiche MediaInfo
      ['conteneurs', 4], // 5 · Cinq conteneurs
      ['familles', 5], // 6 · Trois familles de codecs
      ['debits', 4], // 7 · Les débits à connaître
      ['proxy', 5], // 8 · Proxy et générations
      ['total', 5], // 9 · Le débit du fichier
      ['retenir', 4],
      ['fin', 2],
    ],
    calme: ['conteneur'], // la batterie entre avec les pistes
    chapitres: [
      ['conteneur', 'Codec et conteneur'], ['pistes', 'Pistes et multiplexage'], ['extension', 'L’extension et le rewrap'],
      ['mediainfo', 'Lire une fiche MediaInfo'], ['conteneurs', 'Cinq conteneurs'], ['familles', 'Trois familles de codecs'],
      ['debits', 'Les débits à connaître'], ['proxy', 'Proxy et générations'], ['total', 'Le débit du fichier'], ['retenir', 'À retenir'],
    ],
    retenir: 6,
  });
  const { t, hit, ev, BEAT } = P;

  // 1 · CODEC ET CONTENEUR : le fichier s'ouvre sur ses quatre pistes
  ev.conteneur = {
    ...ev.conteneur,
    fichier: hit(t('conteneur', 0, 0.5), 'note', { k: 1, pan: -0.4 }),
    texteConteneur: t('conteneur', 0, 1.5),
    pistes: [0, 1, 2, 3].map((i) => hit(t('conteneur', 1, i), 'note', { k: i + 1, pan: -0.5 + i * 0.1 })),
    codec: hit(t('conteneur', 2, 0), 'pop', { pan: 0.4 }),
    phrase: hit(t('conteneur', 3, 0), 'note', { k: 2 }),
  };

  // 2 · PISTES ET MULTIPLEXAGE : dix morceaux s'entrelacent dans le fichier, un tic chacun
  ev.pistes = {
    ...ev.pistes,
    phrase: t('pistes', 0, 1),
    morceaux: Array.from({ length: 10 }, (_, j) => hit(t('pistes', 1, j * 0.375), 'tick', { pitch: 0.85 + j * 0.06, pan: -0.5 + j * 0.11 })),
    multiplexe: hit(t('pistes', 2, 0), 'accord'),
    index: hit(t('pistes', 2, 2), 'note', { k: 2, pan: -0.5 }),
    lecture: hit(t('pistes', 3, 0), 'pop', { pan: 0.1 }),
  };

  // 3 · L'EXTENSION : renommer ne change rien ; le rewrap change d'enveloppe sans réencoder
  ev.extension = {
    ...ev.extension,
    phrase: t('extension', 0, 0.5),
    cartes: hit(t('extension', 0, 2), 'note', { k: 1, pan: -0.4 }),
    renomme: hit(t('extension', 1, 0), 'pop', { pan: -0.4 }),
    piege: hit(t('extension', 1, 2), 'alerte', { pan: -0.3 }),
    rewrap0: hit(t('extension', 2, 0.5), 'presse', { len: BEAT * 2, monte: true, pan: 0.4 }),
    rewrap1: hit(t('extension', 2, 2.5), 'note', { k: 3, pan: 0.4 }),
    sansPerte: hit(t('extension', 3, 0), 'accord', { pan: 0.4 }),
  };

  // 4 · MEDIAINFO : la fiche se remplit ligne par ligne, puis on y lit le conteneur et le codec
  ev.mediainfo = {
    ...ev.mediainfo,
    phrase: t('mediainfo', 0, 0.3),
    lignes: [0, 1, 2, 3, 4].map((i) => hit(t('mediainfo', 0, 1 + i * 0.5), 'tick', { pitch: 0.9 + i * 0.08, pan: -0.4 })),
    conteneur: hit(t('mediainfo', 1, 0), 'note', { k: 2, pan: 0.4 }),
    codec: hit(t('mediainfo', 2, 0), 'pop', { pan: 0.4 }),
    reste: hit(t('mediainfo', 2, 1.5), 'note', { k: 3, pan: 0.4 }),
  };

  // 5 · CINQ CONTENEURS : une ligne, une note
  ev.conteneurs = {
    ...ev.conteneurs,
    lignes: [0, 1, 2, 3, 4].map((i) => hit(t('conteneurs', 0, 1.5 + i * 1.5), 'cloche', { degre: i, pan: -0.3 + i * 0.15 })),
    piege: hit(t('conteneurs', 2, 2.5), 'alerte'),
  };

  // 6 · TROIS FAMILLES DE CODECS : tournage → montage → diffusion
  ev.familles = {
    ...ev.familles,
    tournage: hit(t('familles', 0, 1), 'note', { k: 1, pan: -0.5 }),
    tournageDetail: hit(t('familles', 0, 3), 'note', { k: 2, pan: -0.5 }),
    montage: hit(t('familles', 1, 2), 'note', { k: 2, pan: 0 }),
    montageImages: [0, 1, 2, 3, 4, 5, 6].map((i) => hit(t('familles', 2, i * 0.25), 'tick', { pitch: 1.1, pan: 0 })),
    montageDetail: t('familles', 2, 2),
    diffusion: hit(t('familles', 3, 0), 'pop', { pan: 0.5 }),
    gop: hit(t('familles', 3, 1.5), 'note', { k: 3, pan: 0.5 }),
    diffusionDetail: t('familles', 3, 2.5),
    piege: hit(t('familles', 4, 0), 'alerte'),
  };

  // 7 · LES DÉBITS : l'échelle du ProRes monte, barre après barre
  ev.debits = {
    ...ev.debits,
    titre: t('debits', 0, 0.5),
    barres: [0, 1, 2, 3, 4, 5].map((i) => hit(t('debits', 0, 2 + i * 0.5), 'tick', { pitch: 0.8 + i * 0.1, pan: -0.3 + i * 0.12 })),
    hq: hit(t('debits', 1, 1.5), 'note', { k: 4 }),
    comparaison: [hit(t('debits', 2, 0), 'note', { k: 1, pan: -0.3 }), hit(t('debits', 2, 1.5), 'note', { k: 2, pan: -0.3 })],
    reperes: hit(t('debits', 3, 0), 'accord'),
  };

  // 8 · PROXY ET GÉNÉRATIONS
  ev.proxy = {
    ...ev.proxy,
    originaux: hit(t('proxy', 0, 1), 'note', { k: 1, pan: -0.5 }),
    copie: hit(t('proxy', 0, 2), 'presse', { len: BEAT * 0.9, pan: -0.2 }),
    proxys: hit(t('proxy', 0, 3), 'pop', { pan: -0.1 }),
    montage: hit(t('proxy', 1, 0), 'note', { k: 3, pan: 0.3 }),
    export: hit(t('proxy', 1, 2), 'accord'),
    transcoder: hit(t('proxy', 2, 1), 'note', { k: 1, pan: -0.4 }),
    generations: [hit(t('proxy', 2, 2), 'note', { k: 1, pan: -0.5 }), hit(t('proxy', 3, 0), 'note', { k: 2, pan: -0.2 }), hit(t('proxy', 3, 1), 'note', { k: 3, pan: 0.2 }), hit(t('proxy', 3, 2), 'note', { k: 4, pan: 0.5 })],
    defauts: hit(t('proxy', 4, 0), 'thud'),
  };

  // 9 · LE DÉBIT DU FICHIER : l'audio, le total, puis les gigaoctets par heure
  ev.total = {
    ...ev.total,
    audio: hit(t('total', 0, 0.5), 'note', { k: 1, pan: -0.4 }),
    exemple: hit(t('total', 1, 0), 'note', { k: 2, pan: -0.3 }),
    audioResultat: hit(t('total', 1, 2), 'pop', { pan: 0.3 }),
    somme: hit(t('total', 2, 0), 'note', { k: 3, pan: -0.4 }),
    barre: hit(t('total', 2, 1.5), 'presse', { len: BEAT * 1.2, monte: true }),
    totalResultat: hit(t('total', 3, 0), 'accord'),
    astuce: hit(t('total', 3, 2), 'note', { k: 2, pan: -0.4 }),
    goh: hit(t('total', 4, 0), 'accord', { pan: 0.3 }),
  };

  // ---------- moments nommés (render.js stills @nom, board, verify) ----------
  P.markers = {
    titre: t('titre', 1, 3),
    conteneur: t('conteneur', 3, 2),
    pistes_entrelace: t('pistes', 2, 1),
    pistes: t('pistes', 3, 2),
    extension_renomme: t('extension', 1, 3),
    sans_perte: { t: ev.extension.sansPerte, sync: 'av' },
    extension: t('extension', 3, 2),
    codec_lu: { t: ev.mediainfo.codec, sync: 'av' },
    mediainfo: t('mediainfo', 2, 3),
    conteneurs: t('conteneurs', 3, 2),
    familles_montage: t('familles', 2, 3),
    familles: t('familles', 4, 2),
    debits: t('debits', 3, 2),
    proxy_export: t('proxy', 1, 3.5),
    defauts: { t: ev.proxy.defauts, sync: 'av' },
    proxy: t('proxy', 4, 2),
    total_audio: t('total', 1, 3.5),
    total_resultat: { t: ev.total.totalResultat, sync: 'av' },
    total: t('total', 4, 2),
    retenir: t('retenir', 3, 2),
    fin: t('fin', 1, 3.5),
  };

  if (typeof module !== 'undefined') module.exports = P; else globalThis.SCORE = P;
})();
