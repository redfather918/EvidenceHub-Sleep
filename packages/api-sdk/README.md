# @evidencehub/api-sdk

TypeScript SDK for EvidenceHub REST API consumers.

## Sprint 2 / Sprint 8

```typescript
import { EvidenceHub } from '@evidencehub/api-sdk';

const client = new EvidenceHub({ apiKey: 'your-api-key' });

// Get a claim
const claim = await client.claims.get('glycine-sleep-latency');

// Search
const results = await client.search({ q: 'melatonin', limit: 5 });

// Get topic evidence
const evidence = await client.evidence.getByTopic('magnesium');
```

## API Endpoints

- `GET /api/claim/[slug]` — Get structured claim data
- `GET /api/evidence/[topic]` — Get topic-level evidence summary
- `GET /api/search?q=&limit=` — Search claims
