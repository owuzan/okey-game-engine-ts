# Okey 101 (101 Okey / Yüzbir) — rules research for a rules engine

Researched 2026-11-10. Classic Okey is covered elsewhere; this file only describes 101.

## How to read this file

**Source trust tiers** (used throughout as `[P]`, `[W]`, ... tags):

| Tag | Source | URL | Trust / note |
|---|---|---|---|
| `[P]` | pagat.com "Okey 101" (John McLeod, 2013, based on Erol Karataş) | https://www.pagat.com/rummy/okey101.html | High. Most internally consistent; has a full scoring table. |
| `[W]` | Turkish Wikipedia "Okey 101" | https://tr.wikipedia.org/wiki/Okey_101 | Medium. Tagged unsourced/needs cleanup; "Ek Kurallar" section is a grab-bag of house rules. Read as raw wikitext (verbatim). |
| `[A]` | AltinStar "Okey 101 rules" (online platform) | https://altinstar.com/en/how-to-play-okey/okey-101-rules | Medium-high (platform rule page). Near-identical text to `[W]` main sections. |
| `[OE]` | Okey Evi "Oyun Kuralları" (online platform, 101/Okey/51/34) | https://www.okeyevi.com.tr/OyunKurallari.aspx | Medium-high (platform rule page describing implemented behaviour). |
| `[C]` | cikcik.com "101 Okey nasıl oynanır" (online platform) | http://www.cikcik.com/nasiloynanir/101okey/yuzbir_okey_oyunu.htm | Medium-high (platform rule page describing implemented behaviour). |
| `[J]` | Jawaker blog "101 Okey rules" (online platform) | https://blog.jawaker.com/en/okey-rules/ | Medium-high (platform rule page). Scoring table matches `[P]`. |
| `[SC]` | Sinan Çorbacı blog, numbered 101 rules (2013; looks like a copy of an online platform's rule list, very close to `[OE]`) | http://sinancorbaci.blogspot.com/2013/04/101-oyununun-kurallar.html | Medium-low. |
| `[BG]` / `[BN]` | 101okeyy blogspot "Genel kurallar" / "Nasıl oynanır" | http://101okeyy.blogspot.com/p/genel-kurallar.html , http://101okeyy.blogspot.com/p/nasil-oynanir.html | Medium-low. Only clear source on katlamalı + eşli interaction besides `[CT]`. |
| `[CT]` | okey101cetele.com blog (scorekeeping app; several articles) | https://okey101cetele.com/blog/ (individual URLs cited inline) | Low-medium. SEO-style content, self-describes its values as "not official". Useful for the "live table" (kahvehane) conventions. |
| `[BD]` | 101buddy.com guide | https://101buddy.com/rehber/101-okey-kurallari-ve-cezalar | Low-medium. |
| `[K]` | 101kurallari.com | https://101kurallari.com/ | Low. |
| `[AT]` | Atarita "101 Okey nasıl oynanır" | https://www.atarita.com/101-okey-nasil-oynanir/ | Low (gaming news article). |
| `[D]` | destek360.com | https://www.destek360.com/101-okey-nasil-oynanir/ | Low. |
| `[TI]` | Tamindir listing for Mynet "101 Çanak Okey" | https://www.tamindir.com/indir/101-canak-okey/ | Used only for which table options exist. |
| `[AS]` | App Store listing "101 Okey Plus" (Zynga) | https://apps.apple.com/app/id649260774 | Used only for release notes. |

**Method caveats (important):**

- Except for `[W]` (read verbatim as wikitext), pages were read through a fetch tool that summarises page content. Numbers were cross-checked across sources, but individual wording may be paraphrased. Treat single-source claims as needing confirmation.
- **Not found / not verifiable on the public web:** the in-app help text of 101 Okey Plus (Zynga), 101 Yüzbir Okey Extra, Mynet 101 Çanak Okey, VIP 101 and Okey.net 101. Their store listings only point to an in-app "yardım" section. Nothing below should be read as "this is what Zynga does" unless explicitly stated. `okey-gg.pages.dev/101/*` appeared in search results but could not be fetched.
- Two families of rules exist and explain most disagreements:
  - **Online-platform family** (`[P] [W] [A] [OE] [C] [J] [SC]`): flat 101 penalties, discard-taker never penalises the discarder.
  - **Live-table (kahvehane) family** (`[CT]`, `[W]` "Ek Kurallar"): taking a neighbour's discard costs the *discarder* tile value x 10; taking a laid okey costs the player who laid it 101.

---

## 1. Tile set and deal

- **Tiles:** 106 = numbers 1-13 in 4 colours, two copies each (104) + 2 false jokers (sahte okey). `[P] [W] [A] [BN] [K] [D]`
- **Players:** 4. `[P] [W]` (Jawaker also has a 2-player mode `[J]`; destek360 mentions 3-4 live `[D]`.)
- **Deal:** 21 tiles each, **22 to the starter**. All sources agree on 21/22. (One search snippet stating 22/21 reversed is an error.)
  - Who is the starter: the player to the **dealer's right** `[P] [W] [BN]`. `[A]` words it as "the dealer gets 22 and discards first" — outlier wording; equivalent for an engine (one "starting player" seat with 22).
- **Direction of play:** anticlockwise (turn passes to the right; you take the discard of the player on your left). `[P] [W] [A] [K]`
- **First move:** the 22-tile player does not draw; they may meld and then discard. `[P] [W] [OE]`
- **Dealer rotation:** passes to the right after each hand `[P]`; equivalently, the next hand is started by the player after the previous starter `[C]`.
  - Exception `[P]`: after a void hand (pile exhausted / all four opened with pairs) the **same dealer deals again**.
- **Indicator (gösterge) and okey:** one tile turned face up; okey = same colour, number + 1; indicator 13 -> okey is 1. `[P] [W] [A] [J] [K]`
  - If the turned tile is a false joker: redraw `[P] [CT]`. Variant in `[W]` "Ek Kurallar": a false-joker indicator is called **"riziko"** and doubles the hand's scores (see section 15).
- **False joker:** not wild; it stands for the tile that the okey *is* (colour and number of the okey tile). `[P] [W] [A] [K]`
- **Physical stacking** (15 stacks of 7 + 1, dice) `[P]`; "14 groups of 7" `[BG] [K] [D]` — irrelevant to an engine beyond a uniform random deal.
- Arithmetic check: 106 - (3x21 + 22) - 1 indicator = **20 tiles in the draw pile** (confirmed by `[BN]`). Hands are short: at most 20 draws.

## 2. Turn flow and taking the discard ("yandan taş alma")

Turn = (1) draw from pile **or** take the previous player's last discard, (2) optionally open / meld / lay off, (3) discard exactly one tile. `[P] [W] [A]`. Every turn ends with a discard, including the going-out turn. `[P] [W]`

**Taking the discard — rules where sources agree:**

- A taken discard **must be used on the table that same turn**; it may not be kept on the rack. `[P] [W] [A] [OE] [SC] [BG] [BN] [C]`
- If the taker **has not opened**, they must open that very turn, and the taken tile must be part of the opening melds; its value counts toward the 101. `[P] [W] [A] [OE] [SC] [BG] [C]`
- "Identical twin" allowance: if the player holds the identical tile (same colour and number), either copy satisfies the requirement. `[OE] [SC] [BG]` (`[W]` mentions the same trick for partnership play.)

**Disagreements:**

| Question | Position A | Position B |
|---|---|---|
| Player takes the discard but cannot use it | Put it back and draw from the pile, **no penalty** `[W] [A] [OE] [SC] [BN]` (platforms simply refuse the move, with a "Geri Bırak" button) — **more common** | Tile is returned and taker gets **101** `[BD] [CT: yandan-yerden-tas-alma]` |
| Already-opened player taking the discard | Must still use it immediately in a meld / lay-off `[P]`, `[AT]` ("only if you can open or lay off") — **more common in rule texts** | "Unconditionally" may take from side or pile `[C]` (unclear whether the tile may then sit in hand; treat as unverified) |
| Does taking a discard penalise the **discarder**? | No (online-platform family; nothing in `[P] [A] [OE] [C] [J]`) — **default for online play** | Yes: discarder gets **tile value x 10** (e.g. a 6 costs 60) `[W "Ek Kurallar"] [CT]`. In partnership, the discarding *team* is penalised `[W]`. Live-table rule. |
| Player who opened with pairs | May take discards like anyone else (implied by `[P] [C]`) | "A player going for pairs cannot take from the side, even if not yet opened" `[SC #17]`; `[C]` says a pairs opening requires having drawn *from the pile* (i.e. you cannot open pairs with a taken discard). `[W]`: taking a tile from a pairs-opener costs 101 (garbled sentence; unverified). |

Engine suggestion: model `takeDiscard` as a tentative action that must be committed by a legal meld/lay-off containing that tile (or its identical twin) before the discard; otherwise roll back to a pile draw. Make "failed take penalty (0 / 101)" and "discarder penalty (none / value x 10)" options.

## 3. Opening ("el açma") with runs/sets

- **Threshold:** total face value of the melds laid in the opening turn must be **>= 101**. `[P] [W] [A] [OE] [C] [J] [BN] [K] [BD]` (`[AT]` says "must exceed 101" — loose wording; >= 101 is the consensus; `[OE]` explicitly: middle-sum 33 with side tiles giving 101 is enough.)
- **Tile values:** face value (1 = 1 ... 13 = 13). An **okey counts as the tile it represents**. `[P]`. False joker = value of the okey tile it stands for.
- **Is "1 after 13" allowed?** **No.** 1 is low only; 12-13-1 and 13-1-2 are invalid in 101. `[P] [W] [OE] [SC] [BG] [K] [D]`. So a 1 is always worth 1. (This differs from classic Okey.)
- **Meld shapes:**
  - Set (per): 3 or 4 tiles, same number, all different colours. `[P] [W] [K]`. (`[BN]` mentions "3, 4 or 5" — impossible with 4 colours unless duplicates allowed; treat as an error.)
  - Run (seri): >= 3 consecutive, same colour, no wrap. No stated maximum length (up to 13).
  - Minimum meld size 3. `[W] [A] [BG]`
- **Must the threshold be met in one turn?** Yes — the opening is a single-turn event: the sum is evaluated at the moment the turn's discard is made; there is no "adding to your opening total later". `[BG #17] [P] [C]`
- **After opening:** any further valid meld may be laid in later turns with no minimum. `[C] [P]`
- **Mental shortcut** (for UI/hints only): sum of the middle tiles of 3-tile melds must reach 34 (34 x 3 = 102; 33 plus side tiles can reach 101). `[P] [OE] [AT] [D]`
- **Exception — going out from hand ("elden bitme"):** a player who lays all tiles in one turn (keeping one to discard) wins even if the total is under 101. `[P] [OE] [BG]` ("eliniz 90 ise ve elden bitiyorsanız açıp bitebilirsiniz")
- **Rising threshold ("katlamalı")**: see section 11.
- **Invalid opening attempt:** tiles go back to the rack and the player gets 101. `[P] [W] [A] [OE] [C] [BD] [K] [BG]`

## 4. Opening with pairs ("çift açma" / "çifte gitme")

- **Minimum 5 pairs** laid in one turn, regardless of value. `[P] [W] [A] [OE] [C] [J] [BG] [K] [BD]` (`[AT]` claims pairs also need 101 points — outlier, ignore.)
- A pair = two **identical** tiles (same number and colour). `[P] [W]`. An okey can stand in for one tile of a pair `[P]`.
- **Exclusive:** a player is either a runs/sets player or a pairs player for the hand; never both. `[P] [W] [OE] [SC] [BG] [C]`
- **After a pairs opening the player:**
  - **cannot** lay new runs/sets of their own `[P] [W] [A] [OE] [C] [BG]`;
  - **can** lay off on other players' runs/sets `[P] [W] [A] [OE] [C]`;
  - **can** lay further pairs in the pairs area `[C]`.
- **Can others "lay off on pairs"?** Pairs themselves cannot be extended `[P]`. But several platforms let a *runs/sets opener* lay **their own pairs** on the table once some player has opened with pairs ("yerde çift açan varsa çiftler de işlenebilir, yoksa işlenemez") `[OE] [SC #20] [BG #12] [J]`. `[P]` does not mention this. Make it an option; default per platform family = allowed.
- **Lay-off limit for pairs opener:** `[K]` says max 2 tiles per run per turn; `[BG]` says the 2-adjacent-tile limit applies to everyone; `[AT]` gives an example only for pairs. See section 5.
- **Going out as a pairs player:** max 10 pairs from 21 tiles, so the 21st tile cannot be paired; the pairs player must lay off on runs/sets to get down to one tile. `[P] [OE] ("çift açan biri seri işlemeden bitemez") [CT]`
  - Hence `[CT]`: "çiftten kafa bitişi yoktur" (no from-hand finish with pairs). But `[C]` and `[J]` allow multipliers to stack (pairs + nobody else opened). Edge case; see section 8.
- **All four players open with pairs:** hand is void and replayed; no penalties `[W] [A] [SC] [K]`; `[P]` adds: except 101 for each player holding an okey, and the same dealer redeals. `[BN]` phrases it as "at most 3 players may go pairs".
- **Katlamalı and pairs:** next pairs-opener must show one more pair (6, 7, ...) — section 11.
- **Scoring effect:** the pairs opener's own leftover count is doubled; if the pairs opener wins, everyone else is doubled (section 9).
- **Indicator as a pair tile:** `[W]` "Ek Kurallar" house rule: a player may claim the indicator at the start ("gösterge bende") and use it when opening with pairs. Zynga's 101 Okey Plus release notes (v17.5.0): "You can now use the indicator tile as an Okey when melding pairs!" `[AS]`. Conversely `[OE] [SC] [BG]`: "gösterge çift olarak kullanılamaz". Optional rule; default off.

## 5. Laying off ("işleme")

- **Who:** only a player who has opened (runs/sets or pairs). `[P] [W] [A] [OE] [C] [SC] [BG] [K] [AT]`. An unopened player cannot lay off even if every tile fits `[BG #32]`.
- **Onto whose melds:** any meld on the table, own or anyone else's. `[P] [W] [OE] [J] [K]`
- **When:** 
  - Same turn as opening: **allowed** `[W]` ("aynı oyun sırasında hem elinizi açabilir hem de diğer açılmış setlere eklemeler yapabilirsiniz"), `[P]` (after opening may add to any meld) — **more common**.
  - Must wait one turn after opening: `[SC #19]` (single source).
- **How:** add to either end of a run; add the 4th colour to a set of 3. Pairs cannot be extended. `[P] [BN]`
- **Max run length:** no source states a cap; natural limit is 1..13 with no wrap. A set caps at 4.
- **Wrap 13-1:** not allowed (section 3).
- **Per-turn limit:** 
  - No limit / "multiple tiles may be added to a run in one turn" `[K] [P]` (implicit) — default in `[P] [W] [A]`.
  - "Only 2 adjacent tiles at a time" for everyone `[BG #21]`; for pairs openers only `[K]`, `[AT]` example. `[CT]` has a dedicated article (https://okey101cetele.com/blog/yan-yana-kac-tas-islenir, not read). **Unverified which is standard**; make it an option (none / 2 for pairs-opener / 2 for all).
- **Alternative:** instead of laying off, an opened player may lay a brand-new meld `[BG #23] [C]` (runs/sets openers only).
- **Splitting / rearranging table melds** (Rummikub-style): not mentioned by any source; treat as **not allowed**.
- **Undo:** only the last tile placed in a turn may be taken back; taking back more costs 101 `[P] [W] [A]`; `[BG]`: laid-off tiles cannot be taken back at all.
- **Going out by laying off the last tile (no final discard):** `[BG #30]` says if your last tile is layable you may finish by laying it off. Everyone else requires a final discard (`[P] [W] [OE #9] [SC #23]`: "Son 3 taşı açmak bitirmez. Bitirmek için bitiş taşı gerekir"). Default: discard required.

## 6. Jokers on the table (replacing a laid okey, "yerden okey alma")

**This is a real disagreement between high-trust sources.**

- **`[P]` (pagat): not allowed.** "Once played, a joker stays where it is and cannot be moved or reclaimed." `[BD]` also says taking the okey from the table is against the rules.
- **Turkish platform pages: allowed** `[OE] [C] [SC] [BG] [BN] [CT]` — this appears to be the **more common online behaviour in Turkey**:
  - **Who:** any player who has **already opened** (runs/sets or pairs `[C]`); `[CT]` also allows "or opens in that same turn". An unopened player whose opening total does not hold cannot take it `[SC #21] [BG #15]`.
  - **How:** place the real tile the okey represents onto the meld and take the okey to the rack `[OE] [C] [BN]`.
  - **Ambiguity rule (set of 3):** if the okey could stand for more than one tile, it **cannot** be taken. E.g. Blue1-Red1-okey: okey could be Black 1 or Yellow 1 -> not takeable. In a set, the okey is only takeable when the set has **4 tiles** (so the missing colour is determined). In a run its identity is always determined. `[C] [BG #16] [BN #16]`
    - Engine consequence: an okey in a 3-tile set has no fixed colour; adding a 4th tile to that set fixes it by elimination.
  - **Must the reclaimed okey be used the same turn?** Not required per `[CT]` ("okeyi alıp elinizde tutabilirsiniz"), but it then carries the okey-in-hand penalty at hand end. No platform page states a same-turn requirement. **Unverified** for Zynga/Mynet.
  - **Okey in pairs:** no source describes replacing an okey inside a pair. `[CT: islek-tas-ve-okey-atma]` mentions a 101 for the player whose okey is pulled from "a run or a pair", implying it is possible at live tables. **Unverified**; a pair's missing tile is uniquely determined, so it is logically replaceable.
  - **Penalty to the player who laid the okey** (live-table family only): 101 when someone takes it; in partnership only when the *opposing* team takes it `[CT: yandan-yerden-tas-alma, esli-katlamali-101]`. Online platforms: none stated.

Default suggestion: `jokerReplacement: allowed-if-opened-and-unambiguous` (Turkish platform behaviour), with `off` as the pagat alternative.

## 7. Discard restrictions

**Discarding a layable tile ("işlek taş atma"):**

- **+101** to the discarder if the tile could extend a meld on the table. `[P] [W] [A] [OE] [C] [J] [SC] [BD] [K]`
- Applies **even if the discarder has not opened** `[P] [W] [A] [C] [CT]`. (`[K]` says "after opening" — outlier.) Pagat notes this can make penalties unavoidable for an unopened player.
- **Exception:** the final discard that goes out is never penalised. `[P] [W] [A]`
- Platform enforcement differs: `[C]` — an opened player *must* lay off layable tiles before discarding (program marks them); an unopened player simply gets 101. `[OE] [SC #42]` word it as "if the discarded tile *is laid off* [by someone] the discarder is penalised".
- Live-table variant `[CT]`: 101 if noticed; if the next player *takes* it, the discarder instead gets tile value x 10 and the taker gets nothing.
- Unspecified everywhere: whether "layable" includes layable onto *pairs* areas or by replacing a table okey. Suggest: runs/sets extension only.

**Discarding an okey (not as the finishing tile):**

- **+101** `[P] [A] [OE] [SC] [J] [BD]` ("okey her zaman işler" — the okey is always layable, so it falls under the rule above `[SC #43]`). `[K]` restricts it to "when no meld is on the table" — outlier.
- It is *allowed* (not blocked), just penalised.
- **If the next player takes it:** normal discard-taking rules apply (must be used immediately). No online source defines any extra effect. Live-table `[CT]`: if taken unnoticed, discarder gets okey face value x 10 instead of 101; `[CT]` notes tables disagree.
- **False joker** discard: no source distinguishes it; it is a normal tile with the okey tile's value, subject only to the layable-tile rule.

## 8. Going out

A hand is won by melding/laying off everything except one tile and discarding that tile. `[P] [W] [OE] [SC]`. Some platforms let you drop the last tile on the indicator or to the side `[OE] [SC] [BG]` (UI only).

Finish modifiers — each is a **x2 multiplier**, and they stack multiplicatively `[P] [C] [J] [OE] [W] [A] [BD]`:

| Modifier | Definition | Sources |
|---|---|---|
| **Okey discard ("okey atma", "okeyle bitme")** | Final discard is the okey | all |
| **Pairs ("çiftten bitme")** | Winner had opened with pairs | all |
| **From hand ("elden bitme", "kafa")** | Winner lays all 21 in a single turn | see definition note below |

**"Elden" definition differs:**

- `[P] [W] [A] [C] [OE] [SC]`: all tiles laid in one turn **and no other player has opened yet**. `[C]` phrases the trigger purely as "nobody else has opened a run or pair".
- `[J] [BG] [BD] [CT]`: winner had not opened before and goes out in one turn; others may already have opened (the table then has rows for opened opponents). `[CT]` calls this "kafa".
- **Elden constraints:** all tiles must be laid as the player's *own* melds in one go; **no laying off** on others' melds during an elden finish `[P] [SC #24] [BG #14, #27]`. The 101 threshold (and katlamalı barrier) is waived `[P] [OE] [BG]`.

**Winner's score** `[P] [J] [C] [OE] [BD]`:

- Normal: **-101**
- One modifier (okey / pairs / elden): **-202**
- Two modifiers: **-404**
- Three modifiers (elden + pairs + okey, only possible under `[C]`'s definition): opponents x8; `[C]` gives the winner -404 (caps), i.e. no -808 stated. `[W]` "Ek Kurallar" has -808 only via the riziko variant.

## 9. End-of-hand scoring

**Baseline (non-winning players), all sources agree:**

- Opened with runs/sets: **sum of face values of tiles left in hand**.
- Opened with pairs: **2 x** that sum.
- Never opened: flat **202**, regardless of tiles held.
- Winner: **-101**.

**Full table per `[P]` (and `[J]`, identical except where noted):**

| Winner type | Final discard | Winner | Runs/sets openers | Pairs openers | Unopened |
|---|---|---|---|---|---|
| Runs/sets | normal | -101 | 1x | 2x | 202 |
| Runs/sets | okey | -202 | 2x | 4x | 404 |
| Pairs | normal | -202 | 2x | 4x | 404 |
| Pairs | okey | -404 | 4x | 8x | **404** `[P] [J]` (808 in `[BD] [C]`-style pure multiplication) |
| Elden | normal | -202 | 2x `[J]` | 4x `[J]` | 404 |
| Elden | okey | -404 | 4x `[J]` | 8x `[J]` | 808 |

Notes:
- The "pairs + okey -> unopened 404" cell in `[P]`/`[J]` is not a pure x4; `[BD]` gives 808 and `[C]`'s rule (multiply by 2 per modifier) also yields 808. **Unresolved**; 808 is the arithmetically consistent choice, 404 is what the two best tables print.
- `[W]`'s okey-finish sentence is self-contradictory (says others get double, then says opened players get their plain sum); `[OE]` and `[P]` both say doubled. Use doubled.
- `[CT]` "Standard" preset differs: kafa (elden) does **not** multiply opened opponents' tiles (x1), only the unopened fixed penalty (404). `[CT]` also offers a "Sert" preset where everything is doubled again (unopened 404 on a normal finish). Low trust.
- `[BD]` notes some tables write 101 instead of 202 for unopened players.

**Okey left in hand:**

- Opened player: **+101 per okey** `[P] [W] [A] [OE] [C] [SC] [J] [BD]`.
  - Is that 101 *instead of* or *in addition to* the okey's face value? `[P]`: "count as 101 points each" (instead). `[CT]`: +101 and the number also counts. `[OE] [C] [SC]`: "101 added to the total". **Unresolved**; difference is at most 13 points.
  - Is the 101 subject to the finish/pairs multipliers? `[J]` says the multiplied remaining value "includes any unused joker". Others silent. Unverified.
- Unopened player: just the flat 202 (no extra) `[A] [BD]`.
- False joker left in hand: no special rule found; counts as the okey tile's number (inferred from its definition).

**In-play penalties** (section 10) are added to the hand total; no source says they are multiplied.

## 10. Penalties ("ceza") during play — 101 each unless noted

| # | Trigger | Who pays | Sources | Notes |
|---|---|---|---|---|
| 1 | Invalid opening attempt (under 101 / under 5 pairs / invalid melds) and taking tiles back ("Geri Topla") | actor, 101 per occurrence | `[P] [W] [A] [OE] [C] [BD] [K] [BG]` | Some platforms just block invalid moves `[SC #7]` |
| 2 | Discarding a tile that could be laid off on a table meld (işlek) | discarder | `[P] [W] [A] [OE] [C] [J] [SC] [BD]` | Applies before opening too; not on the finishing discard |
| 3 | Discarding an okey (not finishing) | discarder | `[P] [A] [OE] [SC] [J] [BD]` | |
| 4 | Taking back more than the last tile placed in a turn | actor | `[P] [W] [A]` | Mostly a physical-table rule |
| 5 | Okey still in hand at hand end (opened player) | holder, 101 per okey | `[P] [W] [A] [OE] [C] [J]` | Also applied on void hands per `[P]` |
| 6 | Laying off without having opened | actor | `[AT]` only | Platforms block it |
| 7 | Taking the discard and failing to use/open | taker | `[BD] [CT]` only | **Majority: no penalty**, just return and draw |
| 8 | Out-of-turn / wrong draw or discard | actor, "usually" 101 | `[K]` only | Physical-table rule |
| 9 | Your discard is taken by the next player (live-table) | discarder, tile value x 10 | `[W "Ek Kurallar"] [CT]` | Not in online-platform family |
| 10 | Your laid okey is reclaimed by an opponent (live-table) | player who laid it, 101 | `[CT]` only | Low trust |
| 11 | Being stuck with no tile to discard (all tiles melded without a finisher) -> must take melds back | actor | `[C]` | Effectively trigger 1 |

Not penalties but fixed end-of-hand amounts: unopened = 202 (x multipliers).

## 11. "Katlamalı" vs "katlamasız"

**Finding: "katlamalı" is about the opening threshold, not about multiplying scores.** Every source that defines it agrees:

- **Katlamasız:** threshold is a fixed 101 (or 5 pairs) for everyone. `[D] [CT]`
- **Katlamalı:** within a hand, each later opener must open with **strictly more** than the previous opener's total. `[D]` (115 -> 116+), `[AT]` (117 -> 118), `[BG]` (120 -> 121+), `[K]` (110 -> 111), `[BD]` (110 -> 111), `[CT: katlamali-101-nedir]` (101 -> 102 -> 103).
  - Minimum is "previous opening total + 1" — it is a raise-by-at-least-one rule, **not doubling**, despite the name.
  - Reference value: the previous opener's actual total. `[BD]` says "highest opening on the table"; since each opening must exceed the last, these coincide.
  - Resets to 101 every hand `[CT]`.
- **Pairs under katlamalı:** next pairs opener needs one more pair than the previous pairs opener (5 -> 6 -> 7 ...) `[BG] [AT] [BD] [CT]`. The point barrier and the pair barrier appear to be **separate tracks** (no source says a pairs opening raises the point barrier or vice versa) — inferred, not explicitly stated.
- **Elden finish ignores the barrier** `[BG #27]`.
- **Lay-off under katlamalı:** unchanged — must have opened at the required number `[BN #14]`.
- **Scores are not multiplied** by katlamalı `[CT]`. (The x2/x4 "katlanır" language in rule texts refers to finish multipliers that exist in both modes — do not conflate.)
- **Partnership + katlamalı — disagreement:**
  - `[BG #26]`: you must also exceed your **partner's** opening total.
  - `[CT: esli-katlamali-101]`: barrier binds only the **opposing team**; partner may still open at 101. Notes the other reading as a regional variant.
  - Unresolved; make it an option.
- Popularity: an unfetchable page (okey-gg) is quoted in search results as calling katlamalı "the most widely played variant". Mynet 101 Çanak Okey offers both as table options `[TI]`. Pagat, Wikipedia (main text), AltinStar and Jawaker describe only the fixed-101 game.
- **Caveat:** no first-party Zynga / Mynet / VIP help page could be retrieved to confirm their exact katlamalı implementation. One app (Fun 101 Okey) markets a "Katlamalı 101 turbo" mode where *chips* are multiplied (https://apps.apple.com/tr/app/id1524253327) — that is a betting feature, unrelated to the rule above.
- `[W]` "Ek Kurallar" has an unclear sentence: "Çifte giden oyuncudan katlamalı oyunda taş alınıp seri açılmaz" (in katlamalı, you cannot take a pairs player's discard to open runs). Single unsourced line; unverified.

## 12. Partnership ("eşli") vs individual ("tekli / eşsiz")

- **Seating:** partners sit opposite each other (so you never receive your partner's discard directly). `[CT] [W]`
- **Opening is individual:** each partner must open on their own; a partner's opening does not open you. `[K]`
- **Laying off on partner's melds:** yes — laying off is allowed on *any* table meld for any opened player, so partner melds are included. No source restricts or specially treats this.
- **Score keeping:** each partner's score is computed separately and the two are **summed** at the end to decide the winning side. `[OE] [SC #40] [K]`
- **Partner of the winner:** their hand penalty is **cancelled (0)**, even if they never opened. `[OE] [SC #37] [C] [CT]`. (In-play 101 penalties already incurred presumably stand — not stated.)
- **In-play penalties** are added to the team `[BN]`.
- **Katlamalı barrier and partner:** disputed (section 11).
- **Live-table extras (low trust):**
  - If your discard is taken and used to open, your *team* takes the penalty `[W]`.
  - Reclaiming partner's table okey carries no penalty for the partner `[CT]`.
  - On a kafa / okey-kafa finish, an unopened opponent whose partner had opened pays half `[CT]`.
  - Identical-tile swap: you may keep the taken discard and lay your identical copy instead, to steer tiles toward your partner `[W]`.
- No source describes any partner-specific finishing rule beyond the above.

## 13. Draw pile exhaustion

- **Trigger:** no tiles left to draw; the hand ends once the last discard is made / the next player does not take the last discard. `[P] [C] [W]`
- **Scoring — disagreement:**
  - **Score as a normal hand without a winner** — opened players count remaining tiles (pairs openers doubled), unopened get 202, nobody gets -101. `[W] [J] [OE] [SC #25-27]` — **more common (platform behaviour)**.
  - **Void hand** — no score except 101 for each player holding an okey; same dealer redeals. `[P]`
- **House rule:** if no tiles remain but a player could finish by taking the **indicator**, they may take and use it. `[W "Ek Kurallar"]`
- Related void case: all four open with pairs (section 4).

## 14. Match structure

- A match is a pre-agreed number of hands; totals are summed; **lowest total wins**. `[P] [W] [A] [C]`
- **Hand counts:** 3, 5, 7, 9 or 11 `[W] [A] [C] [BG]`; "usually 7 or 11" `[BN]`; Mynet 101 Çanak Okey tables: 1, 3, 5, 7 `[TI]`; Jawaker: usually 3, quick 1 `[J]`.
- All hands are played out; not best-of `[A]`.
- **Dealer/starter rotation:** to the right each hand `[P] [C]`; same dealer after a void hand `[P]`. Whether a void hand counts toward the hand total is not stated.
- **Tie-breaks:** not specified by any source read (a `[CT]` article on tournament rules exists, unread: https://okey101cetele.com/blog/esli-101-turnuva-kurallari).
- Platform ranking systems (e.g. Okey Evi: +11/+5/-5/-11 rating for an 11-hand game, start 1500 `[OE]`) are meta-scoring, outside the rules engine.

## 15. Other named options worth exposing

| Option | What it is | Source / status |
|---|---|---|
| **Katlamalı / katlamasız** | Rising opening barrier (section 11) | `[TI]` lists it as a Mynet table option |
| **Eşli / tekli** | Partnership vs individual | `[TI] [D] [BG]` |
| **El sayısı** | 1/3/5/7/9/11 | section 14 |
| **Çanak** | A pot (chips, meta-economy) accumulated across tables/hands, won by "okey atma, elden bitme, çifte gitme" `[TI]`; Okey Evi: half the hand count in points goes to the pot, first finisher takes it `[OE]` | Betting layer, not core rules |
| **Gösterge** | In 101 the indicator has **no function**: no "gösterge gösterme" bonus as in classic Okey `[OE] [SC] [BG] [C]` | Default: none |
| **Gösterge as pair tile / as okey for pairs** | section 4 | `[W]` house rule; Zynga release note `[AS]` |
| **Riziko** | If the indicator is a false joker, all finish values double (-202 normal, -404 okey, -404 pairs, -808 pairs+okey) | `[W "Ek Kurallar"]` only; `[P] [CT]` redraw instead. Zynga release notes mention "Risky game modes" `[AS]` — content unknown |
| **Yardımlı / yardımsız** | UI assistance (auto-sort, layable-tile highlighting) | search snippet of an app listing; not a rule |
| **Yandan alma cezası (x10)** | Discarder pays value x 10 when their discard is taken | `[W] [CT]` live-table option |
| **İşleme limiti** | Max 2 adjacent tiles laid off per turn | `[BG] [K] [AT]` |
| **Çift işleme** | Runs players may lay own pairs once a pairs opener exists | `[OE] [SC] [BG] [J]` |
| **Yerden okey alma** | Reclaiming table okey on/off | section 6 |
| **Açmayan cezası** | 202 (standard) vs 101 `[BD]` vs 404 "sert" `[CT]` | |
| **Taş bitince** | Score normally vs void | section 13 |
| **Okeyli/okeysiz, cezalı/cezasız, açık el, hızlı mod** | **Could not verify** that any major 101 platform offers these as named 101 options. No source found. | Unverified — do not assume |

---

## Summary table: rule -> most common default -> known alternatives

| Rule | Most common default | Known alternatives |
|---|---|---|
| Deal | 21 each, 22 to starter (dealer's right); 20 in pile + indicator | — |
| Direction | Anticlockwise | — |
| Okey | Indicator + 1 same colour; 13 -> 1; false joker = that tile | False-joker indicator: redraw `[P]` / "riziko" doubling `[W]` |
| Run wrap 13-1 | Not allowed | — |
| Opening threshold | >= 101 in one turn, face values, okey = represented tile | Katlamalı: > previous opener's total |
| Pairs opening | >= 5 pairs in one turn | Katlamalı: previous pair count + 1 |
| Pairs opener afterwards | No own runs/sets; may lay off on others' runs/sets; may add pairs | Lay-off capped at 2 tiles per run per turn `[K] [AT]` |
| Runs opener laying pairs | Allowed once someone has opened with pairs `[OE] [SC] [BG] [J]` | Not mentioned / pairs never extend `[P]` |
| Take discard | Must be melded same turn; unopened taker must open with it; cannot hold | Opened player may take freely `[C]` (unclear) |
| Failed discard take | Return tile, draw from pile, no penalty | 101 to taker `[BD] [CT]` |
| Discarder penalised when tile taken | No | Tile value x 10 `[W] [CT]` (live-table) |
| Lay off | Only after opening; any table meld; same turn as opening OK | Wait one turn `[SC]`; 2-tile limit `[BG]` |
| Reclaim table okey | Allowed if opened and okey's identity is unambiguous (run, or 4-tile set) — Turkish platforms | Not allowed `[P] [BD]`; 101 to the layer when taken `[CT]` |
| Discard layable tile | +101, even if unopened; exempt on finishing discard | Only after opening `[K]`; x10 if taken `[CT]` |
| Discard okey (non-finishing) | +101 | x10 of okey value if taken unnoticed `[CT]` |
| Invalid opening | +101, tiles back | Move blocked by software |
| Normal finish | Winner -101; opened = hand sum; pairs opener = 2x; unopened = 202 | Unopened 101 `[BD]`; "sert" 404 `[CT]` |
| Okey-discard finish | x2 everything (winner -202, unopened 404) | — |
| Pairs-opener finish | x2 everything | — |
| Elden finish | x2 everything; threshold waived; no lay-off allowed | Requires nobody else opened `[P] [W] [C] [OE]` vs not `[J] [BD] [CT]`; `[CT]`: opened opponents not multiplied |
| Stacking | Multiplicative (x4 for two modifiers; winner -404) | Pairs+okey unopened = 404 `[P] [J]` vs 808 `[BD] [C]` |
| Okey left in hand (opened) | +101 per okey | Instead of vs in addition to face value — unresolved |
| Pile exhausted | No winner; score hands normally (unopened 202) `[W] [J] [OE]` | Void, only okey-holder 101s, same dealer `[P]` |
| All four open with pairs | Hand void, replay | `[P]`: plus 101 per okey held |
| Katlamalı | Raise-by-one opening barrier; scores unaffected | Whether barrier applies to partner: yes `[BG]` / no `[CT]` |
| Partnership | Opposite seats; individual scores summed; winner's partner scores 0 | Half-penalty softening `[CT]` |
| Match | 3/5/7/9/11 hands (also 1); lowest total wins | — |
| Indicator bonus | None in 101 | Usable for pairs `[W] [AS]` |

## Open items (could not verify)

1. Exact in-app rules of 101 Okey Plus (Zynga), 101 Yüzbir Okey Extra, Mynet 101 Çanak Okey, VIP 101, Okey.net 101 — no public help pages retrievable. In particular their katlamalı implementation, okey-reclaim rule, and failed-discard-take handling.
2. Whether okey-in-hand 101 replaces or adds to face value, and whether it is multiplied.
3. Unopened penalty when a pairs opener finishes with an okey discard (404 vs 808).
4. Whether katlamalı point and pair barriers interact, and whether the barrier binds a partner.
5. Whether an opened player who takes the discard must use it the same turn on all platforms (`[P]` yes; `[C]` ambiguous).
6. Lay-off limit of 2 tiles per turn — standard or niche.
7. Replacing an okey inside a pair.
8. Existence of "okeyli/okeysiz", "cezalı/cezasız", "açık el", "hızlı" as named 101 options.
9. Tie-break rules; whether void hands count toward the hand total.
10. Three-way stacking (elden + pairs + okey) and whether a pairs player can ever be "elden".
