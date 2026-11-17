# Sensor Simulator

Planned standalone service that periodically submits mock condition readings tied to batch identifiers. It remains separate from the API to preserve the external-device trust boundary.

No implementation language or runtime has been selected yet.

Suggested future layout:

```text
src/
  config/
  readings/
tests/
```

## Addendum: dropped for lack of time

This standalone simulator was **not implemented** in the project timeline — there was no time
left to build it as its own service. This directory remains a planning stub only.

This does **not** mean sensor/condition support is missing from the system: the backend and
contracts already implement it end-to-end (see
[`docs/backend-api.md`](../../docs/backend-api.md) and
[`contracts/README.md`](../../contracts/README.md)). `apps/api/src/blockchain.ts` implements
`reportCondition`, reads breaches via `getConditionBreaches`, and listens for
`ConditionReported` events; the `Workflow` contract's `reportCondition` function records a
reading and auto-compromises the batch on threshold breach. What's missing is only this
external-device process and its matching `POST` route in `apps/api/src/app.ts` to forward
submitted readings on-chain — anyone implementing it can call the existing
`reportCondition` function directly instead of simulating a full separate service.
