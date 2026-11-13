#!/usr/bin/env bash
# Fabrique la vidéo d'un film et la range dans son application :
#   ./publier.sh compression-video-module-2 tes-compression-video 2
# 1. la musique (out/music.wav)          2. toutes les images (out/video.mp4)
# 3. l'assemblage image + son            4. le contrôle de la synchronisation
# 5. la version légère pour le site : modules/<application>/films/module-<n>.mp4 et son affiche (.jpg)
# Options : ENCODER_SEULEMENT=1 saute les étapes 1 à 4 (la vidéo out/video.mp4 existe déjà) ;
#           OUVRIERS=3 règle le nombre de navigateurs qui calculent les images en parallèle.
set -euo pipefail
ici="$(cd "$(dirname "$0")" && pwd)"
film="${1:?Usage : ./publier.sh <dossier-du-film> <application> <numero-du-module>}"
application="${2:?Il manque le dossier de l'application (ex. tes-compression-video)}"
numero="${3:?Il manque le numéro du module}"
dossier="$ici/$film"
sortie="$ici/../modules/$application/films"

"$ici/preparer.sh" "$film"
cd "$dossier"
if [ -z "${ENCODER_SEULEMENT:-}" ]; then
  node song.js
  node engine/render.js video "${OUVRIERS:-3}"
  node engine/render.js mux
  node engine/render.js verify
fi

mkdir -p "$sortie"
# Version pour le site : H.264 1080p, léger (les aplats se compressent bien), lisible partout, lecture immédiate (faststart)
ffmpeg -v error -y -i out/video.mp4 -i out/music.wav \
  -c:v libx264 -preset slower -crf 27 -tune animation -pix_fmt yuv420p -profile:v high -level 4.0 -g 125 \
  -c:a aac -b:a 128k -movflags +faststart -shortest "$sortie/module-$numero.mp4"
# L'affiche : l'image du titre, une fois tout le titre apparu
node engine/render.js stills 5.65
ffmpeg -v error -y -i out/stills/t_005.65.png -vf scale=1280:720:flags=lanczos -q:v 3 "$sortie/module-$numero.jpg"
ls -la "$sortie/module-$numero.mp4" "$sortie/module-$numero.jpg"
