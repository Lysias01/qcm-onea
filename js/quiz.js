/* Moteur de séries : sélection des questions, progression de difficulté, correction. */
(function () {
  const C = window.APP_CONFIG;

  function melanger(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Ordre de priorité : jamais vues d'abord, puis les moins vues, puis les vues il y a le plus longtemps.
     Ainsi, à force de séries, l'utilisateur finit par rencontrer toute la banque. */
  function prioriser(pool) {
    const stats = Store.etat.stats;
    return melanger(pool)
      .map(q => { const s = stats[q.id]; return { q, vu: s ? s.vu : 0, d: s && s.d ? s.d : 0 }; })
      .sort((a, b) => (a.vu - b.vu) || (a.d - b.d))
      .map(x => x.q);
  }

  /* Prend n questions en alternant les thèmes (équilibre), en respectant l'ordre de priorité. */
  function prendreEquilibre(pool, n) {
    const groupes = {};
    prioriser(pool).forEach(q => (groupes[q.theme] = groupes[q.theme] || []).push(q));
    const cles = melanger(Object.keys(groupes));
    const res = [];
    while (res.length < n && cles.some(k => groupes[k].length)) {
      for (const k of cles) {
        if (res.length >= n) break;
        if (groupes[k].length) res.push(groupes[k].shift());
      }
    }
    return res;
  }

  /* Sélection avec quotas par niveau, comblement si pénurie. */
  function prendreParNiveaux(pool, n) {
    const quotas = {};
    let reste = n;
    [1, 2, 3].forEach((l, i) => {
      quotas[l] = i === 2 ? reste : Math.round(n * C.repartitionMixte[l]);
      reste -= quotas[l];
    });
    let res = [];
    [1, 2, 3].forEach(l => {
      res = res.concat(prendreEquilibre(pool.filter(q => q.niveau === l), quotas[l]));
    });
    if (res.length < n) {
      const pris = new Set(res.map(q => q.id));
      res = res.concat(prendreEquilibre(pool.filter(q => !pris.has(q.id)), n - res.length));
    }
    return res;
  }

  /* Ordre final : difficulté croissante, aléatoire à l'intérieur d'un même niveau. */
  function ordonnerProgressif(qs) {
    return [1, 2, 3].flatMap(l => melanger(qs.filter(q => q.niveau === l)));
  }

  /* Taille d'une série : 50 au plus, et jamais plus de la moitié du thème,
     pour que deux séries successives puissent toujours être sans question commune. */
  function taille(pool) { return Math.min(C.tailleSerie, Math.ceil(pool.length / 2)); }

  /* Retire les questions de la dernière série terminée et des séries en cours. */
  function frais(pool) { const ex = Store.idsExclus(); return pool.filter(q => !ex.has(q.id)); }

  function selection(pool) {
    const n = taille(pool);
    return ordonnerProgressif(prendreParNiveaux(frais(pool), n));
  }

  function selectionExamen() {
    const poids = C.examen.poids, n = C.examen.nombre;
    const total = Object.values(poids).reduce((a, b) => a + b, 0);
    const dispo = frais(Bank.toutes);
    let res = [];
    Object.keys(poids).forEach(th => {
      const k = Math.round(poids[th] / total * n);
      res = res.concat(prendreParNiveaux(dispo.filter(q => q.theme === th), k));
    });
    const pris = new Set(res.map(q => q.id));
    if (res.length < n) res = res.concat(prendreParNiveaux(dispo.filter(q => !pris.has(q.id)), n - res.length));
    return ordonnerProgressif(melanger(res).slice(0, n));
  }

  function creerSession(opts) {
    // opts : { mode, theme, libelle, cle, questions (objets), examen }
    const qs = opts.questions;
    const ordres = {};
    qs.forEach(q => {
      const idx = q.options.map((_, i) => i);
      ordres[q.id] = q.ordreFixe ? idx : melanger(idx);
    });
    return {
      uid: Store.nouvelUid(),
      mode: opts.mode,
      theme: opts.theme || null,
      libelle: opts.libelle,
      cle: opts.cle,
      examen: !!opts.examen,
      ids: qs.map(q => q.id),
      ordres,
      index: 0,
      reponses: {},
      debut: Date.now(),
      ecoule: 0,           // secondes cumulées (pour reprise)
      dureeMax: opts.examen ? C.examen.dureeMinutes * 60 : 0
    };
  }

  function nomTheme(id) { const t = C.themes.find(x => x.id === id); return t ? t.nom : id; }

  window.Quiz = {
    melanger, nomTheme,

    serieTheme(theme) {
      return creerSession({ mode: "theme", theme, questions: selection(Bank.parTheme(theme)),
        libelle: nomTheme(theme), cle: "theme:" + theme });
    },

    serieMixte() {
      return creerSession({ mode: "mixte", questions: selection(Bank.toutes.filter(q => q.theme !== "cas")),
        libelle: "Série mixte", cle: "mixte" });
    },

    serieCas() {
      return creerSession({ mode: "cas", theme: "cas", questions: selection(Bank.parTheme("cas")),
        libelle: "Cas pratiques", cle: "cas" });
    },

    examenBlanc() {
      return creerSession({ mode: "examen", examen: true, questions: selectionExamen(),
        libelle: "Examen blanc", cle: "examen" });
    },

    /* Révision volontaire des erreurs : ici, les questions reviennent par définition. */
    serieRevoir() {
      const err = Store.etat.erreurs;
      const qs = Store.erreursIds().map(id => Bank.get(id)).filter(Boolean)
        .sort((a, b) => (err[b.id].n - err[a.id].n) || (Math.random() - 0.5))
        .slice(0, C.tailleSerie);
      return creerSession({ mode: "revoir", questions: ordonnerProgressif(qs),
        libelle: "Questions à revoir", cle: "revoir" });
    },

    /* Nouvelle série du même type, avec de nouvelles questions. */
    nouvelleSerie(session) {
      if (session.mode === "theme") return this.serieTheme(session.theme);
      if (session.mode === "cas") return this.serieCas();
      if (session.mode === "examen") return this.examenBlanc();
      if (session.mode === "revoir") return this.serieRevoir();
      return this.serieMixte();
    },

    /* Refaire uniquement les questions ratées d'une série (révision volontaire). */
    rejouerErreurs(session) {
      const qs = session.ids.filter(id => !(session.reponses[id] && session.reponses[id].ok))
        .map(id => Bank.get(id)).filter(Boolean);
      return creerSession({ mode: "revoir", questions: qs,
        libelle: session.libelle + " · erreurs", cle: "erreurs-serie" });
    },

    /* Vérifie une sélection (indices originaux). */
    corriger(q, selection) {
      const a = selection.slice().sort().join(",");
      const b = q.bonnes.slice().sort().join(",");
      return a === b;
    },

    bilan(session) {
      const lignes = session.ids.map(id => ({ q: Bank.get(id), r: session.reponses[id] })).filter(x => x.q);
      const total = lignes.length;
      const score = lignes.filter(x => x.r && x.r.ok).length;
      const parTheme = {};
      lignes.forEach(({ q, r }) => {
        const t = parTheme[q.theme] || (parTheme[q.theme] = { ok: 0, n: 0 });
        t.n++;
        if (r && r.ok) t.ok++;
      });
      const erreurs = lignes.filter(x => !(x.r && x.r.ok));
      return { total, score, pct: total ? Math.round(score / total * 100) : 0, parTheme, erreurs };
    }
  };
})();
