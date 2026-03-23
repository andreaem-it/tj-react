# TechJournal Admin

Pannello di amministrazione (Next.js App Router), separato dal frontend pubblico.

**Repository dedicato (sorgente per deploy produzione):**  
[https://github.com/andreaem-it/tj-react-admin](https://github.com/andreaem-it/tj-react-admin)

La cartella `admin/` nel monorepo [tj-react](https://github.com/andreaem-it/tj-react) può essere usata per sviluppo unificato; per allineare il codice al repo admin si può fare push dalla sottocartella o usare `git subtree` (vedi sotto).

## Sviluppo

```bash
npm install
npm run dev
```

Apri [http://localhost:3001](http://localhost:3001) → `/login` (dashboard su `/`).

## Variabili d’ambiente

Copia `.env.example` in `.env.local` e configura almeno `AUTH_SECRET`, credenziali admin, `DATABASE_URL` (Neon) se usi la galleria media, e R2 per gli upload.

## Deploy (Vercel)

Collega il progetto al repo **[tj-react-admin](https://github.com/andreaem-it/tj-react-admin)**, branch **`main`** (root del repo = questa app Next, nessuna sottocartella). Il deploy **non** passa da `tj-react` / `feature/admin-d1`: dopo le modifiche nel monorepo va eseguito il **subtree push** (sezione sotto). Variabili: come `.env.example`.

## Route

- `/login` – accesso (app su dominio dedicato: niente prefisso `/admin`)
- `/`, `/articoli`, `/media`, … – dashboard e sezioni
- `/api/auth/*`, `/api/admin/*` – API protette da sessione

Le vecchie URL `/admin`, `/admin/login`, `/admin/articoli/…` reindirizzano (308) alle nuove path.

## Allineare monorepo → repo admin (push che attiva Vercel)

Dal repository **tj-react**, sulla **branch che contiene i commit aggiornati** su `admin/`:

```bash
# una tantum: remote verso il repo deploy
git remote add tj-react-admin https://github.com/andreaem-it/tj-react-admin.git

git subtree split --prefix=admin -b tmp-admin-split
git push tj-react-admin tmp-admin-split:main
git branch -D tmp-admin-split
```

Se `main` su `tj-react-admin` non è antenato dello split, il push può essere rifiutato: in quel caso solo se consapevoli, `git push tj-react-admin tmp-admin-split:main --force-with-lease`.

In alternativa: clona `tj-react-admin`, copia i file dalla cartella `admin/` del monorepo e committa lì.
