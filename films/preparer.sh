#!/usr/bin/env bash
# Prépare le dossier d'un film pour le rendu :
#   ./preparer.sh compression-video-module-2
# - recopie le kit graphique et la partition commune (films/_commun/) dans le dossier du film
#   (le moteur de rendu ne lit que les fichiers du dossier) ;
# - recopie le moteur de rendu (engine/) s'il manque, depuis un autre film ou depuis
#   le dossier indiqué par la variable ANIMATION_STUDIO (le dossier « animation-studio ») ;
# - crée index.html et song.js s'ils manquent (ils sont identiques pour tous les films).
set -euo pipefail
ici="$(cd "$(dirname "$0")" && pwd)"
film="${1:?Usage : ./preparer.sh <dossier-du-film>}"
dossier="$ici/$film"
mkdir -p "$dossier"

cp "$ici/_commun/kit.js" "$ici/_commun/partition.js" "$dossier/"

if [ ! -d "$dossier/engine" ]; then
  source_moteur=""
  if [ -n "${ANIMATION_STUDIO:-}" ] && [ -d "$ANIMATION_STUDIO/engine" ]; then source_moteur="$ANIMATION_STUDIO/engine"; fi
  if [ -z "$source_moteur" ]; then
    for autre in "$ici"/*/engine; do
      if [ -d "$autre" ]; then source_moteur="$autre"; break; fi
    done
  fi
  if [ -z "$source_moteur" ]; then echo "Moteur de rendu introuvable : indiquez son dossier avec ANIMATION_STUDIO=…" >&2; exit 1; fi
  cp -r "$source_moteur" "$dossier/engine"
fi

if [ ! -f "$dossier/song.js" ]; then
  printf '%s\n' "// LA MUSIQUE — la même pour tous les films : voir films/_commun/musique.js" "require('../_commun/musique')(require('./score'), __dirname);" > "$dossier/song.js"
fi
if [ ! -f "$dossier/index.html" ]; then cp "$ici/_commun/index.html" "$dossier/index.html"; fi
if [ ! -f "$dossier/.gitignore" ]; then printf 'out/\n' > "$dossier/.gitignore"; fi
echo "Prêt : $dossier"
