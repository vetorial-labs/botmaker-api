# OpenAPI

Fonte da verdade dos **tipos** do pacote `@vetorial-labs/botmaker-api`
(cliente **nao oficial**). A spec e da Botmaker; os tipos e o cliente HTTP
sao deste repositorio.

| Arquivo | Papel |
|---------|--------|
| `specs/openapi-v2.json` | Spec 3.0.1 vendida (API v2.0) |
| `src/generated/schema.d.ts` | Saida do `openapi-typescript` (commitar) |

## Regenerar

```bash
# se a Botmaker publicou revisao, substitua specs/openapi-v2.json primeiro
npm run generate
npm test
npm run build
```

O gerador e `openapi-typescript`. Nao edite `schema.d.ts` na mao.

Patch local: a spec upstream referencia `#/components/schemas/RequestIdResponse`
(item de sucesso do batch `trigger-intent`) mas **nao define** o schema.
`npm run generate` insere o objeto se estiver ausente. Nao reverter esse schema
ao copiar uma revisao nova da Botmaker.

Substitua `specs/openapi-v2.json` pela revisao publicada pela Botmaker e rode `npm run generate`.

## Helpers vs spec completa

A spec tem ~103 operacoes. O nucleo tipa **todas** via `api.openapi` e `api.request`.
Os subpaths (`/chats`, `/notifications`, …) encapsulam o recorte documentado em `AGENTS.md`.
