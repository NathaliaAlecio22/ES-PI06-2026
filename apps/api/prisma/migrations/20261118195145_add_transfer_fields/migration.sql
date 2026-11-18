-- AlterTable
ALTER TABLE "movimentacao" ADD COLUMN     "confirmado_em" TIMESTAMPTZ(6),
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "quantidade" DECIMAL(14,3),
ADD COLUMN     "status" VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_CONFIRMACAO',
ADD COLUMN     "temperatura" DECIMAL(5,2),
ADD COLUMN     "umidade" DECIMAL(5,2);
