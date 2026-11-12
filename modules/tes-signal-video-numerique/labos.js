/* ==========================================================================
   labos.js — les labos (étape « Manipuler ») de l'application
   « Signal vidéo numérique »
   --------------------------------------------------------------------------
   Le HTML de chaque labo est dans index.html, dans un <template data-labo="n">.
   Ici, on le fait vivre. Chaque labo est déclaré par :
       Application.labo(n, function (zone) { … });
   La fonction est appelée UNE fois, au premier affichage du module : les
   éléments du labo existent alors dans la page.

   Règle commune à tous les labos (voir docs/CHARTE-APPLICATIONS.md) :
   UNE fonction dessiner() relit tous les réglages et redessine TOUT. Chaque
   curseur l'appelle. Ainsi la scène, les valeurs et les explications restent
   toujours d'accord entre elles.
   ========================================================================== */

/* Outils de dessin partagés par les labos de cette application */
const LaboOutils = {
  // Le canvas est dessiné en haute définition sur les écrans Retina.
  preparer(canvas) {
    const ctx = canvas.getContext("2d");
    return { ctx: ctx, l: canvas.width, h: canvas.height };
  },
  police(taille, gras) {
    return (gras ? "600 " : "500 ") + taille + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
  },
  // Mouvement réduit demandé par l'élève : pas d'animation automatique.
  reduit() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
};

/* ==========================================================================
   MODULE 1 — Échantillonner et quantifier une sinusoïde
   ========================================================================== */
Application.labo(1, function () {
  const cv = document.getElementById("s1-cv");
  const { ctx, l: W, h: Hc } = LaboOutils.preparer(cv);
  const reglages = {
    f: document.getElementById("s1-f"),
    fe: document.getElementById("s1-fe"),
    n: document.getElementById("s1-n")
  };
  let vue = "tout";          // ce que l'on montre : tout / echantillons / reconstitue
  let balayage = 1;          // avancement de l'animation (0 → 1)
  let animation = null;
  const PHASE = 0.35;        // décalage de phase : évite des échantillons tous nuls à fe = 2f

  const marge = { g: 54, d: 20, h: 26, b: 40 };
  const X = t => marge.g + t * (W - marge.g - marge.d);              // t en secondes (0 à 1)
  const Y = v => marge.h + (1 - (v + 1) / 2) * (Hc - marge.h - marge.b); // v entre -1 et 1
  const signal = (f, t) => 0.9 * Math.sin(2 * Math.PI * f * t + PHASE);

  function quantifier(v, niveaux) {
    const k = Math.round((v + 1) / 2 * (niveaux - 1));
    return -1 + k * 2 / (niveaux - 1);
  }

  function dessiner() {
    const f = +reglages.f.value, fe = +reglages.fe.value, n = +reglages.n.value;
    const niveaux = Math.pow(2, n), rapport = fe / f;
    const m = Math.round(f / fe), fa = Math.abs(f - m * fe); // fréquence apparente
    const repli = rapport < 2;

    Application.afficher("#s1-fo", Application.nombre(f, 1) + " Hz");
    Application.afficher("#s1-feo", fe + " Hz");
    Application.afficher("#s1-no", n + " bit" + (n > 1 ? "s" : ""));

    // Fond et axes
    ctx.clearRect(0, 0, W, Hc);
    ctx.fillStyle = "#0b0c0e"; ctx.fillRect(0, 0, W, Hc);

    // Les niveaux de quantification (lignes horizontales discrètes)
    ctx.lineWidth = 1;
    for (let k = 0; k < niveaux && niveaux <= 64; k++) {
      const v = -1 + k * 2 / (niveaux - 1);
      ctx.strokeStyle = "rgba(255,255,255,.07)";
      ctx.beginPath(); ctx.moveTo(marge.g, Y(v)); ctx.lineTo(W - marge.d, Y(v)); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.beginPath(); ctx.moveTo(marge.g, Y(0)); ctx.lineTo(W - marge.d, Y(0)); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = LaboOutils.police(13);
    ctx.textAlign = "center";
    for (let t = 0; t <= 1.0001; t += 0.25) ctx.fillText(Application.nombre(t, 2) + " s", X(t), Hc - 14);
    ctx.textAlign = "right";
    ctx.fillText("+1", marge.g - 10, Y(1) + 4); ctx.fillText("0", marge.g - 10, Y(0) + 4); ctx.fillText("−1", marge.g - 10, Y(-1) + 4);

    // Le signal analogique : une courbe continue, grise
    ctx.strokeStyle = vue === "reconstitue" ? "rgba(220,220,220,.35)" : "rgba(220,220,220,.8)";
    ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 600; i++) { const t = i / 600; i ? ctx.lineTo(X(t), Y(signal(f, t))) : ctx.moveTo(X(t), Y(signal(f, t))); }
    ctx.stroke();

    // Les échantillons jusqu'au balayage en cours
    const ech = [];
    for (let k = 0; k / fe <= 1 + 1e-9; k++) ech.push(k / fe);
    const visibles = ech.filter(t => t <= balayage + 1e-9);

    // Le signal reconstitué : marches de quantification tenues jusqu'à l'échantillon suivant
    if (vue !== "echantillons" && visibles.length) {
      ctx.strokeStyle = "#2997ff"; ctx.lineWidth = 2.6; ctx.beginPath();
      visibles.forEach((t, i) => {
        const v = quantifier(signal(f, t), niveaux), t2 = Math.min(i + 1 < ech.length ? ech[i + 1] : 1, balayage);
        if (i === 0) ctx.moveTo(X(t), Y(v)); else ctx.lineTo(X(t), Y(v));
        ctx.lineTo(X(Math.max(t, t2)), Y(v));
      });
      ctx.stroke();
    }

    // Repliement : la fausse sinusoïde passe exactement par les mêmes échantillons
    if (repli && vue !== "echantillons" && balayage >= 1) {
      const fs = f - m * fe;
      ctx.setLineDash([8, 7]); ctx.strokeStyle = "#ff453a"; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = 0; i <= 600; i++) { const t = i / 600, v = 0.9 * Math.sin(2 * Math.PI * fs * t + PHASE); i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v)); }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Tiges et points des échantillons
    visibles.forEach(t => {
      const v = signal(f, t);
      ctx.strokeStyle = "rgba(255,159,10,.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(t), Y(0)); ctx.lineTo(X(t), Y(v)); ctx.stroke();
      ctx.fillStyle = "#ff9f0a"; ctx.beginPath(); ctx.arc(X(t), Y(v), 5, 0, Math.PI * 2); ctx.fill();
    });

    // La tête de lecture du convertisseur pendant l'animation
    if (balayage < 1) {
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(balayage), marge.h - 10); ctx.lineTo(X(balayage), Hc - marge.b + 6); ctx.stroke();
    }

    // Valeurs calculées
    Application.afficher("#s1-rapport", Application.nombre(rapport, 1));
    const sh = document.getElementById("s1-shannon");
    Application.afficher(sh, rapport > 2 ? "Oui" : rapport === 2 ? "Limite" : "Non");
    sh.className = rapport > 2 ? "ok" : "bad";
    Application.afficher("#s1-fa", Application.nombre(repli ? fa : f, 1) + " Hz");
    Application.afficher("#s1-niv", Application.nombre(niveaux, 0));
    Application.afficher("#s1-err", "± " + Application.nombre(100 / (2 * (niveaux - 1)), 1) + " %");
    document.getElementById("s1-etat").textContent = ech.length + " échantillons en 1 s";

    // L'explication qui suit les réglages
    const msg = document.getElementById("s1-msg");
    if (repli) {
      msg.className = "note bad";
      msg.innerHTML = "<b>Repliement !</b> fe = " + fe + " Hz est inférieure à 2 × f = " + Application.nombre(2 * f, 1) + " Hz. Les échantillons dessinent une fausse sinusoïde (pointillés rouges) à <b>" + Application.nombre(fa, 1) + " Hz</b> : une fréquence qui n’existe pas dans le signal.";
    } else if (rapport === 2) {
      msg.className = "note warn";
      msg.innerHTML = "<b>Juste à la limite.</b> Deux échantillons par période : la fréquence est conservée, mais l’amplitude dépend de l’instant de mesure. En pratique, on prend de la marge (48 kHz pour 20 kHz).";
    } else if (n <= 2) {
      msg.className = "note warn";
      msg.innerHTML = "<b>Shannon est respecté</b>, mais avec " + n + " bit" + (n > 1 ? "s" : "") + " il n’y a que " + niveaux + " niveaux : la courbe bleue est un escalier grossier. C’est l’<b>erreur de quantification</b>. Ajoutez des bits.";
    } else {
      msg.className = "note ok";
      msg.innerHTML = "<b>Tout va bien.</b> " + Application.nombre(rapport, 1) + " échantillons par période (au moins 2 exigés) et " + Application.nombre(niveaux, 0) + " niveaux : la courbe bleue suit fidèlement le signal.";
    }
  }

  // Animation : la tête de lecture parcourt la seconde et prélève les échantillons.
  function rejouer() {
    if (LaboOutils.reduit()) { balayage = 1; dessiner(); return; }
    cancelAnimationFrame(animation);
    const debut = performance.now();
    (function pas(t) {
      balayage = Math.min(1, (t - debut) / 2600);
      dessiner();
      if (balayage < 1) animation = requestAnimationFrame(pas);
    })(debut);
  }

  Object.values(reglages).forEach(r => r.addEventListener("input", () => { cancelAnimationFrame(animation); balayage = 1; dessiner(); }));
  Application.segment("#s1-vue", [["tout", "Tout"], ["echantillons", "Points"], ["reconstitue", "Codé"]], "tout", v => { vue = v; dessiner(); });
  document.getElementById("s1-rejouer").addEventListener("click", rejouer);

  // Situations toutes prêtes : un clic règle les trois curseurs.
  const situations = { ok: [3, 24, 4], limite: [5, 10, 4], repli: [9, 12, 4], bits: [2, 30, 2] };
  document.getElementById("s1-situations").addEventListener("click", e => {
    const b = e.target.closest("[data-s]"); if (!b) return;
    const s = situations[b.dataset.s];
    reglages.f.value = s[0]; reglages.fe.value = s[1]; reglages.n.value = s[2];
    Object.values(reglages).forEach(r => r.dispatchEvent(new Event("input", { bubbles: true })));
    rejouer();
  });

  rejouer();
});

/* ==========================================================================
   MODULE 2 — Que devient la couleur ? (structures d'échantillonnage)
   ========================================================================== */
Application.labo(2, function () {
  const STRUCTURES = {
    "4:4:4": { pasH: 1, pasV: 1, parPixel: 3, texte: "Chaque pixel possède sa luminance et sa propre chrominance. Aucune perte : l’image traitée est identique à l’originale." },
    "4:2:2": { pasH: 2, pasV: 1, parPixel: 2, texte: "Une chrominance pour 2 pixels voisins de la même ligne. Les rayures <b>verticales</b> perdent leur couleur ; les rayures horizontales restent intactes." },
    "4:2:0": { pasH: 2, pasV: 2, parPixel: 1.5, texte: "Une chrominance pour un carré de 2 × 2 pixels. Les rayures verticales <b>et</b> horizontales perdent toutes leur couleur." },
    "4:1:1": { pasH: 4, pasV: 1, parPixel: 1.5, texte: "Une chrominance pour 4 pixels voisins de la même ligne. Autant de données qu’en 4:2:0, mais toute la perte est <b>horizontale</b>." }
  };
  let courante = "4:2:2";
  let minuterie = null;

  /* a) La grille des échantillons : un bloc de 8 × 4 pixels */
  function dessinerGrille() {
    const cv = document.getElementById("s2-grille"), c = cv.getContext("2d"), s = STRUCTURES[courante];
    const CASE = 120, COL = 8, LIG = 4;
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < LIG; y += s.pasV) {
      for (let x = 0; x < COL; x += s.pasH) {
        const pair = (x / s.pasH + y / s.pasV) % 2 === 0;
        c.fillStyle = pair ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.12)";
        c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 2;
        c.beginPath(); c.roundRect(x * CASE + 6, y * CASE + 6, s.pasH * CASE - 12, s.pasV * CASE - 12, 14); c.fill(); c.stroke();
        // L'échantillon de chrominance du groupe : anneau moitié bleu (Cb), moitié rouge (Cr)
        const cx = x * CASE + CASE / 2, cy = y * CASE + (s.pasV * CASE) / 2;
        c.lineWidth = 10;
        c.strokeStyle = "#4d8dff"; c.beginPath(); c.arc(cx, cy, 38, Math.PI / 2, Math.PI * 1.5); c.stroke();
        c.strokeStyle = "#ff5c4d"; c.beginPath(); c.arc(cx, cy, 38, Math.PI * 1.5, Math.PI / 2); c.stroke();
      }
    }
    // La luminance : un disque gris sur CHAQUE pixel, quelle que soit la structure
    c.fillStyle = "#dcdcdc";
    for (let y = 0; y < LIG; y++) for (let x = 0; x < COL; x++) { c.beginPath(); c.arc(x * CASE + CASE / 2, y * CASE + CASE / 2, 22, 0, Math.PI * 2); c.fill(); }
    cv.setAttribute("aria-label", "Schéma en " + courante + " : un échantillon de luminance par pixel, un échantillon de chrominance pour " + s.pasH * s.pasV + " pixel(s).");
  }

  /* b) L'image test : rayures et diagonales, les cas les plus difficiles */
  function couleurTest(x, y) {
    if (x < 4) return x % 2 === 0 ? [235, 40, 40] : [40, 200, 220];
    if (x < 8) return y % 2 === 0 ? [40, 190, 60] : [220, 50, 200];
    if (x - 8 === y) return [250, 220, 40];
    if (x - 8 === 7 - y) return [255, 120, 170];
    return [25, 40, 110];
  }
  // Conversions RVB ↔ Y Cb Cr (coefficients HD, BT.709 ; valeurs de 0 à 255)
  const versYCbCr = p => { const y = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; return { y: y, cb: (p[2] - y) / 1.8556, cr: (p[0] - y) / 1.5748 }; };
  const versRVB = (y, cb, cr) => { const r = y + 1.5748 * cr, b = y + 1.8556 * cb; return [r, (y - 0.2126 * r - 0.0722 * b) / 0.7152, b]; };

  function dessinerImage(id, s) {
    const c = document.getElementById(id).getContext("2d"), P = 30, ph = s ? s.pasH : 1, pv = s ? s.pasV : 1;
    for (let y0 = 0; y0 < 8; y0 += pv) for (let x0 = 0; x0 < 16; x0 += ph) {
      // Chrominance du groupe = moyenne de celles de ses pixels ; chaque pixel garde SA luminance.
      let cb = 0, cr = 0;
      for (let y = y0; y < y0 + pv; y++) for (let x = x0; x < x0 + ph; x++) { const k = versYCbCr(couleurTest(x, y)); cb += k.cb; cr += k.cr; }
      cb /= ph * pv; cr /= ph * pv;
      for (let y = y0; y < y0 + pv; y++) for (let x = x0; x < x0 + ph; x++) {
        const rvb = versRVB(versYCbCr(couleurTest(x, y)).y, cb, cr);
        c.fillStyle = "rgb(" + rvb.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(",") + ")";
        c.fillRect(x * P, y * P, P, P);
      }
    }
  }

  function dessiner() {
    const s = STRUCTURES[courante];
    dessinerGrille();
    dessinerImage("s2-apres", s);
    document.getElementById("s2-legende").textContent = "Après passage en " + courante;
    document.getElementById("s2-texte").innerHTML = s.texte;
    Application.afficher("#s2-e", Application.nombre(s.parPixel, 1));
    Application.afficher("#s2-part", Application.nombre(s.parPixel / 3 * 100, 0) + " %");
    Application.afficher("#s2-groupe", s.pasH + " × " + s.pasV);
    Application.afficher("#s2-cb", Application.nombre(100 / (s.pasH * s.pasV), 0) + " %");
  }

  // Un choix manuel arrête le défilement automatique ; le défilement, lui,
  // passe par la même fonction en levant le drapeau « auto ».
  let auto = false;
  const seg = Application.segment("#s2-choix", Object.keys(STRUCTURES).map(k => [k, k]), courante, v => {
    if (!auto) arreter();
    courante = v;
    dessiner();
  });

  const bouton = document.getElementById("s2-defiler");
  function arreter() { clearInterval(minuterie); minuterie = null; bouton.textContent = "▶ Faire défiler les structures"; }
  bouton.addEventListener("click", () => {
    if (minuterie) { arreter(); return; }
    bouton.textContent = "⏸ Arrêter le défilement";
    minuterie = setInterval(() => {
      const noms = Object.keys(STRUCTURES);
      auto = true;
      seg.choisir(noms[(noms.indexOf(courante) + 1) % noms.length]);
      auto = false;
    }, 2400);
  });

  dessinerImage("s2-avant", null);
  dessiner();
});

/* ==========================================================================
   MODULE 3 — Le calculateur de débit
   ========================================================================== */
Application.labo(3, function () {
  const LIAISONS = [["SD-SDI", 0.27], ["HD-SDI", 1.485], ["3G-SDI", 2.97], ["6G-SDI", 5.94], ["12G-SDI", 11.88]];
  const E = { "4:4:4": 3, "4:2:2": 2, "4:2:0": 1.5 };
  const etat = { bits: 10, structure: "4:2:2" };
  const def = document.getElementById("s3-def"), cad = document.getElementById("s3-cad");

  const fmtDebit = d => d >= 1e9 ? Application.nombre(d / 1e9, 2) + " Gbit/s" : Application.nombre(d / 1e6, 0) + " Mbit/s";

  function dessiner() {
    const [L, H] = def.value.split("x").map(Number), i = +cad.value, n = etat.bits, e = E[etat.structure];
    const D = L * H * i * n * e, D444 = L * H * i * n * 3, goMin = D * 60 / 8 / 1e9;

    Application.afficher("#s3-debit", fmtDebit(D));
    Application.afficher("#s3-part", Application.nombre(D / D444 * 100, 0) + " %");
    Application.afficher("#s3-go", Application.nombre(goMin, 1) + " Go");
    Application.afficher("#s3-mo", Application.nombre(D / 8 / 1e6, 0) + " Mo/s");

    document.getElementById("s3-calc").innerHTML =
      '<div><span class="c">Pixels par image</span> ' + L + " × " + H + " = <b>" + Application.nombre(L * H, 0) + "</b></div>" +
      '<div><span class="c">× images/s</span> × ' + i + " = " + Application.nombre(L * H * i, 0) + " pixels/s</div>" +
      '<div><span class="c">× bits</span> × ' + n + " = " + Application.nombre(L * H * i * n, 0) + " bit/s</div>" +
      '<div><span class="c">× échantillons/pixel (' + etat.structure + ")</span> × " + Application.nombre(e, 1) + " = <b>" + Application.nombre(D, 0) + " bit/s</b></div>" +
      '<div><span class="c">soit</span> <b>' + fmtDebit(D) + "</b> · " + Application.nombre(D / 8 / 1e6, 0) + " Mo/s · " + Application.nombre(goMin, 1) + " Go par minute</div>";

    // Les liaisons SDI : quelle part de leur capacité l'image active occupe-t-elle ?
    const premiere = LIAISONS.find(x => D / 1e9 <= x[1]);
    document.getElementById("s3-liaisons").innerHTML = LIAISONS.map(x => {
      const p = D / 1e9 / x[1] * 100, ok = p <= 100;
      return '<div' + (x === premiere ? ' class="choisi"' : "") + '><span>' + x[0] + "</span><small>" + Application.nombre(x[1], x[1] < 1 ? 2 : 3) + ' Gbit/s</small><div class="jauge"><i style="width:' + Math.min(100, p) + "%;background:" + (ok ? (x === premiere ? "var(--ok)" : "var(--accent)") : "var(--bad)") + '"></i></div><b class="' + (ok ? "" : "trop") + '">' + (ok ? Application.nombre(p, 0) + " %" : "trop petit") + "</b></div>";
    }).join("");
    document.getElementById("s3-verdict").innerHTML = premiere
      ? "Liaison suffisante la plus modeste : <b>" + premiere[0] + "</b>. Attention, ce calcul ne compte que l’image active : le SDI transporte aussi les intervalles de suppression (audio embarqué, données)."
      : "Aucune liaison SDI unique ne suffit : il faut plusieurs câbles en parallèle, ou de la compression.";
  }

  Application.segment("#s3-bits", [[8, "8 bits"], [10, "10 bits"], [12, "12 bits"]], 10, v => { etat.bits = +v; dessiner(); });
  Application.segment("#s3-struct", [["4:4:4", "4:4:4"], ["4:2:2", "4:2:2"], ["4:2:0", "4:2:0"]], "4:2:2", v => { etat.structure = v; dessiner(); });
  def.addEventListener("change", dessiner);
  cad.addEventListener("change", dessiner);
  dessiner();
});
