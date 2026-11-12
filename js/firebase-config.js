/* ==========================================================================
   firebase-config.js — les « coordonnées » de TON projet Firebase
   --------------------------------------------------------------------------
   À FAIRE : remplace les valeurs "A_REMPLACER" par celles de ton projet.
   Où les trouver : console Firebase > roue dentée > Paramètres du projet >
   onglet Général > section « Vos applications » > « Configuration du SDK ».
   (Le guide GUIDE-INSTALLATION.md détaille chaque clic.)

   Tant que apiKey vaut "A_REMPLACER", le site fonctionne en « mode local » :
   pas de comptes, la progression est gardée dans le navigateur de l'élève.
   Tu peux donc tester tout le site AVANT de créer ton projet Firebase.

   EST-CE GRAVE QUE CES VALEURS SOIENT PUBLIQUES SUR GITHUB ? Non.
   Elles ne sont pas des mots de passe : elles indiquent seulement au
   navigateur à quel projet Firebase s'adresser, et tout visiteur du site
   peut de toute façon les lire. Ce qui protège réellement les données :
     1. les règles de sécurité Firestore (fichier firestore.rules) ;
     2. la liste des « domaines autorisés » dans Firebase Authentication.
   Ce qu'il ne faut JAMAIS mettre dans le dépôt : un fichier de « compte de
   service » (clé privée .json téléchargée depuis la console), un mot de
   passe, ou la clé d'un autre service payant.
   ========================================================================== */

const FIREBASE_CONFIG = {
  apiKey: "A_REMPLACER",
  authDomain: "A_REMPLACER.firebaseapp.com",
  projectId: "A_REMPLACER",
  storageBucket: "A_REMPLACER.firebasestorage.app",
  messagingSenderId: "A_REMPLACER",
  appId: "A_REMPLACER"
};
