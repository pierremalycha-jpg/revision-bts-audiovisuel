/* ==========================================================================
   contenu.js — le contenu de l'application « Microphones »
   --------------------------------------------------------------------------
   Huit modules :
     1. Du son au signal          pression acoustique, dB SPL, fréquence, λ
     2. Technologies de micro     dynamique, ruban, électrostatique, électret, MEMS
     3. Les capsules              pression, gradient de pression, double membrane,
                                  effet de proximité, taille de membrane
     4. La directivité            diagrammes polaires, A + B·cos θ, indice de
                                  directivité, facteur de distance, micro canon
     5. Sensibilité, fiche technique   mV/Pa, dBV, bruit propre, SPL max, gain
     6. Types de micros           main, cravate, serre-tête, canon, PZM, HF,
                                  accessoires, distance critique, filtre en peigne
     7. Liaisons et alimentations symétrique / asymétrique, XLR, fantôme P48,
                                  T12, plug-in power, niveaux, micro numérique
                                  AES42 (modes synchrone et asynchrone)
     8. Couples stéréophoniques   XY, Blumlein, MS, AB, ORTF, NOS

   Ce fichier ne contient que du texte, des schémas (SVG) et les FORMULES
   PHYSIQUES partagées (objet MICRO, tableau DIRECTIVITES) : labos.js, chargé
   après, s'en sert aussi. Une seule source pour chaque formule : le cours,
   les labos et les corrections ne peuvent pas se contredire.

   Conventions de calcul :
     - célérité du son : c = 343 m/s (air à 20 °C) ; « ≈ 340 m/s » est un
       arrondi courant, accepté par la tolérance de 3 % des réponses ;
     - pression de référence : p0 = 20 µPa = 2·10⁻⁵ Pa (0 dB SPL) ;
     - 1 Pa = 94 dB SPL (93,98 dB) : la référence des fiches techniques ;
     - dBu : référence 0,775 V ; dBV : référence 1 V.

   CONTENU À VALIDER : relis et adapte au référentiel du BTS avant de le
   proposer aux étudiants.
   ========================================================================== */

const H = Application.hasard;     // H(1, 6) : un entier entre 1 et 6
const C = Application.choisir;    // C([a, b, c]) : un élément au hasard
const NB = Application.nombre;    // NB(1036.8, 1) : « 1 036,8 »

/* ==========================================================================
   LA PHYSIQUE DU COURS (partagée avec labos.js)
   ========================================================================== */
const MICRO = {
  c: 343,          // célérité du son dans l'air à 20 °C (m/s)
  p0: 2e-5,        // pression de référence (Pa) : 0 dB SPL
  log: v => Math.log10(v),
  // Pression (Pa) → niveau de pression acoustique (dB SPL) et l'inverse
  spl: p => 20 * Math.log10(p / 2e-5),
  pa: L => 2e-5 * Math.pow(10, L / 20),
  // Fréquence (Hz) → longueur d'onde (m)
  lambda: f => 343 / f,
  // Variation de niveau quand on passe de la distance d1 à d2 (champ libre, source ponctuelle)
  ecartDistance: (d1, d2) => 20 * Math.log10(d1 / d2),
  // Sensibilité : mV/Pa ↔ dBV (référence 1 V/Pa)
  dbv: mvpa => 20 * Math.log10(mvpa / 1000),
  mvpa: dbv => 1000 * Math.pow(10, dbv / 20),
  // Tension (V) ↔ dBu (0,775 V) et dBV (1 V)
  dbu: U => 20 * Math.log10(U / 0.775),
  voltsDbu: L => 0.775 * Math.pow(10, L / 20),
  dbvU: U => 20 * Math.log10(U),
  voltsDbv: L => Math.pow(10, L / 20),
  // Directivité du premier ordre : r(θ) = A + B·cos θ, avec A + B = 1 (θ en degrés)
  gain: (A, deg) => A + (1 - A) * Math.cos(deg * Math.PI / 180),
  // Atténuation (dB, ≤ 0) à l'angle θ ; -Infinity dans un angle d'annulation
  attenuation: (A, deg) => 20 * Math.log10(Math.abs(A + (1 - A) * Math.cos(deg * Math.PI / 180))),
  // Facteur de directivité DF = 1 / (A² + B²/3), indice DI = 10 log DF, facteur de distance √DF
  df: A => 1 / (A * A + (1 - A) * (1 - A) / 3),
  di: A => 10 * Math.log10(1 / (A * A + (1 - A) * (1 - A) / 3)),
  distance: A => Math.sqrt(1 / (A * A + (1 - A) * (1 - A) / 3)),
  // Angle d'annulation (°) : cos θ0 = −A/B ; null si la directivité n'en a pas (A > 0,5)
  annulation: A => A > 0.5 + 1e-9 ? null : Math.acos(-A / (1 - A)) * 180 / Math.PI,
  // Effet de proximité d'une capsule A + B·cos θ, sur l'axe, à la distance r (m) et la fréquence f (Hz) :
  // renforcement (dB) = 10 log(1 + (B / kr)²), avec k = 2πf / c
  proximite: (A, r, f) => { const kr = 2 * Math.PI * f / 343 * r, B = 1 - A; return 10 * Math.log10(1 + (B / kr) * (B / kr)); },
  // Rayon de réverbération (m) d'une salle de volume V (m³) et de temps de réverbération T (s)
  rayonReverberation: (V, T) => 0.057 * Math.sqrt(V / T),
  // Alimentation fantôme : tension aux bornes du micro (V) pour un courant I (mA)
  // P48 : 48 V à travers deux résistances de 6,8 kΩ en parallèle (3,4 kΩ)
  fantome: (U0, Rk, ImA) => U0 - ImA * Rk / 2
};

/* Les directivités usuelles du premier ordre : r(θ) = A + B·cos θ, A + B = 1.
   Les valeurs de A sont celles des manuels (supercardioïde : A = (√3 − 1)/2,
   la directivité qui donne le meilleur rapport avant / arrière ;
   hypercardioïde : A = 1/4, la plus directive du premier ordre, DF = 4). */
const DIRECTIVITES = [
  { id: "omni", nom: "Omnidirectionnelle", court: "Omni", A: 1, couleur: "#64d2ff" },
  { id: "infra", nom: "Infracardioïde", court: "Infracardio", A: 0.7, couleur: "#30d158" },
  { id: "cardio", nom: "Cardioïde", court: "Cardio", A: 0.5, couleur: "#ffd60a" },
  { id: "super", nom: "Supercardioïde", court: "Supercardio", A: 0.366, couleur: "#ff9f0a" },
  { id: "hyper", nom: "Hypercardioïde", court: "Hypercardio", A: 0.25, couleur: "#ff375f" },
  { id: "huit", nom: "Bidirectionnelle (en huit)", court: "En huit", A: 0, couleur: "#bf5af2" }
];
const DIR = id => DIRECTIVITES.find(d => d.id === id);

/* ==========================================================================
   SCHÉMAS (SVG) utilisés dans les notions et les questions
   Fond sombre (#0b0c0e) dans les deux thèmes, comme les scènes des labos.
   ========================================================================== */
const SVG = (l, h, contenu, label) => '<svg class="qa-fig" viewBox="0 0 ' + l + " " + h + '" role="img" aria-label="' + (label || "Schéma") + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, Segoe UI, Inter, Roboto, sans-serif"><rect width="' + l + '" height="' + h + '" fill="#0b0c0e"/>' + contenu + "</svg>";
const TXT = (x, y, t, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" fill="' + (o.c || "#e5e5ea") + '" font-size="' + (o.s || 13) + '" font-weight="' + (o.w || 600) + '" text-anchor="' + (o.a || "middle") + '"' + (o.mono ? ' font-family="ui-monospace, Menlo, Consolas, monospace"' : "") + ">" + t + "</text>"; };
const LIGNE = (x1, y1, x2, y2, o) => { o = o || {}; return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.c || "rgba(255,255,255,.25)") + '" stroke-width="' + (o.w || 1) + '"' + (o.d ? ' stroke-dasharray="' + o.d + '"' : "") + "/>"; };

/* Diagramme polaire en SVG (0° en haut = l'axe du micro).
   courbes : [{ A, couleur, nom }] ou [{ f: θ(°) → gain signé, couleur, nom }]
   o.db    : true = échelle en dB (anneaux tous les 5 dB jusqu'à −25 dB, comme
             les fiches techniques) ; sinon échelle linéaire (la forme « vraie »).
   Le lobe de polarité inversée (gain négatif) est dessiné en pointillés. */
function figPolaire(courbes, o) {
  o = o || {};
  const W = o.l || 320, Hh = o.h || 300, cx = W / 2, cy = Hh / 2 + 4, R = Math.min(W, Hh) / 2 - 34;
  const ray = g => o.db ? Math.max(0, (25 + 20 * Math.log10(Math.max(Math.abs(g), 1e-6))) / 25) * R : Math.abs(g) * R;
  let s = "";
  // anneaux
  for (let k = 1; k <= 5; k++) {
    const r = o.db ? R * (k / 5) : R * (k / 4);
    if (!o.db && k > 4) break;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r.toFixed(1) + '" fill="none" stroke="rgba(255,255,255,' + (k === (o.db ? 5 : 4) ? ".35" : ".13") + ')"/>';
  }
  if (o.db) [0, -10, -20].forEach(v => { s += TXT(cx + 4, cy - R * (25 + v) / 25 + 12, v + " dB", { s: 9, w: 500, c: "#8e8e93", a: "start" }); });
  // rayons tous les 30°
  for (let a = 0; a < 360; a += 30) {
    const t = a * Math.PI / 180;
    s += LIGNE(cx, cy, (cx + R * Math.sin(t)).toFixed(1), (cy - R * Math.cos(t)).toFixed(1), { c: "rgba(255,255,255,.1)" });
  }
  [[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]].forEach(p => {
    const t = p[0] * Math.PI / 180;
    s += TXT((cx + (R + 16) * Math.sin(t)).toFixed(1), (cy - (R + 16) * Math.cos(t) + 4).toFixed(1), p[1], { s: 11, w: 500, c: "#8e8e93" });
  });
  // courbes
  courbes.forEach(cb => {
    const f = cb.f || (deg => MICRO.gain(cb.A, deg));
    let pos = "", neg = "";
    let prec = null;
    for (let a = 0; a <= 360; a += 2) {
      const g = f(a), r = ray(g), t = a * Math.PI / 180;
      const pt = (cx + r * Math.sin(t)).toFixed(1) + " " + (cy - r * Math.cos(t)).toFixed(1);
      const signe = g >= 0;
      if (signe) pos += (prec === true ? " L" : " M") + pt; else neg += (prec === false ? " L" : " M") + pt;
      prec = signe;
    }
    const c = cb.couleur || "#ffd60a";
    if (pos) s += '<path d="' + pos + '" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linejoin="round"/>';
    if (neg) s += '<path d="' + neg + '" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-dasharray="5 4" stroke-linejoin="round"/>';
  });
  // le micro, vu de dessus, pointé vers 0°
  s += '<rect x="' + (cx - 5) + '" y="' + (cy - 9) + '" width="10" height="18" rx="5" fill="#e5e5ea"/>';
  // légende
  let y = 18;
  courbes.forEach(cb => { if (cb.nom) { s += LIGNE(8, y - 4, 24, y - 4, { c: cb.couleur || "#ffd60a", w: 3 }) + TXT(30, y, cb.nom, { s: 11, a: "start", w: 500 }); y += 16; } });
  if (o.titre) s += TXT(W - 8, 18, o.titre, { s: 11, a: "end", w: 500, c: "#8e8e93" });
  return SVG(W, Hh, s, o.label || "Diagramme polaire de directivité");
}

/* Fiche technique en SVG, pour les questions « Lire ».
   lignes : [["Sensibilité", "20 mV/Pa (−34 dBV)"], …] */
function figFiche(titre, lignes, o) {
  o = o || {};
  const W = 520, h = 44 + lignes.length * 24 + 10;
  let s = TXT(16, 26, titre, { s: 14, a: "start" }) + LIGNE(16, 36, W - 16, 36, { c: "rgba(255,255,255,.25)" });
  lignes.forEach((l, i) => {
    const y = 58 + i * 24;
    s += TXT(16, y, l[0], { s: 12, a: "start", w: 500, c: "#8e8e93" }) + TXT(210, y, l[1], { s: 12, a: "start", w: 600, mono: true });
  });
  return SVG(W, h, s, o.label || "Fiche technique : " + titre);
}

/* ==========================================================================
   L'APPLICATION
   ========================================================================== */
const APPLICATION = {
  id: "tes-microphones",          // identique au catalogue : NE PLUS LE CHANGER une fois en ligne
  titre: "Microphones",
  accroche: "De la vibration à la tension.",
  epreuve: "TES",
  intro: "Huit modules pour comprendre <b>comment un microphone transforme le son en tension</b> : la pression acoustique, les technologies de transduction, les capsules, la directivité, la fiche technique, les types de micros, les liaisons et les couples stéréophoniques. Chaque module se termine par une évaluation : obtenez au moins <b>12/20</b> pour débloquer le suivant.",

  modules: [
    { titre: "Module 1 (en cours d’écriture)", nav: "Module 1", resume: "À venir", intro: "Ce module est en cours d’écriture." },

    { titre: "Module 2 (en cours d’écriture)", nav: "Module 2", resume: "À venir", intro: "Ce module est en cours d’écriture." },

    { titre: "Module 3 (en cours d’écriture)", nav: "Module 3", resume: "À venir", intro: "Ce module est en cours d’écriture." },

    { titre: "Module 4 (en cours d’écriture)", nav: "Module 4", resume: "À venir", intro: "Ce module est en cours d’écriture." },

    { titre: "Module 5 (en cours d’écriture)", nav: "Module 5", resume: "À venir", intro: "Ce module est en cours d’écriture." },

    { titre: "Module 6 (en cours d’écriture)", nav: "Module 6", resume: "À venir", intro: "Ce module est en cours d’écriture." },

    { titre: "Module 7 (en cours d’écriture)", nav: "Module 7", resume: "À venir", intro: "Ce module est en cours d’écriture." },

    { titre: "Module 8 (en cours d’écriture)", nav: "Module 8", resume: "À venir", intro: "Ce module est en cours d’écriture." }
  ]
};
