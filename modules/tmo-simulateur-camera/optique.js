/* ==========================================================================
   optique.js — les deux configurations et les lois physiques du simulateur
   --------------------------------------------------------------------------
   Ce fichier ne dessine rien : il contient
     1. la description des deux configurations (capteur, objectif, réglages
        proposés) : CONFIGS ;
     2. les calculs : focale réelle, ouverture réelle, plan net, profondeur de
        champ, exposition, bruit, et la force de chaque défaut optique selon
        l'objectif, la focale et l'ouverture : Optique.calculer() ;
     3. la courbe de transfert de la caméra (gamma, black gamma, knee…) :
        Optique.signal(), recopiée à l'identique dans le shader de rendu.js.

   Toutes les valeurs sont des ORDRES DE GRANDEUR réalistes, pas des mesures
   de laboratoire d'un modèle précis : le but est que chaque réglage ait le
   bon effet, dans le bon sens et avec la bonne ampleur.

   Unités : focales et capteur en millimètres, distances de la scène en
   mètres, mise au point en dioptries (1 / distance en mètres : pratique, car
   l'optique « pense » en dioptries, et l'infini vaut simplement 0).
   ========================================================================== */

const CONFIGS = {
  /* ------------------------------------------------------------------------
     CONFIGURATION 1 : la chaîne broadcast
     Caméra de plateau type Sony HXC-FB80 : trois capteurs CMOS 2/3 de pouce
     derrière un prisme, monture B4, tête reliée par fibre à sa CCU.
     Sensibilité constructeur : F13 à 2000 lux (blanc à 89,9 %), en 1080/50i.
     ------------------------------------------------------------------------ */
  plateau: {
    id: "plateau",
    nom: "Caméra de plateau",
    modele: "type Sony HXC-FB80",
    court: "Plateau · 2/3″",
    capteur: {
      nom: "2/3 de pouce", l: 9.59, h: 5.39, type: "tri",
      detail: "3 capteurs CMOS 2/3″ (un par couleur) derrière un prisme",
      pas: 5.0            // largeur d'un photosite, en micromètres (1920 photosites sur 9,59 mm)
    },
    // Équivalent ISO du gain 0 dB : c'est la sensibilité F13 à 2000 lux
    // traduite dans la formule des posemètres (N² / t = E × S / 250).
    isoBase: 1050,
    sensibilite: { type: "gain", valeurs: [-3, 0, 3, 6, 9, 12, 18, 24, 30, 36, 42], defaut: 0 },
    obturations: [50, 60, 100, 125, 250, 500, 1000, 2000],
    nd: [
      { nom: "CLEAR", t: 1 }, { nom: "1/4", t: 1 / 4 }, { nom: "1/16", t: 1 / 16 }, { nom: "1/64", t: 1 / 64 }
    ],
    ndNom: "Roue de filtres ND",
    blancs: [3200, 4300, 5600, 6300],
    saturationCapteur: 6,          // le capteur encaisse 600 % du blanc avant d'écrêter
    bruit: { lecture: 0.0012, grenaille: 0.006 },
    gammas: [{ id: "itu709", nom: "Standard ITU-709" }],
    objectif: {
      nom: "Zoom broadcast 20× · 8,5–170 mm f/1,8",
      monture: "Monture B4 à baïonnette",
      type: "parfocal",
      fMin: 8.5, fMax: 170,
      nMin: 1.8, nMax: 16,
      fRampe: 115,                 // au-delà, l'ouverture maximale chute (« ramping »)
      doubleur: true,
      map: 0.9,                    // distance minimale de mise au point, en mètres
      lames: 6, arrondi: 0.15,     // diaphragme à 6 lames presque droites
      respiration: 0,
      varifocal: 0,
      // Tables [focale, valeur] : la force du défaut à quelques focales, interpolée entre.
      acLat: [[8.5, 0.0022], [30, 0.0003], [80, -0.0009], [170, -0.0017]], // écart rouge/bleu au coin, en fraction de la demi-diagonale
      distorsion: [[8.5, -0.026], [25, -0.004], [60, 0.006], [170, 0.011]],  // négatif = barillet, positif = coussinet
      vignettage: [[8.5, 0.9], [40, 0.5], [115, 0.7], [170, 1.2]],          // perte au coin à pleine ouverture, en diaphragmes
      cosP: 2.2,                   // chute naturelle en cos^p de l'angle de champ
      acLon: 1 / 7000,             // décalage de foyer rouge/bleu = focale × ce nombre
      spherique: 0.0045,           // rayon de la tache d'aberration à pleine ouverture (mm)
      bords: 1.6                   // les bords sont plus mous que le centre (× ce facteur au coin)
    }
  },

  /* ------------------------------------------------------------------------
     CONFIGURATION 2 : le boîtier autonome
     Boîtier type Sony FX3 : un seul capteur CMOS plein format (matrice de
     Bayer), monture E, enregistrement sur carte, zoom photo 24-70 mm f/2,8.
     ------------------------------------------------------------------------ */
  boitier: {
    id: "boitier",
    nom: "Boîtier cinéma",
    modele: "type Sony FX3",
    court: "Boîtier · plein format",
    capteur: {
      nom: "Plein format", l: 35.6, h: 20.0, type: "bayer",
      detail: "1 capteur CMOS 24 × 36 (matrice de Bayer), recadré en 16:9",
      pas: 8.4
    },
    isoBase: 100,
    sensibilite: {
      type: "iso",
      valeurs: [100, 200, 400, 800, 1600, 3200, 6400, 10000, 12800, 25600, 51200, 102400],
      defaut: 800
    },
    obturations: [25, 50, 60, 100, 125, 250, 500, 1000, 2000, 4000, 8000],
    nd: [
      { nom: "Aucun", t: 1 }, { nom: "ND4", t: 1 / 4 }, { nom: "ND16", t: 1 / 16 }, { nom: "ND64", t: 1 / 64 }
    ],
    ndNom: "Filtre ND vissé",
    blancs: null,                  // réglage libre en kelvins
    saturationCapteur: 8,
    // Deux étages de gain : à partir de 12 800 ISO, le bruit de lecture retombe.
    bruit: { lecture: 0.00008, lectureHaut: 0.000016, isoHaut: 12800, grenaille: 0.0012 },
    gammas: [
      { id: "itu709", nom: "ITU709" },
      { id: "scinetone", nom: "S-Cinetone" },
      { id: "slog3", nom: "S-Log3" }
    ],
    objectif: {
      nom: "Zoom photo 24–70 mm f/2,8",
      monture: "Monture E",
      type: "varifocal",
      fMin: 24, fMax: 70,
      nMin: 2.8, nMax: 22,
      fRampe: null,
      doubleur: false,
      map: 0.38,
      lames: 9, arrondi: 0.7,      // 9 lames arrondies : flous presque circulaires
      respiration: 0.07,           // le cadre se resserre de 7 % entre l'infini et la distance minimale
      varifocal: 0.3,              // glissement du plan net entre 24 mm et 70 mm, en dioptries
      acLat: [[24, 0.003], [35, 0.0014], [50, -0.0002], [70, -0.0013]],
      distorsion: [[24, -0.034], [35, -0.012], [50, 0.006], [70, 0.016]],
      vignettage: [[24, 1.4], [35, 1.0], [50, 0.8], [70, 1.0]],
      cosP: 2.5,
      acLon: 1 / 1500,
      spherique: 0.012,
      bords: 2.2
    }
  }
};

// Les trois couleurs « moyennes » vues par le capteur, en millimètres (pour la diffraction).
const LONGUEURS_ONDE = [0.00062, 0.00054, 0.00046];

const Optique = {

  // Valeur d'une table [[focale, valeur], …] à la focale f (interpolation sur une échelle logarithmique).
  table(t, f) {
    if (f <= t[0][0]) return t[0][1];
    for (let i = 1; i < t.length; i++) {
      if (f <= t[i][0]) {
        const k = Math.log(f / t[i - 1][0]) / Math.log(t[i][0] / t[i - 1][0]);
        return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * k;
      }
    }
    return t[t.length - 1][1];
  },

  /* La couleur d'une lumière « blanche » de température K (en kelvins), en
     RVB linéaire, normalisée à la même luminosité. Formules de Krystek pour
     le lieu des corps noirs, puis passage en sRGB. 6500 K donne (1, 1, 1). */
  couleurTemperature(K) {
    const u = (0.860117757 + 1.54118254e-4 * K + 1.28641212e-7 * K * K) / (1 + 8.42420235e-4 * K + 7.08145163e-7 * K * K);
    const v = (0.317398726 + 4.22806245e-5 * K + 4.20481691e-8 * K * K) / (1 - 2.89741816e-5 * K + 1.61456053e-7 * K * K);
    const x = 3 * u / (2 * u - 8 * v + 4), y = 2 * v / (2 * u - 8 * v + 4);
    const X = x / y, Z = (1 - x - y) / y;
    let r = 3.2406 * X - 1.5372 - 0.4986 * Z;
    let g = -0.9689 * X + 1.8758 + 0.0415 * Z;
    let b = 0.0557 * X - 0.2040 + 1.0570 * Z;
    r = Math.max(r, 0.02); g = Math.max(g, 0.02); b = Math.max(b, 0.02);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [r / lum, g / lum, b / lum];
  },

  // Focale réelle : bague de zoom × doubleur × « respiration » de la mise au point.
  focale(cfg, r) {
    const o = cfg.objectif;
    let f = r.focale * (o.doubleur && r.doubleur ? 2 : 1);
    if (o.respiration) f *= 1 + o.respiration * r.bague * o.map;
    return f;
  },

  // Ouverture réelle : la bague, limitée par la chute en longue focale, × 2 avec le doubleur.
  ouverture(cfg, r) {
    const o = cfg.objectif;
    let n = Math.max(r.ouverture, o.nMin);
    if (o.fRampe && r.focale > o.fRampe) n = Math.max(n, o.nMin * r.focale / o.fRampe);
    if (o.doubleur && r.doubleur) n *= 2;
    return n;
  },

  /* De combien le plan net s'écarte de ce qu'indique la bague, en dioptries.
     - Zoom varifocal : le plan net glisse quand on zoome (la bague n'est
       « juste » qu'à la focale la plus courte ; en zoomant, le plan net
       s'éloigne, jusqu'à dépasser l'infini).
     - Zoom parfocal mal calé : un tirage optique faux de e millimètres
       déplace le plan net de e / f² : énorme en grand-angle, négligeable en
       téléobjectif. C'est exactement ce qu'on observe sur un plateau. */
  glissement(cfg, r, f) {
    const o = cfg.objectif;
    if (o.varifocal) return -o.varifocal * (r.focale - o.fMin) / (o.fMax - o.fMin);
    return (r.tirage || 0) * 1000 / (f * f);
  },

  /* LE CALCUL COMPLET — appelé à chaque changement de réglage.
     cfg : la configuration ; r : ses réglages ; commun : ce qui ne dépend pas
     de la caméra (lumière du plateau, niveau des défauts). */
  calculer(cfg, r, commun) {
    const o = cfg.objectif, cap = cfg.capteur;
    const f = Optique.focale(cfg, r);
    const N = Optique.ouverture(cfg, r);
    const demiDiag = 0.5 * Math.hypot(cap.l, cap.h);

    // --- Mise au point ---
    const glisse = Optique.glissement(cfg, r, f);
    const dNette = r.bague + glisse;                 // dioptries du plan réellement net
    const distNette = dNette > 1e-4 ? 1 / dNette : Infinity;

    // --- Profondeur de champ ---
    // Cercle de confusion toléré : la diagonale / 1500 (environ un pixel HD).
    const c0 = 2 * demiDiag / 1500;
    const demiPdc = N * c0 * 1000 / (f * f);         // en dioptries, de part et d'autre du plan net
    const pres = dNette + demiPdc > 1e-4 ? 1 / (dNette + demiPdc) : Infinity;
    const loin = dNette - demiPdc > 1e-4 ? 1 / (dNette - demiPdc) : Infinity;
    const hyperfocale = f * f / (N * c0) / 1000;

    // --- Exposition ---
    // Formule du posemètre en lumière incidente : N² / t = E × S / 250.
    // « expo » vaut 1 quand le réglage est celui que donnerait la cellule.
    const t = 1 / r.obturation;
    const iso = cfg.sensibilite.type === "gain" ? cfg.isoBase * Math.pow(10, r.sensibilite / 20) : r.sensibilite;
    const nd = cfg.nd[r.nd] || cfg.nd[0];
    const expo = commun.lux * iso * t * nd.t / (250 * N * N);

    // --- Bruit --- (écart-type, en fraction du blanc)
    const gain = iso / cfg.isoBase;
    const b = cfg.bruit;
    const lecture = (b.isoHaut && iso >= b.isoHaut ? b.lectureHaut : b.lecture) * gain;
    const bruit = { a2: lecture * lecture, b2: b.grenaille * b.grenaille * gain };

    // --- Défauts optiques ---
    const niveau = commun.defauts.niveau;            // 0 = corrigés, 1 = réalistes, 3 = accentués
    const actif = function (cle) { return niveau > 0 && commun.defauts[cle] ? 1 : 0; };
    const ext = o.doubleur && r.doubleur ? 1.5 : 1;  // le doubleur grossit aussi les défauts
    const ouvert = Math.max(0, 1 - Math.log2(N / (o.nMin * (o.doubleur && r.doubleur ? 2 : 1))) / 2.5); // 1 à pleine ouverture, 0 deux diaphs et demi plus loin
    const doux = 1 + 0.25 * (niveau - 1);            // le vignettage et la distorsion s'accentuent moins que le reste
    const defauts = {
      acLat: Optique.table(o.acLat, r.focale) * ext * niveau * actif("acLat"),
      distorsion: Optique.table(o.distorsion, r.focale) * actif("distorsion"),
      vignettage: Optique.table(o.vignettage, r.focale) * Math.pow(ouvert, 1.4) * doux * actif("vignettage"),
      cosP: o.cosP * doux * actif("vignettage"),
      tanMax: demiDiag / f,
      // Aberration chromatique longitudinale : le rouge et le bleu font le point un peu derrière le vert.
      acLon: o.acLon * f * ext * niveau * actif("acLon"),
      // Diffraction : rayon de la tache ≈ longueur d'onde × ouverture.
      diffraction: LONGUEURS_ONDE.map(function (l) { return l * N * niveau * actif("diffraction"); }),
      // Aberrations d'ouverture (sphérique, coma) : fortes à pleine ouverture, elles fondent en fermant.
      spherique: o.spherique * ext * Math.pow(ouvert, 2) * niveau * actif("pique"),
      bords: o.bords
    };

    return {
      f: f, N: N, demiDiag: demiDiag,
      nBague: r.ouverture,
      enRampe: !!(o.fRampe && r.focale > o.fRampe && r.ouverture < o.nMin * r.focale / o.fRampe),
      equivalent: f * 36 / cap.l,
      champH: 2 * Math.atan(cap.l / (2 * f)) * 180 / Math.PI,
      champV: 2 * Math.atan(cap.h / (2 * f)) * 180 / Math.PI,
      dBague: r.bague, glissement: glisse, dNette: dNette, distNette: distNette,
      c0: c0, pres: pres, loin: loin, hyperfocale: hyperfocale,
      t: t, iso: iso, nd: nd, expo: expo, il: Math.log2(expo),
      bruit: bruit,
      defauts: defauts,
      polygone: Math.min(1, Math.max(0, Math.log2(N / Optique.ouverture(cfg, Object.assign({}, r, { ouverture: o.nMin }))) / 1.2)) * (1 - o.arrondi)
    };
  },

  /* Diamètre de la tache de flou (cercle de confusion, en mm sur le capteur)
     d'un objet à la distance d (mètres). Loi des lentilles minces :
     écart de foyer = f² × (1/d − 1/distance nette), puis division par N. */
  flou(calc, d) {
    return Math.abs(calc.f * calc.f * 1e-3 * (1 / d - calc.dNette)) / calc.N;
  },

  // Position de bague (dioptries) pour que le plan net tombe à la distance d.
  bagueNette(cfg, r, d) {
    const glisse = Optique.glissement(cfg, r, Optique.focale(cfg, r));
    return Math.min(1 / cfg.objectif.map, Math.max(0, 1 / d - glisse));
  },

  // Ouverture qui donne l'exposition correcte (bouton « Iris auto »).
  ouvertureAuto(cfg, r, commun) {
    const essai = Optique.calculer(cfg, Object.assign({}, r, { ouverture: cfg.objectif.nMin, doubleur: false, focale: cfg.objectif.fMin }), commun);
    const facteur = cfg.objectif.doubleur && r.doubleur ? 2 : 1;
    const n = cfg.objectif.nMin * Math.sqrt(essai.expo) / facteur;
    return Math.min(cfg.objectif.nMax, Math.max(cfg.objectif.nMin, n));
  },

  /* ------------------------------------------------------------------------
     LA COURBE DE TRANSFERT : de la lumière reçue (x, linéaire, 1 = blanc
     diffus) au niveau vidéo (0 à 1,09 : 100 % = 1). Ordre des traitements :
     gamma → master black → black gamma → knee → écrêtage des blancs.
     Le shader de rendu.js applique exactement les mêmes formules : toute
     modification ici est à reporter là-bas (fonction « signal »).
     ------------------------------------------------------------------------ */
  signal(x, r) {
    x = Math.max(0, x);
    let v;
    if (r.gamma === "slog3") {
      // Courbe logarithmique S-Log3 (formule publiée par Sony) : 18 % → 41 %, 90 % → 61 %.
      v = x >= 0.01125 ? (420 + Math.log10((x + 0.01) / 0.19) * 261.5) / 1023 : (x * 76.2102946929 / 0.01125 + 95) / 1023;
    } else {
      // ITU-709 : un segment droit près du noir, puis une puissance 0,45
      // (l'exposant varie avec le « master gamma »).
      const g = 0.45 * Math.pow(2, -0.35 * (r.masterGamma || 0));
      v = x < 0.018 ? 4.5 * x : 1.099 * Math.pow(x, g) - 0.099;
      if (r.gamma === "scinetone") {
        // Approximation de S-Cinetone : noirs un peu relevés, contraste plus doux,
        // hautes lumières qui s'arrondissent d'elles-mêmes.
        v = 0.02 + 0.94 * v;
        if (v > 0.55) v = 0.55 + 0.47 * (1 - Math.exp(-(v - 0.55) / 0.47));
      }
    }
    // Master black (piédestal) : remonte ou descend le noir sans toucher au blanc.
    v += (r.masterBlack || 0) * 0.004 * (1 - v);
    // Black gamma : bosse (ou creux) limitée aux basses lumières.
    const plage = [0.14, 0.24, 0.38][r.bgPlage || 0];
    const niveau = (r.bgNiveau || 0) / 7;
    const tt = v / plage;
    if (tt > 0 && tt < 1) v += (niveau > 0 ? 0.4 : 0.14) * niveau * plage * 6.75 * tt * (1 - tt) * (1 - tt);
    // Knee : au-dessus du point de knee, la pente est fortement réduite.
    if (r.knee && v > r.kneePoint / 100) v = r.kneePoint / 100 + (v - r.kneePoint / 100) * Optique.pente(r);
    return Math.min(1.09, Math.max(0, v));
  },

  // La pente du knee : le réglage −5 … +5 double la pente tous les 2,5 crans.
  pente(r) { return 0.13 * Math.pow(2, (r.kneePente || 0) / 2.5); },

  // Écriture française d'un nombre : 2,8 ; 12 ; 0,35.
  nombre(v, decimales) {
    return v.toLocaleString("fr-FR", { minimumFractionDigits: decimales || 0, maximumFractionDigits: decimales || 0 });
  },
  // Une distance lisible : 85 cm ; 3,45 m ; 28 m ; ∞.
  distance(d) {
    if (!isFinite(d) || d > 80) return "∞";
    if (d < 1) return Math.round(d * 100) + " cm";
    return Optique.nombre(d, d < 10 ? 2 : d < 100 ? 1 : 0) + " m";
  },
  // Une ouverture : f/2,8 ; f/11.
  diaph(n) { return "f/" + Optique.nombre(n, n < 9.5 ? 1 : 0); }
};
