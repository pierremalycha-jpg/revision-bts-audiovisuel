/* ==========================================================================
   labos.js — les labos (étape « Manipuler ») de l'application
   « Compression vidéo »
   --------------------------------------------------------------------------
   Le HTML de chaque labo est dans index.html, dans un <template data-labo="n">.
   Chaque module a plusieurs labos. Identifiants : m + module + lettre (m2a-…).

   Règle commune (voir docs/CHARTE-APPLICATIONS.md) : dans chaque labo, UNE
   fonction dessiner() relit tous les réglages et redessine TOUT (scène,
   valeurs, explication). Les animations ont un bouton Pause ou Jouer, et
   s'arrêtent quand l'élève a demandé moins de mouvement.

   Les calculs sont RÉELS, pas des images toutes faites :
     - une image de test est dessinée (ciel, maison, arbre, texte, mire) ;
     - un vrai codeur JPEG simplifié la compresse : passage en Y′CbCr,
       sous-échantillonnage, DCT 8 × 8, tables de quantification de la norme,
       zigzag, estimation de la longueur des codes de Huffman ;
     - l'estimation de mouvement compare réellement les blocs (SAD) ;
     - le codeur arithmétique du labo CABAC découpe réellement l'intervalle.
   Les constantes partagées (TQ, ZZ, COUL, NIV264…) viennent de contenu.js.
   ========================================================================== */

/* --- Plusieurs labos par module ---------------------------------------------
   Le kit n'accepte qu'une fonction par module : on déclare au kit une seule
   fonction qui lance, dans l'ordre, tous les labos empilés pour ce module.
   Si un labo plante, les autres démarrent quand même. */
const LABOS = {};
function labo(n, f) {
  if (!LABOS[n]) {
    LABOS[n] = [];
    Application.labo(n, () => LABOS[n].forEach(g => { try { g(); } catch (e) { console.error("Labo du module " + n + " :", e); } }));
  }
  LABOS[n].push(f);
}

/* --- Outils partagés ------------------------------------------------------- */
const O = {
  el: id => document.getElementById(id),
  police(taille, gras, mono) { return (gras ? "600 " : "500 ") + taille + "px " + (mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif'); },
  reduit() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; },
  visible(el) { return !!el && el.offsetParent !== null; },
  borne: (v, a, b) => Math.max(a, Math.min(b, v)),
  nb: (v, d) => Application.nombre(v, d),
  rect(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  },
  fleche(c, x1, y1, x2, y2, couleur, epaisseur) {
    const a = Math.atan2(y2 - y1, x2 - x1), t = 6 + (epaisseur || 2) * 2;
    c.strokeStyle = c.fillStyle = couleur; c.lineWidth = epaisseur || 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * t * 0.6, y2 - Math.sin(a) * t * 0.6); c.stroke();
    c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - t * Math.cos(a - 0.4), y2 - t * Math.sin(a - 0.4)); c.lineTo(x2 - t * Math.cos(a + 0.4), y2 - t * Math.sin(a + 0.4)); c.closePath(); c.fill();
  },
  // Texte en une ligne (raccourci)
  ecrire(c, t, x, y, o) {
    o = o || {};
    c.font = O.police(o.s || 15, o.g !== false, o.m);
    c.fillStyle = o.c || "#e5e5ea"; c.textAlign = o.a || "left"; c.textBaseline = o.b || "alphabetic";
    c.fillText(t, x, y);
  },
  // Pseudo-hasard reproductible : même graine → même valeur.
  alea(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); },
  situations(id, regler) { O.el(id).addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) regler(b.dataset.s); }); },
  curseur(el, v) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); },
  // Remplit un <select> à partir d'une liste [valeur, libellé]
  options(sel, liste, choix) { sel.innerHTML = liste.map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(choix) ? " selected" : "") + ">" + o[1] + "</option>").join(""); },
  // Boucle d'animation qui ne tourne que si le canvas est visible.
  boucle(canvas, image) {
    let actif = !O.reduit(), dernier = performance.now();
    function pas(t) {
      const dt = Math.max(0, Math.min(0.05, (t - dernier) / 1000)); dernier = t; // jamais négatif (la première image peut porter une heure antérieure)
      if (actif && O.visible(canvas)) image(dt);
      requestAnimationFrame(pas);
    }
    requestAnimationFrame(pas);
    return { pause(v) { actif = v === undefined ? !actif : !v; return actif; }, actif: () => actif };
  },
  // Bouton Pause / Lecture branché sur une boucle
  boutonPause(id, boucle, rappel) {
    const b = O.el(id);
    const maj = () => { b.textContent = boucle.actif() ? "⏸ Pause" : "▶ Lecture"; };
    b.addEventListener("click", () => { boucle.pause(); maj(); if (rappel) rappel(); });
    maj();
  },
  // Débit lisible : « 1,04 Gbit/s », « 184 Mbit/s », « 850 kbit/s »
  debit(mbit) {
    if (mbit >= 1000) return O.nb(mbit / 1000, 2) + " Gbit/s";
    if (mbit >= 10) return O.nb(mbit, 0) + " Mbit/s";
    if (mbit >= 1) return O.nb(mbit, 1) + " Mbit/s";
    return O.nb(mbit * 1000, 0) + " kbit/s";
  },
  volume(go) { return go >= 1000 ? O.nb(go / 1000, 2) + " To" : go >= 10 ? O.nb(go, 0) + " Go" : O.nb(go, 1) + " Go"; },
  duree(s) {
    if (!isFinite(s)) return "∞";
    if (s < 60) return O.nb(s, 0) + " s";
    const h = Math.floor(s / 3600), m = Math.round((s - h * 3600) / 60);
    return h ? h + " h " + String(m).padStart(2, "0") : m + " min";
  },
  // Écrit une explication ou un calcul seulement s'il a changé (les lecteurs
  // d'écran n'annoncent ainsi que les vrais changements, pas chaque image animée)
  note(id, classe, html) { const el = O.el(id); if (el._html !== html) { el.innerHTML = html; el._html = html; } if (classe !== null && el.className !== classe) el.className = classe; },
  html(id, html) { O.note(id, null, html); },
  // Position d'un clic dans les coordonnées du canvas
  clic(cv, e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; },
  // Échelle logarithmique : valeur → position
  log(v, a, b, x0, x1) { return x0 + (Math.log10(v) - Math.log10(a)) / (Math.log10(b) - Math.log10(a)) * (x1 - x0); }
};

/* ==========================================================================
   L'IMAGE DE TEST
   Dessinée en vectoriel (dans un repère de 320 × 192), donc nette à toutes
   les tailles. Elle contient tout ce qui intéresse un codec : un ciel en
   dégradé (zones lisses), une maison (bords nets), un arbre et de l'herbe
   (textures fines), un panneau de texte, une mire de barres de couleur.
   ========================================================================== */
const IMG = (function () {
  const cache = new Map();
  function scene(c, w, h, o) {
    o = o || {};
    const pan = o.pan || 0;
    c.save(); c.scale(w / 320, h / 192);
    let g = c.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, "#2d6cb4"); g.addColorStop(1, "#b9def3");
    c.fillStyle = g; c.fillRect(0, 0, 320, 192);
    c.translate(-pan, 0);
    // soleil
    g = c.createRadialGradient(262, 34, 2, 262, 34, 24);
    g.addColorStop(0, "#fffbe6"); g.addColorStop(0.55, "#ffe49a"); g.addColorStop(1, "rgba(255,228,154,0)");
    c.fillStyle = g; c.beginPath(); c.arc(262, 34, 24, 0, 7); c.fill();
    // nuage
    c.fillStyle = "rgba(255,255,255,.82)";
    [[64, 30, 16], [80, 24, 18], [98, 31, 14], [82, 34, 14]].forEach(n => { c.beginPath(); c.arc(n[0], n[1], n[2], 0, 7); c.fill(); });
    // collines lointaines
    c.fillStyle = "#7ba564"; c.beginPath(); c.moveTo(-60, 192);
    for (let x = -60; x <= 420; x += 3) c.lineTo(x, 110 + 7 * Math.sin(x / 26) + 4 * Math.sin(x / 9));
    c.lineTo(420, 192); c.closePath(); c.fill();
    // sol et herbe (texture fine)
    c.fillStyle = "#4d7c38"; c.fillRect(-60, 142, 500, 60);
    c.lineWidth = 1;
    for (let i = 0; i < 420; i++) {
      const x = -60 + O.alea(i) * 480, y = 144 + O.alea(i + 999) * 48;
      c.strokeStyle = O.alea(i + 77) > 0.5 ? "#73aa4f" : "#335f26";
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1.6 - O.alea(i + 5) * 3, y - 3 - O.alea(i + 9) * 3); c.stroke();
    }
    // arbre : tronc et feuillage fait de centaines de petites feuilles
    c.fillStyle = "#5b3b22"; c.fillRect(60, 96, 9, 50);
    for (let i = 0; i < 360; i++) {
      const a = O.alea(i + 300) * 6.283, r = Math.sqrt(O.alea(i + 600)) * 30;
      c.fillStyle = "hsl(" + (95 + O.alea(i + 900) * 40) + "," + (40 + O.alea(i + 1200) * 25) + "%," + (20 + O.alea(i + 1500) * 28) + "%)";
      c.beginPath(); c.arc(64 + Math.cos(a) * r * 1.1, 82 + Math.sin(a) * r * 0.9, 1.6 + O.alea(i + 1800) * 2.6, 0, 7); c.fill();
    }
    // maison : bords nets
    c.fillStyle = "#efe3cb"; c.fillRect(150, 88, 70, 56);
    c.fillStyle = "#b2452f"; c.beginPath(); c.moveTo(142, 89); c.lineTo(185, 58); c.lineTo(228, 89); c.closePath(); c.fill();
    c.fillStyle = "#2b4a6f"; c.fillRect(160, 100, 22, 18);
    c.fillStyle = "#ffffff"; c.fillRect(170, 100, 2, 18); c.fillRect(160, 108, 22, 2);
    c.fillStyle = "#6b4226"; c.fillRect(196, 112, 14, 32);
    // panneau de texte
    c.fillStyle = "#fbfbfb"; c.fillRect(236, 118, 72, 24);
    c.fillStyle = "#111111"; c.font = '700 16px -apple-system, "Segoe UI", Inter, Roboto, Arial, sans-serif'; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("BTS AV", 272, 131);
    // mire de barres de couleur (75 %)
    ["#bfbfbf", "#bfbf00", "#00bfbf", "#00bf00", "#bf00bf", "#bf0000", "#0000bf"].forEach((k, i) => { c.fillStyle = k; c.fillRect(8 + i * 14, 160, 14, 26); });
    c.restore();
    // balle en mouvement (pas concernée par le panoramique)
    if (o.balle) balle(c, w, h, o.bx, o.by);
  }
  function balle(c, w, h, bx, by) {
    c.save(); c.scale(w / 320, h / 192);
    const g = c.createRadialGradient(bx - 3, by - 3, 1, bx, by, 10);
    g.addColorStop(0, "#ffd9a0"); g.addColorStop(0.5, "#ff8a1f"); g.addColorStop(1, "#b44a00");
    c.fillStyle = g; c.beginPath(); c.arc(bx, by, 9.5, 0, 7); c.fill();
    c.restore();
  }
  function canvas(w, h, o) { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; scene(cv.getContext("2d"), w, h, o); return cv; }
  // Pixels de l'image (mis en cache : la même image n'est dessinée qu'une fois)
  function pixels(w, h, o) {
    const cle = w + "x" + h + JSON.stringify(o || {});
    if (cache.has(cle)) return cache.get(cle);
    const cv = canvas(w, h, o), d = cv.getContext("2d").getImageData(0, 0, w, h);
    const r = { cv: cv, d: d, w: w, h: h };
    cache.set(cle, r);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return r;
  }
  // Luminance Y′ (0 à 255) de chaque pixel
  function luma(d) {
    const n = d.width * d.height, Y = new Float32Array(n), p = d.data;
    for (let i = 0; i < n; i++) Y[i] = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2];
    return Y;
  }
  return { scene: scene, balle: balle, canvas: canvas, pixels: pixels, luma: luma };
})();

/* ==========================================================================
   LE MOTEUR JPEG
   DCT 8 × 8 exacte (formule de la norme), tables de quantification de
   l'annexe K, mise à l'échelle IJG, zigzag, et estimation du nombre de bits
   avec les longueurs des codes de Huffman des tables standard.
   ========================================================================== */
const JPG = (function () {
  const COS = new Float64Array(64);
  for (let x = 0; x < 8; x++) for (let u = 0; u < 8; u++) COS[x * 8 + u] = Math.cos((2 * x + 1) * u * Math.PI / 16);
  const CU = u => (u ? 1 : Math.SQRT1_2) / 2;
  // F(u,v) = ¼ C(u) C(v) Σ Σ f(x,y) cos… cos… (indice v * 8 + u)
  function dct(b) {
    const t = new Float64Array(64), F = new Float64Array(64);
    for (let y = 0; y < 8; y++) for (let u = 0; u < 8; u++) { let s = 0; for (let x = 0; x < 8; x++) s += b[y * 8 + x] * COS[x * 8 + u]; t[y * 8 + u] = s * CU(u); }
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) { let s = 0; for (let y = 0; y < 8; y++) s += t[y * 8 + u] * COS[y * 8 + v]; F[v * 8 + u] = s * CU(v); }
    return F;
  }
  function idct(F) {
    const t = new Float64Array(64), f = new Float64Array(64);
    for (let v = 0; v < 8; v++) for (let x = 0; x < 8; x++) { let s = 0; for (let u = 0; u < 8; u++) s += CU(u) * F[v * 8 + u] * COS[x * 8 + u]; t[v * 8 + x] = s; }
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { let s = 0; for (let v = 0; v < 8; v++) s += CU(v) * t[v * 8 + x] * COS[y * 8 + v]; f[y * 8 + x] = s; }
    return f;
  }
  // Motif de base (u, v) : la « rayure » que pondère le coefficient F(u,v)
  function motif(u, v) { const m = new Float64Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) m[y * 8 + x] = CU(u) * CU(v) * COS[x * 8 + u] * COS[y * 8 + v]; return m; }
  // Table de chrominance de la norme (annexe K)
  const TQC = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99].concat(new Array(32).fill(99));
  const table = (q, chroma) => (chroma ? TQC : TQ).map(T => PAS(T, q));
  // Longueurs des codes de Huffman standard (luminance) : DC par catégorie, AC par (zéros, taille)
  const DCL = [2, 3, 3, 3, 3, 3, 4, 5, 6, 7, 8, 9];
  const ACL = [[2, 2, 3, 4, 5, 7, 8, 10, 16, 16], [4, 5, 7, 9, 11, 16], [5, 8, 10, 12, 16], [6, 9, 12, 16], [6, 10, 16], [7, 11, 16], [7, 12, 16], [8, 12, 16], [9, 15, 16], [9, 16], [9, 16], [10, 16], [10, 16], [11, 16], [16], [16]];
  const cat = v => v === 0 ? 0 : Math.floor(Math.log2(Math.abs(v))) + 1;
  const acl = (r, s) => (ACL[r][s - 1] || 16);
  function bitsBloc(qz, dcPrec) {
    const s0 = Math.min(11, cat(qz[0] - (dcPrec || 0)));
    let bits = DCL[s0] + s0, run = 0, der = 0;
    for (let k = 63; k > 0; k--) if (qz[ZZ[k]]) { der = k; break; }
    for (let k = 1; k <= der; k++) {
      const v = qz[ZZ[k]];
      if (!v) { run++; continue; }
      while (run > 15) { bits += 11; run -= 16; }
      const s = Math.min(10, cat(v)); bits += acl(run, s) + s; run = 0;
    }
    if (der < 63) bits += 4; // EOB
    return bits;
  }
  // Couples RLE (zéros ; valeur) d'un bloc quantifié, pour l'affichage
  function rle(qz) {
    const l = []; let run = 0, der = 0;
    for (let k = 63; k > 0; k--) if (qz[ZZ[k]]) { der = k; break; }
    for (let k = 1; k <= der; k++) { const v = qz[ZZ[k]]; if (!v) { run++; continue; } l.push("(" + run + ";" + v + ")"); run = 0; }
    return l;
  }
  // Compresse puis décompresse un plan (une composante) de w × h valeurs
  function coderPlan(P, w, h, Qt) {
    const out = new Float32Array(w * h), b = new Float64Array(64), qz = new Int32Array(64), F2 = new Float64Array(64);
    let bits = 0, nz = 0, dc = 0;
    for (let by = 0; by < h; by += 8) for (let bx = 0; bx < w; bx += 8) {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) b[y * 8 + x] = P[Math.min(h - 1, by + y) * w + Math.min(w - 1, bx + x)] - 128;
      const F = dct(b);
      for (let i = 0; i < 64; i++) { const v = Math.round(F[i] / Qt[i]); qz[i] = v; F2[i] = v * Qt[i]; if (v) nz++; }
      bits += bitsBloc(qz, dc); dc = qz[0];
      const r = idct(F2);
      for (let y = 0; y < 8 && by + y < h; y++) for (let x = 0; x < 8 && bx + x < w; x++) out[(by + y) * w + bx + x] = r[y * 8 + x] + 128;
    }
    return { p: out, bits: bits, nz: nz };
  }
  const FACT = { "4:4:4": [1, 1], "4:2:2": [2, 1], "4:2:0": [2, 2] };
  // Compresse une image entière (ImageData). Renvoie l'image décodée, le nombre de bits et le PSNR.
  function compresser(d, q, ech) {
    const w = d.width, h = d.height, n = w * h, p = d.data;
    const Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = p[i * 4], g = p[i * 4 + 1], bl = p[i * 4 + 2];
      Y[i] = 0.299 * r + 0.587 * g + 0.114 * bl;
      Cb[i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * bl;
      Cr[i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * bl;
    }
    const f = FACT[ech || "4:2:0"], cw = Math.ceil(w / f[0]), ch = Math.ceil(h / f[1]);
    const reduire = P => { const o = new Float32Array(cw * ch); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { let s = 0, k = 0; for (let j = 0; j < f[1]; j++) for (let i = 0; i < f[0]; i++) { const xx = x * f[0] + i, yy = y * f[1] + j; if (xx < w && yy < h) { s += P[yy * w + xx]; k++; } } o[y * cw + x] = s / k; } return o; };
    const ty = table(q, false), tc = table(q, true);
    const cy = coderPlan(Y, w, h, ty), cb = coderPlan(reduire(Cb), cw, ch, tc), cr = coderPlan(reduire(Cr), cw, ch, tc);
    const out = new ImageData(w, h), o = out.data;
    let se = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, j = Math.floor(y / f[1]) * cw + Math.floor(x / f[0]);
      const yy = cy.p[i], u = cb.p[j] - 128, v = cr.p[j] - 128;
      const R = yy + 1.402 * v, G = yy - 0.344136 * u - 0.714136 * v, B = yy + 1.772 * u;
      o[i * 4] = R; o[i * 4 + 1] = G; o[i * 4 + 2] = B; o[i * 4 + 3] = 255;
      const e = 0.299 * o[i * 4] + 0.587 * o[i * 4 + 1] + 0.114 * o[i * 4 + 2] - Y[i]; se += e * e;   // PSNR sur la luminance, comme en vidéo
    }
    const mse = se / n;
    return { img: out, bits: cy.bits + cb.bits + cr.bits, nz: cy.nz + cb.nz + cr.nz, psnr: mse > 0 ? 10 * Math.log10(255 * 255 / mse) : Infinity };
  }
  return { dct: dct, idct: idct, motif: motif, table: table, bitsBloc: bitsBloc, rle: rle, coderPlan: coderPlan, compresser: compresser, TQC: TQC };
})();

// Dessine un bloc 8 × 8 (valeurs 0 à 255) en grand, avec ou sans les nombres
function dessinerBloc(c, v, x0, y0, cel, o) {
  o = o || {};
  for (let i = 0; i < 64; i++) {
    const x = x0 + (i % 8) * cel, y = y0 + Math.floor(i / 8) * cel, val = v[i];
    let fond;
    if (o.mode === "coef") { const m = Math.min(1, Math.log10(1 + Math.abs(val)) / 2.6); fond = val === 0 ? "rgba(255,255,255,.04)" : val > 0 ? "rgba(255,159,10," + (0.15 + m * 0.8).toFixed(2) + ")" : "rgba(10,132,255," + (0.15 + m * 0.8).toFixed(2) + ")"; }
    else if (o.mode === "table") fond = "rgba(255,69,58," + (0.08 + val / 140).toFixed(2) + ")";
    else if (o.mode === "erreur") { const e = Math.min(255, Math.abs(val) * 6); fond = "rgb(" + Math.round(e) + "," + Math.round(e * 0.35) + "," + Math.round(e * 0.3) + ")"; }
    else { const g = Math.round(O.borne(val, 0, 255)); fond = "rgb(" + g + "," + g + "," + g + ")"; }
    c.fillStyle = fond; c.fillRect(x + 0.5, y + 0.5, cel - 1, cel - 1);
    if (o.nombres) {
      const t = Math.round(val), clair = o.mode === "pixels" ? val > 140 : false;
      c.font = O.police(String(t).length > 3 ? cel * 0.34 : cel * 0.4, true, true);
      c.fillStyle = clair ? "#111" : (o.mode === "coef" && t === 0 ? "#48484a" : "#f2f2f7");
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(t, x + cel / 2, y + cel / 2 + 0.5);
    }
  }
  c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1; c.strokeRect(x0 - 0.5, y0 - 0.5, cel * 8 + 1, cel * 8 + 1);
  if (o.titre) O.ecrire(c, o.titre, x0, y0 - 9, { s: 14, c: o.couleur || "#a1a1a6" });
}

/* ==========================================================================
   MODULE 1 — LABO 1 : LES QUATRE REDONDANCES
   ========================================================================== */
labo(1, function () {
  const cv = O.el("m1a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rForce = O.el("m1a-force"), ligneForce = O.el("m1a-ligne-force");
  const IW = 440, IH = 264, K = IW / 320;
  const fond = IMG.pixels(IW, IH);                      // l'image de test, sans balle
  const Yfond = IMG.luma(fond.d);
  let mode = "spatiale", t = 0, tMode = 0, hist = null, psy = null, psyForce = -1;
  const INFOS = {
    spatiale: ["Spatiale", "DCT", "Non"],
    temporelle: ["Temporelle", "Images P et B", "Non"],
    statistique: ["Statistique", "Huffman, CABAC", "Non"],
    psycho: ["Psychovisuelle", "4:2:0, quantif.", "Oui"]
  };
  // Trajet de la loupe (repère 320 × 192) : ciel, toit, mur, arbre, texte, herbe, mire
  const ETAPES = [[110, 14, "ciel"], [236, 50, "ciel près du soleil"], [180, 66, "bord du toit"], [190, 120, "mur"], [60, 76, "feuillage"], [262, 126, "texte"], [150, 170, "herbe"], [30, 170, "mire de couleurs"]];

  function loupe() {
    const n = ETAPES.length, cycle = 2.4, k = Math.floor(t / cycle) % n, f = (t % cycle) / cycle;
    const a = ETAPES[k], b = ETAPES[(k + 1) % n], g = f < 0.7 ? 0 : (1 - Math.cos((f - 0.7) / 0.3 * Math.PI)) / 2;
    return { x: Math.round((a[0] + (b[0] - a[0]) * g) * K), y: Math.round((a[1] + (b[1] - a[1]) * g) * K), nom: g < 0.5 ? a[2] : b[2] };
  }

  function histogramme() {
    if (hist) return hist;
    const im = IMG.pixels(320, 192), Y = IMG.luma(im.d), Qt = JPG.table(50), b = new Float64Array(64), h = {};
    let n = 0;
    for (let by = 0; by < 192; by += 8) for (let bx = 0; bx < 320; bx += 8) {
      for (let i = 0; i < 64; i++) b[i] = Y[(by + (i >> 3)) * 320 + bx + (i & 7)] - 128;
      const F = JPG.dct(b);
      for (let i = 0; i < 64; i++) { const v = O.borne(Math.round(F[i] / Qt[i]), -6, 6); h[v] = (h[v] || 0) + 1; n++; }
    }
    hist = { h: h, n: n };
    return hist;
  }

  function psychovisuel(k) {
    if (psy && psyForce === k) return psy;
    const p = fond.d.data, n = IW * IH;
    const Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n);
    for (let i = 0; i < n; i++) { const r = p[i * 4], g = p[i * 4 + 1], bl = p[i * 4 + 2]; Y[i] = 0.299 * r + 0.587 * g + 0.114 * bl; Cb[i] = -0.168736 * r - 0.331264 * g + 0.5 * bl; Cr[i] = 0.5 * r - 0.418688 * g - 0.081312 * bl; }
    const moyenne = P => { const o = new Float32Array(n); for (let by = 0; by < IH; by += k) for (let bx = 0; bx < IW; bx += k) { let s = 0, m = 0; for (let y = by; y < Math.min(IH, by + k); y++) for (let x = bx; x < Math.min(IW, bx + k); x++) { s += P[y * IW + x]; m++; } s /= m; for (let y = by; y < Math.min(IH, by + k); y++) for (let x = bx; x < Math.min(IW, bx + k); x++) o[y * IW + x] = s; } return o; };
    const fab = (y, u, v) => { const im = new ImageData(IW, IH), o = im.data; for (let i = 0; i < n; i++) { o[i * 4] = y[i] + 1.402 * v[i]; o[i * 4 + 1] = y[i] - 0.344136 * u[i] - 0.714136 * v[i]; o[i * 4 + 2] = y[i] + 1.772 * u[i]; o[i * 4 + 3] = 255; } const cc = document.createElement("canvas"); cc.width = IW; cc.height = IH; cc.getContext("2d").putImageData(im, 0, 0); return cc; };
    psy = { couleur: fab(Y, moyenne(Cb), moyenne(Cr)), lumi: fab(moyenne(Y), Cb, Cr) };
    psyForce = k;
    return psy;
  }

  // Images n et n + 1, en petit, pour le calcul de la différence
  const PW = 220, PH = 132, petit = IMG.pixels(PW, PH);
  const pc = document.createElement("canvas"); pc.width = PW; pc.height = PH; const pcx = pc.getContext("2d");
  const dc = document.createElement("canvas"); dc.width = PW; dc.height = PH; const dcx = dc.getContext("2d");
  let partChange = 0, dernierCalcul = -1;
  function balle(ctx, w, x) { IMG.balle(ctx, w, w * 0.6, x, 60); }
  function positionBalle(tt) { return 20 + ((tt * 40) % 290); }
  function difference() {
    const x1 = positionBalle(t), x0 = x1 - 40 / 25 * 3.75;     // 1/25 s plus tôt, vu à vitesse lente
    pcx.drawImage(petit.cv, 0, 0); balle(pcx, PW, x0); const a = pcx.getImageData(0, 0, PW, PH).data;
    pcx.drawImage(petit.cv, 0, 0); balle(pcx, PW, x1); const b = pcx.getImageData(0, 0, PW, PH).data;
    const im = dcx.createImageData(PW, PH), o = im.data; let ch = 0;
    for (let i = 0; i < PW * PH; i++) {
      const d = (Math.abs(a[i * 4] - b[i * 4]) + Math.abs(a[i * 4 + 1] - b[i * 4 + 1]) + Math.abs(a[i * 4 + 2] - b[i * 4 + 2])) / 3;
      if (d > 4) ch++;
      const v = Math.min(255, d * 4); o[i * 4] = v; o[i * 4 + 1] = v * 0.85; o[i * 4 + 2] = v * 0.6; o[i * 4 + 3] = 255;
    }
    dcx.putImageData(im, 0, 0);
    partChange = ch / (PW * PH);
  }

  function dessiner() {
    const inf = INFOS[mode];
    ligneForce.style.display = mode === "psycho" ? "" : "none";
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    Application.afficher("#m1a-nom", inf[0]); Application.afficher("#m1a-outil", inf[1]); Application.afficher("#m1a-perte", inf[2]);
    O.el("m1a-perte").className = mode === "psycho" ? "bad" : "ok";

    if (mode === "spatiale") {
      c.drawImage(fond.cv, 20, 40);
      O.ecrire(c, "Image de test", 20, 28, { s: 14, c: "#a1a1a6" });
      const L = loupe();
      c.strokeStyle = "#ffd60a"; c.lineWidth = 2; c.strokeRect(20 + L.x - 1, 40 + L.y - 1, 10, 10);
      const X0 = 560, Y0 = 52, cel = 44;
      c.strokeStyle = "rgba(255,214,10,.35)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(20 + L.x + 9, 40 + L.y - 1); c.lineTo(X0, Y0); c.moveTo(20 + L.x + 9, 40 + L.y + 9); c.lineTo(X0, Y0 + cel * 8); c.stroke();
      let somme = 0, nv = 0, mn = 255, mx = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const k = (L.y + j) * IW + L.x + i, p = fond.d.data, y = Yfond[k];
        c.fillStyle = "rgb(" + p[k * 4] + "," + p[k * 4 + 1] + "," + p[k * 4 + 2] + ")"; c.fillRect(X0 + i * cel, Y0 + j * cel, cel - 1, cel - 1);
        O.ecrire(c, Math.round(y), X0 + i * cel + cel / 2, Y0 + j * cel + cel / 2 + 4, { s: 14, m: true, a: "center", c: y > 140 ? "#111" : "#f2f2f7" });
        if (i < 7) { somme += Math.abs(y - Yfond[k + 1]); nv++; }
        if (j < 7) { somme += Math.abs(y - Yfond[k + IW]); nv++; }
        mn = Math.min(mn, y); mx = Math.max(mx, y);
      }
      const ecart = somme / nv;
      O.ecrire(c, "Loupe : 8 × 8 pixels (" + L.nom + "), valeur de luminance Y′", X0, 40, { s: 14, c: "#ffd60a" });
      O.ecrire(c, "Écart moyen entre deux voisins : " + O.nb(ecart, 1) + " (sur 255)", X0, Y0 + cel * 8 + 26, { s: 15 });
      O.ecrire(c, "Plage du bloc : " + Math.round(mn) + " à " + Math.round(mx), X0, Y0 + cel * 8 + 46, { s: 14, c: "#a1a1a6" });
      // profil d'une ligne
      const yl = L.y + 4, gy = 330, gh = 110;
      c.fillStyle = "rgba(255,255,255,.04)"; c.fillRect(20, gy, IW, gh);
      c.strokeStyle = "#64d2ff"; c.lineWidth = 1.5; c.beginPath();
      for (let x = 0; x < IW; x++) { const v = Yfond[yl * IW + x], py = gy + gh - v / 255 * gh; x ? c.lineTo(20 + x, py) : c.moveTo(20, py); }
      c.stroke();
      c.fillStyle = "rgba(255,214,10,.25)"; c.fillRect(20 + L.x, gy, 8, gh);
      O.ecrire(c, "Luminance le long de la ligne de la loupe : plate dans le ciel, en dents de scie dans l’herbe", 20, gy + gh + 18, { s: 13, c: "#a1a1a6", g: false });
      Application.afficher("#m1a-mes", "écart " + O.nb(ecart, 1));
      O.note("m1a-msg", ecart < 4 ? "note ok" : ecart < 15 ? "note" : "note warn", ecart < 4 ? "Dans <b>" + L.nom + "</b>, les 64 pixels sont presque identiques (écart moyen " + O.nb(ecart, 1) + ") : un seul nombre, la moyenne, suffit presque à décrire le bloc. C’est ce que la DCT exploite." : ecart < 15 ? "Dans <b>" + L.nom + "</b>, les valeurs varient doucement : quelques coefficients de basse fréquence décriront le bloc." : "Dans <b>" + L.nom + "</b>, les valeurs sautent d’un pixel à l’autre (bords, texture fine) : la redondance spatiale est faible, ce bloc coûtera beaucoup plus de bits.");
    } else if (mode === "temporelle") {
      if (t - dernierCalcul > 0.08 || dernierCalcul < 0) { difference(); dernierCalcul = t; }
      c.drawImage(fond.cv, 20, 40);
      const bx = positionBalle(t);
      c.save(); c.translate(20, 40); IMG.balle(c, IW, IH, bx, 60); c.restore();
      O.ecrire(c, "Image n + 1 (la balle traverse le ciel)", 20, 28, { s: 14, c: "#a1a1a6" });
      c.imageSmoothingEnabled = false;
      c.drawImage(dc, 520, 40, 440, 264);
      c.imageSmoothingEnabled = true;
      O.ecrire(c, "Différence entre l’image n + 1 et l’image n (× 4)", 520, 28, { s: 14, c: "#ffd60a" });
      c.strokeStyle = "rgba(255,255,255,.2)"; c.strokeRect(520, 40, 440, 264);
      // barre de proportion
      const yb = 345;
      O.ecrire(c, "Pixels qui changent d’une image à la suivante", 20, yb - 10, { s: 15 });
      c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(20, yb, 940, 24);
      c.fillStyle = "#ff9f0a"; c.fillRect(20, yb, Math.max(3, 940 * partChange), 24);
      O.ecrire(c, O.nb(partChange * 100, 1) + " % de l’image change · " + O.nb(100 - partChange * 100, 1) + " % est identique : inutile de le retransmettre", 20, yb + 50, { s: 15, c: "#e5e5ea" });
      O.ecrire(c, "Le codeur n’envoie que la balle, sous forme d’un vecteur de mouvement et d’un petit résidu (module 3).", 20, yb + 74, { s: 14, c: "#a1a1a6", g: false });
      Application.afficher("#m1a-mes", O.nb(partChange * 100, 1) + " % change");
      O.note("m1a-msg", "note ok", "D’une image à la suivante, seule la balle bouge : <b>" + O.nb(100 - partChange * 100, 1) + " %</b> des pixels sont identiques. La différence est presque entièrement noire : c’est la redondance <b>temporelle</b>, exploitée par les images P et B.");
    } else if (mode === "statistique") {
      c.drawImage(fond.cv, 20, 40);
      c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 1; c.beginPath();
      for (let x = 0; x <= 320; x += 8) { c.moveTo(20 + x * K, 40); c.lineTo(20 + x * K, 40 + IH); }
      for (let y = 0; y <= 192; y += 8) { c.moveTo(20, 40 + y * K); c.lineTo(20 + IW, 40 + y * K); }
      c.stroke();
      O.ecrire(c, "960 blocs de 8 × 8 → 61 440 coefficients après DCT et quantification (qualité 50)", 20, 28, { s: 14, c: "#a1a1a6" });
      const hs = histogramme(), g = Math.min(1, tMode / 0.9), e = 1 - Math.pow(1 - g, 3);
      const X0 = 520, Y0 = 70, HH = 290, bw = 30;
      O.ecrire(c, "Fréquence de chaque valeur (en %) et coût idéal du code", X0, 40, { s: 14, c: "#ffd60a" });
      for (let v = -6; v <= 6; v++) {
        const p = (hs.h[v] || 0) / hs.n, x = X0 + (v + 6) * (bw + 4), hh = Math.max(1, Math.sqrt(p) * HH * e);
        c.fillStyle = v === 0 ? "#ff9f0a" : "#64d2ff"; c.fillRect(x, Y0 + HH - hh, bw, hh);
        O.ecrire(c, v === -6 ? "≤−6" : v === 6 ? "≥6" : v, x + bw / 2, Y0 + HH + 16, { s: 13, a: "center", m: true });
        if (p > 0) {
          O.ecrire(c, O.nb(p * 100, p < 0.01 ? 2 : 1), x + bw / 2, Y0 + HH - hh - 6, { s: 13, a: "center", c: "#e5e5ea" });
          O.ecrire(c, O.nb(-Math.log2(p), 1), x + bw / 2, Y0 + HH + 34, { s: 13, a: "center", c: "#bf5af2", m: true });
        }
      }
      O.ecrire(c, "bits", X0 - 6, Y0 + HH + 34, { s: 13, a: "right", c: "#bf5af2" });
      O.ecrire(c, "(hauteur en racine carrée pour que les petites barres restent visibles)", X0, Y0 + HH + 58, { s: 13, c: "#a1a1a6", g: false });
      const p0 = (hs.h[0] || 0) / hs.n;
      Application.afficher("#m1a-mes", O.nb(p0 * 100, 0) + " % de zéros");
      O.note("m1a-msg", "note ok", "Après DCT et quantification, <b>" + O.nb(p0 * 100, 0) + " %</b> des coefficients valent 0. Un symbole aussi fréquent ne coûte idéalement que <b>" + O.nb(-Math.log2(p0), 2) + " bit</b> ; un coefficient rare en coûte 8 ou plus. Le codage entropique (Huffman, CABAC) donne des codes courts aux valeurs fréquentes.");
    } else {
      const k = +rForce.value * 2, P = psychovisuel(k);
      c.drawImage(P.couleur, 20, 40); c.drawImage(P.lumi, 520, 40);
      O.ecrire(c, "Couleur moyennée par carrés de " + k + " × " + k, 20, 28, { s: 14, c: "#30d158" });
      O.ecrire(c, "Luminance moyennée par carrés de " + k + " × " + k, 520, 28, { s: 14, c: "#ff453a" });
      const ec = 2 / 3 * (1 - 1 / (k * k)), el = 1 / 3 * (1 - 1 / (k * k));
      O.ecrire(c, "Données supprimées : " + O.nb(ec * 100, 0) + " %", 20, 336, { s: 17 });
      O.ecrire(c, "Luminance intacte : l’image reste nette", 20, 358, { s: 14, c: "#a1a1a6", g: false });
      O.ecrire(c, "Données supprimées : " + O.nb(el * 100, 0) + " %", 520, 336, { s: 17 });
      O.ecrire(c, "Luminance simplifiée : tout devient flou", 520, 358, { s: 14, c: "#a1a1a6", g: false });
      O.ecrire(c, "L’œil voit les détails grâce à la luminance ; la couleur peut être bien plus grossière.", 20, 410, { s: 15 });
      O.ecrire(c, "C’est le principe du 4:2:2 (carrés de 2 × 1) et du 4:2:0 (carrés de 2 × 2).", 20, 432, { s: 14, c: "#a1a1a6", g: false });
      rForce.parentElement.querySelector("output").textContent = k + " × " + k;
      Application.afficher("#m1a-mes", "− " + O.nb(ec * 100, 0) + " % (couleur)");
      O.note("m1a-msg", k <= 4 ? "note ok" : "note warn", k <= 4 ? "À gauche, la couleur a perdu <b>" + O.nb(ec * 100, 0) + " %</b> de ses données et on ne voit presque rien ; à droite, avec deux fois moins d’économie, l’image est déjà floue. L’œil est bien plus sensible à la <b>luminance</b>." : "Même très simplifiée, la couleur reste acceptable de loin ; seuls les bords colorés (mire, toit) « bavent ». La luminance simplifiée, elle, est inutilisable.");
    }
  }

  const anim = O.boucle(cv, dt => { t += dt; tMode += dt; dessiner(); });
  O.boutonPause("m1a-pause", anim);
  Application.segment("#m1a-type", [["spatiale", "Spatiale"], ["temporelle", "Temporelle"], ["statistique", "Statistique"], ["psycho", "Psychovisuelle"]], mode, v => { mode = v; tMode = 0; dernierCalcul = -1; dessiner(); });
  rForce.addEventListener("input", dessiner);
  if (O.reduit()) { t = 1; tMode = 5; }
  dessiner();
});

/* ==========================================================================
   MODULE 1 — LABO 2 : CALCULATEUR DE DÉBIT ET DE TAUX
   ========================================================================== */
labo(1, function () {
  const cv = O.el("m1b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const sDef = O.el("m1b-def"), sF = O.el("m1b-f"), sCodec = O.el("m1b-codec"), rD = O.el("m1b-d");
  const DEFS = [["sd", "SD 720 × 576", 720, 576], ["hd720", "HD 1280 × 720", 1280, 720], ["hd", "HD 1920 × 1080", 1920, 1080], ["uhd", "UHD 3840 × 2160", 3840, 2160], ["dci", "4K DCI 4096 × 2160", 4096, 2160], ["8k", "8K 7680 × 4320", 7680, 4320]];
  // Débit de référence en HD 1080 à 25 i/s (Mbit/s) ; recalculé en proportion des pixels par seconde
  const CODECS = [["brut", "Non compressé", 0], ["xq", "ProRes 4444 XQ", 413], ["hq", "ProRes 422 HQ", 184], ["pr", "ProRes 422", 122], ["px", "ProRes 422 Proxy", 38], ["dnx", "DNxHR SQ", 120], ["avci", "AVC-Intra 100", 100], ["xdcam", "XDCAM HD 422 (MPEG-2)", 50], ["xavcl", "XAVC-L (H.264 GOP long)", 50], ["bd", "H.264 Blu-ray", 25], ["web", "H.264 web", 8], ["hevc", "HEVC streaming", 4], ["av1", "AV1 streaming", 3], ["libre", "Réglage libre (curseur)", -1]];
  O.options(sDef, DEFS.map(d => [d[0], d[1]]), "hd");
  O.options(sF, [[24, "24 i/s"], [25, "25 i/s"], [30, "30 i/s"], [50, "50 i/s"], [60, "60 i/s"]], 25);
  O.options(sCodec, CODECS.map(d => [d[0], d[1]]), "hq");
  let ech = "4:2:2", q = 10, t = 0, Dval = 184;
  const vers = v => 0.5 * Math.pow(40000, v / 1000), depuis = D => 1000 * Math.log(D / 0.5) / Math.log(40000);
  const LIENS = [[8, "ADSL"], [25, "multiplex TNT"], [40, "Blu-ray (max)"], [1000, "Ethernet 1 Gbit/s"], [1485, "HD-SDI"], [2970, "3G-SDI"], [11880, "12G-SDI"]];

  function format() { return DEFS.find(d => d[0] === sDef.value); }
  function brut() { const d = format(); return BRUT(d[2], d[3], ECH[ech], q, +sF.value); }
  function caler() {
    const k = CODECS.find(x => x[0] === sCodec.value);
    if (!k || k[2] < 0) return;
    const d = format(), pr = d[2] * d[3] * (+sF.value) / (1920 * 1080 * 25);
    const D = k[2] === 0 ? brut() : k[2] * pr;
    Dval = Math.min(D, brut());
    rD.value = depuis(Dval); rD.dispatchEvent(new Event("input"));
  }

  function dessiner() {
    const d = format(), f = +sF.value, B = brut();
    const D = Math.min(Dval, B);
    const tau = B / D, bpp = D * 1e6 / (d[2] * d[3] * f), go = D * 0.45;
    rD.parentElement.querySelector("output").textContent = O.debit(D);
    Application.afficher("#m1b-brut", O.debit(B)); Application.afficher("#m1b-comp", O.debit(D));
    Application.afficher("#m1b-taux", O.nb(tau, tau < 10 ? 1 : 0) + ":1");
    Application.afficher("#m1b-supp", O.nb((1 - 1 / tau) * 100, tau > 100 ? 2 : 1) + " %");
    Application.afficher("#m1b-bpp", O.nb(bpp, bpp < 1 ? 3 : 1));
    Application.afficher("#m1b-heure", O.volume(go));
    O.el("m1b-titre").textContent = d[2] + " × " + d[3] + " · " + ech + " · " + q + " bits · " + f + " i/s";
    O.html("m1b-calc",
      '<div><span class="c">D = l × h × e × q × f</span></div><div>= ' + d[2] + " × " + d[3] + " × " + O.nb(ECH[ech], 1) + " × " + q + " × " + f + "</div><div>= <b>" + O.nb(B, 1) + " Mbit/s</b></div>" +
      '<div style="margin-top:6px"><span class="c">τ = D brut ÷ D compressé</span></div><div>= ' + O.nb(B, 1) + " ÷ " + O.nb(D, D < 10 ? 2 : 1) + " = <b>" + O.nb(tau, 1) + ":1</b></div>" +
      '<div style="margin-top:6px"><span class="c">V (1 h) = D × 3 600 ÷ 8</span></div><div>= ' + O.nb(D, 1) + " × 3 600 ÷ 8 = <b>" + O.nb(go * 1000, 0) + " Mo</b></div>");

    // Scène
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    const x0 = 70, x1 = 950, vmin = 1, vmax = 30000, X = v => O.log(O.borne(v, vmin, vmax), vmin, vmax, x0, x1);
    const ya = 196;
    O.ecrire(c, "Débit (échelle logarithmique : chaque graduation vaut 10 fois la précédente)", x0, 26, { s: 14, c: "#a1a1a6" });
    // couloirs
    const couloir = (y, v, coul, nom) => {
      c.fillStyle = "rgba(255,255,255,.05)"; O.rect(c, x0, y, x1 - x0, 30, 8); c.fill();
      c.fillStyle = coul; O.rect(c, x0, y, X(v) - x0, 30, 8); c.fill();
      c.save(); O.rect(c, x0, y, X(v) - x0, 30, 8); c.clip();
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 3; c.setLineDash([3, 13]); c.lineDashOffset = -t * 60;
      c.beginPath(); c.moveTo(x0, y + 15); c.lineTo(x1, y + 15); c.stroke(); c.setLineDash([]); c.restore();
      O.ecrire(c, nom + " : " + O.debit(v), X(v) + 10 > x1 - 200 ? X(v) - 10 : X(v) + 10, y + 20, { s: 15, a: X(v) + 10 > x1 - 200 ? "right" : "left", c: X(v) + 10 > x1 - 200 ? "#0b0c0e" : "#e5e5ea" });
    };
    couloir(52, B, "#ff453a", "Non compressé");
    couloir(104, D, "#30d158", "Compressé");
    // axe
    c.strokeStyle = "#8e8e93"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, ya); c.lineTo(x1, ya); c.stroke();
    [[1, "1 Mbit/s"], [10, "10"], [100, "100"], [1000, "1 Gbit/s"], [10000, "10 Gbit/s"]].forEach(g => { const x = X(g[0]); c.beginPath(); c.moveTo(x, ya - 5); c.lineTo(x, ya + 5); c.stroke(); O.ecrire(c, g[1], x, ya - 10, { s: 13, a: "center", c: "#8e8e93" }); c.strokeStyle = "rgba(255,255,255,.06)"; c.beginPath(); c.moveTo(x, 46); c.lineTo(x, ya); c.stroke(); c.strokeStyle = "#8e8e93"; });
    LIENS.forEach((l, i) => { const x = X(l[0]), y = ya + 20 + (i % 2) * 18; c.fillStyle = "#64d2ff"; c.beginPath(); c.arc(x, ya, 3, 0, 7); c.fill(); O.ecrire(c, l[1], x, y, { s: 13, a: "center", c: "#64d2ff", g: false }); });
    // 100 bits d'origine
    const gx = 70, gy = 280, cel = 15;
    O.ecrire(c, "Sur 100 bits d’origine, il en reste " + O.nb(100 / tau, 100 / tau < 1 ? 2 : 1), gx, gy - 10, { s: 15 });
    let reste = 100 / tau;
    for (let i = 0; i < 100; i++) {
      const x = gx + (i % 10) * cel, y = gy + Math.floor(i / 10) * cel;
      c.fillStyle = "rgba(255,255,255,.07)"; c.fillRect(x, y, cel - 2, cel - 2);
      const p = O.borne(reste - i, 0, 1);
      if (p > 0) { c.fillStyle = "#30d158"; c.fillRect(x, y + (cel - 2) * (1 - p), cel - 2, (cel - 2) * p); }
    }
    // grand taux
    O.ecrire(c, O.nb(tau, tau < 10 ? 1 : 0) + ":1", 420, 350, { s: 54, a: "center", c: "#64d2ff" });
    O.ecrire(c, "taux de compression", 420, 376, { s: 15, a: "center", c: "#a1a1a6" });
    O.ecrire(c, O.nb((1 - 1 / tau) * 100, 1) + " % des données supprimées", 420, 400, { s: 15, a: "center" });
    // carte mémoire
    const cx = 640, cy = 270, cw = 110, chh = 150, dur = 128 * 8000 / D, rempli = O.borne(3600 / dur, 0, 1);
    c.fillStyle = "#2c2c2e"; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + cw - 24, cy); c.lineTo(cx + cw, cy + 24); c.lineTo(cx + cw, cy + chh); c.lineTo(cx, cy + chh); c.closePath(); c.fill();
    c.fillStyle = rempli >= 1 ? "#ff453a" : "#ff9f0a"; c.fillRect(cx + 8, cy + chh - 8 - (chh - 40) * rempli, cw - 16, (chh - 40) * rempli);
    O.ecrire(c, "128 Go", cx + cw / 2, cy + 26, { s: 15, a: "center" });
    O.ecrire(c, "Carte 128 Go", cx + cw + 18, cy + 30, { s: 15 });
    O.ecrire(c, "durée : " + O.duree(dur), cx + cw + 18, cy + 52, { s: 15, c: "#ff9f0a" });
    O.ecrire(c, "1 h d’images = " + O.volume(go), cx + cw + 18, cy + 76, { s: 14, c: "#a1a1a6", g: false });
    O.ecrire(c, "Disque 1 To : " + O.duree(1000 * 8000 / D), cx + cw + 18, cy + 100, { s: 14, c: "#a1a1a6", g: false });
    if (rempli >= 1) O.ecrire(c, "pleine avant 1 h !", cx + cw + 18, cy + 124, { s: 14, c: "#ff453a" });

    if (tau < 1.05) { O.note("m1b-msg", "note bad", "<b>Aucune compression</b> : " + O.debit(B) + ", soit " + O.volume(B * 0.45) + " par heure. La carte de 128 Go est pleine en " + O.duree(dur) + ". Il faut une liaison SDI pour transporter ce signal."); }
    else if (tau < 12) { O.note("m1b-msg", "note ok", "Taux de <b>" + O.nb(tau, 1) + ":1</b> : compression légère, typique des codecs de <b>tournage et de montage</b> (ProRes, DNxHR, AVC-Intra). Il reste " + O.nb(bpp, 1) + " bits par pixel : l’image supporte l’étalonnage et les réencodages."); }
    else if (tau < 60) { O.note("m1b-msg", "note", "Taux de <b>" + O.nb(tau, 0) + ":1</b> : compression forte, typique des caméras de reportage (XDCAM, XAVC-L) ou du Blu-ray. Il faut un GOP long pour garder une bonne qualité à ce débit."); }
    else { O.note("m1b-msg", "note warn", "Taux de <b>" + O.nb(tau, 0) + ":1</b> : il ne reste que " + O.nb(bpp, 3) + " bit par pixel ! Seuls les codecs de <b>diffusion</b> (H.264, HEVC, AV1) y parviennent, au prix d’une perte réelle : à réserver à la livraison finale."); }
  }

  sDef.addEventListener("change", () => { caler(); dessiner(); });
  sF.addEventListener("change", () => { caler(); dessiner(); });
  sCodec.addEventListener("change", () => { caler(); dessiner(); });
  rD.addEventListener("input", e => { if (e.isTrusted) { sCodec.value = "libre"; Dval = vers(+rD.value); } dessiner(); });
  Application.segment("#m1b-ech", [["4:4:4", "4:4:4"], ["4:2:2", "4:2:2"], ["4:2:0", "4:2:0"]], ech, v => { ech = v; caler(); dessiner(); });
  const segQ = Application.segment("#m1b-q", [[8, "8 bits"], [10, "10 bits"], [12, "12 bits"]], q, v => { q = +v; caler(); dessiner(); });
  const segE = { choisir: v => O.el("m1b-ech")._choisir(v) };
  O.situations("m1b-situ", s => {
    const S = { cine: ["hd", 25, "4:2:2", 10, "hq"], repor: ["hd", 25, "4:2:2", 8, "xdcam"], bluray: ["hd", 24, "4:2:0", 8, "bd"], web: ["uhd", 25, "4:2:0", 10, "hevc"] }[s];
    sDef.value = S[0]; sF.value = S[1]; sCodec.value = S[4];
    segE.choisir(S[2]); segQ.choisir(S[3]);
    caler(); dessiner();
  });
  const anim = O.boucle(cv, dt => { t += dt; dessiner(); });
  caler();
  dessiner();
});

/* ==========================================================================
   MODULE 2 — Des blocs typiques (repère 320 × 192 de l'image de test)
   ========================================================================== */
const BLOCS_TYPES = { ciel: [14, 2], degrade: [29, 6], bord: [20, 9], texte: [32, 16], feuillage: [8, 10] };
// Les 64 valeurs de luminance d'un bloc de l'image de test
function blocImage(bx, by) {
  const im = IMG.pixels(320, 192), Y = IMG.luma(im.d), v = new Float64Array(64);
  for (let i = 0; i < 64; i++) v[i] = Y[(by * 8 + (i >> 3)) * 320 + bx * 8 + (i & 7)];
  return v;
}

/* ==========================================================================
   MODULE 2 — LABO 1 : UN BLOC DANS LA CHAÎNE JPEG
   ========================================================================== */
labo(2, function () {
  const cv = O.el("m2a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rQ = O.el("m2a-q");
  const im = IMG.pixels(320, 192);
  let bx = 20, by = 9, t = 0;
  const IX = 20, IY = 40;                       // position de l'image (échelle 1)
  const CEL = 24;
  const P1 = [400, 40], P2 = [680, 40];          // pixels, DCT
  const P3 = [20, 330], P4 = [270, 330], P5 = [520, 330], P6 = [770, 330]; // table, quantifiés, reconstruit, erreur
  let calc = null;

  function calculer() {
    const q = +rQ.value, px = blocImage(bx, by), b = px.map(v => v - 128), F = JPG.dct(b), Qt = JPG.table(q, false);
    const qz = new Int32Array(64), F2 = new Float64Array(64);
    for (let i = 0; i < 64; i++) { qz[i] = Math.round(F[i] / Qt[i]); F2[i] = qz[i] * Qt[i]; }
    const rec = JPG.idct(F2).map(v => O.borne(Math.round(v + 128), 0, 255)), err = rec.map((v, i) => v - px[i]);
    const nz = qz.filter(v => v).length, bits = JPG.bitsBloc(qz, 0);
    calc = { q: q, px: px, F: F, Qt: Qt, qz: qz, rec: rec, err: err, nz: nz, bits: bits, emax: Math.max.apply(null, err.map(Math.abs)), moy: px.reduce((a, v) => a + v, 0) / 64 };
  }

  function scene() {
    const k = calc;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // l'image et le bloc choisi
    c.drawImage(im.cv, IX, IY);
    O.ecrire(c, "Touchez l’image pour choisir un bloc", IX, IY - 12, { s: 13, c: "#a1a1a6" });
    c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x <= 320; x += 8) { c.moveTo(IX + x + 0.5, IY); c.lineTo(IX + x + 0.5, IY + 192); }
    for (let y = 0; y <= 192; y += 8) { c.moveTo(IX, IY + y + 0.5); c.lineTo(IX + 320, IY + y + 0.5); }
    c.stroke();
    c.strokeStyle = "#ffd60a"; c.lineWidth = 2.5; c.strokeRect(IX + bx * 8 - 1, IY + by * 8 - 1, 10, 10);
    c.strokeStyle = "rgba(255,214,10,.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(IX + bx * 8 + 9, IY + by * 8); c.lineTo(P1[0], P1[1]); c.moveTo(IX + bx * 8 + 9, IY + by * 8 + 9); c.lineTo(P1[0], P1[1] + CEL * 8); c.stroke();
    O.ecrire(c, "Bloc (" + bx + " ; " + by + ") · moyenne " + O.nb(k.moy, 1), IX, IY + 192 + 24, { s: 14 });
    O.ecrire(c, "64 valeurs × 8 bits = 512 bits avant compression", IX, IY + 192 + 46, { s: 13, c: "#a1a1a6", g: false });

    dessinerBloc(c, k.px, P1[0], P1[1], CEL, { nombres: true, mode: "pixels", titre: "1. Pixels Y′ (0 à 255)" });
    O.fleche(c, P1[0] + CEL * 8 + 8, P1[1] + 96, P2[0] - 10, P2[1] + 96, "#64d2ff", 2.5);
    O.ecrire(c, "DCT", (P1[0] + CEL * 8 + P2[0]) / 2, P1[1] + 86, { s: 15, a: "center", c: "#64d2ff" });
    dessinerBloc(c, k.F, P2[0], P2[1], CEL, { nombres: true, mode: "coef", titre: "2. Coefficients DCT (DC en haut à gauche)" });
    O.ecrire(c, "orange : > 0", P2[0] + CEL * 8 + 10, P2[1] + 104, { s: 13, c: "#ff9f0a", g: false });
    O.ecrire(c, "bleu : < 0", P2[0] + CEL * 8 + 10, P2[1] + 124, { s: 13, c: "#0a84ff", g: false });
    O.ecrire(c, "↖ basses", P2[0] + CEL * 8 + 10, P2[1] + 44, { s: 13, c: "#ff9f0a" });
    O.ecrire(c, "fréquences", P2[0] + CEL * 8 + 10, P2[1] + 62, { s: 13, c: "#ff9f0a" });
    O.ecrire(c, "hautes ↘", P2[0] + CEL * 8 + 10, P2[1] + 184, { s: 13, c: "#a1a1a6" });

    // flèche vers la deuxième ligne
    c.strokeStyle = "#8e8e93"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(P2[0] + 96, P2[1] + CEL * 8 + 8); c.lineTo(P2[0] + 96, 290); c.lineTo(P4[0] + 96, 290); c.stroke();
    O.fleche(c, P4[0] + 96, 286, P4[0] + 96, P4[1] - 26, "#8e8e93", 1.6);
    dessinerBloc(c, k.Qt, P3[0], P3[1], CEL, { nombres: true, mode: "table", titre: "3. Pas de quantification (qualité " + k.q + ")" });
    O.ecrire(c, "÷", P3[0] + CEL * 8 + 25, P3[1] + 102, { s: 26, a: "center", c: "#ff453a" });
    dessinerBloc(c, k.qz, P4[0], P4[1], CEL, { nombres: true, mode: "coef", titre: "4. Quantifiés (arrondis) : " + k.nz + " non nuls", couleur: "#ffd60a" });
    O.fleche(c, P4[0] + CEL * 8 + 8, P4[1] + 96, P5[0] - 10, P5[1] + 96, "#30d158", 2.5);
    O.ecrire(c, "× Q, DCT", (P4[0] + CEL * 8 + P5[0]) / 2, P4[1] + 84, { s: 13, a: "center", c: "#30d158" });
    O.ecrire(c, "inverse", (P4[0] + CEL * 8 + P5[0]) / 2, P4[1] + 120, { s: 13, a: "center", c: "#30d158" });
    dessinerBloc(c, k.rec, P5[0], P5[1], CEL, { nombres: true, mode: "pixels", titre: "5. Bloc décodé" });
    dessinerBloc(c, k.err, P6[0], P6[1], CEL, { nombres: true, mode: "erreur", titre: "6. Erreur (décodé − original)", couleur: "#ff453a" });

    // lecture en zigzag (animée)
    const zy = 568, zw = 14.6;
    O.ecrire(c, "Lecture en zigzag des 64 coefficients quantifiés :", 20, zy - 10, { s: 13, c: "#a1a1a6" });
    const pas = Math.floor(t * 9) % 80, cur = O.reduit() ? -1 : Math.min(63, pas);
    let der = 0; for (let i = 63; i > 0; i--) if (k.qz[ZZ[i]]) { der = i; break; }
    for (let i = 0; i < 64; i++) {
      const v = k.qz[ZZ[i]], x = 20 + i * zw;
      c.fillStyle = i > der ? "rgba(48,209,88,.12)" : v ? "rgba(255,159,10,.7)" : "rgba(255,255,255,.06)";
      c.fillRect(x, zy, zw - 1.5, 22);
      if (v) O.ecrire(c, v, x + zw / 2 - 0.75, zy + 15, { s: 10, a: "center", m: true, c: "#fff" });
      if (i === cur) { c.strokeStyle = "#ffd60a"; c.lineWidth = 2; c.strokeRect(x - 1, zy - 1, zw + 0.5, 24); }
    }
    if (der < 63) O.ecrire(c, "EOB", 20 + (der + 1) * zw + 2, zy + 15, { s: 11, c: "#30d158" });
    if (cur >= 0) {
      const i = ZZ[cur];
      c.strokeStyle = "#ffd60a"; c.lineWidth = 2; c.strokeRect(P4[0] + (i % 8) * CEL, P4[1] + Math.floor(i / 8) * CEL, CEL, CEL);
    }
    const r = JPG.rle(k.qz);
    let txt = "DC = " + k.qz[0] + " · " + (r.length ? r.join(" ") : "") + " EOB";
    if (txt.length > 118) txt = txt.slice(0, 115) + "…";
    O.ecrire(c, txt, 20, zy + 50, { s: 13, m: true, c: "#e5e5ea", g: false });
    O.ecrire(c, "(nombre de zéros ; valeur), puis EOB = « fin de bloc » : les zéros restants ne coûtent rien", 20, zy + 70, { s: 12, c: "#a1a1a6", g: false });
  }

  function dessiner() {
    calculer();
    const k = calc;
    rQ.parentElement.querySelector("output").textContent = k.q;
    Application.afficher("#m2a-nz", k.nz + " / 64");
    Application.afficher("#m2a-bits", k.bits + " bits");
    Application.afficher("#m2a-taux", O.nb(512 / k.bits, 1) + ":1");
    Application.afficher("#m2a-err", "± " + Math.round(k.emax));
    const F0 = k.F[0], Q0 = k.Qt[0];
    O.html("m2a-calc",
      '<div><span class="c">DC = 8 × (moyenne − 128)</span></div><div>= 8 × (' + O.nb(k.moy, 1) + " − 128) = <b>" + O.nb(F0, 1) + "</b></div>" +
      '<div style="margin-top:6px"><span class="c">Pas du DC à la qualité ' + k.q + "</span></div><div>Q = 16 × S ÷ 100 = <b>" + Q0 + "</b></div>" +
      '<div style="margin-top:6px"><span class="c">F<sub>q</sub> = arrondi(F ÷ Q)</span></div><div>= arrondi(' + O.nb(F0, 1) + " ÷ " + Q0 + ") = <b>" + k.qz[0] + "</b></div>" +
      '<div style="margin-top:6px"><span class="c">Bits estimés (Huffman)</span></div><div>' + k.bits + " bits au lieu de 512 → <b>" + O.nb(512 / k.bits, 1) + ":1</b></div>");
    const nom = Object.keys(BLOCS_TYPES).find(n => BLOCS_TYPES[n][0] === bx && BLOCS_TYPES[n][1] === by);
    O.note("m2a-msg", k.nz <= 3 ? "note ok" : k.nz <= 12 ? "note" : "note warn",
      k.nz <= 3 ? "Bloc <b>lisse</b>" + (nom ? " (" + nom + ")" : "") + " : après quantification, il ne reste que <b>" + k.nz + " coefficient" + (k.nz > 1 ? "s" : "") + "</b>. Le DC (la moyenne) porte presque tout ; le bloc coûte " + k.bits + " bits au lieu de 512." :
      k.nz <= 12 ? "Bloc à variations douces : <b>" + k.nz + " coefficients</b> survivent, tous près du coin en haut à gauche (basses fréquences). L’erreur reste de ± " + Math.round(k.emax) + " niveaux." :
      "Bloc <b>chargé</b> (bord, texte ou texture) : <b>" + k.nz + " coefficients</b> survivent, jusque dans les hautes fréquences, et le bloc coûte " + k.bits + " bits. " + (k.q < 30 ? "À cette qualité, l’erreur atteint ± " + Math.round(k.emax) + " : c’est là qu’apparaissent les halos (ringing)." : "Baissez la qualité : l’erreur se concentre autour des bords."));
    scene();
  }

  cv.addEventListener("click", e => {
    const p = O.clic(cv, e);
    if (p[0] >= IX && p[0] < IX + 320 && p[1] >= IY && p[1] < IY + 192) { bx = Math.floor((p[0] - IX) / 8); by = Math.floor((p[1] - IY) / 8); dessiner(); }
  });
  cv.style.cursor = "crosshair";
  rQ.addEventListener("input", dessiner);
  O.situations("m2a-situ", s => { bx = BLOCS_TYPES[s][0]; by = BLOCS_TYPES[s][1]; dessiner(); });
  const anim = O.boucle(cv, dt => { t += dt; scene(); });
  O.boutonPause("m2a-pause", anim);
  dessiner();
});

/* ==========================================================================
   MODULE 2 — LABO 2 : LES 64 MOTIFS ET LA RECONSTRUCTION
   ========================================================================== */
labo(2, function () {
  const cv = O.el("m2b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rK = O.el("m2b-k-in"), bJouer = O.el("m2b-jouer");
  const MOTIFS = [];
  for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) MOTIFS.push(JPG.motif(u, v));
  const LETTRE = ["..####..", ".##..##.", "##....##", "##....##", "########", "##....##", "##....##", "........"];
  const BLOCS = {
    degrade: () => { const v = new Float64Array(64); for (let i = 0; i < 64; i++) v[i] = 60 + (i & 7) * 16 + (i >> 3) * 6; return v; },
    bord: () => blocImage(BLOCS_TYPES.bord[0], BLOCS_TYPES.bord[1]),
    texte: () => { const v = new Float64Array(64); for (let i = 0; i < 64; i++) v[i] = LETTRE[i >> 3][i & 7] === "#" ? 30 : 235; return v; },
    damier: () => { const v = new Float64Array(64); for (let i = 0; i < 64; i++) v[i] = ((i & 7) + (i >> 3)) % 2 ? 40 : 215; return v; },
    feuillage: () => blocImage(BLOCS_TYPES.feuillage[0], BLOCS_TYPES.feuillage[1])
  };
  let nomBloc = "degrade", bloc = BLOCS.degrade(), F = null, touche = -1, jeu = false, tJeu = 0;
  const GX = 20, GY = 46, MC = 5, MG = 44;            // grille des motifs : 8 × 8 motifs de 40 px
  function preparer() { F = JPG.dct(bloc.map(v => v - 128)); }
  function reconstruire(k) {
    const F2 = new Float64Array(64);
    for (let i = 0; i < k; i++) F2[ZZ[i]] = F[ZZ[i]];
    return JPG.idct(F2).map(v => v + 128);
  }
  function energie(k) { let a = 0, b = 0; for (let i = 1; i < 64; i++) { const e = F[ZZ[i]] * F[ZZ[i]]; b += e; if (i < k) a += e; } return b ? a / b : 1; }

  function dessiner() {
    const k = +rK.value, rec = reconstruire(k), err = rec.map((v, i) => v - bloc[i]);
    const emoy = err.reduce((a, v) => a + Math.abs(v), 0) / 64, en = energie(k);
    rK.parentElement.querySelector("output").textContent = k + " / 64";
    Application.afficher("#m2b-k", k + " / 64");
    Application.afficher("#m2b-en", O.nb(en * 100, en > 0.995 && en < 1 ? 1 : 0) + " %");
    Application.afficher("#m2b-err", "± " + O.nb(emoy, 1));
    if (touche >= 0) Application.afficher("#m2b-uv", "u " + (touche % 8) + ", v " + (touche >> 3) + " : " + Math.round(F[touche]));

    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    O.ecrire(c, "Les 64 motifs de base (u → horizontal, v → vertical)", GX, 28, { s: 14, c: "#a1a1a6" });
    const rang = new Array(64); ZZ.forEach((p, i) => { rang[p] = i; });
    for (let m = 0; m < 64; m++) {
      const u = m % 8, v = m >> 3, x0 = GX + u * MG, y0 = GY + v * MG, actif = rang[m] < k;
      c.globalAlpha = actif ? 1 : 0.38;
      for (let i = 0; i < 64; i++) { const gg = Math.round(O.borne(m === 0 ? 200 : 128 + MOTIFS[m][i] * 440, 0, 255)); c.fillStyle = "rgb(" + gg + "," + gg + "," + gg + ")"; c.fillRect(x0 + (i & 7) * MC, y0 + (i >> 3) * MC, MC, MC); }
      c.globalAlpha = 1;
      if (actif) { const a = Math.min(1, Math.abs(F[m]) / 120); c.strokeStyle = F[m] >= 0 ? "rgba(255,159,10," + (0.25 + a * 0.75) + ")" : "rgba(10,132,255," + (0.25 + a * 0.75) + ")"; c.lineWidth = 1 + a * 2; c.strokeRect(x0 - 1, y0 - 1, 42, 42); }
      if (rang[m] === k - 1) { c.strokeStyle = "#ffd60a"; c.lineWidth = 3; c.strokeRect(x0 - 2, y0 - 2, 44, 44); }
      if (m === touche) { c.strokeStyle = "#fff"; c.lineWidth = 2; c.setLineDash([4, 3]); c.strokeRect(x0 - 3, y0 - 3, 46, 46); c.setLineDash([]); }
    }
    O.ecrire(c, "Contour orange : coefficient positif · bleu : négatif · épais : grand", GX, GY + MG * 8 + 16, { s: 12, c: "#a1a1a6", g: false });

    // bloc d'origine, reconstruit, erreur
    const BX = 400, BY = 46, cel = 22;
    dessinerBloc(c, bloc, BX, BY, cel, { titre: "Bloc d’origine" });
    dessinerBloc(c, rec, BX + 196, BY, cel, { titre: "Avec " + k + " motif" + (k > 1 ? "s" : ""), couleur: "#ffd60a" });
    dessinerBloc(c, err, BX + 392, BY, cel, { mode: "erreur", titre: "Erreur restante", couleur: "#ff453a" });
    if (k < 64) {
      const m = ZZ[k - 1];
      O.ecrire(c, "Dernier ajouté : motif (" + (m % 8) + " ; " + (m >> 3) + ") × " + Math.round(F[m]), BX + 196, BY + 8 * cel + 24, { s: 13, c: "#ffd60a" });
    } else O.ecrire(c, "Les 64 motifs : bloc parfaitement reconstruit", BX + 196, BY + 8 * cel + 24, { s: 13, c: "#30d158" });
    // courbe d'énergie
    const gx = 400, gy = 270, gw = 570, gh = 150;
    c.fillStyle = "rgba(255,255,255,.04)"; c.fillRect(gx, gy, gw, gh);
    O.ecrire(c, "Part des variations (énergie AC) déjà décrite, selon le nombre de motifs", gx, gy - 10, { s: 13, c: "#a1a1a6" });
    c.strokeStyle = "#64d2ff"; c.lineWidth = 2; c.beginPath();
    for (let i = 1; i <= 64; i++) { const x = gx + (i - 1) / 63 * gw, y = gy + gh - energie(i) * gh; i === 1 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
    const xk = gx + (k - 1) / 63 * gw;
    c.strokeStyle = "#ffd60a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(xk, gy); c.lineTo(xk, gy + gh); c.stroke();
    c.fillStyle = "#ffd60a"; c.beginPath(); c.arc(xk, gy + gh - en * gh, 5, 0, 7); c.fill();
    [1, 10, 20, 32, 64].forEach(i => O.ecrire(c, i, gx + (i - 1) / 63 * gw, gy + gh + 18, { s: 12, a: "center", c: "#8e8e93" }));
    O.ecrire(c, "100 %", gx - 6, gy + 6, { s: 12, a: "right", c: "#8e8e93" }); O.ecrire(c, "0", gx - 6, gy + gh, { s: 12, a: "right", c: "#8e8e93" });
    O.ecrire(c, "motifs ajoutés dans l’ordre du zigzag", gx + gw, gy + gh + 38, { s: 12, a: "right", c: "#8e8e93", g: false });

    const k90 = (() => { for (let i = 1; i <= 64; i++) if (energie(i) >= 0.9) return i; return 64; })();
    const textes = {
      degrade: "Un dégradé est presque entièrement décrit par <b>2 ou 3 motifs</b> (le DC et les premières rayures très larges) : " + k90 + " motifs suffisent pour 90 % des variations. C’est pourquoi les zones lisses coûtent si peu.",
      bord: "Un bord net demande de nombreux motifs : il faut " + k90 + " motifs pour 90 % des variations. Si la quantification supprime les derniers, le bord s’entoure de petites ondulations (ringing).",
      texte: "Une lettre est faite de bords nets dans les deux directions : il faut " + k90 + " motifs pour 90 % des variations. Le texte supporte mal une forte compression.",
      damier: "Le damier est le cas extrême : il <b>est</b> presque le dernier motif (7 ; 7), la plus haute fréquence. Avec moins de 64 motifs, il est gris ! Une texture aussi fine est la première sacrifiée par la quantification.",
      feuillage: "Le feuillage mélange toutes les fréquences : il faut " + k90 + " motifs pour 90 % des variations. Les textures fines (feuillage, herbe, eau, grain) sont ce qui coûte le plus cher à un codec."
    };
    O.note("m2b-msg", nomBloc === "damier" || nomBloc === "feuillage" ? "note warn" : "note ok", textes[nomBloc]);
  }

  rK.addEventListener("input", dessiner);
  O.situations("m2b-situ", s => { nomBloc = s; bloc = BLOCS[s](); preparer(); dessiner(); });
  cv.addEventListener("click", e => {
    const p = O.clic(cv, e), u = Math.floor((p[0] - GX) / MG), v = Math.floor((p[1] - GY) / MG);
    if (u >= 0 && u < 8 && v >= 0 && v < 8) { touche = v * 8 + u; dessiner(); }
  });
  cv.style.cursor = "pointer";
  const anim = O.boucle(cv, dt => {
    if (!jeu) return;
    tJeu += dt;
    if (tJeu > 0.32) { tJeu = 0; const k = +rK.value; if (k >= 64) { jeu = false; bJouer.textContent = "▶ Jouer"; } else O.curseur(rK, k + 1); }
  });
  bJouer.addEventListener("click", () => {
    if (O.reduit()) { O.curseur(rK, 64); return; }
    jeu = !jeu; if (jeu && +rK.value >= 64) O.curseur(rK, 1);
    bJouer.textContent = jeu ? "⏸ Pause" : "▶ Jouer"; anim.pause(false);
  });
  preparer();
  dessiner();
});

/* ==========================================================================
   MODULE 2 — LABO 3 : COMPRESSER TOUTE L'IMAGE
   ========================================================================== */
labo(2, function () {
  const cv = O.el("m2c-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rQ = O.el("m2c-q");
  const im = IMG.pixels(320, 192);
  let ech = "4:2:0", vue = "image", lx = 236, ly = 104, res = null, reel = null, demande = 0;
  const sortie = document.createElement("canvas"); sortie.width = 320; sortie.height = 192; const sx = sortie.getContext("2d");
  const IX = 20, IY = 30, S = 1.875, LX = 650, LY = 30, LT = 80, LZ = 4;

  function tailleReelle(q) {
    const n = ++demande;
    if (!im.cv.toBlob) return;
    im.cv.toBlob(b => { if (n !== demande || !b) return; reel = b.size; Application.afficher("#m2c-reel", O.nb(reel / 1000, 1) + " Ko"); }, "image/jpeg", q / 100);
  }

  function dessiner() {
    const q = +rQ.value;
    rQ.parentElement.querySelector("output").textContent = q;
    res = JPG.compresser(im.d, q, ech);
    const brut = 320 * 192 * 3, octets = res.bits / 8, tau = brut / octets;
    Application.afficher("#m2c-brut", O.nb(brut / 1000, 1) + " Ko");
    Application.afficher("#m2c-poids", O.nb(octets / 1000, 1) + " Ko");
    Application.afficher("#m2c-taux", O.nb(tau, 1) + ":1");
    Application.afficher("#m2c-psnr", isFinite(res.psnr) ? O.nb(res.psnr, 1) + " dB" : "∞");
    O.el("m2c-psnr").className = res.psnr >= 38 ? "ok" : res.psnr < 30 ? "bad" : "";
    tailleReelle(q);
    // image affichée : décodée, erreur amplifiée, ou originale
    if (vue === "erreur") {
      const e = new ImageData(320, 192), a = res.img.data, b = im.d.data;
      for (let i = 0; i < a.length; i += 4) { const d = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3 * 8; e.data[i] = d; e.data[i + 1] = d * 0.45; e.data[i + 2] = d * 0.35; e.data[i + 3] = 255; }
      sx.putImageData(e, 0, 0);
    } else if (vue === "original") sx.drawImage(im.cv, 0, 0);
    else sx.putImageData(res.img, 0, 0);
    scene();
    const ps = res.psnr;
    O.note("m2c-msg", ps >= 38 ? "note ok" : ps >= 30 ? "note" : "note bad",
      ps >= 38 ? "Qualité " + q + " : PSNR de <b>" + O.nb(ps, 1) + " dB</b>, les défauts sont invisibles. Le fichier pèse pourtant <b>" + O.nb(tau, 1) + " fois</b> moins que l’image brute. Regardez la loupe en mode « Erreur × 8 » : l’erreur se loge dans les textures et le long des bords." :
      ps >= 30 ? "Qualité " + q + " : taux de <b>" + O.nb(tau, 0) + ":1</b>, PSNR de " + O.nb(ps, 1) + " dB. Dans la loupe, on commence à voir des <b>halos</b> autour du texte et des <b>blocs</b> dans le ciel." + (ech === "4:2:0" ? " Les bords colorés de la mire <b>bavent</b> : c’est le 4:2:0." : "") :
      "Qualité " + q + " : taux de <b>" + O.nb(tau, 0) + ":1</b>, mais l’image est abîmée (" + O.nb(ps, 1) + " dB) : <b>effet de bloc</b> dans le ciel, <b>ringing</b> autour du texte, couleurs qui débordent. Chaque bloc de 8 × 8 est réduit à sa moyenne et à une ou deux rayures.");
  }

  function scene() {
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    c.imageSmoothingEnabled = false;
    c.drawImage(sortie, IX, IY, 320 * S, 192 * S);
    c.strokeStyle = "#ffd60a"; c.lineWidth = 2; c.strokeRect(IX + lx * S, IY + ly * S, LT * S, LT * S);
    c.drawImage(sortie, lx, ly, LT, LT, LX, LY, LT * LZ, LT * LZ);
    c.imageSmoothingEnabled = true;
    // grille des blocs dans la loupe
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 1; c.beginPath();
    for (let x = Math.ceil(lx / 8) * 8; x <= lx + LT; x += 8) { const X = LX + (x - lx) * LZ + 0.5; c.moveTo(X, LY); c.lineTo(X, LY + LT * LZ); }
    for (let y = Math.ceil(ly / 8) * 8; y <= ly + LT; y += 8) { const Y = LY + (y - ly) * LZ + 0.5; c.moveTo(LX, Y); c.lineTo(LX + LT * LZ, Y); }
    c.stroke();
    c.strokeStyle = "#ffd60a"; c.lineWidth = 2; c.strokeRect(LX, LY, LT * LZ, LT * LZ);
    O.ecrire(c, "Loupe × 4 · grille des blocs 8 × 8", LX, LY + LT * LZ + 22, { s: 13, c: "#ffd60a" });
    O.ecrire(c, vue === "erreur" ? "Erreur × 8 : noir = aucune erreur" : vue === "original" ? "Image d’origine, avant compression" : "Image décodée", LX, LY + LT * LZ + 44, { s: 13, c: "#a1a1a6", g: false });
    O.ecrire(c, "Touchez l’image pour déplacer la loupe", LX, LY + LT * LZ + 66, { s: 12, c: "#8e8e93", g: false });
  }

  cv.addEventListener("click", e => {
    const p = O.clic(cv, e);
    if (p[0] >= IX && p[0] < IX + 320 * S && p[1] >= IY && p[1] < IY + 192 * S) {
      lx = O.borne(Math.round((p[0] - IX) / S - LT / 2), 0, 320 - LT); ly = O.borne(Math.round((p[1] - IY) / S - LT / 2), 0, 192 - LT); scene();
    }
  });
  cv.style.cursor = "crosshair";
  rQ.addEventListener("input", dessiner);
  Application.segment("#m2c-ech", [["4:4:4", "4:4:4"], ["4:2:2", "4:2:2"], ["4:2:0", "4:2:0"]], ech, v => { ech = v; dessiner(); });
  Application.segment("#m2c-vue", [["image", "Image"], ["erreur", "Erreur × 8"], ["original", "Original"]], vue, v => { vue = v; dessiner(); });
  O.situations("m2c-situ", s => O.curseur(rQ, +s));
  dessiner();
});

/* ==========================================================================
   MODULE 3 — LABO 1 : ESTIMATION ET COMPENSATION DE MOUVEMENT
   ========================================================================== */
labo(3, function () {
  const cv = O.el("m3a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rV = O.el("m3a-v"), rR = O.el("m3a-r"), rB = O.el("m3a-b");
  const FW = 192, FH = 128, MB = 16, NX = FW / MB, NY = FH / MB, KD = FW / 320;   // 12 × 8 macroblocs
  const PS = 300 / FW, PANS = [[20, 40], [330, 40], [20, 300], [330, 300]];
  let cam = "fixe", n = 10, cycle = 0, sel = null, R = null;
  const tmp = document.createElement("canvas"); tmp.width = FW; tmp.height = FH; const tx = tmp.getContext("2d", { willReadFrequently: true });
  const vues = [0, 1, 2, 3].map(() => { const k = document.createElement("canvas"); k.width = FW; k.height = FH; return k; });

  // Position de la balle et décalage du décor à l'image i (en pixels de l'image 192 × 128)
  function etat(i) {
    const v = +rV.value, base = 30 + i * v;
    return { bx: base, by: 54 + (v ? 10 * Math.sin(i * 0.35) : 0), pan: cam === "pano" ? i * 3 : 0 };
  }
  function image(i, decal) {
    const e = etat(i);
    tx.clearRect(0, 0, FW, FH);
    IMG.scene(tx, FW, FH, { pan: e.pan / KD, balle: true, bx: (e.bx - decal) / KD, by: e.by / KD });
    const d = tx.getImageData(0, 0, FW, FH), Y = IMG.luma(d), b = +rB.value;
    if (b) for (let k = 0; k < Y.length; k++) Y[k] += (O.alea(k * 1.37 + i * 7919.1) - 0.5) * 3.4 * b;
    return { d: d, Y: Y };
  }
  const qI = JPG.table(50), qP = JPG.table(50);
  function bitsBlocs(Y, x0, y0, centre) {
    let bits = 0; const b = new Float64Array(64), qz = new Int32Array(64);
    for (let sy = 0; sy < 16; sy += 8) for (let sx = 0; sx < 16; sx += 8) {
      for (let k = 0; k < 64; k++) b[k] = Y[(y0 + sy + (k >> 3)) * FW + x0 + sx + (k & 7)] - centre;
      const F = JPG.dct(b);
      for (let k = 0; k < 64; k++) qz[k] = Math.round(F[k] / (centre ? qI[k] : qP[k]));
      bits += JPG.bitsBloc(qz, 0);
    }
    return bits;
  }
  const bitsVecteur = d => { const k = Math.abs(2 * d) - (d > 0 ? 1 : 0); return 2 * Math.floor(Math.log2(k + 1)) + 1; };

  function calculer() {
    const v = +rV.value, r = +rR.value;
    // éviter que la balle sorte de l'image : on la ramène au début, la même pour les deux images
    let decal = 0; const e = etat(n); if (e.bx > 175) decal = Math.floor((e.bx - 30) / 145) * 145;
    const A = image(n - 1, decal), B = image(n, decal);
    const vx = new Int8Array(NX * NY), vy = new Int8Array(NX * NY), sad = new Float64Array(NX * NY), skip = new Uint8Array(NX * NY);
    const pred = new Float32Array(FW * FH);
    let bI = 0, bP = 0, nSkip = 0;
    for (let my = 0; my < NY; my++) for (let mx = 0; mx < NX; mx++) {
      const x0 = mx * MB, y0 = my * MB, m = my * NX + mx;
      let best = Infinity, bdx = 0, bdy = 0, bsad = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx + MB > FW || y0 + dy + MB > FH) continue;
        let s = 0;
        for (let y = 0; y < MB && s < best; y++) { const o1 = (y0 + y) * FW + x0, o2 = (y0 + y + dy) * FW + x0 + dx; for (let x = 0; x < MB; x++) s += Math.abs(B.Y[o1 + x] - A.Y[o2 + x]); }
        const cout = s + 4 * (Math.abs(dx) + Math.abs(dy));
        if (cout < best) { best = cout; bdx = dx; bdy = dy; bsad = s; }
      }
      vx[m] = bdx; vy[m] = bdy; sad[m] = bsad;
      for (let y = 0; y < MB; y++) for (let x = 0; x < MB; x++) pred[(y0 + y) * FW + x0 + x] = A.Y[(y0 + y + bdy) * FW + x0 + x + bdx];
      bI += bitsBlocs(B.Y, x0, y0, 128);
      if (!bdx && !bdy && bsad < MB * MB * 2.5) { skip[m] = 1; nSkip++; bP += 1; }
      else {
        const res = new Float32Array(FW * FH);
        for (let y = 0; y < MB; y++) for (let x = 0; x < MB; x++) { const k = (y0 + y) * FW + x0 + x; res[k] = B.Y[k] - pred[k]; }
        bP += 2 + bitsVecteur(bdx) + bitsVecteur(bdy) + bitsBlocs(res, x0, y0, 0);
      }
    }
    // par défaut, on suit le macrobloc qui change le plus d'une image à l'autre (la balle)
    let bal = 0, dmax = -1;
    for (let m = 0; m < NX * NY; m++) {
      const x0 = (m % NX) * MB, y0 = Math.floor(m / NX) * MB; let d = 0;
      for (let y = 0; y < MB; y++) for (let x = 0; x < MB; x++) { const k = (y0 + y) * FW + x0 + x; d += Math.abs(B.Y[k] - A.Y[k]); }
      if (d > dmax) { dmax = d; bal = m; }
    }
    R = { A: A, B: B, vx: vx, vy: vy, sad: sad, skip: skip, pred: pred, bI: bI, bP: bP, nSkip: nSkip, r: r, v: v, balle: bal };
    // images à afficher
    const remplir = (k, f) => { const ctx = vues[k].getContext("2d"), im = ctx.createImageData(FW, FH); for (let i = 0; i < FW * FH; i++) { const p = f(i); im.data[i * 4] = p[0]; im.data[i * 4 + 1] = p[1]; im.data[i * 4 + 2] = p[2]; im.data[i * 4 + 3] = 255; } ctx.putImageData(im, 0, 0); };
    const coul = (D, i) => [D.d.data[i * 4], D.d.data[i * 4 + 1], D.d.data[i * 4 + 2]];
    const b = +rB.value;
    remplir(0, i => { if (!b) return coul(A, i); const y = A.Y[i]; return [y, y, y]; });
    remplir(1, i => { if (!b) return coul(B, i); const y = B.Y[i]; return [y, y, y]; });
    remplir(2, i => { const y = pred[i]; return [y, y, y]; });
    remplir(3, i => { const e = Math.abs(B.Y[i] - pred[i]) * 4; return [Math.min(255, e), Math.min(255, e * 0.55), Math.min(255, e * 0.35)]; });
    sadCarte();
  }

  // Carte des écarts (SAD) de toutes les positions testées pour le macrobloc choisi
  let carte = null;
  function choisi() { return sel === null ? R.balle : sel; }
  function sadCarte() {
    const m = choisi(), x0 = (m % NX) * MB, y0 = Math.floor(m / NX) * MB, r = R.r, L = 2 * r + 1, t = new Float64Array(L * L).fill(NaN);
    let mn = Infinity, mx = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx + MB > FW || y0 + dy + MB > FH) continue;
      let s = 0;
      for (let y = 0; y < MB; y++) for (let x = 0; x < MB; x++) s += Math.abs(R.B.Y[(y0 + y) * FW + x0 + x] - R.A.Y[(y0 + y + dy) * FW + x0 + x + dx]);
      t[(dy + r) * L + dx + r] = s; mn = Math.min(mn, s); mx = Math.max(mx, s);
    }
    carte = { t: t, L: L, mn: mn, mx: mx, m: m, x0: x0, y0: y0 };
  }

  function scene() {
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    const titres = ["Référence : image n − 1", "Image n à coder", "Prédiction (blocs recopiés)", "Résidu = image n − prédiction (× 4)"];
    c.imageSmoothingEnabled = false;
    PANS.forEach((p, k) => { c.drawImage(vues[k], p[0], p[1], 300, 200); O.ecrire(c, titres[k], p[0], p[1] - 10, { s: 13, c: k === 3 ? "#ff9f0a" : "#a1a1a6" }); });
    c.imageSmoothingEnabled = true;
    const m = carte.m, x0 = carte.x0, y0 = carte.y0, r = R.r, L = carte.L;
    // vecteurs de mouvement sur l'image à coder
    for (let i = 0; i < NX * NY; i++) {
      const cx = PANS[1][0] + ((i % NX) * MB + 8) * PS, cy = PANS[1][1] + (Math.floor(i / NX) * MB + 8) * PS;
      if (R.skip[i]) { c.fillStyle = "rgba(255,255,255,.28)"; c.fillRect(cx - 1.5, cy - 1.5, 3, 3); continue; }
      O.fleche(c, cx, cy, cx + R.vx[i] * PS, cy + R.vy[i] * PS + (R.vx[i] || R.vy[i] ? 0 : 0.01), "#ffd60a", 1.6);
    }
    // grille des macroblocs
    c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i <= NX; i++) { c.moveTo(PANS[1][0] + i * MB * PS, PANS[1][1]); c.lineTo(PANS[1][0] + i * MB * PS, PANS[1][1] + 200); }
    for (let j = 0; j <= NY; j++) { c.moveTo(PANS[1][0], PANS[1][1] + j * MB * PS); c.lineTo(PANS[1][0] + 300, PANS[1][1] + j * MB * PS); }
    c.stroke();
    c.strokeStyle = "#64d2ff"; c.lineWidth = 2.5; c.strokeRect(PANS[1][0] + x0 * PS, PANS[1][1] + y0 * PS, MB * PS, MB * PS);
    // zone de recherche et candidat sur la référence
    const rx = PANS[0][0], ry = PANS[0][1];
    c.strokeStyle = "rgba(100,210,255,.8)"; c.setLineDash([5, 4]); c.lineWidth = 1.5;
    c.strokeRect(rx + (x0 - r) * PS, ry + (y0 - r) * PS, (MB + 2 * r) * PS, (MB + 2 * r) * PS); c.setLineDash([]);
    const prog = O.reduit() || !anim.actif() ? 1 : O.borne(cycle / 1.1, 0, 1), vus = Math.floor(prog * L * L);
    let cdx = R.vx[m], cdy = R.vy[m];
    if (prog < 1) { cdx = (vus % L) - r; cdy = Math.floor(vus / L) - r; }
    c.strokeStyle = prog < 1 ? "#ffd60a" : "#30d158"; c.lineWidth = 2.5;
    c.strokeRect(rx + (x0 + cdx) * PS, ry + (y0 + cdy) * PS, MB * PS, MB * PS);
    O.ecrire(c, "zone de recherche ± " + r + " px", rx + 4, ry + 196, { s: 12, c: "#64d2ff" });

    // à droite : zoom et carte des écarts
    const ZX = 650, ZY = 50, ZC = 6;
    const zoom = (src, sx, sy, x, titre, coul) => { c.imageSmoothingEnabled = false; c.drawImage(src, sx, sy, MB, MB, x, ZY, MB * ZC, MB * ZC); c.imageSmoothingEnabled = true; c.strokeStyle = coul; c.lineWidth = 2; c.strokeRect(x, ZY, MB * ZC, MB * ZC); O.ecrire(c, titre, x, ZY - 10, { s: 12, c: coul }); };
    zoom(vues[1], x0, y0, ZX, "À coder", "#64d2ff");
    zoom(vues[0], O.borne(x0 + cdx, 0, FW - MB), O.borne(y0 + cdy, 0, FH - MB), ZX + 110, prog < 1 ? "Candidat" : "Meilleur", prog < 1 ? "#ffd60a" : "#30d158");
    zoom(vues[3], x0, y0, ZX + 220, "Résidu", "#ff9f0a");
    const MX = 690, MY = 200, MS = 230, cel = MS / L;
    O.ecrire(c, "Écart (SAD) de chaque position testée", MX - 30, MY - 12, { s: 13, c: "#a1a1a6" });
    for (let k = 0; k < L * L; k++) {
      const v = carte.t[k], x = MX + (k % L) * cel, y = MY + Math.floor(k / L) * cel;
      if (k >= vus && prog < 1) { c.fillStyle = "rgba(255,255,255,.04)"; c.fillRect(x, y, cel - 0.5, cel - 0.5); continue; }
      if (isNaN(v)) { c.fillStyle = "#1c1c1e"; c.fillRect(x, y, cel - 0.5, cel - 0.5); continue; }
      const f = Math.pow((v - carte.mn) / Math.max(1, carte.mx - carte.mn), 0.5);
      c.fillStyle = "hsl(" + (50 + f * 190) + ",85%," + (60 - f * 45) + "%)"; c.fillRect(x, y, cel - 0.5, cel - 0.5);
    }
    c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1; c.beginPath(); c.moveTo(MX + MS / 2, MY - 4); c.lineTo(MX + MS / 2, MY + MS + 4); c.moveTo(MX - 4, MY + MS / 2); c.lineTo(MX + MS + 4, MY + MS / 2); c.stroke();
    if (prog >= 1) { c.strokeStyle = "#fff"; c.lineWidth = 2.5; c.beginPath(); c.arc(MX + (R.vx[m] + r + 0.5) * cel, MY + (R.vy[m] + r + 0.5) * cel, Math.max(5, cel), 0, 7); c.stroke(); }
    O.ecrire(c, "dx →", MX + MS + 6, MY + MS / 2 + 5, { s: 12, c: "#8e8e93" }); O.ecrire(c, "dy ↓", MX + MS / 2 + 6, MY + MS + 18, { s: 12, c: "#8e8e93" });
    O.ecrire(c, "jaune = petit écart (ressemblant)", MX - 30, MY + MS + 44, { s: 12, c: "#ffd60a", g: false });
    O.ecrire(c, "bleu = grand écart", MX - 30, MY + MS + 62, { s: 12, c: "#5e8cff", g: false });
  }

  function dessiner() {
    const v = +rV.value, r = +rR.value, b = +rB.value;
    rV.parentElement.querySelector("output").textContent = v + " px/image";
    rR.parentElement.querySelector("output").textContent = "± " + r + " px";
    rB.parentElement.querySelector("output").textContent = b ? b : "aucun";
    calculer();
    const m = carte.m, sadm = R.sad[m];
    Application.afficher("#m3a-vec", "(" + R.vx[m] + " ; " + R.vy[m] + ")");
    Application.afficher("#m3a-sad", O.nb(sadm, 0));
    Application.afficher("#m3a-skip", R.nSkip + " / " + NX * NY);
    Application.afficher("#m3a-bi", O.nb(R.bI / 1000, 1) + " kbit");
    Application.afficher("#m3a-bp", O.nb(R.bP / 1000, 1) + " kbit");
    O.html("m3a-calc",
      '<div><span class="c">Macrobloc (' + (m % NX) + " ; " + Math.floor(m / NX) + ")</span></div><div>Vecteur : <b>(" + R.vx[m] + " ; " + R.vy[m] + ")</b>, testé parmi " + (2 * r + 1) * (2 * r + 1) + " positions</div>" +
      '<div style="margin-top:6px"><span class="c">SAD = Σ |à coder − référence|</span></div><div>= ' + O.nb(sadm, 0) + " sur 256 pixels = <b>" + O.nb(sadm / 256, 1) + "</b> par pixel</div>" +
      '<div style="margin-top:6px"><span class="c">Toute l’image</span></div><div>en I : ' + O.nb(R.bI, 0) + " bits · en P : " + O.nb(R.bP, 0) + " bits</div><div>P = <b>" + O.nb(R.bP / R.bI * 100, 0) + " %</b> de I</div>");
    const trop = v > r, bruit = b >= 5;
    O.note("m3a-msg", trop ? "note bad" : bruit ? "note warn" : "note ok",
      trop ? "La balle bouge de <b>" + v + " px</b> par image, mais le codeur ne cherche qu’à <b>± " + r + " px</b> : il ne la retrouve pas ! Le résidu reste énorme autour de la balle. Agrandissez la zone de recherche (au prix de beaucoup plus de calculs)." :
      bruit ? "Avec du grain, aucun bloc ne se retrouve à l’identique : le résidu est partout, plus aucun macrobloc n’est « skip », et l’image P coûte <b>" + O.nb(R.bP / R.bI * 100, 0) + " %</b> de l’image I. Le grain est l’ennemi de la compression inter-image." :
      cam === "pano" ? "Panoramique : tout le décor glisse, donc presque tous les macroblocs reçoivent le <b>même vecteur</b>. La prédiction reste excellente : l’image P ne coûte que <b>" + O.nb(R.bP / R.bI * 100, 0) + " %</b> de l’image I." :
      "Le décor ne bouge pas : <b>" + R.nSkip + " macroblocs</b> sur " + NX * NY + " sont simplement recopiés (« skip », 1 bit). Seuls les blocs de la balle reçoivent un vecteur et un petit résidu : l’image P coûte <b>" + O.nb(R.bP / R.bI * 100, 0) + " %</b> de l’image I.");
    scene();
  }

  cv.addEventListener("click", e => {
    const p = O.clic(cv, e), x = (p[0] - PANS[1][0]) / PS, y = (p[1] - PANS[1][1]) / PS;
    if (x >= 0 && x < FW && y >= 0 && y < FH) { sel = Math.floor(y / MB) * NX + Math.floor(x / MB); cycle = 0; sadCarte(); dessiner(); }
  });
  cv.style.cursor = "crosshair";
  [rV, rR, rB].forEach(r => r.addEventListener("input", () => { cycle = 0; dessiner(); }));
  Application.segment("#m3a-cam", [["fixe", "Fixe"], ["pano", "Panoramique"]], cam, v => { cam = v; cycle = 0; dessiner(); });
  const anim = O.boucle(cv, dt => {
    cycle += dt;
    if (cycle > 2.2) { cycle = 0; n++; dessiner(); } else scene();
  });
  O.boutonPause("m3a-pause", anim, () => scene());
  dessiner();
});

/* ==========================================================================
   MODULE 3 — LABO 2 : CONSTRUIRE UN GOP
   ========================================================================== */
labo(3, function () {
  const cv = O.el("m3b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rN = O.el("m3b-n"), rM = O.el("m3b-m");
  let ferme = true, mode = "ref", choix = -1, t = 0;
  const TAILLE = { I: 1, P: 0.42, B: 0.16 };

  function structure() {
    const N = +rN.value, M = Math.min(+rM.value, N), T = Math.min(32, N <= 12 ? 2 * N + 1 : N + M + 1);
    const type = [];
    for (let i = 0; i < T; i++) {
      const k = i % N;
      type.push(k === 0 ? "I" : (k % M === 0 || (ferme && k === N - 1)) ? "P" : "B");
    }
    const refs = type.map((ty, i) => {
      if (ty === "I") return [];
      let a = i - 1; while (type[a] === "B") a--;
      if (ty === "P") return [a];
      let b = i + 1; while (b < T && type[b] === "B") b++;
      return b < T ? [a, b] : [a, -1];
    });
    // ordre de transmission : chaque ancrage, puis les B qui l'attendaient
    const ordre = [], attente = [];
    type.forEach((ty, i) => { if (ty === "B") attente.push(i); else { ordre.push(i); while (attente.length) ordre.push(attente.shift()); } });
    const enAttente = attente.slice();
    const taille = type.map((ty, i) => TAILLE[ty] * (0.9 + 0.2 * O.alea(i * 3.1)));
    return { N: N, M: M, T: T, type: type, refs: refs, ordre: ordre, enAttente: enAttente, taille: taille };
  }
  // Toutes les images dont dépend l'image i (récursivement)
  function ancetres(S, i, acc) { acc = acc || new Set(); S.refs[i].forEach(r => { if (r >= 0 && !acc.has(r)) { acc.add(r); ancetres(S, r, acc); } }); return acc; }
  function descendants(S, i) { const d = new Set([i]); let ch = true; while (ch) { ch = false; S.refs.forEach((rs, j) => { if (!d.has(j) && rs.some(r => d.has(r))) { d.add(j); ch = true; } }); } return d; }

  let S = null;
  const X0 = 30, LARG = 940;
  function geo() { const w = Math.min(46, LARG / S.T - 4); return { w: w, x: i => X0 + i * (w + 4) }; }

  function scene() {
    const g = geo(), w = g.w;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    const YA = 92, YT = 250, YB = 330, HB = 120;
    let rouge = new Set(), vert = new Set();
    if (choix >= 0 && mode === "erreur") rouge = descendants(S, choix);
    if (choix >= 0 && mode === "coupe") vert = ancetres(S, choix);
    if (choix >= 0 && mode === "ref") vert = new Set(S.refs[choix].filter(r => r >= 0));
    O.ecrire(c, "Ordre d’affichage (à l’écran)", X0, 22, { s: 14, c: "#a1a1a6" });
    // flèches de référence (arcs), animées
    c.lineWidth = 1.6;
    S.refs.forEach((rs, i) => rs.forEach((r, k) => {
      if (choix >= 0 && mode === "ref" && i !== choix) return;
      if (choix >= 0 && mode !== "ref" && !(rouge.has(i) || (vert.has(r) && (vert.has(i) || i === choix)))) return;
      const x1 = g.x(r < 0 ? S.T : r) + w / 2, x2 = g.x(i) + w / 2, h = Math.min(70, 16 + Math.abs(x2 - x1) * 0.28);
      const coul = rouge.has(i) && mode === "erreur" ? "#ff453a" : S.type[i] === "P" ? COUL.P : COUL.B;
      c.strokeStyle = coul; c.setLineDash(r < 0 ? [3, 4] : [6, 5]); c.lineDashOffset = O.reduit() ? 0 : -t * 22;
      c.beginPath(); c.moveTo(x1, YA - 4); c.quadraticCurveTo((x1 + x2) / 2, YA - 4 - h, x2, YA - 6); c.stroke();
      c.setLineDash([]); c.fillStyle = coul; c.beginPath(); c.arc(x2, YA - 6, 3, 0, 7); c.fill();
    }));
    // images en ordre d'affichage
    S.type.forEach((ty, i) => {
      const x = g.x(i), sombre = (mode === "erreur" && choix >= 0 && rouge.has(i)) ;
      c.globalAlpha = choix >= 0 && mode === "coupe" && !vert.has(i) && i !== choix ? 0.35 : 1;
      c.fillStyle = sombre ? "#ff453a" : COUL[ty]; O.rect(c, x, YA, w, 44, 7); c.fill();
      if (i === choix) { c.strokeStyle = "#fff"; c.lineWidth = 3; O.rect(c, x - 2, YA - 2, w + 4, 48, 8); c.stroke(); }
      if (vert.has(i) && mode !== "erreur") { c.strokeStyle = "#ffd60a"; c.lineWidth = 2.5; O.rect(c, x - 2, YA - 2, w + 4, 48, 8); c.stroke(); }
      O.ecrire(c, ty, x + w / 2, YA + 21, { s: w > 30 ? 17 : 13, a: "center", c: "#0b0c0e" });
      O.ecrire(c, i + 1, x + w / 2, YA + 38, { s: w > 30 ? 11 : 9, a: "center", c: "#0b0c0e", g: false });
      c.globalAlpha = 1;
      if (i % S.N === 0 && i) { c.strokeStyle = "rgba(255,255,255,.35)"; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(x - 2, YA - 4); c.lineTo(x - 2, YB + HB); c.stroke(); c.setLineDash([]); }
    });
    O.ecrire(c, "GOP " + (ferme ? "fermé" : "ouvert") + " : N = " + S.N + ", M = " + S.M, X0, YA + 66, { s: 13, c: "#a1a1a6", g: false });
    // ordre de transmission, avec une tête de lecture
    O.ecrire(c, "Ordre de transmission (dans le fichier) — la tête de lecture montre l’image que reçoit le décodeur", X0, YT - 26, { s: 14, c: "#a1a1a6" });
    const tete = O.reduit() ? -1 : Math.floor(t * 3) % (S.ordre.length + 4);
    S.ordre.forEach((i, j) => {
      const x = g.x(j);
      c.globalAlpha = tete >= 0 && j > tete ? 0.45 : 1;
      c.fillStyle = COUL[S.type[i]]; O.rect(c, x, YT - 12, w, 40, 7); c.fill();
      O.ecrire(c, S.type[i] + (i + 1), x + w / 2, YT + 13, { s: w > 34 ? 13 : 9, a: "center", c: "#0b0c0e" });
      c.globalAlpha = 1;
      if (j === tete) { c.strokeStyle = "#fff"; c.lineWidth = 2.5; O.rect(c, x - 2, YT - 14, w + 4, 44, 8); c.stroke(); }
    });
    S.enAttente.forEach((i, k) => { const x = g.x(S.ordre.length + k); c.strokeStyle = COUL.B; c.setLineDash([3, 3]); c.lineWidth = 1.5; O.rect(c, x, YT - 12, w, 40, 7); c.stroke(); c.setLineDash([]); O.ecrire(c, "B" + (i + 1), x + w / 2, YT + 13, { s: w > 34 ? 12 : 9, a: "center", c: COUL.B }); });
    // poids de chaque image
    O.ecrire(c, "Poids de chaque image (ordre d’affichage)", X0, YB - 10, { s: 14, c: "#a1a1a6" });
    S.taille.forEach((v, i) => { const x = g.x(i), h = v * HB; c.fillStyle = mode === "erreur" && rouge.has(i) ? "#ff453a" : COUL[S.type[i]]; c.fillRect(x + w * 0.15, YB + HB - h, w * 0.7, h); });
    const moy = S.taille.slice(0, S.N).reduce((a, v) => a + v, 0) / S.N;
    c.strokeStyle = "#ffd60a"; c.setLineDash([6, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(X0, YB + HB - moy * HB); c.lineTo(X0 + LARG, YB + HB - moy * HB); c.stroke(); c.setLineDash([]);
    O.ecrire(c, "moyenne = " + O.nb(moy * 100, 0) + " % d’une image I", X0 + LARG, YB + HB - moy * HB - 8, { s: 13, a: "right", c: "#ffd60a" });
    if (choix >= 0) {
      let txt = "";
      if (mode === "ref") txt = S.type[choix] === "I" ? "Image " + (choix + 1) + " (I) : codée seule, elle ne dépend d’aucune autre." : "Image " + (choix + 1) + " (" + S.type[choix] + ") : s’appuie sur " + S.refs[choix].map(r => r < 0 ? "une image après la fin du schéma" : "l’image " + (r + 1)).join(" et ") + ".";
      if (mode === "erreur") txt = "Erreur sur l’image " + (choix + 1) + " : " + rouge.size + " image" + (rouge.size > 1 ? "s" : "") + " touchée" + (rouge.size > 1 ? "s" : "") + " avant d’être réparées par une image I.";
      if (mode === "coupe") txt = "Pour afficher l’image " + (choix + 1) + ", le décodeur doit d’abord décoder " + vert.size + " autre" + (vert.size > 1 ? "s" : "") + " image" + (vert.size > 1 ? "s" : "") + (vert.size ? " (en jaune)" : " : coupe franche") + ".";
      O.ecrire(c, txt, X0, Hc - 14, { s: 14, c: "#e5e5ea" });
    } else O.ecrire(c, "Touchez une image de la première ligne.", X0, Hc - 14, { s: 14, c: "#8e8e93", g: false });
  }

  function dessiner() {
    S = structure();
    rN.parentElement.querySelector("output").textContent = S.N;
    rM.parentElement.querySelector("output").textContent = S.M;
    if (choix >= S.T) choix = -1;
    const t1 = S.type.slice(0, S.N), nI = t1.filter(x => x === "I").length, nP = t1.filter(x => x === "P").length, nB = t1.filter(x => x === "B").length;
    const moy = S.taille.slice(0, S.N).reduce((a, v) => a + v, 0) / S.N;
    Application.afficher("#m3b-struct", S.N > 10 ? t1.slice(0, 9).join("") + "…" : t1.join(""));
    Application.afficher("#m3b-ipb", nI + " / " + nP + " / " + nB);
    Application.afficher("#m3b-duree", O.nb(S.N / 25, 2) + " s");
    Application.afficher("#m3b-gain", O.nb(moy * 100, 0) + " %");
    const retard = S.M - 1;
    O.note("m3b-msg", S.N === 1 ? "note" : nB && retard ? "note ok" : "note ok",
      S.N === 1 ? "<b>Tout-intra</b> : chaque image est une I, indépendante. On peut couper n’importe où, une erreur ne touche qu’une image… mais le débit est le plus élevé (100 %)." :
      "GOP de <b>" + S.N + " images</b> (" + O.nb(S.N / 25, 2) + " s à 25 i/s) : " + nP + " P et " + nB + " B. Le débit moyen tombe à <b>" + O.nb(moy * 100, 0) + " %</b> de celui du tout-intra." + (nB ? " Les images B obligent à envoyer l’ancrage suivant <b>en avance</b> : regardez l’ordre de transmission (retard de " + retard + " image" + (retard > 1 ? "s" : "") + ")." : " Sans image B, l’ordre de transmission est celui de l’affichage : latence minimale (visio).") + (!ferme && nB ? " GOP ouvert : les dernières B s’appuient sur l’image I du GOP <b>suivant</b>." : ""));
    scene();
  }

  cv.addEventListener("click", e => {
    const p = O.clic(cv, e), g = geo();
    if (p[1] > 80 && p[1] < 145) { const i = Math.floor((p[0] - X0) / (g.w + 4)); choix = i >= 0 && i < S.T && i !== choix ? i : -1; scene(); }
  });
  cv.style.cursor = "pointer";
  rN.addEventListener("input", dessiner); rM.addEventListener("input", dessiner);
  Application.segment("#m3b-type", [["ferme", "Fermé"], ["ouvert", "Ouvert"]], "ferme", v => { ferme = v === "ferme"; dessiner(); });
  Application.segment("#m3b-mode", [["ref", "Références"], ["erreur", "Erreur"], ["coupe", "Coupe"]], mode, v => { mode = v; scene(); });
  O.situations("m3b-situ", s => {
    const R = { intra: [1, 1], xdcam: [12, 3], tnt: [24, 3], visio: [30, 1] }[s];
    rN.value = R[0]; rM.value = R[1]; O.curseur(rN, R[0]); O.curseur(rM, R[1]);
  });
  const anim = O.boucle(cv, dt => { t += dt; scene(); });
  O.boutonPause("m3b-pause", anim, () => scene());
  dessiner();
});

/* ==========================================================================
   MODULE 3 — LABO 3 : DES MACROBLOCS AUX ARBRES DE CODAGE
   ========================================================================== */
labo(3, function () {
  const cv = O.el("m3c-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rS = O.el("m3c-s");
  const IW = 640, IH = 384, im = IMG.pixels(IW, IH), Y = IMG.luma(im.d);
  // Intégrales de Y et Y² : variance de n'importe quel rectangle en 4 lectures
  const S1 = new Float64Array((IW + 1) * (IH + 1)), S2 = new Float64Array((IW + 1) * (IH + 1));
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const v = Y[y * IW + x], k = (y + 1) * (IW + 1) + x + 1; S1[k] = v + S1[k - 1] + S1[k - IW - 1] - S1[k - IW - 2]; S2[k] = v * v + S2[k - 1] + S2[k - IW - 1] - S2[k - IW - 2]; }
  function variance(x, y, w, h) {
    const a = y * (IW + 1) + x, b = a + w, cc = (y + h) * (IW + 1) + x, d = cc + w, n = w * h;
    const s = S1[d] - S1[b] - S1[cc] + S1[a], q = S2[d] - S2[b] - S2[cc] + S2[a];
    return q / n - (s / n) * (s / n);
  }
  const NORMES = {
    mpeg2: { nom: "MPEG-2", an: 1995, debit: 16, max: 16, min: 16 },
    h264: { nom: "H.264 / AVC", an: 2003, debit: 8, max: 16, min: 4 },
    hevc: { nom: "HEVC / H.265", an: 2013, debit: 4, max: 64, min: 8 },
    vvc: { nom: "VVC / H.266", an: 2020, debit: 2, max: 128, min: 4 }
  };
  let norme = "hevc", blocs = [], t = 0;
  const COULT = { 128: "#bf5af2", 64: "#5e5ce6", 32: "#64d2ff", 16: "#30d158", 8: "#ffd60a", 4: "#ff9f0a" };
  function decouper() {
    const N = NORMES[norme], seuil = 30 * Math.pow(1.75, 10 - +rS.value);
    blocs = [];
    function quad(x, y, s, prof) {
      if (x >= IW || y >= IH) return;
      const w = Math.min(s, IW - x), h = Math.min(s, IH - y);
      if (s > N.min && (variance(x, y, w, h) > seuil || w < s || h < s)) { const m = s / 2; [[0, 0], [m, 0], [0, m], [m, m]].forEach(o => quad(x + o[0], y + o[1], m, prof + 1)); return; }
      // VVC : découpage binaire supplémentaire, dans le sens des variations
      if (norme === "vvc" && s >= 8 && variance(x, y, w, h) > seuil * 0.6) {
        const vh = Math.abs(variance(x, y, w, h / 2) - variance(x, y + h / 2, w, h / 2)), vv = Math.abs(variance(x, y, w / 2, h) - variance(x + w / 2, y, w / 2, h));
        if (vh > vv) { blocs.push([x, y, w, h / 2, s, prof + 1]); blocs.push([x, y + h / 2, w, h / 2, s, prof + 1]); }
        else { blocs.push([x, y, w / 2, h, s, prof + 1]); blocs.push([x + w / 2, y, w / 2, h, s, prof + 1]); }
        return;
      }
      blocs.push([x, y, w, h, s, prof]);
    }
    for (let y = 0; y < IH; y += N.max) for (let x = 0; x < IW; x += N.max) quad(x, y, N.max, 0);
  }
  function scene() {
    const N = NORMES[norme];
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    c.drawImage(im.cv, 20, 18);
    const prof = O.reduit() ? 9 : Math.floor(t * 2.2);
    blocs.forEach(b => {
      if (b[5] > prof) return;
      c.strokeStyle = COULT[Math.min(128, Math.max(4, Math.max(b[2], b[3])))] || "#fff"; c.lineWidth = b[2] >= 32 ? 1.6 : 1;
      c.strokeRect(20 + b[0] + 0.5, 18 + b[1] + 0.5, b[2] - 1, b[3] - 1);
    });
    // légende et générations
    const X = 680;
    O.ecrire(c, "Taille des blocs", X, 34, { s: 14, c: "#a1a1a6" });
    [128, 64, 32, 16, 8, 4].forEach((s, i) => { c.strokeStyle = COULT[s]; c.lineWidth = 2; c.strokeRect(X + (i % 3) * 100, 48 + Math.floor(i / 3) * 26, 16, 16); O.ecrire(c, s + " px", X + 24 + (i % 3) * 100, 61 + Math.floor(i / 3) * 26, { s: 13 }); });
    O.ecrire(c, "Débit HD pour une même qualité", X, 136, { s: 14, c: "#a1a1a6" });
    Object.keys(NORMES).forEach((k, i) => {
      const n = NORMES[k], y = 152 + i * 56, w = n.debit * 15, on = k === norme;
      c.globalAlpha = on ? 1 : 0.4;
      O.ecrire(c, n.nom + " · " + n.an, X, y + 14, { s: 13 });
      c.fillStyle = on ? "#64d2ff" : "#8e8e93"; O.rect(c, X, y + 22, w, 18, 5); c.fill();
      O.ecrire(c, "≈ " + n.debit + " Mbit/s", X + w + 8, y + 36, { s: 13 });
      c.globalAlpha = 1;
    });
    O.ecrire(c, "AV1 (2018, hors MPEG) : ≈ 3 Mbit/s", X, 392, { s: 12, c: "#8e8e93", g: false });
  }
  function dessiner() {
    rS.parentElement.querySelector("output").textContent = +rS.value;
    decouper();
    const N = NORMES[norme], tailles = blocs.map(b => b[2] * b[3]), moy = Math.sqrt(tailles.reduce((a, v) => a + v, 0) / tailles.length);
    Application.afficher("#m3c-nom", N.nom);
    Application.afficher("#m3c-n", O.nb(blocs.length, 0));
    Application.afficher("#m3c-taille", N.max === N.min ? N.max + " × " + N.max : N.max + " → " + N.min);
    Application.afficher("#m3c-debit", "≈ " + N.debit + " Mbit/s");
    const txt = {
      mpeg2: "MPEG-2 découpe <b>toute</b> l’image en macroblocs de 16 × 16, qu’il s’agisse du ciel uni ou du feuillage : " + blocs.length + " blocs, chacun avec ses informations. Dans le ciel, c’est du gaspillage ; sur les détails, les blocs sont trop gros.",
      h264: "H.264 garde le macrobloc de 16 × 16 mais peut le <b>redécouper</b> jusqu’à 4 × 4 sur les détails (bords du toit, texte, feuillage). Les zones calmes restent en 16 × 16.",
      hevc: "HEVC part de grandes unités de <b>64 × 64</b> (CTU) découpées en arbre : le ciel est décrit par quelques grands blocs, le feuillage par des petits. Taille moyenne : ≈ " + O.nb(moy, 0) + " px de côté. Environ <b>deux fois moins de débit</b> que H.264.",
      vvc: "VVC va jusqu’à <b>128 × 128</b> et ajoute des découpes <b>rectangulaires</b> (binaires et ternaires) qui suivent mieux les bords. Encore ≈ deux fois moins de débit que HEVC, mais un codage bien plus lourd."
    };
    O.note("m3c-msg", "note ok", txt[norme]);
    t = 0;
    scene();
  }
  rS.addEventListener("input", dessiner);
  Application.segment("#m3c-codec", [["mpeg2", "MPEG-2"], ["h264", "H.264"], ["hevc", "HEVC"], ["vvc", "VVC"]], norme, v => { norme = v; dessiner(); });
  O.el("m3c-rejouer").addEventListener("click", () => { t = 0; scene(); });
  O.boucle(cv, dt => { if (t < 6) { t += dt; scene(); } });
  dessiner();
});

/* ==========================================================================
   MODULE 4 — LABO 1 : CONSTRUIRE UN CODE DE HUFFMAN
   ========================================================================== */
labo(4, function () {
  const cv = O.el("m4a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const champ = O.el("m4a-txt"), bJouer = O.el("m4a-jouer");
  const PAL = ["#64d2ff", "#ff9f0a", "#30d158", "#bf5af2", "#ff375f", "#ffd60a", "#0a84ff", "#ac8e68", "#5e5ce6", "#66d4cf"];
  let msg = "", feuilles = [], fusions = [], racine = null, etape = 0, jeu = false, tJeu = 0, prof = 1;

  function construire() {
    msg = (champ.value || "A").toUpperCase().slice(0, 40).replace(/ /g, "␣");
    const n = {}; for (const ch of msg) n[ch] = (n[ch] || 0) + 1;
    feuilles = Object.keys(n).map((s, i) => ({ s: s, n: n[s], f: true })).sort((a, b) => b.n - a.n || (a.s < b.s ? -1 : 1));
    feuilles.forEach((f, i) => { f.id = i; f.coul = PAL[i % PAL.length]; });
    let foret = feuilles.slice(), id = feuilles.length;
    fusions = [];
    while (foret.length > 1) {
      foret.sort((a, b) => a.n - b.n || a.id - b.id);
      const a = foret[0], b = foret[1], nd = { id: id++, n: a.n + b.n, g: a, d: b, f: false };
      fusions.push(nd); foret = foret.slice(2).concat(nd);
    }
    racine = foret[0];
    const coder = (nd, code) => { if (nd.f) nd.code = code || "0"; else { coder(nd.g, code + "0"); coder(nd.d, code + "1"); } };
    coder(racine, "");
    let ix = 0; prof = 0;
    const placer = (nd, p) => { nd.p = p; prof = Math.max(prof, p); if (nd.f) nd.x = ix++; else { placer(nd.g, p + 1); placer(nd.d, p + 1); nd.x = (nd.g.x + nd.d.x) / 2; } };
    placer(racine, 0);
    etape = 0;
  }

  function dessiner() {
    const K = feuilles.length, N = msg.length, fini = etape >= fusions.length;
    const fixe = N * Math.max(1, Math.ceil(Math.log2(K))), huff = feuilles.reduce((a, f) => a + f.n * f.code.length, 0);
    const H = feuilles.reduce((a, f) => a - f.n / N * Math.log2(f.n / N), 0);
    Application.afficher("#m4a-fixe", fixe + " bits");
    Application.afficher("#m4a-huff", fini ? huff + " bits" : "…");
    Application.afficher("#m4a-ent", O.nb(N * H, 1) + " bits");
    Application.afficher("#m4a-bps", fini ? O.nb(huff / N, 2) : "…");

    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    const sx = 920 / K, X = nd => 40 + sx / 2 + nd.x * sx, dy = Math.min(58, 230 / Math.max(1, prof)), Y = nd => 48 + nd.p * dy;
    const r = Math.max(10, Math.min(19, sx / 2 - 3));
    const visibles = new Set(fusions.slice(0, etape)), der = fusions[etape - 1];
    // arêtes
    visibles.forEach(nd => [[nd.g, "0"], [nd.d, "1"]].forEach(e => {
      c.strokeStyle = nd === der ? "#ffd60a" : "#8e8e93"; c.lineWidth = nd === der ? 2.5 : 1.5;
      c.beginPath(); c.moveTo(X(nd), Y(nd)); c.lineTo(X(e[0]), Y(e[0])); c.stroke();
      O.ecrire(c, e[1], (X(nd) + X(e[0])) / 2 + (e[1] === "0" ? -9 : 9), (Y(nd) + Y(e[0])) / 2, { s: 14, a: "center", m: true, c: "#ff9f0a" });
    }));
    // nœuds internes visibles
    visibles.forEach(nd => {
      c.fillStyle = nd === der ? "rgba(255,214,10,.25)" : "rgba(255,255,255,.1)"; c.strokeStyle = nd === der ? "#ffd60a" : "#8e8e93"; c.lineWidth = 1.5;
      c.beginPath(); c.arc(X(nd), Y(nd), r * 0.8, 0, 7); c.fill(); c.stroke();
      O.ecrire(c, nd.n, X(nd), Y(nd) + 5, { s: 13, a: "center" });
    });
    // feuilles
    feuilles.forEach(f => {
      const enjeu = der && (der.g === f || der.d === f);
      c.fillStyle = f.coul; c.beginPath(); c.arc(X(f), Y(f), r, 0, 7); c.fill();
      if (enjeu) { c.strokeStyle = "#ffd60a"; c.lineWidth = 3; c.stroke(); }
      O.ecrire(c, f.s, X(f), Y(f) + 5, { s: r > 14 ? 16 : 13, a: "center", c: "#0b0c0e" });
      O.ecrire(c, "×" + f.n, X(f), Y(f) + r + 15, { s: 12, a: "center", c: "#a1a1a6", g: false });
    });
    if (der && (!der.g.f || !der.d.f)) [der.g, der.d].forEach(nd => { if (!nd.f) { c.strokeStyle = "#ffd60a"; c.lineWidth = 3; c.beginPath(); c.arc(X(nd), Y(nd), r * 0.8, 0, 7); c.stroke(); } });
    // explication de l'étape
    const yE = 318;
    let txt;
    if (!etape) txt = K > 1 ? "Départ : " + K + " symboles, classés par fréquence. Cliquez sur « Étape suivante »." : "Un seul symbole : un bit suffit (0).";
    else { const nom = nd => nd.f ? nd.s + " (" + nd.n + ")" : "nœud (" + nd.n + ")"; txt = "Étape " + etape + " / " + fusions.length + " : on réunit les deux plus petits, " + nom(der.g) + " + " + nom(der.d) + " → nœud de poids " + der.n + "."; }
    O.ecrire(c, txt, 40, yE, { s: 15, c: "#ffd60a" });
    // table des codes
    const yT = 350;
    O.ecrire(c, fini ? "Codes obtenus (chemin depuis le sommet : 0 à gauche, 1 à droite)" : "Les codes apparaîtront quand l’arbre sera terminé", 40, yT, { s: 13, c: "#a1a1a6" });
    if (fini) {
      const cols = Math.min(5, K), lw = 920 / cols;
      feuilles.forEach((f, i) => {
        const x = 40 + (i % cols) * lw, y = yT + 24 + Math.floor(i / cols) * 22;
        c.fillStyle = f.coul; c.fillRect(x, y - 12, 12, 12);
        O.ecrire(c, f.s + " ×" + f.n + " → " + f.code + " (" + f.code.length + " bit" + (f.code.length > 1 ? "s" : "") + ")", x + 18, y, { s: 13, m: true, g: false });
      });
      // message codé
      const yM = yT + 30 + Math.ceil(K / cols) * 22 + 14;
      O.ecrire(c, "Message codé (" + huff + " bits au lieu de " + fixe + " en longueur fixe) :", 40, yM, { s: 13, c: "#a1a1a6" });
      let x = 40, y = yM + 24;
      c.font = O.police(14, true, true);
      for (const ch of msg) {
        const f = feuilles.find(z => z.s === ch), w = c.measureText(f.code).width + 6;
        if (x + w > 960) { x = 40; y += 22; }
        if (y > Hc - 4) break;
        c.fillStyle = f.coul; c.fillText(f.code, x, y); x += w;
      }
    }
    O.note("m4a-msg", fini ? (huff < fixe ? "note ok" : "note") : "note",
      !fini ? "Le principe : à chaque étape, réunir les <b>deux poids les plus faibles</b>. Les symboles rares se retrouvent tout en bas de l’arbre (codes longs), les fréquents près du sommet (codes courts)." :
      K === 1 ? "Un seul symbole : Huffman doit quand même dépenser <b>1 bit par symbole</b>, alors que l’entropie vaut 0. Le codage arithmétique (labo suivant) fait bien mieux." :
      "Huffman : <b>" + huff + " bits</b> (" + O.nb(huff / N, 2) + " bit/symbole), contre " + fixe + " en longueur fixe et une limite théorique de " + O.nb(N * H, 1) + " bits. " + (huff - N * H < 0.03 * N ? "Le code est presque parfait." : "L’écart avec l’entropie vient de ce que chaque code a un nombre <b>entier</b> de bits.") + (feuilles[0].n / N > 0.7 ? " Avec un symbole très fréquent, Huffman ne peut pas descendre sous 1 bit : c’est là que le CABAC gagne." : ""));
  }

  function pas() { if (etape < fusions.length) { etape++; dessiner(); } else { jeu = false; bJouer.textContent = "▶ Construire"; } }
  champ.addEventListener("input", () => { construire(); dessiner(); });
  O.el("m4a-pas").addEventListener("click", pas);
  O.el("m4a-zero").addEventListener("click", () => { etape = 0; jeu = false; bJouer.textContent = "▶ Construire"; dessiner(); });
  O.situations("m4a-situ", s => { champ.value = s; construire(); dessiner(); });
  O.boucle(cv, dt => { if (!jeu) return; tJeu += dt; if (tJeu > 0.7) { tJeu = 0; pas(); } });
  bJouer.addEventListener("click", () => {
    if (O.reduit()) { etape = fusions.length; dessiner(); return; }
    if (etape >= fusions.length) etape = 0;
    jeu = !jeu; tJeu = 0.7; bJouer.textContent = jeu ? "⏸ Pause" : "▶ Construire"; dessiner();
  });
  construire();
  dessiner();
});

/* ==========================================================================
   MODULE 4 — LABO 2 : LE CŒUR DU CABAC
   Binarisation (code unaire), modèles de contexte adaptatifs, codeur
   arithmétique binaire avec renormalisation (le principe du CABAC ; le vrai
   CABAC travaille sur des entiers et une table de 64 états de probabilité).
   ========================================================================== */
labo(4, function () {
  const cv = O.el("m4b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rP = O.el("m4b-p"), rVit = O.el("m4b-vit");
  const PMIN = 0.01875, ALPHA = 0.05, CMAX = 6;
  let source = "niveaux", modele = "ctx", E = null, acc = 0, t = 0;

  function reinit() {
    E = { low: 0, high: 1, pend: 0, bits: [], nBits: 0, nBins: 0, ideal: 0, ctx: {}, hist: [], courbe: [{ n: 0, b: 0, i: 0 }], file: [], valeur: null, chaine: "", prev: 0, der: null };
  }
  function nomCtx(x) {
    if (modele !== "ctx") return "unique";
    if (source === "niveaux") return "bin n° " + Math.min(x.idx, 2) + (x.idx >= 2 ? " et +" : "");
    return "après un " + E.prev;
  }
  function prochainBin() {
    const p = +rP.value / 100;
    if (source === "niveaux") {
      if (!E.file.length) {
        let v = 0;
        if (Math.random() >= p) { v = 1; while (v < CMAX && Math.random() < 0.5) v++; }
        const bins = []; for (let i = 0; i < v; i++) bins.push(1); if (v < CMAX) bins.push(0);
        E.valeur = v; E.chaine = bins.join(""); E.file = bins.map((b, i) => ({ b: b, idx: i }));
      }
      const x = E.file.shift();
      return { b: x.b, idx: x.idx, p0vrai: x.idx === 0 ? p : 0.5, ctx: nomCtx(x) };
    }
    E.valeur = null; E.chaine = "";
    if (source === "drapeaux") { const b = Math.random() < p ? 0 : 1; return { b: b, idx: 0, p0vrai: p, ctx: nomCtx({}) }; }
    const b = Math.random() < p ? E.prev : 1 - E.prev;
    return { b: b, idx: 0, p0vrai: E.prev === 0 ? p : 1 - p, ctx: nomCtx({}) };
  }
  function emettre(bit) { E.bits.push(bit); E.nBits++; for (; E.pend > 0; E.pend--) { E.bits.push(1 - bit); E.nBits++; } if (E.bits.length > 160) E.bits.splice(0, E.bits.length - 160); }
  function coder() {
    const x = prochainBin();
    const p0 = modele === "fixe" ? 0.5 : (E.ctx[x.ctx] === undefined ? 0.5 : E.ctx[x.ctx]);
    const avant = [E.low, E.high], mid = E.low + (E.high - E.low) * p0;
    if (x.b === 0) E.high = mid; else E.low = mid;
    const choisi = [E.low, E.high], n0 = E.nBits;
    let zooms = 0;
    for (;;) {
      if (E.high <= 0.5) { emettre(0); E.low *= 2; E.high *= 2; }
      else if (E.low >= 0.5) { emettre(1); E.low = 2 * E.low - 1; E.high = 2 * E.high - 1; }
      else if (E.low >= 0.25 && E.high <= 0.75) { E.pend++; E.low = 2 * E.low - 0.5; E.high = 2 * E.high - 0.5; }
      else break;
      zooms++;
    }
    if (modele !== "fixe") E.ctx[x.ctx] = O.borne(p0 + ALPHA * ((x.b === 0 ? 1 : 0) - p0), PMIN, 1 - PMIN);
    E.ideal += -Math.log2(x.b === 0 ? x.p0vrai : 1 - x.p0vrai);
    E.nBins++; E.prev = x.b;
    E.hist.push({ b: x.b, ctx: x.ctx }); if (E.hist.length > 60) E.hist.shift();
    E.courbe.push({ n: E.nBins, b: E.nBits + E.pend, i: E.ideal }); if (E.courbe.length > 2000) E.courbe.splice(1, 1);
    E.der = { b: x.b, idx: x.idx, ctx: x.ctx, p0: p0, avant: avant, choisi: choisi, apres: [E.low, E.high], zooms: zooms, emis: E.nBits - n0, valeur: E.valeur, chaine: E.chaine };
  }

  function scene(phase) {
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    const d = E.der;
    // 1. la chaîne du CABAC
    const boites = [["Valeur", d && d.valeur !== null ? String(d.valeur) : "—"], ["1. Binarisation", d ? (d.chaine || String(d.b)) : "—"], ["2. Contexte", d ? d.ctx : "—"], ["3. Codeur arithm.", d ? "p(0) = " + O.nb(d.p0, 2) : "—"], ["Bits émis", d ? (d.emis ? "+" + d.emis : "0 (en attente)") : "—"]];
    boites.forEach((b, i) => {
      const x = 20 + i * 194;
      c.fillStyle = i ? "rgba(191,90,242,.13)" : "rgba(255,255,255,.06)"; O.rect(c, x, 14, 172, 66, 12); c.fill();
      c.strokeStyle = i === 4 ? "#ff9f0a" : i ? "#bf5af2" : "rgba(255,255,255,.2)"; c.lineWidth = 1.5; c.stroke();
      O.ecrire(c, b[0], x + 12, 36, { s: 13, c: "#a1a1a6" });
      if (i === 1 && d && d.chaine) {
        c.font = O.police(19, true, true); let xx = x + 12;
        for (let k = 0; k < d.chaine.length; k++) { c.fillStyle = k === d.idx ? "#ffd60a" : "#8e8e93"; c.fillText(d.chaine[k], xx, 66); xx += 14; }
      } else O.ecrire(c, b[1], x + 12, 66, { s: i === 2 ? 15 : 19, m: i !== 2, c: i === 4 ? "#ff9f0a" : "#fff" });
      if (i < 4) O.fleche(c, x + 174, 47, x + 192, 47, "#8e8e93", 1.6);
    });
    // 2. l'intervalle
    const X0 = 40, LG = 920, Y0 = 130;
    O.ecrire(c, "L’intervalle du codeur arithmétique (tout le message tient dans cet intervalle)", X0, Y0 - 14, { s: 13, c: "#a1a1a6" });
    c.fillStyle = "rgba(255,255,255,.05)"; c.fillRect(X0, Y0, LG, 46);
    [0, 0.25, 0.5, 0.75, 1].forEach(v => { O.ecrire(c, O.nb(v, 2), X0 + v * LG, Y0 + 64, { s: 12, a: "center", c: "#8e8e93" }); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(X0 + v * LG - 0.5, Y0 + 46, 1, 6); });
    if (d) {
      const f = phase === undefined ? 1 : phase;
      let lo, hi;
      if (f < 0.35) { lo = d.avant[0]; hi = d.avant[1]; }
      else if (f < 0.6) { const g = (f - 0.35) / 0.25; lo = d.avant[0] + (d.choisi[0] - d.avant[0]) * g; hi = d.avant[1] + (d.choisi[1] - d.avant[1]) * g; }
      else { const g = Math.min(1, (f - 0.6) / 0.35); lo = d.choisi[0] + (d.apres[0] - d.choisi[0]) * g; hi = d.choisi[1] + (d.apres[1] - d.choisi[1]) * g; }
      const mid = lo + (hi - lo) * (f < 0.35 ? d.p0 : 1);
      if (f < 0.35) {
        c.fillStyle = "rgba(100,210,255,.75)"; c.fillRect(X0 + lo * LG, Y0, (mid - lo) * LG, 46);
        c.fillStyle = "rgba(255,159,10,.75)"; c.fillRect(X0 + mid * LG, Y0, (hi - mid) * LG, 46);
        if ((mid - lo) * LG > 70) O.ecrire(c, "0 : " + O.nb(d.p0 * 100, 0) + " %", X0 + (lo + mid) / 2 * LG, Y0 + 29, { s: 14, a: "center", c: "#0b0c0e" });
        if ((hi - mid) * LG > 50) O.ecrire(c, "1 : " + O.nb((1 - d.p0) * 100, 0) + " %", X0 + (mid + hi) / 2 * LG, Y0 + 29, { s: 14, a: "center", c: "#0b0c0e" });
        O.ecrire(c, "Le bin à coder vaut « " + d.b + " » : on garde sa part de l’intervalle", X0, Y0 + 92, { s: 14, c: "#ffd60a" });
      } else {
        c.fillStyle = d.b ? "rgba(255,159,10,.85)" : "rgba(100,210,255,.85)"; c.fillRect(X0 + lo * LG, Y0, Math.max(2, (hi - lo) * LG), 46);
        O.ecrire(c, f < 0.6 ? "On garde la part du « " + d.b + " »" : d.zooms ? "Renormalisation : l’intervalle est zoomé × 2, " + d.zooms + " fois → " + d.zooms + " bit" + (d.zooms > 1 ? "s" : "") + " (émis ou en attente)" : "Intervalle encore assez grand : aucun bit à émettre pour ce bin !", X0, Y0 + 92, { s: 14, c: d.zooms ? "#ff9f0a" : "#30d158" });
      }
    }
    // 3. historique des bins et bits émis
    const YH = 250;
    O.ecrire(c, "Derniers bins codés", X0, YH, { s: 13, c: "#a1a1a6" });
    E.hist.forEach((h, i) => { c.fillStyle = h.b ? "#ff9f0a" : "#64d2ff"; c.fillRect(X0 + i * 15, YH + 8, 13, 20); O.ecrire(c, h.b, X0 + i * 15 + 6.5, YH + 23, { s: 11, a: "center", c: "#0b0c0e", m: true }); });
    O.ecrire(c, "Bits émis par le codeur", X0, YH + 52, { s: 13, c: "#a1a1a6" });
    const vb = E.bits.slice(-90);
    c.font = O.police(14, true, true); c.fillStyle = "#ff9f0a"; c.textAlign = "left"; c.fillText(vb.join(""), X0, YH + 76);
    // modèles de contexte
    const ks = Object.keys(E.ctx);
    if (ks.length) {
      O.ecrire(c, "Probabilité p(0) apprise par chaque contexte", 600, YH + 52, { s: 13, c: "#a1a1a6" });
      ks.slice(0, 3).forEach((k, i) => { const y = YH + 64 + i * 20, p = E.ctx[k]; O.ecrire(c, k, 600, y + 11, { s: 12, g: false }); c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(730, y, 180, 13); c.fillStyle = "#64d2ff"; c.fillRect(730, y, 180 * p, 13); O.ecrire(c, O.nb(p * 100, 0) + " %", 916, y + 11, { s: 12, m: true }); });
    }
    // 4. courbe des bits cumulés
    const GX = 60, GY = 360, GW = 900, GH = 170, n = Math.max(50, E.nBins), ymax = Math.max(50, n);
    c.fillStyle = "rgba(255,255,255,.04)"; c.fillRect(GX, GY, GW, GH);
    O.ecrire(c, "Bits cumulés en fonction du nombre de bins", GX, GY - 10, { s: 13, c: "#a1a1a6" });
    const trace = (f, coul, tir) => { c.strokeStyle = coul; c.lineWidth = 2; c.setLineDash(tir || []); c.beginPath(); E.courbe.forEach((p, i) => { const x = GX + p.n / n * GW, y = GY + GH - f(p) / ymax * GH; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]); };
    trace(p => p.n, "#8e8e93", [6, 5]); trace(p => p.i, "#30d158", [3, 4]); trace(p => p.b, "#bf5af2");
    [["1 bit par bin (aucune compression)", "#8e8e93"], ["Codeur arithmétique (" + (modele === "fixe" ? "sans modèle" : modele === "ctx" ? "avec contextes" : "1 contexte adaptatif") + ")", "#bf5af2"], ["Entropie de la source (limite)", "#30d158"]].forEach((l, i) => { c.fillStyle = l[1]; c.fillRect(GX + 12, GY + 12 + i * 20, 14, 4); O.ecrire(c, l[0], GX + 32, GY + 18 + i * 20, { s: 12, g: false }); });
    O.ecrire(c, E.nBins + " bins", GX + GW, GY + GH + 18, { s: 12, a: "right", c: "#8e8e93" });
  }

  function valeurs() {
    rP.parentElement.querySelector("output").textContent = rP.value + " %";
    rVit.parentElement.querySelector("output").textContent = rVit.value + " /s";
    const nb = E.nBins, bits = E.nBits + E.pend;
    Application.afficher("#m4b-bins", nb);
    Application.afficher("#m4b-bits", bits);
    Application.afficher("#m4b-bpb", nb ? O.nb(bits / nb, 2) : "—");
    Application.afficher("#m4b-h", nb ? O.nb(E.ideal / nb, 2) + " bit/bin" : "—");
    const bpb = nb ? bits / nb : 1, H = nb ? E.ideal / nb : 1;
    let cls = "note", txt;
    if (modele === "fixe") { cls = "note warn"; txt = "Sans modèle, chaque bin a une probabilité de 50 % : il coûte exactement <b>1 bit</b>. Aucun gain, même si la source est très prévisible. Choisissez un modèle adaptatif."; }
    else if (source === "paquets" && modele === "un") { cls = "note warn"; txt = "Les bins arrivent par <b>paquets</b> (beaucoup de 0, puis beaucoup de 1). Sur l’ensemble, il y a autant de 0 que de 1 : un seul contexte estime p(0) ≈ 50 % et ne gagne presque rien (" + O.nb(bpb, 2) + " bit/bin). Passez en mode <b>contextes</b> : la probabilité dépendra du bin précédent."; }
    else if (source === "paquets") { cls = "note ok"; txt = "Avec le <b>bin précédent</b> comme contexte, le codeur a compris qu’un 0 suit presque toujours un 0 : " + O.nb(bpb, 2) + " bit/bin, proche de la limite (" + O.nb(H, 2) + "). C’est l’idée du « Context-Adaptive » du CABAC."; }
    else if (source === "niveaux") { cls = "note ok"; txt = "Chaque valeur est <b>binarisée</b> en code unaire (0 → « 0 », 2 → « 110 »…). Le premier bin (« la valeur est-elle nulle ? ») est très prévisible ; les suivants beaucoup moins. " + (modele === "ctx" ? "Un contexte par position de bin s’adapte à chacun : " : "Avec un seul contexte, ces statistiques se mélangent : ") + O.nb(bpb, 2) + " bit/bin pour une limite de " + O.nb(H, 2) + "."; }
    else { cls = "note ok"; txt = "Le modèle a appris p(0) ≈ " + O.nb(+rP.value, 0) + " % : un « 0 » très probable ne réduit presque pas l’intervalle, et plusieurs bins tiennent dans <b>un seul bit</b>. Résultat : " + O.nb(bpb, 2) + " bit/bin, tout près de la limite (" + O.nb(H, 2) + "). Huffman ne pourrait pas descendre sous 1 bit."; }
    if (nb < 20) { cls = "note"; txt = "Lancez le codage : les premiers bins coûtent cher, le temps que les modèles apprennent les probabilités."; }
    O.note("m4b-msg", cls, txt);
  }

  let phase = 1;
  const anim = O.boucle(cv, dt => {
    const v = +rVit.value;
    if (v <= 10) { phase += dt * v; if (phase >= 1) { coder(); phase = 0; valeurs(); } scene(phase); }
    else { acc += dt * v; let k = 0; while (acc >= 1 && k < 50) { coder(); acc -= 1; k++; } if (k) valeurs(); scene(); }
  });
  O.boutonPause("m4b-pause", anim, () => { phase = 1; scene(); });
  O.el("m4b-pas").addEventListener("click", () => { anim.pause(false); O.el("m4b-pause").textContent = "▶ Lecture"; coder(); valeurs(); phase = 1; scene(); });
  O.el("m4b-zero").addEventListener("click", () => { reinit(); valeurs(); scene(); });
  [rP, rVit].forEach(r => r.addEventListener("input", valeurs));
  rP.addEventListener("change", () => { reinit(); valeurs(); scene(); });
  Application.segment("#m4b-src", [["niveaux", "Niveaux (unaire)"], ["drapeaux", "Drapeaux 0/1"], ["paquets", "Par paquets"]], source, v => { source = v; reinit(); valeurs(); scene(); });
  Application.segment("#m4b-mod", [["fixe", "Sans modèle"], ["un", "1 contexte"], ["ctx", "Contextes"]], modele, v => { modele = v; reinit(); valeurs(); scene(); });
  reinit();
  if (O.reduit()) { for (let i = 0; i < 300; i++) coder(); }
  valeurs(); scene();
});

/* ==========================================================================
   MODULE 5 — LABO 1 : CBR, VBR ET QUALITÉ CONSTANTE
   Modèle débit-qualité : débit nécessaire = complexité × 12 × 2^(−(QP − 26)/6)
   (+6 QP = pas de quantification doublé = débit à peu près divisé par 2).
   ========================================================================== */
labo(5, function () {
  const cv = O.el("m5a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rD = O.el("m5a-d"), rMax = O.el("m5a-dmax"), rQ = O.el("m5a-qpc");
  const PLANS = [[0, 10, "Interview", 0.35, "#5e5ce6"], [10, 18, "Ville", 0.65, "#64d2ff"], [18, 28, "Feuillage au vent", 1.3, "#30d158"], [28, 31, "Fondu", 0.06, "#48484a"], [31, 42, "Confettis", 1.8, "#ff375f"], [42, 52, "Dialogue", 0.45, "#bf5af2"], [52, 60, "Générique", 0.18, "#8e8e93"]];
  const N = 240, DT = 0.25, K = 12, QMIN = 12, QMAX = 51;
  const Rq = (cx, qp) => cx * K * Math.pow(2, -(qp - 26) / 6), QPd = (cx, d) => 26 + 6 * Math.log2(cx * K / d);
  const plan = t => PLANS.find(p => t >= p[0] && t < p[1]) || PLANS[PLANS.length - 1];
  const CX = [];
  for (let i = 0; i < N; i++) {
    const t = i * DT, p = plan(t), k = PLANS.indexOf(p);
    let v = p[3] * (1 + 0.09 * Math.sin(t * 2.1 + k) + 0.08 * (O.alea(i) - 0.5));
    if (p[2] === "Fondu") v = 0.35 - (0.35 - 0.04) * (t - 28) / 3;
    if (t - p[0] < 0.5 && i > 0) v *= 1.35;   // image I au changement de plan
    CX.push(Math.max(0.02, v));
  }
  let mode = "cbr", tLec = 0, sim = null;

  function simuler() {
    const D = +rD.value, Dmax = Math.max(+rMax.value, D), qpc = +rQ.value;
    const R = new Float64Array(N), QP = new Float64Array(N), bourrage = new Float64Array(N);
    if (mode === "cbr") for (let i = 0; i < N; i++) { QP[i] = O.borne(QPd(CX[i], D), QMIN, QMAX); const besoin = Rq(CX[i], QP[i]); R[i] = D; bourrage[i] = Math.max(0, D - besoin); }
    else if (mode === "crf") for (let i = 0; i < N; i++) { QP[i] = qpc; R[i] = Rq(CX[i], qpc); }
    else if (mode === "vbr2") {
      let a = 0, b = 51;
      const moy = q => { let s = 0; for (let i = 0; i < N; i++) s += Math.min(Dmax, Rq(CX[i], Math.max(q, QMIN))); return s / N; };
      for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (moy(m) > D) a = m; else b = m; }
      for (let i = 0; i < N; i++) { QP[i] = O.borne(Math.max(b, QPd(CX[i], Dmax)), QMIN, QMAX); R[i] = Rq(CX[i], QP[i]); }
    } else {
      // VBR une passe : le codeur ne connaît que le passé (moyenne glissante de la complexité)
      let est = CX[0], depense = 0;
      for (let i = 0; i < N; i++) {
        const moyen = i ? depense / i : D, corr = 3 * Math.log2(Math.max(0.3, moyen / D));
        let q = O.borne(QPd(est, D) + corr, QMIN, QMAX);
        if (Rq(CX[i], q) > Dmax) q = QPd(CX[i], Dmax);
        QP[i] = O.borne(q, QMIN, QMAX); R[i] = Rq(CX[i], QP[i]); depense += R[i];
        est += 0.12 * (CX[i] - est);
      }
    }
    let s = 0, mx = 0, sq = 0, pire = 0, sb = 0;
    for (let i = 0; i < N; i++) { s += R[i]; mx = Math.max(mx, R[i]); sq += QP[i]; pire = Math.max(pire, QP[i]); sb += bourrage[i]; }
    sim = { R: R, QP: QP, bourrage: bourrage, moy: s / N, max: mx, qpm: sq / N, pire: pire, bourragePart: sb / s, D: D, Dmax: Dmax };
  }

  // Aperçu de l'image : une petite scène pour chaque plan, pixelisée selon le QP
  const ap = document.createElement("canvas"); ap.width = 96; ap.height = 54; const ax = ap.getContext("2d");
  const pt = document.createElement("canvas"); const px = pt.getContext("2d");
  function apercu(nom, t, qp) {
    ax.fillStyle = "#1c2733"; ax.fillRect(0, 0, 96, 54);
    const perso = (x, coul) => { ax.fillStyle = coul; ax.beginPath(); ax.arc(x, 22, 7, 0, 7); ax.fill(); ax.beginPath(); ax.ellipse(x, 50, 15, 14, 0, Math.PI, 0); ax.fill(); };
    if (nom === "Interview" || nom === "Fondu") { ax.fillStyle = "#2f3e4f"; ax.fillRect(0, 0, 96, 54); ax.fillStyle = "#a0773b"; ax.fillRect(60, 8, 22, 30); perso(42 + Math.sin(t * 2) * 1.5, "#e0b48f"); if (nom === "Fondu") { ax.fillStyle = "rgba(0,0,0," + O.borne((t - 28) / 3, 0, 1) + ")"; ax.fillRect(0, 0, 96, 54); } }
    else if (nom === "Ville") { ax.fillStyle = "#87b6e3"; ax.fillRect(0, 0, 96, 54); for (let i = 0; i < 9; i++) { const h = 14 + O.alea(i) * 26; ax.fillStyle = "hsl(220,10%," + (30 + O.alea(i + 3) * 30) + "%)"; ax.fillRect(i * 11 - 2, 54 - h, 10, h); ax.fillStyle = "#ffe08a"; for (let j = 0; j < h / 6 - 1; j++) ax.fillRect(i * 11 + 1, 56 - h + j * 6, 2, 2); } }
    else if (nom === "Feuillage au vent") { ax.fillStyle = "#24461f"; ax.fillRect(0, 0, 96, 54); for (let i = 0; i < 500; i++) { const x = O.alea(i) * 100 + Math.sin(t * 3 + i) * 2, y = O.alea(i + 50) * 56; ax.fillStyle = "hsl(" + (90 + O.alea(i + 7) * 40) + ",55%," + (20 + O.alea(i + 9) * 35) + "%)"; ax.fillRect(x, y, 2, 2); } }
    else if (nom === "Confettis") { ax.fillStyle = "#14121c"; ax.fillRect(0, 0, 96, 54); for (let i = 0; i < 260; i++) { const x = O.alea(i) * 96 + Math.sin(t * 4 + i) * 3, y = (O.alea(i + 80) * 70 + t * 25 * (0.6 + O.alea(i + 3))) % 60 - 3; ax.fillStyle = "hsl(" + Math.floor(O.alea(i + 5) * 360) + ",90%,60%)"; ax.fillRect(x, y, 2, 3); } }
    else if (nom === "Dialogue") { ax.fillStyle = "#3a2f2a"; ax.fillRect(0, 0, 96, 54); perso(28, "#d9a57b"); perso(70 + Math.sin(t) * 1, "#8f6a4f"); }
    else { ax.fillStyle = "#000"; ax.fillRect(0, 0, 96, 54); ax.fillStyle = "#fff"; ax.font = "600 6px sans-serif"; ax.textAlign = "center"; for (let j = 0; j < 8; j++) ax.fillText(["Réalisation", "Image", "Son", "Montage", "Étalonnage", "Musique", "Production", "Merci"][j], 48, 30 + j * 9 - (t - 52) * 7); }
    // pixelisation = perte de détails quand le QP monte
    const b = qp <= 26 ? 1 : 1 + (qp - 26) / 3.2;
    pt.width = Math.max(4, Math.round(96 / b)); pt.height = Math.max(3, Math.round(54 / b));
    px.imageSmoothingEnabled = true; px.drawImage(ap, 0, 0, pt.width, pt.height);
    return pt;
  }

  function scene() {
    const S = sim, X0 = 70, GW = 690, x = i => X0 + i / N * GW;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // plans
    PLANS.forEach(p => { const a = X0 + p[0] / 60 * GW, b = X0 + p[1] / 60 * GW; c.fillStyle = p[4]; O.rect(c, a + 1, 22, b - a - 2, 24, 5); c.fill(); c.save(); c.beginPath(); c.rect(a + 2, 22, b - a - 4, 24); c.clip(); O.ecrire(c, p[2], a + 6, 39, { s: 12, c: "#fff" }); c.restore(); });
    // complexité
    const yC = 60, hC = 56;
    O.ecrire(c, "Complexité", X0 - 8, yC + 16, { s: 12, a: "right", c: "#a1a1a6" });
    c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.moveTo(x(0), yC + hC); CX.forEach((v, i) => c.lineTo(x(i), yC + hC - v / 2.6 * hC)); c.lineTo(x(N), yC + hC); c.fill();
    // débit
    const yD = 140, hD = 170, dmax = Math.max(mode === "vbr1" || mode === "vbr2" ? S.Dmax : 0, S.max, S.D) * 1.12, yv = v => yD + hD - v / dmax * hD;
    O.ecrire(c, "Débit", X0 - 8, yD + 50, { s: 12, a: "right", c: "#a1a1a6" });
    O.ecrire(c, O.nb(dmax, 0), X0 - 8, yD + 6, { s: 11, a: "right", c: "#8e8e93" }); O.ecrire(c, "0", X0 - 8, yD + hD, { s: 11, a: "right", c: "#8e8e93" });
    c.fillStyle = "rgba(100,210,255,.55)"; c.beginPath(); c.moveTo(x(0), yD + hD);
    for (let i = 0; i < N; i++) { const v = S.R[i] - S.bourrage[i]; c.lineTo(x(i), yv(v)); c.lineTo(x(i + 1), yv(v)); }
    c.lineTo(x(N), yD + hD); c.fill();
    if (mode === "cbr") { c.fillStyle = "rgba(255,159,10,.55)"; for (let i = 0; i < N; i++) if (S.bourrage[i] > 0.01) c.fillRect(x(i), yv(S.R[i]), GW / N + 0.5, yv(S.R[i] - S.bourrage[i]) - yv(S.R[i])); }
    const ligne = (v, coul, txt) => { c.strokeStyle = coul; c.setLineDash([6, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(X0, yv(v)); c.lineTo(X0 + GW, yv(v)); c.stroke(); c.setLineDash([]); O.ecrire(c, txt, X0 + GW + 6, yv(v) + 4, { s: 12, c: coul }); };
    if (mode !== "crf") ligne(S.D, "#ffd60a", (mode === "cbr" ? "débit " : "moyenne visée ") + O.nb(S.D, 1));
    if (mode === "vbr1" || mode === "vbr2") ligne(S.Dmax, "#ff453a", "max " + S.Dmax);
    if (mode === "crf" || Math.abs(S.moy - S.D) > 0.05 * S.D) ligne(S.moy, "#64d2ff", "obtenu " + O.nb(S.moy, 1));
    if (mode === "cbr" && S.bourragePart > 0.002) O.ecrire(c, "orange : bourrage", X0 + 6, yD + 14, { s: 12, c: "#ff9f0a" });
    // QP
    const yQ = 340, hQ = 150, qv = q => yQ + (q - QMIN) / (46 - QMIN) * hQ;
    [[QMIN, 24, "rgba(48,209,88,.13)", "excellente"], [24, 30, "rgba(100,210,255,.1)", "bonne"], [30, 36, "rgba(255,159,10,.12)", "moyenne"], [36, 46, "rgba(255,69,58,.15)", "dégradée"]].forEach(z => { c.fillStyle = z[2]; c.fillRect(X0, qv(z[0]), GW, qv(z[1]) - qv(z[0])); O.ecrire(c, z[3], X0 + GW + 6, (qv(z[0]) + qv(z[1])) / 2 + 4, { s: 12, c: "#a1a1a6", g: false }); });
    O.ecrire(c, "QP", X0 - 8, yQ + 16, { s: 12, a: "right", c: "#a1a1a6" });
    [QMIN, 24, 30, 36, 46].forEach(q => O.ecrire(c, q, X0 - 8, qv(q) + 4, { s: 11, a: "right", c: "#8e8e93" }));
    c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < N; i++) { const y = qv(Math.min(46, S.QP[i])); i ? c.lineTo(x(i), y) : c.moveTo(x(i), y); } c.stroke();
    O.ecrire(c, "↑ meilleure qualité", X0, yQ + hQ + 20, { s: 12, c: "#8e8e93", g: false });
    O.ecrire(c, "0 s", X0, Hc - 12, { s: 11, c: "#8e8e93" }); O.ecrire(c, "60 s", X0 + GW, Hc - 12, { s: 11, a: "right", c: "#8e8e93" });
    // tête de lecture et aperçu
    const i = Math.min(N - 1, Math.floor(tLec / DT)), xp = x(i), p = plan(tLec);
    c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(xp, 20); c.lineTo(xp, yQ + hQ); c.stroke();
    const AX = 805, AY = 60, AW = 180, AH = 101;
    c.imageSmoothingEnabled = false; c.drawImage(apercu(p[2], tLec, S.QP[i]), AX, AY, AW, AH); c.imageSmoothingEnabled = true;
    c.strokeStyle = "rgba(255,255,255,.3)"; c.strokeRect(AX, AY, AW, AH);
    O.ecrire(c, "À la tête de lecture", AX, AY - 12, { s: 13, c: "#a1a1a6" });
    const q = S.QP[i], qual = q < 24 ? "excellente" : q < 30 ? "bonne" : q < 36 ? "moyenne" : "dégradée";
    [[p[2], "#fff"], ["t = " + O.nb(tLec, 1) + " s", "#a1a1a6"], ["débit : " + O.nb(S.R[i] - S.bourrage[i], 1) + " Mbit/s", "#64d2ff"], [mode === "cbr" && S.bourrage[i] > 0.05 ? "+ bourrage : " + O.nb(S.bourrage[i], 1) : "", "#ff9f0a"], ["QP " + O.nb(q, 0) + " : " + qual, q < 30 ? "#30d158" : q < 36 ? "#ff9f0a" : "#ff453a"]].forEach((l, k) => O.ecrire(c, l[0], AX, AY + AH + 24 + k * 22, { s: 14, c: l[1] }));
  }

  function dessiner() {
    if (+rMax.value < +rD.value) rMax.value = Math.ceil(+rD.value);
    rD.parentElement.querySelector("output").textContent = O.nb(+rD.value, 1) + " Mbit/s";
    rMax.parentElement.querySelector("output").textContent = rMax.value + " Mbit/s";
    rQ.parentElement.querySelector("output").textContent = rQ.value;
    O.el("m5a-l-d").style.display = mode === "crf" ? "none" : "";
    O.el("m5a-l-max").style.display = mode === "vbr1" || mode === "vbr2" ? "" : "none";
    O.el("m5a-l-qp").style.display = mode === "crf" ? "" : "none";
    simuler();
    const S = sim;
    Application.afficher("#m5a-moy", O.nb(S.moy, 1) + " Mbit/s");
    Application.afficher("#m5a-max", O.nb(S.max, 1) + " Mbit/s");
    Application.afficher("#m5a-taille", O.nb(S.moy * 0.45, 1) + " Go");
    Application.afficher("#m5a-qp", O.nb(S.qpm, 1));
    Application.afficher("#m5a-pire", O.nb(S.pire, 0));
    O.el("m5a-pire").className = S.pire < 30 ? "ok" : S.pire >= 36 ? "bad" : "";
    const T = {
      cbr: "<b>CBR à " + O.nb(S.D, 1) + " Mbit/s</b> : le débit ne bouge pas, c’est la <b>qualité</b> qui paie. Pendant les confettis, le QP grimpe à " + O.nb(S.pire, 0) + " (" + (S.pire >= 36 ? "image dégradée" : "qualité moyenne") + ") ; pendant le fondu et le générique, des bits sont gaspillés en <b>bourrage</b> (" + O.nb(S.bourragePart * 100, 0) + " % du flux).",
      vbr1: "<b>VBR une passe</b> : le codeur ne connaît que le passé. Au début des confettis, il est pris de court (le débit bute sur le plafond, la qualité chute un instant), puis il s’adapte. Moyenne obtenue : " + O.nb(S.moy, 1) + " Mbit/s pour " + O.nb(S.D, 1) + " visés.",
      vbr2: "<b>VBR deux passes</b> : la première passe a mesuré toute la séquence ; la seconde donne plus de bits aux confettis et au feuillage, moins à l’interview. Pour la même moyenne (" + O.nb(S.moy, 1) + " Mbit/s), la qualité est presque <b>constante</b> (QP le pire : " + O.nb(S.pire, 0) + ")" + (S.max >= S.Dmax - 0.01 ? ", sauf là où le plafond de " + S.Dmax + " Mbit/s bride le débit." : "."),
      crf: "<b>Qualité constante</b> (QP " + rQ.value + ") : chaque plan reçoit exactement ce dont il a besoin, de " + O.nb(Math.min.apply(null, S.R), 1) + " à " + O.nb(S.max, 1) + " Mbit/s. La qualité est parfaite et régulière, mais la taille du fichier (" + O.nb(S.moy * 0.45, 1) + " Go/h) n’est connue qu’à la fin."
    };
    O.note("m5a-msg", mode === "cbr" && S.pire >= 36 ? "note warn" : "note ok", T[mode]);
    scene();
  }

  [rD, rMax, rQ].forEach(r => r.addEventListener("input", dessiner));
  const seg = Application.segment("#m5a-mode", [["cbr", "CBR"], ["vbr1", "VBR 1 passe"], ["vbr2", "VBR 2 passes"], ["crf", "Qualité constante"]], mode, v => { mode = v; dessiner(); });
  O.situations("m5a-situ", s => {
    const R = { live: ["cbr", 6, 20, 23], bluray: ["vbr2", 18, 40, 23], archive: ["crf", 10, 20, 18] }[s];
    rD.value = R[1]; rMax.value = R[2]; rQ.value = R[3]; O.curseur(rD, R[1]); O.curseur(rMax, R[2]); O.curseur(rQ, R[3]);
    seg.choisir(R[0]);
  });
  const anim = O.boucle(cv, dt => { tLec = (tLec + dt * 5) % 60; scene(); });
  O.boutonPause("m5a-pause", anim, () => scene());
  tLec = 36;
  dessiner();
});

/* ==========================================================================
   MODULE 5 — LABO 2 : PROFIL ET NIVEAU
   Tables de niveaux : contenu.js (NIV264, NIVHEVC).
   ========================================================================== */
labo(5, function () {
  const cv = O.el("m5b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const sDef = O.el("m5b-def"), sF = O.el("m5b-f"), rD = O.el("m5b-d"), zOut = O.el("m5b-outils");
  const DEFS = [["sd", "SD 720 × 576", 720, 576], ["hd720", "HD 1280 × 720", 1280, 720], ["hd", "HD 1920 × 1080", 1920, 1080], ["uhd", "UHD 3840 × 2160", 3840, 2160], ["dci", "4K DCI 4096 × 2160", 4096, 2160], ["8k", "8K 7680 × 4320", 7680, 4320]];
  O.options(sDef, DEFS.map(d => [d[0], d[1]]), "hd");
  O.options(sF, [24, 25, 30, 50, 60, 120].map(f => [f, f + " i/s"]), 25);
  let norme = "h264", ech = "4:2:0", q = 8, outils = { B: true, CABAC: true, T8: true }, aff = null;
  const vers = v => 0.5 * Math.pow(2000, v / 1000), depuis = d => 1000 * Math.log(d / 0.5) / Math.log(2000);
  const P264 = [["Baseline", 1, "images I et P, CAVLC"], ["Main", 1, "+ images B, CABAC, entrelacé"], ["High", 1.25, "+ transformée 8 × 8, matrices"], ["High 10", 3, "+ 10 bits"], ["High 4:2:2", 4, "+ 4:2:2"], ["High 4:4:4 Predictive", 4, "+ 4:4:4, 14 bits, sans perte"]];
  const PHEVC = { "4:2:0": [["Main", 1], ["Main 10", 1], ["Main 12", 1.5]], "4:2:2": [["Main 4:2:2 10", 1.667], ["Main 4:2:2 10", 1.667], ["Main 4:2:2 12", 2]], "4:4:4": [["Main 4:4:4", 2], ["Main 4:4:4 10", 2.5], ["Main 4:4:4 12", 3]] };

  zOut.innerHTML = '<div class="ctl"><span>Outils utilisés</span><div class="btnrow">' + [["B", "Images B"], ["CABAC", "CABAC"], ["T8", "Transformée 8 × 8"]].map(o => '<button class="chip" type="button" data-o="' + o[0] + '" aria-pressed="true">' + o[1] + "</button>").join("") + "</div></div>";
  zOut.addEventListener("click", e => { const b = e.target.closest("[data-o]"); if (!b) return; outils[b.dataset.o] = !outils[b.dataset.o]; b.setAttribute("aria-pressed", String(outils[b.dataset.o])); dessiner(); });

  function profil() {
    if (norme === "hevc") { const k = PHEVC[ech][q === 8 ? 0 : q === 10 ? 1 : 2]; return { nom: k[0], f: k[1], i: 0 }; }
    let i;
    if (ech === "4:4:4" || q === 12) i = 5; else if (ech === "4:2:2") i = 4; else if (q === 10) i = 3; else if (outils.T8) i = 2; else if (outils.B || outils.CABAC) i = 1; else i = 0;
    return { nom: P264[i][0], f: P264[i][1], i: i };
  }
  function calcul() {
    const d = DEFS.find(x => x[0] === sDef.value), f = +sF.value, D = vers(+rD.value), P = profil();
    let lignes, choix = null;
    if (norme === "h264") {
      const fs = Math.ceil(d[2] / 16) * Math.ceil(d[3] / 16), mbs = fs * f;
      lignes = NIV264.filter(n => +n[0] >= 3 && n[0] !== "1b").map(n => ({ nom: n[0], cap: n[1] * 256, img: n[2] >= fs, br: n[3] * P.f / 1000, brH: null, ok: n[2] >= fs && n[1] >= mbs && n[3] * P.f / 1000 >= D, tier: "" }));
      choix = lignes.find(l => l.ok) || null;
      return { d: d, f: f, D: D, P: P, besoin: mbs * 256, lignes: lignes, choix: choix, unite: "macroblocs/s", brut: mbs };
    }
    const ps = d[2] * d[3], sr = ps * f;
    lignes = NIVHEVC.filter(n => +n[0] >= 3).map(n => {
      const img = n[1] >= ps && Math.max(d[2], d[3]) <= Math.sqrt(8 * n[1]), pix = img && n[2] >= sr;
      const bM = n[3] * P.f / 1000, bH = n[4] ? n[4] * P.f / 1000 : null;
      const tier = pix ? (D <= bM ? "Main" : bH && D <= bH ? "High" : "") : "";
      return { nom: n[0], cap: n[2], img: img, br: bM, brH: bH, ok: !!tier, tier: tier };
    });
    choix = lignes.find(l => l.ok) || null;
    return { d: d, f: f, D: D, P: P, besoin: sr, lignes: lignes, choix: choix, unite: "échantillons/s", brut: sr };
  }

  function scene() {
    const A = aff;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // à gauche : les profils
    O.ecrire(c, norme === "h264" ? "Profils H.264 : des boîtes à outils emboîtées" : "Profils HEVC : structure et quantification", 20, 26, { s: 14, c: "#a1a1a6" });
    if (norme === "h264") {
      for (let i = 5; i >= 0; i--) {
        const k = 5 - i, m = k * 12, x = 20 + m, y = 40 + k * 46, w = 400 - 2 * m, h = 410 - k * 52, on = i === A.P.i, dedans = i <= A.P.i;
        c.fillStyle = on ? "rgba(100,210,255,.16)" : "rgba(255,255,255,.025)"; O.rect(c, x, y, w, h, 12); c.fill();
        c.strokeStyle = on ? "#64d2ff" : dedans ? "rgba(100,210,255,.45)" : "rgba(255,255,255,.18)"; c.lineWidth = on ? 3 : 1.4; c.stroke();
        O.ecrire(c, P264[i][0], x + 12, y + 20, { s: 14, c: on ? "#64d2ff" : dedans ? "#e5e5ea" : "#8e8e93" });
        O.ecrire(c, P264[i][2], x + 12, y + 38, { s: 12, c: "#8e8e93", g: false });
      }
      O.ecrire(c, "Débit max × " + O.nb(A.P.f, 2) + " par rapport au Main", 46, 440, { s: 13, c: "#64d2ff" });
    } else {
      const bits = [8, 10, 12], st = ["4:2:0", "4:2:2", "4:4:4"], X0 = 92, Y0 = 70, cw = 108, ch = 92;
      bits.forEach((b, j) => O.ecrire(c, b + " bits", X0 + j * cw + cw / 2, Y0 - 10, { s: 13, a: "center", c: "#a1a1a6" }));
      st.forEach((s, i) => { O.ecrire(c, s, X0 - 12, Y0 + i * ch + ch / 2 + 4, { s: 13, a: "right", c: "#a1a1a6" }); bits.forEach((b, j) => {
        const k = PHEVC[s][j], on = s === ech && b === q;
        c.fillStyle = on ? "rgba(100,210,255,.22)" : "rgba(255,255,255,.04)"; O.rect(c, X0 + j * cw + 3, Y0 + i * ch + 3, cw - 6, ch - 6, 10); c.fill();
        c.strokeStyle = on ? "#64d2ff" : "rgba(255,255,255,.14)"; c.lineWidth = on ? 3 : 1; c.stroke();
        const mots = k[0].split(" "); const l1 = mots.slice(0, 2).join(" "), l2 = mots.slice(2).join(" ");
        O.ecrire(c, l1, X0 + j * cw + cw / 2, Y0 + i * ch + ch / 2 - (l2 ? 4 : -4), { s: 13, a: "center", c: on ? "#64d2ff" : "#e5e5ea" });
        if (l2) O.ecrire(c, l2, X0 + j * cw + cw / 2, Y0 + i * ch + ch / 2 + 14, { s: 13, a: "center", c: on ? "#64d2ff" : "#e5e5ea" });
      }); });
      O.ecrire(c, "Main 10 : UHD Blu-ray, HDR10, streaming 4K", 30, 370, { s: 13, c: "#a1a1a6", g: false });
      O.ecrire(c, "Les profils « 4:2:2 » et « 4:4:4 » servent à la production.", 30, 392, { s: 13, c: "#a1a1a6", g: false });
      O.ecrire(c, "Tous utilisent le CABAC et les images B.", 30, 414, { s: 13, c: "#a1a1a6", g: false });
      O.ecrire(c, "Débit max × " + O.nb(A.P.f, 2) + " par rapport au Main", 30, 446, { s: 13, c: "#64d2ff" });
    }
    // à droite : l'échelle des niveaux
    const X1 = 450, L = A.lignes, rh = Math.min(38, 430 / L.length), Y1 = 66;
    const xa = 520, xb = 740, wa = 200, wb = 230;
    const pa = v => xa + O.borne((Math.log10(v) - 7) / 3, 0, 1) * wa, pb = v => xb + O.borne(Math.log10(v / 0.5) / Math.log10(4000), 0, 1) * wb;
    O.ecrire(c, "Niveau", X1, Y1 - 24, { s: 13, c: "#a1a1a6" });
    O.ecrire(c, "Pixels par seconde (max)", xa, Y1 - 24, { s: 13, c: "#a1a1a6" });
    O.ecrire(c, "Débit max (Mbit/s)", xb, Y1 - 24, { s: 13, c: "#a1a1a6" });
    L.forEach((l, k) => {
      const y = Y1 + k * rh, on = l === A.choix;
      if (on) { c.fillStyle = "rgba(48,209,88,.16)"; O.rect(c, X1 - 8, y - 3, 540, rh - 2, 8); c.fill(); }
      O.ecrire(c, l.nom, X1, y + rh / 2 + 3, { s: 14, m: true, c: on ? "#30d158" : l.ok ? "#e5e5ea" : "#8e8e93" });
      c.fillStyle = l.img ? "rgba(100,210,255,.55)" : "rgba(255,69,58,.4)"; c.fillRect(xa, y + 4, pa(l.cap) - xa, rh - 12);
      if (l.brH) { c.fillStyle = "rgba(191,90,242,.28)"; c.fillRect(xb, y + 4, pb(l.brH) - xb, rh - 12); }
      c.fillStyle = "rgba(191,90,242,.75)"; c.fillRect(xb, y + 4, pb(l.br) - xb, rh - 12);
      O.ecrire(c, O.nb(l.br, l.br < 10 ? 1 : 0) + (l.brH ? " / " + O.nb(l.brH, 0) : ""), pb(l.brH || l.br) + 5, y + rh / 2 + 3, { s: 11, c: "#a1a1a6", g: false });
      if (!l.img) O.ecrire(c, "image trop grande", xa + 4, y + rh / 2 + 3, { s: 11, c: "#fff" });
    });
    // besoins du fichier
    const yb = Y1 + L.length * rh;
    const ligneV = (x, coul, txt) => { c.strokeStyle = coul; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x, Y1 - 8); c.lineTo(x, yb); c.stroke(); c.setLineDash([]); O.ecrire(c, txt, x, yb + 16, { s: 12, a: "center", c: coul }); };
    ligneV(pa(A.besoin), "#ffd60a", "fichier : " + O.nb(A.besoin / 1e6, 0) + " M");
    ligneV(pb(A.D), "#ffd60a", "fichier : " + O.nb(A.D, A.D < 10 ? 1 : 0));
    if (norme === "hevc") O.ecrire(c, "violet foncé : Main tier · clair : High tier", xb, yb + 36, { s: 12, c: "#a1a1a6", g: false });
  }

  function dessiner() {
    const D = vers(+rD.value);
    rD.parentElement.querySelector("output").textContent = O.debit(D);
    zOut.style.display = norme === "h264" ? "" : "none";
    aff = calcul();
    const A = aff, ch = A.choix;
    const notation = ch ? A.P.nom + "@L" + ch.nom + (norme === "hevc" ? "@" + ch.tier : "") : "—";
    Application.afficher("#m5b-profil", A.P.nom);
    Application.afficher("#m5b-niveau", ch ? ch.nom + (norme === "hevc" ? " · " + ch.tier + " tier" : "") : "hors norme");
    Application.afficher("#m5b-note", notation);
    let charge = "—";
    if (ch) { const cap = norme === "h264" ? ch.cap : ch.cap, b = norme === "hevc" && ch.tier === "High" ? ch.brH : ch.br; charge = O.nb(Math.max(A.besoin / cap, A.D / b) * 100, 0) + " %"; }
    Application.afficher("#m5b-charge", charge);
    let txt, cls = "note ok";
    if (!ch) { cls = "note bad"; txt = "Aucun niveau ne convient : le débit ou la cadence dépasse ce que la norme prévoit pour ce profil."; }
    else {
      txt = "Le fichier demande le profil <b>" + A.P.nom + "</b>" + (norme === "h264" && A.P.i <= 2 ? " (outils choisis : " + (outils.T8 ? "transformée 8 × 8" : outils.B || outils.CABAC ? "images B ou CABAC" : "aucun outil avancé") + ")" : " (" + ech + ", " + q + " bits)") + " et au moins le niveau <b>" + ch.nom + "</b>" + (norme === "hevc" ? ", " + ch.tier + " tier" : "") + " : on l’écrit <b>" + notation + "</b>. ";
      const sansDebit = A.lignes.find(l => l.img && (norme === "h264" ? l.cap >= A.besoin : l.cap >= A.besoin));
      if (sansDebit && sansDebit !== ch) txt += "La définition et la cadence tiendraient au niveau " + sansDebit.nom + ", mais le <b>débit</b> impose de monter au " + ch.nom + ". ";
      txt += "Un lecteur annoncé « " + A.P.nom + "@L" + ch.nom + " » ou supérieur pourra le lire.";
      if (norme === "h264" && A.P.i === 0) txt += " Sans images B ni CABAC : c’est le profil des visioconférences, simple à décoder.";
    }
    O.note("m5b-msg", cls, txt);
    scene();
  }

  sDef.addEventListener("change", dessiner); sF.addEventListener("change", dessiner); rD.addEventListener("input", dessiner);
  const segN = Application.segment("#m5b-norme", [["h264", "H.264"], ["hevc", "HEVC"]], norme, v => { norme = v; dessiner(); });
  const segE = Application.segment("#m5b-ech", [["4:2:0", "4:2:0"], ["4:2:2", "4:2:2"], ["4:4:4", "4:4:4"]], ech, v => { ech = v; dessiner(); });
  const segQ = Application.segment("#m5b-q", [[8, "8 bits"], [10, "10 bits"], [12, "12 bits"]], q, v => { q = +v; dessiner(); });
  O.situations("m5b-situ", s => {
    const R = { web: ["h264", "hd", 25, "4:2:0", 8, 8], bluray: ["h264", "hd", 24, "4:2:0", 8, 35], xavc: ["h264", "uhd", 25, "4:2:2", 10, 240], uhd: ["hevc", "uhd", 50, "4:2:0", 10, 60] }[s];
    sDef.value = R[1]; sF.value = R[2]; rD.value = depuis(R[5]); rD.dispatchEvent(new Event("input"));
    outils = { B: true, CABAC: true, T8: true }; zOut.querySelectorAll("[data-o]").forEach(b => b.setAttribute("aria-pressed", "true"));
    norme = R[0]; segN.choisir(R[0]); ech = R[3]; segE.choisir(R[3]); q = R[4]; segQ.choisir(R[4]);
    dessiner();
  });
  rD.value = depuis(8);
  dessiner();
});

/* ==========================================================================
   MODULE 6 — LABO 1 : OUVRIR LE CONTENEUR
   ========================================================================== */
labo(6, function () {
  const cv = O.el("m6a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const sV = O.el("m6a-vid"), sA = O.el("m6a-aud"), rN = O.el("m6a-na");
  const CONT = {
    mov: { nom: "MOV", ext: ".mov", idx: "index « moov »", usage: "tournage et postproduction (Apple)" },
    mp4: { nom: "MP4", ext: ".mp4", idx: "index « moov » (en tête si faststart)", usage: "web, téléphones, plateformes" },
    mxf: { nom: "MXF", ext: ".mxf", idx: "partition d’en-tête", usage: "broadcast, Avid, PAD, DCP" },
    mkv: { nom: "MKV", ext: ".mkv", idx: "en-tête et index « Cues »", usage: "conteneur libre, archivage" },
    ts: { nom: "MPEG-TS", ext: ".ts", idx: "tables PAT / PMT répétées", usage: "diffusion TNT, satellite, IPTV" }
  };
  // [clé, nom, débit en HD 1080 25p (Mbit/s), intra ?]
  const VID = [["prores", "ProRes 422 HQ", 184, true], ["dnx", "DNxHD 185", 185, true], ["avci", "AVC-Intra 100", 100, true], ["mpeg2", "MPEG-2 (XDCAM HD 422)", 50, false], ["h264", "H.264 GOP long", 8, false], ["hevc", "HEVC", 4, false], ["av1", "AV1", 3, false], ["j2k", "JPEG 2000", 125, true]];
  // [clé, nom, débit par piste (Mbit/s)] : PCM par voie mono, les autres par flux stéréo ou 5.1
  const AUD = [["pcm", "PCM 48 kHz 24 bits", 1.152], ["aac", "AAC 256 kbit/s", 0.256], ["ac3", "AC-3 (Dolby Digital)", 0.448], ["opus", "Opus 128 kbit/s", 0.128]];
  // 2 = usage courant · 1 = possible mais peu répandu · 0 = non prévu
  const COMPAT = {
    mov: { prores: 2, dnx: 2, avci: 1, mpeg2: 1, h264: 2, hevc: 2, av1: 1, j2k: 1, pcm: 2, aac: 2, ac3: 1, opus: 1 },
    mp4: { prores: 0, dnx: 0, avci: 1, mpeg2: 1, h264: 2, hevc: 2, av1: 2, j2k: 1, pcm: 1, aac: 2, ac3: 2, opus: 1 },
    mxf: { prores: 1, dnx: 2, avci: 2, mpeg2: 2, h264: 2, hevc: 1, av1: 0, j2k: 2, pcm: 2, aac: 1, ac3: 1, opus: 0 },
    mkv: { prores: 1, dnx: 1, avci: 1, mpeg2: 2, h264: 2, hevc: 2, av1: 2, j2k: 1, pcm: 2, aac: 2, ac3: 2, opus: 2 },
    ts: { prores: 0, dnx: 0, avci: 0, mpeg2: 2, h264: 2, hevc: 2, av1: 1, j2k: 1, pcm: 1, aac: 2, ac3: 2, opus: 1 }
  };
  O.options(sV, VID.map(v => [v[0], v[1]]), "prores");
  O.options(sA, AUD.map(a => [a[0], a[1]]), "pcm");
  let cont = "mov", tc = true, st = false, t = 0, ouverture = 0;
  const fond = IMG.pixels(170, 102);

  function etat() {
    const v = VID.find(x => x[0] === sV.value), a = AUD.find(x => x[0] === sA.value), na = +rN.value, k = COMPAT[cont];
    return { v: v, a: a, na: na, compat: Math.min(k[v[0]], k[a[0]]), cv: k[v[0]], ca: k[a[0]], debit: v[2] + a[2] * na };
  }
  function scene() {
    const E = etat(), C = CONT[cont];
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // le fichier
    const FX = 20, FY = 40, FW = 300, FH = 420, ouv = O.reduit() ? 1 : O.borne(ouverture, 0, 1);
    c.fillStyle = "rgba(255,255,255,.04)"; O.rect(c, FX, FY, FW, FH, 16); c.fill();
    c.strokeStyle = "#e5e5ea"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "#3a3a3c"; O.rect(c, FX + 14, FY - 24, 190, 30, 8); c.fill(); O.ecrire(c, "📄 A001_C002" + C.ext, FX + 26, FY - 4, { s: 14, c: "#fff" });
    O.ecrire(c, "Conteneur " + C.nom, FX + 16, FY + 26, { s: 15, c: "#ffd60a" });
    const pistes = [["Index", C.idx, "#8e8e93"], ["Vidéo", E.v[1], "#64d2ff"]];
    for (let i = 0; i < E.na; i++) pistes.push(["Audio " + (i + 1), E.a[1], "#30d158"]);
    if (tc) pistes.push(["Timecode", "10:00:00:00", "#ff9f0a"]);
    if (st) pistes.push(["Sous-titres", "texte horodaté", "#bf5af2"]);
    const lh = Math.min(40, (FH - 60) / pistes.length);
    pistes.forEach((p, i) => {
      const y = FY + 42 + i * lh, ap = O.borne(ouv * pistes.length - i, 0, 1);
      c.globalAlpha = ap;
      c.fillStyle = "rgba(255,255,255,.06)"; O.rect(c, FX + 12, y, FW - 24, lh - 6, 7); c.fill();
      c.strokeStyle = p[2]; c.lineWidth = 1.5; c.stroke();
      O.ecrire(c, p[0], FX + 22, y + (lh - 6) / 2 + 5, { s: lh > 30 ? 14 : 12, c: p[2] });
      O.ecrire(c, p[1], FX + FW - 22, y + (lh - 6) / 2 + 5, { s: lh > 30 ? 12 : 11, a: "right", c: "#a1a1a6", g: false });
      c.globalAlpha = 1;
    });
    // le flux entrelacé
    const BX = 340, BY = 236, BL = 360, ok = E.compat > 0;
    O.ecrire(c, cont === "ts" ? "Flux de paquets de 188 octets" : "Morceaux entrelacés dans le fichier", BX, BY - 46, { s: 14, c: "#a1a1a6" });
    c.fillStyle = "rgba(255,255,255,.05)"; c.fillRect(BX, BY - 26, BL, 52);
    const motif = [];
    for (let k = 0; k < 6; k++) {
      motif.push(["V", cont === "ts" ? 10 : O.borne(6 + Math.log2(E.v[2]) * 4, 8, 40)]);
      for (let a = 0; a < Math.min(E.na, 4); a++) motif.push(["A", cont === "ts" ? 10 : 6]);
      if (tc && k % 3 === 0) motif.push(["T", cont === "ts" ? 10 : 4]);
      if (st && k % 4 === 1) motif.push(["S", cont === "ts" ? 10 : 5]);
    }
    const lgM = motif.reduce((s, m) => s + m[1] + 3, 0), dec = ok && !O.reduit() ? (t * 60) % lgM : 0;
    c.save(); c.beginPath(); c.rect(BX, BY - 26, BL, 52); c.clip();
    for (let rep = -1; rep < 3; rep++) {
      let x = BX + rep * lgM + dec;
      motif.forEach(m => { const coul = m[0] === "V" ? "#64d2ff" : m[0] === "A" ? "#30d158" : m[0] === "T" ? "#ff9f0a" : "#bf5af2"; c.fillStyle = coul; c.fillRect(x, BY - 14, m[1], 28); x += m[1] + 3; });
    }
    c.restore();
    O.fleche(c, FX + FW + 4, BY, BX - 4, BY, "#8e8e93", 2);
    // démultiplexeur
    const DX = 720, DY = BY - 50;
    c.fillStyle = ok ? "rgba(255,214,10,.15)" : "rgba(255,69,58,.18)"; O.rect(c, DX, DY, 70, 100, 12); c.fill();
    c.strokeStyle = ok ? "#ffd60a" : "#ff453a"; c.lineWidth = 2; c.stroke();
    O.ecrire(c, "Démux", DX + 35, DY + 54, { s: 14, a: "center", c: ok ? "#ffd60a" : "#ff453a" });
    O.fleche(c, BX + BL + 2, BY, DX - 3, BY, "#8e8e93", 2);
    if (!ok) { c.strokeStyle = "#ff453a"; c.lineWidth = 4; c.beginPath(); c.moveTo(DX + 10, DY + 10); c.lineTo(DX + 60, DY + 90); c.moveTo(DX + 60, DY + 10); c.lineTo(DX + 10, DY + 90); c.stroke(); }
    // décodeurs et sorties
    const OX = 810;
    const boite = (y, txt, coul, ok2) => { c.fillStyle = ok2 ? "rgba(255,255,255,.06)" : "rgba(255,69,58,.12)"; O.rect(c, OX, y, 170, 40, 9); c.fill(); c.strokeStyle = ok2 ? coul : "#ff453a"; c.lineWidth = 1.5; c.stroke(); O.ecrire(c, txt, OX + 85, y + 25, { s: 12.5, a: "center", c: ok2 ? coul : "#ff453a" }); };
    boite(40, "Décodeur " + E.v[1].split(" (")[0], "#64d2ff", E.cv > 0);
    boite(316, "Décodeur " + E.a[1].split(" ")[0], "#30d158", E.ca > 0);
    O.fleche(c, DX + 70, DY + 20, OX - 4, 62, "#64d2ff", 1.6);
    O.fleche(c, DX + 70, DY + 80, OX - 4, 336, "#30d158", 1.6);
    // écran
    c.drawImage(fond.cv, OX, 92, 170, 102);
    if (E.cv > 0) { c.save(); c.translate(OX, 92); IMG.balle(c, 170, 102, 40 + (t * 50) % 240, 60); c.restore(); } else { c.fillStyle = "rgba(0,0,0,.75)"; c.fillRect(OX, 92, 170, 102); O.ecrire(c, "image illisible", OX + 85, 148, { s: 13, a: "center", c: "#ff453a" }); }
    c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 1; c.strokeRect(OX, 92, 170, 102);
    if (tc) { const f = Math.floor(t * 25), tt = "10:00:" + String(Math.floor(f / 25) % 60).padStart(2, "0") + ":" + String(f % 25).padStart(2, "0"); c.fillStyle = "rgba(0,0,0,.6)"; c.fillRect(OX + 4, 96, 78, 16); O.ecrire(c, tt, OX + 8, 108, { s: 11, m: true, c: "#ff9f0a" }); }
    if (st) { c.fillStyle = "rgba(0,0,0,.6)"; c.fillRect(OX + 30, 172, 110, 17); O.ecrire(c, "— Bonjour à tous !", OX + 85, 185, { s: 11, a: "center", c: "#fff" }); }
    O.ecrire(c, "Écran", OX, 212, { s: 12, c: "#8e8e93" });
    // haut-parleurs : un vumètre par piste
    const n = E.na, lw = Math.min(18, 160 / n);
    for (let i = 0; i < n; i++) { const v = E.ca > 0 ? 0.25 + 0.7 * Math.abs(Math.sin(t * (3 + i) + i)) * (0.6 + 0.4 * O.alea(Math.floor(t * 8) + i)) : 0; c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(OX + i * (lw + 2), 372, lw, 70); c.fillStyle = v > 0.85 ? "#ff9f0a" : "#30d158"; c.fillRect(OX + i * (lw + 2), 372 + 70 * (1 - v), lw, 70 * v); }
    O.ecrire(c, n + " piste" + (n > 1 ? "s" : "") + " audio", OX, 462, { s: 12, c: "#8e8e93" });
    // légende
    O.ecrire(c, "Bleu : vidéo · vert : audio · orange : timecode · violet : sous-titres", BX, BY + 52, { s: 12, c: "#8e8e93", g: false });
    O.ecrire(c, "Le démultiplexeur sépare les pistes grâce à leurs horodatages ;", BX, BY + 92, { s: 13, c: "#e5e5ea", g: false });
    O.ecrire(c, "chaque piste part vers SON décodeur.", BX, BY + 112, { s: 13, c: "#e5e5ea", g: false });
  }
  function dessiner() {
    const E = etat(), C = CONT[cont];
    rN.parentElement.querySelector("output").textContent = rN.value;
    Application.afficher("#m6a-nom", "A001_C002" + C.ext);
    Application.afficher("#m6a-debit", O.debit(E.debit));
    Application.afficher("#m6a-pistes", "1 V + " + E.na + " A" + (tc ? " + TC" : "") + (st ? " + ST" : ""));
    Application.afficher("#m6a-compat", ["Non prévu", "Possible, rare", "Courant"][E.compat]);
    O.el("m6a-compat").className = ["bad", "", "ok"][E.compat];
    const fautif = E.cv === 0 ? E.v[1] : E.a[1];
    O.note("m6a-msg", ["note bad", "note warn", "note ok"][E.compat],
      E.compat === 0 ? "Le conteneur <b>" + C.nom + "</b> ne prévoit pas le codec <b>" + fautif + "</b> : le démultiplexeur ne sait pas où le trouver, les lecteurs refuseront le fichier. Changer l’extension n’y changerait rien : il faut <b>réencoder</b>, ou choisir un autre conteneur (rewrap)." :
      E.compat === 1 ? "Ce couple est <b>possible</b>, mais peu répandu : beaucoup de logiciels et de lecteurs ne le liront pas. Préférez un couple courant pour " + C.usage + "." :
      "Couple <b>courant</b> : un " + C.nom + " (usage : " + C.usage + ") contenant du " + E.v[1] + " et " + E.na + " piste" + (E.na > 1 ? "s" : "") + " " + E.a[1].split(" ")[0] + ". Débit total ≈ <b>" + O.debit(E.debit) + "</b>, soit " + O.volume(E.debit * 0.45) + " par heure. Le même flux vidéo pourrait être recopié tel quel dans un autre conteneur (rewrap), sans perte.");
    ouverture = 0;
    scene();
  }
  [sV, sA].forEach(s => s.addEventListener("change", dessiner));
  rN.addEventListener("input", dessiner);
  const segC = Application.segment("#m6a-cont", [["mov", "MOV"], ["mp4", "MP4"], ["mxf", "MXF"], ["mkv", "MKV"], ["ts", "TS"]], cont, v => { cont = v; dessiner(); });
  O.el("m6a-plus").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (!b) return; if (b.dataset.p === "tc") tc = !tc; else st = !st; b.setAttribute("aria-pressed", String(b.dataset.p === "tc" ? tc : st)); dessiner(); });
  O.situations("m6a-situ", s => {
    const R = { rush: ["mov", "prores", "pcm", 4, true, false], web: ["mp4", "h264", "aac", 1, false, false], pad: ["mxf", "avci", "pcm", 8, true, false], dcp: ["mxf", "j2k", "pcm", 6, true, true], tnt: ["ts", "h264", "ac3", 2, false, true] }[s];
    sV.value = R[1]; sA.value = R[2]; O.curseur(rN, R[3]); tc = R[4]; st = R[5];
    O.el("m6a-plus").querySelectorAll("[data-p]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === "tc" ? tc : st)));
    cont = R[0]; segC.choisir(R[0]);
  });
  const anim = O.boucle(cv, dt => { t += dt; ouverture += dt * 1.4; scene(); });
  O.boutonPause("m6a-pause", anim, () => { ouverture = 1; scene(); });
  O.curseur(rN, 4);
  dessiner();
});

/* ==========================================================================
   MODULE 6 — LABO 2 : CHOISIR SON CODEC ET PERTES DE GÉNÉRATION
   Chaque codec est imité par la compression JPEG de qualité équivalente
   (simulation : les codecs à GOP long ne sont pas reproduits exactement).
   ========================================================================== */
labo(6, function () {
  const cv = O.el("m6b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const sC = O.el("m6b-codec"), rG = O.el("m6b-g"), bJouer = O.el("m6b-jouer");
  // [clé, nom, Mbit/s en 1080 25p, famille, qualité JPEG équivalente, structure, intra ?]
  const CODECS = [
    ["brut", "Non compressé 4:2:2 10 bits", 1036.8, "ref", 0, "", true],
    ["xq", "ProRes 4444 XQ", 413, "montage", 97, "4:4:4", true],
    ["p4", "ProRes 4444", 275, "montage", 95, "4:4:4", true],
    ["dnx185", "DNxHD 185", 185, "montage", 92, "4:2:2", true],
    ["hq", "ProRes 422 HQ", 184, "montage", 93, "4:2:2", true],
    ["pr", "ProRes 422", 122, "montage", 90, "4:2:2", true],
    ["dnx120", "DNxHD 120", 120, "montage", 88, "4:2:2", true],
    ["avci", "AVC-Intra 100", 100, "tournage", 88, "4:2:2", true],
    ["lt", "ProRes 422 LT", 85, "montage", 85, "4:2:2", true],
    ["xdcam", "XDCAM HD 422 (MPEG-2)", 50, "tournage", 72, "4:2:2", false],
    ["xavcl", "XAVC-L (H.264)", 50, "tournage", 76, "4:2:2", false],
    ["px", "ProRes 422 Proxy", 38, "montage", 62, "4:2:2", true],
    ["dnx36", "DNxHD 36", 36, "montage", 58, "4:2:2", true],
    ["bd", "H.264 Blu-ray", 25, "diffusion", 62, "4:2:0", false],
    ["avchd", "AVCHD (H.264)", 24, "tournage", 58, "4:2:0", false],
    ["web", "H.264 web", 8, "diffusion", 45, "4:2:0", false],
    ["hevc", "HEVC streaming", 4, "diffusion", 45, "4:2:0", false],
    ["av1", "AV1 streaming", 3, "diffusion", 42, "4:2:0", false]
  ];
  const FAM = { ref: ["#8e8e93", "référence"], tournage: ["#ff9f0a", "tournage"], montage: ["#64d2ff", "montage (intra)"], diffusion: ["#30d158", "diffusion"] };
  O.options(sC, CODECS.map(k => [k[0], k[1]]), "hq");
  const im = IMG.pixels(320, 192), cache = {};
  let jeu = false, tJeu = 0;

  function decaler(d, dx) {
    const o = new ImageData(320, 192);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 320; x++) { const sx = O.borne(x - dx, 0, 319), i = (y * 320 + x) * 4, j = (y * 320 + sx) * 4; o.data[i] = d.data[j]; o.data[i + 1] = d.data[j + 1]; o.data[i + 2] = d.data[j + 2]; o.data[i + 3] = 255; }
    return o;
  }
  function psnr(a, b, dx) {
    let se = 0, n = 0;
    const L = (d, i) => 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    for (let y = 0; y < 192; y++) for (let x = 4; x < 316; x++) { const i = (y * 320 + x) * 4, j = (y * 320 + x - dx) * 4, e = L(a, i) - L(b, j); se += e * e; n++; }
    return se ? 10 * Math.log10(255 * 255 / (se / n)) : Infinity;
  }
  function generations(k) {
    if (cache[k[0]]) return cache[k[0]];
    const res = []; let d = im.d, dx = 0;
    for (let g = 1; g <= 10; g++) {
      const pas = g % 2 ? 1 : -1; d = decaler(d, pas); dx += pas;
      if (k[4]) d = JPG.compresser(d, k[4], k[5]).img;
      const cc = document.createElement("canvas"); cc.width = 320; cc.height = 192; cc.getContext("2d").putImageData(d, 0, 0);
      res.push({ cv: cc, psnr: psnr(d, im.d, dx) });
    }
    cache[k[0]] = res;
    return res;
  }

  function dessiner() {
    const k = CODECS.find(x => x[0] === sC.value), g = +rG.value, G = generations(k), r = G[g - 1];
    rG.parentElement.querySelector("output").textContent = g;
    Application.afficher("#m6b-nom", FAM[k[3]][1].split(" (")[0]);
    Application.afficher("#m6b-debit", O.debit(k[2]));
    Application.afficher("#m6b-heure", O.volume(k[2] * 0.45));
    Application.afficher("#m6b-type", k[0] === "brut" ? "—" : k[6] ? "Intra" : "GOP long");
    Application.afficher("#m6b-psnr", isFinite(r.psnr) ? O.nb(r.psnr, 1) + " dB" : "∞");
    O.el("m6b-psnr").className = r.psnr >= 38 ? "ok" : r.psnr < 30 ? "bad" : "";

    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // débits de tous les codecs, échelle logarithmique
    const X0 = 196, X1 = 500, Y0 = 44, rh = 25, X = v => O.log(v, 1, 1500, X0, X1);
    O.ecrire(c, "Débit en HD 1080 à 25 i/s (échelle logarithmique)", 20, 24, { s: 13, c: "#a1a1a6" });
    [1, 10, 100, 1000].forEach(v => { c.strokeStyle = "rgba(255,255,255,.08)"; c.beginPath(); c.moveTo(X(v), Y0 - 4); c.lineTo(X(v), Y0 + CODECS.length * rh); c.stroke(); O.ecrire(c, v >= 1000 ? "1 Gbit/s" : v, X(v), Y0 + CODECS.length * rh + 14, { s: 11, a: "center", c: "#8e8e93" }); });
    CODECS.forEach((x, i) => {
      const y = Y0 + i * rh, on = x === k;
      if (on) { c.fillStyle = "rgba(255,255,255,.08)"; O.rect(c, 14, y - 2, 492, rh - 2, 6); c.fill(); }
      c.globalAlpha = on ? 1 : 0.55;
      O.ecrire(c, x[1].length > 24 ? x[1].slice(0, 23) + "…" : x[1], 20, y + 16, { s: 12, c: on ? "#fff" : "#e5e5ea", g: on });
      c.fillStyle = FAM[x[3]][0]; c.fillRect(X0, y + 4, X(x[2]) - X0, rh - 12);
      if (on) O.ecrire(c, O.debit(x[2]), Math.min(X(x[2]) + 6, X1 - 70), y + 16, { s: 12, c: "#fff" });
      c.globalAlpha = 1;
    });
    let lx = 20; Object.keys(FAM).forEach(f => { c.fillStyle = FAM[f][0]; c.fillRect(lx, Hc - 17, 12, 12); O.ecrire(c, FAM[f][1], lx + 16, Hc - 6, { s: 12, c: "#a1a1a6", g: false }); lx += 26 + c.measureText(FAM[f][1]).width + 10; });
    // l'image après g générations
    const IX = 540, IY = 40, S = 1.375;
    c.imageSmoothingEnabled = false; c.drawImage(r.cv, IX, IY, 320 * S, 192 * S);
    c.drawImage(r.cv, 236, 106, 64, 48, IX + 300, IY + 150, 128, 96); c.imageSmoothingEnabled = true;
    c.strokeStyle = "#ffd60a"; c.lineWidth = 2; c.strokeRect(IX + 300, IY + 150, 128, 96);
    O.ecrire(c, "Après " + g + " génération" + (g > 1 ? "s" : "") + " de " + k[1].split(" (")[0], IX, IY - 12, { s: 13, c: "#ffd60a" });
    // PSNR au fil des générations
    const GX = 560, GY = 336, GW = 410, GH = 150, pmin = 22, pmax = 52, py = v => GY + GH - (O.borne(isFinite(v) ? v : pmax, pmin, pmax) - pmin) / (pmax - pmin) * GH;
    c.fillStyle = "rgba(255,255,255,.04)"; c.fillRect(GX, GY, GW, GH);
    O.ecrire(c, "PSNR après chaque génération (plus haut = plus fidèle)", GX, GY - 10, { s: 13, c: "#a1a1a6" });
    [30, 40, 50].forEach(v => { O.ecrire(c, v + " dB", GX - 6, py(v) + 4, { s: 11, a: "right", c: "#8e8e93" }); c.strokeStyle = "rgba(255,255,255,.07)"; c.beginPath(); c.moveTo(GX, py(v)); c.lineTo(GX + GW, py(v)); c.stroke(); });
    const courbe = (L, coul, ep, tir) => { c.strokeStyle = coul; c.lineWidth = ep; c.setLineDash(tir || []); c.beginPath(); L.forEach((p, j) => { const x = GX + j / 9 * GW, y = py(p.psnr); j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]); };
    if (k[0] !== "hq") courbe(generations(CODECS.find(x => x[0] === "hq")), "rgba(100,210,255,.55)", 1.5, [5, 4]);
    if (k[0] !== "web") courbe(generations(CODECS.find(x => x[0] === "web")), "rgba(48,209,88,.55)", 1.5, [5, 4]);
    courbe(G, "#ffd60a", 2.5);
    c.fillStyle = "#ffd60a"; c.beginPath(); c.arc(GX + (g - 1) / 9 * GW, py(r.psnr), 5, 0, 7); c.fill();
    for (let j = 1; j <= 10; j++) O.ecrire(c, j, GX + (j - 1) / 9 * GW, GY + GH + 16, { s: 11, a: "center", c: "#8e8e93" });
    O.ecrire(c, "pointillés : ProRes 422 HQ (bleu) et H.264 web (vert)", GX, GY + GH + 36, { s: 11, c: "#8e8e93", g: false });

    const p1 = G[0].psnr, pg = r.psnr;
    O.note("m6b-msg", k[0] === "brut" ? "note ok" : pg >= 38 ? "note ok" : pg >= 32 ? "note warn" : "note bad",
      k[0] === "brut" ? "Sans compression, aucune perte : seule la place pose problème (" + O.volume(k[2] * 0.45) + " par heure !)." :
      (k[6] && k[2] >= 80 ? "<b>" + k[1] + "</b> est un codec intra de montage : après " + g + " génération" + (g > 1 ? "s" : "") + ", l’image reste à " + O.nb(pg, 1) + " dB, sans défaut visible. C’est pour cela qu’on monte et qu’on échange les fichiers dans ces codecs." :
      k[3] === "diffusion" ? "<b>" + k[1] + "</b> est fait pour la <b>livraison</b> : " + O.debit(k[2]) + " seulement, mais chaque réencodage dégrade l’image (" + O.nb(p1, 1) + " dB à la première génération, " + O.nb(pg, 1) + " dB à la " + g + "e). Ne l’utilisez qu’une fois, en fin de chaîne." :
      "<b>" + k[1] + "</b> : " + O.debit(k[2]) + ", " + O.volume(k[2] * 0.45) + " par heure. Après " + g + " génération" + (g > 1 ? "s" : "") + " : " + O.nb(pg, 1) + " dB. " + (k[6] ? "Codec intra, léger à monter, mais assez compressé : réservé aux proxys." : "Codec à GOP long : bon compromis au tournage, mais lourd à monter et sensible aux réencodages : on le transcode souvent en ProRes ou DNxHD.")) +
      " <i>(Simulation : chaque codec est imité par une compression JPEG de qualité équivalente.)</i>");
  }
  sC.addEventListener("change", dessiner);
  rG.addEventListener("input", dessiner);
  O.boucle(cv, dt => { if (!jeu) return; tJeu += dt; if (tJeu > 0.55) { tJeu = 0; const g = +rG.value; if (g >= 10) { jeu = false; bJouer.textContent = "▶ Réencoder"; } else O.curseur(rG, g + 1); } });
  bJouer.addEventListener("click", () => {
    if (O.reduit()) { O.curseur(rG, 10); return; }
    jeu = !jeu; if (jeu && +rG.value >= 10) O.curseur(rG, 1);
    bJouer.textContent = jeu ? "⏸ Pause" : "▶ Réencoder";
  });
  dessiner();
});
