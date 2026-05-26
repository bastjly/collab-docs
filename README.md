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
- Node.js 20+

### 1. Configuration

```bash
cp .env.example .env
```

Renseigner toutes les valeurs dans `.env` (mots de passe, secret JWT). Aucune valeur par défaut n'est fournie pour les secrets.

### 2. Démarrer le backend

```bash
docker compose up --build
```

Au premier démarrage, l'API applique automatiquement le schéma Prisma sur la base de données.

### 3. Créer le compte administrateur

Dans un second terminal, une fois les conteneurs démarrés :

```bash
docker compose exec api npm run seed
```

### 4. Démarrer le client

Le client tourne en local pour un hot reload natif sans Docker :

```bash
cd services/client
npm install
npm run dev
```

### 5. Accéder à l'application

| Service | URL                   |
|---------|-----------------------|
| Client  | http://localhost:5173 |
| API     | http://localhost:3001 |
| WS      | ws://localhost:3002   |

---

## Utilisation quotidienne

```bash
# Terminal 1 — backend
docker compose up

# Terminal 2 — frontend (hot reload natif, npm install uniquement à la première fois)
cd services/client && npm run dev
```

Pour ajouter une lib frontend : `npm install <lib>` dans `services/client`, le serveur Vite redémarre tout seul.

---

## Gestion des dépendances backend

`--build` est nécessaire uniquement quand un `package.json` ou un `Dockerfile` de l'API ou du WS est modifié.

```bash
# Mettre à jour les dépendances d'un service backend
docker compose down
docker volume rm collab-docs_api_modules   # ou ws_modules
docker compose up --build api              # ou ws

# Tout réinitialiser sans toucher à la base de données
docker compose down
docker volume rm collab-docs_api_modules collab-docs_ws_modules
docker compose up --build

# Tout réinitialiser base de données incluse
docker compose down -v
docker compose up --build
docker compose exec api npm run seed
```

---

## Commandes Prisma utiles

```bash
# Appliquer le schéma (sans migrations)
npm run db:push -w @collab-docs/api

# Créer une migration
npm run db:migrate -w @collab-docs/api

# Ouvrir Prisma Studio (UI base de données)
npm run db:studio -w @collab-docs/api
```
