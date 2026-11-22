-- AlterTable
ALTER TABLE "movimentacao" ADD COLUMN     "etapa_cadeia_id" BIGINT;

-- CreateTable
CREATE TABLE "cadeias_custodia" (
    "id" BIGSERIAL NOT NULL,
    "organizacao_id" BIGINT NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "endereco_admin" VARCHAR(42) NOT NULL,
    "endereco_contrato" VARCHAR(42) NOT NULL,
    "tx_hash_criacao" VARCHAR(66),
    "bloco_criacao" INTEGER,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cadeias_custodia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_cadeia_custodia" (
    "id" BIGSERIAL NOT NULL,
    "cadeia_id" BIGINT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "papel" VARCHAR(40) NOT NULL,
    "responsavel_id" BIGINT,
    "endereco_carteira" VARCHAR(42) NOT NULL,
    "especificacao" TEXT,
    "hash_especificacao" VARCHAR(66) NOT NULL,

    CONSTRAINT "etapas_cadeia_custodia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cadeias_custodia_organizacao_id_key" ON "cadeias_custodia"("organizacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "cadeias_custodia_endereco_contrato_key" ON "cadeias_custodia"("endereco_contrato");

-- CreateIndex
CREATE UNIQUE INDEX "cadeias_custodia_tx_hash_criacao_key" ON "cadeias_custodia"("tx_hash_criacao");

-- CreateIndex
CREATE INDEX "etapas_cadeia_custodia_responsavel_id_idx" ON "etapas_cadeia_custodia"("responsavel_id");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_cadeia_custodia_cadeia_id_ordem_key" ON "etapas_cadeia_custodia"("cadeia_id", "ordem");

-- CreateIndex
CREATE INDEX "movimentacao_etapa_cadeia_id_idx" ON "movimentacao"("etapa_cadeia_id");

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_etapa_cadeia_id_fkey" FOREIGN KEY ("etapa_cadeia_id") REFERENCES "etapas_cadeia_custodia"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cadeias_custodia" ADD CONSTRAINT "cadeias_custodia_organizacao_id_fkey" FOREIGN KEY ("organizacao_id") REFERENCES "participante"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "etapas_cadeia_custodia" ADD CONSTRAINT "etapas_cadeia_custodia_cadeia_id_fkey" FOREIGN KEY ("cadeia_id") REFERENCES "cadeias_custodia"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "etapas_cadeia_custodia" ADD CONSTRAINT "etapas_cadeia_custodia_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "participante"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
