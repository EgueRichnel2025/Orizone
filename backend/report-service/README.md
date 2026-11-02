# Orizone Report Service

Service local de génération de rapports scientifiques Simplexe avec XeLaTeX.

## Démarrage depuis la racine du dépôt

```bash
docker compose -f docker-compose.reports.yml up --build
```

Le service écoute sur `http://localhost:8001`.

- `GET /health` : disponibilité du moteur XeLaTeX.
- `POST /api/reports/simplex/latex` : retourne le source `.tex`.
- `POST /api/reports/simplex/pdf` : compile et retourne le PDF.

Les deux routes POST attendent un objet `SimplexHistoryEntry` identique à celui conservé dans IndexedDB. Le service ne reçoit jamais du code LaTeX libre : il génère le document à partir de données structurées et échappe les textes.

## Sécurité et limites de cette première phase

- La compilation utilise XeLaTeX avec `-no-shell-escape`.
- Chaque compilation se fait dans un répertoire temporaire isolé, supprimé après la réponse.
- Une limite de temps de compilation est appliquée.
- Le service est destiné au développement local. Avant exposition publique, ajouter authentification, limitation de débit, quotas, surveillance et politique de conservation adaptée.
- Cette première version exporte les résolutions Simplexe. Le rapport Branch & Bound sera ajouté dans une phase suivante.
