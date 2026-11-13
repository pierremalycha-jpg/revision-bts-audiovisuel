/* ==========================================================================
   page-tableau-de-bord.js — remplit tableau-de-bord.html
   --------------------------------------------------------------------------
   Lit la progression (compte en ligne ou appareil, c'est suivi.js qui décide)
   et la croise avec le catalogue pour afficher une ligne par application,
   avec une petite barre par module.
   ========================================================================== */

async function afficherTableauDeBord(utilisateur) {
  const origine = document.getElementById("origine-donnees");
  const liste = document.getElementById("liste-progression");

  // 1. D'où viennent les données ?
  origine.textContent = "";
  origine.className = "chapeau";
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
  let progressionSuivi;
  try {
    progressionSuivi = await Suivi.lireProgression();
  } catch (erreur) {
    origine.textContent = "Impossible de lire ta progression. " + Suivi.messageErreur(erreur);
    origine.className = "message message-erreur";
    return;
  }

  // 3. Une ligne par application publiée.
  liste.textContent = "";
  let valides = 0;
  let modulesTotal = 0;
  let sommeNotes = 0;
  let notes = 0;
  let tentatives = 0;

  CATALOGUE.filter(function (app) { return app.disponible; }).forEach(function (app) {
    const p = Applications.progression(app, progressionSuivi);
    valides += p.valides;
    modulesTotal += p.total;
    tentatives += p.tentatives;
    p.modules.forEach(function (m) {
      if (m.meilleure !== null) { sommeNotes += m.meilleure; notes++; }
    });

    const ligne = creerElement("a", "suivi-app rv");
    ligne.href = app.page;
    ligne.dataset.appFond = Applications.fond(app); // animation d'ouverture (js/transition.js)

    // Où l'application est rangée sur l'accueil : sous-catégorie, sinon catégorie.
    const rubrique = Applications.rubrique(app);
    const rayon = rubrique.sousCategorie ? rubrique.sousCategorie.nom : rubrique.categorie.nom;

    const texte = creerElement("div");
    texte.append(
      creerElement("h3", "", app.titre),
      creerElement("p", "", app.epreuve + " · " + rayon +
        (p.date ? " · dernière évaluation le " + new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : ""))
    );
    // Une barre par module : verte = validé, orange = tenté, grise = pas encore.
    const barres = creerElement("div", "suivi-modules");
    p.modules.forEach(function (m, i) {
      const barre = creerElement("i", m.meilleure === null ? "" : m.meilleure >= NOTE_DE_VALIDATION ? "ok" : "essai");
      barre.title = "Module " + (i + 1) + " : " + (m.meilleure === null ? "pas encore évalué" : Applications.note(m.meilleure) + " / 20");
      barres.append(barre);
    });
    texte.append(barres);

    const score = creerElement("div", "suivi-score");
    score.append(
      creerElement("b", "", p.valides + " / " + p.total),
      creerElement("small", "", p.moyenne === null ? "pas encore commencé" : "modules validés · moyenne " + Applications.note(p.moyenne) + "/20")
    );

    ligne.append(Applications.icone(app), texte, score);
    liste.append(ligne);
  });

  // 4. Les chiffres clés.
  document.getElementById("chiffre-modules").textContent = valides + " / " + modulesTotal;
  document.getElementById("chiffre-moyenne").textContent = notes > 0 ? Applications.note(sommeNotes / notes) + " / 20" : "–";
  document.getElementById("chiffre-tentatives").textContent = tentatives;
  Apparition.scanner(liste);
}

Suivi.surChangementUtilisateur(afficherTableauDeBord);
