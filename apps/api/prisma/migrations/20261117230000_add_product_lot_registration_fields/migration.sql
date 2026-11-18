ALTER TABLE "produto"
ADD COLUMN "codigo" VARCHAR(100),
ADD COLUMN "categoria" VARCHAR(100),
ADD COLUMN "fabricante_id" BIGINT;

CREATE UNIQUE INDEX "produto_codigo_key" ON "produto"("codigo");

ALTER TABLE "lote"
ADD COLUMN "responsavel_cadastro_id" BIGINT,
ADD COLUMN "quantidade" DECIMAL(14, 3),
ADD COLUMN "unidade_medida" VARCHAR(30),
ADD COLUMN "localizacao_origem" VARCHAR(200);

ALTER TABLE "produto"
ADD CONSTRAINT "produto_fabricante_id_fkey"
FOREIGN KEY ("fabricante_id") REFERENCES "participante"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "lote"
ADD CONSTRAINT "lote_responsavel_cadastro_id_fkey"
FOREIGN KEY ("responsavel_cadastro_id") REFERENCES "usuario"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "produto_fabricante_id_idx" ON "produto"("fabricante_id");
