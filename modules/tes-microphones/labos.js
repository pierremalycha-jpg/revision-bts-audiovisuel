/* ==========================================================================
   labos.js — les labos (étape « Manipuler ») de l'application « Microphones »
   --------------------------------------------------------------------------
   Le HTML de chaque labo est dans index.html, dans un <template data-labo="n">.
   Chaque module peut avoir plusieurs labos. Identifiants : m + module +
   lettre du labo (m3a-…, m3b-…).

   Règle commune (voir docs/CHARTE-APPLICATIONS.md) : dans chaque labo, UNE
   fonction dessiner() relit tous les réglages et redessine TOUT (scène,
   valeurs, explication). Les animations ont un bouton Pause / Lecture, et
   s'arrêtent quand l'élève a demandé moins de mouvement.

   Les calculs sont ceux du cours : ils viennent de l'objet MICRO et du
   tableau DIRECTIVITES définis dans contenu.js (chargé avant ce fichier).
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

/* --- Couleurs des scènes (fond sombre dans les deux thèmes) --------------- */
const COUL = {
  fond: "#0b0c0e", panneau: "#16181c", trait: "rgba(255,255,255,.14)", grille: "rgba(255,255,255,.08)",
  texte: "#e5e5ea", doux: "#8e8e93", bleu: "#0a84ff", ciel: "#64d2ff", vert: "#30d158", jaune: "#ffd60a",
  orange: "#ff9f0a", rose: "#ff375f", violet: "#bf5af2", indigo: "#5e5ce6", rouge: "#ff453a", cuivre: "#d4884a"
};

/* --- Outils partagés ------------------------------------------------------- */
const O = {
  el: id => document.getElementById(id),
  police(taille, gras, mono) { return (gras ? "600 " : "500 ") + taille + "px " + (mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif'); },
  reduit() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; },
  visible(el) { return !!el && el.offsetParent !== null; },
  borne: (v, a, b) => Math.max(a, Math.min(b, v)),
  nb: (v, d) => Application.nombre(v, d),
  // « −12,3 dB » avec le vrai signe moins ; « −∞ dB » dans une annulation
  db(v, d) { if (!isFinite(v)) return (v < 0 ? "−" : "+") + "∞ dB"; const t = O.nb(Math.abs(v) < 0.05 ? 0 : v, d === undefined ? 1 : d); return t.replace("-", "−") + " dB"; },
  signe(v, d) { const t = O.nb(v, d === undefined ? 1 : d).replace("-", "−"); return v > 0 ? "+" + t : t; },
  fond(c) { c.fillStyle = COUL.fond; c.fillRect(0, 0, c.canvas.width, c.canvas.height); },
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
  // Texte en une ligne. o : { s taille, g gras (défaut true), m mono, c couleur, a alignement, b ligne de base }
  ecrire(c, t, x, y, o) {
    o = o || {};
    c.font = O.police(o.s || 15, o.g !== false, o.m);
    c.fillStyle = o.c || COUL.texte; c.textAlign = o.a || "left"; c.textBaseline = o.b || "alphabetic";
    c.fillText(t, x, y);
  },
  situations(id, regler) { O.el(id).addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) regler(b.dataset.s); }); },
  curseur(el, v) { if (typeof el === "string") el = O.el(el); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); },
  // Remplit un <select> à partir d'une liste [valeur, libellé]
  options(sel, liste, choix) { sel.innerHTML = liste.map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(choix) ? " selected" : "") + ">" + o[1] + "</option>").join(""); },
  // Boucle d'animation qui ne tourne que si le canvas est visible.
  // image(dt, t) reçoit le pas (s) et le temps écoulé (s).
  boucle(canvas, image) {
    let actif = !O.reduit(), dernier = performance.now(), temps = 0;
    function pas(t) {
      const dt = Math.max(0, Math.min(0.05, (t - dernier) / 1000)); dernier = t; // jamais négatif
      if (actif && O.visible(canvas)) { temps += dt; image(dt, temps); }
      requestAnimationFrame(pas);
    }
    requestAnimationFrame(pas);
    return { pause(v) { actif = v === undefined ? !actif : !v; return actif; }, actif: () => actif, temps: () => temps };
  },
  // Bouton Pause / Lecture branché sur une boucle
  boutonPause(id, boucle, rappel) {
    const b = O.el(id);
    const maj = () => { b.textContent = boucle.actif() ? "⏸ Pause" : "▶ Lecture"; };
    b.addEventListener("click", () => { boucle.pause(); maj(); if (rappel) rappel(); });
    maj();
  },
  // Écrit une explication seulement si elle a changé (les lecteurs d'écran
  // n'annoncent ainsi que les vrais changements, pas chaque image animée)
  note(id, classe, html) { const el = O.el(id); if (el._html !== html) { el.innerHTML = html; el._html = html; } if (classe !== null && el.className !== classe) el.className = classe; },
  html(id, html) { O.note(id, null, html); },
  // Position d'un clic / d'un doigt dans les coordonnées du canvas
  clic(cv, e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; },
  // Glisser sur un canvas (souris et tactile) : rappel(x, y, debut)
  glisser(cv, rappel) {
    let actif = false;
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", e => { actif = true; cv.setPointerCapture(e.pointerId); const p = O.clic(cv, e); rappel(p[0], p[1], true); });
    cv.addEventListener("pointermove", e => { if (!actif) return; const p = O.clic(cv, e); rappel(p[0], p[1], false); });
    const fin = () => { actif = false; };
    cv.addEventListener("pointerup", fin); cv.addEventListener("pointercancel", fin);
  },
  // Échelle logarithmique : valeur → position
  log(v, a, b, x0, x1) { return x0 + (Math.log10(v) - Math.log10(a)) / (Math.log10(b) - Math.log10(a)) * (x1 - x0); },
  // et l'inverse : position → valeur
  delog(x, a, b, x0, x1) { return Math.pow(10, Math.log10(a) + (x - x0) / (x1 - x0) * (Math.log10(b) - Math.log10(a))); },
  // Curseur logarithmique : position 0…1000 → valeur entre a et b
  valLog(pos, a, b) { return Math.pow(10, Math.log10(a) + pos / 1000 * (Math.log10(b) - Math.log10(a))); },
  posLog(v, a, b) { return Math.round((Math.log10(v) - Math.log10(a)) / (Math.log10(b) - Math.log10(a)) * 1000); },
  // Fréquence lisible : « 63 Hz », « 1,2 kHz »
  hz(f) { return f >= 1000 ? O.nb(f / 1000, f >= 10000 ? 0 : 1) + " kHz" : O.nb(f, 0) + " Hz"; },
  // Longueur lisible : « 1,7 cm », « 34 cm », « 17 m »
  metres(m) { return m >= 1 ? O.nb(m, m >= 10 ? 0 : 2) + " m" : m >= 0.01 ? O.nb(m * 100, m >= 0.1 ? 0 : 1) + " cm" : O.nb(m * 1000, 1) + " mm"; },
  // Pression lisible : « 20 µPa », « 0,2 Pa », « 63 Pa »
  pascals(p) { return p >= 1 ? O.nb(p, p >= 10 ? 0 : 2) + " Pa" : p >= 1e-3 ? O.nb(p * 1000, p >= 0.01 ? 0 : 1) + " mPa" : O.nb(p * 1e6, 0) + " µPa"; },
  // Tension lisible : « 1,23 V », « 2,0 mV », « 45 µV »
  volts(U) { const a = Math.abs(U); return a >= 1 ? O.nb(U, 2) + " V" : a >= 1e-3 ? O.nb(U * 1000, a >= 0.1 ? 0 : 1) + " mV" : O.nb(U * 1e6, 0) + " µV"; }
};

/* --- Diagramme polaire sur canvas -----------------------------------------
   0° en haut (l'axe du micro), angles dans le sens des aiguilles d'une montre
   (90° = à droite du micro vu de dessus).
   O.polaireGrille(c, cx, cy, R, { db, etiquettes })
   O.polaireCourbe(c, cx, cy, R, f, { couleur, largeur, db, remplir })
     f(θ en degrés) → gain signé (1 = sur l'axe). Le lobe de polarité
     inversée (gain négatif) est dessiné en pointillés, comme dans les
     schémas du cours (figPolaire).
   O.polaireRayon(g, R, db) : rayon d'un gain sur le diagramme. */
O.polaireRayon = (g, R, db) => db ? Math.max(0, (25 + 20 * Math.log10(Math.max(Math.abs(g), 1e-6))) / 25) * R : Math.min(1.6, Math.abs(g)) * R;
O.polaireGrille = function (c, cx, cy, R, o) {
  o = o || {};
  c.lineWidth = 1;
  const n = o.db ? 5 : 4;
  for (let k = 1; k <= n; k++) {
    c.strokeStyle = k === n ? "rgba(255,255,255,.3)" : COUL.grille;
    c.beginPath(); c.arc(cx, cy, R * k / n, 0, Math.PI * 2); c.stroke();
  }
  for (let a = 0; a < 360; a += 30) {
    const t = a * Math.PI / 180;
    c.strokeStyle = COUL.grille; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + R * Math.sin(t), cy - R * Math.cos(t)); c.stroke();
  }
  if (o.etiquettes !== false) {
    [[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]].forEach(p => {
      const t = p[0] * Math.PI / 180;
      O.ecrire(c, p[1], cx + (R + 16) * Math.sin(t), cy - (R + 16) * Math.cos(t), { s: 12, g: false, c: COUL.doux, a: "center", b: "middle" });
    });
    if (o.db) [0, -10, -20].forEach(v => O.ecrire(c, O.signe(v, 0) + " dB", cx + 4, cy - R * (25 + v) / 25 + 11, { s: 10, g: false, c: COUL.doux }));
  }
};
O.polaireCourbe = function (c, cx, cy, R, f, o) {
  o = o || {};
  const couleur = o.couleur || COUL.jaune;
  const points = [];
  for (let a = 0; a <= 360; a += 1) {
    const g = f(a), r = O.polaireRayon(g, R, o.db), t = a * Math.PI / 180;
    points.push([cx + r * Math.sin(t), cy - r * Math.cos(t), g >= 0]);
  }
  if (o.remplir) {
    c.fillStyle = o.remplir; c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath(); c.fill();
  }
  c.strokeStyle = couleur; c.lineWidth = o.largeur || 2.6; c.lineJoin = "round";
  [true, false].forEach(positif => {
    c.setLineDash(positif ? [] : [7, 5]);
    c.beginPath();
    let ouvert = false;
    points.forEach(p => {
      if (p[2] === positif) { if (ouvert) c.lineTo(p[0], p[1]); else { c.moveTo(p[0], p[1]); ouvert = true; } }
      else ouvert = false;
    });
    c.stroke();
  });
  c.setLineDash([]);
};
// Petit micro vu de dessus, pointé vers l'angle « deg » (0° = vers le haut)
O.microDessus = function (c, x, y, deg, couleur, taille) {
  const t = taille || 1;
  c.save(); c.translate(x, y); c.rotate(deg * Math.PI / 180);
  c.fillStyle = couleur || COUL.texte;
  O.rect(c, -6 * t, -12 * t, 12 * t, 26 * t, 6 * t); c.fill();
  c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-6 * t, -4 * t, 12 * t, 2 * t);
  c.restore();
};

/* ==========================================================================
   MODULE 1 — DU SON AU SIGNAL
   ========================================================================== */

/* --- Labo 1a : l'onde de pression -----------------------------------------
   Onde plane : déplacement des tranches d'air ξ = ξ0·sin(ωt − kx) ;
   pression p = −ρc²·∂ξ/∂x ∝ cos(ωt − kx) : les compressions sont là où les
   tranches convergent. Le temps est ralenti (une période ≈ 1,6 s à l'écran)
   et la fenêtre d'espace s'adapte à la longueur d'onde (règle graduée). */
labo(1, function () {
  const cv = O.el("m1a-cv"), c = cv.getContext("2d");
  const curF = O.el("m1a-f"), curL = O.el("m1a-niv");
  const RHO = 1.2, S_MICRO = 0.020; // masse volumique de l'air (kg/m³), sensibilité du micro (V/Pa)
  const FENETRES = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]; // largeurs possibles de la fenêtre (m)
  const XA = 24, XB = 770, F_VIS = 0.62; // zone des molécules ; fréquence d'affichage (Hz)
  let tAnim = 0;

  const freq = () => { const f = O.valLog(+curF.value, 20, 20000); return f >= 1000 ? Math.round(f / 10) * 10 : f >= 100 ? Math.round(f) : Math.round(f * 10) / 10; };

  function dessiner() {
    const f = freq(), L = +curL.value, p = MICRO.pa(L), lam = MICRO.lambda(f), T = 1 / f;
    const xi = Math.SQRT2 * p / (RHO * MICRO.c * 2 * Math.PI * f); // amplitude du déplacement (m)
    const fen = FENETRES.find(w => w >= 1.5 * lam) || FENETRES[FENETRES.length - 1];
    const lamPx = lam / fen * (XB - XA), k = 2 * Math.PI / lamPx, w = 2 * Math.PI * F_VIS, t = tAnim;
    const amp = 0.8 + L / 140 * 7.5; // déplacement affiché (px) : exagéré, croissant avec le niveau
    const ph = x => w * t - k * (x - XA);

    O.fond(c);
    // --- fond coloré : compression (orange) / dépression (bleu)
    for (let x = XA; x < XB; x += 3) {
      const pr = Math.cos(ph(x)), a = Math.abs(pr) * (0.08 + 0.32 * L / 140);
      c.fillStyle = pr > 0 ? "rgba(255,159,10," + a.toFixed(3) + ")" : "rgba(100,210,255," + a.toFixed(3) + ")";
      c.fillRect(x, 34, 3, 206);
    }
    // --- les tranches d'air (points), et une tranche suivie en rouge
    const pasX = 10.6;
    for (let r = 0; r < 9; r++) {
      const y = 50 + r * 22.5;
      for (let x0 = XA + 4 + (r % 2) * pasX / 2; x0 < XB - 2; x0 += pasX) {
        const x = x0 + amp * Math.sin(ph(x0));
        c.fillStyle = "rgba(229,229,234,.85)"; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill();
      }
    }
    const xSuivi = XA + 4 + pasX * 20, ySuivi = 50 + 4 * 22.5, xs = xSuivi + amp * Math.sin(ph(xSuivi));
    c.strokeStyle = COUL.rose; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(xSuivi, 36); c.lineTo(xSuivi, 238); c.stroke(); c.setLineDash([]);
    c.fillStyle = COUL.rose; c.beginPath(); c.arc(xs, ySuivi, 5, 0, 7); c.fill();
    O.ecrire(c, "cette tranche oscille sur place", xSuivi + 10, 30, { s: 12, g: false, c: COUL.rose });
    O.ecrire(c, "sens de propagation →", XB - 4, 30, { s: 12, g: false, c: COUL.doux, a: "right" });

    // --- le micro : membrane qui suit la pression à son emplacement
    const pm = Math.cos(ph(XB + 18));
    const xm = 806 + pm * Math.min(10, amp * 1.1);
    c.fillStyle = "#2c2f36"; O.rect(c, 822, 70, 150, 150, 18); c.fill();
    c.fillStyle = "#3a3e47"; c.fillRect(818, 82, 8, 126);
    c.strokeStyle = COUL.jaune; c.lineWidth = 4; c.beginPath();
    c.moveTo(812, 84); c.quadraticCurveTo(xm, 145, 812, 206); c.stroke();
    O.ecrire(c, "membrane", 897, 104, { s: 13, c: COUL.jaune, a: "center" });
    O.ecrire(c, pm > 0.3 ? "poussée (surpression)" : pm < -0.3 ? "aspirée (dépression)" : "au repos", 897, 126, { s: 12, g: false, c: COUL.texte, a: "center" });
    O.ecrire(c, "capsule", 897, 196, { s: 12, g: false, c: COUL.doux, a: "center" });

    // --- p(x) : la pression le long de la rangée
    const y0 = 315, A = 46;
    c.strokeStyle = COUL.trait; c.lineWidth = 1;
    c.beginPath(); c.moveTo(XA, y0); c.lineTo(XB, y0); c.stroke();
    O.ecrire(c, "p (x)", XA, 262, { s: 13, c: COUL.doux });
    O.ecrire(c, "+", XA - 14, y0 - A + 5, { s: 13, c: COUL.orange });
    O.ecrire(c, "−", XA - 14, y0 + A + 5, { s: 13, c: COUL.ciel });
    c.strokeStyle = COUL.orange; c.lineWidth = 2.6; c.beginPath();
    for (let x = XA; x <= XB; x += 2) { const y = y0 - A * Math.cos(ph(x)); x === XA ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
    // λ repérée entre deux crêtes successives
    let xc = XA + ((w * t / k) % lamPx + lamPx) % lamPx; // une crête : ph = 2πn
    if (xc + lamPx > XB) xc -= lamPx;
    if (xc < XA) xc += lamPx;
    if (xc + lamPx <= XB) {
      c.strokeStyle = COUL.blanc || "#fff"; c.lineWidth = 1.4;
      O.fleche(c, xc + lamPx / 2, y0 - A - 12, xc + 2, y0 - A - 12, "#fff", 1.4);
      O.fleche(c, xc + lamPx / 2, y0 - A - 12, xc + lamPx - 2, y0 - A - 12, "#fff", 1.4);
      O.ecrire(c, "λ = " + O.metres(lam), xc + lamPx / 2, y0 - A - 18, { s: 13, a: "center" });
    }
    // règle graduée (la fenêtre s'adapte à λ)
    const yr = 392, grad = fen / 10;
    c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(XA, yr); c.lineTo(XB, yr); c.stroke();
    for (let i = 0; i <= 10; i++) {
      const x = XA + i / 10 * (XB - XA);
      c.beginPath(); c.moveTo(x, yr); c.lineTo(x, yr + (i % 5 ? 6 : 10)); c.stroke();
      if (i % 5 === 0) O.ecrire(c, i === 0 ? "0" : O.metres(i * grad), x, yr + 24, { s: 12, g: false, c: COUL.doux, a: i === 0 ? "left" : i === 10 ? "right" : "center" });
    }
    O.ecrire(c, "règle : la fenêtre mesure " + O.metres(fen), (XA + XB) / 2, yr + 46, { s: 12, g: false, c: COUL.doux, a: "center" });

    // --- tension de sortie u(t) (oscillogramme, le présent à droite)
    const ox = 800, ow = 180, oy = 330, oh = 70;
    c.fillStyle = COUL.panneau; O.rect(c, ox - 8, 252, ow + 16, 210, 12); c.fill();
    O.ecrire(c, "tension de sortie u(t)", ox, 274, { s: 12, c: COUL.doux });
    c.strokeStyle = COUL.trait; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + ow, oy); c.stroke();
    const au = 0.15 + 0.85 * L / 140;
    c.strokeStyle = COUL.vert; c.lineWidth = 2.2; c.beginPath();
    for (let i = 0; i <= ow; i += 2) {
      const tau = (ow - i) / ow * 3.2; // 3,2 s affichées (temps ralenti)
      const y = oy - oh / 2 * 0.95 * au * Math.cos(w * (t - tau) - k * (XB + 18 - XA));
      i ? c.lineTo(ox + i, y) : c.moveTo(ox + i, y);
    }
    c.stroke();
    O.ecrire(c, "u efficace ≈ " + O.volts(S_MICRO * p), ox, 392, { s: 13, c: COUL.vert });
    O.ecrire(c, "temps ralenti ×" + O.nb(f / F_VIS, f / F_VIS >= 100 ? 0 : 1), ox, 414, { s: 12, g: false, c: COUL.doux });
    O.ecrire(c, "1 période réelle = " + (T >= 1e-3 ? O.nb(T * 1000, 2) + " ms" : O.nb(T * 1e6, 0) + " µs"), ox, 434, { s: 12, g: false, c: COUL.doux });

    // --- valeurs, calcul, explication
    Application.afficher("#m1a-fo", O.hz(f));
    Application.afficher("#m1a-nivo", L + " dB SPL");
    Application.afficher("#m1a-p", O.pascals(p));
    Application.afficher("#m1a-l", L + " dB SPL");
    Application.afficher("#m1a-lam", O.metres(lam));
    Application.afficher("#m1a-t", T >= 1e-3 ? O.nb(T * 1000, 2) + " ms" : O.nb(T * 1e6, 0) + " µs");
    Application.afficher("#m1a-x", xi >= 1e-3 ? O.nb(xi * 1000, 2) + " mm" : xi >= 1e-6 ? O.nb(xi * 1e6, 2) + " µm" : O.nb(xi * 1e9, 2) + " nm");
    Application.afficher("#m1a-u", O.volts(S_MICRO * p));
    O.html("m1a-calc",
      '<div><span class="c">p = p₀ × 10^(L/20)</span></div><div>= 2·10⁻⁵ × 10^(' + O.nb(L / 20, 2) + ") = <b>" + O.pascals(p) + "</b></div>" +
      '<div><span class="c">λ = c / f</span></div><div>= 343 / ' + O.nb(f, 1) + " = <b>" + O.metres(lam) + "</b></div>" +
      '<div><span class="c">T = 1 / f</span></div><div>= 1 / ' + O.nb(f, 1) + " = <b>" + (T >= 1e-3 ? O.nb(T * 1000, 2) + " ms" : O.nb(T * 1e6, 0) + " µs") + "</b></div>");
    let cls = "note ok", txt;
    if (L <= 10) txt = "<b>Presque le seuil d’audition.</b> À 0 dB SPL, la pression vaut 20 µPa : il y a bien un son, juste à la limite de ce que l’oreille perçoit.";
    else if (L >= 120) { cls = "note bad"; txt = "<b>Seuil de douleur.</b> " + O.pascals(p) + " : l’oreille est en danger, et beaucoup de micros statiques approchent de leur niveau maximal admissible."; }
    else if (L === 94) txt = "<b>1 Pa = 94 dB SPL.</b> C’est la pression de référence des fiches techniques : la sensibilité d’un micro est donnée pour 1 Pa.";
    else txt = "<b>" + O.pascals(p) + "</b> seulement, contre 101 325 Pa de pression atmosphérique : la membrane du micro doit réagir à des variations minuscules.";
    if (f < 100) txt += " À " + O.hz(f) + ", la longueur d’onde (" + O.metres(lam) + ") est immense devant un micro.";
    else if (f > 5000) { txt += " À " + O.hz(f) + ", λ ne fait que " + O.metres(lam) + " : c’est la taille d’une capsule, qui commence à perturber l’onde (module 3)."; if (cls === "note ok") cls = "note warn"; }
    O.note("m1a-msg", cls, txt);
  }

  const boucle = O.boucle(cv, dt => { tAnim += dt; dessiner(); });
  O.boutonPause("m1a-pause", boucle);
  curF.addEventListener("input", dessiner);
  curL.addEventListener("input", dessiner);
  const NIVEAUX = { seuil: 0, chuchot: 30, conv: 60, pa: 94, cc: 130 };
  O.situations("m1a-situ", s => O.curseur(curL, NIVEAUX[s]));
  O.situations("m1a-freq", s => O.curseur(curF, O.posLog(+s, 20, 20000)));
  dessiner();
});

/* --- Labo 1b : niveau et distance --------------------------------------------
   Champ libre, source ponctuelle : p ∝ 1/r, donc L(d) = L(1 m) + 20 log(1/d).
   Sur un axe logarithmique, les doublements de distance sont régulièrement
   espacés et la droite L(d) descend de 6 dB à chaque doublement. */
labo(1, function () {
  const cv = O.el("m1b-cv"), c = cv.getContext("2d");
  const curL1 = O.el("m1b-l1"), curD = O.el("m1b-dist");
  const DMIN = 0.1, DMAX = 20, X0 = 90, X1 = 700;
  let deux = false, tAnim = 0;
  const X = d => O.log(d, DMIN, DMAX, X0, X1);
  const dist = () => { const d = O.valLog(+curD.value, DMIN, DMAX); return d >= 1 ? Math.round(d * 10) / 10 : Math.round(d * 100) / 100; };
  const REPERES = [[0, "seuil d’audition"], [30, "chuchotement"], [60, "conversation à 1 m"], [94, "1 Pa"], [125, "douleur"]];

  function dessiner() {
    const L1 = +curL1.value, d = dist(), ajout = deux ? 10 * Math.log10(2) : 0;
    const L = L1 + MICRO.ecartDistance(1, d) + ajout, p = MICRO.pa(L);
    O.fond(c);

    // --- axe des distances (logarithmique)
    const ya = 112;
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(X0, ya + 40); c.lineTo(X1, ya + 40); c.stroke();
    [0.1, 0.2, 0.5, 1, 2, 5, 10, 20].forEach(v => {
      c.beginPath(); c.moveTo(X(v), ya + 36); c.lineTo(X(v), ya + 44); c.stroke();
      O.ecrire(c, O.nb(v, 1) + " m", X(v), ya + 60, { s: 12, g: false, c: COUL.doux, a: "center" });
    });
    O.ecrire(c, "distance (échelle logarithmique)", X1, ya + 78, { s: 11, g: false, c: COUL.doux, a: "right" });
    // la source
    c.fillStyle = "#3a3e47"; O.rect(c, 24, ya - 30, 40, 60, 8); c.fill();
    c.fillStyle = COUL.orange; c.beginPath(); c.arc(44, ya - 8, 9, 0, 7); c.fill(); c.beginPath(); c.arc(44, ya + 14, 6, 0, 7); c.fill();
    if (deux) { c.fillStyle = "#3a3e47"; O.rect(c, 30, ya - 52, 28, 18, 5); c.fill(); c.fillStyle = COUL.violet; c.beginPath(); c.arc(44, ya - 43, 5, 0, 7); c.fill(); }
    O.ecrire(c, deux ? "2 sources" : "source", 44, ya + 50, { s: 12, c: COUL.orange, a: "center" });
    // fronts d'onde : un arc par doublement de distance (régulièrement espacés en log)
    const doubles = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16];
    doubles.forEach((v, i) => {
      const x = X(v);
      c.strokeStyle = "rgba(255,159,10," + (0.7 * Math.pow(0.72, i) + 0.08).toFixed(3) + ")"; c.lineWidth = 2;
      c.beginPath(); c.arc(x - 30, ya, 36, -0.75, 0.75); c.stroke();
      if (i > 0) O.ecrire(c, "−6 dB", (X(doubles[i - 1]) + x) / 2, ya - 46, { s: 11, g: false, c: COUL.doux, a: "center" });
    });
    // impulsion qui voyage (temps ralenti)
    const u = (tAnim * 0.22) % 1, dPulse = DMIN * Math.pow(DMAX / DMIN, u);
    c.strokeStyle = "rgba(255,214,10," + (0.9 / Math.max(1, dPulse / 0.25)).toFixed(3) + ")"; c.lineWidth = 3;
    c.beginPath(); c.arc(X(dPulse) - 30, ya, 36, -0.75, 0.75); c.stroke();
    // le micro (déplaçable)
    const xm = X(d);
    c.fillStyle = COUL.ciel; O.rect(c, xm - 9, ya - 12, 34, 24, 10); c.fill();
    c.fillStyle = "#1c1c1e"; c.fillRect(xm - 9, ya - 1, 6, 2);
    O.ecrire(c, "micro", xm + 8, ya - 20, { s: 12, c: COUL.ciel, a: "center" });

    // --- courbe L(d) : une droite sur l'axe logarithmique
    const gy0 = 222, gy1 = 440, hautL = L1 + 24, basL = L1 - 32;
    const Y = v => gy0 + (hautL - v) / (hautL - basL) * (gy1 - gy0);
    c.strokeStyle = COUL.grille; c.lineWidth = 1;
    for (let v = Math.ceil(basL / 6) * 6; v <= hautL; v += 6) { c.beginPath(); c.moveTo(X0, Y(v)); c.lineTo(X1, Y(v)); c.stroke(); O.ecrire(c, String(v), X0 - 8, Y(v) + 4, { s: 11, g: false, c: COUL.doux, a: "right" }); }
    O.ecrire(c, "niveau (dB SPL)", X0 - 8, gy0 - 8, { s: 11, g: false, c: COUL.doux, a: "left" });
    doubles.forEach(v => { c.strokeStyle = "rgba(255,255,255,.06)"; c.beginPath(); c.moveTo(X(v), gy0); c.lineTo(X(v), gy1); c.stroke(); });
    const trace = (dec, couleur) => { c.strokeStyle = couleur; c.lineWidth = 2.6; c.beginPath(); c.moveTo(X(DMIN), Y(L1 + 20 + dec)); c.lineTo(X(DMAX), Y(L1 + MICRO.ecartDistance(1, DMAX) + dec)); c.stroke(); };
    if (deux) { c.setLineDash([6, 5]); trace(0, "rgba(255,159,10,.55)"); c.setLineDash([]); trace(ajout, COUL.violet); }
    else trace(0, COUL.orange);
    c.fillStyle = COUL.ciel; c.beginPath(); c.arc(xm, Y(L), 6, 0, 7); c.fill();
    c.strokeStyle = COUL.ciel; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(xm, ya + 14); c.lineTo(xm, Y(L)); c.stroke(); c.setLineDash([]);

    // --- échelle verticale des niveaux, à droite
    const ex = 800, ey0 = 446, ey1 = 30, YL = v => ey0 - v / 140 * (ey0 - ey1);
    c.fillStyle = COUL.panneau; O.rect(c, ex - 14, ey1 - 14, 202, ey0 - ey1 + 28, 12); c.fill();
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(ex + 18, ey0); c.lineTo(ex + 18, ey1); c.stroke();
    for (let v = 0; v <= 140; v += 20) { c.beginPath(); c.moveTo(ex + 12, YL(v)); c.lineTo(ex + 18, YL(v)); c.stroke(); O.ecrire(c, String(v), ex + 8, YL(v) + 4, { s: 11, g: false, c: COUL.doux, a: "right" }); }
    const g = c.createLinearGradient(0, ey0, 0, ey1);
    g.addColorStop(0, COUL.vert); g.addColorStop(0.6, COUL.jaune); g.addColorStop(0.86, COUL.rouge);
    c.fillStyle = g; c.fillRect(ex + 22, YL(O.borne(L, 0, 140)), 18, ey0 - YL(O.borne(L, 0, 140)));
    REPERES.forEach(r => { c.strokeStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.moveTo(ex + 44, YL(r[0])); c.lineTo(ex + 52, YL(r[0])); c.stroke(); O.ecrire(c, r[1], ex + 56, YL(r[0]) + 4, { s: 11, g: false, c: COUL.doux }); });
    O.ecrire(c, O.nb(L, 1) + " dB", ex + 31, YL(O.borne(L, 0, 140)) - 8, { s: 13, c: COUL.ciel, a: "center" });

    // --- valeurs, calcul, explication
    const ecart = L - L1;
    Application.afficher("#m1b-l1o", L1 + " dB SPL");
    Application.afficher("#m1b-disto", O.metres(d));
    Application.afficher("#m1b-d", O.metres(d));
    Application.afficher("#m1b-l", O.nb(L, 1) + " dB SPL");
    Application.afficher("#m1b-p", O.pascals(p));
    Application.afficher("#m1b-e", O.db(ecart).replace(/^(\d)/, "+$1"));
    O.html("m1b-calc",
      '<div><span class="c">L = L(1 m) + 20 log(1 / d)' + (deux ? " + 10 log 2" : "") + "</span></div>" +
      "<div>= " + L1 + " + 20 log(1 / " + O.nb(d, 2) + ")" + (deux ? " + 3,0" : "") + "</div>" +
      "<div>= " + L1 + " " + (MICRO.ecartDistance(1, d) >= 0 ? "+ " : "− ") + O.nb(Math.abs(MICRO.ecartDistance(1, d)), 1) + (deux ? " + 3,0" : "") + " = <b>" + O.nb(L, 1) + " dB SPL</b></div>" +
      '<div><span class="c">p = 2·10⁻⁵ × 10^(L/20)</span> = <b>' + O.pascals(p) + "</b></div>");
    const nbDoubles = Math.log2(d);
    let cls = "note ok", txt = Math.abs(nbDoubles - Math.round(nbDoubles)) < 0.03 && Math.round(nbDoubles) !== 0
      ? "<b>" + Math.abs(Math.round(nbDoubles)) + " doublement" + (Math.abs(Math.round(nbDoubles)) > 1 ? "s" : "") + " de distance</b> par rapport à 1 m : " + O.signe(-6 * Math.round(nbDoubles), 0) + " dB environ (exactement " + O.db(MICRO.ecartDistance(1, d)) + ")."
      : "<b>Chaque doublement de distance retire 6 dB.</b> Sur l’axe logarithmique, les doublements sont régulièrement espacés : la courbe est une droite.";
    if (deux) txt += " Deux sources identiques non corrélées : <b>+3 dB</b> seulement (les puissances s’additionnent), pas +6 dB.";
    if (d < 0.3) { cls = "note warn"; txt += " Très près d’une source étendue (une bouche, un haut-parleur), la loi en 1/r n’est plus qu’approchée : c’est le champ proche."; }
    else if (d > 5) { cls = "note warn"; txt += " Attention : dans une vraie salle, les réflexions (champ réverbéré) empêchent le niveau de baisser indéfiniment. Ce calcul suppose le champ libre."; }
    O.note("m1b-msg", cls, txt);
  }

  const boucle = O.boucle(cv, dt => { tAnim += dt; dessiner(); });
  O.boutonPause("m1b-pause", boucle);
  curL1.addEventListener("input", dessiner);
  curD.addEventListener("input", dessiner);
  Application.segment("#m1b-n", [["1", "1 source"], ["2", "2 sources égales"]], "1", v => { deux = v === "2"; dessiner(); });
  O.glisser(cv, (x, y) => { if (y > 200 || x < X0 - 20 || x > X1 + 20) return; O.curseur(curD, O.posLog(O.borne(O.delog(x, DMIN, DMAX, X0, X1), DMIN, DMAX), DMIN, DMAX)); });
  const SITU = { voix: [60, 0.3], voix4: [60, 4], ampli: [105, 0.1], double: [80, 4] };
  O.situations("m1b-situ", s => { curL1.value = SITU[s][0]; O.curseur(curD, O.posLog(SITU[s][1], DMIN, DMAX)); });
  dessiner();
});

/* ==========================================================================
   MODULE 2 — TECHNOLOGIES DE MICRO
   ========================================================================== */

/* --- Labo 2a : quatre capsules ouvertes ------------------------------------
   La pression au niveau de la membrane vaut p(t) = p̂·cos ωt.
   - Statique, électret (membrane « raide », contrôlée par sa raideur) :
     déplacement x ∝ p, tension ∝ x, donc tension ∝ p.
   - Dynamique, ruban (membrane conçue pour que sa vitesse suive la pression) :
     vitesse v ∝ p, donc déplacement x ∝ ∫p dt = sin ωt / ω (en retard de 90°,
     et d'autant plus petit que f est haute) ; tension e = B·l·v ∝ p.
   Toutes donnent une tension proportionnelle à p : seule la SENSIBILITÉ
   (mV/Pa) change. L'oscillogramme et les barres gardent une échelle commune. */
labo(2, function () {
  const cv = O.el("m2a-cv"), c = cv.getContext("2d");
  const curF = O.el("m2a-f"), curL = O.el("m2a-niv");
  const F_VIS = 0.55;
  const TECH = {
    dyn: { nom: "Dynamique", S: 2, princ: "Induction (e = B·l·v)", gr: "Vitesse de la membrane", alim: "Aucune", sens: "≈ 1,5 à 3 mV/Pa", z: "≈ 150 à 600 Ω", vitesse: true, couleur: COUL.orange },
    ruban: { nom: "Ruban", S: 1.5, princ: "Induction (ruban dans un aimant)", gr: "Vitesse du ruban", alim: "Aucune (ruban passif)", sens: "≈ 1 à 2 mV/Pa", z: "≈ 0,2 Ω → ≈ 300 Ω", vitesse: true, couleur: COUL.rose },
    stat: { nom: "Électrostatique", S: 20, princ: "Condensateur à charge constante", gr: "Déplacement de la membrane", alim: "Fantôme 48 V", sens: "≈ 10 à 40 mV/Pa", z: "≈ 50 à 200 Ω", vitesse: false, couleur: COUL.ciel },
    electret: { nom: "Électret", S: 8, princ: "Condensateur à charge permanente", gr: "Déplacement de la membrane", alim: "Préampli FET : pile, plug-in power ou fantôme", sens: "≈ 5 à 20 mV/Pa", z: "≈ 0,2 à 2 kΩ", vitesse: false, couleur: COUL.vert }
  };
  let tech = "dyn", tAnim = 0;
  const freq = () => { const f = O.valLog(+curF.value, 50, 10000); return f >= 1000 ? Math.round(f / 10) * 10 : Math.round(f); };

  // Bandes de pression qui arrivent de la gauche
  function onde(x0, x1, y0, y1, ph, L) {
    for (let x = x0; x < x1; x += 4) {
      const pr = Math.cos(ph(x)), a = Math.abs(pr) * (0.1 + 0.3 * (L - 40) / 90);
      c.fillStyle = pr > 0 ? "rgba(255,159,10," + a.toFixed(3) + ")" : "rgba(100,210,255," + a.toFixed(3) + ")";
      c.fillRect(x, y0, 4, y1 - y0);
    }
  }
  function fil(points, couleur) { c.strokeStyle = couleur || COUL.texte; c.lineWidth = 1.6; c.beginPath(); points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); }

  function dessiner() {
    const T = TECH[tech], f = freq(), L = +curL.value, p = MICRO.pa(L), t = tAnim, w = 2 * Math.PI * F_VIS;
    const pm = Math.cos(w * t);                                   // pression normalisée sur la membrane
    const ampBase = 3 + (L - 40) / 90 * 9;                        // amplitude affichée à 1 kHz (px)
    const kVit = O.borne(1000 / f, 0.25, 3);                      // dynamique / ruban : x ∝ 1/f (plafonné)
    const dep = T.vitesse ? ampBase * kVit * Math.sin(w * t) : ampBase * pm;
    const vit = T.vitesse ? pm : -Math.sin(w * t);                // vitesse normalisée (signe)
    const kOnde = 2 * Math.PI / 120;
    O.fond(c);
    O.ecrire(c, T.nom.toUpperCase(), 24, 30, { s: 14, c: T.couleur });
    O.ecrire(c, "son →", 24, 96, { s: 13, c: COUL.ciel });

    if (tech === "dyn") {
      const xm = 230;
      onde(20, xm - 6, 110, 390, x => w * t - kOnde * (x - xm), L);
      // membrane (dôme) et bobine solidaire
      c.strokeStyle = COUL.jaune; c.lineWidth = 4; c.beginPath(); c.moveTo(xm, 120); c.quadraticCurveTo(xm + 24 + 2.2 * dep, 250, xm, 380); c.stroke();
      fil([[xm + 10 + dep, 198], [306 + dep, 198]], COUL.cuivre); fil([[xm + 10 + dep, 302], [306 + dep, 302]], COUL.cuivre);
      // aimant en pot : plaque avant, pôle central, culasse
      c.fillStyle = "#4b4ad0"; c.fillRect(300, 158, 170, 24); c.fillRect(300, 318, 170, 24); c.fillRect(448, 158, 22, 184);
      c.fillStyle = "#7d7bea"; c.fillRect(300, 215, 148, 70);
      O.ecrire(c, "pôle central", 374, 255, { s: 12, c: "#fff", a: "center" });
      O.ecrire(c, "aimant (pot magnétique)", 385, 148, { s: 12, g: false, c: "#a5a3f5", a: "center" });
      // lignes de champ dans l'entrefer
      [330, 365, 400, 430].forEach(x => { O.fleche(c, x, 213, x, 186, "rgba(255,255,255,.55)", 1.3); O.fleche(c, x, 287, x, 314, "rgba(255,255,255,.55)", 1.3); });
      // bobine
      c.fillStyle = COUL.cuivre; c.fillRect(306 + dep, 189, 40, 18); c.fillRect(306 + dep, 293, 40, 18);
      O.ecrire(c, "bobine", 326 + dep, 372, { s: 12, c: COUL.cuivre, a: "center" });
      O.ecrire(c, "membrane", xm, 104, { s: 12, c: COUL.jaune, a: "center" });
      // vitesse de la bobine
      if (Math.abs(vit) > 0.15) O.fleche(c, 326 + dep, 236 - 10, 326 + dep + 34 * vit, 236 - 10, COUL.vert, 2.4);
      O.ecrire(c, "v", 326 + dep + 34 * vit + (vit > 0 ? 8 : -16), 232, { s: 13, c: COUL.vert });
      fil([[346 + dep, 198], [500, 198], [500, 230], [560, 230]]); fil([[346 + dep, 302], [500, 302], [500, 270], [560, 270]]);
      O.ecrire(c, "e = B·l·v", 530, 255, { s: 14, c: COUL.vert, a: "center" });
      O.ecrire(c, "la tension suit la VITESSE de la bobine", 24, 440, { s: 13, g: false, c: COUL.texte });
    } else if (tech === "ruban") {
      const xr = 300;
      onde(20, xr - 4, 110, 390, x => w * t - kOnde * (x - xr), L);
      onde(xr + 4, 430, 205, 295, x => w * t - kOnde * (x - xr), L * 0.85);
      c.fillStyle = "#4b4ad0"; c.fillRect(240, 110, 120, 90); c.fillRect(240, 300, 120, 90);
      O.ecrire(c, "N", 300, 162, { s: 22, c: "#fff", a: "center" }); O.ecrire(c, "S", 300, 352, { s: 22, c: "#fff", a: "center" });
      [255, 345].forEach(x => O.fleche(c, x, 204, x, 296, "rgba(255,255,255,.5)", 1.3));
      O.ecrire(c, "B", 232, 254, { s: 13, c: "rgba(255,255,255,.7)", a: "right" });
      // le ruban plissé, vu de dessus (en coupe), qui bouge avec l'air
      c.strokeStyle = "#e8e8f0"; c.lineWidth = 2.4; c.beginPath();
      for (let y = 206; y <= 294; y += 4) { const x = xr + dep + ((y / 4) % 2 ? 3 : -3); y === 206 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.stroke();
      O.ecrire(c, "ruban (≈ 2 µm)", xr, 94, { s: 12, c: "#e8e8f0", a: "center" });
      O.ecrire(c, "← ouvert à l’arrière aussi", 368, 186, { s: 12, g: false, c: COUL.doux });
      // sorties du ruban : par l'entrefer, vers le primaire du transformateur
      fil([[xr + dep + 3, 210], [440, 210], [440, 268], [466, 268]]); fil([[xr + dep + 3, 290], [430, 290], [430, 386], [466, 386]]);
      fil([[538, 268], [580, 268]]); fil([[538, 386], [580, 386]]);
      O.ecrire(c, "sortie", 584, 330, { s: 12, c: COUL.vert, a: "right" });
      // transformateur élévateur
      c.strokeStyle = COUL.cuivre; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(478, 280 + k * 26, 13, -Math.PI / 2, Math.PI / 2); c.stroke(); }
      c.strokeStyle = COUL.texte; c.beginPath(); c.moveTo(499, 268); c.lineTo(499, 386); c.moveTo(505, 268); c.lineTo(505, 386); c.stroke();
      for (let k = 0; k < 4; k++) { c.strokeStyle = COUL.cuivre; c.beginPath(); c.arc(526, 280 + k * 26, 13, Math.PI / 2, 3 * Math.PI / 2); c.stroke(); }
      O.ecrire(c, "transformateur", 502, 262, { s: 12, c: COUL.cuivre, a: "center" });
      O.ecrire(c, "0,2 Ω → ≈ 300 Ω", 502, 410, { s: 12, g: false, c: COUL.doux, a: "center" });
      O.ecrire(c, "le ruban est à la fois membrane et conducteur : e = B·l·v", 24, 440, { s: 13, g: false, c: COUL.texte });
    } else {
      const xm0 = 250, gap = 34, xb = xm0 + gap, elec = tech === "electret";
      onde(20, xm0 - 6, 110, 390, x => w * t - kOnde * (x - xm0), L);
      const xm = xm0 + dep;
      // contre-électrode perforée (fixe)
      c.fillStyle = "#8e8e93"; c.fillRect(xb, 130, 18, 240);
      c.fillStyle = COUL.fond; for (let y = 150; y < 360; y += 34) c.fillRect(xb, y, 18, 11);
      if (elec) { c.fillStyle = "rgba(48,209,88,.55)"; c.fillRect(xb - 5, 130, 5, 240); }
      // membrane métallisée (fixée en haut et en bas, elle se bombe)
      c.strokeStyle = COUL.jaune; c.lineWidth = 3; c.beginPath(); c.moveTo(xm0, 130); c.quadraticCurveTo(xm0 + 2 * dep, 250, xm0, 370); c.stroke();
      // charges (Q constante : même nombre de charges quelle que soit la distance)
      for (let k = 0; k < 6; k++) {
        const y = 156 + k * 38, s = 1 - Math.pow((y - 250) / 120, 2), xk = xm0 + 2 * dep * s * 0.5;
        O.ecrire(c, "+", xk - 13, y + 5, { s: 15, c: COUL.orange, a: "center" });
        O.ecrire(c, "−", xb + 27, y + 5, { s: 15, c: COUL.ciel, a: "center" });
      }
      O.ecrire(c, "membrane", xm0, 114, { s: 12, c: COUL.jaune, a: "center" });
      O.ecrire(c, elec ? "contre-électrode + électret" : "contre-électrode perforée", xb + 26, 392, { s: 12, c: elec ? COUL.vert : COUL.doux });
      // écart d qui varie
      const dVis = xb - (xm0 + dep);
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(xm0 + dep, 250); c.lineTo(xb, 250); c.stroke();
      O.ecrire(c, "d", (xm0 + dep + xb) / 2, 244, { s: 12, c: "#fff", a: "center" });
      // circuit
      fil([[xm0, 130], [xm0, 70], [430, 70]]);
      if (!elec) {
        c.strokeStyle = COUL.texte; O.rect(c, 330, 62, 50, 16, 3); c.stroke();
        O.ecrire(c, "R ≈ 1 GΩ", 355, 56, { s: 12, g: false, c: COUL.doux, a: "center" });
        fil([[380, 70], [400, 70], [400, 40]]);
        O.ecrire(c, "+U₀ (polarisation)", 410, 44, { s: 12, c: COUL.orange });
      }
      fil([[xb + 18, 370], [xb + 18, 420], [xb + 70, 420]]);
      O.ecrire(c, "masse", xb + 76, 424, { s: 12, g: false, c: COUL.doux });
      // préampli (convertisseur d'impédance)
      fil([[xm0, 70], [xm0, 70]]); fil([[430, 70], [430, 225]]);
      c.strokeStyle = COUL.vert; c.lineWidth = 2; c.beginPath(); c.moveTo(430, 205); c.lineTo(430, 295); c.lineTo(500, 250); c.closePath(); c.stroke();
      O.ecrire(c, "FET", 452, 255, { s: 12, c: COUL.vert });
      fil([[500, 250], [560, 250]], COUL.vert);
      O.ecrire(c, "préampli", 465, 318, { s: 12, c: COUL.vert, a: "center" });
      O.ecrire(c, elec ? "à alimenter" : "alimenté par le fantôme", 465, 334, { s: 11, g: false, c: COUL.doux, a: "center" });
      O.ecrire(c, (elec ? "charge permanente" : "Q constante") + " : U = Q·d / (ε₀S) suit le DÉPLACEMENT", 24, 440, { s: 13, g: false, c: COUL.texte });
      void dVis;
    }
    O.ecrire(c, T.vitesse ? "déplacement ∝ 1/f (exagéré, plafonné à l’écran)" : "déplacement ∝ pression (exagéré)", 24, 462, { s: 12, g: false, c: COUL.doux });

    // --- oscillogramme à échelle commune (pleine échelle = statique de 20 mV/Pa)
    const ox = 620, ow = 360, oy = 152, oh = 96;
    c.fillStyle = COUL.panneau; O.rect(c, ox - 12, 22, ow + 24, 236, 12); c.fill();
    O.ecrire(c, "tension de sortie u(t) — échelle commune", ox, 46, { s: 12, c: COUL.doux });
    c.strokeStyle = COUL.trait; c.lineWidth = 1; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + ow, oy); c.stroke();
    c.strokeStyle = "rgba(100,210,255,.25)"; c.setLineDash([4, 4]);
    [-1, 1].forEach(s => { c.beginPath(); c.moveTo(ox, oy - s * oh * 0.9); c.lineTo(ox + ow, oy - s * oh * 0.9); c.stroke(); });
    c.setLineDash([]);
    O.ecrire(c, "niveau d’un statique 20 mV/Pa", ox + ow, oy - oh * 0.9 + 16, { s: 11, g: false, c: "rgba(100,210,255,.7)", a: "right" });
    c.strokeStyle = T.couleur; c.lineWidth = 2.4; c.beginPath();
    for (let i = 0; i <= ow; i += 2) {
      const tau = (ow - i) / ow * 3.6, y = oy - oh * 0.9 * (T.S / 20) * Math.cos(w * (t - tau));
      i ? c.lineTo(ox + i, y) : c.moveTo(ox + i, y);
    }
    c.stroke();
    O.ecrire(c, T.nom + " : " + O.volts(T.S / 1000 * p) + " efficaces", ox, 250, { s: 13, c: T.couleur });

    // --- barres : les quatre technologies au même niveau
    const by = 290, bh = 200;
    c.fillStyle = COUL.panneau; O.rect(c, ox - 12, by - 12, ow + 24, bh + 28, 12); c.fill();
    O.ecrire(c, "Tension délivrée à " + L + " dB SPL (" + O.pascals(p) + ")", ox, by + 12, { s: 12, c: COUL.doux });
    Object.keys(TECH).forEach((k, i) => {
      const Tk = TECH[k], y = by + 34 + i * 40, larg = (ow - 150) * Tk.S / 20;
      O.ecrire(c, Tk.nom, ox, y + 15, { s: 12, c: k === tech ? "#fff" : COUL.doux, g: k === tech });
      c.fillStyle = k === tech ? Tk.couleur : "rgba(255,255,255,.22)"; O.rect(c, ox + 110, y, Math.max(3, larg), 20, 5); c.fill();
      O.ecrire(c, O.volts(Tk.S / 1000 * p), ox + 116 + Math.max(3, larg), y + 15, { s: 12, c: k === tech ? "#fff" : COUL.doux, g: false });
    });

    // --- valeurs et explication
    Application.afficher("#m2a-fo", O.hz(f));
    Application.afficher("#m2a-nivo", L + " dB SPL");
    Application.afficher("#m2a-gr", T.vitesse ? "Vitesse" : "Déplacement");
    Application.afficher("#m2a-sex", O.nb(T.S, 1) + " mV/Pa");
    Application.afficher("#m2a-p", O.pascals(p));
    Application.afficher("#m2a-u", O.volts(T.S / 1000 * p));
    O.html("m2a-fiche",
      '<div><span class="c">Principe</span> ' + T.princ + "</div>" +
      '<div><span class="c">Grandeur captée</span> ' + T.gr.toLowerCase() + "</div>" +
      '<div><span class="c">Alimentation</span> ' + T.alim + "</div>" +
      '<div><span class="c">Sensibilité typique</span> ' + T.sens + "</div>" +
      '<div><span class="c">Impédance de sortie</span> ' + T.z + "</div>" +
      '<div><span class="c">Tension</span> ' + O.nb(T.S, 1) + " mV/Pa × " + O.pascals(p) + " = <b>" + O.volts(T.S / 1000 * p) + "</b></div>");
    let cls = "note ok", txt;
    if (T.vitesse) txt = "<b>La tension suit la vitesse.</b> À " + O.hz(f) + ", la membrane se déplace " + (f < 600 ? "beaucoup (graves : grands déplacements lents)" : f > 2000 ? "très peu (aigus : petits déplacements rapides)" : "modérément") + ", mais sa vitesse, donc la tension, ne dépend que de la pression : la réponse reste plate.";
    else txt = "<b>La tension suit le déplacement.</b> La membrane, légère et tendue, se déplace en proportion de la pression, quelle que soit la fréquence : la tension aussi.";
    txt += " Au même niveau, ce " + T.nom.toLowerCase() + " délivre " + O.volts(T.S / 1000 * p) + ", soit " + (T.S >= 8 ? "≈ " + O.nb(T.S / 2, 0) + " fois plus qu’un dynamique." : "≈ " + O.nb(20 / T.S, 0) + " fois moins qu’un statique : le préampli devra apporter davantage de gain.");
    if (L >= 120 && !T.vitesse) { cls = "note warn"; txt += " À ce niveau, vérifiez le niveau maximal admissible du micro (et son atténuateur)."; }
    if (L >= 120 && tech === "ruban") { cls = "note warn"; txt += " Un ruban est fragile : gare aux souffles et aux pressions très fortes de près."; }
    O.note("m2a-msg", cls, txt);
  }

  const boucle = O.boucle(cv, dt => { tAnim += dt; dessiner(); });
  O.boutonPause("m2a-pause", boucle);
  curF.addEventListener("input", dessiner);
  curL.addEventListener("input", dessiner);
  Application.segment("#m2a-tech", [["dyn", "Dynamique"], ["ruban", "Ruban"], ["stat", "Statique"], ["electret", "Électret"]], "dyn", v => { tech = v; dessiner(); });
  const SITU = { voix: [1000, 74], pa: [1000, 94], grave: [100, 94], caisse: [1000, 125] };
  O.situations("m2a-situ", s => { curF.value = O.posLog(SITU[s][0], 50, 10000); O.curseur(curL, SITU[s][1]); });
  dessiner();
});

/* --- Labo 2b : le condensateur à charge constante --------------------------
   C0 = ε0·S/d0 ; Q = C0·U0 (fixée) ; U(d) = Q·d/(ε0·S) = U0·d/d0 ;
   ΔU = U0·Δd/d0 (ne dépend pas de la surface, à déplacement égal). */
labo(2, function () {
  const cv = O.el("m2b-cv"), c = cv.getContext("2d");
  const E0 = 8.85e-12;
  const cur = { dia: O.el("m2b-dia"), d0: O.el("m2b-d0"), u0: O.el("m2b-u0"), dd: O.el("m2b-dd") };
  let tAnim = 0;

  function dessiner() {
    const D = +cur.dia.value, d0 = +cur.d0.value, U0 = +cur.u0.value, dd = +cur.dd.value;
    const S = Math.PI * Math.pow(D / 2000, 2), C0 = E0 * S / (d0 * 1e-6), Q = C0 * U0, dU = U0 * dd / (d0 * 1000);
    const s = Math.sin(2 * Math.PI * 0.5 * tAnim);
    const dInst = d0 + dd / 1000 * s, Uinst = U0 * dInst / d0;
    O.fond(c);

    // --- vue de côté : contre-électrode fixe à droite, membrane à gauche
    const xb = 420, gapPx = d0 * 4, cy = 230, hPx = 40 + D * 8;
    const exag = Math.min(gapPx * 0.45, dd * 1.6);                 // déplacement affiché (exagéré)
    const xm = xb - gapPx - exag * s;
    c.fillStyle = "#8e8e93"; c.fillRect(xb, cy - hPx / 2, 20, hPx);
    c.fillStyle = COUL.fond; for (let y = cy - hPx / 2 + 14; y < cy + hPx / 2 - 10; y += 30) c.fillRect(xb, y, 20, 9);
    c.strokeStyle = COUL.jaune; c.lineWidth = 4; c.beginPath(); c.moveTo(xm, cy - hPx / 2); c.lineTo(xm, cy + hPx / 2); c.stroke();
    // lignes de champ et charges (le NOMBRE de charges ne change pas : Q constante)
    const nCh = O.borne(Math.round(Q * 1e9 / 0.6), 2, 14);       // 1 symbole ≈ 0,6 nC
    for (let k = 0; k < nCh; k++) {
      const y = cy - hPx / 2 + (k + 0.5) * hPx / nCh;
      c.strokeStyle = "rgba(255,214,10,.18)"; c.lineWidth = 1; c.beginPath(); c.moveTo(xm + 4, y); c.lineTo(xb, y); c.stroke();
      O.ecrire(c, "+", xm - 12, y + 5, { s: 14, c: COUL.orange, a: "center" });
      O.ecrire(c, "−", xb + 32, y + 5, { s: 14, c: COUL.ciel, a: "center" });
    }
    O.ecrire(c, "membrane Ø " + D + " mm", xm, cy - hPx / 2 - 12, { s: 12, c: COUL.jaune, a: "center" });
    O.ecrire(c, "contre-électrode", xb + 10, cy + hPx / 2 + 22, { s: 12, c: COUL.doux, a: "center" });
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1;
    O.fleche(c, (xm + xb) / 2, cy + hPx / 2 + 44, xm, cy + hPx / 2 + 44, "rgba(255,255,255,.7)", 1);
    O.fleche(c, (xm + xb) / 2, cy + hPx / 2 + 44, xb, cy + hPx / 2 + 44, "rgba(255,255,255,.7)", 1);
    O.ecrire(c, "d = " + O.nb(dInst, 3) + " µm", (xm + xb) / 2, cy + hPx / 2 + 64, { s: 13, a: "center" });
    // voltmètre
    c.fillStyle = COUL.panneau; O.rect(c, 24, 24, 200, 70, 12); c.fill();
    O.ecrire(c, "tension aux bornes", 36, 46, { s: 12, c: COUL.doux });
    O.ecrire(c, O.nb(Uinst, 4) + " V", 36, 80, { s: 22, m: true, c: COUL.vert });
    O.ecrire(c, "déplacement de la membrane exagéré à l’écran", 24, 456, { s: 12, g: false, c: COUL.doux });

    // --- graphe U(d) à charge constante : une droite qui passe par l'origine
    const gx0 = 600, gx1 = 970, gy0 = 50, gy1 = 400, dMax = 2 * d0, uMax = 2 * U0;
    const X = d => gx0 + d / dMax * (gx1 - gx0), Y = u => gy1 - u / uMax * (gy1 - gy0);
    c.fillStyle = COUL.panneau; O.rect(c, gx0 - 50, gy0 - 34, gx1 - gx0 + 70, gy1 - gy0 + 82, 12); c.fill();
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(gx0, gy0); c.lineTo(gx0, gy1); c.lineTo(gx1, gy1); c.stroke();
    O.ecrire(c, "U (V)", gx0 - 6, gy0 - 12, { s: 12, c: COUL.doux, a: "center" });
    O.ecrire(c, "d (µm)", gx1, gy1 + 34, { s: 12, c: COUL.doux, a: "right" });
    [0, d0, dMax].forEach(v => O.ecrire(c, O.nb(v, 0), X(v), gy1 + 18, { s: 11, g: false, c: COUL.doux, a: "center" }));
    [0, U0, uMax].forEach(v => O.ecrire(c, O.nb(v, 0), gx0 - 8, Y(v) + 4, { s: 11, g: false, c: COUL.doux, a: "right" }));
    c.strokeStyle = COUL.vert; c.lineWidth = 2.4; c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(dMax), Y(uMax)); c.stroke();
    O.ecrire(c, "Q constante : U = Q·d / (ε₀S)", gx0 + 12, gy0 + 6, { s: 12, c: COUL.vert });
    // zone balayée (exagérée ×1000 en d pour être visible)
    const dz = dd / 50 * 0.35 * d0;
    const da = d0 - dz, db = d0 + dz;
    c.fillStyle = "rgba(255,214,10,.15)"; c.fillRect(X(da), gy0, X(db) - X(da), gy1 - gy0);
    c.strokeStyle = "rgba(255,255,255,.35)"; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(X(d0), gy1); c.lineTo(X(d0), Y(U0)); c.lineTo(gx0, Y(U0)); c.stroke(); c.setLineDash([]);
    const dPt = d0 + (db - d0) * s;
    c.fillStyle = COUL.jaune; c.beginPath(); c.arc(X(dPt), Y(U0 * dPt / d0), 6, 0, 7); c.fill();
    O.ecrire(c, "repos (d₀ ; U₀) — balayage exagéré", X(d0) + 10, Y(U0) + 20, { s: 11, g: false, c: COUL.doux });

    // --- valeurs, calcul, explication
    Application.afficher("#m2b-diao", D + " mm");
    Application.afficher("#m2b-d0o", d0 + " µm");
    Application.afficher("#m2b-u0o", U0 + " V");
    Application.afficher("#m2b-ddo", dd + " nm");
    Application.afficher("#m2b-s", O.nb(S * 1e4, 2) + " cm²");
    Application.afficher("#m2b-c", O.nb(C0 * 1e12, 0) + " pF");
    Application.afficher("#m2b-q", O.nb(Q * 1e9, 2) + " nC");
    Application.afficher("#m2b-du", O.nb(dU * 1000, 1) + " mV");
    O.html("m2b-calc",
      '<div><span class="c">S = π × (D/2)²</span> = ' + O.nb(S * 1e4, 2) + " cm²</div>" +
      '<div><span class="c">C₀ = ε₀·S / d₀</span> = 8,85·10⁻¹² × ' + O.nb(S * 1e4, 2) + "·10⁻⁴ / " + d0 + "·10⁻⁶ = <b>" + O.nb(C0 * 1e12, 0) + " pF</b></div>" +
      '<div><span class="c">Q = C₀·U₀</span> = ' + O.nb(C0 * 1e12, 0) + " pF × " + U0 + " V = <b>" + O.nb(Q * 1e9, 2) + " nC</b></div>" +
      '<div><span class="c">ΔU = U₀·Δd / d₀</span> = ' + U0 + " × " + dd + " nm / " + d0 + " µm = <b>" + O.nb(dU * 1000, 1) + " mV</b></div>");
    let cls = "note ok", txt = "<b>Si ce déplacement de " + dd + " nm est produit par 1 Pa</b>, la sensibilité vaut " + O.nb(dU * 1000, 1) + " mV/Pa.";
    if (dd === 0) { cls = "note warn"; txt = "<b>Membrane immobile : aucune tension de signal.</b> La polarisation seule ne produit qu’une tension continue U₀."; }
    else txt += " Remarquez que ΔU ne dépend <b>pas du diamètre</b> : à déplacement égal, seuls U₀ et d₀ comptent. Une membrane plus grande est plus sensible parce qu’elle se déplace davantage pour une même pression.";
    if (d0 <= 15) { cls = "note warn"; txt += " Un écart très faible augmente la sensibilité, mais la membrane risque de venir toucher la contre-électrode aux forts niveaux."; }
    O.note("m2b-msg", cls, txt);
  }

  const boucle = O.boucle(cv, dt => { tAnim += dt; dessiner(); });
  O.boutonPause("m2b-pause", boucle);
  Object.values(cur).forEach(el => el.addEventListener("input", dessiner));
  const SITU = { cours: [20, 25, 48, 10], petite: [12, 20, 48, 6], grande: [25, 30, 60, 14], serre: [20, 12, 48, 10] };
  O.situations("m2b-situ", s => { const v = SITU[s]; cur.dia.value = v[0]; cur.d0.value = v[1]; cur.u0.value = v[2]; O.curseur(cur.dd, v[3]); });
  dessiner();
});

/* --- Labo 2c : l'induction ---------------------------------------------------
   Fil perpendiculaire au plan, champ B horizontal (de N vers S), mouvement
   vertical sinusoïdal : y = ŷ·sin ωt, v = v̂·cos ωt, e = B·l·v. */
labo(2, function () {
  const cv = O.el("m2c-cv"), c = cv.getContext("2d");
  const cB = O.el("m2c-b"), cL = O.el("m2c-l"), cV = O.el("m2c-vit");
  const W_VIS = 2 * Math.PI * 0.45;
  let tAnim = 0;

  function dessiner() {
    const B = +cB.value, l = +cL.value, v = +cV.value, eMax = B * l * v; // mV (v en mm/s)
    const t = tAnim, pos = Math.sin(W_VIS * t), vit = Math.cos(W_VIS * t);
    O.fond(c);
    // pôles
    c.fillStyle = "#d0453c"; O.rect(c, 40, 110, 110, 230, 10); c.fill();
    c.fillStyle = "#4b4ad0"; O.rect(c, 400, 110, 110, 230, 10); c.fill();
    O.ecrire(c, "N", 95, 236, { s: 32, c: "#fff", a: "center" }); O.ecrire(c, "S", 455, 236, { s: 32, c: "#fff", a: "center" });
    const nLignes = Math.round(3 + B * 5);
    for (let k = 0; k < nLignes; k++) { const y = 120 + (k + 0.5) * 210 / nLignes; O.fleche(c, 156, y, 394, y, "rgba(255,255,255,.28)", 1.2); }
    O.ecrire(c, "B = " + O.nb(B, 1) + " T", 275, 98, { s: 14, a: "center" });
    // le fil, vu en coupe
    const yf = 225 - pos * 80;
    c.fillStyle = COUL.cuivre; c.beginPath(); c.arc(275, yf, 18, 0, 7); c.fill();
    const sens = vit * 1;
    c.strokeStyle = "#fff"; c.lineWidth = 2.4;
    if (Math.abs(sens) < 0.12) { /* immobile : pas de symbole */ }
    // v vers le haut, B vers la droite : v × B entre dans l'écran (⊗) ; vers le bas : sort (⊙)
    else if (sens < 0) { c.beginPath(); c.arc(275, yf, 5, 0, 7); c.fillStyle = "#fff"; c.fill(); }
    else { c.beginPath(); c.moveTo(267, yf - 8); c.lineTo(283, yf + 8); c.moveTo(283, yf - 8); c.lineTo(267, yf + 8); c.stroke(); }
    if (Math.abs(vit) > 0.12) O.fleche(c, 300, yf, 300, yf - 50 * vit, COUL.vert, 2.4);
    O.ecrire(c, "v", 312, yf - 30 * vit, { s: 14, c: COUL.vert });
    O.ecrire(c, "⊙ / ⊗ : sens du courant induit", 40, 380, { s: 12, g: false, c: COUL.doux });
    O.ecrire(c, "fil de longueur l = " + O.nb(l, 1) + " m (perpendiculaire à l’écran)", 40, 402, { s: 12, g: false, c: COUL.doux });

    // courbes position, vitesse, tension
    const gx = 570, gw = 400, rows = [["position du fil", pos, COUL.texte, t => Math.sin(W_VIS * t)], ["vitesse v", vit, COUL.vert, t => Math.cos(W_VIS * t)], ["tension e = B·l·v", vit, COUL.jaune, t => Math.cos(W_VIS * t)]];
    rows.forEach((r, i) => {
      const y0 = 80 + i * 125, A = 40 * (i === 2 ? O.borne(eMax / 20, 0.08, 1) : 1);
      c.fillStyle = COUL.panneau; O.rect(c, gx - 10, y0 - 60, gw + 20, 112, 10); c.fill();
      O.ecrire(c, r[0], gx, y0 - 40, { s: 12, c: r[2] });
      c.strokeStyle = COUL.trait; c.lineWidth = 1; c.beginPath(); c.moveTo(gx, y0); c.lineTo(gx + gw, y0); c.stroke();
      c.strokeStyle = r[2]; c.lineWidth = 2.2; c.beginPath();
      for (let k = 0; k <= gw; k += 2) { const tau = (gw - k) / gw * 4.4, y = y0 - A * r[3](t - tau); k ? c.lineTo(gx + k, y) : c.moveTo(gx + k, y); }
      c.stroke();
      c.fillStyle = r[2]; c.beginPath(); c.arc(gx + gw, y0 - A * r[1], 4, 0, 7); c.fill();
    });
    O.ecrire(c, "e max = " + O.nb(eMax, 2) + " mV", gx + gw, 352, { s: 13, c: COUL.jaune, a: "right" });

    Application.afficher("#m2c-bo", O.nb(B, 1) + " T");
    Application.afficher("#m2c-lo", O.nb(l, 1) + " m");
    Application.afficher("#m2c-vito", O.nb(v, 1) + " mm/s");
    Application.afficher("#m2c-v", O.nb(v, 1) + " mm/s");
    Application.afficher("#m2c-e", O.nb(eMax, 2) + " mV");
    Application.afficher("#m2c-eff", O.nb(eMax / Math.SQRT2, 2) + " mV");
    O.html("m2c-calc", '<div><span class="c">e = B · l · v</span></div><div>= ' + O.nb(B, 1) + " × " + O.nb(l, 1) + " × " + O.nb(v / 1000, 4) + " = <b>" + O.nb(eMax, 2) + " mV</b> (crête)</div>" + '<div><span class="c">efficace = crête / √2</span> = <b>' + O.nb(eMax / Math.SQRT2, 2) + " mV</b></div>");
    O.note("m2c-msg", "note ok", "<b>La tension est maximale quand le fil passe au centre</b>, là où il va le plus vite, et nulle aux extrémités, quand il s’arrête pour repartir : e suit la vitesse, pas la position. Doublez B, l ou v : la tension double.");
  }

  const boucle = O.boucle(cv, dt => { tAnim += dt; dessiner(); });
  O.boutonPause("m2c-pause", boucle);
  [cB, cL, cV].forEach(el => el.addEventListener("input", dessiner));
  dessiner();
});

/* ==========================================================================
   MODULE 3 — LES CAPSULES
   ========================================================================== */

/* --- Labo 3a : ce que voit la membrane ------------------------------------
   Une onde plane arrive sous l'angle θ. L'ouverture avant et l'ouverture
   arrière de la capsule sont séparées d'un petit trajet Δ (agrandi à l'écran).
   Pour une onde p = sin(ωt − k·s), la pression vaut :
     avant   p_av = sin(ωt + kΔ/2 · cos θ)
     arrière p_ar = sin(ωt − kΔ/2 · cos θ − φ)   φ = retard interne du labyrinthe
   Capsule à pression : signal = p_av (l'arrière est clos).
   Capsule à gradient : signal = p_av − p_ar, d'amplitude 2·sin((kΔ·cos θ + φ)/2).
   Avec φ = (A/B)·kΔ on retrouve r(θ) ≈ A + B·cos θ (cardio : φ = kΔ). */
labo(3, function () {
  const cv = O.el("m3a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const cx = 270, cy = 262, RS = 205;           // capsule et cercle de la source
  const KD = 0.6;                               // kΔ (déphasage avant-arrière sur l'axe)
  const LV = 110, kv = 2 * Math.PI / LV;        // longueur d'onde à l'écran (px)
  const DV = KD / kv;                           // écart avant-arrière à l'écran (≈ 10 px)
  const T = 1.6, w = 2 * Math.PI / T;           // période de l'animation (s)
  const TYPES = {
    pression: { nom: "À pression", A: 1 },
    gradient: { nom: "Gradient pur", A: 0 },
    cardio: { nom: "Cardioïde", A: 0.5 },
    hyper: { nom: "Hypercardioïde", A: 0.25 }
  };
  let type = "pression", ang = 40, t = 0, balayage = null;
  const mesures = new Map();                    // angle (pas de 5°) → amplitude signée
  const curseur = O.el("m3a-ang");

  const phi = () => type === "pression" ? 0 : TYPES[type].A / (1 - TYPES[type].A) * KD;
  function amplitude(deg) {
    if (type === "pression") return 1;
    const th = deg * Math.PI / 180;
    return Math.sin((KD * Math.cos(th) + phi()) / 2) / Math.sin((KD + phi()) / 2);
  }
  const pAvant = (deg, tt) => Math.sin(w * tt + KD / 2 * Math.cos(deg * Math.PI / 180));
  const pArriere = (deg, tt) => Math.sin(w * tt - KD / 2 * Math.cos(deg * Math.PI / 180) - phi());
  function signal(deg, tt) {
    if (type === "pression") return pAvant(deg, tt);
    return (pAvant(deg, tt) - pArriere(deg, tt)) / (2 * Math.sin((KD + phi()) / 2));
  }
  function mesurer() { mesures.set(Math.round(ang / 5) * 5 % 360, amplitude(ang)); }

  // Une courbe temporelle dans le panneau de droite
  function trace(y, f, couleur, titre, sousTitre) {
    const x0 = 590, x1 = 975, a = 30;
    O.ecrire(c, titre, x0, y - a - 12, { s: 14 });
    if (sousTitre) O.ecrire(c, sousTitre, x1, y - a - 12, { s: 12, g: false, c: COUL.doux, a: "right" });
    c.strokeStyle = COUL.grille; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    if (!f) return;
    c.strokeStyle = couleur; c.lineWidth = 2.4; c.beginPath();
    for (let i = 0; i <= 190; i++) {
      const tt = t - 2 * T + i / 190 * 2 * T, v = O.borne(f(tt), -1.6, 1.6);
      const x = x0 + i / 190 * (x1 - x0), yy = y - v * a;
      i ? c.lineTo(x, yy) : c.moveTo(x, yy);
    }
    c.stroke();
    c.fillStyle = couleur; c.beginPath(); c.arc(x1, y - O.borne(f(t), -1.6, 1.6) * a, 4, 0, 7); c.fill();
  }

  function dessiner() {
    const A = TYPES[type].A, th = ang * Math.PI / 180;
    O.fond(c);

    // --- L'onde plane (bandes de pression), vue de dessus ---
    c.save();
    c.beginPath(); c.rect(0, 0, 555, Hc); c.clip();
    c.translate(cx, cy); c.rotate(th);                       // +y = sens de propagation
    for (let s = -RS; s < 420; s += 3) {
      const p = Math.sin(w * t - kv * s);
      c.fillStyle = p > 0 ? "rgba(100,210,255," + (0.04 + 0.26 * p).toFixed(3) + ")" : "rgba(10,132,255," + (0.03 * (1 + p)).toFixed(3) + ")";
      c.fillRect(-700, s, 1400, 3.2);
    }
    c.restore();

    // cercle de la source et repères d'angle
    c.strokeStyle = COUL.trait; c.setLineDash([3, 6]); c.beginPath(); c.arc(cx, cy, RS, 0, 7); c.stroke(); c.setLineDash([]);
    [[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]].forEach(p => {
      const a = p[0] * Math.PI / 180;
      O.ecrire(c, p[1], cx + (RS + 22) * Math.sin(a), cy - (RS + 22) * Math.cos(a), { s: 12, g: false, c: COUL.doux, a: "center", b: "middle" });
    });
    O.ecrire(c, "axe du micro ↑", cx, 18, { s: 12, g: false, c: COUL.doux, a: "center" });

    // --- La capsule, en coupe (membrane horizontale, face avant vers le haut) ---
    const sg = signal(ang, t), bomb = O.borne(sg, -1.5, 1.5) * 7;
    c.fillStyle = "#2c2f36"; c.strokeStyle = "#5a5f6a"; c.lineWidth = 2;
    O.rect(c, cx - 46, cy - 34, 12, 70, 4); c.fill(); c.stroke();    // parois
    O.rect(c, cx + 34, cy - 34, 12, 70, 4); c.fill(); c.stroke();
    if (type === "pression") {
      c.fillStyle = "#23262c"; O.rect(c, cx - 46, cy + 4, 92, 32, 6); c.fill(); c.stroke();
      O.ecrire(c, "cavité close", cx, cy + 24, { s: 11, g: false, c: COUL.doux, a: "center" });
      c.fillStyle = COUL.doux; c.beginPath(); c.arc(cx + 30, cy + 32, 2, 0, 7); c.fill();   // évent
    } else if (type !== "gradient") {
      // labyrinthe : chicanes qui allongent le chemin vers l'arrière
      c.strokeStyle = COUL.orange; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const y = cy + 10 + i * 7; c.beginPath(); c.moveTo(i % 2 ? cx - 30 : cx - 34, y); c.lineTo(i % 2 ? cx + 34 : cx + 30, y); c.stroke(); }
      O.ecrire(c, "labyrinthe", cx + 54, cy + 30, { s: 11, g: false, c: COUL.orange });
    } else {
      O.ecrire(c, "ouvert", cx + 54, cy + 30, { s: 11, g: false, c: COUL.doux });
    }
    // membrane (elle se bombe selon la force reçue)
    c.strokeStyle = COUL.jaune; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 34, cy);
    c.quadraticCurveTo(cx, cy - 2 * bomb, cx + 34, cy); c.stroke();
    // ouvertures avant / arrière, colorées par leur pression
    const coulP = p => p > 0 ? "rgba(100,210,255," + (0.35 + 0.6 * p).toFixed(2) + ")" : "rgba(255,55,95," + (0.35 - 0.6 * p).toFixed(2) + ")";
    c.fillStyle = coulP(pAvant(ang, t)); c.beginPath(); c.arc(cx, cy - DV / 2 - 14, 6, 0, 7); c.fill();
    O.ecrire(c, "avant", cx - 54, cy - 18, { s: 11, g: false, c: COUL.doux, a: "right" });
    if (type !== "pression") {
      c.fillStyle = coulP(pArriere(ang, t)); c.beginPath(); c.arc(cx, cy + DV / 2 + 44, 6, 0, 7); c.fill();
      O.ecrire(c, "arrière", cx - 54, cy + 46, { s: 11, g: false, c: COUL.doux, a: "right" });
    }

    // --- La source (haut-parleur tourné vers la capsule) ---
    const sx = cx + RS * Math.sin(th), sy = cy - RS * Math.cos(th);
    c.save(); c.translate(sx, sy); c.rotate(th);
    c.fillStyle = COUL.texte; O.rect(c, -13, -12, 26, 14, 3); c.fill();
    c.beginPath(); c.moveTo(-9, 2); c.lineTo(9, 2); c.lineTo(16, 14); c.lineTo(-16, 14); c.closePath(); c.fill();
    c.restore();
    O.fleche(c, sx - Math.sin(th) * 26, sy + Math.cos(th) * 26, sx - Math.sin(th) * 60, sy + Math.cos(th) * 60, COUL.ciel, 2);

    // --- Les pressions et le signal, à droite ---
    c.fillStyle = COUL.panneau; c.fillRect(565, 0, W - 565, Hc);
    trace(70, tt => pAvant(ang, tt), COUL.ciel, "Pression sur la face avant", "p avant");
    if (type === "pression") {
      trace(170, null, null, "Face arrière", "");
      O.ecrire(c, "Cavité close : la face arrière ne reçoit pas le son.", 590, 175, { s: 12, g: false, c: COUL.doux });
    } else trace(170, tt => pArriere(ang, tt), COUL.rose, "Pression sur la face arrière", type === "gradient" ? "p arrière" : "p arrière, retardée");
    trace(270, tt => signal(ang, tt), COUL.jaune, type === "pression" ? "Signal = pression avant" : "Signal = p avant − p arrière", "");

    // --- Diagramme polaire construit point par point ---
    const px = 680, py = 420, PR = 72;
    O.polaireGrille(c, px, py, PR, { etiquettes: false });
    O.polaireCourbe(c, px, py, PR, d => MICRO.gain(A, d), { couleur: "rgba(255,255,255,.35)", largeur: 1.4 });
    mesures.forEach((v, d) => {
      const r = Math.min(1.2, Math.abs(v)) * PR, a = d * Math.PI / 180;
      c.fillStyle = v >= 0 ? COUL.jaune : COUL.rose; c.beginPath(); c.arc(px + r * Math.sin(a), py - r * Math.cos(a), 3.2, 0, 7); c.fill();
    });
    c.strokeStyle = COUL.ciel; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py); c.lineTo(px + PR * 1.15 * Math.sin(th), py - PR * 1.15 * Math.cos(th)); c.stroke();
    O.ecrire(c, "Directivité mesurée", 775, 365, { s: 14 });
    O.ecrire(c, mesures.size + " angle" + (mesures.size > 1 ? "s" : "") + " sur 72", 775, 388, { s: 12, g: false, c: COUL.doux });
    c.fillStyle = COUL.jaune; c.beginPath(); c.arc(781, 410, 4, 0, 7); c.fill();
    O.ecrire(c, "polarité normale", 792, 414, { s: 12, g: false, c: COUL.doux });
    c.fillStyle = COUL.rose; c.beginPath(); c.arc(781, 432, 4, 0, 7); c.fill();
    O.ecrire(c, "polarité inversée", 792, 436, { s: 12, g: false, c: COUL.doux });
    O.ecrire(c, "── théorie : A + B·cos θ", 775, 460, { s: 12, g: false, c: "rgba(255,255,255,.5)" });

    // --- Valeurs et explication ---
    const a = amplitude(ang), L = 20 * Math.log10(Math.max(Math.abs(a), 1e-6));
    Application.afficher("#m3a-th", ang + "°");
    Application.afficher("#m3a-ango", ang + "°");
    Application.afficher("#m3a-amp", Math.abs(a) < 0.01 ? "−∞ dB" : O.db(L));
    Application.afficher("#m3a-pol", Math.abs(a) < 0.01 ? "—" : a > 0 ? "normale" : "inversée");
    Application.afficher("#m3a-nom", TYPES[type].nom);
    let cl = "note ok", m;
    if (type === "pression") m = "<b>La pression n’a pas de direction.</b> L’arrière est clos : seule la face avant reçoit le son, et elle reçoit la même pression quel que soit l’angle. Le diagramme est un cercle : capsule omnidirectionnelle.";
    else if (Math.abs(a) < 0.03) { cl = "note warn"; m = "<b>Annulation.</b> À " + ang + "°, les deux faces de la membrane reçoivent la même pression au même instant : la force est nulle, le micro n’entend rien."; }
    else if (a < 0) { cl = "note warn"; m = "<b>Polarité inversée.</b> Le son atteint d’abord la face arrière : la membrane part dans l’autre sens. Le niveau est " + O.db(L) + " par rapport à l’axe."; }
    else if (type === "gradient") m = "<b>Seule la différence compte.</b> Les deux faces reçoivent la même onde, décalée du petit trajet Δ·cos θ. Plus la source s’écarte de l’axe, plus ce décalage diminue : la réponse suit cos θ (en huit).";
    else m = "<b>Le labyrinthe retarde l’arrière.</b> Le son qui atteint la face arrière est retardé de " + (type === "cardio" ? "Δ/c : il annule exactement un son venant de 180°" : "Δ/(3c) : l’annulation tombe vers 109°") + ". Balayez les 360° pour voir la courbe apparaître.";
    O.note("m3a-msg", cl, m);
  }

  const boucle = O.boucle(cv, (dt, tt) => {
    t = tt;
    if (balayage !== null) {
      balayage += dt * 80; ang = Math.round(balayage) % 360; mesurer(); curseur.value = ang;
      Application.afficher("#m3a-ango", ang + "°");
      if (balayage >= 360) { balayage = null; ang = 0; curseur.value = 0; }
    }
    dessiner();
  });
  O.boutonPause("m3a-pause", boucle, dessiner);

  function regler(deg) { ang = ((Math.round(deg) % 360) + 360) % 360; curseur.value = ang; curseur.dispatchEvent(new Event("input")); }
  curseur.addEventListener("input", () => { ang = +curseur.value; mesurer(); dessiner(); });
  O.glisser(cv, (x, y) => { if (x < 560) regler(Math.atan2(x - cx, -(y - cy)) * 180 / Math.PI); });
  O.situations("m3a-situ", s => regler(+s));
  O.el("m3a-eff").addEventListener("click", () => { mesures.clear(); balayage = null; dessiner(); });
  O.el("m3a-balai").addEventListener("click", () => {
    mesures.clear();
    if (boucle.actif()) balayage = 0;
    else { for (let d = 0; d < 360; d += 5) mesures.set(d, amplitude(d)); dessiner(); }
  });
  Application.segment("#m3a-type", [["pression", "Pression"], ["gradient", "Gradient"], ["cardio", "Cardio"], ["hyper", "Hyper"]], type, v => { type = v; mesures.clear(); mesurer(); dessiner(); });
  mesurer();
  dessiner();
});

/* --- Labo 3b : effet de proximité ------------------------------------------
   Réponse sur l'axe d'une capsule A + B·cos θ face à une source ponctuelle à la
   distance r : G = 10 log(1 + (B/kr)²) (MICRO.proximite). Coupe-bas : filtre
   passe-haut de Butterworth d'ordre 2 (12 dB/octave) : −10 log(1 + (fc/f)⁴). */
labo(3, function () {
  const cv = O.el("m3b-cv"), c = cv.getContext("2d"), W = cv.width;
  const curseur = O.el("m3b-d");
  const x0 = 70, x1 = 970, y0 = 132, y1 = 430, DBM = 30;
  const X = f => O.log(f, 20, 20000, x0, x1), Y = v => y0 + (DBM - O.borne(v, -DBM, DBM)) / (2 * DBM) * (y1 - y0);
  let A = 0.5, fc = 0;
  const hp = f => fc ? -10 * Math.log10(1 + Math.pow(fc / f, 4)) : 0;
  const distance = () => O.valLog(+curseur.value, 0.02, 2);

  function courbe(fn, couleur, largeur, tirets) {
    c.strokeStyle = couleur; c.lineWidth = largeur; c.setLineDash(tirets || []); c.beginPath();
    for (let i = 0; i <= 300; i++) { const f = 20 * Math.pow(1000, i / 300), x = X(f), y = Y(fn(f)); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.setLineDash([]);
  }

  function dessiner() {
    const r = distance(), B = 1 - A;
    const brut = f => MICRO.proximite(A, r, f), total = f => brut(f) + hp(f);
    O.fond(c);

    // --- La scène : une bouche, un micro, la distance (échelle logarithmique) ---
    const mx = O.log(r, 0.02, 2, 150, 930);
    c.fillStyle = "#3a3d45"; c.beginPath(); c.arc(70, 58, 34, 0, 7); c.fill();
    c.fillStyle = COUL.rose; c.beginPath(); c.ellipse(104, 66, 4, 7, 0, 0, 7); c.fill();
    O.ecrire(c, "bouche", 70, 106, { s: 11, g: false, c: COUL.doux, a: "center" });
    c.strokeStyle = COUL.trait; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(110, 66); c.lineTo(mx - 16, 66); c.stroke(); c.setLineDash([]);
    O.microDessus(c, mx, 66, -90, COUL.texte, 1.1);
    O.ecrire(c, O.metres(r), (110 + mx) / 2, 56, { s: 13, a: "center" });
    [[0.02, "2 cm"], [0.05, "5 cm"], [0.1, "10 cm"], [0.3, "30 cm"], [1, "1 m"], [2, "2 m"]].forEach(p => {
      const x = O.log(p[0], 0.02, 2, 150, 930);
      c.fillStyle = COUL.doux; c.fillRect(x - 0.5, 92, 1, 6); O.ecrire(c, p[1], x, 112, { s: 10, g: false, c: COUL.doux, a: "center" });
    });

    // --- Le graphique ---
    for (let v = -DBM; v <= DBM; v += 6) {
      c.strokeStyle = v === 0 ? "rgba(255,255,255,.35)" : COUL.grille; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0, Y(v)); c.lineTo(x1, Y(v)); c.stroke();
      O.ecrire(c, O.signe(v, 0), x0 - 8, Y(v) + 4, { s: 11, g: false, c: COUL.doux, a: "right" });
    }
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(f => {
      c.strokeStyle = COUL.grille; c.beginPath(); c.moveTo(X(f), y0); c.lineTo(X(f), y1); c.stroke();
      O.ecrire(c, f >= 1000 ? f / 1000 + " k" : String(f), X(f), y1 + 18, { s: 11, g: false, c: COUL.doux, a: "center" });
    });
    O.ecrire(c, "dB", x0 + 6, y0 + 14, { s: 11, g: false, c: COUL.doux });
    O.ecrire(c, "Hz", x1, y1 + 34, { s: 11, g: false, c: COUL.doux, a: "right" });

    courbe(f => MICRO.proximite(A, 1, f), "rgba(255,255,255,.25)", 1.5, [5, 5]);
    if (fc) { courbe(brut, "rgba(255,214,10,.35)", 2); courbe(hp, "rgba(10,132,255,.8)", 1.6, [6, 4]); }
    courbe(total, COUL.jaune, 3);

    // repère à 100 Hz
    const g100 = total(100);
    c.fillStyle = COUL.jaune; c.beginPath(); c.arc(X(100), Y(g100), 5, 0, 7); c.fill();
    O.ecrire(c, O.signe(g100, 1) + " dB à 100 Hz", X(100) + 10, Y(g100) - 10, { s: 13 });
    // légende
    let ly = y0 + 4;
    [[COUL.jaune, "réponse du micro" + (fc ? " avec coupe-bas" : ""), []], ["rgba(255,255,255,.4)", "même micro à 1 m", [5, 5]]].concat(fc ? [["rgba(10,132,255,.9)", "coupe-bas " + fc + " Hz, 12 dB/oct", [6, 4]]] : []).forEach(l => {
      c.strokeStyle = l[0]; c.lineWidth = 2.4; c.setLineDash(l[2]); c.beginPath(); c.moveTo(x1 - 250, ly); c.lineTo(x1 - 222, ly); c.stroke(); c.setLineDash([]);
      O.ecrire(c, l[1], x1 - 214, ly + 4, { s: 12, g: false, c: COUL.texte }); ly += 20;
    });

    // --- Valeurs, calcul, explication ---
    const f3 = B > 0 ? B * MICRO.c / (2 * Math.PI * r) : 0;
    Application.afficher("#m3b-dist", O.metres(r));
    Application.afficher("#m3b-do", O.metres(r));
    Application.afficher("#m3b-g100", O.signe(g100, 1) + " dB");
    Application.afficher("#m3b-g50", O.signe(total(50), 1) + " dB");
    Application.afficher("#m3b-f3", B > 0 ? "≈ " + O.hz(f3) : "aucun effet");
    O.el("m3b-titre").textContent = DIRECTIVITES.find(d => Math.abs(d.A - A) < 0.01).nom;
    const k = 2 * Math.PI * 100 / MICRO.c;
    O.html("m3b-calc", B > 0
      ? '<div><span class="c">k = 2π × 100 / 343</span> = ' + O.nb(k, 3) + ' rad/m</div><div><span class="c">kr</span> = ' + O.nb(k, 3) + " × " + O.nb(r, 3) + " = " + O.nb(k * r, 3) + '</div><div><span class="c">B / kr</span> = ' + O.nb(B, 2) + " / " + O.nb(k * r, 3) + " = " + O.nb(B / (k * r), 2) + '</div><div><span class="c">G</span> = 10 log(1 + ' + O.nb(Math.pow(B / (k * r), 2), 2) + ") = <b>" + O.signe(brut(100), 1) + " dB</b></div>" + (fc ? '<div><span class="c">coupe-bas</span> ' + O.signe(hp(100), 1) + " dB → <b>" + O.signe(g100, 1) + " dB</b></div>" : "")
      : '<div><span class="c">B = 0</span> (capsule à pression)</div><div>G = 10 log(1 + 0) = <b>0 dB</b></div>' + (fc ? '<div><span class="c">coupe-bas</span> ' + O.signe(hp(100), 1) + " dB</div>" : ""));
    let cl, m;
    if (B === 0) { cl = "note ok"; m = "<b>Pas d’effet de proximité.</b> Une capsule à pression ne mesure pas de différence avant-arrière : sa réponse ne dépend pas de la distance." + (fc ? " Ici, le coupe-bas ne fait qu’enlever des graves." : ""); }
    else if (g100 > 9) { cl = "note warn"; m = "<b>Graves très gonflés.</b> À " + O.metres(r) + ", la voix prend " + O.signe(g100, 0) + " dB à 100 Hz. Reculez, passez en omni ou enclenchez le coupe-bas."; }
    else if (fc && Math.abs(g100) < 4 && total(50) < 3) { cl = "note ok"; m = "<b>Compensé.</b> Le coupe-bas retire à peu près ce que l’effet de proximité ajoute : la voix retrouve un grave naturel."; }
    else if (g100 > 2) { cl = "note"; m = "<b>Un peu de chaleur.</b> Les graves montent sous ≈ " + O.hz(f3) + ". C’est souvent recherché sur une voix, à condition de garder la même distance."; }
    else { cl = "note ok"; m = "<b>Effet négligeable.</b> À " + O.metres(r) + ", le terme B/kr est petit dans tout le spectre utile : la réponse reste plate." + (fc && hp(100) < -1 ? " Le coupe-bas, lui, retire alors de vrais graves." : ""); }
    O.note("m3b-msg", cl, m);
  }

  curseur.addEventListener("input", dessiner);
  const segDir = Application.segment("#m3b-dir", [["1", "Omni"], ["0.5", "Cardio"], ["0.25", "Hyper"], ["0", "Huit"]], "0.5", v => { A = +v; dessiner(); });
  const segHp = Application.segment("#m3b-hp", [["0", "Aucun"], ["80", "80 Hz"], ["150", "150 Hz"]], "0", v => { fc = +v; dessiner(); });
  const SITU = { radio: ["0.5", 0.03, "0"], chant: ["0.5", 0.1, "0"], perche: ["0.25", 1, "0"], huit: ["0", 0.05, "0"], omni: ["1", 0.03, "0"] };
  O.situations("m3b-situ", s => { const v = SITU[s]; A = +v[0]; fc = +v[2]; segDir.choisir(v[0]); segHp.choisir(v[2]); O.curseur(curseur, O.posLog(v[1], 0.02, 2)); });
  O.curseur(curseur, O.posLog(0.05, 0.02, 2));
  dessiner();
});

/* --- Labo 3c : double membrane ---------------------------------------------
   Membrane avant : ½(1 + cos θ) ; membrane arrière : ½(1 − cos θ).
   Sortie = avant + m × arrière, m réglé par la polarisation de la membrane
   arrière (de −1 à +1). On obtient A + B·cos θ avec A = (1 + m)/2. */
labo(3, function () {
  const cv = O.el("m3c-cv"), c = cv.getContext("2d");
  const curseur = O.el("m3c-r");

  function dessiner() {
    const m = +curseur.value / 100, A = (1 + m) / 2;
    O.fond(c);

    // --- La coupe de la capsule ---
    const gx = 70, gw = 330;
    O.ecrire(c, "Coupe de la capsule", gx, 30, { s: 14 });
    const y1 = 70, y2 = 112, y3 = 154;
    c.strokeStyle = COUL.jaune; c.lineWidth = 3; c.beginPath(); c.moveTo(gx, y1); c.lineTo(gx + gw, y1); c.stroke();
    c.fillStyle = "#4a4e57"; c.fillRect(gx, y2 - 9, gw, 18);
    c.fillStyle = COUL.fond; for (let x = gx + 14; x < gx + gw; x += 26) c.fillRect(x, y2 - 9, 6, 18);
    const cArr = m >= 0 ? "rgba(255,214,10," + (0.25 + 0.75 * m).toFixed(2) + ")" : "rgba(255,55,95," + (0.25 - 0.75 * m).toFixed(2) + ")";
    c.strokeStyle = Math.abs(m) < 0.02 ? COUL.doux : cArr; c.setLineDash(Math.abs(m) < 0.02 ? [5, 5] : []);
    c.beginPath(); c.moveTo(gx, y3); c.lineTo(gx + gw, y3); c.stroke(); c.setLineDash([]);
    O.ecrire(c, "membrane avant : +U", gx + gw + 10, y1 + 4, { s: 12, c: COUL.jaune });
    O.ecrire(c, "contre-électrode", gx + gw + 10, y2 + 4, { s: 12, g: false, c: COUL.doux });
    O.ecrire(c, "membrane arrière : " + (Math.abs(m) < 0.005 ? "0" : O.signe(m, 2) + " × U"), gx + gw + 10, y3 + 4, { s: 12, c: m >= 0 ? COUL.jaune : COUL.rose });
    O.ecrire(c, "avant ↑", gx - 10, y1 + 4, { s: 11, g: false, c: COUL.doux, a: "right" });

    // --- Les deux cardios, puis le résultat ---
    const R = 66, ya = 330;
    O.polaireGrille(c, 140, ya, R, { etiquettes: false });
    O.polaireCourbe(c, 140, ya, R, d => 0.5 * (1 + Math.cos(d * Math.PI / 180)), { couleur: COUL.jaune, largeur: 2.2 });
    O.ecrire(c, "avant : ½(1 + cos θ)", 140, ya + R + 26, { s: 12, g: false, a: "center" });
    O.ecrire(c, "+", 245, ya + 6, { s: 30, a: "center", c: COUL.doux });
    O.polaireGrille(c, 350, ya, R, { etiquettes: false });
    if (Math.abs(m) > 0.005) O.polaireCourbe(c, 350, ya, R, d => m * 0.5 * (1 - Math.cos(d * Math.PI / 180)), { couleur: m >= 0 ? COUL.jaune : COUL.rose, largeur: 2.2 });
    O.ecrire(c, "arrière × " + O.nb(m, 2).replace("-", "−"), 350, ya + R + 26, { s: 12, g: false, a: "center" });
    O.ecrire(c, "=", 470, ya + 6, { s: 30, a: "center", c: COUL.doux });

    const px = 720, py = 236, PR = 180;
    O.polaireGrille(c, px, py, PR);
    O.polaireCourbe(c, px, py, PR, d => MICRO.gain(A, d), { couleur: COUL.violet, largeur: 3.2, remplir: "rgba(191,90,242,.12)" });
    O.microDessus(c, px, py, 0, COUL.texte, 0.8);

    // --- Valeurs, explication ---
    const proche = DIRECTIVITES.find(d => Math.abs(d.A - A) < 0.012);
    const nul = MICRO.annulation(A);
    Application.afficher("#m3c-m", O.nb(m, 2).replace("-", "−"));
    Application.afficher("#m3c-ro", O.nb(m, 2).replace("-", "−"));
    Application.afficher("#m3c-A", O.nb(A, 3));
    Application.afficher("#m3c-nom", proche ? proche.court : "intermédiaire");
    Application.afficher("#m3c-nul", nul === null ? "aucune" : "± " + O.nb(nul, 0) + "°");
    let m2;
    if (m > 0.98) m2 = "<b>Somme des deux cardios.</b> ½(1 + cos θ) + ½(1 − cos θ) = 1 : la même valeur dans toutes les directions, c’est un omni.";
    else if (Math.abs(m) < 0.02) m2 = "<b>Membrane arrière éteinte.</b> Sans polarisation, elle ne produit aucun signal : il reste le cardio de la membrane avant.";
    else if (m < -0.98) m2 = "<b>Différence des deux cardios.</b> ½(1 + cos θ) − ½(1 − cos θ) = cos θ : c’est le huit, avec son lobe arrière inversé.";
    else if (m > 0) m2 = "<b>Un peu d’arrière, en phase.</b> Le lobe arrière comble le creux du cardio : la directivité s’élargit vers l’omni (A = " + O.nb(A, 2) + ").";
    else m2 = "<b>Un peu d’arrière, inversé.</b> Le signal arrière se soustrait : la directivité se resserre, un petit lobe arrière inversé apparaît, l’annulation passe à ± " + O.nb(nul, 0) + "°.";
    O.note("m3c-msg", "note ok", m2);
  }

  curseur.addEventListener("input", dessiner);
  O.situations("m3c-situ", s => O.curseur(curseur, +s));
  dessiner();
});

/* ==========================================================================
   MODULE 4 — LA DIRECTIVITÉ
   ========================================================================== */

/* --- Labo 4a : le diagramme polaire ----------------------------------------
   r(θ) = A + B·cos θ ; DF, DI, facteur de distance et angle d'annulation
   viennent de MICRO (contenu.js). Une voix et une source gênante se placent
   autour du micro ; leur niveau dans le micro = 20 log |r(θ)|. */
labo(4, function () {
  const cv = O.el("m4a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const PX = 285, PY = 265, R = 186;
  const curseur = O.el("m4a-a");
  let db = false, comp = "aucune", voix = 0, gene = 180, cible = null;
  const niveau = (A, d) => { const g = MICRO.gain(A, d); return Math.abs(g) < 1e-3 ? -Infinity : 20 * Math.log10(Math.abs(g)); };
  const txtDb = v => isFinite(v) ? O.db(v) : "−∞ dB";
  const norm = d => ((Math.round(d) % 360) + 360) % 360;
  const ecart = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); };

  function source(deg, couleur, nom, A) {
    const t = deg * Math.PI / 180, rs = R + 30;
    const g = MICRO.gain(A, deg), rc = O.polaireRayon(g, R, db);
    c.strokeStyle = couleur; c.globalAlpha = 0.6; c.setLineDash([4, 5]); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(PX, PY); c.lineTo(PX + rs * Math.sin(t), PY - rs * Math.cos(t)); c.stroke();
    c.setLineDash([]); c.globalAlpha = 1;
    c.fillStyle = couleur; c.beginPath(); c.arc(PX + rc * Math.sin(t), PY - rc * Math.cos(t), 5, 0, 7); c.fill();
    c.beginPath(); c.arc(PX + rs * Math.sin(t), PY - rs * Math.cos(t), 15, 0, 7); c.fill();
    O.ecrire(c, nom[0], PX + rs * Math.sin(t), PY - rs * Math.cos(t) + 1, { s: 14, c: COUL.fond, a: "center", b: "middle" });
  }

  function barre(y, nom, couleur, L) {
    const x0 = 600, x1 = 960, l = isFinite(L) ? O.borne((L + 30) / 30, 0, 1) * (x1 - x0) : 0;
    O.ecrire(c, nom, x0, y - 8, { s: 13 });
    O.ecrire(c, txtDb(L), x1, y - 8, { s: 13, a: "right", m: true, c: couleur });
    c.fillStyle = COUL.grille; O.rect(c, x0, y, x1 - x0, 14, 7); c.fill();
    if (l > 1) { c.fillStyle = couleur; O.rect(c, x0, y, l, 14, 7); c.fill(); }
  }

  function dessiner() {
    const A = +curseur.value / 1000, B = 1 - A;
    const nom = (DIRECTIVITES.find(d => Math.abs(d.A - A) < 0.006) || { nom: "Directivité intermédiaire", court: "intermédiaire" });
    O.fond(c);

    // --- Diagramme polaire ---
    O.polaireGrille(c, PX, PY, R, { db: db });
    if (comp !== "aucune") O.polaireCourbe(c, PX, PY, R, d => MICRO.gain(DIR(comp).A, d), { couleur: "rgba(255,255,255,.35)", largeur: 1.5, db: db });
    O.polaireCourbe(c, PX, PY, R, d => MICRO.gain(A, d), { couleur: COUL.jaune, largeur: 3, db: db, remplir: "rgba(255,214,10,.10)" });
    const nul = MICRO.annulation(A);
    if (nul !== null) [nul, 360 - nul].forEach(d => {
      const t = d * Math.PI / 180;
      c.strokeStyle = "rgba(255,69,58,.55)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(PX, PY); c.lineTo(PX + R * Math.sin(t), PY - R * Math.cos(t)); c.stroke();
    });
    O.microDessus(c, PX, PY, 0, COUL.texte, 0.9);
    source(gene, COUL.rose, "Gêne", A);
    source(voix, COUL.ciel, "Voix", A);
    O.ecrire(c, nom.nom + (db ? " · échelle en dB" : " · échelle linéaire"), 16, 24, { s: 13, c: COUL.texte });
    if (comp !== "aucune") O.ecrire(c, "── " + DIR(comp).nom + " (comparaison)", 16, 44, { s: 12, g: false, c: "rgba(255,255,255,.5)" });
    if (nul !== null) O.ecrire(c, "── annulation", 16, Hc - 16, { s: 12, g: false, c: COUL.rouge });

    // --- Panneau de droite ---
    c.fillStyle = COUL.panneau; c.fillRect(575, 0, W - 575, Hc);
    // Équivalence de distance
    const df = MICRO.df(A), fd = Math.sqrt(df), u = 95;
    O.ecrire(c, "À quelle distance capte-t-il autant de salle ?", 600, 34, { s: 14 });
    c.fillStyle = "#3a3d45"; c.beginPath(); c.arc(612, 122, 22, 0, 7); c.fill();
    O.ecrire(c, "source", 612, 160, { s: 11, g: false, c: COUL.doux, a: "center" });
    [[95, u, "omni à d", COUL.ciel], [150, u * fd, nom.court + " à " + O.nb(fd, 2) + " × d", COUL.jaune]].forEach(l => {
      const x = 640 + l[1];
      c.strokeStyle = l[3]; c.lineWidth = 1.5; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(634, 122); c.lineTo(x - 10, l[0]); c.stroke(); c.setLineDash([]);
      O.microDessus(c, x, l[0], -90, l[3], 0.8);
      O.ecrire(c, l[2], x + 16, l[0] + 5, { s: 12, c: l[3] });
    });
    O.ecrire(c, "Même proportion de son direct et de réverbération.", 600, 196, { s: 12, g: false, c: COUL.doux });

    // Niveaux dans le micro
    const Lv = niveau(A, voix), Lg = niveau(A, gene);
    O.ecrire(c, "Dans le micro", 600, 252, { s: 14 });
    barre(290, "Voix (θ = " + norm(voix) + "°)", COUL.ciel, Lv);
    barre(350, "Gêne (θ = " + norm(gene) + "°)" + (MICRO.gain(A, gene) < -1e-3 ? " · polarité inversée" : ""), COUL.rose, Lg);
    const dif = Lv - Lg;
    O.ecrire(c, "La voix domine la gêne de", 600, 410, { s: 13, g: false, c: COUL.doux });
    O.ecrire(c, isFinite(dif) ? O.nb(dif, 1).replace("-", "−") + " dB" : (isFinite(Lv) ? "∞ (gêne annulée)" : "—"), 600, 444, { s: 26, c: !isFinite(dif) || dif >= 15 ? COUL.vert : dif >= 6 ? COUL.jaune : COUL.orange });
    O.ecrire(c, "(sources de même niveau, même distance)", 600, 470, { s: 11, g: false, c: COUL.doux });

    // --- Valeurs, calcul, explication ---
    Application.afficher("#m4a-ao", O.nb(A, 3));
    Application.afficher("#m4a-ab", O.nb(A, 2) + " · " + O.nb(B, 2));
    Application.afficher("#m4a-di", O.nb(df, 2) + " · " + O.nb(MICRO.di(A), 1) + " dB");
    Application.afficher("#m4a-dist", O.nb(fd, 2));
    Application.afficher("#m4a-nul", nul === null ? "aucune" : "± " + O.nb(nul, 1) + "°");
    Application.afficher("#m4a-att", txtDb(niveau(A, 90)).replace(" dB", "") + " · " + txtDb(niveau(A, 180)));
    const g = MICRO.gain(A, gene);
    O.html("m4a-calc", '<div><span class="c">r(' + norm(gene) + "°) = A + B·cos " + norm(gene) + '°</span></div><div>= ' + O.nb(A, 3) + " + " + O.nb(B, 3) + " × " + O.nb(Math.cos(gene * Math.PI / 180), 3).replace("-", "−") + " = " + O.nb(g, 3).replace("-", "−") + '</div><div><span class="c">gêne</span> 20 log |r| = <b>' + txtDb(Lg) + '</b></div><div><span class="c">DF</span> = 1 / (A² + B²/3) = ' + O.nb(df, 2) + " → DI = " + O.nb(MICRO.di(A), 1) + " dB</div>");
    let cl, m;
    if (ecart(voix, 0) > 45) { cl = "note warn"; m = "<b>La voix est hors axe.</b> À " + norm(voix) + "°, elle perd " + txtDb(Lv).replace("−", "") + " et, sur un vrai micro, son timbre change aussi : remettez la voix dans l’axe."; }
    else if (!isFinite(Lg)) { cl = "note ok"; m = "<b>La gêne est dans l’angle d’annulation.</b> À " + norm(gene) + "°, A + B·cos θ = 0 : en théorie, le micro ne l’entend pas. En pratique, on gagne souvent 15 à 25 dB."; }
    else if (dif >= 15) { cl = "note ok"; m = "<b>Bon rejet.</b> La gêne arrive " + O.nb(dif, 0) + " dB sous la voix." + (nul !== null ? " Pour faire mieux, placez-la vers ±" + O.nb(nul, 0) + "°, l’angle d’annulation." : ""); }
    else if (dif >= 6) { cl = "note"; m = "<b>Rejet moyen.</b> " + O.nb(dif, 0) + " dB seulement entre la voix et la gêne." + (nul !== null ? " L’annulation de ce micro est à ±" + O.nb(nul, 0) + "° : déplacez la gêne ou changez de directivité." : " Cette directivité n’a pas d’annulation : prenez un micro plus directif."); }
    else { cl = "note bad"; m = "<b>La gêne passe presque autant que la voix.</b> " + (A > 0.9 ? "Un omni ne trie pas les directions." : g < 0 ? "Elle tombe dans le lobe arrière, de polarité inversée." : "Elle est trop près de l’axe.") + " Cherchez la directivité dont l’angle d’annulation tombe sur la gêne."; }
    O.note("m4a-msg", cl, m);
  }

  O.glisser(cv, (x, y, debut) => {
    if (x > 570) { cible = null; return; }
    const d = norm(Math.atan2(x - PX, -(y - PY)) * 180 / Math.PI);
    if (debut) cible = ecart(d, voix) <= ecart(d, gene) ? "voix" : "gene";
    if (cible === "voix") voix = d; else if (cible === "gene") gene = d;
    dessiner();
  });
  curseur.addEventListener("input", dessiner);
  O.situations("m4a-dirs", s => O.curseur(curseur, Math.round(DIR(s).A * 1000)));
  Application.segment("#m4a-echelle", [["lin", "Linéaire"], ["db", "En dB"]], "lin", v => { db = v === "db"; dessiner(); });
  Application.segment("#m4a-comp", [["aucune", "Aucune"], ["omni", "Omni"], ["cardio", "Cardio"]], "aucune", v => { comp = v; dessiner(); });
  const SITU = { retour: ["cardio", 180], deux: ["super", 125], cotes: ["huit", 90], piege: ["hyper", 180] };
  O.situations("m4a-situ", s => { voix = 0; gene = SITU[s][1]; O.curseur(curseur, Math.round(DIR(SITU[s][0]).A * 1000)); });
  dessiner();
});

/* --- Labo 4b : le micro canon ---------------------------------------------
   Modèle de ligne (Olson) : chaque fente du tube transmet le son jusqu'à la
   capsule. Pour un son venant de θ, la fente située à la distance s de l'avant
   apporte une contribution décalée de k·s·(1 − cos θ). La somme continue de
   ces contributions vaut R(θ) = sin x / x, x = (πL/λ)(1 − cos θ).
   Réponse du canon = capsule(θ) × R(θ). */
labo(4, function () {
  const cv = O.el("m4b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const cf = O.el("m4b-f"), cl = O.el("m4b-l"), ct = O.el("m4b-t");
  const PX = 268, PY = 262, R = 196, N = 12;
  let capA = 0.366;
  const olson = (L, f, deg) => { const x = Math.PI * L / MICRO.lambda(f) * (1 - Math.cos(deg * Math.PI / 180)); return x < 1e-9 ? 1 : Math.sin(x) / x; };
  const dbAbs = g => 20 * Math.log10(Math.max(Math.abs(g), 1e-5));
  const txtDb = v => v < -60 ? "< −60 dB" : O.db(v);

  function dessiner() {
    const f = O.valLog(+cf.value, 100, 16000), L = +cl.value / 100, th = +ct.value;
    const lam = MICRO.lambda(f), fc = MICRO.c / L;
    const cap = d => MICRO.gain(capA, d), tot = d => cap(d) * olson(L, f, d);
    O.fond(c);

    // --- Polaire en dB : capsule seule et canon ---
    O.polaireGrille(c, PX, PY, R, { db: true });
    O.polaireCourbe(c, PX, PY, R, cap, { couleur: "rgba(255,255,255,.4)", largeur: 1.6, db: true });
    O.polaireCourbe(c, PX, PY, R, tot, { couleur: COUL.jaune, largeur: 2.8, db: true, remplir: "rgba(255,214,10,.10)" });
    [th, 360 - th].forEach((d, i) => {
      const t = d * Math.PI / 180;
      c.strokeStyle = COUL.ciel; c.globalAlpha = i ? 0.35 : 1; c.lineWidth = 1.5; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(PX, PY); c.lineTo(PX + (R + 12) * Math.sin(t), PY - (R + 12) * Math.cos(t)); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
    });
    c.fillStyle = COUL.ciel; c.beginPath(); c.arc(PX + (R + 14) * Math.sin(th * Math.PI / 180), PY - (R + 14) * Math.cos(th * Math.PI / 180), 6, 0, 7); c.fill();
    O.microDessus(c, PX, PY, 0, COUL.texte, 0.9);
    O.ecrire(c, "── canon", 14, 24, { s: 12, c: COUL.jaune });
    O.ecrire(c, "── capsule seule", 14, 42, { s: 12, g: false, c: "rgba(255,255,255,.6)" });

    // --- Panneau de droite ---
    c.fillStyle = COUL.panneau; c.fillRect(535, 0, W - 535, Hc);

    // Le tube vu de côté : avant à gauche, capsule à droite
    const tx = 575, ty = 70, tl = L * 600, ph = [];
    O.ecrire(c, "Le tube, vu de côté (avant à gauche)", 555, 26, { s: 13 });
    c.fillStyle = "#3a3d45"; O.rect(c, tx, ty - 9, tl, 18, 4); c.fill();
    c.fillStyle = COUL.orange; O.rect(c, tx + tl, ty - 13, 22, 26, 4); c.fill();
    O.ecrire(c, "capsule", tx + tl + 11, ty + 30, { s: 10, g: false, c: COUL.orange, a: "center" });
    const t = th * Math.PI / 180, k = 2 * Math.PI / lam;
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) / N * L, x = tx + (i + 0.5) / N * tl, p = k * s * (1 - Math.cos(t));
      ph.push(p);
      const teinte = "hsl(" + Math.round(((p % (2 * Math.PI)) / (2 * Math.PI)) * 360) + ",85%,62%)";
      c.fillStyle = COUL.fond; c.fillRect(x - 2.5, ty - 9, 5, 6);
      // le son arrive de la direction θ (0° = depuis la gauche, dans l'axe)
      const dx = Math.cos(t), dy = Math.sin(t);
      O.fleche(c, x - dx * 34, ty - 12 - dy * 34, x, ty - 10, teinte, 1.8);
    }
    O.ecrire(c, "θ = " + th + "°", tx + tl + 40, ty + 4, { s: 12, c: COUL.ciel });

    // Addition des contributions des fentes (flèches bout à bout)
    O.ecrire(c, "Somme des " + N + " fentes", 555, 150, { s: 13 });
    const lg = 175 / N;
    let x = 570, y = 235;
    c.strokeStyle = COUL.grille; c.beginPath(); c.moveTo(570, 235); c.lineTo(745, 235); c.stroke();
    ph.forEach(p => {
      const nx = x + lg * Math.cos(p), ny = y - lg * Math.sin(p);
      c.strokeStyle = "hsl(" + Math.round(((p % (2 * Math.PI)) / (2 * Math.PI)) * 360) + ",85%,62%)"; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
      x = nx; y = ny;
    });
    if (Math.hypot(x - 570, y - 235) > 4) O.fleche(c, 570, 235, x, y, COUL.jaune, 2.4);
    const Rk = olson(L, f, th);
    O.ecrire(c, "Dans l’axe : flèches alignées,", 790, 200, { s: 12, g: false, c: COUL.doux });
    O.ecrire(c, "somme maximale (0 dB).", 790, 218, { s: 12, g: false, c: COUL.doux });
    O.ecrire(c, "Tube seul à " + th + "° :", 790, 248, { s: 12, g: false, c: COUL.texte });
    O.ecrire(c, txtDb(dbAbs(Rk)), 790, 274, { s: 20, c: COUL.jaune });

    // Atténuation à θ en fonction de la fréquence
    const gx0 = 600, gx1 = 975, gy0 = 335, gy1 = 480, GM = 40;
    const GX = v => O.log(v, 100, 16000, gx0, gx1), GY = v => gy0 + O.borne(-v, 0, GM) / GM * (gy1 - gy0);
    O.ecrire(c, "Atténuation à θ = " + th + "° selon la fréquence", 555, 315, { s: 13 });
    [0, -10, -20, -30, -40].forEach(v => { c.strokeStyle = COUL.grille; c.lineWidth = 1; c.beginPath(); c.moveTo(gx0, GY(v)); c.lineTo(gx1, GY(v)); c.stroke(); O.ecrire(c, String(v).replace("-", "−"), gx0 - 6, GY(v) + 4, { s: 10, g: false, c: COUL.doux, a: "right" }); });
    [[100, "100"], [1000, "1 k"], [10000, "10 k"]].forEach(p => O.ecrire(c, p[1], GX(p[0]), gy1 + 15, { s: 10, g: false, c: COUL.doux, a: "center" }));
    O.ecrire(c, "Hz", gx1, gy1 + 15, { s: 10, g: false, c: COUL.doux, a: "right" });
    if (fc > 100 && fc < 16000) { c.strokeStyle = COUL.orange; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(GX(fc), gy0); c.lineTo(GX(fc), gy1); c.stroke(); c.setLineDash([]); O.ecrire(c, "c/L", GX(fc) + 4, gy1 - 6, { s: 11, c: COUL.orange }); }
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx0, GY(dbAbs(cap(th)))); c.lineTo(gx1, GY(dbAbs(cap(th)))); c.stroke();
    c.strokeStyle = COUL.jaune; c.lineWidth = 2.2; c.beginPath();
    for (let i = 0; i <= 260; i++) { const ff = 100 * Math.pow(160, i / 260), yy = GY(dbAbs(cap(th) * olson(L, ff, th))); i ? c.lineTo(GX(ff), yy) : c.moveTo(GX(ff), yy); }
    c.stroke();
    c.fillStyle = COUL.ciel; c.beginPath(); c.arc(GX(f), GY(dbAbs(tot(th))), 5, 0, 7); c.fill();

    // --- Valeurs et explication ---
    let ouv = null;
    for (let d = 0; d <= 180; d += 0.5) if (Math.abs(tot(d)) <= 0.5) { ouv = 2 * d; break; }
    const xTh = Math.PI * L / lam * (1 - Math.cos(t));
    Application.afficher("#m4b-fo", O.hz(f));
    Application.afficher("#m4b-lo", O.nb(L * 100, 0) + " cm");
    Application.afficher("#m4b-to", th + "°");
    Application.afficher("#m4b-lam", O.metres(lam));
    Application.afficher("#m4b-fc", "≈ " + O.hz(fc));
    Application.afficher("#m4b-tot", txtDb(dbAbs(tot(th))));
    Application.afficher("#m4b-cap", txtDb(dbAbs(cap(th))));
    Application.afficher("#m4b-ouv", ouv === null ? "> 360°" : "≈ " + O.nb(ouv, 0) + "°");
    O.el("m4b-titre").textContent = "Tube de " + O.nb(L * 100, 0) + " cm · " + O.hz(f);
    let cls, m;
    if (f < fc * 0.7) { cls = "note warn"; m = "<b>Le tube n’agit presque pas.</b> λ = " + O.metres(lam) + " est plus longue que le tube (" + O.nb(L * 100, 0) + " cm) : les flèches des fentes restent presque alignées. Le canon se comporte comme sa capsule. Il faudrait dépasser ≈ " + O.hz(fc) + "."; }
    else if (xTh > Math.PI && Math.abs(Rk) > 0.08) { cls = "note"; m = "<b>Lobe secondaire.</b> À " + th + "°, les flèches ont fait plus d’un tour et ne s’annulent plus tout à fait : une partie du son repasse, avec un timbre coloré. C’est pour cela qu’un canon sonne mal dans une pièce réverbérante."; }
    else { cls = "note ok"; m = "<b>Le tube resserre la directivité.</b> λ = " + O.metres(lam) + " est plus courte que le tube : les contributions des fentes se décalent et s’annulent en partie. Ouverture à −6 dB ≈ " + (ouv === null ? "—" : O.nb(ouv, 0) + "°") + ", contre ≈ " + O.nb(2 * Math.acos((0.5 - capA) / (1 - capA)) * 180 / Math.PI, 0) + "° pour la capsule seule."; }
    O.note("m4b-msg", cls, m);
  }

  [cf, cl, ct].forEach(e => e.addEventListener("input", dessiner));
  Application.segment("#m4b-cap-s", [["0.366", "Supercardio"], ["0.25", "Hypercardio"]], "0.366", v => { capA = +v; dessiner(); });
  const SITU = { grave: [25, 300, 90], voix: [25, 4000, 90], long: [50, 2000, 60], lobe: [25, 4000, 60] };
  O.situations("m4b-situ", s => { const v = SITU[s]; O.curseur(cl, v[0]); O.curseur(ct, v[2]); O.curseur(cf, O.posLog(v[1], 100, 16000)); });
  O.curseur(cf, O.posLog(2000, 100, 16000));
});

/* ==========================================================================
   MODULE 5 — SENSIBILITÉ ET FICHE TECHNIQUE
   ========================================================================== */

/* --- Labo 1 : la chaîne des niveaux ---------------------------------------
   Pression (dB SPL) × sensibilité → tension du micro (dBu) + gain → sortie
   du préampli (dBu). Le bruit de la chaîne est la somme (en puissance) du
   bruit propre du micro et du bruit du préampli (EIN ≈ −128 dBu).
   Simplification assumée : l'atténuateur réduit le signal de la capsule ;
   le bruit propre (en dB SPL) est gardé constant, alors qu'en réalité il
   augmente un peu (la fiche donne alors une seconde valeur). */
labo(5, function () {
  const cv = O.el("m5a-cv"), c = cv.getContext("2d"), W = cv.width;
  const EIN = -128, SATURATION = 24, VISE = 4;
  const MICS = [
    { id: "dyn", nom: "Dynamique de chant (type)", S: 1.8, bruit: null, max: null, pad: false },
    { id: "ruban", nom: "Ruban passif (type)", S: 1.5, bruit: null, max: null, pad: false },
    { id: "spm", nom: "Statique petite membrane (type)", S: 15, bruit: 16, max: 135, pad: true },
    { id: "sgm", nom: "Statique grande membrane (type)", S: 25, bruit: 7, max: 132, pad: true },
    { id: "crav", nom: "Cravate électret (type)", S: 6, bruit: 26, max: 130, pad: false },
    { id: "canon", nom: "Micro canon (type)", S: 30, bruit: 13, max: 130, pad: false }
  ];
  const sel = O.el("m5a-mic"), cL = O.el("m5a-l"), cG = O.el("m5a-g");
  O.options(sel, MICS.map(m => [m.id, m.nom]), "spm");
  let pad = 0, env = 0, crete = -200;
  const segPad = Application.segment("#m5a-pad", [[0, "0 dB"], [10, "−10 dB"], [20, "−20 dB"]], 0, v => { pad = +v; dessiner(); });
  const dbu = v => O.signe(v, 1) + " dBu";
  const somme = (a, b) => 10 * Math.log10(Math.pow(10, a / 10) + Math.pow(10, b / 10));

  function calculer() {
    const mic = MICS.find(m => m.id === sel.value);
    const padEff = mic.pad ? pad : 0, L = +cL.value, G = +cG.value;
    const p = MICRO.pa(L), Sv = mic.S / 1000 * Math.pow(10, -padEff / 20), U = Sv * p, Lm = MICRO.dbu(U);
    const Nm = mic.bruit === null ? -Infinity : MICRO.dbu(Sv * MICRO.pa(mic.bruit));
    const Nin = isFinite(Nm) ? somme(Nm, EIN) : EIN;
    const maxEff = mic.max === null ? null : mic.max + padEff;
    return { mic, padEff, L, G, p, Sv, U, Lm, Nm, Nin, Ls: Lm + G, Ns: Nin + G, SB: Lm - Nin, maxEff,
      sature: maxEff !== null && L > maxEff, ecrete: Lm + G > SATURATION, dominant: !isFinite(Nm) || Nm < EIN - 3 ? "pre" : Nm > EIN + 3 ? "micro" : "deux" };
  }

  // Étiquettes à droite d'une colonne, écartées pour ne jamais se chevaucher
  function poser(x, liste) {
    liste.sort((a, b) => a.y - b.y);
    for (let i = 1; i < liste.length; i++) if (liste[i].y - liste[i - 1].y < 19) liste[i].y = liste[i - 1].y + 19;
    for (let i = liste.length - 2; i >= 0; i--) if (liste[i].y > liste[i + 1].y - 19) liste[i].y = liste[i + 1].y - 19;
    liste.forEach(e => O.ecrire(c, e.t, x, e.y, { s: 15, c: e.c, b: "middle", g: e.g !== false }));
  }
  const Y0 = 480, Y1 = 92;
  const ySPL = v => Y0 - O.borne(v, 0, 150) / 150 * (Y0 - Y1);
  const yU = v => Y0 - (O.borne(v, -140, 30) + 140) / 170 * (Y0 - Y1);
  const yM = v => Y0 - (O.borne(v, -50, 28) + 50) / 78 * (Y0 - Y1);

  function colonne(x, w, y, graduations, fmt) {
    c.fillStyle = COUL.panneau; O.rect(c, x, Y1, w, Y0 - Y1, 8); c.fill();
    graduations.forEach(v => { O.ecrire(c, fmt(v), x - 6, y(v), { s: 13, g: false, c: COUL.doux, a: "right", b: "middle" }); c.fillStyle = COUL.trait; c.fillRect(x, y(v), 5, 1); });
  }
  function zone(x, w, ya, yb, couleur) { c.fillStyle = couleur; c.fillRect(x, Math.min(ya, yb), w, Math.abs(yb - ya)); }
  function barre(x, w, yNiv, yCrete, couleur) {
    const g = c.createLinearGradient(0, Y0, 0, Y1); g.addColorStop(0, couleur + "22"); g.addColorStop(1, couleur + "99");
    c.fillStyle = g; c.fillRect(x + 8, yNiv, w - 16, Y0 - yNiv);
    c.fillStyle = couleur; c.fillRect(x + 4, yNiv - 1.5, w - 8, 3);
    c.strokeStyle = couleur; c.setLineDash([4, 3]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, yCrete); c.lineTo(x + w, yCrete); c.stroke(); c.setLineDash([]);
  }

  function dessiner() {
    const r = calculer(), m = r.mic;
    // Réglages et fiche
    Application.afficher("#m5a-lo", r.L + " dB SPL");
    Application.afficher("#m5a-go", "+" + r.G + " dB");
    O.html("m5a-fiche", "Sensibilité : " + O.nb(m.S, 1) + " mV/Pa (" + O.db(MICRO.dbv(m.S)).replace(" dB", " dBV") + ")<br>Bruit propre : " + (m.bruit === null ? "non indiqué" : m.bruit + " dB(A)") + "<br>SPL max : " + (m.max === null ? "très élevé (non indiqué)" : m.max + " dB") + "<br>Atténuateur : " + (m.pad ? "0 / −10 / −20 dB" : "aucun"));
    const zp = O.el("m5a-pad"); zp.style.opacity = m.pad ? "" : ".4"; zp.style.pointerEvents = m.pad ? "" : "none";
    Application.afficher("#m5a-p", O.pascals(r.p));
    Application.afficher("#m5a-u", O.volts(r.U));
    Application.afficher("#m5a-lm", dbu(r.Lm));
    Application.afficher("#m5a-ls", dbu(r.Ls));
    Application.afficher("#m5a-sb", O.nb(r.SB, 0) + " dB");

    // Scène
    O.fond(c);
    const x1 = 86, x2 = 372, x3 = 640, x4 = 900, w = 58;
    // En-têtes et flèches de la chaîne
    O.ecrire(c, "Pression acoustique", x1 + w / 2, 30, { s: 16, a: "center" });
    O.ecrire(c, "dB SPL", x1 + w / 2, 50, { s: 14, g: false, c: COUL.doux, a: "center" });
    O.ecrire(c, "Sortie du micro", x2 + w / 2, 30, { s: 16, a: "center" });
    O.ecrire(c, "dBu", x2 + w / 2, 50, { s: 14, g: false, c: COUL.doux, a: "center" });
    O.ecrire(c, "Sortie du préampli", x3 + w / 2, 30, { s: 16, a: "center" });
    O.ecrire(c, "dBu", x3 + w / 2, 50, { s: 14, g: false, c: COUL.doux, a: "center" });
    O.ecrire(c, "Vumètre", x4 + 17, 30, { s: 16, a: "center" });
    O.fleche(c, 180, 40, 330, 40, COUL.ciel, 2);
    O.ecrire(c, "× " + O.nb(m.S, 1) + " mV/Pa" + (r.padEff ? "  − " + r.padEff + " dB" : ""), 255, 64, { s: 14, c: COUL.ciel, a: "center" });
    // le micro, petit, sur la flèche
    c.fillStyle = COUL.texte; O.rect(c, 240, 30, 30, 20, 9); c.fill();
    c.fillStyle = COUL.doux; c.fillRect(268, 36, 14, 8);
    O.fleche(c, 470, 40, 600, 40, COUL.vert, 2);
    O.ecrire(c, "+ " + r.G + " dB de gain", 535, 64, { s: 14, c: COUL.vert, a: "center" });

    // Colonne 1 : pression
    colonne(x1, w, ySPL, [0, 20, 40, 60, 80, 100, 120, 140], v => String(v));
    const e1 = [];
    if (m.bruit !== null) { zone(x1, w, Y0, ySPL(m.bruit), "rgba(142,142,147,.45)"); e1.push({ y: ySPL(m.bruit), t: "bruit propre " + m.bruit + " dB(A)", c: COUL.doux }); }
    else e1.push({ y: Y0 - 8, t: "bruit propre non indiqué", c: COUL.doux, g: false });
    if (r.maxEff !== null) { zone(x1, w, Y1, ySPL(r.maxEff), "rgba(255,69,58,.3)"); e1.push({ y: ySPL(r.maxEff), t: "SPL max " + r.maxEff + " dB", c: COUL.rouge }); }
    else e1.push({ y: Y1 + 10, t: "SPL max très élevé", c: COUL.rouge, g: false });
    barre(x1, w, ySPL(r.L + env), ySPL(r.L), r.sature ? COUL.rouge : COUL.jaune);
    e1.push({ y: ySPL(r.L), t: "source " + r.L + " dB SPL", c: r.sature ? COUL.rouge : COUL.jaune });
    poser(x1 + w + 8, e1);
    O.ecrire(c, "= " + O.pascals(r.p), x1 + w / 2, Y0 + 22, { s: 14, c: COUL.jaune, a: "center" });

    // Colonne 2 : sortie du micro
    const gU = [-140, -120, -100, -80, -60, -40, -20, 0, 20];
    colonne(x2, w, yU, gU, v => O.signe(v, 0));
    zone(x2, w, Y0, yU(r.Nin), "rgba(142,142,147,.45)");
    c.strokeStyle = COUL.doux; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x2, yU(EIN)); c.lineTo(x2 + w, yU(EIN)); c.stroke(); c.setLineDash([]);
    barre(x2, w, yU(r.Lm + env), yU(r.Lm), COUL.jaune);
    const e2 = [{ y: yU(r.Lm), t: "micro " + dbu(r.Lm), c: COUL.jaune }, { y: yU(EIN), t: "EIN préampli ≈ −128 dBu", c: COUL.doux, g: false }];
    if (isFinite(r.Nm)) e2.push({ y: yU(r.Nm), t: "bruit du micro " + dbu(r.Nm), c: COUL.doux });
    poser(x2 + w + 8, e2);
    O.ecrire(c, "= " + O.volts(r.U), x2 + w / 2, Y0 + 22, { s: 14, c: COUL.jaune, a: "center" });

    // Colonne 3 : sortie du préampli
    colonne(x3, w, yU, gU, v => O.signe(v, 0));
    zone(x3, w, Y1, yU(SATURATION), "rgba(255,69,58,.3)");
    zone(x3, w, Y0, yU(r.Ns), "rgba(142,142,147,.45)");
    c.fillStyle = COUL.vert; c.fillRect(x3 - 4, yU(VISE) - 1, w + 8, 2);
    barre(x3, w, yU(r.Ls + env), yU(r.Ls), r.ecrete ? COUL.rouge : COUL.jaune);
    poser(x3 + w + 8, [{ y: yU(r.Ls), t: "sortie " + dbu(r.Ls), c: r.ecrete ? COUL.rouge : COUL.jaune }, { y: yU(VISE), t: "visé +4 dBu", c: COUL.vert }, { y: yU(SATURATION), t: "saturation ≈ +24 dBu", c: COUL.rouge }, { y: yU(r.Ns), t: "bruit " + dbu(r.Ns), c: COUL.doux }]);
    O.ecrire(c, "S/B ≈ " + O.nb(r.SB, 0) + " dB", x3 + w / 2, Y0 + 22, { s: 14, c: COUL.texte, a: "center" });

    // Vumètre (en dBu), crête maintenue
    const niv = r.Ls + env;
    crete = Math.max(niv, crete - 0.25);
    c.fillStyle = COUL.panneau; O.rect(c, x4, Y1, 34, Y0 - Y1, 6); c.fill();
    for (let v = -50; v < 28; v += 2) {
      const y = yM(v + 2), h = yM(v) - yM(v + 2) - 1.5;
      const coul = v >= 20 ? COUL.rouge : v >= 10 ? COUL.orange : COUL.vert;
      c.fillStyle = v < niv ? coul : "rgba(255,255,255,.06)";
      c.fillRect(x4 + 5, y, 24, h);
    }
    if (crete > -50) { c.fillStyle = COUL.texte; c.fillRect(x4 + 5, yM(Math.min(crete, 28)) - 1, 24, 2); }
    [-40, -20, 0, 4, 24].forEach(v => O.ecrire(c, O.signe(v, 0), x4 + 40, yM(v), { s: 13, g: v === 4, c: v === 4 ? COUL.vert : COUL.doux, b: "middle" }));

    // Explication et calcul
    let cls, msg;
    if (r.sature) { cls = "note bad"; msg = "<b>Le micro sature.</b> La source (" + r.L + " dB SPL) dépasse son niveau maximal (" + r.maxEff + " dB SPL) : la distorsion naît dans le micro, aucun réglage du préampli ne la corrigera. " + (m.pad && r.padEff < 20 ? "Enclenchez l’atténuateur." : "Éloignez le micro, ou prenez un micro qui accepte plus (un dynamique, par exemple)."); }
    else if (r.ecrete) { cls = "note bad"; msg = "<b>Le préampli sature.</b> Sa sortie atteindrait " + dbu(r.Ls) + ", au-delà d’environ +24 dBu. Baissez le gain d’au moins " + O.nb(Math.ceil(r.Ls - SATURATION), 0) + " dB."; }
    else if (r.SB < 30) { cls = "note warn"; msg = "<b>Le signal est presque noyé dans le bruit.</b> Il n’est qu’à " + O.nb(r.SB, 0) + " dB au-dessus du bruit de la chaîne, qui vient surtout " + (r.dominant === "pre" ? "du préampli : un micro plus sensible donnerait plus de tension avant lui." : r.dominant === "micro" ? "du micro lui-même : seul un micro à plus faible bruit propre améliorerait la situation." : "du micro et du préampli à parts égales.") + " Monter le gain n’y change rien : il amplifie le bruit autant que le signal."; }
    else if (r.Ls < VISE - 10) { cls = "note warn"; msg = "<b>Niveau trop faible.</b> La sortie est à " + dbu(r.Ls) + ", loin des +4 dBu visés : montez le gain d’environ " + O.nb(VISE - r.Ls, 0) + " dB."; }
    else if (r.Ls > VISE + 12) { cls = "note warn"; msg = "<b>Niveau élevé.</b> La sortie est à " + dbu(r.Ls) + " : il ne reste que " + O.nb(SATURATION - r.Ls, 0) + " dB avant la saturation du préampli. Baissez un peu le gain."; }
    else { cls = "note ok"; msg = "<b>Chaîne bien réglée.</b> Sortie à " + dbu(r.Ls) + ", signal ≈ " + O.nb(r.SB, 0) + " dB au-dessus du bruit" + (r.maxEff !== null ? ", marge de " + O.nb(r.maxEff - r.L, 0) + " dB avant la saturation du micro." : ".") + (m.S < 3 ? " Notez le gain élevé qu’il faut à ce micro peu sensible." : ""); }
    O.note("m5a-msg", cls, msg);
    O.html("m5a-calc",
      '<div><span class="c">p = 2·10⁻⁵ × 10^(' + r.L + "/20)</span> = " + O.pascals(r.p) + "</div>" +
      '<div><span class="c">U = S × p</span> = ' + O.nb(m.S, 1) + " mV/Pa" + (r.padEff ? " × 10^(−" + r.padEff + "/20)" : "") + " × " + O.nb(r.p, 3) + " Pa = " + O.volts(r.U) + "</div>" +
      '<div><span class="c">L = 20 log(U / 0,775)</span> = ' + dbu(r.Lm) + "</div>" +
      '<div><span class="c">sortie = L + G</span> = ' + O.signe(r.Lm, 1) + " + " + r.G + " = <b>" + dbu(r.Ls) + "</b></div>" +
      '<div><span class="c">gain pour +4 dBu</span> = 4 − (' + O.signe(r.Lm, 1) + ") = " + O.nb(VISE - r.Lm, 1) + " dB</div>");
  }

  const boucle = O.boucle(cv, (dt, t) => {
    env = -5 + 5 * (0.55 * Math.sin(2.3 * t) + 0.3 * Math.sin(5.7 * t + 1) + 0.15 * Math.sin(11.1 * t + 2));
    dessiner();
  });
  O.boutonPause("m5a-pause", boucle, () => { if (!boucle.actif()) { env = 0; crete = -200; dessiner(); } });

  sel.addEventListener("change", () => { const m = MICS.find(x => x.id === sel.value); if (!m.pad && pad) segPad.choisir(0); else dessiner(); });
  cL.addEventListener("input", dessiner);
  cG.addEventListener("input", dessiner);
  O.el("m5a-auto").addEventListener("click", () => { const r = calculer(); O.curseur(cG, O.borne(Math.round(VISE - r.Lm), 0, 80)); });
  const SITU = { calme: 30, voix: 70, guitare: 90, chant: 115, caisse: 135 };
  O.situations("m5a-situ", s => O.curseur(cL, SITU[s]));
  dessiner();
});

/* --- Labo 2 : lire une fiche technique -------------------------------------
   Chaque ligne de la fiche est reliée à un schéma : échelle des
   sensibilités, bruit propre et S/B, dynamique, diviseur de tension des
   impédances, courbe de réponse (coupe-bas du 2ᵉ ordre : −3 dB à sa
   fréquence, puis −12 dB par octave ; présence en cloche autour de 5 kHz). */
labo(5, function () {
  const cv = O.el("m5b-cv"), c = cv.getContext("2d");
  const cS = O.el("m5b-s"), cB = O.el("m5b-b"), cM = O.el("m5b-m"), cZs = O.el("m5b-zs"), cZc = O.el("m5b-zc"), cPr = O.el("m5b-pr");
  cS.value = O.posLog(15, 0.5, 60); cZc.value = O.posLog(2000, 100, 10000);
  let ligne = "sens", coupeBas = false;
  const NOMS = { sens: "Sensibilité", bruit: "Bruit propre", max: "SPL max", z: "Impédance", rep: "Courbe" };
  const segLigne = Application.segment("#m5b-ligne", Object.keys(NOMS).map(k => [k, NOMS[k]]), "sens", v => { ligne = v; dessiner(); });
  Application.segment("#m5b-cb", [["non", "Désactivé"], ["oui", "80 Hz"]], "non", v => { coupeBas = v === "oui"; dessiner(); });

  const val = () => ({ S: O.valLog(+cS.value, 0.5, 60), bp: +cB.value, max: +cM.value, zs: +cZs.value, zc: O.valLog(+cZc.value, 100, 10000), pr: +cPr.value });
  const rangees = v => [
    ["sens", "Sensibilité (1 kHz)", O.nb(v.S, v.S < 10 ? 1 : 0) + " mV/Pa (" + O.db(MICRO.dbv(v.S)).replace(" dB", " dBV") + ")"],
    ["bruit", "Bruit propre (pondéré A)", v.bp + " dB(A)"],
    ["bruit", "Rapport signal/bruit", (94 - v.bp) + " dB (re 1 Pa)"],
    ["max", "SPL max (THD 0,5 %)", v.max + " dB"],
    ["max", "Dynamique", (v.max - v.bp) + " dB"],
    ["z", "Impédance nominale", O.nb(v.zs, 0) + " Ω"],
    ["z", "Charge minimale", "≥ " + O.nb(5 * v.zs, 0) + " Ω"],
    ["rep", "Bande passante", "20 Hz – 20 kHz"],
    ["rep", "Présence", v.pr ? "+" + v.pr + " dB vers 5 kHz" : "aucune"],
    ["rep", "Coupe-bas", coupeBas ? "80 Hz, 12 dB/octave" : "désactivé"]
  ];
  const RY = 92, RH = 37;
  // Réponse sur l'axe (dB) : passe-haut naturel ≈ 18 Hz, passe-bas ≈ 22 kHz, présence, coupe-bas
  function reponse(f, v) {
    const hp = (x) => 20 * Math.log10(x * x / Math.sqrt(1 + Math.pow(x, 4)));
    let g = hp(f / 18) - 10 * Math.log10(1 + Math.pow(f / 22000, 4)) + v.pr * Math.exp(-Math.pow(Math.log10(f / 5000) / 0.17, 2) / 2);
    if (coupeBas) g += hp(f / 80);
    return g;
  }

  function dessiner() {
    const v = val(), Lc = 20 * Math.log10(v.zc / (v.zs + v.zc));
    Application.afficher("#m5b-so", O.nb(v.S, v.S < 10 ? 1 : 0) + " mV/Pa");
    Application.afficher("#m5b-bo", v.bp + " dB(A)");
    Application.afficher("#m5b-mo", v.max + " dB");
    Application.afficher("#m5b-zso", O.nb(v.zs, 0) + " Ω");
    Application.afficher("#m5b-zco", v.zc >= 1000 ? O.nb(v.zc / 1000, 1) + " kΩ" : O.nb(v.zc, 0) + " Ω");
    Application.afficher("#m5b-pro", v.pr ? "+" + v.pr + " dB" : "aucune");
    Application.afficher("#m5b-dbv", O.db(MICRO.dbv(v.S)).replace(" dB", " dBV"));
    Application.afficher("#m5b-sb", (94 - v.bp) + " dB");
    Application.afficher("#m5b-dyn", (v.max - v.bp) + " dB");
    Application.afficher("#m5b-perte", O.db(Lc, 1));
    O.html("m5b-titre", NOMS[ligne]);

    O.fond(c);
    // La fiche
    c.fillStyle = "#f2f2f4"; O.rect(c, 20, 20, 430, 460, 14); c.fill();
    O.ecrire(c, "FICHE TECHNIQUE", 40, 50, { s: 14, c: "#6e6e73" });
    O.ecrire(c, "Micro statique (type)", 40, 74, { s: 19, c: "#1d1d1f" });
    rangees(v).forEach((r, i) => {
      const y = RY + i * RH;
      if (r[0] === ligne) { c.fillStyle = "rgba(10,132,255,.16)"; O.rect(c, 28, y + 2, 414, RH - 4, 8); c.fill(); c.fillStyle = COUL.bleu; c.fillRect(28, y + 6, 4, RH - 12); }
      c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(40, y + RH, 390, 1);
      O.ecrire(c, r[1], 42, y + RH / 2 + 1, { s: 15, g: false, c: "#3a3a3c", b: "middle" });
      O.ecrire(c, r[2], 430, y + RH / 2 + 1, { s: 15, m: true, c: "#1d1d1f", a: "right", b: "middle" });
    });

    // Le schéma de la ligne choisie
    const X0 = 490, X1 = 975;
    let cls = "note ok", msg = "";
    if (ligne === "sens") {
      O.ecrire(c, "Sensibilité : la tension délivrée pour 1 Pa (94 dB SPL)", X0, 50, { s: 16 });
      const xs = s => O.log(s, 0.5, 100, X0 + 20, X1 - 20), ya = 160;
      c.fillStyle = COUL.trait; c.fillRect(X0 + 20, ya, X1 - X0 - 40, 2);
      [0.5, 1, 2, 5, 10, 20, 50, 100].forEach(s => { c.fillRect(xs(s), ya - 6, 1.5, 8); O.ecrire(c, O.nb(s, 1), xs(s), ya - 14, { s: 14, g: false, c: COUL.texte, a: "center" }); });
      O.ecrire(c, "mV/Pa", X1 - 20, ya - 34, { s: 13, g: false, c: COUL.doux, a: "right" });
      [-60, -50, -40, -30, -20].forEach(d => { const x = xs(MICRO.mvpa(d)); c.fillRect(x, ya + 2, 1.5, 7); O.ecrire(c, O.signe(d, 0), x, ya + 26, { s: 14, g: false, c: COUL.ciel, a: "center" }); });
      O.ecrire(c, "dBV", X1 - 20, ya + 46, { s: 13, g: false, c: COUL.ciel, a: "right" });
      [["Ruban passif", 1, 2, COUL.cuivre, 230], ["Dynamique", 1.5, 3, COUL.orange, 262], ["Statique", 5, 50, COUL.violet, 294]].forEach(b => {
        c.fillStyle = b[3] + "88"; O.rect(c, xs(b[1]), b[4] - 10, xs(b[2]) - xs(b[1]), 20, 6); c.fill();
        O.ecrire(c, b[0], b[1] >= 5 ? xs(b[1]) + 8 : xs(b[2]) + 8, b[4] + 1, { s: 14, c: COUL.texte, b: "middle" });
      });
      const x = xs(v.S);
      c.strokeStyle = COUL.jaune; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, ya - 4); c.lineTo(x, 320); c.stroke();
      c.fillStyle = COUL.jaune; c.beginPath(); c.arc(x, ya + 1, 6, 0, 7); c.fill();
      const pv = MICRO.pa(74), pc = MICRO.pa(130);
      O.ecrire(c, "S = " + O.nb(v.S, 1) + " mV/Pa = 20 log(" + O.nb(v.S / 1000, 4) + ") = " + O.db(MICRO.dbv(v.S)).replace(" dB", " dBV"), X0, 370, { s: 16, c: COUL.jaune });
      O.ecrire(c, "Voix à 74 dB SPL (" + O.nb(pv, 2) + " Pa) → U = S × p = " + O.volts(v.S / 1000 * pv), X0, 405, { s: 15, g: false });
      O.ecrire(c, "Caisse claire à 130 dB SPL (" + O.nb(pc, 0) + " Pa) → U = " + O.volts(v.S / 1000 * pc), X0, 432, { s: 15, g: false });
      O.ecrire(c, "Diviser la sensibilité par 10 = perdre 20 dB.", X0, 466, { s: 15, g: false, c: COUL.doux });
      msg = "<b>" + O.nb(v.S, 1) + " mV/Pa = " + O.db(MICRO.dbv(v.S)).replace(" dB", " dBV") + ".</b> " + (v.S < 3.5 ? "C’est la sensibilité d’un micro dynamique ou à ruban : prévoyez beaucoup de gain au préampli." : v.S < 8 ? "Sensibilité modeste pour un statique (micro miniature, cravate)." : "Sensibilité typique d’un micro statique.") + " En dBV, la valeur est négative : plus elle est proche de 0, plus le micro est sensible.";
    } else if (ligne === "bruit" || ligne === "max") {
      const yS = L => 460 - O.borne(L, 0, 150) / 150 * 380, xa = X0 + 60;
      O.ecrire(c, ligne === "bruit" ? "Bruit propre et rapport signal/bruit" : "Niveau maximal admissible et dynamique", X0, 50, { s: 16 });
      c.fillStyle = COUL.panneau; c.fillRect(xa, 80, 50, 380);
      [0, 30, 60, 90, 120, 150].forEach(L => O.ecrire(c, String(L), xa - 8, yS(L), { s: 13, g: false, c: COUL.doux, a: "right", b: "middle" }));
      O.ecrire(c, "dB SPL", xa - 8, 70, { s: 13, g: false, c: COUL.doux, a: "right" });
      c.fillStyle = "rgba(142,142,147,.5)"; c.fillRect(xa, yS(v.bp), 50, 460 - yS(v.bp));
      O.ecrire(c, "bruit propre " + v.bp + " dB(A)", xa + 58, yS(v.bp), { s: 14, c: COUL.doux, b: "middle" });
      if (ligne === "bruit") {
        c.fillStyle = COUL.ciel; c.fillRect(xa - 4, yS(94) - 1, 58, 2);
        O.ecrire(c, "1 Pa = 94 dB SPL (référence)", xa + 58, yS(94), { s: 14, c: COUL.ciel, b: "middle" });
        O.fleche(c, xa + 25, yS(v.bp) - 2, xa + 25, yS(94) + 3, COUL.jaune, 2); O.fleche(c, xa + 25, yS(94) + 2, xa + 25, yS(v.bp) - 3, COUL.jaune, 2);
        O.ecrire(c, "S/B = 94 − " + v.bp + " = " + (94 - v.bp) + " dB", xa + 58, (yS(94) + yS(v.bp)) / 2, { s: 16, c: COUL.jaune, b: "middle" });
        // Zoom 0–40 dB(A)
        const zx = 860, yZ = L => 440 - L / 40 * 330;
        O.ecrire(c, "Zoom 0 – 40 dB(A)", zx - 10, 86, { s: 14, c: COUL.doux });
        [[0, 10, COUL.vert, "excellent"], [10, 15, "#7bd88f", "très bon"], [15, 20, COUL.jaune, "correct"], [20, 25, COUL.orange, "moyen"], [25, 40, COUL.rouge, "audible"]].forEach(b => {
          c.fillStyle = b[2] + "66"; c.fillRect(zx, yZ(b[1]), 34, yZ(b[0]) - yZ(b[1]) - 1);
          O.ecrire(c, b[3], zx + 42, (yZ(b[0]) + yZ(b[1])) / 2, { s: 14, g: false, b: "middle" });
        });
        [0, 10, 20, 30, 40].forEach(L => O.ecrire(c, String(L), zx - 6, yZ(L), { s: 13, g: false, c: COUL.doux, a: "right", b: "middle" }));
        c.fillStyle = COUL.texte; c.fillRect(zx - 4, yZ(Math.min(v.bp, 40)) - 1.5, 42, 3);
        const note = v.bp < 10 ? "excellent" : v.bp < 15 ? "très bon" : v.bp < 20 ? "correct" : v.bp <= 25 ? "moyen" : "audible sur les sources douces";
        cls = v.bp > 25 ? "note warn" : "note ok";
        msg = "<b>Bruit propre de " + v.bp + " dB(A) : " + note + ".</b> Le rapport signal/bruit vaut 94 − " + v.bp + " = " + (94 - v.bp) + " dB. Pour le bruit propre, plus petit est meilleur ; pour le S/B, plus grand est meilleur.";
      } else {
        c.fillStyle = "rgba(255,69,58,.35)"; c.fillRect(xa, 80, 50, yS(v.max) - 80);
        O.ecrire(c, "SPL max " + v.max + " dB", xa + 58, yS(v.max), { s: 14, c: COUL.rouge, b: "middle" });
        O.fleche(c, xa - 26, yS(v.bp) - 2, xa - 26, yS(v.max) + 3, COUL.jaune, 2); O.fleche(c, xa - 26, yS(v.max) + 2, xa - 26, yS(v.bp) - 3, COUL.jaune, 2);
        O.ecrire(c, "dynamique = " + v.max + " − " + v.bp + " = " + (v.max - v.bp) + " dB", X0, 492, { s: 16, c: COUL.jaune });
        const sources = [[60, "voix à 1 m (60 dB)"], [115, "chant fort à 5 cm (115 dB)"], [135, "caisse claire à 5 cm (135 dB)"]];
        const trop = [];
        sources.forEach(p => {
          const sat = p[0] > v.max; if (sat) trop.push(p[1].split(" (")[0]);
          c.fillStyle = sat ? COUL.rouge : COUL.vert; c.beginPath(); c.arc(752, yS(p[0]), 6, 0, 7); c.fill();
          O.ecrire(c, (sat ? "⚠ " : "") + p[1], 766, yS(p[0]), { s: 14, c: sat ? COUL.rouge : COUL.texte, b: "middle" });
        });
        cls = trop.length ? "note warn" : "note ok";
        msg = "<b>Dynamique = " + v.max + " − " + v.bp + " = " + (v.max - v.bp) + " dB.</b> " + (trop.length ? "Ce micro saturerait sur : " + trop.join(", ") + ". Un atténuateur (−10 ou −20 dB) repousserait d’autant le SPL max." : "Toutes les sources proposées restent sous le SPL max.");
      }
    } else if (ligne === "z") {
      O.ecrire(c, "Impédances : un diviseur de tension", X0, 50, { s: 16 });
      // circuit
      c.strokeStyle = COUL.texte; c.lineWidth = 2;
      c.beginPath(); c.moveTo(540, 200); c.lineTo(540, 130); c.lineTo(600, 130); c.moveTo(690, 130); c.lineTo(820, 130); c.lineTo(820, 170); c.moveTo(820, 260); c.lineTo(820, 300); c.lineTo(540, 300); c.lineTo(540, 252); c.stroke();
      c.beginPath(); c.arc(540, 226, 26, 0, 7); c.stroke();
      c.beginPath(); for (let i = 0; i <= 20; i++) { const x = 526 + i * 1.4; c.lineTo(x, 226 - 8 * Math.sin(i / 20 * Math.PI * 2)); } c.stroke();
      c.fillStyle = COUL.panneau; c.strokeStyle = COUL.orange; O.rect(c, 600, 118, 90, 24, 4); c.fill(); c.stroke();
      O.rect(c, 808, 170, 24, 90, 4); c.fill(); c.strokeStyle = COUL.ciel; c.stroke();
      O.ecrire(c, "Zs = " + O.nb(v.zs, 0) + " Ω", 645, 108, { s: 15, c: COUL.orange, a: "center" });
      O.ecrire(c, "Zc", 842, 206, { s: 15, c: COUL.ciel });
      O.ecrire(c, v.zc >= 1000 ? O.nb(v.zc / 1000, 1) + " kΩ" : O.nb(v.zc, 0) + " Ω", 842, 226, { s: 15, c: COUL.ciel });
      O.ecrire(c, "U", 500, 230, { s: 17, c: COUL.jaune, a: "center" });
      O.fleche(c, 900, 260, 900, 172, COUL.vert, 2); O.ecrire(c, "Uc", 912, 220, { s: 17, c: COUL.vert });
      c.setLineDash([5, 4]); c.lineWidth = 1; c.strokeStyle = COUL.doux;
      O.rect(c, 500, 92, 210, 230, 10); c.stroke(); O.rect(c, 780, 92, 170, 230, 10); c.stroke(); c.setLineDash([]);
      O.ecrire(c, "le micro", 605, 340, { s: 14, c: COUL.doux, a: "center" });
      O.ecrire(c, "l’entrée du préampli", 865, 340, { s: 14, c: COUL.doux, a: "center" });
      const k = v.zc / (v.zs + v.zc);
      O.ecrire(c, "Uc = U × Zc / (Zs + Zc) = U × " + O.nb(k, 3) + "  →  " + O.db(Lc, 1), X0, 380, { s: 16, c: COUL.jaune });
      [["U (micro à vide)", 1, COUL.jaune, 410], ["Uc (reçue)", k, COUL.vert, 440]].forEach(b => {
        O.ecrire(c, b[0], X0, b[3] + 9, { s: 14, g: false });
        c.fillStyle = b[2]; c.fillRect(X0 + 130, b[3], 320 * b[1], 16);
        O.ecrire(c, O.nb(b[1] * 100, 0) + " %", X0 + 138 + 320 * b[1], b[3] + 9, { s: 14, b: "middle" });
      });
      const ratio = v.zc / v.zs;
      cls = ratio >= 5 ? "note ok" : ratio >= 1.5 ? "note warn" : "note bad";
      msg = ratio >= 5 ? "<b>Le micro travaille en pont.</b> L’entrée est " + O.nb(ratio, 1) + " fois plus impédante que le micro : la perte n’est que de " + O.nb(-Lc, 1) + " dB." : ratio >= 1.5 ? "<b>Entrée un peu faible.</b> Elle n’est que " + O.nb(ratio, 1) + " fois plus impédante que le micro : on perd " + O.nb(-Lc, 1) + " dB. Visez au moins 5 à 10 fois." : "<b>Adaptation d’impédance (ou pire) : à éviter.</b> Avec Zc ≈ Zs, la moitié de la tension se perd dans le micro (−6 dB). En audio, on ne cherche pas à transmettre une puissance, mais une tension.";
    } else {
      O.ecrire(c, "Réponse en fréquence sur l’axe", X0, 50, { s: 16 });
      const xf = f => O.log(f, 20, 20000, X0 + 30, X1 - 10), yd = d => 218 - d * 10;
      c.fillStyle = "rgba(48,209,88,.12)"; c.fillRect(xf(20), yd(2), xf(20000) - xf(20), yd(-2) - yd(2));
      [10, 5, 0, -5, -10, -15, -20].forEach(d => { c.fillStyle = d === 0 ? "rgba(255,255,255,.3)" : COUL.grille; c.fillRect(xf(20), yd(d), xf(20000) - xf(20), 1); O.ecrire(c, O.signe(d, 0), xf(20) - 6, yd(d), { s: 13, g: false, c: COUL.doux, a: "right", b: "middle" }); });
      [[20, "20"], [50, "50"], [100, "100"], [200, "200"], [500, "500"], [1000, "1 k"], [2000, "2 k"], [5000, "5 k"], [10000, "10 k"], [20000, "20 k"]].forEach(p => { c.fillStyle = COUL.grille; c.fillRect(xf(p[0]), yd(10), 1, yd(-20) - yd(10)); O.ecrire(c, p[1], xf(p[0]), yd(-20) + 18, { s: 13, g: false, c: COUL.doux, a: "center" }); });
      O.ecrire(c, "Hz", X1 - 10, yd(-20) + 36, { s: 13, g: false, c: COUL.doux, a: "right" });
      O.ecrire(c, "tolérance ± 2 dB", xf(25), yd(2) - 6, { s: 13, g: false, c: COUL.vert });
      c.strokeStyle = COUL.jaune; c.lineWidth = 2.6; c.beginPath();
      for (let i = 0; i <= 300; i++) { const f = 20 * Math.pow(1000, i / 300), y = yd(O.borne(reponse(f, v), -22, 12)); i ? c.lineTo(xf(f), y) : c.moveTo(xf(f), y); }
      c.stroke();
      if (v.pr) O.ecrire(c, "présence +" + v.pr + " dB", xf(5000), yd(reponse(5000, v)) - 14, { s: 14, c: COUL.jaune, a: "center" });
      if (coupeBas) { const y = yd(reponse(80, v)); c.fillStyle = COUL.ciel; c.beginPath(); c.arc(xf(80), y, 5, 0, 7); c.fill(); O.ecrire(c, "80 Hz : −3 dB, puis −12 dB/octave", xf(80) + 10, y + 26, { s: 14, c: COUL.ciel }); }
      O.ecrire(c, "Sensibilité relative (dB) par rapport à 1 kHz", X0, 486, { s: 14, g: false, c: COUL.doux });
      msg = "<b>La sensibilité varie avec la fréquence.</b> " + (v.pr ? "La bosse de +" + v.pr + " dB vers 5 kHz rend la voix plus présente et plus intelligible. " : "Sans bosse de présence, la courbe reste dans la tolérance de ± 2 dB : c’est un micro « neutre ». ") + (coupeBas ? "Le coupe-bas retire les grondements (vent, manipulation, effet de proximité) : −3 dB à 80 Hz, −12 dB une octave plus bas." : "Activez le coupe-bas pour voir son effet dans le grave.");
    }
    O.note("m5b-msg", cls, msg);
  }

  // Toucher une ligne de la fiche
  cv.addEventListener("click", e => {
    const p = O.clic(cv, e); if (p[0] > 450) return;
    const i = Math.floor((p[1] - RY) / RH), r = rangees(val())[i];
    if (r) segLigne.choisir(r[0]);
  });
  [cS, cB, cM, cZs, cZc, cPr].forEach(el => el.addEventListener("input", dessiner));
  const FICHES = {
    studio: { S: 25, bp: 7, max: 132, zs: 200, zc: 2000, pr: 3 },
    pm: { S: 15, bp: 16, max: 135, zs: 200, zc: 2000, pr: 0 },
    cravate: { S: 6, bp: 26, max: 130, pr: 5 },
    adapt: { zc: +0 }
  };
  O.situations("m5b-situ", s => {
    const f = FICHES[s];
    if (s === "adapt") { cZc.value = O.posLog(+cZs.value, 100, 10000); segLigne.choisir("z"); return; }
    cS.value = O.posLog(f.S, 0.5, 60); cB.value = f.bp; cM.value = f.max; cPr.value = f.pr;
    if (f.zs) { cZs.value = f.zs; cZc.value = O.posLog(f.zc, 100, 10000); }
    [cS, cB, cM, cZs, cZc, cPr].forEach(el => el.dispatchEvent(new Event("input", { bubbles: true })));
  });
  dessiner();
});

/* ==========================================================================
   MODULE 6 — TYPES DE MICROS ET PRISE DE SON
   ========================================================================== */

/* --- Labo 1 : distance critique ---------------------------------------------
   Champ direct : −20 log d (référence : son direct à 1 m).
   Champ réverbéré capté : constant, égal au direct à la distance critique
   d_c = √DF × r_H, avec r_H ≈ 0,057 √(V/T) (source omnidirectionnelle).
   Total : somme des énergies. Proportions de la salle supposées 1,6 × 1,2 × 1. */
labo(6, function () {
  const cv = O.el("m6a-cv"), c = cv.getContext("2d");
  const cV = O.el("m6a-v"), cT = O.el("m6a-t"), cD = O.el("m6a-d"), sel = O.el("m6a-dir");
  const VMIN = 5, VMAX = 20000, DMIN = 0.05, DMAX = 20;
  O.options(sel, DIRECTIVITES.map(d => [d.id, d.nom]), "cardio");
  cV.value = O.posLog(200, VMIN, VMAX); cD.value = O.posLog(0.5, DMIN, DMAX);
  let temps = 0;
  const alea = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const grains = Array.from({ length: 110 }, (_, i) => [alea(i), alea(i + 300), alea(i + 600) * 6.3]);

  // Graphique
  const GX0 = 80, GX1 = 600, GY0 = 70, GY1 = 450, VHAUT = 30, VBAS = -35;
  const gx = d => O.log(d, DMIN, DMAX, GX0, GX1);
  const gy = v => GY0 + (VHAUT - O.borne(v, VBAS, VHAUT)) / (VHAUT - VBAS) * (GY1 - GY0);

  function dessiner() {
    const V = O.valLog(+cV.value, VMIN, VMAX), T = +cT.value, d = O.valLog(+cD.value, DMIN, DMAX), D = DIR(sel.value);
    const rH = MICRO.rayonReverberation(V, T), df = MICRO.df(D.A), dc = Math.sqrt(df) * rH, dr = 20 * Math.log10(dc / d);
    const LR = -20 * Math.log10(dc), LRomni = -20 * Math.log10(rH), LD = x => -20 * Math.log10(x);
    const total = x => 10 * Math.log10(Math.pow(10, LD(x) / 10) + Math.pow(10, LR / 10));

    Application.afficher("#m6a-vo", O.nb(V < 100 ? V : Math.round(V / 10) * 10, 0) + " m³");
    Application.afficher("#m6a-to", O.nb(T, 2) + " s");
    Application.afficher("#m6a-do", O.metres(d));
    Application.afficher("#m6a-rh", O.metres(rH));
    Application.afficher("#m6a-dc", O.metres(dc));
    Application.afficher("#m6a-dr", O.signe(dr, 1) + " dB");
    Application.afficher("#m6a-champ", dr >= 6 ? "Direct" : dr <= -6 ? "Réverbéré" : "Mélange");

    O.fond(c);
    // --- Graphique ---
    O.ecrire(c, "Niveau capté (dB, par rapport au son direct à 1 m)", GX0 - 50, 34, { s: 16 });
    c.fillStyle = "rgba(10,132,255,.07)"; c.fillRect(GX0, GY0, gx(dc) - GX0, GY1 - GY0);
    c.fillStyle = "rgba(255,159,10,.07)"; c.fillRect(gx(dc), GY0, GX1 - gx(dc), GY1 - GY0);
    for (let v = -30; v <= 30; v += 10) { c.fillStyle = v === 0 ? "rgba(255,255,255,.22)" : COUL.grille; c.fillRect(GX0, gy(v), GX1 - GX0, 1); O.ecrire(c, O.signe(v, 0), GX0 - 8, gy(v), { s: 14, g: false, c: COUL.doux, a: "right", b: "middle" }); }
    [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20].forEach(x => { c.fillStyle = COUL.grille; c.fillRect(gx(x), GY0, 1, GY1 - GY0); O.ecrire(c, O.nb(x, 2), gx(x), GY1 + 20, { s: 14, g: false, c: COUL.doux, a: "center" }); });
    O.ecrire(c, "distance source – micro (m)", GX1, GY1 + 42, { s: 14, g: false, c: COUL.doux, a: "right" });
    O.ecrire(c, "direct dominant", GX0 + 8, GY1 - 10, { s: 14, c: COUL.ciel });
    O.ecrire(c, "réverbéré dominant", GX1 - 8, GY1 - 10, { s: 14, c: COUL.orange, a: "right" });
    c.save(); c.beginPath(); c.rect(GX0, GY0, GX1 - GX0, GY1 - GY0); c.clip();
    if (D.id !== "omni") {
      c.strokeStyle = COUL.doux; c.setLineDash([6, 5]); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(GX0, gy(LRomni)); c.lineTo(GX1, gy(LRomni)); c.stroke(); c.setLineDash([]);
    }
    c.strokeStyle = COUL.orange; c.lineWidth = 3; c.beginPath(); c.moveTo(GX0, gy(LR)); c.lineTo(GX1, gy(LR)); c.stroke();
    c.strokeStyle = COUL.bleu; c.beginPath(); c.moveTo(gx(DMIN), gy(LD(DMIN))); c.lineTo(gx(DMAX), gy(LD(DMAX))); c.stroke();
    c.strokeStyle = COUL.texte; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i <= 200; i++) { const x = DMIN * Math.pow(DMAX / DMIN, i / 200); i ? c.lineTo(gx(x), gy(total(x))) : c.moveTo(gx(x), gy(total(x))); }
    c.stroke();
    c.restore();
    // étiquettes des courbes
    O.ecrire(c, "champ direct (−6 dB / doublement)", gx(0.07), gy(LD(0.07)) - 6, { s: 14, c: COUL.ciel });
    O.ecrire(c, "réverbéré capté par ce micro", GX1 - 4, gy(LR) - 8, { s: 14, c: COUL.orange, a: "right" });
    if (D.id !== "omni" && Math.abs(LRomni - LR) > 2) O.ecrire(c, "réverbéré capté par un omni", GX1 - 4, gy(LRomni) - 8, { s: 13, g: false, c: COUL.doux, a: "right" });
    // distance critique
    if (dc > DMIN && dc < DMAX) {
      c.strokeStyle = COUL.orange; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx(dc), GY0); c.lineTo(gx(dc), GY1); c.stroke(); c.setLineDash([]);
      O.ecrire(c, "dc = " + O.metres(dc), gx(dc) + 6, GY0 + 16, { s: 14, c: COUL.orange });
    }
    // le micro
    const xm = gx(d);
    c.strokeStyle = COUL.jaune; c.lineWidth = 2; c.beginPath(); c.moveTo(xm, GY0); c.lineTo(xm, GY1); c.stroke();
    if (Math.abs(dr) > 1.2) { O.fleche(c, xm + 14, gy(LR), xm + 14, gy(LD(d)), COUL.jaune, 2); O.ecrire(c, "D/R " + O.signe(dr, 1) + " dB", xm + 22, (gy(LR) + gy(LD(d))) / 2, { s: 15, c: COUL.jaune, b: "middle" }); }
    c.fillStyle = COUL.jaune; c.beginPath(); c.arc(xm, gy(total(d)), 6, 0, 7); c.fill();

    // --- La salle vue de dessus ---
    const k = Math.cbrt(V / 1.92), L = 1.6 * k, l = 1.2 * k;
    const s = Math.min(330 / L, 290 / l), rw = L * s, rh = l * s, rx = 650 + (330 - rw) / 2, ry = 100 + (290 - rh) / 2;
    O.ecrire(c, "La salle, vue de dessus", 815, 34, { s: 16, a: "center" });
    O.ecrire(c, "≈ " + O.metres(L) + " × " + O.metres(l) + " × " + O.metres(k) + " de haut", 815, 56, { s: 14, g: false, c: COUL.doux, a: "center" });
    c.fillStyle = COUL.panneau; c.fillRect(rx, ry, rw, rh);
    c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 2; c.strokeRect(rx, ry, rw, rh);
    const sx = rx + 0.2 * rw, sy = ry + rh / 2;
    let mx = sx + d * s; const dehors = mx > rx + rw - 10; if (dehors) mx = rx + rw - 10;
    c.save(); c.beginPath(); c.rect(rx, ry, rw, rh); c.clip();
    // champ réverbéré : des reflets partout, de même intensité
    grains.forEach(g => {
      const a = 0.18 + 0.18 * Math.sin(g[2] + temps * 2.2 * (0.6 + g[1]));
      c.fillStyle = "rgba(255,159,10," + a.toFixed(3) + ")"; c.beginPath(); c.arc(rx + g[0] * rw, ry + g[1] * rh, 2, 0, 7); c.fill();
    });
    // champ direct : des fronts d'onde qui s'affaiblissent avec la distance
    const pasOnde = 46, vit = 70;
    for (let i = 0; i < 12; i++) {
      const r = ((temps * vit) % pasOnde) + i * pasOnde;
      const a = Math.min(0.9, 14 / Math.max(r, 1));
      c.strokeStyle = "rgba(100,210,255," + a.toFixed(3) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.stroke();
    }
    // cercles r_H et d_c
    c.setLineDash([5, 5]); c.lineWidth = 1.5;
    c.strokeStyle = COUL.doux; c.beginPath(); c.arc(sx, sy, rH * s, 0, 7); c.stroke();
    c.strokeStyle = COUL.orange; c.beginPath(); c.arc(sx, sy, dc * s, 0, 7); c.stroke();
    c.setLineDash([]);
    c.restore();
    if (rH * s < rw) O.ecrire(c, "rH", sx, sy - rH * s - 6, { s: 13, c: COUL.doux, a: "center" });
    if (dc * s < rw * 0.8 && Math.abs(dc - rH) * s > 14) O.ecrire(c, "dc", sx, sy + dc * s + 16, { s: 13, c: COUL.orange, a: "center" });
    // la source
    c.fillStyle = COUL.ciel; c.beginPath(); c.arc(sx, sy, 8, 0, 7); c.fill();
    O.ecrire(c, "source", sx, sy - 16, { s: 13, c: COUL.ciel, a: "center" });
    // le micro et sa directivité (axe tourné vers la source)
    c.strokeStyle = D.couleur; c.lineWidth = 2; c.beginPath();
    for (let a = 0; a <= 360; a += 4) { const r = Math.abs(MICRO.gain(D.A, a)) * 30, t = a * Math.PI / 180; const x = mx - r * Math.cos(t), y = sy + r * Math.sin(t); a ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    O.microDessus(c, mx, sy, -90, COUL.jaune, 0.8);
    O.ecrire(c, dehors ? "micro (hors de la salle !)" : "micro", mx, sy + 46, { s: 13, c: dehors ? COUL.rouge : COUL.jaune, a: "center" });
    O.ecrire(c, "ondes directes : s’affaiblissent en s’éloignant", 650, 420, { s: 13, g: false, c: COUL.ciel });
    O.ecrire(c, "reflets : le champ réverbéré, partout le même", 650, 442, { s: 13, g: false, c: COUL.orange });

    // Explication et calcul
    let cls, msg;
    if (dr >= 6) { cls = "note ok"; msg = "<b>Champ direct dominant</b> (D/R = " + O.signe(dr, 1) + " dB) : la voix est nette et présente."; }
    else if (dr > -6) { cls = "note warn"; msg = "<b>Autour de la distance critique</b> (D/R = " + O.signe(dr, 1) + " dB) : direct et réverbération se mélangent. Pour une voix nette, rapprochez-vous à moins de " + O.metres(dc / 2) + ", ou prenez un micro plus directif."; }
    else { cls = "note bad"; msg = "<b>Champ réverbéré dominant</b> (D/R = " + O.signe(dr, 1) + " dB) : la voix paraît lointaine, noyée dans la salle. Monter le gain n’y changerait rien : il amplifie aussi la réverbération."; }
    msg += D.id === "omni" ? " Avec un omni, la distance critique est le rayon de réverbération de la salle." : " Ce micro " + D.nom.toLowerCase() + " (DF = " + O.nb(df, 2) + ") repousse la distance critique de √DF = " + O.nb(Math.sqrt(df), 2) + " fois.";
    if (dehors) msg += " Attention : à cette distance, le micro serait hors de la salle.";
    O.note("m6a-msg", cls, msg);
    O.html("m6a-calc",
      '<div><span class="c">rH = 0,057 × √(V / T)</span> = 0,057 × √(' + O.nb(V, 0) + " / " + O.nb(T, 2) + ") = " + O.metres(rH) + "</div>" +
      '<div><span class="c">dc = √DF × rH</span> = √' + O.nb(df, 2) + " × " + O.nb(rH, 2) + " = <b>" + O.metres(dc) + "</b></div>" +
      '<div><span class="c">D/R = 20 log(dc / d)</span> = 20 log(' + O.nb(dc, 2) + " / " + O.nb(d, 2) + ") = " + O.signe(dr, 1) + " dB</div>");
  }

  const boucle = O.boucle(cv, (dt, t) => { temps = t; dessiner(); });
  O.boutonPause("m6a-pause", boucle);
  [cV, cT, cD].forEach(el => el.addEventListener("input", dessiner));
  sel.addEventListener("change", dessiner);
  const SALLES = { cabine: [10, 0.25], classe: [200, 0.8], plateau: [1500, 0.7], eglise: [8000, 4] };
  O.situations("m6a-situ", s => { cV.value = O.posLog(SALLES[s][0], VMIN, VMAX); O.curseur(cT, SALLES[s][1]); });
  dessiner();
});

/* --- Labo 2 : filtre en peigne et micro de surface --------------------------
   Méthode de la source image : la réflexion sur la table semble venir d'une
   source symétrique sous la table. Δ = r_réfléchi − r_direct, τ = Δ / c.
   Réponse : |1 + a·e^(−j2πfτ)| avec a = ρ × r_direct / r_réfléchi
   (ρ : réflexion de la table, r_d / r_r : la réflexion a fait plus de chemin).
   L'animation est ralentie d'environ 300 fois. */
labo(6, function () {
  const cv = O.el("m6b-cv"), c = cv.getContext("2d");
  const cH = O.el("m6b-h"), cD = O.el("m6b-d"), cHs = O.el("m6b-hs"), cR = O.el("m6b-r");
  const HMIN = 0.002, HMAX = 0.6;
  cH.value = O.posLog(0.25, HMIN, HMAX);
  let temps = 0;
  const S = 250, YT = 360, XB = 80, VANIM = 1.1; // px par mètre, hauteur de la table, x de la bouche, m/s du ralenti

  // Point à la distance u (m) le long d'une ligne brisée de points [x, y] en mètres réels
  function lePlong(pts, u) {
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy);
      if (u <= l) return [pts[i - 1][0] + dx * u / l, pts[i - 1][1] + dy * u / l];
      u -= l;
    }
    return null;
  }

  function dessiner() {
    const h = O.valLog(+cH.value, HMIN, HMAX), d = +cD.value, hs = +cHs.value, rho = +cR.value;
    const rd = Math.hypot(d, hs - h), rr = Math.hypot(d, hs + h), delta = rr - rd, tau = delta / MICRO.c, a = rho * rd / rr, f1 = 1 / (2 * tau);
    const rep = f => 10 * Math.log10(1 + a * a + 2 * a * Math.cos(2 * Math.PI * f * tau));
    const creux = a > 0 ? 20 * Math.log10(Math.max(1 - a, 1e-4)) : 0, bosse = 20 * Math.log10(1 + a);

    Application.afficher("#m6b-ho", O.metres(h));
    Application.afficher("#m6b-do", O.metres(d));
    Application.afficher("#m6b-hso", O.metres(hs));
    Application.afficher("#m6b-ro", O.nb(rho * 100, 0) + " %");
    Application.afficher("#m6b-delta", O.metres(delta));
    Application.afficher("#m6b-tau", tau >= 1e-3 ? O.nb(tau * 1000, 2) + " ms" : O.nb(tau * 1e6, 0) + " µs");
    Application.afficher("#m6b-f1", O.hz(f1));
    Application.afficher("#m6b-prof", a < 0.01 ? "aucune" : O.db(creux, 1));

    O.fond(c);
    // --- Vue de côté ---
    const P = (x, y) => [XB + x * S, YT - y * S]; // mètres → pixels
    const bouche = P(0, hs), micro = P(d, h), image = P(0, -hs), reflet = P(d * hs / (hs + h), 0);
    O.ecrire(c, "Vue de côté (animation ralentie ≈ 300 ×)", 24, 34, { s: 16 });
    // table
    c.fillStyle = "#6b4a2b"; c.fillRect(24, YT, 456, 12);
    c.fillStyle = "rgba(107,74,43,.25)"; c.fillRect(24, YT + 12, 456, 520 - YT - 12);
    O.ecrire(c, "table" + (rho < 0.5 ? " (couverte de feutre)" : ""), 470, YT + 34, { s: 13, c: "#c9a27a", a: "right" });
    // tête
    c.fillStyle = "#3a3d44"; c.beginPath(); c.arc(bouche[0] - 24, bouche[1] - 10, 26, 0, 7); c.fill();
    c.fillRect(bouche[0] - 44, bouche[1] + 12, 40, YT - bouche[1] - 12);
    c.fillStyle = COUL.ciel; c.beginPath(); c.arc(bouche[0], bouche[1], 5, 0, 7); c.fill();
    // source image
    c.strokeStyle = "rgba(255,159,10,.5)"; c.setLineDash([4, 4]); c.lineWidth = 1.5;
    c.beginPath(); c.arc(image[0], image[1], 6, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(image[0], image[1]); c.lineTo(reflet[0], reflet[1]); c.stroke(); c.setLineDash([]);
    O.ecrire(c, "source image", image[0] + 12, Math.min(image[1], 505), { s: 13, c: "rgba(255,159,10,.8)", b: "middle" });
    // trajets
    c.lineWidth = 2.5;
    c.strokeStyle = COUL.ciel; c.beginPath(); c.moveTo(bouche[0], bouche[1]); c.lineTo(micro[0], micro[1]); c.stroke();
    c.strokeStyle = COUL.orange; c.beginPath(); c.moveTo(bouche[0], bouche[1]); c.lineTo(reflet[0], reflet[1]); c.lineTo(micro[0], micro[1]); c.stroke();
    // le micro
    if (h < 0.012) {
      c.fillStyle = COUL.texte; O.rect(c, micro[0] - 22, YT - 7, 44, 7, 3); c.fill();
      c.fillStyle = COUL.jaune; c.beginPath(); c.arc(micro[0], YT - 7, 4, 0, 7); c.fill();
      O.ecrire(c, "micro de surface", micro[0], YT - 18, { s: 13, c: COUL.jaune, a: "center" });
    } else {
      c.strokeStyle = COUL.doux; c.lineWidth = 3; c.beginPath(); c.moveTo(micro[0] + 8, micro[1] + 6); c.lineTo(micro[0] + 8, YT); c.stroke();
      c.fillStyle = COUL.panneau; c.fillRect(micro[0] - 4, YT - 4, 24, 4);
      O.microDessus(c, micro[0], micro[1], -90 + Math.atan2(bouche[1] - micro[1], micro[0] - bouche[0]) * 180 / Math.PI * -1, COUL.jaune, 0.8);
      O.ecrire(c, "micro", micro[0] + 18, micro[1] - 14, { s: 13, c: COUL.jaune });
    }
    // impulsions qui voyagent (même départ, la réflexion arrive plus tard)
    const periode = (rr + 0.25) / VANIM + 0.7, u = (temps % periode) * VANIM;
    [[[[0, hs], [d, h]], COUL.ciel, rd], [[[0, hs], [d * hs / (hs + h), 0], [d, h]], COUL.orange, rr]].forEach(t => {
      const q = lePlong(t[0], u);
      if (q) {
        const px = P(q[0], q[1]);
        const g = c.createRadialGradient(px[0], px[1], 0, px[0], px[1], 14);
        g.addColorStop(0, t[1]); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.beginPath(); c.arc(px[0], px[1], 14, 0, 7); c.fill();
      } else if (u - t[2] < 0.12) {
        c.strokeStyle = t[1]; c.lineWidth = 2; c.beginPath(); c.arc(micro[0], micro[1], 10 + (u - t[2]) * 160, 0, 7); c.stroke();
      }
    });
    O.ecrire(c, "direct : " + O.metres(rd), 24, 64, { s: 14, c: COUL.ciel });
    O.ecrire(c, "réfléchi : " + O.metres(rr) + "  (+ " + O.metres(delta) + ")", 24, 86, { s: 14, c: COUL.orange });

    // --- Courbe de réponse ---
    const X0 = 540, X1 = 975, Y0 = 70, Y1 = 330, VH = 8, VB = -24;
    const xf = f => O.log(f, 20, 20000, X0, X1), yv = v => Y0 + (VH - O.borne(v, VB, VH)) / (VH - VB) * (Y1 - Y0);
    O.ecrire(c, "Réponse du micro (dB, Hz)", X0, 34, { s: 16 });
    [6, 0, -6, -12, -18].forEach(v => { c.fillStyle = v === 0 ? "rgba(255,255,255,.25)" : v === 6 ? "rgba(48,209,88,.35)" : COUL.grille; c.fillRect(X0, yv(v), X1 - X0, 1); O.ecrire(c, O.signe(v, 0), X0 - 8, yv(v), { s: 13, g: false, c: COUL.doux, a: "right", b: "middle" }); });
    [[20, "20"], [100, "100"], [500, "500"], [1000, "1 k"], [5000, "5 k"], [20000, "20 k"]].forEach(q => { c.fillStyle = COUL.grille; c.fillRect(xf(q[0]), Y0, 1, Y1 - Y0); O.ecrire(c, q[1], xf(q[0]), Y1 + 18, { s: 13, g: false, c: COUL.doux, a: "center" }); });
    O.ecrire(c, "+6 dB : pression doublée", X1 - 4, yv(6) - 6, { s: 13, c: COUL.vert, a: "right" });
    O.ecrire(c, "0 dB : son direct seul", X1 - 4, yv(0) + 16, { s: 13, g: false, c: COUL.doux, a: "right" });
    c.strokeStyle = COUL.jaune; c.lineWidth = 2.4; c.beginPath();
    for (let i = 0; i <= 700; i++) { const f = 20 * Math.pow(1000, i / 700), y = yv(rep(f)); i ? c.lineTo(xf(f), y) : c.moveTo(xf(f), y); }
    c.stroke();
    // repères des creux
    const liste = [];
    for (let k = 0; k < 40; k++) { const f = (2 * k + 1) * f1; if (f > 20000) break; liste.push(f); }
    liste.forEach((f, i) => { if (i < 14) { c.fillStyle = COUL.orange; c.beginPath(); c.moveTo(xf(f), Y1 - 2); c.lineTo(xf(f) - 5, Y1 + 6); c.lineTo(xf(f) + 5, Y1 + 6); c.closePath(); c.fill(); } });
    // calcul écrit sous la courbe
    O.ecrire(c, "Δ = " + O.metres(rr) + " − " + O.metres(rd) + " = " + O.metres(delta), X0, 380, { s: 15 });
    O.ecrire(c, "τ = Δ / c = " + (tau >= 1e-3 ? O.nb(tau * 1000, 2) + " ms" : O.nb(tau * 1e6, 0) + " µs"), X0, 408, { s: 15 });
    O.ecrire(c, liste.length ? "creux : " + liste.slice(0, 4).map(O.hz).join(" · ") + (liste.length > 4 ? " …" : "") : "premier creux : " + O.hz(f1) + " (inaudible)", X0, 436, { s: 15, c: COUL.orange });
    O.ecrire(c, "réflexion : a = ρ × rd / rr = " + O.nb(a, 2) + "  →  de " + O.db(creux, 0) + " à " + O.db(bosse, 1), X0, 464, { s: 15, g: false });

    // Explication et calcul
    let cls, msg;
    if (f1 > 20000) { cls = "note ok"; msg = "<b>Aucun creux audible.</b> Le premier creux tombe à " + O.hz(f1) + ", au-delà de 20 kHz : le direct et la réflexion s’additionnent en phase sur toute la bande, d’où " + O.db(bosse, 1) + (rho > 0.95 ? " (le doublement de pression d’un micro de surface)." : "."); }
    else if (a < 0.45) { cls = "note ok"; msg = "<b>Réflexion faible</b> (a = " + O.nb(a, 2) + ") : les creux ne descendent qu’à " + O.db(creux, 1) + ". Un revêtement absorbant sur la table atténue le filtre en peigne."; }
    else { cls = "note warn"; msg = "<b>Filtre en peigne.</b> Creux à " + O.hz(f1) + ", " + O.hz(3 * f1) + ", " + O.hz(5 * f1) + "… profonds de " + O.db(creux, 0) + " : la voix sonne creuse, métallique. Solutions : un micro de surface posé sur la table, ou une table absorbante."; }
    O.note("m6b-msg", cls, msg);
    O.html("m6b-calc",
      '<div><span class="c">rd = √(d² + (hs − h)²)</span> = ' + O.metres(rd) + "</div>" +
      '<div><span class="c">rr = √(d² + (hs + h)²)</span> = ' + O.metres(rr) + "</div>" +
      '<div><span class="c">τ = (rr − rd) / c</span> = ' + O.nb(delta, 4) + " / 343 = " + (tau >= 1e-3 ? O.nb(tau * 1000, 3) + " ms" : O.nb(tau * 1e6, 1) + " µs") + "</div>" +
      '<div><span class="c">f0 = 1 / (2τ)</span> = <b>' + O.hz(f1) + "</b></div>");
  }

  const boucle = O.boucle(cv, (dt, t) => { temps = t; dessiner(); });
  O.boutonPause("m6b-pause", boucle);
  [cH, cD, cHs, cR].forEach(el => el.addEventListener("input", dessiner));
  O.situations("m6b-situ", s => {
    if (s === "pied") { cR.value = 0.9; O.curseur(cH, O.posLog(0.25, HMIN, HMAX)); }
    else if (s === "bas") { cR.value = 0.9; O.curseur(cH, O.posLog(0.06, HMIN, HMAX)); }
    else if (s === "surface") { cR.value = 1; O.curseur(cH, O.posLog(0.003, HMIN, HMAX)); }
    else if (s === "tapis") O.curseur(cR, 0.3);
  });
  dessiner();
});

/* ==========================================================================
   MODULE 7 — LIAISONS ET ALIMENTATIONS
   ========================================================================== */

/* --- Labo 1 : symétrique contre asymétrique ---------------------------------
   Signal micro fixe : −50 dBu. Le câble capte un parasite de mode commun dont
   le niveau croît avec la longueur (tension induite ∝ longueur : +20 log(L/10)).
   Symétrique : chaud = s/2 + h, froid = −s/2 + h, sortie = s + h·10^(−TRMC/20).
   Asymétrique : conducteur = s + h, blindage = 0, sortie = s + h. */
labo(7, function () {
  const cv = O.el("m7a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const SIG = -50;
  let type = "sym";
  const eP = O.el("m7a-p"), eL = O.el("m7a-l"), eT = O.el("m7a-t");
  const longueur = () => O.valLog(+eL.value, 1, 200);
  let t = 0;

  function niveaux() {
    const L = longueur(), P = +eP.value + 20 * Math.log10(L / 10), T = +eT.value;
    const res = type === "sym" ? P - T : P;
    return { L, P, T, res, sb: SIG - res };
  }

  function scope(x, y, w, h, titre, f, ech, couleur, sous) {
    c.fillStyle = COUL.panneau; O.rect(c, x, y, w, h, 12); c.fill();
    O.ecrire(c, titre, x + 12, y + 22, { s: 14 });
    if (sous) O.ecrire(c, sous, x + w - 12, y + 22, { s: 12, g: false, c: COUL.doux, a: "right" });
    const y0 = y + 36 + (h - 46) / 2, amp = (h - 56) / 2;
    c.strokeStyle = COUL.grille; c.lineWidth = 1;
    for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(x + k * w / 8, y + 36); c.lineTo(x + k * w / 8, y + h - 10); c.stroke(); }
    c.strokeStyle = COUL.trait; c.beginPath(); c.moveTo(x + 8, y0); c.lineTo(x + w - 8, y0); c.stroke();
    c.save(); c.beginPath(); c.rect(x + 4, y + 34, w - 8, h - 42); c.clip();
    c.strokeStyle = couleur; c.lineWidth = 2.2; c.beginPath();
    for (let i = 0; i <= w - 16; i += 2) {
      const tt = t + i / (w - 16) * 0.04; // fenêtre de 40 ms
      const v = f(tt) * ech;
      const py = y0 - O.borne(v, -1.6, 1.6) * amp;
      i ? c.lineTo(x + 8 + i, py) : c.moveTo(x + 8 + i, py);
    }
    c.stroke(); c.restore();
  }

  function dessiner() {
    const n = niveaux();
    const r = Math.pow(10, (n.P - SIG) / 20);            // parasite / signal (amplitudes)
    const rs = Math.pow(10, (n.res - SIG) / 20);
    const ech = 1 / Math.max(1, r * 1.35);               // même échelle pour les trois écrans
    const s = tt => Math.sin(2 * Math.PI * 250 * tt);
    const h = tt => r * (Math.sin(2 * Math.PI * 50 * tt) + 0.3 * Math.sin(2 * Math.PI * 150 * tt + 0.6)) / 1.2;
    const hRes = tt => rs * (Math.sin(2 * Math.PI * 50 * tt) + 0.3 * Math.sin(2 * Math.PI * 150 * tt + 0.6)) / 1.2;

    O.fond(c);
    // --- la scène : micro, câble, transformateur
    const yC = 120;
    // transformateur
    c.fillStyle = "#3a3a3c"; O.rect(c, 445, 14, 110, 50, 8); c.fill();
    c.strokeStyle = COUL.cuivre; c.lineWidth = 3;
    for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(468 + k * 13, 39, 7, Math.PI * 0.1, Math.PI * 1.9); c.stroke(); }
    O.ecrire(c, "Transformateur (50 Hz)", 565, 34, { s: 13, c: COUL.jaune });
    O.ecrire(c, "parasite : " + O.nb(n.P, 0).replace("-", "−") + " dBu capté", 565, 54, { s: 12, g: false, c: COUL.doux });
    // champ rayonné (arcs qui s'éloignent)
    const intens = O.borne((n.P + 90) / 70, 0.15, 1);
    for (let k = 0; k < 4; k++) {
      const rad = ((t * 50 * 3 + k * 0.25) % 1) * 90 + 20;
      c.strokeStyle = "rgba(255,214,10," + (intens * (1 - (rad - 20) / 90) * 0.8).toFixed(3) + ")"; c.lineWidth = 2;
      c.beginPath(); c.arc(500, 64, rad, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    }
    // micro
    c.fillStyle = "#c7c7cc"; O.rect(c, 20, yC - 18, 70, 36, 18); c.fill();
    c.fillStyle = "#3a3a3c"; O.rect(c, 70, yC - 12, 40, 24, 4); c.fill();
    O.ecrire(c, "Micro", 55, yC + 44, { s: 13, a: "center" });
    O.ecrire(c, "signal : −50 dBu", 55, yC + 62, { s: 11, g: false, c: COUL.doux, a: "center" });
    // console
    c.fillStyle = "#2c2c2e"; O.rect(c, 860, yC - 50, 120, 100, 12); c.fill();
    O.ecrire(c, type === "sym" ? "Entrée" : "Entrée", 920, yC - 18, { s: 13, a: "center" });
    O.ecrire(c, type === "sym" ? "différentielle" : "simple", 920, yC + 2, { s: 12, g: false, c: COUL.doux, a: "center" });
    O.ecrire(c, type === "sym" ? "chaud − froid" : "pointe − masse", 920, yC + 24, { s: 12, c: COUL.vert, a: "center", m: true });
    // gaine et blindage
    c.fillStyle = "rgba(142,142,147,.16)"; O.rect(c, 110, yC - 22, 750, 44, 22); c.fill();
    c.strokeStyle = "rgba(142,142,147,.6)"; c.setLineDash([5, 4]); c.lineWidth = 1.5; O.rect(c, 110, yC - 22, 750, 44, 22); c.stroke(); c.setLineDash([]);
    O.ecrire(c, "blindage relié à la masse · " + O.metres(n.L), 485, yC + 44, { s: 12, g: false, c: COUL.doux, a: "center" });
    if (type === "sym") {
      [[COUL.rose, 1], [COUL.bleu, -1]].forEach(p => {
        c.strokeStyle = p[0]; c.lineWidth = 3; c.beginPath();
        for (let x = 110; x <= 860; x += 3) { const y = yC + p[1] * 9 * Math.cos((x - 110) / 750 * Math.PI * 22); x === 110 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke();
      });
      O.ecrire(c, "chaud (2)", 120, yC - 30, { s: 12, c: COUL.rose });
      O.ecrire(c, "froid (3)", 220, yC - 30, { s: 12, c: COUL.bleu });
    } else {
      c.strokeStyle = COUL.rose; c.lineWidth = 3; c.beginPath(); c.moveTo(110, yC); c.lineTo(860, yC); c.stroke();
      O.ecrire(c, "pointe (signal)", 120, yC - 30, { s: 12, c: COUL.rose });
    }
    // --- les oscilloscopes
    const y = 236, hS = 290, w = 305;
    if (type === "sym") {
      scope(15, y, w, hS, "Point chaud (2)", tt => s(tt) / 2 + h(tt), ech, COUL.rose, "+s/2 + parasite");
      scope(347, y, w, hS, "Point froid (3)", tt => -s(tt) / 2 + h(tt), ech, COUL.bleu, "−s/2 + parasite");
      scope(680, y, w, hS, "Sortie : chaud − froid", tt => s(tt) + hRes(tt), ech, COUL.vert, "s + reste");
    } else {
      scope(15, y, w, hS, "Pointe", tt => s(tt) + h(tt), ech, COUL.rose, "s + parasite");
      scope(347, y, w, hS, "Blindage (masse)", () => 0, ech, "#8e8e93", "référence 0 V");
      scope(680, y, w, hS, "Sortie : pointe − masse", tt => s(tt) + h(tt), ech, COUL.vert, "s + parasite");
    }
    O.ecrire(c, "Écrans : 40 ms, même échelle verticale pour les trois · signal à 250 Hz, parasite à 50 Hz et 150 Hz", 500, Hc - 4, { s: 11, g: false, c: COUL.doux, a: "center" });

    // --- valeurs
    Application.afficher("#m7a-po", O.nb(+eP.value, 0).replace("-", "−") + " dBu");
    Application.afficher("#m7a-lo", O.metres(n.L));
    Application.afficher("#m7a-to", O.nb(n.T, 0) + " dB");
    Application.afficher("#m7a-sig", "−50 dBu");
    Application.afficher("#m7a-par", O.nb(n.P, 1).replace("-", "−") + " dBu");
    Application.afficher("#m7a-res", O.nb(n.res, 1).replace("-", "−") + " dBu");
    Application.afficher("#m7a-sb", O.db(n.sb, 0));
    O.el("m7a-ligne-t").style.opacity = type === "sym" ? 1 : 0.4;
    O.el("m7a-t").disabled = type !== "sym";

    O.html("m7a-calc",
      '<div><span class="c">Parasite capté = parasite pour 10 m + 20 log(L / 10)</span></div>' +
      "<div>= " + O.nb(+eP.value, 0).replace("-", "−") + " + 20 log(" + O.nb(n.L, 1) + " / 10) = <b>" + O.nb(n.P, 1).replace("-", "−") + " dBu</b></div>" +
      (type === "sym"
        ? '<div><span class="c">Reste en sortie = parasite capté − TRMC</span></div><div>= ' + O.nb(n.P, 1).replace("-", "−") + " − " + n.T + " = <b>" + O.nb(n.res, 1).replace("-", "−") + " dBu</b></div>"
        : '<div><span class="c">Asymétrique : rien ne retire le parasite</span></div><div>Reste en sortie = <b>' + O.nb(n.res, 1).replace("-", "−") + " dBu</b></div>") +
      '<div><span class="c">Signal / parasite = −50 − (' + O.nb(n.res, 1).replace("-", "−") + ")</span></div><div>= <b>" + O.db(n.sb, 1) + "</b></div>");

    let cl, txt;
    if (type === "asym") {
      cl = n.sb < 40 ? "note bad" : n.sb < 60 ? "note warn" : "note ok";
      txt = n.sb < 40 ? "<b>Le parasite s’entend nettement.</b> Il est sur le seul conducteur de signal : l’entrée ne peut pas le distinguer de la voix. Passez en symétrique." :
        n.sb < 60 ? "<b>Ronflement audible dans les silences.</b> En asymétrique, la seule défense est un câble court, loin des sources de parasites." :
        "<b>Acceptable ici</b>, parce que le câble est court ou loin du parasite. Allongez-le : le parasite grandit avec la longueur et rien ne l’enlève.";
    } else {
      cl = n.sb < 40 ? "note bad" : n.sb < 60 ? "note warn" : "note ok";
      txt = n.sb < 60 ? "<b>Le TRMC est trop faible pour ce parasite.</b> L’entrée retire " + n.T + " dB du parasite de mode commun, cela ne suffit pas. Une entrée mal équilibrée (ou un câble abîmé) perd sa réjection." :
        "<b>Le parasite est le même sur le chaud et sur le froid.</b> Regardez les deux premiers écrans : il domine parfois le signal. La soustraction l’efface, le signal reste : " + O.db(n.sb, 0) + " de rapport signal / parasite.";
    }
    O.note("m7a-msg", cl, txt);
  }

  const anim = O.boucle(cv, dt => { t += dt * 0.05; dessiner(); }); // 20 fois ralenti
  O.boutonPause("m7a-pause", anim);
  const seg = Application.segment("#m7a-type", [["sym", "Symétrique"], ["asym", "Asymétrique"]], "sym", v => { type = v; dessiner(); });
  [eP, eL, eT].forEach(e => e.addEventListener("input", dessiner));
  O.situations("m7a-situ", s => {
    const S = { court: ["sym", -60, 5, 70], scene: ["sym", -40, 80, 70], jack: ["asym", -55, 10, 70], abime: ["sym", -45, 30, 30] }[s];
    seg.choisir(S[0]); type = S[0];
    eP.value = S[1]; eL.value = O.posLog(S[2], 1, 200); eT.value = S[3];
    [eP, eL, eT].forEach(e => e.dispatchEvent(new Event("input", { bubbles: true })));
  });
  eL.value = O.posLog(20, 1, 200);
  dessiner();
});

/* --- Labo 2 : XLR et alimentations -------------------------------------------
   Tensions continues mesurées par rapport à la broche 1.
   Fantôme (P48, P24, P12) : U0 sur 2 et 3 à travers deux résistances R ;
     U_micro = U0 − I × R / 2 (MICRO.fantome).
   T12 : 12 V entre 2 et 3 à travers 2 × 180 Ω (différentiel).
   Bobine d'un micro dynamique (ou secondaire du transformateur d'un ruban) :
   ≈ 300 Ω, ordre de grandeur pour les calculs.
   Câble défectueux : broche 3 en court-circuit avec la masse. */
labo(7, function () {
  const cv = O.el("m7b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  let alim = "p48", micro = "stat", t = 0, pinChoisie = null;
  const eC = O.el("m7b-c"), eD = O.el("m7b-def");
  const ALIM = { aucune: null, p48: { U: 48, R: 6.8, nom: "P48" }, p24: { U: 24, R: 1.2, nom: "P24" }, p12: { U: 12, R: 0.68, nom: "P12" }, t12: { U: 12, R: 0.18, nom: "T12" }, pip: { nom: "Plug-in power" } };
  const RB = 0.3; // kΩ : bobine ou transformateur (ordre de grandeur)
  const NOMS = { stat: "Micro statique", dyn: "Micro dynamique", rub: "Ruban passif", elec: "Électret" };
  // Face de l'embase mâle du micro (en haut) et de la fiche femelle du câble (en bas, en miroir)
  const FACES = [
    { cx: 105, cy: 150, titre: "Embase mâle du micro", pins: { 1: [-26, -16], 2: [26, -16], 3: [0, 28] } },
    { cx: 105, cy: 380, titre: "Fiche femelle du câble", pins: { 1: [26, -16], 2: [-26, -16], 3: [0, 28] } }
  ];
  const ROLE = {
    1: "<b>Broche 1 : la masse.</b> Elle est reliée au blindage du câble. Elle sert de référence aux tensions et de retour au courant de l’alimentation fantôme. Elle ne transporte pas le signal.",
    2: "<b>Broche 2 : le point chaud (+).</b> Elle porte le signal en phase. En fantôme, elle reçoit aussi le +48 V à travers une résistance de 6,8 kΩ.",
    3: "<b>Broche 3 : le point froid (−).</b> Elle porte le signal en opposition (ou la même impédance sans signal). En fantôme, elle reçoit le même +48 V que la broche 2 : c’est du mode commun."
  };

  function etat() {
    const A = ALIM[alim], I0 = +eC.value, def = eD.checked;
    const e = { u2: null, u3: null, u23: null, um: null, I: 0, chemin: "aucun", cl: "note ok", msg: "", couleurs: true };
    const besoin = micro === "stat" || micro === "elec";
    if (!A) {
      e.u2 = 0; e.u3 = 0; e.u23 = 0; e.um = 0;
      if (besoin) { e.cl = "note bad"; e.msg = "<b>Aucune alimentation : silence.</b> " + (micro === "stat" ? "La capsule n’est pas polarisée et l’électronique interne est éteinte." : "Le transistor de l’électret n’est pas alimenté (sauf pile intégrée).") + " Activez le fantôme."; }
      else { e.msg = "<b>Rien à alimenter.</b> " + (micro === "dyn" ? "Un micro dynamique fabrique sa tension seul (induction)." : "Un ruban passif fabrique sa tension seul ; sans fantôme, aucun risque au branchement.") + " C’est la situation idéale."; }
      return e;
    }
    if (alim === "pip") {
      e.pip = true;
      if (micro === "elec") { e.I = 0.5; e.um = 3.5; e.chemin = "pip"; e.msg = "<b>C’est son usage normal.</b> Les quelques volts (≈ 3 à 5 V) de la prise mini-jack alimentent le transistor de l’électret."; }
      else if (micro === "stat") { e.cl = "note bad"; e.msg = "<b>Ne fonctionne pas.</b> Un micro statique à polarisation externe a besoin de l’alimentation fantôme : le plug-in power n’en est pas une."; }
      else if (micro === "dyn") { e.cl = "note warn"; e.msg = "<b>Inutile.</b> Un micro dynamique n’a pas besoin d’alimentation ; une petite tension continue arriverait sur sa bobine. Coupez le plug-in power si l’appareil le permet."; }
      else { e.cl = "note bad"; e.msg = "<b>À éviter.</b> Branchez un ruban passif sur une entrée XLR, sans alimentation."; }
      return e;
    }
    if (alim === "t12") {
      e.u2 = null; e.u3 = null;
      if (micro === "dyn" || micro === "rub") {
        e.I = A.U / (2 * A.R + RB); e.u23 = e.I * RB; e.um = e.u23; e.chemin = "t12";
        e.cl = "note bad"; e.msg = "<b>Danger : courant continu dans " + (micro === "dyn" ? "la bobine" : "le transformateur") + ".</b> Le T12 met 12 V entre 2 et 3 : environ " + O.nb(e.I, 0) + " mA traversent " + (micro === "dyn" ? "la bobine, qui décale la membrane et chauffe." : "le transformateur ; l’impulsion peut abîmer le ruban.") + " Seuls les micros prévus pour le T12 (repérés « T ») s’y branchent.";
      } else {
        e.u23 = A.U; e.cl = "note bad"; e.msg = "<b>Incompatible.</b> Ce micro attend du fantôme (même tension sur 2 et 3) ; le T12 met une tension <b>entre</b> 2 et 3. Il ne fonctionne pas : ne le branchez pas ainsi.";
      }
      return e;
    }
    // Fantôme P48, P24, P12
    if (besoin) {
      if (def) {
        e.I = I0; e.u3 = 0; e.u2 = Math.max(0, A.U - I0 * A.R); e.u23 = e.u2; e.um = e.u2; e.chemin = "def";
        e.cl = "note bad"; e.msg = "<b>Point froid en court-circuit avec la masse.</b> Tout le courant passe par une seule résistance : la tension chute à " + O.nb(e.um, 1) + " V et la liaison n’est plus symétrique (parasites, craquements).";
      } else {
        e.I = I0; e.um = MICRO.fantome(A.U, A.R, I0); e.u2 = e.u3 = e.um; e.u23 = 0; e.chemin = "fantome";
        if (alim === "p48") { e.msg = "<b>Même tension sur 2 et 3 : " + O.nb(e.um, 1) + " V.</b> Entre 2 et 3, il n’y a aucune tension continue : le signal ne voit pas l’alimentation. Montez la consommation : la chute dans les 3,4 kΩ grandit."; }
        else { e.cl = "note warn"; e.msg = "<b>" + A.nom + " : " + O.nb(e.um, 1) + " V au micro.</b> " + (micro === "stat" ? "Un micro statique ne fonctionne en " + A.nom + " que si sa fiche technique accepte cette alimentation." : "L’adaptateur de l’électret doit accepter cette alimentation (voir sa fiche).") ; }
      }
    } else {
      if (def) {
        e.I = A.U / (A.R + RB); e.u3 = 0; e.u2 = e.I * RB; e.u23 = e.u2; e.um = e.u23; e.chemin = "defb";
        e.cl = "note bad"; e.msg = "<b>Câble défectueux : le fantôme n’est plus en mode commun.</b> Environ " + O.nb(e.I, 1) + " mA traversent " + (micro === "dyn" ? "la bobine" : "le transformateur du ruban, et l’impulsion peut étirer le ruban") + ". Coupez le fantôme avant de brancher ou débrancher, toujours pour un ruban passif.";
      } else {
        e.I = 0; e.u2 = e.u3 = A.U; e.u23 = 0; e.um = 0; e.chemin = "aucun";
        e.cl = micro === "rub" ? "note warn" : "note ok";
        e.msg = micro === "dyn" ? "<b>Aucun courant ne traverse la bobine.</b> Ses deux extrémités sont à " + A.U + " V : la différence est nulle. Le fantôme ne gêne pas un micro dynamique symétrique."
          : "<b>Sans danger tant que le câble est sain.</b> Mais un défaut ou un branchement à chaud déséquilibre les deux conducteurs : cochez « câble défectueux ». Prudence : coupez le fantôme avant de brancher un ruban passif.";
      }
    }
    return e;
  }

  function fil(y, couleur, x0, x1) { c.strokeStyle = couleur; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  function resistance(x, y, w, couleur, label) {
    c.fillStyle = COUL.fond; c.fillRect(x, y - 10, w, 20);
    c.strokeStyle = couleur; c.lineWidth = 2; c.strokeRect(x, y - 10, w, 20);
    O.ecrire(c, label, x + w / 2, y - 16, { s: 12, c: couleur, a: "center" });
  }
  function points(chemin, vitesse) {
    if (!chemin.length || vitesse <= 0) return;
    // longueur totale
    let L = 0; const seg = [];
    for (let i = 1; i < chemin.length; i++) { const d = Math.hypot(chemin[i][0] - chemin[i - 1][0], chemin[i][1] - chemin[i - 1][1]); seg.push(d); L += d; }
    c.fillStyle = COUL.jaune;
    for (let k = 0; k < L; k += 34) {
      let s = (k + t * vitesse) % L, i = 0;
      while (s > seg[i]) { s -= seg[i]; i++; }
      const a = chemin[i], b = chemin[i + 1], f = s / seg[i];
      c.beginPath(); c.arc(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 3.5, 0, Math.PI * 2); c.fill();
    }
  }

  function dessiner() {
    const e = etat(), A = ALIM[alim];
    O.fond(c);
    // --- faces XLR
    FACES.forEach(F => {
      c.fillStyle = "#1c1c1e"; c.beginPath(); c.arc(F.cx, F.cy, 62, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 2; c.stroke();
      c.fillStyle = "#3a3a3c"; c.fillRect(F.cx - 8, F.cy - 66, 16, 12); // détrompeur
      [1, 2, 3].forEach(p => {
        const x = F.cx + F.pins[p][0], y = F.cy + F.pins[p][1];
        const col = p === 1 ? "#8e8e93" : p === 2 ? COUL.rose : COUL.bleu;
        c.fillStyle = col; c.beginPath(); c.arc(x, y, pinChoisie === p ? 15 : 12, 0, Math.PI * 2); c.fill();
        if (F.cy > 300) { c.fillStyle = "#000"; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill(); }
        O.ecrire(c, String(p), x, y - (F.cy > 300 ? 18 : 0), { s: 13, c: F.cy > 300 ? col : "#000", a: "center", b: "middle" });
      });
      O.ecrire(c, F.titre, F.cx, F.cy + 86, { s: 12, a: "center" });
    });
    O.ecrire(c, "vue de face, schématique", 105, 500, { s: 11, g: false, c: COUL.doux, a: "center" });

    // --- schéma : micro (x 250–400), câble, console (x 640–980)
    const yy = { 2: 190, 3: 270, 1: 350 }, xm0 = 250, xm1 = 400, xc0 = 640, xc1 = 985;
    c.fillStyle = "#2c2c2e"; O.rect(c, xm0, 140, xm1 - xm0, 250, 14); c.fill();
    O.ecrire(c, NOMS[micro], (xm0 + xm1) / 2, 132, { s: 14, a: "center" });
    // contenu du micro
    c.strokeStyle = COUL.texte; c.lineWidth = 2;
    if (micro === "dyn" || micro === "rub") {
      // bobine (ou transformateur) entre 2 et 3, flottante
      c.beginPath(); c.moveTo(xm1, yy[2]); c.lineTo(330, yy[2]); c.lineTo(330, 205); c.stroke();
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(330, 212 + k * 12, 6, -Math.PI / 2, Math.PI / 2); c.stroke(); }
      c.beginPath(); c.moveTo(330, 255); c.lineTo(330, yy[3]); c.lineTo(xm1, yy[3]); c.stroke();
      O.ecrire(c, micro === "dyn" ? "bobine" : "transfo.", 300, 235, { s: 12, g: false, c: COUL.doux, a: "right" });
      O.ecrire(c, micro === "dyn" ? "flottante" : "+ ruban", 300, 251, { s: 12, g: false, c: COUL.doux, a: "right" });
      O.ecrire(c, "broche 1 : boîtier", 325, 375, { s: 11, g: false, c: COUL.doux, a: "center" });
    } else {
      c.fillStyle = "#1c1c1e"; O.rect(c, 268, 200, 92, 120, 10); c.fill(); c.strokeStyle = COUL.trait; c.stroke();
      O.ecrire(c, micro === "stat" ? "capsule" : "électret", 314, 240, { s: 12, a: "center" });
      O.ecrire(c, micro === "stat" ? "+ électronique" : "+ transistor", 314, 258, { s: 12, g: false, c: COUL.doux, a: "center" });
      O.ecrire(c, "alimentée", 314, 284, { s: 12, g: false, c: e.um > 0 ? COUL.vert : COUL.rouge, a: "center" });
      O.ecrire(c, e.um > 0 ? "oui" : "non", 314, 302, { s: 13, c: e.um > 0 ? COUL.vert : COUL.rouge, a: "center" });
      c.strokeStyle = COUL.texte; c.lineWidth = 2;
      c.beginPath(); c.moveTo(xm1, yy[2]); c.lineTo(360, yy[2]); c.lineTo(360, 210); c.stroke();
      c.beginPath(); c.moveTo(xm1, yy[3]); c.lineTo(360, yy[3]); c.stroke();
      c.beginPath(); c.moveTo(xm1, yy[1]); c.lineTo(314, yy[1]); c.lineTo(314, 320); c.stroke();
    }
    // conducteurs
    if (e.pip) {
      fil(220, COUL.rose, xm1, xc0); fil(330, "#8e8e93", xm1, xc0);
      O.ecrire(c, "pointe", 520, 210, { s: 12, c: COUL.rose, a: "center" });
      O.ecrire(c, "corps (masse)", 520, 320, { s: 12, c: COUL.doux, a: "center" });
      O.ecrire(c, "Prise mini-jack 3,5 mm : pas d’XLR ici", 520, 420, { s: 13, c: COUL.jaune, a: "center" });
    } else {
      fil(yy[2], COUL.rose, xm1, xc0); fil(yy[3], COUL.bleu, xm1, xc0); fil(yy[1], "#8e8e93", xm1, xc0);
      if (eD.checked && alim !== "t12") { // court-circuit froid → masse
        c.strokeStyle = COUL.rouge; c.lineWidth = 4; c.beginPath(); c.moveTo(520, yy[3]); c.lineTo(520, yy[1]); c.stroke();
        O.ecrire(c, "court-circuit", 528, (yy[3] + yy[1]) / 2, { s: 12, c: COUL.rouge });
      }
      [[2, "chaud"], [3, "froid"], [1, "masse"]].forEach(p => O.ecrire(c, p[0] + " · " + p[1], 430, yy[p[0]] - 10, { s: 12, c: p[0] === 1 ? COUL.doux : p[0] === 2 ? COUL.rose : COUL.bleu }));
      // tensions
      const v = (u) => u === null ? "flottant" : O.nb(u, 1) + " V";
      if (alim !== "t12") {
        O.ecrire(c, v(e.u2), 600, yy[2] - 10, { s: 13, m: true, a: "right" });
        O.ecrire(c, v(e.u3), 600, yy[3] - 10, { s: 13, m: true, a: "right" });
        O.ecrire(c, "0 V", 600, yy[1] - 10, { s: 13, m: true, a: "right" });
      } else {
        O.ecrire(c, "2 → 3 : " + O.nb(e.u23, 1) + " V", 600, (yy[2] + yy[3]) / 2 + 4, { s: 13, m: true, a: "right", c: COUL.orange });
      }
    }
    // console
    c.fillStyle = "#1c1c1e"; O.rect(c, xc0, 120, xc1 - xc0, 300, 14); c.fill(); c.strokeStyle = COUL.trait; c.lineWidth = 1; c.stroke();
    O.ecrire(c, "Console" + (A ? " · " + A.nom : " · sans alimentation"), (xc0 + xc1) / 2, 112, { s: 14, a: "center" });
    if (A && A.U && alim !== "t12") {
      const lab = O.nb(A.R >= 1 ? A.R : A.R * 1000, 1) + (A.R >= 1 ? " kΩ" : " Ω");
      fil(yy[2], COUL.rose, xc0, 720); fil(yy[3], COUL.bleu, xc0, 720);
      resistance(720, yy[2], 80, COUL.jaune, lab); resistance(720, yy[3], 80, COUL.jaune, lab);
      c.strokeStyle = COUL.jaune; c.lineWidth = 3; c.beginPath(); c.moveTo(800, yy[2]); c.lineTo(850, yy[2]); c.lineTo(850, yy[3]); c.lineTo(800, yy[3]); c.stroke();
      c.beginPath(); c.moveTo(850, 230); c.lineTo(900, 230); c.stroke();
      c.fillStyle = COUL.jaune; O.rect(c, 900, 212, 70, 36, 8); c.fill();
      O.ecrire(c, "+" + A.U + " V", 935, 230, { s: 14, c: "#000", a: "center", b: "middle" });
      fil(yy[1], "#8e8e93", xc0, 935); c.strokeStyle = "#8e8e93"; c.lineWidth = 3; c.beginPath(); c.moveTo(935, yy[1]); c.lineTo(935, 248); c.stroke();
      O.ecrire(c, "retour par la masse", 790, yy[1] + 22, { s: 12, g: false, c: COUL.doux, a: "center" });
    } else if (alim === "t12") {
      fil(yy[2], COUL.rose, xc0, 720); fil(yy[3], COUL.bleu, xc0, 720); fil(yy[1], "#8e8e93", xc0, 760);
      resistance(720, yy[2], 70, COUL.orange, "180 Ω"); resistance(720, yy[3], 70, COUL.orange, "180 Ω");
      c.strokeStyle = COUL.orange; c.lineWidth = 3; c.beginPath(); c.moveTo(790, yy[2]); c.lineTo(880, yy[2]); c.lineTo(880, 214); c.moveTo(880, 246); c.lineTo(880, yy[3]); c.lineTo(790, yy[3]); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(860, 214); c.lineTo(900, 214); c.stroke(); c.lineWidth = 2; c.beginPath(); c.moveTo(868, 246); c.lineTo(892, 246); c.stroke();
      O.ecrire(c, "12 V", 908, 234, { s: 14, c: COUL.orange });
      O.ecrire(c, "entre 2 et 3", 812, 300, { s: 12, g: false, c: COUL.orange, a: "center" });
    } else if (alim === "pip") {
      fil(220, COUL.rose, xc0, 720); resistance(720, 220, 80, COUL.jaune, "quelques kΩ");
      c.strokeStyle = COUL.jaune; c.lineWidth = 3; c.beginPath(); c.moveTo(800, 220); c.lineTo(880, 220); c.stroke();
      c.fillStyle = COUL.jaune; O.rect(c, 880, 202, 90, 36, 8); c.fill();
      O.ecrire(c, "≈ 3 à 5 V", 925, 220, { s: 13, c: "#000", a: "center", b: "middle" });
      fil(330, "#8e8e93", xc0, 925); c.strokeStyle = "#8e8e93"; c.lineWidth = 3; c.beginPath(); c.moveTo(925, 330); c.lineTo(925, 238); c.stroke();
    } else {
      fil(yy[2], COUL.rose, xc0, 760); fil(yy[3], COUL.bleu, xc0, 760); fil(yy[1], "#8e8e93", xc0, 760);
      O.ecrire(c, "préampli", 860, 274, { s: 14, a: "center" });
      c.strokeStyle = COUL.trait; c.lineWidth = 2; c.beginPath(); c.moveTo(760, 170); c.lineTo(760, 370); c.lineTo(950, 270); c.closePath(); c.stroke();
    }
    // trajet du courant (points jaunes, vitesse ∝ courant)
    const vit = 18 * Math.sqrt(e.I);
    if (e.chemin === "fantome") {
      points([[900, 230], [850, 230], [850, yy[2]], [xm1, yy[2]], [360, yy[2]]], vit / 2);
      points([[900, 230], [850, 230], [850, yy[3]], [xm1, yy[3]], [360, yy[3]]], vit / 2);
      points([[314, yy[1]], [935, yy[1]], [935, 248]], vit);
    } else if (e.chemin === "def") {
      points([[900, 230], [850, 230], [850, yy[2]], [xm1, yy[2]], [360, yy[2]]], vit);
      points([[314, yy[1]], [935, yy[1]], [935, 248]], vit);
    } else if (e.chemin === "defb") {
      points([[900, 230], [850, 230], [850, yy[2]], [330, yy[2]], [330, yy[3]], [520, yy[3]], [520, yy[1]], [935, yy[1]], [935, 248]], vit);
    } else if (e.chemin === "t12") {
      points([[880, 214], [880, yy[2]], [330, yy[2]], [330, yy[3]], [880, yy[3]], [880, 246]], vit);
    } else if (e.chemin === "pip") {
      points([[880, 220], [xm1, 220], [360, 220]], vit * 2);
      points([[xm1, 330], [925, 330], [925, 238]], vit * 2);
    }

    // --- valeurs
    const v = u => u === null ? "—" : O.nb(u, 1) + " V";
    Application.afficher("#m7b-co", O.nb(+eC.value, 1) + " mA");
    Application.afficher("#m7b-u2", e.pip ? "—" : alim === "t12" ? "flottante" : v(e.u2));
    Application.afficher("#m7b-u3", e.pip ? "—" : alim === "t12" ? "flottante" : v(e.u3));
    Application.afficher("#m7b-u23", e.pip ? "—" : v(e.u23));
    Application.afficher("#m7b-um", e.um === null ? "—" : O.nb(e.um, 1) + " V");
    Application.afficher("#m7b-i", O.nb(e.I, 1) + " mA");
    const conso = micro === "stat" || micro === "elec";
    O.el("m7b-ligne-i").style.display = conso ? "" : "none";
    O.note("m7b-msg", e.cl, e.msg + (e.chemin === "fantome" && alim === "p48" ? " <br><span class=\"muted small\">U = 48 − " + O.nb(e.I, 1) + " × 3,4 = " + O.nb(e.um, 1) + " V</span>" : ""));
  }

  cv.addEventListener("click", ev => {
    const p = O.clic(cv, ev);
    FACES.forEach(F => [1, 2, 3].forEach(k => {
      if (Math.hypot(p[0] - F.cx - F.pins[k][0], p[1] - F.cy - F.pins[k][1]) < 20) { pinChoisie = k; O.note("m7b-pin", "note", ROLE[k]); dessiner(); }
    }));
  });
  const anim = O.boucle(cv, dt => { t += dt; dessiner(); });
  O.boutonPause("m7b-pause", anim);
  Application.segment("#m7b-alim", [["aucune", "Aucune"], ["p48", "P48"], ["p24", "P24"], ["p12", "P12"], ["t12", "T12"], ["pip", "Plug-in"]], "p48", v => { alim = v; dessiner(); });
  Application.segment("#m7b-micro", [["stat", "Statique"], ["dyn", "Dynamique"], ["rub", "Ruban"], ["elec", "Électret"]], "stat", v => { micro = v; if (v === "elec" && +eC.value > 3) O.curseur(eC, 1); dessiner(); });
  eC.addEventListener("input", dessiner); eD.addEventListener("change", dessiner);
  dessiner();
});

/* --- Labo 3 : l'échelle des niveaux --------------------------------------- */
labo(7, function () {
  const cv = O.el("m7c-cv"), c = cv.getContext("2d"), W = cv.width;
  const eL = O.el("m7c-l");
  const X = L => O.borne(60 + (L + 80) / 104 * 880, 60, 940);
  function dessiner() {
    const L = +eL.value, U = MICRO.voltsDbu(L), Lv = MICRO.dbvU(U);
    O.fond(c);
    const y = 200;
    // zones
    const zone = (a, b, coul, txt, ty) => { c.fillStyle = coul; O.rect(c, X(a), y - 40, X(b) - X(a), 30, 8); c.fill(); O.ecrire(c, txt, (X(a) + X(b)) / 2, y - 50 - (ty || 0), { s: 13, a: "center" }); };
    zone(-70, -20, "rgba(255,159,10,.55)", "Niveau micro (≈ −70 à −20 dBu)");
    zone(-12, 8, "rgba(10,132,255,.55)", "Niveau ligne", 0);
    // règle dBu
    c.strokeStyle = COUL.texte; c.lineWidth = 2; c.beginPath(); c.moveTo(60, y); c.lineTo(940, y); c.stroke();
    for (let l = -80; l <= 24; l += 4) {
      const x = X(l), grand = l % 20 === 0;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + (grand ? 12 : 6)); c.stroke();
      if (grand) O.ecrire(c, O.signe(l, 0), x, y + 28, { s: 12, g: false, c: COUL.doux, a: "center" });
    }
    O.ecrire(c, "dBu", 950, y + 5, { s: 12, c: COUL.doux });
    // règle dBV (décalée de 2,2 dB)
    const y2 = y + 90;
    c.strokeStyle = COUL.doux; c.lineWidth = 1.5; c.beginPath(); c.moveTo(60, y2); c.lineTo(940, y2); c.stroke();
    for (let l = -80; l <= 20; l += 20) { const x = X(l + 2.21); c.beginPath(); c.moveTo(x, y2); c.lineTo(x, y2 + 10); c.stroke(); O.ecrire(c, O.signe(l, 0), x, y2 + 26, { s: 12, g: false, c: COUL.doux, a: "center" }); }
    O.ecrire(c, "dBV", 950, y2 + 5, { s: 12, c: COUL.doux });
    // volts
    const y3 = y2 + 90;
    c.beginPath(); c.moveTo(60, y3); c.lineTo(940, y3); c.stroke();
    [0.0001, 0.001, 0.01, 0.1, 1, 10].forEach(u => { const x = X(MICRO.dbu(u)); c.beginPath(); c.moveTo(x, y3); c.lineTo(x, y3 + 10); c.stroke(); O.ecrire(c, O.volts(u), x, y3 + 26, { s: 12, g: false, c: COUL.doux, a: "center" }); });
    O.ecrire(c, "volts", 950, y3 + 5, { s: 12, c: COUL.doux });
    // repères
    [[4, "+4 dBu", COUL.vert, 1], [-7.79, "−10 dBV", COUL.ciel, 1], [18, "+18 dBu : pleine échelle (EBU R68)", COUL.rose, 0], [0, "0 dBu = 0,775 V", COUL.doux, 2]].forEach(r => {
      const x = X(r[0]);
      c.strokeStyle = r[2]; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 66 + r[3] * 20); c.lineTo(x, y3); c.stroke(); c.setLineDash([]);
      O.ecrire(c, r[1], x + (r[0] > 10 ? -4 : 4), 62 + r[3] * 20, { s: 12, c: r[2], a: r[0] > 10 ? "right" : "left" });
    });
    // le niveau choisi
    const x = X(L);
    c.fillStyle = COUL.jaune; c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x - 10, y - 20); c.lineTo(x + 10, y - 20); c.closePath(); c.fill();
    c.strokeStyle = COUL.jaune; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y3); c.stroke();
    [[y, O.nb(L, 1).replace("-", "−") + " dBu"], [y2, O.nb(Lv, 1).replace("-", "−") + " dBV"], [y3, O.volts(U)]].forEach(p => {
      const txt = p[1]; c.font = O.police(13, true); const w = c.measureText(txt).width + 14;
      const bx = O.borne(x + 8, 60, 940 - w);
      c.fillStyle = COUL.jaune; O.rect(c, bx, p[0] + 34, w, 22, 6); c.fill();
      O.ecrire(c, txt, bx + 7, p[0] + 50, { s: 13, c: "#000" });
    });
    // valeurs
    Application.afficher("#m7c-lo", O.signe(L, 1) + " dBu");
    Application.afficher("#m7c-dbu", O.signe(L, 1) + " dBu");
    Application.afficher("#m7c-dbv", O.signe(Lv, 1) + " dBV");
    Application.afficher("#m7c-v", O.volts(U));
    Application.afficher("#m7c-ecart", O.db(L - 4, 1));
    O.html("m7c-calc", '<div><span class="c">U = 0,775 × 10^(L / 20)</span></div><div>= 0,775 × 10^(' + O.nb(L, 1).replace("-", "−") + " / 20) = <b>" + O.volts(U) + "</b></div>" +
      '<div><span class="c">L(dBV) = L(dBu) − 2,2</span></div><div>= ' + O.nb(L, 1).replace("-", "−") + " − 2,2 = <b>" + O.nb(Lv, 1).replace("-", "−") + " dBV</b></div>");
    let cl = "note ok", txt;
    if (L < -20) txt = "<b>Niveau micro.</b> Il faut un préamplificateur de " + O.nb(4 - L, 0) + " dB pour atteindre le niveau ligne de +4 dBu. C’est ce signal fragile que la liaison symétrique protège.";
    else if (L < -12) { cl = "note warn"; txt = "<b>Entre micro et ligne.</b> Un micro très sensible devant une source forte peut sortir à ce niveau : pensez au commutateur d’atténuation (pad)."; }
    else if (L <= 8) txt = "<b>Niveau ligne.</b> +4 dBu (1,228 V) en professionnel, −10 dBV (0,316 V, soit −7,8 dBu) en grand public : environ 11,8 dB d’écart.";
    else { cl = L > 18 ? "note bad" : "note warn"; txt = L > 18 ? "<b>Au-delà de +18 dBu.</b> Avec un alignement EBU R68, un convertisseur numérique écrêterait ici." : "<b>Niveau élevé.</b> Il reste peu de marge avant la pleine échelle numérique de +18 dBu (EBU R68)."; }
    O.note("m7c-msg", cl, txt);
  }
  eL.addEventListener("input", dessiner);
  O.situations("m7c-situ", s => O.curseur(eL, { dyn: -60, stat: -40, gp: -7.8, pro: 4 }[s]));
  dessiner();
});

/* ==========================================================================
   MODULE 8 — COUPLES STÉRÉOPHONIQUES
   Angles : 0° = axe du couple (vers la scène), positif à DROITE.
   Micro gauche orienté à −angle/2, micro droit à +angle/2, écartés de d.
   Source lointaine (champ lointain) :
     ΔL = 20 log(|r_D(θ)| / |r_G(θ)|),  r = A + B·cos(θ − axe)
     Δt = d·sin θ / c
   Modèle de localisation du labo (simplifié, linéaire) :
     décalage = ΔL / 13 dB + Δt / 1 ms, plafonné à 100 %.
   Les seuils (13 dB, 1 ms) sont dans les fourchettes publiées (12 à 18 dB,
   1 à 1,5 ms) et choisis pour retrouver les angles de prise de son publiés :
   ORTF ≈ 96°, NOS ≈ 81° (le labo donne 96° et 83°).
   Blumlein : la valeur usuelle de 90° est géométrique (à ±45°, la source
   n'est plus que dans une voie) ; avec un seuil de 13 dB, le modèle atteint
   l'enceinte avant (≈ 65°). Le labo le dit dans son explication.
   ========================================================================== */
(function () {
const STEREO = {
  L100: 13, T100: 1,
  gain: (A, axe, th) => A + (1 - A) * Math.cos((th - axe) * Math.PI / 180),
  dL(cp, th) {
    const gD = Math.abs(STEREO.gain(cp.A, cp.ang / 2, th)), gG = Math.abs(STEREO.gain(cp.A, -cp.ang / 2, th));
    return O.borne(20 * Math.log10(Math.max(gD, 1e-4) / Math.max(gG, 1e-4)), -60, 60);
  },
  dT: (cp, th) => cp.d * Math.sin(th * Math.PI / 180) / MICRO.c * 1000,
  decalage(cp, th) { return O.borne(STEREO.dL(cp, th) / STEREO.L100 + STEREO.dT(cp, th) / STEREO.T100, -1, 1); },
  brut(cp, th) { return STEREO.dL(cp, th) / STEREO.L100 + STEREO.dT(cp, th) / STEREO.T100; },
  // Angle de prise de son : 2 × le plus petit angle où le décalage atteint 100 %
  // (recherche pas à pas puis par dichotomie). null si jamais atteint avant 90°.
  angle(cp) {
    let a = 0, b = null;
    for (let th = 0.25; th <= 90; th += 0.25) { if (STEREO.brut(cp, th) >= 1) { b = th; a = th - 0.25; break; } }
    if (b === null) return null;
    for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (STEREO.brut(cp, m) >= 1) b = m; else a = m; }
    return 2 * b;
  }
};

/* --- Labo 1 : plan de scène ---------------------------------------------- */
labo(8, function () {
  const cv = O.el("m8a-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const PRESETS = {
    xy: { A: 0.5, ang: 90, d: 0, nom: "XY" }, blum: { A: 0, ang: 90, d: 0, nom: "Blumlein" },
    ab: { A: 1, ang: 0, d: 50, nom: "AB" }, ortf: { A: 0.5, ang: 110, d: 17, nom: "ORTF" },
    nos: { A: 0.5, ang: 90, d: 30, nom: "NOS" }, din: { A: 0.5, ang: 90, d: 20, nom: "DIN" }
  };
  const eDir = O.el("m8a-dir"), eAng = O.el("m8a-ang"), eD = O.el("m8a-d"), eW = O.el("m8a-w");
  O.options(eDir, DIRECTIVITES.map(d => [d.A, d.nom]), 0.5);
  let couple = "ortf", soliste = 25, t = 0;
  const INSTR = [["Violons", COUL.ciel], ["Altos", COUL.vert], ["Bois", COUL.violet], ["Cuivres", COUL.orange], ["Violoncelles", COUL.rose]];
  const affiche = {}; // positions perçues lissées (animation)
  const CX = 310, CY = 470, RS = 330;           // couple et rayon de la scène
  const SPK = { g: [690, 90], d: [950, 90], e: [820, 315] };

  const cp = () => ({ A: +eDir.value, ang: +eAng.value, d: +eD.value / 100 });
  const xImage = s => (SPK.g[0] + SPK.d[0]) / 2 + s * (SPK.d[0] - SPK.g[0]) / 2;
  const lisser = (k, v, dt) => { if (affiche[k] === undefined || O.reduit()) affiche[k] = v; affiche[k] += (v - affiche[k]) * Math.min(1, dt * 8); return affiche[k]; };

  function dessiner(dt) {
    dt = dt || 1;
    const p = cp(), ra = STEREO.angle(p), w = +eW.value;
    O.fond(c);
    // ---------- la scène
    O.ecrire(c, "Scène vue de dessus", 20, 28, { s: 14 });
    O.ecrire(c, "faites glisser le soliste", 20, 48, { s: 12, g: false, c: COUL.doux });
    // angle de prise de son (secteur)
    c.save();
    const demi = ra === null ? 90 : ra / 2;
    c.fillStyle = ra === null ? "rgba(255,214,10,.06)" : "rgba(255,214,10,.13)";
    c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, 420, -Math.PI / 2 - demi * Math.PI / 180, -Math.PI / 2 + demi * Math.PI / 180); c.closePath(); c.fill();
    if (ra !== null) {
      c.strokeStyle = COUL.jaune; c.setLineDash([6, 5]); c.lineWidth = 1.5;
      [-1, 1].forEach(k => { const a = k * demi * Math.PI / 180; c.beginPath(); c.moveTo(CX, CY); c.lineTo(CX + 420 * Math.sin(a), CY - 420 * Math.cos(a)); c.stroke(); });
      c.setLineDash([]);
      O.ecrire(c, "angle de prise de son : " + O.nb(ra, 0) + "°", CX, 76, { s: 13, c: COUL.jaune, a: "center" });
    } else O.ecrire(c, "angle de prise de son > 180°", CX, 76, { s: 13, c: COUL.jaune, a: "center" });
    c.restore();
    // arc de la scène
    c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 26; c.lineCap = "round";
    c.beginPath(); c.arc(CX, CY, RS, -Math.PI / 2 - w / 2 * Math.PI / 180, -Math.PI / 2 + w / 2 * Math.PI / 180); c.stroke(); c.lineCap = "butt";
    // instruments
    const pos = INSTR.map((ins, i) => {
      const th = -w / 2 + w * i / (INSTR.length - 1), a = th * Math.PI / 180;
      const x = CX + RS * Math.sin(a), y = CY - RS * Math.cos(a);
      c.fillStyle = ins[1]; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
      O.ecrire(c, ins[0], x, y - 18, { s: 12, c: ins[1], a: "center" });
      return th;
    });
    // soliste
    const as = soliste * Math.PI / 180, rsol = RS * 0.62;
    const xs = CX + rsol * Math.sin(as), ys = CY - rsol * Math.cos(as);
    const pulse = 1 + 0.15 * Math.sin(t * 4);
    c.fillStyle = "rgba(255,214,10,.25)"; c.beginPath(); c.arc(xs, ys, 20 * pulse, 0, Math.PI * 2); c.fill();
    c.fillStyle = COUL.jaune; c.beginPath(); c.arc(xs, ys, 11, 0, Math.PI * 2); c.fill();
    O.ecrire(c, "Soliste", xs, ys + 28, { s: 12, c: COUL.jaune, a: "center" });
    c.strokeStyle = "rgba(255,214,10,.4)"; c.setLineDash([3, 4]); c.lineWidth = 1; c.beginPath(); c.moveTo(CX, CY); c.lineTo(xs, ys); c.stroke(); c.setLineDash([]);
    // le couple : directivités et micros (écartement exagéré pour la lisibilité)
    const ecart = p.d > 0 ? Math.min(70, 8 + p.d * 60) : 0;
    [[-1, COUL.ciel], [1, COUL.orange]].forEach(m => {
      const axe = m[0] * p.ang / 2, x = CX + m[0] * ecart;
      O.polaireCourbe(c, x, CY, 48, a => STEREO.gain(p.A, axe, a), { couleur: m[1], largeur: 1.6 });
      O.microDessus(c, x, CY, axe, m[1], 0.8);
    });
    if (p.d > 0) O.ecrire(c, O.nb(p.d * 100, 0) + " cm (non à l’échelle)", CX, CY + 62, { s: 11, g: false, c: COUL.doux, a: "center" });
    O.ecrire(c, "G", CX - ecart - 26, CY + 40, { s: 13, c: COUL.ciel, a: "center" });
    O.ecrire(c, "D", CX + ecart + 26, CY + 40, { s: 13, c: COUL.orange, a: "center" });

    // ---------- l'écoute
    c.fillStyle = COUL.panneau; O.rect(c, 640, 20, 350, 505, 14); c.fill();
    O.ecrire(c, "Ce qu’entend l’auditeur", 660, 46, { s: 14 });
    c.strokeStyle = "rgba(255,255,255,.2)"; c.setLineDash([4, 4]); c.lineWidth = 1;
    c.beginPath(); c.moveTo(SPK.g[0], SPK.g[1]); c.lineTo(SPK.e[0], SPK.e[1]); c.lineTo(SPK.d[0], SPK.d[1]); c.stroke(); c.setLineDash([]);
    [SPK.g, SPK.d].forEach((s, i) => {
      c.fillStyle = "#3a3a3c"; O.rect(c, s[0] - 18, s[1] - 22, 36, 44, 6); c.fill();
      c.fillStyle = "#8e8e93"; c.beginPath(); c.arc(s[0], s[1] + 6, 10, 0, Math.PI * 2); c.fill();
      O.ecrire(c, i ? "D" : "G", s[0], s[1] - 30, { s: 13, a: "center", c: i ? COUL.orange : COUL.ciel });
    });
    c.fillStyle = COUL.texte; c.beginPath(); c.arc(SPK.e[0], SPK.e[1], 13, 0, Math.PI * 2); c.fill();
    O.ecrire(c, "±30°", SPK.e[0], SPK.e[1] + 34, { s: 12, g: false, c: COUL.doux, a: "center" });
    // base stéréo et images
    c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 2; c.beginPath(); c.moveTo(SPK.g[0], 140); c.lineTo(SPK.d[0], 140); c.stroke();
    pos.forEach((th, i) => {
      const s = lisser("i" + i, STEREO.decalage(p, th), dt), x = xImage(s), y = 160 + i * 18;
      c.strokeStyle = "rgba(255,255,255,.08)"; c.beginPath(); c.moveTo(SPK.g[0], y); c.lineTo(SPK.d[0], y); c.stroke();
      c.fillStyle = INSTR[i][1]; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
    });
    const ss = STEREO.decalage(p, soliste), sl = lisser("sol", ss, dt), xsl = xImage(sl);
    c.fillStyle = "rgba(255,214,10,.25)"; c.beginPath(); c.arc(xsl, 140, 16 * pulse, 0, Math.PI * 2); c.fill();
    c.fillStyle = COUL.jaune; c.beginPath(); c.arc(xsl, 140, 9, 0, Math.PI * 2); c.fill();
    // contributions ΔL et Δt
    const l = STEREO.dL(p, soliste), dtm = STEREO.dT(p, soliste), pl = l / STEREO.L100, pt = dtm / STEREO.T100;
    const yb = 380, x0 = 660, wb = 310;
    O.ecrire(c, "Soliste : d’où vient le décalage ?", x0, yb - 14, { s: 13 });
    const barre = (y, v, coul, txt) => {
      c.fillStyle = "rgba(255,255,255,.07)"; c.fillRect(x0, y, wb, 18);
      const mid = x0 + wb / 2, lg = O.borne(v, -1, 1) * wb / 2;
      c.fillStyle = coul; c.fillRect(Math.min(mid, mid + lg), y, Math.abs(lg), 18);
      c.fillStyle = COUL.texte; c.fillRect(mid - 1, y - 3, 2, 24);
      O.ecrire(c, txt, x0, y + 36, { s: 12, g: false, c: COUL.doux });
    };
    barre(yb, pl, COUL.ciel, "niveau : ΔL / 13 dB = " + O.signe(pl * 100, 0) + " %");
    barre(yb + 56, pt, COUL.violet, "temps : Δt / 1 ms = " + O.signe(pt * 100, 0) + " %");
    O.ecrire(c, "total (plafonné) : " + O.signe(ss * 100, 0) + " %", x0, yb + 126, { s: 13, c: COUL.jaune });

    // ---------- valeurs
    Application.afficher("#m8a-ango", O.nb(p.ang, 0) + "°");
    Application.afficher("#m8a-do", O.nb(p.d * 100, 0) + " cm");
    Application.afficher("#m8a-wo", O.nb(w, 0) + "°");
    Application.afficher("#m8a-dl", O.signe(l, 1) + " dB");
    Application.afficher("#m8a-dt", O.signe(dtm, 2) + " ms");
    Application.afficher("#m8a-dec", O.signe(ss * 100, 0) + " %");
    Application.afficher("#m8a-apds", ra === null ? "> 180°" : O.nb(ra, 0) + "°");
    const gD = STEREO.gain(p.A, p.ang / 2, soliste), gG = STEREO.gain(p.A, -p.ang / 2, soliste);
    O.html("m8a-calc",
      '<div><span class="c">Soliste à θ = ' + O.signe(soliste, 0) + "°</span></div>" +
      '<div><span class="c">r<sub>D</sub> = A + B cos(θ − ' + O.nb(p.ang / 2, 0) + "°) = </span>" + O.nb(gD, 3).replace("-", "−") + "</div>" +
      '<div><span class="c">r<sub>G</sub> = A + B cos(θ + ' + O.nb(p.ang / 2, 0) + "°) = </span>" + O.nb(gG, 3).replace("-", "−") + "</div>" +
      "<div>ΔL = 20 log(|r<sub>D</sub>| / |r<sub>G</sub>|) = <b>" + O.signe(l, 1) + " dB</b></div>" +
      "<div>Δt = d sin θ / c = " + O.nb(p.d, 2) + " × " + O.nb(Math.sin(soliste * Math.PI / 180), 3).replace("-", "−") + " / 343 = <b>" + O.signe(dtm, 3) + " ms</b></div>" +
      "<div>décalage = " + O.nb(l, 1).replace("-", "−") + " / 13 + " + O.nb(dtm, 3).replace("-", "−") + " / 1 = <b>" + O.signe(ss * 100, 0) + " %</b></div>");

    let cl = "note ok", txt;
    const inverse = gD * gG < 0;
    if (ra !== null && w > ra + 10) { cl = "note warn"; txt = "<b>La scène (" + O.nb(w, 0) + "°) est plus large que l’angle de prise de son (" + O.nb(ra, 0) + "°).</b> Les instruments des bords s’entassent sur les enceintes. Reculez le couple (la scène paraît moins large) ou resserrez les micros."; }
    else if (ra === null || w < ra - 35) { cl = "note warn"; txt = "<b>La scène est bien plus étroite que l’angle de prise de son.</b> Les instruments restent groupés au centre : l’image est étroite. Rapprochez le couple, ou ouvrez l’angle (ou l’écartement) des micros."; }
    else txt = "<b>La scène remplit la base stéréo.</b> L’angle de prise de son (" + O.nb(ra, 0) + "°) correspond à la largeur de la scène (" + O.nb(w, 0) + "°) : les instruments s’étalent d’une enceinte à l’autre.";
    if (p.A === 0 && p.d === 0 && Math.abs(p.ang - 90) < 1) txt += " <b>Blumlein :</b> la valeur usuelle de 90° est géométrique (à ±45°, la source n’est plus que dans une voie). Avec le seuil de 13 dB du modèle, l’image touche l’enceinte un peu avant, d’où " + O.nb(ra, 0) + "°.";
    if (inverse) { cl = "note warn"; txt += " <b>Attention :</b> le soliste est dans le lobe arrière d’un des huit, les deux voies sont en opposition de polarité."; }
    txt += p.d === 0 ? " Couple coïncident : Δt = 0, compatible mono." : " Couple espacé de " + O.nb(p.d * 100, 0) + " cm : en mono, filtre en peigne (premier creux à " + (Math.abs(dtm) > 0.01 ? O.hz(1000 / (2 * Math.abs(dtm))) : "—") + " pour le soliste).";
    txt += ' <span class="muted small">Modèle du labo : décalage ≈ ΔL / 13 dB + Δt / 1 ms.</span>';
    O.note("m8a-msg", cl, txt);
  }

  function choisirCouple(v) {
    couple = v;
    if (PRESETS[v]) { const P = PRESETS[v]; eDir.value = P.A; eAng.value = P.ang; eD.value = P.d; [eAng, eD].forEach(e => e.dispatchEvent(new Event("input", { bubbles: true }))); couple = v; }
    dessiner();
  }
  const seg = Application.segment("#m8a-couple", [["xy", "XY"], ["blum", "Blumlein"], ["ab", "AB"], ["ortf", "ORTF"], ["nos", "NOS"], ["din", "DIN"], ["libre", "Libre"]], "ortf", v => { if (v !== "libre") choisirCouple(v); else { couple = "libre"; dessiner(); } });
  // Toucher un réglage passe en couple « libre »
  [eAng, eD].forEach(e => e.addEventListener("input", ev => { if (ev.isTrusted && couple !== "libre") { couple = "libre"; seg.choisir("libre"); } dessiner(); }));
  eDir.addEventListener("change", () => { if (couple !== "libre") { couple = "libre"; seg.choisir("libre"); } dessiner(); });
  eW.addEventListener("input", () => dessiner());
  O.glisser(cv, (x, y) => { if (x > 630) return; soliste = O.borne(Math.atan2(x - CX, CY - y) * 180 / Math.PI, -88, 88); dessiner(); });
  O.situations("m8a-situ", s => {
    if (s === "orch") O.curseur(eW, 140);
    if (s === "quat") O.curseur(eW, 60);
    if (s === "bord") { soliste = +eW.value / 2; dessiner(); }
  });
  const anim = O.boucle(cv, dt => { t += dt; dessiner(dt); });
  O.boutonPause("m8a-pause", anim);
  choisirCouple("ortf");
});

/* --- Labo 2 : le couple MS -------------------------------------------------
   M : A_M + B_M cos θ (vers la scène) ; S : bidirectionnel, lobe positif à
   GAUCHE : S(θ) = −g sin θ (θ positif à droite).
   G = M + S = A_M + B_M cos θ − g sin θ = A_M + R cos(θ + θmax)
   D = M − S = A_M + R cos(θ − θmax)
   avec R = √(B_M² + g²) et θmax = atan2(g, B_M).
   Chaque micro virtuel est donc un micro du premier ordre, de directivité
   A_eq = A_M / (A_M + R), orienté à ±θmax. */
labo(8, function () {
  const cv = O.el("m8b-cv"), c = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const eG = O.el("m8b-g");
  let AM = 0.5, t = 0;
  const NOMM = { 1: "omni", 0.5: "cardioïde", 0: "en huit" };

  function dessiner() {
    const g = +eG.value, BM = 1 - AM, R = Math.sqrt(BM * BM + g * g);
    const thmax = (BM === 0 && g === 0) ? 0 : Math.atan2(g, BM) * 180 / Math.PI;
    const Aeq = AM + R > 0 ? AM / (AM + R) : 0;
    const M = th => AM + BM * Math.cos(th * Math.PI / 180), S = th => -g * Math.sin(th * Math.PI / 180);
    const Lv = th => M(th) + S(th), Rv = th => M(th) - S(th);
    const ech = 1 / Math.max(1, AM + R, g);        // même échelle pour les deux diagrammes
    const src = O.reduit() ? -40 : ((t * 30) % 360) - 180;       // source qui fait le tour
    O.fond(c);
    const R0 = 165, C1 = [250, 285], C2 = [750, 285];
    O.ecrire(c, "Micros réels : M et S", C1[0], 40, { s: 15, a: "center" });
    O.ecrire(c, "Micros virtuels : G = M + S, D = M − S", C2[0], 40, { s: 15, a: "center" });
    [C1, C2].forEach(C => O.polaireGrille(c, C[0], C[1], R0));
    O.polaireCourbe(c, C1[0], C1[1], R0, a => M(a) * ech, { couleur: COUL.jaune, remplir: "rgba(255,214,10,.08)" });
    if (g > 0) O.polaireCourbe(c, C1[0], C1[1], R0, a => S(a) * ech, { couleur: COUL.violet });
    O.polaireCourbe(c, C2[0], C2[1], R0, a => Lv(a) * ech, { couleur: COUL.ciel, remplir: "rgba(100,210,255,.07)" });
    O.polaireCourbe(c, C2[0], C2[1], R0, a => Rv(a) * ech, { couleur: COUL.orange, remplir: "rgba(255,159,10,.07)" });
    // axes virtuels
    [[-thmax, COUL.ciel], [thmax, COUL.orange]].forEach(a => {
      const r = a[0] * Math.PI / 180;
      c.strokeStyle = a[1]; c.setLineDash([5, 5]); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(C2[0], C2[1]); c.lineTo(C2[0] + (R0 + 8) * Math.sin(r), C2[1] - (R0 + 8) * Math.cos(r)); c.stroke(); c.setLineDash([]);
    });
    O.microDessus(c, C1[0], C1[1], 0, COUL.jaune, 0.7);
    // légendes
    const leg = (x, y, coul, txt, tir) => { c.strokeStyle = coul; c.lineWidth = 3; c.setLineDash(tir ? [6, 4] : []); c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 20, y - 4); c.stroke(); c.setLineDash([]); O.ecrire(c, txt, x + 26, y, { s: 12, g: false }); };
    leg(30, 500, COUL.jaune, "M (" + NOMM[AM] + ")"); leg(170, 500, COUL.violet, "S (en huit)"); leg(290, 500, COUL.violet, "polarité inversée", true);
    leg(560, 500, COUL.ciel, "G (gauche)"); leg(690, 500, COUL.orange, "D (droite)");
    // la source qui tourne, et les niveaux des voies
    const rs = src * Math.PI / 180;
    [C1, C2].forEach(C => { c.fillStyle = COUL.texte; c.beginPath(); c.arc(C[0] + (R0 + 26) * Math.sin(rs), C[1] - (R0 + 26) * Math.cos(rs), 6, 0, Math.PI * 2); c.fill(); });
    const vG = Lv(src) * ech, vD = Rv(src) * ech;
    const bar = (x, v, coul, nom) => {
      const h = 120, y0 = 230;
      c.fillStyle = "rgba(255,255,255,.07)"; c.fillRect(x, y0 - h, 22, 2 * h);
      c.fillStyle = coul; const hh = O.borne(v, -1, 1) * h; c.fillRect(x, Math.min(y0, y0 - hh), 22, Math.abs(hh));
      c.fillStyle = COUL.texte; c.fillRect(x - 3, y0 - 1, 28, 2);
      O.ecrire(c, nom, x + 11, y0 + h + 18, { s: 12, a: "center", c: coul });
    };
    bar(940, vG, COUL.ciel, "G"); bar(970, vD, COUL.orange, "D");
    O.ecrire(c, "source", 955, 90, { s: 11, g: false, c: COUL.doux, a: "center" });
    O.ecrire(c, O.signe(src, 0) + "°", 955, 106, { s: 11, g: false, c: COUL.doux, a: "center" });

    // valeurs
    const proche = DIRECTIVITES.reduce((a, b) => Math.abs(b.A - Aeq) < Math.abs(a.A - Aeq) ? b : a);
    Application.afficher("#m8b-go", O.nb(g, 2));
    Application.afficher("#m8b-axes", g === 0 ? "confondus (0°)" : "±" + O.nb(thmax, 0) + "°");
    Application.afficher("#m8b-dir", "A ≈ " + O.nb(Aeq, 2));
    Application.afficher("#m8b-gdb", g === 0 ? "coupé" : O.db(20 * Math.log10(g), 1));
    Application.afficher("#m8b-mono", "G + D = 2M");
    O.html("m8b-calc",
      '<div><span class="c">G = M + S = A + B cos θ − g sin θ</span></div>' +
      '<div><span class="c">R = √(B² + g²) = √(' + O.nb(BM * BM, 3) + " + " + O.nb(g * g, 3) + ") = </span><b>" + O.nb(R, 3) + "</b></div>" +
      '<div><span class="c">θmax = atan(g / B) = </span><b>' + (BM === 0 ? (g ? "90" : "0") : O.nb(thmax, 1)) + "°</b></div>" +
      '<div><span class="c">A virtuel = A / (A + R) = ' + O.nb(AM, 2) + " / " + O.nb(AM + R, 3) + " = </span><b>" + O.nb(Aeq, 2) + "</b></div>");
    let cl = "note ok", txt;
    if (g === 0) { cl = "note warn"; txt = "<b>S est coupé : G = D = M.</b> Les deux voies sont identiques, l’image est mono, au centre. Montez le niveau de S."; }
    else if (AM === 0 && Math.abs(g - 1) < 0.02) txt = "<b>Équivalent Blumlein.</b> M en huit et S au même niveau : deux huit virtuels croisés à ±45°.";
    else txt = "<b>Deux micros virtuels " + (AM === 0 ? "en huit" : "proches de : " + proche.nom.toLowerCase()) + " (A ≈ " + O.nb(Aeq, 2) + "), orientés à ±" + O.nb(thmax, 0) + "°.</b> " + (thmax > 60 ? "L’image est très large." + (Aeq < 0.49 ? " Les lobes arrière, en polarité inversée, grandissent." : "") : thmax < 30 ? "L’image est étroite : peu de différence entre G et D." : "Une largeur courante.") + " En mono, G + D = 2M : S disparaît, rien ne s’annule.";
    O.note("m8b-msg", cl, txt);
  }
  Application.segment("#m8b-m", [["1", "Omni"], ["0.5", "Cardioïde"], ["0", "En huit"]], "0.5", v => { AM = +v; dessiner(); });
  const segM = O.el("m8b-m");
  eG.addEventListener("input", dessiner);
  O.situations("m8b-situ", s => {
    const P = { etroit: ["0.5", 0.25], xy: ["0.5", 0.5], blum: ["0", 1], large: ["0.5", 1] }[s];
    segM._choisir(P[0]); O.curseur(eG, P[1]);
  });
  const anim = O.boucle(cv, dt => { t += dt; dessiner(); });
  O.boutonPause("m8b-pause", anim);
  dessiner();
});
})();
