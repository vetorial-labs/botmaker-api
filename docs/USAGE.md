# Como usar

Biblioteca TypeScript **nao oficial** para a API publica Botmaker **v2.0**.
Nao e o SDK da Botmaker.
Node 20+, ESM. Token no header `access-token`.

## Subpaths por categoria

| Import | `create*` |
|--------|-----------|
| `@vetorial-labs/botmaker-api` | `createBotmakerClient` |
| `@vetorial-labs/botmaker-api/auth` | `createAuth` |
| `@vetorial-labs/botmaker-api/channels` | `createChannels` |
| `@vetorial-labs/botmaker-api/chats` | `createChats` |
| `@vetorial-labs/botmaker-api/notifications` | `createNotifications` |
| `@vetorial-labs/botmaker-api/webhooks` | `createWebhooks` |
| `@vetorial-labs/botmaker-api/whatsapp` | `createWhatsapp` |
| `@vetorial-labs/botmaker-api/intents` | `createIntents` |
| `@vetorial-labs/botmaker-api/agents` | `createAgents` |
| `@vetorial-labs/botmaker-api/config` | `createConfig` |
| `@vetorial-labs/botmaker-api/tickets` | `createTickets` |
| `@vetorial-labs/botmaker-api/ecommerce` | `createEcommerce` |
| `@vetorial-labs/botmaker-api/billing` | `createBilling` |

Compartilhe o cliente HTTP:

```ts
import { createBotmakerClient } from "@vetorial-labs/botmaker-api";
import { createChats } from "@vetorial-labs/botmaker-api/chats";
import { createWhatsapp } from "@vetorial-labs/botmaker-api/whatsapp";

const api = createBotmakerClient({ accessToken: process.env.BOTMAKER_ACCESS_TOKEN });
const chats = createChats({ api });
const wa = createWhatsapp({ api });
```

`createChats().resolveChat({ channelId, phone })` tenta as variantes BR (com/sem 9 extra).
`listSessions` limita paginas por padrao (10 com `includeEvents`, 20 sem) para nao estourar BI.
`createWebhooks().list()` devolve `[]` se a API responder `null`.

## Instalacao

O pacote ainda nao esta no npmjs. O consumidor precisa de Node **20+**,
`"type": "module"`, `moduleResolution` `NodeNext` ou `bundler`, e leitura
no GitHub `vetorial-labs/botmaker-api`.

### 1. Direto do GitHub (sem `.tgz`)

O npm clona o repo, executa `prepare` (build) e instala. Exige SSH ou PAT.

```bash
npm install git+ssh://git@github.com/vetorial-labs/botmaker-api.git#main
```

HTTPS (CI):

```bash
npm install git+https://x-access-token:${GITHUB_TOKEN}@github.com/vetorial-labs/botmaker-api.git#main
```

```json
{
  "dependencies": {
    "@vetorial-labs/botmaker-api": "git+ssh://git@github.com/vetorial-labs/botmaker-api.git#main"
  }
}
```

Pin: `#v0.1.0` ou `#<sha>` em vez de `#main`.

### 2. GitHub Packages (depois de **Actions → publish**)

No consumidor, `.npmrc` (token fora do git):

```
@vetorial-labs:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @vetorial-labs/botmaker-api
```

```json
{
  "dependencies": {
    "@vetorial-labs/botmaker-api": "0.1.0"
  }
}
```

O pacote no GitHub Packages acompanha a visibilidade do repo. PAT/`GITHUB_TOKEN` com `read:packages`.

### 3. Artefato do GitHub Actions (manual)

No repo `vetorial-labs/botmaker-api`: **Actions → build → Run workflow**.
Baixe o artefato `botmaker-api-tgz` e, no outro projeto:

```bash
npm install ./vetorial-labs-botmaker-api-0.1.0.tgz
```

### 4. Clone local (`file:`)

```bash
git clone git@github.com:vetorial-labs/botmaker-api.git
cd botmaker-api
npm install
npm run build
```

```json
{
  "dependencies": {
    "@vetorial-labs/botmaker-api": "file:../botmaker-api"
  }
}
```

### 5. `npm pack` local

```bash
npm run build
npm pack
npm install ./vetorial-labs-botmaker-api-0.1.0.tgz
```

### 6. Token

```bash
export BOTMAKER_ACCESS_TOKEN="..."     # obrigatorio se nao passar accessToken
export BOTMAKER_API_BASE="https://api.botmaker.com/v2.0"  # opcional
```

## Cliente gerado (`botmaker-api`)

Use quando precisar de **qualquer** path da OpenAPI (canais, intents, templates, webhooks, ecommerce, …).

```ts
import {
  BotmakerApiError,
  collectPages,
  createBotmakerClient,
} from "@vetorial-labs/botmaker-api";

const api = createBotmakerClient({
  accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
});

const channels = await api.request("GET", "/channels");

const { data, error, response } = await api.openapi.GET("/intents");
if (error) {
  throw new BotmakerApiError(response.status, response.url, JSON.stringify(error));
}

const intents = await collectPages({
  first: "/intents",
  request: (method, url) => api.request(method, url),
  sleepMs: 1050,
  sleep: api.sleep,
});
```

`request` aceita URL absoluta (`nextPage`) ou path (`/chats`).
Em 429 ele espera e tenta de novo (ate 5 vezes). Qualquer outro status vira `BotmakerApiError`.

Injetar `fetch` (testes / Lambda com proxy):

```ts
const api = createBotmakerClient({
  accessToken: "...",
  fetch: myFetch,
  maxRetries: 5,
});
```

Tipos da spec:

```ts
import type { components, paths } from "@vetorial-labs/botmaker-api";

type Intent = components["schemas"]["IntentResponse"];
```

O nome exato do schema esta em `src/generated/schema.d.ts`.

## Chats (`/chats`)

Cobre o recorte de conversa / template em chat ja enderecavel
(`channelId` + `contactId` ou `chatId`).

```ts
import { createChats } from "@vetorial-labs/botmaker-api/chats";

const chats = createChats({
  accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
});
```

Compartilhar o mesmo cliente HTTP com notifications:

```ts
import { createBotmakerClient } from "@vetorial-labs/botmaker-api";
import { createChats } from "@vetorial-labs/botmaker-api/chats";
import { createNotifications } from "@vetorial-labs/botmaker-api/notifications";

const api = createBotmakerClient({ accessToken: process.env.BOTMAKER_ACCESS_TOKEN });
const chats = createChats({ api });
const notifications = createNotifications({ api });
```

### Lote (ate 500 por request)

`batchTriggerIntent` fatia sozinho. A API rejeita body com mais de 500 itens.

```ts
const resultados = await chats.batchTriggerIntent(
  items.map((row) => ({
    chat: {
      channelId: row.wabaChannelId,
      contactId: row.phoneE164,
    },
    intentIdOrName: "welcome",
    variables: { nome: row.nome },
    webhookPayload: JSON.stringify({ id: row.id }),
  })),
);
```

Um item so:

```ts
await chats.triggerIntent({
  chat: { channelId: "WABA", contactId: "5511999999999" },
  intentIdOrName: "welcome",
  variables: { nome: "Ana" },
});
```

### Mensagem em sessao aberta

WhatsApp so aceita texto livre dentro da janela de 24h. Fora dela, use template via `triggerIntent` / notifications.

```ts
await chats.sendMessages({
  chat: { chatId: "ABC123" },
  messages: [{ text: "Ola." }],
});
```

### Estado do chat

```ts
const estado = await chats.getChat("WABA:5511999999999");

await chats.updateChat("WABA:5511999999999", {
  variables: { etapa: "welcome" },
  tags: { campaign: true },
});

const recentes = await chats.listChats({
  channelId: "WABA",
  from: "2026-09-01T00:00:00Z",
});
```

`listChats` segue `nextPage` (250 por pagina, 3 req/s).
`longTermSearch: true` pesquisa alem de 7 dias e **consome cota BI**.

## Notifications (`/notifications`)

Campanha / envio outbound (WhatsApp, SMS, e-mail). Nao e o mesmo path do batch de chats.

```ts
import { createNotifications } from "@vetorial-labs/botmaker-api/notifications";

const n = createNotifications({
  accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
});

await n.createCampaign({
  name: "welcome",
  goal: "outbound welcome",
});

await n.sendNotification({
  campaign: "welcome",
  channelId: "WABA",
  name: "welcome-2026-09-14",
  intentIdOrName: "welcome",
  contacts: [
    {
      contactId: "5511999999999",
      variables: { nome: "Ana" },
      webhookPayload: "{\"id\":456}",
    },
  ],
});
```

Limite da spec neste path: **5 req/s**. O helper nao agrupa contatos alem do body que voce passar.

### Blacklist

Ate **1000** contatos por POST; o helper fatia.

```ts
await n.addToBlacklist(["5511999999999", "5511888888888"]);
await n.removeFromBlacklist("5511999999999");
const bloqueados = await n.listBlacklist();
```

### Resultados + motivo do erro (como unir)

Sao **duas APIs**. Uma nao substitui a outra.

1. **`GET /notifications/sent-results`** (totais da instancia: sent / delivered / read / error) e **`GET /notifications/sent-results/{id}`** (cada contato: `lastStatus` + timestamps). **Nao traz o texto da Meta.**
2. **`GET /sessions?include-events=true`** (cota BI). Evento `notification-error` (no console: `notification-status-error`) com `info.reason` / `info.error` — ex. `131049.0`.

Chave de juncao: `customer.sessionId` = `session.id` (formato `chatId_timestamp`). Fallback: `customer.customerId` = `chatId`.

O helper faz os dois passos:

```ts
const report = await n.explainDelivery({
  notificationName: "welcome-2026-09-14",
});

console.log(report.totals);
for (const c of report.customers) {
  console.log(c.contactId, c.lastStatus, c.errors.map((e) => e.reason));
}
```

Sessoes sozinhas (sem cruzar sent-results):

```ts
const { items: sessions, truncated } = await chats.listSessions({
  from: "2026-09-14T13:40:00Z",
  to: "2026-09-14T15:00:00Z",
  includeEvents: true,
  includeOpenSessions: true,
});
if (truncated) {
  console.warn("listSessions atingiu o teto de paginas");
}
const erros = sessions.flatMap((s) =>
  (s.events ?? []).filter((e) => e.name === "notification-error"),
);
```

Webhook do canal recebe o mesmo payload em tempo real (`webhookPayload` que voce mandou no disparo). `include-events` **nao** e health-check.

### Resultados (cuidado com BI)

```ts
const instancias = await n.listSentResults({
  from: "2026-09-01T00:00:00Z",
  to: "2026-09-14T00:00:00Z",
});

const detalhe = await n.getSentResult("notif_123");
console.log(detalhe.customers.length);
```

`getSentResult` pagina `customers` e espera **20s entre paginas** (3 req/min).
Nao use em loop apertado; grave o resultado.

## Erros

```ts
import { BotmakerApiError } from "@vetorial-labs/botmaker-api";

try {
  await chats.triggerIntent({ chat: { chatId: "x" }, intentIdOrName: "Y" });
} catch (err) {
  if (err instanceof BotmakerApiError) {
    console.error(err.status, err.url, err.body);
  }
  throw err;
}
```

## Worker / Lambda

```ts
import { createChats } from "@vetorial-labs/botmaker-api/chats";

export async function handler(event: { items: Parameters<
  ReturnType<typeof createChats>["batchTriggerIntent"]
>[0] }) {
  const chats = createChats({
    accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
  });
  return { items: await chats.batchTriggerIntent(event.items) };
}
```

Segredos: AWS Secrets Manager -> env `BOTMAKER_ACCESS_TOKEN`. Nao hardcode.

## Probe ao vivo

Script local, **sem token no git**:

```bash
export BOTMAKER_ACCESS_TOKEN="..."   # nao commitar
node scripts/live-probe.mjs
```

Saida em `reports/` (gitignored). O endpoint `GET /messages` rejeita intervalo `from`/`to`
maior que **1 mes**. Template WhatsApp precisa ser da **mesma linha** do `channelId`.

`contactId` no Botmaker e so digitos, **sem** `+`. Em celular BR o cadastro antigo
muitas vezes **nao tem o 9 extra** (11 vs 12/13 digitos com DDI). O lookup pode
devolver o chat antigo. Confira `chat.contactId` na resposta antes de disparar.
Nao use o prefixo `+` no `contactId` — isso cria **outro** chat vazio.

## O que nao fazer

- Nao mandar mais de 500 itens num POST cru de batch (o helper fatia; `api.request` nao).
- Nao usar `GET /notifications/sent-results/{id}` como health-check (custa BI, 3/min).
- Nao commitar o token.
