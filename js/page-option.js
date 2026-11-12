/* ==========================================================================
   page-option.js — construit la liste des modules d'une option
   --------------------------------------------------------------------------
   Utilisé par tiee.html et image.html. La page indique son option sur la
   balise <body> (data-option="tiee" ou "image") ; ce script lit le catalogue,
   garde les modules de cette option et les range par épreuve (TES, TMO).
   Pourquoi un seul script pour deux pages ? Pour qu'elles restent identiques
   dans leur fonctionnement : une correction profite aux deux.
   ========================================================================== */

const OPTION_COURANTE = document.body.dataset.option;

// Fabrique la carte d'un module. « fiche » est sa progression (ou undefined).
function creerCarteModule(module, fiche) {
  const carte = creerElement("li", "carte");

  const etiquettes = creerElement("div", "carte-etiquettes");
  module.contenu.forEach(function (type) {
    etiquettes.append(creerElement("span", "etiquette", type));
  });

  carte.append(creerElement("h3", "", module.titre), creerElement("p", "", module.description), etiquettes);

  if (fiche) {
    carte.append(creerElement("div", "carte-progression",
      "Meilleur score : " + fiche.meilleurScore + " / " + fiche.total));
  }

  if (module.disponible) {
    const lien = creerElement("a", "bouton", fiche ? "Réviser à nouveau" : "Commencer");
    lien.href = RACINE + module.page;
    carte.append(lien);
  } else {
    carte.classList.add("carte-indisponible");
    carte.append(creerElement("span", "etiquette etiquette-neutre", "Bientôt disponible"));
  }
  return carte;
}

async function afficherModules() {
  const zone = document.getElementById("liste-modules");

  // La progression sert seulement à afficher « Meilleur score » sur les
  // cartes : si sa lecture échoue, on affiche quand même les modules.
  let progression = {};
  try {
    progression = await Suivi.lireProgression();
  } catch (erreur) {
    console.warn("Progression illisible :", erreur);
  }

  zone.textContent = "";
  ["TES", "TMO"].forEach(function (epreuve) {
    const modules = CATALOGUE.filter(function (module) {
      return module.epreuve === epreuve && module.options.includes(OPTION_COURANTE);
    });

    zone.append(
      creerElement("h2", "", EPREUVES[epreuve].nom),
      creerElement("p", "discret", EPREUVES[epreuve].description)
    );

    if (modules.length === 0) {
      zone.append(creerElement("p", "", "Aucun module pour l'instant : ils arrivent bientôt."));
      return;
    }
    const grille = creerElement("ul", "grille");
    modules.forEach(function (module) {
      grille.append(creerCarteModule(module, progression[module.id]));
    });
    zone.append(grille);
  });
}

// On reconstruit la liste à chaque connexion / déconnexion, car la
// progression affichée dépend de l'élève connecté.
Suivi.surChangementUtilisateur(afficherModules);
