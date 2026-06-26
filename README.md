# Products API — Monorepo

> Cursor-paginated Products API with category filtering.  
> Backend internship take-home assignment.

## Structure

```
project/
├── docs/          # Architecture & design documents
├── server/        # Node.js + Express + TypeScript API
│   ├── src/
│   └── package.json
├── client/        # React + TypeScript frontend (minimal UI)
│   ├── src/
│   └── package.json
├── .gitignore
├── .prettierrc
└── README.md
```

## Getting Started

### Server

```bash
cd server
npm install
cp .env.example .env    # Fill in your Supabase credentials
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase) |
| Frontend | React, TypeScript, Vite |
| Validation | Zod |
