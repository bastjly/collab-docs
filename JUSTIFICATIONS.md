# Document explicatif — Choix organisationnels, techniques et architecturaux

## Choix techniques

Le langage serveur est **JavaScript**, comme imposé par le sujet. Pour le framework backend, on a choisi **Express**. C'est un framework minimaliste qui ne nous impose pas de structure rigide, ce qui nous a laissé libres d'organiser le code comme on le souhaitait. On l'avait déjà utilisé dans des projets précédents, donc on était à l'aise dessus.

On n'a pas utilisé **TypeScript**, tout simplement parce qu'on est moins à l'aise avec. Sur un projet de cette taille, avec des délais contraints, on a préféré rester sur ce qu'on maîtrise.

Côté client, on a choisi **React** pour les mêmes raisons : c'est le framework que le groupe connaît le mieux. Couplé à **Vite** pour le bundling, le setup est rapide et le hot reload en développement est idéal. Pour les composants UI, on a utilisé **shadcn/ui** basé sur Radix UI, avec **Tailwind CSS** pour le style. Ça nous a évité de créer des composants accessibles from scratch (dialogs, dropdowns, etc.) tout en gardant la main sur le rendu final.

Pour la base de données, on a choisi **PostgreSQL**. C'est une base relationnelle très complète, bien plus performante et mature que ses concurrents open source sur des charges importantes, et surtout elle gère un large éventail de types de données. Elle est aussi très bien supportée par l'écosystème Node.js. Pour l'accès aux données, on a utilisé **Prisma** car plusieurs membres du groupe l'avaient déjà utilisé : la définition du schéma est claire, la génération du client typé facilite les requêtes, et Prisma Studio est pratique pour inspecter la base en développement.

Pour les **communications en temps réel**, on a fait le choix d'utiliser l'API WebSocket native (`ws` côté serveur, WebSocket natif côté navigateur) sans passer par une bibliothèque comme Socket.IO. L'objectif était de comprendre le fonctionnement du protocole de zéro, sans surcouche abstraite. Ça nous a forcés à implémenter nous-mêmes la gestion des rooms, le broadcast et la reconnexion.

Les **appels audio** sont implémentés avec **WebRTC**, l'API native du navigateur pour la communication peer-to-peer. Le serveur WebSocket sert de serveur de signaling : il relaie les offres SDP, les réponses et les candidats ICE entre les participants. On utilise un serveur **STUN public de Cloudflare** pour la résolution des adresses ICE. On n'a pas mis en place de serveur TURN — la traversée de NAT stricts n'est donc pas garantie — mais ça sort du scope de ce projet.

---

## Choix architecturaux

L'application est divisée en **trois services distincts** : une API REST (`services/api`), un serveur WebSocket (`services/ws`) et le client React (`services/client`). Cette séparation répond à la contrainte des deux serveurs de la façon suivante : en production, l'API REST tourne sur le **premier serveur** et le serveur WebSocket sur le **deuxième serveur**, tandis que le client React est compilé en fichiers statiques et peut être servi depuis l'un ou l'autre, ou un CDN dédié. En développement, tout tourne sur la même machine avec trois ports distincts (3001, 3002, 5173) grâce à Foreman qui lit le `Procfile`.


On a choisi de séparer l'API REST du serveur WebSocket plutôt que de les fusionner pour une raison simple : les responsabilités sont très différentes. L'API gère les opérations CRUD classiques avec authentification, validation et accès à la base de données. Le serveur WS gère de la communication en temps réel (changements de document, signaling WebRTC, messages de chat) et maintient un état en mémoire (rooms, appels actifs). Les mélanger aurait rendu le code plus difficile à maintenir et à faire évoluer indépendamment. Cette séparation a aussi un avantage pratique : si on souhaite un jour exposer l'API à des partenaires ou des applications tierces, on peut le faire sans pour autant exposer le serveur WebSocket, qui lui est réservé aux clients de l'application.

Ce découplage entre l'API et le serveur WebSocket a une importance particulière pour la **scalabilité**. Les connexions WebSocket sont persistantes et consomment des ressources de manière continue, contrairement aux requêtes HTTP. En les isolant sur un serveur dédié, on peut faire évoluer les deux indépendamment : si le nombre de connexions simultanées augmente, on peut dimensionner le serveur WS sans toucher à l'API, et inversement.

La communication entre les services côté client est directe : le navigateur parle à l'API via HTTP et au serveur WS via WebSocket. Il n'y a pas de communication serveur-à-serveur : si une action côté API doit notifier des clients en temps réel, c'est le client qui, après avoir reçu la réponse HTTP, envoie un message au WS pour broadcaster. Ce choix simplifie l'architecture en évitant un bus de messages sur plusieurs services.

La base de données est accessible uniquement depuis l'API. Le serveur WebSocket ne fait aucune requête SQL, ce qui le maintient léger et concentré sur son rôle de relai de messages.

---

## Choix organisationnels

Le projet a été découpé en grandes fonctionnalités qui ont été développées de manière itérative. On a commencé par le socle commun : authentification, gestion des documents et arborescence de fichiers. Une fois cette base stable, on a ajouté les fonctionnalités temps réel (édition collaborative, appels audio) puis les fonctionnalités avancées (2FA, gestion des permissions, chat).

On a utilisé **Git** avec des branches par fonctionnalité et des pull requests pour la revue de code. Ça nous a permis de travailler en parallèle sans trop se bloquer mutuellement.

La gestion des tâches s'est faite de façon informelle au début, puis on a adopté un tableau simple pour suivre ce qui était en cours et ce qui restait à faire. Les décisions techniques importantes (choix des bibliothèques, découpage des services) ont été prises collectivement.
