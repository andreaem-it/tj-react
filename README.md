TechJournal: **frontend pubblico** (Next.js) + cartella **`admin/`** nel monorepo per sviluppo locale.

**Admin in produzione / repo dedicato:** [github.com/andreaem-it/tj-react-admin](https://github.com/andreaem-it/tj-react-admin) — Vercel e CI vanno puntati lì. Dettagli e sync da monorepo in `admin/README.md`.

## Frontend (sito)

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Admin (dashboard)

Applicazione Next dedicata (porta **3001** in dev):

```bash
npm run install:admin   # prima volta
npm run dev:admin
```

Apri [http://localhost:3001/admin/login](http://localhost:3001/admin/login). Variabili: `admin/.env.example`.

Build produzione admin: `npm run build:admin`.

---

Questo progetto usa [Next.js](https://nextjs.org).

## Getting Started (dettagli)

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
