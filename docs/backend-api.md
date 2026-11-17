# Backend API

## Objetivo

O backend fornece uma API REST inicial para a plataforma de rastreabilidade de produtos. Ele organiza workflows, participantes, lotes e transferências de custódia, servindo como base para as futuras integrações com blockchain, PostgreSQL e sensores.

## Tecnologias

- Node.js
- TypeScript
- Express
- Zod para validação de dados
- Vitest e Supertest para testes HTTP

## Estrutura

O código está localizado em `apps/api/`:

```text
apps/api/
  src/
    app.ts       # Configuração da aplicação e rotas
    server.ts    # Inicialização do servidor HTTP
    store.ts     # Armazenamento temporário em memória
  tests/
    app.test.ts  # Testes dos endpoints principais
```

Os DTOs (schemas Zod + tipos inferidos de cada requisição/resposta) não vivem mais aqui: são
definidos uma única vez em [`packages/shared`](../packages/shared/README.md)
(`@provenance/shared`) e importados pela API, pelo frontend e pelo simulador de sensores.

## Endpoints implementados

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Verifica se a API está disponível. |
| `POST` | `/api/workflows` | Cria um workflow com etapas ordenadas. |
| `GET` | `/api/workflows/:workflowId` | Consulta um workflow. |
| `POST` | `/api/workflows/:workflowId/participants` | Registra um participante e seu papel. |
| `POST` | `/api/batches` | Cria um lote vinculado a um workflow. |
| `POST` | `/api/batches/:batchId/transfers` | Registra uma transferência de custódia. |
| `GET` | `/api/batches/:batchId/history` | Retorna o histórico de transferências do lote. |

## Exemplo de workflow

Os campos seguem os schemas de `@provenance/shared`: `requiredRole` é um dos papéis fixos do
contrato de definição de workflow (`manufacturer`, `distributor`, `carrier`,
`distribution_center`, `retailer`, `admin` — espelhando o enum on-chain), e hashes são
`bytes32` hex com prefixo `0x` porque são eles que chegam à blockchain.

```json
{
  "name": "Cadeia de custódia",
  "adminAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "steps": [
    {
      "name": "Origem",
      "requiredRole": "manufacturer",
      "specificationHash": "0xbb459defbb15fa55f2506b3ab87d778d07e82b5bc3569d1711c27229c7b0b929"
    }
  ]
}
```

## Execução local

Na raiz do repositório:

```powershell
cd apps/api
npm install
npm run dev
```

A API será iniciada em `http://localhost:3000`.

Para verificar o funcionamento:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Para executar os testes e validar a compilação:

```powershell
npm test
npm run build
```

A execução dos testes também gera `apps/api/logs/api-run.log`: o registro de cada
requisição feita pela suíte com o corpo enviado e a resposta devolvida pela API
(status + corpo), agrupado por teste, além de um resumo ao final. É a forma mais
direta de inspecionar o que os endpoints realmente responderam, além do resultado
dos asserts do Vitest. O arquivo é recriado a cada execução e é ignorado pelo git.

## Ambiente Hardhat (para a futura integração com contratos)

`src/blockchain.ts` já implementa toda a camada de comunicação com os contratos
`WorkflowFactory`/`Workflow` (docs/context.md §3, §5, §7) via `ethers.js`, mas as rotas em
`app.ts` ainda usam apenas o armazenamento em memória — a integração (item 3 abaixo) ainda não
foi ligada aos endpoints. O workspace Hardhat em [`contracts/`](../contracts/README.md) já
existe e compila/testa normalmente, e `apps/api/.env.example` já aponta `RPC_URL`/`CHAIN_ID`
para um nó Hardhat local (`http://127.0.0.1:8545`, chainId `31337`).

Para preparar um ambiente local ponta a ponta:

```powershell
cd contracts
npm install
npm run node            # terminal dedicado; mantém um nó local rodando
npm run deploy:local     # em outro terminal; imprime o endereço do WorkflowFactory
```

Copie o endereço impresso para `WORKFLOW_FACTORY_ADDRESS` em `apps/api/.env`, e
`TRANSACTION_SIGNER_PRIVATE_KEY` para uma das chaves privadas que `npm run node` lista ao
iniciar (qualquer uma serve — todas já têm ETH de teste nessa rede local). A partir daí, todas
as funções de `src/blockchain.ts` (criação de workflow, registro de participante, criação de
lote, transferência de custódia com assinatura, leitura de condição) podem ser exercitadas
contra contratos reais.

## Regras atuais

- Workflows precisam ter pelo menos uma etapa.
- Um lote só pode ser criado para um workflow existente.
- Uma transferência deve informar o custodiante atual do lote.
- A etapa informada na transferência deve ser a etapa atual do lote.
- Endereços Ethereum, hashes `bytes32` e assinaturas (65 bytes hex) são validados pelos
  schemas de `@provenance/shared` no formato exigido pela blockchain; dados fora do formato
  são rejeitados com resposta HTTP `400`.
- Dados inválidos são rejeitados com resposta HTTP `400`.
- Recursos inexistentes retornam HTTP `404`.
- Transferências incompatíveis com o estado atual retornam HTTP `409`.

## Próximas evoluções

Esta é a primeira versão técnica do backend. O armazenamento atual é temporário e mantido em memória. As próximas etapas previstas são:

1. Persistência com PostgreSQL e Prisma.
2. Autenticação e permissões da aplicação.
3. Integração com contratos Solidity e assinaturas digitais.
4. Indexação de eventos da blockchain.
5. Recebimento e avaliação de leituras do simulador de sensores.

## Addendum: simulador de sensores descartado por falta de tempo

O serviço standalone `apps/sensor-simulator/` (item 5 acima e item 3 do trabalho dividido em
[`docs/context.md`](context.md) §9) **não foi implementado** — não houve tempo hábil no
cronograma do projeto para construí-lo como processo independente. O diretório
[`apps/sensor-simulator/`](../apps/sensor-simulator/README.md) permanece apenas como stub de
planejamento.

Isso não significa que o suporte a leituras de sensor esteja ausente: a camada de suporte já
está implementada no backend e nos contratos. `src/blockchain.ts` já expõe `reportCondition`
(envia a leitura ao contrato), `getConditionBreaches` (lê violações de limiar já registradas) e
o listener do evento `ConditionReported`; o contrato `Workflow.reportCondition` (ver
[`contracts/README.md`](../contracts/README.md)) registra a leitura e compromete o lote
automaticamente em caso de violação de limiar. O que falta é apenas (a) o processo externo que
simula o dispositivo de IoT e (b) a rota HTTP correspondente em `app.ts` para encaminhar
leituras recebidas via REST até `reportCondition` — a integração com a blockchain em si já
existe e pode ser exercitada diretamente contra `src/blockchain.ts`.

## Addendum: PostgreSQL agora via Supabase

A pasta `infra/` (definições planejadas de Docker/deploy para um container Postgres
autogerenciado) e sua branch dedicada foram descartadas. O projeto passa a usar
[Supabase](https://supabase.com) como provedor hospedado de Postgres/backend-as-a-service.
`DATABASE_URL` em `apps/api/.env.example` deve apontar para a string de conexão fornecida pelo
projeto Supabase em vez de um Postgres local via Docker Compose — o restante do plano de
persistência (item 1 de "Próximas evoluções" acima) não muda, apenas quem hospeda o banco.