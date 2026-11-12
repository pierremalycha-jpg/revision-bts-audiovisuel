/* ==========================================================================
   applications.js — outils communs pour présenter les applications
   --------------------------------------------------------------------------
   Utilisé par l'accueil, les pages d'option et le tableau de bord :
     - Applications.icone(app)           fabrique l'icône (carré arrondi + dégradé)
     - Applications.progression(app, p)  résume la progression d'une application
     - Applications.anneau(f, taille, e) dessine un anneau de progression (SVG)
   Pourquoi ici et pas dans catalogue.js ? Le catalogue ne contient que des
   données, faciles à modifier sans risque ; la logique est rangée à part.
   ========================================================================== */

const NOTE_DE_VALIDATION = 12; // un module est validé à partir de 12/20 (comme dans la photométrie)

const Applications = {
  // L'icône d'une application. « taille » est facultative (sinon : CSS).
  icone(app) {
    const icone = creerElement("span", "app-ic");
    const couleurs = app.teinte && app.teinte.length ? app.teinte : ["#ff9500", "#ff2d55", "#af52de"];
    icone.style.setProperty("--app-grad", "linear-gradient(160deg, " + couleurs.join(", ") + ")");
    icone.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[app.icone] || ICONES.plus) + "</svg>";
    return icone;
  },

  /* Résume la progression d'une application, quelle que soit sa façon de
     l'enregistrer. « progressionSuivi » est l'objet renvoyé par
     Suivi.lireProgression(). Renvoie :
       { total, valides, tentes, moyenne, tentatives, date, modules: [ {meilleure, essais} ] } */
  progression(app, progressionSuivi) {
    const total = app.modules || 1;
    const modules = [];
    for (let n = 1; n <= total; n++) modules.push({ meilleure: null, essais: 0, date: null });

    if (app.suivi === "photometrie") {
      // L'application de photométrie garde sa progression dans le navigateur,
      // sous la clé « photometrie-progression-v1 » : { mods: { m1: { best, attempts, lastAt } } }.
      // Le site entier est sur la même adresse : la page peut donc la lire.
      let donnees = null;
      try { donnees = JSON.parse(localStorage.getItem("photometrie-progression-v1")); } catch (e) { donnees = null; }
      const mods = (donnees && donnees.mods) || {};
      modules.forEach(function (m, i) {
        const fiche = mods["m" + (i + 1)];
        if (!fiche) return;
        if (typeof fiche.best === "number") m.meilleure = fiche.best;
        m.essais = fiche.attempts || 0;
        m.date = fiche.lastAt || fiche.bestAt || null;
      });
    } else {
      // Application du kit : une fiche par module, nommée « id-application.numéro ».
      const p = progressionSuivi || {};
      modules.forEach(function (m, i) {
        const fiche = p[app.id + "." + (i + 1)];
        if (!fiche) return;
        m.meilleure = (fiche.meilleurScore / fiche.total) * 20;
        m.essais = fiche.tentatives || 0;
        m.date = fiche.date ? Date.parse(fiche.date) : null;
      });
    }

    const tentes = modules.filter(function (m) { return m.meilleure !== null; });
    const somme = tentes.reduce(function (s, m) { return s + m.meilleure; }, 0);
    const dates = modules.map(function (m) { return m.date; }).filter(Boolean);
    return {
      total: total,
      modules: modules,
      valides: modules.filter(function (m) { return m.meilleure !== null && m.meilleure >= NOTE_DE_VALIDATION; }).length,
      tentes: tentes.length,
      moyenne: tentes.length ? somme / tentes.length : null,
      tentatives: modules.reduce(function (s, m) { return s + m.essais; }, 0),
      date: dates.length ? Math.max.apply(null, dates) : null
    };
  },

  // Anneau de progression : f entre 0 et 1.
  anneau(f, taille, epaisseur, ok) {
    const r = (taille - epaisseur) / 2;
    const c = 2 * Math.PI * r;
    const decalage = c * (1 - Math.max(0, Math.min(1, f)));
    return '<svg class="pring' + (ok ? " ok" : "") + '" width="' + taille + '" height="' + taille + '" viewBox="0 0 ' + taille + " " + taille + '" aria-hidden="true">' +
      '<circle class="pr-bg" cx="' + taille / 2 + '" cy="' + taille / 2 + '" r="' + r + '" stroke-width="' + epaisseur + '"/>' +
      '<circle class="pr-fg" cx="' + taille / 2 + '" cy="' + taille / 2 + '" r="' + r + '" stroke-width="' + epaisseur + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + decalage.toFixed(2) + '" transform="rotate(-90 ' + taille / 2 + " " + taille / 2 + ')"/></svg>';
  },

  // Une note sur 20, à la française : 13,5 ; 14.
  note(n) {
    return (Math.round(n * 10) / 10).toLocaleString("fr-FR");
  }
};
