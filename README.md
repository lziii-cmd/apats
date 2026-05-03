# APATS — Application de Gestion de l'Amicale des PATs
**École Nationale Supérieure des Mines et de la Géologie (ENSMG)**

PWA centralisée bilingue (Français / Anglais) pour la gestion des membres,
cotisations, réunions, événements, trésorerie et communication interne de
l'Amicale des PATs de l'ENSMG.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript 5 (strict) |
| Styles | Tailwind CSS 4 |
| Base de données | PostgreSQL via Supabase |
| ORM | Prisma 6 |
| Tests | Vitest |
| Déploiement | Vercel ou Render |

---

## Démarrage rapide

```bash
# 1. Cloner et installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env.local
# Remplir DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, etc.

# 3. Générer le client Prisma
npm run db:generate

# 4. Appliquer les migrations
npm run db:migrate

# 5. Lancer le serveur de développement
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

---

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | Vérification ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run test` | Tests (Vitest) |
| `npm run db:migrate` | Appliquer les migrations |
| `npm run db:studio` | Prisma Studio (UI BDD) |

---

## Architecture

```
/
├── app/
│   ├── (auth)/           # Espace authentification (login, reset mdp)
│   ├── (admin)/          # Back-office admin système
│   ├── (app)/            # Espace membres & bureau
│   └── api/              # API routes Next.js
├── components/
│   └── ui/               # Composants UI réutilisables
├── lib/
│   ├── db.ts             # Singleton Prisma client
│   └── utils.ts          # Utilitaires (cn, etc.)
├── prisma/
│   └── schema.prisma     # Schéma base de données
├── messages/
│   ├── fr.json           # Traductions françaises
│   └── en.json           # Traductions anglaises
└── types/
    └── index.ts          # Types globaux TypeScript
```

---

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète et les
instructions de configuration.

---

## Documentation projet

| Fichier | Contenu |
|---------|---------|
| [`CDC.md`](CDC.md) | Cahier des charges complet |
| [`SPEC.md`](SPEC.md) | Spécifications techniques & ADR |
| [`BACKLOG.md`](BACKLOG.md) | Features priorisées |
| [`MEMORY.md`](MEMORY.md) | Journal de session |
