# Tasks: pagination

## Review Workload Forecast
- Estimated changed lines: ~350 lines (3 pages + shared types)
- 400-line budget risk: Medium
- Chained PRs recommended: No (single PR sufficient)
- Delivery strategy: ask-on-risk
- Decision needed before apply: No (single PR fits within budget)

---

### Phase 1: Infrastructure (shared types/hooks if needed)
- [ ] 1.1 Create shared pagination types if needed (or reuse from LibraryClient)

### Phase 2: Drafts Pagination
- [ ] 2.1 Create drafts-client.tsx with pagination state and Load More button
- [ ] 2.2 Modify drafts/page.tsx to fetch initial 12 items + count, pass to client

### Phase 3: Completed Pagination
- [ ] 3.1 Create completed-client.tsx with pagination state and Load More button
- [ ] 3.2 Modify completed/page.tsx to fetch initial 12 items + count, pass to client

### Phase 4: Search Pagination
- [ ] 4.1 Modify search/page.tsx to track total per type and show Load More buttons

### Phase 5: Verification
- [ ] 5.1 Test /editor/drafts with >12 items
- [ ] 5.2 Test /editor/completed with >12 items  
- [ ] 5.3 Test /search with >8 results per type
- [ ] 5.4 Verify build passes: npm run build