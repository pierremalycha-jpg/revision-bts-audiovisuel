/* ==========================================================================
   application.js — le moteur du « kit application »
   --------------------------------------------------------------------------
   Toutes les applications de révision sont construites sur le modèle de
   l'application de photométrie, qui sert de RÉFÉRENCE :

     Accueil de l'application  héros, progression, parcours des modules
     Pour chaque module, quatre étapes, dans cet ordre :
       1. Comprendre   les mots et les formules, en questions dépliables
       2. Manipuler    animations et simulations (le « labo » du module)
       3. Retenir      l'essentiel avant l'évaluation
       4. S'évaluer    10 questions, notées sur 20 ; 12/20 ouvre le module suivant

   Ce fichier fabrique toute la page à partir de deux choses :
     - contenu.js  : le texte (notions, essentiel, questions), sans code ;
     - les <template data-labo="n"> de la page + labos.js : les labos.
   Une application n'a donc JAMAIS à recopier le menu, l'évaluation ou la
   mise en page : elle décrit son contenu, le moteur fait le reste.

   Utilisation (voir modules/modele/index.html) :
     <script src="contenu.js"></script>          définit APPLICATION
     <script src="../../js/application.js"></script>
     <script src="labos.js"></script>            Application.labo(1, function (zone) { … })
     <script>Application.demarrer(APPLICATION);</script>

   Le format complet de contenu.js est expliqué dans modules/modele/contenu.js
   et dans docs/CHARTE-APPLICATIONS.md.
   ========================================================================== */

const Application = (function () {
  "use strict";

  /* --- Petits outils ------------------------------------------------------ */
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  const $$ = (sel, racine) => Array.from((racine || document).querySelectorAll(sel));
  const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const echapper = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Espaces insécables de la typographie française : le « ? » ne passe jamais seul à la ligne.
  const insecables = s => String(s).replace(/ ([?!;:%»])/g, " $1").replace(/« /g, "« ");
  const nombreFr = (v, decimales) => Number(v).toLocaleString("fr-FR", { maximumFractionDigits: decimales === undefined ? 2 : decimales });

  const PICTO = {
    accueil: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 9.2 10 3.6l6.5 5.6V16a.8.8 0 0 1-.8.8h-3.4v-4.6H7.7v4.6H4.3a.8.8 0 0 1-.8-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    grille: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="5.6" height="5.6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="11.4" y="3" width="5.6" height="5.6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="11.4" width="5.6" height="5.6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="11.4" y="11.4" width="5.6" height="5.6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    lexique: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5.2C8.4 4.1 6.2 3.7 3.4 3.9v10.9c2.8-.2 5 .2 6.6 1.3 1.6-1.1 3.8-1.5 6.6-1.3V3.9c-2.8-.2-5 .2-6.6 1.3zM10 5.2v10.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    menu: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.6" y="3.6" width="14.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.6 3.8v12.4" stroke="currentColor" stroke-width="1.6"/></svg>',
    cadenas: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5.2a3 3 0 0 1 6 0V7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="3.2" y="7" width="9.6" height="7" rx="2" fill="currentColor"/></svg>',
    coche: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.6 8.4l2.9 2.9 5.9-6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    valide: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.8 8.2l2.1 2.1 4.3-4.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const ETAPES = { comprendre: "Comprendre", manipuler: "Manipuler", retenir: "Retenir", evaluer: "S’évaluer" };
  const CATEGORIES = { lire: "Lire", comprendre: "Comprendre", qcm: "QCM", calculer: "Calculer", exercice: "Exercice" };
  const TIRAGE = { lire: 2, comprendre: 2, qcm: 2, calculer: 3, exercice: 1 }; // 10 questions, comme dans la photométrie
  const COUT_INDICE = 0.5; // points retirés (sur 2) quand l'élève affiche l'indice

  /* --- État ------------------------------------------------------------------ */
  let A = null;              // la configuration (APPLICATION de contenu.js)
  let progression = {};      // ce que renvoie Suivi.lireProgression()
  let ongletCourant = "accueil";
  const labos = {};          // fonctions d'initialisation des labos, par numéro de module
  const labosLances = {};
  const auAffichage = {};    // fonctions à rappeler à chaque affichage d'un module
  const evaluations = {};    // état de l'évaluation de chaque module

  /* ==========================================================================
     PROGRESSION ET DÉBLOCAGE
     ========================================================================== */
  const noteMin = () => (A.noteMinimale || 12);
  const cleModule = n => A.id + "." + n;
  // Meilleure note du module n, sur 20 (ou null s'il n'a jamais été évalué).
  function meilleure(n) {
    const f = progression[cleModule(n)];
    return f ? (f.meilleurScore / f.total) * 20 : null;
  }
  function fiche(n) { return progression[cleModule(n)] || null; }
  function valide(n) { const b = meilleure(n); return b !== null && b >= noteMin(); }
  // Mode enseignant : ajouter « ?enseignant » à l'adresse ouvre tous les modules.
  const enseignant = /[?&]enseignant\b/.test(location.search);
  function ouvert(n) { return enseignant || A.deblocage === false || n === 1 || valide(n - 1); }
  function nbValides() { let k = 0; for (let n = 1; n <= A.modules.length; n++) if (valide(n)) k++; return k; }
  // Le module « en cours » : le premier ouvert et non validé.
  function moduleCourant() {
    for (let n = 1; n <= A.modules.length; n++) if (ouvert(n) && !valide(n)) return n;
    return null;
  }

  async function chargerProgression() {
    try { progression = await Suivi.lireProgression(); } catch (e) { console.warn("Progression illisible :", e); progression = {}; }
  }

  /* ==========================================================================
     COMPOSANTS RÉUTILISABLES (aussi proposés aux labos)
     ========================================================================== */
  function anneau(f, taille, epaisseur, ok) {
    return Applications.anneau(f, taille, epaisseur, ok);
  }

  // Petite notification en haut de l'écran.
  function toast(html, duree) {
    let pile = $("#toasts");
    if (!pile) { pile = document.createElement("div"); pile.id = "toasts"; pile.setAttribute("aria-live", "polite"); document.body.appendChild(pile); }
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = html; pile.appendChild(t);
    requestAnimationFrame(() => t.classList.add("in"));
    setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, duree || 4200);
  }

  // Fenêtre par-dessus la page (lexique). Échap ou clic à côté pour fermer.
  function feuille(html, auMontage) {
    const ov = document.createElement("div"); ov.className = "sheet-ov";
    ov.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><button class="sheet-x" aria-label="Fermer">×</button>' + html + "</div>";
    document.body.appendChild(ov);
    const fermer = () => { ov.classList.remove("in"); document.removeEventListener("keydown", clavier); setTimeout(() => ov.remove(), 300); };
    const clavier = e => { if (e.key === "Escape") fermer(); };
    ov.addEventListener("click", e => { if (e.target === ov || e.target.closest(".sheet-x, [data-fermer]")) fermer(); });
    document.addEventListener("keydown", clavier);
    requestAnimationFrame(() => ov.classList.add("in"));
    if (auMontage) auMontage($(".sheet", ov), fermer);
    return fermer;
  }

  // Une question dépliable (<details>) : la forme de toutes les notions.
  function question(q, corps, o) {
    o = o || {};
    return '<details class="qa' + (o.ic ? " has-ic" : "") + (o.cls ? " " + o.cls : "") + '"><summary>' +
      (o.ic ? '<span class="qa-ic" aria-hidden="true">' + o.ic + "</span>" : "") +
      '<span class="qa-q">' + insecables(q) + '</span><i class="qa-ch" aria-hidden="true"></i></summary><div class="qa-a">' + corps + "</div></details>";
  }

  // Affiche une valeur dans un élément ; si elle a changé, elle « rebondit ».
  function afficher(el, texte) {
    if (typeof el === "string") el = $(el);
    if (!el || el.textContent === String(texte)) return;
    el.textContent = texte;
    if (mouvementReduit()) return;
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
  }

  // Remplissage bleu des curseurs jusqu'au pouce (variable CSS --p).
  function remplirCurseur(el) {
    const min = el.min === "" ? 0 : +el.min, max = el.max === "" ? 100 : +el.max;
    const p = max > min ? Math.min(1, Math.max(0, (+el.value - min) / (max - min))) * 100 : 0;
    el.style.setProperty("--p", p.toFixed(1) + "%");
  }
  function remplirCurseurs(racine) { $$('input[type="range"]', racine).forEach(remplirCurseur); }

  /* Contrôle segmenté avec pastille glissante.
     Application.segment(conteneur, [["4:4:4", "4:4:4"], ...], "4:2:2", function (valeur) { … })
     Renvoie { valeur(), choisir(v) }. */
  function segment(conteneur, choix, initiale, rappel) {
    if (typeof conteneur === "string") conteneur = $(conteneur);
    conteneur.classList.add("seg", "glisse");
    conteneur.setAttribute("role", "group");
    conteneur.innerHTML = '<i class="seg-th" aria-hidden="true"></i>' + choix.map(c => '<button type="button" data-v="' + echapper(c[0]) + '">' + c[1] + "</button>").join("");
    const pastille = $(".seg-th", conteneur);
    let valeur = initiale;
    function placer() {
      const b = conteneur.querySelector('button[aria-pressed="true"]');
      if (!b || !b.offsetWidth) return;
      pastille.style.left = b.offsetLeft + "px"; pastille.style.top = b.offsetTop + "px";
      pastille.style.width = b.offsetWidth + "px"; pastille.style.height = b.offsetHeight + "px";
    }
    function choisir(v, silencieux) {
      valeur = v;
      $$("button", conteneur).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === String(v))));
      placer();
      if (!silencieux && rappel) rappel(v);
    }
    // Un même conteneur peut être reconstruit (barre des étapes) : les écouteurs
    // ne sont posés qu'une fois, et lisent toujours les choix les plus récents.
    conteneur._choisir = v => choisir(choix.find(c => String(c[0]) === v)[0]);
    if (!conteneur._placer) {
      conteneur.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) conteneur._choisir(b.dataset.v); });
      window.addEventListener("resize", () => conteneur._placer());
    }
    conteneur._placer = placer;
    choisir(initiale, true);
    return { valeur: () => valeur, choisir: v => choisir(v, false), placer: placer };
  }

  /* Apparition douce des blocs au défilement */
  let observateur = null;
  function apparitions(racine) {
    const blocs = $$(".pagehead, .etape-hd, .lesson-cols > div, .manip > *, .lab, .etape-retenir > .qa-list, .quizbox, .path > .tile, .home-grid > .card", racine);
    if (mouvementReduit() || !("IntersectionObserver" in window)) return;
    if (!observateur) observateur = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("rv-in"); observateur.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    blocs.forEach(el => {
      if (el.dataset.rv) return; el.dataset.rv = "1";
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // déjà visible : pas d'effet
      el.classList.add("rv"); observateur.observe(el);
    });
  }

  /* ==========================================================================
     CONSTRUCTION DE LA PAGE
     ========================================================================== */
  function infosCatalogue() {
    const c = (typeof CATALOGUE !== "undefined" ? CATALOGUE : []).find(x => x.id === A.id) || {};
    return {
      titre: A.titre || c.titre || "Application",
      accroche: A.accroche || c.accroche || "",
      icone: A.icone || c.icone || "plus",
      teinte: A.teinte || c.teinte,
      epreuve: A.epreuve || c.epreuve || "",
      option: A.option || (c.options ? c.options[0] : "image")
    };
  }

  function construireCoquille(info) {
    const optionNom = (typeof OPTIONS !== "undefined" && OPTIONS[info.option]) ? OPTIONS[info.option].nom : info.option.toUpperCase();
    document.body.classList.add("app-page");
    document.body.insertAdjacentHTML("afterbegin",
      '<aside class="side" id="side" aria-label="Navigation de l’application">' +
      '  <div class="side-hd"><button class="brand" data-go="accueil" data-tip="Accueil de l’application"><span class="bt">' + echapper(info.titre) + "</span></button></div>" +
      '  <div class="side-sc">' +
      '    <button class="si" data-go="accueil" id="navAccueil" data-tip="Accueil"><span class="si-ic">' + PICTO.accueil + '</span><span class="lb"><b>Accueil</b></span></button>' +
      '    <a class="si" href="' + RACINE + info.option + '.html" data-tip="Retour à l’option ' + optionNom + '"><span class="si-ic">' + PICTO.grille + '</span><span class="lb"><b>Option ' + optionNom + "</b><small>Toutes les applications</small></span></a>" +
      '    <div class="side-lb"><span>Parcours</span></div>' +
      '    <nav id="navModules" aria-label="Modules"></nav>' +
      '    <div class="side-lb"><span>Outils</span></div>' +
      '    <button class="si" id="navLexique" data-tip="Lexique : toutes les définitions"><span class="si-ic">' + PICTO.lexique + '</span><span class="lb"><b>Lexique</b></span></button>' +
      "  </div>" +
      '  <div class="side-ft"><button class="me-chip" id="meChip" data-go="accueil" data-tip="Ma progression"></button><button class="bouton-theme" id="themeApp" type="button"></button></div>' +
      "</aside>" +
      '<div class="scrim" id="scrim"></div>' +
      '<div class="ctx" id="ctx"><button class="ctx-btn" id="sideToggle" aria-label="Afficher ou réduire le menu" title="Afficher ou réduire le menu">' + PICTO.menu + '</button>' +
      '<div class="ctx-t" id="ctxTitre"></div><div class="ctx-tabs" id="ctxEtapes" hidden></div></div>' +
      '<main class="app-main" id="appMain"></main>' +
      '<footer class="app-pied">' + echapper(info.titre) + " · BTS Audiovisuel · D’après les cours de Pierre MALYCHA, Lycée Henri Martin, Saint-Quentin.</footer>");
    $(".side .brand").prepend(Applications.icone({ icone: info.icone, teinte: info.teinte }));

    // Menu des modules
    $("#navModules").innerHTML = A.modules.map((m, i) =>
      '<button class="si mod" data-go="m' + (i + 1) + '" data-tip="Module ' + (i + 1) + " : " + echapper(m.titre) + '"><span class="n">' + (i + 1) + '</span><span class="lb"><b>' + echapper(m.nav || m.titre) + "</b><small>" + echapper(m.resume || "") + "</small></span></button>").join("");

    // Thème
    const bt = $("#themeApp");
    const dessinerTheme = () => { const s = document.documentElement.getAttribute("data-theme") === "dark"; bt.innerHTML = s ? PICTOS.soleil : PICTOS.lune; bt.title = s ? "Passer en mode clair (conseillé au vidéoprojecteur)" : "Passer en mode sombre"; bt.setAttribute("aria-label", bt.title); };
    bt.addEventListener("click", () => { themeBasculer(); dessinerTheme(); });
    dessinerTheme();
  }

  /* --- Accueil de l'application --- */
  function construireAccueil(info) {
    const n = A.modules.length;
    const sec = document.createElement("section"); sec.className = "tab"; sec.id = "tab-accueil";
    sec.innerHTML =
      '<div class="home-hero"><div>' +
      '<span class="eyebrow">BTS Audiovisuel · ' + echapper(info.epreuve) + " · Application de révision</span>" +
      '<h1 class="display">' + echapper(info.titre) + '.<br><span class="grad">' + echapper(info.accroche) + "</span></h1>" +
      '<p class="lead">' + (A.intro || "") + "</p>" +
      '<div class="btnrow"><button class="btn primary big" id="btnDemarrer"></button><button class="btn big" id="btnLexique">' + PICTO.lexique + " Lexique</button></div>" +
      '<p class="credit">Application basée sur les cours de <b>Pierre MALYCHA</b>, du <b>BTS Audiovisuel</b> du <b>Lycée Henri Martin de Saint-Quentin</b>.</p>' +
      '</div><div class="hh-ic" id="hhIc"></div></div>' +
      '<div class="home-grid">' +
      '<div class="card"><h3>Votre progression</h3><div class="overall" id="overall"></div></div>' +
      '<div class="card"><h3>Comment travailler</h3><ol class="steps4">' +
      '<li><i style="background:linear-gradient(160deg,#5ac8fa,#007aff)">1</i><span><b>Comprendre</b> : ouvrez les questions sur les mots et les formules.</span></li>' +
      '<li><i style="background:linear-gradient(160deg,#ffb340,#ff6a3d)">2</i><span><b>Manipuler</b> : changez les réglages, observez la scène.</span></li>' +
      '<li><i style="background:linear-gradient(160deg,#ff5e8a,#af52de)">3</i><span><b>Retenir</b> : relisez l’essentiel juste avant l’évaluation.</span></li>' +
      '<li><i style="background:linear-gradient(160deg,#34c759,#00a37a)">4</i><span><b>S’évaluer</b> : ' + noteMin() + "/20 au moins pour ouvrir le module suivant.</span></li>" +
      "</ol></div></div>" +
      '<div class="sec-hd"><h2 class="sec-t">Votre parcours</h2><p class="muted">' + n + " module" + (n > 1 ? "s" : "") + (A.deblocage === false ? ", dans l’ordre que vous voulez." : " qui s’ouvrent l’un après l’autre. Vous pouvez revenir à tout moment sur un module déjà ouvert.") + "</p></div>" +
      '<div class="path" id="parcours"></div>';
    $("#appMain").appendChild(sec);
    const grande = Applications.icone({ icone: info.icone, teinte: info.teinte });
    if (info.teinte) grande.style.setProperty("--app-ombre", info.teinte[info.teinte.length - 1] + "88");
    $("#hhIc").appendChild(grande);
    $("#btnDemarrer").addEventListener("click", () => go("m" + (moduleCourant() || 1)));
    $("#btnLexique").addEventListener("click", lexique);
  }

  /* --- Un module : en-tête + 4 étapes + bas de page --- */
  function construireModule(m, n) {
    const sec = document.createElement("section"); sec.className = "tab"; sec.id = "tab-m" + n; sec.dataset.n = n;
    let html = '<div class="pagehead"><span class="kicker">Module ' + n + "</span><h2>" + m.titre + "</h2>" + (m.intro ? "<p>" + m.intro + "</p>" : "") + "</div>";

    // 1. Comprendre
    const N = m.notions;
    if (N) {
      const mots = N.mots || [], formules = N.formules || [];
      html += '<div class="etape etape-comprendre" data-etape="comprendre">' +
        '<div class="etape-hd"><div><span class="eyebrow">Les notions à connaître · module ' + n + "</span><h3>" + (N.titre || "Les notions") + "</h3>" + (N.intro ? '<p class="lead3">' + N.intro + "</p>" : "") + '<p class="qa-tip">Cliquez sur une question pour afficher sa réponse.</p></div><button class="btn small" data-tout-ouvrir>Tout ouvrir</button></div>' +
        '<div class="lesson-cols">' +
        (mots.length ? '<div><h4 class="qa-h">Les mots à connaître<small>' + mots.length + " question" + (mots.length > 1 ? "s" : "") + '</small></h4><div class="qa-list">' + mots.map(carteMot).join("") + "</div></div>" : "") +
        (formules.length ? '<div><h4 class="qa-h">Les formules<small>' + formules.length + " question" + (formules.length > 1 ? "s" : "") + '</small></h4><div class="qa-list">' + formules.map(carteFormule).join("") + '</div><p class="qa-note">Une formule est une phrase écrite en raccourci : on la lit à voix haute, de gauche à droite. Chaque lettre a un nom, une unité et un rôle.</p></div>' : "") +
        "</div></div>";
    }

    // 2. Manipuler : le labo vient d'un <template data-labo="n"> de la page
    const modele = document.querySelector('template[data-labo="' + n + '"]');
    if (modele) {
      const t = m.manipuler || {};
      html += '<div class="etape etape-manipuler" data-etape="manipuler">' +
        '<div class="etape-hd"><div><span class="eyebrow">Manipuler · module ' + n + "</span><h3>" + (t.titre || "Le labo") + "</h3>" + (t.intro ? '<p class="lead3">' + t.intro + "</p>" : "") + "</div></div>" +
        '<div class="manip" id="labo-' + n + '"></div></div>';
    }

    // 3. Retenir
    const E = m.essentiel;
    if (E) {
      let q = "";
      if (E.definitions && E.definitions.length) q += question("Quelles définitions faut-il connaître ?", "<ul>" + E.definitions.map(x => "<li>" + x + "</li>").join("") + "</ul>", { ic: "📖", cls: "rcq" });
      if (E.formules && E.formules.length) q += question("Quelles formules faut-il savoir utiliser ?", '<div class="rc-fx">' + E.formules.map(x => '<div><span class="eq">' + x[0] + "</span>" + (x[1] ? "<small>" + x[1] + "</small>" : "") + "</div>").join("") + "</div>", { ic: "<i>ƒ</i>", cls: "rcq" });
      if (E.reperes && E.reperes.length) q += question("Quels repères faut-il avoir en tête ?", "<ul>" + E.reperes.map(x => "<li>" + x + "</li>").join("") + "</ul>", { ic: "📏", cls: "rcq" });
      if (E.pieges && E.pieges.length) q += question("Quels pièges faut-il éviter ?", '<ul class="traps">' + E.pieges.map(x => "<li>" + x + "</li>").join("") + "</ul>", { ic: "⚠️", cls: "rcq" });
      html += '<div class="etape etape-retenir" data-etape="retenir">' +
        '<div class="etape-hd"><div><span class="eyebrow">Avant l’évaluation</span><h3>L’essentiel à retenir · module ' + n + '</h3><p class="lead3">L’évaluation porte sur ces définitions, ces formules et ces ordres de grandeur. Les valeurs changent à chaque tentative ; la calculatrice est autorisée.</p></div><button class="btn small" data-tout-ouvrir>Tout ouvrir</button></div>' +
        '<div class="qa-list">' + q + "</div></div>";
    }

    // 4. S'évaluer
    if (m.evaluation) html += '<div class="etape etape-evaluer quizbox" data-etape="evaluer" id="quiz-' + n + '"></div>';

    html += '<nav class="pager" aria-label="Modules précédent et suivant"></nav>';
    sec.innerHTML = html;
    $("#appMain").appendChild(sec);

    if (modele) $("#labo-" + n).appendChild(modele.content.cloneNode(true));
  }

  function carteMot(d) {
    const titre = d.q || (d.t + (d.u ? " (" + d.u + ")" : "") + " : de quoi s’agit-il ?");
    const sous = (d.s ? "symbole " + d.s : "") + (d.s && d.u ? " · " : "") + (d.u ? "unité : " + d.u : "");
    return question(titre,
      '<div class="def-tt"><b>' + d.t + "</b>" + (sous ? "<small>" + sous + "</small>" : "") + "</div><p>" + d.d + "</p>" +
      (d.c ? '<p class="cmp"><span>Comparaison</span>' + d.c + "</p>" : "") +
      (d.r ? '<p class="rep"><span>Repères</span>' + d.r + "</p>" : ""),
      { ic: d.ic || "•", cls: "def" });
  }

  function carteFormule(f) {
    return question(f.q || f.f,
      '<div class="fx-f">' + f.f + "</div>" + (f.say ? '<div class="fx-say">Se lit : « ' + f.say + " »</div>" : "") +
      (f.rows ? '<table class="fx-t">' + f.rows.map(r => '<tr><td class="sym">' + r[0] + '</td><td class="nm">' + r[1] + '</td><td class="u">' + (r[2] || "—") + '</td><td class="role">' + (r[3] || "") + "</td></tr>").join("") + "</table>" : "") +
      (f.ex ? '<div class="fx-ex"><span>Exemple</span>' + f.ex + "</div>" : ""),
      { ic: "<i>ƒ</i>", cls: "fx" });
  }

  /* ==========================================================================
     NAVIGATION
     ========================================================================== */
  function go(cible, sansDefilement) {
    if (!$("#tab-" + cible)) cible = "accueil";
    const n = cible.startsWith("m") ? +cible.slice(1) : 0;
    if (n && !ouvert(n)) {
      toast(PICTO.cadenas + " Le <b>module " + n + "</b> s’ouvrira quand vous aurez obtenu au moins <b>" + noteMin() + "/20</b> à l’évaluation du module " + (n - 1) + ".");
      return;
    }
    const change = cible !== ongletCourant;
    $$(".tab").forEach(s => {
      const actif = s.id === "tab-" + cible;
      s.classList.toggle("active", actif);
      if (actif && change && !mouvementReduit()) { s.classList.remove("enter"); void s.offsetWidth; s.classList.add("enter"); }
    });
    ongletCourant = cible;
    tiroir(false);
    if (!sansDefilement) window.scrollTo(0, 0);
    try { history.replaceState(null, "", "#" + cible); } catch (e) { /* page ouverte en local : sans importance */ }

    if (n) {
      // Le labo est lancé au premier affichage du module (les tailles sont alors connues).
      if (labos[n] && !labosLances[n]) {
        labosLances[n] = true;
        try { labos[n]($("#labo-" + n), { n: n, module: A.modules[n - 1] }); } catch (e) { console.error("Labo du module " + n + " :", e); }
      }
      (auAffichage[n] || []).forEach(f => { try { f(); } catch (e) { console.error(e); } });
      if (!evaluations[n] && A.modules[n - 1].evaluation) { evaluations[n] = { phase: "intro" }; dessinerEvaluation(n); }
    }
    const sec = $("#tab-" + cible);
    remplirCurseurs(sec);
    $$(".seg.glisse", sec).forEach(s => s._placer && s._placer());
    rafraichir();
    apparitions(sec);
  }

  // Menu latéral : développé, réduit (pastilles) ou en tiroir (petit écran).
  const CLE_MENU = "revision-bts-menu";
  function etroit() { return window.innerWidth < 900; }
  function modeMenu() {
    let pref = null; try { pref = localStorage.getItem(CLE_MENU); } catch (e) { /* rien */ }
    const r = document.documentElement.classList, nar = etroit();
    const plein = pref ? pref === "full" : window.innerWidth >= 1280;
    r.toggle("side-drawer", nar); r.toggle("side-full", plein && !nar); r.toggle("side-rail", !plein && !nar);
    if (!nar) r.remove("side-open");
    $$(".seg.glisse").forEach(s => s._placer && s._placer());
  }
  function tiroir(on) { document.documentElement.classList.toggle("side-open", !!on && etroit()); }
  function basculerMenu() {
    if (etroit()) { tiroir(!document.documentElement.classList.contains("side-open")); return; }
    const pref = document.documentElement.classList.contains("side-full") ? "rail" : "full";
    try { localStorage.setItem(CLE_MENU, pref); } catch (e) { /* rien */ }
    modeMenu();
  }

  // Infobulles du menu réduit
  function infobulles() {
    const tip = document.createElement("div"); tip.className = "side-tip"; tip.hidden = true; document.body.appendChild(tip);
    const side = $("#side"), cacher = () => { tip.hidden = true; };
    side.addEventListener("mouseover", e => {
      const b = e.target.closest("[data-tip]");
      if (!b || !document.documentElement.classList.contains("side-rail")) { cacher(); return; }
      const r = b.getBoundingClientRect(); tip.textContent = b.dataset.tip; tip.hidden = false;
      tip.style.top = Math.round(r.top + r.height / 2) + "px"; tip.style.left = Math.round(r.right + 12) + "px";
    });
    side.addEventListener("mouseleave", cacher); side.addEventListener("click", cacher);
    $$("#side [data-tip]").forEach(b => { if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", b.dataset.tip); });
  }

  // Les étapes de la page en cours, pour la barre de contexte.
  function etapesCourantes() {
    const sec = $(".tab.active");
    if (!sec || sec.id === "tab-accueil") return [];
    return $$(":scope > .etape", sec).map(el => [el.dataset.etape, el]);
  }

  let etapeActive = "";
  function suivreDefilement() {
    const y = window.scrollY, ctx = $("#ctx");
    ctx.classList.toggle("scrolled", y > 6); ctx.classList.toggle("past", y > 150);
    const etapes = etapesCourantes(); if (!etapes.length) return;
    const ligne = $("#ctx").offsetHeight + Math.min(220, window.innerHeight * 0.3);
    let cur = etapes[0][0];
    etapes.forEach(e => { if (e[1].getBoundingClientRect().top <= ligne) cur = e[0]; });
    if (y >= document.documentElement.scrollHeight - window.innerHeight - 2 && y > 60) cur = etapes[etapes.length - 1][0];
    if (cur !== etapeActive) { etapeActive = cur; $$("#ctxEtapes button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === cur))); const s = $("#ctxEtapes"); if (s._placer) s._placer(); }
  }

  /* ==========================================================================
     RAFRAÎCHISSEMENT (menu, accueil, bas de page) selon la progression
     ========================================================================== */
  function rafraichir() {
    const total = A.modules.length, courant = moduleCourant();
    const n = ongletCourant.startsWith("m") ? +ongletCourant.slice(1) : 0;

    // Menu des modules
    $$("#navModules .si").forEach((b, i) => {
      const k = i + 1, v = valide(k), o = ouvert(k);
      b.classList.toggle("active", k === n);
      b.classList.toggle("passed", v);
      b.classList.toggle("locked", !o);
      b.classList.toggle("current", k === courant);
      $(".n", b).innerHTML = v ? PICTO.coche : !o ? PICTO.cadenas : String(k);
      const best = meilleure(k);
      $(".lb small", b).textContent = v ? "Validé · " + Applications.note(best) + "/20" : !o ? "Verrouillé" : best !== null ? "Meilleure note " + Applications.note(best) + "/20" : (A.modules[i].resume || "");
    });
    $("#navAccueil").classList.toggle("active", ongletCourant === "accueil");

    // Pastille de progression en bas du menu
    const nv = nbValides();
    $("#meChip").innerHTML = anneau(total ? nv / total : 0, 30, 4, nv === total) + '<span class="lb"><b>' + nv + " / " + total + " validé" + (nv > 1 ? "s" : "") + "</b><small>" + (Suivi.utilisateur() ? "Enregistré dans votre compte" : "Enregistré sur cet appareil") + "</small></span>";

    // Barre de contexte : titre + étapes
    const titre = $("#ctxTitre");
    titre.innerHTML = n ? "<span>Module " + n + "</span><b>" + echapper(stripHtml(A.modules[n - 1].titre)) + "</b>" : "<b>" + echapper(infosCatalogue().titre) + "</b>";
    const etapes = etapesCourantes(), cle = ongletCourant + "|" + etapes.map(e => e[0]).join(",");
    const barre = $("#ctxEtapes");
    barre.hidden = !etapes.length;
    if (barre.dataset.k !== cle) {
      barre.dataset.k = cle; etapeActive = "";
      if (etapes.length) segment(barre, etapes.map(e => [e[0], ETAPES[e[0]]]), etapes[0][0], allerEtape);
    }
    const bq = $('#ctxEtapes [data-v="evaluer"]');
    if (bq) bq.classList.toggle("ok", n > 0 && valide(n));
    suivreDefilement();

    // Accueil : bouton, progression, parcours
    if ($("#btnDemarrer")) {
      $("#btnDemarrer").textContent = courant === null ? "Revoir le parcours" : (courant === 1 && meilleure(1) === null ? "Commencer le module 1" : "Reprendre : module " + courant);
      const notes = A.modules.map((_, i) => meilleure(i + 1)).filter(x => x !== null);
      const essais = A.modules.reduce((s, _, i) => s + ((fiche(i + 1) || {}).tentatives || 0), 0);
      $("#overall").innerHTML = '<div class="ov-ring">' + anneau(total ? nv / total : 0, 120, 10, nv === total) + "<div><b>" + nv + "</b><span>sur " + total + "</span></div></div>" +
        '<div class="ov-stats"><div><small>Modules validés</small><b>' + nv + " / " + total + "</b></div>" +
        "<div><small>Moyenne des évaluations</small><b>" + (notes.length ? Applications.note(notes.reduce((a, b) => a + b, 0) / notes.length) + "/20" : "—") + "</b></div>" +
        "<div><small>Évaluations passées</small><b>" + essais + "</b></div>" +
        "<div><small>Note pour valider</small><b>" + noteMin() + "/20</b></div></div>";
      $("#parcours").innerHTML = A.modules.map((m, i) => {
        const k = i + 1, v = valide(k), o = ouvert(k), best = meilleure(k);
        const etat = v ? PICTO.valide + " Validé · " + Applications.note(best) + "/20" : !o ? PICTO.cadenas + " Verrouillé" : best !== null ? "Meilleure note " + Applications.note(best) + "/20" : k === courant ? "À faire maintenant" : "Ouvert";
        return '<button class="tile' + (v ? " passed" : "") + (!o ? " locked" : "") + (k === courant ? " current" : "") + '" data-go="m' + k + '"><span class="tl-ring">' + anneau(best !== null ? best / 20 : 0, 58, 6, v) + "<span>" + k + '</span></span><span class="tl-txt"><b>' + m.titre + "</b><small>" + (m.resume || "") + "</small><em>" + etat + "</em></span></button>";
      }).join("");
    }

    // Bas de page du module affiché
    if (n) {
      const pager = $("#tab-m" + n + " > .pager"), prev = A.modules[n - 2], next = A.modules[n];
      const verrou = !!next && !ouvert(n + 1);
      pager.innerHTML = (prev ? '<button class="pg" data-go="m' + (n - 1) + '"><small>← Module ' + (n - 1) + "</small><b>" + prev.titre + "</b></button>" : "<span></span>") +
        (next ? '<button class="pg next' + (verrou ? " locked" : "") + '" data-go="m' + (n + 1) + '"><small>Module ' + (n + 1) + " →</small><b>" + next.titre + "</b>" + (verrou ? "<em>" + PICTO.cadenas + " Obtenez au moins " + noteMin() + "/20 à l’évaluation pour l’ouvrir</em>" : "") + "</button>"
          : '<button class="pg next" data-go="accueil"><small>Fin du parcours</small><b>Retour à l’accueil</b></button>');
    }
  }

  function allerEtape(cle) {
    const e = etapesCourantes().find(x => x[0] === cle); if (!e) return;
    const y = cle === "comprendre" ? 0 : e[1].getBoundingClientRect().top + window.scrollY - $("#ctx").offsetHeight - 16;
    window.scrollTo({ top: Math.max(0, y), behavior: mouvementReduit() ? "auto" : "smooth" });
  }

  function stripHtml(s) { return String(s).replace(/<[^>]+>/g, ""); }

  /* ==========================================================================
     LEXIQUE : toutes les définitions, avec recherche
     ========================================================================== */
  function lexique() {
    const tous = [];
    A.modules.forEach((m, i) => ((m.notions && m.notions.mots) || []).forEach(d => tous.push(Object.assign({ n: i + 1 }, d))));
    tous.sort((a, b) => stripHtml(a.t).localeCompare(stripHtml(b.t), "fr"));
    const ligne = d => question("<b>" + d.t + "</b>" + (d.u ? ' <span class="pill">' + d.u + "</span>" : ""),
      "<p>" + d.d + "</p>" + (d.c ? '<p class="cmp"><span>Comparaison</span>' + d.c + "</p>" : "") + '<button class="linkbtn" data-go="m' + d.n + '" data-fermer>Voir dans le module ' + d.n + " →</button>", { cls: "gl-i" });
    feuille('<h3>Lexique</h3><p class="muted">Toutes les notions de l’application, de A à Z. Tapez un mot pour filtrer, cliquez sur une notion pour lire sa définition.</p><input type="search" id="glQ" placeholder="Rechercher une notion…" autocomplete="off" aria-label="Rechercher une notion"><div class="qa-list gl-list" id="glListe">' + tous.map(ligne).join("") + "</div>", el => {
      const champ = $("#glQ", el), liste = $("#glListe", el);
      const sansAccent = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      champ.addEventListener("input", () => {
        const v = sansAccent(champ.value.trim()), lignes = Array.from(liste.children);
        lignes.forEach(c => { c.hidden = !!v && !sansAccent(c.textContent).includes(v); });
        const visibles = lignes.filter(c => !c.hidden);
        lignes.forEach(c => { c.open = !!v && visibles.length <= 3 && !c.hidden; }); // peu de résultats : on les ouvre
      });
      setTimeout(() => champ.focus(), 50);
    });
  }

  /* ==========================================================================
     ÉVALUATION
     ========================================================================== */
  // Tirage au sort
  const hasardEntier = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function melanger(t) { const c = t.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; }
  function quelques(t, k) { return melanger(t || []).slice(0, k); }

  /* Toutes les formes de question acceptées dans contenu.js sont ramenées
     à un seul format interne : { cat, type: "num" | "qcm" | "vf" | "ex", … } */
  function normaliser(brut, cat) {
    let q = typeof brut === "function" ? brut() : brut;
    if (Array.isArray(q)) {
      // Raccourcis : ["affirmation", vrai, "explication", "indice"]  (comprendre)
      //              ["question", "bonne", ["mauvaises"], "explication", "indice"]  (qcm)
      q = cat === "comprendre" || typeof q[1] === "boolean"
        ? { type: "vf", affirmation: q[0], vrai: q[1], explication: q[2], indice: q[3] }
        : { type: "qcm", question: q[0], bonne: q[1], mauvaises: q[2], explication: q[3], indice: q[4] };
    }
    const o = { cat: cat, expl: q.explication || q.solution || "", hint: q.indice || "", fig: q.figure || "", ctx: q.contexte || "", indiceVu: false };
    if (q.type === "vf") {
      return Object.assign(o, { type: "vf", q: "Vrai ou faux ? " + q.affirmation, choices: ["Vrai", "Faux"], correct: q.vrai ? 0 : 1, val: null });
    }
    if (q.type === "nombre") {
      return Object.assign(o, { type: "num", q: q.question, ans: q.reponse, unit: q.unite || "", tol: q.tolerance === undefined ? 0.03 : q.tolerance, atol: q.ecart, val: null });
    }
    if (q.type === "exercice") {
      return Object.assign(o, {
        type: "ex", q: q.question, val: null,
        subs: q.etapes.map(e => e.reponse !== undefined
          ? { type: "num", q: e.question, ans: e.reponse, unit: e.unite || "", tol: e.tolerance === undefined ? 0.03 : e.tolerance, atol: e.ecart }
          : melangerChoix({ type: "qcm", q: e.question, choices: [e.bonne].concat(e.mauvaises), correct: 0 })),
        ansv: q.etapes.map(() => null)
      });
    }
    // qcm (par défaut)
    return Object.assign(o, melangerChoix({ type: "qcm", q: q.question, choices: [q.bonne].concat(q.mauvaises || []), correct: 0, val: null }));
  }
  function melangerChoix(q) {
    const ordre = melanger(q.choices.map((_, i) => i));
    q.choices = ordre.map(i => q.choices[i]); q.correct = ordre.indexOf(q.correct);
    return q;
  }

  function tirer(n) {
    const banque = A.modules[n - 1].evaluation, quotas = Object.assign({}, TIRAGE, banque.tirage || {});
    let liste = [];
    Object.keys(CATEGORIES).forEach(cat => quelques(banque[cat], quotas[cat]).forEach(b => liste.push([b, cat])));
    // Banque trop petite dans une famille : on complète avec les autres questions disponibles.
    const voulu = Object.keys(CATEGORIES).reduce((s, c) => s + (quotas[c] || 0), 0);
    if (liste.length < voulu) {
      const reste = [];
      Object.keys(CATEGORIES).forEach(cat => (banque[cat] || []).forEach(b => { if (!liste.some(x => x[0] === b)) reste.push([b, cat]); }));
      liste = liste.concat(quelques(reste, voulu - liste.length));
    }
    const ordre = Object.keys(CATEGORIES);
    liste.sort((a, b) => ordre.indexOf(a[1]) - ordre.indexOf(b[1]));
    return liste.map(x => normaliser(x[0], x[1]));
  }

  function lireNombre(v) { if (v === null || v === undefined) return NaN; return parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); }
  function nombreJuste(o, v) {
    const x = lireNombre(v); if (!isFinite(x)) return false;
    if (o.atol !== undefined) return Math.abs(x - o.ans) <= o.atol + 1e-9;
    if (Math.abs(o.ans) < 1e-9) return Math.abs(x) < 0.01;
    return Math.abs(x / o.ans - 1) <= o.tol + 1e-9;
  }
  const attendu = o => o.type === "num" ? nombreFr(o.ans, 3) + (o.unit ? " " + o.unit : "") : o.choices[o.correct];
  const donne = (o, v) => (v === null || v === undefined || v === "") ? "" : o.type === "num" ? String(v) + (o.unit ? " " + o.unit : "") : o.choices[v];
  function repondu(q) { return q.type === "ex" ? q.ansv.every(v => v !== null && v !== "") : q.val !== null && q.val !== ""; }

  function noter(q) {
    let r;
    if (q.type === "ex") {
      let pts = 0; const g = [], e = [];
      q.subs.forEach((s, i) => {
        const v = q.ansv[i], ok = s.type === "num" ? nombreJuste(s, v) : v === s.correct;
        if (ok) pts += 2 / q.subs.length;
        g.push(String.fromCharCode(97 + i) + ") " + (donne(s, v) || "—")); e.push(String.fromCharCode(97 + i) + ") " + attendu(s));
      });
      r = { pts: pts, max: 2, given: g.join(" ; "), expected: e.join(" ; ") };
    } else {
      const ok = q.type === "num" ? nombreJuste(q, q.val) : q.val === q.correct;
      r = { pts: ok ? 2 : 0, max: 2, given: donne(q, q.val), expected: attendu(q) };
    }
    if (q.indiceVu) { r.indice = true; r.pts = Math.max(0, r.pts - COUT_INDICE); }
    return r;
  }

  function dessinerEvaluation(n) {
    const s = evaluations[n], el = $("#quiz-" + n); if (!el) return;
    const best = meilleure(n), f = fiche(n), dernier = n === A.modules.length, v = valide(n);
    const essais = f ? f.tentatives : 0;

    if (s.phase === "intro") {
      el.innerHTML = '<div class="qz"><div class="qz-hd"><div><span class="eyebrow">Évaluation · Module ' + n + "</span><h2>Contrôle des connaissances</h2>" +
        '<p class="lead3">10 questions, 2 points chacune : <span class="qcat qc-lire">Lire</span> <span class="qcat qc-comprendre">Comprendre</span> <span class="qcat qc-qcm">QCM</span> <span class="qcat qc-calculer">Calculer</span> <span class="qcat qc-exercice">Exercice</span>. Obtenez au moins <b>' + noteMin() + "/20</b> pour " + (dernier ? "valider le parcours" : "débloquer le <b>module " + (n + 1) + "</b>") + ". Les valeurs changent à chaque tentative ; la calculatrice est autorisée. À chaque question, un <b>indice</b> peut vous aider (il coûte " + nombreFr(COUT_INDICE) + " point).</p></div>" +
        '<div class="qz-best">' + anneau(best !== null ? best / 20 : 0, 108, 9, v) + "<div><b>" + (best !== null ? Applications.note(best) : "—") + "</b><span>meilleure note</span></div></div></div>" +
        '<div class="qz-meta"><span>' + (v ? PICTO.valide + " Module validé" : essais ? "Pas encore validé" : "Pas encore tenté") + "</span><span>Tentatives : " + essais + "</span>" + (f ? "<span>Dernière note : " + Applications.note((f.dernierScore / f.total) * 20) + "/20</span>" : "") + "</div>" +
        '<div class="btnrow"><button class="btn primary big" data-q="start">' + (essais ? "Nouvelle tentative" : "Commencer l’évaluation") + '</button><button class="btn big" data-q="essentiel">Revoir l’essentiel ↑</button>' + (!dernier && ouvert(n + 1) ? '<button class="btn big" data-go="m' + (n + 1) + '">Module ' + (n + 1) + " →</button>" : "") + "</div></div>";
    } else if (s.phase === "q") {
      const q = s.qs[s.i], total = s.qs.length;
      let rep;
      if (q.type === "num") rep = '<div class="qz-num"><input type="text" inputmode="decimal" autocomplete="off" data-in="v" value="' + (q.val !== null ? echapper(q.val) : "") + '" placeholder="Votre réponse" aria-label="Votre réponse"><span>' + q.unit + "</span></div>";
      else if (q.type === "qcm" || q.type === "vf") rep = '<div class="qz-ch' + (q.type === "vf" ? " vf" : "") + '">' + q.choices.map((c, i) => '<button type="button" class="' + (q.val === i ? "on" : "") + '" data-ch="' + i + '" aria-pressed="' + (q.val === i) + '"><i></i><span>' + c + "</span></button>").join("") + "</div>";
      else rep = q.subs.map((sb, k) => '<div class="qz-sub"><div class="qz-subq">' + String.fromCharCode(97 + k) + ") " + sb.q + "</div>" + (sb.type === "num"
        ? '<div class="qz-num"><input type="text" inputmode="decimal" autocomplete="off" data-sub="' + k + '" value="' + (q.ansv[k] !== null ? echapper(q.ansv[k]) : "") + '" placeholder="Réponse" aria-label="Réponse ' + String.fromCharCode(97 + k) + '"><span>' + sb.unit + "</span></div>"
        : '<div class="qz-ch">' + sb.choices.map((c, i) => '<button type="button" class="' + (q.ansv[k] === i ? "on" : "") + '" data-sch="' + k + ":" + i + '"><i></i><span>' + c + "</span></button>").join("") + "</div>") + "</div>").join("");
      const indice = q.hint ? (q.indiceVu ? '<div class="qz-hint on"><b>Indice</b>' + q.hint + "</div>" : '<div class="qz-hint"><button class="btn small" data-q="indice">Voir un indice <span>−' + nombreFr(COUT_INDICE) + " pt</span></button></div>") : "";
      el.innerHTML = '<div class="qz"><div class="qz-top"><span class="qcat qc-' + q.cat + '">' + CATEGORIES[q.cat] + '</span><span class="qz-count">Question ' + (s.i + 1) + " / " + total + '</span><span class="qz-pts">' + (q.indiceVu ? "<s>2</s> " + nombreFr(2 - COUT_INDICE) + " points (indice)" : "2 points") + '</span></div><div class="qz-bar"><i style="width:' + (s.i / total * 100) + '%"></i></div>' +
        '<div class="qz-body' + (s.dir < 0 ? " from-left" : "") + '">' + (q.ctx ? '<span class="qctx">' + q.ctx + "</span>" : "") + '<div class="qz-q">' + q.q + "</div>" + (q.fig ? '<div class="qz-fig">' + q.fig + "</div>" : "") + rep + indice + "</div>" +
        '<div class="qz-nav"><button class="btn" data-q="prec"' + (s.i ? "" : " disabled") + '>← Précédente</button><span class="qz-dots" aria-hidden="true">' + s.qs.map((x, k) => '<i class="' + (k === s.i ? "cur " : "") + (repondu(x) ? "ok" : "") + '"></i>').join("") + '</span><button class="btn primary" data-q="suiv">' + (s.i === total - 1 ? "Terminer et corriger" : "Suivante →") + "</button></div></div>";
      requestAnimationFrame(() => { const b = $(".qz-bar i", el); if (b) b.style.width = ((s.i + 1) / total * 100) + "%"; });
      const champ = $("input", el); if (champ && s.focus) champ.focus({ preventScroll: true });
    } else if (s.phase === "res") {
      const r = s.res, passe = r.note >= noteMin();
      el.innerHTML = '<div class="qz"><div class="res-hd"><div class="res-ring">' + anneau(0, 168, 12, passe) + '<div class="res-n"><b data-compte="' + r.note + '">0</b><span>/ 20</span></div></div><div>' +
        '<span class="eyebrow">Module ' + n + " · tentative " + (f ? f.tentatives : 1) + "</span><h2>" + (passe ? (dernier ? "Parcours terminé, bravo !" : "Module validé !") : "Pas encore validé") + "</h2>" +
        '<p class="lead3">' + (passe ? (s.debloque && !dernier ? "Le <b>module " + (n + 1) + "</b> est maintenant débloqué." : "Votre note est enregistrée.") : "Il faut au moins <b>" + noteMin() + "/20</b>. Relisez la correction ci-dessous, revoyez le module puis retentez : les questions changent.") + "</p>" +
        '<div class="btnrow">' + (passe && !dernier ? '<button class="btn primary big" data-go="m' + (n + 1) + '">Module ' + (n + 1) + " →</button>" : "") + '<button class="btn big' + (passe ? "" : " primary") + '" data-q="start">Nouvelle tentative</button><button class="btn big" data-q="essentiel">Revoir l’essentiel ↑</button></div>' +
        '<p class="qz-save" aria-live="polite">' + (s.lieu || "Enregistrement…") + "</p></div></div>" +
        '<h3 class="corr-t">Correction détaillée</h3><div class="corr">' + s.qs.map((q, k) => {
          const g = r.details[k], cls = g.pts >= g.max - 1e-9 ? "ok" : g.pts > 0 ? "part" : "ko";
          return '<div class="corr-i ' + cls + '"><div class="corr-h"><span class="qcat qc-' + q.cat + '">' + CATEGORIES[q.cat] + '</span><span class="corr-q">' + (k + 1) + ". " + stripHtml(q.q) + "</span><em>" + nombreFr(g.pts) + " / " + g.max + (g.indice ? " (indice)" : "") + "</em></div>" +
            '<div class="corr-a"><span>Votre réponse : <b>' + (g.given ? echapper(g.given) : "—") + "</b></span><span>Attendu : <b>" + g.expected + "</b></span></div>" + (q.expl ? '<div class="corr-x">' + q.expl + "</div>" : "") + "</div>";
        }).join("") + "</div>";
      // L'anneau se remplit et la note défile jusqu'à sa valeur.
      requestAnimationFrame(() => {
        const fg = $(".res-ring .pr-fg", el), c = 2 * Math.PI * ((168 - 12) / 2);
        if (fg) fg.style.strokeDashoffset = (c * (1 - r.note / 20)).toFixed(2);
        const b = $("[data-compte]", el), cible = r.note, t0 = performance.now();
        if (mouvementReduit()) { b.textContent = Applications.note(cible); return; }
        (function pas(t) { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); b.textContent = Applications.note(cible * e); if (k < 1) requestAnimationFrame(pas); })(t0);
      });
    }
  }

  async function terminer(n) {
    const s = evaluations[n];
    const details = s.qs.map(noter);
    const pts = details.reduce((a, d) => a + d.pts, 0), max = details.reduce((a, d) => a + d.max, 0);
    const note = Math.round((pts / max) * 20 * 2) / 2; // arrondi au demi-point
    const avant = ouvert(n + 1);
    s.phase = "res"; s.res = { note: note, details: details }; s.lieu = "";
    dessinerEvaluation(n);
    const el = $("#quiz-" + n); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - $("#ctx").offsetHeight - 16, behavior: "auto" });
    try {
      const lieu = await Suivi.enregistrerResultat(cleModule(n), note, 20);
      s.lieu = lieu === "compte" ? "Note enregistrée dans votre compte." : Suivi.firebaseActif ? "Note enregistrée sur cet appareil seulement. Connectez-vous à la plateforme pour la retrouver partout." : "Note enregistrée sur cet appareil.";
    } catch (e) {
      s.lieu = "Note non enregistrée. " + Suivi.messageErreur(e);
    }
    await chargerProgression();
    s.debloque = !avant && ouvert(n + 1) && n < A.modules.length;
    const save = $(".qz-save", el); if (save) save.textContent = s.lieu;
    if (s.debloque) {
      const b = $('#navModules [data-go="m' + (n + 1) + '"]');
      if (b) { b.classList.remove("deblocage"); void b.offsetWidth; b.classList.add("deblocage"); }
      toast(PICTO.valide + " <b>Module " + (n + 1) + " débloqué !</b> " + echapper(stripHtml(A.modules[n].titre)));
      const p = $(".lead3", el); if (p) p.innerHTML = "Le <b>module " + (n + 1) + "</b> est maintenant débloqué.";
    }
    rafraichir();
  }

  // Un seul gestionnaire pour tous les clics de l'évaluation.
  function brancherEvaluation() {
    document.addEventListener("click", e => {
      const box = e.target.closest(".quizbox"); if (!box) return;
      const n = +box.id.slice(5), s = evaluations[n]; if (!s) return;
      const a = e.target.closest("[data-q]"), ch = e.target.closest("[data-ch]"), sch = e.target.closest("[data-sch]");
      if (ch && s.phase === "q") { s.qs[s.i].val = +ch.dataset.ch; s.dir = 0; s.focus = false; dessinerEvaluation(n); return; }
      if (sch && s.phase === "q") { const p = sch.dataset.sch.split(":"); s.qs[s.i].ansv[+p[0]] = +p[1]; s.focus = false; dessinerEvaluation(n); return; }
      if (!a) return;
      const act = a.dataset.q;
      if (act === "start") { s.phase = "q"; s.qs = tirer(n); s.i = 0; s.dir = 1; s.focus = true; dessinerEvaluation(n); box.scrollIntoView({ block: "start" }); window.scrollBy(0, -$("#ctx").offsetHeight - 16); }
      else if (act === "essentiel") allerEtape("retenir");
      else if (act === "indice") { s.qs[s.i].indiceVu = true; s.focus = false; dessinerEvaluation(n); }
      else if (act === "prec" && s.i > 0) { s.i--; s.dir = -1; s.focus = true; dessinerEvaluation(n); }
      else if (act === "suiv") {
        if (s.i < s.qs.length - 1) { s.i++; s.dir = 1; s.focus = true; dessinerEvaluation(n); }
        else {
          const vides = s.qs.filter(q => !repondu(q)).length;
          if (vides && !confirm(vides + " question" + (vides > 1 ? "s restent" : " reste") + " sans réponse. Terminer quand même ?")) return;
          terminer(n);
        }
      }
    });
    // Saisie des réponses numériques
    document.addEventListener("input", e => {
      const box = e.target.closest(".quizbox"); if (!box) return;
      const s = evaluations[+box.id.slice(5)]; if (!s || s.phase !== "q") return;
      const q = s.qs[s.i];
      if (e.target.dataset.in === "v") q.val = e.target.value;
      if (e.target.dataset.sub !== undefined) q.ansv[+e.target.dataset.sub] = e.target.value;
      const dots = $$(".qz-dots i", box); if (dots[s.i]) dots[s.i].classList.toggle("ok", repondu(q));
    });
    // Entrée = question suivante
    document.addEventListener("keydown", e => {
      if (e.key !== "Enter" || !e.target.closest(".quizbox input")) return;
      const b = $('[data-q="suiv"]', e.target.closest(".quizbox")); if (b) { e.preventDefault(); b.click(); }
    });
  }

  /* ==========================================================================
     DÉMARRAGE
     ========================================================================== */
  function demarrer(config) {
    A = config;
    const info = infosCatalogue();
    document.title = info.titre + " — Révision BTS Audiovisuel";
    construireCoquille(info);
    construireAccueil(info);
    A.modules.forEach((m, i) => construireModule(m, i + 1));
    infobulles();
    brancherEvaluation();
    modeMenu();

    // Clics de navigation (menu, tuiles, bas de page, lexique)
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-go]"); if (b) { e.preventDefault(); go(b.dataset.go); return; }
      const t = e.target.closest("[data-tout-ouvrir]");
      if (t) {
        const zone = t.closest(".etape"), lignes = $$("details.qa", zone), tous = lignes.every(d => d.open);
        lignes.forEach(d => { d.open = !tous; }); t.textContent = tous ? "Tout ouvrir" : "Tout replier";
      }
    });
    $("#navLexique").addEventListener("click", lexique);
    $("#sideToggle").addEventListener("click", basculerMenu);
    $("#scrim").addEventListener("click", () => tiroir(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape") tiroir(false); });
    window.addEventListener("resize", () => { clearTimeout(demarrer._rz); demarrer._rz = setTimeout(modeMenu, 120); });
    window.addEventListener("scroll", () => { if (!demarrer._raf) demarrer._raf = requestAnimationFrame(() => { demarrer._raf = 0; suivreDefilement(); }); }, { passive: true });
    document.addEventListener("input", e => { if (e.target.type === "range") remplirCurseur(e.target); }, true);
    // Lien vers « #m2 » ou bouton Précédent du navigateur : on suit l'adresse.
    window.addEventListener("hashchange", () => { const c = location.hash.slice(1); if (c && c !== ongletCourant && $("#tab-" + c)) go(c); });

    // On affiche l'accueil tout de suite ; la page demandée dans l'adresse
    // (#m2…) est ouverte dès que la progression est lue (elle dit si le
    // module est déverrouillé).
    const depart = (location.hash || "#accueil").slice(1);
    go("accueil", true);
    let premiereFois = true;

    // La progression dépend de l'élève connecté : on la relit à chaque changement.
    Suivi.surChangementUtilisateur(async () => {
      await chargerProgression();
      if (premiereFois) {
        premiereFois = false;
        if (depart !== "accueil" && $("#tab-" + depart)) go(depart, true);
      }
      if (ongletCourant.startsWith("m") && !ouvert(+ongletCourant.slice(1))) go("accueil");
      Object.keys(evaluations).forEach(k => { if (evaluations[k].phase === "intro") dessinerEvaluation(+k); });
      rafraichir();
    });
  }

  /* --- Ce que les autres fichiers ont le droit d'utiliser --- */
  return {
    demarrer: demarrer,
    // Déclare le labo du module n : fonction (zone, infos) appelée au premier affichage.
    labo: function (n, fonction) { labos[n] = fonction; },
    // Fonction appelée à CHAQUE affichage du module n (redimensionner un canvas…).
    surAffichage: function (n, fonction) { (auAffichage[n] = auAffichage[n] || []).push(fonction); },
    // Outils pour les labos
    afficher: afficher,
    segment: segment,
    toast: toast,
    question: question,
    nombre: nombreFr,
    // Outils pour les questions tirées au sort (contenu.js)
    hasard: hasardEntier,
    choisir: liste => liste[Math.floor(Math.random() * liste.length)],
    melanger: melanger,
    go: go
  };
})();
