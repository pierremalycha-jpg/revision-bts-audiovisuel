/* ==========================================================================
   transition.js — l'animation « on entre dans l'application »
   --------------------------------------------------------------------------
   Deux moitiés, qui se passent le relais par sessionStorage :

   1. SORTIE (page de départ : accueil, tableau de bord)
      Au clic sur l'icône d'une application, une surface aux couleurs de
      l'icône grandit depuis l'icône jusqu'à couvrir l'écran, pendant que le
      pictogramme glisse au centre. Puis le navigateur ouvre l'application.

   2. ENTRÉE (page d'arrivée : l'application)
      La page s'ouvre sous ce même voile coloré, qui s'estompe dès que
      l'application est prête : l'élève a l'impression d'y entrer.

   Pourquoi ce fichier est-il chargé dans le <head> ? Pour poser le voile
   AVANT le premier affichage : sinon on verrait un flash de la page.

   Pensé pour les ordinateurs modestes (ceux du lycée) :
     - on n'anime que clip-path, opacity et transform, sur deux éléments ;
     - courbes d'accélération douces (jamais de vitesse constante) ;
     - aucune animation si l'élève a demandé « réduire les animations »
       dans son système, ni si le navigateur ne sait pas faire.
   ========================================================================== */

(function () {
  "use strict";

  const CLE = "revision-bts-entree-app";
  const DUREE = 560;                               // ms : assez long pour être vu, assez court pour ne pas faire attendre
  const COURBE = "cubic-bezier(.65, 0, .35, 1)";   // départ et arrivée en douceur (ease-in-out)
  const COURBE_SORTIE = "cubic-bezier(.16, 1, .3, 1)"; // décélération longue (ease-out « expo »)
  const reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const html = document.documentElement;

  /* ------------------------------------------------------------------------
     2. ENTRÉE : le voile posé avant l'affichage, puis levé
     ------------------------------------------------------------------------ */
  let passage = null;
  try {
    passage = JSON.parse(sessionStorage.getItem(CLE));
    sessionStorage.removeItem(CLE);
  } catch (e) { passage = null; }

  if (passage && passage.fond && !reduit) {
    const glyphe = passage.glyphe
      ? 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" color="#fff">' + passage.glyphe + "</svg>") + '") center / 92px no-repeat, '
      : "";
    const style = document.createElement("style");
    style.textContent =
      "html.voile-app::after{content:'';position:fixed;inset:0;z-index:2147483000;pointer-events:none;" +
      "background:" + glyphe + passage.fond + ";" +
      "transition:opacity .62s " + COURBE_SORTIE + ",transform .62s " + COURBE_SORTIE + "}" +
      "html.voile-app.voile-leve::after{opacity:0;transform:scale(1.06)}";
    document.head.appendChild(style);
    html.classList.add("voile-app");

    // On lève le voile quand l'application est construite (ses scripts sont
    // en fin de page : DOMContentLoaded arrive juste après). Deux images
    // d'attente laissent le navigateur dessiner la page sous le voile.
    let leve = false;
    const lever = function () {
      if (leve) return;
      leve = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          html.classList.add("voile-leve");
          setTimeout(function () { html.classList.remove("voile-app", "voile-leve"); style.remove(); }, 700);
        });
      });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", lever);
    else lever();
    setTimeout(lever, 2500); // filet de sécurité : jamais de voile bloqué
  }

  /* ------------------------------------------------------------------------
     1. SORTIE : l'icône s'agrandit jusqu'à remplir l'écran
     Tout lien portant data-app-fond (posé par js/page-accueil.js et
     js/page-tableau-de-bord.js) et contenant une icône .app-ic est concerné.
     ------------------------------------------------------------------------ */
  const sait = !!(Element.prototype.animate && window.CSS && CSS.supports && CSS.supports("clip-path", "inset(0 round 1px)"));
  let enCours = null;

  function nettoyer() {
    if (!enCours) return;
    enCours.surface.remove();
    enCours.picto.remove();
    enCours.icone.style.visibility = "";
    enCours = null;
  }
  // Retour arrière : le navigateur peut ressortir la page telle qu'on l'a
  // quittée (écran couvert). On remet tout en place.
  window.addEventListener("pageshow", nettoyer);

  document.addEventListener("click", function (evenement) {
    const lien = evenement.target.closest && evenement.target.closest("a[data-app-fond]");
    if (!lien || reduit || !sait || enCours) return;
    // Ctrl/Cmd/Maj + clic, clic molette : l'élève veut un nouvel onglet.
    if (evenement.defaultPrevented || evenement.button !== 0 || evenement.metaKey || evenement.ctrlKey || evenement.shiftKey || evenement.altKey) return;
    const icone = lien.querySelector(".app-ic");
    if (!icone) return;
    evenement.preventDefault();

    const r = icone.getBoundingClientRect();
    const l = window.innerWidth, h = window.innerHeight;
    const rayon = parseFloat(getComputedStyle(icone).borderTopLeftRadius) || 24;
    const svg = icone.querySelector("svg");

    // La surface couvre tout l'écran ; clip-path n'en montre d'abord que le
    // carré de l'icône, puis s'ouvre jusqu'aux bords.
    const surface = document.createElement("div");
    surface.className = "ouverture-app";
    surface.style.background = lien.dataset.appFond;

    // Le pictogramme blanc, posé exactement sur celui de l'icône.
    const picto = document.createElement("div");
    picto.className = "ouverture-picto";
    const taille = svg ? svg.getBoundingClientRect().width : 46;
    picto.style.cssText = "left:" + (r.left + r.width / 2 - taille / 2) + "px;top:" + (r.top + r.height / 2 - taille / 2) + "px;width:" + taille + "px;height:" + taille + "px";
    if (svg) picto.innerHTML = svg.outerHTML;

    document.body.append(surface, picto);
    if (svg) icone.style.visibility = "hidden";
    enCours = { surface: surface, picto: picto, icone: icone };

    const debut = "inset(" + r.top + "px " + (l - r.right) + "px " + (h - r.bottom) + "px " + r.left + "px round " + rayon + "px)";
    surface.animate([
      { clipPath: debut, opacity: 0.55 },
      { opacity: 1, offset: 0.3 },
      { clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1 }
    ], { duration: DUREE, easing: COURBE, fill: "forwards" });

    // Le pictogramme rejoint le centre et double de taille (92 px, comme le voile d'entrée).
    const dx = l / 2 - (r.left + r.width / 2), dy = h / 2 - (r.top + r.height / 2);
    const animation = picto.animate([
      { transform: "none" },
      { transform: "translate(" + dx + "px, " + dy + "px) scale(" + (92 / taille) + ")" }
    ], { duration: DUREE, easing: COURBE, fill: "forwards" });

    // On transmet les couleurs et le pictogramme à la page d'arrivée.
    try { sessionStorage.setItem(CLE, JSON.stringify({ fond: lien.dataset.appFond, glyphe: svg ? svg.innerHTML : "" })); } catch (e) { /* sans voile d'entrée : pas grave */ }

    let parti = false;
    const partir = function () { if (!parti) { parti = true; window.location.href = lien.href; } };
    animation.onfinish = partir;
    setTimeout(partir, DUREE + 200); // si l'onglet est en arrière-plan, l'animation peut ne jamais finir
  });
})();
