/* ==========================================================================
   anatomie.js — la coupe des deux objectifs et le schéma des capteurs
   --------------------------------------------------------------------------
   Deux schémas en SVG, redessinés à chaque changement de réglage :

   Anatomie.objectif(svg, v)   l'objectif coupé dans sa longueur. Les groupes
       de lentilles se déplacent avec les bagues, le diaphragme se ferme, et
       le faisceau de lumière montre où l'image du sujet se forme : sur le
       capteur (net) ou à côté (flou). C'est là qu'on VOIT la différence
       entre un zoom parfocal et un zoom varifocal.
       Les deux objectifs sont dessinés à la même échelle (3 pixels par mm).

   Anatomie.capteur(svg, v)    les deux capteurs à la même échelle, et la
       façon dont chacun mesure la couleur (prisme + 3 capteurs, ou matrice
       de Bayer).

   Chaque pièce porte un attribut data-cle : un clic affiche sa fiche
   (PIECES, dans textes.js). simulateur.js s'occupe des clics.
   ========================================================================== */

const Anatomie = (function () {
  "use strict";
  const AXE = 170;                 // hauteur de l'axe optique dans le dessin
  const n = function (v) { return Math.round(v * 10) / 10; };

  // Une lentille : x = centre, h = demi-hauteur, e = épaisseur au bord, c1 et c2 = bombé des deux faces (négatif = creux).
  function lentille(x, h, e, c1, c2) {
    return '<path class="an-verre" d="M' + n(x - e / 2) + " " + (AXE - h) + " Q" + n(x - e / 2 - 2 * c1) + " " + AXE + " " + n(x - e / 2) + " " + (AXE + h) +
      " L" + n(x + e / 2) + " " + (AXE + h) + " Q" + n(x + e / 2 + 2 * c2) + " " + AXE + " " + n(x + e / 2) + " " + (AXE - h) + ' Z"/>';
  }
  // Un groupe de lentilles cliquable.
  function groupe(cle, sel, x, lentilles, extra) {
    const hmax = Math.max.apply(null, lentilles.map(function (l) { return l[1]; }));
    const x0 = Math.min.apply(null, lentilles.map(function (l) { return l[0] - l[2] / 2 - Math.max(0, 2 * l[3]) / 2; })) - 6;
    const x1 = Math.max.apply(null, lentilles.map(function (l) { return l[0] + l[2] / 2 + Math.max(0, 2 * l[4]) / 2; })) + 6;
    return '<g class="piece' + (sel === cle ? " sel" : "") + '" data-cle="' + cle + '" tabindex="0" role="button" transform="translate(' + n(x) + ' 0)' + (extra || "") + '">' +
      '<rect class="an-zone" x="' + n(x0) + '" y="' + (AXE - hmax - 5) + '" width="' + n(x1 - x0) + '" height="' + (2 * hmax + 10) + '" rx="6"/>' +
      lentilles.map(function (l) { return lentille(l[0], l[1], l[2], l[3], l[4]); }).join("") + "</g>";
  }
  // Une bague : deux rectangles (haut et bas du fût), cliquables ensemble.
  function bague(cle, sel, x0, x1, r, nom) {
    let stries = "";
    for (let x = x0 + 5; x < x1 - 3; x += 7) stries += '<path d="M' + x + " " + (AXE - r - 1) + "v13M" + x + " " + (AXE + r - 12) + 'v13"/>';
    return '<g class="piece an-bague' + (sel === cle ? " sel" : "") + '" data-cle="' + cle + '" tabindex="0" role="button"><title>' + nom + "</title>" +
      '<rect x="' + x0 + '" y="' + (AXE - r - 2) + '" width="' + (x1 - x0) + '" height="15" rx="3"/><rect x="' + x0 + '" y="' + (AXE + r - 13) + '" width="' + (x1 - x0) + '" height="15" rx="3"/>' +
      '<g class="an-stries">' + stries + "</g></g>";
  }
  // Une étiquette reliée à sa pièce par un trait.
  function etiquette(cle, sel, texte, x, y, vx, vy) {
    return '<g class="piece an-etq' + (sel === cle ? " sel" : "") + '" data-cle="' + cle + '"><path d="M' + n(x) + " " + (y + (vy > y ? 6 : -6)) + "L" + n(vx) + " " + n(vy) + '"/>' +
      '<text x="' + n(x) + '" y="' + (y + 4) + '" text-anchor="middle">' + texte + "</text></g>";
  }
  // Le diaphragme : deux lames qui laissent une ouverture de rayon r.
  function iris(sel, x, r, rFut) {
    return '<g class="piece' + (sel === "p_iris" ? " sel" : "") + '" data-cle="p_iris" tabindex="0" role="button"><rect class="an-zone" x="' + (x - 9) + '" y="' + (AXE - rFut) + '" width="18" height="' + 2 * rFut + '" rx="5"/>' +
      '<path class="an-iris" d="M' + (x - 3) + " " + (AXE - rFut + 4) + "h6V" + n(AXE - r) + "h-6ZM" + (x - 3) + " " + (AXE + rFut - 4) + "h6V" + n(AXE + r) + 'h-6Z"/></g>';
  }
  // Le faisceau venu du sujet : deux rayons marginaux qui traversent les groupes et convergent vers le foyer.
  function rayons(points, xFoyer) {
    let d = "";
    [-1, 1].forEach(function (s) {
      d += "M0 " + n(AXE + s * points[0][1]);
      points.forEach(function (p) { d += " L" + n(p[0]) + " " + n(AXE + s * p[1]); });
      const dernier = points[points.length - 1], pente = dernier[1] / (xFoyer - dernier[0]);
      d += " L" + n(xFoyer) + " " + AXE + " L" + n(xFoyer + 40) + " " + n(AXE - s * pente * 40);
    });
    let surface = "M0 " + n(AXE - points[0][1]);
    points.forEach(function (p) { surface += " L" + n(p[0]) + " " + n(AXE - p[1]); });
    surface += " L" + n(xFoyer) + " " + AXE;
    points.slice().reverse().forEach(function (p) { surface += " L" + n(p[0]) + " " + n(AXE + p[1]); });
    surface += " L0 " + n(AXE + points[0][1]) + " Z";
    return '<path class="an-lumiere" d="' + surface + '"/><path class="an-rayons" d="' + d + '"/><path class="an-axe" d="M0 ' + AXE + 'H1000"/>';
  }

  /* Où se forme l'image du sujet, par rapport au capteur (en mm, exagéré à
     l'écran) : c'est le même calcul que pour le flou de l'image. */
  function foyer(v) {
    const ecart = v.calc.f * v.calc.f * 1e-3 * (1 / v.distance - v.calc.dNette);   // mm, positif = derrière le capteur
    const flou = Math.abs(ecart) / v.calc.N;
    return { ecart: ecart, net: flou < v.calc.c0 * 1.2, px: Math.max(-70, Math.min(70, ecart * 90)) };
  }
  function legendeFoyer(f, xCapteur, v, xTexte, yTexte, ancre) {
    const x = xCapteur + f.px;
    let t = f.net ? "Image du sujet sur le capteur : net" : "Image du sujet " + Optique.nombre(Math.abs(f.ecart), 2) + " mm " + (f.ecart > 0 ? "derrière" : "devant") + " le capteur : flou";
    let s = '<circle class="an-foyer' + (f.net ? " net" : "") + '" cx="' + n(x) + '" cy="' + AXE + '" r="5.5"/>';
    // Aberration chromatique longitudinale : le rouge et le bleu font le point un peu plus loin.
    if (v.calc.defauts.acLon > 0) s += '<circle cx="' + n(x + v.calc.defauts.acLon * 90) + '" cy="' + (AXE - 9) + '" r="2.6" fill="#ff5a4d"/><circle cx="' + n(x + 0.7 * v.calc.defauts.acLon * 90) + '" cy="' + (AXE + 9) + '" r="2.6" fill="#5a8cff"/>';
    s += '<text class="an-note ' + (f.net ? "ok" : "ko") + '" x="' + xTexte + '" y="' + yTexte + '" text-anchor="' + ancre + '">' + t + "</text>";
    return s;
  }

  /* ------------------------------------------------------------------------
     ZOOM BROADCAST PARFOCAL + tête de caméra tri-capteur
     ------------------------------------------------------------------------ */
  function objectifPlateau(v, sel) {
    const o = v.cfg.objectif, r = v.r;
    const t = Math.log(r.focale / o.fMin) / Math.log(o.fMax / o.fMin);          // position du zoom, de 0 à 1
    const xFocus = 150 - 16 * r.bague * o.map;                                  // le groupe avant avance pour les sujets proches
    const xVar = 250 + 135 * t, xComp = 452 - 40 * Math.sin(Math.PI * t);
    const xTirage = 632 + Math.max(-14, Math.min(14, (r.tirage || 0) * 110));
    const rIris = Math.max(3, 46 * o.nMin / Math.max(r.ouverture, o.nMin));
    const hEntree = Math.max(4, Math.min(100, v.calc.f / (v.calc.N * (r.doubleur ? 0.5 : 1)) * 1.5 * (r.doubleur ? 0.5 : 1)));
    const xCapteur = 844, f = foyer(v);
    const fut = '<path class="an-fut" d="M40 38 L100 50 H240 V56 H380 V64 H470 V60 H590 V72 H670 V90 H700 V250 H670 V268 H590 V280 H470 V276 H380 V284 H240 V290 H100 L40 302 V288 L96 278 H236 V272 H376 V264 H466 V268 H586 V256 H666 V240 H684 V100 H666 V84 H586 V72 H466 V76 H376 V68 H236 V62 H96 L40 52 Z"/>';
    let s = fut;
    // La tête de caméra : prisme et trois capteurs
    s += '<path class="an-boitier" d="M700 58 H1000 V282 H700 Z"/>';
    s += '<g class="piece' + (sel === "p_prisme" ? " sel" : "") + '" data-cle="p_prisme" tabindex="0" role="button"><path class="an-prisme" d="M716 128 L772 112 L812 150 V190 L772 228 L716 212 Z"/><path class="an-dichro" d="M736 122 L790 190 M736 218 L790 150"/></g>';
    s += '<g class="piece' + (sel === "p_capteurs_tri" ? " sel" : "") + '" data-cle="p_capteurs_tri" tabindex="0" role="button">' +
      '<rect class="an-capteur" x="' + xCapteur + '" y="' + (AXE - 9) + '" width="7" height="18" fill="#39d353"/><rect class="an-capteur" x="752" y="92" width="18" height="7" fill="#5a8cff" transform="rotate(-16 761 95)"/><rect class="an-capteur" x="752" y="241" width="18" height="7" fill="#ff5a4d" transform="rotate(16 761 245)"/>' +
      '<text class="an-rvb" x="864" y="' + (AXE + 4) + '" fill="#39d353">V</text><text class="an-rvb" x="776" y="86" fill="#5a8cff">B</text><text class="an-rvb" x="776" y="262" fill="#ff5a4d">R</text></g>';
    s += '<path class="an-split" stroke="#5a8cff" d="M764 ' + AXE + ' L761 99"/><path class="an-split" stroke="#ff5a4d" d="M764 ' + AXE + ' L761 241"/>';
    // La lumière
    const hIris = rIris * 0.9;
    s += rayons([[xFocus, hEntree], [xVar, hEntree * 0.55 + hIris * 0.45], [xComp, hEntree * 0.25 + hIris * 0.75], [478, hIris], [533, Math.min(46, hIris * 1.05)]], xCapteur + f.px);
    // Les groupes de lentilles
    s += groupe("p_focus", sel, xFocus, [[0, 100, 26, 13, 6], [36, 96, 12, 5, -5]]);
    s += groupe("p_variateur", sel, xVar, [[0, 60, 10, -7, -7], [24, 56, 12, -5, 4]]);
    s += groupe("p_compensateur", sel, xComp, [[0, 54, 14, 6, 6]]);
    s += iris(sel, 478, rIris, 62);
    s += groupe("p_relais", sel, 520, [[0, 50, 14, 6, 6], [26, 46, 10, 4, -3]]);
    s += r.doubleur ? groupe("p_doubleur", sel, 575, [[0, 38, 8, -4, -4], [16, 38, 10, 5, 3]]) :
      groupe("p_doubleur", sel, 575, [[0, 38, 8, -4, -4], [16, 38, 10, 5, 3]], " translate(0 -62) scale(1 .28)").replace('class="piece', 'class="piece an-range');
    s += groupe("p_tirage", sel, xTirage, [[0, 40, 12, 5, 5]]);
    // Les bagues
    s += bague("p_bague_focus", sel, 104, 232, 120, "Bague de mise au point");
    s += bague("p_bague_zoom", sel, 244, 372, 114, "Bague de zoom");
    s += bague("p_bague_iris", sel, 384, 462, 106, "Bague de diaphragme");
    s += bague("p_tirage", sel, 594, 662, 98, "Bague de tirage optique");
    s += '<g class="piece' + (sel === "p_monture_b4" ? " sel" : "") + '" data-cle="p_monture_b4" tabindex="0" role="button"><rect class="an-monture" x="684" y="92" width="16" height="156" rx="3"/></g>';
    // Les étiquettes
    s += etiquette("p_bague_focus", sel, "Mise au point", 168, 18, 168, 48);
    s += etiquette("p_bague_zoom", sel, "Zoom", 308, 18, 308, 54);
    s += etiquette("p_bague_iris", sel, "Diaphragme", 423, 18, 423, 62);
    s += etiquette("p_doubleur", sel, r.doubleur ? "Doubleur engagé" : "Doubleur", 548, 18, 580, r.doubleur ? 128 : 96);
    s += etiquette("p_tirage", sel, "Tirage", 650, 18, 628, 70);
    s += etiquette("p_prisme", sel, "Prisme", 800, 44, 780, 118);
    s += etiquette("p_capteurs_tri", sel, "3 capteurs 2/3″", 918, 118, 852, 166);
    s += etiquette("p_variateur", sel, "Variateur", n(xVar + 12), 300, n(xVar + 12), 232);
    s += etiquette("p_compensateur", sel, "Compensateur", n(Math.max(xComp, xVar + 130)), 322, n(xComp), 226);
    s += etiquette("p_focus", sel, "Mise au point", 120, 322, n(xFocus + 10), 272);
    s += legendeFoyer(f, xCapteur, v, 985, 318, "end");
    return s;
  }

  /* ------------------------------------------------------------------------
     ZOOM PHOTO VARIFOCAL + boîtier à grand capteur
     ------------------------------------------------------------------------ */
  function objectifBoitier(v, sel) {
    const o = v.cfg.objectif, r = v.r;
    const t = (r.focale - o.fMin) / (o.fMax - o.fMin);
    const xAvant = 262 - 84 * t;                       // le fût s'allonge en longue focale
    const xVar = 392 + 46 * t, xVar2 = 452 + 22 * t;
    const xFocus = 548 - 24 * r.bague * o.map;
    const rIris = Math.max(3, 58 * o.nMin / Math.max(r.ouverture, o.nMin));
    const hEntree = Math.max(4, Math.min(104, v.calc.f / v.calc.N * 1.5));
    const xCapteur = 704, f = foyer(v);
    let s = "";
    // Le tube coulissant, puis le fût fixe
    s += '<path class="an-fut an-tube" d="M' + n(xAvant - 6) + " 46 H372 V60 H" + n(xAvant - 6) + " ZM" + n(xAvant - 6) + " 280 H372 V294 H" + n(xAvant - 6) + ' Z"/>';
    s += '<path class="an-fut" d="M356 36 H650 V78 H636 V52 H356 Z M356 304 H650 V262 H636 V288 H356 Z"/>';
    // Le boîtier et son capteur
    s += '<path class="an-boitier" d="M650 30 H800 V310 H650 Z"/>';
    s += '<g class="piece' + (sel === "p_capteur_bayer" ? " sel" : "") + '" data-cle="p_capteur_bayer" tabindex="0" role="button"><rect class="an-capteur" x="' + xCapteur + '" y="' + (AXE - 36) + '" width="9" height="72" fill="#8a93a3"/>';
    for (let i = 0; i < 12; i++) s += '<rect x="' + (xCapteur - 3) + '" y="' + (AXE - 36 + i * 6) + '" width="3" height="6" fill="' + (i % 2 ? "#39d353" : i % 4 ? "#5a8cff" : "#ff5a4d") + '"/>';
    s += "</g>";
    const hIris = rIris * 0.9;
    s += rayons([[xAvant + 34, hEntree], [xVar, hEntree * 0.6 + hIris * 0.4], [xVar2, hEntree * 0.3 + hIris * 0.7], [506, hIris], [612, Math.min(56, hIris * 1.02)]], xCapteur + f.px);
    s += groupe("p_frontale", sel, xAvant + 34, [[0, 104, 28, 13, 3], [44, 92, 10, -2, -8]]);
    s += groupe("p_variateur_photo", sel, xVar, [[0, 64, 10, -6, -5]]);
    s += groupe("p_variateur_photo", sel, xVar2, [[0, 58, 14, 6, 5]]);
    s += iris(sel, 506, rIris, 76);
    s += groupe("p_focus_interne", sel, xFocus, [[0, 44, 9, -4, -3]]);
    s += groupe("p_arriere", sel, 596, [[0, 60, 16, 6, 5], [26, 64, 10, 3, -4]]);
    s += bague("p_bague_focus", sel, 368, 444, 134, "Bague de mise au point");
    s += bague("p_bague_zoom", sel, 456, 572, 134, "Bague de zoom");
    s += bague("p_bague_iris", sel, 584, 630, 134, "Bague de diaphragme");
    s += '<g class="piece' + (sel === "p_monture_e" ? " sel" : "") + '" data-cle="p_monture_e" tabindex="0" role="button"><rect class="an-monture" x="636" y="74" width="16" height="192" rx="3"/></g>';
    s += etiquette("p_bague_focus", sel, "Mise au point", 380, 14, 406, 34);
    s += etiquette("p_bague_zoom", sel, "Zoom", 514, 14, 514, 34);
    s += etiquette("p_bague_iris", sel, "Diaphragme", 626, 14, 607, 34);
    s += etiquette("p_frontale", sel, "Groupe frontal", n(xAvant + 50), 322, n(xAvant + 50), 284);
    s += etiquette("p_variateur_photo", sel, "Groupes de zoom", n(xVar + 96), 322, n(xVar2 + 4), 236);
    s += etiquette("p_focus_interne", sel, "Mise au point interne", 870, 246, n(xFocus + 4), 216);
    s += etiquette("p_capteur_bayer", sel, "Capteur plein format", 870, 100, 716, 150);
    s += etiquette("p_monture_e", sel, "Monture E", 870, 56, 652, 80);
    s += legendeFoyer(f, xCapteur, v, 985, 322, "end");
    return s;
  }

  function objectif(svg, v, sel) {
    svg.setAttribute("viewBox", "0 0 1000 330");
    svg.innerHTML = v.config === "plateau" ? objectifPlateau(v, sel) : objectifBoitier(v, sel);
  }

  /* ------------------------------------------------------------------------
     LES CAPTEURS : tailles comparées, et mesure de la couleur
     ------------------------------------------------------------------------ */
  function capteur(svg, v, sel) {
    svg.setAttribute("viewBox", "0 0 1000 330");
    const tri = v.config === "plateau";
    const e = 10.4, cx = 232, cy = 168;     // 10,4 pixels par millimètre
    const rectMm = function (l, h, classe) { return '<rect class="' + classe + '" x="' + n(cx - l * e / 2) + '" y="' + n(cy - h * e / 2) + '" width="' + n(l * e) + '" height="' + n(h * e) + '" rx="3"/>'; };
    let s = '<text class="an-titre" x="232" y="24" text-anchor="middle">Les deux capteurs, à la même échelle</text>';
    s += rectMm(35.6, 23.8, "an-cadre-photo");
    s += '<g class="piece' + (sel === "p_capteur_bayer" ? " sel" : "") + '" data-cle="p_capteur_bayer" tabindex="0" role="button">' + rectMm(35.6, 20.0, "an-format" + (tri ? "" : " actif")) + "</g>";
    s += '<g class="piece' + (sel === "p_capteurs_tri" ? " sel" : "") + '" data-cle="p_capteurs_tri" tabindex="0" role="button">' + rectMm(9.59, 5.39, "an-format" + (tri ? " actif" : "")) + "</g>";
    s += '<text class="an-cote' + (tri ? "" : " actif") + '" x="232" y="' + n(cy + 10 * e - 10) + '" text-anchor="middle">Plein format, zone 16:9 : 35,6 × 20,0 mm</text>';
    s += '<text class="an-cote' + (tri ? " actif" : "") + '" x="232" y="' + n(cy + 2.7 * e + 18) + '" text-anchor="middle">2/3″ : 9,6 × 5,4 mm</text>';
    s += '<text class="an-cote" x="232" y="320" text-anchor="middle">3,7 fois plus large · 14 fois plus de surface</text>';

    // À droite : comment la couleur est mesurée
    s += '<text class="an-titre" x="745" y="24" text-anchor="middle">' + (tri ? "Un prisme, trois capteurs" : "Un capteur, une mosaïque de filtres") + "</text>";
    if (tri) {
      s += '<path class="an-blanc" d="M520 150 H640"/><path class="an-fleche" d="M632 143 l10 7 -10 7"/>';
      s += '<g class="piece' + (sel === "p_prisme" ? " sel" : "") + '" data-cle="p_prisme" tabindex="0" role="button"><path class="an-prisme" d="M640 96 L720 70 L790 124 V176 L720 230 L640 204 Z"/><path class="an-dichro" d="M668 88 L752 190 M668 212 L752 110"/></g>';
      s += '<path class="an-split" stroke="#39d353" d="M700 150 H800"/><path class="an-split" stroke="#5a8cff" d="M700 150 L714 66"/><path class="an-split" stroke="#ff5a4d" d="M700 150 L714 234"/>';
      s += '<g class="piece' + (sel === "p_capteurs_tri" ? " sel" : "") + '" data-cle="p_capteurs_tri" tabindex="0" role="button">' +
        '<rect class="an-puce" x="802" y="122" width="16" height="56" fill="#39d353"/><rect class="an-puce" x="690" y="46" width="56" height="16" fill="#5a8cff" transform="rotate(-18 718 54)"/><rect class="an-puce" x="690" y="238" width="56" height="16" fill="#ff5a4d" transform="rotate(18 718 246)"/></g>';
      s += '<text class="an-cote" x="828" y="154">Vert</text><text class="an-cote" x="756" y="44">Bleu</text><text class="an-cote" x="756" y="264">Rouge</text>';
      s += '<text class="an-legende" x="745" y="298" text-anchor="middle">Chaque point de l’image est mesuré dans les trois couleurs.</text>';
      s += '<text class="an-legende" x="745" y="318" text-anchor="middle">Photosites de 5 µm · sensibilité F13 à 2 000 lux</text>';
    } else {
      const teintes = ["#ff5a4d", "#39d353", "#39d353", "#5a8cff"];
      s += '<g class="piece' + (sel === "p_capteur_bayer" ? " sel" : "") + '" data-cle="p_capteur_bayer" tabindex="0" role="button">';
      for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) s += '<rect x="' + (560 + i * 30) + '" y="' + (58 + j * 30) + '" width="28" height="28" rx="4" fill="' + teintes[(j % 2) * 2 + (i % 2)] + '" opacity=".92"/>';
      s += "</g>";
      s += '<path class="an-blanc" d="M812 148 H862"/><path class="an-fleche" d="M854 141 l10 7 -10 7"/>';
      s += '<rect x="876" y="118" width="60" height="60" rx="8" fill="#e9c9a0"/><text class="an-cote" x="906" y="198" text-anchor="middle">1 pixel RVB</text><text class="an-cote" x="838" y="134" text-anchor="middle">calcul</text>';
      s += '<text class="an-legende" x="745" y="268" text-anchor="middle">Chaque photosite ne mesure qu’une couleur :</text>';
      s += '<text class="an-legende" x="745" y="288" text-anchor="middle">les deux autres sont calculées d’après ses voisins (dématriçage).</text>';
      s += '<text class="an-legende" x="745" y="318" text-anchor="middle">Photosites de 8,4 µm · deux sensibilités de base</text>';
    }
    svg.innerHTML = s;
  }

  return { objectif: objectif, capteur: capteur };
})();
