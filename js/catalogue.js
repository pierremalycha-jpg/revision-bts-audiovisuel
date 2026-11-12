/* ==========================================================================
   catalogue.js — la liste de toutes les applications de révision
   --------------------------------------------------------------------------
   Pourquoi une liste centrale ? Les pages TIEE et IMAGE (grilles d'icônes),
   l'accueil et le tableau de bord se construisent automatiquement à partir
   d'elle. Pour publier une nouvelle application, tu ajoutes UN bloc ici :
   aucune autre page à modifier.

   Chaque application est décrite par :
     id          identifiant unique, sans espace ni accent. Il sert de nom dans
                 la base de données : NE LE CHANGE PLUS une fois l'application
                 en ligne, sinon les notes déjà enregistrées seraient perdues.
     options     les options concernées : ["tiee"], ["image"] ou ["tiee", "image"]
     epreuve     "TES" ou "TMO"
     titre       le nom affiché sous l'icône (court : un ou deux mots)
     accroche    une ligne sous le nom
     description une phrase de présentation (tableau de bord, infobulle)
     icone       le pictogramme : une clé de ICONES ci-dessous
     teinte      les couleurs du dégradé de l'icône, de haut en bas
     modules     le nombre de modules (chacun se termine par une évaluation /20)
     suivi       où lire la progression :
                   "kit"         application construite avec le kit (cas normal) ;
                   "photometrie" application de photométrie (sa propre sauvegarde).
     page        l'adresse de l'application, depuis la racine du site.
                 On écrit « index.html » en toutes lettres pour que le lien
                 fonctionne aussi quand on ouvre le site par double-clic.
     disponible  true = en ligne ; false = icône grisée « Bientôt »
   ========================================================================== */

const CATALOGUE = [
  {
    id: "tes-photometrie",
    options: ["image"],
    epreuve: "TES",
    titre: "Photométrie",
    accroche: "La lumière, mesurée.",
    description: "Lumen, lux, diaph, carré inverse, spectre, projecteurs, plateau et température de couleur : dix modules et un bac à sable.",
    icone: "lumiere",
    teinte: ["#ffb340", "#ff6a3d", "#ff2d55"],
    modules: 10,
    suivi: "photometrie",
    page: "modules/tes-photometrie/index.html",
    disponible: true
  },
  {
    id: "tes-signal-video-numerique",
    options: ["tiee"],
    epreuve: "TES",
    titre: "Signal vidéo numérique",
    accroche: "Du signal aux bits.",
    description: "Échantillonnage, quantification, structures 4:4:4, 4:2:2, 4:2:0 et calcul du débit non compressé.",
    icone: "signal",
    teinte: ["#5ac8fa", "#007aff", "#5856d6"],
    modules: 3,
    suivi: "kit",
    page: "modules/tes-signal-video-numerique/index.html",
    disponible: true
  }

  // Pour ajouter une application, copie le bloc ci-dessous APRÈS une virgule,
  // retire les « // » et adapte les valeurs :
  //
  // ,{
  //   id: "tmo-nom-de-la-notion",
  //   options: ["image"],
  //   epreuve: "TMO",
  //   titre: "Nom court",
  //   accroche: "Une ligne d'accroche.",
  //   description: "Une phrase de présentation.",
  //   icone: "camera",
  //   teinte: ["#34c759", "#00c7be"],
  //   modules: 3,
  //   suivi: "kit",
  //   page: "modules/tmo-nom-de-la-notion/index.html",
  //   disponible: true
  // }
];

// Présentation des épreuves, affichée sur les pages d'option.
const EPREUVES = {
  TES: {
    sigle: "TES",
    nom: "Techniques des équipements et des supports",
    description: "Les cours théoriques."
  },
  TMO: {
    sigle: "TMO",
    nom: "Techniques de mise en œuvre",
    description: "Les cours pratiques, sur plateau et en régie."
  }
};

// Présentation des options (pages tiee.html et image.html, accueil).
const OPTIONS = {
  tiee: {
    nom: "TIEE",
    nomComplet: "Techniques d'ingénierie et exploitation des équipements",
    accroche: "Du signal à la régie.",
    teinte: ["#007aff", "#00c7be", "#34c759"]
  },
  image: {
    nom: "IMAGE",
    nomComplet: "Métiers de l'image",
    accroche: "La lumière, la caméra, l'image.",
    teinte: ["#ff9500", "#ff2d55", "#af52de"]
  }
};

/* Les pictogrammes des icônes d'application. Chaque valeur est le contenu
   d'un SVG de 24 × 24, dessiné en blanc par-dessus le dégradé.
   Pour en ajouter un : un trait de 1,8 d'épaisseur, des formes simples,
   lisibles à 40 pixels. */
const ICONES = {
  // Une source de lumière et ses rayons (photométrie, éclairage)
  lumiere: '<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  // Une sinusoïde et ses échantillons (signal numérique)
  signal: '<path d="M2.5 12c1.6-5.6 3.2-7 4.8-4.2S9.9 17.4 12 17.4s3.2-3 4.8-6.6 3.2-4.2 4.7 1.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><g fill="currentColor"><circle cx="4.3" cy="7.9" r="1.4"/><circle cx="8.2" cy="9.4" r="1.4"/><circle cx="12" cy="17.4" r="1.4"/><circle cx="15.8" cy="12.9" r="1.4"/><circle cx="19.7" cy="8.3" r="1.4"/></g>',
  // Une caméra
  camera: '<rect x="2.5" y="7" width="13" height="10" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 10.4l5.2-3v9.2l-5.2-3z" fill="currentColor"/><circle cx="7" cy="10.4" r="1.2" fill="currentColor"/>',
  // Un objectif (diaphragme)
  objectif: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.4l3.3 7.2M20.4 10.2l-7.8 1.1M16.6 19.3l-4.4-6.4M6.9 18.9l3.3-7.2M3.6 9.8l7.8 2.1M8.2 4.3l4.6 6.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  // Le triangle des couleurs (colorimétrie)
  couleur: '<circle cx="9" cy="9.5" r="5.4" fill="currentColor" opacity=".9"/><circle cx="15" cy="9.5" r="5.4" fill="currentColor" opacity=".6"/><circle cx="12" cy="14.8" r="5.4" fill="currentColor" opacity=".4"/>',
  // Un écran d'oscilloscope (mesure du signal)
  oscilloscope: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 14.5h2.4l1.6-5 2.2 7.4 2-9.4 1.8 7h3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  // Une onde sonore (audio)
  son: '<path d="M4 10v4M7.5 7.5v9M11 4.5v15M14.5 8v8M18 10.5v3M21 11.3v1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  // Un câble et ses connecteurs (liaisons, régie)
  liaison: '<rect x="2.5" y="9" width="5" height="6" rx="1.4" fill="currentColor"/><rect x="16.5" y="9" width="5" height="6" rx="1.4" fill="currentColor"/><path d="M7.5 12c3-4 6-4 9 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  // Une pellicule (montage, formats)
  montage: '<rect x="3" y="4" width="18" height="16" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 4v16M17 4v16M3 8.5h4M3 15.5h4M17 8.5h4M17 15.5h4" stroke="currentColor" stroke-width="1.6"/>',
  // Le signe « plus » (emplacement de la prochaine application)
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};
