# Fitness-Applied Content API Contract

## Purpose

Define the versioned boundary between the Fitness-Applied canonical content service and the consumer mobile app. The mobile app must consume published content only; authoring and CMS operations are outside this client.

## Required capabilities

- Fetch the latest compatible published package.
- Fetch a specific package version for a pinned active or completed program cycle.
- Retrieve programs, calculators, recipes, shopping-list templates, and trophy definitions.
- Return package hash, schema version, locale, publication timestamp, minimum client version, and limitations.
- Support conditional requests or equivalent revision checks.
- Reject unpublished, revoked, incompatible, or malformed packages.

## Package requirements

```text
packageId
schemaVersion
contentVersion
locale
publishedAt
contentHash
minClientVersion
programs[]
calculators[]
recipes[]
shoppingListTemplates[]
trophyDefinitions[]
```

All referenced IDs must resolve within the package or an explicitly declared compatible package. A program cycle stores the exact content version it started with.

## Security

- App clients never receive Fitness-Applied service credentials.
- The app backend validates client authorization before proxying protected app content.
- Public website endpoints and authenticated app endpoints are separate.
- No endpoint returns another user’s app-owned records.
