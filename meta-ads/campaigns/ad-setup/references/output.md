# Output — Meta Ads Ad Setup

Report the created ad compactly. Structured data; no emojis.

## Shape
```json
{
  "action": "created | updated | deleted",
  "account": { "name": "…", "id": "act_…" },
  "adset": { "id": "…", "objective": "OUTCOME_…" },
  "ad": {
    "id": "…",
    "name": "…",
    "status": "PAUSED",
    "creative_type": "single_image | single_video | carousel | dca | multi_format",
    "copy": { "message": "…", "headline": "…", "description": "…" },
    "destination": { "link": "…", "url_tags": "utm_source=…", "lead_gen_form_id": null },
    "cta_type": "LEARN_MORE"
  },
  "ads_manager_url": "https://adsmanager.facebook.com/adsmanager/manage/ads?act=<digits>&selected_ad_ids=<ad_id>",
  "next_step": "Review the ad, then turn the campaign ON (human).",
  "warnings": []
}
```

## Rules
- **Always state `status: PAUSED`.**
- Report `creative_type` — it tells the reviewer what to expect.
- Confirm `url_tags` is present and separate from `link` (tracking wired).
- For LEADS, confirm `lead_gen_form_id` is set (and `link` is null).
- On video, note `ready` vs `pending`.

## Plain-language summary
> "Created the PAUSED ad «…» under the Traffic ad set. Single image, CTA 'Learn more', links to
> portermetrics.com with UTM tracking. It's paused. Next: review and turn the campaign on."
