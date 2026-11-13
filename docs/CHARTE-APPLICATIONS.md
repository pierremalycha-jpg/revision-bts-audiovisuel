# Charte des applications de révision

L'application **Photométrie** (`modules/tes-photometrie/`) est la **référence** de la plateforme. Toute nouvelle application reprend sa direction artistique, sa structure, son ton, ses animations et sa façon d'évaluer. Le **kit application** (`js/application.js` et `css/application.css`) fournit tout cela d'office : une nouvelle application décrit son contenu, le kit fait le reste.

Depuis novembre 2026, toutes les applications du kit utilisent l'**interface épurée** (section 2) : un module montre **une étape à la fois**, les notions sont des **tuiles** qui ouvrent leur fiche dans une **fenêtre**, et les détails sont derrière des **petits +**. C'est le modèle à suivre pour toute nouvelle application ; le kit le fait tout seul.

Cette charte dit ce qu'il faut respecter, et pourquoi.

---

## 1. Créer une application en cinq étapes

1. **Duplique** `modules/modele/` et renomme la copie `epreuve-nom-de-la-notion` (minuscules, tirets, sans accent). Exemple : `tmo-reglage-camera`.
2. **Écris le contenu** dans `contenu.js` : pour chaque module, les notions, l'essentiel et les questions. Le format est expliqué ligne par ligne dans le fichier.
3. **Écris les labos** : leur HTML dans `index.html` (un `<template data-labo="n">` par module qui en a un), leur code dans `labos.js`.
4. **Déclare l'application** dans `js/catalogue.js` (id, catégorie et sous-catégorie, épreuve, titre, icône, couleurs, nombre de modules). Son icône apparaît alors dans sa rubrique de l'accueil et dans « Ma progression ». Si elle figurait dans la liste `aVenir` de sa catégorie (`CATEGORIES`), retire-la de cette liste.
5. **Teste** : ouvre `index.html` de l'application, ajoute `?enseignant` à l'adresse pour ouvrir tous les modules sans passer les évaluations, vérifie chaque étape en clair, en sombre et sur téléphone.


> L'`id` de `contenu.js` doit être **identique** à celui du catalogue, et ne doit **plus changer** une fois l'application en ligne : les notes sont enregistrées sous ce nom (`id.1`, `id.2`…).

---

## 2. La structure : un parcours, des modules, quatre étapes

### L'application

| Élément | Rôle |
|---|---|
| **Accueil** | Grand titre + accroche en dégradé, présentation, bouton « Commencer / Reprendre », progression (anneau), méthode en quatre temps, **parcours** (une tuile par module avec son anneau de note). |
| **Menu latéral** | Accueil, retour à toutes les applications, la liste des modules (numéro, coche verte si validé, cadenas si verrouillé), le lexique, la progression et le thème. Réductible en pastilles ; en tiroir sur téléphone. |
| **Modules** | 2 à 10 modules, du plus simple au plus technique. Chacun s'ouvre quand le précédent est validé (**12/20**). |
| **Lexique** | Toutes les définitions, de A à Z, avec recherche. Construit automatiquement. |

### Le module : toujours les mêmes quatre étapes, dans le même ordre

Une barre numérotée, sous le titre du module, les affiche (1 Comprendre · 2 Manipuler · 3 Retenir · 4 S'évaluer) ; elle réapparaît dans la barre du haut quand on descend. L'élève sait toujours où il en est.

| Étape | Contenu | Règle |
|---|---|---|
| **Comprendre** | Les **mots** et les **formules**, présentés en **tuiles** qui ouvrent chacune leur **fiche**. | Chaque mot : une définition simple, une **comparaison** avec la vie de tous les jours, des **repères** chiffrés. Chaque formule : comment la **lire à voix haute**, un tableau « symbole · nom · unité · rôle », un **exemple chiffré**. |
| **Manipuler** | Le **labo** : animation ou simulation. | Une scène **toujours visible**, des réglages à côté, des valeurs calculées dessous, une explication qui **suit les réglages**. |
| **Retenir** | L'essentiel avant l'évaluation. | Quatre questions : définitions, formules, repères, **pièges**. Court : ce qui tombe à l'évaluation, rien de plus. |
| **S'évaluer** | 10 questions, 2 points chacune, note sur 20. | Les valeurs changent à chaque tentative. Correction détaillée. **12/20** ouvre le module suivant. |

### L'interface épurée (la présentation de toutes les applications)

Principe : **ne pas noyer l'élève**. En arrivant sur un module, il voit le titre, le film en une carte, la barre des étapes et la première étape, rien d'autre. Rien n'est supprimé : tout le contenu reste à **un clic**, et ce qui est secondaire (une comparaison, un tableau de symboles, un calcul détaillé) attend derrière un « + » que l'élève le demande.

Le kit l'applique d'office ; une application n'a rien à écrire pour l'obtenir. Pour revenir à l'ancienne présentation (une seule longue page, les notions en questions dépliables) : `epure: false` dans `contenu.js`, ou `?classique` à la fin de l'adresse pour comparer le temps d'une visite.

| Élément | Présentation épurée |
|---|---|
| **Étapes** | Une seule à la fois. Une barre numérotée (1 Comprendre · 2 Manipuler · 3 Retenir · 4 S'évaluer) sous le titre ; « Étape suivante » en bas. L'étape entre en glissant dans le sens du parcours. |
| **Film** | Une carte compacte (vignette, durée, « Regarder »). Il s'ouvre dans une fenêtre qui grandit depuis la vignette, avec ses chapitres, et démarre à l'ouverture. |
| **Comprendre** | Les mots et les formules en **tuiles** (icône + mot, ou la formule). Une tuile ouvre sa **fiche** dans une fenêtre ; on les feuillette avec ← →, les points du bas ou en glissant le doigt. Une coche verte marque les fiches déjà lues. |
| **Dans une fiche** | La définition (ou la formule et sa lecture à voix haute) reste visible ; la comparaison, les repères, le tableau des symboles et l'exemple chiffré sont derrière des **petits +**. |
| **Manipuler** | Plusieurs labos : des **onglets**, un labo à la fois, et « Labo suivant » en bas. Une carte qui contient un `.calc` (« Calcul pas à pas ») est repliée derrière un +. « Ce qu'il faut observer » reste toujours visible. |
| **S'évaluer** | Les règles détaillées derrière un +. Dans la correction, les erreurs sont ouvertes, les bonnes réponses repliées. |
| **Téléphone** | Les fenêtres montent du bas de l'écran. |

Ce qui reste **toujours visible**, parce que c'est le cœur de l'apprentissage : la définition d'un mot, une formule et sa lecture à voix haute, la scène et les réglages d'un labo, « Ce qu'il faut observer », les erreurs dans la correction.

Le kit fournit aussi aux labos `Application.plus(titre, html, { ouvert })` (un détail replié) et `Application.fenetre({ origine, contenu })` (une fenêtre qui s'ouvre depuis un élément). Les fiches déjà lues sont mémorisées sur l'appareil de l'élève.

### Le film du module (avant les quatre étapes)

Sous le titre du module, une **vidéo courte** (deux à trois minutes) résume l'essentiel : en musique, **sans voix**, avec des animations qui expliquent les notions pas à pas. L'élève la regarde en arrivant, puis y revient pour réviser.

| Règle | Pourquoi |
|---|---|
| Tout est écrit à l'écran, une idée par plan | Pas de voix : le film se comprend aussi sans le son, en classe comme dans le bus. |
| Les mêmes exemples chiffrés que le cours | L'élève retrouve dans « Comprendre » et dans l'évaluation ce qu'il a vu dans le film. |
| Un chapitre par notion, un plan « À retenir » à la fin | Les chapitres sont cliquables sous la vidéo. |
| Elle ne démarre jamais seule | Elle a du son ; l'élève appuie sur lecture. Elle se met en pause quand il change de module. |

Le film se déclare dans `contenu.js` (champ `film` du module) ; ses sources et sa fabrication sont décrites dans `films/README.md`. Un module sans champ `film` s'affiche comme avant.

### L'évaluation

Les cinq familles de questions, chacune avec sa couleur, sont tirées au sort dans les banques de `contenu.js` :

| Famille | Nombre | Ce qu'elle vérifie | Exemple |
|---|---|---|---|
| **Lire** | 2 | Lire une valeur dans une fiche technique, un tableau, un schéma. | « Fiche technique : 48 kHz / 24 bits. Quelle est la fréquence d'échantillonnage ? » |
| **Comprendre** | 2 | Vrai ou faux sur une idée du cours. | « Passer de 8 à 9 bits double le nombre de niveaux. » |
| **QCM** | 2 | Une question de cours, des erreurs plausibles en réponses fausses. | « Quelle liaison pour l'UHD 50p ? » |
| **Calculer** | 3 | Appliquer une formule, **valeurs tirées au sort**. | « Signal jusqu'à 18 kHz : fe minimale ? » |
| **Exercice** | 1 | Une situation réelle en plusieurs étapes. | « Un plateau produit un signal… a) b) c) » |

Règles :

- **Plus de questions que nécessaire** dans chaque banque : le tirage change d'une tentative à l'autre.
- Les **mauvaises réponses** sont les erreurs que font vraiment les élèves, de longueur proche de la bonne.
- L'**explication** dit **pourquoi**, pas seulement quelle était la bonne réponse.
- Chaque question peut avoir un **indice** (il coûte 0,5 point) : il oriente sans donner la réponse.
- Réponses numériques : tolérance de **3 %** par défaut (`tolerance`), ou écart absolu (`ecart`).

---

## 3. La direction artistique

Reprise de la photométrie : sobre, claire, inspirée des interfaces Apple. Tout est déjà dans `css/style.css` et `css/application.css` ; une application ne réécrit **aucune couleur**.

| Élément | Valeur | Pourquoi |
|---|---|---|
| Fond / surfaces | `#f5f5f7` / blanc ; en sombre `#000` / `#1c1c1e` | Calme, lisible au vidéoprojecteur (thème clair par défaut). |
| Action | Bleu `#0071e3` | Une seule couleur pour « on peut cliquer ici ». |
| Signature | Dégradé spectre : orange → rose → violet → bleu | Rappel de la lumière et de la mire. Réservé aux **grands titres** et aux icônes. |
| Validé / à revoir / erreur | Vert / orange / rouge | Toujours le même sens, partout. |
| Scènes et animations | **Fond sombre `#0b0c0e` dans les deux thèmes** | Une lumière, une couleur, un signal se lisent mieux sur du noir. |
| Typographie | Police système (San Francisco, Segoe UI…) ; chiffres à chasse fixe dans les valeurs | Rien à télécharger ; les nombres ne « sautent » pas quand ils changent. |
| Formes | Cartes arrondies (18 à 28 px), boutons en pilule, contrôles segmentés | Cohérence avec la photométrie. |
| Icône d'application | Carré très arrondi, dégradé de 2 ou 3 couleurs (`teinte`), pictogramme blanc (`icone`) | Reconnaissable d'un coup d'œil dans la grille de l'accueil. |

**Ton des textes** : on vouvoie l'élève dans les applications (comme dans la photométrie). Phrases courtes, un mot important en **gras** par phrase au plus, pas de jargon sans définition. Typographie française : espace avant `: ; ? !`, guillemets « », apostrophe ’.

---

## 4. Les animations

Elles servent à **comprendre**, jamais à décorer.

| Animation | Où | Fournie par |
|---|---|---|
| Apparition douce des blocs au défilement | Partout | Le kit |
| Entrée de page (glissement léger) | Changement de module | Le kit |
| Étape qui glisse dans le sens du parcours | Changement d'étape, d'onglet de labo, de fiche | Le kit |
| Fenêtre qui grandit depuis l'élément cliqué et s'y referme (monte du bas sur téléphone) | Fiches, film, lexique | `Application.fenetre(...)` |
| Petit + qui tourne en − et détail qui se déplie en douceur | Fiches, labos, évaluation | `Application.plus(...)` |
| Valeur qui « rebondit » quand elle change | Valeurs des labos | `Application.afficher(el, texte)` |
| Pastille glissante des contrôles segmentés | Labos, barre des étapes | `Application.segment(...)` |
| Curseurs remplis de bleu jusqu'au pouce | Labos | Le kit (automatique) |
| Anneau de note qui se remplit, note qui défile | Résultat de l'évaluation | Le kit |
| Pastille du module débloqué qui pulse + notification | Après une évaluation réussie | Le kit |
| Animation racontée (tête de lecture, étapes) | Labo | À écrire dans `labos.js` (exemple : module 1 du signal vidéo) |

Règles :

- Toute animation automatique a un bouton **Rejouer** ou **Pause**.
- Si l'élève a demandé **moins de mouvement** dans les réglages de son appareil, les animations s'arrêtent (le kit le gère ; dans un labo, tester `window.matchMedia("(prefers-reduced-motion: reduce)")`).
- Durées : 0,2 à 0,7 s pour l'interface ; 2 à 3 s pour une animation racontée.

---

## 5. Les labos (étape « Manipuler »)

Mise en page de référence (voir `modules/modele/index.html`) :

```
┌──────────────────────────────┬──────────────────┐
│ .stg  Titre de la scène      │ .card Réglages   │
│ ┌──────────────────────────┐ │  curseurs .ctl   │
│ │ canvas .cv (fond sombre) │ │  segments        │
│ └──────────────────────────┘ ├──────────────────┤
├──────────────────────────────┤ .card Ce qu'il   │
│ .readouts  valeurs calculées │  faut observer   │
└──────────────────────────────┴──────────────────┘
```

Règles de code (dans `labos.js`) :

1. **Une seule fonction `dessiner()`** relit tous les réglages, recalcule et redessine **tout** : la scène, les valeurs, l'explication. Chaque réglage l'appelle. La scène, les nombres et le texte ne peuvent donc jamais se contredire.
2. Les identifiants commencent par le numéro du module (`m1-…`, `s2-…`) : pas de collision entre labos.
3. Le canvas a une taille fixe en attributs (`width="1000" height="450"`) ; le CSS l'adapte à l'écran.
4. Les nombres s'écrivent à la française : `Application.nombre(1234.5, 1)` → « 1 234,5 ».
5. Une explication (`.note ok / warn / bad`) dit ce que l'élève doit remarquer **pour les réglages actuels**.
6. Proposer des **situations toutes prêtes** (boutons `.chip`) : « cas normal », « cas limite », « erreur typique ».
7. Accessibilité : `role="img"` et `aria-label` décrivant la scène ; `aria-live="polite"` sur l'explication.
8. **Plusieurs labos** dans un module : chacun commence par un titre `<div class="sous-labo"><span class="eyebrow">Labo 1 · Nom court</span><h3>…</h3><p class="muted">…</p></div>`. Le kit en fait des **onglets** (« Labo 1 / Nom court ») : garde le nom court… court (deux ou trois mots).
9. La carte **« Calcul pas à pas »** (celle qui contient un `.calc`) est repliée derrière un + : elle détaille, elle ne doit pas être indispensable pour comprendre la scène. « Ce qu'il faut observer » reste, elle, toujours visible.
10. Un labo démarre **masqué** (l'élève arrive sur « Comprendre »). Ne mesure donc rien à l'initialisation (pas de `clientWidth`) ; une animation s'arrête quand sa scène est cachée (`el.offsetParent === null`) et repart dans `Application.surAffichage(n, …)`, que le kit appelle quand le labo redevient visible.

---

## 6. Liste de contrôle avant publication

- [ ] L'`id` est identique dans `contenu.js` et `js/catalogue.js` ; `modules` du catalogue = nombre de modules.
- [ ] Chaque module a ses quatre étapes (le labo peut manquer s'il n'apporte rien).
- [ ] Si le module a un film : la vidéo se lit, les chapitres tombent au bon moment, ses chiffres sont ceux du cours.
- [ ] Chaque mot a une comparaison ; chaque formule se lit à voix haute et a un exemple chiffré.
- [ ] Chaque banque de questions contient plus de questions que le tirage n'en prend.
- [ ] Les questions « Calculer » ont des valeurs tirées au sort et une explication avec le calcul.
- [ ] Testé avec `?enseignant` : tous les modules, clair et sombre, ordinateur et téléphone.
- [ ] Chaque fiche s'ouvre et se lit seule (la définition ne renvoie pas à « la question ci-dessus ») ; les + s'ouvrent.
- [ ] Chaque onglet de labo s'affiche, et ses animations repartent quand on revient dessus.
- [ ] Aucune erreur dans la console du navigateur (F12).
- [ ] Le contenu a été relu par rapport au référentiel du BTS.

---

## 7. Fichiers du kit

| Fichier | Rôle |
|---|---|
| `js/application.js` | Le moteur : menu, accueil, notions, essentiel, évaluation, déblocage, lexique, animations. |
| `css/application.css` | La mise en page de référence des applications. |
| `css/style.css` | Couleurs, typographie, boutons, champs : partagés avec toute la plateforme. |
| `js/theme.js` | Thème clair ou sombre, partagé avec la photométrie. |
| `js/transition.js` | Animation d'ouverture d'une application (l'icône grandit jusqu'à remplir l'écran, puis le voile s'estompe sur l'application). À charger dans le `<head>` juste après `theme.js`, comme dans `modules/modele/index.html`. |
| `js/applications.js` | Icônes d'application et lecture de la progression (accueil, tableau de bord). |
| `modules/modele/` | Le modèle à dupliquer, entièrement commenté. |
| `modules/tes-signal-video-numerique/` | Une application complète construite avec le kit : à lire comme exemple. |
| `modules/tes-capteurs/` | Six labos animés (canvas, boucles d'animation avec pause, mouvement réduit). |
| `modules/tes-eclairage/` | Plusieurs labos par module (titres `.sous-labo`), couleurs calculées à partir de spectres (moteur CIE), schémas SVG dans les notions et les questions (`.qa-fig`), image calculée rayon par rayon. |
| `modules/tes-compression-video/` | Plusieurs labos par module avec un seul `Application.labo` (fonction `labo(n, f)` en tête de `labos.js`), calculs réels sur une image dessinée (codeur JPEG, estimation de mouvement, codeur arithmétique), fiches MediaInfo en SVG pour les questions « Lire ». |
| `modules/tes-microphones/` | Physique partagée entre le cours et les labos (objet `MICRO` et tableau `DIRECTIVITES` en tête de `contenu.js`, réutilisés par `labos.js`), diagrammes polaires en SVG (`figPolaire`) et sur canvas (`O.polaireGrille`, `O.polaireCourbe`), fiches techniques en SVG (`figFiche`) pour les questions « Lire ». |

Le **simulateur caméra** (`modules/tmo-simulateur-camera/`) est une *application pratique* : il n'a ni modules ni évaluation et n'utilise donc pas le moteur du kit (`js/application.js`). Il en reprend l'identité visuelle (`css/style.css`, scènes et réglages de `css/application.css`) et les habitudes : fichiers commentés, vouvoiement, une explication et une comparaison par réglage. Dans le catalogue, une application de ce type se déclare avec `modules: 0` et `suivi: "aucun"`.

La photométrie, elle, reste un **fichier unique** autonome (elle fonctionne aussi hors ligne, avec son propre enregistrement, son relevé PDF et son tableau de bord enseignant). Le kit en reprend la forme ; il ne la remplace pas.

Elle a reçu la même **interface épurée** que les applications du kit (une étape à la fois, notions en tuiles et fiches, petits +, fenêtres qui grandissent depuis le bouton cliqué). Ce code est écrit dans son propre fichier (objet `Epure`, juste avant `Lessons`, et styles « INTERFACE ÉPURÉE » à la fin de sa feuille de style) pour qu'elle continue de fonctionner hors connexion. Toute évolution de l'interface épurée du kit (`js/application.js`, `css/application.css`) est à reporter aussi à cet endroit. `?classique` y rend également l'ancienne présentation.
