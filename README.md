# QCM ONEA – Réseaux & Systèmes

Site statique d'entraînement (HTML, CSS, JavaScript vanilla) au concours d'Ingénieur des Travaux en Informatique – Réseaux et Systèmes.

## 1. Lancer localement

Option simple : ouvrir `index.html` dans un navigateur (double-clic).

Option recommandée (serveur local) :

```bash
cd qcm-onea
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000

## 2. Publier sur GitHub Pages

1. Créer un dépôt sur GitHub (ex. `qcm-onea`).
2. Déposer tout le contenu de ce dossier à la racine du dépôt (bouton « Add file › Upload files », ou `git add . && git commit -m "QCM" && git push`).
3. Dans le dépôt : **Settings › Pages › Build and deployment › Source : Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Après une à deux minutes, le site est disponible à l'adresse `https://<votre-compte>.github.io/qcm-onea/`.
