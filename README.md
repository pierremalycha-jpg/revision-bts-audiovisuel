# Révision BTS Audiovisuel — TES et TMO

Plateforme de révision pour les étudiants du BTS Audiovisuel du Lycée Henri Martin, couvrant les épreuves :

- **TES** — Techniques des équipements et des supports (cours théoriques) ;
- **TMO** — Techniques de mise en œuvre (cours pratiques, sur plateau et en régie).

Chaque notion a sa propre **application de révision**. La page d'accueil présente les applications sous forme d'**icônes**, rangées en trois catégories :

1. **Apport de connaissances** — comprendre les notions techniques, avec trois sous-catégories : *Caméra, éclairage, filtres*, *Le numérique* et *Son* ;
2. **Outils** — préparer ses projets (plans de feu, schémas de câblage, synoptiques de régie, workflows) : à venir ;
3. **Applications pratiques** — simulateurs : le **simulateur caméra** est en ligne ; régie et car régie sont à venir.

Les applications d'apport de connaissances suivent le modèle de l'application **Photométrie**, qui sert de référence : un parcours de modules, et dans chaque module quatre étapes — **Comprendre**, **Manipuler**, **Retenir**, **S'évaluer** (évaluation sur 20, 12/20 pour ouvrir le module suivant).

Un module peut commencer par un **film** : une vidéo de deux à trois minutes, en musique et sans voix, qui résume l'essentiel du module avec des animations (premier film : module 1 de « Compression vidéo »). Les sources des films sont dans `films/` ; voir [films/README.md](films/README.md).

La progression des étudiants est enregistrée avec Firebase. Le site est hébergé gratuitement avec GitHub Pages.

**Site en ligne :** <https://pierremalycha-jpg.github.io/revision-bts-audiovisuel/>

> **Première installation ?** Suis [GUIDE-INSTALLATION.md](GUIDE-INSTALLATION.md).
> **Créer une application ?** Suis [docs/CHARTE-APPLICATIONS.md](docs/CHARTE-APPLICATIONS.md).

## Les applications

> **Prévisualisation : tous les modules sont débloqués.** Pour revenir au parcours normal (12/20 pour ouvrir le module suivant), passe `TOUT_DEBLOQUER` à `false` dans `js/catalogue.js` **et** dans `modules/tes-photometrie/index.html`.

| Application | Rangement | Épreuve | Modules | Dossier |
|---|---|---|---|---|
| Photométrie — *La lumière, mesurée.* | Connaissances › Caméra, éclairage, filtres | TES | 10 + bac à sable | `modules/tes-photometrie/` |
| Signal vidéo numérique — *Du signal aux bits.* | Connaissances › Le numérique | TES | 3 | `modules/tes-signal-video-numerique/` |
| Capteurs d’image — *De la lumière aux électrons.* | Connaissances › Caméra, éclairage, filtres | TES | 6 | `modules/tes-capteurs/` |
| Éclairage — *LED, gélatines et ombres.* | Connaissances › Caméra, éclairage, filtres | TES | 3 | `modules/tes-eclairage/` |
| Compression vidéo — *Moins de bits, même image.* | Connaissances › Le numérique | TES | 6 | `modules/tes-compression-video/` |
| Microphones — *De la vibration à la tension.* | Connaissances › Son | TES | 9 | `modules/tes-microphones/` |
| Simulateur caméra — *Deux caméras, deux objectifs.* | Applications pratiques | TMO | accès libre, sans note | `modules/tmo-simulateur-camera/` |

## Choix techniques

| Choix | Pourquoi |
|---|---|
| HTML, CSS et JavaScript simples, sans outil de compilation | Ce que tu écris est exactement ce que le navigateur lit. Rien à installer, et GitHub Pages publie les fichiers tels quels. |
| Scripts classiques (`<script src="...">`) plutôt que modules | Le site s'ouvre aussi par simple double-clic sur `index.html`, pratique pour tester sans serveur. |
| Un catalogue central (`js/catalogue.js`) | Ajouter une application = ajouter un bloc dans un seul fichier. Les grilles d'icônes, l'accueil et le tableau de bord se mettent à jour seuls. |
| Un **kit application** (`js/application.js` + `css/application.css`) | Une application ne décrit que son contenu (`contenu.js`) et ses labos (`labos.js`). Menu, accueil, notions, évaluation, déblocage et lexique sont écrits une seule fois, sur le modèle de la photométrie. |
| La photométrie reste un fichier unique | Elle fonctionne aussi hors ligne, a son propre enregistrement (fichier, PDF, Firebase) et son tableau de bord enseignant. La plateforme lit sa progression dans le navigateur pour l'afficher sous son icône. |
| Firebase isolé dans `js/suivi.js` | Un seul fichier parle à Firebase. Sans configuration, le site passe en « mode local » et reste utilisable. |
| Chemins relatifs partout | GitHub Pages publie le site dans un sous-dossier (`/revision-bts-audiovisuel/`) : les liens relatifs fonctionnent aussi bien en ligne qu'en local. |

## Arborescence

```
revision-bts-audiovisuel/
├── index.html                  Accueil : logo et grille d'icônes de toutes les applications
├── tiee.html, image.html       Anciennes pages d'option : redirigent vers l'accueil
├── images/                     Logo du BTS (versions thème clair et thème sombre)
├── connexion.html              Connexion et création de compte
├── tableau-de-bord.html        Progression de l'étudiant, application par application
├── firestore.rules             Règles de sécurité à coller dans la console Firebase
├── docs/
│   └── CHARTE-APPLICATIONS.md  La référence pour créer une application
├── css/
│   ├── style.css               Identité visuelle de toute la plateforme
│   └── application.css         Mise en page des applications (kit)
├── js/
│   ├── theme.js                Thème clair / sombre (partagé avec la photométrie)
│   ├── transition.js           Animation « on entre dans l'application » (chargé dans le <head>)
│   ├── firebase-config.js      Les coordonnées de TON projet Firebase (à remplir)
│   ├── suivi.js                Comptes + enregistrement de la progression
│   ├── commun.js               En-tête, pied de page, outils partagés
│   ├── catalogue.js            La liste des applications, leurs icônes
│   ├── applications.js         Icônes et lecture de la progression
│   ├── application.js          Le moteur du kit application
│   ├── page-accueil.js         Construit les catégories (sous-catégories en menus déroulants) de index.html
│   ├── page-connexion.js       Fait fonctionner connexion.html
│   └── page-tableau-de-bord.js Fait fonctionner tableau-de-bord.html
├── films/                      Sources des films des modules (voir films/README.md)
│   └── compression-video-module-1/   Partition, musique et scènes du premier film
└── modules/
    ├── modele/                 MODÈLE à dupliquer pour créer une application
    │   ├── index.html          Les labos (un <template> par module)
    │   ├── contenu.js          Notions, essentiel, questions (format commenté)
    │   └── labos.js            Le code des labos
    ├── tes-photometrie/        Application de référence (fichier unique)
    │   └── index.html
    ├── tes-signal-video-numerique/   Application construite avec le kit
    │   ├── index.html
    │   ├── contenu.js
    │   └── labos.js
    ├── tes-compression-video/        Application avec un film de module
    │   ├── index.html, contenu.js, labos.js
    │   └── films/                    Les vidéos terminées (module-1.mp4 et son affiche)
    ├── tes-microphones/              Sous-catégorie « Son » : neuf modules sur les microphones
    │   └── index.html, contenu.js, labos.js
    └── tmo-simulateur-camera/        Application pratique : le simulateur caméra (voir plus bas)
        ├── index.html, simulateur.css  La page et sa mise en page
        ├── optique.js                Les deux configurations et les lois physiques
        ├── decor.js                  Le plateau TV, dessiné calque par calque (2,5D)
        ├── rendu.js                  L'image de la caméra (WebGL)
        ├── plateau.js, anatomie.js, signal.js   Maquette du plateau, coupe des objectifs, oscilloscope
        ├── textes.js                 Les explications et les expériences guidées
        └── simulateur.js             L'état, les réglages, le lien entre tout le reste
```

## Le simulateur caméra

Première **application pratique** : on y manipule deux configurations de prise de vue et on voit l'image réagir.

| | Caméra de plateau | Boîtier cinéma |
|---|---|---|
| Modèle de référence | type Sony HXC-FB80, avec sa CCU, son RCP et le câble fibre | type Sony FX3 |
| Capteur | trois CMOS 2/3″ derrière un prisme | un CMOS plein format à matrice de Bayer |
| Objectif | zoom broadcast 8,5–170 mm f/1,8, **parfocal**, doubleur ×2, tirage optique | zoom photo 24–70 mm f/2,8, **varifocal**, autofocus |

Ce que l'on règle : les bagues (zoom, mise au point, diaphragme), la lumière du plateau, le filtre ND, l'obturation, le gain ou les ISO, la balance des blancs, puis la courbe de la caméra (gamma, master black, **black gamma** — black stretch et black press —, **knee**, saturation, détail). Ce que l'on voit : l'image de la caméra, avec l'exposition, la **profondeur de champ** et les **défauts optiques** (aberrations chromatiques latérale et longitudinale, vignettage, diffraction, distorsion, mollesse à pleine ouverture) qui varient avec l'objectif, la focale et l'ouverture ; la maquette du plateau (angle de champ, plan net, zone nette) ; la coupe de l'objectif, dont les lentilles bougent avec les bagues ; l'oscilloscope et la courbe de transfert. Douze **expériences guidées** proposent un parcours (bouton en haut à droite).

À savoir pour le faire évoluer :

- **Aucune note, aucun module** : dans le catalogue, l'application a `modules: 0` et `suivi: "aucun"`. Elle n'apparaît donc pas dans « Ma progression ».
- **Le décor est en 2,5D** : des dessins plats (les « calques » de `decor.js`), posés à leur vraie distance. Pour ajouter un élément, écris sa fonction de dessin (en mètres) et ajoute une ligne à la liste `calques`.
- **Les valeurs physiques** (sensibilité, bruit, force des défauts de chaque objectif) sont regroupées en tête de `optique.js`, dans `CONFIGS`. Ce sont des ordres de grandeur réalistes, pas des mesures d'un modèle précis.
- **Les textes** (une fiche par réglage, les expériences) sont tous dans `textes.js`.
- **Les défauts sont accentués ×3 par défaut**, pour être visibles sur un vidéoprojecteur ; l'onglet « Défauts » permet de revenir à leur force réelle ou de les corriger.
- **L'image est calculée par la carte graphique** (WebGL 2). Sur un appareil lent, le simulateur allège tout seul la définition ; ajoute `?hd` à l'adresse pour l'en empêcher. Sans WebGL 2, l'image est remplacée par un message et le reste de la page fonctionne.

## Tester le site sur ton ordinateur

Double-clique sur `index.html` : le site s'ouvre dans ton navigateur. Tant que Firebase n'est pas configuré, la mention **Mode local** s'affiche en haut à droite ; les évaluations fonctionnent et la progression est gardée dans le navigateur.

Pour parcourir une application sans passer les évaluations, ajoute `?enseignant` à son adresse (par exemple `modules/tes-signal-video-numerique/index.html?enseignant`) : tous les modules s'ouvrent.

Pour modifier les fichiers, un éditeur de code gratuit comme [Visual Studio Code](https://code.visualstudio.com/) est bien plus confortable que le Bloc-notes (couleurs, détection des erreurs).

## Ajouter une application

Résumé (le détail est dans [docs/CHARTE-APPLICATIONS.md](docs/CHARTE-APPLICATIONS.md)) :

1. **Duplique** `modules/modele/` et renomme la copie `epreuve-nom-de-la-notion` (exemple : `tmo-reglage-camera`).
2. **Écris le contenu** dans `contenu.js` : notions, essentiel et questions de chaque module.
3. **Écris les labos** : HTML dans `index.html`, code dans `labos.js`.
4. **Déclare l'application** dans `js/catalogue.js`, avec sa `categorie` (et sa `sousCategorie`) : son icône apparaît dans la bonne rubrique de l'accueil. Les catégories, sous-catégories et applications « à venir » se règlent dans `CATEGORIES`, dans le même fichier.
5. **Teste** avec `?enseignant`, en clair, en sombre et sur téléphone, puis envoie les fichiers sur GitHub.

**Important :** ne change plus l'`id` d'une application une fois qu'elle est en ligne. Les notes sont enregistrées sous ce nom.

## Contenu pédagogique : à valider

Les applications « Signal vidéo numérique », « Compression vidéo » et « Microphones » ont été rédigées à partir de connaissances techniques générales, **pas à partir du référentiel du BTS**. Avant de les proposer aux étudiants, relis les notions et les questions, et ajuste le vocabulaire, le niveau et les notions à ce que le référentiel exige.

Même remarque pour le **simulateur caméra** : ses explications (`modules/tmo-simulateur-camera/textes.js`) sont à relire, et ses chiffres sont des ordres de grandeur. Seules quelques données viennent des fiches constructeur (trois capteurs 2/3″, F13 à 2 000 lux, filtres ND 1/4, 1/16 et 1/64 et liaison fibre pour la caméra de plateau ; plages du knee et du black gamma du profil d'image pour le boîtier).

## Données enregistrées

| Où | Quoi |
|---|---|
| Firebase Authentication | Adresse e-mail et mot de passe (chiffré, illisible même pour toi) de chaque étudiant |
| Firestore `utilisateurs/{id}` | Prénom, option, date de création du compte |
| Firestore `utilisateurs/{id}/progression/{application}.{module}` | Dernière note, meilleure note (sur 20), nombre d'essais, date |
| Navigateur de l'élève (`photometrie-progression-v1`) | Progression de la photométrie, gérée par l'application elle-même (et son propre projet Firebase) |

Chaque étudiant ne peut lire et modifier que ses propres données (voir `firestore.rules`).

## Suite possible

- Les applications suivantes, à partir du référentiel, avec le kit.
- Un espace enseignant pour voir la progression de toute la classe sur la plateforme (la photométrie a déjà le sien).
- Faire remonter les notes de la photométrie dans le compte Firebase de la plateforme.
