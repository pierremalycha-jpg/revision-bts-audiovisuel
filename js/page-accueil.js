/* ==========================================================================
   page-accueil.js — remplit le « dock » de chaque carte d'option
   --------------------------------------------------------------------------
   Sous le nom de chaque option, on montre les icônes de ses applications :
   l'élève voit d'un coup d'œil ce qui l'attend. Les données viennent de
   js/catalogue.js : publier une application suffit à la faire apparaître ici.
   ========================================================================== */

document.querySelectorAll(".dock[data-option]").forEach(function (dock) {
  const apps = CATALOGUE.filter(function (app) {
    return app.disponible && app.options.includes(dock.dataset.option);
  });
  apps.slice(0, 6).forEach(function (app) {
    dock.append(Applications.icone(app));
  });
  // Une case en pointillés : d'autres applications vont arriver.
  dock.append(creerElement("span", "dock-vide"));
});
