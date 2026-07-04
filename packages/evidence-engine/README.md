# @evidencehub/evidence-engine

Evidence scoring, deduplication, and graph merge engine.

## Scoring Formula (v2)

```
Score =
  RCT_count x 10
+ Meta_count x 15
+ Human_studies x 8
+ Consistency x 20
+ Effect_size x 20
- Contradictions x 15

Clamp to [0, 100]
```

| Score | Confidence |
|---|---|
| 85-100 | high |
| 65-84 | moderate |
| 0-64 | low |

## Deduplication

Jaccard similarity on text + keywords + topic (threshold: 0.85)

## v1 implemented in src/pipeline/evidence-scorer.ts — will be migrated here.
