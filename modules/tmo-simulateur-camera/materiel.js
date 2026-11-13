/* ==========================================================================
   materiel.js — les dessins du matériel, de profil, en mètres
   --------------------------------------------------------------------------
   Les deux configurations telles qu'on les voit de côté :
     - la caméra de plateau sur son pied de studio, objectif vers la droite ;
     - le boîtier sur son trépied ;
     - la régie vision, de face : table, CCU, RCP et moniteur de contrôle.
   Ces dessins vectoriels (Canvas 2D) sont utilisés par scene.js, qui les
   pose dans la grande scène, et par profondeur.js (vue de côté).
   Origine des deux caméras : le capteur, sur l'axe optique ; y vers le bas ;
   le sol est à y = 1,35 m.
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

  /* Les repères cliquables posés sur le matériel quand les explications sont
     affichées : position (dans le repère du dessin correspondant) et fiche
     d'AIDES (textes.js). */
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

  // Le cadre de chaque dessin (en mètres, dans son repère) : scene.js s'en sert pour le photographier.
  const CADRES = {
    plateau: { x0: -0.78, y0: -0.5, x1: 0.44, y1: 1.39, epaisseur: 0.16 },
    boitier: { x0: -0.47, y0: -0.18, x1: 0.45, y1: 1.39, epaisseur: 0.075 },
    regie: { x0: 0, y0: 0, x1: 1.3, y1: 1.5, epaisseur: 0.42 }
  };

  return { cameraPlateau: cameraPlateau, boitier: boitier, regie: regie, REPERES: REPERES, CADRES: CADRES };
})();
