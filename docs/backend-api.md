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
    schemas.ts   # Schemas de validação das requisições
    store.ts     # Armazenamento temporário em memória
    types.ts     # Tipos do domínio
  tests/
    app.test.ts  # Testes dos endpoints principais
```

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

```json
{
  "name": "Cadeia de custódia",
  "adminAddress": "0xadmin",
  "steps": [
    {
      "name": "Origem",
      "requiredRole": "producer",
      "specificationHash": "hash-1"
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

## Regras atuais

- Workflows precisam ter pelo menos uma etapa.
- Um lote só pode ser criado para um workflow existente.
- Uma transferência deve informar o custodiante atual do lote.
- A etapa informada na transferência deve ser a etapa atual do lote.
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