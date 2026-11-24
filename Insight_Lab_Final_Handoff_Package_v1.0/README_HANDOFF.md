# Insight Lab — Home Development Handoff

Use this package when starting the project on the home laptop.

## Recommended order
1. Create GitHub repository `scarletbreeze/insight-lab`.
2. Copy `AGENTS.md`, `CLAUDE.md`, and the requirements markdown into the repository.
3. Create `docs/` files from the requirements sections.
4. Run Codex CLI in the repository root.
5. Give Codex only the Foundation task first.
6. Have Claude Code review the result.
7. Fix Critical/High findings.
8. Implement services in order: Hero → VOC → Broker → Market → CEO → Archive.

## First Codex prompt

```text
Read AGENTS.md, CLAUDE.md, and Insight_Lab_Requirements_v1.0.md first.
Do not start coding immediately.

Task: create the Insight Lab foundation only.

Deliver:
1. Astro + React + TypeScript + Tailwind scaffold.
2. Repository folders exactly aligned with requirements.
3. Global Dark Editorial design tokens with Kiwoom-inspired red/blue accents.
4. Shared layout, desktop navigation, mobile menu, footer.
5. Home page with six service cards in a 3x2 desktop grid.
6. Placeholder landing routes for all six services.
7. Global search shell (UI + local placeholder behavior; no backend).
8. GitHub Pages base-path configuration for /insight-lab/.
9. GitHub Actions build/deploy workflow.
10. Lint/typecheck/test/build scripts.

Before implementation:
- inspect repository
- propose implementation plan
- list files to create/change
- identify risks

After implementation:
- run all checks
- summarize changes
- list anything intentionally deferred

Do not implement the six service features yet.
```

## Claude review prompt

```text
Read AGENTS.md and Insight_Lab_Requirements_v1.0.md.
Review the current diff without rewriting it.

Check:
1. requirements coverage
2. architecture and unnecessary complexity
3. repository boundaries
4. component reuse
5. design-system consistency
6. mobile/accessibility
7. GitHub Pages base-path/deploy correctness
8. tests/build
9. public-data/privacy policy compliance
10. anything that will make the six services harder to add later

Classify findings as Critical / High / Medium / Low.
End with APPROVE, APPROVE WITH FOLLOW-UPS, or CHANGES REQUIRED.
```
