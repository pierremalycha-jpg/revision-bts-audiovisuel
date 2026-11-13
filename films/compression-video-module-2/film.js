// LE FILM — « Compression vidéo · Module 2 · La compression JPEG »
// Dessine l'image de l'instant t (fonction pure de t). Les temps viennent de score.js (SCORE.ev),
// le style et les scènes communes (titre, « À retenir », fin, montage) de kit.js (K).
// Les calculs sont RÉELS : le bloc 8 × 8 est celui du schéma du cours, sa DCT est calculée avec
// la formule du cours, et il est quantifié avec la table de luminance de la norme JPEG.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, K = globalThis.K;
  const { clamp, lerp, ease, pulse } = U;
  const E = S.ev, C = K.C, W = G.W, MX = K.MX, BEAT = S.BEAT;

  /* ==========================================================================
     LES DONNÉES DU COURS (contenu.js) ET LES VRAIS CALCULS
     ========================================================================== */
  // Table de quantification de luminance de la norme JPEG (annexe K)
  const TQ = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
  // Le parcours en zigzag
  const ZZ = (function () { const o = []; for (let s = 0; s < 15; s++) { const l = []; for (let y = 0; y < 8; y++) { const x = s - y; if (x >= 0 && x < 8) l.push(y * 8 + x); } o.push.apply(o, s % 2 ? l : l.reverse()); } return o; })();
  // Le bloc de pixels du schéma « Un bloc et ses coefficients DCT » du cours (un dégradé et un bord net)
  const PIX = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) PIX.push(70 + x * 14 + y * 6 + (x > 5 ? 40 : 0));
  // F(u,v) = ¼ C(u) C(v) Σ Σ f(x,y) cos[(2x+1)uπ/16] cos[(2y+1)vπ/16], avec f = pixel − 128
  const DCT = []; for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
    let s = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += (PIX[y * 8 + x] - 128) * Math.cos(((2 * x + 1) * u * Math.PI) / 16) * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
    DCT.push(Math.round(0.25 * (u ? 1 : Math.SQRT1_2) * (v ? 1 : Math.SQRT1_2) * s));
  }
  const FQ = DCT.map((f, i) => { const q = Math.round(f / TQ[i]); return q === 0 ? 0 : q; }); // Fq = arrondi(F ÷ Q)
  const NB_ZEROS = FQ.filter((v) => v === 0).length; // 57
  const moins = (v) => (v < 0 ? '−' + -v : String(v)); // le vrai signe moins

  // Une grille 8 × 8 : dessin(i, x, y, cote) est appelée pour chaque case
  function grille(ctx, gx, gy, cote, dessin) { for (let i = 0; i < 64; i++) dessin(i, gx + (i % 8) * cote, gy + Math.floor(i / 8) * cote, cote); }
  const etiquette = (ctx, str, x, y, c = C.txt2, a = 'left') => K.t(ctx, str, x, y, { s: 28, w: 700, c, a });

  /* ==========================================================================
     1 · LA CHAÎNE JPEG
     ========================================================================== */
  const CHAINE = [['Image RVB', 'à compresser'], ['Y′CbCr', '+ 4:2:0'], ['Blocs', '8 × 8'], ['DCT', '→ fréquences'], ['Quantification', 'division + arrondi'], ['Zigzag', '+ RLE'], ['Huffman', 'sans perte'], ['Fichier', '.jpg']];
  function scChaine(ctx, t) {
    const e = E.chaine;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 1, 'La chaîne JPEG', C.bleu);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['JPEG (1992) : une compression ', ['avec perte', { c: C.txt, w: 800 }], ', réglée par un ', ['facteur de qualité', { c: C.bleu, w: 800 }], '.'], MX, 290, { s: 40 }));
    const w = 360, h = 150, pas = 427, x0 = 140, ys = [360, 570];
    const pos = (i) => [x0 + (i % 4) * pas, ys[Math.floor(i / 4)]];
    // la case « active » : l'image avance dans la chaîne, puis la parcourt en boucle
    const active = t < e.cases[7] + BEAT ? Math.floor((t - e.cases[0]) / BEAT) : Math.floor(((t - e.cases[7] - BEAT) / (BEAT * 0.75)) % 8);
    const perte = K.app(t, e.pertes, 0.4);
    CHAINE.forEach((c, i) => {
      const [x, y] = pos(i), estPerte = i === 1 || i === 4;
      K.entre(ctx, t, e.cases[i], () => {
        const rouge = estPerte ? perte : 0;
        K.carte(ctx, x, y, w, h, { r: 24, f: rouge ? K.rgba(C.rouge, 0.06 + 0.1 * rouge) : C.carte, s: rouge ? K.rgba(C.rouge, 0.3 + 0.6 * rouge) : i === active ? K.rgba(C.bleu, 0.9) : C.ligne, lw: i === active || rouge ? 3.5 : 2 });
        K.t(ctx, c[0], x + w / 2, y + 68, { s: 40, w: 800, a: 'center' });
        K.t(ctx, c[1], x + w / 2, y + 112, { s: 28, c: C.txt2, a: 'center' });
        if (i % 4 < 3) K.fleche(ctx, x + w + 10, y + h / 2, x + pas - 10, y + h / 2, { c: C.mut, lw: 4 });
        if (i === 3) { // le retour à la ligne, de la DCT vers la quantification
          ctx.strokeStyle = C.mut; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(x + w / 2, y + h + 8); ctx.lineTo(x + w / 2, y + h + 30); ctx.lineTo(x0 + w / 2, y + h + 30); ctx.stroke();
          K.fleche(ctx, x0 + w / 2, y + h + 30, x0 + w / 2, ys[1] - 8, { c: C.mut, lw: 4 });
        }
      }, { zoom: 0.3, cx: x + w / 2, cy: y + h / 2, d: 0.38 });
      if (estPerte) {
        K.entre(ctx, t, e.pertes, () => K.puce(ctx, 'PERTE', x + w - 12, y, { s: 26, c: C.rouge, plein: true, a: 'right' }), { zoom: 0.5, cx: x + w - 70, cy: y, d: 0.35 });
        K.onde(ctx, x + w / 2, y + h / 2, t, e.pertes, { c: C.rouge, r: 260 });
      }
    });
    K.entre(ctx, t, e.pertes + 0.15, () => K.riche(ctx, ['Deux pertes : ', ['le 4:2:0', { c: C.rouge, w: 800 }], ' et ', ['la quantification', { c: C.rouge, w: 800 }], '. Tout le reste est réversible.'], 960, 810, { s: 40, a: 'center', c: C.txt }), { dy: 20 });
    K.entre(ctx, t, e.repere, () => K.puce(ctx, 'Photo JPEG : qualité 90 ≈ 10:1 · qualité 50 ≈ 20:1 à 30:1', 960, 910, { s: 34, c: C.bleu, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     2 · PRÉPARER L'IMAGE : Y′CbCr, 4:2:0, puis blocs 8 × 8
     ========================================================================== */
  function scPreparer(ctx, t) {
    const e = E.preparer;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 2, 'Préparer l’image', C.vio);

    // --- premier temps : la couleur ---
    const aA = t < e.blocs - 0.35 ? 1 : 1 - K.app(t, e.blocs - 0.35, 0.3);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha *= aA;
      const w = 440, h = (w * 9) / 16, y = 322;
      K.entre(ctx, t, e.rvb, () => { etiquette(ctx, 'Image RVB', MX, y - 16); K.image(ctx, MX, y, w); });
      K.entre(ctx, t, e.luma, () => {
        K.fleche(ctx, MX + w + 14, y + h / 2, 676, y + h / 2, { c: C.mut, lw: 5 });
        etiquette(ctx, 'Luminance Y′', 690, y - 16); K.image(ctx, 690, y, w, { variante: 'gris' });
      }, { dx: -30, dy: 0 });
      K.entre(ctx, t, e.chroma, () => {
        K.t(ctx, '+', 1160, y + h / 2 + 22, { s: 64, w: 800, a: 'center' });
        etiquette(ctx, 'Couleur Cb et Cr', 1190, y - 16, C.rose);
        // au sous-échantillonnage, la couleur perd ses détails, par paliers
        const n = t < e.sous ? 160 : t < e.sous + 0.3 ? 110 : t < e.sous + 0.6 ? 70 : 44;
        K.image(ctx, 1190, y, w, { variante: 'chroma:' + n, bord: K.rgba(C.rose, 0.6) });
      }, { dx: -30, dy: 0 });
      // 4:2:0 : quatre pixels, quatre luminances, une seule couleur
      K.entre(ctx, t, e.sous, () => {
        for (let k = 0; k < 4; k++) {
          const x = MX + (k % 2) * 76, yy = 626 + Math.floor(k / 2) * 76;
          K.rr(ctx, x, yy, 70, 70, 10); ctx.fillStyle = K.rgba(C.vio, 0.12); ctx.fill(); ctx.strokeStyle = K.rgba(C.vio, 0.6); ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 35, yy + 35, 9, 0, 7); ctx.fill();
        }
        ctx.fillStyle = C.azur; ctx.beginPath(); ctx.arc(MX + 62, 699, 11, 0, 7); ctx.fill();
        ctx.fillStyle = C.rouge; ctx.beginPath(); ctx.arc(MX + 84, 699, 11, 0, 7); ctx.fill();
        K.riche(ctx, [['4:2:0', { c: C.txt, w: 800 }], ' : une seule valeur de ', ['Cb', { c: C.azur, w: 800 }], ' et de ', ['Cr', { c: C.rouge, w: 800 }], ' pour 4 pixels.'], 310, 690, { s: 44, c: C.txt });
        K.t(ctx, 'L’œil est peu sensible aux détails de couleur.', 310, 746, { s: 34, c: C.mut });
      }, { dy: 24 });
      K.entre(ctx, t, e.moitie, () => {
        K.riche(ctx, ['4:4:4 → 4:2:0 : ', ['deux fois moins d’échantillons', { c: C.ora, w: 800 }], '.'], MX, 880, { s: 44, c: C.txt });
        K.puce(ctx, 'première perte, avant même la DCT', W - MX, 866, { s: 30, c: C.rouge, plein: true, a: 'right' });
      }, { dy: 24 });
      ctx.restore();
    }

    // --- second temps : les blocs 8 × 8 ---
    if (t >= e.blocs) {
      const iw = 720, ih = (iw * 9) / 16, ix = MX, iy = 300, pasB = iw / 40; // 40 blocs de large sur l'image de test
      K.entre(ctx, t, e.blocs, () => K.image(ctx, ix, iy, iw, { variante: 'gris' }), { dy: 24 });
      // le quadrillage se pose, colonne après colonne
      const g = clamp((t - e.grille) / 0.9);
      if (g > 0) {
        ctx.save(); K.rr(ctx, ix, iy, iw, ih, 14); ctx.clip(); ctx.strokeStyle = K.rgba(C.jaune, 0.32); ctx.lineWidth = 1.5;
        for (let k = 1; k < 40 * g; k++) { ctx.beginPath(); ctx.moveTo(ix + k * pasB, iy); ctx.lineTo(ix + k * pasB, iy + ih); ctx.stroke(); }
        for (let k = 1; k < 23 * g; k++) { ctx.beginPath(); ctx.moveTo(ix, iy + k * pasB); ctx.lineTo(ix + iw, iy + k * pasB); ctx.stroke(); }
        ctx.restore();
      }
      // un bloc, agrandi
      const bx = ix + 22 * pasB, by = iy + 13 * pasB, zx = 980, zy = 300, zc = 44;
      K.entre(ctx, t, e.zoom, () => {
        ctx.strokeStyle = C.jaune; ctx.lineWidth = 4; ctx.strokeRect(bx, by, pasB, pasB);
        ctx.save(); ctx.globalAlpha *= 0.6; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.moveTo(bx + pasB, by); ctx.lineTo(zx, zy); ctx.moveTo(bx + pasB, by + pasB); ctx.lineTo(zx, zy + zc * 8); ctx.stroke(); ctx.restore();
        grille(ctx, zx, zy, zc, (i, x, y, c) => { const v = PIX[i]; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x + 1, y + 1, c - 2, c - 2); });
        ctx.strokeStyle = C.jaune; ctx.lineWidth = 4; ctx.strokeRect(zx - 3, zy - 3, zc * 8 + 6, zc * 8 + 6);
        K.t(ctx, '8 × 8', 1390, 420, { s: 96, w: 800 });
        K.t(ctx, '= 64 pixels', 1390, 492, { s: 48, w: 700, c: C.jaune });
        K.t(ctx, 'pour chaque composante :', 1390, 566, { s: 28, c: C.mut });
        K.t(ctx, 'Y′, Cb et Cr', 1390, 604, { s: 28, w: 700, c: C.txt2 });
      }, { zoom: 0.15, cx: 1150, cy: 476, d: 0.4 });
      K.onde(ctx, bx + pasB / 2, by + pasB / 2, t, e.zoom, { c: C.jaune, r: 120 });
      K.entre(ctx, t, e.separes, () => K.t(ctx, 'Chaque bloc est traité séparément : d’où les « carrés » quand on compresse trop.', MX, 780, { s: 38, c: C.txt }), { dy: 20 });
      K.entre(ctx, t, e.formule, () => K.t(ctx, 'Blocs = (l ÷ 8) × (h ÷ 8)', MX, 868, { s: 56, w: 800 }), { dx: -24, dy: 0 });
      K.entre(ctx, t, e.resultat, () => K.riche(ctx, ['HD 1920 × 1080 : 240 × 135 = ', ['32 400 blocs', { c: C.ora, w: 800 }], ' de luminance'], MX, 956, { s: 50, w: 700, c: C.txt }), { zoom: 0.15, cx: 760, cy: 940, d: 0.4 });
      K.onde(ctx, 1020, 940, t, e.resultat, { c: C.ora, r: 320 });
      K.eclair(ctx, t, e.resultat);
    }
  }

  /* ==========================================================================
     3 · LA DCT : 64 pixels → 64 coefficients
     ========================================================================== */
  const DCT_MAX = Math.log10(1 + Math.max(...DCT.map(Math.abs)));
  function scDct(ctx, t) {
    const e = E.dct, cote = 52, gy = 372, gp = MX, gc = 760;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 3, 'La DCT', C.bleu);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['La DCT remplace les 64 pixels d’un bloc par 64 ', ['coefficients de fréquence', { c: C.bleu, w: 800 }], '.'], MX, 290, { s: 42 }));
    // les pixels
    K.entre(ctx, t, e.pixels, () => {
      etiquette(ctx, 'un bloc : 64 pixels', gp, gy - 16);
      grille(ctx, gp, gy, cote, (i, x, y, c) => { const v = PIX[i]; ctx.fillStyle = `rgb(${v},${v},${v})`; K.rr(ctx, x + 1, y + 1, c - 2, c - 2, 5); ctx.fill(); });
    }, { dy: 24 });
    // les coefficients : l'intensité de l'orange suit la valeur réelle du coefficient
    K.entre(ctx, t, e.coefs, () => {
      K.fleche(ctx, gp + cote * 8 + 26, gy + cote * 4, gc - 26, gy + cote * 4, { c: C.bleu, lw: 7 });
      K.t(ctx, 'DCT', (gp + cote * 8 + gc) / 2 - 6, gy + cote * 4 - 34, { s: 56, w: 800, c: C.bleu, a: 'center' });
      etiquette(ctx, '64 coefficients', gc, gy - 16);
      grille(ctx, gc, gy, cote, (i, x, y, c) => {
        const a = Math.log10(1 + Math.abs(DCT[i])) / DCT_MAX, d = (i % 8) + Math.floor(i / 8);
        const p = clamp((t - e.coefs - d * 0.035) / 0.25);
        K.rr(ctx, x + 1, y + 1, c - 2, c - 2, 5); ctx.fillStyle = K.rgba(C.ora, (0.07 + 0.93 * a) * p); ctx.fill();
      });
    }, { dy: 0, d: 0.3 });
    const x = 1240;
    ['Elle ne compresse pas.', 'Elle ne perd rien.', 'Elle range l’information.'].forEach((ph, i) => {
      K.entre(ctx, t, e.range[i], () => K.t(ctx, ph, x, 430 + i * 58, { s: 42, w: i === 2 ? 800 : 400, c: i === 2 ? C.bleu : C.txt }), { dx: 30, dy: 0, d: 0.4 });
    });
    // le DC : la case en haut à gauche
    K.entre(ctx, t, e.dc, () => {
      ctx.strokeStyle = C.jaune; ctx.lineWidth = 5; K.rr(ctx, gc - 2, gy - 2, cote + 4, cote + 4, 8); ctx.stroke();
      const l = K.puce(ctx, 'DC', x, 650, { s: 34, c: C.jaune, plein: true });
      K.t(ctx, 'la moyenne du bloc', x + l + 18, 663, { s: 40, w: 700 });
      K.t(ctx, 'ici : 8 × (150 − 128) = ' + DCT[0], x, 718, { s: 30, c: C.txt2 });
    }, { dx: 30, dy: 0 });
    K.onde(ctx, gc + cote / 2, gy + cote / 2, t, e.dc, { c: C.jaune, r: 150 });
    // les AC : des basses fréquences (en haut à gauche) aux hautes (en bas à droite)
    K.entre(ctx, t, e.ac, () => {
      const l = K.puce(ctx, 'AC', x, 800, { s: 34, c: C.ora, plein: true });
      K.t(ctx, 'les 63 variations', x + l + 18, 813, { s: 40, w: 700 });
      K.t(ctx, 'l’énergie se concentre en haut à gauche', x, 868, { s: 30, c: C.txt2 });
      etiquette(ctx, '↖ basses', gc, gy + cote * 8 + 42, C.ora);
      etiquette(ctx, 'fréquences', gc + cote * 4, gy + cote * 8 + 42, C.mut, 'center');
      etiquette(ctx, 'hautes ↘', gc + cote * 8, gy + cote * 8 + 42, C.txt2, 'right');
    }, { dx: 30, dy: 0 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : en haut à gauche, ce n’est pas un pixel : c’est ', ['la moyenne', { c: C.jaune }], '.'], MX, 950, { s: 36 }), { dy: 24 });
  }

  /* ==========================================================================
     4 · LA QUANTIFICATION : diviser par un pas, arrondir
     ========================================================================== */
  function scQuantif(ctx, t) {
    const e = E.quantif, cote = 58, gy = 322, gx = [MX, 728, 1346], L = cote * 8;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 4, 'La quantification', C.ora);
    const nombre = (v, x, y, c, coul) => K.t(ctx, moins(v), x + c / 2, y + c / 2 + 2, { s: Math.abs(v) > 99 && v < 0 ? 21 : 25, w: 700, c: coul, a: 'center', b: 'middle' });
    // les coefficients DCT
    K.entre(ctx, t, e.coefs, () => {
      etiquette(ctx, 'coefficients DCT (F)', gx[0], gy - 16);
      grille(ctx, gx[0], gy, cote, (i, x, y, c) => {
        const a = Math.log10(1 + Math.abs(DCT[i])) / DCT_MAX;
        K.rr(ctx, x + 1.5, y + 1.5, c - 3, c - 3, 6); ctx.fillStyle = K.rgba(C.ora, 0.07 + 0.5 * a); ctx.fill();
        nombre(DCT[i], x, y, c, DCT[i] ? C.txt : '#8e8e93');
      });
    }, { dy: 24 });
    // la table : petits pas en haut à gauche, grands pas en bas à droite
    K.entre(ctx, t, e.table, () => {
      K.t(ctx, '÷', (gx[0] + L + gx[1]) / 2, gy + L / 2 + 28, { s: 84, w: 800, c: C.rouge, a: 'center' });
      etiquette(ctx, 'table de quantification (pas Q)', gx[1], gy - 16, C.rouge);
      grille(ctx, gx[1], gy, cote, (i, x, y, c) => {
        K.rr(ctx, x + 1.5, y + 1.5, c - 3, c - 3, 6); ctx.fillStyle = K.rgba(C.rouge, 0.08 + TQ[i] / 150); ctx.fill();
        nombre(TQ[i], x, y, c, C.txt);
      });
    }, { dy: 24 });
    K.entre(ctx, t, e.pas, () => {
      K.t(ctx, 'petits pas en haut à gauche (16),', gx[1] + L / 2, gy + L + 40, { s: 26, c: C.txt2, a: 'center' });
      K.t(ctx, 'grands pas en bas à droite (jusqu’à 121)', gx[1] + L / 2, gy + L + 74, { s: 26, c: C.txt2, a: 'center' });
    }, { dy: 12 });
    // le résultat : les cases se remplissent en diagonale, presque toutes tombent à zéro
    if (t >= e.arrondi) {
      const a0 = K.app(t, e.arrondi, 0.3);
      ctx.save(); ctx.globalAlpha *= a0;
      K.t(ctx, '=', (gx[1] + L + gx[2]) / 2, gy + L / 2 + 28, { s: 84, w: 800, c: C.txt, a: 'center' });
      K.t(ctx, 'arrondi', (gx[1] + L + gx[2]) / 2, gy + L / 2 + 70, { s: 26, w: 700, c: C.txt2, a: 'center' });
      etiquette(ctx, 'coefficients quantifiés', gx[2], gy - 16, C.ora);
      ctx.restore();
      const duree = e.zeros - e.arrondi - 0.3;
      grille(ctx, gx[2], gy, cote, (i, x, y, c) => {
        const d = ((i % 8) + Math.floor(i / 8)) / 14, p = clamp((t - e.arrondi - d * duree) / 0.25);
        if (p <= 0) { K.rr(ctx, x + 1.5, y + 1.5, c - 3, c - 3, 6); ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fill(); return; }
        ctx.save(); ctx.globalAlpha *= p;
        K.rr(ctx, x + 1.5, y + 1.5, c - 3, c - 3, 6); ctx.fillStyle = FQ[i] ? C.ora : 'rgba(255,255,255,.05)'; ctx.fill();
        nombre(FQ[i], x, y, c, FQ[i] ? '#0b0c0e' : '#8e8e93');
        ctx.restore();
      });
    }
    K.entre(ctx, t, e.zeros, () => K.riche(ctx, [[NB_ZEROS + ' coefficients sur 64', { c: C.ora, w: 800 }], ' → 0'], gx[2] + L / 2, gy + L + 46, { s: 32, w: 800, c: C.txt, a: 'center' }), { zoom: 0.25, cx: gx[2] + L / 2, cy: gy + L + 36, d: 0.4 });
    K.onde(ctx, gx[2] + L / 2, gy + L / 2, t, e.zeros, { c: C.ora, r: 380 });
    K.eclair(ctx, t, e.zeros);
    // la formule et les deux exemples du cours
    K.entre(ctx, t, e.formule, () => K.riche(ctx, ['F', ['q', { s: 34 }], ' = arrondi(F ÷ Q)'], MX, 950, { s: 58, w: 800, c: C.txt }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.ex1, () => K.riche(ctx, ['256 ÷ 16 = ', ['16', { c: C.ora, w: 800 }]], 770, 918, { s: 36, c: C.txt }), { dx: -20, dy: 0 });
    K.entre(ctx, t, e.ex2, () => K.riche(ctx, ['−23 ÷ 55 = −0,42 → ', ['0', { c: C.rouge, w: 800 }], ' : il disparaît'], 770, 968, { s: 36, c: C.txt }), { dx: -20, dy: 0 });
    K.entre(ctx, t, e.irreversible, () => K.puce(ctx, 'la seule étape irréversible', W - MX, 905, { s: 30, c: C.rouge, plein: true, a: 'right' }), { zoom: 0.3, cx: 1570, cy: 905, d: 0.35 });
    K.onde(ctx, 1570, 905, t, e.irreversible, { c: C.rouge, r: 300 });
  }

  /* ==========================================================================
     5 · ERREUR ET FACTEUR DE QUALITÉ
     ========================================================================== */
  const QUALITES = [ // S = 200 − 2 × qualité (ou 5 000 ÷ qualité sous 50) ; pas du DC = 16 × S ÷ 100
    { q: 50, s: 100, effet: 'table standard', dc: 16, c: C.bleu, x: 690 },
    { q: 75, s: 50, effet: 'pas ÷ 2', dc: 8, c: C.vert, x: MX },
    { q: 25, s: 200, effet: 'pas × 2', dc: 32, c: C.ora, x: 1270 },
  ];
  function scQualite(ctx, t) {
    const e = E.qualite;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 5, 'Erreur et facteur de qualité', C.vert);
    K.entre(ctx, t, e.phrase, () => K.t(ctx, 'Le décodeur multiplie par le même pas : il retrouve une valeur approchée.', MX, 290, { s: 40, c: C.txt2 }));
    K.entre(ctx, t, e.formule, () => {
      const l = K.riche(ctx, ['F′ = F', ['q', { s: 36 }], ' × Q'], MX, 400, { s: 62, w: 800, c: C.txt });
      K.t(ctx, 'erreur ≤ Q ÷ 2', MX + l + 44, 398, { s: 42, w: 800, c: C.ora });
    }, { dx: -24, dy: 0 });
    // la règle graduée : F = 37 « saute » sur la graduation la plus proche
    const ax = 1000, ux = 13, ay = 384, X = (v) => ax + v * ux;
    K.entre(ctx, t, e.formule + 0.2, () => {
      K.t(ctx, 'pas Q = 10', X(60), ay - 62, { s: 26, w: 700, c: C.txt2, a: 'right' });
      ctx.strokeStyle = C.mut; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(0), ay); ctx.lineTo(X(60), ay); ctx.stroke();
      for (let v = 0; v <= 60; v += 10) { ctx.beginPath(); ctx.moveTo(X(v), ay - 14); ctx.lineTo(X(v), ay + 14); ctx.stroke(); K.t(ctx, String(v), X(v), ay + 48, { s: 26, c: C.txt2, a: 'center' }); }
      const p = t < e.saut ? 0 : ease.outBack(clamp((t - e.saut) / 0.35), 2);
      ctx.fillStyle = K.rgba(C.bleu, t < e.saut ? 1 : 0.4); ctx.beginPath(); ctx.arc(X(37), ay, 11, 0, 7); ctx.fill();
      K.t(ctx, 'F = 37', X(37) - 8, ay - 26, { s: 26, w: 700, c: C.bleu, a: 'right' });
      if (t >= e.saut) {
        ctx.fillStyle = C.ora; ctx.beginPath(); ctx.arc(X(lerp(37, 40, p)), ay, 13, 0, 7); ctx.fill();
        K.t(ctx, 'F′ = 40', X(40) + 8, ay - 26, { s: 26, w: 800, c: C.ora });
      }
    }, { dy: 0 });
    K.onde(ctx, X(40), ay, t, e.saut, { c: C.ora, r: 130 });
    K.eclair(ctx, t, e.saut);
    K.entre(ctx, t, e.exemple, () => K.riche(ctx, ['F = 37 et Q = 10 : F', ['q', { s: 24 }], ' = arrondi(3,7) = 4, donc F′ = 40. ', ['Erreur : 3', { c: C.ora, w: 800 }], ', moins que 10 ÷ 2 = 5.'], MX, 500, { s: 36, c: C.txt }), { dy: 16 });

    // le facteur de qualité agrandit ou réduit tous les pas
    K.entre(ctx, t, e.echelle, () => {
      K.t(ctx, 'Q = T × S ÷ 100', MX, 612, { s: 54, w: 800 });
      K.riche(ctx, [['T', { c: C.txt, w: 800 }], ' : le pas de la table standard'], 640, 586, { s: 28, c: C.txt2 });
      K.riche(ctx, [['S', { c: C.txt, w: 800 }], ' : l’échelle, fixée par le facteur de qualité (de 1 à 100)'], 640, 624, { s: 28, c: C.txt2 });
    }, { dx: -24, dy: 0 });
    QUALITES.forEach((q, i) => {
      const y = 660, w = 540, h = 222;
      K.entre(ctx, t, e.cartes[i], () => {
        K.carte(ctx, q.x, y, w, h, { s: K.rgba(q.c, 0.5), f: K.rgba(q.c, 0.07) });
        K.t(ctx, 'Qualité ' + q.q, q.x + 32, y + 60, { s: 44, w: 800 });
        K.t(ctx, 'S = ' + q.s + ' %', q.x + w - 32, y + 58, { s: 30, c: C.txt2, a: 'right' });
        K.t(ctx, q.effet, q.x + 32, y + 112, { s: 40, w: 800, c: q.c });
        K.t(ctx, 'pas du DC : ' + q.dc, q.x + 32, y + 156, { s: 28, w: 700, c: C.txt2 });
        // la règle : des graduations d'autant plus espacées que le pas est grand
        ctx.strokeStyle = q.c; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(q.x + 32, y + 190); ctx.lineTo(q.x + w - 32, y + 190); ctx.stroke();
        for (let gx = q.x + 32; gx <= q.x + w - 32 + 0.5; gx += q.dc * 1.86) { ctx.beginPath(); ctx.moveTo(gx, y + 176); ctx.lineTo(gx, y + 204); ctx.stroke(); }
      }, { zoom: 0.25, cx: q.x + w / 2, cy: y + h / 2, d: 0.4 });
      K.onde(ctx, q.x + w / 2, y + h / 2, t, e.cartes[i], { c: q.c, r: 300 });
    });
    K.entre(ctx, t, e.bilan, () => K.riche(ctx, ['Qualité basse → pas plus grands → plus de zéros → ', ['fichier plus petit', { c: C.vert, w: 800 }], ', mais ', ['plus d’artefacts', { c: C.rouge, w: 800 }], '.'], 960, 950, { s: 36, c: C.txt, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     6 · ZIGZAG, RLE ET HUFFMAN
     ========================================================================== */
  const DERNIER = ZZ.reduce((d, i, k) => (FQ[i] ? k : d), 0); // rang (dans le zigzag) du dernier coefficient non nul
  function scZigzag(ctx, t) {
    const e = E.zigzag, cote = 58, gx = MX, gy = 318;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 6, 'Zigzag, RLE et Huffman', C.bleu);
    const n = clamp((t - e.trajet0) / (e.trajet1 - e.trajet0)) * 63; // où en est la lecture
    K.entre(ctx, t, e.grille, () => {
      etiquette(ctx, 'coefficients quantifiés', gx, gy - 16);
      grille(ctx, gx, gy, cote, (i, x, y, c) => {
        K.rr(ctx, x + 1.5, y + 1.5, c - 3, c - 3, 6); ctx.fillStyle = FQ[i] ? C.ora : 'rgba(255,255,255,.06)'; ctx.fill();
        K.t(ctx, moins(FQ[i]), x + c / 2, y + c / 2 + 2, { s: 25, w: 700, c: FQ[i] ? '#0b0c0e' : '#8e8e93', a: 'center', b: 'middle' });
      });
      K.t(ctx, 'lecture en zigzag :', gx, gy + cote * 8 + 40, { s: 26, w: 700, c: C.bleu });
      K.t(ctx, 'du DC vers les hautes fréquences', gx, gy + cote * 8 + 76, { s: 26, c: C.txt2 });
    }, { dy: 24 });
    // le trajet
    if (t >= e.trajet0) {
      const centre = (k) => [gx + (ZZ[k] % 8) * cote + cote / 2, gy + Math.floor(ZZ[k] / 8) * cote + cote / 2];
      ctx.save(); ctx.strokeStyle = C.bleu; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha *= 0.9;
      ctx.beginPath(); ctx.moveTo(...centre(0));
      const k0 = Math.floor(n); for (let k = 1; k <= k0; k++) ctx.lineTo(...centre(k));
      let tete = centre(k0);
      if (k0 < 63) { const a = centre(k0), b = centre(k0 + 1), f = n - k0; tete = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; ctx.lineTo(...tete); }
      ctx.stroke(); ctx.restore();
      // les valeurs non nulles repassent par-dessus le trajet : elles restent lisibles
      grille(ctx, gx, gy, cote, (i, x, y, c) => {
        if (!FQ[i]) return;
        K.rr(ctx, x + 1.5, y + 1.5, c - 3, c - 3, 6); ctx.fillStyle = C.ora; ctx.fill();
        K.t(ctx, moins(FQ[i]), x + c / 2, y + c / 2 + 2, { s: 25, w: 700, c: '#0b0c0e', a: 'center', b: 'middle' });
      });
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tete[0], tete[1], 9, 0, 7); ctx.fill();
    }
    // la suite lue, dans l'ordre : les valeurs utiles d'abord, les zéros à la fin
    const sx = 650, sy = 330, pasS = 36;
    K.entre(ctx, t, e.trajet0 - 0.3, () => etiquette(ctx, 'les 64 coefficients, dans l’ordre de lecture', sx, gy - 16), { dy: 0 });
    for (let k = 0; k < 64; k++) {
      const x = sx + (k % 32) * pasS, y = sy + Math.floor(k / 32) * 44, lu = t >= e.trajet0 && k <= n;
      K.rr(ctx, x, y, 32, 36, 6);
      ctx.fillStyle = !lu ? 'rgba(255,255,255,.04)' : FQ[ZZ[k]] ? C.ora : 'rgba(255,255,255,.16)'; ctx.fill();
    }
    K.entre(ctx, t, e.zeros, () => {
      // un contour autour de la longue suite de zéros qui termine la lecture
      const xa = sx + (DERNIER + 1) * pasS - 3, xd = sx + 32 * pasS - 1, xg = sx - 3;
      ctx.strokeStyle = C.ora; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(xa, sy - 5); ctx.lineTo(xd, sy - 5); ctx.lineTo(xd, sy + 85); ctx.lineTo(xg, sy + 85); ctx.lineTo(xg, sy + 40); ctx.lineTo(xa, sy + 40); ctx.closePath(); ctx.stroke();
      K.t(ctx, 'Les zéros se regroupent à la fin.', sx, sy + 146, { s: 38, w: 800, c: C.ora });
    }, { dy: 16 });
    K.eclair(ctx, t, e.zeros);
    // le RLE, avec l'exemple du cours
    K.entre(ctx, t, e.rle, () => K.riche(ctx, [['RLE', { c: C.txt, w: 800 }], ' : on code des couples « ', ['nombre de zéros', { c: C.bleu, w: 800 }], ' ; ', ['valeur', { c: C.ora, w: 800 }], ' ».'], sx, 572, { s: 40, c: C.txt }), { dx: 30, dy: 0 });
    K.entre(ctx, t, e.ex1, () => K.t(ctx, 'Exemple :  26, −3, 0, −2, 0, 0, 1, 0 … 0', sx, 644, { s: 38, w: 700, c: C.txt2 }), { dx: 30, dy: 0 });
    K.entre(ctx, t, e.ex2, () => {
      K.riche(ctx, ['→  (0 ; −3)  (1 ; −2)  (2 ; 1)  ', ['EOB', { c: C.vio, w: 800 }]], sx, 704, { s: 38, w: 700, c: C.ora });
      K.riche(ctx, [['EOB', { c: C.vio, w: 800 }], ' (fin de bloc) remplace tous les zéros restants.'], sx, 752, { s: 28, c: C.txt2 });
    }, { dx: 30, dy: 0 });
    K.onde(ctx, sx + 360, 690, t, e.ex2, { c: C.ora, r: 300 });
    // Huffman : la dernière étape, sans perte
    K.entre(ctx, t, e.huffman, () => {
      K.carte(ctx, sx, 806, 1160, 150, { s: K.rgba(C.vert, 0.55), f: K.rgba(C.vert, 0.08) });
      K.t(ctx, 'Dernière étape : Huffman', sx + 36, 866, { s: 44, w: 800 });
      K.t(ctx, 'des codes courts pour les symboles fréquents (module 4)', sx + 36, 918, { s: 30, c: C.txt2 });
      K.puce(ctx, 'sans perte', sx + 1160 - 36, 852, { s: 32, c: C.vert, plein: true, a: 'right' });
    }, { zoom: 0.2, cx: sx + 580, cy: 880, d: 0.4 });
    K.onde(ctx, sx + 580, 880, t, e.huffman, { c: C.vert, r: 420 });
  }

  /* ==========================================================================
     7 · LES ARTEFACTS
     ========================================================================== */
  const ARTEFACTS = [
    ['Effet de bloc', 'des carrés de 8 × 8,', 'surtout dans les dégradés'],
    ['Ringing', 'des halos autour des bords', 'nets et des textes'],
    ['Bavure de couleur', 'la couleur déborde,', 'à cause du 4:2:0'],
    ['Banding', 'un dégradé en', 'marches d’escalier'],
  ];
  function illusArtefact(ctx, i, x, y, t) {
    const w = 360, h = 202;
    ctx.save(); K.rr(ctx, x, y, w, h, 14); ctx.clip();
    if (i === 0) { // un dégradé découpé en carrés
      for (let a = 0; a < 9; a++) for (let b = 0; b < 6; b++) { const v = 44 + a * 17 + b * 5 + (K.alea(a * 7 + b) - 0.5) * 22; ctx.fillStyle = `rgb(${Math.round(v * 0.55)},${Math.round(v * 0.75)},${Math.round(v)})`; ctx.fillRect(x + a * 40, y + b * 40, 40, 40); }
    } else if (i === 1) { // des oscillations autour d'un bord net
      ctx.fillStyle = '#101216'; ctx.fillRect(x, y, w, h);
      const x0 = x + 24, xb = x + 170, yh = y + 62, yb = y + 146;
      ctx.strokeStyle = '#c7c7cc'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(xb, yb); ctx.lineTo(xb, yh); ctx.lineTo(x + w - 20, yh); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = C.ora; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x0, yb);
      const vague = 1 + 0.12 * Math.sin(t * 2.2);
      for (let px = x0; px <= x + w - 20; px += 2) { const d = px - xb; const yy = d < 0 ? yb + 30 * vague * Math.sin(d / 8) * Math.exp(d / 34) : yh + 34 * vague * Math.sin(d / 8) * Math.exp(-d / 34); ctx.lineTo(px, yy); }
      ctx.stroke();
    } else if (i === 2) { // la luminance reste nette, la couleur (très sous-échantillonnée) déborde
      ctx.drawImage(K.imageCanevas('mixte:24'), 300, 110, 400, 224, x, y, w, h);
    } else { // en haut le dégradé, en bas ses marches d'escalier
      for (let px = 0; px < w; px += 2) { const u = px / w; ctx.fillStyle = `rgb(${Math.round(20 + 60 * u)},${Math.round(50 + 110 * u)},${Math.round(110 + 140 * u)})`; ctx.fillRect(x + px, y, 2, h / 2); }
      for (let k = 0; k < 6; k++) { const u = (k + 0.5) / 6; ctx.fillStyle = `rgb(${Math.round(20 + 60 * u)},${Math.round(50 + 110 * u)},${Math.round(110 + 140 * u)})`; ctx.fillRect(x + (k * w) / 6, y + h / 2, w / 6 + 1, h / 2); }
    }
    ctx.restore();
    K.rr(ctx, x, y, w, h, 14); ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.stroke();
  }
  function scArtefacts(ctx, t) {
    const e = E.artefacts;
    K.fond(ctx, t, C.rose); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 7, 'Quand on compresse trop : les artefacts', C.rose);
    ARTEFACTS.forEach((a, i) => {
      const x = MX + i * 433, y = 262, w = 400, h = 430;
      K.entre(ctx, t, e.tuiles[i], () => {
        K.carte(ctx, x, y, w, h, { s: K.rgba(C.rose, 0.45), f: K.rgba(C.rose, 0.06) });
        illusArtefact(ctx, i, x + 20, y + 20, t);
        K.t(ctx, a[0], x + w / 2, y + 290, { s: 40, w: 800, c: C.rose, a: 'center' });
        K.t(ctx, a[1], x + w / 2, y + 340, { s: 28, c: C.txt2, a: 'center' });
        K.t(ctx, a[2], x + w / 2, y + 378, { s: 28, c: C.txt2, a: 'center' });
      }, { zoom: 0.3, cx: x + w / 2, cy: y + h / 2, d: 0.4 });
      K.onde(ctx, x + w / 2, y + h / 2, t, e.tuiles[i], { c: C.rose, r: 300 });
    });
    K.entre(ctx, t, e.ou, () => K.t(ctx, 'Ils apparaissent d’abord dans les ciels, les dégradés et autour des titres.', 960, 790, { s: 40, c: C.txt, a: 'center' }), { dy: 20 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : réenregistrer un JPEG plusieurs fois ', ['accumule les pertes', { c: C.jaune }], '.'], 960, 906, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     8 · LA COMPRESSION INTRA-IMAGE
     ========================================================================== */
  function scIntra(ctx, t) {
    const e = E.intra;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 8, 'La compression intra-image', C.vert);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['Chaque image est compressée ', ['seule', { c: C.vert, w: 800 }], ', comme une suite de JPEG.'], MX, 290, { s: 42 }));
    for (let i = 0; i < 5; i++) {
      const x = MX + i * 350, y = 334, w = 300, h = (w * 9) / 16, fait = t >= e.images[i];
      K.entre(ctx, t, e.phrase + 0.1 + i * 0.08, () => K.image(ctx, x, y, w, { balle: [70 + i * 42, 62 - 18 * Math.sin((i / 4) * Math.PI)], bord: fait ? C.vert : C.ligne }), { dy: 20 });
      if (fait) { K.rr(ctx, x - 3, y - 3, w + 6, h + 6, 16); ctx.strokeStyle = C.vert; ctx.lineWidth = 3; ctx.stroke(); }
      K.entre(ctx, t, e.images[i], () => K.puce(ctx, 'JPEG n° ' + (i + 1), x + w / 2, y + h + 44, { s: 28, c: C.vert, a: 'center' }), { zoom: 0.4, cx: x + w / 2, cy: y + h + 44, d: 0.3 });
    }
    const volet = (x, t0, c, morceaux) => K.entre(ctx, t, t0, () => {
      K.carte(ctx, x, 600, 830, 116, { s: K.rgba(c, 0.5), f: K.rgba(c, 0.07) });
      K.riche(ctx, morceaux, x + 32, 670, { s: 34, c: C.txt2 });
    }, { dy: 24 });
    volet(MX, e.plus, C.vert, [['+  ', { c: C.vert, w: 800 }], 'chaque image se décode seule : ', ['montage fluide', { c: C.txt, w: 800 }]]);
    volet(980, e.moins, C.ora, [['−  ', { c: C.ora, w: 800 }], 'débit plus élevé qu’en ', ['inter-image', { c: C.txt, w: 800 }], ' (module 3)']);
    K.entre(ctx, t, e.codecs, () => {
      let px = MX + K.t(ctx, 'Codecs intra :', MX, 792, { s: 34, w: 700 }) + 22;
      ['Motion JPEG', 'ProRes', 'DNxHD', 'DNxHR', 'AVC-Intra', 'XAVC-I', 'JPEG 2000'].forEach((n) => { px += K.puce(ctx, n, px, 780, { s: 30, c: C.vert }) + 12; });
    }, { dy: 20 });
    K.entre(ctx, t, e.j2k, () => {
      K.carte(ctx, MX, 838, W - 2 * MX, 144, { s: K.rgba(C.bleu, 0.5), f: K.rgba(C.bleu, 0.07) });
      K.riche(ctx, [['JPEG 2000', { c: C.bleu, w: 800 }], ' : des ondelettes à la place de la DCT. Pas de blocs : l’image devient floue.'], MX + 32, 894, { s: 32, c: C.txt });
      K.riche(ctx, ['C’est le codec du ', ['DCP', { c: C.txt, w: 800 }], ' (cinéma numérique) : 12 bits, au plus ', ['250 Mbit/s', { c: C.txt, w: 800 }], '.'], MX + 32, 944, { s: 32, c: C.txt2 });
    }, { zoom: 0.15, cx: 960, cy: 910, d: 0.4 });
    K.onde(ctx, 960, 910, t, e.j2k, { c: C.bleu, r: 500 });
  }

  /* ==========================================================================
     LE MONTAGE (titre et fin sont fournis par le kit)
     ========================================================================== */
  K.monter({
    chaine: scChaine, preparer: scPreparer, dct: scDct, quantif: scQuantif, qualite: scQualite, zigzag: scZigzag, artefacts: scArtefacts, intra: scIntra,
    retenir: K.scRetenir([
      ['La chaîne JPEG', 'Y′CbCr · blocs 8 × 8 · DCT · quantification · zigzag · Huffman', C.bleu],
      ['DCT : 64 pixels → 64 coefficients', 'elle range, elle ne perd rien', C.vio],
      ['DC = la moyenne du bloc', '63 AC : des basses aux hautes fréquences', C.jaune],
      ['Fq = arrondi(F ÷ Q)', 'la quantification : seule étape irréversible', C.ora],
      ['Qualité 75 : pas ÷ 2', 'qualité 50 : table standard · qualité 25 : pas × 2', C.vert],
      ['Artefacts', 'effet de bloc · ringing · bavure de couleur · banding', C.rose],
    ]),
  });
})();
