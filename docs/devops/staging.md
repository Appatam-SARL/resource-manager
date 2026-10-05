# Environnement STAGING

STAGING reçoit automatiquement chaque commit poussé sur `dev` après validation de la CI.
Il sert aux tests fonctionnels internes. **Aucune donnée réelle** ne doit y être chargée.

## Chaîne de livraison

```
push dev ─► CI (lint · typecheck · tests · migrations · e2e)
        ─► images ghcr.io/appatam-sarl/resource-manager-{api,admin}:<sha>
        ─► Render : déploiement de l'image <sha> (API puis admin)
        ─► vérification : /api/v1/health et /login doivent annoncer <sha>
```

Le workflow est `.github/workflows/ci.yml` (job `deploy-staging`), le script
`infrastructure/scripts/render-deploy.sh`. Une image n'est **jamais reconstruite** pour un autre
environnement : PREPROD et PROD réutiliseront exactement la même image `<sha>`.

## Hébergement

| Composant | Hébergeur | Source |
|---|---|---|
| API | Render — Web Service « Existing image » | `ghcr.io/appatam-sarl/resource-manager-api:<sha>` |
| Admin | Render — Web Service « Existing image » | `ghcr.io/appatam-sarl/resource-manager-admin:<sha>` |
| PostgreSQL | Base dédiée STAGING | jamais partagée avec PREPROD/PROD |

## Mise en place (manuelle, une seule fois)

> Ces étapes n'ont **pas** été réalisées automatiquement : elles nécessitent vos comptes.

1. **Registre GHCR** — après le premier push sur `dev`, les deux paquets apparaissent dans
   *GitHub → Organisation → Packages*. Créez un token GitHub (classic) avec le seul scope
   `read:packages`, réservé à Render.
2. **Render — identifiants de registre** — *Settings → Registry Credentials* : registre
   `GitHub`, utilisateur GitHub, token `read:packages`.
3. **Render — base PostgreSQL STAGING** — créez une base dédiée et notez son URL interne.
   Vérifiez dans votre offre Render la durée de conservation et les sauvegardes (à valider).
4. **Render — service API** — *New → Web Service → Existing image* :
   - image `ghcr.io/appatam-sarl/resource-manager-api:<sha du dernier build>` + identifiants GHCR ;
   - port `3000`, health check path `/api/v1/health` ;
   - variables : voir `infrastructure/env/api.staging.env.example` (secrets JWT générés pour
     STAGING uniquement, `CORS_ORIGIN` = URL exacte de l'admin STAGING, `RUN_MIGRATIONS=true`).
   - Si votre offre propose une *Pre-Deploy Command*, préférez-la à `RUN_MIGRATIONS` :
     `./node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma`
5. **Render — service Admin** — même procédure avec l'image admin, port `3001`, health check
   path `/login`, variables `infrastructure/env/admin.staging.env.example`
   (`API_PUBLIC_URL` = URL publique de l'API STAGING).
6. **Deploy hooks** — dans chaque service : *Settings → Deploy Hook*, copiez l'URL (elle contient
   une clé secrète).
7. **GitHub — Environment `staging`** — *Settings → Environments → New environment* :
   - secrets : `RENDER_API_DEPLOY_HOOK`, `RENDER_ADMIN_DEPLOY_HOOK` ;
   - *Deployment branches* : `dev` uniquement.
   - Les URL `STAGING_API_URL` et `STAGING_ADMIN_URL` (sans slash final) sont des **variables du
     dépôt** (*Settings → Secrets and variables → Actions → Variables*), car la promotion PREPROD
     les lit aussi.
8. **Protection de branche** — `dev` et `main` : PR obligatoire, checks
   « Lint · Typecheck · Tests unitaires » et « Migrations · Tests d'intégration » requis.

## Variables propres au déploiement

| Variable | Où | Rôle |
|---|---|---|
| `APP_ENV` | API, admin | `staging` : bannière admin, champ `environment` du health |
| `APP_VERSION`, `GIT_COMMIT_SHA`, `BUILD_DATE` | image | injectées au build par la CI, ne pas surcharger |
| `TRUST_PROXY_HOPS` | API | `1` derrière Render : IP client réelle pour le rate limiting |
| `RUN_MIGRATIONS` | API | `true` : `prisma migrate deploy` avant démarrage |
| `API_PUBLIC_URL` | admin | URL publique de l'API, lue à l'exécution |

## Vérifier un déploiement

```bash
curl -s https://<api-staging>/api/v1/health
# {"status":"ok","environment":"staging","version":"0.0.1","commit":"<sha>",...,"checks":{"database":"up"}}
```

L'admin affiche une bannière **Environnement STAGING · v<version> · <sha court>** et la version
figure en bas du menu utilisateur.

## Rollback

Redéployez l'image d'un commit précédent depuis Render (*Manual Deploy → image tag*) ou relancez
le workflow sur ce commit. Les migrations Prisma ne sont **jamais** annulées automatiquement :
une migration destructive se corrige par une nouvelle migration.

## Limites connues

- WebSocket : supporté par les Web Services Render (processus persistant) ; l'admin se connecte
  directement à `API_PUBLIC_URL`.
- Les en-têtes de sécurité Caddy (CSP…) ne s'appliquent pas sur Render : ils seront ajoutés côté
  application en phase 7.
- Offre gratuite Render : mise en veille possible des services inactifs (premier appel lent) —
  à vérifier selon votre offre.
