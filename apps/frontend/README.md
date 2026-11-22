# Frontend

React/TypeScript single-page application (`TraceBlock/`, scaffolded with Vite) for
enterprise workflow administration, participant operations, and consumer/auditor
batch-history lookup.

Forms are rendered from the agreed shared workflow schema rather than a hardcoded custody
process: organization signup (`src/components/auth/Cadastro.tsx`) lets the admin pick the
subsequent custody-chain roles, and request/response DTOs shared with the API live in
`@provenance/shared` (`packages/shared/`), imported with `import type` so no zod/runtime
code is bundled into the frontend.

```text
TraceBlock/
  src/
    components/   # feature UI (auth, products, transfers, organization, ...)
    services/     # fetch wrappers for each API route group
    App.tsx, main.tsx
  index.html, vite.config.ts, tailwind config
```

Run locally from `TraceBlock/`: `npm install && npm run dev` (expects the API at
`VITE_API_URL`, default `http://localhost:3000/api`).
