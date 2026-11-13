// LE KIT DES FILMS — la direction artistique de la plateforme, pour le dessin image par image.
// Fond sombre #0b0c0e (comme toutes les scènes des applications), police Inter (proche de la
// police système du site), couleurs des schémas (COUL de contenu.js), dégradé « spectre »
// réservé aux grands titres. Tout est une fonction pure du temps t : aucune mémoire entre deux images.
(function () {
  const U = globalThis.U, G = globalThis.G;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H;

  const C = {
    fond: '#0b0c0e', txt: '#f5f5f7', txt2: '#d7d7dc', mut: '#98989f', ligne: 'rgba(255,255,255,.14)', carte: 'rgba(255,255,255,.055)',
    bleu: '#64d2ff', azur: '#0a84ff', ora: '#ff9f0a', vio: '#bf5af2', rose: '#ff375f', jaune: '#ffd60a', vert: '#30d158', rouge: '#ff453a',
  };
  const SPECTRE = ['#ff9500', '#ff2d55', '#af52de', '#0a84ff']; // orange → rose → violet → bleu
  const FONT = 'Inter, system-ui, sans-serif';
  const K = { C, SPECTRE, W, H, MX: 110 };

  // couleur #rrggbb + transparence
  K.rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  // pseudo-hasard reproductible
  K.alea = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

  // ---------- le temps ----------
  K.app = (t, t0, d = 0.5) => ease.outCubic(clamp((t - t0) / d)); // 0 → 1, en douceur
  K.rebond = (t, t0, d = 0.45) => (t < t0 ? 0 : ease.outBack(clamp((t - t0) / d), 1.8)); // 0 → dépasse → 1
  K.va = (t, t0, t1, a, b, e = ease.inOutCubic) => lerp(a, b, e(clamp((t - t0) / Math.max(1e-6, t1 - t0))));
  // Fait entrer un élément : il apparaît en glissant (dy, dx) ou en grossissant (zoom autour de cx, cy).
  K.entre = (ctx, t, t0, dessin, { dy = 28, dx = 0, d = 0.5, zoom = 0, cx = 0, cy = 0 } = {}) => {
    if (t < t0) return false;
    const p = K.app(t, t0, d);
    ctx.save();
    ctx.globalAlpha *= clamp(p * 1.4);
    if (zoom) { const s = lerp(1 - zoom, 1, K.rebond(t, t0, d)); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
    else ctx.translate(dx * (1 - p), dy * (1 - p));
    dessin(p);
    ctx.restore();
    return true;
  };

  // ---------- le texte ----------
  K.police = (s, w = 400) => `${w} ${s}px ${FONT}`;
  K.larg = (ctx, str, s, w = 400, ls = 0) => { ctx.save(); ctx.font = K.police(s, w); ctx.letterSpacing = ls + 'px'; const x = ctx.measureText(str).width; ctx.restore(); return x; };
  K.t = (ctx, str, x, y, { s = 40, w = 400, c = C.txt, a = 'left', b = 'alphabetic', al = 1, ls = 0 } = {}) => {
    ctx.save();
    ctx.globalAlpha *= al; ctx.font = K.police(s, w); ctx.letterSpacing = ls + 'px';
    ctx.fillStyle = c; ctx.textAlign = a; ctx.textBaseline = b;
    ctx.fillText(str, x, y);
    const l = ctx.measureText(str).width;
    ctx.restore();
    return l;
  };
  // Texte en plusieurs morceaux de styles différents : ['Le ', ['débit', { c: C.bleu, w: 700 }], ' …']
  K.riche = (ctx, morceaux, x, y, { s = 40, w = 400, c = C.txt2, a = 'left', al = 1 } = {}) => {
    const M = morceaux.map((p) => (typeof p === 'string' ? [p, {}] : p));
    const larg = M.map(([str, o]) => K.larg(ctx, str, o.s || s, o.w || w));
    const total = larg.reduce((u, v) => u + v, 0);
    let px = a === 'center' ? x - total / 2 : a === 'right' ? x - total : x;
    M.forEach(([str, o], i) => { K.t(ctx, str, px, y, { s: o.s || s, w: o.w || w, c: o.c || c, al }); px += larg[i]; });
    return total;
  };
  // Texte rempli par le dégradé « spectre » (grands titres seulement)
  K.degrade = (ctx, str, x, y, { s = 80, w = 800, a = 'left', couleurs = SPECTRE, al = 1 } = {}) => {
    const l = K.larg(ctx, str, s, w), x0 = a === 'center' ? x - l / 2 : a === 'right' ? x - l : x;
    const g = ctx.createLinearGradient(x0, 0, x0 + l, 0);
    couleurs.forEach((k, i) => g.addColorStop(i / (couleurs.length - 1), k));
    return K.t(ctx, str, x, y, { s, w, c: g, a, al });
  };
  // Nombre à chiffres de largeur fixe : il ne « saute » pas quand il défile
  K.chiffres = (ctx, str, x, y, { s = 60, w = 700, c = C.txt, a = 'left', al = 1 } = {}) => {
    const cell = K.larg(ctx, '0', s, w);
    const ls = [...String(str)].map((ch) => (/\d/.test(ch) ? cell : K.larg(ctx, ch, s, w)));
    const total = ls.reduce((u, v) => u + v, 0);
    let px = a === 'center' ? x - total / 2 : a === 'right' ? x - total : x;
    [...String(str)].forEach((ch, i) => { K.t(ctx, ch, px + ls[i] / 2, y, { s, w, c, a: 'center', al }); px += ls[i]; });
    return total;
  };
  // 1036800000 → « 1 036 800 000 » ; 12.5 → « 12,5 »
  K.nb = (v, d = 0) => { const [e, f] = Math.abs(v).toFixed(d).split('.'); return (v < 0 ? '−' : '') + e.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? ',' + f : ''); };

  // ---------- les formes ----------
  K.rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); };
  K.carte = (ctx, x, y, w, h, { r = 28, f = C.carte, s = C.ligne, lw = 2 } = {}) => {
    K.rr(ctx, x, y, w, h, r);
    if (f) { ctx.fillStyle = f; ctx.fill(); }
    if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke(); }
  };
  // Pastille (« pilule ») : fond teinté et texte coloré, ou pleine
  K.puce = (ctx, str, x, y, { s = 30, c = C.bleu, plein = false, a = 'left', w = 700, h, px } = {}) => {
    const hh = h || Math.round(s * 1.75), pad = px || Math.round(s * 0.75), l = K.larg(ctx, str, s, w) + pad * 2;
    const x0 = a === 'center' ? x - l / 2 : a === 'right' ? x - l : x;
    K.rr(ctx, x0, y - hh / 2, l, hh, hh / 2);
    ctx.fillStyle = plein ? c : K.rgba(c, 0.16); ctx.fill();
    if (!plein) { ctx.strokeStyle = K.rgba(c, 0.5); ctx.lineWidth = 2; ctx.stroke(); }
    K.t(ctx, str, x0 + l / 2, y + s * 0.02, { s, w, c: plein ? '#0b0c0e' : c, a: 'center', b: 'middle' });
    return l;
  };
  K.fleche = (ctx, x1, y1, x2, y2, { c = C.mut, lw = 4 } = {}) => {
    const a = Math.atan2(y2 - y1, x2 - x1), k = 8 + lw * 2.4;
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * k * 0.7, y2 - Math.sin(a) * k * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - k * Math.cos(a - 0.42), y2 - k * Math.sin(a - 0.42)); ctx.lineTo(x2 - k * Math.cos(a + 0.42), y2 - k * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  // Triangle « attention » des pièges
  K.attention = (ctx, x, y, s, c = C.jaune) => {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.56); ctx.lineTo(s * 0.6, s * 0.46); ctx.lineTo(-s * 0.6, s * 0.46); ctx.closePath();
    ctx.fillStyle = c; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.16; ctx.strokeStyle = c; ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#0b0c0e'; K.rr(ctx, -s * 0.055, -s * 0.24, s * 0.11, s * 0.36, s * 0.05); ctx.fill();
    ctx.beginPath(); ctx.arc(0, s * 0.28, s * 0.075, 0, 7); ctx.fill();
    ctx.restore();
  };
  // Bandeau « Piège : … »
  K.piege = (ctx, morceaux, x, y, { s = 40, a = 'left', c = C.jaune } = {}) => {
    const l = K.riche(ctx, morceaux, -9999, -9999, { s, w: 700 }) + s * 2.9, h = s * 2.1;
    const x0 = a === 'center' ? x - l / 2 : a === 'right' ? x - l : x;
    K.carte(ctx, x0, y - h / 2, l, h, { r: h / 2, f: K.rgba(c, 0.13), s: K.rgba(c, 0.55), lw: 2.5 });
    K.attention(ctx, x0 + s * 1.05, y, s * 0.92, c);
    K.riche(ctx, morceaux, x0 + s * 1.95, y + s * 0.35, { s, w: 700, c: C.txt });
    return l;
  };
  // Onde qui s'élargit à l'instant t0 : marque un « coup » (le son tombe au même moment)
  K.onde = (ctx, x, y, t, t0, { c = C.txt, r = 220, d = 0.6, lw = 6 } = {}) => {
    const u = (t - t0) / d; if (u < 0 || u > 1) return;
    ctx.save(); ctx.globalAlpha *= (1 - u) * 0.75; ctx.strokeStyle = c; ctx.lineWidth = lw * (1 - u * 0.7);
    ctx.beginPath(); ctx.arc(x, y, r * ease.outCubic(u), 0, 7); ctx.stroke(); ctx.restore();
  };
  // Éclair très bref sur toute l'image à l'instant d'un résultat (visible, jamais agressif)
  K.eclair = (ctx, t, t0, c = '#ffffff', force = 0.13) => {
    const u = t - t0; if (u < 0 || u > 0.4) return;
    ctx.save(); ctx.globalAlpha = force * Math.exp(-u * 12); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.restore();
  };
  K.halo = (ctx, x, y, r, c, a = 0.3) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, K.rgba(c, a)); g.addColorStop(1, K.rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  K.lin = (ctx, x0, y0, x1, y1, couleurs) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); couleurs.forEach((k, i) => g.addColorStop(i / (couleurs.length - 1), k)); return g; };

  // ---------- l'icône de l'application (celle de l'accueil du site) ----------
  const ICONE = { teinte: ['#64d2ff', '#5e5ce6', '#bf5af2'] };
  K.icone = (ctx, cx, cy, s, { presse = 0 } = {}) => {
    ctx.save(); ctx.translate(cx - s / 2, cy - s / 2);
    K.rr(ctx, 0, 0, s, s, s * 0.225);
    ctx.fillStyle = K.lin(ctx, s * 0.2, 0, s * 0.8, s, ICONE.teinte); ctx.fill();
    const k = (s * 0.62) / 24; ctx.translate(s * 0.19, s * 0.19); ctx.scale(k, k);
    ctx.strokeStyle = ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // l'image, serrée entre les deux flèches
    const l = 10 - presse * 2.4, x = 12 - l / 2;
    ctx.lineWidth = 1.8; K.rr(ctx, x, 5.5, l, 13, 2.2); ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.7; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(12, 5.8); ctx.lineTo(12, 18.2); ctx.moveTo(x + 0.3, 12); ctx.lineTo(x + l - 0.3, 12); ctx.stroke(); ctx.restore();
    K.rr(ctx, x + 1.6, 7.2, (l - 4.8) / 2, 3.4, 0.6); ctx.fill();
    ctx.lineWidth = 1.8;
    const d = presse * 1.3;
    ctx.stroke(new Path2D(`M${1.8 + d} 12h3.4M${3.6 + d} 9.9 ${5.6 + d} 12l-2 2.1M${22.2 - d} 12h-3.4M${20.4 - d} 9.9 ${18.4 - d} 12l2 2.1`));
    ctx.restore();
  };

  // ---------- l'image de test (la même que dans les labos : ciel, maison, arbre, panneau, mire) ----------
  // Dessinée une fois dans un canevas caché de 960 × 540, puis recopiée.
  const cache = new Map();
  function scene(c) {
    c.save(); c.scale(3, 3); // repère de 320 × 180
    let g = c.createLinearGradient(0, 0, 0, 116);
    g.addColorStop(0, '#2d6cb4'); g.addColorStop(1, '#b9def3');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180);
    g = c.createRadialGradient(262, 32, 2, 262, 32, 24);
    g.addColorStop(0, '#fffbe6'); g.addColorStop(0.55, '#ffe49a'); g.addColorStop(1, 'rgba(255,228,154,0)');
    c.fillStyle = g; c.beginPath(); c.arc(262, 32, 24, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.82)';
    [[64, 28, 16], [80, 22, 18], [98, 29, 14], [82, 32, 14]].forEach((n) => { c.beginPath(); c.arc(n[0], n[1], n[2], 0, 7); c.fill(); });
    c.fillStyle = '#7ba564'; c.beginPath(); c.moveTo(-10, 180);
    for (let x = -10; x <= 330; x += 3) c.lineTo(x, 104 + 7 * Math.sin(x / 26) + 4 * Math.sin(x / 9));
    c.lineTo(330, 180); c.closePath(); c.fill();
    c.fillStyle = '#4d7c38'; c.fillRect(0, 134, 320, 50);
    c.lineWidth = 1;
    for (let i = 0; i < 380; i++) {
      const x = K.alea(i) * 320, y = 136 + K.alea(i + 999) * 42;
      c.strokeStyle = K.alea(i + 77) > 0.5 ? '#73aa4f' : '#335f26';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1.6 - K.alea(i + 5) * 3, y - 3 - K.alea(i + 9) * 3); c.stroke();
    }
    c.fillStyle = '#5b3b22'; c.fillRect(60, 90, 9, 48);
    for (let i = 0; i < 340; i++) {
      const a = K.alea(i + 300) * 6.283, r = Math.sqrt(K.alea(i + 600)) * 30;
      c.fillStyle = `hsl(${95 + K.alea(i + 900) * 40},${40 + K.alea(i + 1200) * 25}%,${20 + K.alea(i + 1500) * 28}%)`;
      c.beginPath(); c.arc(64 + Math.cos(a) * r * 1.1, 76 + Math.sin(a) * r * 0.9, 1.6 + K.alea(i + 1800) * 2.6, 0, 7); c.fill();
    }
    c.fillStyle = '#efe3cb'; c.fillRect(150, 82, 70, 54);
    c.fillStyle = '#b2452f'; c.beginPath(); c.moveTo(142, 83); c.lineTo(185, 52); c.lineTo(228, 83); c.closePath(); c.fill();
    c.fillStyle = '#2b4a6f'; c.fillRect(160, 94, 22, 18);
    c.fillStyle = '#ffffff'; c.fillRect(170, 94, 2, 18); c.fillRect(160, 102, 22, 2);
    c.fillStyle = '#6b4226'; c.fillRect(196, 106, 14, 30);
    c.fillStyle = '#fbfbfb'; c.fillRect(236, 110, 72, 24);
    c.fillStyle = '#111111'; c.font = `700 16px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    G.decor(() => c.fillText('BTS AV', 272, 123));
    ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'].forEach((k, i) => { c.fillStyle = k; c.fillRect(8 + i * 14, 150, 14, 24); });
    c.restore();
  }
  // variante : 'net' (l'image) · 'gris' (la luminance seule) · 'blocs:n' (mosaïque de n pixels de large)
  // 'chroma:n' (la couleur seule, en mosaïque) · 'mixte:n' (luminance nette + couleur en mosaïque : un vrai « 4:2:0 » exagéré)
  K.imageCanevas = (variante = 'net') => {
    if (cache.has(variante)) return cache.get(variante);
    const cv = G.makeCanvas(960, 540), c = cv.getContext('2d');
    const [genre, taille] = variante.split(':');
    if (genre === 'net') scene(c);
    else {
      const src = K.imageCanevas('net');
      if (genre === 'gris') { c.filter = 'grayscale(1)'; c.drawImage(src, 0, 0); c.filter = 'none'; }
      else {
        const n = parseInt(taille || '48', 10), h = Math.round((n * 9) / 16);
        const p = G.makeCanvas(n, h), pc = p.getContext('2d');
        pc.imageSmoothingQuality = 'high'; pc.drawImage(src, 0, 0, n, h);
        c.imageSmoothingEnabled = false;
        if (genre === 'blocs') c.drawImage(p, 0, 0, 960, 540);
        else if (genre === 'chroma') { c.fillStyle = '#8a8a8a'; c.fillRect(0, 0, 960, 540); c.globalCompositeOperation = 'color'; c.drawImage(p, 0, 0, 960, 540); }
        else { c.drawImage(p, 0, 0, 960, 540); c.globalCompositeOperation = 'luminosity'; c.drawImage(src, 0, 0); } // mixte
        c.globalCompositeOperation = 'source-over';
      }
    }
    cache.set(variante, cv);
    return cv;
  };
  // Pose l'image dans un cadre arrondi. o.balle = [x, y] dans le repère 320 × 180.
  K.image = (ctx, x, y, w, { variante = 'net', r = 14, balle = null, bord = C.ligne, al = 1 } = {}) => {
    const h = (w * 9) / 16;
    ctx.save(); ctx.globalAlpha *= al;
    K.rr(ctx, x, y, w, h, r); ctx.save(); ctx.clip();
    ctx.drawImage(K.imageCanevas(variante), x, y, w, h);
    if (balle) K.balle(ctx, x + (balle[0] * w) / 320, y + (balle[1] * h) / 180, (9.5 * w) / 320);
    ctx.restore();
    if (bord) { K.rr(ctx, x, y, w, h, r); ctx.strokeStyle = bord; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    return h;
  };
  K.balle = (ctx, x, y, r, al = 1) => {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffd9a0'); g.addColorStop(0.5, '#ff8a1f'); g.addColorStop(1, '#b44a00');
    ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  };

  // ---------- l'habillage commun à toutes les scènes ----------
  // Le fond : noir de scène + deux lueurs très douces à la couleur du chapitre, qui dérivent lentement.
  K.fond = (ctx, t, teinte = C.azur) => {
    ctx.fillStyle = C.fond; ctx.fillRect(0, 0, W, H);
    K.halo(ctx, W * 0.82 + Math.sin(t * 0.21) * 90, H * 0.12 + Math.cos(t * 0.17) * 60, 760, teinte, 0.16);
    K.halo(ctx, W * 0.1 + Math.cos(t * 0.19) * 80, H * 0.95 + Math.sin(t * 0.23) * 50, 700, teinte, 0.1);
  };
  // En-tête de scène : numéro dans une pastille + titre
  K.entete = (ctx, t, t0, num, titre, c) => {
    K.entre(ctx, t, t0, () => {
      let x = K.MX;
      if (num) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 34, 150, 34, 0, 7); ctx.fill();
        K.t(ctx, String(num), x + 34, 152, { s: 40, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
        x += 92;
      }
      K.t(ctx, titre, x, 168, { s: 54, w: 800, c: C.txt });
    }, { dy: 0, dx: -30, d: 0.45 });
  };
  // Nom de l'application en haut à droite + barre de progression par chapitre en bas
  K.habillage = (ctx, t, S) => {
    K.icone(ctx, W - K.MX - 22, 148, 44);
    const M = S.META || { app: 'Compression vidéo', module: 1 };
    K.t(ctx, M.app + ' · Module ' + M.module, W - K.MX - 58, 159, { s: 28, w: 700, c: C.mut, a: 'right' });
    const x0 = K.MX, x1 = W - K.MX, y = 1026, total = S.CHAPITRES[S.CHAPITRES.length - 1].t1 - S.CHAPITRES[0].t0, vide = 10;
    const dispo = x1 - x0 - vide * (S.CHAPITRES.length - 1);
    let x = x0;
    for (const ch of S.CHAPITRES) {
      const l = (dispo * (ch.t1 - ch.t0)) / total, p = clamp((t - ch.t0) / (ch.t1 - ch.t0));
      K.rr(ctx, x, y, l, 6, 3); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
      if (p > 0) { K.rr(ctx, x, y, Math.max(6, l * p), 6, 3); ctx.fillStyle = p >= 1 ? 'rgba(255,255,255,.5)' : K.lin(ctx, x0, 0, x1, 0, SPECTRE); ctx.fill(); }
      x += l + vide;
    }
  };

  /* ==========================================================================
     LES SCÈNES COMMUNES À TOUS LES FILMS : titre, « À retenir », fin, montage
     (elles lisent SCORE.META et SCORE.ev, fabriqués par partition.js)
     ========================================================================== */
  const dernierTemps = (S, t) => S.clock.OFFSET + Math.floor((t - S.clock.OFFSET) / S.BEAT) * S.BEAT;

  // décor : des bits qui montent lentement (titre et fin)
  K.pluieDeBits = (ctx, t, force = 1) => {
    G.decor(() => {
      for (let i = 0; i < 70; i++) {
        const v = 14 + K.alea(i + 50) * 30, s = 22 + K.alea(i + 70) * 26;
        const x = K.alea(i) * W, y = (((K.alea(i + 100) * (H + 80) - t * v) % (H + 80)) + (H + 80)) % (H + 80) - 40;
        const bit = K.alea(i + 200 + Math.floor(t * 0.5 + K.alea(i + 9) * 3)) > 0.5 ? '1' : '0';
        K.t(ctx, bit, x, y, { s, w: 700, c: SPECTRE[i % 4], a: 'center', al: (0.05 + K.alea(i + 300) * 0.09) * force });
      }
    });
  };
  // un texte centré, réduit s'il dépasse la largeur disponible
  const ajuste = (ctx, str, s, w, max = W - 2 * K.MX) => Math.min(s, Math.floor((s * max) / K.larg(ctx, str, s, w)));

  // LE TITRE : icône de l'application, sur-titre, titre, sous-titre en dégradé, pastille du module
  K.scTitre = (ctx, t) => {
    const S = globalThis.SCORE, e = S.ev.titre, M = S.META;
    K.fond(ctx, t, C.vio);
    K.pluieDeBits(ctx, t);
    const presse = t >= e.icone ? U.pulse(t, dernierTemps(S, t), 5) : 0; // l'icône « serre » l'image sur chaque temps
    K.entre(ctx, t, e.icone, () => K.icone(ctx, 960, 300, 210, { presse }), { zoom: 0.5, cx: 960, cy: 300 });
    K.entre(ctx, t, e.sur, () => K.t(ctx, 'BTS AUDIOVISUEL  ·  TES  ·  ' + M.app.toUpperCase(), 960, 505, { s: 30, w: 700, c: C.mut, a: 'center', ls: 5 }));
    K.entre(ctx, t, e.titre, () => K.t(ctx, M.titre, 960, 655, { s: ajuste(ctx, M.titre, 128, 800), w: 800, a: 'center' }), { dy: 40, d: 0.6 });
    K.entre(ctx, t, e.sous, () => K.degrade(ctx, M.sousTitre, 960, 775, { s: ajuste(ctx, M.sousTitre, 84, 800), a: 'center' }), { dy: 40, d: 0.6 });
    K.entre(ctx, t, e.pastille, () => K.puce(ctx, M.pastille, 960, 885, { s: 34, c: C.bleu, a: 'center' }), { dy: 20 });
  };

  // À RETENIR : lignes = [['la formule ou le mot', 'le complément', couleur], …] (6 au plus), une ligne par note
  K.scRetenir = (lignes) => (ctx, t) => {
    const S = globalThis.SCORE, e = S.ev.retenir;
    K.fond(ctx, t, C.vio); K.habillage(ctx, t, S);
    K.entre(ctx, t, e.debut, () => K.degrade(ctx, 'À retenir', K.MX, 172, { s: 64 }), { dx: -30, dy: 0 });
    const pas = lignes.length > 5 ? 116 : 132, h = pas - 16;
    lignes.forEach((r, i) => {
      const y = 232 + i * pas, c = r[2] || [C.bleu, C.vio, C.ora, C.rose][i % 4];
      K.entre(ctx, t, e.lignes[i], () => {
        K.carte(ctx, K.MX, y, W - 2 * K.MX, h, { r: 26, s: K.rgba(c, 0.35) });
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(K.MX + 56, y + h / 2, 26, 0, 7); ctx.fill();
        K.t(ctx, String(i + 1), K.MX + 56, y + h / 2 + 2, { s: 30, w: 800, c: '#0b0c0e', a: 'center', b: 'middle' });
        K.t(ctx, r[0], K.MX + 112, y + h / 2 + 16, { s: 46, w: 800 });
        K.t(ctx, r[1], W - K.MX - 40, y + h / 2 + 13, { s: 34, c: C.txt2, a: 'right' });
      }, { dx: -50, dy: 0, d: 0.45 });
      K.onde(ctx, K.MX + 56, y + h / 2, t, e.lignes[i], { c, r: 90, lw: 4 });
    });
  };

  // LA FIN : « À vous de jouer » et les quatre étapes du module
  const ETAPES = [['Comprendre', ['#5ac8fa', '#007aff']], ['Manipuler', ['#ffb340', '#ff6a3d']], ['Retenir', ['#ff5e8a', '#af52de']], ['S’évaluer', ['#34c759', '#00a37a']]];
  K.scFin = (ctx, t) => {
    const S = globalThis.SCORE, e = S.ev.fin;
    K.fond(ctx, t, C.vio);
    K.pluieDeBits(ctx, t);
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
    K.entre(ctx, t, e.note, () => K.riche(ctx, ['Au moins ', ['12/20', { c: C.txt, w: 800 }], S.META.dernier ? ' à l’évaluation pour valider le parcours.' : ' à l’évaluation pour ouvrir le module suivant.'], 960, 810, { s: 38, c: C.txt2, a: 'center' }), { dy: 20 });
    K.entre(ctx, t, e.credit, () => K.t(ctx, 'D’après les cours de Pierre MALYCHA · BTS Audiovisuel · Lycée Henri Martin, Saint-Quentin', 960, 970, { s: 26, c: C.mut, a: 'center' }), { dy: 0 });
  };

  // LE MONTAGE : scenes = { idDeSection: dessin(ctx, t) } ; « titre » et « fin » sont fournis d'office.
  // Une scène par section du plan, fondu enchaîné sur la barre de mesure.
  K.monter = (scenes) => {
    const S = globalThis.SCORE, Shots = globalThis.Shots, Studio = globalThis.Studio;
    const ordre = Object.keys(S.B).filter((id) => id !== 'END').sort((a, b) => S.B[a] - S.B[b]);
    const liste = ordre.map((id) => {
      const draw = scenes[id] || (id === 'titre' ? K.scTitre : id === 'fin' ? K.scFin : null);
      if (!draw) throw new Error('monter : aucune scène pour la section « ' + id + ' »');
      return { at: id === 'titre' ? 0 : S.T(S.B[id]), draw, in: id === 'titre' ? 'cut' : { type: 'fade', dur: id === 'fin' || S.B[id] === S.B[ordre[1]] ? 0.6 : 0.4 } };
    });
    const film = Shots.film(liste);
    Studio.film({
      draw(ctx, t) { if (t < 0.2) return; film(ctx, t); }, // un instant de noir avant le titre
      post: { paper: 0, grain: 0, vignette: 0.12 },
    });
  };

  globalThis.K = K;
})();
