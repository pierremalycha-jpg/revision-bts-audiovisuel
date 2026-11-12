/* ==========================================================================
   labos.js — les labos (étape « Manipuler ») de l'application
   « Capteurs d'image »
   --------------------------------------------------------------------------
   Le HTML de chaque labo est dans index.html, dans un <template data-labo="n">.
   Ici, on le fait vivre. Chaque labo est déclaré par :
       Application.labo(n, function () { … });
   La fonction est appelée UNE fois, au premier affichage du module.

   Règle commune (voir docs/CHARTE-APPLICATIONS.md) : UNE fonction dessiner()
   relit tous les réglages et redessine TOUT (scène, valeurs, explication).
   Les labos animés (modules 1, 3, 4, 5) ont un bouton Pause ou Rejouer, et
   s'arrêtent quand l'élève a demandé moins de mouvement.
   Les identifiants commencent par c + numéro du module (c1-…, c2-…).
   ========================================================================== */

/* Outils partagés par les labos de cette application */
const O = {
  el: id => document.getElementById(id),
  police(taille, gras) { return (gras ? "600 " : "500 ") + taille + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif'; },
  // Mouvement réduit demandé par l'élève : pas d'animation automatique.
  reduit() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; },
  // Un canvas est visible si son module est affiché (sinon, inutile de l'animer).
  visible(el) { return !!el && el.offsetParent !== null; },
  borne: (v, a, b) => Math.max(a, Math.min(b, v)),
  nb: (v, d) => Application.nombre(v, d),
  // Rectangle arrondi (repli pour les navigateurs anciens).
  rect(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  },
  // Tirage gaussien (bruit) : moyenne 0, écart type 1.
  gauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  // Pseudo-hasard reproductible : même graine → même valeur (positions des photons, des lumières…).
  alea(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); },
  // Texte sur plusieurs lignes, coupé à la largeur donnée.
  texte(c, txt, x, y, largeur, interligne) {
    const mots = txt.split(" "); let ligne = "";
    mots.forEach(m => { const essai = ligne ? ligne + " " + m : m; if (c.measureText(essai).width > largeur && ligne) { c.fillText(ligne, x, y); y += interligne; ligne = m; } else ligne = essai; });
    if (ligne) c.fillText(ligne, x, y);
    return y + interligne;
  },
  // Situations toutes prêtes : un clic sur une pastille appelle regler(clé).
  situations(id, regler) {
    O.el(id).addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) regler(b.dataset.s); });
  },
  // Fixe la valeur d'un curseur et met à jour son remplissage bleu.
  curseur(el, v) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }
};

/* ==========================================================================
   MODULE 1 — Du photon au nombre : exposer puis lire une ligne de photosites
   ========================================================================== */
Application.labo(1, function () {
  const cv = O.el("c1-cv"), ctx = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const FW = 20000, G = 40, K = 28000, N = 8;         // capacité (e⁻), gain de conversion (µV/e⁻), photons par lx·s
  const SCENE = [0.06, 0.12, 0.25, 0.5, 1, 0.75, 0.35, 0.18]; // part de lumière reçue par chaque photosite
  const rE = O.el("c1-e"), rQE = O.el("c1-qe");
  const X0 = 30, LW = 76, PAS = 98, PY = 196, PH = 132;  // géométrie des puits
  const wx = k => X0 + k * PAS;
  let t = 1 / 50, type = "cmos";
  let p = 1, q = 1, anim = null;                          // p : avancement de l'exposition, q : de la lecture

  function etat() {
    const E = +rE.value, QE = +rQE.value / 100;
    const ph = SCENE.map(s => s * K * E * t), brut = ph.map(n => n * QE), el = brut.map(n => Math.min(FW, n));
    return { E: E, QE: QE, ph: ph, brut: brut, el: el, sat: brut.filter(n => n >= FW).length };
  }
  const valeur = n => Math.round(Math.min(n, FW) / FW * 4095);

  function dessiner(maintenant) {
    const s = etat(), expose = !!anim && p < 1;
    Application.afficher("#c1-eo", s.E + " lx");
    Application.afficher("#c1-qeo", Math.round(s.QE * 100) + " %");

    ctx.fillStyle = "#0b0c0e"; ctx.fillRect(0, 0, W, Hc);
    ctx.textAlign = "left"; ctx.font = O.police(12, true); ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.fillText("LUMIÈRE DE LA SCÈNE", X0, 18);
    ctx.fillText("PHOTOSITES : LES ÉLECTRONS S’ACCUMULENT", X0, PY - 8);

    // 1. La scène : chaque case est plus ou moins éclairée
    SCENE.forEach((v, k) => {
      const g = Math.round(255 * Math.pow(O.borne(v * s.E / 60, 0, 1), 1 / 2.2));
      ctx.fillStyle = "rgb(" + g + "," + g + "," + Math.round(g * 0.92) + ")";
      O.rect(ctx, wx(k), 26, LW, 24, 6); ctx.fill();
      ctx.fillStyle = g > 140 ? "#111" : "rgba(255,255,255,.75)"; ctx.font = O.police(12, true); ctx.textAlign = "center";
      ctx.fillText(k + 1, wx(k) + LW / 2, 43);
    });

    // 2. Les photons : ils tombent pendant l'exposition (densité ∝ lumière × temps)
    for (let k = 0; k < N; k++) {
      const debit = SCENE[k] * s.E / 50 * (t * 50);
      const nb = Math.min(40, Math.round(debit * 14));
      for (let i = 0; i < nb; i++) {
        const a = O.alea(k * 131 + i * 7.3), b = O.alea(k * 17 + i * 3.1 + 5);
        const y = expose ? 60 + ((b * 124 + (maintenant || 0) * 0.17) % 124) : 60 + b * 124;
        ctx.globalAlpha = expose ? 0.95 : 0.28;
        ctx.fillStyle = "#ffd60a"; ctx.beginPath(); ctx.arc(wx(k) + 7 + a * (LW - 14), y, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // 3. Les puits (photosites) et leurs charges
    for (let k = 0; k < N; k++) {
      ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 2;
      O.rect(ctx, wx(k), PY, LW, PH, 8); ctx.stroke();
    }
    // Lecture CCD : les paquets de charges avancent vers la sortie unique (à droite).
    const decale = type === "ccd" ? q * (N + 0.9) : 0;
    const sortis = [];
    for (let k = 0; k < N; k++) {
      const charge = Math.min(FW, s.brut[k] * p), niveau = charge / FW;
      const x = wx(k) + decale * PAS;
      if (type === "ccd" && decale > N - 1 - k + 0.75) { sortis.push(k); continue; }
      if (niveau > 0) {
        const h = niveau * (PH - 8);
        const grad = ctx.createLinearGradient(0, PY + PH - h, 0, PY + PH);
        grad.addColorStop(0, "rgba(41,151,255,.95)"); grad.addColorStop(1, "rgba(41,151,255,.55)");
        ctx.fillStyle = grad; O.rect(ctx, x + 4, PY + PH - 4 - h, LW - 8, h, 5); ctx.fill();
        if (charge >= FW - 1) {
          ctx.fillStyle = "#ff453a"; ctx.fillRect(x + 4, PY + 4, LW - 8, 4);
          ctx.font = O.police(12, true); ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText("PLEIN", x + LW / 2, PY + 24);
        }
      }
      if (decale === 0) {
        ctx.font = O.police(12); ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.8)";
        ctx.fillText(O.nb(Math.round(charge), 0) + " e⁻", wx(k) + LW / 2, PY + PH + 17);
      }
    }

    // 4. La lecture
    ctx.textAlign = "left"; ctx.font = O.police(12, true); ctx.fillStyle = "rgba(255,255,255,.5)";
    if (type === "cmos") {
      ctx.fillText("CMOS : UN AMPLIFICATEUR PAR PHOTOSITE, UN CONVERTISSEUR (CAN) PAR COLONNE", X0, 462);
      for (let k = 0; k < N; k++) {
        const cx = wx(k) + LW / 2, actif = q > 0.08, conv = q > 0.45;
        ctx.strokeStyle = actif ? "#2997ff" : "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, PY + PH + 24); ctx.lineTo(cx, 364); ctx.stroke();
        ctx.fillStyle = actif ? "#2997ff" : "rgba(255,255,255,.25)";
        ctx.beginPath(); ctx.moveTo(cx - 13, 364); ctx.lineTo(cx + 13, 364); ctx.lineTo(cx, 381); ctx.closePath(); ctx.fill();
        ctx.fillStyle = conv ? "rgba(255,159,10,.9)" : "rgba(255,255,255,.12)";
        O.rect(ctx, cx - 28, 388, 56, 22, 6); ctx.fill();
        ctx.fillStyle = conv ? "#111" : "rgba(255,255,255,.6)"; ctx.font = O.police(11, true); ctx.textAlign = "center"; ctx.fillText("CAN", cx, 403);
        if (q > 0.6) { ctx.fillStyle = "#ffd60a"; ctx.font = O.police(15, true); ctx.fillText(valeur(s.el[k]), cx, 434); }
      }
    } else {
      ctx.fillText("CCD : LES CHARGES AVANCENT DE PHOTOSITE EN PHOTOSITE JUSQU’À UNE SORTIE UNIQUE", X0, 462);
      ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(X0, 364); ctx.lineTo(wx(N - 1) + LW + 10, 364); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.moveTo(wx(N - 1) + LW + 10, 357); ctx.lineTo(wx(N - 1) + LW + 22, 364); ctx.lineTo(wx(N - 1) + LW + 10, 371); ctx.fill();
      // L'amplificateur unique et son convertisseur
      const ax = 830, ay = PY + PH / 2, actif = q > 0 && q < 1;
      ctx.fillStyle = actif ? "#2997ff" : "rgba(255,255,255,.3)";
      ctx.beginPath(); ctx.moveTo(ax, ay - 20); ctx.lineTo(ax + 34, ay); ctx.lineTo(ax, ay + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = actif ? "rgba(255,159,10,.9)" : "rgba(255,255,255,.12)";
      O.rect(ctx, ax + 46, ay - 16, 64, 32, 7); ctx.fill();
      ctx.fillStyle = actif ? "#111" : "rgba(255,255,255,.6)"; ctx.font = O.police(12, true); ctx.textAlign = "center"; ctx.fillText("CAN", ax + 78, ay + 4);
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = O.police(11, true); ctx.fillText("sortie unique", ax + 55, ay - 28);
      // Les valeurs, dans l'ordre où elles sortent : la case la plus proche de la sortie d'abord.
      ctx.textAlign = "left"; ctx.font = O.police(12); ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.fillText("Valeurs lues, dans l’ordre de sortie :", X0, 396);
      sortis.forEach((k, i) => {
        ctx.fillStyle = "#ffd60a"; ctx.font = O.police(14, true);
        ctx.fillText("case " + (k + 1) + " : " + valeur(s.el[k]), X0 + i * 120, 426);
      });
    }

    // Valeurs de la case la plus éclairée (case 5), une fois l'exposition finie
    const k = 4, ne = s.el[k];
    Application.afficher("#c1-ph", O.nb(Math.round(s.ph[k]), 0));
    Application.afficher("#c1-el", O.nb(Math.round(ne), 0) + " e⁻");
    const rem = O.el("c1-rem");
    Application.afficher(rem, O.nb(ne / FW * 100, 0) + " %");
    rem.className = s.brut[k] >= FW ? "bad" : "";
    Application.afficher("#c1-u", O.nb(ne * G / 1e6, 2) + " V");
    Application.afficher("#c1-v", O.nb(valeur(ne), 0));
    O.el("c1-etat").textContent = anim ? (p < 1 ? "Exposition…" : q < 1 ? "Lecture…" : "") : "t = " + (t === 1 / 50 ? "1/50" : t === 1 / 25 ? "1/25" : t === 1 / 100 ? "1/100" : "1/200") + " s";

    O.el("c1-calc").innerHTML =
      '<div><span class="c">Photons</span> ' + O.nb(K, 0) + " × E × t = " + O.nb(K, 0) + " × " + s.E + " × " + O.nb(t, 3) + " = <b>" + O.nb(Math.round(s.ph[k]), 0) + "</b></div>" +
      '<div><span class="c">N<sub>e</sub> = QE × N<sub>ph</sub></span> = ' + O.nb(s.QE, 2) + " × " + O.nb(Math.round(s.ph[k]), 0) + " = " + O.nb(Math.round(s.brut[k]), 0) + " e⁻" + (s.brut[k] > FW ? " → <b>plafonné à 20 000</b>" : "") + "</div>" +
      '<div><span class="c">U = N<sub>e</sub> × g</span> = ' + O.nb(Math.round(ne), 0) + " × 40 µV = <b>" + O.nb(ne * G / 1e6, 3) + " V</b></div>" +
      '<div><span class="c">V = N<sub>e</sub> / N<sub>max</sub> × 4 095</span> = ' + O.nb(ne / FW, 3) + " × 4 095 = <b>" + valeur(ne) + "</b></div>" +
      '<div><span class="c">(' + O.nb(K, 0) + " = photons reçus par lx·s par ce photosite)</span></div>";

    const msg = O.el("c1-msg"), max = Math.max.apply(null, s.brut);
    if (s.sat) {
      msg.className = "note bad";
      msg.innerHTML = "<b>" + s.sat + " photosite" + (s.sat > 1 ? "s saturés" : " saturé") + ".</b> Au-delà de 20 000 électrons, le puits déborde : la lumière en plus est perdue, toutes ces cases donnent la même valeur (4 095). C’est un blanc <b>écrêté</b>, sans détail. Réduisez le temps d’exposition ou la lumière.";
    } else if (max < FW * 0.25) {
      msg.className = "note warn";
      msg.innerHTML = "<b>Sous-exposé.</b> La case la plus claire n’atteint que " + O.nb(max / FW * 100, 0) + " % de la capacité. Il faudra amplifier le signal (gain) et le <b>bruit</b> deviendra visible (module 3). Mieux vaut plus de lumière ou un temps d’exposition plus long.";
    } else {
      msg.className = "note ok";
      msg.innerHTML = "<b>Bonne exposition.</b> La case la plus claire est remplie à " + O.nb(max / FW * 100, 0) + " % sans déborder. Les électrons sont <b>proportionnels</b> à la lumière : la case 4 reçoit moitié moins de lumière que la case 5, elle a moitié moins d’électrons.";
    }
    O.el("c1-lecture").innerHTML = type === "ccd"
      ? "<b>CCD</b> : les paquets de charges sont décalés de case en case jusqu’à <b>un seul</b> amplificateur. Les valeurs sortent l’une après l’autre, en commençant par la case la plus proche de la sortie."
      : "<b>CMOS</b> : chaque photosite convertit sa charge en tension avec son <b>propre amplificateur</b>, et chaque colonne a son convertisseur. Toute la ligne est convertie <b>en même temps</b> ; les lignes suivantes attendent leur tour (module 5).";
  }

  function jouer() {
    cancelAnimationFrame(anim); anim = null;
    if (O.reduit()) { p = 1; q = 1; dessiner(); return; }
    const t0 = performance.now(), TE = 2200, TP = 350, TL = 2400;
    (function pas(now) {
      const dt = now - t0;
      p = Math.min(1, dt / TE);
      q = dt < TE + TP ? 0 : Math.min(1, (dt - TE - TP) / TL);
      if (!O.visible(cv)) { p = 1; q = 1; anim = null; dessiner(); return; }
      anim = q < 1 ? requestAnimationFrame(pas) : null;
      dessiner(now);
    })(t0);
  }
  function stopper() { cancelAnimationFrame(anim); anim = null; p = 1; q = 1; dessiner(); }

  [rE, rQE].forEach(r => r.addEventListener("input", stopper));
  const segT = Application.segment("#c1-t", [["200", "1/200"], ["100", "1/100"], ["50", "1/50"], ["25", "1/25"]], "50", v => { t = 1 / +v; stopper(); });
  const segType = Application.segment("#c1-type", [["ccd", "CCD"], ["cmos", "CMOS"]], "cmos", v => { type = v; jouer(); });
  O.el("c1-jouer").addEventListener("click", jouer);
  O.situations("c1-situations", s => {
    const r = { ok: [50, "50", 50], sous: [8, "100", 50], sur: [150, "25", 50], qe: [50, "50", 22] }[s];
    O.curseur(rE, r[0]); O.curseur(rQE, r[2]); segT.choisir(r[1]);
    jouer();
  });
  void segType;
  jouer();
});

/* ==========================================================================
   MODULE 2 — Comparer des photosites à la même échelle
   ========================================================================== */
Application.labo(2, function () {
  const cv = O.el("c2-cv"), ctx = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const fmt = O.el("c2-format"), def = O.el("c2-def");
  let arch = "bsi", ml = true, anim = null;

  // Modèle simplifié : part sensible de la surface et part de lumière captée.
  const sensible = (p, a) => a === "fsi" ? O.borne(1 - 2 / (p * p), 0.15, 0.75) : O.borne(1 - 0.3 / (p * p), 0.6, 0.95);
  function captee(p, a, m) {
    const s = sensible(p, a);
    if (!m) return s;
    return s + (1 - s) * (a === "fsi" ? O.borne(0.12 * p, 0.3, 0.8) : 0.85);
  }
  const REF = 1.54 * 1.54 * captee(1.54, "bsi", true); // smartphone 12 Mpx, BSI avec microlentilles

  const V = { x: 34, y: 56, c: 384 }, ECH = V.c / 24;   // vue de dessus : carré de 24 µm
  const S = { x: 520, w: 340 };                          // coupe

  function vueDessus(p, fs) {
    const pp = p * ECH;
    ctx.save(); ctx.beginPath(); ctx.rect(V.x, V.y, V.c, V.c); ctx.clip();
    ctx.fillStyle = "#15171b"; ctx.fillRect(V.x, V.y, V.c, V.c);
    for (let y = 0; y * pp < V.c; y++) for (let x = 0; x * pp < V.c; x++) {
      const x0 = V.x + x * pp, y0 = V.y + y * pp;
      if (arch === "fsi") { ctx.fillStyle = "rgba(255,159,10,.28)"; ctx.fillRect(x0, y0, pp, pp); }
      const c = Math.sqrt(fs) * pp;
      ctx.fillStyle = "rgba(41,151,255,.6)";
      ctx.fillRect(x0 + (pp - c) / 2, y0 + (pp - c) / 2, c, c);
      if (pp > 5) { ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, pp - 1, pp - 1); }
      if (ml && pp > 7) {
        const g = ctx.createRadialGradient(x0 + pp * 0.4, y0 + pp * 0.38, 0, x0 + pp / 2, y0 + pp / 2, pp * 0.48);
        g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,.04)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x0 + pp / 2, y0 + pp / 2, pp * 0.47, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.5; ctx.strokeRect(V.x, V.y, V.c, V.c);
    ctx.font = O.police(12, true); ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.textAlign = "left";
    ctx.fillText("VUE DE DESSUS · CARRÉ DE 24 µm DE CÔTÉ", V.x, 22);
    ctx.font = O.police(13); ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText("≈ " + O.nb(24 / p, 1) + " photosites sur 24 µm", V.x, 42);
    // barre d'échelle de 10 µm
    const yb = V.y + V.c + 18;
    ctx.strokeStyle = "#ffd60a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(V.x, yb); ctx.lineTo(V.x + 10 * ECH, yb); ctx.moveTo(V.x, yb - 5); ctx.lineTo(V.x, yb + 5); ctx.moveTo(V.x + 10 * ECH, yb - 5); ctx.lineTo(V.x + 10 * ECH, yb + 5); ctx.stroke();
    ctx.fillStyle = "#ffd60a"; ctx.font = O.police(12, true); ctx.fillText("10 µm", V.x + 10 * ECH + 8, yb + 4);
    // légende
    ctx.fillStyle = "rgba(41,151,255,.8)"; ctx.fillRect(V.x + 236, yb - 6, 12, 12);
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = O.police(12); ctx.fillText("zone sensible", V.x + 254, yb + 4);
    if (arch === "fsi") { ctx.fillStyle = "rgba(255,159,10,.6)"; ctx.fillRect(V.x + 344, yb - 6, 12, 12); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText("circuits", V.x + 362, yb + 4); }
  }

  function coupe(p, fs, maintenant) {
    const x0 = S.x, w = S.w, cx = x0 + w / 2, ouv = Math.sqrt(fs) * w;
    const yLentille = 150, yFiltre = 150, yFiltreB = 170;
    const fsi = arch === "fsi";
    const pdTop = fsi ? 300 : 172, pdBot = fsi ? 380 : 270;
    const fils = fsi ? [190, 228, 266] : [300, 336, 372];
    ctx.font = O.police(12, true); ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.textAlign = "left";
    ctx.fillText("COUPE D’UN PHOTOSITE · " + (fsi ? "CLASSIQUE (FSI)" : "RÉTROÉCLAIRÉ (BSI)"), x0, 22);
    // photosites voisins (pointillés)
    ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, 60); ctx.lineTo(x0, 430); ctx.moveTo(x0 + w, 60); ctx.lineTo(x0 + w, 430); ctx.stroke(); ctx.setLineDash([]);
    // couches
    ctx.fillStyle = "rgba(48,209,88,.55)"; ctx.fillRect(x0, yFiltre, w, yFiltreB - yFiltre);
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(x0, yFiltreB, w, 430 - yFiltreB);
    ctx.fillStyle = "rgba(41,151,255,.75)"; O.rect(ctx, cx - ouv / 2, pdTop, ouv, pdBot - pdTop, 6); ctx.fill();
    ctx.fillStyle = "#ff9f0a";
    fils.forEach(y => {
      if (fsi) { ctx.fillRect(x0, y, (w - ouv) / 2, 10); ctx.fillRect(cx + ouv / 2, y, (w - ouv) / 2, 10); }
      else { ctx.fillRect(x0 + 10, y, w * 0.35, 10); ctx.fillRect(x0 + w * 0.55, y, w * 0.4, 10); }
    });
    if (ml) {
      ctx.fillStyle = "rgba(200,230,255,.25)"; ctx.strokeStyle = "rgba(220,240,255,.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, yLentille); ctx.quadraticCurveTo(cx, yLentille - 90, x0 + w, yLentille); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // les rayons
    const foyer = { x: cx, y: pdTop + 14 };
    const nr = 9;
    for (let i = 0; i < nr; i++) {
      const xi = x0 + (i + 0.5) / nr * w;
      const u = (xi - cx) / (w / 2);
      const yl = ml ? yLentille - 45 * (1 - u * u) : yFiltre;   // surface de la lentille
      const xa = y => y <= yl ? xi : (ml ? xi + (foyer.x - xi) * (y - yl) / (foyer.y - yl) : xi);
      let fin = pdTop, bloque = false;
      if (fsi) for (const yf of fils) { if (Math.abs(xa(yf) - cx) > ouv / 2) { fin = yf; bloque = true; break; } }
      const xf = xa(fin);
      if (!bloque && Math.abs(xf - cx) > ouv / 2) bloque = true;
      ctx.strokeStyle = "#ffd60a"; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -((maintenant || 0) * 0.05);
      ctx.beginPath(); ctx.moveTo(xi, 40); ctx.lineTo(xi, yl); ctx.lineTo(xf, fin); ctx.stroke(); ctx.setLineDash([]);
      if (bloque) {
        ctx.strokeStyle = "#ff453a"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(xf - 6, fin - 6); ctx.lineTo(xf + 6, fin + 6); ctx.moveTo(xf + 6, fin - 6); ctx.lineTo(xf - 6, fin + 6); ctx.stroke();
      } else { ctx.fillStyle = "#30d158"; ctx.beginPath(); ctx.arc(xf, fin, 4, 0, Math.PI * 2); ctx.fill(); }
    }
    // étiquettes
    const etiq = (txt, y, coul) => { ctx.fillStyle = coul || "rgba(255,255,255,.75)"; ctx.font = O.police(12); ctx.textAlign = "left"; ctx.fillText(txt, x0 + w + 12, y); };
    if (ml) etiq("microlentille", 112);
    etiq("filtre coloré", 164, "#7ee29a");
    etiq("photodiode", (pdTop + pdBot) / 2 + 4, "#6db8ff");
    etiq(fsi ? "fils (devant)" : "fils (derrière)", fils[1] + 9, "#ffb340");
  }

  function dessiner(maintenant) {
    const L = +fmt.value, n = +def.value, p = L * 1000 / n, fs = sensible(p, arch), eff = captee(p, arch, ml);
    ctx.fillStyle = "#0b0c0e"; ctx.fillRect(0, 0, W, Hc);
    vueDessus(p, fs);
    coupe(p, fs, maintenant);

    const utile = p * p * eff;
    Application.afficher("#c2-p", O.nb(p, 2) + " µm");
    Application.afficher("#c2-s", O.nb(p * p, 1) + " µm²");
    Application.afficher("#c2-fw", O.nb(Math.round(1500 * p * p / 100) * 100, 0) + " e⁻");
    Application.afficher("#c2-eff", O.nb(eff * 100, 0) + " %");
    Application.afficher("#c2-utile", O.nb(utile, 1) + " µm²");
    if (maintenant) return; // pendant l'animation des rayons, seuls les dessins changent

    O.el("c2-calc").innerHTML =
      '<div><span class="c">p = L / N<sub>H</sub></span> = ' + O.nb(L * 1000, 0) + " µm / " + O.nb(n, 0) + " = <b>" + O.nb(p, 2) + " µm</b></div>" +
      '<div><span class="c">S = p²</span> = ' + O.nb(p, 2) + "² = <b>" + O.nb(p * p, 1) + " µm²</b></div>" +
      '<div><span class="c">Capacité ≈ 1 500 × S</span> ≈ ' + O.nb(Math.round(1500 * p * p / 100) * 100, 0) + " e⁻</div>" +
      '<div><span class="c">Surface utile = S × lumière captée</span> = ' + O.nb(p * p, 1) + " × " + O.nb(eff, 2) + " = <b>" + O.nb(utile, 1) + " µm²</b></div>" +
      '<div><span class="c">par rapport à un smartphone (1,54 µm, BSI)</span> × ' + O.nb(utile / REF, utile < REF ? 2 : 1) + "</div>";

    const msg = O.el("c2-msg"), gainTech = captee(p, "bsi", true) / sensible(p, "fsi");
    if (p < 2.2) {
      msg.className = "note warn";
      msg.innerHTML = "<b>Photosites minuscules : " + O.nb(p, 2) + " µm.</b> Chacun reçoit peu de lumière : bruit et faible dynamique. Ici, le rétroéclairage et les microlentilles sont <b>indispensables</b> : ensemble, ils multiplient la lumière captée par " + O.nb(gainTech, 1) + " par rapport à un capteur classique (FSI) sans microlentilles. Essayez les deux réglages.";
    } else if (p > 6.5) {
      msg.className = "note ok";
      msg.innerHTML = "<b>Grands photosites : " + O.nb(p, 2) + " µm.</b> Chacun reçoit " + O.nb(utile / REF, 0) + " fois plus de lumière qu’un photosite de smartphone : moins de bruit, plus de dynamique. Les circuits pèsent peu sur une si grande surface.";
    } else {
      msg.className = "note info";
      msg.innerHTML = "<b>Photosites de " + O.nb(p, 2) + " µm</b>, soit " + O.nb(p * p, 1) + " µm². Doubler la définition sur le même capteur diviserait le pas par 2 et la surface par <b>4</b>. Comparez le Super 35 en 4K et en 8K.";
    }
    if (!ml || arch === "fsi") msg.innerHTML += " <br>" + (arch === "fsi" ? "En <b>FSI</b>, les fils passent <b>devant</b> la photodiode et arrêtent une partie des rayons (croix rouges)." : "") + (!ml ? " Sans microlentilles, la lumière qui tombe hors de la zone sensible est perdue." : "");
  }

  function boucle() {
    cancelAnimationFrame(anim); anim = null;
    if (O.reduit()) { dessiner(); return; }
    (function pas(now) {
      if (!O.visible(cv)) { anim = null; return; }
      dessiner(now); anim = requestAnimationFrame(pas);
    })(performance.now());
  }

  fmt.addEventListener("change", () => dessiner());
  def.addEventListener("change", () => dessiner());
  Application.segment("#c2-arch", [["fsi", "Classique (FSI)"], ["bsi", "Rétroéclairé (BSI)"]], "bsi", v => { arch = v; dessiner(); });
  const segMl = Application.segment("#c2-ml", [["oui", "Avec"], ["non", "Sans"]], "oui", v => { ml = v === "oui"; dessiner(); });
  void segMl;
  O.situations("c2-situations", s => {
    const r = { tel: ["6.17", "8000"], "23": ["9.6", "1920"], s35: ["24.9", "4096"], pf: ["36", "4096"] }[s];
    fmt.value = r[0]; def.value = r[1]; dessiner();
  });
  Application.surAffichage(2, () => { if (!anim) boucle(); });
  dessiner();
  boucle();
});

/* ==========================================================================
   MODULE 3 — Bruit et plage dynamique : une charte de 15 diaphs
   ========================================================================== */
Application.labo(3, function () {
  const cv = O.el("c3-cv"), ctx = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const rp = O.el("c3-p"), rrn = O.el("c3-rn"), rex = O.el("c3-ex");
  const NC = 15, CX = 82, CW = 60, CY = 40, CH = 150;     // les cases (marge à gauche pour l'échelle du graphique)
  const GR = { y0: 238, y1: 488, max: 17 };              // le graphique (log2 des électrons)
  const BW = 20, BH = 30;                                 // résolution du bruit dans une case
  const tampon = document.createElement("canvas"); tampon.width = NC * BW; tampon.height = BH;
  const tctx = tampon.getContext("2d"), img = tctx.createImageData(NC * BW, BH);
  let gain = 0, fige = false, anim = null, derniere = 0;

  function modele() {
    const p = +rp.value, rn = +rrn.value, ex = +rex.value, A = Math.pow(10, gain / 20);
    const fw = 1500 * p * p, haut = fw / A;               // niveau d'écrêtage, en électrons
    const cases = [];
    for (let k = 0; k < NC; k++) {
      const n = 0.7 * fw * Math.pow(2, k - 14 + ex), ne = Math.min(n, fw), sigma = Math.sqrt(ne + rn * rn);
      cases.push({ n: n, ne: ne, sigma: sigma, ecrete: ne * A >= fw * 0.999, noye: ne / sigma < 1 });
    }
    return { p: p, rn: rn, ex: ex, A: A, fw: fw, haut: haut, dr: Math.log2(haut / rn), cases: cases };
  }

  function bruit(m) {
    for (let k = 0; k < NC; k++) {
      const c = m.cases[k];
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
        const v = O.borne((c.ne + O.gauss() * c.sigma) * m.A / m.fw, 0, 1);
        const g = Math.round(255 * Math.pow(v, 1 / 2.4)), i = (y * NC * BW + k * BW + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255;
      }
    }
    tctx.putImageData(img, 0, 0);
  }

  const Yg = v => GR.y1 - O.borne(Math.log2(Math.max(v, 1)), 0, GR.max) / GR.max * (GR.y1 - GR.y0);
  const Xc = k => CX + k * CW + (CW - 4) / 2;

  // mode === "anim" : on ne retire que le bruit (les textes ne changent pas).
  function dessiner(mode) {
    const m = modele();
    Application.afficher("#c3-po", O.nb(m.p, 1) + " µm");
    Application.afficher("#c3-rno", O.nb(m.rn, 1) + " e⁻");
    Application.afficher("#c3-exo", (m.ex > 0 ? "+" : m.ex < 0 ? "−" : "") + Math.abs(m.ex) + " IL");

    ctx.fillStyle = "#0b0c0e"; ctx.fillRect(0, 0, W, Hc);
    ctx.font = O.police(12, true); ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.textAlign = "left";
    ctx.fillText("CHAQUE CASE REÇOIT DEUX FOIS PLUS DE LUMIÈRE QUE SA VOISINE DE GAUCHE", CX, 22);

    // 1. Les cases, avec leur bruit (dessin basse définition agrandi : on voit le grain)
    bruit(m);
    ctx.imageSmoothingEnabled = false;
    for (let k = 0; k < NC; k++) ctx.drawImage(tampon, k * BW, 0, BW, BH, CX + k * CW, CY, CW - 4, CH);
    ctx.imageSmoothingEnabled = true;
    m.cases.forEach((c, k) => {
      ctx.textAlign = "center"; ctx.font = O.police(12, true);
      if (c.ecrete) { ctx.fillStyle = "#ff453a"; ctx.fillText("écrêtée", Xc(k), CY + CH + 18); }
      else if (c.noye) { ctx.fillStyle = "#ff9f0a"; ctx.fillText("noyée", Xc(k), CY + CH + 18); }
      else { ctx.fillStyle = "rgba(48,209,88,.9)"; ctx.fillText("✓", Xc(k), CY + CH + 18); }
    });

    // 2. Le graphique : signal, bruit, écrêtage, plancher, plage dynamique
    ctx.font = O.police(11); ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,.45)";
    [1, 10, 100, 1000, 10000, 100000].forEach(v => {
      const y = Yg(v);
      ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(CX - 4, y); ctx.lineTo(W - 10, y); ctx.stroke();
      ctx.fillText(O.nb(v, 0), CX - 8, y + 4);
    });
    ctx.save(); ctx.translate(16, (GR.y0 + GR.y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("électrons (échelle en diaphs)", 0, 0); ctx.restore();
    // zone de plage dynamique
    const yh = Yg(m.haut), yb = Yg(m.rn);
    ctx.fillStyle = "rgba(48,209,88,.10)"; ctx.fillRect(CX, yh, W - CX - 10, yb - yh);
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff453a"; ctx.beginPath(); ctx.moveTo(CX, yh); ctx.lineTo(W - 10, yh); ctx.stroke();
    ctx.strokeStyle = "#ff9f0a"; ctx.beginPath(); ctx.moveTo(CX, yb); ctx.lineTo(W - 10, yb); ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "right"; ctx.font = O.police(12, true);
    ctx.fillStyle = "#ff8a80"; ctx.fillText("écrêtage : capacité" + (gain ? " / gain" : "") + " = " + O.nb(Math.round(m.haut), 0) + " e⁻", W - 14, yh - 6);
    ctx.fillStyle = "#ffb340"; ctx.fillText("bruit de lecture = " + O.nb(m.rn, 1) + " e⁻", W - 14, yb + 16);
    // flèche de la plage dynamique
    const xf = W - 40;
    ctx.strokeStyle = "#30d158"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xf, yh + 4); ctx.lineTo(xf, yb - 4); ctx.stroke();
    ctx.fillStyle = "#30d158"; ctx.beginPath(); ctx.moveTo(xf - 5, yh + 10); ctx.lineTo(xf, yh + 2); ctx.lineTo(xf + 5, yh + 10); ctx.moveTo(xf - 5, yb - 10); ctx.lineTo(xf, yb - 2); ctx.lineTo(xf + 5, yb - 10); ctx.fill();
    if (yb - yh > 40) { ctx.save(); ctx.translate(xf - 10, (yh + yb) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("plage dynamique " + O.nb(m.dr, 1) + " IL", 0, 0); ctx.restore(); }
    // bruit de chaque case (gris) et signal (bleu)
    ctx.strokeStyle = "rgba(220,220,220,.6)"; ctx.lineWidth = 2; ctx.beginPath();
    m.cases.forEach((c, k) => { const y = Yg(c.sigma); k ? ctx.lineTo(Xc(k), y) : ctx.moveTo(Xc(k), y); }); ctx.stroke();
    ctx.strokeStyle = "#2997ff"; ctx.lineWidth = 2.5; ctx.beginPath();
    m.cases.forEach((c, k) => { const y = Yg(c.ne); k ? ctx.lineTo(Xc(k), y) : ctx.moveTo(Xc(k), y); }); ctx.stroke();
    m.cases.forEach((c, k) => { ctx.fillStyle = c.ecrete ? "#ff453a" : c.noye ? "#ff9f0a" : "#2997ff"; ctx.beginPath(); ctx.arc(Xc(k), Yg(c.ne), 4.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.textAlign = "left"; ctx.font = O.police(12, true);
    ctx.fillStyle = "#6db8ff"; ctx.fillText("● signal", CX + 30, GR.y0 - 6);
    ctx.fillStyle = "rgba(220,220,220,.8)"; ctx.fillText("— bruit (√N et lecture)", CX + 100, GR.y0 - 6);

    if (mode === "anim") return;
    const ecr = m.cases.filter(c => c.ecrete).length, noy = m.cases.filter(c => c.noye).length;
    Application.afficher("#c3-dr", O.nb(m.dr, 1) + " IL");
    Application.afficher("#c3-db", O.nb(20 * Math.log10(m.haut / m.rn), 0) + " dB");
    Application.afficher("#c3-fw", O.nb(Math.round(m.fw / 100) * 100, 0) + " e⁻");
    const be = O.el("c3-ecr"), bn = O.el("c3-noy");
    Application.afficher(be, ecr + " / 15"); be.className = ecr ? "bad" : "";
    Application.afficher(bn, noy + " / 15"); bn.className = noy ? "bad" : "";
    O.el("c3-etat").textContent = "gain " + (gain ? "+" + gain : "0") + " dB";

    O.el("c3-calc").innerHTML =
      '<div><span class="c">Capacité ≈ 1 500 × p²</span> = 1 500 × ' + O.nb(m.p, 1) + "² ≈ " + O.nb(Math.round(m.fw), 0) + " e⁻</div>" +
      (gain ? '<div><span class="c">Gain +' + gain + " dB : A = 10<sup>" + gain + "/20</sup></span> ≈ " + O.nb(m.A, 1) + " → écrêtage à " + O.nb(Math.round(m.fw), 0) + " / " + O.nb(m.A, 1) + " ≈ " + O.nb(Math.round(m.haut), 0) + " e⁻</div>" : "") +
      '<div><span class="c">Rapport</span> ' + O.nb(Math.round(m.haut), 0) + " / " + O.nb(m.rn, 1) + " ≈ " + O.nb(m.haut / m.rn, 0) + "</div>" +
      '<div><span class="c">DR = log<sub>2</sub>(rapport)</span> = <b>' + O.nb(m.dr, 1) + " IL</b> · 20 × log(rapport) = <b>" + O.nb(20 * Math.log10(m.haut / m.rn), 0) + " dB</b></div>";

    const msg = O.el("c3-msg");
    if (gain >= 12 && m.ex >= 0) {
      msg.className = "note bad";
      msg.innerHTML = "<b>Trop de gain.</b> +" + gain + " dB multiplie le signal par " + O.nb(m.A, 0) + " : l’image s’éclaircit, mais " + ecr + " cases sont écrêtées et le bruit est amplifié autant que le signal. La plage dynamique tombe à " + O.nb(m.dr, 1) + " IL. Le gain ne crée <b>aucune lumière</b>.";
    } else if (m.ex < 0 && gain > 0) {
      msg.className = "note warn";
      msg.innerHTML = "<b>Sous-exposer puis remonter au gain</b> : les cases sombres ont reçu peu d’électrons, leur rapport signal sur bruit est faible (√N). Le gain les éclaircit… avec leur bruit. Mieux vaut <b>plus de lumière</b> que plus de gain.";
    } else if (m.p < 2) {
      msg.className = "note warn";
      msg.innerHTML = "<b>Petits photosites</b> (" + O.nb(m.p, 1) + " µm) : capacité de " + O.nb(Math.round(m.fw / 100) * 100, 0) + " électrons seulement. Les cases sombres se noient vite dans le bruit : " + O.nb(m.dr, 1) + " IL de dynamique.";
    } else {
      msg.className = "note ok";
      msg.innerHTML = "<b>" + O.nb(m.dr, 1) + " diaphs de plage dynamique</b> : entre l’écrêtage (ligne rouge) et le bruit de lecture (ligne orange). Le bruit se voit surtout dans les cases <b>sombres</b> : elles ont peu d’électrons, et √N y pèse plus lourd. Augmentez la taille des photosites ou baissez le bruit de lecture pour gagner des cases.";
    }
  }

  // Le bruit « fourmille » : on le retire environ 12 fois par seconde.
  function boucle() {
    cancelAnimationFrame(anim); anim = null;
    if (fige || O.reduit()) return;
    (function pas(now) {
      if (!O.visible(cv) || fige) { anim = null; return; }
      if (now - derniere > 80) { derniere = now; dessiner("anim"); }
      anim = requestAnimationFrame(pas);
    })(performance.now());
  }

  [rp, rrn, rex].forEach(r => r.addEventListener("input", () => dessiner()));
  const segG = Application.segment("#c3-g", [[0, "0 dB"], [6, "+6"], [12, "+12"], [18, "+18"], [24, "+24"]], 0, v => { gain = +v; dessiner(); });
  const bp = O.el("c3-pause");
  bp.addEventListener("click", () => { fige = !fige; bp.textContent = fige ? "▶ Animer le bruit" : "⏸ Figer le bruit"; if (!fige) boucle(); });
  O.situations("c3-situations", s => {
    const r = { pf: [8.5, 2, 0, 0], tel: [1.2, 1.5, 0, 0], gain: [5, 3, 0, 24], sous: [5, 3, -3, 18] }[s];
    O.curseur(rp, r[0]); O.curseur(rrn, r[1]); O.curseur(rex, r[2]); segG.choisir(r[3]);
  });
  Application.surAffichage(3, () => { if (!anim) boucle(); });
  if (O.reduit()) { fige = true; bp.textContent = "▶ Animer le bruit"; }
  dessiner();
  boucle();
});

/* ==========================================================================
   MODULE 4 — Matrice de Bayer, dématriçage et tri-capteur
   ========================================================================== */
Application.labo(4, function () {
  /* ---- a) Ce que voit un capteur de Bayer --------------------------------- */
  const LW = 96, LH = 48, Z = 10, NPX = LW * LH;
  const cv = O.el("c4-cv"), ctx = cv.getContext("2d");
  const lp = O.el("c4-loupe"), lctx = lp.getContext("2d");
  const off = document.createElement("canvas"); off.width = LW; off.height = LH;
  const octx = off.getContext("2d");
  let vue = "mosaique", olpf = false, loupe = { x: 50, y: 6 }, minuterie = null, auto = false;

  // La scène test : couleurs douces, rayures et damiers fins, rayures colorées.
  function hsv(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5) * 255, f(3) * 255, f(1) * 255]; }
  function scene(x, y) {
    if (x < 32) { const d = Math.hypot(x - 15, y - 24); return hsv((x * 9 + y * 4) % 360, 0.55 + 0.35 * Math.min(1, d / 24), 0.95 - 0.3 * Math.min(1, d / 30)); }
    if (x < 64) {
      const u = x - 32;
      if (y < 22) { const ph = u * (0.55 + u * 0.016) * Math.PI; return Math.sin(ph) > 0 ? [235, 235, 235] : [20, 20, 20]; }
      if (y < 24) return [120, 120, 120];
      if (y < 36) return (u + y) % 2 ? [235, 235, 235] : [20, 20, 20];
      return (u + y) % 3 === 0 ? [235, 235, 235] : [25, 25, 25];
    }
    if (y < 24) return y % 2 ? [230, 40, 40] : [245, 245, 245];
    const u = x - 64; return u % 3 === 0 ? [230, 40, 40] : u % 3 === 1 ? [40, 200, 70] : [40, 90, 240];
  }
  const ORIGINE = [];
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) ORIGINE.push(scene(x, y));
  // Filtre passe-bas optique : léger flou [1 2 1] / 4 dans les deux directions.
  const FLOU = (function () {
    const tmp = [], res = [], px = (t, x, y) => t[O.borne(y, 0, LH - 1) * LW + O.borne(x, 0, LW - 1)];
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const a = px(ORIGINE, x - 1, y), b = px(ORIGINE, x, y), c = px(ORIGINE, x + 1, y); tmp.push([0, 1, 2].map(i => (a[i] + 2 * b[i] + c[i]) / 4)); }
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const a = px(tmp, x, y - 1), b = px(tmp, x, y), c = px(tmp, x, y + 1); res.push([0, 1, 2].map(i => (a[i] + 2 * b[i] + c[i]) / 4)); }
    return res;
  })();
  const CANAL = { R: 0, V: 1, B: 2 };
  const COUL = { R: "#ff453a", V: "#30d158", B: "#0a84ff" };
  const filtre = (x, y) => (y % 2 === 0 ? (x % 2 === 0 ? "R" : "V") : (x % 2 === 0 ? "V" : "B"));

  let entree, mesure, demat, erreur;
  function calculer() {
    entree = olpf ? FLOU : ORIGINE;
    mesure = entree.map((c, i) => c[CANAL[filtre(i % LW, Math.floor(i / LW))]]);
    // Dématriçage bilinéaire : chaque couleur manquante = moyenne des voisins qui la mesurent.
    demat = [];
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      const px = [0, 0, 0], nb = [0, 0, 0], propre = CANAL[filtre(x, y)];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= LW || yy >= LH) continue;
        const c = CANAL[filtre(xx, yy)];
        if (c === propre && (dx || dy)) continue;   // sa propre couleur : le photosite l'a mesurée lui-même
        px[c] += mesure[yy * LW + xx]; nb[c] += 1;
      }
      demat.push(px.map((v, i) => v / nb[i]));
    }
    // Fausses couleurs : écart moyen de chrominance entre l'image dématricée et l'image reçue.
    let s = 0;
    demat.forEach((d, i) => { const e = entree[i]; s += (Math.abs((d[0] - d[1]) - (e[0] - e[1])) + Math.abs((d[2] - d[1]) - (e[2] - e[1]))) / 2; });
    erreur = s / NPX / 255 * 100;
  }

  function peindre(tab) {
    const im = octx.createImageData(LW, LH);
    tab.forEach((c, i) => { im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = 255; });
    octx.putImageData(im, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, LW * Z, LH * Z); ctx.imageSmoothingEnabled = true;
  }

  function dessiner() {
    ctx.fillStyle = "#0b0c0e"; ctx.fillRect(0, 0, cv.width, cv.height);
    if (vue === "scene") peindre(ORIGINE);
    else if (vue === "tri") peindre(entree);
    else if (vue === "demat") peindre(demat);
    else {
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
        const f = filtre(x, y), v = Math.round(mesure[y * LW + x]);
        ctx.fillStyle = f === "R" ? "rgb(" + v + ",0,0)" : f === "V" ? "rgb(0," + v + ",0)" : "rgb(0,0," + v + ")";
        ctx.fillRect(x * Z, y * Z, Z - 1, Z - 1);
      }
    }
    // cadre de la loupe
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(loupe.x * Z - 1, loupe.y * Z - 1, 6 * Z + 2, 6 * Z + 2);
    dessinerLoupe();

    const texte = {
      scene: "<b>La scène réelle</b>, telle que l’objectif la forme : chaque point a sa couleur complète.",
      mosaique: "<b>Ce que mesure le capteur</b> : chaque photosite ne voit que la couleur de son filtre. Une case sur deux est verte, une sur quatre rouge, une sur quatre bleue. L’image est sombre et en damier : il manque <b>deux couleurs sur trois</b>.",
      demat: "<b>Après dématriçage</b> : les couleurs manquantes sont calculées à partir des voisins. Sur les zones douces (à gauche), le résultat est excellent. Sur les rayures et damiers fins (au milieu), le calcul se trompe : <b>fausses couleurs</b> et <b>moiré</b>.",
      tri: "<b>Tri-capteur</b> : le prisme envoie chaque couleur sur son capteur. Chaque point est mesuré en rouge, en vert <b>et</b> en bleu : aucune couleur à deviner, aucune fausse couleur."
    }[vue];
    O.el("c4-texte").innerHTML = texte + (olpf && vue !== "scene" ? " <br>Le <b>filtre passe-bas</b> adoucit l’image avant la mesure : moins de fausses couleurs, mais un peu moins de détail." : "");
    Application.afficher("#c4-n", O.nb(NPX, 0));
    Application.afficher("#c4-v", O.nb(NPX / 2, 0));
    Application.afficher("#c4-rb", O.nb(NPX / 4, 0));
    Application.afficher("#c4-dev", vue === "tri" ? "0" : O.nb(2 * NPX, 0));
    Application.afficher("#c4-err", vue === "tri" || vue === "scene" ? "0 %" : O.nb(erreur, 1) + " %");
  }

  function dessinerLoupe() {
    const C = 60;
    lctx.fillStyle = "#0b0c0e"; lctx.fillRect(0, 0, 360, 360);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
      const x = loupe.x + i, y = loupe.y + j, idx = y * LW + x, f = filtre(x, y);
      let coul, etiquette, detail = "";
      if (vue === "mosaique") {
        const v = Math.round(mesure[idx]); coul = f === "R" ? "rgb(" + v + ",0,0)" : f === "V" ? "rgb(0," + v + ",0)" : "rgb(0,0," + v + ")";
        etiquette = f; detail = String(v);
      } else {
        const c = (vue === "scene" ? ORIGINE : vue === "tri" ? entree : demat)[idx].map(Math.round);
        coul = "rgb(" + c.join(",") + ")"; etiquette = vue === "demat" ? f : vue === "tri" ? "RVB" : ""; detail = vue === "demat" ? "mesuré" : "";
      }
      lctx.fillStyle = coul; O.rect(lctx, i * C + 3, j * C + 3, C - 6, C - 6, 8); lctx.fill();
      if (vue === "mosaique" || vue === "demat") { lctx.strokeStyle = COUL[f]; lctx.lineWidth = 2.5; lctx.stroke(); }
      if (etiquette) {
        lctx.font = O.police(15, true); lctx.textAlign = "center";
        lctx.fillStyle = "rgba(0,0,0,.55)"; lctx.fillRect(i * C + 14, j * C + 14, C - 28, 22);
        lctx.fillStyle = vue === "demat" || vue === "mosaique" ? COUL[f] : "#fff"; lctx.fillText(etiquette, i * C + C / 2, j * C + 30);
        if (detail) { lctx.font = O.police(11, true); lctx.fillStyle = "#fff"; lctx.fillText(detail, i * C + C / 2, j * C + 50); }
      }
    }
    O.el("c4-loupe-txt").innerHTML = {
      scene: "Les vraies couleurs de la scène, photosite par photosite.",
      mosaique: "Chaque case : la couleur de son <b>filtre</b> et la valeur mesurée (0 à 255).",
      demat: "La lettre indique la seule couleur <b>mesurée</b> ; les deux autres ont été calculées.",
      tri: "Chaque point est mesuré dans les trois couleurs (RVB)."
    }[vue];
  }

  function deplacer(e) {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
    // Loupe alignée sur le motif 2 × 2 de Bayer (coin rouge en haut à gauche).
    const nx = O.borne(Math.round((x - 3) / 2) * 2, 0, LW - 6), ny = O.borne(Math.round((y - 3) / 2) * 2, 0, LH - 6);
    if (nx !== loupe.x || ny !== loupe.y) { loupe = { x: nx, y: ny }; dessiner(); }
  }
  cv.addEventListener("pointermove", deplacer);
  cv.addEventListener("pointerdown", deplacer);

  const ETAPES = [["scene", "Scène"], ["mosaique", "Mosaïque"], ["demat", "Dématriçage"], ["tri", "Tri-capteur"]];
  const bouton = O.el("c4-defiler");
  function arreter() { clearInterval(minuterie); minuterie = null; bouton.textContent = "▶ Montrer les étapes"; }
  const seg = Application.segment("#c4-etape", ETAPES, vue, v => { if (!auto) arreter(); vue = v; dessiner(); });
  bouton.addEventListener("click", () => {
    if (minuterie) { arreter(); return; }
    bouton.textContent = "⏸ Arrêter";
    const suivant = () => { auto = true; seg.choisir(ETAPES[(ETAPES.findIndex(e => e[0] === vue) + 1) % ETAPES.length][0]); auto = false; };
    suivant();
    minuterie = setInterval(() => { if (!O.visible(cv)) { arreter(); return; } suivant(); }, 2600);
  });
  Application.segment("#c4-olpf", [["non", "Sans"], ["oui", "Avec"]], "non", v => { olpf = v === "oui"; calculer(); dessiner(); });
  calculer();
  dessiner();

  /* ---- b) Prisme dichroïque ou filtre de Bayer : où va la lumière ? ------- */
  const pc = O.el("c4-prisme"), pctx = pc.getContext("2d"), PW = pc.width, PH = pc.height;
  const RVB = { R: "#ff453a", V: "#30d158", B: "#2f8bff" };
  const YB = 210;                       // hauteur du faisceau
  const I1 = 380, I2 = 480;             // les deux faces dichroïques
  let sys = "tri", photons = [], compte = { mesure: 0, perdu: 0 }, pause = false, pAnim = null, dernier = null;

  function decor() {
    pctx.fillStyle = "#0b0c0e"; pctx.fillRect(0, 0, PW, PH);
    // l'objectif
    pctx.fillStyle = "rgba(160,200,255,.18)"; pctx.strokeStyle = "rgba(200,225,255,.6)"; pctx.lineWidth = 1.5;
    pctx.beginPath(); pctx.ellipse(130, YB, 16, 70, 0, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
    pctx.font = O.police(12, true); pctx.textAlign = "center"; pctx.fillStyle = "rgba(255,255,255,.6)";
    pctx.fillText("objectif", 130, YB + 92);
    pctx.fillText("lumière blanche", 50, YB - 40);
    if (sys === "tri") {
      // le bloc prisme et ses faces dichroïques
      pctx.fillStyle = "rgba(170,210,255,.10)"; pctx.strokeStyle = "rgba(200,225,255,.45)";
      pctx.beginPath(); pctx.moveTo(300, 120); pctx.lineTo(560, 120); pctx.lineTo(560, 300); pctx.lineTo(300, 300); pctx.closePath(); pctx.fill(); pctx.stroke();
      pctx.lineWidth = 4;
      pctx.strokeStyle = "rgba(47,139,255,.85)"; pctx.beginPath(); pctx.moveTo(I1 - 45, YB + 45); pctx.lineTo(I1 + 45, YB - 45); pctx.stroke();
      pctx.strokeStyle = "rgba(255,69,58,.85)"; pctx.beginPath(); pctx.moveTo(I2 - 45, YB - 45); pctx.lineTo(I2 + 45, YB + 45); pctx.stroke();
      pctx.font = O.police(11); pctx.fillStyle = "rgba(255,255,255,.6)";
      pctx.fillText("réfléchit le bleu", I1 - 10, 312 + 4); pctx.fillText("réfléchit le rouge", I2 + 30, 108);
      pctx.fillText("prisme dichroïque", 430, 335);
      // les trois capteurs
      const capteur = (x, y, w, h, coul, nom) => { pctx.fillStyle = coul; O.rect(pctx, x, y, w, h, 4); pctx.fill(); pctx.fillStyle = "rgba(255,255,255,.85)"; pctx.font = O.police(12, true); pctx.fillText(nom, x + w / 2, y < 100 ? y - 8 : y + h + 16); };
      capteur(I1 - 40, 30, 80, 14, RVB.B, "capteur bleu");
      capteur(I2 - 40, 376, 80, 14, RVB.R, "capteur rouge");
      pctx.fillStyle = RVB.V; O.rect(pctx, 640, YB - 50, 14, 100, 4); pctx.fill();
      pctx.fillStyle = "rgba(255,255,255,.85)"; pctx.fillText("capteur vert", 647, YB + 70);
    } else {
      // un capteur unique et sa mosaïque de filtres
      for (let y = YB - 60, i = 0; y < YB + 60; y += 10, i++) {
        pctx.fillStyle = RVB[["R", "V", "V", "B"][i % 4]]; pctx.globalAlpha = 0.9; pctx.fillRect(588, y + 1, 10, 8);
      }
      pctx.globalAlpha = 1;
      pctx.fillStyle = "rgba(255,255,255,.75)"; O.rect(pctx, 602, YB - 60, 14, 120, 3); pctx.fill();
      pctx.font = O.police(12, true); pctx.fillStyle = "rgba(255,255,255,.85)";
      pctx.fillText("filtres de Bayer", 594, YB - 72); pctx.fillText("capteur unique", 610, YB + 82);
    }
  }
  const filtreY = y => ["R", "V", "V", "B"][Math.floor((y - (YB - 60)) / 10) % 4];

  function avancer(dt) {
    // de nouveaux photons, de couleur tirée au hasard (la lumière blanche est un mélange)
    for (let i = 0; i < 2; i++) photons.push({ x: 10, y: YB + (Math.random() - 0.5) * 70, c: ["R", "V", "B"][Math.floor(Math.random() * 3)], dx: 1, dy: 0, vie: 1, mort: false });
    const v = 0.32 * dt;
    photons.forEach(ph => {
      if (ph.mort) { ph.vie -= dt / 500; return; }
      // l'objectif ramène les photons vers l'axe
      if (ph.x < 130 && ph.x + ph.dx * v >= 130) ph.cible = YB + (ph.y - YB) * 0.35;
      if (ph.cible !== undefined && ph.dy === 0) ph.y += (ph.cible - ph.y) * Math.min(1, dt / 160);
      ph.x += ph.dx * v; ph.y += ph.dy * v;
      if (sys === "tri") {
        if (ph.dy === 0 && ph.c === "B" && ph.x >= I1) { ph.x = I1; ph.dx = 0; ph.dy = -1; }
        if (ph.dy === 0 && ph.c === "R" && ph.x >= I2) { ph.x = I2; ph.dx = 0; ph.dy = 1; }
        if ((ph.dy < 0 && ph.y <= 46) || (ph.dy > 0 && ph.y >= 374) || (ph.dy === 0 && ph.x >= 638)) { ph.mort = true; ph.ok = true; compte.mesure++; }
      } else if (ph.x >= 586) {
        if (Math.abs(ph.y - YB) < 60 && filtreY(ph.y) === ph.c) { ph.x = 604; ph.mort = true; ph.ok = true; compte.mesure++; }
        else { ph.x = 586; ph.mort = true; ph.ok = false; compte.perdu++; }
      }
    });
    photons = photons.filter(ph => !ph.mort || ph.vie > 0);
  }

  function dessinerPrisme() {
    decor();
    photons.forEach(ph => {
      pctx.globalAlpha = ph.mort ? Math.max(0, ph.vie) : 1;
      pctx.fillStyle = RVB[ph.c];
      pctx.beginPath(); pctx.arc(ph.x, ph.y, ph.mort && !ph.ok ? 4 : 3, 0, Math.PI * 2); pctx.fill();
      if (ph.mort && !ph.ok) { pctx.strokeStyle = "rgba(255,255,255,.5)"; pctx.lineWidth = 1; pctx.beginPath(); pctx.moveTo(ph.x - 4, ph.y - 4); pctx.lineTo(ph.x + 4, ph.y + 4); pctx.stroke(); }
    });
    pctx.globalAlpha = 1;
    const tot = compte.mesure + compte.perdu;
    bilan(compte.mesure, compte.perdu);
    Application.afficher("#c4-util", tot > 30 ? O.nb(compte.mesure / tot * 100, 0) + " %" : "…");
  }
  // Le bilan, à droite de la scène : photons mesurés et photons absorbés.
  function bilan(mesures, perdus) {
    const x = 730;
    pctx.textAlign = "left"; pctx.font = O.police(12, true); pctx.fillStyle = "rgba(255,255,255,.5)";
    pctx.fillText(sys === "tri" ? "TROIS CAPTEURS" : "UN SEUL CAPTEUR", x, 120);
    pctx.font = O.police(14); pctx.fillStyle = "#30d158";
    pctx.fillText("● photons mesurés : " + (mesures === null ? "presque tous" : O.nb(mesures, 0)), x, 150);
    pctx.fillStyle = "#ff8a80";
    pctx.fillText("✕ photons absorbés : " + (perdus === null ? (sys === "tri" ? "très peu" : "≈ 2 sur 3") : O.nb(perdus, 0)), x, 176);
    pctx.font = O.police(13); pctx.fillStyle = "rgba(255,255,255,.75)";
    O.texte(pctx, sys === "tri" ? "Chaque point de l’image est mesuré en rouge, en vert et en bleu, par trois capteurs différents." : "Chaque photosite ne mesure que la couleur de son filtre ; les deux autres seront devinées (dématriçage).", x, 214, 250, 19);
  }

  // Version fixe (mouvement réduit) : les trajets sont dessinés en traits.
  function dessinerFixe() {
    decor();
    pctx.lineWidth = 3;
    const trait = (coul, pts) => { pctx.strokeStyle = coul; pctx.beginPath(); pctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) pctx.lineTo(pts[i], pts[i + 1]); pctx.stroke(); };
    if (sys === "tri") { trait(RVB.B, [10, YB - 6, I1, YB - 6, I1, 46]); trait(RVB.R, [10, YB + 6, I2, YB + 6, I2, 374]); trait(RVB.V, [10, YB, 638, YB]); }
    else { trait(RVB.R, [10, YB - 6, 586, YB - 6]); trait(RVB.V, [10, YB, 600, YB]); trait(RVB.B, [10, YB + 6, 586, YB + 6]); }
    bilan(null, null);
    Application.afficher("#c4-util", sys === "tri" ? "≈ 100 %" : "≈ 33 %");
  }

  function textes() {
    const tri = sys === "tri";
    Application.afficher("#c4-nc", tri ? "3" : "1");
    Application.afficher("#c4-mp", tri ? "3 (R, V, B)" : "1 sur 3");
    Application.afficher("#c4-dm", tri ? "Non" : "Oui");
    const m = O.el("c4-p-msg");
    m.className = tri ? "note ok" : "note warn";
    m.innerHTML = tri
      ? "<b>Tri-capteur</b> : la première face du prisme <b>réfléchit le bleu</b> vers le haut, la seconde <b>réfléchit le rouge</b> vers le bas, le <b>vert</b> continue tout droit. Presque toute la lumière est utilisée, et chaque point est mesuré dans les trois couleurs."
      : "<b>Bayer</b> : chaque photon arrive sur un filtre au hasard. S’il n’est pas de la couleur du filtre, il est <b>absorbé</b> (croix). Environ <b>deux photons sur trois</b> sont perdus, et chaque photosite ne mesure qu’une couleur.";
  }

  function boucle() {
    cancelAnimationFrame(pAnim); pAnim = null;
    if (pause || O.reduit()) { dessinerFixe(); return; }
    dernier = null;
    (function pas(now) {
      if (!O.visible(pc) || pause) { pAnim = null; return; }
      const dt = dernier === null ? 16 : Math.min(50, now - dernier); dernier = now;
      avancer(dt); dessinerPrisme();
      pAnim = requestAnimationFrame(pas);
    })(performance.now());
  }
  Application.segment("#c4-sys", [["tri", "Tri-capteur"], ["bayer", "Bayer"]], "tri", v => { sys = v; photons = []; compte = { mesure: 0, perdu: 0 }; textes(); boucle(); });
  const bp = O.el("c4-pause");
  bp.addEventListener("click", () => { pause = !pause; bp.textContent = pause ? "▶ Reprendre" : "⏸ Pause"; boucle(); });
  if (O.reduit()) { pause = true; bp.textContent = "▶ Animer"; }
  Application.surAffichage(4, () => { if (!pAnim) boucle(); });
  textes();
  boucle();
});

/* ==========================================================================
   MODULE 5 — Rolling shutter, capteurs empilés et semi-empilés
   ========================================================================== */
Application.labo(5, function () {
  const cv = O.el("c5-cv"), ctx = cv.getContext("2d");
  const ac = O.el("c5-arch"), actx = ac.getContext("2d");
  const rv = O.el("c5-v"), rt = O.el("c5-t");
  const PW = 480, PH = 300, GX = 13, DX = 507, PY = 18;  // deux panneaux de 480 × 300
  const vivant = ctx.createImageData(PW, PH), image = ctx.createImageData(PW, PH);
  const ARCH = {
    classique: { nom: "Classique", t: 30 },
    semi: { nom: "Semi-empilé", t: 14 },
    empile: { nom: "Empilé", t: 4 },
    global: { nom: "Global", t: 0 }
  };
  const RAPIDITE = 40 / 2600;  // ms simulées par ms réelles : 40 ms de lecture durent 2,6 s à l'écran
  const T_EXPO = 20, T_FLASH = -6; // exposition 1/50 s ; flash 6 ms avant la lecture de la 1re ligne
  let arch = "classique", sujet = "poteaux", pause = false, anim = null, dernier = null;
  let T = 0, prise = null;

  /* La scène, en fonction du temps (ms) : renvoie la couleur d'un point. */
  function couleur(x, y, t, eclaire) {
    if (sujet === "poteaux") {
      const v = +rv.value * PW / 1000;          // largeurs d'image par seconde → px/ms
      if (y > 240) return [52 + (y - 240) * 0.4, 70, 48];
      for (let i = 0; i < 5; i++) {
        const xp = ((i * 110 + v * t) % 550 + 550) % 550 - 35;
        if (x >= xp && x < xp + 16 && y > 50) return [255, 159, 10];
        if (x >= xp - 22 && x < xp + 38 && y > 46 && y < 58) return [255, 200, 120];
      }
      return [30 + y * 0.12, 60 + y * 0.18, 110 + y * 0.25];
    }
    if (sujet === "helice") {
      const dx = x - 240, dy = y - 150, r = Math.hypot(dx, dy);
      if (r < 14) return [200, 200, 205];
      if (r < 128) {
        const w = 2 * Math.PI * (+rv.value * 4) / 1000; // tours par seconde → rad/ms
        const th = Math.atan2(dy, dx);
        for (let b = 0; b < 3; b++) {
          let d = th - (w * t + b * 2 * Math.PI / 3); d = Math.atan2(Math.sin(d), Math.cos(d));
          if (Math.abs(d) < 0.22 - r * 0.0008) return [235, 235, 240];
        }
      }
      return [18 + y * 0.05, 28 + y * 0.08, 52 + y * 0.12];
    }
    // flash : une personne dans une pièce sombre
    const k = eclaire ? 1 : 0.16;
    const dxh = x - 240, dyh = y - 105;
    if (dxh * dxh / 676 + dyh * dyh / 900 < 1) return [224 * k, 172 * k, 138 * k];
    if (x > 190 && x < 290 && y > 140 && (y > 150 || Math.abs(x - 240) < 40)) return [70 * k, 110 * k, 200 * k];
    if (y > 250) return [90 * k, 70 * k, 55 * k];
    return [60 * k + 6, 58 * k + 6, 64 * k + 8];
  }
  const tLecture = () => +rt.value;
  const ligneEclairee = ty => ty >= T_FLASH && ty <= T_FLASH + T_EXPO;

  function remplir(imgd, y, t, eclaire) {
    for (let x = 0; x < PW; x++) {
      const c = couleur(x, y, t, eclaire), i = (y * PW + x) * 4;
      imgd.data[i] = c[0]; imgd.data[i + 1] = c[1]; imgd.data[i + 2] = c[2]; imgd.data[i + 3] = 255;
    }
  }

  function nouvellePrise() {
    prise = { debut: T + 8, ligne: -1, finie: false, finA: 0 };
    for (let i = 0; i < image.data.length; i += 4) { image.data[i] = 22; image.data[i + 1] = 23; image.data[i + 2] = 26; image.data[i + 3] = 255; }
    if (pause || O.reduit()) { T = prise.debut + tLecture() / 2; capturer(true); }
  }
  // Lit les lignes dont l'instant de lecture est passé.
  function capturer(tout) {
    const tr = tLecture(), rel = T - prise.debut;
    if (prise.finie || (rel < 0 && !tout)) return;
    const cible = tout || tr === 0 ? PH - 1 : Math.min(PH - 1, Math.floor(rel / tr * PH));
    for (let y = prise.ligne + 1; y <= cible; y++) {
      const ty = tr === 0 ? 0 : y / PH * tr;
      remplir(image, y, prise.debut + ty, ligneEclairee(ty));
    }
    prise.ligne = cible;
    if (cible === PH - 1) { prise.finie = true; prise.finA = T; }
  }

  function dessinerScene() {
    const flash = sujet === "flash" && Math.abs(T - (prise.debut + T_FLASH)) < 1.2;
    for (let y = 0; y < PH; y++) remplir(vivant, y, T, flash);
    ctx.fillStyle = "#0b0c0e"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.putImageData(vivant, GX, PY);
    ctx.putImageData(image, DX, PY);
    if (flash) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(GX, PY, PW, PH); }
    // la ligne de lecture
    if (!prise.finie && prise.ligne >= 0) {
      ctx.strokeStyle = "#ff453a"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(DX - 6, PY + prise.ligne); ctx.lineTo(DX + PW + 6, PY + prise.ligne); ctx.stroke();
    }
    ctx.font = O.police(12, true); ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText("SCÈNE RÉELLE", GX + 8, PY + 18);
    ctx.fillText("IMAGE ENREGISTRÉE", DX + 8, PY + 18);
    ctx.font = O.police(12); ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.textAlign = "right";
    const rel = T - prise.debut, tr = tLecture();
    ctx.fillText(rel < 0 ? "avant la lecture" : prise.finie ? "lecture terminée" : "t = " + O.nb(rel, 1) + " ms", GX + PW - 8, PY + 18);
    ctx.fillText(tr === 0 ? "toutes les lignes en même temps" : prise.finie ? "lue en " + tr + " ms" : "ligne " + O.nb(Math.max(0, Math.round(prise.ligne / PH * 2160)), 0) + " / 2 160", DX + PW - 8, PY + 18);
  }

  /* Le schéma de l'architecture, et la comparaison des temps de lecture. */
  function plaque(x, y, w, d, h, coul, bord) {
    const dx = d * 0.9, dy = d * 0.45;
    actx.fillStyle = coul; actx.strokeStyle = bord || "rgba(255,255,255,.5)"; actx.lineWidth = 1.2;
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + w, y); actx.lineTo(x + w + dx, y - dy); actx.lineTo(x + dx, y - dy); actx.closePath(); actx.fill(); actx.stroke();
    actx.globalAlpha = 0.75; actx.beginPath(); actx.rect(x, y, w, h); actx.fill(); actx.stroke();
    actx.beginPath(); actx.moveTo(x + w, y); actx.lineTo(x + w + dx, y - dy); actx.lineTo(x + w + dx, y - dy + h); actx.lineTo(x + w, y + h); actx.closePath(); actx.fill(); actx.stroke();
    actx.globalAlpha = 1;
  }
  function grille(x, y, w, d, n, coul) {
    const dx = d * 0.9, dy = d * 0.45;
    actx.strokeStyle = coul; actx.lineWidth = 1;
    for (let i = 1; i < n; i++) { const f = i / n; actx.beginPath(); actx.moveTo(x + w * f, y); actx.lineTo(x + w * f + dx, y - dy); actx.stroke(); actx.beginPath(); actx.moveTo(x + dx * f, y - dy * f); actx.lineTo(x + w + dx * f, y - dy * f); actx.stroke(); }
  }
  function dessinerArchi() {
    const W2 = ac.width, H2 = ac.height;
    actx.fillStyle = "#0b0c0e"; actx.fillRect(0, 0, W2, H2);
    actx.font = O.police(12); actx.textAlign = "left";
    const X = 40, L = 270, D = 110, PD = "rgba(41,151,255,.55)", CI = "rgba(255,159,10,.75)", XL = X + L + D * 0.9 + 14, AR = (D - 26) * 0.9, AH = (D - 26) * 0.45;
    const legende = (txt, x, y, coul) => { actx.fillStyle = coul || "rgba(255,255,255,.8)"; actx.fillText(txt, x, y); };
    if (arch === "classique") {
      plaque(X, 150, L, D, 22, PD);
      grille(X, 150, L, D, 10, "rgba(255,255,255,.18)");
      // bandes de convertisseurs, sur la même puce, à l'avant et à l'arrière
      actx.fillStyle = CI; actx.beginPath(); actx.moveTo(X, 150); actx.lineTo(X + L, 150); actx.lineTo(X + L + 6, 147); actx.lineTo(X + 6, 147); actx.fill();
      plaque(X, 172, L, 10, 10, CI);
      legende("photodiodes et circuits sur la même puce", X, 222);
      legende("convertisseurs en bordure : peu de lignes lues à la fois", X, 240, "#ffb340");
    } else if (arch === "semi") {
      plaque(X, 200, L, 26, 14, CI); plaque(X + AR, 200 - AH, L, 26, 14, CI);
      plaque(X, 120, L, D, 18, PD);
      grille(X, 120, L, D, 10, "rgba(255,255,255,.18)");
      actx.setLineDash([4, 5]); actx.strokeStyle = "rgba(255,255,255,.35)";
      [[X + 20, 138, X + 20, 186], [X + L - 20, 138, X + L - 20, 186]].forEach(s => { actx.beginPath(); actx.moveTo(s[0], s[1]); actx.lineTo(s[2], s[3]); actx.stroke(); });
      actx.setLineDash([]);
      legende("photodiodes (rétroéclairées)", XL, 70);
      legende("circuits rapides empilés en DEUX BANDES", X, 236, "#ffb340");
      legende("(au-dessus et au-dessous de la zone d’image)", X, 252, "#ffb340");
    } else if (arch === "empile") {
      plaque(X, 205, L, D, 14, "rgba(175,82,222,.6)");
      plaque(X, 165, L, D, 16, CI);
      plaque(X, 115, L, D, 16, PD);
      grille(X, 115, L, D, 10, "rgba(255,255,255,.18)");
      grille(X, 165, L, D, 14, "rgba(0,0,0,.25)");
      legende("photodiodes (rétroéclairées)", XL, 66);
      legende("circuits de lecture", XL, 118, "#ffb340"); legende("sur TOUTE la surface", XL, 134, "#ffb340");
      legende("mémoire (selon les modèles)", XL, 176, "#d29bf2");
    } else {
      plaque(X, 150, L, D, 22, PD);
      const dx = D * 0.9, dy = D * 0.45;
      for (let j = 0; j < 6; j++) for (let i = 0; i < 10; i++) {
        const fx = (i + 0.7) / 10, fy = (j + 0.5) / 6;
        actx.fillStyle = "#d29bf2"; actx.fillRect(X + L * fx + dx * fy - 3, 150 - dy * fy - 2, 7, 4);
      }
      grille(X, 150, L, D, 10, "rgba(255,255,255,.18)");
      legende("une petite mémoire dans chaque photosite :", X, 222, "#d29bf2");
      legende("toutes les charges sont figées au même instant", X, 240, "#d29bf2");
    }
    // les temps de lecture typiques
    const BX = 670, BW = 310;
    actx.font = O.police(12, true); actx.fillStyle = "rgba(255,255,255,.5)"; actx.fillText("TEMPS DE LECTURE TYPIQUE", BX, 30);
    Object.keys(ARCH).forEach((k, i) => {
      const y = 52 + i * 48, a = ARCH[k], choisi = k === arch;
      actx.font = O.police(13, choisi); actx.fillStyle = choisi ? "#fff" : "rgba(255,255,255,.6)"; actx.fillText(a.nom, BX, y + 14);
      actx.fillStyle = "rgba(255,255,255,.08)"; O.rect(actx, BX + 110, y + 2, BW - 110, 16, 6); actx.fill();
      if (a.t) { actx.fillStyle = choisi ? "#ff453a" : "rgba(255,69,58,.45)"; O.rect(actx, BX + 110, y + 2, (BW - 110) * a.t / 40, 16, 6); actx.fill(); }
      actx.font = O.police(12, true); actx.fillStyle = choisi ? "#fff" : "rgba(255,255,255,.6)";
      actx.fillText(a.t ? "≈ " + a.t + " ms" : "simultané", BX + 118 + (a.t ? (BW - 110) * a.t / 40 : 0), y + 14);
    });
  }

  function valeurs() {
    const tr = tLecture(), v = +rv.value;
    Application.afficher("#c5-vo", sujet === "helice" ? O.nb(v * 4, 0) + " tr/s" : sujet === "flash" ? "—" : O.nb(v, 1) + " im/s");
    Application.afficher("#c5-to", tr ? tr + " ms" : "0 (global)");
    O.el("c5-vl").textContent = sujet === "helice" ? "Rotation" : "Panoramique";
    rv.disabled = sujet === "flash";
    Application.afficher("#c5-tr", tr ? tr + " ms" : "simultané");
    Application.afficher("#c5-fmax", tr ? O.nb(Math.floor(1000 / tr), 0) + " im/s" : "—");
    const l3 = O.el("c5-l3"), l4 = O.el("c5-l4"), dpx = v * 3840 * tr / 1000, ang = Math.atan(dpx / 2160) * 180 / Math.PI;
    let calc = '<div><span class="c">t<sub>ligne</sub> = t<sub>lecture</sub> / 2 160</span> = ' + (tr ? O.nb(tr * 1000 / 2160, 1) + " µs par ligne" : "— (lecture globale)") + "</div>";
    if (sujet === "poteaux") {
      l3.textContent = "Décalage (UHD)"; l4.textContent = "Inclinaison";
      Application.afficher("#c5-d", O.nb(dpx, 0) + " px"); Application.afficher("#c5-a", O.nb(ang, 1) + "°");
      calc += '<div><span class="c">v</span> = ' + O.nb(v, 1) + " × 3 840 = " + O.nb(v * 3840, 0) + " px/s</div>" +
        '<div><span class="c">d = v × t<sub>lecture</sub></span> = ' + O.nb(v * 3840, 0) + " × " + O.nb(tr / 1000, 3) + " = <b>" + O.nb(dpx, 0) + " px</b></div>" +
        '<div><span class="c">α = arctan(d / 2 160)</span> = <b>' + O.nb(ang, 1) + "°</b></div>";
    } else if (sujet === "helice") {
      const tours = v * 4 * tr / 1000;
      l3.textContent = "Rotation pendant la lecture"; l4.textContent = "Soit";
      Application.afficher("#c5-d", O.nb(tours * 360, 0) + "°"); Application.afficher("#c5-a", O.nb(tours, 2) + " tour");
      calc += '<div><span class="c">angle = tours/s × t<sub>lecture</sub> × 360°</span> = ' + O.nb(v * 4, 0) + " × " + O.nb(tr / 1000, 3) + " × 360 = <b>" + O.nb(tours * 360, 0) + "°</b></div>";
    } else {
      let lit = 0; for (let y = 0; y < PH; y++) if (ligneEclairee(tr === 0 ? 0 : y / PH * tr)) lit++;
      l3.textContent = "Lignes éclairées"; l4.textContent = "Exposition";
      Application.afficher("#c5-d", O.nb(lit / PH * 100, 0) + " %"); Application.afficher("#c5-a", "1/50 s");
      calc += '<div><span class="c">Une ligne voit le flash si</span> elle est en train de s’exposer à cet instant</div><div><span class="c">exposition 20 ms, lecture ' + tr + ' ms</span> → <b>' + O.nb(lit / PH * 100, 0) + " %</b> des lignes éclairées</div>";
    }
    calc += '<div><span class="c">f<sub>max</sub> ≈ 1 / t<sub>lecture</sub></span> = ' + (tr ? O.nb(1000 / tr, 0) + " images/s" : "non limitée par la lecture") + "</div>";
    O.el("c5-calc").innerHTML = calc;

    const msg = O.el("c5-msg");
    const nomArch = { classique: "capteur <b>classique</b>", semi: "capteur <b>semi-empilé</b>", empile: "capteur <b>empilé</b>", global: "<b>obturateur global</b>" }[arch];
    if (tr === 0) {
      msg.className = "note ok";
      msg.innerHTML = "Avec un " + nomArch + ", toutes les lignes sont exposées <b>au même instant</b> : poteaux droits, pales nettes, flash entier. Le prix à payer : une mémoire dans chaque photosite, donc un peu moins de place pour la photodiode.";
    } else if (sujet === "flash") {
      const lit = (function () { let n = 0; for (let y = 0; y < PH; y++) if (ligneEclairee(y / PH * tr)) n++; return n; })();
      msg.className = lit < PH ? "note bad" : "note ok";
      msg.innerHTML = lit < PH
        ? "<b>Flash coupé !</b> Le flash ne dure qu’une milliseconde. Avec une lecture de " + tr + " ms et une exposition de 20 ms, seules les lignes <b>en train de s’exposer</b> à cet instant le reçoivent : le bas de l’image reste sombre."
        : "Avec une lecture de " + tr + " ms, plus courte que l’exposition (20 ms), toutes les lignes s’exposaient au moment du flash : l’image est entière. Allongez le temps de lecture pour voir le défaut.";
    } else if (tr >= 20) {
      msg.className = "note bad";
      msg.innerHTML = "Avec un " + nomArch + " (" + tr + " ms), le bas de l’image est enregistré " + tr + " ms après le haut : " + (sujet === "poteaux" ? "les poteaux <b>penchent</b> de " + O.nb(ang, 1) + "°" : "les pales sont <b>tordues</b> et détachées du moyeu") + ". C’est l’effet <b>rolling shutter</b> : l’image est nette, mais déformée.";
    } else if (tr >= 9) {
      msg.className = "note warn";
      msg.innerHTML = "Un " + nomArch + " lit en ≈ " + tr + " ms : deux à trois fois plus vite qu’un capteur classique. La déformation est nettement réduite, sans disparaître : " + (sujet === "poteaux" ? O.nb(ang, 1) + "° d’inclinaison" : "les pales restent un peu courbées") + ".";
    } else {
      msg.className = "note ok";
      msg.innerHTML = "Un " + nomArch + " lit tout le capteur en " + tr + " ms : la déformation devient presque invisible (" + (sujet === "poteaux" ? O.nb(ang, 1) + "°" : O.nb(+rv.value * 4 * tr / 1000 * 360, 0) + "° de rotation pendant la lecture") + "). C’est aussi ce qui permet les hautes cadences.";
    }
    O.el("c5-etat").textContent = ARCH[arch].nom;
  }

  function image1() { capturer(false); dessinerScene(); }
  function boucle() {
    cancelAnimationFrame(anim); anim = null;
    if (pause || O.reduit()) { dessinerScene(); return; }
    dernier = null;
    (function pas(now) {
      if (!O.visible(cv) || pause) { anim = null; return; }
      const dt = dernier === null ? 16 : Math.min(60, now - dernier); dernier = now;
      T += dt * RAPIDITE;
      if (prise.finie && T - prise.finA > 1500 * RAPIDITE) nouvellePrise();
      image1();
      anim = requestAnimationFrame(pas);
    })(performance.now());
  }
  function changer() { valeurs(); dessinerArchi(); nouvellePrise(); if (pause || O.reduit()) dessinerScene(); }

  Application.segment("#c5-type", Object.keys(ARCH).map(k => [k, ARCH[k].nom]), arch, v => { arch = v; O.curseur(rt, ARCH[v].t); });
  Application.segment("#c5-sujet", [["poteaux", "Poteaux"], ["helice", "Hélice"], ["flash", "Flash"]], sujet, v => { sujet = v; changer(); });
  rv.addEventListener("input", changer);
  rt.addEventListener("input", changer);
  const bp = O.el("c5-pause");
  bp.addEventListener("click", () => { pause = !pause; bp.textContent = pause ? "▶ Reprendre" : "⏸ Pause"; if (pause) { nouvellePrise(); dessinerScene(); } else boucle(); });
  O.el("c5-rejouer").addEventListener("click", () => { nouvellePrise(); if (pause || O.reduit()) dessinerScene(); });
  if (O.reduit()) { pause = true; bp.textContent = "▶ Animer"; }
  Application.surAffichage(5, () => { if (!anim) boucle(); });
  changer();
  boucle();
});

/* ==========================================================================
   MODULE 6 — Taille du capteur : champ, focale équivalente, flou
   ========================================================================== */
Application.labo(6, function () {
  const cv = O.el("c6-cv"), ctx = cv.getContext("2d"), W = cv.width, Hc = cv.height;
  const fc = O.el("c6-formats"), fctx = fc.getContext("2d");
  const selF = O.el("c6-format"), rf = O.el("c6-fs"), selN = O.el("c6-n");
  const F = FORMATS_CAPTEUR;              // défini dans contenu.js
  const S = 3000, ZB = 30000, YC = 1550;  // sujet à 3 m, fond à 30 m, caméra à 1,55 m (en mm)
  let mode = "cadre", minuterie = null, auto = false;
  const filtreOk = typeof ctx.filter === "string";

  // Les lumières de la ville (positions fixes, tirées une fois pour toutes)
  const LUMIERES = [];
  for (let i = 0; i < 170; i++) LUMIERES.push({ x: (O.alea(i * 3.1) - 0.5) * 90000, y: 600 + Math.pow(O.alea(i * 7.7 + 1), 1.6) * 22000, c: ["#ffcf6b", "#ffb347", "#ff8a5c", "#9fd4ff", "#ffe9b0", "#ff6b8a"][i % 6], t: 0.6 + O.alea(i * 1.9) * 0.6 });
  const IMMEUBLES = [];
  for (let i = 0, x = -48000; x < 48000; i++) { const w = 3000 + O.alea(i * 5.3) * 6000; IMMEUBLES.push({ x: x, w: w, h: 6000 + O.alea(i * 2.7) * 20000 }); x += w + 400; }

  function reglages() {
    const fmt = F[+selF.value], k = DIAG_PF / fmt.d, N = +selN.value;
    const f = mode === "cadre" ? +rf.value / k : +rf.value;
    const L = fmt.l;                         // largeur utilisée (image 16/9 recadrée dans la largeur)
    const ech = f / L * W;                   // px par unité de X/Z
    const c = f * f * (ZB - S) / (N * ZB * (S - f)), cpx = c / L * W;   // tache de flou du fond
    const cc = fmt.d / 1500, Hy = f * f / (N * cc) + f;                  // cercle de confusion, hyperfocale
    const pres = S * (Hy - f) / (Hy + S - 2 * f), loin = Hy > S ? S * (Hy - f) / (Hy - S) : Infinity;
    return { fmt: fmt, k: k, N: N, f: f, L: L, ech: ech, cpx: cpx, pres: pres, loin: loin, alpha: 2 * Math.atan(L / (2 * f)) * 180 / Math.PI };
  }

  function dessinerScene(r) {
    const X = (x, z) => W / 2 + x / z * r.ech, Y = (y, z) => Hc / 2 - (y - YC) / z * r.ech;
    // ciel et sol
    const ciel = ctx.createLinearGradient(0, 0, 0, Hc);
    ciel.addColorStop(0, "#07081a"); ciel.addColorStop(0.5, "#1b1530"); ciel.addColorStop(1, "#0d0d12");
    ctx.fillStyle = ciel; ctx.fillRect(0, 0, W, Hc);
    // immeubles (flous si le navigateur sait flouter)
    const flou = Math.max(0, r.cpx / 2.2);
    if (filtreOk) ctx.filter = flou > 0.6 ? "blur(" + flou.toFixed(1) + "px)" : "none";
    ctx.fillStyle = "#151526";
    IMMEUBLES.forEach(b => { const x1 = X(b.x, ZB), x2 = X(b.x + b.w, ZB); if (x2 < -50 || x1 > W + 50) return; ctx.fillRect(x1, Y(b.h, ZB), x2 - x1, Y(0, ZB) - Y(b.h, ZB) + 2); });
    if (filtreOk) ctx.filter = "none";
    ctx.fillStyle = "#101014"; ctx.fillRect(0, Y(0, ZB), W, Hc);
    // lumières : chaque point flou devient un disque, d'autant plus pâle qu'il est grand
    const d = Math.max(2.4, r.cpx);
    ctx.globalCompositeOperation = "lighter";
    LUMIERES.forEach(l => {
      const x = X(l.x, ZB), y = Y(l.y, ZB);
      if (x < -d || x > W + d || y < -d || y > Hc + d) return;
      ctx.globalAlpha = O.borne(Math.pow(6 / d, 1.3), 0.08, 1) * l.t;
      ctx.fillStyle = l.c; ctx.beginPath(); ctx.arc(x, y, d / 2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    // le sujet, net (mise au point à 3 m)
    const sx = X(0, S), u = r.ech / S;                 // px par mm à 3 m
    const cou = Y(1450, S);
    const veste = ctx.createLinearGradient(sx - 300 * u, 0, sx + 300 * u, 0);
    veste.addColorStop(0, "#1f3f66"); veste.addColorStop(0.5, "#2f5f96"); veste.addColorStop(1, "#1a3557");
    ctx.fillStyle = veste;
    ctx.beginPath(); ctx.moveTo(sx - 240 * u, Hc + 10); ctx.lineTo(sx - 240 * u, Y(1310, S)); ctx.quadraticCurveTo(sx - 235 * u, cou + 20 * u, sx - 70 * u, cou); ctx.lineTo(sx + 70 * u, cou); ctx.quadraticCurveTo(sx + 235 * u, cou + 20 * u, sx + 240 * u, Y(1310, S)); ctx.lineTo(sx + 240 * u, Hc + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c98f6e"; ctx.fillRect(sx - 45 * u, Y(1530, S), 90 * u, (1530 - 1430) * u);
    ctx.fillStyle = "#e3ad8c"; ctx.beginPath(); ctx.ellipse(sx, Y(1640, S), 92 * u, 118 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a1c16"; ctx.beginPath(); ctx.ellipse(sx, Y(1700, S), 98 * u, 78 * u, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a2a22"; ctx.beginPath(); ctx.ellipse(sx - 32 * u, Y(1650, S), 9 * u, 6 * u, 0, 0, Math.PI * 2); ctx.ellipse(sx + 32 * u, Y(1650, S), 9 * u, 6 * u, 0, 0, Math.PI * 2); ctx.fill();
    // lumière de contour pour détacher le sujet
    ctx.strokeStyle = "rgba(255,190,130,.35)"; ctx.lineWidth = Math.max(1, 6 * u);
    ctx.beginPath(); ctx.ellipse(sx, Y(1640, S), 92 * u, 118 * u, 0, -0.9, 0.5); ctx.stroke();
    // repère : largeur du champ à 3 m
    ctx.font = O.police(13, true); ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.textAlign = "left";
    ctx.fillText(r.fmt.nom + " · " + O.nb(r.f, 1) + " mm · F" + O.nb(r.N, 1), 16, 26);
    ctx.font = O.police(12); ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.fillText("champ à 3 m : " + O.nb(S * r.L / r.f / 1000, 2) + " m de large", 16, 46);
  }

  function dessinerFormats(r) {
    const W2 = fc.width, H2 = fc.height, ech = Math.min(500 / 54.1, 216 / 25.6), cx = 290, cy = 168;
    fctx.fillStyle = "#0b0c0e"; fctx.fillRect(0, 0, W2, H2);
    // cercle image prévu pour le format choisi
    fctx.setLineDash([6, 6]); fctx.strokeStyle = "rgba(255,214,10,.6)"; fctx.lineWidth = 1.5;
    fctx.beginPath(); fctx.arc(cx, cy, r.fmt.d / 2 * ech, 0, Math.PI * 2); fctx.stroke(); fctx.setLineDash([]);
    F.slice().reverse().forEach(f => {
      const w = f.l * ech, h = f.h * ech, choisi = f === r.fmt, rang = F.indexOf(f);
      if (choisi) { const g = fctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, "rgba(0,113,227,.55)"); g.addColorStop(1, "rgba(175,82,222,.55)"); fctx.fillStyle = g; fctx.fillRect(cx - w / 2, cy - h / 2, w, h); }
      fctx.strokeStyle = choisi ? "#fff" : "rgba(255,255,255,.32)"; fctx.lineWidth = choisi ? 2 : 1;
      fctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      // étiquettes en quinconce (au-dessus à gauche, au-dessous à droite) pour ne pas se chevaucher
      if (w > 60 && !choisi) {
        fctx.font = O.police(11); fctx.fillStyle = "rgba(255,255,255,.5)";
        if (rang % 2 === 0) { fctx.textAlign = "left"; fctx.fillText(f.nom, cx - w / 2 + 3, cy - h / 2 - 4); }
        else { fctx.textAlign = "right"; fctx.fillText(f.nom, cx + w / 2 - 3, cy + h / 2 + 13); }
      }
    });
    fctx.font = O.police(13, true); fctx.fillStyle = "#fff"; fctx.textAlign = "left";
    fctx.fillText(r.fmt.nom + " : " + O.nb(r.fmt.l, 1) + " × " + O.nb(r.fmt.h, 1) + " mm · diagonale " + O.nb(r.fmt.d, 1) + " mm", 16, 22);
    fctx.font = O.police(12); fctx.fillStyle = "rgba(255,214,10,.85)"; fctx.fillText("- - cercle image minimal (⌀ " + O.nb(r.fmt.d, 1) + " mm)", 16, 40);
    // angle de champ : celui du capteur choisi, et celui du plein format à la même focale
    const ox = 650, oy = cy, R = 300;
    const tracer = (a, coul, tir) => {
      fctx.strokeStyle = coul; fctx.lineWidth = 2; fctx.setLineDash(tir ? [6, 6] : []);
      const h = a / 2 * Math.PI / 180;
      fctx.beginPath(); fctx.moveTo(ox + R * Math.cos(h), oy - R * Math.sin(h)); fctx.lineTo(ox, oy); fctx.lineTo(ox + R * Math.cos(h), oy + R * Math.sin(h)); fctx.stroke();
      fctx.setLineDash([]);
    };
    const aPF = 2 * Math.atan(36 / (2 * r.f)) * 180 / Math.PI;
    if (Math.abs(aPF - r.alpha) > 0.5) tracer(aPF, "rgba(255,255,255,.3)", true);
    tracer(r.alpha, "#2997ff", false);
    fctx.fillStyle = "rgba(41,151,255,.15)"; fctx.beginPath(); fctx.moveTo(ox, oy); fctx.arc(ox, oy, 70, -r.alpha / 2 * Math.PI / 180, r.alpha / 2 * Math.PI / 180); fctx.closePath(); fctx.fill();
    fctx.fillStyle = "#e8e8ed"; O.rect(fctx, ox - 30, oy - 14, 26, 28, 5); fctx.fill();
    fctx.font = O.police(14, true); fctx.fillStyle = "#6db8ff"; fctx.textAlign = "left";
    fctx.fillText("α = " + O.nb(r.alpha, 1) + "°", ox + 80, oy + 5);
    if (Math.abs(aPF - r.alpha) > 0.5) { fctx.font = O.police(12); fctx.fillStyle = "rgba(255,255,255,.55)"; fctx.fillText("- - plein format, même focale : " + O.nb(aPF, 1) + "°", ox - 30, H2 - 14); }
  }

  function dessiner() {
    const r = reglages();
    O.el("c6-fl").textContent = mode === "cadre" ? "Focale équiv." : "Focale";
    Application.afficher("#c6-fo", O.nb(+rf.value, 0) + " mm");
    dessinerScene(r);
    dessinerFormats(r);

    const flouPct = r.cpx / W * 100;
    Application.afficher("#c6-k", O.nb(r.k, 2));
    Application.afficher("#c6-f", O.nb(r.f, 1) + " mm");
    Application.afficher("#c6-feq", O.nb(r.f * r.k, 0) + " mm");
    Application.afficher("#c6-a", O.nb(r.alpha, 1) + "°");
    const pdc = r.loin - r.pres;
    Application.afficher("#c6-pdc", !isFinite(pdc) ? "→ ∞" : pdc < 1000 ? O.nb(pdc / 10, 0) + " cm" : O.nb(pdc / 1000, 1) + " m");
    Application.afficher("#c6-flou", O.nb(flouPct, flouPct < 1 ? 2 : 1) + " %");
    O.el("c6-etat").textContent = mode === "cadre" ? "même cadre qu’un " + O.nb(+rf.value, 0) + " mm plein format" : "focale de " + O.nb(+rf.value, 0) + " mm sur tous les capteurs";

    O.el("c6-calc").innerHTML =
      '<div><span class="c">k = 43,3 / d</span> = 43,3 / ' + O.nb(r.fmt.d, 1) + " = <b>" + O.nb(r.k, 2) + "</b></div>" +
      (mode === "cadre"
        ? '<div><span class="c">f = f<sub>éq</sub> / k</span> = ' + O.nb(+rf.value, 0) + " / " + O.nb(r.k, 2) + " = <b>" + O.nb(r.f, 1) + " mm</b></div>"
        : '<div><span class="c">f<sub>éq</sub> = f × k</span> = ' + O.nb(r.f, 0) + " × " + O.nb(r.k, 2) + " = <b>" + O.nb(r.f * r.k, 0) + " mm</b></div>") +
      '<div><span class="c">α = 2 × arctan(L / 2f)</span> = 2 × arctan(' + O.nb(r.L, 1) + " / " + O.nb(2 * r.f, 1) + ") = <b>" + O.nb(r.alpha, 1) + "°</b></div>" +
      '<div><span class="c">N<sub>éq</sub> = N × k</span> = ' + O.nb(r.N, 1) + " × " + O.nb(r.k, 2) + " = F" + O.nb(r.N * r.k, 1) + " (profondeur de champ en plein format)</div>" +
      '<div><span class="c">Tache de flou du fond</span> = ' + O.nb(flouPct, 2) + " % de la largeur d’image</div>";

    const msg = O.el("c6-msg");
    if (mode === "focale") {
      msg.className = r.k > 1.6 ? "note warn" : "note info";
      msg.innerHTML = r.k > 1.05
        ? "<b>Même focale, " + O.nb(r.f, 0) + " mm</b> : le " + r.fmt.nom + " ne voit que le centre de l’image formée par l’objectif. Le cadre est " + O.nb(r.k, 1) + " fois plus serré qu’en plein format, comme avec un " + O.nb(r.f * r.k, 0) + " mm. La focale n’a pas changé : c’est le <b>champ</b> qui a changé."
        : "<b>Même focale, " + O.nb(r.f, 0) + " mm</b>. Le " + r.fmt.nom + " " + (r.k < 0.95 ? "voit un champ <b>plus large</b> qu’un plein format : un " + O.nb(r.f, 0) + " mm s’y comporte comme un " + O.nb(r.f * r.k, 0) + " mm." : "est la référence : focale équivalente = focale réelle.") + " Passez en « même cadre » pour comparer les flous.";
    } else {
      msg.className = r.k > 2.5 ? "note warn" : "note ok";
      msg.innerHTML = "<b>Même cadre</b> qu’un " + O.nb(+rf.value, 0) + " mm plein format : il faut ici un <b>" + O.nb(r.f, 1) + " mm</b>. À F" + O.nb(r.N, 1) + ", la zone nette va de " + O.nb(r.pres / 1000, 2) + " m à " + (isFinite(r.loin) ? O.nb(r.loin / 1000, 2) + " m" : "l’infini") + ". " +
        (r.k > 2.5 ? "Petit capteur : focale courte, <b>grande profondeur de champ</b> ; les lumières du fond restent presque des points. Pratique en reportage, peu « cinéma »."
          : r.k < 0.95 ? "Grand format : focale longue, <b>très peu de profondeur de champ</b> ; le fond se fond en grands disques."
            : "Plus le capteur est grand, plus la focale est longue et plus le fond est flou : passez du 2/3″ au plein format pour comparer les disques des lumières.") +
        " Pour le même flou en plein format, il faudrait F" + O.nb(r.N * r.k, 1) + ".";
    }
  }

  function arreter() { clearInterval(minuterie); minuterie = null; O.el("c6-defiler").textContent = "▶ Faire défiler les capteurs"; }
  selF.addEventListener("change", () => { if (!auto) arreter(); dessiner(); });
  selN.addEventListener("change", dessiner);
  rf.addEventListener("input", dessiner);
  Application.segment("#c6-mode", [["focale", "Même focale"], ["cadre", "Même cadre"]], mode, v => { mode = v; dessiner(); });
  const segMode = O.el("c6-mode");
  O.el("c6-defiler").addEventListener("click", function () {
    if (minuterie) { arreter(); return; }
    this.textContent = "⏸ Arrêter";
    minuterie = setInterval(() => { if (!O.visible(cv)) { arreter(); return; } auto = true; selF.value = String((+selF.value + 1) % F.length); selF.dispatchEvent(new Event("change")); auto = false; }, 2200);
  });
  O.situations("c6-situations", s => {
    arreter();
    const r = { rep: ["2", "cadre", 50, "4"], cine: ["4", "cadre", 50, "2"], pf: ["5", "cadre", 85, "1.4"], recadre: ["2", "focale", 50, "2.8"] }[s];
    selF.value = r[0]; segMode._choisir(r[1]); O.curseur(rf, r[2]); selN.value = r[3]; dessiner();
  });
  dessiner();
});
