# Why Meta ad accounts get flagged / disabled

The triggers, grouped. Most bans are a mix of "unusual activity" + policy. Design automations to avoid
all of these.

## 1. Automation done the WRONG way (the one this skill exists for)
- **Browser automation / scripting Ads Manager** (a bot imitating a human browser) → violates Meta's
  Platform Terms ("automated means without prior permission") and trips bot-detection.
- **Scraping** Facebook / Ads Manager / Ad Library.
- **Unapproved app** hitting the Graph API, or unofficial/"direct" APIs, or bypassing logins /
  rate limits / CAPTCHAs.
- These are *explicitly prohibited*; consequence is account suspension. → Use the official Marketing
  API (Porter MCP) instead.

## 2. "Unusual activity"
- **Sudden spend spikes** — an account that jumps from low to very high spend overnight gets flagged.
- **Bursts of API writes / rapid bulk changes** — hammering create/update flags automated abuse and
  hits rate limits (see rate-limits.md); the throttle `subcode 2859015` ("account restricted /
  temporarily blocked") is the early warning.
- **Logins from different IPs / devices / countries**, or driving the account through a VPN, in short
  windows.
- **Multiple ad accounts** created/operated in patterns that look like evasion.

## 3. Payment problems
- A **credit card from a different country** than the account, or rapid payment-method changes.
- **Multiple simultaneous payment attempts** on the same account.
- **Late / failed payments** on already-approved ads.
- A brand-new account with **no verified payment method** can't even create ad sets (`2859015`).

## 4. Ad policy violations (the #1 hard-ban reason)
- Content against Meta's Advertising Standards (prohibited/restricted products, misleading claims,
  personal attributes, etc.).
- Wrong / missing **special ad category** (housing, employment, credit, politics).
- **Repeatedly editing ads Meta already approved**, or a **history of many rejected ads**.

## 5. Account integrity
- **Compromised account** (suspicious logins) → Meta locks it defensively.
- Brand-new **cold account doing large volume immediately** ("no warm-up").
- Random **false-positive flags** (bugs) — real, but rarer; the fix is Request Review.

## What to do if already disabled
Don't keep calling the API. Send the user to **Account Quality → Request Review** (verify identity,
explain, wait ~48h). An automation cannot un-ban an account.

## Sources
- [Meta Automated Data Collection Terms](https://www.facebook.com/legal/automated_data_collection_terms)
- [Troubleshoot a Disabled or Restricted Account — Meta Business Help](https://www.facebook.com/business/help/422289316306981)
- [Ad account disabled — reasons & fixes (Madgicx)](https://madgicx.com/blog/what-to-do-if-your-facebook-ad-account-is-disabled) · [gologin](https://gologin.com/blog/facebook-ad-account-disabled/)
