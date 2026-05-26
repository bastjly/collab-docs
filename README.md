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

Renseigner toutes les valeurs dans `.env`. Aucune valeur par défaut n'est fournie pour les secrets.

> **Important** : `DATABASE_URL` doit pointer sur `localhost` (et non `postgres`) puisque l'API tourne en local.
> ```
> DATABASE_URL=postgres://user:password@localhost:5432/collab_docs
> ```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Initialiser la base de données (premier lancement)

```bash
npm run seed
```

### 4. Lancer tous les services

```bash
npm run dev
```

[foreman](https://github.com/nicolo-ribaudo/foreman) lit le `Procfile` et démarre l'API, le WS et le client en parallèle. Les logs sont préfixés par le nom du service. `Ctrl+C` coupe tout.

### 6. Accéder à l'application

| Service | URL                   |
|---------|-----------------------|
| Client  | http://localhost:5173 |
| API     | http://localhost:3001 |
| WS      | ws://localhost:3002   |

---

## Utilisation quotidienne

```bash
npm run dev
```

Pour ajouter une dépendance : `npm install <lib> -w @collab-docs/<service>` depuis la racine. Pas besoin de rebuild Docker.

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

---

## Réinitialiser la base de données

```bash
docker compose down -v
npm run seed
```
