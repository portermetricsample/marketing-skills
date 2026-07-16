# Connecting a Meta account safely (official API, not bots)

What to tell a user who wants to connect their Meta Ads account to Claude — and why the path matters.

## The safe path (the ONLY one we use): Porter MCP → official Marketing API
- The user connects their Meta account **through Porter** (dashboard → connect Meta Ads → Google/Facebook
  OAuth login → authorize). Porter is a **registered Meta app with Ads Management access**; every call
  goes through Meta's **official Marketing API** with a proper OAuth token.
- Claude then acts via the **Porter MCP** (`facebook-ads` connector) — `list_accounts`,
  `execute_action`, etc. No password ever touches Claude; the token is held by Porter, never exposed.
- This is sanctioned by Meta's Platform Terms. It respects rate limits, App Review, and permissions.

## The UNSAFE paths (never do these — they get accounts banned)
| Path | Why it's dangerous |
|---|---|
| **Browser automation** (a bot clicking Ads Manager) | Imitates a human browser → violates Platform Terms + trips bot detection → suspension. |
| **Scraping** Ads Manager / Ad Library / Facebook | "Automated data collection without permission" — explicitly prohibited. |
| **Your own app hitting the Graph API without App Review** | Unapproved automated access; aggressive use → flags + block. |
| **Unofficial / "direct" APIs, shared cookies/tokens** | Circumvents Meta's controls → suspension; also a security risk. |

**Key point for the user:** the worry that "connecting Claude gets my account banned" is true **only
for the unsafe paths** (browser bots / unapproved direct API). Through **Porter's official-API
connection**, Claude uses the same sanctioned channel Meta built for tools — the ban risk comes from
*how you connect*, not from using an assistant.

## Checklist when a user connects
1. Connect via **Porter's official Meta integration** (OAuth), not a browser bot or a personal app.
2. Confirm the account has a **verified payment method** in its **own country**.
3. Start with **PAUSED** campaigns and **small budgets**; warm up new accounts.
4. Keep **login/IP/payment context consistent** (avoid VPN-hopping while the automation runs).
5. Know the **rate limits** ([`rate-limits.md`](rate-limits.md)) and operate with backoff.
6. Keep ads **policy-compliant** and declare `special_ad_categories` correctly.

## Backup / resilience
- If Porter's connection drops or a token expires → **re-authorize through Porter** (the dashboard
  prompts it); do NOT fall back to a browser bot or a hand-rolled token.
- If the account gets restricted (`2859015`) → back off and check payment method / recent burst of
  writes; if disabled → Account Quality → Request Review (see why-bans-happen.md).

## Sources
- [Meta Automated Data Collection Terms](https://www.facebook.com/legal/automated_data_collection_terms)
- [Marketing API rate limiting](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/)
- [Disabled/Restricted Account — Meta Business Help](https://www.facebook.com/business/help/422289316306981)
