/* ==========================================================================
   contenu.js — le contenu de l'application « Capteurs d'image »
   --------------------------------------------------------------------------
   Ce fichier ne contient QUE du texte : notions, essentiel et questions.
   La mise en page, le menu, l'évaluation et l'enregistrement des notes sont
   faits par js/application.js. Le format est expliqué pas à pas dans
   modules/modele/contenu.js.

   Application commune à tous les étudiants (épreuve TES).

   CONTENU À VALIDER : rédigé à partir de connaissances techniques générales,
   pas à partir du référentiel du BTS. Relis et adapte le vocabulaire, le
   niveau et les notions exigées avant de le proposer aux étudiants.
   Les valeurs « repères » (temps de lecture, capacités, bruits) sont des
   ordres de grandeur : elles varient d'un modèle de caméra à l'autre.
   ========================================================================== */

// Raccourcis pour écrire les questions tirées au sort.
const H = Application.hasard;     // H(1, 6) : un entier entre 1 et 6
const C = Application.choisir;    // C([a, b, c]) : un élément au hasard
const NB = Application.nombre;    // NB(1036.8, 1) : « 1 036,8 »

// Les formats de capteur (zone utile en 16/9 pour les formats vidéo).
// d = diagonale en mm, k = coefficient de recadrage par rapport au plein format.
const FORMATS_CAPTEUR = [
  { nom: "1/3″", l: 5.2, h: 2.9, d: 6 },
  { nom: "1/2″", l: 7.0, h: 3.9, d: 8 },
  { nom: "2/3″", l: 9.6, h: 5.4, d: 11 },
  { nom: "Micro 4/3", l: 17.3, h: 13, d: 21.6 },
  { nom: "Super 35", l: 24.9, h: 14, d: 28.6 },
  { nom: "Plein format", l: 36, h: 24, d: 43.3 },
  { nom: "Grand format 65 mm", l: 54.1, h: 25.6, d: 59.9 }
];
const DIAG_PF = 43.3; // diagonale du plein format 24 × 36, en mm

// Capteurs « réels » pour les calculs de pas (largeur utile en mm, photosites en largeur).
const CAPTEURS_PAS = [
  { nom: "Smartphone 1/2,3″", l: 6.17, n: 4000 },
  { nom: "2/3″ HD", l: 9.6, n: 1920 },
  { nom: "Micro 4/3 4K", l: 17.3, n: 4096 },
  { nom: "Super 35 4K", l: 24.9, n: 4096 },
  { nom: "Super 35 6K", l: 24.9, n: 6144 },
  { nom: "Plein format 4K", l: 36, n: 4096 },
  { nom: "Plein format 8K", l: 36, n: 8192 }
];

/* --- Petits schémas SVG pour les questions « Lire » ---------------------- */
const FOND_FIG = 'style="max-width:100%;background:#0b0c0e;border-radius:14px"';

// Réponse d'un photosite : linéaire, puis plate à partir de la saturation.
function figureSaturation(xs) {
  const X = v => 50 + v * 70, Y = v => 170 - v * 130;
  let s = '<svg viewBox="0 0 360 200" width="360" ' + FOND_FIG + ' role="img" aria-label="Courbe de réponse d’un photosite">';
  s += '<path d="M50 20V170H340" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>';
  for (let k = 0; k <= 4; k++) s += '<path d="M' + X(k) + ' 170v5" stroke="rgba(255,255,255,.5)"/><text x="' + X(k) + '" y="190" fill="#bbb" font-size="12" text-anchor="middle">' + k + "</text>";
  s += '<text x="340" y="160" fill="#bbb" font-size="11" text-anchor="end">lumination (lx·s)</text>';
  s += '<text x="56" y="16" fill="#bbb" font-size="11">électrons</text>';
  s += '<path d="M' + X(4) + " " + Y(1) + "H50" + '" stroke="rgba(255,255,255,.18)" stroke-dasharray="4 4"/><text x="46" y="' + (Y(1) + 4) + '" fill="#bbb" font-size="10" text-anchor="end">max</text>';
  s += '<path d="M50 170L' + X(xs) + " " + Y(1) + "H" + X(4) + '" fill="none" stroke="#2997ff" stroke-width="3" stroke-linejoin="round"/>';
  return s + "</svg>";
}

// k photosites alignés sur une barre d'échelle de 20 µm.
function figureGrille(k) {
  const w = 300 / k;
  let s = '<svg viewBox="0 0 340 170" width="340" ' + FOND_FIG + ' role="img" aria-label="Photosites vus au microscope, avec une échelle">';
  for (let y = 0; y < 3; y++) for (let x = 0; x < k; x++) {
    s += '<rect x="' + (20 + x * w + 1.5) + '" y="' + (16 + y * w * 0.9 + 1.5) + '" width="' + (w - 3) + '" height="' + (w * 0.9 - 3) + '" rx="3" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.45)"/>';
    s += '<circle cx="' + (20 + x * w + w / 2) + '" cy="' + (16 + y * w * 0.9 + w * 0.45) + '" r="' + Math.min(w, w * 0.9) * 0.32 + '" fill="rgba(41,151,255,.35)"/>';
  }
  s += '<path d="M20 150h300M20 144v12M320 144v12" stroke="#ffd60a" stroke-width="2"/><text x="170" y="142" fill="#ffd60a" font-size="13" text-anchor="middle">20 µm</text>';
  return s + "</svg>";
}

// Un bloc de matrice de Bayer (motif R V / V B), une case entourée.
const BAYER_COUL = { R: "#ff453a", V: "#30d158", B: "#0a84ff" };
const bayerCase = (x, y) => (y % 2 === 0 ? (x % 2 === 0 ? "R" : "V") : (x % 2 === 0 ? "V" : "B"));
function figureBayer(nx, ny, cx, cy) {
  const c = 40;
  let s = '<svg viewBox="0 0 ' + (nx * c + 20) + " " + (ny * c + 20) + '" width="' + (nx * c + 20) + '" ' + FOND_FIG + ' role="img" aria-label="Bloc de photosites avec leurs filtres colorés">';
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    s += '<rect x="' + (10 + x * c + 2) + '" y="' + (10 + y * c + 2) + '" width="' + (c - 4) + '" height="' + (c - 4) + '" rx="5" fill="' + BAYER_COUL[bayerCase(x, y)] + '" opacity=".85"/>';
  }
  if (cx !== undefined) s += '<rect x="' + (10 + cx * c - 1) + '" y="' + (10 + cy * c - 1) + '" width="' + (c + 2) + '" height="' + (c + 2) + '" rx="7" fill="none" stroke="#fff" stroke-width="3.5"/>';
  return s + "</svg>";
}

// Chronogramme de lecture : chaque ligne est lue un peu après la précédente.
function figureLecture(tr) {
  const X = t => 70 + t * 6.5, lignes = [["ligne 1", 0], ["", 0.25], ["", 0.5], ["", 0.75], ["dernière", 1]];
  let s = '<svg viewBox="0 0 360 200" width="360" ' + FOND_FIG + ' role="img" aria-label="Chronogramme de lecture d’un capteur ligne par ligne">';
  s += '<path d="M70 160H340" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>';
  for (let t = 0; t <= 40; t += 10) s += '<path d="M' + X(t) + ' 160v5" stroke="rgba(255,255,255,.5)"/><text x="' + X(t) + '" y="180" fill="#bbb" font-size="12" text-anchor="middle">' + t + "</text>";
  s += '<text x="340" y="196" fill="#bbb" font-size="11" text-anchor="end">temps (ms)</text>';
  lignes.forEach((l, i) => {
    const fin = 10 + l[1] * tr, y = 22 + i * 27;
    s += '<rect x="' + X(Math.max(0, fin - 10)) + '" y="' + y + '" width="' + (X(fin) - X(Math.max(0, fin - 10))) + '" height="14" rx="4" fill="rgba(255,214,10,.55)"/>';
    s += '<circle cx="' + X(fin) + '" cy="' + (y + 7) + '" r="5" fill="#ff453a"/>';
    if (l[0]) s += '<text x="62" y="' + (y + 11) + '" fill="#bbb" font-size="11" text-anchor="end">' + l[0] + "</text>";
  });
  s += '<text x="62" y="' + (22 + 2 * 27 + 11) + '" fill="#bbb" font-size="11" text-anchor="end">⋮</text>';
  return s + '<text x="340" y="14" fill="#ff8a80" font-size="11" text-anchor="end">● instant de lecture</text></svg>';
}

// Tableau des formats (questions « Lire » du module 6).
function tableauFormats(liste) {
  return '<table class="fx-t" style="max-width:520px"><tr><td class="nm">Format</td><td class="nm">Largeur × hauteur</td><td class="nm">Diagonale</td></tr>' +
    liste.map(f => "<tr><td>" + f.nom + "</td><td>" + NB(f.l, 1) + " × " + NB(f.h, 1) + " mm</td><td>" + NB(f.d, 1) + " mm</td></tr>").join("") + "</table>";
}

const APPLICATION = {
  id: "tes-capteurs",                 // IDENTIQUE à l'id de js/catalogue.js
  titre: "Capteurs d’image",
  accroche: "De la lumière aux électrons.",
  epreuve: "TES",
  intro: "Six modules pour comprendre ce qui se passe au fond de la caméra : comment un <b>capteur</b> transforme la lumière en nombres, ce que sont les <b>photosites</b>, d’où viennent le <b>bruit</b> et la <b>plage dynamique</b>, comment on obtient la <b>couleur</b> (Bayer, tri-capteur), pourquoi les images se <b>déforment</b> (rolling shutter, capteurs empilés et semi-empilés) et ce que change la <b>taille du capteur</b>. Chaque module se termine par une évaluation : obtenez au moins <b>12/20</b> pour débloquer le suivant.",

  modules: [
    /* ======================================================================
       MODULE 1 — LE FONCTIONNEMENT D'UN CAPTEUR
       ====================================================================== */
    {
      titre: "Comment fonctionne un capteur d’image ?",
      nav: "Fonctionnement",
      resume: "Photon, électron, CCD, CMOS",
      intro: "Un capteur d’image est une grille de millions de minuscules <b>compteurs de lumière</b>. Chacun transforme les photons qu’il reçoit en <b>électrons</b>, puis en <b>tension</b>, enfin en <b>nombre</b>. Comprendre cette chaîne, c’est comprendre d’où viennent la sensibilité, la saturation et les limites d’une caméra.",
      notions: {
        titre: "Du photon au nombre",
        intro: "La lumière traverse l’objectif et forme une image sur le capteur. Chaque photosite <b>compte</b> la lumière qu’il reçoit pendant l’exposition, puis le capteur <b>lit</b> tous ces comptes et les convertit en nombres.",
        mots: [
          { t: "Capteur d’image", ic: "📷", d: "Le composant électronique placé au fond de la caméra, là où l’objectif forme l’image (le <b>plan focal</b>). Il transforme une image lumineuse en signal électrique. Deux familles : <b>CCD</b> et <b>CMOS</b>.", c: "La rétine de la caméra." },
          { t: "Photon", ic: "✨", d: "Un « grain » de lumière. Plus une zone de l’image est lumineuse, plus le capteur y reçoit de photons pendant l’exposition.", c: "Des gouttes de pluie : une zone claire, c’est une averse ; une ombre, quelques gouttes." },
          { t: "Effet photoélectrique", ic: "⚡", q: "Qu’est-ce que l’effet photoélectrique ?", d: "Quand un photon frappe le <b>silicium</b> du capteur, il peut libérer un <b>électron</b>. Le capteur compte ces électrons : leur nombre est <b>proportionnel</b> à la quantité de lumière reçue.", r: "Le silicium est sensible d’environ 350 à 1 100 nm : il « voit » aussi l’infrarouge, d’où le <b>filtre anti-infrarouge</b> (IR-cut) placé devant le capteur." },
          { t: "Photosite", ic: "🔲", d: "Une cellule élémentaire du capteur : une <b>photodiode</b> qui recueille les électrons libérés par la lumière, avec ses petits circuits. Le capteur en aligne des millions, en lignes et en colonnes.", c: "Un seau posé sous la pluie : il se remplit d’autant plus vite qu’il pleut fort." },
          { t: "Rendement quantique", s: "QE", u: "%", ic: "🎯", d: "La proportion de photons qui libèrent réellement un électron. Un QE de 50 % signifie qu’un photon sur deux est compté ; les autres sont réfléchis, absorbés par les filtres ou perdus.", r: "Capteur couleur : 30 à 60 % · capteur monochrome rétroéclairé : jusqu’à 90 %." },
          { t: "Temps d’intégration", u: "s", ic: "⏱️", q: "Qu’est-ce que le temps d’intégration ?", d: "La durée pendant laquelle le photosite accumule les électrons, entre sa <b>remise à zéro</b> et sa <b>lecture</b>. C’est le temps d’exposition, réglé par l’<b>obturateur électronique</b> : il n’y a souvent aucune pièce mécanique.", r: "1/50 s en vidéo 25 images/s avec un angle d’obturation de 180°." },
          { t: "Saturation du photosite", ic: "🪣", q: "Que se passe-t-il quand un photosite sature ?", d: "Un photosite ne peut stocker qu’un nombre limité d’électrons : sa <b>capacité</b> (le « puits plein »). Au-delà, toute lumière supplémentaire est perdue : le blanc est <b>écrêté</b> (« brûlé ») et ne contient plus aucun détail.", c: "Le seau déborde : qu’il pleuve un peu plus ou beaucoup plus, il reste simplement plein." },
          { t: "Capteur CCD", ic: "🔁", q: "Comment un capteur CCD est-il lu ?", d: "<b>Charge-Coupled Device</b> (dispositif à transfert de charges). Les charges sont <b>déplacées de photosite en photosite</b> jusqu’à un <b>amplificateur unique</b>, à la sortie, qui les convertit en tension. Image très homogène, mais forte consommation, lecture lente et <b>traînées verticales</b> (smear) sous les sources très lumineuses.", c: "Une chaîne de seaux passés de main en main jusqu’à la seule balance du chantier." },
          { t: "Capteur CMOS", ic: "🧮", q: "Comment un capteur CMOS est-il lu ?", d: "<b>Complementary Metal-Oxide-Semiconductor</b>. Chaque photosite possède son <b>propre amplificateur</b>. Les lignes sont lues l’une après l’autre et les <b>convertisseurs analogique-numérique</b> sont sur la puce, souvent un par colonne. Rapide, économe, bon marché : c’est le capteur de presque toutes les caméras actuelles.", c: "Chaque seau a sa propre petite balance." },
          { t: "Gain de conversion", s: "g", u: "µV/e⁻", ic: "🔌", d: "La tension produite par <b>un seul électron</b> dans le photosite. Il transforme le nombre d’électrons en une tension, que l’on peut ensuite amplifier et numériser.", r: "Quelques dizaines de microvolts par électron." },
          { t: "Convertisseur analogique-numérique", s: "CAN", ic: "🔢", d: "Il transforme la tension de chaque photosite en un <b>nombre</b>, codé sur 10 à 16 bits. À sa sortie, on obtient les données brutes du capteur : le <b>RAW</b>.", r: "12 bits : valeurs de 0 à 4 095 · 14 bits : de 0 à 16 383." },
          { t: "Un capteur voit-il la couleur ?", ic: "🎨", q: "Un capteur voit-il les couleurs ?", d: "Non. Un photosite compte des électrons, quelle que soit la couleur du photon : il est « <b>daltonien</b> ». Pour obtenir la couleur, on pose des <b>filtres colorés</b> devant les photosites (matrice de Bayer) ou l’on sépare la lumière vers trois capteurs (tri-capteur) : c’est le module 4." }
        ],
        formules: [
          { q: "Combien d’électrons un photosite recueille-t-il ?", f: "N<sub>e</sub> = QE × N<sub>ph</sub>", say: "le nombre d’électrons est égal au rendement quantique multiplié par le nombre de photons reçus", rows: [["N<sub>e</sub>", "nombre d’électrons", "e⁻", "ce que le photosite compte"], ["QE", "rendement quantique", "— (en %)", "la part des photons qui sont comptés"], ["N<sub>ph</sub>", "nombre de photons reçus", "—", "dépend de l’éclairement et du temps"]], ex: "20 000 photons avec un QE de 45 % : N<sub>e</sub> = 0,45 × 20 000 = 9 000 électrons." },
          { q: "De quoi dépend la quantité de lumière reçue ?", f: "H = E × t", say: "la lumination est égale à l’éclairement multiplié par le temps d’exposition", rows: [["H", "lumination", "lx·s", "la « dose » de lumière reçue"], ["E", "éclairement sur le capteur", "lx", "plus la scène est claire, plus E est grand"], ["t", "temps d’intégration", "s", "le temps d’exposition"]], ex: "E = 20 lx pendant 1/50 s : H = 20 × 0,02 = 0,4 lx·s. Doubler le temps (1/25 s) double H : c’est un diaph de plus." },
          { q: "Comment passe-t-on des électrons à une tension ?", f: "U = N<sub>e</sub> × g", say: "la tension est égale au nombre d’électrons multiplié par le gain de conversion", rows: [["U", "tension du photosite", "V (ou µV)", "ce que lit l’électronique"], ["N<sub>e</sub>", "nombre d’électrons", "e⁻", ""], ["g", "gain de conversion", "µV/e⁻", "tension produite par un électron"]], ex: "9 000 électrons × 50 µV/e⁻ = 450 000 µV = 0,45 V." },
          { q: "Quelle valeur numérique sort du convertisseur ?", f: "V = (N<sub>e</sub> / N<sub>max</sub>) × (2<sup>n</sup> − 1)", say: "la valeur numérique est égale au taux de remplissage du photosite multiplié par la plus grande valeur codable sur n bits", rows: [["V", "valeur numérique", "—", "le nombre écrit dans le fichier RAW"], ["N<sub>max</sub>", "capacité du photosite", "e⁻", "photosite plein = valeur maximale"], ["n", "bits du convertisseur", "bit", "12 bits : de 0 à 4 095"]], ex: "Photosite rempli à moitié, CAN 12 bits : 0,5 × 4 095 ≈ 2 048." }
        ]
      },
      manipuler: {
        titre: "Exposer, puis lire une ligne de photosites",
        intro: "Réglez l’éclairement, le temps d’exposition et le rendement quantique, puis lancez l’animation : les photons tombent, les photosites se remplissent d’électrons, puis le capteur est <b>lu</b>. Comparez la lecture d’un <b>CCD</b> (les charges voyagent jusqu’à une sortie unique) et d’un <b>CMOS</b> (chaque colonne convertit la sienne)."
      },
      essentiel: {
        definitions: [
          "<b>Photosite</b> : cellule du capteur qui transforme les photons reçus en électrons (effet photoélectrique), proportionnellement à la lumière.",
          "<b>Saturation</b> : photosite plein ; au-delà, la lumière est perdue et le blanc est écrêté.",
          "<b>CCD</b> : les charges sont transférées de proche en proche jusqu’à un amplificateur unique.",
          "<b>CMOS</b> : un amplificateur par photosite, lecture ligne par ligne, convertisseurs sur la puce.",
          "<b>Chaîne</b> : photons → électrons → tension → nombre (CAN) → RAW."
        ],
        formules: [["N<sub>e</sub> = QE × N<sub>ph</sub>", "électrons = rendement quantique × photons"], ["H = E × t", "lumination = éclairement × temps"], ["U = N<sub>e</sub> × g", "tension = électrons × gain de conversion"], ["V = (N<sub>e</sub> / N<sub>max</sub>) × (2<sup>n</sup> − 1)", "valeur numérique sur n bits"]],
        reperes: ["Rendement quantique d’un capteur couleur : 30 à 60 %.", "Le silicium voit jusqu’à ≈ 1 100 nm : un filtre anti-infrarouge est indispensable.", "Presque toutes les caméras actuelles utilisent un capteur CMOS.", "Doubler le temps d’exposition = deux fois plus de lumière = un diaph de plus."],
        pieges: ["Le capteur ne mesure pas la couleur, seulement une quantité de lumière.", "Un photosite saturé ne garde aucun détail : on ne « récupère » pas un blanc écrêté en post-production.", "CCD : un amplificateur unique en sortie ; CMOS : un amplificateur par photosite. Ne pas les inverser."]
      },
      evaluation: {
        lire: [
          () => { const qe = C([38, 45, 52, 60]), fw = C([18000, 25000, 32000]); return { type: "nombre", contexte: "Fiche technique d’un capteur : « CMOS 4/3 · capacité " + NB(fw, 0) + " e⁻ · rendement quantique (QE) " + qe + " % · CAN 12 bits ».", question: "Quel est le rendement quantique du capteur, en % ?", reponse: qe, unite: "%", ecart: 0, explication: "Le rendement quantique (QE) est donné en % : " + qe + " %. La capacité (" + NB(fw, 0) + " e⁻) est le nombre maximal d’électrons d’un photosite.", indice: "Cherchez l’abréviation QE." }; },
          () => { const xs = C([1, 1.5, 2, 2.5, 3]); return { type: "nombre", question: "Cette courbe montre le nombre d’électrons d’un photosite en fonction de la lumière reçue. À partir de quelle lumination (en lx·s) le photosite est-il <b>saturé</b> ?", figure: figureSaturation(xs), reponse: xs, unite: "lx·s", ecart: 0.1, explication: "La réponse est linéaire jusqu’à " + NB(xs) + " lx·s, puis la courbe devient plate : le photosite est plein, toute lumière en plus est perdue.", indice: "Cherchez l’endroit où la courbe cesse de monter." }; },
          () => { const n = C([10, 12, 14]); return { type: "nombre", contexte: "Fiche technique : « Sortie RAW, convertisseur " + n + " bits ».", question: "Quelle est la plus grande valeur numérique qu’un photosite peut donner ?", reponse: Math.pow(2, n) - 1, unite: "", tolerance: 0, explication: "Sur " + n + " bits, les valeurs vont de 0 à 2<sup>" + n + "</sup> − 1 = " + NB(Math.pow(2, n) - 1, 0) + ".", indice: "Sur n bits : de 0 à 2<sup>n</sup> − 1." }; },
          () => { const t = C([["CCD", "Les charges sont transférées jusqu’à un amplificateur unique en sortie"], ["CMOS", "Chaque photosite a son propre amplificateur et la lecture se fait ligne par ligne"]]); return { type: "qcm", contexte: "Fiche technique : « Capteur : " + t[0] + " 2/3″ ».", question: "Comment les charges de ce capteur sont-elles lues ?", bonne: t[1], mauvaises: [t[0] === "CCD" ? "Chaque photosite a son propre amplificateur et la lecture se fait ligne par ligne" : "Les charges sont transférées jusqu’à un amplificateur unique en sortie", "Le capteur mesure directement la couleur de chaque photon", "Un prisme envoie la lumière vers trois amplificateurs"], explication: "Capteur " + t[0] + " : " + t[1].toLowerCase() + ".", indice: "CCD = transfert de charges ; CMOS = un amplificateur par photosite." }; }
        ],
        comprendre: [
          ["Le nombre d’électrons recueillis par un photosite est proportionnel à la lumière reçue, tant qu’il n’est pas saturé.", true, "C’est la réponse linéaire du photosite : deux fois plus de photons, deux fois plus d’électrons, jusqu’au puits plein."],
          ["Un photosite mesure la couleur des photons qu’il reçoit.", false, "Il ne compte que des électrons : il est « daltonien ». La couleur vient des filtres placés devant (Bayer) ou d’un prisme (tri-capteur).", "Un photon rouge et un photon bleu libèrent chacun un électron."],
          ["Dans un capteur CMOS, chaque photosite possède son propre amplificateur.", true, "C’est la différence principale avec le CCD, qui n’a qu’un amplificateur en sortie."],
          ["Une zone saturée peut être récupérée en baissant la luminosité en post-production.", false, "Le photosite plein a perdu l’information : toutes les valeurs écrêtées sont identiques, il n’y a plus de détail à retrouver."],
          ["Le filtre anti-infrarouge est nécessaire car le silicium est sensible au-delà de 700 nm.", true, "Le silicium réagit jusqu’à environ 1 100 nm. Sans filtre, l’infrarouge fausserait les couleurs (noirs violacés, végétation trop claire)."],
          ["Doubler le temps d’exposition double le nombre d’électrons recueillis (photosite non saturé).", true, "H = E × t : deux fois plus de temps, deux fois plus de lumière, donc deux fois plus d’électrons."],
          ["Un CCD consomme moins d’énergie qu’un CMOS.", false, "C’est l’inverse : le transfert des charges d’un CCD demande beaucoup d’énergie ; le CMOS est économe."]
        ],
        qcm: [
          ["Quel phénomène permet à un photosite de transformer la lumière en électricité ?", "L’effet photoélectrique", ["L’effet Doppler", "L’induction magnétique", "La diffraction"], "Un photon qui frappe le silicium peut libérer un électron : c’est l’effet photoélectrique."],
          ["Que mesure le rendement quantique d’un capteur ?", "La part des photons reçus qui libèrent un électron", ["Le nombre de bits du convertisseur", "Le nombre maximal d’électrons d’un photosite", "La vitesse de lecture du capteur"], "QE = électrons / photons. Un QE de 50 % : un photon sur deux est compté."],
          ["Quelle est la chaîne correcte à l’intérieur d’un capteur ?", "Photons → électrons → tension → nombre", ["Électrons → photons → nombre → tension", "Photons → tension → électrons → nombre", "Tension → photons → électrons → nombre"], "Les photons libèrent des électrons, convertis en tension, puis numérisés par le CAN."],
          ["Quel défaut est typique d’un capteur CCD filmant une source très lumineuse ?", "Une traînée verticale (smear)", ["Une image penchée en panoramique", "Des fausses couleurs sur les rayures", "Un bruit coloré dans les noirs"], "Les charges en excès débordent dans le registre de transfert vertical et laissent une traînée."],
          ["Pourquoi presque toutes les caméras actuelles utilisent-elles un capteur CMOS ?", "Il est rapide, économe en énergie et intègre ses convertisseurs", ["Il mesure directement la couleur", "Il n’a jamais de bruit", "Il n’a pas besoin d’objectif"], "Lecture rapide, faible consommation, électronique intégrée sur la puce, coût réduit."],
          ["Que contient un fichier RAW ?", "Les valeurs brutes des photosites, en sortie du convertisseur", ["Une image compressée en JPEG", "Une image déjà étalonnée", "Uniquement la luminance"], "Le RAW garde les nombres du CAN, avant traitement (dématriçage, balance des blancs, courbe)."]
        ],
        calculer: [
          () => { const qe = C([35, 42, 48, 55, 60]), nph = C([5000, 8000, 12000, 20000, 40000]); return { type: "nombre", question: "Un photosite reçoit <b>" + NB(nph, 0) + " photons</b>. Son rendement quantique vaut <b>" + qe + " %</b>. Combien d’électrons recueille-t-il ?", reponse: qe / 100 * nph, unite: "e⁻", explication: "N<sub>e</sub> = QE × N<sub>ph</sub> = " + NB(qe / 100) + " × " + NB(nph, 0) + " = " + NB(qe / 100 * nph, 0) + " électrons.", indice: "Transformez le pourcentage en nombre décimal : " + qe + " % = " + NB(qe / 100) + "." }; },
          () => { const E = C([5, 10, 20, 40, 80]), t = C([[1 / 25, "1/25"], [1 / 50, "1/50"], [1 / 100, "1/100"]]); return { type: "nombre", question: "Le capteur reçoit un éclairement de <b>" + E + " lx</b> pendant <b>" + t[1] + " s</b>. Quelle est la lumination H, en lx·s ?", reponse: E * t[0], unite: "lx·s", explication: "H = E × t = " + E + " × " + t[1] + " = " + NB(E * t[0], 3) + " lx·s.", indice: "H = E × t, avec t en secondes (" + t[1] + " s = " + NB(t[0], 3) + " s)." }; },
          () => { const ne = H(4, 30) * 1000, g = C([20, 40, 50, 80]); return { type: "nombre", question: "Un photosite contient <b>" + NB(ne, 0) + " électrons</b>. Son gain de conversion vaut <b>" + g + " µV/e⁻</b>. Quelle tension produit-il, en volts ?", reponse: ne * g / 1e6, unite: "V", explication: "U = N<sub>e</sub> × g = " + NB(ne, 0) + " × " + g + " = " + NB(ne * g, 0) + " µV = " + NB(ne * g / 1e6, 3) + " V.", indice: "Calculez en µV, puis divisez par 1 000 000 pour obtenir des volts." }; },
          () => { const fw = C([15000, 20000, 30000, 40000]), f = C([0.1, 0.25, 0.4, 0.5, 0.75, 0.8]), n = C([10, 12, 14]); const ne = fw * f, v = Math.round(f * (Math.pow(2, n) - 1)); return { type: "nombre", question: "Un photosite de capacité <b>" + NB(fw, 0) + " e⁻</b> contient <b>" + NB(ne, 0) + " électrons</b>. Le convertisseur travaille sur <b>" + n + " bits</b>. Quelle valeur numérique donne-t-il ?", reponse: v, unite: "", tolerance: 0.01, explication: "V = (" + NB(ne, 0) + " / " + NB(fw, 0) + ") × (2<sup>" + n + "</sup> − 1) = " + NB(f) + " × " + NB(Math.pow(2, n) - 1, 0) + " ≈ " + NB(v, 0) + ".", indice: "Calculez d’abord le taux de remplissage N<sub>e</sub> / N<sub>max</sub>." }; },
          () => { const fw = C([12000, 20000, 30000, 50000]), qe = C([40, 50, 60]); return { type: "nombre", question: "Un photosite peut stocker <b>" + NB(fw, 0) + " électrons</b> et son rendement quantique vaut <b>" + qe + " %</b>. Combien de photons faut-il pour le saturer ?", reponse: fw / (qe / 100), unite: "photons", explication: "N<sub>ph</sub> = N<sub>e</sub> / QE = " + NB(fw, 0) + " / " + NB(qe / 100) + " ≈ " + NB(fw / (qe / 100), 0) + " photons.", indice: "Retournez la formule : N<sub>ph</sub> = N<sub>e</sub> / QE." }; },
          () => { const fw = C([20000, 25000, 40000]), ne = Math.round(fw * C([0.2, 0.35, 0.6, 0.9]) / 100) * 100; return { type: "nombre", question: "Un photosite de capacité <b>" + NB(fw, 0) + " e⁻</b> contient <b>" + NB(ne, 0) + " électrons</b>. Quel est son taux de remplissage, en % ?", reponse: ne / fw * 100, unite: "%", ecart: 0.5, explication: NB(ne, 0) + " / " + NB(fw, 0) + " = " + NB(ne / fw * 100, 1) + " %.", indice: "Électrons / capacité, puis × 100." }; }
        ],
        exercice: [
          () => { const nph = C([30000, 50000, 70000, 90000]), qe = C([45, 50, 60]), fw = C([25000, 30000]), g = C([30, 40]); const ne = nph * qe / 100, sat = ne > fw, nr = Math.min(ne, fw); return { type: "exercice", question: "Un photosite reçoit <b>" + NB(nph, 0) + " photons</b>. Rendement quantique : <b>" + qe + " %</b>. Capacité : <b>" + NB(fw, 0) + " e⁻</b>. Gain de conversion : <b>" + g + " µV/e⁻</b>.", etapes: [
            { question: "Nombre d’électrons libérés par la lumière ?", reponse: ne, unite: "e⁻" },
            { question: "Le photosite est-il saturé ?", bonne: sat ? "Oui : les électrons dépassent la capacité" : "Non : les électrons restent sous la capacité", mauvaises: [sat ? "Non : les électrons restent sous la capacité" : "Oui : les électrons dépassent la capacité"] },
            { question: "Tension du photosite, en volts (en tenant compte de la saturation) ?", reponse: nr * g / 1e6, unite: "V" }
          ], solution: "a) " + NB(qe / 100) + " × " + NB(nph, 0) + " = " + NB(ne, 0) + " e⁻. b) " + NB(ne, 0) + (sat ? " > " : " ≤ ") + NB(fw, 0) + " : " + (sat ? "saturé, on garde " + NB(fw, 0) + " e⁻" : "pas saturé") + ". c) " + NB(nr, 0) + " × " + g + " µV = " + NB(nr * g / 1e6, 3) + " V.", indice: "a) N<sub>e</sub> = QE × N<sub>ph</sub>. c) Un photosite saturé ne dépasse jamais sa capacité." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 2 — LES PHOTOSITES
       ====================================================================== */
    {
      titre: "Les photosites : taille, surface et définition",
      nav: "Photosites",
      resume: "Pas, surface, microlentilles, BSI",
      intro: "Deux capteurs « 4K » peuvent avoir des photosites dix fois plus grands l’un que l’autre. La <b>taille d’un photosite</b> décide de la quantité de lumière qu’il recueille, donc de la sensibilité, du bruit et de la dynamique. Voici comment la calculer, et comment les fabricants font « grandir » des photosites minuscules.",
      notions: {
        titre: "Petits ou grands photosites",
        intro: "Un capteur est un damier : sa <b>taille</b> (en mm) et son <b>nombre de cases</b> (sa définition) fixent la taille de chaque case. Une case plus grande reçoit plus de lumière.",
        mots: [
          { t: "Photosite et pixel", ic: "🔍", q: "Photosite et pixel : quelle différence ?", d: "Le <b>photosite</b> est un élément <b>physique</b> du capteur, qui mesure la lumière. Le <b>pixel</b> est un élément de l’<b>image</b> numérique, qui porte trois valeurs (R, V, B). Sur un capteur à matrice de Bayer, chaque photosite ne mesure qu’une couleur : les pixels sont reconstitués par calcul.", c: "Le photosite est le micro qui enregistre ; le pixel, la note écrite sur la partition." },
          { t: "Définition du capteur", u: "photosites", ic: "🔢", d: "Le nombre de photosites : <b>largeur × hauteur</b>, souvent exprimé en mégapixels (Mpx). Elle est souvent plus grande que la définition de la vidéo enregistrée.", r: "UHD : 3 840 × 2 160 ≈ 8,3 Mpx · capteur 6K : 6 144 × 3 456 ≈ 21 Mpx." },
          { t: "Pas du photosite", s: "p", u: "µm", ic: "📏", q: "Qu’est-ce que le pas (pitch) d’un photosite ?", d: "La distance entre les centres de deux photosites voisins : en pratique, la <b>largeur d’un photosite</b>. On le calcule en divisant la largeur du capteur par le nombre de photosites en largeur.", r: "Smartphone : 0,8 à 2 µm · 2/3″ HD : 5 µm · Super 35 4K : 6 µm · plein format 4K : 9 µm." },
          { t: "Surface du photosite", u: "µm²", ic: "⬛", d: "Pas × pas. La lumière recueillie est proportionnelle à la <b>surface</b> : un pas deux fois plus grand donne <b>quatre fois</b> plus de lumière.", c: "Un seau deux fois plus large recueille quatre fois plus de pluie." },
          { t: "Capacité du photosite", s: "N<sub>max</sub>", u: "e⁻", ic: "🪣", d: "Le nombre maximal d’électrons qu’un photosite peut stocker avant de saturer (« full well »). Elle grandit avec la surface : un gros photosite encaisse plus de lumière avant d’écrêter.", r: "Environ 1 000 à 2 000 e⁻ par µm² : ≈ 5 000 e⁻ pour 2 µm, ≈ 50 000 e⁻ pour 6 µm." },
          { t: "Taux de remplissage", u: "%", ic: "🧱", q: "Qu’est-ce que le taux de remplissage d’un photosite ?", d: "La part de la surface du photosite réellement <b>sensible</b> à la lumière (fill factor). Sur un CMOS classique, les transistors et les fils occupent une partie de la surface : la lumière qui tombe dessus est perdue. Plus le photosite est petit, plus cette perte compte." },
          { t: "Microlentilles", ic: "🔎", d: "De minuscules lentilles posées sur chaque photosite. Elles <b>concentrent</b> la lumière sur la zone sensible et récupèrent celle qui tomberait sur les circuits. Elles compensent un taux de remplissage faible.", c: "Un entonnoir posé sur le seau." },
          { t: "Capteur rétroéclairé (BSI)", ic: "🔄", q: "Qu’est-ce qu’un capteur rétroéclairé (BSI) ?", d: "<b>Back-Side Illuminated</b>. La puce est retournée : la lumière arrive par l’arrière, directement sur les photodiodes, et les fils métalliques passent <b>dessous</b>. Plus d’obstacle sur le trajet : davantage de lumière, surtout pour les petits photosites. Le capteur classique est dit <b>FSI</b> (Front-Side Illuminated).", c: "Déplacer les câbles qui passaient devant la fenêtre." },
          { t: "Suréchantillonnage", ic: "⬇️", q: "Qu’est-ce que le suréchantillonnage (oversampling) ?", d: "Filmer avec <b>plus de photosites</b> qu’il n’en faut, puis réduire l’image (par exemple 6K → 4K). L’image finale est plus fine, moins bruitée et présente moins de moiré.", r: "Beaucoup de caméras lisent 6K pour livrer une UHD." },
          { t: "Recadrage capteur", ic: "✂️", d: "N’utiliser qu’une <b>partie</b> du capteur, par exemple les 3 840 photosites centraux pour de l’UHD, sans réduction. Le champ se resserre, comme avec une focale plus longue (module 6)." },
          { t: "Binning et saut de lignes", ic: "⚠️", q: "Que sont le binning et le saut de lignes ?", d: "Deux façons rapides de lire <b>moins</b> de photosites, par exemple pour les hautes cadences. Le <b>binning</b> additionne des photosites voisins : moins de bruit, moins de détail. Le <b>saut de lignes</b> (line skipping) en ignore : rapide, mais source de <b>moiré</b> et de crénelage." }
        ],
        formules: [
          { q: "Comment calcule-t-on le pas d’un photosite ?", f: "p = L / N<sub>H</sub>", say: "le pas est égal à la largeur du capteur divisée par le nombre de photosites en largeur", rows: [["p", "pas du photosite", "µm", "≈ la largeur d’un photosite"], ["L", "largeur utile du capteur", "mm → µm", "1 mm = 1 000 µm"], ["N<sub>H</sub>", "photosites en largeur", "—", "4 096, 6 144…"]], ex: "Super 35 de 24,9 mm, 4 096 photosites : p = 24 900 µm / 4 096 ≈ 6,1 µm." },
          { q: "Combien de fois plus de lumière reçoit un photosite plus grand ?", f: "S<sub>1</sub> / S<sub>2</sub> = (p<sub>1</sub> / p<sub>2</sub>)²", say: "le rapport des surfaces est égal au carré du rapport des pas", rows: [["S", "surface d’un photosite", "µm²", "S = p × p"], ["p<sub>1</sub>, p<sub>2</sub>", "pas des deux photosites", "µm", ""]], ex: "6 µm contre 2 µm : (6 / 2)² = 3² = 9 fois plus de surface, donc environ 9 fois plus de lumière." },
          { q: "Comment calcule-t-on la définition d’un capteur ?", f: "N = N<sub>H</sub> × N<sub>V</sub>", say: "le nombre de photosites est égal au nombre en largeur multiplié par le nombre en hauteur", rows: [["N", "nombre total de photosites", "—", "en mégapixels : divisé par 1 000 000"], ["N<sub>H</sub>", "photosites en largeur", "—", ""], ["N<sub>V</sub>", "photosites en hauteur", "—", ""]], ex: "4 096 × 2 160 = 8 847 360 photosites ≈ 8,8 Mpx." }
        ]
      },
      manipuler: {
        titre: "Comparer des photosites à la même échelle",
        intro: "Choisissez un format de capteur et une définition : à gauche, les photosites sont dessinés <b>à l’échelle</b> dans un carré de 24 µm de côté ; à droite, la <b>coupe</b> d’un photosite montre le trajet de la lumière. Comparez un capteur classique (FSI) et un capteur rétroéclairé (BSI), avec et sans microlentilles."
      },
      essentiel: {
        definitions: [
          "<b>Photosite</b> : élément physique du capteur. <b>Pixel</b> : élément de l’image (R, V, B).",
          "<b>Pas</b> : largeur d’un photosite = largeur du capteur / nombre de photosites en largeur.",
          "<b>Capacité</b> : nombre maximal d’électrons avant saturation ; elle grandit avec la surface.",
          "<b>Microlentilles</b> : concentrent la lumière sur la zone sensible.",
          "<b>BSI</b> (rétroéclairé) : les circuits passent derrière la photodiode, la lumière arrive sans obstacle."
        ],
        formules: [["p = L / N<sub>H</sub>", "pas = largeur / photosites en largeur (penser à mm → µm)"], ["S<sub>1</sub> / S<sub>2</sub> = (p<sub>1</sub> / p<sub>2</sub>)²", "pas × 2 = surface × 4"], ["N = N<sub>H</sub> × N<sub>V</sub>", "définition en photosites"]],
        reperes: ["Smartphone : 1 à 2 µm · 2/3″ HD : 5 µm · Super 35 4K : 6 µm · plein format 4K : 9 µm.", "Capacité : ≈ 1 000 à 2 000 électrons par µm².", "UHD = 8,3 millions de pixels ; 4K DCI = 8,8 millions."],
        pieges: ["La lumière dépend de la <b>surface</b>, pas du pas : deux fois plus large = quatre fois plus de lumière.", "Plus de mégapixels sur le même capteur = des photosites plus petits, donc moins de lumière chacun.", "Ne pas oublier la conversion : 1 mm = 1 000 µm."]
      },
      evaluation: {
        lire: [
          () => { const k = C([4, 5, 8, 10]); return { type: "nombre", question: "Ce schéma montre des photosites vus au microscope, avec une barre d’échelle de 20 µm. Quel est le pas des photosites, en µm ?", figure: figureGrille(k), reponse: 20 / k, unite: "µm", ecart: 0.05, explication: k + " photosites occupent 20 µm : p = 20 / " + k + " = " + NB(20 / k, 2) + " µm.", indice: "Comptez les photosites d’une ligne sous la barre de 20 µm." }; },
          () => { const c = C(CAPTEURS_PAS); const nv = Math.round(c.n * 9 / 16); return { type: "nombre", contexte: "Fiche technique : « Capteur " + c.nom + " · zone utile " + NB(c.l, 2) + " mm de large · " + NB(c.n, 0) + " × " + NB(nv, 0) + " photosites ».", question: "Combien le capteur a-t-il de photosites en <b>largeur</b> ?", reponse: c.n, unite: "photosites", tolerance: 0, explication: "La définition s’écrit largeur × hauteur : " + NB(c.n, 0) + " photosites en largeur.", indice: "Le premier nombre de la définition est la largeur." }; },
          () => { const p = C([1.4, 3.8, 5.9, 8.4]); return { type: "nombre", contexte: "Fiche technique : « Capteur CMOS rétroéclairé · taille de photosite " + NB(p, 1) + " µm · microlentilles ».", question: "Quelle est la surface d’un photosite, en µm² ?", reponse: p * p, unite: "µm²", explication: "S = p × p = " + NB(p, 1) + " × " + NB(p, 1) + " ≈ " + NB(p * p, 2) + " µm².", indice: "Un photosite est un carré de côté p." }; }
        ],
        comprendre: [
          ["Sur un capteur de même taille, passer de 12 à 48 mégapixels rend les photosites plus petits.", true, "Même surface partagée entre 4 fois plus de photosites : chacun a 4 fois moins de surface (pas divisé par 2)."],
          ["Un photosite deux fois plus large reçoit deux fois plus de lumière.", false, "La lumière dépend de la surface : 2 × 2 = 4 fois plus de lumière.", "Pensez à la surface d’un carré."],
          ["Les microlentilles concentrent la lumière sur la partie sensible du photosite.", true, "Elles récupèrent la lumière qui tomberait sur les circuits et augmentent le taux de remplissage effectif."],
          ["Dans un capteur rétroéclairé (BSI), les fils métalliques sont placés devant la photodiode.", false, "C’est le cas du capteur classique (FSI). Le BSI les place derrière : la lumière arrive sans obstacle."],
          ["Un pixel de l’image et un photosite du capteur sont toujours la même chose.", false, "Le photosite mesure ; le pixel est reconstitué. Sur un Bayer, un photosite ne mesure qu’une couleur ; et un capteur 6K peut produire une image 4K."],
          ["Le saut de lignes peut provoquer du moiré.", true, "En ignorant des lignes, on échantillonne l’image trop grossièrement : les détails fins se replient en moiré."],
          ["La capacité d’un photosite augmente avec sa surface.", true, "Une photodiode plus grande peut stocker plus d’électrons : environ 1 000 à 2 000 e⁻ par µm²."]
        ],
        qcm: [
          ["Qu’est-ce que le pas (pitch) d’un photosite ?", "La distance entre les centres de deux photosites voisins", ["Le nombre de photosites du capteur", "La diagonale du capteur", "Le nombre d’électrons maximal"], "Le pas est pratiquement la largeur d’un photosite, en µm."],
          ["Quel est l’intérêt principal d’un capteur rétroéclairé (BSI) ?", "La lumière atteint la photodiode sans traverser les circuits", ["Il mesure directement les couleurs", "Il supprime le rolling shutter", "Il n’a plus besoin de filtre infrarouge"], "Les circuits passent derrière : plus de lumière utile, surtout pour les petits photosites."],
          ["Pourquoi les caméras filment-elles souvent en 6K pour livrer de l’UHD ?", "Le suréchantillonnage donne une image plus fine et moins bruitée", ["Parce que l’UHD est interdit en diffusion", "Pour augmenter la taille du capteur", "Pour éviter de compresser l’image"], "Réduire une image plus définie moyenne le bruit et compense la perte de résolution du dématriçage."],
          ["Quelle caméra a les photosites les plus grands ?", "Plein format 36 mm en 4K", ["Super 35 de 24,9 mm en 6K", "2/3″ (9,6 mm) en HD", "Smartphone 6,2 mm en 12 Mpx"], "36 / 4 096 ≈ 8,8 µm ; 24,9 / 6 144 ≈ 4 µm ; 9,6 / 1 920 = 5 µm ; 6,2 / 4 000 ≈ 1,5 µm."],
          ["Que fait le binning ?", "Il additionne des photosites voisins pour n’en lire qu’un", ["Il saute une ligne sur deux", "Il agrandit les microlentilles", "Il ajoute un filtre coloré"], "Le binning regroupe plusieurs photosites : lecture plus rapide, moins de bruit, moins de détail."]
        ],
        calculer: [
          () => { const c = C(CAPTEURS_PAS); return { type: "nombre", question: "Capteur <b>" + c.nom + "</b> : <b>" + NB(c.l, 2) + " mm</b> de large et <b>" + NB(c.n, 0) + " photosites</b> en largeur. Quel est le pas, en µm ?", reponse: c.l * 1000 / c.n, unite: "µm", explication: "p = " + NB(c.l * 1000, 0) + " µm / " + NB(c.n, 0) + " ≈ " + NB(c.l * 1000 / c.n, 2) + " µm.", indice: "Convertissez la largeur en µm (× 1 000), puis divisez." }; },
          () => { const p1 = C([4, 5, 6, 8, 9]), p2 = C([1, 1.5, 2, 2.5, 3]); return { type: "nombre", question: "Un photosite de <b>" + NB(p1) + " µm</b> reçoit combien de fois plus de lumière qu’un photosite de <b>" + NB(p2) + " µm</b> ?", reponse: Math.pow(p1 / p2, 2), unite: "fois", explication: "(" + NB(p1) + " / " + NB(p2) + ")² = " + NB(p1 / p2, 2) + "² ≈ " + NB(Math.pow(p1 / p2, 2), 1) + " fois.", indice: "Rapport des surfaces = carré du rapport des pas." }; },
          () => { const d = C([[1920, 1080], [3840, 2160], [4096, 2160], [6144, 3456], [8192, 4320]]); return { type: "nombre", question: "Un capteur a <b>" + NB(d[0], 0) + " × " + NB(d[1], 0) + "</b> photosites. Quelle est sa définition, en mégapixels ?", reponse: d[0] * d[1] / 1e6, unite: "Mpx", explication: NB(d[0], 0) + " × " + NB(d[1], 0) + " = " + NB(d[0] * d[1], 0) + " photosites ≈ " + NB(d[0] * d[1] / 1e6, 1) + " Mpx.", indice: "Multipliez, puis divisez par 1 000 000." }; },
          () => { const l = C([24.9, 36, 17.3, 9.6]), p = C([4, 5, 6, 8]); return { type: "nombre", question: "Un capteur de <b>" + NB(l, 1) + " mm</b> de large a des photosites de <b>" + p + " µm</b>. Combien de photosites compte-t-il en largeur ?", reponse: l * 1000 / p, unite: "photosites", explication: "N<sub>H</sub> = L / p = " + NB(l * 1000, 0) + " / " + p + " ≈ " + NB(l * 1000 / p, 0) + ".", indice: "Retournez la formule : N<sub>H</sub> = L / p (L en µm)." }; },
          () => { const p = C([2, 3, 4, 5, 6, 8]); return { type: "nombre", question: "On estime la capacité d’un photosite à <b>1 500 électrons par µm²</b>. Quelle est la capacité d’un photosite de <b>" + p + " µm</b> de côté ?", reponse: 1500 * p * p, unite: "e⁻", explication: "S = " + p + " × " + p + " = " + p * p + " µm² ; 1 500 × " + p * p + " = " + NB(1500 * p * p, 0) + " e⁻.", indice: "Calculez la surface p², puis multipliez par 1 500." }; }
        ],
        exercice: [
          () => { const c = C([{ nom: "Super 35", l: 24.9, n: 4096, v: 2160 }, { nom: "Plein format", l: 36, n: 6048, v: 3402 }, { nom: "2/3″", l: 9.6, n: 1920, v: 1080 }, { nom: "Micro 4/3", l: 17.3, n: 5184, v: 2916 }]); const p = c.l * 1000 / c.n; return { type: "exercice", question: "Un capteur <b>" + c.nom + "</b> mesure <b>" + NB(c.l, 1) + " mm</b> de large et compte <b>" + NB(c.n, 0) + " × " + NB(c.v, 0) + "</b> photosites.", etapes: [
            { question: "Définition du capteur, en mégapixels ?", reponse: c.n * c.v / 1e6, unite: "Mpx" },
            { question: "Pas d’un photosite, en µm ?", reponse: p, unite: "µm" },
            { question: "Surface d’un photosite, en µm² ?", reponse: p * p, unite: "µm²" }
          ], solution: "a) " + NB(c.n, 0) + " × " + NB(c.v, 0) + " = " + NB(c.n * c.v, 0) + " ≈ " + NB(c.n * c.v / 1e6, 1) + " Mpx. b) " + NB(c.l * 1000, 0) + " / " + NB(c.n, 0) + " ≈ " + NB(p, 2) + " µm. c) " + NB(p, 2) + "² ≈ " + NB(p * p, 1) + " µm².", indice: "b) p = L / N<sub>H</sub> avec L en µm. c) S = p²." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 3 — BRUIT, SENSIBILITÉ ET PLAGE DYNAMIQUE
       ====================================================================== */
    {
      titre: "Sensibilité, bruit et plage dynamique",
      nav: "Bruit et dynamique",
      resume: "Bruit, gain, ISO, diaphs",
      intro: "Entre des noirs noyés dans le bruit et des blancs écrêtés, un capteur a une <b>plage dynamique</b> : l’écart entre la plus faible et la plus forte lumière qu’il sait mesurer. On l’exprime en <b>diaphs</b> (IL). Elle dépend de la taille des photosites, du bruit… et du gain.",
      notions: {
        titre: "Ce qui limite l’image dans les noirs et dans les blancs",
        intro: "En haut, la limite est la <b>capacité</b> du photosite (module 2). En bas, c’est le <b>bruit</b> : les variations aléatoires qui masquent les détails sombres. La plage dynamique est l’écart entre les deux.",
        mots: [
          { t: "Bruit", ic: "🌫️", d: "Des variations <b>aléatoires</b> du signal, qui n’existent pas dans la scène. Il se voit comme un grain qui fourmille d’une image à l’autre, surtout dans les <b>zones sombres</b>.", c: "Le souffle d’une cassette audio, entendu pendant les silences." },
          { t: "Bruit photonique", ic: "🎲", q: "D’où vient le bruit photonique ?", d: "La lumière arrive en grains, au hasard : deux photosites éclairés pareil ne reçoivent jamais exactement le même nombre de photons. L’écart typique vaut <b>√N</b>. Ce bruit vient de la lumière elle-même : il existe même avec un capteur parfait.", c: "Deux seaux sous la même pluie ne contiennent jamais exactement le même nombre de gouttes.", r: "100 électrons → ± 10 (10 %) · 10 000 électrons → ± 100 (1 %)." },
          { t: "Bruit de lecture", u: "e⁻", ic: "📻", d: "Le bruit ajouté par l’électronique (amplificateur, convertisseur) à chaque lecture, même dans le noir complet. Il fixe le <b>plancher</b> des noirs.", r: "1 à 3 e⁻ pour un bon capteur CMOS actuel ; 10 à 20 e⁻ pour des capteurs plus anciens." },
          { t: "Courant d’obscurité", ic: "🌡️", d: "Des électrons libérés par la <b>chaleur</b>, sans aucune lumière. Il augmente avec la température et avec le temps d’exposition : d’où les ventilateurs des caméras de cinéma." },
          { t: "Bruit fixe", ic: "📊", q: "Qu’est-ce que le bruit fixe (FPN) ?", d: "Un motif qui ne change pas d’une image à l’autre : lignes, colonnes, photosites « chauds » toujours trop clairs. Il vient des petites différences entre photosites. On le corrige par un <b>calibrage du noir</b> (black balance, black shading), objectif bouché." },
          { t: "Rapport signal sur bruit", s: "RSB (SNR)", u: "— ou dB", ic: "⚖️", d: "Le signal divisé par le bruit. Plus il est grand, plus l’image est propre. Quand seul le bruit photonique compte, il vaut <b>√N</b> : il faut <b>quatre fois plus de lumière</b> pour le doubler.", r: "RSB = 1 : le détail se confond avec le bruit." },
          { t: "Plage dynamique", u: "IL (diaphs) ou dB", ic: "🌗", q: "Qu’est-ce que la plage dynamique d’un capteur ?", d: "Le rapport entre le <b>plus grand</b> signal mesurable (photosite plein) et le <b>plus petit</b> (le niveau du bruit dans les noirs). On l’exprime en <b>diaphs</b> (IL) : chaque diaph correspond à un doublement de la lumière.", r: "Caméscope de poing : 10 à 12 IL · caméra de cinéma : 14 à 17 IL · un diaph ≈ 6 dB." },
          { t: "Gain", u: "dB", ic: "🎚️", q: "Que fait le gain sur une caméra ?", d: "Une <b>amplification</b> du signal après le photosite. Il éclaircit l’image mais amplifie aussi le bruit, et il ne crée <b>aucune lumière</b>. En plus, il fait écrêter plus tôt : on perd de la dynamique dans les hautes lumières. <b>+6 dB = signal × 2 = +1 diaph</b>.", c: "Monter le volume d’un enregistrement : la voix monte… et le souffle aussi.", r: "Caméras de plateau : 0, +6, +12, +18 dB." },
          { t: "Sensibilité ISO", s: "ISO / IE", ic: "🔆", d: "Une autre façon d’indiquer le gain, venue de la photographie (on parle aussi d’indice d’exposition, IE). Doubler l’ISO (800 → 1 600) = +6 dB = +1 diaph. L’<b>ISO natif</b> est le réglage pour lequel le capteur donne sa meilleure plage dynamique." },
          { t: "Double ISO natif", ic: "🔀", q: "Qu’est-ce qu’un double ISO natif ?", d: "Certains capteurs ont <b>deux gains de conversion</b> dans chaque photosite : l’un pour les scènes lumineuses (grande capacité), l’autre pour la basse lumière (moins de bruit de lecture). On obtient deux réglages « propres », très éloignés.", r: "Exemples : 800 et 5 000 ISO, ou 500 et 2 500 ISO, selon les caméras." },
          { t: "Latitude d’exposition", ic: "↔️", d: "La marge de surexposition et de sous-exposition que l’on peut corriger en étalonnage sans perte visible. Elle découle de la plage dynamique : on la répartit autour du gris moyen (par exemple +6 / −7 diaphs)." }
        ],
        formules: [
          { q: "Comment calcule-t-on la plage dynamique en diaphs ?", f: "DR = log<sub>2</sub>(N<sub>max</sub> / N<sub>bruit</sub>)", say: "la plage dynamique en diaphs est égale au logarithme en base 2 du rapport entre la capacité et le bruit des noirs", rows: [["DR", "plage dynamique", "IL (diaphs)", "nombre de doublements de lumière"], ["N<sub>max</sub>", "capacité du photosite", "e⁻", "le haut de la plage"], ["N<sub>bruit</sub>", "bruit de lecture", "e⁻", "le bas de la plage"]], ex: "30 000 e⁻ / 3 e⁻ = 10 000 ; log<sub>2</sub>(10 000) = log(10 000) / log(2) ≈ 13,3 IL." },
          { q: "Et la plage dynamique en décibels ?", f: "DR<sub>dB</sub> = 20 × log(N<sub>max</sub> / N<sub>bruit</sub>)", say: "la plage dynamique en décibels est égale à vingt fois le logarithme décimal du rapport entre la capacité et le bruit", rows: [["DR<sub>dB</sub>", "plage dynamique", "dB", "comme pour un signal audio"], ["log", "logarithme décimal", "—", "touche « log » de la calculatrice"]], ex: "10 000 → 20 × log(10 000) = 20 × 4 = 80 dB. Un diaph vaut environ 6 dB : 80 / 6 ≈ 13,3 IL." },
          { q: "Comment calcule-t-on le rapport signal sur bruit photonique ?", f: "RSB = N / √N = √N", say: "le rapport signal sur bruit est égal à la racine carrée du nombre d’électrons", rows: [["RSB", "rapport signal sur bruit", "—", "plus il est grand, plus l’image est propre"], ["N", "électrons recueillis", "e⁻", "le signal"], ["√N", "bruit photonique", "e⁻", "l’écart aléatoire typique"]], ex: "N = 10 000 e⁻ : RSB = 100 (40 dB). Quatre fois moins de lumière (2 500 e⁻) : RSB = 50." },
          { q: "Combien multiplie un gain exprimé en dB ?", f: "A = 10<sup>G / 20</sup>", say: "l’amplification est égale à dix puissance le gain en décibels divisé par vingt", rows: [["A", "amplification", "fois", "signal × A"], ["G", "gain", "dB", "+6 dB ≈ × 2"]], ex: "+12 dB : 10<sup>12/20</sup> ≈ 4 : le signal (et le bruit) sont multipliés par 4, soit +2 diaphs." }
        ]
      },
      manipuler: {
        titre: "Une charte de 15 diaphs, du noir au blanc",
        intro: "Chaque case est <b>deux fois plus lumineuse</b> que sa voisine de gauche. Changez la taille des photosites, le bruit de lecture, l’exposition et le gain : observez quelles cases sont <b>écrêtées</b> (blanches sans détail) et lesquelles sont <b>noyées</b> dans le bruit. La plage dynamique, c’est le nombre de cases utilisables."
      },
      essentiel: {
        definitions: [
          "<b>Bruit photonique</b> : vient de la lumière elle-même, vaut √N ; inévitable.",
          "<b>Bruit de lecture</b> : ajouté par l’électronique ; il fixe le plancher des noirs.",
          "<b>Plage dynamique</b> : rapport capacité / bruit, en diaphs (IL) ou en dB.",
          "<b>Gain</b> : amplification après le photosite ; il amplifie aussi le bruit et ne crée pas de lumière.",
          "<b>ISO natif</b> : réglage qui donne la meilleure plage dynamique ; double ISO natif = deux gains de conversion."
        ],
        formules: [["DR = log<sub>2</sub>(N<sub>max</sub> / N<sub>bruit</sub>)", "en diaphs : log(x) / log(2) à la calculatrice"], ["DR<sub>dB</sub> = 20 × log(N<sub>max</sub> / N<sub>bruit</sub>)", "1 diaph ≈ 6 dB"], ["RSB = √N", "4 fois plus de lumière = RSB × 2"], ["A = 10<sup>G / 20</sup>", "+6 dB = × 2 = +1 diaph"]],
        reperes: ["+6 dB = × 2 = +1 diaph = ISO × 2.", "Caméra de cinéma : 14 à 17 IL ; caméscope : 10 à 12 IL.", "Bruit de lecture d’un CMOS récent : 1 à 3 électrons."],
        pieges: ["Le gain n’ajoute pas de lumière : il amplifie autant le bruit que le signal.", "Un capteur bruite surtout dans les <b>ombres</b>, là où il y a peu d’électrons.", "log<sub>2</sub> n’est pas log : log<sub>2</sub>(x) = log(x) / log(2)."]
      },
      evaluation: {
        lire: [
          () => { const dr = C([12, 13, 14, 15, 16]), iso = C([[800, 3200], [500, 2500], [800, 5000]]); return { type: "nombre", contexte: "Fiche technique : « Plage dynamique : " + dr + " IL · ISO natifs : " + NB(iso[0], 0) + " et " + NB(iso[1], 0) + " · bruit de lecture : 2,4 e⁻ ».", question: "Quelle est la plage dynamique annoncée, en diaphs ?", reponse: dr, unite: "IL", ecart: 0, explication: "IL = indice de lumination = diaph : " + dr + " IL.", indice: "Cherchez l’unité IL." }; },
          () => { const iso = C([[800, 3200], [500, 2500], [800, 5000]]); return { type: "nombre", contexte: "Fiche technique : « Double ISO natif : " + NB(iso[0], 0) + " / " + NB(iso[1], 0) + " ».", question: "Quel est l’ISO natif le plus <b>élevé</b>, prévu pour la basse lumière ?", reponse: iso[1], unite: "ISO", tolerance: 0, explication: "Les deux ISO natifs sont " + NB(iso[0], 0) + " et " + NB(iso[1], 0) + " ; le plus élevé (" + NB(iso[1], 0) + ") sert en basse lumière.", indice: "Prenez le plus grand des deux nombres." }; },
          () => { const g = C([6, 12, 18]); return { type: "nombre", contexte: "Menu de la caméra : « Gain : L = 0 dB · M = " + g + " dB · H = " + (g + 6) + " dB ».", question: "Quel est le gain en position <b>M</b>, en dB ?", reponse: g, unite: "dB", ecart: 0, explication: "Position M = " + g + " dB, soit " + g / 6 + " diaph" + (g > 6 ? "s" : "") + " de plus que 0 dB.", indice: "Lisez la valeur après « M »." }; }
        ],
        comprendre: [
          ["Le gain augmente la quantité de lumière reçue par le capteur.", false, "Le gain amplifie le signal électrique après le photosite. La lumière reçue ne change pas, et le bruit est amplifié aussi.", "Le gain agit après le photosite."],
          ["Le bruit se voit surtout dans les zones sombres de l’image.", true, "Peu d’électrons : le rapport signal sur bruit √N est faible, et le bruit de lecture pèse plus lourd."],
          ["Pour doubler le rapport signal sur bruit photonique, il faut quatre fois plus de lumière.", true, "RSB = √N : √(4N) = 2√N."],
          ["Un gain de +6 dB correspond environ à un diaph de plus.", true, "+6 dB multiplie le signal par 2, comme ouvrir d’un diaph."],
          ["Le bruit photonique disparaîtrait avec une électronique parfaite.", false, "Il vient de la nature aléatoire de la lumière elle-même : aucune électronique ne peut le supprimer."],
          ["Des photosites plus grands donnent en général une plage dynamique plus grande.", true, "Leur capacité est plus grande, pour un bruit de lecture voisin : le rapport N<sub>max</sub> / N<sub>bruit</sub> augmente."],
          ["Le calibrage du noir sert à corriger le bruit fixe du capteur.", true, "Objectif bouché, la caméra mesure le motif fixe de chaque photosite et le soustrait ensuite."]
        ],
        qcm: [
          ["Quelle est l’origine du bruit photonique ?", "L’arrivée aléatoire des photons", ["La chaleur du capteur", "Les défauts de l’objectif", "La compression de l’image"], "Les photons arrivent au hasard : le nombre reçu varie de √N autour de sa moyenne."],
          ["Que se passe-t-il quand on monte le gain de +12 dB ?", "L’image est 4 fois plus claire, le bruit aussi est amplifié", ["Le capteur reçoit 4 fois plus de lumière", "Le bruit diminue de moitié", "La plage dynamique double"], "10<sup>12/20</sup> ≈ 4 : signal et bruit sont multipliés par 4."],
          ["Comment exprime-t-on le plus souvent la plage dynamique d’une caméra ?", "En diaphs (IL)", ["En lux", "En kelvins", "En mégapixels"], "Chaque diaph est un doublement de lumière : une caméra de cinéma atteint 14 à 17 IL."],
          ["Qu’est-ce que l’ISO natif d’une caméra ?", "Le réglage qui donne la meilleure plage dynamique", ["L’ISO le plus élevé possible", "L’ISO sans aucun bruit", "La sensibilité du capteur à l’infrarouge"], "À l’ISO natif, le capteur exploite toute sa capacité avec le bruit le plus faible."],
          ["Pourquoi les caméras de cinéma ont-elles un ventilateur près du capteur ?", "Pour limiter le courant d’obscurité, qui augmente avec la chaleur", ["Pour refroidir l’objectif", "Pour réduire le rolling shutter", "Pour éviter la condensation sur l’écran"], "Un capteur chaud libère des électrons sans lumière : le bruit monte."],
          ["Capacité 40 000 e⁻, bruit de lecture 2,5 e⁻ : quelle plage dynamique ?", "Environ 14 IL", ["Environ 8 IL", "Environ 20 IL", "Environ 40 IL"], "40 000 / 2,5 = 16 000 ; log<sub>2</sub>(16 000) ≈ 14 IL."]
        ],
        calculer: [
          () => { const fw = C([10000, 20000, 30000, 50000, 80000]), rn = C([2, 2.5, 3, 5, 10]); const r = fw / rn; return { type: "nombre", question: "Un photosite a une capacité de <b>" + NB(fw, 0) + " e⁻</b> et un bruit de lecture de <b>" + NB(rn) + " e⁻</b>. Quelle est sa plage dynamique, en diaphs ?", reponse: Math.log2(r), unite: "IL", ecart: 0.15, explication: NB(fw, 0) + " / " + NB(rn) + " = " + NB(r, 0) + " ; log<sub>2</sub>(" + NB(r, 0) + ") = log(" + NB(r, 0) + ") / log(2) ≈ " + NB(Math.log2(r), 1) + " IL.", indice: "DR = log(N<sub>max</sub> / N<sub>bruit</sub>) / log(2)." }; },
          () => { const fw = C([10000, 20000, 40000, 60000]), rn = C([2, 4, 5, 10]); const r = fw / rn; return { type: "nombre", question: "Capacité <b>" + NB(fw, 0) + " e⁻</b>, bruit de lecture <b>" + rn + " e⁻</b>. Quelle est la plage dynamique, en dB ?", reponse: 20 * Math.log10(r), unite: "dB", ecart: 0.5, explication: "20 × log(" + NB(r, 0) + ") ≈ " + NB(20 * Math.log10(r), 1) + " dB.", indice: "DR<sub>dB</sub> = 20 × log(rapport)." }; },
          () => { const n = C([100, 400, 900, 2500, 10000, 40000]); return { type: "nombre", question: "Un photosite recueille <b>" + NB(n, 0) + " électrons</b>. En ne comptant que le bruit photonique, quel est le rapport signal sur bruit ?", reponse: Math.sqrt(n), unite: "", explication: "RSB = √N = √" + NB(n, 0) + " = " + NB(Math.sqrt(n), 0) + ".", indice: "RSB = N / √N = √N." }; },
          () => { const g = C([6, 12, 18, 24]); return { type: "nombre", question: "Par combien un gain de <b>+" + g + " dB</b> multiplie-t-il le signal ?", reponse: Math.pow(10, g / 20), unite: "fois", explication: "A = 10<sup>" + g + "/20</sup> ≈ " + NB(Math.pow(10, g / 20), 1) + " (≈ 2<sup>" + g / 6 + "</sup>).", indice: "Chaque tranche de 6 dB double le signal." }; },
          () => { const a = C([400, 500, 800, 1600]), k = C([1, 2, 3]); const b = a * Math.pow(2, k); return { type: "nombre", question: "On passe de <b>" + NB(a, 0) + " ISO</b> à <b>" + NB(b, 0) + " ISO</b>. Quel gain cela représente-t-il, en dB ?", reponse: 6 * k, unite: "dB", ecart: 0.3, explication: NB(b, 0) + " / " + NB(a, 0) + " = " + Math.pow(2, k) + " = " + k + " doublement" + (k > 1 ? "s" : "") + " : " + k + " × 6 = " + 6 * k + " dB.", indice: "Comptez les doublements : chacun vaut 6 dB." }; },
          () => { const g = C([6, 12, 18, 24, 30]); return { type: "nombre", question: "Un gain de <b>+" + g + " dB</b> équivaut à combien de diaphs ?", reponse: g / 6, unite: "IL", ecart: 0.05, explication: g + " / 6 = " + g / 6 + " diaph" + (g > 6 ? "s" : "") + ".", indice: "1 diaph ≈ 6 dB." }; }
        ],
        exercice: [
          () => { const p = C([3, 4, 5, 6]), rn = C([2, 3, 4]); const fw = 1500 * p * p, r = fw / rn; return { type: "exercice", question: "Un capteur a des photosites de <b>" + p + " µm</b>. On estime leur capacité à <b>1 500 e⁻ par µm²</b>. Le bruit de lecture vaut <b>" + rn + " e⁻</b>.", etapes: [
            { question: "Capacité d’un photosite ?", reponse: fw, unite: "e⁻" },
            { question: "Plage dynamique, en diaphs ?", reponse: Math.log2(r), unite: "IL", ecart: 0.15 },
            { question: "Plage dynamique, en dB ?", reponse: 20 * Math.log10(r), unite: "dB", ecart: 0.5 }
          ], solution: "a) " + p + "² × 1 500 = " + NB(fw, 0) + " e⁻. b) " + NB(fw, 0) + " / " + rn + " = " + NB(r, 0) + " ; log<sub>2</sub> ≈ " + NB(Math.log2(r), 1) + " IL. c) 20 × log(" + NB(r, 0) + ") ≈ " + NB(20 * Math.log10(r), 1) + " dB.", indice: "a) S = p². b) log(x) / log(2). c) 20 × log(x)." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 4 — LE MATRIÇAGE : BAYER ET TRI-CAPTEUR
       ====================================================================== */
    {
      titre: "La couleur : matrice de Bayer et tri-capteur",
      nav: "Matriçage",
      resume: "Bayer, dématriçage, prisme",
      intro: "Un photosite ne voit pas les couleurs. Pour filmer en couleur, il faut séparer la lumière en <b>rouge</b>, <b>vert</b> et <b>bleu</b>. Deux solutions : poser une mosaïque de filtres sur un capteur unique (<b>matrice de Bayer</b>), ou diviser la lumière vers <b>trois capteurs</b> grâce à un prisme.",
      notions: {
        titre: "Trois couleurs pour un capteur daltonien",
        intro: "Avec une matrice de Bayer, chaque photosite ne mesure qu’<b>une</b> couleur : les deux autres sont <b>devinées</b> par calcul. Avec un tri-capteur, chaque point de l’image est mesuré dans les <b>trois</b> couleurs.",
        mots: [
          { t: "Filtre coloré", ic: "🎨", q: "À quoi servent les filtres colorés posés sur le capteur ?", d: "Une mosaïque de minuscules filtres rouges, verts et bleus, un par photosite (en anglais : Color Filter Array, CFA). Chaque filtre ne laisse passer que sa couleur : environ <b>deux tiers</b> de la lumière sont absorbés." },
          { t: "Matrice de Bayer", ic: "🟩", q: "Comment la matrice de Bayer est-elle organisée ?", d: "Un motif de <b>2 × 2</b> photosites, répété sur tout le capteur : <b>un rouge, deux verts, un bleu</b> (motif « RGGB »). Inventée par Bryce Bayer chez Kodak en 1976, elle équipe presque toutes les caméras à capteur unique.", r: "50 % de vert, 25 % de rouge, 25 % de bleu." },
          { t: "Pourquoi deux verts ?", ic: "💚", q: "Pourquoi la matrice de Bayer a-t-elle deux fois plus de vert ?", d: "L’œil est surtout sensible au vert, et le vert porte l’essentiel de la <b>luminance</b>, donc du détail et de la netteté. Doubler le vert, c’est mieux mesurer ce que l’œil voit le mieux.", r: "Y = 0,2126 R + 0,7152 V + 0,0722 B : le vert pèse 72 % de la luminance." },
          { t: "Dématriçage", ic: "🧩", q: "Qu’est-ce que le dématriçage (debayering) ?", d: "Le calcul qui reconstitue, pour chaque photosite, les <b>deux couleurs manquantes</b> à partir de ses voisins. Il est fait par la caméra, ou par le logiciel de post-production pour un fichier RAW. Plus l’algorithme est fin, moins il laisse d’artefacts.", c: "Compléter un puzzle dont il manque deux pièces sur trois, en regardant les pièces voisines." },
          { t: "RAW", ic: "🗃️", d: "Les valeurs brutes des photosites, <b>avant</b> dématriçage, balance des blancs et courbe d’image. Une seule valeur par photosite : le fichier est plus léger qu’une image RVB non compressée, et tous ces réglages restent modifiables en post-production." },
          { t: "Fausses couleurs et moiré", ic: "🌈", q: "Pourquoi un capteur de Bayer crée-t-il parfois des fausses couleurs ?", d: "Sur des détails plus fins que la mosaïque (tissus rayés, grilles, cheveux), les voisins ne ressemblent plus au photosite : le dématriçage se trompe. Apparaissent des <b>franges colorées</b> et des <b>motifs ondulés</b> (moiré) qui n’existent pas dans la scène." },
          { t: "Filtre passe-bas optique", s: "OLPF", ic: "🌫️", d: "Une fine lame placée devant le capteur, qui adoucit très légèrement l’image pour supprimer les détails trop fins <b>avant</b> qu’ils ne créent du moiré. C’est le <b>filtre anti-repliement</b> du capteur (théorème de Shannon).", c: "Plisser les yeux devant un tissu rayé : on perd un peu de détail, mais plus de moiré." },
          { t: "Résolution réelle", ic: "🔬", d: "Comme deux tiers des valeurs sont devinées, un capteur de Bayer résout moins de détails que son nombre de photosites ne le laisse croire : environ <b>70 à 80 %</b> en pratique. D’où les capteurs 5K, 6K ou 8K pour livrer une 4K très nette." },
          { t: "Tri-capteur", ic: "🔺", q: "Comment fonctionne une caméra tri-capteur ?", d: "Un <b>prisme dichroïque</b> placé derrière l’objectif sépare la lumière en trois faisceaux : rouge, vert et bleu. Chacun tombe sur son <b>propre capteur</b>. Chaque pixel est mesuré dans les trois couleurs : pas de dématriçage, des couleurs précises, peu de lumière perdue.", r: "Caméras de plateau et de reportage broadcast : 3 capteurs 2/3″ (3CCD, puis 3CMOS)." },
          { t: "Prisme dichroïque", ic: "💎", d: "Un bloc de prismes collés dont certaines faces portent des couches <b>dichroïques</b> : elles <b>réfléchissent</b> une couleur et <b>laissent passer</b> les autres. Les trois capteurs doivent être alignés au micron près (« alignement des capteurs »)." },
          { t: "Limites du tri-capteur", ic: "⚖️", q: "Quelles sont les limites du tri-capteur ?", d: "Encombrant, lourd et cher. Le prisme impose une grande distance entre l’objectif et les capteurs (le <b>tirage</b>) : il faut des objectifs spécifiques (monture <b>B4</b>), et les capteurs restent petits (2/3″). La profondeur de champ est donc grande : difficile d’obtenir un arrière-plan très flou." },
          { t: "Autres solutions", ic: "🧪", d: "Des variantes existent : mosaïque <b>X-Trans</b> (motif de 6 × 6, moins de moiré), capteurs <b>RGBW</b> avec des photosites sans filtre (plus de lumière), capteur à <b>trois couches</b> de silicium superposées (le bleu est absorbé en surface, le rouge en profondeur)." }
        ],
        formules: [
          { q: "Combien de photosites de chaque couleur sur un capteur de Bayer ?", f: "N<sub>V</sub> = N / 2 ; N<sub>R</sub> = N<sub>B</sub> = N / 4", say: "le nombre de photosites verts est la moitié du total, les rouges et les bleus un quart chacun", rows: [["N", "nombre total de photosites", "—", "N<sub>H</sub> × N<sub>V</sub>"], ["N<sub>V</sub>", "photosites verts", "—", "2 sur 4"], ["N<sub>R</sub>, N<sub>B</sub>", "photosites rouges, bleus", "—", "1 sur 4 chacun"]], ex: "Capteur 4K de 4 096 × 2 160 = 8 847 360 photosites : 4 423 680 verts, 2 211 840 rouges et 2 211 840 bleus." },
          { q: "Combien de valeurs le dématriçage doit-il deviner ?", f: "Valeurs devinées = 2 × N", say: "le nombre de valeurs devinées est égal à deux fois le nombre de photosites", rows: [["N", "photosites (une valeur mesurée chacun)", "—", ""], ["3 × N", "valeurs de l’image RVB", "—", "R, V et B pour chaque pixel"], ["2 × N", "valeurs devinées", "—", "deux tiers de l’image"]], ex: "8,8 millions de photosites mesurent 8,8 millions de valeurs ; l’image en compte 26,5 millions : 17,7 millions sont calculées." },
          { q: "Combien de photosites pour un tri-capteur ?", f: "N<sub>photosites</sub> = 3 × N<sub>pixels</sub>", say: "le nombre de photosites est égal à trois fois le nombre de pixels de l’image", rows: [["N<sub>pixels</sub>", "pixels de l’image", "—", "un photosite par pixel et par capteur"], ["3", "trois capteurs", "—", "rouge, vert, bleu"]], ex: "HD 1 920 × 1 080 en tri-capteur : 3 × 2 073 600 = 6 220 800 photosites." },
          { q: "Quelle définition de capteur pour une image vraiment nette ?", f: "N<sub>H, capteur</sub> ≈ N<sub>H, image</sub> / 0,75", say: "le nombre de photosites en largeur est environ égal à la largeur de l’image divisée par zéro virgule soixante-quinze", rows: [["0,75", "résolution réelle d’un Bayer", "—", "environ 70 à 80 %"]], ex: "UHD de 3 840 px vraiment résolue : 3 840 / 0,75 = 5 120 photosites, soit un capteur « 5K »." }
        ]
      },
      manipuler: {
        titre: "Ce que voit vraiment un capteur de Bayer",
        intro: "Passez de la <b>scène réelle</b> à la <b>mosaïque</b> mesurée par le capteur, puis à l’image <b>dématricée</b>. Survolez l’image : la loupe montre les photosites un par un. Activez le <b>filtre passe-bas optique</b> et regardez les fausses couleurs des rayures. Plus bas, suivez la lumière dans le <b>prisme</b> d’une caméra tri-capteur."
      },
      essentiel: {
        definitions: [
          "<b>Matrice de Bayer</b> : motif 2 × 2 de filtres R, V, V, B ; chaque photosite ne mesure qu’une couleur.",
          "<b>Dématriçage</b> : calcul des deux couleurs manquantes de chaque photosite à partir de ses voisins.",
          "<b>OLPF</b> : filtre passe-bas optique, il évite le moiré et les fausses couleurs.",
          "<b>Tri-capteur</b> : prisme dichroïque + trois capteurs ; chaque pixel est mesuré en R, V et B.",
          "<b>RAW</b> : valeurs brutes des photosites, avant dématriçage."
        ],
        formules: [["N<sub>V</sub> = N / 2 ; N<sub>R</sub> = N<sub>B</sub> = N / 4", "50 % vert, 25 % rouge, 25 % bleu"], ["Valeurs devinées = 2 × N", "deux tiers de l’image sont calculés"], ["Tri-capteur : 3 × N<sub>pixels</sub>", "trois capteurs complets"], ["Résolution réelle ≈ 0,75 × N<sub>H</sub>", "d’où les capteurs 5K ou 6K pour la 4K"]],
        reperes: ["Le filtre coloré absorbe environ 2/3 de la lumière.", "Tri-capteur broadcast : 3 capteurs 2/3″, objectifs en monture B4.", "Le vert pèse 72 % de la luminance."],
        pieges: ["Un capteur de Bayer de N photosites ne donne pas N pixels « complets » : il faut deviner 2 valeurs sur 3.", "Deux fois plus de <b>vert</b>, pas de rouge ni de bleu.", "Le tri-capteur ne fait pas de dématriçage : le prisme sépare les couleurs avant les capteurs."]
      },
      evaluation: {
        lire: [
          () => { const cx = H(0, 3), cy = H(0, 3); const c = bayerCase(cx, cy), noms = { R: "Rouge", V: "Vert", B: "Bleu" }; return { type: "qcm", question: "Ce schéma montre un bloc de 4 × 4 photosites d’un capteur de Bayer. Quelle couleur mesure le photosite entouré de blanc ?", figure: figureBayer(4, 4, cx, cy), bonne: noms[c], mauvaises: ["Rouge", "Vert", "Bleu", "Les trois couleurs"].filter(x => x !== noms[c]), explication: "Le photosite entouré porte un filtre " + noms[c].toLowerCase() + " : il ne mesure que cette couleur. Les deux autres seront devinées par dématriçage.", indice: "Regardez simplement la couleur de la case entourée." }; },
          () => { const nx = C([4, 6, 8]), ny = C([2, 4]); return { type: "nombre", question: "Combien de photosites <b>verts</b> compte ce bloc de " + nx + " × " + ny + " photosites ?", figure: figureBayer(nx, ny), reponse: nx * ny / 2, unite: "photosites", tolerance: 0, explication: "Dans une matrice de Bayer, la moitié des photosites sont verts : " + nx * ny + " / 2 = " + nx * ny / 2 + ".", indice: "Comptez une ligne, puis multipliez." }; },
          () => { return { type: "qcm", contexte: "Fiche technique d’une caméra d’épaule : « Capteurs : 3 × CMOS 2/3″ · monture B4 · séparation par prisme ».", question: "Comment cette caméra obtient-elle la couleur ?", bonne: "Un prisme envoie le rouge, le vert et le bleu vers trois capteurs", mauvaises: ["Une matrice de Bayer sur un capteur unique", "Un filtre coloré qui tourne devant le capteur", "Le capteur mesure directement la couleur des photons"], explication: "« 3 × CMOS » et « prisme » : c’est une caméra tri-capteur.", indice: "Combien de capteurs ?" }; }
        ],
        comprendre: [
          ["Dans une matrice de Bayer, il y a deux fois plus de photosites verts que de rouges.", true, "Motif R V / V B : 2 verts pour 1 rouge et 1 bleu."],
          ["Chaque photosite d’un capteur de Bayer mesure le rouge, le vert et le bleu.", false, "Chaque photosite n’a qu’un filtre : il ne mesure qu’une couleur. Les deux autres sont calculées.", "Regardez combien de filtres il y a sur un photosite."],
          ["Une caméra tri-capteur n’a pas besoin de dématriçage.", true, "Chaque pixel est mesuré par trois capteurs, un par couleur."],
          ["Le filtre passe-bas optique rend l’image légèrement plus douce pour éviter le moiré.", true, "Il supprime les détails trop fins pour la mosaïque, comme un filtre anti-repliement avant échantillonnage."],
          ["Un fichier RAW contient une image déjà dématricée.", false, "Le RAW garde les valeurs brutes, une par photosite, avant le dématriçage."],
          ["Le tri-capteur perd moins de lumière qu’un capteur de Bayer.", true, "Le prisme répartit la lumière au lieu de l’absorber : les filtres de Bayer en absorbent environ deux tiers."],
          ["Le tri-capteur est l’idéal pour obtenir un arrière-plan très flou.", false, "Ses capteurs sont petits (2/3″) : la profondeur de champ est grande. Les grands capteurs de Bayer s’y prêtent mieux."]
        ],
        qcm: [
          ["Quelle est la répartition des couleurs d’une matrice de Bayer ?", "50 % vert, 25 % rouge, 25 % bleu", ["33 % de chaque couleur", "50 % rouge, 25 % vert, 25 % bleu", "25 % vert, 50 % bleu, 25 % rouge"], "Motif 2 × 2 : R, V, V, B."],
          ["Pourquoi le vert est-il doublé dans la matrice de Bayer ?", "Parce qu’il porte l’essentiel de la luminance, à laquelle l’œil est le plus sensible", ["Parce que les photodiodes ne voient pas le vert", "Pour compenser l’infrarouge", "Parce que le vert est la couleur la plus fréquente dans la nature"], "Y = 0,2126 R + 0,7152 V + 0,0722 B."],
          ["Quel élément sépare les couleurs dans une caméra tri-capteur ?", "Un prisme dichroïque", ["Une matrice de Bayer", "Un filtre passe-bas optique", "Une roue de filtres"], "Les couches dichroïques réfléchissent une couleur et laissent passer les autres."],
          ["Quel défaut apparaît sur une chemise à fines rayures filmée avec un capteur de Bayer sans filtre passe-bas ?", "Du moiré et des fausses couleurs", ["Une image penchée", "Une traînée verticale", "Une dominante verte sur toute l’image"], "Les détails plus fins que la mosaïque trompent le dématriçage."],
          ["Pourquoi les objectifs de caméras tri-capteurs sont-ils spécifiques (monture B4) ?", "Le prisme impose un grand tirage entre objectif et capteurs", ["Ils contiennent les filtres de Bayer", "Ils doivent couvrir un capteur plein format", "Ils sont prévus pour l’infrarouge"], "Le bloc prisme prend de la place : l’objectif est calculé pour cette distance et pour la traversée du verre."],
          ["Que fait le dématriçage ?", "Il calcule les deux couleurs manquantes de chaque photosite", ["Il sépare la lumière en trois faisceaux", "Il compresse le fichier RAW", "Il supprime le bruit de lecture"], "Interpolation à partir des photosites voisins."]
        ],
        calculer: [
          () => { const d = C([[1920, 1080], [3840, 2160], [4096, 2160], [6144, 3240]]); const n = d[0] * d[1]; return { type: "nombre", question: "Un capteur de Bayer compte <b>" + NB(d[0], 0) + " × " + NB(d[1], 0) + "</b> photosites. Combien sont <b>verts</b> ?", reponse: n / 2, unite: "photosites", tolerance: 0.001, explication: NB(n, 0) + " / 2 = " + NB(n / 2, 0) + " photosites verts.", indice: "La moitié des photosites sont verts." }; },
          () => { const d = C([[1920, 1080], [3840, 2160], [4096, 2160], [6144, 3240]]); const n = d[0] * d[1]; const coul = C(["rouges", "bleus"]); return { type: "nombre", question: "Un capteur de Bayer compte <b>" + NB(d[0], 0) + " × " + NB(d[1], 0) + "</b> photosites. Combien sont <b>" + coul + "</b> ?", reponse: n / 4, unite: "photosites", tolerance: 0.001, explication: NB(n, 0) + " / 4 = " + NB(n / 4, 0) + " photosites " + coul + ".", indice: "Un photosite sur quatre est " + coul.slice(0, -1) + "." }; },
          () => { const d = C([[1920, 1080], [1280, 720], [3840, 2160]]); const n = d[0] * d[1]; return { type: "nombre", question: "Une caméra <b>tri-capteur</b> produit une image de <b>" + NB(d[0], 0) + " × " + NB(d[1], 0) + "</b> pixels. Combien de photosites compte-t-elle au total ?", reponse: 3 * n, unite: "photosites", tolerance: 0.001, explication: "3 × " + NB(n, 0) + " = " + NB(3 * n, 0) + " photosites.", indice: "Un capteur complet par couleur." }; },
          () => { const w = C([1920, 3840, 4096, 7680]); return { type: "nombre", question: "On compte qu’un capteur de Bayer résout environ <b>75 %</b> de son nombre de photosites. Combien de photosites en largeur faut-il pour une image réellement résolue de <b>" + NB(w, 0) + " pixels</b> de large ?", reponse: w / 0.75, unite: "photosites", explication: NB(w, 0) + " / 0,75 = " + NB(w / 0.75, 0) + " photosites.", indice: "Divisez par 0,75 (et non multipliez)." }; },
          () => { const n = C([12000, 24000, 30000, 45000]); return { type: "nombre", question: "<b>" + NB(n, 0) + " photons</b> arrivent sur un photosite de Bayer. Le filtre coloré en laisse passer environ <b>un tiers</b>. Combien atteignent la photodiode ?", reponse: n / 3, unite: "photons", explication: NB(n, 0) + " / 3 = " + NB(n / 3, 0) + " photons ; les deux autres tiers sont absorbés par le filtre.", indice: "Un tiers = divisé par 3." }; },
          () => { const m = C([2, 8.8, 12, 21, 33]); return { type: "nombre", question: "Un capteur de Bayer de <b>" + NB(m, 1) + " millions</b> de photosites produit une image RVB de même définition. Combien de millions de valeurs le dématriçage doit-il <b>deviner</b> ?", reponse: 2 * m, unite: "millions", explication: "L’image compte 3 × " + NB(m, 1) + " valeurs ; " + NB(m, 1) + " sont mesurées : 2 × " + NB(m, 1) + " = " + NB(2 * m, 1) + " millions sont devinées.", indice: "Chaque photosite mesure 1 valeur sur 3." }; }
        ],
        exercice: [
          () => { const d = C([[3840, 2160], [4096, 2160], [6144, 3456]]); const n = d[0] * d[1]; return { type: "exercice", question: "Un capteur de Bayer compte <b>" + NB(d[0], 0) + " × " + NB(d[1], 0) + "</b> photosites. On le compare à une caméra tri-capteur donnant la même définition d’image.", etapes: [
            { question: "Nombre de photosites verts du capteur de Bayer ?", reponse: n / 2, unite: "photosites", tolerance: 0.001 },
            { question: "Nombre de valeurs devinées par le dématriçage ?", reponse: 2 * n, unite: "valeurs", tolerance: 0.001 },
            { question: "Nombre total de photosites de la caméra tri-capteur ?", reponse: 3 * n, unite: "photosites", tolerance: 0.001 }
          ], solution: "N = " + NB(n, 0) + ". a) N / 2 = " + NB(n / 2, 0) + ". b) 2 × N = " + NB(2 * n, 0) + ". c) 3 × N = " + NB(3 * n, 0) + ".", indice: "Commencez par N = largeur × hauteur." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 5 — LA LECTURE : ROLLING SHUTTER, CAPTEURS EMPILÉS ET SEMI-EMPILÉS
       ====================================================================== */
    {
      titre: "Lire le capteur : rolling shutter, capteurs empilés et semi-empilés",
      nav: "Lecture et empilement",
      resume: "Rolling shutter, empilé, semi-empilé",
      intro: "Un capteur CMOS ne se lit pas d’un seul coup : il se lit <b>ligne après ligne</b>, de haut en bas. Si la scène bouge pendant ce temps, l’image se déforme. Les capteurs <b>empilés</b> et <b>semi-empilés</b> ont été inventés pour lire beaucoup plus vite, et l’obturateur <b>global</b> pour supprimer le problème.",
      notions: {
        titre: "Le temps de lecture, et comment le raccourcir",
        intro: "Tout se joue sur le <b>temps de lecture</b> : la durée entre la lecture de la première ligne et celle de la dernière. Pour le réduire, il faut <b>plus de convertisseurs travaillant en parallèle</b>… et donc de la place pour les loger : c’est l’idée de l’empilement.",
        mots: [
          { t: "Lecture ligne par ligne", ic: "📜", d: "Sur un CMOS, chaque ligne est remise à zéro, exposée, puis lue <b>un peu après la précédente</b>. Toutes les lignes ont la même durée d’exposition, mais <b>pas au même moment</b>.", c: "Une ola dans un stade : chaque rang se lève à son tour." },
          { t: "Temps de lecture", u: "ms", ic: "⏱️", q: "Qu’est-ce que le temps de lecture (readout) d’un capteur ?", d: "Le temps qu’il faut pour lire tout le capteur, de la première à la dernière ligne. Plus il est court, moins l’image se déforme et plus la cadence peut être élevée.", r: "Ordres de grandeur : capteur classique plein format 20 à 40 ms · semi-empilé ≈ 10 à 15 ms · empilé 2 à 8 ms · global : 0." },
          { t: "Rolling shutter", ic: "🌀", q: "Qu’est-ce que l’effet rolling shutter ?", d: "L’obturateur « roulant » : les déformations dues à la lecture ligne par ligne. Le bas de l’image est enregistré plus tard que le haut : un sujet rapide ou un panoramique vif apparaissent <b>penchés</b>.", c: "Un scanner de bureau : si l’on bouge la feuille pendant la numérisation, l’image est tordue." },
          { t: "Les artefacts du rolling shutter", ic: "⚠️", q: "Quels défauts provoque le rolling shutter ?", d: "<b>Inclinaison</b> des verticales en panoramique (skew) ; effet <b>gelée</b> (jello) quand la caméra vibre ; <b>flash coupé</b> : un flash ou un éclair n’éclaire qu’une bande de l’image ; <b>pales d’hélice</b> tordues et détachées." },
          { t: "Obturateur global", ic: "📸", q: "Qu’est-ce qu’un obturateur global (global shutter) ?", d: "Tous les photosites commencent et finissent leur exposition <b>au même instant</b> : aucune déformation. Chaque photosite doit garder sa charge dans une petite <b>mémoire</b> en attendant d’être lu : moins de place pour la photodiode, donc souvent un peu plus de bruit et un peu moins de dynamique.", c: "Une photo de groupe : tout le monde est figé au même moment." },
          { t: "Capteur classique", ic: "🧱", q: "Pourquoi un capteur classique se lit-il lentement ?", d: "Les photodiodes et tous les circuits de lecture (amplificateurs, convertisseurs) sont gravés <b>sur la même puce</b>, côte à côte. Les convertisseurs sont rangés en bordure de la zone d’image : leur nombre, donc le nombre de lignes lues en même temps, est limité.", c: "Un seul guichet à la sortie d’un stade : tout le monde fait la queue." },
          { t: "Capteur empilé", ic: "🥞", q: "Qu’est-ce qu’un capteur empilé (stacked) ?", d: "Deux puces (parfois trois) <b>superposées</b> et reliées par des milliers de connexions : en haut, la couche des <b>photodiodes</b> (rétroéclairée) ; en dessous, sur <b>toute la surface</b>, une couche de <b>circuits</b> : de très nombreux convertisseurs, parfois une mémoire. On lit beaucoup de lignes en parallèle : la lecture est <b>très rapide</b>.", c: "Un immeuble : les fenêtres à l’étage, les bureaux au rez-de-chaussée ; chacun dispose de toute la surface.", r: "Lecture de 2 à 8 ms : rolling shutter presque invisible, hautes cadences, rafales." },
          { t: "Capteur semi-empilé", ic: "🧩", q: "Qu’est-ce qu’un capteur semi-empilé (partiellement empilé) ?", d: "Un <b>compromis</b> : les circuits de lecture rapides ne sont empilés que sur <b>une partie</b> du capteur, en bandes situées <b>au-dessus et au-dessous</b> de la zone d’image, et non sous toute sa surface. La lecture est nettement plus rapide qu’avec un capteur classique (≈ 2 à 3 fois), pour un coût bien inférieur à celui d’un capteur empilé complet.", r: "Apparu en 2024 sur des hybrides plein format de milieu de gamme : ≈ 10 à 15 ms de lecture." },
          { t: "Cadence maximale", u: "images/s", ic: "🎞️", d: "Le capteur ne peut pas donner plus d’images par seconde qu’il ne peut en lire : f<sub>max</sub> ≈ 1 / t<sub>lecture</sub>. Une lecture rapide permet les <b>hautes cadences</b> (100, 120 images/s) et donc les ralentis." },
          { t: "Mémoire tampon intégrée", ic: "💾", d: "Dans certains capteurs empilés, une troisième couche de <b>mémoire</b> (DRAM) stocke les images à la sortie des convertisseurs. Le capteur est lu très vite, puis les données sont envoyées au processeur à leur rythme." }
        ],
        formules: [
          { q: "Comment calcule-t-on le temps de lecture d’un capteur ?", f: "t<sub>lecture</sub> = N<sub>lignes</sub> × t<sub>ligne</sub>", say: "le temps de lecture est égal au nombre de lignes multiplié par le temps de lecture d’une ligne", rows: [["t<sub>lecture</sub>", "temps de lecture", "s (ou ms)", "première → dernière ligne"], ["N<sub>lignes</sub>", "lignes lues", "—", "2 160 en UHD"], ["t<sub>ligne</sub>", "temps par ligne", "µs", "plus court si plus de convertisseurs en parallèle"]], ex: "2 160 lignes × 7,5 µs = 16 200 µs ≈ 16 ms." },
          { q: "De combien un sujet en mouvement est-il décalé entre le haut et le bas de l’image ?", f: "d = v × t<sub>lecture</sub>", say: "le décalage est égal à la vitesse du sujet sur l’image multipliée par le temps de lecture", rows: [["d", "décalage horizontal", "px", "entre la 1<sup>re</sup> et la dernière ligne"], ["v", "vitesse sur l’image", "px/s", "largeur traversée par seconde"], ["t<sub>lecture</sub>", "temps de lecture", "s", "20 ms = 0,02 s"]], ex: "Un panoramique fait défiler l’image UHD (3 840 px) en 1 s : v = 3 840 px/s. Lecture 20 ms : d = 3 840 × 0,02 ≈ 77 px." },
          { q: "De quel angle une verticale penche-t-elle ?", f: "α = arctan(d / H)", say: "l’angle d’inclinaison est égal à l’arc tangente du décalage divisé par la hauteur de l’image", rows: [["α", "inclinaison", "°", "par rapport à la verticale"], ["d", "décalage", "px", ""], ["H", "hauteur de l’image", "px", "2 160 en UHD"]], ex: "77 px sur 2 160 px : α = arctan(77 / 2 160) ≈ 2°." },
          { q: "Quelle cadence maximale permet le temps de lecture ?", f: "f<sub>max</sub> ≈ 1 / t<sub>lecture</sub>", say: "la cadence maximale est environ égale à un divisé par le temps de lecture", rows: [["f<sub>max</sub>", "cadence maximale", "images/s", ""], ["t<sub>lecture</sub>", "temps de lecture", "s", ""]], ex: "Lecture 8 ms : 1 / 0,008 = 125 images/s au maximum." }
        ]
      },
      manipuler: {
        titre: "Filmer une scène qui bouge, ligne après ligne",
        intro: "À gauche, la scène réelle ; à droite, l’image enregistrée, construite <b>ligne par ligne</b> au passage de la ligne rouge (l’animation est ralentie, à la même échelle pour tous les capteurs). Changez d’<b>architecture</b> : classique, semi-empilé, empilé ou global, et comparez la déformation des poteaux, des pales d’hélice ou d’un flash."
      },
      essentiel: {
        definitions: [
          "<b>Rolling shutter</b> : lecture ligne par ligne ; le bas de l’image est enregistré plus tard que le haut.",
          "<b>Global shutter</b> : toutes les lignes exposées en même temps ; aucune déformation.",
          "<b>Capteur empilé</b> : couche de photodiodes au-dessus d’une couche de circuits sur toute la surface ; lecture très rapide.",
          "<b>Capteur semi-empilé</b> : circuits rapides empilés seulement en bandes au-dessus et au-dessous de l’image ; compromis vitesse / coût.",
          "<b>Temps de lecture</b> : durée entre la lecture de la première et de la dernière ligne."
        ],
        formules: [["t<sub>lecture</sub> = N<sub>lignes</sub> × t<sub>ligne</sub>", "temps de lecture"], ["d = v × t<sub>lecture</sub>", "décalage en pixels"], ["α = arctan(d / H)", "inclinaison des verticales"], ["f<sub>max</sub> ≈ 1 / t<sub>lecture</sub>", "cadence maximale"]],
        reperes: ["Classique : 20 à 40 ms · semi-empilé : ≈ 10 à 15 ms · empilé : 2 à 8 ms · global : 0.", "Le rolling shutter se voit en panoramique rapide, en voiture, sur les hélices et les flashs.", "Le temps de lecture limite la cadence maximale."],
        pieges: ["Le rolling shutter n’est pas du flou de bougé : l’image est nette mais <b>déformée</b>.", "Le temps de lecture n’est pas le temps d’exposition : on peut exposer 1/1 000 s et lire en 30 ms.", "Semi-empilé ne veut pas dire « à moitié rétroéclairé » : seuls les circuits de lecture sont partiellement empilés."]
      },
      evaluation: {
        lire: [
          () => { const tr = C([5, 10, 15, 20, 25]); return { type: "nombre", question: "Ce chronogramme montre l’exposition (barres jaunes) et l’instant de lecture (point rouge) de plusieurs lignes d’un capteur. Quel est le temps de lecture du capteur, en ms ?", figure: figureLecture(tr), reponse: tr, unite: "ms", ecart: 1, explication: "La première ligne est lue à 10 ms, la dernière à " + (10 + tr) + " ms : t<sub>lecture</sub> = " + tr + " ms.", indice: "Faites la différence entre l’instant de lecture de la dernière ligne et celui de la première." }; },
          () => { const t = C([["semi-empilé", "Des circuits de lecture empilés en bandes au-dessus et au-dessous de la zone d’image"], ["empilé", "Une couche de circuits sous toute la surface des photodiodes"]]); return { type: "qcm", contexte: "Fiche technique d’un hybride plein format : « Capteur CMOS " + t[0] + " rétroéclairé, 24 Mpx ».", question: "Que signifie « " + t[0] + " » ?", bonne: t[1], mauvaises: [t[0] === "empilé" ? "Des circuits de lecture empilés en bandes au-dessus et au-dessous de la zone d’image" : "Une couche de circuits sous toute la surface des photodiodes", "Deux capteurs couleur posés l’un sur l’autre", "Un obturateur mécanique placé devant le capteur"], explication: "Capteur " + t[0] + " : " + t[1].toLowerCase() + ".", indice: "Empilé : partout ; semi-empilé : seulement sur une partie." }; },
          () => { const ms = C([[60, 16.7], [100, 10], [250, 4], [30, 33.3]]); return { type: "nombre", contexte: "Fiche technique : « Temps de lecture du capteur : 1/" + ms[0] + " s ».", question: "Quel est le temps de lecture, en millisecondes ?", reponse: ms[1], unite: "ms", explication: "1/" + ms[0] + " s = 1 000 / " + ms[0] + " ≈ " + NB(ms[1], 1) + " ms.", indice: "1 s = 1 000 ms." }; }
        ],
        comprendre: [
          ["Sur un capteur CMOS à rolling shutter, toutes les lignes sont exposées au même instant.", false, "Elles ont la même durée d’exposition, mais chacune commence un peu après la précédente.", "Pensez à une ola dans un stade."],
          ["Un capteur empilé réduit le rolling shutter parce qu’il lit l’image beaucoup plus vite.", true, "Les nombreux convertisseurs de la couche inférieure lisent beaucoup de lignes en parallèle."],
          ["Dans un capteur semi-empilé, les circuits de lecture sont empilés sous toute la surface des photodiodes.", false, "C’est le capteur empilé complet. Le semi-empilé ne les empile qu’en bandes, au-dessus et au-dessous de la zone d’image."],
          ["Un obturateur global ne produit pas d’inclinaison des verticales en panoramique.", true, "Toutes les lignes sont exposées au même moment : l’image est figée d’un bloc."],
          ["Le rolling shutter rend l’image floue.", false, "L’image reste nette, mais déformée : les verticales penchent, les pales se tordent."],
          ["Un temps de lecture plus court permet une cadence d’images plus élevée.", true, "f<sub>max</sub> ≈ 1 / t<sub>lecture</sub>."],
          ["Un flash plus court que le temps de lecture peut n’éclairer qu’une partie de l’image.", true, "Seules les lignes en cours d’exposition au moment du flash le reçoivent : l’image est coupée en bandes."]
        ],
        qcm: [
          ["Quel défaut est typique du rolling shutter lors d’un panoramique rapide ?", "Les verticales penchent", ["L’image devient floue", "Les couleurs bavent", "L’image se fige"], "Le bas de l’image est lu plus tard : les objets ont avancé entre-temps."],
          ["Quel est l’avantage principal d’un capteur semi-empilé par rapport à un capteur classique ?", "Une lecture plus rapide pour un coût modéré", ["Il supprime totalement le rolling shutter", "Il mesure directement les couleurs", "Il double la taille des photosites"], "Les circuits rapides empilés en bordure accélèrent la lecture sans le coût d’un empilé complet."],
          ["Que contient la couche inférieure d’un capteur empilé ?", "Les circuits de lecture (convertisseurs, parfois une mémoire)", ["Les filtres colorés de Bayer", "Le filtre anti-infrarouge", "Une seconde couche de photodiodes"], "Les photodiodes sont en haut ; les circuits, en dessous."],
          ["Pourquoi l’obturateur global coûte-t-il souvent un peu de dynamique ?", "Chaque photosite doit loger une mémoire, ce qui réduit la place de la photodiode", ["Il expose les lignes plus longtemps", "Il oblige à utiliser un prisme", "Il supprime le filtre passe-bas"], "La mémoire de chaque photosite prend de la surface et ajoute du bruit."],
          ["Lecture en 4 ms : quelle cadence maximale ?", "250 images/s", ["25 images/s", "4 images/s", "40 images/s"], "1 / 0,004 = 250 images/s."],
          ["Quel capteur se lit le plus vite ?", "Un capteur empilé", ["Un capteur classique", "Un capteur semi-empilé", "Un capteur CCD"], "Empilé : 2 à 8 ms ; semi-empilé : ≈ 10 à 15 ms ; classique : 20 à 40 ms."]
        ],
        calculer: [
          () => { const n = C([1080, 2160, 3240, 4320]), tl = C([4, 7.5, 10, 12]); return { type: "nombre", question: "Un capteur lit <b>" + NB(n, 0) + " lignes</b>, à raison de <b>" + NB(tl, 1) + " µs</b> par ligne. Quel est son temps de lecture, en ms ?", reponse: n * tl / 1000, unite: "ms", explication: NB(n, 0) + " × " + NB(tl, 1) + " = " + NB(n * tl, 0) + " µs = " + NB(n * tl / 1000, 1) + " ms.", indice: "Calculez en µs, puis divisez par 1 000." }; },
          () => { const v = C([1000, 1920, 3840, 5000]), t = C([4, 14, 20, 30]); return { type: "nombre", question: "Un sujet traverse l’image à <b>" + NB(v, 0) + " px/s</b>. Le temps de lecture est de <b>" + t + " ms</b>. De combien de pixels le bas du sujet est-il décalé par rapport au haut ?", reponse: v * t / 1000, unite: "px", explication: "d = v × t = " + NB(v, 0) + " × " + NB(t / 1000, 3) + " = " + NB(v * t / 1000, 1) + " px.", indice: "Convertissez les ms en secondes." }; },
          () => { const d = C([20, 40, 77, 120]), h = C([1080, 2160]); return { type: "nombre", question: "Le bas d’un poteau est décalé de <b>" + d + " px</b> par rapport à son sommet, sur une image de <b>" + NB(h, 0) + " px</b> de haut. De combien de degrés penche-t-il ?", reponse: Math.atan(d / h) * 180 / Math.PI, unite: "°", ecart: 0.1, explication: "α = arctan(" + d + " / " + NB(h, 0) + ") ≈ " + NB(Math.atan(d / h) * 180 / Math.PI, 2) + "°.", indice: "Calculatrice en degrés : touche tan⁻¹ (ou arctan)." }; },
          () => { const t = C([2, 4, 5, 8, 10, 16, 20, 33]); return { type: "nombre", question: "Le temps de lecture d’un capteur est de <b>" + t + " ms</b>. Quelle est, au plus, sa cadence d’images ?", reponse: 1000 / t, unite: "images/s", explication: "f<sub>max</sub> ≈ 1 / " + NB(t / 1000, 3) + " ≈ " + NB(1000 / t, 0) + " images/s.", indice: "f = 1 / t avec t en secondes." }; },
          () => { const w = C([1920, 3840]), T = C([0.5, 1, 2]), t = C([8, 15, 25, 30]); const v = w / T; return { type: "nombre", question: "Un panoramique fait défiler toute la largeur d’une image de <b>" + NB(w, 0) + " px</b> en <b>" + NB(T, 1) + " s</b>. Temps de lecture : <b>" + t + " ms</b>. Quel est le décalage entre le haut et le bas de l’image, en px ?", reponse: v * t / 1000, unite: "px", explication: "v = " + NB(w, 0) + " / " + NB(T, 1) + " = " + NB(v, 0) + " px/s ; d = " + NB(v, 0) + " × " + NB(t / 1000, 3) + " ≈ " + NB(v * t / 1000, 1) + " px.", indice: "Calculez d’abord la vitesse v en px/s." }; }
        ],
        exercice: [
          () => { const arch = C([["classique", 30], ["semi-empilé", 14], ["empilé", 5]]), v = C([2000, 3840]), h = 2160; const d = v * arch[1] / 1000; return { type: "exercice", question: "Une caméra à capteur <b>" + arch[0] + "</b> (lecture en <b>" + arch[1] + " ms</b>, image de <b>3 840 × " + h + "</b>) filme une voiture qui traverse l’image à <b>" + NB(v, 0) + " px/s</b>.", etapes: [
            { question: "Décalage entre le haut et le bas de la voiture sur toute la hauteur d’image, en px ?", reponse: d, unite: "px" },
            { question: "Inclinaison des verticales, en degrés ?", reponse: Math.atan(d / h) * 180 / Math.PI, unite: "°", ecart: 0.1 },
            { question: "Cadence maximale permise par ce capteur, en images/s ?", reponse: 1000 / arch[1], unite: "images/s" }
          ], solution: "a) " + NB(v, 0) + " × " + NB(arch[1] / 1000, 3) + " = " + NB(d, 1) + " px. b) arctan(" + NB(d, 1) + " / " + h + ") ≈ " + NB(Math.atan(d / h) * 180 / Math.PI, 2) + "°. c) 1 / " + NB(arch[1] / 1000, 3) + " ≈ " + NB(1000 / arch[1], 0) + " images/s.", indice: "a) d = v × t. b) α = arctan(d / H). c) f = 1 / t." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 6 — LA TAILLE DU CAPTEUR ET SES CONSÉQUENCES
       ====================================================================== */
    {
      titre: "La taille du capteur et ses conséquences sur l’image",
      nav: "Taille de capteur",
      resume: "Formats, coefficient, champ, flou",
      intro: "Du 1/3″ d’un caméscope au grand format d’une caméra de cinéma, la surface du capteur varie de 1 à près de 100. Changer de taille de capteur change le <b>champ</b> d’une même focale, la <b>profondeur de champ</b>, le <b>bruit</b>… et même le choix des objectifs.",
      notions: {
        titre: "Petit ou grand capteur",
        intro: "La taille du capteur se compare au <b>plein format</b> (24 × 36 mm), qui sert de référence. Le <b>coefficient de recadrage</b> dit combien de fois un capteur est plus petit que lui, en diagonale.",
        mots: [
          { t: "Format de capteur", ic: "📐", d: "Les dimensions de la zone sensible : largeur × hauteur, en mm. On compare souvent les capteurs par leur <b>diagonale</b>.", r: "1/3″ : 6 mm · 2/3″ : 11 mm · Micro 4/3 : 21,6 mm · Super 35 : ≈ 28,6 mm · plein format : 43,3 mm · grand format 65 mm : ≈ 60 mm (diagonales)." },
          { t: "Les formats en pouces", ic: "📏", q: "Pourquoi un capteur 2/3″ ne mesure-t-il pas 2/3 de pouce ?", d: "L’appellation vient des anciens <b>tubes</b> de caméra : on donnait le diamètre extérieur du tube, et l’image n’en occupait qu’environ les deux tiers. Un capteur 2/3″ (2/3 de pouce = 16,9 mm) a une diagonale de seulement <b>11 mm</b>.", r: "Diagonale ≈ 2/3 de la valeur annoncée en pouces." },
          { t: "Super 35", ic: "🎬", d: "Le format de l’image du cinéma 35 mm (≈ 25 × 14 mm en 16/9). C’est la référence des caméras de cinéma numérique : la plupart des objectifs cinéma sont prévus pour lui." },
          { t: "Plein format", ic: "📷", d: "Le format de la photo argentique, <b>24 × 36 mm</b> (diagonale 43,3 mm). Il sert de <b>référence</b> pour comparer les focales et les champs. On le trouve sur les hybrides et sur certaines caméras de cinéma." },
          { t: "Coefficient de recadrage", s: "k", ic: "✂️", q: "Qu’est-ce que le coefficient de recadrage (crop factor) ?", d: "Le nombre de fois que la diagonale du plein format (43,3 mm) est plus grande que celle du capteur. Il sert à comparer le <b>champ</b> d’une focale d’un format à l’autre.", r: "2/3″ : 3,9 · Micro 4/3 : 2 · Super 35 : ≈ 1,5 · plein format : 1 · grand format 65 mm : ≈ 0,7." },
          { t: "Focale équivalente", u: "mm", ic: "🔭", d: "La focale qui donnerait le <b>même cadre</b> sur un plein format. Un 25 mm sur un capteur Micro 4/3 cadre comme un 50 mm en plein format.", c: "Une même photo recadrée : on a l’impression d’avoir zoomé." },
          { t: "Angle de champ", u: "°", ic: "📐", q: "De quoi dépend l’angle de champ ?", d: "L’angle de la scène que voit la caméra. Il dépend de la focale <b>et</b> de la taille du capteur : à focale égale, un petit capteur ne voit que le centre de l’image formée par l’objectif, donc un angle plus étroit.", c: "Regarder par une fenêtre plus petite, placée à la même distance." },
          { t: "Profondeur de champ et taille du capteur", ic: "🎯", q: "Pourquoi les grands capteurs donnent-ils plus de flou d’arrière-plan ?", d: "Pour garder le <b>même cadre</b>, un grand capteur demande une focale plus <b>longue</b>. À diaphragme égal, la profondeur de champ est alors plus <b>faible</b> et l’arrière-plan plus flou. Un petit capteur donne une grande profondeur de champ : pratique en reportage, moins « cinéma ».", r: "Même cadre et même flou : multiplier le nombre d’ouverture par k (F1,4 en Micro 4/3 ≈ F2,8 en plein format)." },
          { t: "Cercle image", ic: "⭕", d: "Le disque de lumière formé par l’objectif. Il doit couvrir toute la <b>diagonale</b> du capteur, sinon les coins sont noirs (vignetage). Un objectif prévu pour un petit capteur ne couvre pas un grand." },
          { t: "Bruit et taille du capteur", ic: "🌙", d: "À définition égale, un grand capteur a de plus grands photosites : plus de lumière par photosite, donc <b>moins de bruit</b> et <b>plus de dynamique</b> (modules 2 et 3)." },
          { t: "Diffraction", ic: "〰️", q: "Pourquoi ne faut-il pas trop fermer le diaphragme sur un petit capteur ?", d: "En traversant une petite ouverture, la lumière s’étale : chaque point devient une petite tache, la <b>tache d’Airy</b>, de diamètre ≈ 2,44 × λ × N. Quand elle couvre plusieurs photosites, l’image s’adoucit. Les petits photosites des petits capteurs y sont sensibles dès F5,6 ou F8.", r: "λ ≈ 0,55 µm : tache ≈ 1,34 × N µm ; à F8, ≈ 11 µm." },
          { t: "Encombrement des optiques", ic: "🎒", d: "Un grand capteur demande des objectifs plus gros et plus lourds pour la même plage de cadres. Les zooms de reportage 2/3″ couvrent du grand-angle au long téléobjectif (× 20 et plus) : impossible à cet encombrement en plein format." }
        ],
        formules: [
          { q: "Comment calcule-t-on la diagonale d’un capteur ?", f: "d = √(L² + H²)", say: "la diagonale est égale à la racine carrée de la largeur au carré plus la hauteur au carré", rows: [["d", "diagonale", "mm", "théorème de Pythagore"], ["L", "largeur", "mm", ""], ["H", "hauteur", "mm", ""]], ex: "Super 35 en 16/9 : √(24,9² + 14²) = √(620 + 196) ≈ 28,6 mm." },
          { q: "Comment calcule-t-on le coefficient de recadrage ?", f: "k = 43,3 / d", say: "le coefficient de recadrage est égal à quarante-trois virgule trois divisé par la diagonale du capteur", rows: [["k", "coefficient de recadrage", "—", "1 pour le plein format"], ["43,3", "diagonale du plein format", "mm", "√(36² + 24²)"], ["d", "diagonale du capteur", "mm", ""]], ex: "2/3″ (11 mm) : k = 43,3 / 11 ≈ 3,9." },
          { q: "Comment calcule-t-on la focale équivalente ?", f: "f<sub>éq</sub> = f × k", say: "la focale équivalente est égale à la focale réelle multipliée par le coefficient de recadrage", rows: [["f<sub>éq</sub>", "focale équivalente plein format", "mm", "même cadre en 24 × 36"], ["f", "focale réelle", "mm", "gravée sur l’objectif"], ["k", "coefficient de recadrage", "—", ""]], ex: "Objectif 20 mm sur un 2/3″ : 20 × 3,9 = 78 mm équivalent, un léger téléobjectif." },
          { q: "Comment calcule-t-on l’angle de champ horizontal ?", f: "α = 2 × arctan(L / (2 × f))", say: "l’angle de champ est égal à deux fois l’arc tangente de la largeur du capteur divisée par deux fois la focale", rows: [["α", "angle de champ horizontal", "°", ""], ["L", "largeur du capteur", "mm", ""], ["f", "focale", "mm", ""]], ex: "Plein format (L = 36 mm), f = 50 mm : 2 × arctan(36 / 100) ≈ 39,6°." },
          { q: "Quel diaphragme pour la même profondeur de champ sur un autre format ?", f: "N<sub>éq</sub> = N × k", say: "le nombre d’ouverture équivalent est égal au nombre d’ouverture multiplié par le coefficient de recadrage", rows: [["N<sub>éq</sub>", "ouverture équivalente plein format", "—", "pour la profondeur de champ, à cadre égal"], ["N", "nombre d’ouverture réel", "—", "F2, F2,8…"], ["k", "coefficient de recadrage", "—", ""]], ex: "F2 sur Micro 4/3 (k = 2) donne la profondeur de champ d’un F4 en plein format, à cadre égal. L’exposition, elle, reste celle de F2." }
        ]
      },
      manipuler: {
        titre: "Changer de capteur, à focale égale ou à cadre égal",
        intro: "Une personne à <b>3 m</b>, des lumières de ville à <b>30 m</b> derrière elle. Choisissez un format, une focale et un diaphragme. En mode « <b>même focale</b> », un petit capteur recadre l’image. En mode « <b>même cadre</b> », la focale s’adapte au format : comparez alors le <b>flou</b> de l’arrière-plan (chaque lumière devient un disque)."
      },
      essentiel: {
        definitions: [
          "<b>Coefficient de recadrage</b> k : diagonale du plein format (43,3 mm) / diagonale du capteur.",
          "<b>Focale équivalente</b> : focale qui donnerait le même cadre en plein format.",
          "<b>Angle de champ</b> : dépend de la focale ET de la largeur du capteur.",
          "<b>Grand capteur</b> : à cadre égal, focale plus longue, moins de profondeur de champ, moins de bruit.",
          "<b>Cercle image</b> : doit couvrir la diagonale du capteur."
        ],
        formules: [["d = √(L² + H²)", "diagonale"], ["k = 43,3 / d", "coefficient de recadrage"], ["f<sub>éq</sub> = f × k", "focale équivalente"], ["α = 2 × arctan(L / (2 × f))", "angle de champ horizontal"], ["N<sub>éq</sub> = N × k", "même profondeur de champ, à cadre égal"]],
        reperes: ["k : 2/3″ ≈ 3,9 · Micro 4/3 = 2 · Super 35 ≈ 1,5 · plein format = 1.", "Plein format 50 mm : ≈ 40° de champ horizontal.", "Diagonales : 2/3″ = 11 mm, Super 35 ≈ 28,6 mm, plein format = 43,3 mm."],
        pieges: ["Un 2/3″ ne mesure pas 2/3 de pouce : sa diagonale fait 11 mm.", "La focale gravée sur l’objectif ne change jamais : c’est le <b>champ</b> qui change avec le capteur.", "N<sub>éq</sub> = N × k concerne la profondeur de champ, pas l’exposition : F2 reste F2 pour la lumière."]
      },
      evaluation: {
        lire: [
          () => { const liste = Application.melanger(FORMATS_CAPTEUR).slice(0, 4), f = C(liste); return { type: "nombre", question: "D’après ce tableau, quelle est la diagonale d’un capteur <b>" + f.nom + "</b>, en mm ?", figure: tableauFormats(liste), reponse: f.d, unite: "mm", ecart: 0.05, explication: "On lit la diagonale du " + f.nom + " : " + NB(f.d, 1) + " mm.", indice: "Ligne « " + f.nom + " », colonne « Diagonale »." }; },
          () => { const f = C([12, 16, 25, 35]), k = C([[2, "Micro 4/3"], [1.5, "Super 35"], [3.9, "2/3″"]]); return { type: "nombre", contexte: "Notice d’un objectif : « " + f + " mm · pour capteur " + k[1] + " · focale équivalente plein format : " + NB(f * k[0], 0) + " mm ».", question: "Quelle est la focale <b>réelle</b> de cet objectif, en mm ?", reponse: f, unite: "mm", ecart: 0, explication: "La focale réelle est gravée sur l’objectif : " + f + " mm. " + NB(f * k[0], 0) + " mm est la focale équivalente (" + f + " × " + NB(k[0], 1) + ").", indice: "La focale équivalente n’est qu’une comparaison." }; },
          () => { const f = C(FORMATS_CAPTEUR.filter(x => x.nom !== "Plein format")); const k = DIAG_PF / f.d; return { type: "nombre", contexte: "Tableau du constructeur : « Capteur " + f.nom + " · diagonale " + NB(f.d, 1) + " mm · coefficient de recadrage " + NB(k, 2) + " ».", question: "Quel est le coefficient de recadrage du capteur ?", reponse: k, unite: "", ecart: 0.01, explication: "On lit k = " + NB(k, 2) + " (43,3 / " + NB(f.d, 1) + ").", indice: "Le coefficient n’a pas d’unité." }; }
        ],
        comprendre: [
          ["À focale égale, un capteur plus petit donne un cadre plus serré.", true, "Il ne voit que le centre de l’image formée par l’objectif : l’angle de champ est plus étroit."],
          ["Un capteur 2/3″ a une diagonale de 2/3 de pouce, soit 16,9 mm.", false, "Le nom vient des tubes : la diagonale réelle est d’environ 11 mm.", "D’où vient l’appellation en pouces ?"],
          ["À cadre égal et à diaphragme égal, un grand capteur donne moins de profondeur de champ.", true, "Il faut une focale plus longue pour le même cadre : la profondeur de champ diminue."],
          ["Changer de capteur modifie la focale de l’objectif.", false, "La focale est une propriété de l’objectif ; c’est l’angle de champ qui change avec le capteur."],
          ["À définition égale, un grand capteur a en général moins de bruit.", true, "Ses photosites sont plus grands : ils recueillent plus de lumière."],
          ["Un objectif prévu pour un capteur Micro 4/3 couvre sans problème un capteur plein format.", false, "Son cercle image est trop petit : les coins seraient noirs (vignetage)."],
          ["La diffraction gêne davantage les petits capteurs, car leurs photosites sont plus petits.", true, "La tache d’Airy a la même taille pour un diaphragme donné ; elle couvre plus de petits photosites."]
        ],
        qcm: [
          ["Quel est le coefficient de recadrage d’un capteur Super 35 ?", "Environ 1,5", ["Environ 3,9", "Exactement 1", "Environ 2"], "43,3 / 28,6 ≈ 1,5."],
          ["Un objectif de 25 mm sur un capteur Micro 4/3 cadre comme quelle focale en plein format ?", "50 mm", ["25 mm", "12,5 mm", "100 mm"], "k = 2 : 25 × 2 = 50 mm."],
          ["Pourquoi les caméras de reportage broadcast utilisent-elles encore des capteurs 2/3″ ?", "Grande profondeur de champ et zooms compacts à très grande plage", ["Pour avoir moins de profondeur de champ", "Parce que leurs photosites sont les plus grands", "Parce qu’ils n’ont pas de rolling shutter"], "Petit capteur : mise au point facile et zooms × 20 compacts, idéal en direct et en reportage."],
          ["Que faut-il vérifier pour monter un objectif sur un capteur plus grand ?", "Que son cercle image couvre la diagonale du capteur", ["Que sa focale soit plus courte", "Qu’il ait un filtre passe-bas", "Qu’il soit stabilisé"], "Sinon, les coins de l’image sont noirs."],
          ["Même cadre, même flou d’arrière-plan : F2,8 en plein format correspond à quel diaphragme sur Micro 4/3 ?", "F1,4", ["F5,6", "F2,8", "F4"], "N = N<sub>éq</sub> / k = 2,8 / 2 = 1,4."],
          ["Que vaut la diagonale d’un capteur plein format 24 × 36 ?", "Environ 43,3 mm", ["60 mm", "36 mm", "28,6 mm"], "√(36² + 24²) = √1 872 ≈ 43,3 mm."]
        ],
        calculer: [
          () => { const f = C(FORMATS_CAPTEUR); return { type: "nombre", question: "Un capteur mesure <b>" + NB(f.l, 1) + " × " + NB(f.h, 1) + " mm</b>. Quelle est sa diagonale, en mm ?", reponse: Math.hypot(f.l, f.h), unite: "mm", explication: "d = √(" + NB(f.l, 1) + "² + " + NB(f.h, 1) + "²) ≈ " + NB(Math.hypot(f.l, f.h), 1) + " mm.", indice: "Pythagore : d = √(L² + H²)." }; },
          () => { const f = C(FORMATS_CAPTEUR.filter(x => x.nom !== "Plein format")); return { type: "nombre", question: "Un capteur <b>" + f.nom + "</b> a une diagonale de <b>" + NB(f.d, 1) + " mm</b>. Quel est son coefficient de recadrage ?", reponse: DIAG_PF / f.d, unite: "", explication: "k = 43,3 / " + NB(f.d, 1) + " ≈ " + NB(DIAG_PF / f.d, 2) + ".", indice: "k = 43,3 / d." }; },
          () => { const f = C([8, 12, 14, 18, 25, 35, 50]), k = C([[3.9, "2/3″"], [2, "Micro 4/3"], [1.5, "Super 35"], [7.2, "1/3″"]]); return { type: "nombre", question: "Un objectif de <b>" + f + " mm</b> est monté sur un capteur <b>" + k[1] + "</b> (k = " + NB(k[0], 1) + "). Quelle est sa focale équivalente en plein format ?", reponse: f * k[0], unite: "mm", explication: "f<sub>éq</sub> = " + f + " × " + NB(k[0], 1) + " = " + NB(f * k[0], 1) + " mm.", indice: "f<sub>éq</sub> = f × k." }; },
          () => { const s = C([[36, "plein format"], [24.9, "Super 35"], [9.6, "2/3″"], [17.3, "Micro 4/3"]]), f = C([12, 18, 25, 35, 50, 85]); const a = 2 * Math.atan(s[0] / (2 * f)) * 180 / Math.PI; return { type: "nombre", question: "Capteur <b>" + s[1] + "</b> de <b>" + NB(s[0], 1) + " mm</b> de large, objectif de <b>" + f + " mm</b>. Quel est l’angle de champ horizontal, en degrés ?", reponse: a, unite: "°", ecart: 0.5, explication: "α = 2 × arctan(" + NB(s[0], 1) + " / " + 2 * f + ") ≈ " + NB(a, 1) + "°.", indice: "Calculatrice en degrés : α = 2 × tan⁻¹(L / (2f))." }; },
          () => { const feq = C([24, 35, 50, 85, 135]), k = C([[2, "Micro 4/3"], [1.5, "Super 35"], [3.9, "2/3″"]]); return { type: "nombre", question: "On veut le cadre d’un <b>" + feq + " mm</b> en plein format, avec une caméra <b>" + k[1] + "</b> (k = " + NB(k[0], 1) + "). Quelle focale réelle faut-il ?", reponse: feq / k[0], unite: "mm", explication: "f = f<sub>éq</sub> / k = " + feq + " / " + NB(k[0], 1) + " ≈ " + NB(feq / k[0], 1) + " mm.", indice: "Retournez la formule : f = f<sub>éq</sub> / k." }; },
          () => { const n = C([1.4, 2, 2.8, 4]), k = C([[2, "Micro 4/3"], [1.5, "Super 35"], [3.9, "2/3″"]]); return { type: "nombre", question: "Sur un capteur <b>" + k[1] + "</b> (k = " + NB(k[0], 1) + "), on filme à <b>F" + NB(n, 1) + "</b>. À cadre égal, quel diaphragme donnerait la même profondeur de champ en plein format ?", reponse: n * k[0], unite: "", explication: "N<sub>éq</sub> = " + NB(n, 1) + " × " + NB(k[0], 1) + " = " + NB(n * k[0], 2) + ".", indice: "N<sub>éq</sub> = N × k." }; },
          () => { const n = C([4, 5.6, 8, 11, 16]); return { type: "nombre", question: "Quel est le diamètre de la tache de diffraction à <b>F" + NB(n, 1) + "</b>, pour une lumière verte (λ = 0,55 µm), en µm ?", reponse: 2.44 * 0.55 * n, unite: "µm", explication: "2,44 × 0,55 × " + NB(n, 1) + " ≈ " + NB(2.44 * 0.55 * n, 1) + " µm.", indice: "Diamètre ≈ 2,44 × λ × N." }; }
        ],
        exercice: [
          () => { const f = C([{ nom: "2/3″", l: 9.6, d: 11 }, { nom: "Super 35", l: 24.9, d: 28.6 }, { nom: "Micro 4/3", l: 17.3, d: 21.6 }]), fo = C([16, 20, 25, 35]), n = C([2, 2.8, 4]); const k = DIAG_PF / f.d, a = 2 * Math.atan(f.l / (2 * fo)) * 180 / Math.PI; return { type: "exercice", question: "Un opérateur filme avec une caméra <b>" + f.nom + "</b> (largeur <b>" + NB(f.l, 1) + " mm</b>, diagonale <b>" + NB(f.d, 1) + " mm</b>), un objectif de <b>" + fo + " mm</b> à <b>F" + NB(n, 1) + "</b>.", etapes: [
            { question: "Coefficient de recadrage k ?", reponse: k, unite: "" },
            { question: "Focale équivalente en plein format, en mm ?", reponse: fo * k, unite: "mm" },
            { question: "Angle de champ horizontal, en degrés ?", reponse: a, unite: "°", ecart: 0.5 },
            { question: "Diaphragme équivalent pour la profondeur de champ en plein format ?", reponse: n * k, unite: "" }
          ], solution: "a) 43,3 / " + NB(f.d, 1) + " ≈ " + NB(k, 2) + ". b) " + fo + " × " + NB(k, 2) + " ≈ " + NB(fo * k, 1) + " mm. c) 2 × arctan(" + NB(f.l, 1) + " / " + 2 * fo + ") ≈ " + NB(a, 1) + "°. d) " + NB(n, 1) + " × " + NB(k, 2) + " ≈ F" + NB(n * k, 1) + ".", indice: "k = 43,3 / d ; f<sub>éq</sub> = f × k ; α = 2 × arctan(L / 2f) ; N<sub>éq</sub> = N × k." }; }
        ]
      }
    }
  ]
};
