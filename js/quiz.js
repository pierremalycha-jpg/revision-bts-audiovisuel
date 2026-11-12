/* ==========================================================================
   quiz.js — le moteur de quiz, réutilisé par tous les modules
   --------------------------------------------------------------------------
   Pourquoi un moteur commun ? Chaque module fournit seulement sa liste de
   questions (fichier questions.js) ; l'affichage, le calcul du score et
   l'enregistrement sont écrits une seule fois ici.

   Utilisation dans la page d'un module :
     demarrerQuiz({
       conteneur: "#quiz",                    // où afficher le quiz
       moduleId: "tes-signal-video-numerique", // identifiant du catalogue
       questions: QUESTIONS                   // tableau défini dans questions.js
     });

   Format d'une question :
     {
       question: "Le texte de la question",
       reponses: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
       bonne: 1,            // position de la bonne réponse (on compte à partir de 0)
       explication: "Affichée après la réponse, que l'élève ait juste ou faux."
     }
   ========================================================================== */

// Mélange un tableau (méthode de Fisher-Yates) et renvoie une copie :
// le tableau d'origine n'est pas modifié.
function melanger(tableau) {
  const copie = tableau.slice();
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temporaire = copie[i];
    copie[i] = copie[j];
    copie[j] = temporaire;
  }
  return copie;
}

function demarrerQuiz(options) {
  const conteneur = document.querySelector(options.conteneur);
  conteneur.classList.add("quiz");

  // L'état de la partie en cours.
  let questions = [];  // les questions, dans l'ordre tiré au sort
  let numero = 0;      // position de la question affichée
  let score = 0;
  let erreurs = [];    // les questions ratées, pour le bilan final

  function nouvellePartie() {
    // On mélange les questions ET les réponses : l'élève doit retenir la
    // notion, pas « la bonne réponse était la deuxième ».
    questions = melanger(options.questions).map(function (q) {
      const reponses = q.reponses.map(function (texte, position) {
        return { texte: texte, estBonne: position === q.bonne };
      });
      return { question: q.question, explication: q.explication, reponses: melanger(reponses) };
    });
    numero = 0;
    score = 0;
    erreurs = [];
    afficherQuestion();
  }

  function afficherQuestion() {
    const q = questions[numero];
    conteneur.textContent = "";

    // Avancement : « Question 3 / 10 » + barre de progression.
    const avancement = creerElement("div", "quiz-avancement");
    avancement.append(
      creerElement("span", "", "Question " + (numero + 1) + " / " + questions.length),
      creerElement("span", "", "Score : " + score)
    );
    const barre = creerElement("div", "quiz-barre");
    const remplissage = creerElement("div");
    remplissage.style.width = (numero / questions.length) * 100 + "%";
    barre.append(remplissage);

    const enonce = creerElement("p", "quiz-question", q.question);

    // Une réponse = un vrai bouton : utilisable à la souris, au doigt et au clavier.
    const liste = creerElement("div", "quiz-reponses");
    q.reponses.forEach(function (reponse) {
      const bouton = creerElement("button", "quiz-reponse", reponse.texte);
      bouton.type = "button";
      bouton.addEventListener("click", function () {
        corriger(reponse, bouton, liste);
      });
      liste.append(bouton);
    });

    // Zone où apparaîtra la correction. aria-live la fait annoncer par les
    // lecteurs d'écran dès qu'elle se remplit.
    const correction = creerElement("div");
    correction.id = "quiz-correction";
    correction.setAttribute("aria-live", "polite");

    conteneur.append(avancement, barre, enonce, liste, correction);
  }

  function corriger(reponseChoisie, boutonChoisi, liste) {
    const q = questions[numero];
    const boutons = liste.querySelectorAll("button");

    // On bloque les boutons (une seule tentative) et on colore :
    // la bonne réponse en vert, le mauvais choix éventuel en rouge.
    boutons.forEach(function (bouton, position) {
      bouton.disabled = true;
      if (q.reponses[position].estBonne) bouton.classList.add("juste");
    });

    if (reponseChoisie.estBonne) {
      score++;
    } else {
      boutonChoisi.classList.add("faux");
      const bonne = q.reponses.find(function (r) { return r.estBonne; });
      erreurs.push({ question: q.question, bonneReponse: bonne.texte, explication: q.explication });
    }

    const correction = document.getElementById("quiz-correction");
    const explication = creerElement("div", "quiz-explication");
    explication.append(
      creerElement("strong", "", reponseChoisie.estBonne ? "Bonne réponse !" : "Ce n'est pas ça."),
      creerElement("p", "", q.explication)
    );

    const dernier = numero === questions.length - 1;
    const suivant = creerElement("button", "bouton", dernier ? "Voir mon résultat" : "Question suivante");
    suivant.type = "button";
    suivant.addEventListener("click", function () {
      numero++;
      if (dernier) afficherResultat();
      else afficherQuestion();
    });

    correction.append(explication, suivant);
    suivant.focus(); // au clavier, la touche Entrée passe directement à la suite
  }

  async function afficherResultat() {
    const total = questions.length;
    conteneur.textContent = "";

    const titre = creerElement("p", "quiz-score", score + " / " + total);
    titre.tabIndex = -1; // permet d'y placer le focus pour l'annoncer

    let commentaire = "Reprends le rappel de cours, puis retente le quiz.";
    if (score === total) commentaire = "Sans faute, bravo !";
    else if (score >= total * 0.7) commentaire = "Bon résultat. Revois les points ci-dessous pour viser le sans-faute.";
    else if (score >= total * 0.5) commentaire = "C'est en bonne voie. Relis les explications ci-dessous.";

    const etat = creerElement("p", "discret", "Enregistrement du résultat…");
    conteneur.append(titre, creerElement("p", "", commentaire), etat);
    titre.focus();

    // Le bilan des erreurs : c'est là que l'on apprend le plus.
    if (erreurs.length > 0) {
      conteneur.append(creerElement("h3", "", "À revoir"));
      const liste = creerElement("ul", "quiz-erreurs");
      erreurs.forEach(function (erreur) {
        const ligne = creerElement("li");
        ligne.append(
          creerElement("strong", "", erreur.question),
          creerElement("div", "", "Bonne réponse : " + erreur.bonneReponse),
          creerElement("div", "discret", erreur.explication)
        );
        liste.append(ligne);
      });
      conteneur.append(liste);
    }

    const actions = creerElement("div", "quiz-actions");
    const rejouer = creerElement("button", "bouton", "Recommencer le quiz");
    rejouer.type = "button";
    rejouer.addEventListener("click", nouvellePartie);
    const progression = creerElement("a", "bouton bouton-secondaire", "Voir ma progression");
    progression.href = RACINE + "tableau-de-bord.html";
    actions.append(rejouer, progression);
    conteneur.append(actions);

    // Enregistrement. try / catch : si la base de données est injoignable,
    // on affiche un message au lieu de laisser la page planter.
    try {
      const lieu = await Suivi.enregistrerResultat(options.moduleId, score, total);
      if (lieu === "compte") {
        etat.textContent = "Résultat enregistré dans ton compte.";
      } else if (Suivi.firebaseActif) {
        etat.textContent = "Résultat enregistré sur cet appareil seulement. Connecte-toi pour le retrouver partout.";
      } else {
        etat.textContent = "Résultat enregistré sur cet appareil.";
      }
    } catch (erreur) {
      etat.textContent = "Résultat non enregistré. " + Suivi.messageErreur(erreur);
      etat.className = "message message-erreur";
    }
  }

  nouvellePartie();
}
