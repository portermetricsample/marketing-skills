# Claude Design handoff — richer visual iteration (optional D3 path)

Offer this when the user wants to iterate the look visually beyond the kit
page (Claude Design gives live visual editing; this skill then resumes from
the export). Only offer it — never require it; the default path builds the
mockup in place.

## The offer (verbatim pattern)

> "I can build the mockup here, or you can iterate it visually in Claude
> Design. If you choose Claude Design, I'll prepare everything you need and
> we'll resume here from your export."

## The handoff package (generate all four)

1. **The approved design kit** — the kit HTML + the frozen 8-variable token
   block (from D2).
2. **Real data samples** — the P2 audit's representative rows exported as
   small JSON/markdown tables (one per planned page), so the design iterates
   on real shapes, not lorem ipsum.
3. **A ready-to-paste brief** — audience, the 3–5 business questions, the
   approved page map (Sections → Pages → Charts), the SUMAS KPI list, and the
   brand constraints (tokens + theme mode + logo).
4. **Numbered instructions for the user:**
   1. Open Claude Design → new project.
   2. Paste the brief; attach the kit HTML and the data samples.
   3. Iterate visually until happy (page by page).
   4. Export the code (HTML/CSS/React — any form).
   5. Return here and share the export.

## Resuming from the export

The export is a **visual specification, not the deliverable**. On return:
- Map its layout/components onto the report template's sections (one page =
  one section file), keeping the template's bridge, controls, and states.
- Re-apply the approved token variables (the export may have drifted).
- Continue at Phase B step 5 (field truth) as normal — every field the design
  implies still gets verified against `list_fields`.
