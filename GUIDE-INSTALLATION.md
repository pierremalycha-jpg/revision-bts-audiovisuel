# Guide d'installation pas à pas

Ce guide part de zéro. Compte environ 45 minutes pour l'ensemble. Tu peux t'arrêter après la partie 2 : le site sera déjà en ligne et utilisable, en « mode local ». Firebase (partie 3) ajoute les comptes et la progression en ligne.

Les intitulés des boutons de GitHub et de Firebase évoluent parfois légèrement. Si un libellé diffère, cherche celui qui s'en rapproche le plus.

Dans tout le guide, remplace **PSEUDO** par ton nom d'utilisateur GitHub.

---

## Partie 1 — Créer le dépôt GitHub

Un *dépôt* (repository) est un dossier en ligne qui contient les fichiers du site et garde l'historique de toutes leurs modifications.

1. Va sur <https://github.com> et clique sur **Sign up** pour créer un compte. Choisis ton nom d'utilisateur avec soin : il apparaîtra dans l'adresse du site.
2. Une fois connecté, clique sur le **+** en haut à droite, puis **New repository**.
3. Remplis le formulaire :
   - **Repository name** : `revision-bts-audiovisuel`
   - **Description** (facultatif) : `Plateforme de révision TMO et TES — BTS audiovisuel`
   - **Public** : laisse coché. Avec un compte gratuit, GitHub Pages ne publie que les dépôts publics.
   - **Add a README file** : laisse décoché, le projet en contient déjà un.
4. Clique sur **Create repository**.
5. Sur la page qui s'affiche, clique sur le lien **uploading an existing file**.
6. Sur ton ordinateur, ouvre le dossier `revision-bts-audiovisuel`, sélectionne **tout son contenu** (les fichiers et les dossiers `css`, `js`, `modules`) et fais-le glisser dans la page GitHub.
   - Attention : glisse le *contenu* du dossier, pas le dossier lui-même. Le fichier `index.html` doit se retrouver directement à la racine du dépôt.
7. Attends la fin de l'envoi, puis clique sur **Commit changes** en bas de page. Un *commit* est un enregistrement daté de tes modifications.

**Vérification :** la page du dépôt affiche `index.html`, `README.md` et les dossiers `css`, `js`, `modules`.

---

## Partie 2 — Publier le site avec GitHub Pages

1. Dans le dépôt, clique sur l'onglet **Settings**.
2. Dans le menu de gauche, clique sur **Pages**.
3. Sous **Build and deployment** :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main`, dossier `/ (root)`
4. Clique sur **Save**.
5. Patiente une à deux minutes, puis recharge la page : l'adresse du site s'affiche en haut.

Ton site est en ligne à l'adresse :

```
https://PSEUDO.github.io/revision-bts-audiovisuel/
```

**Vérification :** la page d'accueil s'affiche, avec la mention « Mode local » en haut à droite. Touche l'icône « Signal vidéo numérique » et fais l'évaluation du module 1.

### Modifier le site ensuite

- **Petite modification** : sur GitHub, ouvre le fichier, clique sur le crayon, modifie, puis **Commit changes**. Le site est mis à jour une à deux minutes plus tard.
- **Nouvelle application (plusieurs fichiers)** : ouvre le dossier `modules` sur GitHub, puis **Add file › Upload files**, et glisse le dossier de la nouvelle application. N'oublie pas de la déclarer dans `js/catalogue.js`.
- **Si tu ne vois pas ta modification** : le navigateur a gardé l'ancienne version. Recharge avec **Ctrl + F5** (Windows) ou **Cmd + Maj + R** (Mac).

Plus tard, l'application gratuite [GitHub Desktop](https://desktop.github.com/) te permettra de travailler sur ton ordinateur et d'envoyer toutes tes modifications en un clic.

---

## Partie 3 — Connecter Firebase

Firebase est un service de Google. On en utilise deux briques :

- **Authentication** : les comptes des étudiants (e-mail et mot de passe) ;
- **Firestore** : la base de données qui garde leur progression.

L'offre gratuite (appelée **Spark**) suffit largement pour une classe et ne demande pas de carte bancaire : aucune facture surprise n'est possible.

### 3.1 Créer le projet

1. Va sur <https://console.firebase.google.com> et connecte-toi avec un compte Google.
2. Clique sur **Créer un projet** et donne-lui un nom, par exemple `revision-bts-audiovisuel`.
3. **Google Analytics** : désactive-le. Le site n'en a pas besoin, et cela évite de collecter des données inutiles sur les étudiants.
4. Clique sur **Créer le projet** et attends la fin de la création.

### 3.2 Déclarer le site et récupérer la configuration

1. Sur la page d'accueil du projet, clique sur l'icône **Web** (`</>`) pour ajouter une application.
2. Donne-lui un surnom (`site-revision`). Laisse **Firebase Hosting** décoché : le site est hébergé par GitHub.
3. Clique sur **Enregistrer l'application**.
4. Firebase affiche un bloc de code. La seule partie utile est l'objet `firebaseConfig` :

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "ton-projet.firebaseapp.com",
     projectId: "ton-projet",
     storageBucket: "ton-projet.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

   Ignore les lignes `npm install` et `import` : elles concernent une autre façon de travailler.
5. Garde cette page ouverte, on y revient à l'étape 3.5. Tu peux aussi retrouver ce bloc à tout moment : roue dentée › **Paramètres du projet** › onglet **Général** › **Vos applications**.

### 3.3 Activer la connexion par e-mail

1. Menu de gauche : **Authentication** (dans la rubrique « Créer »), puis **Commencer**.
2. Onglet **Mode de connexion** (Sign-in method) : clique sur **Adresse e-mail/Mot de passe**.
3. Active le premier interrupteur seulement, puis **Enregistrer**.
4. Onglet **Paramètres** › **Domaines autorisés** › **Ajouter un domaine** : saisis `PSEUDO.github.io` (sans `https://`, sans le nom du dépôt).

### 3.4 Créer la base de données et la protéger

1. Menu de gauche : **Firestore Database**, puis **Créer une base de données**.
2. **Emplacement** : choisis une région européenne (par exemple `eur3 (Europe)` ou `europe-west9 (Paris)`). Ce choix est définitif. Si une édition t'est demandée, garde **Standard**.
3. Choisis **Démarrer en mode production** : tout est verrouillé par défaut, c'est le bon réflexe. Clique sur **Créer**.
4. Ouvre l'onglet **Règles**. Efface tout le contenu et colle à la place celui du fichier `firestore.rules` du projet.
5. Clique sur **Publier**.

Ces règles disent : « un étudiant connecté peut lire et écrire uniquement ses propres données ; tout le reste est interdit ».

### 3.5 Renseigner la configuration dans le site

1. Sur GitHub, ouvre `js/firebase-config.js` et clique sur le crayon.
2. Remplace chaque valeur `"A_REMPLACER..."` par la valeur correspondante de ton `firebaseConfig` (étape 3.2). Garde les guillemets et les virgules. Le nom `FIREBASE_CONFIG` en majuscules ne doit pas changer.
3. Clique sur **Commit changes**, attends une à deux minutes.

### 3.6 Vérifier que tout fonctionne

1. Ouvre le site et recharge avec **Ctrl + F5**. En haut à droite, « Mode local » a laissé la place à un bouton **Connexion**.
2. Clique dessus, puis sur **Créer un compte**, et inscris un compte de test.
3. Fais l'évaluation du module 1 de l'application « Signal vidéo numérique ». À la fin, le message doit être « Note enregistrée dans votre compte ».
4. Dans la console Firebase :
   - **Authentication › Utilisateurs** : ton compte de test apparaît ;
   - **Firestore Database › Données** : une collection `utilisateurs` contient ta fiche et, dedans, une sous-collection `progression`.
5. Ouvre le site sur un autre appareil (ton téléphone), connecte-toi : la progression est là.

---

## Partie 4 — Sécurité : ce qui peut être public, ce qui ne doit pas l'être

### Les « clés » de `firebase-config.js` peuvent être publiques

C'est contre-intuitif, mais normal. Ces valeurs ne sont pas des mots de passe : elles indiquent seulement au navigateur à quel projet Firebase s'adresser. Elles sont de toute façon envoyées à chaque visiteur du site. Les garder secrètes est impossible, et inutile.

Il est possible que GitHub ou Google t'envoie un e-mail du type « clé d'API exposée publiquement ». Pour une clé de configuration web Firebase, c'est attendu. Vérifie simplement que les protections ci-dessous sont en place.

### Ce qui protège réellement les données

1. **Les règles Firestore** (étape 3.4). C'est la protection principale. Ne les remplace jamais par des règles de « mode test » (`allow read, write: if true`), qui ouvriraient la base à tout internet.
2. **Les domaines autorisés** (étape 3.3).
3. **L'offre gratuite Spark** : sans carte bancaire enregistrée, un usage abusif peut au pire épuiser le quota gratuit de la journée, jamais te coûter d'argent.

### Ce qu'il ne faut JAMAIS mettre dans le dépôt

- Un fichier de **compte de service** : la clé privée `.json` que l'on télécharge dans Paramètres du projet › Comptes de service. Elle donne tous les droits sur le projet. Ce site n'en a pas besoin.
- Un mot de passe, quel qu'il soit.
- La clé d'un service payant (par exemple une clé d'API d'intelligence artificielle).
- Des données personnelles d'étudiants (listes de noms, notes).

Rappel : dans un dépôt public, tout est visible, y compris l'historique. Un secret envoyé par erreur doit être considéré comme compromis : il faut le révoquer, pas seulement le supprimer.

### Renforcement facultatif : restreindre la clé d'API

À faire plus tard, une fois que tout fonctionne. Dans la [console Google Cloud](https://console.cloud.google.com/apis/credentials), sélectionne ton projet, ouvre la clé nommée « Browser key (auto created by Firebase) » et, dans les restrictions d'application, limite-la aux sites web `PSEUDO.github.io/*` et `TON-PROJET.firebaseapp.com/*`. La clé ne sera alors acceptée que depuis ton site. Si la connexion cesse de fonctionner après ce réglage, retire la restriction : c'est qu'une adresse manque dans la liste.

### Limites à connaître

- Les scores sont calculés dans le navigateur de l'étudiant. Un étudiant débrouillard pourrait s'inscrire un faux score dans **sa propre** fiche. C'est sans conséquence pour un outil de révision, mais ces scores ne doivent pas servir à noter.
- En tant que propriétaire du projet, tu vois dans la console les adresses e-mail, prénoms et scores des étudiants. Préviens-les de ce qui est enregistré et pourquoi, et supprime les comptes en fin de formation (Authentication › Utilisateurs). Renseigne-toi auprès de ton établissement sur ses règles en matière de données personnelles (RGPD).

---

## En cas de problème

| Symptôme | Cause probable et solution |
|---|---|
| Page 404 à l'adresse du site | Attends deux minutes après l'activation de Pages. Vérifie que `index.html` est à la racine du dépôt (et non dans un sous-dossier) et que le dépôt est public. |
| Le site s'affiche sans mise en forme | Le dossier `css` n'a pas été envoyé, ou pas au bon endroit. |
| « Mode local » reste affiché après l'étape 3.5 | Recharge avec Ctrl + F5. Vérifie que `apiKey` ne vaut plus `"A_REMPLACER"` dans `js/firebase-config.js` sur GitHub. |
| Plus rien ne s'affiche après avoir modifié un fichier `.js` | Il manque une virgule, un guillemet ou une accolade. Appuie sur **F12**, onglet **Console** : le message en rouge indique le fichier et la ligne. |
| « La connexion par e-mail n'est pas activée » | Étape 3.3 non faite. |
| « Accès refusé par la base de données » | Les règles Firestore n'ont pas été publiées (étape 3.4), ou la base n'a pas été créée. |
| L'icône d'une nouvelle application n'apparaît pas sur l'accueil | L'application n'est pas déclarée dans `js/catalogue.js`, ou une virgule manque entre deux blocs. |
| Les notes d'une nouvelle application ne s'affichent pas dans la progression | L'`id` du catalogue et l'`id` écrit en tête de son `contenu.js` ne sont pas identiques, ou le nombre de `modules` du catalogue est faux. |
| La page d'une application reste blanche | Une erreur dans `contenu.js` ou `labos.js` (virgule, guillemet, accolade). **F12**, onglet **Console** : le message en rouge indique le fichier et la ligne. |
| La progression de la photométrie n'apparaît pas sur l'accueil | Elle est lue dans le navigateur : il faut avoir ouvert la photométrie sur le même appareil et le même navigateur que la plateforme. |
