/* ==========================================================================
   page-accueil.js — les applications de l'accueil, rangées par catégorie
   --------------------------------------------------------------------------
   L'accueil lit le catalogue (js/catalogue.js) et range les applications
   dans les trois catégories de CATEGORIES :
     1. Apport de connaissances, découpée en sous-catégories (rayons) ;
     2. Outils ;
     3. Applications pratiques.
   Les sous-catégories sont des menus déroulants (fermés par défaut) pour
   garder un accueil léger ; leur état ouvert / fermé est retenu le temps de
   la visite. Sous chaque icône : la progression de l'élève. Les applications
   prévues (liste « aVenir » d'une catégorie) sont montrées grisées.
   L'animation d'ouverture d'une application est dans js/transition.js.
   Publier une application dans le catalogue suffit à la faire apparaître ici.
   ========================================================================== */

// Fabrique l'icône cliquable d'une application.
function creerIconeApplication(app, progression, rang) {
  const element = creerElement("li");
  element.style.setProperty("--i", rang); // décalage de l'animation d'entrée (en cascade)

  const lien = creerElement(app.disponible ? "a" : "div", "app" + (app.disponible ? "" : " indisponible"));
  if (app.disponible) {
    lien.href = RACINE + app.page;
    lien.dataset.appFond = Applications.fond(app); // couleurs reprises par js/transition.js
  }
  if (app.description) lien.title = app.description;

  const cadre = creerElement("span", "app-ic-wrap");
  cadre.append(Applications.icone(app));
  if (progression && progression.valides > 0) {
    const badge = creerElement("span", "app-badge", String(progression.valides));
    badge.title = progression.valides + " module(s) validé(s)";
    cadre.append(badge);
  }

  lien.append(cadre, creerElement("span", "app-nom", app.titre), creerElement("span", "app-sous", app.accroche || ""));

  // Ligne d'état : progression, ou nombre de modules si l'élève n'a pas commencé.
  const etat = creerElement("span", "app-etat");
  if (!app.disponible) {
    etat.textContent = "Bientôt disponible";
  } else if (progression && progression.tentes > 0) {
    const fini = progression.valides === progression.total;
    etat.classList.add(fini ? "ok" : "encours");
    const barre = creerElement("span", "app-barre");
    const remplissage = creerElement("i");
    remplissage.style.width = (progression.valides / progression.total) * 100 + "%";
    barre.append(remplissage);
    etat.append(barre, document.createTextNode(progression.valides + " / " + progression.total));
  } else if (app.modules) {
    etat.textContent = app.modules + " module" + (app.modules > 1 ? "s" : "");
  }
  lien.append(etat);

  element.append(lien);
  return element;
}

// L'emplacement de la prochaine application : il montre que la grille va se remplir.
function creerEmplacementVide(rang) {
  const element = creerElement("li");
  element.style.setProperty("--i", rang);
  const bloc = creerElement("div", "app vide");
  const icone = creerElement("span", "app-ic");
  icone.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES.plus + "</svg>";
  bloc.append(icone, creerElement("span", "app-nom", "Prochainement"), creerElement("span", "app-sous", "Une nouvelle notion arrive ici."));
  element.append(bloc);
  return element;
}

// Le pictogramme d'une catégorie, dans un carré arrondi à son dégradé.
function creerIconeCategorie(categorie) {
  const icone = creerElement("span", "cat-ic");
  icone.style.setProperty("--app-grad", "linear-gradient(160deg, " + categorie.teinte.join(", ") + ")");
  icone.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[categorie.icone] || ICONES.plus) + "</svg>";
  return icone;
}

// Les pastilles de navigation : 1 · Apport de connaissances, 2 · Outils…
function afficherNavigationCategories() {
  const nav = document.getElementById("nav-categories");
  if (!nav || nav.childElementCount) return;
  CATEGORIES.forEach(function (categorie) {
    const lien = creerElement("a", "cat-lien");
    lien.href = "#" + categorie.id;
    // Défilement doux jusqu'à la catégorie (natif, donc léger pour l'ordinateur).
    lien.addEventListener("click", function (evenement) {
      const cible = document.getElementById(categorie.id);
      if (!cible) return;
      evenement.preventDefault();
      const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cible.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
      try { history.replaceState(null, "", "#" + categorie.id); } catch (e) { /* page ouverte en local */ }
    });
    lien.append(creerIconeCategorie(categorie), creerElement("b", "", categorie.nom), creerElement("small", "", categorie.accroche));
    nav.append(lien);
  });
}

/* --- Les sous-catégories en menus déroulants -------------------------------
   Pourquoi pas la balise <details> ? Elle ferme son contenu d'un coup, sans
   animation possible. Ici, un bouton (accessible au clavier, annoncé
   « développé / réduit ») ouvre un panneau dont la hauteur s'anime avec
   grid-template-rows (0fr → 1fr) : pas de hauteur à mesurer en JavaScript. */
const CLE_RAYONS = "revision-bts-rayons-ouverts";

function lireRayonsOuverts() {
  try { return JSON.parse(sessionStorage.getItem(CLE_RAYONS)) || []; } catch (e) { return []; }
}
function retenirRayon(id, ouvert) {
  const liste = lireRayonsOuverts().filter(function (x) { return x !== id; });
  if (ouvert) liste.push(id);
  try { sessionStorage.setItem(CLE_RAYONS, JSON.stringify(liste)); } catch (e) { /* sans mémoire : pas grave */ }
}

// Ouvre ou ferme une sous-catégorie. « animer » = false à l'affichage initial.
function basculerRayon(sous, ouvrir, animer) {
  if (!animer) sous.classList.add("sans-anim");
  sous.classList.toggle("ouvert", ouvrir);
  sous.querySelector(".sc-tete").setAttribute("aria-expanded", String(ouvrir));
  // inert : un panneau fermé ne doit pas recevoir le focus clavier.
  const interieur = sous.querySelector(".sc-int");
  if (ouvrir) interieur.removeAttribute("inert"); else interieur.setAttribute("inert", "");
  if (!animer) requestAnimationFrame(function () { requestAnimationFrame(function () { sous.classList.remove("sans-anim"); }); });
}

function creerSousCategorie(rayon, apps, grilleApps, progressionSuivi) {
  const sous = creerElement("section", "sous-cat");
  sous.id = rayon.id;

  const publiees = apps.filter(function (app) { return app.disponible; });
  const nbModules = publiees.reduce(function (s, app) { return s + (app.modules || 0); }, 0);
  const nbValides = publiees.reduce(function (s, app) { return s + Applications.progression(app, progressionSuivi).valides; }, 0);

  const tete = creerElement("button", "sc-tete");
  tete.type = "button";
  tete.id = rayon.id + "-tete";
  tete.setAttribute("aria-controls", rayon.id + "-corps");

  // Les icônes de la sous-catégorie, en éventail : on sait ce qu'il y a dedans sans ouvrir.
  const pile = creerElement("span", "sc-icones");
  pile.setAttribute("aria-hidden", "true");
  publiees.slice(0, 4).forEach(function (app, i) {
    const mini = Applications.icone(app);
    mini.style.setProperty("--k", i);
    pile.append(mini);
  });

  const texte = creerElement("span", "sc-txt");
  texte.append(creerElement("b", "", rayon.nom));
  if (rayon.description) texte.append(creerElement("small", "", rayon.description));

  const meta = creerElement("span", "sc-meta");
  meta.textContent = publiees.length + (publiees.length > 1 ? " applications" : " application") + " · " + nbModules + " modules";
  if (nbValides > 0) meta.append(creerElement("em", "", nbValides + (nbValides > 1 ? " validés" : " validé")));

  const chevron = creerElement("span", "sc-chevron");
  chevron.setAttribute("aria-hidden", "true");

  tete.append(pile, texte, meta, chevron);

  const corps = creerElement("div", "sc-corps");
  corps.id = rayon.id + "-corps";
  corps.setAttribute("role", "region");
  corps.setAttribute("aria-labelledby", tete.id);
  const interieur = creerElement("div", "sc-int");
  // --j : rang de l'icône dans la grille, pour qu'elles apparaissent en cascade.
  Array.prototype.forEach.call(grilleApps.children, function (li, j) { li.style.setProperty("--j", j); });
  interieur.append(grilleApps);
  corps.append(interieur);

  tete.addEventListener("click", function () {
    const ouvrir = !sous.classList.contains("ouvert");
    basculerRayon(sous, ouvrir, true);
    retenirRayon(rayon.id, ouvrir);
  });

  sous.append(tete, corps);
  basculerRayon(sous, lireRayonsOuverts().includes(rayon.id), false);
  return sous;
}

// Une catégorie complète : en-tête, puis ses sous-catégories ou sa grille.
function creerCategorie(categorie, progressionSuivi, compteur) {
  const section = creerElement("section", "categorie");
  section.id = categorie.id;

  const entete = creerElement("header", "cat-hd");
  const texte = creerElement("div");
  texte.append(
    creerElement("span", "eyebrow", "Catégorie " + categorie.numero),
    creerElement("h2", "", categorie.nom),
    creerElement("p", "", categorie.description)
  );
  entete.append(creerIconeCategorie(categorie), texte);
  section.append(entete);

  const apps = CATALOGUE.filter(function (app) { return Applications.rubrique(app).categorie === categorie; });

  // La grille : applications publiées, puis applications prévues (grisées),
  // ou à défaut une case « Prochainement ».
  function grille(liste) {
    const ul = creerElement("ul", "apps");
    liste.forEach(function (app) {
      ul.append(creerIconeApplication(app, app.disponible ? Applications.progression(app, progressionSuivi) : null, compteur.rang++));
    });
    (categorie.aVenir || []).forEach(function (prevue) {
      ul.append(creerIconeApplication({
        titre: prevue.titre,
        accroche: prevue.accroche,
        icone: prevue.icone,
        teinte: categorie.teinte,
        disponible: false
      }, null, compteur.rang++));
    });
    if (!(categorie.aVenir || []).length) ul.append(creerEmplacementVide(compteur.rang++));
    return ul;
  }

  if (categorie.sousCategories && categorie.sousCategories.length) {
    // Une sous-section par rayon, puis « Autres » pour une application mal rangée.
    const rayons = categorie.sousCategories.concat([{ id: categorie.id + "-autres", nom: "Autres", description: "" }]);
    rayons.forEach(function (rayon, i) {
      const contenu = apps.filter(function (app) {
        const s = Applications.rubrique(app).sousCategorie;
        return i < categorie.sousCategories.length ? s === rayon : s === null;
      });
      if (i === categorie.sousCategories.length && !contenu.length) return; // pas de rayon « Autres » vide
      section.append(creerSousCategorie(rayon, contenu, grille(contenu), progressionSuivi));
    });
  } else {
    section.append(grille(apps));
    if (!apps.some(function (app) { return app.disponible; })) {
      section.append(creerElement("p", "cat-bientot", "Ces applications sont en préparation : elles apparaîtront ici dès leur publication."));
    }
  }
  return section;
}

let premierAffichage = true;

async function afficherApplications() {
  const zone = document.getElementById("liste-applications");
  afficherNavigationCategories();

  // La progression sert seulement à afficher l'avancement sous les icônes :
  // si sa lecture échoue, on affiche quand même les applications.
  let progressionSuivi = {};
  try {
    progressionSuivi = await Suivi.lireProgression();
  } catch (erreur) {
    console.warn("Progression illisible :", erreur);
  }

  // Le résumé, à côté du titre « Les applications ».
  const resume = document.getElementById("resume-applications");
  if (resume) {
    const publiees = CATALOGUE.filter(function (app) { return app.disponible; });
    const nbModules = publiees.reduce(function (s, app) { return s + (app.modules || 0); }, 0);
    const nbValides = publiees.reduce(function (s, app) { return s + Applications.progression(app, progressionSuivi).valides; }, 0);
    resume.innerHTML = "";
    [
      [publiees.length, publiees.length > 1 ? " applications" : " application"],
      [nbModules, " modules"],
      [nbValides, nbValides > 1 ? " modules validés" : " module validé"]
    ].forEach(function (ligne) {
      const pastille = creerElement("span");
      pastille.append(creerElement("b", "", String(ligne[0])), document.createTextNode(ligne[1]));
      resume.append(pastille);
    });
  }

  zone.textContent = "";
  const compteur = { rang: 0 };
  CATEGORIES.forEach(function (categorie) {
    zone.append(creerCategorie(categorie, progressionSuivi, compteur));
  });

  // Les sections sont créées après le chargement : si l'adresse vise l'une
  // d'elles (index.html#outils, #numerique…), on s'y rend maintenant.
  if (premierAffichage) {
    premierAffichage = false;
    const cible = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (cible && zone.contains(cible)) {
      // Adresse visant une sous-catégorie (retour depuis une application) : on l'ouvre.
      if (cible.classList.contains("sous-cat")) { basculerRayon(cible, true, false); retenirRayon(cible.id, true); }
      cible.scrollIntoView();
    }
  }
}

// On reconstruit la grille à chaque connexion / déconnexion, car la
// progression affichée dépend de l'élève connecté.
Suivi.surChangementUtilisateur(afficherApplications);
