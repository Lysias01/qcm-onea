/* Configuration générale de l'application (données, pas de logique). */
window.APP_CONFIG = {
  titre: "QCM ONEA – Réseaux & Systèmes",
  storageKey: "qcm-onea-rs-v1",

  themes: [
    { id: "reseaux",        nom: "Réseaux",                 icone: "🌐" },
    { id: "ipv4",           nom: "IPv4 & VLSM",             icone: "🔢" },
    { id: "ipv6",           nom: "IPv6",                    icone: "6️⃣" },
    { id: "securite",       nom: "Cybersécurité",           icone: "🛡️" },
    { id: "systemes",       nom: "Systèmes Linux/Windows",  icone: "🖥️" },
    { id: "virtualisation", nom: "Virtualisation & Cloud",  icone: "☁️" },
    { id: "devops",         nom: "DevOps & Git",            icone: "🔁" },
    { id: "telecom",        nom: "Télécom & Infrastructure",icone: "📡" },
    { id: "maintenance",    nom: "Maintenance informatique",icone: "🔧" },
    { id: "admin",          nom: "Administration en entreprise", icone: "🏢" },
    { id: "services",       nom: "Services & serveurs",     icone: "📨" },
    { id: "bdd",            nom: "Bases de données & SQL",  icone: "🗄️" },
    { id: "architecture",   nom: "Architecture & systèmes d'exploitation", icone: "🧮" },
    { id: "algo",           nom: "Algorithmique & programmation", icone: "💻" },
    { id: "cas",            nom: "Cas pratiques",           icone: "🧩", special: true }
  ],

  niveaux: [
    { id: 1, nom: "Facile" },
    { id: 2, nom: "Intermédiaire" },
    { id: 3, nom: "Difficile" }
  ],

  types: {
    connaissance: "Connaissance",
    calcul: "Calcul",
    commande: "Commande",
    configuration: "Configuration",
    diagnostic: "Diagnostic",
    cas: "Cas pratique"
  },

  /* Nombre de questions d'une série (ou toutes celles disponibles s'il y en a moins). */
  tailleSerie: 50,

  /* Nombre maximal de séries en cours (interrompues) simultanément. */
  maxEnCours: 2,

  /* Répartition par niveau dans une série (proportions). */
  repartitionMixte: { 1: 0.3, 2: 0.4, 3: 0.3 },

  examen: {
    nombre: 50,
    dureeMinutes: 60,
    /* poids relatifs des thèmes dans l'examen blanc */
    poids: {
      reseaux: 8, ipv4: 6, ipv6: 3, securite: 6, systemes: 6,
      virtualisation: 3, devops: 2, telecom: 3, maintenance: 2, admin: 2,
      services: 3, bdd: 2, architecture: 2, algo: 1, cas: 5
    }
  },

  historiqueMax: 30
};
