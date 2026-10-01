---
name: fitness-session-recap-design
description: Design Fitness Applied's private session overview, reflection, photo, badge, and export recap flow in the mobile app.
---

# Fitness session recap design

Use this skill for workout completion screens, reflections, progress photos,
workout photos, badges, archive cards, and social recap exports.

Treat performance, body measurements, photos, reflection text, and inferred
health data as private by default. Automatic generation is allowed for the
user's private archive; export and sharing always require an explicit action.

Keep the flow:

`session overview → optional reflection → private recap preview → choose content → export/share`

Rules:

- Show completion facts before celebratory decoration.
- Let users omit or remove metrics, badges, and photos before export.
- Redact email, account identifiers, precise location, health measurements,
  private notes, and other sensitive metadata by default.
- Request camera/library permission only when the user chooses to add a photo.
- Support cancel, retry, replacement, deletion, and upload failure without
  blocking workout completion.
- Never claim a recap, photo, or export is saved until persistence confirms it.
- Keep export separate from posting; never auto-publish.
- Add tests for redaction, cancel, remove, upload failure, and account-deletion
  cleanup.
