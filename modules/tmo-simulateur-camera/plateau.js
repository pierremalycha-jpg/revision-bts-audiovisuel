/* ==========================================================================
   plateau.js — le matériel, et la vue d'ensemble du plateau en 2,5D
   --------------------------------------------------------------------------
   1. Materiel : les dessins des deux configurations, de profil, en mètres
      (caméra de plateau sur son pied avec CCU, RCP et câble ; boîtier sur
      trépied). Ils servent dans la vue du plateau et dans l'onglet
      « Le matériel », où l'on peut cliquer sur chaque élément.

   2. Plateau : la maquette du studio vue de trois quarts. C'est une
      projection « axonométrique » (sans point de fuite) : chaque calque du
      décor reste un dessin plat, simplement incliné. On y lit ce que la
      caméra ne montre pas : l'angle de champ (bleu), le plan net et la zone
      nette (vert), les distances. On fait pivoter la maquette en la
      glissant.
   ========================================================================== */

const Materiel = (function () {
  "use strict";
  const O = Decor.outils;

  /* CAMÉRA DE PLATEAU, de profil, objectif vers la droite.
     Origine : le capteur, sur l'axe optique. y vers le bas. Sol à y = 1,35. */
  function cameraPlateau(c, detail) {
    const sol = Decor.CAM_Y;
    // Pied de studio : embase roulante, colonne, tête fluide, manche avec poignée de zoom
    O.poly(c, "#23262d", [-0.5, sol - 0.06, 0.34, sol - 0.06, 0.22, sol - 0.2, -0.38, sol - 0.2]);
    O.disque(c, "#101216", -0.42, sol - 0.035, 0.05); O.disque(c, "#101216", 0.26, sol - 0.035, 0.05);
    O.rect(c, "#2d3139", -0.16, 0.42, 0.16, sol - 0.6, 0.02); O.rect(c, "#454b56", -0.13, 0.26, 0.1, 0.5, 0.02);
    O.rect(c, "#1b1d22", -0.2, 0.15, 0.24, 0.12, 0.025);
    O.trait(c, "#3a3f49", 0.026, [-0.16, 0.2, -0.62, 0.4]); O.rect(c, "#15171b", -0.72, 0.37, 0.13, 0.055, 0.02);
    // Corps de la tête de caméra
    c.fillStyle = O.degrade(c, 0, -0.14, 0, 0.14, ["#3b404a", "#2a2e36", "#1f2228"]); O.rr(c, -0.32, -0.135, 0.37, 0.275, 0.03); c.fill();
    O.rect(c, "#14161a", -0.3, -0.19, 0.3, 0.045, 0.02); O.rect(c, "#14161a", -0.27, -0.165, 0.03, 0.04); O.rect(c, "#14161a", -0.05, -0.165, 0.03, 0.04);
    if (detail) {
      O.rect(c, "#4a505c", -0.27, -0.09, 0.2, 0.012, 0.004); O.rect(c, "#171a1f", -0.27, -0.055, 0.14, 0.085, 0.01);
      for (let i = 0; i < 4; i++) O.disque(c, "#5d6572", -0.245 + i * 0.03, 0.065, 0.008);
      O.rect(c, "#c9ced6", -0.1, -0.05, 0.06, 0.018, 0.004);
      O.disque(c, "#8a93a3", -0.045, 0.02, 0.022); O.disque(c, "#1a1c21", -0.045, 0.02, 0.012); // roue de filtres
    }
    // Viseur de studio, tourné vers le cadreur, et voyant tally
    O.rect(c, "#17191d", -0.2, -0.24, 0.04, 0.06);
    c.fillStyle = "#262a31"; c.beginPath(); c.moveTo(-0.34, -0.42); c.lineTo(-0.12, -0.42); c.lineTo(-0.1, -0.24); c.lineTo(-0.36, -0.24); c.closePath(); c.fill();
    O.rect(c, "#0c0d10", -0.375, -0.41, 0.03, 0.16, 0.008); O.rect(c, "#3f6fb0", -0.372, -0.4, 0.012, 0.14, 0.004);
    O.rect(c, "#e5281f", -0.2, -0.445, 0.06, 0.028, 0.008);
    // Objectif : embase, bagues, pare-soleil, poignée motorisée
    O.rect(c, "#15171b", 0.05, -0.05, 0.035, 0.1, 0.006);
    O.rect(c, "#2b2f37", 0.085, -0.052, 0.07, 0.104, 0.008); O.rect(c, "#3a3f49", 0.155, -0.058, 0.075, 0.116, 0.008); O.rect(c, "#2b2f37", 0.23, -0.064, 0.07, 0.128, 0.008);
    if (detail) for (let x = 0.09; x < 0.3; x += 0.008) O.rect(c, "rgba(0,0,0,.35)", x, x < 0.155 ? -0.052 : x < 0.23 ? -0.058 : -0.064, 0.003, x < 0.155 ? 0.104 : x < 0.23 ? 0.116 : 0.128);
    O.poly(c, "#111317", [0.3, -0.066, 0.4, -0.092, 0.4, 0.092, 0.3, 0.066]);
    O.rect(c, "#1c1e23", 0.09, 0.045, 0.15, 0.06, 0.015);
    O.rect(c, "#c8102e", 0.3, -0.066, 0.008, 0.132);
  }

  /* BOÎTIER, de profil : trépied, boîtier, poignée, écran, zoom photo. */
  function boitier(c, detail) {
    const sol = Decor.CAM_Y;
    O.trait(c, "#2b2f37", 0.03, [-0.01, 0.12, -0.42, sol]); O.trait(c, "#2b2f37", 0.03, [-0.01, 0.12, 0.4, sol]); O.trait(c, "#3a3f49", 0.026, [-0.01, 0.12, 0.02, sol]);
    O.rect(c, "#1b1d22", -0.07, 0.045, 0.12, 0.085, 0.02); O.trait(c, "#3a3f49", 0.018, [-0.04, 0.09, -0.4, 0.22]);
    // Poignée audio (XLR) et boîtier
    O.rect(c, "#1c1e23", -0.062, -0.135, 0.105, 0.03, 0.012); O.rect(c, "#1c1e23", -0.06, -0.11, 0.022, 0.075); O.rect(c, "#1c1e23", 0.018, -0.11, 0.02, 0.075);
    O.rect(c, "#2a2d34", -0.105, -0.142, 0.05, 0.062, 0.008);
    c.fillStyle = O.degrade(c, 0, -0.04, 0, 0.04, ["#3d424c", "#2b2f36", "#202328"]); O.rr(c, -0.068, -0.04, 0.086, 0.08, 0.012); c.fill();
    O.rect(c, "#0e0f12", -0.082, -0.036, 0.012, 0.07, 0.003); O.rect(c, "#3f6fb0", -0.082, -0.03, 0.004, 0.058);
    if (detail) { O.disque(c, "#e5281f", -0.02, -0.022, 0.006); O.rect(c, "#555c69", -0.05, 0.005, 0.03, 0.022, 0.003); O.rect(c, "#c9ced6", -0.01, 0.012, 0.022, 0.006, 0.002); }
    // Zoom photo : bague de zoom, bague de mise au point, pare-soleil en pétales
    O.rect(c, "#17191d", 0.018, -0.036, 0.016, 0.072, 0.004);
    O.rect(c, "#2b2f37", 0.034, -0.042, 0.05, 0.084, 0.006); O.rect(c, "#33373f", 0.084, -0.044, 0.04, 0.088, 0.006); O.rect(c, "#2b2f37", 0.124, -0.044, 0.028, 0.088, 0.005);
    if (detail) for (let x = 0.038; x < 0.122; x += 0.006) O.rect(c, "rgba(0,0,0,.35)", x, -0.042, 0.0022, 0.084);
    O.rect(c, "#d9822b", 0.124, -0.044, 0.004, 0.088);
    O.poly(c, "#111317", [0.152, -0.046, 0.2, -0.056, 0.2, -0.02, 0.185, 0, 0.2, 0.02, 0.2, 0.056, 0.152, 0.046]);
  }

  /* LA RÉGIE VISION, de face : une table, la CCU en baie, le RCP et un moniteur
     de contrôle. Origine en haut à gauche ; largeur 1,3 m, hauteur 1,5 m. */
  function regie(c, detail) {
    O.rect(c, "#2a2d34", 0.04, 0.72, 1.22, 0.05, 0.012); O.rect(c, "#22252b", 0.1, 0.77, 0.05, 0.73); O.rect(c, "#22252b", 1.15, 0.77, 0.05, 0.73);
    // CCU : un boîtier de baie
    c.fillStyle = O.degrade(c, 0, 0.5, 0, 0.72, ["#3a3f49", "#272a31"]); O.rr(c, 0.08, 0.52, 0.56, 0.2, 0.012); c.fill();
    O.rect(c, "#111317", 0.11, 0.56, 0.2, 0.07, 0.006); O.disque(c, "#39d353", 0.36, 0.58, 0.012); O.disque(c, "#e5281f", 0.4, 0.58, 0.012);
    if (detail) { for (let i = 0; i < 5; i++) O.disque(c, "#8a93a3", 0.37 + i * 0.045, 0.66, 0.012); O.texte(c, "#aeb6c4", "CCU", 0.21, 0.596, 0.045, "700"); }
    // RCP : pupitre incliné avec sa manette de diaphragme
    c.fillStyle = "#30343c"; c.beginPath(); c.moveTo(0.74, 0.72); c.lineTo(0.76, 0.4); c.lineTo(0.94, 0.4); c.lineTo(0.96, 0.72); c.closePath(); c.fill();
    O.rect(c, "#0f1114", 0.785, 0.43, 0.13, 0.07, 0.006);
    if (detail) for (let i = 0; i < 6; i++) O.rect(c, i % 3 === 0 ? "#d9822b" : "#5d6572", 0.785 + (i % 3) * 0.047, 0.52 + Math.floor(i / 3) * 0.035, 0.036, 0.022, 0.004);
    O.rect(c, "#0f1114", 0.83, 0.6, 0.04, 0.1, 0.012); O.disque(c, "#c9ced6", 0.85, 0.63, 0.022);
    // Moniteur avec oscilloscope
    O.rect(c, "#15171b", 0.16, 0.1, 0.5, 0.34, 0.014); O.rect(c, "#06140c", 0.18, 0.12, 0.46, 0.3, 0.006); O.rect(c, "#22252b", 0.36, 0.44, 0.1, 0.08);
    c.strokeStyle = "#39d353"; c.lineWidth = 0.008; c.beginPath();
    for (let i = 0; i <= 40; i++) { const x = 0.2 + i * 0.0105, y = 0.28 - 0.09 * Math.sin(i * 0.5) * Math.cos(i * 0.13); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
  }

  /* Les éléments cliquables de l'onglet « Le matériel » : position (dans le
     repère du dessin correspondant) et fiche d'AIDES. */
  const REPERES = {
    plateau: [
      { n: 1, cle: "m_objectif_b4", sur: "camera", x: 0.24, y: 0 },
      { n: 2, cle: "m_tete", sur: "camera", x: -0.14, y: 0.02 },
      { n: 3, cle: "m_viseur", sur: "camera", x: -0.23, y: -0.34 },
      { n: 4, cle: "m_cable", sur: "cable" },
      { n: 5, cle: "m_ccu", sur: "regie", x: 0.5, y: 0.62 },
      { n: 6, cle: "m_rcp", sur: "regie", x: 0.85, y: 0.5 },
      { n: 7, cle: "m_pied", sur: "camera", x: -0.08, y: 0.7 }
    ],
    boitier: [
      { n: 1, cle: "m_objectif_e", sur: "camera", x: 0.1, y: 0 },
      { n: 2, cle: "m_boitier", sur: "camera", x: -0.005, y: -0.012 },
      { n: 3, cle: "m_ecran", sur: "camera", x: -0.092, y: -0.005 },
      { n: 4, cle: "m_carte", sur: "camera", x: -0.045, y: 0.022 },
      { n: 5, cle: "m_poignee", sur: "camera", x: -0.08, y: -0.115 },
      { n: 6, cle: "m_pied", sur: "camera", x: -0.01, y: 0.1 }
    ]
  };

  /* L'ONGLET « LE MATÉRIEL » : la configuration en gros plan.
     Renvoie la position (en pixels CSS) de chaque repère cliquable. */
  function dessinerGrosPlan(canvas, config) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const l = canvas.clientWidth, h = canvas.clientHeight;
    if (!l || !h) return [];
    if (canvas.width !== Math.round(l * dpr)) { canvas.width = Math.round(l * dpr); canvas.height = Math.round(h * dpr); }
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, l, h);
    const positions = [];
    if (config === "plateau") {
      // À gauche la caméra (cadrée du viseur au manche), à droite la régie, et le câble entre les deux.
      const e = Math.min(h / 1.02, l * 0.52 / 1.25), ox = l * 0.06 + 0.76 * e, oy = h * 0.5 + 0.02 * e;
      const er = Math.min(h / 0.86, l * 0.34 / 1.3), rx = l - 1.3 * er - l * 0.02, ry = h * 0.5 - 0.42 * er;
      // Le câble : il part de l'arrière de la tête, descend, court au sol et remonte derrière la CCU.
      const ax = ox - 0.32 * e, ay = oy + 0.07 * e, bx = rx + 0.1 * er, by = ry + 0.62 * er;
      c.strokeStyle = "#e3a21a"; c.lineWidth = Math.max(3, e * 0.022); c.lineCap = "round";
      c.beginPath(); c.moveTo(ax, ay); c.bezierCurveTo(ax - 0.2 * e, ay + 0.2 * e, ax + 0.1 * e, h * 1.02, l * 0.52, h * 0.93); c.bezierCurveTo(l * 0.62, h * 0.86, bx - 0.25 * er, by + 0.2 * er, bx, by); c.stroke();
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.setLineDash([2, 5]); c.stroke(); c.setLineDash([]);
      c.save(); c.translate(ox, oy); c.scale(e, e); cameraPlateau(c, true); c.restore();
      c.save(); c.translate(rx, ry); c.scale(er, er); regie(c, true); c.restore();
      REPERES.plateau.forEach(function (r) {
        if (r.sur === "camera") positions.push({ r: r, x: ox + r.x * e, y: oy + r.y * e });
        else if (r.sur === "regie") positions.push({ r: r, x: rx + r.x * er, y: ry + r.y * er });
        else positions.push({ r: r, x: l * 0.52, y: h * 0.93 });
      });
    } else {
      // Le boîtier est petit : on le montre en gros plan, le trépied sort du cadre.
      const e = Math.min(h / 0.33, l * 0.9 / 0.42), ox = l * 0.5 - 0.04 * e, oy = h * 0.5 + 0.02 * e;
      c.save(); c.translate(ox, oy); c.scale(e, e); boitier(c, true); c.restore();
      REPERES.boitier.forEach(function (r) { positions.push({ r: r, x: ox + r.x * e, y: oy + r.y * e }); });
    }
    return positions;
  }

  return { cameraPlateau: cameraPlateau, boitier: boitier, regie: regie, dessinerGrosPlan: dessinerGrosPlan, REPERES: REPERES };
})();


const Plateau = (function () {
  "use strict";
  const O = Decor.outils;
  let canvas = null, c = null;
  const vue = { az: 0.72, el: 0.6 };                 // angles de la maquette (radians)
  const REGIE = { x: 2.9, z: -1.15, l: 1.3, h: 1.5 }; // la table de la régie vision, dans un coin
  const SALLE = { x0: -3.9, x1: 4.5, z0: -1.9, z1: Decor.FOND_Z + 0.15 };
  let dernier = null, surChangement = null;

  function init(element, rappel) {
    canvas = element; c = canvas.getContext("2d"); surChangement = rappel;
    // Glisser pour faire pivoter la maquette.
    let depart = null;
    canvas.addEventListener("pointerdown", function (e) { depart = { x: e.clientX, y: e.clientY, az: vue.az, el: vue.el }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", function (e) {
      if (!depart) return;
      vue.az = Math.min(1.25, Math.max(0.08, depart.az - (e.clientX - depart.x) * 0.006));
      vue.el = Math.min(1.0, Math.max(0.12, depart.el + (e.clientY - depart.y) * 0.006));
      if (dernier) dessiner(dernier);
    });
    ["pointerup", "pointercancel"].forEach(function (n) { canvas.addEventListener(n, function () { depart = null; }); });
    // Au clavier : flèches.
    canvas.addEventListener("keydown", function (e) {
      const d = { ArrowLeft: [0.08, 0], ArrowRight: [-0.08, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06] }[e.key];
      if (!d) return;
      e.preventDefault();
      vue.az = Math.min(1.25, Math.max(0.08, vue.az + d[0])); vue.el = Math.min(1.0, Math.max(0.12, vue.el + d[1]));
      if (dernier) dessiner(dernier);
    });
  }

  /* v : { config, calc, cfg, distance, pan, tilt, roueAngle } */
  function dessiner(v) {
    dernier = v;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const l = canvas.clientWidth, h = canvas.clientHeight;
    if (!l || !h) return;
    if (canvas.width !== Math.round(l * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(l * dpr); canvas.height = Math.round(h * dpr); }
    const sa = Math.sin(vue.az), ca = Math.cos(vue.az), sb = Math.sin(vue.el), cb = Math.cos(vue.el);
    // Projection axonométrique : un point du plateau -> un point de l'écran (avant mise à l'échelle).
    const brut = function (X, Y, Z) { return [X * sa + Z * ca, -(Y * cb + (-X * ca + Z * sa) * sb)]; };
    // Échelle et centrage : toute la salle doit tenir dans le canvas.
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    [[SALLE.x0, 0, SALLE.z0], [SALLE.x1, 0, SALLE.z0], [SALLE.x0, 0, SALLE.z1], [SALLE.x1, 0, SALLE.z1], [SALLE.x0, 3.0, SALLE.z1], [SALLE.x1, 3.0, SALLE.z1]].forEach(function (p) {
      const q = brut(p[0], p[1], p[2]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
    });
    const k = Math.min((l - 16) / (x1 - x0), (h - 14) / (y1 - y0));
    const dx = (l - (x1 - x0) * k) / 2 - x0 * k, dy = (h - (y1 - y0) * k) / 2 - y0 * k;
    const P = function (X, Y, Z) { const q = brut(X, Y, Z); return [q[0] * k + dx, q[1] * k + dy]; };
    const base = function () { c.setTransform(dpr, 0, 0, dpr, 0, 0); };
    // Pose le repère de dessin sur un plan du plateau : origine o, axe x = ex, axe y = ey (vecteurs du plateau).
    const poser = function (o, ex, ey) {
      const p = P(o[0], o[1], o[2]), a = brut(ex[0], ex[1], ex[2]), b = brut(ey[0], ey[1], ey[2]);
      c.setTransform(dpr * a[0] * k, dpr * a[1] * k, dpr * b[0] * k, dpr * b[1] * k, dpr * p[0], dpr * p[1]);
    };
    const chemin = function (pts) { c.beginPath(); pts.forEach(function (p, i) { const q = P(p[0], p[1], p[2]); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.closePath(); };

    base(); c.clearRect(0, 0, l, h);
    const camZ = Decor.SUJET_Z - v.distance, camY = Decor.CAM_Y;

    /* --- LE SOL --- */
    chemin([[SALLE.x0, 0, SALLE.z0], [SALLE.x1, 0, SALLE.z0], [SALLE.x1, 0, SALLE.z1], [SALLE.x0, 0, SALLE.z1]]);
    c.fillStyle = "#181b22"; c.fill();
    c.lineWidth = 1;
    for (let z = Math.ceil(SALLE.z0); z <= SALLE.z1; z++) { c.strokeStyle = "rgba(255,255,255,.07)"; c.beginPath(); let a = P(SALLE.x0, 0, z), b = P(SALLE.x1, 0, z); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    for (let x = Math.ceil(SALLE.x0); x <= SALLE.x1; x++) { c.strokeStyle = "rgba(255,255,255,.07)"; c.beginPath(); let a = P(x, 0, SALLE.z0), b = P(x, 0, SALLE.z1); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }

    /* --- LE CHAMP DE LA CAMÉRA ET LA ZONE NETTE, posés sur le sol --- */
    const demiChamp = Math.atan(v.cfg.capteur.l / (2 * v.calc.f));
    const dirG = v.pan - demiChamp, dirD = v.pan + demiChamp;
    // Un point du sol à la profondeur d (mesurée le long de l'axe) sur le rayon de direction a.
    const auSol = function (a, d) { const t = d / Math.cos(a - v.pan); return [Math.sin(a) * t, 0, camZ + Math.cos(a) * t]; };
    const portee = (Decor.FOND_Z - camZ) / Math.max(0.3, Math.cos(v.pan)) + 0.5;
    chemin([[0, 0, camZ], auSol(dirG, portee), auSol(dirD, portee)]);
    c.fillStyle = "rgba(64,156,255,.16)"; c.fill(); c.strokeStyle = "rgba(64,156,255,.75)"; c.lineWidth = 1.2; c.stroke();
    const pres = Math.min(v.calc.pres, portee), loin = Math.min(v.calc.loin, portee);
    if (isFinite(v.calc.pres) && pres < portee) {
      chemin([auSol(dirG, pres), auSol(dirD, pres), auSol(dirD, loin), auSol(dirG, loin)]);
      c.fillStyle = "rgba(48,209,88,.34)"; c.fill();
    }

    /* --- LE CÂBLE ET LA RÉGIE (caméra de plateau seulement) --- */
    if (v.config === "plateau") {
      chemin([[REGIE.x - 0.5, 0, REGIE.z - 0.55], [REGIE.x + REGIE.l + 0.3, 0, REGIE.z - 0.55], [REGIE.x + REGIE.l + 0.3, 0, REGIE.z + 0.7], [REGIE.x - 0.5, 0, REGIE.z + 0.7]]);
      c.fillStyle = "rgba(255,255,255,.05)"; c.fill(); c.setLineDash([4, 4]); c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
      const a = P(0, 0, camZ - 0.45), b = P(0.9, 0, camZ - 1.3), d = P(REGIE.x - 0.9, 0, REGIE.z + 1.0), e = P(REGIE.x + 0.3, 0, REGIE.z + 0.15), dep = P(0, camY - 0.05, camZ - 0.32);
      c.strokeStyle = "#e3a21a"; c.lineWidth = 2.4; c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(dep[0], dep[1]); c.quadraticCurveTo(a[0] - 6, a[1] - 20, a[0], a[1]); c.bezierCurveTo(b[0], b[1], d[0], d[1], e[0], e[1]); c.stroke();
    }

    /* --- LES ÉLÉMENTS DEBOUT, du plus lointain au plus proche --- */
    const elements = [];
    Decor.calques.forEach(function (q) {
      if (q.sol) return;
      elements.push({ z: q.z, dessiner: function () {
        poser([q.x, q.y + q.h, q.z], [1, 0, 0], [0, -1, 0]);
        if (q.roue) {      // la roue tourne aussi dans la maquette
          q.dessiner(c, 40, { x0: 0, y0: 0, x1: q.l, y1: q.h });
        } else q.dessiner(c, Math.min(160, k * dpr), { x0: 0, y0: 0, x1: q.l, y1: q.h });
        if (q.id === "fond") { c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 0.03; c.strokeRect(0, 0, q.l, q.h); }
      } });
    });
    // Le plan net : le cadre exact que la caméra voit à cette distance.
    if (isFinite(v.calc.distNette) && v.calc.distNette < portee) {
      const dn = v.calc.distNette;
      elements.push({ z: camZ + dn * Math.cos(v.pan) - 0.01, dessiner: function () {
        base();
        const tv = v.cfg.capteur.h / (2 * v.calc.f), th = v.cfg.capteur.l / (2 * v.calc.f);
        const ct = Math.cos(v.tilt), st = Math.sin(v.tilt), cp = Math.cos(v.pan), sp = Math.sin(v.pan);
        const coin = function (sx, sy) {     // le même calcul de rayon que dans rendu.js
          const d = [sx * cp + sy * -sp * st + sp * ct, sy * ct + st, sx * -sp + sy * -cp * st + cp * ct];
          return [d[0] * dn, Math.max(0, camY + d[1] * dn), camZ + d[2] * dn];
        };
        chemin([coin(-th, tv), coin(th, tv), coin(th, -tv), coin(-th, -tv)]);
        c.fillStyle = "rgba(48,209,88,.13)"; c.fill(); c.strokeStyle = "#30d158"; c.lineWidth = 1.6; c.stroke();
      } });
    }
    // La caméra, de profil, dans le plan de l'axe optique.
    elements.push({ z: camZ, dessiner: function () {
      poser([0, camY, camZ], [Math.sin(v.pan), 0, Math.cos(v.pan)], [0, -1, 0]);
      if (v.config === "plateau") Materiel.cameraPlateau(c, false); else Materiel.boitier(c, false);
    } });
    if (v.config === "plateau") elements.push({ z: REGIE.z, dessiner: function () { poser([REGIE.x, REGIE.h, REGIE.z], [1, 0, 0], [0, -1, 0]); Materiel.regie(c, false); } });
    elements.sort(function (a, b) { return b.z - a.z; }).forEach(function (e) { c.save(); e.dessiner(); c.restore(); });

    /* --- LES ÉTIQUETTES --- */
    base();
    c.font = "600 11px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"; c.textBaseline = "middle";
    const etiquette = function (t, p, coul, cote) {
      const w = c.measureText(t).width + 12, x = cote === "d" ? p[0] + 8 : cote === "g" ? p[0] - w - 8 : p[0] - w / 2, y = Math.min(h - 20, Math.max(2, p[1] - 9));
      const xx = Math.min(l - w - 2, Math.max(2, x));
      c.fillStyle = "rgba(10,12,16,.82)"; O.rr(c, xx, y, w, 18, 9); c.fill();
      c.fillStyle = coul; c.textAlign = "left"; c.fillText(t, xx + 6, y + 9.5);
    };
    const pc = P(0, camY + (v.config === "plateau" ? 0.75 : 0.42), camZ);
    etiquette(v.config === "plateau" ? "Caméra de plateau" : "Boîtier", pc, "#ffffff", "c");
    if (v.config === "plateau") etiquette("Régie : CCU + RCP", P(REGIE.x + 0.5, REGIE.h + 0.25, REGIE.z), "#f2c14e", "c");
    if (isFinite(v.calc.distNette) && v.calc.distNette < portee) {
      const pn = auSol(v.pan + demiChamp, v.calc.distNette);
      etiquette("Plan net " + Optique.distance(v.calc.distNette), P(pn[0], 0, pn[2]), "#5ee07d", "d");
    } else etiquette("Plan net au-delà du décor", P(0, 0.4, Decor.FOND_Z - 0.6), "#ff9f0a", "c");
  }

  return { init: init, dessiner: dessiner };
})();
