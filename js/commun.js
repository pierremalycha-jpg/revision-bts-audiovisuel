/* ==========================================================================
   commun.js — ce qui est partagé par toutes les pages
   --------------------------------------------------------------------------
   - insère l'en-tête et le pied de page (écrits une seule fois ici, au lieu
     d'être recopiés dans chaque fichier HTML : une modification suffit) ;
   - affiche « Connexion » ou le prénom de l'élève connecté ;
   - fournit creerElement(), un raccourci utilisé par les autres scripts.
   ========================================================================== */

// Le nom affiché en haut de chaque page. Change-le ici si besoin.
const NOM_DU_SITE = "Révision BTS";
const SOUS_TITRE_DU_SITE = "Audiovisuel";

// Chemin pour remonter à la racine du site depuis la page courante.
// Chaque page l'indique sur sa balise <body> avec l'attribut data-racine :
//   - page à la racine (index.html…)        → data-racine=""
//   - page d'un module (modules/xxx/…)      → data-racine="../../"
// Pourquoi des chemins relatifs ? Sur GitHub Pages, le site est publié dans un
// sous-dossier (https://pseudo.github.io/nom-du-depot/). Un lien commençant
// par « / » pointerait à côté ; un lien relatif fonctionne partout.
const RACINE = document.body.dataset.racine || "";

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
    '  <a class="logo" href="' + RACINE + 'index.html">' + NOM_DU_SITE + " <span>" + SOUS_TITRE_DU_SITE + "</span></a>" +
    '  <nav class="navigation" aria-label="Navigation principale">' +
    '    <a href="' + RACINE + 'tiee.html">TIEE</a>' +
    '    <a href="' + RACINE + 'image.html">IMAGE</a>' +
    '    <a href="' + RACINE + 'tableau-de-bord.html">Ma progression</a>' +
    "  </nav>" +
    '  <div class="zone-compte" id="zone-compte"></div>' +
    "</div>" +
    '<div class="mire" aria-hidden="true"></div>';
}

function insererPied() {
  const pied = document.getElementById("pied");
  if (!pied) return;
  pied.textContent = "Plateforme de révision TMO et TES — options TIEE et IMAGE.";
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
    zone.append(creerElement("span", "", "Bonjour " + (utilisateur.displayName || utilisateur.email)));
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

insererEntete();
insererPied();
Suivi.surChangementUtilisateur(afficherZoneCompte);
