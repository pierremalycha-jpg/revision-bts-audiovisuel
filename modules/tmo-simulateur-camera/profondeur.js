/* ==========================================================================
   profondeur.js — la profondeur de champ en schéma : vue de côté, vue de dessus
   --------------------------------------------------------------------------
   Une fenêtre facultative. Le schéma classique des cours d'optique, mais
   vivant : la caméra à gauche, les distances en mètres, le champ (bleu), le
   plan net et la zone nette (vert). Chaque élément du décor est un trait à
   sa distance : vert s'il est dans la zone nette, orange s'il est un peu
   flou, gris s'il est très flou.

   Profondeur.dessiner(canvas, v, "cote" ou "dessus")
   ========================================================================== */

const Profondeur = (function () {
  "use strict";
  const POLICE = "600 10.5px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  // Les éléments montrés dans le schéma, et leur nom court.
  const ELEMENTS = [["plante", "Plante"], ["pupitre", "Pupitre"], ["presentatrice", "Sujet"], ["roue", "Roue"], ["etagere", "Étagère"], ["fond", "Fond"]];

  function dessiner(canvas, v, mode) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), l = canvas.clientWidth, h = canvas.clientHeight;
    if (!l || !h) return;
    if (canvas.width !== Math.round(l * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(l * dpr); canvas.height = Math.round(h * dpr); }
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, l, h);

    const camZ = Decor.SUJET_Z - v.distance, k = v.calc;
    const dMax = Decor.FOND_Z - camZ + 0.35, recul = mode === "cote" ? 0.95 : 0.6;
    const mg = 10, mb = 24;
    const ppm = Math.min((l - 2 * mg) / (dMax + recul), mode === "cote" ? (h - mb - 8) / 2.7 : 1e9);   // pixels par mètre
    const x0 = mg + recul * ppm;                                        // abscisse de la caméra
    const X = function (d) { return x0 + d * ppm; };
    const cp = Math.cos(v.pan), sp = Math.sin(v.pan);
    const flouDe = function (d) { return Optique.flou(k, Math.max(d, 0.05)) / k.c0; };   // 1 = limite de la netteté
    const teinte = function (d) { const f = flouDe(d); return f <= 1 ? "#30d158" : f <= 4 ? "#ff9f0a" : "#7d8694"; };
    c.font = POLICE; c.textBaseline = "middle";

    // Zone nette et plan net (communs aux deux vues)
    const yBas = h - mb, yHaut = 6;
    const pres = Math.min(k.pres, dMax), loin = Math.min(k.loin, dMax);
    const zoneNette = function () {
      if (isFinite(k.pres) && k.pres < dMax) { c.fillStyle = "rgba(48,209,88,.2)"; c.fillRect(X(pres), yHaut, X(loin) - X(pres), yBas - yHaut); }
      if (isFinite(k.distNette) && k.distNette < dMax) { c.strokeStyle = "#30d158"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(k.distNette), yHaut); c.lineTo(X(k.distNette), yBas); c.stroke(); }
    };
    // L'échelle des distances
    const echelle = function () {
      c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 1; c.beginPath(); c.moveTo(mg, yBas + 0.5); c.lineTo(l - mg, yBas + 0.5); c.stroke();
      c.textAlign = "center";
      for (let d = 0; d <= dMax; d++) {
        c.strokeStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.moveTo(X(d) + 0.5, yBas); c.lineTo(X(d) + 0.5, yBas + 4); c.stroke();
        if (d && (ppm > 30 || d % 2 === 0)) { c.fillStyle = "#8a93a3"; c.fillText(d + " m", X(d), yBas + 13); }
      }
    };

    if (mode === "cote") {
      /* ---------- VUE DE CÔTÉ : hauteur en fonction de la distance ---------- */
      const Y = function (y) { return yBas - y * ppm; };
      zoneNette();
      // Le champ vertical
      const demi = Math.atan(v.cfg.capteur.h / (2 * k.f));
      c.save(); c.beginPath(); c.rect(mg, yHaut, l - 2 * mg, yBas - yHaut); c.clip();
      c.beginPath(); c.moveTo(X(0), Y(Decor.CAM_Y)); c.lineTo(X(dMax), Y(Decor.CAM_Y + Math.tan(v.tilt + demi) * dMax)); c.lineTo(X(dMax), Y(Decor.CAM_Y + Math.tan(v.tilt - demi) * dMax)); c.closePath();
      c.fillStyle = "rgba(64,156,255,.16)"; c.fill(); c.strokeStyle = "rgba(64,156,255,.8)"; c.lineWidth = 1; c.stroke();
      // Les éléments : un trait vertical de leur hauteur
      ELEMENTS.forEach(function (e, i) {
        const q = Decor.calques.find(function (z) { return z.id === e[0]; });
        const d = (q.z - camZ) * cp + (q.x + q.l / 2) * sp;
        if (d < 0.25) return;
        const haut = Math.min(q.y + q.h, 2.6);
        c.strokeStyle = teinte(d); c.lineWidth = 4; c.lineCap = "round";
        c.beginPath(); c.moveTo(X(d), Y(q.y + 0.03)); c.lineTo(X(d), Y(haut)); c.stroke();
        c.fillStyle = "#dfe5ee"; c.textAlign = e[0] === "fond" ? "right" : "center";
        c.fillText(e[1], X(d) - (e[0] === "fond" ? 6 : 0), Y(haut) - 8 + (e[0] === "fond" ? 16 : 0));
      });
      c.restore();
      // La caméra, de profil, à l'échelle
      c.save(); c.translate(X(0), Y(Decor.CAM_Y)); c.scale(ppm, ppm);
      if (v.config === "plateau") Materiel.cameraPlateau(c, false); else Materiel.boitier(c, false);
      c.restore();
      echelle();
    } else {
      /* ---------- VUE DE DESSUS : largeur en fonction de la distance ---------- */
      const yAxe = (yHaut + yBas) / 2;
      // Un point du plateau, dans le repère de la caméra : profondeur le long de l'axe, écart latéral.
      const P = function (Xm, Zm) { const dz = Zm - camZ; return [X(dz * cp + Xm * sp), yAxe + (Xm * cp - dz * sp) * ppm]; };
      c.save(); c.beginPath(); c.rect(mg, yHaut, l - 2 * mg, yBas - yHaut); c.clip();
      const demi = Math.atan(v.cfg.capteur.l / (2 * k.f));
      // Le champ horizontal, et la zone nette limitée au champ
      c.beginPath(); c.moveTo(X(0), yAxe); c.lineTo(X(dMax), yAxe - Math.tan(demi) * dMax * ppm); c.lineTo(X(dMax), yAxe + Math.tan(demi) * dMax * ppm); c.closePath();
      c.fillStyle = "rgba(64,156,255,.14)"; c.fill(); c.strokeStyle = "rgba(64,156,255,.8)"; c.lineWidth = 1; c.stroke();
      c.save(); c.clip(); zoneNette(); c.restore();
      c.strokeStyle = "rgba(255,255,255,.14)"; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(X(0), yAxe); c.lineTo(X(dMax), yAxe); c.stroke(); c.setLineDash([]);
      // Les éléments : un trait de leur largeur
      ELEMENTS.forEach(function (e) {
        const q = Decor.calques.find(function (z) { return z.id === e[0]; });
        const a = P(q.x, q.z), b = P(q.x + q.l, q.z), d = (q.z - camZ) * cp + (q.x + q.l / 2) * sp;
        if (d < 0.25) return;
        c.strokeStyle = teinte(d); c.lineWidth = 4; c.lineCap = "round";
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        c.fillStyle = "#dfe5ee"; c.textAlign = "right";
        const m = a[1] < b[1] ? a : b;
        c.fillText(e[1], Math.min(a[0], b[0]) - 6, Math.max(yHaut + 8, Math.min(yBas - 8, e[0] === "fond" || e[0] === "pupitre" ? yAxe + (e[0] === "fond" ? -12 : 14) : m[1] + 2)));
      });
      c.restore();
      // La caméra vue de dessus : un boîtier et son objectif
      const e = Math.max(ppm, 26);
      c.fillStyle = "#3a3f49"; O.rr(c, X(0) - 0.34 * e, yAxe - 0.11 * e, 0.36 * e, 0.22 * e, 3); c.fill();
      c.fillStyle = "#14161a"; c.beginPath(); c.moveTo(X(0) + 0.02 * e, yAxe - 0.06 * e); c.lineTo(X(0) + 0.3 * e, yAxe - 0.085 * e); c.lineTo(X(0) + 0.3 * e, yAxe + 0.085 * e); c.lineTo(X(0) + 0.02 * e, yAxe + 0.06 * e); c.closePath(); c.fill();
      echelle();
    }
    // L'étiquette du plan net
    if (isFinite(k.distNette) && k.distNette < dMax) {
      const t = "net " + Optique.distance(k.distNette), w = c.measureText(t).width + 10, x = Math.min(l - mg - w, Math.max(mg, X(k.distNette) - w / 2));
      c.fillStyle = "#30d158"; O.rr(c, x, yHaut, w, 16, 8); c.fill();
      c.fillStyle = "#06240f"; c.textAlign = "left"; c.fillText(t, x + 5, yHaut + 8.5);
    }
  }
  const O = Decor.outils;

  // Une phrase qui résume les distances utiles.
  function resume(v) {
    const k = v.calc;
    if (!isFinite(k.distNette)) return "Le plan net est au-delà de l’infini : rien n’est net.";
    return "Plan net à <b>" + Optique.distance(k.distNette) + "</b> · zone nette de <b>" + Optique.distance(k.pres) + "</b> à <b>" + (isFinite(k.loin) ? Optique.distance(k.loin) : "∞") + "</b> · hyperfocale " + Optique.distance(k.hyperfocale);
  }

  return { dessiner: dessiner, resume: resume };
})();
