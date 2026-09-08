# QFN verified-generated bank v1

The five approved generators produce a committed static artifact (`data/qfn-bank.json`). Run `npm run bank:generate` to rebuild it. Production builds run `bank:check`, independently regenerate and validate the bank, and reject a stale artifact. Browser learning reads the artifact; it never asks an AI to generate questions.

## Scope and distribution

90 generated practice questions: families 1–5 have 15 / 15 / 15 / 20 / 25 variants. STEP 2 / 3 / 4 / 5 have 4 / 15 / 50 / 21 variants. FOUNDATION / STANDARD / APPLIED / PRACTICAL have 4 / 16 / 35 / 35 variants. Basics remain covered by the unchanged fixed lessons. These are structural difficulty labels, not empirical exam calibration.

Existing source inventory is 28 QFN fixed practice + 3 fixed MAX + 2 repair questions (33 reviewed records). The request's “31 reviewed plus 3 MAX” double-counts the three MAX records in the current QFN inventory. No existing question was removed or reclassified. The new QFN total is 121, plus the two repair records.

## Generation and independent validation

`scripts/qfn-bank-pools.ts` defines curated pools, including inverse extrema, domain opening, direction, line placement and combined constraints. `scripts/build-qfn-bank.ts` uses the existing five generators, but checks results independently against original expressions:

- F1: solve the original roots and directly check both interval endpoints.
- F2: evaluate interval endpoints and any vertex inside the interval.
- F3: construct the original parabola–line difference and count its real roots.
- F4: compute both roots, then check the original placement conditions directly.
- F5: evaluate original extrema candidates, root positions, intersection/tangency and additional constraints.

Each record is checked at a 1,001-point grid, every exact boundary and both nearby sides, and two outside points: 91,041 checks in total. These numerical oracle checks complement the generators' algebraic solvers and semantic choice equivalence tests; they are not a formal proof over all real numbers.

The builder rejects non-finite/large coefficients, unintended empty answers, non-unique or equivalent choices, invalid graph viewports, missing/excessively long explanations, duplicate prompts, identical answers in the same structure, and more than three variants per family/structure. Current accepted bank: 82 signatures, maximum two records per signature. Six equal-answer groups remain, each requiring different structural judgments. Three candidates were rejected: two lacked three distinct diagnostic errors; one repeated the same answer and structure.

Equal-score F5 distractors explicitly use Japanese collation. This preserves the development environment's ordering on the English-language CI host; its default locale must not change the published static choices.

## Learning integration

Only registered `verified-generated` QFN practice records join the existing `reviewed` catalog. Old `unreviewed` questions remain excluded. Diagnostic, repair and MAX selection continue to use the existing reviewed material. The Skill/DAG/active-unit rules are unchanged.

Within the current Skill, the selector ranks tier proximity, recent variant/family/structure, unused problems and missing required stable situations. Unstable learners favor basic/standard material, then standard/applied, stable learners favor applied/practical. A MAX preparation button uses practical integration questions without granting MAX. The fixed QFN three-candidate, one-complete-success MAX policy is unchanged.

Family + structure supplies the generated independence key. Choice evidence persists family, variant, structure, generator version and the selected mathematical mistake hypotheses. CrossSkills in those hypotheses remain candidates, not confirmed failures; one wrong selection does not start repair. IndexedDB schema 1 gains an optional evidence field, so old documents remain readable. The additive catalog keeps existing IDs and its version.

## Verification UI

Open `?verify=on`, then “本番問題バンク 90題を確認”. Filter by family/STEP/tier, select a problem and open its dedicated demo. The existing paper submission screen shuffles the four choices and grades by choiceId. After submission, the explanation displays graphs and optional internal validator/oracle/requirements/hypothesis information. No generated question shows a pre-answer graph. Boundary buttons retain `{value,label}` and compute from value.

The preview uses the existing demo namespace. It does not rewrite the normal learner. The 320px browser check covered selection, submission, persistence, explanation and exact-boundary interaction without horizontal overflow.
