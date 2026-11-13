# Cloudflare Workers via @opennextjs/cloudflare: teste de viabilidade

- Data: 2026-11-12/13
- Branch: `spike/cloudflare-opennext`, a partir de `main` em `69bf6ad49` (next 16.4.6, PR #2200)
- Escopo: tudo local. Nenhuma conta Cloudflare, nenhum `wrangler deploy`/`versions upload`, nenhum DNS, Vercel ou secret.
  Bindings (R2, Durable Objects, Images, Cron) só na simulação do `wrangler dev`/miniflare.
- Comparação: o mesmo build servido por `node .next/standalone/server.js` (o equivalente a `next start` que o CI usa).

## Veredito: inviável no estado atual, com caminho conhecido

A app builda e a maior parte das rotas funciona no Worker, mas há quatro bloqueios:

| # | Bloqueio | Gravidade | Correção conhecida |
|---|----------|-----------|--------------------|
| B1 | **Worker grande demais**: 109,2 MiB descomprimido (81,8 MiB minificado) contra o limite de 64 MiB; parse do script em 1,7–1,9 s contra o limite de startup de 1 s | Impede o deploy | Dieta de bundle; ver [Bundle](#bundle) |
| B2 | **Todo domínio whitelabel trava** (`app.opgrants.io`, `grantsapp.scroll.io`, `app.filpgf.io`…): HTML de página nunca responde e o runtime cancela o request | Derruba os tenants | PR upstream ainda aberto (opennextjs-cloudflare#1318); ver [diagnóstico](#diagnóstico-do-b2b3-causa-conhecida-upstream) |
| B3 | **Revalidação ISR em background falha sempre** (fila DO → prerender on-demand dá `crypto.randomUUID()` / timeout), então páginas com `revalidate` ficam velhas até o próximo deploy | Conteúdo congelado | Mesmo PR #1318 |
| B4 | Resume do PPR quebrava: `/project/*` e `/community/*` saíam só com o shell estático (sem `<title>`, sem conteúdo, mas status 200) | Corrigido neste branch | `experimental.maxPostponedStateSize: "20mb"` só no build Cloudflare |

B2 e B3 têm a mesma causa: **o render em estágios do Cache Components não funciona no workerd quando o shell é gerado em runtime**.
O que vem pronto do build (shells do tenant `karma`) é servido bem. O que precisa ser gerado em runtime (shells de outros tenants, revalidação) falha.
Como a app inteira depende de `cacheComponents` + `partialPrefetching` e de shells por tenant gerados sob demanda (decisão D3 em `app/t/[tenant]/layout.tsx`), isso atinge o núcleo da arquitetura atual.

O que mudaria o veredito para "viável com ressalvas":
1. O PR #1318 do OpenNext (ou um backport dele via `pnpm patch`, como outros times já usam em produção) resolver B2 e B3 aqui.
2. Uma dieta de bundle que leve o Worker a ~40 MiB minificado, para caber em 64 MiB **e** no startup de 1 s.

### Atualização de 13/11 (tarde): patch #1318 aplicado

- **B2 e B3 resolvidos no local** com o backport do opennextjs-cloudflare PR #1318 como `pnpm patch` (`patches/@opennextjs__cloudflare@1.20.16.patch`):
  - os 4 tenants (`app.opgrants.io`, `grantsapp.scroll.io`, `app.filpgf.io`, `founders.polygon.technology`) respondem 200 no 1º request;
  - 4 ondas concorrentes após invalidar o tag do blog: 100/100 respostas 200;
  - revalidações em background: 200, sem `crypto.randomUUID()` com o isolate quente. Antes do reboot, a 1ª revalidação de algumas rotas num isolate frio ainda falhou uma vez e passou na retentativa.
- **Shiki enxuto:** `utilities/markdown-code-highlighter.ts` substitui o `@streamdown/code` com `shiki/core` e 16 linguagens: −8,5 MB.
- **`minify: true`** no wrangler.
- **Sentry edge descartado.** Apontar o `@sentry/nextjs` do servidor para o build `workerd` dele tirava 7 MB, mas fazia o prerender em runtime falhar sempre com `crypto.randomUUID()`: tenants em 500 e revalidação nunca concluída. O Sentry continua no SDK Node.
- **Tamanho atual: 73,9 MiB descomprimido** (limite 64). Falta ~10 MiB. O Studio servido como build estático (~13 MiB) fecharia a conta, e aguarda decisão.
- **Memória local:** o `wrangler dev` deste app usa 6–7 GB, e um build ~9 GB. Na máquina compartilhada, rodar os dois juntos travou o servidor. Rode sempre um de cada vez, com `systemd-run --scope -p MemoryMax=…`.

### Correção de 13/11

A primeira versão deste relatório media o B1 contra "10 MiB gzip". A [documentação atual de limites](https://developers.cloudflare.com/workers/platform/limits/) diz outra coisa:
*"There is no compressed size limit. Only the uncompressed bundle size counts."*
Os limites que valem são 64 MiB descomprimido (Free e Paid), startup de 1 s (parse + escopo global) e 128 MB de memória por isolate.
Os números de gzip abaixo ficam só como referência.

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

O limite que vale é o **Total Upload descomprimido: 64 MiB**. O gzip não é limite (ver a correção de 13/11).

| Artefato | Descomprimido | gzip -6 (referência) |
|----------|---------------|----------------------|
| `.open-next/server-functions/default/handler.mjs` | 84,0 MB | 19,4 MiB |
| `worker.js` empacotado pelo wrangler | 107,7 MiB | 22,26 MiB |
| `resvg.wasm` + `yoga.wasm` + fonte Geist (OG) | 1,50 MiB | 0,59 MiB |
| **Total Upload do Worker** | **109,2 MiB** (limite: 64 MiB) | 22,85 MiB |
| O mesmo com `esbuild --minify` | **81,8 MiB** (faltam 17,8 MiB, 22%) | ≈ 20,8 MiB |
| Build sem plugin do Sentry | | 22,70 MiB (−0,15) |

Startup: o limite é 1 s para parse + escopo global.
Medido com `vm.SourceTextModule` no Node 24 (o mesmo V8), num AMD EPYC Genoa: **1,7–1,9 s** para o `worker.js` sem minificar e **1,6–1,7 s** minificado.
É uma aproximação local, mas indica que o startup aperta antes do tamanho.
O valor real só aparece no `startup_time_ms` de um `wrangler versions upload`, que exige conta Cloudflare.
A memória por isolate (128 MB) também só dá para validar lá; o próprio fonte do script ocupa 80 MiB.

Os assets estáticos (`.open-next/assets`, 88 MB) e o cache pré-renderizado (66 MB, vai para o R2) não contam no limite.

Composição do handler, estimada pelos source maps do Turbopack (fração por fonte em cada chunk × gzip do chunk; o tamanho descomprimido de cada grupo está na lista de cortes abaixo):

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

O que daria para cortar, em ordem de retorno (tamanho descomprimido de cada grupo no handler; estimativas, nada aplicado):
1. **Tirar o Sanity Studio do app** (hospedar em `*.sanity.studio` ou num Worker próprio): cerca de −14 MB.
2. **Shiki com bundle fino** (`shiki/core` + 3–5 linguagens) ou só no cliente: cerca de −9 MB.
3. **Trocar `@sentry/nextjs`-modo-Node por `@sentry/cloudflare`** no servidor: cerca de −5 MB (o SDK Node arrasta OpenTelemetry).
4. **Mermaid/katex só no cliente** (`dynamic(..., { ssr: false })`): cerca de −4 MB.
5. **Tirar providers web3 do SSR** (Privy/wagmi só no cliente): até −14 MB, mas mexe no bootstrap de auth.

Com 1–4 e `minify: true`, o Worker iria de 81,8 para ~50 MiB: **cabe nos 64 MiB**.
Pela medição local (~20 ms por MiB), o parse ainda ficaria perto de 1 s.
Para ter folga no startup, falta um destes: o item 5 (→ ~37 MiB), carregar o handler como módulo separado sob demanda (a testar), ou dividir a app em mais de um Worker com service bindings.
O build do adaptador já gera funções separadas (`config.functions`), mas o roteamento entre Workers teria de ser nosso.

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
| Carga direta de documento no browser, hidratação (`/project/tally`, `gitcoin`, `agora`, `/community/optimism`) | ✅ | ✅ com B4 | h1 visível e hidratado nas 4, nenhum `div[hidden][id^="S:"]` sobrando, nenhum React #419. No Worker, 1 React #418 (texto divergente) em `/project/agora`, sem par no Node; bate com opennextjs-cloudflare#1321 |
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

Já é conhecido upstream: opennextjs-cloudflare#1349 e #1225 descrevem o mesmo `RangeError` e a mesma correção (`25mb`).
A #1349 relata um segundo problema que aparece depois desta correção. O OpenNext re-empacota o servidor com esbuild sem `keepNames`, os nomes de componentes que colidem mudam (`io` → `io2`) e o resume é descartado (*"Expected the resume to render <io> … rendered <io2>"*).
Aqui o log do build final não tem nenhum desses erros e a hidratação passou. Se aparecer, a correção relatada é um `pnpm patch` com `keepNames: true` no `bundle-server` do adaptador.

### Diagnóstico do B2/B3: causa conhecida upstream

**Causa** (opennextjs-cloudflare PR #1318, *"run Cache Components staged renders correctly on workerd"*):
- O Next renderiza uma página de Cache Components em estágios e detecta o fim de cada estágio com `process.nextTick`.
- No workerd, `process.nextTick` é uma microtask (cloudflare/workerd#7687), então o estágio termina cedo.
- Isso corrompe todo prerender feito **em runtime**: shells de tenants que não vieram do build (B2) e a regeneração de shells na revalidação (B3).
- O PR troca o `runInSequentialTasks` do Next por uma implementação para workerd.

**Por que vira travamento** (opennextjs-cloudflare#1468): o wrapper `cloudflare-node` só resolve a resposta quando os headers são escritos. Se o render falha antes do primeiro chunk, a promise nunca resolve e o runtime cancela o request. Um comentário reproduz isso com Next 16.4.5 + `cacheComponents` + adaptador 1.20.16.

**Estado em 13/11/2026:**
- O PR está aberto, não mergeado, e foi atualizado em 12/11.
- Os mantenedores disseram em 5/11 que outras correções vêm antes.
- Dois times relatam backport via `pnpm patch` em produção desde 3/11. Um deles descreve o mesmo sintoma do B3: o 1º request depois de expirar um shell dava *"Worker's code had hung"*, e o patch resolveu.

**O que foi descartado aqui:**
- **Sentry**: um build sem o plugin e com o SDK desligado tem o mesmo travamento.
- **Compartilhamento de promise entre requests**: trava também como 1º request de um isolate novo.
- **B4**: continua com a correção aplicada.

O aviso de `setTimeout()` que o Next imprime é outro detalhe do mesmo módulo: o `_idleStart`, propriedade só dos timers do Node, não existe no workerd. Ele é só um alerta.

**Contorno testado:** no build Cloudflare, `generateStaticParams` devolvendo todos os tenants. O build subiu de 537 para 3022 páginas e **falhou** em `/t/karma/projects` com *"A `use cache` function took too long during prerendering"* (o indexer não aguenta a carga). Revertido.
Isso também não resolveria o B3.

Outras issues abertas no adaptador que tocam o que a app usa:
- #1455: memória retida em prerender de ISR em runtime (~1,4 MB por render), relevante com o limite de 128 MB.
- #1103: volume de requests e duração cobrada do `DOShardedTagCache`, relevante para o objetivo de custo.
- #1321: hidratação #418 intermitente.

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
| B2/B3: aplicar o PR #1318 como `pnpm patch` revisado e validar (tenants, revalidação, ondas concorrentes após invalidar tag); depois trocar pelo release oficial | ~1 semana + espera do release | médio; usar código não lançado exige exceção na política de dependências |
| B1: Studio fora, Shiki fino, Mermaid no cliente, `@sentry/cloudflare`, `minify`; medir `startup_time_ms` real; se faltar folga, web3 fora do SSR ou divisão em Workers | 2–4 semanas | médio a alto; o startup é o risco maior |
| Trocas de plataforma do inventário (variável neutra de ambiente, geo, IP 🔒, analytics, og-background, token bridge 🔒) | ~1 semana | médio (as de segurança precisam de revisão) |
| CI/CD, secrets, R2/DO/Images provisionados, Cron, observabilidade, teste de carga | ~2 semanas | médio |
| Domínios: zonas `karmahq.org`/`.xyz` hoje no Route 53, tenants externos (`app.filpgf.io` na Namecheap, `grantsapp.scroll.io` na Cloudflare da própria Scroll) via Cloudflare for SaaS; cutover com rollback | ~1–2 semanas, dependendo dos donos dos domínios | médio |
| **Total** | **~7–10 semanas**, mais a espera do release do #1318 | |

Primeiro passo sugerido: uma fase de 1–2 semanas para provar que B1–B3 caem.
Ela inclui aplicar o #1318 como patch, fazer a dieta de bundle e medir o startup real num Worker não produtivo em `workers.dev`.
Para isso é preciso uma conta Cloudflare, só para `wrangler versions upload`, sem DNS.

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
