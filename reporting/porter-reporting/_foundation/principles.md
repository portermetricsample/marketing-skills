# UX/UI principles

The rules every Porter deliverable obeys, regardless of type (report, dashboard,
presentation, audit). A generator that breaks one of these is wrong, even if the data is right.

## 1. Audience before format
Decide *who reads this* before choosing report vs dashboard vs deck vs audit.
A CFO, a marketing manager, and an agency reviewer want the same data shaped differently.
The document type is a consequence of the audience + the job, never the starting point.

## 2. One job per surface
Each document answers one primary question. Everything that doesn't serve it is noise.
If a second question is fighting for space, it's a second document (or a second page).

## 3. Hierarchy is the message
The most important number/insight is the biggest and first. Reading order = priority order.
Never make the reader hunt for the point.

## 4. Always compare
A number alone means nothing. Every metric carries context: vs previous period, vs target,
vs benchmark. (This is inherited from the SUMAS method in `porter-analysis`.)

## 5. Inherit the look, don't invent it
Styling — color, type, chart appearance — comes from the design system, not from the generator.
See [`design-system.md`](design-system.md).

## 6. Same input, any output
The same incoming data should be able to become a report, a dashboard, a deck, or an audit.
That's only possible if generators read a shared input shape — see [`input-contract.md`](input-contract.md).
