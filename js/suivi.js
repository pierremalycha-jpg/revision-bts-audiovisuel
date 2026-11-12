/* ==========================================================================
   suivi.js — comptes des élèves et enregistrement de la progression
   --------------------------------------------------------------------------
   Pourquoi ce fichier ? C'est le SEUL endroit du site qui parle à Firebase.
   Les autres fichiers appellent simplement Suivi.connecter(...),
   Suivi.enregistrerResultat(...), etc. Si un jour tu changes de service,
   seul ce fichier sera à réécrire.

   Deux modes de fonctionnement :
     - Firebase configuré + élève connecté → progression dans Firestore
       (retrouvée sur n'importe quel appareil) ;
     - sinon → progression dans le « localStorage » du navigateur
       (reste sur cet appareil uniquement).

   Organisation des données dans Firestore :
     utilisateurs/{identifiant de l'élève}
         prenom, option, creeLe
     utilisateurs/{identifiant de l'élève}/progression/{identifiant du module}
         dernierScore, meilleurScore, total, tentatives, date
   ========================================================================== */

// Nom sous lequel la progression est rangée dans le navigateur.
const SUIVI_CLE_LOCALE = "revision-bts-progression";

// Firebase est-il utilisable ? Il faut que la bibliothèque soit chargée
// (elle ne l'est pas si l'élève est hors ligne) ET que la configuration
// ait été remplie dans firebase-config.js.
const SUIVI_FIREBASE_ACTIF =
  typeof firebase !== "undefined" &&
  typeof FIREBASE_CONFIG !== "undefined" &&
  FIREBASE_CONFIG.apiKey !== "A_REMPLACER";

let suiviAuth = null; // service de connexion (Firebase Authentication)
let suiviBase = null; // base de données (Cloud Firestore)

if (SUIVI_FIREBASE_ACTIF) {
  firebase.initializeApp(FIREBASE_CONFIG);
  suiviAuth = firebase.auth();
  suiviBase = firebase.firestore();
}

/* --- Petites fonctions internes ------------------------------------------ */

// Lit la progression rangée dans le navigateur (objet vide s'il n'y a rien).
function suiviLireLocal() {
  try {
    return JSON.parse(localStorage.getItem(SUIVI_CLE_LOCALE)) || {};
  } catch (erreur) {
    // Navigation privée ou stockage bloqué : on fait comme s'il n'y avait rien.
    return {};
  }
}

// Calcule la nouvelle fiche d'un module à partir de l'ancienne et du score obtenu.
function suiviNouvelleFiche(ancienne, score, total) {
  let meilleur = score;
  let tentatives = 1;
  if (ancienne) {
    tentatives = ancienne.tentatives + 1;
    // Si le nombre de questions du quiz a changé depuis, l'ancien record
    // n'est plus comparable : on repart du score du jour.
    if (ancienne.total === total) {
      meilleur = Math.max(ancienne.meilleurScore, score);
    }
  }
  return {
    dernierScore: score,
    meilleurScore: meilleur,
    total: total,
    tentatives: tentatives,
    date: new Date().toISOString()
  };
}

// Raccourci vers le dossier « progression » de l'élève connecté dans Firestore.
function suiviDossierProgression() {
  return suiviBase
    .collection("utilisateurs")
    .doc(suiviAuth.currentUser.uid)
    .collection("progression");
}

/* --- L'objet Suivi : ce que les autres fichiers ont le droit d'utiliser --- */

const Suivi = {
  // true si Firebase est configuré (sinon le site est en mode local).
  firebaseActif: SUIVI_FIREBASE_ACTIF,

  // Renvoie l'élève connecté, ou null si personne n'est connecté.
  utilisateur() {
    return SUIVI_FIREBASE_ACTIF ? suiviAuth.currentUser : null;
  },

  // Appelle « fonction » dès que l'on sait si quelqu'un est connecté, puis à
  // chaque connexion ou déconnexion. Pourquoi ne pas simplement lire
  // Suivi.utilisateur() au chargement ? Parce que Firebase met un court
  // instant à retrouver la session : il faut attendre son signal.
  surChangementUtilisateur(fonction) {
    if (SUIVI_FIREBASE_ACTIF) {
      suiviAuth.onAuthStateChanged(fonction);
    } else {
      fonction(null);
    }
  },

  // Crée un compte, puis enregistre le prénom et l'option de l'élève.
  async inscrire(email, motDePasse, prenom, option) {
    const resultat = await suiviAuth.createUserWithEmailAndPassword(email, motDePasse);
    // Le prénom est aussi rangé dans le compte lui-même (displayName) :
    // l'en-tête peut ainsi l'afficher sans interroger la base de données.
    await resultat.user.updateProfile({ displayName: prenom });
    await suiviBase.collection("utilisateurs").doc(resultat.user.uid).set({
      prenom: prenom,
      option: option,
      creeLe: new Date().toISOString()
    });
  },

  connecter(email, motDePasse) {
    return suiviAuth.signInWithEmailAndPassword(email, motDePasse);
  },

  deconnecter() {
    return suiviAuth.signOut();
  },

  // Envoie à l'élève un e-mail contenant un lien pour choisir un nouveau mot de passe.
  reinitialiserMotDePasse(email) {
    return suiviAuth.sendPasswordResetEmail(email);
  },

  // Enregistre le résultat d'un quiz.
  // Renvoie "compte" ou "appareil" pour pouvoir dire à l'élève où c'est rangé.
  async enregistrerResultat(moduleId, score, total) {
    if (Suivi.utilisateur()) {
      const fiche = suiviDossierProgression().doc(moduleId);
      const instantane = await fiche.get();
      const ancienne = instantane.exists ? instantane.data() : null;
      await fiche.set(suiviNouvelleFiche(ancienne, score, total));
      return "compte";
    }
    const progression = suiviLireLocal();
    progression[moduleId] = suiviNouvelleFiche(progression[moduleId], score, total);
    localStorage.setItem(SUIVI_CLE_LOCALE, JSON.stringify(progression));
    return "appareil";
  },

  // Renvoie toute la progression sous la forme :
  //   { "identifiant-du-module": { meilleurScore, total, ... }, ... }
  async lireProgression() {
    if (Suivi.utilisateur()) {
      const progression = {};
      const instantane = await suiviDossierProgression().get();
      instantane.forEach(function (fiche) {
        progression[fiche.id] = fiche.data();
      });
      return progression;
    }
    return suiviLireLocal();
  },

  // Traduit en français les codes d'erreur renvoyés par Firebase.
  messageErreur(erreur) {
    const messages = {
      "auth/invalid-email": "Cette adresse e-mail n'est pas valide.",
      "auth/missing-password": "Saisis ton mot de passe.",
      "auth/weak-password": "Mot de passe trop court : 6 caractères minimum.",
      "auth/email-already-in-use": "Un compte existe déjà avec cette adresse. Connecte-toi.",
      "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
      "auth/wrong-password": "Adresse e-mail ou mot de passe incorrect.",
      "auth/user-not-found": "Adresse e-mail ou mot de passe incorrect.",
      "auth/too-many-requests": "Trop d'essais. Patiente quelques minutes avant de réessayer.",
      "auth/network-request-failed": "Pas de connexion internet. Vérifie ton réseau.",
      "auth/operation-not-allowed": "La connexion par e-mail n'est pas activée dans la console Firebase.",
      "permission-denied": "Accès refusé par la base de données : vérifie que les règles Firestore sont publiées.",
      "unavailable": "Base de données injoignable. Vérifie ta connexion internet."
    };
    return messages[erreur.code] || "Une erreur est survenue (" + (erreur.code || erreur.message) + ").";
  }
};
