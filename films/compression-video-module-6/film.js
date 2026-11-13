// LE FILM — dessine l'image de l'instant t. Tout est une fonction pure de t : n'importe quelle
// image peut être calculée dans n'importe quel ordre, et elle tombe toujours avec la musique.
// Les temps viennent tous de score.js (SCORE.ev) ; le style et les scènes communes (titre,
// « À retenir », fin, montage) viennent de kit.js (K).
// Les exemples chiffrés sont ceux du cours (modules/tes-compression-video/contenu.js, module 6).
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, K = globalThis.K;
  const { clamp, lerp, ease, pulse } = U;
  const E = S.ev, C = K.C, W = G.W, MX = K.MX;
  const dernierTemps = (t) => S.clock.OFFSET + Math.floor((t - S.clock.OFFSET) / S.BEAT) * S.BEAT; // le temps (musical) qui vient de tomber
  const IPB = { I: C.rouge, P: C.azur, B: C.vert }; // les couleurs des images I, P, B (celles du cours)

  // Une petite icône de fichier (feuille au coin plié)
  function fichier(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = c; ctx.lineWidth = s * 0.09; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.5, 0); ctx.lineTo(s * 0.78, s * 0.28); ctx.lineTo(s * 0.78, s); ctx.lineTo(0, s); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.5, 0); ctx.lineTo(s * 0.5, s * 0.28); ctx.lineTo(s * 0.78, s * 0.28); ctx.stroke();
    ctx.restore();
  }
  // Une rangée de pastilles ; renvoie la largeur occupée
  function pastilles(ctx, liste, x, y, o) { let px = x; liste.forEach((f) => { px += K.puce(ctx, f, px, y, o) + 12; }); return px - x; }

  /* ==========================================================================
     1 · CODEC ET CONTENEUR : l'enveloppe et la langue
     ========================================================================== */
  const PISTES = [['Vidéo', 'ProRes', C.bleu, true], ['Audio 1-2', 'PCM', C.vert, true], ['Timecode', '10:00:00:00', C.ora, false], ['Métadonnées', 'caméra, objectif, date', C.vio, false]];
  function scConteneur(ctx, t) {
    const e = E.conteneur;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 1, 'Codec et conteneur', C.bleu);

    // le fichier : une enveloppe qui range quatre pistes
    K.entre(ctx, t, e.fichier, () => {
      K.carte(ctx, MX, 250, 880, 590, { r: 30, s: K.rgba(C.bleu, 0.6), f: 'rgba(255,255,255,.04)', lw: 3 });
      fichier(ctx, 152, 284, 44, C.bleu);
      K.t(ctx, 'rush_A001.mov', 206, 324, { s: 44, w: 800 });
      K.puce(ctx, 'le conteneur', 950, 308, { s: 28, c: C.bleu, a: 'right' });
    }, { zoom: 0.12, cx: 550, cy: 545 });
    const codecVu = t >= e.codec;
    PISTES.forEach((p, i) => K.entre(ctx, t, e.pistes[i], () => {
      const y = 356 + i * 104;
      K.carte(ctx, 150, y, 800, 88, { r: 18, s: K.rgba(p[2], 0.6), f: K.rgba(p[2], 0.08) });
      K.rr(ctx, 150, y, 14, 88, 7); ctx.fillStyle = p[2]; ctx.fill();
      K.t(ctx, p[0], 190, y + 57, { s: 38, w: 700, c: p[2] });
      // le codec de la piste : il s'allume quand le mot « codec » arrive
      if (p[3]) K.puce(ctx, p[1], 926, y + 44, { s: 32, c: codecVu ? C.vio : '#a1a1a6', plein: codecVu, a: 'right' });
      else K.t(ctx, p[1], 926, y + 56, { s: 32, c: C.txt2, a: 'right' });
    }, { dx: -40, dy: 0, d: 0.4 }));
    K.entre(ctx, t, e.pistes[3] + 0.35, () => K.t(ctx, '+ un index : il dit où se trouve chaque image', 152, 808, { s: 28, c: C.mut }), { dy: 0 });
    K.onde(ctx, 870, 400, t, e.codec, { c: C.vio, r: 150 }); K.onde(ctx, 880, 504, t, e.codec + 0.08, { c: C.vio, r: 150 });

    // les deux mots
    const x = 1050;
    K.entre(ctx, t, e.texteConteneur, () => {
      K.t(ctx, 'Conteneur', x, 326, { s: 84, w: 800, c: C.bleu });
      K.riche(ctx, ['= ', ['l’enveloppe', { c: C.txt, w: 800 }]], x, 392, { s: 50, w: 700, c: C.mut });
      K.t(ctx, 'Il range les pistes, l’index', x, 446, { s: 34, c: C.txt2 }); K.t(ctx, 'et les métadonnées.', x, 488, { s: 34, c: C.txt2 });
      pastilles(ctx, ['.mov', '.mp4', '.mxf'], x, 546, { s: 30, c: C.bleu });
    }, { dx: 40, dy: 0, d: 0.45 });
    K.entre(ctx, t, e.codec, () => {
      K.t(ctx, 'Codec', x, 668, { s: 84, w: 800, c: C.vio });
      K.riche(ctx, ['= ', ['la langue', { c: C.txt, w: 800 }]], x, 734, { s: 50, w: 700, c: C.mut });
      K.t(ctx, 'Il compresse une piste.', x, 788, { s: 34, c: C.txt2 });
      pastilles(ctx, ['ProRes', 'H.264', 'AAC'], x, 846, { s: 30, c: C.vio });
    }, { zoom: 0.2, cx: x + 250, cy: 740, d: 0.4 });

    K.entre(ctx, t, e.phrase, () => K.t(ctx, 'Un codec peut voyager dans plusieurs conteneurs ; un conteneur accueille plusieurs codecs.', 960, 940, { s: 36, c: C.txt, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     2 · PISTES ET MULTIPLEXAGE : les pistes sont découpées et entrelacées
     ========================================================================== */
  const SEQ = 'VAVAVAVTVA'; // l'ordre des morceaux dans le fichier (schéma du cours)
  const RANG = { V: { y: 278, c: C.bleu, nom: 'Vidéo', l: 170, s: 'V' }, A: { y: 342, c: C.vert, nom: 'Audio', l: 100, s: 'A' }, T: { y: 406, c: C.ora, nom: 'Timecode', l: 100, s: 'TC' } };
  function scPistes(ctx, t) {
    const e = E.pistes;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 2, 'Pistes et multiplexage', C.vert);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['Chaque flux (vidéo, audio, timecode…) est une ', ['piste', { c: C.vert, w: 800 }], '.'], MX, 248, { s: 36, c: C.txt }), { dy: 0, dx: -20 });

    // les trois pistes, en haut
    K.entre(ctx, t, e.debut + 0.2, () => { for (const k of 'VAT') K.t(ctx, RANG[k].nom, MX, RANG[k].y + 35, { s: 32, w: 700, c: RANG[k].c }); }, { dy: 0 });
    // le fichier, en bas
    K.entre(ctx, t, e.morceaux[0] - 0.4, () => {
      K.t(ctx, 'Le fichier', MX, 540, { s: 32, w: 700, c: C.txt2 });
      K.carte(ctx, MX, 556, 1700, 96, { r: 20, f: 'rgba(255,255,255,.04)' });
    }, { dy: 20 });
    // les morceaux : chacun quitte sa piste et prend sa place dans le fichier
    const n = { V: 0, A: 0, T: 0 }; let xf = 300;
    const a0 = K.app(t, e.debut + 0.2, 0.4);
    [...SEQ].forEach((k, j) => {
      const r = RANG[k], x0 = 330 + n[k]++ * (r.l + 8), x1 = xf; xf += r.l + 8;
      const p = ease.inOutCubic(clamp((t - e.morceaux[j]) / 0.42));
      // la place vide laissée dans la piste
      if (p > 0) { ctx.save(); ctx.globalAlpha *= p * 0.5; K.rr(ctx, x0, r.y, r.l, 48, 8); ctx.setLineDash([8, 8]); ctx.strokeStyle = r.c; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      const x = lerp(x0, x1, p), y = lerp(r.y, 572, p), h = lerp(48, 64, p);
      ctx.save(); ctx.globalAlpha *= a0;
      K.rr(ctx, x, y, r.l, h, 8); ctx.fillStyle = r.c; ctx.fill();
      K.t(ctx, r.s, x + r.l / 2, y + h / 2 + 2, { s: 26, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
      ctx.restore();
    });
    K.eclair(ctx, t, e.multiplexe);
    K.entre(ctx, t, e.multiplexe, () => K.riche(ctx, ['Les pistes sont découpées, puis ', ['entrelacées', { c: C.vert, w: 800 }], ' : c’est le ', ['multiplexage', { c: C.txt, w: 800 }], '.'], MX, 722, { s: 40, c: C.txt }), { dy: 20 });
    // l'index et les horodatages
    K.entre(ctx, t, e.index, () => {
      K.carte(ctx, 126, 568, 160, 72, { r: 12, s: C.jaune, f: K.rgba(C.jaune, 0.16), lw: 3 });
      K.t(ctx, 'index', 206, 606, { s: 30, w: 800, c: C.jaune, a: 'center', b: 'middle' });
    }, { zoom: 0.4, cx: 206, cy: 604, d: 0.35 });
    K.onde(ctx, 206, 604, t, e.index, { c: C.jaune, r: 150 });
    K.entre(ctx, t, e.index + 0.15, () => K.t(ctx, 'Des horodatages gardent l’image et le son synchronisés ; l’index dit où trouver chaque image.', MX, 780, { s: 34, c: C.txt2 }), { dy: 16 });

    // à la lecture : le démultiplexeur sépare les pistes
    K.entre(ctx, t, e.lecture, () => {
      K.t(ctx, 'À la lecture', MX, 908, { s: 36, w: 800 });
      K.carte(ctx, 400, 860, 340, 76, { r: 18, s: K.rgba(C.jaune, 0.6), f: K.rgba(C.jaune, 0.08) });
      K.t(ctx, 'démultiplexeur', 570, 900, { s: 32, w: 700, c: C.jaune, a: 'center', b: 'middle' });
      K.fleche(ctx, 750, 888, 852, 866, { c: C.bleu }); K.fleche(ctx, 750, 908, 852, 932, { c: C.vert });
      K.carte(ctx, 862, 838, 360, 56, { r: 16, s: K.rgba(C.bleu, 0.7), f: K.rgba(C.bleu, 0.1) }); K.t(ctx, 'décodeur vidéo', 1042, 868, { s: 30, w: 700, c: C.bleu, a: 'center', b: 'middle' });
      K.carte(ctx, 862, 906, 360, 56, { r: 16, s: K.rgba(C.vert, 0.7), f: K.rgba(C.vert, 0.1) }); K.t(ctx, 'décodeur audio', 1042, 936, { s: 30, w: 700, c: C.vert, a: 'center', b: 'middle' });
      K.fleche(ctx, 1236, 866, 1300, 866, { c: C.bleu }); K.t(ctx, 'l’image', 1318, 877, { s: 32, w: 700, c: C.bleu });
      K.fleche(ctx, 1236, 934, 1300, 934, { c: C.vert }); K.t(ctx, 'le son', 1318, 945, { s: 32, w: 700, c: C.vert });
    }, { dy: 24 });
  }

  /* ==========================================================================
     3 · L'EXTENSION : renommer ne change rien ; le rewrap change d'enveloppe sans perte
     ========================================================================== */
  function scExtension(ctx, t) {
    const e = E.extension;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 3, 'L’extension ne dit pas tout', C.ora);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['L’extension (.mov, .mp4, .mxf…) désigne le ', ['conteneur', { c: C.bleu, w: 800 }], ', presque jamais le codec.'], MX, 270, { s: 40, c: C.txt }), { dy: 0, dx: -20 });

    K.entre(ctx, t, e.cartes, () => {
      // --- à gauche : renommer ---
      K.carte(ctx, MX, 310, 820, 510, { s: K.rgba(C.ora, 0.5) });
      K.t(ctx, 'Renommer le fichier', 150, 378, { s: 44, w: 800, c: C.ora });
      const renomme = t >= e.renomme, l = K.t(ctx, 'rush_A001', 150, 468, { s: 60, w: 800 });
      const z = renomme ? 1 + 0.3 * pulse(t, e.renomme, 8) : 1;
      ctx.save(); ctx.translate(150 + l + 70, 448); ctx.scale(z, z);
      K.t(ctx, renomme ? '.mp4' : '.mov', -70, 20, { s: 60, w: 800, c: renomme ? C.ora : C.bleu });
      ctx.restore();
      [['Vidéo', 'ProRes', C.bleu], ['Audio', 'PCM', C.vert]].forEach((p, i) => {
        const y = 510 + i * 82;
        K.carte(ctx, 150, y, 740, 66, { r: 16, s: K.rgba(p[2], 0.6), f: K.rgba(p[2], 0.08) });
        K.t(ctx, p[0], 180, y + 44, { s: 34, w: 700, c: p[2] });
        K.puce(ctx, p[1], 870, y + 33, { s: 28, c: C.vio, plein: true, a: 'right' });
      });
      K.entre(ctx, t, e.renomme + 0.3, () => K.riche(ctx, ['Dedans, rien n’a changé : toujours du ', ['ProRes', { c: C.vio, w: 800 }], '.'], 150, 746, { s: 36, c: C.txt }), { dy: 14 });

      // --- à droite : le rewrap ---
      K.carte(ctx, 990, 310, 820, 510, { s: K.rgba(C.vert, 0.5) });
      K.t(ctx, 'Rewrap (ou remux)', 1030, 378, { s: 44, w: 800, c: C.vert });
      [[1030, '.mxf', C.ora], [1470, '.mov', C.bleu]].forEach((b) => {
        K.carte(ctx, b[0], 412, 300, 220, { r: 22, s: K.rgba(b[2], 0.7), f: 'rgba(255,255,255,.03)', lw: 3 });
        K.puce(ctx, b[1], b[0] + 150, 412, { s: 28, c: b[2], plein: true, a: 'center' });
      });
      K.fleche(ctx, 1346, 522, 1454, 522, { c: C.vert, lw: 6 });
      // les deux pistes passent d'une enveloppe à l'autre, intactes
      const p = K.va(t, e.rewrap0, e.rewrap1, 0, 1);
      [['Vidéo · ProRes', C.bleu, 458], ['Audio · PCM', C.vert, 540]].forEach((b) => {
        const x = lerp(1050, 1490, p);
        K.rr(ctx, x, b[2], 260, 62, 12); ctx.fillStyle = b[1]; ctx.fill();
        K.t(ctx, b[0], x + 130, b[2] + 33, { s: 28, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
      });
      K.entre(ctx, t, e.rewrap0, () => K.t(ctx, 'Changer d’enveloppe, sans réencoder.', 1030, 696, { s: 36, c: C.txt }), { dy: 14 });
      K.entre(ctx, t, e.sansPerte, () => K.t(ctx, 'Rapide et sans perte', 1030, 776, { s: 58, w: 800, c: C.vert }), { zoom: 0.25, cx: 1330, cy: 756, d: 0.4 });
    }, { dy: 30 });
    K.onde(ctx, 150 + 400, 448, t, e.renomme, { c: C.ora, r: 200 });
    K.onde(ctx, 1330, 756, t, e.sansPerte, { c: C.vert, r: 420 });
    K.eclair(ctx, t, e.sansPerte);
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : renommer « .mov » en « .mp4 » ne change ', ['pas le codec', { c: C.jaune }], '.'], 960, 908, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     4 · MEDIAINFO : la fiche du fichier, ligne par ligne
     ========================================================================== */
  const FICHE = [['Nom', 'INTERVIEW_A003.mov'], ['Conteneur', 'QuickTime'], ['Format', 'ProRes'], ['Profil', '422 HQ'], ['Débit', '184 Mb/s']];
  function scMediainfo(ctx, t) {
    const e = E.mediainfo;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 4, 'Lire une fiche MediaInfo', C.bleu);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['Pour savoir ce qu’il y a dedans, on ouvre le fichier dans ', ['MediaInfo', { c: C.txt, w: 800 }], '.'], MX, 268, { s: 40, c: C.txt }), { dy: 0, dx: -20 });

    // la fiche
    K.entre(ctx, t, e.debut + 0.3, () => {
      K.carte(ctx, MX, 306, 930, 560, { r: 26, f: '#050607', s: 'rgba(255,255,255,.22)' });
      K.t(ctx, 'MediaInfo — extrait', 150, 364, { s: 28, w: 700, c: C.mut });
    }, { dy: 24 });
    FICHE.forEach((l, i) => {
      const y = 448 + i * 86, estCont = i === 1 && t >= e.conteneur, estCodec = i === 2 && t >= e.codec, c = estCont ? C.bleu : estCodec ? C.vio : null;
      if (c) { ctx.save(); ctx.globalAlpha *= K.app(t, i === 1 ? e.conteneur : e.codec, 0.3); K.rr(ctx, 130, y - 56, 890, 80, 14); ctx.fillStyle = K.rgba(c, 0.2); ctx.fill(); ctx.strokeStyle = K.rgba(c, 0.8); ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
      K.entre(ctx, t, e.lignes[i], () => {
        K.t(ctx, l[0], 156, y, { s: 38, c: c || C.mut, w: c ? 700 : 400 });
        K.t(ctx, ':  ' + l[1], 420, y, { s: 38, w: c ? 800 : 700, c: c || C.txt });
      }, { dx: -24, dy: 0, d: 0.3 });
    });

    // ce qu'on y lit
    const x = 1100;
    K.entre(ctx, t, e.conteneur, () => {
      K.carte(ctx, x, 322, 710, 196, { s: K.rgba(C.bleu, 0.6), f: K.rgba(C.bleu, 0.1) });
      K.t(ctx, 'LE CONTENEUR', x + 36, 374, { s: 26, w: 700, c: C.mut, ls: 3 });
      K.t(ctx, 'QuickTime = .mov', x + 36, 440, { s: 54, w: 800, c: C.bleu });
      K.t(ctx, 'l’enveloppe du fichier', x + 36, 486, { s: 30, c: C.txt2 });
    }, { dx: 40, dy: 0, d: 0.4 });
    K.entre(ctx, t, e.codec, () => {
      K.carte(ctx, x, 546, 710, 196, { s: K.rgba(C.vio, 0.6), f: K.rgba(C.vio, 0.1) });
      K.t(ctx, 'LE CODEC', x + 36, 598, { s: 26, w: 700, c: C.mut, ls: 3 });
      K.t(ctx, 'ProRes', x + 36, 664, { s: 54, w: 800, c: C.vio });
      K.t(ctx, 'la ligne « Format » : la compression', x + 36, 710, { s: 30, c: C.txt2 });
    }, { zoom: 0.2, cx: x + 355, cy: 644, d: 0.4 });
    K.onde(ctx, x + 355, 644, t, e.codec, { c: C.vio, r: 420 });
    K.eclair(ctx, t, e.codec);
    K.entre(ctx, t, e.reste, () => K.riche(ctx, ['Et aussi : profil ', ['422 HQ', { c: C.txt, w: 800 }], ', débit ', ['184 Mbit/s', { c: C.ora, w: 800 }], '.'], x, 820, { s: 36, c: C.txt2 }), { dy: 16 });
  }

  /* ==========================================================================
     5 · CINQ CONTENEURS
     ========================================================================== */
  const CONT = [
    ['.mov', 'MOV (QuickTime)', 'tournage et postproduction', 'l’enveloppe du ProRes', C.bleu],
    ['.mp4', 'MP4', 'web, téléphones, plateformes', 'H.264, HEVC ou AV1 + AAC', C.vert],
    ['.mxf', 'MXF', 'broadcast : caméras, Avid, PAD', 'DCP : JPEG 2000', C.ora],
    ['.ts', 'MPEG-TS', 'diffusion : TNT, satellite, IPTV', 'paquets de 188 octets', C.rose],
    ['.mkv', 'MKV (Matroska)', 'libre et souple', 'archivage, grand public', C.vio],
  ];
  function scConteneurs(ctx, t) {
    const e = E.conteneurs;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 5, 'Cinq conteneurs', C.bleu);
    CONT.forEach((r, i) => {
      const y = 244 + i * 118, h = 102;
      K.entre(ctx, t, e.lignes[i], () => {
        K.carte(ctx, MX, y, W - 2 * MX, h, { r: 24, s: K.rgba(r[4], 0.45) });
        K.puce(ctx, r[0], 240, y + h / 2, { s: 38, c: r[4], plein: true, a: 'center' });
        K.t(ctx, r[1], 370, y + 67, { s: 46, w: 800 });
        K.t(ctx, r[2], 800, y + 64, { s: 36, c: C.txt });
        K.t(ctx, r[3], W - MX - 40, y + 62, { s: 30, c: r[4], a: 'right' });
      }, { dx: -50, dy: 0, d: 0.45 });
      K.onde(ctx, 240, y + h / 2, t, e.lignes[i], { c: r[4], r: 110, lw: 4 });
    });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : « H.264 » n’est pas un conteneur, ', ['« MP4 » n’est pas un codec', { c: C.jaune }], '.'], 960, 916, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     6 · TROIS FAMILLES DE CODECS : tournage → montage → diffusion
     ========================================================================== */
  // une suite d'images (I, P, B) de 52 × 64
  function images(ctx, x, y, types, t, t0, pas) {
    [...types].forEach((k, i) => K.entre(ctx, t, t0 + i * pas, () => {
      K.rr(ctx, x + i * 60, y, 52, 64, 8); ctx.fillStyle = IPB[k]; ctx.fill();
      K.t(ctx, k, x + i * 60 + 26, y + 34, { s: 30, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
    }, { zoom: 0.4, cx: x + i * 60 + 26, cy: y + 32, d: 0.25 }));
  }
  function camera(ctx, x, y, c, rec) {
    K.rr(ctx, x, y + 14, 96, 62, 12); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 96, y + 36); ctx.lineTo(x + 132, y + 16); ctx.lineTo(x + 132, y + 74); ctx.lineTo(x + 96, y + 54); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * rec; ctx.fillStyle = C.rouge; ctx.beginPath(); ctx.arc(x + 24, y + 38, 9, 0, 7); ctx.fill(); ctx.restore();
  }
  function scFamilles(ctx, t) {
    const e = E.familles, y0 = 244, l = 520, h = 572;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 6, 'Trois familles de codecs', C.vio);
    const volet = (x, t0, c, titre, sous, rangs, dessin) => K.entre(ctx, t, t0, () => {
      K.carte(ctx, x, y0, l, h, { s: K.rgba(c, 0.5), f: K.rgba(c, 0.05) });
      K.t(ctx, titre, x + 36, y0 + 72, { s: 52, w: 800, c });
      K.t(ctx, sous, x + 36, y0 + 112, { s: 28, c: C.mut });
      rangs.forEach((r, k) => pastilles(ctx, r, x + 36, y0 + 164 + k * 54, { s: 26, c }));
      dessin();
    }, { dy: 40 });
    const lignes = (x, t0, liste) => liste.forEach((s, k) => K.entre(ctx, t, t0 + k * 0.18, () => K.t(ctx, s, x + 36, y0 + 430 + k * 46, { s: 30, c: k === 0 ? C.txt : C.txt2, w: k === 0 ? 700 : 400 }), { dx: -16, dy: 0, d: 0.35 }));

    // tournage
    volet(MX, e.tournage, C.ora, 'Tournage', 'ce qu’enregistre la caméra', [['XAVC', 'AVC-Intra', 'RAW'], ['XDCAM HD', 'ProRes']], () => {
      camera(ctx, MX + 40, y0 + 268, C.ora, pulse(t, dernierTemps(t), 3));
      K.fleche(ctx, MX + 196, y0 + 314, MX + 262, y0 + 314, { c: C.ora });
      fichier(ctx, MX + 284, y0 + 284, 58, C.ora); K.t(ctx, 'les rushes', MX + 348, y0 + 324, { s: 28, w: 700, c: C.txt2 });
    });
    lignes(MX, e.tournageDetail, ['Deux repères :', 'XDCAM HD 422 : 50 Mbit/s', 'AVC-Intra 100 : 100 Mbit/s']);
    // montage : des images toutes indépendantes
    volet(700, e.montage, C.vert, 'Montage', 'les codecs intermédiaires', [['ProRes', 'DNxHD / DNxHR']], () => {
      images(ctx, 700 + 54, y0 + 256, 'IIIIIII', t, e.montageImages[0], 0.1875);
      K.entre(ctx, t, e.montageImages[6] + 0.1, () => K.t(ctx, 'chaque image est indépendante', 960, y0 + 362, { s: 26, c: C.txt2, a: 'center' }), { dy: 0 });
    });
    lignes(700, e.montageDetail, ['intra · 10 bits · peu compressés', 'légers à décoder', 'résistent aux réencodages']);
    // diffusion : un GOP long
    volet(1290, e.diffusion, C.bleu, 'Diffusion', 'la livraison au public', [['H.264', 'HEVC', 'AV1']], () => {
      const x = 1290 + 54, y = y0 + 256;
      images(ctx, x, y, 'IBBPBBP', t, e.gop, 0.07);
      // chaque image P s'appuie sur la précédente image I ou P
      K.entre(ctx, t, e.gop + 0.5, () => {
        ctx.strokeStyle = IPB.P; ctx.lineWidth = 3;
        [[0, 3], [3, 6]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(x + a * 60 + 26, y - 4); ctx.quadraticCurveTo(x + (a + b) * 30 + 26, y - 40, x + b * 60 + 26, y - 6); ctx.stroke(); ctx.fillStyle = IPB.P; ctx.beginPath(); ctx.arc(x + b * 60 + 26, y - 6, 5, 0, 7); ctx.fill(); });
        K.t(ctx, 'chaque image dépend des autres', 1550, y0 + 362, { s: 26, c: C.txt2, a: 'center' });
      }, { dy: 0 });
    });
    lignes(1290, e.diffusionDetail, ['GOP long · très efficaces', 'mais lourds à monter', 'web, TNT, Blu-ray, plateformes']);
    // la chaîne
    K.entre(ctx, t, e.montage, () => K.fleche(ctx, 640, 530, 692, 530, { c: C.txt2, lw: 6 }), { dy: 0 });
    K.entre(ctx, t, e.diffusion, () => K.fleche(ctx, 1230, 530, 1282, 530, { c: C.txt2, lw: 6 }), { dy: 0 });
    K.onde(ctx, 1550, 530, t, e.diffusion, { c: C.bleu, r: 320 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : ProRes et DNxHR sont des codecs ', ['intra', { c: C.jaune }], ', pas des codecs GOP long.'], 960, 912, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     7 · LES DÉBITS À CONNAÎTRE : l'échelle du ProRes, puis deux points de comparaison
     ========================================================================== */
  const PRORES = [['Proxy', 38], ['LT', 85], ['422', 122], ['422 HQ', 184], ['4444', 275], ['4444 XQ', 413]];
  function scDebits(ctx, t) {
    const e = E.debits, xb = 430, L = 1050, hb = 46;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 7, 'Les débits à connaître', C.ora);
    K.entre(ctx, t, e.titre, () => K.riche(ctx, ['Le ', ['ProRes', { c: C.txt, w: 800 }], ' en HD 1080 25p, du plus léger au plus lourd'], MX, 266, { s: 38, c: C.txt2 }), { dy: 0, dx: -20 });
    const hqVu = t >= e.hq;
    PRORES.forEach((r, i) => {
      const y = 300 + i * 68, hq = i === 3;
      K.entre(ctx, t, e.barres[i], () => {
        const l = (L * r[1] / 413) * K.app(t, e.barres[i], 0.6);
        K.t(ctx, 'ProRes ' + r[0], MX, y + 34, { s: 34, w: hq && hqVu ? 800 : 700, c: hq && hqVu ? C.ora : C.txt });
        K.rr(ctx, xb, y, l, hb, 12); ctx.fillStyle = hq ? C.ora : K.rgba(C.ora, hqVu ? 0.4 : 0.7); ctx.fill();
        const lt = K.t(ctx, r[1] + ' Mbit/s', xb + l + 20, y + 34, { s: 34, w: 800, c: hq ? C.ora : C.txt });
        // le repère du cours : 184 Mbit/s, soit 83 Go par heure
        if (hq) K.entre(ctx, t, e.hq, () => K.t(ctx, '→ 184 × 0,45 ≈ 83 Go par heure', xb + l + 20 + lt + 30, y + 33, { s: 30, w: 700, c: C.txt2 }), { dx: -16, dy: 0, d: 0.35 });
      }, { dy: 0, d: 0.3 });
    });
    K.onde(ctx, xb + (L * 184) / 413, 300 + 3 * 68 + hb / 2, t, e.hq, { c: C.ora, r: 130 });
    // deux points de comparaison
    [['XDCAM HD 422', 50, '50 Mbit/s', 'tournage, MPEG-2', C.bleu], ['H.264 web HD', 8, '5 à 10 Mbit/s', 'diffusion', C.vert]].forEach((r, i) => {
      const y = 730 + i * 68;
      K.entre(ctx, t, e.comparaison[i], () => {
        const l = Math.max(12, (L * r[1] / 413) * K.app(t, e.comparaison[i], 0.5));
        K.t(ctx, r[0], MX, y + 34, { s: 34, w: 700, c: r[4] });
        K.rr(ctx, xb, y, l, hb, 12); ctx.fillStyle = r[4]; ctx.fill();
        const lt = K.t(ctx, r[2], xb + l + 20, y + 34, { s: 34, w: 800, c: r[4] });
        K.t(ctx, r[3], xb + l + 20 + lt + 26, y + 33, { s: 30, c: C.txt2 });
      }, { dy: 16, d: 0.35 });
    });
    ctx.save(); ctx.globalAlpha *= K.app(t, e.comparaison[0], 0.4); ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(MX, 708); ctx.lineTo(W - MX, 708); ctx.stroke(); ctx.restore();
    K.entre(ctx, t, e.reperes, () => {
      const liste = ['DNxHD 1080 25p : 36 · 120 · 185 Mbit/s', 'UHD ≈ × 4', 'DCP : au plus 250 Mbit/s'];
      const total = liste.reduce((s, f) => s + K.larg(ctx, f, 32, 700) + 48, 0) + 24 * 2;
      let px = 960 - total / 2;
      liste.forEach((f) => { px += K.puce(ctx, f, px, 928, { s: 32, c: C.ora }) + 24; });
    }, { zoom: 0.2, cx: 960, cy: 928, d: 0.4 });
    K.onde(ctx, 960, 928, t, e.reperes, { c: C.ora, r: 520 });
  }

  /* ==========================================================================
     8 · PROXY ET GÉNÉRATIONS
     ========================================================================== */
  const GEN = [['net', 'l’original'], ['blocs:150', '1re génération'], ['blocs:84', '2e génération'], ['blocs:46', '3e génération']];
  function scProxy(ctx, t) {
    const e = E.proxy;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 8, 'Proxy et générations', C.vert);

    // --- le proxy : monter avec une copie légère, exporter avec les originaux ---
    K.entre(ctx, t, e.originaux, () => {
      K.carte(ctx, MX, 250, 410, 150, { s: K.rgba(C.ora, 0.6), f: K.rgba(C.ora, 0.07) });
      K.t(ctx, 'Rushes originaux', 140, 306, { s: 38, w: 800, c: C.ora });
      K.t(ctx, 'les fichiers de la caméra', 140, 348, { s: 28, c: C.txt2 });
      K.rr(ctx, 140, 366, 350, 14, 7); ctx.fillStyle = C.ora; ctx.fill();
    }, { dy: 24 });
    K.entre(ctx, t, e.copie, () => { K.fleche(ctx, 540, 325, 704, 325, { c: C.vert, lw: 6 }); K.t(ctx, 'copie légère', 618, 300, { s: 26, w: 700, c: C.vert, a: 'center' }); }, { dx: -20, dy: 0, d: 0.3 });
    K.entre(ctx, t, e.proxys, () => {
      K.carte(ctx, 724, 262, 310, 126, { s: K.rgba(C.vert, 0.7), f: K.rgba(C.vert, 0.09) });
      K.t(ctx, 'Proxys', 754, 318, { s: 38, w: 800, c: C.vert });
      K.rr(ctx, 754, 346, 74, 14, 7); ctx.fillStyle = C.vert; ctx.fill();
      K.t(ctx, 'ProRes Proxy · DNxHR LB · H.264', 879, 426, { s: 26, c: C.txt2, a: 'center' });
    }, { zoom: 0.35, cx: 879, cy: 325, d: 0.4 });
    K.entre(ctx, t, e.montage, () => {
      K.fleche(ctx, 1052, 325, 1154, 325, { c: C.vert, lw: 6 });
      K.carte(ctx, 1170, 250, 470, 150, { s: K.rgba(C.bleu, 0.6), f: K.rgba(C.bleu, 0.07) });
      K.t(ctx, 'Montage', 1200, 306, { s: 38, w: 800, c: C.bleu });
      K.t(ctx, 'fluide, même sur une', 1200, 346, { s: 28, c: C.txt2 }); K.t(ctx, 'machine modeste', 1200, 380, { s: 28, c: C.txt2 });
    }, { dx: -30, dy: 0, d: 0.4 });
    // à l'export, retour aux originaux
    if (t >= e.export) {
      const p = K.app(t, e.export, 0.7);
      ctx.save(); ctx.strokeStyle = C.ora; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pts = [[1405, 408], [1405, 474], [325, 474], [325, 420]], total = 66 + 1080 + 54;
      let reste = total * p; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length && reste > 0; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), k = Math.min(1, reste / d); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); reste -= d; }
      ctx.stroke();
      if (p >= 1) { ctx.fillStyle = C.ora; ctx.beginPath(); ctx.moveTo(325, 404); ctx.lineTo(311, 426); ctx.lineTo(339, 426); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      K.entre(ctx, t, e.export + 0.2, () => K.riche(ctx, ['À l’export : ', ['reconnexion aux originaux', { c: C.ora, w: 800 }], ', grâce au nom et au timecode.'], 865, 520, { s: 32, c: C.txt, a: 'center' }), { dy: 12 });
    }

    // --- les générations : chaque réencodage abîme un peu plus l'image ---
    K.entre(ctx, t, e.transcoder, () => K.riche(ctx, [['Transcoder', { c: C.txt, w: 800 }], ' = décoder, puis réencoder dans un autre codec (ou le même).'], MX, 600, { s: 38, c: C.txt2 }), { dy: 0, dx: -20 });
    GEN.forEach((g, i) => {
      const x = MX + i * 440;
      K.entre(ctx, t, e.generations[i], () => {
        K.image(ctx, x, 630, 380, { variante: g[0], bord: i ? K.rgba(C.rouge, 0.25 + i * 0.25) : C.ligne });
        K.t(ctx, g[1], x + 190, 880, { s: 28, w: 700, c: i ? C.txt2 : C.txt, a: 'center' });
        if (i) K.fleche(ctx, x - 52, 737, x - 8, 737, { c: C.txt2, lw: 5 });
      }, { dy: 24, d: 0.4 });
    });
    K.eclair(ctx, t, e.defauts);
    K.onde(ctx, MX + 3 * 440 + 190, 737, t, e.defauts, { c: C.rouge, r: 300 });
    K.entre(ctx, t, e.defauts, () => K.riche(ctx, ['Chaque réencodage avec perte ', ['ajoute des défauts', { c: C.rouge, w: 800 }], ' : on ne compresse fort qu’à la livraison.'], 960, 950, { s: 38, c: C.txt, a: 'center' }), { dy: 16 });
  }

  /* ==========================================================================
     9 · LE DÉBIT DU FICHIER : audio, total, gigaoctets par heure
     ========================================================================== */
  function scTotal(ctx, t) {
    const e = E.total;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 9, 'Le débit du fichier', C.bleu);

    // le débit d'une piste audio PCM
    K.entre(ctx, t, e.audio, () => {
      K.riche(ctx, [['D', { c: C.vert }], ['audio', { s: 44, c: C.vert }], ' = f', ['e', { s: 44 }], ' × q × n'], MX, 326, { s: 88, w: 800, c: C.txt });
      const legende = [[[['f', { c: C.txt, w: 800 }], ['e', { c: C.txt, w: 800, s: 22 }]], 'la fréquence d’échantillonnage : 48 000 Hz en vidéo'], [[['q', { c: C.txt, w: 800 }]], 'la quantification : 16 ou 24 bits'], [[['n', { c: C.txt, w: 800 }]], 'le nombre de voies : 2 en stéréo, 8 sur un PAD']];
      legende.forEach((l, k) => K.riche(ctx, [...l[0], '   ' + l[1]], 990, 254 + k * 42, { s: 30, c: C.txt2 }));
    });
    K.entre(ctx, t, e.exemple, () => K.t(ctx, '48 000 × 24 × 2 = 2 304 000 bit/s', MX, 420, { s: 52, w: 700, c: C.txt2 }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.audioResultat, () => {
      const l = K.puce(ctx, '≈ 2,3 Mbit/s', 1090, 402, { s: 50, c: C.vert, plein: true });
      K.t(ctx, 'en PCM stéréo', 1090 + l + 24, 396, { s: 28, c: C.txt2 }); K.t(ctx, '48 kHz, 24 bits', 1090 + l + 24, 430, { s: 28, c: C.txt2 });
    }, { zoom: 0.3, cx: 1260, cy: 402, d: 0.4 });
    K.onde(ctx, 1260, 402, t, e.audioResultat, { c: C.vert, r: 300 });

    // le débit total = vidéo + audio
    K.entre(ctx, t, e.somme, () => K.riche(ctx, ['D', ['total', { s: 38 }], ' = D', ['vidéo', { s: 38, c: C.ora }], ' + D', ['audio', { s: 38, c: C.vert }]], MX, 560, { s: 72, w: 800, c: C.txt }), { dx: -24, dy: 0 });
    if (t >= e.barre) {
      const L = W - 2 * MX, lv = (L * 184) / 188.6, p = K.va(t, e.barre, e.totalResultat - 0.1, 0, 1, ease.outCubic);
      K.rr(ctx, MX, 592, L, 58, 14); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
      ctx.save(); K.rr(ctx, MX, 592, L, 58, 14); ctx.clip();
      ctx.fillStyle = C.ora; ctx.fillRect(MX, 592, Math.min(lv, L * p), 58);
      if (L * p > lv) { ctx.fillStyle = C.vert; ctx.fillRect(MX + lv, 592, L * p - lv, 58); }
      ctx.restore();
      K.t(ctx, 'vidéo : ProRes 422 HQ, 184 Mbit/s', MX + 24, 632, { s: 32, w: 800, c: '#0b0c0e', al: K.app(t, e.barre + 0.3, 0.4) });
      K.t(ctx, 'audio : 4 voies PCM 24 bits, 4,6 Mbit/s', W - MX, 690, { s: 30, w: 700, c: C.vert, a: 'right', al: K.app(t, e.barre + 0.6, 0.3) });
    }
    K.entre(ctx, t, e.totalResultat, () => {
      const l = K.riche(ctx, ['= 184 + 4,6 ≈ ', ['188,6 Mbit/s', { c: C.ora }]], MX, 770, { s: 76, w: 800, c: C.txt });
      K.t(ctx, '(le conteneur ajoute encore un peu)', MX + l + 30, 766, { s: 28, c: C.mut });
    }, { zoom: 0.2, cx: 600, cy: 745, d: 0.4 });
    K.onde(ctx, 900, 745, t, e.totalResultat, { c: C.ora, r: 340 });
    K.eclair(ctx, t, e.totalResultat);

    // la place sur le disque
    K.entre(ctx, t, e.astuce, () => K.puce(ctx, 'Go par heure = Mbit/s × 0,45', MX, 900, { s: 40, c: C.bleu }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.goh, () => K.riche(ctx, ['184 × 0,45 ≈ ', ['83 Go par heure', { c: C.bleu }]], 870, 916, { s: 58, w: 800, c: C.txt }), { zoom: 0.25, cx: 1300, cy: 896, d: 0.4 });
    K.onde(ctx, 1300, 896, t, e.goh, { c: C.bleu, r: 380 });
  }

  /* ==========================================================================
     LE MONTAGE (le titre et la fin sont fournis par le kit)
     ========================================================================== */
  K.monter({
    conteneur: scConteneur, pistes: scPistes, extension: scExtension, mediainfo: scMediainfo, conteneurs: scConteneurs,
    familles: scFamilles, debits: scDebits, proxy: scProxy, total: scTotal,
    retenir: K.scRetenir([
      ['Conteneur = l’enveloppe', 'MOV · MP4 · MXF · TS · MKV', C.bleu],
      ['Codec = la langue', 'ProRes · DNxHR · H.264 · HEVC · AAC', C.vio],
      ['L’extension = le conteneur', 'rewrap : sans réencoder, sans perte', C.ora],
      ['Montage : intra 10 bits', 'diffusion : GOP long (H.264, HEVC, AV1)', C.vert],
      ['D audio = fe × q × n', 'PCM stéréo 48 kHz 24 bits ≈ 2,3 Mbit/s', C.bleu],
      ['Chaque réencodage avec perte', 'une génération de défauts en plus', C.rose],
    ]),
  });
})();
