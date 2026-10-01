---
description: Apply these rules whenever Fitness Applied mobile UI, workout flow, analytics presentation, ads, photos, or sharing features are changed.
applyTo: 'apps/mobile/**/*.{tsx,ts,js,jsx}'
---

# Fitness Applied mobile design rules

- Design from the user's active task and context first. Workout screens are
  in-motion interfaces: keep one primary action, stable placement for exercise,
  set progress, prescription, and next action.
- Use the repository's existing `palette`, `spacing`, and `radii` tokens. Do not
  add arbitrary colors, shadows, font families, or spacing values without a
  documented token change.
- Preserve accessible labels, roles, states, focus behavior, text scaling,
  contrast, and reduced-motion behavior. Interactive targets must remain at
  least 44 points on iOS and use platform-appropriate 48dp sizing on Android.
- Every new interactive surface must cover valid, empty, loading, disabled,
  error, retry, and completed states as applicable. Errors and important status
  changes must be announced, not conveyed by color alone.
- Keep programmed values, actual values, units, and estimates explicit. Never
  silently replace invalid input with a plausible default. Reuse existing
  strength and effort-conversion functions; do not create a third formula.
- For set-by-set workouts, show the active set as the focus. Persist or pass
  actual weight, reps, effort, quality, and notes distinctly from the
  prescription.
- Ads must be subordinate to the workout task: never cover controls, appear
  inside an active input, interrupt set capture, or render for paid/ad-free
  programs. Keep ad loading and failure states visually safe.
- Photos and social recaps are private by default. Request only the access
  needed, disclose what will be included, hide sensitive data by default, and
  require an explicit user action to export or share.
- Do not call a placeholder camera, ad, recap, or upload feature complete.
  Label unavailable behavior honestly and add a test for the eventual boundary.
- Run the mobile typecheck and focused tests after UI changes. For a material
  flow change, test a realistic multi-set workout with rest, a long exercise
  name, invalid input, and an interrupted session.
