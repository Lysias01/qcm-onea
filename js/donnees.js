/* Liste des fichiers de questions, chargée par l'accueil et par la page de progression.
   Pour ajouter un fichier de questions, il suffit de l'ajouter ici. */
(function () {
  const fichiers = [
    "data/questions/reseaux.js",
    "data/questions/reseaux-2.js",
    "data/questions/ipv4.js",
    "data/questions/ipv4-calculs.js",
    "data/questions/ipv4-calculs-2.js",
    "data/questions/ipv6.js",
    "data/questions/ipv6-2.js",
    "data/questions/securite.js",
    "data/questions/securite-2.js",
    "data/questions/systemes.js",
    "data/questions/systemes-2.js",
    "data/questions/virtualisation.js",
    "data/questions/virtualisation-2.js",
    "data/questions/devops.js",
    "data/questions/devops-2.js",
    "data/questions/telecom.js",
    "data/questions/telecom-2.js",
    "data/questions/maintenance.js",
    "data/questions/maintenance-2.js",
    "data/questions/admin.js",
    "data/questions/admin-2.js",
    "data/questions/services.js",
    "data/questions/bdd.js",
    "data/questions/architecture.js",
    "data/questions/algo.js",
    "data/questions/complements.js",
    "data/questions/cas-pratiques.js",
    "data/questions/cas-pratiques-2.js",
    "data/questions/cas-pratiques-3.js"
  ];
  fichiers.forEach(f => document.write('<script src="' + f + '"><\/script>'));
})();
