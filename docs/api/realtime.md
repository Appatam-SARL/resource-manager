# Temps réel (WebSocket / Socket.IO)

Resource Manager diffuse en temps réel les changements concernant les réservations, la disponibilité des ressources et les notifications, à destination des applications Admin et Mobile.

## Principes

| Couche | Rôle |
|---|---|
| REST (`/api/v1`) | Seule couche de **commande** (création, approbation, annulation…). Toutes les validations, permissions et règles métier y restent. |
| WebSocket (`/realtime`) | Couche de **diffusion** uniquement. Aucun événement client → serveur n'est accepté. |
| PostgreSQL | **Source de vérité.** Un événement WebSocket signale qu'il faut rafraîchir. Il ne remplace jamais une lecture REST. |

- Un événement n'est émis **qu'après** l'écriture réussie en base (après le commit et l'audit). Une commande refusée (403, 400, 409) ou en échec n'émet rien.
- La publication ne fait jamais échouer la requête REST : une erreur de transport est seulement journalisée.
- WebSocket n'est **pas** un mécanisme de verrouillage. La prévention des doubles réservations repose sur une transaction PostgreSQL et un verrou consultatif (`pg_advisory_xact_lock`) par ressource, qui encadrent le contrôle de conflit et l'écriture (création, modification, prolongation).

## Connexion

- URL : même hôte et même port que l'API, namespace `/realtime`, chemin Socket.IO par défaut `/socket.io`.
- Authentification : le **jeton d'accès JWT** existant (le même que pour REST), transmis dans `auth.token`.
  - L'en-tête `Authorization: Bearer <jwt>` est aussi accepté pour les clients non navigateurs.
  - Les paramètres de requête (`?userId=…`) sont ignorés : l'identité vient exclusivement du jeton vérifié.
- À la connexion, le serveur vérifie la signature et l'expiration du jeton, puis recharge l'utilisateur en base. Un compte supprimé ou inactif est refusé.

```ts
import { io } from 'socket.io-client';

const socket = io(`${API_ORIGIN}/realtime`, {
  transports: ['websocket'],
  // Fonction : relue à chaque tentative de reconnexion, donc toujours avec le jeton courant.
  auth: (cb) => cb({ token: getAccessToken() }),
});
```

## Erreurs de connexion

Les refus sont transmis via `connect_error`. `error.data` a la forme `{ code, message }`, sans trace ni détail interne.

| `code` | Cause | Action client |
|---|---|---|
| `UNAUTHORIZED` | Jeton absent, invalide ou expiré ; utilisateur supprimé ou inactif | Rafraîchir le jeton via `POST /auth/refresh`, puis se reconnecter. Si l'échec persiste, déconnecter l'utilisateur. |
| `TOO_MANY_CONNECTIONS` | Plus de 5 connexions simultanées pour ce compte | Fermer les onglets ou appareils inutilisés. |

Le serveur ferme aussi la socket (raison `io server disconnect`) :

- à l'**expiration du jeton d'accès** : le client doit se reconnecter avec un jeton rafraîchi ;
- lorsqu'un administrateur **désactive** le compte ;
- lorsqu'il modifie son **rôle**, sa **direction**, son **e-mail** ou son **mot de passe** : les rooms sont recalculées à la reconnexion.

Après `io server disconnect`, Socket.IO ne se reconnecte pas automatiquement : appeler `socket.connect()` après avoir rafraîchi le jeton.

## Rooms (calculées côté serveur)

Le client ne choisit aucune room. Elles sont dérivées de l'utilisateur rechargé en base, selon la hiérarchie Groupe → Entreprise → Direction (optionnelle).

| Room | Membres |
|---|---|
| `user:{userId}` | L'utilisateur lui-même (ses notifications et ses réservations) |
| `company:{companyId}` | Tous les membres de l'entreprise (ressources, disponibilité) |
| `company:{companyId}:reservations` | `COMPANY_ADMIN` ; `MANAGER` **sans** direction (périmètre entreprise) |
| `direction:{directionId}:reservations` | `MANAGER` rattaché à cette direction |
| `group` | `GROUP_ADMIN` |

Une réservation n'est envoyée qu'aux rooms dont les membres peuvent la lire via `GET /reservations/:id`. La même règle, `AccessScopeService.canViewReservation`, est utilisée côté REST et côté WebSocket, et un test vérifie cette équivalence pour tous les rôles. Aucune donnée n'est diffusée à une autre entreprise.

## Événements

Enveloppe commune :

```json
{
  "eventId": "7d1c…-uuid",
  "type": "reservation.created",
  "timestamp": "2026-09-30T12:00:00.000Z",
  "data": { }
}
```

`eventId` permet d'ignorer un doublon. `timestamp` correspond à la date d'émission.

| Événement | Déclencheur (REST) | Destinataires |
|---|---|---|
| `reservation.created` | `POST /reservations` | Audience de la réservation |
| `reservation.updated` | `PATCH /reservations/:id` | Audience de la réservation |
| `reservation.approved` | `POST /reservations/:id/approve` | Audience de la réservation |
| `reservation.rejected` | `POST /reservations/:id/reject` | Audience de la réservation |
| `reservation.cancelled` | `POST /reservations/:id/cancel` | Audience de la réservation |
| `reservation.extended` | `POST /reservations/:id/extend` | Audience de la réservation |
| `resource.availability.changed` | Réservation créée, modifiée, rejetée, annulée ou prolongée ; changement de statut d'un véhicule ou d'une salle | `group` + `company:{id}` |
| `resource.created` / `resource.updated` / `resource.deleted` | CRUD véhicules et salles | `group` + `company:{id}` |
| `notification.created` | Toute notification persistée | `user:{destinataire}` uniquement |

L'**audience d'une réservation** comprend `group`, `company:{id}:reservations`, `user:{demandeur}` et, si la réservation a une direction, `direction:{id}:reservations`.

L'approbation n'émet pas `resource.availability.changed`, car une réservation `PENDING` bloque déjà le créneau.

### Payloads

Les payloads sont minimaux : uniquement des identifiants et le planning. Ils ne contiennent ni nom, ni e-mail, ni commentaire, ni motif de rejet, ni jeton. Les détails se lisent via REST.

```ts
// reservation.*
{ reservationId, companyId, directionId: string | null, userId,
  resourceType: 'VEHICLE' | 'ROOM', resourceId, status, startAt, endAt, updatedAt }

// resource.availability.changed — n'indique ni la réservation ni le demandeur
{ resourceType, resourceId, companyId,
  reason: 'RESERVATION_CHANGED' | 'STATUS_CHANGED',
  resourceStatus: 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | null, changedAt }

// resource.created / resource.updated
{ resourceType, resourceId, companyId, status, updatedAt }

// resource.deleted
{ resourceType, resourceId, companyId }

// notification.created
{ notificationId, type, title, body, entityType, entityId, createdAt }
```

Les types TypeScript de référence sont dans `apps/api/src/modules/realtime/realtime.types.ts`, et les noms d'événements dans `realtime.constants.ts`.

## Reconnexion et resynchronisation

Les événements émis pendant une coupure **ne sont pas rejoués**. Après chaque (re)connexion (événement `connect`), le client doit :

1. recharger via REST les données affichées : `GET /reservations`, `GET /calendar`, `GET /notifications/unread-count`, disponibilité, etc. ;
2. ensuite seulement, appliquer les événements reçus : invalider la requête TanStack Query correspondante plutôt que de modifier le cache à la main.

La même stratégie s'applique au retour au premier plan de l'application mobile.

## Clients

Le contrat (noms d'événements, payloads, `RealtimeMessage`) est partagé sous forme de types dans `@resource-manager/types`. Chaque application déclare sa table « événement → requêtes TanStack Query à invalider », vérifiée à la compilation : un événement manquant ou mal orthographié casse le typecheck.

| | Admin (`apps/admin`) | Mobile (`apps/mobile`) |
|---|---|---|
| Branchement | `useRealtimeSync` dans `app/(app)/layout.tsx` | `useRealtimeSync` dans `src/app/(app)/_layout.tsx` |
| URL | `NEXT_PUBLIC_API_URL` + `/realtime` | `getBaseUrl()` (`EXPO_PUBLIC_API_URL`) + `/realtime` |
| Jeton | `localStorage` (même jeton que REST) | `expo-secure-store` (même jeton que REST) |
| Jeton expiré ou refusé | `refreshSession()`, puis reconnexion (une seule tentative) | `refreshAccessToken()` (partagé avec l'intercepteur axios), puis reconnexion |
| Arrière-plan | — | Socket fermée en arrière-plan, rouverte au retour au premier plan |
| Notification reçue | Toast (sonner) avec lien « Voir » vers la réservation | Liste et compteur rafraîchis (la bannière reste gérée par le push) |

Les invalidations sont regroupées sur 150 ms, car une action produit plusieurs événements. À chaque reconnexion, toutes les requêtes actives sont rechargées via REST.

## Configuration

| Variable | Défaut | Description |
|---|---|---|
| `WS_ALLOWED_ORIGINS` | valeur de `CORS_ORIGIN` | Origines navigateur autorisées, séparées par des virgules. `*` est ignoré. En production, une valeur vide ou `*` **refuse** toute origine navigateur ; les applications mobiles natives n'envoient pas d'en-tête `Origin` et ne sont pas concernées. |
| `JWT_ACCESS_SECRET` | — | Secret existant, réutilisé pour vérifier les jetons. |

Limites intégrées :

- 5 connexions simultanées par utilisateur ;
- 16 Ko maximum par message entrant ;
- aucun gestionnaire d'événement client, donc aucune surface de spam applicatif.

Le rate limiting HTTP (`@nestjs/throttler`) continue de protéger les commandes REST.

## Déploiement multi-instance

La diffusion utilise l'adaptateur en mémoire de Socket.IO : il fonctionne avec **une seule instance** de l'API. Pour plusieurs instances, il faudra :

- ajouter Redis et l'adaptateur `@socket.io/redis-adapter`, branché dans `RealtimeIoAdapter.createIOServer` ;
- conserver les sessions persistantes (sticky sessions) au niveau de Nginx si le transport long-polling est autorisé.

Ce n'est pas nécessaire en V1 (instance unique). Redis n'a donc pas été ajouté.

## Nginx (production)

```nginx
location /socket.io/ {
  proxy_pass http://api:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 60s;
}
```

## Code

| Fichier | Rôle |
|---|---|
| `realtime.gateway.ts` | Handshake, application des limites, entrée dans les rooms, logs de connexion et déconnexion. Aucune logique métier. |
| `realtime-auth.service.ts` | Vérification du JWT et rechargement de l'utilisateur (`AuthService.me`). |
| `realtime.service.ts` | Service de diffusion appelé par les services métier après succès. |
| `realtime-rooms.ts` | Calcul des rooms et des audiences. |
| `realtime-payloads.ts` | Construction des payloads minimaux. |
| `realtime-io.adapter.ts` | CORS depuis l'environnement, taille maximale des messages. |

Tests : `apps/api/src/modules/realtime/*.spec.ts` (unitaires) et `apps/api/test/realtime.e2e-spec.ts` (multi-clients).
