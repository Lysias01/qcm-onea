/* Page « Ma progression » : statistiques globales, progression par thème, historique, meilleurs scores. */
(function () {
  const C = window.APP_CONFIG;
  const { esc, pctClasse, duree, dateCourte } = window.UI;
  const $ = s => document.querySelector(s);

  function rendu() {
    const st = Store.etat.stats, h = Store.etat.historique;
    const r = UI.resumeGlobal();
    const reponses = Object.values(st).reduce((a, s) => a + s.vu, 0);
    $("#stats").innerHTML = [
      [r.explore + " %", "de la banque explorée"],
      [r.reussite === null ? "–" : r.reussite + " %", "de réussite"],
      [reponses, "réponses données"],
      [h.length, "séries terminées"]
    ].map(([v, l]) => `<div class="stat-carte"><span class="stat-v">${v}</span><span class="stat-l">${l}</span></div>`).join("");

    $("#panneau-themes").innerHTML = `<p class="legende">Part des questions du thème déjà rencontrées.</p>` + C.themes.map(t => {
      const qs = Bank.parTheme(t.id);
      let vues = 0, vu = 0, ok = 0;
      qs.forEach(q => { const s = st[q.id]; if (s) { vues++; vu += s.vu; ok += s.ok; } });
      const couv = qs.length ? Math.round(vues / qs.length * 100) : 0;
      const taux = vu ? Math.round(ok / vu * 100) : null;
      return `<div class="prog-ligne">
        <div class="prog-tete"><span>${t.icone} ${esc(t.nom)}</span><span class="prog-chiffres">${couv} %</span></div>
        <div class="barre"><div class="barre-fill" style="width:${couv}%"></div></div>
        <div class="prog-sous">${taux !== null ? `Réussite : <b class="${pctClasse(taux)}">${taux} %</b>` : "Pas encore commencé"}</div>
      </div>`;
    }).join("");

    $("#panneau-historique").innerHTML = h.length
      ? `<ul class="liste-simple">${h.map(x =>
        `<li><span><small>${dateCourte(x.date)} · ${duree(x.duree || 0)}</small><br>${esc(x.libelle)}</span><b class="${pctClasse(x.pct)}">${x.score}/${x.total} · ${x.pct} %</b></li>`).join("")}</ul>`
      : `<p class="vide-txt">Aucune série terminée pour l'instant.</p>`;

    const m = Store.etat.meilleurs;
    const cles = Object.keys(m).sort((a, b) => m[b].pct - m[a].pct);
    $("#panneau-records").innerHTML = cles.length
      ? `<ul class="liste-simple">${cles.map(k =>
        `<li><span><small>${dateCourte(m[k].date)}</small><br>${esc(m[k].libelle)}</span><b class="${pctClasse(m[k].pct)}">${m[k].score}/${m[k].total} · ${m[k].pct} %</b></li>`).join("")}</ul>`
      : `<p class="vide-txt">Vos meilleurs scores apparaîtront ici.</p>`;
  }

  document.querySelector(".onglets").addEventListener("click", e => {
    const b = e.target.closest("[data-onglet]"); if (!b) return;
    document.querySelectorAll(".onglet").forEach(o => {
      const on = o === b; o.classList.toggle("actif", on); o.setAttribute("aria-selected", on);
    });
    document.querySelectorAll("[data-panneau]").forEach(p => (p.hidden = p.dataset.panneau !== b.dataset.onglet));
  });

  UI.brancherThemeUI($("#btn-theme-ui"));
  rendu();
})();
