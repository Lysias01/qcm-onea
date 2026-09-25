/* Utilitaires partagés par l'accueil et la page de progression. */
(function () {
  const C = window.APP_CONFIG;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function pctClasse(p) { return p >= 80 ? "bon" : p >= 50 ? "moyen" : "faible"; }
  function duree(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }
  function dateCourte(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  function themeInfo(id) { return C.themes.find(t => t.id === id) || { nom: id, icone: "•" }; }

  /* Thème clair / sombre : préférence mémorisée, bascule par un bouton. */
  function themeSombre() {
    const p = Store.prefs().themeUI;
    return p === "dark" || (p === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function appliquerThemeUI(bouton) {
    const p = Store.prefs().themeUI;
    if (p === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", p);
    if (bouton) bouton.textContent = themeSombre() ? "☀" : "☾";
  }
  function brancherThemeUI(bouton) {
    bouton.addEventListener("click", () => {
      Store.setPref("themeUI", themeSombre() ? "light" : "dark");
      appliquerThemeUI(bouton);
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => appliquerThemeUI(bouton));
    appliquerThemeUI(bouton);
  }

  /* Part de la banque explorée et taux de réussite global. */
  function resumeGlobal() {
    let vu = 0, ok = 0, distinctes = 0;
    Object.keys(Store.etat.stats).forEach(id => {
      const s = Store.etat.stats[id];
      if (!Bank.get(id)) return;
      vu += s.vu; ok += s.ok; distinctes++;
    });
    return {
      explore: Bank.toutes.length ? Math.round(distinctes / Bank.toutes.length * 100) : 0,
      reussite: vu ? Math.round(ok / vu * 100) : null
    };
  }

  window.UI = { esc, pctClasse, duree, dateCourte, themeInfo, appliquerThemeUI, brancherThemeUI, resumeGlobal };
})();
