// LE FILM — dessine l'image de l'instant t. Tout est une fonction pure de t : n'importe quelle
// image peut être calculée dans n'importe quel ordre, et elle tombe toujours avec la musique.
// Les temps viennent tous de score.js (SCORE.ev) ; le style vient de kit.js (K).
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio, Shots = globalThis.Shots, K = globalThis.K;
  const { clamp, lerp, ease, pulse } = U;
  const { T, BEAT, B, clock } = S, E = S.ev, C = K.C, W = G.W, H = G.H, MX = K.MX;
  const dernierTemps = (t) => clock.OFFSET + Math.floor((t - clock.OFFSET) / BEAT) * BEAT; // le temps (musical) qui vient de tomber

  // ---------- décor : des bits qui montent lentement (titre et fin) ----------
  function pluieDeBits(ctx, t, force = 1) {
    G.decor(() => {
      for (let i = 0; i < 70; i++) {
        const v = 14 + K.alea(i + 50) * 30, s = 22 + K.alea(i + 70) * 26;
        const x = K.alea(i) * W, y = (((K.alea(i + 100) * (H + 80) - t * v) % (H + 80)) + (H + 80)) % (H + 80) - 40;
        const bit = K.alea(i + 200 + Math.floor(t * 0.5 + K.alea(i + 9) * 3)) > 0.5 ? '1' : '0';
        K.t(ctx, bit, x, y, { s, w: 700, c: K.SPECTRE[i % 4], a: 'center', al: (0.05 + K.alea(i + 300) * 0.09) * force });
      }
    });
  }

  /* ==========================================================================
     TITRE
     ========================================================================== */
  function scTitre(ctx, t) {
    const e = E.titre;
    K.fond(ctx, t, C.vio);
    pluieDeBits(ctx, t);
    const presse = t >= e.icone ? pulse(t, dernierTemps(t), 5) : 0; // l'icône « serre » l'image sur chaque temps
    K.entre(ctx, t, e.icone, () => K.icone(ctx, 960, 300, 210, { presse }), { zoom: 0.5, cx: 960, cy: 300 });
    K.entre(ctx, t, e.sur, () => K.t(ctx, 'BTS AUDIOVISUEL  ·  TES  ·  COMPRESSION VIDÉO', 960, 505, { s: 30, w: 700, c: C.mut, a: 'center', ls: 5 }));
    K.entre(ctx, t, e.titre, () => K.t(ctx, 'Pourquoi compresser ?', 960, 655, { s: 128, w: 800, a: 'center' }), { dy: 40, d: 0.6 });
    K.entre(ctx, t, e.sous, () => K.degrade(ctx, 'Débit et taux de compression.', 960, 775, { s: 84, a: 'center' }), { dy: 40, d: 0.6 });
    K.entre(ctx, t, e.pastille, () => K.puce(ctx, 'Module 1 · l’essentiel en 2 minutes', 960, 885, { s: 34, c: C.bleu, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     1 · LE PROBLÈME : la HD non compressée dépasse 1 Gbit/s
     ========================================================================== */
  // Une carte mémoire (coin coupé) qui se remplit par le bas
  function carteSD(ctx, x, y, w, h, niveau, couleur) {
    const coin = w * 0.2, r = 22;
    const contour = () => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - coin, y); ctx.lineTo(x + w, y + coin); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath(); };
    contour(); ctx.fillStyle = '#1c1c1e'; ctx.fill();
    ctx.save(); contour(); ctx.clip();
    const hh = h * niveau;
    ctx.fillStyle = K.lin(ctx, 0, y + h - hh, 0, y + h, [couleur, K.rgba(couleur, 0.55)]); ctx.fillRect(x, y + h - hh, w, hh);
    ctx.restore();
    contour(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 6; i++) { K.rr(ctx, x + 26 + i * 30, y + 16, 18, 40, 4); ctx.fillStyle = '#c9a44a'; ctx.fill(); } // les contacts
  }

  function scProbleme(ctx, t) {
    const e = E.probleme;
    K.fond(ctx, t, C.rose); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 1, 'Le problème', C.rose);

    // la source : une image HD, et les images suivantes derrière elle
    const ix = MX, iy = 290, iw = 600, ih = (iw * 9) / 16;
    K.entre(ctx, t, e.image, () => {
      for (let k = 2; k >= 1; k--) { K.rr(ctx, ix + k * 18, iy - k * 14, iw, ih, 14); ctx.fillStyle = `rgba(255,255,255,${0.05 * (3 - k)})`; ctx.fill(); ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.stroke(); }
      K.image(ctx, ix, iy, iw);
      K.t(ctx, 'HD 1920 × 1080 · 25 i/s · 4:2:2 · 10 bits', ix, iy + ih + 52, { s: 32, w: 700, c: C.txt2 });
      K.puce(ctx, 'non compressé', ix, iy + ih + 104, { s: 28, c: C.rose });
    });

    // la carte mémoire
    const cx = 1500, cy = 262, cw = 310, ch = 400;
    const niveau = clamp((t - e.rempli0) / (e.plein - e.rempli0));
    K.entre(ctx, t, e.image + 0.25, () => {
      carteSD(ctx, cx, cy, cw, ch, t >= e.rempli0 ? ease.inOutQuad(niveau) : 0, niveau >= 1 ? C.rouge : C.ora);
      K.t(ctx, '128 Go', cx + cw / 2, cy + 150, { s: 62, w: 800, a: 'center' });
      K.t(ctx, 'carte mémoire', cx + cw / 2, cy + 196, { s: 28, c: C.txt2, a: 'center' });
    });

    // le flux de bits, de l'image vers la carte
    if (t >= e.compte0) {
      const a = K.app(t, e.compte0, 0.8);
      for (let i = 0; i < 90; i++) {
        const u = (K.alea(i) + (t - e.compte0) * (0.3 + K.alea(i + 30) * 0.25)) % 1;
        const x = lerp(ix + iw + 40, cx - 26, u), y = 458 + (K.alea(i + 60) - 0.5) * 230 * lerp(1, 0.45, u);
        const al = a * Math.min(1, u * 6, (1 - u) * 6) * (0.35 + K.alea(i + 90) * 0.65);
        K.rr(ctx, x - 9, y - 9, 18, 18, 5); ctx.fillStyle = K.rgba(i % 3 ? C.bleu : '#ffffff', al * (i % 3 ? 0.8 : 0.5)); ctx.fill();
      }
    }

    // le compteur de débit
    if (t >= e.compte0) {
      const v = t >= e.compte1 ? 1037 : Math.round(1036.8 * ease.outCubic(clamp((t - e.compte0) / (e.compte1 - e.compte0))));
      const z = 1 + 0.06 * pulse(t, e.compte1, 9) * (t >= e.compte1 ? 1 : 0);
      ctx.save(); ctx.globalAlpha *= K.app(t, e.compte0, 0.3); ctx.translate(MX, 880); ctx.scale(z, z);
      const l = K.chiffres(ctx, K.nb(v), 0, 0, { s: 150, w: 800 });
      K.t(ctx, 'Mbit/s', l + 24, 0, { s: 64, w: 700, c: C.mut });
      ctx.restore();
      K.entre(ctx, t, e.giga, () => K.puce(ctx, '≈ 1 Gbit/s', 800, 836, { s: 50, c: C.ora, plein: true }), { zoom: 0.4, cx: 950, cy: 836, d: 0.4 });
      K.onde(ctx, 950, 836, t, e.giga, { c: C.ora });
    }

    // le chronomètre sous la carte, puis « pleine »
    if (t >= e.rempli0 && t < e.plein) K.chiffres(ctx, Math.round(16 * niveau) + ' min', cx + cw / 2, 740, { s: 52, w: 800, a: 'center', c: C.txt2 });
    K.entre(ctx, t, e.plein, () => {
      K.t(ctx, 'pleine en 16 min', cx + cw / 2, 740, { s: 52, w: 800, c: C.rouge, a: 'center' });
    }, { zoom: 0.3, cx: cx + cw / 2, cy: 725, d: 0.35 });
    K.onde(ctx, cx + cw / 2, cy + ch / 2, t, e.plein, { c: C.rouge, r: 330 });
    K.eclair(ctx, t, e.plein);

    K.entre(ctx, t, e.conclusion, () => K.riche(ctx, ['Trop lourd à enregistrer et à transporter : ', ['il faut compresser.', { c: C.txt, w: 800 }]], 960, 978, { s: 42, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     2 · LE DÉBIT : D = l × h × e × q × f
     ========================================================================== */
  const COLS = [
    { cx: 590, sym: 'l × h', val: '1920 × 1080', lab: 'pixels (largeur × hauteur)', c: C.bleu },
    { cx: 1010, sym: 'e', val: '2', lab: 'échantillons par pixel', c: C.vio },
    { cx: 1320, sym: 'q', val: '10', lab: 'bits par échantillon', c: C.ora },
    { cx: 1630, sym: 'f', val: '25', lab: 'images par seconde', c: C.vert },
  ];
  const FOIS = [850, 1165, 1475];

  function illusDebit(ctx, i, cx, t, t0) {
    const c = COLS[i].c, dt = t - t0;
    if (i === 0) { // la grille de pixels, balayée ligne par ligne
      const w = 256, h = 144, x = cx - w / 2, y = 648;
      K.rr(ctx, x, y, w, h, 8); ctx.fillStyle = K.rgba(c, 0.08); ctx.fill();
      ctx.save(); K.rr(ctx, x, y, w, h, 8); ctx.clip(); ctx.strokeStyle = K.rgba(c, 0.3); ctx.lineWidth = 1.5;
      for (let k = 1; k < 16; k++) { ctx.beginPath(); ctx.moveTo(x + k * 16, y); ctx.lineTo(x + k * 16, y + h); ctx.stroke(); }
      for (let k = 1; k < 9; k++) { ctx.beginPath(); ctx.moveTo(x, y + k * 16); ctx.lineTo(x + w, y + k * 16); ctx.stroke(); }
      const n = Math.floor(dt * 40) % 144; ctx.fillStyle = c; ctx.fillRect(x + (n % 16) * 16, y + Math.floor(n / 16) * 16, 16, 16);
      ctx.restore();
      K.rr(ctx, x, y, w, h, 8); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
    } else if (i === 1) { // 4:2:2 : chaque pixel a sa luminance, un pixel sur deux a sa couleur
      const x0 = cx - 127;
      for (let k = 0; k < 4; k++) {
        const x = x0 + k * 66;
        K.rr(ctx, x, 652, 56, 56, 8); ctx.fillStyle = K.rgba(c, 0.1); ctx.fill(); ctx.strokeStyle = K.rgba(c, 0.6); ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 28, 668, 8, 0, 7); ctx.fill();
        if (k % 2 === 0) { ctx.fillStyle = C.azur; ctx.beginPath(); ctx.arc(x + 17, 692, 8, 0, 7); ctx.fill(); ctx.fillStyle = C.rouge; ctx.beginPath(); ctx.arc(x + 39, 692, 8, 0, 7); ctx.fill(); }
      }
      K.t(ctx, '4 pixels → 8 échantillons', cx, 752, { s: 26, c: C.txt2, a: 'center' });
      K.t(ctx, '3 en 4:4:4 · 2 en 4:2:2 · 1,5 en 4:2:0', cx, 800, { s: 26, w: 700, c: c, a: 'center' });
    } else if (i === 2) { // 10 cases : 10 bits
      const bits = '1011001010', x0 = cx - 128;
      for (let k = 0; k < 10; k++) {
        const on = dt > k * 0.05;
        K.rr(ctx, x0 + k * 26, 654, 22, 50, 5); ctx.fillStyle = on ? (bits[k] === '1' ? c : K.rgba(c, 0.25)) : 'rgba(255,255,255,.06)'; ctx.fill();
        if (on) K.t(ctx, bits[k], x0 + k * 26 + 11, 680, { s: 22, w: 800, c: bits[k] === '1' ? '#0b0c0e' : C.txt, a: 'center', b: 'middle' });
      }
      K.t(ctx, '1 024 niveaux', cx, 752, { s: 26, c: C.txt2, a: 'center' });
    } else { // une pile d'images qui défile
      const n = Math.floor(dt * 12.5);
      for (let k = 4; k >= 0; k--) {
        const x = cx - 100 + k * 20, y = 690 - k * 10;
        K.rr(ctx, x, y, 120, 68, 8); ctx.fillStyle = (n + k) % 5 === 0 ? c : '#17251b'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.stroke();
      }
      K.t(ctx, '25 images chaque seconde', cx, 800, { s: 26, c: C.txt2, a: 'center' });
    }
  }

  function scDebit(ctx, t) {
    const e = E.debit;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 2, 'Le débit binaire', C.bleu);
    K.entre(ctx, t, e.definition + 0.15, () => {
      K.riche(ctx, ['Le ', ['débit D', { c: C.txt, w: 800 }], ' : le nombre de bits transmis ', ['chaque seconde', { c: C.bleu, w: 700 }], '.'], MX, 282, { s: 44 });
      K.t(ctx, 'Unité : le bit par seconde (bit/s) · 1 Mbit/s = 1 000 000 bit/s · 1 Gbit/s = 1 000 Mbit/s', MX, 334, { s: 30, c: C.mut });
    });

    // la formule : un terme par croche
    const yF = 480;
    const pose = (k, str, x, c) => K.entre(ctx, t, e.termes[k], () => K.t(ctx, str, x, yF, { s: 120, w: 800, c, a: 'center' }), { zoom: 0.35, cx: x, cy: yF - 42, d: 0.38 });
    pose(0, 'D', 190, C.txt); pose(0, '=', 330, C.mut);
    COLS.forEach((col, i) => {
      if (i) pose(i + 1, '×', FOIS[i - 1], C.mut);
      pose(i + 1, col.sym, col.cx, C.txt);
      // quand sa valeur arrive, le terme prend sa couleur
      const p = K.app(t, e.valeurs[i], 0.35);
      if (p > 0) {
        K.t(ctx, col.sym, col.cx, yF, { s: 120, w: 800, c: col.c, a: 'center', al: p });
        K.entre(ctx, t, e.valeurs[i], () => {
          K.t(ctx, col.val, col.cx, 566, { s: 60, w: 800, c: col.c, a: 'center' });
          K.t(ctx, col.lab, col.cx, 610, { s: 28, c: C.mut, a: 'center' });
        }, { dy: -24, d: 0.4 });
        K.entre(ctx, t, e.valeurs[i] + 0.12, () => illusDebit(ctx, i, col.cx, t, e.valeurs[i]), { dy: 24, d: 0.45 });
      }
    });

    // le résultat : le compteur défile, puis se pose
    if (t >= e.compte0) {
      const fini = t >= e.resultat;
      const v = fini ? 1036800000 : Math.round(1036800000 * ease.outQuad(clamp((t - e.compte0) / (e.resultat - e.compte0))));
      const z = fini ? 1 + 0.05 * pulse(t, e.resultat, 9) : 1;
      ctx.save(); ctx.globalAlpha *= K.app(t, e.compte0, 0.3); ctx.translate(MX, 945); ctx.scale(z, z);
      let x = K.t(ctx, 'D = ', 0, 0, { s: 64, w: 800, c: C.mut });
      x += K.chiffres(ctx, K.nb(v), x, 0, { s: 72, w: 800, c: fini ? C.txt : C.txt2 });
      K.t(ctx, ' bit/s', x, 0, { s: 44, w: 700, c: C.mut });
      ctx.restore();
      K.eclair(ctx, t, e.resultat);
      K.entre(ctx, t, e.environ, () => {
        const l = K.puce(ctx, '≈ 1 037 Mbit/s', 1100, 925, { s: 42, c: C.ora, plein: true });
        K.puce(ctx, '≈ 1 Gbit/s', 1100 + l + 20, 925, { s: 42, c: C.ora });
      }, { zoom: 0.3, cx: 1400, cy: 925, d: 0.4 });
      K.onde(ctx, 1290, 925, t, e.environ, { c: C.ora, r: 300 });
    }
  }

  /* ==========================================================================
     3 · BIT OU OCTET ?
     ========================================================================== */
  function scOctet(ctx, t) {
    const e = E.octet, BITS = [1, 0, 1, 1, 0, 0, 1, 0];
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 3, 'Bit ou octet ?', C.vio);

    // huit bits, un par croche
    const cw = 110, pas = 124, x0 = 960 - (pas * 8 - 14) / 2, y0 = 262;
    BITS.forEach((b, i) => {
      const x = x0 + i * pas, on = t >= e.bits[i], z = on ? 1 + 0.18 * pulse(t, e.bits[i], 10) : 1;
      ctx.save(); ctx.translate(x + cw / 2, y0 + cw / 2); ctx.scale(z, z);
      K.rr(ctx, -cw / 2, -cw / 2, cw, cw, 20);
      ctx.fillStyle = on ? (b ? C.bleu : K.rgba(C.bleu, 0.2)) : 'rgba(255,255,255,.05)'; ctx.fill();
      ctx.strokeStyle = on ? C.bleu : C.ligne; ctx.lineWidth = 2.5; ctx.stroke();
      if (on) K.t(ctx, String(b), 0, 4, { s: 64, w: 800, c: b ? '#0b0c0e' : C.txt, a: 'center', b: 'middle' });
      ctx.restore();
    });
    // l'accolade : huit bits = un octet
    K.entre(ctx, t, e.octet, () => {
      const xa = x0, xb = x0 + pas * 8 - 14;
      ctx.strokeStyle = C.vio; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(xa, 392); ctx.lineTo(xa, 410); ctx.lineTo(xb, 410); ctx.lineTo(xb, 392); ctx.stroke();
      K.riche(ctx, [['1 octet', { c: C.vio }], ' = ', ['8 bits', { c: C.bleu }]], 960, 500, { s: 78, w: 800, c: C.txt, a: 'center' });
    }, { zoom: 0.25, cx: 960, cy: 470, d: 0.4 });
    K.onde(ctx, 960, 318, t, e.octet, { c: C.vio, r: 560, lw: 8 });
    K.eclair(ctx, t, e.octet);

    // qui s'exprime en quoi
    K.entre(ctx, t, e.unites, () => {
      K.carte(ctx, 250, 552, 680, 92, { r: 24 }); K.carte(ctx, 990, 552, 680, 92, { r: 24 });
      K.riche(ctx, ['Débits → en ', ['bits', { c: C.bleu, w: 800 }], ' : Mbit/s'], 590, 612, { s: 40, a: 'center', c: C.txt });
      K.riche(ctx, ['Fichiers → en ', ['octets', { c: C.vio, w: 800 }], ' : Mo, Go'], 1330, 612, { s: 40, a: 'center', c: C.txt });
    });

    // la conversion
    K.entre(ctx, t, e.conv, () => K.t(ctx, '100 Mbit/s', 800, 808, { s: 92, w: 800, c: C.bleu, a: 'right' }), { dx: -30, dy: 0 });
    K.entre(ctx, t, e.div, () => {
      K.fleche(ctx, 850, 778, 1070, 778, { c: C.ora, lw: 6 });
      K.t(ctx, '÷ 8', 960, 748, { s: 56, w: 800, c: C.ora, a: 'center' });
    }, { dy: 0, dx: -20, d: 0.35 });
    K.entre(ctx, t, e.resultat, () => K.t(ctx, '12,5 Mo/s', 1120, 808, { s: 92, w: 800, c: C.vio }), { zoom: 0.3, cx: 1350, cy: 778, d: 0.4 });
    K.onde(ctx, 1350, 778, t, e.resultat, { c: C.vio, r: 320 });

    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : ', ['Mbit/s ≠ Mo/s', { c: C.jaune }], ' — un facteur 8 !'], 960, 930, { s: 40, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     4 · LE TAUX DE COMPRESSION
     ========================================================================== */
  function scTaux(ctx, t) {
    const e = E.taux;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 4, 'Le taux de compression', C.ora);
    K.entre(ctx, t, e.debut + 0.2, () => K.riche(ctx, ['Compresser, c’est réduire le débit. ', ['De combien ?', { c: C.ora, w: 800 }]], MX, 282, { s: 44 }));

    // avant / après : la barre orange est « pressée » jusqu'à 50 Mbit/s
    const xb = 330, L = 1080, hb = 60;
    K.entre(ctx, t, e.avant, () => {
      K.t(ctx, 'Avant', MX, 372, { s: 40, w: 700 });
      K.rr(ctx, xb, 330, L * K.app(t, e.avant, 0.7), hb, 16); ctx.fillStyle = C.bleu; ctx.fill();
      K.t(ctx, '1 037 Mbit/s', xb + L + 28, 373, { s: 40, w: 800, c: C.bleu, al: K.app(t, e.avant + 0.4, 0.4) });
    }, { dy: 0 });
    K.entre(ctx, t, e.presse0, () => {
      const l = K.va(t, e.presse0, e.presse1, L, (L * 50) / 1036.8, ease.inCubic);
      K.t(ctx, 'Après', MX, 462, { s: 40, w: 700 });
      K.rr(ctx, xb, 420, L, hb, 16); ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      K.rr(ctx, xb, 420, l, hb, 16); ctx.fillStyle = C.ora; ctx.fill();
      if (t >= e.presse1) K.t(ctx, '50 Mbit/s', xb + l + 26, 463, { s: 40, w: 800, c: C.ora, al: K.app(t, e.presse1, 0.3) });
    }, { dy: 0, d: 0.2 });
    K.onde(ctx, xb + 30, 450, t, e.presse1, { c: C.ora, r: 200 });

    // la formule, puis les nombres, puis le résultat
    const yF = 600;
    K.entre(ctx, t, e.formule, () => K.riche(ctx, [['τ', { c: C.ora }], ' = D', ['brut', { s: 34, c: C.txt2 }], ' ÷ D', ['compressé', { s: 34, c: C.txt2 }]], MX, yF, { s: 64, w: 800, c: C.txt }));
    K.entre(ctx, t, e.nombres, () => K.t(ctx, '= 1 037 ÷ 50', 800, yF, { s: 64, w: 700, c: C.txt2 }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.resultat, () => {
      K.t(ctx, '≈ 21:1', 1290, yF + 10, { s: 112, w: 800, c: C.ora });
      K.t(ctx, '« vingt et un pour un »', 1490, yF + 58, { s: 30, c: C.mut, a: 'center' });
    }, { zoom: 0.35, cx: 1480, cy: yF - 30, d: 0.42 });
    K.onde(ctx, 1480, yF - 30, t, e.resultat, { c: C.ora, r: 330 });

    // que veut dire 20:1 ? 100 cases, il en reste 5
    if (t >= e.grille) {
      const gx = MX, gy = 700, pas = 28;
      const a = K.app(t, e.grille, 0.4), du = e.p95 - e.efface0;
      for (let i = 0; i < 100; i++) {
        const reste = i < 5, quand = e.efface0 + K.alea(i + 7) * du * 0.85;
        const parti = !reste && t >= quand ? clamp((t - quand) / 0.25) : 0;
        K.rr(ctx, gx + (i % 10) * pas, gy + Math.floor(i / 10) * pas, 22, 22, 5);
        ctx.fillStyle = reste ? K.rgba(C.bleu, a) : K.rgba(C.bleu, a * lerp(0.9, 0.1, parti)); ctx.fill();
      }
      K.entre(ctx, t, e.grille + 0.1, () => K.riche(ctx, ['Et un taux de ', ['20:1', { c: C.txt, w: 800 }], ', qu’est-ce que cela enlève ?'], 440, 742, { s: 42 }), { dx: -20, dy: 0 });
      K.entre(ctx, t, e.efface0, () => K.riche(ctx, ['Il reste 1/20 des données : ', ['5 %', { c: C.bleu, w: 800 }], '.'], 440, 800, { s: 42 }), { dx: -20, dy: 0 });
      K.entre(ctx, t, e.p95, () => {
        K.t(ctx, '95 % supprimés', 440, 908, { s: 100, w: 800, c: C.rouge });
        K.t(ctx, 'Réduction = (1 − 1 ÷ τ) × 100', 444, 962, { s: 32, c: C.mut });
      }, { zoom: 0.25, cx: 800, cy: 880, d: 0.4 });
      K.eclair(ctx, t, e.p95);
      K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : ', ['20:1 ≠ 20 %', { c: C.jaune }], ' !'], W - MX, 880, { s: 40, a: 'right' }), { dy: 24 });
    }
  }

  /* ==========================================================================
     5 · SANS PERTE OU AVEC PERTE ?
     ========================================================================== */
  function scPertes(ctx, t) {
    const e = E.pertes;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 5, 'Sans perte ou avec perte ?', C.vert);
    const volet = (x, t0, tBarre, o) => K.entre(ctx, t, t0, () => {
      const y = 245, w = 820, h = 600;
      K.carte(ctx, x, y, w, h, { s: K.rgba(o.c, 0.45) });
      K.t(ctx, o.titre, x + 50, y + 84, { s: 62, w: 800, c: o.c });
      K.t(ctx, o.anglais, x + w - 50, y + 80, { s: 30, c: C.mut, a: 'right' });
      K.t(ctx, o.phrase, x + 50, y + 138, { s: 33, c: C.txt2 });
      // original → décodée
      K.image(ctx, x + 50, y + 172, 300); K.image(ctx, x + 470, y + 172, 300, { variante: o.variante });
      K.t(ctx, o.signe, x + 410, y + 286, { s: 84, w: 800, c: o.c, a: 'center' });
      K.t(ctx, 'originale', x + 200, y + 378, { s: 26, c: C.mut, a: 'center' }); K.t(ctx, o.decodee, x + 620, y + 378, { s: 26, c: C.mut, a: 'center' });
      // la taille qui reste
      const p = K.va(t, tBarre, tBarre + 0.7, 1, o.reste);
      K.rr(ctx, x + 50, y + 404, 720, 34, 10); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
      K.rr(ctx, x + 50, y + 404, 720 * p, 34, 10); ctx.fillStyle = o.c; ctx.fill();
      K.riche(ctx, ['Gain : ', [o.gain, { c: o.c, w: 800 }]], x + 50, y + 494, { s: 42, c: C.txt, al: K.app(t, tBarre + 0.3, 0.4) });
      let px = x + 50;
      o.formats.forEach((f) => { px += K.puce(ctx, f, px, y + 546, { s: 28, c: o.c }) + 12; });
    }, { dy: 40 });
    volet(MX, e.gauche, e.gaucheBarre, { c: C.vert, titre: 'Sans perte', anglais: 'lossless', phrase: 'L’image décodée est identique, bit pour bit.', variante: 'net', signe: '=', decodee: 'décodée : identique', reste: 0.4, gain: '≈ 2:1 à 3:1', formats: ['ZIP', 'PNG', 'FFV1'] });
    volet(990, e.droite, e.droiteBarre, { c: C.ora, titre: 'Avec perte', anglais: 'lossy', phrase: 'On supprime ce que l’œil voit mal.', variante: 'blocs:72', signe: '≈', decodee: 'décodée : presque pareille', reste: 0.04, gain: '10:1 à plus de 100:1', formats: ['JPEG', 'H.264', 'HEVC', 'ProRes'] });
    K.entre(ctx, t, e.note, () => K.piege(ctx, [['« Visuellement sans perte »', { c: C.jaune }], ' ne veut pas dire « sans perte »'], 960, 928, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     6 · LES QUATRE REDONDANCES
     ========================================================================== */
  const RED = [
    { nom: 'spatiale', c: C.bleu, sous: 'pixels voisins', phrase: ['Dans une image, les pixels', 'voisins se ressemblent.'], outil: 'DCT', role: 'on code les variations', tag: 'intra-image · module 2' },
    { nom: 'temporelle', c: C.vert, sous: 'images voisines', phrase: ['D’une image à la suivante,', 'presque rien ne change.'], outil: 'Prédiction', role: 'on ne code que ce qui change', tag: 'inter-image · module 3' },
    { nom: 'statistique', c: C.ora, sous: 'valeurs fréquentes', phrase: ['Certaines valeurs reviennent', 'très souvent : des zéros !'], outil: 'Codage entropique', role: 'codes courts pour les valeurs fréquentes', tag: 'sans perte · module 4' },
    { nom: 'psychovisuelle', c: C.rose, sous: 'ce que l’œil voit mal', phrase: ['L’œil voit mal les détails de', 'couleur et les textures fines.'], outil: '4:2:0 · quantification', role: 'le codec simplifie ces détails', tag: 'c’est ici qu’est la perte' },
  ];
  function oeil(ctx, cx, cy, s, c, ouverture = 1) {
    ctx.save(); ctx.translate(cx, cy); ctx.lineWidth = s * 0.07; ctx.strokeStyle = C.txt; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.85 * ouverture, s, 0); ctx.quadraticCurveTo(0, s * 0.85 * ouverture, -s, 0); ctx.closePath(); ctx.stroke();
    if (ouverture > 0.4) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#0b0c0e'; ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  // les quatre pictogrammes (tuiles de l'intertitre)
  function picto(ctx, i, cx, cy, c) {
    if (i === 0) { for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) { K.rr(ctx, cx - 86 + b * 44, cy - 64 + a * 44, 40, 40, 7); ctx.fillStyle = `hsl(199, ${88 + ((a + b) % 2) * 6}%, ${60 + a * 3 + b * 2}%)`; ctx.fill(); } }
    else if (i === 1) {
      K.rr(ctx, cx - 100, cy - 60, 130, 86, 10); ctx.fillStyle = '#12301c'; ctx.fill(); ctx.strokeStyle = K.rgba(c, 0.5); ctx.lineWidth = 3; ctx.stroke();
      K.rr(ctx, cx - 40, cy - 26, 130, 86, 10); ctx.fillStyle = '#12301c'; ctx.fill(); ctx.strokeStyle = c; ctx.stroke();
      K.balle(ctx, cx - 6, cy + 18, 15, 0.4); K.balle(ctx, cx + 48, cy + 18, 15);
    } else if (i === 2) { [0.12, 0.22, 0.4, 1, 0.4, 0.22, 0.12].forEach((v, k) => { K.rr(ctx, cx - 94 + k * 28, cy + 62 - v * 124, 22, v * 124, 5); ctx.fillStyle = k === 3 ? c : C.bleu; ctx.fill(); }); }
    else oeil(ctx, cx, cy, 78, c);
  }

  function scInter(ctx, t) {
    const e = E.inter;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entre(ctx, t, e.question, () => K.t(ctx, 'Où sont les bits inutiles ?', 960, 370, { s: 104, w: 800, a: 'center' }), { dy: 36, d: 0.45 });
    K.entre(ctx, t, e.question + 0.3, () => K.riche(ctx, ['Un codec traque ', ['quatre redondances', { c: C.txt, w: 800 }], '.'], 960, 460, { s: 48, a: 'center' }), { dy: 24 });
    RED.forEach((r, i) => {
      const x = 152 + i * 412, y = 560, w = 380, h = 290;
      K.entre(ctx, t, e.tuiles[i], () => {
        K.carte(ctx, x, y, w, h, { s: K.rgba(r.c, 0.5), f: K.rgba(r.c, 0.07) });
        picto(ctx, i, x + w / 2, y + 100, r.c);
        K.t(ctx, r.nom.charAt(0).toUpperCase() + r.nom.slice(1), x + w / 2, y + 222, { s: 44, w: 800, c: r.c, a: 'center' });
        K.t(ctx, r.sous, x + w / 2, y + 262, { s: 28, c: C.txt2, a: 'center' });
      }, { zoom: 0.3, cx: x + w / 2, cy: y + h / 2, d: 0.4 });
      K.onde(ctx, x + w / 2, y + h / 2, t, e.tuiles[i], { c: r.c, r: 280 });
    });
  }

  // --- les quatre illustrations (cadre de gauche : x 110 → 1010, y 300 → 930) ---
  function illusSpatiale(ctx, t, e) {
    const ix = 150, iy = 330, iw = 540, ih = (iw * 9) / 16; // l'image
    K.image(ctx, ix, iy, iw);
    // la zone agrandie : un coin de ciel
    const bx = ix + iw * 0.36, by = iy + ih * 0.2, bw = 60, bh = 30;
    const gx = 170, gy = 682, cw = 124, chh = 76, VAL = [181, 182, 182, 183, 183, 184, 182, 182, 183, 183, 184, 184, 182, 183, 183, 184, 184, 185];
    if (t >= e.a) {
      const a = K.app(t, e.a, 0.35);
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = C.jaune; ctx.lineWidth = 4; K.rr(ctx, bx, by, bw, bh, 4); ctx.stroke(); ctx.restore();
      K.onde(ctx, bx + bw / 2, by + bh / 2, t, e.a, { c: C.jaune, r: 110 });
      K.entre(ctx, t, e.a + 0.1, () => { K.t(ctx, 'Zoom sur un', 730, 392, { s: 30, c: C.txt2 }); K.t(ctx, 'coin de ciel', 730, 432, { s: 30, c: C.txt2 }); }, { dx: -16, dy: 0 });
    }
    if (t >= e.b) {
      const a = K.app(t, e.b, 0.4);
      // le cadre de la zone agrandie reprend le jaune du repère posé sur l'image
      ctx.save(); ctx.globalAlpha *= a; K.rr(ctx, gx - 6, gy - 6, cw * 6 + 12, chh * 3 + 12, 16); ctx.strokeStyle = K.rgba(C.jaune, 0.7); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      VAL.forEach((v, i) => {
        const col = i % 6, lig = Math.floor(i / 6), x = gx + col * cw, y = gy + lig * chh, t0 = e.b + (col + lig) * 0.045;
        K.entre(ctx, t, t0, () => {
          K.rr(ctx, x + 3, y + 3, cw - 6, chh - 6, 10); ctx.fillStyle = `rgb(${v - 136},${v - 84},${v - 12})`; ctx.fill();
          // d'abord la valeur de chaque pixel, puis seulement l'écart avec son voisin
          const p = i === 0 ? 0 : K.app(t, e.c + (col + lig) * 0.04, 0.3);
          const d = i === 0 ? 0 : v - (col === 0 ? VAL[i - 6] : VAL[i - 1]);
          if (p < 1) K.t(ctx, String(v), x + cw / 2, y + chh / 2 + 3, { s: 36, w: 800, c: '#ffffff', a: 'center', b: 'middle', al: 1 - p });
          if (p > 0) K.t(ctx, d > 0 ? '+' + d : String(d), x + cw / 2, y + chh / 2 + 3, { s: 36, w: 800, c: d ? C.jaune : 'rgba(255,255,255,.6)', a: 'center', b: 'middle', al: p });
        }, { zoom: 0.4, cx: x + cw / 2, cy: y + chh / 2, d: 0.3 });
      });
      K.entre(ctx, t, e.b + 0.2, () => K.t(ctx, 'luminance des pixels voisins', gx + 2, gy - 20, { s: 26, c: C.jaune }), { dy: 0 });
    }
    K.entre(ctx, t, e.c, () => { K.t(ctx, 'On décrit les', 730, 520, { s: 30, w: 700, c: C.jaune }); K.t(ctx, 'écarts, pas', 730, 560, { s: 30, w: 700, c: C.jaune }); K.t(ctx, 'chaque pixel.', 730, 600, { s: 30, w: 700, c: C.jaune }); }, { dx: -16, dy: 0 });
  }

  function illusTemporelle(ctx, t, e) {
    const w = 400, h = 225, A = [110, 58], Bp = [150, 50];
    K.t(ctx, 'image n', 150, 344, { s: 28, w: 700, c: C.txt2 });
    K.image(ctx, 150, 358, w, { balle: A });
    K.entre(ctx, t, e.a, () => {
      K.t(ctx, 'image n + 1 (1/25 s plus tard)', 572, 344, { s: 28, w: 700, c: C.txt2 });
      K.image(ctx, 572, 358, w, { balle: Bp });
    }, { dx: -40, dy: 0 });
    // la différence : tout est noir, sauf la balle
    K.entre(ctx, t, e.b, () => {
      const x = 150, y = 668;
      K.t(ctx, 'différence entre les deux images', x, y - 16, { s: 28, w: 700, c: C.txt2 });
      K.rr(ctx, x, y, w, h, 14); ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = K.rgba(C.vert, 0.6); ctx.lineWidth = 2.5; ctx.stroke();
      const k = w / 320;
      ctx.fillStyle = '#16407a'; ctx.beginPath(); ctx.arc(x + A[0] * k, y + A[1] * k, 9.5 * k, 0, 7); ctx.fill(); // là où elle était
      K.balle(ctx, x + Bp[0] * k, y + Bp[1] * k, 9.5 * k); // là où elle est
      K.t(ctx, 'tout le reste : 0', x + w / 2, y + h - 40, { s: 28, w: 700, c: '#8e8e93', a: 'center' });
    }, { dy: 30 });
    K.entre(ctx, t, e.c, () => {
      K.fleche(ctx, 660, 720, 580, 720, { c: C.vert, lw: 5 });
      K.t(ctx, 'Seule la balle', 680, 712, { s: 34, w: 800, c: C.vert }); K.t(ctx, 'a changé.', 680, 756, { s: 34, w: 800, c: C.vert });
      K.t(ctx, 'Plan fixe : plus de 90 %', 680, 834, { s: 26, c: C.txt2 }); K.t(ctx, 'de l’image est identique.', 680, 868, { s: 26, c: C.txt2 });
    }, { dx: -20, dy: 0 });
  }

  function illusStatistique(ctx, t, e) {
    const HIST = [0.05, 0.09, 0.16, 0.3, 1, 0.3, 0.16, 0.09, 0.05], bw = 62, pas = 82, x0 = 560 - (pas * 9 - 20) / 2, yb = 790, hm = 390;
    K.t(ctx, 'Combien de fois chaque valeur apparaît', 150, 352, { s: 28, w: 700, c: C.txt2 });
    K.t(ctx, '(coefficients après DCT et quantification)', 150, 388, { s: 24, c: C.mut });
    ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 20, yb); ctx.lineTo(x0 + pas * 9, yb); ctx.stroke();
    HIST.forEach((v, i) => {
      const x = x0 + i * pas, val = i - 4, zero = val === 0, c = zero ? C.ora : C.bleu;
      const p = ease.outCubic(clamp((t - e.a - Math.abs(val) * 0.07) / 0.6)), h = hm * v * p;
      if (h > 1) { K.rr(ctx, x, yb - h, bw, h, 10); ctx.fillStyle = c; ctx.fill(); }
      K.t(ctx, val > 0 ? '+' + val : val < 0 ? '−' + -val : '0', x + bw / 2, yb + 44, { s: 32, w: 800, c: zero ? C.ora : C.txt2, a: 'center' });
      // la longueur du code : 1 bit pour le zéro, de plus en plus pour les valeurs rares
      const n = Math.abs(val) + 1;
      K.entre(ctx, t, e.b + Math.abs(val) * 0.08, () => {
        for (let k = 0; k < n; k++) { K.rr(ctx, x + bw / 2 - (n * 12 - 3) / 2 + k * 12, yb + 60, 9, 18, 3); ctx.fillStyle = c; ctx.fill(); }
      }, { dy: 10, d: 0.3 });
    });
    K.entre(ctx, t, e.a + 0.5, () => { K.t(ctx, 'le zéro :', x0 + 4.9 * pas, 470, { s: 30, c: C.txt2 }); K.t(ctx, 'presque partout', x0 + 4.9 * pas, 510, { s: 30, w: 800, c: C.ora }); }, { dx: -16, dy: 0 });
    K.entre(ctx, t, e.c, () => K.riche(ctx, ['Valeur fréquente : ', ['code court', { c: C.ora, w: 800 }], ' · valeur rare : code long'], 560, 910, { s: 30, c: C.txt, a: 'center' }), { dy: 14 });
  }

  function illusPsycho(ctx, t, e) {
    const w = 380, h = (w * 9) / 16;
    K.t(ctx, 'Luminance Y′ : tous les détails', 150, 344, { s: 26, w: 700, c: C.txt2 });
    K.image(ctx, 150, 358, w, { variante: 'gris' });
    K.entre(ctx, t, e.a, () => {
      K.t(ctx, 'Couleur Cb, Cr : simplifiée', 590, 344, { s: 26, w: 700, c: C.rose });
      // la couleur perd ses détails, par paliers
      const n = t < e.a + 0.5 ? 160 : t < e.a + 0.9 ? 80 : 40;
      K.image(ctx, 590, 358, w, { variante: 'chroma:' + n, bord: K.rgba(C.rose, 0.6) });
      K.t(ctx, '+', 560, 358 + h / 2 + 22, { s: 64, w: 800, c: C.txt, a: 'center' });
    }, { dx: -40, dy: 0 });
    K.entre(ctx, t, e.b, () => {
      K.t(ctx, '=', 560, 632, { s: 64, w: 800, c: C.txt, a: 'center' });
      K.image(ctx, 370, 650, w, { variante: 'mixte:40' });
    }, { dy: 30 });
    K.entre(ctx, t, e.c, () => {
      const cligne = 1 - 0.9 * pulse(t, e.c + 0.9, 9) * (t > e.c + 0.9 ? 1 : 0);
      oeil(ctx, 240, 756, 70, C.rose, cligne);
      K.t(ctx, 'L’œil ne voit', 778, 730, { s: 30, w: 800, c: C.rose }); K.t(ctx, 'presque pas', 778, 770, { s: 30, w: 800, c: C.rose }); K.t(ctx, 'la différence.', 778, 810, { s: 30, w: 800, c: C.rose });
    }, { dy: 0 });
  }
  const ILLUS = [illusSpatiale, illusTemporelle, illusStatistique, illusPsycho];

  const scRedondance = (i) => (ctx, t) => {
    const e = E.redond[i], r = RED[i];
    K.fond(ctx, t, r.c); K.habillage(ctx, t, S);
    K.entete(ctx, t, -1, 6, 'Les quatre redondances', C.vio);
    // les quatre onglets : celui de la redondance en cours est plein
    let px = MX;
    RED.forEach((o, k) => { px += K.puce(ctx, o.nom, px, 240, { s: 26, c: k === i ? o.c : '#6e6e73', plein: k === i }) + 12; });
    // le cadre de l'illustration
    K.carte(ctx, MX, 290, 900, 650, { r: 30, f: 'rgba(255,255,255,.035)' });
    ILLUS[i](ctx, t, e);
    // la colonne de texte
    const x = 1070;
    K.entre(ctx, t, e.debut, () => {
      K.t(ctx, 'REDONDANCE', x, 352, { s: 28, w: 700, c: C.mut, ls: 4 });
      K.t(ctx, r.nom, x, 440, { s: 88, w: 800, c: r.c });
    }, { dx: 40, dy: 0, d: 0.45 });
    K.entre(ctx, t, e.debut + 0.25, () => { K.t(ctx, r.phrase[0], x, 528, { s: 42, c: C.txt }); K.t(ctx, r.phrase[1], x, 584, { s: 42, c: C.txt }); }, { dx: 40, dy: 0, d: 0.45 });
    K.entre(ctx, t, e.outil, () => {
      K.carte(ctx, x, 648, 740, 180, { s: K.rgba(r.c, 0.6), f: K.rgba(r.c, 0.1) });
      K.t(ctx, 'L’OUTIL DU CODEC', x + 36, 700, { s: 24, w: 700, c: C.mut, ls: 3 });
      K.t(ctx, r.outil, x + 36, 764, { s: 56, w: 800, c: C.txt });
      K.t(ctx, r.role, x + 36, 806, { s: 28, c: C.txt2 });
      K.puce(ctx, r.tag, x, 884, { s: 30, c: i === 3 ? C.rouge : r.c, plein: i === 3 });
    }, { zoom: 0.2, cx: x + 370, cy: 740, d: 0.4 });
    K.onde(ctx, x + 370, 740, t, e.outil, { c: r.c, r: 420 });
  };

  /* ==========================================================================
     7 · LA PLACE OCCUPÉE : V = D × t ÷ 8
     ========================================================================== */
  function scPlace(ctx, t) {
    const e = E.place;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 7, 'La place occupée', C.bleu);
    K.entre(ctx, t, e.formule + 0.15, () => {
      K.riche(ctx, [['V', { c: C.bleu }], ' = D × t ÷ 8'], MX, 356, { s: 112, w: 800, c: C.txt });
      const L = [['V', 'le volume, en octets (Mo, Go)'], ['D', 'le débit, en bit/s'], ['t', 'la durée, en secondes (1 h = 3 600 s)'], ['8', 'le nombre de bits par octet']];
      L.forEach((l, k) => K.riche(ctx, [[l[0], { c: k ? C.txt : C.bleu, w: 800 }], '  ' + l[1]], 1010, 262 + k * 42, { s: 30, c: C.txt2 }));
    });
    K.entre(ctx, t, e.exemple, () => K.t(ctx, '50 Mbit/s × 3 600 s ÷ 8', MX, 480, { s: 60, w: 700, c: C.txt2 }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.resultat, () => {
      const l = K.riche(ctx, ['= 22 500 Mo = ', ['22,5 Go', { c: C.ora }]], MX, 578, { s: 76, w: 800, c: C.txt });
      K.t(ctx, 'pour 1 heure à 50 Mbit/s', MX + l + 34, 574, { s: 32, c: C.mut });
    }, { zoom: 0.2, cx: 560, cy: 550, d: 0.4 });
    K.onde(ctx, 780, 550, t, e.resultat, { c: C.ora, r: 320 });

    // les jauges : une case = une carte de 128 Go
    const gx = MX, sw = 410, vide = 16, hb = 50;
    const cases = (y) => { for (let k = 0; k < 4; k++) { K.rr(ctx, gx + k * (sw + vide), y, sw, hb, 12); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.stroke(); } };
    const noms = (y, go) => { for (let k = 0; k < 4; k++) K.t(ctx, '128 Go', gx + k * (sw + vide) + sw - 14, y + 34, { s: 24, w: 700, c: go >= (k + 0.8) * 128 ? 'rgba(255,255,255,.85)' : '#a1a1a6', a: 'right' }); };
    const remplir = (y, go, c) => { // go : le volume à dessiner, réparti case après case
      for (let k = 0; k < 4; k++) { const part = clamp((go - k * 128) / 128); if (part > 0) { K.rr(ctx, gx + k * (sw + vide), y, Math.max(12, sw * part), hb, 12); ctx.fillStyle = c; ctx.fill(); } }
    };
    K.entre(ctx, t, e.jauge1, () => {
      K.t(ctx, '1 heure à 50 Mbit/s', gx, 672, { s: 34, w: 700 });
      K.t(ctx, '22,5 Go', W - MX, 672, { s: 34, w: 800, c: C.ora, a: 'right' });
      cases(688); remplir(688, 22.5 * K.app(t, e.jauge1, 0.5), C.ora); noms(688, 22.5);
    }, { dy: 20 });
    K.entre(ctx, t, e.jauge2 - 0.2, () => {
      const go = K.va(t, e.jauge2, e.deborde, 0, 466.6, ease.inOutQuad);
      K.t(ctx, '1 heure non compressée', gx, 800, { s: 34, w: 700 });
      cases(816); remplir(816, go, C.rouge); noms(816, go);
      if (t < e.deborde) K.chiffres(ctx, K.nb(go) + ' Go', W - MX, 800, { s: 34, w: 800, c: C.rouge, a: 'right' });
      else K.t(ctx, '467 Go : plus de 3 cartes et demie', W - MX, 800, { s: 34, w: 800, c: C.rouge, a: 'right' });
    }, { dy: 20, d: 0.3 });
    K.eclair(ctx, t, e.deborde);
    K.onde(ctx, gx + 3.65 * (sw + vide), 841, t, e.deborde, { c: C.rouge, r: 240 });
    K.entre(ctx, t, e.astuce, () => K.puce(ctx, 'Astuce : Go par heure = Mbit/s × 0,45', 960, 950, { s: 40, c: C.bleu, a: 'center' }), { zoom: 0.25, cx: 960, cy: 950, d: 0.4 });
    K.onde(ctx, 960, 950, t, e.astuce, { c: C.bleu, r: 480 });
  }

  /* ==========================================================================
     8 · CODEC ≠ CONTENEUR
     ========================================================================== */
  function scCodec(ctx, t) {
    const e = E.codec;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 8, 'Codec ≠ conteneur', C.vio);
    const volet = (x, t0, o) => K.entre(ctx, t, t0, () => {
      const y = 262, w = 760, h = 520;
      K.carte(ctx, x, y, w, h, { s: K.rgba(o.c, 0.5), f: K.rgba(o.c, 0.06) });
      K.t(ctx, o.titre, x + 50, y + 116, { s: 96, w: 800, c: o.c });
      K.riche(ctx, o.origine, x + 54, y + 172, { s: 30, c: C.mut });
      K.riche(ctx, ['= ', [o.image, { c: C.txt, w: 800 }]], x + 50, y + 268, { s: 62, w: 700, c: C.mut });
      K.t(ctx, o.role, x + 54, y + 330, { s: 30, c: C.txt2 });
      let px = x + 50;
      o.exemples.forEach((f) => { px += K.puce(ctx, f, px, y + 430, { s: 30, c: o.c }) + 12; });
    }, { dy: 40 });
    volet(MX, e.gauche, { c: C.vio, titre: 'Codec', origine: [['CO', { c: C.txt, w: 800 }], 'deur – ', ['DÉC', { c: C.txt, w: 800 }], 'odeur'], image: 'la langue', role: 'l’algorithme qui compresse, puis décompresse', exemples: ['H.264', 'HEVC', 'ProRes', 'DNxHR', 'AV1'] });
    volet(1050, e.droite, { c: C.bleu, titre: 'Conteneur', origine: ['le fichier, avec son extension'], image: 'l’enveloppe', role: 'il range l’image, le son, le timecode…', exemples: ['.mov', '.mp4', '.mxf'] });
    K.entre(ctx, t, e.different, () => K.t(ctx, '≠', 960, 570, { s: 150, w: 800, c: C.jaune, a: 'center' }), { zoom: 0.5, cx: 960, cy: 520, d: 0.4 });
    K.onde(ctx, 960, 520, t, e.different, { c: C.jaune, r: 260 });
    K.entre(ctx, t, e.phrase, () => K.t(ctx, 'Un même codec peut voyager dans des enveloppes différentes.', 960, 880, { s: 42, c: C.txt, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     À RETENIR
     ========================================================================== */
  const RETENIR = [
    ['D = l × h × e × q × f', 'HD 4:2:2, 10 bits, 25 i/s ≈ 1 Gbit/s', C.bleu],
    ['1 octet = 8 bits', '100 Mbit/s = 12,5 Mo/s', C.vio],
    ['τ = D brut ÷ D compressé', '20:1 → 95 % des données supprimées', C.ora],
    ['4 redondances', 'spatiale · temporelle · statistique · psychovisuelle', C.rose],
    ['V = D × t ÷ 8', 'Go par heure = Mbit/s × 0,45', C.bleu],
    ['Codec ≠ conteneur', 'la langue ≠ l’enveloppe', C.vio],
  ];
  function scRetenir(ctx, t) {
    const e = E.retenir;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entre(ctx, t, e.debut, () => K.degrade(ctx, 'À retenir', MX, 172, { s: 64 }), { dx: -30, dy: 0 });
    RETENIR.forEach((r, i) => {
      const y = 232 + i * 116, h = 100;
      K.entre(ctx, t, e.lignes[i], () => {
        K.carte(ctx, MX, y, W - 2 * MX, h, { r: 26, s: K.rgba(r[2], 0.35) });
        ctx.fillStyle = r[2]; ctx.beginPath(); ctx.arc(MX + 56, y + h / 2, 26, 0, 7); ctx.fill();
        K.t(ctx, String(i + 1), MX + 56, y + h / 2 + 2, { s: 30, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
        K.t(ctx, r[0], MX + 112, y + 66, { s: 46, w: 800 });
        K.t(ctx, r[1], W - MX - 40, y + 63, { s: 34, c: C.txt2, a: 'right' });
      }, { dx: -50, dy: 0, d: 0.45 });
      K.onde(ctx, MX + 56, y + h / 2, t, e.lignes[i], { c: r[2], r: 90, lw: 4 });
    });
  }

  /* ==========================================================================
     FIN : à vous de jouer
     ========================================================================== */
  const ETAPES = [['Comprendre', ['#5ac8fa', '#007aff']], ['Manipuler', ['#ffb340', '#ff6a3d']], ['Retenir', ['#ff5e8a', '#af52de']], ['S’évaluer', ['#34c759', '#00a37a']]];
  function scFin(ctx, t) {
    const e = E.fin;
    K.fond(ctx, t, C.vio);
    pluieDeBits(ctx, t);
    K.entre(ctx, t, e.titre, () => K.degrade(ctx, 'À vous de jouer.', 960, 370, { s: 128, a: 'center' }), { dy: 40, d: 0.6 });
    const xs = [420, 780, 1140, 1500], y = 580;
    ctx.save(); ctx.globalAlpha *= K.app(t, e.etapes[0], 0.6); ctx.strokeStyle = C.ligne; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xs[0], y); ctx.lineTo(lerp(xs[0], xs[3], K.va(t, e.etapes[0], e.etapes[3], 0, 1, ease.linear)), y); ctx.stroke(); ctx.restore();
    ETAPES.forEach((s, i) => {
      K.entre(ctx, t, e.etapes[i], () => {
        ctx.fillStyle = K.lin(ctx, xs[i] - 40, y - 56, xs[i] + 40, y + 56, s[1]); ctx.beginPath(); ctx.arc(xs[i], y, 56, 0, 7); ctx.fill();
        K.t(ctx, String(i + 1), xs[i], y + 3, { s: 54, w: 800, c: '#ffffff', a: 'center', b: 'middle' });
        K.t(ctx, s[0], xs[i], y + 118, { s: 40, w: 700, a: 'center' });
      }, { zoom: 0.5, cx: xs[i], cy: y, d: 0.4 });
      K.onde(ctx, xs[i], y, t, e.etapes[i], { c: s[1][0], r: 150 });
    });
    K.entre(ctx, t, e.note, () => K.riche(ctx, ['Au moins ', ['12/20', { c: C.txt, w: 800 }], ' à l’évaluation pour ouvrir le module suivant.'], 960, 810, { s: 38, c: C.txt2, a: 'center' }), { dy: 20 });
    K.entre(ctx, t, e.credit, () => K.t(ctx, 'D’après les cours de Pierre MALYCHA · BTS Audiovisuel · Lycée Henri Martin, Saint-Quentin', 960, 970, { s: 26, c: C.mut, a: 'center' }), { dy: 0 });
  }

  /* ==========================================================================
     LE MONTAGE : une scène par chapitre, fondu enchaîné sur la barre de mesure
     ========================================================================== */
  const fondu = { type: 'fade', dur: 0.4 };
  const film = Shots.film([
    { at: 0, draw: scTitre },
    { at: T(B.probleme), draw: scProbleme, in: { type: 'fade', dur: 0.6 } },
    { at: T(B.debit), draw: scDebit, in: fondu },
    { at: T(B.octet), draw: scOctet, in: fondu },
    { at: T(B.taux), draw: scTaux, in: fondu },
    { at: T(B.pertes), draw: scPertes, in: fondu },
    { at: T(B.inter), draw: scInter, in: fondu },
    { at: T(B.spatiale), draw: scRedondance(0), in: fondu },
    { at: T(B.temporelle), draw: scRedondance(1), in: fondu },
    { at: T(B.statistique), draw: scRedondance(2), in: fondu },
    { at: T(B.psycho), draw: scRedondance(3), in: fondu },
    { at: T(B.place), draw: scPlace, in: fondu },
    { at: T(B.codec), draw: scCodec, in: fondu },
    { at: T(B.retenir), draw: scRetenir, in: fondu },
    { at: T(B.fin), draw: scFin, in: { type: 'fade', dur: 0.6 } },
  ]);

  Studio.film({
    draw(ctx, t) { if (t < 0.2) return; film(ctx, t); }, // un instant de noir avant le titre
    post: { paper: 0, grain: 0, vignette: 0.12 },
    init() { ['net', 'gris', 'blocs:72', 'chroma:160', 'chroma:80', 'chroma:40', 'mixte:40'].forEach((v) => K.imageCanevas(v)); },
  });
})();
