# Les films des modules

Chaque module d'une application d'apport de connaissances peut commencer par un **film** : une vidéo de deux à trois minutes, **en musique et sans voix**, qui reprend pas à pas les notions essentielles du module, avec des animations et des illustrations.

Ce dossier contient les **sources** des films. Les vidéos terminées, elles, sont rangées dans le dossier de chaque application (`modules/<application>/films/`).

| Film | Module | Durée | Vidéo publiée |
|---|---|---|---|
| `compression-video-module-1/` | Compression vidéo · module 1 · Pourquoi compresser ? | 2 min 23 | `modules/tes-compression-video/films/module-1.mp4` |

## Comment un film est fabriqué

Rien n'est filmé ni enregistré : **chaque image est dessinée par du code, chaque son est synthétisé**. Il n'y a donc aucune musique ni aucune image sous droits.

| Fichier | Rôle |
|---|---|
| `score.js` | **La partition** : le plan du film en mesures, les accords, et l'heure de **chaque apparition** à l'écran. C'est la source unique : la musique et l'image la lisent toutes les deux, elles ne peuvent donc pas se décaler. |
| `song.js` | **La musique** : un accompagnement lo-fi, un thème, et un son pour chaque événement de la partition. |
| `kit.js` | **La direction artistique** : couleurs, textes, pastilles, image de test, habillage. Reprend celle de la plateforme (fond sombre des scènes, couleurs des schémas, dégradé « spectre » pour les grands titres). À recopier tel quel dans le film suivant. |
| `film.js` | **Les scènes** : une fonction par chapitre, qui dessine l'image de l'instant `t`. |
| `index.html` | La page que le moteur de rendu ouvre pour calculer les images. |

Le moteur de rendu (dossier `engine/`) et les fichiers calculés (dossier `out/`) ne sont **pas** enregistrés dans le dépôt.

## Règles d'écriture d'un film

- **Sans voix** : tout ce qu'il faut comprendre est écrit à l'écran. Une idée par plan, des phrases courtes, le temps de lire.
- **Les mêmes chiffres que le cours** : les exemples sont ceux de `contenu.js` (HD 4:2:2 10 bits 25 i/s ≈ 1 037 Mbit/s, 50 Mbit/s, 20:1 → 95 %…). Si le cours change, le film doit changer.
- **Un chapitre par notion**, numéroté, avec la barre de progression en bas de l'image ; un plan « À retenir » à la fin.
- **Le son suit l'image** : une note par élément qui apparaît, un « coup » sur chaque résultat important.
- 25 images par seconde, 1920 × 1080, musique calme réglée à −16 LUFS.

## Refaire le rendu

Il faut Node.js 22, ffmpeg et Chrome, plus le moteur « animation-studio » recopié dans `engine/`. Depuis le dossier du film :

```bash
node song.js
```

```bash
node engine/render.js board
```

```bash
node engine/render.js video
```

```bash
node engine/render.js mux
```

`board` produit une planche de contrôle (`out/board.png`) ; `video` puis `mux` produisent `out/<nom-du-dossier>.mp4`, à recopier dans `modules/<application>/films/`.

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
