/* ==========================================================================
   contenu.js — le contenu de l'application « Éclairage »
   --------------------------------------------------------------------------
   Trois modules : les technologies LED, les gélatines de correction (CTO,
   CTB, Plus / Minus Green) et la courbe de Planck, les ombres et la taille
   de la source.
   Ce fichier ne contient que du texte et des schémas (SVG) ; la mise en page,
   l'évaluation et l'enregistrement sont faits par js/application.js.

   Valeurs des gélatines : celles du cours (et de l'application Photométrie) :
   Full = 134 mireds (5 600 K ↔ 3 200 K), ½ ≈ 70, ¼ ≈ 35, ⅛ ≈ 18.
   Les pertes de lumière et les références exactes varient selon les
   fabricants (LEE, Rosco) : ce sont des ordres de grandeur.

   CONTENU À VALIDER : relis et adapte au référentiel du BTS avant de le
   proposer aux étudiants.
   ========================================================================== */

const H = Application.hasard;     // H(1, 6) : un entier entre 1 et 6
const C = Application.choisir;    // C([a, b, c]) : un élément au hasard
const NB = Application.nombre;    // NB(1036.8, 1) : « 1 036,8 »
const MIR = T => 1e6 / T;         // kelvins → mireds

/* ==========================================================================
   SCHÉMAS (SVG) utilisés dans les notions et les questions
   ========================================================================== */
const SVG = (l, h, contenu, label) => '<svg class="qa-fig" viewBox="0 0 ' + l + " " + h + '" role="img" aria-label="' + (label || "Schéma") + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, Segoe UI, Inter, Roboto, sans-serif">' + contenu + "</svg>";
const TXT = (x, y, t, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" fill="' + (o.c || "#e5e5ea") + '" font-size="' + (o.s || 13) + '" font-weight="' + (o.w || 600) + '" text-anchor="' + (o.a || "middle") + '">' + t + "</text>"; };
const g3 = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };

// Dégradé arc-en-ciel de 380 à 780 nm (identifiant unique pour chaque schéma)
let numeroFig = 0;
function arcEnCiel(id) {
  const stops = [[0, "#4b0082"], [12.5, "#3a3aff"], [22.5, "#0080ff"], [30, "#00c8c0"], [37.5, "#30d040"], [47.5, "#e8e000"], [55, "#ff9000"], [65, "#ff2a00"], [80, "#a00000"], [100, "#300000"]];
  return '<linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0">' + stops.map(s => '<stop offset="' + s[0] + '%" stop-color="' + s[1] + '"/>').join("") + "</linearGradient>";
}
// Un spectre dessiné : f(λ) → valeur relative ; le maximum est ramené à 1
function figSpectre(f, titre, o) {
  o = o || {};
  const id = "aec" + (++numeroFig), L = [], x0 = 30, w = 460, y0 = 30, h = 130;
  for (let l = 380; l <= 780; l += 4) L.push([l, Math.max(0, f(l))]);
  const max = Math.max(...L.map(p => p[1])) || 1;
  const X = l => x0 + (l - 380) / 400 * w, Y = v => y0 + h - v / max * h;
  const ligne = L.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
  let s = "<defs>" + arcEnCiel(id) + "</defs>" + '<rect x="0" y="0" width="520" height="200" fill="#0b0c0e"/>';
  [400, 500, 600, 700].forEach(l => { s += '<line x1="' + X(l) + '" y1="' + y0 + '" x2="' + X(l) + '" y2="' + (y0 + h) + '" stroke="rgba(255,255,255,.12)"/>' + TXT(X(l), y0 + h + 16, l + " nm", { s: 11, w: 500, c: "#8e8e93" }); });
  s += '<path d="' + ligne + " L" + X(780) + " " + (y0 + h) + " L" + X(380) + " " + (y0 + h) + ' Z" fill="url(#' + id + ')" opacity=".9"/>';
  s += '<path d="' + ligne + '" fill="none" stroke="#fff" stroke-width="2"/>';
  if (titre) s += TXT(x0, 20, titre, { a: "start", s: 13 });
  // Étiquettes posées à droite du point repéré (jamais sur le titre)
  (o.notes || []).forEach(n => { s += TXT(X(n[0]) + 12, Math.max(Y(f(n[0])), 44) + 4, "← " + n[1], { s: 11, c: "#fff", a: "start" }); });
  return SVG(520, 200, s, "Spectre : " + (titre || "lumière"));
}
const SPECTRES = {
  phosphore: l => 0.9 * g3(l, 450, 9, 11) + 0.53 * g3(l, 558, 42, 62),
  hautIRC: l => 0.95 * g3(l, 451, 9, 11) + 0.6 * g3(l, 515, 30, 34) + 0.85 * g3(l, 600, 48, 55) + 0.4 * g3(l, 655, 25, 32),
  rvb: l => 0.6 * g3(l, 462, 9, 10) + 0.52 * g3(l, 527, 13, 16) + 1.0 * g3(l, 628, 8, 9),
  tungstene: l => { const m = l * 1e-9; return 1 / (Math.pow(m, 5) * (Math.exp(1.4388e-2 / (m * 3200)) - 1)); },
  bleue: l => g3(l, 450, 9, 11)
};

// Disposition des LED sur un panneau (vue de face)
function figPanneau(type) {
  const coul = { c: "#ffb45e", f: "#bfe0ff", r: "#ff453a", v: "#30d158", b: "#0a84ff", w: "#f2f2f7", a: "#ffb000" };
  const motifs = { bico: ["c", "f"], rvb: ["r", "v", "b"], rvbw: ["r", "v", "b", "w"], rvbww: ["r", "v", "b", "c", "f"] };
  let s = '<rect width="520" height="200" fill="#0b0c0e"/><rect x="40" y="20" width="250" height="160" rx="12" fill="#1c1c1e" stroke="#48484a"/>';
  if (type === "cob") {
    s += '<circle cx="165" cy="100" r="54" fill="#f5d36b"/><circle cx="165" cy="100" r="54" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3"/>';
    for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 6 + 4.8 * Math.sqrt(i); s += '<rect x="' + (165 + Math.cos(a) * r - 3) + '" y="' + (100 + Math.sin(a) * r - 3) + '" width="6" height="6" fill="#d39f2b"/>'; }
    s += TXT(400, 80, "COB (« chip on board »)", { s: 14 }) + TXT(400, 104, "des dizaines de puces", { s: 12, w: 500, c: "#aeaeb2" }) + TXT(400, 122, "sous un seul phosphore :", { s: 12, w: 500, c: "#aeaeb2" }) + TXT(400, 140, "une source unique et intense", { s: 12, w: 500, c: "#aeaeb2" });
  } else {
    const m = motifs[type]; let k = 0;
    for (let j = 0; j < 6; j++) for (let i = 0; i < 9; i++) { const t = m[(i + j * (m.length === 2 ? 1 : m.length - 1)) % m.length]; s += '<circle cx="' + (64 + i * 26) + '" cy="' + (40 + j * 24) + '" r="8" fill="' + coul[t] + '"/>'; k++; }
    const leg = { bico: [["c", "blanc chaud 3 200 K"], ["f", "blanc froid 5 600 K"]], rvb: [["r", "rouge"], ["v", "vert"], ["b", "bleu"]], rvbw: [["r", "rouge"], ["v", "vert"], ["b", "bleu"], ["w", "blanc (phosphore)"]], rvbww: [["r", "rouge"], ["v", "vert"], ["b", "bleu"], ["c", "blanc chaud"], ["f", "blanc froid"]] }[type];
    leg.forEach((l, i) => { s += '<circle cx="320" cy="' + (44 + i * 26) + '" r="8" fill="' + coul[l[0]] + '"/>' + TXT(336, 49 + i * 26, l[1], { a: "start", s: 13, w: 500 }); });
  }
  return SVG(520, 200, s, "Disposition des LED d’un panneau");
}

// La jonction PN : électrons et trous se rencontrent, un photon part
function figJonction() {
  let s = '<rect width="520" height="200" fill="#0b0c0e"/>';
  s += '<rect x="60" y="60" width="200" height="80" fill="#1e3a8a"/><rect x="260" y="60" width="200" height="80" fill="#4b5563"/>';
  s += TXT(160, 50, "Côté N : électrons en trop", { s: 12 }) + TXT(360, 50, "Côté P : « trous » (places libres)", { s: 12 });
  for (let i = 0; i < 9; i++) s += '<circle cx="' + (80 + (i % 5) * 36) + '" cy="' + (80 + Math.floor(i / 5) * 34) + '" r="6" fill="#7dd3fc"/>';
  for (let i = 0; i < 9; i++) s += '<circle cx="' + (290 + (i % 5) * 36) + '" cy="' + (80 + Math.floor(i / 5) * 34) + '" r="6" fill="none" stroke="#fbbf24" stroke-width="2"/>';
  s += '<line x1="260" y1="56" x2="260" y2="144" stroke="#fff" stroke-dasharray="4 4"/>' + TXT(260, 166, "jonction", { s: 12, c: "#fff" });
  s += '<path d="M260 100 l18 -44" stroke="#3b82f6" stroke-width="4" marker-end="url(#fl)"/><defs><marker id="fl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3b82f6"/></marker></defs>';
  s += TXT(318, 30, "photon (couleur fixée par le matériau)", { s: 12, c: "#93c5fd" });
  s += '<path d="M30 100 h30 M460 100 h30" stroke="#e5e5ea" stroke-width="2"/>' + TXT(22, 104, "−", { s: 18 }) + TXT(500, 104, "+", { s: 18 });
  return SVG(520, 200, s, "Jonction PN d’une LED");
}

// Le diagramme des couleurs (schéma) : spectre visible, triangle RVB, courbe de Planck
function figGamut(avecPoly) {
  const bord = [[.1741, .005], [.144, .0297], [.1241, .0578], [.0913, .1327], [.0454, .295], [.0082, .5384], [.0139, .7502], [.0743, .8338], [.1547, .8059], [.2296, .7543], [.3016, .6923], [.3731, .6245], [.4441, .5547], [.5125, .4866], [.5752, .4242], [.627, .3725], [.6658, .334], [.6915, .3083], [.7347, .2653]];
  const P = p => [40 + p[0] / 0.8 * 300, 190 - p[1] / 0.9 * 180];
  const pt = p => P(p).map(v => v.toFixed(1)).join(" ");
  let s = '<rect width="520" height="200" fill="#0b0c0e"/>';
  s += '<path d="M' + bord.map(pt).join(" L") + ' Z" fill="#2c2c2e" stroke="#8e8e93"/>';
  s += '<path d="M' + [[.527, .413], [.475, .413], [.423, .399], [.38, .377], [.33, .34], [.31, .32], [.281, .288]].map(pt).join(" L") + '" fill="none" stroke="#fff" stroke-width="2"/>';
  s += TXT(P([.5, .43])[0] + 18, P([.5, .43])[1] - 8, "Planck", { s: 11, c: "#fff" });
  s += '<path d="M' + [[.70, .30], [.17, .75], [.14, .04]].map(pt).join(" L") + ' Z" fill="rgba(10,132,255,.12)" stroke="#fff" stroke-dasharray="5 4" stroke-width="2"/>';
  [[.70, .30, "#ff453a"], [.17, .75, "#30d158"], [.14, .04, "#0a84ff"]].forEach(p => { const q = P(p); s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="6" fill="' + p[2] + '"/>'; });
  if (avecPoly) [[.57, .42, "#ffb000"], [.08, .5, "#00c7be"], [.38, .6, "#a3e635"]].forEach(p => { const q = P(p); s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="6" fill="' + p[2] + '"/>'; });
  s += TXT(420, 60, "Triangle pointillé :", { s: 12 }) + TXT(420, 78, "toutes les couleurs", { s: 12, w: 500, c: "#aeaeb2" }) + TXT(420, 94, "d’un projecteur RVB", { s: 12, w: 500, c: "#aeaeb2" });
  if (avecPoly) s += TXT(420, 130, "+ ambre, cyan, lime :", { s: 12 }) + TXT(420, 148, "le polygone s’agrandit", { s: 12, w: 500, c: "#aeaeb2" });
  return SVG(520, 200, s, "Diagramme des couleurs et gamut d’un projecteur RVB");
}

// La courbe de Planck et les quatre directions de correction
function figPlanck(point) {
  let s = '<rect width="520" height="220" fill="#0b0c0e"/><defs><linearGradient id="pk" x1="0" x2="1"><stop offset="0" stop-color="#ff8a2a"/><stop offset=".45" stop-color="#fff3e0"/><stop offset="1" stop-color="#8fbaff"/></linearGradient><marker id="fp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffd60a"/></marker></defs>';
  s += '<path d="M40 70 Q260 175 480 120" fill="none" stroke="url(#pk)" stroke-width="6"/>';
  [[60, 80, "1 900 K"], [150, 120, "3 200 K"], [280, 140, "4 300 K"], [380, 135, "5 600 K"], [470, 122, "10 000 K"]].forEach(p => { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#fff"/>' + TXT(p[0], p[1] + 24, p[2], { s: 11, w: 500 }); });
  if (point === undefined) {
    s += '<path d="M282 108 L176 92" stroke="#ffd60a" stroke-width="3" marker-end="url(#fp)"/>' + TXT(196, 76, "CTO : plus chaud", { s: 12, c: "#ffd60a" });
    s += '<path d="M318 110 L430 104" stroke="#ffd60a" stroke-width="3" marker-end="url(#fp)"/>' + TXT(414, 88, "CTB : plus froid", { s: 12, c: "#ffd60a" });
    s += '<path d="M300 126 L300 52" stroke="#30d158" stroke-width="3" marker-end="url(#fp)"/>' + TXT(300, 40, "Plus Green : vers le vert", { s: 12, c: "#30d158" });
    s += '<path d="M300 150 L300 196" stroke="#ff6ad5" stroke-width="3" marker-end="url(#fp)"/>' + TXT(312, 196, "Minus Green : vers le magenta", { s: 12, c: "#ff6ad5", a: "start" });
  } else {
    s += TXT(260, 30, "▲ au-dessus : dominante verte", { s: 12, c: "#30d158" }) + TXT(260, 212, "▼ au-dessous : dominante magenta", { s: 12, c: "#ff6ad5" });
    point.forEach(p => { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#ffd60a" stroke="#000" stroke-width="2"/>' + TXT(p[0] + 18, p[1] + 5, p[2], { s: 15, c: "#ffd60a" }); });
  }
  return SVG(520, 220, s, "La courbe de Planck et les directions de correction");
}

// Transmission spectrale d'une gélatine
function figGel(type) {
  // Même modèle que les labos : un filtre « mired » idéal de ±134 mireds (a = 1,4388e-2 × 134e-6)
  const a = 1.4388e-2 * 134e-6;
  const f = { cto: l => 0.92 * Math.min(1, Math.exp(-a * (1e9 / l - 1e9 / 700))), ctb: l => 0.92 * Math.min(1, Math.exp(-a * (1e9 / 400 - 1e9 / l))), mg: l => 0.92 * (1 - 0.55 * Math.exp(-0.5 * ((l - 535) / 38) ** 2)), pg: l => 0.92 * (1 - 0.42 * (1 - Math.exp(-0.5 * ((l - 540) / 48) ** 2))) }[type];
  const nom = { cto: "Full CTO : on retire du bleu", ctb: "Full CTB : on retire du rouge (et du jaune)", mg: "Minus Green : on retire du vert", pg: "Plus Green : on retire du rouge et du bleu" }[type];
  return figSpectre(l => f(l), nom + " (transmission, en %)");
}

// Vue de côté : source, tête, mur, ombre et pénombre
function figOmbre(D, lettres) {
  const d1 = 1.6, d2 = 1.0, h = 0.25, xs = 40, sc = 170, yc = 110, k = 260;
  const X = x => xs + x * sc, Y = y => yc - y * k;
  const L = d1 + d2;
  const prol = (a, b) => { const t = (L - a[0]) / (b[0] - a[0]); return a[1] + t * (b[1] - a[1]); };
  const yu1 = prol([0, D / 2], [d1, h / 2]), yu2 = prol([0, -D / 2], [d1, -h / 2]), yp1 = prol([0, -D / 2], [d1, h / 2]), yp2 = prol([0, D / 2], [d1, -h / 2]);
  let s = '<rect width="520" height="220" fill="#0b0c0e"/>';
  s += '<polygon points="' + X(d1) + "," + Y(h / 2) + " " + X(L) + "," + Y(yp1) + " " + X(L) + "," + Y(yp2) + " " + X(d1) + "," + Y(-h / 2) + '" fill="rgba(120,120,128,.55)"/>';
  if (yu1 > yu2) s += '<polygon points="' + X(d1) + "," + Y(h / 2) + " " + X(L) + "," + Y(yu1) + " " + X(L) + "," + Y(yu2) + " " + X(d1) + "," + Y(-h / 2) + '" fill="#000"/>';
  [[[0, D / 2], [d1, h / 2], yu1, "#ffd60a"], [[0, -D / 2], [d1, -h / 2], yu2, "#ffd60a"], [[0, -D / 2], [d1, h / 2], yp1, "#64d2ff"], [[0, D / 2], [d1, -h / 2], yp2, "#64d2ff"]].forEach(r => { s += '<line x1="' + X(r[0][0]) + '" y1="' + Y(r[0][1]) + '" x2="' + X(L) + '" y2="' + Y(r[2]) + '" stroke="' + r[3] + '" stroke-dasharray="5 4" stroke-width="1.4"/>'; });
  s += '<rect x="' + (X(0) - 5) + '" y="' + Y(D / 2) + '" width="8" height="' + Math.max(4, D * k) + '" fill="#ffd60a"/>';
  s += '<ellipse cx="' + X(d1) + '" cy="' + Y(0) + '" rx="12" ry="' + h / 2 * k + '" fill="#c9b8a6"/>';
  s += '<rect x="' + X(L) + '" y="10" width="7" height="200" fill="#8e8e93"/>';
  if (lettres) {
    const lb = lettres; // [lumière, pénombre, ombre]
    s += TXT(X(L) - 20, Y(yp1 + 0.18), lb[0], { s: 16, c: "#ffd60a" }) + TXT(X(L) - 20, Y((yp1 + Math.max(yu1, (yp1 + yp2) / 2)) / 2), lb[1], { s: 16, c: "#ffd60a" });
    if (yu1 > yu2) s += TXT(X(L) - 20, Y(0) + 6, lb[2], { s: 16, c: "#ffd60a" });
  } else {
    s += TXT(X(0), Y(Math.max(D / 2, 0.05)) - 8, "source", { s: 11 }) + TXT(X(d1), Y(h / 2) - 8, "tête", { s: 11 });
    if (yu1 > yu2) s += TXT(X(L) - 34, Y(0) + 4, "ombre", { s: 11 });
    s += TXT(X(L) - 40, Y((yp1 + yu1) / 2) + 4, "pénombre", { s: 11, c: "#aeaeb2" });
  }
  return SVG(520, 220, s, "Vue de côté : ombre et pénombre");
}

// La taille apparente : la même source vue de près et de loin
function figTailleApparente() {
  let s = '<rect width="520" height="200" fill="#0b0c0e"/>';
  s += '<rect x="70" y="40" width="10" height="120" fill="#ffd60a"/><circle cx="230" cy="100" r="14" fill="#c9b8a6"/>';
  s += '<path d="M80 40 L218 100 L80 160" fill="rgba(255,214,10,.15)" stroke="#ffd60a" stroke-dasharray="4 4"/>' + TXT(150, 32, "proche : grand angle", { s: 12 });
  s += '<rect x="290" y="70" width="10" height="60" fill="#ffd60a" opacity=".5"/><rect x="300" y="40" width="10" height="120" fill="#ffd60a"/><circle cx="490" cy="100" r="14" fill="#c9b8a6"/>';
  s += '<path d="M310 40 L478 100 L310 160" fill="rgba(255,214,10,.08)" stroke="#ffd60a" stroke-dasharray="4 4"/>';
  s += TXT(400, 32, "même source, plus loin : angle plus petit", { s: 12 }) + TXT(260, 188, "α ≈ D / d : la douceur dépend de la taille ET de la distance", { s: 12, c: "#aeaeb2", w: 500 });
  return SVG(520, 200, s, "Taille apparente d’une source");
}

// Profil d'éclairement mesuré sur un mur, avec une échelle en cm (pour lire la pénombre)
function figProfil(p) {
  const x0 = 40, w = 440, cm = w / 80; // 80 cm de mur
  const y0 = 40, h = 120, a = 20, b = a + p; // la pénombre va de a à b (cm)
  const pts = []; for (let x = 0; x <= 80; x += 0.5) { const v = x < a ? 0 : x > b ? 1 : (x - a) / p; pts.push((x0 + x * cm).toFixed(1) + "," + (y0 + h - v * h).toFixed(1)); }
  let s = '<rect width="520" height="200" fill="#0b0c0e"/>';
  for (let x = 0; x <= 80; x += 10) s += '<line x1="' + (x0 + x * cm) + '" y1="' + y0 + '" x2="' + (x0 + x * cm) + '" y2="' + (y0 + h) + '" stroke="rgba(255,255,255,.15)"/>' + TXT(x0 + x * cm, y0 + h + 16, x + " cm", { s: 11, w: 500, c: "#8e8e93" });
  s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#ffd60a" stroke-width="2.5"/>';
  s += TXT(x0, 26, "Lumière reçue par le mur, le long d’une ligne (0 = ombre, haut = plein éclairage)", { a: "start", s: 12 });
  return SVG(520, 200, s, "Profil de lumière à lire");
}

// Écran d'un thermocolorimètre
function figMesureur(T, duv) {
  let s = '<rect width="520" height="170" fill="#0b0c0e"/><rect x="130" y="16" width="260" height="138" rx="18" fill="#2c2c2e" stroke="#48484a"/>';
  s += '<rect x="148" y="32" width="224" height="104" rx="8" fill="#0d1a10"/>';
  s += TXT(260, 58, "TCC  " + NB(T, 0) + " K", { s: 20, c: "#b8ff6a" }) + TXT(260, 88, "Δuv  " + (duv > 0 ? "+" : "−") + Math.abs(duv).toFixed(3).replace(".", ","), { s: 20, c: "#b8ff6a" });
  s += TXT(260, 120, "THERMOCOLORIMÈTRE", { s: 10, c: "#6e8f62" });
  return SVG(520, 170, s, "Écran d’un thermocolorimètre");
}

// Ombre nette et ombre douce, côte à côte (A et B mélangées au hasard)
function figDeuxOmbres(nette) {
  let s = '<rect width="520" height="190" fill="#0b0c0e"/><defs><filter id="fl1"><feGaussianBlur stdDeviation="1"/></filter><filter id="fl2"><feGaussianBlur stdDeviation="12"/></filter></defs>';
  [["A", 130], ["B", 390]].forEach((p, i) => {
    const flou = (i === 0) === (nette === "A") ? "fl1" : "fl2";
    s += '<rect x="' + (p[1] - 120) + '" y="20" width="240" height="150" rx="10" fill="#d9d4cc"/>';
    s += '<ellipse cx="' + (p[1] + 20) + '" cy="105" rx="46" ry="56" fill="#4a4540" filter="url(#' + flou + ')"/>';
    s += '<circle cx="' + (p[1] - 30) + '" cy="95" r="34" fill="#c89b7b"/>';
    s += TXT(p[1] - 100, 44, p[0], { s: 20, c: "#1d1d1f", a: "start" });
  });
  return SVG(520, 190, s, "Deux photos d’une même balle et de son ombre");
}

/* ==========================================================================
   L'APPLICATION
   ========================================================================== */
const APPLICATION = {
  id: "tes-eclairage",                // IDENTIQUE à l'id de js/catalogue.js
  titre: "Éclairage",
  accroche: "LED, gélatines et ombres.",
  epreuve: "TES",
  intro: "Trois modules pour comprendre les outils du chef électricien : comment fonctionne un projecteur <b>LED</b> (bicolore, RVB, RVBW…), comment <b>corriger la couleur</b> d’une lumière avec des gélatines CTO, CTB, Plus et Minus Green, et pourquoi la <b>taille de la source</b> décide de la dureté des ombres. Chaque module se termine par une évaluation : obtenez au moins <b>12/20</b> pour débloquer le suivant.",

  modules: [
    /* ======================================================================
       MODULE 1 — LES TECHNOLOGIES LED
       ====================================================================== */
    {
      titre: "Les technologies LED",
      nav: "LED",
      resume: "Bicolore, RVB, RVBW, anatomie",
      intro: "Une LED ne produit qu’<b>une seule couleur</b>, fixée par son matériau. Pour faire du blanc, ou n’importe quelle couleur, un projecteur LED <b>mélange</b> plusieurs familles de LED : deux blancs (bicolore), trois couleurs (RVB), ou des couleurs et des blancs (RVBW, RVBWW). Ce choix décide de ce que le projecteur sait faire… et de la qualité de ses blancs.",
      notions: {
        titre: "Comment une LED fabrique de la lumière",
        intro: "De la puce au projecteur : l’<b>anatomie</b> d’une LED, la façon dont on obtient du <b>blanc</b>, puis les grandes <b>familles</b> de projecteurs.",
        mots: [
          { t: "LED (diode électroluminescente)", ic: "💡", q: "Comment une LED produit-elle de la lumière ?", d: "Une LED est une <b>diode</b> en matériau semi-conducteur. Le courant pousse des <b>électrons</b> (côté N) vers des <b>trous</b> (côté P). À la <b>jonction</b>, chaque électron qui comble un trou libère son énergie sous forme d’un <b>photon</b> : c’est l’électroluminescence. Pas de filament chauffé : la lumière vient directement de la matière." + figJonction(), c: "Des billes qui tombent dans des trous : chaque chute produit un petit éclair.", r: "Une puce mesure environ 1 mm² ; un panneau en contient des centaines." },
          { t: "Couleur d’une LED", ic: "🎨", q: "Qu’est-ce qui fixe la couleur d’une LED ?", d: "Le <b>matériau</b> de la puce : il fixe l’énergie de chaque photon, donc sa longueur d’onde. Le spectre d’une LED de couleur est un <b>pic étroit</b> (environ 20 à 30 nm de large).", r: "InGaN (nitrure de gallium-indium) : bleu ≈ 450 – 470 nm, vert ≈ 520 – 530 nm · AlInGaP : rouge ≈ 625 nm, ambre ≈ 590 nm." },
          { t: "LED blanche à phosphore", ic: "⚪", q: "Comment fabrique-t-on une LED blanche ?", d: "Il n’existe pas de LED « blanche » par nature. On prend une <b>LED bleue</b> et on la recouvre d’un <b>phosphore</b> (luminophore) qui convertit une partie du bleu en une lumière <b>jaune à rouge</b>, large. Bleu restant + jaune = blanc. On reconnaît son spectre : un <b>pic bleu</b> et une <b>bosse</b>." + figSpectre(SPECTRES.phosphore, "LED blanche « éco » : pic bleu + bosse du phosphore", { notes: [[450, "puce"], [560, "phosphore"]] }), c: "Un stylo bleu sous un surligneur jaune : le mélange paraît blanc.", r: "Plus de phosphore (et un phosphore plus rouge) = blanc plus chaud." },
          { t: "Phosphore multi-bandes (haut IRC)", ic: "🌈", q: "Pourquoi certaines LED blanches rendent-elles mieux les couleurs ?", d: "Les LED « haut IRC » utilisent <b>plusieurs phosphores</b> (vert, orange, rouge) : la bosse est plus large et remplit les <b>creux</b> du spectre, notamment le cyan et le rouge profond. Les couleurs de la peau et les rouges sont mieux rendus." + figSpectre(SPECTRES.hautIRC, "LED blanche haut IRC : spectre plus continu"), r: "LED « éco » : IRC ≈ 80, R9 faible · LED de cinéma : IRC 95 et plus, R9 ≥ 90." },
          { t: "CMS (SMD) et COB", ic: "🔲", q: "Quelle différence entre des LED CMS et une LED COB ?", d: "<b>CMS</b> (composant monté en surface, en anglais SMD) : de petites LED séparées, réparties sur un panneau. <b>COB</b> (<i>chip on board</i>) : des dizaines de puces serrées sous un <b>seul</b> phosphore, qui forment une source unique et intense, placée derrière une Fresnel ou un réflecteur." + figPanneau("cob"), r: "Panneaux : CMS · « spots » LED compacts à réflecteur : COB." },
          { t: "Bicolore", ic: "🎛️", q: "Comment fonctionne un projecteur bicolore ?", d: "Il contient <b>deux familles de LED blanches</b> à phosphore, entremêlées : des <b>chaudes</b> (≈ 2 700 à 3 200 K) et des <b>froides</b> (≈ 5 600 à 6 500 K). En dosant les deux, on règle la température de couleur entre les deux extrêmes. Il ne fait <b>que des blancs</b>." + figPanneau("bico"), c: "Un robinet mitigeur : eau chaude + eau froide.", r: "Au milieu de la plage, le mélange tire légèrement vers le magenta : les bons projecteurs le compensent." },
          { t: "RVB (RGB)", ic: "🔴", q: "Comment fonctionne un projecteur RVB ?", d: "Trois familles de LED de <b>couleur</b> : rouge, verte, bleue. En les dosant, on obtient toutes les couleurs du <b>triangle</b> qu’elles forment dans le diagramme des couleurs, y compris un blanc. Mais ce blanc n’a que <b>trois pics</b> : les couleurs des objets sont mal rendues." + figPanneau("rvb") + figSpectre(SPECTRES.rvb, "Blanc obtenu en RVB : trois pics, des creux"), c: "Peindre un arc-en-ciel avec seulement trois tubes de couleur : il manque des nuances.", r: "Idéal pour les effets colorés, le décor, la scène ; à éviter seul sur un visage." },
          { t: "RVBW (RGBW, WRVB)", ic: "⚪🔴", q: "Qu’apporte la LED blanche d’un RVBW ?", d: "Au rouge, vert et bleu, on ajoute une LED <b>blanche à phosphore</b> (W, <i>white</i>). Les blancs et les couleurs <b>pastel</b> viennent surtout d’elle : le spectre est plus complet, le rendu des couleurs bien meilleur. Les couleurs saturées restent fournies par les LED R, V, B." + figPanneau("rvbw"), r: "Le W n’agrandit pas le triangle des couleurs : il améliore la qualité des blancs." },
          { t: "RVBWW, RVBA, RVBACL", ic: "🌈", q: "Que sont les projecteurs RVBWW ou RVBACL ?", d: "<b>RVBWW</b> : rouge, vert, bleu + <b>deux blancs</b> (chaud et froid), pour des blancs de qualité de 2 700 à 10 000 K. <b>RVBA</b> : + <b>ambre</b>. <b>RVBACL</b> : + ambre, <b>cyan</b> et <b>lime</b>. Chaque couleur ajoutée bouche un trou du spectre et <b>agrandit</b> la zone des couleurs possibles." + figGamut(true), r: "Les projecteurs « full color » de cinéma ont 5 à 7 familles de LED et un IRC de 95 et plus à toutes les températures." },
          { t: "Gamut", ic: "🔺", q: "Qu’est-ce que le gamut d’un projecteur ?", d: "L’ensemble des couleurs qu’il peut produire. Dans le diagramme des couleurs, c’est le <b>polygone</b> qui relie les couleurs de ses LED : un mélange tombe toujours <b>à l’intérieur</b>. Une couleur hors du polygone est impossible." + figGamut(false), c: "Une palette de peintre : avec trois tubes, on ne fait que les couleurs « entre » ces trois-là." },
          { t: "Pilote (driver) et gradation", ic: "🎚️", q: "Comment fait-on varier l’intensité d’une LED ?", d: "Une LED se pilote en <b>courant</b>. Deux méthodes : baisser le courant (<b>courant constant</b>, CCR), ou l’allumer et l’éteindre très vite (<b>PWM</b>, modulation de largeur d’impulsion) : la part de temps allumé, le <b>rapport cyclique</b>, fixe le niveau moyen. Une PWM trop lente fait <b>scintiller</b> l’image (flicker), surtout aux vitesses d’obturation rapides.", c: "Un robinet à moitié ouvert (courant) ou un robinet ouvert à fond une seconde sur deux (PWM).", r: "PWM de cinéma : plusieurs dizaines de kHz." },
          { t: "Chaleur et radiateur", ic: "🌡️", q: "Une LED chauffe-t-elle ?", d: "Elle n’envoie presque pas de chaleur <b>vers l’avant</b> (pas d’infrarouge dans le faisceau, contrairement au tungstène), mais sa jonction chauffe <b>à l’arrière</b> : une grande part de l’énergie électrique devient chaleur. Trop chaude, la LED perd du flux, sa couleur dérive et elle vieillit vite. D’où les <b>radiateurs</b> à ailettes et les ventilateurs.", r: "Efficacité : LED ≈ 80 à 120 lm/W, contre ≈ 25 lm/W en tungstène." }
        ],
        formules: [
          { q: "Comment calculer le flux lumineux d’un projecteur LED ?", f: "Φ = η × P", say: "le flux est égal à l’efficacité lumineuse multipliée par la puissance électrique", rows: [["Φ", "flux lumineux", "lm", "la lumière produite"], ["η", "efficacité lumineuse", "lm/W", "≈ 100 en LED, ≈ 25 en tungstène"], ["P", "puissance électrique", "W", "ce qu’indique la fiche"]], ex: "Panneau LED de 150 W à 100 lm/W : Φ = 100 × 150 = 15 000 lm. En tungstène, il faudrait 15 000 / 25 = 600 W." },
          { q: "Quelle température de couleur donne un mélange bicolore ?", f: "M ≈ a × M<sub>chaude</sub> + (1 − a) × M<sub>froide</sub>", say: "les mireds du mélange sont à peu près la moyenne des mireds des deux blancs, pondérée par leur part de lumière", rows: [["M", "mireds du mélange", "mired", "T = 1 000 000 / M"], ["a", "part de lumière des LED chaudes", "de 0 à 1", "0,5 = moitié-moitié"], ["M<sub>chaude</sub>", "mireds du blanc chaud", "mired", "3 200 K → 313"], ["M<sub>froide</sub>", "mireds du blanc froid", "mired", "5 600 K → 179"]], ex: "Moitié-moitié : M ≈ 0,5 × 313 + 0,5 × 179 = 246 mireds → T ≈ 1 000 000 / 246 ≈ 4 070 K. (Approximation : on calcule en mireds, jamais en kelvins.)" },
          { q: "Comment calculer le rapport cyclique d’une gradation PWM ?", f: "Rapport cyclique = t<sub>allumé</sub> / T  ·  T = 1 / f", say: "le rapport cyclique est la durée allumée divisée par la période ; la période est l’inverse de la fréquence", rows: [["t<sub>allumé</sub>", "durée allumée par cycle", "s", "dans chaque créneau"], ["T", "période", "s", "durée d’un cycle"], ["f", "fréquence de la PWM", "Hz", "cycles par seconde"]], ex: "PWM à 1 000 Hz : T = 1 ms. Allumée 0,25 ms par cycle : rapport cyclique = 0,25 / 1 = 25 % → la LED éclaire en moyenne à 25 %." }
        ]
      },
      manipuler: {
        titre: "Trois labos : l’anatomie, le mélange, la gradation",
        intro: "Ouvrez une LED, puis mélangez des familles de LED pour voir ce que chaque technologie sait produire, et comment elle rend les couleurs. Enfin, baissez une LED sans faire scintiller l’image."
      },
      essentiel: {
        definitions: [
          "<b>LED</b> : diode semi-conductrice ; électrons + trous → photons. Une seule couleur, fixée par le matériau.",
          "<b>LED blanche</b> : LED bleue + phosphore jaune (spectre : pic bleu + bosse). Plusieurs phosphores = meilleur rendu.",
          "<b>Bicolore</b> : blancs chauds + blancs froids. Que des blancs, réglables en température de couleur.",
          "<b>RVB</b> : toutes les couleurs du triangle, mais des blancs à trois pics (mauvais rendu).",
          "<b>RVBW / RVBWW</b> : on ajoute un ou deux blancs à phosphore pour des blancs de qualité ; <b>RVBA / RVBACL</b> : d’autres couleurs qui agrandissent le gamut.",
          "<b>Gamut</b> : polygone des couleurs possibles, dont les sommets sont les couleurs des LED.",
          "<b>PWM</b> : gradation par créneaux ; trop lente, elle fait scintiller l’image."
        ],
        formules: [["Φ = η × P", "LED ≈ 100 lm/W · tungstène ≈ 25 lm/W"], ["M ≈ a × M<sub>chaude</sub> + (1 − a) × M<sub>froide</sub>", "mélange bicolore, en mireds"], ["Rapport cyclique = t<sub>allumé</sub> / T", "T = 1 / f"]],
        reperes: ["3 200 K = 313 mireds · 5 600 K = 179 mireds.", "Puce bleue ≈ 450 nm · LED rouge ≈ 625 nm.", "IRC ≥ 90 (et R9 élevé) pour filmer des visages.", "Une LED rend environ 4 fois plus de lumière par watt que le tungstène."],
        pieges: ["Une bicolore ne fait <b>pas</b> de couleurs saturées.", "Un « blanc » RVB paraît blanc à l’œil mais rend mal les couleurs.", "La LED ne chauffe pas le sujet, mais elle chauffe <b>derrière</b> : ne jamais boucher les aérations.", "Le W d’un RVBW améliore les blancs ; il n’agrandit pas le triangle des couleurs."]
      },
      evaluation: {
        lire: [
          () => { const k = C(["phosphore", "rvb", "tungstene"]); const nom = { phosphore: "Une LED blanche à phosphore (puce bleue + phosphore)", rvb: "Un projecteur RVB réglé en blanc", tungstene: "Une lampe tungstène (spectre continu)" }; return { type: "qcm", question: "Quelle source a produit ce spectre ?", figure: figSpectre(SPECTRES[k], "Spectre mesuré au spectromètre"), bonne: nom[k], mauvaises: Object.keys(nom).filter(x => x !== k).map(x => nom[x]).concat(["Une LED bleue seule"]), explication: { phosphore: "Un pic bleu étroit (la puce) et une large bosse jaune (le phosphore) : c’est la signature d’une LED blanche à phosphore.", rvb: "Trois pics étroits séparés par des creux : rouge, vert et bleu mélangés.", tungstene: "Une courbe continue qui monte vers le rouge, sans pic : un corps chauffé, comme le filament de tungstène." }[k], indice: "Comptez les pics : un seul, deux, trois… ou aucun ?" }; },
          () => { const k = C(["bico", "rvb", "rvbw"]); const nom = { bico: "Bicolore", rvb: "RVB", rvbw: "RVBW" }; return { type: "qcm", question: "Voici la disposition des LED d’un panneau, vue de face. De quelle technologie s’agit-il ?", figure: figPanneau(k), bonne: nom[k], mauvaises: Object.keys(nom).filter(x => x !== k).map(x => nom[x]).concat(["COB"]), explication: { bico: "Deux sortes de LED blanches (chaudes et froides) : un projecteur bicolore.", rvb: "Rouge, vert, bleu, sans LED blanche : RVB.", rvbw: "Rouge, vert, bleu et une LED blanche : RVBW." }[k], indice: "Lisez la légende : combien de familles, et lesquelles ?" }; },
          () => { const Tmin = C([2700, 3000, 3200]), Tmax = C([5600, 6500, 10000]), P = C([60, 120, 200]), irc = C([94, 96, 98]); const q = C(["max", "min", "p"]); return { type: "nombre", contexte: "Fiche technique : « Panneau LED bicolore · " + NB(Tmin, 0) + " – " + NB(Tmax, 0) + " K · IRC " + irc + " · TLCI " + (irc - 1) + " · " + P + " W · PWM 25 kHz, sans scintillement ».", question: { max: "Quelle est la température de couleur la plus froide (en K) ?", min: "Quelle est la température de couleur la plus chaude (en K) ?", p: "Quelle est la puissance électrique (en W) ?" }[q], reponse: { max: Tmax, min: Tmin, p: P }[q], unite: { max: "K", min: "K", p: "W" }[q], ecart: 0, explication: q === "p" ? "La puissance est indiquée en watts : " + P + " W." : "La plage va de " + NB(Tmin, 0) + " K (le plus chaud, orangé) à " + NB(Tmax, 0) + " K (le plus froid, bleuté). Attention : la plus froide a le plus grand nombre de kelvins.", indice: q === "p" ? "Cherchez l’unité W." : "Froid = bleuté = beaucoup de kelvins." }; }
        ],
        comprendre: [
          ["Un projecteur bicolore peut produire un rouge saturé.", false, "Il ne contient que des LED blanches (chaudes et froides) : il ne fait que des blancs.", "Que contient un bicolore ?"],
          ["Une LED blanche courante est une LED bleue recouverte d’un phosphore jaune.", true, "Le phosphore convertit une partie du bleu en jaune ; bleu + jaune donnent du blanc."],
          ["Une LED ne produit aucune chaleur.", false, "Elle chauffe peu le sujet, mais sa jonction chauffe fortement à l’arrière : d’où le radiateur.", "Pensez au radiateur à l’arrière des panneaux."],
          ["Un projecteur RVB réglé en blanc rend en général moins bien les couleurs qu’une bonne LED blanche à phosphore.", true, "Son spectre n’a que trois pics : les couleurs situées dans les creux sont mal rendues."],
          ["Ajouter une LED blanche (RVBW) agrandit le triangle des couleurs saturées.", false, "Le blanc est à l’intérieur du triangle : il améliore la qualité des blancs et des pastels, pas les couleurs saturées."],
          ["La couleur d’une LED de couleur dépend du matériau semi-conducteur de la puce.", true, "Le matériau fixe l’énergie des photons, donc leur longueur d’onde."],
          ["Avec une gradation PWM lente, l’image peut scintiller aux vitesses d’obturation rapides.", true, "Chaque pose capte un nombre différent de créneaux allumés : les images n’ont pas la même luminosité."],
          ["Dans un mélange bicolore, on calcule la température de couleur en faisant la moyenne des kelvins.", false, "On fait la moyenne pondérée des <b>mireds</b>, puis on revient aux kelvins."]
        ],
        qcm: [
          ["Que contient un projecteur bicolore ?", "Des LED blanches chaudes et des LED blanches froides", ["Des LED rouges, vertes et bleues", "Une seule LED et un filtre orange amovible", "Des LED blanches et des LED ambre seulement"], "Deux familles de blancs à phosphore, dosées pour régler la température de couleur."],
          ["Pourquoi ajoute-t-on une LED blanche aux LED RVB (RVBW) ?", "Pour obtenir des blancs au spectre plus complet, donc un meilleur rendu des couleurs", ["Pour obtenir des rouges plus saturés", "Pour supprimer le besoin d’un radiateur", "Pour augmenter la température de couleur maximale"], "Le W remplit les creux du spectre des blancs."],
          ["Quel est le rôle du phosphore dans une LED blanche ?", "Convertir une partie de la lumière bleue en lumière jaune à rouge", ["Refroidir la puce", "Protéger la puce de l’humidité", "Augmenter le courant dans la diode"], "Le phosphore absorbe du bleu et réémet une lumière plus large, jaune à rouge."],
          ["Qu’est-ce que le gamut d’un projecteur RVB ?", "L’ensemble des couleurs qu’il peut produire : le triangle formé par ses trois LED dans le diagramme des couleurs", ["Sa plage de températures de couleur", "Son angle de faisceau", "Sa puissance maximale"], "Un mélange tombe toujours à l’intérieur du polygone formé par les couleurs des LED."],
          ["Quelle gradation ne fait jamais scintiller l’image ?", "La gradation par courant constant", ["La PWM à 300 Hz", "La PWM à 50 Hz", "Toutes les gradations font scintiller"], "Le courant constant ne coupe jamais la lumière ; une PWM très rapide est aussi sans danger en pratique."],
          ["Pourquoi un panneau de LED sans diffuseur donne-t-il plusieurs ombres ?", "Chaque LED est une petite source qui projette sa propre ombre", ["Parce que les LED clignotent", "Parce que le panneau est trop puissant", "Parce que les LED sont de couleurs différentes"], "Plusieurs petites sources décalées = plusieurs ombres nettes décalées. Un diffuseur en fait une seule grande source."],
          ["Qu’est-ce qu’une LED COB ?", "Des dizaines de puces serrées sous un seul phosphore, formant une source unique et intense", ["Une LED de couleur cyan", "Un câble de commande DMX", "Un panneau de LED espacées"], "Chip on board : une source compacte, idéale derrière une Fresnel ou un réflecteur."]
        ],
        calculer: [
          () => { const a = C([0.25, 0.5, 0.75]), M = a * MIR(3200) + (1 - a) * MIR(5600); return { type: "nombre", question: "Un projecteur bicolore mélange des LED à <b>3 200 K</b> et à <b>5 600 K</b>. Les LED chaudes fournissent <b>" + a * 100 + " %</b> de la lumière. Quelle est, environ, la température de couleur obtenue (en K) ?", reponse: 1e6 / M, unite: "K", tolerance: 0.03, explication: "M ≈ " + NB(a, 2) + " × 313 + " + NB(1 - a, 2) + " × 179 ≈ " + NB(M, 0) + " mireds → T ≈ 1 000 000 / " + NB(M, 0) + " ≈ " + NB(Math.round(1e6 / M / 10) * 10, 0) + " K.", indice: "Calculez en mireds (M = 1 000 000 / T), faites la moyenne pondérée, puis revenez aux kelvins." }; },
          () => { const T = C([3800, 4000, 4300, 4800]), a = (MIR(T) - MIR(5600)) / (MIR(3200) - MIR(5600)); return { type: "nombre", question: "Un bicolore 3 200 K / 5 600 K doit donner <b>" + NB(T, 0) + " K</b>. Quelle part de la lumière doivent fournir les LED chaudes (en %) ?", reponse: a * 100, unite: "%", ecart: 3, explication: "M visé = 1 000 000 / " + NB(T, 0) + " ≈ " + NB(MIR(T), 0) + ". a = (" + NB(MIR(T), 0) + " − 179) / (313 − 179) ≈ " + NB(a * 100, 0) + " %.", indice: "a = (M visé − M froide) / (M chaude − M froide)." }; },
          () => { const eta = C([80, 90, 100, 110, 120]), P = C([60, 100, 150, 200, 300]); return { type: "nombre", question: "Un projecteur LED consomme <b>" + P + " W</b> avec une efficacité de <b>" + eta + " lm/W</b>. Quel est son flux lumineux (en lm) ?", reponse: eta * P, unite: "lm", explication: "Φ = η × P = " + eta + " × " + P + " = " + NB(eta * P, 0) + " lm.", indice: "Φ = η × P." }; },
          () => { const F = C([5000, 8000, 10000, 15000, 20000]); return { type: "nombre", question: "Il faut <b>" + NB(F, 0) + " lm</b>. Quelle puissance faudrait-il avec un projecteur <b>tungstène</b> (25 lm/W), en W ?", reponse: F / 25, unite: "W", explication: "P = Φ / η = " + NB(F, 0) + " / 25 = " + NB(F / 25, 0) + " W. En LED (≈ 100 lm/W), environ " + NB(F / 100, 0) + " W suffiraient.", indice: "P = Φ / η." }; },
          () => { const f = C([500, 1000, 2000, 5000]), r = C([0.1, 0.25, 0.4, 0.6]), T = 1e6 / f, ton = r * T; return { type: "nombre", question: "Une LED est gradée en PWM à <b>" + NB(f, 0) + " Hz</b> ; à chaque cycle, elle reste allumée <b>" + NB(ton, 0) + " µs</b>. Quel est le rapport cyclique (en %) ?", reponse: r * 100, unite: "%", ecart: 1, explication: "T = 1 / " + NB(f, 0) + " s = " + NB(T, 0) + " µs. Rapport cyclique = " + NB(ton, 0) + " / " + NB(T, 0) + " = " + NB(r * 100, 0) + " %.", indice: "Calculez d’abord la période T = 1 / f (1 s = 1 000 000 µs)." }; },
          () => { const f = C([20000, 25000, 40000, 50000]); return { type: "nombre", question: "La PWM d’un projecteur tourne à <b>" + NB(f, 0) + " Hz</b>. Quelle est la durée d’un cycle, en microsecondes (µs) ?", reponse: 1e6 / f, unite: "µs", explication: "T = 1 / f = 1 000 000 / " + NB(f, 0) + " = " + NB(1e6 / f, 0) + " µs.", indice: "T = 1 / f ; 1 s = 1 000 000 µs." }; }
        ],
        exercice: [
          () => { const P = C([100, 150, 200]), eta = C([90, 100, 110]); return { type: "exercice", question: "Un panneau bicolore 3 200 K / 5 600 K consomme <b>" + P + " W</b> avec une efficacité de <b>" + eta + " lm/W</b>.", etapes: [
            { question: "Flux lumineux du panneau (lm) ?", reponse: P * eta, unite: "lm" },
            { question: "Réglé moitié chaudes, moitié froides : température de couleur obtenue (K) ?", reponse: 1e6 / (0.5 * MIR(3200) + 0.5 * MIR(5600)), unite: "K", tolerance: 0.03 },
            { question: "Peut-il produire un bleu saturé pour un effet de décor ?", bonne: "Non : il ne contient que des LED blanches", mauvaises: ["Oui, en poussant les LED froides au maximum", "Oui, avec la gradation PWM"] }
          ], solution: "a) " + eta + " × " + P + " = " + NB(P * eta, 0) + " lm. b) M ≈ (313 + 179) / 2 = 246 → ≈ 4 070 K. c) Non : une bicolore ne fait que des blancs ; il faut un RVB, RVBW…", indice: "a) Φ = η × P. b) Moyenne en mireds." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 2 — CORRIGER LA COULEUR : CTO, CTB, VERT / MAGENTA ET PLANCK
       ====================================================================== */
    {
      titre: "Corriger la couleur : CTO, CTB, vert et magenta",
      nav: "Gélatines",
      resume: "Mireds, CTO, CTB, ±Green, Planck",
      intro: "Les « blancs » de nos sources se rangent sur une courbe : la <b>courbe de Planck</b>, celle d’un corps que l’on chauffe. Les gélatines <b>CTO</b> et <b>CTB</b> font glisser une lumière <b>le long</b> de cette courbe (plus chaude, plus froide) ; les gélatines <b>Plus Green</b> et <b>Minus Green</b> la déplacent <b>de part et d’autre</b> (vers le vert ou le magenta). Pour calculer ces corrections, on travaille en <b>mireds</b>.",
      notions: {
        titre: "Les blancs, la courbe de Planck et les corrections",
        intro: "D’abord la <b>carte des blancs</b> (la courbe de Planck), puis l’unité qui sert à calculer (le <b>mired</b>), enfin les <b>gélatines</b> qui déplacent une lumière sur cette carte.",
        mots: [
          { t: "Corps noir", ic: "🔥", q: "Qu’est-ce qu’un corps noir ?", d: "Un objet idéal qui émet de la lumière <b>uniquement parce qu’il est chaud</b>. Sa couleur ne dépend que de sa température : rouge sombre, orange, blanc, puis bleuté. Le filament de tungstène et le soleil s’en approchent." + figSpectre(SPECTRES.tungstene, "Spectre d’un corps noir à 3 200 K (tungstène) : continu"), c: "Une barre de fer dans une forge." },
          { t: "Courbe de Planck (lieu des corps noirs)", ic: "〰️", q: "Qu’est-ce que la courbe de Planck ?", d: "Dans le diagramme des couleurs, la ligne qui relie les couleurs d’un corps noir à toutes les températures : de l’orangé (1 500 K) au bleuté (10 000 K et plus). C’est la <b>référence des blancs</b>. Une source <b>sur</b> la courbe a une couleur « naturelle » ; une source <b>au-dessus</b> tire vers le <b>vert</b>, <b>au-dessous</b> vers le <b>magenta</b>." + figPlanck(), c: "Une route : la température de couleur dit à quel kilomètre on se trouve ; le Duv dit si l’on est sur le bas-côté gauche ou droit.", r: "Les « blancs » de l’audiovisuel : 3 200 K et 5 600 K, tous deux sur la courbe." },
          { t: "Température de couleur (TCC)", s: "T", u: "kelvin (K)", ic: "🌡️", q: "Que mesure la température de couleur ?", d: "La position d’une lumière <b>le long</b> de la courbe de Planck : la température du corps noir qui a la même teinte. Pour une LED ou un tube fluo, qui ne sont pas des corps noirs, on parle de température de couleur <b>proximale</b> : celle du point de la courbe le plus proche.", r: "Bougie ≈ 1 900 K · tungstène 3 200 K · jour 5 600 K · ciel couvert ≈ 6 500 K." },
          { t: "Duv (vert / magenta)", s: "Δuv", ic: "🟢", q: "Que mesure le Duv ?", d: "La <b>distance</b> d’une lumière à la courbe de Planck, avec un signe : <b>positif</b> = au-dessus = dominante <b>verte</b> (tubes fluo, certaines LED) ; <b>négatif</b> = au-dessous = dominante <b>magenta</b>. La température de couleur ne dit rien de cet écart : il faut les deux nombres.", r: "|Duv| ≤ 0,003 : neutre · au-delà de 0,006 : dominante visible." },
          { t: "Mired", s: "M", u: "mired", ic: "📐", q: "Qu’est-ce qu’un mired et pourquoi l’utiliser ?", d: "<b>M = 1 000 000 / T</b>. Sur l’échelle des mireds, un même écart produit <b>le même changement de teinte</b> partout : 500 K d’écart, c’est énorme à 2 500 K et presque invisible à 8 000 K, alors que 35 mireds se voient pareil partout. C’est pour cela que les gélatines sont définies en mireds.", c: "Comme les diaphs pour la lumière : une échelle où chaque pas « se voit » autant.", r: "3 200 K = 313 mireds · 5 600 K = 179 mireds · 6 500 K = 154 mireds." },
          { t: "Décalage mired", ic: "↔️", q: "Qu’est-ce qu’un décalage mired ?", d: "La « force » d’une gélatine : le nombre de mireds qu’elle <b>ajoute</b> à la lumière. <b>Positif</b> = la lumière devient plus chaude (CTO) ; <b>négatif</b> = plus froide (CTB). Plusieurs gélatines superposées : on <b>additionne</b> les décalages.", r: "De 5 600 K à 3 200 K : 313 − 179 = +134 mireds." },
          { t: "CTO (Color Temperature Orange)", ic: "🟧", q: "À quoi sert une gélatine CTO ?", d: "Un filtre orangé qui <b>retire du bleu</b> : la lumière glisse le long de la courbe vers les basses températures, elle se <b>réchauffe</b>. On la pose sur une fenêtre, un HMI ou une LED « jour » pour raccorder avec du tungstène." + figGel("cto"), r: "Full CTO ≈ +134 mireds (5 600 → 3 200 K) · ½ ≈ +70 · ¼ ≈ +35 · ⅛ ≈ +18. Une Full CTO fait perdre environ 1 diaph." },
          { t: "CTB (Color Temperature Blue)", ic: "🟦", q: "À quoi sert une gélatine CTB ?", d: "Un filtre bleu qui <b>retire du rouge et du jaune</b> : la lumière glisse vers les hautes températures, elle se <b>refroidit</b>. On la pose sur un projecteur tungstène pour raccorder avec la lumière du jour." + figGel("ctb"), r: "Full CTB ≈ −134 mireds (3 200 → 5 600 K) · ½ ≈ −70 · ¼ ≈ −35 · ⅛ ≈ −18. Une Full CTB fait perdre 1,5 à 2 diaphs : le tungstène ayant peu de bleu, on en jette beaucoup." },
          { t: "Plus Green", ic: "💚", q: "À quoi sert une gélatine Plus Green ?", d: "Un filtre vert pâle qui retire un peu de rouge et de bleu : la lumière <b>monte</b> au-dessus de la courbe (Duv positif). On la pose sur des projecteurs pour les raccorder à un décor éclairé en <b>tubes fluorescents</b> verts, quand on ne peut pas filtrer les tubes.", r: "Existe en Full, ½, ¼ et ⅛." + figGel("pg") },
          { t: "Minus Green (magenta)", ic: "💗", q: "À quoi sert une gélatine Minus Green ?", d: "Un filtre <b>magenta</b> qui retire du <b>vert</b> : la lumière <b>descend</b> vers la courbe de Planck. On la pose sur une source qui tire vers le vert (tube fluo, LED bon marché) pour la rendre neutre." + figGel("mg"), c: "Le magenta est la couleur « opposée » au vert : il l’annule." },
          { t: "Balance des blancs (Kelvin et Tint)", ic: "⚖️", q: "Que règle la balance des blancs d’une caméra ?", d: "Elle choisit <b>un point</b> sur la carte des blancs, qui sera rendu blanc : la <b>température</b> (le long de la courbe) et, sur de nombreuses caméras, la <b>teinte</b> (Tint : vert / magenta). Elle ne corrige qu’<b>une</b> lumière à la fois : avec des sources mélangées, on corrige les sources avec des gélatines.", r: "Écart caméra (mireds) = M source − M balance : positif → image orangée ; négatif → image bleutée." },
          { t: "Thermocolorimètre", ic: "📟", q: "À quoi sert un thermocolorimètre ?", d: "Un appareil qui mesure la <b>température de couleur</b> et le <b>Duv</b> (ou l’indice vert / magenta) d’une source. Il indique directement la gélatine à poser pour atteindre la température visée." }
        ],
        formules: [
          { q: "Comment passer des kelvins aux mireds, et retour ?", f: "M = 1 000 000 / T  ·  T = 1 000 000 / M", say: "les mireds sont égaux à un million divisé par les kelvins, et inversement", rows: [["M", "valeur en mireds", "mired", "grand M = lumière chaude"], ["T", "température de couleur", "K", "grand T = lumière froide"]], ex: "4 300 K → 1 000 000 / 4 300 ≈ 233 mireds. 250 mireds → 1 000 000 / 250 = 4 000 K." },
          { q: "Quelle gélatine faut-il pour passer d’une température à une autre ?", f: "Décalage = M<sub>voulue</sub> − M<sub>source</sub>", say: "le décalage est égal aux mireds de la lumière voulue moins ceux de la source", rows: [["M<sub>voulue</sub>", "mireds de la lumière souhaitée", "mired", "1 000 000 / T voulue"], ["M<sub>source</sub>", "mireds de la source", "mired", "1 000 000 / T source"], ["signe", "+ → CTO · − → CTB", "—", "réchauffer ou refroidir"]], ex: "Tungstène 3 200 K (313) → jour 5 600 K (179) : 179 − 313 = −134 mireds → une Full CTB." },
          { q: "Quelle température obtient-on après une ou plusieurs gélatines ?", f: "M<sub>après</sub> = M<sub>source</sub> + décalage(s)  ·  T = 1 000 000 / M<sub>après</sub>", say: "on ajoute les décalages des gélatines aux mireds de la source, puis on revient aux kelvins", rows: [["décalage(s)", "somme des gélatines", "mired", "CTO positif, CTB négatif"]], ex: "Jour 5 600 K (179) + ½ CTO (+70) = 249 mireds → 1 000 000 / 249 ≈ 4 020 K." },
          { q: "Combien de lumière perd-on avec une gélatine ?", f: "Perte (IL) = log<sub>2</sub>(1 / τ)", say: "la perte en diaphs est le nombre de fois qu’il faut diviser la lumière par deux pour arriver à la transmission", rows: [["τ", "transmission de la gélatine", "de 0 à 1", "part de la lumière qui passe"], ["IL", "indice de lumination", "diaph", "1 IL = lumière divisée par 2"]], ex: "τ = 50 % → 1 IL · τ = 25 % → 2 IL · τ = 35 % → log₂(1 / 0,35) ≈ 1,5 IL (Full CTB typique)." }
        ]
      },
      manipuler: {
        titre: "Deux labos : la carte des blancs et la règle des mireds",
        intro: "Posez des gélatines sur une source et suivez son déplacement sur la courbe de Planck ; regardez en même temps ce que voit la caméra. Puis empilez des gélatines pour comprendre pourquoi on calcule en mireds."
      },
      essentiel: {
        definitions: [
          "<b>Courbe de Planck</b> : la ligne des blancs « naturels » (corps noirs) dans le diagramme des couleurs.",
          "<b>Température de couleur</b> : la position le long de la courbe. <b>Duv</b> : l’écart au-dessus (vert, +) ou au-dessous (magenta, −).",
          "<b>Mired</b> : M = 1 000 000 / T ; un même écart en mireds = un même changement de teinte.",
          "<b>CTO</b> réchauffe (décalage +), <b>CTB</b> refroidit (décalage −) : déplacement LE LONG de la courbe.",
          "<b>Plus Green</b> ajoute du vert, <b>Minus Green</b> (magenta) en retire : déplacement DE PART ET D’AUTRE de la courbe."
        ],
        formules: [["M = 1 000 000 / T", "et T = 1 000 000 / M"], ["Décalage = M<sub>voulue</sub> − M<sub>source</sub>", "+ CTO · − CTB"], ["M<sub>après</sub> = M<sub>source</sub> + décalages", "les gélatines s’additionnent"], ["Écart caméra = M<sub>source</sub> − M<sub>balance</sub>", "+ orangé · − bleuté"], ["Perte = log<sub>2</sub>(1 / τ)", "en diaphs"]],
        reperes: ["3 200 K = 313 mireds · 5 600 K = 179 mireds · écart = 134 (une « Full »).", "Full ≈ 134 · ½ ≈ 70 · ¼ ≈ 35 · ⅛ ≈ 18 mireds.", "Full CTO ≈ −1 diaph · Full CTB ≈ −1,5 à −2 diaphs.", "|Duv| ≤ 0,003 : neutre."],
        pieges: ["CTB sur le <b>tungstène</b> (pour aller vers le jour), CTO sur la <b>lumière du jour</b> : ne pas inverser.", "On n’additionne jamais des kelvins : on calcule en mireds.", "« Minus Green » est magenta : il <b>retire</b> du vert.", "Une source verte peut avoir la « bonne » température de couleur : il faut aussi regarder le Duv."]
      },
      evaluation: {
        lire: [
          () => { const vert = C([true, false]), d = (vert ? 1 : -1) * C([0.008, 0.010, 0.012]), T = C([3150, 4200, 5500]); return { type: "qcm", question: "Un thermocolorimètre mesure une source et affiche ceci. Quelle gélatine corrige la dominante ?", figure: figMesureur(T, d), bonne: vert ? "Une Minus Green (magenta)" : "Une Plus Green", mauvaises: [vert ? "Une Plus Green" : "Une Minus Green (magenta)", "Une Full CTB", "Une Full CTO"], explication: "Δuv " + (vert ? "positif : la source est au-dessus de la courbe, elle tire vers le vert → on retire du vert avec une Minus Green (magenta)." : "négatif : la source est au-dessous de la courbe, elle tire vers le magenta → on ajoute du vert avec une Plus Green."), indice: "Le signe du Δuv dit de quel côté de la courbe de Planck se trouve la source." }; },
          () => { const k = C(["⅛ CTB", "¼ CTB", "½ CTB", "Full CTB", "⅛ CTO", "¼ CTO", "½ CTO", "Full CTO"]), v = { "⅛": 18, "¼": 35, "½": 70, "Full": 134 }[k.split(" ")[0]] * (k.includes("CTB") ? -1 : 1); return { type: "nombre", contexte: "Tableau du fabricant : ⅛ CTO +18 · ¼ CTO +35 · ½ CTO +70 · Full CTO +134 · ⅛ CTB −18 · ¼ CTB −35 · ½ CTB −70 · Full CTB −134 (mireds).", question: "Quel est le décalage d’une <b>" + k + "</b>, en mireds ? (Écrivez le signe.)", reponse: v, unite: "mireds", ecart: 0, explication: k + " : " + (v > 0 ? "+" : "−") + Math.abs(v) + " mireds. Les CTO sont positives (elles réchauffent), les CTB négatives.", indice: "Les CTB ont un signe moins." }; },
          () => { const haut = C([true, false]); return { type: "qcm", question: "Sur ce schéma de la courbe de Planck, une source est placée au point A. Que voit-on à l’image si la caméra est réglée à la même température de couleur ?", figure: figPlanck([[290, haut ? 90 : 180, "A"]]), bonne: haut ? "Une dominante verte" : "Une dominante magenta", mauvaises: [haut ? "Une dominante magenta" : "Une dominante verte", "Une dominante orangée", "Une image neutre"], explication: "Le point est " + (haut ? "au-dessus" : "au-dessous") + " de la courbe : Duv " + (haut ? "positif → vert." : "négatif → magenta."), indice: "Lisez les légendes en haut et en bas du schéma." }; }
        ],
        comprendre: [
          ["Une gélatine CTO réchauffe la lumière : son décalage en mireds est positif.", true, "CTO = orange = plus chaud = plus de mireds."],
          ["Pour raccorder un projecteur tungstène à la lumière du jour, on pose une CTO sur le projecteur.", false, "Il faut refroidir le tungstène (3 200 → 5 600 K) : c’est une CTB.", "Faut-il réchauffer ou refroidir le tungstène ?"],
          ["Une lumière à 3 200 K a plus de mireds qu’une lumière à 5 600 K.", true, "313 mireds contre 179 : plus la lumière est chaude, plus elle a de mireds."],
          ["Deux gélatines superposées : on additionne leurs décalages en mireds.", true, "Exemple : ½ CTO + ¼ CTO = +70 + 35 = +105 mireds."],
          ["Une Full CTB fait perdre plus de lumière qu’une Full CTO.", true, "Environ 1,5 à 2 diaphs contre environ 1 diaph."],
          ["Une gélatine Minus Green ajoute du vert à la lumière.", false, "Minus Green = magenta : elle retire du vert."],
          ["Un écart de 500 K se voit autant à 3 000 K qu’à 6 000 K.", false, "≈ 50 mireds à 3 000 K, mais ≈ 15 mireds à 6 000 K : on calcule en mireds.", "Convertissez 3 000 et 3 500 K, puis 6 000 et 6 500 K, en mireds."],
          ["Une source au-dessus de la courbe de Planck a une dominante verte.", true, "Au-dessus : Duv positif, vert. Au-dessous : magenta."],
          ["Une CTO déplace la lumière le long de la courbe de Planck, alors qu’une Minus Green la déplace de part et d’autre.", true, "CTO / CTB : le long de la courbe (température). Plus / Minus Green : perpendiculairement (Duv)."]
        ],
        qcm: [
          ["Que signifie CTB ?", "Color Temperature Blue : une gélatine bleue qui refroidit la lumière", ["Color Tint Balance : un réglage de la caméra", "Correction Totale du Blanc", "Color Temperature Brown : une gélatine qui réchauffe"], "CTB = bleu, décalage négatif."],
          ["Caméra réglée sur 3 200 K dans un décor tungstène ; une fenêtre (5 600 K) est dans le champ. Que poser sur la fenêtre ?", "Une Full CTO", ["Une Full CTB", "Une Minus Green", "Rien : la balance des blancs suffit"], "Il faut réchauffer la lumière du jour de 179 à 313 mireds : +134 → Full CTO."],
          ["Un décor éclairé par des tubes fluo donne une image verte. Que poser sur les tubes ?", "Une Minus Green (magenta)", ["Une Plus Green", "Une Full CTO", "Une Full CTB"], "Les tubes tirent vers le vert : on retire du vert."],
          ["Pourquoi calcule-t-on les corrections en mireds plutôt qu’en kelvins ?", "Parce qu’un même écart en mireds produit le même changement de teinte partout", ["Parce que les mireds sont plus précis que les kelvins", "Parce que les caméras n’affichent que des mireds", "Parce que les kelvins ne s’appliquent qu’au tungstène"], "Sur l’échelle des kelvins, les écarts ne « se voient » pas pareil selon la température."],
          ["Que mesure le Duv ?", "L’écart d’une lumière au-dessus (vert) ou au-dessous (magenta) de la courbe de Planck", ["La température de couleur", "La quantité de lumière", "L’indice de rendu des couleurs"], "Le Duv complète la température de couleur."],
          ["Caméra réglée sur 5 600 K, la scène est éclairée en tungstène 3 200 K. L’image est…", "orangée", ["bleutée", "verte", "neutre"], "Écart = 313 − 179 = +134 mireds : positif → orangé."],
          ["Qu’est-ce que la courbe de Planck ?", "La ligne des couleurs d’un corps noir chauffé à différentes températures", ["La courbe de réponse d’un capteur", "La courbe de transmission d’une CTO", "La courbe de gradation d’un projecteur"], "C’est la référence des blancs « naturels »."]
        ],
        calculer: [
          () => { const T = C([2700, 3200, 4300, 5000, 5600, 6500, 8000]); return { type: "nombre", question: "Convertissez <b>" + NB(T, 0) + " K</b> en mireds.", reponse: MIR(T), unite: "mireds", ecart: 2, explication: "M = 1 000 000 / " + NB(T, 0) + " ≈ " + NB(MIR(T), 0) + " mireds.", indice: "M = 1 000 000 / T." }; },
          () => { const M = C([125, 160, 200, 250, 280, 320, 400]); return { type: "nombre", question: "Une lumière vaut <b>" + M + " mireds</b>. Quelle est sa température de couleur (K) ?", reponse: 1e6 / M, unite: "K", tolerance: 0.02, explication: "T = 1 000 000 / " + M + " ≈ " + NB(1e6 / M, 0) + " K.", indice: "T = 1 000 000 / M." }; },
          () => { const c = C([[3200, 5600], [5600, 3200], [4300, 3200], [3200, 4300], [6500, 5600], [2700, 3200]]), d = MIR(c[1]) - MIR(c[0]); return { type: "nombre", question: "Quel décalage (en mireds, avec son signe) faut-il pour passer de <b>" + NB(c[0], 0) + " K</b> à <b>" + NB(c[1], 0) + " K</b> ?", reponse: d, unite: "mireds", ecart: 3, explication: "Décalage = " + NB(MIR(c[1]), 0) + " − " + NB(MIR(c[0]), 0) + " ≈ " + (d > 0 ? "+" : "−") + NB(Math.abs(d), 0) + " mireds → " + (d > 0 ? "CTO" : "CTB") + ".", indice: "Décalage = M voulue − M source. Positif = CTO, négatif = CTB." }; },
          () => { const s = C([3200, 5600, 4300]), g = C([["½ CTO", 70], ["¼ CTO", 35], ["½ CTB", -70], ["¼ CTB", -35], ["Full CTO", 134], ["Full CTB", -134]]), M = MIR(s) + g[1]; return { type: "nombre", question: "Une source à <b>" + NB(s, 0) + " K</b> reçoit une <b>" + g[0] + "</b> (" + (g[1] > 0 ? "+" : "−") + Math.abs(g[1]) + " mireds). Quelle température de couleur obtient-on (K) ?", reponse: 1e6 / M, unite: "K", tolerance: 0.03, explication: "M = " + NB(MIR(s), 0) + (g[1] > 0 ? " + " : " − ") + Math.abs(g[1]) + " = " + NB(M, 0) + " → T = 1 000 000 / " + NB(M, 0) + " ≈ " + NB(Math.round(1e6 / M / 10) * 10, 0) + " K.", indice: "Ajoutez le décalage aux mireds de la source, puis revenez aux kelvins." }; },
          () => { const s = C([3200, 5600]), b = s === 3200 ? 5600 : 3200, e = MIR(s) - MIR(b); return { type: "nombre", question: "La scène est éclairée à <b>" + NB(s, 0) + " K</b> ; la caméra est réglée sur <b>" + NB(b, 0) + " K</b>. Quel est l’écart vu par la caméra, en mireds (avec le signe) ?", reponse: e, unite: "mireds", ecart: 3, explication: "Écart = " + NB(MIR(s), 0) + " − " + NB(MIR(b), 0) + " ≈ " + (e > 0 ? "+" : "−") + NB(Math.abs(e), 0) + " mireds : image " + (e > 0 ? "orangée." : "bleutée."), indice: "Écart = M source − M balance." }; },
          () => { const t = C([0.5, 0.25, 0.35, 0.7, 0.125]); return { type: "nombre", question: "Une gélatine laisse passer <b>" + NB(t * 100, 1) + " %</b> de la lumière. Combien de diaphs fait-elle perdre ?", reponse: Math.log2(1 / t), unite: "IL", ecart: 0.1, explication: "Perte = log₂(1 / " + NB(t, 3) + ") ≈ " + NB(Math.log2(1 / t), 1) + " IL.", indice: "Combien de fois faut-il diviser par 2 pour passer de 100 % à " + NB(t * 100, 1) + " % ? (log₂ x = ln x / ln 2)" }; },
          () => { const a = C([["½ CTO", 70], ["¼ CTO", 35]]), b = C([["¼ CTO", 35], ["⅛ CTO", 18]]); const M = MIR(5600) + a[1] + b[1]; return { type: "nombre", question: "Sur un projecteur « jour » à <b>5 600 K</b>, on superpose une <b>" + a[0] + "</b> et une <b>" + b[0] + "</b>. Quelle température de couleur obtient-on (K) ?", reponse: 1e6 / M, unite: "K", tolerance: 0.03, explication: "M = 179 + " + a[1] + " + " + b[1] + " = " + NB(M, 0) + " mireds → T ≈ " + NB(Math.round(1e6 / M / 10) * 10, 0) + " K.", indice: "Les décalages s’additionnent." }; }
        ],
        exercice: [
          () => ({ type: "exercice", question: "Interview dans un bureau : la caméra est réglée sur <b>3 200 K</b>, les projecteurs sont en tungstène 3 200 K, une grande fenêtre (lumière du jour, <b>5 600 K</b>) est dans le champ.", etapes: [
            { question: "Mireds de la lumière de la fenêtre ?", reponse: MIR(5600), unite: "mireds", ecart: 2 },
            { question: "Décalage nécessaire pour l’amener à 3 200 K (avec le signe) ?", reponse: MIR(3200) - MIR(5600), unite: "mireds", ecart: 3 },
            { question: "Quelle gélatine poser sur la fenêtre ?", bonne: "Une Full CTO", mauvaises: ["Une Full CTB", "Une ½ CTB", "Une Minus Green"] },
            { question: "Sa transmission est de 50 % : combien de diaphs perd-on sur la fenêtre ?", reponse: 1, unite: "IL", ecart: 0.1 }
          ], solution: "a) 1 000 000 / 5 600 ≈ 179. b) 313 − 179 = +134. c) +134 = Full CTO. d) log₂(1 / 0,5) = 1 diaph.", indice: "Décalage positif = CTO." }),
          () => { const g = C([["½ CTB", -70], ["¼ CTB", -35]]); const M = MIR(3200) + g[1]; return { type: "exercice", question: "En extérieur jour (caméra sur <b>5 600 K</b>), on débouche un visage avec un projecteur tungstène <b>3 200 K</b>.", etapes: [
            { question: "Écart vu par la caméra sans gélatine (mireds, avec le signe) ?", reponse: MIR(3200) - MIR(5600), unite: "mireds", ecart: 3 },
            { question: "On ne dispose que d’une " + g[0] + " : température obtenue (K) ?", reponse: 1e6 / M, unite: "K", tolerance: 0.03 },
            { question: "Le visage reste-t-il un peu orangé ?", bonne: "Oui, il manque encore " + NB(M - MIR(5600), 0) + " mireds de correction", mauvaises: ["Non, il devient bleuté", "Non, la correction est parfaite"] }
          ], solution: "a) 313 − 179 = +134 (orangé). b) 313 " + (g[1] < 0 ? "− " : "+ ") + Math.abs(g[1]) + " = " + NB(M, 0) + " → ≈ " + NB(Math.round(1e6 / M / 10) * 10, 0) + " K. c) Oui : écart restant ≈ +" + NB(M - MIR(5600), 0) + " mireds.", indice: "Écart = M source − M balance ; la CTB retire des mireds." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 3 — LES OMBRES : TAILLE DE LA SOURCE, OMBRE ET PÉNOMBRE
       ====================================================================== */
    {
      titre: "Les ombres et la taille de la source",
      nav: "Ombres",
      resume: "Ombre, pénombre, lumière dure ou douce",
      intro: "Pourquoi le soleil, immense, donne-t-il des ombres si nettes, alors qu’un ciel couvert efface les ombres ? Parce que ce qui compte n’est pas la taille réelle de la source, mais sa <b>taille apparente</b> : la place qu’elle occupe vue depuis le sujet. Plus elle paraît <b>petite</b>, plus elle se comporte comme un <b>point</b> et plus l’ombre est <b>dure</b>.",
      notions: {
        titre: "Ombre, pénombre et taille apparente",
        intro: "Une ombre se lit en deux zones : l’<b>ombre</b>, qui ne voit rien de la source, et la <b>pénombre</b>, qui n’en voit qu’une partie. La largeur de la pénombre dit si la lumière est dure ou douce.",
        mots: [
          { t: "Ombre propre", ic: "🌗", q: "Qu’est-ce que l’ombre propre ?", d: "La partie du <b>sujet lui-même</b> qui ne reçoit pas la lumière (le côté du visage opposé au projecteur). La transition entre la face éclairée et l’ombre propre dessine le <b>modelé</b> (le volume).", c: "La face cachée de la Lune." },
          { t: "Ombre portée", ic: "👤", q: "Qu’est-ce que l’ombre portée ?", d: "L’ombre que le sujet <b>projette sur une autre surface</b> : le sol, un mur, un autre personnage. Elle a la forme du sujet, plus ou moins nette selon la source.", c: "La silhouette d’une main sur un mur, au théâtre d’ombres." },
          { t: "Ombre (zone d’ombre totale)", ic: "⚫", q: "Qu’est-ce que la zone d’ombre totale ?", d: "La zone d’où l’on ne voit <b>aucun point</b> de la source : elle ne reçoit rien de cette source (seulement la lumière renvoyée par le décor). Avec une très grande source, elle peut disparaître complètement." + figOmbre(0.05), r: "Sur le schéma : en noir." },
          { t: "Pénombre", ic: "🌫️", q: "Qu’est-ce que la pénombre ?", d: "La zone de transition, d’où l’on ne voit qu’<b>une partie</b> de la source : elle reçoit une partie de la lumière. Plus la source est grande, plus la pénombre est large et le bord de l’ombre est <b>flou</b>." + figOmbre(0.6), c: "Le soleil à moitié caché par un nuage : on reçoit encore un peu de lumière.", r: "Largeur de la pénombre : p ≈ D × d₂ / d₁." },
          { t: "Source ponctuelle", ic: "•", q: "Qu’est-ce qu’une source ponctuelle ?", d: "Une source <b>si petite</b> vue depuis le sujet qu’elle se comporte comme un point. Tous les rayons qui frôlent le bord du sujet partent du même point : il n’y a <b>pas de pénombre</b>, l’ombre est parfaitement nette.", r: "Ampoule nue loin du sujet, Fresnel en spot, soleil, flash cobra." },
          { t: "Source étendue", ic: "▭", q: "Qu’est-ce qu’une source étendue ?", d: "Une source <b>grande</b> vue depuis le sujet : boîte à lumière, cadre de diffusion, mur blanc, fenêtre par ciel couvert. Chaque point de la source projette une ombre légèrement décalée : leur superposition crée une <b>pénombre</b> large.", r: "Boîte à lumière, octa, cadre 2 × 2 m, réflecteur, ciel couvert." },
          { t: "Taille apparente", s: "α", u: "degré (°)", ic: "📐", q: "Qu’est-ce que la taille apparente d’une source ?", d: "L’<b>angle</b> sous lequel le sujet « voit » la source. Elle dépend de la taille réelle <b>D</b> <b>et</b> de la distance <b>d</b> : α ≈ D / d. Une petite source proche peut paraître plus grande qu’une grande source lointaine. C’est elle, et elle seule, qui décide de la dureté." + figTailleApparente(), c: "Une pièce de monnaie tenue près de l’œil cache la Lune.", r: "Soleil ≈ 0,5° (dur) · Fresnel à 3 m ≈ 3° · boîte à lumière 60 cm à 1 m ≈ 33° (doux) · ciel couvert ≈ 180°." },
          { t: "Lumière dure", ic: "☀️", q: "Qu’est-ce qu’une lumière dure ?", d: "Lumière d’une source <b>petite en apparence</b> : ombres aux bords <b>nets</b>, passage <b>brutal</b> de la lumière à l’ombre sur le visage, textures et défauts de peau très visibles. Elle découpe, dramatise, sculpte.", r: "Soleil de midi, Fresnel nue, projecteur de découpe." },
          { t: "Lumière douce", ic: "☁️", q: "Qu’est-ce qu’une lumière douce ?", d: "Lumière d’une source <b>grande en apparence</b> : ombres floues ou absentes, transition <b>progressive</b> sur le visage (beau modelé), peau adoucie. Elle enveloppe et flatte.", r: "Ciel couvert, fenêtre au nord, boîte à lumière proche, lumière réfléchie sur un grand panneau." },
          { t: "Diffusion et réflexion", ic: "🪟", q: "Comment rendre une lumière plus douce ?", d: "Il faut <b>agrandir la source vue du sujet</b> : la <b>diffuser</b> à travers un grand écran (soie, cadre de diffusion, boîte à lumière), ou la <b>réfléchir</b> sur une grande surface claire (réflecteur, plafond, mur). Ou simplement <b>rapprocher</b> la source. Un diffuseur collé sur un petit projecteur adoucit peu : c’est sa <b>taille</b> qui compte.", c: "Un rideau devant une fenêtre ensoleillée : toute la surface du rideau devient la source." },
          { t: "Distance sujet – fond", ic: "↔️", q: "Pourquoi l’ombre portée change-t-elle quand le sujet s’approche du mur ?", d: "La pénombre grandit avec la distance <b>d₂</b> entre le sujet et la surface qui reçoit l’ombre. Un sujet collé au mur a une ombre portée <b>nette</b>, même avec une source moyenne ; éloigné du mur, son ombre devient floue (et plus pâle).", r: "p ≈ D × d₂ / d₁ : si d₂ est nul, la pénombre aussi." },
          { t: "Ombres multiples", ic: "👥", q: "Pourquoi un panneau LED nu donne-t-il plusieurs ombres ?", d: "Un panneau sans diffuseur n’est pas une grande source, mais <b>beaucoup de petites sources</b> côte à côte : chaque LED dessine sa propre ombre nette, décalée des autres. Un <b>diffuseur</b> les fond en une seule grande source douce. Même chose avec plusieurs projecteurs : autant d’ombres que de sources." + figPanneau("rvbw") }
        ],
        formules: [
          { q: "Comment calculer la largeur de la pénombre ?", f: "p ≈ D × d₂ / d₁", say: "la pénombre est égale à la taille de la source, multipliée par la distance entre le sujet et le mur, divisée par la distance entre la source et le sujet", rows: [["p", "largeur de la pénombre (sur chaque bord)", "m ou cm", "la zone floue"], ["D", "taille de la source", "m", "diamètre ou côté"], ["d₁", "distance source → sujet", "m", "plus elle grandit, plus l’ombre est nette"], ["d₂", "distance sujet → surface", "m", "le mur, le sol"]], ex: "Boîte à lumière de 60 cm à 1,5 m d’une tête, mur à 1 m derrière : p ≈ 60 × 1 / 1,5 = 40 cm de pénombre. Avec une Fresnel de 15 cm : 10 cm seulement." },
          { q: "Comment calculer la taille apparente d’une source ?", f: "α ≈ D / d  (en radians)  ·  α° ≈ 57,3 × D / d", say: "la taille apparente est à peu près la taille de la source divisée par sa distance ; on multiplie par 57,3 pour l’avoir en degrés", rows: [["α", "taille apparente", "rad ou °", "1 rad ≈ 57,3°"], ["D", "taille de la source", "m", ""], ["d", "distance source → sujet", "m", ""]], ex: "Boîte à lumière de 90 cm à 3 m : 0,9 / 3 = 0,3 rad ≈ 17°. Rapprochée à 1,5 m : 0,6 rad ≈ 34° : deux fois plus douce. (Approximation valable si D est plus petit que d.)" },
          { q: "Quelle est la largeur de la zone d’ombre totale ?", f: "u ≈ h + (h − D) × d₂ / d₁", say: "la zone d’ombre totale vaut la taille du sujet, plus la différence entre la taille du sujet et celle de la source, multipliée par d₂ sur d₁", rows: [["u", "largeur de l’ombre totale", "m", "si u ≤ 0 : il n’y en a plus"], ["h", "taille du sujet", "m", "une tête ≈ 25 cm"], ["D, d₁, d₂", "comme ci-dessus", "m", ""]], ex: "Tête de 25 cm, source de 15 cm, d₁ = 2 m, d₂ = 1 m : u ≈ 25 + 10 × 0,5 = 30 cm. Source de 1,5 m : 25 − 125 × 0,5 < 0 → plus d’ombre totale, seulement une pénombre." }
        ]
      },
      manipuler: {
        titre: "Deux labos : les rayons, puis l’image",
        intro: "Tracez les rayons limites et voyez naître la pénombre, puis observez le même phénomène sur une image calculée : ombre propre, ombre portée, et ombres multiples d’un panneau LED nu."
      },
      essentiel: {
        definitions: [
          "<b>Ombre propre</b> : sur le sujet ; <b>ombre portée</b> : projetée sur une autre surface.",
          "<b>Ombre totale</b> : ne voit aucun point de la source ; <b>pénombre</b> : n’en voit qu’une partie.",
          "<b>Source ponctuelle</b> : petite en apparence → pas de pénombre → ombre dure.",
          "<b>Taille apparente</b> : l’angle sous lequel le sujet voit la source ; elle seule décide de la dureté.",
          "<b>Adoucir</b> : agrandir la source (diffusion, réflexion) ou la rapprocher."
        ],
        formules: [["p ≈ D × d₂ / d₁", "largeur de la pénombre"], ["α° ≈ 57,3 × D / d", "taille apparente"], ["u ≈ h + (h − D) × d₂ / d₁", "ombre totale (si u > 0)"]],
        reperes: ["Soleil ≈ 0,5° : très dur malgré sa taille réelle.", "Moins de 5° : lumière dure · plus de 20° : lumière douce.", "Rapprocher une source de 2 fois = la rendre 2 fois plus grande en apparence (et 4 fois plus forte : carré inverse)."],
        pieges: ["Ce n’est pas la taille réelle qui compte, c’est la taille <b>apparente</b>.", "Reculer une boîte à lumière la rend plus <b>dure</b>, pas plus douce.", "Un petit diffuseur collé sur une petite lampe ne l’adoucit presque pas.", "Pénombre ≠ ombre : la pénombre reçoit encore de la lumière."]
      },
      evaluation: {
        lire: [
          () => { const p = C([5, 10, 15, 20, 25, 30]); return { type: "nombre", question: "Ce graphique montre la lumière reçue par un mur le long d’une ligne qui traverse le bord d’une ombre. Quelle est la largeur de la pénombre, en cm ?", figure: figProfil(p), reponse: p, unite: "cm", ecart: 2, explication: "La pénombre est la zone où la lumière monte progressivement de 0 au plein éclairage : de 20 cm à " + (20 + p) + " cm, soit " + p + " cm.", indice: "Repérez où la courbe commence à monter et où elle atteint le haut." }; },
          () => { const L = Application.melanger(["A", "B", "C"]); return { type: "qcm", question: "Sur ce schéma (vue de côté), trois zones du mur sont repérées par des lettres. Laquelle est la <b>pénombre</b> ?", figure: figOmbre(0.35, L), bonne: L[1], mauvaises: [L[0], L[2]], explication: "La pénombre (" + L[1] + ") est entre la zone éclairée (" + L[0] + ") et l’ombre totale (" + L[2] + ") : on n’y voit qu’une partie de la source.", indice: "La pénombre est la zone de transition, entre la lumière et le noir." }; },
          () => { const n = C(["A", "B"]); return { type: "qcm", question: "Ces deux photos montrent la même balle, éclairée par deux sources différentes placées à la même distance. Laquelle a été prise avec la source la plus <b>petite</b> ?", figure: figDeuxOmbres(n), bonne: "La photo " + n, mauvaises: ["La photo " + (n === "A" ? "B" : "A"), "On ne peut pas le savoir"], explication: "L’ombre la plus nette (photo " + n + ") vient de la source la plus petite en apparence : peu ou pas de pénombre.", indice: "Petite source = ombre nette." }; }
        ],
        comprendre: [
          ["Plus une source paraît petite vue depuis le sujet, plus l’ombre est dure.", true, "Une petite source se comporte comme un point : pas de pénombre, bord net."],
          ["Reculer une boîte à lumière adoucit les ombres.", false, "En reculant, elle paraît plus petite : la lumière devient plus dure.", "Que devient la taille apparente quand on recule ?"],
          ["Le soleil, très grand, donne une lumière douce.", false, "Vu de la Terre, il ne mesure que 0,5° : c’est une source quasi ponctuelle, donc dure."],
          ["Par ciel couvert, tout le ciel devient la source : les ombres sont très douces.", true, "La source occupe presque tout le ciel : taille apparente énorme."],
          ["La pénombre est la zone qui ne reçoit aucune lumière de la source.", false, "C’est l’ombre totale. La pénombre reçoit une partie de la lumière."],
          ["Rapprocher le sujet du mur rend son ombre portée plus nette.", true, "La pénombre est proportionnelle à d₂ : elle diminue quand le sujet s’approche du mur."],
          ["Un diffuseur posé sur un panneau de LED supprime les ombres multiples.", true, "Il transforme les nombreuses petites sources en une seule grande source."],
          ["Une source deux fois plus grande placée deux fois plus loin donne à peu près la même dureté.", true, "La taille apparente α ≈ D / d ne change pas."]
        ],
        qcm: [
          ["Qu’est-ce qui rend une lumière douce ?", "Une grande taille apparente : une source grande et/ou proche du sujet", ["Une forte puissance", "Une température de couleur basse", "Une source placée loin du sujet"], "Seule la taille apparente compte."],
          ["Qu’est-ce que la pénombre ?", "La zone qui ne voit qu’une partie de la source", ["La zone qui ne voit rien de la source", "La partie éclairée du visage", "Une gélatine grise"], "Elle reçoit une partie de la lumière : c’est le bord flou de l’ombre."],
          ["Quelle est la différence entre ombre propre et ombre portée ?", "L’ombre propre est sur le sujet ; l’ombre portée est projetée sur une autre surface", ["L’ombre propre est nette, l’ombre portée est floue", "L’ombre propre vient du soleil, l’ombre portée d’un projecteur", "Aucune : ce sont deux noms pour la même chose"], "Propre : sur le sujet. Portée : sur le sol, le mur…"],
          ["Comment durcir les ombres sans changer de projecteur ?", "Éloigner le projecteur (et retirer la diffusion)", ["Rapprocher le projecteur", "Ajouter un grand cadre de diffusion", "Monter la puissance du projecteur"], "En s’éloignant, la source paraît plus petite."],
          ["Pourquoi le soleil donne-t-il des ombres dures ?", "Parce que, vu de la Terre, il paraît minuscule (environ 0,5°)", ["Parce qu’il est très puissant", "Parce que sa lumière est jaune", "Parce qu’il est très chaud"], "Sa taille réelle est énorme, mais sa taille apparente est très petite."],
          ["Quel accessoire agrandit la source vue du sujet ?", "Un grand cadre de diffusion (soie) placé devant le projecteur", ["Des volets (coupe-flux)", "Une gélatine CTO", "Un nid d’abeille"], "Toute la surface du cadre devient la source."],
          ["Un panneau de LED nu éclaire un visage. Que voit-on sur le mur derrière ?", "Plusieurs ombres nettes, légèrement décalées", ["Une seule ombre très floue", "Aucune ombre", "Une ombre colorée en arc-en-ciel"], "Chaque LED est une petite source : elle dessine sa propre ombre."]
        ],
        calculer: [
          () => { const D = C([15, 30, 60, 90, 120]), d1 = C([1, 1.5, 2, 3]), d2 = C([0.5, 1, 1.5, 2]); return { type: "nombre", question: "Une source de <b>" + D + " cm</b> éclaire une tête à <b>" + NB(d1, 1) + " m</b> ; le mur est <b>" + NB(d2, 1) + " m</b> derrière la tête. Largeur de la pénombre sur le mur (cm) ?", reponse: D * d2 / d1, unite: "cm", explication: "p ≈ D × d₂ / d₁ = " + D + " × " + NB(d2, 1) + " / " + NB(d1, 1) + " ≈ " + NB(D * d2 / d1, 1) + " cm.", indice: "p ≈ D × d₂ / d₁ (gardez D en cm : le résultat sera en cm)." }; },
          () => { const D = C([0.3, 0.6, 0.9, 1.2, 2]), d = C([1, 1.5, 2, 3, 4]); return { type: "nombre", question: "Une source de <b>" + NB(D, 1) + " m</b> est à <b>" + NB(d, 1) + " m</b> du sujet. Quelle est, environ, sa taille apparente en degrés ?", reponse: 57.3 * D / d, unite: "°", tolerance: 0.05, explication: "α ≈ 57,3 × " + NB(D, 1) + " / " + NB(d, 1) + " ≈ " + NB(57.3 * D / d, 1) + "°.", indice: "α° ≈ 57,3 × D / d." }; },
          () => { const a = C([2, 3, 4]); return { type: "nombre", question: "On rapproche une boîte à lumière : sa distance au visage est divisée par <b>" + a + "</b>. Par combien sa taille apparente est-elle multipliée ?", reponse: a, unite: "", ecart: 0.01, explication: "α ≈ D / d : si d est divisé par " + a + ", α est multiplié par " + a + ". La lumière est plus douce (et " + a * a + " fois plus forte, loi du carré inverse).", indice: "α ≈ D / d." }; },
          () => { const D = C([0.6, 0.9]), d = C([1, 1.5]), d2 = C([2, 3]); return { type: "nombre", question: "Une boîte de <b>" + NB(D, 1) + " m</b> à <b>" + NB(d, 1) + " m</b> donne la douceur voulue. Il faut la reculer à <b>" + d2 + " m</b>. Quelle taille de source faut-il pour garder la même douceur (en m) ?", reponse: D * d2 / d, unite: "m", explication: "Même taille apparente : D′ / " + d2 + " = " + NB(D, 1) + " / " + NB(d, 1) + " → D′ = " + NB(D * d2 / d, 2) + " m.", indice: "Gardez le rapport D / d constant." }; },
          () => { const D = C([0.05, 0.1, 0.15]), d1 = C([1.5, 2, 2.5]), d2 = C([0.5, 1]); const u = 0.25 + (0.25 - D) * d2 / d1; return { type: "nombre", question: "Une tête de <b>25 cm</b> est éclairée par une source de <b>" + NB(D * 100, 0) + " cm</b> à <b>" + NB(d1, 1) + " m</b> ; le mur est à <b>" + NB(d2, 1) + " m</b> derrière. Largeur de l’ombre totale sur le mur (cm) ?", reponse: u * 100, unite: "cm", explication: "u ≈ h + (h − D) × d₂ / d₁ = 25 + (25 − " + NB(D * 100, 0) + ") × " + NB(d2, 1) + " / " + NB(d1, 1) + " ≈ " + NB(u * 100, 1) + " cm.", indice: "u ≈ h + (h − D) × d₂ / d₁." }; }
        ],
        exercice: [
          () => { const D = C([0.9, 1.2]), d1 = C([1.5, 2]), d2 = 1; return { type: "exercice", question: "Interview : une boîte à lumière de <b>" + NB(D, 1) + " m</b> est placée à <b>" + NB(d1, 1) + " m</b> du visage ; le mur est <b>1 m</b> derrière la personne.", etapes: [
            { question: "Taille apparente de la boîte (en degrés) ?", reponse: 57.3 * D / d1, unite: "°", tolerance: 0.05 },
            { question: "Largeur de la pénombre sur le mur (cm) ?", reponse: D * d2 / d1 * 100, unite: "cm" },
            { question: "Le réalisateur veut une ombre portée plus nette sur le mur. Que faire ?", bonne: "Rapprocher la personne du mur, ou reculer la boîte", mauvaises: ["Rapprocher la boîte du visage", "Ajouter une diffusion devant la boîte", "Poser une gélatine CTO"] }
          ], solution: "a) 57,3 × " + NB(D, 1) + " / " + NB(d1, 1) + " ≈ " + NB(57.3 * D / d1, 0) + "°. b) " + NB(D * 100, 0) + " × 1 / " + NB(d1, 1) + " ≈ " + NB(D * 100 / d1, 0) + " cm. c) Réduire d₂ (personne près du mur) ou augmenter d₁ (boîte plus loin).", indice: "p ≈ D × d₂ / d₁." }; }
        ]
      }
    }
  ]
};
