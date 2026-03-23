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

Apri [http://localhost:3001](http://localhost:3001) → `/admin/login`.

## Variabili d’ambiente

Copia `.env.example` in `.env.local` e configura almeno `AUTH_SECRET`, credenziali admin, `DATABASE_URL` (Neon) se usi la galleria media, e R2 per gli upload.

## Deploy (Vercel)

Collega il progetto al repo **tj-react-admin** (root del repository = root di questa app Next, nessuna sottocartella). Imposta le stesse variabili d’ambiente del file `.env.example`.

## Route

- `/admin/login` – accesso
- `/admin` – dashboard e sezioni (articoli, media, …)
- `/api/auth/*`, `/api/admin/*` – API protette da sessione

## Allineare monorepo → repo admin

Dal repository **tj-react** (con cartella `admin/` aggiornata):

```bash
# una tantum
git remote add tj-react-admin https://github.com/andreaem-it/tj-react-admin.git

# invia solo la history della cartella admin come root del repo admin
git subtree split --prefix=admin -b admin-split
git push tj-react-admin admin-split:main --force
# oppure merge su branch diverso se preferisci non forzare main
```

In alternativa: clona `tj-react-admin`, copia i file dalla cartella `admin/` del monorepo e committa lì.
