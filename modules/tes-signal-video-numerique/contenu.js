/* ==========================================================================
   contenu.js — le contenu de l'application « Signal vidéo numérique »
   --------------------------------------------------------------------------
   Ce fichier ne contient QUE du texte : notions, essentiel et questions.
   La mise en page, le menu, l'évaluation et l'enregistrement des notes sont
   faits par js/application.js. Le format est expliqué pas à pas dans
   modules/modele/contenu.js.

   CONTENU À VALIDER : rédigé à partir de connaissances techniques générales,
   pas à partir du référentiel du BTS. Relis et adapte le vocabulaire, le
   niveau et les notions exigées avant de le proposer aux étudiants.
   ========================================================================== */

// Raccourcis pour écrire les questions tirées au sort.
const H = Application.hasard;     // H(1, 6) : un entier entre 1 et 6
const C = Application.choisir;    // C([a, b, c]) : un élément au hasard
const NB = Application.nombre;    // NB(1036.8, 1) : « 1 036,8 »

// Quelques formats d'image, réutilisés par les questions de débit.
const FORMATS = [
  { nom: "SD 576i", l: 720, h: 576 },
  { nom: "HD 720", l: 1280, h: 720 },
  { nom: "HD 1080", l: 1920, h: 1080 },
  { nom: "UHD", l: 3840, h: 2160 }
];
const STRUCT = {
  "4:4:4": { e: 3, ph: 1, pv: 1 },
  "4:2:2": { e: 2, ph: 2, pv: 1 },
  "4:2:0": { e: 1.5, ph: 2, pv: 2 },
  "4:1:1": { e: 1.5, ph: 4, pv: 1 }
};

// Petit schéma SVG d'un bloc de 8 × 2 pixels, pour les questions « Lire » du module 2.
function schemaStructure(nom) {
  const s = STRUCT[nom], c = 40;
  let svg = '<svg viewBox="0 0 330 90" width="330" style="max-width:100%;background:#0b0c0e;border-radius:14px" role="img" aria-label="Bloc de 8 × 2 pixels">';
  for (let y = 0; y < 2; y += s.pv) for (let x = 0; x < 8; x += s.ph) {
    svg += '<rect x="' + (5 + x * c + 3) + '" y="' + (5 + y * c + 3) + '" width="' + (s.ph * c - 6) + '" height="' + (s.pv * c - 6) + '" rx="8" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.45)"/>';
    const cx = 5 + x * c + c / 2, cy = 5 + y * c + (s.pv * c) / 2;
    svg += '<path d="M' + cx + " " + (cy - 12) + "A12 12 0 0 0 " + cx + " " + (cy + 12) + '" fill="none" stroke="#4d8dff" stroke-width="4"/><path d="M' + cx + " " + (cy - 12) + "A12 12 0 0 1 " + cx + " " + (cy + 12) + '" fill="none" stroke="#ff5c4d" stroke-width="4"/>';
  }
  for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) svg += '<circle cx="' + (5 + x * c + c / 2) + '" cy="' + (5 + y * c + c / 2) + '" r="6" fill="#dcdcdc"/>';
  return svg + "</svg>";
}

const APPLICATION = {
  id: "tes-signal-video-numerique",   // IDENTIQUE à l'id de js/catalogue.js
  titre: "Signal vidéo numérique",
  accroche: "Du signal aux bits.",
  option: "tiee",                     // la page d'option vers laquelle revient le menu
  epreuve: "TES",
  intro: "Trois modules pour comprendre comment une image devient une suite de <b>bits</b> : l’échantillonnage et la quantification, l’allègement de la couleur (<b>4:2:2</b>, <b>4:2:0</b>…) et le calcul du <b>débit</b>. Chaque module se termine par une évaluation : obtenez au moins <b>12/20</b> pour débloquer le suivant.",

  modules: [
    /* ======================================================================
       MODULE 1 — NUMÉRISER UN SIGNAL
       ====================================================================== */
    {
      titre: "Numériser un signal",
      nav: "Numériser",
      resume: "Échantillonnage, Shannon, quantification",
      intro: "Un capteur ou un micro produit un signal <b>analogique</b> : une tension qui varie en continu. Pour l’enregistrer ou le transmettre en numérique, on fait deux opérations : on le <b>mesure</b> à intervalles réguliers (échantillonnage), puis on <b>arrondit</b> chaque mesure à un nombre entier (quantification).",
      notions: {
        titre: "Les mots de la numérisation",
        intro: "Numériser, c’est remplacer une courbe continue par une <b>suite de nombres</b>. Deux réglages décident de la qualité : <b>combien de mesures</b> par seconde, et <b>avec quelle précision</b> on écrit chaque mesure.",
        mots: [
          { t: "Signal analogique", ic: "〰️", d: "Une grandeur (souvent une tension) qui varie <b>en continu</b> dans le temps et peut prendre <b>toutes les valeurs</b>. C’est ce que délivre un micro ou un photosite avant conversion.", c: "Une rampe d’accès : on peut s’arrêter à n’importe quelle hauteur." },
          { t: "Signal numérique", ic: "🔢", d: "Une <b>suite de nombres</b>, écrits en binaire (0 et 1). Il ne connaît que des instants précis et des valeurs précises. Il se copie et se transmet <b>sans perte</b>.", c: "Un escalier : on ne peut s’arrêter que sur les marches." },
          { t: "Échantillonnage", ic: "📍", d: "Mesurer le signal à <b>intervalles réguliers</b>. Chaque mesure est un <b>échantillon</b>. Entre deux mesures, on ne sait rien du signal.", c: "Prendre la température toutes les heures : ce qui se passe entre deux relevés est perdu." },
          { t: "Fréquence d’échantillonnage", s: "fe", u: "hertz (Hz)", ic: "⏱️", d: "Le nombre d’échantillons prélevés <b>par seconde</b>. Son inverse, la <b>période d’échantillonnage</b> Te, est le temps entre deux mesures.", r: "CD audio : 44,1 kHz · audio en vidéo : 48 kHz · luminance SD : 13,5 MHz · luminance HD : 74,25 MHz." },
          { t: "Théorème de Shannon", ic: "📐", q: "Que dit le théorème de Shannon (Nyquist-Shannon) ?", d: "Pour pouvoir reconstituer un signal, il faut l’échantillonner à une fréquence <b>au moins double</b> de sa fréquence la plus élevée : <b>fe ≥ 2 × fmax</b>.", c: "Pour savoir qu’une roue tourne, il faut la photographier au moins deux fois par tour.", r: "Oreille : jusqu’à 20 kHz → fe d’au moins 40 kHz, d’où 44,1 et 48 kHz." },
          { t: "Repliement de spectre", ic: "🌀", q: "Qu’est-ce que le repliement de spectre (aliasing) ?", d: "Si l’on échantillonne <b>trop lentement</b>, les échantillons dessinent une fausse sinusoïde, plus lente que la vraie : une fréquence <b>qui n’existait pas</b> apparaît. On la supprime avant la conversion avec un <b>filtre anti-repliement</b> (passe-bas).", c: "Les roues de diligence qui semblent tourner à l’envers au cinéma : 24 images/s ne suffisent pas pour les rayons." },
          { t: "Quantification", ic: "🪜", d: "Arrondir chaque échantillon au <b>niveau le plus proche</b> parmi une liste de niveaux possibles, puis écrire ce niveau en binaire.", c: "Ranger des élèves par taille au centimètre près : 1,734 m devient 1,73 m." },
          { t: "Nombre de bits", s: "n", u: "bit", ic: "🔣", q: "Que représente le nombre de bits de quantification ?", d: "Le nombre de chiffres binaires utilisés pour écrire chaque échantillon. Il fixe le <b>nombre de niveaux</b> : avec n bits, 2<sup>n</sup> niveaux. Chaque bit en plus <b>double</b> le nombre de niveaux.", r: "8 bits : 256 niveaux · 10 bits : 1 024 · 12 bits : 4 096 · audio 24 bits : 16,7 millions." },
          { t: "Erreur de quantification", ic: "🎚️", d: "L’écart entre la vraie valeur et le niveau retenu : au plus <b>un demi-pas</b>. Elle se voit comme du <b>bruit</b> ou, en image, comme des <b>aplats</b> dans les dégradés (effet de « banding »). Plus de bits = erreur plus petite.", c: "Un escalier aux marches plus nombreuses et plus basses ressemble davantage à une rampe." },
          { t: "Convertisseur analogique-numérique", s: "CAN", ic: "🔌", q: "À quoi sert un convertisseur analogique-numérique (CAN) ?", d: "Le circuit qui fait l’échantillonnage et la quantification. Le chemin inverse, pour l’écoute ou l’affichage, est fait par un <b>CNA</b> (convertisseur numérique-analogique)." }
        ],
        formules: [
          { q: "Combien de niveaux permet une quantification sur n bits ?", f: "N = 2<sup>n</sup>", say: "le nombre de niveaux est égal à 2 puissance n", rows: [["N", "nombre de niveaux", "—", "les valeurs possibles d’un échantillon"], ["n", "nombre de bits", "bit", "la précision de chaque échantillon"]], ex: "10 bits : 2<sup>10</sup> = 2 × 2 × … × 2 (10 fois) = 1 024 niveaux." },
          { q: "Quelle fréquence d’échantillonnage minimale choisir ?", f: "fe ≥ 2 × fmax", say: "la fréquence d’échantillonnage doit être au moins le double de la fréquence maximale du signal", rows: [["fe", "fréquence d’échantillonnage", "Hz", "mesures par seconde"], ["fmax", "fréquence la plus haute du signal", "Hz", "après le filtre anti-repliement"]], ex: "Signal audio jusqu’à 20 kHz : fe ≥ 2 × 20 = 40 kHz." },
          { q: "Comment passer de la fréquence d’échantillonnage au temps entre deux mesures ?", f: "Te = 1 / fe", say: "la période d’échantillonnage est égale à un divisé par la fréquence d’échantillonnage", rows: [["Te", "période d’échantillonnage", "s", "le temps entre deux échantillons"], ["fe", "fréquence d’échantillonnage", "Hz", ""]], ex: "48 kHz : Te = 1 / 48 000 ≈ 0,0000208 s ≈ 20,8 µs." }
        ]
      },
      manipuler: {
        titre: "Échantillonner et quantifier une sinusoïde",
        intro: "Changez la fréquence du signal, la fréquence d’échantillonnage et le nombre de bits. Observez quand le signal reconstitué ressemble à l’original… et quand une <b>fausse fréquence</b> apparaît."
      },
      essentiel: {
        definitions: [
          "<b>Échantillonner</b> : mesurer le signal à intervalles réguliers (fe mesures par seconde).",
          "<b>Quantifier</b> : arrondir chaque mesure au niveau le plus proche, codé sur n bits.",
          "<b>Repliement</b> : fausse fréquence créée par un échantillonnage trop lent ; évité par le filtre anti-repliement.",
          "<b>Erreur de quantification</b> : au plus un demi-pas ; elle diminue quand on ajoute des bits."
        ],
        formules: [["N = 2<sup>n</sup>", "niveaux = 2 puissance (nombre de bits)"], ["fe ≥ 2 × fmax", "théorème de Shannon"], ["Te = 1 / fe", "temps entre deux échantillons"]],
        reperes: ["8 bits = 256 niveaux · 10 bits = 1 024 · 12 bits = 4 096.", "Audio : 48 kHz en vidéo, 44,1 kHz pour le CD.", "Un bit de plus = deux fois plus de niveaux."],
        pieges: ["2<sup>10</sup> n’est pas 2 × 10 : c’est 2 multiplié par lui-même 10 fois.", "Shannon porte sur la fréquence <b>maximale</b> du signal, pas sur sa fréquence moyenne.", "Plus de bits n’augmente pas le nombre d’échantillons : cela augmente leur <b>précision</b>."]
      },
      evaluation: {
        lire: [
          () => { const fe = C([44.1, 48, 96]), b = C([16, 24]); return { type: "nombre", contexte: "Fiche technique d’un enregistreur : « Audio PCM " + NB(fe) + " kHz / " + b + " bits ».", question: "Quelle est la fréquence d’échantillonnage, en kHz ?", reponse: fe, unite: "kHz", ecart: 0.01, explication: "La fréquence d’échantillonnage s’écrit en kHz : " + NB(fe) + " kHz. Le second nombre (" + b + " bits) est la quantification.", indice: "Cherchez le nombre suivi de « kHz »." }; },
          () => { const b = C([8, 10, 12]), st = C(["4:2:2", "4:2:0"]); return { type: "nombre", contexte: "Fiche technique d’une caméra : « Enregistrement " + st + " " + b + " bits, 1920 × 1080 ».", question: "Sur combien de bits chaque échantillon est-il quantifié ?", reponse: b, unite: "bits", ecart: 0, explication: "« " + b + " bits » indique la quantification de chaque échantillon. " + st + " est la structure d’échantillonnage de la couleur.", indice: "Le nombre de bits est écrit juste avant le mot « bits »." }; },
          () => { const n = C([8, 10, 12]); return { type: "qcm", contexte: "Un tableau indique : « 8 bits → 256 niveaux · 10 bits → 1 024 niveaux · 12 bits → 4 096 niveaux ».", question: "Combien de niveaux offre une quantification sur " + n + " bits ?", bonne: NB(Math.pow(2, n), 0) + " niveaux", mauvaises: [8, 10, 12].filter(x => x !== n).map(x => NB(Math.pow(2, x), 0) + " niveaux").concat([NB(n * 2, 0) + " niveaux"]), explication: n + " bits donnent 2<sup>" + n + "</sup> = " + NB(Math.pow(2, n), 0) + " niveaux.", indice: "Lisez la ligne du tableau qui commence par " + n + " bits." }; }
        ],
        comprendre: [
          ["Un signal numérique peut être copié de nombreuses fois sans perte de qualité.", true, "C’est son grand avantage : on recopie des nombres, sans le bruit qui s’accumule à chaque copie analogique."],
          ["Ajouter des bits de quantification augmente le nombre d’échantillons par seconde.", false, "Les bits fixent la <b>précision</b> de chaque échantillon. Le nombre d’échantillons par seconde, c’est la fréquence d’échantillonnage.", "Deux réglages différents : combien de mesures, et avec quelle précision."],
          ["Si la fréquence d’échantillonnage est trop faible, une fréquence qui n’existait pas peut apparaître.", true, "C’est le repliement de spectre (aliasing) : les échantillons dessinent une sinusoïde plus lente que la vraie."],
          ["Passer de 8 à 9 bits double le nombre de niveaux de quantification.", true, "2<sup>9</sup> = 512 = 2 × 256. Chaque bit supplémentaire double le nombre de niveaux."],
          ["L’erreur de quantification peut atteindre plusieurs pas.", false, "On arrondit au niveau le plus proche : l’erreur est au plus d’<b>un demi-pas</b>."],
          ["Le filtre anti-repliement est placé avant l’échantillonnage.", true, "Il supprime les fréquences trop hautes AVANT la conversion ; après, le repliement est déjà mélangé au signal."]
        ],
        qcm: [
          ["Quelles sont les deux opérations de la numérisation ?", "L’échantillonnage puis la quantification", ["La compression puis la modulation", "L’amplification puis le filtrage", "Le codage couleur puis la compression"], "Échantillonner (mesurer à intervalles réguliers) puis quantifier (arrondir chaque mesure)."],
          ["D’après Shannon, quelle fréquence d’échantillonnage minimale pour un signal dont la fréquence maximale est 6 MHz ?", "12 MHz", ["6 MHz", "3 MHz", "24 MHz"], "fe ≥ 2 × fmax = 2 × 6 = 12 MHz."],
          ["Quel défaut d’image une quantification trop pauvre provoque-t-elle dans un ciel dégradé ?", "Des aplats en bandes (« banding »)", ["Du flou de bougé", "Un repliement en moiré", "Une dominante colorée"], "Trop peu de niveaux : le dégradé devient un escalier de bandes visibles."],
          ["Que mesure la fréquence d’échantillonnage ?", "Le nombre d’échantillons prélevés par seconde", ["Le nombre de bits par échantillon", "La fréquence maximale du signal", "Le nombre de niveaux de quantification"], "fe en hertz = nombre de mesures par seconde."],
          ["Pourquoi l’audio des caméras est-il échantillonné à 48 kHz ?", "Pour dépasser le double de 20 kHz, limite de l’audition", ["Parce que 48 est un multiple de 24 images/s", "Pour réduire le nombre de bits", "Parce que le son est quantifié sur 48 bits"], "L’oreille entend jusqu’à 20 kHz environ : il faut fe ≥ 40 kHz. 48 kHz laisse de la marge au filtre anti-repliement."]
        ],
        calculer: [
          () => { const n = H(6, 14); return { type: "nombre", question: "Combien de niveaux de quantification offre un codage sur <b>" + n + " bits</b> ?", reponse: Math.pow(2, n), unite: "niveaux", tolerance: 0, explication: "N = 2<sup>" + n + "</sup> = " + NB(Math.pow(2, n), 0) + " niveaux.", indice: "N = 2<sup>n</sup> : multipliez 2 par lui-même " + n + " fois (touche x<sup>y</sup> ou ^ de la calculatrice)." }; },
          () => { const f = C([4, 5.5, 6, 7.5, 15, 18, 20, 22]); return { type: "nombre", question: "Un signal contient des fréquences jusqu’à <b>" + NB(f) + " kHz</b>. Quelle est la fréquence d’échantillonnage minimale imposée par Shannon, en kHz ?", reponse: 2 * f, unite: "kHz", explication: "fe ≥ 2 × fmax = 2 × " + NB(f) + " = " + NB(2 * f) + " kHz.", indice: "Shannon : fe ≥ 2 × fmax." }; },
          () => { const fe = C([8, 16, 32, 44.1, 48, 96]); return { type: "nombre", question: "Un signal est échantillonné à <b>" + NB(fe) + " kHz</b>. Quel temps sépare deux échantillons, en microsecondes (µs) ?", reponse: 1000 / fe, unite: "µs", explication: "Te = 1 / fe = 1 / " + NB(fe * 1000, 0) + " Hz ≈ " + NB(1000 / fe, 2) + " µs (1 s = 1 000 000 µs).", indice: "Te = 1 / fe. Avec fe en kHz, 1000 / fe donne directement des µs." }; },
          () => { const N = C([64, 128, 256, 512, 1024, 4096]); const n = Math.log2(N); return { type: "nombre", question: "Combien de bits faut-il pour coder <b>" + NB(N, 0) + " niveaux</b> ?", reponse: n, unite: "bits", tolerance: 0, explication: "2<sup>" + n + "</sup> = " + NB(N, 0) + " : il faut " + n + " bits.", indice: "Cherchez la puissance de 2 qui donne " + NB(N, 0) + " : 2, 4, 8, 16, 32…" }; },
          () => { const fe = C([44.1, 48]), d = H(2, 9); return { type: "nombre", question: "Un son mono est échantillonné à <b>" + NB(fe) + " kHz</b>. Combien d’échantillons sont prélevés en <b>" + d + " secondes</b> ?", reponse: fe * 1000 * d, unite: "échantillons", explication: NB(fe * 1000, 0) + " échantillons par seconde × " + d + " s = " + NB(fe * 1000 * d, 0) + " échantillons.", indice: "fe est le nombre d’échantillons par seconde." }; }
        ],
        exercice: [
          () => { const f = C([15, 18, 20]), fe = C([32, 44.1, 48]), n = C([16, 24]); return { type: "exercice", question: "Un micro capte des sons jusqu’à <b>" + f + " kHz</b>. L’enregistreur échantillonne à <b>" + NB(fe) + " kHz</b> sur <b>" + n + " bits</b>.", etapes: [
            { question: "Fréquence d’échantillonnage minimale imposée par Shannon (kHz) ?", reponse: 2 * f, unite: "kHz" },
            { question: "Le réglage de l’enregistreur respecte-t-il Shannon ?", bonne: fe >= 2 * f ? "Oui : fe est au moins le double de fmax" : "Non : fe est inférieure au double de fmax", mauvaises: [fe >= 2 * f ? "Non : fe est inférieure au double de fmax" : "Oui : fe est au moins le double de fmax"] },
            { question: "Nombre de niveaux de quantification ?", reponse: Math.pow(2, n), unite: "niveaux", tolerance: 0 }
          ], solution: "a) 2 × " + f + " = " + 2 * f + " kHz. b) " + NB(fe) + " kHz " + (fe >= 2 * f ? "≥" : "<") + " " + 2 * f + " kHz. c) 2<sup>" + n + "</sup> = " + NB(Math.pow(2, n), 0) + " niveaux.", indice: "a) fe ≥ 2 × fmax. c) N = 2<sup>n</sup>." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 2 — LA COULEUR ALLÉGÉE : Y, Cb, Cr ET SOUS-ÉCHANTILLONNAGE
       ====================================================================== */
    {
      titre: "Y, Cb, Cr et le sous-échantillonnage",
      nav: "Chrominance",
      resume: "4:4:4, 4:2:2, 4:2:0, 4:1:1",
      intro: "L’œil voit les détails de <b>lumière</b> bien plus finement que les détails de <b>couleur</b>. La vidéo en profite : elle sépare la luminance de la chrominance, puis transmet <b>moins d’échantillons de couleur</b>. C’est ce que disent les notations 4:2:2 ou 4:2:0.",
      notions: {
        titre: "Lumière d’un côté, couleur de l’autre",
        intro: "Une caméra capte du <b>rouge</b>, du <b>vert</b> et du <b>bleu</b>. Pour transmettre l’image, on les recombine en une image noir et blanc (<b>Y</b>) et deux signaux de couleur (<b>Cb</b>, <b>Cr</b>), que l’on peut alléger.",
        mots: [
          { t: "RVB (RGB)", ic: "🎨", d: "Les trois couleurs primaires captées par la caméra et affichées par l’écran : <b>rouge, vert, bleu</b>. Trois signaux complets, aussi détaillés les uns que les autres." },
          { t: "Luminance", s: "Y", ic: "⚪", d: "L’image <b>en noir et blanc</b> : la quantité de lumière de chaque pixel. Elle porte les <b>détails</b> et la netteté. Elle est calculée à partir de R, V et B, le vert pesant le plus.", c: "Une photo en noir et blanc : on reconnaît tout, même sans couleur." },
          { t: "Chrominance", s: "Cb, Cr", ic: "🌈", d: "L’information de <b>couleur seule</b>, portée par deux signaux de <b>différence de couleur</b> : Cb (bleu − Y) et Cr (rouge − Y). Le vert se retrouve par calcul.", c: "Un coloriage posé sur la photo noir et blanc." },
          { t: "Sous-échantillonnage de la chrominance", ic: "🧩", q: "Qu’est-ce que le sous-échantillonnage de la chrominance ?", d: "Garder <b>tous</b> les échantillons de Y mais <b>moins</b> d’échantillons de Cb et Cr : plusieurs pixels voisins partagent la même couleur. On allège le signal là où l’œil voit le moins la perte.", c: "Colorier au gros feutre un dessin tracé au crayon fin : les traits restent nets." },
          { t: "Notation J:a:b", ic: "🔢", q: "Comment lire une notation comme 4:2:2 ?", d: "On regarde un bloc de <b>4 pixels de large sur 2 lignes</b>. Le 1<sup>er</sup> chiffre (4) est la largeur du bloc ; le 2<sup>e</sup>, le nombre d’échantillons de chrominance sur la <b>1<sup>re</sup> ligne</b> ; le 3<sup>e</sup>, le nombre de <b>nouveaux</b> échantillons sur la <b>2<sup>e</sup> ligne</b> (0 = elle réutilise ceux de la 1<sup>re</sup>)." },
          { t: "4:4:4", ic: "🟩", d: "Aucune réduction : chaque pixel a sa luminance et sa chrominance. <b>3 échantillons par pixel</b>.", r: "Étalonnage, effets visuels, incrustation exigeante." },
          { t: "4:2:2", ic: "🟨", d: "Chrominance divisée par <b>2 en horizontal</b>, complète en vertical. <b>2 échantillons par pixel</b>.", r: "Production et régie, liaisons SDI." },
          { t: "4:2:0", ic: "🟧", d: "Chrominance divisée par <b>2 en horizontal ET en vertical</b> : une couleur pour un carré de 2 × 2 pixels. <b>1,5 échantillon par pixel</b>. Le « 0 » ne veut pas dire « pas de Cb ».", r: "Diffusion TNT, streaming, Blu-ray, nombreuses caméras légères." },
          { t: "4:1:1", ic: "🟥", d: "Chrominance divisée par <b>4 en horizontal</b>, complète en vertical. Autant de données que le 4:2:0 (1,5 échantillon par pixel), mais toute la perte est horizontale.", r: "Format DV (NTSC)." }
        ],
        formules: [
          { q: "Comment calcule-t-on la luminance Y en HD ?", f: "Y = 0,2126 R + 0,7152 V + 0,0722 B", say: "la luminance est égale à 0,2126 fois le rouge, plus 0,7152 fois le vert, plus 0,0722 fois le bleu", rows: [["Y", "luminance", "—", "l’image noir et blanc"], ["R, V, B", "rouge, vert, bleu", "—", "de 0 à 255 en 8 bits"], ["0,7152", "poids du vert", "—", "l’œil est le plus sensible au vert"]], ex: "Blanc (255, 255, 255) : Y = 255. Vert pur (0, 255, 0) : Y ≈ 182. Bleu pur : Y ≈ 18 seulement." },
          { q: "Combien d’échantillons par pixel selon la structure ?", f: "e = 1 + 2 / (pH × pV)", say: "le nombre d’échantillons par pixel est égal à un, plus deux divisé par le nombre de pixels qui partagent la même couleur", rows: [["e", "échantillons par pixel", "—", "Y + Cb + Cr, en moyenne"], ["1", "la luminance", "—", "toujours un échantillon par pixel"], ["2", "Cb et Cr", "—", "deux signaux de couleur"], ["pH × pV", "pixels par groupe de couleur", "—", "1 en 4:4:4, 2 en 4:2:2, 4 en 4:2:0 et 4:1:1"]], ex: "4:2:0 : 1 + 2 / (2 × 2) = 1 + 0,5 = 1,5 échantillon par pixel." }
        ]
      },
      manipuler: {
        titre: "Que devient la couleur ?",
        intro: "Choisissez une structure et observez à la fois <b>où</b> sont prélevés les échantillons de couleur et l’<b>effet</b> sur une image test volontairement difficile."
      },
      essentiel: {
        definitions: [
          "<b>Y</b> : luminance, l’image noir et blanc, qui porte les détails.",
          "<b>Cb, Cr</b> : chrominance, deux signaux de différence de couleur (B − Y et R − Y).",
          "<b>Sous-échantillonnage</b> : moins d’échantillons de chrominance, jamais moins de luminance.",
          "<b>J:a:b</b> : bloc de 4 × 2 pixels ; a = échantillons de couleur sur la 1<sup>re</sup> ligne, b = nouveaux sur la 2<sup>e</sup>."
        ],
        formules: [["Y = 0,2126 R + 0,7152 V + 0,0722 B", "luminance en HD (BT.709)"], ["e = 1 + 2 / (pH × pV)", "4:4:4 → 3 · 4:2:2 → 2 · 4:2:0 et 4:1:1 → 1,5"]],
        reperes: ["4:2:2 = 2/3 des données du 4:4:4 · 4:2:0 = la moitié.", "Production et SDI : 4:2:2 · diffusion : 4:2:0 · effets visuels : 4:4:4.", "En 4:2:0, Cb et Cr ne gardent qu’un quart de leurs échantillons."],
        pieges: ["Le « 0 » de 4:2:0 ne supprime pas Cb : il signifie que la 2<sup>e</sup> ligne réutilise la couleur de la 1<sup>re</sup>.", "4:2:0 et 4:1:1 ont le même débit, mais pas la même perte (2 × 2 contre 4 × 1).", "Le sous-échantillonnage ne touche jamais la luminance : la netteté est conservée."]
      },
      evaluation: {
        lire: [
          () => { const nom = C(["4:4:4", "4:2:2", "4:2:0", "4:1:1"]); return { type: "qcm", question: "Ce schéma montre un bloc de 8 × 2 pixels : disque gris = échantillon de Y, anneau bleu et rouge = échantillon de Cb et Cr, cadre = pixels qui partagent la même couleur. Quelle structure représente-t-il ?", figure: schemaStructure(nom), bonne: nom, mauvaises: ["4:4:4", "4:2:2", "4:2:0", "4:1:1"].filter(x => x !== nom), explication: "En " + nom + ", une même couleur est partagée par " + STRUCT[nom].ph + " pixel(s) en largeur et " + STRUCT[nom].pv + " ligne(s) en hauteur.", indice: "Comptez combien de pixels contient chaque cadre, en largeur et en hauteur." }; },
          () => { const st = C(["4:2:2", "4:2:0"]); return { type: "qcm", contexte: "Fiche technique d’un encodeur : « Sortie H.264, 1920 × 1080, " + st + ", 8 bits ».", question: "Quelle information donne la mention « " + st + " » ?", bonne: "La structure d’échantillonnage de la chrominance", mauvaises: ["Le format d’image (rapport largeur / hauteur)", "Le nombre de bits par échantillon", "La cadence en images par seconde"], explication: st + " est une structure d’échantillonnage : elle dit combien d’échantillons de couleur on garde.", indice: "Les nombres séparés par deux-points décrivent la couleur." }; }
        ],
        comprendre: [
          ["En 4:2:0, la composante Cb est supprimée.", false, "Le « 0 » signifie que la 2<sup>e</sup> ligne réutilise les échantillons de la 1<sup>re</sup> : Cb et Cr gardent un échantillon pour 2 × 2 pixels.", "Relisez la définition de la notation J:a:b."],
          ["Le sous-échantillonnage de la chrominance réduit aussi le nombre d’échantillons de luminance.", false, "La luminance est toujours complète : un échantillon de Y par pixel, quelle que soit la structure."],
          ["Le 4:2:0 et le 4:1:1 produisent la même quantité de données.", true, "Tous deux ont 1,5 échantillon par pixel ; la perte est répartie différemment (2 × 2 contre 4 × 1)."],
          ["Dans le calcul de Y, c’est le vert qui pèse le plus.", true, "Coefficient 0,7152 : l’œil est surtout sensible au vert."],
          ["Le 4:4:4 est préférable pour une incrustation sur fond vert exigeante.", true, "L’incrustation découpe l’image d’après sa couleur : une couleur par pixel donne des contours plus nets."],
          ["En 4:2:2, la résolution verticale de la couleur est divisée par deux.", false, "En 4:2:2, seule la résolution horizontale de la couleur est divisée par deux ; chaque ligne garde sa couleur."]
        ],
        qcm: [
          ["Pourquoi peut-on transmettre moins d’échantillons de chrominance que de luminance ?", "Parce que l’œil perçoit moins bien les détails de couleur que les détails de lumière", ["Parce que les capteurs ne mesurent pas la couleur", "Parce que les écrans n’affichent que la luminance", "Parce que la chrominance est toujours compressée"], "Le sous-échantillonnage exploite une limite de la vision."],
          ["En 4:2:2, combien de pixels voisins partagent la même chrominance ?", "2 pixels voisins d’une même ligne", ["4 pixels d’une même ligne", "Un carré de 2 × 2 pixels", "Aucun : chaque pixel a sa couleur"], "4:2:2 : chrominance divisée par 2 en horizontal seulement."],
          ["Quelle structure est la plus utilisée pour la diffusion (TNT, streaming) ?", "4:2:0", ["4:4:4", "4:2:2", "4:1:1"], "Le 4:2:0 réduit fortement le débit, avec une perte peu visible à l’écran."],
          ["Que représente Cr ?", "La différence entre le rouge et la luminance (R − Y)", ["Le rouge seul", "La luminance du rouge", "La couleur complémentaire du rouge"], "Cb ≈ B − Y et Cr ≈ R − Y, à un coefficient près."],
          ["Combien d’échantillons par pixel en 4:2:2 ?", "2", ["3", "1,5", "1"], "1 (Y) + 2 / 2 (Cb et Cr partagés par 2 pixels) = 2."]
        ],
        calculer: [
          () => { const nom = C(["4:4:4", "4:2:2", "4:2:0", "4:1:1"]); return { type: "nombre", question: "Combien d’échantillons par pixel, en moyenne, dans une structure <b>" + nom + "</b> ?", reponse: STRUCT[nom].e, unite: "échantillons", ecart: 0.01, explication: "e = 1 + 2 / (" + STRUCT[nom].ph + " × " + STRUCT[nom].pv + ") = " + NB(STRUCT[nom].e) + ".", indice: "e = 1 + 2 / (pixels qui partagent la même couleur)." }; },
          () => { const l = C([720, 1280, 1920, 3840]), nom = C(["4:2:2", "4:1:1"]); const k = l / STRUCT[nom].ph; return { type: "nombre", question: "Une ligne d’image compte <b>" + l + " pixels</b>. En <b>" + nom + "</b>, combien d’échantillons de <b>Cb</b> contient-elle ?", reponse: k, unite: "échantillons", tolerance: 0, explication: "En " + nom + ", Cb est partagé par " + STRUCT[nom].ph + " pixels d’une ligne : " + l + " / " + STRUCT[nom].ph + " = " + k + ".", indice: "Divisez le nombre de pixels par le nombre de pixels qui partagent un même Cb." }; },
          () => { const a = C(["4:2:2", "4:2:0", "4:1:1"]); const p = STRUCT[a].e / 3 * 100; return { type: "nombre", question: "Quelle part des données du 4:4:4 reste-t-il en <b>" + a + "</b>, en pourcentage ?", reponse: p, unite: "%", ecart: 0.6, explication: NB(STRUCT[a].e) + " / 3 = " + NB(p, 1) + " %.", indice: "4:4:4 = 3 échantillons par pixel. Divisez les échantillons de " + a + " par 3." }; },
          () => { const R = H(0, 255), V = H(0, 255), B = H(0, 255); const Y = 0.2126 * R + 0.7152 * V + 0.0722 * B; return { type: "nombre", question: "Un pixel vaut R = <b>" + R + "</b>, V = <b>" + V + "</b>, B = <b>" + B + "</b>. Calculez sa luminance Y (formule HD).", reponse: Y, unite: "", ecart: 1.5, explication: "Y = 0,2126 × " + R + " + 0,7152 × " + V + " + 0,0722 × " + B + " ≈ " + NB(Y, 1) + ".", indice: "Y = 0,2126 R + 0,7152 V + 0,0722 B." }; }
        ],
        exercice: [
          () => { const f = C(FORMATS.slice(1)); const nom = C(["4:2:2", "4:2:0"]); const s = STRUCT[nom]; return { type: "exercice", question: "Une image " + f.nom + " (" + f.l + " × " + f.h + " pixels) est codée en <b>" + nom + "</b>.", etapes: [
            { question: "Nombre d’échantillons de Y dans l’image ?", reponse: f.l * f.h, unite: "échantillons", tolerance: 0.001 },
            { question: "Nombre d’échantillons de Cb dans l’image ?", reponse: f.l * f.h / (s.ph * s.pv), unite: "échantillons", tolerance: 0.001 },
            { question: "Nombre total d’échantillons (Y + Cb + Cr) ?", reponse: f.l * f.h * s.e, unite: "échantillons", tolerance: 0.001 }
          ], solution: "a) " + f.l + " × " + f.h + " = " + NB(f.l * f.h, 0) + ". b) " + NB(f.l * f.h, 0) + " / " + s.ph * s.pv + " = " + NB(f.l * f.h / (s.ph * s.pv), 0) + ". c) " + NB(f.l * f.h, 0) + " + 2 × " + NB(f.l * f.h / (s.ph * s.pv), 0) + " = " + NB(f.l * f.h * s.e, 0) + ".", indice: "Y : un par pixel. Cb : un pour " + s.ph * s.pv + " pixels. Total = Y + Cb + Cr." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 3 — LE DÉBIT D'UN SIGNAL NON COMPRESSÉ
       ====================================================================== */
    {
      titre: "Le débit d’un signal vidéo non compressé",
      nav: "Débit",
      resume: "Calcul du débit, liaisons SDI",
      intro: "Combien de bits faut-il transmettre chaque seconde pour une image HD ? On multiplie simplement tout ce qui compte : les <b>pixels</b>, les <b>images par seconde</b>, les <b>bits</b> par échantillon et les <b>échantillons</b> par pixel.",
      notions: {
        titre: "Compter les bits",
        intro: "Le débit se calcule comme un <b>volume</b> : nombre de pixels × nombre d’images × poids de chaque pixel. Les ordres de grandeur sont vite énormes : on parle en <b>Mbit/s</b> et en <b>Gbit/s</b>.",
        mots: [
          { t: "Débit binaire", u: "bit/s", ic: "🚿", d: "Le nombre de <b>bits transmis chaque seconde</b>. Il décide du câble, de l’enregistreur et du support nécessaires.", c: "Le débit d’un tuyau : des litres par seconde, ici des bits par seconde." },
          { t: "Définition", u: "pixels", ic: "🔲", d: "Le nombre de pixels de l’image : <b>largeur × hauteur</b>.", r: "SD : 720 × 576 · HD : 1920 × 1080 · UHD : 3840 × 2160." },
          { t: "Cadence", u: "images/s", ic: "🎞️", d: "Le nombre d’images par seconde. En Europe : 25 ou 50 ; cinéma : 24.", r: "25p, 50i (50 trames, soit 25 images), 50p." },
          { t: "Bit et octet", ic: "💾", q: "Quelle différence entre un bit et un octet ?", d: "Le <b>bit</b> (b) est un 0 ou un 1. Un <b>octet</b> (o, ou byte, B) regroupe <b>8 bits</b>. Les débits s’écrivent en bits, les tailles de fichiers en octets.", c: "Un bit = une lettre ; un octet = un mot de 8 lettres." },
          { t: "Préfixes k, M, G", ic: "📏", q: "Que valent les préfixes kilo, méga, giga ?", d: "kilo = 1 000 · méga = 1 000 000 · giga = 1 000 000 000. 1 Gbit/s = 1 000 Mbit/s.", r: "1 036 800 000 bit/s ≈ 1 037 Mbit/s ≈ 1,04 Gbit/s." },
          { t: "Liaison SDI", ic: "🔗", d: "La liaison vidéo numérique des régies (câble coaxial BNC). Chaque génération a un débit fixe.", r: "SD-SDI : 270 Mbit/s · HD-SDI : 1,485 Gbit/s · 3G-SDI : 2,97 Gbit/s · 12G-SDI : 11,88 Gbit/s." },
          { t: "Intervalles de suppression", ic: "⏸️", d: "Des moments du signal sans image utile (retours de ligne et de trame). Le SDI les transmet aussi : ils servent à l’<b>audio embarqué</b> et aux données. C’est pourquoi le débit d’une liaison dépasse celui de l’image seule." },
          { t: "Compression", ic: "🗜️", d: "Réduire le nombre de bits en supprimant les redondances (et parfois des détails peu visibles). Le débit calculé ici est celui du signal <b>non compressé</b>." }
        ],
        formules: [
          { q: "Comment calculer le débit d’un signal vidéo non compressé ?", f: "D = L × H × i × n × e", say: "le débit est égal à la largeur fois la hauteur, fois les images par seconde, fois les bits par échantillon, fois les échantillons par pixel", rows: [["D", "débit", "bit/s", "image active seule"], ["L × H", "définition", "pixels", "largeur × hauteur"], ["i", "cadence", "images/s", "25, 50…"], ["n", "quantification", "bits", "8, 10, 12"], ["e", "échantillons par pixel", "—", "3 · 2 · 1,5 selon la structure"]], ex: "1920 × 1080 × 25 × 10 × 2 = 1 036 800 000 bit/s ≈ 1,04 Gbit/s (HD 4:2:2 10 bits)." },
          { q: "Comment passer d’un débit à une taille de fichier ?", f: "Taille (octets) = D × durée / 8", say: "la taille est égale au débit multiplié par la durée, divisé par huit", rows: [["D", "débit", "bit/s", ""], ["durée", "durée d’enregistrement", "s", "1 min = 60 s"], ["8", "bits par octet", "—", "on passe des bits aux octets"]], ex: "1,04 Gbit/s pendant 60 s : 1,04 × 60 / 8 ≈ 7,8 Go." }
        ]
      },
      manipuler: {
        titre: "Le calculateur de débit",
        intro: "Changez la définition, la cadence, la quantification et la structure : le calcul se refait pas à pas, et la jauge montre quelle liaison SDI pourrait transporter ce signal."
      },
      essentiel: {
        definitions: ["<b>Débit</b> : bits transmis par seconde (bit/s).", "<b>Octet</b> : 8 bits. Débits en bits, fichiers en octets.", "<b>SDI</b> : liaison de régie à débit fixe, qui transporte aussi les intervalles de suppression."],
        formules: [["D = L × H × i × n × e", "e = 3 (4:4:4), 2 (4:2:2), 1,5 (4:2:0)"], ["Taille = D × durée / 8", "en octets"]],
        reperes: ["HD 1080 25p 10 bits 4:2:2 ≈ 1,04 Gbit/s.", "HD-SDI : 1,485 Gbit/s · 3G-SDI : 2,97 Gbit/s · 12G-SDI : 11,88 Gbit/s.", "Passer de 25 à 50 images/s double le débit."],
        pieges: ["Ne pas oublier les échantillons par pixel (e) : sans eux, on calcule la luminance seule.", "Diviser par 8 pour passer des bits aux octets, pas l’inverse.", "1 Gbit/s = 1 000 Mbit/s (et non 1 024 en débit)."]
      },
      evaluation: {
        lire: [
          () => { const i = C([25, 50]); return { type: "nombre", contexte: "Réglage du mélangeur : « 1080p" + i + " · 4:2:2 · 10 bits ».", question: "Quelle est la cadence, en images par seconde ?", reponse: i, unite: "images/s", tolerance: 0, explication: "« p" + i + " » : " + i + " images progressives par seconde.", indice: "Le nombre après la lettre p." }; },
          () => { const lien = C([["SD-SDI", 0.27], ["HD-SDI", 1.485], ["3G-SDI", 2.97], ["12G-SDI", 11.88]]); return { type: "nombre", contexte: "Tableau des liaisons : SD-SDI 270 Mbit/s · HD-SDI 1,485 Gbit/s · 3G-SDI 2,97 Gbit/s · 12G-SDI 11,88 Gbit/s.", question: "Quel est le débit d’une liaison <b>" + lien[0] + "</b>, en Gbit/s ?", reponse: lien[1], unite: "Gbit/s", ecart: 0.002, explication: lien[0] + " : " + NB(lien[1], 3) + " Gbit/s.", indice: "270 Mbit/s = 0,27 Gbit/s." }; }
        ],
        comprendre: [
          ["Doubler la cadence double le débit non compressé.", true, "Le débit est proportionnel à chaque facteur de la formule, dont la cadence."],
          ["Un octet contient 10 bits.", false, "Un octet = 8 bits."],
          ["Le débit d’une liaison HD-SDI est plus élevé que celui de l’image HD seule, car il transporte aussi les intervalles de suppression.", true, "Ces intervalles servent notamment à l’audio embarqué et aux données auxiliaires."],
          ["Passer du 4:2:2 au 4:2:0 réduit le débit de moitié.", false, "On passe de 2 à 1,5 échantillon par pixel : le débit baisse de 25 %.", "Comparez les échantillons par pixel."],
          ["Passer de 8 à 10 bits augmente le débit de 25 %.", true, "10 / 8 = 1,25."]
        ],
        qcm: [
          ["Quel débit pour un signal HD 1920 × 1080, 25 images/s, 8 bits, 4:2:2 ?", "Environ 829 Mbit/s", ["Environ 415 Mbit/s", "Environ 622 Mbit/s", "Environ 1 244 Mbit/s"], "1920 × 1080 × 25 × 8 × 2 = 829 440 000 bit/s. 415 = un seul échantillon par pixel, 622 = 4:2:0, 1 244 = 4:4:4."],
          ["Quel est le débit d’une liaison HD-SDI ?", "1,485 Gbit/s", ["270 Mbit/s", "2,97 Gbit/s", "12 Gbit/s"], "SD-SDI 270 Mbit/s, HD-SDI 1,485 Gbit/s, 3G-SDI 2,97 Gbit/s, 12G-SDI ≈ 12 Gbit/s."],
          ["Quelle liaison transporte un signal UHD 50p en un seul câble ?", "12G-SDI", ["HD-SDI", "3G-SDI", "SD-SDI"], "En 10 bits 4:2:2, l’image UHD 50p seule dépasse déjà 8 Gbit/s ; avec les intervalles de suppression, il faut le 12G-SDI (ou 4 liaisons 3G-SDI)."],
          ["Comment convertir un débit en Mbit/s vers des Mo par seconde ?", "Diviser par 8", ["Multiplier par 8", "Diviser par 1 024", "Multiplier par 1 000"], "1 octet = 8 bits : Mo/s = Mbit/s ÷ 8."]
        ],
        calculer: [
          () => { const f = C(FORMATS), i = C([25, 50]), n = C([8, 10]), st = C(["4:2:2", "4:2:0", "4:4:4"]); const D = f.l * f.h * i * n * STRUCT[st].e / 1e6; return { type: "nombre", question: "Calculez le débit non compressé (image active) d’un signal <b>" + f.l + " × " + f.h + "</b>, <b>" + i + " images/s</b>, <b>" + n + " bits</b>, <b>" + st + "</b>, en Mbit/s.", reponse: D, unite: "Mbit/s", explication: f.l + " × " + f.h + " × " + i + " × " + n + " × " + NB(STRUCT[st].e) + " = " + NB(D * 1e6, 0) + " bit/s ≈ " + NB(D, 1) + " Mbit/s.", indice: "D = L × H × i × n × e, puis divisez par 1 000 000 pour obtenir des Mbit/s." }; },
          () => { const D = C([270, 829, 1037, 1485, 2970]); return { type: "nombre", question: "Un signal a un débit de <b>" + NB(D, 0) + " Mbit/s</b>. Combien de mégaoctets (Mo) occupe <b>une seconde</b> d’enregistrement ?", reponse: D / 8, unite: "Mo", explication: NB(D, 0) + " / 8 ≈ " + NB(D / 8, 1) + " Mo.", indice: "8 bits = 1 octet." }; },
          () => { const D = C([0.83, 1.04, 1.24, 2.07]), min = H(2, 30); return { type: "nombre", question: "Un enregistrement non compressé dure <b>" + min + " minutes</b> à <b>" + NB(D) + " Gbit/s</b>. Quelle est sa taille, en gigaoctets (Go) ?", reponse: D * min * 60 / 8, unite: "Go", explication: NB(D) + " × " + min * 60 + " s / 8 ≈ " + NB(D * min * 60 / 8, 1) + " Go.", indice: "Taille = débit × durée (en secondes) / 8." }; },
          () => { const i1 = 25, n1 = C([8, 10]), n2 = C([10, 12].filter(x => x > n1)); return { type: "nombre", question: "Un signal passe de <b>" + n1 + "</b> à <b>" + n2 + " bits</b>, tout le reste étant identique. De combien de pourcents son débit augmente-t-il ?", reponse: (n2 / n1 - 1) * 100, unite: "%", ecart: 0.6, explication: n2 + " / " + n1 + " = " + NB(n2 / n1, 3) + " : +" + NB((n2 / n1 - 1) * 100, 1) + " %.", indice: "Le débit est proportionnel au nombre de bits." }; }
        ],
        exercice: [
          () => { const f = C(FORMATS.slice(2)), i = C([25, 50]), n = 10, st = "4:2:2"; const px = f.l * f.h, D = px * i * n * 2; return { type: "exercice", question: "Un plateau produit un signal <b>" + f.nom + " (" + f.l + " × " + f.h + ")</b>, <b>" + i + " images/s</b>, <b>10 bits</b>, <b>4:2:2</b>.", etapes: [
            { question: "Nombre de pixels par image ?", reponse: px, unite: "pixels", tolerance: 0.001 },
            { question: "Débit non compressé, en Gbit/s ?", reponse: D / 1e9, unite: "Gbit/s" },
            { question: "Taille de 10 minutes d’enregistrement, en Go ?", reponse: D * 600 / 8 / 1e9, unite: "Go" }
          ], solution: "a) " + f.l + " × " + f.h + " = " + NB(px, 0) + ". b) " + NB(px, 0) + " × " + i + " × 10 × 2 = " + NB(D, 0) + " bit/s ≈ " + NB(D / 1e9, 2) + " Gbit/s. c) " + NB(D / 1e9, 2) + " × 600 / 8 ≈ " + NB(D * 600 / 8 / 1e9, 1) + " Go.", indice: "b) D = L × H × i × n × e avec e = 2 en 4:2:2. c) 10 min = 600 s ; divisez par 8." }; }
        ]
      }
    }
  ]
};
