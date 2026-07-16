# Output — Meta Ads Ad Set Setup

Report a compact confirmation after create/update. Emit structured data; no emojis/tables in the raw
output.

## Shape
```json
{
  "action": "created | updated | deleted",
  "account": { "name": "<account name>", "id": "act_..." },
  "campaign": { "id": "<campaign_id>", "objective": "OUTCOME_...", "is_cbo": true },
  "adset": {
    "id": "<adset_id>",
    "name": "<name>",
    "status": "PAUSED",
    "optimization_goal": "LEAD_GENERATION",
    "billing_event": "IMPRESSIONS",
    "destination_type": "ON_AD",
    "budget": { "level": "campaign | adset", "type": "daily | lifetime", "amount": 300000, "currency": "COP" },
    "targeting_summary": "CO · 25–55 · feed+stories · broad",
    "promoted_object": { "page_id": "...", "lead_gen_form_id": "...", "pixel_id": null },
    "is_dynamic_creative": false
  },
  "next_step": "Attach an ad (creative + copy + CTA) with meta-ads-ad-setup.",
  "warnings": ["<e.g. campaign bid_strategy was WITH_BID_CAP; fixed to WITHOUT_CAP before create>"]
}
```

## Rules
- **Always state `status: PAUSED`.**
- **`budget.level`**: say where the budget actually lives — `campaign` when CBO (ad set carries none),
  `adset` otherwise. Never report an ad-set budget on a CBO campaign.
- **`targeting_summary`**: one human line (geo · age · placements · broad/interest-based).
- **`is_dynamic_creative`**: report it — it constrains what creative can attach next.
- **`next_step`** mandatory → point to ad-setup, and if placements were restricted, name the required
  aspect ratios.
- On any Meta throttle (`2859015`), report it as a transient block with a "retry later" note, not a
  failure of the setup.

## Plain-language summary (what the user reads)
> "Created the PAUSED ad set «Acme POS · CO · Broad» under the Leads campaign. It targets Colombia,
> 25–55, on feed + stories, optimizing for lead form completions. Budget is on the campaign (CBO), so
> the ad set carries none. It's paused. Next: attach an ad with the lead form."
