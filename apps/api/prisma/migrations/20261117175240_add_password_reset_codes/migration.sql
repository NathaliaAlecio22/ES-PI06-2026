-- CreateTable
CREATE TABLE "codigos_recuperacao_senha" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codigos_recuperacao_senha_email_idx" ON "codigos_recuperacao_senha"("email");
