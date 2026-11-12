/* ==========================================================================
   page-option.js — la grille d'applications d'une option
   --------------------------------------------------------------------------
   Utilisé par tiee.html et image.html. La page indique son option sur la
   balise <body> (data-option="tiee" ou "image") ; ce script lit le catalogue,
   garde les applications de cette option, les range par épreuve (TES, TMO)
   et affiche chacune sous forme d'icône, avec sa progression.
   Pourquoi un seul script pour deux pages ? Pour qu'elles restent identiques
   dans leur fonctionnement : une correction profite aux deux.
   ========================================================================== */

const OPTION_COURANTE = document.body.dataset.option;

// On retient l'option visitée : une application commune à TIEE et IMAGE
// saura ainsi vers quelle page renvoyer l'élève (voir js/application.js).
try { sessionStorage.setItem("revision-bts-option", OPTION_COURANTE); } catch (e) { /* sans importance */ }

// Fabrique l'icône cliquable d'une application.
function creerIconeApplication(app, progression, rang) {
  const element = creerElement("li");
  element.style.setProperty("--i", rang); // décalage de l'animation d'entrée (en cascade)

  const lien = creerElement(app.disponible ? "a" : "div", "app" + (app.disponible ? "" : " indisponible"));
  if (app.disponible) lien.href = RACINE + app.page;
  lien.title = app.description;

  const cadre = creerElement("span", "app-ic-wrap");
  cadre.append(Applications.icone(app));
  if (progression && progression.valides > 0) {
    const badge = creerElement("span", "app-badge", String(progression.valides));
    badge.title = progression.valides + " module(s) validé(s)";
    cadre.append(badge);
  }

  lien.append(cadre, creerElement("span", "app-nom", app.titre), creerElement("span", "app-sous", app.accroche));

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
  } else {
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

async function afficherApplications() {
  const zone = document.getElementById("liste-applications");

  // La progression sert seulement à afficher l'avancement sous les icônes :
  // si sa lecture échoue, on affiche quand même les applications.
  let progressionSuivi = {};
  try {
    progressionSuivi = await Suivi.lireProgression();
  } catch (erreur) {
    console.warn("Progression illisible :", erreur);
  }

  const applications = CATALOGUE.filter(function (app) { return app.options.includes(OPTION_COURANTE); });

  // Le résumé de l'option, sous le titre.
  const resume = document.getElementById("resume-option");
  if (resume) {
    const publiees = applications.filter(function (app) { return app.disponible; });
    const nbModules = publiees.reduce(function (s, app) { return s + app.modules; }, 0);
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
  let rang = 0;
  ["TES", "TMO"].forEach(function (epreuve) {
    const apps = applications.filter(function (app) { return app.epreuve === epreuve; });

    const section = creerElement("section", "epreuve");
    const entete = creerElement("div", "epreuve-hd");
    const titre = creerElement("h2");
    titre.append(creerElement("small", "", EPREUVES[epreuve].sigle), document.createTextNode(EPREUVES[epreuve].nom));
    entete.append(titre, creerElement("p", "", EPREUVES[epreuve].description));

    const grille = creerElement("ul", "apps");
    apps.forEach(function (app) {
      grille.append(creerIconeApplication(app, app.disponible ? Applications.progression(app, progressionSuivi) : null, rang++));
    });
    grille.append(creerEmplacementVide(rang++));

    section.append(entete, grille);
    zone.append(section);
  });
}

// On reconstruit la grille à chaque connexion / déconnexion, car la
// progression affichée dépend de l'élève connecté.
Suivi.surChangementUtilisateur(afficherApplications);
