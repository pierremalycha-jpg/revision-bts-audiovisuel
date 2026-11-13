/* ==========================================================================
   simulateur.js — le chef d'orchestre
   --------------------------------------------------------------------------
   Ce fichier relie tout le reste :
     1. l'ÉTAT : la configuration choisie, les réglages de chaque caméra, la
        lumière du plateau, le cadre, et ce qui est affiché ou non ;
     2. les RÉGLAGES : quatre familles (PANNEAUX), ouvertes depuis le dock ;
     3. les FENÊTRES : retour caméra, schémas, explications. On les déplace,
        on les agrandit, on les ferme ; le menu « Afficher » les rappelle ;
     4. la mise à jour : à chaque geste, on recalcule l'optique
        (Optique.calculer), puis on redessine la scène, l'image de la caméra
        et les fenêtres ouvertes ;
     5. le cadrage à la souris, la loupe, la roue ;
     6. les expériences guidées (textes.js).

   Principe de l'interface : rien n'est affiché tant qu'on ne l'a pas
   demandé. Au départ : la scène, le retour caméra, le dock.

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
    // Ce qui est affiché. Au départ : le strict nécessaire.
    affiche: { retour: true, zone: true, profondeur: false, anatomie: false, capteur: false, signal: false, explications: false, experience: false },
    panneau: null,                   // la famille de réglages ouverte : "objectif", "exposition", "image", "defauts" ou rien
    vueProfondeur: "cote",
    sujet: null,                     // ce que la fenêtre Explications explique : { reglage } ou { piece }
    calc: null, experience: null
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
     2. LES RÉGLAGES — de petites fabriques, puis un panneau par famille
     ------------------------------------------------------------------------ */
  let rafraichir = [];               // les fonctions qui remettent chaque réglage à jour à l'écran

  // L'ossature d'un réglage : son nom et sa valeur. « aide » est la fiche d'AIDES correspondante.
  function bloc(cle, nom, aide) {
    const racine = el("div", "reg"); racine.dataset.cle = cle; racine.dataset.aide = aide || cle;
    const tete = el("div", "reg-tete");
    const sortie = el("output");
    tete.append(el("span", "reg-nom", nom), sortie);
    racine.append(tete);
    return { racine: racine, corps: racine, sortie: sortie };
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
    const bt = el("button", classe || "mini", nom); bt.type = "button";
    bt.addEventListener("click", action);
    return bt;
  }
  function rangee() { return el("div", "btnrow"); }

  // Un accès direct aux réglages de la configuration en cours : lire("focale"), ecrire("focale").
  const lire = function (cle) { return function () { return reg()[cle]; }; };
  const ecrire = function (cle) { return function (v) { reg()[cle] = v; }; };
  const signe = function (v, d) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Optique.nombre(Math.abs(v), d || 0); };

  const PANNEAUX = {
    /* ----- L'OBJECTIF : les bagues, et la place de la caméra ----- */
    objectif: {
      nom: "Objectif",
      sous: function () { const o = cfg().objectif; return o.nom + " · " + o.type; },
      construire: function (p) {
        const c = cfg(), o = c.objectif;
        // Zoom : curseur logarithmique (chaque cran multiplie la focale, comme une vraie bague).
        const z = curseur("focale", "Zoom", {
          min: 0, max: 1000,
          lire: function () { return 1000 * Math.log(reg().focale / o.fMin) / Math.log(o.fMax / o.fMin); },
          ecrire: function (v) { reg().focale = o.fMin * Math.pow(o.fMax / o.fMin, v / 1000); },
          texte: function () { const k = etat.calc; return Optique.nombre(k.f, k.f < 20 ? 1 : 0) + " mm" + (etat.config === "plateau" ? " <small>≈ " + Optique.nombre(k.equivalent) + " en 24×36</small>" : ""); }
        });
        if (o.doubleur) {              // le doubleur : un bouton sous la bague de zoom
          const rz = rangee(), btDoubleur = bouton("Doubleur ×2", function () { reg().doubleur = !reg().doubleur; maj("doubleur"); });
          btDoubleur.dataset.aide = "doubleur";
          rz.append(btDoubleur); z.corps.append(rz);
          rafraichir.push(function () { btDoubleur.setAttribute("aria-pressed", String(reg().doubleur)); });
        }
        p.append(z.racine);

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
          etatPoint.innerHTML = Math.abs(k.glissement) > 0.004 ? "Plan net réel : <b>" + (isFinite(k.distNette) ? Optique.distance(k.distNette) : "au-delà de l’infini") + "</b>" : "";
        });
        if (o.type === "varifocal") { const r = rangee(); r.append(bouton("AF · point au centre", function () { autofocus(); maj("af"); })); b.corps.append(r); }
        p.append(b.racine);

        // Diaphragme : un cran de curseur = un tiers de diaphragme.
        const d = curseur("ouverture", "Diaphragme", {
          min: 0, max: Math.round(6 * Math.log2(o.nMax / o.nMin)),
          lire: function () { return Math.round(6 * Math.log2(reg().ouverture / o.nMin)); },
          ecrire: function (v) { reg().ouverture = o.nMin * Math.pow(2, v / 6); },
          texte: function () { return Optique.diaph(reg().ouverture); }
        });
        const etatDiaph = el("p", "reg-etat"), rd = rangee();
        rd.append(bouton("Iris auto", function () { reg().ouverture = Optique.ouvertureAuto(cfg(), reg(), etat.commun); maj("ouverture"); }));
        d.corps.append(etatDiaph, rd);
        rafraichir.push(function () {
          const k = etat.calc;
          etatDiaph.innerHTML = reg().doubleur ? "Ouverture réelle <b>" + Optique.diaph(k.N) + "</b> (doubleur)" : k.enRampe ? "Ouverture réelle <b>" + Optique.diaph(k.N) + "</b> (ramping)" : "";
        });
        p.append(d.racine);

        if (o.type === "parfocal") p.append(curseur("tirage", "Tirage optique", {
          min: -0.15, max: 0.15, pas: 0.005, lire: lire("tirage"), ecrire: ecrire("tirage"),
          texte: function () { return Math.abs(reg().tirage) < 0.0025 ? "réglé" : signe(reg().tirage, 3) + " mm"; }
        }).racine);

        // La place de la caméra, et ce qu'elle vise (on peut aussi glisser dans le retour caméra).
        const dist = curseur("distance", "Distance du sujet", {
          min: 1.5, max: 5.5, pas: 0.05, lire: function () { return etat.distance; }, ecrire: function (v) { etat.distance = v; },
          texte: function () { return Optique.distance(etat.distance); }
        });
        const rv = rangee();
        Object.keys(CIBLES).forEach(function (id) { const q = CIBLES[id]; if (q[0]) rv.append(bouton(q[0], function () { viser(q[1], q[2], q[3]); maj("cadre"); })); });
        dist.corps.append(rv);
        p.append(dist.racine);
      }
    },

    /* ----- L'EXPOSITION : lumière, ND, obturation, gain, blanc ----- */
    exposition: {
      nom: "Exposition",
      sous: function () { return "La lumière du plateau, puis ce qui la dose dans la caméra"; },
      construire: function (p) {
        const c = cfg();
        p.append(choix("lux", "Lumière du plateau", {
          options: [30, 125, 500, 1000, 2000].map(function (v) { return { v: v, nom: Optique.nombre(v) }; }),
          lire: function () { return etat.commun.lux; }, ecrire: function (v) { etat.commun.lux = v; },
          texte: function () { return Optique.nombre(etat.commun.lux) + " lux"; }
        }).racine);
        p.append(choix("kelvin", "Couleur de la lumière", {
          options: [{ v: 3200, nom: "3 200 K" }, { v: 4300, nom: "4 300 K" }, { v: 5600, nom: "5 600 K" }],
          lire: function () { return etat.commun.kelvin; }, ecrire: function (v) { etat.commun.kelvin = v; }
        }).racine);
        p.append(choix("nd", c.ndNom, {
          options: c.nd.map(function (f, i) { return { v: i, nom: f.nom }; }), lire: lire("nd"), ecrire: ecrire("nd"),
          texte: function () { const t = c.nd[reg().nd].t; return t === 1 ? "sans filtre" : "−" + Math.round(Math.log2(1 / t)) + " IL"; }
        }).racine);
        const ob = curseur("obturation", "Obturation", {
          min: 0, max: c.obturations.length - 1,
          lire: function () { return Math.max(0, c.obturations.indexOf(reg().obturation)); },
          ecrire: function (v) { reg().obturation = c.obturations[v]; },
          texte: function () { return "1/" + reg().obturation + " s"; }
        });
        const ro = rangee(), btRoue = bouton("Faire tourner la roue", function () { regleRoue(!etat.roue); if (etat.roue) viser(CIBLES.roue[1], CIBLES.roue[2], CIBLES.roue[3]); maj("roue"); });
        ro.append(btRoue); ob.corps.append(ro);
        rafraichir.push(function () { btRoue.setAttribute("aria-pressed", String(etat.roue)); btRoue.textContent = etat.roue ? "Arrêter la roue" : "Faire tourner la roue"; });
        p.append(ob.racine);
        const s = c.sensibilite;
        p.append(curseur("sensibilite", s.type === "gain" ? "Gain" : "Sensibilité", {
          min: 0, max: s.valeurs.length - 1,
          lire: function () { return Math.max(0, s.valeurs.indexOf(reg().sensibilite)); },
          ecrire: function (v) { reg().sensibilite = s.valeurs[v]; },
          texte: function () { return s.type === "gain" ? signe(reg().sensibilite) + " dB <small>≈ " + Optique.nombre(Math.round(etat.calc.iso / 10) * 10) + " ISO</small>" : Optique.nombre(reg().sensibilite) + " ISO"; }
        }).racine);

        let blanc;
        if (c.blancs) blanc = choix("blanc", "Balance des blancs", { options: c.blancs.map(function (v) { return { v: v, nom: Optique.nombre(v) }; }), lire: lire("blanc"), ecrire: ecrire("blanc"), texte: function () { return Optique.nombre(reg().blanc) + " K"; } });
        else blanc = curseur("blanc", "Balance des blancs", { min: 2500, max: 9900, pas: 100, lire: lire("blanc"), ecrire: ecrire("blanc"), texte: function () { return Optique.nombre(reg().blanc) + " K"; } });
        const rb = rangee();
        rb.append(bouton("Faire le blanc", function () {
          // La caméra se règle sur la lumière du plateau (au plus proche, si elle n'a que des positions fixes).
          const k = etat.commun.kelvin;
          reg().blanc = c.blancs ? c.blancs.reduce(function (a, v) { return Math.abs(v - k) < Math.abs(a - k) ? v : a; }) : k;
          maj("blanc");
        }));
        blanc.corps.append(rb);
        p.append(blanc.racine);
      }
    },

    /* ----- L'IMAGE : la courbe de la caméra (menu Paint, profil d'image) ----- */
    image: {
      nom: "Image",
      sous: function () { return etat.config === "plateau" ? "Menu Paint, réglé depuis le RCP" : "Profil d’image du boîtier"; },
      construire: function (p) {
        const c = cfg();
        p.append(choix("gamma", "Gamma", { options: c.gammas.map(function (g) { return { v: g.id, nom: g.nom }; }), lire: lire("gamma"), ecrire: ecrire("gamma") }).racine);
        p.append(curseur("masterGamma", "Master gamma", { min: -10, max: 10, lire: function () { return reg().masterGamma * 10; }, ecrire: function (v) { reg().masterGamma = v / 10; }, texte: function () { return signe(reg().masterGamma * 10); } }).racine);
        p.append(curseur("masterBlack", "Master black", { min: -20, max: 20, lire: lire("masterBlack"), ecrire: ecrire("masterBlack"), texte: function () { return signe(reg().masterBlack); } }).racine);
        p.append(curseur("bgNiveau", "Black gamma", {
          aide: "blackGamma", min: -7, max: 7, lire: lire("bgNiveau"), ecrire: ecrire("bgNiveau"),
          texte: function () { const v = reg().bgNiveau; return signe(v) + (v > 0 ? " <small>stretch</small>" : v < 0 ? " <small>press</small>" : ""); }
        }).racine);
        p.append(choix("bgPlage", "Plage du black gamma", { aide: "blackStretch", options: [{ v: 0, nom: "Étroite" }, { v: 1, nom: "Moyenne" }, { v: 2, nom: "Large" }], lire: lire("bgPlage"), ecrire: ecrire("bgPlage") }).racine);
        p.append(choix("knee", "Knee", { options: [{ v: false, nom: "Coupé" }, { v: true, nom: "Actif" }], lire: lire("knee"), ecrire: ecrire("knee") }).racine);
        p.append(curseur("kneePoint", "Point de knee", { aide: "knee", min: 75, max: 105, lire: lire("kneePoint"), ecrire: ecrire("kneePoint"), texte: function () { return reg().kneePoint + " %"; } }).racine);
        p.append(curseur("kneePente", "Pente du knee", { aide: "knee", min: -5, max: 5, lire: lire("kneePente"), ecrire: ecrire("kneePente"), texte: function () { return signe(reg().kneePente) + (reg().kneePente < 0 ? " <small>douce</small>" : reg().kneePente > 0 ? " <small>raide</small>" : ""); } }).racine);
        p.append(curseur("saturation", "Saturation", { min: -10, max: 10, lire: lire("saturation"), ecrire: ecrire("saturation"), texte: function () { return signe(reg().saturation); } }).racine);
        const dt = curseur("detail", "Détail", { min: -7, max: 7, lire: lire("detail"), ecrire: ecrire("detail"), texte: function () { return signe(reg().detail); } });
        const rz = rangee();
        rz.append(bouton("Tout remettre à zéro", function () {
          Object.assign(reg(), { gamma: "itu709", masterGamma: 0, masterBlack: 0, bgNiveau: 0, bgPlage: 1, knee: true, kneePoint: 90, kneePente: 0, saturation: 0, detail: 0 });
          maj("gamma");
        }));
        dt.corps.append(rz);
        p.append(dt.racine);
      }
    },

    /* ----- LES DÉFAUTS OPTIQUES ----- */
    defauts: {
      nom: "Défauts optiques",
      sous: function () { return "Ils dépendent de l’objectif, de la focale et de l’ouverture"; },
      construire: function (p) {
        const d = etat.commun.defauts;
        p.append(choix("niveau", "Force", {
          options: [{ v: 0, nom: "Corrigés" }, { v: 1, nom: "Réels" }, { v: 3, nom: "×3" }],
          lire: function () { return d.niveau; }, ecrire: function (v) { d.niveau = v; }
        }).racine);
        // Une case par défaut, avec sa valeur mesurée sur l'objectif réel (avant accentuation).
        const ouvert = function (k, o) { return Math.max(0, 1 - Math.log2(k.N / (o.nMin * (reg().doubleur ? 2 : 1))) / 2.5); };
        const mesure = {
          acLat: function (k, o) { const px = Math.abs(Optique.table(o.acLat, reg().focale)) * (reg().doubleur ? 1.5 : 1) * 1101; return px < 0.25 ? "nulle à cette focale" : Optique.nombre(px, 1) + " px HD au coin"; },
          acLon: function (k, o) { return "frange de " + Optique.nombre(o.acLon * k.f / k.N * 1920 / cfg().capteur.l, 1) + " px HD"; },
          vignettage: function (k, o) { return "−" + Optique.nombre(Optique.table(o.vignettage, reg().focale) * Math.pow(ouvert(k, o), 1.4) + o.cosP / 2 * Math.log2(1 + Math.pow(k.demiDiag / k.f, 2)), 1) + " IL au coin"; },
          diffraction: function (k) { const t = 2 * 0.00054 * k.N * 1000; return "tache de " + Optique.nombre(t, 1) + " µm = " + Optique.nombre(t / cfg().capteur.pas, 1) + " photosite" + (t / cfg().capteur.pas >= 2 ? "s" : ""); },
          distorsion: function (k, o) { const v = Optique.table(o.distorsion, reg().focale) * 100; return Math.abs(v) < 0.3 ? "négligeable" : Optique.nombre(Math.abs(v), 1) + " % en " + (v < 0 ? "barillet" : "coussinet"); },
          pique: function (k, o) { const u = ouvert(k, o); return u > 0.85 ? "marquée" : u > 0.4 ? "modérée" : u > 0.05 ? "légère" : "nulle à cette ouverture"; }
        };
        [["acLat", "Chromatique latérale"], ["acLon", "Chromatique longitudinale"], ["vignettage", "Vignettage"], ["diffraction", "Diffraction"], ["distorsion", "Distorsion"], ["pique", "Mollesse à pleine ouverture"]].forEach(function (x) {
          const b = bloc(x[0], x[1]);
          const etiq = el("label", "case");
          const coche = el("input"); coche.type = "checkbox";
          coche.addEventListener("change", function () { d[x[0]] = coche.checked; maj(x[0]); });
          const valeur = el("span");
          etiq.append(coche, valeur);
          b.corps.append(etiq);
          rafraichir.push(function () { coche.checked = d[x[0]]; coche.disabled = d.niveau === 0; valeur.textContent = mesure[x[0]](etat.calc, cfg().objectif); });
          p.append(b.racine);
        });
      }
    }
  };

  // Construit la feuille des réglages de la famille ouverte (ou la cache).
  function construirePanneau() {
    rafraichir = [];
    const f = $("feuille"), def = PANNEAUX[etat.panneau];
    f.hidden = !def;
    Array.prototype.forEach.call($("dock").querySelectorAll("[data-panneau]"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.panneau === etat.panneau)); });
    if (!def) return;
    $("feuille-titre").textContent = def.nom; $("feuille-sous").textContent = def.sous();
    const p = $("panneau"); p.textContent = "";
    def.construire(p);
  }
  function ouvrirPanneau(id) { etat.panneau = etat.panneau === id ? null : id; fermerMenu(); construirePanneau(); maj(); }

  /* ------------------------------------------------------------------------
     3. LES FENÊTRES
     Taille de départ et coin préféré de chacune. « auto » : la hauteur suit
     le contenu (image 16:9, schéma, texte), on ne règle que la largeur.
     ------------------------------------------------------------------------ */
  const FENETRES = {
    retour: { nom: "Retour caméra", l: function (vw) { return Math.min(600, Math.max(290, vw * 0.3)); }, auto: true, haut: function (l) { return l * 9 / 16 + 44; }, coin: "hg" },
    profondeur: { nom: "Vue de côté / de dessus", l: function (vw) { return Math.min(600, Math.max(290, vw * 0.3)); }, h: 270, coin: "hg" },
    anatomie: { nom: "Coupe de l’objectif", l: function () { return 640; }, auto: true, haut: function (l) { return l * 0.33 + 46; }, coin: "hg" },
    capteur: { nom: "Capteur et chaîne du signal", l: function () { return 620; }, auto: true, haut: function (l) { return l * 0.33 + 120; }, coin: "hg" },
    signal: { nom: "Oscilloscope et courbe", l: function () { return 620; }, h: 290, coin: "hg" },
    explications: { nom: "Explications", l: function () { return 320; }, auto: true, haut: function () { return 320; }, coin: "hd" },
    experience: { l: function () { return 340; }, auto: true, haut: function () { return 250; }, coin: "hd" }
  };
  let dessus = 20;                   // la fenêtre touchée en dernier passe devant les autres

  const Fenetres = {
    init: function () {
      Object.keys(FENETRES).forEach(function (id) {
        const f = $("fen-" + id), def = FENETRES[id], tete = f.querySelector(".fen-tete"), poignee = f.querySelector(".fen-poignee");
        def.el = f;
        f.addEventListener("pointerdown", function () { f.style.zIndex = dessus = dessus >= 58 ? 21 : dessus + 1; });
        f.querySelector(".fen-x:not(.fen-grand)").addEventListener("click", function () { if (id === "experience") etat.experience = null; etat.affiche[id] = false; Fenetres.synchroniser(); maj(); });

        // Déplacer : on attrape la barre de titre.
        let prise = null;
        tete.addEventListener("pointerdown", function (e) {
          if (e.target.closest("button") || f.classList.contains("agrandie")) return;
          const r = f.getBoundingClientRect();
          prise = { dx: e.clientX - r.left, dy: e.clientY - r.top };
          tete.setPointerCapture(e.pointerId);
        });
        tete.addEventListener("pointermove", function (e) {
          if (!prise) return;
          const vw = window.innerWidth, vh = window.innerHeight;
          f.style.left = Math.min(vw - 70, Math.max(70 - f.offsetWidth, e.clientX - prise.dx)) + "px";
          f.style.top = Math.min(vh - 44, Math.max(0, e.clientY - prise.dy)) + "px";
        });
        ["pointerup", "pointercancel"].forEach(function (n) { tete.addEventListener(n, function () { prise = null; }); });
        // Agrandir / rétablir : le bouton à côté de la croix, ou un double-clic sur le titre.
        const grand = el("button", "fen-x fen-grand", '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.200 1.500h3.300v3.300M4.800 10.500H1.500V7.200M10.300 1.700 6.900 5.100M1.700 10.300l3.400-3.400" fill="none" stroke="currentColor" stroke-width="1.300" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        grand.type = "button"; grand.title = "Agrandir ou rétablir la fenêtre"; grand.setAttribute("aria-label", grand.title);
        const basculer = function () { f.classList.toggle("agrandie"); Fenetres.ajuster(id); maj(); };
        grand.addEventListener("click", basculer);
        f.querySelector(".fen-x").before(grand);
        tete.addEventListener("dblclick", function (e) { if (!e.target.closest("button")) basculer(); });

        // Redimensionner : on tire le coin bas droit.
        let coin = null;
        poignee.addEventListener("pointerdown", function (e) { const r = f.getBoundingClientRect(); coin = { x: e.clientX, y: e.clientY, l: r.width, h: r.height }; poignee.setPointerCapture(e.pointerId); e.preventDefault(); });
        poignee.addEventListener("pointermove", function (e) {
          if (!coin) return;
          f.style.width = Math.min(window.innerWidth - 8, Math.max(230, coin.l + e.clientX - coin.x)) + "px";
          if (!def.auto) f.style.height = Math.min(window.innerHeight - 60, Math.max(170, coin.h + e.clientY - coin.y)) + "px";
        });
        ["pointerup", "pointercancel"].forEach(function (n) { poignee.addEventListener(n, function () { coin = null; }); });
        // Quand sa taille change, son contenu se redessine.
        if (window.ResizeObserver) new ResizeObserver(function () { if (!f.hidden) { Fenetres.ajuster(id); redessinerFenetres(); if (id === "retour") planifier(false); } }).observe(f);
      });
    },

    // Trouve une place libre pour une fenêtre qui s'ouvre, près de son coin préféré.
    placer: function (id) {
      const def = FENETRES[id], f = def.el, vw = window.innerWidth, vh = window.innerHeight;
      const l = Math.min(def.l(vw), vw - 16), h = def.h || def.haut(l);
      // Ce qui occupe déjà l'écran : les autres fenêtres et, si elle est ouverte, la feuille des réglages.
      const pris = Object.keys(FENETRES).filter(function (x) { return x !== id && !FENETRES[x].el.hidden; }).map(function (x) { return FENETRES[x].el.getBoundingClientRect(); });
      if (!$("feuille").hidden) pris.push($("feuille").getBoundingClientRect());
      // La surface qu'une fenêtre posée en (x, y) recouvrirait : on cherche zéro, sinon le moins possible.
      const gene = function (x, y) { return pris.reduce(function (s, r) { return s + Math.max(0, Math.min(x + l + 8, r.right) - Math.max(x - 8, r.left)) * Math.max(0, Math.min(y + h + 8, r.bottom) - Math.max(y - 8, r.top)); }, 0); };
      const xs = [], ys = [];
      for (let x = 12; x <= vw - l - 12; x += 30) xs.push(x);
      for (let y = 58; y <= vh - h - 96; y += 30) ys.push(y);
      if (!xs.length) xs.push(Math.max(4, (vw - l) / 2));
      if (!ys.length) ys.push(58);
      if (def.coin === "hd") xs.reverse();
      let place = [xs[0], ys[0]], mieux = Infinity;
      for (let i = 0; i < xs.length && mieux > 0; i++) for (let j = 0; j < ys.length && mieux > 0; j++) { const g = gene(xs[i], ys[j]); if (g < mieux) { mieux = g; place = [xs[i], ys[j]]; } }
      f.style.left = place[0] + "px"; f.style.top = place[1] + "px"; f.style.width = l + "px";
      f.style.height = def.auto ? "auto" : h + "px";
      def.place = true;
    },

    // Met l'écran en accord avec etat.affiche : ouvre, ferme, place.
    synchroniser: function () {
      const ids = Object.keys(FENETRES);
      ids.forEach(function (id) { const f = FENETRES[id].el; if (!etat.affiche[id] && !f.hidden) { f.hidden = true; f.classList.remove("agrandie"); } });   // d'abord on ferme…
      ids.forEach(function (id) {                                                                                                                         // …puis on ouvre
        const f = FENETRES[id].el;
        if (etat.affiche[id] && f.hidden) { if (!FENETRES[id].place) Fenetres.placer(id); f.hidden = false; f.style.zIndex = dessus = dessus >= 58 ? 21 : dessus + 1; }
      });
      construireMenu();
      $("reperes").hidden = !etat.affiche.explications;
    },

    // Le retour caméra garde ses proportions 16:9, même agrandi.
    ajuster: function (id) {
      if (id !== "retour") return;
      const f = FENETRES.retour.el, m = $("moniteur");
      if (f.classList.contains("agrandie")) {
        const c = m.parentElement, l = c.clientWidth - 12, h = c.clientHeight - 6, w = Math.max(120, Math.min(l, h * 16 / 9));
        m.style.width = w + "px"; m.style.height = w * 9 / 16 + "px";
      } else { m.style.width = ""; m.style.height = ""; }
    },

    // Après un changement de taille de la page : personne ne doit rester hors de l'écran.
    rentrer: function () {
      Object.keys(FENETRES).forEach(function (id) {
        const f = FENETRES[id].el; if (f.hidden) return;
        const r = f.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
        if (r.width > vw - 8) f.style.width = vw - 8 + "px";
        f.style.left = Math.min(Math.max(4, vw - Math.min(r.width, vw - 8) - 4), Math.max(4, r.left)) + "px";
        f.style.top = Math.min(vh - 60, Math.max(0, r.top)) + "px";
      });
    }
  };

  /* Le dock et le menu « Afficher » */
  const PICTOS = {
    objectif: '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    exposition: '<circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    image: '<path d="M3.5 20.5V3.5M3.5 20.5h17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4.5 19c5-.4 7.8-4 10.2-9.2 1.2-2.6 2.8-3.6 5.3-3.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    defauts: '<path d="M12 4.2 20.5 19h-17z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M2.5 11.5 9 12.6M14.6 12.4l7-2.2M14.9 14.4l6.600 1.400" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    afficher: '<path d="M2.6 12c2.3-4.1 5.500-6.200 9.400-6.200s7.100 2.100 9.400 6.200c-2.300 4.100-5.500 6.200-9.400 6.200S4.900 16.100 2.600 12z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'
  };
  function construireDock() {
    const dock = $("dock");
    [["objectif", "Objectif"], ["exposition", "Exposition"], ["image", "Image"], ["defauts", "Défauts"]].forEach(function (o) {
      const b = el("button", "", '<svg viewBox="0 0 24 24" aria-hidden="true">' + PICTOS[o[0]] + "</svg>" + o[1]); b.type = "button";
      b.dataset.panneau = o[0]; b.setAttribute("aria-pressed", "false"); b.title = "Réglages : " + PANNEAUX[o[0]].nom;
      b.addEventListener("click", function () { ouvrirPanneau(o[0]); });
      dock.append(b);
    });
    dock.append(el("span", "sep"));
    const a = el("button", "", '<svg viewBox="0 0 24 24" aria-hidden="true">' + PICTOS.afficher + "</svg>Afficher"); a.type = "button"; a.id = "btn-afficher";
    a.setAttribute("aria-expanded", "false"); a.setAttribute("aria-haspopup", "menu"); a.title = "Choisir ce qui est affiché : fenêtres, schémas, explications";
    a.addEventListener("click", function (e) { e.stopPropagation(); const m = $("menu-afficher"); if (m.hidden) ouvrirMenu(); else fermerMenu(); });
    dock.append(a);
  }
  function construireMenu() {
    const m = $("menu-afficher"); m.textContent = "";
    [["retour", FENETRES.retour.nom], ["zone", "Champ et zone nette dans la scène"], ["profondeur", FENETRES.profondeur.nom], ["anatomie", FENETRES.anatomie.nom], ["capteur", FENETRES.capteur.nom], ["signal", FENETRES.signal.nom], ["explications", "Explications et repères"]].forEach(function (o, i) {
      if (i === 2 || i === 6) m.append(el("hr"));
      const b = el("button", "", "<span>" + o[1] + '</span><i class="inter" aria-hidden="true"></i>'); b.type = "button";
      b.setAttribute("role", "menuitemcheckbox"); b.setAttribute("aria-checked", String(!!etat.affiche[o[0]]));
      b.addEventListener("click", function (e) { e.stopPropagation(); etat.affiche[o[0]] = !etat.affiche[o[0]]; Fenetres.synchroniser(); maj(); });
      m.append(b);
    });
    m.append(el("hr"));
    const r = el("button", "", "<span>Recentrer la scène</span>"); r.type = "button"; r.setAttribute("role", "menuitem");
    r.addEventListener("click", function () { Scene.recentrer(); fermerMenu(); });
    m.append(r);
  }
  function ouvrirMenu() {
    const m = $("menu-afficher"), b = $("btn-afficher");
    m.hidden = false; b.setAttribute("aria-expanded", "true");
    const r = b.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.left + r.width / 2 - m.offsetWidth / 2)) + "px";
  }
  function fermerMenu() { $("menu-afficher").hidden = true; $("btn-afficher").setAttribute("aria-expanded", "false"); }

  /* ------------------------------------------------------------------------
     4. LA MISE À JOUR — appelée après chaque geste
     ------------------------------------------------------------------------ */
  let renduPret = false, scenePrete = false;

  function maj(cle) {
    if (cle) etat.sujet = { reglage: cle };
    borner();
    etat.calc = Optique.calculer(cfg(), reg(), etat.commun);
    rafraichir.forEach(function (f) { f(); });
    infosMoniteur();
    if (scenePrete) Scene.dessiner(vue());
    redessinerFenetres();
    expliquer();
    planifier(false);
  }

  // Tout ce dont les dessins ont besoin, en un seul objet.
  function vue() {
    return {
      config: etat.config, cfg: cfg(), r: reg(), commun: etat.commun, calc: etat.calc,
      distance: etat.distance, camZ: camZ(), pan: etat.pan, tilt: etat.tilt, loupe: etat.loupe, zone: etat.affiche.zone,
      roueAngle: etat.roueAngle, roueBalayage: etat.roue ? VITESSE_ROUE * etat.calc.t : 0, aides: etat.aides
    };
  }

  // Les inscriptions du viseur, par-dessus l'image, et l'état des boutons.
  function infosMoniteur() {
    const k = etat.calc, r = reg(), c = cfg();
    $("mon-info").innerHTML = "<span>" + Optique.nombre(k.f, k.f < 20 ? 1 : 0) + " mm</span><span>" + Optique.diaph(k.N) + "</span><span>1/" + r.obturation + "</span><span>" +
      (c.sensibilite.type === "gain" ? signe(r.sensibilite) + " dB" : "ISO " + Optique.nombre(r.sensibilite)) + "</span><span>" + (k.nd.t === 1 ? "ND —" : (c.id === "plateau" ? "ND " : "") + k.nd.nom) + "</span><span>" + Optique.nombre(r.blanc) + " K</span>";
    const e = $("mon-expo");
    e.textContent = Math.abs(k.il) < 0.05 ? "Expo ✓" : "Expo " + signe(k.il, 1) + " IL";
    e.className = "mon-expo" + (Math.abs(k.il) <= 0.5 ? "" : Math.abs(k.il) > 1.5 ? " mauvais" : " moyen");
    const d = etat.commun.defauts;
    $("mon-badges").innerHTML = (etat.loupe.zoom > 1 ? "<span>Loupe ×" + etat.loupe.zoom + "</span>" : "") + (d.niveau === 3 ? "<span>Défauts ×3</span>" : d.niveau === 0 ? "<span>Défauts corrigés</span>" : "");
    $("aide-loupe").textContent = "×" + etat.loupe.zoom; $("aide-loupe").setAttribute("aria-pressed", String(etat.loupe.zoom > 1));
    $("aide-peaking").setAttribute("aria-pressed", String(etat.aides.peaking));
    $("aide-zebra").textContent = ["Zébra", "Zébra 70", "Zébra 100"][etat.aides.zebra]; $("aide-zebra").setAttribute("aria-pressed", String(etat.aides.zebra > 0));
    Array.prototype.forEach.call($("choix-config").children, function (bt) { bt.setAttribute("aria-pressed", String(bt.dataset.id === etat.config)); });
  }

  // Ce qui est posé sur la scène : l'étiquette du plan net et, avec les explications, les repères du matériel.
  function habillerScene() {
    const e = Scene.etiquette(), k = etat.calc, q = $("etq-net");
    q.hidden = !e;
    if (e) { q.style.left = e.x + "px"; q.style.top = e.y + "px"; q.textContent = "Net " + Optique.distance(k.distNette) + " · de " + Optique.distance(k.pres) + " à " + (isFinite(k.loin) ? Optique.distance(k.loin) : "∞"); }
    if (!etat.affiche.explications) return;
    const zone = $("reperes"), liste = Materiel.REPERES[etat.config];
    if (zone.dataset.config !== etat.config) {
      zone.textContent = ""; zone.dataset.config = etat.config;
      liste.forEach(function (r) {
        const b = el("button", "repere", String(r.n)); b.type = "button"; b.title = AIDES[r.cle].titre; b.setAttribute("aria-label", AIDES[r.cle].titre);
        b.addEventListener("click", function () { etat.sujet = { piece: r.cle }; expliquer(); habillerScene(); });
        zone.append(b);
      });
    }
    liste.forEach(function (r, i) {
      const p = Scene.repere(r), b = zone.children[i];
      b.hidden = !p; if (p) { b.style.left = p.x + "px"; b.style.top = p.y + "px"; }
      b.classList.toggle("sel", !!etat.sujet && etat.sujet.piece === r.cle);
    });
  }

  /* LE COMMENTAIRE : une phrase chiffrée sur ce que le dernier réglage vient de faire. */
  function commenter(cle) {
    const k = etat.calc, r = reg(), c = cfg(), o = c.objectif;
    const zone = isFinite(k.loin) ? "de " + Optique.distance(k.pres) + " à " + Optique.distance(k.loin) : isFinite(k.pres) ? "de " + Optique.distance(k.pres) + " à l’infini" : "nulle part";
    const sujetNet = Optique.flou(k, etat.distance) < k.c0 * 1.2;
    const expo = Math.abs(k.il) <= 0.5 ? "L’exposition est correcte." : k.il > 0 ? "L’image est surexposée de " + Optique.nombre(k.il, 1) + " IL." : "L’image est sous-exposée de " + Optique.nombre(-k.il, 1) + " IL.";
    let t = "";
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
      case "lux": case "nd": case "obturation": case "sensibilite": case "roue":
        t = "<b>" + Optique.nombre(etat.commun.lux) + " lux</b>, " + Optique.diaph(k.N) + ", 1/" + r.obturation + " s, " + (c.sensibilite.type === "gain" ? signe(r.sensibilite) + " dB" : Optique.nombre(r.sensibilite) + " ISO") + (k.nd.t < 1 ? ", filtre " + k.nd.nom : "") + ". " + expo;
        if (cle === "sensibilite" && Math.sqrt(k.bruit.a2 + k.bruit.b2 * 0.05) > 0.006) t += " Le <b>bruit</b> devient visible dans les ombres.";
        if (cle === "sensibilite" && c.bruit.isoHaut && r.sensibilite >= c.bruit.isoHaut) t += " Seconde sensibilité de base : le bruit de lecture est retombé.";
        if (cle === "obturation" || cle === "roue") t += etat.roue ? " La roue " + (r.obturation >= 500 ? "est figée." : "file.") : " Faites tourner la roue pour voir l’effet sur le mouvement.";
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
      case "cadre":
        t = "Panoramique " + signe(etat.pan / RAD, 0) + "°, inclinaison " + signe(etat.tilt / RAD, 0) + "°. Le centre de l’image vise un point à <b>" + Optique.distance(distanceVisee()) + "</b> ; le plan net est à " + (isFinite(k.distNette) ? Optique.distance(k.distNette) : "l’infini") + ".";
        break;
      case "config":
        t = "<b>" + c.nom + " " + c.modele + "</b> : " + c.capteur.detail + ", " + o.nom.toLowerCase() + " (" + o.type + "). Les réglages de l’autre configuration sont conservés : passez de l’une à l’autre pour comparer.";
        break;
    }
    return t;
  }

  // Le texte d'une fiche d'explication.
  function ficheHTML(a) {
    if (!a) return "";
    let h = "<p>" + a.quoi + "</p>";
    if (a.image) h += '<p class="comparaison"><b>Comparaison.</b> ' + a.image + "</p>";
    if (a.observer) h += "<p><b>À observer.</b> " + a.observer + "</p>";
    if (a[etat.config]) h += '<p class="propre"><b>' + cfg().nom + ".</b> " + a[etat.config] + "</p>";
    return h;
  }
  /* LA FENÊTRE « EXPLICATIONS » : elle suit ce que l'on touche. Un réglage :
     sa fiche, précédée d'une phrase chiffrée sur ce qu'il vient de changer.
     Une pièce d'un schéma ou un repère du matériel : sa fiche. */
  const TITRES = { cadre: "Le cadre", config: "La configuration" };
  function expliquer() {
    if (!etat.affiche.explications) return;
    const s = etat.sujet, zone = $("explications");
    let h = "";
    if (s && s.piece) { const a = PIECES[s.piece] || AIDES[s.piece]; h = "<h4>" + a.titre + "</h4>" + ficheHTML(a); }
    else if (s && s.reglage) {
      const bl = document.querySelector('.reg[data-cle="' + s.reglage + '"]'), a = AIDES[(bl && bl.dataset.aide) || s.reglage], vivant = commenter(s.reglage);
      h = (a ? "<h4>" + a.titre + "</h4>" : TITRES[s.reglage] ? "<h4>" + TITRES[s.reglage] + "</h4>" : "") + (vivant ? '<p class="vivant">' + vivant + "</p>" : "") + ficheHTML(a);
    }
    zone.innerHTML = h || "<h4>Les explications suivent vos gestes</h4><p>Touchez un réglage : sa fiche s’affiche ici, avec une comparaison et ce qu’il faut observer.</p><p>Dans la scène, cliquez sur un <b>repère numéroté</b> pour découvrir le matériel. Dans les schémas, cliquez sur une pièce.</p>";
  }

  /* Le contenu des fenêtres ouvertes */
  function chaine() {
    const r = reg(), k = etat.calc, c = cfg();
    const gain = c.sensibilite.type === "gain" ? signe(r.sensibilite) + " dB" : Optique.nombre(r.sensibilite) + " ISO";
    const courbe = c.gammas.filter(function (g) { return g.id === r.gamma; })[0].nom;
    const commun = [
      ["Blancs", Optique.nombre(r.blanc) + " K", "exposition", "blanc"],
      ["Gamma", courbe, "image", "gamma"],
      ["Black gamma", signe(r.bgNiveau), "image", "bgNiveau"],
      ["Knee", r.knee ? r.kneePoint + " %" : "coupé", "image", "knee"],
      ["Détail", signe(r.detail), "image", "detail"]
    ];
    if (etat.config === "plateau") return [["Objectif", Optique.diaph(k.N), "objectif", "ouverture"], ["Filtre ND", k.nd.nom, "exposition", "nd"], ["Prisme + 3 CMOS", "1/" + r.obturation + " s", "exposition", "obturation"], ["Gain", gain, "exposition", "sensibilite"]].concat(commun, [["Fibre → CCU", "SDI", null, "m_ccu"]]);
    return [["Filtre ND vissé", k.nd.nom, "exposition", "nd"], ["Objectif", Optique.diaph(k.N), "objectif", "ouverture"], ["CMOS Bayer", "1/" + r.obturation + " s", "exposition", "obturation"], ["Gain", gain, "exposition", "sensibilite"], ["Dématriçage", "RVB", null, "p_capteur_bayer"]].concat(commun, [["Codec → carte", "XAVC", null, "m_carte"]]);
  }
  function redessinerFenetres() {
    if (!etat.calc) return;
    const v = vue(), a = etat.affiche, piece = etat.sujet && etat.sujet.piece;
    if (a.profondeur) {
      Profondeur.dessiner($("profondeur"), v, etat.vueProfondeur); $("profondeur-resume").innerHTML = Profondeur.resume(v);
      Array.prototype.forEach.call($("choix-profondeur").children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.vue === etat.vueProfondeur)); });
    }
    if (a.anatomie) Anatomie.objectif($("anatomie"), v, piece);
    if (a.capteur) {
      Anatomie.capteur($("capteur"), v, piece);
      const zone = $("chaine"); zone.textContent = "";
      chaine().forEach(function (e, i) {
        if (i) zone.append(el("span", "fleche", "›"));
        const b = el("button", "maillon", "<small>" + e[0] + "</small><b>" + e[1] + "</b>"); b.type = "button";
        b.addEventListener("click", function () {
          if (e[2]) { etat.panneau = e[2]; construirePanneau(); maj(e[3]); eclairer(e[3]); } else { etat.sujet = { piece: e[3] }; ouvrirExplications(); }
        });
        zone.append(b);
      });
    }
    if (a.signal) { Signal.oscilloscope($("oscilloscope"), Rendu.signal, Rendu.SIGNAL.l, Rendu.SIGNAL.h); Signal.courbe($("courbe"), v); }
  }
  // Un clic sur une pièce ou un repère est une demande d'explication : la fenêtre s'ouvre.
  function ouvrirExplications() { etat.affiche.explications = true; Fenetres.synchroniser(); maj(); }
  // Fait clignoter un réglage de la feuille et l'amène à l'écran.
  function eclairer(cle) {
    const r = document.querySelector('.reg[data-cle="' + cle + '"]');
    if (!r) return;
    r.scrollIntoView({ block: "nearest", behavior: reduit ? "auto" : "smooth" });
    r.classList.remove("flash"); void r.offsetWidth; r.classList.add("flash");
  }
  // Clic (ou Entrée) sur une pièce d'un schéma SVG.
  function brancherSchema(id) {
    const choisir = function (e) {
      const p = e.target.closest ? e.target.closest(".piece") : null;
      if (!p || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      etat.sujet = { piece: p.dataset.cle };
      ouvrirExplications();
    };
    $(id).addEventListener("click", choisir); $(id).addEventListener("keydown", choisir);
  }

  /* ------------------------------------------------------------------------
     L'IMAGE DE LA CAMÉRA : quand la calculer, et à quelle taille
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
    if (!renduPret || !etat.calc) return;
    // Fenêtre du retour fermée : on ne calcule que si l'oscilloscope en a besoin, et en petit.
    const visible = $("moniteur").clientWidth;
    if (!visible && !etat.affiche.signal) return;
    const enGeste = !TOUJOURS_HD && performance.now() - dernierGeste < 300;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const largeur = (visible ? Math.min(plafond, Math.round(visible * dpr)) : 480) * (enGeste ? echelleGeste : 1);
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
    if (etat.affiche.signal) Signal.oscilloscope($("oscilloscope"), Rendu.signal, Rendu.SIGNAL.l, Rendu.SIGNAL.h);
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
  function regleRoue(active) {
    const avant = etat.roue;
    etat.roue = active;
    if (active && !avant) { tempsRoue = performance.now(); requestAnimationFrame(tournerRoue); }
  }
  // Le bruit « grouille » : huit fois par seconde, on ne refait que la dernière étape du calcul.
  setInterval(function () {
    if (!renduPret || reduit || document.hidden || etat.roue || enAttente || !etat.calc || !$("moniteur").clientWidth) return;
    const b = etat.calc.bruit;
    if (Math.sqrt(b.a2 + b.b2 * 0.1) > 0.0035) Rendu.rendreBruit(vue());
  }, 125);

  /* ------------------------------------------------------------------------
     5. CADRER, VISER, FAIRE LE POINT
     ------------------------------------------------------------------------ */
  // Les points que l'on peut viser d'un clic (X, Y, Z sur le plateau), et ceux des expériences.
  const CIBLES = {
    presentatrice: ["Sujet", 0, 1.2, Decor.SUJET_Z], mire: ["Mire", -0.85, 1.07, Decor.SUJET_Z], roue: ["Roue", 1.5, 1.5, 7.8], ecran: ["Écran", -1.7, 2.18, Decor.FOND_Z],
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
     6. LES EXPÉRIENCES GUIDÉES
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
      // Ouvre la famille de réglages utile et, s'il y en a une, la fenêtre utile.
      ouvrir: function (panneau, fenetre) { etat.panneau = panneau || null; if (fenetre) etat.affiche[fenetre] = true; }
    },
    lancer: function (x) {
      etat.experience = { x: x, etape: 0 };
      // On repart d'une base saine : défauts accentués, lumière normale, image à zéro, écran dégagé.
      etat.commun.lux = 1000; etat.commun.kelvin = 5600;
      Object.assign(etat.commun.defauts, { niveau: 3, acLat: true, acLon: true, vignettage: true, diffraction: true, distorsion: true, pique: true });
      ["plateau", "boitier"].forEach(function (id) { Object.assign(etat.reglages[id], { blanc: 5600, gamma: "itu709", masterGamma: 0, masterBlack: 0, bgNiveau: 0, bgPlage: 1, knee: true, kneePoint: 90, kneePente: 0, saturation: 0, detail: 0, doubleur: false, tirage: 0 }); });
      Object.assign(etat.affiche, { retour: true, zone: true, profondeur: false, anatomie: false, capteur: false, signal: false, experience: true });
      x.preparer(Experiences.S);
      etat.sujet = null;
      if ($("exp-fenetre").open) $("exp-fenetre").close();
      construirePanneau(); Experiences.afficher(); Fenetres.synchroniser(); maj();
    },
    afficher: function () {
      const carte = $("exp-carte"), e = etat.experience;
      carte.textContent = "";
      if (!e) { etat.affiche.experience = false; Fenetres.synchroniser(); return; }
      $("t-experience").textContent = e.x.titre;
      const points = el("div", "exp-points");
      e.x.etapes.forEach(function (x, i) { points.append(el("i", i === e.etape ? "on" : i < e.etape ? "fait" : "")); });
      carte.append(el("p", "exp-compte", "Étape " + (e.etape + 1) + " sur " + e.x.etapes.length), points, el("p", "", e.x.etapes[e.etape]));
      const rang = el("div", "btnrow");
      const prec = bouton("Précédente", function () { e.etape--; Experiences.afficher(); }, "btn small"); prec.disabled = e.etape === 0;
      const fin = e.etape === e.x.etapes.length - 1;
      rang.append(prec, bouton(fin ? "Terminer" : "Suivante", function () { if (fin) etat.experience = null; else e.etape++; Experiences.afficher(); }, "btn small primary"), bouton("Recommencer", function () { Experiences.lancer(e.x); }, "btn small ghost"));
      carte.append(rang);
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

  /* ------------------------------------------------------------------------
     MISE EN ROUTE
     ------------------------------------------------------------------------ */
  function demarrer() {
    // L'icône et ses couleurs viennent du catalogue.
    const app = typeof CATALOGUE !== "undefined" && CATALOGUE.filter(function (a) { return a.id === "tmo-simulateur-camera"; })[0];
    if (app) { $("sim-icone").style.setProperty("--app-grad", "linear-gradient(160deg, " + app.teinte.join(", ") + ")"); $("sim-icone").innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[app.icone] + "</svg>"; }

    // Le choix de la configuration
    Object.keys(CONFIGS).forEach(function (id) {
      // Deux libellés : le nom complet, et un nom court pour les petits écrans (voir simulateur.css).
      const c = CONFIGS[id], b = el("button", "", '<span class="long">' + c.nom + '</span><span class="court">' + c.nom.split(" ")[c.id === "plateau" ? 2 : 0].replace(/^./, function (x) { return x.toUpperCase(); }) + "</span>");
      b.type = "button"; b.dataset.id = id; b.title = c.modele + " · " + c.capteur.nom + " · zoom " + c.objectif.type;
      b.addEventListener("click", function () { if (etat.config === id) return; etat.config = id; construirePanneau(); maj("config"); });
      $("choix-config").append(b);
    });

    // Thème clair / sombre (js/theme.js)
    const soleil = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const lune = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7z" fill="currentColor"/></svg>';
    const bt = $("bouton-theme");
    const dessinerTheme = function () { const sombre = document.documentElement.getAttribute("data-theme") === "dark"; bt.innerHTML = sombre ? soleil : lune; bt.title = sombre ? "Passer en mode clair" : "Passer en mode sombre"; bt.setAttribute("aria-label", bt.title); };
    bt.addEventListener("click", function () { themeBasculer(); dessinerTheme(); });
    dessinerTheme();

    // Les aides de visée, dans la barre de titre du retour caméra
    $("aide-zebra").title = "Zébra : hachures sur les zones à 70 %, puis à 100 %";
    $("aide-peaking").title = "Peaking : les contours nets en rouge";
    $("aide-loupe").title = "Loupe : ×2, ×4, ×8. Glissez dans l’image pour la déplacer";
    $("aide-zebra").addEventListener("click", function () { etat.aides.zebra = (etat.aides.zebra + 1) % 3; maj("zebra"); });
    $("aide-peaking").addEventListener("click", function () { etat.aides.peaking = !etat.aides.peaking; maj("peaking"); });
    $("aide-loupe").addEventListener("click", function () { etat.loupe.zoom = { 1: 2, 2: 4, 4: 8, 8: 1 }[etat.loupe.zoom]; if (etat.loupe.zoom === 1) { etat.loupe.x = 0; etat.loupe.y = 0; } maj("loupe"); });
    [["cote", "Côté"], ["dessus", "Dessus"]].forEach(function (o) {
      const b = el("button", "", o[1]); b.type = "button"; b.dataset.vue = o[0];
      b.addEventListener("click", function () { etat.vueProfondeur = o[0]; redessinerFenetres(); });
      $("choix-profondeur").append(b);
    });

    construireDock();
    $("feuille-x").addEventListener("click", function () { etat.panneau = null; construirePanneau(); });
    document.addEventListener("click", function (e) { if (!$("menu-afficher").hidden && !e.target.closest("#menu-afficher")) fermerMenu(); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!$("menu-afficher").hidden) fermerMenu(); else if (etat.panneau) { etat.panneau = null; construirePanneau(); }
    });
    brancherSchema("anatomie"); brancherSchema("capteur");
    brancherMoniteur();
    Fenetres.init();

    // Les expériences
    Experiences.liste();
    $("btn-experiences").addEventListener("click", function () { const f = $("exp-fenetre"); if (f.showModal) f.showModal(); else f.setAttribute("open", ""); });
    $("exp-fermer").addEventListener("click", function () { $("exp-fenetre").close(); });
    $("exp-fenetre").addEventListener("click", function (e) { if (e.target === this) this.close(); });

    // La scène, puis l'image de la caméra
    const souci = Scene.init($("scene"), { apres: habillerScene, bouge: function () { $("astuce").classList.add("vu"); } });
    if (souci) { $("scene-message").hidden = false; $("scene-message").textContent = souci; } else scenePrete = true;
    const erreur = Rendu.init($("image"), { leger: /Android|iPhone|iPad/.test(navigator.userAgent) });
    if (erreur) { $("mon-message").hidden = false; $("mon-message").textContent = erreur; } else renduPret = true;
    // Si le navigateur reprend la carte graphique (onglet resté longtemps en arrière-plan…), on le dit.
    $("image").addEventListener("webglcontextlost", function (e) {
      e.preventDefault(); renduPret = false;
      $("mon-message").hidden = false; $("mon-message").textContent = "Le calcul de l’image a été interrompu par le navigateur. Rechargez la page pour le relancer.";
    });

    // Point de départ : le point est fait sur la présentatrice, dans les deux configurations.
    Experiences.S.point("plateau", etat.distance); Experiences.S.point("boitier", etat.distance);
    etat.calc = Optique.calculer(cfg(), reg(), etat.commun);
    Fenetres.synchroniser();
    construirePanneau();
    maj();
    setTimeout(function () { $("astuce").classList.add("vu"); }, 9000);

    // Quand la page change de taille, tout se redessine à la bonne définition.
    let redim = null;
    window.addEventListener("resize", function () { clearTimeout(redim); redim = setTimeout(function () { Fenetres.rentrer(); maj(); }, 120); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) planifier(false); });
    // Un accès pour les curieux, dans la console du navigateur (F12) : Simulateur.etat
    window.Simulateur = { etat: etat, maj: maj, experiences: Experiences, fenetres: Fenetres, panneau: construirePanneau };
  }

  demarrer();
})();
