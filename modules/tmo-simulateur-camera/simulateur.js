/* ==========================================================================
   simulateur.js — le chef d'orchestre
   --------------------------------------------------------------------------
   Ce fichier relie tout le reste :
     1. l'ÉTAT : la configuration choisie, les réglages de chaque caméra, la
        lumière du plateau, le cadre ;
     2. les RÉGLAGES : la colonne de droite (curseurs, choix, explications) ;
     3. la mise à jour : à chaque geste, on recalcule l'optique
        (Optique.calculer), puis on redessine l'image (Rendu), la maquette
        (Plateau), les schémas (Anatomie), les instruments (Signal) et le
        commentaire ;
     4. le cadrage à la souris, la loupe, la roue ;
     5. les expériences guidées (textes.js).

   Pour ajouter un réglage : une ligne dans le bon panneau (PANNEAUX), une
   fiche dans AIDES (textes.js) et, si la physique change, optique.js.
   ========================================================================== */

(function () {
  "use strict";

  const RAD = Math.PI / 180;
  const VITESSE_ROUE = 7;            // radians par seconde (un peu plus d'un tour)
  const $ = function (id) { return document.getElementById(id); };
  function el(balise, classe, html) {
    const e = document.createElement(balise);
    if (classe) e.className = classe;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  const reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     1. L'ÉTAT
     ------------------------------------------------------------------------ */
  function reglagesInitiaux(id) {
    const propres = id === "plateau" ? { focale: 10.8, ouverture: 4.5, sensibilite: 0 } : { focale: 40, ouverture: 4, sensibilite: 800 };
    return Object.assign({
      doubleur: false, bague: 0, tirage: 0,
      obturation: 50, nd: 1, blanc: 5600,
      gamma: "itu709", masterGamma: 0, masterBlack: 0, bgNiveau: 0, bgPlage: 1,
      knee: true, kneePoint: 90, kneePente: 0, saturation: 0, detail: 0
    }, propres);
  }
  const etat = {
    config: "plateau",
    reglages: { plateau: reglagesInitiaux("plateau"), boitier: reglagesInitiaux("boitier") },
    commun: { lux: 1000, kelvin: 5600, defauts: { niveau: 3, acLat: true, acLon: true, vignettage: true, diffraction: true, distorsion: true, pique: true } },
    distance: 3.5, pan: 0, tilt: -2 * RAD,
    loupe: { zoom: 1, x: 0, y: 0 },
    aides: { zebra: 0, peaking: false },
    roue: false, roueAngle: 0.3,
    onglet: "objectif", explorer: "materiel",
    piece: { materiel: null, anatomie: null, capteur: null },
    dernier: null, calc: null, experience: null
  };
  const cfg = function () { return CONFIGS[etat.config]; };
  const reg = function () { return etat.reglages[etat.config]; };
  const camZ = function () { return Decor.SUJET_Z - etat.distance; };

  // Garde chaque réglage dans les limites du matériel.
  function borner() {
    Object.keys(CONFIGS).forEach(function (id) {
      const c = CONFIGS[id], o = c.objectif, r = etat.reglages[id];
      r.focale = Math.min(o.fMax, Math.max(o.fMin, r.focale));
      r.ouverture = Math.min(o.nMax, Math.max(o.nMin, r.ouverture));
      r.bague = Math.min(1 / o.map, Math.max(0, r.bague));
      if (!o.doubleur) r.doubleur = false;
      if (!c.gammas.some(function (g) { return g.id === r.gamma; })) r.gamma = c.gammas[0].id;
    });
    etat.pan = Math.min(40 * RAD, Math.max(-40 * RAD, etat.pan));
    etat.tilt = Math.min(16 * RAD, Math.max(-22 * RAD, etat.tilt));
    const lim = 1 - 1 / etat.loupe.zoom;
    etat.loupe.x = Math.min(lim, Math.max(-lim, etat.loupe.x)); etat.loupe.y = Math.min(lim, Math.max(-lim, etat.loupe.y));
  }

  /* ------------------------------------------------------------------------
     2. LES RÉGLAGES — de petites fabriques, puis un panneau par onglet
     ------------------------------------------------------------------------ */
  let rafraichir = [];               // les fonctions qui remettent chaque réglage à jour à l'écran

  // Le texte d'une fiche d'explication.
  function ficheHTML(a, titre) {
    if (!a) return "";
    let h = titre ? "<h4>" + a.titre + "</h4>" : "";
    h += "<p>" + a.quoi + "</p>";
    if (a.image) h += '<p class="comparaison"><b>Comparaison.</b> ' + a.image + "</p>";
    if (a.observer) h += '<p><b>À observer.</b> ' + a.observer + "</p>";
    if (a[etat.config]) h += '<p class="propre"><b>' + cfg().nom + ".</b> " + a[etat.config] + "</p>";
    return h;
  }

  // L'ossature d'un réglage : nom, valeur, bouton « ? » et fiche repliée.
  function bloc(cle, nom, aide) {
    const racine = el("div", "reg"); racine.dataset.cle = cle;
    const tete = el("div", "reg-tete");
    const sortie = el("output");
    const bouton = el("button", "reg-aide", "?"); bouton.type = "button";
    bouton.title = "Explication : " + nom; bouton.setAttribute("aria-label", bouton.title); bouton.setAttribute("aria-expanded", "false");
    const fiche = el("div", "reg-fiche"); fiche.hidden = true;
    bouton.addEventListener("click", function () {
      fiche.hidden = !fiche.hidden;
      bouton.setAttribute("aria-expanded", String(!fiche.hidden));
      if (!fiche.hidden) fiche.innerHTML = ficheHTML(AIDES[aide || cle], false);
    });
    tete.append(el("span", "reg-nom", nom), sortie, bouton);
    const corps = el("div", "reg-corps");
    racine.append(tete, corps, fiche);
    return { racine: racine, corps: corps, sortie: sortie };
  }

  // Un curseur. o : { min, max, pas, lire(), ecrire(v), texte(), aide }
  function curseur(cle, nom, o) {
    const b = bloc(cle, nom, o.aide);
    const i = el("input"); i.type = "range"; i.min = o.min; i.max = o.max; i.step = o.pas || 1; i.setAttribute("aria-label", nom);
    i.addEventListener("input", function () { o.ecrire(parseFloat(i.value)); geste(); maj(cle); });
    b.corps.append(i);
    rafraichir.push(function () {
      const v = o.lire(); i.value = v;
      i.style.setProperty("--p", (v - o.min) / (o.max - o.min) * 100 + "%");
      b.sortie.innerHTML = o.texte();
    });
    return b;
  }

  // Un choix entre quelques valeurs (contrôle segmenté). options : [{ v, nom }]
  function choix(cle, nom, o) {
    const b = bloc(cle, nom, o.aide);
    const seg = el("div", "seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", nom);
    o.options.forEach(function (op) {
      const bt = el("button", "", op.nom); bt.type = "button";
      bt.addEventListener("click", function () { o.ecrire(op.v); maj(cle); });
      seg.append(bt);
      rafraichir.push(function () { bt.setAttribute("aria-pressed", String(o.lire() === op.v)); });
    });
    b.corps.append(seg);
    if (o.texte) rafraichir.push(function () { b.sortie.innerHTML = o.texte(); });
    return b;
  }
  function bouton(nom, action, classe) {
    const bt = el("button", classe || "btn small", nom); bt.type = "button";
    bt.addEventListener("click", action);
    return bt;
  }
  function titre(t, sous) { const d = el("div", "reg-titre"); d.append(el("h3", "", t)); if (sous) d.append(el("p", "muted", sous)); return d; }

  // Un accès direct aux réglages de la configuration en cours : lire("focale"), ecrire("focale").
  const lire = function (cle) { return function () { return reg()[cle]; }; };
  const ecrire = function (cle) { return function (v) { reg()[cle] = v; }; };
  const signe = function (v, d) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Optique.nombre(Math.abs(v), d || 0); };

  const PANNEAUX = {
    /* ----- L'OBJECTIF : les bagues ----- */
    objectif: function (p) {
      const c = cfg(), o = c.objectif;
      p.append(titre(o.nom, o.monture + " · zoom <b>" + o.type + "</b>"));

      // Zoom : curseur logarithmique (chaque cran multiplie la focale, comme une vraie bague).
      p.append(curseur("focale", "Zoom · focale", {
        min: 0, max: 1000,
        lire: function () { return 1000 * Math.log(reg().focale / o.fMin) / Math.log(o.fMax / o.fMin); },
        ecrire: function (v) { reg().focale = o.fMin * Math.pow(o.fMax / o.fMin, v / 1000); },
        texte: function () { return Optique.nombre(etat.calc.f, etat.calc.f < 20 ? 1 : 0) + " mm"; }
      }).racine);
      if (o.doubleur) p.append(choix("doubleur", "Doubleur de focale", { options: [{ v: false, nom: "Hors service" }, { v: true, nom: "×2" }], lire: lire("doubleur"), ecrire: ecrire("doubleur") }).racine);

      // Mise au point : la bague est graduée en distance ; le curseur est resserré vers l'infini.
      const b = curseur("bague", "Mise au point", {
        min: 0, max: 1000,
        lire: function () { return 1000 * (1 - Math.sqrt(reg().bague * o.map)); },
        ecrire: function (v) { reg().bague = Math.pow(1 - v / 1000, 2) / o.map; },
        texte: function () { return reg().bague > 0.004 ? Optique.distance(1 / reg().bague) : "∞"; }
      });
      const etatPoint = el("p", "reg-etat");
      b.corps.append(etatPoint);
      rafraichir.push(function () {
        const k = etat.calc;
        // La bague dit une distance ; le plan net réel peut être ailleurs (zoom varifocal, tirage faux).
        if (Math.abs(k.glissement) > 0.004) etatPoint.innerHTML = "La bague indique " + (reg().bague > 0.004 ? Optique.distance(1 / reg().bague) : "l’infini") + ", mais le plan net est à <b>" + (isFinite(k.distNette) ? Optique.distance(k.distNette) : "plus que l’infini : rien n’est net") + "</b>.";
        else etatPoint.textContent = "";
      });
      if (o.type === "varifocal") {
        const rang = el("div", "btnrow");
        rang.append(bouton("AF · point au centre", function () { autofocus(); maj("af"); }));
        b.corps.append(rang);
      }
      p.append(b.racine);

      // Diaphragme : un cran de curseur = un tiers de diaphragme.
      const crans = Math.round(6 * Math.log2(o.nMax / o.nMin));
      const d = curseur("ouverture", "Diaphragme · ouverture", {
        min: 0, max: crans,
        lire: function () { return Math.round(6 * Math.log2(reg().ouverture / o.nMin)); },
        ecrire: function (v) { reg().ouverture = o.nMin * Math.pow(2, v / 6); },
        texte: function () { return Optique.diaph(reg().ouverture); }
      });
      const etatDiaph = el("p", "reg-etat");
      const rangD = el("div", "btnrow");
      rangD.append(bouton("Iris auto", function () { reg().ouverture = Optique.ouvertureAuto(cfg(), reg(), etat.commun); maj("ouverture"); }));
      d.corps.append(etatDiaph, rangD);
      rafraichir.push(function () {
        const k = etat.calc;
        if (reg().doubleur) etatDiaph.innerHTML = "Avec le doubleur, l’ouverture réelle est <b>" + Optique.diaph(k.N) + "</b> (2 diaphragmes perdus).";
        else if (k.enRampe) etatDiaph.innerHTML = "À cette focale, l’objectif n’ouvre plus qu’à <b>" + Optique.diaph(k.N) + "</b> (ramping).";
        else etatDiaph.textContent = "";
      });
      p.append(d.racine);

      if (o.type === "parfocal") {
        p.append(curseur("tirage", "Tirage optique (back focus)", {
          min: -0.15, max: 0.15, pas: 0.005, lire: lire("tirage"), ecrire: ecrire("tirage"),
          texte: function () { return Math.abs(reg().tirage) < 0.0025 ? "réglé" : signe(reg().tirage, 3) + " mm"; }
        }).racine);
      }
    },

    /* ----- L'EXPOSITION : lumière, ND, obturation, gain, blanc ----- */
    exposition: function (p) {
      const c = cfg();
      p.append(titre("Le plateau", "La lumière qui éclaire la scène."));
      p.append(choix("lux", "Éclairement", {
        options: [30, 125, 500, 1000, 2000].map(function (v) { return { v: v, nom: Optique.nombre(v) }; }),
        lire: function () { return etat.commun.lux; }, ecrire: function (v) { etat.commun.lux = v; },
        texte: function () { return Optique.nombre(etat.commun.lux) + " lux"; }
      }).racine);
      p.append(choix("kelvin", "Couleur de la lumière", {
        options: [{ v: 3200, nom: "3 200 K" }, { v: 4300, nom: "4 300 K" }, { v: 5600, nom: "5 600 K" }],
        lire: function () { return etat.commun.kelvin; }, ecrire: function (v) { etat.commun.kelvin = v; }
      }).racine);

      p.append(titre("La caméra", "Trois réglages dosent la lumière, en plus du diaphragme."));
      p.append(choix("nd", c.ndNom, {
        options: c.nd.map(function (f, i) { return { v: i, nom: f.nom }; }), lire: lire("nd"), ecrire: ecrire("nd"),
        texte: function () { const t = c.nd[reg().nd].t; return t === 1 ? "sans filtre" : "−" + Math.round(Math.log2(1 / t)) + " IL"; }
      }).racine);
      p.append(curseur("obturation", "Obturation", {
        min: 0, max: c.obturations.length - 1,
        lire: function () { return Math.max(0, c.obturations.indexOf(reg().obturation)); },
        ecrire: function (v) { reg().obturation = c.obturations[v]; },
        texte: function () { return "1/" + reg().obturation + " s"; }
      }).racine);
      const s = c.sensibilite;
      p.append(curseur("sensibilite", s.type === "gain" ? "Gain" : "Sensibilité ISO", {
        min: 0, max: s.valeurs.length - 1,
        lire: function () { return Math.max(0, s.valeurs.indexOf(reg().sensibilite)); },
        ecrire: function (v) { reg().sensibilite = s.valeurs[v]; },
        texte: function () { return s.type === "gain" ? signe(reg().sensibilite) + " dB <small>≈ " + Optique.nombre(Math.round(etat.calc.iso / 10) * 10) + " ISO</small>" : Optique.nombre(reg().sensibilite) + " ISO"; }
      }).racine);

      let blanc;
      if (c.blancs) blanc = choix("blanc", "Balance des blancs", { options: c.blancs.map(function (v) { return { v: v, nom: Optique.nombre(v) }; }), lire: lire("blanc"), ecrire: ecrire("blanc"), texte: function () { return Optique.nombre(reg().blanc) + " K"; } });
      else blanc = curseur("blanc", "Balance des blancs", { min: 2500, max: 9900, pas: 100, lire: lire("blanc"), ecrire: ecrire("blanc"), texte: function () { return Optique.nombre(reg().blanc) + " K"; } });
      const rang = el("div", "btnrow");
      rang.append(bouton("Faire le blanc", function () {
        // La caméra se règle sur la lumière du plateau (au plus proche, si elle n'a que des positions fixes).
        const k = etat.commun.kelvin;
        reg().blanc = c.blancs ? c.blancs.reduce(function (a, v) { return Math.abs(v - k) < Math.abs(a - k) ? v : a; }) : k;
        maj("blanc");
      }));
      blanc.corps.append(rang);
      p.append(blanc.racine);
    },

    /* ----- L'IMAGE : la courbe de la caméra (menu Paint, profil d'image) ----- */
    image: function (p) {
      const c = cfg();
      p.append(titre(etat.config === "plateau" ? "Menu Paint (réglé au RCP)" : "Profil d’image", "La courbe qui transforme la lumière en signal vidéo. Ouvrez l’onglet « Le signal » pour la voir."));
      if (c.gammas.length > 1) p.append(choix("gamma", "Courbe de gamma", { options: c.gammas.map(function (g) { return { v: g.id, nom: g.nom }; }), lire: lire("gamma"), ecrire: ecrire("gamma") }).racine);
      else p.append(choix("gamma", "Courbe de gamma", { options: [{ v: "itu709", nom: c.gammas[0].nom }], lire: lire("gamma"), ecrire: ecrire("gamma") }).racine);
      p.append(curseur("masterGamma", "Master gamma", { min: -10, max: 10, lire: function () { return reg().masterGamma * 10; }, ecrire: function (v) { reg().masterGamma = v / 10; }, texte: function () { return signe(reg().masterGamma * 10) || "0"; } }).racine);

      p.append(titre("Les noirs"));
      p.append(curseur("masterBlack", "Master black", { min: -20, max: 20, lire: lire("masterBlack"), ecrire: ecrire("masterBlack"), texte: function () { return signe(reg().masterBlack) || "0"; } }).racine);
      const bg = curseur("bgNiveau", "Black gamma · niveau", {
        aide: "blackGamma", min: -7, max: 7, lire: lire("bgNiveau"), ecrire: ecrire("bgNiveau"),
        texte: function () { const v = reg().bgNiveau; return (signe(v) || "0") + (v > 0 ? " <small>black stretch</small>" : v < 0 ? " <small>black press</small>" : ""); }
      });
      p.append(bg.racine);
      p.append(choix("bgPlage", "Black gamma · plage", { aide: "blackStretch", options: [{ v: 0, nom: "Étroite" }, { v: 1, nom: "Moyenne" }, { v: 2, nom: "Large" }], lire: lire("bgPlage"), ecrire: ecrire("bgPlage") }).racine);

      p.append(titre("Les blancs"));
      p.append(choix("knee", "Knee", { options: [{ v: false, nom: "Coupé" }, { v: true, nom: "Actif" }], lire: lire("knee"), ecrire: ecrire("knee") }).racine);
      p.append(curseur("kneePoint", "Knee · point", { aide: "knee", min: 75, max: 105, lire: lire("kneePoint"), ecrire: ecrire("kneePoint"), texte: function () { return reg().kneePoint + " %"; } }).racine);
      p.append(curseur("kneePente", "Knee · pente", { aide: "knee", min: -5, max: 5, lire: lire("kneePente"), ecrire: ecrire("kneePente"), texte: function () { return (signe(reg().kneePente) || "0") + (reg().kneePente < 0 ? " <small>douce</small>" : reg().kneePente > 0 ? " <small>raide</small>" : ""); } }).racine);

      p.append(titre("Couleur et contours"));
      p.append(curseur("saturation", "Saturation", { min: -10, max: 10, lire: lire("saturation"), ecrire: ecrire("saturation"), texte: function () { return signe(reg().saturation) || "0"; } }).racine);
      p.append(curseur("detail", "Détail", { min: -7, max: 7, lire: lire("detail"), ecrire: ecrire("detail"), texte: function () { return signe(reg().detail) || "0"; } }).racine);
      const rang = el("div", "btnrow");
      rang.append(bouton("Remettre l’image à zéro", function () {
        Object.assign(reg(), { gamma: "itu709", masterGamma: 0, masterBlack: 0, bgNiveau: 0, bgPlage: 1, knee: true, kneePoint: 90, kneePente: 0, saturation: 0, detail: 0 });
        maj("gamma");
      }));
      p.append(rang);
    },

    /* ----- LES DÉFAUTS OPTIQUES ----- */
    defauts: function (p) {
      const d = etat.commun.defauts;
      p.append(titre("Défauts de l’objectif", "Chaque défaut dépend de l’objectif, de la focale et de l’ouverture. Les valeurs sont celles de l’objectif réel, avant accentuation."));
      p.append(choix("niveau", "Force des défauts", {
        options: [{ v: 0, nom: "Corrigés" }, { v: 1, nom: "Réalistes" }, { v: 3, nom: "Accentués ×3" }],
        lire: function () { return d.niveau; }, ecrire: function (v) { d.niveau = v; }
      }).racine);
      // Une case par défaut, avec sa valeur mesurée sur l'objectif en cours.
      const mesure = {
        acLat: function (k, o) { const px = Math.abs(Optique.table(o.acLat, reg().focale)) * (reg().doubleur ? 1.5 : 1) * 1101; return px < 0.25 ? "nulle à cette focale" : Optique.nombre(px, 1) + " px HD au coin"; },
        acLon: function (k, o) { const c = o.acLon * k.f / k.N * 1920 / cfg().capteur.l; return "frange de " + Optique.nombre(c, 1) + " px HD"; },
        vignettage: function (k, o) {
          const ouvert = Math.max(0, 1 - Math.log2(k.N / (o.nMin * (reg().doubleur ? 2 : 1))) / 2.5);
          const il = Optique.table(o.vignettage, reg().focale) * Math.pow(ouvert, 1.4) + o.cosP / 2 * Math.log2(1 + Math.pow(k.demiDiag / k.f, 2));
          return "−" + Optique.nombre(il, 1) + " IL au coin";
        },
        diffraction: function (k) { const t = 2 * 0.00054 * k.N * 1000; return "tache de " + Optique.nombre(t, 1) + " µm = " + Optique.nombre(t / cfg().capteur.pas, 1) + " photosite" + (t / cfg().capteur.pas >= 2 ? "s" : ""); },
        distorsion: function (k, o) { const v = Optique.table(o.distorsion, reg().focale) * 100; return Math.abs(v) < 0.3 ? "négligeable" : Optique.nombre(Math.abs(v), 1) + " % en " + (v < 0 ? "barillet" : "coussinet"); },
        pique: function (k, o) { const ouvert = Math.max(0, 1 - Math.log2(k.N / (o.nMin * (reg().doubleur ? 2 : 1))) / 2.5); return ouvert > 0.85 ? "marquée (pleine ouverture)" : ouvert > 0.4 ? "modérée" : ouvert > 0.05 ? "légère" : "nulle à cette ouverture"; }
      };
      [["acLat", "Aberration chromatique latérale"], ["acLon", "Aberration chromatique longitudinale"], ["vignettage", "Vignettage"], ["diffraction", "Diffraction"], ["distorsion", "Distorsion"], ["pique", "Mollesse à pleine ouverture"]].forEach(function (x) {
        const b = bloc(x[0], x[1]);
        b.racine.classList.add("reg-case");
        const etiq = el("label", "case");
        const coche = el("input"); coche.type = "checkbox";
        coche.addEventListener("change", function () { d[x[0]] = coche.checked; maj(x[0]); });
        const valeur = el("span", "case-valeur");
        etiq.append(coche, valeur);
        b.corps.append(etiq);
        rafraichir.push(function () { coche.checked = d[x[0]]; coche.disabled = d.niveau === 0; valeur.textContent = mesure[x[0]](etat.calc, cfg().objectif); });
        p.append(b.racine);
      });
      p.append(el("p", "muted small", "Astuce : la <b>loupe</b> (au-dessus de l’image) permet d’examiner un coin ou la mire. Glissez dans l’image pour la déplacer."));
    }
  };

  const ONGLETS = [["objectif", "Objectif"], ["exposition", "Exposition"], ["image", "Image"], ["defauts", "Défauts"]];
  const VOLETS = [["materiel", "Le matériel"], ["anatomie", "L’objectif"], ["capteur", "Le capteur"], ["signal", "Le signal"]];

  function construireOnglets(racine, liste, courant, choisir) {
    racine.textContent = "";
    liste.forEach(function (o) {
      const b = el("button", "", o[1]); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(o[0] === courant())); b.setAttribute("aria-pressed", String(o[0] === courant()));
      b.addEventListener("click", function () { choisir(o[0]); });
      racine.append(b);
    });
  }
  function construirePanneau() {
    rafraichir = [];
    construireOnglets($("onglets-reglages"), ONGLETS, function () { return etat.onglet; }, function (id) { etat.onglet = id; construirePanneau(); maj(); });
    const p = $("panneau"); p.textContent = "";
    PANNEAUX[etat.onglet](p);
  }

  /* ------------------------------------------------------------------------
     3. LA MISE À JOUR — appelée après chaque geste
     ------------------------------------------------------------------------ */
  let renduPret = false;

  function maj(cle) {
    if (cle) etat.dernier = cle;
    borner();
    etat.calc = Optique.calculer(cfg(), reg(), etat.commun);
    rafraichir.forEach(function (f) { f(); });
    mesures();
    commenter();
    infosMoniteur();
    Plateau.dessiner(vue());
    explorer();
    planifier(false);
  }

  // Tout ce dont les dessins ont besoin, en un seul objet.
  function vue() {
    return {
      config: etat.config, cfg: cfg(), r: reg(), commun: etat.commun, calc: etat.calc,
      distance: etat.distance, camZ: camZ(), pan: etat.pan, tilt: etat.tilt, loupe: etat.loupe,
      roueAngle: etat.roueAngle, roueBalayage: etat.roue ? VITESSE_ROUE * etat.calc.t : 0, aides: etat.aides
    };
  }

  function mesures() {
    const k = etat.calc;
    $("m-focale").innerHTML = Optique.nombre(k.f, k.f < 20 ? 1 : 0) + " mm" + (etat.config === "plateau" ? "<small>≈ " + Optique.nombre(k.equivalent) + " en 24×36</small>" : "");
    $("m-champ").textContent = Optique.nombre(k.champH, k.champH < 10 ? 1 : 0) + "°";
    $("m-ouverture").textContent = Optique.diaph(k.N);
    $("m-net").textContent = isFinite(k.distNette) ? Optique.distance(k.distNette) : "au-delà de ∞";
    $("m-pdc").innerHTML = isFinite(k.pres) ? Optique.distance(k.pres).replace(" m", "") + " → " + Optique.distance(k.loin) : "—";
    const e = $("m-expo");
    e.textContent = Math.abs(k.il) < 0.05 ? "correcte" : signe(k.il, 1) + " IL";
    e.className = Math.abs(k.il) <= 0.5 ? "ok" : Math.abs(k.il) > 1.5 ? "bad" : "";
    $("distance-o").textContent = Optique.distance(etat.distance);
    $("distance").value = etat.distance;
    $("distance").style.setProperty("--p", (etat.distance - 1.5) / 4 * 100 + "%");
  }

  // Les inscriptions du viseur, par-dessus l'image.
  function infosMoniteur() {
    const k = etat.calc, r = reg(), c = cfg();
    $("mon-info").innerHTML = "<span>" + Optique.diaph(k.N) + "</span><span>1/" + r.obturation + "</span><span>" +
      (c.sensibilite.type === "gain" ? signe(r.sensibilite) + " dB" : "ISO " + Optique.nombre(r.sensibilite)) + "</span><span>" + (k.nd.t === 1 ? "ND —" : (c.id === "plateau" ? "ND " : "") + k.nd.nom) + "</span><span>" + Optique.nombre(r.blanc) + " K</span>";
    const d = etat.commun.defauts;
    let b = "";
    if (etat.loupe.zoom > 1) b += "<span>Loupe ×" + etat.loupe.zoom + "</span>";
    if (d.niveau === 3) b += "<span>Défauts accentués ×3</span>";
    if (d.niveau === 0) b += "<span>Défauts corrigés</span>";
    $("mon-badges").innerHTML = b;
    $("nom-config").textContent = c.nom + " " + c.modele;
    $("aide-loupe").textContent = "Loupe ×" + etat.loupe.zoom; $("aide-loupe").setAttribute("aria-pressed", String(etat.loupe.zoom > 1));
    $("aide-peaking").setAttribute("aria-pressed", String(etat.aides.peaking));
    $("aide-roue").setAttribute("aria-pressed", String(etat.roue));
    Array.prototype.forEach.call($("aide-zebra").children, function (bt, i) { bt.setAttribute("aria-pressed", String(i === etat.aides.zebra)); });
    Array.prototype.forEach.call($("choix-config").children, function (bt) { bt.setAttribute("aria-pressed", String(bt.dataset.id === etat.config)); });
  }

  /* LE COMMENTAIRE : une phrase chiffrée sur ce que le dernier réglage vient de faire. */
  function commenter() {
    const k = etat.calc, r = reg(), c = cfg(), o = c.objectif, cle = etat.dernier;
    const zone = isFinite(k.loin) ? "de " + Optique.distance(k.pres) + " à " + Optique.distance(k.loin) : isFinite(k.pres) ? "de " + Optique.distance(k.pres) + " à l’infini" : "nulle part";
    const sujetNet = Optique.flou(k, etat.distance) < k.c0 * 1.2;
    const expo = Math.abs(k.il) <= 0.5 ? "L’exposition est correcte." : k.il > 0 ? "L’image est surexposée de " + Optique.nombre(k.il, 1) + " IL." : "L’image est sous-exposée de " + Optique.nombre(-k.il, 1) + " IL.";
    let t;
    switch (cle) {
      case "focale": case "doubleur":
        t = "<b>" + Optique.nombre(k.f, k.f < 20 ? 1 : 0) + " mm</b> sur un capteur " + c.capteur.nom.toLowerCase() + " : l’objectif embrasse <b>" + Optique.nombre(k.champH, 1) + "°</b>" + (etat.config === "plateau" ? ", comme un " + Optique.nombre(k.equivalent) + " mm en plein format" : "") + ". Zone nette : " + zone + ". ";
        if (!sujetNet) t += o.type === "varifocal" ? "<b>Le point a glissé</b> pendant le zoom : cet objectif est varifocal, il faut refaire le point." : Math.abs(r.tirage) > 0.004 ? "<b>Le point ne tient pas</b> au zoom : le tirage optique est déréglé." : "Le sujet n’est pas dans la zone nette.";
        else if (o.type === "parfocal") t += "Le point tient pendant le zoom : objectif parfocal.";
        if (k.enRampe || r.doubleur) t += " " + expo;
        break;
      case "bague": case "af":
        t = isFinite(k.distNette) ? "Plan net à <b>" + Optique.distance(k.distNette) + "</b>, zone nette " + zone + ". " + (sujetNet ? "La présentatrice (" + Optique.distance(etat.distance) + ") est nette." : "La présentatrice est à " + Optique.distance(etat.distance) + " : elle est en dehors.") : "Le plan net est au-delà de l’infini : plus rien n’est net.";
        break;
      case "ouverture":
        t = "À <b>" + Optique.diaph(k.N) + "</b>, zone nette " + zone + ". " + expo + " ";
        t += k.N >= (etat.config === "plateau" ? 9.5 : 15) ? "À cette ouverture, la <b>diffraction</b> ramollit l’image : mieux vaut un filtre ND." : k.N <= o.nMin * 1.3 ? "Pleine ouverture : vignettage et aberrations au maximum, flous les plus marqués." : "";
        break;
      case "tirage":
        t = Math.abs(r.tirage) < 0.0025 ? "Tirage réglé : le point fait en longue focale tient sur toute la course du zoom." : "Tirage faux de " + Optique.nombre(Math.abs(r.tirage), 3) + " mm : à " + Optique.nombre(k.f, 1) + " mm, le plan net est décalé de " + Optique.nombre(Math.abs(k.glissement), 2) + " dioptrie. L’erreur est énorme en grand-angle, invisible en longue focale.";
        break;
      case "distance":
        t = "Caméra à <b>" + Optique.distance(etat.distance) + "</b> du sujet. " + (sujetNet ? "Le sujet est toujours dans la zone nette (" + zone + ")." : "Le sujet est sorti de la zone nette (" + zone + ") : refaites le point.");
        break;
      case "lux": case "nd": case "obturation": case "sensibilite":
        t = "<b>" + Optique.nombre(etat.commun.lux) + " lux</b>, " + Optique.diaph(k.N) + ", 1/" + r.obturation + " s, " + (c.sensibilite.type === "gain" ? signe(r.sensibilite) + " dB" : Optique.nombre(r.sensibilite) + " ISO") + (k.nd.t < 1 ? ", filtre " + k.nd.nom : "") + ". " + expo;
        if (cle === "sensibilite" && Math.sqrt(k.bruit.a2 + k.bruit.b2 * 0.05) > 0.006) t += " Le <b>bruit</b> devient visible dans les ombres.";
        if (cle === "sensibilite" && c.bruit.isoHaut && r.sensibilite >= c.bruit.isoHaut) t += " Seconde sensibilité de base : le bruit de lecture est retombé.";
        if (cle === "obturation") t += etat.roue ? " Regardez la roue : " + (r.obturation >= 500 ? "elle est figée." : "elle file.") : " Lancez la <b>roue</b> pour voir l’effet sur le mouvement.";
        break;
      case "kelvin": case "blanc": {
        const ecart = r.blanc - etat.commun.kelvin;
        t = "Lumière du plateau : <b>" + Optique.nombre(etat.commun.kelvin) + " K</b> ; caméra réglée sur <b>" + Optique.nombre(r.blanc) + " K</b>. " + (Math.abs(ecart) < 250 ? "Les blancs sont neutres." : ecart > 0 ? "La caméra attend une lumière plus bleue : l’image tire sur l’<b>orangé</b>." : "La caméra attend une lumière plus chaude : l’image tire sur le <b>bleu</b>.");
        break;
      }
      case "knee": case "kneePoint": case "kneePente": {
        const blanc = Optique.signal(c.saturationCapteur, r) * 100, ecran = Optique.signal(Math.min(2.6 * k.expo, c.saturationCapteur), r) * 100;
        t = r.gamma === "slog3" ? "En S-Log3, la courbe conserve déjà toute la dynamique : le knee est sans objet." : r.knee ? "Knee actif à <b>" + r.kneePoint + " %</b> : l’écran LED sort à " + Optique.nombre(ecran) + " %, et le capteur saturé à " + Optique.nombre(Math.min(109, blanc)) + " %. " + (ecran < 108 ? "Le ciel de l’écran garde ses nuages." : "L’écran reste écrêté : baissez le point ou adoucissez la pente.") : "Knee coupé : tout ce qui dépasse 109 % est écrêté. L’écran LED " + (ecran >= 108.9 ? "est un aplat blanc." : "tient tout juste.");
        break;
      }
      case "bgNiveau": case "bgPlage":
        t = r.bgNiveau === 0 ? "Black gamma à zéro : la courbe est celle d’origine dans les basses lumières." : (r.bgNiveau > 0 ? "<b>Black stretch</b> : les ombres s’éclaircissent" : "<b>Black press</b> : les ombres se densifient") + " jusqu’à environ " + [14, 24, 38][r.bgPlage] + " % de niveau vidéo. La veste passe de " + Optique.nombre(Optique.signal(0.012 * k.expo, Object.assign({}, r, { bgNiveau: 0 })) * 100, 1) + " % à " + Optique.nombre(Optique.signal(0.012 * k.expo, r) * 100, 1) + " % ; le noir et le visage ne bougent pas.";
        break;
      case "masterBlack":
        t = "Le noir sort à <b>" + Optique.nombre(Optique.signal(0, r) * 100, 1) + " %</b>. " + (r.masterBlack > 2 ? "Les noirs sont relevés : l’image se voile." : r.masterBlack < -2 ? "Les ombres sont écrasées sous le noir : leurs détails sont perdus." : "Le noir est à sa place.");
        break;
      case "gamma": case "masterGamma":
        t = "Le gris moyen (18 %) sort à <b>" + Optique.nombre(Optique.signal(0.18 * k.expo, r) * 100) + " %</b>, le blanc diffus à " + Optique.nombre(Optique.signal(0.9 * k.expo, r) * 100) + " %. " + (r.gamma === "slog3" ? "S-Log3 : image volontairement plate, à étalonner." : r.gamma === "scinetone" ? "S-Cinetone : contraste adouci, hautes lumières arrondies." : "");
        break;
      case "config":
        t = "<b>" + c.nom + " " + c.modele + "</b> : " + c.capteur.detail + ", " + o.nom.toLowerCase() + " (" + o.type + "). Les réglages de l’autre configuration sont conservés : passez de l’une à l’autre pour comparer.";
        break;
      case "cadre":
        t = "Panoramique " + signe(etat.pan / RAD, 0) + "°, inclinaison " + signe(etat.tilt / RAD, 0) + "°. Le centre de l’image vise un point à <b>" + Optique.distance(distanceVisee()) + "</b> ; le plan net est à " + (isFinite(k.distNette) ? Optique.distance(k.distNette) : "l’infini") + ". Double-cliquez dans l’image pour recentrer.";
        break;
      default:
        if (cle && AIDES[cle]) t = "<b>" + AIDES[cle].titre + ".</b> " + (AIDES[cle].observer || AIDES[cle].quoi);
        else t = "<b>Bienvenue.</b> Tournez les bagues de l’objectif, changez de caméra en haut de la page, et regardez l’image réagir. Glissez dans l’image pour cadrer. Chaque réglage a son bouton <b>?</b> ; les <b>expériences guidées</b> proposent un parcours.";
    }
    $("commentaire").innerHTML = t;
    $("commentaire").className = "note " + (cle ? "info" : "");
  }

  /* ------------------------------------------------------------------------
     L'IMAGE : quand la calculer, et à quelle taille
     Pendant un geste (curseur, cadrage), si la carte graphique peine, on
     calcule une image plus petite pour rester fluide ; dès que le geste
     s'arrête, on recalcule en pleine définition.
     ------------------------------------------------------------------------ */
  let enAttente = false, partielSeul = true, dernierGeste = -1e9, echelleGeste = 1, plafond = 1280, affinage = null;
  // Ajouter « ?hd » à l'adresse garde toujours la pleine définition, même si l'appareil est lent.
  const TOUJOURS_HD = /[?&]hd\b/.test(location.search);
  function geste() { dernierGeste = performance.now(); }
  function planifier(partiel) {
    if (!partiel) partielSeul = false;
    if (enAttente) return;
    enAttente = true;
    requestAnimationFrame(rendre);
  }
  function rendre() {
    enAttente = false;
    if (!renduPret) return;
    const m = $("moniteur"); if (!m.clientWidth) return;
    const enGeste = !TOUJOURS_HD && performance.now() - dernierGeste < 300;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const largeur = Math.min(plafond, Math.round(m.clientWidth * dpr)) * (enGeste ? echelleGeste : 1);
    const avant = Rendu.largeur();
    Rendu.taille(largeur, largeur * 9 / 16);
    const partiel = partielSeul && Rendu.largeur() === avant;
    partielSeul = true;
    const duree = Rendu.rendre(vue(), partiel);
    if (!partiel) {
      if (enGeste) {
        if (duree > 45) echelleGeste = Math.max(0.3, echelleGeste * 0.8); else if (duree < 14) echelleGeste = Math.min(1, echelleGeste * 1.25);
      } else if (!TOUJOURS_HD && duree > 320 && plafond > 560) plafond = Math.max(560, Math.round(plafond * 0.75));   // appareil lent : image allégée
    }
    if (enGeste && echelleGeste < 1) { clearTimeout(affinage); affinage = setTimeout(function () { planifier(false); }, 340); }
    if (etat.explorer === "signal") Signal.oscilloscope($("oscilloscope"), Rendu.signal, Rendu.SIGNAL.l, Rendu.SIGNAL.h);
  }

  // La roue : une petite boucle d'animation, qui ne recalcule que le rectangle de la roue.
  let tempsRoue = 0;
  function tournerRoue(t) {
    if (!etat.roue) return;
    etat.roueAngle = (etat.roueAngle + VITESSE_ROUE * Math.min(0.1, (t - tempsRoue) / 1000)) % (2 * Math.PI);
    tempsRoue = t;
    if (!document.hidden) planifier(true);
    requestAnimationFrame(tournerRoue);
  }
  // Le bruit « grouille » : huit fois par seconde, on ne refait que la dernière étape du calcul.
  setInterval(function () {
    if (!renduPret || reduit || document.hidden || etat.roue || enAttente || !etat.calc) return;
    const b = etat.calc.bruit;
    if (Math.sqrt(b.a2 + b.b2 * 0.1) > 0.0035) Rendu.rendreBruit(vue());
  }, 125);

  /* ------------------------------------------------------------------------
     4. CADRER, VISER, FAIRE LE POINT
     ------------------------------------------------------------------------ */
  // Les points que l'on peut viser d'un clic (X, Y, Z sur le plateau), et ceux des expériences.
  const CIBLES = {
    presentatrice: ["Présentatrice", 0, 1.2, Decor.SUJET_Z], mire: ["Mire", -0.85, 1.07, Decor.SUJET_Z], roue: ["Roue", 1.5, 1.5, 7.8], ecran: ["Écran LED", -1.7, 2.18, Decor.FOND_Z],
    visage: [null, 0, 1.245, Decor.SUJET_Z], etoile: [null, -0.66, 1.035, Decor.SUJET_Z], buste: [null, 0, 1.12, Decor.SUJET_Z]
  };
  function viser(X, Y, Z) {
    const dz = Z - camZ();
    etat.pan = Math.atan2(X, dz); etat.tilt = Math.atan2(Y - Decor.CAM_Y, Math.hypot(X, dz));
    etat.loupe.x = 0; etat.loupe.y = 0;
  }

  // Les zones « pleines » de chaque calque (en mètres, repère du calque) : l'autofocus s'y accroche.
  const SILHOUETTES = {
    plante: [[0.05, 0, 0.85, 0.75], [0.28, 0.7, 0.62, 1.6]], pupitre: [[0, 0.25, 2, 1.05]],
    presentatrice: [[0.44, 0.07, 0.66, 0.34], [0.28, 0.34, 0.82, 1.45]], mire: [[0.08, 0.42, 0.82, 0.94]],
    roue: [[0.15, 0.1, 1.15, 1.1]], etagere: [[0, 0, 1.3, 2.2]], ecran: [[0, 0, 2.6, 1.46]], fond: [[0, 0, 12, 4.4]]
  };
  // Distance (le long de l'axe) de ce que vise le centre de l'image.
  function distanceVisee() {
    const cp = Math.cos(etat.pan), sp = Math.sin(etat.pan), ct = Math.cos(etat.tilt), st = Math.sin(etat.tilt);
    const d = [sp * ct, st, cp * ct], z0 = camZ();
    let mieux = d[1] < -1e-3 ? Decor.CAM_Y / -d[1] : 1e9;      // le sol
    Decor.calques.forEach(function (k) {
      const zones = SILHOUETTES[k.id];
      if (!zones || k.z - z0 < 0.3) return;
      const t = (k.z - z0) / d[2], x = d[0] * t - k.x, y = k.y + k.h - (Decor.CAM_Y + d[1] * t);
      if (t < mieux && zones.some(function (q) { return x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3]; })) mieux = t;
    });
    return Math.min(mieux, 60);
  }
  function autofocus() { reg().bague = Optique.bagueNette(cfg(), reg(), distanceVisee()); }

  function brancherMoniteur() {
    const m = $("moniteur");
    let depart = null;
    m.addEventListener("pointerdown", function (e) { depart = { x: e.clientX, y: e.clientY, pan: etat.pan, tilt: etat.tilt, lx: etat.loupe.x, ly: etat.loupe.y }; m.setPointerCapture(e.pointerId); m.classList.add("saisi"); });
    m.addEventListener("pointermove", function (e) {
      if (!depart) return;
      const dx = (e.clientX - depart.x) / m.clientWidth, dy = (e.clientY - depart.y) / m.clientHeight;
      if (etat.loupe.zoom > 1) {       // loupe : on déplace la zone agrandie
        etat.loupe.x = depart.lx - 2 * dx / etat.loupe.zoom; etat.loupe.y = depart.ly + 2 * dy / etat.loupe.zoom;
      } else {                         // sinon : panoramique et inclinaison, comme si on attrapait l'image
        etat.pan = depart.pan - dx * etat.calc.champH * RAD; etat.tilt = depart.tilt + dy * etat.calc.champV * RAD;
      }
      geste(); maj("cadre");
    });
    ["pointerup", "pointercancel"].forEach(function (n) { m.addEventListener(n, function () { depart = null; m.classList.remove("saisi"); }); });
    m.addEventListener("keydown", function (e) {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!d) return;
      e.preventDefault();
      if (etat.loupe.zoom > 1) { etat.loupe.x += d[0] * 0.1; etat.loupe.y += d[1] * 0.1; }
      else { etat.pan += d[0] * etat.calc.champH * RAD * 0.05; etat.tilt += d[1] * etat.calc.champV * RAD * 0.05; }
      maj("cadre");
    });
    m.addEventListener("dblclick", function () { etat.pan = 0; etat.tilt = -2 * RAD; etat.loupe.x = 0; etat.loupe.y = 0; maj("cadre"); });
  }

  /* ------------------------------------------------------------------------
     L'EXPLORATION : matériel, objectif, capteur, signal
     ------------------------------------------------------------------------ */
  const RESUMES = {
    materiel: {
      plateau: "<h4>La chaîne broadcast</h4><p>La caméra de plateau n’est qu’un maillon : une <b>tête</b> qui capte l’image, un <b>câble fibre</b>, et en régie la <b>CCU</b> qui l’alimente et le <b>RCP</b> d’où l’ingénieur vision règle diaphragme, noirs et couleurs. Le cadreur, lui, cadre et fait le point.</p><p class=\"muted\">Cliquez sur un numéro pour en savoir plus.</p>",
      boitier: "<h4>Le boîtier autonome</h4><p>Capteur, traitement, enregistrement et batterie tiennent dans la main. Un seul opérateur fait tout : cadre, point, exposition, couleur. Pas de régie : ce qui est réglé est enregistré.</p><p class=\"muted\">Cliquez sur un numéro pour en savoir plus.</p>"
    },
    anatomie: {
      plateau: "<h4>Un zoom parfocal</h4><p>Quand on zoome, le <b>variateur</b> change la focale et le <b>compensateur</b> rattrape le foyer : l’image du sujet (point jaune) reste <b>sur le capteur</b>. On peut faire le point une fois, en longue focale, puis recadrer librement.</p><p class=\"muted\">Tournez les bagues et suivez les lentilles. Cliquez sur une pièce.</p>",
      boitier: "<h4>Un zoom varifocal</h4><p>Plus compact et plus léger, mais rien ne rattrape exactement le foyer : quand on zoome, l’image du sujet (point jaune) <b>quitte le capteur</b>. Il faut refaire le point, ce que l’autofocus fait tout seul.</p><p class=\"muted\">Tournez les bagues et suivez les lentilles. Cliquez sur une pièce.</p>"
    },
    capteur: {
      plateau: "<h4>Tri-capteur 2/3″</h4><p>Un <b>prisme</b> répartit la lumière sur trois petits capteurs, un par couleur. Petit capteur = courtes focales, grande profondeur de champ, zooms de grande amplitude : idéal pour le direct.</p><p class=\"muted\">Sous le schéma, la chaîne du signal : cliquez sur une étape pour ouvrir son réglage.</p>",
      boitier: "<h4>Mono-capteur plein format</h4><p>Un seul grand capteur, couvert d’une <b>matrice de Bayer</b>. Grand capteur = focales plus longues à cadre égal, faible profondeur de champ, peu de bruit : l’image « cinéma ».</p><p class=\"muted\">Sous le schéma, la chaîne du signal : cliquez sur une étape pour ouvrir son réglage.</p>"
    }
  };
  // La chaîne du signal : étape, valeur en cours, onglet et réglage correspondants.
  function chaine() {
    const r = reg(), k = etat.calc, c = cfg();
    const gain = c.sensibilite.type === "gain" ? signe(r.sensibilite) + " dB" : Optique.nombre(r.sensibilite) + " ISO";
    const courbe = c.gammas.filter(function (g) { return g.id === r.gamma; })[0].nom;
    const commun = [
      ["Balance des blancs", Optique.nombre(r.blanc) + " K", "exposition", "blanc"],
      ["Gamma", courbe, "image", "gamma"],
      ["Black gamma", signe(r.bgNiveau) || "0", "image", "bgNiveau"],
      ["Knee", r.knee ? r.kneePoint + " %" : "coupé", "image", "knee"],
      ["Détail", signe(r.detail) || "0", "image", "detail"]
    ];
    if (etat.config === "plateau") return [["Objectif", Optique.diaph(k.N), "objectif", "ouverture"], ["Filtre ND", k.nd.nom, "exposition", "nd"], ["Prisme + 3 CMOS", "1/" + r.obturation + " s", "exposition", "obturation"], ["Gain", gain, "exposition", "sensibilite"]].concat(commun, [["Fibre → CCU", "SDI", null, "m_ccu"]]);
    return [["Filtre ND vissé", k.nd.nom, "exposition", "nd"], ["Objectif", Optique.diaph(k.N), "objectif", "ouverture"], ["CMOS Bayer", "1/" + r.obturation + " s", "exposition", "obturation"], ["Gain", gain, "exposition", "sensibilite"], ["Dématriçage", "RVB", null, "p_capteur_bayer"]].concat(commun, [["Codec → carte", "XAVC", null, "m_carte"]]);
  }

  function explorer() {
    const v = vue(), ex = etat.explorer;
    VOLETS.forEach(function (o) { $("volet-" + o[0]).hidden = o[0] !== ex; });
    Array.prototype.forEach.call($("onglets-explorer").children, function (b, i) { const actif = VOLETS[i][0] === ex; b.setAttribute("aria-selected", String(actif)); b.setAttribute("aria-pressed", String(actif)); });
    $("explorer-legende").textContent = ex === "anatomie" || ex === "capteur" ? "Dessins à la même échelle pour les deux configurations" : "";
    if (ex === "materiel") {
      const positions = Materiel.dessinerGrosPlan($("materiel"), etat.config);
      const zone = $("reperes"); zone.textContent = "";
      positions.forEach(function (p) {
        const b = el("button", "repere" + (etat.piece.materiel === p.r.cle ? " sel" : ""), String(p.r.n)); b.type = "button";
        b.style.left = p.x + "px"; b.style.top = p.y + "px"; b.title = AIDES[p.r.cle].titre; b.setAttribute("aria-label", AIDES[p.r.cle].titre);
        b.addEventListener("click", function () { etat.piece.materiel = p.r.cle; explorer(); });
        zone.append(b);
      });
      $("fiche-materiel").innerHTML = etat.piece.materiel && AIDES[etat.piece.materiel] && positions.some(function (p) { return p.r.cle === etat.piece.materiel; }) ? ficheHTML(AIDES[etat.piece.materiel], true) : RESUMES.materiel[etat.config];
    } else if (ex === "anatomie") {
      Anatomie.objectif($("anatomie"), v, etat.piece.anatomie);
      $("fiche-anatomie").innerHTML = PIECES[etat.piece.anatomie] ? ficheHTML(PIECES[etat.piece.anatomie], true) : RESUMES.anatomie[etat.config];
    } else if (ex === "capteur") {
      Anatomie.capteur($("capteur"), v, etat.piece.capteur);
      const zone = $("chaine"); zone.textContent = "";
      chaine().forEach(function (e, i) {
        if (i) zone.append(el("span", "fleche", "›"));
        const b = el("button", "maillon", "<small>" + e[0] + "</small><b>" + e[1] + "</b>"); b.type = "button";
        b.addEventListener("click", function () {
          etat.piece.capteur = e[3];
          if (e[2]) { etat.onglet = e[2]; construirePanneau(); maj(e[3]); eclairer(e[3]); } else explorer();
        });
        zone.append(b);
      });
      const cle = etat.piece.capteur;
      $("fiche-capteur").innerHTML = cle && (PIECES[cle] || AIDES[cle]) ? ficheHTML(PIECES[cle] || AIDES[cle], true) : RESUMES.capteur[etat.config];
    } else {
      Signal.oscilloscope($("oscilloscope"), Rendu.signal, Rendu.SIGNAL.l, Rendu.SIGNAL.h);
      Signal.courbe($("courbe"), v);
    }
  }
  // Fait clignoter un réglage de la colonne de droite et l'amène à l'écran.
  function eclairer(cle) {
    const r = document.querySelector('.reg[data-cle="' + cle + '"]');
    if (!r) return;
    r.scrollIntoView({ block: "nearest", behavior: reduit ? "auto" : "smooth" });
    r.classList.remove("flash"); void r.offsetWidth; r.classList.add("flash");
  }
  // Clic (ou Entrée) sur une pièce d'un schéma SVG.
  function brancherSchema(id, famille) {
    const choisir = function (e) {
      const p = e.target.closest ? e.target.closest(".piece") : null;
      if (!p || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      etat.piece[famille] = etat.piece[famille] === p.dataset.cle ? null : p.dataset.cle;
      explorer();
    };
    $(id).addEventListener("click", choisir); $(id).addEventListener("keydown", choisir);
  }

  /* ------------------------------------------------------------------------
     5. LES EXPÉRIENCES GUIDÉES
     ------------------------------------------------------------------------ */
  const Experiences = {
    // La « télécommande » passée aux expériences de textes.js.
    S: {
      config: function (id) { etat.config = id; },
      regler: function (id, valeurs) { Object.assign(etat.reglages[id], valeurs); },
      commun: function (v) {
        Object.keys(v).forEach(function (cle) { if (cle === "lux" || cle === "kelvin") etat.commun[cle] = v[cle]; else etat.commun.defauts[cle] = v[cle]; });
      },
      cadre: function (v) { if (v.distance !== undefined) etat.distance = v.distance; if (v.pan !== undefined) etat.pan = v.pan * RAD; if (v.tilt !== undefined) etat.tilt = v.tilt * RAD; },
      viser: function (nom) { const c = CIBLES[nom]; viser(c[1], c[2], c[3]); },
      point: function (id, d) { etat.reglages[id].bague = Optique.bagueNette(CONFIGS[id], etat.reglages[id], d); },
      exposer: function (id) { etat.reglages[id].ouverture = Optique.ouvertureAuto(CONFIGS[id], etat.reglages[id], etat.commun); },
      aides: function (v) {
        if (v.zebra !== undefined) etat.aides.zebra = v.zebra;
        if (v.peaking !== undefined) etat.aides.peaking = v.peaking;
        if (v.loupe !== undefined) { etat.loupe.zoom = v.loupe; etat.loupe.x = v.loupeX || 0; etat.loupe.y = v.loupeY || 0; }
        regleRoue(!!v.roue);
      },
      onglets: function (a, b) { if (a) etat.onglet = a; if (b) etat.explorer = b; }
    },
    lancer: function (x) {
      etat.experience = { x: x, etape: 0 };
      // On repart d'une base saine : défauts accentués, lumière normale, image à zéro.
      etat.commun.lux = 1000; etat.commun.kelvin = 5600;
      Object.assign(etat.commun.defauts, { niveau: 3, acLat: true, acLon: true, vignettage: true, diffraction: true, distorsion: true, pique: true });
      ["plateau", "boitier"].forEach(function (id) { Object.assign(etat.reglages[id], { blanc: 5600, gamma: "itu709", masterGamma: 0, masterBlack: 0, bgNiveau: 0, bgPlage: 1, knee: true, kneePoint: 90, kneePente: 0, saturation: 0, detail: 0, doubleur: false, tirage: 0 }); });
      x.preparer(Experiences.S);
      etat.piece = { materiel: null, anatomie: null, capteur: null };
      etat.dernier = null;
      construirePanneau(); maj(); Experiences.afficher();
      if ($("exp-fenetre").open) $("exp-fenetre").close();
    },
    afficher: function () {
      const carte = $("exp-carte"), e = etat.experience;
      carte.hidden = !e;
      if (!e) return;
      carte.textContent = "";
      const tete = el("div", "exp-carte-tete");
      tete.append(el("span", "eyebrow", "Expérience · étape " + (e.etape + 1) + " sur " + e.x.etapes.length), bouton("Quitter", function () { etat.experience = null; Experiences.afficher(); }, "linkbtn"));
      carte.append(tete, el("h3", "", e.x.titre), el("p", "exp-etape", e.x.etapes[e.etape]));
      const points = el("div", "exp-points");
      e.x.etapes.forEach(function (x, i) { points.append(el("i", i === e.etape ? "on" : i < e.etape ? "fait" : "")); });
      const rang = el("div", "btnrow");
      const prec = bouton("Précédente", function () { e.etape--; Experiences.afficher(); }); prec.disabled = e.etape === 0;
      const fin = e.etape === e.x.etapes.length - 1;
      const suiv = bouton(fin ? "Terminer" : "Étape suivante", function () { if (fin) etat.experience = null; else e.etape++; Experiences.afficher(); }, "btn small primary");
      rang.append(prec, suiv, bouton("Recommencer", function () { Experiences.lancer(e.x); }, "btn small ghost"));
      carte.append(points, rang);
    },
    liste: function () {
      const zone = $("exp-liste");
      EXPERIENCES.forEach(function (x, i) {
        const b = el("button", "exp-choix", "<span>" + (i + 1) + "</span><b>" + x.titre + "</b><small>" + x.resume + "</small>"); b.type = "button";
        b.addEventListener("click", function () { Experiences.lancer(x); });
        zone.append(b);
      });
    }
  };

  function regleRoue(active) {
    const avant = etat.roue;
    etat.roue = active;
    if (active && !avant) { tempsRoue = performance.now(); requestAnimationFrame(tournerRoue); }
  }

  /* ------------------------------------------------------------------------
     MISE EN ROUTE
     ------------------------------------------------------------------------ */
  function demarrer() {
    // L'icône et ses couleurs viennent du catalogue.
    const app = typeof CATALOGUE !== "undefined" && CATALOGUE.filter(function (a) { return a.id === "tmo-simulateur-camera"; })[0];
    if (app) { $("sim-icone").style.setProperty("--app-grad", "linear-gradient(160deg, " + app.teinte.join(", ") + ")"); $("sim-icone").innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[app.icone] + "</svg>"; }

    // Le choix de la configuration
    Object.keys(CONFIGS).forEach(function (id) {
      const c = CONFIGS[id], b = el("button", "", "<b>" + c.nom + "</b><small>" + c.modele + " · " + c.capteur.nom + " · zoom " + c.objectif.type + "</small>");
      b.type = "button"; b.dataset.id = id;
      b.addEventListener("click", function () { if (etat.config === id) return; etat.config = id; etat.piece = { materiel: null, anatomie: null, capteur: null }; construirePanneau(); maj("config"); });
      $("choix-config").append(b);
    });

    // Thème clair / sombre (js/theme.js)
    const soleil = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const lune = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7z" fill="currentColor"/></svg>';
    const bt = $("bouton-theme");
    const dessinerTheme = function () { const sombre = document.documentElement.getAttribute("data-theme") === "dark"; bt.innerHTML = sombre ? soleil : lune; bt.title = sombre ? "Passer en mode clair" : "Passer en mode sombre"; bt.setAttribute("aria-label", bt.title); };
    bt.addEventListener("click", function () { themeBasculer(); dessinerTheme(); });
    dessinerTheme();

    // Les aides de visée
    ["Zébra —", "70 %", "100 %"].forEach(function (nom, i) { const b = el("button", "", nom); b.type = "button"; b.title = AIDES.zebra.titre; b.addEventListener("click", function () { etat.aides.zebra = i; maj("zebra"); }); $("aide-zebra").append(b); });
    $("aide-peaking").addEventListener("click", function () { etat.aides.peaking = !etat.aides.peaking; maj("peaking"); });
    $("aide-loupe").addEventListener("click", function () { etat.loupe.zoom = { 1: 2, 2: 4, 4: 8, 8: 1 }[etat.loupe.zoom]; if (etat.loupe.zoom === 1) { etat.loupe.x = 0; etat.loupe.y = 0; } maj("loupe"); });
    $("aide-roue").addEventListener("click", function () { regleRoue(!etat.roue); maj("roue"); });
    Object.keys(CIBLES).forEach(function (id) { const c = CIBLES[id]; if (c[0]) $("viser").append(bouton(c[0], function () { viser(c[1], c[2], c[3]); maj("cadre"); }, "chip mini")); });
    $("distance").addEventListener("input", function () { etat.distance = parseFloat(this.value); geste(); maj("distance"); });

    construireOnglets($("onglets-explorer"), VOLETS, function () { return etat.explorer; }, function (id) { etat.explorer = id; explorer(); });
    brancherSchema("anatomie", "anatomie"); brancherSchema("capteur", "capteur");
    brancherMoniteur();
    Plateau.init($("plateau"));

    // Les expériences
    Experiences.liste();
    $("btn-experiences").addEventListener("click", function () { const f = $("exp-fenetre"); if (f.showModal) f.showModal(); else f.setAttribute("open", ""); });
    $("exp-fermer").addEventListener("click", function () { $("exp-fenetre").close(); });
    $("exp-fenetre").addEventListener("click", function (e) { if (e.target === this) this.close(); });

    // L'image de la caméra
    const erreur = Rendu.init($("image"), { leger: /Android|iPhone|iPad/.test(navigator.userAgent) });
    if (erreur) { $("mon-message").hidden = false; $("mon-message").textContent = erreur; } else renduPret = true;
    // Si le navigateur reprend la carte graphique (onglet resté longtemps en arrière-plan…), on le dit.
    $("image").addEventListener("webglcontextlost", function (e) {
      e.preventDefault(); renduPret = false;
      $("mon-message").hidden = false; $("mon-message").textContent = "Le calcul de l’image a été interrompu par le navigateur. Rechargez la page pour le relancer.";
    });

    // Point de départ : le point est fait sur la présentatrice, dans les deux configurations.
    Experiences.S.point("plateau", etat.distance); Experiences.S.point("boitier", etat.distance);
    construirePanneau();
    maj();

    // Quand la fenêtre change de taille, tout se redessine à la bonne définition.
    let redim = null;
    window.addEventListener("resize", function () { clearTimeout(redim); redim = setTimeout(function () { maj(); }, 120); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) planifier(false); });
    // Un accès pour les curieux, dans la console du navigateur (F12) : Simulateur.etat
    window.Simulateur = { etat: etat, maj: maj, experiences: Experiences };
  }

  demarrer();
})();
