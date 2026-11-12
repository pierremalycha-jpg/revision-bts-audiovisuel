/* ==========================================================================
   contenu.js — LE CONTENU DE L'APPLICATION (MODÈLE À ADAPTER)
   --------------------------------------------------------------------------
   Ce fichier ne contient QUE du texte. Le menu, l'accueil, la mise en page
   des notions, l'évaluation sur 20, le déblocage des modules et
   l'enregistrement des notes sont faits par js/application.js.

   Règles d'écriture (les mêmes que pour du JavaScript ordinaire) :
     - les textes sont entre guillemets droits " " ; pour un guillemet DANS
       un texte, utilise les guillemets français « » ou l'apostrophe ’ ;
     - les éléments d'une liste sont séparés par une virgule ;
     - on peut mettre en gras avec <b>…</b> et écrire un exposant avec <sup>…</sup>.
   Si la page reste blanche après une modification, il manque presque
   toujours une virgule, un guillemet ou une accolade : ouvre la console du
   navigateur (F12, onglet « Console ») pour voir la ligne en cause.

   Le ton et la structure à respecter sont décrits dans
   docs/CHARTE-APPLICATIONS.md (l'application de photométrie sert de modèle).
   ========================================================================== */

// Raccourcis pour les questions tirées au sort (les valeurs changent à chaque tentative).
const H = Application.hasard;     // H(2, 9)          → un entier entre 2 et 9
const C = Application.choisir;    // C([1.5, 2, 3])   → une valeur au hasard dans la liste
const NB = Application.nombre;    // NB(1234.5, 1)    → « 1 234,5 » (écriture française)

const APPLICATION = {
  // À ADAPTER : identique à l'« id » déclaré dans js/catalogue.js.
  // C'est sous ce nom (suivi du numéro de module) que les notes sont enregistrées :
  // NE LE CHANGE PLUS une fois l'application en ligne.
  id: "identifiant-a-changer",
  titre: "Nom de l’application",          // court : il s'affiche dans le menu
  accroche: "Une phrase d’accroche.",      // en dégradé sous le titre
  epreuve: "TES",                          // "TES" ou "TMO"
  intro: "Deux modules pour comprendre <b>la notion</b>. Chaque module se termine par une évaluation : obtenez au moins <b>12/20</b> pour débloquer le suivant.",
  // Facultatif :
  // noteMinimale: 12,   // note pour valider un module (12 par défaut)
  // deblocage: false,   // false = tous les modules ouverts dès le départ

  modules: [
    /* ======================================================================
       MODULE 1 — chaque module a les mêmes rubriques, dans le même ordre
       ====================================================================== */
    {
      titre: "Titre du module 1",            // grand titre de la page du module
      nav: "Mot court",                       // libellé dans le menu latéral
      resume: "Trois mots-clés, séparés",     // sous le libellé, et sur la tuile du parcours
      intro: "Un paragraphe qui dit <b>ce que l’on va comprendre</b> et pourquoi c’est utile sur un plateau ou en régie.",

      /* ---- 1. COMPRENDRE : les mots et les formules ------------------------
         Chaque mot devient une question dépliable. Champs d'un mot :
           t   le mot (obligatoire)          d   la définition (obligatoire)
           s   son symbole (facultatif)      u   son unité (facultatif)
           ic  un émoji, pour le repérer     q   la question affichée (sinon : « Mot : de quoi s’agit-il ? »)
           c   une COMPARAISON avec la vie de tous les jours (fortement conseillé)
           r   des REPÈRES : valeurs typiques, ordres de grandeur */
      notions: {
        titre: "Les mots de la notion",
        intro: "Une ou deux phrases qui relient les mots entre eux.",
        mots: [
          { t: "Grandeur", s: "G", u: "unité (u)", ic: "💡", d: "Ce que mesure cette grandeur, en <b>une phrase simple</b>.", c: "Une comparaison avec la vie de tous les jours.", r: "Valeur typique ≈ 100 u · valeur forte ≈ 10 000 u." },
          { t: "Deuxième mot", ic: "🎯", q: "À quoi sert le deuxième mot ?", d: "Sa définition, sans jargon inutile." }
        ],
        /* Une formule : f (la formule), say (comment la lire à voix haute),
           rows (un tableau [symbole, nom, unité, rôle] par lettre), ex (un exemple chiffré). */
        formules: [
          { q: "Comment calcule-t-on la grandeur G ?", f: "G = A × B", say: "G est égal à A multiplié par B", rows: [["G", "la grandeur", "u", "ce que l’on cherche"], ["A", "premier facteur", "—", "son rôle"], ["B", "second facteur", "—", "son rôle"]], ex: "A = 2 et B = 5 : G = 2 × 5 = 10 u." }
        ]
      },

      /* ---- 2. MANIPULER : le labo -----------------------------------------
         Le HTML du labo est dans index.html (<template data-labo="1">),
         le code dans labos.js. Ici, seulement son titre et sa consigne. */
      manipuler: {
        titre: "Titre du labo",
        intro: "La consigne : <b>quoi changer</b> et <b>quoi observer</b>."
      },

      /* ---- 3. RETENIR : l'essentiel avant l'évaluation --------------------- */
      essentiel: {
        definitions: ["<b>Grandeur</b> : la définition en une ligne."],
        formules: [["G = A × B", "un rappel court sous la formule"]],
        reperes: ["Valeur typique ≈ 100 u."],
        pieges: ["L’erreur que font vraiment les élèves, et comment l’éviter."]
      },

      /* ---- 4. S'ÉVALUER : les banques de questions -------------------------
         À chaque tentative, le moteur tire 10 questions (2 points chacune) :
           2 « lire » · 2 « comprendre » · 2 « qcm » · 3 « calculer » · 1 « exercice ».
         Mets PLUS de questions que nécessaire dans chaque banque : le tirage
         change alors d'une tentative à l'autre. Si une banque est trop
         petite, le moteur complète avec les autres.

         Formes acceptées :
           comprendre  ["affirmation", vrai (true/false), "explication", "indice"]
           qcm         ["question", "bonne réponse", ["fausse 1", "fausse 2", …], "explication", "indice"]
           objets (dans n'importe quelle banque) :
             { type: "qcm", question, bonne, mauvaises: [...], explication, indice, contexte, figure }
             { type: "vf", affirmation, vrai: true, explication, indice }
             { type: "nombre", question, reponse, unite, tolerance (0.03 = 3 %, par défaut), ecart (écart absolu), explication, indice }
             { type: "exercice", question, etapes: [ {question, reponse, unite} ou {question, bonne, mauvaises} ], solution, indice }
           Une FONCTION qui renvoie un objet : ses valeurs sont tirées au sort
           à chaque tentative (voir « calculer » ci-dessous).
         « contexte » s'affiche au-dessus de la question (fiche technique…),
         « figure » est un dessin (SVG) ou un tableau HTML à lire. */
      evaluation: {
        lire: [
          { type: "nombre", contexte: "Fiche technique : « Grandeur nominale : 250 u ».", question: "Quelle est la grandeur nominale ?", reponse: 250, unite: "u", ecart: 0, explication: "On lit directement 250 u sur la fiche.", indice: "Cherchez le nombre suivi de l’unité." }
        ],
        comprendre: [
          ["Une affirmation juste sur la notion.", true, "Pourquoi elle est juste."],
          ["Une affirmation fausse, mais tentante.", false, "Pourquoi elle est fausse.", "Un indice qui oriente sans donner la réponse."]
        ],
        qcm: [
          ["Une question de cours ?", "La bonne réponse", ["Une erreur fréquente", "Une autre erreur fréquente", "Une réponse plausible mais fausse"], "L’explication : POURQUOI c’est la bonne réponse."]
        ],
        calculer: [
          // Une fonction : A et B changent à chaque tentative.
          () => { const A = H(2, 9), B = C([5, 10, 20]); return { type: "nombre", question: "A = <b>" + A + "</b> et B = <b>" + B + "</b>. Calculez G.", reponse: A * B, unite: "u", explication: "G = A × B = " + A + " × " + B + " = " + NB(A * B) + " u.", indice: "G = A × B." }; }
        ],
        exercice: [
          () => { const A = H(2, 6); return { type: "exercice", question: "Un énoncé de situation réelle, avec A = <b>" + A + "</b>.", etapes: [
            { question: "Première étape : calculez 2 × A.", reponse: 2 * A, unite: "u" },
            { question: "Deuxième étape : le résultat est-il supérieur à 10 ?", bonne: 2 * A > 10 ? "Oui" : "Non", mauvaises: [2 * A > 10 ? "Non" : "Oui"] }
          ], solution: "a) 2 × " + A + " = " + 2 * A + ". b) " + (2 * A > 10 ? "Oui" : "Non") + ".", indice: "Commencez par la multiplication." }; }
        ]
      }
    },

    /* ======================================================================
       MODULE 2 — sans labo : il suffit de ne pas créer de <template data-labo="2">
       ====================================================================== */
    {
      titre: "Titre du module 2",
      nav: "Module 2",
      resume: "Mots-clés du module 2",
      intro: "Le deuxième module s’ouvre quand le premier est validé (12/20).",
      notions: {
        titre: "Les mots du module 2",
        mots: [{ t: "Troisième mot", ic: "📌", d: "Sa définition." }],
        formules: []
      },
      essentiel: { definitions: ["<b>Troisième mot</b> : sa définition."], pieges: ["Un piège."] },
      evaluation: {
        qcm: [
          ["Question 1 ?", "Bonne", ["Fausse A", "Fausse B"], "Explication."],
          ["Question 2 ?", "Bonne", ["Fausse A", "Fausse B"], "Explication."]
        ],
        comprendre: [["Affirmation.", true, "Explication."]]
      }
    }
  ]
};
