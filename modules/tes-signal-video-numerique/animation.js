/* ==========================================================================
   animation.js — animation et calculateur du module « signal vidéo numérique »
   --------------------------------------------------------------------------
   Ce fichier fait trois choses, toutes pilotées par UNE variable
   (structureCourante) :
     1. dessiner la grille des échantillons Y / Cb / Cr ;
     2. montrer l'effet du sous-échantillonnage sur une petite image test ;
     3. calculer le débit non compressé.
   Pourquoi une seule variable d'état ? Quand l'élève change de structure, on
   appelle toutMettreAJour() et les trois parties restent toujours cohérentes.

   Les dessins utilisent la balise <canvas> : une « feuille » sur laquelle
   JavaScript trace des formes. Aucune bibliothèque externe n'est nécessaire.
   ========================================================================== */

/* --- Les données ---------------------------------------------------------- */

// Pour chaque structure : sur combien de pixels une même chrominance est
// partagée horizontalement (pasH) et verticalement (pasV), et le nombre
// d'échantillons par pixel qui en résulte (1 pour Y + 2 ÷ (pasH × pasV)).
const STRUCTURES = {
  "4:4:4": {
    pasH: 1, pasV: 1, parPixel: 3,
    description: "Chaque pixel possède sa luminance et sa propre chrominance. Aucune perte : l'image de droite est identique à l'originale."
  },
  "4:2:2": {
    pasH: 2, pasV: 1, parPixel: 2,
    description: "Une chrominance pour 2 pixels voisins de la même ligne. Les rayures verticales perdent leur couleur ; les rayures horizontales restent intactes."
  },
  "4:2:0": {
    pasH: 2, pasV: 2, parPixel: 1.5,
    description: "Une chrominance pour un carré de 2 × 2 pixels. Les rayures verticales et les rayures horizontales perdent toutes leur couleur."
  },
  "4:1:1": {
    pasH: 4, pasV: 1, parPixel: 1.5,
    description: "Une chrominance pour 4 pixels voisins de la même ligne. Autant de données qu'en 4:2:0, mais toute la perte est horizontale."
  }
};

let structureCourante = "4:2:2";

/* --- 1. La grille des échantillons ---------------------------------------- */

const GRILLE_COLONNES = 8;
const GRILLE_LIGNES = 4;
const CASE = 120; // côté d'un pixel sur le schéma (le canvas mesure 960 × 480)

function dessinerGrille() {
  const canvas = document.getElementById("canvas-grille");
  const c = canvas.getContext("2d"); // c = le « crayon » qui dessine
  const s = STRUCTURES[structureCourante];
  c.clearRect(0, 0, canvas.width, canvas.height);

  // a) Les cadres : un par groupe de pixels partageant la même chrominance.
  for (let ligne = 0; ligne < GRILLE_LIGNES; ligne += s.pasV) {
    for (let colonne = 0; colonne < GRILLE_COLONNES; colonne += s.pasH) {
      // Une teinte sur deux, en damier, pour bien distinguer les groupes voisins.
      const pair = (colonne / s.pasH + ligne / s.pasV) % 2 === 0;
      c.fillStyle = pair ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.13)";
      c.strokeStyle = "rgba(255, 255, 255, 0.45)";
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(colonne * CASE + 6, ligne * CASE + 6, s.pasH * CASE - 12, s.pasV * CASE - 12, 14);
      c.fill();
      c.stroke();

      // b) L'échantillon de chrominance du groupe : un anneau moitié bleu (Cb),
      // moitié rouge (Cr). Il est placé sur le premier pixel du groupe ; en
      // 4:2:0, il se trouve à mi-hauteur entre les deux lignes (cas du MPEG-2).
      const x = colonne * CASE + CASE / 2;
      const y = ligne * CASE + (s.pasV * CASE) / 2;
      c.lineWidth = 10;
      c.strokeStyle = "#4d8dff";
      c.beginPath();
      c.arc(x, y, 38, Math.PI / 2, Math.PI * 1.5); // demi-cercle gauche
      c.stroke();
      c.strokeStyle = "#ff5c4d";
      c.beginPath();
      c.arc(x, y, 38, Math.PI * 1.5, Math.PI / 2); // demi-cercle droit
      c.stroke();
    }
  }

  // c) Les échantillons de luminance : un disque gris sur CHAQUE pixel,
  // quelle que soit la structure. La luminance n'est jamais allégée.
  c.fillStyle = "#dcdcdc";
  for (let ligne = 0; ligne < GRILLE_LIGNES; ligne++) {
    for (let colonne = 0; colonne < GRILLE_COLONNES; colonne++) {
      c.beginPath();
      c.arc(colonne * CASE + CASE / 2, ligne * CASE + CASE / 2, 22, 0, Math.PI * 2);
      c.fill();
    }
  }

  canvas.setAttribute("aria-label",
    "Schéma en " + structureCourante + " : un échantillon de luminance par pixel, et un échantillon de chrominance pour " +
    s.pasH * s.pasV + " pixel(s).");
}

/* --- 2. L'effet sur une image test ---------------------------------------- */

const IMAGE_LARGEUR = 16;
const IMAGE_HAUTEUR = 8;
const POINT = 30; // taille d'un pixel de l'image test une fois agrandi

// Renvoie la couleur [rouge, vert, bleu] du pixel (x, y) de l'image test.
// Les zones sont larges de 4 ou 8 pixels pour tomber juste sur les groupes
// de chrominance, quelle que soit la structure.
function couleurImageTest(x, y) {
  if (x < 4) return x % 2 === 0 ? [235, 40, 40] : [40, 200, 220];    // rayures verticales rouge / cyan
  if (x < 8) return y % 2 === 0 ? [40, 190, 60] : [220, 50, 200];    // rayures horizontales vert / magenta
  if (x - 8 === y) return [250, 220, 40];                            // diagonale jaune
  if (x - 8 === 7 - y) return [255, 120, 170];                       // diagonale rose
  return [25, 40, 110];                                              // fond bleu nuit
}

// Conversion RVB → Y Cb Cr avec les coefficients de la HD (recommandation
// BT.709). Simplification assumée : on garde des valeurs entre 0 et 255,
// sans les niveaux réservés d'un vrai signal vidéo.
function versYCbCr(rvb) {
  const y = 0.2126 * rvb[0] + 0.7152 * rvb[1] + 0.0722 * rvb[2];
  return { y: y, cb: (rvb[2] - y) / 1.8556, cr: (rvb[0] - y) / 1.5748 };
}

// Conversion inverse Y Cb Cr → RVB.
function versRVB(y, cb, cr) {
  const rouge = y + 1.5748 * cr;
  const bleu = y + 1.8556 * cb;
  const vert = (y - 0.2126 * rouge - 0.0722 * bleu) / 0.7152;
  return [rouge, vert, bleu];
}

// Dessine l'image test sur un canvas. Si « structure » est fournie, la
// chrominance est d'abord sous-échantillonnée.
function dessinerImageTest(idCanvas, structure) {
  const c = document.getElementById(idCanvas).getContext("2d");
  const pasH = structure ? structure.pasH : 1;
  const pasV = structure ? structure.pasV : 1;

  // On traite l'image groupe par groupe.
  for (let y0 = 0; y0 < IMAGE_HAUTEUR; y0 += pasV) {
    for (let x0 = 0; x0 < IMAGE_LARGEUR; x0 += pasH) {

      // a) Chrominance du groupe = moyenne des chrominances de ses pixels.
      // (Les vrais équipements utilisent des filtres plus élaborés, mais le
      // principe est le même.)
      let sommeCb = 0;
      let sommeCr = 0;
      for (let y = y0; y < y0 + pasV; y++) {
        for (let x = x0; x < x0 + pasH; x++) {
          const composantes = versYCbCr(couleurImageTest(x, y));
          sommeCb += composantes.cb;
          sommeCr += composantes.cr;
        }
      }
      const cbMoyen = sommeCb / (pasH * pasV);
      const crMoyen = sommeCr / (pasH * pasV);

      // b) Chaque pixel garde SA luminance, mais reçoit la chrominance du groupe.
      for (let y = y0; y < y0 + pasV; y++) {
        for (let x = x0; x < x0 + pasH; x++) {
          const luminance = versYCbCr(couleurImageTest(x, y)).y;
          const rvb = versRVB(luminance, cbMoyen, crMoyen);
          // Le canvas ramène tout seul les valeurs hors limites entre 0 et 255.
          c.fillStyle = "rgb(" + rvb[0] + "," + rvb[1] + "," + rvb[2] + ")";
          c.fillRect(x * POINT, y * POINT, POINT, POINT);
        }
      }
    }
  }
}

/* --- 3. Le calculateur de débit ------------------------------------------- */

// Écrit un nombre à la française : 1036800000 → « 1 036 800 000 ».
function formater(nombre, decimales) {
  return nombre.toLocaleString("fr-FR", { maximumFractionDigits: decimales || 0 });
}

// Écrit un débit dans l'unité la plus lisible.
function formaterDebit(bitsParSeconde) {
  if (bitsParSeconde >= 1e9) return formater(bitsParSeconde / 1e9, 2) + " Gbit/s";
  return formater(bitsParSeconde / 1e6, 0) + " Mbit/s";
}

function calculerDebit() {
  // La valeur d'un menu déroulant est toujours du texte : "1920x1080".
  // split("x") le coupe en deux, Number() transforme le texte en nombre.
  const definition = document.getElementById("reglage-definition").value.split("x");
  const largeur = Number(definition[0]);
  const hauteur = Number(definition[1]);
  const cadence = Number(document.getElementById("reglage-cadence").value);
  const bits = Number(document.getElementById("reglage-bits").value);
  const parPixel = STRUCTURES[structureCourante].parPixel;

  const debit = largeur * hauteur * cadence * bits * parPixel;
  const debit444 = largeur * hauteur * cadence * bits * 3;
  const pourcentage = Math.round((debit / debit444) * 100);
  // Go par minute : × 60 secondes, ÷ 8 (bits → octets), ÷ 1 milliard (octets → Go).
  const goParMinute = (debit * 60) / 8 / 1e9;

  document.getElementById("resultat-debit").textContent = formaterDebit(debit);
  document.getElementById("resultat-formule").textContent =
    largeur + " × " + hauteur + " × " + cadence + " × " + bits + " bits × " + formater(parPixel, 1) +
    " = " + formater(debit) + " bit/s";
  document.getElementById("jauge-debit").style.width = pourcentage + "%";
  document.getElementById("resultat-comparaison").textContent =
    "En " + structureCourante + " : " + pourcentage + " % du débit du 4:4:4, soit environ " +
    formater(goParMinute, 1) + " Go par minute d'enregistrement non compressé.";
}

/* --- Mise à jour générale et commandes ------------------------------------ */

function toutMettreAJour() {
  // Le bouton de la structure active est marqué aria-pressed="true" :
  // c'est ce que le CSS utilise pour le remplir de couleur.
  document.querySelectorAll("#choix-structure button").forEach(function (bouton) {
    bouton.setAttribute("aria-pressed", bouton.textContent === structureCourante ? "true" : "false");
  });
  document.getElementById("description-structure").textContent = STRUCTURES[structureCourante].description;
  document.getElementById("legende-resultat").textContent = "Après passage en " + structureCourante + ".";

  dessinerGrille();
  dessinerImageTest("canvas-resultat", STRUCTURES[structureCourante]);
  calculerDebit();
}

// Création des boutons de choix : un par structure du tableau STRUCTURES.
Object.keys(STRUCTURES).forEach(function (nom) {
  const bouton = creerElement("button", "bouton", nom);
  bouton.type = "button";
  bouton.addEventListener("click", function () {
    arreterDefilement(); // un choix manuel arrête le défilement automatique
    structureCourante = nom;
    toutMettreAJour();
  });
  document.getElementById("choix-structure").append(bouton);
});

// Défilement automatique : passe à la structure suivante toutes les 2,5 s.
let minuterie = null;
const boutonDefilement = document.getElementById("bouton-defilement");

function arreterDefilement() {
  clearInterval(minuterie);
  minuterie = null;
  boutonDefilement.textContent = "▶ Faire défiler les structures";
}

boutonDefilement.addEventListener("click", function () {
  if (minuterie) {
    arreterDefilement();
    return;
  }
  boutonDefilement.textContent = "⏸ Arrêter le défilement";
  minuterie = setInterval(function () {
    const noms = Object.keys(STRUCTURES);
    // Le « % » (reste de la division) fait revenir au début après la dernière.
    structureCourante = noms[(noms.indexOf(structureCourante) + 1) % noms.length];
    toutMettreAJour();
  }, 2500);
});

// Les trois menus du calculateur relancent le calcul dès qu'on les modifie.
["reglage-definition", "reglage-cadence", "reglage-bits"].forEach(function (id) {
  document.getElementById(id).addEventListener("change", calculerDebit);
});

// Premier affichage. L'image d'origine ne change jamais : on la dessine une fois.
dessinerImageTest("canvas-original", null);
toutMettreAJour();
