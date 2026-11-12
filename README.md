# Révision BTS Audiovisuel — TMO et TES

Plateforme de révision pour les étudiants des options **TIEE** et **IMAGE**, couvrant les épreuves :

- **TES** — Techniques des équipements et des supports (cours théoriques) ;
- **TMO** — Techniques de mise en œuvre (cours pratiques, sur plateau et en régie).

Chaque notion a sa propre application de révision : rappel de cours, animation ou application interactive quand c'est utile, et quiz corrigé. La progression des étudiants est enregistrée avec Firebase. Le site est hébergé gratuitement avec GitHub Pages.

> **Première installation ?** Suis [GUIDE-INSTALLATION.md](GUIDE-INSTALLATION.md) : il explique pas à pas comment créer le dépôt, publier le site et brancher Firebase.

## Choix techniques

| Choix | Pourquoi |
|---|---|
| HTML, CSS et JavaScript simples, sans outil de compilation | Ce que tu écris est exactement ce que le navigateur lit. Rien à installer, et GitHub Pages publie les fichiers tels quels. |
| Scripts classiques (`<script src="...">`) plutôt que modules | Le site s'ouvre aussi par simple double-clic sur `index.html`, pratique pour tester sans serveur. |
| Un catalogue central (`js/catalogue.js`) | Ajouter un module = ajouter un bloc dans un seul fichier. Les pages d'option et le tableau de bord se mettent à jour seuls. |
| Un moteur de quiz commun (`js/quiz.js`) | Chaque module ne fournit que ses questions. |
| Firebase isolé dans `js/suivi.js` | Un seul fichier parle à Firebase. Sans configuration, le site passe en « mode local » et reste utilisable. |
| Chemins relatifs partout | GitHub Pages publie le site dans un sous-dossier (`/revision-bts-audiovisuel/`) : les liens relatifs fonctionnent aussi bien en ligne qu'en local. |

## Arborescence

```
revision-bts-audiovisuel/
├── index.html                  Page d'accueil : choix de l'option
├── tiee.html                   Page de l'option TIEE
├── image.html                  Page de l'option IMAGE
├── connexion.html              Connexion et création de compte
├── tableau-de-bord.html        Progression de l'étudiant
├── README.md                   Ce fichier
├── GUIDE-INSTALLATION.md       Créer le dépôt, publier, brancher Firebase
├── firestore.rules             Règles de sécurité à coller dans la console Firebase
├── .nojekyll                   Fichier vide : dit à GitHub Pages de publier les fichiers tels quels
├── css/
│   └── style.css               Toute l'apparence du site
├── js/
│   ├── firebase-config.js      Les coordonnées de TON projet Firebase (à remplir)
│   ├── suivi.js                Comptes + enregistrement de la progression
│   ├── commun.js               En-tête, pied de page, outils partagés
│   ├── catalogue.js            La liste de tous les modules
│   ├── quiz.js                 Le moteur de quiz
│   ├── page-option.js          Construit tiee.html et image.html
│   ├── page-connexion.js       Fait fonctionner connexion.html
│   └── page-tableau-de-bord.js Fait fonctionner tableau-de-bord.html
└── modules/
    ├── modele/                 MODÈLE à dupliquer pour créer un module
    │   ├── index.html
    │   └── questions.js
    └── tes-signal-video-numerique/    Module pilote
        ├── index.html          Cours + animation + calculateur + quiz
        ├── questions.js        Les 10 questions du quiz
        └── animation.js        L'animation et le calculateur de débit
```

## Tester le site sur ton ordinateur

Double-clique sur `index.html` : le site s'ouvre dans ton navigateur. Tant que Firebase n'est pas configuré, la mention **Mode local** s'affiche en haut à droite ; les quiz fonctionnent et la progression est gardée dans le navigateur.

Pour modifier les fichiers, un éditeur de code gratuit comme [Visual Studio Code](https://code.visualstudio.com/) est bien plus confortable que le Bloc-notes (couleurs, détection des erreurs).

## Ajouter un module

1. **Duplique** le dossier `modules/modele/` et renomme la copie : `epreuve-nom-de-la-notion`, en minuscules, avec des tirets, sans accent ni espace (exemple : `tmo-reglage-camera`).
2. **Ouvre `index.html`** du nouveau dossier et modifie tout ce qui est signalé par `À ADAPTER` : titre, option, épreuve, rappel de cours, et surtout `data-module="..."` sur la balise `<body>`.
3. **Écris les questions** dans `questions.js` (le format est expliqué en tête du fichier).
4. **Déclare le module** dans `js/catalogue.js` en copiant le bloc d'exemple. L'`id` doit être identique au `data-module` de l'étape 2.
5. **Teste** en ouvrant `index.html`, puis envoie les fichiers sur GitHub.

Pour une animation ou une application interactive, inspire-toi de `modules/tes-signal-video-numerique/animation.js`.

**Important :** ne change plus l'`id` d'un module une fois qu'il est en ligne. Les scores sont enregistrés sous ce nom.

## Contenu pédagogique : à valider

Le module pilote a été rédigé à partir de connaissances techniques générales, **pas à partir du référentiel du BTS**. Avant de le proposer aux étudiants, relis le cours et les questions, et ajuste le vocabulaire, le niveau et les notions à ce que le référentiel exige.

## Données enregistrées

| Où | Quoi |
|---|---|
| Firebase Authentication | Adresse e-mail et mot de passe (chiffré, illisible même pour toi) de chaque étudiant |
| Firestore `utilisateurs/{id}` | Prénom, option, date de création du compte |
| Firestore `utilisateurs/{id}/progression/{module}` | Dernier score, meilleur score, nombre de questions, nombre d'essais, date |

Chaque étudiant ne peut lire et modifier que ses propres données (voir `firestore.rules`).

## Suite possible

- Les modules suivants, à partir du référentiel.
- Un espace enseignant pour voir la progression de toute la classe.
- D'autres types d'exercices (schéma à légender, mise en ordre d'une procédure, calcul à saisir).
