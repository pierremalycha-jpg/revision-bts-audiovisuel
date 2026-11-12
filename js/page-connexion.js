/* ==========================================================================
   page-connexion.js — fait fonctionner connexion.html
   --------------------------------------------------------------------------
   La page contient quatre blocs cachés ; on affiche celui qui convient :
   mode local, déjà connecté, formulaire de connexion ou d'inscription.
   ========================================================================== */

const blocModeLocal = document.getElementById("bloc-mode-local");
const blocConnecte = document.getElementById("bloc-connecte");
const formulaireConnexion = document.getElementById("formulaire-connexion");
const formulaireInscription = document.getElementById("formulaire-inscription");

// Pendant la création d'un compte, on ne veut pas que la page bascule sur
// « Tu es connecté·e » avant la fin de l'enregistrement du prénom.
let inscriptionEnCours = false;

// Affiche un seul des quatre blocs et cache les autres.
function montrerSeulement(blocVisible) {
  [blocModeLocal, blocConnecte, formulaireConnexion, formulaireInscription].forEach(function (bloc) {
    bloc.classList.toggle("cache", bloc !== blocVisible);
  });
}

// Écrit un message sous un formulaire. type = "erreur" ou "succes".
function afficherMessage(id, texte, type) {
  const zone = document.getElementById(id);
  zone.textContent = texte;
  zone.className = "message message-" + type;
}

/* --- Quel bloc afficher ? ------------------------------------------------ */

if (!Suivi.firebaseActif) {
  montrerSeulement(blocModeLocal);
} else {
  Suivi.surChangementUtilisateur(function (utilisateur) {
    if (inscriptionEnCours) return;
    montrerSeulement(utilisateur ? blocConnecte : formulaireConnexion);
  });
}

document.getElementById("lien-vers-inscription").addEventListener("click", function () {
  montrerSeulement(formulaireInscription);
});
document.getElementById("lien-vers-connexion").addEventListener("click", function () {
  montrerSeulement(formulaireConnexion);
});

/* --- Connexion ----------------------------------------------------------- */

formulaireConnexion.addEventListener("submit", async function (evenement) {
  // Par défaut, un formulaire recharge la page quand on le valide :
  // on l'en empêche pour traiter la demande nous-mêmes.
  evenement.preventDefault();
  try {
    await Suivi.connecter(
      document.getElementById("connexion-email").value.trim(),
      document.getElementById("connexion-mot-de-passe").value
    );
    window.location.href = "tableau-de-bord.html";
  } catch (erreur) {
    afficherMessage("connexion-message", Suivi.messageErreur(erreur), "erreur");
  }
});

document.getElementById("lien-mot-de-passe-oublie").addEventListener("click", async function () {
  const email = document.getElementById("connexion-email").value.trim();
  if (!email) {
    afficherMessage("connexion-message", "Saisis d'abord ton adresse e-mail ci-dessus.", "erreur");
    return;
  }
  try {
    await Suivi.reinitialiserMotDePasse(email);
    afficherMessage("connexion-message",
      "Si un compte existe pour cette adresse, un e-mail vient d'être envoyé (pense à regarder les indésirables).", "succes");
  } catch (erreur) {
    afficherMessage("connexion-message", Suivi.messageErreur(erreur), "erreur");
  }
});

/* --- Création de compte -------------------------------------------------- */

formulaireInscription.addEventListener("submit", async function (evenement) {
  evenement.preventDefault();
  inscriptionEnCours = true;
  try {
    await Suivi.inscrire(
      document.getElementById("inscription-email").value.trim(),
      document.getElementById("inscription-mot-de-passe").value,
      document.getElementById("inscription-prenom").value.trim(),
      document.getElementById("inscription-option").value
    );
    window.location.href = "tableau-de-bord.html";
  } catch (erreur) {
    inscriptionEnCours = false;
    afficherMessage("inscription-message", Suivi.messageErreur(erreur), "erreur");
  }
});
