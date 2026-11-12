/* ==========================================================================
   labos.js — LES LABOS DE L'APPLICATION (MODÈLE À ADAPTER)
   --------------------------------------------------------------------------
   Un labo = l'étape « Manipuler » d'un module : une scène (canvas ou SVG)
   toujours visible, des réglages, des valeurs calculées.
   Son HTML est dans index.html (<template data-labo="n">) ; son code ici.

   Le schéma à suivre, repris de l'application de photométrie :
     1. on récupère les éléments du labo (curseurs, canvas, valeurs) ;
     2. UNE fonction dessiner() relit TOUS les réglages, recalcule et
        redessine TOUT (scène + valeurs + explication) ;
     3. chaque réglage appelle dessiner() ;
     4. on appelle dessiner() une première fois.
   Pourquoi tout redessiner à chaque fois ? Pour que la scène, les nombres et
   le texte ne puissent jamais se contredire. Un canvas de 1000 × 450 se
   redessine en moins d'une milliseconde : aucun souci de vitesse.

   Outils fournis par le kit (js/application.js) :
     Application.afficher(el, texte)   écrit une valeur ; elle « rebondit » si elle change
     Application.segment(el, choix, valeurInitiale, fonction)
                                       contrôle segmenté avec pastille glissante
     Application.nombre(v, decimales)  écriture française : 1 234,5
     Application.toast("message")      petite notification
     Application.surAffichage(n, f)    f est rappelée à chaque affichage du module n
   ========================================================================== */

Application.labo(1, function () {
  const cv = document.getElementById("m1-scene");
  const ctx = cv.getContext("2d");
  const W = cv.width, Hc = cv.height;
  const curseurA = document.getElementById("m1-a");
  const curseurB = document.getElementById("m1-b");
  let forme = "disque";

  function dessiner() {
    // 1. Lire les réglages
    const A = +curseurA.value, B = +curseurB.value, G = A * B;

    // 2. Afficher les réglages et les valeurs calculées
    Application.afficher("#m1-ao", Application.nombre(A, 1));
    Application.afficher("#m1-bo", Application.nombre(B, 1));
    Application.afficher("#m1-g", Application.nombre(G, 1) + " u");
    Application.afficher("#m1-f", forme === "disque" ? "Disque" : "Carré");
    document.getElementById("m1-calc").innerHTML = '<div><span class="c">G = A × B</span></div><div>= ' + Application.nombre(A, 1) + " × " + Application.nombre(B, 1) + " = <b>" + Application.nombre(G, 1) + " u</b></div>";

    // 3. Dessiner la scène (fond sombre : convention de toutes les applications)
    ctx.fillStyle = "#0b0c0e"; ctx.fillRect(0, 0, W, Hc);
    const r = 20 + G * 1.6;
    const halo = ctx.createRadialGradient(W / 2, Hc / 2, 0, W / 2, Hc / 2, r);
    halo.addColorStop(0, "rgba(255,181,71,.95)"); halo.addColorStop(1, "rgba(255,45,85,0)");
    ctx.fillStyle = halo;
    if (forme === "disque") { ctx.beginPath(); ctx.arc(W / 2, Hc / 2, r, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(W / 2 - r, Hc / 2 - r, 2 * r, 2 * r);

    // 4. L'explication suit les réglages
    const note = document.getElementById("m1-msg");
    note.className = G > 50 ? "note warn" : "note ok";
    note.innerHTML = G > 50 ? "<b>G est grand.</b> Expliquez ici ce que cela change en pratique." : "<b>G reste modéré.</b> Expliquez ici ce que l’élève doit remarquer.";
  }

  curseurA.addEventListener("input", dessiner);
  curseurB.addEventListener("input", dessiner);
  Application.segment("#m1-forme", [["disque", "Disque"], ["carre", "Carré"]], "disque", v => { forme = v; dessiner(); });
  dessiner();
});
