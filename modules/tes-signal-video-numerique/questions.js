/* ==========================================================================
   questions.js — les questions du module « Le signal vidéo numérique »
   --------------------------------------------------------------------------
   CONTENU D'EXEMPLE : ces questions ont été rédigées à partir de
   connaissances techniques générales, pas à partir du référentiel du BTS.
   Relis-les et adapte-les (vocabulaire, niveau attendu, notions exigées)
   avant de les proposer aux étudiants.

   Format d'une question (détaillé dans js/quiz.js) :
     question    le texte de la question
     reponses    les propositions (2 à 5), dans l'ordre que tu veux :
                 le quiz les mélange à chaque partie
     bonne       la position de la bonne réponse, EN COMPTANT À PARTIR DE 0
     explication le rappel affiché après la réponse
   ========================================================================== */

const QUESTIONS = [
  {
    question: "Dans un signal Y Cb Cr, que transporte la composante Y ?",
    reponses: [
      "La luminance : l'information de lumière, c'est-à-dire l'image en noir et blanc",
      "La couleur jaune (yellow)",
      "La saturation des couleurs",
      "Le signal de synchronisation"
    ],
    bonne: 0,
    explication: "Y est la luminance. Cb et Cr sont les deux signaux de différence de couleur qui forment la chrominance."
  },
  {
    question: "Pourquoi peut-on transmettre moins d'échantillons de chrominance que de luminance ?",
    reponses: [
      "Parce que les capteurs ne mesurent pas la couleur",
      "Parce que l'œil perçoit moins bien les détails de couleur que les détails de lumière",
      "Parce que la chrominance est toujours compressée en JPEG",
      "Parce que les écrans n'affichent que la luminance"
    ],
    bonne: 1,
    explication: "Le sous-échantillonnage exploite une limite de la vision : notre œil est moins précis pour la couleur que pour la lumière. On allège donc la chrominance, là où la perte se voit le moins."
  },
  {
    question: "En 4:2:2, comment la chrominance est-elle échantillonnée par rapport à la luminance ?",
    reponses: [
      "Deux fois moins d'échantillons horizontalement, autant de lignes",
      "Deux fois moins d'échantillons horizontalement et deux fois moins de lignes",
      "Quatre fois moins d'échantillons horizontalement",
      "Exactement autant d'échantillons"
    ],
    bonne: 0,
    explication: "En 4:2:2, deux pixels voisins d'une même ligne partagent la même chrominance. La résolution verticale de la couleur reste complète."
  },
  {
    question: "En 4:2:0, combien d'échantillons de Cb conserve-t-on par rapport au 4:4:4 ?",
    reponses: [
      "La moitié",
      "Le tiers",
      "Le quart",
      "Aucun : le 4:2:0 supprime le Cb"
    ],
    bonne: 2,
    explication: "La chrominance est divisée par 2 horizontalement ET par 2 verticalement : un échantillon de Cb (et un de Cr) pour un carré de 2 × 2 pixels, soit le quart. Le « 0 » ne signifie pas que le Cb disparaît."
  },
  {
    question: "Combien de niveaux différents une quantification sur 10 bits permet-elle de coder ?",
    reponses: ["256", "512", "1 000", "1 024"],
    bonne: 3,
    explication: "Avec n bits, on code 2 puissance n niveaux : 2 puissance 10 = 1 024 (contre 256 en 8 bits)."
  },
  {
    question: "Quel est le débit non compressé d'une image 1920 × 1080 à 25 images/s, en 8 bits et en 4:2:2 ?",
    reponses: [
      "Environ 415 Mbit/s",
      "Environ 622 Mbit/s",
      "Environ 829 Mbit/s",
      "Environ 1 244 Mbit/s"
    ],
    bonne: 2,
    explication: "1920 × 1080 × 25 × 8 bits × 2 échantillons par pixel = 829 440 000 bit/s. Les autres valeurs correspondent à 1 échantillon par pixel (415), au 4:2:0 (622) et au 4:4:4 (1 244)."
  },
  {
    question: "À définition, cadence et quantification identiques, de combien le débit non compressé baisse-t-il en passant du 4:2:2 au 4:2:0 ?",
    reponses: ["10 %", "25 %", "50 %", "75 %"],
    bonne: 1,
    explication: "On passe de 2 à 1,5 échantillon par pixel : 1,5 ÷ 2 = 0,75. Le débit baisse donc de 25 %."
  },
  {
    question: "Pour une incrustation sur fond vert aux contours les plus propres possibles, quelle structure est la plus favorable ?",
    reponses: ["4:1:1", "4:2:0", "4:2:2", "4:4:4"],
    bonne: 3,
    explication: "L'incrustation découpe l'image d'après sa couleur. Plus la chrominance est précise, plus les contours sont nets : le 4:4:4 conserve une information de couleur par pixel."
  },
  {
    question: "D'après le théorème de Shannon, la fréquence d'échantillonnage doit être…",
    reponses: [
      "égale à la fréquence maximale du signal",
      "au moins le double de la fréquence maximale du signal",
      "au moins la moitié de la fréquence maximale du signal",
      "un multiple de 25 Hz"
    ],
    bonne: 1,
    explication: "Pour pouvoir reconstituer le signal sans repliement de spectre, il faut l'échantillonner à une fréquence au moins deux fois supérieure à sa fréquence la plus élevée."
  },
  {
    question: "Quel est le débit d'une liaison HD-SDI ?",
    reponses: ["270 Mbit/s", "1,485 Gbit/s", "2,97 Gbit/s", "12 Gbit/s"],
    bonne: 1,
    explication: "HD-SDI : 1,485 Gbit/s. Pour comparaison : SD-SDI 270 Mbit/s, 3G-SDI 2,97 Gbit/s, 12G-SDI environ 12 Gbit/s."
  }
];
