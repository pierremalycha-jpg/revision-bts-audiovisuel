// LE FILM — « Compression vidéo · Module 5 · Régler le débit : CBR, VBR, profils et niveaux »
// Dessine l'image de l'instant t (fonction pure de t). Les temps viennent de score.js (SCORE.ev),
// le style et les scènes communes (titre, « À retenir », fin) de kit.js (K).
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, K = globalThis.K;
  const { clamp, lerp, ease, pulse } = U;
  const E = S.ev, C = K.C, W = G.W, MX = K.MX;

  /* ==========================================================================
     OUTILS PROPRES À CE FILM
     ========================================================================== */
  const lisse = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  // La séquence d'exemple : un plan simple, un plan chargé, un plan simple.
  // besoin(u) = la part de bits que les images réclament à l'instant u (0 → 1 le long de la séquence).
  const CHARGE = [0.43, 0.73];
  const besoin = (u) => 0.3 + 0.045 * Math.sin(u * 21) + 0.5 * lisse(CHARGE[0] - 0.03, CHARGE[0] + 0.03, u) * (1 - lisse(CHARGE[1] - 0.03, CHARGE[1] + 0.03, u));
  const DEBIT_CBR = 0.5, PLAFOND = 0.92;
  const debitVBR = (u) => Math.min(PLAFOND, besoin(u) + 0.08);
  const MOYENNE = (() => { let s = 0; for (let i = 0; i < 200; i++) s += debitVBR(i / 199); return s / 200; })();
  const qualiteCBR = (u) => 0.86 - 1.6 * Math.max(0, besoin(u) - DEBIT_CBR);
  const qualiteVBR = (u) => 0.8 + 0.012 * Math.sin(u * 30);

  // Trace fn(u) (valeurs de 0 à 1) dans le rectangle, jusqu'à la progression p.
  function trace(ctx, fn, x, y, w, h, p, { c, lw = 5, tirets = null, al = 1 } = {}) {
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= al; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (tirets) ctx.setLineDash(tirets);
    ctx.beginPath();
    const n = Math.max(2, Math.round(w * p / 4));
    for (let i = 0; i <= n; i++) { const u = (i / n) * p; const px = x + u * w, py = y + h - fn(u) * h; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke(); ctx.restore();
  }
  // Remplit la surface entre deux courbes, là où condition(u) est vraie.
  function entre2(ctx, f1, f2, x, y, w, h, p, couleur, condition) {
    ctx.save(); ctx.fillStyle = couleur;
    const pas = 4 / w;
    for (let u = 0; u < p; u += pas) {
      if (!condition(u)) continue;
      const a = y + h - f1(u) * h, b = y + h - f2(u) * h;
      ctx.fillRect(x + u * w, Math.min(a, b), 4.6, Math.abs(a - b));
    }
    ctx.restore();
  }
  // Coche verte ou croix rouge dans un disque
  function verdict(ctx, x, y, r, ok) {
    ctx.save(); ctx.fillStyle = ok ? C.vert : C.rouge; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#0b0c0e'; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    if (ok) { ctx.moveTo(x - r * 0.45, y + r * 0.02); ctx.lineTo(x - r * 0.12, y + r * 0.36); ctx.lineTo(x + r * 0.48, y - r * 0.34); }
    else { ctx.moveTo(x - r * 0.36, y - r * 0.36); ctx.lineTo(x + r * 0.36, y + r * 0.36); ctx.moveTo(x + r * 0.36, y - r * 0.36); ctx.lineTo(x - r * 0.36, y + r * 0.36); }
    ctx.stroke(); ctx.restore();
  }
  const lignes = (ctx, textes, x, y, pas, o) => textes.forEach((s, i) => (typeof s === 'string' ? K.t(ctx, s, x, y + i * pas, o) : K.riche(ctx, s, x, y + i * pas, o)));

  /* ==========================================================================
     1 · DEUX QUESTIONS
     ========================================================================== */
  function scQuestion(ctx, t) {
    const e = E.question;
    K.fond(ctx, t, C.rose); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 1, 'Deux questions', C.rose);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['Un même codec se règle de mille façons. ', ['Deux questions', { c: C.txt, w: 800 }], ' reviennent toujours.'], MX, 282, { s: 42 }));

    const volet = (x, t0, c, num, titre, sous, dessin) => K.entre(ctx, t, t0, () => {
      const y = 330, w = 820, h = 520;
      K.carte(ctx, x, y, w, h, { s: K.rgba(c, 0.5), f: K.rgba(c, 0.06) });
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 76, y + 82, 36, 0, 7); ctx.fill();
      K.t(ctx, String(num), x + 76, y + 85, { s: 42, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
      K.t(ctx, titre, x + 136, y + 102, { s: 60, w: 800, c });
      K.riche(ctx, sous, x + 44, y + 178, { s: 36, c: C.txt2 });
      dessin(x, y, w, h);
    }, { dy: 40 });

    // 1 : constant ou variable ? Deux lignes de débit se tracent
    volet(MX, e.gauche, C.ora, 1, 'Quel débit ?', [['constant', { c: C.ora, w: 800 }], ' (CBR) ou ', ['variable', { c: C.vert, w: 800 }], ' (VBR) ?'], (x, y) => {
      const p = clamp((t - e.gauche - 0.3) / 1.6), gx = x + 60, gw = 700;
      K.t(ctx, 'CBR', gx, y + 262, { s: 28, w: 800, c: C.ora }); trace(ctx, () => 0.5, gx + 90, y + 220, gw - 90, 70, p, { c: C.ora });
      K.t(ctx, 'VBR', gx, y + 398, { s: 28, w: 800, c: C.vert }); trace(ctx, (u) => 0.1 + debitVBR(u) * 0.9, gx + 90, y + 320, gw - 90, 130, p, { c: C.vert });
      K.t(ctx, 'le débit au fil du temps →', x + 760, y + 484, { s: 24, c: C.mut, a: 'right' });
    });
    // 2 : lisible par le décodeur ? La mention profil@niveau
    volet(990, e.droite, C.vio, 2, 'Sera-t-il lisible ?', ['par le ', ['décodeur', { c: C.txt, w: 800 }], ' visé'], (x, y, w) => {
      K.carte(ctx, x + 60, y + 228, w - 120, 170, { r: 22, f: '#0b0c0e', s: C.ligne });
      K.riche(ctx, [['High', { c: C.vio }], ['@', { c: C.mut }], ['L4.1', { c: C.ora }]], x + w / 2, y + 344, { s: 104, w: 800, a: 'center' });
      K.riche(ctx, [['le profil', { c: C.vio, w: 800 }], ' (quels outils) et ', ['le niveau', { c: C.ora, w: 800 }], ' (quelle charge)'], x + w / 2, y + 462, { s: 30, c: C.txt2, a: 'center' });
    });
    K.entre(ctx, t, e.reponse, () => K.riche(ctx, ['Les réponses : le ', ['contrôle de débit', { c: C.ora, w: 800 }], ', puis le ', ['profil', { c: C.vio, w: 800 }], ' et le ', ['niveau', { c: C.ora, w: 800 }], '.'], 960, 940, { s: 42, c: C.txt, a: 'center' }), { dy: 24 });
    K.onde(ctx, 960, 925, t, e.reponse, { c: C.txt, r: 520, lw: 5 });
  }

  /* ==========================================================================
     2 ET 3 · CBR ET VBR : la même séquence, deux façons de répartir les bits
     ========================================================================== */
  const GX = 160, GW = 880, YD = 352, YQ = 596, HG = 176;
  function scene2graphes(ctx, t, e, vbr) {
    const c = vbr ? C.vert : C.ora, p = clamp((t - e.trace0) / (e.trace1 - e.trace0));
    K.carte(ctx, MX, 250, 980, 572, { r: 30, f: 'rgba(255,255,255,.035)' });
    // la séquence : trois plans
    const a = K.app(t, e.debut + 0.1, 0.5);
    ctx.save(); ctx.globalAlpha *= a;
    [[0, CHARGE[0], 'plan simple', false], [CHARGE[0], CHARGE[1], 'plan chargé', true], [CHARGE[1], 1, 'plan simple', false]].forEach(([u0, u1, nom, charge]) => {
      K.rr(ctx, GX + u0 * GW + 3, 272, (u1 - u0) * GW - 6, 42, 10); ctx.fillStyle = charge ? K.rgba(C.rouge, 0.3) : 'rgba(255,255,255,.09)'; ctx.fill();
      K.t(ctx, nom, GX + (u0 + u1) / 2 * GW, 302, { s: 26, w: 700, c: charge ? '#ffb4ae' : C.txt2, a: 'center' });
    });
    // la zone du plan chargé, sur les deux graphes
    ctx.fillStyle = K.rgba(C.rouge, 0.07); ctx.fillRect(GX + CHARGE[0] * GW, YD - 8, (CHARGE[1] - CHARGE[0]) * GW, YQ + HG - YD + 16);
    // les axes
    [YD, YQ].forEach((y) => { ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(GX, y); ctx.lineTo(GX, y + HG); ctx.lineTo(GX + GW, y + HG); ctx.stroke(); });
    K.t(ctx, 'Débit', GX + 14, YD + 30, { s: 28, w: 800, c: C.bleu });
    K.t(ctx, 'Qualité', GX + 14, YQ + 30, { s: 28, w: 800, c });
    K.t(ctx, 'temps →', GX + GW, 808, { s: 22, c: C.mut, a: 'right' });
    // ce que les images réclament (en pointillé)
    trace(ctx, besoin, GX, YD, GW, HG, 1, { c: 'rgba(255,255,255,.45)', lw: 3, tirets: [4, 9] });
    K.t(ctx, 'besoin des images', GX + GW - 8, YD + HG - besoin(0.9) * HG - 16, { s: 22, c: C.mut, a: 'right' });
    ctx.restore();

    if (!vbr) {
      // CBR : la ligne de débit est plate. Dessous : du bourrage. Dessus : il manque des bits.
      entre2(ctx, besoin, () => DEBIT_CBR, GX, YD, GW, HG, p, 'rgba(255,255,255,.13)', (u) => besoin(u) < DEBIT_CBR);
      entre2(ctx, besoin, () => DEBIT_CBR, GX, YD, GW, HG, p, K.rgba(C.rouge, 0.42), (u) => besoin(u) > DEBIT_CBR);
      trace(ctx, () => DEBIT_CBR, GX, YD, GW, HG, p, { c: C.bleu, lw: 6 });
      trace(ctx, qualiteCBR, GX, YQ, GW, HG, p, { c, lw: 6 });
      K.entre(ctx, t, e.bourrage, () => K.t(ctx, 'bourrage', GX + 0.21 * GW, YD + HG - 0.4 * HG + 8, { s: 24, w: 700, c: C.txt2, a: 'center' }), { dy: 0, d: 0.3 });
      K.entre(ctx, t, e.chute, () => {
        K.t(ctx, 'il manque des bits', GX + 0.58 * GW, YD + HG - 0.64 * HG + 8, { s: 24, w: 800, c: '#ffffff', a: 'center' });
        K.t(ctx, 'image dégradée', GX + 0.58 * GW, YQ + HG - 0.5 * HG, { s: 26, w: 800, c: C.rouge, a: 'center' });
      }, { dy: 0, d: 0.3 });
    } else {
      // VBR : le débit suit le besoin, entre une moyenne et un plafond ; la qualité ne bouge pas.
      const al = K.app(t, e.debut + 0.3, 0.5);
      trace(ctx, () => PLAFOND, GX, YD, GW, HG, 1, { c: C.rouge, lw: 2.5, tirets: [12, 8], al });
      trace(ctx, () => MOYENNE, GX, YD, GW, HG, 1, { c: C.bleu, lw: 2.5, tirets: [12, 8], al: al * 0.8 });
      K.t(ctx, 'plafond', GX + 150, YD + HG - PLAFOND * HG + 28, { s: 22, w: 700, c: C.rouge, al });
      K.t(ctx, 'moyenne', GX + GW * 0.3, YD + HG - MOYENNE * HG - 10, { s: 22, w: 700, c: C.bleu, al });
      entre2(ctx, debitVBR, () => 0, GX, YD, GW, HG, p, K.rgba(C.bleu, 0.16), () => true);
      trace(ctx, debitVBR, GX, YD, GW, HG, p, { c: C.bleu, lw: 6 });
      trace(ctx, qualiteVBR, GX, YQ, GW, HG, p, { c, lw: 6 });
      K.entre(ctx, t, e.qualite, () => K.t(ctx, 'qualité régulière', GX + 0.58 * GW, YQ + HG - 0.8 * HG + 48, { s: 26, w: 800, c, a: 'center' }), { dy: 0, d: 0.3 });
    }
    // la tête de lecture
    if (p > 0 && p < 1) { ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(GX + p * GW, 268); ctx.lineTo(GX + p * GW, YQ + HG); ctx.stroke(); }
  }

  function scCBR(ctx, t) {
    const e = E.cbr, x = 1140;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 2, 'CBR : le débit constant', C.ora);
    scene2graphes(ctx, t, e, false);
    K.entre(ctx, t, e.phrase, () => {
      K.t(ctx, 'CONSTANT BIT RATE', x, 300, { s: 26, w: 700, c: C.mut, ls: 3 });
      lignes(ctx, ['Le même débit', 'à chaque instant.'], x, 372, 54, { s: 46, w: 800 });
    }, { dx: 40, dy: 0 });
    K.entre(ctx, t, e.bourrage, () => lignes(ctx, ['Plan simple : trop de bits,', ['on complète par du ', ['bourrage', { c: C.txt, w: 800 }], '.']], x, 498, 44, { s: 34, c: C.txt2 }), { dx: 30, dy: 0 });
    K.entre(ctx, t, e.chute, () => lignes(ctx, ['Plan chargé : pas assez de bits,', [['la qualité chute', { c: C.rouge, w: 800 }], '.']], x, 612, 44, { s: 34, c: C.txt2 }), { dx: 30, dy: 0 });
    K.eclair(ctx, t, e.chute);
    K.onde(ctx, GX + 0.58 * GW, YQ + HG * 0.62, t, e.chute, { c: C.rouge, r: 260 });
    K.entre(ctx, t, e.usages, () => {
      K.carte(ctx, x, 708, 670, 114, { r: 22, s: K.rgba(C.ora, 0.5), f: K.rgba(C.ora, 0.08) });
      K.t(ctx, 'Direct, satellite, liaisons, caméras', x + 28, 756, { s: 31, w: 800 });
      K.t(ctx, 'XDCAM HD : 50 Mbit/s · AVC-Intra 100', x + 28, 798, { s: 27, c: C.txt2 });
    }, { zoom: 0.2, cx: x + 335, cy: 765, d: 0.4 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : en CBR, c’est le ', ['débit', { c: C.jaune }], ' qui est constant, pas la ', ['qualité', { c: C.jaune }], '.'], 960, 912, { s: 40, a: 'center' }), { dy: 24 });
  }

  function scVBR(ctx, t) {
    const e = E.vbr, x = 1140;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 3, 'VBR : le débit variable', C.vert);
    scene2graphes(ctx, t, e, true);
    K.entre(ctx, t, e.phrase, () => {
      K.t(ctx, 'VARIABLE BIT RATE', x, 300, { s: 26, w: 700, c: C.mut, ls: 3 });
      lignes(ctx, ['Le débit suit la', 'complexité des images.'], x, 372, 54, { s: 46, w: 800 });
    }, { dx: 40, dy: 0 });
    K.entre(ctx, t, e.suit, () => lignes(ctx, ['Plan simple : peu de bits.', 'Plan chargé : beaucoup de bits,', ['entre une ', ['moyenne', { c: C.bleu, w: 800 }], ' et un ', ['plafond', { c: C.rouge, w: 800 }], '.']], x, 490, 42, { s: 32, c: C.txt2 }), { dx: 30, dy: 0 });
    K.entre(ctx, t, e.qualite, () => lignes(ctx, [[['La qualité reste régulière', { c: C.vert, w: 800 }], ','], 'et meilleure à taille égale.'], x, 634, 42, { s: 34, c: C.txt2 }), { dx: 30, dy: 0 });
    K.eclair(ctx, t, e.qualite);
    K.onde(ctx, GX + 0.58 * GW, YQ + HG * 0.2, t, e.qualite, { c: C.vert, r: 300 });
    K.entre(ctx, t, e.bluray, () => {
      K.carte(ctx, x, 708, 670, 114, { r: 22, s: K.rgba(C.vert, 0.5), f: K.rgba(C.vert, 0.08) });
      K.t(ctx, 'Fichiers, Blu-ray, vidéo à la demande', x + 28, 756, { s: 31, w: 800 });
      K.t(ctx, 'Blu-ray : moyenne ≈ 20 à 30, plafond 40 Mbit/s', x + 28, 798, { s: 27, c: C.txt2 });
    }, { zoom: 0.2, cx: x + 335, cy: 765, d: 0.4 });
    // la taille du fichier : c'est la moyenne qui compte
    K.entre(ctx, t, e.formule, () => K.riche(ctx, ['V = D', ['moyen', { s: 32, c: C.bleu }], ' × t ÷ 8'], MX, 912, { s: 62, w: 800, c: C.txt }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.exemple, () => K.t(ctx, '2 h à 20 Mbit/s de moyenne : 20 × 7 200 ÷ 8 = 18 000 Mo', MX, 974, { s: 34, c: C.txt2 }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.resultat, () => K.t(ctx, '= 18 Go', 1066, 976, { s: 52, w: 800, c: C.vert }), { zoom: 0.4, cx: 1160, cy: 958, d: 0.4 });
    K.onde(ctx, 1160, 958, t, e.resultat, { c: C.vert, r: 200 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['La ', ['moyenne', { c: C.jaune }], ', pas le plafond !'], W - MX, 902, { s: 36, a: 'right' }), { dy: 24 });
  }

  /* ==========================================================================
     4 · UNE OU DEUX PASSES, QUALITÉ CONSTANTE
     ========================================================================== */
  function scPasses(ctx, t) {
    const e = E.passes;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 4, 'Une ou deux passes ?', C.bleu);
    const volet = (i, t0, o) => K.entre(ctx, t, t0, () => {
      const x = MX + i * 580, y = 262, w = 540, h = 590, gx = x + 36, gw = w - 72, gy = y + 150, gh = 150;
      K.carte(ctx, x, y, w, h, { s: K.rgba(o.c, 0.5), f: K.rgba(o.c, 0.06) });
      K.t(ctx, o.titre, x + 36, y + 74, { s: 46, w: 800, c: o.c });
      K.t(ctx, o.sous, x + 36, y + 116, { s: 26, c: C.mut });
      // le petit graphe : le besoin en pointillé, et ce que fait le codeur (en boucle, toutes les 3 secondes)
      K.rr(ctx, gx - 10, gy - 12, gw + 20, gh + 24, 14); ctx.fillStyle = '#0b0c0e'; ctx.fill();
      trace(ctx, besoin, gx, gy, gw, gh, 1, { c: 'rgba(255,255,255,.4)', lw: 2.5, tirets: [3, 7] });
      o.graphe(gx, gy, gw, gh, ((t - t0) % 3) / 3);
      lignes(ctx, o.phrase, x + 36, y + 362, 40, { s: 29, c: C.txt });
      (o.plus || []).forEach((l, k) => K.t(ctx, l, x + 36, y + 448 + k * 34, { s: 25, c: C.txt2 }));
      if (o.bilan) K.t(ctx, o.bilan, x + 36, y + 462, { s: 27, w: 800, c: o.c });
      K.puce(ctx, o.tag, x + 36, y + h - 46, { s: 26, c: o.tagC || o.c, plein: !!o.plein });
    }, { dy: 40 });

    volet(0, e.a, {
      c: C.bleu, titre: '1 passe', sous: 'le codeur décide au fil de l’eau',
      phrase: ['Il ne connaît pas la suite :', [['il réagit en retard', { c: C.bleu, w: 800 }], ' aux plans difficiles.']],
      tag: 'possible en direct', tagC: C.vert,
      graphe: (x, y, w, h, u) => trace(ctx, (v) => Math.min(PLAFOND, besoin(Math.max(0, v - 0.085)) + 0.04), x, y, w, h, clamp(u * 1.5), { c: C.bleu }),
    });
    volet(1, e.b, {
      c: C.vio, titre: '2 passes', sous: 'mesurer d’abord, coder ensuite',
      phrase: ['1re passe : il mesure la vidéo.', '2e passe : il répartit les bits.'],
      bilan: 'Meilleur, mais 2 fois plus long.', tag: 'impossible en direct', tagC: C.rouge, plein: true,
      graphe: (x, y, w, h, u) => {
        if (u < 0.4) { // 1re passe : une barre de mesure balaie la séquence
          const px = x + (u / 0.4) * w; ctx.fillStyle = K.rgba(C.vio, 0.25); ctx.fillRect(x, y - 6, px - x, h + 12);
          ctx.strokeStyle = C.vio; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, y - 8); ctx.lineTo(px, y + h + 8); ctx.stroke();
          K.t(ctx, '1re passe', x + 10, y + 26, { s: 22, w: 800, c: C.vio });
        } else { trace(ctx, (v) => besoin(v) + 0.04, x, y, w, h, clamp((u - 0.4) / 0.42), { c: C.vio }); K.t(ctx, '2e passe', x + 10, y + 26, { s: 22, w: 800, c: C.vio }); }
      },
    });
    volet(2, e.c, {
      c: C.ora, titre: 'Qualité constante', sous: 'CRF ou QP fixe : on règle la qualité',
      phrase: ['Chaque plan reçoit les bits', 'dont il a besoin.'],
      plus: ['CRF 18 ≈ visuellement sans perte', 'CRF 23 : valeur par défaut', 'CRF 28 : qualité web modeste'],
      tag: 'taille du fichier imprévisible', tagC: C.jaune,
      graphe: (x, y, w, h, u) => { trace(ctx, () => 0.72, x, y, w, h, clamp(u * 1.5), { c: C.ora }); K.t(ctx, 'qualité', x + 10, y + h - 0.72 * h - 14, { s: 22, w: 800, c: C.ora }); },
    });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Piège : le codage en ', ['2 passes', { c: C.jaune }], ' est impossible en ', ['direct', { c: C.jaune }], '.'], 960, 925, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     5 · LE QP : +6 QP = pas de quantification × 2
     ========================================================================== */
  function scQP(ctx, t) {
    const e = E.qp;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 5, 'Le QP, paramètre de quantification', C.vio);
    // la valeur du curseur au fil de la scène : 22 → 28 → 34 → 40
    const qp = t < e.glisse1 ? 22 : t < e.double ? K.va(t, e.glisse1, e.double, 22, 28) : t < e.glisse2 ? 28 : t < e.quadruple ? K.va(t, e.glisse2, e.quadruple, 28, 34) : K.va(t, e.glisse3, e.glisse3fin, 34, 40);
    const variante = qp < 24 ? 'net' : qp < 31 ? 'blocs:240' : qp < 37 ? 'blocs:120' : 'blocs:64';

    K.entre(ctx, t, e.debut + 0.15, () => {
      const ix = MX, iy = 262, iw = 620, ih = (iw * 9) / 16;
      K.image(ctx, ix, iy, iw, { variante });
      // le curseur de 0 à 51, avec les trois zones de repère
      const y = 706, px = (v) => ix + (v / 51) * iw;
      K.rr(ctx, ix, y - 7, iw, 14, 7); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
      [[18, 22, C.vert], [26, 30, C.ora], [36, 51, C.rouge]].forEach(([a, b, c]) => { K.rr(ctx, px(a), y - 7, px(b) - px(a), 14, 7); ctx.fillStyle = c; ctx.fill(); });
      K.t(ctx, '0', ix, y + 46, { s: 24, c: C.mut }); K.t(ctx, '51', ix + iw, y + 46, { s: 24, c: C.mut, a: 'right' });
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px(qp), y, 19, 0, 7); ctx.fill();
      ctx.fillStyle = C.vio; ctx.beginPath(); ctx.arc(px(qp), y, 9, 0, 7); ctx.fill();
      K.chiffres(ctx, 'QP ' + Math.round(qp), px(qp), y - 36, { s: 36, w: 800, a: 'center' });
      [[C.vert, '18 à 22 : excellente qualité'], [C.ora, '26 à 30 : qualité correcte'], [C.rouge, 'au-delà de 36 : blocs visibles']].forEach(([c, s], k) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ix + 12, 806 + k * 44, 10, 0, 7); ctx.fill();
        K.t(ctx, s, ix + 38, 816 + k * 44, { s: 28, c: C.txt2 });
      });
    });

    const x = 820;
    K.entre(ctx, t, e.intro, () => {
      K.riche(ctx, [['QP', { c: C.vio, w: 800 }], ' : un réglage de 0 à 51'], x, 316, { s: 48, w: 700, c: C.txt });
      lignes(ctx, ['Plus il est grand : moins de bits,', 'mais une image plus dégradée.'], x, 380, 46, { s: 36, c: C.txt2 });
    }, { dx: 40, dy: 0 });
    K.entre(ctx, t, e.formule, () => {
      const l = K.riche(ctx, ['Q', ['pas', { s: 34, c: C.txt2 }], ' ≈ 0,625 × 2'], x, 560, { s: 70, w: 800, c: C.txt });
      K.t(ctx, 'QP/6', x + l + 6, 522, { s: 40, w: 800, c: C.vio });
      K.t(ctx, 'le pas de quantification, réglé par le QP', x, 606, { s: 28, c: C.mut });
    }, { dx: 40, dy: 0 });
    K.entre(ctx, t, e.double, () => K.riche(ctx, [['+6 QP', { c: C.vio }], ' = pas × 2'], x, 738, { s: 104, w: 800, c: C.txt }), { zoom: 0.3, cx: x + 420, cy: 700, d: 0.4 });
    K.eclair(ctx, t, e.double);
    K.onde(ctx, x + 420, 700, t, e.double, { c: C.vio, r: 420 });
    K.entre(ctx, t, e.double + 0.3, () => K.t(ctx, 'QP 22 → 28 : le pas double', x, 808, { s: 36, c: C.txt2 }), { dx: -20, dy: 0 });
    K.entre(ctx, t, e.quadruple, () => K.riche(ctx, ['QP 22 → 34 : ', ['pas × 4', { c: C.vio, w: 800 }]], x + 520, 808, { s: 36, c: C.txt2 }), { zoom: 0.3, cx: x + 690, cy: 796, d: 0.35 });
    K.entre(ctx, t, e.quadruple + 0.3, () => lignes(ctx, ['Le contrôle de débit fait varier le QP', 'pour tenir le débit visé.'], x, 884, 40, { s: 31, c: C.mut }), { dy: 14 });
  }

  /* ==========================================================================
     6 · LE TAMPON : il se remplit à débit régulier, les images en sortent par paquets inégaux
     ========================================================================== */
  const GOP = [['I', 6, C.rouge, 92, 64], ['B', 1, C.vert, 44, 32], ['B', 1, C.vert, 44, 32], ['P', 3, C.azur, 66, 46], ['B', 1, C.vert, 44, 32], ['B', 1, C.vert, 44, 32]];
  function scTampon(ctx, t) {
    const e = E.tampon, tau = Math.max(0, t - e.debut), d = 0.375, x = 1070;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 6, 'Le tampon du décodeur', C.bleu);
    K.carte(ctx, MX, 250, 900, 670, { r: 30, f: 'rgba(255,255,255,.035)' });

    // le niveau : + un débit régulier, − une image (I, B, B, P, B, B…) toutes les 0,375 s
    const n = Math.floor(tau / d); // images déjà sorties
    let sorti = 0; for (let k = 0; k < n; k++) sorti += GOP[k % 6][1];
    const niveau = 5.33 + (13 / (6 * d)) * tau - sorti, CAP = 9;
    const tx = 430, ty = 400, tw = 270, th = 390;
    K.entre(ctx, t, e.debut + 0.1, () => {
      K.t(ctx, 'comme un château d’eau', 150, 306, { s: 28, w: 700, c: C.txt2 });
      // l'arrivée : des paquets identiques, à intervalles réguliers
      K.t(ctx, 'les données arrivent', 150, 372, { s: 26, c: C.txt2 }); K.t(ctx, 'à débit régulier', 150, 406, { s: 26, w: 800, c: C.bleu });
      ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(150, 446); ctx.lineTo(tx, 446); ctx.moveTo(150, 494); ctx.lineTo(tx, 494); ctx.stroke();
      for (let k = 0; k < 9; k++) { const px = 150 + ((k * 34 + tau * 96) % (tx - 150 - 6)); K.rr(ctx, px, 461, 18, 18, 5); ctx.fillStyle = C.bleu; ctx.fill(); }
      // la cuve
      K.rr(ctx, tx, ty, tw, th, 22); ctx.fillStyle = '#0b0c0e'; ctx.fill();
      ctx.save(); K.rr(ctx, tx, ty, tw, th, 22); ctx.clip();
      const hh = (clamp(niveau / CAP) * th);
      ctx.fillStyle = K.lin(ctx, 0, ty + th - hh, 0, ty + th, [K.rgba(C.bleu, 0.85), K.rgba(C.azur, 0.55)]); ctx.fillRect(tx, ty + th - hh, tw, hh);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(tx, ty + th - hh, tw, 4);
      ctx.restore();
      K.rr(ctx, tx, ty, tw, th, 22); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3; ctx.stroke();
      K.t(ctx, 'tampon', tx + tw / 2, ty + th + 44, { s: 30, w: 800, a: 'center' });
      K.t(ctx, 'VBV · HRD', tx + tw / 2, ty + th + 80, { s: 24, c: C.mut, a: 'center' });
      // la sortie : une image à la fois, de tailles très différentes
      K.t(ctx, 'les images sortent,', 730, 566, { s: 26, c: C.txt2 }); K.t(ctx, 'de tailles inégales', 730, 600, { s: 26, w: 800, c: C.ora });
      for (let k = Math.max(0, n - 3); k < n; k++) {
        const g = GOP[k % 6], age = tau - (k + 1) * d; if (age > 1.05) continue;
        const px = tx + tw + 40 + age * 235, al = age < 0.75 ? 1 : clamp(1 - (age - 0.75) / 0.3);
        ctx.save(); ctx.globalAlpha *= al; K.rr(ctx, px - g[3] / 2, 690 - g[4] / 2, g[3], g[4], 8); ctx.fillStyle = g[2]; ctx.fill();
        K.t(ctx, g[0], px, 692, { s: g[0] === 'I' ? 36 : g[0] === 'P' ? 28 : 22, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' }); ctx.restore();
      }
    });
    // les deux limites à ne jamais franchir
    K.entre(ctx, t, e.garanties, () => {
      [[ty + 26, 'jamais plein'], [ty + th - 26, 'jamais vide']].forEach(([y, s]) => {
        ctx.strokeStyle = C.rouge; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(tx - 14, y); ctx.lineTo(tx + tw + 14, y); ctx.stroke(); ctx.setLineDash([]);
        K.t(ctx, s, tx - 26, y + 9, { s: 26, w: 800, c: C.rouge, a: 'right' });
      });
    }, { dy: 0 });

    K.entre(ctx, t, e.phrase, () => {
      lignes(ctx, ['La mémoire d’entrée', 'du décodeur.'], x, 318, 54, { s: 46, w: 800 });
      lignes(ctx, ['Elle absorbe les écarts entre un débit', 'régulier et des images inégales.'], x, 444, 42, { s: 33, c: C.txt2 });
    }, { dx: 40, dy: 0 });
    K.entre(ctx, t, e.poids, () => K.riche(ctx, ['Une image ', ['I', { c: C.rouge, w: 800 }], ' pèse bien plus qu’une image ', ['B', { c: C.vert, w: 800 }], '.'], x, 570, { s: 33, c: C.txt2 }), { dx: 30, dy: 0 });
    K.entre(ctx, t, e.garanties, () => lignes(ctx, [['Le codeur garantit qu’il ne ', ['déborde', { c: C.rouge, w: 800 }]], ['jamais et ne se ', ['vide', { c: C.rouge, w: 800 }], ' jamais.']], x, 650, 42, { s: 33, c: C.txt2 }), { dx: 30, dy: 0 });
    K.entre(ctx, t, e.formule, () => {
      K.carte(ctx, x, 760, 740, 150, { r: 24, s: K.rgba(C.bleu, 0.5), f: K.rgba(C.bleu, 0.08) });
      K.riche(ctx, ['t', ['tampon', { s: 28, c: C.txt2 }], ' = B ÷ D'], x + 34, 852, { s: 52, w: 800, c: C.txt });
    }, { zoom: 0.2, cx: x + 370, cy: 835, d: 0.4 });
    K.entre(ctx, t, e.exemple, () => {
      K.t(ctx, '4 Mbit à 8 Mbit/s', x + 420, 818, { s: 27, c: C.txt2 });
      K.riche(ctx, ['4 ÷ 8 = ', ['0,5 s', { c: C.bleu }]], x + 420, 874, { s: 44, w: 800, c: C.txt });
    }, { zoom: 0.3, cx: x + 560, cy: 846, d: 0.4 });
    K.onde(ctx, x + 560, 846, t, e.exemple, { c: C.bleu, r: 240 });
  }

  /* ==========================================================================
     7 · LE PROFIL : des boîtes à outils emboîtées
     ========================================================================== */
  const PROFILS = [ // de la plus petite boîte à la plus grande
    ['Baseline', 'images I et P, CAVLC', C.jaune],
    ['Main', 'images B, CABAC, entrelacé', C.vert],
    ['High', 'transformée 8 × 8, matrices de quantification', C.bleu],
    ['High 10', '4:2:0 en 10 bits', C.azur],
    ['High 4:2:2', '4:2:2, jusqu’à 10 bits (XAVC, AVC-Intra)', C.vio],
    ['High 4:4:4 Predictive', '4:4:4, jusqu’à 14 bits', C.rose],
  ];
  function scProfil(ctx, t) {
    const e = E.profil, x = 1190;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 7, 'Le profil : la boîte à outils', C.vio);
    // les boîtes : la plus petite d'abord, chaque nouvelle boîte entoure les précédentes
    const bx = MX, by = 256, bw = 1030, bh = 664;
    PROFILS.forEach((p, i) => {
      const m = 5 - i, X = bx + m * 22, Y = by + m * 56, L = bw - m * 44, H = bh - m * 56 - m * 14;
      K.entre(ctx, t, e.boites[i], () => {
        K.carte(ctx, X, Y, L, H, { r: 22, s: p[2], f: K.rgba(p[2], 0.05), lw: 3 });
        K.t(ctx, p[0], X + 22, Y + 40, { s: 29, w: 800, c: p[2] });
        K.t(ctx, p[1], X + L - 22, Y + 39, { s: 24, c: C.txt2, a: 'right' });
      }, { zoom: 0.12, cx: X + L / 2, cy: Y + H / 2, d: 0.4 });
    });
    K.entre(ctx, t, e.boites[5] + 0.3, () => lignes(ctx, ['Chaque profil contient tous les', 'outils du profil qu’il entoure.'], bx + bw / 2, by + 5 * 56 + 150, 44, { s: 32, c: C.txt, a: 'center' }), { dy: 0 });

    K.entre(ctx, t, e.phrase, () => {
      K.t(ctx, 'UN CONTRAT AVEC LE DÉCODEUR', x, 300, { s: 24, w: 700, c: C.mut, ls: 3 });
      lignes(ctx, ['Un sous-ensemble d’outils', 'que le décodeur doit', 'savoir utiliser.'], x, 362, 48, { s: 39, w: 800 });
    }, { dx: 40, dy: 0 });
    // qui lit quoi ?
    const essai = (y, t0, decodeur, fichier, ok) => K.entre(ctx, t, t0, () => {
      K.carte(ctx, x, y, 620, 84, { r: 20, s: K.rgba(ok ? C.vert : C.rouge, 0.6), f: K.rgba(ok ? C.vert : C.rouge, 0.08) });
      const l = K.t(ctx, decodeur, x + 24, y + 54, { s: 30, w: 800 });
      K.fleche(ctx, x + 40 + l, y + 43, x + 96 + l, y + 43, { c: C.mut, lw: 4 });
      K.t(ctx, fichier, x + 112 + l, y + 54, { s: 30, c: C.txt2 });
      verdict(ctx, x + 572, y + 42, 24, ok);
    }, { zoom: 0.2, cx: x + 310, cy: y + 42, d: 0.35 });
    essai(528, e.ok, 'Décodeur High', 'fichier Main', true);
    essai(626, e.ko, 'Décodeur Main', 'fichier High', false);
    K.onde(ctx, x + 572, 570, t, e.ok, { c: C.vert, r: 130 });
    K.onde(ctx, x + 572, 668, t, e.ko, { c: C.rouge, r: 130 });
    K.entre(ctx, t, e.reperes, () => {
      [[['High', C.bleu], ' : Blu-ray, TNT HD, web'], [['High 4:2:2', C.vio], ' : XAVC, AVC-Intra'], [['Baseline', C.jaune], ' : visio, vieux mobiles']].forEach((l, k) =>
        K.riche(ctx, [[l[0][0], { c: l[0][1], w: 800 }], l[1]], x, 776 + k * 46, { s: 30, c: C.txt2 }));
    }, { dy: 20 });
  }

  /* ==========================================================================
     8 · LE NIVEAU : la charge maximale du décodeur
     ========================================================================== */
  const NIVEAUX = [ // [niveau, format le plus lourd (repères du cours), macroblocs/s max, débit max en Main (Mbit/s)]
    ['4', '1080p30', 245760, 20], ['4.1', '1080p30', 245760, 50], ['4.2', '1080p60', 522240, 50], ['5.1', 'UHD 30p', 983040, 240], ['5.2', 'UHD 60p', 2073600, 240],
  ];
  function scNiveau(ctx, t) {
    const e = E.niveau;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 8, 'Le niveau : la charge maximale', C.ora);
    K.entre(ctx, t, e.phrase, () => {
      K.riche(ctx, ['Le ', ['niveau', { c: C.ora, w: 800 }], ' fixe ce que le décodeur peut encaisser :'], MX, 280, { s: 40 });
      let px = MX; ['macroblocs par seconde', 'débit maximal', 'taille du tampon'].forEach((s) => { px += K.puce(ctx, s, px, 334, { s: 27, c: C.ora }) + 12; });
    });
    K.entre(ctx, t, e.formule, () => {
      const l = K.riche(ctx, [['MB/s', { c: C.ora }], ' = ⌈l ÷ 16⌉ × ⌈h ÷ 16⌉ × f'], MX, 446, { s: 70, w: 800, c: C.txt });
      K.t(ctx, 'macroblocs de 16 × 16 pixels dans une image, multipliés par la cadence', MX + 4, 490, { s: 26, c: C.mut });
      void l;
    }, { dx: -24, dy: 0 });
    K.entre(ctx, t, e.etape1, () => K.riche(ctx, ['1920 × 1080 : 120 × 68 = ', ['8 160 macroblocs', { c: C.txt, w: 800 }], ' par image'], MX, 548, { s: 36, c: C.txt2 }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.etape2, () => K.riche(ctx, ['1080p50 : 8 160 × 50 = ', ['408 000 MB/s', { c: C.ora }]], MX, 614, { s: 52, w: 800, c: C.txt }), { dx: -24, dy: 0 });

    // la table des niveaux : on cherche le premier qui supporte 408 000 MB/s
    NIVEAUX.forEach((n, i) => {
      const x = MX + i * 340, y = 650, w = 320, h = 250;
      const trop = i === 1 && t >= e.trop, ok = i === 2 && t >= e.ok, c = trop ? C.rouge : ok ? C.vert : C.ora;
      K.entre(ctx, t, e.echelle + i * 0.07, () => {
        K.carte(ctx, x, y, w, h, { r: 24, s: trop || ok ? c : K.rgba(C.ora, 0.35), f: K.rgba(c, trop || ok ? 0.14 : 0.05), lw: trop || ok ? 4 : 2 });
        K.t(ctx, 'niveau', x + 24, y + 42, { s: 24, c: C.mut });
        K.t(ctx, n[0], x + 24, y + 100, { s: 60, w: 800, c });
        K.t(ctx, n[1], x + w - 24, y + 96, { s: 30, w: 700, c: C.txt2, a: 'right' });
        K.t(ctx, K.nb(n[2]) + ' MB/s', x + 24, y + 158, { s: 31, w: 800 });
        K.riche(ctx, [K.nb(n[3]) + ' Mbit/s', [' en Main', { c: C.mut }]], x + 24, y + 206, { s: 27, c: i === 1 && t >= e.dmax ? C.txt : C.txt2, w: i === 1 && t >= e.dmax ? 800 : 400 });
        if (trop) verdict(ctx, x + w - 44, y + 44, 22, false);
        if (ok) verdict(ctx, x + w - 44, y + 44, 22, true);
      }, { dy: 30, d: 0.4 });
    });
    K.entre(ctx, t, e.trop, () => K.t(ctx, 'trop peu', MX + 340 + 24, 650 + 238, { s: 24, w: 800, c: C.rouge }), { dy: 0, d: 0.2 });
    K.onde(ctx, MX + 340 + 160, 775, t, e.trop, { c: C.rouge, r: 200 });
    K.entre(ctx, t, e.ok, () => K.riche(ctx, ['→ ', ['niveau 4.2', { c: C.vert }]], 1180, 614, { s: 68, w: 800, c: C.mut }), { zoom: 0.4, cx: 1400, cy: 592, d: 0.4 });
    K.eclair(ctx, t, e.ok);
    K.onde(ctx, MX + 680 + 160, 775, t, e.ok, { c: C.vert, r: 240 });
    K.entre(ctx, t, e.dmax, () => K.riche(ctx, ['Débit maximal : High = 1,25 × Main. Niveau 4.1 : 50 × 1,25 = ', ['62,5 Mbit/s', { c: C.ora, w: 800 }], ' en High.'], MX, 962, { s: 35, c: C.txt }), { dy: 16 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Il ne règle ', ['pas la qualité', { c: C.jaune }], ' !'], W - MX, 320, { s: 36, a: 'right' }), { dy: 24 });
  }

  /* ==========================================================================
     9 · LIRE « High@L4.1 »
     ========================================================================== */
  function scLecture(ctx, t) {
    const e = E.lecture;
    K.fond(ctx, t, C.rose); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 9, 'Lire « High@L4.1 »', C.rose);
    // la mention : d'abord blanche, puis chaque morceau prend sa couleur et reçoit son nom
    const s = 176, l1 = K.larg(ctx, 'High', s, 800), l2 = K.larg(ctx, '@', s, 800), l3 = K.larg(ctx, 'L4.1', s, 800), x0 = 960 - (l1 + l2 + l3) / 2, y = 440;
    const pp = K.app(t, e.profil, 0.3), pn = K.app(t, e.niveau, 0.3);
    K.entre(ctx, t, e.mention, () => {
      K.t(ctx, 'High', x0, y, { s, w: 800 }); K.t(ctx, '@', x0 + l1, y, { s, w: 800, c: C.mut }); K.t(ctx, 'L4.1', x0 + l1 + l2, y, { s, w: 800 });
      if (pp > 0) K.t(ctx, 'High', x0, y, { s, w: 800, c: C.vio, al: pp });
      if (pn > 0) K.t(ctx, 'L4.1', x0 + l1 + l2, y, { s, w: 800, c: C.ora, al: pn });
    }, { zoom: 0.3, cx: 960, cy: 380, d: 0.45 });
    const nom = (t0, xa, xb, c, titre, sous) => K.entre(ctx, t, t0, () => {
      ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(xa, 478); ctx.lineTo(xa, 494); ctx.lineTo(xb, 494); ctx.lineTo(xb, 478); ctx.stroke();
      K.t(ctx, titre, (xa + xb) / 2, 552, { s: 42, w: 800, c, a: 'center' });
      K.t(ctx, sous, (xa + xb) / 2, 596, { s: 28, c: C.txt2, a: 'center' });
    }, { dy: -18, d: 0.35 });
    nom(e.profil, x0, x0 + l1, C.vio, 'le profil High', 'la boîte à outils');
    nom(e.niveau, x0 + l1 + l2, x0 + l1 + l2 + l3, C.ora, 'le niveau 4.1', 'la charge maximale');
    K.eclair(ctx, t, e.profil);
    K.onde(ctx, x0 + l1 / 2, 380, t, e.profil, { c: C.vio, r: 320 });

    // en HEVC : un troisième morceau, le tier
    K.entre(ctx, t, e.hevc, () => {
      K.t(ctx, 'EN HEVC', MX, 682, { s: 26, w: 700, c: C.mut, ls: 3 });
      const P = [['Main 10', C.vio, 'profil'], ['@', C.mut, ''], ['L5.1', C.ora, 'niveau'], ['@', C.mut, ''], ['Main', C.vert, 'tier']];
      let px = MX;
      P.forEach((p) => { const l = K.t(ctx, p[0], px, 762, { s: 80, w: 800, c: p[1] }); if (p[2]) K.t(ctx, p[2], px + l / 2, 802, { s: 26, w: 700, c: p[1], a: 'center' }); px += l; });
    }, { dx: -30, dy: 0 });
    K.entre(ctx, t, e.tier, () => {
      K.riche(ctx, ['Le ', ['tier', { c: C.vert, w: 800 }], ' : deux plafonds de débit.'], 1010, 716, { s: 34, c: C.txt });
      lignes(ctx, ['Niveau 5.1 : 40 Mbit/s en Main tier,', '160 Mbit/s en High tier.'], 1010, 762, 38, { s: 29, c: C.txt2 });
    }, { dx: 30, dy: 0 });
    // la règle de compatibilité
    K.entre(ctx, t, e.regle, () => {
      K.carte(ctx, MX, 842, W - 2 * MX, 132, { r: 26, s: K.rgba(C.rose, 0.45) });
      K.riche(ctx, ['Un lecteur lit le fichier si son ', ['profil contient', { c: C.vio, w: 800 }], ' celui du fichier'], MX + 40, 896, { s: 34, c: C.txt });
      K.riche(ctx, ['et si son ', ['niveau est au moins égal', { c: C.ora, w: 800 }], '.'], MX + 40, 942, { s: 34, c: C.txt });
    }, { dy: 30 });
    K.entre(ctx, t, e.bluray, () => {
      K.puce(ctx, 'Blu-ray : H.264 High@L4.1', W - MX - 36, 888, { s: 28, c: C.vert, a: 'right' });
      K.t(ctx, 'VBR, 40 Mbit/s au plus', W - MX - 40, 944, { s: 26, c: C.txt2, a: 'right' });
    }, { dx: 24, dy: 0 });
  }

  /* ==========================================================================
     LE MONTAGE
     ========================================================================== */
  K.monter({
    question: scQuestion, cbr: scCBR, vbr: scVBR, passes: scPasses, qp: scQP,
    tampon: scTampon, profil: scProfil, niveau: scNiveau, lecture: scLecture,
    retenir: K.scRetenir([
      ['CBR : débit constant', 'qualité variable · direct, canaux fixes', C.ora],
      ['VBR : débit variable', 'qualité régulière · V = D moyen × t ÷ 8', C.vert],
      ['2 passes : pas en direct', 'qualité constante : taille imprévisible', C.bleu],
      ['+6 QP = pas × 2', 'QP de 0 à 51 : plus grand, plus dégradé', C.vio],
      ['Profil = la boîte à outils', 'Baseline ⊂ Main ⊂ High ⊂ High 10 ⊂ High 4:2:2', C.rose],
      ['Niveau = la charge maximale', 'High@L4.1 : profil High, niveau 4.1', C.ora],
    ]),
  });
})();
