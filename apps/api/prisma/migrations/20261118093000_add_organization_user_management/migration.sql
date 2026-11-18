ALTER TABLE "usuario"
ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "convites_usuario" (
    "id" BIGSERIAL NOT NULL,
    "participanteId" BIGINT NOT NULL,
    "remetenteId" BIGINT NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "telefone" VARCHAR(30),
    "cargo" VARCHAR(100) NOT NULL,
    "perfil" VARCHAR(30) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "expiraEm" TIMESTAMPTZ(6) NOT NULL,
    "criadoEm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aceitoEm" TIMESTAMPTZ(6),

    CONSTRAINT "convites_usuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "convites_usuario_tokenHash_key" ON "convites_usuario"("tokenHash");
CREATE INDEX "convites_usuario_participanteId_status_idx" ON "convites_usuario"("participanteId", "status");
CREATE INDEX "convites_usuario_email_status_idx" ON "convites_usuario"("email", "status");

ALTER TABLE "convites_usuario"
ADD CONSTRAINT "convites_usuario_participanteId_fkey"
FOREIGN KEY ("participanteId") REFERENCES "participante"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "convites_usuario"
ADD CONSTRAINT "convites_usuario_remetenteId_fkey"
FOREIGN KEY ("remetenteId") REFERENCES "usuario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
