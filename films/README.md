# Les films des modules

Chaque module d'une application d'apport de connaissances peut commencer par un **film** : une vidéo de deux à trois minutes, **en musique et sans voix**, qui reprend pas à pas les notions essentielles du module, avec des animations et des illustrations.

Ce dossier contient les **sources** des films. Les vidéos terminées, elles, sont rangées dans le dossier de chaque application (`modules/<application>/films/`).

| Film (dossier) | Module | Vidéo publiée |
|---|---|---|
| `compression-video-module-1/` | Compression vidéo · 1 · Pourquoi compresser ? Débit et taux | `modules/tes-compression-video/films/module-1.mp4` |
| `compression-video-module-2/` | Compression vidéo · 2 · La compression JPEG | `…/films/module-2.mp4` |
| `compression-video-module-3/` | Compression vidéo · 3 · La compression MPEG | `…/films/module-3.mp4` |
| `compression-video-module-4/` | Compression vidéo · 4 · Le codage entropique | `…/films/module-4.mp4` |
| `compression-video-module-5/` | Compression vidéo · 5 · CBR, VBR, profils et niveaux | `…/films/module-5.mp4` |
| `compression-video-module-6/` | Compression vidéo · 6 · Codecs et conteneurs | `…/films/module-6.mp4` |

## Comment un film est fabriqué

Rien n'est filmé ni enregistré : **chaque image est dessinée par du code, chaque son est synthétisé**. Il n'y a donc aucune musique ni aucune image sous droits.

### Ce qui est commun à tous les films : `_commun/`

| Fichier | Rôle |
|---|---|
| `partition.js` | **La partition commune** : l'horloge (80 à la noire, une mesure = 3 secondes), l'harmonie, le thème, l'arrangement (où joue la batterie), et les événements des plans que tous les films partagent (titre, « À retenir », fin). |
| `musique.js` | **La musique** : accompagnement lo-fi, thème, et un son pour chaque événement de la partition. Réglée à −16 LUFS. |
| `kit.js` | **La direction artistique** : couleurs, textes, pastilles, image de test, habillage (nom de l'application, barre de progression par chapitre), et les scènes communes (titre, « À retenir », fin, montage). Reprend celle de la plateforme : fond sombre des scènes, couleurs des schémas, dégradé « spectre » pour les grands titres. |
| `index.html` | La page que le moteur de rendu ouvre pour calculer les images. |

### Ce qui est propre à un film : son dossier

| Fichier | Rôle |
|---|---|
| `score.js` | **La partition du film** : son plan (les sections et leur durée en mesures), ses chapitres, et l'heure de **chaque apparition** à l'écran. C'est la source unique : la musique et l'image la lisent toutes les deux, elles ne peuvent donc pas se décaler. |
| `film.js` | **Les scènes** : une fonction par chapitre, qui dessine l'image de l'instant `t`. |
| `song.js`, `index.html` | Deux fichiers identiques d'un film à l'autre (créés par `preparer.sh`). |

Le moteur de rendu (`engine/`), les fichiers calculés (`out/`) et les copies du socle (`kit.js`, `partition.js` dans le dossier d'un film) ne sont **pas** enregistrés dans le dépôt : `preparer.sh` les remet en place.

> Le film du module 1 a été écrit avant le socle : sa partition (`score.js`) et ses scènes de titre, « À retenir » et fin sont écrites en entier dans son dossier. Les suivants s'appuient sur `_commun/`.

## Règles d'écriture d'un film

- **Sans voix** : tout ce qu'il faut comprendre est écrit à l'écran. Une idée par plan, des phrases courtes, le temps de lire.
- **Les mêmes chiffres que le cours** : les exemples sont ceux de `contenu.js`. Si le cours change, le film doit changer.
- **Toujours la même forme** : un titre, six à neuf chapitres numérotés (avec la barre de progression en bas de l'image), un plan « À retenir », une fin « À vous de jouer ».
- **Une illustration animée par chapitre**, qui explique vraiment (pas seulement du texte).
- **Le son suit l'image** : une note par élément qui apparaît, un « coup » sur chaque résultat important.
- 25 images par seconde, 1920 × 1080, 2 min 15 à 2 min 45.

## Créer un film

Il faut Node.js 22, ffmpeg et Chrome, plus le moteur « animation-studio » (indiquer son dossier avec `ANIMATION_STUDIO=…` la première fois, ou le recopier dans `engine/`). Depuis `films/` :

```bash
./preparer.sh compression-video-module-2
```

Écrire ensuite `score.js` et `film.js` dans le dossier créé (prendre un film existant comme modèle), puis, depuis ce dossier, contrôler avant de tout calculer :

```bash
node song.js
```

```bash
node engine/render.js board
```

`board` produit une planche de contrôle (`out/board.png`) : une image par repère de la partition.

## Fabriquer et publier la vidéo

Depuis `films/` : dossier du film, dossier de l'application, numéro du module.

```bash
./publier.sh compression-video-module-2 tes-compression-video 2
```

Le script fabrique la musique, calcule toutes les images (quelques minutes), assemble, **contrôle la synchronisation** image-son, puis range la version légère (`module-2.mp4`, environ 8 Mo) et son affiche (`module-2.jpg`) dans `modules/tes-compression-video/films/`.

## Brancher un film dans un module

Dans le `contenu.js` de l'application, dans le module concerné :

```js
film: {
  src: "films/module-1.mp4",
  affiche: "films/module-1.jpg",
  duree: "2 min 23",
  chapitres: [[6.4, "Le problème"], [18.4, "Le débit"]]
},
```

Le kit (`js/application.js`) affiche alors la vidéo sous le titre du module, avec ses chapitres cliquables. Elle ne démarre jamais seule et se met en pause quand l'élève change de module.
