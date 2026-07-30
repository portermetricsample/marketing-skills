# Format skeleton — Dashboard  ⬜ stub

> An **exploratory grid of widgets**, monitored over time. The reader *scans* (not reads) and drills
> into what looks off. Opposite of the executive report: structure over narrative.

- **Audience:** marketer / media buyer who checks it repeatedly.
- **SUMAS U:** performance management, ongoing.

## Sketch of the skeleton (to be worked, after executive-report is approved)

| # | Block | Bound use case(s) | Note |
|---|-------|-------------------|------|
| 1 | Scorecards row (KPIs + delta) | `funnel-metrics` | Spend · Conversions · CPA · ROAS, each vs prev |
| 2 | Funnel / time series | `funnel-metrics` · `segmentation/time` | Trend, not a single number |
| 3 | Segment breakdown grid | `segmentation/campaign` · `segmentation/audience` | Cut by campaign / audience / device |
| 4 | Health chips | `account-audit` | Verdict chips, drill-in |

**Format-specific rule:** structure leads, no forced single narrative. Same canonical object as the
report, arranged as widgets instead of prose. To be detailed once the report pattern is validated.
