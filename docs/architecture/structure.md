# Architecture — Structure du monorepo

Ce document décrit l’organisation cible du projet **resource-manager** : applications, packages partagés, données, infrastructure et documentation.

## Vue d’ensemble

Monorepo géré avec **pnpm workspaces** et **Turborepo**, composé de :

| Zone | Rôle |
|------|------|
| `apps/` | Applications déployables (web, admin, mobile, API) |
| `packages/` | Bibliothèques et configs partagées |
| `prisma/` | Schéma, migrations et seed de la base de données |
| `infrastructure/` | Docker, Nginx, monitoring, scripts de déploiement |
| `docs/` | Documentation technique et guides |
| `.github/workflows/` | CI / CD / base de données |

---

## Arborescence

```text
resource-manager/
│
├── apps/
│   │
│   ├── web/                         # Application Web utilisateurs
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── reservations/
│   │   │   ├── vehicles/
│   │   │   ├── rooms/
│   │   │   ├── calendar/
│   │   │   └── profile/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── ...
│   │
│   ├── admin/                       # Back-office administration
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── departments/
│   │   │   ├── vehicles/
│   │   │   ├── rooms/
│   │   │   ├── reservations/
│   │   │   ├── calendar/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── components/
│   │   ├── features/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── mobile/                      # Application mobile
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (tabs)/
│   │   │   ├── reservations/
│   │   │   ├── vehicles/
│   │   │   ├── rooms/
│   │   │   └── profile/
│   │   ├── components/
│   │   ├── features/
│   │   ├── services/
│   │   ├── stores/
│   │   └── ...
│   │
│   └── api/                         # Backend NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── departments/
│       │   │   ├── vehicles/
│       │   │   ├── rooms/
│       │   │   ├── reservations/
│       │   │   ├── notifications/
│       │   │   ├── dashboard/
│       │   │   └── audit/
│       │   │
│       │   ├── common/
│       │   ├── config/
│       │   ├── database/
│       │   ├── guards/
│       │   ├── interceptors/
│       │   ├── filters/
│       │   ├── decorators/
│       │   ├── health/
│       │   └── main.ts
│       │
│       └── test/
│
├── packages/
│   │
│   ├── ui/                          # Design system partagé
│   ├── types/                       # Types TypeScript partagés
│   ├── schemas/                     # Zod schemas
│   ├── api-client/                  # Client API partagé
│   ├── config/                      # Configurations communes
│   ├── constants/                   # Constants
│   ├── utils/                       # Utilitaires
│   └── eslint-config/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── infrastructure/
│   │
│   ├── docker/
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.admin
│   │   ├── Dockerfile.api
│   │   └── docker-compose.yml
│   │
│   ├── nginx/
│   │   └── nginx.conf
│   │
│   ├── monitoring/
│   │   ├── prometheus/
│   │   └── grafana/
│   │
│   ├── backup/
│   │   └── database-backup.sh
│   │
│   └── scripts/
│       ├── deploy.sh
│       ├── migrate.sh
│       └── rollback.sh
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   └── user-guide/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd.yml
│       └── database.yml
│
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Applications (`apps/`)

### `web` — Application utilisateurs

Interface web pour les collaborateurs : authentification, réservations, véhicules, salles, calendrier et profil.

| Dossier | Responsabilité |
|---------|----------------|
| `app/` | Routes Next.js (App Router), groupes `(auth)` / `(dashboard)` |
| `components/` | Composants UI locaux |
| `features/` | Modules métier par domaine |
| `hooks/` | Hooks React spécifiques à l’app |
| `lib/` | Helpers / configuration locale |
| `services/` | Appels API / intégrations |
| `stores/` | État client (ex. Zustand) |
| `types/` | Types locaux à l’app |

### `admin` — Back-office

Espace d’administration : utilisateurs, départements, ressources, réservations, notifications et paramètres.

### `mobile` — Application mobile

Client mobile (Expo / React Native) avec navigation par onglets et parcours auth / réservations / ressources / profil.

### `api` — Backend NestJS

API REST (et éventuellement autres transports) organisée en modules métier.

| Dossier | Responsabilité |
|---------|----------------|
| `modules/` | Domaines métier (auth, users, vehicles, etc.) |
| `common/` | Code transversal réutilisable |
| `config/` | Configuration NestJS |
| `database/` | Accès / providers base de données |
| `guards/` | Authentification / autorisation |
| `interceptors/` | Transformation / logging des réponses |
| `filters/` | Gestion centralisée des erreurs |
| `decorators/` | Décorateurs custom |
| `health/` | Endpoints de santé |
| `test/` | Tests e2e / intégration |

---

## Packages partagés (`packages/`)

| Package | Rôle |
|---------|------|
| `ui` | Design system et composants partagés (web / admin) |
| `types` | Types TypeScript communs |
| `schemas` | Schémas Zod (validation front / back) |
| `api-client` | Client HTTP typé vers l’API |
| `config` | Configs partagées (TS, Tailwind, etc.) |
| `constants` | Constantes métier / techniques |
| `utils` | Fonctions utilitaires |
| `eslint-config` | Règles ESLint du monorepo |

---

## Données (`prisma/`)

- `schema.prisma` — modèle de données
- `migrations/` — historique des migrations
- `seed.ts` — données initiales / de démo

---

## Infrastructure

| Chemin | Rôle |
|--------|------|
| `infrastructure/docker/` | Images et `docker-compose` (web, admin, API) |
| `infrastructure/nginx/` | Reverse proxy / TLS |
| `infrastructure/monitoring/` | Prometheus & Grafana |
| `infrastructure/backup/` | Scripts de sauvegarde BDD |
| `infrastructure/scripts/` | Déploiement, migrate, rollback |

---

## Documentation (`docs/`)

| Dossier | Contenu |
|---------|---------|
| `architecture/` | Structure et décisions d’architecture (ce fichier) |
| `api/` | Contrats et documentation des endpoints |
| `database/` | Modèle de données, conventions Prisma |
| `deployment/` | Procédures de mise en production |
| `user-guide/` | Guides utilisateurs |

---

## Fichiers racine

| Fichier | Rôle |
|---------|------|
| `package.json` | Scripts et dépendances du workspace |
| `pnpm-workspace.yaml` | Déclaration des workspaces pnpm |
| `turbo.json` | Pipelines Turborepo (build, lint, test, etc.) |
| `.env.example` | Variables d’environnement documentées |
| `.gitignore` | Exclusions Git |
| `README.md` | Point d’entrée du projet |

---

## Flux logique

```text
┌─────────┐  ┌─────────┐  ┌──────────┐
│   web   │  │  admin  │  │  mobile  │
└────┬────┘  └────┬────┘  └────┬─────┘
     │            │            │
     └────────────┼────────────┘
                  ▼
            packages/*
         (ui, types, schemas,
          api-client, utils…)
                  │
                  ▼
              apps/api
                  │
                  ▼
               prisma
            (PostgreSQL)
```

Les clients consomment l’API via `packages/api-client` et partagent types / schémas pour rester alignés avec le backend.
