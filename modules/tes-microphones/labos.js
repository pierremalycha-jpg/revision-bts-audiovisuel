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


