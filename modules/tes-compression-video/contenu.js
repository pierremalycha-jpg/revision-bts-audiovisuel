/* ==========================================================================
   contenu.js — le contenu de l'application « Compression vidéo »
   --------------------------------------------------------------------------
   Six modules :
     1. Pourquoi compresser : débit et taux de compression, redondances
     2. La compression JPEG : blocs 8 × 8, DCT, quantification, zigzag
     3. La compression MPEG : images I, P, B, GOP, vecteurs de mouvement
     4. Le codage entropique : Huffman, codage arithmétique, CABAC
     5. Régler le débit : CBR, VBR, profils (Baseline, Main, High…) et niveaux
     6. Codecs et conteneurs : MOV, MP4, MXF, ProRes, DNxHR, H.264, HEVC
   Ce fichier ne contient que du texte et des schémas (SVG) ; la mise en page,
   l'évaluation et l'enregistrement sont faits par js/application.js.

   Valeurs de référence :
   - débits ProRes et DNxHD : livres blancs Apple et Avid, HD 1080 à 25 i/s ;
   - tables de niveaux : normes H.264 (annexe A, tableau A-1) et HEVC
     (annexe A, tableaux A.8 et A.9) ;
   - table de quantification : table de luminance de la norme JPEG (annexe K).
   Les débits « typiques » de diffusion (Blu-ray, streaming, TNT) sont des
   ordres de grandeur : ils varient d'un diffuseur à l'autre.

   CONTENU À VALIDER : relis et adapte au référentiel du BTS avant de le
   proposer aux étudiants.
   ========================================================================== */

const H = Application.hasard;     // H(1, 6) : un entier entre 1 et 6
const C = Application.choisir;    // C([a, b, c]) : un élément au hasard
const NB = Application.nombre;    // NB(1036.8, 1) : « 1 036,8 »

// Formats d'image et structures d'échantillonnage (e = échantillons par pixel)
const FORMATS = [
  { nom: "SD 576", l: 720, h: 576 },
  { nom: "HD 720", l: 1280, h: 720 },
  { nom: "HD 1080", l: 1920, h: 1080 },
  { nom: "UHD", l: 3840, h: 2160 },
  { nom: "4K DCI", l: 4096, h: 2160 }
];
const ECH = { "4:4:4": 3, "4:2:2": 2, "4:2:0": 1.5 };
// Débit non compressé de l'image active, en Mbit/s
const BRUT = (l, h, e, q, f) => l * h * e * q * f / 1e6;
// Table de quantification de luminance de la norme JPEG (annexe K)
const TQ = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
// Mise à l'échelle de la table selon le facteur de qualité (formule de l'IJG, reprise par la plupart des logiciels)
const ECHELLE = q => q < 50 ? 5000 / q : 200 - 2 * q;
const PAS = (T, q) => Math.max(1, Math.floor((T * ECHELLE(q) + 50) / 100));

/* ==========================================================================
   SCHÉMAS (SVG) utilisés dans les notions et les questions
   Fond sombre, comme toutes les scènes de la plateforme.
   ========================================================================== */
const SVG = (l, h, contenu, label) => '<svg class="qa-fig" viewBox="0 0 ' + l + " " + h + '" role="img" aria-label="' + (label || "Schéma") + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, Segoe UI, Inter, Roboto, sans-serif">' + contenu + "</svg>";
const TXT = (x, y, t, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" fill="' + (o.c || "#e5e5ea") + '" font-size="' + (o.s || 13) + '" font-weight="' + (o.w || 600) + '" text-anchor="' + (o.a || "middle") + '"' + (o.m ? ' font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"' : "") + ">" + t + "</text>"; };
const RECT = (x, y, w, h, o) => { o = o || {}; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.r === undefined ? 8 : o.r) + '" fill="' + (o.f || "none") + '"' + (o.s ? ' stroke="' + o.s + '" stroke-width="' + (o.e || 1.5) + '"' : "") + (o.d ? ' stroke-dasharray="' + o.d + '"' : "") + (o.o !== undefined ? ' opacity="' + o.o + '"' : "") + "/>"; };
function FL(x1, y1, x2, y2, c, e) {
  c = c || "#8e8e93"; e = e || 1.8;
  const a = Math.atan2(y2 - y1, x2 - x1), t = 8;
  const pt = d => (x2 - t * Math.cos(a + d)).toFixed(1) + "," + (y2 - t * Math.sin(a + d)).toFixed(1);
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + (x2 - Math.cos(a) * t * 0.7).toFixed(1) + '" y2="' + (y2 - Math.sin(a) * t * 0.7).toFixed(1) + '" stroke="' + c + '" stroke-width="' + e + '" stroke-linecap="round"/><polygon points="' + x2 + "," + y2 + " " + pt(-0.45) + " " + pt(0.45) + '" fill="' + c + '"/>';
}
// Couleurs communes aux schémas et aux labos (images I, P, B…)
const COUL = { I: "#ff453a", P: "#0a84ff", B: "#30d158", bleu: "#64d2ff", ora: "#ff9f0a", vio: "#bf5af2", rose: "#ff375f", jaune: "#ffd60a", txt: "#e5e5ea", mut: "#8e8e93", ligne: "rgba(255,255,255,.18)", fond: "rgba(255,255,255,.06)" };

// 1 octet = 8 bits
function figOctet() {
  const bits = [1, 0, 1, 1, 0, 0, 1, 0];
  let s = RECT(24, 22, 290, 52, { s: COUL.bleu, f: "rgba(100,210,255,.08)", r: 12 });
  bits.forEach((b, i) => { s += RECT(36 + i * 34, 32, 28, 32, { f: b ? COUL.bleu : "rgba(100,210,255,.22)", r: 5 }) + TXT(50 + i * 34, 53, b, { c: b ? "#0b0c0e" : COUL.txt, m: 1, s: 14 }); });
  s += TXT(169, 96, "1 octet (o, byte, B) = 8 bits (b)", { c: COUL.bleu });
  s += TXT(440, 38, "Débit : 100 Mbit/s", { s: 14 }) + FL(440, 46, 440, 70, COUL.ora) + TXT(470, 62, "÷ 8", { c: COUL.ora, a: "start" }) + TXT(440, 92, "= 12,5 Mo/s", { s: 14, c: COUL.ora });
  return SVG(560, 110, s, "Un octet est formé de huit bits ; cent mégabits par seconde font douze mégaoctets et demi par seconde");
}

// Avant / après : la part des données qui reste
function figTaux(t) {
  const L = 420, l2 = Math.max(4, L / t);
  let s = TXT(20, 26, "Avant compression", { a: "start", c: COUL.mut, s: 12 }) + RECT(20, 33, L, 22, { f: COUL.bleu, r: 6 }) + TXT(20 + L + 10, 49, "100 %", { a: "start" });
  s += TXT(20, 84, "Après compression (" + t + ":1)", { a: "start", c: COUL.mut, s: 12 }) + RECT(20, 91, L, 22, { s: COUL.ligne, d: "4 4", r: 6 }) + RECT(20, 91, l2, 22, { f: COUL.ora, r: 6 }) + TXT(20 + L + 10, 107, NB(100 / t, 1) + " %", { a: "start", c: COUL.ora });
  s += TXT(20 + l2 + 12, 106, "il reste 1/" + t + " des données : " + NB(100 - 100 / t, 1) + " % ont été supprimées", { a: "start", c: COUL.mut, s: 12, w: 500 });
  return SVG(560, 126, s, "Barre avant compression à cent pour cent, barre après compression réduite à un " + t + "e");
}

// Les quatre redondances
function figRedondances() {
  let s = "";
  const x = [10, 150, 290, 430], titres = ["Spatiale", "Temporelle", "Statistique", "Psychovisuelle"], sous = ["pixels voisins", "images voisines", "valeurs fréquentes", "ce que l’œil voit mal"];
  x.forEach((x0, k) => { s += RECT(x0, 10, 120, 132, { f: COUL.fond, s: COUL.ligne, r: 12 }) + TXT(x0 + 60, 112, titres[k], { s: 13 }) + TXT(x0 + 60, 129, sous[k], { s: 11, c: COUL.mut, w: 500 }); });
  // spatiale : des carrés presque identiques
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) s += RECT(30 + i * 20, 22 + j * 18, 19, 17, { f: "hsl(205," + (62 + ((i + j) % 2) * 3) + "%," + (55 + i * 1.5 + j) + "%)", r: 2 });
  // temporelle : deux images, la balle seule a bougé
  s += RECT(166, 26, 70, 50, { f: "#1d3b5c", s: COUL.ligne, r: 4 }) + RECT(184, 40, 70, 50, { f: "#1d3b5c", s: COUL.bleu, r: 4 }) + '<circle cx="200" cy="64" r="8" fill="' + COUL.ora + '" opacity=".45"/><circle cx="228" cy="64" r="8" fill="' + COUL.ora + '"/>' + FL(203, 52, 224, 52, COUL.txt, 1.4);
  // statistique : histogramme, énorme barre à 0
  [[0.12, -3], [0.2, -2], [0.38, -1], [1, 0], [0.4, 1], [0.18, 2], [0.1, 3]].forEach((b, i) => { s += RECT(306 + i * 13, 92 - b[0] * 66, 10, b[0] * 66, { f: b[1] === 0 ? COUL.ora : COUL.bleu, r: 2 }); });
  s += TXT(345, 102, "0", { s: 10, c: COUL.ora });
  // psychovisuelle : un œil
  s += '<path d="M450 60 Q490 26 530 60 Q490 94 450 60 Z" fill="none" stroke="' + COUL.txt + '" stroke-width="2"/><circle cx="490" cy="60" r="12" fill="' + COUL.bleu + '"/><circle cx="490" cy="60" r="5" fill="#0b0c0e"/>';
  return SVG(560, 152, s, "Les quatre redondances : spatiale, temporelle, statistique et psychovisuelle");
}

// La chaîne du JPEG
function figChaineJPEG() {
  const E = [["Image RVB", "à compresser"], ["Y′CbCr", "+ 4:2:0"], ["Blocs", "8 × 8"], ["DCT", "→ fréquences"], ["Quantification", "PERTE"], ["Zigzag", "+ RLE"], ["Huffman", "sans perte"], ["Fichier", ".jpg"]];
  let s = "";
  E.forEach((e, i) => {
    const r = i < 4 ? 0 : 1, c = i % 4, x = 12 + c * 138, y = 16 + r * 82, perte = i === 4 || i === 1;
    s += RECT(x, y, 116, 50, { f: perte ? "rgba(255,69,58,.14)" : COUL.fond, s: perte ? COUL.I : COUL.ligne, r: 10 }) + TXT(x + 58, y + 22, e[0], { s: 13 }) + TXT(x + 58, y + 40, e[1], { s: 11, c: i === 4 ? COUL.I : COUL.mut, w: i === 4 ? 700 : 500 });
    if (c < 3) s += FL(x + 118, y + 25, x + 136, y + 25);
  });
  s += '<path d="M484 68 V82 H70 V92" fill="none" stroke="#8e8e93" stroke-width="1.8"/>' + FL(70, 88, 70, 97);
  s += TXT(280, 168, "Pertes : le sous-échantillonnage de la couleur et la quantification. Tout le reste est réversible.", { s: 11, c: COUL.mut, w: 500 });
  return SVG(560, 178, s, "La chaîne du JPEG : conversion en Y′CbCr, blocs de 8 par 8, DCT, quantification, zigzag et RLE, Huffman");
}

// Un bloc de pixels et ses coefficients DCT
function figBlocDCT() {
  let s = TXT(92, 18, "64 pixels", { c: COUL.mut, s: 12 }) + TXT(452, 18, "64 coefficients", { c: COUL.mut, s: 12 });
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = 70 + x * 14 + y * 6 + (x > 5 ? 40 : 0);
    s += RECT(12 + x * 20, 26 + y * 20, 19, 19, { f: "rgb(" + v + "," + v + "," + v + ")", r: 2 });
    const m = x === 0 && y === 0 ? 1 : Math.exp(-(x * 0.9 + y * 0.9)) * (x === 1 || y === 0 ? 1.4 : 1);
    s += RECT(372 + x * 20, 26 + y * 20, 19, 19, { f: "rgba(255,159,10," + Math.min(1, 0.06 + m).toFixed(2) + ")", r: 2 });
  }
  s += FL(190, 106, 360, 106, COUL.bleu, 2.2) + TXT(275, 96, "DCT", { s: 16, c: COUL.bleu }) + TXT(275, 128, "même information,", { s: 11, c: COUL.mut, w: 500 }) + TXT(275, 143, "rangée autrement", { s: 11, c: COUL.mut, w: 500 });
  s += TXT(381, 40, "DC", { s: 9, c: "#0b0c0e", w: 700 });
  s += TXT(372, 204, "↖ basses fréquences", { s: 11, a: "start", c: COUL.ora }) + TXT(532, 204, "hautes ↘", { s: 11, a: "end", c: COUL.mut });
  return SVG(560, 212, s, "Un bloc de huit par huit pixels transformé par la DCT en huit par huit coefficients ; l’énergie se concentre en haut à gauche");
}

// Table de quantification (luminance), éventuellement avec une case entourée
function figTableQ(u, v) {
  let s = TXT(250, 16, "u → fréquences horizontales", { s: 11, c: COUL.mut, w: 500 }) + '<text x="12" y="150" fill="#8e8e93" font-size="11" text-anchor="middle" transform="rotate(-90 12 150)">v → fréquences verticales</text>';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const q = TQ[y * 8 + x];
    s += RECT(30 + x * 55, 24 + y * 30, 52, 27, { f: "rgba(255,69,58," + (0.08 + q / 140).toFixed(2) + ")", r: 4, s: x === u && y === v ? COUL.jaune : null, e: 2.5 }) + TXT(56 + x * 55, 43 + y * 30, q, { s: 13, m: 1 });
  }
  return SVG(480, 270, s, "Table de quantification de luminance de la norme JPEG : petits pas en haut à gauche, grands pas en bas à droite");
}

// Le parcours en zigzag
const ZZ = (function () { const o = []; for (let s = 0; s < 15; s++) { const l = []; for (let y = 0; y < 8; y++) { const x = s - y; if (x >= 0 && x < 8) l.push(y * 8 + x); } o.push.apply(o, s % 2 ? l : l.reverse()); } return o; })();
function figZigzag() {
  let s = "", pts = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += RECT(14 + x * 30, 14 + y * 30, 28, 28, { f: "rgba(100,210,255," + (0.05 + Math.max(0, 0.5 - (x + y) * 0.05)).toFixed(2) + ")", r: 3 });
  ZZ.forEach(i => pts.push((28 + (i % 8) * 30) + "," + (28 + Math.floor(i / 8) * 30)));
  s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + COUL.ora + '" stroke-width="2" stroke-linejoin="round"/>';
  s += '<circle cx="28" cy="28" r="6" fill="' + COUL.ora + '"/>' + FL(244, 236, 250, 250, COUL.ora);
  s += TXT(280, 40, "1. Le DC (la moyenne)", { a: "start" }) + TXT(280, 64, "2. Les basses fréquences :", { a: "start" }) + TXT(296, 82, "valeurs utiles, non nulles", { a: "start", c: COUL.mut, w: 500 });
  s += TXT(280, 112, "3. Les hautes fréquences :", { a: "start" }) + TXT(296, 130, "presque toutes nulles après", { a: "start", c: COUL.mut, w: 500 }) + TXT(296, 146, "la quantification", { a: "start", c: COUL.mut, w: 500 });
  s += TXT(280, 182, "Exemple : 26, −3, 0, −2, 0, 0, 1, 0 … 0", { a: "start", m: 1, s: 12, c: COUL.bleu });
  s += TXT(280, 204, "→ (0 ; −3) (1 ; −2) (2 ; 1) EOB", { a: "start", m: 1, s: 12, c: COUL.ora });
  s += TXT(280, 228, "(nombre de zéros ; valeur) puis « fin de bloc »", { a: "start", s: 11, c: COUL.mut, w: 500 });
  return SVG(560, 262, s, "Le parcours en zigzag d’un bloc de huit par huit, des basses vers les hautes fréquences, et le codage des zéros");
}

// Deux artefacts : effet de bloc et ringing
function figArtefacts() {
  let s = TXT(130, 18, "Effet de bloc", { s: 12 }) + TXT(420, 18, "Ringing (halo)", { s: 12 });
  for (let i = 0; i < 15; i++) for (let j = 0; j < 5; j++) { const v = Math.round(40 + Math.floor(i / 1) * 12 + j * 3); s += RECT(14 + i * 16, 28 + j * 16, 16, 16, { f: "rgb(" + Math.round(v * 0.55) + "," + Math.round(v * 0.75) + "," + v + ")", r: 0 }); }
  s += TXT(130, 130, "dégradé découpé en carrés 8 × 8", { s: 11, c: COUL.mut, w: 500 });
  let p = "M300 98 L380 98 ";
  for (let x = 380; x <= 540; x += 2) { const d = x - 400; const y = d < 0 ? 98 + 9 * Math.sin(d / 5) * Math.exp(d / 14) : 44 + 10 * Math.sin(d / 5) * Math.exp(-d / 14); p += "L" + x + " " + y.toFixed(1) + " "; }
  s += '<path d="M300 98 H400 V44 H540" fill="none" stroke="#8e8e93" stroke-width="1.5" stroke-dasharray="4 4"/><path d="' + p + '" fill="none" stroke="' + COUL.ora + '" stroke-width="2.2"/>';
  s += TXT(420, 130, "oscillations autour d’un bord net", { s: 11, c: COUL.mut, w: 500 });
  return SVG(560, 140, s, "Deux artefacts de compression : l’effet de bloc dans un dégradé et les oscillations autour d’un bord net");
}

// Types d'image d'un GOP en ordre d'affichage
function typesGOP(N, M, n) { const t = []; for (let i = 0; i < n; i++) { const k = i % N; t.push(k === 0 ? "I" : (k % M === 0 ? "P" : "B")); } return t; }
function figGOP(N, M, o) {
  o = o || {};
  const n = N + 1, w = Math.min(40, Math.floor(520 / n)) - 4, t = typesGOP(N, M, n), y0 = o.fleches ? 70 : 24;
  let s = "";
  t.forEach((k, i) => {
    const x = 20 + i * (w + 4);
    s += RECT(x, y0, w, 38, { f: COUL[k], r: 6, o: i === N ? 0.4 : 1 }) + TXT(x + w / 2, y0 + 25, k, { s: w > 26 ? 16 : 12, c: "#0b0c0e", w: 700 });
    if (o.num) s += TXT(x + w / 2, y0 + 54, i + 1, { s: 10, c: COUL.mut, w: 500 });
  });
  if (o.fleches) {
    const cx = i => 20 + i * (w + 4) + w / 2;
    const arc = (a, b, c, h) => '<path d="M' + cx(a) + " " + (y0 - 2) + " Q" + ((cx(a) + cx(b)) / 2) + " " + (y0 - h) + " " + cx(b) + " " + (y0 - 4) + '" fill="none" stroke="' + c + '" stroke-width="1.5" opacity=".9"/><circle cx="' + cx(b) + '" cy="' + (y0 - 4) + '" r="2.5" fill="' + c + '"/>';
    for (let i = 1; i < n; i++) {
      if (t[i] === "P") s += arc(i - M, i, COUL.P, 46);
      if (t[i] === "B") { const a = i - (i % N) % M; s += arc(a, i, COUL.B, 26); if (a + M < n) s += arc(a + M, i, COUL.B, 26); }
    }
  }
  if (o.legende) s += '<path d="M20 ' + (y0 + 64) + " v6 h" + (N * (w + 4) - 4) + ' v-6" fill="none" stroke="' + COUL.mut + '" stroke-width="1.4"/>' + TXT(20 + (N * (w + 4)) / 2, y0 + 88, "GOP : N = " + N + " images" + (M > 1 ? " · M = " + M + " (distance entre I et P)" : ""), { s: 12, c: COUL.mut });
  return SVG(560, y0 + (o.legende ? 96 : 62), s, "Un groupe d’images : suite d’images I, P et B" + (o.legende ? ", N égal " + N + ", M égal " + M : ""));
}

// Ordre d'affichage et ordre de transmission
function figOrdre() {
  const aff = ["I1", "B2", "B3", "P4", "B5", "B6", "P7"], cod = ["I1", "P4", "B2", "B3", "P7", "B5", "B6"];
  let s = TXT(20, 22, "Ordre d’affichage (à l’écran)", { a: "start", s: 12, c: COUL.mut }) + TXT(20, 158, "Ordre de codage et de transmission (dans le fichier)", { a: "start", s: 12, c: COUL.mut });
  const x = i => 40 + i * 72;
  cod.forEach((k, j) => { const i = aff.indexOf(k); s += '<line x1="' + (x(i) + 26) + '" y1="70" x2="' + (x(j) + 26) + '" y2="106" stroke="' + COUL[k[0]] + '" stroke-width="1.6" opacity=".8"/>'; });
  aff.forEach((k, i) => { s += RECT(x(i), 32, 52, 38, { f: COUL[k[0]], r: 7 }) + TXT(x(i) + 26, 57, k, { c: "#0b0c0e", w: 700, s: 15 }); });
  cod.forEach((k, j) => { s += RECT(x(j), 106, 52, 38, { f: COUL[k[0]], r: 7 }) + TXT(x(j) + 26, 131, k, { c: "#0b0c0e", w: 700, s: 15 }); });
  return SVG(560, 168, s, "Ordre d’affichage I1 B2 B3 P4 B5 B6 P7 ; ordre de transmission I1 P4 B2 B3 P7 B5 B6");
}

// Vecteur de mouvement
function figVecteur() {
  let s = "";
  for (let i = 0; i <= 12; i++) s += '<line x1="' + (20 + i * 20) + '" y1="20" x2="' + (20 + i * 20) + '" y2="180" stroke="rgba(255,255,255,.08)"/>';
  for (let j = 0; j <= 8; j++) s += '<line x1="20" y1="' + (20 + j * 20) + '" x2="260" y2="' + (20 + j * 20) + '" stroke="rgba(255,255,255,.08)"/>';
  s += RECT(60, 100, 40, 40, { s: COUL.mut, d: "5 4", r: 3 }) + '<circle cx="80" cy="120" r="14" fill="' + COUL.ora + '" opacity=".35"/>';
  s += RECT(160, 60, 40, 40, { s: COUL.bleu, e: 2.2, r: 3 }) + '<circle cx="180" cy="80" r="14" fill="' + COUL.ora + '"/>';
  s += FL(176, 98, 88, 118, COUL.jaune, 2.4);
  s += TXT(286, 50, "Macrobloc à coder (image n)", { a: "start", c: COUL.bleu, s: 12 }) + TXT(286, 76, "Bloc le plus ressemblant", { a: "start", c: COUL.mut, s: 12 }) + TXT(286, 92, "dans l’image de référence (n − 1)", { a: "start", c: COUL.mut, s: 12, w: 500 });
  s += TXT(286, 124, "Vecteur de mouvement : (−80 ; +40)", { a: "start", c: COUL.jaune, s: 12 }) + TXT(286, 142, "où aller chercher le bloc", { a: "start", c: COUL.mut, s: 11, w: 500 });
  s += TXT(286, 170, "On transmet : vecteur + résidu", { a: "start", s: 12 });
  return SVG(560, 196, s, "Un macrobloc de l’image à coder et le bloc le plus ressemblant dans l’image de référence, reliés par le vecteur de mouvement");
}

// Générations de codecs : débit HD pour une même qualité
function figGenerations() {
  const G = [["MPEG-2", "1995", 16], ["H.264 / AVC", "2003", 8], ["HEVC / H.265", "2013", 4], ["AV1", "2018", 3], ["VVC / H.266", "2020", 2]];
  let s = TXT(20, 18, "Débit pour une HD 1080 de qualité « diffusion », ordres de grandeur", { a: "start", s: 11, c: COUL.mut, w: 500 });
  G.forEach((g, i) => { const y = 32 + i * 32, w = g[2] * 16; s += TXT(20, y + 16, g[0], { a: "start", s: 12 }) + TXT(140, y + 16, g[1], { a: "start", s: 11, c: COUL.mut, w: 500 }) + RECT(184, y + 2, w, 20, { f: [COUL.mut, COUL.bleu, COUL.vio, COUL.ora, COUL.rose][i], r: 5 }) + TXT(192 + w, y + 17, "≈ " + g[2] + " Mbit/s", { a: "start", s: 12 }); });
  return SVG(560, 196, s, "Débit d’une HD de qualité diffusion : environ 16 mégabits par seconde en MPEG-2, 8 en H.264, 4 en HEVC, 3 en AV1, 2 en VVC");
}

// Arbre de Huffman d'ABRACADABRA
function figHuffman() {
  const N = (x, y, t, f) => '<circle cx="' + x + '" cy="' + y + '" r="16" fill="' + (f ? COUL.bleu : "rgba(255,255,255,.1)") + '" stroke="' + COUL.bleu + '" stroke-width="1.5"/>' + TXT(x, y + 5, t, { s: 12, c: f ? "#0b0c0e" : COUL.txt, w: 700 });
  const A = (x1, y1, x2, y2, b) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#8e8e93" stroke-width="1.5"/>' + TXT((x1 + x2) / 2 + (b === "0" ? -9 : 9), (y1 + y2) / 2, b, { s: 12, c: COUL.ora, m: 1 });
  let s = A(280, 28, 150, 84, "0") + A(280, 28, 400, 84, "1") + A(400, 84, 330, 140, "0") + A(400, 84, 470, 140, "1") + A(330, 140, 295, 196, "0") + A(330, 140, 365, 196, "1") + A(470, 140, 435, 196, "0") + A(470, 140, 505, 196, "1");
  s += N(280, 28, "11") + N(150, 84, "A 5", 1) + N(400, 84, "6") + N(330, 140, "2") + N(470, 140, "4") + N(295, 196, "C 1", 1) + N(365, 196, "D 1", 1) + N(435, 196, "B 2", 1) + N(505, 196, "R 2", 1);
  s += TXT(20, 140, "A = 0", { a: "start", m: 1, c: COUL.bleu }) + TXT(20, 160, "C = 100   D = 101", { a: "start", m: 1, s: 12 }) + TXT(20, 180, "B = 110   R = 111", { a: "start", m: 1, s: 12 }) + TXT(20, 210, "ABRACADABRA : 23 bits (33 en longueur fixe)", { a: "start", s: 11, c: COUL.mut, w: 500 });
  return SVG(560, 222, s, "Arbre de Huffman du mot ABRACADABRA : A codé 0, les autres lettres codées sur trois bits");
}

// Codage arithmétique : l'intervalle rétrécit
function figIntervalle() {
  const L = 440, x0 = 30;
  let s = "";
  const rangs = [[1, "Départ : [0 ; 1["], [0.8, "après « 0 » : largeur 0,8"], [0.64, "après « 0 » : largeur 0,64"], [0.512, "après « 0 » : largeur 0,512"]];
  rangs.forEach((r, i) => {
    const y = 18 + i * 40, w = r[0] * L;
    s += RECT(x0, y, w * 0.8, 20, { f: "rgba(100,210,255,.55)", r: 3 }) + RECT(x0 + w * 0.8, y, w * 0.2, 20, { f: "rgba(255,159,10,.55)", r: 3 });
    s += TXT(x0 + w * 0.4, y + 14, "0 (80 %)", { s: 10, c: "#0b0c0e", w: 700 }) + TXT(x0 + w * 0.9, y + 14, "1", { s: 10, c: "#0b0c0e", w: 700 });
    s += TXT(x0 + L + 8, y + 14, r[1], { a: "start", s: 10, c: COUL.mut, w: 500 });
  });
  s += TXT(30, 186, "3 bins très probables → intervalle de largeur 0,512 → −log₂(0,512) ≈ 0,97 bit : moins d’un bit pour trois bins !", { a: "start", s: 11, c: COUL.ora });
  return SVG(600, 196, s, "Codage arithmétique : à chaque bin, l’intervalle est réduit à la part de ce bin ; trois zéros très probables tiennent dans moins d’un bit");
}

// Les trois étapes du CABAC
function figCABAC() {
  const B = [["Valeur à coder", "ex. niveau = 3"], ["1. Binarisation", "→ bins 1 1 1 0"], ["2. Contexte", "p(0) selon les voisins"], ["3. Codage arithm.", "binaire"]];
  let s = "";
  B.forEach((b, i) => { const x = 8 + i * 140; s += RECT(x, 26, 124, 56, { f: i ? "rgba(191,90,242,.14)" : COUL.fond, s: i ? COUL.vio : COUL.ligne, r: 10 }) + TXT(x + 62, 50, b[0], { s: 12 }) + TXT(x + 62, 68, b[1], { s: 10.5, c: COUL.mut, w: 500 }); if (i < 3) s += FL(x + 126, 54, x + 138, 54); });
  s += FL(484, 84, 484, 118, COUL.ora) + TXT(484, 134, "bits : 0 1 1 0 1 …", { s: 12, m: 1, c: COUL.ora });
  s += '<path d="M450 84 V104 H350 V88" fill="none" stroke="' + COUL.bleu + '" stroke-width="1.5" stroke-dasharray="4 3"/>' + FL(350, 96, 350, 86, COUL.bleu) + TXT(400, 120, "mise à jour de p", { s: 10.5, c: COUL.bleu, w: 500 });
  s += TXT(10, 160, "CABAC : Context-Adaptive Binary Arithmetic Coding", { a: "start", s: 11, c: COUL.mut, w: 500 });
  return SVG(570, 170, s, "Les trois étapes du CABAC : binarisation, modélisation de contexte, codage arithmétique binaire, avec mise à jour des probabilités");
}

// CBR et VBR
function figCBRVBR() {
  const cplx = x => 0.35 + 0.3 * Math.sin(x / 22) + (x > 120 && x < 170 ? 0.35 : 0);
  const panneau = (x0, titre, cbr) => {
    let s = RECT(x0, 10, 260, 182, { f: COUL.fond, s: COUL.ligne, r: 12 }) + TXT(x0 + 130, 30, titre, { s: 13 });
    let d = "", q = "";
    for (let x = 0; x <= 230; x += 5) {
      const c = cplx(x), deb = cbr ? 0.55 : c, qual = cbr ? 1.1 - c * 0.9 : 0.75;
      d += (x ? "L" : "M") + (x0 + 15 + x) + " " + (100 - deb * 50).toFixed(1) + " ";
      q += (x ? "L" : "M") + (x0 + 15 + x) + " " + (178 - qual * 50).toFixed(1) + " ";
    }
    s += TXT(x0 + 15, 48, "Débit", { a: "start", s: 10.5, c: COUL.bleu }) + '<path d="' + d + '" fill="none" stroke="' + COUL.bleu + '" stroke-width="2.2"/>';
    s += TXT(x0 + 15, 122, "Qualité", { a: "start", s: 10.5, c: COUL.ora }) + '<path d="' + q + '" fill="none" stroke="' + COUL.ora + '" stroke-width="2.2"/>';
    return s;
  };
  let s = panneau(10, "CBR : débit constant", true) + panneau(290, "VBR : débit variable", false);
  s += RECT(10 + 15 + 120, 40, 50, 150, { f: "rgba(255,69,58,.1)", r: 0 }) + RECT(290 + 15 + 120, 40, 50, 150, { f: "rgba(255,69,58,.1)", r: 0 }) + TXT(170, 186, "plan chargé", { s: 10, c: COUL.I }) + TXT(450, 186, "plan chargé", { s: 10, c: COUL.I });
  return SVG(560, 200, s, "En CBR, le débit est constant et la qualité baisse dans les plans chargés ; en VBR, le débit suit la complexité et la qualité reste stable");
}

// Profils H.264 emboîtés
function figProfils() {
  const P = [["High 4:4:4 Predictive", "4:4:4, jusqu’à 14 bits, codage sans perte possible", COUL.rose], ["High 4:2:2", "4:2:2, jusqu’à 10 bits (XAVC, AVC-Intra)", COUL.vio], ["High 10", "4:2:0 en 10 bits", COUL.P], ["High", "transformée 8 × 8, matrices de quantification", COUL.bleu], ["Main", "images B, CABAC, entrelacé", COUL.B], ["Baseline", "images I et P, CAVLC", COUL.jaune]];
  let s = "";
  P.forEach((p, i) => { const m = i * 12; s += RECT(10 + m, 10 + m * 2.4, 540 - 2 * m, 236 - m * 2.4 - m * 0.4, { f: "rgba(255,255,255,.03)", s: p[2], r: 12 }) + TXT(22 + m, 30 + m * 2.4, p[0], { a: "start", s: 12.5, c: p[2] }) + TXT(540 - m, 30 + m * 2.4, p[1], { a: "end", s: 10.5, c: COUL.mut, w: 500 }); });
  s += TXT(280, 262, "Chaque profil contient tous les outils du profil qu’il entoure.", { s: 11, c: COUL.txt, w: 500 });
  return SVG(560, 272, s, "Les profils H.264 emboîtés comme des boîtes à outils : Baseline dans Main, dans High, dans High 10, dans High 4:2:2, dans High 4:4:4");
}

// Les principaux niveaux H.264
function figNiveaux() {
  const N = [["3", "720 × 576 à 25 i/s", "10", "12,5"], ["3.1", "1280 × 720 à 30 i/s", "14", "17,5"], ["3.2", "1280 × 720 à 60 i/s", "20", "25"], ["4", "1920 × 1080 à 30 i/s", "20", "25"], ["4.1", "1920 × 1080 à 30 i/s", "50", "62,5"], ["4.2", "1920 × 1080 à 60 i/s", "50", "62,5"], ["5.1", "3840 × 2160 à 30 i/s", "240", "300"], ["5.2", "3840 × 2160 à 60 i/s", "240", "300"]];
  let s = TXT(20, 20, "Niveau", { a: "start", s: 11, c: COUL.mut }) + TXT(90, 20, "Format le plus lourd", { a: "start", s: 11, c: COUL.mut }) + TXT(400, 20, "Débit max (Mbit/s)", { s: 11, c: COUL.mut }) + TXT(360, 36, "Main", { s: 10, c: COUL.B }) + TXT(450, 36, "High", { s: 10, c: COUL.bleu });
  N.forEach((n, i) => { const y = 44 + i * 24; s += RECT(12, y, 530, 22, { f: i % 2 ? "rgba(255,255,255,.04)" : "none", r: 4 }) + TXT(22, y + 16, n[0], { a: "start", m: 1, c: COUL.ora }) + TXT(90, y + 16, n[1], { a: "start", s: 12, w: 500 }) + TXT(360, y + 16, n[2], { m: 1, s: 12 }) + TXT(450, y + 16, n[3], { m: 1, s: 12 }); });
  return SVG(560, 244, s, "Tableau des principaux niveaux H.264, avec le format le plus lourd accepté et le débit maximal en profil Main et en profil High");
}

// Le conteneur et ses pistes
function figConteneur() {
  const P = [["Vidéo", "H.264, ProRes, HEVC…", COUL.bleu], ["Audio 1-2", "PCM, AAC…", COUL.B], ["Timecode", "10:00:00:00", COUL.ora], ["Métadonnées", "caméra, objectif, date", COUL.vio]];
  let s = RECT(10, 10, 300, 176, { s: COUL.txt, f: "rgba(255,255,255,.04)", r: 14 }) + TXT(24, 32, "rush_A001.mov  (conteneur)", { a: "start", s: 13 });
  P.forEach((p, i) => { const y = 44 + i * 34; s += RECT(24, y, 272, 28, { f: "rgba(255,255,255,.06)", s: p[2], r: 7 }) + TXT(36, y + 18, p[0], { a: "start", s: 12, c: p[2] }) + TXT(284, y + 18, p[1], { a: "end", s: 11, c: COUL.mut, w: 500 }); });
  s += TXT(330, 40, "Dans le fichier, les pistes", { a: "start", s: 12 }) + TXT(330, 56, "sont entrelacées :", { a: "start", s: 12 });
  const seq = "VAVAVAVTVA";
  for (let i = 0; i < seq.length; i++) { const k = seq[i], c = k === "V" ? COUL.bleu : k === "A" ? COUL.B : COUL.ora; s += RECT(330 + i * 22, 70, k === "V" ? 20 : 12, 26, { f: c, r: 3 }); }
  s += TXT(330, 126, "+ un index (« moov », en-tête MXF)", { a: "start", s: 11, c: COUL.mut, w: 500 }) + TXT(330, 142, "qui dit où se trouve chaque image", { a: "start", s: 11, c: COUL.mut, w: 500 });
  s += TXT(330, 166, "Codec = la langue", { a: "start", s: 11.5, c: COUL.ora }) + TXT(330, 184, "Conteneur = l’enveloppe", { a: "start", s: 11.5, c: COUL.ora });
  return SVG(560, 196, s, "Un fichier conteneur contient des pistes vidéo, audio, timecode et métadonnées, rangées en morceaux entrelacés avec un index");
}

// Extrait de fiche MediaInfo
function MI(lignes, titre) {
  let s = RECT(0, 0, 560, 34 + lignes.length * 22, { f: "#0b0c0e", r: 0 }) + TXT(16, 22, titre || "MediaInfo — extrait", { a: "start", s: 12, c: COUL.mut });
  lignes.forEach((l, i) => { const y = 48 + i * 22; s += TXT(16, y, l[0], { a: "start", s: 12.5, m: 1, c: COUL.mut, w: 500 }) + TXT(250, y, ": " + l[1], { a: "start", s: 12.5, m: 1, c: l[2] ? COUL.jaune : COUL.txt, w: 500 }); });
  return SVG(560, 40 + lignes.length * 22, s, "Extrait d’une fiche technique de fichier : " + lignes.map(l => l[0] + " " + l[1]).join(", "));
}

// Bloc de coefficients quantifiés (8 × 8) pour les questions « Lire »
function figBlocQ(v) {
  let s = TXT(420, 40, "Coefficients", { s: 13 }) + TXT(420, 58, "quantifiés", { s: 13 }) + TXT(420, 82, "(bloc de luminance)", { s: 11, c: COUL.mut, w: 500 });
  v.forEach((x, i) => { const c = i % 8, r = Math.floor(i / 8); s += RECT(14 + c * 33, 12 + r * 33, 31, 31, { f: x ? "rgba(255,159,10," + Math.min(0.85, 0.2 + Math.abs(x) / 30).toFixed(2) + ")" : "rgba(255,255,255,.04)", r: 4 }) + TXT(29.5 + c * 33, 33 + r * 33, x, { s: 12, m: 1, c: x ? COUL.txt : "#48484a" }); });
  return SVG(560, 282, s, "Bloc de huit par huit coefficients quantifiés : " + v.join(", "));
}
// Un bloc quantifié vraisemblable : DC fort, quelques AC près du coin, des zéros partout ailleurs
function blocAuHasard() {
  const v = new Array(64).fill(0), n = H(4, 9);
  v[0] = C([1, -1]) * H(8, 40);
  for (let k = 1; k < n; k++) { const i = ZZ[H(1, 14)]; v[i] = C([1, -1]) * H(1, 6); }
  return v;
}

/* ==========================================================================
   MODULE 1 — POURQUOI COMPRESSER : DÉBIT ET TAUX DE COMPRESSION
   ========================================================================== */
const MODULE_1 = {
  titre: "Pourquoi compresser ? Débit et taux de compression",
  nav: "Débit et taux",
  resume: "Débit, taux, redondances",
  intro: "Un signal HD non compressé produit plus d’un <b>gigabit par seconde</b> : une carte de 128 Go serait pleine en un quart d’heure. Ce module montre <b>combien</b> il faut compresser, et <b>où</b> se cache l’information que les codecs suppriment sans que l’œil s’en aperçoive.",
  // Le film du module (source : films/compression-video-module-1/). Chapitres : [seconde, titre].
  film: {
    src: "films/module-1.mp4",
    affiche: "films/module-1.jpg",
    duree: "2 min 23",
    chapitres: [[6.4, "Le problème"], [18.4, "Le débit"], [33.4, "Bit ou octet"], [42.4, "Le taux de compression"], [57.4, "Sans perte, avec perte"], [66.4, "Les quatre redondances"], [69.4, "Spatiale"], [78.4, "Temporelle"], [87.4, "Statistique"], [96.4, "Psychovisuelle"], [105.4, "La place occupée"], [117.4, "Codec ≠ conteneur"], [123.4, "À retenir"]]
  },
  notions: {
    titre: "Les mots du débit et de la compression",
    intro: "Compresser, c’est réduire le <b>débit</b>. Le <b>taux de compression</b> dit de combien. Les <b>redondances</b> disent ce qu’on peut enlever.",
    mots: [
      { t: "Débit binaire", s: "D", u: "bit/s (Mbit/s, Gbit/s)", ic: "🚰", d: "La quantité de données transmise ou enregistrée <b>chaque seconde</b>. C’est elle qui décide de la taille des fichiers, de la durée d’enregistrement sur une carte et de la liaison nécessaire pour transporter l’image.", c: "Le débit d’un robinet en litres par seconde : plus il coule vite, plus vite la baignoire (la carte mémoire) se remplit.", r: "HD 1080 25p 4:2:2 10 bits non compressé ≈ 1 Gbit/s · ProRes 422 HQ ≈ 184 Mbit/s · Blu-ray ≈ 20 à 40 Mbit/s · streaming HD ≈ 5 Mbit/s." },
      { t: "Bit et octet", ic: "🔢", q: "Mbit/s ou Mo/s : quelle différence ?", d: "Un <b>octet</b> (o, en anglais byte, B majuscule) vaut <b>8 bits</b> (b minuscule). Les débits s’expriment en <b>bits</b> par seconde (Mbit/s, Mb/s), les tailles de fichiers en <b>octets</b> (Mo, Go). Pour passer de l’un à l’autre, on divise ou on multiplie par 8." + figOctet(), c: "Des œufs vendus par boîtes de 8 : compter les œufs ou compter les boîtes ne donne pas le même nombre.", r: "100 Mbit/s = 12,5 Mo/s · 1 Go = 1 000 Mo = 8 000 Mbit (préfixes décimaux, ceux des fabricants de cartes et de disques)." },
      { t: "Compression", ic: "🗜️", d: "Réduire le nombre de bits nécessaires pour représenter l’image, en supprimant ce qui est <b>redondant</b> (répété, prévisible) ou <b>peu visible</b>. On compresse au <b>codage</b> ; l’image est reconstruite au <b>décodage</b>, à chaque lecture.", c: "Écrire « 10 × A » au lieu de « AAAAAAAAAA ». Le lecteur sait le redévelopper." },
      { t: "Taux de compression", s: "τ", u: "sans unité, noté 20:1", ic: "📉", d: "Le rapport entre le débit (ou la taille) <b>avant</b> et <b>après</b> compression. Il s’écrit souvent <b>20:1</b> (« vingt pour un ») : le fichier compressé est vingt fois plus petit, il reste 1/20 des données." + figTaux(20), c: "Une couette dans un sac sous vide : 20:1, c’est vingt fois moins de place… mais il faut la « regonfler » (décoder) pour s’en servir.", r: "ProRes 422 HQ ≈ 5:1 à 6:1 · XDCAM HD 50 Mbit/s ≈ 17:1 · Blu-ray ≈ 20:1 à 40:1 · streaming HD ≈ 100:1 et plus." },
      { t: "Compression sans perte et avec perte", ic: "⚖️", q: "Compression sans perte ou avec perte : quelle différence ?", d: "<b>Sans perte</b> (lossless) : l’image décodée est <b>identique</b>, bit pour bit, à l’originale ; le gain est modeste (≈ 2:1 à 3:1 en vidéo). <b>Avec perte</b> (lossy) : on jette des informations jugées <b>peu visibles</b> ; le gain est énorme (10:1 à plus de 100:1). « <b>Visuellement sans perte</b> » veut dire : différences invisibles à l’œil, mais pas nulles.", c: "Un fichier ZIP (sans perte) contre le résumé d’un livre (avec perte) : le résumé est bien plus court, mais on ne retrouvera jamais le texte exact.", r: "Sans perte : PNG, FFV1, ZIP · avec perte : JPEG, H.264, HEVC, ProRes, DNxHR." },
      { t: "Redondance spatiale", ic: "🧱", d: "Dans une même image, des pixels <b>voisins</b> se ressemblent (ciel, mur, peau). Inutile de les décrire un par un : on décrit leurs <b>variations</b>. C’est le rôle de la <b>DCT</b> (module 2). On parle de compression <b>intra-image</b>." + figRedondances(), c: "Pour décrire un mur blanc, on dit « mur blanc de 3 mètres », pas « blanc, blanc, blanc… » brique après brique." },
      { t: "Redondance temporelle", ic: "🎞️", d: "D’une image à la suivante (1/25 s plus tard !), l’essentiel ne change pas. On ne code que ce qui <b>bouge</b> ou ce qui <b>change</b> : c’est la compression <b>inter-image</b> (module 3).", c: "Un dessin animé : sur le décor fixe, on ne redessine que le personnage qui bouge.", r: "Plan fixe d’interview : plus de 90 % de l’image est quasi identique d’une image à l’autre." },
      { t: "Redondance statistique", ic: "🎲", d: "Certaines valeurs reviennent bien plus souvent que d’autres (après DCT et quantification : énormément de <b>zéros</b>). On leur donne des codes <b>courts</b>, et des codes longs aux valeurs rares : c’est le <b>codage entropique</b> (Huffman, CAVLC, CABAC, module 4). Il est <b>sans perte</b>.", c: "Le morse : la lettre E, la plus fréquente en anglais, s’écrit avec un seul point." },
      { t: "Redondance psychovisuelle", ic: "👁️", q: "Que veut dire « redondance psychovisuelle » ?", d: "L’œil voit mal certains détails : les <b>détails de couleur</b> (d’où le 4:2:2 et le 4:2:0), les <b>textures très fines</b> (hautes fréquences), les petites erreurs dans les zones très chargées ou en mouvement rapide. Le codec les simplifie : c’est <b>là</b> que se fait la perte.", c: "Un tableau impressionniste : on reconnaît le paysage sans voir chaque feuille." },
      { t: "Codec", ic: "🔐", d: "<b>CO</b>deur-<b>DÉC</b>odeur : l’algorithme (et le logiciel ou la puce) qui compresse puis décompresse. Exemples : H.264, HEVC, ProRes, DNxHR, AV1. À ne pas confondre avec le <b>conteneur</b> (.mov, .mp4, .mxf), l’enveloppe du fichier (module 6).", c: "Une langue (le codec) et une enveloppe (le conteneur) : une même lettre peut voyager dans des enveloppes différentes." }
    ],
    formules: [
      { q: "Comment calcule-t-on le débit d’une vidéo non compressée ?", f: "D = l × h × e × q × f", say: "Le débit est égal à la largeur, fois la hauteur, fois le nombre d’échantillons par pixel, fois la quantification, fois la cadence", rows: [["D", "débit", "bit/s", "ce que l’on cherche"], ["l × h", "définition", "pixels", "ex. 1920 × 1080"], ["e", "échantillons par pixel", "—", "3 en 4:4:4 · 2 en 4:2:2 · 1,5 en 4:2:0"], ["q", "quantification", "bits", "8, 10 ou 12 bits par échantillon"], ["f", "cadence", "i/s", "25, 50…"]], ex: "HD 1920 × 1080, 4:2:2, 10 bits, 25 i/s : D = 1920 × 1080 × 2 × 10 × 25 = 1 036 800 000 bit/s ≈ <b>1 037 Mbit/s</b> ≈ 1,04 Gbit/s (image active seule)." },
      { q: "Comment calcule-t-on le taux de compression ?", f: "τ = D<sub>brut</sub> ÷ D<sub>compressé</sub>", say: "Le taux de compression est égal au débit non compressé divisé par le débit compressé", rows: [["τ", "taux de compression", "—", "noté τ:1"], ["D<sub>brut</sub>", "débit non compressé", "Mbit/s", "calculé avec la formule précédente"], ["D<sub>compressé</sub>", "débit après codec", "Mbit/s", "lu sur la fiche du codec ou de la caméra"]], ex: "1 037 Mbit/s compressés à 50 Mbit/s : τ = 1 037 ÷ 50 ≈ 20,7, soit environ <b>21:1</b>." },
      { q: "Quelle part des données a-t-on supprimée ?", f: "Réduction (%) = (1 − 1 ÷ τ) × 100", say: "La réduction en pourcentage est égale à un moins un sur tau, le tout multiplié par cent", rows: [["τ", "taux de compression", "—", "ex. 20 pour 20:1"]], ex: "τ = 20 : (1 − 1/20) × 100 = <b>95 %</b> des données supprimées ; il en reste 5 %." },
      { q: "Quelle place occupe un enregistrement ?", f: "V = D × t ÷ 8", say: "Le volume en octets est égal au débit en bits par seconde, fois la durée en secondes, divisé par huit", rows: [["V", "volume du fichier", "octets", "Mo, Go"], ["D", "débit", "bit/s", "Mbit/s → Mo"], ["t", "durée", "s", "1 h = 3 600 s"], ["8", "bits par octet", "—", "pour passer des bits aux octets"]], ex: "50 Mbit/s pendant 1 h : 50 × 3 600 ÷ 8 = 22 500 Mo = <b>22,5 Go</b>. Astuce : en Go par heure, Go/h = Mbit/s × 0,45." },
      { q: "Combien de bits reste-t-il pour chaque pixel ?", f: "bpp = D ÷ (l × h × f)", say: "Le nombre de bits par pixel est égal au débit divisé par le nombre de pixels par seconde", rows: [["bpp", "bits par pixel", "bit", "repère de l’efficacité d’un codec"], ["D", "débit", "bit/s", ""], ["l × h × f", "pixels par seconde", "pixel/s", ""]], ex: "Streaming 1080p25 à 5 Mbit/s : 5 000 000 ÷ (1920 × 1080 × 25) ≈ <b>0,1 bit par pixel</b>, contre 20 bits par pixel en 4:2:2 10 bits non compressé." }
    ]
  },
  manipuler: {
    titre: "Mesurer le besoin de compression",
    intro: "Deux labos : voir <b>où se cachent les redondances</b> dans une image animée, puis calculer le <b>débit</b>, le <b>taux de compression</b> et la <b>place</b> occupée pour des formats et des codecs réels."
  },
  essentiel: {
    definitions: [
      "<b>Débit</b> : nombre de bits par seconde (Mbit/s). Il fixe la taille des fichiers et la liaison nécessaire.",
      "<b>Taux de compression</b> : débit avant ÷ débit après, noté τ:1.",
      "<b>Sans perte</b> : image identique bit pour bit (gain ≈ 2:1). <b>Avec perte</b> : on supprime ce que l’œil voit mal (gain 10:1 à 100:1 et plus).",
      "Les <b>quatre redondances</b> : spatiale (pixels voisins, DCT), temporelle (images voisines, prédiction), statistique (valeurs fréquentes, codage entropique), psychovisuelle (ce que l’œil ne voit pas : c’est là qu’est la perte).",
      "<b>Codec</b> = codeur-décodeur (H.264, ProRes…) ; <b>conteneur</b> = l’enveloppe du fichier (.mov, .mp4, .mxf)."
    ],
    formules: [["D = l × h × e × q × f", "e = 3 (4:4:4), 2 (4:2:2), 1,5 (4:2:0)"], ["τ = D brut ÷ D compressé", "noté τ:1"], ["Réduction = (1 − 1/τ) × 100", "20:1 → 95 % supprimés"], ["V (octets) = D × t ÷ 8", "Go/h = Mbit/s × 0,45"], ["bpp = D ÷ (l × h × f)", "bits par pixel"]],
    reperes: ["HD 1080 25p 4:2:2 10 bits non compressé ≈ <b>1 Gbit/s</b> ; UHD = 4 × HD.", "ProRes 422 HQ (1080 25p) ≈ 184 Mbit/s ≈ 5,6:1.", "XDCAM HD 422 = 50 Mbit/s · Blu-ray ≤ 40 Mbit/s · streaming HD ≈ 5 à 8 Mbit/s.", "1 octet = 8 bits : 100 Mbit/s = 12,5 Mo/s."],
    pieges: ["Confondre <b>Mbit/s</b> et <b>Mo/s</b> : un facteur 8 !", "Un taux de 20:1 ne supprime pas 20 % des données, mais <b>95 %</b>.", "Oublier <b>e</b> : en 4:2:2 on multiplie par 2, pas par 3.", "« Visuellement sans perte » n’est <b>pas</b> « sans perte » : l’image n’est pas identique bit pour bit.", "Le débit d’un fichier comprend aussi l’<b>audio</b> (PCM stéréo 48 kHz 24 bits ≈ 2,3 Mbit/s)."]
  },
  evaluation: {
    lire: [
      () => { const k = C([0, 1, 2]); const L = [["XAVC-I 4K 25p", "240"], ["XAVC-L 4K 25p", "100"], ["XAVC-L HD 25p", "50"]]; return { type: "nombre", contexte: "Fiche technique d’une caméra : « XAVC-I 4K 25p : 240 Mbit/s · XAVC-L 4K 25p : 100 Mbit/s · XAVC-L HD 25p : 50 Mbit/s ».", question: "Quel est le débit en <b>" + L[k][0] + "</b> ?", reponse: +L[k][1], unite: "Mbit/s", ecart: 0, explication: "On lit directement " + L[k][1] + " Mbit/s sur la ligne " + L[k][0] + ".", indice: "Cherchez la ligne qui porte exactement ce nom de mode." }; },
      () => { const d = C([8000, 12500, 4500, 25000]); return { type: "nombre", question: "Dans cette fiche, quel est le débit de la vidéo en <b>Mbit/s</b> ?", figure: MI([["Format", "AVC"], ["Durée", "2 min 14 s"], ["Débit", NB(d, 0) + " kb/s", 1], ["Largeur", "1 920 pixels"], ["Hauteur", "1 080 pixels"]]), reponse: d / 1000, unite: "Mbit/s", explication: NB(d, 0) + " kb/s = " + NB(d, 0) + " kilobits par seconde = " + NB(d / 1000, 1) + " Mbit/s (on divise par 1 000).", indice: "1 Mbit/s = 1 000 kb/s." }; },
      () => { const t = C([10, 20, 50]); return { type: "nombre", question: "D’après ce schéma, quel est le taux de compression ?", figure: figTaux(t).replace(/\(\d+:1\)/, "").replace(/il reste 1\/\d+ des données : [\d,]+ % ont été supprimées/, ""), reponse: t, unite: ": 1", tolerance: 0.05, explication: "Il reste " + NB(100 / t, 1) + " % des données : τ = 100 ÷ " + NB(100 / t, 1) + " = " + t + ", soit " + t + ":1.", indice: "τ = 100 % ÷ la part qui reste." }; },
      { type: "qcm", question: "Dans cette fiche, quelle ligne indique le <b>codec</b> ?", figure: MI([["Nom", "INTERVIEW_A003.mov"], ["Conteneur", "QuickTime"], ["Format", "ProRes"], ["Profil", "422 HQ"], ["Débit", "184 Mb/s"]]), bonne: "Format : ProRes", mauvaises: ["Conteneur : QuickTime", "Nom : INTERVIEW_A003.mov", "Débit : 184 Mb/s"], explication: "Le codec est le « format » de compression de la piste vidéo : ProRes (profil 422 HQ). QuickTime (.mov) est le conteneur.", indice: "Le conteneur est l’enveloppe ; le codec est la façon de compresser." }
    ],
    comprendre: [
      ["Un taux de compression de 10:1 signifie que l’on a supprimé 10 % des données.", false, "10:1 signifie qu’il reste 1/10 des données : on en a supprimé <b>90 %</b>.", "Il reste un dixième."],
      ["Une compression sans perte permet de retrouver l’image originale bit pour bit.", true, "C’est la définition du « sans perte » (lossless) : le décodage redonne exactement l’original."],
      ["Un débit de 100 Mbit/s remplit une carte plus vite qu’un débit de 100 Mo/s.", false, "100 Mo/s = 800 Mbit/s : c’est 8 fois plus que 100 Mbit/s.", "1 octet = 8 bits."],
      ["La compression intra-image exploite la redondance temporelle.", false, "Intra = à l’intérieur d’une seule image : elle exploite la redondance <b>spatiale</b>. La redondance temporelle est exploitée par la compression <b>inter</b>-image."],
      ["Plus le taux de compression est élevé, moins il reste de bits par pixel.", true, "bpp = D ÷ (l × h × f) : si le débit baisse pour un même format, chaque pixel dispose de moins de bits."],
      ["Passer de 4:4:4 à 4:2:0 divise par deux le débit, avant même le codec.", true, "e passe de 3 à 1,5 échantillons par pixel : le débit est divisé par 2. C’est déjà une compression avec perte, psychovisuelle."],
      ["L’œil est plus sensible aux détails de luminance qu’aux détails de couleur.", true, "C’est pourquoi on peut sous-échantillonner la chrominance (4:2:2, 4:2:0) sans dégradation visible."],
      ["Le codage entropique est la partie de la compression qui dégrade l’image.", false, "Le codage entropique (Huffman, CABAC) est <b>sans perte</b>. La perte vient de la quantification et du sous-échantillonnage de la couleur."]
    ],
    qcm: [
      ["Quelle redondance la compression inter-image exploite-t-elle ?", "La redondance temporelle (images voisines)", ["La redondance spatiale (pixels voisins)", "La redondance statistique (valeurs fréquentes)", "La redondance psychovisuelle (couleurs fines)"], "Inter-image = entre les images : on profite de ce qui ne change pas d’une image à la suivante."],
      ["Que signifie le mot « codec » ?", "Codeur-décodeur", ["Code de contrôle", "Compression décimale", "Conteneur de codage"], "Un codec code (compresse) et décode (décompresse) l’image."],
      ["Quel est l’ordre de grandeur du débit d’un signal HD 1080 25p 4:2:2 10 bits non compressé ?", "≈ 1 Gbit/s", ["≈ 100 Mbit/s", "≈ 10 Gbit/s", "≈ 50 Mbit/s"], "1920 × 1080 × 2 × 10 × 25 ≈ 1 037 Mbit/s ≈ 1 Gbit/s."],
      ["Une compression « visuellement sans perte »…", "laisse des différences invisibles à l’œil, mais l’image n’est pas identique", ["redonne l’image originale bit pour bit", "n’utilise pas de quantification", "garde un taux de compression de 1:1"], "« Visuellement » sans perte : l’œil ne voit pas la différence, mais les valeurs des pixels ont changé."],
      ["Quelle redondance le codage de Huffman ou le CABAC exploitent-ils ?", "Statistique : les valeurs fréquentes reçoivent des codes courts", ["Spatiale : les pixels voisins se ressemblent", "Temporelle : les images se ressemblent", "Psychovisuelle : l’œil voit mal la couleur"], "Le codage entropique attribue des codes de longueur adaptée à la fréquence de chaque symbole."],
      ["Où se fait la perte dans une compression avec perte ?", "Dans ce que l’œil voit mal : détails fins, couleur, zones chargées", ["Dans le codage entropique", "Dans le conteneur", "Dans le calcul du débit"], "La perte est psychovisuelle : on simplifie d’abord ce qui se voit le moins."]
    ],
    calculer: [
      () => { const F = C(FORMATS.slice(1, 4)), e = C(["4:4:4", "4:2:2", "4:2:0"]), q = C([8, 10, 12]), f = C([25, 50]); const D = BRUT(F.l, F.h, ECH[e], q, f); return { type: "nombre", question: "Calculez le débit non compressé d’une image <b>" + F.l + " × " + F.h + "</b>, <b>" + e + "</b>, <b>" + q + " bits</b>, <b>" + f + " i/s</b>.", reponse: D, unite: "Mbit/s", explication: "e = " + NB(ECH[e], 1) + " en " + e + ". D = " + F.l + " × " + F.h + " × " + NB(ECH[e], 1) + " × " + q + " × " + f + " = " + NB(D * 1e6, 0) + " bit/s ≈ " + NB(D, 1) + " Mbit/s.", indice: "D = l × h × e × q × f, puis divisez par 1 000 000." }; },
      () => { const b = C([1036.8, 829.4, 4147.2, 622.1]), d = C([25, 50, 100, 185]); return { type: "nombre", question: "Un signal de <b>" + NB(b, 1) + " Mbit/s</b> est compressé à <b>" + d + " Mbit/s</b>. Quel est le taux de compression ?", reponse: b / d, unite: ": 1", explication: "τ = " + NB(b, 1) + " ÷ " + d + " ≈ " + NB(b / d, 1) + ", soit environ " + Math.round(b / d) + ":1.", indice: "τ = débit avant ÷ débit après." }; },
      () => { const d = C([25, 50, 100, 184, 240]), m = C([30, 45, 60, 90, 120]); const V = d * m * 60 / 8 / 1000; return { type: "nombre", question: "Une caméra enregistre à <b>" + d + " Mbit/s</b> pendant <b>" + m + " min</b>. Quel volume occupent les rushes (en Go) ?", reponse: V, unite: "Go", explication: "V = " + d + " × " + m + " × 60 ÷ 8 = " + NB(V * 1000, 0) + " Mo ≈ " + NB(V, 1) + " Go.", indice: "Mettez la durée en secondes, puis divisez par 8 pour passer en octets." }; },
      () => { const g = C([64, 128, 256, 512]), d = C([50, 100, 184, 240]); const t = g * 8000 / d / 60; return { type: "nombre", question: "Combien de <b>minutes</b> d’images tiennent sur une carte de <b>" + g + " Go</b> à <b>" + d + " Mbit/s</b> ?", reponse: t, unite: "min", explication: g + " Go = " + NB(g * 8000, 0) + " Mbit. Durée = " + NB(g * 8000, 0) + " ÷ " + d + " = " + NB(g * 8000 / d, 0) + " s ≈ " + NB(t, 1) + " min.", indice: "Convertissez les Go en Mbit (× 8 000), puis divisez par le débit." }; },
      () => { const d = C([3, 5, 8, 12, 16]), F = C(FORMATS.slice(2, 4)), f = C([25, 50]); const b = d * 1e6 / (F.l * F.h * f); return { type: "nombre", question: "Une vidéo <b>" + F.l + " × " + F.h + "</b> à <b>" + f + " i/s</b> est diffusée à <b>" + d + " Mbit/s</b>. Combien de bits par pixel reste-t-il ?", reponse: b, unite: "bit/pixel", tolerance: 0.05, explication: "bpp = " + d + " 000 000 ÷ (" + F.l + " × " + F.h + " × " + f + ") ≈ " + NB(b, 3) + " bit par pixel.", indice: "Divisez le débit (en bit/s) par le nombre de pixels par seconde." }; },
      () => { const t = C([4, 5, 8, 10, 20, 25, 50]); return { type: "nombre", question: "Un codec atteint un taux de <b>" + t + ":1</b>. Quel pourcentage des données a été supprimé ?", reponse: (1 - 1 / t) * 100, unite: "%", ecart: 0.2, explication: "(1 − 1/" + t + ") × 100 = " + NB((1 - 1 / t) * 100, 1) + " %. Il reste " + NB(100 / t, 1) + " % des données.", indice: "Il reste 1/τ des données." }; }
    ],
    exercice: [
      () => { const d = C([50, 100, 185]), h = C([2, 3, 4]); const b = BRUT(1920, 1080, 2, 10, 25); return { type: "exercice", question: "Tournage d’un documentaire en HD <b>1920 × 1080, 4:2:2, 10 bits, 25 i/s</b>. La caméra compresse à <b>" + d + " Mbit/s</b>. On tourne <b>" + h + " h</b> de rushes.", etapes: [
        { question: "Débit non compressé (Mbit/s) ?", reponse: b, unite: "Mbit/s" },
        { question: "Taux de compression de la caméra ?", reponse: b / d, unite: ": 1" },
        { question: "Volume des rushes (Go) ?", reponse: d * h * 3600 / 8 / 1000, unite: "Go" }
      ], solution: "a) 1920 × 1080 × 2 × 10 × 25 = 1 036,8 Mbit/s. b) τ = 1 036,8 ÷ " + d + " ≈ " + NB(b / d, 1) + ":1. c) V = " + d + " × " + h * 3600 + " ÷ 8 = " + NB(d * h * 3600 / 8, 0) + " Mo ≈ " + NB(d * h * 0.45, 1) + " Go.", indice: "Commencez par D = l × h × e × q × f." }; },
      () => { const d = C([12, 16, 20, 25]), f = C([25, 50]); const b = BRUT(3840, 2160, 1.5, 10, f); return { type: "exercice", question: "Une plateforme diffuse un film en UHD <b>3840 × 2160, 4:2:0, 10 bits, " + f + " i/s</b> (HDR) à <b>" + d + " Mbit/s</b>.", etapes: [
        { question: "Débit non compressé (Mbit/s) ?", reponse: b, unite: "Mbit/s" },
        { question: "Taux de compression ?", reponse: b / d, unite: ": 1" },
        { question: "Bits par pixel après compression ?", reponse: d * 1e6 / (3840 * 2160 * f), unite: "bit/pixel", tolerance: 0.05 }
      ], solution: "a) 3840 × 2160 × 1,5 × 10 × " + f + " = " + NB(b, 1) + " Mbit/s. b) τ ≈ " + NB(b, 1) + " ÷ " + d + " ≈ " + NB(b / d, 0) + ":1. c) " + d + " 000 000 ÷ (3840 × 2160 × " + f + ") ≈ " + NB(d * 1e6 / (3840 * 2160 * f), 3) + " bit par pixel, contre 15 bits par pixel avant compression.", indice: "En 4:2:0, e = 1,5." }; }
    ]
  }
};

/* ==========================================================================
   MODULE 2 — LA COMPRESSION JPEG
   ========================================================================== */
const MODULE_2 = {
  titre: "La compression JPEG : compresser une image",
  nav: "JPEG",
  resume: "Blocs 8 × 8, DCT, quantification",
  intro: "Le JPEG est la base de presque tous les codecs vidéo : <b>découper</b> l’image en blocs, la <b>transformer</b> en fréquences (DCT), <b>arrondir</b> grossièrement ce que l’œil voit mal (quantification), puis <b>ranger</b> et <b>coder</b> les nombres obtenus. Comprendre le JPEG, c’est comprendre la compression <b>intra-image</b> de ProRes, DNxHR, et des images I de H.264 ou de HEVC.",
  // Le film du module (source : films/compression-video-module-2/). Chapitres : [seconde, titre].
  film: {
    src: "films/module-2.mp4",
    affiche: "films/module-2.jpg",
    duree: "2 min 32",
    chapitres: [[6.4, "La chaîne JPEG"], [21.4, "Y′CbCr, 4:2:0 et blocs 8 × 8"], [39.4, "La DCT"], [57.4, "La quantification"], [75.4, "Erreur et facteur de qualité"], [90.4, "Zigzag, RLE et Huffman"], [105.4, "Les artefacts"], [117.4, "La compression intra-image"], [132.4, "À retenir"]]
  },
  notions: {
    titre: "La chaîne du JPEG, étape par étape",
    intro: "Chaque étape a un rôle précis. Une seule, la <b>quantification</b>, décide de la qualité (avec le sous-échantillonnage de la couleur).",
    mots: [
      { t: "JPEG", ic: "🖼️", d: "Norme de compression d’images fixes (Joint Photographic Experts Group, 1992). Compression <b>avec perte</b>, réglée par un <b>facteur de qualité</b>. Les codecs vidéo intra (Motion JPEG, ProRes, DNxHD) reprennent cette chaîne." + figChaineJPEG(), r: "Photo JPEG de qualité 90 : taux ≈ 10:1 · qualité 50 : ≈ 20:1 à 30:1." },
      { t: "Passage en Y′CbCr et sous-échantillonnage", ic: "🎨", q: "Que fait le JPEG avant la DCT ?", d: "L’image RVB est convertie en <b>luminance Y′</b> et deux <b>différences de couleur Cb et Cr</b>. La couleur est souvent sous-échantillonnée en <b>4:2:0</b> (une valeur de Cb et de Cr pour 4 pixels) : l’œil y est peu sensible. C’est une première perte, avant même la DCT.", r: "4:4:4 → 4:2:0 : deux fois moins d’échantillons au total." },
      { t: "Bloc 8 × 8", ic: "🔲", d: "Chaque composante (Y′, Cb, Cr) est découpée en blocs de <b>8 × 8 = 64 pixels</b>, traités séparément. Voilà pourquoi une image trop compressée montre des <b>carrés</b> : c’est l’effet de bloc.", c: "Un carrelage : chaque carreau est décrit seul ; si on le décrit trop grossièrement, les joints se voient.", r: "HD 1920 × 1080 : 240 × 135 = 32 400 blocs de luminance par image." },
      { t: "DCT (transformée en cosinus discrète)", ic: "〰️", q: "Que fait la DCT ?", d: "Elle remplace les 64 valeurs de pixels par 64 <b>coefficients de fréquence</b> : la quantité de chacun des 64 <b>motifs de base</b> (des rayures de plus en plus fines) qu’il faut mélanger pour reconstruire le bloc. La DCT <b>ne compresse pas</b> et <b>ne perd rien</b> : elle <b>range</b> l’information. Dans un bloc ordinaire, l’énergie se concentre dans quelques coefficients en <b>haut à gauche</b> (basses fréquences)." + figBlocDCT(), c: "Une recette : au lieu de lister 64 couleurs de pixels, on dit « beaucoup de gris moyen, un peu de dégradé horizontal, presque pas de rayures fines »." },
      { t: "Coefficient DC et coefficients AC", ic: "🎯", d: "Le coefficient <b>DC</b> (en haut à gauche, fréquence nulle) donne la <b>moyenne</b> du bloc. Les 63 coefficients <b>AC</b> décrivent les variations, des plus lentes (près du DC) aux plus rapides (en bas à droite). Le DC est codé par <b>différence</b> avec celui du bloc précédent.", r: "Avec la DCT du JPEG : DC = 8 × moyenne des pixels (après avoir retiré 128 à chaque valeur)." },
      { t: "Fréquence spatiale", ic: "📶", d: "La rapidité des variations dans l’image. <b>Basse fréquence</b> : variations douces (ciel, peau). <b>Haute fréquence</b> : détails fins, bords nets, textures, grain. L’œil est bien moins sensible aux erreurs dans les hautes fréquences.", c: "Les grandes vagues de l’océan (basses fréquences) et les petites rides à leur surface (hautes fréquences)." },
      { t: "Quantification", ic: "✂️", q: "Où se trouve la perte dans le JPEG ?", d: "Chaque coefficient est <b>divisé</b> par un pas (lu dans la <b>table de quantification</b>) puis <b>arrondi</b>. Les pas sont <b>petits</b> en basses fréquences (on garde la précision) et <b>grands</b> en hautes fréquences : beaucoup de coefficients deviennent <b>0</b>. L’arrondi est <b>irréversible</b> : c’est l’étape qui perd de l’information." + figTableQ(), c: "Arrondir les prix au centime près pour une baguette, à la centaine d’euros près pour une voiture." },
      { t: "Facteur de qualité", ic: "🎚️", d: "Un réglage (de 1 à 100 dans la plupart des logiciels) qui <b>agrandit</b> ou <b>réduit</b> tous les pas de la table. Qualité basse = pas plus grands = plus de zéros = fichier plus petit, mais plus d’artefacts.", r: "Qualité 50 = table standard · qualité 75 : pas divisés par 2 · qualité 25 : pas multipliés par 2." },
      { t: "Parcours en zigzag et RLE", ic: "↯", d: "Les 64 coefficients quantifiés sont lus en <b>zigzag</b>, des basses vers les hautes fréquences : les <b>zéros</b> se retrouvent groupés à la fin. On code alors des couples « <b>nombre de zéros</b> avant la valeur ; valeur » (RLE, run-length encoding), et un code <b>EOB</b> (fin de bloc) remplace tous les zéros restants." + figZigzag(), c: "Faire sa valise : les objets d’abord, l’air (les zéros) à la fin, et on ferme avec « le reste est vide »." },
      { t: "Codage de Huffman", ic: "🌳", d: "La dernière étape, <b>sans perte</b> : les symboles fréquents reçoivent des codes binaires <b>courts</b>, les symboles rares des codes longs (module 4)." },
      { t: "Artefacts de compression", ic: "🧩", q: "Quels défauts voit-on quand on compresse trop ?", d: "<b>Effet de bloc</b> (carrés de 8 × 8, surtout dans les dégradés), <b>ringing</b> (halos et « moustiques » autour des bords nets et des textes), <b>bavure de couleur</b> (la couleur déborde, à cause du 4:2:0), <b>banding</b> (dégradé en marches d’escalier)." + figArtefacts(), r: "Ils apparaissent d’abord dans les ciels, les dégradés, et autour des titres." },
      { t: "Compression intra-image", ic: "🧊", d: "Chaque image est compressée <b>seule</b>, sans regarder les autres, comme une suite de JPEG. Chaque image se décode indépendamment : le montage image par image est fluide, mais le débit est plus élevé qu’en compression inter-image.", r: "Codecs intra : Motion JPEG, ProRes, DNxHD et DNxHR, AVC-Intra, XAVC-I, JPEG 2000." },
      { t: "JPEG 2000", ic: "🌊", d: "Norme plus récente qui remplace la DCT par une transformée en <b>ondelettes</b> sur toute l’image : pas de blocs, l’image devient <b>floue</b> plutôt que « carrelée » quand on compresse trop. Utilisée dans le <b>DCP</b> du cinéma numérique, où chaque image est indépendante.", r: "DCP : JPEG 2000, 12 bits, au plus 250 Mbit/s." }
    ],
    formules: [
      { q: "Comment la DCT calcule-t-elle un coefficient ?", f: "F(u,v) = ¼ C(u) C(v) Σ<sub>x</sub> Σ<sub>y</sub> f(x,y) cos[(2x+1)uπ/16] cos[(2y+1)vπ/16]", say: "Le coefficient F de fréquences u et v est la somme, sur les 64 pixels du bloc, de la valeur de chaque pixel multipliée par les deux cosinus du motif u, v", rows: [["F(u,v)", "coefficient", "—", "quantité du motif u, v dans le bloc"], ["f(x,y)", "pixel", "—", "valeur du pixel moins 128 (centrée sur 0)"], ["u, v", "fréquences", "0 à 7", "horizontale et verticale"], ["x, y", "position", "0 à 7", "colonne et ligne du pixel"], ["C", "normalisation", "—", "1/√2 si u ou v vaut 0, sinon 1"]], ex: "Bloc uniforme à 160 : f = 160 − 128 = 32 partout. F(0,0) = ¼ × ½ × 64 × 32 = <b>256</b> ; les 63 coefficients AC valent 0. Un seul nombre décrit tout le bloc." },
      { q: "Comment quantifie-t-on un coefficient ?", f: "F<sub>q</sub> = arrondi(F ÷ Q)", say: "Le coefficient quantifié est égal à l’arrondi du coefficient divisé par le pas de quantification", rows: [["F<sub>q</sub>", "coefficient quantifié", "—", "le nombre réellement codé"], ["F", "coefficient DCT", "—", "sortie de la DCT"], ["Q", "pas de quantification", "—", "lu dans la table, à la même position"]], ex: "F = 256 et Q = 16 → F<sub>q</sub> = <b>16</b>. F = −23 et Q = 55 → arrondi(−0,42) = <b>0</b> : le coefficient disparaît." },
      { q: "Que retrouve le décodeur ?", f: "F′ = F<sub>q</sub> × Q  ·  erreur ≤ Q ÷ 2", say: "Le coefficient reconstruit est égal au coefficient quantifié multiplié par le pas ; l’erreur est au plus la moitié du pas", rows: [["F′", "coefficient reconstruit", "—", "approximation de F"], ["Q ÷ 2", "erreur maximale", "—", "plus le pas est grand, plus l’erreur peut l’être"]], ex: "F = 37 et Q = 10 : F<sub>q</sub> = arrondi(3,7) = 4, F′ = 40. Erreur = 3, bien inférieure à 10 ÷ 2 = 5." },
      { q: "Comment le facteur de qualité change-t-il les pas ?", f: "Q = T × S ÷ 100  ·  S = 5 000 ÷ qualité (si < 50), sinon S = 200 − 2 × qualité", say: "Le pas est égal au pas de la table standard multiplié par un facteur d’échelle S, divisé par cent", rows: [["T", "pas de la table standard", "—", "ex. 16 pour le DC"], ["S", "facteur d’échelle", "%", "100 à la qualité 50"], ["Q", "pas utilisé", "—", "arrondi, au moins 1"]], ex: "Qualité 75 : S = 200 − 150 = 50 → Q = T ÷ 2 : le pas du DC passe de 16 à <b>8</b>. Qualité 10 : S = 500 → Q = 5 × T = 80." },
      { q: "Combien de blocs dans une image ?", f: "Blocs = (l ÷ 8) × (h ÷ 8)", say: "Le nombre de blocs est égal à la largeur divisée par huit, fois la hauteur divisée par huit", rows: [["l, h", "définition", "pixels", "de la composante concernée"]], ex: "1920 × 1080 : 240 × 135 = <b>32 400 blocs</b> de luminance. En 4:2:0, Cb et Cr (960 × 540) en ont chacun 8 100." }
    ]
  },
  manipuler: {
    titre: "Dans la machine JPEG",
    intro: "Trois labos : suivre un <b>bloc</b> de 8 × 8 pixels dans la chaîne, reconstruire un bloc <b>motif par motif</b>, puis compresser une <b>image entière</b> en observant le poids du fichier et les artefacts."
  },
  essentiel: {
    definitions: [
      "<b>Chaîne JPEG</b> : Y′CbCr (+ 4:2:0) → blocs 8 × 8 → DCT → quantification → zigzag + RLE → Huffman.",
      "<b>DCT</b> : transforme 64 pixels en 64 coefficients de fréquence ; elle ne perd rien et ne compresse pas, elle concentre l’énergie en haut à gauche.",
      "<b>DC</b> : moyenne du bloc. <b>AC</b> : les 63 variations, des basses aux hautes fréquences.",
      "<b>Quantification</b> : division par un pas puis arrondi. Seule étape irréversible (avec le 4:2:0). Grands pas en hautes fréquences.",
      "<b>Zigzag + RLE</b> : regrouper les zéros à la fin et les coder en « nombre de zéros ; valeur », puis EOB.",
      "<b>Artefacts</b> : effet de bloc, ringing, bavure de couleur, banding."
    ],
    formules: [["F<sub>q</sub> = arrondi(F ÷ Q)", "F′ = F<sub>q</sub> × Q ; erreur ≤ Q/2"], ["DC = 8 × moyenne (pixels − 128)", "bloc uniforme : un seul coefficient non nul"], ["Q = T × S ÷ 100", "S = 5 000/qualité (< 50) ou 200 − 2 × qualité"], ["Blocs = (l/8) × (h/8)", "HD : 32 400 blocs de luminance"]],
    reperes: ["Bloc = 8 × 8 = 64 pixels = 1 DC + 63 AC.", "Pas du DC dans la table standard : 16 ; plus grand pas : 121.", "Qualité 75 : pas ÷ 2 · qualité 25 : pas × 2.", "Photo JPEG : 10:1 à 20:1. DCP en JPEG 2000 : au plus 250 Mbit/s."],
    pieges: ["Croire que la DCT compresse : c’est la <b>quantification</b> qui réduit l’information.", "Croire que Huffman dégrade l’image : il est <b>sans perte</b>.", "Confondre le coefficient en haut à gauche avec le pixel en haut à gauche : c’est la <b>moyenne</b> du bloc.", "Réenregistrer un JPEG plusieurs fois après retouche <b>accumule</b> les pertes (pertes de génération).", "Les hautes fréquences sont en <b>bas à droite</b> du bloc de coefficients, pas en haut."]
  },
  evaluation: {
    lire: [
      () => { const v = blocAuHasard(), n = v.filter(x => x).length; return { type: "nombre", question: "Combien de coefficients de ce bloc ne sont <b>pas nuls</b> ?", figure: figBlocQ(v), reponse: n, unite: "coefficients", ecart: 0, explication: "On compte " + n + " valeurs différentes de 0 sur 64 : les " + (64 - n) + " autres seront codées par des longueurs de zéros et un EOB.", indice: "Comptez les cases colorées." }; },
      () => { const v = blocAuHasard(); return { type: "nombre", question: "Quelle est la valeur du coefficient <b>DC</b> de ce bloc ?", figure: figBlocQ(v), reponse: v[0], unite: "", ecart: 0, explication: "Le DC est le coefficient en haut à gauche (fréquence nulle) : " + v[0] + ". Il représente la moyenne du bloc.", indice: "DC = fréquence 0 horizontale et verticale." }; },
      () => { const u = H(0, 7), v = H(0, 7); return { type: "nombre", question: "Dans cette table de quantification, quel est le pas de la case <b>entourée en jaune</b> ?", figure: figTableQ(u, v), reponse: TQ[v * 8 + u], unite: "", ecart: 0, explication: "On lit " + TQ[v * 8 + u] + " (colonne u = " + u + ", ligne v = " + v + "). Plus on va vers le bas à droite, plus le pas est grand : les hautes fréquences sont quantifiées plus grossièrement.", indice: "Lisez le nombre écrit dans la case au bord jaune." }; },
      { type: "qcm", question: "Dans cette table, où sont les pas les plus <b>grands</b> ?", figure: figTableQ(), bonne: "En bas à droite : les hautes fréquences", mauvaises: ["En haut à gauche : les basses fréquences", "Sur la première ligne uniquement", "Ils sont tous égaux"], explication: "Les pas grandissent vers le bas à droite : l’œil voit mal les erreurs sur les détails fins, on les arrondit plus fort.", indice: "Repérez les nombres à trois chiffres." }
    ],
    comprendre: [
      ["La DCT réduit à elle seule le nombre de bits du bloc.", false, "La DCT ne fait que <b>ranger</b> l’information (64 valeurs → 64 coefficients). C’est la quantification puis le codage qui réduisent le nombre de bits."],
      ["La quantification est l’étape irréversible du JPEG.", true, "L’arrondi fait perdre des informations : on ne peut pas retrouver F exactement à partir de F<sub>q</sub>."],
      ["Le coefficient DC représente la moyenne du bloc.", true, "C’est le coefficient de fréquence nulle : DC = 8 × la moyenne des pixels centrés."],
      ["Les pas de quantification sont plus grands pour les hautes fréquences.", true, "L’œil voit mal les erreurs sur les détails fins : on peut les arrondir plus grossièrement."],
      ["Le codage de Huffman dégrade légèrement l’image.", false, "Huffman est un codage entropique <b>sans perte</b> : il change seulement l’écriture des nombres."],
      ["Baisser le facteur de qualité augmente le nombre de coefficients nuls.", true, "Qualité basse = pas plus grands : plus de coefficients s’arrondissent à 0."],
      ["Le JPEG 2000 produit des effets de bloc de 8 × 8.", false, "Le JPEG 2000 utilise une transformée en ondelettes sur toute l’image : il produit du flou, pas de blocs."],
      ["Un bloc parfaitement uniforme n’a qu’un coefficient non nul après la DCT.", true, "Aucune variation : seul le DC (la moyenne) est non nul ; les 63 AC valent 0."]
    ],
    qcm: [
      ["Dans quel ordre se suivent les étapes du JPEG ?", "Blocs 8 × 8 → DCT → quantification → zigzag → Huffman", ["DCT → blocs 8 × 8 → Huffman → quantification → zigzag", "Quantification → DCT → blocs 8 × 8 → zigzag → Huffman", "Huffman → zigzag → DCT → quantification → blocs 8 × 8"], "On découpe, on transforme, on arrondit, on range, puis on code."],
      ["Quel artefact apparaît en halos autour des titres et des bords nets ?", "Le ringing", ["L’effet de bloc", "Le banding", "Le moiré"], "Les bords nets contiennent beaucoup de hautes fréquences ; quand on les quantifie fort, des oscillations apparaissent autour d’eux."],
      ["Pourquoi lit-on les coefficients en zigzag ?", "Pour regrouper les zéros des hautes fréquences à la fin du bloc", ["Pour accélérer la DCT", "Pour corriger les couleurs", "Pour éviter l’effet de bloc"], "Le zigzag va des basses aux hautes fréquences : les zéros finissent groupés et un seul code EOB les remplace."],
      ["Quelle étape du JPEG est sans perte ?", "Le codage de Huffman", ["La quantification", "Le sous-échantillonnage 4:2:0", "L’arrondi des coefficients"], "Huffman ne fait que réécrire les nombres avec des codes de longueur variable."],
      ["Où se trouvent les hautes fréquences dans le bloc de coefficients ?", "En bas à droite", ["En haut à gauche", "Au centre", "Sur la diagonale montante"], "u et v augmentent vers la droite et vers le bas : la case (7, 7) est la plus haute fréquence."],
      ["Quelle norme d’image utilise le DCP du cinéma numérique ?", "JPEG 2000", ["JPEG", "H.264", "ProRes"], "Le DCP utilise le JPEG 2000 (ondelettes), image par image, au plus 250 Mbit/s."],
      ["Quel codec est un codec intra-image ?", "ProRes", ["H.264 en GOP long", "HEVC en GOP long", "MPEG-2 IBBP"], "ProRes compresse chaque image seule, à la manière du JPEG. H.264, HEVC ou MPEG-2 en GOP long exploitent aussi les autres images."]
    ],
    calculer: [
      () => { const Q = C([10, 11, 12, 14, 16, 19, 24, 40, 51]), F = C([1, -1]) * H(20, 400); const r = Math.round(F / Q); return { type: "nombre", question: "Un coefficient DCT vaut <b>" + F + "</b> et son pas de quantification est <b>" + Q + "</b>. Quelle valeur quantifiée est codée ?", reponse: r, unite: "", ecart: 0, explication: "F<sub>q</sub> = arrondi(" + F + " ÷ " + Q + ") = arrondi(" + NB(F / Q, 2) + ") = " + r + ".", indice: "Divisez, puis arrondissez à l’entier le plus proche." }; },
      () => { const Q = C([10, 16, 24, 40, 55, 61]), F = H(20, 300); const fq = Math.round(F / Q), Fp = fq * Q; return { type: "nombre", question: "Un coefficient vaut <b>" + F + "</b>, son pas vaut <b>" + Q + "</b>. Quelle valeur le décodeur retrouve-t-il ?", reponse: Fp, unite: "", ecart: 0, explication: "F<sub>q</sub> = arrondi(" + F + " ÷ " + Q + ") = " + fq + ", puis F′ = " + fq + " × " + Q + " = " + Fp + ". Erreur : " + Math.abs(Fp - F) + " (au plus " + NB(Q / 2, 1) + ").", indice: "Quantifiez, puis multipliez par le pas." }; },
      () => { const p = H(20, 240); const dc = 8 * (p - 128); return { type: "nombre", question: "Un bloc 8 × 8 est <b>uniforme</b> : tous ses pixels valent <b>" + p + "</b>. Que vaut son coefficient DC ?", reponse: dc, unite: "", ecart: 0, explication: "On centre : " + p + " − 128 = " + (p - 128) + ". DC = 8 × " + (p - 128) + " = " + dc + ". Les 63 AC sont nuls.", indice: "DC = 8 × (valeur − 128)." }; },
      () => { const F = C(FORMATS); return { type: "nombre", question: "Combien de blocs de 8 × 8 faut-il pour la luminance d’une image <b>" + F.l + " × " + F.h + "</b> ?", reponse: (F.l / 8) * (F.h / 8), unite: "blocs", ecart: 0, explication: "(" + F.l + " ÷ 8) × (" + F.h + " ÷ 8) = " + F.l / 8 + " × " + F.h / 8 + " = " + NB(F.l * F.h / 64, 0) + " blocs.", indice: "Combien de blocs en largeur ? en hauteur ?" }; },
      () => { const T = C([16, 12, 24, 40, 51]), q = C([10, 25, 40, 60, 75, 90]); const S = ECHELLE(q), Q = PAS(T, q); return { type: "nombre", question: "Le pas de la table standard vaut <b>" + T + "</b>. Quel pas utilise-t-on à la qualité <b>" + q + "</b> ?", reponse: Q, unite: "", ecart: 0.6, explication: "S = " + (q < 50 ? "5 000 ÷ " + q : "200 − 2 × " + q) + " = " + NB(S, 1) + ". Q = " + T + " × " + NB(S, 1) + " ÷ 100 ≈ " + Q + ".", indice: "Calculez d’abord S, puis Q = T × S ÷ 100." }; },
      () => { const l = C([4000, 6000, 3000]), h = l * 2 / 3, k = C([2, 3, 4, 6]); const brut = l * h * 3 / 1e6; return { type: "nombre", question: "Une photo de <b>" + l + " × " + h + "</b> pixels en RVB 8 bits (3 octets par pixel) est enregistrée en JPEG de <b>" + k + " Mo</b>. Quel est le taux de compression ?", reponse: brut / k, unite: ": 1", explication: "Taille brute = " + l + " × " + h + " × 3 = " + NB(brut, 1) + " Mo. τ = " + NB(brut, 1) + " ÷ " + k + " ≈ " + NB(brut / k, 1) + ":1.", indice: "Taille brute = l × h × 3 octets." }; }
    ],
    exercice: [
      () => { const p = H(60, 200), Q = C([8, 16, 32]); const dc = 8 * (p - 128), fq = Math.round(dc / Q); return { type: "exercice", question: "Un bloc de ciel est uniforme : ses 64 pixels valent <b>" + p + "</b>. Le pas de quantification du DC vaut <b>" + Q + "</b>.", etapes: [
        { question: "Que vaut le coefficient DC ?", reponse: dc, unite: "", ecart: 0 },
        { question: "Quelle valeur quantifiée est codée ?", reponse: fq, unite: "", ecart: 0 },
        { question: "Combien de coefficients non nuls dans ce bloc ?", reponse: fq === 0 ? 0 : 1, unite: "", ecart: 0 }
      ], solution: "a) DC = 8 × (" + p + " − 128) = " + dc + ". b) arrondi(" + dc + " ÷ " + Q + ") = " + fq + ". c) Un bloc uniforme n’a pas de variation : les 63 AC sont nuls ; seul le DC reste (" + (fq === 0 ? "ici, il est lui aussi arrondi à 0" : "1 coefficient") + ").", indice: "Bloc uniforme : seul le DC peut être non nul." }; },
      () => { const l = C([4000, 6000]), h = l * 2 / 3, k = C([2, 4, 6]); const brut = l * h * 3 / 1e6; return { type: "exercice", question: "Un appareil photo de <b>" + l + " × " + h + "</b> pixels enregistre en RVB 8 bits, puis en JPEG de <b>" + k + " Mo</b>.", etapes: [
        { question: "Taille de l’image non compressée (Mo) ?", reponse: brut, unite: "Mo" },
        { question: "Taux de compression ?", reponse: brut / k, unite: ": 1" },
        { question: "Bits par pixel dans le JPEG ?", reponse: k * 8e6 / (l * h), unite: "bit/pixel", tolerance: 0.05 }
      ], solution: "a) " + l + " × " + h + " × 3 = " + NB(brut, 1) + " Mo. b) τ = " + NB(brut, 1) + " ÷ " + k + " ≈ " + NB(brut / k, 1) + ":1. c) " + k + " Mo = " + NB(k * 8, 0) + " Mbit ; " + NB(k * 8e6, 0) + " ÷ " + NB(l * h, 0) + " ≈ " + NB(k * 8e6 / (l * h), 2) + " bit par pixel (contre 24).", indice: "Une image RVB 8 bits = 3 octets par pixel." }; }
    ]
  }
};

/* ==========================================================================
   MODULE 3 — LA COMPRESSION MPEG : IMAGES I, P, B ET GOP
   ========================================================================== */
// Nombre d'images P et B dans un GOP de N images, d'ancrage tous les M
const NBP = (N, M) => typeof N === "number" ? Math.ceil(N / M) - 1 : 0;
const NBB = (N, M) => N - Math.ceil(N / M);

const MODULE_3 = {
  titre: "La compression MPEG : exploiter le temps",
  nav: "MPEG et GOP",
  resume: "Images I, P, B, GOP, mouvement",
  intro: "À 25 images par seconde, deux images successives se ressemblent énormément. Les codecs MPEG (MPEG-2, H.264, HEVC…) ne transmettent pas chaque image entière : ils <b>prédisent</b> l’image à partir des précédentes (et des suivantes !), puis n’envoient que des <b>vecteurs de mouvement</b> et la <b>différence</b> restante. C’est la compression <b>inter-image</b>, organisée en <b>GOP</b>.",
  // Le film du module (source : films/compression-video-module-3/). Chapitres : [seconde, titre].
  film: {
    src: "films/module-3.mp4",
    affiche: "films/module-3.jpg",
    duree: "2 min 23",
    chapitres: [[6.4, "L’idée : prédire"], [18.4, "Images I, P, B"], [33.4, "Le GOP : N et M"], [48.4, "L’estimation de mouvement"], [63.4, "Compensation et résidu"], [72.4, "L’ordre de transmission"], [84.4, "Le débit moyen d’un GOP"], [96.4, "GOP long ou tout-intra"], [111.4, "Les générations de codecs"], [123.4, "À retenir"]]
  },
  notions: {
    titre: "Prédire une image à partir des autres",
    intro: "Trois types d’images, une organisation (le GOP), et un outil central : l’<b>estimation de mouvement</b>.",
    mots: [
      { t: "Compression inter-image", ic: "🎞️", d: "Compression qui exploite la <b>redondance temporelle</b> : une image est codée en s’appuyant sur d’autres images déjà décodées (images de <b>référence</b>). On ne transmet que ce qui ne peut pas être prédit.", c: "Raconter un match en direct : on ne redécrit pas le stade à chaque phrase, seulement ce que font les joueurs.", r: "Gain typique : 2 à 3 fois moins de débit qu’une compression intra-image de même qualité." },
      { t: "Image I (intra)", ic: "🟥", d: "Image codée <b>seule</b>, comme un JPEG : elle n’utilise aucune autre image. Elle sert de <b>point d’entrée</b> (on peut commencer la lecture ou couper au montage sur une image I) et de première référence. C’est la plus <b>lourde</b>.", r: "Taille relative : I ≈ 1 · P ≈ 0,3 à 0,5 · B ≈ 0,1 à 0,2." },
      { t: "Image P (prédite)", ic: "🟦", d: "Image prédite à partir d’une image <b>précédente</b> (I ou P) : pour chaque bloc, on transmet un <b>vecteur de mouvement</b> et le <b>résidu</b>. Elle peut à son tour servir de référence.", c: "« Comme l’image d’avant, mais le ballon s’est déplacé de 12 pixels vers la droite. »" },
      { t: "Image B (bidirectionnelle)", ic: "🟩", d: "Image prédite à partir d’une image <b>précédente et d’une image suivante</b> (ou d’un mélange des deux). C’est la plus <b>légère</b>, car elle peut prendre le meilleur des deux côtés (par exemple ce qui était caché derrière un objet qui bouge). Elle oblige à transmettre l’image suivante <b>avant</b> elle.", r: "En MPEG-2, une image B ne sert jamais de référence ; en H.264 et HEVC, elle peut en servir (B hiérarchiques)." },
      { t: "GOP (groupe d’images)", ic: "🧮", q: "Qu’est-ce qu’un GOP, et que veulent dire N et M ?", d: "Le <b>Group Of Pictures</b> : une suite d’images qui commence par une image <b>I</b>. On le décrit par <b>N</b>, sa longueur (distance entre deux I), et <b>M</b>, la distance entre deux images d’<b>ancrage</b> (I ou P), donc M − 1 images B entre elles." + figGOP(12, 3, { fleches: true, legende: true }), r: "XDCAM HD : N = 12, M = 3 (IBBPBBPBBPBB) · diffusion : N ≈ 1 s ou plus · tout-intra : N = 1." },
      { t: "GOP long et tout-intra", ic: "📏", q: "GOP long ou tout-intra : que choisir ?", d: "<b>GOP long</b> (Long GOP) : beaucoup d’images P et B entre deux I ; débit faible, mais décodage plus lourd, montage moins fluide, erreurs qui se propagent. <b>Tout-intra</b> (All-I, N = 1) : chaque image est une I ; débit 2 à 3 fois plus élevé, mais chaque image est indépendante.", r: "Tournage et montage : ProRes, DNxHR, XAVC-I (intra) · reportage : XDCAM, XAVC-L (GOP long) · diffusion : GOP long toujours." },
      { t: "GOP fermé et GOP ouvert", ic: "🚪", d: "<b>GOP fermé</b> : aucune image ne fait référence à une image d’un autre GOP ; on peut couper ou commencer la lecture au début de chaque GOP. <b>GOP ouvert</b> : les dernières images B s’appuient sur l’image I du GOP <b>suivant</b> ; un peu plus efficace, mais moins pratique au montage.", c: "Un chapitre de livre qu’on peut lire seul (fermé), ou qui renvoie au début du chapitre suivant (ouvert)." },
      { t: "Ordre d’affichage et ordre de transmission", ic: "🔀", q: "Pourquoi les images ne sont-elles pas transmises dans l’ordre ?", d: "Pour décoder une image B, le décodeur doit déjà connaître l’image <b>suivante</b> sur laquelle elle s’appuie. Le codeur envoie donc les images d’ancrage <b>en avance</b> : l’ordre dans le fichier (ordre de codage) diffère de l’ordre à l’écran. Le décodeur les remet dans l’ordre, ce qui ajoute un petit <b>retard</b>." + figOrdre(), r: "Retard de réordonnancement ≈ M − 1 images. Pour la visio, on supprime les B (IPPP…) : latence minimale." },
      { t: "Macrobloc, CTU", ic: "🔳", d: "Le bloc de base de la prédiction : <b>16 × 16 pixels</b> en MPEG-2 et H.264 (le <b>macrobloc</b>), découpable en blocs plus petits en H.264. HEVC utilise des <b>CTU</b> (Coding Tree Units) jusqu’à <b>64 × 64</b>, découpées en arbre (quadtree) jusqu’à 8 × 8 ; VVC va jusqu’à 128 × 128.", r: "HD 1920 × 1080 : 120 × 68 = 8 160 macroblocs par image (1080 est complété à 1088)." },
      { t: "Estimation de mouvement", ic: "🔍", d: "Au codage, pour chaque bloc de l’image à coder, on <b>cherche</b> dans l’image de référence, à l’intérieur d’une <b>zone de recherche</b>, le bloc le plus ressemblant (celui dont l’écart, la SAD, est le plus petit). C’est l’opération la plus <b>coûteuse</b> du codeur." + figVecteur(), c: "Retrouver un camarade sur deux photos de classe prises à une seconde d’intervalle : on cherche autour de l’endroit où il était.", r: "Précision : ½ pixel en MPEG-2, ¼ de pixel en H.264 et HEVC." },
      { t: "Vecteur de mouvement", ic: "➡️", d: "Le décalage (dx ; dy), en pixels, entre le bloc à coder et le bloc retenu dans l’image de référence. Il ne transporte <b>aucun pixel</b> : il dit seulement <b>où aller chercher</b>. Les vecteurs voisins se ressemblent : on les code par différence." },
      { t: "Compensation de mouvement et résidu", ic: "➖", d: "Le décodeur fabrique une <b>prédiction</b> en recopiant les blocs désignés par les vecteurs (compensation de mouvement). Le codeur transmet la <b>différence</b> entre l’image réelle et cette prédiction : le <b>résidu</b>, compressé comme un JPEG (DCT, quantification). Une bonne prédiction = un résidu presque nul = très peu de bits.", c: "Corriger une copie à partir du corrigé : on n’écrit que les fautes." },
      { t: "Propagation d’erreur", ic: "💥", d: "Si une image de référence est abîmée (erreur de transmission), toutes les images qui s’appuient sur elle héritent de l’erreur, jusqu’à la prochaine image <b>I</b>. D’où des images I régulières en diffusion.", r: "Avec N = 25 à 25 i/s, une erreur peut durer jusqu’à 1 seconde." },
      { t: "Les générations de codecs MPEG", ic: "📅", q: "Quels sont les grands codecs MPEG, et que gagne chaque génération ?", d: "<b>MPEG-1</b> (1993, Vidéo CD) · <b>MPEG-2</b> (1995, DVD, TNT SD, XDCAM, HDV) · <b>H.264 / AVC</b> (2003, Blu-ray, TNT HD, web, XAVC, AVCHD) · <b>HEVC / H.265</b> (2013, UHD, HDR) · <b>VVC / H.266</b> (2020). Hors MPEG : <b>AV1</b> (2018, libre de droits, web). À qualité égale, chaque génération divise le débit par <b>deux</b> environ, au prix d’un codage bien plus lourd." + figGenerations() }
    ],
    formules: [
      { q: "Combien d’images P et B dans un GOP ?", f: "n<sub>P</sub> = N ÷ M − 1  ·  n<sub>B</sub> = N − N ÷ M", say: "Le nombre d’images P est égal à N divisé par M, moins une ; le nombre d’images B est égal à N moins N divisé par M", rows: [["N", "longueur du GOP", "images", "distance entre deux I"], ["M", "distance entre ancrages", "images", "M − 1 images B entre deux ancrages"], ["N ÷ M", "nombre d’ancrages", "images", "1 I + les P"]], ex: "N = 12, M = 3 : 12 ÷ 3 = 4 ancrages, donc 1 I et <b>3 P</b> ; 12 − 4 = <b>8 B</b>. Structure : I B B P B B P B B P B B." },
      { q: "Combien de temps dure un GOP ?", f: "t<sub>GOP</sub> = N ÷ f", say: "La durée du GOP est égale à sa longueur divisée par la cadence", rows: [["N", "longueur du GOP", "images", ""], ["f", "cadence", "i/s", ""]], ex: "N = 12 à 25 i/s : 12 ÷ 25 = <b>0,48 s</b> entre deux images I (deux points d’entrée)." },
      { q: "Quel est le débit moyen d’un GOP ?", f: "D = (S<sub>I</sub> + n<sub>P</sub> × S<sub>P</sub> + n<sub>B</sub> × S<sub>B</sub>) × f ÷ N", say: "Le débit moyen est égal à la taille totale du GOP multipliée par la cadence et divisée par le nombre d’images du GOP", rows: [["S<sub>I</sub>, S<sub>P</sub>, S<sub>B</sub>", "taille d’une image I, P, B", "bits", ""], ["n<sub>P</sub>, n<sub>B</sub>", "nombre d’images P, B", "—", ""], ["f ÷ N", "nombre de GOP par seconde", "1/s", ""]], ex: "S<sub>I</sub> = 800 kbit, S<sub>P</sub> = 300 kbit, S<sub>B</sub> = 120 kbit, N = 12, M = 3, 25 i/s : (800 + 3 × 300 + 8 × 120) × 25 ÷ 12 = 2 660 × 25 ÷ 12 ≈ <b>5 542 kbit/s ≈ 5,5 Mbit/s</b>." },
      { q: "Combien de macroblocs faut-il traiter ?", f: "MB = ⌈l ÷ 16⌉ × ⌈h ÷ 16⌉", say: "Le nombre de macroblocs est égal à la largeur divisée par seize, arrondie au-dessus, fois la hauteur divisée par seize, arrondie au-dessus", rows: [["⌈ ⌉", "arrondi au-dessus", "—", "une ligne incomplète compte quand même"]], ex: "1920 × 1080 : 120 × 68 = <b>8 160 macroblocs</b> par image (1080 ÷ 16 = 67,5 → 68), soit 204 000 par seconde à 25 i/s." }
    ]
  },
  manipuler: {
    titre: "Mouvement, GOP et générations",
    intro: "Trois labos : regarder le codeur <b>chercher</b> chaque bloc dans l’image précédente, <b>construire</b> un GOP et en provoquer les pièges (erreur, coupe), puis comparer le <b>découpage</b> de l’image de MPEG-2 à VVC."
  },
  essentiel: {
    definitions: [
      "<b>Image I</b> : codée seule (intra), point d’entrée, la plus lourde. <b>P</b> : prédite depuis une image passée. <b>B</b> : prédite depuis le passé et le futur, la plus légère.",
      "<b>GOP</b> : suite d’images commençant par une I. <b>N</b> = longueur (de I à I), <b>M</b> = distance entre ancrages (I ou P).",
      "<b>Estimation de mouvement</b> : chercher le bloc le plus ressemblant dans la référence. <b>Vecteur</b> : où aller chercher. <b>Résidu</b> : la différence qui reste, codée par DCT.",
      "<b>GOP long</b> : débit faible, montage et décodage plus lourds. <b>Tout-intra</b> : chaque image indépendante, débit 2 à 3 fois plus élevé.",
      "Avec des images B, l’<b>ordre de transmission</b> diffère de l’ordre d’affichage."
    ],
    formules: [["n<sub>P</sub> = N/M − 1 ; n<sub>B</sub> = N − N/M", "N = 12, M = 3 → 3 P et 8 B"], ["t<sub>GOP</sub> = N ÷ f", "12 images à 25 i/s → 0,48 s"], ["D = (S<sub>I</sub> + n<sub>P</sub>S<sub>P</sub> + n<sub>B</sub>S<sub>B</sub>) × f ÷ N", "débit moyen du GOP"], ["MB = ⌈l/16⌉ × ⌈h/16⌉", "HD : 8 160 macroblocs"]],
    reperes: ["Macrobloc 16 × 16 (MPEG-2, H.264) · CTU jusqu’à 64 × 64 (HEVC), 128 × 128 (VVC).", "MPEG-2 → H.264 → HEVC → VVC : débit ÷ 2 à chaque génération, à qualité égale.", "XDCAM HD : MPEG-2, GOP N = 12, M = 3, 50 Mbit/s.", "Précision des vecteurs : ½ pixel (MPEG-2), ¼ de pixel (H.264, HEVC)."],
    pieges: ["Le vecteur de mouvement ne contient <b>pas de pixels</b> : il dit où copier ; le résidu corrige.", "Une image B ne peut pas être décodée <b>avant</b> l’image suivante dont elle dépend.", "On ne peut couper « proprement » un GOP long que sur une image <b>I</b> (GOP fermé) ; ailleurs, le logiciel doit recalculer.", "N compte <b>toutes</b> les images du GOP, I comprise ; M compte l’écart entre deux ancrages, pas le nombre de B.", "Plus de bruit ou de grain = résidu plus gros = débit plus élevé, même sans mouvement."]
  },
  evaluation: {
    lire: [
      () => { const N = C([6, 9, 12, 15]), M = C([1, 3]); return { type: "nombre", question: "Ce schéma montre un GOP suivi de la première image du GOP suivant (estompée). Quelle est la longueur <b>N</b> du GOP ?", figure: figGOP(N, M), reponse: N, unite: "images", ecart: 0, explication: "On compte les images de la première I jusqu’à l’image qui précède la I suivante : N = " + N + ".", indice: "Comptez de I à I, sans la seconde I." }; },
      () => { const N = C([8, 12, 16]), M = C([2, 4]); const NN = N % M ? N + (M - N % M) : N; return { type: "nombre", question: "Dans ce GOP, quelle est la distance <b>M</b> entre deux images d’ancrage (I ou P) ?", figure: figGOP(NN, M), reponse: M, unite: "", ecart: 0, explication: "Entre deux ancrages, il y a " + (M - 1) + " image" + (M > 2 ? "s" : "") + " B : M = " + M + ".", indice: "M = nombre d’images B entre deux ancrages + 1." }; },
      () => { const N = C([12, 15]), M = 3; return { type: "nombre", question: "Combien d’images <b>B</b> ce GOP contient-il ?", figure: figGOP(N, M), reponse: NBB(N, M), unite: "images", ecart: 0, explication: "On compte les images vertes : " + NBB(N, M) + " (= N − N/M = " + N + " − " + N / M + ").", indice: "Comptez les images B du premier GOP seulement." }; },
      () => { const N = C([12, 15, 24, 25, 50]), M = C([1, 3]); return { type: "nombre", question: "D’après cette fiche, quelle est la longueur du GOP ?", figure: MI([["Format", "AVC"], ["Profil du format", "High@L4.1"], ["Paramètres du format, GOP", "M=" + M + ", N=" + N, 1], ["Images par seconde", "25,000"]]), reponse: N, unite: "images", ecart: 0, explication: "La ligne GOP indique M=" + M + ", N=" + N + " : la longueur du GOP est N = " + N + " images, soit " + NB(N / 25, 2) + " s.", indice: "N est la longueur, M la distance entre ancrages." }; }
    ],
    comprendre: [
      ["Une image I peut être décodée sans aucune autre image.", true, "I = intra : elle est codée seule, comme un JPEG."],
      ["Une image B peut être décodée sans aucune autre image.", false, "Une image B s’appuie sur une image précédente <b>et</b> une image suivante : il faut les avoir décodées avant."],
      ["Avec des images B, l’ordre de transmission diffère de l’ordre d’affichage.", true, "L’ancrage suivant doit arriver avant les B qui en dépendent : il est envoyé en avance."],
      ["Une erreur sur une image P peut se propager jusqu’à la prochaine image I.", true, "Les images suivantes s’appuient sur elle : l’erreur se recopie jusqu’à une image codée seule."],
      ["Un codec tout-intra exploite la redondance temporelle.", false, "Tout-intra = chaque image codée seule : seule la redondance spatiale est exploitée."],
      ["À qualité égale, HEVC divise environ par deux le débit de H.264.", true, "C’est l’ordre de grandeur annoncé pour chaque nouvelle génération (blocs plus grands et adaptatifs, meilleures prédictions)."],
      ["Le vecteur de mouvement transporte les pixels de l’objet qui a bougé.", false, "Il ne contient qu’un décalage (dx ; dy) : les pixels sont recopiés depuis l’image de référence, et le résidu corrige."],
      ["Un plan avec beaucoup de grain demande plus de débit, même s’il est fixe.", true, "Le grain change à chaque image et ne se prédit pas : le résidu reste important."]
    ],
    qcm: [
      ["Quel type d’image est le plus lourd ?", "L’image I", ["L’image P", "L’image B", "Elles ont toutes la même taille"], "L’image I n’utilise aucune prédiction temporelle : elle contient toute l’information."],
      ["Quelle image s’appuie sur une image passée et une image future ?", "L’image B", ["L’image I", "L’image P", "L’image de référence"], "B = bidirectionnelle."],
      ["Que transmet-on pour un bloc d’image P bien prédit ?", "Un vecteur de mouvement et le résidu", ["Les 256 pixels du bloc", "Uniquement la moyenne du bloc", "L’image de référence entière"], "Le décodeur copie le bloc désigné par le vecteur, puis ajoute le résidu."],
      ["Quel GOP facilite le plus le montage image par image ?", "Le tout-intra (N = 1)", ["Un GOP long ouvert", "Un GOP N = 24, M = 3", "Un GOP sans image I"], "Chaque image est indépendante : on peut couper partout, sans recalcul."],
      ["Dans quel ordre sont transmises les images I1 B2 B3 P4 ?", "I1 P4 B2 B3", ["I1 B2 B3 P4", "P4 I1 B2 B3", "B2 B3 I1 P4"], "P4 doit être décodée avant B2 et B3, qui s’appuient sur I1 et P4."],
      ["Quelle est la taille maximale du bloc de codage (CTU) en HEVC ?", "64 × 64", ["8 × 8", "16 × 16", "128 × 128"], "HEVC utilise des CTU jusqu’à 64 × 64 ; 16 × 16 est le macrobloc de MPEG-2 et H.264, 128 × 128 la CTU de VVC."],
      ["Pourquoi la visioconférence évite-t-elle les images B ?", "Pour réduire la latence", ["Pour augmenter la qualité", "Parce que les B sont plus lourdes", "Pour garder le 4:4:4"], "Une image B attend l’image suivante : cela ajoute un retard. En direct interactif, on préfère IPPP…"],
      ["Quel support utilise le MPEG-2 ?", "Le DVD", ["Le Blu-ray UHD", "Le streaming 4K", "Le DCP"], "MPEG-2 : DVD, TNT SD, XDCAM, HDV. Blu-ray UHD : HEVC ; DCP : JPEG 2000."]
    ],
    calculer: [
      () => { const M = C([2, 3, 4]), N = M * C([3, 4, 5, 6]); return { type: "nombre", question: "Un GOP a <b>N = " + N + "</b> et <b>M = " + M + "</b>. Combien contient-il d’images <b>P</b> ?", reponse: NBP(N, M), unite: "images", ecart: 0, explication: N + " ÷ " + M + " = " + N / M + " ancrages, dont 1 I : " + (N / M - 1) + " images P.", indice: "Ancrages = N ÷ M, dont une seule I." }; },
      () => { const M = C([2, 3, 4]), N = M * C([3, 4, 5, 6]); return { type: "nombre", question: "Un GOP a <b>N = " + N + "</b> et <b>M = " + M + "</b>. Combien contient-il d’images <b>B</b> ?", reponse: NBB(N, M), unite: "images", ecart: 0, explication: "n<sub>B</sub> = N − N/M = " + N + " − " + N / M + " = " + NBB(N, M) + ".", indice: "Tout ce qui n’est pas un ancrage est une B." }; },
      () => { const N = C([12, 15, 24, 25, 48, 50]), f = C([25, 50]); return { type: "nombre", question: "Un GOP de <b>" + N + " images</b> est diffusé à <b>" + f + " i/s</b>. Combien de temps sépare deux images I ?", reponse: N / f, unite: "s", explication: "t = N ÷ f = " + N + " ÷ " + f + " = " + NB(N / f, 2) + " s.", indice: "t = N ÷ f." }; },
      () => { const SI = C([600, 800, 1000]), SP = C([250, 300, 350]), SB = C([80, 100, 120]); const N = 12, M = 3; const D = (SI + 3 * SP + 8 * SB) * 25 / 12 / 1000; return { type: "nombre", question: "GOP <b>N = 12, M = 3</b> à <b>25 i/s</b>. Une image I pèse <b>" + SI + " kbit</b>, une P <b>" + SP + " kbit</b>, une B <b>" + SB + " kbit</b>. Quel est le débit moyen (Mbit/s) ?", reponse: D, unite: "Mbit/s", explication: "3 P et 8 B. GOP = " + SI + " + 3 × " + SP + " + 8 × " + SB + " = " + (SI + 3 * SP + 8 * SB) + " kbit. D = " + (SI + 3 * SP + 8 * SB) + " × 25 ÷ 12 ≈ " + NB(D * 1000, 0) + " kbit/s ≈ " + NB(D, 2) + " Mbit/s.", indice: "Taille du GOP × nombre de GOP par seconde (25 ÷ 12)." }; },
      () => { const d = C([8, 10, 12, 16, 20]), g = C([1, 2]); return { type: "nombre", question: "Un programme HD est diffusé à <b>" + d + " Mbit/s</b> en MPEG-2. À qualité égale, quel débit faudrait-il " + (g === 1 ? "en <b>H.264</b>" : "en <b>HEVC</b>") + " (règle : ÷ 2 par génération) ?", reponse: d / Math.pow(2, g), unite: "Mbit/s", explication: (g === 1 ? "MPEG-2 → H.264 : une génération : " : "MPEG-2 → H.264 → HEVC : deux générations : ") + d + " ÷ " + Math.pow(2, g) + " = " + NB(d / Math.pow(2, g), 1) + " Mbit/s.", indice: "Comptez les générations entre les deux codecs." }; },
      () => { const F = C(FORMATS.slice(1)); const mb = Math.ceil(F.l / 16) * Math.ceil(F.h / 16); return { type: "nombre", question: "Combien de macroblocs de 16 × 16 contient une image <b>" + F.l + " × " + F.h + "</b> ?", reponse: mb, unite: "macroblocs", ecart: 0, explication: "⌈" + F.l + " ÷ 16⌉ × ⌈" + F.h + " ÷ 16⌉ = " + Math.ceil(F.l / 16) + " × " + Math.ceil(F.h / 16) + " = " + NB(mb, 0) + ".", indice: "Arrondissez au-dessus chaque division par 16." }; }
    ],
    exercice: [
      () => { const N = C([12, 15]), SI = C([900, 1200]), SP = C([350, 400]), SB = C([120, 150]); const nP = NBP(N, 3), nB = NBB(N, 3), D = (SI + nP * SP + nB * SB) * 25 / N / 1000; return { type: "exercice", question: "Un codeur MPEG-2 utilise un GOP <b>N = " + N + ", M = 3</b> à <b>25 i/s</b>. Tailles moyennes : I = <b>" + SI + " kbit</b>, P = <b>" + SP + " kbit</b>, B = <b>" + SB + " kbit</b>.", etapes: [
        { question: "Nombre d’images P par GOP ?", reponse: nP, unite: "", ecart: 0 },
        { question: "Nombre d’images B par GOP ?", reponse: nB, unite: "", ecart: 0 },
        { question: "Débit moyen (Mbit/s) ?", reponse: D, unite: "Mbit/s" }
      ], solution: "a) " + N + " ÷ 3 = " + N / 3 + " ancrages, dont 1 I : " + nP + " P. b) " + N + " − " + N / 3 + " = " + nB + " B. c) GOP = " + SI + " + " + nP + " × " + SP + " + " + nB + " × " + SB + " = " + (SI + nP * SP + nB * SB) + " kbit ; × 25 ÷ " + N + " ≈ " + NB(D, 2) + " Mbit/s.", indice: "N ÷ M donne le nombre d’ancrages (I + P)." }; },
      () => { const N = C([12, 24, 25, 50]); return { type: "exercice", question: "Une chaîne diffuse avec un GOP de <b>N = " + N + "</b> images à <b>25 i/s</b>. Une erreur de transmission abîme la toute première image P du GOP.", etapes: [
        { question: "Combien de temps sépare deux images I ?", reponse: N / 25, unite: "s" },
        { question: "Jusqu’à quelle image l’erreur peut-elle se propager ?", bonne: "Jusqu’à la prochaine image I", mauvaises: ["Jusqu’à la prochaine image B", "Elle reste sur une seule image", "Jusqu’à la fin du programme"] },
        { question: "Que faire pour réduire la durée de l’erreur ?", bonne: "Raccourcir le GOP (images I plus fréquentes)", mauvaises: ["Allonger le GOP", "Ajouter des images B", "Passer en 4:2:0"] }
      ], solution: "a) " + N + " ÷ 25 = " + NB(N / 25, 2) + " s. b) Toutes les images qui s’appuient sur la P abîmée héritent de l’erreur, jusqu’à la prochaine I, codée seule. c) Des I plus fréquentes limitent la propagation (mais coûtent du débit).", indice: "Quelle image n’utilise aucune référence ?" }; }
    ]
  }
};

/* ==========================================================================
   MODULE 4 — LE CODAGE ENTROPIQUE : DE HUFFMAN AU CABAC
   ========================================================================== */
const LOG2 = x => Math.log(x) / Math.LN2;
const ENTROPIE = ps => ps.reduce((s, p) => s - (p > 0 ? p * LOG2(p) : 0), 0);

const MODULE_4 = {
  titre: "Le codage entropique : de Huffman au CABAC",
  nav: "Codage et CABAC",
  resume: "Entropie, Huffman, CABAC",
  intro: "Après la DCT, la quantification et la prédiction, il reste une longue suite de nombres (beaucoup de 0, quelques 1, de rares grandes valeurs). Le <b>codage entropique</b> les écrit avec le moins de bits possible, <b>sans rien perdre</b>. H.264 propose deux méthodes : le <b>CAVLC</b>, simple, et le <b>CABAC</b>, environ 10 à 15 % plus efficace. HEVC n’utilise plus que le CABAC.",
  // Le film du module (source : films/compression-video-module-4/). Chapitres : [seconde, titre].
  film: {
    src: "films/module-4.mp4",
    affiche: "films/module-4.jpg",
    duree: "2 min 17",
    chapitres: [[6.4, "La dernière étape"], [18.4, "Le coût d’un symbole"], [30.4, "L’entropie"], [42.4, "Le code de Huffman"], [60.4, "Coder ABRACADABRA"], [72.4, "Le codage arithmétique"], [84.4, "Le CABAC"], [102.4, "CAVLC ou CABAC ?"], [117.4, "À retenir"]]
  },
  notions: {
    titre: "Écrire les nombres avec le moins de bits possible",
    intro: "Un symbole fréquent doit coûter peu, un symbole rare peut coûter cher. L’<b>entropie</b> donne la limite qu’aucun codage ne peut battre.",
    mots: [
      { t: "Codage entropique", ic: "🧾", d: "La <b>dernière étape</b> de tout codec : transformer les symboles (coefficients, vecteurs, modes…) en une suite de bits, en tenant compte de leur <b>fréquence</b>. Il est <b>sans perte</b> : le décodeur retrouve exactement les mêmes symboles.", c: "Les abréviations d’un SMS : on raccourcit les mots fréquents (« bjr », « stp »), le message reste le même." },
      { t: "Entropie", s: "H", u: "bit par symbole", ic: "🎲", d: "La quantité moyenne d’information d’une source, en bits par symbole. C’est la <b>limite</b> : aucun codage sans perte ne peut faire mieux en moyenne. Une source très prévisible a une entropie faible ; une source où tout est équiprobable a l’entropie maximale.", c: "Un ami qui répond toujours « oui » ne vous apprend presque rien : son entropie est proche de 0.", r: "Pile ou face équilibré : 1 bit · source à 90 % de 0 : 0,47 bit · 8 symboles équiprobables : 3 bits." },
      { t: "Code à longueur variable (VLC)", ic: "📏", d: "Un code où les symboles <b>fréquents</b> reçoivent des mots <b>courts</b> et les rares des mots longs. Pour être lisible sans séparateur, c’est un code <b>préfixe</b> : aucun mot n’est le début d’un autre.", c: "Le morse : E = « · », Q = « − − · − »." },
      { t: "Code de Huffman", ic: "🌳", q: "Comment construit-on un code de Huffman ?", d: "On classe les symboles par fréquence, puis on <b>réunit les deux moins fréquents</b> en un nœud dont la fréquence est la somme, et on recommence jusqu’à n’avoir qu’un arbre. Le code d’un symbole est le chemin depuis le sommet (0 à gauche, 1 à droite). Limite : chaque symbole coûte <b>au moins 1 bit</b>." + figHuffman(), r: "Utilisé dans le JPEG, le MPEG-2 et le CAVLC de H.264 (sous forme de tables fixes)." },
      { t: "Codage arithmétique", ic: "📐", q: "Comment le codage arithmétique fait-il mieux que Huffman ?", d: "Au lieu de donner un mot de code à chaque symbole, il représente <b>tout le message</b> par un nombre dans un intervalle. À chaque symbole, l’intervalle est réduit à la part de ce symbole : un symbole très probable le réduit à peine, et ne coûte donc presque rien. Il peut descendre <b>sous 1 bit par symbole</b>." + figIntervalle(), c: "Trouver un mot dans le dictionnaire : chaque lettre réduit la zone de pages, et un mot très courant se trouve presque tout de suite." },
      { t: "CAVLC", ic: "📗", d: "<b>Context-Adaptive Variable Length Coding</b> : le codage entropique « simple » de H.264. Des tables de codes à longueur variable, choisies selon le contexte (le nombre de coefficients non nuls des blocs voisins). Seul codage possible dans le profil <b>Baseline</b>." },
      { t: "CABAC", ic: "🧠", q: "Que signifie CABAC, et comment fonctionne-t-il ?", d: "<b>Context-Adaptive Binary Arithmetic Coding</b>. Trois étapes : 1) la <b>binarisation</b> transforme chaque valeur en une suite de <b>bins</b> (0 ou 1) ; 2) la <b>modélisation de contexte</b> choisit, pour chaque bin, une probabilité selon son contexte (bins et blocs voisins) ; 3) le <b>codeur arithmétique binaire</b> code le bin avec cette probabilité, puis la probabilité est <b>mise à jour</b>." + figCABAC(), r: "Gain ≈ 10 à 15 % de débit par rapport au CAVLC · profils Main et High de H.264 · seul codage de HEVC et de VVC." },
      { t: "Binarisation", ic: "🔣", d: "Transformer une valeur en bins : par exemple en code <b>unaire</b> (3 → 1 1 1 0), ou en code <b>Exp-Golomb</b> pour les grandes valeurs. Chaque bin a sa propre probabilité : le premier bin (« la valeur est-elle nulle ? ») est très prévisible.", c: "Le jeu « plus grand ou plus petit ? » : chaque réponse est un bin." },
      { t: "Contexte et adaptation", ic: "🔄", d: "Un <b>contexte</b> est une « case mémoire » de probabilité, choisie d’après ce qui entoure le bin (le bin précédent, les blocs voisins…). Après chaque bin, sa probabilité est <b>mise à jour</b> : le codeur apprend la statistique de la vidéo en cours, sans rien transmettre de plus.", r: "Le CABAC de H.264 gère près de 460 contextes ; chacun a 64 états de probabilité." },
      { t: "Coût du CABAC", ic: "⏱️", d: "Plus efficace, mais plus <b>lourd</b> : chaque bin dépend du précédent, le décodage est séquentiel et difficile à paralléliser. Un vieux lecteur ou un téléphone peut peiner à décoder un fichier CABAC à haut débit." }
    ],
    formules: [
      { q: "Combien coûte un symbole de probabilité p ?", f: "coût = −log₂(p)", say: "Le coût en bits est égal à moins le logarithme en base deux de la probabilité", rows: [["p", "probabilité du symbole", "0 à 1", "sa fréquence"], ["coût", "information", "bit", "ce qu’il faut au minimum pour le coder"]], ex: "p = 0,5 → 1 bit · p = 0,25 → 2 bits · p = 0,9 → 0,15 bit (seul le codage arithmétique sait coder moins d’un bit)." },
      { q: "Comment calcule-t-on l’entropie d’une source ?", f: "H = −Σ p<sub>i</sub> × log₂(p<sub>i</sub>)", say: "L’entropie est égale à moins la somme, pour chaque symbole, de sa probabilité multipliée par le logarithme en base deux de sa probabilité", rows: [["H", "entropie", "bit/symbole", "limite du codage sans perte"], ["p<sub>i</sub>", "probabilité du symbole i", "—", "la somme des p<sub>i</sub> vaut 1"]], ex: "Source à 90 % de 0 et 10 % de 1 : H = −(0,9 × log₂ 0,9 + 0,1 × log₂ 0,1) = 0,137 + 0,332 ≈ <b>0,47 bit</b> par symbole." },
      { q: "Combien de bits faut-il en longueur fixe ?", f: "b = ⌈log₂(K)⌉", say: "Le nombre de bits par symbole est égal au logarithme en base deux du nombre de symboles différents, arrondi au-dessus", rows: [["K", "nombre de symboles différents", "—", ""], ["b", "bits par symbole", "bit", "tous les mots ont la même longueur"]], ex: "5 lettres différentes : log₂ 5 ≈ 2,32 → <b>3 bits</b> par lettre. ABRACADABRA (11 lettres) : 33 bits." },
      { q: "Quelle est la longueur moyenne d’un code ?", f: "L = Σ p<sub>i</sub> × ℓ<sub>i</sub>", say: "La longueur moyenne est égale à la somme des probabilités multipliées par la longueur de chaque mot de code", rows: [["ℓ<sub>i</sub>", "longueur du mot du symbole i", "bits", ""], ["L", "longueur moyenne", "bit/symbole", "toujours ≥ H"]], ex: "p = ½, ¼, ⅛, ⅛ avec les codes 0, 10, 110, 111 : L = 0,5 × 1 + 0,25 × 2 + 0,125 × 3 × 2 = <b>1,75 bit</b> = H : code parfait." }
    ]
  },
  manipuler: {
    titre: "Coder sans rien perdre",
    intro: "Deux labos : construire un <b>code de Huffman</b> étape par étape, puis regarder fonctionner le cœur du <b>CABAC</b> : binarisation, contextes, intervalle qui rétrécit et bits qui sortent."
  },
  essentiel: {
    definitions: [
      "<b>Codage entropique</b> : dernière étape, <b>sans perte</b> ; codes courts pour les symboles fréquents.",
      "<b>Entropie</b> : limite inférieure, en bits par symbole, de tout codage sans perte.",
      "<b>Huffman</b> : on réunit les deux symboles les moins fréquents ; au moins 1 bit par symbole.",
      "<b>Codage arithmétique</b> : tout le message dans un intervalle ; peut descendre sous 1 bit par symbole.",
      "<b>CABAC</b> = Context-Adaptive Binary Arithmetic Coding : binarisation → modélisation de contexte → codage arithmétique binaire, probabilités mises à jour.",
      "<b>CAVLC</b> : codage par tables de H.264, plus simple, seul autorisé en Baseline."
    ],
    formules: [["coût = −log₂(p)", "p = 0,5 → 1 bit"], ["H = −Σ p log₂ p", "limite du codage sans perte"], ["b = ⌈log₂ K⌉", "longueur fixe"], ["L = Σ p × ℓ", "longueur moyenne, L ≥ H"]],
    reperes: ["CABAC : ≈ 10 à 15 % de débit en moins que le CAVLC.", "CABAC : H.264 Main et High · obligatoire et seul en HEVC et VVC · absent du profil Baseline.", "Source à 90 % / 10 % : 0,47 bit par symbole.", "Huffman : ≥ 1 bit par symbole ; arithmétique : peut faire moins."],
    pieges: ["Le CABAC ne <b>dégrade</b> pas l’image : il est sans perte, comme Huffman.", "CABAC n’est pas un codec : c’est l’<b>étape finale</b> de H.264 et de HEVC.", "Un code de Huffman ne peut pas coder un symbole en moins de 1 bit, même très fréquent.", "Le décodage CABAC est plus <b>exigeant</b> pour le processeur : vérifier la compatibilité des lecteurs anciens.", "Un bin n’est pas un bit : un bin est un symbole binaire avant codage ; plusieurs bins peuvent tenir dans un seul bit."]
  },
  evaluation: {
    lire: [
      () => { const msg = C(["ABAC", "BAAD", "CABA", "DACA", "ABBA"]); const code = { A: "0", B: "10", C: "110", D: "111" }; const n = msg.split("").reduce((s, c) => s + code[c].length, 0); return { type: "nombre", contexte: "Table de codes : A = 0 · B = 10 · C = 110 · D = 111.", question: "Combien de bits faut-il pour coder le message <b>" + msg + "</b> ?", reponse: n, unite: "bits", ecart: 0, explication: msg.split("").map(c => c + " = " + code[c]).join(" · ") + " → " + n + " bits.", indice: "Additionnez les longueurs des quatre mots de code." }; },
      () => { const cabac = C([true, false]); return { type: "qcm", question: "D’après cette fiche, quel codage entropique ce fichier utilise-t-il ?", figure: MI([["Format", "AVC"], ["Profil du format", cabac ? "High@L4.1" : "Baseline@L3.1"], ["Paramètres du format, CABAC", cabac ? "Oui" : "Non", 1], ["Paramètres du format, ReFrames", cabac ? "4 images" : "1 image"]]), bonne: cabac ? "CABAC" : "CAVLC", mauvaises: cabac ? ["CAVLC", "Huffman du JPEG", "Aucun"] : ["CABAC", "Huffman du JPEG", "Aucun"], explication: cabac ? "« CABAC : Oui » : le fichier utilise le CABAC, possible en profil High." : "« CABAC : Non » : le fichier utilise le CAVLC, le seul possible en profil Baseline.", indice: "Lisez la ligne CABAC." }; },
      () => { const r = C([1, 2, 3, 4, 5]); return { type: "nombre", question: "D’après cette fiche, combien d’images de référence le codeur peut-il utiliser ?", figure: MI([["Format", "AVC"], ["Profil du format", "Main@L4.0"], ["Paramètres du format, CABAC", "Oui"], ["Paramètres du format, ReFrames", r + " image" + (r > 1 ? "s" : ""), 1]]), reponse: r, unite: "images", ecart: 0, explication: "ReFrames (reference frames) = " + r + " : le codeur peut chercher les blocs dans " + r + " image" + (r > 1 ? "s" : "") + " déjà décodée" + (r > 1 ? "s" : "") + ".", indice: "ReFrames = images de référence." }; },
      { type: "nombre", question: "Dans cet arbre de Huffman, combien de bits compte le code de la lettre <b>A</b> ?", figure: figHuffman().replace(/<text[^>]*>A = 0<\/text>/, "").replace(/<text[^>]*>C = 100.*?<\/text>/, "").replace(/<text[^>]*>B = 110.*?<\/text>/, ""), reponse: 1, unite: "bit", ecart: 0, explication: "Depuis le sommet, A est atteint par une seule branche (0) : son code a 1 bit. C’est la lettre la plus fréquente (5 sur 11).", indice: "Comptez les branches entre le sommet et A." }
    ],
    comprendre: [
      ["Le CABAC est une compression avec perte.", false, "Le CABAC est un codage entropique <b>sans perte</b> : il réécrit les symboles avec moins de bits, sans en changer aucun."],
      ["Un code de Huffman ne peut pas coder un symbole en moins de 1 bit.", true, "Chaque symbole reçoit un mot d’au moins un bit. Le codage arithmétique, lui, peut faire moins."],
      ["Le CABAC est disponible dans le profil Baseline de H.264.", false, "Le Baseline n’autorise que le CAVLC. Le CABAC apparaît avec le profil Main."],
      ["HEVC n’utilise que le CABAC comme codage entropique.", true, "HEVC a abandonné le CAVLC : le CABAC est son seul codage entropique."],
      ["Décoder un flux CABAC demande plus de calcul que décoder un flux CAVLC.", true, "Le codage arithmétique est séquentiel : chaque bin dépend de l’état laissé par le précédent."],
      ["Le codage arithmétique peut utiliser moins d’un bit par symbole en moyenne.", true, "Un symbole de probabilité 0,9 coûte −log₂ 0,9 ≈ 0,15 bit."],
      ["L’entropie d’une source où tous les symboles sont équiprobables est minimale.", false, "Au contraire : des symboles équiprobables sont imprévisibles, l’entropie est maximale (log₂ K)."],
      ["Dans le CABAC, les probabilités sont mises à jour après chaque bin.", true, "C’est le « A » d’adaptatif : le modèle apprend la statistique de la vidéo au fil du codage."]
    ],
    qcm: [
      ["Que signifie CABAC ?", "Context-Adaptive Binary Arithmetic Coding", ["Compressed Audio Bitrate Adaptive Codec", "Constant Average Bitrate Allocation Control", "Coded Adaptive Block And Chroma"], "Codage arithmétique binaire, adaptatif selon le contexte."],
      ["Quelles sont les trois étapes du CABAC, dans l’ordre ?", "Binarisation, modélisation de contexte, codage arithmétique", ["DCT, quantification, zigzag", "Codage arithmétique, binarisation, contexte", "Huffman, RLE, contexte"], "On transforme en bins, on choisit leur probabilité, puis on code l’intervalle."],
      ["Quel profil H.264 ne propose pas le CABAC ?", "Baseline", ["Main", "High", "High 4:2:2"], "Baseline (visio, vieux mobiles) se limite au CAVLC, plus simple à décoder."],
      ["Quel gain de débit apporte le CABAC par rapport au CAVLC ?", "Environ 10 à 15 %", ["Environ 50 %", "Environ 1 %", "Il double le débit"], "Gain mesuré de l’ordre de 10 à 15 % à qualité égale."],
      ["Dans un code de Huffman, quels symboles ont les codes les plus courts ?", "Les plus fréquents", ["Les plus rares", "Les premiers de l’alphabet", "Tous ont la même longueur"], "C’est le principe d’un code à longueur variable."],
      ["En quelle unité s’exprime l’entropie d’une source ?", "En bits par symbole", ["En décibels", "En Mbit/s", "En octets par image"], "C’est une quantité moyenne d’information par symbole."],
      ["À quoi sert le contexte dans le CABAC ?", "À choisir la probabilité d’un bin d’après ses voisins", ["À choisir la taille des blocs", "À fixer le débit", "À corriger les erreurs de transmission"], "Un même bin n’a pas la même probabilité selon ce qui l’entoure : chaque contexte a son propre modèle."]
    ],
    calculer: [
      () => { const p = C([0.5, 0.25, 0.125, 0.8, 0.9, 0.95, 0.6]); return { type: "nombre", question: "Un bin a une probabilité <b>p = " + NB(p, 3) + "</b>. Combien de bits coûte-t-il au minimum ?", reponse: -LOG2(p), unite: "bit", tolerance: 0.05, explication: "coût = −log₂(" + NB(p, 3) + ") ≈ " + NB(-LOG2(p), 3) + " bit.", indice: "coût = −log₂ p = −ln p ÷ ln 2." }; },
      () => { const p = C([0.5, 0.6, 0.7, 0.8, 0.9, 0.95]); const h = ENTROPIE([p, 1 - p]); return { type: "nombre", question: "Une source binaire produit des 0 avec une probabilité <b>" + NB(p, 2) + "</b>. Quelle est son entropie ?", reponse: h, unite: "bit/symbole", tolerance: 0.04, explication: "H = −(" + NB(p, 2) + " × log₂ " + NB(p, 2) + " + " + NB(1 - p, 2) + " × log₂ " + NB(1 - p, 2) + ") ≈ " + NB(h, 3) + " bit par symbole.", indice: "Deux termes : un pour les 0, un pour les 1." }; },
      () => { const K = C([3, 5, 6, 9, 12, 16, 20, 30]), n = C([10, 20, 50, 100]); const b = Math.ceil(LOG2(K)); return { type: "nombre", question: "Un message de <b>" + n + "</b> symboles utilise <b>" + K + "</b> symboles différents. Combien de bits faut-il en <b>longueur fixe</b> ?", reponse: b * n, unite: "bits", ecart: 0, explication: "log₂ " + K + " ≈ " + NB(LOG2(K), 2) + " → " + b + " bits par symbole. " + n + " × " + b + " = " + b * n + " bits.", indice: "Arrondissez log₂ K au-dessus, puis multipliez." }; },
      () => { const d = C([8, 10, 12, 20, 25, 40]), g = C([10, 12, 15]); return { type: "nombre", question: "Un flux H.264 en CAVLC fait <b>" + d + " Mbit/s</b>. En passant au CABAC, on gagne <b>" + g + " %</b>. Quel est le nouveau débit ?", reponse: d * (1 - g / 100), unite: "Mbit/s", explication: d + " × (1 − " + g + "/100) = " + NB(d * (1 - g / 100), 2) + " Mbit/s.", indice: "Retirez " + g + " % du débit." }; },
      () => { const S = C([[0.5, 0.25, 0.125, 0.125], [0.5, 0.25, 0.25], [0.25, 0.25, 0.25, 0.25]]); const h = ENTROPIE(S); return { type: "nombre", question: "Une source a des symboles de probabilités <b>" + S.map(p => NB(p, 3)).join(" ; ") + "</b>. Quelle est son entropie ?", reponse: h, unite: "bit/symbole", tolerance: 0.02, explication: "H = " + S.map(p => NB(p, 3) + " × " + NB(-LOG2(p), 0)).join(" + ") + " = " + NB(h, 3) + " bit par symbole.", indice: "−log₂ ½ = 1, −log₂ ¼ = 2, −log₂ ⅛ = 3." }; },
      () => { const p = C([0.8, 0.9]), n = C([3, 4, 5, 6]); return { type: "nombre", question: "Le codeur arithmétique reçoit <b>" + n + " bins « 0 »</b> de suite, chacun de probabilité <b>" + NB(p, 1) + "</b>. Combien de bits faut-il au total ?", reponse: -n * LOG2(p), unite: "bit", tolerance: 0.05, explication: "Largeur finale = " + NB(p, 1) + "<sup>" + n + "</sup> = " + NB(Math.pow(p, n), 3) + ". Bits = −log₂(" + NB(Math.pow(p, n), 3) + ") ≈ " + NB(-n * LOG2(p), 2) + " bit, soit " + NB(-LOG2(p), 2) + " bit par bin.", indice: "Les coûts s’additionnent : n × (−log₂ p)." }; }
    ],
    exercice: [
      () => { const S = C([{ p: [0.5, 0.25, 0.125, 0.125], l: [1, 2, 3, 3] }, { p: [0.4, 0.3, 0.2, 0.1], l: [1, 2, 3, 3] }, { p: [0.6, 0.2, 0.1, 0.1], l: [1, 2, 3, 3] }]); const h = ENTROPIE(S.p), L = S.p.reduce((s, p, i) => s + p * S.l[i], 0); return { type: "exercice", question: "Quatre symboles A, B, C, D ont les probabilités <b>" + S.p.map(p => NB(p, 3)).join(" ; ") + "</b>. Le code de Huffman obtenu est A = 0, B = 10, C = 110, D = 111.", etapes: [
        { question: "Bits par symbole en longueur fixe ?", reponse: 2, unite: "bits", ecart: 0 },
        { question: "Longueur moyenne du code de Huffman ?", reponse: L, unite: "bit/symbole", tolerance: 0.02 },
        { question: "Entropie de la source ?", reponse: h, unite: "bit/symbole", tolerance: 0.02 }
      ], solution: "a) 4 symboles → log₂ 4 = 2 bits. b) L = " + S.p.map((p, i) => NB(p, 3) + " × " + S.l[i]).join(" + ") + " = " + NB(L, 3) + " bit. c) H = " + NB(h, 3) + " bit : Huffman s’en approche (L ≥ H).", indice: "L = Σ p × longueur du code." }; },
      () => { const d = C([10, 15, 20, 25]), g = 12; const nd = d * (1 - g / 100); return { type: "exercice", question: "Une plateforme encode ses vidéos HD en H.264 profil Baseline (CAVLC) à <b>" + d + " Mbit/s</b>. Elle passe au profil High, avec CABAC, qui fait gagner <b>12 %</b> à qualité égale.", etapes: [
        { question: "Nouveau débit (Mbit/s) ?", reponse: nd, unite: "Mbit/s" },
        { question: "Place gagnée sur 1 h de vidéo (Go) ?", reponse: (d - nd) * 3600 / 8 / 1000, unite: "Go" },
        { question: "Quelle contrepartie ?", bonne: "Un décodage plus exigeant pour le lecteur", mauvaises: ["Une image dégradée", "Un fichier incompatible avec le MP4", "La perte du son"] }
      ], solution: "a) " + d + " × 0,88 = " + NB(nd, 2) + " Mbit/s. b) Gain : " + NB(d - nd, 2) + " Mbit/s × 3 600 ÷ 8 = " + NB((d - nd) * 450, 0) + " Mo ≈ " + NB((d - nd) * 0.45, 2) + " Go. c) Le CABAC est sans perte, mais plus lourd à décoder.", indice: "Le CABAC est sans perte." }; }
    ]
  }
};

/* ==========================================================================
   MODULE 5 — RÉGLER LE DÉBIT : CBR, VBR, PROFILS ET NIVEAUX
   ========================================================================== */
// Niveaux H.264 (tableau A-1) : [niveau, macroblocs/s max, macroblocs/image max, débit max en kbit/s (Baseline, Main)]
const NIV264 = [["1", 1485, 99, 64], ["1b", 1485, 99, 128], ["1.1", 3000, 396, 192], ["1.2", 6000, 396, 384], ["1.3", 11880, 396, 768], ["2", 11880, 396, 2000], ["2.1", 19800, 792, 4000], ["2.2", 20250, 1620, 4000], ["3", 40500, 1620, 10000], ["3.1", 108000, 3600, 14000], ["3.2", 216000, 5120, 20000], ["4", 245760, 8192, 20000], ["4.1", 245760, 8192, 50000], ["4.2", 522240, 8704, 50000], ["5", 589824, 22080, 135000], ["5.1", 983040, 36864, 240000], ["5.2", 2073600, 36864, 240000], ["6", 4177920, 139264, 240000], ["6.1", 8355840, 139264, 480000], ["6.2", 16711680, 139264, 800000]];
// Niveaux HEVC (tableaux A.8 et A.9) : [niveau, échantillons de luminance par image, par seconde, débit max Main tier, High tier (kbit/s)]
const NIVHEVC = [["1", 36864, 552960, 128, null], ["2", 122880, 3686400, 1500, null], ["2.1", 245760, 7372800, 3000, null], ["3", 552960, 16588800, 6000, null], ["3.1", 983040, 33177600, 10000, null], ["4", 2228224, 66846720, 12000, 30000], ["4.1", 2228224, 133693440, 20000, 50000], ["5", 8912896, 267386880, 25000, 100000], ["5.1", 8912896, 534773760, 40000, 160000], ["5.2", 8912896, 1069547520, 60000, 240000], ["6", 35651584, 1069547520, 60000, 240000], ["6.1", 35651584, 2139095040, 120000, 480000], ["6.2", 35651584, 4278190080, 240000, 800000]];
const MBS = (l, h, f) => Math.ceil(l / 16) * Math.ceil(h / 16) * f;
function niveau264(l, h, f, mbit, facteur) {
  const fs = Math.ceil(l / 16) * Math.ceil(h / 16);
  return NIV264.find(n => n[0] !== "1b" && fs <= n[2] && fs * f <= n[1] && mbit * 1000 <= n[3] * (facteur || 1)) || null;
}

const MODULE_5 = {
  titre: "Régler le débit : CBR, VBR, profils et niveaux",
  nav: "CBR, VBR, profils",
  resume: "Débit constant ou variable, Main, High, niveaux",
  intro: "Un même codec peut être réglé de mille façons. Deux questions reviennent toujours : faut-il un débit <b>constant</b> (CBR) ou <b>variable</b> (VBR) ? Et le fichier sera-t-il <b>lisible</b> par le décodeur visé ? C’est le rôle du <b>profil</b> (quels outils) et du <b>niveau</b> (quelle charge), qu’on lit sous la forme « <b>High@L4.1</b> » ou « <b>Main 10@L5.1</b> ».",
  // Le film du module (source : films/compression-video-module-5/). Chapitres : [seconde, titre].
  film: {
    src: "films/module-5.mp4",
    affiche: "films/module-5.jpg",
    duree: "2 min 26",
    chapitres: [[6.4, "Deux questions"], [15.4, "CBR : débit constant"], [30.4, "VBR : débit variable"], [48.4, "Une ou deux passes"], [60.4, "Le QP"], [72.4, "Le tampon"], [84.4, "Le profil"], [96.4, "Le niveau"], [114.4, "Lire « High@L4.1 »"], [126.4, "À retenir"]]
  },
  notions: {
    titre: "Répartir les bits et garantir la lecture",
    intro: "Le <b>contrôle de débit</b> ajuste la quantification image par image. Le <b>profil</b> et le <b>niveau</b> sont un contrat entre le codeur et le décodeur.",
    mots: [
      { t: "CBR (débit constant)", ic: "➖", q: "Que veut dire CBR ?", d: "<b>Constant Bit Rate</b> : le débit est le même à chaque instant (à la taille du tampon près). Le codeur ajuste la quantification : les plans <b>chargés</b> sont plus dégradés, les plans <b>simples</b> reçoivent trop de bits (on complète par du <b>bourrage</b>). Débit et taille de fichier parfaitement prévisibles." + figCBRVBR(), c: "Un salaire fixe : la même somme chaque mois, qu’on ait beaucoup ou peu de dépenses.", r: "Direct sur Internet, liaisons de contribution, satellite, caméras (XDCAM HD 50 Mbit/s, AVC-Intra 100)." },
      { t: "VBR (débit variable)", ic: "〰️", q: "Que veut dire VBR ?", d: "<b>Variable Bit Rate</b> : le débit suit la <b>complexité</b> des images, entre un débit <b>moyen</b> visé et un débit <b>maximal</b> (plafond). La qualité est plus régulière, et meilleure à taille de fichier égale. La taille exacte est un peu moins prévisible.", c: "Un budget vacances : on dépense plus les jours de visite, moins les jours de plage, pour la même somme au total.", r: "Blu-ray (moyenne ≈ 20 à 30, plafond 40 Mbit/s), fichiers, vidéo à la demande." },
      { t: "Codage en une ou deux passes", ic: "🔁", d: "En <b>une passe</b>, le codeur décide au fil de l’eau, sans connaître la suite : il réagit en retard aux plans difficiles. En <b>deux passes</b>, une première lecture mesure la complexité de toute la vidéo ; la seconde répartit les bits au mieux pour tenir la moyenne visée. Deux fois plus long, impossible en direct, mais meilleur." },
      { t: "Qualité constante (CRF, CQ)", ic: "🎯", d: "On fixe la <b>qualité</b> (un QP ou un facteur CRF) au lieu du débit : chaque plan reçoit les bits dont il a besoin, et le fichier fait la taille qu’il faut. Idéal pour l’archivage et les fichiers intermédiaires ; inadapté à un canal de débit fixe.", r: "x264 et x265 : CRF 18 ≈ visuellement sans perte · CRF 23 = valeur par défaut · CRF 28 = qualité web modeste." },
      { t: "QP (paramètre de quantification)", s: "QP", ic: "🎚️", d: "Le réglage qui fixe le <b>pas de quantification</b> en H.264 et en HEVC, de 0 à 51 (en 8 bits). <b>+6 QP = pas doublé</b>. Plus le QP est grand, moins il faut de bits, plus l’image se dégrade. Le <b>contrôle de débit</b> fait varier le QP pour tenir le débit visé.", r: "QP ≈ 18 à 22 : excellente qualité · 26 à 30 : correcte · au-delà de 36 : blocs visibles." },
      { t: "Tampon (VBV, HRD)", ic: "🛢️", d: "La mémoire d’entrée du décodeur, que le codeur <b>simule</b> (Video Buffering Verifier en MPEG-2, Hypothetical Reference Decoder en H.264). Les données arrivent à débit régulier, alors que les images ont des tailles très différentes (une I pèse bien plus qu’une B) : le tampon absorbe ces écarts. Le codeur garantit qu’il ne <b>déborde</b> jamais et ne se <b>vide</b> jamais.", c: "Un château d’eau : rempli à débit régulier, il fournit beaucoup d’eau d’un coup aux heures de pointe.", r: "Délai du tampon = taille ÷ débit : 4 Mbit à 8 Mbit/s = 0,5 s." },
      { t: "Multiplexage statistique", ic: "📡", d: "Dans un multiplex de diffusion (plusieurs chaînes dans un même canal), le <b>débit total</b> est constant, mais il est <b>réparti</b> à chaque instant entre les chaînes selon leur complexité : chaque chaîne est en VBR, le multiplex en CBR.", r: "Multiplex TNT DVB-T : ≈ 25 Mbit/s partagés entre plusieurs chaînes." },
      { t: "Profil", ic: "🧰", q: "Qu’est-ce qu’un profil (Baseline, Main, High…) ?", d: "Un <b>sous-ensemble d’outils</b> de la norme qu’un décodeur doit savoir utiliser : images B, CABAC, transformée 8 × 8, 10 bits, 4:2:2… Les profils sont <b>emboîtés</b> : un décodeur High sait lire un fichier Main." + figProfils(), c: "Les permis de conduire : chaque catégorie autorise des véhicules différents, et un permis plus complet couvre les plus simples.", r: "H.264 : Baseline (visio, vieux mobiles) · Main (TV SD) · High (Blu-ray, TNT HD, web) · High 10 · High 4:2:2 (XAVC, AVC-Intra)." },
      { t: "Niveau", ic: "📶", q: "Qu’est-ce qu’un niveau (3.1, 4.1, 5.1…) ?", d: "Les <b>limites de charge</b> du décodeur, indépendantes du profil : nombre de macroblocs (ou d’échantillons) par image et <b>par seconde</b>, <b>débit maximal</b>, taille du tampon. Il ne dit <b>rien</b> de la qualité : il garantit que le lecteur aura assez de puissance." + figNiveaux(), c: "Le poids maximal d’un camion : le permis dit quel véhicule, la limite dit combien il peut porter.", r: "1080p30 → niveau 4 ou 4.1 · 1080p60 → 4.2 · UHD 30p → 5.1 · UHD 60p → 5.2 (H.264)." },
      { t: "Tier (HEVC)", ic: "🪜", d: "HEVC ajoute, dans chaque niveau à partir du 4, deux <b>plafonds de débit</b> : le <b>Main tier</b> (diffusion, grand public) et le <b>High tier</b> (production, débits élevés).", r: "Niveau 5.1 : 40 Mbit/s en Main tier, 160 Mbit/s en High tier." },
      { t: "Profils HEVC", ic: "🌈", d: "<b>Main</b> : 4:2:0, 8 bits · <b>Main 10</b> : 4:2:0, 10 bits (UHD Blu-ray, HDR10, streaming 4K) · extensions de format (RExt) : <b>Main 4:2:2 10</b>, <b>Main 4:4:4</b>… pour la production. Contrairement à H.264, tous utilisent le CABAC et les images B." },
      { t: "Notation profil@niveau", ic: "🏷️", q: "Comment lire « High@L4.1 » ?", d: "MediaInfo et les logiciels écrivent <b>profil@niveau</b> : « High@L4.1 » = profil High, niveau 4.1 ; en HEVC « Main 10@L5.1@Main » = profil Main 10, niveau 5.1, Main tier. Un lecteur peut lire le fichier si son profil <b>contient</b> celui du fichier et si son niveau est <b>au moins</b> égal." }
    ],
    formules: [
      { q: "Quelle taille fait un fichier en VBR ?", f: "V = D<sub>moyen</sub> × t ÷ 8", say: "Le volume est égal au débit moyen multiplié par la durée, divisé par huit", rows: [["D<sub>moyen</sub>", "débit moyen", "bit/s", "pas le débit maximal !"], ["t", "durée", "s", ""]], ex: "Film de 2 h en VBR, moyenne 20 Mbit/s, plafond 40 : V = 20 × 7 200 ÷ 8 = 18 000 Mo = <b>18 Go</b>." },
      { q: "Comment vérifier la charge d’un niveau H.264 ?", f: "MB/s = ⌈l ÷ 16⌉ × ⌈h ÷ 16⌉ × f", say: "Les macroblocs par seconde sont égaux au nombre de macroblocs par image multiplié par la cadence", rows: [["MB/s", "macroblocs par seconde", "1/s", "à comparer à la table des niveaux"], ["f", "cadence", "i/s", "images par seconde"]], ex: "1080p50 : 8 160 × 50 = 408 000 MB/s. Niveau 4.1 : 245 760 max (trop peu) ; niveau 4.2 : 522 240 → <b>niveau 4.2</b>." },
      { q: "Combien de temps le tampon peut-il absorber ?", f: "t<sub>tampon</sub> = B ÷ D", say: "Le délai du tampon est égal à sa taille divisée par le débit", rows: [["B", "taille du tampon", "bits", "Mbit"], ["D", "débit", "bit/s", ""]], ex: "Tampon de 2 Mbit à 8 Mbit/s : 2 ÷ 8 = <b>0,25 s</b>. Un grand tampon lisse mieux le débit mais ajoute du retard." },
      { q: "Comment le QP agit-il sur le pas de quantification ?", f: "Q<sub>pas</sub> ≈ 0,625 × 2<sup>QP/6</sup>", say: "Le pas de quantification est égal à zéro virgule six cent vingt-cinq fois deux puissance QP sur six", rows: [["QP", "paramètre de quantification", "0 à 51", "réglage du codeur"], ["Q<sub>pas</sub>", "pas de quantification", "—", "double tous les 6 QP"]], ex: "QP 22 → 28 : le pas est multiplié par 2<sup>6/6</sup> = <b>2</b>. QP 22 → 34 : × 4. Le débit baisse alors fortement (souvent de moitié environ pour +6)." },
      { q: "Quel débit maximal selon le profil ?", f: "D<sub>max</sub>(High) = 1,25 × D<sub>max</sub>(Main)", say: "Le débit maximal en High est égal à un virgule vingt-cinq fois celui du Main, pour un même niveau", rows: [["1,25", "facteur High", "—", "High 10 : × 3 · High 4:2:2 et 4:4:4 : × 4"]], ex: "Niveau 4.1 : 50 Mbit/s en Main, 50 × 1,25 = <b>62,5 Mbit/s</b> en High." }
    ]
  },
  manipuler: {
    titre: "Débit et compatibilité",
    intro: "Deux labos : coder une même séquence en <b>CBR</b>, en <b>VBR</b> (une ou deux passes) et à <b>qualité constante</b>, puis trouver le <b>profil</b> et le <b>niveau</b> minimaux d’un fichier H.264 ou HEVC."
  },
  essentiel: {
    definitions: [
      "<b>CBR</b> : débit constant, qualité variable (plans chargés dégradés, bourrage dans les plans simples). Direct, canaux fixes.",
      "<b>VBR</b> : débit qui suit la complexité, entre une moyenne et un plafond ; qualité régulière. Fichiers, Blu-ray, VOD. <b>2 passes</b> : meilleure répartition, pas en direct.",
      "<b>Qualité constante</b> (CRF, QP fixe) : taille du fichier imprévisible.",
      "<b>QP</b> : règle le pas de quantification ; +6 QP = pas × 2.",
      "<b>Profil</b> : la boîte à outils (Baseline ⊂ Main ⊂ High ⊂ High 10 ⊂ High 4:2:2 ⊂ High 4:4:4). <b>Niveau</b> : la charge maximale (pixels par seconde, débit). <b>Tier</b> (HEVC) : Main ou High, deux plafonds de débit.",
      "« <b>High@L4.1</b> » = profil High, niveau 4.1."
    ],
    formules: [["V = D<sub>moyen</sub> × t ÷ 8", "en VBR, c’est la moyenne qui compte"], ["MB/s = ⌈l/16⌉ × ⌈h/16⌉ × f", "à comparer à la table des niveaux"], ["t<sub>tampon</sub> = B ÷ D", "délai du tampon"], ["Q<sub>pas</sub> ≈ 0,625 × 2<sup>QP/6</sup>", "+6 QP → pas × 2"], ["D<sub>max</sub>(High) = 1,25 × D<sub>max</sub>(Main)", "même niveau"]],
    reperes: ["H.264 : 1080p30 → L4 / L4.1 · 1080p60 → L4.2 · UHD 30p → L5.1 · UHD 60p → L5.2.", "L4.1 : 50 Mbit/s (Main), 62,5 Mbit/s (High) · L5.1 : 240 Mbit/s (Main), 300 (High).", "Blu-ray : H.264 High@L4.1, VBR, au plus 40 Mbit/s · UHD Blu-ray et HDR10 : HEVC Main 10.", "XAVC Intra : H.264 High 4:2:2 Intra · CABAC : à partir du profil Main."],
    pieges: ["En CBR, ce n’est pas la <b>qualité</b> qui est constante, c’est le <b>débit</b>.", "Le niveau ne règle pas la qualité : il fixe une <b>limite de charge</b>.", "Un décodeur Main ne lit pas un fichier High ; l’inverse est vrai.", "En VBR, la taille du fichier se calcule avec le débit <b>moyen</b>, pas le maximal.", "Le codage en 2 passes est impossible en <b>direct</b>."]
  },
  evaluation: {
    lire: [
      () => { const moy = C([12.5, 18.5, 24, 8.2]), max = C([30, 35, 40]); return { type: "nombre", question: "D’après cette fiche, quel est le débit <b>maximal</b> autorisé ?", figure: MI([["Format", "AVC"], ["Profil du format", "High@L4.1"], ["Mode débit", "Variable"], ["Débit", NB(moy, 1) + " Mb/s"], ["Débit maximal", max + " Mb/s", 1]]), reponse: max, unite: "Mbit/s", ecart: 0, explication: "Le mode est variable (VBR) : le débit moyen est de " + NB(moy, 1) + " Mb/s, avec un plafond (débit maximal) de " + max + " Mb/s.", indice: "En VBR, deux débits : la moyenne et le plafond." }; },
      () => { const P = C([["High", "4.1"], ["Main", "4.0"], ["High", "5.1"], ["Baseline", "3.1"], ["High 4:2:2 Intra", "4.2"]]); return { type: "qcm", question: "D’après cette fiche, quel est le <b>niveau</b> de ce fichier ?", figure: MI([["Format", "AVC"], ["Profil du format", P[0] + "@L" + P[1], 1], ["Largeur", "1 920 pixels"], ["Hauteur", "1 080 pixels"]]), bonne: P[1], mauvaises: ["1080", P[0], "AVC"].concat(P[1] === "4.1" ? ["4.2"] : ["4.1"]), explication: "« " + P[0] + "@L" + P[1] + " » se lit : profil " + P[0] + ", niveau " + P[1] + ".", indice: "Le niveau suit le « @L »." }; },
      () => { const L = C([["3.1", 14], ["4", 20], ["4.1", 50], ["5.1", 240]]); return { type: "nombre", question: "D’après ce tableau, quel est le débit maximal du niveau <b>" + L[0] + "</b> en profil <b>High</b> ?", figure: figNiveaux(), reponse: L[1] * 1.25, unite: "Mbit/s", ecart: 0.1, explication: "On lit " + NB(L[1] * 1.25, 1) + " Mbit/s dans la colonne High (= 1,25 × " + L[1] + " en Main).", indice: "Deux colonnes : Main et High." }; },
      () => { const cbr = C([true, false]); return { type: "qcm", question: "D’après cette fiche, quel mode de débit a été utilisé ?", figure: MI([["Format", "MPEG Video"], ["Profil du format", "4:2:2@High"], ["Mode débit", cbr ? "Constant" : "Variable", 1], ["Débit", cbr ? "50,0 Mb/s" : "35,0 Mb/s"]]), bonne: cbr ? "CBR, débit constant" : "VBR, débit variable", mauvaises: cbr ? ["VBR, débit variable", "Qualité constante (CRF)", "Sans compression"] : ["CBR, débit constant", "Sans compression", "Tout-intra"], explication: cbr ? "« Constant » = CBR : c’est le cas du XDCAM HD 422 à 50 Mbit/s." : "« Variable » = VBR : c’est le cas du XDCAM HD 35 Mbit/s.", indice: "Lisez la ligne « Mode débit »." }; }
    ],
    comprendre: [
      ["En CBR, la qualité de l’image reste constante.", false, "En CBR, c’est le <b>débit</b> qui est constant : la qualité baisse dans les plans chargés."],
      ["En VBR 2 passes, le codeur connaît la complexité de toute la vidéo avant de répartir les bits.", true, "La première passe mesure la complexité de chaque plan ; la seconde répartit les bits en conséquence."],
      ["Le niveau d’un fichier H.264 fixe sa qualité d’image.", false, "Le niveau fixe des <b>limites de charge</b> (pixels par seconde, débit maximal), pas la qualité."],
      ["Un lecteur compatible High@L4.1 peut lire un fichier Main@L4.0.", true, "Le profil High contient tous les outils du Main, et le niveau 4.1 dépasse le 4.0."],
      ["Un décodeur limité au profil Main peut lire un fichier High.", false, "Le fichier High peut utiliser la transformée 8 × 8, que le décodeur Main ne connaît pas."],
      ["Augmenter le QP de 6 double le pas de quantification.", true, "Q<sub>pas</sub> ≈ 0,625 × 2<sup>QP/6</sup> : +6 QP multiplie le pas par 2."],
      ["Le codage en deux passes convient à une émission en direct.", false, "Il faut avoir toute la vidéo pour la première passe : impossible en direct."],
      ["En CBR, le codeur ajoute des bits de bourrage quand l’image est très simple.", true, "Pour garder exactement le débit, il complète avec des bits inutiles."]
    ],
    qcm: [
      ["Quel mode de débit choisir pour un direct sur une liaison de débit fixe ?", "CBR", ["VBR 2 passes", "Qualité constante (CRF)", "Sans perte"], "Le canal impose un débit fixe et le direct interdit les deux passes."],
      ["Quel mode de débit pour un Blu-ray ?", "VBR 2 passes, avec un débit maximal", ["CBR sans tampon", "Qualité constante sans limite", "Sans compression"], "Le disque a une capacité fixe : on vise une moyenne, avec un plafond que le lecteur supporte."],
      ["Quel profil H.264 faut-il pour du 10 bits en 4:2:2 ?", "High 4:2:2", ["Main", "High", "Baseline"], "High s’arrête au 4:2:0 8 bits, High 10 au 4:2:0 10 bits ; le 4:2:2 demande High 4:2:2 (XAVC, AVC-Intra)."],
      ["Quel profil HEVC utilise l’UHD HDR10 ?", "Main 10", ["Main", "Main 4:4:4", "High"], "Le HDR10 demande 10 bits en 4:2:0 : profil Main 10."],
      ["Qu’est-ce qu’un profil ?", "L’ensemble des outils de compression autorisés", ["La définition maximale de l’image", "Le débit moyen du fichier", "Le réglage de qualité"], "Le profil liste les outils (B, CABAC, 8 × 8, 10 bits…) que le décodeur doit connaître."],
      ["Que règle-t-on en codage « qualité constante » (CRF) ?", "La qualité visée, la taille du fichier en découle", ["Le débit exact du fichier", "Le niveau H.264", "La taille du tampon"], "On fixe un facteur de qualité ; le débit varie librement."],
      ["Qu’est-ce que le multiplexage statistique ?", "Répartir le débit d’un multiplex entre les chaînes selon leur complexité", ["Coder chaque chaîne en CBR indépendant", "Ajouter des statistiques dans le flux", "Coder en deux passes"], "Le total est constant, chaque chaîne reçoit ce dont elle a besoin à chaque instant."]
    ],
    calculer: [
      () => { const d = C([8, 12, 18, 20, 25]), m = C([90, 105, 120, 135]); return { type: "nombre", question: "Un film de <b>" + m + " min</b> est codé en VBR, débit moyen <b>" + d + " Mbit/s</b>, débit maximal 40 Mbit/s. Quel volume occupe la vidéo (Go) ?", reponse: d * m * 60 / 8000, unite: "Go", explication: "V = " + d + " × " + m * 60 + " ÷ 8 = " + NB(d * m * 60 / 8, 0) + " Mo ≈ " + NB(d * m * 60 / 8000, 2) + " Go. Le débit maximal n’intervient pas.", indice: "Utilisez le débit moyen." }; },
      () => { const F = C([[1280, 720], [1920, 1080], [3840, 2160]]), f = C([25, 30, 50, 60]); const r = MBS(F[0], F[1], f); return { type: "nombre", question: "Combien de macroblocs par seconde doit traiter le décodeur pour du <b>" + F[0] + " × " + F[1] + "</b> à <b>" + f + " i/s</b> ?", reponse: r, unite: "MB/s", explication: "⌈" + F[0] + "/16⌉ × ⌈" + F[1] + "/16⌉ = " + NB(r / f, 0) + " macroblocs par image ; × " + f + " = " + NB(r, 0) + " MB/s.", indice: "Macroblocs par image × cadence." }; },
      () => { const B = C([1, 2, 4, 8]), d = C([4, 8, 10, 20]); return { type: "nombre", question: "Le tampon du décodeur fait <b>" + B + " Mbit</b> et le flux arrive à <b>" + d + " Mbit/s</b>. Quel est le délai du tampon ?", reponse: B / d, unite: "s", explication: "t = " + B + " ÷ " + d + " = " + NB(B / d, 3) + " s.", indice: "t = B ÷ D." }; },
      () => { const a = C([18, 20, 22, 24]), k = C([1, 2, 3]); return { type: "nombre", question: "On passe d’un QP de <b>" + a + "</b> à un QP de <b>" + (a + 6 * k) + "</b>. Par combien le pas de quantification est-il multiplié ?", reponse: Math.pow(2, k), unite: "", ecart: 0, explication: "+" + 6 * k + " QP = " + k + " × 6 : le pas est multiplié par 2<sup>" + k + "</sup> = " + Math.pow(2, k) + ".", indice: "Le pas double tous les 6 QP." }; },
      () => { const L = C([["3", 10], ["3.1", 14], ["4", 20], ["4.1", 50], ["5.1", 240]]), p = C([["High", 1.25], ["High 10", 3], ["High 4:2:2", 4]]); return { type: "nombre", question: "Le niveau H.264 <b>" + L[0] + "</b> autorise <b>" + L[1] + " Mbit/s</b> en profil Main. Quel débit maximal en profil <b>" + p[0] + "</b> (facteur " + NB(p[1], 2) + ") ?", reponse: L[1] * p[1], unite: "Mbit/s", explication: L[1] + " × " + NB(p[1], 2) + " = " + NB(L[1] * p[1], 1) + " Mbit/s.", indice: "Multipliez par le facteur du profil." }; },
      () => { const d = C([8, 10, 15]), b = C([3, 4, 5, 6]); return { type: "nombre", question: "Un flux est codé en CBR à <b>" + d + " Mbit/s</b>. Pendant un plan fixe très simple, l’image n’a besoin que de <b>" + b + " Mbit/s</b>. Quelle part du débit est du bourrage (%) ?", reponse: (d - b) / d * 100, unite: "%", ecart: 0.5, explication: "Bourrage = " + d + " − " + b + " = " + (d - b) + " Mbit/s, soit " + (d - b) + " ÷ " + d + " = " + NB((d - b) / d * 100, 1) + " % du débit.", indice: "Bits inutiles ÷ bits envoyés." }; }
    ],
    exercice: [
      () => { const m = C([100, 110, 120]), d = C([18, 22, 26]); const V = d * m * 60 / 8000; return { type: "exercice", question: "Un film de <b>" + m + " min</b> doit tenir sur un Blu-ray de <b>25 Go</b>. La vidéo est codée en H.264 High@L4.1, VBR 2 passes, moyenne <b>" + d + " Mbit/s</b>, plafond 40 Mbit/s.", etapes: [
        { question: "Volume de la vidéo (Go) ?", reponse: V, unite: "Go" },
        { question: "Tient-elle sur le disque (sans compter l’audio) ?", bonne: V <= 25 ? "Oui" : "Non", mauvaises: [V <= 25 ? "Non" : "Oui"] },
        { question: "Débit moyen maximal pour remplir exactement 25 Go (Mbit/s) ?", reponse: 25 * 8000 / (m * 60), unite: "Mbit/s" }
      ], solution: "a) " + d + " × " + m * 60 + " ÷ 8 = " + NB(V * 1000, 0) + " Mo ≈ " + NB(V, 2) + " Go. b) " + (V <= 25 ? "Oui" : "Non") + ". c) 25 × 8 000 ÷ " + m * 60 + " ≈ " + NB(25 * 8000 / (m * 60), 2) + " Mbit/s de moyenne au maximum.", indice: "En VBR, la taille dépend du débit moyen." }; },
      () => { const f = C([50, 60]); const mb = 8160, r = mb * f; return { type: "exercice", question: "On veut coder en H.264 une vidéo <b>1920 × 1080</b> à <b>" + f + " i/s</b>.", etapes: [
        { question: "Macroblocs par image ?", reponse: mb, unite: "MB", ecart: 0 },
        { question: "Macroblocs par seconde ?", reponse: r, unite: "MB/s" },
        { question: "Niveau minimal (niveau 4.1 : 245 760 MB/s max · 4.2 : 522 240 MB/s max) ?", bonne: "4.2", mauvaises: ["4.1", "4", "3.1"] }
      ], solution: "a) 120 × 68 = 8 160 (1080 est arrondi à 1088). b) 8 160 × " + f + " = " + NB(r, 0) + " MB/s. c) " + NB(r, 0) + " > 245 760 : le niveau 4.1 ne suffit pas ; " + NB(r, 0) + " ≤ 522 240 → niveau 4.2.", indice: "1080 ÷ 16 = 67,5 : on arrondit à 68." }; }
    ]
  }
};

/* ==========================================================================
   MODULE 6 — CODECS ET CONTENEURS
   ========================================================================== */
const MODULE_6 = {
  titre: "Codecs et conteneurs : ce qu’il y a dans le fichier",
  nav: "Codecs et conteneurs",
  resume: "MOV, MP4, MXF, ProRes, H.264",
  intro: "Un fichier vidéo est une <b>enveloppe</b> (le conteneur : .mov, .mp4, .mxf…) qui range des <b>pistes</b> compressées chacune par un <b>codec</b> (ProRes, H.264, AAC…). Choisir le bon couple codec + conteneur à chaque étape (tournage, montage, diffusion) évite les fichiers illisibles, les disques pleins et les pertes de qualité.",
  // Le film du module (source : films/compression-video-module-6/). Chapitres : [seconde, titre].
  film: {
    src: "films/module-6.mp4",
    affiche: "films/module-6.jpg",
    duree: "2 min 20",
    chapitres: [[6.4, "Codec et conteneur"], [18.4, "Pistes et multiplexage"], [30.4, "L’extension et le rewrap"], [42.4, "Lire une fiche MediaInfo"], [51.4, "Cinq conteneurs"], [63.4, "Trois familles de codecs"], [78.4, "Les débits à connaître"], [90.4, "Proxy et générations"], [105.4, "Le débit du fichier"], [120.4, "À retenir"]]
  },
  notions: {
    titre: "L’enveloppe et la langue",
    intro: "L’<b>extension</b> du fichier désigne le conteneur, presque jamais le codec. Pour savoir ce qu’il y a dedans, on ouvre le fichier dans <b>MediaInfo</b>.",
    mots: [
      { t: "Codec et conteneur", ic: "📦", q: "Quelle différence entre un codec et un conteneur ?", d: "Le <b>codec</b> compresse une piste (vidéo : ProRes, H.264… ; audio : PCM, AAC…). Le <b>conteneur</b> est le format du fichier : il <b>range</b> les pistes, leur synchronisation, un <b>index</b> et les métadonnées. Un même codec peut voyager dans plusieurs conteneurs, et un conteneur peut accueillir plusieurs codecs." + figConteneur(), c: "Une lettre (le codec : la langue dans laquelle elle est écrite) glissée dans une enveloppe (le conteneur) avec d’autres lettres." },
      { t: "Piste et multiplexage", ic: "🎚️", d: "Chaque flux (vidéo, chaque voie ou paire audio, sous-titres, timecode) est une <b>piste</b>. Le conteneur découpe les pistes en morceaux et les <b>entrelace</b> (multiplexage) pour que l’image et le son d’un même instant soient proches dans le fichier ; des <b>horodatages</b> assurent la synchronisation. Au lecteur, le <b>démultiplexeur</b> sépare les pistes et les confie aux décodeurs.", r: "Un PAD broadcast compte souvent 8 pistes audio PCM (stéréo, version internationale, audiodescription…)." },
      { t: "Extension de fichier", ic: "🏷️", d: "Les lettres après le point (.mov, .mp4, .mxf, .mkv) indiquent le <b>conteneur</b>. Renommer un fichier ne change rien à son contenu. Changer de conteneur <b>sans réencoder</b> (<b>rewrap</b>, ou remux) est rapide et <b>sans perte</b>." },
      { t: "Métadonnées et timecode", ic: "🕒", d: "Les <b>métadonnées</b> décrivent le contenu : date, caméra, objectif, réglages, espace colorimétrique (BT.709, BT.2020, HDR PQ ou HLG). Le <b>timecode</b> (HH:MM:SS:II) repère chaque image : il sert à synchroniser image et son, et à reconformer un montage sur les rushes originaux." },
      { t: "MOV (QuickTime)", ic: "🍏", d: "Conteneur d’Apple, le plus courant en tournage et en postproduction : c’est l’enveloppe naturelle du <b>ProRes</b>, mais il accepte aussi H.264, HEVC, DNxHR, PCM, AAC… Plusieurs pistes, timecode. Il a servi de base au MP4.", r: "Extension .mov." },
      { t: "MP4", ic: "📱", d: "MPEG-4 Part 14, dérivé du MOV et normalisé par l’ISO. Le conteneur de la <b>diffusion web</b>, des téléphones et des plateformes : H.264, HEVC ou AV1 pour la vidéo, AAC pour le son. L’option « <b>faststart</b> » place l’index au début du fichier : la lecture en ligne démarre sans tout télécharger.", r: "Extension .mp4 (.m4v, .m4a pour l’audio seul)." },
      { t: "MXF", ic: "📺", d: "<b>Material eXchange Format</b> (normes SMPTE) : le conteneur du <b>broadcast</b>. Caméras XDCAM, XAVC, AVC-Intra ; Avid (DNxHD, une piste par fichier, variante OP-Atom) ; fichiers PAD (prêts à diffuser) livrés aux chaînes ; et le <b>DCP</b> du cinéma (JPEG 2000). Métadonnées très riches.", r: "Variante courante : OP1a (toutes les pistes dans un seul fichier)." },
      { t: "MKV et WebM", ic: "🪆", d: "<b>Matroska</b> (.mkv) : conteneur libre, très souple (nombreuses pistes audio et sous-titres, chapitres), courant pour l’archivage et la vidéo grand public. <b>WebM</b> en est un sous-ensemble pour le web (VP9 ou AV1, son Opus)." },
      { t: "MPEG-TS (flux de transport)", ic: "🛰️", d: "Conteneur conçu pour la <b>diffusion</b> (TNT, satellite, IPTV) : le flux est découpé en petits paquets de <b>188 octets</b>, avec de quoi résister aux erreurs et commencer la lecture à n’importe quel moment. Le <b>M2TS</b> (Blu-ray, AVCHD) en est une variante.", r: "Extensions .ts, .m2ts, .mts." },
      { t: "Codecs de tournage", ic: "🎥", d: "Ceux qu’enregistrent les caméras : <b>XAVC</b> (Sony, H.264, en intra XAVC-I ou en GOP long XAVC-L), <b>AVC-Intra</b> (Panasonic), <b>XDCAM HD</b> (MPEG-2), <b>ProRes</b> (ARRI, Blackmagic, enregistreurs externes), et les formats <b>RAW</b>.", r: "XDCAM HD 422 : 50 Mbit/s CBR, MPEG-2 4:2:2 8 bits · AVC-Intra 100 : 100 Mbit/s, 4:2:2 10 bits." },
      { t: "Codecs de montage (intermédiaires)", ic: "✂️", q: "Pourquoi monte-t-on en ProRes ou en DNxHR ?", d: "Codecs <b>intra</b>, 10 bits, peu compressés, conçus pour être <b>légers à décoder</b> et pour supporter plusieurs réencodages : <b>ProRes</b> (Apple) et <b>DNxHD / DNxHR</b> (Avid). Chaque image est indépendante : la lecture image par image, à l’envers ou en accéléré reste fluide.", r: "ProRes en 1080 25p : Proxy 38 · LT 85 · 422 122 · 422 HQ 184 · 4444 275 · 4444 XQ 413 Mbit/s. DNxHD 1080 25p : 36, 120, 185 (et 185x en 10 bits)." },
      { t: "Codecs de diffusion", ic: "🌍", d: "<b>H.264</b>, <b>HEVC</b>, <b>AV1</b>, bientôt <b>VVC</b> : GOP long, très efficaces, mais lourds à monter (chaque image dépend des autres). On les utilise pour la <b>livraison</b> : web, TNT, Blu-ray, plateformes.", r: "Web HD : 5 à 10 Mbit/s en H.264 · UHD en streaming : 15 à 25 Mbit/s en HEVC ou AV1." },
      { t: "Proxy", ic: "🪶", d: "Une copie <b>légère</b> des rushes (ProRes Proxy, DNxHR LB, H.264) pour monter sur une machine modeste ou à distance. À l’export, le logiciel se <b>reconnecte</b> aux fichiers originaux, grâce au nom et au timecode.", c: "Monter avec des photocopies, puis imprimer avec les originaux." },
      { t: "RAW", ic: "🧪", d: "Les données du <b>capteur</b>, avant dématriçage : ce n’est pas une vidéo Y′CbCr. Balance des blancs et sensibilité restent réglables après le tournage. Souvent compressé (Blackmagic RAW, ProRes RAW, REDCODE), parfois non (ARRIRAW)." },
      { t: "Transcodage et pertes de génération", ic: "🔁", d: "<b>Transcoder</b>, c’est décoder puis réencoder dans un autre codec (ou le même). Avec un codec avec perte, chaque passage (chaque <b>génération</b>) ajoute des défauts, surtout après un traitement (recadrage, étalonnage) ou entre codecs différents. On limite les allers-retours, on travaille en intra 10 bits, et on ne compresse fortement qu’à la <b>livraison</b>." }
    ],
    formules: [
      { q: "Quel est le débit d’une piste audio PCM ?", f: "D<sub>audio</sub> = f<sub>e</sub> × q × n", say: "Le débit audio est égal à la fréquence d’échantillonnage, fois la quantification, fois le nombre de voies", rows: [["f<sub>e</sub>", "fréquence d’échantillonnage", "Hz", "48 000 Hz en vidéo"], ["q", "quantification", "bits", "16 ou 24 bits"], ["n", "nombre de voies", "—", "2 en stéréo, 8 sur un PAD…"]], ex: "Stéréo 48 kHz 24 bits : 48 000 × 24 × 2 = 2 304 000 bit/s ≈ <b>2,3 Mbit/s</b>. Huit voies : ≈ 9,2 Mbit/s." },
      { q: "Quel est le débit total d’un fichier ?", f: "D<sub>total</sub> = D<sub>vidéo</sub> + D<sub>audio</sub>", say: "Le débit total est égal au débit vidéo plus le débit audio", rows: [["D<sub>vidéo</sub>", "débit de la piste vidéo", "Mbit/s", ""], ["D<sub>audio</sub>", "somme des pistes audio", "Mbit/s", ""]], ex: "ProRes 422 HQ 184 Mbit/s + 4 voies PCM 24 bits (4,6 Mbit/s) ≈ <b>188,6 Mbit/s</b> (le conteneur ajoute encore un peu)." },
      { q: "Combien de gigaoctets par heure ?", f: "Go/h = D (Mbit/s) × 0,45", say: "Les gigaoctets par heure sont égaux au débit en mégabits par seconde multiplié par zéro virgule quarante-cinq", rows: [["0,45", "3 600 ÷ 8 ÷ 1 000", "—", "secondes par heure, bits par octet, Mo par Go"]], ex: "ProRes 422 HQ à 184 Mbit/s : 184 × 0,45 ≈ <b>83 Go par heure</b>. H.264 web à 8 Mbit/s : 3,6 Go/h." }
    ]
  },
  manipuler: {
    titre: "Ouvrir les fichiers, choisir les codecs",
    intro: "Deux labos : ouvrir un <b>conteneur</b> et suivre ses pistes jusqu’aux décodeurs, puis comparer les <b>codecs</b> de la chaîne de production (débit, place, et qualité après plusieurs <b>réencodages</b>)."
  },
  essentiel: {
    definitions: [
      "<b>Codec</b> : compresse une piste (ProRes, H.264, AAC…). <b>Conteneur</b> : range les pistes, l’index et les métadonnées (MOV, MP4, MXF, MKV, TS).",
      "L’<b>extension</b> désigne le conteneur. <b>Rewrap</b> : changer de conteneur sans réencoder, sans perte.",
      "<b>MOV</b> : postproduction, ProRes · <b>MP4</b> : web, H.264/HEVC + AAC · <b>MXF</b> : broadcast, Avid, DCP · <b>TS</b> : diffusion · <b>MKV</b> : libre, souple.",
      "<b>Tournage</b> : XAVC, AVC-Intra, XDCAM, ProRes, RAW · <b>montage</b> : ProRes, DNxHR (intra 10 bits) · <b>diffusion</b> : H.264, HEVC, AV1 (GOP long).",
      "<b>Proxy</b> : copie légère pour monter, reconnectée aux originaux à l’export.",
      "<b>Pertes de génération</b> : chaque réencodage avec perte ajoute des défauts."
    ],
    formules: [["D<sub>audio</sub> = f<sub>e</sub> × q × n", "PCM stéréo 48 kHz 24 bits ≈ 2,3 Mbit/s"], ["D<sub>total</sub> = D<sub>vidéo</sub> + D<sub>audio</sub>", ""], ["Go/h = Mbit/s × 0,45", "184 Mbit/s → 83 Go/h"]],
    reperes: ["ProRes 1080 25p : Proxy 38 · LT 85 · 422 122 · HQ 184 · 4444 275 · XQ 413 Mbit/s ; UHD ≈ × 4.", "DNxHD 1080 25p : 36 · 120 · 185 Mbit/s.", "XDCAM HD 422 : MPEG-2, 50 Mbit/s, MXF · AVC-Intra 100 : 100 Mbit/s, MXF.", "DCP : JPEG 2000 dans du MXF, au plus 250 Mbit/s."],
    pieges: ["Renommer « .mov » en « .mp4 » ne change <b>pas</b> le codec (et peut rendre le fichier illisible).", "« H.264 » n’est pas un conteneur, « MP4 » n’est pas un codec.", "ProRes et DNxHR sont des codecs <b>intra</b>, pas des codecs GOP long.", "Monter directement du H.264 GOP long d’un téléphone peut saccader : transcoder en ProRes ou créer des proxys.", "Chaque export intermédiaire en H.264 ajoute une génération de pertes."]
  },
  evaluation: {
    lire: [
      () => { const k = C([["QuickTime", ".mov"], ["MPEG-4", ".mp4"], ["MXF", ".mxf"], ["Matroska", ".mkv"]]); return { type: "qcm", question: "D’après cette fiche, quel est le <b>conteneur</b> du fichier ?", figure: MI([["Général — Format", k[0], 1], ["Vidéo — Format", "AVC"], ["Vidéo — Profil", "High@L4.1"], ["Audio — Format", "AAC LC"]]), bonne: k[0] + " (" + k[1] + ")", mauvaises: ["AVC (H.264)", "AAC LC", "High@L4.1"], explication: "La ligne « Général — Format » décrit le conteneur : " + k[0] + ". AVC est le codec vidéo, AAC le codec audio.", indice: "Le conteneur est décrit dans la partie « Général »." }; },
      () => { const n = C([2, 4, 8]); const L = [["Général — Format", "MXF (OP1a)"], ["Vidéo — Format", "AVC Intra 100"]]; for (let i = 1; i <= Math.min(n, 4); i++) L.push(["Audio #" + i + " — Format", "PCM, 48 kHz, 24 bits"]); if (n > 4) L.push(["…", "(" + (n - 4) + " autres pistes PCM identiques)"]); return { type: "nombre", question: "Combien de pistes audio contient ce fichier ?", figure: MI(L), reponse: n, unite: "pistes", ecart: 0, explication: "On compte " + n + " pistes audio PCM. C’est courant pour un PAD broadcast.", indice: "N’oubliez pas la ligne « autres pistes » s’il y en a une." }; },
      () => { const c = C([["ProRes", "422 HQ", "ProRes 422 HQ"], ["AVC", "High@L4.1", "H.264"], ["HEVC", "Main 10@L5.1@Main", "HEVC (H.265)"], ["DNxHD", "DNxHR HQX", "DNxHR"]]); return { type: "qcm", question: "D’après cette fiche, quel est le <b>codec vidéo</b> ?", figure: MI([["Général — Format", "QuickTime"], ["Vidéo — Format", c[0], 1], ["Vidéo — Profil", c[1]], ["Audio — Format", "PCM"]]), bonne: c[2], mauvaises: ["QuickTime", "PCM"].concat([["ProRes 422 HQ", "H.264", "HEVC (H.265)", "DNxHR"].filter(x => x !== c[2])[0]]), explication: "La ligne « Vidéo — Format » donne le codec : " + c[0] + " (profil " + c[1] + "). QuickTime est le conteneur, PCM le codec audio.", indice: "Cherchez la partie « Vidéo »." }; },
      () => { const d = C([38, 85, 122, 184, 275, 413]), nom = { 38: "Proxy", 85: "LT", 122: "422", 184: "422 HQ", 275: "4444", 413: "4444 XQ" }; return { type: "nombre", contexte: "Débits ProRes en 1920 × 1080 à 25 i/s (Apple) : Proxy 38 · LT 85 · 422 122 · 422 HQ 184 · 4444 275 · 4444 XQ 413 Mbit/s.", question: "Quel est le débit du ProRes <b>" + nom[d] + "</b> ?", reponse: d, unite: "Mbit/s", ecart: 0, explication: "On lit " + d + " Mbit/s pour le ProRes " + nom[d] + ".", indice: "Repérez le nom exact du profil." }; }
    ],
    comprendre: [
      ["Changer l’extension .mov en .mp4 change le codec de la vidéo.", false, "L’extension ne désigne que le conteneur, et la renommer ne réencode rien."],
      ["Une même vidéo H.264 peut être rangée dans un MOV, un MP4, un MXF ou un MKV.", true, "Le codec est indépendant du conteneur : H.264 est accepté par tous ces conteneurs."],
      ["Changer de conteneur sans réencoder (rewrap) n’entraîne aucune perte.", true, "Les données compressées sont recopiées telles quelles dans la nouvelle enveloppe."],
      ["ProRes est un codec à GOP long.", false, "ProRes est un codec <b>intra</b> : chaque image est compressée seule."],
      ["Chaque transcodage avec perte peut dégrader un peu plus l’image.", true, "Ce sont les pertes de génération, d’autant plus fortes que le codec est compressé et qu’un traitement a eu lieu entre deux passages."],
      ["MXF est un conteneur très utilisé en broadcast.", true, "XDCAM, XAVC, AVC-Intra, Avid, PAD et DCP utilisent le MXF."],
      ["AAC est un conteneur audio.", false, "AAC est un <b>codec</b> audio (compression avec perte), rangé par exemple dans un MP4."],
      ["Un proxy sert à exporter le film final en meilleure qualité.", false, "Le proxy est une copie légère pour monter ; l’export se fait à partir des originaux."]
    ],
    qcm: [
      ["Lequel de ces noms désigne un conteneur ?", "MXF", ["ProRes", "H.264", "AAC"], "MXF est une enveloppe ; ProRes et H.264 sont des codecs vidéo, AAC un codec audio."],
      ["Lequel de ces noms désigne un codec vidéo ?", "DNxHR", ["MOV", "MP4", "MKV"], "DNxHR (Avid) est un codec ; MOV, MP4 et MKV sont des conteneurs."],
      ["Quel couple choisir pour monter confortablement ?", "ProRes 422 dans un MOV", ["H.264 GOP long dans un MP4", "HEVC dans un TS", "AV1 dans un WebM"], "Un codec intra 10 bits, léger à décoder, dans le conteneur de postproduction."],
      ["Quel couple pour livrer une vidéo sur le web ?", "H.264 + AAC dans un MP4", ["ProRes 4444 dans un MOV", "PCM dans un MXF", "JPEG 2000 dans un MXF"], "H.264 dans un MP4 est lu partout, à faible débit."],
      ["Quel est le format d’un DCP ?", "JPEG 2000 dans du MXF", ["H.264 dans du MP4", "ProRes dans du MOV", "MPEG-2 dans du TS"], "Le DCP range des images JPEG 2000 et un son PCM dans des fichiers MXF."],
      ["À quoi sert la piste de timecode ?", "À repérer chaque image pour synchroniser et reconformer", ["À compresser le son", "À stocker les sous-titres", "À régler le débit"], "Le timecode donne une adresse unique (HH:MM:SS:II) à chaque image."],
      ["Quel conteneur est conçu pour la diffusion TNT ?", "MPEG-TS", ["MOV", "MXF OP-Atom", "MKV"], "Le flux de transport résiste aux erreurs et permet de prendre la lecture en cours."],
      ["Pourquoi crée-t-on des proxys ?", "Pour monter sur une machine modeste avec des fichiers légers", ["Pour améliorer la qualité finale", "Pour remplacer définitivement les rushes", "Pour ajouter du timecode"], "On monte avec les proxys, on exporte avec les originaux."]
    ],
    calculer: [
      () => { const q = C([16, 24]), n = C([2, 4, 8]); const d = 48000 * q * n / 1e6; return { type: "nombre", question: "Quel est le débit de <b>" + n + " voies</b> audio PCM à <b>48 kHz</b> et <b>" + q + " bits</b> ?", reponse: d, unite: "Mbit/s", explication: "48 000 × " + q + " × " + n + " = " + NB(d * 1e6, 0) + " bit/s ≈ " + NB(d, 3) + " Mbit/s.", indice: "f<sub>e</sub> × q × n." }; },
      () => { const v = C([122, 184, 50, 100]), n = C([2, 4, 8]); const a = 48000 * 24 * n / 1e6; return { type: "nombre", question: "Un fichier contient une vidéo à <b>" + v + " Mbit/s</b> et <b>" + n + " voies</b> PCM 48 kHz 24 bits. Quel est son débit total ?", reponse: v + a, unite: "Mbit/s", explication: "Audio : 48 000 × 24 × " + n + " ≈ " + NB(a, 2) + " Mbit/s. Total : " + v + " + " + NB(a, 2) + " ≈ " + NB(v + a, 2) + " Mbit/s.", indice: "Calculez d’abord le débit audio." }; },
      () => { const d = C([38, 85, 122, 184, 275, 413]); return { type: "nombre", question: "Combien de Go occupe une heure de ProRes à <b>" + d + " Mbit/s</b> ?", reponse: d * 0.45, unite: "Go", explication: d + " × 3 600 ÷ 8 ÷ 1 000 = " + d + " × 0,45 ≈ " + NB(d * 0.45, 1) + " Go.", indice: "Go/h = Mbit/s × 0,45." }; },
      () => { const T = C([1, 2, 4]), d = C([122, 184, 275]); const h = T * 1000 / (d * 0.45); return { type: "nombre", question: "Combien d’<b>heures</b> de ProRes à <b>" + d + " Mbit/s</b> tiennent sur un disque de <b>" + T + " To</b> (1 To = 1 000 Go) ?", reponse: h, unite: "h", explication: "Une heure = " + NB(d * 0.45, 1) + " Go. " + T * 1000 + " ÷ " + NB(d * 0.45, 1) + " ≈ " + NB(h, 1) + " h.", indice: "Calculez d’abord les Go par heure." }; },
      () => { const o = C([[184, 38], [122, 38], [185, 36], [275, 85]]); return { type: "nombre", question: "Les rushes sont en <b>" + o[0] + " Mbit/s</b>, les proxys en <b>" + o[1] + " Mbit/s</b>. Combien de fois les proxys sont-ils plus légers ?", reponse: o[0] / o[1], unite: "fois", explication: o[0] + " ÷ " + o[1] + " ≈ " + NB(o[0] / o[1], 1) + " fois plus légers.", indice: "Divisez les deux débits." }; }
    ],
    exercice: [
      () => { const v = C([122, 184]), h = C([2, 3, 4]); const a = 48000 * 24 * 4 / 1e6; return { type: "exercice", question: "Tournage en <b>ProRes " + (v === 184 ? "422 HQ" : "422") + "</b> 1080 25p (" + v + " Mbit/s) avec <b>4 voies</b> audio PCM 48 kHz 24 bits, dans un conteneur MOV. On tourne <b>" + h + " h</b> de rushes.", etapes: [
        { question: "Débit audio (Mbit/s) ?", reponse: a, unite: "Mbit/s" },
        { question: "Débit total (Mbit/s) ?", reponse: v + a, unite: "Mbit/s" },
        { question: "Volume des rushes (Go) ?", reponse: (v + a) * 0.45 * h, unite: "Go" }
      ], solution: "a) 48 000 × 24 × 4 = 4 608 000 bit/s ≈ 4,61 Mbit/s. b) " + v + " + 4,61 ≈ " + NB(v + a, 2) + " Mbit/s. c) " + NB(v + a, 2) + " × 0,45 × " + h + " ≈ " + NB((v + a) * 0.45 * h, 0) + " Go.", indice: "Le débit total s’applique ensuite à la durée." }; },
      () => ({ type: "exercice", question: "Une monteuse reçoit des rushes de téléphone en <b>HEVC GOP long, 4:2:0 8 bits, dans un .mov</b>. Le montage saccade et le film sera livré à une chaîne en <b>XDCAM HD 422 dans un MXF</b>.", etapes: [
        { question: "Pourquoi le montage saccade-t-il ?", bonne: "Le HEVC en GOP long est lourd à décoder image par image", mauvaises: ["Le conteneur .mov est trop ancien", "Le son est en PCM", "Le fichier est en 4:4:4"] },
        { question: "Quelle solution adopter ?", bonne: "Transcoder en ProRes ou DNxHR, ou créer des proxys", mauvaises: ["Renommer les fichiers en .mp4", "Exporter en H.264 à chaque étape", "Passer les rushes en 8 voies audio"] },
        { question: "Que faut-il livrer à la chaîne ?", bonne: "Un MXF contenant du MPEG-2 4:2:2 à 50 Mbit/s", mauvaises: ["Un MP4 en H.264", "Un MOV en ProRes 4444", "Un MKV en AV1"] }
      ], solution: "a) En GOP long, chaque image dépend des autres : le processeur doit décoder plusieurs images pour en afficher une. b) Un codec intra (ProRes, DNxHR) ou des proxys rendent la lecture fluide ; l’export final se fait depuis les originaux. c) XDCAM HD 422 = MPEG-2 4:2:2 8 bits à 50 Mbit/s, dans un MXF.", indice: "Intra pour monter, codec imposé pour livrer." })
    ]
  }
};

/* ==========================================================================
   L'APPLICATION
   ========================================================================== */
const APPLICATION = {
  id: "tes-compression-video",   // IDENTIQUE à l'id de js/catalogue.js — ne plus le changer
  titre: "Compression vidéo",
  accroche: "Moins de bits, même image.",
  epreuve: "TES",
  intro: "Six modules pour comprendre comment on passe d’un gigabit par seconde à quelques mégabits : le <b>débit</b> et le <b>taux de compression</b>, la compression <b>JPEG</b> (DCT, quantification), la compression <b>MPEG</b> (images I, P, B, GOP), le codage entropique et le <b>CABAC</b>, le <b>CBR</b>, le <b>VBR</b>, les <b>profils</b> et les <b>niveaux</b>, et enfin les <b>codecs</b> et les <b>conteneurs</b>. Chaque module se termine par une évaluation : obtenez au moins <b>12/20</b> pour débloquer le suivant.",
  modules: [MODULE_1, MODULE_2, MODULE_3, MODULE_4, MODULE_5, MODULE_6]
};
