/* ==========================================================================
   rendu.js — l'image que voit la caméra, calculée par la carte graphique
   --------------------------------------------------------------------------
   Le calcul suit le trajet de la lumière, en quatre étapes :

     1. LES CALQUES → L'IMAGE OPTIQUE (profondeur de champ)
        Chaque calque du décor est « photographié » depuis la caméra, flouté
        selon sa distance au plan net (cercle de confusion), puis les calques
        sont empilés du plus lointain au plus proche. Le flou est calculé
        séparément pour le rouge, le vert et le bleu : c'est ce qui fait
        apparaître l'aberration chromatique longitudinale. La diffraction et
        les aberrations d'ouverture élargissent aussi la tache de flou.
        Les petites LED sont dessinées à part, sous forme de disques qui
        prennent la forme du diaphragme (bokeh) ou d'étoiles (diffraction).

     2. L'OBJECTIF (défauts liés à la position dans l'image)
        Distorsion, aberration chromatique latérale (le rouge et le bleu ne
        sont pas grossis exactement comme le vert) et vignettage.

     3. LE CAPTEUR ET LE TRAITEMENT
        Exposition (ouverture, obturation, ND, gain), balance des blancs,
        bruit, saturation du capteur, puis la courbe de la caméra : gamma,
        master black, black gamma, knee ; enfin détail, saturation, zébra
        et peaking.

     4. LA MESURE : la même image, en petit, est relue pour l'oscilloscope.

   Tout est calculé en lumière « linéaire » (proportionnelle à la lumière
   réelle), dans des images à grande dynamique (16 bits flottants) : une LED
   peut y être 1000 fois plus lumineuse qu'un blanc, comme en vrai.

   Technique : WebGL 2, sans bibliothèque. L'image n'est recalculée que
   lorsqu'un réglage change.
   ========================================================================== */

const Rendu = (function () {
  "use strict";

  const MARGE = 1.06;          // l'image optique déborde de 6 % : la distorsion va chercher des points hors cadre
  const TAILLE_TEXTURE = 2048; // plus grand côté d'un calque photographié
  const SIGNAL = { l: 256, h: 144 };

  let gl = null, toile = null;
  let W = 0, H = 0, WB = 0, HB = 0;   // taille de l'image finale, et de l'image optique (avec marge)
  let maxPrelevements = 96;
  const prog = {}, cible = {}, cache = {};
  let atelier = null, ctxAtelier = null;   // le canvas 2D où l'on dessine chaque calque avant de l'envoyer à la carte graphique
  let anisotropie = null;
  const signal = new Uint8Array(SIGNAL.l * SIGNAL.h * 4);

  /* ------------------------------------------------------------------------
     LES PROGRAMMES (shaders). Le « vertex shader » est commun : un triangle
     qui couvre tout l'écran ; tout le travail se fait pixel par pixel.
     ------------------------------------------------------------------------ */
  const VS_PLEIN = "#version 300 es\nvoid main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }";

  // Un rectangle placé en pixels (pour les points lumineux).
  const VS_RECT = "#version 300 es\nuniform vec4 uRect; uniform vec2 uTaille;\nvoid main(){ vec2 c = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0; vec2 p = uRect.xy + c * uRect.zw; gl_Position = vec4(p / uTaille * 2.0 - 1.0, 0.0, 1.0); }";

  /* ÉTAPE 1 — un calque, flouté selon sa profondeur.
     Pour chaque pixel : on lance le rayon correspondant, on trouve où il
     touche le plan du calque et à quelle profondeur, on en déduit le rayon
     de la tache de flou (par couleur), puis on fait la moyenne du calque
     sur un disque de ce rayon (jusqu'à 96 prélèvements disposés en spirale). */
  const FS_CALQUE = `#version 300 es
precision highp float;
precision highp sampler2D;
#define MAXT __MAXT__
uniform sampler2D uTex;
uniform vec2 uCentre, uDecal;      // pixel -> coordonnées sur le capteur (focale = 1)
uniform float uInvF;
uniform mat3 uRot;                 // orientation de la caméra (panoramique, inclinaison)
uniform vec3 uCam;
uniform vec3 uO, uU, uV, uNrm;     // le plan du calque : coin haut gauche, axes, normale
uniform vec4 uFen;                 // partie du calque présente dans la texture
uniform float uSol, uCamY;         // le sol : la profondeur change à chaque ligne
uniform float uK1, uDNette;        // rayon de flou (px) = K1 x (1/profondeur - dioptries du plan net)
uniform vec3 uLoca, uDiff2;        // décalage de foyer par couleur ; (rayon de diffraction)² par couleur
uniform vec2 uSph;                 // (rayon d'aberration d'ouverture)², aggravation sur les bords
uniform float uRho;
uniform float uTexel, uGain;
uniform vec3 uTeinte;
uniform vec3 uLames;               // nombre de lames, part de polygone, rotation
uniform vec3 uRoue; uniform vec2 uDim; uniform float uAngle, uBalayage; uniform int uRoueN;
layout(location = 0) out vec4 oCouleur;
layout(location = 1) out vec4 oOpacite;

vec4 lire(vec2 s, float lod, float angle) {
  vec3 d = uRot * vec3(s, 1.0);
  float t = dot(uO - uCam, uNrm) / dot(d, uNrm);
  if (t <= 0.0) return vec4(0.0);
  vec3 P = uCam + t * d - uO;
  vec2 uv = vec2(dot(P, uU), dot(P, uV));
  if (uRoue.z > 0.0) {             // la roue : on fait tourner l'intérieur du disque
    vec2 q = uv * uDim - uRoue.xy;
    if (dot(q, q) < uRoue.z * uRoue.z) { float c = cos(angle), sn = sin(angle); uv = (vec2(c * q.x + sn * q.y, c * q.y - sn * q.x) + uRoue.xy) / uDim; }
  }
  vec2 tc = (uv - uFen.xy) * uFen.zw;
  if (tc.x < 0.0 || tc.y < 0.0 || tc.x > 1.0 || tc.y > 1.0) return vec4(0.0);
  return textureLod(uTex, tc, lod);
}

void main() {
  vec2 s = (gl_FragCoord.xy - uCentre) * uInvF + uDecal;
  vec3 d = uRot * vec3(s, 1.0);
  float t = dot(uO - uCam, uNrm) / dot(d, uNrm);
  float prof = t;
  if (uSol > 0.5) { float dy = -t * d.y; prof = dy > 1e-4 ? t * uCamY / dy : 1e4; }
  if (t <= 0.0) prof = 1e4;
  // Le rayon de la tache de flou, pour le rouge, le vert et le bleu
  float geo = uK1 * (1.0 / max(prof, 0.05) - uDNette);
  float rho2 = dot(s, s) * uRho * uRho;
  vec3 r = sqrt((geo + uLoca) * (geo + uLoca) + uDiff2 + uSph.x * (1.0 + uSph.y * rho2));
  float rmax = max(r.r, max(r.g, r.b));
  float lod0 = log2(max(uTexel, 1.0));
  if (rmax <= 0.6 && uRoueN <= 1) {  // net : un seul prélèvement suffit
    vec4 c = lire(s, lod0, uAngle);
    oCouleur = vec4(c.rgb * uTeinte * uGain, 1.0); oOpacite = vec4(vec3(c.a), 1.0);
    return;
  }
  int n = clamp(int(6.0 + 0.36 * rmax * rmax), max(8, uRoueN), MAXT);
  float pas = rmax * sqrt(3.14159 / float(n));     // écart moyen entre deux prélèvements
  float lod = log2(max(uTexel * max(pas * 0.8, 1.0), 1.0));
  float bord = max(1.0, pas * 0.5);
  float seg = 6.2831853 / uLames.x;
  vec3 C = vec3(0.0), A = vec3(0.0), P = vec3(1e-5);
  for (int i = 0; i < MAXT; i++) {
    if (i >= n) break;
    float k = (float(i) + 0.5) / float(n);
    float rr = sqrt(k) * rmax, a = float(i) * 2.39996323;
    float aa = mod(a + uLames.z, seg) - 0.5 * seg;
    float forme = mix(1.0, cos(0.5 * seg) / cos(aa), uLames.y);   // disque -> polygone du diaphragme
    vec4 c = lire(s + vec2(cos(a), sin(a)) * rr * forme * uInvF, lod, uAngle + (fract(float(i) * 0.61803) - 0.5) * uBalayage);
    vec3 p = clamp((r - rr) / bord + 0.5, 0.0, 1.0);              // ce prélèvement compte-t-il pour chaque couleur ?
    C += p * c.rgb; A += p * c.a; P += p;
  }
  oCouleur = vec4(C / P * uTeinte * uGain, 1.0);
  oOpacite = vec4(A / P, 1.0);
}`;

  // Recopie d'une image (sert à empiler un calque sur les précédents).
  const FS_COPIE = "#version 300 es\nprecision highp float;\nuniform sampler2D uT; out vec4 o;\nvoid main(){ o = texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }";

  /* Un point lumineux : un disque de la taille de sa tache de flou, de la
     forme du diaphragme ; rogné en « œil de chat » sur les bords à pleine
     ouverture ; entouré d'une étoile de diffraction quand le diaphragme est
     fermé et que le point est net. */
  const FS_LUMIERE = `#version 300 es
precision highp float;
uniform vec2 uPos;
uniform vec3 uR, uI;               // rayon et intensité, par couleur
uniform vec3 uLames;
uniform vec3 uChat;                // second cercle (centre décalé, rayon) : l'ombre de la monture
uniform vec4 uEtoile;              // intensité, longueur, nombre de lignes, rotation
uniform vec3 uCoul;
out vec4 o;
void main() {
  vec2 p = gl_FragCoord.xy - uPos;
  float d = length(p), a = atan(p.y, p.x);
  float seg = 6.2831853 / uLames.x;
  float aa = mod(a + uLames.z, seg) - 0.5 * seg;
  float dp = d * mix(1.0, cos(aa) / cos(0.5 * seg), uLames.y);
  vec3 disque = clamp(uR - dp + 0.5, 0.0, 1.0) * (1.0 + 0.3 * smoothstep(0.72, 1.0, dp / uR));
  float chat = clamp(uChat.z - length(p - uChat.xy) + 0.5, 0.0, 1.0);
  vec3 c = uI * disque * chat;
  if (uEtoile.x > 0.0) {
    float e = 0.0;
    for (int k = 0; k < 12; k++) {
      if (float(k) >= uEtoile.z) break;
      float an = uEtoile.w + 3.14159265 * float(k) / uEtoile.z;
      vec2 dir = vec2(cos(an), sin(an));
      float le = abs(dot(p, dir)) / uEtoile.y, tr = dot(p, vec2(-dir.y, dir.x));
      e += exp(-tr * tr / (0.5 + 0.25 / (1.0 + le))) / pow(1.0 + le * le, 1.25) * smoothstep(9.0, 4.0, le);
    }
    c += uCoul * e * uEtoile.x;
  }
  o = vec4(c, 1.0);
}`;

  /* ÉTAPE 2 — l'objectif : distorsion, aberration chromatique latérale,
     vignettage. Pour l'aberration latérale, on lit l'image plusieurs fois, à
     des grossissements légèrement différents (du bleu au rouge, comme un
     petit spectre), puis on recompose : les bords contrastés se frangent de
     couleur vers les coins. */
  const FS_OBJECTIF = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uAcc;
uniform vec2 uCentre, uCentreB, uDecalMm;   // centre de l'image finale, de l'image optique ; décalage de la loupe (mm)
uniform float uPxMm, uDemiDiag;
uniform float uDist, uAcLat;
uniform vec3 uVig;                           // tan(angle au coin), exposant du cosinus, perte mécanique au coin
uniform vec2 uInvB;
out vec4 o;
vec3 lire(vec2 q, float k) { return texture(uAcc, ((q * k * uDemiDiag - uDecalMm) * uPxMm + uCentreB) * uInvB).rgb; }
void main() {
  vec2 q = ((gl_FragCoord.xy - uCentre) / uPxMm + uDecalMm) / uDemiDiag;   // position sur le capteur : 1 = le coin
  float rho2 = dot(q, q);
  float kd = 1.0 - uDist * rho2;                                           // distorsion
  float ka = 0.8 * uAcLat * (0.5 + 0.5 * rho2);                            // écart de grossissement entre le vert et les extrémités du spectre
  float ecart = abs(ka) * sqrt(rho2) * uDemiDiag * uPxMm;                  // le même écart, en pixels
  vec3 c;
  if (ecart < 0.12) c = lire(q, kd);
  else {
    // D'autant plus de lectures que la frange est large (pour un dégradé continu, sans perles).
    int n = clamp(int(ecart * 1.6) + 3, 3, 16);
    vec3 somme = vec3(0.0), poids = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      if (i >= n) break;
      float w = -1.0 + 2.0 * (float(i) + 0.5) / float(n);                  // -1 = bleu ... +1 = rouge
      vec3 p = max(vec3(0.0), 1.0 - abs(w - vec3(0.75, 0.0, -0.75)) / 0.75);
      somme += p * lire(q, kd * (1.0 + ka * w)); poids += p;
    }
    c = somme / max(poids, vec3(1e-4));
  }
  float x = sqrt(rho2) * uVig.x;
  float tt = clamp((sqrt(rho2) - 0.15) / 0.85, 0.0, 1.0);
  float vig = pow(1.0 + x * x, -0.5 * uVig.y) * (1.0 - uVig.z * tt * tt);
  o = vec4(c * vig, 1.0);
}`;

  /* ÉTAPE 3 — le capteur et le traitement vidéo.
     La fonction « signal » est la copie exacte d'Optique.signal (optique.js). */
  const FS_CAPTEUR = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uOpt;
uniform vec2 uInv;                 // 1 / taille de la sortie
uniform vec2 uPasTexel;            // un pixel de l'image optique
uniform float uExpo, uSature;
uniform vec3 uBlanc;               // gains de la balance des blancs
uniform vec2 uBruit; uniform uint uGraine;
uniform int uGamma; uniform float uExposant;
uniform float uMasterBlack; uniform vec2 uBlackGamma;   // amplitude, plage
uniform vec3 uKnee;                // actif, point, pente
uniform float uSaturation, uDetail;
uniform int uZebra, uPeaking, uMesure;
out vec4 o;

uint hu(uint x) { x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }
float h01(uint x) { return float(hu(x) >> 8) / 16777216.0; }
vec3 gauss(uint g) {               // bruit à peu près gaussien : somme de quatre tirages
  vec3 n = vec3(0.0);
  for (uint i = 0u; i < 4u; i++) n += vec3(h01(g + i * 3u), h01(g + i * 3u + 1u), h01(g + i * 3u + 2u));
  return (n - 2.0) * 1.7320508;
}
float courbe(float x) {
  float v;
  if (uGamma == 2) v = x >= 0.01125 ? (420.0 + log(( x + 0.01) / 0.19) / 2.302585 * 261.5) / 1023.0 : (x * 76.2102946929 / 0.01125 + 95.0) / 1023.0;
  else {
    v = x < 0.018 ? 4.5 * x : 1.099 * pow(x, uExposant) - 0.099;
    if (uGamma == 1) { v = 0.02 + 0.94 * v; if (v > 0.55) v = 0.55 + 0.47 * (1.0 - exp(-(v - 0.55) / 0.47)); }
  }
  v += uMasterBlack * (1.0 - v);
  float tt = v / uBlackGamma.y;
  if (tt > 0.0 && tt < 1.0) v += uBlackGamma.x * 6.75 * tt * (1.0 - tt) * (1.0 - tt);
  if (uKnee.x > 0.5 && v > uKnee.y) v = uKnee.y + (v - uKnee.y) * uKnee.z;
  return clamp(v, 0.0, 1.09);
}
vec3 capter(vec2 uv, bool bruite) {
  vec3 x = texture(uOpt, uv).rgb * uExpo * uBlanc;
  if (bruite) { ivec2 p = ivec2(gl_FragCoord.xy); x += gauss(hu(uint(p.x) ^ hu(uint(p.y) ^ hu(uGraine)))) * sqrt(uBruit.x + uBruit.y * max(x, 0.0)); }
  x = clamp(x, 0.0, uSature);
  return vec3(courbe(x.r), courbe(x.g), courbe(x.b));
}
float luma(vec3 v) { return dot(v, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec2 uv = gl_FragCoord.xy * uInv;
  vec3 v = capter(uv, true);
  float y = luma(v);
  float contour = 0.0;
  if (uDetail != 0.0 || uPeaking == 1) {
    float g = luma(capter(uv - vec2(uPasTexel.x, 0.0), false)), d = luma(capter(uv + vec2(uPasTexel.x, 0.0), false));
    float b = luma(capter(uv - vec2(0.0, uPasTexel.y), false)), h = luma(capter(uv + vec2(0.0, uPasTexel.y), false));
    float fin = 4.0 * y - g - d - b - h;                   // ce qui distingue ce pixel de ses voisins : les détails fins
    v += uDetail * fin;                                    // détail : on renforce les contours
    contour = abs(fin);                                    // peaking : seuls les contours vraiment nets ressortent
  }
  y = luma(v);
  v = clamp(y + (v - y) * uSaturation, 0.0, 1.09);
  if (uMesure == 1) { o = vec4(v / 1.2, 1.0); return; }    // pour l'oscilloscope
  vec3 c = v / 1.09;
  float raie = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 7.0));
  if (uZebra == 1 && y > 0.67 && y < 0.73) c = mix(c, vec3(raie), 0.75);
  if (uZebra == 2 && y >= 0.995) c = mix(c, vec3(raie), 0.85);
  if (uPeaking == 1 && contour > 0.16) c = mix(c, vec3(1.0, 0.1, 0.12), clamp((contour - 0.16) * 9.0, 0.0, 1.0));
  o = vec4(c, 1.0);
}`;

  /* ------------------------------------------------------------------------
     MISE EN ROUTE
     ------------------------------------------------------------------------ */
  function compiler(vs, fs) {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (s) {
      const sh = gl.createShader(s[0]);
      gl.shaderSource(sh, s[1]); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(p, sh);
    });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    // On range l'adresse de chaque « uniform » (les réglages envoyés au shader).
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const nom = gl.getActiveUniform(p, i).name; u[nom] = gl.getUniformLocation(p, nom); }
    return { p: p, u: u };
  }

  function texture(l, h, flottant) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (flottant) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, l, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, l, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function tampon(textures) {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    textures.forEach(function (t, i) { gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0); });
    gl.drawBuffers(textures.map(function (t, i) { return gl.COLOR_ATTACHMENT0 + i; }));
    return f;
  }

  // Renvoie null si tout va bien, sinon un message à afficher à la place de l'image.
  function init(canvas, options) {
    toile = canvas;
    gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) return "Ce navigateur ne propose pas WebGL 2, nécessaire pour calculer l’image de la caméra. Essaie avec une version récente de Firefox, Chrome, Edge ou Safari.";
    if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return "La carte graphique de cet appareil ne sait pas calculer en grande dynamique : l’image de la caméra ne peut pas être affichée ici.";
    anisotropie = gl.getExtension("EXT_texture_filter_anisotropic");
    if (options && options.leger) maxPrelevements = 48;
    try {
      prog.calque = compiler(VS_PLEIN, FS_CALQUE.replace("__MAXT__", String(maxPrelevements)));
      prog.copie = compiler(VS_PLEIN, FS_COPIE);
      prog.lumiere = compiler(VS_RECT, FS_LUMIERE);
      prog.objectif = compiler(VS_PLEIN, FS_OBJECTIF);
      prog.capteur = compiler(VS_PLEIN, FS_CAPTEUR);
    } catch (erreur) {
      console.error(erreur);
      return "Le calcul de l’image n’a pas pu démarrer sur cette carte graphique.";
    }
    cible.texSignal = texture(SIGNAL.l, SIGNAL.h, false);
    cible.signal = tampon([cible.texSignal]);
    atelier = document.createElement("canvas");
    ctxAtelier = atelier.getContext("2d");
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.bindVertexArray(gl.createVertexArray());
    return null;
  }

  // Fixe la taille de l'image calculée (et recrée les images intermédiaires).
  function taille(l, h) {
    l = Math.max(64, Math.round(l)); h = Math.max(36, Math.round(h));
    if (l === W && h === H) return;
    W = l; H = h; WB = Math.ceil(W * MARGE); HB = Math.ceil(H * MARGE);
    toile.width = W; toile.height = H;
    ["texAcc", "texC", "texA", "texOpt"].forEach(function (n) { if (cible[n]) gl.deleteTexture(cible[n]); });
    ["acc", "calque", "opt"].forEach(function (n) { if (cible[n]) gl.deleteFramebuffer(cible[n]); });
    cible.texAcc = texture(WB, HB, true); cible.acc = tampon([cible.texAcc]);
    cible.texC = texture(WB, HB, true); cible.texA = texture(WB, HB, true); cible.calque = tampon([cible.texC, cible.texA]);
    cible.texOpt = texture(W, H, true); cible.opt = tampon([cible.texOpt]);
    complet = false;
  }
  let complet = false;   // l'image optique en mémoire est-elle à jour partout ? (sinon, pas de rendu partiel)

  /* ------------------------------------------------------------------------
     GÉOMÉTRIE DE LA PRISE DE VUE
     ------------------------------------------------------------------------ */
  function camera(v) {
    const cp = Math.cos(v.pan), sp = Math.sin(v.pan), ct = Math.cos(v.tilt), st = Math.sin(v.tilt);
    const cap = v.cfg.capteur, f = v.calc.f, zoom = v.loupe.zoom;
    const g = {
      pos: [0, Decor.CAM_Y, v.camZ],
      droite: [cp, 0, -sp], haut: [-sp * st, ct, -cp * st], avant: [sp * ct, st, cp * ct],
      fpx: f / cap.l * W * zoom,                        // focale exprimée en pixels
      pxMm: W * zoom / cap.l,                           // pixels par millimètre de capteur
      cx: v.loupe.x * cap.l / 2 / f, cy: v.loupe.y * cap.h / 2 / f
    };
    g.rot = new Float32Array([g.droite[0], g.droite[1], g.droite[2], g.haut[0], g.haut[1], g.haut[2], g.avant[0], g.avant[1], g.avant[2]]);
    return g;
  }
  // Un point du plateau -> pixel de l'image optique (ou null s'il est derrière la caméra).
  function projeter(g, X, Y, Z) {
    const x = X - g.pos[0], y = Y - g.pos[1], z = Z - g.pos[2];
    const pz = x * g.avant[0] + y * g.avant[1] + z * g.avant[2];
    if (pz < 0.25) return null;
    const px = x * g.droite[0] + y * g.droite[1] + z * g.droite[2], py = x * g.haut[0] + y * g.haut[1] + z * g.haut[2];
    return [(px / pz - g.cx) * g.fpx + WB / 2, (py / pz - g.cy) * g.fpx + HB / 2, pz];
  }
  // Le rayon qui part d'un pixel de l'image optique.
  function rayon(g, px, py) {
    const sx = (px - WB / 2) / g.fpx + g.cx, sy = (py - HB / 2) / g.fpx + g.cy;
    return [sx * g.droite[0] + sy * g.haut[0] + g.avant[0], sx * g.droite[1] + sy * g.haut[1] + g.avant[1], sx * g.droite[2] + sy * g.haut[2] + g.avant[2]];
  }
  // Rayons de la tache de flou (pixels) pour le rouge, le vert, le bleu, à la profondeur donnée.
  function rayonsFlou(v, g, prof, coin) {
    const c = v.calc, d = c.defauts, k = 0.5 * g.pxMm / c.N;
    const geo = k * c.f * c.f * 1e-3 * (1 / Math.max(prof, 0.05) - c.dNette);
    const sph = Math.pow(d.spherique * g.pxMm, 2) * (coin ? d.bords * d.bords : 1);
    return [1, 0, 0.7].map(function (q, i) {
      return Math.sqrt(Math.pow(geo + q * d.acLon * k, 2) + Math.pow(d.diffraction[i] * g.pxMm, 2) + sph);
    });
  }

  /* ------------------------------------------------------------------------
     PHOTOGRAPHIER UN CALQUE : on redessine en vectoriel la partie visible, à
     la résolution utile (plus fine au téléobjectif, plus grossière si le
     calque est très flou). On ne recommence que lorsque c'est nécessaire.
     ------------------------------------------------------------------------ */
  function preparer(k, v, g) {
    // Le plan du calque sur le plateau (le sol passe par son « calque virtuel » à 1 m de la caméra).
    let plan;
    if (k.sol) { const geo = Decor.solGeometrie(v.camZ); plan = { x: -geo.l / 2, haut: Decor.CAM_Y - geo.yLoin, z: v.camZ + 1, l: geo.l, h: geo.h }; }
    else plan = { x: k.x, haut: k.y + k.h, z: k.z, l: k.l, h: k.h };
    const prof = plan.z - v.camZ;
    if (prof < 0.3) return null;                      // derrière la caméra
    const flou = k.sol ? 0 : Math.max.apply(null, rayonsFlou(v, g, prof, true));
    // Quelle partie du calque est dans l'image ? On lance les quatre coins (élargis du flou).
    const m = flou + 6;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    [[-m, -m], [WB + m, -m], [-m, HB + m], [WB + m, HB + m]].forEach(function (p) {
      const d = rayon(g, p[0], p[1]);
      const t = d[2] > 0.02 ? (plan.z - g.pos[2]) / d[2] : 1e4;
      const lx = g.pos[0] + t * d[0] - plan.x, ly = plan.haut - (g.pos[1] + t * d[1]);
      x0 = Math.min(x0, lx); x1 = Math.max(x1, lx); y0 = Math.min(y0, ly); y1 = Math.max(y1, ly);
    });
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(plan.l, x1); y1 = Math.min(plan.h, y1);
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return null; // hors champ

    // Résolution utile (pixels par mètre) : celle de l'écran à cette distance, moins si c'est flou.
    const utile = Math.max(g.fpx / prof / Math.max(1, flou / 2.5), 12);
    let c = cache[k.id];
    const cle = k.sol ? v.camZ : 0;
    const couvert = c && c.cle === cle && c.x0 <= x0 + 1e-6 && c.y0 <= y0 + 1e-6 && c.x1 >= x1 - 1e-6 && c.y1 >= y1 - 1e-6;
    const plafond = TAILLE_TEXTURE / Math.max(x1 - x0, y1 - y0);
    if (!couvert || c.ppm < 0.8 * Math.min(utile, plafond * 0.75)) {
      // On prend de la marge autour, pour ne pas recommencer au moindre panoramique ou coup de zoom.
      const mx = (x1 - x0) * 0.25, my = (y1 - y0) * 0.25;
      const fx0 = Math.max(0, x0 - mx), fy0 = Math.max(0, y0 - my), fx1 = Math.min(plan.l, x1 + mx), fy1 = Math.min(plan.h, y1 + my);
      const ppm = Math.min(utile * 1.3, TAILLE_TEXTURE / Math.max(fx1 - fx0, fy1 - fy0));
      const tl = Math.max(2, Math.ceil((fx1 - fx0) * ppm)), th = Math.max(2, Math.ceil((fy1 - fy0) * ppm));
      atelier.width = tl; atelier.height = th;
      ctxAtelier.setTransform(ppm, 0, 0, ppm, -fx0 * ppm, -fy0 * ppm);
      const fen = { x0: fx0, y0: fy0, x1: fx1, y1: fy1 };
      if (k.sol) Decor.dessinerSol(ctxAtelier, ppm, fen, v.camZ); else k.dessiner(ctxAtelier, ppm, fen);
      if (!c) { c = cache[k.id] = { tex: gl.createTexture() }; }
      gl.bindTexture(gl.TEXTURE_2D, c.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, atelier);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (anisotropie) gl.texParameterf(gl.TEXTURE_2D, anisotropie.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      c.x0 = fx0; c.y0 = fy0; c.x1 = fx1; c.y1 = fy1; c.ppm = ppm; c.cle = cle;
      c.tl = tl; c.th = th;
    }
    // Le rectangle de l'image que ce calque peut toucher (inutile de calculer ailleurs).
    let bx0 = 0, by0 = 0, bx1 = WB, by1 = HB;
    if (!k.sol) {
      bx0 = by0 = 1e9; bx1 = by1 = -1e9;
      let devant = true;
      [[k.x, k.y], [k.x + k.l, k.y], [k.x, k.y + k.h], [k.x + k.l, k.y + k.h]].forEach(function (p) {
        const q = projeter(g, p[0], p[1], k.z);
        if (!q) { devant = false; return; }
        bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); by0 = Math.min(by0, q[1]); by1 = Math.max(by1, q[1]);
      });
      if (!devant) { bx0 = 0; by0 = 0; bx1 = WB; by1 = HB; }
      bx0 = Math.max(0, Math.floor(bx0 - m)); by0 = Math.max(0, Math.floor(by0 - m)); bx1 = Math.min(WB, Math.ceil(bx1 + m)); by1 = Math.min(HB, Math.ceil(by1 + m));
      if (bx1 <= bx0 || by1 <= by0) return null;
    }
    return { plan: plan, prof: prof, cache: c, zone: [bx0, by0, bx1, by1] };
  }

  function ciseaux(z, limite) {      // limite le calcul à l'intersection de deux rectangles
    const x0 = Math.max(z[0], limite[0]), y0 = Math.max(z[1], limite[1]), x1 = Math.min(z[2], limite[2]), y1 = Math.min(z[3], limite[3]);
    if (x1 <= x0 || y1 <= y0) return false;
    gl.scissor(x0, y0, x1 - x0, y1 - y0);
    return true;
  }
  function triangle() { gl.drawArrays(gl.TRIANGLES, 0, 3); }

  /* ------------------------------------------------------------------------
     LE RENDU — v contient tout l'état : configuration, réglages, résultat
     d'Optique.calculer, position de la caméra, loupe, roue, aides.
     partiel = true : seule la roue a bougé, on ne recalcule que son rectangle.
     ------------------------------------------------------------------------ */
  function rendre(v, partiel) {
    if (!gl || !W) return 0;
    const debut = performance.now();
    const g = camera(v), calc = v.calc, d = calc.defauts;
    const lames = [v.cfg.objectif.lames, calc.polygone, 0.35];
    const teinte = Optique.couleurTemperature(v.commun.kelvin);
    const k1 = 0.5 * g.pxMm / calc.N * calc.f * calc.f * 1e-3;
    const loca = [1, 0, 0.7].map(function (q) { return q * d.acLon * 0.5 * g.pxMm / calc.N; });
    const diff2 = d.diffraction.map(function (r) { return Math.pow(r * g.pxMm, 2); });

    // Préparation des calques, et zone à recalculer.
    const infos = Decor.calques.map(function (k) { return preparer(k, v, g); });
    let limite = [0, 0, WB, HB];
    if (partiel && complet) {
      const i = Decor.calques.findIndex(function (k) { return k.roue; });
      if (!infos[i]) limite = null; else limite = infos[i].zone;
    }

    gl.disable(gl.BLEND);
    if (limite) {
      gl.enable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, WB, HB);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cible.acc);
      ciseaux(limite, limite);
      gl.clearColor(0.004, 0.004, 0.006, 1); gl.clear(gl.COLOR_BUFFER_BIT);

      Decor.calques.forEach(function (k, i) {
        const info = infos[i];
        if (info && ciseaux(info.zone, limite)) {
          const c = info.cache, p = info.plan, u = prog.calque.u;
          // a) le calque flouté, dans deux images : sa couleur et son opacité (par couleur)
          gl.bindFramebuffer(gl.FRAMEBUFFER, cible.calque);
          gl.useProgram(prog.calque.p);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.tex); gl.uniform1i(u.uTex, 0);
          gl.uniform2f(u.uCentre, WB / 2, HB / 2); gl.uniform2f(u.uDecal, g.cx, g.cy); gl.uniform1f(u.uInvF, 1 / g.fpx);
          gl.uniformMatrix3fv(u.uRot, false, g.rot); gl.uniform3fv(u.uCam, g.pos);
          gl.uniform3f(u.uO, p.x, p.haut, p.z); gl.uniform3f(u.uU, 1 / p.l, 0, 0); gl.uniform3f(u.uV, 0, -1 / p.h, 0); gl.uniform3f(u.uNrm, 0, 0, 1);
          gl.uniform4f(u.uFen, c.x0 / p.l, c.y0 / p.h, p.l / (c.x1 - c.x0), p.h / (c.y1 - c.y0));
          gl.uniform1f(u.uSol, k.sol ? 1 : 0); gl.uniform1f(u.uCamY, Decor.CAM_Y);
          gl.uniform1f(u.uK1, k1); gl.uniform1f(u.uDNette, calc.dNette);
          gl.uniform3fv(u.uLoca, loca); gl.uniform3fv(u.uDiff2, diff2);
          gl.uniform2f(u.uSph, Math.pow(d.spherique * g.pxMm, 2), d.bords * d.bords - 1);
          gl.uniform1f(u.uRho, calc.f / calc.demiDiag);
          gl.uniform1f(u.uTexel, c.ppm * info.prof / g.fpx);
          gl.uniform1f(u.uGain, k.gain);
          gl.uniform3fv(u.uTeinte, k.eclaire ? teinte : [1, 1, 1]);
          gl.uniform3fv(u.uLames, lames);
          if (k.roue) {
            const rpx = k.roue.r * g.fpx / info.prof;
            gl.uniform3f(u.uRoue, k.roue.cx, k.roue.cy, k.roue.r); gl.uniform2f(u.uDim, k.l, k.h);
            gl.uniform1f(u.uAngle, v.roueAngle); gl.uniform1f(u.uBalayage, v.roueBalayage);
            gl.uniform1i(u.uRoueN, Math.min(maxPrelevements, Math.ceil(v.roueBalayage * rpx / 1.5)));
          } else { gl.uniform3f(u.uRoue, 0, 0, 0); gl.uniform1i(u.uRoueN, 0); gl.uniform1f(u.uAngle, 0); gl.uniform1f(u.uBalayage, 0); }
          triangle();
          // b) empilement : ce qui était derrière est atténué par l'opacité, puis on ajoute la couleur
          gl.bindFramebuffer(gl.FRAMEBUFFER, cible.acc);
          gl.useProgram(prog.copie.p); gl.uniform1i(prog.copie.u.uT, 0);
          gl.enable(gl.BLEND);
          gl.bindTexture(gl.TEXTURE_2D, cible.texA); gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR); triangle();
          gl.bindTexture(gl.TEXTURE_2D, cible.texC); gl.blendFunc(gl.ONE, gl.ONE); triangle();
          gl.disable(gl.BLEND);
        }
        // c) les points lumineux placés juste devant ce calque
        gl.bindFramebuffer(gl.FRAMEBUFFER, cible.acc);
        Decor.lumieres.forEach(function (l) { if (l.apres === k.id) lumiere(l, v, g, lames, limite); });
      });
      gl.disable(gl.SCISSOR_TEST);
      complet = true;
    }

    // ÉTAPE 2 : l'objectif
    gl.bindFramebuffer(gl.FRAMEBUFFER, cible.opt);
    gl.viewport(0, 0, W, H);
    let u = prog.objectif.u;
    gl.useProgram(prog.objectif.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cible.texAcc); gl.uniform1i(u.uAcc, 0);
    gl.uniform2f(u.uCentre, W / 2, H / 2); gl.uniform2f(u.uCentreB, WB / 2, HB / 2);
    gl.uniform2f(u.uDecalMm, v.loupe.x * v.cfg.capteur.l / 2, v.loupe.y * v.cfg.capteur.h / 2);
    gl.uniform1f(u.uPxMm, g.pxMm); gl.uniform1f(u.uDemiDiag, calc.demiDiag);
    gl.uniform1f(u.uDist, d.distorsion); gl.uniform1f(u.uAcLat, d.acLat);
    gl.uniform3f(u.uVig, d.tanMax, d.cosP, 1 - Math.pow(2, -d.vignettage));
    gl.uniform2f(u.uInvB, 1 / WB, 1 / HB);
    triangle();

    // ÉTAPE 3 : le capteur et le traitement, vers l'écran
    capteur(v, false);
    // ÉTAPE 4 : la même chose en petit, pour l'oscilloscope (la relecture attend la fin du calcul)
    capteur(v, true);
    gl.readPixels(0, 0, SIGNAL.l, SIGNAL.h, gl.RGBA, gl.UNSIGNED_BYTE, signal);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return performance.now() - debut;
  }

  let graine = 1;
  function capteur(v, mesure) {
    const r = v.r, calc = v.calc, u = prog.capteur.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, mesure ? cible.signal : null);
    if (mesure) gl.viewport(0, 0, SIGNAL.l, SIGNAL.h); else gl.viewport(0, 0, W, H);
    gl.useProgram(prog.capteur.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cible.texOpt); gl.uniform1i(u.uOpt, 0);
    if (mesure) gl.uniform2f(u.uInv, 1 / SIGNAL.l, 1 / SIGNAL.h); else gl.uniform2f(u.uInv, 1 / W, 1 / H);
    gl.uniform2f(u.uPasTexel, 1 / W, 1 / H);
    gl.uniform1f(u.uExpo, calc.expo); gl.uniform1f(u.uSature, v.cfg.saturationCapteur);
    // Balance des blancs : on divise par la couleur de la lumière pour laquelle la caméra est réglée.
    const b = Optique.couleurTemperature(r.blanc);
    gl.uniform3f(u.uBlanc, 1 / b[0], 1 / b[1], 1 / b[2]);
    gl.uniform2f(u.uBruit, calc.bruit.a2, calc.bruit.b2); gl.uniform1ui(u.uGraine, graine);
    gl.uniform1i(u.uGamma, r.gamma === "slog3" ? 2 : r.gamma === "scinetone" ? 1 : 0);
    gl.uniform1f(u.uExposant, 0.45 * Math.pow(2, -0.35 * (r.masterGamma || 0)));
    gl.uniform1f(u.uMasterBlack, (r.masterBlack || 0) * 0.004);
    const plage = [0.14, 0.24, 0.38][r.bgPlage || 0], niveau = (r.bgNiveau || 0) / 7;
    gl.uniform2f(u.uBlackGamma, (niveau > 0 ? 0.4 : 0.14) * niveau * plage, plage);
    gl.uniform3f(u.uKnee, r.knee ? 1 : 0, r.kneePoint / 100, Optique.pente(r));
    gl.uniform1f(u.uSaturation, 1 + (r.saturation || 0) / 10);
    gl.uniform1f(u.uDetail, (r.detail || 0) * 0.09);
    gl.uniform1i(u.uZebra, mesure ? 0 : v.aides.zebra); gl.uniform1i(u.uPeaking, mesure ? 0 : (v.aides.peaking ? 1 : 0));
    gl.uniform1i(u.uMesure, mesure ? 1 : 0);
    triangle();
  }

  // Un point lumineux (voir FS_LUMIERE).
  function lumiere(l, v, g, lames, limite) {
    const q = projeter(g, l.x, l.y, l.z);
    if (!q) return;
    const calc = v.calc, d = calc.defauts;
    const r0 = 0.5 * l.diam * g.fpx / q[2];                    // rayon de l'image nette de la LED
    const flou = rayonsFlou(v, g, q[2], false);
    const R = flou.map(function (f) { return Math.max(0.75, Math.hypot(r0, f)); });
    const rmax = Math.max(R[0], R[1], R[2]);
    // Étoile de diffraction : d'autant plus longue que le diaphragme est fermé, seulement si le point est net.
    const niveau = v.commun.defauts.niveau * (v.commun.defauts.diffraction ? 1 : 0);
    const rayonDiff = 0.00054 * calc.N * g.pxMm * niveau;
    const nettete = Math.max(0, 1 - Math.max(0, rmax - 1 - rayonDiff) / 3);
    const force = Math.pow(Math.min(1, Math.max(0, (calc.N - 3.5) / 12.5)), 1.5) * nettete;
    const longueur = Math.max(1.2, rayonDiff * 4.5);
    const lignes = lames[0] % 2 ? lames[0] : lames[0] / 2;
    const demi = Math.max(rmax + 2, force > 0.01 ? longueur * 9 : 0);
    if (q[0] + demi < 0 || q[0] - demi > WB || q[1] + demi < 0 || q[1] - demi > HB) return;
    if (!ciseaux([Math.floor(q[0] - demi), Math.floor(q[1] - demi), Math.ceil(q[0] + demi), Math.ceil(q[1] + demi)], limite)) return;
    const u = prog.lumiere.u, flux = l.lum * r0 * r0;
    gl.useProgram(prog.lumiere.p);
    gl.uniform4f(u.uRect, q[0], q[1], demi, demi); gl.uniform2f(u.uTaille, WB, HB);
    gl.uniform2f(u.uPos, q[0], q[1]);
    gl.uniform3fv(u.uR, R);
    gl.uniform3f(u.uI, l.couleur[0] * flux / (R[0] * R[0]), l.couleur[1] * flux / (R[1] * R[1]), l.couleur[2] * flux / (R[2] * R[2]));
    gl.uniform3fv(u.uLames, lames);
    // Œil de chat : à pleine ouverture, loin du centre, la monture rogne le disque.
    const sx = (q[0] - WB / 2) / g.fpx + g.cx, sy = (q[1] - HB / 2) / g.fpx + g.cy;
    const rho = Math.hypot(sx, sy) * calc.f / calc.demiDiag, rogne = d.vignettage > 0 ? Math.min(1, d.vignettage) * 0.75 * rho : 0;
    const dir = Math.hypot(sx, sy) || 1;
    gl.uniform3f(u.uChat, -sx / dir * rmax * rogne, -sy / dir * rmax * rogne, rmax * 1.06);
    gl.uniform4f(u.uEtoile, force * flux * 0.012, longueur, lignes, 0.3);
    gl.uniform3fv(u.uCoul, l.couleur);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
  }

  // Seul le bruit change (il « grouille ») : on ne refait que la dernière étape.
  function rendreBruit(v) {
    if (!gl || !W) return;
    graine = (graine + 1) % 4096;
    capteur(v, false);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  return {
    init: init, taille: taille, rendre: rendre, rendreBruit: rendreBruit,
    signal: signal, SIGNAL: SIGNAL,
    largeur: function () { return W; }, hauteur: function () { return H; }
  };
})();
