# Environnement PREPROD

PREPROD est la répétition générale avant la production : même version, configuration proche de
la PROD, base et secrets **dédiés**. On n'y promeut qu'un commit déjà validé en STAGING.

## Promotion

*GitHub → Actions → **Promote PREPROD** → Run workflow*, avec le SHA complet du commit.

Le workflow `.github/workflows/promote-preprod.yml` refuse la promotion si :

- le SHA n'est pas un SHA complet de 40 caractères ;
- le commit n'appartient pas à `dev` ;
- les images `resource-manager-{api,admin}:<sha>` n'existent pas (elles ne sont construites que si
  la CI est verte) ;
- STAGING ne tourne pas actuellement sur ce commit (contrôle désactivable, à justifier).

Puis il :

1. ajoute le tag `preprod` aux images existantes (**même digest, aucun rebuild**) ;
2. déploie l'API sur Render avec l'image `<sha>` (migrations `migrate deploy` au démarrage) ;
3. déploie l'admin sur Vercel, construit depuis le **même commit** ;
4. attend que `/api/v1/health` et `/login` annoncent ce commit.

Si l'Environment GitHub `preprod` a des *required reviewers*, le déploiement attend leur
approbation.

## Exception assumée : l'admin sur Vercel

Vercel construit l'application lui-même : l'admin PREPROD n'est donc pas l'image Docker testée en
STAGING, mais un build du même commit avec le même lockfile. Le risque d'écart est faible mais réel.
La PROD (cPanel) utilisera un artefact identique à celui validé — voir `docs/devops/production.md`
(phase 6).

## Hébergement

| Composant | Hébergeur | Source |
|---|---|---|
| API | Render — Web Service « Existing image » | `ghcr.io/appatam-sarl/resource-manager-api:<sha>` |
| Admin | Vercel — projet dédié PREPROD | build du commit `<sha>` |
| PostgreSQL | Base dédiée PREPROD | jamais STAGING ni PROD |

## Mise en place (manuelle, une seule fois)

> Ces étapes n'ont **pas** été réalisées automatiquement : elles nécessitent vos comptes.

1. **Render** — nouvelle base PostgreSQL PREPROD et nouveau service API « Existing image »,
   comme pour STAGING (`docs/devops/staging.md`), avec les variables
   `infrastructure/env/api.preprod.env.example` et des secrets JWT **propres à PREPROD**.
2. **Vercel** — nouveau projet dédié à PREPROD, importé depuis le dépôt :
   - *Root Directory* : `apps/admin` (le fichier `apps/admin/vercel.json` fixe l'installation pnpm) ;
   - *Git* : désactivez les déploiements automatiques (*Ignored Build Step* : `exit 0`) — seuls les
     déploiements lancés par le workflow comptent ;
   - variables (environnement *Production* du projet) : `infrastructure/env/admin.preprod.env.example` ;
   - *Deployment Protection* : activez la protection (Vercel Authentication ou mot de passe) pour
     que la PREPROD ne soit pas publique.
3. **GitHub — variables du dépôt** (*Settings → Secrets and variables → Actions → Variables*) :
   `STAGING_API_URL`, `STAGING_ADMIN_URL`, `PREPROD_API_URL`, `PREPROD_ADMIN_URL`
   (sans slash final).
4. **GitHub — Environment `preprod`** :
   - secrets : `RENDER_API_DEPLOY_HOOK` (hook du service API PREPROD), `VERCEL_TOKEN`,
     `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (visibles dans `.vercel/project.json` après
     `vercel link`, ou dans les réglages du projet) ;
   - *Required reviewers* : recommandé (au moins une personne) ;
   - *Deployment branches* : `dev` et `main`.

## Données

- Jamais de copie brute de la base PROD. Une copie n'est autorisée qu'**anonymisée** (noms, e-mails,
  téléphones, commentaires de réservation), selon une procédure validée par le responsable des
  données — **à définir**.
- Le seed de développement (`prisma/seed.ts`) ne doit pas être lancé en PREPROD : il efface toutes
  les tables.

## Rollback

Relancez **Promote PREPROD** avec le SHA précédent (option *skip_staging_check* si STAGING a déjà
avancé). L'API reprend l'ancienne image ; Vercel permet aussi *Instant Rollback* sur le déploiement
précédent. Les migrations ne sont jamais annulées automatiquement.

## À vérifier au premier déploiement

- La commande `vercel deploy --prebuilt --env …` transmet bien `GIT_COMMIT_SHA` à l'exécution ;
  sinon l'admin se rabat sur `VERCEL_GIT_COMMIT_SHA` (fourni par Vercel). L'étape « Wait for the
  admin release » échoue si aucun des deux n'est présent.
- CORS : `CORS_ORIGIN` de l'API PREPROD doit contenir l'URL exacte du domaine Vercel PREPROD.
