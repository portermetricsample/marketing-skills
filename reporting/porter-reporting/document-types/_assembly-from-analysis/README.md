# _assembly-from-analysis/ — format assembly specs

Moved here from `porter-analysis/_orchestrator/formats/` on 2026-06-21. **Assembly** (how each
format is laid out) is Reporting's job; `porter-analysis` only decides *which* sections appear and
in *what order*.

These are the starting point to fold into each document type:

| Spec | Folds into |
|------|-----------|
| `executive-report.md` | `../report/` |
| `dashboard.md` | `../dashboard/` |
| `slides.md` | `../presentation/` |
| `alerts.md` | delivery mode (no fixed skeleton) |
| `chat-adhoc.md` | delivery mode (no fixed skeleton) |
