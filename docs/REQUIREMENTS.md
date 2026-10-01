# CineScope — Requirements & Phases

**Product:** Point your phone at a streaming UI (Netflix, etc.), tap a title, get IMDb / Rotten Tomatoes / Metacritic ratings instantly.

**Promise:** One gesture on someone else’s screen — not a second search app. Keyboard and pickers are escape hatches, not the default path.

---

## Current state (as of Phase 1)

| Capability | Status |
|------------|--------|
| Tap → still photo → on-device OCR (tap-targeted) | Done |
| Express BFF proxy (OMDb + TMDB, keys server-side) | Done |
| Ratings detail + local scan history + 24h cache | Done |
| “Did you mean…” when TMDB returns multiple matches | Done |
| Manual title entry when OCR fails | Not built |
| Live RT overlays on camera | Not built |
| Learning from user corrections | Not built |

**Lookup today:** cache → OMDb exact title → TMDB multi-search → resolve by IMDb id. No AI repair, no correction memory.

---

## Phase overview

```
Phase 1  Tap-targeted scan + ratings BFF          ✅ Done
Phase 2  Failures → type-it-in + correction memory  ← Next
Phase 3  Smarter recovery (fuzzy + AI assist)
Phase 4  Live overlay (“AR”) ratings on camera
Phase 5  Accounts / sync / multi-device (optional)
```

Phases 2–3 improve **hit rate** without changing the couch UX. Phase 4 changes the interaction model. Don’t block Phase 2 on Phase 4.

---

## Phase 1 — Tap-targeted scan *(done)*

**Goal:** Only the title under the user’s finger counts.

### Requirements
- Capture tap coordinates on the camera preview.
- Map preview coords → photo pixel coords (cover-fit, orientation).
- OCR the full frame; keep only the block at / nearest the tap.
- One title per tap → lookup; no multi-title OCR picker.
- Ambiguous **API** matches may still show “Did you mean…”.
- Copy: “Tap the title you want ratings for.”

### Out of scope for Phase 1
- Continuous / frame OCR
- On-camera score badges
- Manual search UI

---

## Phase 2 — Manual entry + learning loop *(next)*

**Goal:** When OCR can’t read stylized type (Netflix display fonts, neon titles, low contrast), the user can type the title — and that correction makes the same failure cheaper next time.

### Problem

ML Kit is a **fixed** OCR model. We cannot retrain it from app usage. “Learning” here means **product memory + better matching**, not updating ML Kit weights.

Netflix (and similar UIs) often fail because:
- Custom / condensed / outlined display fonts
- Title art that is half-image, half-text
- Soft focus from filming a TV
- OCR returns garbage or empty near the tap

### UX requirements

1. **Trigger manual entry when:**
   - No OCR block at / near tap
   - OCR text looks non-title (noise heuristics)
   - Lookup returns `not_found` after OCR
   - User taps an explicit “It’s wrong — type the title” control after a bad result or bad OCR string
2. **Manual entry sheet:** short text field, optional year, submit → same `/lookup` path as OCR.
3. **Preserve context for learning:** when the user corrects, store enough to recognize the same situation again (see Learning model below).
4. Keep the happy path 1-tap; typing is rare and clearly an escape hatch.

### Decisions locked (practical defaults)

| Question | Decision for Phase 2 |
|----------|----------------------|
| Alias scope | **Device-only** (AsyncStorage). No server sync yet. |
| What we store | **Strings only** — normalized `ocrRaw` → `imdbId` (+ resolved title). No title crops, no crop hashes, no image upload. |
| Consent / “help improve recognition” | **Deferred** until we sync aliases across users. Local corrections need no contribution copy. |
| Platform detection | **Generic** — no Netflix-specific path yet. |
| AI / vision | **Phase 3+** — not in Phase 2. |

### Learning model (how the system improves)

Do **not** claim we retrain OCR. Phase 2 ships a **local string alias map** only.

#### Layer A — Alias map (ship with Phase 2)

When the user types the correct title after a failed/wrong OCR:

| Field | Purpose |
|-------|---------|
| `ocrRaw` | Normalized OCR string (required to learn; skip alias write if OCR was empty) |
| `canonicalTitle` | Resolved / user-confirmed title |
| `imdbId` | Stable id after successful resolve |
| `count` / `lastUsed` | Confidence and TTL hygiene |

**Lookup order becomes:**

1. **Local alias map** (`ocrRaw` → `imdbId`) then resolve/cache
2. Existing ratings cache
3. OMDb exact
4. TMDB search → resolve

So the second time *this device* sees the same OCR garbage string for a previously corrected title, we skip the dead end and go straight to ratings.

- Prefer `imdbId` as the learned target, not free-text alone.
- If OCR returned nothing, still allow type-in for lookup — but there is nothing to alias until OCR produces a repeatable string.

#### Layer B — Confirm / reject (same phase)

- After a successful lookup from OCR, allow “Not this title” → opens type-in and writes an alias from `ocrRaw` → correct `imdbId`.
- Delete or overwrite a bad alias if the user rejects it.

#### Layer C — Explicitly out of Phase 2

- Fine-tuning ML Kit or a custom OCR model
- Uploading photos or title crops
- Server-synced / crowdsourced aliases
- “Help improve recognition” contribution UI or consent copy

### Deferred (later, after Phase 2 proves useful)

1. **Server sync of aliases** — survive reinstall; help all users.
2. **Contribution copy** — e.g. “When you correct a title, we can save that fix so similar scans work better for you and other CineScope users,” with an opt-in/out if needed.
3. **Tight title crops** — only if string aliases miss too often (empty OCR / unique garbage each tap); enables hash matching or vision.
4. Platform-specific hints (Netflix vs others).

### Exit criteria

- User can always recover from OCR/lookup failure by typing.
- A repeated identical OCR miss for a previously corrected title resolves via **local** alias without typing again.
- Dev-visible logs: OCR success, manual-entry, alias hit/miss (device-only).

---

## Phase 3 — Smarter recovery

**Goal:** Reduce how often Phase 2 typing is needed.

### Requirements
1. **Fuzzy rank** TMDB candidates against OCR text (edit distance / token overlap) before showing “Did you mean…”.
2. **Broader ambiguous UX:** show picker when confidence is low, not only when `matches.length ≥ 2`.
3. **AI assist (optional last resort):**
   - Text repair: OCR garbage → likely title query → TMDB again
   - Vision (optional): send title crop to a multimodal model when OCR empty / nonsense
4. AI / vision only after deterministic layers (alias → OMDb → TMDB); keep cost and latency gated.
5. Manual type-in remains the final escape hatch; AI never blocks the user from typing.

### Out of scope
- Replacing on-device OCR entirely with cloud vision for every tap

---

## Phase 4 — Live overlay ratings

**Goal:** Automatic scan that overlays RT (and optionally IMDb) on-screen at title bounds — the “AR” experience.

### Requirements
1. Continuous or periodic frame OCR (frame processor), not only still photos.
2. Stable tracks per text region (debounce / hysteresis so scores don’t flicker).
3. Map OCR bounds → preview overlay (Skia or equivalent).
4. Lookup + cache per visible title; rate-limit network.
5. Tap still works as “focus / open detail” on an overlaid title.

### Depends on
- Solid Phase 2–3 hit rate; overlays on wrong titles feel worse than a miss.
- Alias map remains valuable for stylized Netflix type in live mode.

### Out of scope for first overlay ship
- True world-locked ARKit planes; screen-relative overlays are enough.

---

## Phase 5 — Accounts & sync *(optional)*

- Sign-in, cloud history.
- **Shared alias contributions** (opt-in) + “help improve recognition” copy — moved here from Phase 2.
- Watchlists / “save for later.”
- Only after core scan → rate loop feels reliable.

---

## Non-goals (all near-term phases)

- Becoming a full catalog browser or streaming aggregator
- Social feeds, reviews writing, or community ratings of our own
- Android parity before iOS scan loop is excellent (unless needed sooner)
- Training a proprietary OCR foundation model in-house

---

## Success metrics

| Metric | Why |
|--------|-----|
| Tap → ratings success (no typing) | Core promise |
| Manual-entry rate | OCR / catalog pain |
| Alias hit rate | Learning is working |
| Time to first rating | Couch UX |
| Wrong-title rate (rejects) | Trust |

---

## Remaining open questions

1. **AI provider (Phase 3):** OpenAI / other, behind a flag?
2. **Alias TTL:** expire unused local aliases after N months, or keep forever until user clears data?

---

## Suggested Phase 2 implementation slice

1. Manual title entry UI from scanner + not-found / wrong-title paths.
2. Client alias store (AsyncStorage) keyed by normalized `ocrRaw` → `imdbId`.
3. Check local aliases in `useRatings` before calling the API (or pass through resolve-by-id when hit).
4. Log correction / alias hit-miss on device.
5. Do **not** sync aliases, upload crops, or add contribution consent UI yet.
