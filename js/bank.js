/* Normalisation de la banque de questions.
   Format source (data/questions/*.js) :
   { t: thème, s: sous-thème, l: niveau 1|2|3, y: type, q: énoncé, o: [propositions], e: explication }
   Les bonnes propositions sont préfixées par « * ». */
(function () {
  const src = window.QB || [];
  const themesValides = new Set(window.APP_CONFIG.themes.map(t => t.id));

  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  const vus = new Set();
  const banque = [];

  src.forEach((b, i) => {
    const opts = [], bonnes = [];
    (b.o || []).forEach((txt, k) => {
      if (txt.charAt(0) === "*") { bonnes.push(k); opts.push(txt.slice(1)); }
      else opts.push(txt);
    });
    const probleme =
      !themesValides.has(b.t) ? "thème inconnu" :
      ![1, 2, 3].includes(b.l) ? "niveau invalide" :
      opts.length < 4 ? "moins de 4 propositions" :
      bonnes.length === 0 ? "aucune bonne réponse" : null;
    if (probleme) { console.warn("Question ignorée (" + probleme + ") :", b.q); return; }

    let id = b.t + "-" + hash(b.q);
    if (vus.has(id)) { id += "-" + i; }
    vus.add(id);

    banque.push({
      id, theme: b.t, sousTheme: b.s || "", niveau: b.l, type: b.y || "connaissance",
      enonce: b.q, options: opts, bonnes, explication: b.e || "",
      multiple: bonnes.length > 1, ordreFixe: !!b.f
    });
  });

  const parId = new Map(banque.map(q => [q.id, q]));

  window.Bank = {
    toutes: banque,
    get: id => parId.get(id),
    parTheme: th => banque.filter(q => q.theme === th),
    compter(filtre) { return banque.filter(filtre).length; }
  };
})();
