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
    /* ======================================================================
       MODULE 1 — DU SON AU SIGNAL
       ====================================================================== */
    {
      titre: "Du son au signal",
      nav: "Le son",
      resume: "Pression, dB SPL, longueur d’onde",
      intro: "Un microphone ne capte pas « du son » au sens vague : il mesure une <b>pression</b> qui varie très vite. Ce module pose les bases : ce qu’est une onde sonore, comment on mesure sa pression en pascals et son niveau en dB SPL, ce que valent la fréquence et la longueur d’onde, et comment le micro transforme tout cela en tension.",

      notions: {
        titre: "Le son, sa pression et sa mesure",
        intro: "Le son est une petite variation de pression qui se propage dans l’air. On la mesure en <b>pascals</b>, on l’exprime en <b>décibels SPL</b>, et le micro la convertit en tension.",
        mots: [
          { t: "Onde sonore", ic: "🌊", q: "Qu’est-ce qu’une onde sonore ?", d: "Une <b>variation de pression</b> qui se propage dans un milieu (l’air, l’eau, un mur). Les molécules d’air oscillent autour de leur position de repos et transmettent le mouvement à leurs voisines : c’est la perturbation qui voyage, pas l’air. Sans matière, pas de son : il ne se propage pas dans le vide.", c: "Une « ola » dans un stade : chaque spectateur se lève et se rassoit à sa place, mais la vague fait le tour du stade.", r: "Dans l’air à 20 °C, le son parcourt 343 m en une seconde, soit environ 1 km en 3 s." },
          { t: "Onde longitudinale", ic: "↔️", q: "Pourquoi dit-on que le son est une onde longitudinale ?", d: "Parce que les molécules oscillent <b>dans la direction de propagation</b>. Elles se resserrent par endroits (<b>compressions</b> : surpression) et s’écartent ailleurs (<b>dépressions</b> ou raréfactions : souspression). Les vagues à la surface de l’eau, elles, sont transversales : l’eau monte et descend pendant que la vague avance.", c: "Un long ressort qu’on pousse d’un coup sec à un bout : une zone de spires serrées parcourt le ressort.", r: "Une compression suivie d’une dépression = une longueur d’onde." },
          { t: "Pression acoustique", s: "p", u: "pascal (Pa)", ic: "🎚️", d: "L’<b>écart</b> entre la pression de l’air à un instant et la pression atmosphérique moyenne. C’est une variation minuscule autour d’environ 101 325 Pa. On l’exprime par sa valeur efficace (comme une tension alternative). C’est elle que la membrane d’un micro « ressent ».", c: "Une ride à la surface d’un lac profond : la profondeur du lac (pression atmosphérique) ne change pas, seule la petite ride (pression acoustique) passe.", r: "Seuil d’audition : 20 µPa · voix à 1 m : ≈ 0,02 Pa · 1 Pa = 94 dB SPL · seuil de douleur : ≈ 20 à 63 Pa." },
          { t: "Niveau de pression acoustique", s: "L", u: "dB SPL", ic: "📏", d: "La pression exprimée sur une <b>échelle logarithmique</b>, par rapport à la pression de référence p<sub>0</sub> = 20 µPa (le seuil d’audition vers 1 kHz) : L = 20 log(p / p<sub>0</sub>). SPL signifie <i>Sound Pressure Level</i>. Les décibels écrasent l’énorme plage de l’oreille (un rapport d’un million entre le seuil et la douleur) en une échelle de 0 à 120 dB environ.", c: "Une échelle des étages plutôt qu’une échelle des centimètres : chaque « étage » de 20 dB multiplie la pression par 10.", r: "0 dB SPL = 20 µPa (seuil) · 94 dB SPL = 1 Pa · 120 à 130 dB SPL : seuil de douleur." },
          { t: "Fréquence et période", s: "f, T", u: "hertz (Hz), seconde (s)", ic: "🎵", q: "Fréquence et période : de quoi s’agit-il ?", d: "La <b>fréquence</b> f est le nombre d’oscillations de pression par seconde ; la <b>période</b> T est la durée d’une oscillation : T = 1/f. Une fréquence basse donne un son grave, une fréquence haute un son aigu.", c: "Une balançoire : la période est la durée d’un aller-retour, la fréquence le nombre d’allers-retours par seconde.", r: "Oreille humaine : 20 Hz à 20 kHz · 1 kHz → T = 1 ms · 100 Hz → T = 10 ms · 50 Hz → T = 20 ms." },
          { t: "Longueur d’onde", s: "λ", u: "mètre (m)", ic: "📐", d: "La <b>distance</b> entre deux compressions successives, c’est-à-dire le chemin parcouru par le son pendant une période : λ = c / f. Elle compte beaucoup en prise de son : un objet (une membrane, un corps de micro, une tête) ne perturbe une onde que s’il n’est pas petit devant sa longueur d’onde.", c: "La distance entre deux crêtes de vagues sur la mer.", r: "20 Hz → 17 m · 100 Hz → 3,4 m · 1 kHz → 34 cm · 10 kHz → 3,4 cm · 20 kHz → 1,7 cm." },
          { t: "Célérité du son", s: "c", u: "m/s", ic: "⚡", d: "La <b>vitesse de propagation</b> du son. Dans l’air, elle dépend surtout de la température : 331 m/s à 0 °C, 343 m/s à 20 °C. On arrondit souvent à 340 m/s. Elle ne dépend ni de la fréquence ni du niveau.", c: "L’orage : on compte les secondes entre l’éclair et le tonnerre, 3 s ≈ 1 km.", r: "Air à 20 °C : 343 m/s · eau : ≈ 1 500 m/s · le son met ≈ 2,9 ms pour parcourir 1 m." },
          { t: "Loi de la distance", ic: "📉", q: "Comment le niveau baisse-t-il avec la distance ?", d: "En <b>champ libre</b> (sans réflexion), loin d’une petite source, la pression est inversement proportionnelle à la distance : p ∝ 1/r. Le niveau baisse donc de <b>6 dB chaque fois que la distance double</b> (et de 20 dB quand elle est multipliée par 10). Dans une pièce, les réflexions (le champ réverbéré) finissent par freiner cette baisse.", c: "La lumière d’une lampe de poche s’étale sur une surface de plus en plus grande : le son s’étale de la même façon.", r: "1 m → 2 m : −6 dB · 1 m → 4 m : −12 dB · 1 m → 10 m : −20 dB." },
          { t: "Addition de deux sources", ic: "➕", q: "Que donnent deux sources de même niveau ?", d: "Deux sources <b>non corrélées</b> (deux voix, deux instruments, deux bruits) additionnent leurs puissances : deux sources de même niveau donnent <b>+3 dB</b>, pas le double en décibels. Seuls deux signaux <b>identiques et en phase</b> (le même signal) additionnent leurs pressions et donnent +6 dB.", c: "Deux personnes qui parlent en même temps ne font pas « deux fois plus de décibels » : 60 dB + 60 dB = 63 dB.", r: "2 sources égales : +3 dB · 4 sources : +6 dB · 10 sources : +10 dB." },
          { t: "Transducteur", ic: "🔄", d: "Un appareil qui <b>convertit une forme d’énergie en une autre</b>. Le microphone convertit une énergie acoustique en énergie électrique ; le haut-parleur fait l’inverse. Le capteur d’une caméra est aussi un transducteur (lumière → charges électriques).", c: "Un traducteur qui transforme une phrase d’une langue dans une autre sans en changer le sens.", r: "Micro : pression (Pa) → tension (mV) · Haut-parleur : tension (V) → pression (Pa)." },
          { t: "Les deux étages d’un microphone", ic: "🎙️", q: "Quels sont les deux étages d’un microphone ?", d: "1. L’<b>étage acoustique</b> : la capsule et sa membrane, qui bouge sous l’effet de la pression (ou de la différence de pression entre ses deux faces). Sa construction fixe la directivité (module 3). 2. L’<b>étage électromécanique</b> : le transducteur, qui transforme le mouvement de la membrane en tension (bobine dans un aimant, condensateur… : module 2).", c: "Une oreille : le tympan bouge (étage acoustique), puis l’oreille interne transforme ce mouvement en influx nerveux (étage « électrique »).", r: "Chaîne : source → air → membrane → tension (quelques mV) → préamplificateur → console." }
        ],
        formules: [
          { q: "Comment passe-t-on d’une pression à un niveau en dB SPL ?", f: "L = 20 log(p / p<sub>0</sub>)", say: "L est égal à vingt fois le logarithme du rapport de p sur p zéro", rows: [["L", "niveau de pression acoustique", "dB SPL", "ce que l’on cherche"], ["p", "pression acoustique efficace", "Pa", "ce que mesure le micro"], ["p<sub>0</sub>", "pression de référence", "Pa", "20 µPa = 2·10⁻⁵ Pa (0 dB SPL)"]], ex: "p = 0,2 Pa : L = 20 log(0,2 / 0,000 02) = 20 log(10 000) = 20 × 4 = <b>80 dB SPL</b>." },
          { q: "Comment retrouve-t-on la pression à partir du niveau ?", f: "p = p<sub>0</sub> × 10<sup>L / 20</sup>", say: "p est égal à p zéro multiplié par dix puissance L sur vingt", rows: [["p", "pression acoustique efficace", "Pa", "ce que l’on cherche"], ["p<sub>0</sub>", "pression de référence", "Pa", "2·10⁻⁵ Pa"], ["L", "niveau", "dB SPL", "la donnée"]], ex: "L = 74 dB SPL : p = 2·10⁻⁵ × 10<sup>3,7</sup> = 2·10⁻⁵ × 5 012 ≈ <b>0,1 Pa</b>." },
          { q: "Comment calcule-t-on la longueur d’onde ?", f: "λ = c / f", say: "lambda est égal à c divisé par f", rows: [["λ", "longueur d’onde", "m", "ce que l’on cherche"], ["c", "célérité du son", "m/s", "343 m/s dans l’air à 20 °C"], ["f", "fréquence", "Hz", "la donnée"]], ex: "f = 1 000 Hz : λ = 343 / 1 000 = 0,343 m = <b>34,3 cm</b>." },
          { q: "Comment relier période et fréquence ?", f: "T = 1 / f", say: "T est égal à un divisé par f", rows: [["T", "période", "s", "durée d’une oscillation"], ["f", "fréquence", "Hz", "oscillations par seconde"]], ex: "f = 250 Hz : T = 1 / 250 = 0,004 s = <b>4 ms</b>." },
          { q: "De combien le niveau change-t-il avec la distance ?", f: "ΔL = 20 log(d<sub>1</sub> / d<sub>2</sub>)", say: "delta L est égal à vingt fois le logarithme de d un sur d deux", rows: [["ΔL", "variation de niveau", "dB", "négative si l’on s’éloigne"], ["d<sub>1</sub>", "distance de départ", "m", "où le niveau est connu"], ["d<sub>2</sub>", "nouvelle distance", "m", "où l’on cherche le niveau"]], ex: "On passe de 1 m à 4 m : ΔL = 20 log(1/4) = 20 × (−0,602) ≈ <b>−12 dB</b>. Un niveau de 80 dB SPL à 1 m devient 68 dB SPL à 4 m." }
        ]
      },

      manipuler: {
        titre: "Voir une onde de pression",
        intro: "Changez la <b>fréquence</b> et le <b>niveau</b> : observez les compressions et les dépressions, la longueur d’onde et la membrane du micro qui suit la pression. Puis éloignez le micro de la source pour vérifier la règle des <b>−6 dB par doublement de distance</b>."
      },

      essentiel: {
        definitions: [
          "<b>Onde sonore</b> : variation de pression qui se propage ; les molécules oscillent sur place (onde longitudinale : compressions et dépressions).",
          "<b>Pression acoustique</b> p (Pa) : petite variation autour de la pression atmosphérique ; c’est ce que mesure le micro.",
          "<b>Niveau</b> L (dB SPL) : la pression sur une échelle logarithmique, référence p<sub>0</sub> = 20 µPa.",
          "<b>Longueur d’onde</b> λ : distance entre deux compressions, parcourue en une période.",
          "<b>Microphone</b> : transducteur acoustique → électrique, en deux étages : acoustique (capsule, membrane) puis électromécanique (mouvement → tension)."
        ],
        formules: [
          ["L = 20 log(p / p<sub>0</sub>)", "p<sub>0</sub> = 20 µPa = 2·10⁻⁵ Pa"],
          ["p = p<sub>0</sub> × 10<sup>L/20</sup>", "pour revenir aux pascals"],
          ["λ = c / f", "c = 343 m/s (≈ 340) dans l’air à 20 °C"],
          ["T = 1 / f", "période en s, fréquence en Hz"],
          ["ΔL = 20 log(d<sub>1</sub> / d<sub>2</sub>)", "−6 dB par doublement de distance, en champ libre"]
        ],
        reperes: [
          "0 dB SPL = 20 µPa · 94 dB SPL = 1 Pa · 120 à 130 dB SPL : douleur.",
          "Chuchotement ≈ 30 dB · conversation à 1 m ≈ 60 dB · voix forte ≈ 80 dB · orchestre fortissimo ≈ 100 à 110 dB · caisse claire à quelques cm ≈ 130 dB SPL et plus.",
          "Pression × 2 → +6 dB · pression × 10 → +20 dB · deux sources égales non corrélées → +3 dB.",
          "Audible : 20 Hz à 20 kHz · λ : 17 m (20 Hz), 34 cm (1 kHz), 1,7 cm (20 kHz)."
        ],
        pieges: [
          "L’air ne « voyage » pas de la source au micro : seule la perturbation se propage.",
          "0 dB SPL ne veut pas dire « pas de son » : c’est 20 µPa, le seuil d’audition. Des niveaux négatifs existent.",
          "Deux sources de 60 dB ne font pas 120 dB mais <b>63 dB</b>.",
          "En dB de pression, on multiplie le logarithme par <b>20</b> (et non par 10 comme pour une puissance).",
          "Doubler la distance fait perdre 6 dB, pas la moitié des décibels : 80 dB à 1 m donnent 74 dB à 2 m, pas 40 dB."
        ]
      },

      evaluation: {
        lire: [
          // Lire une période sur un oscillogramme de pression
          () => {
            const T = C([1, 2, 4, 5]), pas = T / 2, fen = 4 * T;
            const x0 = 46, x1 = 500, y0 = 100, A = 58, X = t => x0 + t / fen * (x1 - x0);
            let s = LIGNE(x0, y0, x1, y0, { c: "rgba(255,255,255,.35)" }) + LIGNE(x0, 30, x0, 170, { c: "rgba(255,255,255,.35)" });
            for (let k = 0; k <= 8; k++) { const t = k * pas; s += LIGNE(X(t), 30, X(t), 170, { c: "rgba(255,255,255,.1)" }) + TXT(X(t), 188, NB(t, 1), { s: 11, w: 500, c: "#8e8e93" }); }
            let d = "";
            for (let i = 0; i <= 200; i++) { const t = i / 200 * fen; d += (i ? " L" : "M") + X(t).toFixed(1) + " " + (y0 - A * Math.sin(2 * Math.PI * t / T)).toFixed(1); }
            s += '<path d="' + d + '" fill="none" stroke="#64d2ff" stroke-width="2.4"/>' + TXT(x1, 196, "t (ms)", { s: 11, a: "end", c: "#8e8e93" }) + TXT(x0 + 4, 24, "p (Pa)", { s: 11, a: "start", c: "#8e8e93" });
            return { type: "nombre", figure: SVG(520, 200, s, "Oscillogramme d’une pression acoustique sinusoïdale en fonction du temps, en millisecondes"), question: "L’oscillogramme montre la pression acoustique captée par un micro. Lisez la <b>période</b> T du son.", reponse: T, unite: "ms", explication: "Une période est la durée entre deux crêtes successives (ou deux passages par zéro dans le même sens). On lit T = " + NB(T) + " ms, soit f = 1/T = " + NB(1000 / T, 0) + " Hz.", indice: "Repérez deux crêtes successives et lisez l’écart sur l’axe du temps." };
          },
          // Lire une longueur d'onde sur une rangée de molécules
          () => {
            const L = C([20, 25, 40, 50]), o = 10, x0 = 30, x1 = 490, X = cm => x0 + cm / 100 * (x1 - x0);
            let s = "";
            for (let cm = 0; cm <= 100; cm += 10) s += LIGNE(X(cm), 150, X(cm), 158, { c: "rgba(255,255,255,.5)" }) + TXT(X(cm), 174, String(cm), { s: 11, w: 500, c: "#8e8e93" });
            s += LIGNE(x0, 150, x1, 150, { c: "rgba(255,255,255,.5)" }) + TXT(x1, 192, "distance (cm)", { s: 11, a: "end", c: "#8e8e93" });
            for (let r = 0; r < 5; r++) for (let i = 0; i <= 115; i++) {
              const cm0 = i * 100 / 115, xi = cm0 - 2.2 * Math.sin(2 * Math.PI * (cm0 - o) / L);
              if (xi < 0 || xi > 100) continue;
              s += '<circle cx="' + X(xi).toFixed(1) + '" cy="' + (40 + r * 22) + '" r="2.6" fill="#e5e5ea"/>';
            }
            for (let cm = o; cm <= 100; cm += L) s += TXT(X(cm), 26, "C", { s: 11, c: "#ff9f0a" });
            return { type: "nombre", figure: SVG(520, 200, s, "Molécules d’air d’une onde sonore : zones de compression notées C, et une règle graduée en centimètres"), question: "Les points représentent des molécules d’air traversées par une onde sonore ; les compressions sont marquées « C ». Lisez la <b>longueur d’onde</b>.", reponse: L, unite: "cm", ecart: 1, explication: "La longueur d’onde est la distance entre deux compressions successives : " + o + " cm, " + (o + L) + " cm… soit λ = " + L + " cm. Avec c = 343 m/s, cela correspond à f = 343 / " + NB(L / 100, 2) + " ≈ " + NB(343 / (L / 100), 0) + " Hz.", indice: "Mesurez l’écart entre deux « C » voisins." };
          },
          { type: "nombre", contexte: figFiche("Microphone statique — extrait de fiche technique", [["Principe", "Électrostatique, cardioïde"], ["Sensibilité", "20 mV/Pa à 1 kHz"], ["Conditions de mesure", "94 dB SPL, champ libre"], ["Niveau max. admissible", "136 dB SPL (THD 0,5 %)"]]), question: "La sensibilité est mesurée à 94 dB SPL. Quelle <b>pression acoustique</b> cela représente-t-il ?", reponse: 1, unite: "Pa", ecart: 0.02, explication: "94 dB SPL correspondent à 1 Pa : 20 log(1 / 2·10⁻⁵) = 20 log(50 000) ≈ 94 dB. C’est la référence de toutes les fiches de micros.", indice: "C’est la pression « ronde » utilisée par tous les fabricants." },
          () => {
            const L1 = H(70, 90), k = C([2, 4]), dk = k === 2 ? 6 : 12;
            return { type: "nombre", contexte: figFiche("Relevé au sonomètre — champ libre", [["Point A (1 m de la source)", NB(L1, 1) + " dB SPL"], ["Point B (" + k + " m de la source)", NB(L1 - dk + (k === 2 ? -0.02 : -0.04), 1) + " dB SPL"]]), question: "Lisez les deux relevés. Quel est l’<b>écart de niveau</b> entre le point A et le point B ?", reponse: dk, unite: "dB", ecart: 0.3, explication: "On lit " + NB(L1, 1) + " dB et " + NB(L1 - dk, 1) + " dB : l’écart est de " + dk + " dB. C’est la loi de la distance : −6 dB par doublement (1 m → " + k + " m = " + (k === 2 ? "un doublement" : "deux doublements") + ").", indice: "Faites la différence des deux niveaux lus." };
          }
        ],
        comprendre: [
          ["Dans une onde sonore, les molécules d’air voyagent de la source jusqu’au micro.", false, "Les molécules oscillent autour de leur position de repos ; c’est la perturbation (la variation de pression) qui se propage.", "Pensez à la « ola » dans un stade."],
          ["Quand la pression acoustique double, le niveau augmente de 6 dB.", true, "20 log(2) ≈ 6,02 dB : chaque doublement de pression ajoute 6 dB."],
          ["Deux sources non corrélées de 60 dB SPL chacune donnent ensemble 120 dB SPL.", false, "Les puissances s’additionnent : 60 dB + 60 dB = 63 dB SPL. On n’additionne jamais des décibels directement.", "Combien de dB ajoute un doublement de puissance ?"],
          ["En champ libre, quand on double la distance, le niveau baisse de 3 dB.", false, "La pression est en 1/r : doubler la distance divise la pression par 2, soit −6 dB."],
          ["Une onde de 20 Hz a une longueur d’onde d’environ 17 m.", true, "λ = c / f = 343 / 20 ≈ 17 m. Les graves ont des longueurs d’onde de plusieurs mètres."],
          ["0 dB SPL signifie qu’il n’y a aucune pression acoustique.", false, "0 dB SPL correspond à p = p<sub>0</sub> = 20 µPa, le seuil d’audition vers 1 kHz. Une pression égale à zéro donnerait −∞ dB.", "Que vaut le logarithme de 1 ?"],
          ["Plus la fréquence est élevée, plus la longueur d’onde est courte.", true, "λ = c / f : à célérité constante, λ diminue quand f augmente."],
          ["Un microphone est un transducteur : il convertit une énergie acoustique en énergie électrique.", true, "C’est la définition d’un transducteur électroacoustique ; le haut-parleur fait la conversion inverse."],
          ["Le niveau en dB SPL est proportionnel à la pression acoustique.", false, "Le niveau est logarithmique : multiplier la pression par 10 ajoute seulement 20 dB."],
          ["La pression acoustique d’une voix est minuscule devant la pression atmosphérique.", true, "Environ 0,02 Pa contre 101 325 Pa : cinq millions de fois moins. La membrane d’un micro doit donc être très légère et très sensible."],
          ["La célérité du son dans l’air dépend de la fréquence : les aigus vont plus vite que les graves.", false, "Dans l’air, c ≈ 343 m/s à 20 °C pour toutes les fréquences ; elle dépend surtout de la température."]
        ],
        qcm: [
          ["À quel niveau correspond une pression acoustique de 1 Pa ?", "94 dB SPL", ["0 dB SPL", "1 dB SPL", "120 dB SPL"], "20 log(1 / 2·10⁻⁵) ≈ 94 dB SPL : c’est la référence des fiches techniques de micros."],
          ["Quelle est la pression de référence p<sub>0</sub>, qui correspond à 0 dB SPL ?", "20 µPa", ["1 Pa", "101 325 Pa", "20 mPa"], "p<sub>0</sub> = 20 µPa = 2·10⁻⁵ Pa, le seuil d’audition vers 1 kHz. 101 325 Pa est la pression atmosphérique, sans rapport avec le niveau sonore."],
          ["Dans l’air à 20 °C, le son se propage à environ :", "343 m/s", ["34 m/s", "3 430 m/s", "300 000 km/s"], "343 m/s, souvent arrondi à 340 m/s. 300 000 km/s est la vitesse de la lumière."],
          ["Quelle est la bande de fréquences audibles par l’être humain ?", "De 20 Hz à 20 kHz", ["De 20 Hz à 2 kHz", "De 200 Hz à 20 kHz", "De 2 Hz à 200 kHz"], "On retient 20 Hz – 20 kHz (la limite haute baisse avec l’âge)."],
          ["La pression acoustique est multipliée par 10. Le niveau :", "augmente de 20 dB", ["augmente de 10 dB", "augmente de 6 dB", "est multiplié par 10"], "20 log(10) = 20 dB. Le « +10 dB » vaut pour une puissance multipliée par 10, pas pour une pression."],
          ["Quels sont les deux étages d’un microphone, dans l’ordre ?", "Acoustique (capsule) puis électromécanique (transducteur)", ["Électromécanique (transducteur) puis acoustique (capsule)", "Préamplificateur puis convertisseur numérique", "Aimant puis haut-parleur intégré"], "La membrane capte d’abord la pression (étage acoustique), puis son mouvement est converti en tension (étage électromécanique)."],
          ["Dans une onde sonore, les molécules d’air oscillent :", "dans la direction de propagation", ["perpendiculairement à la propagation", "en tournant sur elles-mêmes", "sans bouger du tout"], "Le son est une onde longitudinale : compressions et dépressions se succèdent dans l’axe de propagation."],
          ["Deux sources non corrélées de même niveau jouent ensemble. Le niveau total augmente de :", "3 dB", ["6 dB", "0 dB", "le double du niveau"], "Les puissances s’additionnent : 10 log(2) ≈ 3 dB. Le +6 dB ne vaut que pour deux signaux identiques et en phase."],
          ["En champ libre, on passe de 1 m à 10 m d’une source. Le niveau baisse de :", "20 dB", ["10 dB", "60 dB", "90 %"], "ΔL = 20 log(1/10) = −20 dB."]
        ],
        calculer: [
          () => { const p = C([0.002, 0.005, 0.02, 0.05, 0.1, 0.2, 0.5, 2, 5, 20]), L = MICRO.spl(p); return { type: "nombre", question: "Un sonomètre mesure une pression acoustique efficace de <b>" + NB(p, 3) + " Pa</b>. Calculez le niveau de pression acoustique.", reponse: L, unite: "dB SPL", ecart: 0.5, explication: "L = 20 log(p / p<sub>0</sub>) = 20 log(" + NB(p, 3) + " / 0,000 02) = 20 log(" + NB(p / 2e-5, 0) + ") ≈ <b>" + NB(L, 1) + " dB SPL</b>.", indice: "L = 20 log(p / 2·10⁻⁵)." }; },
          () => { const L = C([40, 54, 60, 74, 80, 86, 94, 100, 114, 120]), p = MICRO.pa(L); return { type: "nombre", question: "Une source produit <b>" + L + " dB SPL</b> au point de mesure. Quelle est la pression acoustique efficace ?", reponse: p, unite: "Pa", explication: "p = p<sub>0</sub> × 10<sup>L/20</sup> = 2·10⁻⁵ × 10<sup>" + NB(L / 20, 2) + "</sup> ≈ <b>" + NB(p, p < 0.01 ? 5 : 3) + " Pa</b>.", indice: "p = 2·10⁻⁵ × 10<sup>L/20</sup>." }; },
          () => { const f = C([50, 100, 125, 250, 500, 1000, 2000, 4000, 8000, 10000]), lam = MICRO.lambda(f), cm = f >= 1000; return { type: "nombre", question: "Calculez la longueur d’onde d’un son de <b>" + NB(f, 0) + " Hz</b> dans l’air à 20 °C (c = 343 m/s), en " + (cm ? "centimètres" : "mètres") + ".", reponse: cm ? lam * 100 : lam, unite: cm ? "cm" : "m", explication: "λ = c / f = 343 / " + NB(f, 0) + " = " + NB(lam, 4) + " m" + (cm ? " = <b>" + NB(lam * 100, 2) + " cm</b>." : " → <b>" + NB(lam, 2) + " m</b>."), indice: "λ = c / f, avec c en m/s et f en Hz." }; },
          () => { const L1 = H(60, 95), d1 = C([0.5, 1, 2]), k = C([2, 4, 8, 10]), d2 = d1 * k, L2 = L1 + MICRO.ecartDistance(d1, d2); return { type: "nombre", question: "En champ libre, une source produit <b>" + L1 + " dB SPL</b> à " + NB(d1, 1) + " m. Quel niveau mesure-t-on à <b>" + NB(d2, 1) + " m</b> ?", reponse: L2, unite: "dB SPL", ecart: 0.5, explication: "ΔL = 20 log(d<sub>1</sub> / d<sub>2</sub>) = 20 log(" + NB(d1, 1) + " / " + NB(d2, 1) + ") ≈ " + NB(L2 - L1, 1).replace("-", "−") + " dB, donc L = " + L1 + " − " + NB(L1 - L2, 1) + " ≈ <b>" + NB(L2, 1) + " dB SPL</b>.", indice: "−6 dB à chaque doublement de distance ; la formule exacte est ΔL = 20 log(d<sub>1</sub>/d<sub>2</sub>)." }; },
          () => { const L = H(55, 85), n = C([2, 4, 10]), Lt = L + 10 * Math.log10(n); return { type: "nombre", question: "<b>" + n + " sources non corrélées</b> (des voix, par exemple) produisent chacune " + L + " dB SPL au point d’écoute. Quel est le niveau total ?", reponse: Lt, unite: "dB SPL", ecart: 0.5, explication: "Les puissances s’additionnent : L<sub>total</sub> = L + 10 log(n) = " + L + " + 10 log(" + n + ") = " + L + " + " + NB(10 * Math.log10(n), 1) + " ≈ <b>" + NB(Lt, 1) + " dB SPL</b>.", indice: "Deux sources égales : +3 dB ; n sources égales : +10 log(n)." }; },
          () => { const k = C([2, 3, 4, 5, 10, 0.5]), dL = 20 * Math.log10(k); return { type: "nombre", question: "La pression acoustique est multipliée par <b>" + NB(k, 1) + "</b>. De combien de décibels le niveau varie-t-il ? (Négatif s’il baisse.)", reponse: dL, unite: "dB", ecart: 0.3, explication: "ΔL = 20 log(" + NB(k, 1) + ") ≈ <b>" + NB(dL, 1).replace("-", "−") + " dB</b>.", indice: "Pour une pression, ΔL = 20 log(rapport)." }; },
          () => { const T = C([0.5, 1, 2, 4, 5, 8, 10, 20]), f = 1000 / T; return { type: "nombre", question: "La période d’un son est <b>" + NB(T, 1) + " ms</b>. Quelle est sa fréquence ?", reponse: f, unite: "Hz", explication: "f = 1 / T = 1 / " + NB(T / 1000, 4) + " s = <b>" + NB(f, 0) + " Hz</b>.", indice: "Convertissez la période en secondes avant de calculer 1/T." }; }
        ],
        exercice: [
          () => {
            const p = C([0.05, 0.1, 0.2, 0.4]), L = MICRO.spl(p), k = C([2, 4]), L2 = L - 20 * Math.log10(k), p2 = p / k;
            return { type: "exercice", question: "Une comédienne parle à <b>30 cm</b> d’un micro ; la pression efficace y vaut <b>" + NB(p, 2) + " Pa</b>. On recule le micro à <b>" + NB(0.3 * k, 1) + " m</b> (on suppose le champ libre).", etapes: [
              { question: "a) Quel est le niveau à 30 cm (dB SPL) ?", reponse: L, unite: "dB SPL", ecart: 0.5 },
              { question: "b) Quel est le niveau à " + NB(0.3 * k, 1) + " m (dB SPL) ?", reponse: L2, unite: "dB SPL", ecart: 0.5 },
              { question: "c) Quelle est alors la pression efficace (Pa) ?", reponse: p2, unite: "Pa" }
            ], solution: "a) 20 log(" + NB(p, 2) + " / 2·10⁻⁵) ≈ " + NB(L, 1) + " dB SPL. b) La distance est multipliée par " + k + " : 20 log(1/" + k + ") ≈ −" + NB(20 * Math.log10(k), 1) + " dB, soit " + NB(L2, 1) + " dB SPL. c) La pression est divisée par " + k + " : " + NB(p2, 3) + " Pa.", indice: "Multiplier la distance par k divise la pression par k." };
          },
          () => {
            const f = C([40, 50, 60, 80]), lam = MICRO.lambda(f), T = 1000 / f;
            return { type: "exercice", question: "Une grosse caisse produit une fondamentale de <b>" + f + " Hz</b>. On la capte avec un micro dont la membrane mesure 2,5 cm de diamètre (c = 343 m/s).", etapes: [
              { question: "a) Quelle est la période de ce son (ms) ?", reponse: T, unite: "ms" },
              { question: "b) Quelle est sa longueur d’onde (m) ?", reponse: lam, unite: "m" },
              { question: "c) La membrane est-elle petite devant la longueur d’onde ?", bonne: "Oui, beaucoup plus petite", mauvaises: ["Non, elle est plus grande", "Elles sont du même ordre de grandeur"] }
            ], solution: "a) T = 1 / " + f + " = " + NB(T, 1) + " ms. b) λ = 343 / " + f + " ≈ " + NB(lam, 2) + " m. c) 2,5 cm contre " + NB(lam, 1) + " m : la membrane est des centaines de fois plus petite, elle ne perturbe pas l’onde à cette fréquence.", indice: "T = 1/f et λ = c/f." };
          },
          () => {
            const L = C([82, 86, 90, 94]), p = MICRO.pa(L), L2 = L + 3.01;
            return { type: "exercice", question: "Un guitariste joue seul : on mesure <b>" + L + " dB SPL</b> à la place du micro. Un second guitariste, aussi fort, le rejoint.", etapes: [
              { question: "a) Quelle pression efficace produit le premier guitariste (Pa) ?", reponse: p, unite: "Pa" },
              { question: "b) Quel est le niveau total quand les deux jouent (dB SPL) ?", reponse: L2, unite: "dB SPL", ecart: 0.5 },
              { question: "c) Pourquoi n’obtient-on pas +6 dB ?", bonne: "Les deux guitares ne sont pas corrélées : seules leurs puissances s’additionnent", mauvaises: ["Le micro sature au-delà de 3 dB", "Les décibels ne s’additionnent jamais", "Le second guitariste est forcément plus loin"] }
            ], solution: "a) p = 2·10⁻⁵ × 10<sup>" + NB(L / 20, 1) + "</sup> ≈ " + NB(p, 2) + " Pa. b) Deux sources égales non corrélées : +3 dB, soit " + NB(L2, 1) + " dB SPL. c) +6 dB n’arrive que pour deux signaux identiques et en phase (les pressions s’ajoutent alors).", indice: "Deux sources non corrélées : on additionne les puissances." };
          }
        ]
      }
    },

    /* ======================================================================
       MODULE 2 — TECHNOLOGIES DE MICRO (TRANSDUCTION)
       ====================================================================== */
    {
      titre: "Technologies de micro",
      nav: "Transduction",
      resume: "Dynamique, ruban, statique, électret",
      intro: "La membrane bouge : il reste à transformer ce mouvement en tension. C’est le rôle de l’<b>étage électromécanique</b>. Deux grandes familles se partagent les plateaux : les micros <b>électrodynamiques</b> (bobine mobile, ruban), où un conducteur se déplace dans un aimant, et les micros <b>électrostatiques</b> (à condensateur, électret), où la membrane est l’armature d’un condensateur. Leur principe explique leur sensibilité, leur robustesse et leur besoin d’alimentation.",

      notions: {
        titre: "Du mouvement de la membrane à la tension",
        intro: "Un micro électrodynamique produit une tension proportionnelle à la <b>vitesse</b> de la membrane ; un micro électrostatique, une tension proportionnelle à son <b>déplacement</b>. Les deux donnent une réponse plate, car leurs membranes sont conçues pour cela.",
        mots: [
          { t: "Micro dynamique (à bobine mobile)", ic: "🧲", q: "Comment fonctionne un micro dynamique ?", d: "La membrane est collée à une petite <b>bobine</b> placée dans l’entrefer d’un <b>aimant</b>. Quand la pression fait bouger la membrane, la bobine se déplace dans le champ magnétique : une tension apparaît à ses bornes (induction). Pas besoin d’alimentation." +
            SVG(440, 190,
              '<path d="M118 22 Q138 95 118 168" fill="none" stroke="#ffd60a" stroke-width="3"/>' +
              '<rect x="160" y="40" width="170" height="22" fill="#5e5ce6"/><rect x="160" y="128" width="170" height="22" fill="#5e5ce6"/><rect x="300" y="40" width="30" height="110" fill="#5e5ce6"/>' +
              '<rect x="186" y="80" width="114" height="30" fill="#8e8cf0"/>' +
              LIGNE(128, 71, 205, 71, { c: "#d4884a", w: 2 }) + LIGNE(128, 119, 205, 119, { c: "#d4884a", w: 2 }) +
              '<rect x="170" y="65" width="30" height="12" rx="2" fill="#d4884a"/><rect x="170" y="113" width="30" height="12" rx="2" fill="#d4884a"/>' +
              LIGNE(214, 62, 214, 80, { c: "#fff", w: 1.5 }) + LIGNE(244, 62, 244, 80, { c: "#fff", w: 1.5 }) + LIGNE(214, 110, 214, 128, { c: "#fff", w: 1.5 }) + LIGNE(244, 110, 244, 128, { c: "#fff", w: 1.5 }) +
              TXT(118, 184, "membrane", { s: 11, c: "#ffd60a" }) + TXT(185, 36, "bobine", { s: 11, c: "#d4884a" }) + TXT(245, 100, "pôle (aimant)", { s: 11, c: "#fff" }) + TXT(380, 70, "aimant", { s: 11, c: "#8e8cf0", a: "start" }) + TXT(360, 168, "champ B dans l’entrefer", { s: 11, c: "#8e8e93" }) +
              TXT(50, 100, "son →", { s: 13, c: "#64d2ff" }), "Coupe d’un micro dynamique : membrane, bobine mobile dans l’entrefer d’un aimant"),
            c: "Une dynamo de vélo : faire bouger un fil dans un aimant crée du courant.", r: "Sensibilité ≈ 1,5 à 3 mV/Pa · impédance ≈ 150 à 600 Ω · supporte des niveaux très élevés (plus de 140 dB SPL)." },
          { t: "Induction électromagnétique", ic: "⚡", q: "Pourquoi une bobine qui bouge dans un aimant produit-elle une tension ?", d: "Un conducteur de longueur l qui se déplace à la vitesse v perpendiculairement à un champ magnétique B voit apparaître à ses bornes une force électromotrice <b>e = B·l·v</b> (loi de Faraday). La tension est donc proportionnelle à la <b>vitesse</b> de la membrane : c’est vrai pour le micro dynamique comme pour le ruban.", c: "Plus on pédale vite, plus la dynamo du vélo éclaire fort.", r: "B ≈ 1 T dans l’entrefer · quelques mètres de fil · vitesse de la membrane de l’ordre du mm/s → quelques mV." },
          { t: "Micro à ruban", ic: "🎗️", q: "Comment fonctionne un micro à ruban ?", d: "Un <b>ruban d’aluminium</b> très fin (quelques µm), plissé, est tendu entre les pôles d’un aimant. Il est à la fois la membrane et le conducteur : e = B·l·v. Ouvert sur ses deux faces, il réagit à la différence de pression entre l’avant et l’arrière : il est naturellement <b>bidirectionnel</b> (en huit). Sa sensibilité est faible et sa masse mobile très faible donne un son doux et détaillé.", c: "Une feuille de papier à cigarette suspendue entre deux aimants : légère, précise, mais fragile.", r: "Ruban : ≈ 2 µm d’épaisseur · impédance du ruban ≈ 0,2 Ω · sensibilité d’un ruban passif ≈ 1 à 2 mV/Pa." },
          { t: "Transformateur de sortie", ic: "🔁", q: "Pourquoi un micro à ruban contient-il un transformateur ?", d: "Le ruban a une impédance minuscule (environ 0,2 Ω) et produit une tension infime. Un <b>transformateur élévateur</b> intégré multiplie la tension (et l’impédance) pour obtenir une sortie utilisable par un préamplificateur, de l’ordre de 150 à 300 Ω.", c: "Un engrenage qui transforme beaucoup de « force » en beaucoup de « vitesse » : le transformateur échange du courant contre de la tension.", r: "Ruban ≈ 0,2 Ω → sortie ≈ 150 à 300 Ω." },
          { t: "Micro électrostatique (à condensateur)", ic: "🔋", q: "Comment fonctionne un micro électrostatique ?", d: "Une membrane très fine et métallisée (quelques µm) est tendue devant une <b>contre-électrode</b> fixe et perforée : les deux forment un <b>condensateur</b> de capacité C = ε<sub>0</sub>·S/d. Quand la membrane bouge, la distance d change, donc la capacité. Le micro étant polarisé à <b>charge constante</b>, la tension U = Q/C varie comme la distance : elle suit le <b>déplacement</b> de la membrane." +
            SVG(440, 190,
              LIGNE(150, 25, 150, 165, { c: "#ffd60a", w: 3 }) +
              '<rect x="172" y="25" width="16" height="140" fill="#8e8e93"/>' + [45, 75, 105, 135].map(y => '<rect x="172" y="' + y + '" width="16" height="9" fill="#0b0c0e"/>').join("") +
              TXT(156, 95, "+", { s: 14, c: "#ff9f0a" }) + TXT(156, 125, "+", { s: 14, c: "#ff9f0a" }) + TXT(198, 95, "−", { s: 14, c: "#64d2ff" }) + TXT(198, 125, "−", { s: 14, c: "#64d2ff" }) +
              LIGNE(150, 25, 150, 12, { c: "#e5e5ea" }) + LIGNE(150, 12, 260, 12, { c: "#e5e5ea" }) + '<rect x="260" y="5" width="44" height="14" rx="3" fill="none" stroke="#e5e5ea"/>' + TXT(282, 34, "R ≈ 1 GΩ", { s: 11 }) + LIGNE(304, 12, 330, 12, { c: "#e5e5ea" }) + TXT(352, 16, "+U₀", { s: 12, c: "#ff9f0a" }) +
              LIGNE(150, 12, 150, 12) + LIGNE(240, 12, 240, 95, { c: "#e5e5ea" }) + '<path d="M240 70 L240 120 L290 95 Z" fill="none" stroke="#30d158" stroke-width="2"/>' + LIGNE(290, 95, 330, 95, { c: "#30d158", w: 2 }) + TXT(360, 99, "sortie", { s: 12, c: "#30d158" }) + TXT(265, 140, "préampli", { s: 11, c: "#30d158" }) +
              TXT(150, 182, "membrane", { s: 11, c: "#ffd60a" }) + TXT(204, 182, "contre-électrode", { s: 11, c: "#8e8e93", a: "start" }) + TXT(70, 100, "son →", { s: 13, c: "#64d2ff" }),
              "Coupe d’un micro électrostatique : membrane, contre-électrode perforée, résistance de polarisation, préamplificateur"),
            c: "Deux plaques séparées par un fil d’air : quand on les rapproche, la « contenance » électrique change, comme le volume d’une éponge qu’on presse.", r: "Distance membrane / contre-électrode ≈ 20 à 40 µm · capacité ≈ 50 à 200 pF · sensibilité ≈ 10 à 40 mV/Pa." },
          { t: "Tension de polarisation", ic: "⚙️", q: "À quoi sert la tension de polarisation ?", d: "C’est la tension continue U<sub>0</sub> qui <b>charge</b> le condensateur formé par la membrane et la contre-électrode. Elle est appliquée à travers une résistance de très forte valeur (de l’ordre du GΩ) : la charge Q n’a pas le temps de varier au rythme du son. Elle est souvent produite dans le micro, à partir de l’alimentation fantôme.", c: "La tension d’un ressort : sans elle, la membrane peut bouger, rien ne se passe électriquement.", r: "U<sub>0</sub> ≈ 40 à 60 V selon les capsules · résistance ≈ 1 GΩ." },
          { t: "Convertisseur d’impédance", ic: "🔌", q: "Pourquoi un micro électrostatique a-t-il besoin d’un préamplificateur intégré ?", d: "La capsule est un condensateur de quelques dizaines de pF : son <b>impédance</b> est énorme (plusieurs MΩ aux fréquences audio). Elle ne peut pas alimenter un câble ni une entrée de console. Un petit étage électronique (transistor à effet de champ, ou tube) placé juste derrière la capsule « convertit » cette impédance en une sortie basse impédance. Il doit être <b>alimenté</b> : en pratique par l’alimentation fantôme 48 V.", c: "Un traducteur placé juste derrière quelqu’un qui chuchote : il répète le message assez fort pour qu’on l’entende au fond de la salle.", r: "Capsule de 100 pF à 1 kHz : Z = 1/(2πfC) ≈ 1,6 MΩ · sortie du micro ≈ 50 à 200 Ω." },
          { t: "Micro électret", ic: "🪫", q: "Qu’est-ce qu’un micro électret ?", d: "Un micro électrostatique dont un matériau isolant porte une <b>charge électrique permanente</b> (sur la membrane, ou sur la contre-électrode : on parle alors de « back-électret »). Il n’a pas besoin de tension de polarisation, mais son préampli intégré (un FET) doit quand même être <b>alimenté</b> : pile, plug-in power ou fantôme. Petit et économique, il équipe les micros cravates, les serre-têtes, les caméras.", c: "Un aimant permanent, mais pour l’électricité : la charge est « figée » dans le matériau.", r: "Capsules de quelques mm · alimentation du FET : de 1,5 V (pile) à 48 V (fantôme, via un adaptateur ou un circuit intégré)." },
          { t: "Micro MEMS", ic: "📱", q: "Qu’est-ce qu’un micro MEMS ?", d: "Un micro <b>gravé dans le silicium</b>, comme une puce électronique (MEMS : microsystème électromécanique). La plupart fonctionnent comme un petit condensateur. Beaucoup intègrent leur électronique et délivrent directement un signal <b>numérique</b> (souvent en modulation PDM). Ils équipent les téléphones, les ordinateurs portables et les enceintes connectées.", c: "Un micro fabriqué comme un processeur : par milliers sur une plaque de silicium.", r: "Boîtier de quelques mm · plusieurs micros MEMS dans un même téléphone." },
          { t: "Micro piézoélectrique", ic: "🎻", q: "Qu’est-ce qu’un micro piézoélectrique ?", d: "Un cristal ou une céramique qui produit une tension quand on le <b>déforme</b>. On s’en sert surtout comme micro de <b>contact</b>, collé sur un instrument (guitare acoustique, violon) : il capte les vibrations du bois plutôt que le son dans l’air.", c: "Le briquet piézo : on presse un cristal, une étincelle jaillit.", r: "Impédance très élevée : il demande une entrée adaptée (boîte de direct ou préampli à haute impédance)." },
          { t: "Masse mobile et transitoires", ic: "🥁", q: "Pourquoi la masse de la membrane compte-t-elle ?", d: "Un <b>transitoire</b> est une attaque brève (frappe de baguette, consonne « t »). Une membrane légère suit ces variations rapides ; une membrane lourde (membrane + bobine d’un dynamique) les « arrondit ». C’est pourquoi le micro statique, à membrane très légère, rend mieux les aigus et les attaques ; le dynamique, plus lourd, est plus robuste mais moins fin.", c: "Une plume et une boule de pétanque soufflées par le même coup de vent : la plume réagit tout de suite.", r: "Membrane statique : quelques µm, quelques mg · ensemble membrane + bobine d’un dynamique : nettement plus lourd." }
        ],
        formules: [
          { q: "Quelle tension produit une bobine qui bouge dans un aimant ?", f: "e = B · l · v", say: "e est égal à B fois l fois v", rows: [["e", "force électromotrice (tension)", "V", "ce que délivre le micro"], ["B", "induction magnétique dans l’entrefer", "T (tesla)", "la force de l’aimant"], ["l", "longueur de fil dans le champ", "m", "le nombre de spires × leur tour"], ["v", "vitesse de la membrane", "m/s", "suit la pression acoustique"]], ex: "B = 1 T, l = 2 m, v = 1 mm/s = 0,001 m/s : e = 1 × 2 × 0,001 = 0,002 V = <b>2 mV</b>." },
          { q: "Quelle est la capacité de la capsule d’un micro statique ?", f: "C = ε<sub>0</sub> · S / d", say: "C est égal à epsilon zéro fois S divisé par d", rows: [["C", "capacité", "F", "souvent exprimée en pF (10⁻¹² F)"], ["ε<sub>0</sub>", "permittivité du vide (≈ celle de l’air)", "F/m", "8,85·10⁻¹² F/m"], ["S", "surface de la membrane", "m²", "π × rayon²"], ["d", "distance membrane / contre-électrode", "m", "quelques dizaines de µm"]], ex: "Membrane de 20 mm de diamètre : S = π × 0,01² = 3,14·10⁻⁴ m² ; d = 25 µm. C = 8,85·10⁻¹² × 3,14·10⁻⁴ / 25·10⁻⁶ ≈ 1,11·10⁻¹⁰ F = <b>111 pF</b>." },
          { q: "Pourquoi la tension suit-elle le déplacement de la membrane ?", f: "U = Q / C  →  ΔU = U<sub>0</sub> · Δd / d<sub>0</sub>", say: "U est égal à Q sur C ; donc delta U est égal à U zéro fois delta d sur d zéro", rows: [["U<sub>0</sub>", "tension de polarisation au repos", "V", "≈ 40 à 60 V"], ["d<sub>0</sub>", "distance au repos", "m", "≈ 20 à 40 µm"], ["Δd", "déplacement de la membrane", "m", "quelques nm pour 1 Pa"], ["ΔU", "tension du signal", "V", "proportionnelle à Δd"]], ex: "Q est constante, et C = ε<sub>0</sub>S/d, donc U = Q·d/(ε<sub>0</sub>S) est proportionnelle à d. U<sub>0</sub> = 48 V, d<sub>0</sub> = 25 µm, Δd = 10 nm : ΔU = 48 × 0,010 / 25 ≈ 0,019 V = <b>19 mV</b>." }
        ]
      },

      manipuler: {
        titre: "Ouvrir les capsules",
        intro: "Choisissez une <b>technologie</b> et regardez la membrane bouger sous l’effet de l’onde. Comparez les tensions produites au même niveau sonore. Puis réglez vous-même un <b>condensateur à charge constante</b> pour voir d’où vient la sensibilité d’un micro statique."
      },

      essentiel: {
        definitions: [
          "<b>Dynamique</b> : bobine solidaire de la membrane, dans un aimant ; e = B·l·v ; aucune alimentation ; robuste, faible sensibilité.",
          "<b>Ruban</b> : ruban d’aluminium de quelques µm dans un aimant ; naturellement en huit ; très faible impédance → transformateur ; fragile.",
          "<b>Électrostatique</b> : membrane + contre-électrode = condensateur ; charge constante → tension proportionnelle au déplacement ; polarisation + préampli → alimentation fantôme.",
          "<b>Électret</b> : charge permanente, pas de polarisation, mais préampli FET à alimenter (pile, plug-in power, fantôme).",
          "<b>MEMS</b> : micro gravé sur silicium, souvent à sortie numérique · <b>piézo</b> : micro de contact."
        ],
        formules: [
          ["e = B · l · v", "dynamique et ruban : tension ∝ vitesse de la membrane"],
          ["C = ε<sub>0</sub> · S / d", "ε<sub>0</sub> = 8,85·10⁻¹² F/m"],
          ["ΔU = U<sub>0</sub> · Δd / d<sub>0</sub>", "statique à charge constante : tension ∝ déplacement"],
          ["Z = 1 / (2π f C)", "impédance de la capsule : énorme, d’où le convertisseur d’impédance"]
        ],
        reperes: [
          "Sensibilité : dynamique ≈ 1,5 à 3 mV/Pa · ruban passif ≈ 1 à 2 mV/Pa · statique ≈ 10 à 40 mV/Pa.",
          "Au même niveau sonore, un statique délivre environ <b>10 fois</b> plus de tension qu’un dynamique (≈ +20 dB).",
          "Capsule statique : d ≈ 20 à 40 µm, C ≈ 50 à 200 pF, U<sub>0</sub> ≈ 40 à 60 V, résistance de polarisation ≈ 1 GΩ.",
          "Alimentation : dynamique et ruban passif : aucune · statique, ruban actif : fantôme 48 V · électret : pile, plug-in power ou fantôme."
        ],
        pieges: [
          "Un électret n’a pas besoin de tension de <b>polarisation</b>, mais il a besoin d’une alimentation pour son préampli.",
          "« Statique » ne veut pas dire « qui ne bouge pas » : c’est le nom du principe électrostatique (condensateur).",
          "Dynamique et ruban réagissent à la vitesse, le statique au déplacement : les deux donnent pourtant une réponse plate, grâce à la façon dont leurs membranes sont conçues.",
          "Un ruban passif se manipule avec précaution : éviter de le brancher ou de le débrancher fantôme allumé, et proscrire les câbles défectueux.",
          "Faible sensibilité ne veut pas dire mauvais micro : le dynamique est choisi pour sa robustesse et sa tenue aux forts niveaux."
        ]
      },

      evaluation: {
        lire: [
          () => {
            const S = C([1.6, 1.8, 2.1, 2.5, 2.8]), Z = C([150, 200, 300, 600]);
            return { type: "nombre", contexte: figFiche("Micro de chant — fiche technique", [["Principe", "Dynamique (bobine mobile)"], ["Directivité", "Cardioïde"], ["Réponse en fréquence", "50 Hz – 15 kHz"], ["Sensibilité", NB(S, 1) + " mV/Pa (" + NB(MICRO.dbv(S), 1).replace("-", "−") + " dBV)"], ["Impédance nominale", Z + " Ω"], ["Alimentation", "Aucune"]]), question: "Lisez la <b>sensibilité</b> de ce micro, en mV/Pa.", reponse: S, unite: "mV/Pa", ecart: 0.05, explication: "La fiche indique " + NB(S, 1) + " mV/Pa : une valeur typique de micro dynamique (1,5 à 3 mV/Pa).", indice: "Cherchez la ligne « Sensibilité »." };
          },
          () => {
            const I = C([2.2, 3.5, 4, 5.4]), S = C([12, 15, 20, 25, 28]);
            return { type: "nombre", contexte: figFiche("Micro statique petite membrane — fiche technique", [["Principe", "Électrostatique (condensateur)"], ["Directivité", "Cardioïde"], ["Sensibilité", S + " mV/Pa"], ["Bruit propre", "15 dB(A)"], ["Alimentation", "Fantôme P48 (48 V ± 4 V)"], ["Consommation", NB(I, 1) + " mA"]]), question: "Quelle est la <b>tension nominale</b> de l’alimentation demandée par ce micro ?", reponse: 48, unite: "V", ecart: 0, explication: "P48 désigne l’alimentation fantôme de 48 V (± 4 V selon la norme). Un micro statique en a besoin pour polariser sa capsule et alimenter son préampli.", indice: "Ligne « Alimentation »." };
          },
          () => {
            const dyn = Math.random() < 0.5;
            const fig = dyn
              ? SVG(440, 170, '<path d="M110 18 Q128 85 110 152" fill="none" stroke="#ffd60a" stroke-width="3"/><rect x="150" y="34" width="160" height="20" fill="#5e5ce6"/><rect x="150" y="116" width="160" height="20" fill="#5e5ce6"/><rect x="282" y="34" width="28" height="102" fill="#5e5ce6"/><rect x="176" y="70" width="106" height="30" fill="#8e8cf0"/><rect x="160" y="57" width="28" height="10" fill="#d4884a"/><rect x="160" y="103" width="28" height="10" fill="#d4884a"/>' + LIGNE(118, 62, 162, 62, { c: "#d4884a", w: 2 }) + LIGNE(118, 108, 162, 108, { c: "#d4884a", w: 2 }) + TXT(372, 90, "?", { s: 28, c: "#8e8e93" }), "Coupe d’un micro : une membrane reliée à un enroulement placé dans l’entrefer d’un aimant")
              : SVG(440, 170, LIGNE(150, 20, 150, 150, { c: "#ffd60a", w: 3 }) + '<rect x="170" y="20" width="16" height="130" fill="#8e8e93"/>' + [38, 68, 98, 128].map(y => '<rect x="170" y="' + y + '" width="16" height="8" fill="#0b0c0e"/>').join("") + TXT(158, 86, "+", { s: 14, c: "#ff9f0a" }) + TXT(196, 86, "−", { s: 14, c: "#64d2ff" }) + '<path d="M240 60 L240 110 L285 85 Z" fill="none" stroke="#30d158" stroke-width="2"/>' + LIGNE(186, 85, 240, 85, { c: "#e5e5ea" }) + TXT(372, 90, "?", { s: 28, c: "#8e8e93" }), "Coupe d’un micro : une membrane métallisée face à une plaque perforée, avec un petit amplificateur");
            return { type: "qcm", figure: fig, question: "Ce schéma est la coupe d’une capsule. De quelle technologie s’agit-il ?", bonne: dyn ? "Dynamique à bobine mobile" : "Électrostatique (à condensateur)", mauvaises: dyn ? ["Électrostatique (à condensateur)", "Ruban", "Piézoélectrique"] : ["Dynamique à bobine mobile", "Ruban", "Piézoélectrique"], explication: dyn ? "Une membrane solidaire d’une bobine plongée dans l’entrefer d’un aimant : c’est le micro dynamique (e = B·l·v)." : "Une membrane chargée face à une contre-électrode perforée, suivie d’un préampli : c’est un condensateur, donc un micro électrostatique.", indice: dyn ? "Repérez l’aimant (en violet)." : "Deux armatures face à face, c’est quel composant ?" };
          },
          () => {
            const Zs = C([150, 200, 250, 300]);
            return { type: "nombre", contexte: figFiche("Micro à ruban passif — fiche technique", [["Principe", "Ruban d’aluminium, 2 µm"], ["Directivité", "Bidirectionnelle (en huit)"], ["Impédance du ruban", "0,2 Ω"], ["Transformateur", "Intégré"], ["Impédance de sortie", Zs + " Ω"], ["Sensibilité", "1,5 mV/Pa"]]), question: "Quelle est l’<b>impédance que voit le préampli</b> branché sur ce micro ?", reponse: Zs, unite: "Ω", ecart: 0, explication: "Le préampli est branché après le transformateur intégré : il voit l’impédance de sortie, " + Zs + " Ω. Les 0,2 Ω sont ceux du ruban seul, avant transformateur.", indice: "Entre le ruban et la prise, il y a un transformateur." };
          }
        ],
        comprendre: [
          ["Un micro dynamique a besoin de l’alimentation fantôme pour fonctionner.", false, "La bobine qui bouge dans l’aimant produit seule sa tension (induction). Le fantôme ne le gêne pas sur une liaison symétrique correcte, mais il ne lui sert à rien."],
          ["Dans un micro dynamique, la tension produite est proportionnelle à la vitesse de la membrane.", true, "e = B·l·v : à aimant et bobine donnés, seule la vitesse fait varier la tension."],
          ["Dans un micro électrostatique polarisé à charge constante, la tension suit le déplacement de la membrane.", true, "U = Q/C = Q·d/(ε<sub>0</sub>S) : la tension est proportionnelle à la distance, donc ses variations au déplacement."],
          ["Un micro électret n’a besoin d’aucune alimentation.", false, "Il n’a pas besoin de tension de polarisation (charge permanente), mais son préampli FET doit être alimenté (pile, plug-in power ou fantôme).", "Que contient le corps d’un électret, juste derrière la capsule ?"],
          ["Un micro à ruban passif est naturellement bidirectionnel.", true, "Le ruban est ouvert sur ses deux faces : il réagit à la différence de pression avant / arrière, ce qui donne une directivité en huit."],
          ["Le ruban d’un micro à ruban a une impédance élevée, de plusieurs kΩ.", false, "C’est l’inverse : environ 0,2 Ω. Un transformateur élévateur intégré remonte l’impédance de sortie vers 150 à 300 Ω."],
          ["La capsule d’un micro statique peut attaquer directement un long câble sans électronique.", false, "La capsule (quelques dizaines de pF) a une impédance de plusieurs MΩ : il faut un convertisseur d’impédance juste derrière elle."],
          ["Au même niveau sonore, un micro statique délivre généralement plus de tension qu’un micro dynamique.", true, "≈ 10 à 40 mV/Pa contre 1,5 à 3 mV/Pa : environ 10 fois plus, soit ≈ +20 dB."],
          ["Un micro « statique » s’appelle ainsi parce que sa membrane ne bouge pas.", false, "Le mot vient de « électrostatique » : le principe repose sur un condensateur. Sa membrane bouge, comme celle de tous les micros."],
          ["La membrane très légère d’un micro statique lui permet de mieux suivre les transitoires que la membrane d’un dynamique.", true, "Membrane de quelques µm, sans bobine : la masse mobile est bien plus faible, les attaques et les aigus sont mieux rendus."]
        ],
        qcm: [
          ["Quel principe utilise un micro dynamique ?", "L’induction : une bobine se déplace dans un aimant", ["Un condensateur dont la capacité varie", "Un cristal qui se déforme", "Une résistance qui varie avec la pression"], "e = B·l·v : la bobine solidaire de la membrane coupe les lignes de champ de l’aimant."],
          ["Pourquoi un micro électrostatique a-t-il besoin de l’alimentation fantôme ?", "Pour polariser la capsule et alimenter son préampli intégré", ["Pour faire bouger la membrane", "Pour aimanter la bobine mobile", "Pour transmettre le son en numérique"], "La capsule doit être chargée (tension de polarisation) et son convertisseur d’impédance alimenté : le fantôme 48 V fournit les deux."],
          ["Quel micro se trouve le plus souvent dans un micro cravate ?", "Un électret", ["Un ruban", "Un dynamique à bobine mobile", "Un micro piézoélectrique"], "L’électret est minuscule, économique, et s’alimente facilement depuis l’émetteur HF ou une pile."],
          ["Quelle est la sensibilité typique d’un micro dynamique ?", "Environ 2 mV/Pa", ["Environ 20 mV/Pa", "Environ 200 mV/Pa", "Environ 2 V/Pa"], "Un dynamique délivre ≈ 1,5 à 3 mV/Pa ; 20 mV/Pa est une valeur de micro statique."],
          ["À quoi sert le transformateur intégré d’un micro à ruban ?", "À élever la tension et l’impédance très faibles du ruban", ["À fournir le 48 V au ruban", "À rendre le micro omnidirectionnel", "À convertir le signal en numérique"], "Le ruban fait ≈ 0,2 Ω ; le transformateur élévateur amène la sortie vers 150 à 300 Ω avec une tension plus utilisable."],
          ["Dans un micro électrostatique, que forment la membrane et la contre-électrode ?", "Un condensateur", ["Une bobine", "Un transformateur", "Une pile"], "Deux armatures conductrices séparées par une fine couche d’air : C = ε<sub>0</sub>·S/d."],
          ["Quel micro choisir pour une grosse caisse ou un ampli guitare très fort, en reportage sous la pluie ?", "Un dynamique", ["Un ruban passif", "Un statique à grande membrane", "Un micro MEMS de téléphone"], "Le dynamique est robuste, insensible à l’humidité et supporte des niveaux très élevés."],
          ["Où trouve-t-on surtout des micros MEMS ?", "Dans les téléphones et les ordinateurs portables", ["Sur les perches de cinéma", "Dans les micros à ruban de studio", "Dans les micros de grosse caisse"], "Gravés sur silicium, minuscules et souvent à sortie numérique : ils équipent l’électronique grand public."]
        ],
        calculer: [
          () => { const B = C([0.8, 1, 1.2, 1.5]), l = C([1.5, 2, 2.5, 3, 4]), v = C([0.5, 1, 2, 3]), e = B * l * v; return { type: "nombre", question: "Dans un micro dynamique, B = <b>" + NB(B, 1) + " T</b>, la bobine a <b>" + NB(l, 1) + " m</b> de fil dans l’entrefer et la membrane se déplace à <b>" + NB(v, 1) + " mm/s</b>. Calculez la tension produite, en mV.", reponse: e, unite: "mV", explication: "e = B·l·v = " + NB(B, 1) + " × " + NB(l, 1) + " × " + NB(v / 1000, 4) + " = " + NB(e / 1000, 5) + " V = <b>" + NB(e, 2) + " mV</b>.", indice: "Convertissez la vitesse en m/s, puis e = B·l·v." }; },
          () => { const D = C([12, 16, 20, 25, 34]), d = C([20, 25, 30, 40]), S = Math.PI * Math.pow(D / 2000, 2), Cp = 8.85e-12 * S / (d * 1e-6) * 1e12; return { type: "nombre", question: "Une capsule statique a une membrane de <b>" + D + " mm</b> de diamètre, à <b>" + d + " µm</b> de la contre-électrode. Calculez sa capacité en pF (ε<sub>0</sub> = 8,85·10⁻¹² F/m).", reponse: Cp, unite: "pF", explication: "S = π × (" + NB(D / 2000, 4) + ")² = " + NB(S * 1e4, 3) + "·10⁻⁴ m². C = ε<sub>0</sub>·S/d = 8,85·10⁻¹² × " + NB(S * 1e4, 3) + "·10⁻⁴ / " + d + "·10⁻⁶ ≈ <b>" + NB(Cp, 0) + " pF</b>.", indice: "Le rayon vaut la moitié du diamètre ; tout en mètres." }; },
          () => { const U0 = C([40, 48, 60]), d0 = C([20, 25, 30, 40]), dd = C([5, 8, 10, 15, 20]), dU = U0 * dd / (d0 * 1000) * 1000; return { type: "nombre", question: "Un micro statique est polarisé à charge constante sous <b>U<sub>0</sub> = " + U0 + " V</b>, avec une distance au repos de <b>" + d0 + " µm</b>. Une pression déplace la membrane de <b>" + dd + " nm</b>. Quelle tension de signal obtient-on, en mV ?", reponse: dU, unite: "mV", explication: "ΔU = U<sub>0</sub> × Δd / d<sub>0</sub> = " + U0 + " × " + dd + "·10⁻⁹ / " + d0 + "·10⁻⁶ = " + U0 + " × " + NB(dd / (d0 * 1000), 5) + " ≈ <b>" + NB(dU, 1) + " mV</b>.", indice: "Mettez Δd et d<sub>0</sub> dans la même unité (1 µm = 1 000 nm)." }; },
          () => { const Cp = C([50, 80, 100, 150]), f = C([20, 100, 1000]), Z = 1 / (2 * Math.PI * f * Cp * 1e-12) / 1e6; return { type: "nombre", question: "La capsule d’un micro statique a une capacité de <b>" + Cp + " pF</b>. Quelle est son impédance à <b>" + NB(f, 0) + " Hz</b>, en MΩ ? (Z = 1 / (2π f C))", reponse: Z, unite: "MΩ", explication: "Z = 1 / (2π × " + NB(f, 0) + " × " + Cp + "·10⁻¹²) ≈ <b>" + NB(Z, Z < 10 ? 2 : 0) + " MΩ</b>. Une telle impédance ne peut pas attaquer un câble : d’où le convertisseur d’impédance intégré.", indice: "1 pF = 10⁻¹² F ; 1 MΩ = 10⁶ Ω." }; },
          () => { const Sd = C([1.5, 2, 2.5]), Ss = C([10, 15, 20, 25, 30]), r = 20 * Math.log10(Ss / Sd); return { type: "nombre", question: "Au même endroit, un micro dynamique de <b>" + NB(Sd, 1) + " mV/Pa</b> et un micro statique de <b>" + Ss + " mV/Pa</b> captent la même source. De combien de décibels la tension du statique dépasse-t-elle celle du dynamique ?", reponse: r, unite: "dB", ecart: 0.3, explication: "Rapport de tensions : " + Ss + " / " + NB(Sd, 1) + " = " + NB(Ss / Sd, 1) + ". En dB : 20 log(" + NB(Ss / Sd, 1) + ") ≈ <b>" + NB(r, 1) + " dB</b>.", indice: "Pour un rapport de tensions : 20 log(rapport)." }; },
          () => { const S = C([1.8, 2.5, 12, 20, 35]), p = C([0.1, 0.2, 0.5, 1, 2, 5]), U = S * p; return { type: "nombre", question: "Un micro de sensibilité <b>" + NB(S, 1) + " mV/Pa</b> reçoit une pression efficace de <b>" + NB(p, 1) + " Pa</b>. Quelle tension délivre-t-il, en mV ?", reponse: U, unite: "mV", explication: "U = sensibilité × pression = " + NB(S, 1) + " × " + NB(p, 1) + " = <b>" + NB(U, 2) + " mV</b>.", indice: "La sensibilité est la tension délivrée pour 1 Pa." }; }
        ],
        exercice: [
          () => {
            const D = C([16, 20, 25]), d0 = C([20, 25, 30]), U0 = C([48, 60]), dd = C([8, 10, 12]);
            const S = Math.PI * Math.pow(D / 2000, 2), Cp = 8.85e-12 * S / (d0 * 1e-6) * 1e12, dU = U0 * dd / (d0 * 1000) * 1000;
            return { type: "exercice", question: "Une capsule statique : membrane de <b>" + D + " mm</b> de diamètre, distance au repos <b>" + d0 + " µm</b>, polarisation <b>" + U0 + " V</b> à charge constante. Une pression de 1 Pa déplace la membrane de <b>" + dd + " nm</b>.", etapes: [
              { question: "a) Surface de la membrane (en cm²) ?", reponse: S * 1e4, unite: "cm²" },
              { question: "b) Capacité de la capsule (en pF) ?", reponse: Cp, unite: "pF" },
              { question: "c) Tension produite pour 1 Pa, c’est-à-dire la sensibilité (en mV/Pa) ?", reponse: dU, unite: "mV/Pa" }
            ], solution: "a) S = π × (" + NB(D / 20, 2) + " cm)² ≈ " + NB(S * 1e4, 2) + " cm². b) C = 8,85·10⁻¹² × " + NB(S, 6) + " / " + d0 + "·10⁻⁶ ≈ " + NB(Cp, 0) + " pF. c) ΔU = " + U0 + " × " + dd + " nm / " + d0 + " µm ≈ " + NB(dU, 1) + " mV, soit une sensibilité de " + NB(dU, 1) + " mV/Pa : une valeur typique de micro statique.", indice: "S = π r² ; C = ε<sub>0</sub>S/d ; ΔU = U<sub>0</sub>·Δd/d<sub>0</sub>." };
          },
          () => {
            const Sd = C([1.8, 2, 2.5]), Ss = C([15, 20, 25]), L = C([74, 80, 86, 94]), p = MICRO.pa(L);
            return { type: "exercice", question: "Une voix produit <b>" + L + " dB SPL</b> à l’emplacement du micro. On compare un dynamique de <b>" + NB(Sd, 1) + " mV/Pa</b> et un statique de <b>" + Ss + " mV/Pa</b>.", etapes: [
              { question: "a) Pression efficace au micro (Pa) ?", reponse: p, unite: "Pa" },
              { question: "b) Tension délivrée par le dynamique (mV) ?", reponse: Sd * p, unite: "mV" },
              { question: "c) Tension délivrée par le statique (mV) ?", reponse: Ss * p, unite: "mV" },
              { question: "d) Lequel demandera le plus de gain au préampli ?", bonne: "Le dynamique", mauvaises: ["Le statique", "Les deux autant"] }
            ], solution: "a) p = 2·10⁻⁵ × 10<sup>" + NB(L / 20, 1) + "</sup> ≈ " + NB(p, 3) + " Pa. b) " + NB(Sd, 1) + " × " + NB(p, 3) + " ≈ " + NB(Sd * p, 3) + " mV. c) " + Ss + " × " + NB(p, 3) + " ≈ " + NB(Ss * p, 2) + " mV. d) Le dynamique délivre " + NB(Ss / Sd, 1) + " fois moins de tension : il faut ≈ " + NB(20 * Math.log10(Ss / Sd), 0) + " dB de gain en plus.", indice: "Tension = sensibilité × pression." };
          },
          () => {
            const n = C([50, 80, 100, 120]), Dc = C([1.5, 2, 2.5]), B = C([1, 1.2]), v = C([0.5, 1, 2]);
            const l = n * Math.PI * Dc / 100, e = B * l * v;
            return { type: "exercice", question: "La bobine d’un micro dynamique compte <b>" + n + " spires</b> de <b>" + NB(Dc, 1) + " cm</b> de diamètre, toutes dans l’entrefer où B = <b>" + NB(B, 1) + " T</b>. La membrane se déplace à <b>" + NB(v, 1) + " mm/s</b>.", etapes: [
              { question: "a) Longueur de fil dans le champ (m) ?", reponse: l, unite: "m" },
              { question: "b) Tension produite (mV) ?", reponse: e, unite: "mV" },
              { question: "c) Si la membrane va deux fois plus vite, la tension :", bonne: "double", mauvaises: ["ne change pas", "est divisée par deux", "est multipliée par quatre"] }
            ], solution: "a) l = n × π × D = " + n + " × π × " + NB(Dc / 100, 3) + " ≈ " + NB(l, 2) + " m. b) e = " + NB(B, 1) + " × " + NB(l, 2) + " × " + NB(v / 1000, 4) + " ≈ " + NB(e, 2) + " mV. c) e = B·l·v est proportionnelle à la vitesse : elle double.", indice: "Une spire mesure π × D." };
          }
        ]
      }
    },

    /* ======================================================================
       MODULE 3 — LES CAPSULES : pression, gradient de pression, proximité
       ====================================================================== */
    {
      titre: "Les capsules : pression et gradient de pression",
      nav: "Capsules",
      resume: "Pression, gradient, proximité",
      intro: "Le module 2 expliquait comment le mouvement de la membrane devient une tension. Ce module regarde <b>autour de la membrane</b> : est-elle ouverte d’un seul côté ou des deux ? C’est cette construction acoustique qui décide de la directivité du micro… et de l’effet de proximité qui gonfle les graves quand on parle tout près.",

      notions: {
        titre: "La construction acoustique de la capsule",
        intro: "Une capsule <b>à pression</b> mesure la pression en un point ; une capsule <b>à gradient de pression</b> mesure une différence entre l’avant et l’arrière de la membrane. Presque toutes les directivités naissent d’un mélange des deux.",
        mots: [
          { t: "Capsule", ic: "🎙️", q: "Qu’appelle-t-on la capsule d’un micro ?", d: "La partie qui reçoit le son : la <b>membrane</b> et tout ce qui l’entoure (boîtier, ouvertures, cavités, réseau acoustique). Sa construction fixe la directivité ; le transducteur (module 2) fixe la façon dont le mouvement devient une tension.", c: "Une oreille : le tympan est la membrane, mais la forme du pavillon et du conduit change ce qu’il reçoit.", r: "Petite membrane ≈ 12 mm (« ½ pouce ») · grande membrane ≈ 25 mm (« 1 pouce »)." },
          { t: "Capsule à pression", ic: "⚪", q: "Comment fonctionne une capsule à pression ?", d: "La membrane n’est exposée au son que <b>d’un seul côté</b> : l’arrière est une cavité close. Elle suit la pression acoustique en un point, une grandeur qui n’a pas de direction : la capsule est donc <b>omnidirectionnelle</b>.", c: "Un baromètre : il indique la pression, sans savoir d’où vient le vent.", r: "Pas d’effet de proximité · omni « vrai » dans le grave et le médium · directive dans l’aigu." },
          { t: "Évent d’équilibrage", ic: "🕳️", q: "Pourquoi une capsule à pression a-t-elle un minuscule trou à l’arrière ?", d: "Un très petit évent laisse passer les variations <b>très lentes</b> de la pression atmosphérique (météo, altitude, avion) pour que la membrane ne soit pas bombée en permanence. Il est trop fin pour laisser passer le son.", c: "La trompe d’Eustache, qui équilibre la pression de part et d’autre du tympan quand on bâille en avion.", r: "Il n’agit qu’en dessous de quelques hertz : la capsule reste une capsule à pression." },
          { t: "Capsule à gradient de pression", ic: "8️⃣", q: "Comment fonctionne une capsule à gradient de pression ?", d: "La membrane est <b>ouverte des deux côtés</b>. Elle est poussée par la <b>différence</b> entre la pression devant et la pression derrière. Un son venant de face arrive d’abord devant ; un son venant de côté (90°) arrive en même temps des deux côtés : la différence est nulle. La réponse suit cos θ : la directivité est <b>bidirectionnelle</b> (en huit).", c: "Une porte battante : si l’on pousse des deux côtés avec la même force, elle ne bouge pas.", r: "Maximum à 0° et 180° · annulation à 90° et 270° · le micro à ruban est naturellement à gradient." },
          { t: "Polarité du lobe arrière", ic: "🔁", q: "Que signifie « lobe arrière en opposition de polarité » ?", d: "Pour un son venant de l’arrière (180°), c’est la face arrière qui est poussée la première : la membrane part dans l’autre sens. Le signal a la même amplitude qu’à l’avant, mais il est <b>inversé</b>. Sur les diagrammes, ce lobe est souvent dessiné en pointillés ou marqué « − ».", c: "Une balançoire poussée du côté opposé : elle part dans l’autre sens.", r: "En huit : 0° → +1 ; 180° → −1 (même niveau, polarité inversée)." },
          { t: "Réseau de déphasage (labyrinthe)", ic: "🌀", q: "Comment obtient-on une capsule cardioïde ?", d: "On place à l’arrière de la membrane un <b>réseau acoustique</b> (fentes, chicanes, matériau amortissant) qui <b>retarde</b> le son atteignant la face arrière. Pour un son venant de 180°, ce retard interne compense exactement le trajet extérieur : les deux faces reçoivent la même pression au même instant, la membrane ne bouge pas. On obtient un mélange de pression et de gradient : r(θ) = A + B·cos θ.", c: "Deux coureurs qui partent en même temps : si celui qui a le chemin le plus court porte un sac de sable, ils arrivent ensemble.", r: "Cardioïde : retard interne = trajet avant-arrière · retard plus court → supercardio, hypercardio · retard nul → huit." },
          { t: "Double membrane", ic: "🔀", q: "Comment un micro peut-il proposer plusieurs directivités ?", d: "La capsule à double membrane (principe <b>Braunmühl-Weber</b>) place deux membranes cardioïdes dos à dos autour d’une contre-électrode commune. Avant : ½(1 + cos θ) ; arrière : ½(1 − cos θ). En dosant la tension de polarisation de la membrane arrière : somme → <b>omni</b>, avant seule → <b>cardio</b>, différence → <b>huit</b>, et tout ce qui est entre les deux.", c: "Deux projecteurs dos à dos sur un gradateur : on choisit la part de lumière envoyée vers l’arrière.", r: "Micros multidirectivités de studio, souvent à grande membrane (≈ 25 mm)." },
          { t: "Effet de proximité", ic: "📈", q: "Qu’est-ce que l’effet de proximité ?", d: "Le <b>renforcement des graves</b> d’une capsule à gradient (tout ce qui n’est pas omni) quand la source est proche. Près d’une source, l’onde est sphérique : la différence de pression avant-arrière contient un terme qui grandit quand la fréquence et la distance diminuent. Une capsule à pression (omni) n’a pas d’effet de proximité.", c: "Une voix de radio « chaude », très proche du micro : c’est l’effet de proximité que l’animateur exploite.", r: "Cardio à 100 Hz : ≈ +15 dB à 5 cm · ≈ +2,6 dB à 30 cm · ≈ +0,3 dB à 1 m. En huit à 5 cm : ≈ +21 dB." },
          { t: "Coupe-bas", ic: "✂️", q: "À quoi sert le coupe-bas d’un micro ou d’une console ?", d: "Un <b>filtre passe-haut</b> qui atténue les fréquences sous une fréquence de coupure. Il compense l’effet de proximité, et retire les bruits de manipulation, de vent et de vibration du sol.", c: "Un tamis qui ne laisse passer que les grains assez gros : ici, ce sont les fréquences assez hautes qui passent.", r: "Coupure courante ≈ 75 à 150 Hz · pente courante 12 dB par octave." },
          { t: "Taille de membrane", ic: "📏", q: "Petite ou grande membrane : qu’est-ce que cela change ?", d: "Une <b>grande membrane</b> capte plus d’énergie : elle est plus sensible et a moins de bruit propre, mais sa directivité change davantage avec la fréquence. Une <b>petite membrane</b> garde une directivité plus régulière et des aigus plus étendus. Dès que la longueur d’onde devient comparable au diamètre, la capsule et le corps du micro font obstacle : même un omni devient directif dans l’aigu.", c: "Une grande voile prend plus de vent, mais elle se déforme plus qu’une petite.", r: "λ = diamètre : ≈ 14 kHz pour 25 mm, ≈ 29 kHz pour 12 mm. L’effet de directivité commence bien avant, dès quelques kHz pour une grande membrane." },
          { t: "Prise frontale ou latérale", ic: "↗️", q: "Par où faut-il parler dans un micro ?", d: "Un micro à <b>prise frontale</b> (end-address) se vise par son extrémité. Un micro à <b>prise latérale</b> (side-address) se vise par le côté : c’est le cas de la plupart des grandes membranes de studio. Un logo ou un point indique en général la face avant.", c: "Une lampe torche éclaire par le bout ; un phare de vélo latéral éclaire sur le côté.", r: "Erreur classique : parler dans le bout d’un micro latéral, on se retrouve à 90° de l’axe." }
        ],
        formules: [
          { q: "Comment s’écrit la réponse d’une capsule combinée ?", f: "r(θ) = A + B·cos θ   avec   A + B = 1", say: "r de thêta est égal à A plus B fois cosinus thêta", rows: [["r(θ)", "réponse relative", "—", "1 sur l’axe ; négative = polarité inversée"], ["A", "part de pression", "—", "1 pour un omni, 0 pour un huit"], ["B", "part de gradient", "—", "B = 1 − A"], ["θ", "angle d’arrivée du son", "°", "0° = axe du micro"]], ex: "Cardioïde (A = B = 0,5) à 60° : r = 0,5 + 0,5 × 0,5 = 0,75, soit 20 log 0,75 ≈ −2,5 dB." },
          { q: "Quel retard le labyrinthe doit-il créer ?", f: "τ = (A / B) × Δ / c", say: "tau est égal à A sur B, fois delta sur c", rows: [["τ", "retard interne", "s", "créé par le réseau de déphasage"], ["Δ", "trajet extérieur avant → arrière", "m", "quelques millimètres"], ["c", "célérité du son", "m/s", "343 m/s"], ["A / B", "rapport pression / gradient", "—", "1 pour un cardio, 1/3 pour un hyper"]], ex: "Δ = 10 mm, cardioïde : τ = 1 × 0,010 / 343 ≈ 29 µs. Hypercardioïde (A/B = 1/3) : ≈ 9,7 µs." },
          { q: "De combien l’effet de proximité renforce-t-il les graves ?", f: "G = 10 log(1 + (B / kr)²)   avec   k = 2πf / c", say: "G est égal à dix log de un plus B sur k r au carré", rows: [["G", "renforcement sur l’axe", "dB", "par rapport à une source lointaine"], ["B", "part de gradient", "—", "0 (omni) à 1 (huit)"], ["k", "nombre d’onde", "rad/m", "2πf / c"], ["r", "distance source → micro", "m", "plus elle est petite, plus G grandit"], ["f", "fréquence", "Hz", "plus elle est basse, plus G grandit"]], ex: "Cardio (B = 0,5), 100 Hz, 5 cm : k = 2π × 100 / 343 ≈ 1,83 ; kr ≈ 0,092 ; B/kr ≈ 5,46 ; G = 10 log(1 + 29,8) ≈ +14,9 dB." },
          { q: "En dessous de quelle fréquence les graves commencent-ils à monter ?", f: "f₃ = B × c / (2π r)", say: "f trois est égal à B fois c, sur deux pi r", rows: [["f₃", "fréquence où G = +3 dB", "Hz", "les graves montent en dessous"], ["B", "part de gradient", "—", "0,5 pour un cardio"], ["c", "célérité du son", "m/s", "343 m/s"], ["r", "distance", "m", "source → micro"]], ex: "Cardio à 5 cm : f₃ = 0,5 × 343 / (2π × 0,05) ≈ 546 Hz. À 50 cm : ≈ 55 Hz, presque plus audible." },
          { q: "Quelle directivité donne une double membrane ?", f: "A = (1 + m) / 2", say: "A est égal à un plus m, sur deux", rows: [["A", "part de pression obtenue", "—", "r(θ) = A + (1 − A)·cos θ"], ["m", "dosage de la membrane arrière", "—", "de −1 à +1"]], ex: "m = +1 → A = 1 (omni) ; m = 0 → A = 0,5 (cardio) ; m = −0,5 → A = 0,25 (hyper) ; m = −1 → A = 0 (huit)." }
        ]
      },

      manipuler: {
        titre: "Regarder la membrane travailler",
        intro: "Trois labos : faites tourner une source autour d’une capsule et <b>mesurez</b> sa directivité point par point ; approchez une voix d’un micro directif pour voir les graves monter ; dosez la membrane arrière d’une double membrane."
      },

      essentiel: {
        definitions: [
          "<b>Capsule à pression</b> : membrane exposée d’un seul côté → omnidirectionnelle, pas d’effet de proximité.",
          "<b>Capsule à gradient de pression</b> : membrane ouverte des deux côtés, poussée par la différence avant − arrière → en huit, lobe arrière de polarité inversée.",
          "<b>Réseau de déphasage</b> : retarde le son qui atteint l’arrière ; il fabrique cardio, super et hyper.",
          "<b>Double membrane</b> : deux cardios dos à dos ; somme → omni, différence → huit, avant seule → cardio.",
          "<b>Effet de proximité</b> : renforcement des graves d’une capsule à gradient quand la source est proche."
        ],
        formules: [
          ["r(θ) = A + B·cos θ, A + B = 1", "A = part de pression, B = part de gradient"],
          ["G = 10 log(1 + (B / kr)²), k = 2πf / c", "renforcement des graves par l’effet de proximité"],
          ["f₃ = B·c / (2π r)", "les graves montent en dessous de cette fréquence"],
          ["A = (1 + m) / 2", "double membrane : m = dosage de la membrane arrière (−1 à +1)"]
        ],
        reperes: [
          "Cardio à 100 Hz : ≈ +15 dB à 5 cm, ≈ +2,6 dB à 30 cm, ≈ +0,3 dB à 1 m.",
          "En huit, l’effet de proximité est le plus fort (B = 1) : ≈ +21 dB à 5 cm et 100 Hz.",
          "Petite membrane ≈ 12 mm, grande membrane ≈ 25 mm.",
          "Coupe-bas courant : 75 à 150 Hz, 12 dB par octave."
        ],
        pieges: [
          "« Omni » ne veut pas dire « capte autant dans tous les cas » : dans l’aigu, même une capsule à pression devient directive.",
          "Un huit capte autant à l’arrière qu’à l’avant, mais avec une <b>polarité inversée</b>.",
          "L’effet de proximité ne concerne <b>pas</b> l’omni : pour une voix très proche sans graves gonflés, prendre un omni.",
          "Une grande membrane se vise souvent <b>par le côté</b> : parler dans le bout, c’est parler à 90° de l’axe.",
          "Le labyrinthe ne « bouche » pas l’arrière : il retarde le son pour qu’il s’annule avec celui de l’avant."
        ]
      },

      evaluation: (function () {
        const db = v => (Math.abs(v) < 1e-6 ? "−∞" : NB(20 * Math.log10(Math.abs(v)), 1).replace("-", "−")) + " dB";
        const NOMS = { 1: "Omnidirectionnelle", 0.5: "Cardioïde", 0.25: "Hypercardioïde", 0: "Bidirectionnelle (en huit)" };
        // Courbe de réponse illustrant l'effet de proximité (pour « Lire »)
        function figProximite(A, r) {
          const W = 520, Hh = 250, x0 = 50, x1 = 500, y0 = 30, y1 = 210, dbMax = 24;
          const X = f => x0 + (Math.log10(f) - Math.log10(20)) / 3 * (x1 - x0), Y = v => y1 - v / dbMax * (y1 - y0);
          let s = "";
          [0, 6, 12, 18, 24].forEach(v => { s += LIGNE(x0, Y(v), x1, Y(v), { c: "rgba(255,255,255,.12)" }) + TXT(x0 - 8, Y(v) + 4, "+" + v, { s: 10, a: "end", w: 500, c: "#8e8e93" }); });
          [[20, "20"], [50, "50"], [100, "100"], [200, "200"], [500, "500"], [1000, "1 k"], [2000, "2 k"], [5000, "5 k"], [20000, "20 k"]].forEach(p => { s += LIGNE(X(p[0]), y0, X(p[0]), y1, { c: "rgba(255,255,255,.08)" }) + TXT(X(p[0]), y1 + 16, p[1], { s: 10, w: 500, c: "#8e8e93" }); });
          let d = "";
          for (let i = 0; i <= 120; i++) { const f = 20 * Math.pow(1000, i / 120); d += (i ? " L" : "M") + X(f).toFixed(1) + " " + Y(MICRO.proximite(A, r, f)).toFixed(1); }
          s += '<path d="' + d + '" fill="none" stroke="#ffd60a" stroke-width="2.6"/>';
          s += TXT(x0, 18, "Renforcement (dB) — source à " + NB(r * 100, 0) + " cm", { s: 12, a: "start" }) + TXT(x1, y1 + 34, "Fréquence (Hz)", { s: 10, a: "end", w: 500, c: "#8e8e93" });
          return SVG(W, Hh + 10, s, "Courbe de renforcement des graves en fonction de la fréquence");
        }
        return {
          lire: [
            () => { const A = C([1, 0.5, 0]); return { type: "qcm", figure: figPolaire([{ A: A, couleur: "#ffd60a" }]), question: "Ce diagramme polaire est celui d’une capsule simple. Laquelle ?", bonne: A === 1 ? "Capsule à pression (omnidirectionnelle)" : A === 0 ? "Capsule à gradient de pression pur (en huit)" : "Capsule à gradient avec réseau de déphasage (cardioïde)", mauvaises: [A === 1 ? "Capsule à gradient de pression pur (en huit)" : "Capsule à pression (omnidirectionnelle)", A === 0.5 ? "Capsule à gradient de pression pur (en huit)" : "Capsule à gradient avec réseau de déphasage (cardioïde)", "Capsule à double membrane réglée en huit inversé"], explication: A === 1 ? "Un cercle : la capsule à pression répond de la même façon dans toutes les directions." : A === 0 ? "Deux lobes égaux et une annulation à 90° : c’est la réponse en cos θ du gradient de pression pur. Le lobe en pointillés est de polarité inversée." : "Un cœur, annulation à 180° : le réseau de déphasage retarde le son arrière jusqu’à annuler la pression venant de l’arrière.", indice: "Repérez les angles où la courbe passe par le centre." }; },
            () => { const r = C([0.03, 0.05, 0.1]); const g = MICRO.proximite(0.5, r, 100); return { type: "nombre", figure: figProximite(0.5, r), question: "Ce graphique montre le renforcement des graves d’un micro cardioïde, source à " + NB(r * 100, 0) + " cm. Lisez le renforcement à <b>100 Hz</b>.", reponse: Math.round(g), unite: "dB", ecart: 2, explication: "On lit environ +" + NB(g, 0) + " dB à 100 Hz (la formule donne " + NB(g, 1) + " dB). Le renforcement grandit quand la fréquence baisse.", indice: "Remontez verticalement depuis la graduation 100, puis lisez l’axe de gauche." }; },
            { type: "qcm", contexte: figFiche("Micro de studio — capsule", [["Capsule", "double membrane, Ø 25 mm"], ["Prise de son", "latérale"], ["Directivités", "omni · cardio · huit"], ["Coupe-bas", "75 Hz, 12 dB/octave"], ["Atténuateur", "−10 dB"]]), question: "D’après cette fiche, comment faut-il orienter ce micro vers la voix ?", bonne: "Viser la face latérale (le côté marqué) vers la bouche", mauvaises: ["Viser l’extrémité du micro vers la bouche", "Peu importe : la double membrane capte partout pareil", "Viser la face arrière pour réduire les graves"], explication: "« Prise de son : latérale » : la capsule est vue par le côté du micro. Parler dans le bout reviendrait à parler à 90° de l’axe.", indice: "Cherchez la ligne « Prise de son »." },
            { type: "nombre", contexte: figFiche("Micro de studio — capsule", [["Capsule", "double membrane, Ø 25 mm"], ["Directivités", "omni · cardio · huit"], ["Coupe-bas", "75 Hz, 12 dB/octave"], ["Atténuateur", "−10 dB"]]), question: "Quelle est la fréquence de coupure du coupe-bas ?", reponse: 75, unite: "Hz", ecart: 0, explication: "On lit 75 Hz : les fréquences plus basses sont atténuées de 12 dB par octave. Ce filtre compense notamment l’effet de proximité.", indice: "Cherchez la ligne « Coupe-bas »." },
            () => { const k = C([[1, "omni"], [0, "cardio"], [-1, "en huit"]]); return { type: "qcm", figure: figPolaire([{ A: (1 + k[0]) / 2, couleur: "#bf5af2" }]), question: "Une double membrane donne ce diagramme. Comment la membrane arrière est-elle réglée ?", bonne: k[0] === 1 ? "Polarisée comme l’avant : les deux cardios s’additionnent" : k[0] === 0 ? "Non polarisée : seule la membrane avant travaille" : "Polarisée à l’inverse de l’avant : les cardios se soustraient", mauvaises: [k[0] === 1 ? "Non polarisée : seule la membrane avant travaille" : "Polarisée comme l’avant : les deux cardios s’additionnent", k[0] === -1 ? "Non polarisée : seule la membrane avant travaille" : "Polarisée à l’inverse de l’avant : les cardios se soustraient", "Débranchée, et la membrane avant inversée"], explication: "Avant : ½(1 + cos θ) ; arrière : ½(1 − cos θ). Somme = 1 (omni) ; avant seule = cardio ; différence = cos θ (huit). Ici la courbe est " + k[1] + ".", indice: "Additionnez ou soustrayez ½(1 + cos θ) et ½(1 − cos θ)." }; }
          ],
          comprendre: [
            ["Une capsule à pression est omnidirectionnelle parce que la pression est une grandeur sans direction.", true, "La membrane n’est exposée que d’un côté : elle suit la pression en un point, quelle que soit la direction d’arrivée du son."],
            ["Une capsule à gradient de pression pur capte un son arrivant à 90° de son axe aussi fort qu’un son arrivant de face.", false, "À 90°, le son atteint l’avant et l’arrière en même temps : la différence de pression vaut zéro. C’est l’annulation du huit.", "Que vaut cos 90° ?"],
            ["Le lobe arrière d’un micro en huit a le même niveau que le lobe avant, mais une polarité inversée.", true, "À 180°, cos θ = −1 : même amplitude, signe opposé. La face arrière est poussée en premier."],
            ["Un micro omnidirectionnel à capsule à pression présente un fort effet de proximité.", false, "L’effet de proximité vient du terme de gradient (B). Pour un omni, B = 0 : pas d’effet de proximité.", "Que vaut B pour un omni ?"],
            ["L’effet de proximité est plus fort pour un micro en huit que pour un cardioïde.", true, "Le renforcement dépend de B : B = 1 pour le huit, 0,5 pour le cardio. À 100 Hz et 5 cm : ≈ +21 dB contre ≈ +15 dB."],
            ["Le réseau de déphasage d’un cardioïde bouche complètement l’arrière de la membrane.", false, "Il ne bouche pas : il retarde le son qui atteint l’arrière. Pour un son venant de 180°, ce retard compense le trajet extérieur et les deux pressions s’annulent.", "Si l’arrière était bouché, quelle capsule obtiendrait-on ?"],
            ["Avec une double membrane, additionner les deux cardios dos à dos donne une directivité omnidirectionnelle.", true, "½(1 + cos θ) + ½(1 − cos θ) = 1, la même valeur dans toutes les directions."],
            ["Dans l’aigu, un micro omnidirectionnel à grande membrane devient plus directif.", true, "Quand la longueur d’onde devient comparable au diamètre, la capsule et le corps du micro font obstacle : les sons hors axe sont atténués."],
            ["Plus on s’éloigne de la source, plus l’effet de proximité augmente.", false, "C’est l’inverse : le terme B/kr diminue quand r augmente. À 1 m, il ne reste que ≈ 0,3 dB à 100 Hz pour un cardio.", "Regardez où se trouve r dans la formule."],
            ["Le coupe-bas d’un micro permet de compenser l’effet de proximité.", true, "C’est un filtre passe-haut : il atténue les graves que l’effet de proximité a renforcés."]
          ],
          qcm: [
            ["Pourquoi une capsule à pression possède-t-elle un minuscule évent à l’arrière ?", "Pour équilibrer les variations lentes de la pression atmosphérique", ["Pour laisser entrer le son arrière et devenir cardioïde", "Pour évacuer la chaleur de la membrane", "Pour créer l’effet de proximité dans les graves"], "L’évent est trop fin pour le son : il n’équilibre que les variations très lentes (météo, altitude). La capsule reste à pression, donc omni."],
            ["Qu’est-ce qui pousse la membrane d’une capsule à gradient de pression ?", "La différence entre la pression avant et la pression arrière", ["La pression totale reçue sur la face avant", "La vitesse de la source sonore", "La somme des pressions avant et arrière"], "Ouverte des deux côtés, la membrane ne bouge que si les pressions diffèrent. Cette différence suit cos θ."],
            ["Quelle directivité donne une capsule à gradient de pression pur ?", "Bidirectionnelle (en huit)", ["Omnidirectionnelle", "Cardioïde", "Hypercardioïde"], "Réponse en cos θ : deux lobes égaux à 0° et 180°, annulation à 90° et 270°."],
            ["Comment fabrique-t-on une capsule cardioïde avec une seule membrane ?", "Un réseau de déphasage retarde le son qui atteint l’arrière", ["On ferme complètement l’arrière de la membrane", "On ajoute une seconde membrane devant la première", "On perce la membrane de petits trous"], "Le retard interne compense le trajet extérieur pour un son venant de 180° : les deux pressions s’annulent."],
            ["Un animateur radio colle presque son micro cardioïde contre sa bouche. Que se passe-t-il ?", "Les graves de sa voix sont fortement renforcés", ["Les aigus de sa voix sont renforcés", "Le micro devient omnidirectionnel", "Le niveau baisse dans les graves"], "C’est l’effet de proximité : à quelques centimètres, un cardio renforce les graves de plus de 10 dB vers 100 Hz."],
            ["On veut enregistrer une voix à 3 cm sans graves gonflés. Quel micro choisir ?", "Un omnidirectionnel (capsule à pression)", ["Un bidirectionnel (en huit)", "Un hypercardioïde", "Un cardioïde à grande membrane"], "Seule la capsule à pression (B = 0) n’a pas d’effet de proximité."],
            ["Une double membrane : la membrane arrière est polarisée à l’inverse de la membrane avant. Directivité ?", "Bidirectionnelle (en huit)", ["Omnidirectionnelle", "Cardioïde", "Infracardioïde"], "½(1 + cos θ) − ½(1 − cos θ) = cos θ : c’est le huit."],
            ["Quelle est la différence entre une petite et une grande membrane ?", "La grande est plus sensible, la petite a une directivité plus régulière", ["La petite est plus sensible, la grande a une directivité plus régulière", "La grande capte mieux l’extrême aigu", "Aucune : seule la technologie de transduction compte"], "Une grande surface capte plus d’énergie (sensibilité, bruit propre), mais devient directive plus tôt dans l’aigu."]
          ],
          calculer: [
            () => { const d = C([DIR("cardio"), DIR("hyper"), DIR("super"), DIR("infra")]), th = C([45, 60, 90, 120, 135]); const g = MICRO.gain(d.A, th); return { type: "nombre", question: "Capsule " + d.nom.toLowerCase() + " (A = " + NB(d.A, 3) + "). Atténuation, en dB, d’un son arrivant à <b>" + th + "°</b> de l’axe ?", reponse: 20 * Math.log10(Math.abs(g)), unite: "dB", ecart: 0.3, explication: "r = A + B·cos θ = " + NB(d.A, 3) + " + " + NB(1 - d.A, 3) + " × cos " + th + "° = " + NB(g, 3) + ". Atténuation = 20 log |" + NB(g, 3) + "| ≈ " + db(g) + (g < 0 ? " (polarité inversée)." : "."), indice: "B = 1 − A, puis 20 log |r|." }; },
            () => { const d = C([DIR("cardio"), DIR("huit"), DIR("hyper")]), f = C([50, 100, 150, 200]), r = C([0.03, 0.05, 0.1, 0.2, 0.3]); const k = 2 * Math.PI * f / MICRO.c, B = 1 - d.A, G = MICRO.proximite(d.A, r, f); return { type: "nombre", question: "Micro " + d.nom.toLowerCase() + " (B = " + NB(B, 2) + "), source à <b>" + NB(r * 100, 0) + " cm</b>. Renforcement des graves à <b>" + f + " Hz</b> (c = 343 m/s) ?", reponse: G, unite: "dB", ecart: 0.3, explication: "k = 2π × " + f + " / 343 ≈ " + NB(k, 3) + " rad/m ; kr ≈ " + NB(k * r, 3) + " ; B/kr ≈ " + NB(B / (k * r), 2) + ". G = 10 log(1 + " + NB(Math.pow(B / (k * r), 2), 2) + ") ≈ +" + NB(G, 1) + " dB.", indice: "G = 10 log(1 + (B/kr)²) avec k = 2πf/c." }; },
            () => { const r = C([0.02, 0.05, 0.1, 0.2, 0.5]), d = C([DIR("cardio"), DIR("huit")]); const B = 1 - d.A, f = B * MICRO.c / (2 * Math.PI * r); return { type: "nombre", question: "Micro " + d.nom.toLowerCase() + ", source à <b>" + NB(r * 100, 0) + " cm</b>. En dessous de quelle fréquence le renforcement dépasse-t-il +3 dB ?", reponse: f, unite: "Hz", explication: "f₃ = B·c / (2π r) = " + NB(B, 1) + " × 343 / (2π × " + NB(r, 2) + ") ≈ " + NB(f, 0) + " Hz.", indice: "f₃ = B·c / (2π r)." }; },
            () => { const dmm = C([12, 16, 20, 25, 34]); const f = MICRO.c / (dmm / 1000); return { type: "nombre", question: "Une capsule a une membrane de <b>" + dmm + " mm</b> de diamètre. À quelle fréquence la longueur d’onde est-elle égale à ce diamètre ? (en kHz, c = 343 m/s)", reponse: f / 1000, unite: "kHz", explication: "λ = c/f, donc f = c/λ = 343 / " + NB(dmm / 1000, 3) + " ≈ " + NB(f, 0) + " Hz ≈ " + NB(f / 1000, 1) + " kHz. Bien avant, la capsule commence déjà à devenir directive dans l’aigu.", indice: "f = c / λ, avec λ en mètres." }; },
            () => { const dmm = C([8, 10, 12, 15, 20]), d = C([DIR("cardio"), DIR("hyper")]); const AB = d.A / (1 - d.A), tau = AB * dmm / 1000 / MICRO.c * 1e6; return { type: "nombre", question: "Le trajet extérieur entre l’avant et l’arrière de la membrane mesure <b>" + dmm + " mm</b>. Quel retard interne (en µs) le réseau de déphasage doit-il créer pour un " + d.nom.toLowerCase() + " (A/B = " + (d.id === "cardio" ? "1" : "1/3") + ") ?", reponse: tau, unite: "µs", explication: "τ = (A/B) × Δ / c = " + (d.id === "cardio" ? "1" : "1/3") + " × " + NB(dmm / 1000, 3) + " / 343 ≈ " + NB(tau, 1) + " µs.", indice: "τ = (A/B) × Δ / c, Δ en mètres." }; },
            () => { const m = C([1, 0.4, 0, -0.27, -0.5, -1]); const A = (1 + m) / 2; return { type: "nombre", question: "Double membrane : la membrane arrière est dosée à <b>m = " + NB(m, 2).replace("-", "−") + "</b>. Quelle est la valeur de A (part de pression) ?", reponse: A, unite: "", ecart: 0.01, explication: "A = (1 + m) / 2 = (1 + " + NB(m, 2).replace("-", "−") + ") / 2 = " + NB(A, 3) + "." + (NOMS[A] ? " C’est la directivité " + NOMS[A].toLowerCase() + "." : ""), indice: "A = (1 + m) / 2." }; }
          ],
          exercice: [
            () => { const r = C([0.03, 0.05]), f = 100; const G1 = MICRO.proximite(0.5, r, f), G2 = MICRO.proximite(0.5, 0.3, f); return { type: "exercice", question: "Un comédien enregistre une voix off avec un micro <b>cardioïde</b>, la bouche à <b>" + NB(r * 100, 0) + " cm</b>. Sa voix sonne trop grave. (c = 343 m/s)", etapes: [
              { question: "a) Renforcement à 100 Hz à " + NB(r * 100, 0) + " cm ?", reponse: G1, unite: "dB", ecart: 0.4 },
              { question: "b) Renforcement à 100 Hz si le comédien recule à 30 cm ?", reponse: G2, unite: "dB", ecart: 0.4 },
              { question: "c) Sans le faire reculer, quelle solution supprime le problème à la source ?", bonne: "Prendre un micro omnidirectionnel", mauvaises: ["Prendre un micro en huit", "Monter le gain du préampli", "Tourner le micro de 180°"] }
            ], solution: "a) B = 0,5, k = 2π × 100 / 343 ≈ 1,83 ; G = 10 log(1 + (0,5 / (1,83 × " + NB(r, 2) + "))²) ≈ +" + NB(G1, 1) + " dB. b) À 0,3 m : ≈ +" + NB(G2, 1) + " dB. c) Un omni (capsule à pression, B = 0) n’a pas d’effet de proximité ; sinon, enclencher un coupe-bas.", indice: "Effet de proximité : G = 10 log(1 + (B/kr)²)." }; },
            () => { const m = C([-0.5, -0.27, 0.4]); const A = (1 + m) / 2, nom = m === -0.5 ? "Hypercardioïde" : m === 0.4 ? "Infracardioïde" : "Supercardioïde"; return { type: "exercice", question: "Un micro à double membrane est réglé avec un dosage de la membrane arrière <b>m = " + NB(m, 2).replace("-", "−") + "</b>.", etapes: [
              { question: "a) Part de pression A ?", reponse: A, unite: "", ecart: 0.01 },
              { question: "b) Atténuation à 90° (20 log A) ?", reponse: 20 * Math.log10(A), unite: "dB", ecart: 0.3 },
              { question: "c) Quelle directivité obtient-on ?", bonne: nom, mauvaises: ["Cardioïde", "Omnidirectionnelle", "Bidirectionnelle (en huit)"].concat(nom === "Infracardioïde" ? [] : ["Infracardioïde"]).slice(0, 3) }
            ], solution: "a) A = (1 + m) / 2 = " + NB(A, 3) + ". b) À 90°, cos θ = 0 donc r = A : 20 log " + NB(A, 3) + " ≈ " + db(A) + ". c) A ≈ " + NB(A, 2) + " : " + nom.toLowerCase() + ".", indice: "À 90°, il ne reste que la part de pression A." }; },
            () => { const dmm = C([10, 12, 15]); const tau = dmm / 1000 / MICRO.c * 1e6; return { type: "exercice", question: "On construit une capsule cardioïde. Le trajet extérieur entre l’avant et l’arrière de la membrane est de <b>" + dmm + " mm</b>. (c = 343 m/s)", etapes: [
              { question: "a) Retard du son venant de 180° entre l’arrière et l’avant de la membrane (µs) ?", reponse: tau, unite: "µs" },
              { question: "b) Retard interne que doit créer le labyrinthe (µs) ?", reponse: tau, unite: "µs" },
              { question: "c) Que vaut alors la force sur la membrane pour un son venant de 180° ?", bonne: "Elle vaut zéro : les deux pressions sont identiques", mauvaises: ["Elle est doublée : les deux pressions s’ajoutent", "Elle est égale à celle d’un son venant de face", "Elle est inversée, mais de même niveau"] }
            ], solution: "a) Δ / c = " + NB(dmm / 1000, 3) + " / 343 ≈ " + NB(tau, 1) + " µs. b) Pour un cardio (A/B = 1), le retard interne égale ce trajet : ≈ " + NB(tau, 1) + " µs. c) Le son venant de 180° arrive à l’arrière en même temps qu’à l’avant (par le labyrinthe) : la différence vaut zéro, c’est l’annulation du cardioïde.", indice: "Pour un cardio, le retard interne compense exactement le trajet extérieur." }; }
          ]
        };
      })()
    },

    /* ======================================================================
       MODULE 4 — LA DIRECTIVITÉ
       ====================================================================== */
    {
      titre: "La directivité",
      nav: "Directivité",
      resume: "Polaires, indice, canon",
      intro: "Un micro n’entend pas pareil dans toutes les directions. Savoir <b>lire un diagramme polaire</b>, c’est savoir où placer le micro, où placer ce qu’on ne veut pas entendre (retour de scène, public, circulation) et à quelle distance se mettre. Ce module donne les chiffres de chaque directivité et explique le cas particulier du micro canon.",

      notions: (function () {
        // Tableau des directivités, calculé avec les formules du cours (MICRO)
        const att = (A, d) => { const g = MICRO.gain(A, d); return Math.abs(g) < 1e-6 ? "−∞" : NB(20 * Math.log10(Math.abs(g)), 1).replace("-", "−"); };
        const nul = A => { const n = MICRO.annulation(A); return n === null ? "aucune" : NB(n, n % 1 > 0.05 && n % 1 < 0.95 ? 1 : 0) + "°"; };
        const tableau = '<div style="overflow-x:auto"><table class="fx-t"><tr><td class="nm"><b>Directivité</b></td><td><b>A</b></td><td><b>DF</b></td><td><b>DI</b></td><td><b>√DF</b></td><td><b>Annulation</b></td><td><b>à 90°</b></td><td><b>à 180°</b></td></tr>' +
          DIRECTIVITES.map(d => '<tr><td class="nm">' + d.court + "</td><td>" + NB(d.A, 3) + "</td><td>" + NB(MICRO.df(d.A), 1) + "</td><td>" + NB(MICRO.di(d.A), 1) + " dB</td><td>" + NB(MICRO.distance(d.A), 2) + "</td><td>" + nul(d.A) + "</td><td>" + att(d.A, 90) + " dB</td><td>" + att(d.A, 180) + " dB</td></tr>").join("") + "</table></div>";
        const fc25 = MICRO.c / 0.25;
        const olson = (L, f, deg) => { const x = Math.PI * L / MICRO.lambda(f) * (1 - Math.cos(deg * Math.PI / 180)); return x < 1e-9 ? 1 : Math.sin(x) / x; };
        const ex4k = 20 * Math.log10(Math.abs(olson(0.25, 4000, 90) * MICRO.gain(0.25, 90)));
        return {
          titre: "Lire et chiffrer une directivité",
          intro: "Toutes les directivités usuelles s’écrivent <b>r(θ) = A + B·cos θ</b>. À partir de A, on calcule tout le reste : les atténuations, l’angle où le micro est sourd, et le gain en distance par rapport à un omni.",
          mots: [
            { t: "Directivité", ic: "🎯", q: "Qu’appelle-t-on la directivité d’un micro ?", d: "La façon dont la sensibilité du micro <b>varie avec la direction</b> d’arrivée du son. Elle se mesure en faisant tourner le micro devant une source, et se donne par un diagramme polaire.", c: "Une ampoule nue éclaire partout ; une lampe torche éclaire surtout devant. Un micro directif « écoute » comme la lampe torche « éclaire ».", r: "Fiches techniques : diagrammes à plusieurs fréquences (par exemple 125 Hz, 1 kHz, 4 kHz, 8 kHz, 16 kHz)." },
            { t: "Diagramme polaire", ic: "🧭", q: "Comment lit-on un diagramme polaire ?", d: "Le micro est au centre, son axe vers 0° (en haut). La distance de la courbe au centre donne la sensibilité dans chaque direction. En <b>échelle linéaire</b>, on voit la forme « vraie » (le cœur du cardioïde). Les fiches techniques utilisent une <b>échelle en dB</b> : un anneau tous les 5 dB, jusqu’à −25 dB ; les formes paraissent plus « gonflées ».<br>" + figPolaire([{ A: 0.5, couleur: "#ffd60a", nom: "Cardioïde" }], { titre: "échelle linéaire", l: 280, h: 260 }) + figPolaire([{ A: 0.5, couleur: "#ffd60a", nom: "Cardioïde" }], { titre: "échelle en dB", db: true, l: 280, h: 260 }), c: "Une carte vue d’avion : le micro est la ville au centre, la courbe dit jusqu’où il « entend » dans chaque direction.", r: "Cardioïde à 90° : à mi-rayon en linéaire (0,5), mais juste sous l’anneau −5 dB sur une fiche (−6 dB)." },
            { t: "Omnidirectionnel", ic: "⚪", q: "Que capte un micro omnidirectionnel ?", d: "Il capte avec la même sensibilité dans toutes les directions (A = 1). Il n’a ni annulation ni effet de proximité, et capte beaucoup d’ambiance.", c: "Une oreille posée au milieu de la pièce.", r: "DF = 1, DI = 0 dB · directif dans l’aigu en pratique." },
            { t: "Infracardioïde", ic: "🟢", q: "Qu’est-ce qu’un micro infracardioïde ?", d: "Un cardioïde « large » (A ≈ 0,7) : il favorise l’avant sans jamais être sourd. Son arrière est seulement atténué.", c: "Un omni qui tourne un peu la tête vers la source.", r: "≈ −3 dB à 90° · ≈ −8 dB à 180° · pas d’annulation." },
            { t: "Cardioïde", ic: "❤️", q: "Quelles sont les caractéristiques du cardioïde ?", d: "La directivité la plus courante (A = B = 0,5). Sa courbe a la forme d’un cœur. Il est <b>sourd à l’arrière</b> (180°) et atténue de 6 dB sur les côtés.", c: "Un auditeur qui tourne le dos au bruit.", r: "−6 dB à 90° · annulation à 180° · ouverture à −3 dB ≈ 131° · DF = 3, DI ≈ 4,8 dB." },
            { t: "Supercardioïde", ic: "🔶", q: "Qu’est-ce qu’un supercardioïde ?", d: "A ≈ 0,37 (exactement (√3 − 1)/2). C’est la directivité qui donne le meilleur rapport entre l’énergie captée par l’hémisphère avant et celle captée par l’hémisphère arrière. Elle a un petit lobe arrière inversé et deux angles d’annulation vers ±125°.", c: "Un cardioïde qui serre les épaules : plus étroit, mais il entend un peu derrière lui.", r: "≈ −8,7 dB à 90° · ≈ −11,4 dB à 180° · annulation ≈ 125° · DI ≈ 5,7 dB." },
            { t: "Hypercardioïde", ic: "🔻", q: "Qu’est-ce qu’un hypercardioïde ?", d: "A = 0,25 : la directivité du premier ordre qui rejette le plus le son diffus (facteur de directivité maximal, DF = 4). Son lobe arrière est plus gros que celui du supercardioïde.", c: "Un regard très concentré devant, au prix d’une petite oreille dans le dos.", r: "−12 dB à 90° · −6 dB à 180° · annulation ≈ 109,5° · DF = 4, DI ≈ 6 dB." },
            { t: "Bidirectionnel (en huit)", ic: "8️⃣", q: "Qu’est-ce qu’un micro bidirectionnel ?", d: "A = 0 : il capte autant devant que derrière, avec une polarité inversée à l’arrière, et il est <b>sourd sur les côtés</b> (90° et 270°).", c: "Deux personnes face à face autour d’une table : le micro entre elles, le bruit de côté ignoré.", r: "Annulation à 90° · DF = 3, DI ≈ 4,8 dB, comme le cardioïde · base du couple MS et du Blumlein." },
            { t: "Angle d’annulation", ic: "🚫", q: "Qu’est-ce que l’angle d’annulation et à quoi sert-il ?", d: "La direction où le micro est (en théorie) sourd : r(θ₀) = 0, soit cos θ₀ = −A/B. On y place la source gênante : retour de scène, public, autre instrument.", c: "L’angle mort d’un rétroviseur, mais utilisé exprès.", r: "Cardio 180° · super ≈ 125° · hyper ≈ 109,5° · huit 90° · omni et infracardio : aucun." },
            { t: "Facteur et indice de directivité", ic: "📐", q: "Que mesurent le facteur et l’indice de directivité ?", d: "Le <b>facteur de directivité</b> DF compare ce qu’un micro capte d’un son venant de face à ce qu’il capte d’un son diffus venant de partout (réverbération, ambiance), par rapport à un omni. L’<b>indice de directivité</b> DI l’exprime en dB : DI = 10 log DF. Les valeurs ci-dessous sont calculées avec les formules du cours.<br>" + tableau, c: "Une paire d’œillères : plus elles sont fermées, moins on voit ce qui se passe autour.", r: "DF : omni 1 · cardio 3 · hyper 4 (maximum du premier ordre)." },
            { t: "Facteur de distance", ic: "📏", q: "Que signifie le facteur de distance ?", d: "Le facteur de distance vaut √DF. Un micro directif placé à √DF fois la distance d’un omni capte le <b>même rapport</b> entre son direct et réverbération. Il permet donc de reculer, ou de capter moins de salle à la même distance.", c: "Un téléobjectif : on recule, et le sujet reste aussi présent dans l’image.", r: "Cardio ≈ 1,7 · super ≈ 1,9 · hyper 2 : un hyper à 2 m ≈ un omni à 1 m." },
            { t: "Micro canon", ic: "🎬", q: "Comment fonctionne un micro canon ?", d: "Un <b>tube à interférences</b> percé de fentes est placé devant une capsule super ou hypercardioïde. Un son venant de face parcourt le tube avec l’onde : tout ce qui entre par les fentes arrive en phase. Un son venant de côté entre par toutes les fentes avec des trajets différents : les contributions se décalent et s’annulent en partie. Le tube n’agit que si la longueur d’onde est plus courte que lui : au-dessus de <b>f ≈ c/L</b>. En dessous, le canon se comporte comme sa capsule.", c: "Une longue-vue : elle ne regarde que droit devant, mais seulement si l’objet n’est pas plus gros qu’elle.", r: "Tube de 25 cm → efficace dès ≈ " + NB(fc25 / 1000, 1) + " kHz · canon court ≈ 20 à 25 cm · canon long ≈ 40 à 60 cm." },
            { t: "Lobes secondaires", ic: "〰️", q: "Pourquoi un micro canon a-t-il des « lobes » sur les côtés ?", d: "Les interférences du tube ne s’annulent parfaitement que pour certains angles. Entre deux annulations, une partie du son hors axe repasse : ce sont des <b>lobes secondaires</b>, qui changent avec la fréquence. Le son capté hors axe est donc coloré.", c: "Une grille de clôture : vue de biais, elle cache plus ou moins selon l’angle.", r: "En intérieur réverbérant, les réflexions arrivent de partout et passent par ces lobes : on préfère souvent un hypercardioïde." },
            { t: "Directivité et fréquence", ic: "🎚️", q: "La directivité d’un micro est-elle la même à toutes les fréquences ?", d: "Non. Sur un vrai micro, la directivité change avec la fréquence : un omni devient directif dans l’aigu (la capsule fait obstacle), un cardioïde s’élargit souvent dans le grave, un canon ne se resserre qu’au-dessus de c/L. C’est pour cela que les fiches donnent plusieurs courbes.", c: "Une haie : elle arrête le vent fin, mais une tempête la contourne.", r: "Le son capté hors axe n’est donc pas seulement plus faible : il a un autre timbre." }
          ],
          formules: [
            { q: "Comment calcule-t-on l’atténuation dans une direction ?", f: "r(θ) = A + B·cos θ   ;   atténuation = 20 log |r(θ)|", say: "r de thêta égale A plus B cosinus thêta ; l’atténuation vaut vingt log de r", rows: [["r(θ)", "réponse relative", "—", "1 sur l’axe"], ["A, B", "parts de pression et de gradient", "—", "A + B = 1"], ["θ", "angle par rapport à l’axe", "°", "0° = face au micro"]], ex: "Hypercardioïde (A = 0,25) à 90° : r = 0,25 + 0,75 × 0 = 0,25 → 20 log 0,25 ≈ −12 dB." },
            { q: "Comment calcule-t-on le facteur et l’indice de directivité ?", f: "DF = 1 / (A² + B²/3)   ;   DI = 10 log DF", say: "D F égale un sur, A au carré plus B au carré sur trois ; D I égale dix log D F", rows: [["DF", "facteur de directivité", "—", "1 pour un omni"], ["DI", "indice de directivité", "dB", "0 dB pour un omni"], ["A, B", "parts de pression et de gradient", "—", "A + B = 1"]], ex: "Hypercardioïde : DF = 1 / (0,0625 + 0,5625/3) = 1 / 0,25 = 4 ; DI = 10 log 4 ≈ 6,0 dB." },
            { q: "À quelle distance placer un micro directif pour capter autant de salle qu’un omni ?", f: "d = √DF × d_omni", say: "d égale racine de D F fois d omni", rows: [["d", "distance du micro directif", "m", "même rapport direct / réverbéré"], ["DF", "facteur de directivité", "—", "3 pour un cardio"], ["d_omni", "distance de l’omni", "m", "référence"]], ex: "Omni à 1 m → cardioïde à √3 × 1 ≈ 1,73 m, hypercardioïde à 2 m." },
            { q: "Où se trouve l’angle d’annulation ?", f: "cos θ₀ = −A / B", say: "cosinus thêta zéro égale moins A sur B", rows: [["θ₀", "angle d’annulation", "°", "existe si A ≤ 0,5"], ["A, B", "parts de pression et de gradient", "—", "A + B = 1"]], ex: "Hypercardioïde : cos θ₀ = −0,25 / 0,75 = −1/3 → θ₀ ≈ 109,5°." },
            { q: "À partir de quelle fréquence un micro canon devient-il directif ?", f: "f ≈ c / L", say: "f environ égale c sur L", rows: [["f", "fréquence d’efficacité du tube", "Hz", "au-dessus, le tube resserre la directivité"], ["c", "célérité du son", "m/s", "343 m/s"], ["L", "longueur du tube", "m", "20 à 60 cm"]], ex: "Tube de 25 cm : f ≈ 343 / 0,25 ≈ " + NB(fc25, 0) + " Hz." },
            { q: "Comment modélise-t-on le tube d’un micro canon ?", f: "R(θ) = sin x / x   avec   x = (π L / λ)(1 − cos θ)", say: "R de thêta égale sinus x sur x, avec x égale pi L sur lambda, fois un moins cosinus thêta", rows: [["R(θ)", "effet du tube (modèle de ligne d’Olson)", "—", "1 sur l’axe"], ["L", "longueur du tube", "m", "plus longue = plus directive"], ["λ", "longueur d’onde", "m", "c / f"], ["θ", "angle", "°", "hors axe"]], ex: "Modèle simplifié : la réponse totale vaut capsule(θ) × R(θ). Tube de 25 cm, capsule hypercardioïde, 4 kHz, 90° : ≈ " + NB(ex4k, 0).replace("-", "−") + " dB dans ce modèle, contre −12 dB pour la capsule seule. Ce modèle idéal exagère la profondeur des annulations : un vrai canon rejette moins, mais la tendance est la même." }
          ]
        };
      })(),

      manipuler: {
        titre: "Faire tourner la source, choisir la directivité",
        intro: "Deux labos : modelez une directivité avec le curseur A et placez une <b>voix</b> et un <b>retour de scène</b> autour du micro ; puis réglez la longueur d’un micro canon et la fréquence pour voir quand le tube devient efficace."
      },

      essentiel: {
        definitions: [
          "<b>Diagramme polaire</b> : sensibilité selon la direction, axe du micro à 0° ; fiches en dB (anneaux de 5 dB).",
          "<b>Angle d’annulation</b> : direction où le micro est sourd ; on y place la source gênante.",
          "<b>Facteur de directivité DF</b> : rejet du son diffus par rapport à un omni ; DI = 10 log DF.",
          "<b>Facteur de distance</b> = √DF : un directif à √DF × d capte la même proportion de salle qu’un omni à d.",
          "<b>Micro canon</b> : tube à interférences, efficace seulement au-dessus de f ≈ c/L ; en dessous, il se comporte comme sa capsule."
        ],
        formules: [
          ["r(θ) = A + B·cos θ", "atténuation = 20 log |r(θ)|"],
          ["DF = 1 / (A² + B²/3)", "DI = 10 log DF"],
          ["d = √DF × d_omni", "facteur de distance"],
          ["cos θ₀ = −A / B", "angle d’annulation (si A ≤ 0,5)"],
          ["f ≈ c / L", "micro canon"]
        ],
        reperes: [
          "Omni A = 1 · infracardio ≈ 0,7 · cardio 0,5 · super ≈ 0,37 · hyper 0,25 · huit 0.",
          "Cardio : −6 dB à 90°, annulation à 180°, DF = 3.",
          "Super : ≈ −8,7 dB à 90°, ≈ −11,4 dB à 180°, annulation ≈ 125°.",
          "Hyper : −12 dB à 90°, −6 dB à 180°, annulation ≈ 109,5°, DF = 4 (maximum).",
          "Huit : annulation à 90°, même niveau à 180° mais polarité inversée, DF = 3."
        ],
        pieges: [
          "Le plus directif n’est pas le moins sensible à l’arrière : l’hypercardio capte −6 dB à 180°, le cardio y est sourd.",
          "Cardio et huit ont le <b>même</b> DF (3) : ils rejettent autant de salle, mais pas dans les mêmes directions.",
          "Une fiche en dB « gonfle » les courbes : −6 dB est juste sous le premier anneau, pas à mi-rayon.",
          "Un micro canon n’est pas directif dans le grave : un bruit de 200 Hz n’est rejeté que par sa capsule.",
          "En intérieur réverbérant, le canon colore les réflexions : l’hypercardioïde est souvent meilleur."
        ]
      },

      evaluation: (function () {
        const att = (A, d) => { const g = MICRO.gain(A, d); return Math.abs(g) < 1e-6 ? -Infinity : 20 * Math.log10(Math.abs(g)); };
        const dbTxt = v => (isFinite(v) ? NB(v, 1).replace("-", "−") : "−∞") + " dB";
        const olson = (L, f, deg) => { const x = Math.PI * L / MICRO.lambda(f) * (1 - Math.cos(deg * Math.PI / 180)); return x < 1e-9 ? 1 : Math.sin(x) / x; };
        const ficheCanon = L => figFiche("Micro canon — fiche technique", [["Principe", "statique, tube à interférences"], ["Longueur du tube", NB(L * 1000, 0) + " mm"], ["Capsule", "supercardioïde"], ["Réponse en fréquence", "40 – 20 000 Hz"], ["Alimentation", "fantôme 48 V"]]);
        return {
          lire: [
            () => { const d = C([DIR("omni"), DIR("cardio"), DIR("super"), DIR("hyper"), DIR("huit")]); const autres = DIRECTIVITES.filter(x => x.id !== d.id && x.id !== "infra").map(x => x.nom); return { type: "qcm", figure: figPolaire([{ A: d.A, couleur: "#ffd60a" }]), question: "Quelle directivité ce diagramme polaire (échelle linéaire) représente-t-il ? Le lobe en pointillés est de polarité inversée.", bonne: d.nom, mauvaises: autres.sort(() => Math.random() - 0.5).slice(0, 3), explication: d.nom + " : " + (d.A === 1 ? "un cercle, même sensibilité partout." : d.A === 0 ? "deux lobes égaux, sourd à 90°." : d.A === 0.5 ? "un cœur, sourd uniquement à 180°." : "annulation vers " + NB(MICRO.annulation(d.A), 0) + "° et lobe arrière de " + dbTxt(att(d.A, 180)) + "."), indice: "Repérez où la courbe passe par le centre et la taille du lobe arrière." }; },
            { type: "nombre", figure: figPolaire([{ A: 0.5, couleur: "#ffd60a", nom: "Cardioïde" }], { db: true, titre: "anneaux tous les 5 dB" }), question: "Sur ce diagramme en dB, lisez l’atténuation du micro à <b>90°</b> (à 1 dB près).", reponse: -6, unite: "dB", ecart: 1.5, explication: "La courbe coupe l’axe de 90° juste sous l’anneau −5 dB : ≈ −6 dB (20 log 0,5 = −6,0 dB pour un cardioïde).", indice: "Comptez les anneaux depuis l’extérieur : chacun vaut 5 dB." },
            () => { const L = C([0.2, 0.25, 0.3, 0.4, 0.5]); const f = MICRO.c / L; const choix = [f, f * 4, f / 4, f * 10].map(v => "≈ " + (v >= 1000 ? NB(v / 1000, 1) + " kHz" : NB(v, 0) + " Hz")); return { type: "qcm", contexte: ficheCanon(L), question: "D’après cette fiche, en dessous de quelle fréquence environ ce micro se comporte-t-il comme un simple supercardioïde ? (c = 343 m/s)", bonne: choix[0], mauvaises: choix.slice(1), explication: "Le tube mesure " + NB(L * 100, 0) + " cm : il n’agit que si λ < L, soit au-dessus de f ≈ c/L = 343 / " + NB(L, 2) + " ≈ " + choix[0].slice(2) + ". En dessous, seule la capsule supercardioïde agit.", indice: "Lisez la longueur du tube, puis f ≈ c / L." }; },
            () => { const d = C([DIR("cardio"), DIR("hyper"), DIR("omni"), DIR("super")]); return { type: "qcm", contexte: figFiche("Micro statique — directivité", [["Facteur de directivité", NB(MICRO.df(d.A), 1)], ["Indice de directivité", NB(MICRO.di(d.A), 1) + " dB"], ["Atténuation à 90°", dbTxt(att(d.A, 90))], ["Atténuation à 180°", dbTxt(att(d.A, 180))]]), question: "Quelle est la directivité de ce micro ?", bonne: d.nom, mauvaises: DIRECTIVITES.filter(x => x.id !== d.id && x.id !== "infra" && x.id !== "huit").map(x => x.nom).slice(0, 3), explication: "DF = " + NB(MICRO.df(d.A), 1) + ", " + dbTxt(att(d.A, 90)) + " à 90° et " + dbTxt(att(d.A, 180)) + " à 180° : ce sont les valeurs du " + d.nom.toLowerCase() + ".", indice: "Comparez avec le tableau des directivités : regardez surtout l’atténuation à 180°." }; },
            () => { const L = 0.25, fb = 500, fh = 8000; const courbes = [{ f: d => olson(L, fb, d) * MICRO.gain(0.366, d) }, { f: d => olson(L, fh, d) * MICRO.gain(0.366, d) }]; if (Math.random() < 0.5) courbes.reverse(); courbes[0].couleur = "#ffd60a"; courbes[0].nom = "courbe jaune"; courbes[1].couleur = "#64d2ff"; courbes[1].nom = "courbe bleue"; return { type: "qcm", figure: figPolaire(courbes, { db: true, titre: "micro canon, tube de 25 cm" }), question: "Ce micro canon est mesuré à 500 Hz et à 8 kHz. Laquelle des deux courbes correspond à <b>8 kHz</b> ?", bonne: "La plus étroite, avec des lobes secondaires", mauvaises: ["La plus large, en forme de supercardioïde", "Les deux : le tube agit pareil à toutes les fréquences", "Aucune : un canon est omnidirectionnel à 8 kHz"], explication: "À 8 kHz, λ ≈ 4,3 cm est bien plus courte que le tube (25 cm) : les interférences resserrent fortement la directivité et créent des lobes. À 500 Hz (λ ≈ 69 cm), le tube n’agit presque pas : il reste la forme de la capsule.", indice: "Le tube agit au-dessus de c/L ≈ 1,4 kHz." }; }
          ],
          comprendre: [
            ["Un micro cardioïde est sourd à 180° et atténue de 6 dB à 90°.", true, "r(180°) = 0,5 − 0,5 = 0 ; r(90°) = 0,5 → 20 log 0,5 ≈ −6 dB."],
            ["L’hypercardioïde rejette mieux qu’un cardioïde un son venant exactement de l’arrière (180°).", false, "À 180°, le cardio est sourd ; l’hypercardio capte encore −6 dB (lobe arrière). L’hyper rejette mieux les côtés et le son diffus.", "Calculez 20 log |A − B| pour chacun."],
            ["Le cardioïde et le bidirectionnel ont le même facteur de directivité.", true, "DF = 1/(0,25 + 0,25/3) = 3 pour le cardio et 1/(0 + 1/3) = 3 pour le huit : ils captent autant de son diffus."],
            ["Un hypercardioïde placé à 2 m capte à peu près la même proportion de réverbération qu’un omni à 1 m.", true, "Facteur de distance = √DF = √4 = 2."],
            ["Un micro canon est très directif dans toute la bande audible, y compris dans le grave.", false, "Le tube n’agit que si la longueur d’onde est plus courte que lui, au-dessus de f ≈ c/L. Dans le grave, le canon se comporte comme sa capsule.", "Comparez λ à 100 Hz (3,4 m) à la longueur du tube."],
            ["Sur une fiche technique en dB, un cardioïde à 90° se trouve à mi-distance du centre.", false, "−6 dB est à mi-rayon seulement en échelle linéaire. Sur une échelle en dB (−25 dB au centre), il est juste sous le premier anneau (−5 dB).", "Le centre d’un diagramme en dB vaut −25 dB, pas zéro."],
            ["Plus le facteur de directivité est grand, moins le micro capte de son diffus (réverbération, ambiance).", true, "DF compare le son venant de face au son diffus venant de partout : un DF de 4 capte 4 fois moins d’énergie diffuse qu’un omni."],
            ["Un omnidirectionnel a un angle d’annulation à 180°.", false, "Pour A = 1, r(θ) = 1 partout : il n’y a aucune annulation."],
            ["En intérieur très réverbérant, un hypercardioïde donne souvent un son plus naturel qu’un micro canon.", true, "Les réflexions arrivent de toutes les directions et passent par les lobes secondaires du canon, qui les colorent."],
            ["Le lobe arrière d’un supercardioïde est en polarité inversée.", true, "Au-delà de l’angle d’annulation (≈ 125°), A + B·cos θ devient négatif : le signal est inversé."]
          ],
          qcm: [
            ["Un chanteur a un retour de scène placé juste derrière son micro (180°). Quelle directivité choisir ?", "Cardioïde", ["Hypercardioïde", "Bidirectionnelle (en huit)", "Omnidirectionnelle"], "Le cardioïde est sourd à 180°. L’hypercardio capterait encore −6 dB, le huit 0 dB."],
            ["Les retours de scène sont placés à environ ±125° de l’axe du micro. Quelle directivité choisir ?", "Supercardioïde", ["Cardioïde", "Omnidirectionnelle", "Infracardioïde"], "Le supercardioïde a ses angles d’annulation vers ±125°."],
            ["Deux personnes face à face, un seul micro entre elles, et du bruit sur les côtés. Quelle directivité ?", "Bidirectionnelle (en huit)", ["Cardioïde", "Hypercardioïde", "Omnidirectionnelle"], "Le huit capte autant à 0° qu’à 180°, et il est sourd à 90° et 270°, là où se trouve le bruit."],
            ["Que vaut l’indice de directivité d’un hypercardioïde ?", "≈ 6 dB", ["≈ 4,8 dB", "≈ 12 dB", "0 dB"], "DF = 4 → DI = 10 log 4 ≈ 6,0 dB. 4,8 dB est celui du cardio, 12 dB est l’atténuation à 90°."],
            ["Pourquoi un micro canon est-il peu directif dans le grave ?", "Parce que la longueur d’onde y est plus grande que le tube", ["Parce que sa capsule est omnidirectionnelle", "Parce que l’alimentation fantôme limite les graves", "Parce que les fentes du tube bouchent les graves"], "Le tube n’agit que si λ est plus courte que lui ; dans le grave, λ fait plusieurs mètres."],
            ["Quel est l’angle d’annulation d’un hypercardioïde (A = 0,25) ?", "≈ 109,5°", ["180°", "90°", "≈ 125°"], "cos θ₀ = −0,25 / 0,75 = −1/3 → θ₀ ≈ 109,5°. 125° est celui du supercardio."],
            ["Que permet le facteur de distance d’un micro directif ?", "Reculer en gardant la même proportion de son direct qu’un omni", ["Connaître la portée maximale du micro", "Calculer la longueur du câble autorisée", "Mesurer l’effet de proximité"], "Un directif à √DF × d capte le même rapport direct / réverbéré qu’un omni à d."],
            ["Sur un diagramme polaire de fiche technique, que représente l’anneau extérieur ?", "0 dB, la sensibilité sur l’axe", ["−25 dB, le bruit propre", "La sensibilité maximale en mV/Pa", "La fréquence la plus haute mesurée"], "Les fiches graduent en dB : l’anneau extérieur = 0 dB (sur l’axe), puis un anneau tous les 5 dB vers le centre."]
          ],
          calculer: [
            () => { const d = C([DIR("cardio"), DIR("super"), DIR("hyper"), DIR("infra")]), th = C([30, 45, 60, 90, 120, 150]); const g = MICRO.gain(d.A, th); if (Math.abs(g) < 0.02) return { type: "nombre", question: "Directivité " + d.nom.toLowerCase() + " (A = " + NB(d.A, 3) + "). Calculez r(θ) à <b>90°</b>.", reponse: d.A, unite: "", ecart: 0.01, explication: "r(90°) = A + B × cos 90° = A = " + NB(d.A, 3) + ".", indice: "cos 90° = 0." }; return { type: "nombre", question: "Directivité " + d.nom.toLowerCase() + " (A = " + NB(d.A, 3) + "). Atténuation d’un son arrivant à <b>" + th + "°</b> de l’axe ?", reponse: 20 * Math.log10(Math.abs(g)), unite: "dB", ecart: 0.3, explication: "r = " + NB(d.A, 3) + " + " + NB(1 - d.A, 3) + " × cos " + th + "° = " + NB(g, 3) + " → 20 log |" + NB(g, 3) + "| ≈ " + dbTxt(20 * Math.log10(Math.abs(g))) + (g < 0 ? " (polarité inversée)." : "."), indice: "20 log |A + B·cos θ|, avec B = 1 − A." }; },
            () => { const d = C([DIR("infra"), DIR("cardio"), DIR("super"), DIR("hyper"), DIR("huit")]); const B = 1 - d.A, df = MICRO.df(d.A); return { type: "nombre", question: "Directivité " + d.nom.toLowerCase() + " (A = " + NB(d.A, 3) + "). Calculez l’indice de directivité DI.", reponse: MICRO.di(d.A), unite: "dB", ecart: 0.15, explication: "DF = 1 / (A² + B²/3) = 1 / (" + NB(d.A * d.A, 4) + " + " + NB(B * B / 3, 4) + ") ≈ " + NB(df, 2) + " ; DI = 10 log " + NB(df, 2) + " ≈ " + NB(MICRO.di(d.A), 1) + " dB.", indice: "DF = 1 / (A² + B²/3), puis DI = 10 log DF." }; },
            () => { const d = C([DIR("cardio"), DIR("super"), DIR("hyper")]), x = C([0.5, 0.8, 1, 1.5, 2]); return { type: "nombre", question: "Un omni placé à <b>" + NB(x, 1) + " m</b> donne le bon rapport entre voix et réverbération. À quelle distance placer un " + d.nom.toLowerCase() + " pour obtenir le même rapport ?", reponse: MICRO.distance(d.A) * x, unite: "m", explication: "Facteur de distance = √DF = √" + NB(MICRO.df(d.A), 2) + " ≈ " + NB(MICRO.distance(d.A), 2) + " ; d = " + NB(MICRO.distance(d.A), 2) + " × " + NB(x, 1) + " ≈ " + NB(MICRO.distance(d.A) * x, 2) + " m.", indice: "d = √DF × d_omni." }; },
            () => { const A = C([0.5, 0.4, 0.366, 0.3, 0.25, 0.1]); const t0 = MICRO.annulation(A); return { type: "nombre", question: "Un micro a une directivité r(θ) = " + NB(A, 3) + " + " + NB(1 - A, 3) + "·cos θ. Calculez son angle d’annulation (entre 0 et 180°).", reponse: t0, unite: "°", ecart: 1, explication: "cos θ₀ = −A/B = −" + NB(A, 3) + " / " + NB(1 - A, 3) + " ≈ " + NB(-A / (1 - A), 3).replace("-", "−") + " → θ₀ ≈ " + NB(t0, 1) + "°.", indice: "cos θ₀ = −A / B, puis arccos." }; },
            () => { const L = C([0.18, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]); const f = MICRO.c / L; return { type: "nombre", question: "Un micro canon a un tube de <b>" + NB(L * 100, 0) + " cm</b>. À partir de quelle fréquence le tube devient-il efficace ? (c = 343 m/s, réponse en Hz)", reponse: f, unite: "Hz", explication: "f ≈ c / L = 343 / " + NB(L, 2) + " ≈ " + NB(f, 0) + " Hz.", indice: "f ≈ c / L, avec L en mètres." }; },
            () => { const cas = C([["super", 90], ["super", 150], ["super", 180], ["hyper", 90], ["hyper", 150], ["hyper", 180], ["cardio", 90], ["cardio", 120], ["cardio", 150]]); const d = DIR(cas[0]), a = att(d.A, cas[1]); return { type: "nombre", question: "Une voix arrive dans l’axe d’un micro " + d.nom.toLowerCase() + ", un retour de scène à <b>" + cas[1] + "°</b>, au même niveau. De combien de dB la voix domine-t-elle le retour dans le micro ?", reponse: -a, unite: "dB", ecart: 0.3, explication: "Voix : 0 dB (axe). Retour : 20 log |" + NB(d.A, 3) + " + " + NB(1 - d.A, 3) + " × cos " + cas[1] + "°| ≈ " + dbTxt(a) + ". La voix domine de ≈ " + NB(-a, 1) + " dB.", indice: "Calculez l’atténuation du retour ; la voix, dans l’axe, est à 0 dB." }; }
          ],
          exercice: [
            () => { return { type: "exercice", question: "Un chanteur utilise un micro <b>hypercardioïde</b>. Un retour de scène est posé au sol, juste devant lui, donc à <b>180°</b> de l’axe du micro.", etapes: [
              { question: "a) Atténuation du retour par le micro (dB) ?", reponse: -6.02, unite: "dB", ecart: 0.3 },
              { question: "b) Quelle directivité serait sourde à ce retour ?", bonne: "Cardioïde", mauvaises: ["Supercardioïde", "Bidirectionnelle (en huit)"] },
              { question: "c) Avec l’hypercardioïde, où placer deux retours pour qu’il les rejette au mieux ?", bonne: "Vers ±110° de l’axe", mauvaises: ["Vers ±90° de l’axe", "Juste derrière le micro (180°)"] }
            ], solution: "a) r(180°) = 0,25 − 0,75 = −0,5 → 20 log 0,5 ≈ −6 dB (polarité inversée). b) Le cardioïde : r(180°) = 0. c) cos θ₀ = −1/3 → θ₀ ≈ 109,5° : on place les retours vers ±110°.", indice: "r(180°) = A − B." }; },
            () => { const L = C([0.2, 0.25, 0.3]); const f = MICRO.c / L; return { type: "exercice", question: "Un ingénieur du son tourne un reportage dans une rue avec un micro canon de <b>" + NB(L * 100, 0) + " cm</b> (capsule hypercardioïde). Le bruit de la circulation, surtout grave (≈ 150 Hz), arrive à 90° de l’axe. (c = 343 m/s)", etapes: [
              { question: "a) À partir de quelle fréquence le tube devient-il efficace (Hz) ?", reponse: f, unite: "Hz" },
              { question: "b) Le tube aide-t-il à rejeter le bruit de la circulation à 150 Hz ?", bonne: "Non : à 150 Hz, seule la capsule agit", mauvaises: ["Oui : un canon rejette tout ce qui vient de côté", "Oui, mais seulement avec l’alimentation fantôme"] },
              { question: "c) Atténuation de la capsule hypercardioïde à 90° (dB) ?", reponse: -12.04, unite: "dB", ecart: 0.3 }
            ], solution: "a) f ≈ c/L = 343 / " + NB(L, 2) + " ≈ " + NB(f, 0) + " Hz. b) 150 Hz est bien en dessous : λ ≈ 2,3 m, bien plus longue que le tube ; seule la capsule agit. c) r(90°) = A = 0,25 → 20 log 0,25 ≈ −12 dB.", indice: "Comparez 150 Hz à c/L." }; },
            () => { const x = C([0.4, 0.5, 0.6]); return { type: "exercice", question: "Dans une église, un omni placé à <b>" + NB(x * 100, 0) + " cm</b> d’un chanteur donne le bon équilibre entre voix et réverbération. On veut capter la même proportion de salle avec un micro directif.", etapes: [
              { question: "a) Facteur de directivité d’un cardioïde ?", reponse: 3, unite: "", ecart: 0.05 },
              { question: "b) Distance équivalente du cardioïde (m) ?", reponse: Math.sqrt(3) * x, unite: "m" },
              { question: "c) Distance équivalente d’un hypercardioïde (m) ?", reponse: 2 * x, unite: "m" }
            ], solution: "a) DF = 1 / (0,25 + 0,25/3) = 3. b) √3 × " + NB(x, 1) + " ≈ " + NB(Math.sqrt(3) * x, 2) + " m. c) DF = 4 → √4 × " + NB(x, 1) + " = " + NB(2 * x, 2) + " m.", indice: "Facteur de distance = √DF." }; }
          ]
        };
      })()
    },

    /* ======================================================================
       MODULE 5 — SENSIBILITÉ ET FICHE TECHNIQUE
       ====================================================================== */
    {
      titre: "Sensibilité et fiche technique",
      nav: "Fiche technique",
      resume: "mV/Pa, bruit propre, SPL max",
      intro: "Sur la fiche technique d’un micro, quelques lignes suffisent à prévoir son comportement : quelle <b>tension</b> il délivre, quel souffle il ajoute, quel niveau il supporte. Vous apprendrez à les lire, puis à calculer le gain qu’il faut demander au préampli.",

      notions: {
        titre: "Lire une fiche technique",
        intro: "Toutes les valeurs d’une fiche sont mesurées par rapport à un son de référence : <b>1 Pa</b>, soit 94 dB SPL, à 1 kHz, sur l’axe du micro.",
        mots: [
          { t: "Sensibilité", s: "S", u: "mV/Pa", ic: "📈", d: "La tension que délivre le micro quand il reçoit une pression de <b>1 Pa</b> (94 dB SPL), à 1 kHz, sur son axe. Plus elle est grande, plus le micro « parle fort » pour un même son.", c: "Comme le rendement d’une pompe : pour le même effort (la pression), certaines donnent plus d’eau (de tension) que d’autres.", r: "Dynamique ≈ 1,5 à 3 mV/Pa · ruban passif ≈ 1 à 2 mV/Pa · statique ≈ 5 à 50 mV/Pa." },
          { t: "Sensibilité en dBV", u: "dBV (re 1 V/Pa)", ic: "📉", q: "Pourquoi la sensibilité s’écrit-elle aussi en dBV ?", d: "C’est la même sensibilité, exprimée en décibels par rapport à <b>1 V/Pa</b>. Un micro donne bien moins de 1 V pour 1 Pa : la valeur est donc toujours négative. Moins elle est négative, plus le micro est sensible.", c: "Comme une profondeur sous la mer : −34 m est plus près de la surface que −54 m.", r: "20 mV/Pa ≈ −34 dBV · 2 mV/Pa ≈ −54 dBV · 1 mV/Pa = −60 dBV. Une sensibilité divisée par 10 perd 20 dB." },
          { t: "Bruit propre", u: "dB(A) SPL", ic: "🌫️", d: "Le souffle produit par le micro lui-même, même dans un silence parfait. On l’exprime comme le niveau d’une <b>source fictive</b> qui produirait la même tension que ce bruit, avec la pondération A (proche de l’oreille). Plus il est bas, mieux c’est.", c: "Comme le ventilateur d’un ordinateur : inaudible dans une pièce bruyante, gênant dans une pièce silencieuse.", r: "< 10 dB(A) excellent · 10 à 15 très bon · 15 à 20 correct · > 25 audible sur des sources douces. Un micro dynamique n’en indique pas : c’est le bruit du préampli qui compte." },
          { t: "Rapport signal/bruit", s: "S/B", u: "dB", ic: "📶", d: "L’écart entre le son de référence de <b>94 dB SPL</b> (1 Pa) et le bruit propre du micro. Il se calcule par une simple soustraction.", c: "Comme la distance entre la voix d’un orateur et le murmure de la salle : plus elle est grande, plus on l’entend clairement.", r: "Bruit propre 14 dB(A) → S/B = 94 − 14 = 80 dB. Un S/B de plus de 80 dB est très bon." },
          { t: "Niveau maximal admissible", s: "SPL max", u: "dB SPL", ic: "💥", d: "Le niveau de pression au-delà duquel la distorsion du micro dépasse un seuil donné : en général <b>0,5 %</b> ou 1 % de distorsion harmonique (THD). Sur un micro statique, c’est souvent son électronique interne qui sature la première.", c: "Comme la zone rouge du compte-tours : au-delà, le moteur tourne encore, mais mal.", r: "Statique ≈ 125 à 140 dB SPL · dynamique : si élevé qu’il n’est souvent pas indiqué. Caisse claire à 5 cm : plus de 130 dB SPL." },
          { t: "Dynamique", u: "dB", ic: "↕️", d: "L’écart entre le son le plus fort que le micro accepte (SPL max) et son bruit propre. C’est toute la plage de niveaux qu’il capte proprement.", c: "Comme la hauteur sous plafond d’une pièce : du sol (le bruit) au plafond (la saturation).", r: "SPL max 135 dB et bruit propre 14 dB(A) → dynamique = 121 dB." },
          { t: "Atténuateur (pad)", ic: "🎚️", d: "Un commutateur qui réduit le signal de <b>10 ou 20 dB</b> à l’intérieur du micro, en général avant son électronique. Il repousse d’autant le niveau maximal admissible : utile devant une caisse claire, une grosse caisse, un ampli guitare.", c: "Comme des lunettes de soleil : on voit un peu moins dans l’ombre, mais on n’est plus ébloui.", r: "Pad −10 dB : SPL max 132 → 142 dB SPL. La fiche donne souvent les deux valeurs." },
          { t: "Impédance de sortie", s: "Zs", u: "Ω", ic: "🔌", d: "L’« opposition au courant » du micro, vue depuis l’entrée qui le reçoit. Les micros professionnels sont à <b>basse impédance</b> : on peut allonger le câble sur des dizaines de mètres sans perte audible.", c: "Comme un tuyau large : il débite sans s’essouffler, même si on le rallonge.", r: "≈ 50 à 600 Ω, souvent 150 à 200 Ω." },
          { t: "Impédance de charge", s: "Zc", u: "Ω", ic: "🔋", d: "L’impédance d’entrée du préampli. Elle doit être au moins <b>5 à 10 fois</b> plus grande que celle du micro : on dit que le micro travaille « en pont ». On ne cherche pas l’adaptation d’impédance (Zc = Zs), qui ferait perdre 6 dB.", c: "Comme un voltmètre : il mesure une tension sans rien prélever, parce qu’il ne laisse presque pas passer de courant.", r: "Entrée micro ≈ 1 à 2 kΩ pour un micro de 150 à 200 Ω : perte inférieure à 1,5 dB." },
          { t: "Réponse en fréquence", ic: "〰️", d: "La courbe qui montre comment la sensibilité varie avec la fréquence, sur l’axe. La fiche donne la <b>bande passante</b> et une tolérance, par exemple 40 Hz – 20 kHz ± 2 dB.", c: "Comme un égaliseur réglé une fois pour toutes par le fabricant.", r: "Bosse de présence vers 3 à 6 kHz sur les micros de voix · coupe-bas commutable vers 75 à 150 Hz." },
          { t: "dBu et dBV", ic: "⚡", q: "dBu, dBV : quelle différence ?", d: "Deux façons d’exprimer une tension en décibels. Le <b>dBu</b> compare à 0,775 V, le dBV à 1 V. Un même signal vaut donc 2,2 dB de plus en dBu qu’en dBV.", c: "Comme une altitude mesurée depuis deux repères différents : le relief est le même, seul le zéro change.", r: "+4 dBu = 1,228 V (niveau ligne professionnel) · −10 dBV = 0,316 V (niveau grand public) · 0 dBV ≈ +2,2 dBu." },
          { t: "Gain du préampli", s: "G", u: "dB", ic: "🔊", d: "L’amplification qui amène le faible niveau du micro au niveau ligne (+4 dBu en professionnel). Un bon préampli ajoute lui-même très peu de bruit : son <b>bruit ramené à l’entrée</b> (EIN) est d’environ −128 dBu.", c: "Comme une loupe : elle grossit le signal, mais aussi le grain du papier.", r: "Voix parlée (≈ 74 dB SPL) : ≈ 56 dB de gain sur un statique de 20 mV/Pa, ≈ 76 dB sur un dynamique de 2 mV/Pa." }
        ],
        formules: [
          { q: "Comment passer des mV/Pa aux dBV ?", f: "S<sub>dBV</sub> = 20 × log(S / 1 V/Pa)", say: "la sensibilité en dBV est égale à vingt fois le logarithme de la sensibilité exprimée en volts par pascal", rows: [["S<sub>dBV</sub>", "sensibilité en décibels", "dBV", "toujours négative"], ["S", "sensibilité", "V/Pa", "à convertir : 20 mV/Pa = 0,020 V/Pa"]], ex: "S = 20 mV/Pa = 0,020 V/Pa : 20 × log(0,020) = <b>−34 dBV</b>. Dans l’autre sens : S = 1 000 × 10<sup>(−34/20)</sup> ≈ 20 mV/Pa." },
          { q: "Quelle tension délivre le micro ?", f: "U = S × p", say: "la tension est égale à la sensibilité multipliée par la pression acoustique", rows: [["U", "tension de sortie", "mV", "ce que l’on cherche"], ["S", "sensibilité", "mV/Pa", "lue sur la fiche"], ["p", "pression acoustique", "Pa", "p = 2·10⁻⁵ × 10<sup>L/20</sup>"]], ex: "S = 20 mV/Pa, voix à 74 dB SPL : p = 2·10⁻⁵ × 10<sup>74/20</sup> ≈ 0,10 Pa, donc U = 20 × 0,10 = <b>2,0 mV</b>." },
          { q: "Comment exprimer cette tension en dBu ?", f: "L<sub>dBu</sub> = 20 × log(U / 0,775 V)", say: "le niveau en dBu est égal à vingt fois le logarithme de la tension divisée par 0,775 volt", rows: [["L<sub>dBu</sub>", "niveau électrique", "dBu", "négatif au niveau micro"], ["U", "tension", "V", "en volts : 2 mV = 0,002 V"], ["0,775 V", "référence du dBu", "V", "0 dBu"]], ex: "U = 2 mV : 20 × log(0,002 / 0,775) = <b>−51,8 dBu</b>." },
          { q: "Comment calculer le rapport signal/bruit et la dynamique ?", f: "S/B = 94 − Bp  ·  Dyn = SPL<sub>max</sub> − Bp", say: "le rapport signal sur bruit est égal à 94 moins le bruit propre ; la dynamique est égale au niveau maximal moins le bruit propre", rows: [["S/B", "rapport signal/bruit", "dB", "par rapport à 1 Pa"], ["Bp", "bruit propre", "dB(A) SPL", "lu sur la fiche"], ["SPL<sub>max</sub>", "niveau maximal admissible", "dB SPL", "lu sur la fiche"], ["Dyn", "dynamique", "dB", "plage utile"]], ex: "Bruit propre 14 dB(A), SPL max 135 dB : S/B = 94 − 14 = <b>80 dB</b> ; dynamique = 135 − 14 = <b>121 dB</b>." },
          { q: "Quel gain faut-il régler au préampli ?", f: "G = L<sub>visé</sub> − L<sub>micro</sub>", say: "le gain est égal au niveau visé moins le niveau du micro", rows: [["G", "gain du préampli", "dB", "ce que l’on règle"], ["L<sub>visé</sub>", "niveau visé", "dBu", "+4 dBu en professionnel"], ["L<sub>micro</sub>", "niveau de sortie du micro", "dBu", "calculé avec U = S × p"]], ex: "Micro à −51,8 dBu, niveau visé +4 dBu : G = 4 − (−51,8) = <b>55,8 dB</b>." },
          { q: "Pourquoi l’entrée doit-elle avoir une impédance 10 fois plus grande ?", f: "U<sub>c</sub> = U × Zc / (Zs + Zc)", say: "la tension reçue est égale à la tension du micro multipliée par Zc divisé par Zs plus Zc", rows: [["U<sub>c</sub>", "tension reçue par le préampli", "V", "ce qui reste"], ["U", "tension du micro à vide", "V", ""], ["Zs", "impédance de sortie du micro", "Ω", "≈ 200 Ω"], ["Zc", "impédance d’entrée du préampli", "Ω", "≈ 2 kΩ"]], ex: "Zs = 200 Ω, Zc = 2 000 Ω : U<sub>c</sub> = U × 2 000 / 2 200 = 0,91 × U, soit −0,8 dB seulement. Avec Zc = Zs, on perdrait la moitié : −6 dB." }
        ]
      },

      manipuler: {
        titre: "Du son dans l’air au niveau ligne",
        intro: "Choisissez un micro et une source : suivez le niveau depuis la <b>pression</b> jusqu’à la sortie du préampli. Puis lisez une fiche technique ligne par ligne."
      },

      essentiel: {
        definitions: [
          "<b>Sensibilité</b> : tension délivrée pour 1 Pa (94 dB SPL) à 1 kHz, en mV/Pa ou en dBV.",
          "<b>Bruit propre</b> : niveau (en dB(A) SPL) d’une source fictive qui produirait le même bruit que le micro.",
          "<b>SPL max</b> : niveau au-delà duquel la distorsion dépasse 0,5 % ou 1 %.",
          "<b>Dynamique</b> : SPL max − bruit propre. <b>Rapport signal/bruit</b> : 94 − bruit propre.",
          "<b>Atténuateur (pad)</b> : −10 ou −20 dB dans le micro, il repousse le SPL max d’autant.",
          "<b>En pont</b> : l’entrée a une impédance 5 à 10 fois plus grande que le micro ; pas d’adaptation d’impédance."
        ],
        formules: [
          ["S<sub>dBV</sub> = 20 log(S en V/Pa)", "20 mV/Pa ≈ −34 dBV"],
          ["U = S × p", "p = 2·10⁻⁵ × 10<sup>L/20</sup>"],
          ["L<sub>dBu</sub> = 20 log(U / 0,775)", "0 dBu = 0,775 V"],
          ["S/B = 94 − Bp ; Dyn = SPL<sub>max</sub> − Bp", "tout en dB"],
          ["G = L<sub>visé</sub> − L<sub>micro</sub>", "niveau visé : +4 dBu"],
          ["U<sub>c</sub> = U × Zc / (Zs + Zc)", "Zc ≥ 5 à 10 × Zs"]
        ],
        reperes: [
          "Dynamique ≈ 1,5 à 3 mV/Pa ; statique ≈ 5 à 50 mV/Pa.",
          "1 mV/Pa = −60 dBV ; 2 mV/Pa ≈ −54 dBV ; 20 mV/Pa ≈ −34 dBV.",
          "Bruit propre : < 10 dB(A) excellent, > 25 dB(A) audible sur les sources douces.",
          "Impédance de sortie ≈ 150 à 200 Ω ; entrée micro ≈ 1 à 2 kΩ.",
          "Niveau ligne : +4 dBu = 1,228 V ; EIN d’un bon préampli ≈ −128 dBu."
        ],
        pieges: [
          "Les dBV d’une sensibilité sont négatifs : −34 dBV est <b>plus sensible</b> que −54 dBV.",
          "Pour le bruit propre, plus petit = mieux. Pour le rapport signal/bruit, plus grand = mieux.",
          "Convertir les mV/Pa en V/Pa avant le logarithme : 20 mV/Pa = 0,020 V/Pa.",
          "Ne pas confondre dBu (0,775 V) et dBV (1 V) : 2,2 dB d’écart.",
          "Un micro peu sensible n’est pas « moins bon » : il demande plus de gain, et c’est alors le bruit du préampli qui compte."
        ]
      },

      evaluation: {
        lire: [
          () => {
            const S = C([12, 15, 18, 22, 25, 28]), bp = H(8, 24), max = H(126, 140);
            return { type: "nombre", contexte: "Extrait de la fiche d’un micro statique (type).", figure: figFiche("Micro statique (type)", [["Sensibilité (1 kHz)", S + " mV/Pa (" + NB(MICRO.dbv(S), 1).replace("-", "−") + " dBV)"], ["Bruit propre (pondéré A)", bp + " dB(A)"], ["SPL max (THD 0,5 %)", max + " dB"], ["Impédance", "200 Ω"]]), question: "Quel est le <b>bruit propre</b> de ce micro ?", reponse: bp, unite: "dB(A)", ecart: 0, explication: "On lit directement la ligne « Bruit propre » : " + bp + " dB(A). C’est le niveau d’une source fictive qui produirait le même souffle que le micro.", indice: "Cherchez la ligne avec la pondération A." };
          },
          () => {
            const max = H(128, 136), pad = C([10, 20]);
            return { type: "nombre", contexte: "Extrait de la fiche d’un micro statique grande membrane (type).", figure: figFiche("Statique grande membrane (type)", [["Sensibilité (1 kHz)", "25 mV/Pa (−32 dBV)"], ["Bruit propre (pondéré A)", "7 dB(A)"], ["SPL max (THD 0,5 %)", max + " dB / " + (max + pad) + " dB (pad −" + pad + " dB)"], ["Atténuateur", "0 / −" + pad + " dB"]]), question: "Quel niveau maximal ce micro accepte-t-il avec l’<b>atténuateur enclenché</b> ?", reponse: max + pad, unite: "dB SPL", ecart: 0, explication: "La fiche donne deux valeurs : " + max + " dB sans atténuateur, " + (max + pad) + " dB avec l’atténuateur de −" + pad + " dB. L’atténuateur repousse le SPL max d’autant de décibels qu’il retire.", indice: "La seconde valeur est celle « avec pad »." };
          },
          () => {
            const a = C([-38, -36, -34, -32]), b = C([-56, -54, -52, -50]);
            const fiche = figFiche("Comparaison de deux fiches", [["Micro A — sensibilité", NB(a, 0).replace("-", "−") + " dBV"], ["Micro B — sensibilité", NB(b, 0).replace("-", "−") + " dBV"]]);
            return { type: "qcm", contexte: "Deux fiches techniques donnent la sensibilité en dBV (re 1 V/Pa).", figure: fiche, question: "Lequel de ces deux micros est le plus <b>sensible</b> ?", bonne: "Le micro A, de " + (a - b) + " dB", mauvaises: ["Le micro B, de " + (a - b) + " dB", "Les deux : seul le signe change", "Impossible à dire sans les mV/Pa"], explication: "−" + Math.abs(a) + " dBV est plus proche de 0 que −" + Math.abs(b) + " dBV : le micro A délivre plus de tension pour 1 Pa. L’écart est de " + (a - b) + " dB, soit environ " + NB(Math.pow(10, (a - b) / 20), 0) + " fois plus de tension.", indice: "En dBV, moins négatif = plus de tension." };
          },
          () => {
            const fp = C([3000, 4000, 5000, 6000]), A = H(3, 6), cb = C([80, 100, 120]);
            const X = f => 40 + (Math.log10(f) - Math.log10(20)) / 3 * 440, Y = v => 100 - v * 5;
            let d = "";
            for (let i = 0; i <= 150; i++) {
              const f = 20 * Math.pow(1000, i / 150), x = f / cb;
              const v = 20 * Math.log10(x * x / Math.sqrt(1 + Math.pow(x, 4))) - 10 * Math.log10(1 + Math.pow(f / 18000, 4)) + A * Math.exp(-Math.pow(Math.log10(f / fp) / 0.17, 2) / 2);
              d += (i ? "L" : "M") + X(f).toFixed(1) + " " + Math.min(205, Y(v)).toFixed(1);
            }
            let s = "";
            [5, 0, -5, -10, -15, -20].forEach(v => { s += LIGNE(40, Y(v), 480, Y(v), { c: v === 0 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.1)" }) + TXT(34, Y(v) + 4, (v > 0 ? "+" : "") + String(v).replace("-", "−"), { s: 10, w: 500, c: "#8e8e93", a: "end" }); });
            [[20, "20"], [100, "100"], [1000, "1 k"], [10000, "10 k"], [20000, "20 k"]].forEach(p => { s += LIGNE(X(p[0]), 50, X(p[0]), 205, { c: "rgba(255,255,255,.1)" }) + TXT(X(p[0]), 222, p[1], { s: 10, w: 500, c: "#8e8e93" }); });
            s += '<path d="' + d + '" fill="none" stroke="#ffd60a" stroke-width="2.4"/>' + TXT(40, 30, "Réponse en fréquence sur l’axe (dB, Hz)", { s: 12, a: "start" });
            const nom = f => NB(f / 1000, 0) + " kHz";
            return { type: "qcm", contexte: "Courbe de réponse d’un micro de voix (type).", figure: SVG(500, 232, s, "Courbe de réponse en fréquence avec une bosse dans l’aigu et une chute dans le grave"), question: "Vers quelle fréquence se trouve la <b>bosse de présence</b> de ce micro ?", bonne: "Vers " + nom(fp) + ", de +" + A + " dB environ", mauvaises: ["Vers " + cb + " Hz, de +" + A + " dB environ", "Vers 1 kHz, la fréquence de référence", "Vers 20 kHz, en haut de la bande"], explication: "La courbe monte de " + A + " dB environ autour de " + nom(fp) + " : c’est la bosse de présence, qui rend la voix plus intelligible. La chute dans le grave est un coupe-bas, vers " + cb + " Hz.", indice: "La présence se trouve dans l’aigu, entre 3 et 6 kHz." };
          },
          () => {
            const zs = C([150, 200, 250, 300]);
            return { type: "qcm", contexte: "Fiche d’un micro : « Impédance nominale : " + zs + " Ω ».", figure: figFiche("Micro (type)", [["Impédance nominale", zs + " Ω"], ["Impédance de charge minimale", NB(5 * zs, 0) + " Ω"]]), question: "Quelle impédance d’entrée de préampli convient le mieux ?", bonne: NB(10 * zs, 0) + " Ω, environ dix fois plus", mauvaises: [zs + " Ω, la même valeur", NB(zs / 2, 0) + " Ω, deux fois moins", "Peu importe, seule la tension compte"], explication: "On fait travailler le micro « en pont » : l’entrée doit avoir une impédance au moins 5 à 10 fois plus grande. Avec " + NB(10 * zs, 0) + " Ω, la perte n’est que de 0,8 dB ; avec " + zs + " Ω (adaptation d’impédance), elle serait de 6 dB.", indice: "On ne cherche pas l’adaptation d’impédance." };
          }
        ],
        comprendre: [
          ["Une sensibilité de −34 dBV est plus grande qu’une sensibilité de −54 dBV.", true, "−34 dBV est plus proche de 0 dBV (1 V/Pa) : le micro délivre plus de tension. L’écart de 20 dB correspond à 10 fois plus de tension.", "Comparez à 0 dBV."],
          ["Plus le bruit propre d’un micro est élevé, meilleur il est.", false, "C’est l’inverse : le bruit propre est un souffle parasite. Un bon micro de studio descend sous 10 dB(A)."],
          ["La sensibilité d’un micro est mesurée pour une pression de 1 Pa, soit 94 dB SPL.", true, "C’est la référence de toutes les fiches techniques : 1 Pa à 1 kHz, sur l’axe."],
          ["Pour qu’un micro délivre toute sa tension, l’impédance d’entrée du préampli doit être égale à celle du micro.", false, "L’adaptation d’impédance ferait perdre 6 dB. On fait travailler le micro « en pont » : l’entrée a une impédance 5 à 10 fois plus grande.", "Pensez au diviseur de tension."],
          ["Enclencher l’atténuateur de −10 dB d’un micro statique augmente son niveau maximal admissible d’environ 10 dB.", true, "Le signal est réduit avant l’électronique interne, qui sature alors 10 dB plus tard."],
          ["Un micro dynamique demande en général plus de gain au préampli qu’un micro statique.", true, "Sa sensibilité est environ 10 fois plus faible (≈ 2 mV/Pa contre ≈ 20 mV/Pa) : il faut environ 20 dB de gain en plus."],
          ["Le rapport signal/bruit d’un micro se calcule par 94 dB moins son bruit propre.", true, "Le signal de référence est 1 Pa = 94 dB SPL. Bruit propre 14 dB(A) → S/B = 80 dB."],
          ["La dynamique d’un micro est l’écart entre 94 dB SPL et son niveau maximal admissible.", false, "La dynamique va du bruit propre au SPL max : Dyn = SPL max − bruit propre.", "Du plancher au plafond."],
          ["0 dBu et 0 dBV désignent la même tension.", false, "0 dBu = 0,775 V et 0 dBV = 1 V : il y a 2,2 dB d’écart."],
          ["La sensibilité d’un micro dépend de la fréquence : c’est ce que montre sa courbe de réponse.", true, "La sensibilité de la fiche est donnée à 1 kHz ; la courbe de réponse montre son évolution sur toute la bande."]
        ],
        qcm: [
          ["Que signifie « 20 mV/Pa » sur une fiche ?", "Le micro délivre 20 mV pour une pression de 1 Pa", ["Le micro supporte jusqu’à 20 Pa", "Le micro ajoute un bruit de 20 mV", "Le micro consomme 20 mA sous 1 V"], "La sensibilité est la tension de sortie pour 1 Pa (94 dB SPL) à 1 kHz.", "C’est une tension par unité de pression."],
          ["Quelle sensibilité correspond à un micro dynamique typique ?", "≈ 2 mV/Pa", ["≈ 20 mV/Pa", "≈ 200 mV/Pa", "≈ 0,02 mV/Pa"], "Un dynamique délivre ≈ 1,5 à 3 mV/Pa, environ dix fois moins qu’un statique."],
          ["Quel bruit propre annonce un excellent micro de studio ?", "Moins de 10 dB(A)", ["Plus de 30 dB(A)", "Environ 94 dB(A)", "Environ 130 dB(A)"], "Moins de 10 dB(A) est excellent ; au-delà de 25 dB(A), le souffle devient audible sur les sources douces. 94 et 130 dB sont des niveaux de signal, pas de bruit."],
          ["À quoi sert l’atténuateur (pad) d’un micro statique ?", "À éviter la saturation devant une source très forte", ["À réduire le bruit propre du micro", "À couper les basses fréquences", "À couper l’alimentation fantôme"], "Il réduit le signal dans le micro et repousse son SPL max de 10 ou 20 dB. Couper les basses, c’est le rôle du coupe-bas."],
          ["Quelle impédance d’entrée choisir pour un micro de 200 Ω ?", "Environ 2 kΩ", ["Exactement 200 Ω", "Environ 20 Ω", "Environ 100 Ω"], "Le micro travaille en pont : entrée ≥ 5 à 10 fois son impédance. 2 kΩ ne fait perdre que 0,8 dB."],
          ["Un micro A a un bruit propre de 12 dB(A), un micro B de 22 dB(A). Que peut-on dire ?", "A a un rapport signal/bruit meilleur de 10 dB", ["B est plus sensible de 10 dB", "A sature 10 dB plus tôt", "B a une dynamique plus grande de 10 dB"], "S/B = 94 − bruit propre : 82 dB pour A, 72 dB pour B. Le bruit propre ne dit rien de la sensibilité."],
          ["Quelle valeur correspond à +4 dBu, le niveau ligne professionnel ?", "1,228 V", ["0,775 V", "1 V", "0,316 V"], "+4 dBu = 0,775 × 10<sup>4/20</sup> = 1,228 V. 0,775 V = 0 dBu, 1 V = 0 dBV, 0,316 V = −10 dBV."],
          ["Pourquoi un micro dynamique n’indique-t-il souvent pas de bruit propre ?", "Sans électronique, son bruit est négligeable devant celui du préampli", ["Parce qu’il ne capte aucun son faible", "Parce qu’il est toujours plus bruyant qu’un statique", "Parce que la norme l’interdit"], "Le dynamique n’a pas d’électronique interne. Sur une source faible, c’est le préampli, poussé très haut en gain, qui fixe le bruit."]
        ],
        calculer: [
          () => { const S = C([2, 4, 5, 8, 10, 12, 15, 25, 30, 40, 50]), v = MICRO.dbv(S); return { type: "nombre", question: "Un micro a une sensibilité de <b>" + S + " mV/Pa</b>. Exprimez-la en dBV (re 1 V/Pa).", reponse: v, unite: "dBV", ecart: 0.3, explication: "S = " + NB(S / 1000, 3) + " V/Pa. 20 × log(" + NB(S / 1000, 3) + ") = " + NB(v, 1).replace("-", "−") + " dBV.", indice: "Convertissez d’abord en V/Pa, puis 20 × log." }; },
          () => { const d = -H(28, 58), S = MICRO.mvpa(d); return { type: "nombre", question: "Une fiche donne une sensibilité de <b>" + String(d).replace("-", "−") + " dBV</b> (re 1 V/Pa). Combien de mV/Pa cela représente-t-il ?", reponse: S, unite: "mV/Pa", explication: "S = 10<sup>(" + String(d).replace("-", "−") + "/20)</sup> = " + NB(S / 1000, 4) + " V/Pa = " + NB(S, 2) + " mV/Pa.", indice: "S (V/Pa) = 10 puissance (dBV / 20)." }; },
          () => { const S = C([2, 5, 10, 15, 20, 25, 30]), L = C([74, 80, 86, 88, 94, 100, 106]), p = MICRO.pa(L), U = S * p; return { type: "nombre", question: "Un micro de <b>" + S + " mV/Pa</b> capte une source de <b>" + L + " dB SPL</b>. Quelle tension délivre-t-il ?", reponse: U, unite: "mV", explication: "p = 2·10⁻⁵ × 10<sup>" + L + "/20</sup> = " + NB(p, 3) + " Pa. U = S × p = " + S + " × " + NB(p, 3) + " = " + NB(U, 2) + " mV.", indice: "Calculez d’abord la pression en pascals." }; },
          () => { const U = C([0.5, 1, 2, 3, 5, 8, 12, 20, 50]), L = MICRO.dbu(U / 1000); return { type: "nombre", question: "Un micro délivre <b>" + NB(U, 1) + " mV</b>. Quel est son niveau en dBu ?", reponse: L, unite: "dBu", ecart: 0.3, explication: "L = 20 × log(" + NB(U / 1000, 4) + " / 0,775) = " + NB(L, 1).replace("-", "−") + " dBu.", indice: "Référence du dBu : 0,775 V." }; },
          () => { const S = C([2, 5, 10, 20, 25]), L = C([70, 74, 80, 90, 100]), Lm = MICRO.dbu(S / 1000 * MICRO.pa(L)), G = 4 - Lm; return { type: "nombre", question: "Un micro de <b>" + S + " mV/Pa</b> capte une voix à <b>" + L + " dB SPL</b>. Quel gain faut-il au préampli pour atteindre <b>+4 dBu</b> ?", reponse: G, unite: "dB", ecart: 0.6, explication: "p = " + NB(MICRO.pa(L), 3) + " Pa ; U = " + S + " × " + NB(MICRO.pa(L), 3) + " = " + NB(S * MICRO.pa(L), 2) + " mV ; L = 20 log(U / 0,775) = " + NB(Lm, 1).replace("-", "−") + " dBu. G = 4 − (" + NB(Lm, 1).replace("-", "−") + ") = " + NB(G, 1) + " dB.", indice: "Trois étapes : pression, tension, dBu ; puis G = visé − micro." }; },
          () => { const bp = H(6, 26), max = H(125, 142), q = C(["sb", "dyn"]); return q === "sb" ? { type: "nombre", question: "Un micro a un bruit propre de <b>" + bp + " dB(A)</b>. Quel est son rapport signal/bruit (re 94 dB SPL) ?", reponse: 94 - bp, unite: "dB", ecart: 0, explication: "S/B = 94 − " + bp + " = " + (94 - bp) + " dB.", indice: "La référence est 1 Pa = 94 dB SPL." } : { type: "nombre", question: "Un micro a un bruit propre de <b>" + bp + " dB(A)</b> et un SPL max de <b>" + max + " dB</b>. Quelle est sa dynamique ?", reponse: max - bp, unite: "dB", ecart: 0, explication: "Dyn = SPL max − bruit propre = " + max + " − " + bp + " = " + (max - bp) + " dB.", indice: "Du plancher (bruit) au plafond (SPL max)." }; },
          () => { const zs = C([150, 200, 300, 600]), zc = C([300, 600, 1000, 1500, 2000, 3000]), perte = -20 * Math.log10(zc / (zs + zc)); return { type: "nombre", question: "Un micro d’impédance <b>" + zs + " Ω</b> est branché sur une entrée de <b>" + NB(zc, 0) + " Ω</b>. Quelle perte de niveau (en dB, valeur positive) subit le signal ?", reponse: perte, unite: "dB", ecart: 0.2, explication: "U<sub>c</sub> / U = " + NB(zc, 0) + " / (" + zs + " + " + NB(zc, 0) + ") = " + NB(zc / (zs + zc), 3) + ". Perte = −20 × log(" + NB(zc / (zs + zc), 3) + ") = " + NB(perte, 2) + " dB.", indice: "Diviseur de tension : Zc / (Zs + Zc)." }; }
        ],
        exercice: [
          () => {
            const S = C([15, 20, 25]), L = C([70, 74, 78]), p = MICRO.pa(L), U = S * p, Lm = MICRO.dbu(U / 1000);
            return { type: "exercice", question: "Interview en plateau : un micro statique de <b>" + S + " mV/Pa</b> capte une voix à <b>" + L + " dB SPL</b>. Le préampli doit sortir <b>+4 dBu</b>.", etapes: [
              { question: "a) Pression acoustique de la voix (en Pa) ?", reponse: p, unite: "Pa" },
              { question: "b) Tension délivrée par le micro (en mV) ?", reponse: U, unite: "mV" },
              { question: "c) Niveau du micro en dBu ?", reponse: Lm, unite: "dBu", ecart: 0.4 },
              { question: "d) Gain à régler au préampli ?", reponse: 4 - Lm, unite: "dB", ecart: 0.6 }
            ], solution: "a) p = 2·10⁻⁵ × 10<sup>" + L + "/20</sup> = " + NB(p, 3) + " Pa. b) U = " + S + " × " + NB(p, 3) + " = " + NB(U, 2) + " mV. c) 20 log(" + NB(U / 1000, 4) + " / 0,775) = " + NB(Lm, 1).replace("-", "−") + " dBu. d) G = 4 − (" + NB(Lm, 1).replace("-", "−") + ") = " + NB(4 - Lm, 1) + " dB.", indice: "p = 2·10⁻⁵ × 10<sup>L/20</sup>, puis U = S × p." };
          },
          () => {
            const Sd = C([1.5, 2, 2.5]), Ss = C([15, 20, 25]), bp = H(9, 16), max = H(130, 138), ecart = MICRO.dbv(Ss) - MICRO.dbv(Sd);
            return { type: "exercice", question: "Pour enregistrer une ambiance calme, vous hésitez entre un micro dynamique de <b>" + NB(Sd, 1) + " mV/Pa</b> et un micro statique de <b>" + Ss + " mV/Pa</b> (bruit propre <b>" + bp + " dB(A)</b>, SPL max <b>" + max + " dB</b>).", etapes: [
              { question: "a) De combien de dB le statique est-il plus sensible ?", reponse: ecart, unite: "dB", ecart: 0.4 },
              { question: "b) Rapport signal/bruit du statique (re 94 dB) ?", reponse: 94 - bp, unite: "dB", ecart: 0 },
              { question: "c) Dynamique du statique ?", reponse: max - bp, unite: "dB", ecart: 0 },
              { question: "d) Quel micro choisir pour cette ambiance calme ?", bonne: "Le statique : plus sensible, il demande moins de gain", mauvaises: ["Le dynamique : sans électronique, il n’a aucun bruit", "Les deux se valent : seule la directivité compte"] }
            ], solution: "a) 20 log(" + Ss + " / " + NB(Sd, 1) + ") = " + NB(ecart, 1) + " dB. b) 94 − " + bp + " = " + (94 - bp) + " dB. c) " + max + " − " + bp + " = " + (max - bp) + " dB. d) Sur une source faible, le dynamique impose " + NB(ecart, 0) + " dB de gain en plus : le bruit du préampli devient audible. Le statique est le bon choix.", indice: "Écart en dB = 20 log(rapport des sensibilités)." };
          }
        ]
      }
    },

    /* ======================================================================
       MODULE 6 — TYPES DE MICROS ET PRISE DE SON
       ====================================================================== */
    {
      titre: "Types de micros et prise de son",
      nav: "Types de micros",
      resume: "Main, cravate, canon, HF",
      intro: "Micro main, cravate, serre-tête, canon sur perche, micro de surface, liaison HF : chaque micro répond à une <b>situation de tournage</b>. Vous verrez aussi pourquoi la distance au micro compte autant que le micro lui-même : champ direct, champ réverbéré, distance critique et filtre en peigne.",

      notions: {
        titre: "Le bon micro, au bon endroit",
        intro: "Choisir un micro, c’est choisir une <b>distance</b> à la source, une directivité et une protection contre le vent et les vibrations.",
        mots: [
          { t: "Micro main", ic: "🎤", d: "Micro tenu à la main ou posé sur pied. Pour le <b>chant</b> : souvent dynamique, cardioïde ou supercardioïde, robuste, avec une grille anti-pop. Pour le <b>reportage</b> : souvent omnidirectionnel, à long manche, peu sensible aux bruits de manipulation et au vent, sans effet de proximité.", c: "Comme un outil de chantier : il doit survivre aux chocs, aux postillons et aux mains qui bougent.", r: "Chant : bouche à quelques centimètres · reportage : micro tendu vers l’interlocuteur, à 20 ou 30 cm." },
          { t: "Micro cravate", ic: "👔", d: "Micro électret miniature, fixé sur la poitrine à environ <b>20 à 25 cm</b> de la bouche, le plus souvent omnidirectionnel. La bouche est hors de son axe et la poitrine masque une partie de l’aigu : certains modèles ont une bosse de présence. Il craint les frottements de vêtements ; on l’associe presque toujours à un émetteur HF.", c: "Comme un badge : discret, toujours à la même place, mais il entend aussi la chemise qui frotte.", r: "Capsule de quelques millimètres · 20 à 25 cm de la bouche · interview, plateau TV, documentaire." },
          { t: "Micro serre-tête", ic: "🎧", d: "Capsule portée sur une petite tige, à <b>quelques centimètres</b> de la bouche. Très proche de la source, il donne un excellent rapport entre la voix et l’ambiance, même dans le bruit.", c: "Comme parler à l’oreille de quelqu’un : on n’a pas besoin de crier pour être compris dans une foule.", r: "Spectacle vivant, commentaire sportif, comédie musicale." },
          { t: "Micro canon sur perche", ic: "🎯", d: "Micro très directif (tube à interférences) tenu au bout d’une perche par le <b>perchman</b>, juste hors du cadre. Il capte la voix de loin en atténuant les côtés. On le protège avec une bonnette, et par vent fort avec une fourrure.", c: "Comme une lampe torche : le faisceau éclaire la personne visée, pas toute la pièce.", r: "Fiction, reportage, documentaire · micro à environ 0,5 à 1 m de la bouche, au-dessus ou en dessous du cadre." },
          { t: "Micro de surface (à zone de pression)", ic: "🪵", d: "Capsule placée à <b>quelques millimètres</b> d’une surface réfléchissante (table, sol, mur). Le son direct et le son réfléchi par la surface arrivent en phase : il n’y a pas de filtre en peigne, et la pression est doublée (+6 dB). Sa directivité est hémisphérique (ou en demi-cardioïde).", c: "Comme écouter en posant l’oreille contre la table : le son de la table et celui de l’air arrivent ensemble.", r: "Table de conférence, table ronde, sol de théâtre · +6 dB sur une surface rigide." },
          { t: "Micro statique grande membrane", ic: "🎙️", d: "Micro de studio à grande membrane, monté dans une suspension élastique, souvent avec un filtre anti-pop. Très sensible, à faible bruit propre, il sert à la <b>voix off</b>, au chant, aux instruments acoustiques.", c: "Comme un appareil photo plein format : il demande du soin et de la place, il rend les détails.", r: "Bruit propre souvent < 10 dB(A) · alimentation fantôme 48 V." },
          { t: "Micro d’appoint et micro de contact", ic: "🎸", d: "Un micro d’<b>appoint</b> est placé près d’un instrument pour le renforcer dans le mixage. Un micro de <b>contact</b> (piézoélectrique) est collé sur l’instrument : il capte ses vibrations, pas l’air, donc presque rien des sons voisins.", c: "Le micro de contact, c’est comme un stéthoscope : il écoute de l’intérieur.", r: "Contact : guitare, contrebasse, piano · appoint : à quelques dizaines de centimètres de l’instrument." },
          { t: "Liaison HF", ic: "📡", d: "Un émetteur (de poche pour un cravate, ou intégré au micro main) transmet le son par radio à un récepteur. En UHF, les fréquences sont partagées avec la télévision numérique terrestre : on choisit des <b>fréquences libres</b> (balayage, « scan ») et compatibles entre elles. Les systèmes analogiques utilisent un compresseur-expanseur (compandeur) ; les systèmes numériques ajoutent une petite latence.", c: "Comme des talkies-walkies : chaque émetteur a son canal, et deux canaux mal choisis se brouillent.", r: "Un émetteur, un récepteur, une fréquence · piles ou batteries à surveiller · antennes dégagées, en vue de l’émetteur." },
          { t: "Intermodulation", ic: "🔀", d: "Quand plusieurs émetteurs fonctionnent ensemble, leurs fréquences se mélangent dans les étages électroniques et créent des <b>fréquences parasites</b> (par exemple 2f₁ − f₂). Un plan de fréquences « compatibles » évite de placer un canal sur ces produits.", c: "Comme deux notes qui, jouées ensemble, font entendre une troisième note qui n’existe pas.", r: "Le logiciel du récepteur ou le scan propose des groupes de fréquences compatibles." },
          { t: "Réception en diversité", ic: "📶", d: "Le récepteur a <b>deux antennes</b> (et deux étages de réception) et garde à chaque instant le meilleur signal. Quand une antenne tombe dans un « trou » de réception dû aux réflexions, l’autre prend le relais.", c: "Comme deux personnes qui écoutent une conversation dans une salle bruyante : on retient celle qui a le mieux entendu.", r: "Les deux antennes sont écartées d’au moins un quart de longueur d’onde." },
          { t: "Bonnette et fourrure", ic: "🌬️", d: "La <b>bonnette mousse</b> protège du vent léger et des postillons. La <b>fourrure</b> (« windjammer ») se pose sur une protection anti-vent pour le vent fort : les poils freinent l’air avant qu’il n’atteigne la capsule et ne crée des turbulences.", c: "Comme un bonnet et une doudoune : l’un suffit à la brise, il faut l’autre en tempête.", r: "Mousse : intérieur, déplacements · fourrure : extérieur venté." },
          { t: "Suspension élastique et filtre anti-pop", ic: "🫧", d: "La <b>suspension élastique</b> isole le micro des vibrations transmises par la perche, le pied ou le sol. Le <b>filtre anti-pop</b> (écran de tissu ou de métal devant le micro) arrête les jets d’air des consonnes explosives « p » et « b ».", c: "La suspension, c’est l’amortisseur d’une voiture ; le filtre anti-pop, c’est la main devant la bouche.", r: "Suspension : perche, pied de studio · anti-pop : voix off, chant, à quelques centimètres du micro." },
          { t: "Champ direct et champ réverbéré", ic: "🏛️", d: "Le <b>champ direct</b> est le son qui arrive en ligne droite de la source : il perd 6 dB chaque fois que la distance double. Le <b>champ réverbéré</b> est la somme de toutes les réflexions : il est à peu près le même partout dans la salle.", c: "Comme une lampe dans une pièce blanche : près de la lampe, sa lumière domine ; loin d’elle, c’est la lumière renvoyée par les murs.", r: "Champ direct : −6 dB par doublement de distance · champ réverbéré : à peu près constant dans la salle." },
          { t: "Distance critique", ic: "📏", d: "La distance à laquelle le champ direct et le champ réverbéré ont le même niveau. Pour une source et un micro omnidirectionnels, c’est le <b>rayon de réverbération</b> r<sub>H</sub>. Un micro directif capte moins de réverbération : sa distance critique est √DF fois plus grande.", c: "Comme la limite où l’on n’entend plus mieux l’orateur que l’écho de la salle.", r: "Salle de 200 m³, T = 0,8 s : r<sub>H</sub> ≈ 0,90 m ; avec un cardioïde (√3 ≈ 1,73) : ≈ 1,56 m." },
          { t: "Filtre en peigne", ic: "🪮", d: "Quand un micro reçoit le son direct et une copie retardée (réflexion sur une table, deuxième micro sur la même source), les deux s’annulent à certaines fréquences : la courbe de réponse a des <b>creux régulièrement espacés</b>. Le son devient « creux », métallique.", c: "Comme deux vagues décalées qui s’annulent à certains endroits du bassin.", r: "Retard de 1 ms : creux à 500 Hz, 1,5 kHz, 2,5 kHz… espacés de 1 kHz." },
          { t: "Règle des 3 pour 1", ic: "3️⃣", d: "Quand plusieurs micros sont ouverts en même temps, la distance entre deux micros doit être au moins <b>3 fois</b> la distance entre chaque source et son micro. Chaque voix arrive alors au micro voisin bien plus faible (environ 9 dB en champ direct), et le filtre en peigne devient peu audible.", c: "Comme deux conversations à une table : si chacun parle près de son voisin et loin des autres, on ne se mélange pas.", r: "Source à 30 cm de son micro → micros écartés d’au moins 90 cm." }
        ],
        formules: [
          { q: "Comment le champ direct varie-t-il avec la distance ?", f: "L<sub>2</sub> = L<sub>1</sub> − 20 × log(d<sub>2</sub> / d<sub>1</sub>)", say: "le niveau à la distance d2 est égal au niveau à la distance d1 moins vingt fois le logarithme du rapport des distances", rows: [["L<sub>1</sub>", "niveau à la distance d<sub>1</sub>", "dB SPL", "connu"], ["L<sub>2</sub>", "niveau à la distance d<sub>2</sub>", "dB SPL", "ce que l’on cherche"], ["d<sub>1</sub>, d<sub>2</sub>", "distances à la source", "m", "en champ direct seulement"]], ex: "70 dB SPL à 0,5 m ; à 2 m : 70 − 20 log(4) = 70 − 12 = <b>58 dB SPL</b>. Doubler la distance : −6 dB." },
          { q: "Comment calculer le rayon de réverbération d’une salle ?", f: "r<sub>H</sub> ≈ 0,057 × √(V / T)", say: "le rayon de réverbération vaut environ 0,057 fois la racine carrée du volume divisé par le temps de réverbération", rows: [["r<sub>H</sub>", "rayon de réverbération", "m", "direct = réverbéré (omni)"], ["V", "volume de la salle", "m³", ""], ["T", "temps de réverbération", "s", "durée pour perdre 60 dB"]], ex: "Salle de classe : V = 200 m³, T = 0,8 s → r<sub>H</sub> ≈ 0,057 × √250 ≈ <b>0,90 m</b>." },
          { q: "Quelle est la distance critique d’un micro directif ?", f: "d<sub>c</sub> = √DF × r<sub>H</sub>", say: "la distance critique est égale à la racine du facteur de directivité multipliée par le rayon de réverbération", rows: [["d<sub>c</sub>", "distance critique du micro", "m", ""], ["DF", "facteur de directivité", "—", "omni 1, cardio 3, hyper 4"], ["r<sub>H</sub>", "rayon de réverbération", "m", ""]], ex: "Cardioïde (DF = 3) dans la salle de classe : d<sub>c</sub> = 1,73 × 0,90 ≈ <b>1,56 m</b>." },
          { q: "Quel est le rapport entre champ direct et champ réverbéré ?", f: "D/R = 20 × log(d<sub>c</sub> / d)", say: "le rapport direct sur réverbéré vaut vingt fois le logarithme de la distance critique divisée par la distance", rows: [["D/R", "rapport direct / réverbéré", "dB", "positif : le direct domine"], ["d<sub>c</sub>", "distance critique", "m", ""], ["d", "distance source – micro", "m", ""]], ex: "d<sub>c</sub> = 1,56 m, micro à 0,5 m : D/R = 20 log(3,12) ≈ <b>+9,9 dB</b>. À 3 m : −5,7 dB, le son devient lointain." },
          { q: "À quelles fréquences le filtre en peigne creuse-t-il la réponse ?", f: "τ = Δ / c   ·   f<sub>k</sub> = (2k + 1) / (2τ)", say: "le retard est égal à la différence de trajet divisée par la célérité ; les creux sont aux fréquences 2k plus 1 sur deux tau", rows: [["Δ", "différence de trajet", "m", "réfléchi − direct"], ["c", "célérité du son", "m/s", "343 m/s"], ["τ", "retard", "s", ""], ["f<sub>k</sub>", "fréquence du creux n° k", "Hz", "k = 0, 1, 2…"]], ex: "Δ = 34,3 cm : τ = 0,343 / 343 = 1 ms ; creux à 1/(2 × 0,001) = <b>500 Hz</b>, puis 1,5 kHz, 2,5 kHz…" }
        ]
      },

      manipuler: {
        titre: "Distance critique et filtre en peigne",
        intro: "Éloignez le micro de la source : observez à quel moment la <b>réverbération</b> prend le dessus. Puis approchez un micro d’une table et regardez la courbe se creuser."
      },

      essentiel: {
        definitions: [
          "<b>Cravate</b> : électret miniature, souvent omni, sur la poitrine à 20–25 cm de la bouche, avec un émetteur HF.",
          "<b>Canon sur perche</b> : très directif, tenu hors cadre par le perchman ; bonnette, et fourrure par vent fort.",
          "<b>Micro de surface</b> : capsule à quelques mm d’une surface ; pas de filtre en peigne, +6 dB, hémisphérique.",
          "<b>Diversité</b> : deux antennes, le récepteur garde le meilleur signal. <b>Intermodulation</b> : fréquences parasites créées par plusieurs émetteurs.",
          "<b>Distance critique</b> : distance où champ direct et champ réverbéré sont égaux.",
          "<b>Filtre en peigne</b> : creux réguliers dus à l’addition d’un son et de sa copie retardée."
        ],
        formules: [
          ["L<sub>2</sub> = L<sub>1</sub> − 20 log(d<sub>2</sub> / d<sub>1</sub>)", "−6 dB par doublement de distance"],
          ["r<sub>H</sub> ≈ 0,057 √(V / T)", "V en m³, T en s"],
          ["d<sub>c</sub> = √DF × r<sub>H</sub>", "cardio : × 1,73"],
          ["D/R = 20 log(d<sub>c</sub> / d)", "en dB"],
          ["f<sub>k</sub> = (2k + 1) / (2τ), τ = Δ / c", "creux du filtre en peigne"]
        ],
        reperes: [
          "Cravate : 20 à 25 cm de la bouche ; serre-tête : quelques centimètres.",
          "Salle de classe (200 m³, 0,8 s) : r<sub>H</sub> ≈ 0,9 m.",
          "Retard de 1 ms : premier creux à 500 Hz, creux tous les 1 kHz.",
          "Règle des 3 pour 1 : micros écartés d’au moins 3 fois la distance source – micro.",
          "Micro de surface sur une surface rigide : +6 dB."
        ],
        pieges: [
          "Un micro directif ne supprime pas la réverbération : il <b>repousse</b> la distance critique (de √DF).",
          "Le champ réverbéré ne diminue pas quand on s’éloigne : seul le champ direct baisse.",
          "Monter le gain ne rapproche pas la source : le rapport direct/réverbéré ne change qu’avec la distance ou la directivité.",
          "La bonnette mousse ne suffit pas par vent fort : il faut une fourrure.",
          "Un micro sur pied au-dessus d’une table crée un filtre en peigne : préférez un micro de surface."
        ]
      },

      evaluation: {
        lire: [
          () => {
            const dc = C([0.5, 1, 2]);
            const X = d => 50 + (Math.log10(d) + 1) / 2 * 430, Y = v => 110 - v * 4;
            let s = "";
            [0.1, 0.2, 0.5, 1, 2, 5, 10].forEach(d => { s += LIGNE(X(d), 30, X(d), 200, { c: "rgba(255,255,255,.1)" }) + TXT(X(d), 218, NB(d, 1) + " m", { s: 10, w: 500, c: "#8e8e93" }); });
            [20, 10, 0, -10, -20].forEach(v => { s += LIGNE(50, Y(v), 480, Y(v), { c: "rgba(255,255,255,.08)" }) + TXT(44, Y(v) + 4, (v > 0 ? "+" : "") + String(v).replace("-", "−"), { s: 10, w: 500, c: "#8e8e93", a: "end" }); });
            s += LIGNE(X(0.1), Y(20), X(10), Y(-20), { c: "#0a84ff", w: 2.4 });
            const lr = -20 * Math.log10(dc);
            s += LIGNE(50, Y(lr), 480, Y(lr), { c: "#ff9f0a", w: 2.4 });
            s += TXT(X(0.12), Y(20) + 18, "champ direct", { s: 11, c: "#0a84ff", a: "start" }) + TXT(470, Y(lr) - 8, "champ réverbéré", { s: 11, c: "#ff9f0a", a: "end" });
            s += TXT(50, 18, "Niveau capté (dB) selon la distance à la source", { s: 12, a: "start" });
            return { type: "nombre", contexte: "Mesure dans une salle : niveaux captés par un micro selon sa distance à la source.", figure: SVG(500, 228, s, "Graphique du champ direct décroissant et du champ réverbéré constant en fonction de la distance"), question: "Quelle est la <b>distance critique</b> du micro dans cette salle ?", reponse: dc, unite: "m", tolerance: 0.1, explication: "La distance critique est l’endroit où la droite du champ direct croise le palier du champ réverbéré : " + NB(dc, 1) + " m. Plus près, le direct domine ; plus loin, la réverbération.", indice: "Cherchez le croisement des deux courbes." };
          },
          () => {
            const f1 = C([500, 1000, 1500]), tau = 1 / (2 * f1);
            const X = f => 40 + f / 10000 * 440, Y = v => 60 - v * 5;
            let d = "";
            for (let i = 0; i <= 400; i++) { const f = i / 400 * 10000, re = 1 + 0.9 * Math.cos(2 * Math.PI * f * tau), im = -0.9 * Math.sin(2 * Math.PI * f * tau); d += (i ? "L" : "M") + X(f).toFixed(1) + " " + Y(Math.max(-22, 10 * Math.log10(re * re + im * im))).toFixed(1); }
            let s = "";
            for (let k = 0; k <= 10; k++) s += LIGNE(X(k * 1000), 25, X(k * 1000), 175, { c: "rgba(255,255,255,.1)" }) + TXT(X(k * 1000), 192, k ? NB(k, 0) + " k" : "0", { s: 10, w: 500, c: "#8e8e93" });
            [5, 0, -10, -20].forEach(v => { s += LIGNE(40, Y(v), 480, Y(v), { c: v === 0 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.08)" }) + TXT(34, Y(v) + 4, (v > 0 ? "+" : "") + String(v).replace("-", "−"), { s: 10, w: 500, c: "#8e8e93", a: "end" }); });
            s += '<path d="' + d + '" fill="none" stroke="#ffd60a" stroke-width="2"/>' + TXT(40, 16, "Réponse d’un micro posé au-dessus d’une table (dB, Hz)", { s: 12, a: "start" });
            return { type: "nombre", contexte: "Courbe de réponse mesurée sur un micro de table.", figure: SVG(500, 202, s, "Courbe de réponse en filtre en peigne, avec des creux régulièrement espacés"), question: "À quelle fréquence se trouve le <b>premier creux</b> ?", reponse: f1, unite: "Hz", tolerance: 0.08, explication: "Le premier creux est à " + NB(f1, 0) + " Hz, puis ils se répètent tous les " + NB(2 * f1, 0) + " Hz. Il correspond à un retard τ = 1 / (2 × " + f1 + ") = " + NB(tau * 1000, 2) + " ms entre le son direct et la réflexion sur la table.", indice: "Repérez le premier creux à partir de la gauche." };
          },
          { type: "qcm", contexte: "Fiche d’un micro de conférence.", figure: figFiche("Micro de conférence (type)", [["Principe", "statique, électret"], ["Directivité", "hémisphérique"], ["Montage", "capsule au ras de la plaque"], ["Alimentation", "fantôme 12 à 48 V"]]), question: "D’après cette fiche, où faut-il poser ce micro ?", bonne: "À plat sur la table, au milieu des intervenants", mauvaises: ["Sur un pied, à 30 cm au-dessus de la table", "Sur la poitrine de l’orateur principal", "Au bout d’une perche, au-dessus du cadre"], explication: "Directivité hémisphérique et capsule au ras de la plaque : c’est un micro de surface. Posé sur la table, il reçoit le direct et la réflexion en phase, sans filtre en peigne.", indice: "« Au ras de la plaque » : il est fait pour être posé." },
          { type: "qcm", contexte: "Fiche d’un micro canon et de ses accessoires.", figure: figFiche("Micro canon court (type)", [["Longueur", "25 cm"], ["Directivité", "lobe (supercardioïde)"], ["Livré avec", "bonnette mousse"], ["Accessoire conseillé", "suspension + fourrure"]]), question: "Tournage en extérieur par <b>vent fort</b> : que faut-il ajouter au micro ?", bonne: "Une suspension et une protection anti-vent à fourrure", mauvaises: ["Rien, la bonnette mousse suffit", "Un filtre anti-pop devant la capsule", "Un atténuateur de −20 dB"], explication: "La mousse ne suffit qu’au vent léger. Par vent fort, on utilise une protection à fourrure ; la suspension évite que les vibrations de la perche n’arrivent au micro.", indice: "La fiche donne l’accessoire conseillé." }
        ],
        comprendre: [
          ["Quand on double la distance entre la source et le micro, le champ direct baisse de 6 dB.", true, "Le champ direct suit la loi en 1/d : 20 log(2) ≈ 6 dB par doublement."],
          ["Le champ réverbéré baisse lui aussi de 6 dB par doublement de distance.", false, "Le champ réverbéré est à peu près le même partout dans la salle : c’est pour cela qu’il finit par dominer quand on s’éloigne.", "Il vient de toutes les réflexions."],
          ["Un micro cardioïde a une distance critique environ 1,7 fois plus grande qu’un omni dans la même salle.", true, "d<sub>c</sub> = √DF × r<sub>H</sub> avec DF = 3 : √3 ≈ 1,73."],
          ["Un micro de surface posé sur une table crée un fort filtre en peigne.", false, "C’est l’inverse : la capsule étant à quelques millimètres de la table, le direct et le réfléchi arrivent en phase. Pas de creux, et +6 dB."],
          ["La réception en diversité utilise deux antennes et garde le meilleur signal.", true, "Quand une antenne tombe dans un trou de réception, l’autre prend le relais : on évite les coupures."],
          ["Deux émetteurs HF peuvent fonctionner sur la même fréquence s’ils sont éloignés de quelques mètres.", false, "Une fréquence = un émetteur. Deux émetteurs sur la même fréquence se brouillent dans le récepteur."],
          ["Les micros cravates sont le plus souvent omnidirectionnels.", true, "Omni, le cravate garde le même son quand la tête tourne, et il ne craint ni l’effet de proximité ni les variations d’orientation sur la poitrine."],
          ["Monter le gain du préampli améliore le rapport entre champ direct et champ réverbéré.", false, "Le gain amplifie tout, direct et réverbération. Seules la distance et la directivité changent ce rapport.", "Que change le gain, que ne change-t-il pas ?"],
          ["La bonnette mousse protège efficacement d’un vent fort en extérieur.", false, "La mousse suffit au vent léger et aux postillons. Par vent fort, il faut une protection à fourrure."],
          ["Un filtre anti-pop sert à arrêter les jets d’air des consonnes « p » et « b ».", true, "Ces consonnes explosives projettent de l’air sur la membrane et créent des « pops » dans le grave."],
          ["Avec la règle des 3 pour 1, un micro placé à 30 cm de sa source doit être à au moins 90 cm du micro voisin.", true, "3 × 30 cm = 90 cm : la voix arrive alors bien plus faible au micro voisin (≈ 9 dB de moins en champ direct)."]
        ],
        qcm: [
          ["Interview de rue par vent fort, pour un journaliste qui tend son micro : quel choix ?", "Micro main omni de reportage, avec protection anti-vent", ["Micro statique grande membrane sur pied", "Micro canon nu, sans bonnette", "Micro de surface posé sur le trottoir"], "L’omni de reportage est peu sensible au vent et aux manipulations, et n’a pas d’effet de proximité ; une protection anti-vent reste indispensable.", "Il faut un micro robuste, tenu à la main."],
          ["Fiction en intérieur, comédiens en mouvement, micro invisible à l’image : quel dispositif ?", "Perche hors cadre, doublée de cravates HF", ["Un micro main tenu par chaque comédien", "Un micro de surface au milieu du décor", "Un micro grande membrane sur pied dans le champ"], "La perche capte de près, juste hors cadre ; les cravates HF assurent les plans où la perche ne peut pas approcher.", "Rien ne doit apparaître à l’image."],
          ["Pourquoi le son d’un micro de surface n’a-t-il pas de filtre en peigne ?", "Le direct et la réflexion sur la surface arrivent en phase", ["Sa capsule est plus sensible que les autres", "Il coupe toutes les fréquences aiguës", "Il ne capte que les vibrations de la table"], "À quelques millimètres de la surface, le retard de la réflexion est minuscule : les premières annulations sont au-delà de l’audible."],
          ["À quoi sert la suspension élastique sur une perche ?", "À isoler le micro des vibrations de la perche", ["À protéger le micro du vent fort", "À arrêter les consonnes explosives", "À orienter le micro vers la source"], "Les bruits de manipulation se propagent dans la perche ; les élastiques les empêchent d’atteindre le micro. Le vent, c’est le rôle de la fourrure."],
          ["Qu’est-ce que l’intermodulation dans un ensemble de liaisons HF ?", "Des fréquences parasites nées du mélange de plusieurs émetteurs", ["La coupure du son quand l’émetteur s’éloigne", "Le retard du son dans un système numérique", "Le passage automatique d’une antenne à l’autre"], "Plusieurs fréquences mélangées dans l’électronique créent des produits comme 2f₁ − f₂ : on évite d’y placer un canal.", "Plusieurs émetteurs ensemble…"],
          ["Dans une salle, un micro omni a un rayon de réverbération de 1 m. Quelle est la distance critique d’un hypercardioïde (DF = 4) ?", "2 m", ["4 m", "1 m", "0,5 m"], "d<sub>c</sub> = √DF × r<sub>H</sub> = √4 × 1 = 2 m. Attention : on multiplie par la racine de DF, pas par DF."],
          ["Un micro est posé sur pied à 25 cm au-dessus d’une table de débat. Quel défaut risque-t-on ?", "Un filtre en peigne qui rend la voix creuse", ["Une saturation du micro", "Un effet de proximité très marqué", "Une coupure de la liaison HF"], "La réflexion sur la table arrive avec un retard de l’ordre de la milliseconde : creux réguliers dans la réponse. Solution : un micro de surface.", "Pensez au son réfléchi par la table."],
          ["Pourquoi un serre-tête donne-t-il un bon rapport voix / ambiance ?", "Sa capsule est à quelques centimètres de la bouche", ["Il est toujours plus directif qu’un canon", "Il coupe les fréquences de l’ambiance", "Il est relié par une liaison HF"], "Très près de la bouche, le champ direct de la voix domine largement le bruit ambiant et la réverbération."]
        ],
        calculer: [
          () => { const V = C([60, 120, 200, 400, 800, 1500, 3000]), T = C([0.4, 0.6, 0.8, 1, 1.2, 1.5, 2]), r = MICRO.rayonReverberation(V, T); return { type: "nombre", question: "Une salle de <b>" + NB(V, 0) + " m³</b> a un temps de réverbération de <b>" + NB(T, 1) + " s</b>. Calculez son rayon de réverbération.", reponse: r, unite: "m", explication: "r<sub>H</sub> ≈ 0,057 × √(" + NB(V, 0) + " / " + NB(T, 1) + ") = 0,057 × √" + NB(V / T, 0) + " = " + NB(r, 2) + " m.", indice: "r<sub>H</sub> ≈ 0,057 × √(V / T)." }; },
          () => { const rH = C([0.6, 0.8, 0.9, 1.2, 1.5, 2]), D = C(DIRECTIVITES.filter(x => x.id !== "omni")), df = MICRO.df(D.A), dc = Math.sqrt(df) * rH; return { type: "nombre", question: "Le rayon de réverbération d’une salle vaut <b>" + NB(rH, 1) + " m</b>. Quelle est la distance critique d’un micro <b>" + D.nom.toLowerCase() + "</b> (DF = " + NB(df, 2) + ") ?", reponse: dc, unite: "m", explication: "d<sub>c</sub> = √DF × r<sub>H</sub> = √" + NB(df, 2) + " × " + NB(rH, 1) + " = " + NB(Math.sqrt(df), 2) + " × " + NB(rH, 1) + " = " + NB(dc, 2) + " m.", indice: "On multiplie par la racine carrée de DF." }; },
          () => { const dc = C([1, 1.2, 1.5, 2, 2.5]), d = C([0.3, 0.5, 0.8, 1, 3, 4]), dr = 20 * Math.log10(dc / d); return { type: "nombre", question: "Un micro a une distance critique de <b>" + NB(dc, 1) + " m</b> ; il est placé à <b>" + NB(d, 1) + " m</b> de la source. Calculez le rapport direct / réverbéré (en dB, avec son signe).", reponse: dr, unite: "dB", ecart: 0.3, explication: "D/R = 20 × log(" + NB(dc, 1) + " / " + NB(d, 1) + ") = " + NB(dr, 1).replace("-", "−") + " dB. " + (dr > 0 ? "Positif : le champ direct domine." : "Négatif : la réverbération domine."), indice: "D/R = 20 log(d<sub>c</sub> / d)." }; },
          () => { const D = C([10, 17.15, 20, 25, 34.3, 50]), tau = D / 100 / MICRO.c, f1 = 1 / (2 * tau); return { type: "nombre", question: "La réflexion sur une table parcourt <b>" + NB(D, 1) + " cm</b> de plus que le son direct. À quelle fréquence se trouve le premier creux du filtre en peigne ?", reponse: f1, unite: "Hz", explication: "τ = Δ / c = " + NB(D / 100, 4) + " / 343 = " + NB(tau * 1000, 3) + " ms. f<sub>0</sub> = 1 / (2τ) = " + NB(f1, 0) + " Hz.", indice: "τ = Δ / c, puis f = 1 / (2τ)." }; },
          () => { const tau = C([0.5, 1, 2, 2.5]), k = H(1, 3), f = (2 * k + 1) / (2 * tau / 1000); return { type: "nombre", question: "Un micro reçoit le son direct et une réflexion retardée de <b>" + NB(tau, 1) + " ms</b>. Quelle est la fréquence du creux n° " + (k + 1) + " (k = " + k + ") ?", reponse: f, unite: "Hz", explication: "f<sub>k</sub> = (2k + 1) / (2τ) = " + (2 * k + 1) + " / (2 × " + NB(tau / 1000, 4) + ") = " + NB(f, 0) + " Hz.", indice: "f<sub>k</sub> = (2k + 1) / (2τ), τ en secondes." }; },
          () => { const L1 = H(60, 80), d1 = C([0.25, 0.5, 1]), m = C([2, 3, 4, 8]), d2 = d1 * m, L2 = L1 - 20 * Math.log10(m); return { type: "nombre", question: "En champ direct, une voix produit <b>" + L1 + " dB SPL</b> à " + NB(d1, 2) + " m. Quel niveau produit-elle à <b>" + NB(d2, 2) + " m</b> ?", reponse: L2, unite: "dB SPL", ecart: 0.3, explication: "L<sub>2</sub> = " + L1 + " − 20 × log(" + NB(d2, 2) + " / " + NB(d1, 2) + ") = " + L1 + " − " + NB(20 * Math.log10(m), 1) + " = " + NB(L2, 1) + " dB SPL.", indice: "−6 dB chaque fois que la distance double." }; },
          () => { const d = C([15, 20, 25, 30, 40, 50]); return { type: "nombre", question: "Autour d’une table, chaque intervenant parle à <b>" + d + " cm</b> de son micro. D’après la règle des 3 pour 1, quelle distance minimale faut-il entre deux micros ?", reponse: 3 * d, unite: "cm", ecart: 0, explication: "3 × " + d + " = " + 3 * d + " cm au moins entre deux micros.", indice: "Trois fois la distance source – micro." }; }
        ],
        exercice: [
          () => {
            const V = C([150, 200, 300, 500]), T = C([0.6, 0.8, 1, 1.2]), d = C([0.5, 0.8, 2.5, 3]), rH = MICRO.rayonReverberation(V, T), dc = Math.sqrt(3) * rH, dr = 20 * Math.log10(dc / d);
            return { type: "exercice", question: "Vous enregistrez une conférence dans une salle de <b>" + V + " m³</b> (T = <b>" + NB(T, 1) + " s</b>) avec un micro <b>cardioïde</b> (DF = 3) placé à <b>" + NB(d, 1) + " m</b> de l’orateur.", etapes: [
              { question: "a) Rayon de réverbération de la salle ?", reponse: rH, unite: "m" },
              { question: "b) Distance critique du micro cardioïde ?", reponse: dc, unite: "m" },
              { question: "c) Rapport direct / réverbéré à " + NB(d, 1) + " m ?", reponse: dr, unite: "dB", ecart: 0.4 },
              { question: "d) Quel champ domine dans la prise de son ?", bonne: dr > 0 ? "Le champ direct : la voix sera nette" : "Le champ réverbéré : la voix sera lointaine", mauvaises: [dr > 0 ? "Le champ réverbéré : la voix sera lointaine" : "Le champ direct : la voix sera nette", "Aucun : ils sont toujours égaux"] }
            ], solution: "a) 0,057 × √(" + V + " / " + NB(T, 1) + ") = " + NB(rH, 2) + " m. b) 1,73 × " + NB(rH, 2) + " = " + NB(dc, 2) + " m. c) 20 log(" + NB(dc, 2) + " / " + NB(d, 1) + ") = " + NB(dr, 1).replace("-", "−") + " dB. d) " + (dr > 0 ? "Positif : le direct domine." : "Négatif : la réverbération domine ; il faut rapprocher le micro ou en prendre un plus directif."), indice: "Commencez par r<sub>H</sub> ≈ 0,057 √(V / T)." };
          },
          () => {
            const D = C([17.15, 25, 34.3]), tau = D / 100 / MICRO.c, f0 = 1 / (2 * tau);
            return { type: "exercice", question: "Un micro sur pied est placé au-dessus d’une table de débat. La réflexion sur la table parcourt <b>" + NB(D, 1) + " cm</b> de plus que le son direct.", etapes: [
              { question: "a) Retard de la réflexion (en ms) ?", reponse: tau * 1000, unite: "ms" },
              { question: "b) Fréquence du premier creux ?", reponse: f0, unite: "Hz" },
              { question: "c) Fréquence du deuxième creux ?", reponse: 3 * f0, unite: "Hz" },
              { question: "d) Quelle solution supprime ce défaut ?", bonne: "Remplacer le micro par un micro de surface posé sur la table", mauvaises: ["Monter le gain du préampli", "Ajouter une fourrure anti-vent"] }
            ], solution: "a) τ = " + NB(D / 100, 4) + " / 343 = " + NB(tau * 1000, 3) + " ms. b) 1 / (2τ) = " + NB(f0, 0) + " Hz. c) 3 / (2τ) = " + NB(3 * f0, 0) + " Hz. d) Au ras de la table, le direct et le réfléchi arrivent en phase : plus de creux (et +6 dB).", indice: "Les creux sont à f, 3f, 5f…" };
          }
        ]
      }
    },

    (function () {
      /* ---- Schémas propres au module 7 ---------------------------------------- */
      // Liaison symétrique ou asymétrique : micro → câble → entrée, avec un parasite
      function figLiaison(sym) {
        let s = TXT(260, 22, sym ? "Liaison symétrique" : "Liaison asymétrique", { s: 14 });
        s += '<rect x="20" y="70" width="70" height="80" rx="10" fill="#1c1c1e" stroke="rgba(255,255,255,.3)"/>' + TXT(55, 115, "Micro", { s: 12 });
        s += '<rect x="430" y="70" width="70" height="80" rx="10" fill="#1c1c1e" stroke="rgba(255,255,255,.3)"/>' + TXT(465, 108, sym ? "Entrée" : "Entrée", { s: 12 }) + TXT(465, 124, sym ? "différentielle" : "simple", { s: 10, w: 500, c: "#8e8e93" });
        s += '<rect x="90" y="' + (sym ? 78 : 88) + '" width="340" height="' + (sym ? 64 : 44) + '" rx="8" fill="none" stroke="#8e8e93" stroke-dasharray="4 3"/>';
        if (sym) {
          let p1 = "M90 100", p2 = "M90 120";
          for (let x = 90; x <= 430; x += 2) { const y = 110 + 10 * Math.cos((x - 90) / 340 * Math.PI * 12); p1 += " L" + x + " " + y.toFixed(1); p2 += " L" + x + " " + (220 - y).toFixed(1); }
          s += '<path d="' + p1 + '" fill="none" stroke="#ff375f" stroke-width="2.4"/><path d="' + p2 + '" fill="none" stroke="#0a84ff" stroke-width="2.4"/>';
          s += TXT(260, 166, "blindage = masse (broche 1)", { s: 11, w: 500, c: "#8e8e93" }) + TXT(108, 66, "+ chaud (2)", { s: 11, c: "#ff375f", a: "start" }) + TXT(412, 66, "− froid (3)", { s: 11, c: "#0a84ff", a: "end" });
        } else {
          s += LIGNE(90, 110, 430, 110, { c: "#ff375f", w: 2.4 }) + TXT(260, 102, "signal (pointe)", { s: 11, c: "#ff375f" }) + TXT(260, 150, "blindage = retour du signal (corps)", { s: 11, w: 500, c: "#8e8e93" });
        }
        s += '<path d="M220 200 q20 -14 40 0 t40 0" fill="none" stroke="#ffd60a" stroke-width="2"/>' + TXT(260, 222, "parasite induit", { s: 11, c: "#ffd60a" });
        return SVG(520, 236, s, sym ? "Schéma d’une liaison symétrique : deux conducteurs torsadés, chaud et froid, sous un blindage relié à la masse" : "Schéma d’une liaison asymétrique : un conducteur de signal et le blindage qui sert de retour");
      }
      // Brochage XLR et jack TRS
      function figBrochage() {
        let s = TXT(130, 22, "XLR (vue schématique)", { s: 13 }) + TXT(390, 22, "Jack 6,35 mm TRS", { s: 13 });
        s += '<circle cx="130" cy="105" r="62" fill="#1c1c1e" stroke="rgba(255,255,255,.35)" stroke-width="2"/>';
        [[1, 100, 88, "#8e8e93"], [2, 160, 88, "#ff375f"], [3, 130, 140, "#0a84ff"]].forEach(p => { s += '<circle cx="' + p[1] + '" cy="' + p[2] + '" r="11" fill="' + p[3] + '"/>' + TXT(p[1], p[2] + 4, p[0], { s: 12, c: "#000" }); });
        s += TXT(130, 192, "1 masse · 2 chaud (+) · 3 froid (−)", { s: 11, w: 500 });
        s += '<rect x="290" y="88" width="120" height="30" rx="4" fill="#8e8e93"/><rect x="410" y="91" width="34" height="24" rx="3" fill="#0a84ff"/><rect x="444" y="91" width="10" height="24" fill="#000"/><path d="M454 91 h18 l14 12 l-14 12 h-18 z" fill="#ff375f"/>';
        s += TXT(350, 140, "corps (sleeve)", { s: 11, w: 500, c: "#8e8e93" }) + TXT(427, 140, "bague", { s: 11, c: "#0a84ff" }) + TXT(472, 140, "pointe", { s: 11, c: "#ff375f" });
        s += TXT(390, 162, "masse · froid (−) · chaud (+)", { s: 11, w: 500 });
        s += TXT(260, 214, "Fiez-vous aux numéros gravés sur le connecteur.", { s: 10, w: 500, c: "#8e8e93" });
        return SVG(520, 226, s, "Brochage XLR : broche 1 masse, 2 point chaud, 3 point froid. Jack TRS : pointe chaud, bague froid, corps masse");
      }
      // Alimentation fantôme
      function figFantome() {
        let s = TXT(260, 20, "Alimentation fantôme P48", { s: 14 });
        s += '<rect x="20" y="40" width="90" height="140" rx="10" fill="#1c1c1e" stroke="rgba(255,255,255,.3)"/>' + TXT(65, 116, "Micro", { s: 12 });
        s += '<rect x="380" y="40" width="120" height="140" rx="10" fill="#1c1c1e" stroke="rgba(255,255,255,.3)"/>' + TXT(440, 172, "Console", { s: 12 });
        s += LIGNE(110, 70, 330, 70, { c: "#ff375f", w: 2 }) + LIGNE(110, 110, 330, 110, { c: "#0a84ff", w: 2 }) + LIGNE(110, 150, 470, 150, { c: "#8e8e93", w: 2 });
        s += TXT(150, 64, "2", { s: 11, c: "#ff375f" }) + TXT(150, 104, "3", { s: 11, c: "#0a84ff" }) + TXT(150, 144, "1", { s: 11, c: "#8e8e93" });
        s += '<rect x="330" y="62" width="40" height="16" rx="3" fill="none" stroke="#ffd60a"/><rect x="330" y="102" width="40" height="16" rx="3" fill="none" stroke="#ffd60a"/>' + TXT(350, 96, "6,8 kΩ", { s: 10, c: "#ffd60a" }) + TXT(350, 136, "6,8 kΩ", { s: 10, c: "#ffd60a" });
        s += '<path d="M370 70 H420 V110 M370 110 H420" fill="none" stroke="#ffd60a" stroke-width="2"/>' + LIGNE(420, 90, 440, 90, { c: "#ffd60a", w: 2 }) + TXT(452, 94, "+48 V", { s: 11, c: "#ffd60a", a: "start" });
        s += TXT(240, 200, "Même tension sur 2 et 3 : invisible pour le signal (mode commun).", { s: 11, w: 500, c: "#8e8e93" });
        return SVG(520, 214, s, "Alimentation fantôme : le +48 V arrive sur les broches 2 et 3 à travers deux résistances de 6,8 kΩ, le retour se fait par la broche 1");
      }

      return {
        titre: "Liaisons et alimentations",
        nav: "Liaisons",
        resume: "Symétrique, XLR, fantôme",
        intro: "Le signal d’un micro est <b>minuscule</b> : quelques millivolts, parfois moins. Il doit traverser des dizaines de mètres de câble au milieu des parasites d’un plateau. Ce module explique la <b>liaison symétrique</b>, le brochage XLR, l’<b>alimentation fantôme</b> et ses cousines, les niveaux micro et ligne, et le micro numérique et ses modes <b>synchrone</b> et <b>asynchrone</b>.",

        notions: {
          titre: "Transporter un signal fragile",
          intro: "Un câble se comporte comme une antenne : il capte les champs des câbles secteur, des transformateurs, des gradateurs. Tout l’art est de rendre ce parasite <b>identique</b> sur deux conducteurs, pour pouvoir le retirer à l’arrivée.",
          mots: [
            { t: "Liaison asymétrique", ic: "➖", q: "Qu’est-ce qu’une liaison asymétrique ?", d: "Un seul conducteur porte le signal ; le blindage sert à la fois de protection et de <b>retour</b> (masse). Un parasite induit sur le conducteur s’ajoute au signal : à l’arrivée, on ne peut plus l’en séparer." + figLiaison(false), c: "Comme une conversation dans la rue : le bruit de la circulation se mélange à la voix, impossible de le retirer après coup.", r: "Jack TS 6,35 mm, RCA (cinch), mini-jack 3,5 mm · quelques mètres au plus · instruments, matériel grand public." },
            { t: "Liaison symétrique", ic: "⚖️", q: "Qu’est-ce qu’une liaison symétrique ?", d: "Deux conducteurs, le <b>point chaud</b> (+) et le point froid (−), en paire torsadée sous un blindage relié à la masse. L’entrée amplifie la <b>différence</b> U<sub>chaud</sub> − U<sub>froid</sub>. Un parasite induit de la même façon sur les deux conducteurs disparaît à la soustraction." + figLiaison(true), c: "Deux personnes pèsent un objet sur la même balance, l’une avec un sac à dos, l’autre aussi : la différence de leurs poids ne dépend pas des sacs.", r: "XLR 3 broches, jack TRS 6,35 mm · plus de 100 m sans souci · tout le matériel professionnel." },
            { t: "Mode commun et mode différentiel", ic: "🔀", q: "Que veulent dire « mode commun » et « mode différentiel » ?", d: "Le <b>mode différentiel</b>, c’est ce qui diffère entre les deux conducteurs : le signal utile. Le mode commun, c’est ce qui est identique sur les deux : les parasites induits, et aussi la tension d’alimentation fantôme. Une entrée symétrique amplifie le premier et rejette le second.", c: "Deux bateaux sur la même vague montent ensemble (mode commun) ; seul l’écart entre eux (mode différentiel) intéresse le pilote.", r: "Souvent, la sortie envoie +s/2 sur le chaud et −s/2 sur le froid : la différence vaut s." },
            { t: "Taux de réjection de mode commun", s: "TRMC", u: "dB", ic: "🛡️", q: "Qu’est-ce que le taux de réjection de mode commun (TRMC) ?", d: "Ce qu’une entrée symétrique retire du parasite de mode commun, en décibels. Avec un TRMC de 70 dB, un parasite de −40 dBu sur les deux conducteurs n’en laisse que −110 dBu en sortie. En anglais : <i>CMRR</i>.", c: "Un filtre à café : plus il est fin, moins il laisse passer de marc.", r: "Bonne entrée micro : ≈ 60 à 80 dB · il baisse si les deux conducteurs ne sont plus parfaitement équilibrés." },
            { t: "Paire torsadée et blindage", ic: "🧶", q: "À quoi servent la torsade et le blindage ?", d: "Le <b>blindage</b> (tresse ou feuillard relié à la masse) arrête une grande partie des champs électriques. La <b>torsade</b> des deux conducteurs forme une suite de petites boucles retournées : la tension induite par un champ magnétique change de signe d’une boucle à l’autre et s’annule.", c: "Un cordon de téléphone torsadé : chaque spire compense la précédente.", r: "Les champs magnétiques des transformateurs et des câbles secteur traversent le blindage : c’est la torsade et la symétrie qui les éliminent." },
            { t: "Ce qui rend une liaison symétrique", ic: "🎯", q: "Une liaison est-elle symétrique parce que le signal est inversé sur le point froid ?", d: "Non. Ce qui compte, c’est que les deux conducteurs aient la <b>même impédance</b> par rapport à la masse : ils captent alors exactement le même parasite. Certaines sorties ne mettent le signal que sur le point chaud et gardent le point froid à la même impédance (« symétrie d’impédance ») : la réjection fonctionne quand même.", c: "Deux antennes identiques captent la même radio, qu’on leur fasse ou non chanter quelque chose.", r: "Une seule différence d’impédance entre chaud et froid suffit à dégrader le TRMC." },
            { t: "Connecteur XLR", ic: "🔌", q: "Comment est câblé un connecteur XLR ?", d: "Trois broches normalisées (IEC 60268-12) : <b>1 = masse</b> (blindage), 2 = point chaud (+), 3 = point froid (−). Les sorties sont sur des fiches mâles, les entrées sur des fiches femelles : le micro porte une embase mâle, le câble a une femelle côté micro et un mâle côté console." + figBrochage(), c: "Comme l’eau qui sort d’un robinet (mâle) pour entrer dans un tuyau (femelle) : le signal va du mâle vers la femelle.", r: "Jack TRS symétrique : pointe = chaud, bague = froid, corps = masse." },
            { t: "Alimentation fantôme", s: "P48", u: "V", ic: "⚡", q: "Comment fonctionne l’alimentation fantôme ?", d: "La console applique <b>+48 V</b> sur les broches 2 et 3, à travers deux résistances égales de 6,8 kΩ (6,81 kΩ, appairées) ; le courant revient par la broche 1 (IEC 61938). La tension est la même sur les deux conducteurs : c’est du mode commun, invisible pour le signal. Elle alimente l’électronique et la polarisation des micros statiques." + figFantome(), c: "Un passager clandestin : il voyage dans le même câble que le signal sans que celui-ci s’en aperçoive.", r: "48 V ± 4 V · courant maximal ≈ 10 mA · variantes P24 (24 V, 1,2 kΩ) et P12 (12 V, 680 Ω)." },
            { t: "Fantôme et micro dynamique", ic: "🎙️", q: "L’alimentation fantôme abîme-t-elle un micro dynamique ?", d: "Non, si le micro est câblé en symétrique avec une bobine <b>flottante</b> (reliée seulement aux broches 2 et 3) : les deux extrémités de la bobine sont à la même tension, aucun courant ne la traverse. Pour un micro à ruban passif, un câble défectueux ou un branchement à chaud crée un déséquilibre : l’impulsion peut endommager le ruban.", c: "Deux réservoirs au même niveau reliés par un tuyau : l’eau ne coule pas.", r: "Bonne pratique : couper le fantôme avant de brancher ou débrancher, toujours pour un ruban passif." },
            { t: "Alimentation T12 (A-B)", u: "V", ic: "🎞️", q: "Qu’est-ce que l’alimentation T12 ?", d: "Une ancienne alimentation du cinéma (DIN 45595, dite « A-B ») : 12 V appliqués <b>entre</b> les broches 2 et 3, à travers deux résistances de 180 Ω. C’est une tension différentielle : elle traverserait la bobine d’un micro dynamique ou le transformateur d’un ruban. Elle est incompatible avec les micros fantôme.", c: "Le fantôme élève les deux fils ensemble ; le T12 tire l’un contre l’autre.", r: "On la rencontre encore sur d’anciens enregistreurs et micros de tournage : vérifiez la mention T ou P sur le micro." },
            { t: "Plug-in power", ic: "🔋", q: "Qu’est-ce que le « plug-in power » ?", d: "Une petite tension continue, souvent <b>3 à 5 V</b>, présente sur la prise mini-jack 3,5 mm des enregistreurs, caméras et appareils photo grand public. Elle alimente le transistor des micros électret. Ce n’est <b>pas</b> l’alimentation fantôme.", c: "Une pile intégrée au câble, réservée aux petits micros.", r: "Un micro statique à polarisation externe ne fonctionne pas avec le plug-in power : il lui faut du fantôme." },
            { t: "Niveau micro et niveau ligne", u: "dBu, dBV", ic: "📶", q: "Quelle différence entre niveau micro et niveau ligne ?", d: "Le <b>niveau micro</b> va d’environ −70 à −20 dBu selon le micro et la source : il faut un préamplificateur. Le niveau ligne professionnel est de <b>+4 dBu</b> (1,228 V) ; le niveau ligne grand public de −10 dBV (0,316 V). Le dBu se réfère à 0,775 V, le dBV à 1 V.", c: "Un chuchotement et une voix normale : il faut amplifier le premier pour l’entendre à côté du second.", r: "+4 dBu et −10 dBV : écart ≈ 11,8 dB · 0 dBV = +2,2 dBu · micro dynamique sur une voix : ≈ −60 dBu." },
            { t: "Boucle de masse", ic: "🔁", q: "Qu’est-ce qu’une boucle de masse ?", d: "Deux appareils reliés à la terre par leur prise secteur et aussi entre eux par le blindage d’un câble : il existe deux chemins vers la terre. Un courant circule dans la boucle et produit un <b>ronflement</b> à 50 Hz et ses harmoniques, surtout en asymétrique.", c: "Deux chemins pour la même rivière : l’eau tourne en rond entre eux.", r: "Remèdes : liaison symétrique, levée de masse (<i>ground lift</i>) sur l’appareil, transformateur d’isolement. Jamais en retirant la terre de sécurité." },
            { t: "Micro numérique AES42", ic: "💾", q: "Qu’est-ce qu’un micro numérique AES42, synchrone ou asynchrone ?", d: "Le convertisseur analogique-numérique est <b>dans le micro</b> : il sort un signal numérique AES3 sur une XLR. Il est alimenté par un « fantôme numérique » de 10 V, dont la modulation transporte aussi les commandes vers le micro. En <b>mode 1 (asynchrone)</b>, le micro fonctionne sur sa propre horloge : l’interface doit convertir la fréquence d’échantillonnage. En <b>mode 2 (synchrone)</b>, l’interface asservit l’horloge du micro sur l’horloge de référence du studio : aucune conversion.", c: "Asynchrone : un musicien qui joue à son tempo, qu’on recale après. Synchrone : il suit la baguette du chef.", r: "Fantôme numérique : 10 V · mode 1 asynchrone, mode 2 synchrone." }
          ],
          formules: [
            { q: "Quelle tension arrive aux bornes d’un micro alimenté en fantôme ?", f: "U<sub>micro</sub> = U<sub>0</sub> − I × R / 2", say: "U micro est égal à U zéro moins I fois R sur deux", rows: [["U<sub>micro</sub>", "tension aux bornes du micro", "V", "ce dont dispose son électronique"], ["U<sub>0</sub>", "tension de l’alimentation", "V", "48 V en P48"], ["I", "courant consommé par le micro", "A (mA)", "lu sur sa fiche technique"], ["R", "résistance d’alimentation de chaque conducteur", "Ω (kΩ)", "6,8 kΩ en P48 ; les deux sont en parallèle, d’où R / 2"]], ex: "P48, micro qui consomme 7 mA : U = 48 − 0,007 × 3 400 = 48 − 23,8 ≈ <b>24,2 V</b>." },
            { q: "Comment passer d’une tension aux dBu et aux dBV ?", f: "L<sub>dBu</sub> = 20 log(U / 0,775)  ·  L<sub>dBV</sub> = 20 log(U / 1)", say: "le niveau en dBu est égal à vingt fois le logarithme de U sur zéro virgule sept cent soixante-quinze volt", rows: [["L<sub>dBu</sub>", "niveau en dBu", "dBu", "référence 0,775 V"], ["L<sub>dBV</sub>", "niveau en dBV", "dBV", "référence 1 V"], ["U", "tension efficace", "V", "la tension mesurée"]], ex: "U = 1,228 V : 20 log(1,228 / 0,775) = 20 log(1,585) ≈ <b>+4 dBu</b>. Pour passer des dBV aux dBu, on ajoute 2,2 dB." },
            { q: "Que reste-t-il d’un parasite après une entrée symétrique ?", f: "P<sub>sortie</sub> = P<sub>induit</sub> − TRMC", say: "le parasite en sortie est égal au parasite induit moins le taux de réjection de mode commun", rows: [["P<sub>sortie</sub>", "parasite restant", "dBu", "ce qu’on entendra"], ["P<sub>induit</sub>", "parasite capté par le câble (mode commun)", "dBu", "identique sur chaud et froid"], ["TRMC", "taux de réjection de mode commun", "dB", "qualité de l’entrée"]], ex: "Parasite de −40 dBu, TRMC de 70 dB : −40 − 70 = <b>−110 dBu</b>. Avec un signal de −50 dBu, le rapport signal / parasite vaut 60 dB." }
          ]
        },

        manipuler: {
          titre: "Rejeter les parasites, alimenter le micro",
          intro: "Trois labos. Dans le premier, faites passer un câble près d’un transformateur : en <b>symétrique</b>, le parasite disparaît à la soustraction. Dans le deuxième, choisissez une alimentation et un micro, et lisez les tensions sur chaque broche. Le troisième place les niveaux micro et ligne sur une même échelle."
        },

        essentiel: {
          definitions: [
            "<b>Asymétrique</b> : un conducteur + le blindage comme retour ; le parasite s’ajoute au signal.",
            "<b>Symétrique</b> : chaud (+) et froid (−) en paire torsadée sous blindage ; l’entrée garde la différence, le parasite de mode commun disparaît.",
            "<b>XLR</b> : 1 masse, 2 chaud, 3 froid ; sortie sur mâle, entrée sur femelle.",
            "<b>Fantôme P48</b> : +48 V sur 2 et 3 par deux 6,8 kΩ, retour par 1 ; mode commun, sans effet sur le signal.",
            "<b>T12</b> : 12 V entre 2 et 3 (différentiel) ; <b>plug-in power</b> : 3 à 5 V sur mini-jack pour électret.",
            "<b>AES42</b> : micro numérique ; mode 1 asynchrone (horloge propre, conversion), mode 2 synchrone (horloge asservie)."
          ],
          formules: [
            ["U<sub>micro</sub> = 48 − I × 3,4 kΩ", "tension au micro en P48 (I en mA → résultat en V)"],
            ["L<sub>dBu</sub> = 20 log(U / 0,775)", "et L<sub>dBV</sub> = 20 log U ; dBu = dBV + 2,2"],
            ["P<sub>sortie</sub> = P<sub>induit</sub> − TRMC", "parasite restant après une entrée symétrique"]
          ],
          reperes: [
            "Niveau micro ≈ −70 à −20 dBu ; ligne pro +4 dBu (1,228 V) ; grand public −10 dBV (0,316 V) ; écart ≈ 11,8 dB.",
            "P48 : 48 V ± 4 V, 10 mA au plus ; P24 : 1,2 kΩ ; P12 : 680 Ω.",
            "TRMC d’une bonne entrée : 60 à 80 dB.",
            "Asymétrique : quelques mètres ; symétrique : plus de 100 m."
          ],
          pieges: [
            "Le fantôme n’est <b>pas</b> dangereux pour un micro dynamique symétrique : aucun courant ne traverse la bobine.",
            "Le T12 l’est : sa tension est entre 2 et 3, elle traverse la bobine.",
            "Le plug-in power n’est pas du fantôme : un micro statique à polarisation externe ne fonctionne pas avec.",
            "Ce n’est pas l’inversion du signal qui fait la symétrie, mais l’égalité des impédances des deux conducteurs.",
            "La broche 1 est la masse, pas le point chaud."
          ]
        },

        evaluation: {
          lire: [
            { type: "qcm", figure: figBrochage(), question: "D’après le schéma, quelle broche de l’XLR porte le point froid (−) ?", bonne: "La broche 3", mauvaises: ["La broche 1", "La broche 2", "Le corps du connecteur"], explication: "Norme IEC 60268-12 : 1 = masse, 2 = point chaud, 3 = point froid.", indice: "Le froid est dessiné en bleu." },
            { type: "nombre", contexte: figFiche("Micro statique cardioïde", [["Alimentation", "Fantôme P48, 48 V ± 4 V"], ["Consommation", "4,5 mA"], ["Impédance", "150 Ω"], ["Connecteur", "XLR 3 broches mâle"]]), question: "Quel courant ce micro consomme-t-il sur l’alimentation fantôme ?", reponse: 4.5, unite: "mA", ecart: 0.05, explication: "On lit la ligne « Consommation » : 4,5 mA.", indice: "Cherchez une valeur en mA." },
            { type: "qcm", contexte: figFiche("Préamplificateur micro", [["Entrée", "Symétrique électronique, XLR femelle"], ["Gain", "0 à 65 dB"], ["TRMC", "> 80 dB à 1 kHz"], ["Alimentation fantôme", "48 V commutable"]]), question: "Quelle ligne indique la capacité de l’entrée à rejeter les parasites captés par le câble ?", bonne: "TRMC > 80 dB", mauvaises: ["Gain 0 à 65 dB", "Alimentation fantôme 48 V", "Entrée XLR femelle"], explication: "Le taux de réjection de mode commun mesure ce que l’entrée symétrique retire du parasite identique sur les deux conducteurs.", indice: "C’est un rapport en dB qui parle de « mode commun »." },
            { type: "qcm", figure: figLiaison(true), question: "Ce schéma représente une liaison…", bonne: "symétrique : chaud et froid torsadés sous blindage", mauvaises: ["asymétrique : un conducteur et un blindage", "stéréo : un conducteur par voie", "numérique : un conducteur par bit"], explication: "Deux conducteurs torsadés (chaud et froid) et un blindage relié à la masse : c’est la liaison symétrique.", indice: "Comptez les conducteurs sous le blindage." },
            { type: "nombre", contexte: figFiche("Enregistreur de terrain", [["Entrées micro", "XLR, −70 à −10 dBu"], ["Fantôme", "P48 / P12 sélectionnable"], ["Sorties ligne", "+4 dBu nominal"], ["Entrée mini-jack", "plug-in power 3 V"]]), question: "Quelle tension de plug-in power délivre l’entrée mini-jack ?", reponse: 3, unite: "V", ecart: 0.05, explication: "On lit « plug-in power 3 V » : c’est la petite tension prévue pour les micros électret, pas l’alimentation fantôme.", indice: "Ligne « Entrée mini-jack »." }
          ],
          comprendre: [
            ["Dans une liaison symétrique, l’entrée amplifie la différence entre le point chaud et le point froid.", true, "C’est le principe : le signal utile est différentiel, le parasite identique sur les deux conducteurs disparaît."],
            ["L’alimentation fantôme applique 48 V entre les broches 2 et 3.", false, "Non : elle applique +48 V sur 2 ET sur 3 par rapport à la broche 1. Entre 2 et 3, il n’y a aucune tension : c’est du mode commun.", "Entre 2 et 3, ou entre 2-3 et 1 ?"],
            ["Un micro dynamique symétrique ne risque rien avec l’alimentation fantôme.", true, "Sa bobine flottante a ses deux extrémités à la même tension : aucun courant ne la traverse."],
            ["L’alimentation T12 est sans danger pour un micro dynamique.", false, "Le T12 met 12 V entre les broches 2 et 3 : un courant continu traverserait la bobine.", "Où est appliquée la tension du T12 ?"],
            ["Sur une XLR, la broche 1 est la masse.", true, "1 masse, 2 chaud, 3 froid."],
            ["Un micro porte une embase femelle, puisque le câble s’y branche.", false, "Le micro est une sortie : il porte une embase mâle. Le câble a une femelle côté micro.", "Les sorties sont sur quel genre de fiche ?"],
            ["Le plug-in power d’une caméra grand public peut remplacer l’alimentation fantôme d’un micro statique de studio.", false, "Le plug-in power (3 à 5 V) ne suffit qu’aux micros électret prévus pour lui ; un statique à polarisation externe a besoin de fantôme."],
            ["Une liaison asymétrique convient mal à un câble micro de 50 m.", true, "Le parasite induit sur le conducteur s’ajoute au signal sans pouvoir être retiré ; plus le câble est long, plus il en capte."],
            ["En AES42 mode 2, le micro fonctionne sur sa propre horloge et l’interface convertit la fréquence d’échantillonnage.", false, "C’est le mode 1, asynchrone. En mode 2, synchrone, l’interface asservit l’horloge du micro sur la référence du studio."],
            ["Une liaison peut être symétrique même si le signal n’est envoyé que sur le point chaud.", true, "La symétrie tient à l’égalité des impédances des deux conducteurs par rapport à la masse : ils captent alors le même parasite."],
            ["Le niveau ligne professionnel de +4 dBu est plus élevé que le niveau grand public de −10 dBV.", true, "+4 dBu ≈ 1,23 V contre 0,316 V : environ 11,8 dB d’écart."]
          ],
          qcm: [
            ["Pourquoi le parasite disparaît-il dans une liaison symétrique ?", "Il est identique sur les deux conducteurs et l’entrée garde leur différence", ["Le blindage arrête tous les champs magnétiques", "Le point froid inverse le parasite avant l’arrivée", "La console filtre toutes les fréquences sous 50 Hz"], "Le parasite est en mode commun ; l’entrée différentielle soustrait les deux conducteurs, il s’annule. Le blindage seul n’arrête pas les champs magnétiques."],
            ["Quelle est la valeur des résistances d’une alimentation P48 ?", "6,8 kΩ sur chaque conducteur", ["680 Ω sur chaque conducteur", "180 Ω entre les broches 2 et 3", "48 kΩ sur la broche 1"], "P48 : 6,8 kΩ (6,81 kΩ) ; 680 Ω correspond au P12, 180 Ω au T12."],
            ["Un micro statique est branché sur une console dont le fantôme est coupé. Que se passe-t-il ?", "Il ne délivre aucun signal utile", ["Il fonctionne, mais avec moins d’aigus", "Il fonctionne grâce au signal du câble", "Il fonctionne en mode dynamique"], "Sans alimentation, ni la polarisation de la capsule ni le préampli interne ne fonctionnent : silence (ou presque)."],
            ["Quel connecteur est asymétrique ?", "Le jack TS 6,35 mm", ["Le connecteur XLR 3 broches", "Le jack TRS 6,35 mm câblé chaud-froid-masse", "Le connecteur XLR d’un micro AES42"], "TS = pointe (signal) + corps (masse) : deux contacts seulement, donc asymétrique."],
            ["Que faire avant de brancher un micro à ruban passif sur une console ?", "Couper l’alimentation fantôme", ["Monter le gain au maximum", "Passer l’alimentation en T12", "Brancher d’abord le côté console"], "Un branchement à chaud ou un câble défectueux crée un déséquilibre et une impulsion qui peut endommager le ruban."],
            ["Un ronflement à 50 Hz apparaît quand on relie deux appareils branchés sur le secteur. Cause probable ?", "Une boucle de masse", ["Un TRMC trop élevé", "Une alimentation fantôme trop faible", "Un micro trop sensible"], "Deux chemins vers la terre (secteur et blindage) : un courant circule dans la boucle et induit un ronflement."],
            ["Que désigne le mode 1 d’un micro numérique AES42 ?", "Le mode asynchrone : horloge propre au micro, conversion côté interface", ["Le mode synchrone : horloge asservie à la référence", "Le mode analogique de secours", "Le mode sans alimentation"], "Mode 1 = asynchrone ; mode 2 = synchrone."],
            ["Quel niveau correspond à 1,228 V ?", "+4 dBu", ["−10 dBV", "0 dBu", "+4 dBV"], "20 log(1,228 / 0,775) ≈ +4 dBu."]
          ],
          calculer: [
            () => { const I = C([2, 3, 4, 5, 6, 7, 8, 9]), U = MICRO.fantome(48, 6.8, I); return { type: "nombre", question: "Alimentation P48 (2 × 6,8 kΩ). Le micro consomme <b>" + I + " mA</b>. Quelle tension reste-t-il à ses bornes ?", reponse: U, unite: "V", explication: "Les deux résistances sont en parallèle : 3,4 kΩ. U = 48 − " + I + " × 10⁻³ × 3 400 = 48 − " + NB(I * 3.4, 1) + " = <b>" + NB(U, 1) + " V</b>.", indice: "U = 48 − I × 3,4 kΩ (I en mA donne des volts)." }; },
            () => { const U = C([0.1, 0.245, 0.316, 0.5, 0.775, 1, 1.228, 1.55, 2.45]), L = MICRO.dbu(U); return { type: "nombre", question: "Une sortie délivre <b>" + NB(U, 3) + " V</b>. Quel est son niveau en dBu ?", reponse: L, unite: "dBu", ecart: 0.2, explication: "L = 20 log(" + NB(U, 3) + " / 0,775) = <b>" + NB(L, 1) + " dBu</b>.", indice: "La référence du dBu est 0,775 V." }; },
            () => { const L = C([-20, -10, -6, 0, 4, 6]), Lu = L + 20 * Math.log10(1 / 0.775); return { type: "nombre", question: "Un appareil sort à <b>" + NB(L, 0) + " dBV</b>. Combien cela fait-il en dBu ?", reponse: Lu, unite: "dBu", ecart: 0.2, explication: "1 V = 20 log(1 / 0,775) ≈ +2,2 dBu. Donc " + NB(L, 0) + " dBV = " + NB(L, 0) + " + 2,2 = <b>" + NB(Lu, 1) + " dBu</b>.", indice: "0 dBV vaut +2,2 dBu." }; },
            () => { const P = C([-60, -50, -45, -40, -35, -30]), T = C([50, 60, 65, 70, 80]), r = P - T; return { type: "nombre", question: "Un câble capte un parasite de mode commun de <b>" + P + " dBu</b>. L’entrée symétrique a un TRMC de <b>" + T + " dB</b>. Quel niveau de parasite reste-t-il en sortie ?", reponse: r, unite: "dBu", ecart: 0.5, explication: "P<sub>sortie</sub> = " + P + " − " + T + " = <b>" + r + " dBu</b>.", indice: "On retire le TRMC au parasite induit." }; },
            () => { const S = C([-60, -55, -50, -45, -40]), P = C([-60, -50, -40]), T = C([60, 70, 80]), rap = S - (P - T); return { type: "nombre", question: "Signal micro : <b>" + S + " dBu</b>. Parasite induit en mode commun : <b>" + P + " dBu</b>. TRMC : <b>" + T + " dB</b>. Quel est le rapport signal / parasite en sortie ?", reponse: rap, unite: "dB", ecart: 0.5, explication: "Parasite restant : " + P + " − " + T + " = " + (P - T) + " dBu. Rapport : " + S + " − (" + (P - T) + ") = <b>" + rap + " dB</b>.", indice: "Calculez d’abord le parasite restant." }; },
            () => { const I = C([2, 4, 6, 8, 10]), U = MICRO.fantome(12, 0.68, I); return { type: "nombre", question: "Alimentation P12 : 12 V à travers deux résistances de 680 Ω. Le micro consomme <b>" + I + " mA</b>. Tension à ses bornes ?", reponse: U, unite: "V", explication: "Résistances en parallèle : 340 Ω. U = 12 − " + I + " × 10⁻³ × 340 = 12 − " + NB(I * 0.34, 2) + " = <b>" + NB(U, 2) + " V</b>.", indice: "Même formule qu’en P48, avec R / 2 = 340 Ω." }; },
            () => { const L = C([-70, -60, -50, -40, -30]), U = MICRO.voltsDbu(L); return { type: "nombre", question: "Un micro délivre <b>" + L + " dBu</b>. Quelle est sa tension de sortie, en millivolts ?", reponse: U * 1000, unite: "mV", explication: "U = 0,775 × 10<sup>" + L + "/20</sup> = <b>" + NB(U * 1000, 3) + " mV</b>.", indice: "U = 0,775 × 10^(L / 20)." }; }
          ],
          exercice: [
            () => { const I = C([3, 4, 5, 6]), Umin = C([9, 12, 15]), U = MICRO.fantome(48, 6.8, I), ok = U >= Umin; return { type: "exercice", question: "Un micro statique consomme <b>" + I + " mA</b> et fonctionne à partir de <b>" + Umin + " V</b>. La console fournit du P48 (2 × 6,8 kΩ).", etapes: [
              { question: "a) Quelle est la résistance équivalente vue par le micro ?", reponse: 3.4, unite: "kΩ" },
              { question: "b) Quelle tension arrive à ses bornes ?", reponse: U, unite: "V" },
              { question: "c) Le micro fonctionne-t-il ?", bonne: ok ? "Oui, la tension dépasse son minimum" : "Non, la tension est sous son minimum", mauvaises: [ok ? "Non, la tension est sous son minimum" : "Oui, la tension dépasse son minimum", "On ne peut pas savoir sans la longueur du câble"] }
            ], solution: "a) 6,8 / 2 = 3,4 kΩ. b) 48 − " + I + " × 3,4 = " + NB(U, 1) + " V. c) " + NB(U, 1) + " V " + (ok ? "≥ " : "< ") + Umin + " V : " + (ok ? "il fonctionne." : "il ne fonctionne pas correctement."), indice: "Les deux résistances de 6,8 kΩ sont en parallèle." }; },
            () => { const S = C([-55, -50, -45]), P = C([-50, -45, -40]), T = C([60, 70]); return { type: "exercice", question: "Sur scène, un câble de 40 m passe près d’un gradateur. Le micro délivre <b>" + S + " dBu</b> ; le câble capte un parasite de <b>" + P + " dBu</b>.", etapes: [
              { question: "a) En liaison asymétrique, quel est le rapport signal / parasite à l’arrivée ?", reponse: S - P, unite: "dB", ecart: 0.5 },
              { question: "b) En liaison symétrique, avec un TRMC de " + T + " dB, quel parasite reste-t-il ?", reponse: P - T, unite: "dBu", ecart: 0.5 },
              { question: "c) Quel est alors le rapport signal / parasite ?", reponse: S - P + T, unite: "dB", ecart: 0.5 }
            ], solution: "a) " + S + " − (" + P + ") = " + (S - P) + " dB : le parasite est aussi fort que la voix, ou presque. b) " + P + " − " + T + " = " + (P - T) + " dBu. c) " + S + " − (" + (P - T) + ") = " + (S - P + T) + " dB : le parasite devient inaudible.", indice: "En asymétrique, rien ne retire le parasite." }; },
            () => { const L = C([-10, -6]), Lu = L + 2.21, ecart = 4 - Lu; return { type: "exercice", question: "Un lecteur grand public sort à <b>" + L + " dBV</b> ; il est branché sur une entrée de console réglée pour +4 dBu.", etapes: [
              { question: "a) Quel est le niveau du lecteur en dBu ?", reponse: Lu, unite: "dBu", ecart: 0.2 },
              { question: "b) Combien de dB de gain faut-il ajouter pour atteindre +4 dBu ?", reponse: ecart, unite: "dB", ecart: 0.3 },
              { question: "c) Sa tension de sortie vaut environ :", bonne: NB(MICRO.voltsDbv(L), 3) + " V", mauvaises: [NB(MICRO.voltsDbu(L), 3) + " V", "1,228 V"] }
            ], solution: "a) " + L + " + 2,2 = " + NB(Lu, 1) + " dBu. b) 4 − (" + NB(Lu, 1) + ") ≈ " + NB(ecart, 1) + " dB. c) 10^(" + L + "/20) = " + NB(MICRO.voltsDbv(L), 3) + " V.", indice: "0 dBV = +2,2 dBu." }; }
          ]
        }
      };
    })(),

    (function () {
      /* ---- Outils propres au module 8 -------------------------------------------
         Angles : 0° = axe du couple (vers la scène), positif à DROITE.
         Un couple = { A directivité, ang angle entre les axes (°), d écartement (m) }.
         Micro gauche orienté à −ang/2, micro droit à +ang/2. */
      const gainMic = (A, axe, th) => A + (1 - A) * Math.cos((th - axe) * Math.PI / 180);
      const dL = (cp, th) => 20 * Math.log10(Math.abs(gainMic(cp.A, cp.ang / 2, th)) / Math.abs(gainMic(cp.A, -cp.ang / 2, th)));
      const dT = (cp, th) => cp.d * Math.sin(th * Math.PI / 180) / MICRO.c * 1000; // ms

      // Couple vu de dessus (SVG)
      function figCouple(cp, titre) {
        const cx = 260, cy = 150, ech = Math.min(260, 60 + cp.d * 300) / 2;
        const xs = cp.d > 0 ? [cx - ech, cx + ech] : [cx, cx];
        let s = TXT(260, 22, titre || "Couple vu de dessus", { s: 13 });
        s += TXT(260, 46, "▲ scène", { s: 11, w: 500, c: "#8e8e93" });
        [-1, 1].forEach((k, i) => {
          const a = k * cp.ang / 2 * Math.PI / 180, x = xs[i], y = cy;
          const x2 = x + 70 * Math.sin(a), y2 = y - 70 * Math.cos(a);
          s += LIGNE(x, y, x2.toFixed(1), y2.toFixed(1), { c: k < 0 ? "#64d2ff" : "#ff9f0a", w: 2, d: "5 4" });
          s += '<g transform="translate(' + x + " " + y + ") rotate(" + (k * cp.ang / 2) + ')"><rect x="-7" y="-14" width="14" height="30" rx="7" fill="' + (k < 0 ? "#64d2ff" : "#ff9f0a") + '"/></g>';
        });
        if (cp.ang > 0) s += TXT(cx, cy - 86, NB(cp.ang, 0) + "°", { s: 13, c: "#ffd60a" });
        if (cp.d > 0) s += LIGNE(xs[0], cy + 40, xs[1], cy + 40, { c: "#e5e5ea" }) + TXT(cx, cy + 58, NB(cp.d * 100, 0) + " cm", { s: 12 });
        s += TXT(260, 240, cp.nom || "", { s: 12, w: 500, c: "#8e8e93" });
        return SVG(520, 252, s, "Couple de micros vu de dessus" + (cp.ang ? ", angle de " + cp.ang + " degrés" : "") + (cp.d ? ", écartement de " + Math.round(cp.d * 100) + " cm" : ""));
      }
      // Triangle d'écoute stéréo
      function figTriangle() {
        let s = TXT(260, 22, "Écoute stéréo : triangle équilatéral", { s: 13 });
        const L = [150, 60], R = [370, 60], E = [260, 250];
        s += '<path d="M' + L + " L" + R + " L" + E + ' Z" fill="none" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4"/>';
        [L, R].forEach(p => { s += '<rect x="' + (p[0] - 16) + '" y="' + (p[1] - 18) + '" width="32" height="36" rx="5" fill="#3a3a3c" stroke="#8e8e93"/><circle cx="' + p[0] + '" cy="' + (p[1] + 4) + '" r="9" fill="#8e8e93"/>'; });
        s += TXT(150, 100, "G", { s: 13 }) + TXT(370, 100, "D", { s: 13 });
        s += '<circle cx="225" cy="60" r="8" fill="#ffd60a"/>' + TXT(225, 44, "source fantôme", { s: 11, c: "#ffd60a" });
        s += '<circle cx="' + E[0] + '" cy="' + E[1] + '" r="12" fill="#e5e5ea"/>' + TXT(E[0] + 70, E[1] + 4, "auditeur", { s: 11, w: 500, c: "#8e8e93" });
        s += TXT(215, 200, "30°", { s: 12, c: "#64d2ff" }) + TXT(305, 200, "30°", { s: 12, c: "#64d2ff" });
        s += LIGNE(E[0], E[1], E[0], 60, { c: "rgba(100,210,255,.4)", d: "2 3" });
        return SVG(520, 270, s, "Triangle d’écoute stéréo : deux enceintes à plus et moins 30 degrés de l’auditeur, une source fantôme entre elles");
      }
      const XY90 = { A: 0.5, ang: 90, d: 0, nom: "deux cardioïdes" }, ORTF = { A: 0.5, ang: 110, d: 0.17, nom: "deux cardioïdes" }, NOS = { A: 0.5, ang: 90, d: 0.3, nom: "deux cardioïdes" };

      return {
        titre: "Couples stéréophoniques",
        nav: "Stéréo",
        resume: "XY, MS, AB, ORTF",
        intro: "Deux enceintes peuvent faire entendre un son <b>entre</b> elles : c’est la source fantôme. Un couple de micros fabrique cette illusion à partir de deux indices, une <b>différence de niveau</b> et une <b>différence de temps</b> entre les voies gauche et droite. Ce module présente les couples coïncidents (XY, Blumlein, MS), espacés (AB) et quasi coïncidents (ORTF, NOS, DIN), et leur angle de prise de son.",

        notions: {
          titre: "Fabriquer une image stéréo",
          intro: "Le choix d’un couple, c’est le choix d’un dosage entre différence de niveau et différence de temps. Le premier donne une image précise et compatible mono, le second une sensation d’espace.",
          mots: [
            { t: "Écoute stéréophonique", ic: "🎧", q: "Comment écoute-t-on la stéréo ?", d: "Deux enceintes et l’auditeur forment un <b>triangle équilatéral</b> : les enceintes sont à ±30° de l’axe d’écoute, soit 60° d’ouverture. L’image sonore s’étale entre les deux." + figTriangle(), c: "Comme une scène de théâtre vue depuis la meilleure place : tout se passe entre les deux colonnes.", r: "Enceintes à ±30° · auditeur à égale distance des deux · hors de cette place, l’image se déporte vers l’enceinte la plus proche." },
            { t: "Source fantôme", ic: "👻", q: "Qu’est-ce qu’une source fantôme ?", d: "Un son perçu à un endroit où il n’y a <b>pas d’enceinte</b>, entre les deux. Le même signal dans les deux enceintes, au même niveau et au même instant, s’entend au centre. Si une enceinte est plus forte ou en avance, l’image glisse vers elle.", c: "Un chanteur entendu « au milieu » alors que seules deux enceintes jouent.", r: "Décalage exprimé en % : 0 % = centre, 100 % = sur une enceinte." },
            { t: "Différence de niveau", s: "ΔL", u: "dB", ic: "🔊", q: "Quel rôle joue la différence de niveau ΔL ?", d: "L’écart de niveau entre les voies gauche et droite pour une même source. Plus il est grand, plus la source fantôme se déplace vers la voie la plus forte. Les couples <b>coïncidents</b> ne fabriquent que cet indice, grâce à la directivité des micros.", c: "Le bouton de balance d’une chaîne hi-fi.", r: "La source est perçue sur une enceinte pour ΔL ≈ 12 à 18 dB selon les auteurs." },
            { t: "Différence de temps", s: "Δt", u: "ms", ic: "⏱️", q: "Quel rôle joue la différence de temps Δt ?", d: "L’écart d’arrivée d’un son entre les deux micros, donc entre les deux voies. La voie en avance attire la source fantôme. Les couples <b>espacés</b> ne fabriquent que cet indice.", c: "Deux personnes qui disent le même mot, l’une un tout petit peu avant l’autre : on croit l’entendre du côté de la première.", r: "La source est perçue sur une enceinte pour Δt ≈ 1 à 1,5 ms · Δt et ΔL s’additionnent." },
            { t: "Couple XY", ic: "✖️", q: "Qu’est-ce qu’un couple XY ?", d: "Deux micros directifs, en général des <b>cardioïdes</b>, dont les capsules sont l’une au-dessus de l’autre (même point), axes ouverts de 90° à 135°. Le son arrive au même instant sur les deux : seul ΔL travaille. Image précise, compatibilité mono parfaite, sensation d’espace limitée." + figCouple(XY90, "XY à 90°"), c: "Deux lampes torches tenues dans la même main, pointées dans deux directions.", r: "Cardioïdes à 90° le plus souvent · plus l’angle est ouvert, plus l’image s’élargit." },
            { t: "Couple Blumlein", ic: "∞", q: "Qu’est-ce qu’un couple Blumlein ?", d: "Deux micros <b>bidirectionnels</b> coïncidents, croisés à 90°. Une source à 45° tombe dans l’annulation de l’un des micros : elle n’est que dans une voie. L’angle de prise de son vaut donc <b>90°</b>. Les côtés sont captés en opposition de phase, l’arrière est capté et inversé gauche-droite.", c: "Deux huit en croix : chacun ignore ce que l’autre regarde en face.", r: "Angle de prise de son usuel : 90° (géométrique) · capte beaucoup de salle (l’arrière autant que l’avant)." + figPolaire([{ f: a => Math.cos((a + 45) * Math.PI / 180), couleur: "#64d2ff", nom: "gauche" }, { f: a => Math.cos((a - 45) * Math.PI / 180), couleur: "#ff9f0a", nom: "droite" }], { titre: "Blumlein" }) },
            { t: "Couple MS", ic: "➕", q: "Comment fonctionne un couple MS ?", d: "Un micro <b>M</b> (milieu : cardioïde, omni ou huit) pointé vers la scène, et un micro <b>S</b> (côtés : bidirectionnel) à 90°, coïncidents. On dématrice : <b>G = M + S</b> et <b>D = M − S</b>. Le niveau de S règle la largeur de l’image, même après l’enregistrement. La somme mono G + D = 2M ne contient plus S.", c: "Une photo du centre et une photo des côtés : on choisit après coup combien de côtés on ajoute.", r: "S à 0 : mono · plus de S : image plus large · un MS équivaut toujours à deux micros virtuels coïncidents, dont l’angle et la directivité dépendent de M et du niveau de S." },
            { t: "Couple AB (espacé)", ic: "↔️", q: "Qu’est-ce qu’un couple AB ?", d: "Deux micros, en général <b>omnidirectionnels</b>, écartés de d (de 40 cm à plusieurs mètres), parallèles. Pour une source lointaine, ils captent le même niveau : seul Δt = d·sin θ / c travaille. Grande sensation d’espace, bons graves (omnis), image moins précise.", c: "Deux oreilles très écartées : on sent bien l’espace, moins la position exacte.", r: "40 cm à 60 cm : image correcte ; plus de 1 m : risque de « trou au milieu » · somme mono : filtre en peigne." },
            { t: "Couples quasi coïncidents", ic: "🎯", q: "Que sont les couples ORTF, NOS et DIN ?", d: "Deux <b>cardioïdes</b> écartés de quelques dizaines de centimètres et ouverts : ils combinent ΔL (angle) et Δt (écartement). <b>ORTF</b> : 17 cm, 110° (Office de radiodiffusion-télévision française). <b>NOS</b> : 30 cm, 90° (radiodiffusion néerlandaise). <b>DIN</b> : 20 cm, 90°." + figCouple(ORTF, "ORTF : 17 cm, 110°"), c: "Une tête humaine : deux oreilles un peu écartées et tournées vers les côtés.", r: "Angles de prise de son publiés : ORTF ≈ 96°, NOS ≈ 81° (quelques degrés d’écart selon les auteurs)." },
            { t: "Angle de prise de son", u: "°", ic: "📐", q: "Qu’est-ce que l’angle de prise de son d’un couple ?", d: "Le secteur de la scène, vu du couple, qui sera restitué sur <b>toute la largeur</b> entre les enceintes. Une source au bord de cet angle sort entièrement d’une enceinte. Si l’orchestre est plus large, ses bords s’entassent sur les enceintes ; s’il est plus étroit, l’image est étroite.", c: "Le cadrage d’une caméra : l’angle de champ doit correspondre à la largeur de la scène.", r: "Blumlein : 90° · ORTF ≈ 96° · NOS ≈ 81° · on l’ajuste en changeant l’angle ou l’écartement des micros, ou leur distance à la scène." },
            { t: "Compatibilité mono", ic: "📻", q: "Pourquoi parle-t-on de compatibilité mono ?", d: "Un mixage stéréo est souvent écouté en mono (téléphone, radio, télévision). On additionne alors G et D. Avec un couple coïncident, rien ne change. Avec un couple espacé, les signaux décalés de Δt s’additionnent en <b>filtre en peigne</b> : des creux apparaissent aux fréquences f = (2k + 1) / (2Δt).", c: "Deux vagues décalées : à certains endroits elles s’annulent.", r: "Δt = 1 ms → premier creux à 500 Hz · coïncidents (XY, MS, Blumlein) : compatibles mono." }
          ],
          formules: [
            { q: "Quelle différence de temps fabrique un couple espacé ?", f: "Δt = d × sin θ / c", say: "delta t est égal à d fois sinus thêta divisé par c", rows: [["Δt", "différence de temps entre les deux micros", "s (ms)", "indice de localisation"], ["d", "écartement des micros", "m", "17 cm en ORTF, 40 cm et plus en AB"], ["θ", "angle de la source par rapport à l’axe du couple", "°", "0° = au centre"], ["c", "célérité du son", "m/s", "343 m/s à 20 °C"]], ex: "AB de 50 cm, source à 30° : Δt = 0,5 × 0,5 / 343 = 0,000 73 s ≈ <b>0,73 ms</b>." },
            { q: "Quelle différence de niveau fabrique un couple coïncident ?", f: "ΔL = 20 log( r<sub>D</sub>(θ) / r<sub>G</sub>(θ) )", say: "delta L est égal à vingt fois le logarithme du rapport des sensibilités du micro droit et du micro gauche dans la direction de la source", rows: [["ΔL", "différence de niveau droite − gauche", "dB", "positive : l’image va à droite"], ["r<sub>D</sub>, r<sub>G</sub>", "sensibilité de chaque micro dans la direction θ", "—", "A + B·cos(θ − axe du micro)"], ["θ", "direction de la source", "°", "positive à droite"]], ex: "XY de cardioïdes à 90°, source à 30° à droite : r<sub>D</sub> = 0,5 + 0,5 cos 15° = 0,983 ; r<sub>G</sub> = 0,5 + 0,5 cos 75° = 0,629 ; ΔL = 20 log(1,563) ≈ <b>3,9 dB</b>." },
            { q: "Comment dématricer un couple MS ?", f: "G = M + S  ·  D = M − S", say: "gauche égale M plus S, droite égale M moins S", rows: [["G, D", "voies gauche et droite", "V", "ce qu’on envoie aux enceintes"], ["M", "micro du milieu", "V", "pointé vers la scène"], ["S", "micro des côtés (bidirectionnel)", "V", "lobe positif vers la gauche"]], ex: "M = 10 mV, S = 4 mV : G = 14 mV, D = 6 mV. Et à l’inverse : M = (G + D) / 2, S = (G − D) / 2." },
            { q: "Comment le labo estime-t-il la position de la source fantôme ?", f: "décalage ≈ ΔL / 13 dB + Δt / 1 ms", say: "le décalage vaut à peu près delta L sur treize décibels plus delta t sur une milliseconde", rows: [["décalage", "position de l’image", "%", "0 = centre, 100 % = sur une enceinte (plafonné)"], ["ΔL", "différence de niveau", "dB", "13 dB suffisent seuls"], ["Δt", "différence de temps", "ms", "1 ms suffit seule"]], ex: "ORTF, source à 30° : ΔL ≈ 4,9 dB et Δt ≈ 0,25 ms → 4,88 / 13 + 0,248 / 1 ≈ 0,375 + 0,248 ≈ <b>62 %</b>. Modèle simplifié : les seuils publiés vont de 12 à 18 dB et de 1 à 1,5 ms selon les auteurs." }
          ]
        },

        manipuler: {
          titre: "Placer la scène entre les enceintes",
          intro: "Dans le premier labo, choisissez un couple et déplacez le soliste sur la scène : le labo calcule <b>ΔL</b> et <b>Δt</b>, puis la place de la source fantôme entre les enceintes. Le secteur jaune est l’angle de prise de son. Dans le second, réglez le niveau de S d’un couple <b>MS</b> et regardez naître les deux micros virtuels gauche et droite."
        },

        essentiel: {
          definitions: [
            "<b>Source fantôme</b> : son perçu entre les enceintes ; elle va vers la voie la plus forte (ΔL) ou en avance (Δt).",
            "<b>Coïncidents</b> (XY, Blumlein, MS) : même point, ΔL seul, compatibles mono.",
            "<b>Espacés</b> (AB) : omnis écartés, Δt seul, espace, filtre en peigne en mono.",
            "<b>Quasi coïncidents</b> : ORTF (17 cm, 110°), NOS (30 cm, 90°), DIN (20 cm, 90°), cardioïdes, ΔL + Δt.",
            "<b>Angle de prise de son</b> : secteur de scène restitué sur toute la base stéréo."
          ],
          formules: [
            ["Δt = d × sin θ / c", "différence de temps d’un couple espacé (c = 343 m/s)"],
            ["ΔL = 20 log(r<sub>D</sub> / r<sub>G</sub>)", "différence de niveau d’un couple directif"],
            ["G = M + S ; D = M − S", "dématriçage MS ; M = (G + D)/2, S = (G − D)/2"],
            ["f = 1 / (2Δt)", "premier creux du filtre en peigne en mono"]
          ],
          reperes: [
            "Enceintes à ±30° (triangle équilatéral).",
            "Source sur une enceinte : ΔL ≈ 12 à 18 dB ou Δt ≈ 1 à 1,5 ms.",
            "Angles de prise de son : Blumlein 90°, ORTF ≈ 96°, NOS ≈ 81°.",
            "XY : cardioïdes ouverts de 90° à 135° ; AB : de 40 cm à plusieurs mètres."
          ],
          pieges: [
            "Un couple XY n’a pas de différence de temps : ses capsules sont au même point.",
            "Un AB d’omnis n’a (presque) pas de différence de niveau pour une source lointaine.",
            "En MS, augmenter S élargit l’image ; la somme mono, elle, ne contient que M.",
            "ORTF = 17 cm et 110° ; NOS = 30 cm et 90° : ne les inversez pas.",
            "Un angle de prise de son trop petit pour la scène entasse les sources des bords sur les enceintes."
          ]
        },

        evaluation: {
          lire: [
            { type: "qcm", figure: figCouple({ A: 0.5, ang: 110, d: 0.17, nom: "deux cardioïdes" }, "Couple à identifier"), question: "Quel couple est dessiné ?", bonne: "ORTF", mauvaises: ["NOS", "XY", "AB"], explication: "Deux cardioïdes, 17 cm, 110° : c’est le couple ORTF.", indice: "Lisez l’écartement et l’angle." },
            { type: "qcm", figure: figCouple({ A: 0.5, ang: 90, d: 0.3, nom: "deux cardioïdes" }, "Couple à identifier"), question: "Quel couple est dessiné ?", bonne: "NOS", mauvaises: ["ORTF", "DIN", "Blumlein"], explication: "Deux cardioïdes, 30 cm, 90° : c’est le couple NOS. Le DIN est à 20 cm.", indice: "30 cm et 90°." },
            { type: "qcm", figure: figPolaire([{ f: a => Math.cos((a + 45) * Math.PI / 180), couleur: "#64d2ff", nom: "micro 1" }, { f: a => Math.cos((a - 45) * Math.PI / 180), couleur: "#ff9f0a", nom: "micro 2" }]), question: "Ces deux directivités, croisées à 90° au même point, forment un couple…", bonne: "Blumlein", mauvaises: ["XY de cardioïdes", "AB", "ORTF"], explication: "Deux bidirectionnels (en huit) coïncidents à 90° : c’est le couple Blumlein.", indice: "Quelle est la forme de chaque diagramme ?" },
            { type: "nombre", contexte: figFiche("Réglage du couple", [["Micros", "2 omnidirectionnels"], ["Montage", "parallèles, sur une barrette"], ["Écartement", "60 cm"], ["Hauteur", "3,5 m"]]), question: "Quel est l’écartement du couple, en centimètres ?", reponse: 60, unite: "cm", ecart: 0.5, explication: "On lit 60 cm : deux omnis parallèles écartés, c’est un couple AB.", indice: "Ligne « Écartement »." },
            { type: "qcm", figure: figPolaire([{ A: 0.5, couleur: "#ffd60a", nom: "M" }, { f: a => -Math.sin(a * Math.PI / 180), couleur: "#bf5af2", nom: "S" }], { titre: "Couple MS" }), question: "Sur ce couple MS, quelle est la directivité du micro S ?", bonne: "Bidirectionnelle, orientée vers les côtés", mauvaises: ["Cardioïde, orientée vers la scène", "Omnidirectionnelle", "Cardioïde, orientée vers l’arrière"], explication: "S est toujours un bidirectionnel tourné à 90° : il capte les côtés, avec un lobe en opposition de phase.", indice: "S = « side », les côtés." }
          ],
          comprendre: [
            ["Dans un couple XY, la localisation repose uniquement sur des différences de niveau.", true, "Les capsules sont au même point : le son arrive au même instant, Δt = 0."],
            ["Un couple AB d’omnis crée surtout des différences de niveau.", false, "Pour une source lointaine, deux omnis captent le même niveau : c’est Δt = d·sin θ / c qui travaille.", "Les omnis ont-ils une directivité ?"],
            ["En MS, on peut régler la largeur de l’image après l’enregistrement.", true, "Le dématriçage G = M + S, D = M − S se fait au mixage : le niveau de S règle la largeur."],
            ["La somme mono d’un couple MS contient le signal S.", false, "G + D = (M + S) + (M − S) = 2M : S disparaît."],
            ["Le couple ORTF utilise deux cardioïdes écartés de 17 cm et ouverts de 110°.", true, "C’est sa définition."],
            ["Un couple Blumlein utilise deux cardioïdes croisés à 90°.", false, "Le Blumlein utilise deux bidirectionnels (en huit) croisés à 90°."],
            ["Un couple espacé est parfaitement compatible mono.", false, "L’addition de deux signaux décalés de Δt crée un filtre en peigne."],
            ["Si la scène est plus large que l’angle de prise de son, ses bords s’entassent sur les enceintes.", true, "Au-delà de l’angle de prise de son, le décalage reste à 100 % : tout ce qui dépasse sort d’une seule enceinte."],
            ["Les enceintes d’une écoute stéréo standard sont à ±30° de l’auditeur.", true, "Triangle équilatéral : 60° entre les deux enceintes."],
            ["Augmenter l’écartement d’un couple AB augmente son angle de prise de son.", false, "Plus d est grand, plus Δt atteint vite sa valeur maximale : l’angle de prise de son diminue.", "Que devient Δt pour une même source quand d augmente ?"]
          ],
          qcm: [
            ["Quel couple est parfaitement compatible mono et règle sa largeur après l’enregistrement ?", "MS", ["AB", "ORTF", "NOS"], "En MS, G + D = 2M (pas de peigne) et le niveau de S règle la largeur au mixage."],
            ["Quelle est la différence entre les couples ORTF et NOS ?", "ORTF : 17 cm et 110° ; NOS : 30 cm et 90°", ["ORTF : 30 cm et 90° ; NOS : 17 cm et 110°", "ORTF : omnis ; NOS : cardioïdes", "ORTF : coïncident ; NOS : espacé de 3 m"], "Les deux utilisent des cardioïdes ; ORTF est plus serré et plus ouvert que NOS."],
            ["Que capte surtout un couple AB pour localiser les sources ?", "Des différences de temps", ["Des différences de niveau", "Des différences de phase entre M et S", "Des différences de directivité"], "Omnis écartés : même niveau, mais arrivée décalée de Δt = d·sin θ / c."],
            ["Quel est l’angle de prise de son d’un couple Blumlein ?", "90°", ["180°", "60°", "110°"], "Une source à 45° tombe dans l’annulation de l’autre micro : elle est entièrement dans une voie. Le secteur restitué va de −45° à +45°."],
            ["En MS, que se passe-t-il quand on monte le niveau de S ?", "L’image s’élargit", ["L’image se resserre vers le centre", "La somme mono augmente", "Le son devient plus grave"], "Plus de S donne plus d’écart entre G et D : les sources s’écartent du centre."],
            ["Pourquoi un couple coïncident est-il compatible mono ?", "Les deux capsules reçoivent le son au même instant", ["Les deux micros sont omnidirectionnels", "Les deux voies ont toujours le même niveau", "Il n’y a pas de différence de directivité"], "Sans décalage temporel, la somme G + D ne fait pas de filtre en peigne."],
            ["Un orchestre est plus large que l’angle de prise de son du couple. Que faire ?", "Reculer le couple ou agrandir son angle de prise de son", ["Rapprocher le couple de l’orchestre", "Écarter davantage les micros d’un AB", "Ouvrir davantage l’angle d’un XY"], "Reculer réduit l’angle sous lequel le couple voit l’orchestre. Resserrer les micros (angle ou écartement plus petit) agrandit l’angle de prise de son. Écarter un AB ou ouvrir un XY le réduit encore."]
          ],
          calculer: [
            () => { const d = C([0.4, 0.5, 0.6, 0.8, 1, 1.2]), th = C([15, 20, 30, 40, 45, 60]), dt = d * Math.sin(th * Math.PI / 180) / MICRO.c * 1000; return { type: "nombre", question: "Couple AB écarté de <b>" + NB(d * 100, 0) + " cm</b>. Une source est à <b>" + th + "°</b> de l’axe. Quelle différence de temps, en millisecondes ? (c = 343 m/s)", reponse: dt, unite: "ms", explication: "Δt = d × sin θ / c = " + NB(d, 2) + " × sin " + th + "° / 343 = " + NB(d * Math.sin(th * Math.PI / 180), 3) + " / 343 = <b>" + NB(dt, 2) + " ms</b>.", indice: "Δt = d × sin θ / c, puis × 1 000 pour passer en ms." }; },
            () => { const th = C([10, 15, 20, 25, 30, 35, 40]), l = dL(XY90, th); return { type: "nombre", question: "Couple XY de deux cardioïdes ouverts à 90°. Une source est à <b>" + th + "°</b> à droite. Quelle est la différence de niveau ΔL entre la voie droite et la voie gauche ?", reponse: l, unite: "dB", tolerance: 0.05, explication: "Micro droit (axe +45°) : r<sub>D</sub> = 0,5 + 0,5 cos(" + (45 - th) + "°) = " + NB(gainMic(0.5, 45, th), 3) + ". Micro gauche (axe −45°) : r<sub>G</sub> = 0,5 + 0,5 cos(" + (45 + th) + "°) = " + NB(gainMic(0.5, -45, th), 3) + ". ΔL = 20 log(" + NB(gainMic(0.5, 45, th) / gainMic(0.5, -45, th), 3) + ") = <b>" + NB(l, 1) + " dB</b>.", indice: "Calculez l’angle entre la source et l’axe de chaque micro." }; },
            () => { const M = H(6, 20), S = H(1, 5); return { type: "nombre", question: "Couple MS : à un instant, M délivre <b>" + M + " mV</b> et S délivre <b>" + S + " mV</b>. Quelle tension sort sur la voie droite D ?", reponse: M - S, unite: "mV", ecart: 0.01, explication: "D = M − S = " + M + " − " + S + " = <b>" + (M - S) + " mV</b> (et G = M + S = " + (M + S) + " mV).", indice: "D = M − S." }; },
            () => { const G = H(10, 24), D = H(2, 9); return { type: "nombre", question: "Après dématriçage MS, la voie gauche vaut <b>" + G + " mV</b> et la droite <b>" + D + " mV</b>. Que valait le signal S ?", reponse: (G - D) / 2, unite: "mV", ecart: 0.01, explication: "S = (G − D) / 2 = (" + G + " − " + D + ") / 2 = <b>" + NB((G - D) / 2, 1) + " mV</b>.", indice: "G − D = (M + S) − (M − S) = 2S." }; },
            () => { const dt = C([0.25, 0.4, 0.5, 0.8, 1, 1.25, 2]), f = 1 / (2 * dt / 1000); return { type: "nombre", question: "En mono, deux signaux décalés de <b>" + NB(dt, 2) + " ms</b> sont additionnés. À quelle fréquence tombe le premier creux du filtre en peigne ?", reponse: f, unite: "Hz", explication: "f = 1 / (2Δt) = 1 / (2 × " + NB(dt / 1000, 5) + ") = <b>" + NB(f, 0) + " Hz</b>.", indice: "À cette fréquence, le décalage vaut une demi-période." }; },
            () => { const l = C([2, 3, 4, 5, 6]), t = C([0.1, 0.2, 0.3, 0.4]), dec = Math.min(100, (l / 13 + t) * 100); return { type: "nombre", question: "Avec le modèle du labo (décalage ≈ ΔL / 13 dB + Δt / 1 ms), une source donne <b>ΔL = " + l + " dB</b> et <b>Δt = " + NB(t, 1) + " ms</b>. Quel est son décalage, en % ?", reponse: dec, unite: "%", tolerance: 0.04, explication: "Décalage = " + l + " / 13 + " + NB(t, 1) + " / 1 = " + NB(l / 13, 3) + " + " + NB(t, 1) + " = <b>" + NB(dec, 0) + " %</b>.", indice: "Les deux contributions s’additionnent." }; },
            () => { const th = C([20, 30, 40, 45]), dt = 0.17 * Math.sin(th * Math.PI / 180) / MICRO.c * 1000; return { type: "nombre", question: "Couple ORTF (17 cm). Une source est à <b>" + th + "°</b>. Quelle différence de temps, en ms ?", reponse: dt, unite: "ms", explication: "Δt = 0,17 × sin " + th + "° / 343 = <b>" + NB(dt, 3) + " ms</b>. Le couple ORTF ajoute ce petit Δt à son ΔL.", indice: "d = 0,17 m." }; }
          ],
          exercice: [
            () => { const d = C([0.4, 0.5, 0.6]), th = C([20, 30]), dt = d * Math.sin(th * Math.PI / 180) / MICRO.c * 1000, dec = Math.min(100, dt * 100), f = 1000 / (2 * dt); return { type: "exercice", question: "Un couple AB d’omnis écartés de <b>" + NB(d * 100, 0) + " cm</b> capte un violon placé à <b>" + th + "°</b> à droite, loin du couple.", etapes: [
              { question: "a) Quelle est la différence de temps, en ms ?", reponse: dt, unite: "ms" },
              { question: "b) Avec le modèle du labo (ΔL ≈ 0 ici), quel est le décalage de la source fantôme, en % ?", reponse: dec, unite: "%", tolerance: 0.05 },
              { question: "c) En mono, où tombe le premier creux du filtre en peigne pour ce violon ?", reponse: f, unite: "Hz" }
            ], solution: "a) Δt = " + NB(d, 2) + " × sin " + th + "° / 343 = " + NB(dt, 3) + " ms. b) " + NB(dt, 3) + " / 1 ms ≈ " + NB(dec, 0) + " %. c) f = 1 / (2Δt) ≈ " + NB(f, 0) + " Hz.", indice: "Les omnis captent le même niveau : seul Δt compte." }; },
            () => { const th = C([15, 20, 30]), rD = gainMic(0.5, 45, th), rG = gainMic(0.5, -45, th), l = 20 * Math.log10(rD / rG); return { type: "exercice", question: "Un couple XY de cardioïdes ouverts à 90° capte un chanteur à <b>" + th + "°</b> à droite.", etapes: [
              { question: "a) Sensibilité relative du micro droit (axe à +45°) dans cette direction ?", reponse: rD, unite: "", tolerance: 0.02 },
              { question: "b) Sensibilité relative du micro gauche (axe à −45°) ?", reponse: rG, unite: "", tolerance: 0.02 },
              { question: "c) Différence de niveau ΔL ?", reponse: l, unite: "dB", tolerance: 0.06 },
              { question: "d) Ce couple est-il compatible mono ?", bonne: "Oui : capsules au même point, pas de Δt", mauvaises: ["Non : filtre en peigne dû à Δt", "Non : les cardioïdes s’annulent en mono"] }
            ], solution: "a) 0,5 + 0,5 cos " + (45 - th) + "° = " + NB(rD, 3) + ". b) 0,5 + 0,5 cos " + (45 + th) + "° = " + NB(rG, 3) + ". c) 20 log(" + NB(rD, 3) + " / " + NB(rG, 3) + ") = " + NB(l, 1) + " dB. d) Oui.", indice: "Angle source – axe : 45° − θ à droite, 45° + θ à gauche." }; },
            () => { const M = H(8, 16), S = H(2, 6); return { type: "exercice", question: "Un couple MS délivre M = <b>" + M + " mV</b> et S = <b>" + S + " mV</b> pour une source placée à gauche.", etapes: [
              { question: "a) Tension de la voie gauche G ?", reponse: M + S, unite: "mV", ecart: 0.01 },
              { question: "b) Tension de la voie droite D ?", reponse: M - S, unite: "mV", ecart: 0.01 },
              { question: "c) Somme mono G + D ?", reponse: 2 * M, unite: "mV", ecart: 0.01 },
              { question: "d) Pour élargir l’image au mixage, on…", bonne: "monte le niveau de S", mauvaises: ["monte le niveau de M", "inverse la polarité de M"] }
            ], solution: "a) " + M + " + " + S + " = " + (M + S) + " mV. b) " + M + " − " + S + " = " + (M - S) + " mV. c) " + (2 * M) + " mV = 2M : S a disparu. d) On monte S.", indice: "G = M + S, D = M − S." }; }
          ]
        }
      };
    })()
  ]
};
