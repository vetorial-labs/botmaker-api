# botmaker-api

Cliente TypeScript **não oficial** da **API pública Botmaker v2**
(`https://api.botmaker.com/v2.0`).

**Não** é um SDK da Botmaker, **não** é mantido nem endossado pela Botmaker.

HTTP + tipos da OpenAPI, para outros serviços Node (Lambda, workers, CLIs).

Um único pacote: `@vetorial-labs/botmaker-api`, com **subpath por categoria**.

| Import | Papel |
|--------|--------|
| `@vetorial-labs/botmaker-api` | Núcleo: tipos OpenAPI, `fetch`, 429, `nextPage` |
| `@vetorial-labs/botmaker-api/auth` | Credenciais / refresh |
| `@vetorial-labs/botmaker-api/channels` | Canais |
| `@vetorial-labs/botmaker-api/chats` | Chats, sessões, mensagens, chats-actions |
| `@vetorial-labs/botmaker-api/notifications` | Campanhas, envio, blacklist, sent-results |
| `@vetorial-labs/botmaker-api/webhooks` | Webhooks e redirection-rules |
| `@vetorial-labs/botmaker-api/whatsapp` | Contas WABA e templates |
| `@vetorial-labs/botmaker-api/intents` | Intents |
| `@vetorial-labs/botmaker-api/agents` | Agentes e roles |
| `@vetorial-labs/botmaker-api/config` | Variables, constants, entities, knowledge-bases |
| `@vetorial-labs/botmaker-api/tickets` | Tickets |
| `@vetorial-labs/botmaker-api/ecommerce` | Catálogos e commerce |
| `@vetorial-labs/botmaker-api/billing` | Billing, dashboards, audits, contacts, calls |

Guia com exemplos: **[docs/USAGE.md](docs/USAGE.md)**.
Agentes de IA: **[AGENTS.md](AGENTS.md)**.
Como regenerar tipos: **[docs/OPENAPI.md](docs/OPENAPI.md)**.

## Como usar em outro projeto TypeScript

Requisitos no consumidor: Node **20+**, `"type": "module"`, `moduleResolution` **`NodeNext`** ou **`bundler`**. Acesso de leitura ao repo GitHub `vetorial-labs/botmaker-api` (SSH ou PAT).

### Instalar direto do GitHub (sem baixar `.tgz`)

O `npm` clona o repo, roda `prepare` (`tsc`) e instala o pacote. Não precisa do artefato do Actions.

SSH (recomendado se você já clona com chave):

```bash
npm install git+ssh://git@github.com/vetorial-labs/botmaker-api.git#main
```

HTTPS com token (CI / máquina sem SSH):

```bash
npm install git+https://x-access-token:${GITHUB_TOKEN}@github.com/vetorial-labs/botmaker-api.git#main
```

No `package.json`:

```json
{
  "type": "module",
  "dependencies": {
    "@vetorial-labs/botmaker-api": "git+ssh://git@github.com/vetorial-labs/botmaker-api.git#main"
  }
}
```

Trave numa tag ou SHA se não quiser seguir `main` (`#v0.1.0` ou `#<sha>`).

### GitHub Packages (depois de publicar)

Neste repo: **Actions → publish → Run workflow**. Isso envia `@vetorial-labs/botmaker-api` para `https://npm.pkg.github.com` (mesmo org/repo). A versão é a do `package.json` (hoje `0.1.0`); republicar a mesma versão falha.

No outro projeto, `.npmrc` (o token não vai no git):

```
@vetorial-labs:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` (ou PAT) precisa de `read:packages`. Em repo privado, o pacote herda a visibilidade.

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

Não publiquei no npmjs.com (público). Para nova versão: `npm version patch` (ou minor/major), push da tag, e rode **publish** de novo.

### Instalar o `.tgz` gerado no GitHub Actions (manual)

1. Neste repositório: **Actions → build → Run workflow** (escolhe a branch).
2. No fim do run, baixe o artefato **`botmaker-api-tgz`**.
3. No outro projeto:

```bash
npm install ./vetorial-labs-botmaker-api-0.1.0.tgz
```

(o nome do arquivo inclui a versão do `package.json`.)

### Instalar via clone local

```bash
git clone git@github.com:vetorial-labs/botmaker-api.git
cd botmaker-api && npm install && npm run build
```

No `package.json` do outro projeto (ajuste o caminho):

```json
{
  "type": "module",
  "dependencies": {
    "@vetorial-labs/botmaker-api": "file:../botmaker-api"
  }
}
```

Token (não commitar):

```bash
export BOTMAKER_ACCESS_TOKEN="..."
# opcional: export BOTMAKER_API_BASE="https://api.botmaker.com/v2.0"
```

### Código

```ts
import { createBotmakerClient, BotmakerApiError } from "@vetorial-labs/botmaker-api";
import { createChats } from "@vetorial-labs/botmaker-api/chats";
import { createNotifications } from "@vetorial-labs/botmaker-api/notifications";

const api = createBotmakerClient({
  accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
});
const chats = createChats({ api });
const n = createNotifications({ api });

try {
  await chats.batchTriggerIntent([
    {
      chat: { channelId: "waba-channel-id", contactId: "5511999999999" },
      intentIdOrName: "welcome",
      variables: { nome: "Ana" },
    },
  ]);
} catch (err) {
  if (err instanceof BotmakerApiError) {
    console.error(err.status, err.body);
  }
  throw err;
}
```

Debug de HTTP: `debug: true` (metodo/URL/status) ou `trace: true` (headers
redigidos + body). Env: `BOTMAKER_DEBUG=1` / `BOTMAKER_TRACE=1`.

Mais exemplos (paginação, `explainDelivery`, `resolveChat`): **[docs/USAGE.md](docs/USAGE.md)**.

## Desenvolvimento neste repo

```bash
npm install
npm run generate    # specs/openapi-v2.json -> src/generated/schema.d.ts
npm test
npm run build
```

O workflow **ci** roda teste+build em push/PR. O workflow **build** é só manual e publica o `.tgz` como artefato.

