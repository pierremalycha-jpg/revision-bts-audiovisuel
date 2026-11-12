# Révision BTS Audiovisuel — TES et TMO

Plateforme de révision pour les étudiants des options **TIEE** et **IMAGE**, couvrant les épreuves :

- **TES** — Techniques des équipements et des supports (cours théoriques) ;
- **TMO** — Techniques de mise en œuvre (cours pratiques, sur plateau et en régie).

Chaque notion a sa propre **application de révision**. Les pages des options présentent les applications sous forme d'**icônes**. Toutes suivent le modèle de l'application **Photométrie**, qui sert de référence : un parcours de modules, et dans chaque module quatre étapes — **Comprendre**, **Manipuler**, **Retenir**, **S'évaluer** (évaluation sur 20, 12/20 pour ouvrir le module suivant).

La progression des étudiants est enregistrée avec Firebase. Le site est hébergé gratuitement avec GitHub Pages.

**Site en ligne :** <https://pierremalycha-jpg.github.io/revision-bts-audiovisuel/>

> **Première installation ?** Suis [GUIDE-INSTALLATION.md](GUIDE-INSTALLATION.md).
> **Créer une application ?** Suis [docs/CHARTE-APPLICATIONS.md](docs/CHARTE-APPLICATIONS.md).

## Les applications

| Application | Option | Épreuve | Modules | Dossier |
|---|---|---|---|---|
| Photométrie — *La lumière, mesurée.* | IMAGE | TES | 10 + bac à sable | `modules/tes-photometrie/` |
| Signal vidéo numérique — *Du signal aux bits.* | TIEE | TES | 3 | `modules/tes-signal-video-numerique/` |

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
├── index.html                  Accueil : choix de l'option
├── tiee.html, image.html       Pages d'option : la grille d'icônes des applications
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
│   ├── firebase-config.js      Les coordonnées de TON projet Firebase (à remplir)
│   ├── suivi.js                Comptes + enregistrement de la progression
│   ├── commun.js               En-tête, pied de page, outils partagés
│   ├── catalogue.js            La liste des applications, leurs icônes
│   ├── applications.js         Icônes et lecture de la progression
│   ├── application.js          Le moteur du kit application
│   ├── page-accueil.js         Fait fonctionner index.html
│   ├── page-option.js          Construit tiee.html et image.html
│   ├── page-connexion.js       Fait fonctionner connexion.html
│   └── page-tableau-de-bord.js Fait fonctionner tableau-de-bord.html
└── modules/
    ├── modele/                 MODÈLE à dupliquer pour créer une application
    │   ├── index.html          Les labos (un <template> par module)
    │   ├── contenu.js          Notions, essentiel, questions (format commenté)
    │   └── labos.js            Le code des labos
    ├── tes-photometrie/        Application de référence (fichier unique)
    │   └── index.html
    └── tes-signal-video-numerique/   Application construite avec le kit
        ├── index.html
        ├── contenu.js
        └── labos.js
```

## Tester le site sur ton ordinateur

Double-clique sur `index.html` : le site s'ouvre dans ton navigateur. Tant que Firebase n'est pas configuré, la mention **Mode local** s'affiche en haut à droite ; les évaluations fonctionnent et la progression est gardée dans le navigateur.

Pour parcourir une application sans passer les évaluations, ajoute `?enseignant` à son adresse (par exemple `modules/tes-signal-video-numerique/index.html?enseignant`) : tous les modules s'ouvrent.

Pour modifier les fichiers, un éditeur de code gratuit comme [Visual Studio Code](https://code.visualstudio.com/) est bien plus confortable que le Bloc-notes (couleurs, détection des erreurs).

## Ajouter une application

Résumé (le détail est dans [docs/CHARTE-APPLICATIONS.md](docs/CHARTE-APPLICATIONS.md)) :

1. **Duplique** `modules/modele/` et renomme la copie `epreuve-nom-de-la-notion` (exemple : `tmo-reglage-camera`).
2. **Écris le contenu** dans `contenu.js` : notions, essentiel et questions de chaque module.
3. **Écris les labos** : HTML dans `index.html`, code dans `labos.js`.
4. **Déclare l'application** dans `js/catalogue.js` : son icône apparaît sur la page de son option.
5. **Teste** avec `?enseignant`, en clair, en sombre et sur téléphone, puis envoie les fichiers sur GitHub.

**Important :** ne change plus l'`id` d'une application une fois qu'elle est en ligne. Les notes sont enregistrées sous ce nom.

## Contenu pédagogique : à valider

L'application « Signal vidéo numérique » a été rédigée à partir de connaissances techniques générales, **pas à partir du référentiel du BTS**. Avant de la proposer aux étudiants, relis les notions et les questions, et ajuste le vocabulaire, le niveau et les notions à ce que le référentiel exige.

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
