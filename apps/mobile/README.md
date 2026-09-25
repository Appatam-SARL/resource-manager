# Resource Manager — Application mobile

Application mobile (Expo / React Native) destinée aux collaborateurs du Groupe pour consulter les ressources, vérifier la disponibilité et gérer leurs réservations.

## Prérequis

- Node.js 20+
- pnpm (workspace monorepo)
- API NestJS démarrée (`apps/api`) sur le port 3000
- Compte seed : `employee@appatam.dev` / `Password123!`

## Configuration

Copiez `.env.example` vers `.env`.

Par défaut, laissez `EXPO_PUBLIC_API_URL` **vide** : l’app reprend automatiquement l’IP LAN de Metro (ex. `http://192.168.3.15:3000`).

Sinon, forcez selon le contexte :

```bash
# Android émulateur
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# iOS simulateur
EXPO_PUBLIC_API_URL=http://localhost:3000

# Appareil physique (même Wi‑Fi que le PC)
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

**Important :** après toute modification de `.env`, redémarrez Expo avec cache vidé :

```bash
pnpm --filter mobile start -- --clear
```

Sur l’écran de login (mode dev), l’URL API utilisée s’affiche sous le bouton.

Vérifiez aussi que l’API NestJS tourne (`pnpm --filter api start:dev`) et écoute le port 3000.

## Démarrage

Depuis la racine du monorepo :

```bash
pnpm --filter mobile start
```

Ou depuis `apps/mobile` :

```bash
pnpm start
```

Puis ouvrez Expo Go (ou un build de développement) et scannez le QR code.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm start` | Démarre le serveur Expo |
| `pnpm android` | Lance sur Android |
| `pnpm ios` | Lance sur iOS |
| `pnpm lint` | Lint Expo |
| `pnpm typecheck` | Vérification TypeScript |
| `pnpm test` | Tests Vitest (schémas) |

## Architecture

- Routes Expo Router dans `src/app/`
- Alias `@/*` → `./src/*`
- Auth : `AuthProvider` + SecureStore
- Données : TanStack Query + client Axios (`src/api/client.ts`)
- UI : StyleSheet (vert forêt `#1B4332`), composants dans `src/components/ui/`
- Formulaires : React Hook Form + Zod

## Écrans principaux

- Connexion
- Accueil (dashboard)
- Réservations (liste, détail, création)
- Véhicules / Salles
- Calendrier (semaine courante)
- Notifications
- Profil

## Builds EAS

Profils définis dans `eas.json` : `development`, `preview`, `production`.

```bash
npx eas-cli@latest build --profile development --platform android
```

## Notes métier

- La direction est optionnelle : elle n’est affichée que si elle est renseignée.
- Les réservations inter-entreprises ne sont pas autorisées par défaut.
- L’annulation passe par `POST /api/v1/reservations/:id/cancel`.
- Les tokens sont stockés dans Expo SecureStore (jamais AsyncStorage).
- Design system : StyleSheet React Native (thème vert forêt aligné Admin Web). NativeWind n’a pas été retenu pour la stabilité Expo SDK 57.

## Deep linking

Scheme : `resourcemanager://`

Exemple : `resourcemanager://reservations/<id>`
