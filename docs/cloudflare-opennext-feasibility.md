# Cloudflare Workers via @opennextjs/cloudflare: teste de viabilidade

- Data: 2026-11-12/13
- Branch: `spike/cloudflare-opennext`, a partir de `main` em `69bf6ad49` (next 16.4.6, PR #2200)
- Escopo: tudo local. Nenhuma conta Cloudflare, nenhum `wrangler deploy`/`versions upload`, nenhum DNS, Vercel ou secret.
  Bindings (R2, Durable Objects, Images, Cron) só na simulação do `wrangler dev`/miniflare.
- Comparação: o mesmo build servido por `node .next/standalone/server.js` (o equivalente a `next start` que o CI usa).

## Veredito: inviável no estado atual

A app builda e a maior parte das rotas funciona no Worker, mas há quatro bloqueios. Três não têm correção curta:

| # | Bloqueio | Gravidade | Correção conhecida |
|---|----------|-----------|--------------------|
| B1 | **Worker com 22,85 MiB gzip**, contra o limite de 10 MiB do plano pago | Impede o deploy | Não há corte único que baste; ver [Bundle](#bundle) |
| B2 | **Todo domínio whitelabel trava** (`app.opgrants.io`, `grantsapp.scroll.io`, `app.filpgf.io`…): HTML de página nunca responde e o runtime cancela o request | Derruba os tenants | Nenhuma; o contorno testado (pré-renderizar todos os tenants) quebra o build |
| B3 | **Revalidação ISR em background falha sempre** (fila DO → prerender on-demand dá `crypto.randomUUID()` / timeout), então páginas com `revalidate` ficam velhas até o próximo deploy | Conteúdo congelado | Nenhuma |
| B4 | Resume do PPR quebrava: `/project/*` e `/community/*` saíam só com o shell estático (sem `<title>`, sem conteúdo, mas status 200) | Corrigido neste branch | `experimental.maxPostponedStateSize: "20mb"` só no build Cloudflare |

B2 e B3 têm o mesmo sintoma de fundo: **o Next 16.4 não consegue pré-renderizar shell de Cache Components dentro do workerd em runtime**. O próprio Next avisa em cada isolate:
*"Next.js cannot guarantee that Cache Components will run as expected due to the current runtime's implementation of `setTimeout()`"*.
O que vem pronto do build (shells do tenant `karma`) é servido bem. O que precisa ser gerado em runtime (shells de outros tenants, revalidação) falha.
Como a app inteira depende de `cacheComponents` + `partialPrefetching` e de shells por tenant gerados sob demanda (decisão D3 em `app/t/[tenant]/layout.tsx`), isso atinge o núcleo da arquitetura atual.

O que mudaria o veredito para "viável com ressalvas":
1. Correção upstream (Next/OpenNext/workerd) do prerender de Cache Components em runtime no workerd, cobrindo B2 e B3.
2. Uma dieta de bundle que leve o Worker abaixo de 10 MiB. Ela exige mais do que remover dependências; ver abaixo.

## Versões e exceção de `minimum-release-age`

| Pacote | Versão | Publicado | Observação |
|--------|--------|-----------|------------|
| `@opennextjs/cloudflare` | 1.20.16 | 2026-11-03 | 1º com peer `next >=16.4.5` |
| `@opennextjs/aws` | 4.1.15 | 2026-11-03 | dep exata do adaptador |
| `wrangler` | 4.148.0 | 2026-10-06 | mínimo do peer `^4.148.0`; workerd/miniflare `1.20261006` |

A primeira tentativa, sem exceção, usou `@opennextjs/cloudflare` 1.20.6 + `wrangler` 4.131.1, as únicas versões com mais de 60 dias.
O build passou, mas toda request deu 500: `Unexpected loadManifest(/.next/server/preview-props.json)`.
Esse manifesto é novo no Next 16.4 e só passou a ser inlinado na 1.20.12. O peer `>=16.3.3` da 1.20.6 é só nominal.
A exceção (aprovada) está datada no `.npmrc`. Ela inclui os transitivos que o pnpm recusou: `yargs` 18.2.0 e quatro `@dotenvx/*`, todos só de CLI de build.
Conferido no metafile do esbuild: nenhum deles entra no bundle do Worker.

## O que foi configurado

- `open-next.config.ts`:
  - incremental cache em **R2** com `withRegionalCache` (`long-lived`);
  - tag cache em **Durable Object sharded** (`doShardedTagCache`, 12 shards, regional cache), em vez de D1. É o recomendado para tráfego alto e, em "next mode", guarda os timestamps de `revalidateTag(tag, profile)`/`cacheTag()`;
  - fila de revalidação em **DO** (`doQueue`);
  - `enableCacheInterception: false`, obrigatório com PPR.
- `wrangler.jsonc`:
  - `nodejs_compat` + `global_fetch_strictly_public`;
  - ASSETS, R2, os dois DOs com migração sqlite, `IMAGES` e `WORKER_SELF_REFERENCE`;
  - `triggers.crons = ["0 */6 * * *"]`;
  - sem `account_id`, de propósito.
- `cloudflare/worker.ts`: embrulha o `.open-next/worker.js` gerado e adiciona o `scheduled()` do Cron Trigger. Ele chama `/api/cron/warm-sitemaps` pelo próprio `fetch` do Worker, com o mesmo `Bearer CRON_SECRET` que a Vercel manda.
- `next.config.ts`: `KARMA_BUILD_TARGET=cloudflare` (setado só por `pnpm cf:build`) liga `experimental.maxPostponedStateSize: "20mb"` (ver B4). Vercel e o build standalone do CI não mudam. O adaptador já força `output: "standalone"`.
- `package.json`: `cf:build` / `cf:preview`. `tsconfig.json` exclui `cloudflare/`, `.open-next/` e `.wrangler/`. `.gitignore` cobre `.open-next`, `.wrangler` e `.dev.vars`.
- `app/api/spike-cache-probe/route.ts`: **rota só do spike, não mergear**.
  - Devolve um carimbo de `"use cache"` com `cacheTag("blog-list")`, o tag que o webhook do Sanity invalida.
  - `?throw=1` gera um erro não tratado, para testar o Sentry.

## Build

Máquina: 16 vCPU / 62 GB, compartilhada com outras sessões (load average entre 10 e 18 durante as medições, o que infla os tempos).
`NODE_OPTIONS=--max-old-space-size=4096`. Pico de memória = soma do RSS da árvore de processos, amostrada a cada 1 s.

| Build | Adaptador | Total | Compile | TypeScript | Static gen (537 páginas) | Pico RSS |
|-------|-----------|-------|---------|------------|--------------------------|----------|
| 1 | 1.20.6 | 216 s | 74 s | 70 s | 14,5 s | 9,5 GB |
| 2 | 1.20.16 | 307 s | ~156 s | 66 s | 16,6 s | 9,2 GB |
| sem Sentry | 1.20.16 | 244 s | 98 s | 69 s | 15,2 s | 9,1 GB |
| 3 (final) | 1.20.16 + B4 | 228 s | 83 s | 68 s | 15,0 s | 4,7 GB¹ |
| 5 (final, rebuild) | 1.20.16 + B4 | 304 s | 93 s | 69 s | 14,1 s | 4,5 GB¹ |
| só adaptador (`--skipNextBuild`) | 1.20.16 | 35 s | — | — | — | 4,6 GB |

¹ Os dois builds rodados por `pnpm cf:build` (via `cross-env`) mediram cerca de metade dos anteriores. Provavelmente é perda de amostragem, não economia real. Considere **~9,2–9,5 GB** de pico: acima dos ~7,8 GB que o `vercel-build.sh` registra na Vercel, porque aqui são 15 workers de static gen.

A etapa do OpenNext em si custa ~35 s e ~4,6 GB por cima do `next build`. Uma máquina de CI de 16 GB basta; uma de 8 GB, não.

## Bundle

| Artefato | Cru | gzip -6 |
|----------|-----|---------|
| `.open-next/server-functions/default/handler.mjs` | 84,0 MB | 19,4 MiB |
| `worker.js` empacotado pelo wrangler | 112,9 MB | 22,26 MiB |
| `resvg.wasm` + `yoga.wasm` + fonte Geist (OG) | 1,58 MB | 0,59 MiB |
| **Total do upload do Worker** | | **22,85 MiB** (limite pago: 10 MiB; free: 3 MiB) |
| O mesmo com `esbuild --minify` (medido no build 1.20.6) | 84,6 MB | ≈ 20,8 MiB |
| Build sem plugin do Sentry | | 22,70 MiB (−0,15) |

Os assets estáticos (`.open-next/assets`, 88 MB) e o cache pré-renderizado (66 MB, vai para o R2) não contam no limite.

Composição do handler, estimada pelos source maps do Turbopack (fração por fonte em cada chunk × gzip do chunk):

| Grupo | gzip estimado | % |
|-------|---------------|---|
| Web3 no SSR (Privy, viem/ox, ethers, WalletConnect/Reown, Safe, EAS, Coinbase…) | 4,2 MiB | 20% |
| Sanity Studio + editor (`/admin/studio`: sanity, @sanity/*, @portabletext, codemirror, rxjs, hls/media-chrome…) | 4,1 MiB | 19% |
| Outros node_modules (axios, zod, heroicons, ua-parser, meriyah, mixpanel…) | 3,6 MiB | 17% |
| Next.js / React runtime | 2,6 MiB | 12% |
| Código do app | 2,2 MiB | 10% |
| Shiki (gramáticas e temas, via `MarkdownPreview`/`message-response`) | 1,7 MiB | 8% |
| Sentry + OpenTelemetry (`@sentry/nextjs` em modo Node) | 1,6 MiB | 8% |
| Mermaid / cytoscape / katex (streamdown) | 1,1 MiB | 5% |

**40% dos bytes dos chunks do Turbopack são módulos repetidos**: o mesmo módulo aparece em vários chunks das camadas RSC/SSR de entradas diferentes (21,4 de 53,2 MB mapeados).
Os maiores repetidos são sanity, Privy, viem, Next e Sentry.

O que daria para cortar, em ordem de retorno (estimativas, nada aplicado):
1. **Tirar o Sanity Studio do app** (hospedar em `*.sanity.studio` ou num Worker próprio): cerca de −4 MiB.
2. **Shiki com bundle fino** (`shiki/core` + 3–5 linguagens) ou só no cliente: cerca de −1,5 MiB.
3. **Mermaid/katex só no cliente** (`dynamic(..., { ssr: false })`): cerca de −1 MiB.
4. **Trocar `@sentry/nextjs`-modo-Node por `@sentry/cloudflare`** no servidor: cerca de −1 MiB (o SDK Node arrasta OpenTelemetry).
5. **Tirar providers web3 do SSR** (Privy/wagmi só no cliente): até −4 MiB, mas mexe no bootstrap de auth.

Somando 1–4 chega-se a ~15 MiB, ainda acima do limite. Com o 5 fica perto de 10–11 MiB, sem folga para crescer.
Na prática, caber exige **dividir a app em mais de um Worker** (Studio, OG/imagens, rotas de API e o app em si) ou uma reestruturação grande do que roda no SSR.

## Testes: Worker (`wrangler dev`, build final) × Node standalone (mesmo build)

Harness HTTP próprio (status, tempo, bytes, `<title>`, headers) e Playwright headless para a navegação.
Os tempos do Worker são do workerd local, não da edge, e servem só para comparação grosseira.

| Item | Node | Worker | Evidência |
|------|------|--------|-----------|
| Home `/` | ✅ 200, 224 KB | ✅ 200, 224 KB | títulos iguais |
| `/communities` | ✅ | ✅ | |
| Comunidade `/community/optimism` | ✅ 200, title ok | ✅ só com a correção B4 | antes de B4: 200 sem `<title>`, 99 KB contra 165 KB |
| Projeto com link sem url `/project/gitcoin`, `/project/tally` | ✅ | ✅ só com B4 | sem B4: shell vazio, `Failed to parse postponed state … RangeError` |
| Projeto moderno `/project/agora` | ✅ | ✅ só com B4 | |
| 404 (rota e projeto inexistentes) | ✅ 404 | ✅ 404 | `global-not-found` renderiza igual |
| `"use cache"` + `revalidateTag` (`/api/spike-cache-probe` + webhook assinado em `/api/blog/revalidate`) | ✅ | ✅ | hit → webhook 200 (assinatura ruim → 401) → 1ª leitura stale → 2ª fresca → hit. Comportamento idêntico ao Node |
| ISR / pré-renderizado (blog, sitemap estático) servido do cache | ✅ | ✅ | entradas populadas no R2 local (513) |
| **Revalidação ISR em background** | ✅ sem erros no log | ❌ **B3** | fila DO → `HEAD /t/karma/blog` etc.: `crypto.randomUUID() while prerendering`, `TimeoutError`, *"failed after 6 retries"*; 14 eventos de Sentry vazios por rodada |
| RSC `_rsc` (nav, prefetch, segment prefetch `/_tree`) | ✅ | ✅ | 307 de cache-buster seguido de 200 `text/x-component` nos dois |
| Navegação no cliente (Playwright: communities → comunidade → projeto) | ✅ | ✅ | soft nav (sem reload), título/h1 corretos; 49 prefetches parciais por segmento no Worker, 37 no Node, todos 200 |
| OG `api/metadata/projects/gitcoin`, `communities/optimism`, `knowledge`, `scanner/og/[slug]` | ✅ | ✅ | PNG 1200×630, visualmente idênticos (encoder diferente). No Worker, `og-background.ts` não acha `public/…/background.jpg` no fs (`/bundle/public/…`), cai no fallback por CDN e manda 1 evento ao Sentry por isolate |
| `next/image` (local e remoto) | ✅ | ⚠️ inconclusivo | o binding `IMAGES` simulado levou 52–134 s ou estourou 30 s; numa rodada respondeu 200 em 241 ms mas **sem `Cache-Control`**. Em produção é Cloudflare Images (cobrado por transformação) |
| `sitemap_index.xml` + filhos | ✅ | ✅ | 4 `<loc>`, sitemap estático com 44 |
| `/api/cron/warm-sitemaps` | ✅ 401 sem token, 200 com `CRON_SECRET` | ✅ idem | |
| Cron Trigger (`/cdn-cgi/handler/scheduled?cron=0+*/6+*+*+*`) | n/a | ✅ | `scheduled` → rota → GET do índice e dos 6 filhos no host canônico (750 ms) |
| `proxy.ts`, host Karma | ✅ | ✅ | |
| `proxy.ts`, tenants (optimism, scroll, filecoin; 3 rodadas intercaladas) | ✅ sem vazamento (título e marca estáveis por host) | ❌ **B2** | todo HTML de página em host whitelabel trava até o runtime cancelar (*"Worker's code had hung"*), inclusive como 1º request do isolate. No mesmo host, `/api/geo` e `sitemap_index.xml` respondem. Vazamento entre tenants: **não testável** no Worker |
| Sentry no Worker: inicializa? | ✅ | ✅ | eventos com `runtime: cloudflare` |
| Sentry: `captureException` explícito (JSON inválido no webhook) | ✅ | ✅ | |
| Sentry: erro não tratado via `onRequestError` | ✅ | ✅ | `spike sentry probe: unhandled route error` chegou dos dois |

### Diagnóstico do B4 (corrigido)

O Next 16.4 descomprime o "resume data cache" do PPR com `inflateSync(…, { maxOutputLength: 5 × maxPostponedStateSize })`, ou seja, 500 MB no padrão.
O `node:zlib` do workerd rejeita qualquer valor acima de 134217728 (128 MiB). Reproduzido isoladamente num Worker mínimo: 500 e 256 MB dão `RangeError`; 128 MB ou menos funciona.
O resume falha e o Next serve o shell estático com 200.
Com `maxPostponedStateSize: "20mb"` o limite vira 100 MB e tudo volta. Os states reais aqui têm 9–24 KB.
Vale abrir issue no Next (ou no OpenNext, para setar isso por padrão).

### Diagnóstico do B2/B3 (aberto)

- Descartado: **Sentry**. Um build sem o plugin e com o SDK desligado tem o mesmo travamento.
- Descartado: **compartilhamento de promise entre requests**. Trava também como 1º request de um isolate novo.
- Descartado: **B4**. Continua com a correção aplicada.
- Correlação: só falha o que exige gerar shell de Cache Components em runtime: tenants (só o shell `karma` é pré-renderizado, decisão D3) e a revalidação em background.
- Contorno testado: no build Cloudflare, `generateStaticParams` devolvendo todos os tenants. O build subiu de 537 para 3022 páginas e **falhou** em `/t/karma/projects` com *"A `use cache` function took too long during prerendering"* (o indexer não aguenta a carga). Revertido.

## Dependências de `VERCEL_*` / `@vercel/*` e o que viraria

Nada abaixo foi alterado neste spike. Os itens de segurança estão marcados com 🔒.

| Onde | Uso | Na Cloudflare |
|------|-----|---------------|
| `next.config.ts` (`process.env.VERCEL`) | desliga `output: "standalone"` na Vercel | irrelevante; o adaptador força standalone |
| `next.config.ts` (`VERCEL_ENV`/`NEXT_PUBLIC_VERCEL_ENV === "preview"`) | pula o plugin do Sentry em preview | variável neutra (`NEXT_PUBLIC_DEPLOY_ENV`) setada no CI/`wrangler.jsonc` `vars`, com `NEXT_PUBLIC_VERCEL_ENV` como alias na transição |
| `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` | `enabled: NEXT_PUBLIC_VERCEL_ENV === "production"` | mesma variável neutra; idealmente trocar o servidor por `@sentry/cloudflare` (bundle menor, ver acima) |
| `next.config.ts` `withSentryConfig({ automaticVercelMonitors: true })` | monitora o cron da Vercel | `Sentry.withMonitor` dentro do `scheduled()` de `cloudflare/worker.ts` |
| `src/infrastructure/config/tenant-config.ts` | `NEXT_PUBLIC_VERCEL_ENV` define `programsChainId` (Sepolia × Arbitrum) | mesma variável neutra; **sem ela, preview/staging cai na chain de produção** |
| 🔒 `utilities/token-bridge/origins.ts` | `VERCEL_ENV`/`NEXT_PUBLIC_VERCEL_ENV === "preview"` libera origens de preview do token bridge; allowlist de `*.vercel.app` do projeto filpgf | precisa de equivalente explícito para previews Cloudflare (`*.workers.dev`/preview URLs). Falha de forma segura se a variável sumir (`NODE_ENV=production` → sem previews). Não mexido, conforme pedido |
| `utilities/env.schema.ts` / `utilities/enviromentVars.ts` | `NEXT_PUBLIC_VERCEL_ENV`, `VERCEL_URL` | renomear junto com a variável neutra |
| `utilities/fetchFromServer.ts` | `${process.env.VERCEL_URL}/api…` | **código morto** (nenhum import); apagar |
| `components/DeferredLayoutComponents.tsx` | `@vercel/analytics`, `@vercel/speed-insights` | postam em `/_vercel/*`, que não existe fora da Vercel. Remover ou trocar por Cloudflare Web Analytics (já há Mixpanel/GA) |
| `next/og` (`@vercel/og` embutido) | OG images | funciona no Worker (resvg/yoga em WASM, +0,56 MiB gzip) |
| `app/api/geo/route.ts`, `hooks/useCountryDetection.ts` | `x-vercel-ip-country`/`-region`/`-city` | `request.cf.country/region/city` (via `getCloudflareContext().cf`) ou o header `cf-ipcountry`; hoje cai sempre em `"US"` |
| 🔒 `app/api/mp/[...path]/route.ts`, `app/api/donor-research/shared/[token]/comments/route.ts` | confiam em `x-real-ip` como "setado pela plataforma, não falsificável" | **na Cloudflare o `x-real-ip` vem do cliente**. Trocar por `cf-connecting-ip` antes de qualquer cutover. Não mexido, conforme pedido |
| `utilities/og-background.ts` | `readFile(process.cwd()/public/…)` | não há fs com `public/` no Worker; ler via binding `ASSETS` ou importar o JPEG como asset |
| `vercel.json` `crons` | warm-sitemaps a cada 6 h | `triggers.crons` + `scheduled()` (feito e testado neste branch); `CRON_SECRET` vira `wrangler secret` |
| `vercel.json` `git.deploymentEnabled`, `ignoreCommand` → `vercel-ignore.sh` (`VERCEL_GIT_COMMIT_SHA/REF/PREVIOUS_SHA`) | pula deploys sem mudança | filtro de paths no GitHub Actions (ou Workers Builds) |
| `vercel-build.sh` | teto de 8 min, diagnóstico de OOM | passo de CI para `pnpm cf:build` (máquina ≥ 16 GB) |
| `.github/workflows/production.yml`, `staging.yml` | `vercel pull/build/deploy --prebuilt`, `VERCEL_TOKEN/ORG_ID/PROJECT_ID`, alias `staging.karmahq.org` e `.xyz` | `wrangler versions upload` + `versions deploy` (gradual), `CLOUDFLARE_API_TOKEN`/`ACCOUNT_ID`, custom domains no Worker. O alias `.xyz` de staging continua (regra de domínios: `.xyz` é permanente) |
| `pnpm-workspace.yaml` (`'@vercel/speed-insights': false`) | allowBuilds | sai junto com o pacote |
| `scripts/design-check.config.json` (`@vercel/og`) | isenção de inline styles | inofensivo |
| Plataforma, sem código | Data Cache/ISR persistente, Image Optimization, firewall, rolling releases, skew protection | R2 + DO (configurados aqui), Cloudflare Images (pago), WAF/regras, versions deploy gradual, `skewProtection` do OpenNext (experimental) |

## Outros achados

- O OpenNext **copia o `.env` do projeto para dentro do bundle do servidor** (`.open-next/server-functions/default/.env`). No CI de produção, o build não pode ter `.env` com segredos; segredo vai por `wrangler secret`.
- `app/api/blog/revalidate/route.ts` diz que `revalidateTag(tag, "max")` *"purges the entry rather than scheduling a refresh"*. Não é o que acontece, nem no Node: `"max"` é stale-while-revalidate, e a 1ª leitura depois do webhook ainda devolve o valor antigo. Se a intenção é expurgar, o caminho deve ser `revalidateTag(tag, { expire: 0 })` (conferir na doc do Next 16 antes de mudar). Vale nas duas plataformas.
- `fetchFromLocalApi` (`utilities/fetchFromServer.ts`) não tem nenhum consumidor.
- O pnpm troca o peer opcional `@cloudflare/workers-types` do `frames.js` (aviso "Conflicting peer dependencies"). Só tipos, sem efeito em runtime.

## Estimativa do trabalho restante (uma pessoa)

| Frente | Esforço | Risco |
|--------|---------|-------|
| B2/B3: isolar o prerender em runtime no workerd, reportar e esperar a correção upstream (ou redesenhar shells de tenant sem render on-demand) | 1–3 semanas + espera upstream | **alto**, fora do nosso controle |
| B1: levar o Worker abaixo de 10 MiB (separar Studio/OG/API em Workers próprios, client-only para Shiki/Mermaid/web3, `@sentry/cloudflare`) | 3–5 semanas | **alto**; pode não fechar sem dividir a app |
| Trocas de plataforma do inventário (variável neutra de ambiente, geo, IP 🔒, analytics, og-background, token bridge 🔒) | ~1 semana | médio (as de segurança precisam de revisão) |
| CI/CD, secrets, R2/DO/Images provisionados, custom domains (`.org` + aliases `.xyz`), Cron, observabilidade, teste de carga, cutover com rollback | 2 semanas | médio |
| **Total** | **~7–11 semanas**, das quais 4–8 com risco alto | |

Sugestão: não seguir com a migração agora.
Os próximos passos baratos que mudariam esse quadro são:
1. Abrir issues upstream com os reproduzíveis de B2/B3 e B4.
2. Medir quanto o Worker diminui só com o Studio fora e o Shiki fino (1–2 dias). Esse número diz se o B1 tem solução sem dividir a app.

## Como reproduzir

```bash
cd gap-app-v2
pnpm install --frozen-lockfile
NEXT_PUBLIC_VERCEL_ENV=production pnpm cf:build   # ~4-5 min, ~9 GB de pico
cat > .dev.vars <<'EOF'
CRON_SECRET=local-cron-secret
SANITY_WEBHOOK_SECRET=local-webhook-secret
EOF
pnpm cf:preview                                   # popula o R2 local e sobe http://localhost:8787
curl -H "Host: app.opgrants.io" http://localhost:8787/                 # B2: trava
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+*/6+*+*+*" # Cron Trigger
```

Tamanho do upload: depois do `cf:preview`, `gzip -6` em `.wrangler/tmp/dev-*/worker.js` e nos `*.wasm`/`*.bin` ao lado.
