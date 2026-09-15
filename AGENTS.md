# AGENTS.md — botmaker-api

Instrucoes para agentes de IA neste repositorio.

## Identidade

| Item | Valor |
|------|--------|
| Repo | **vetorial-labs/botmaker-api** |
| Autoria | **Nao oficial.** Nao e SDK da Botmaker. |
| Papel | Cliente TypeScript da **API HTTP Botmaker v2** |
| Runtime | Node 20+, ESM, `fetch` nativo |
| Forma | **Um** pacote npm `@vetorial-labs/botmaker-api` com subpaths (`/chats`, `/notifications`, …) |

## Layout

| Import | Codigo | Superficie |
|--------|--------|------------|
| `@vetorial-labs/botmaker-api` | `src/` (raiz) | Tipos gerados + `createBotmakerClient` |
| `.../auth` | `src/auth/` | `GET/POST/DELETE /auth/credentials` |
| `.../channels` | `src/channels/` | canais |
| `.../chats` | `src/chats/` | chats, sessions, messages, chats-actions, `resolveChat` |
| `.../notifications` | `src/notifications/` | campanhas, envio, blacklist, `explainDelivery` |
| `.../webhooks` | `src/webhooks/` | list/get + redirection-rules |
| `.../whatsapp` | `src/whatsapp/` | accounts, status, templates |
| `.../intents` | `src/intents/` | intents |
| `.../agents` | `src/agents/` | agents + roles |
| `.../config` | `src/config/` | variables, constants, entities, knowledge-bases |
| `.../tickets` | `src/tickets/` | tickets |
| `.../ecommerce` | `src/ecommerce/` | catalogs + commerce actions |
| `.../billing` | `src/billing/` | billing, dashboards, audits, contacts, calls, media |

Spec: `specs/openapi-v2.json`. Tipos: `src/generated/schema.d.ts` (commitar apos `npm run generate`).

## Regras

1. So a superficie da OpenAPI vendida em `specs/openapi-v2.json`.
2. Auth so via header `access-token` (`BOTMAKER_ACCESS_TOKEN` ou `accessToken`).
3. Respeitar limites da spec nos helpers de alto nivel.
4. Retry automatico **so em 429**. Outros HTTP viram `BotmakerApiError`.
   Debug HTTP: `debug`/`trace` no cliente ou `BOTMAKER_DEBUG`/`BOTMAKER_TRACE`.
   Nunca logar o `access-token` em claro.
5. Paginacao segue `nextPage`. `listSessions` devolve `{ items, truncated, pages }`.
6. Nao commitar `.env` nem tokens.
7. Node 20+; ESM; imports com extensao `.js`.
8. Testes com `fetch` injetado (`src/**/*.test.ts`). Nao chamar a API real em `npm test`.
9. Nao reintroduzir workspaces npm por categoria.

## Comandos

```bash
npm install
npm run generate
npm test
npm run build
```

Workflow **build** (`.github/workflows/build.yml`): `workflow_dispatch` apenas.
Roda test + `tsc` + `npm pack` e sobe o `.tgz` como artefato `botmaker-api-tgz`.

Workflow **publish** (`.github/workflows/publish.yml`): `workflow_dispatch`.
Publica no GitHub Packages (`npm.pkg.github.com`) com `GITHUB_TOKEN`.
Nao publicar no npmjs.com sem pedido explicito. Bump de versao: `npm version` antes.

Consumo sem tgz: `npm install git+ssh://git@github.com/vetorial-labs/botmaker-api.git#main`
(`prepare` gera o `dist`). Nao reintroduzir workspaces; nao publicar no npmjs
sem pedido explicito.

## Onde mudar o que

| Pedido | Onde |
|--------|------|
| Novo path tipado da OpenAPI | `specs/openapi-v2.json` + `npm run generate` |
| Retry, querystring, paginacao, erro | `src/client.ts`, `src/pagination.ts` |
| Chats / resolveChat | `src/chats/` |
| Campanha / sent-results | `src/notifications/` |
| Outra categoria | `src/<categoria>/` + `exports` em `package.json` |

