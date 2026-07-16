# Output — Meta Ads Campaign Setup

After a successful create (or update), report back a compact confirmation. Emit structured data;
the calling surface renders it for the user. No emojis or decorative tables in the raw output.

## Shape
```json
{
  "action": "created | updated | deleted",
  "account": { "name": "<account name>", "id": "act_..." },
  "campaign": {
    "id": "<campaign_id>",
    "name": "<name>",
    "objective": "OUTCOME_...",
    "status": "PAUSED",
    "budget_model": "cbo | adset",
    "budget": { "type": "daily | lifetime", "amount": 50, "currency": "USD", "unit_confirmed": true },
    "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
    "special_ad_categories": []
  },
  "ads_manager_url": "https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=<digits>&selected_campaign_ids=<campaign_id>",
  "next_step": "Attach an ad set (targeting + budget if not CBO), then an ad.",
  "warnings": ["<e.g. budget unit not yet verified in this environment>"]
}
```

## Rules
- **Always state `status: PAUSED`** explicitly so the user knows it is not spending.
- **`unit_confirmed`**: `false` until the budget unit (cents vs whole currency) has been verified in
  this environment via a read-back. If `false`, add a warning and do not report a dollar figure as
  authoritative.
- **`ads_manager_url`**: build from the account digits (strip the `act_` prefix) and the campaign id
  so the user can click straight to it.
- **`next_step`** is mandatory — a campaign alone cannot run. Point to adset-setup.
- On **update**, include only the fields that changed plus the current status.
- On **delete** (test teardown), return `{"action":"deleted","campaign":{"id":...},"account":...}`.

## Plain-language summary (what the user actually reads)
One or two sentences, non-technical:
> "Created the PAUSED campaign «[Q3 Promo] Sales · CBO · $50/day» (id 120xxxx) on account Porter
> Metrics. Objective: Sales, campaign-budget optimization at $50/day. It is paused and spending
> nothing. Next: add an ad set with targeting and an ad, then turn it on when you're ready."
