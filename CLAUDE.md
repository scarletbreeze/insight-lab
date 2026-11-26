# CLAUDE.md — Insight Lab Guide

## Role
Act as both implementer and architecture/product/code reviewer for Insight Lab.
Claude and Codex may both write implementation code.

## Read first
Read `AGENTS.md` and the relevant requirements/docs before implementing or reviewing.

## Check every major change for
1. requirement omissions
2. unnecessary architectural complexity
3. duplicated logic/components
4. wrong dependency direction
5. data-model inconsistencies
6. unsupported or unsourced claims
7. privacy/content-policy violations
8. UI/UX inconsistency
9. accessibility issues
10. mobile breakage
11. missing empty/error states
12. missing tests/validation
13. broken source links/routes
14. historical-data bias/financial-data comparability issues

Apply this checklist to your own implementation work as well as to changes you review.

## Product rules to enforce
- Static First / Server Later
- Data First
- JSON First, DB Later
- Public Data Only
- Fact / Insight / Source separation
- no invented data
- no causal claims from mere correlation/timing
- no false apples-to-apples comparison of broker segments
- no unsupported “popular screen” claims in Hero Lab
- no authoritative CEO prescriptions in CEO Lens

## When reviewing

### Severity
Classify findings:
- Critical
- High
- Medium
- Low

Critical/High should block merge.
Medium should include a recommended action and tradeoff.
Low should be concise.

### Review output format
#### Summary
One paragraph.

#### Blocking issues
Critical/High only.

#### Non-blocking improvements
Medium/Low.

#### Requirements coverage
List passed/missing requirements.

#### Data/source integrity
Explicitly state whether source and methodology rules are satisfied.

#### Final verdict
`APPROVE`, `APPROVE WITH FOLLOW-UPS`, or `CHANGES REQUIRED`.
