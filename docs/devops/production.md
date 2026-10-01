# Environnement PRODUCTION (cPanel mutualisé)

La PRODUCTION tourne sur un hébergement cPanel mutualisé, sans Docker. Pour ne pas perdre la
garantie « ce qui part en PROD est exactement ce qui a été testé », la CI **ne reconstruit rien** :
elle extrait le code compilé des images Docker déjà validées en STAGING et en PREPROD, puis le
déploie par SSH, avec une approbation obligatoire.

```
dev ──CI──► images <sha> ──► STAGING (Render)
                    │
                    └──► Promote PREPROD ──► PREPROD (Render + Vercel)
                                   │
main (contient <sha>) ──► Deploy PRODUCTION ──► archives extraites des images <sha>
                                   │                      │
                          approbation requise      SSH ──► cPanel (Passenger)
```

## Hébergement

| Composant | Où | Détail |
|---|---|---|
| API | cPanel « Setup Node.js App » (Passenger) | sous-domaine `api.<domaine>` |
| Admin | cPanel « Setup Node.js App » (Passenger) | sous-domaine `admin.<domaine>` |
| PostgreSQL | PostgreSQL du cPanel | `localhost` uniquement, base et utilisateur dédiés PROD |
| TLS | AutoSSL du cPanel | certificats gérés par l'hébergeur, jamais dans le dépôt |

L'API et l'admin sont deux applications sur deux sous-domaines : contrairement au Caddy local,
l'admin n'est **pas** servi depuis la même origine que l'API. D'où `API_PUBLIC_URL` (admin) et
`CORS_ORIGIN` (API), qui doivent contenir les URL exactes.

### Arborescence sur le serveur

```
~/resource-manager/                 (hors public_html)
├── shared/api.env                  secrets PROD (chmod 600, créé à la main)
├── shared/admin.env                configuration admin (chmod 600)
├── api/releases/<sha>/             code API + node_modules installés sur le serveur
├── api/current -> releases/<sha>   lien basculé atomiquement
├── api/previous                    release précédente (cible du rollback)
├── admin/releases/<sha>/  admin/current  admin/previous
├── bin/                            scripts serveur (mis à jour à chaque déploiement)
├── backups/pre-deploy/             dump avant chaque déploiement (10 derniers)
├── backups/{daily,weekly,monthly}/ sauvegardes planifiées (7 / 4 / 3)
├── backups/last-success            date de la dernière sauvegarde réussie
└── logs/deploy-history.log         historique des déploiements et rollbacks
~/apps/rm-api/app.cjs               fichier de démarrage Passenger (API), installé par le déploiement
~/apps/rm-admin/app.cjs             fichier de démarrage Passenger (admin)
```

Les fichiers `app.cjs` ne contiennent aucun secret. Ils chargent `shared/*.env`, dont les valeurs
**priment** sur les variables saisies dans l'interface cPanel, puis lisent la version et le commit
dans `release.json` (ce qui est exposé par `/api/v1/health`).

## Déployer

*GitHub → Actions → **Deploy PRODUCTION** → Run workflow* (depuis `main`), avec le SHA complet.

Le workflow `.github/workflows/deploy-production.yml` :

1. **refuse** si le SHA est invalide, si le commit n'est pas dans `main`, si les images n'existent
   pas (CI rouge), ou si PREPROD ne tourne pas sur ce commit (contrôle désactivable, à justifier) ;
2. extrait les archives des images `<sha>` (`infrastructure/cpanel/package-release.sh`), vérifie
   que leur label `org.opencontainers.image.revision` est bien `<sha>`, produit `SHA256SUMS` et
   conserve l'artefact 90 jours ;
3. **attend l'approbation** de l'Environment GitHub `production` ;
4. envoie la release par SSH (clé d'hôte épinglée) et lance `deploy-release.sh`, qui :
   vérifie les sommes SHA-256 → vérifie `APP_ENV=production` dans `shared/api.env` → installe les
   dépendances de production (`pnpm install --prod --frozen-lockfile`) → **sauvegarde la base**
   (dump vérifié par `pg_restore --list`) → `prisma migrate deploy` → bascule atomique des liens →
   redémarrage Passenger (`tmp/restart.txt`) → purge (jamais `current` ni `previous`) ;
5. attend que `/api/v1/health` (statut `ok`) et `/login` annoncent le commit.

Si une étape échoue avant la bascule, la version en ligne n'est pas touchée.

**Interdits en PRODUCTION** (bloqués par `prisma/dev-guard.ts` et absents des workflows) :
`prisma migrate dev`, `prisma db push`, `prisma migrate reset`, le seed de développement.

## Mise en place (manuelle, une seule fois)

> Rien de ceci n'a été fait automatiquement : ces étapes demandent l'accès à votre cPanel et à
> GitHub.

1. **Sous-domaines** `api.<domaine>` et `admin.<domaine>`, avec AutoSSL actif (HTTPS).
2. **PostgreSQL** (*cPanel → PostgreSQL Databases*) : une base et un utilisateur dédiés à la PROD,
   avec un mot de passe fort. Aucun accès distant (*Remote PostgreSQL* désactivé).
3. **Applications Node.js** (*cPanel → Setup Node.js App*), une par sous-domaine :
   - version de Node : **22** ;
   - *Application mode* : Production ;
   - *Application root* : `apps/rm-api` (resp. `apps/rm-admin`) ;
   - *Application URL* : le sous-domaine ;
   - *Application startup file* : `app.cjs` ;
   - aucune variable d'environnement à saisir : tout est dans `shared/*.env`.
   Notez la commande d'activation affichée en haut de la page (`source …/nodevenv/…/bin/activate`) :
   son chemin sert de variable `CPANEL_NODEVENV_ACTIVATE`.
4. **Fichiers de configuration** (SSH) :
   ```bash
   mkdir -p ~/resource-manager/shared && chmod 700 ~/resource-manager
   nano ~/resource-manager/shared/api.env     # modèle : infrastructure/env/api.production.env.example
   nano ~/resource-manager/shared/admin.env   # modèle : infrastructure/env/admin.production.env.example
   chmod 600 ~/resource-manager/shared/*.env
   ```
   Secrets JWT générés pour la PROD uniquement, jamais réutilisés de STAGING/PREPROD.
5. **Clé SSH de déploiement** : générez une paire dédiée (`ssh-keygen -t ed25519 -C rm-deploy`),
   ajoutez la clé publique dans *cPanel → SSH Access → Manage SSH Keys* (puis *Authorize*).
   La clé privée ne va que dans le secret GitHub ci-dessous ; supprimez-la de votre poste ensuite.
6. **Empreinte du serveur** : `ssh-keyscan -p <port> <hôte>`, puis **comparez** l'empreinte avec
   celle communiquée par l'hébergeur avant de l'enregistrer.
7. **GitHub — Environment `production`** (*Settings → Environments*) :
   - *Required reviewers* : au moins une personne (obligatoire) ;
   - *Deployment branches* : `main` uniquement ;
   - secrets : `CPANEL_SSH_PRIVATE_KEY`, `CPANEL_SSH_KNOWN_HOSTS` ;
   - variables : `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_SSH_PORT`, `CPANEL_DEPLOY_ROOT`
     (ex. `/home/<user>/resource-manager`), `CPANEL_API_APP_ROOT` (ex. `/home/<user>/apps/rm-api`),
     `CPANEL_ADMIN_APP_ROOT`, `CPANEL_NODEVENV_ACTIVATE`.
8. **GitHub — variables du dépôt** : `PRODUCTION_API_URL`, `PRODUCTION_ADMIN_URL` (sans slash final).
9. **Sauvegarde planifiée** (*cPanel → Cron Jobs*), après le premier déploiement (qui installe
   `bin/`), par exemple tous les jours à 02:30 :
   ```bash
   NODEVENV_ACTIVATE=<chemin activate> bash ~/resource-manager/bin/backup-db.sh >> ~/resource-manager/logs/backup.log 2>&1
   ```
   Renseignez l'adresse e-mail du cron : un échec envoie un message.

## À VALIDER avec l'hébergeur avant le premier déploiement

Ces points dépendent de l'offre mutualisée et n'ont pas pu être vérifiés :

| Point | Pourquoi | Si non disponible |
|---|---|---|
| Node.js 22 dans *Setup Node.js App* | `util.parseEnv`, compatibilité du build | demander la version ou changer d'offre |
| Accès sortant HTTPS vers `registry.npmjs.org` et `binaries.prisma.sh` | installation des dépendances et des moteurs Prisma sur le serveur | embarquer `node_modules` dans l'archive (à construire sur une plateforme identique) |
| `pg_dump` / `pg_restore` disponibles en SSH, version ≥ serveur PostgreSQL | sauvegarde avant migration (le déploiement s'arrête sinon) | demander l'accès ou une sauvegarde gérée |
| WebSocket à travers Apache/LiteSpeed + Passenger | temps réel (Socket.IO) | Socket.IO repasse en *long-polling* |
| Sessions persistantes si Passenger lance plusieurs processus | le *long-polling* de Socket.IO exige de retomber sur le même processus | limiter l'API à 1 processus (`PassengerMaxPoolSize 1`) ou activer `PassengerStickySessions on` |
| Limites mémoire / processus (LVE, CageFS) | `pnpm install`, Next.js et Prisma consomment de la mémoire | augmenter les limites du compte |
| `TRUST_PROXY_HOPS=1` | adresse IP réelle pour le rate limiting | ajuster selon les en-têtes `X-Forwarded-For` effectivement reçus |
| Copie des sauvegardes **hors du serveur** | une panne du serveur emporterait base et sauvegardes | sauvegardes cPanel de l'hébergeur ou rapatriement régulier chiffré |
| RPO / RTO cibles | dimensionner la fréquence des sauvegardes | à décider par le Groupe |

En-têtes de sécurité : en local et sur Render, Caddy/Vercel ajoutent CSP, HSTS, etc. Sur cPanel il
n'y a pas de Caddy ; ils seront portés par les applications elles-mêmes (phase sécurité).

## Migrations : règle expand / contract

Le rollback ne revient **jamais** sur le schéma de base. Toute migration doit donc rester
compatible avec la version précédente du code :

1. **expand** — ajouter (colonne nullable, nouvelle table, index) ; le code N-1 continue de marcher ;
2. déployer le code qui utilise le nouveau schéma ;
3. **contract** — supprimer l'ancien (colonne, table) dans une release **ultérieure**, une fois la
   précédente jugée stable.

Une migration destructive (DROP, changement de type, NOT NULL sans défaut) doit être signalée dans
la PR et validée explicitement avant la PROD.

## Rollback

*GitHub → Actions → **Rollback PRODUCTION*** (approbation requise) : sans SHA, revient à la release
précédente ; avec un SHA, à une release encore installée (les 5 dernières sont conservées).
Le code est rebasculé en quelques secondes ; **les migrations ne sont pas annulées**.

- Release sans migration, ou migration *expand* : rollback direct, sans risque.
- Release avec une migration non rétrocompatible : **ne pas rollbacker à l'aveugle**. Évaluer
  d'abord : correctif en avant (nouvelle release), ou restauration de la sauvegarde pré-déploiement
  (perte des écritures faites depuis), décidée par un responsable.

Depuis le serveur (secours) : `bash ~/resource-manager/bin/rollback-release.sh [sha]`, avec
`API_APP_ROOT` et `ADMIN_APP_ROOT` définis.

## Sauvegardes et restauration

- Avant chaque déploiement : `backups/pre-deploy/<date>-<sha7>.dump` (10 derniers).
- Planifiées : 7 quotidiennes, 4 hebdomadaires (dimanche), 3 mensuelles (le 1er).
- Format `pg_dump --format=custom`, permissions 600, chaque dump vérifié par `pg_restore --list`.
- Les identifiants ne passent jamais en ligne de commande (variables `PG*` dérivées de
  `DATABASE_URL`, rien n'est affiché).

**Test de restauration** (au moins une fois par mois, et avant toute migration risquée), dans une
base de test créée via cPanel, jamais dans la base PROD :

```bash
source ~/resource-manager/bin/lib-db.sh
load_database_env ~/resource-manager/shared/api.env
pg_restore --no-owner --dbname=<base_de_test> ~/resource-manager/backups/daily/<fichier>.dump
psql -d <base_de_test> -c 'select count(*) from _prisma_migrations'
```

**Restauration réelle de la PROD** : mettre l'application en maintenance (arrêter les deux
applications dans *Setup Node.js App*), restaurer avec `pg_restore --clean --if-exists --no-owner`
le dump choisi, revenir au code correspondant (rollback), redémarrer, vérifier `/api/v1/health`.
À faire sous la responsabilité d'un responsable, avec une sauvegarde de l'état courant juste avant.

## Tester les scripts localement

Les scripts serveur ont été validés sur un serveur simulé (Debian, Node 22, `pg_dump` 16,
utilisateur non root, sans Docker ni Passenger) contre la base Docker locale :

```bash
pnpm stack:up
SHA=$(git rev-parse HEAD)   # images locales construites avec GIT_COMMIT_SHA=$SHA
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "$PWD:/repo:ro" -v rm-cpanel-sim:/out -w /repo \
  -e API_IMAGE=resource-manager-api:local -e ADMIN_IMAGE=resource-manager-admin:local docker:cli \
  sh -c "apk add -q bash coreutils tar && bash infrastructure/cpanel/package-release.sh $SHA /out/incoming/$SHA"
docker create --name rm-cpanel-sim --network resource-manager-local_internal \
  -v "$PWD:/repo:ro" -v rm-cpanel-sim:/out node:22-bookworm-slim \
  bash /repo/infrastructure/cpanel/tests/simulate-cpanel.sh "$SHA"
docker network connect bridge rm-cpanel-sim && docker start -a rm-cpanel-sim
docker rm rm-cpanel-sim && docker volume rm rm-cpanel-sim
```

Le scénario couvre : deux déploiements, démarrage réel des deux `app.cjs`, refus (release déjà en
ligne, `APP_ENV` incohérent, archive altérée, SHA invalide), rollback, purge protégeant la release
précédente, sauvegarde planifiée, restauration d'un dump et absence de secret dans les sorties.
