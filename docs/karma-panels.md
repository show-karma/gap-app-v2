# Karma Panels

An authoring surface where Karma AI writes a page from community data, you
mark a block on it and ask for a change, and the agent rewrites that block.
Panels, versions, comments and turns are persisted in the indexer; this app is
a client.

## Routes

| Path | What |
|---|---|
| `/community/[communityId]/manage/panels` | List, create, delete. Community admins only. |
| `/community/[communityId]/panels/[panelId]` | Full-screen studio (`(bare)` group, no navbar). |

`PAGES.ADMIN.PANELS` and `PAGES.ADMIN.PANEL_STUDIO` in `utilities/pages.ts`.

## Files

```
components/Pages/Admin/Panels/PanelListPage.tsx   list, three states, DeleteDialog
components/Pages/Panels/
  PanelStudio.tsx                  shell; everything comes from React Query
  PageCanvas.tsx                   shadow-DOM render, marking, hover card
  AgentPanel.tsx                   turns, pinned comments, versions, composer
  CommentPopover.tsx / CommentCard.tsx
  anchor.ts                        block reading + anchor resolution (id, then label)
  types.ts                         Anchor + anchorOf(PanelComment)
hooks/panels/usePanels.ts          key factory, queries, optimistic mutations
hooks/panels/usePanelTurn.ts       POST .../turns over SSE, folds events into the cache
hooks/panels/panel-stream.ts       pure reducers for stream events (tested)
services/panels.service.ts         indexer calls
types/panels.ts                    API contract
styles/globals.css                 .kp-studio tokens (light + dark)
```

## Data flow

- `usePanel` loads `PanelDetail` (panel, current version with HTML, version
  summaries, comments, turns) and polls every 5s while a turn is `working`, so
  a reload mid-generation shows the turn instead of losing it.
- Comments are mutations with optimistic add / edit / remove and rollback.
- A turn is `POST /v2/communities/:id/panels/:panelId/turns` streamed with
  `fetchEventSource` (Authorization header, not cookies). Events: `turn`,
  `status`, `delta`, `page`, `done`, `error`. Every event is reduced into the
  cached `PanelDetail`; `delta` and `page` also feed the live preview.
- Revert = `PATCH` the panel's `currentVersionId`; the studio fetches that
  version's HTML when the detail payload does not carry it.

## Comment anchoring

The agent stamps a stable `data-pl-id` on every top-level block and preserves
ids of blocks it did not rewrite (server-side `edit_page` applies exact
replacements, so untouched blocks keep their ids by construction). Comments
pin to `blockId`, with `blockLabel` as the fallback; the UI shows pinned /
by-text / orphaned so a regression is visible.

## Rendering

Reuses `HtmlReportFrame` (Shadow DOM, scripts stripped). Same-origin, so
`composedPath()` crosses the shadow boundary and block targeting needs no
postMessage bridge. Pages are static; charts must be inline SVG.

Brand teal is a fill, not a stroke, on light: strokes use `--kp-accent-strong`
(`--color-primary-dark`). Colour literals live in `styles/globals.css` only.

## No longer here

The prototype's Next route handler (`app/api/pages-lab/agent`), the
`PAGES_LAB_*` environment variables and the `/pages-lab` URL are gone. Model
credentials, the agent loop, the Karma API tools and persistence live in
`gap-indexer`.
