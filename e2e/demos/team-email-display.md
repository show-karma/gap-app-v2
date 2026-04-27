### Authorized team-member emails on the About / Team page

This change adds a privacy-aware email row to each team-member card.

**How it works**

- For **public visitors** the card looks the same as before — name, address, socials, bio. No email is rendered.
- Once a viewer is **signed in**, `useTeamProfiles` calls the backend's authorized lookup and merges any returned emails into the team profiles. The card now renders a `mailto:` anchor right under the address; clicking it opens the user's default email client.
- If the authorized lookup fails (network error, 5xx, etc.) the hook quietly falls back to the public profiles and reports the failure to Sentry via `errorManager`, so we keep observability without breaking the page.
- The query key includes the `authenticated` flag, so signing in/out invalidates the cache and the email row disappears immediately on logout.

The recording below captures a public visit, then simulates the authorized response and shows the email row appearing as a clickable mailto link.
