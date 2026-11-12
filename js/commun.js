/* ==========================================================================
   commun.js — ce qui est partagé par les pages de la plateforme
   --------------------------------------------------------------------------
   - insère l'en-tête et le pied de page (écrits une seule fois ici, au lieu
     d'être recopiés dans chaque fichier HTML : une modification suffit) ;
   - marque le lien de la page en cours et place le bouton de thème ;
   - affiche « Connexion » ou le prénom de l'élève connecté ;
   - fournit creerElement(), un raccourci utilisé par les autres scripts ;
   - fait apparaître doucement les blocs marqués .rv au défilement.
   Les applications construites avec le kit (js/application.js) ont leur
   propre menu latéral : elles n'utilisent ni l'en-tête ni le pied de page.
   ========================================================================== */

// Le nom affiché en haut de chaque page. Change-le ici si besoin.
const NOM_DU_SITE = "Révision BTS";
const SOUS_TITRE_DU_SITE = "Audiovisuel";

// Chemin pour remonter à la racine du site depuis la page courante.
// Chaque page l'indique sur sa balise <body> avec l'attribut data-racine :
//   - page à la racine (index.html…)        → data-racine=""
//   - page d'une application (modules/xxx/) → data-racine="../../"
// Pourquoi des chemins relatifs ? Sur GitHub Pages, le site est publié dans un
// sous-dossier (https://pseudo.github.io/nom-du-depot/). Un lien commençant
// par « / » pointerait à côté ; un lien relatif fonctionne partout.
const RACINE = document.body.dataset.racine || "";

// Petites icônes de l'interface (soleil, lune…), en SVG : nettes à toutes les tailles.
const PICTOS = {
  soleil: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  lune: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7z" fill="currentColor"/></svg>'
};

// Crée un élément HTML en une ligne : creerElement("p", "discret", "Bonjour").
// On passe par textContent (et non innerHTML) : le texte est affiché tel
// quel, même s'il contient des caractères spéciaux comme < ou &.
function creerElement(balise, classe, texte) {
  const element = document.createElement(balise);
  if (classe) element.className = classe;
  if (texte !== undefined) element.textContent = texte;
  return element;
}

function insererEntete() {
  const entete = document.getElementById("entete");
  if (!entete) return;
  entete.innerHTML =
    '<div class="entete-contenu">' +
    '  <a class="logo" href="' + RACINE + 'index.html"><i class="brand-mark" aria-hidden="true"></i>' + NOM_DU_SITE + " <span>" + SOUS_TITRE_DU_SITE + "</span></a>" +
    '  <nav class="navigation" aria-label="Navigation principale">' +
    '    <a href="' + RACINE + 'tiee.html" data-page="tiee">Option TIEE</a>' +
    '    <a href="' + RACINE + 'image.html" data-page="image">Option IMAGE</a>' +
    '    <a href="' + RACINE + 'tableau-de-bord.html" data-page="progression">Ma progression</a>' +
    "  </nav>" +
    '  <div class="zone-compte" id="zone-compte"></div>' +
    '  <button class="bouton-theme" id="bouton-theme" type="button"></button>' +
    "</div>" +
    '<div class="mire" aria-hidden="true"></div>';

  // Le lien de la page en cours est mis en évidence (et annoncé aux lecteurs d'écran).
  const page = document.body.dataset.page;
  entete.querySelectorAll(".navigation a").forEach(function (lien) {
    if (lien.dataset.page === page) lien.setAttribute("aria-current", "page");
  });

  const boutonTheme = document.getElementById("bouton-theme");
  function dessinerBoutonTheme() {
    const sombre = document.documentElement.getAttribute("data-theme") === "dark";
    boutonTheme.innerHTML = sombre ? PICTOS.soleil : PICTOS.lune;
    boutonTheme.title = sombre ? "Passer en mode clair (conseillé au vidéoprojecteur)" : "Passer en mode sombre";
    boutonTheme.setAttribute("aria-label", boutonTheme.title);
  }
  boutonTheme.addEventListener("click", function () {
    themeBasculer();
    dessinerBoutonTheme();
  });
  dessinerBoutonTheme();
}

function insererPied() {
  const pied = document.getElementById("pied");
  if (!pied) return;
  pied.innerHTML =
    "<span>Plateforme de révision TES et TMO — options TIEE et IMAGE.</span>" +
    "<span>D'après les cours de Pierre MALYCHA · BTS Audiovisuel · Lycée Henri Martin, Saint-Quentin</span>";
}

// Met à jour le coin « compte » de l'en-tête selon la situation.
function afficherZoneCompte(utilisateur) {
  const zone = document.getElementById("zone-compte");
  if (!zone) return;
  zone.textContent = ""; // on vide avant de reconstruire

  if (!Suivi.firebaseActif) {
    const mention = creerElement("span", "etiquette etiquette-neutre", "Mode local");
    mention.title = "Firebase n'est pas encore configuré : la progression reste sur cet appareil.";
    zone.append(mention);
    return;
  }

  if (utilisateur) {
    zone.append(creerElement("span", "discret", "Bonjour " + (utilisateur.displayName || utilisateur.email)));
    const bouton = creerElement("button", "bouton bouton-secondaire bouton-petit", "Déconnexion");
    bouton.type = "button";
    bouton.addEventListener("click", function () {
      Suivi.deconnecter();
    });
    zone.append(bouton);
  } else {
    const lien = creerElement("a", "bouton bouton-petit", "Connexion");
    lien.href = RACINE + "connexion.html";
    zone.append(lien);
  }
}

// Apparition douce des blocs marqués .rv quand ils entrent à l'écran.
// Pourquoi IntersectionObserver ? Le navigateur prévient lui-même quand un
// bloc devient visible : rien à calculer à chaque défilement.
const Apparition = {
  observateur: null,
  scanner(racine) {
    const blocs = (racine || document).querySelectorAll(".rv:not(.rv-in)");
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit || !("IntersectionObserver" in window)) {
      blocs.forEach(function (bloc) { bloc.classList.add("rv-in"); });
      return;
    }
    if (!this.observateur) {
      this.observateur = new IntersectionObserver(function (entrees, obs) {
        entrees.forEach(function (entree) {
          if (entree.isIntersecting) {
            entree.target.classList.add("rv-in");
            obs.unobserve(entree.target);
          }
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    }
    blocs.forEach(function (bloc) { this.observateur.observe(bloc); }, this);
  }
};

insererEntete();
insererPied();
Suivi.surChangementUtilisateur(afficherZoneCompte);
document.addEventListener("DOMContentLoaded", function () { Apparition.scanner(); });
