/* ==========================================================================
   signal.js — les deux instruments de l'ingénieur vision
   --------------------------------------------------------------------------
   Signal.oscilloscope(canvas, pixels)
       L'oscilloscope (« waveform ») : pour chaque colonne de l'image, on
       empile les niveaux de tous ses pixels. À gauche de l'écran, la gauche
       de l'image ; en bas le noir (0 %), en haut le blanc (100 %).
       C'est l'outil qui sert à exposer et à régler knee et noirs en régie.

   Signal.courbe(canvas, v)
       La courbe de transfert de la caméra : en abscisse la lumière reçue
       (en diaphragmes autour du gris moyen), en ordonnée le niveau vidéo.
       Les repères montrent où tombent les tons du décor avec l'exposition
       en cours : on VOIT le knee plier la courbe et le black gamma la
       bomber dans les basses lumières.
   ========================================================================== */

const Signal = (function () {
  "use strict";
  const POLICE = "600 10px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

  function preparer(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), l = canvas.clientWidth, h = canvas.clientHeight;
    if (!l || !h) return null;
    if (canvas.width !== Math.round(l * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(l * dpr); canvas.height = Math.round(h * dpr); }
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, l, h);
    return { c: c, l: l, h: h };
  }

  /* --- L'OSCILLOSCOPE ---------------------------------------------------- */
  const HAUT = 150;                        // lignes de la trace : de 0 à 120 %
  let trace = null, image = null, tampon = null;

  function oscilloscope(canvas, pixels, L, H) {
    const p = preparer(canvas);
    if (!p) return;
    const c = p.c, mg = 34, md = 8, mh = 8, mb = 16;
    const zl = p.l - mg - md, zh = p.h - mh - mb;
    const yDe = function (pc) { return mh + zh * (1 - pc / 120); };
    // Graticule
    c.font = POLICE; c.textBaseline = "middle"; c.textAlign = "right";
    [0, 25, 50, 75, 100, 109].forEach(function (pc) {
      const y = Math.round(yDe(pc)) + 0.5;
      c.strokeStyle = pc === 100 || pc === 0 ? "rgba(255,255,255,.34)" : pc === 109 ? "rgba(255,90,77,.6)" : "rgba(255,255,255,.13)";
      c.setLineDash(pc === 109 ? [4, 3] : []); c.beginPath(); c.moveTo(mg, y); c.lineTo(mg + zl, y); c.stroke();
      c.fillStyle = pc === 109 ? "#ff8a80" : "#8a93a3"; if (pc !== 109) c.fillText(pc + " %", mg - 5, y); else c.fillText("109", mg - 5, y - 1);
    });
    c.setLineDash([]);
    // La trace : on compte, colonne par colonne, combien de pixels ont chaque niveau.
    if (!trace) { trace = new Uint16Array(L * HAUT); tampon = document.createElement("canvas"); tampon.width = L; tampon.height = HAUT; image = tampon.getContext("2d").createImageData(L, HAUT); }
    trace.fill(0);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < L; x++) {
        const i = (y * L + x) * 4;
        const luma = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;   // 1 = 120 %
        trace[Math.min(HAUT - 1, Math.round((1 - luma) * (HAUT - 1))) * L + x]++;
      }
    }
    const d = image.data;
    for (let i = 0; i < L * HAUT; i++) {
      const f = 1 - Math.exp(-trace[i] * 0.42);
      d[i * 4] = 60 + 150 * f; d[i * 4 + 1] = 255; d[i * 4 + 2] = 110 + 100 * f; d[i * 4 + 3] = 255 * f;
    }
    tampon.getContext("2d").putImageData(image, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(tampon, mg, mh, zl, zh);
    c.fillStyle = "#6b7482"; c.textAlign = "left"; c.fillText("gauche de l’image", mg, p.h - 6); c.textAlign = "right"; c.fillText("droite", mg + zl, p.h - 6);
  }

  /* --- LA COURBE DE TRANSFERT --------------------------------------------- */
  // Les tons du décor : part de lumière renvoyée (1 = blanc parfait ; plus de 1 = source lumineuse).
  const TONS = [
    { nom: "Veste", v: 0.012 }, { nom: "Mur", v: 0.045 }, { nom: "Gris 18 %", v: 0.18 },
    { nom: "Visage", v: 0.42 }, { nom: "Blanc", v: 0.9 }, { nom: "Écran LED", v: 2.6 }
  ];
  const IL_MIN = -7, IL_MAX = 5.6;

  function courbe(canvas, v) {
    const p = preparer(canvas);
    if (!p) return;
    const c = p.c, mg = 34, md = 10, mh = 8, mb = 28;
    const zl = p.l - mg - md, zh = p.h - mh - mb;
    const X = function (il) { return mg + zl * (il - IL_MIN) / (IL_MAX - IL_MIN); };
    const Y = function (niveau) { return mh + zh * (1 - niveau / 1.2); };
    c.font = POLICE; c.textBaseline = "middle";
    // Grille
    c.textAlign = "right";
    [0, 0.5, 1, 1.09].forEach(function (nv) {
      const y = Math.round(Y(nv)) + 0.5;
      c.strokeStyle = nv === 1.09 ? "rgba(255,90,77,.6)" : nv === 1 || nv === 0 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)"; c.setLineDash(nv === 1.09 ? [4, 3] : []);
      c.beginPath(); c.moveTo(mg, y); c.lineTo(mg + zl, y); c.stroke();
      c.fillStyle = "#8a93a3"; if (nv !== 1.09) c.fillText(Math.round(nv * 100) + " %", mg - 5, y);
    });
    c.setLineDash([]); c.textAlign = "center";
    for (let il = -6; il <= 5; il += 1) {
      const x = Math.round(X(il)) + 0.5;
      c.strokeStyle = il === 0 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.08)"; c.beginPath(); c.moveTo(x, mh); c.lineTo(x, mh + zh); c.stroke();
      if (il % 2 === 0) { c.fillStyle = "#8a93a3"; c.fillText((il > 0 ? "+" : "") + il, x, mh + zh + 9); }
    }
    c.fillStyle = "#6b7482"; c.fillText("lumière reçue, en diaphragmes autour du gris moyen", mg + zl / 2, p.h - 6);
    // Saturation du capteur
    const xs = X(Math.log2(v.cfg.saturationCapteur / 0.18));
    c.fillStyle = "rgba(255,90,77,.12)"; c.fillRect(xs, mh, mg + zl - xs, zh);
    c.fillStyle = "#ff8a80"; c.save(); c.translate(xs + 9, mh + zh / 2); c.rotate(-Math.PI / 2); c.fillText("capteur saturé", 0, 0); c.restore();
    // Courbe de référence (sans retouche), en pointillé, puis courbe réelle
    const tracer = function (r, coul, ep, pointille) {
      c.strokeStyle = coul; c.lineWidth = ep; c.setLineDash(pointille ? [3, 3] : []); c.beginPath();
      for (let i = 0; i <= 160; i++) {
        const il = IL_MIN + (IL_MAX - IL_MIN) * i / 160;
        const x = Math.min(0.18 * Math.pow(2, il), v.cfg.saturationCapteur);
        const y = Y(Optique.signal(x, r));
        if (i) c.lineTo(X(il), y); else c.moveTo(X(il), y);
      }
      c.stroke(); c.setLineDash([]);
    };
    tracer(Object.assign({}, v.r, { masterGamma: 0, masterBlack: 0, bgNiveau: 0, knee: false }), "rgba(255,255,255,.3)", 1, true);
    tracer(v.r, "#ffd60a", 2, false);
    // Point de knee
    if (v.r.knee && v.r.gamma !== "slog3") { const y = Y(v.r.kneePoint / 100); c.fillStyle = "#ffd60a"; c.textAlign = "left"; c.fillText("knee " + v.r.kneePoint + " %", mg + 4, y - 7); c.strokeStyle = "rgba(255,214,10,.35)"; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(mg, y); c.lineTo(mg + zl, y); c.stroke(); c.setLineDash([]); }
    // Les tons du décor, placés selon l'exposition en cours
    TONS.forEach(function (t, i) {
      const x = t.v * v.calc.expo, il = Math.log2(Math.max(x, 1e-6) / 0.18);
      if (il < IL_MIN || il > IL_MAX) return;
      const niveau = Optique.signal(Math.min(x, v.cfg.saturationCapteur), v.r), px = X(il), py = Y(niveau);
      c.strokeStyle = "rgba(100,210,255,.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(px, py); c.lineTo(px, mh + zh); c.stroke();
      c.fillStyle = "#64d2ff"; c.beginPath(); c.arc(px, py, 3.2, 0, 6.2832); c.fill();
      c.save(); c.translate(px + 3, Math.min(py + 8, mh + zh - 4)); c.rotate(Math.PI / 2 * 0); c.textAlign = "left";
      c.fillStyle = "#bfeaff"; c.fillText(t.nom, 2, (i % 2 ? 12 : 2) + (py > mh + zh - 30 ? -24 : 0)); c.restore();
    });
  }

  return { oscilloscope: oscilloscope, courbe: courbe };
})();
