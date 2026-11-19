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
| R2 | **Shell de `/project/*` e `/community/*` do host Karma não se regenera em runtime**: `Route "/t/[tenant]/project/[projectId]": Next.js encountered uncached or runtime data during prerendering` | cache R2 vazio: 8 de 9 requests sequenciais deram 500, com o patch #1318 antigo **e** com o head novo; tenants e blog passam | **Corrigido (19/11)**: é o Next, não o Worker; o shell agora vai junto nos assets (ver "R2 e R3: causa e correção") |
| R3 | 1ª onda concorrente depois de um deploy: 2 de 25 com 500 (`/community/optimism`, mesmo erro do R2) | ondas 2–4 com 25/25 | **Não se repete** desde a correção do R1: ondas 100/100 em 3 rodadas, uma delas com o R2 vazio |

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

   - **O `Runtime.getHeapUsage` não inclui a memória WASM.** Os números de heap das tabelas acima não contam esses 31 MiB.
   - A memória WASM só aparece em isolates que renderizaram uma imagem OG. Ela nunca diminui.
   - **Medido depois (19/11): esses 31 MiB não fazem o isolate ser descartado.** A memória WASM não entra na linha de ~128 MiB do heap JS; ver "Memória WASM das imagens OG".

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
   - O ganho confirmado é o local: **~27 MiB a menos num isolate quente**, que passa a ficar em ~97 MiB de heap JS. Os 31 MiB de WASM das OG ficam fora dessa conta e não derrubam o isolate (ver "Memória WASM das imagens OG").

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
| Shell de `/project/*` e `/community/*` ausente do R2 | ✅ servido da cópia do build nos assets (R2 corrigido) |

Erros nos Workers Logs:

| Erro | Situação |
|------|----------|
| `Invalid client environment variables: NEXT_PUBLIC_GAP_INDEXER_URL … received undefined` + `Failed to prepare server` em todo request | **Corrigido** neste branch (`fix(env)`): `utilities/env.ts` validava o `process.env` de runtime, que no Worker não tem as `NEXT_PUBLIC_*`. No spike não apareceu porque o `.env` ia copiado para o bundle. Derrubava o `instrumentation.ts` e todo módulo que importa `clientEnv` (Sanity, blog, revalidação) |
| `encountered uncached or runtime data during prerendering` | **Corrigido** (R2): zero ocorrências na rodada com o R2 vazio |
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

### R2 e R3: causa e correção (19/11)

**Causa: o Next não consegue gerar um shell de fallback em runtime nesta app.** Não é o Worker nem o patch #1318.

- Com Cache Components, toda rota dinâmica tem um shell de fallback: a parte estática renderizada com os params desconhecidos (`/t/[tenant]/project/[projectId]`). Numa página ainda fora do cache, o Next serve esse shell e transmite o resto.
- Se o shell também não está no cache, o Next o renderiza no request. Esse render falha: o layout de `[projectId]` lê `params` fora de `<Suspense>`, o que um shell não pode fazer. Resultado: `NEXT_STATIC_GEN_BAILOUT` e 500.
- No build o mesmo shell é gerado sem erro (HTML vazio, tudo adiado).
- **Reproduzido no `next start` puro**, sem Cloudflare: apagando de `.next/server/app` os shells `t/karma/project/[projectId].*` e `t/[tenant]/project/[projectId].*`, `/project/gitcoin` dá 500 com o mesmo erro. Com só o shell `karma` apagado passa, porque o Next procura o shell genérico.
- Evidência no workerd (`--var NEXT_PRIVATE_DEBUG_CACHE:1 --var OPEN_NEXT_DEBUG:true`): o Next busca a página, depois o shell genérico; os dois faltam; só um `"use cache"` roda antes do erro, os loaders do projeto nem chegam a rodar. O agendador do #1318 usou 16 de 56 checkpoints e não deixou nada pendente.
- Na Vercel isso não acontece porque a saída do build é imutável e o shell sempre existe. Aqui o cache é o R2, preenchido num passo separado depois do build. O shell falta quando esse passo não rodou ou falhou, num prefixo novo, num bucket esvaziado, ou num erro de leitura (o cache R2 trata erro como miss).
- O R3 (2 de 25 com 500 na 1ª onda depois de um deploy, com o R2 populado) era efeito do R1: na mesma onda houve 12 resets de isolate. Nas duas rodadas depois da correção do UTF-16 as ondas deram 100/100, sem nenhum erro de prerender nos logs.

**Correção: o shell vai junto com o Worker.**

- `scripts/ship-fallback-shells.mjs` (parte do `pnpm cf:build`) copia os shells do build para os assets do Worker, em `cdn-cgi/_next_cache/<buildId>/`, que só o Worker lê. São as entradas do cache de rotas com um segmento `[param]` no caminho: 253 arquivos, 15 MiB. Os assets não contam no limite de 64 MiB.
- `cloudflare/shell-fallback-cache.ts` envolve o cache R2: quando um shell falta no R2, lê a cópia dos assets (o cache de assets estáticos do próprio adaptador). Qualquer outra entrada continua só no R2, e uma página que falta é renderizada normalmente.
- A cópia é a do build, igual ao que o R2 teria depois do deploy. Quando o Next grava um shell mais novo (depois de uma revalidação por tag), o R2 passa a ter a entrada e a cópia não é mais lida.

Medido na conta, versão `2438303b`, com um prefixo R2 novo e vazio (`NEXT_INC_CACHE_R2_PREFIX=wave-empty-4`) e isolates novos:

| | Antes (R2 vazio) | Depois (R2 vazio) |
|---|---|---|
| Sequencial (`/project/gitcoin`, `/community/optimism`…) | 8 de 9 com 500 | todas certas (200; 404 só onde a staging não tem o projeto) |
| 4 ondas de 25 | 76–93 de 100 | **100 de 100** |
| Erros de prerender nos Workers Logs | em todo 500 | **0** (106 respostas 200, 2 404 esperados, nenhum erro) |

No workerd local, com o estado vazio: `/project/gitcoin`, `/community/optimism`, `/project/gitcoin/about`, `/communities` e `/blog` com 200 e título certo.

### Memória WASM das imagens OG (19/11)

**Conclusão: os 31 MiB de WASM das OG não derrubam o reuso de isolate. O custo das OG no Worker é CPU, não memória.**

O que são os 31 MiB (medido no Node com o mesmo `next/og` e o `sharp` bloqueado, para usar o resvg como no Worker; os números batem com o snapshot do workerd):

| Instância | Memória | Por quê |
|---|---|---|
| yoga (layout do Satori) | 16,00 MiB | é a memória **inicial** que o binário declara (256 páginas). O yoga usa ~0,13 MiB num card nosso |
| resvg (rasterização) | 14,75 MiB | cresce no 1º render e para aí. Sem imagem nenhuma no card fica em 7,6 MiB: o canvas de 1200×630 tem 2,9 MiB por camada, e cada imagem recortada pede outra camada do mesmo tamanho. Os ícones têm 36×36 px, então não é decodificação |

O limite, calibrado com versões mínimas temporárias do Worker de teste (heap JS retido por um array + um `WebAssembly.Memory` escrito por inteiro, 25 requests sequenciais, reuso pelo id do isolate):

| Heap JS | WASM | Isolates reaproveitados |
|---|---|---|
| 90 MiB | 0 | 12 / 25 |
| 90 MiB | 48 MiB | 10 / 25 |
| 90 MiB | 80 MiB | 13 / 25 |
| 120 MiB | 0 | 15 / 25 |
| 120 MiB | 32 MiB | 12 / 25 |
| 120 MiB | 64 MiB | 12 / 25 |
| 60 MiB | 120 MiB | 11 / 25 |
| 10 MiB | 100 MiB | 12 / 25 |
| **90 MiB** | **100 MiB** | **0 / 25** |
| **90 MiB** | **120 MiB** | **0 / 25** |
| 90 MiB | 200 MiB | a alocação falha no 1º request |
| (antes) 130 MiB | 0 | 0 / 25 |

- A memória WASM não soma na linha de ~128 MiB do heap JS. Há uma linha combinada mais alta: 184 MiB (120 + 64) ainda reaproveita, 190 MiB (90 + 100) não.
- O app fica em ~97 MiB de heap JS + 31 MiB de WASM num isolate quente, longe das duas linhas.
- **No app, versão `2438303b`:** um ciclo sequencial com OG (`/`, `/communities`, `/project/gitcoin`, `/community/optimism`, OG, `/blog`, sitemap; 2 × 42 requests) reaproveitou 30 e 38 requests, contra 40 e 40 sem a OG, dentro do ruído. Um isolate renderizou a OG no 4º e no 12º request e serviu projeto e comunidade até o 15º.
- **Correção disponível e não aplicada:** reescrever as páginas iniciais do `yoga.wasm` de 256 para 2. O yoga foi compilado com crescimento de memória (máximo 32.768 páginas) e cresce sozinho: 1,69 MiB num layout de 3.000 caixas, PNG idêntico byte a byte ao original. Economiza 15,9 MiB por isolate que renderiza OG, mas é um patch binário num arquivo interno do Next. Só vale se a memória voltar a apertar.

**O que pesa de verdade: CPU, porque nada guarda a resposta.** As rotas OG mandam `Cache-Control: s-maxage=86400`, e na Vercel o CDN guarda o PNG por um dia. No Worker, a resposta não passa pelo cache da Cloudflare, então todo request de crawler renderiza a imagem de novo. Medido nos Workers Logs, mesmo ciclo, isolates quentes e frios misturados:

| Rota | CPU p50 | Mínimo |
|---|---|---|
| OG `/api/metadata/projects/gitcoin` | **743 ms** | 250 ms |
| `/project/gitcoin` | 234 ms | 99 ms |
| `/community/optimism` | 161 ms | 94 ms |
| `/`, `/blog`, `/communities`, sitemap | 26–51 ms | 9–25 ms |

### PNG das imagens OG guardado no R2 (19/11)

**Corrigido: um acerto no cache custa 0–2 ms de CPU, contra 2,4–4,6 s de uma renderização.**
O `cloudflare/worker.ts` responde as rotas OG pelo `cloudflare/og-image-cache.ts` antes de chamar o Next:

- **Onde fica:** no bucket do cache incremental, sob `og-images/`. Nenhum recurso novo; só o binding `CF_VERSION_METADATA` no `wrangler.jsonc`, que não cria nada na conta.
- **Chave:** id da versão do Worker + host + caminho + query. Um deploy novo começa vazio, como o CDN da Vercel, então uma mudança no desenho do card aparece na hora.
- **Validade:** a do próprio `Cache-Control` da rota. Fresco por `s-maxage`, depois servido por mais `stale-while-revalidate` enquanto é redesenhado em segundo plano (uma vez por isolate). As rotas continuam decidindo: 1 dia para projeto e comunidade, 1 hora para o scanner, 7 dias para o knowledge.
- **O que não entra:** qualquer resposta que não seja 200, imagem, `public` com `s-maxage` e sem `Set-Cookie`. URL com chave acima de 1.024 bytes (limite do R2) é desenhada toda vez. Erro de leitura ou escrita no R2 cai no Next, como se o cache não existisse.
- **Rotas cobertas:** lista fixa em `OG_IMAGE_PATH_PREFIXES` (`/api/metadata/projects/`, `/communities/`, `/knowledge`, `/api/scanner/og/`). Rota OG nova precisa entrar nela. O `proxy.ts` não roda em `/api`, então responder antes do Next não pula nada.
- **Header de diagnóstico:** `x-karma-og-cache: HIT | STALE | MISS`, mais `age`.

Medido na conta, versão `80b00e2c`, 4 URLs × 3 rodadas (Workers Logs):

| Request | CPU | Wall no Worker |
|---|---|---|
| MISS (1º de cada URL, isolates frios) | 2.380–4.574 ms | 3,7–7,1 s |
| HIT (14 requests) | **0–2 ms** | 158–529 ms (leitura do R2) |

Os PNGs servidos do R2 têm o mesmo hash do MISS. Os objetos no bucket carregam o `Cache-Control` original e o `s-maxage`/`stale-while-revalidate` em metadados. O STALE e a expiração foram cobertos por teste unitário (não dá para esperar um dia na conta).
O tempo total no cliente num HIT ainda variou de 0,4 a 3,9 s: os lentos caíram em isolates novos (`n=1` no `x-karma-isolate`) e pagaram a partida do script de 58 MiB, não o cache. Isso é o R1, não a OG.

Custo: leitura no R2 a US$ 0,36 por milhão e escrita a US$ 4,50 por milhão, contra ~US$ 15 por milhão de OG em CPU (743 ms × US$ 0,02 por milhão de ms).
Ressalvas:
- **Prefixos de deploys antigos ficam no bucket.** Por isso o bucket de produção, `gap-app-v2-opennext-cache`, já foi criado (19/11) com a regra de ciclo de vida `expire-og-images`: objetos sob `og-images/` expiram em 8 dias. No bucket de teste ela não foi criada; ele sai inteiro na limpeza.
- **O card de "projeto não encontrado" também fica guardado por 1 dia**, porque a rota manda `s-maxage=86400` nele. É o mesmo comportamento da Vercel hoje; um projeto recém-criado ou um erro passageiro do indexer mostra o card genérico até expirar.
- **A query do knowledge vira chave**, então URLs inventadas geram escritas no R2. Hoje elas já geram uma renderização inteira cada; a regra de ciclo de vida limita o armazenamento.

### Patch #1318 atualizado

O backport passou de `9dbb209` (30/10) para o head do PR, `4879fe2` (18/11). Em 16/11 o mantenedor apontou que, no workerd, I/O pode completar entre dois callbacks de timer e *"uncached data can end up cached"*. Os commits `f501eb5` e `4879fe2` mantêm os estágios num único task e usam o checkpoint de microtask do workerd (`unhandled_rejection_after_microtask_checkpoint`, ligado por padrão a partir da compat date 2026-03-03; a nossa é 2026-09-01).
Foi aplicado como o delta do `dist` entre os dois commits (build do adaptador nos dois), por cima do patch existente. **Não resolveu o R2:** mesmo erro, 8 de 9 com o cache vazio. A causa do R2 não estava no adaptador (ver abaixo).
O PR continua aberto; a política de dependências precisa da mesma exceção já aprovada para o backport.

### Dois Workers: roteamento e servidor do Next (19/11)

**Por quê:** mesmo com a interceptação, um isolate novo levava 1,7–2,7 s até o 1º byte, só para subir o script de 57 MB, embora a página viesse do cache.

**Como:**
- O OpenNext já separa o roteamento (o "middleware", que roda o `proxy.ts` e a interceptação de cache) do servidor do Next. Ele passa o resultado do roteamento ao servidor num request com cabeçalhos internos (rotas resolvidas, URL inicial), o mesmo formato que usa na AWS com middleware externo.
- **Worker de roteamento** (`wrangler.jsonc`, `cloudflare/worker.ts` + `cloudflare/front-handler.ts`):
  - é público; tem os Durable Objects, o cache das imagens OG, o Studio e o `next/image`;
  - `cloudflare/front-handler.ts` reproduz o `.open-next/worker.js`, menos o último passo: o que o roteamento não responde vai pelo service binding `NEXT_SERVER`;
  - **2,64 MiB** (608 KiB gzip).
- **Worker do Next** (`wrangler.app.jsonc`, `cloudflare/next-server.ts`):
  - sem URL pública (`workers_dev` e `preview_urls` desligados), porque confia nos cabeçalhos internos do roteamento;
  - liga os Durable Objects do outro Worker por `script_name`, e o mesmo R2 e os mesmos assets;
  - importa o servidor dentro do request, como o OpenNext: o módulo inicia o Next com top-level await (instrumentação, Sentry), e o escopo global de um Worker não permite I/O. Com import estático, as rotas de API davam `TypeError: uf(...) is not a function`;
  - **55,7 MiB**.
- `pnpm cf:size` monta e confere os dois bundles: Latin-1, orçamento de 8 MiB para o roteamento e 62 MiB para o Next.
- O deploy sobe o Worker do Next primeiro, porque o service binding exige que ele exista.

**Resultado no Worker de teste** (roteamento `c4e61c0a`, Next `6c5e7395`), 8 páginas × 2 rodadas:

| | Um Worker, com interceptação | Dois Workers |
|---|---|---|
| TTFB de página no cache (mediana) | ~2 s | **0,66 s** |
| TTFB num isolate novo | 1,7–2,7 s | **0,5–1,35 s** (mediana 1,03) |
| CPU do roteamento por request | mediana 76 ms | mediana 69 ms, máx. 215 |
| Requests que chegaram ao Worker do Next | | só as revalidações em background (`STALE`) |
| Erros / 5xx | 0 | 0 |

- Rotas de API, imagens OG, sitemap, `robots.txt`, 404, POST (corpo preservado), navegação RSC, Studio e tenants (`app.opgrants.io`, `grantsapp.scroll.io` via `x-karma-test-host`) respondem certo nos dois Workers.
- O que precisa do Next ainda paga o isolate novo dele: 4–6 s numa rota de API fria. A diferença é que agora só esses requests pagam isso.
- No `workers.dev` não há o cache regional, então o resto do tempo é R2 e Durable Object.
- O staging também está dividido: `gap-app-v2-staging` + `gap-app-v2-staging-app`.

### Interceptação de cache (19/11)

**O que é:** `enableCacheInterception` faz a camada de roteamento do OpenNext (o middleware, 3,5 MB) responder uma página que está inteira no cache. O servidor do Next (57 MB) não é carregado nem renderiza.

**Por que estava desligada:** a interceptação servia o HTML guardado sem olhar se a entrada tinha partes adiadas (`postponed`). Com `cacheComponents`, 277 das 397 entradas de página do build têm. Servido sozinho, o shell delas ficaria sem as partes renderizadas por request.

**Correções** (patch em `@opennextjs/aws` 4.1.15, `patches/@opennextjs__aws@4.1.15.patch`, ainda não reportado upstream):
1. Entrada com `meta.postponed` vai para o servidor, que retoma o render.
2. O Next 16 põe no `routes-manifest` rotas que só o prerender conhece, como `/t/karma/project/[projectId]` (tenant fixo) ao lado de `/t/[tenant]/project/[projectId]`. O interceptor pegava a primeira rota resolvida, a variante sem página, e não achava chave nenhuma. Toda página de projeto e de comunidade ia para o Next, inclusive as geradas no build. Agora ele pega a primeira rota que tem página, nos dois ramos (pré-renderizada e guardada em runtime).

**Resultado no Worker de teste** (versão `26862271`), 8 rotas × 2 rodadas, quase todas em isolate novo:

| | Antes | Depois |
|---|---|---|
| CPU de uma página no cache, isolate novo | 1,6–3,9 s | **16–127 ms** (mediana 76) |
| Páginas servidas sem o Next | `/`, `/communities` | também projeto, comunidade, subpáginas e `/blog` |
| Erros nos Workers Logs | | 0 |

- As revalidações em background (páginas `STALE`) custaram 115–458 ms cada.
- Conteúdo igual (títulos conferidos). A resposta mantém CSP, `x-frame-options` e o `X-Robots-Tag` que o `proxy.ts` põe. A navegação RSC também sai do cache.
- **O que não muda: a latência de um isolate novo.**
  - Dentro do isolate o request leva 69–530 ms, mas o TTFB fica em 1,7–2,7 s, por causa da subida do script de 57 MB antes do 1º request.
  - Isso aparece como tempo total, não como CPU nos logs.
  - Diminuir isso é o que a divisão em dois Workers resolveria (o frontal teria só o middleware).
- No `workers.dev` o cache regional (Cache API) não funciona, então toda leitura vai ao R2 e cada checagem de tag ao Durable Object. Num domínio próprio, esse tempo de espera cai.

### Páginas de projeto e comunidade com cache próprio (19/11)

**Sintoma:** no Worker, `/project/<id>` e `/community/<id>` (e as subpáginas) respondiam `private, no-store` e `x-nextjs-postponed: 1` a cada request, renderizadas por inteiro. Na Vercel as mesmas páginas saem do CDN (`HIT`, 0,2–0,3 s). Só as páginas geradas no build (três projetos, `community/gitcoin`) saíam do cache.

**Causa:**
- Com `partialPrefetching`, a 1ª visita a uma URL que não foi gerada no build recebe o shell genérico da rota. Em background, o Next deveria renderizar o shell daquela URL e guardar.
- O Next só faz esse passo fora do "minimal mode" (`app-page-runtime.js`: `!isMinimalMode && ... nextConfig.partialPrefetching`). Em minimal mode ele deixa isso para a plataforma, e a Vercel faz (`x-vercel-cache: PRERENDER` na 1ª visita).
- O OpenNext roda o Next em minimal mode e não faz o passo, então essas páginas nunca ganhavam entrada própria.

**Correção (`cloudflare/shell-upgrade.ts`):**
- Quando a resposta é o shell genérico, o Worker manda a página para a fila de revalidação do OpenNext (`NEXT_CACHE_DO_QUEUE`). É o mesmo caminho de uma página vencida, com a mesma deduplicação.
- A fila pede a página com `x-prerender-revalidate` e `x-isr: 1`, o Next renderiza e guarda, e as visitas seguintes são `HIT`.
- Com `x-isr: 1` o OpenNext pula o `proxy.ts`, então a fila precisa do caminho interno (`/t/karma/project/gitcoin`). Pelo caminho público a resposta é 404. O `proxy.ts` informa esse caminho no cabeçalho `x-karma-rewritten-path`, que o Worker lê e remove antes de responder.
- A fila desistia de um render depois de 10 s, e um isolate novo passa disso. `NEXT_CACHE_DO_QUEUE_REVALIDATION_TIMEOUT_MS` foi para 30 s nos dois Workers.

**Resultado no staging** (versão `aba572f8`):
- A 1ª visita continua com o shell. Da 2ª em diante, `HIT`/`STALE`.
- A página guardada bate com a da Vercel (título, ~116 KiB, mesmo conteúdo).
- CPU num isolate quente: **36–64 ms** com a página no cache, contra 150–560 ms renderizando.
- Num isolate novo continua em 1,6–3,9 s, porque mesmo para servir do cache o servidor do Next inteiro é carregado.
- Pendência: `/community/<id>/impact` não ganha entrada. Até o pedido da fila recebe o shell genérico, e a fila registra erro. Na Vercel a página sai do cache. O Worker reenvia a mesma página no máximo a cada 10 min por isolate.

**O que sobra é o isolate novo:**
- Mesmo uma resposta que não carrega o Next (`/__karma/isolate`) leva 1,3–2,6 s num isolate novo, o custo de subir o script de 57 MB.
- A interceptação de cache resolveu a CPU disso; ver "Interceptação de cache (19/11)". O tempo de subida do script continua.
- O ganho grande é diminuir o script (R1).

**Erro de deploy encontrado no caminho:**
- `wrangler versions upload` sem o arquivo gera o bundle de novo a partir de `cloudflare/worker.ts` e perde a correção Latin-1.
- O Worker de teste ficou assim de `80b00e2c` a `2c3dde96`: 0 de 30 isolates reaproveitados, contra 18 de 30 com o bundle certo (`193a0522`).
- Subir sempre `.open-next/upload/worker.js --no-bundle --no-minify`.
- Para conferir, baixar `content/v2` e contar os caracteres acima de U+00FF na parte `worker.js`; tem que dar 0.

### Worker de staging (19/11)

`gap-app-v2-staging`, em `https://gap-app-v2-staging.dawn-sound-c6f7.workers.dev`. É o mesmo build do Worker de teste, configurado como ficará em produção:

- **Config:** `env.staging` no `wrangler.jsonc`. O build não depende do ambiente: os bindings entram no upload (`wrangler deploy .open-next/upload/worker.js --no-bundle --no-minify --env staging`). O 1º deploy precisa ser `wrangler deploy`, não `versions upload`, porque cria os Durable Objects.
- **Diferenças para o Worker de teste:** sem `TEST_WORKER` (sem `x-karma-isolate` nem `x-karma-test-host`) e sem `CACHE_PROBE_ENABLED`. Bucket R2 próprio, populado com o cache do build (406 objetos).
- **Variáveis:** as `NEXT_PUBLIC_*` de staging no build (indexer de staging), `APP_ENV=preview` no runtime.
- **Sem secrets de runtime.** A API da Vercel recusou ler as variáveis do projeto (403), e nenhum deles faz falta num host `workers.dev`: `CRON_SECRET` (sem cron, pelo mesmo motivo do Worker de teste), `SANITY_WEBHOOK_SECRET` e `PROJECT_CACHE_REVALIDATION_SECRET` (o Sanity e o indexer chamam o staging da Vercel, não este host), `SANITY_PREVIEW_SECRET`/`SANITY_VIEWER_TOKEN` (preview de rascunho do blog) e `FIRECRAWL_API_KEY`. Entram por `wrangler secret put --env staging` quando o staging tiver host próprio.
- **Sem host próprio:** o DNS de `karmahq.org` e `karmahq.xyz` está no Route 53 (AWS), e um Worker só atende num domínio cuja zona está na Cloudflare. Um CNAME para `*.workers.dev` não funciona. Os tenants whitelabel não são testáveis aqui (o Worker de teste continua com `x-karma-test-host` para isso).

Primeira rodada, versão `d2df8ace`, 10 rotas em sequência, duas vezes:

| | Resultado |
|---|---|
| Status | todos certos nas duas rodadas (9 × 200, `/nao-existe` 404), 0 erros nos Workers Logs |
| Startup | 32 ms; código 58,3 MiB |
| Página em isolate novo | 2,0–7,1 s de CPU (o carregamento do Next, ver R1) |
| Página em isolate quente | 97–161 ms de CPU (`/blog`, `sitemap_index.xml`, `/t/karma/blog`) |
| Imagem OG da 2ª rodada | `HIT` do R2, 2 ms de CPU |
| Studio | 1–3 ms de CPU |

Com tráfego só meu, a maior parte das páginas cai em isolate novo, como no Worker de teste. A conta de custo (R1) continua dependendo de tráfego real, que este host não recebe.

### Recursos criados na conta (para apagar depois)

| Recurso | Nome / id | Como apagar |
|---------|-----------|-------------|
| Worker | `gap-app-v2-staging-test` (várias versões, inclusive as de calibração de memória; a ativa é `2c3dde96`, com o cache das OG; `workers.dev` ligado) | `wrangler delete gap-app-v2-staging-test` |
| Durable Object namespace | `DOQueueHandler` (`4d12b229b92f46bd9e3fab1654293533`) | sai com o Worker |
| Durable Object namespace | `DOShardedTagCache` (`bdaf59a42cd845d78aae9b62fe746262`) | sai com o Worker |
| Bucket R2 | `gap-app-v2-staging-test-opennext-cache` (prefixos `incremental-cache/`, `wave-empty-1/` a `wave-empty-4/`, `og-images/`) | esvaziar e `wrangler r2 bucket delete gap-app-v2-staging-test-opennext-cache` |
| Secret | `SANITY_WEBHOOK_SECRET` no Worker (valor de teste aleatório, não é o da Sanity) | sai com o Worker |
| Worker | `gap-app-v2-staging-test-app` (o servidor do Next do Worker de teste, sem URL pública) | `wrangler delete gap-app-v2-staging-test-app`, antes do Worker de teste |

**Não apagar na limpeza (staging, criado em 19/11):**

| Recurso | Nome / id |
|---------|-----------|
| Worker | `gap-app-v2-staging` (`env.staging` no `wrangler.jsonc`; 1ª versão `d2df8ace`; só `workers.dev`) |
| Worker | `gap-app-v2-staging-app` (o servidor do Next do staging, `env.staging` no `wrangler.app.jsonc`, sem URL pública) |
| Durable Object namespaces | `DOQueueHandler` e `DOShardedTagCache` do `gap-app-v2-staging` (saem com o Worker) |
| Bucket R2 | `gap-app-v2-staging-opennext-cache`, com as mesmas duas regras do bucket de produção (`og-images/` 8 dias, `incremental-cache/` 30 dias) |

**Não apagar na limpeza:** o bucket R2 `gap-app-v2-opennext-cache` é o de **produção**, criado em 19/11 a pedido, vazio, com duas regras de ciclo de vida. Nenhum Worker usa ele ainda.
- `expire-og-images`: `og-images/`, 8 dias.
- `expire-incremental-cache`: `incremental-cache/`, 30 dias. Cada deploy grava o cache sob um build id novo e nunca apaga o anterior (chave `incremental-cache/<buildId>/<sha256>.<tipo>`). A regra conta a idade do objeto, não do build: uma entrada do build atual que não foi regravada em 30 dias some e é renderizada de novo no próximo request. O teste com prefixo vazio (`wave-empty-4`, tudo 200) é o pior caso disso, e um shell de fallback que sumir é lido dos assets (#2224). 30 dias também limita até onde um rollback acha o cache da versão antiga.

O subdomínio `dawn-sound-c6f7.workers.dev` já existia na conta. Nenhum outro Worker, KV, D1, rota, domínio ou cron foi criado.
A plataforma ainda pode reter um preview efêmero `open-next-cache-populate`, criado pela tentativa do `populateCache` (não aparece em `workers/scripts`).

### Próximos passos sugeridos

1. **R1 primeiro (causa confirmada: heap acima de 128 MiB):** reduzir o heap residente em ≥ 20 MiB (web3 fora do SSR, Sentry, dividir em Workers) e medir cada corte: heap local pelo inspector, depois reuso na conta com `x-karma-isolate`.
2. **R2 corrigido** (shell de fallback nos assets). Issue aberta no Next.js: [vercel/next.js#102041](https://github.com/vercel/next.js/issues/102041), com reprodução mínima (só acontece com `partialPrefetching: true`). Se o Next corrigir, a cópia dos shells pode sair.
3. **PNG das imagens OG guardado no R2** (feito; ver "PNG das imagens OG guardado no R2"). O bucket de produção `gap-app-v2-opennext-cache` já existe, com regras de ciclo de vida para `og-images/` e `incremental-cache/`; a config de produção deve ligá-lo como `NEXT_INC_CACHE_R2_BUCKET` e manter o binding `version_metadata`.
4. Repetir as ondas com o Sentry ligado, para provar a correção do `cloudflare/worker.ts`.
5. **Worker de staging no ar** (ver "Worker de staging (19/11)"). Falta um host próprio: o DNS do `karmahq.org` e do `.xyz` está no Route 53 e a conta não tem zona, então só `workers.dev` por ora.
6. **Páginas de projeto e comunidade com cache próprio** (feito; ver a seção). Falta `/community/<id>/impact`, e o custo do isolate novo continua no R1.
7. **Interceptação de cache** (feito; ver a seção): página no cache custa ~76 ms de CPU mesmo em isolate novo. 
8. **Dois Workers** (feito; ver "Dois Workers: roteamento e servidor do Next"): página do cache em 0,66 s de TTFB mediano. Falta medir com tráfego real e um domínio próprio (cache regional).

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
