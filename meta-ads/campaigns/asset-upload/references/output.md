# Output — Meta Ads Asset Upload

Return the uploaded asset id(s) so `meta-ads-ad-setup` can attach them. Structured data; no emojis.

## Shape
```json
{
  "account": { "name": "<account name>", "id": "act_..." },
  "assets": [
    {
      "type": "image | video",
      "image_hash": "<hash>",          // for images
      "video_id": null,                // for videos (async — see processing)
      "source": { "drive_file_id": "1x…", "name": "business-restaurantes.jpg", "mime": "image/jpeg", "size_bytes": 109167 },
      "processing": "ready | pending"  // videos: pending until Meta finishes
    }
  ],
  "rejected": [
    { "name": "deck.gslides", "reason": "native Google file — export to PNG/JPG first" }
  ],
  "next_step": "Attach in meta-ads-ad-setup (single image / carousel card / DCA asset).",
  "warnings": []
}
```

## Rules
- Return one entry per file; **keep `source.name`** so the buyer maps hash → file.
- **Videos:** report `processing: "pending"` until confirmed ready; tell ad-setup not to create the
  video ad until it flips to `ready`.
- List anything **`rejected`** with a plain reason (wrong type, native Google file, too big) — never
  drop a file silently.
- On a Meta throttle, report it as a transient block with a retry note, not a hard failure.

## Plain-language summary
> "Uploaded «business-restaurantes.jpg» from your Drive to Acme POS — image hash ready. Skipped
> «deck.gslides» (it's a Google Slide; export it to PNG first). Next: attach the image in ad-setup."
