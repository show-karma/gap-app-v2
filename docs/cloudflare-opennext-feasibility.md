# Cloudflare Workers via @opennextjs/cloudflare: teste de viabilidade

- Data: 2026-11-12/13
- Branch: `spike/cloudflare-opennext`, a partir de `main` em `69bf6ad49` (next 16.4.6, PR #2200)
- Escopo: tudo local. Nenhuma conta Cloudflare, nenhum `wrangler deploy`/`versions upload`, nenhum DNS, Vercel ou secret.
  Bindings (R2, Durable Objects, Images, Cron) só na simulação do `wrangler dev`/miniflare.
- Comparação: o mesmo build servido por `node .next/standalone/server.js` (o equivalente a `next start` que o CI usa).
- **18/11/2026:** primeiro teste numa conta Cloudflare real, abaixo. As seções seguintes são o registro do spike local de 12–13/11.

## Teste em conta real (18/11/2026)

- Branch `feat/cloudflare-workers` (base `migration-cloudflare`, que já tem o main atual e as variáveis neutras do #2205).
- Conta Cloudflare "Karma" (Workers Paid). Worker de teste `gap-app-v2-staging-test`, só em `https://gap-app-v2-staging-test.dawn-sound-c6f7.workers.dev`.
  Sem rotas, zonas, DNS, custom domains, crons nem mudança na Vercel (conferido pela API ao final: `workers/domains` vazio, `schedules` vazio).
- Variáveis de staging, as mesmas que a Vercel staging usa: indexer `https://stagapi.karmahq.org`, `NEXT_PUBLIC_ENV=staging`, `APP_ENV`/`NEXT_PUBLIC_APP_ENV=preview` (Sentry desligado, como na staging), Sanity `tc4p00d9/production`.
  O build rodou **sem `.env`** no diretório (variáveis só pelo ambiente do processo). Conferido: nenhum `.env` em `.open-next/server-functions/default/`.
- Comparação: `staging.karmahq.org` (Vercel) nas mesmas URLs, no mesmo horário e do mesmo cliente (dev box, colo IAD).

### Veredito: precisa de cortes (não está pronto para staging)

O Worker sobe, cabe no limite e serve todas as rotas certas, tenants incluídos. Três problemas impedem usar como staging de verdade:

| # | Problema | Evidência | Gravidade |
|---|----------|-----------|-----------|
| R1 | **Quase todo request cai num isolate novo**, porque o heap do app (134–145 MiB) passa do limite de 128 MiB e a Cloudflare descarta o isolate em silêncio. Cada isolate novo carrega o servidor Next inteiro: 1,5–3,5 s de CPU e 2–7 s de TTFB por request, contra ~0,2 s na Vercel | header `x-karma-isolate`: 2 de 24 requests sequenciais, 1 de 14 sem carregar o Next e 1 de 12 multiplexados numa conexão HTTP/2 reaproveitaram isolate; `/api/geo` (rota trivial) gasta 1,5–2 s de CPU | Bloqueia latência **e** custo |
| R2 | **Shell de `/project/*` e `/community/*` do host Karma não se regenera em runtime**: `Route "/t/[tenant]/project/[projectId]": Next.js encountered uncached or runtime data during prerendering` | cache R2 vazio: 8 de 9 requests sequenciais deram 500, com o patch #1318 antigo **e** com o head novo; tenants e blog passam | Alto: qualquer perda de entrada no R2 ou regeneração do shell vira 500 |
| R3 | 1ª onda concorrente depois de um deploy: 2 de 25 com 500 (`/community/optimism`, mesmo erro do R2) | ondas 2–4 com 25/25 | Médio; mesma causa do R2 |

`startup_time_ms` **não** é o problema: 27–59 ms em 10 uploads, contra o limite de 1 s. Por isso não parei antes do corte de web3.
O número é baixo porque o `worker.js` do OpenNext só importa o handler de 57 MiB dentro do primeiro `fetch` de cada isolate. O parse acontece então dentro do request e aparece como CPU do request, não como startup (ver R1).

**Causa do R1, confirmada (18/11, noite): memória.** O isolate do app passava de 128 MiB de heap. A Cloudflare então descarta o isolate ao fim do request, sem erro e sem registro. Metade desse heap era o fonte do script guardado em UTF-16 por causa de 1.543 caracteres não Latin-1 em regex (item 3); isso está corrigido.

1. **O limite, medido na plataforma.** Subi versões temporárias do próprio `gap-app-v2-staging-test`: um script mínimo, com stubs dos dois Durable Objects, que guarda N MiB de heap no 1º request. Foram 25 requests sequenciais por variante, e a versão do app foi restaurada no fim (`44f4b750`).

   | Heap retido pelo script | Requests que reaproveitaram isolate | Isolates distintos |
   |---|---|---|
   | ~0 | 13 / 25 | 12 |
   | 64 / 100 / 110 / 120 MiB | 6 / 6 / 10 / 7 | 19 / 19 / 15 / 18 |
   | 124 MiB | 14 / 25 | 11 |
   | **130 MiB** | **0 / 25** | **25** |
   | **140 MiB** | **0 / 25** | **25** |
   | ~0, mas com fonte de 57 MiB (comentários) | 10 / 25 | 15 |

   - O corte fica entre 124 e 130 MiB: é o limite de 128 MiB.
   - Acima dele, todos os requests responderam 200, e os Workers Logs registram `outcome: ok`, level `info`. A plataforma não dá nenhum sinal.
   - O tamanho do fonte, sozinho, não impede reuso.
   - O script mínimo também espalha os requests por ~12 isolates no colo IAD. O reuso de 2 em 24 do app não é efeito de roteamento.

2. **O heap do app, medido no workerd local.** Mesmo build, `wrangler dev`, leitura do `Runtime.getHeapUsage` pelo inspector logo depois de um `HeapProfiler.takeHeapSnapshot`, que força GC completo.
   - O `HeapProfiler.collectGarbage` não responde no workerd, por isso o GC foi forçado pelo snapshot.
   - O proxy do inspector exige `Origin: http://localhost`.
   - Os números são locais, mas é o mesmo V8 e o mesmo script. A calibração acima mostra que o limite remoto bate com o heap do V8.

3. **De onde vinham 57 MiB: o fonte em UTF-16.**
   - O V8 guarda o fonte de um script com 1 byte por caractere quando todos são Latin-1 (≤ U+00FF), e com 2 bytes por caractere se houver um único fora disso.
   - O `worker.js` tinha 1.543 caracteres acima de U+00FF, todos em **literais de regex**: os modos legados do CodeMirror (palavras-chave do Gherkin em dezenas de idiomas, glifos do APL), travessões e reticências de tipografia.
   - O esbuild escapa strings, templates e identificadores para ASCII, mas **nunca escapa regex**, nem com `charset: "ascii"` (testado em 0.27.7, 0.28.1 e 0.28.2).
   - Resultado: 57 Mi caracteres × 2 bytes ≈ 114 MiB de heap só para o texto do script.
   - **Correção:** `scripts/build-worker-bundle.mjs` (`pnpm cf:size`) gera o bundle exato do upload, faz o parse com acorn e reescreve só os caracteres dentro de literais de regex (e comentários) como `\uXXXX`, que significam o mesmo em qualquer regex, com ou sem flag `u`. Se sobrar algum caractere acima de U+00FF fora disso, o build **falha**. `pnpm cf:upload` envia esse arquivo como está (`--no-bundle`).

   Heap no workerd local, mesmo build, antes e depois da correção. Na tabela "antes", as páginas responderam 404, porque o proxy não reconheceu o host `127.0.0.1`. Na "depois", com `localhost`, todas renderizaram 200:

   | Momento | Antes (UTF-16, páginas em 404) | Depois (Latin-1, páginas em 200) |
   |---|---|---|
   | Script avaliado, nenhuma página | **118,3 MiB** | **61,1 MiB** |
   | Depois de `/communities` | 133,8 MiB | 77,3 MiB |
   | Depois de `/` | 134,1 MiB | 77,6 MiB |
   | Depois de `/project/gitcoin` | 134,4 MiB | **108,8 MiB** (+31 MiB nessa página) |
   | Depois de `/community/optimism` | 134,6 MiB | 110,0 MiB |
   | Depois da rota OG | 143,9 MiB | 118,5 MiB |
   | Depois de `/blog` | | 127,6 MiB |
   | Regime (mais 12 requests) | **145,1 MiB** | **123,9 MiB** |

   Na conta, com o bundle Latin-1 (versão `2e64cdc0`):

   | | Antes | Depois |
   |---|---|---|
   | Requests sequenciais que reaproveitaram isolate | 2 / 24 | **12 / 24** (script mínimo: 13 / 25) |
   | Tenants que reaproveitaram isolate | | 17 / 24, TTFB p50 0,53 s |
   | 4 ondas de 25, cache do build | 84 × 200, 2 × 500, 14 resets | **100 × 200** |
   | p50 da onda depois da 1ª | 5–9 s | **0,7–1,3 s** |
   | CPU por invocação, p50 / média | ~2,7 s | **474 ms / 1,3 s** (39% abaixo de 200 ms) |
   | Erros nos Workers Logs | | 0 em 148 invocações |
   | Vida máxima de um isolate | | 9 requests, 157 s, 4–6 rotas diferentes |

**Consequência:** a correção Latin-1 devolve ~57 MiB, e o Worker passa a reaproveitar isolate como um script mínimo. A folga, porém, ficou pequena, e por isso o heap restante foi investigado (itens 4 e 5).
- A média de CPU (1,3 s) ainda é puxada pelos ~25 isolates frios que este teste cria. Com tráfego contínuo a fração de frios cai, mas isso não dá para medir daqui.
- Medir cada corte com o mesmo procedimento: heap local pelo inspector (com `localhost`), depois reuso na conta com `x-karma-isolate`.

4. **O que sobrava no heap (19/11).** Snapshot de um isolate quente, depois de todas as rotas:

   | O quê | MiB |
   |---|---|
   | Fonte do script (Latin-1) | 57,2 |
   | **Memória WASM do resvg e do yoga** (imagens OG) | **31,2** (16,0 + 15,2) |
   | Código compilado (bytecode, código de máquina) | 26 |
   | Arrays, objetos, resto | ~12 |

   - **O `Runtime.getHeapUsage` não inclui a memória WASM**, e o limite da Cloudflare inclui (heap JS + WebAssembly). Os números de heap das tabelas acima não contam esses 31 MiB.
   - A memória WASM só aparece em isolates que renderizaram uma imagem OG. Ela nunca diminui.
   - As OG são buscadas por crawlers de redes sociais, não por browsers, então a fração do tráfego deve ser pequena (não medida).
   - Isolar as OG em outro Worker não é caminho suportado: o adaptador gera "functions" separadas, mas o template do Worker só carrega a `default`.

5. **O culpado da página de projeto: tabelas de ENS montadas no carregamento.**
   - O diff de snapshots (objetos novos por id, entre `/communities` e `/project/gitcoin`) mostrava 30,8 MiB novos, dos quais **~10 MiB eram as tabelas de um `Set`**.
   - A cadeia de retenção bate com o `@adraffy/ens-normalize` (grupos com Sets `P`/`V`, `VALID`, `MAPPED`).
   - A versão 1.9.2 monta essas tabelas no carregamento do módulo; da 1.10 em diante, só na 1ª normalização.
   - Quem trazia a 1.9.2: `@show-karma/karma-gap-sdk` → `@gelatonetwork/relay-sdk@5.6.0` → `ethers@6.7.0`, uma 2ª cópia do ethers ao lado da 6.11.0 do app.
   - **Correção:** uma resolution `"@gelatonetwork/relay-sdk>ethers": "6.11.0"`. O relay SDK só usa APIs estáveis do ethers 6, e o app nem usa o caminho do Gelato. Saem do bundle o `ethers@6.7.0` e o `ens-normalize@1.9.2` (−0,43 MiB).

   Heap no workerd local, isolate novo, cache populado:

   | Passo | Antes | Depois |
   |---|---|---|
   | Script avaliado | 61,1 MiB | 60,6 MiB |
   | `/communities` | 77,3 MiB | 76,8 MiB |
   | `/project/gitcoin` | 108,8 MiB (+31) | **95,3 MiB (+18,5)** |
   | `/community/optimism` | 110,0 MiB | **96,8 MiB** |
   | `/blog` | 127,6 MiB | **96,9 MiB** |

   - O que sobra na página de projeto (18,1 MiB de objetos novos) é espalhado. São 8,7 MiB de código compilado de muitos módulos: EAS SDK com ABIs e bytecode de contratos, Karma SDK, markdown-it, mime-db. Não há mais uma estrutura grande isolada; cortar mais exige não avaliar esses módulos no servidor (o corte de web3, deixado de lado por enquanto).
   - **Na conta (versão `67f4fa0c`), a diferença não aparece nas rodadas normais:** sequencial 9/24 reuso (antes 12/24), tenants 21/24 (antes 17/24), ondas 100/100 nas duas, CPU p50 665 ms (antes 474). Está dentro do ruído, porque esse tráfego raramente leva um isolate por todas as rotas.
   - Um A/B ciclando todas as rotas, OG incluída, saiu inconclusivo: os isolates da versão nova já estavam quentes da rodada anterior, e os da antiga começaram frios.
   - O ganho confirmado é o local: **~27 MiB a menos num isolate quente**, que passa a ficar em ~97 MiB de heap JS, ou ~128 MiB com a memória WASM das OG.

**Custo, com o que foi medido:** a estimativa anterior supunha 20–100 ms de CPU por invocação; o medido é 1,5–3,5 s.
Com ~7M requests por ciclo, 2 s de média dariam ~14 bilhões de ms de CPU, ≈ US$ 280/mês só de CPU, acima dos ≈ US$ 140–160 do gap na Vercel.
A conta só fecha se o R1 for resolvido, com reuso de isolate e CPU de request na casa das dezenas de ms.

### Números medidos

Build e tamanho:

| Item | Valor |
|------|-------|
| `pnpm cf:build` | ok; compile 74 s, TypeScript 65 s, 426 páginas estáticas |
| `pnpm cf:size` | **58,72 MiB** (orçamento 62, limite 64); `worker.js` 57,21 MiB |
| Upload real (`wrangler versions upload`) | 60.141 KiB descomprimido / 15.504 KiB gzip |
| `Worker Startup Time` | **27–59 ms** (10 uploads) |

Por rota, requests sequenciais (quase todos em isolate frio). CPU e wall vêm dos Workers Logs; TTFB é do cliente. Versão `a08a69ce`, cache R2 populado com o build:

| Rota | Status Worker / Vercel | CPU p50 (máx) | Wall p50 | TTFB Worker p50 | TTFB Vercel p50 | HTML Worker / Vercel |
|------|------------------------|---------------|----------|-----------------|-----------------|----------------------|
| `/` | 200 / 200 | 3.201 ms (7.646) | 3.928 ms | 4,47 s | 0,22 s (HIT) | 224 / 223 KB |
| `/communities` | 200 / 200 | 2.530 ms (6.098) | 3.488 ms | 4,29 s | 0,21 s (HIT) | 58 / 57 KB |
| `/community/optimism` | 200 / 200 | 3.525 ms | 5.493 ms | 7,06 s | 0,26 s | 232 / 157 KB |
| `/project/gitcoin` | 200 / 200 | 3.336 ms (5.618) | 4.476 ms | 6,18 s | 0,22 s (HIT) | 177 / 116 KB |
| `/project/tally` | 404 / 404 | 41 ms | 188 ms | 1,96 s | 0,18 s | o projeto não existe no indexer de staging; paridade |
| 404 (rota inexistente) | 404 / 404 | 1.987 ms | 2.189 ms | 3,58 s | 0,23 s | 5,7 / 5,7 KB |
| OG `/api/metadata/projects/gitcoin` | 200 / 200 | 2.652 ms | 3.189 ms | 4,79 s | 0,18 s (2,8 s no MISS) | PNG 173 / 149 KB |
| `/sitemap_index.xml` | 200 / 200 | 1.826 ms | 2.037 ms | 3,59 s | 0,17 s | 507 / 507 B |
| `/api/geo` | 200 | 1.500–2.000 ms | ~2.000 ms | 3,4 s | | |
| `/__karma/isolate` (não carrega o Next) | 200 | | | 1,5–2,5 s frio, **0,16 s quente** | | |

- A Vercel responde do CDN (`x-vercel-cache: HIT`). No Worker não existe CDN na frente: todo request executa o Worker.
- O HTML de `/community/optimism` e `/project/gitcoin` sai ~50% maior no Worker. Não investigado.
- **Memória:** o `process.memoryUsage()` do Workers é stub, e o Workers Logs não expõe memória. O heap foi medido no workerd local pelo inspector (ver a causa do R1): 134–145 MiB depois que o Next carrega. Nenhum `exceededMemory` nos logs, mesmo acima do limite.

Tenants pelo header de teste `x-karma-test-host` (sem DNS; `cloudflare/worker.ts`, só com `TEST_WORKER=1`):

| Host | `/` | `/communities` | `/project/gitcoin` |
|------|-----|----------------|--------------------|
| `app.opgrants.io` | 200 "Optimism Funding Opportunities" | 200 | 200 |
| `grantsapp.scroll.io` | 200 "Scroll Funding Opportunities" | 200 | 200 |
| `app.filpgf.io` | 200 "Filecoin Funding Opportunities" | 200 | 200 |
| `founders.polygon.technology` | 200 "Polygon Funding Opportunities" | 200 | 200 |

O B2 está resolvido na conta real: nenhum tenant travou, e a marca ficou estável por host nas duas rodadas.
O `Host` não pode ser trocado direto no `workers.dev`: a Cloudflare roteia pelo Host, e `Host: grantsapp.scroll.io` iria para a zona da própria Scroll.

Concorrência, 4 ondas de 25 requests (mistura de Karma, tenants, OG, sitemap e blog):

| Rodada | Cache | Patch #1318 | 200 | 500 | Outros |
|--------|-------|-------------|-----|-----|--------|
| 1 | R2 vazio (prefixo novo), isolates novos | `9dbb209` | 93 | 7 | |
| 2 | R2 vazio, isolates novos | `9dbb209` | 76 | 22 | 2 resets |
| 3 | R2 do build, isolates novos | `4879fe2` | 84 | 2 (1ª onda) | 12 resets (1ª onda), 2 (2ª) |
| Vercel staging (só rotas Karma, 2 ondas) | | | 50 | 0 | p50 1,07 s → 0,25 s |

- Todos os 500 têm o erro do R2.
- Os resets só aparecem no cliente HTTP/1.1 do harness, entre 6 e 30 s. A mesma onda fria com `curl` (HTTP/2) deu 25/25. Parte desses requests consta como 200 nos logs. Considero inconclusivo, não falha do Worker.
- Sob concorrência há reuso (13–19 isolates para 25 requests). Mas requests concorrentes num isolate dividem a mesma thread, então a latência não melhora (p50 5–9 s).
- O erro do Sentry (`crypto.randomUUID()` no prerender) não apareceu. O Sentry está desligado em preview, então essa correção ficou sem prova na conta real.

Revalidação:

| Teste | Resultado |
|-------|-----------|
| Por tag (`/api/cache-probe` + webhook assinado em `/api/blog/revalidate`) | ✅ mesmo carimbo em 3 isolates diferentes (tag cache DO compartilhado); assinatura errada → 401; certa → 200; 1ª leitura stale (`"max"` = SWR), 2ª em diante fresca |
| Em background pela fila DO (`/blog` depois de vencer) | ✅ `HEAD /t/karma/blog` → 200, duas vezes, sem erro (o B3 do spike está resolvido nessa rota) |
| Shell de `/project/*` e `/community/*` regenerado em runtime | ❌ R2 |

Erros nos Workers Logs:

| Erro | Situação |
|------|----------|
| `Invalid client environment variables: NEXT_PUBLIC_GAP_INDEXER_URL … received undefined` + `Failed to prepare server` em todo request | **Corrigido** neste branch (`fix(env)`): `utilities/env.ts` validava o `process.env` de runtime, que no Worker não tem as `NEXT_PUBLIC_*`. No spike não apareceu porque o `.env` ia copiado para o bundle. Derrubava o `instrumentation.ts` e todo módulo que importa `clientEnv` (Sanity, blog, revalidação) |
| `encountered uncached or runtime data during prerendering` | Aberto (R2/R3) |
| `` `body` unknown or invalid utility `` (warn, rota OG) | inofensivo, aviso do Tailwind do Satori |

Os Workers Logs perdem a 1ª linha de erros longos (chegam só o stack e a dica do Next). Para a mensagem completa use `wrangler tail`.
O Sentry está desligado em preview, por decisão (paridade com a staging). O conector do Sentry também não está autenticado nesta sessão.

Outros achados:
- **`next/image`** funciona pelo binding `IMAGES`, mas responde **sem `Cache-Control`**, com PNG ~40% maior que o da Vercel e em 2,4–3,8 s. Toda transformação é cobrada.
- **Cache regional:** a Cache API é no-op em `*.workers.dev`, então o `withRegionalCache` não atua neste teste: toda leitura vai ao R2. Num custom domain ele atua; não medido.
- **`opennextjs-cloudflare populateCache remote` falha nesta máquina:** o proxy local do workerd recusa conexão (`ECONNREFUSED 127.0.0.1`). O cache foi populado pela API REST do R2, com as mesmas chaves que o adaptador calcula.
  Um `wrangler deploy` em projeto OpenNext delega para `opennextjs-cloudflare deploy`; com `OPEN_NEXT_DEPLOY=true` ele faz o deploy direto.
- **Token com filtro de IP:** a dev box sai por IPv6 e o token só aceita o IPv4. Os comandos rodaram com `NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"` e `curl -4`.
- **R2 precisou ser habilitado no dashboard** antes do primeiro bucket (`code 10042`).

### Patch #1318 atualizado

O backport passou de `9dbb209` (30/10) para o head do PR, `4879fe2` (18/11). Em 16/11 o mantenedor apontou que, no workerd, I/O pode completar entre dois callbacks de timer e *"uncached data can end up cached"*. Os commits `f501eb5` e `4879fe2` mantêm os estágios num único task e usam o checkpoint de microtask do workerd (`unhandled_rejection_after_microtask_checkpoint`, ligado por padrão a partir da compat date 2026-03-03; a nossa é 2026-09-01).
Foi aplicado como o delta do `dist` entre os dois commits (build do adaptador nos dois), por cima do patch existente. **Não resolveu o R2:** mesmo erro, 8 de 9 com o cache vazio.
O PR continua aberto; a política de dependências precisa da mesma exceção já aprovada para o backport.

### Recursos criados na conta (para apagar depois)

| Recurso | Nome / id | Como apagar |
|---------|-----------|-------------|
| Worker | `gap-app-v2-staging-test` (10 versões; `workers.dev` ligado) | `wrangler delete gap-app-v2-staging-test` |
| Durable Object namespace | `DOQueueHandler` (`4d12b229b92f46bd9e3fab1654293533`) | sai com o Worker |
| Durable Object namespace | `DOShardedTagCache` (`bdaf59a42cd845d78aae9b62fe746262`) | sai com o Worker |
| Bucket R2 | `gap-app-v2-staging-test-opennext-cache` (prefixos `incremental-cache/`, `wave-empty-1/`, `wave-empty-2/`, `wave-empty-3/`) | esvaziar e `wrangler r2 bucket delete gap-app-v2-staging-test-opennext-cache` |
| Secret | `SANITY_WEBHOOK_SECRET` no Worker (valor de teste aleatório, não é o da Sanity) | sai com o Worker |

O subdomínio `dawn-sound-c6f7.workers.dev` já existia na conta. Nenhum outro Worker, KV, D1, rota, domínio ou cron foi criado.
A plataforma ainda pode reter um preview efêmero `open-next-cache-populate`, criado pela tentativa do `populateCache` (não aparece em `workers/scripts`).

### Próximos passos sugeridos

1. **R1 primeiro (causa confirmada: heap acima de 128 MiB):** reduzir o heap residente em ≥ 20 MiB (web3 fora do SSR, Sentry, dividir em Workers) e medir cada corte: heap local pelo inspector, depois reuso na conta com `x-karma-isolate`.
2. **R2:** reproduzir no Node com o shell de fallback ausente, para saber se é a app (dado fora de `"use cache"` antes do `<Suspense>` em `/t/[tenant]/project/[projectId]` só no host Karma) ou o adaptador. Tenants não falham, o que aponta para algo específico do tenant `karma`.
3. Repetir as ondas com o Sentry ligado, para provar a correção do `cloudflare/worker.ts`.

### Como repetir na conta

```bash
cd gap-app-v2
mv .env /algum/lugar/fora   # o build não pode ter .env: o OpenNext o copia para o bundle
set -a; . /caminho/build-env.staging; set +a   # só NEXT_PUBLIC_* e APP_ENV=preview
pnpm cf:build && pnpm cf:size
export CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… OPEN_NEXT_DEPLOY=true \
  NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"
# popular o R2 com .open-next/cache (populateCache remote, ou a API REST do R2)
npx wrangler versions upload --var CACHE_PROBE_ENABLED:1 --var TEST_WORKER:1
npx wrangler versions deploy <version-id>@100% --yes
curl -H "x-karma-test-host: app.opgrants.io" https://gap-app-v2-staging-test.<subdomínio>.workers.dev/
```

## Spike local (12–13/11)

### Veredito: inviável no estado atual, com caminho conhecido

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

### Atualização de 13/11 (noite): Studio estático, Worker abaixo de 64 MiB

- **Tamanho: 63,0 MiB descomprimido** (limite 64; folga de ~1 MiB). Parse local ~0,9 s (limite de startup 1 s, ainda a validar no `startup_time_ms` real).
- **Sanity Studio estático, mesmo endereço.** No build Cloudflare a rota do Next fica de fora:
  - os arquivos dela se chamam `*.studio.tsx` e só o build fora da Cloudflare põe `studio.tsx` em `pageExtensions`;
  - um `next build` normal (caminho da Vercel) continua listando `/t/[tenant]/admin/studio/[[...tool]]`.
- **Como o Studio é gerado e servido:**
  - `pnpm cf:build:studio` (`sanity build`, config em `sanity.cli.ts`) gera 7 MB em `.open-next/assets/admin/studio`;
  - o Worker responde por `/admin/studio/*` (`run_worker_first`), devolve o `index.html` nas rotas do Studio e aplica `X-Frame-Options: SAMEORIGIN`, CSP `frame-ancestors 'self'` e `X-Robots-Tag: noindex, nofollow`;
  - verificado no browser: o app do Studio sobe e roteia. Sem `projectId` local ele mostra "Connect this studio to your project"; com o projeto real, falta confirmar se o Sanity exige registrar o Studio auto-hospedado.
- **React 19.2.1 → 19.2.8** (publicado em 21/07/2026, dentro do `minimum-release-age`): o `sanity build` recusa React < 19.2.2. Só React e react-dom mudaram no lockfile.
- **Ainda pendente no Studio estático:**
  - o favicon padrão do Sanity aponta para `/static/favicon.svg` (404);
  - os redirects de host canônico do `proxy.ts` não passam por `/admin/studio`;
  - os domínios de preview precisam entrar no CORS do projeto Sanity.

### Atualização de 13/11 (madrugada): 59,7 MiB, B3 corrigido de verdade, custo

- **Tamanho: 59,68 MiB descomprimido** (era 63,0; limite 64, folga de ~4,3 MiB).
  - Mermaid, cytoscape e KaTeX saíram do servidor (−3,5 MB no handler). Os dois plugins do Streamdown só carregam no browser, a partir de um `useEffect` em `src/components/ai-elements/message-response.tsx`. O `import()` deles agora fica atrás de `typeof window === "undefined"`, que o Next fixa como constante no build do servidor, e o código morto sai do bundle. Vale também para a Vercel.
  - Um `turbopack.resolveAlias` com condição `node` não funcionou: a documentação do Next 16 diz que só a condição `browser` é suportada.
  - **Trava de tamanho:** `pnpm cf:size` (hoje `scripts/build-worker-bundle.mjs`) roda `wrangler deploy --dry-run`, que só empacota localmente e não envia nada. Ele soma os módulos que seriam enviados e falha acima de 62 MiB (`WORKER_SIZE_BUDGET_MIB` muda o orçamento). É para entrar no CI logo depois do `cf:build`.
- **B3 (e a falha intermitente de tenants) tinha uma segunda causa: o Sentry.**
  - **Sintoma:** com o #1318, uma onda de 25 requests concorrentes num isolate novo deu **17–18 erros 500 em 25**. Todos eram `Next.js encountered the unstable value crypto.randomUUID() while prerendering`, em `/t/[tenant]/project/[projectId]`, `/communities` e `/community/[communityId]`. A revalidação em background tinha o mesmo erro. Em sequência e com o cache já cheio, nada falhava, por isso o problema escapou às medições anteriores.
  - **Causa:** o Sentry gera ids de trace e span com `crypto.randomUUID()`. Para não abortar o prerender do Cache Components, o `@sentry/nextjs` roda essas chamadas dentro de um snapshot do AsyncLocalStorage tirado quando o módulo do servidor é avaliado (`prepareSafeIdGeneratorContext`, símbolo global `__SENTRY_SAFE_RANDOM_ID_WRAPPER__`). No Node isso acontece na inicialização, fora de qualquer request. No Worker o módulo é avaliado sob demanda, dentro do primeiro request que chega a ele, e o snapshot pode capturar o prerender desse request. A partir daí, as chamadas "protegidas" rodam dentro de um prerender.
  - **Correção:** `cloudflare/worker.ts` registra o runner no nível do módulo, antes de qualquer request, com um snapshot vazio. Um setter vazio impede o Sentry de trocá-lo.
  - **A/B com estado local limpo nas duas rodadas, 4 ondas de 25 cada:**

    | | 200 | 307 esperado | 500 | sem resposta |
    |---|---|---|---|---|
    | sem correção | 27 | 4 | 56 | 13 |
    | com correção | 96 | 4 | 0 | 0 |

  - **Com a correção:** 17 revalidações em background terminaram com `outcome: ok`, e o log ficou sem nenhum erro (1.915 linhas, todas `info`). Duas ondas depois de o cache vencer deram 50/50.
  - É um problema a reportar ao Sentry (`@sentry/nextjs` em runtimes que avaliam módulos sob demanda).
- **Studio estático, pendências fechadas:**
  - em host alias (`karmahq.xyz`, `gap.karmahq.xyz`…), `/admin/studio/*` responde 308 para `www.karmahq.org` com path e query, usando `isAliasHost` e `canonicalUrl` de `utilities/domains.ts`;
  - o `sanity build` escreve os links de favicon e manifest na raiz (`/static/…`) mesmo com `basePath`, e o Worker os reescreve com `HTMLRewriter` para `/admin/studio/static/…`. Os ícones agora respondem 200;
  - continua pendente o CORS dos domínios de preview no projeto Sanity, e se o Sanity exige registrar o Studio auto-hospedado.
- **Regressão local:** tenants 200 com título certo (`app.opgrants.io`, `grantsapp.scroll.io`, `grants.filecoin.io`, `app.filpgf.io`); `/project/tally`, `/project/gitcoin` e `/community/optimism` com título; `tsc`, Biome e os testes do `message-response` passam.

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
- `app/api/cache-probe/route.ts` (era `spike-cache-probe`): responde 404 a menos que `CACHE_PROBE_ENABLED=1`, que só o Worker de teste define. Remover quando a migração estiver verificada.
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
| `"use cache"` + `revalidateTag` (`/api/cache-probe` + webhook assinado em `/api/blog/revalidate`) | ✅ | ✅ | hit → webhook 200 (assinatura ruim → 401) → 1ª leitura stale → 2ª fresca → hit. Comportamento idêntico ao Node |
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

## Custo: Vercel hoje × Cloudflare para o `gap-app-v2`

**Fontes:**
- **Uso:** a medição da thread de custos da Vercel, ciclo de 20/09 a 20/10/2026, por item e por projeto.
- **Preços:** as páginas de preço da Cloudflare consultadas em 13/11/2026 ([Workers e Durable Objects](https://developers.cloudflare.com/workers/platform/pricing/), [R2](https://developers.cloudflare.com/r2/pricing/), [Images](https://developers.cloudflare.com/images/pricing/)).
- **Natureza da estimativa:** nada roda na Cloudflare de verdade, então todo número do lado Cloudflare é **inferido**.

**Na Vercel, o que é do `gap-app-v2`** (por ciclo):

| Item | Total do time | Parte do gap | Gap |
|------|---------------|--------------|-----|
| Funções | US$ 78 | 96–99% | ≈ US$ 76; com o Fluid ligado em 10/11, a thread estimou ≈ US$ 30–40 |
| Rede (transferência, requests) | US$ 56 | 77–97% | ≈ US$ 43–54 |
| ISR | US$ 27 | 93–99% | ≈ US$ 26 |
| Observability | US$ 30 | 78–98% | ≈ US$ 23–29 |
| Build CPU | US$ 82 | ~16% | ≈ US$ 14 |
| **Total** | | | **≈ US$ 140–160** (≈ US$ 185 antes do Fluid) |

**Os assentos (US$ 160) não mudam:** o `karma-compass-web` continua na Vercel.

**Na Cloudflare** (por mês):

| Item | Preço | Estimativa | Premissa |
|------|-------|------------|----------|
| Plano Workers Paid | US$ 5 | US$ 5 | |
| Requests | 10M incluídos, depois US$ 0,30/M | US$ 0–1 | ≈ 7M/ciclo hoje no time inteiro; assets estáticos não contam |
| CPU | 30M ms incluídos, depois US$ 0,02/M ms | US$ 2–15 | 20 a 100 ms de CPU por invocação, em média; **não medido**, é a maior incerteza |
| Cache ISR no R2 | US$ 4,50/M escritas (1M grátis), US$ 0,36/M leituras (10M grátis) | US$ 26–32 | 6,7M escritas/ciclo, o volume de set/out na Vercel, que vem do `cacheComponents` + `partialPrefetching` |
| Tag cache e fila (Durable Objects) | 1M requests incluídos, depois US$ 0,15/M | US$ 0–2 | opennextjs-cloudflare#1103 relata volume alto do `DOShardedTagCache` |
| `next/image` (Images binding) | 5.000 transformações únicas grátis, depois US$ 0,50/mil | US$ 0–10 | volume de imagens únicas desconhecido |
| Transferência | não cobrada | US$ 0 | |
| Logs | 20M eventos incluídos | US$ 0 | a Cloudflare troca o preço de Workers Logs em 01/12/2026 e ainda não publicou os valores |
| Builds | no CI | US$ 0 | o `cf:build` precisa de máquina ≥ 16 GB |
| **Total** | | **≈ US$ 35–65** | |

**Economia bruta: ≈ US$ 80–120 por mês.** O ISR é o único item grande que não some: ele só muda de fornecedor. Ele cai junto em qualquer uma das plataformas se as gravações diminuírem (ver a nota de ISR Writes × `partialPrefetching`).

**O contrato muda quando a economia aparece:**
- **Compromisso:** US$ 2.410 por ano, com contrato até ago/2027. Até 10/11 já tinham sido consumidos US$ 1.151,70.
- **Com o gap na Vercel:** no ritmo atual (≈ US$ 425/ciclo), o compromisso acaba por volta de fev/2027.
- **Sem o gap:** o time cairia para ≈ US$ 270–285/ciclo, e o compromisso duraria até ~abr/2027 se a migração fosse imediata.
- **Até o compromisso acabar,** sair da Vercel não economiza nada, porque o valor é devido de qualquer forma.
- **Depois dele,** se o excedente for cobrado a preço de tabela (não sei os termos), a migração evitaria ≈ US$ 1.000 até ago/2027, já descontando ≈ 9 meses de Cloudflare. Depois da renovação, a economia seria de ≈ US$ 1.000–1.400 por ano, mais o que der para reduzir no compromisso.
- **Comparação com o esforço:** a migração custa as semanas de trabalho estimadas abaixo.

## Estimativa do trabalho restante (uma pessoa)

| Frente | Esforço | Risco |
|--------|---------|-------|
| B2/B3: feitos no local (patch #1318 + runner do Sentry em `cloudflare/worker.ts`). Falta revisar o patch, reportar o caso do Sentry e trocar pelo release oficial do #1318 | ~3 dias + espera do release | médio; usar código não lançado exige exceção na política de dependências |
| B1: feito até 59,7 MiB (Studio estático, Shiki fino, Mermaid/KaTeX só no cliente, `minify`, trava `cf:size`). Falta medir o `startup_time_ms` real; se ele passar de 1 s, web3 fora do SSR | 2 dias a 2 semanas, conforme o startup | médio; o startup é o risco maior |
| Trocas de plataforma do inventário (variável neutra de ambiente, geo, IP 🔒, analytics, og-background, token bridge 🔒) | ~1 semana | médio (as de segurança precisam de revisão) |
| CI/CD, secrets, R2/DO/Images provisionados, Cron, observabilidade, teste de carga | ~2 semanas | médio |
| Domínios: zonas `karmahq.org`/`.xyz` hoje no Route 53, tenants externos (`app.filpgf.io` na Namecheap, `grantsapp.scroll.io` na Cloudflare da própria Scroll) via Cloudflare for SaaS; cutover com rollback | ~1–2 semanas, dependendo dos donos dos domínios | médio |
| **Total** | **~5–8 semanas**, mais a espera do release do #1318 | |

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
pnpm cf:size                                      # tamanho exato do upload; falha acima de 62 MiB
pnpm cf:preview                                   # popula o R2 local e sobe http://localhost:8787
curl -H "Host: app.opgrants.io" http://localhost:8787/                 # tenant (B2)
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+*/6+*+*+*" # Cron Trigger
```

Tamanho do upload: `pnpm cf:size`. Rode build, preview e `cf:size` um de cada vez, com `systemd-run --scope -p MemoryMax=…`.
