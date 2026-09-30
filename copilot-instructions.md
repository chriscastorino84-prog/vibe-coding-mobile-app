# Working in this repository

Read this before writing code. It records decisions and known traps that are
not obvious from the source tree, and it names one unresolved conflict you must
not silently resolve on your own.

## What this project is

A cross-platform Expo application for goal-based, individually purchasable
workout training programs, backed by Supabase. The governing documents are, in
order of authority:

1. `.specify/memory/constitution.md` — supreme. A spec or plan that conflicts
   with it is invalid until one of them is formally amended.
2. `specs/<feature>/spec.md`, then `plan.md`, then `tasks.md`.
3. This file, for cross-cutting engineering practice.

Use the Spec Kit skills in `.github/skills/` for the workflow: `speckit-specify`
→ `speckit-plan` → `speckit-tasks` → `speckit-implement`. Do not skip from an
idea straight to code.

## Correct the stack assumptions before you follow them

`apps/mobile/AGENTS.md` is good general Expo guidance but it is **wrong about
this repository in at least one specific way**. It instructs you to use Expo
Router with routes in `src/app/`. This app does not use Expo Router: it has
`apps/mobile/App.tsx` and plain screens in `apps/mobile/src/screens/`, and
`expo-router` is not in `package.json`.

Before following any structural instruction from that file, verify it against
`apps/mobile/package.json` and the actual directory listing. When they disagree,
the repository wins and you should say so rather than quietly restructuring the
app to match a document.

Everything else in `AGENTS.md` — especially "do not trust your training data
about Expo APIs, read the versioned docs" — stands and matters. This app is on
Expo 57 / React Native 0.86.

## The most important rule in this repository

**There is a second implementation of this app's strength maths, in another
repository, and the two already disagree.**

The Fitness Applied website (`github.com/chriscastorino84-prog/Fitness-Applied`)
ships a tested calculation engine — `src/rpe.js`, `src/bmi.js`, `src/bmr.js`,
`src/tdee.js`, `src/heartRate.js` — published as `@fitnessapplied/formulas`. It
answers several of the same questions `apps/mobile/src/domain/` answers, and it
answers them differently:

| Question | This app | The website engine | Gap |
|---|---|---|---|
| 10 reps at RPE 9, % of 1RM | 80% | 71.8% | **8.2 points** |
| 8 reps at RPE 8, % of 1RM | 80% | 74% | **6.0 points** |
| 5 reps at RPE 8, % of 1RM | 85% | 81.1% | 3.9 points |
| 1RM from 100 × 5 | 113.7 (Lander) | 116.7 (Epley) / 112.5 (Brzycki) | ~4 kg |

On a 200 lb one-rep max, the first row is a 160 lb prescription against a
144 lb one. Same brand, same lift, two answers.

Neither is a bug. `apps/mobile/src/domain/effortConversion.ts` uses a
Helms/Zourdos chart deliberately rounded to five-point increments *because the
underlying literature is coarse*, and it carries explicit uncertainty ranges and
provenance — which is arguably more honest than the website's 81.1%, a figure
that implies a precision the research does not support. The problem is not that
either is wrong. The problem is that one product gives two answers.

### What this means for you

1. **Do not write a third implementation.** If you need a formula that
   `apps/mobile/src/domain/` or `@fitnessapplied/formulas` already provides —
   1RM estimation, RPE/RIR conversion, percentage of 1RM, BMR, TDEE, BMI, heart
   rate zones — use the existing one. Never add a new copy, however small,
   however convenient.
2. **Do not reconcile the two yourself.** Which method wins is a product
   decision the owner has not yet made. If a task requires the answer, stop and
   ask. State the disagreement in the terms above — the numbers, not the
   principle.
3. **If you touch `src/domain/`, say what it means for the website.** Any change
   to a shared formula creates or widens drift. Note it in the PR description.

## Shared code: the intended direction, not yet ratified

The website's tools plan decided that the calculators and the recipe/shopping
list data should be usable from both the site and this app, off one engine. The
app constitution's Article 1.2 says the opposite — that the product is
"independent of the founder's personal website". **Treat Article 1.2 as under
review.** Do not cite it to justify duplicating a formula, and do not amend it
without the owner.

When the decision is made in favour of sharing, the mechanism is expected to be:

- `@fitnessapplied/formulas` added to `apps/mobile/package.json` as a git
  dependency pinned to a tag, not a branch.
- The engine is dependency-free ESM with a `package.json` `exports` map. Metro
  supports package exports, but **verify it resolves before building on it** —
  run a trivial import and a test, and if resolution fails, check
  `unstable_enablePackageExports` in `metro.config.js` rather than vendoring a
  copy.
- A contract test in this repo that runs a shared fixture set through the app's
  code and the engine's and **fails when they disagree**. That test is the point
  of the exercise; without it, sharing a package proves nothing.

Do not begin this migration on your own initiative. If a task depends on it,
raise it.

## What belongs in the app, and what does not

**In scope:** the training programs and their progression, the workout logging
loop, progress graphing and trophies, the purchase and catalog flow, and — once
the sharing question is settled — the fitness and food *tools* (heart rate
zones, BMI, metabolic rate, calorie planner, RPE/RIR, recipes and the shopping
list).

**Explicitly out of scope:** the blogs. The magazine and all editorial content
stay on the website. Do not build a reader, a feed, a CMS client or an article
screen, and do not add a dependency that only serves one.

## Practice

- **Run `npx tsc --noEmit` and the vitest suite before declaring anything done.**
  Tests live beside their subject (`effortConversion.test.ts`).
- **Every estimate is labelled as one.** The existing domain code does this well
  — `label: 'Approximate estimate'`, a `methodVersion`, a `provenance` object and
  an `uncertainty` string. Match that shape for any new calculation. A number
  presented without its method and its error is a number the user cannot judge.
- **Refuse rather than guess.** The domain functions return
  `{ ok: false, error }` for unusable input instead of coercing it. Keep that.
  Do not invent a default to make a function return something.
- **Supabase schema changes are migrations**, numbered in `supabase/migrations/`,
  never hand-edits to a live database. Row-level security is not optional: every
  table that holds user data has an RLS migration beside it, and new ones need
  the same.
- **Do not edit `ios/` or `android/`** — they are generated. Configure native
  behaviour in `app.json`.
- **`npx expo install <pkg>`**, never `npm install`, for anything Expo resolves.

## When you are unsure

Say so, and say what you checked. A wrong answer delivered confidently costs
more here than a question — this project has already lost time to a marker that
rendered zero pixels wide, a tool that loaded and silently rendered nothing, and
a documented claim that was the exact opposite of the truth. All three looked
fine in review. Verify against the running thing, not against what the code
appears to say.
