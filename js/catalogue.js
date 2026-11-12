/* ==========================================================================
   catalogue.js — la liste de toutes les applications de révision
   --------------------------------------------------------------------------
   Pourquoi une liste centrale ? Les pages TIEE et IMAGE, ainsi que le tableau
   de bord, se construisent automatiquement à partir d'elle. Pour publier un
   nouveau module, tu ajoutes UN bloc ici : aucune autre page à modifier.

   Chaque module est décrit par :
     id          identifiant unique, sans espace ni accent. Il sert de nom dans
                 la base de données : NE LE CHANGE PLUS une fois le module en
                 ligne, sinon les scores déjà enregistrés seraient perdus.
     options     les options concernées : ["tiee"], ["image"] ou ["tiee", "image"]
     epreuve     "TES" ou "TMO"
     titre       le titre affiché sur la carte
     description une phrase de présentation
     contenu     ce que propose le module (affiché sous forme d'étiquettes)
     page        l'adresse de la page du module, depuis la racine du site.
                 On écrit « index.html » en toutes lettres pour que le lien
                 fonctionne aussi quand on ouvre le site par double-clic.
     disponible  true = en ligne ; false = carte grisée « Bientôt disponible »
   ========================================================================== */

const CATALOGUE = [
  {
    id: "tes-signal-video-numerique",
    options: ["tiee"],
    epreuve: "TES",
    titre: "Le signal vidéo numérique : 4:4:4, 4:2:2, 4:2:0",
    description: "Échantillonnage, quantification, structures de sous-échantillonnage et calcul de débit.",
    contenu: ["Cours", "Animation", "Calculateur", "Quiz"],
    page: "modules/tes-signal-video-numerique/index.html",
    disponible: true
  }

  // Pour ajouter un module, copie le bloc ci-dessous APRÈS une virgule,
  // retire les « // » et adapte les valeurs :
  //
  // ,{
  //   id: "tmo-nom-de-la-notion",
  //   options: ["image"],
  //   epreuve: "TMO",
  //   titre: "Titre du module",
  //   description: "Une phrase de présentation.",
  //   contenu: ["Cours", "Quiz"],
  //   page: "modules/tmo-nom-de-la-notion/index.html",
  //   disponible: true
  // }
];

// Présentation des épreuves, affichée sur les pages d'option.
const EPREUVES = {
  TES: {
    nom: "TES — Techniques des équipements et des supports",
    description: "Les cours théoriques."
  },
  TMO: {
    nom: "TMO — Techniques de mise en œuvre",
    description: "Les cours pratiques, sur plateau et en régie."
  }
};
