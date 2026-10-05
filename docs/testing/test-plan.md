# Plan de tests — Resource Manager

Statut : **Étape 0 (analyse) — en attente de validation.** Aucun test n'a encore été écrit.

Référence métier : `.cursor/rules/resource-manager.mdc`.
Périmètre : `apps/api` (NestJS), `apps/admin` (Next.js), `apps/mobile` (Expo). `apps/web` n'existe pas.

---

## 1. Ligne de base (29/09/2026)

| Application | Commande | Fichiers | Tests | Résultat |
|---|---|---|---|---|
| api | `pnpm --filter api test` | 12 | 89 | 88 verts, 1 en échec sous charge |
| admin | `pnpm --filter admin test` | 12 | 57 | verts (≈ 18 s) |
| mobile | `pnpm --filter mobile test` | 14 | 120 | verts (≈ 10 s) |

- `pnpm test` (Turbo) échoue aujourd'hui : `auth.controller.spec.ts > returns profile via me()` dépasse le timeout de 5 s quand les trois suites tournent en parallèle (import API ≈ 106 s). Lancé seul, il passe en 1,7 s. C'est un test instable à stabiliser à l'étape 4 (timeout ou import allégé), pas un bug fonctionnel.
- Turbo annule admin et mobile dès que l'API échoue : la ligne de base globale est donc rouge tant que ce timeout n'est pas traité.
- `test:e2e` (API) n'est pas appelé par `pnpm test`. Seul `test/app.e2e-spec.ts` existe (smoke `GET /api/v1`).
- Couverture : `@vitest/coverage-v8` n'est installé que dans l'API (`test:cov`). Admin (Vitest 4.1) et mobile (Vitest 5.0) n'ont ni provider ni script.
- Pas de `.github/workflows`, pas de `docker-compose`.

---

## 2. Règles et matrice de traçabilité

Règles complémentaires trouvées dans le code (absentes de la spécification, à conserver) :

- **R-RES-12** Début de réservation refusé s'il est antérieur de plus d'une minute (`assertValidRange`).
- **R-RES-13** Prolongation : uniquement PENDING/APPROVED, pas terminée, nouvelle fin > fin actuelle, au plus 24 h, conflit vérifié sur la seule période ajoutée, entreprise active et ressource AVAILABLE.
- **R-RES-14** Motif de rejet d'au moins 3 caractères (API et admin), 500 au maximum (admin).
- **R-RES-15** Une ressource ayant des réservations n'est pas supprimée : elle passe OUT_OF_SERVICE (`vehicles/rooms.service.remove`).
- **R-AUTH-01** Compte INACTIVE : login et refresh refusés.

Légende : ✅ couvert, ◐ partiel, ❌ non couvert.

| Règle | Implémentation | Specs existantes | État | Trou |
|---|---|---|---|---|
| R-ORG-01 Direction optionnelle | `access-scope.service.ts` (`directionScopeWhere`, `canApproveReservation`), `users.service.ts` (`assertDirectionBelongsToCompany`), admin `direction-field.tsx`, `rbac.organizationContext` | `access-scope` (manager/employee sans direction), `auth.service` (user sans direction), `organizational-scope`, `users.service` (employé sans direction) | ◐ | Manager C sur réservations (liste, détail, approbation), création d'un utilisateur sans direction, UI `DirectionField` |
| R-ORG-02 Isolation entreprises | `AccessScopeService.assertCanAccessCompany` / `resolveCompanyFilter` dans chaque service | `access-scope` (companyWhere), `reservations` (véhicule d'une autre entreprise), `users` (employé autre entreprise) | ◐ | `findById` companies/directions/vehicles/rooms/users avec l'ID d'une autre entreprise, filtres `companyId` forcés |
| R-ORG-03 COMPANY_ADMIN / GROUP_ADMIN | `canManageCompany`, `@Roles` des contrôleurs | `access-scope`, `users` | ◐ | Services companies, directions, vehicles, rooms, group sans spec |
| R-ORG-04 Manager limité à sa direction | `directionScopeWhere`, `canApproveReservation`, `assertCanViewReservation`, `users.buildListWhere`, `users.assertCanViewUser` | `access-scope` (manager sans direction uniquement) | ◐ | **Aucun test d'un manager AVEC direction face à une autre direction**. Écarts E1 et E2 |
| R-SEC-01 API seule barrière | `JwtAuthGuard`, `RolesGuard`, services | `roles.guard`, `auth.controller`, admin `rbac`, `navigation` | ◐ | Aucun test HTTP des guards sur les vrais contrôleurs |
| R-RES-01 Ressource d'une autre entreprise | `create*Reservation` → `assertCanAccessCompany` | `reservations` (véhicule) | ◐ | Salle, `availability`, GROUP_ADMIN (écart E4) |
| R-RES-02 startAt < endAt | `assertValidRange` | aucun explicite | ❌ | create, update, calendar |
| R-RES-03 Chevauchement | `findConflicts` (`startAt < end` et `endAt > start`) | `reservations` (chevauchement APPROVED) | ◐ | Bornes adjacentes (fin = début, autorisé), inclusion, `update` avec `excludeId` |
| R-RES-04 Statuts bloquants | `BLOCKING_STATUSES = [PENDING, APPROVED]` | `reservations` (CANCELLED/REJECTED ignorés) | ◐ | PENDING bloquant, COMPLETED non bloquant, `availability` |
| R-RES-05 Passagers ≤ places | `createVehicleReservation`, `update` | `reservations` (create) | ◐ | Égalité (= places), `update` |
| R-RES-06 Participants ≤ capacité | `createRoomReservation`, `update` | `reservations` (create) | ◐ | Égalité, `update` |
| R-RES-07 MAINTENANCE / OUT_OF_SERVICE | `assertResourceAvailable` | `reservations` (véhicule MAINTENANCE), `extend` | ◐ | OUT_OF_SERVICE, salle. Écart E7 pour `approve` et `update` |
| R-RES-08 Entreprise INACTIVE | `assertCompanyActive` (création, prolongation), `users.create` | `reservations` (création) | ◐ | Historique consultable (`list`/`findById` sans filtre de statut), salle |
| R-RES-09 Rejet avec motif | DTO `RejectReservationDto` + `reject()` (≥ 3), admin `reject-schema` | `reservations` (motif présent dans la notification) | ◐ | Motif vide ou blanc, UI du dialog |
| R-RES-10 Pas de suppression physique | Aucun `DELETE /reservations`, `cancel` → `CANCELLED` | aucun | ❌ | Vérifier que `cancel` n'appelle pas `delete`, contrôleur sans route DELETE |
| R-RES-11 Transitions | `transitionStatus` : approve/reject depuis PENDING, cancel depuis PENDING/APPROVED, `update` PENDING uniquement, extend PENDING/APPROVED | `reservations` (concurrence approve, extend) | ◐ | Matrice complète statut × action. Écart E6 (COMPLETED jamais produit) |
| R-NOT-01 Destinataires | `notifyReservationCreated`, `findCompanyApproverIds`, `notifications.service` (listForUser/markRead) | `reservations` (notifications), `notifications.service`, `push-tokens` | ◐ | `markRead` d'autrui (403), destinataires hors direction (écart E3) |
| R-AUD-01 Audit | `audit.log` dans chaque service, `AuditService.scopeWhere`, `sanitize` | `audit.service` (scope) | ◐ | Audit émis par companies, directions, vehicles, rooms, users.create, group, et `sanitize` (mot de passe jamais persisté) |
| R-DSH-01 Dashboard filtré | `dashboard.service.ts` (`reservationListWhere`, `resolveResourceCompanyId`) | admin `dashboard.spec` (affichage uniquement) | ❌ | Service API sans spec. Écart E10 |
| R-RES-12 à 15, R-AUTH-01 | voir ci-dessus | `extend` (R-RES-13), `auth.service` (R-AUTH-01) | ◐ | R-RES-12, R-RES-14 vide, R-RES-15 |

---

## 3. Matrice rôle × endpoint (déduite du code)

Acteurs du seed :

- **GA** : group.admin, Appatam, sans direction
- **CA-A** : company.admin, Appatam
- **MGR-T** : manager.tech, Appatam, direction TECH
- **MGR-C** : manager.company, Entreprise C, sans direction
- **EMP-A** : employee, Appatam, TECH
- **EMP-B** : employee.b, Entreprise B, DG

Légende :

- **✔** autorisé
- **F** filtré sur le périmètre
- **Soi** uniquement ses propres données
- **403** refusé par le service
- **403g** refusé par `RolesGuard`
- **Ent** sa propre entreprise uniquement (403 sinon)

| Endpoint | GA | CA-A | MGR-T | MGR-C | EMP-A / EMP-B |
|---|---|---|---|---|---|
| GET /group, /group/:id | ✔ | ✔ | ✔ | ✔ | ✔ |
| PATCH /group/:id | ✔ | 403g | 403g | 403g | 403g |
| GET /companies | ✔ (tout) | F | F | F | F |
| POST /companies | ✔ | 403g | 403g | 403g | 403g |
| GET /companies/:id | ✔ | Ent | Ent | Ent | Ent |
| PATCH /companies/:id, /status | ✔ | Ent (**y compris désactiver la sienne**, E8) | 403 | 403 | 403 |
| GET /directions | ✔ (+ filtre) | F | F | F (liste vide) | F |
| POST, PATCH, /status /directions | ✔ | Ent | 403 | 403 | 403 |
| GET /directions/:id | ✔ | Ent | Ent | Ent | Ent |
| GET /users | ✔ | F | TECH + sans direction + soi (**fuites E1/E2**) | F entreprise | Soi |
| GET /users/:id | ✔ | Ent | Ent, sauf autre direction | Ent | Soi |
| POST, PATCH, /status /users | ✔ | Ent, jamais un GA ; pas son propre rôle ni son propre statut | 403g | 403g | 403g |
| GET /vehicles, /rooms (+ :id) | ✔ | F / Ent | F / Ent | F / Ent | F / Ent |
| POST, PATCH, /status, DELETE /vehicles et /rooms | ✔ | Ent | 403g | 403g | 403g |
| GET /reservations | ✔ (+ filtres) | F entreprise | F TECH + ses réservations | F entreprise | Soi |
| GET /reservations/availability | ✔ (**toute entreprise**, E4) | Ent | Ent | Ent | Ent |
| POST /reservations | ✔ (**toute entreprise**, E4) | Ent | Ent | Ent | Ent |
| GET /reservations/:id | ✔ | Ent | TECH ou les siennes | Ent | Soi |
| PATCH /reservations/:id (PENDING) | ✔ | Ent | TECH ou soi | Ent | Soi |
| POST approve / reject | ✔ | Ent | TECH ou **soi (E5)** | Ent | 403g |
| POST extend / cancel | ✔ | Ent | TECH ou soi | Ent | Soi |
| GET /calendar | ✔ | F | F | F | Soi |
| GET /dashboard/* | tout | entreprise | réservations TECH, ressources de l'entreprise | entreprise | réservations soi, ressources de l'entreprise |
| GET, PATCH /notifications/* | Soi | Soi | Soi | Soi | Soi |
| GET /audit | tout | actions des non-GA de son entreprise | 403g | 403g | 403g |

---

## 4. Matrice écran → composants → comportements testables

### Admin (`apps/admin`)

| Écran | Composants | Comportements testables |
|---|---|---|
| `/login` | `features/auth` + `login-schema` (déjà testé) | Erreur d'identifiants, compte inactif, redirection |
| Layout `(app)` | `app/(app)/layout.tsx`, `rbac.canAccessRoute`, `sidebar`, `navigation` | Redirection `/403` par rôle (**UX uniquement**, R-SEC-01), menu par rôle (déjà testé) |
| `/dashboard` | `dashboard-today`, `dashboard-resources`, `lib/dashboard` | États chargement/vide/erreur, lien ressources masqué pour EMPLOYEE |
| `/users/new`, `/users/[id]` | `user-form`, `direction-field`, `company-field`, `role-selector`, `user-roles` | Direction masquée avec message si l'entreprise n'en a pas (R-ORG-01), « Aucune direction » sélectionnable, CA ne voit pas GROUP_ADMIN |
| `/companies/*` | `company-form`, `companies-table`, `company-directions-panel`, `use-company-status-toggle` | Validation, entreprise sans direction affichée comme normale |
| `/directions/*` | `direction-form`, `direction-members-panel` | Validation, entreprise obligatoire |
| `/vehicles/*`, `/rooms/*` | `vehicle-form`, `room-form`, `resource-status-panel`, tables et filtres | Places/capacité > 0, statut non modifiable si `canManage=false` (MANAGER) |
| `/reservations`, `/reservations/[id]` | `reservations-table`, `reject-reservation-dialog`, `reservation-detail-sections`, `reservation-permissions` | Motif obligatoire (≥ 3), boutons Approuver/Refuser selon `canApproveOrReject` |
| `/calendar` | `calendar-view` | États, filtres |
| `/notifications` | `notification-list` | Vide, lu/non lu |
| `/audit` | `audit-table`, `audit-filters`, `audit-detail-sheet` | Affichage des métadonnées |

### Mobile (`apps/mobile`)

| Écran | Composants | Comportements testables |
|---|---|---|
| `(auth)/login` | `login-schema` (déjà testé) | Erreurs |
| `(app)/index` Accueil | `home-hero-card`, `home-quick-actions`, `home-activity`, `home-states`, `lib/home` | Chargement/vide/erreur, prochaine réservation |
| `reservations/index` | `reservation-card`, `reservation-filters`, `reservation-list-states`, `next-reservation-card` | Filtres par statut, états |
| `reservations/new` | `vehicle-reservation-form`, `room-reservation-form`, `resource-selector`, `time-picker-sheet`, `use-slot-availability`, `reservation-schemas` | Dates invalides, passagers > places, participants > capacité, erreurs 409/400 mappées (`reservation-errors`) |
| `reservations/[id]` | `reservation-actions`, `extend-reservation-sheet`, `reservation-time-card`, `lib/reservation-detail` | Annuler/prolonger selon statut et acteur, conflit de prolongation |
| `calendar` | `calendar-agenda`, `calendar-date-strip`, `calendar-filter-sheet`, `calendar-states` | États, filtres |
| `profile` | `profile-section`, `profile-activity`, `profile-display` | Utilisateur sans direction (R-ORG-01) |
| `notifications` | `notification-routing`, `notifications` (lib) | Navigation vers la réservation |
| `vehicles`, `rooms` | listes et détail | Statut non réservable affiché |

---

## 5. Écarts code ↔ spécification (non corrigés)

**Confirmés** (fuites de périmètre ou incohérences) :

- **E1 — R-ORG-04** : `users.service.buildListWhere` applique `query.directionId` sans contrôle pour un MANAGER. MGR-T peut lister les utilisateurs de la Direction Commerciale avec `GET /users?directionId=<COM>`.
- **E2 — R-ORG-04** : dans le même objet `where`, la clé `OR` de la recherche (`search`) écrase la clé `OR` de restriction manager. MGR-T voit tous les utilisateurs de son entreprise dès qu'il fait une recherche.
- **E3 — R-NOT-01** : `findCompanyApproverIds` notifie tous les MANAGER de l'entreprise (création, annulation, prolongation), y compris ceux d'autres directions. Ils reçoivent le libellé de la ressource puis un 403 en ouvrant la réservation.
- **E6 — R-RES-11** : aucun code ne produit le statut `COMPLETED`. Le calendrier l'affiche, mais une réservation passée reste APPROVED.
- **E10 — R-DSH-01** : `dashboard.getResources` calcule `counts` sur une liste tronquée à 100 éléments. Les compteurs sont faux au-delà.

**Ambigus** (décision métier nécessaire) :

- **E4 — R-RES-01** : un GROUP_ADMIN peut réserver une ressource de n'importe quelle entreprise (`canAccessCompany` renvoie `true`). Est-ce un partage inter-entreprises implicite ?
- **E5** : un MANAGER avec direction peut approuver sa propre réservation (`reservation.userId === user.id`).
- **E7 — R-RES-07 / R-RES-08** : `approve` et `update` ne revérifient ni le statut de la ressource ni celui de l'entreprise. Une demande PENDING sur un véhicule passé en MAINTENANCE reste approuvable.
- **E8** : un COMPANY_ADMIN peut désactiver sa propre entreprise (`PATCH /companies/:id/status`).
- **E9** : l'API accepte le rattachement d'un utilisateur à une direction INACTIVE. L'admin ne propose que les directions actives.

**Mineurs ou UX** :

- **E11** : l'admin `canCancelReservation` affiche « Annuler » à un COMPANY_ADMIN pour toute entreprise, et le masque à un MANAGER approbateur que l'API autoriserait. L'API reste correcte : c'est une divergence d'UX.
- **E12** : `GET /group` est lisible par tous les rôles (nom et nombre d'entreprises uniquement).

**Infrastructure** :

- **E13** : `prisma/seed.ts` commence par `deleteMany` sur toutes les tables. Il ne doit jamais être lancé sur la base de développement pour des tests.
- **E14** : pas de CI (`.github/workflows`) ni de `docker-compose`, alors que la spécification les prévoit.
- **E15** : le seed ne contient ni utilisateur de la Direction Commerciale (indispensable pour tester R-ORG-04), ni employé de l'Entreprise C, ni entreprise inactive, ni réservation REJECTED/CANCELLED.

---

## 6. Plan par couche

### Fixtures partagées

- `apps/api/test/fixtures/organization.ts` : groupe, entreprises A/B/C, directions TECH/COM/DG, les 6 utilisateurs du seed en `AuthenticatedUser` avec des IDs stables (`company-app`, `dir-tech`…). Proposition d'extension, réservée aux fixtures (seed inchangé) : `managerCom` (A, COM), `employeeCom` (A, COM), `employeeC` (C, sans direction), `companyInactive`.
- `apps/api/test/fixtures/resources.ts` : véhicules AA-123-BB (5 places, AVAILABLE), AA-456-CC (9, MAINTENANCE), CC-789-DD (C) ; salles Atlas (A, 12) et Horizon (B, 8) ; réservations PENDING/APPROVED du seed, plus REJECTED/CANCELLED/COMPLETED.
- `apps/api/test/fixtures/prisma-mock.ts` : fabrique de mock Prisma typée, dans le style de `reservations.service.spec.ts`.
- `apps/admin/test/fixtures/auth-users.ts` et `apps/mobile/src/test/fixtures/auth-users.ts` : mêmes acteurs en `AuthUser` (`@resource-manager/types`).

### Couche 1 — Unitaires métier (Vitest, Prisma mocké)

| Fichier (nouveau, sauf mention) | Positifs | Négatifs |
|---|---|---|
| `companies/companies.service.spec.ts` | GA liste tout ; CA et EMP limités à leur entreprise ; GA crée → audit CREATE ; CA modifie la sienne → audit UPDATE ; statut → audit STATUS_CHANGE (from/to) | CA : autre entreprise en `findById`/`update`/`status` → 403 ; MGR/EMP `update` → 403 ; groupe inconnu → 400 ; 404 |
| `directions/directions.service.spec.ts` | CA crée dans son entreprise ; liste de l'entreprise C vide sans erreur (R-ORG-01) ; audit | CA filtre `companyId` B → 403 ; MGR crée → 403 ; `findById` d'une direction de B par EMP-A → 403 |
| `vehicles/vehicles.service.spec.ts` | CA crée ; `remove` sans réservation → delete + audit DELETE ; avec réservations → OUT_OF_SERVICE + audit STATUS_CHANGE (R-RES-15) | CA crée pour B → 403 ; immatriculation dupliquée → 409 ; `findById` autre entreprise → 403 |
| `rooms/rooms.service.spec.ts` | Symétrique véhicules | Symétrique |
| `group/group.service.spec.ts` | `getCurrent`, `update` → audit UPDATE | Groupe introuvable → 404 |
| `dashboard/dashboard.service.spec.ts` | `where` par rôle (GA global, CA entreprise, MGR-T TECH, MGR-C entreprise, EMP soi) ; ressources par entreprise | Aucun comptage hors périmètre ; E10 documenté |
| `reservations/reservations.service.spec.ts` (**ajout de `it`**) | Bornes adjacentes autorisées ; égalité passagers = places et participants = capacité ; `update` avec `excludeId` ; manager C approuve ; MGR-T approuve TECH | startAt ≥ endAt → 400 ; début > 1 min dans le passé → 400 ; PENDING bloque ; salle d'une autre entreprise → 403 ; OUT_OF_SERVICE → 400 ; motif blanc → 400 ; MGR-T sur réservation COM (voir, approuver, annuler) → 403 ; matrice statut × action (approve/reject sur APPROVED/REJECTED/CANCELLED → 400) ; `cancel` n'appelle jamais `delete` |
| `common/authorization/access-scope.service.spec.ts` (**ajout**) | MGR-T : `directionScopeWhere` contient TECH et `userId` ; `canApproveReservation` TECH ✔ | MGR-T sur COM → `false` ; CA-A sur B → `false` |
| `users/users.service.spec.ts` (**ajout**) | CA crée un utilisateur sans direction dans C ; direction nulle acceptée | Direction de B pour une entreprise A → 400 ; entreprise inactive → 400 ; **E1 et E2 exposés** |
| `audit/audit.service.spec.ts` (**ajout**) | — | `sanitize` retire password/passwordHash/tokens |
| `notifications/notifications.service.spec.ts` (**ajout**) | `markRead` de sa notification | `markRead` d'autrui → 403 ; notification inconnue → 404 |

Estimation : environ 90 nouveaux tests API.

### Couche 2 — Composants UI

**Admin** (`@testing-library/react`, jsdom, déjà configuré). Mocks au niveau du module : hooks `features/*/hooks` et `lib/api`, jamais le composant testé.

- `features/users/components/direction-field.spec.tsx` : sans entreprise, chargement, entreprise sans direction (message, aucune erreur), entreprise avec directions (option « Aucune direction »).
- `features/users/components/user-form.spec.tsx` : soumission sans direction dans C ; CA ne voit pas GROUP_ADMIN dans `role-selector`.
- `features/reservations/components/reject-reservation-dialog.spec.tsx` : motif vide ou de 2 caractères → erreur, pas d'`onConfirm` ; motif valide → `onConfirm(motif)` ; reset à la fermeture.
- `features/reservations/components/reservations-table.spec.tsx` : actions visibles selon `canApproveOrReject` (UX).
- `features/vehicles/components/vehicle-form.spec.tsx`, `features/rooms/components/room-form.spec.tsx`, `features/companies/components/company-form.spec.tsx`, `features/directions/components/direction-form.spec.tsx` : champs requis, valeurs limites.
- `components/shared/resource-status-panel.spec.tsx` : désactivé si `canManage=false`.
- `lib/reservation-permissions.spec.ts` : fonctions pures, E11 documenté.
- `app/(app)/layout` : garde de route → redirection `/403` (UX uniquement).

**Mobile** : voir la décision D1 plus bas. Cibles une fois l'environnement choisi : `vehicle-reservation-form`, `room-reservation-form`, `reservation-actions`, `extend-reservation-sheet`, `home-states`, `calendar-states`, `reservation-list-states`, `profile-section` (sans direction).

### Couche 3 — Intégration API (HTTP)

- Nest `TestingModule` avec les vrais contrôleurs, `JwtAuthGuard`, `RolesGuard` et `ValidationPipe` (comme dans `main.ts`), JWT signés par acteur avec un secret de test, et supertest (déjà installé).
- Fichiers dans `apps/api/test/*.e2e-spec.ts`, lancés par `pnpm --filter api test:e2e` : `auth`, `companies`, `directions`, `users`, `vehicles`, `rooms`, `reservations`, `calendar-dashboard`, `notifications-audit`.
- Pour chaque endpoint sensible :
  - un cas autorisé ;
  - un 403 hors entreprise (EMP-B ou CA-A sur B) ;
  - un 403 hors direction (MGR-T sur COM) ;
  - un cas MGR-C sans direction ;
  - un 401 sans token ;
  - un 400 de validation DTO.
- Effets de bord vérifiés : ligne `AuditLog` (action, entité, auteur) et `Notification` pour les bons destinataires.
- Choix de la base : décision D2.

### Couche 4 — Régression

- Les 266 tests existants restent verts. Aucune spec existante n'est modifiée, sauf le timeout instable d'`auth.controller.spec.ts`, avec justification.
- `pnpm test`, `pnpm typecheck` et `pnpm lint` doivent passer à la fin de chaque étape.
- Couverture v8 : ajout de `@vitest/coverage-v8` à la version de Vitest de chaque application (admin 4.1, mobile 5.0) et d'un script `test:cov`. Seuils recommandés non bloquants : API services ≥ 80 % lignes, admin `lib/` et `features/*/lib` ≥ 80 %, composants ≥ 60 %.

### Couche 5 — E2E (proposition uniquement, rien installé)

Rédigée après validation des couches 1 à 3 : Playwright pour l'admin (5 à 8 parcours sur les comptes du seed), comparaison Maestro/Detox pour Expo, base dédiée et workflow GitHub Actions à créer (E14).

### Temps réel (WebSocket) — ajouté le 30/09/2026

Voir `docs/api/realtime.md`.

| Couche | Fichier | Couverture |
|---|---|---|
| 1 | `realtime/realtime-rooms.spec.ts` | Rooms par rôle ; propriété : audience WebSocket ≡ `canViewReservation` pour chaque acteur des fixtures |
| 1 | `realtime/realtime-auth.service.spec.ts` | Jeton valide, absent, invalide, expiré ; utilisateur supprimé ou inactif ; `userId` client ignoré |
| 1 | `realtime/realtime.gateway.spec.ts` | `UNAUTHORIZED`, `TOO_MANY_CONNECTIONS`, entrée dans les rooms, expiration du jeton, déconnexion |
| 1 | `realtime/realtime.service.spec.ts` | Enveloppe, audiences, absence de données sensibles, erreur de transport absorbée |
| 2 | `reservations`, `vehicles`, `rooms`, `users`, `notifications` `*.service.spec.ts` | Publication après succès uniquement ; rien sur refus, conflit ou erreur en base ; verrou pris avant le contrôle de conflit |
| 4 | `test/realtime.e2e-spec.ts` | Application Nest réelle et clients Socket.IO : scopes multi-rôles, réservations concurrentes (un 201 et un 409), annulation, reconnexion et resynchronisation REST, désactivation. Prisma est remplacé par un faux en mémoire (`test/support/in-memory-prisma.ts`) qui émule le verrou consultatif. |

Le verrou `pg_advisory_xact_lock` doit encore être validé sur un vrai PostgreSQL (couche 3, D2).

---

## 7. Décisions

Validées le 29/09/2026 :

- **D1 → a** : mobile sous Vitest, tests de la logique extraite (hooks, `lib`, états), sans rendu React Native. Aucune dépendance ajoutée.
- **D2 → PostgreSQL de test** via `DATABASE_URL_TEST` (jamais la base de développement).
- **D3 → `it.fails`** référencé par écart (`[E1]`…), suite verte, code applicatif inchangé.
- **D4 → `it.todo`** pour E4, E5, E7, E8 et E9 en attendant la décision métier.
- **D5 → oui** : fixtures étendues (`managerCom`, `employeeCom`, `employeeC`, `companyInactive`), `seed.ts` inchangé.

Options étudiées :

- **D1 — Composants mobile.** Vitest y tourne en environnement `node` et n'inclut que `*.spec.ts`. `@testing-library/react-native` exige un runtime React Native (preset Jest) ; sous Vitest, il faut un alias `react-native` → `react-native-web` + jsdom, fragile avec les modules Expo. Options :
  - a) tester sous Vitest la logique extraite (hooks et `lib`) et les états via des fonctions pures, sans rendu RN ;
  - b) ajouter `jest-expo` uniquement pour les `*.test.tsx` mobile ;
  - c) tenter l'alias `react-native-web` sous Vitest.
- **D2 — Base de la couche 3.** Le périmètre est implémenté en clauses `where` Prisma : un mock ne vérifie que leur forme, pas leur effet réel. Recommandation : PostgreSQL de test dédié (`DATABASE_URL_TEST`, schéma `test`, `prisma migrate deploy`, puis seed et fixtures étendues). Cela suppose un Postgres local ou Docker disponible. Sinon : Prisma mocké avec assertions sur les `where`.
- **D3 — Écarts confirmés (E1, E2, E3, E6, E10).** Le code applicatif n'est pas corrigé. Proposition : les écrire avec `it.fails('[R-ORG-04][E1] …')` pour que la suite reste verte et que le test casse le jour où le bug est corrigé (on le passe alors en `it`).
- **D4 — Écarts ambigus (E4, E5, E7, E8, E9).** Décision métier attendue. En attendant, tests `it.todo` documentant le comportement actuel.
- **D5 — Extension des fixtures** (`managerCom`, `employeeCom`, `employeeC`, `companyInactive`) dans les fixtures de test uniquement, seed inchangé.
