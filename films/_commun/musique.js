// LA MUSIQUE DES FILMS — commune à tous les films de la plateforme.
// Fabrique out/music.wav à partir de la partition (score.js) du film :
//   node song.js            (STEMS=1 écrit aussi out/stem-*.wav ; LUFS=-16 règle le niveau)
// Lo-fi calme, sans voix : un accompagnement (batterie douce, basse, piano électrique), un thème
// discret, et un son pour CHAQUE apparition à l'écran (les mêmes temps que film.js).
//
// Ce que la partition doit fournir :
//   clock, T, BEAT, DURATION, chords, chordAt
//   arrangement   [{ from, to, drums, bassline, gain, fill: [mesures] }]  l'accompagnement, section par section
//   calme(mesure) vrai là où la nappe doit ressortir (sections sans batterie)
//   boite, theme  les notes du thème (boîte à musique du titre, piano électrique ensuite)
//   hits          [{ t, kind, … }] un son par événement de l'image. Les « kind » :
//     note    une note de marimba (k : la k-ième note de l'accord en cours)   → un élément apparaît
//     accord  trois notes égrenées + boîte à musique                          → un résultat important
//     cloche  une note de boîte à musique (midi)                              → une ligne, une tuile, une étape
//     tick    un petit coup de bois (pitch)                                   → un compteur, une case
//     pop     un « pop » + une note                                           → un élément qui surgit
//     thud    un coup sourd à l'attaque nette                                 → une limite atteinte, une erreur
//     alerte  deux notes rapprochées                                          → un piège
//     presse  un souffle qui descend (ou monte : monte = true), de durée len  → une compression, un remplissage
//     fwip    un froissement de papier                                        → un changement de chapitre
module.exports = function musique(sc, dossier) {
  const path = require('path');
  const moteur = (f) => require(path.join(dossier, 'engine', 'audio', f));
  const { SR, Bus, reverb, pingpong } = moteur('dsp');
  const I = moteur('instruments'), MIX = moteur('mix'), Genre = moteur('genres');
  const { BEAT, DURATION, clock, chordAt } = sc;

  const N = Math.ceil(DURATION * SR);
  const bus = () => new Bus(N);
  const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), notes = bus(), fx = bus();
  const verb = bus(), dly = bus();
  const buses = { drums, bass, pad, keys };

  // ---------- l'accompagnement lo-fi, section par section ----------
  const kicks = [];
  for (const a of sc.arrangement) Genre.play('lofi', { clock, chordAt, buses, kicks, ...a });
  // l'accord final, tenu
  const dernier = sc.chords[sc.chords.length - 1];
  for (const n of dernier.notes) keys.addMono(I.epiano(n, 5, { index: 0.9, decay: 2.6 }), dernier.t0, 0.13, (n % 3 - 1) * 0.25);
  bass.addMono(I.bass(dernier.bass + 12, 4.5, { bright: 0.2, sub: 1 }), dernier.t0, 0.5);

  // ---------- nappe douce, plus présente là où il n'y a pas de batterie ----------
  for (const c of sc.chords) {
    const calme = sc.calme(c.bar);
    for (const n of c.notes) {
      const { L, R } = I.padNote(n, c.t1 - c.t0, { cutoff: calme ? 1100 : 800, attack: 0.6, release: 1.6 });
      pad.addStereo(L, R, c.t0, calme ? 0.07 : 0.035);
    }
  }

  // ---------- le thème : boîte à musique sur le titre, piano électrique sur le groove ----------
  for (const n of sc.boite) { const x = I.musicBox(n.midi); lead.addMono(x, n.t, 0.17); verb.addMono(x, n.t, 0.22); dly.addMono(x, n.t, 0.08); }
  const jouer = Genre.lead('lofi');
  for (const n of sc.theme) {
    const x = jouer(n.midi, n.dur * 0.95);
    lead.addMono(x, n.t, 0.2, 0.12); verb.addMono(x, n.t, 0.06); dly.addMono(x, n.t, 0.05);
  }

  // ---------- un son par événement de l'image ----------
  // une note du marimba : la k-ième note de l'accord en cours, donc toujours juste
  function noteAccord(t, k) {
    const c = chordAt(t + 0.01) || chordAt(t - 0.05);
    const tons = c ? [...c.notes].sort((a, b) => a - b) : [60, 64, 67];
    return tons[k % tons.length] + 12 * (1 + Math.floor(k / tons.length));
  }
  for (const h of sc.hits) {
    const pan = h.pan || 0;
    if (h.kind === 'note') {
      const x = I.marimba(noteAccord(h.t, h.k || 0), { thock: 0.15 });
      notes.addMono(x, h.t, 0.34, pan); verb.addMono(x, h.t, 0.16);
    } else if (h.kind === 'accord') {
      [0, 1, 2].forEach((i) => { const x = I.marimba(noteAccord(h.t, i + 1), { thock: i ? 0 : 0.3 }); notes.addMono(x, h.t + i * 0.03, 0.26, pan + (i - 1) * 0.2); verb.addMono(x, h.t + i * 0.03, 0.2); });
      notes.addMono(I.musicBox(noteAccord(h.t, 3) + 12), h.t, 0.14, pan); verb.addMono(I.musicBox(noteAccord(h.t, 3) + 12), h.t, 0.16);
    } else if (h.kind === 'cloche') {
      const x = I.musicBox(h.midi);
      notes.addMono(x, h.t, 0.3, pan); verb.addMono(x, h.t, 0.26); dly.addMono(x, h.t, 0.1);
    } else if (h.kind === 'tick') {
      fx.addMono(I.woodTick(h.pitch || 1), h.t, 0.3, pan);
    } else if (h.kind === 'pop') {
      fx.addMono(I.pop(1700), h.t, 0.36, pan);
      const x = I.marimba(noteAccord(h.t, 4), { thock: 0.2 }); notes.addMono(x, h.t, 0.34, pan); verb.addMono(x, h.t, 0.16);
    } else if (h.kind === 'thud') {
      // un coup sourd, avec une attaque nette pour qu'il ressorte de la basse
      fx.addMono(I.thud(72, 0.13), h.t, 0.62, pan * 0.5);
      fx.addMono(I.woodTick(0.6), h.t, 0.45, pan);
      fx.addMono(I.pop(1100), h.t, 0.28, pan);
    } else if (h.kind === 'alerte') {
      const a = noteAccord(h.t, 2) + 12;
      notes.addMono(I.musicBox(a), h.t, 0.26, pan); notes.addMono(I.musicBox(a + 2), h.t + 0.11, 0.22, pan);
      verb.addMono(I.musicBox(a), h.t, 0.18);
    } else if (h.kind === 'presse') {
      // le souffle s'arrête juste avant le temps suivant : le coup qui suit reste net
      const len = h.len || BEAT;
      fx.addMono(I.noiseSweep(len * 0.92, h.monte ? 500 : 5200, h.monte ? 5200 : 420, { q: 1.1, pink: true }), h.t, 0.2, pan);
    } else if (h.kind === 'fwip') {
      fx.addMono(I.paperFwip(0.85, Math.round(h.t * 10)), h.t - 0.02, 0.16, pan);
    }
  }

  // ---------- mixage ----------
  MIX.sidechain([pad], kicks, { depth: 0.25 });
  const stems = {
    drums, bass, pad, keys, lead, notes, fx,
    verb: reverb(verb, { room: 0.82, damp: 0.35 }),
    dly: pingpong(dly, BEAT * 0.75, 0.32, 3200),
  };
  const GAIN = { drums: 0.8, bass: 0.55, pad: 2.2, keys: 1.5, lead: 1.4, notes: 1.0, fx: 0.8, verb: 1, dly: 1 };
  const out = path.join(dossier, 'out');
  require('fs').mkdirSync(out, { recursive: true });
  const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
  MIX.highpass(mix, 24);
  // le grain lo-fi : un léger souffle de vinyle (craquements discrets : on révise, on ne s'agace pas), puis la cassette
  const vinyle = I.vinyl(DURATION, { crackle: 0.25, hiss: 0.9 });
  for (let i = 0; i < mix.n; i++) { mix.L[i] += vinyle[i] * 0.3; mix.R[i] += vinyle[(i + 811) % mix.n] * 0.3; }
  MIX.lofi(mix, { wow: 1, flutter: 0.8, lowpass: 5000 });
  MIX.fadeOut(mix, DURATION - 1.8, DURATION);
  // -16 LUFS : un niveau doux, pour une vidéo de révision que l'on regarde plusieurs fois
  const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: parseFloat(process.env.LUFS || '-16') });
  MIX.writeWav(path.join(out, 'music.wav'), mix);
  console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
};
