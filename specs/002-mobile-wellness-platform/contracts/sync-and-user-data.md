# Offline Sync and User Data Contract

## Operation envelope

```text
operationId
userId
entityType
entityId
operationType
payload
clientCreatedAt
schemaVersion
```

## Rules

- `operationId` is unique and idempotent.
- Append-only workout, set, measurement, trophy, and photo metadata operations may be retried safely.
- Server acknowledgements include accepted, duplicate-acknowledged, rejected, or requires-repair states.
- Rejected operations remain visible to the user and are not silently discarded.
- Preferences and cache metadata may use a documented last-write-wins rule.
- Account deletion cancels pending operations and removes user-owned records and private photo objects according to policy.
