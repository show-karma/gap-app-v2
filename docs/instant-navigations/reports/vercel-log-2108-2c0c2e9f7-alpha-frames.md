# Vercel frames — PR #2108 @ 2c0c2e9f7 (dpl B7BHKvjAz2Qd2Aw61Y4U826xipjp)

Read by FE Dev Alpha via the Vercel connector, errors-only, narrow windows. `--debug-prerender`
is live, so these are real server frames.

## The `(with-header)` group: the frame MOVED, which means the cached-loader fix worked

At `a67784df8` the frame was the layout's own data read:

```
    at WithHeaderLayout (app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/layout.tsx:11:31)
> 11 | export default async function WithHeaderLayout(props: {
```

At `2c0c2e9f7`, after switching that call to `getCommunityDetailsCached`, the layout frame is gone
and the blocker is one line further down the same layout — the header it renders:

```
Error: Route "/t/[tenant]/community/[communityId]/browse-applications/[referenceNumber]": Next.js encountered URL data `useParams()` in a Client Component outside of `<Suspense>`.
    at NormalCommunityHeader (components/Community/Header.tsx:58:27)
    at CommunityHeader (components/Community/Header.tsx:288:10)
    at WithHeaderLayout (app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/layout.tsx:37:7)
  57 | const NormalCommunityHeader = ({ community }: { community: Community }) => {
> 58 |   const params = useParams();
     |                           ^
  59 |   const communityId = (params?.communityId as string) || community?.details?.slug || "";
  60 |   const [isMac, setIsMac] = useState(false);
  61 |   const setChatOpen = useAgentChatStore((s) => s.setOpen);
  digest: 'CLIENT_HOOK_DYNAMIC'
```

So the count staying at 48 is **not** evidence the fix did nothing: line 11 → line 37 is one
blocker cleared and the next one exposed. The route can only leave the failing list once every
frame in its chain is clear, which is why a per-frame count is a better progress signal than the
total.

**Fix, from the frame:** the layout already has `communityId` (it awaits `params` at line 15) and
already passes `community` to `CommunityHeader`. `NormalCommunityHeader` should take `communityId`
as a prop; its own fallback `community?.details?.slug` shows the value is already available without
the URL. This is the same shape as the `ProjectProfileLayout` fix and is Cache-class, so no
boundary is available — it has to be a prop.

Note this is the component #2099 already edited: that PR removed the `usePathname()` reads and left
`useParams()` in place.

## `programs/[programId]`: top-level `await params`, no sample

```
Error: Route "/t/[tenant]/community/[communityId]/programs/[programId]": Next.js encountered uncached or runtime data during prerendering.
    at ProgramDetailPage (app/t/[tenant]/(chrome)/community/[communityId]/(whitelabel)/programs/[programId]/page.tsx:126:38)
  125 | export default async function ProgramDetailPage({ params }: { params: Params }) {
> 126 |   const { communityId, programId } = await params;
      |                                      ^
  127 |
  128 |   const queryClient = new QueryClient({
```

Same class as the community and project layouts before `generateStaticParams`: a top-level
`await params` on a segment with no build-time sample. The lever is the one that already worked —
`generateStaticParams` returning a small real sample of `programId` for the sampled community — not
a boundary, since this route is Cache-class.

## Still unconfirmed

`projects` — I have still not captured its frame in any sampled window. Not inferring it. The nuqs
hypothesis from the previous digest stands unproven.

## Also unchanged from the previous digest

- `ProjectProfileLayout.tsx:107` `useParams()` via `(profile)/layout.tsx:29` — the nested grant routes.
- `/t/[tenant]/project/[projectId]/updates` still reaches `cookies()` through the raw
  `getProjectUpdates` (`services/project-updates.service.ts:107`).
- `NonProfitsNavbar.tsx:106` `usePathname()` and `ManageLayoutClient.tsx:8` `useParams()` — Dev #2's.
