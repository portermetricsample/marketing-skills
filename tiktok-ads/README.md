# TikTok Ads & Social

Competitor intelligence for TikTok, built on the same pipeline as `meta-ads`.

- **research/tiktok-ads-research** — full teardown of a brand's TikTok presence:
  - **Ads mode** — the public TikTok Ad Library (library.tiktok.com) per advertiser.
  - **Social mode** — a brand's organic posts, with real public engagement (views/likes/comments/shares) to rank actual winners.

Both reuse the shared enrichment + Porter report engine that lives with the Meta
pipeline (mobile repo: `workspace/use-cases/meta-ads-pipeline/scripts/`), and both
emit a self-contained, TikTok-themed Porter HTML report. See the skill's SKILL.md
for the one-command runner (`tt_run.py`), the verified recipe, and the EU-disclosure
caveat.
