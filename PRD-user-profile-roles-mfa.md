# PRD — Profil utilisateur, Rôles & MFA

## Contexte

L'API dispose déjà du modèle `User` complet (champs `role`, `isBlocked`, `totpSecret`, `totpEnabled`) et de la majorité des routes nécessaires. Le frontend a été enrichi lors du dernier pull : React Router v6, `AuthContext`, `LoginPage`, `DocumentsPage`, `DocumentPage`, hooks WebSocket/WebRTC. Ce PRD tient compte de l'état réel du code.

---

## 1. Modèle de rôles

Trois rôles hiérarchiques :

| Rôle | Description | Création |
|---|---|---|
| `USER` | Utilisateur standard, accès aux documents | Via interface admin |
| `ADMIN` | Gère les comptes utilisateurs | Via interface admin ou seed |
| `SUPERADMIN` | Peut changer les rôles, accès total | Via seed uniquement (`ADMIN_EMAIL` dans `.env`) |

### Règles de hiérarchie
- Le **SUPERADMIN** est l'unique compte créé par le seed. Il ne peut pas être bloqué ni rétrogradé.
- Un **ADMIN** peut : créer des comptes USER et ADMIN, bloquer/débloquer des comptes USER et ADMIN, voir la liste des utilisateurs.
- Un **ADMIN** ne peut pas : modifier les rôles, bloquer le SUPERADMIN, se bloquer lui-même.
- Un **SUPERADMIN** peut : tout ce que l'ADMIN peut faire + modifier le rôle de n'importe quel compte (sauf le sien).
- Un **USER** n'a accès qu'à son profil et aux documents.

### Ajustements API
- Ajouter `SUPERADMIN` à l'enum `Role` dans Prisma.
- Ajouter un middleware `requireSuperAdmin`.
- Marquer le compte seed comme `SUPERADMIN` au lieu de `ADMIN`.
- `PATCH /api/users/:id/role` → nouvelle route, accessible `SUPERADMIN` uniquement.

---

## 2. Périmètre global

| Feature | API | Frontend |
|---|---|---|
| Rôles USER / ADMIN / SUPERADMIN | ⚠️ Ajustement (ajout SUPERADMIN) | ❌ À faire |
| Profil — voir ses infos | ✅ `GET /api/users/me` | ❌ À faire |
| Profil — modifier nom | ✅ `PATCH /api/users/me` | ❌ À faire |
| Profil — changer mot de passe | ⚠️ Ajustement (vérif ancien mdp) | ❌ À faire |
| MFA — activer | ✅ `POST /api/2fa/setup` + `/verify` | ❌ À faire |
| MFA — désactiver | ⚠️ Ajustement (vérif TOTP) | ❌ À faire |
| Admin — créer compte USER/ADMIN | ⚠️ Ajustement (accepter `role`) | ❌ À faire |
| Admin — lister les utilisateurs | ✅ `GET /api/users/` | ❌ À faire |
| Admin — bloquer / débloquer | ⚠️ Ajustement (vérif hiérarchie) | ❌ À faire |
| Superadmin — modifier le rôle | ❌ Nouvelle route | ❌ À faire |

---

## 3. Profil utilisateur

Accessible depuis le header (lien sur le nom de l'utilisateur), route `/profile`.

### Informations affichées (lecture seule)
- Email
- Rôle (`USER`, `ADMIN`, `SUPERADMIN`)
- Statut MFA : activé / désactivé

### Modifier le nom
- Champ texte pré-rempli.
- Appel : `PATCH /api/users/me` → `{ name }`.
- Feedback inline : succès ou erreur.

### Changer le mot de passe
Formulaire distinct dans la même page.
- Champs : mot de passe actuel, nouveau mot de passe, confirmation.
- Validation côté client : nouveau ≠ actuel, confirmation identique, longueur ≥ 8 caractères.
- Appel : `PATCH /api/users/me` → `{ currentPassword, newPassword }`.
- **Ajustement API** : vérifier `currentPassword` avec `bcrypt.compare` avant mise à jour.

### Section MFA
Voir §5.

---

## 4. Administration

Accessible via un **onglet "Administration"** dans `DocumentsPage`, visible uniquement pour `ADMIN` et `SUPERADMIN`.

### 4.1 Liste des utilisateurs

Tableau avec les colonnes : Nom, Email, Rôle, MFA, Statut (Actif / Bloqué), Date de création.

**Actions disponibles selon le rôle connecté :**

| Action | ADMIN | SUPERADMIN |
|---|---|---|
| Bloquer un USER | ✅ | ✅ |
| Bloquer un ADMIN | ✅ | ✅ |
| Bloquer un SUPERADMIN | ❌ | ❌ |
| Se bloquer soi-même | ❌ | ❌ |
| Modifier le rôle d'un USER | ❌ | ✅ |
| Modifier le rôle d'un ADMIN | ❌ | ✅ |

L'API refuse en 403 si ces règles ne sont pas respectées, même si le frontend masque les boutons.

### 4.2 Créer un compte

Modal "Créer un compte" via un bouton en haut de la liste.

- Champs : Nom, Email, Mot de passe, Rôle (`USER` ou `ADMIN` pour un ADMIN ; + `SUPERADMIN` pour le SUPERADMIN).
- Validation : email valide, mot de passe ≥ 8 caractères, tous les champs requis.
- Appel : `POST /api/users/` → `{ name, email, password, role }`.
- **Ajustement API** : accepter le champ `role` en entrée (actuellement forcé `USER`).
- Après création : fermer la modal, rafraîchir la liste, toast de succès.
- Erreur email déjà utilisé → message inline dans le formulaire.

### 4.3 Modifier le rôle (SUPERADMIN uniquement)

- Selector de rôle dans la ligne du tableau, visible uniquement pour le SUPERADMIN.
- Appel : `PATCH /api/users/:id/role` → `{ role }`.
- Nouvelle route API protégée par `requireSuperAdmin`.

---

## 5. MFA (TOTP)

### 5.1 Activer le MFA

1. Bouton **"Activer le MFA"** dans le profil (affiché si `totpEnabled === false`).
2. Appel `POST /api/2fa/setup` → retourne `{ secret, qr }`.
3. Modal avec QR code à scanner, code secret en clair (fallback), champ code à 6 chiffres.
4. Appel `POST /api/2fa/verify` → `{ totp }`.
5. Succès : fermer la modal, profil mis à jour "MFA activé".
6. Erreur : "Code invalide, réessayez." (ne ferme pas la modal).

### 5.2 Désactiver le MFA

1. Bouton **"Désactiver le MFA"** (affiché si `totpEnabled === true`).
2. Modal de confirmation avec champ TOTP.
3. Appel `POST /api/2fa/disable` → `{ totp }`.
4. **Ajustement API** : vérifier le code TOTP avant de désactiver.
5. Succès : fermer la modal, profil mis à jour "MFA désactivé".

### 5.3 Connexion avec MFA

Déjà fonctionnel (API + `LoginPage`). Aucun changement.

---

## 6. Connexion — vérification du blocage

**Ajustement API** : au `POST /api/auth/login`, vérifier `isBlocked` après validation du mot de passe. Si `true`, retourner `403` avec `"Votre compte a été suspendu. Contactez un administrateur."`.

Côté frontend : `LoginPage` affiche déjà les erreurs → aucun changement nécessaire.

---

## 7. Architecture frontend

### État actuel (déjà en place)
- React Router v6 avec routes `/login`, `/documents`, `/documents/:id`
- Guards `PrivateRoute` / `PublicRoute` dans `App.jsx`
- `AuthContext` : expose `token`, `login()`, `logout()`
- `LoginPage` : login + 2FA flow complet
- `DocumentsPage` : navigateur fichiers/dossiers
- `DocumentPage` : éditeur temps réel + WebRTC

### Ce qui reste à construire

**Enrichissement de `AuthContext`**
- Ajouter `user` (id, name, email, role, totpEnabled) dans le context
- Alimenté par `GET /api/users/me` au login et à la reconnexion (token présent dans localStorage)
- Exposer `setUser` pour les mises à jour profil

**Nouvelles routes dans `App.jsx`**
```
/profile          → ProfilePage  (PrivateRoute)
/admin            → AdminPage    (PrivateRoute + guard role ADMIN/SUPERADMIN)
```

**Nouveau composant : `Header`**
- Présent dans `DocumentsPage` et `ProfilePage`
- Affiche le nom de l'utilisateur → lien `/profile`
- Onglet "Administration" → `/admin` (visible ADMIN/SUPERADMIN uniquement)
- Bouton Déconnexion

**Nouveaux composants à créer**

| Composant | Page | Description |
|---|---|---|
| `Header` | Global | Nav avec lien profil, onglet admin, déconnexion |
| `ProfilePage` | `/profile` | Conteneur de la page profil |
| `EditNameForm` | Profile | Formulaire modification nom |
| `ChangePasswordForm` | Profile | Formulaire changement mdp avec vérif ancien |
| `MfaSection` | Profile | Toggle MFA + modals setup et désactivation |
| `AdminPage` | `/admin` | Page administration |
| `UsersTable` | Admin | Tableau des utilisateurs avec actions contextuelles |
| `CreateUserModal` | Admin | Modal création de compte |
| `RoleSelector` | Admin | Selector rôle (SUPERADMIN uniquement) |

### State management
- React Context (`AuthContext`) pour `user` et `token` — pas de Redux.
- Le JWT est décodé côté client pour récupérer `role` sans appel supplémentaire (ou `GET /api/users/me` au démarrage).
- Rafraîchir `user` dans le context après chaque modification profil.

---

## 8. Récapitulatif des ajustements API

| Route | Type | Changement |
|---|---|---|
| Prisma schema | Modif | Ajouter `SUPERADMIN` à l'enum `Role` |
| `POST /api/auth/login` | Modif | Vérifier `isBlocked`, retourner 403 si bloqué |
| `PATCH /api/users/me` | Modif | Exiger `currentPassword`, vérifier avec bcrypt avant màj |
| `POST /api/users/` | Modif | Accepter le champ `role` en entrée |
| `PATCH /api/users/:id/block` | Modif | Vérifier hiérarchie (pas de blocage SUPERADMIN, pas d'auto-blocage) |
| `POST /api/2fa/disable` | Modif | Exiger le code TOTP et le vérifier avant désactivation |
| `PATCH /api/users/:id/role` | Nouveau | Route SUPERADMIN uniquement pour modifier le rôle |

---

## 9. Ordre d'implémentation

### Étape 1 — API
1. Schema Prisma : ajout `SUPERADMIN`, migration, seed mis à jour
2. `POST /api/auth/login` : vérif `isBlocked`
3. `PATCH /api/users/me` : vérif `currentPassword`
4. `POST /api/users/` : accepter `role`
5. `PATCH /api/users/:id/block` : vérif hiérarchie
6. `POST /api/2fa/disable` : vérif TOTP
7. `PATCH /api/users/:id/role` : nouvelle route

### Étape 2 — Frontend
1. Enrichir `AuthContext` avec `user` + `GET /api/users/me`
2. `Header` + nouvelles routes dans `App.jsx`
3. `ProfilePage` (EditNameForm, ChangePasswordForm, MfaSection)
4. `AdminPage` (UsersTable, CreateUserModal, RoleSelector)

---

## 10. Hors périmètre

- Mot de passe oublié / reset par email
- Gestion des permissions sur les documents
- Upload d'avatar
- Journalisation des actions admin
