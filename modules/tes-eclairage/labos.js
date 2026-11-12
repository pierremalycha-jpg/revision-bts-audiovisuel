/* ==========================================================================
   labos.js — les labos (étape « Manipuler ») de l'application « Éclairage »
   --------------------------------------------------------------------------
   Le HTML de chaque labo est dans index.html, dans un <template data-labo="n">.
   Chaque module a PLUSIEURS labos (anatomie, mélangeur, gradation…).

   Règle commune (voir docs/CHARTE-APPLICATIONS.md) : dans chaque labo, UNE
   fonction dessiner() relit tous les réglages et redessine TOUT (scène,
   valeurs, explication). Les animations ont un bouton Pause et s'arrêtent
   quand l'élève a demandé moins de mouvement.
   Les identifiants commencent par e + numéro du module (e1-…, e2-…, e3-…).

   Les couleurs sont CALCULÉES, pas choisies à l'œil : chaque lumière est un
   spectre (énergie par longueur d'onde), converti en couleur avec les
   courbes de sensibilité de l'œil (CIE 1931). C'est le même moteur que
   l'application Photométrie.
   ========================================================================== */

/* --- Outils partagés ------------------------------------------------------- */
const O = {
  el: id => document.getElementById(id),
  police(taille, gras) { return (gras ? "600 " : "500 ") + taille + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif'; },
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
    const a = Math.atan2(y2 - y1, x2 - x1), t = 7 + (epaisseur || 2) * 2;
    c.strokeStyle = c.fillStyle = couleur; c.lineWidth = epaisseur || 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * t * 0.6, y2 - Math.sin(a) * t * 0.6); c.stroke();
    c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - t * Math.cos(a - 0.4), y2 - t * Math.sin(a - 0.4)); c.lineTo(x2 - t * Math.cos(a + 0.4), y2 - t * Math.sin(a + 0.4)); c.closePath(); c.fill();
  },
  // Pseudo-hasard reproductible : même graine → même valeur.
  alea(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); },
  situations(id, regler) { O.el(id).addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) regler(b.dataset.s); }); },
  curseur(el, v) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); },
  // Petite boucle d'animation qui ne tourne que si le canvas est visible.
  boucle(canvas, image) {
    let actif = !O.reduit(), dernier = performance.now();
    function pas(t) {
      const dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
      if (actif && O.visible(canvas)) image(dt);
      requestAnimationFrame(pas);
    }
    requestAnimationFrame(pas);
    return { pause(v) { actif = v === undefined ? !actif : !v; return actif; }, actif: () => actif };
  }
};

/* --- Moteur colorimétrique (repris de l'application Photométrie) ----------- */
const CS = (function () {
  const g3 = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
  const gs = (l, m, s) => Math.exp(-0.5 * ((l - m) / s) * ((l - m) / s));
  const sig = x => 1 / (1 + Math.exp(-x));
  const LAM = []; for (let l = 380; l <= 780; l += 5) LAM.push(l);
  const N = LAM.length;
  // Courbes de sensibilité de l'œil CIE 1931 2° (ajustement de Wyman, Sloan et Shirley, 2013)
  const cmf = l => [
    1.056 * g3(l, 599.8, 37.9, 31.0) + 0.362 * g3(l, 442.0, 16.0, 26.7) - 0.065 * g3(l, 501.1, 20.4, 26.2),
    0.821 * g3(l, 568.8, 46.9, 40.5) + 0.286 * g3(l, 530.9, 16.3, 31.1),
    1.217 * g3(l, 437.0, 11.8, 36.0) + 0.681 * g3(l, 459.0, 26.0, 13.8)];
  const CMF = LAM.map(cmf);

  function XYZ(spd, refl) {
    let X = 0, Y = 0, Z = 0;
    for (let i = 0; i < N; i++) { const p = spd[i] * (refl ? refl[i] : 1); X += p * CMF[i][0]; Y += p * CMF[i][1]; Z += p * CMF[i][2]; }
    return [X, Y, Z];
  }
  // Normalise un spectre : sa luminance vaut 1 (même « quantité de lumière » pour tous).
  function norm(arr) { const y = XYZ(arr)[1] || 1; return arr.map(v => v / y); }
  const fn = f => LAM.map(l => Math.max(0, f(l)));
  const planckRaw = (l, T) => { const m = l * 1e-9; return 1 / (Math.pow(m, 5) * (Math.exp(1.4388e-2 / (m * T)) - 1)); };
  const planck = T => norm(fn(l => planckRaw(l, T)));
  const pics = liste => norm(fn(l => liste.reduce((s, p) => s + p[3] * g3(l, p[0], p[1], p[2]), 0)));

  const xy = c => { const s = c[0] + c[1] + c[2]; return [c[0] / s, c[1] / s]; };
  const uv = p => { const d = -2 * p[0] + 12 * p[1] + 3; return [4 * p[0] / d, 6 * p[1] / d]; };
  const uv2xy = q => { const d = 2 * q[0] - 8 * q[1] + 4; return [3 * q[0] / d, 2 * q[1] / d]; };
  // Température de couleur proximale (formule de McCamy, valable de 2 000 à 12 000 K environ)
  function tcc(p) { const n = (p[0] - 0.3320) / (0.1858 - p[1]); return 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33; }
  const LOCUS = []; for (let T = 1000; T <= 25000; T += T < 4000 ? 20 : 100) LOCUS.push({ T: T, uv: uv(xy(XYZ(planck(T)))) });
  // Duv : distance à la courbe de Planck (+ au-dessus = vert, − au-dessous = magenta)
  function duv(p) {
    const q = uv(p); let best = 1e9, k = 0;
    LOCUS.forEach((L, i) => { const d = (L.uv[0] - q[0]) ** 2 + (L.uv[1] - q[1]) ** 2; if (d < best) { best = d; k = i; } });
    return (q[1] > LOCUS[k].uv[1] ? 1 : -1) * Math.sqrt(best);
  }
  const locusUV = T => { let a = LOCUS[0]; for (const L of LOCUS) { if (L.T > T) break; a = L; } return a.uv; };

  // Couleurs d'écran
  const versRVB = c => [3.2406 * c[0] - 1.5372 * c[1] - 0.4986 * c[2], -0.9689 * c[0] + 1.8758 * c[1] + 0.0415 * c[2], 0.0557 * c[0] - 0.2040 * c[1] + 1.0570 * c[2]];
  const gamma = v => { v = Math.max(0, Math.min(1, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
  const css = (rvb, a) => "rgba(" + rvb.map(v => Math.round(gamma(v) * 255)).join(",") + "," + (a === undefined ? 1 : a) + ")";
  // La couleur de la lumière elle-même (sans balance des blancs), à luminosité constante
  function couleurLumiere(spd) { const r = versRVB(XYZ(spd)); const m = Math.max(r[0], r[1], r[2], 1e-9); return r.map(v => Math.max(0, v) / m); }

  // Adaptation chromatique (Bradford) : la « balance des blancs » de la caméra
  const MB = [[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]];
  const MBi = [[0.9869929, -0.1470543, 0.1599627], [0.4323053, 0.5183603, 0.0492912], [-0.0085287, 0.0400428, 0.9684867]];
  const mul = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
  const D65 = [0.95047, 1, 1.08883];
  // Couleur d'un objet (réflectance refl) sous la lumière spd, la caméra étant équilibrée sur le blanc « blanc »
  function objet(spd, refl, blanc) {
    const c = XYZ(spd, refl), w = blanc ? XYZ(blanc) : XYZ(spd);
    const s = mul(MB, w), d = mul(MB, D65), l = mul(MB, c);
    // l / s : rapport à ce que la caméra prend pour du blanc ; on le ramène au blanc D65 de l'écran
    return mul(MBi, [l[0] * d[0] / s[0], l[1] * d[1] / s[1], l[2] * d[2] / s[2]]);
  }
  function lab(c) {
    const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const fx = f(c[0] / D65[0]), fy = f(c[1] / D65[1]), fz = f(c[2] / D65[2]);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  // Huit nuanciers (réflectances lisses) : peau, rouge, orange, jaune, vert, cyan, bleu, violet
  const NUANCIERS = [
    ["Peau", l => 0.27 + 0.10 * (l - 400) / 300 + 0.22 * sig((l - 590) / 16) - 0.03 * gs(l, 542, 11) - 0.03 * gs(l, 577, 9)],
    ["Rouge", l => 0.05 + 0.62 * sig((l - 602) / 11)],
    ["Orange", l => 0.05 + 0.66 * sig((l - 572) / 12)],
    ["Jaune", l => 0.07 + 0.74 * sig((l - 518) / 13)],
    ["Vert", l => 0.05 + 0.42 * gs(l, 530, 34)],
    ["Cyan", l => 0.05 + 0.48 * gs(l, 488, 42)],
    ["Bleu", l => 0.05 + 0.48 * gs(l, 452, 28)],
    ["Violet", l => 0.06 + 0.40 * gs(l, 425, 26) + 0.42 * sig((l - 625) / 15)]
  ].map(n => ({ nom: n[0], r: fn(n[1]) }));

  /* Indice de fidélité simplifié : on compare les 8 nuanciers sous la lumière
     testée et sous un corps noir de même température de couleur (caméra
     équilibrée dans les deux cas). 100 = identique. Ce n'est PAS l'IRC
     officiel, mais il en suit le principe et les tendances. */
  function fidelite(spd) {
    const T = O.borne(tcc(xy(XYZ(spd))), 1500, 15000), ref = planck(T);
    let s = 0;
    NUANCIERS.forEach(n => { const a = lab(objet(spd, n.r)), b = lab(objet(ref, n.r)); s += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); });
    // Écart moyen ΔE (CIELAB) → note sur 100, réglée pour suivre l'IRC : ΔE ≈ 3 → 97, 11 → 79, 18 → 50
    const dE = s / NUANCIERS.length;
    return O.borne(100 - 0.6 * dE - 0.12 * dE * dE, 0, 100);
  }

  // Couleur approximative d'une longueur d'onde (pour colorer les courbes de spectre)
  function onde(l) {
    let r = 0, g = 0, b = 0;
    if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = (510 - l) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = (645 - l) / 65; } else r = 1;
    const f = l < 420 ? 0.35 + 0.65 * (l - 380) / 40 : l > 700 ? 0.35 + 0.65 * (780 - l) / 80 : 1;
    return "rgb(" + [r, g, b].map(v => Math.round(255 * Math.pow(v * f, 0.8))).join(",") + ")";
  }

  return { LAM, N, CMF, XYZ, norm, fn, planck, pics, xy, uv, uv2xy, tcc, duv, LOCUS, locusUV, versRVB, gamma, css, couleurLumiere, objet, lab, NUANCIERS, fidelite, onde, gs, sig };
})();

/* Les spectres des LED utilisées par les labos (formes simplifiées mais réalistes) */
const LED = {
  rouge: CS.pics([[628, 9, 9, 1]]),
  vert: CS.pics([[527, 13, 16, 1]]),
  bleu: CS.pics([[462, 9, 10, 1]]),
  ambre: CS.pics([[592, 8, 9, 1]]),
  // Blancs à phosphore : pic bleu de la puce + large bosse du phosphore
  blancEco: CS.pics([[450, 9, 11, 0.9], [558, 42, 62, 0.53]]),
  blancChaud: CS.pics([[451, 9, 11, 0.72], [530, 32, 34, 0.47], [605, 45, 50, 0.95], [655, 22, 30, 0.45]]),
  blancFroid: CS.pics([[451, 9, 11, 1.723], [505, 30, 34, 0.691], [585, 50, 55, 0.911], [650, 25, 32, 0.383]]),
  puceBleue: CS.pics([[450, 9, 11, 1]])
};

/* Dessine un spectre (axe 380 → 780 nm) dans un rectangle, aire colorée sous la courbe */
function dessinerSpectre(c, spd, x, y, w, h, o) {
  o = o || {};
  const max = o.max || Math.max(...spd) || 1, X = l => x + (l - 380) / 400 * w, Y = v => y + h - v / max * h * 0.92;
  if (!o.sansFond) {
    c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 1;
    for (let l = 400; l <= 750; l += 50) { c.beginPath(); c.moveTo(X(l), y); c.lineTo(X(l), y + h); c.stroke(); }
    c.fillStyle = "rgba(255,255,255,.5)"; c.font = O.police(11); c.textAlign = "center";
    for (let l = 400; l <= 750; l += 50) c.fillText(l + " nm", X(l), y + h + 15);
  }
  if (!o.trait) {
    // Aire colorée : une bande verticale par longueur d'onde
    for (let i = 0; i < CS.N - 1; i++) {
      const l = CS.LAM[i];
      c.fillStyle = CS.onde(l + 2.5); c.globalAlpha = o.alpha || 0.9;
      c.beginPath(); c.moveTo(X(l), y + h); c.lineTo(X(l), Y(spd[i])); c.lineTo(X(l + 5), Y(spd[i + 1])); c.lineTo(X(l + 5), y + h); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
  }
  c.strokeStyle = o.couleur || "rgba(255,255,255,.9)"; c.lineWidth = o.epaisseur || 2; c.setLineDash(o.tirets || []);
  c.beginPath(); spd.forEach((v, i) => { const px = X(CS.LAM[i]), py = Y(v); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); c.setLineDash([]);
}

/* Le diagramme de chromaticité CIE 1931 (fond calculé une seule fois) */
const Diagramme = (function () {
  let fond = null;
  const BORD = CS.LAM.filter(l => l <= 700).map((l, i) => { const c = CS.CMF[i]; return CS.xy(c); });
  function fabriquer(taille) {
    const cv = document.createElement("canvas"); cv.width = cv.height = taille;
    const c = cv.getContext("2d"), img = c.createImageData(taille, taille);
    for (let j = 0; j < taille; j++) for (let i = 0; i < taille; i++) {
      const x = i / taille * 0.8, y = (1 - j / taille) * 0.9; if (y < 0.005) continue;
      const X = x / y, Z = (1 - x - y) / y; let r = CS.versRVB([X, 1, Z]); const m = Math.max(r[0], r[1], r[2]);
      r = r.map(v => Math.max(0, v) / m); const k = (j * taille + i) * 4;
      img.data[k] = CS.gamma(r[0]) * 255; img.data[k + 1] = CS.gamma(r[1]) * 255; img.data[k + 2] = CS.gamma(r[2]) * 255; img.data[k + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    return cv;
  }
  return {
    // Dessine le diagramme dans le carré (x, y, t) ; renvoie la fonction de placement d'un point xy
    dessiner(c, x0, y0, t) {
      if (!fond) fond = fabriquer(300);
      const P = p => [x0 + p[0] / 0.8 * t, y0 + (1 - p[1] / 0.9) * t];
      c.save();
      c.beginPath(); BORD.forEach((p, i) => { const q = P(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath();
      c.save(); c.clip(); c.globalAlpha = 0.85; c.drawImage(fond, x0, y0, t, t); c.restore();
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.2; c.stroke();
      // Courbe de Planck
      c.strokeStyle = "rgba(0,0,0,.75)"; c.lineWidth = 2; c.beginPath();
      CS.LOCUS.filter(L => L.T >= 1500 && L.T <= 20000).forEach((L, i) => { const q = P(CS.uv2xy(L.uv)); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke();
      c.restore();
      return P;
    }
  };
})();

/* ==========================================================================
   MODULE 1 — Les technologies LED
   ========================================================================== */
Application.labo(1, function () {
  laboAnatomie();
  laboMelangeur();
  laboGradation();
});

/* --- 1a. Anatomie d'une LED blanche (vue en coupe, animée) ----------------- */
function laboAnatomie() {
  const cv = O.el("e1-anat"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rI = O.el("e1-i");
  let phosphore = true, choisie = "puce";
  const particules = [];   // électrons, photons bleus, photons jaunes, chaleur
  let reserve = 0;

  // Les pièces : nom, description, zone à entourer [x, y, l, h]
  const PIECES = {
    puce: ["La puce (jonction PN)", "Un minuscule cristal semi-conducteur (≈ 1 mm²). Côté N, des électrons en trop ; côté P, des « trous » (places libres). Le courant les pousse l’un vers l’autre : à la <b>jonction</b>, chaque électron qui tombe dans un trou libère son énergie sous forme d’un <b>photon</b>. Le matériau fixe la couleur : nitrure de gallium-indium (InGaN) → <b>bleu</b>.", [440, 268, 120, 34]],
    phosphore: ["Le phosphore (luminophore)", "Une couche de poudre jaune (grenat YAG dopé au cérium) noyée dans le silicone. Elle <b>absorbe une partie du bleu</b> et réémet une lumière <b>jaune-verte à rouge</b>, plus large. Bleu restant + jaune = <b>blanc</b>. Plus il y a de phosphore, plus le blanc est chaud. Plusieurs phosphores (vert + rouge) donnent un meilleur rendu des couleurs.", [400, 212, 200, 92]],
    fils: ["Les fils de liaison", "Des fils d’or ou de cuivre plus fins qu’un cheveu (≈ 25 µm). Ils amènent le courant sur le dessus de la puce.", [470, 230, 190, 40]],
    lentille: ["Le dôme (lentille en silicone)", "Il protège la puce et oriente la lumière vers l’avant. Sur un projecteur, une optique (Fresnel, réflecteur) ou un diffuseur vient ensuite façonner le faisceau.", [370, 100, 260, 120]],
    electrodes: ["Les électrodes (anode +, cathode −)", "Le courant entre par l’anode et ressort par la cathode. Une LED ne fonctionne que dans un sens : c’est une <b>diode</b>. Elle se pilote en <b>courant</b>, pas en tension : c’est le rôle du pilote (driver).", [250, 318, 500, 40]],
    radiateur: ["Le radiateur (dissipateur)", "Une LED ne chauffe pas devant (pas d’infrarouge dans le faisceau), mais <b>chauffe derrière</b> : environ 60 % de l’énergie devient chaleur dans la jonction. Trop chaude, la LED perd du flux, change de couleur et vieillit vite : d’où les ailettes et les ventilateurs des projecteurs LED.", [250, 372, 500, 120]]
  };

  function nouvelle(type, x, y, vx, vy) { particules.push({ type, x, y, vx, vy, vie: 0 }); }

  function animer(dt) {
    const I = +rI.value / 100;
    // Les électrons entrent par la cathode, au rythme du courant
    reserve += dt * 26 * I;
    while (reserve > 1) { reserve--; nouvelle("e", 300 + Math.random() * 30, 335, 140 + Math.random() * 40, 0); }
    particules.forEach(p => {
      p.vie += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === "e") {
        // l'électron suit l'électrode puis monte dans la puce par le fil
        if (p.x > 425 && p.y > 300) { p.vx = 0; p.vy = -90; }
        if (p.y <= 288 && p.vy < 0) {
          // recombinaison : un photon bleu, et de la chaleur
          p.mort = true;
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
          nouvelle("b", 470 + Math.random() * 60, 278, Math.cos(a) * 230, Math.sin(a) * 230);
          if (Math.random() < 0.6) nouvelle("h", 470 + Math.random() * 60, 305, (Math.random() - 0.5) * 30, 70 + Math.random() * 30);
        }
      } else if (p.type === "b" && phosphore && !p.passe && p.y < 250 && p.y > 215) {
        p.passe = true;
        // Le phosphore convertit environ 6 photons bleus sur 10 en jaune
        if (Math.random() < 0.62) { p.type = "j"; const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6; p.vx = Math.cos(a) * 200; p.vy = Math.sin(a) * 200; }
      }
      if (p.y < -10 || p.y > Hc + 10 || p.x < -10 || p.x > W + 10 || (p.type === "h" && p.vie > 2.2)) p.mort = true;
    });
    for (let i = particules.length - 1; i >= 0; i--) if (particules[i].mort) particules.splice(i, 1);
    dessiner();
  }

  function dessiner() {
    const I = +rI.value / 100;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // Radiateur
    c.fillStyle = "#3a3f47"; O.rect(c, 250, 372, 500, 26, 4); c.fill();
    for (let k = 0; k < 11; k++) { O.rect(c, 262 + k * 44, 396, 22, 90, 3); c.fill(); }
    // Chaleur : le radiateur rougit avec le courant
    const g = c.createLinearGradient(0, 372, 0, 486); g.addColorStop(0, "rgba(255,90,40," + (0.15 + 0.5 * I) + ")"); g.addColorStop(1, "rgba(255,90,40,0)");
    c.fillStyle = g; c.fillRect(250, 372, 500, 114);
    // Boîtier et électrodes
    c.fillStyle = "#e9e5dc"; O.rect(c, 330, 300, 340, 20, 3); c.fill();
    c.fillStyle = "#b9bfc9"; O.rect(c, 250, 322, 240, 30, 4); c.fill(); O.rect(c, 510, 322, 240, 30, 4); c.fill();
    c.fillStyle = "#1d1d1f"; c.font = O.police(14, true); c.textAlign = "center";
    c.fillText("− cathode", 370, 343); c.fillText("anode +", 630, 343);
    // Réflecteur blanc du boîtier
    c.fillStyle = "#d8d4ca"; c.beginPath(); c.moveTo(350, 300); c.lineTo(400, 210); c.lineTo(412, 210); c.lineTo(372, 300); c.fill();
    c.beginPath(); c.moveTo(650, 300); c.lineTo(600, 210); c.lineTo(588, 210); c.lineTo(628, 300); c.fill();
    // Phosphore (couche jaune) dans la coupelle
    if (phosphore) { c.fillStyle = "rgba(255,214,60,.55)"; c.beginPath(); c.moveTo(372, 300); c.lineTo(412, 212); c.lineTo(588, 212); c.lineTo(628, 300); c.closePath(); c.fill(); }
    // Puce et jonction
    c.fillStyle = "#4b5563"; c.fillRect(440, 268, 120, 32);
    c.fillStyle = "#2563eb"; c.fillRect(440, 268, 120, 12);
    c.fillStyle = "#93c5fd"; c.fillRect(440, 280, 120, 3);
    c.fillStyle = "rgba(255,255,255,.75)"; c.font = O.police(11, true); c.fillText("P", 548, 278); c.fillText("N", 548, 296);
    // Fils de liaison
    c.strokeStyle = "#f5c542"; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(452, 268); c.quadraticCurveTo(420, 230, 400, 322); c.stroke();
    c.beginPath(); c.moveTo(548, 268); c.quadraticCurveTo(590, 230, 600, 322); c.stroke();
    // Dôme
    c.strokeStyle = "rgba(200,225,255,.55)"; c.lineWidth = 2; c.fillStyle = "rgba(200,225,255,.06)";
    c.beginPath(); c.moveTo(372, 212); c.bezierCurveTo(380, 80, 620, 80, 628, 212); c.closePath(); c.fill(); c.stroke();
    // Particules
    particules.forEach(p => {
      if (p.type === "e") { c.fillStyle = "#7dd3fc"; c.beginPath(); c.arc(p.x, p.y, 3.2, 0, 7); c.fill(); }
      else if (p.type === "h") { c.strokeStyle = "rgba(255,110,60," + Math.max(0, 1 - p.vie / 2.2) + ")"; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 4, p.y); c.quadraticCurveTo(p.x, p.y - 5, p.x + 4, p.y); c.stroke(); }
      else { c.strokeStyle = p.type === "b" ? "#3b82f6" : "#facc15"; c.lineWidth = 2.6; const k = 0.045; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * k, p.y - p.vy * k); c.stroke(); }
    });
    // Légendes
    c.textAlign = "left"; c.font = O.police(13, true);
    [["#7dd3fc", "électron (courant)"], ["#3b82f6", "photon bleu (puce)"], ["#facc15", "photon jaune (phosphore)"], ["#ff6e3c", "chaleur"]].forEach((l, i) => {
      c.fillStyle = l[0]; c.beginPath(); c.arc(30, 30 + i * 24, 5, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.8)"; c.fillText(l[1], 44, 35 + i * 24);
    });
    // Pièce sélectionnée : cadre pointillé animé
    const z = PIECES[choisie][2];
    c.save(); c.setLineDash([8, 6]); c.lineDashOffset = -performance.now() / 40; c.strokeStyle = "#ffd27a"; c.lineWidth = 2.5; O.rect(c, z[0] - 6, z[1] - 6, z[2] + 12, z[3] + 12, 10); c.stroke(); c.restore();
    c.fillStyle = "#ffd27a"; c.font = O.police(14, true); c.textAlign = "left"; c.fillText(PIECES[choisie][0], 770, 120, 220);

    // Couleur de la lumière qui sort : on compte les photons visibles
    const b = particules.filter(p => p.type === "b" && p.y < 200).length, j = particules.filter(p => p.type === "j" && p.y < 200).length;
    const spd = phosphore ? LED.blancEco : LED.puceBleue;
    const col = CS.couleurLumiere(spd);
    const halo = c.createRadialGradient(500, 140, 10, 500, 140, 60 + 120 * I);
    halo.addColorStop(0, CS.css(col, 0.15 + 0.55 * I)); halo.addColorStop(1, CS.css(col, 0));
    c.fillStyle = halo; c.beginPath(); c.arc(500, 140, 60 + 120 * I, Math.PI, 2 * Math.PI); c.fill();
    Application.afficher("#e1-io", Math.round(I * 100) + " %");
    rI.parentElement.querySelector("output").textContent = Math.round(I * 100) + " %";
    Application.afficher("#e1-sortie", phosphore ? "Blanc" : "Bleu");
    Application.afficher("#e1-conv", phosphore ? (b + j ? Math.round(j / (b + j) * 100) : 62) + " %" : "0 %");
    Application.afficher("#e1-chal", Math.round(60 * I) + " W*");
  }

  function choisir(k) {
    choisie = k;
    document.querySelectorAll("#e1-pieces button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === k)));
    O.el("e1-piece").innerHTML = "<b>" + PIECES[k][0] + "</b><br>" + PIECES[k][1];
    if (!anim.actif()) dessiner();
  }
  O.el("e1-pieces").innerHTML = Object.keys(PIECES).map(k => '<button type="button" class="chip" data-p="' + k + '">' + PIECES[k][0] + "</button>").join("");
  O.el("e1-pieces").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) choisir(b.dataset.p); });
  Application.segment("#e1-phos", [["oui", "Avec phosphore"], ["non", "Sans phosphore"]], "oui", v => { phosphore = v === "oui"; if (!anim.actif()) dessiner(); });
  rI.addEventListener("input", () => { if (!anim.actif()) dessiner(); });
  const anim = O.boucle(cv, animer);
  const bp = O.el("e1-pause");
  bp.textContent = anim.actif() ? "⏸ Pause" : "▶ Animer";
  bp.addEventListener("click", () => { const a = anim.pause(); bp.textContent = a ? "⏸ Pause" : "▶ Animer"; });
  choisir("puce");
  dessiner();
}

/* --- 1b. Le mélangeur : bicolore, RVB, RVBW, RVBWW ------------------------- */
function laboMelangeur() {
  const cv = O.el("e1-mix"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const TECHS = {
    bico: { nom: "Bicolore", canaux: [["blancChaud", "LED blanches chaudes (3 200 K)", "#ffb45e"], ["blancFroid", "LED blanches froides (5 600 K)", "#a8d4ff"]] },
    rvb: { nom: "RVB", canaux: [["rouge", "LED rouges (628 nm)", "#ff453a"], ["vert", "LED vertes (527 nm)", "#30d158"], ["bleu", "LED bleues (462 nm)", "#0a84ff"]] },
    rvbw: { nom: "RVBW", canaux: [["rouge", "Rouge", "#ff453a"], ["vert", "Vert", "#30d158"], ["bleu", "Bleu", "#0a84ff"], ["blancEco", "Blanc (phosphore)", "#e5e5ea"]] },
    rvbww: { nom: "RVBWW", canaux: [["rouge", "Rouge", "#ff453a"], ["vert", "Vert", "#30d158"], ["bleu", "Bleu", "#0a84ff"], ["blancChaud", "Blanc chaud", "#ffb45e"], ["blancFroid", "Blanc froid", "#a8d4ff"]] }
  };
  let tech = "bico", niveaux = [40, 60];
  const zone = O.el("e1-canaux");

  function construireCurseurs() {
    const t = TECHS[tech];
    zone.innerHTML = t.canaux.map((ca, i) => '<label class="ctl"><span><i class="pastille" style="background:' + ca[2] + '"></i>' + ca[1] + '</span><input type="range" min="0" max="100" step="0.1" value="' + (niveaux[i] || 0) + '" data-i="' + i + '"><output></output></label>').join("");
    zone.querySelectorAll("input").forEach(r => r.dispatchEvent(new Event("input", { bubbles: true })));
  }
  zone.addEventListener("input", e => { if (e.target.dataset.i !== undefined) { niveaux[+e.target.dataset.i] = +e.target.value; dessiner(); } });

  function spectre() {
    const t = TECHS[tech], s = new Array(CS.N).fill(0);
    t.canaux.forEach((ca, i) => { const k = (niveaux[i] || 0) / 100; LED[ca[0]].forEach((v, j) => { s[j] += k * v; }); });
    return s;
  }

  /* Réglages tout prêts : on cherche les niveaux (entre 0 et 100) qui
     approchent la couleur visée. Méthode : petits pas successifs (gradient
     projeté), en préférant les LED blanches quand il y en a. */
  function viser(cibleXYZ) {
    const t = TECHS[tech], A = t.canaux.map(ca => CS.XYZ(LED[ca[0]]));
    let w = t.canaux.map(() => 0.3);
    const penal = t.canaux.map(ca => /blanc/.test(ca[0]) ? 0 : 0.02);
    // Descente coordonnée par coordonnée : chaque niveau est réglé à son tour au mieux,
    // les autres étant fixés (méthode simple et stable, même quand les LED se ressemblent).
    for (let tour = 0; tour < 3000; tour++) {
      for (let i = 0; i < w.length; i++) {
        let num = 0, den = penal[i];
        for (let k = 0; k < 3; k++) {
          const reste = cibleXYZ[k] - A.reduce((s, a, m) => s + (m === i ? 0 : a[k] * w[m]), 0);
          num += A[i][k] * reste; den += A[i][k] * A[i][k];
        }
        w[i] = O.borne(num / den, 0, 1);
      }
    }
    // Pleine puissance sur la LED la plus sollicitée ; niveaux au dixième près (les petits dosages comptent)
    const max = Math.max(...w, 1e-6);
    niveaux = w.map(v => Math.round(v / max * 1000) / 10);
    construireCurseurs(); dessiner();
  }
  const cibles = {
    t32: () => CS.XYZ(CS.planck(3200)).map(v => v * 0.8),
    t56: () => CS.XYZ(CS.planck(5600)).map(v => v * 0.8),
    rouge: () => CS.XYZ(LED.rouge).map(v => v * 0.7),
    rose: () => { const a = CS.XYZ(LED.rouge), b = CS.XYZ(CS.planck(5600)); return a.map((v, i) => 0.35 * v + 0.35 * b[i]); },
    cyan: () => { const a = CS.XYZ(LED.vert), b = CS.XYZ(LED.bleu); return a.map((v, i) => 0.4 * v + 0.4 * b[i]); }
  };

  function dessiner() {
    const s = spectre(), Y = CS.XYZ(s)[1], vide = Y < 1e-6;
    const p = vide ? [0.33, 0.33] : CS.xy(CS.XYZ(s)), T = CS.tcc(p), d = CS.duv(p);
    const blanc = Math.abs(d) < 0.02 && T > 1500 && T < 15000;
    zone.querySelectorAll("label").forEach((l, i) => { const o = l.querySelector("output"); if (o) o.textContent = O.nb(niveaux[i] || 0, (niveaux[i] || 0) < 10 ? 1 : 0) + " %"; });

    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // 1. Le spectre, et la part de chaque canal
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.textAlign = "left";
    c.fillText("SPECTRE DE LA LUMIÈRE PRODUITE", 30, 26);
    const maxi = Math.max(...s, 1e-9);
    if (!vide) {
      dessinerSpectre(c, s, 30, 40, 560, 230, { max: maxi });
      TECHS[tech].canaux.forEach((ca, i) => { const k = (niveaux[i] || 0) / 100; if (k > 0) dessinerSpectre(c, LED[ca[0]].map(v => v * k), 30, 40, 560, 230, { max: maxi, trait: true, sansFond: true, couleur: ca[2], epaisseur: 1.4, tirets: [5, 4] }); });
    } else { c.fillStyle = "rgba(255,255,255,.4)"; c.font = O.police(15); c.fillText("Toutes les LED sont éteintes.", 200, 160); }

    // 2. Le diagramme des couleurs : la zone atteignable (gamut) et le point obtenu
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.fillText("DIAGRAMME DES COULEURS (CIE 1931)", 640, 26);
    const P = Diagramme.dessiner(c, 640, 36, 330);
    const pts = TECHS[tech].canaux.map(ca => P(CS.xy(CS.XYZ(LED[ca[0]]))));
    if (pts.length >= 3) {
      // enveloppe : dans l'ordre angulaire autour du centre
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      const ord = pts.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
      c.strokeStyle = "#fff"; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); ord.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.stroke(); c.setLineDash([]);
    } else { c.strokeStyle = "#fff"; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.stroke(); c.setLineDash([]); }
    TECHS[tech].canaux.forEach((ca, i) => { c.fillStyle = ca[2]; c.strokeStyle = "#000"; c.lineWidth = 1.5; c.beginPath(); c.arc(pts[i][0], pts[i][1], 5.5, 0, 7); c.fill(); c.stroke(); });
    if (!vide) { const q = P(p); c.fillStyle = "#fff"; c.strokeStyle = "#000"; c.lineWidth = 2.5; c.beginPath(); c.arc(q[0], q[1], 7, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = "rgba(255,255,255,.8)"; c.font = O.police(11, true); c.textAlign = "left"; const qp = P(CS.uv2xy(CS.locusUV(1700))); c.fillText("← courbe de Planck", qp[0] + 8, qp[1] + 26);

    // 3. Les nuanciers : sous un corps noir de référence, puis sous cette lumière
    const y0 = 312, cw = 70;
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.textAlign = "left";
    c.fillText("RENDU DES COULEURS À LA CAMÉRA (balance des blancs faite)", 30, y0 - 8);
    if (!vide) {
      const ref = CS.planck(O.borne(T, 1600, 15000));
      CS.NUANCIERS.forEach((n, i) => {
        const x = 30 + i * cw;
        c.fillStyle = CS.css(CS.versRVB(CS.objet(ref, n.r)).map(v => v * 1.2)); O.rect(c, x, y0 + 4, cw - 8, 44, 6); c.fill();
        c.fillStyle = CS.css(CS.versRVB(CS.objet(s, n.r)).map(v => v * 1.2)); O.rect(c, x, y0 + 52, cw - 8, 44, 6); c.fill();
        c.fillStyle = "rgba(255,255,255,.6)"; c.font = O.police(11); c.textAlign = "center"; c.fillText(n.nom, x + (cw - 8) / 2, y0 + 112);
      });
      c.textAlign = "left"; c.fillStyle = "rgba(255,255,255,.75)"; c.font = O.police(12, true);
      c.fillText("Référence", 600, y0 + 32); c.fillText("Cette lumière", 600, y0 + 80);
    }
    // Pastille : la couleur de la lumière elle-même
    if (!vide) { c.fillStyle = CS.css(CS.couleurLumiere(s)); c.beginPath(); c.arc(840, 400, 46, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.6)"; c.font = O.police(11, true); c.textAlign = "center"; c.fillText("COULEUR DE LA LUMIÈRE", 840, 466); }

    // Valeurs
    const fid = vide ? 0 : CS.fidelite(s);
    Application.afficher("#e1-tcc", vide ? "—" : blanc ? O.nb(Math.round(T / 50) * 50, 0) + " K" : "couleur");
    const dEl = O.el("e1-duv");
    Application.afficher(dEl, vide ? "—" : Math.abs(d) < 0.0005 ? "0" : (d > 0 ? "+" : "−") + O.nb(Math.abs(d), 3));
    dEl.className = Math.abs(d) < 0.006 ? "ok" : "bad";
    const fEl = O.el("e1-fid");
    Application.afficher(fEl, vide || !blanc ? "—" : O.nb(Math.round(fid), 0));
    fEl.className = fid >= 90 ? "ok" : fid >= 75 ? "" : "bad";
    Application.afficher("#e1-flux", O.nb(Math.round(Y / (TECHS[tech].canaux.length) * 100), 0) + " %");

    // Explication
    const m = O.el("e1-msg");
    if (vide) { m.className = "note"; m.innerHTML = "Montez au moins un curseur."; return; }
    if (tech === "bico") {
      m.className = "note ok";
      m.innerHTML = "Une <b>bicolore</b> ne fait que des <b>blancs</b> : le point se déplace sur la ligne pointillée entre ses deux blancs, tout près de la courbe de Planck. Au milieu, le mélange tire légèrement vers le <b>magenta</b> (la ligne droite passe sous la courbe) : les bons projecteurs compensent.";
    } else if (!blanc) {
      m.className = "note";
      m.innerHTML = "Lumière <b>colorée</b> : elle reste toujours <b>dans le triangle</b> (le gamut) formé par les couleurs des LED. Une couleur hors du triangle est impossible à obtenir.";
    } else if (fid < 75) {
      m.className = "note bad";
      m.innerHTML = "<b>Blanc pauvre :</b> l’œil voit du blanc, mais le spectre n’a que " + (tech === "rvb" ? "trois pics" : "des pics") + ". Regardez les nuanciers : la peau, l’orange ou le cyan changent par rapport à la référence. C’est pour cela qu’une LED RVB seule a un mauvais rendu des couleurs.";
    } else {
      m.className = "note ok";
      m.innerHTML = "<b>Bon blanc :</b> les LED blanches à phosphore remplissent les creux du spectre ; les LED de couleur servent à <b>corriger</b> la teinte (vert / magenta) et à faire des couleurs saturées. C’est tout l’intérêt du " + TECHS[tech].nom + ".";
    }
  }

  Application.segment("#e1-tech", Object.keys(TECHS).map(k => [k, TECHS[k].nom]), tech, v => {
    tech = v; niveaux = { bico: [40, 60], rvb: [55, 45, 40], rvbw: [10, 8, 6, 70], rvbww: [5, 5, 5, 40, 50] }[v];
    construireCurseurs(); dessiner();
  });
  O.situations("e1-cibles", k => viser(cibles[k]()));
  construireCurseurs();
  dessiner();
}

/* --- 1c. Gradation : courant constant ou PWM, et le scintillement ---------- */
function laboGradation() {
  const cv = O.el("e1-pwm"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rN = O.el("e1-niv");
  let mode = "pwm-lente", obtu = 1 / 50, phase = 0;
  const FREQ = { cc: 0, "pwm-lente": 330, "pwm-rapide": 25000 };

  // Lumière reçue pendant une pose de durée obtu commençant à t0 (en s)
  function pose(t0, niveau) {
    if (mode === "cc") return niveau;
    const f = FREQ[mode], T = 1 / f, ton = niveau * T;
    // intégrale exacte d'un créneau périodique
    const prim = t => Math.floor(t / T) * ton + Math.min(t % T, ton);
    return (prim(t0 + obtu) - prim(t0)) / obtu;
  }

  function dessiner() {
    const n = +rN.value / 100;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // Le signal envoyé aux LED sur 10 ms
    const x0 = 40, wC = 600, y0 = 50, hC = 150, duree = 0.010;
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.textAlign = "left";
    c.fillText("COURANT DANS LES LED (10 ms)", x0, 26);
    c.strokeStyle = "rgba(255,255,255,.15)"; c.lineWidth = 1; c.strokeRect(x0, y0, wC, hC);
    c.strokeStyle = "#ffd60a"; c.lineWidth = 2.4; c.beginPath();
    if (mode === "cc") { c.moveTo(x0, y0 + hC * (1 - n)); c.lineTo(x0 + wC, y0 + hC * (1 - n)); }
    else {
      const f = mode === "pwm-rapide" ? 2000 : FREQ[mode]; // la PWM rapide est dessinée « ralentie » (sinon un seul trait plein)
      const T = 1 / f;
      for (let px = 0; px <= wC; px++) { const t = px / wC * duree + phase, on = (t % T) < n * T; const y = y0 + (on ? 0 : hC); px ? c.lineTo(x0 + px, y) : c.moveTo(x0, y); }
    }
    c.stroke();
    c.fillStyle = "rgba(255,255,255,.5)"; c.font = O.police(11); c.fillText("100 %", x0 + wC + 8, y0 + 4); c.fillText("0", x0 + wC + 8, y0 + hC + 4);
    if (mode === "pwm-rapide") { c.fillStyle = "rgba(255,255,255,.45)"; c.fillText("(dessin ralenti : en réalité 25 000 créneaux par seconde)", x0, y0 + hC + 20); }
    // La pose de la caméra
    const largeurPose = Math.min(wC, obtu / duree * wC);
    c.fillStyle = "rgba(10,132,255,.22)"; c.fillRect(x0, y0, largeurPose, hC);
    c.fillStyle = "#64b5ff"; c.font = O.police(11, true); c.fillText("pose " + (obtu === 1 / 50 ? "1/50 s" : obtu === 1 / 500 ? "1/500 s" : "1/2000 s") + (largeurPose >= wC ? " (déborde)" : ""), x0 + 6, y0 + 16);

    // Huit images successives : la luminosité enregistrée par la caméra
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.fillText("HUIT IMAGES SUCCESSIVES À 25 IMAGES/S", x0, 246);
    const vals = [];
    for (let k = 0; k < 8; k++) {
      const v = pose(k * 0.04 + phase + O.alea(k + 1) * 0.0004, n); vals.push(v);
      const g = Math.round(255 * Math.pow(O.borne(v, 0, 1), 1 / 2.2));
      c.fillStyle = "rgb(" + g + "," + Math.round(g * 0.96) + "," + Math.round(g * 0.9) + ")"; O.rect(c, x0 + k * 76, 258, 66, 66, 8); c.fill();
    }
    const ecart = (Math.max(...vals) - Math.min(...vals)) / Math.max(1e-6, n) * 100;
    // Encadré droit
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.fillText("ÉCART ENTRE IMAGES", 700, 26);
    c.font = O.police(40, true); c.fillStyle = ecart > 3 ? "#ff453a" : "#30d158"; c.fillText(O.nb(ecart, 0) + " %", 700, 80);
    c.font = O.police(13); c.fillStyle = "rgba(255,255,255,.7)";
    c.fillText(ecart > 3 ? "l’image pulse : scintillement" : "image stable", 700, 104);

    Application.afficher("#e1-nivo", Math.round(n * 100) + " %");
    rN.parentElement.querySelector("output").textContent = Math.round(n * 100) + " %";
    Application.afficher("#e1-f", mode === "cc" ? "continu" : O.nb(FREQ[mode], 0) + " Hz");
    Application.afficher("#e1-cyc", mode === "cc" ? "—" : Math.round(n * 100) + " %");
    const sc = O.el("e1-scint"); Application.afficher(sc, ecart > 3 ? "Oui" : "Non"); sc.className = ecart > 3 ? "bad" : "ok";
    const m = O.el("e1-msg3");
    if (mode === "cc") { m.className = "note ok"; m.innerHTML = "<b>Courant constant (CCR) :</b> on baisse le courant, la LED éclaire moins mais en continu. Aucun scintillement, quelle que soit la vitesse d’obturation. Inconvénient : à très bas niveau, la couleur peut légèrement dériver."; }
    else if (ecart > 3) { m.className = "note bad"; m.innerHTML = "<b>Scintillement :</b> la LED s’allume et s’éteint " + FREQ[mode] + " fois par seconde. Selon l’instant où chaque pose commence, elle « attrape » plus ou moins de créneaux allumés : les images n’ont pas la même luminosité. Le défaut augmente avec les vitesses d’obturation rapides."; }
    else { m.className = "note ok"; m.innerHTML = "<b>Image stable :</b> la pose contient " + (mode === "pwm-rapide" ? "des centaines de" : "beaucoup de") + " créneaux : chaque image reçoit presque la même quantité de lumière. Les projecteurs pour l’image utilisent une PWM très rapide (plusieurs dizaines de kHz) ou un mode « haute vitesse »."; }
  }

  rN.addEventListener("input", dessiner);
  Application.segment("#e1-mode", [["cc", "Courant constant"], ["pwm-lente", "PWM 330 Hz"], ["pwm-rapide", "PWM 25 kHz"]], mode, v => { mode = v; dessiner(); });
  Application.segment("#e1-obtu", [["50", "1/50 s"], ["500", "1/500 s"], ["2000", "1/2000 s"]], "50", v => { obtu = 1 / +v; dessiner(); });
  const anim = O.boucle(cv, dt => { phase += dt * 0.0011; dessiner(); });
  const bp = O.el("e1-pause3");
  bp.textContent = anim.actif() ? "⏸ Pause" : "▶ Animer";
  bp.addEventListener("click", () => { const a = anim.pause(); bp.textContent = a ? "⏸ Pause" : "▶ Animer"; });
  dessiner();
}

/* ==========================================================================
   MODULE 2 — Corriger la couleur : CTO, CTB, vert / magenta et Planck
   ========================================================================== */
// Transmission spectrale d'une gélatine (modèle physique simplifié, comme dans la Photométrie)
const GEL = {
  // décalage en mireds : un filtre « idéal » qui déplace exactement un corps noir sur la courbe de Planck
  mired(dm) {
    if (!dm) return CS.LAM.map(() => 1);
    const a = 1.4388e-2 * Math.abs(dm) * 1e-6;
    return CS.LAM.map(l => { const x = 1 / (l * 1e-9); return 0.92 * Math.min(1, dm > 0 ? Math.exp(-a * (x - 1 / 700e-9)) : Math.exp(-a * (1 / 400e-9 - x))); });
  },
  // vert / magenta : g > 0 = Plus Green (on retire du rouge et du bleu), g < 0 = Minus Green (on retire du vert)
  vert(g) {
    if (!g) return CS.LAM.map(() => 1);
    return CS.LAM.map(l => g < 0 ? 0.92 * (1 + g * CS.gs(l, 535, 38)) : 0.92 * (1 - g * (1 - CS.gs(l, 540, 48))));
  }
};
const SOURCES_M2 = {
  th: { nom: "Tungstène 3 200 K", spd: () => CS.planck(3200), T: 3200 },
  jour: { nom: "Lumière du jour 5 600 K", spd: () => CS.planck(5600), T: 5600 },
  couvert: { nom: "Ciel couvert 6 500 K", spd: () => CS.planck(6500), T: 6500 },
  bougie: { nom: "Bougie 1 900 K", spd: () => CS.planck(1900), T: 1900 },
  fluo: { nom: "Tube fluo / LED verte 4 300 K", spd: () => CS.pics([[436, 3, 3, 0.45], [450, 16, 18, 0.25], [545, 4, 4, 1.4], [548, 12, 12, 0.5], [588, 6, 6, 0.25], [611, 5, 5, 1.0], [630, 9, 11, 0.3]]), T: 4300 }
};
const CTX = { "0": ["Aucune", 0], "18": ["⅛ CTO", 18], "35": ["¼ CTO", 35], "70": ["½ CTO", 70], "134": ["Full CTO", 134], "-18": ["⅛ CTB", -18], "-35": ["¼ CTB", -35], "-70": ["½ CTB", -70], "-134": ["Full CTB", -134] };
const VERTS = { "0": ["Aucune", 0], "pg4": ["¼ Plus Green", 0.12], "pg2": ["½ Plus Green", 0.24], "pg": ["Full Plus Green", 0.42], "mg4": ["¼ Minus Green", -0.16], "mg2": ["½ Minus Green", -0.32], "mg": ["Full Minus Green", -0.55] };

Application.labo(2, function () {
  laboPlanck();
  laboMireds();
});

/* --- 2a. Sur la courbe de Planck : gélatines et dominante caméra ----------- */
function laboPlanck() {
  const cv = O.el("e2-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const selSrc = O.el("e2-src"), selCt = O.el("e2-ct"), selV = O.el("e2-v");
  let balance = "5600", trajet = 1, anim = 0;
  selSrc.innerHTML = Object.keys(SOURCES_M2).map(k => '<option value="' + k + '">' + SOURCES_M2[k].nom + "</option>").join("");
  selCt.innerHTML = Object.keys(CTX).sort((a, b) => +b - +a).map(k => '<option value="' + k + '"' + (k === "0" ? " selected" : "") + ">" + CTX[k][0] + (CTX[k][1] ? " (" + (CTX[k][1] > 0 ? "+" : "−") + Math.abs(CTX[k][1]) + " mireds)" : "") + "</option>").join("");
  selV.innerHTML = Object.keys(VERTS).map(k => '<option value="' + k + '">' + VERTS[k][0] + "</option>").join("");

  // Zone du diagramme CIE 1960 (u, v) agrandie autour de la courbe de Planck
  const U0 = 0.165, U1 = 0.335, V0 = 0.265, V1 = 0.375, gx = 30, gy = 40, gw = 600, gh = 388;
  const P = q => [gx + (q[0] - U0) / (U1 - U0) * gw, gy + (1 - (q[1] - V0) / (V1 - V0)) * gh];
  let fond = null;
  function fabriquerFond() {
    const cvf = document.createElement("canvas"); cvf.width = 300; cvf.height = 194;
    const cf = cvf.getContext("2d"), img = cf.createImageData(300, 194);
    for (let j = 0; j < 194; j++) for (let i = 0; i < 300; i++) {
      const q = [U0 + i / 300 * (U1 - U0), V1 - j / 194 * (V1 - V0)], p = CS.uv2xy(q);
      let r = CS.versRVB([p[0] / p[1], 1, (1 - p[0] - p[1]) / p[1]]); const m = Math.max(...r); r = r.map(v => Math.max(0, v) / m);
      const k = (j * 300 + i) * 4; img.data[k] = CS.gamma(r[0]) * 255; img.data[k + 1] = CS.gamma(r[1]) * 255; img.data[k + 2] = CS.gamma(r[2]) * 255; img.data[k + 3] = 255;
    }
    cf.putImageData(img, 0, 0); return cvf;
  }

  function calcul() {
    const S = SOURCES_M2[selSrc.value], spd = S.spd(), dm = CTX[selCt.value][1], g = VERTS[selV.value][1];
    const tg = GEL.mired(dm), tv = GEL.vert(g);
    const apres = spd.map((v, i) => v * tg[i] * tv[i]);
    const p0 = CS.xy(CS.XYZ(spd)), p1 = CS.xy(CS.XYZ(apres));
    const Y0 = CS.XYZ(spd)[1], Y1 = CS.XYZ(apres)[1];
    return { S, spd, apres, p0, p1, T0: CS.tcc(p0), T1: CS.tcc(p1), d0: CS.duv(p0), d1: CS.duv(p1), dm, g, perte: Math.log2(Y0 / Y1) };
  }

  function dessiner() {
    const r = calcul();
    if (!fond) fond = fabriquerFond();
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.textAlign = "left";
    c.fillText("DIAGRAMME DES BLANCS (CIE 1960) · LA COURBE DE PLANCK", gx, 26);
    c.save(); O.rect(c, gx, gy, gw, gh, 12); c.clip(); c.globalAlpha = 0.55; c.drawImage(fond, gx, gy, gw, gh); c.globalAlpha = 1;
    // Zones vert / magenta
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(gx, gy, gw, gh);
    c.font = O.police(15, true); c.fillStyle = "rgba(120,255,140,.9)"; c.fillText("▲ dominante VERTE (+Duv) → corriger avec Minus Green", gx + 16, gy + 24);
    c.fillStyle = "rgba(255,120,220,.95)"; c.fillText("▼ dominante MAGENTA (−Duv) → corriger avec Plus Green", gx + 16, gy + gh - 14);
    // Courbe de Planck et isothermes
    c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath();
    CS.LOCUS.filter(L => L.T >= 1500 && L.T <= 20000).forEach((L, i) => { const q = P(L.uv); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke();
    [1900, 2700, 3200, 4300, 5600, 6500, 10000].forEach(T => {
      const a = CS.locusUV(T), b = CS.locusUV(T * 1.02), t = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(t[0], t[1]), nx = -t[1] / n, ny = t[0] / n;
      const q1 = P([a[0] + nx * 0.012, a[1] + ny * 0.012]), q2 = P([a[0] - nx * 0.012, a[1] - ny * 0.012]);
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(q1[0], q1[1]); c.lineTo(q2[0], q2[1]); c.stroke();
      c.fillStyle = "#fff"; c.font = O.police(12, true); c.textAlign = "center"; c.fillText(O.nb(T, 0) + " K", q2[0], q2[1] + 15);
    });
    // Le trajet de la gélatine
    const A = P(CS.uv(r.p0)), Bf = P(CS.uv(r.p1)), k = trajet, B = [A[0] + (Bf[0] - A[0]) * k, A[1] + (Bf[1] - A[1]) * k];
    if (Math.hypot(Bf[0] - A[0], Bf[1] - A[1]) > 4) O.fleche(c, A[0], A[1], B[0], B[1], "#ffd60a", 3);
    c.fillStyle = CS.css(CS.couleurLumiere(r.spd)); c.strokeStyle = "#000"; c.lineWidth = 2; c.beginPath(); c.arc(A[0], A[1], 9, 0, 7); c.fill(); c.stroke();
    if (k >= 1) { c.fillStyle = CS.css(CS.couleurLumiere(r.apres)); c.beginPath(); c.arc(Bf[0], Bf[1], 9, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.stroke(); }
    // Balance de la caméra
    const Wb = P(CS.locusUV(+balance)); c.strokeStyle = "#64d2ff"; c.lineWidth = 2.5; c.beginPath(); c.arc(Wb[0], Wb[1], 13, 0, 7); c.stroke();
    c.fillStyle = "#64d2ff"; c.font = O.police(12, true); c.textAlign = "right"; c.fillText("balance caméra " + O.nb(+balance, 0) + " K", Wb[0] - 18, Wb[1] - 12);
    c.restore();

    // À droite : la lumière et ce que voit la caméra
    const x = 660; c.textAlign = "left"; c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true);
    c.fillText("LA LUMIÈRE", x, 26);
    c.fillStyle = CS.css(CS.couleurLumiere(r.spd)); O.rect(c, x, 40, 145, 70, 10); c.fill();
    c.fillStyle = CS.css(CS.couleurLumiere(r.apres)); O.rect(c, x + 160, 40, 145, 70, 10); c.fill();
    c.fillStyle = "rgba(255,255,255,.7)"; c.font = O.police(12); c.fillText("sans gélatine", x + 4, 128); c.fillText("avec gélatine(s)", x + 164, 128);
    c.fillStyle = "rgba(255,255,255,.55)"; c.font = O.police(12, true); c.fillText("À LA CAMÉRA (balance " + O.nb(+balance, 0) + " K)", x, 166);
    // Un visage simplifié + une charte grise, rendus avec la balance choisie
    const blanc = CS.planck(+balance);
    const gris = CS.versRVB(CS.objet(r.apres, CS.LAM.map(() => 0.45), blanc));
    const peau = CS.versRVB(CS.objet(r.apres, CS.NUANCIERS[0].r, blanc));
    const fondS = CS.versRVB(CS.objet(r.apres, CS.LAM.map(() => 0.2), blanc));
    c.fillStyle = CS.css(fondS.map(v => v * 1.4)); O.rect(c, x, 178, 305, 250, 12); c.fill();
    c.fillStyle = CS.css(peau.map(v => v * 1.3)); c.beginPath(); c.ellipse(x + 100, 280, 52, 66, 0, 0, 7); c.fill();
    c.fillRect(x + 78, 340, 44, 40); c.beginPath(); c.ellipse(x + 100, 420, 80, 40, 0, Math.PI, 0); c.fill();
    c.fillStyle = CS.css(gris.map(v => v * 1.3)); O.rect(c, x + 200, 230, 80, 110, 8); c.fill();
    c.fillStyle = "rgba(0,0,0,.55)"; c.font = O.police(11, true); c.textAlign = "center"; c.fillText("charte", x + 240, 290); c.fillText("grise", x + 240, 304);

    // Valeurs
    const ecart = 1e6 / r.S.T + r.dm - 1e6 / +balance;
    // Températures affichées : calculées comme en cours (mireds), à partir des valeurs nominales.
    const Mn = 1e6 / r.S.T + r.dm, Tn = 1e6 / Mn;
    Application.afficher("#e2-t0", O.nb(r.S.T, 0) + " K");
    Application.afficher("#e2-dm", r.dm ? (r.dm > 0 ? "+" : "−") + Math.abs(r.dm) : "0");
    Application.afficher("#e2-t1", O.nb(Math.round(Tn / 10) * 10, 0) + " K");
    const dEl = O.el("e2-duv"); Application.afficher(dEl, Math.abs(r.d1) < 0.0005 ? "0" : (r.d1 > 0 ? "+" : "−") + O.nb(Math.abs(r.d1), 3)); dEl.className = Math.abs(r.d1) < 0.004 ? "ok" : "bad";
    Application.afficher("#e2-perte", r.perte < 0.05 ? "0 IL" : "−" + O.nb(r.perte, 1) + " IL");
    const eEl = O.el("e2-ecart"); Application.afficher(eEl, (ecart > 0.5 ? "+" : "") + O.nb(ecart, 0)); eEl.className = Math.abs(ecart) < 12 ? "ok" : "bad";
    O.el("e2-calc").innerHTML =
      '<div><span class="c">Source</span> M = 1 000 000 / ' + O.nb(r.S.T, 0) + " = <b>" + O.nb(1e6 / r.S.T, 0) + "</b> mireds</div>" +
      '<div><span class="c">Gélatine</span> ' + CTX[selCt.value][0] + " : " + (r.dm >= 0 ? "+" : "−") + Math.abs(r.dm) + " mireds</div>" +
      '<div><span class="c">Après</span> M = ' + O.nb(1e6 / r.S.T, 0) + (r.dm >= 0 ? " + " : " − ") + Math.abs(r.dm) + " = <b>" + O.nb(1e6 / r.S.T + r.dm, 0) + "</b> → T = 1 000 000 / " + O.nb(1e6 / r.S.T + r.dm, 0) + " ≈ <b>" + O.nb(Math.round(1e6 / (1e6 / r.S.T + r.dm) / 10) * 10, 0) + " K</b></div>" +
      '<div><span class="c">Caméra</span> écart = ' + O.nb(1e6 / r.S.T + r.dm, 0) + " − " + O.nb(1e6 / +balance, 0) + " = <b>" + (ecart > 0 ? "+" : "") + O.nb(1e6 / r.S.T + r.dm - 1e6 / +balance, 0) + " mireds</b> " + (ecart > 12 ? "(image orangée)" : ecart < -12 ? "(image bleutée)" : "(neutre)") + "</div>";
    const m = O.el("e2-msg");
    const neutre = Math.abs(ecart) < 12 && Math.abs(r.d1) < 0.004;
    if (neutre) { m.className = "note ok"; m.innerHTML = "<b>Raccord réussi :</b> la lumière filtrée tombe sur la balance de la caméra, sans dominante verte ni magenta. La charte grise est neutre."; }
    else {
      const conseils = [];
      if (ecart > 12) conseils.push("image <b>orangée</b> : il faut <b>refroidir</b> (CTB) ou régler la caméra plus bas en kelvins");
      if (ecart < -12) conseils.push("image <b>bleutée</b> : il faut <b>réchauffer</b> (CTO) ou régler la caméra plus haut en kelvins");
      if (r.d1 > 0.004) conseils.push("dominante <b>verte</b> : poser une <b>Minus Green</b> (magenta)");
      if (r.d1 < -0.004) conseils.push("dominante <b>magenta</b> : poser une <b>Plus Green</b>");
      m.className = "note warn"; m.innerHTML = "Dominante : " + conseils.join(" ; ") + ".";
    }
  }

  function rejouer() {
    if (O.reduit()) { trajet = 1; dessiner(); return; }
    cancelAnimationFrame(anim); const t0 = performance.now();
    (function pas(t) { trajet = Math.min(1, (t - t0) / 700); dessiner(); if (trajet < 1) anim = requestAnimationFrame(pas); })(t0);
  }
  [selSrc, selCt, selV].forEach(s => s.addEventListener("change", rejouer));
  Application.segment("#e2-bal", [["3200", "3 200 K"], ["4300", "4 300 K"], ["5600", "5 600 K"]], balance, v => { balance = v; dessiner(); });
  // Situations de tournage
  const SITU = {
    fenetre: ["jour", "-0", "0", "3200", "Une fenêtre (5 600 K) dans un décor éclairé en tungstène : la caméra est sur 3 200 K. Choisissez la gélatine à poser sur la fenêtre."],
    th: ["th", "0", "0", "5600", "Un projecteur tungstène en extérieur jour (caméra sur 5 600 K). Quelle gélatine sur le projecteur ?"],
    fluo: ["fluo", "0", "0", "4300", "Un décor éclairé par des tubes fluo : la caméra est bien sur 4 300 K, mais l’image est verte. Que poser ?"],
    bougie: ["bougie", "0", "0", "3200", "Une scène à la bougie, caméra sur 3 200 K : l’image est très orangée. C’est souvent voulu !"]
  };
  O.situations("e2-situ", k => {
    const s = SITU[k]; selSrc.value = s[0]; selCt.value = "0"; selV.value = "0";
    Application.segment("#e2-bal", [["3200", "3 200 K"], ["4300", "4 300 K"], ["5600", "5 600 K"]], s[3], v => { balance = v; dessiner(); });
    balance = s[3]; O.el("e2-consigne").innerHTML = s[4]; O.el("e2-consigne").hidden = false; rejouer();
  });
  rejouer();
}

/* --- 2b. Pourquoi les mireds ? Deux règles côte à côte ------------------------ */
function laboMireds() {
  const cv = O.el("e2-reg"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  let M = 1e6 / 5600, histo = [M];
  const TK0 = 1500, TK1 = 12000, x0 = 60, x1 = W - 60;
  const XK = T => x0 + (T - TK0) / (TK1 - TK0) * (x1 - x0);       // règle des kelvins (linéaire)
  const XM = m => x0 + (1e6 / TK0 - m) / (1e6 / TK0 - 1e6 / TK1) * (x1 - x0); // règle des mireds (linéaire en mireds)

  function dessiner() {
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);
    // Bande de couleurs (corps noir) pour chaque règle
    for (let x = x0; x <= x1; x += 2) {
      const T = TK0 + (x - x0) / (x1 - x0) * (TK1 - TK0);
      c.fillStyle = CS.css(CS.couleurLumiere(CS.planck(T))); c.fillRect(x, 60, 2, 26);
      const m = 1e6 / TK0 - (x - x0) / (x1 - x0) * (1e6 / TK0 - 1e6 / TK1);
      c.fillStyle = CS.css(CS.couleurLumiere(CS.planck(1e6 / m))); c.fillRect(x, 214, 2, 26);
    }
    c.fillStyle = "rgba(255,255,255,.6)"; c.font = O.police(12, true); c.textAlign = "left";
    c.fillText("RÈGLE EN KELVINS (graduations régulières en K)", x0, 50);
    c.fillText("RÈGLE EN MIREDS (graduations régulières en mireds)", x0, 204);
    c.font = O.police(11); c.textAlign = "center";
    for (let T = 2000; T <= 12000; T += 1000) { c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(XK(T), 86, 1, 8); c.fillText(O.nb(T, 0), XK(T), 106); }
    for (let m = 100; m <= 650; m += 50) { const x = XM(m); if (x < x0 - 1 || x > x1 + 1) continue; c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(x, 240, 1, 8); c.fillText(m, x, 260); }
    // Correspondances : chaque millier de kelvins relié à sa place sur la règle des mireds
    for (let T = 2000; T <= 12000; T += 1000) { c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 1; c.beginPath(); c.moveTo(XK(T), 112); c.lineTo(XM(1e6 / T), 210); c.stroke(); }
    // Historique des pas (gélatines empilées)
    histo.forEach((m, i) => {
      const T = 1e6 / m, a = i === histo.length - 1 ? 1 : 0.4;
      c.fillStyle = "rgba(255,214,10," + a + ")";
      c.beginPath(); c.arc(XK(T), 73, 7, 0, 7); c.fill(); c.beginPath(); c.arc(XM(m), 227, 7, 0, 7); c.fill();
      if (i > 0) {
        const mp = histo[i - 1], Tp = 1e6 / mp;
        c.strokeStyle = "rgba(255,214,10," + a + ")"; c.lineWidth = 2;
        c.beginPath(); c.moveTo(XK(Tp), 128 - (i % 3) * 6); c.lineTo(XK(T), 128 - (i % 3) * 6); c.stroke();
        c.beginPath(); c.moveTo(XM(mp), 280 + (i % 3) * 6); c.lineTo(XM(m), 280 + (i % 3) * 6); c.stroke();
      }
    });
    const T = 1e6 / M;
    c.fillStyle = "#fff"; c.font = O.police(14, true); c.textAlign = "center";
    c.fillText(O.nb(Math.round(T / 10) * 10, 0) + " K", XK(T), 146); c.fillText(O.nb(M, 0) + " mireds", XM(M), 312);
    Application.afficher("#e2-rT", O.nb(Math.round(T / 10) * 10, 0) + " K");
    Application.afficher("#e2-rM", O.nb(M, 0));
    if (histo.length > 1) {
      const mp = histo[histo.length - 2];
      Application.afficher("#e2-rdK", (1e6 / M - 1e6 / mp > 0 ? "+" : "") + O.nb(Math.round((1e6 / M - 1e6 / mp) / 10) * 10, 0) + " K");
      Application.afficher("#e2-rdM", (M - mp > 0 ? "+" : "") + O.nb(M - mp, 0) + " mireds");
    } else { Application.afficher("#e2-rdK", "—"); Application.afficher("#e2-rdM", "—"); }
  }
  O.situations("e2-pas", k => {
    if (k === "zero") { M = 1e6 / 5600; histo = [M]; }
    else if (k === "z32") { M = 1e6 / 3200; histo = [M]; }
    else { const d = +k; if (1e6 / (M + d) < TK0 || 1e6 / (M + d) > TK1) { Application.toast("On sort de la règle : revenez au départ."); return; } M += d; histo.push(M); if (histo.length > 8) histo.shift(); }
    dessiner();
  });
  dessiner();
}

/* ==========================================================================
   MODULE 3 — Les ombres : taille de la source, ombre et pénombre
   ========================================================================== */
Application.labo(3, function () {
  laboRayons();
  laboRendu();
});

/* --- 3a. Rayons, ombre et pénombre (vue de côté) ------------------------------ */
function laboRayons() {
  const cv = O.el("e3-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rD = O.el("e3-D"), rD1 = O.el("e3-d1"), rD2 = O.el("e3-d2");
  const h = 0.25; // l'objet : une tête de 25 cm
  let rayons = true;

  // Part de la source visible depuis un point (x, y) derrière l'objet (0 à 1)
  function visible(x, y, D, d1) {
    if (x <= d1) return 1;
    const t = (x - d1) / x; // fraction du chemin entre le point et la source où l'on croise le plan de l'objet
    // hauteur au plan de l'objet du rayon allant vers le point s de la source : y + t (s − y)
    const lo = (-h / 2 - y) / t + y, hi = (h / 2 - y) / t + y; // valeurs de s bloquées
    if (D < 1e-4) return (lo <= 0 && 0 <= hi) ? 0 : 1;
    const a = Math.max(lo, -D / 2), b = Math.min(hi, D / 2);
    return 1 - Math.max(0, b - a) / D;
  }

  function dessiner() {
    const D = +rD.value / 100, d1 = +rD1.value / 100, d2 = +rD2.value / 100, L = d1 + d2;
    Application.afficher("#e3-Do", D < 0.01 ? "≈ 0 (ponctuelle)" : O.nb(D * 100, 0) + " cm");
    Application.afficher("#e3-d1o", O.nb(d1, 2) + " m");
    Application.afficher("#e3-d2o", O.nb(d2, 2) + " m");

    // Échelle : horizontale pour que tout tienne, verticale agrandie pour bien voir la pénombre
    const xm = 60, xM = W - 150, ech = (xM - xm) / L, Hm = 0.8, yc = (Hc - 70) / 2 + 6, ev = (Hc - 90) / (2 * Hm);
    const sx = x => xm + x * ech, sy = y => yc - y * ev;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, Hc);

    // Lumière de la source : chaque point de l'espace est éclairé selon la part de source qu'il voit
    const pas = 4, haut = sy(Hm), bas = sy(-Hm);
    for (let px = Math.floor(sx(0)); px < sx(L); px += pas) for (let py = haut; py < bas; py += pas) {
      const x = (px - xm) / ech, y = (yc - py) / ev;
      const f = visible(x, y, D, d1);
      c.fillStyle = "rgba(255,206,120," + (0.06 + 0.26 * f) + ")"; c.fillRect(px, py, pas, pas);
    }
    // Le mur : sa luminosité suit la lumière reçue
    for (let py = haut; py < bas; py += 2) {
      const f = visible(L, (yc - py) / ev, D, d1), g = Math.round(40 + 200 * f);
      c.fillStyle = "rgb(" + g + "," + Math.round(g * 0.93) + "," + Math.round(g * 0.82) + ")"; c.fillRect(sx(L), py, 14, 2);
    }
    // Profil de la lumière reçue, dessiné le long du mur
    const gx = sx(L) + 30, gw = 90;
    c.strokeStyle = "rgba(255,255,255,.18)"; c.strokeRect(gx, haut, gw, bas - haut);
    c.strokeStyle = "#ffd60a"; c.lineWidth = 2; c.beginPath();
    for (let py = haut; py <= bas; py += 2) { const f = visible(L, (yc - py) / ev, D, d1); const X = gx + f * gw; py === haut ? c.moveTo(X, py) : c.lineTo(X, py); }
    c.stroke();
    c.fillStyle = "rgba(255,255,255,.6)"; c.font = O.police(11, true); c.textAlign = "center";
    c.fillText("LUMIÈRE REÇUE", gx + gw / 2, haut - 18); c.fillText("0          100 %", gx + gw / 2, haut - 5);

    // Rayons limites : extérieurs (ombre) et croisés (pénombre)
    if (rayons) {
      const s1 = [0, D / 2], s2 = [0, -D / 2], o1 = [d1, h / 2], o2 = [d1, -h / 2];
      const prolonge = (a, b) => { const t = (L - a[0]) / (b[0] - a[0]); return [L, a[1] + t * (b[1] - a[1])]; };
      const ligne = (a, b, col) => { const e = prolonge(a, b); c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sx(a[0]), sy(a[1])); c.lineTo(sx(e[0]), sy(e[1])); c.stroke(); };
      c.setLineDash([6, 5]);
      ligne(s1, o1, "rgba(255,214,10,.9)"); ligne(s2, o2, "rgba(255,214,10,.9)");   // limites de l'ombre totale
      ligne(s2, o1, "rgba(100,210,255,.9)"); ligne(s1, o2, "rgba(100,210,255,.9)");  // limites extérieures de la pénombre
      c.setLineDash([]);
      c.font = O.police(11, true); c.textAlign = "left";
      c.fillStyle = "rgba(255,214,10,.95)"; c.fillText("— limite de l’ombre", 14, Hc - 30);
      c.fillStyle = "rgba(100,210,255,.95)"; c.fillText("— limite de la pénombre", 150, Hc - 30);
    }
    // Source, tête
    c.fillStyle = "#ffd60a"; c.shadowColor = "rgba(255,214,10,.8)"; c.shadowBlur = 18;
    const hs = Math.max(6, sy(-Math.min(D, 2 * Hm) / 2) - sy(Math.min(D, 2 * Hm) / 2));
    c.fillRect(sx(0) - 6, yc - hs / 2, 8, hs); c.shadowBlur = 0;
    c.fillStyle = "#c9b8a6"; c.beginPath(); c.ellipse(sx(d1), sy(0), 12, sy(-h / 2) - sy(0), 0, 0, 7); c.fill();

    // Cotes
    c.fillStyle = "rgba(255,255,255,.85)"; c.font = O.police(12, true); c.textAlign = "center";
    c.fillText("source D", sx(0) + 10, yc - hs / 2 - 10 < 14 ? 14 : yc - hs / 2 - 10);
    c.fillText("tête", sx(d1), sy(h / 2) - 10);
    c.fillText("mur", sx(L) + 7, Hc - 52);
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1;
    [[0, d1, "d₁ = " + O.nb(d1, 2) + " m"], [d1, L, "d₂ = " + O.nb(d2, 2) + " m"]].forEach(q => {
      const y = Hc - 52; c.beginPath(); c.moveTo(sx(q[0]), y - 4); c.lineTo(sx(q[1]), y - 4); c.stroke();
      c.fillText(q[2], (sx(q[0]) + sx(q[1])) / 2, y - 10);
    });
    c.fillStyle = "rgba(255,255,255,.45)"; c.font = O.police(11); c.textAlign = "right"; c.fillText("hauteurs agrandies pour la lisibilité", W - 14, Hc - 12);

    // Valeurs
    const p = D * d2 / d1, ombre = h + (h - D) * d2 / d1, alpha = 2 * Math.atan(D / (2 * d1)) * 180 / Math.PI;
    Application.afficher("#e3-alpha", alpha < 0.1 ? "< 0,1°" : O.nb(alpha, alpha < 10 ? 1 : 0) + "°");
    Application.afficher("#e3-p", O.nb(p * 100, p < 0.1 ? 1 : 0) + " cm");
    Application.afficher("#e3-u", ombre > 0 ? O.nb(ombre * 100, 0) + " cm" : "aucune");
    const v = O.el("e3-type"); const dur = alpha < 5, doux = alpha > 20;
    Application.afficher(v, dur ? "Dure" : doux ? "Douce" : "Intermédiaire"); v.className = dur ? "" : doux ? "ok" : "acc";
    O.el("e3-calc").innerHTML =
      '<div><span class="c">Pénombre</span> p = D × d₂ / d₁ = ' + O.nb(D * 100, 0) + " × " + O.nb(d2, 2) + " / " + O.nb(d1, 2) + " = <b>" + O.nb(p * 100, 1) + " cm</b></div>" +
      '<div><span class="c">Taille apparente</span> α ≈ D / d₁ = ' + O.nb(D, 2) + " / " + O.nb(d1, 2) + " = " + O.nb(D / d1, 3) + " rad ≈ <b>" + O.nb(D / d1 * 57.3, 1) + "°</b></div>" +
      '<div><span class="c">Ombre totale</span> h + (h − D) × d₂ / d₁ = <b>' + (ombre > 0 ? O.nb(ombre * 100, 0) + " cm" : "aucune (source plus grande que l’objet)") + "</b></div>";
    const m = O.el("e3-msg");
    if (dur) { m.className = "note"; m.innerHTML = "<b>Lumière dure :</b> vue depuis la tête, la source est minuscule (" + O.nb(alpha, 1) + "°). Presque tous les points du mur voient la source entière… ou rien du tout : le bord de l’ombre est <b>net</b>. Comme le soleil (0,5°)."; }
    else if (doux) { m.className = "note ok"; m.innerHTML = "<b>Lumière douce :</b> la source est grande vue depuis la tête (" + O.nb(alpha, 0) + "°). Entre le plein éclairage et l’ombre, une large <b>pénombre</b> voit seulement une partie de la source : la transition est progressive." + (ombre <= 0 ? " La source est même plus grande que la tête : il n’y a plus d’ombre totale sur le mur." : ""); }
    else { m.className = "note warn"; m.innerHTML = "<b>Intermédiaire :</b> une pénombre de " + O.nb(p * 100, 0) + " cm adoucit le bord de l’ombre. Pour l’adoucir encore : une source plus grande, une source plus proche, ou un mur plus proche de la tête."; }
  }
  [rD, rD1, rD2].forEach(r => r.addEventListener("input", dessiner));
  Application.segment("#e3-ray", [["oui", "Rayons visibles"], ["non", "Masquer"]], "oui", v => { rayons = v === "oui"; dessiner(); });
  const PRESETS = { ampoule: [1, 200, 100], fresnel: [15, 250, 100], softbox: [60, 150, 100], proche: [60, 60, 100], octa: [150, 150, 100], soleil: [2, 220, 100], mur: [60, 150, 15] };
  O.situations("e3-situ", k => { const p = PRESETS[k]; O.curseur(rD, p[0]); O.curseur(rD1, p[1]); O.curseur(rD2, p[2]); });
  dessiner();
}

/* --- 3b. Le rendu : une sphère, son ombre propre et son ombre portée ------- */
function laboRendu() {
  const cv = O.el("e3-r"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rT = O.el("e3-rT"), rDist = O.el("e3-rd"), rAz = O.el("e3-ra");
  const LW = 480, LH = 300;                      // résolution de calcul (agrandie à l'affichage)
  const tampon = document.createElement("canvas"); tampon.width = LW; tampon.height = LH;
  const tc = tampon.getContext("2d"), img = tc.createImageData(LW, LH);
  let type = "diffuse", minuterie = null;

  // La scène (mètres) : sol y = 0, mur z = −1,1, sphère (une tête) de rayon 0,14 m à 0,55 m du sol
  const S = [0, 0.42, 0], R = 0.16, MUR = -0.42;
  const cam = [0.15, 0.62, 1.55], vise = [0, 0.36, -0.25];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mulv = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const normv = a => mulv(a, 1 / Math.hypot(a[0], a[1], a[2]));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const fwd = normv(sub(vise, cam)), right = normv(cross(fwd, [0, 1, 0])), up = cross(right, fwd);

  // Le segment p → q coupe-t-il la sphère ?
  function cache(p, q) {
    const d = sub(q, p), f = sub(p, S), a = dot(d, d), b = 2 * dot(f, d), cc = dot(f, f) - R * R, disc = b * b - 4 * a * cc;
    if (disc < 0) return false;
    const r = Math.sqrt(disc), t1 = (-b - r) / (2 * a), t2 = (-b + r) / (2 * a);
    return (t1 > 1e-4 && t1 < 1) || (t2 > 1e-4 && t2 < 1);
  }

  function rendre(qualite) {
    const taille = +rT.value / 100, dist = +rDist.value / 100, az = +rAz.value * Math.PI / 180, el = 28 * Math.PI / 180;
    // Position et repère de la source (face tournée vers la tête)
    const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)], Lc = add(S, mulv(dir, dist));
    const ln = mulv(dir, -1), lu = normv(cross(ln, [0, 1, 0])), lv = cross(lu, ln);
    // Les points de la source : grille régulière (panneau nu) ou tirage réparti (source diffusée)
    const pts = [];
    if (type === "panneau") { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pts.push(add(Lc, add(mulv(lu, (i - 1) / 2 * taille), mulv(lv, (j - 1) / 2 * taille)))); }
    else { const n = qualite; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pts.push(add(Lc, add(mulv(lu, ((i + O.alea(i * 7 + j)) / n - 0.5) * taille), mulv(lv, ((j + O.alea(j * 13 + i + 3)) / n - 0.5) * taille)))); }
    // Exposition constante : la lumière reçue par la tête ne dépend pas de la distance (on règle le diaph)
    const k = dist * dist, nb = pts.length;
    // Éclairement d'un point P de normale N : moyenne sur les points de la source.
    // Un petit décalage propre à chaque pixel (graine) transforme les bandes en grain fin, lissé à l'affichage.
    function eclairer(P, N, surSphere, graine) {
      let e = 0;
      for (let m = 0; m < nb; m++) {
        const q = type === "panneau" ? pts[m] : add(pts[m], add(mulv(lu, (graine - 0.5) * taille / qualite), mulv(lv, (O.alea(graine * 91 + m) - 0.5) * taille / qualite)));
        const v = sub(q, P), d2 = dot(v, v), vn = mulv(v, 1 / Math.sqrt(d2)), cosA = dot(N, vn), cosB = -dot(ln, vn);
        if (cosA <= 0 || cosB <= 0) continue;
        if (!surSphere && cache(P, q)) continue; // la tête fait de l'ombre au sol et au mur
        e += cosA * cosB / d2;
      }
      return e / nb * k * 1.05 + 0.05;
    }
    // Le décor (sol ou mur) rencontré par un rayon
    function decor(d, graine) {
      let t = 1e9, P = null, N = null, alb = null;
      if (d[1] < 0) { const tf = -cam[1] / d[1], Q = add(cam, mulv(d, tf)); if (Q[2] > MUR) { t = tf; P = Q; N = [0, 1, 0]; alb = [0.55, 0.55, 0.57]; } }
      if (d[2] < 0) { const tw = (MUR - cam[2]) / d[2]; if (tw < t) { P = add(cam, mulv(d, tw)); N = [0, 0, 1]; alb = [0.72, 0.72, 0.74]; } }
      if (!P) return [0.04, 0.04, 0.045];
      const e = eclairer(P, N, false, graine);
      return [alb[0] * e, alb[1] * e, alb[2] * e];
    }
    const pix = 2 * 0.7 / LW; // largeur angulaire d'un pixel
    for (let py = 0; py < LH; py++) for (let px = 0; px < LW; px++) {
      const sx = (px + 0.5) / LW * 2 - 1, sy = 1 - (py + 0.5) / LH * 2, graine = O.alea(px * 7.13 + py * 131.7);
      const d = normv(add(fwd, add(mulv(right, sx * 0.7), mulv(up, sy * 0.7 * LH / LW))));
      // La sphère : distance du rayon à son centre, pour un bord lissé (anticrénelage)
      const f = sub(cam, S), b = dot(f, d), dperp = Math.sqrt(Math.max(0, dot(f, f) - b * b)), marge = pix * -b;
      let col;
      if (dperp < R + marge && b < 0) {
        const disc = R * R - dperp * dperp, ts = -b - Math.sqrt(Math.max(0, disc)), P = add(cam, mulv(d, ts)), N = normv(sub(P, S));
        const e = eclairer(P, N, true, graine), cs = [0.86 * e, 0.62 * e, 0.5 * e];
        const couv = O.borne((R - dperp) / marge + 0.5, 0, 1);
        if (couv < 1) { const cd = decor(d, graine); col = cs.map((v, n) => v * couv + cd[n] * (1 - couv)); } else col = cs;
      } else col = decor(d, graine);
      const o = (py * LW + px) * 4;
      img.data[o] = CS.gamma(col[0]) * 255; img.data[o + 1] = CS.gamma(col[1]) * 255; img.data[o + 2] = CS.gamma(col[2]) * 255; img.data[o + 3] = 255;
    }
    tc.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.drawImage(tampon, 0, 0, W, Hc);
    // Annotations
    c.font = O.police(14, true); c.fillStyle = "rgba(255,255,255,.85)"; c.textAlign = "left";
    c.fillText("ombre propre (sur la tête)", 18, 30); c.fillText("ombre portée (sur le sol et le mur)", 18, 52);
    // Valeurs
    const alpha = 2 * Math.atan(taille / (2 * dist)) * 180 / Math.PI, hS = S[1] / Math.sin(el), p = taille * hS / dist;
    Application.afficher("#e3-ralpha", O.nb(alpha, alpha < 10 ? 1 : 0) + "°");
    Application.afficher("#e3-rp", O.nb(p * 100, 0) + " cm");
    const ty = O.el("e3-rtype"); Application.afficher(ty, type === "panneau" ? "Ombres multiples" : alpha < 5 ? "Dure" : alpha > 20 ? "Douce" : "Intermédiaire");
    Application.afficher("#e3-rTo", O.nb(taille * 100, 0) + " cm");
    Application.afficher("#e3-rdo", O.nb(dist, 1) + " m");
    Application.afficher("#e3-rao", O.nb(+rAz.value, 0) + "°");
    const m = O.el("e3-rmsg");
    if (type === "panneau") { m.className = "note warn"; m.innerHTML = "<b>Panneau de LED nu :</b> chaque LED est une petite source ponctuelle : elle dessine <b>sa propre</b> ombre nette. On obtient plusieurs ombres décalées (effet « multi-ombres »). Un <b>diffuseur</b> transforme le panneau en une seule grande source douce."; }
    else if (alpha < 5) { m.className = "note"; m.innerHTML = "<b>Petite source :</b> ombre portée nette, passage brutal de la lumière à l’ombre sur la tête (la « ligne de partage » est fine). Relief et texture très marqués."; }
    else { m.className = "note ok"; m.innerHTML = "<b>Grande source (" + O.nb(alpha, 0) + "°) :</b> l’ombre portée se fond dans le sol, la transition sur la tête devient progressive : c’est le <b>modelé</b> d’une lumière douce. Rapprocher la source a le même effet que l’agrandir."; }
  }

  // Pendant qu'on glisse : rendu rapide ; à l'arrêt : rendu fin
  function demander() { rendre(2); clearTimeout(minuterie); minuterie = setTimeout(() => rendre(7), 160); }
  [rT, rDist, rAz].forEach(r => r.addEventListener("input", demander));
  Application.segment("#e3-rsrc", [["diffuse", "Source diffusée"], ["panneau", "Panneau de 9 LED nu"]], type, v => {
    type = v;
    if (v === "panneau" && +rT.value < 30) { O.curseur(rT, 50); return; }
    demander();
  });
  const PRESETS = { petite: [6, 250, 45], grande: [140, 250, 45], proche: [60, 70, 45], loin: [60, 400, 45], panneau: [40, 150, 45] };
  O.situations("e3-rsitu", k => { const p = PRESETS[k]; rT.value = p[0]; rDist.value = p[1]; rAz.value = p[2]; [rT, rDist, rAz].forEach(r => r.dispatchEvent(new Event("input", { bubbles: true }))); });
  rendre(7);
}
