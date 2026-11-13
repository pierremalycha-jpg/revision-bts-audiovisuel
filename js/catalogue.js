/* ==========================================================================
   catalogue.js — la liste de toutes les applications de révision
   --------------------------------------------------------------------------
   Pourquoi une liste centrale ? L'accueil (la grille d'icônes de toutes les
   applications) et le tableau de bord se construisent automatiquement à
   partir d'elle. Pour publier une nouvelle application, tu ajoutes UN bloc ici :
   aucune autre page à modifier.

   Chaque application est décrite par :
     id          identifiant unique, sans espace ni accent. Il sert de nom dans
                 la base de données : NE LE CHANGE PLUS une fois l'application
                 en ligne, sinon les notes déjà enregistrées seraient perdues.
     categorie   la grande famille de l'application (voir CATEGORIES plus bas) :
                   "connaissances" apport de connaissances (comprendre une notion) ;
                   "outils"        outil pour préparer un projet (plan de feu…) ;
                   "pratique"      application pratique, simulateur (régie…).
     sousCategorie  (catégorie « connaissances » seulement) le rayon où ranger
                 l'application : "camera-eclairage", "numerique" ou "son".
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

/* TOUT DÉBLOQUER — interrupteur de prévisualisation.
   true  : tous les modules de toutes les applications sont ouverts, sans
           attendre 12/20 (pratique pour tout parcourir et vérifier le contenu).
   false : parcours normal, chaque module s'ouvre après 12/20 au précédent.
   Pense à le remettre à false avant de donner le lien aux étudiants.
   (L'application Photométrie, autonome, a le même interrupteur en tête de son
   script : TOUT_DEBLOQUER, dans modules/tes-photometrie/index.html.) */
const TOUT_DEBLOQUER = true;

const CATALOGUE = [
  {
    id: "tes-photometrie",
    categorie: "connaissances",
    sousCategorie: "camera-eclairage",
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
    categorie: "connaissances",
    sousCategorie: "numerique",
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
  },
  {
    id: "tes-capteurs",
    categorie: "connaissances",
    sousCategorie: "camera-eclairage",
    epreuve: "TES",
    titre: "Capteurs d’image",
    accroche: "De la lumière aux électrons.",
    description: "Fonctionnement d’un capteur, photosites, bruit et plage dynamique, matrice de Bayer et tri-capteur, rolling shutter, capteurs empilés et semi-empilés, taille de capteur.",
    icone: "capteur",
    teinte: ["#30d158", "#00c7be", "#0a84ff"],
    modules: 6,
    suivi: "kit",
    page: "modules/tes-capteurs/index.html",
    disponible: true
  },
  {
    id: "tes-eclairage",
    categorie: "connaissances",
    sousCategorie: "camera-eclairage",
    epreuve: "TES",
    titre: "Éclairage",
    accroche: "LED, gélatines et ombres.",
    description: "Technologies LED (bicolore, RVB, RVBW, anatomie, gradation), gélatines CTO, CTB, Plus et Minus Green et courbe de Planck, ombres et taille de la source.",
    icone: "projecteur",
    teinte: ["#ffb340", "#bf5af2", "#0a84ff"],
    modules: 3,
    suivi: "kit",
    page: "modules/tes-eclairage/index.html",
    disponible: true
  },
  {
    id: "tes-compression-video",
    categorie: "connaissances",
    sousCategorie: "numerique",
    epreuve: "TES",
    titre: "Compression vidéo",
    accroche: "Moins de bits, même image.",
    description: "Débit et taux de compression, compression JPEG (DCT, quantification), compression MPEG (images I, P, B, GOP), codage entropique et CABAC, CBR et VBR, profils et niveaux, codecs et conteneurs.",
    icone: "compression",
    teinte: ["#64d2ff", "#5e5ce6", "#bf5af2"],
    modules: 6,
    suivi: "kit",
    page: "modules/tes-compression-video/index.html",
    disponible: true
  },
  {
    id: "tes-microphones",
    categorie: "connaissances",
    sousCategorie: "son",
    epreuve: "TES",
    titre: "Microphones",
    accroche: "De la vibration à la tension.",
    description: "Pression acoustique et dB SPL, anatomie d’un micro et chaîne jusqu’au haut-parleur, technologies de micro (dynamique, ruban, électrostatique, électret), capsules et effet de proximité, directivité, sensibilité et fiche technique, types de micros, liaisons symétriques et alimentation fantôme, couples stéréophoniques.",
    icone: "micro",
    teinte: ["#ff375f", "#bf5af2", "#5e5ce6"],
    modules: 9,
    suivi: "kit",
    page: "modules/tes-microphones/index.html",
    disponible: true
  }

  // Pour ajouter une application, copie le bloc ci-dessous APRÈS une virgule,
  // retire les « // » et adapte les valeurs :
  //
  // ,{
  //   id: "tmo-nom-de-la-notion",
  //   categorie: "connaissances",
  //   sousCategorie: "camera-eclairage",
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

/* LES CATÉGORIES — l'organisation de l'accueil, dans cet ordre.
   Chaque catégorie a :
     id             le nom utilisé par le champ « categorie » des applications
                    (et l'ancre de l'accueil : index.html#outils…)
     numero, nom, accroche, description   ce qu'affiche l'accueil
     icone, teinte  le pictogramme (clé de ICONES) et son dégradé
     sousCategories (facultatif) des rayons pour ne pas tout mélanger ;
                    une application y est rangée par son champ « sousCategorie ».
     aVenir         (facultatif) les applications prévues, montrées grisées
                    « Bientôt disponible ». Quand l'une d'elles est publiée
                    dans CATALOGUE, retire-la de cette liste. */
const CATEGORIES = [
  {
    id: "connaissances",
    numero: 1,
    nom: "Apport de connaissances",
    accroche: "Comprendre les notions techniques.",
    description: "Des notions expliquées simplement, des simulations à manipuler, l'essentiel à retenir et une évaluation sur 20 à la fin de chaque module.",
    icone: "livre",
    teinte: ["#5ac8fa", "#007aff", "#5856d6"],
    sousCategories: [
      {
        id: "camera-eclairage",
        nom: "Caméra, éclairage, filtres",
        description: "La lumière, sa mesure, les projecteurs, les filtres et le capteur qui la reçoit."
      },
      {
        id: "numerique",
        nom: "Le numérique",
        description: "Le signal vidéo numérique, son débit et sa compression."
      },
      {
        id: "son",
        nom: "Son",
        description: "Le son, les microphones, leurs liaisons et la prise de son stéréophonique."
      }
    ]
  },
  {
    id: "outils",
    numero: 2,
    nom: "Outils",
    accroche: "Préparer ses projets.",
    description: "Des applications pour préparer un tournage ou une émission : plans de feu, schémas de câblage, synoptiques de régie, workflows.",
    icone: "outil",
    teinte: ["#ffb340", "#ff9500", "#ff6a3d"],
    aVenir: [
      { titre: "Plan de feu", accroche: "Placer projecteurs et réflecteurs.", icone: "projecteur" },
      { titre: "Schéma de câblage", accroche: "Relier les équipements.", icone: "liaison" },
      { titre: "Synoptique de régie", accroche: "Le chemin du signal en régie.", icone: "synoptique" },
      { titre: "Workflow", accroche: "Du tournage à la diffusion.", icone: "workflow" }
    ]
  },
  {
    id: "pratique",
    numero: 3,
    nom: "Applications pratiques",
    accroche: "S'entraîner en situation.",
    description: "Des simulateurs pour s'exercer comme sur le terrain : une régie, une caméra, un car régie.",
    icone: "simulateur",
    teinte: ["#30d158", "#00c7be", "#0a84ff"],
    aVenir: [
      { titre: "Régie", accroche: "Mélangeur, sources et grille.", icone: "regie" },
      { titre: "Caméra", accroche: "Régler exposition, balance et mise au point.", icone: "camera" },
      { titre: "Car régie", accroche: "Une captation en extérieur.", icone: "car" }
    ]
  }
];

// Présentation des épreuves (TES, TMO).
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
  // Une puce de capteur : quatre photosites (motif de Bayer) et ses broches
  capteur: '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7.4" y="7.4" width="4.2" height="4.2" rx=".8" fill="currentColor" opacity=".55"/><rect x="12.4" y="7.4" width="4.2" height="4.2" rx=".8" fill="currentColor"/><rect x="7.4" y="12.4" width="4.2" height="4.2" rx=".8" fill="currentColor"/><rect x="12.4" y="12.4" width="4.2" height="4.2" rx=".8" fill="currentColor" opacity=".55"/><path d="M9 2v2.2M15 2v2.2M9 19.8V22M15 19.8V22M2 9h2.2M2 15h2.2M19.8 9H22M19.8 15H22" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  // Un projecteur à lentille de Fresnel sur sa lyre, et son faisceau
  projecteur: '<path d="M3.5 8.2l9-3.4v12.4l-9-3.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12.5 7.2l8 -2.6M12.5 12h8.5M12.5 16.8l8 2.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" opacity=".75"/><path d="M8 15.6v4.2M5 19.8h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  // Une image découpée en blocs, serrée entre deux flèches (compression)
  compression: '<rect x="7" y="5.5" width="10" height="13" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.8v12.4M7.3 12h9.4" stroke="currentColor" stroke-width="1.3" opacity=".7"/><rect x="8.6" y="7.2" width="2.6" height="3.4" rx=".6" fill="currentColor"/><path d="M1.8 12h3.4M3.6 9.9 5.6 12l-2 2.1M22.2 12h-3.4M20.4 9.9 18.4 12l2 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  // Un microphone sur son étrier (son, microphones)
  micro: '<rect x="8.7" y="2.6" width="6.6" height="11.2" rx="3.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.9 6.4h2.6M8.9 9.4h2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".75"/><path d="M5.6 10.8a6.4 6.4 0 0 0 12.8 0M12 17.3v3.6M8.8 20.9h6.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  // Le signe « plus » (emplacement de la prochaine application)
  // Un livre ouvert (catégorie « Apport de connaissances »)
  livre: '<path d="M12 6.2C10 4.8 7.3 4.3 3.8 4.6v13.2c3.5-.3 6.2.2 8.2 1.6 2-1.4 4.7-1.9 8.2-1.6V4.6c-3.5-.3-6.2.2-8.2 1.6zM12 6.2v13.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  // Une clé plate (catégorie « Outils »)
  outil: '<path d="M14.6 3.4a5 5 0 0 0-5.4 6.6l-6 6a1.9 1.9 0 0 0 2.7 2.7l6-6a5 5 0 0 0 6.6-5.4l-3 3-2.7-.6-.6-2.7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  // Un bouton « lecture » dans un écran (catégorie « Applications pratiques »)
  simulateur: '<rect x="2.6" y="4.2" width="18.8" height="12.6" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 7.8v5.4l4.6-2.7z" fill="currentColor"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  // Des blocs reliés (synoptique)
  synoptique: '<rect x="2.6" y="4" width="6" height="5" rx="1.2" fill="currentColor"/><rect x="2.6" y="15" width="6" height="5" rx="1.2" fill="currentColor"/><rect x="15.4" y="9.5" width="6" height="5" rx="1.2" fill="currentColor"/><path d="M8.6 6.5h3.2v11H8.6M11.8 12h3.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  // Des étapes qui s'enchaînent (workflow)
  workflow: '<circle cx="5" cy="12" r="2.6" fill="currentColor"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="19" cy="12" r="2.6" fill="currentColor"/><path d="M7.8 12h1.4M14.8 12h1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  // Des curseurs de pupitre (régie)
  regie: '<path d="M5 4v16M12 4v16M19 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".6"/><rect x="2.8" y="12" width="4.4" height="3.2" rx=".9" fill="currentColor"/><rect x="9.8" y="6.6" width="4.4" height="3.2" rx=".9" fill="currentColor"/><rect x="16.8" y="14.4" width="4.4" height="3.2" rx=".9" fill="currentColor"/>',
  // Un camion (car régie)
  car: '<path d="M2.6 6.5h11.6v9.8H2.6zM14.2 9.5h4l3.2 3.4v3.4h-7.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="6.4" cy="17.6" r="1.9" fill="currentColor"/><circle cx="17.4" cy="17.6" r="1.9" fill="currentColor"/><path d="M5 9.4h6.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};
