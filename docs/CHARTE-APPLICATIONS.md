# Charte des applications de révision

L'application **Photométrie** (`modules/tes-photometrie/`) est la **référence** de la plateforme. Toute nouvelle application reprend sa direction artistique, sa structure, son ton, ses animations et sa façon d'évaluer. Le **kit application** (`js/application.js` et `css/application.css`) fournit tout cela d'office : une nouvelle application décrit son contenu, le kit fait le reste.

Cette charte dit ce qu'il faut respecter, et pourquoi.

---

## 1. Créer une application en cinq étapes

1. **Duplique** `modules/modele/` et renomme la copie `epreuve-nom-de-la-notion` (minuscules, tirets, sans accent). Exemple : `tmo-reglage-camera`.
2. **Écris le contenu** dans `contenu.js` : pour chaque module, les notions, l'essentiel et les questions. Le format est expliqué ligne par ligne dans le fichier.
3. **Écris les labos** : leur HTML dans `index.html` (un `<template data-labo="n">` par module qui en a un), leur code dans `labos.js`.
4. **Déclare l'application** dans `js/catalogue.js` (id, épreuve, titre, icône, couleurs, nombre de modules). Son icône apparaît alors dans la grille de l'accueil et dans « Ma progression ».
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

La barre du haut les affiche et suit le défilement. L'élève sait toujours où il en est.

| Étape | Contenu | Règle |
|---|---|---|
| **Comprendre** | Les **mots** et les **formules**, présentés en **questions dépliables**. | Chaque mot : une définition simple, une **comparaison** avec la vie de tous les jours, des **repères** chiffrés. Chaque formule : comment la **lire à voix haute**, un tableau « symbole · nom · unité · rôle », un **exemple chiffré**. |
| **Manipuler** | Le **labo** : animation ou simulation. | Une scène **toujours visible**, des réglages à côté, des valeurs calculées dessous, une explication qui **suit les réglages**. |
| **Retenir** | L'essentiel avant l'évaluation. | Quatre questions : définitions, formules, repères, **pièges**. Court : ce qui tombe à l'évaluation, rien de plus. |
| **S'évaluer** | 10 questions, 2 points chacune, note sur 20. | Les valeurs changent à chaque tentative. Correction détaillée. **12/20** ouvre le module suivant. |

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

---

## 6. Liste de contrôle avant publication

- [ ] L'`id` est identique dans `contenu.js` et `js/catalogue.js` ; `modules` du catalogue = nombre de modules.
- [ ] Chaque module a ses quatre étapes (le labo peut manquer s'il n'apporte rien).
- [ ] Chaque mot a une comparaison ; chaque formule se lit à voix haute et a un exemple chiffré.
- [ ] Chaque banque de questions contient plus de questions que le tirage n'en prend.
- [ ] Les questions « Calculer » ont des valeurs tirées au sort et une explication avec le calcul.
- [ ] Testé avec `?enseignant` : tous les modules, clair et sombre, ordinateur et téléphone.
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
| `js/applications.js` | Icônes d'application et lecture de la progression (accueil, tableau de bord). |
| `modules/modele/` | Le modèle à dupliquer, entièrement commenté. |
| `modules/tes-signal-video-numerique/` | Une application complète construite avec le kit : à lire comme exemple. |
| `modules/tes-capteurs/` | Six labos animés (canvas, boucles d'animation avec pause, mouvement réduit). |
| `modules/tes-eclairage/` | Plusieurs labos par module (titres `.sous-labo`), couleurs calculées à partir de spectres (moteur CIE), schémas SVG dans les notions et les questions (`.qa-fig`), image calculée rayon par rayon. |

La photométrie, elle, reste un **fichier unique** autonome (elle fonctionne aussi hors ligne, avec son propre enregistrement, son relevé PDF et son tableau de bord enseignant). Le kit en reprend la forme ; il ne la remplace pas.
