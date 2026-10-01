---
name: fitness-mobile-ad-ux
description: Design and validate mobile ad placements for Fitness Applied free programs without disrupting active workouts or paid-program promises.
---

# Fitness mobile advertising UX

Use this skill for ad SDK integration, consent, free-program banners,
rest-screen ads, dashboard ads, or paid-program suppression.

Placement priority:

1. Dashboard and marketplace
2. Rest state
3. Reserved space below the active set save/progression action
4. Never inside active set inputs or over a primary control

The set banner must reserve its space, avoid keyboard overlap, preserve focus,
and remain visually secondary to saving the set. A rest-screen ad may be more
prominent only after the rest state is clear and the user has a clear path back
to the workout.

Rules:

- Free programs may render only their configured ad policy.
- Paid/ad-free programs must not request or render ad content.
- Loading, no-fill, consent-required, offline, and error states must fail closed
  without blocking the workout.
- Test and production ad configuration must be distinguishable.
- Do not send workout, health, body-composition, or private-photo data to ad
  providers without explicit consent and platform-policy support.
- Document ATT/consent, SDK permissions, data collection, and deletion behavior.
- Add tests for paid-program suppression, focus safety, no-fill collapse, and
  accessibility labels.

Never call the existing placeholder `AdPlacement` component a complete ad
integration.
