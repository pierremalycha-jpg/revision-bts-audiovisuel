/* ==========================================================================
   theme.js — thème clair ou sombre, appliqué AVANT l'affichage de la page
   --------------------------------------------------------------------------
   Ce petit fichier est chargé dans le <head> de chaque page, sans « defer » :
   il s'exécute avant que le navigateur ne dessine quoi que ce soit, ce qui
   évite un flash blanc quand l'élève a choisi le thème sombre.

   Le choix est mémorisé sous deux noms : « revision-bts-theme » (plateforme)
   et « photometrie-theme » (application de photométrie, qui l'utilisait déjà).
   Ainsi, toute la plateforme garde le même thème d'une page à l'autre.
   Par défaut : thème clair (plus lisible au vidéoprojecteur), comme dans la
   photométrie.
   ========================================================================== */

const THEME_CLES = ["revision-bts-theme", "photometrie-theme"];

function themeLire() {
  try {
    for (const cle of THEME_CLES) {
      const valeur = localStorage.getItem(cle);
      if (valeur === "dark" || valeur === "light") return valeur;
    }
  } catch (erreur) {
    // Stockage bloqué (navigation privée stricte) : on reste en clair.
  }
  return "light";
}

function themeAppliquer(theme) {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

function themeChoisir(theme) {
  themeAppliquer(theme);
  try {
    THEME_CLES.forEach(function (cle) { localStorage.setItem(cle, theme); });
  } catch (erreur) { /* rien de grave : le thème ne sera simplement pas mémorisé */ }
  // Les dessins (canvas) des applications doivent être refaits avec les
  // nouvelles couleurs : on prévient qui veut l'entendre.
  document.dispatchEvent(new CustomEvent("theme-change", { detail: theme }));
}

function themeBasculer() {
  themeChoisir(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
}

themeAppliquer(themeLire());
