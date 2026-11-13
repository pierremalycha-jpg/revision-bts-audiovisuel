// LE FILM — « Compression vidéo · Module 3 · La compression MPEG : exploiter le temps »
// Dessine l'image de l'instant t (fonction pure de t). Les temps viennent de score.js (SCORE.ev),
// le style de kit.js (K). Titre, « À retenir » et fin sont fournis par le kit commun.
// Couleurs du cours : image I rouge, image P bleue, image B verte.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, K = globalThis.K;
  const { clamp, lerp, ease, pulse } = U;
  const E = S.ev, C = K.C, W = G.W, MX = K.MX;
  const COUL = { I: C.rouge, P: C.azur, B: C.vert };
  const SOMBRE = '#0b0c0e';

  // ---------- outils du film ----------
  // Une image du flux, représentée par son type : « I », « P », « B » (ou « B2 », « P4 »…)
  function tuile(ctx, nom, x, y, w, h, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.al === undefined ? 1 : o.al;
    K.rr(ctx, x, y, w, h, Math.min(w, h) * 0.18); ctx.fillStyle = COUL[nom[0]]; ctx.fill();
    K.t(ctx, nom, x + w / 2, y + h / 2 + h * 0.035, { s: o.s || h * 0.56, w: 800, c: SOMBRE, a: 'center', b: 'middle' });
    if (o.abime > 0) { // image abîmée par une erreur : voile sombre et croix
      ctx.globalAlpha *= o.abime;
      K.rr(ctx, x, y, w, h, Math.min(w, h) * 0.18); ctx.fillStyle = 'rgba(11,12,14,.78)'; ctx.fill();
      ctx.strokeStyle = C.jaune; ctx.lineWidth = Math.max(3, w * 0.07); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + w * 0.28, y + h * 0.28); ctx.lineTo(x + w * 0.72, y + h * 0.72); ctx.moveTo(x + w * 0.72, y + h * 0.28); ctx.lineTo(x + w * 0.28, y + h * 0.72); ctx.stroke();
    }
    ctx.restore();
  }
  // Un arc de prédiction, de l'image de référence (x1) vers l'image prédite (x2) ; haut < 0 : sous les images
  function arc(ctx, x1, x2, y, haut, c, p = 1, lw = 3.5) {
    if (p <= 0) return;
    const n = 28, m = Math.max(1, Math.round(n * clamp(p)));
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= m; i++) { const u = i / n, x = x1 + (x2 - x1) * u, yy = y - haut * 4 * u * (1 - u); if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
    ctx.stroke();
    if (p >= 1) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x2, y, lw * 1.7, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  // Types des images d'un GOP, en ordre d'affichage (comme dans le cours)
  const typesGOP = (N, M, n) => Array.from({ length: n }, (_, i) => { const k = i % N; return k === 0 ? 'I' : k % M === 0 ? 'P' : 'B'; });
  // Carte numérotée (les trois idées du chapitre 1)
  function carteIdee(ctx, x, y, w, h, num, c, titre, l1, l2) {
    K.carte(ctx, x, y, w, h, { s: K.rgba(c, 0.5), f: K.rgba(c, 0.07) });
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 52, y + h / 2, 27, 0, 7); ctx.fill();
    K.t(ctx, String(num), x + 52, y + h / 2 + 2, { s: 30, w: 800, c: SOMBRE, a: 'center', b: 'middle' });
    K.t(ctx, titre, x + 100, y + 54, { s: 34, w: 800, c });
    K.t(ctx, l1, x + 100, y + 94, { s: 28, c: C.txt2 }); K.t(ctx, l2, x + 100, y + 128, { s: 28, c: C.txt2 });
  }

  // Position de la balle (repère 320 × 180) dans l'image n − 1 (ou n) et dans l'image suivante
  const BA = [110, 58], BB = [150, 50];

  /* ==========================================================================
     1 · L'IDÉE : prédire l'image au lieu de tout renvoyer
     ========================================================================== */
  function scIdee(ctx, t) {
    const e = E.idee;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 1, 'L’idée : prédire l’image', C.vert);
    K.entre(ctx, t, e.debut + 0.15, () => K.riche(ctx, ['À 25 images par seconde, deux images successives ', ['se ressemblent énormément', { c: C.vert, w: 700 }], '.'], MX, 282, { s: 42 }));

    const w = 560, h = (w * 9) / 16, x1 = MX, x2 = 720, y = 372, k = w / 320;
    K.entre(ctx, t, e.debut + 0.1, () => { K.t(ctx, 'image n', x1, y - 14, { s: 28, w: 700, c: C.txt2 }); K.image(ctx, x1, y, w, { balle: BA }); });
    K.entre(ctx, t, e.image2, () => { K.t(ctx, 'image n + 1 (1/25 s plus tard)', x2, y - 14, { s: 28, w: 700, c: C.txt2 }); K.image(ctx, x2, y, w, { balle: BB }); }, { dx: -40, dy: 0 });
    // seule la balle a bougé : son ancienne place, et le chemin parcouru
    K.entre(ctx, t, e.bouge, () => {
      K.balle(ctx, x2 + BA[0] * k, y + BA[1] * k, 9.5 * k, 0.38);
      K.fleche(ctx, x2 + BA[0] * k + 12, y + BA[1] * k - 22, x2 + BB[0] * k - 6, y + BB[1] * k - 26, { c: C.jaune, lw: 5 });
      K.t(ctx, 'Seule la balle', 1330, 470, { s: 44, w: 800, c: C.vert }); K.t(ctx, 'a bougé.', 1330, 524, { s: 44, w: 800, c: C.vert });
      K.t(ctx, 'Tout le reste', 1330, 604, { s: 34, c: C.txt2 }); K.t(ctx, 'est identique.', 1330, 646, { s: 34, c: C.txt2 });
    }, { dy: 0 });
    K.onde(ctx, x2 + BB[0] * k, y + BB[1] * k, t, e.bouge, { c: C.jaune, r: 120 });

    const CARTES = [
      [C.vert, 'Prédire', 'l’image, à partir d’une autre', 'image déjà décodée'],
      [C.jaune, 'Vecteurs de mouvement', 'où aller chercher', 'chaque bloc'],
      [C.vio, 'Résidu', 'la différence qui reste', 'à corriger'],
    ];
    CARTES.forEach((c, i) => {
      const x = MX + i * 577;
      K.entre(ctx, t, e.cartes[i], () => carteIdee(ctx, x, 740, 546, 150, i + 1, c[0], c[1], c[2], c[3]), { dy: 30 });
    });
    K.entre(ctx, t, e.conclusion, () => K.riche(ctx, ['C’est la compression ', ['inter-image', { c: C.vert, w: 800 }], ' : 2 à 3 fois moins de débit qu’en intra, à qualité égale.'], 960, 956, { s: 36, c: C.txt, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     2 · TROIS TYPES D'IMAGES : I, P, B
     ========================================================================== */
  const TYPES = [
    { k: 'I', nom: 'Image I', sous: 'intra', l1: 'Codée seule, comme un JPEG.', l2: 'Point d’entrée · la plus lourde.', poids: [1, 1], val: '≈ 1' },
    { k: 'P', nom: 'Image P', sous: 'prédite', l1: 'Prédite depuis une image', l2: 'précédente (I ou P).', poids: [0.3, 0.5], val: '≈ 0,3 à 0,5' },
    { k: 'B', nom: 'Image B', sous: 'bidirectionnelle', l1: 'Prédite depuis le passé et', l2: 'le futur · la plus légère.', poids: [0.1, 0.2], val: '≈ 0,1 à 0,2' },
  ];
  function scTypes(ctx, t) {
    const e = E.types;
    K.fond(ctx, t, C.rouge); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 2, 'Trois types d’images', C.rouge);
    TYPES.forEach((o, i) => {
      const x = MX + i * 577, y = 250, w = 546, c = COUL[o.k];
      K.entre(ctx, t, e.cartes[i], () => {
        K.carte(ctx, x, y, w, 570, { s: K.rgba(c, 0.5), f: K.rgba(c, 0.06) });
        tuile(ctx, o.k, x + 36, y + 36, 110, 110);
        K.t(ctx, o.nom, x + 172, y + 94, { s: 54, w: 800, c });
        K.t(ctx, o.sous, x + 174, y + 136, { s: 30, c: C.mut });
        // d'où vient la prédiction
        const yd = y + 208, d = 64, p = K.app(t, e.cartes[i] + 0.35, 0.5);
        if (o.k === 'I') tuile(ctx, 'I', x + w / 2 - d / 2, yd, d, d);
        else if (o.k === 'P') {
          tuile(ctx, 'I', x + 130, yd, d, d); tuile(ctx, 'P', x + w - 130 - d, yd, d, d);
          ctx.save(); ctx.globalAlpha *= p; K.fleche(ctx, x + 130 + d + 14, yd + d / 2, x + w - 130 - d - 14, yd + d / 2, { c, lw: 5 }); ctx.restore();
        } else {
          tuile(ctx, 'I', x + 70, yd, d, d); tuile(ctx, 'B', x + w / 2 - d / 2, yd, d, d); tuile(ctx, 'P', x + w - 70 - d, yd, d, d);
          ctx.save(); ctx.globalAlpha *= p;
          K.fleche(ctx, x + 70 + d + 12, yd + d / 2, x + w / 2 - d / 2 - 12, yd + d / 2, { c, lw: 5 });
          K.fleche(ctx, x + w - 70 - d - 12, yd + d / 2, x + w / 2 + d / 2 + 12, yd + d / 2, { c, lw: 5 });
          ctx.restore();
        }
        K.t(ctx, o.l1, x + 36, y + 342, { s: 30, c: C.txt2 }); K.t(ctx, o.l2, x + 36, y + 384, { s: 30, c: C.txt2 });
      }, { dy: 40 });
      // la taille relative : la barre se réduit, la valeur se pose
      if (t >= e.poids) {
        const a = K.app(t, e.poids, 0.3), bx = x + 36, by = y + 456, bl = w - 72;
        const f1 = K.va(t, e.poids, e.valeurs, 1, o.poids[1]), f0 = K.va(t, e.poids, e.valeurs, 1, o.poids[0]);
        ctx.save(); ctx.globalAlpha *= a;
        K.t(ctx, 'TAILLE RELATIVE', bx, by - 14, { s: 24, w: 700, c: C.mut, ls: 2 });
        K.rr(ctx, bx, by, bl, 30, 9); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
        K.rr(ctx, bx, by, bl * f1, 30, 9); ctx.fillStyle = K.rgba(c, 0.45); ctx.fill();
        K.rr(ctx, bx, by, bl * f0, 30, 9); ctx.fillStyle = c; ctx.fill();
        ctx.restore();
        K.entre(ctx, t, e.valeurs, () => K.t(ctx, o.val, bx, by + 82, { s: 40, w: 800, c }), { zoom: 0.25, cx: bx + 100, cy: by + 68, d: 0.35 });
      }
    });
    K.entre(ctx, t, e.regle, () => K.riche(ctx, ['On ne peut commencer la lecture, ou couper au montage, que sur une image ', ['I', { c: C.rouge, w: 800 }], '.'], 960, 916, { s: 40, c: C.txt, a: 'center' }), { dy: 20 });
    K.onde(ctx, 960, 900, t, e.regle, { c: C.rouge, r: 520 });
  }

  /* ==========================================================================
     3 · LE GOP : N ET M
     ========================================================================== */
  function scGop(ctx, t) {
    const e = E.gop, T12 = typesGOP(12, 3, 13);
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 3, 'Le GOP : N et M', C.bleu);
    K.entre(ctx, t, e.debut + 0.15, () => K.riche(ctx, [['GOP', { c: C.txt, w: 800 }], ' (Group Of Pictures) : une suite d’images qui commence par une image ', ['I', { c: C.rouge, w: 800 }], '.'], MX, 282, { s: 40 }));
    K.entre(ctx, t, e.tuiles[0], () => K.puce(ctx, 'exemple : XDCAM HD', W - MX, 344, { s: 28, c: C.bleu, a: 'right' }), { dy: 0 });

    const x0 = 148, pas = 126, tw = 112, y = 440, cx = (i) => x0 + i * pas + tw / 2;
    // les flèches de prédiction : P depuis l'ancrage précédent, B depuis les deux ancrages qui l'entourent
    if (t >= e.fleches) {
      for (let i = 1; i < 13; i++) {
        const p = K.app(t, e.fleches + i * 0.04, 0.5);
        if (T12[i] === 'P') arc(ctx, cx(i - 3), cx(i), y - 6, 62, C.azur, p);
        if (T12[i] === 'B') { const a = i - (i % 3); arc(ctx, cx(a), cx(i), y - 6, 30, C.vert, p, 2.5); arc(ctx, cx(a + 3), cx(i), y - 6, 30, C.vert, p, 2.5); }
      }
    }
    T12.forEach((k, i) => K.entre(ctx, t, e.tuiles[i], () => tuile(ctx, k, x0 + i * pas, y, tw, tw, { al: i === 12 ? 0.4 : 1 }), { zoom: 0.4, cx: cx(i), cy: y + tw / 2, d: 0.3 }));

    // N : de I à I
    K.entre(ctx, t, e.N, () => {
      const xa = x0, xb = x0 + 11 * pas + tw;
      ctx.strokeStyle = C.rouge; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(xa, 566); ctx.lineTo(xa, 580); ctx.lineTo(xb, 580); ctx.lineTo(xb, 566); ctx.stroke();
      K.riche(ctx, [['N = 12', { c: C.rouge, w: 800 }], ' : la longueur du GOP, d’une image I à la suivante'], (xa + xb) / 2, 626, { s: 36, c: C.txt, a: 'center' });
    }, { dy: 16 });
    // M : d'un ancrage au suivant
    K.entre(ctx, t, e.M, () => {
      ctx.strokeStyle = C.bleu; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx(0), 664); ctx.lineTo(cx(0), 678); ctx.lineTo(cx(3), 678); ctx.lineTo(cx(3), 664); ctx.stroke();
      K.riche(ctx, [['M = 3', { c: C.bleu, w: 800 }], ' : d’un ancrage (I ou P) au suivant, donc 2 images B entre eux'], cx(3) + 34, 690, { s: 34, c: C.txt });
    }, { dy: 16 });

    // les trois calculs du cours
    const CALC = [
      [['n', ['P', { s: 26 }], ' = N ÷ M − 1'], ['12 ÷ 3 − 1 = ', ['3 images P', { c: C.azur, w: 800 }]]],
      [['n', ['B', { s: 26 }], ' = N − N ÷ M'], ['12 − 4 = ', ['8 images B', { c: C.vert, w: 800 }]]],
      [['t', ['GOP', { s: 26 }], ' = N ÷ f   (à 25 i/s)'], ['12 ÷ 25 = ', ['0,48 s', { c: C.ora, w: 800 }]]],
    ];
    CALC.forEach((c, i) => {
      const x = MX + i * 577;
      K.entre(ctx, t, e.cartes[i], () => {
        K.carte(ctx, x, 770, 546, 170, {});
        K.riche(ctx, c[0], x + 36, 828, { s: 36, w: 700, c: C.txt2 });
        K.riche(ctx, c[1], x + 36, 900, { s: 42, w: 700, c: C.txt });
      }, { dy: 30 });
    });
    K.eclair(ctx, t, e.cartes[2]);
    K.onde(ctx, MX + 2 * 577 + 273, 855, t, e.cartes[2], { c: C.ora, r: 320 });
  }

  /* ==========================================================================
     4 · L'ESTIMATION DE MOUVEMENT
     ========================================================================== */
  function scMouvement(ctx, t) {
    const e = E.mouvement;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 4, 'L’estimation de mouvement', C.ora);
    K.entre(ctx, t, e.debut + 0.15, () => {
      K.riche(ctx, ['L’image est découpée en ', ['macroblocs', { c: C.txt, w: 800 }], ' de 16 × 16 pixels.'], MX, 282, { s: 42 });
      K.puce(ctx, 'HD : 120 × 68 = 8 160 macroblocs', W - MX, 268, { s: 28, c: C.ora, a: 'right' });
    });

    const w = 540, h = (w * 9) / 16, xr = MX, xc = 690, y = 400, k = w / 320, g = w / 16, bs = g * 2;
    // le bloc à coder (calé sur la grille) et son sosie dans la référence
    const bx = 7 * g, by = 2 * g; // dans l'image à coder
    const mx = bx + (BA[0] - BB[0]) * k, my = by + (BA[1] - BB[1]) * k; // dans la référence
    const zx = bx - 84, zy = by - 56, zw = 236, zh = 180; // zone de recherche
    K.entre(ctx, t, e.images, () => {
      K.t(ctx, 'image de référence (déjà décodée)', xr, y - 14, { s: 28, w: 700, c: C.txt2 }); K.image(ctx, xr, y, w, { balle: BA });
      K.t(ctx, 'image à coder', xc, y - 14, { s: 28, w: 700, c: C.txt2 }); K.image(ctx, xc, y, w, { balle: BB });
      // la grille des macroblocs
      ctx.save(); K.rr(ctx, xc, y, w, h, 14); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 1; i < 16; i++) { ctx.moveTo(xc + i * g, y); ctx.lineTo(xc + i * g, y + h); }
      for (let j = 1; j < 9; j++) { ctx.moveTo(xc, y + j * g); ctx.lineTo(xc + w, y + j * g); }
      ctx.stroke(); ctx.restore();
    }, { dy: 30 });

    const xt = 1290;
    // le bloc à coder
    K.entre(ctx, t, e.bloc, () => {
      ctx.strokeStyle = C.bleu; ctx.lineWidth = 5; K.rr(ctx, xc + bx, y + by, bs, bs, 4); ctx.stroke();
      K.t(ctx, 'Bloc à coder', xt, 440, { s: 38, w: 800, c: C.bleu }); K.t(ctx, 'un macrobloc de l’image n', xt, 482, { s: 28, c: C.txt2 });
    }, { dy: 0 });
    K.onde(ctx, xc + bx + bs / 2, y + by + bs / 2, t, e.bloc, { c: C.bleu, r: 130 });

    // la recherche : le codeur essaie chaque position de la zone et mesure l'écart
    if (t >= e.zone) {
      const a = K.app(t, e.zone, 0.35), fini = t >= e.trouve;
      const n = Math.min(23, Math.floor(clamp((t - e.zone) / (e.trouve - e.zone)) * 24));
      const sx = fini ? mx : zx + (n % 6) * ((zw - bs) / 5), sy = fini ? my : zy + Math.floor(n / 6) * ((zh - bs) / 3);
      const ecart = fini ? 0.04 : clamp(Math.hypot(sx - mx, sy - my) / 170, 0.08, 1);
      ctx.save(); ctx.globalAlpha *= a;
      ctx.save(); K.rr(ctx, xr, y, w, h, 14); ctx.clip();
      ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; K.rr(ctx, xr + zx, y + zy, zw, zh, 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = C.jaune; ctx.lineWidth = fini ? 5 : 3.5; K.rr(ctx, xr + sx, y + sy, bs, bs, 4); ctx.stroke();
      if (fini) { ctx.setLineDash([7, 6]); ctx.strokeStyle = C.bleu; ctx.lineWidth = 3; K.rr(ctx, xr + bx, y + by, bs, bs, 4); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
      K.t(ctx, 'Zone de recherche', xt, 560, { s: 38, w: 800 }); K.t(ctx, 'on compare à chaque position', xt, 602, { s: 28, c: C.txt2 });
      K.t(ctx, 'ÉCART (SAD)', xt, 652, { s: 24, w: 700, c: C.mut, ls: 2 });
      K.rr(ctx, xt, 666, 500, 22, 8); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
      K.rr(ctx, xt, 666, 500 * ecart, 22, 8); ctx.fillStyle = fini ? C.vert : C.jaune; ctx.fill();
      ctx.restore();
    }
    K.entre(ctx, t, e.trouve, () => K.t(ctx, 'Le plus ressemblant !', xt, 752, { s: 38, w: 800, c: C.jaune }), { zoom: 0.3, cx: xt + 200, cy: 740, d: 0.35 });
    K.onde(ctx, xr + mx + bs / 2, y + my + bs / 2, t, e.trouve, { c: C.jaune, r: 170 });
    K.eclair(ctx, t, e.trouve);

    // le vecteur : de la place du bloc vers son sosie
    K.entre(ctx, t, e.vecteur, () => {
      K.fleche(ctx, xr + bx + bs / 2, y + by + bs / 2, xr + mx + bs / 2, y + my + bs / 2, { c: C.jaune, lw: 6 });
      K.carte(ctx, xt, 790, 520, 160, { s: K.rgba(C.jaune, 0.55), f: K.rgba(C.jaune, 0.08) });
      K.riche(ctx, ['Vecteur de mouvement ', ['(dx ; dy)', { s: 27, w: 700 }]], xt + 28, 842, { s: 31, w: 800, c: C.jaune });
      K.t(ctx, 'Aucun pixel : il dit seulement', xt + 28, 886, { s: 28, c: C.txt }); K.t(ctx, 'où aller chercher le bloc.', xt + 28, 922, { s: 28, c: C.txt });
    }, { dy: 20 });

    K.entre(ctx, t, e.precision, () => {
      K.puce(ctx, 'Précision : ½ pixel en MPEG-2 · ¼ de pixel en H.264 et HEVC', MX, 800, { s: 30, c: C.ora });
      K.t(ctx, 'C’est l’opération la plus coûteuse du codeur.', MX, 884, { s: 34, c: C.txt2 });
    }, { dy: 20 });
  }

  /* ==========================================================================
     5 · COMPENSATION DE MOUVEMENT ET RÉSIDU
     ========================================================================== */
  function scResidu(ctx, t) {
    const e = E.residu;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 5, 'Compensation et résidu', C.vio);
    const w = 440, h = (w * 9) / 16, xs = [170, 740, 1310], y = 330, k = w / 320;
    K.entre(ctx, t, e.debut + 0.1, () => { K.t(ctx, 'image réelle', xs[0], y - 14, { s: 28, w: 700, c: C.txt2 }); K.image(ctx, xs[0], y, w, { balle: BB }); });
    K.entre(ctx, t, e.prediction, () => {
      K.t(ctx, '−', (xs[0] + w + xs[1]) / 2, y + h / 2 + 30, { s: 84, w: 800, a: 'center' });
      K.t(ctx, 'prédiction : blocs recopiés', xs[1], y - 14, { s: 28, w: 700, c: C.jaune });
      K.image(ctx, xs[1], y, w, { balle: [BB[0] - 1.6, BB[1] + 1.2], bord: K.rgba(C.jaune, 0.6) });
      // le bloc recopié, et le vecteur qui a dit où le prendre
      const bx = xs[1] + BB[0] * k - 30, by = y + BB[1] * k - 30;
      ctx.strokeStyle = C.jaune; ctx.lineWidth = 3.5; K.rr(ctx, bx, by, 60, 60, 4); ctx.stroke();
      K.fleche(ctx, xs[1] + BA[0] * k, y + BA[1] * k + 44, xs[1] + BB[0] * k - 8, y + BB[1] * k + 38, { c: C.jaune, lw: 4 });
    }, { dy: 30 });
    K.entre(ctx, t, e.residu, () => {
      K.t(ctx, '=', (xs[1] + w + xs[2]) / 2, y + h / 2 + 30, { s: 84, w: 800, a: 'center' });
      K.t(ctx, 'résidu : la différence', xs[2], y - 14, { s: 28, w: 700, c: C.vio });
      K.rr(ctx, xs[2], y, w, h, 14); ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = K.rgba(C.vio, 0.7); ctx.lineWidth = 2.5; ctx.stroke();
      // ce qui reste : un mince croissant au bord de la balle, quelques miettes
      const cxb = xs[2] + BB[0] * k, cyb = y + BB[1] * k, r = 9.5 * k;
      ctx.strokeStyle = '#8f7ad6'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cxb, cyb, r, -1.2, 0.5); ctx.stroke();
      ctx.strokeStyle = '#4a3f7a'; ctx.beginPath(); ctx.arc(cxb - 2.2, cyb + 1.6, r, 1.9, 3.6); ctx.stroke();
      for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(143,122,214,${0.25 + K.alea(i + 40) * 0.4})`; ctx.fillRect(xs[2] + 20 + K.alea(i) * (w - 40), y + 20 + K.alea(i + 20) * (h - 80), 3, 3); }
      K.t(ctx, 'presque tout est à 0', xs[2] + w / 2, y + h - 26, { s: 28, w: 700, c: '#a1a1a6', a: 'center' });
    }, { zoom: 0.2, cx: xs[2] + w / 2, cy: y + h / 2, d: 0.4 });
    K.onde(ctx, xs[2] + w / 2, y + h / 2, t, e.residu, { c: C.vio, r: 300 });

    K.entre(ctx, t, e.dct, () => {
      K.riche(ctx, ['Le résidu est compressé comme un JPEG : ', ['DCT + quantification', { c: C.vio, w: 800 }], '.'], 960, 690, { s: 42, c: C.txt, a: 'center' });
      K.t(ctx, 'Bonne prédiction = résidu presque nul = très peu de bits.', 960, 748, { s: 34, c: C.txt2, a: 'center' });
    }, { dy: 24 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : le vecteur ne contient ', ['aucun pixel', { c: C.jaune }], '. Il dit où copier ; le résidu corrige.'], 960, 880, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     6 · ORDRE D'AFFICHAGE ET ORDRE DE TRANSMISSION
     ========================================================================== */
  function scOrdre(ctx, t) {
    const e = E.ordre, AFF = ['I1', 'B2', 'B3', 'P4', 'B5', 'B6', 'P7'], COD = ['I1', 'P4', 'B2', 'B3', 'P7', 'B5', 'B6'];
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 6, 'L’ordre de transmission', C.bleu);
    const x0 = MX, pas = 160, tw = 130, th = 96, y1 = 390, y2 = 650, x = (i) => x0 + i * pas, cx = (i) => x(i) + tw / 2;
    K.entre(ctx, t, e.debut + 0.1, () => K.t(ctx, 'Ordre d’affichage (à l’écran)', x0, 292, { s: 32, w: 700, c: C.txt2 }), { dy: 0 });
    AFF.forEach((n, i) => K.entre(ctx, t, e.debut + 0.15 + i * 0.07, () => tuile(ctx, n, x(i), y1, tw, th), { zoom: 0.4, cx: cx(i), cy: y1 + th / 2, d: 0.3 }));

    // B2 et B3 s'appuient sur I1 (passé) et sur P4 (futur)
    if (t >= e.besoin) {
      const p = K.app(t, e.besoin, 0.5);
      [1, 2].forEach((b) => { arc(ctx, cx(0), cx(b), y1 - 6, 34, C.vert, p, 3); arc(ctx, cx(3), cx(b), y1 - 6, 34, C.vert, p, 3); });
      const bat = 0.5 + 0.5 * pulse(t, e.besoin, 2.5);
      ctx.save(); ctx.globalAlpha *= p * bat; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; K.rr(ctx, x(3) - 6, y1 - 6, tw + 12, th + 12, 22); ctx.stroke(); ctx.restore();
    }
    K.entre(ctx, t, e.besoin, () => {
      K.t(ctx, 'Pour décoder', 1270, 420, { s: 40, c: C.txt });
      K.riche(ctx, [['B2 et B3', { c: C.vert, w: 800 }], ', il faut'], 1270, 472, { s: 40, c: C.txt });
      K.riche(ctx, ['déjà connaître ', ['P4', { c: C.azur, w: 800 }], '.'], 1270, 524, { s: 40, c: C.txt });
    }, { dx: 30, dy: 0 });

    // les images descendent dans l'ordre du fichier : les ancrages passent devant
    COD.forEach((n, j) => {
      const i = AFF.indexOf(n), t0 = e.vols[j];
      if (t < t0) return;
      const u = ease.inOutCubic(clamp((t - t0) / 0.5)), px = lerp(x(i), x(j), u), py = lerp(y1, y2, u);
      ctx.save(); ctx.globalAlpha *= 0.75; ctx.strokeStyle = COUL[n[0]]; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx(i), y1 + th + 4); ctx.lineTo(lerp(cx(i), cx(j), u), lerp(y1 + th + 4, y2 - 4, u)); ctx.stroke(); ctx.restore();
      tuile(ctx, n, px, py, tw, th, { al: clamp(u * 3) });
    });
    K.entre(ctx, t, e.vols[0], () => K.t(ctx, 'Ordre de transmission (dans le fichier)', x0, y2 + th + 46, { s: 32, w: 700, c: C.txt2 }), { dy: 0 });
    K.entre(ctx, t, e.legende, () => {
      K.t(ctx, 'Les ancrages (I, P)', 1270, 668, { s: 40, w: 800, c: C.txt }); K.t(ctx, 'partent en avance.', 1270, 718, { s: 40, w: 800, c: C.txt });
      K.t(ctx, 'Le décodeur remet', 1270, 782, { s: 32, c: C.txt2 }); K.t(ctx, 'tout dans l’ordre.', 1270, 822, { s: 32, c: C.txt2 });
    }, { dx: 30, dy: 0 });
    K.entre(ctx, t, e.puces, () => {
      const l = K.puce(ctx, 'Retard de réordonnancement ≈ M − 1 images', MX, 918, { s: 30, c: C.bleu });
      K.puce(ctx, 'Visio : pas d’images B (IPPP…), latence minimale', MX + l + 20, 918, { s: 30, c: C.vert });
    }, { dy: 20 });
    K.onde(ctx, 500, 918, t, e.puces, { c: C.bleu, r: 380 });
  }

  /* ==========================================================================
     7 · LE DÉBIT MOYEN D'UN GOP
     ========================================================================== */
  function scDebit(ctx, t) {
    const e = E.debit, T12 = typesGOP(12, 3, 12), TAILLE = { I: 800, P: 300, B: 120 };
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 7, 'Le débit moyen d’un GOP', C.ora);
    const ind = (c) => ({ s: 36, c });
    K.entre(ctx, t, e.debut + 0.15, () => K.riche(ctx, [['D', { c: C.ora }], ' = (S', ['I', ind(C.rouge)], ' + n', ['P', ind(C.txt2)], ' × S', ['P', ind(C.azur)], ' + n', ['B', ind(C.txt2)], ' × S', ['B', ind(C.vert)], ') × f ÷ N'], MX, 304, { s: 62, w: 800, c: C.txt }));

    // le poids de chaque image du GOP : une colonne par image
    const x0 = 148, pas = 126, bw = 100, yb = 650;
    if (t >= e.barres) {
      T12.forEach((k, i) => {
        const p = ease.outCubic(clamp((t - e.barres - i * 0.05) / 0.7)), hh = TAILLE[k] * 0.3 * p, x = x0 + i * pas;
        if (hh > 1) { K.rr(ctx, x, yb - hh, bw, hh, 10); ctx.fillStyle = COUL[k]; ctx.fill(); }
        ctx.save(); ctx.globalAlpha *= clamp(p * 2); tuile(ctx, k, x, yb + 14, bw, 44, { s: 28 });
        if (i === 0 || i === 1 || i === 3) K.t(ctx, TAILLE[k] + ' kbit', x + bw / 2, yb - TAILLE[k] * 0.3 - 14, { s: 28, w: 800, c: COUL[k], a: 'center', al: clamp(p * 2 - 1) });
        ctx.restore();
      });
    }
    K.entre(ctx, t, e.somme, () => K.riche(ctx, [['800', { c: C.rouge, w: 800 }], ' + 3 × ', ['300', { c: C.azur, w: 800 }], ' + 8 × ', ['120', { c: C.vert, w: 800 }], ' = ', ['2 660 kbit', { c: C.txt, w: 800 }], ' pour un GOP de 12 images'], MX, 800, { s: 46, c: C.txt2 }), { dx: -24, dy: 0 });
    let fin = MX;
    K.entre(ctx, t, e.calcul, () => { K.t(ctx, '2 660 × 25 ÷ 12', MX, 912, { s: 54, w: 700, c: C.txt2 }); }, { dx: -24, dy: 0 });
    fin = MX + K.larg(ctx, '2 660 × 25 ÷ 12', 54, 700) + 34;
    K.entre(ctx, t, e.resultat, () => K.riche(ctx, ['≈ 5 542 kbit/s ≈ ', ['5,5 Mbit/s', { c: C.ora, s: 96, w: 800 }]], fin, 914, { s: 54, w: 700, c: C.txt }), { zoom: 0.25, cx: fin + 500, cy: 890, d: 0.4 });
    K.eclair(ctx, t, e.resultat);
    K.onde(ctx, fin + 720, 884, t, e.resultat, { c: C.ora, r: 360 });
  }

  /* ==========================================================================
     8 · GOP LONG OU TOUT-INTRA ?
     ========================================================================== */
  function scChoix(ctx, t) {
    const e = E.choix;
    K.fond(ctx, t, C.rose); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 8, 'GOP long ou tout-intra ?', C.rose);
    const volet = (x, t0, o) => K.entre(ctx, t, t0, () => {
      const y = 250, w = 820;
      K.carte(ctx, x, y, w, 570, { s: K.rgba(o.c, 0.5), f: K.rgba(o.c, 0.05) });
      K.t(ctx, o.titre, x + 44, y + 78, { s: 58, w: 800, c: o.c });
      K.t(ctx, o.sous, x + w - 44, y + 74, { s: 30, c: C.mut, a: 'right' });
      // le flux : une erreur frappe la 4e image
      o.types.forEach((k, i) => {
        const frappe = i >= 3 && i <= o.dernierAbime, ab = frappe ? clamp((t - e.erreur - (i - 3) * 0.07) / 0.25) : 0;
        tuile(ctx, k, x + 41 + i * 62, y + 112, 56, 56, { abime: ab });
      });
      K.entre(ctx, t, e.erreur + 0.3, () => K.t(ctx, o.erreur, x + 44, y + 216, { s: 29, w: 700, c: C.jaune }), { dy: 0 });
      o.lignes.forEach((l, i) => {
        K.t(ctx, l[0], x + 58, y + 290 + i * 54, { s: 38, w: 800, c: l[0] === '+' ? C.vert : C.rouge, a: 'center' });
        K.t(ctx, l[1], x + 92, y + 288 + i * 54, { s: 32, c: C.txt });
      });
      K.entre(ctx, t, e.usages, () => {
        K.t(ctx, o.usage, x + 44, y + 470, { s: 24, w: 700, c: C.mut, ls: 2 });
        let px = x + 44;
        o.formats.forEach((f) => { px += K.puce(ctx, f, px, y + 516, { s: 28, c: o.c }) + 12; });
      }, { dy: 16 });
    }, { dy: 40 });
    volet(MX, e.gauche, { c: C.azur, titre: 'GOP long', sous: 'N = 12, M = 3', types: typesGOP(12, 3, 12), dernierAbime: 11, erreur: 'Une erreur dure jusqu’à la prochaine image I.', lignes: [['+', 'Débit faible'], ['−', 'Décodage plus lourd, montage moins fluide'], ['−', 'Erreurs propagées (N = 25 : jusqu’à 1 s)']], usage: 'REPORTAGE, DIFFUSION', formats: ['XDCAM', 'XAVC-L', 'diffusion'] });
    volet(990, e.droite, { c: C.rouge, titre: 'Tout-intra', sous: 'N = 1', types: typesGOP(1, 1, 12), dernierAbime: 3, erreur: 'Une erreur ne touche qu’une seule image.', lignes: [['+', 'Chaque image est indépendante'], ['+', 'On peut couper sur n’importe quelle image'], ['−', 'Débit 2 à 3 fois plus élevé']], usage: 'TOURNAGE, MONTAGE', formats: ['ProRes', 'DNxHR', 'XAVC-I'] });
    K.eclair(ctx, t, e.erreur);
    K.onde(ctx, MX + 41 + 3 * 62 + 28, 390, t, e.erreur, { c: C.jaune, r: 150 });
    K.onde(ctx, 990 + 41 + 3 * 62 + 28, 390, t, e.erreur, { c: C.jaune, r: 150 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : on ne coupe proprement un GOP long que sur une image ', ['I', { c: C.jaune }], '.'], 960, 908, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     9 · LES GÉNÉRATIONS DE CODECS
     ========================================================================== */
  const GENS = [['MPEG-2', '1995', 16, C.mut], ['H.264 / AVC', '2003', 8, C.bleu], ['HEVC / H.265', '2013', 4, C.vio], ['VVC / H.266', '2020', 2, C.rose], ['AV1', '2018', 3, C.ora]];
  function scGenerations(ctx, t) {
    const e = E.generations;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 9, 'Les générations de codecs', C.vio);
    K.entre(ctx, t, e.debut + 0.15, () => K.t(ctx, 'Débit pour une HD 1080 de qualité « diffusion » (ordres de grandeur)', MX, 282, { s: 36, c: C.txt2 }));
    const xb = 580, ech = 60, yl = (i) => 370 + i * 88;
    GENS.forEach((g, i) => {
      const y = yl(i), l = g[2] * ech * K.app(t, e.lignes[i], 0.7);
      K.entre(ctx, t, e.lignes[i], () => {
        K.t(ctx, g[0], MX, y + 13, { s: 38, w: 800, c: g[3] === C.mut ? C.txt : g[3] });
        K.t(ctx, g[1], 470, y + 11, { s: 30, c: C.mut });
        K.rr(ctx, xb, y - 22, Math.max(8, l), 44, 12); ctx.fillStyle = g[3]; ctx.fill();
        const lv = K.t(ctx, '≈ ' + g[2] + ' Mbit/s', xb + g[2] * ech + 22, y + 12, { s: 34, w: 700, c: C.txt, al: K.app(t, e.lignes[i] + 0.4, 0.3) });
        if (i === 4) { ctx.save(); ctx.globalAlpha *= K.app(t, e.lignes[i] + 0.4, 0.3); K.puce(ctx, 'hors MPEG, libre de droits', xb + g[2] * ech + 22 + lv + 22, y, { s: 26, c: C.ora }); ctx.restore(); }
      }, { dx: -30, dy: 0 });
    });
    // d'une génération MPEG à la suivante : le débit est divisé par deux
    [0, 1, 2].forEach((i) => {
      K.entre(ctx, t, e.divise[i], () => K.puce(ctx, '÷ 2', xb + GENS[i + 1][2] * ech + 30, yl(i) + 44, { s: 24, c: C.jaune, plein: true, h: 36 }), { zoom: 0.5, cx: xb + GENS[i + 1][2] * ech + 60, cy: yl(i) + 44, d: 0.3 });
    });
    K.entre(ctx, t, e.conclusion, () => {
      K.riche(ctx, ['À qualité égale, chaque génération MPEG ', ['divise le débit par deux', { c: C.jaune, w: 800 }], ' environ…'], MX, 856, { s: 40, c: C.txt });
      K.t(ctx, '… au prix d’un codage bien plus lourd.', MX, 908, { s: 34, c: C.txt2 });
      K.t(ctx, 'Blocs de prédiction : 16 × 16 (MPEG-2, H.264) · jusqu’à 64 × 64 (HEVC) · 128 × 128 (VVC)', MX, 962, { s: 28, c: C.mut });
    }, { dy: 24 });
  }

  /* ==========================================================================
     LE MONTAGE
     ========================================================================== */
  K.monter({
    idee: scIdee, types: scTypes, gop: scGop, mouvement: scMouvement, residu: scResidu, ordre: scOrdre, debit: scDebit, choix: scChoix, generations: scGenerations,
    retenir: K.scRetenir([
      ['I · P · B', 'I : seule, lourde · P : depuis le passé · B : passé + futur, légère', C.rouge],
      ['GOP : N et M', 'N = 12, M = 3 → I B B P B B P B B P B B', C.bleu],
      ['n P = N ÷ M − 1 · n B = N − N ÷ M', '3 P et 8 B · t = N ÷ f = 0,48 s', C.ora],
      ['Vecteur + résidu', 'le vecteur dit où copier, le résidu corrige', C.jaune],
      ['Transmission ≠ affichage', 'les ancrages partent avant les images B', C.vert],
      ['GOP long ou tout-intra', 'débit faible, ou images indépendantes', C.rose],
    ]),
  });
})();
