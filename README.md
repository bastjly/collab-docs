# Collab Docs

Application collaborative d'édition de documents en temps réel.

## Stack

- **API** (`services/api`) — Express, Prisma, PostgreSQL, JWT, otplib (2FA)
- **WS** (`services/ws`) — WebSocket (édition temps réel) + signaling WebRTC (appels audio)
- **Client** (`services/client`) — React + Vite

---

## Lancer le projet

### Prérequis

- [Docker](https://www.docker.com/) et Docker Compose

### 1. Configuration

```bash
cp .env.example .env
```

Modifier les valeurs dans `.env` si nécessaire (mots de passe, secrets JWT).

### 2. Démarrer les conteneurs

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

| Service  | URL                        |
|----------|----------------------------|
| Client   | http://localhost:5173      |
| API      | http://localhost:3001      |
| WS       | ws://localhost:3002        |

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
npm run dev -w @collab-docs/api    # API sur :3001
npm run dev -w @collab-docs/ws     # WS sur :3002
npm run dev -w @collab-docs/client # Client sur :5173
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
