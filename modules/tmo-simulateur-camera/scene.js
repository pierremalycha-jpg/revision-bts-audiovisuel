/* ==========================================================================
   scene.js — la grande scène : le plateau vu en perspective, caméra au centre
   --------------------------------------------------------------------------
   C'est le fond de l'application. On y voit le matériel au premier plan (la
   caméra, et pour la configuration de plateau le câble, la CCU et le RCP),
   puis le décor derrière. On tourne autour en glissant, on s'approche ou on
   recule avec la molette (ou en écartant deux doigts).

   La scène reste en 2,5D : chaque élément est un dessin plat de decor.js ou
   de materiel.js, « photographié » une fois puis posé debout à sa place,
   comme dans un théâtre de papier. Le matériel reçoit une petite épaisseur
   (le même dessin, empilé en tranches) pour avoir du volume.

   Par-dessus, si on le demande : le champ de la caméra (bleu), le plan net
   et la zone nette (vert).

   Technique : WebGL 2, sans bibliothèque ; l'image n'est recalculée que
   lorsqu'on bouge ou qu'un réglage change.
   ========================================================================== */

const Scene = (function () {
  "use strict";

  const O = Decor.outils;
  const DEPART = { az: 0.8, el: 0.3, r: 5.0 };   // point de vue : angle autour de la caméra, hauteur, distance (m)
  const CHAMP = 36 * Math.PI / 180;                 // angle de champ vertical du point de vue
  const REGIE = { x: -2.35, recul: 0.1 };           // la table de la régie : à gauche, juste derrière la caméra
  const FOND = [0.039, 0.043, 0.055];

  let canvas = null, gl = null, pTex = null, pCoul = null, vbo = null;
  const textures = {};
  const vue = { az: DEPART.az, el: DEPART.el, r: DEPART.r };
  let dernier = null, apres = null, bouge = null;
  let L = 0, H = 0, M = null, oeil = [0, 0, 0];     // taille, matrice de projection, position de l'œil

  /* --- Programmes --------------------------------------------------------- */
  const VS_TEX = "#version 300 es\nlayout(location=0) in vec3 aPos; layout(location=1) in vec2 aUV; uniform mat4 uM; out vec2 vUV;\nvoid main(){ vUV = aUV; gl_Position = uM * vec4(aPos, 1.0); }";
  const FS_TEX = "#version 300 es\nprecision mediump float; uniform sampler2D uTex; uniform vec4 uTeinte; in vec2 vUV; out vec4 o;\nvoid main(){ o = texture(uTex, vUV) * uTeinte; }";
  const VS_COUL = "#version 300 es\nlayout(location=0) in vec4 aPos; layout(location=1) in vec4 aCoul; out vec4 vCoul;\nvoid main(){ vCoul = aCoul; gl_Position = aPos; }";
  const FS_COUL = "#version 300 es\nprecision mediump float; in vec4 vCoul; out vec4 o;\nvoid main(){ o = vCoul; }";

  function programme(vs, fs) {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (s) {
      const sh = gl.createShader(s[0]); gl.shaderSource(sh, s[1]); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(p, sh);
    });
    gl.linkProgram(p);
    return p;
  }

  /* « Photographier » un dessin vectoriel : on le trace dans un canvas 2D, que
     l'on confie à la carte graphique. dessiner(c) travaille en mètres. */
  function photographier(nom, l, h, ppm, dessiner) {
    ppm = Math.min(ppm, 2048 / Math.max(l, h));
    const cv = document.createElement("canvas");
    cv.width = Math.max(2, Math.ceil(l * ppm)); cv.height = Math.max(2, Math.ceil(h * ppm));
    const c = cv.getContext("2d");
    c.scale(ppm, ppm);
    dessiner(c, ppm);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const ani = gl.getExtension("EXT_texture_filter_anisotropic");
    if (ani) gl.texParameterf(gl.TEXTURE_2D, ani.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    textures[nom] = t;
  }

  function preparerTextures() {
    // Les calques du décor
    Decor.calques.forEach(function (k) {
      if (k.sol) return;
      photographier(k.id, k.l, k.h, k.l > 6 ? 170 : 620, function (c, ppm) { k.dessiner(c, ppm, { x0: 0, y0: 0, x1: k.l, y1: k.h }); });
    });
    // Le matériel : chaque dessin est recalé dans son cadre
    ["plateau", "boitier", "regie"].forEach(function (nom) {
      const q = Materiel.CADRES[nom];
      photographier("m_" + nom, q.x1 - q.x0, q.y1 - q.y0, 1200, function (c) {
        c.translate(-q.x0, -q.y0);
        if (nom === "plateau") Materiel.cameraPlateau(c, true); else if (nom === "boitier") Materiel.boitier(c, true); else Materiel.regie(c, true);
      });
    });
    // Le sol : un quadrillage au mètre, qui se fond dans le noir sur les bords
    photographier("sol", 26, 26, 78, function (c) {
      const g = c.createRadialGradient(13, 13.5, 1, 13, 13.5, 13);
      g.addColorStop(0, "#1c2029"); g.addColorStop(0.55, "#14171d"); g.addColorStop(1, "rgba(12,13,17,0)");
      c.fillStyle = g; c.fillRect(0, 0, 26, 26);
      c.globalCompositeOperation = "source-atop";
      for (let i = 0; i <= 26; i++) { c.fillStyle = "rgba(255,255,255,.075)"; c.fillRect(i - 0.012, 0, 0.024, 26); c.fillRect(0, i - 0.012, 26, 0.024); }
    });
    // Une ombre douce, réutilisée sous chaque élément
    photographier("ombre", 1, 1, 128, function (c) {
      const g = c.createRadialGradient(0.5, 0.5, 0, 0.5, 0.5, 0.5);
      g.addColorStop(0, "rgba(0,0,0,.62)"); g.addColorStop(0.6, "rgba(0,0,0,.28)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(0, 0, 1, 1);
    });
  }

  // Renvoie null si tout va bien, sinon un message.
  function init(element, options) {
    canvas = element; apres = options && options.apres; bouge = options && options.bouge;
    gl = canvas.getContext("webgl2", { alpha: false, antialias: true, depth: false, stencil: false, premultipliedAlpha: true });
    if (!gl) return "Ce navigateur ne propose pas WebGL 2, nécessaire pour afficher la scène.";
    try { pTex = programme(VS_TEX, FS_TEX); pCoul = programme(VS_COUL, FS_COUL); } catch (e) { console.error(e); return "La scène n’a pas pu démarrer sur cette carte graphique."; }
    vbo = gl.createBuffer();
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    preparerTextures();
    brancher();
    return null;
  }

  /* --- Tourner autour, s'approcher ---------------------------------------- */
  function borner() {
    vue.az = Math.min(1.42, Math.max(-1.42, vue.az));
    vue.el = Math.min(1.05, Math.max(0.03, vue.el));
    vue.r = Math.min(13, Math.max(1.3, vue.r));
  }
  function brancher() {
    const doigts = new Map();
    let depart = null, ecart0 = 0, r0 = 0;
    const redessiner = function () { borner(); if (bouge) bouge(); if (dernier) dessiner(dernier); };
    canvas.addEventListener("pointerdown", function (e) {
      doigts.set(e.pointerId, [e.clientX, e.clientY]);
      canvas.setPointerCapture(e.pointerId);
      if (doigts.size === 1) depart = { x: e.clientX, y: e.clientY, az: vue.az, el: vue.el };
      else if (doigts.size === 2) { const p = Array.from(doigts.values()); ecart0 = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); r0 = vue.r; depart = null; }
      canvas.classList.add("saisi");
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!doigts.has(e.pointerId)) return;
      doigts.set(e.pointerId, [e.clientX, e.clientY]);
      if (doigts.size === 2) {           // deux doigts : on s'approche ou on recule
        const p = Array.from(doigts.values()), ecart = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
        if (ecart0 > 10) vue.r = r0 * ecart0 / Math.max(ecart, 10);
      } else if (depart) {               // un doigt ou la souris : on tourne
        vue.az = depart.az - (e.clientX - depart.x) * 0.0055; vue.el = depart.el + (e.clientY - depart.y) * 0.0045;
      }
      redessiner();
    });
    ["pointerup", "pointercancel"].forEach(function (n) { canvas.addEventListener(n, function (e) { doigts.delete(e.pointerId); depart = null; if (!doigts.size) canvas.classList.remove("saisi"); }); });
    canvas.addEventListener("wheel", function (e) { e.preventDefault(); vue.r *= Math.exp(e.deltaY * 0.0012); redessiner(); }, { passive: false });
    canvas.addEventListener("dblclick", function () { recentrer(); });
    canvas.addEventListener("keydown", function (e) {
      const d = { ArrowLeft: [0.1, 0, 1], ArrowRight: [-0.1, 0, 1], ArrowUp: [0, 0.07, 1], ArrowDown: [0, -0.07, 1], "+": [0, 0, 0.87], "=": [0, 0, 0.87], "-": [0, 0, 1.15], "0": null }[e.key];
      if (d === undefined) return;
      e.preventDefault();
      if (d === null) { recentrer(); return; }
      vue.az += d[0]; vue.el += d[1]; vue.r *= d[2]; redessiner();
    });
  }
  function recentrer() { vue.az = DEPART.az; vue.el = DEPART.el; vue.r = DEPART.r; if (dernier) dessiner(dernier); }
  function zoomer(f) { vue.r *= f; borner(); if (dernier) dessiner(dernier); }

  /* --- Géométrie ----------------------------------------------------------- */
  const sous = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  const scal = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  const croix = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
  const unite = function (a) { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

  // La matrice qui envoie un point du plateau vers l'écran (perspective), pour un œil qui regarde « cible ».
  function matrice(cible, rapproche) {
    const aspect = L / H;
    const r = vue.r * rapproche * Math.max(1, 1.35 / aspect);   // fenêtre étroite : on recule pour tout garder
    oeil = [cible[0] + r * Math.sin(vue.az) * Math.cos(vue.el), cible[1] + r * Math.sin(vue.el), cible[2] - r * Math.cos(vue.az) * Math.cos(vue.el)];
    const f = unite(sous(cible, oeil)), d = unite(croix([0, 1, 0], f)), h = croix(f, d);
    const t = 1 / Math.tan(CHAMP / 2), N = 0.1, F = 80, A = (F + N) / (F - N), B = -2 * F * N / (F - N);
    const ligne = [
      [d[0] * t / aspect, d[1] * t / aspect, d[2] * t / aspect, -scal(d, oeil) * t / aspect],
      [h[0] * t, h[1] * t, h[2] * t, -scal(h, oeil) * t],
      [f[0] * A, f[1] * A, f[2] * A, -scal(f, oeil) * A + B],
      [f[0], f[1], f[2], -scal(f, oeil)]
    ];
    M = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let l = 0; l < 4; l++) M[c * 4 + l] = ligne[l][c];
  }
  // Un point du plateau -> coordonnées homogènes de l'écran (x, y, z, w).
  function clip(P) {
    return [M[0] * P[0] + M[4] * P[1] + M[8] * P[2] + M[12], M[1] * P[0] + M[5] * P[1] + M[9] * P[2] + M[13], M[2] * P[0] + M[6] * P[1] + M[10] * P[2] + M[14], M[3] * P[0] + M[7] * P[1] + M[11] * P[2] + M[15]];
  }
  // Un point du plateau -> position en pixels (CSS) dans la scène, ou null s'il est derrière l'œil.
  function ecran(X, Y, Z) {
    if (!M) return null;
    const q = clip([X, Y, Z]);
    if (q[3] < 0.15) return null;
    return { x: (q[0] / q[3] * 0.5 + 0.5) * canvas.clientWidth, y: (0.5 - q[1] / q[3] * 0.5) * canvas.clientHeight };
  }

  /* --- Dessiner : rectangles texturés, aplats de couleur, traits ----------- */
  function rectangle(nom, hg, hd, bg, bd, teinte) {     // quatre coins : haut gauche, haut droit, bas gauche, bas droit
    const d = new Float32Array([hg[0], hg[1], hg[2], 0, 0, hd[0], hd[1], hd[2], 1, 0, bg[0], bg[1], bg[2], 0, 1, bd[0], bd[1], bd[2], 1, 1]);
    gl.useProgram(pTex);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(pTex, "uM"), false, M);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textures[nom]); gl.uniform1i(gl.getUniformLocation(pTex, "uTex"), 0);
    gl.uniform4fv(gl.getUniformLocation(pTex, "uTeinte"), teinte || [1, 1, 1, 1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  let lot = [];                                          // aplats et traits en attente
  function sommet(q, c) { lot.push(q[0], q[1], q[2], q[3], c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]); }
  // Un polygone convexe posé dans le plateau. couleur = [r, v, b, opacité].
  function aplat(points, couleur) {
    const q = points.map(clip);
    for (let i = 1; i < q.length - 1; i++) { sommet(q[0], couleur); sommet(q[i], couleur); sommet(q[i + 1], couleur); }
  }
  // Un trait d'épaisseur constante à l'écran, entre des points du plateau.
  function trait(points, epaisseur, couleur, ferme) {
    const n = points.length, dpr = canvas.width / Math.max(1, canvas.clientWidth);
    for (let i = 0; i < (ferme ? n : n - 1); i++) {
      let a = clip(points[i]), b = clip(points[(i + 1) % n]);
      if (a[3] < 0.1 && b[3] < 0.1) continue;            // tout le segment est derrière l'œil
      if (a[3] < 0.1) a = couper(b, a); else if (b[3] < 0.1) b = couper(a, b);
      const ax = a[0] / a[3], ay = a[1] / a[3], bx = b[0] / b[3], by = b[1] / b[3];
      let nx = -(by - ay) * H, ny = (bx - ax) * L; const lg = Math.hypot(nx, ny) || 1;
      nx = nx / lg * epaisseur * dpr / L; ny = ny / lg * epaisseur * dpr / H;
      const p = [[ax - nx, ay - ny, 0, 1], [ax + nx, ay + ny, 0, 1], [bx + nx, by + ny, 0, 1], [bx - nx, by - ny, 0, 1]];
      sommet(p[0], couleur); sommet(p[1], couleur); sommet(p[2], couleur); sommet(p[0], couleur); sommet(p[2], couleur); sommet(p[3], couleur);
    }
  }
  function couper(devant, derriere) {                   // ramène l'extrémité cachée juste devant l'œil
    const k = (devant[3] - 0.1) / (devant[3] - derriere[3]);
    return devant.map(function (v, i) { return v + (derriere[i] - v) * k; });
  }
  function vider() {
    if (!lot.length) return;
    gl.useProgram(pCoul);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lot), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.TRIANGLES, 0, lot.length / 8);
    lot = [];
  }

  /* ------------------------------------------------------------------------
     LE DESSIN COMPLET
     v : { config, cfg, calc, distance, pan, tilt, zone (afficher champ et zone nette) }
     ------------------------------------------------------------------------ */
  function dessiner(v) {
    dernier = v;
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const l = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!l || !h) return;
    if (canvas.width !== l || canvas.height !== h) { canvas.width = l; canvas.height = h; }
    L = l; H = h;
    const camZ = Decor.SUJET_Z - v.distance, camY = Decor.CAM_Y;
    const plateau = v.config === "plateau";
    // On regarde un point juste devant la caméra ; le boîtier, plus petit, est vu de plus près.
    matrice([0.05, plateau ? 1.0 : 1.08, camZ + 0.45], plateau ? 1 : 0.8);

    gl.viewport(0, 0, L, H);
    gl.clearColor(FOND[0], FOND[1], FOND[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // couleurs « prémultipliées » par leur opacité

    /* 1. Le sol et les ombres */
    rectangle("sol", [-13, 0, 18], [13, 0, 18], [-13, 0, -8], [13, 0, -8]);
    const ombre = function (X, Z, lx, lz, force) { rectangle("ombre", [X - lx, 0.002, Z + lz], [X + lx, 0.002, Z + lz], [X - lx, 0.002, Z - lz], [X + lx, 0.002, Z - lz], [force, force, force, force]); };
    Decor.calques.forEach(function (k) { if (!k.sol && k.eclaire && k.id !== "fond") ombre(k.x + k.l / 2, k.z, k.l * 0.62, 0.42, 1); });
    ombre(0, camZ - 0.1, 0.75, 0.75, 1);
    if (plateau) ombre(REGIE.x + 0.65, camZ - REGIE.recul - 0.2, 0.95, 0.6, 1);

    /* 2. Sur le sol : le champ de la caméra (bleu) et la zone nette (vert) */
    const cp = Math.cos(v.pan), sp = Math.sin(v.pan), ct = Math.cos(v.tilt), st = Math.sin(v.tilt);
    const demiChamp = Math.atan(v.cfg.capteur.l / (2 * v.calc.f));
    const portee = (Decor.FOND_Z - camZ) / Math.max(0.3, cp) + 0.4;
    // Un point du sol, à la profondeur d le long de l'axe optique, dans la direction a.
    const auSol = function (a, d) { const t = d / Math.cos(a - v.pan); return [Math.sin(a) * t, 0.004, camZ + Math.cos(a) * t]; };
    const net = isFinite(v.calc.distNette) && v.calc.distNette < portee;
    if (v.zone) {
      const g = v.pan - demiChamp, d = v.pan + demiChamp;
      aplat([[0, 0.004, camZ], auSol(g, portee), auSol(d, portee)], [0.25, 0.61, 1, 0.13]);
      trait([auSol(g, portee), [0, 0.004, camZ], auSol(d, portee)], 1.1, [0.35, 0.68, 1, 0.8]);
      const pres = Math.min(v.calc.pres, portee), loin = Math.min(v.calc.loin, portee);
      if (isFinite(v.calc.pres) && pres < portee) {
        aplat([auSol(g, pres), auSol(d, pres), auSol(d, loin), auSol(g, loin)], [0.19, 0.82, 0.35, 0.3]);
        trait([auSol(g, pres), auSol(d, pres)], 1, [0.37, 0.88, 0.49, 0.7]);
        if (loin < portee) trait([auSol(g, loin), auSol(d, loin)], 1, [0.37, 0.88, 0.49, 0.7]);
      }
    }

    /* 3. Le câble fibre, de l'arrière de la caméra jusqu'à la régie */
    const zRegie = camZ - REGIE.recul;
    if (plateau) {
      // Une courbe de Bézier : départ, deux points d'appui, arrivée.
      const courbe = function (p0, p1, p2, p3, n, pts) { for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([0, 1, 2].map(function (k) { return u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]; })); } };
      const pts = [], depart = [-0.31 * sp, camY - 0.07, camZ - 0.31 * cp], sol = [-0.75 * sp, 0.012, camZ - 0.75 * cp], table = [REGIE.x + 0.75, 0.012, zRegie - 0.7];
      courbe(depart, [-0.55 * sp, camY - 0.12, camZ - 0.55 * cp], [-0.5 * sp, 0.012, camZ - 0.5 * cp], sol, 10, pts);                 // la retombée derrière la caméra
      courbe(sol, [-1.25 * sp, 0.012, camZ - 1.25 * cp], [table[0] + 0.9, 0.012, table[2] - 0.9], table, 18, pts);                   // au sol, jusqu'à la table
      courbe(table, [table[0] - 0.3, 0.012, table[2] + 0.2], [REGIE.x + 0.55, 0.3, zRegie - 0.44], [REGIE.x + 0.55, 0.72, zRegie - 0.43], 8, pts);   // la remontée vers la CCU
      trait(pts, 2.6, [0.07, 0.07, 0.08, 0.55]); trait(pts, 1.7, [0.89, 0.64, 0.1, 1]);
    }
    vider();

    /* 4. Les éléments debout, du plus lointain au plus proche de l'œil */
    const elements = [];
    const loinDe = function (P) { return Math.hypot(P[0] - oeil[0], P[1] - oeil[1], P[2] - oeil[2]); };
    Decor.calques.forEach(function (k) {
      if (k.sol) return;
      elements.push({ d: k.id === "fond" ? 1e3 : Math.abs(k.z - oeil[2]) + (k.eclaire ? 0 : -0.001), f: function () {
        const hg = [k.x, k.y + k.h, k.z], hd = [k.x + k.l, k.y + k.h, k.z], bg = [k.x, k.y, k.z], bd = [k.x + k.l, k.y, k.z];
        rectangle(k.id, hg, hd, bg, bd);
        if (!k.eclaire) { gl.blendFunc(gl.ONE, gl.ONE); rectangle(k.id, hg, hd, bg, bd, [0.45, 0.45, 0.45, 0]); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }   // les sources lumineuses brillent
      } });
    });
    // Le plan net : le cadre exact que la caméra voit à cette distance.
    if (v.zone && net) {
      const dn = v.calc.distNette, tv = v.cfg.capteur.h / (2 * v.calc.f), th = v.cfg.capteur.l / (2 * v.calc.f);
      const coin = function (sx, sy) { const d = [sx * cp - sy * sp * st + sp * ct, sy * ct + st, -sx * sp - sy * cp * st + cp * ct]; return [d[0] * dn, Math.max(0.006, camY + d[1] * dn), camZ + d[2] * dn]; };
      const coins = [coin(-th, tv), coin(th, tv), coin(th, -tv), coin(-th, -tv)];
      elements.push({ d: Math.abs(camZ + dn * cp - oeil[2]) - 0.01, f: function () {
        aplat(coins, [0.19, 0.82, 0.35, 0.12]); trait(coins, 1.4, [0.25, 0.88, 0.42, 1], true);
        const objectif = [0.3 * sp * (plateau ? 1 : 0.5), camY, camZ + 0.3 * cp * (plateau ? 1 : 0.5)];
        coins.forEach(function (c) { trait([objectif, c], 0.7, [0.4, 0.7, 1, 0.42]); });
        vider();
      } });
    }
    // Le matériel : le même dessin de profil, empilé en tranches pour lui donner une épaisseur.
    const tranches = function (nom, origine, axeX, normale, tranchesNb) {
      const q = Materiel.CADRES[nom], cote = scal(sous(oeil, origine), normale) > 0 ? 1 : -1;
      for (let i = 0; i < tranchesNb; i++) {
        const k = (i / (tranchesNb - 1) - 0.5) * q.epaisseur * cote;        // de la tranche la plus éloignée à la plus proche
        const lum = i === tranchesNb - 1 ? 1.3 : 0.5 + 0.34 * i / tranchesNb;   // la face est éclairée, la tranche est dans l'ombre
        const P = function (x, y) { return [origine[0] + axeX[0] * x + normale[0] * k, origine[1] - y, origine[2] + axeX[2] * x + normale[2] * k]; };
        rectangle("m_" + nom, P(q.x0, q.y0), P(q.x1, q.y0), P(q.x0, q.y1), P(q.x1, q.y1), [lum, lum, lum, 1]);
      }
    };
    elements.push({ d: loinDe([0, camY, camZ]), f: function () { tranches(v.config, [0, camY, camZ], [sp, 0, cp], [cp, 0, -sp], 18); } });
    if (plateau) elements.push({ d: loinDe([REGIE.x + 0.65, 0.8, zRegie]), f: function () { tranches("regie", [REGIE.x, 1.5, zRegie - 0.21], [1, 0, 0], [0, 0, -1], 22); } });
    elements.sort(function (a, b) { return b.d - a.d; }).forEach(function (e) { e.f(); });

    /* 5. Les petites LED du décor : des points lumineux */
    const px = 2.2 * dpr;
    Decor.lumieres.forEach(function (lu) {
      const q = clip([lu.x, lu.y, lu.z]); if (q[3] < 0.2) return;
      const x = q[0] / q[3], y = q[1] / q[3], dx = px / L, dy = px / H, c = [lu.couleur[0], lu.couleur[1], lu.couleur[2], 1];
      [[-dx, -dy], [dx, -dy], [dx, dy], [-dx, -dy], [dx, dy], [-dx, dy]].forEach(function (o) { sommet([x + o[0], y + o[1], 0, 1], c); });
    });
    vider();

    // Où poser l'étiquette du plan net (coin haut du cadre vert), pour simulateur.js.
    dessiner.etiquette = null;
    if (v.zone && net) { const dn = v.calc.distNette, tv = v.cfg.capteur.h / (2 * v.calc.f); dessiner.etiquette = ecran((sp * ct - tv * sp * st) * dn, Math.max(0.3, camY + (st + tv * ct) * dn), camZ + (cp * ct - tv * cp * st) * dn); }
    if (apres) apres();
  }

  // Où se trouve, à l'écran, un repère du matériel (voir Materiel.REPERES).
  function repere(r) {
    const v = dernier; if (!v) return null;
    const camZ = Decor.SUJET_Z - v.distance, sp = Math.sin(v.pan), cp = Math.cos(v.pan), zRegie = camZ - REGIE.recul;
    if (r.sur === "camera") return ecran(sp * r.x, Decor.CAM_Y - r.y, camZ + cp * r.x);
    if (r.sur === "regie") return ecran(REGIE.x + r.x, 1.5 - r.y, zRegie - 0.42);
    return ecran(REGIE.x + 1.6, 0.02, zRegie - 1.25);      // le câble, au sol
  }

  return {
    init: init, dessiner: dessiner, ecran: ecran, repere: repere, recentrer: recentrer, zoomer: zoomer,
    etiquette: function () { return dessiner.etiquette; }
  };
})();
