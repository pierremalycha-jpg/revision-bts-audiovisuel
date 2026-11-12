/* ==========================================================================
   page-tableau-de-bord.js — remplit tableau-de-bord.html
   --------------------------------------------------------------------------
   Lit la progression (compte en ligne ou appareil, c'est suivi.js qui décide)
   et la croise avec le catalogue pour afficher une ligne par module.
   ========================================================================== */

async function afficherTableauDeBord(utilisateur) {
  const origine = document.getElementById("origine-donnees");
  const lignes = document.getElementById("lignes-progression");

  // 1. D'où viennent les données ?
  origine.textContent = "";
  if (utilisateur) {
    origine.textContent = "Progression enregistrée dans ton compte (" + utilisateur.email + ").";
  } else if (Suivi.firebaseActif) {
    origine.append("Progression enregistrée sur cet appareil. ");
    const lien = creerElement("a", "", "Connecte-toi");
    lien.href = "connexion.html";
    origine.append(lien, " pour la retrouver sur tous tes appareils.");
  } else {
    origine.textContent = "Progression enregistrée sur cet appareil.";
  }

  // 2. Lecture de la progression.
  let progression;
  try {
    progression = await Suivi.lireProgression();
  } catch (erreur) {
    origine.textContent = "Impossible de lire ta progression. " + Suivi.messageErreur(erreur);
    origine.className = "message message-erreur";
    return;
  }

  // 3. Une ligne par module disponible du catalogue.
  lignes.textContent = "";
  let modulesCommences = 0;
  let sommePourcentages = 0;
  let tentatives = 0;

  CATALOGUE.filter(function (module) { return module.disponible; }).forEach(function (module) {
    const fiche = progression[module.id];
    const ligne = creerElement("tr");

    const celluleTitre = creerElement("td");
    const lien = creerElement("a", "", module.titre);
    lien.href = module.page;
    celluleTitre.append(lien);
    ligne.append(celluleTitre, creerElement("td", "", module.epreuve));

    if (fiche) {
      modulesCommences++;
      sommePourcentages += (fiche.meilleurScore / fiche.total) * 100;
      tentatives += fiche.tentatives;
      ligne.append(
        creerElement("td", "nombre", fiche.meilleurScore + " / " + fiche.total),
        creerElement("td", "nombre", fiche.dernierScore + " / " + fiche.total),
        creerElement("td", "nombre", fiche.tentatives),
        // toLocaleDateString écrit la date à la française : 12 novembre 2026.
        creerElement("td", "", new Date(fiche.date).toLocaleDateString("fr-FR",
          { day: "numeric", month: "long", year: "numeric" }))
      );
    } else {
      const vide = creerElement("td", "discret", "Pas encore commencé");
      vide.colSpan = 4; // cette cellule occupe la place des quatre dernières colonnes
      ligne.append(vide);
    }
    lignes.append(ligne);
  });

  // 4. Les chiffres clés.
  const disponibles = CATALOGUE.filter(function (module) { return module.disponible; }).length;
  document.getElementById("chiffre-modules").textContent = modulesCommences + " / " + disponibles;
  document.getElementById("chiffre-moyenne").textContent =
    modulesCommences > 0 ? Math.round(sommePourcentages / modulesCommences) + " %" : "–";
  document.getElementById("chiffre-tentatives").textContent = tentatives;
}

Suivi.surChangementUtilisateur(afficherTableauDeBord);
