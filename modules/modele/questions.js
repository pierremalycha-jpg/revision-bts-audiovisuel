/* ==========================================================================
   questions.js — les questions du module (MODÈLE À ADAPTER)
   --------------------------------------------------------------------------
   Règles d'écriture :
     - chaque question est un bloc entre accolades { ... } ;
     - les blocs sont séparés par une virgule (pas de virgule après le dernier) ;
     - les textes sont entre guillemets droits " " ; pour écrire un guillemet
       DANS un texte, utilise les guillemets français « » ;
     - « bonne » est la position de la bonne réponse EN COMPTANT À PARTIR DE 0 :
       0 = première réponse, 1 = deuxième, 2 = troisième…
     - l'ordre n'a pas d'importance : le quiz mélange questions et réponses.

   Conseils pour de bonnes questions :
     - une seule notion par question ;
     - des mauvaises réponses plausibles (les erreurs que font vraiment les
       étudiants), de longueur proche de la bonne ;
     - une explication qui dit POURQUOI, pas seulement « la réponse était B ».

   Si le quiz ne s'affiche plus après une modification, il manque presque
   toujours une virgule, un guillemet ou une accolade : ouvre la console du
   navigateur (touche F12, onglet « Console ») pour voir la ligne en cause.
   ========================================================================== */

const QUESTIONS = [
  {
    question: "Texte de la première question ?",
    reponses: [
      "Première proposition",
      "Deuxième proposition",
      "Troisième proposition",
      "Quatrième proposition"
    ],
    bonne: 0,
    explication: "Explication affichée après la réponse."
  },
  {
    question: "Texte de la deuxième question ?",
    reponses: [
      "Vrai",
      "Faux"
    ],
    bonne: 1,
    explication: "Une question peut avoir de 2 à 5 propositions."
  }
];
