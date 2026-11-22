"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Deve ser o PRIMEIRO import dos testes que não usam .env real.
process.env.JWT_SECRET ??= "segredo-de-teste-com-mais-de-32-caracteres";
process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/db";
process.env.DIRECT_URL ??= "postgresql://u:p@localhost:5432/db";
