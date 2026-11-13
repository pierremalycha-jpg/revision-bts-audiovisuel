/* ==========================================================================
   textes.js — tout ce que le simulateur explique
   --------------------------------------------------------------------------
   Deux listes, faciles à relire et à corriger sans toucher au reste :

   AIDES        une fiche par réglage ou par élément du matériel :
                  titre    le nom affiché
                  quoi     ce que c'est, en une ou deux phrases simples
                  image    une comparaison de la vie courante (facultatif)
                  observer où regarder dans l'image pour voir l'effet
                  plateau / boitier   ce qui est propre à chaque configuration

   EXPERIENCES  les manipulations guidées : un réglage de départ (preparer),
                puis des étapes à suivre. « S » est la télécommande fournie
                par simulateur.js (voir « Experiences » dans ce fichier).

   Le HTML est permis (<b>, <i>). Vouvoiement, comme dans les labos du kit.
   ========================================================================== */

const AIDES = {
  /* ---------------------------- L'OBJECTIF ---------------------------- */
  focale: {
    titre: "Bague de zoom · la focale",
    quoi: "La focale règle l’<b>angle de champ</b> : courte, l’objectif voit large ; longue, il voit étroit et grossit le sujet. Un zoom fait varier la focale en déplaçant des groupes de lentilles.",
    image: "Regarder par une fenêtre : collé à la vitre, on voit tout le paysage (grand-angle) ; reculé au fond de la pièce, on n’en voit plus qu’un morceau (téléobjectif).",
    observer: "Le cadre, mais aussi le <b>flou</b> : à ouverture égale, une longue focale réduit beaucoup la profondeur de champ.",
    plateau: "Zoom <b>20×</b> : de 8,5 à 170 mm. Au-delà de 115 mm, l’ouverture maximale chute (f/1,8 → f/2,7) : l’image s’assombrit si le diaphragme est grand ouvert. C’est le <i>ramping</i>.",
    boitier: "Zoom <b>3×</b> : de 24 à 70 mm, ouverture constante f/2,8. Sur un capteur 3,7 fois plus large, 24 mm cadre comme 6,5 mm en 2/3″."
  },
  doubleur: {
    titre: "Doubleur de focale (×2)",
    quoi: "Un groupe de lentilles bascule dans le trajet et <b>double la focale</b> : 170 mm deviennent 340 mm. Le prix à payer : <b>deux diaphragmes de lumière en moins</b> (l’ouverture est doublée elle aussi) et des défauts optiques grossis.",
    observer: "L’image se resserre et s’assombrit de 2 IL : il faut compenser (gain ou filtre ND plus léger)."
  },
  bague: {
    titre: "Bague de mise au point",
    quoi: "Elle déplace un groupe de lentilles pour choisir la <b>distance du plan net</b>. Tout ce qui est à cette distance est net ; plus on s’en éloigne, plus c’est flou.",
    image: "Un projecteur de diapositives : on tourne la bague jusqu’à ce que l’image soit nette sur l’écran. Ici, l’écran est le capteur.",
    observer: "Dans la scène, le <b>cadre vert</b> est le plan net et la bande verte au sol, la zone nette. Dans l’image de la caméra, les repères de distance peints au sol montrent où elle commence et où elle finit.",
    plateau: "Méthode de plateau : <b>zoomer à fond</b> sur le sujet, faire le point, puis recadrer. Le point tient, car l’objectif est parfocal.",
    boitier: "Zoom varifocal : le point <b>glisse quand on zoome</b>. Il faut le refaire après chaque changement de focale (ou laisser travailler l’autofocus)."
  },
  ouverture: {
    titre: "Bague de diaphragme · l’ouverture",
    quoi: "Le diaphragme est un trou réglable. Le nombre d’ouverture <b>N = focale ÷ diamètre du trou</b> : un petit nombre (f/2) = un grand trou. Chaque cran (2 · 2,8 · 4 · 5,6 · 8 · 11 · 16) <b>divise la lumière par deux</b>.",
    image: "La pupille de l’œil : grande ouverte dans le noir, minuscule en plein soleil.",
    observer: "Trois effets à la fois : l’<b>exposition</b>, la <b>profondeur de champ</b> (fermer = plus de zone nette) et les <b>défauts</b> (ouvert : vignettage et mollesse ; très fermé : diffraction).",
    plateau: "Sur un plateau, le diaphragme est piloté depuis la régie par l’ingénieur vision, avec la manette du RCP.",
    boitier: "L’opérateur règle lui-même le diaphragme, sur la bague de l’objectif ou une molette du boîtier."
  },
  tirage: {
    titre: "Tirage optique (back focus)",
    quoi: "C’est la distance entre l’arrière de l’objectif et le capteur. Si elle est fausse de quelques centièmes de millimètre, l’objectif <b>n’est plus parfocal</b> : le point fait au téléobjectif est perdu en grand-angle.",
    image: "Une paire de lunettes posée trop loin du nez : la correction est bonne, mais l’image ne se forme plus au bon endroit.",
    observer: "Faites le point en longue focale, puis dézoomez : si l’image devient molle en grand-angle, le tirage est à régler.",
    plateau: "Procédure : diaphragme <b>grand ouvert</b> (ajouter du ND), viser une mire. 1) Zoomer à fond, faire le point avec la bague de mise au point. 2) Dézoomer à fond, rattraper la netteté avec la <b>bague de tirage</b>. 3) Recommencer jusqu’à ce que le point tienne sur toute la course."
  },
  af: {
    titre: "Autofocus",
    quoi: "Le boîtier mesure la netteté sur le capteur et déplace lui-même le groupe de mise au point. Ici, une pression fait le point <b>au centre de l’image</b>.",
    observer: "Après un coup de zoom, l’autofocus rattrape le glissement du zoom varifocal."
  },
  distance: {
    titre: "Distance caméra – sujet",
    quoi: "On avance ou on recule la caméra (travelling). Se rapprocher change la <b>perspective</b> et réduit la profondeur de champ : c’est le troisième levier du flou, avec la focale et l’ouverture.",
    observer: "Comparez : même cadre sur la présentatrice, de près en grand-angle ou de loin en longue focale. Le fond ne se présente plus du tout pareil."
  },

  /* --------------------------- L'EXPOSITION --------------------------- */
  lux: {
    titre: "Lumière du plateau",
    quoi: "L’<b>éclairement</b> du sujet, en lux. Un plateau TV est très éclairé : de 800 à 1 600 lux ; une pièce le soir, 30 à 100 lux. Diviser l’éclairement par deux demande un diaphragme de plus.",
    observer: "Baissez la lumière sans rien compenser : l’image s’assombrit d’un diaphragme à chaque division par deux."
  },
  kelvin: {
    titre: "Couleur de la lumière",
    quoi: "La <b>température de couleur</b>, en kelvins : 3 200 K pour le tungstène (orangé), 5 600 K pour la lumière du jour et la plupart des LED (plus bleue).",
    observer: "Changez la lumière sans toucher à la caméra : toute l’image se teinte. L’écran LED et les barres du décor, eux, gardent leur propre couleur."
  },
  nd: {
    titre: "Filtre neutre (ND)",
    quoi: "Des « lunettes de soleil » pour la caméra : il retire de la lumière <b>sans changer les couleurs</b>, ni la netteté, ni le flou. 1/4 = 2 diaphragmes, 1/16 = 4, 1/64 = 6.",
    observer: "Avec un ND, on peut <b>ouvrir le diaphragme</b> (moins de profondeur de champ, pas de diffraction) sans surexposer.",
    plateau: "La roue de filtres est <b>dans la tête de caméra</b>, entre l’objectif et le prisme. On la tourne à la main ou depuis le RCP.",
    boitier: "Le boîtier n’a <b>pas de filtre ND intégré</b> : il faut visser un filtre devant l’objectif."
  },
  obturation: {
    titre: "Obturation",
    quoi: "La durée pendant laquelle le capteur reçoit la lumière pour chaque image. Durée courte = moins de lumière, mais mouvements <b>figés</b> ; durée longue = mouvements <b>filés</b>.",
    image: "Cligner des yeux très vite devant un ventilateur : on voit les pales arrêtées.",
    observer: "Faites tourner la <b>roue</b> du décor (bouton sous le curseur) : au 1/50 elle file, au 1/1000 on lit les chiffres. Chaque division par deux de la durée coûte un diaphragme.",
    plateau: "En 50i, l’obturateur « OFF » correspond au 1/50 s. On ne le change que pour le sport ou pour filmer un écran.",
    boitier: "Règle des 180° : une durée égale à la moitié de la durée d’une image (1/50 s à 25 images par seconde) donne un filé naturel."
  },
  sensibilite: {
    titre: "Gain · sensibilité ISO",
    quoi: "Une <b>amplification électrique</b> du signal du capteur. Elle n’ajoute aucune lumière : elle amplifie tout, le signal comme le <b>bruit</b>. +6 dB = ISO doublé = un diaphragme.",
    image: "Monter le volume d’un enregistrement trop faible : on entend mieux la voix… et le souffle.",
    observer: "Regardez les zones sombres (veste, mur) : le bruit y apparaît en premier.",
    plateau: "En décibels : 0 dB est le réglage normal (équivalent à environ 1 000 ISO). +6 dB double le signal.",
    boitier: "En ISO. Ce capteur a <b>deux sensibilités de base</b> (800 et 12 800 en S-Log3) : à 12 800 ISO un second étage de gain prend le relais, et le bruit <b>redescend</b>."
  },
  blanc: {
    titre: "Balance des blancs",
    quoi: "La caméra dose le rouge, le vert et le bleu pour qu’un objet blanc sorte <b>blanc</b> sous la lumière du lieu. On lui indique la température de couleur de cette lumière.",
    observer: "Caméra réglée trop haut (5 600 K sous du tungstène) : image <b>orangée</b>. Trop bas : image <b>bleue</b>. Le bouton « Faire le blanc » règle la caméra sur la lumière du plateau.",
    plateau: "Positions du filtre de correction électronique (3 200, 4 300, 5 600, 6 300 K), puis balance automatique sur une feuille blanche.",
    boitier: "Réglage direct en kelvins, de 2 500 à 9 900 K."
  },

  /* ---------------------- LE TRAITEMENT DE L'IMAGE --------------------- */
  gamma: {
    titre: "Courbe de gamma",
    quoi: "Le capteur répond en ligne droite ; l’œil, non. La courbe de gamma <b>étire les basses lumières</b> et tasse les hautes pour ranger l’image dans le signal vidéo. ITU-709 est la courbe standard de la télévision.",
    observer: "Dans la fenêtre « Oscilloscope et courbe » (menu Afficher), la courbe montre où tombe chaque ton. Le « master gamma » creuse ou éclaircit les tons moyens sans bouger le noir ni le blanc.",
    boitier: "<b>S-Cinetone</b> adoucit le contraste et les hautes lumières. <b>S-Log3</b> est une courbe logarithmique : image grise et plate, mais toute la dynamique est conservée pour l’étalonnage."
  },
  masterGamma: {
    titre: "Master gamma",
    quoi: "Il modifie la courbure du gamma : les <b>tons moyens</b> s’éclaircissent ou s’assombrissent, sans déplacer le noir ni le blanc.",
    observer: "Le visage et le pupitre changent de luminosité ; sur l’oscilloscope, le milieu de la trace monte ou descend alors que ses extrémités restent en place."
  },
  masterBlack: {
    titre: "Master black (piédestal)",
    quoi: "Le <b>niveau du noir</b>. Trop haut : les noirs sont gris, l’image est voilée. Trop bas : les ombres se bouchent, les détails sombres disparaissent.",
    observer: "Sur l’oscilloscope, le bas de la trace décolle de 0 % ou s’y écrase."
  },
  blackGamma: {
    titre: "Black gamma",
    quoi: "Une retouche de la courbe <b>limitée aux basses lumières</b> : on éclaircit ou on assombrit les ombres sans toucher au noir absolu, aux tons moyens ni aux blancs. La « plage » dit jusqu’où la retouche remonte dans les gris.",
    image: "Le curseur « ombres » d’une retouche photo.",
    observer: "La veste et les cheveux de la présentatrice : en positif, les rayures et les mèches apparaissent ; en négatif, tout se fond dans le noir.",
    plateau: "Réglage du menu Paint, piloté depuis le RCP (échelle −99 à +99 sur la caméra réelle).",
    boitier: "Réglage du profil d’image : niveau de −7 à +7, plage étroite, moyenne ou large."
  },
  blackStretch: {
    titre: "Black stretch · black press",
    quoi: "Deux noms pour la même famille d’outils. <b>Black stretch</b> : on <i>étire</i> les noirs, les ombres s’éclaircissent et se détaillent (black gamma positif). <b>Black press</b> (ou compress) : on les <i>comprime</i>, les ombres se densifient (black gamma négatif).",
    observer: "Chez Sony, la fonction s’appelle Black gamma ; chez d’autres constructeurs (Panasonic, JVC…), Black stretch et Black press."
  },
  knee: {
    titre: "Knee (compression des blancs)",
    quoi: "Au-dessus du <b>point de knee</b>, la courbe se « plie » : les hautes lumières sont fortement comprimées pour tenir sous 109 % au lieu d’être coupées. Le capteur encaisse plusieurs fois le blanc ; le knee décide de ce qu’on en garde.",
    image: "Un plafond bas : au lieu de couper la tête des grands, on leur demande de se baisser.",
    observer: "L’<b>écran LED</b> du décor. Knee coupé : le ciel est un aplat blanc. Knee actif : les nuages reviennent. Point plus bas = plus de hautes lumières sauvées, mais des blancs plus ternes.",
    plateau: "Point, pente et knee automatique se règlent au RCP.",
    boitier: "Dans le profil d’image : point de 75 à 105 %, pente de −5 à +5. Inutile en S-Log3, dont la courbe garde déjà toute la dynamique."
  },
  saturation: {
    titre: "Saturation",
    quoi: "L’intensité des couleurs : de l’image en noir et blanc aux couleurs criardes.",
    observer: "La roue, les pastilles de la mire et le teint de la présentatrice."
  },
  detail: {
    titre: "Détail (contours)",
    quoi: "La caméra renforce électroniquement les <b>contours</b> pour donner une impression de netteté. Ce n’est pas du vrai piqué : trop de détail dessine un liseré autour des objets et fait ressortir le bruit.",
    observer: "Avec la loupe, les bords du visage et les traits de la mire. Le détail ne rattrape ni un point raté ni la diffraction."
  },

  /* ------------------------ LES DÉFAUTS OPTIQUES ----------------------- */
  niveau: {
    titre: "Force des défauts",
    quoi: "<b>Corrigés</b> : l’objectif idéal. <b>Réalistes</b> : ce que donne un objectif réel, à examiner à la loupe. <b>Accentués ×3</b> : les mêmes défauts, grossis pour être visibles d’un coup d’œil.",
    observer: "Les défauts gardent leur comportement réel (ils varient avec la focale et l’ouverture) : seule leur ampleur est grossie."
  },
  acLat: {
    titre: "Aberration chromatique latérale",
    quoi: "Le verre ne dévie pas toutes les couleurs pareil. Résultat : l’image rouge et l’image bleue ne sont <b>pas grossies exactement comme la verte</b>. Au centre, tout coïncide ; vers les coins, les contours contrastés se bordent d’un <b>liseré coloré</b> (rouge d’un côté, bleu de l’autre).",
    image: "Un prisme qui étale la lumière blanche en arc-en-ciel.",
    observer: "Les <b>barres LED</b> sur les bords du cadre. Elle dépend de la <b>focale</b> (forte aux deux bouts du zoom, inversée entre les deux) mais <b>pas du diaphragme</b> : fermer n’y change rien.",
    plateau: "Les caméras broadcast la corrigent électroniquement avec les objectifs compatibles (fonction ALAC chez Sony).",
    boitier: "Le boîtier peut la corriger automatiquement (compensation d’objectif)."
  },
  acLon: {
    titre: "Aberration chromatique longitudinale",
    quoi: "Les couleurs ne font pas le point <b>à la même distance</b> : le rouge et le bleu se forment un peu derrière le vert. Juste devant le plan net, les contours se frangent de <b>magenta</b> ; juste derrière, de <b>vert</b>.",
    observer: "Les contours contrastés légèrement flous (bord de la mire, col du chemisier), à la loupe. Elle est forte à <b>pleine ouverture</b> et disparaît en fermant de deux diaphragmes."
  },
  vignettage: {
    titre: "Vignettage",
    quoi: "Les <b>coins de l’image sont plus sombres</b> que le centre. Deux causes : la monture des lentilles masque une partie des rayons obliques (surtout à pleine ouverture), et la lumière arrive de biais sur les bords du capteur (surtout en grand-angle).",
    image: "Regarder à travers un tube : en biais, le bord du tube cache une partie de la vue.",
    observer: "Les coins du mur du fond. Il est maximal <b>grand-angle + pleine ouverture</b>, et s’efface en fermant de deux diaphragmes. Les disques de flou s’y déforment en « œil de chat ».",
    plateau: "Peu marqué : l’objectif est conçu pour le petit capteur, et la caméra corrige le reste (shading).",
    boitier: "Très visible à 24 mm f/2,8 : plus de deux diaphragmes perdus dans les coins, sauf si le boîtier le compense."
  },
  diffraction: {
    titre: "Diffraction",
    quoi: "En passant par un trou très petit, la lumière <b>s’étale</b> : chaque point de l’image devient une petite tache, d’autant plus grande que le diaphragme est fermé. L’image entière perd son piqué. Autour des points lumineux, les lames du diaphragme dessinent une <b>étoile</b>.",
    image: "Un tuyau d’arrosage qu’on pince : le jet s’élargit.",
    observer: "L’étoile de Siemens de la mire, à la loupe, et les petites LED du fond. La tache grandit avec l’ouverture ; ce qui compte, c’est sa taille <b>par rapport au photosite</b>.",
    plateau: "Petit capteur, petits photosites (5 µm) : l’image ramollit dès f/8 – f/11. On évite de fermer : on met un filtre ND.",
    boitier: "Grand capteur, photosites de 8,4 µm et image moins agrandie : la diffraction reste discrète jusqu’à f/16."
  },
  distorsion: {
    titre: "Distorsion",
    quoi: "Les lignes droites se courbent. En grand-angle, elles gonflent vers l’extérieur (<b>barillet</b>) ; en longue focale, elles se creusent (<b>coussinet</b>).",
    observer: "Les joints verticaux du mur et les barres LED sur les bords du cadre."
  },
  pique: {
    titre: "Mollesse à pleine ouverture",
    quoi: "À pleine ouverture, les rayons qui passent par le bord des lentilles ne convergent pas exactement au même point que ceux du centre (aberration sphérique, coma). L’image est un peu <b>molle</b>, surtout dans les coins.",
    observer: "Un objectif donne son meilleur piqué <b>fermé de deux ou trois diaphragmes</b> : entre la mollesse de la pleine ouverture et la diffraction des petites ouvertures."
  },

  /* ------------------------- LES AIDES DE VISÉE ------------------------ */
  zebra: {
    titre: "Zébra",
    quoi: "Des hachures sur les zones de l’image qui atteignent un niveau donné. <b>70 %</b> : le repère d’un visage clair bien exposé. <b>100 %</b> : les zones écrêtées, sans détail.",
    observer: "Le zébra n’existe que dans le viseur : il n’est pas enregistré."
  },
  peaking: {
    titre: "Peaking",
    quoi: "Les contours <b>nets</b> sont surlignés en rouge. On tourne la bague de mise au point jusqu’à ce que le rouge se pose sur le sujet.",
    observer: "Le rouge suit la zone nette : il se déplace quand vous tournez la bague."
  },
  loupe: {
    titre: "Loupe",
    quoi: "Agrandit une partie de l’image pour vérifier le point ou examiner un défaut. Glissez dans l’image pour déplacer la zone agrandie.",
    observer: "Promenez la loupe du centre vers un coin : c’est là que se cachent les défauts."
  },
  roue: {
    titre: "La roue du décor",
    quoi: "Un mouvement régulier, pour juger l’effet de l’obturation.",
    observer: "Plus la durée d’obturation est longue, plus les chiffres filent."
  },

  /* ---------------------------- LE MATÉRIEL ---------------------------- */
  m_objectif_b4: {
    titre: "Objectif broadcast (monture B4)",
    quoi: "Un zoom de grande amplitude, <b>parfocal</b> : le point reste en place sur toute la course du zoom. Trois bagues mécaniques (mise au point, zoom, diaphragme), une poignée motorisée, un doubleur ×2, une bague macro et le réglage du tirage optique.",
    observer: "Sur un plateau, le cadreur commande le zoom et le point depuis les manches du pied, par des poignées déportées."
  },
  m_tete: {
    titre: "Tête de caméra",
    quoi: "Elle contient le <b>prisme</b> et les <b>trois capteurs CMOS 2/3″</b>, la roue de filtres ND et l’électronique qui numérise l’image. Elle n’enregistre rien : tout part vers la régie.",
    observer: "Sensibilité : F13 à 2 000 lux. Rapport signal sur bruit : environ 60 dB."
  },
  m_viseur: {
    titre: "Viseur de studio",
    quoi: "Un écran de 7 pouces pour le cadreur. Il affiche l’image, le zébra, le peaking et le <b>tally</b> : le voyant rouge qui signale que la caméra est à l’antenne.",
    observer: "Le cadreur cadre et fait le point ; il ne règle pas l’exposition."
  },
  m_cable: {
    titre: "Câble fibre optique",
    quoi: "Un seul câble <b>hybride</b> relie la tête à la CCU : deux fibres optiques pour les signaux, des conducteurs en cuivre pour l’alimentation. Il transporte la vidéo vers la régie et, dans l’autre sens, les retours vidéo, l’interphone, le tally, le prompteur et la télécommande.",
    observer: "Jusqu’à plusieurs centaines de mètres sans perte : la caméra peut être loin de la régie."
  },
  m_ccu: {
    titre: "CCU (voie de commande)",
    quoi: "<i>Camera Control Unit</i> : le boîtier, en régie, qui <b>alimente</b> la caméra, reçoit son image et la distribue en SDI vers le mélangeur. Chaque caméra de plateau a sa CCU.",
    observer: "Avec cette CCU, l’image HD peut aussi sortir convertie en 4K ou en HDR (HLG)."
  },
  m_rcp: {
    titre: "RCP (pupitre de télécommande)",
    quoi: "<i>Remote Control Panel</i> : le pupitre de l’<b>ingénieur vision</b>. Une manette pour le diaphragme et le niveau de noir, des boutons pour le gain, la balance des blancs, le knee, le gamma, le détail. Il règle toutes les caméras pour qu’elles se raccordent entre elles.",
    observer: "Sur un plateau, l’exposition et la colorimétrie se règlent donc <b>en régie</b>, sur un oscilloscope, pas à la caméra."
  },
  m_objectif_e: {
    titre: "Objectif photo (monture E)",
    quoi: "Un zoom conçu pour la photographie : compact, très lumineux, autofocus rapide. Il est <b>varifocal</b> (le point glisse au zoom), son fût s’allonge en zoomant et son cadre « respire » quand on fait le point.",
    observer: "Parfait pour un opérateur seul avec autofocus ; moins pratique pour zoomer en cours de plan."
  },
  m_boitier: {
    titre: "Boîtier",
    quoi: "Tout est dedans : un <b>grand capteur plein format</b>, le traitement d’image, l’enregistreur et la batterie. La caméra est autonome : pas de régie, pas de CCU.",
    observer: "Le capteur est si proche de la monture (18 mm) qu’on peut y adapter presque tous les objectifs."
  },
  m_ecran: {
    titre: "Écran orientable",
    quoi: "L’écran tactile sert de viseur et donne accès aux menus : profil d’image, zébra, peaking, histogramme.",
    observer: "L’opérateur règle tout lui-même : cadre, point, exposition, couleur."
  },
  m_carte: {
    titre: "Cartes mémoire",
    quoi: "L’image est <b>compressée</b> (codec XAVC) et enregistrée dans le boîtier, sur deux cartes. Rien ne sort en direct, sauf par la prise HDMI.",
    observer: "Les choix d’image (gamma, knee, black gamma) sont « cuits » dans le fichier : d’où l’intérêt du S-Log3 pour décider plus tard."
  },
  m_poignee: {
    titre: "Poignée audio",
    quoi: "La poignée amovible porte deux entrées <b>XLR</b> pour des microphones professionnels, avec alimentation fantôme.",
    observer: "Sur la caméra de plateau, le son ne passe pas par la caméra : il va directement à la console."
  },
  m_pied: {
    titre: "Support",
    quoi: "Un trépied à tête fluide pour le boîtier ; un pied de studio à colonne (piédestal) pour la caméra de plateau, qui roule et monte sans à-coup.",
    observer: "Dans l’image de la caméra, glissez pour faire un panoramique ou une inclinaison."
  }
};

/* Les pièces de l'objectif et de la caméra (vues « L'objectif » et « Le capteur »). */
const PIECES = {
  p_focus: { titre: "Groupe de mise au point", quoi: "En tournant la bague de mise au point, ce groupe avance ou recule : il déplace le <b>plan net</b>." },
  p_variateur: { titre: "Variateur", quoi: "Le groupe mobile qui <b>change la focale</b> : il coulisse sur une grande course quand on tourne la bague de zoom." },
  p_compensateur: { titre: "Compensateur", quoi: "Quand le variateur bouge, l’image voudrait se former ailleurs. Le compensateur se déplace en même temps, guidé par une <b>came</b> usinée au micron, pour <b>ramener le foyer sur le capteur</b>. C’est lui qui rend le zoom parfocal." },
  p_iris: { titre: "Diaphragme (iris)", quoi: "Des lames qui forment un trou réglable. Leur nombre et leur forme dessinent les flous : 6 lames droites donnent des hexagones et des étoiles à 6 branches, 9 lames arrondies donnent des disques et des étoiles à 18 branches." },
  p_relais: { titre: "Groupe relais", quoi: "Il reprend l’image et la projette sur le capteur, loin derrière l’objectif : il faut laisser la place au prisme (48 mm entre la monture et le capteur)." },
  p_doubleur: { titre: "Doubleur ×2", quoi: "Deux lentilles montées sur un barillet : un levier les fait basculer dans le trajet de la lumière. Focale ×2, lumière ÷4." },
  p_tirage: { titre: "Bague de tirage et macro", quoi: "Elle déplace le dernier groupe pour régler le <b>tirage optique</b> (une vis la bloque ensuite). La bague macro voisine permet de faire le point de très près." },
  p_monture_b4: { titre: "Monture B4", quoi: "La baïonnette standard des caméras 2/3″. Un connecteur transmet à la caméra la position du zoom, du point et du diaphragme, et lui permet de piloter l’iris." },
  p_prisme: { titre: "Prisme séparateur", quoi: "Un bloc de verre à couches <b>dichroïques</b> : il envoie le bleu vers un capteur, le rouge vers un deuxième, et laisse passer le vert vers le troisième. Aucune lumière n’est perdue dans des filtres colorés." },
  p_capteurs_tri: { titre: "Trois capteurs CMOS 2/3″", quoi: "Un capteur par couleur primaire : chaque point de l’image est mesuré <b>en rouge, en vert et en bleu</b>. Pas de matrice de Bayer, pas de dématriçage : la couleur est mesurée, pas reconstituée." },
  p_frontale: { titre: "Groupe frontal", quoi: "Les grandes lentilles de l’avant. Sur ce zoom photo, elles avancent quand on zoome : le <b>fût s’allonge</b> en longue focale." },
  p_focus_interne: { titre: "Groupe de mise au point interne", quoi: "Un petit groupe léger, déplacé par un moteur linéaire : idéal pour l’autofocus. La bague de mise au point n’est pas reliée mécaniquement aux lentilles : elle commande le moteur." },
  p_variateur_photo: { titre: "Groupes de zoom", quoi: "Ils changent la focale. Aucun compensateur ne rattrape exactement le foyer : il <b>glisse légèrement</b> le long de l’axe pendant le zoom. C’est le zoom <b>varifocal</b> ; en photo, l’autofocus refait le point à chaque fois." },
  p_arriere: { titre: "Groupe arrière", quoi: "Il projette l’image sur le grand capteur, tout proche : 18 mm seulement séparent la monture du capteur." },
  p_monture_e: { titre: "Monture E", quoi: "Une baïonnette large et très proche du capteur, avec des contacts électriques : le boîtier pilote le diaphragme et l’autofocus, et lit la focale." },
  p_capteur_bayer: { titre: "Capteur plein format à matrice de Bayer", quoi: "Un seul capteur de 35,6 mm de large. Chaque photosite porte un filtre rouge, vert ou bleu : il ne mesure <b>qu’une couleur</b>, les deux autres sont calculées à partir des voisins (dématriçage). Les photosites sont grands (8,4 µm) : beaucoup de lumière captée, peu de bruit." },
  p_bague_focus: AIDES.bague, p_bague_zoom: AIDES.focale, p_bague_iris: AIDES.ouverture
};

/* ==========================================================================
   LES EXPÉRIENCES GUIDÉES
   « S » offre :
     S.config(id)              passe sur "plateau" ou "boitier"
     S.regler(id, { … })       modifie des réglages d'une configuration
     S.commun({ … })           lumière, défauts (niveau, acLat…)
     S.cadre({ distance, pan, tilt })   position de la caméra (angles en degrés)
     S.viser(nom)              cadre sur "presentatrice", "visage", "buste", "mire", "etoile", "roue" ou "ecran"
     S.point(id, distance)     fait le point à cette distance (mètres)
     S.exposer(id)             règle le diaphragme pour une exposition correcte
     S.aides({ zebra, peaking, loupe, loupeX, loupeY, roue })
     S.ouvrir(reglages, fenetre)   ouvre une famille de réglages ("objectif", "exposition", "image",
                               "defauts") et, au besoin, une fenêtre ("profondeur", "anatomie",
                               "capteur", "signal")
   ========================================================================== */
const EXPERIENCES = [
  {
    id: "exposition",
    titre: "Exposer correctement",
    resume: "Diaphragme, filtre ND, gain : trois façons de doser la lumière.",
    preparer(S) {
      S.config("plateau"); S.cadre({ distance: 3.5, pan: 0, tilt: -3 });
      S.regler("plateau", { focale: 10.8, ouverture: 1.8, nd: 0, sensibilite: 0, obturation: 50, knee: true });
      S.point("plateau", 3.5); S.aides({ zebra: 2, loupe: 1 }); S.ouvrir("exposition", "signal");
    },
    etapes: [
      "L’image est <b>brûlée</b> : le diaphragme est grand ouvert sous 1 000 lux. Les hachures du zébra 100 % montrent tout ce qui est écrêté ; sur l’oscilloscope, la trace est collée en haut.",
      "Dans <b>Objectif</b>, fermez le diaphragme jusqu’à ce que l’indication « Expo », en bas de l’image, passe au vert (vers f/9). L’image est bien exposée… mais tout est net, du premier plan au fond.",
      "Autre solution : rouvrez à <b>f/2,3</b> et mettez le filtre <b>ND 1/16</b> (réglages Exposition). Même exposition, mais la plante du premier plan est devenue floue : le filtre ND permet de <b>choisir son diaphragme</b>.",
      "Passez le zébra sur <b>70 %</b> : les hachures doivent se poser sur les zones claires du visage."
    ]
  },
  {
    id: "pdc",
    titre: "Deux capteurs, même cadre",
    resume: "À cadre et ouverture identiques, la profondeur de champ n’a rien à voir.",
    preparer(S) {
      S.cadre({ distance: 3.5, pan: 0, tilt: -3 }); S.commun({ lux: 1000 });
      S.regler("plateau", { focale: 13.5, ouverture: 2.8, nd: 2, sensibilite: 3, obturation: 50 });
      S.regler("boitier", { focale: 50, ouverture: 2.8, nd: 2, sensibilite: 1600, obturation: 50 });
      S.point("plateau", 3.5); S.point("boitier", 3.5); S.config("plateau"); S.aides({ zebra: 0, loupe: 1 }); S.ouvrir("objectif", "profondeur");
    },
    etapes: [
      "Caméra de plateau, 13,5 mm à f/2,8, point sur la présentatrice. Regardez la plante au premier plan et le mur du fond : presque nets. Dans la scène, la <b>bande verte</b> au sol (zone nette) est longue.",
      "Passez sur le <b>boîtier</b> (en haut) : même cadre, mais il faut 50 mm pour l’obtenir, car le capteur est 3,7 fois plus large. Toujours f/2,8 : la plante et le fond sont <b>très flous</b>, la bande verte est courte.",
      "Sur le boîtier, fermez le diaphragme jusqu’à retrouver la zone nette de la caméra de plateau : il faut aller vers <b>f/11</b> (retirez le filtre ND pour garder l’exposition). Règle pratique : à cadre égal, le 2/3″ à f/2,8 donne la profondeur de champ d’un plein format à f/11.",
      "Conclusion : pour isoler un sujet par le flou, le grand capteur est avantagé. Pour tout garder net en direct (sport, plateau), le petit capteur est plus sûr."
    ]
  },
  {
    id: "parfocal",
    titre: "Parfocal ou varifocal ?",
    resume: "Zoomer après avoir fait le point : le point tient-il ?",
    preparer(S) {
      S.cadre({ distance: 3.5 }); S.viser("visage"); S.commun({ lux: 1000 });
      S.regler("plateau", { focale: 170, doubleur: false, ouverture: 2.8, nd: 2, sensibilite: 3, obturation: 50, tirage: 0 });
      S.regler("boitier", { focale: 70, ouverture: 2.8, nd: 2, sensibilite: 1600, obturation: 50 });
      S.point("plateau", 3.5); S.point("boitier", 3.5); S.config("plateau"); S.aides({ zebra: 0, peaking: true, loupe: 1 }); S.ouvrir("objectif", "anatomie");
    },
    etapes: [
      "Caméra de plateau, zoomée à fond sur le visage. Le point est fait (le peaking rouge souligne les contours nets). <b>Dézoomez</b> lentement jusqu’au grand-angle : le visage reste net tout du long.",
      "Regardez la <b>coupe de l’objectif</b> pendant le zoom : le variateur et le compensateur se déplacent ensemble, et le foyer reste <b>posé sur le capteur</b>. C’est un zoom <b>parfocal</b>.",
      "Passez sur le <b>boîtier</b> : 70 mm, point fait sur le visage. Dézoomez vers 24 mm : le visage devient un peu mou, et dans la scène le cadre vert (le plan net) s’est rapproché de la caméra. Revenez à 70 mm : il est de nouveau net.",
      "Maintenant l’inverse, bien plus sévère : à <b>24 mm</b>, cliquez sur <b>AF</b> pour faire le point, puis zoomez à 70 mm. Le visage est <b>complètement flou</b> : le plan net a glissé loin derrière. C’est un zoom <b>varifocal</b> ; en longue focale, la profondeur de champ ne pardonne plus rien.",
      "À retenir : avec un parfocal, on fait le point une fois, en longue focale. Avec un varifocal, on refait le point après chaque coup de zoom."
    ]
  },
  {
    id: "tirage",
    titre: "Régler le tirage optique",
    resume: "Le point ne tient plus au zoom : la procédure de plateau.",
    preparer(S) {
      S.config("plateau"); S.cadre({ distance: 3.5 }); S.viser("etoile"); S.commun({ lux: 1000 });
      S.regler("plateau", { focale: 170, doubleur: false, ouverture: 1.8, nd: 2, sensibilite: 0, obturation: 50, tirage: 0.09 });
      S.point("plateau", 3.5); S.aides({ zebra: 0, peaking: false, loupe: 1 }); S.ouvrir("objectif", "anatomie");
    },
    etapes: [
      "La caméra vise la mire, zoomée à fond, diaphragme grand ouvert (avec du ND) : c’est là que la profondeur de champ est la plus courte, donc le réglage le plus précis. Le point est fait.",
      "<b>Dézoomez à fond</b> (8,5 mm). L’image est <b>molle</b> alors qu’on n’a pas touché au point : le tirage optique est faux.",
      "Sans toucher à la bague de mise au point, ramenez la netteté en grand-angle avec le curseur <b>Tirage optique</b> (il doit revenir vers 0).",
      "Rezoomez à fond, refaites le point à la bague de mise au point, dézoomez, vérifiez. Quand le point tient sur toute la course, le tirage est réglé."
    ]
  },
  {
    id: "chromatique",
    titre: "Aberration chromatique",
    resume: "Des liserés colorés sur les bords : d’où viennent-ils, comment les réduire ?",
    preparer(S) {
      S.config("boitier"); S.cadre({ distance: 3.5, pan: 0, tilt: -3 }); S.commun({ lux: 1000, niveau: 3, acLat: true, acLon: true, vignettage: false, diffraction: true, distorsion: true, pique: true });
      S.regler("boitier", { focale: 24, ouverture: 2.8, nd: 2, sensibilite: 1600, obturation: 50 });
      S.point("boitier", 3.5); S.aides({ zebra: 0, peaking: false, loupe: 4, loupeX: 0.88, loupeY: 0.74 }); S.ouvrir("defauts");
    },
    etapes: [
      "Boîtier à 24 mm. La loupe ×4 regarde une <b>barre LED</b> dans le coin en haut à droite : elle est bordée de rouge d’un côté, de bleu de l’autre. C’est l’aberration chromatique <b>latérale</b>.",
      "Glissez dans l’image pour amener la loupe <b>au centre</b> : plus de liseré. L’aberration latérale grandit avec la distance au centre.",
      "Revenez sur le bord et <b>fermez le diaphragme</b> : le liseré ne change pas. Zoomez vers 50 mm : il disparaît, puis s’<b>inverse</b> à 70 mm.",
      "Dans les réglages <b>Défauts</b>, décochez l’aberration latérale pour voir l’image corrigée, comme le fait le boîtier. Puis testez la caméra de plateau au grand-angle : même phénomène."
    ]
  },
  {
    id: "vignettage",
    titre: "Vignettage",
    resume: "Des coins sombres à pleine ouverture, surtout en grand-angle.",
    preparer(S) {
      S.config("boitier"); S.cadre({ distance: 3.5, pan: 0, tilt: -3 }); S.commun({ lux: 1000, niveau: 1, vignettage: true });
      S.regler("boitier", { focale: 24, ouverture: 2.8, nd: 1, sensibilite: 400, obturation: 50 });
      S.point("boitier", 3.5); S.aides({ zebra: 0, peaking: false, loupe: 1 }); S.ouvrir("objectif");
    },
    etapes: [
      "Boîtier à 24 mm, f/2,8 : les coins sont nettement plus sombres que le centre (plus de deux diaphragmes).",
      "Fermez à <b>f/5,6</b> et retirez le filtre ND pour garder la même exposition : les coins s’éclaircissent. La part due à la monture des lentilles a disparu ; il reste la chute naturelle du grand-angle.",
      "Revenez à f/2,8 et zoomez à <b>50 mm</b> : le vignettage diminue, l’angle de champ est plus étroit.",
      "Passez sur la caméra de plateau au grand-angle, grande ouverte : le vignettage est bien plus discret. Dans les réglages <b>Défauts</b>, décochez « Vignettage » pour simuler la correction faite par la caméra."
    ]
  },
  {
    id: "diffraction",
    titre: "Diffraction",
    resume: "Trop fermer le diaphragme ramollit l’image : à partir de quand ?",
    preparer(S) {
      S.config("plateau"); S.cadre({ distance: 3.5 }); S.viser("etoile"); S.commun({ lux: 2000, niveau: 3, diffraction: true });
      S.regler("plateau", { focale: 40, doubleur: false, ouverture: 4, nd: 2, sensibilite: 3, obturation: 50, tirage: 0 });
      S.regler("boitier", { focale: 70, ouverture: 4, nd: 2, sensibilite: 1600, obturation: 50 });
      S.point("plateau", 3.5); S.point("boitier", 3.5); S.aides({ zebra: 0, peaking: false, loupe: 2 }); S.ouvrir("objectif");
    },
    etapes: [
      "La caméra de plateau vise la mire à f/4, avec le filtre ND 1/16 : l’étoile de Siemens est fine jusqu’au centre.",
      "Fermez à <b>f/16</b> et retirez le filtre ND (4 diaphragmes de chaque côté : l’exposition ne change pas). L’étoile se brouille au centre, toute l’image perd son piqué. Le point n’a pas bougé : c’est la diffraction.",
      "Passez sur le <b>boîtier</b> et faites de même (f/4 avec ND16, puis f/16 sans filtre) : la perte est bien plus faible. Le capteur est plus grand, l’image moins agrandie.",
      "Dézoomez et regardez les petites LED du fond à f/16 : chaque point porte une <b>étoile</b>. 6 lames pour l’objectif broadcast : 6 branches. 9 lames pour le zoom photo : 18 branches.",
      "À retenir : on ne règle pas l’exposition en fermant à fond. Sur un 2/3″, on reste si possible entre f/2,8 et f/8, et on dose avec le ND."
    ]
  },
  {
    id: "knee",
    titre: "Hautes lumières : le knee",
    resume: "Récupérer du détail dans ce qui dépasse 100 %.",
    preparer(S) {
      S.config("plateau"); S.cadre({ distance: 3.5, pan: -9, tilt: 3 }); S.commun({ lux: 1000 });
      S.regler("plateau", { focale: 17, doubleur: false, ouverture: 4.5, nd: 1, sensibilite: 0, obturation: 50, knee: false, kneePoint: 90, kneePente: 0, tirage: 0 });
      S.point("plateau", 3.5); S.aides({ zebra: 2, peaking: false, loupe: 1 }); S.ouvrir("image", "signal");
    },
    etapes: [
      "Le visage est bien exposé, mais l’<b>écran LED</b> est trois fois plus lumineux qu’un blanc : knee coupé, le ciel est un aplat blanc hachuré par le zébra, et la trace de l’oscilloscope s’écrase sur la ligne 109 %.",
      "Activez le <b>knee</b> : les nuages réapparaissent. Sur la courbe de transfert, la droite se plie au point de knee ; sur l’oscilloscope, la trace de l’écran redescend sous 109 %.",
      "Descendez le <b>point</b> vers 80 % : encore plus de hautes lumières tiennent, mais les blancs du pupitre deviennent ternes. Jouez sur la <b>pente</b> : plus elle est douce, plus on range de lumière.",
      "Le visage, lui, n’a pas changé : le knee n’agit qu’au-dessus de son point."
    ]
  },
  {
    id: "noirs",
    titre: "Basses lumières : master black et black gamma",
    resume: "Déboucher les ombres sans délaver l’image.",
    preparer(S) {
      S.config("plateau"); S.cadre({ distance: 3.5 }); S.viser("buste"); S.commun({ lux: 1000 });
      S.regler("plateau", { focale: 34, doubleur: false, ouverture: 4.5, nd: 1, sensibilite: 0, obturation: 50, knee: true, masterBlack: 0, bgNiveau: 0, bgPlage: 1, tirage: 0 });
      S.point("plateau", 3.5); S.aides({ zebra: 0, peaking: false, loupe: 1 }); S.ouvrir("image", "signal");
    },
    etapes: [
      "Plan serré sur la présentatrice. Sa veste bleu nuit et ses cheveux sont de grandes zones sombres : on y devine à peine les rayures et les mèches.",
      "Montez le <b>master black</b> : les ombres s’éclaircissent, mais le noir devient gris et toute l’image se voile (le bas de la trace décolle de 0 %). Remettez-le à 0.",
      "Montez plutôt le <b>black gamma</b> (+5) : les rayures et les mèches sortent, alors que le noir reste noir et que le visage ne bouge pas. C’est un <b>black stretch</b>.",
      "Essayez −5 (<b>black press</b>) : les ombres se bouchent, l’image gagne en densité. Puis changez la <b>plage</b> pour voir jusqu’où la retouche remonte dans les gris."
    ]
  },
  {
    id: "obturation",
    titre: "Obturation et mouvement",
    resume: "Figer ou laisser filer : la roue du décor sert de témoin.",
    preparer(S) {
      S.config("boitier"); S.cadre({ distance: 3.5 }); S.viser("roue"); S.commun({ lux: 1000 });
      S.regler("boitier", { focale: 50, ouverture: 4, nd: 1, sensibilite: 800, obturation: 50 });
      S.point("boitier", 5.3); S.aides({ zebra: 0, peaking: false, loupe: 1, roue: true }); S.ouvrir("exposition");
    },
    etapes: [
      "La roue tourne. Au <b>1/50 s</b>, chaque image dure assez longtemps pour que les chiffres filent : c’est le flou de bougé.",
      "Passez au <b>1/500 s</b> : les chiffres se figent… et l’image s’assombrit de plus de 3 diaphragmes. Compensez : retirez le ND, ouvrez le diaphragme ou montez la sensibilité.",
      "Au <b>1/2000 s</b>, la roue est parfaitement nette, mais son mouvement paraît saccadé : plus aucun filé ne relie une image à la suivante.",
      "En fiction, on garde le plus souvent 1/50 s à 25 images par seconde (règle des 180°). En sport, on raccourcit pour des ralentis nets."
    ]
  },
  {
    id: "bruit",
    titre: "Gain et bruit",
    resume: "Quand la lumière manque : ce que coûte le gain.",
    preparer(S) {
      S.config("plateau"); S.cadre({ distance: 3.5 }); S.viser("buste"); S.commun({ lux: 30 });
      S.regler("plateau", { focale: 20, doubleur: false, ouverture: 4, nd: 0, sensibilite: 0, obturation: 50, tirage: 0, detail: 0 });
      S.regler("boitier", { focale: 70, ouverture: 4, nd: 0, sensibilite: 800, obturation: 50 });
      S.point("plateau", 3.5); S.point("boitier", 3.5); S.aides({ zebra: 0, peaking: false, loupe: 1 }); S.ouvrir("exposition", "signal");
    },
    etapes: [
      "Les projecteurs sont éteints : il ne reste que <b>30 lux</b>, l’éclairage d’une pièce le soir. À f/4 et 0 dB, l’image est très sombre.",
      "Montez le <b>gain</b> jusqu’à retrouver une exposition correcte (+18 dB) : l’image est lisible mais <b>bruitée</b>, surtout dans la veste et sur le mur. Sur l’oscilloscope, la trace s’épaissit.",
      "Remettez 0 dB et <b>ouvrez le diaphragme</b> à f/1,8 : on gagne plus de 2 diaphragmes sans aucun bruit (mais avec moins de profondeur de champ). La lumière et l’ouverture d’abord, le gain en dernier recours.",
      "Passez sur le <b>boîtier</b> à f/4 et montez les ISO : à 6 400 l’image est correcte et peu bruitée. Comparez 10 000 et 12 800 ISO : le bruit <b>baisse</b> en montant, c’est la seconde sensibilité de base."
    ]
  },
  {
    id: "blanc",
    titre: "Balance des blancs",
    resume: "La caméra doit savoir de quelle couleur est la lumière.",
    preparer(S) {
      S.config("plateau"); S.cadre({ distance: 3.5, pan: 0, tilt: -3 }); S.commun({ lux: 1000, kelvin: 3200 });
      S.regler("plateau", { focale: 10.8, doubleur: false, ouverture: 4.5, nd: 1, sensibilite: 0, obturation: 50, blanc: 5600, tirage: 0 });
      S.point("plateau", 3.5); S.aides({ zebra: 0, peaking: false, loupe: 1 }); S.ouvrir("exposition");
    },
    etapes: [
      "Le plateau est passé en lumière <b>tungstène (3 200 K)</b>, mais la caméra est restée réglée sur 5 600 K : toute l’image est <b>orangée</b>.",
      "Réglez la balance de la caméra sur <b>3 200 K</b> (ou « Faire le blanc ») : le pupitre et le chemisier redeviennent blancs.",
      "Regardez maintenant l’<b>écran LED</b> : il est devenu <b>bleu</b>. Sa lumière à lui est restée proche de 6 500 K. Deux sources de couleurs différentes ne peuvent pas être blanches en même temps.",
      "Sur un vrai plateau, on accorde les sources : projecteurs LED réglés sur la même température que les écrans, ou gélatines de correction."
    ]
  }
];
