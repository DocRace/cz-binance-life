# My Binance Life (`/club/chronicle`) — meeting rework

Status: **implemented** in `figma-demo` (wizard back stack, min-6 write, no public review, portrait after writing, merged NFT+Capsule, poster + `ref`, invite board).
Source: stakeholder walkthrough of the live activity (A = host / Race, B = reviewer, C = Ires).
Surface: `figma-demo/src/app/pages/CryptoChronicle.tsx` and related rank/capsule/share code.

This note is the implementation checklist for the next coding pass.

---

## 1. What is live today

Wizard steps (in-memory only, not URL history):

`intro` → `author` (name + gender + role) → `fill` (15 CZ nodes) → `result` (tags + **full writing review** + principles) → `book` (3D cover + price + many CTAs)

Known mismatches with the meeting:

| Topic | Today | Meeting decision |
| --- | --- | --- |
| Back | No per-step Back. Browser Back leaves the wizard (or hits a `replace:true` share URL). Rank Back always goes to `/club/chronicle`. | Every step returns to **the previous place you came from**. Draft must survive. |
| Role / portrait | Forced **before** writing. | Feels like “pick the answer before the test”. Move later (or auto-match after writing). |
| Min answers | `filledCount === 0` → toast (`needOneEntry`). | At least **6** of 15 nodes. Remaining empty is OK. |
| Result “BNB Review” | Reprints the user’s full timeline text. | **Delete.** User does not want private stories on a public page. Keep tags + principles → bind book. |
| Book CTAs | Life Capsule **and** claim NFT **and** 新书打榜 **and** share **and** “logged-in draft” hint. | **Two actions only:** (1) claim NFT + save to Life Capsule, (2) share. |
| Capsule vs NFT | Two buttons; “already opened / already logged in” states. | One button → email-bind sheet. Do not advertise CZ Club vs Capsule login split. |
| Share | Rank modal / X / WeChat / copy. No poster download. | Download poster first, then share X / WeChat. No extra popup. |
| Rank | IP-capped votes (`chronicleRankStore.js`). | **No vote, no IP.** Invite-attributed completions. Poster QR carries `ref`. |
| Partners | Text kicker only (`币安人生书友会 × DataDance`). Cover has no partner marks. | Put 商务印书馆 / partner logos back on intro + cover. |
| Node chrome | Repeated static book-cover thumb on every open node. | Drop dead images; keep the **single timeline line**. |

---

## 2. Target flow (after rework)

```text
Intro (partners + start)
  → Write (CZ nodes, min 6)
    → Keywords + principles (no writing dump)
      → Bind book (price + 3D cover; role/portrait here or just before)
        → Result actions (2 buttons)
```

Optional later: auto-match role from writing, with a short confirm instead of a long picker up front.

Share / invite landing: open **bound book** (cover + price), not the writing review. Invited user taps “写我的一本” → Intro / Write as a **new** stack, with `ref` kept.

Homepage (`/club`) still has a **view leaderboard** entry. Result page does **not**.

---

## 3. Back navigation (definite — do first)

This is the only item called out as non-negotiable in the meeting (demo: Back from result dropped the draft and jumped to the wrong screen).

### 3.1 Why it is wrong now

1. Steps are React state. There is **no Back control** on `author` / `fill` / `result` / `book`.
2. Distill and bind use `setSearchParams(..., { replace: true })`, so the browser stack does not record “I came from fill”.
3. `resetAll` jumps to `author`, not the previous step.
4. Rank `backChronicle` is a hard link to `/club/chronicle` (intro), not the book/result that opened the board.
5. Draft is written on some actions, but the meeting demo lost it when going back.

### 3.2 Rule

**Back always returns to the screen that pushed the current one.**  
Forward can skip; Back cannot invent a new destination.

Keep a small **nav stack** (and mirror it in `history.pushState` so the phone Back key matches the on-screen Back).

### 3.3 Default stack (author after writing)

| Current | On-screen / browser Back | Persist first |
| --- | --- | --- |
| Intro | Leave activity → `/club` (or site referrer if we opened from club) | — |
| Write | Intro | entries |
| Keywords + principles | Write | tags / principles |
| Author / portrait (if after writing) | Keywords + principles | name / role / gender |
| Bound book | Previous wizard step (keywords or author) | step = `book` |
| NFT + Capsule sheet | Bound book (close sheet) | — |
| Share sheet / poster | Bound book | — |
| Leaderboard | `document.referrer` / `from` query / last chronicle step — **not** always intro |
| Invite landing (someone else’s book) | Stay on that book; “写我的一本” starts a **new** stack |

If we keep role **before** writing for one more release, the stack is:

`intro ← author ← fill ← result ← book`

Same rule: Back one hop, never reset, never jump to intro unless the previous hop was intro.

### 3.4 Implementation notes (next coding pass)

- Push a history entry on every `setStep` that is a user-forward action. Do **not** `replace` except when hydrating a landed `?share=` / `?ref=` URL.
- On-screen Back = `history.back()` **or** pop the same stack the history listener uses — one source of truth.
- `saveDraft` on every Back (and on every field blur / node save, as today).
- Resume: reopen the **last step**, not intro, when a draft exists.
- Leaderboard Back: `from=book|result|intro` or `entryId` return URL, e.g. `/club/chronicle?entryId=…` already exists — use it instead of a bare `/club/chronicle`.

---

## 4. Writing step

- 15 nodes stay (CZ chronology). User may leave many blank.
- Gate: **≥ 6 filled** nodes. Toast if fewer (“写得太少”). Do not require all 15.
- Remove the repeated static cover thumbnail in each open node (`bookCover` in the fill accordion). Keep the left **timeline line + dots**.
- Author name can stay as a single field later; do not force role pick here.

---

## 5. Drop the public writing review

`result` today dumps `result.nodes` text (and editable textareas). Meeting: this feels like publishing “how I make money / my white paper” on a public page. There is no reason to “review” it.

**Keep**

- Distilled keywords (ZH/EN as today), max 3 selectable.
- Matched BNB principles, max 3 selectable / editable.
- Primary CTA: 装订成册 → price + cover.

**Remove**

- The “my timeline / BNB Review” block that reprints user prose.
- Any share payload that is only used to render that prose on a public URL (keep entries in draft / capsule handoff if Life Capsule still needs them).

---

## 6. Role / portrait

Meeting: picking a character **before** writing is backwards.

**Target**

- After keywords (or as part of bind-book): confirm name + portrait.
- Prefer **match-after-writing** (existing distill / role heuristics) + short confirm.
- Cover art: **one person** + partner logos on the figure (not a collage of extra stills).

Intro 3D book can keep cycling roles as decoration.

---

## 7. Bound-book actions (only two)

Result/book page after bind:

1. **领取数码版 NFT 并保存到 Life Capsule** (one button).
   - Always opens the email-bind sheet (OTP). Do not branch on “CZ Club already logged in” vs “Capsule not logged in”.
   - Do not show “再次打开 Life Capsules” / “已登录 — 草稿保留在本机”.
   - After success: copy can say saved to Capsule + NFT claimed / pending. Deep-link Capsule in the background if still required technically.
2. **分享**
   - First: **download poster** (save to photos).
   - Then: share to X / WeChat (and optional copy). **No** 新书打榜 modal.
   - Prefer poster download as the top control on the book itself (“下载结果图”).

Remove from this page: 新书打榜, view board, separate Capsule, separate NFT, again/reset as a third primary (reset can stay as a quiet text link if needed).

---

## 8. Poster, QR, invite (`ref`)

Meeting: we never showed the poster; it must exist before share is trusted.

Poster must include:

- Bound book (cover + price + tags / principles — **not** raw answers).
- CZ Life QR that opens **this activity**, not a generic home.
- **Invite param** on both QR and share URL, e.g. `/club/chronicle?ref=<entryId>`.

Share to X: download image + open X with caption (existing high/low price copy is fine).

---

## 9. Leaderboard rewrite (裂变, not 打榜)

Purpose stays: bring more people into the activity. Mechanic changes.

| Drop | Replace with |
| --- | --- |
| “新书打榜” wording on the result page | Invite + “一起出书” |
| IP hash, 3 votes / IP (`chronicleRankStore.js`) | Logged-in **invite attribution** |
| Popularity = vote count | Score = **how many invitees completed a book** |
| “帮他打榜” | Land on the author’s book → write your own (counts for the inviter) |

Display line (example): **「Race 和 N 位书友一起出书」**.

Rewards (meeting):

- **Top 50** (keep a visible prize line on the board — “should have been written on the board”).
- **Sunshine / participation badge** for anyone who finished (activity commemorative badge — can be the existing chronicle FD NFT).

Homepage: keep a **view board** entry. Result: do not.

Anti-abuse: email (or CZ Club) account on the **completing** user; one completion per account; `ref` only counts if the invitee finishes bind-book. No IP vote quota.

---

## 10. Branding and chrome

- Restore 商务印书馆 + other partner / cooperation marks on **intro** and **final cover** (they were removed when the page was simplified).
- Delete leftover stills; one timeline line on the write step.
- Tighten mobile layout (called out at the end of the meeting).
- Intro may keep “view board”; do not add 打榜 as a second start CTA.

---

## 11. Suggested coding order

1. **Back stack + draft** (section 3) — unblock the demo path.
2. Min 6 nodes; strip node stills.
3. Strip writing review from `result`; keep tags + principles + bind.
4. Merge NFT + Capsule into one email sheet; kill dual login copy.
5. Poster download + `ref` on QR / share links; flatten share (no rank modal).
6. Move role/portrait after writing.
7. Rank store: invite completions, copy, homepage-only entry.
8. Partner logos on intro + cover.

Do not ship a half-hybrid again (test campaign codes on a production BFF). Chronicle claim on czlife.club stays on **production** (`czlife-chronicle-fd-prd` / `market.ipdex.vip`).
