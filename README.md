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
cp .env.example .env    # Configure your VITE_API_BASE_URL env var
npm run dev
```

## Environment Configuration

Both the frontend and backend require configuration variables to adapt across environments.

### Backend Configurations (`server/.env`)

Configure the following variables in `server/.env`:
* `PORT` (default `3000`): Port the Express API server listens on.
* `DATABASE_URL`: PostgreSQL JDBC connection string (SSL is auto-configured in production).
* `CORS_ORIGIN`: Allowed origins for API requests (usually the client URL).
* `NODE_ENV`: Runs as `development`, `production`, or `test`.

### Frontend Configurations (`client/.env`)

Configure the following variables in `client/.env`:
* `VITE_API_BASE_URL`: The absolute or relative endpoint URL pointing to the Express server.
  * For local dev setup: `http://localhost:3000/api`
  * For single-domain/proxy staging or production: `/api`

The client application includes a validation check in [env.ts](file:///d:/Assignment2/Products/client/src/config/env.ts) during startup. If `VITE_API_BASE_URL` is undefined, the application will print a clear console error and fail fast immediately.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase) |
| Frontend | React, TypeScript, Vite |
| Validation | Zod |

