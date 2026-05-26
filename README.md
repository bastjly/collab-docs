# Collab Docs

Application collaborative d'édition de documents en temps réel.

## Stack

- **API** (`services/api`) — Express, Prisma, PostgreSQL, JWT, otplib (2FA)
- **WS** (`services/ws`) — WebSocket (édition temps réel) + signaling WebRTC (appels audio)
- **Client** (`services/client`) — React + Vite + Tailwind CSS + shadcn/ui

---

## Lancer le projet

### Prérequis

- [Docker](https://www.docker.com/) et Docker Compose (ou [Podman](https://podman.io/) + podman-compose)

### 1. Configuration

```bash
cp .env.example .env
```

Renseigner toutes les valeurs dans `.env` (mots de passe, secret JWT). Aucune valeur par défaut n'est fournie pour les secrets.

### 2. Premier démarrage

```bash
docker compose up --build
```

Au premier démarrage, l'API applique automatiquement le schéma Prisma sur la base de données.

### 3. Créer le compte administrateur

Dans un second terminal, une fois les conteneurs démarrés :

```bash
docker compose exec api npm run seed
```

Cela crée le compte admin défini dans `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### 4. Accéder à l'application

| Service | URL                   |
|---------|-----------------------|
| Client  | http://localhost:5173 |
| API     | http://localhost:3001 |
| WS      | ws://localhost:3002   |

---

## Utilisation quotidienne

Le hot reload est actif sur tous les services : les modifications de fichiers sont prises en compte automatiquement sans redémarrage.

```bash
docker compose up       # démarrer
docker compose down     # arrêter (conserve les données)
```

---

## Gestion des dépendances

`--build` est nécessaire uniquement quand un `package.json` ou un `Dockerfile` est modifié.

### Mettre à jour les dépendances d'un seul service

```bash
docker compose down
docker volume rm collab-docs_client_modules   # ou api_modules / ws_modules
docker compose up --build client              # ou api / ws
```

### Réinitialiser tous les modules sans toucher à la base de données

```bash
docker compose down
docker volume rm collab-docs_api_modules collab-docs_ws_modules collab-docs_client_modules
docker compose up --build
```

### Tout réinitialiser base de données incluse

```bash
docker compose down -v
docker compose up --build
docker compose exec api npm run seed
```

---

## Développement sans Docker

### Prérequis

- Node.js 20+
- PostgreSQL local

### Installation

```bash
npm install
```

Créer un fichier `.env` dans `services/api/` avec la `DATABASE_URL` pointant vers votre PostgreSQL local, puis :

```bash
npm run dev -w @collab-docs/api     # API sur :3001
npm run dev -w @collab-docs/ws      # WS sur :3002
npm run dev -w @collab-docs/client  # Client sur :5173
```

Ou tout en parallèle depuis la racine :

```bash
npm run dev
```

### Commandes Prisma utiles

```bash
# Appliquer le schéma (sans migrations)
npm run db:push -w @collab-docs/api

# Créer une migration
npm run db:migrate -w @collab-docs/api

# Ouvrir Prisma Studio (UI base de données)
npm run db:studio -w @collab-docs/api
```
