// LE FILM — « Compression vidéo · Module 4 · Le codage entropique : de Huffman au CABAC »
// Dessine l'image de l'instant t. Tout est une fonction pure de t. Les temps viennent de score.js
// (SCORE.ev), le style de kit.js (K). Titre et fin sont fournis par le kit.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, K = globalThis.K;
  const { clamp, lerp, ease, pulse } = U;
  const E = S.ev, C = K.C, W = G.W, MX = K.MX;

  // Texte en morceaux, comme K.riche, avec en plus les indices : ['log', ['2', { ind: true }], '(p)']
  function ecrit(ctx, morceaux, x, y, { s = 40, w = 400, c = C.txt2, a = 'left', al = 1 } = {}) {
    const M = morceaux.map((p) => (typeof p === 'string' ? [p, {}] : p));
    const taille = (o) => (o.ind ? Math.round(s * 0.55) : o.s || s);
    const L = M.map(([str, o]) => K.larg(ctx, str, taille(o), o.w || w));
    const total = L.reduce((u, v) => u + v, 0);
    let px = a === 'center' ? x - total / 2 : a === 'right' ? x - total : x;
    M.forEach(([str, o], i) => { K.t(ctx, str, px, y + (o.ind ? s * 0.2 : 0), { s: taille(o), w: o.w || w, c: o.c || c, al }); px += L[i]; });
    return total;
  }
  const DEUX = ['2', { ind: true }], IND_I = ['i', { ind: true }];

  // ABRACADABRA : les couleurs des lettres et le code de Huffman du cours (23 bits)
  const MOT = 'ABRACADABRA';
  const COUL = { A: C.bleu, B: C.ora, R: C.rose, C: C.vert, D: C.vio };
  const CODE = { A: '0', C: '100', D: '101', B: '110', R: '111' };

  /* ==========================================================================
     1 · LA DERNIÈRE ÉTAPE
     ========================================================================== */
  const SUITE = [0, 0, 1, 0, 0, 0, -1, 0, 0, 3, 0, 0, 1, 0, 0, 0];
  function scRole(ctx, t) {
    const e = E.role;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 1, 'La dernière étape', C.bleu);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['Le ', ['codage entropique', { c: C.txt, w: 800 }], ' : la ', ['dernière étape', { c: C.bleu, w: 700 }], ' de tout codec.'], MX, 282, { s: 44 }));

    // la chaîne du codec : quatre blocs, un par croche
    const BLOCS = [['Prédiction', 'module 3', C.mut], ['DCT', 'module 2', C.mut], ['Quantification', 'avec perte', C.rouge], ['Codage entropique', 'sans perte', C.vert]];
    BLOCS.forEach((b, i) => {
      const x = MX + i * 390, y = 336, w = 330, h = 108, dernier = i === 3;
      K.entre(ctx, t, e.blocs[i], () => {
        K.carte(ctx, x, y, w, h, { r: 22, f: dernier ? K.rgba(C.bleu, 0.14) : C.carte, s: dernier ? C.bleu : C.ligne, lw: dernier ? 3 : 2 });
        K.t(ctx, b[0], x + w / 2, y + 48, { s: 30, w: 800, a: 'center' });
        K.t(ctx, b[1], x + w / 2, y + 86, { s: 26, w: 700, c: b[2], a: 'center' });
        if (i < 3) K.fleche(ctx, x + w + 8, y + h / 2, x + 382, y + h / 2, { c: C.mut });
        else { K.fleche(ctx, x + w + 8, y + h / 2, x + w + 62, y + h / 2, { c: C.ora }); K.t(ctx, '0110…', x + w + 72, y + h / 2 + 12, { s: 34, w: 800, c: C.ora }); }
      }, { zoom: 0.25, cx: x + w / 2, cy: y + h / 2, d: 0.35 });
    });

    // ce qu'il reste à écrire : seize nombres
    K.entre(ctx, t, e.suite, () => K.t(ctx, 'Ce qu’il reste à écrire : beaucoup de 0, quelques 1, de rares grandes valeurs.', MX, 508, { s: 30, c: C.mut }), { dy: 0 });
    const pas = 106.9, cw = 96;
    SUITE.forEach((v, i) => {
      const x = MX + i * pas, c = v === 0 ? C.bleu : Math.abs(v) === 1 ? C.ora : C.rose;
      if (t >= e.cases[i]) {
        const z = 1 + 0.15 * pulse(t, e.cases[i], 10);
        ctx.save(); ctx.translate(x + cw / 2, 575); ctx.scale(z, z);
        K.rr(ctx, -cw / 2, -42, cw, 84, 16); ctx.fillStyle = K.rgba(c, v === 0 ? 0.14 : 0.28); ctx.fill(); ctx.strokeStyle = K.rgba(c, v === 0 ? 0.4 : 0.9); ctx.lineWidth = 2; ctx.stroke();
        K.t(ctx, v < 0 ? '−' + -v : String(v), 0, 3, { s: 44, w: 800, c: v === 0 ? C.txt2 : c, a: 'center', b: 'middle' });
        ctx.restore();
      }
      // la longueur du code : une case pour le zéro, davantage pour les valeurs rares
      const n = Math.abs(v) + 1;
      K.entre(ctx, t, e.codes + i * 0.03, () => { for (let k = 0; k < n; k++) { K.rr(ctx, x + cw / 2 - (n * 18 - 4) / 2 + k * 18, 634, 14, 26, 4); ctx.fillStyle = c; ctx.fill(); } }, { dy: -10, d: 0.3 });
    });
    K.entre(ctx, t, e.codes + 0.1, () => K.riche(ctx, ['Symbole fréquent → ', ['code court', { c: C.ora, w: 800 }], ' · symbole rare → code long'], 960, 742, { s: 46, c: C.txt, a: 'center' }), { dy: 24 });
    K.entre(ctx, t, e.sms, () => K.t(ctx, 'Comme dans un SMS : « bjr », « stp »… le message reste le même.', 960, 806, { s: 32, c: C.mut, a: 'center' }), { dy: 16 });
    K.entre(ctx, t, e.sansPerte, () => K.riche(ctx, [['Sans perte', { c: C.vert, w: 800 }], ' : le décodeur retrouve exactement les mêmes symboles.'], 960, 912, { s: 42, c: C.txt, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     2 · LE COÛT D'UN SYMBOLE : coût = −log2(p)
     ========================================================================== */
  const COUTS = [
    { p: 0.5, pTxt: 'p = 0,5', quoi: 'une chance sur deux', res: '1 bit', calc: ['(0,5) = 1'], cases: 1 },
    { p: 0.25, pTxt: 'p = 0,25', quoi: 'une chance sur quatre', res: '2 bits', calc: ['(0,25) = 2'], cases: 2 },
    { p: 0.9, pTxt: 'p = 0,9', quoi: 'presque certain', res: '0,15 bit', calc: ['(0,9) ≈ 0,15'], cases: 0.15 },
  ];
  function scCout(ctx, t) {
    const e = E.cout;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 2, 'Le coût d’un symbole', C.ora);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['Plus un symbole est ', ['probable', { c: C.bleu, w: 700 }], ', moins il coûte de bits.'], MX, 282, { s: 44 }));
    K.entre(ctx, t, e.formule, () => {
      ecrit(ctx, [['coût', { c: C.ora }], ' = −log', DEUX, '(p)'], MX, 452, { s: 112, w: 800, c: C.txt });
      K.riche(ctx, [['p', { c: C.bleu, w: 800 }], '  la probabilité du symbole, de 0 à 1'], 1090, 396, { s: 30, c: C.txt2 });
      K.riche(ctx, [['coût', { c: C.ora, w: 800 }], '  le nombre de bits qu’il faut au minimum'], 1090, 442, { s: 30, c: C.txt2 });
    }, { zoom: 0.2, cx: 560, cy: 410, d: 0.4 });

    COUTS.forEach((o, i) => {
      const x = MX + i * 580, y = 540, w = 540, h = 340;
      K.entre(ctx, t, e.cartes[i], () => {
        K.carte(ctx, x, y, w, h, { s: K.rgba(C.ora, 0.4) });
        K.t(ctx, o.pTxt, x + 40, y + 78, { s: 60, w: 800 });
        K.t(ctx, o.quoi, x + 40, y + 166, { s: 26, c: C.mut });
        // la probabilité, en barre
        K.rr(ctx, x + 40, y + 104, 460, 26, 9); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
        K.rr(ctx, x + 40, y + 104, 460 * o.p * K.app(t, e.cartes[i], 0.6), 26, 9); ctx.fillStyle = C.bleu; ctx.fill();
        // le coût, en bits
        K.t(ctx, o.res, x + 40, y + 268, { s: 84, w: 800, c: C.ora });
        ecrit(ctx, ['−log', DEUX, ...o.calc], x + 42, y + 314, { s: 28, c: C.mut });
        const n = Math.ceil(o.cases);
        for (let k = 0; k < n; k++) {
          const bx = x + w - 40 - (n - k) * 76 + 12, by = y + 204;
          K.rr(ctx, bx, by, 64, 64, 12); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
          ctx.save(); K.rr(ctx, bx, by, 64, 64, 12); ctx.clip(); ctx.fillStyle = C.ora; ctx.fillRect(bx, by, 64 * Math.min(1, o.cases - k), 64); ctx.restore();
          K.rr(ctx, bx, by, 64, 64, 12); ctx.strokeStyle = C.ora; ctx.lineWidth = 3; ctx.stroke();
        }
      }, { dy: 40 });
    });
    K.onde(ctx, MX + 2 * 580 + 270, 710, t, e.cartes[2], { c: C.ora, r: 330 });
    K.eclair(ctx, t, e.cartes[2]);
    K.entre(ctx, t, e.conclusion, () => K.riche(ctx, ['Moins d’un bit ? Seul le ', ['codage arithmétique', { c: C.bleu, w: 800 }], ' sait le faire.'], 960, 955, { s: 42, c: C.txt, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     3 · L'ENTROPIE : la limite
     ========================================================================== */
  const SOURCES = [
    { nom: 'Pile ou face', p: [0.5, 0.5], res: 'H = 1 bit' },
    { nom: '90 % de 0, 10 % de 1', p: [0.9, 0.1], res: 'H ≈ 0,47 bit' },
    { nom: '8 symboles équiprobables', p: [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125], res: 'H = 3 bits' },
  ];
  function scEntropie(ctx, t) {
    const e = E.entropie;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 3, 'L’entropie : la limite', C.vio);
    K.entre(ctx, t, e.phrase, () => {
      K.riche(ctx, ['L’', ['entropie H', { c: C.txt, w: 800 }], ' : la quantité moyenne d’information, en bits par symbole.'], MX, 278, { s: 40 });
      K.riche(ctx, ['C’est la ', ['limite', { c: C.vio, w: 800 }], ' : aucun codage sans perte ne fait mieux.'], MX, 332, { s: 40 });
    });
    K.entre(ctx, t, e.formule, () => {
      ecrit(ctx, [['H', { c: C.vio }], ' = −Σ p', IND_I, ' × log', DEUX, '(p', IND_I, ')'], MX, 478, { s: 92, w: 800, c: C.txt });
      ecrit(ctx, [['p', { c: C.txt, w: 800 }], ['i', { ind: true, c: C.txt, w: 800 }], '  la probabilité de chaque symbole'], 1130, 420, { s: 30, c: C.txt2 });
      K.riche(ctx, ['Longueur moyenne d’un code : ', ['L ≥ H', { c: C.vio, w: 800 }]], 1130, 468, { s: 30, c: C.txt2 });
    }, { zoom: 0.2, cx: 560, cy: 440, d: 0.4 });

    SOURCES.forEach((o, i) => {
      const x = MX + i * 580, y = 560, w = 540, h = 322;
      K.entre(ctx, t, e.sources[i], () => {
        K.carte(ctx, x, y, w, h, { s: K.rgba(C.vio, 0.4) });
        K.t(ctx, o.nom, x + 40, y + 54, { s: 32, w: 700 });
        // la répartition des symboles : une barre par symbole, hauteur = probabilité
        const lb = o.p.length > 2 ? 44 : 70, pb = lb + 12, g = K.app(t, e.sources[i] + 0.1, 0.6);
        ctx.strokeStyle = C.ligne; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 40, y + 202); ctx.lineTo(x + w - 40, y + 202); ctx.stroke();
        o.p.forEach((p, k) => { K.rr(ctx, x + 40 + k * pb, y + 200 - p * 124 * g, lb, p * 124 * g, 7); ctx.fillStyle = k === 0 || o.p.length > 2 ? C.bleu : C.ora; ctx.fill(); });
        K.t(ctx, o.res, x + 40, y + 284, { s: 58, w: 800, c: C.vio });
      }, { dy: 40 });
    });
    K.entre(ctx, t, e.conclusion, () => K.riche(ctx, ['Source très prévisible → entropie faible : ', ['elle se compresse très bien', { c: C.vert, w: 800 }], '.'], 960, 955, { s: 40, c: C.txt, a: 'center' }), { dy: 20 });
    K.onde(ctx, MX + 580 + 270, 720, t, e.conclusion, { c: C.vert, r: 320 });
  }

  /* ==========================================================================
     4 · LE CODE DE HUFFMAN : l'arbre d'ABRACADABRA
     ========================================================================== */
  // les nœuds de l'arbre (positions du schéma du cours, agrandies)
  const N = {
    racine: [1144, 380], A: [800, 530], six: [1462, 530], deux: [1277, 680], quatre: [1647, 680],
    C: [1184, 830], D: [1369, 830], B: [1555, 830], R: [1740, 830],
  };
  const FEUILLES = [['A', 5], ['C', 1], ['D', 1], ['B', 2], ['R', 2]];
  function branche(ctx, a, b, p, bit, pBit) {
    if (p <= 0) return;
    const A = N[a], B = N[b], x = lerp(A[0], B[0], p), y = lerp(A[1], B[1], p);
    ctx.save(); ctx.strokeStyle = '#8e8e93'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
    if (pBit > 0) { // 0 à gauche, 1 à droite
      const mx = (A[0] + B[0]) / 2 + (bit === '0' ? -26 : 26), my = (A[1] + B[1]) / 2 - 8;
      ctx.save(); ctx.globalAlpha *= pBit; ctx.fillStyle = C.fond; ctx.beginPath(); ctx.arc(mx, my, 22, 0, 7); ctx.fill(); ctx.restore();
      K.t(ctx, bit, mx, my + 2, { s: 34, w: 800, c: C.ora, a: 'center', b: 'middle', al: pBit });
    }
  }
  function noeud(ctx, t, t0, id, texte, couleur) {
    const [x, y] = N[id];
    K.entre(ctx, t, t0, () => {
      ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.fillStyle = couleur || '#1d1d22'; ctx.fill();
      ctx.strokeStyle = couleur || C.txt2; ctx.lineWidth = 3; ctx.stroke();
      K.t(ctx, texte, x, y + 2, { s: couleur ? 32 : 38, w: 800, c: couleur ? '#0b0c0e' : C.txt, a: 'center', b: 'middle' });
    }, { zoom: 0.5, cx: x, cy: y, d: 0.35 });
  }
  function scHuffman(ctx, t) {
    const e = E.huffman;
    K.fond(ctx, t, C.vert); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 4, 'Le code de Huffman', C.vert);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['On réunit les ', ['deux symboles les moins fréquents', { c: C.vert, w: 700 }], ', et on recommence.'], MX, 282, { s: 42 }));
    // le mot à coder
    K.entre(ctx, t, e.mot, () => {
      [...MOT].forEach((l, i) => K.t(ctx, l, MX + 22 + i * 50, 404, { s: 60, w: 800, c: COUL[l], a: 'center' }));
      K.t(ctx, '11 lettres · 5 symboles différents', MX, 450, { s: 28, c: C.mut });
    }, { dx: -30, dy: 0 });

    // les étapes, à gauche
    const ETAPES = [
      [e.feuilles[0], ['1. Compter chaque lettre']],
      [e.cd, ['2. Les deux plus rares : ', ['C + D = 2', { c: C.txt, w: 800 }]]],
      [e.br, ['3. On recommence : ', ['B + R = 4', { c: C.txt, w: 800 }]]],
      [e.six, ['4. Puis ', ['2 + 4 = 6', { c: C.txt, w: 800 }]]],
      [e.racine, ['5. Enfin ', ['A + 6 = 11', { c: C.txt, w: 800 }], ' : c’est fini']],
    ];
    ETAPES.forEach((s, i) => K.entre(ctx, t, s[0], () => K.riche(ctx, s[1], MX, 540 + i * 58, { s: 32, c: C.txt2 }), { dx: -24, dy: 0, d: 0.4 }));

    // l'arbre : les branches d'abord (sous les nœuds), puis les nœuds
    const pb = K.app(t, e.codes, 0.4);
    const pousse = (t0) => K.app(t, t0, 0.45);
    branche(ctx, 'deux', 'C', pousse(e.cd), '0', pb); branche(ctx, 'deux', 'D', pousse(e.cd), '1', pb);
    branche(ctx, 'quatre', 'B', pousse(e.br), '0', pb); branche(ctx, 'quatre', 'R', pousse(e.br), '1', pb);
    branche(ctx, 'six', 'deux', pousse(e.six), '0', pb); branche(ctx, 'six', 'quatre', pousse(e.six), '1', pb);
    branche(ctx, 'racine', 'A', pousse(e.racine), '0', pb); branche(ctx, 'racine', 'six', pousse(e.racine), '1', pb);
    FEUILLES.forEach((f, i) => noeud(ctx, t, e.feuilles[i], f[0], f[0] + ' ' + f[1], COUL[f[0]]));
    noeud(ctx, t, e.cd, 'deux', '2'); noeud(ctx, t, e.br, 'quatre', '4'); noeud(ctx, t, e.six, 'six', '6'); noeud(ctx, t, e.racine, 'racine', '11');
    K.onde(ctx, N.racine[0], N.racine[1], t, e.racine, { c: C.vert, r: 150 });

    // les codes : le chemin depuis le sommet
    FEUILLES.forEach((f, i) => {
      const [x, y] = N[f[0]];
      K.entre(ctx, t, e.codes + i * 0.06, () => K.t(ctx, f[0] + ' = ' + CODE[f[0]], x, y + 88, { s: 34, w: 800, c: C.ora, a: 'center' }), { dy: -16, d: 0.35 });
    });
    K.eclair(ctx, t, e.codes);
    K.entre(ctx, t, e.codes, () => K.riche(ctx, ['Code = chemin : ', ['0', { c: C.ora, w: 800 }], ' à gauche, ', ['1', { c: C.ora, w: 800 }], ' à droite'], MX, 856, { s: 32, c: C.txt }), { dx: -24, dy: 0 });
    K.entre(ctx, t, e.morale, () => K.t(ctx, 'Lettre fréquente → code court', MX, 934, { s: 36, w: 800, c: C.vert }), { dx: -24, dy: 0 });
    if (t >= e.morale) { ctx.save(); ctx.globalAlpha *= K.app(t, e.morale, 0.4); ctx.strokeStyle = C.vert; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(N.A[0], N.A[1], 56, 0, 7); ctx.stroke(); ctx.restore(); }
    K.onde(ctx, N.A[0], N.A[1], t, e.morale, { c: C.vert, r: 170 });
  }

  /* ==========================================================================
     5 · CODER ABRACADABRA : 23 bits au lieu de 33
     ========================================================================== */
  function scMot(ctx, t) {
    const e = E.mot;
    K.fond(ctx, t, C.ora); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 5, 'Coder ABRACADABRA', C.ora);
    K.entre(ctx, t, e.phrase, () => K.riche(ctx, ['Chaque lettre est remplacée par ', ['son code', { c: C.ora, w: 700 }], '.'], MX, 282, { s: 42 }));

    // les onze lettres ; chacune s'allume sur sa croche et laisse tomber ses bits
    let bits = 0;
    const cw = 140, pas = 154, x0 = 120;
    [...MOT].forEach((l, i) => {
      const x = x0 + i * pas, c = COUL[l], on = t >= e.lettres[i], code = CODE[l];
      if (on) bits += code.length;
      K.entre(ctx, t, e.debut + 0.2 + i * 0.03, () => {
        const z = on ? 1 + 0.14 * pulse(t, e.lettres[i], 10) : 1;
        ctx.save(); ctx.translate(x + cw / 2, 385); ctx.scale(z, z);
        K.rr(ctx, -cw / 2, -55, cw, 110, 20); ctx.fillStyle = K.rgba(c, on ? 0.22 : 0.06); ctx.fill(); ctx.strokeStyle = K.rgba(c, on ? 1 : 0.35); ctx.lineWidth = 2.5; ctx.stroke();
        K.t(ctx, l, 0, 4, { s: 70, w: 800, c: on ? c : K.rgba(c, 0.5), a: 'center', b: 'middle' });
        ctx.restore();
      }, { dy: 20, d: 0.35 });
      K.entre(ctx, t, e.lettres[i], () => {
        [...code].forEach((b, k) => {
          const bx = x + cw / 2 - (code.length * 38 - 6) / 2 + k * 38;
          K.rr(ctx, bx, 456, 32, 42, 7); ctx.fillStyle = b === '1' ? c : K.rgba(c, 0.25); ctx.fill();
          K.t(ctx, b, bx + 16, 479, { s: 26, w: 800, c: b === '1' ? '#0b0c0e' : C.txt, a: 'center', b: 'middle' });
        });
      }, { dy: -18, d: 0.25 });
    });

    // le compteur de bits
    if (t >= e.lettres[0]) {
      const fini = t >= e.total, z = fini ? 1 + 0.08 * pulse(t, e.total, 8) : 1;
      ctx.save(); ctx.globalAlpha *= K.app(t, e.lettres[0], 0.3); ctx.translate(MX, 606); ctx.scale(z, z);
      let x = K.t(ctx, 'Avec Huffman : ', 0, 0, { s: 46, w: 700, c: C.txt2 });
      x += K.chiffres(ctx, String(bits), x, 0, { s: 96, w: 800, c: fini ? C.vert : C.txt });
      K.t(ctx, ' bits', x, 0, { s: 56, w: 800, c: fini ? C.vert : C.txt2 });
      ctx.restore();
      K.onde(ctx, 560, 575, t, e.total, { c: C.vert, r: 300 });
      K.eclair(ctx, t, e.total);
    }
    K.entre(ctx, t, e.prefixe, () => {
      K.riche(ctx, [['Code préfixe', { c: C.txt, w: 800 }], ' : aucun mot n’est le début d’un autre.'], W - MX, 572, { s: 30, c: C.txt2, a: 'right' });
      K.t(ctx, 'On relit les bits sans séparateur.', W - MX, 614, { s: 30, c: C.mut, a: 'right' });
    }, { dx: 24, dy: 0 });

    // la comparaison : longueur fixe (3 bits par lettre) contre Huffman
    const xb = 420, u = 36;
    K.entre(ctx, t, e.fixe, () => {
      ecrit(ctx, ['En longueur fixe : 5 symboles différents → 3 bits par lettre (log', DEUX, ' 5 ≈ 2,32, arrondi au-dessus).'], MX, 680, { s: 28, c: C.mut });
      K.t(ctx, 'Longueur fixe', MX, 736, { s: 36, w: 700 });
      const p = K.app(t, e.fixe, 0.7);
      [...MOT].forEach((l, i) => { if (i / 11 < p) { K.rr(ctx, xb + i * 3 * u, 704, 3 * u - 5, 44, 8); ctx.fillStyle = '#6e6e73'; ctx.fill(); } });
      K.t(ctx, '33 bits', xb + 33 * u + 22, 738, { s: 40, w: 800, c: C.txt2, al: K.app(t, e.fixe + 0.5, 0.3) });
    }, { dy: 20 });
    K.entre(ctx, t, e.fixe + 0.6, () => {
      K.t(ctx, 'Huffman', MX, 826, { s: 36, w: 700, c: C.vert });
      const p = K.app(t, e.fixe + 0.6, 0.7);
      let x = xb;
      [...MOT].forEach((l, i) => { const n = CODE[l].length; if (i / 11 < p) { K.rr(ctx, x, 794, n * u - 5, 44, 8); ctx.fillStyle = COUL[l]; ctx.fill(); } x += n * u; });
      K.t(ctx, '23 bits', xb + 23 * u + 22, 828, { s: 40, w: 800, c: C.vert, al: K.app(t, e.fixe + 1.1, 0.3) });
    }, { dy: 20 });
    K.entre(ctx, t, e.limite, () => K.piege(ctx, ['Limite de Huffman : ', ['au moins 1 bit', { c: C.jaune }], ' par symbole, même très fréquent.'], 960, 930, { s: 38, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     6 · LE CODAGE ARITHMÉTIQUE : l'intervalle se resserre
     ========================================================================== */
  function scArith(ctx, t) {
    const e = E.arith;
    K.fond(ctx, t, C.azur); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 6, 'Le codage arithmétique', C.bleu);
    K.entre(ctx, t, e.phrase, () => {
      K.riche(ctx, ['Tout le message devient ', ['un nombre dans un intervalle', { c: C.bleu, w: 700 }], '.'], MX, 282, { s: 42 });
      K.t(ctx, 'Exemple : des bins où « 0 » a 80 % de chances. Chaque bin réduit l’intervalle à sa part.', MX, 336, { s: 30, c: C.mut });
    });
    const L = 980, hb = 58, LARG = ['1', '0,8', '0,64', '0,512'];
    for (let k = 0; k < 4; k++) {
      const y = 400 + k * 94, w = L * Math.pow(0.8, k);
      // la part du « 0 » du rang précédent devient tout l'intervalle : un voile relie les deux
      if (k > 0 && t >= e.rangs[k]) {
        ctx.save(); ctx.globalAlpha *= K.app(t, e.rangs[k], 0.4) * 0.5; ctx.fillStyle = K.rgba(C.bleu, 0.25);
        ctx.fillRect(MX, y - 94 + hb, w, 94 - hb); ctx.restore();
      }
      K.entre(ctx, t, e.rangs[k], () => {
        const g = K.app(t, e.rangs[k], 0.5), w0 = w * 0.8 * g, w1 = w * 0.2 * g;
        K.rr(ctx, MX, y, w0, hb, 10); ctx.fillStyle = C.bleu; ctx.fill();
        K.rr(ctx, MX + w0 + 3, y, Math.max(0, w1 - 3), hb, 10); ctx.fillStyle = C.ora; ctx.fill();
        K.t(ctx, '0 (80 %)', MX + w0 / 2, y + hb / 2 + 2, { s: 28, w: 800, c: '#0b0c0e', a: 'center', b: 'middle', al: g });
        K.t(ctx, '1', MX + w0 + w1 / 2, y + hb / 2 + 2, { s: 28, w: 800, c: '#0b0c0e', a: 'center', b: 'middle', al: g });
        K.riche(ctx, [k ? 'après « 0 » : largeur ' : 'Départ : largeur ', [LARG[k], { c: C.bleu, w: 800 }]], 1180, y + 40, { s: 34, c: C.txt2 });
      }, { dy: -20, d: 0.4 });
    }
    K.entre(ctx, t, e.calcul, () => ecrit(ctx, ['Trois bins très probables : largeur 0,512 → coût = −log', DEUX, '(0,512) ≈ ', ['0,97 bit', { c: C.ora, w: 800 }], '.'], MX, 842, { s: 40, c: C.txt }), { dy: 20 });
    K.entre(ctx, t, e.resultat, () => K.riche(ctx, [['Moins d’un bit', { c: C.ora, w: 800 }], ' pour trois bins : impossible avec Huffman.'], 960, 942, { s: 52, w: 700, c: C.txt, a: 'center' }), { zoom: 0.2, cx: 960, cy: 925, d: 0.4 });
    K.onde(ctx, 960, 925, t, e.resultat, { c: C.ora, r: 520 });
    K.eclair(ctx, t, e.resultat);
  }

  /* ==========================================================================
     7 · LE CABAC : binarisation → contexte → codage arithmétique binaire
     ========================================================================== */
  function scCabac(ctx, t) {
    const e = E.cabac;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 7, 'Le CABAC', C.vio);
    K.entre(ctx, t, e.sigle, () => {
      const L = (x) => [x, { c: C.vio, w: 800 }];
      K.riche(ctx, [L('C'), 'ontext-', L('A'), 'daptive ', L('B'), 'inary ', L('A'), 'rithmetic ', L('C'), 'oding'], MX, 300, { s: 54, w: 700, c: C.txt });
      K.t(ctx, 'Le codage entropique de H.264 (profils Main et High), de HEVC et de VVC.', MX, 352, { s: 30, c: C.mut });
    });

    const y = 420, w = 380, h = 200, X = (i) => MX + i * 440;
    const bloc = (i, titre, sous, dessin) => K.entre(ctx, t, e.blocs[i], () => {
      const x = X(i);
      K.carte(ctx, x, y, w, h, { r: 24, f: i ? K.rgba(C.vio, 0.12) : C.carte, s: i ? K.rgba(C.vio, 0.7) : C.ligne });
      K.t(ctx, titre, x + w / 2, y + 46, { s: 28, w: 800, a: 'center' });
      dessin(x);
      K.t(ctx, sous, x + w / 2, y + 178, { s: 26, c: C.txt2, a: 'center' });
      if (i < 3) K.fleche(ctx, x + w + 8, y + h / 2, x + 432, y + h / 2, { c: C.mut });
    }, { zoom: 0.25, cx: X(i) + w / 2, cy: y + h / 2, d: 0.38 });

    bloc(0, 'Valeur à coder', 'ex. niveau = 3', (x) => K.t(ctx, '3', x + w / 2, y + 132, { s: 76, w: 800, a: 'center' }));
    bloc(1, '1. Binarisation', 'code unaire : 3 → 1 1 1 0', (x) => {
      [1, 1, 1, 0].forEach((b, k) => {
        const bx = x + w / 2 - 127 + k * 66, on = t >= e.bins[k], z = on ? 1 + 0.2 * pulse(t, e.bins[k], 10) : 1;
        ctx.save(); ctx.translate(bx + 28, y + 106); ctx.scale(z, z);
        K.rr(ctx, -28, -28, 56, 56, 11); ctx.fillStyle = on ? (b ? C.bleu : K.rgba(C.bleu, 0.25)) : 'rgba(255,255,255,.06)'; ctx.fill();
        if (on) K.t(ctx, String(b), 0, 2, { s: 34, w: 800, c: b ? '#0b0c0e' : C.txt, a: 'center', b: 'middle' });
        ctx.restore();
      });
    });
    bloc(2, '2. Contexte', 'p(0) selon les voisins', (x) => {
      // la probabilité du bin : elle bouge un peu à chaque mise à jour (après la boucle)
      const maj = t >= e.boucle ? Math.floor((t - e.boucle) / 0.75) : 0, p = 0.8 + (maj ? [0.04, -0.03, 0.06, 0.01][maj % 4] : 0);
      const bx = x + 40, lw = 300;
      K.rr(ctx, bx, y + 84, lw, 34, 10); ctx.fillStyle = C.ora; ctx.fill();
      K.rr(ctx, bx, y + 84, lw * p, 34, 10); ctx.fillStyle = C.bleu; ctx.fill();
      K.t(ctx, '0', bx + (lw * p) / 2, y + 103, { s: 26, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
      K.t(ctx, '1', bx + lw * p + (lw * (1 - p)) / 2, y + 103, { s: 26, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
    });
    bloc(3, '3. Codage arithmétique', 'binaire : bins → bits', (x) => {
      [1, 0.8, 0.64].forEach((r, k) => { K.rr(ctx, x + 60, y + 72 + k * 24, 260 * r * 0.8, 16, 5); ctx.fillStyle = C.bleu; ctx.fill(); K.rr(ctx, x + 60 + 260 * r * 0.8 + 2, y + 72 + k * 24, 260 * r * 0.2 - 2, 16, 5); ctx.fillStyle = C.ora; ctx.fill(); });
    });

    // les bits sortent
    K.entre(ctx, t, e.bits, () => {
      K.fleche(ctx, X(3) + 270, y + h + 6, X(3) + 270, y + h + 52, { c: C.ora, lw: 5 });
      K.t(ctx, 'bits : 0 1 1 0 1 …', X(3) + 190, y + h + 100, { s: 34, w: 800, c: C.ora, a: 'center' });
    }, { dy: -20, d: 0.35 });
    K.onde(ctx, X(3) + 190, y + h + 90, t, e.bits, { c: C.ora, r: 200 });
    // la boucle : la probabilité est mise à jour
    K.entre(ctx, t, e.boucle, () => {
      const x1 = X(3) + 60, x2 = X(2) + w / 2, yb = y + h;
      ctx.save(); ctx.strokeStyle = C.bleu; ctx.lineWidth = 4; ctx.setLineDash([12, 9]); ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x1, yb + 6); ctx.lineTo(x1, yb + 44); ctx.lineTo(x2, yb + 44); ctx.stroke(); ctx.restore();
      K.fleche(ctx, x2, yb + 44, x2, yb + 6, { c: C.bleu, lw: 4 });
      K.t(ctx, 'mise à jour de p', (x1 + x2) / 2, yb + 84, { s: 28, w: 700, c: C.bleu, a: 'center' });
      K.riche(ctx, ['Après chaque bin, la probabilité est mise à jour : le codeur ', ['apprend', { c: C.bleu, w: 800 }], ' la vidéo.'], MX, 800, { s: 40, c: C.txt });
      K.t(ctx, 'H.264 : près de 460 contextes, 64 états de probabilité chacun. Rien de plus à transmettre.', MX, 852, { s: 30, c: C.mut });
    }, { dy: 0, d: 0.5 });
    K.entre(ctx, t, e.piege, () => K.piege(ctx, ['Un bin n’est pas un bit : ', ['plusieurs bins peuvent tenir dans un seul bit', { c: C.jaune }], '.'], 960, 940, { s: 36, a: 'center' }), { dy: 24 });
  }

  /* ==========================================================================
     8 · CAVLC OU CABAC ?
     ========================================================================== */
  function scChoix(ctx, t) {
    const e = E.choix;
    K.fond(ctx, t, C.rose); K.habillage(ctx, t, S);
    K.entete(ctx, t, e.debut, 8, 'CAVLC ou CABAC ?', C.rose);
    const y = 245, w = 820, h = 545;
    const volet = (x, t0, o, corps) => K.entre(ctx, t, t0, () => {
      K.carte(ctx, x, y, w, h, { s: K.rgba(o.c, 0.5), f: K.rgba(o.c, 0.05) });
      K.t(ctx, o.titre, x + 50, y + 96, { s: 76, w: 800, c: o.c });
      K.t(ctx, o.sigle, x + 52, y + 140, { s: 26, c: C.mut });
      o.lignes.forEach((l, k) => K.t(ctx, '•  ' + l, x + 50, y + 212 + k * 56, { s: 34, c: C.txt2 }));
      K.t(ctx, 'Débit pour la même image', x + 50, y + 422, { s: 26, c: C.mut });
      K.rr(ctx, x + 50, y + 436, 720, 38, 10); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
      corps(x);
    }, { dy: 40 });
    volet(MX, e.gauche, { c: C.bleu, titre: 'CAVLC', sigle: 'Context-Adaptive Variable Length Coding', lignes: ['des tables de codes à longueur variable', 'simple, léger à décoder', 'le seul possible en profil Baseline'] }, (x) => {
      K.rr(ctx, x + 50, y + 436, 720 * K.app(t, e.gauche + 0.2, 0.7), 38, 10); ctx.fillStyle = C.bleu; ctx.fill();
      K.t(ctx, 'la référence', x + 50, y + 514, { s: 34, w: 700, c: C.txt2 });
    });
    volet(990, e.droite, { c: C.vio, titre: 'CABAC', sigle: 'Context-Adaptive Binary Arithmetic Coding', lignes: ['codage arithmétique + contextes', 'H.264 : profils Main et High', 'le seul codage de HEVC et de VVC'] }, (x) => {
      // la barre se resserre : 10 à 15 % de débit en moins (la zone claire montre la fourchette)
      const p = K.va(t, e.presse0, e.gain, 1, 0.9, ease.inOutCubic), g = K.app(t, e.droite + 0.2, 0.7);
      K.rr(ctx, x + 50, y + 436, 720 * p * g, 38, 10); ctx.fillStyle = K.rgba(C.vio, 0.45); ctx.fill();
      K.rr(ctx, x + 50, y + 436, 720 * Math.min(p, 0.85) * g, 38, 10); ctx.fillStyle = C.vio; ctx.fill();
      K.entre(ctx, t, e.gain, () => K.t(ctx, '≈ 10 à 15 % de débit en moins', x + 50, y + 514, { s: 36, w: 800, c: C.vio }), { zoom: 0.2, cx: x + 320, cy: y + 502, d: 0.4 });
      K.entre(ctx, t, e.lourd, () => K.t(ctx, '•  mais plus lourd à décoder (séquentiel)', x + 50, y + 212 + 3 * 56, { s: 34, w: 700, c: C.ora }), { dx: -20, dy: 0 });
    });
    K.onde(ctx, 990 + 320, y + 502, t, e.gain, { c: C.vio, r: 360 });
    K.eclair(ctx, t, e.gain);
    K.entre(ctx, t, e.piege1, () => K.piege(ctx, ['Le CABAC est ', ['sans perte', { c: C.jaune }], ' : il ne dégrade pas l’image.'], 960, 858, { s: 36, a: 'center' }), { dy: 20 });
    K.entre(ctx, t, e.piege2, () => K.piege(ctx, ['Ce n’est pas un codec : c’est l’', ['étape finale', { c: C.jaune }], ' de H.264 et de HEVC.'], 960, 948, { s: 36, a: 'center' }), { dy: 20 });
  }

  /* ==========================================================================
     À RETENIR + MONTAGE
     ========================================================================== */
  K.monter({
    role: scRole, cout: scCout, entropie: scEntropie, huffman: scHuffman, mot: scMot, arith: scArith, cabac: scCabac, choix: scChoix,
    retenir: K.scRetenir([
      ['Codage entropique', 'dernière étape, sans perte : fréquent → code court', C.bleu],
      ['coût = −log₂(p)', 'p = 0,5 → 1 bit · p = 0,9 → 0,15 bit', C.ora],
      ['Entropie H', 'la limite du sans perte · 90 % / 10 % → 0,47 bit', C.vio],
      ['Huffman', 'réunir les deux plus rares · au moins 1 bit par symbole', C.vert],
      ['Codage arithmétique', 'un intervalle · moins de 1 bit par symbole', C.bleu],
      ['CABAC', '10 à 15 % de mieux que le CAVLC · plus lourd à décoder', C.rose],
    ]),
  });
})();
