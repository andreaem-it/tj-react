# TechJournal Admin

Pannello di amministrazione (Next.js App Router), separato dal frontend pubblico.

## Sviluppo

```bash
cd admin
npm install
npm run dev
```

Apri [http://localhost:3001](http://localhost:3001) → `/admin/login`.

## Variabili d’ambiente

Copia `.env.example` in `.env.local` e configura almeno `AUTH_SECRET`, credenziali admin, `DATABASE_URL` (Neon) se usi la galleria media, e R2 per gli upload.

## Deploy

Progetto Vercel **separato** (directory root `admin/` o repo dedicato), con le stesse variabili del backend admin.

## Route

- `/admin/login` – accesso
- `/admin` – dashboard e sezioni (articoli, media, …)
- `/api/auth/*`, `/api/admin/*` – API protette da sessione
