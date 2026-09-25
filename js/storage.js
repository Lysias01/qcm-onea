/* Persistance locale (localStorage) : scores, historique, erreurs, progression, séries en cours. */
(function () {
  const KEY = window.APP_CONFIG.storageKey;

  const defaut = () => ({
    prefs: { themeUI: "auto" },
    meilleurs: {},      // { cléMode: {pct, score, total, date, libelle} }
    historique: [],     // [{date, mode, libelle, score, total, pct, duree}]
    erreurs: {},        // { idQuestion: {n: nbÉchecs, date} }
    stats: {},          // { idQuestion: {vu, ok, d: date de la dernière réponse} }
    enCours: [],        // séries interrompues (au plus APP_CONFIG.maxEnCours)
    derniere: []        // identifiants des questions de la dernière série terminée
  });

  let etat = defaut();

  function charger() {
    try {
      const brut = localStorage.getItem(KEY);
      if (brut) etat = Object.assign(defaut(), JSON.parse(brut));
    } catch (e) { etat = defaut(); }
    // Ancien format : une seule série en cours stockée comme objet.
    if (!Array.isArray(etat.enCours)) etat.enCours = etat.enCours ? [etat.enCours] : [];
    etat.enCours.forEach(s => { if (!s.uid) s.uid = nouvelUid(); });
    if (!Array.isArray(etat.derniere)) etat.derniere = [];
  }

  function sauver() {
    try { localStorage.setItem(KEY, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ }
  }

  function nouvelUid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  charger();

  window.Store = {
    get etat() { return etat; },
    sauver,
    nouvelUid,

    prefs() { return etat.prefs; },
    setPref(k, v) { etat.prefs[k] = v; sauver(); },

    /* Enregistre la réponse à une question (progression + liste d'erreurs). */
    repondre(id, correct) {
      const s = etat.stats[id] || (etat.stats[id] = { vu: 0, ok: 0 });
      s.vu++; if (correct) s.ok++;
      s.d = Date.now();
      if (correct) {
        // une bonne réponse retire la question de la liste « à revoir »
        delete etat.erreurs[id];
      } else {
        const e = etat.erreurs[id] || (etat.erreurs[id] = { n: 0 });
        e.n++; e.date = Date.now();
      }
      sauver();
    },

    erreursIds() { return Object.keys(etat.erreurs); },

    /* Questions à ne pas reproposer : dernière série terminée + séries en cours. */
    idsExclus() {
      const ex = new Set(etat.derniere);
      etat.enCours.forEach(s => s.ids.forEach(id => ex.add(id)));
      return ex;
    },

    terminerSerie(res, session) {
      etat.historique.unshift(res);
      etat.historique = etat.historique.slice(0, window.APP_CONFIG.historiqueMax);
      const m = etat.meilleurs[res.cle];
      if (!m || res.pct > m.pct) {
        etat.meilleurs[res.cle] = { pct: res.pct, score: res.score, total: res.total, date: res.date, libelle: res.libelle };
      }
      etat.derniere = session.ids.slice();
      etat.enCours = etat.enCours.filter(s => s.uid !== session.uid);
      sauver();
    },

    /* Séries en cours : ajout, mise à jour, retrait. */
    getEnCours() { return etat.enCours; },
    enregistrerEnCours(session) {
      const i = etat.enCours.findIndex(s => s.uid === session.uid);
      if (i >= 0) etat.enCours[i] = session; else etat.enCours.unshift(session);
      sauver();
    },
    retirerEnCours(uid) { etat.enCours = etat.enCours.filter(s => s.uid !== uid); sauver(); },

    reinitialiser() { const p = etat.prefs; etat = defaut(); etat.prefs = p; sauver(); }
  };
})();
