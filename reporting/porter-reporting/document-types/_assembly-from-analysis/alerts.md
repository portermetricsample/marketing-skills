# Format skeleton — Alerts & notifications  ⬜ stub

> A **trigger-based notification**: runs on a schedule, stays silent unless a threshold trips, and
> when it fires says only *what broke, by how much, and the one fix.* No report, no narrative.

- **Audience:** media buyer who needs to act *now*.
- **SUMAS U:** operational, daily.

## Sketch of the skeleton (to be worked, after executive-report is approved)

| Part | Content | Bound use case(s) |
|------|---------|-------------------|
| **Trigger** | The condition that fires it (e.g. CPA > 3× target, budget-lost-IS spikes, spend anomaly) | the relevant check |
| **Headline** | What tripped + magnitude | `finding.evidence` + `delta` |
| **One fix** | The single `{where, what, why}` | `recommendation` |

**Format-specific rule:** silent by default — **only one finding, only when it crosses a
threshold.** No "everything is fine" sends. The use case still emits the full canonical object; the
alert keeps **only** the `findings` whose `state` ∈ `broken|raise|cut` past the threshold. To be
detailed once the report pattern is validated.
