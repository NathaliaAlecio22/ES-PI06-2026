-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "acordo_entrega" (
    "id" BIGSERIAL NOT NULL,
    "movimentacao_id" BIGINT NOT NULL,
    "nome_documento" VARCHAR(200) NOT NULL,
    "documento" BYTEA NOT NULL,
    "hash_documento" VARCHAR(66) NOT NULL,
    "tx_hash" VARCHAR(66),
    "data_criacao" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acordo_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lote" (
    "id" BIGSERIAL NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "responsavel_atual_id" BIGINT,
    "data_fabricacao" DATE,
    "data_validade" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ATIVO',

    CONSTRAINT "lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao" (
    "id" BIGSERIAL NOT NULL,
    "lote_id" BIGINT NOT NULL,
    "origem_id" BIGINT,
    "destino_id" BIGINT NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "data_movimentacao" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "localizacao" VARCHAR(200),
    "tx_hash" VARCHAR(66),
    "status_blockchain" VARCHAR(20) DEFAULT 'PENDENTE',

    CONSTRAINT "movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participante" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "identificacao" VARCHAR(150),
    "email" VARCHAR(150),
    "tipo" VARCHAR(50),
    "wallet_address" VARCHAR(42),
    "ativo" BOOLEAN DEFAULT true,
    "chave_publica" VARCHAR(132),

    CONSTRAINT "participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_condicao" (
    "id" BIGSERIAL NOT NULL,
    "lote_id" BIGINT NOT NULL,
    "temperatura" DECIMAL(5,2),
    "umidade" DECIMAL(5,2),
    "localizacao" VARCHAR(200),
    "data_registro" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_condicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" BIGSERIAL NOT NULL,
    "participante_id" BIGINT,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" VARCHAR(30) NOT NULL,
    "telefone" VARCHAR(30),
    "cargo" VARCHAR(100),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acordo_entrega_movimentacao_id_key" ON "acordo_entrega"("movimentacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "acordo_entrega_tx_hash_key" ON "acordo_entrega"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "lote_codigo_key" ON "lote"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "movimentacao_tx_hash_key" ON "movimentacao"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "participante_identificacao_key" ON "participante"("identificacao");

-- CreateIndex
CREATE UNIQUE INDEX "participante_wallet_address_key" ON "participante"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "participante_chave_publica_key" ON "participante"("chave_publica");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "acordo_entrega" ADD CONSTRAINT "acordo_entrega_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_responsavel_atual_id_fkey" FOREIGN KEY ("responsavel_atual_id") REFERENCES "participante"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "participante"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "participante"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registro_condicao" ADD CONSTRAINT "registro_condicao_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participante"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
