# Contributing Evidence & Governance Mappings

Contributions that strengthen primary legal citations, broaden geographic coverage across Africa, Latin America, Asia-Pacific, MENA, and Small Island Developing States, or sharpen operational verification steps are welcome.

## Evidentiary Standards

1. **Primary Public Sources Only:** Every mapping in `src/data/atlas.json` must link directly (`sourceUrl`) to an official government gazette, multilateral portal, standards catalog, or published statutory bill returning HTTP 200-399. Do not cite secondary blog summaries or ephemeral search redirects.
2. **Exact Locators:** Always specify a granular `clauseCitation` (e.g., an article, section, annex item, or standard control ID) alongside a short `sectionAnchor` keyword that lets reviewers find the provision inside the official text.
3. **Actionable Verification Steps:** Pair each `InteropMapping` with 2-3 concrete engineering, audit, or procurement verification steps so practitioners can operationalize the obligation.
4. **Honest Classification of Friction:** Mark conflicting disclosure deadlines, statutory bans, or privacy-versus-audit clashes as `friction` rather than forcing false equivalence.

## Proposing Changes

1. Edit `src/data/atlas.json` directly or export a validated JSON snippet from the in-app **Scenario Workbench** (`#use-case-sandbox`).
2. Run the verification suite before opening a pull request:

```bash
npm run lint
npm test
npm run build:standalone
```

3. Clearly note in your pull request description whether the addition introduces a newly enacted statute, clarifies an existing `delta`, or flags a newly observed cross-jurisdictional `friction`.
