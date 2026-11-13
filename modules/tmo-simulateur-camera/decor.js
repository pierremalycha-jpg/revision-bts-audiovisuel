/* ==========================================================================
   decor.js — le plateau TV, dessiné en « 2,5D »
   --------------------------------------------------------------------------
   Le décor est fait de CALQUES : des dessins plats, posés debout à
   différentes profondeurs, comme les plans d'un théâtre de papier. C'est ce
   qu'on appelle la 2,5D : chaque élément est en 2D, mais sa distance à la
   caméra est réelle. Cela suffit pour calculer correctement le cadre, la
   perspective et surtout le flou de chaque plan.

   Chaque calque est dessiné en VECTORIEL (Canvas 2D), en mètres. Il sert
   deux fois :
     - rendu.js le « photographie » à la bonne résolution pour l'image de la
       caméra (même au téléobjectif, les détails restent fins) ;
     - scene.js le pose debout dans la grande scène en perspective.

   Repère du plateau : X vers la droite de la caméra, Y vers le haut,
   Z = profondeur (on s'éloigne de la caméra). Le sol est à Y = 0.
   Repère d'un calque : origine en haut à gauche, x vers la droite, y vers
   le BAS (comme un canvas), en mètres.

   Les couleurs sont celles des objets éclairés par le plateau. Un calque
   « lumineux » (écran LED, barres, abat-jour) émet sa propre lumière : son
   « gain » dit combien de fois il est plus lumineux qu'un blanc éclairé.
   ========================================================================== */

const Decor = (function () {
  "use strict";

  const CAM_Y = 1.35;      // hauteur de l'axe optique (mètres)
  const SUJET_Z = 6;       // la présentatrice
  const FOND_Z = 9.5;      // le mur du fond
  const TAU = Math.PI * 2;

  /* --- Petits outils de dessin ------------------------------------------- */
  function rr(c, x, y, w, h, r) {            // rectangle arrondi (chemin)
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function rect(c, coul, x, y, w, h, r) { c.fillStyle = coul; if (r) { rr(c, x, y, w, h, r); c.fill(); } else c.fillRect(x, y, w, h); }
  function disque(c, coul, x, y, rx, ry, angle) { c.fillStyle = coul; c.beginPath(); c.ellipse(x, y, rx, ry === undefined ? rx : ry, angle || 0, 0, TAU); c.fill(); }
  function trait(c, coul, ep, pts) { c.strokeStyle = coul; c.lineWidth = ep; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); }
  function poly(c, coul, pts) { c.fillStyle = coul; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  function degrade(c, x0, y0, x1, y1, arrets) { const g = c.createLinearGradient(x0, y0, x1, y1); arrets.forEach(function (a, i) { g.addColorStop(i / (arrets.length - 1), a); }); return g; }
  function halo(c, x, y, r, coul) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, coul); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // Texte dont la taille est donnée en mètres (les polices trop petites sont mal dessinées : on passe par une échelle).
  function texte(c, coul, t, x, y, taille, graisse, alignement) {
    c.save(); c.translate(x, y); c.scale(taille / 100, taille / 100);
    c.font = (graisse || "700") + " 100px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    c.textAlign = alignement || "center"; c.textBaseline = "middle"; c.fillStyle = coul; c.fillText(t, 0, 0); c.restore();
  }
  // Suite pseudo-aléatoire reproductible (le décor est le même à chaque visite).
  function hasard(graine) { let s = graine; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  /* ======================================================================
     LE MUR DU FOND — panneaux acoustiques sombres, nervurés, lavés de bleu
     ====================================================================== */
  function fond(c, ppm, fen) {
    const L = 12, H = 4.4;
    c.fillStyle = degrade(c, 0, 0, 0, H, ["#1c2336", "#283250", "#232c46", "#11151f"]);
    c.fillRect(0, 0, L, H);
    // Lumière rasante colorée (projecteurs de décor)
    halo(c, 2.2, 3.9, 3.2, "rgba(70,110,230,.34)");
    halo(c, 9.3, 4.0, 3.4, "rgba(170,80,210,.26)");
    halo(c, 6.6, 0.2, 2.6, "rgba(60,150,200,.16)");
    // Nervures verticales des panneaux (détail fin, visible quand le fond est net)
    if (ppm > 60) {
      const pas = 0.04;
      for (let x = Math.floor(fen.x0 / pas) * pas; x < fen.x1; x += pas) {
        c.fillStyle = "rgba(0,0,0,.20)"; c.fillRect(x, 0, 0.011, H);
        c.fillStyle = "rgba(255,255,255,.035)"; c.fillRect(x + 0.011, 0, 0.006, H);
      }
    }
    // Joints entre panneaux, tous les 1,2 m
    for (let x = 0; x <= L + 0.01; x += 1.2) { rect(c, "#090c13", x - 0.014, 0, 0.028, H); rect(c, "rgba(255,255,255,.07)", x + 0.014, 0, 0.008, H); }
    rect(c, "#090c13", 0, 1.5, L, 0.02); rect(c, "#090c13", 0, 3.3, L, 0.02);
    // Titre en relief, ton sur ton (un détail dans les basses lumières)
    texte(c, "rgba(255,255,255,.055)", "PLATEAU 1", 7.9, 1.05, 0.34, "800");
    // Soubassement et plinthe
    rect(c, "#0c0f17", 0, 3.72, L, 0.68);
    rect(c, "rgba(120,170,255,.16)", 0, 3.70, L, 0.025);
  }

  /* L'ÉCRAN LED (lumineux) — un habillage de journal : ciel, ville, titre */
  function ecran(c, ppm) {
    const L = 2.6, H = 1.46;
    rect(c, "#05070b", -0.04, -0.04, L + 0.08, H + 0.08, 0.03);
    c.save(); rr(c, 0, 0, L, H, 0.012); c.clip();
    c.fillStyle = degrade(c, 0, 0, 0, H, ["#7fc0ff", "#cfe6ff", "#ffe9c9", "#ffd3a1"]);
    c.fillRect(0, 0, L, H);
    halo(c, 1.95, 0.95, 0.9, "rgba(255,255,255,.95)");
    // Nuages : à peine plus sombres que le ciel (ils disparaissent si les blancs sont écrêtés)
    [[0.5, 0.3, 0.42], [1.25, 0.2, 0.3], [2.05, 0.38, 0.36], [0.95, 0.52, 0.26]].forEach(function (n) {
      c.fillStyle = "rgba(150,175,215,.5)";
      c.beginPath(); c.ellipse(n[0], n[1], n[2], n[2] * 0.2, 0, 0, TAU); c.ellipse(n[0] - n[2] * 0.4, n[1] + 0.03, n[2] * 0.5, n[2] * 0.15, 0, 0, TAU); c.ellipse(n[0] + n[2] * 0.35, n[1] - 0.03, n[2] * 0.45, n[2] * 0.16, 0, 0, TAU); c.fill();
    });
    // La ville
    const h = hasard(7);
    for (let x = 0; x < L; ) {
      const l = 0.09 + h() * 0.16, ht = 0.22 + h() * 0.5;
      c.fillStyle = h() > 0.5 ? "#3d6cb0" : "#2f5894"; c.fillRect(x, H - 0.34 - ht, l, ht + 0.4);
      if (ppm > 120) { c.fillStyle = "rgba(255,240,200,.75)"; for (let yy = H - 0.3 - ht; yy < H - 0.36; yy += 0.06) for (let xx = x + 0.02; xx < x + l - 0.03; xx += 0.04) if (h() > 0.45) c.fillRect(xx, yy, 0.018, 0.026); }
      x += l + 0.012;
    }
    // Bandeau et titre
    rect(c, "#c8102e", 0, H - 0.3, L, 0.3);
    rect(c, "#ffffff", 0, H - 0.3, L, 0.012);
    texte(c, "#ffffff", "LE DIRECT", 0.12, H - 0.15, 0.17, "800", "left");
    texte(c, "rgba(255,255,255,.92)", "20:00", L - 0.12, H - 0.15, 0.15, "600", "right");
    // La trame des LED, visible seulement de très près
    if (ppm > 900) { c.fillStyle = "rgba(0,0,0,.22)"; for (let x = 0; x < L; x += 0.004) c.fillRect(x, 0, 0.0012, H); for (let y = 0; y < H; y += 0.004) c.fillRect(0, y, L, 0.0012); }
    c.restore();
  }

  /* LES BARRES LED (lumineuses) — des traits très clairs sur fond sombre :
     l'endroit idéal pour voir l'aberration chromatique sur les bords du cadre. */
  const BARRES = [[1.3, "#ffe3bd"], [2.5, "#aee9ff"], [7.05, "#ffe3bd"], [8.75, "#aee9ff"], [10.6, "#ffe3bd"], [0.4, "#aee9ff"], [11.6, "#ffe3bd"]];
  function barres(c) {
    BARRES.forEach(function (b) { rect(c, b[1], b[0] - 0.024, 0.45, 0.048, 3.2, 0.02); });
  }

  /* L'ÉTAGÈRE, à droite au fond : livres, cadre, plante */
  function etagere(c, ppm) {
    const L = 1.3, H = 2.2;
    rect(c, "#6b4a33", 0, 0, L, H, 0.02);
    rect(c, "#2a1d15", 0.05, 0.05, L - 0.1, H - 0.1);
    const h = hasard(21);
    const teintes = ["#b8433a", "#d9a441", "#3d7ea6", "#4f8a5b", "#e6dccb", "#7b4f8f", "#2f4858", "#c96f3b"];
    [0.52, 0.99, 1.46, 1.93].forEach(function (y, rang) {
      rect(c, "#8a6244", 0.05, y, L - 0.1, 0.045);
      if (rang === 0) return; // tablette du haut : la lampe (calque lumineux) et un cadre
      for (let x = 0.09; x < L - 0.2; ) {
        const l = 0.028 + h() * 0.04, ht = 0.24 + h() * 0.14;
        if (h() > 0.84) { x += 0.07; continue; }
        const coul = teintes[Math.floor(h() * teintes.length)];
        rect(c, coul, x, y - ht, l, ht);
        if (ppm > 200) { rect(c, "rgba(255,255,255,.55)", x + l * 0.2, y - ht * 0.82, l * 0.6, 0.012); rect(c, "rgba(0,0,0,.35)", x + l * 0.2, y - ht * 0.3, l * 0.6, 0.006); }
        rect(c, "rgba(0,0,0,.25)", x + l - 0.004, y - ht, 0.004, ht);
        x += l + 0.003;
      }
    });
    // Cadre photo et pied de lampe sur la tablette du haut
    rect(c, "#d8cdbb", 0.16, 0.2, 0.26, 0.32); rect(c, "#52708f", 0.185, 0.225, 0.21, 0.27);
    disque(c, "#e9c9a0", 0.29, 0.33, 0.045); poly(c, "#27384d", [0.2, 0.495, 0.24, 0.4, 0.34, 0.4, 0.38, 0.495]);
    rect(c, "#3b3f46", 0.86, 0.3, 0.025, 0.22); disque(c, "#3b3f46", 0.872, 0.515, 0.09, 0.016);
  }
  function abatJour(c) {
    c.fillStyle = degrade(c, 0, 0.05, 0, 0.32, ["#ffd9a0", "#ffb866"]);
    c.beginPath(); c.moveTo(0.79, 0.06); c.lineTo(0.955, 0.06); c.lineTo(1.03, 0.31); c.lineTo(0.715, 0.31); c.closePath(); c.fill();
  }

  /* LA ROUE DE JEU — elle tourne : c'est elle qui montre le flou de bougé */
  const ROUE = { cx: 0.65, cy: 0.6, r: 0.5 };
  function roue(c, ppm) {
    // Le pied (fixe)
    rect(c, "#3a3f49", ROUE.cx - 0.035, ROUE.cy, 0.07, 1.42);
    rr(c, ROUE.cx - 0.3, 2.02, 0.6, 0.08, 0.03); c.fillStyle = "#2b2f37"; c.fill();
    // Le disque
    const teintes = ["#e5483b", "#f4c63d", "#39b56a", "#3c8fde", "#9b5fc0", "#f3efe6"];
    for (let i = 0; i < 12; i++) {
      c.fillStyle = teintes[i % 6];
      c.beginPath(); c.moveTo(ROUE.cx, ROUE.cy); c.arc(ROUE.cx, ROUE.cy, ROUE.r - 0.03, i * TAU / 12, (i + 1) * TAU / 12 + 0.002); c.closePath(); c.fill();
    }
    c.strokeStyle = "#20242c"; c.lineWidth = 0.035; c.beginPath(); c.arc(ROUE.cx, ROUE.cy, ROUE.r - 0.02, 0, TAU); c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) * TAU / 12;
      c.save(); c.translate(ROUE.cx + Math.cos(a) * 0.33, ROUE.cy + Math.sin(a) * 0.33); c.rotate(a + Math.PI / 2);
      texte(c, i % 6 === 5 || i % 6 === 1 ? "#20242c" : "#ffffff", String((i * 7) % 12 + 1), 0, 0, 0.1, "800"); c.restore();
      const b = i * TAU / 12;
      trait(c, "rgba(20,24,30,.55)", 0.006, [ROUE.cx, ROUE.cy, ROUE.cx + Math.cos(b) * 0.46, ROUE.cy + Math.sin(b) * 0.46]);
      disque(c, "#f4f1ea", ROUE.cx + Math.cos(b) * 0.478, ROUE.cy + Math.sin(b) * 0.478, 0.011);
    }
    disque(c, "#20242c", ROUE.cx, ROUE.cy, 0.085); disque(c, "#d9b45a", ROUE.cx, ROUE.cy, 0.05); disque(c, "#20242c", ROUE.cx, ROUE.cy, 0.016);
    // Le repère (fixe, juste au-dessus du disque)
    poly(c, "#f4f1ea", [ROUE.cx - 0.045, ROUE.cy - 0.6, ROUE.cx + 0.045, ROUE.cy - 0.6, ROUE.cx, ROUE.cy - 0.505]);
  }

  /* LA PRÉSENTATRICE — assise derrière le pupitre. Les détails fins (iris,
     cils, cheveux, rayures de la veste) servent à juger la netteté ; la
     veste et les cheveux sombres servent à juger les noirs. */
  function presentatrice(c, ppm) {
    const X = 0.55;
    // Cheveux, derrière la tête
    c.fillStyle = "#1d130e";
    c.beginPath(); c.moveTo(X - 0.105, 0.2); c.bezierCurveTo(X - 0.12, 0.06, X + 0.12, 0.06, X + 0.105, 0.2); c.bezierCurveTo(X + 0.125, 0.3, X + 0.12, 0.37, X + 0.1, 0.4); c.lineTo(X - 0.1, 0.4); c.bezierCurveTo(X - 0.12, 0.37, X - 0.125, 0.3, X - 0.105, 0.2); c.fill();
    // Buste : veste bleu nuit
    c.fillStyle = degrade(c, X - 0.25, 0, X + 0.25, 0, ["#111a2b", "#1a2740", "#141e31", "#0e1524"]);
    c.beginPath(); c.moveTo(X - 0.065, 0.36); c.bezierCurveTo(X - 0.17, 0.38, X - 0.235, 0.41, X - 0.25, 0.5); c.lineTo(X - 0.27, 1.05); c.lineTo(X + 0.27, 1.05); c.lineTo(X + 0.25, 0.5); c.bezierCurveTo(X + 0.235, 0.41, X + 0.17, 0.38, X + 0.065, 0.36); c.closePath(); c.fill();
    if (ppm > 500) { // fines rayures de la veste
      c.save(); c.clip(); c.fillStyle = "rgba(120,150,200,.22)";
      for (let x = X - 0.27; x < X + 0.27; x += 0.011) c.fillRect(x, 0.36, 0.0016, 0.7);
      c.restore();
    }
    // Chemisier clair
    poly(c, "#ece7df", [X - 0.062, 0.365, X + 0.062, 0.365, X + 0.012, 0.62, X - 0.012, 0.62]);
    poly(c, "rgba(0,0,0,.10)", [X - 0.004, 0.44, X + 0.004, 0.44, X + 0.004, 0.62, X - 0.004, 0.62]);
    // Revers de la veste
    poly(c, "#22314d", [X - 0.068, 0.36, X - 0.115, 0.4, X - 0.02, 0.63, X - 0.012, 0.6]);
    poly(c, "#22314d", [X + 0.068, 0.36, X + 0.115, 0.4, X + 0.02, 0.63, X + 0.012, 0.6]);
    trait(c, "rgba(0,0,0,.45)", 0.003, [X - 0.115, 0.4, X - 0.02, 0.63]); trait(c, "rgba(0,0,0,.45)", 0.003, [X + 0.115, 0.4, X + 0.02, 0.63]);
    trait(c, "rgba(90,110,150,.5)", 0.003, [X - 0.2, 0.47, X - 0.215, 0.95]); trait(c, "rgba(90,110,150,.5)", 0.003, [X + 0.2, 0.47, X + 0.215, 0.95]);
    disque(c, "#2e3f5e", X + 0.006, 0.7, 0.009); disque(c, "#2e3f5e", X + 0.006, 0.8, 0.009);
    // Cou
    c.fillStyle = degrade(c, 0, 0.3, 0, 0.39, ["#b9805f", "#cf9774"]);
    c.beginPath(); c.moveTo(X - 0.04, 0.29); c.lineTo(X + 0.04, 0.29); c.lineTo(X + 0.046, 0.372); c.quadraticCurveTo(X, 0.4, X - 0.046, 0.372); c.closePath(); c.fill();
    // Oreilles et boucles
    disque(c, "#c98d6b", X - 0.079, 0.218, 0.012, 0.022); disque(c, "#c98d6b", X + 0.079, 0.218, 0.012, 0.022);
    disque(c, "#e8c76a", X - 0.081, 0.246, 0.0042); disque(c, "#e8c76a", X + 0.081, 0.246, 0.0042);
    // Visage
    const g = c.createRadialGradient(X - 0.02, 0.19, 0.01, X, 0.21, 0.12); g.addColorStop(0, "#e2ad8c"); g.addColorStop(0.7, "#d69e7c"); g.addColorStop(1, "#bd8463");
    c.fillStyle = g; c.beginPath(); c.moveTo(X - 0.078, 0.19); c.bezierCurveTo(X - 0.08, 0.09, X + 0.08, 0.09, X + 0.078, 0.19); c.bezierCurveTo(X + 0.078, 0.27, X + 0.045, 0.322, X, 0.326); c.bezierCurveTo(X - 0.045, 0.322, X - 0.078, 0.27, X - 0.078, 0.19); c.fill();
    disque(c, "rgba(214,110,100,.20)", X - 0.047, 0.248, 0.019, 0.013); disque(c, "rgba(214,110,100,.20)", X + 0.047, 0.248, 0.019, 0.013);
    // Yeux
    [-1, 1].forEach(function (s) {
      const ex = X + s * 0.033, ey = 0.207;
      c.fillStyle = "#f3ede6"; c.beginPath(); c.moveTo(ex - 0.016, ey); c.quadraticCurveTo(ex, ey - 0.0105, ex + 0.016, ey); c.quadraticCurveTo(ex, ey + 0.0085, ex - 0.016, ey); c.fill();
      c.save(); c.clip();
      disque(c, "#3a2414", ex, ey - 0.0005, 0.0068); disque(c, "#7a5230", ex, ey - 0.0005, 0.0059);
      if (ppm > 2500) { c.strokeStyle = "rgba(40,22,10,.55)"; c.lineWidth = 0.0003; for (let i = 0; i < 28; i++) { const a = i * TAU / 28; c.beginPath(); c.moveTo(ex + Math.cos(a) * 0.003, ey + Math.sin(a) * 0.003); c.lineTo(ex + Math.cos(a) * 0.0058, ey + Math.sin(a) * 0.0058); c.stroke(); } }
      disque(c, "#0c0806", ex, ey - 0.0005, 0.0027);
      disque(c, "#ffffff", ex - 0.002, ey - 0.0028, 0.0012);
      c.restore();
      c.strokeStyle = "#2a1a12"; c.lineWidth = 0.0018; c.lineCap = "round"; c.beginPath(); c.moveTo(ex - 0.0165, ey + 0.0005); c.quadraticCurveTo(ex, ey - 0.0115, ex + 0.0165, ey + 0.0005); c.stroke();
      if (ppm > 1500) for (let i = 0; i < 9; i++) { const k = i / 8, px = ex - 0.015 + k * 0.03, py = ey - 0.0105 * 4 * k * (1 - k) * 0.55 - 0.0002; trait(c, "#2a1a12", 0.0005, [px, py, px + s * 0.0015 + (k - 0.5) * 0.004, py - 0.0038]); }
      // Sourcil
      c.strokeStyle = "#2b1b13"; c.lineWidth = 0.0052; c.beginPath(); c.moveTo(ex - s * 0.02, ey - 0.02); c.quadraticCurveTo(ex, ey - 0.0285, ex + s * 0.021, ey - 0.0215); c.stroke();
    });
    // Nez, bouche
    c.strokeStyle = "rgba(150,90,60,.6)"; c.lineWidth = 0.0022; c.beginPath(); c.moveTo(X + 0.004, 0.215); c.quadraticCurveTo(X + 0.011, 0.25, X + 0.002, 0.258); c.stroke();
    disque(c, "rgba(140,80,55,.45)", X - 0.008, 0.2605, 0.0032, 0.0018); disque(c, "rgba(140,80,55,.45)", X + 0.009, 0.2605, 0.0032, 0.0018);
    c.fillStyle = "#b25a55"; c.beginPath(); c.moveTo(X - 0.027, 0.284); c.quadraticCurveTo(X - 0.008, 0.276, X, 0.279); c.quadraticCurveTo(X + 0.008, 0.276, X + 0.027, 0.284); c.quadraticCurveTo(X, 0.3, X - 0.027, 0.284); c.fill();
    trait(c, "rgba(100,40,40,.7)", 0.0012, [X - 0.026, 0.2842, X, 0.2858, X + 0.026, 0.2842]);
    // Frange et mèches
    c.fillStyle = "#1d130e"; c.beginPath(); c.moveTo(X - 0.083, 0.2); c.bezierCurveTo(X - 0.09, 0.1, X - 0.03, 0.075, X + 0.02, 0.085); c.bezierCurveTo(X + 0.07, 0.09, X + 0.092, 0.13, X + 0.083, 0.2); c.bezierCurveTo(X + 0.075, 0.15, X + 0.045, 0.125, X + 0.012, 0.12); c.bezierCurveTo(X - 0.03, 0.13, X - 0.07, 0.15, X - 0.083, 0.2); c.fill();
    if (ppm > 400) {
      const h = hasard(5);
      for (let i = 0; i < 46; i++) {
        const cote = i % 2 ? 1 : -1, d = 0.096 + h() * 0.022, y0 = 0.12 + h() * 0.1;
        c.strokeStyle = h() > 0.5 ? "rgba(96,64,44,.55)" : "rgba(60,40,28,.7)"; c.lineWidth = 0.0009 + h() * 0.0008;
        c.beginPath(); c.moveTo(X + cote * (d - 0.006), y0); c.quadraticCurveTo(X + cote * (d + 0.008), y0 + 0.12, X + cote * (d - 0.002), y0 + 0.2 + h() * 0.06); c.stroke();
      }
      for (let i = 0; i < 14; i++) { const x0 = X - 0.06 + i * 0.009; trait(c, "rgba(96,64,44,.5)", 0.0009, [x0, 0.085 + Math.abs(i - 7) * 0.003, x0 + (i - 7) * 0.004, 0.125]); }
    }
    // Micro-cravate sur le revers
    trait(c, "#05070a", 0.0022, [X + 0.062, 0.52, X + 0.075, 0.62, X + 0.11, 0.75]);
    rect(c, "#0b0d11", X + 0.05, 0.492, 0.024, 0.014, 0.003); rect(c, "#14171d", X + 0.054, 0.468, 0.016, 0.028, 0.006);
    if (ppm > 1500) { c.fillStyle = "rgba(160,170,190,.5)"; for (let i = 0; i < 4; i++) c.fillRect(X + 0.056, 0.472 + i * 0.0055, 0.012, 0.0014); }
  }

  /* LE PUPITRE — une façade claire (repère de blanc) et quelques objets */
  function pupitre(c, ppm) {
    const L = 2.0, T = 0.25;
    // Objets posés : tasse, feuilles, stylo
    rect(c, "#c8302c", 1.52, T - 0.105, 0.085, 0.105, 0.012); rect(c, "#f2efe9", 1.52, T - 0.07, 0.085, 0.022);
    c.strokeStyle = "#c8302c"; c.lineWidth = 0.014; c.beginPath(); c.arc(1.612, T - 0.055, 0.026, -1.3, 1.3); c.stroke();
    poly(c, "#f4f2ec", [0.3, T - 0.012, 0.66, T - 0.018, 0.68, T, 0.28, T]);
    if (ppm > 600) for (let i = 0; i < 5; i++) trait(c, "rgba(60,60,70,.55)", 0.0012, [0.33 + i * 0.004, T - 0.01 + i * 0.0018, 0.62, T - 0.014 + i * 0.0022]);
    trait(c, "#1c4fa0", 0.008, [0.72, T - 0.008, 0.86, T - 0.014]);
    // Plateau et façade
    rect(c, "#20242c", 0, T, L, 0.045, 0.012);
    c.fillStyle = degrade(c, 0, T, 0, 1.05, ["#d9dee5", "#c6ccd5", "#aab2bd"]); rr(c, 0.06, T + 0.045, L - 0.12, 0.76, 0.02); c.fill();
    rect(c, "#3fc3d6", 0.06, T + 0.085, L - 0.12, 0.022);
    c.fillStyle = degrade(c, 0, 0, L, 0, ["#7a5638", "#94694a", "#7a5638"]); rr(c, 0.5, T + 0.2, 1.0, 0.44, 0.02); c.fill();
    if (ppm > 250) { c.fillStyle = "rgba(40,24,12,.3)"; for (let y = T + 0.215; y < T + 0.63; y += 0.022) c.fillRect(0.5, y, 1.0, 0.0035); }
    disque(c, "#f6f3ee", 1.0, T + 0.42, 0.13); disque(c, "#c8102e", 1.0, T + 0.42, 0.105);
    texte(c, "#ffffff", "20", 1.0, T + 0.425, 0.13, "800");
    rect(c, "#14171d", 0.06, 1.01, L - 0.12, 0.04);
  }

  /* LA MIRE — sur son chevalet, dans le plan de la présentatrice */
  function mire(c, ppm) {
    // Chevalet
    trait(c, "#8a6a48", 0.03, [0.45, 0.16, 0.14, 1.74]); trait(c, "#8a6a48", 0.03, [0.45, 0.16, 0.76, 1.74]); trait(c, "#6f5539", 0.028, [0.45, 0.16, 0.45, 1.7]);
    rect(c, "#6f5539", 0.1, 0.95, 0.7, 0.03);
    // Carton
    const x0 = 0.09, y0 = 0.43, L = 0.72, H = 0.5;
    rect(c, "#101216", x0 - 0.012, y0 - 0.012, L + 0.024, H + 0.024, 0.006);
    rect(c, "#f1f0ec", x0, y0, L, H);
    // Échelle de gris : 11 marches régulières (on les retrouve en escalier sur l'oscilloscope)
    for (let i = 0; i < 11; i++) { const v = Math.round(13 + i * 22.9); rect(c, "rgb(" + v + "," + v + "," + v + ")", x0 + 0.03 + i * 0.06, y0 + 0.03, 0.0605, 0.075); }
    // Étoile de Siemens : des secteurs de plus en plus fins vers le centre
    const sx = x0 + L - 0.17, sy = y0 + 0.285, sr = 0.125;
    disque(c, "#fbfaf7", sx, sy, sr);
    c.fillStyle = "#0d0e11";
    for (let i = 0; i < 36; i++) { c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, sr, i * TAU / 36, (i + 0.5) * TAU / 36); c.closePath(); c.fill(); }
    disque(c, "#fbfaf7", sx, sy, 0.004);
    // Pastilles de couleur
    ["#c23b32", "#3f9b52", "#2f5fb3", "#3fb7c4", "#b9479a", "#e3c63d"].forEach(function (coul, i) { rect(c, coul, x0 + 0.03 + (i % 3) * 0.118, y0 + 0.14 + Math.floor(i / 3) * 0.105, 0.108, 0.095); });
    // Mires de traits : groupes de plus en plus serrés
    let x = x0 + 0.03;
    [0.008, 0.004, 0.002, 0.001, 0.0005].forEach(function (pas) {
      if (pas * ppm > 0.35) for (let i = 0; i < 5; i++) rect(c, "#0d0e11", x + i * 2 * pas, y0 + 0.365, pas, 0.075);
      else rect(c, "#7f7f7f", x, y0 + 0.365, 9 * pas, 0.075);
      x += 9 * pas + 0.018;
    });
    // Carré incliné (un bord franc pour repérer les franges colorées)
    c.save(); c.translate(x0 + 0.31, y0 + 0.403); c.rotate(0.14); rect(c, "#0d0e11", -0.036, -0.036, 0.072, 0.072); c.restore();
    texte(c, "#0d0e11", "MIRE DE RÉGLAGE", x0 + 0.03, y0 + 0.465, 0.024, "700", "left");
  }

  /* LA PLANTE — au premier plan, près de la caméra : c'est elle qui devient
     très floue quand la profondeur de champ est courte. */
  function plante(c, ppm) {
    // Sellette et pot
    rect(c, "#2a2d34", 0.41, 0.98, 0.08, 0.62); rect(c, "#2a2d34", 0.28, 1.56, 0.34, 0.04, 0.015);
    c.fillStyle = degrade(c, 0.3, 0, 0.6, 0, ["#d7d2c8", "#f1ede4", "#c4beb3"]);
    c.beginPath(); c.moveTo(0.3, 0.72); c.lineTo(0.6, 0.72); c.lineTo(0.565, 0.98); c.lineTo(0.335, 0.98); c.closePath(); c.fill();
    rect(c, "#3b2a20", 0.31, 0.71, 0.28, 0.022, 0.01);
    // Feuilles
    const feuilles = [[0.45, 0.72, -1.9, 0.5, 0.11], [0.45, 0.72, -1.25, 0.56, 0.12], [0.44, 0.72, -2.5, 0.42, 0.1], [0.46, 0.72, -0.75, 0.44, 0.1], [0.45, 0.72, -1.58, 0.66, 0.13], [0.45, 0.72, -2.15, 0.6, 0.1], [0.45, 0.72, -0.98, 0.62, 0.105], [0.45, 0.72, -2.85, 0.3, 0.085], [0.45, 0.72, -0.35, 0.3, 0.085]];
    const verts = ["#256b45", "#2f8756", "#1d5537", "#3a9b63"];
    feuilles.forEach(function (f, i) {
      const ex = f[0] + Math.cos(f[2]) * f[3], ey = f[1] + Math.sin(f[2]) * f[3];
      trait(c, "#1d5537", 0.012, [f[0], f[1], f[0] + Math.cos(f[2]) * f[3] * 0.5, f[1] + Math.sin(f[2]) * f[3] * 0.5]);
      const mx = f[0] + Math.cos(f[2]) * f[3] * 0.68, my = f[1] + Math.sin(f[2]) * f[3] * 0.68;
      disque(c, verts[i % 4], mx, my, f[3] * 0.36, f[4], f[2]);
      trait(c, "rgba(200,235,205,.35)", 0.004, [f[0] + Math.cos(f[2]) * f[3] * 0.36, f[1] + Math.sin(f[2]) * f[3] * 0.36, ex, ey]);
      if (ppm > 300) for (let k = -2; k <= 2; k++) { if (!k) continue; const t = 0.5 + k * 0.1, px = f[0] + Math.cos(f[2]) * f[3] * t, py = f[1] + Math.sin(f[2]) * f[3] * t, n = f[2] + (k > 0 ? 1 : -1) * 1.1; trait(c, "rgba(200,235,205,.22)", 0.002, [px, py, px + Math.cos(n) * f[4] * 0.7, py + Math.sin(n) * f[4] * 0.7]); }
    });
  }

  /* ======================================================================
     LA LISTE DES CALQUES, du plus lointain au plus proche (ordre de dessin).
     x, y : coin bas gauche sur le plateau ; l, h : largeur et hauteur (m).
     ====================================================================== */
  const calques = [
    { id: "fond", nom: "Mur du fond", z: FOND_Z, x: -6, y: 0, l: 12, h: 4.4, gain: 1, eclaire: true, dessiner: fond },
    { id: "ecran", nom: "Écran LED", z: FOND_Z - 0.04, x: -3.0, y: 1.45, l: 2.6, h: 1.46, gain: 3, eclaire: false, dessiner: ecran },
    { id: "barres", nom: "Barres LED", z: FOND_Z - 0.03, x: -6, y: 0, l: 12, h: 4.4, gain: 6, eclaire: false, dessiner: barres },
    { id: "sol", nom: "Sol", sol: true, gain: 1, eclaire: true },
    { id: "etagere", nom: "Étagère", z: 8.4, x: 3.05, y: 0, l: 1.3, h: 2.2, gain: 1, eclaire: true, dessiner: etagere },
    { id: "lampe", nom: "Lampe", z: 8.39, x: 3.05, y: 0, l: 1.3, h: 2.2, gain: 3.5, eclaire: false, dessiner: abatJour },
    { id: "roue", nom: "Roue", z: 7.8, x: 0.85, y: 0, l: 1.3, h: 2.1, gain: 1, eclaire: true, dessiner: roue, roue: ROUE },
    { id: "presentatrice", nom: "Présentatrice", z: SUJET_Z, x: -0.55, y: 0, l: 1.1, h: 1.45, gain: 1, eclaire: true, dessiner: presentatrice },
    { id: "mire", nom: "Mire", z: SUJET_Z, x: -1.3, y: 0, l: 0.9, h: 1.75, gain: 1, eclaire: true, dessiner: mire },
    { id: "pupitre", nom: "Pupitre", z: 5.55, x: -1, y: 0, l: 2.0, h: 1.05, gain: 1, eclaire: true, dessiner: pupitre },
    { id: "plante", nom: "Plante", z: 4.0, x: -1.42, y: 0, l: 0.9, h: 1.6, gain: 1, eclaire: true, dessiner: plante }
  ];

  /* LES POINTS LUMINEUX — de petites LED nues. Nettes, ce sont des points
     (et des étoiles à petite ouverture) ; floues, elles deviennent des
     disques qui prennent la forme du diaphragme (le « bokeh »).
     lum : luminance, en multiples du blanc ; diam : diamètre réel (m). */
  const lumieres = [];
  (function () {
    const h = hasard(11);
    const chauds = [[1, 0.72, 0.42], [1, 0.82, 0.58], [1, 0.62, 0.32]], froids = [[0.6, 0.85, 1], [0.75, 0.7, 1], [1, 0.5, 0.65]];
    for (let i = 0; i < 34; i++) {
      const x = -5.2 + h() * 10.4, y = 0.7 + h() * 3.2;
      if (x > -3.15 && x < -0.25 && y > 1.35 && y < 3.0) continue; // pas devant l'écran
      const coul = h() > 0.3 ? chauds[Math.floor(h() * 3)] : froids[Math.floor(h() * 3)];
      lumieres.push({ x: x, y: y, z: FOND_Z - 0.2, couleur: coul, lum: 500 + h() * 900, diam: 0.012, apres: "barres" });
    }
    // Deux petites LED sur l'étagère, plus proches
    lumieres.push({ x: 3.4, y: 1.3, z: 8.38, couleur: [1, 0.8, 0.55], lum: 700, diam: 0.01, apres: "lampe" });
    lumieres.push({ x: 4.0, y: 0.82, z: 8.38, couleur: [0.6, 0.85, 1], lum: 600, diam: 0.01, apres: "lampe" });
  })();

  /* ======================================================================
     LE SOL — un cas à part : ce n'est pas un plan debout, sa distance change
     à chaque ligne de l'image. On le dessine donc DÉJÀ EN PERSPECTIVE, tel
     que le voit un œil placé à la position de la caméra, sur un « calque
     virtuel » situé à 1 m devant elle. Coordonnées de ce calque :
       x = X / profondeur + 6        y = hauteur caméra / profondeur − yLoin
     Le sol porte des repères de distance (tous les 50 cm, chiffrés tous les
     mètres) : on y lit directement où commence et où finit la zone nette.
     ====================================================================== */
  const SOL = { demiLargeur: 6, presMin: 0.45 };
  function solGeometrie(camZ) {
    const yLoin = CAM_Y / (FOND_Z - camZ);
    return { yLoin: yLoin, l: 2 * SOL.demiLargeur, h: CAM_Y / SOL.presMin - yLoin };
  }
  function dessinerSol(c, ppm, fen, camZ) {
    const geo = solGeometrie(camZ);
    const P = function (X, zr) { return [X / zr + SOL.demiLargeur, CAM_Y / zr - geo.yLoin]; };
    const zFond = FOND_Z - camZ;
    c.fillStyle = degrade(c, 0, 0, 0, geo.h, ["#141821", "#12151c", "#0d0f14"]);
    c.fillRect(0, 0, geo.l, geo.h);
    // Reflets des calques sur le sol brillant (le calque, retourné, atténué)
    calques.forEach(function (k) {
      if (k.sol) return;
      const zr = k.z - camZ;
      if (zr < 0.6) return;
      c.save();
      c.translate(k.x / zr + SOL.demiLargeur, (CAM_Y + k.y + k.h) / zr - geo.yLoin); c.scale(1 / zr, -1 / zr);
      c.globalAlpha = k.eclaire ? 0.07 : 0.14;
      k.dessiner(c, ppm / zr, { x0: 0, y0: 0, x1: k.l, y1: k.h });
      c.restore();
    });
    // La flaque de lumière autour du pupitre (anneaux concentriques projetés)
    for (let i = 8; i >= 1; i--) {
      c.fillStyle = "rgba(150,170,210,.022)"; c.beginPath();
      for (let a = 0; a < 40; a++) { const an = a * TAU / 40, zr = SUJET_Z - 0.4 - camZ + Math.sin(an) * 0.28 * i, p = P(Math.cos(an) * 0.42 * i, Math.max(zr, 0.5)); if (a) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
      c.closePath(); c.fill();
    }
    // Ombres de contact sous les éléments
    [["pupitre", 1.05, 0.3], ["plante", 0.2, 0.14], ["mire", 0.36, 0.2], ["roue", 0.32, 0.14], ["etagere", 0.7, 0.2]].forEach(function (o) {
      const k = calques.find(function (q) { return q.id === o[0]; }), zr = k.z - camZ;
      if (zr < 0.7) return;
      c.fillStyle = "rgba(0,0,0,.5)"; c.beginPath();
      for (let a = 0; a < 28; a++) { const an = a * TAU / 28, p = P(k.x + k.l / 2 + Math.cos(an) * o[1], Math.max(zr + Math.sin(an) * o[2], 0.5)); if (a) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
      c.closePath(); c.fill();
    });
    // Repères de distance : une ligne tous les 50 cm, un chiffre tous les mètres
    for (let d = 0.5; d < zFond; d += 0.5) {
      const entier = Math.abs(d - Math.round(d)) < 0.01;
      const y = CAM_Y / d - geo.yLoin, ep = (entier ? 0.016 : 0.008) * CAM_Y / (d * d);
      c.fillStyle = entier ? "rgba(235,240,255,.34)" : "rgba(235,240,255,.15)";
      c.fillRect(0, y - ep / 2, geo.l, ep);
      if (entier) [-1.9, 1.9].forEach(function (X) {
        // Un texte couché sur le sol : on applique localement la même perspective.
        c.save(); c.transform(1 / d, 0, X / (d * d), CAM_Y / (d * d), X / d + SOL.demiLargeur, y);
        texte(c, "rgba(255,214,90,.9)", d + " m", 0, -0.13, 0.17, "800"); c.restore();
      });
    }
    // Lignes fuyantes, tous les mètres en largeur
    for (let X = -5; X <= 5; X++) {
      const a = P(X - 0.006, SOL.presMin), b = P(X + 0.006, SOL.presMin), e = P(X + 0.006, zFond), f = P(X - 0.006, zFond);
      poly(c, "rgba(235,240,255,.10)", [a[0], a[1], b[0], b[1], e[0], e[1], f[0], f[1]]);
    }
  }

  return {
    CAM_Y: CAM_Y, SUJET_Z: SUJET_Z, FOND_Z: FOND_Z,
    calques: calques, lumieres: lumieres, ROUE: ROUE, BARRES: BARRES,
    solGeometrie: solGeometrie, dessinerSol: dessinerSol,
    outils: { rr: rr, rect: rect, disque: disque, trait: trait, poly: poly, degrade: degrade, texte: texte, halo: halo }
  };
})();
