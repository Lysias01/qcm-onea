/* Interface : accueil, choix du thème, déroulement du QCM, résultats. */
(function () {
  const C = window.APP_CONFIG;
  const { esc, pctClasse, duree, themeInfo } = window.UI;
  const $ = s => document.querySelector(s);
  const LETTRES = "ABCDEFGH";

  let session = null;      // série affichée
  let selection = [];      // indices originaux sélectionnés pour la question affichée
  let minuteur = null;
  let reperTemps = 0;      // horodatage du dernier point de mesure du temps

  /* Mise en forme légère : ```bloc```, `code`, sauts de ligne. */
  function fmt(s) {
    const blocs = [];
    let t = esc(s).replace(/```([\s\S]*?)```/g, (_, code) => {
      blocs.push("<pre>" + code.replace(/^\n/, "") + "</pre>");
      return "\u0000" + (blocs.length - 1) + "\u0000";
    });
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\n/g, "<br>");
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => blocs[i]);
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), 3200);
  }
  function afficherVue(id) {
    document.querySelectorAll(".vue").forEach(v => (v.hidden = v.id !== id));
    window.scrollTo(0, 0);
  }
  function explorationTheme(id) {
    const qs = Bank.parTheme(id);
    const vues = qs.filter(q => Store.etat.stats[q.id]).length;
    return qs.length ? Math.round(vues / qs.length * 100) : 0;
  }

  /* ================= ACCUEIL ================= */
  function renduAccueil() {
    const r = UI.resumeGlobal();
    $("#res-explore").textContent = r.explore + " %";
    $("#res-reussite").textContent = r.reussite === null ? "–" : r.reussite + " %";
    $("#res-barre").style.width = r.explore + "%";
    renduCourbe();

    const nbErr = Store.erreursIds().filter(id => Bank.get(id)).length;
    $("#desc-revoir").textContent = nbErr ? nbErr + " question" + (nbErr > 1 ? "s" : "") + " à retravailler" : "Aucune erreur pour l'instant";
    $("#btn-revoir").classList.toggle("vide", !nbErr);

    const ec = Store.getEnCours();
    $("#en-cours").hidden = !ec.length;
    $("#liste-en-cours").innerHTML = ec.map(s => {
      const faites = Object.keys(s.reponses).length, n = s.ids.length;
      return `<div class="serie-en-cours">
        <button class="sec-principal" data-reprendre="${s.uid}">
          <span class="sec-titre">${esc(s.libelle)}</span>
          <span class="sec-info">${faites} / ${n} répondues</span>
          <span class="sec-barre"><span style="width:${n ? faites / n * 100 : 0}%"></span></span>
        </button>
        <button class="sec-abandon" data-abandon="${s.uid}" aria-label="Abandonner la série ${esc(s.libelle)}" title="Abandonner">✕</button>
      </div>`;
    }).join("");
  }

  /* Courbe des scores (%) des dernières séries terminées, de la plus ancienne à la plus récente. */
  const NB_POINTS = 12;
  function renduCourbe() {
    const zone = $("#courbe");
    const pts = Store.etat.historique.slice(0, NB_POINTS).reverse();
    if (pts.length < 2) {
      zone.innerHTML = `<p class="courbe-vide">${pts.length ? "Encore une série terminée" : "Terminez deux séries"} pour voir votre courbe de progression.</p>`;
      return;
    }
    const W = Math.max(200, zone.clientWidth), H = 92;
    const g = 8, d = 38, h = 8, b = 8;               // marges : gauche, droite (étiquette), haut, bas
    const x = i => g + i * (W - g - d) / (pts.length - 1);
    const y = p => h + (100 - p) / 100 * (H - h - b);
    const ligne = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join("");
    const aire = `${ligne}L${x(pts.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
    const der = pts[pts.length - 1];
    const pas = (W - g - d) / (pts.length - 1);
    zone.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
           aria-label="Score des ${pts.length} dernières séries : de ${pts[0].pct} % à ${der.pct} %">
        <line class="courbe-grille" x1="${g}" x2="${W - d}" y1="${y(50)}" y2="${y(50)}"/>
        <line class="courbe-base" x1="${g}" x2="${W - d}" y1="${y(0)}" y2="${y(0)}"/>
        <text class="courbe-axe" x="${g}" y="${y(50) - 4}">50 %</text>
        <path class="courbe-aire" d="${aire}"/>
        <path class="courbe-ligne" d="${ligne}"/>
        <circle class="courbe-point courbe-fin" cx="${x(pts.length - 1)}" cy="${y(der.pct)}" r="4"/>
        <circle class="courbe-point courbe-survol" r="4" cx="0" cy="0" visibility="hidden"/>
        ${pts.map((p, i) => `<rect class="courbe-cible" data-i="${i}" x="${x(i) - pas / 2}" y="0" width="${pas}" height="${H}"/>`).join("")}
      </svg>
      <span class="courbe-valeur" style="top:${y(der.pct) - 9}px">${der.pct} %</span>
      <div class="courbe-bulle" hidden></div>
      <table class="sr-only"><caption>Score des dernières séries</caption>
        <tr><th>Date</th><th>Série</th><th>Score</th></tr>
        ${pts.map(p => `<tr><td>${UI.dateCourte(p.date)}</td><td>${esc(p.libelle)}</td><td>${p.pct} %</td></tr>`).join("")}
      </table>`;

    const bulle = zone.querySelector(".courbe-bulle"), survol = zone.querySelector(".courbe-survol");
    const montrer = i => {
      const p = pts[i];
      survol.setAttribute("cx", x(i)); survol.setAttribute("cy", y(p.pct)); survol.setAttribute("visibility", "visible");
      bulle.innerHTML = `<b>${p.pct} %</b> · ${p.score}/${p.total}<br><span>${esc(p.libelle)} · ${UI.dateCourte(p.date)}</span>`;
      bulle.hidden = false;
      const bw = bulle.offsetWidth;
      bulle.style.left = Math.min(Math.max(0, x(i) - bw / 2), W - bw) + "px";
      bulle.style.top = Math.max(0, y(p.pct) - bulle.offsetHeight - 10) + "px";
    };
    const cacher = () => { bulle.hidden = true; survol.setAttribute("visibility", "hidden"); };
    zone.querySelectorAll(".courbe-cible").forEach(r => {
      r.addEventListener("pointerenter", () => montrer(+r.dataset.i));
      r.addEventListener("pointerdown", () => montrer(+r.dataset.i));
    });
    zone.querySelector("svg").addEventListener("pointerleave", cacher);
  }
  let redim;
  window.addEventListener("resize", () => { clearTimeout(redim); redim = setTimeout(() => { if (!$("#vue-accueil").hidden) renduCourbe(); }, 150); });

  $("#btn-reset").addEventListener("click", () => {
    if (confirm("Effacer scores, historique, progression, erreurs et séries en cours enregistrés sur cet appareil ?")) {
      Store.reinitialiser(); renduAccueil(); toast("Données réinitialisées");
    }
  });

  $("#liste-en-cours").addEventListener("click", e => {
    const rep = e.target.closest("[data-reprendre]");
    const ab = e.target.closest("[data-abandon]");
    if (rep) {
      const s = Store.getEnCours().find(x => x.uid === rep.dataset.reprendre);
      if (!s) return;
      s.ids = s.ids.filter(id => Bank.get(id));
      session = s;
      demarrerVueQuiz();
    } else if (ab && confirm("Abandonner définitivement cette série ?")) {
      Store.retirerEnCours(ab.dataset.abandon);
      renduAccueil();
    }
  });

  /* ---------- lancement des modes ---------- */
  function lancer(creer) {
    if (Store.getEnCours().length >= C.maxEnCours) {
      afficherVue("vue-accueil"); renduAccueil();
      toast(`Vous avez déjà ${C.maxEnCours} séries en cours : terminez-en une ou abandonnez-la pour en commencer une nouvelle.`);
      return;
    }
    const s = creer();
    if (!s.ids.length) {
      toast("Toutes les questions disponibles sont déjà dans vos séries en cours. Terminez-en une d'abord.");
      return;
    }
    session = s;
    Store.enregistrerEnCours(session);
    demarrerVueQuiz();
  }

  $("#btn-par-theme").addEventListener("click", () => {
    renduThemes();
    afficherVue("vue-themes");
    history.pushState({ vue: "themes" }, "");
  });
  $("#btn-mixte").addEventListener("click", () => lancer(() => Quiz.serieMixte()));
  $("#btn-cas").addEventListener("click", () => lancer(() => Quiz.serieCas()));
  $("#btn-examen").addEventListener("click", () => {
    if (confirm(`Examen blanc : ${C.examen.nombre} questions tous thèmes, ${C.examen.dureeMinutes} minutes.\nLa correction est donnée à la fin, comme le jour du concours.\n\nCommencer ?`))
      lancer(() => Quiz.examenBlanc());
  });
  $("#btn-revoir").addEventListener("click", () => {
    if (!Store.erreursIds().filter(id => Bank.get(id)).length) { toast("Aucune question à revoir pour le moment 👍"); return; }
    lancer(() => Quiz.serieRevoir());
  });

  /* ================= CHOIX DU THÈME ================= */
  function renduThemes() {
    $("#liste-themes").innerHTML = C.themes.filter(t => !t.special).map(t => {
      const p = explorationTheme(t.id);
      return `<button class="theme-carte" data-theme-id="${t.id}">
        <span class="theme-icone" aria-hidden="true">${t.icone}</span>
        <span class="theme-corps">
          <span class="theme-nom">${esc(t.nom)}</span>
          <span class="theme-prog"><span class="theme-barre"><span style="width:${p}%"></span></span><span class="theme-pct">${p} %</span></span>
        </span>
        <span class="theme-fleche" aria-hidden="true">›</span>
      </button>`;
    }).join("");
  }
  $("#liste-themes").addEventListener("click", e => {
    const b = e.target.closest("[data-theme-id]"); if (!b) return;
    lancer(() => Quiz.serieTheme(b.dataset.themeId));
  });
  $("#btn-retour-themes").addEventListener("click", () => history.back());

  /* ================= QUIZ ================= */
  function demarrerVueQuiz() {
    afficherVue("vue-quiz");
    history.pushState({ vue: "quiz" }, "");
    $("#chrono").hidden = !session.examen;
    reperTemps = Date.now();
    clearInterval(minuteur);
    minuteur = setInterval(tic, 1000);
    tic();
    renduQuestion();
  }

  function tic() {
    if (!session) return;
    const now = Date.now();
    session.ecoule += (now - reperTemps) / 1000;
    reperTemps = now;
    if (session.examen) {
      const reste = session.dureeMax - session.ecoule;
      const el = $("#chrono");
      el.textContent = "⏱ " + duree(reste);
      el.classList.toggle("urgent", reste < 300);
      if (reste <= 0) { toast("Temps écoulé !"); terminer(); }
    }
  }

  function questionCourante() { return Bank.get(session.ids[session.index]); }

  /* Étiquettes : le thème n'apparaît que dans les séries multi-thèmes ; le niveau n'est jamais affiché. */
  function etiquettes(q) {
    const th = themeInfo(q.theme);
    const monoTheme = session.mode === "theme" || session.mode === "cas";
    const tags = [];
    if (!monoTheme) tags.push(`<span class="tag tag-theme">${th.icone} ${esc(th.nom)}</span>`);
    if (q.sousTheme && q.sousTheme !== th.nom) tags.push(`<span class="tag${monoTheme ? " tag-theme" : ""}">${esc(q.sousTheme)}</span>`);
    return tags.join("");
  }

  function renduQuestion() {
    const q = questionCourante();
    if (!q) { terminer(); return; }
    const n = session.ids.length, i = session.index;
    const dejaRepondue = session.reponses[q.id];

    $("#compteur").textContent = `Question ${i + 1}/${n}`;
    $("#progress-fill").style.width = (i / n * 100) + "%";

    $("#q-meta").innerHTML = etiquettes(q);
    $("#q-enonce").innerHTML = fmt(q.enonce);
    $("#q-consigne").innerHTML = q.multiple
      ? `<span class="multi">☑ Plusieurs réponses correctes : cochez-les toutes</span>`
      : `<span>◉ Une seule réponse correcte</span>`;

    selection = dejaRepondue ? dejaRepondue.sel.slice() : [];
    const ordre = session.ordres[q.id];
    $("#q-options").innerHTML = ordre.map((orig, pos) =>
      `<button class="option${q.multiple ? " multiple" : ""}" data-i="${orig}" aria-pressed="false">
        <span class="lettre">${LETTRES[pos]}</span><span class="opt-txt">${fmt(q.options[orig])}</span></button>`).join("");

    $("#q-feedback").hidden = true;
    $("#btn-valider").hidden = false;
    $("#btn-suivant").hidden = true;
    $("#btn-valider").textContent = session.examen ? (i === n - 1 ? "Terminer l'examen" : "Valider et continuer →") : "Valider";

    majSelection();
    if (dejaRepondue && !session.examen) afficherCorrection(q, dejaRepondue.ok);
    window.scrollTo(0, 0);
  }

  function majSelection() {
    document.querySelectorAll("#q-options .option").forEach(b => {
      const on = selection.includes(Number(b.dataset.i));
      b.classList.toggle("choisie", on);
      b.setAttribute("aria-pressed", on);
    });
    $("#btn-valider").disabled = selection.length === 0;
  }

  $("#q-options").addEventListener("click", e => {
    const b = e.target.closest(".option");
    if (!b || b.classList.contains("verrou")) return;
    choisir(Number(b.dataset.i));
  });

  function choisir(i) {
    const q = questionCourante();
    if (q.multiple) selection = selection.includes(i) ? selection.filter(x => x !== i) : selection.concat(i);
    else selection = [i];
    majSelection();
  }

  $("#btn-valider").addEventListener("click", valider);
  function valider() {
    if (!selection.length) return;
    const q = questionCourante();
    if (session.reponses[q.id] && !session.examen) return;
    const ok = Quiz.corriger(q, selection);
    session.reponses[q.id] = { sel: selection.slice(), ok };
    Store.repondre(q.id, ok);

    if (session.examen) {
      avancer();
    } else {
      afficherCorrection(q, ok);
      Store.enregistrerEnCours(session);
      }
  }

  function afficherCorrection(q, ok) {
    const ordre = session.ordres[q.id];
    document.querySelectorAll("#q-options .option").forEach(b => {
      const i = Number(b.dataset.i);
      b.classList.add("verrou");
      const bonne = q.bonnes.includes(i), choisie = selection.includes(i);
      if (bonne && choisie) b.classList.add("correcte");
      else if (bonne) b.classList.add("manquee");
      else if (choisie) b.classList.add("fausse");
    });
    const lettres = q.bonnes.map(i => LETTRES[ordre.indexOf(i)]).sort();
    const fb = $("#q-feedback");
    fb.className = "feedback " + (ok ? "ok" : "ko");
    fb.innerHTML =
      `<div class="fb-titre">${ok ? "✅ Bonne réponse !" : "❌ Réponse incorrecte"}</div>` +
      (ok ? "" : `<div class="fb-bonne"><b>Bonne${lettres.length > 1 ? "s" : ""} réponse${lettres.length > 1 ? "s" : ""} (${lettres.join(", ")}) :</b><ul>${q.bonnes.map(i => `<li>${fmt(q.options[i])}</li>`).join("")}</ul></div>`) +
      `<div class="fb-expl"><b>Explication :</b> ${fmt(q.explication)}</div>`;
    fb.hidden = false;
    $("#btn-valider").hidden = true;
    const dernier = session.index === session.ids.length - 1;
    $("#btn-suivant").textContent = dernier ? "Voir les résultats" : "Question suivante →";
    $("#btn-suivant").hidden = false;
    setTimeout(() => fb.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  $("#btn-suivant").addEventListener("click", avancer);
  function avancer() {
    if (session.index >= session.ids.length - 1) { terminer(); return; }
    session.index++;
    Store.enregistrerEnCours(session);
    renduQuestion();
  }

  $("#btn-quitter").addEventListener("click", quitterQuiz);
  function quitterQuiz() {
    if (confirm("Quitter la série ?\nVotre avancement est sauvegardé : vous pourrez la reprendre depuis l'accueil.")) {
      tic();
      Store.enregistrerEnCours(session);
      clearInterval(minuteur);
      session = null;
      afficherVue("vue-accueil");
      renduAccueil();
      return true;
    }
    return false;
  }

  /* Clavier (PC) : 1-8 ou A-H pour choisir, Entrée pour valider / suivant. */
  document.addEventListener("keydown", e => {
    if ($("#vue-quiz").hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toUpperCase();
    let pos = "12345678".indexOf(k);
    if (pos < 0) pos = LETTRES.indexOf(k);
    const btns = document.querySelectorAll("#q-options .option");
    if (pos >= 0 && btns[pos] && !btns[pos].classList.contains("verrou")) { choisir(Number(btns[pos].dataset.i)); e.preventDefault(); }
    else if (e.key === "Enter") {
      if (!$("#btn-suivant").hidden) avancer();
      else if (!$("#btn-valider").disabled) valider();
      e.preventDefault();
    }
  });

  /* ================= RÉSULTATS ================= */
  let derniereSession = null;

  function terminer() {
    clearInterval(minuteur);
    tic();
    const s = session; session = null;
    const b = Quiz.bilan(s);
    Store.terminerSerie({
      date: Date.now(), mode: s.mode, cle: s.cle, libelle: s.libelle,
      score: b.score, total: b.total, pct: b.pct, duree: Math.round(s.ecoule)
    }, s);
    derniereSession = s;
    renduResultats(s, b);
    afficherVue("vue-resultats");
    history.replaceState({ vue: "resultats" }, "");
  }

  function renduResultats(s, b) {
    const mention = b.pct >= 85 ? "Excellent, niveau concours 🎯" : b.pct >= 70 ? "Très bien, continuez ainsi" :
      b.pct >= 50 ? "Passable : revoyez vos erreurs" : "À retravailler : reprenez les bases";
    const sansRep = s.ids.filter(id => !s.reponses[id]).length;
    $("#res-principal").innerHTML = `
      <div class="jauge ${pctClasse(b.pct)}" style="--p:${b.pct}">
        <div class="jauge-int"><span class="jauge-score">${b.score}<small>/${b.total}</small></span><span class="jauge-pct">${b.pct}%</span></div>
      </div>
      <div class="res-libelle">${esc(s.libelle)}</div>
      <div class="res-mention ${pctClasse(b.pct)}">${mention}</div>
      <div class="res-chiffres">
        <div><b class="bon">${b.score}</b><span>bonnes</span></div>
        <div><b class="faible">${b.total - b.score}</b><span>mauvaises${sansRep ? ` (dont ${sansRep} sans réponse)` : ""}</span></div>
        <div><b>${duree(s.ecoule)}</b><span>durée</span></div>
      </div>`;

    const themes = Object.keys(b.parTheme);
    $("#carte-res-themes").hidden = themes.length < 2;
    $("#res-themes").innerHTML = themes.map(t => {
      const x = b.parTheme[t], p = Math.round(x.ok / x.n * 100), th = themeInfo(t);
      return `<div class="prog-ligne"><div class="prog-tete"><span>${th.icone} ${esc(th.nom)}</span>
        <span class="prog-chiffres">${x.ok}/${x.n} · <b class="${pctClasse(p)}">${p}%</b></span></div>
        <div class="barre"><div class="barre-fill ${pctClasse(p)}" style="width:${p}%"></div></div></div>`;
    }).join("");

    $("#res-erreurs-titre").textContent = b.erreurs.length ? `Erreurs à corriger (${b.erreurs.length})` : "Aucune erreur 🎉";
    $("#res-erreurs").innerHTML = b.erreurs.map(({ q, r }, k) => {
      const ordre = s.ordres[q.id] || q.options.map((_, i) => i);
      const L = i => LETTRES[ordre.indexOf(i)];
      const votre = r ? r.sel.map(i => `${L(i)}. ${fmt(q.options[i])}`).join("<br>") : "<i>Sans réponse</i>";
      return `<details class="erreur"${k < 3 ? " open" : ""}>
        <summary>${fmt(q.enonce.split("\n")[0].slice(0, 140))}${q.enonce.length > 140 ? "…" : ""}</summary>
        <div class="erreur-corps">
          ${q.enonce.length > 140 || q.enonce.includes("\n") ? `<div class="enonce petit">${fmt(q.enonce)}</div>` : ""}
          <div class="err-rep ko"><b>Votre réponse :</b><br>${votre}</div>
          <div class="err-rep ok"><b>Bonne réponse :</b><br>${q.bonnes.map(i => `${L(i)}. ${fmt(q.options[i])}`).join("<br>")}</div>
          <div class="fb-expl"><b>Explication :</b> ${fmt(q.explication)}</div>
        </div></details>`;
    }).join("");
    $("#btn-refaire-erreurs").hidden = !b.erreurs.length;
  }

  $("#btn-nouvelle").addEventListener("click", () => derniereSession && lancer(() => Quiz.nouvelleSerie(derniereSession)));
  $("#btn-refaire-erreurs").addEventListener("click", () => derniereSession && lancer(() => Quiz.rejouerErreurs(derniereSession)));
  $("#btn-accueil").addEventListener("click", () => { afficherVue("vue-accueil"); renduAccueil(); });

  /* Bouton « retour » du téléphone */
  window.addEventListener("popstate", () => {
    if (!$("#vue-quiz").hidden && session) {
      if (!quitterQuiz()) history.pushState({ vue: "quiz" }, "");
    } else if ($("#vue-accueil").hidden) {
      afficherVue("vue-accueil"); renduAccueil();
    }
  });

  /* Sauvegarde du temps si l'onglet est fermé ou mis en arrière-plan */
  document.addEventListener("visibilitychange", () => {
    if (!session) return;
    if (document.hidden) { tic(); Store.enregistrerEnCours(session); }
  });

  /* ---------- démarrage ---------- */
  UI.brancherThemeUI($("#btn-theme-ui"));
  renduAccueil();
})();
