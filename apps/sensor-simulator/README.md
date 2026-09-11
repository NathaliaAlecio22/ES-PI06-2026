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
