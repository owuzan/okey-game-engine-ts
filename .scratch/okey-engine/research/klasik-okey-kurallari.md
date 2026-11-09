# Klasik Okey (Düz Okey) rules: research notes for a rules engine

Research date: 2026-11-10. Scope: classic Okey ("düz okey"), not Okey 101.

## How to read this file

- Every claim carries a source tag such as `[PAGAT]`. The source list with URLs is at the bottom.
- **Reliability caveat.** Pages were read through a fetch tool that returns a paraphrase, not the raw page text. Numbers below are as that tool reported them. Anything load-bearing should be re-checked against the page before being hard-coded as "the" rule. Where a paraphrase looked garbled I say so.
- **Source quality tiers.**
  - Tier A (coherent, complete rule sets): `[PAGAT]`, `[ENWIKI]` (which closely follows Pagat and carries "needs citations / single source" tags), `[LITE]` (LITE Games help page, also Pagat-derived).
  - Tier B (partial or independently worded): `[TRWIKI]` (internally inconsistent on scoring), `[NOVEL]`, `[RULESPAL]`, `[HYILMAZ]` (app-store description of a popular offline app), `[ALTINSTAR]` (platform rules page, but appears to mix in Okey 101 wording), `[LILACH]` (blog).
  - Tier C (anecdotal): `[DH-OKEY]`, `[DH-RENKLI]` (forum threads), `[OKEYTOO]`, `[MYNET-CANAK]`, `[OKEYCANLI]` (app marketing / third-party docs).
- **Not obtained.** I could not reach a published rules/help page for Okey Plus (Zynga), Çanak Okey Plus (Zynga), Mynet Okey, Okey.net, VIP Okey or Okey Extra. Their rules live in in-app help screens. App-store listings for these give features only. Everything said below about "what online platforms do" therefore rests on Tier B/C sources and is flagged.

---

## 1. Tile set

| Fact | Value | Sources |
|---|---|---|
| Total tiles | 106 | [PAGAT] [ENWIKI] [TRWIKI] [LITE] [NOVEL] [LILACH] |
| Numbered tiles | 104 = 4 colours x 13 ranks (1..13) x 2 copies | same |
| False jokers (sahte okey) | 2, no number/colour of their own | same |
| Colours | red, yellow, black, plus blue **or** green | see below |

- Colour naming differs only cosmetically: [PAGAT] says red, yellow, green, black; [TRWIKI], [LITE], [LILACH] say red, yellow, blue, black. Blue is the usual name in Turkish sources. Encode as four opaque colour ids.
- False jokers are often drawn with a clover/shamrock symbol [LITE] [OKEYTOO].

## 2. Deal

**Hand sizes.** One player gets 15 tiles, the other three get 14. Universal across sources.

**Who gets 15 / who starts.**
- Most common (Tier A): the player to the **dealer's right** gets 15 and plays first, by discarding without drawing [PAGAT] [ENWIKI] [NOVEL] [LITE].
- Alternative wording: the **dealer** takes 15 and discards first, then the turn passes to the dealer's right [ALTINSTAR]. Functionally the same shape (the 15-tile player opens by discarding); only the "dealer" label moves by one seat. This matters only for dealer-rotation bookkeeping.
- [TRWIKI] and [LILACH] only say "the starting player gets 15".

**Choosing the dealer.** First dealer at random; afterwards the deal passes to the right (counter-clockwise) each hand [PAGAT] [ENWIKI] [NOVEL] [RULESPAL].

**Direction of play.** Counter-clockwise (anticlockwise) [PAGAT] [ENWIKI] [LITE] [NOVEL] [TRWIKI] [ALTINSTAR]. [LILACH] says "at most tables". A player takes discards from the player on their left and discards toward the player on their right [TRWIKI].

**Formal physical procedure** [PAGAT] [ENWIKI]:
1. Shuffle face down, build 21 stacks of 5 (105 tiles); 1 tile left over.
2. Dealer rolls a die to choose a stack (counted left to right in front of the dealer, continuing into the stacks of the player to the right). The spare tile goes on top, making a 6-tile stack.
3. Dealer rolls again to choose a tile in that stack, counted from the bottom. That tile is turned face up on top: it is the indicator.
4. If the chosen tile is a false joker, it is put back and the die is rolled again. **The indicator is therefore never a false joker.**
5. Stacks are distributed counter-clockwise starting after the indicator stack: two stacks (10 tiles) each, then partial stacks so the dealer's-right player ends with 15 and the others with 14.
6. The rest is the stock.

**Informal procedure** (listed as a variation by [PAGAT] [ENWIKI]; the default described by [TRWIKI] [LILACH] and effectively what apps do): each player takes 14 (first player 15), one tile is turned up as indicator, stock tiles are drawn face down in any order.

**Does dice/stack selection matter to the outcome?** No source assigns any scoring or rule consequence to the dice. They only decide which already-shuffled tiles become the indicator and which go to which player. For an engine, a uniform shuffle followed by "pick indicator (re-pick if false joker), deal 15/14/14/14, remainder is an ordered stock" is outcome-equivalent. This equivalence is my inference, not a statement in a source.

**Stock size (derived).** 106 - 57 dealt - 1 indicator = 48 drawable tiles, or 49 if the indicator is drawable last (section 11).

## 3. Indicator (gösterge) and okey

- Okey (joker) = same colour as the indicator, rank + 1. Both copies of that tile are jokers [PAGAT] [ENWIKI] [TRWIKI] [LITE] [NOVEL] [LILACH] [RULESPAL].
- Wrap: indicator 13 makes the 1 of that colour the okey [PAGAT] [ENWIKI] [TRWIKI] [LILACH] [RULESPAL] [ALTINSTAR].
- The okey is fully wild: it may stand for any tile in a run, a set or a pair [PAGAT] [LITE].
- **False joker (sahte okey)** is not wild. It represents exactly the okey tile's own colour and rank for that hand [PAGAT] [ENWIKI] [TRWIKI] [LITE] [LILACH]. Example: indicator red 4, okey red 5, false joker counts as a red 5 and nothing else.
- Derived count: with the indicator on the table, one copy of the indicator tile remains in play (relevant to section 8). There are two wild okeys and two false jokers standing for the okey's face value, so "the tile red 5" effectively has two usable copies (the false jokers) when red 5 is okey.
- [OKEYTOO] gives an example where okey red 9 makes the false joker "red 10". That contradicts every other source and its own definition; treat as an error on that page.
- The okey changes every hand. [PAGAT] notes the purpose is to stop players learning jokers by the tile backs.

## 4. Turn flow

1. The 15-tile player opens by discarding one tile, with no draw [PAGAT] [ENWIKI] [LITE] [NOVEL] [LILACH].
2. Each later turn: **either** take the tile just discarded by the previous player (the player on your left) **or** draw the next stock tile; exactly one of the two [PAGAT] [LILACH].
3. Then discard exactly one tile face up, returning to 14 [PAGAT] [LILACH].
4. No melds are exposed during play; the whole hand is shown only when going out [PAGAT] [ENWIKI] [LITE].

**Discard piles.** Each player's discards stack to their right; only the top tile is available, and only to the next player [PAGAT] [ENWIKI] [LITE] [NOVEL]. Only the most recent discard of the previous player can be taken, and only on the immediately following turn.

**Information rule** [PAGAT] [ENWIKI]: a player may look through the pile on their right (own discards) and the pile on their left (tiles they could have taken); for the other two piles only the top tile is visible. Online clients vary; [ALTINSTAR] ties "see all discarded tiles" to pressing its "Double" button.

**Restrictions on taking a discard.** No source for classic okey imposes any (unlike Okey 101, where a taken discard must be melded at once [ENWIKI]). `[RULESPAL]` words it as "if you need it", which is advice, not a rule.

**Take a discard and immediately discard the same tile?** UNVERIFIED. No source addresses it. Nothing in the Tier A rule text forbids it. It is strategically equivalent to passing without drawing, and it reveals nothing, so some implementations may block it; I found no documentation either way. Recommend an option, default "allowed".

**Discarding the okey mid-hand.** Legal but normally a blunder. If discarded, the next player may take it [TRWIKI]. [ALTINSTAR] lists a -2 penalty for discarding a joker, but that item sits beside clearly 101-style penalties on the same page and is not corroborated for classic okey.

## 5. Valid melds

**Run (seri / sıralı per).** 3 or more consecutive ranks of one colour [PAGAT] [ENWIKI] [TRWIKI] [LITE] [NOVEL] [LILACH].

**Set (grup / aynı sayı).** 3 or 4 tiles of one rank, all different colours. A colour may not repeat (black 7 + red 7 + red 7 is invalid) [PAGAT] [ENWIKI] [LITE] [LILACH] [ALTINSTAR].

**The 1 after 13.**

| Meld | Valid? | Sources |
|---|---|---|
| 1-2-3 | yes | all |
| 12-13-1 | **yes** | [PAGAT] [ENWIKI] [LITE] [NOVEL] [LILACH] [ALTINSTAR] [OKEYTOO] |
| 11-12-13-1 | yes | [TRWIKI] [DH-OKEY] |
| 13-1-2 | **no** | [PAGAT] [ENWIKI] [LITE] [NOVEL] [LILACH] [ALTINSTAR] |
| 12-13-1-2 | no | [DH-OKEY] [ALTINSTAR] |

Rule as stated by [PAGAT]: the 1 can be low or high in a run, but not both at once. No source for classic okey disagrees. (In Okey 101, [ENWIKI] says runs may not wrap 13 to 1 at all. That is a 101-only restriction; do not carry it over.)

**Duplicates in a run.** Not possible by definition: a run is consecutive ranks, so each rank appears once; the second copy of a tile must go in a different meld. No source states this separately; it follows from the definition. Maximum run length is therefore 14 positions in principle (1..13 then 1), bounded in practice by the 14-tile hand.

**No sharing.** A tile belongs to exactly one meld [PAGAT] [LITE] [NOVEL].

**Jokers in melds.** An okey may replace any missing tile; more than one okey in a meld is allowed, e.g. 6-okey-okey-9 [ENWIKI]. A false joker enters melds only as the okey's face value, e.g. red 4, false joker, red 6 when red 5 is okey [ENWIKI].

## 6. Winning

**Normal win.** On your turn, after drawing, your 15 tiles are: 14 forming only valid runs and sets, plus 1 tile which you discard to end the hand; the 14 are then exposed for checking [PAGAT] [ENWIKI] [LITE] [TRWIKI]. The hand must partition completely, e.g. 3+3+4+4 or 6+3+5 etc. [PAGAT].

- Finishing discard goes face down onto the centre/stock rather than to the normal discard pile in Turkish practice [TRWIKI] [LITE] [LILACH]. Cosmetic for an engine.
- The opening 15-tile player can in principle win on the first turn (inference; not stated).
- [RULESPAL]'s sequence "stock empty and nobody can go out" and [ENWIKI]'s "the player to move cannot win on the previous discard" confirm a win may use the taken discard as well as a drawn tile.

**Pairs win (çift / çifte gitme / çifte bitiş).**
- 14 tiles as **seven pairs**, each pair two identical tiles: same rank **and** same colour. Same rank in different colours is not a pair [PAGAT] [ENWIKI] [LITE] [NOVEL] [TRWIKI] [LILACH].
- Exactly seven pairs, discard the 15th [TRWIKI] [ALTINSTAR]. Pairs and runs/sets cannot be mixed in one hand (implied by all Tier A definitions; [RULESPAL]'s paraphrase suggesting a mix looks garbled).
- **Jokers in pairs.** An okey can pair with any tile [PAGAT] [LITE] [LILACH] [RULESPAL].
- **Two okeys as a pair.** UNVERIFIED as an explicit statement. It follows logically (each okey may stand for any tile, so one can stand for the other's partner), and no source forbids it. Engine default: valid.
- **False jokers in pairs.** By the identity rule, false joker + false joker is a pair of the okey's face value, and a false joker pairs with a real okey tile either way (as wild or at face value). [RULESPAL] says fake okeys can form pairs. Not spelled out in Tier A; treat as derived.
- **Declaring.** Tabletop: no need to announce that you are collecting pairs [TRWIKI] [HYILMAZ]. One platform makes it an explicit, irreversible "Double" declaration with a doubled penalty (-4 instead of -2) if you then fail to finish [ALTINSTAR]. That penalty-for-failing wording resembles Okey 101 and is not corroborated elsewhere for classic okey.
- **Four of a kind as two pairs.** Not possible; only two copies of each tile exist (plus false jokers for the okey value).

## 7. Finishing by discarding the okey (okey atarak bitme / okeyli bitiş)

- A player whose final discard is an okey, with the other 14 tiles forming a complete hand, scores a doubled win [PAGAT] [ENWIKI] [LITE] [NOVEL] [TRWIKI] [HYILMAZ] [DH-OKEY].
- A player holding a complete hand that contains an okey may decline to go out and keep playing, hoping to rearrange so the okey becomes the spare tile. Risk: if someone else goes out first, the hidden hand scores nothing [PAGAT] [ENWIKI] [LITE].
- **Does a false joker count?** No source says a false-joker discard earns the bonus. By definition the bonus is for discarding the wild okey. UNVERIFIED either way; default "no".

**Interaction with pairs.**
- [PAGAT], [ENWIKI], [LITE]: list okey-discard (4) and seven pairs (4) separately and do not say whether they stack.
- [NOVEL]: explicitly stacks them, **8** for seven pairs finished by discarding the wild tile.
- [DH-OKEY]: pairs x2, pairs plus okey discard x4 (same result as stacking on a base of 2).
- Stacking is the more commonly documented reading, but only Tier B/C sources state it.

**Double okey (çift okey atma / okey dönme)** [TRWIKI] [DH-OKEY]: a player holding both okeys may discard the first (it is placed face up on the indicator), continue for another round, and must finish by discarding the second. Value x4. If another player finishes in between, the first okey is "burned" and worth nothing. House rule; not in Tier A.

## 8. Showing the indicator (gösterge göstermek / gösterge yapmak)

- **What.** A player holding the tile identical to the face-up indicator (same colour and rank; exactly one such tile is in play) may show it [PAGAT] [ENWIKI] [NOVEL] [ALTINSTAR] [TRWIKI].
- **Who.** Any player who holds it. Only one player can, since only one copy remains.
- **When.** Before play starts, and at the latest before that player's own first draw [PAGAT] [ENWIKI]. "On the player's first turn only" [ALTINSTAR] [LILACH]. "When their turn comes" at the start of a new hand [TRWIKI]. "Before the round starts; later is invalid" [RULESPAL]. Consistent encoding: allowed until the holder completes the first action of their first turn.
- **Effect.** Each other player loses **1** point [PAGAT] [ENWIKI] [NOVEL] [ALTINSTAR] [RULESPAL] [DH-OKEY]. Money-game form: the shower takes half the pot (kasa) [TRWIKI] [HYILMAZ].
- **Optional.** [LILACH] stresses the rule varies by table and should be agreed beforehand. Showing reveals information, so it is a choice, not an obligation.
- The tile stays in the shower's hand (it is shown, not surrendered) in the Tier A description. [TRWIKI] describes physically placing it on the indicator when using it for "çifte bağlama" (section 13), a different house rule.
- Does a false joker count as the indicator? No. The false joker stands for the okey, not the indicator.

## 9. Scoring models

### 9a. Traditional "start at N and lose points" (per-hand deduction from each non-winner)

Winner's score is unchanged; every other player loses the amount shown.

| Source | Start | Normal | Okey discard | Seven pairs | Pairs + okey | Show indicator | Other |
|---|---|---|---|---|---|---|---|
| [PAGAT] | 20 | 2 | 4 | 4 | not stated | 1 | one-colour hand doubles: 4, or 8 with okey discard (variation) |
| [ENWIKI] | 20 | 2 | 4 | 4 | not stated | 1 | same variation |
| [LITE] | 20 | 2 | 4 | 4 | not stated | not mentioned | |
| [NOVEL] | 20 | 2 | 4 | 4 | **8** | 1 | |
| [RULESPAL] | 20 (any agreed number) | 2 | 4 | 4 | not stated | 1 | unordered one-colour 8; ordered one-colour 1..13 wins the game outright |
| [HYILMAZ] | not stated | 2 | 4 (x2) | 4 | not stated | half the pot / penalty | unordered colour 8; ordered colour ends game |
| [DH-OKEY] | agreed, e.g. 30 | 2 | x2 | 4 | x4 | 1 | double okey x4 |
| [ALTINSTAR] | 6, 12 or 20 | 2 | 4 | not stated as a number | not stated | 1 | see caveat |
| [TRWIKI] | commonly 20 | **1** | x2 | **2** in one section, **3** in another | not stated | amount not given | double okey x4; unordered colour 8; ordered colour zeroes all and ends game |

- **Most common:** start 20; normal 2; okey discard 4; pairs 4; indicator 1. Five independent-ish sources agree.
- **Outlier:** [TRWIKI] uses a base of 1 and contradicts itself on pairs (2 vs 3). Treat as a lower-stakes house variant, not the default.
- [HYILMAZ] caveat: the fetch paraphrase said the okey finish "doubles to 2"; a search snippet of the same listing said okey finish is 4. I take 4 (double of 2) as intended.
- [ALTINSTAR] caveat: the page also lists "-2 for failing to open", "-2 for pressing Done with wrong sets", "-2 for discarding a joker". These read like Okey 101 mechanics applied to a düz okey page and are uncorroborated.
- Indicator points are applied immediately when shown, independent of who wins the hand [NOVEL] [RULESPAL].

### 9b. "Düşme" (counting down, winner subtracts)

[TRWIKI] and [DH-OKEY] also describe a mirror model: players agree a "düşme sayısı" (e.g. 20 or 30); the **finisher** subtracts the hand value from their own count (2 normal, 4 with okey [DH-OKEY]); first to reach 0 **wins**. Same numbers, opposite sign convention and opposite end condition. Worth exposing as a scoring-mode option.

### 9c. Online platforms (chips, pot)

Evidence here is weak (see "Not obtained").

- Chip tables: each player stakes a table bet; the hand winner collects it. Çanak variants add a second stake into a pot ("çanak") that carries over between hands until "broken" [OKEYTOO].
- Çanak is broken by finishing with an okey discard [OKEYTOO] [OKEYCANLI]. [OKEYTOO] (a third-party clone, self-described as differing from normal Çanak Okey) pays: one-okey finish 3x bet, two-okey finish 4x, pairs without okey 3x.
- [MYNET-CANAK] eşli mode: if either partner finishes, the partners split the çanak and rewards equally.
- Whether Okey Plus / Çanak Okey Plus also break the çanak on a pairs finish, and their exact multipliers, is UNVERIFIED.
- [ALTINSTAR] keeps the traditional point model online, with selectable starting points 6, 12 or 20.

### 9d. "Katlamalı" (doubling) for classic okey

- I found **no** source describing a mode named "katlamalı" for classic okey.
- Where the word appears it belongs to **Okey 101**: Mynet's 101 Çanak Okey offers katlamalı / katlamasız / eşli, and katlamalı there means each opener must exceed the previous opener's meld total by at least one point [MYNET-CANAK]. That is a rising opening threshold, not score doubling.
- The doubling triggers that do exist in classic okey are the multipliers already listed: okey discard x2, pairs x2, pairs + okey x4, double okey x4, one-colour hand x2 or flat 8, and in renkli/sayılı okey a red or black tile doubling the penalty (section 13).
- Recommendation: do not ship a "katlamalı" flag for classic okey on current evidence; model the individual multipliers instead.

## 10. Partnership (eşli) vs individual (eşsiz / tekli)

- Default in rule texts is individual play: four players, each for themselves [PAGAT] [ALTINSTAR] [LILACH].
- **Eşli:** the two players sitting opposite each other are partners [PAGAT] [ENWIKI] [LILACH] [MYNET-CANAK]. Turn order and all hand rules are unchanged; each still holds a private hand and wins individually by completing it.
- [PAGAT] notes partners cannot help each other much (the only lever is what you discard, and your discard goes to an opponent, not your partner).
- **Score combination.** [PAGAT] offers it tentatively: when a player wins, the opposing team loses the points; the winner's partner does not. [ENWIKI] repeats this. In chip games, partners split the winnings equally [MYNET-CANAK].
- Whether a team keeps one shared score or two individual scores that are summed is NOT specified by any source. Simplest faithful encoding: one score per team, deducted once per event at the per-player rate. Flag as a design decision, not a sourced rule.
- Indicator show in eşli: by the same logic the opposing team loses 1. Not stated explicitly; derived.
- Online platforms offer both eşli and solo tables (Çanak Okey Plus release notes; [MYNET-CANAK]).
- Forum notes about partners sharing tile penalties [DH-RENKLI] concern renkli/sayılı okey or 101, not plain classic okey.

## 11. Stock exhaustion

- **Most common:** the hand ends with no winner and no score [PAGAT] [ENWIKI] [LITE] [RULESPAL] [LILACH] ("at most tables"). The same dealer rotation then proceeds (rotation after a drawn hand is not explicitly stated; assume the deal passes as usual).
- **Exact trigger** [PAGAT] [ENWIKI]: when only the final 6-tile stack remains, the face-up indicator is lifted off and the other 5 are drawn in order. When the stock is empty, the next player may still take the previous player's discard and, if that completes their hand, win. If they decline or cannot win with it, the hand ends. [ENWIKI] phrases it as "the player to move cannot win on the previous discard".
  - Open detail: whether a player who takes that last discard without winning may then discard and let play continue to the next player. Tier A wording implies the hand simply ends once the player facing an empty stock does not win. Encode: on empty stock, the player to move may take the discard only to declare a win; otherwise the hand is drawn.
- **Is the indicator drawable?** Default **no**: "the face-up tile is never drawn" [PAGAT] [ENWIKI]. Listed alternative: the indicator may be taken as the very last stock tile [PAGAT] [ENWIKI].
- Indicator points already scored in that hand stand (they are applied when shown). Derived from [NOVEL] "immediately".
- Online behaviour (redeal vs. refund vs. pot carries over) is UNVERIFIED.

## 12. Match structure

- A match is a series of hands (el). No fixed number of hands in the traditional model [PAGAT] [ALTINSTAR] [RULESPAL].
- **End condition:** some player's score reaches zero or less [PAGAT] [ENWIKI] [LITE] [NOVEL] [ALTINSTAR] [RULESPAL] [TRWIKI].
- **Result:**
  - [PAGAT] [ENWIKI]: the two highest scores win, the two lowest lose.
  - [LITE] [ALTINSTAR] [RULESPAL]: the single highest score wins.
  - Elimination variation: a player at zero or below drops out and the rest continue [PAGAT] [ENWIKI].
  - Düşme model: first to count down to 0 wins [TRWIKI] [DH-OKEY].
- **Starting score:** 20 is standard; 6 / 12 / 20 offered online [ALTINSTAR]; any agreed number [RULESPAL]; 30 mentioned [DH-OKEY].
- **Dealer rotation:** passes to the right (counter-clockwise) every hand [PAGAT] [ENWIKI] [NOVEL] [RULESPAL]. No source describes "winner deals" or "winner starts" for classic okey; UNVERIFIED whether online platforms do that.
- **Tie-break** when several players are at or below zero, or equal on top: not specified anywhere.
- Fixed-hand-count matches (1/3/5/7 hands) are documented for 101 tables [MYNET-CANAK] [ENWIKI], not for classic okey. A "play N hands, highest score wins" option is a reasonable engine extension but is not sourced.
- Online chip tables typically settle chips every hand, so each hand is effectively its own match [OKEYTOO]. UNVERIFIED for the Zynga and Mynet titles.

## 13. Named variants and house rules worth exposing

| Option | Description | Sources | Confidence |
|---|---|---|---|
| Renkten bitme (one-colour hand) | All 14 tiles one colour. Either doubles the win (4, or 8 with okey discard) [PAGAT], or flat 8 for "sırasız renk" [TRWIKI] [HYILMAZ] [RULESPAL]. Some tables count only all-red or all-black [PAGAT]. | [PAGAT] [ENWIKI] [TRWIKI] [HYILMAZ] [RULESPAL] [DH-OKEY] | medium |
| Sıralı renk | One colour, 1 through 13 in order: game ends at once. [TRWIKI] [HYILMAZ]: all scores go to zero. [RULESPAL]: that player wins outright. | same | medium; exact 14th-tile requirement not stated |
| Renkli okey / sayılı okey | After a win, each loser's unmelded tiles are summed as penalty points. Pairs winner doubles the penalty; a red or black "tile on the ground" doubles it [TRWIKI] [DH-OKEY]. Forum variants use colour multipliers (yellow x2, blue x3, red x4, black x5, or 5/5/10/10) and large flat bonuses [DH-RENKLI]. [HYILMAZ] has a "renkli okey on/off" setting. | [TRWIKI] [DH-OKEY] [DH-RENKLI] [HYILMAZ] | low: no consistent standard; which tile "on the ground" (indicator vs. finishing discard) is unclear |
| Çift okey atma / okey dönme | Section 7. x4. | [TRWIKI] [DH-OKEY] | medium-low |
| Göstergeyi çifte bağlama | If agreed, a pairs player holding the indicator's twin may pair it with the face-up indicator: places it on the indicator without drawing or discarding, and a round later takes the indicator to complete the pair. | [TRWIKI] [DH-OKEY] | low; another forum voice says the indicator can never be used for a pair in düz okey |
| Indicator drawable as last tile | Section 11. | [PAGAT] [ENWIKI] | high (as a known variant) |
| Elimination | Players at zero or below leave. | [PAGAT] [ENWIKI] | high |
| Eşli | Section 10. | several | high |
| Çanak | Carried-over pot broken by an okey-discard finish. | [OKEYTOO] [OKEYCANLI] [MYNET-CANAK] | medium for the concept, low for numbers |
| 2 and 3 player tables | Same rules with fewer seats. | [PAGAT]; Okey Plus store listing; [OKEYCANLI] | high that it exists; deal details for fewer players not sourced beyond "same hand sizes" |
| Explicit pairs declaration | Irreversible "Double" button; extra penalty if not completed. | [ALTINSTAR] | low |
| Açık okey | No source found for a variant by this name. | none | UNVERIFIED |
| Cezalı okey | No source found as a classic-okey mode. "Ceza" in sources means the penalty counting of renkli/sayılı okey or of 101. | none | UNVERIFIED |
| "Göstergeli", "Okeyine", "Rövanşlı", "Hızlı masa" | Table types named in the Tekel Okey (Digitoy) store listing without definitions. | App Store id681105354 | UNVERIFIED |
| Related but separate games | Okey 101, 10 Taş Okey, Gin Okey, Batak Okey. Out of scope. | [TRWIKI]; Çanak Okey Plus listing | n/a |

---

## Summary table

| Rule | Most common default | Known alternatives |
|---|---|---|
| Tiles | 106: 4 colours x 1..13 x 2, plus 2 false jokers | none |
| Hand size | 14, first player 15 | none |
| First player | Dealer's right, opens by discarding | Dealer holds 15 and opens |
| Direction | Counter-clockwise | none documented |
| Dealer | Random first, then passes right each hand | unverified online behaviour |
| Dice / stacks | Ceremony only; no effect beyond the shuffle | n/a |
| Indicator | Random numbered tile; never a false joker (re-pick) | n/a |
| Okey | Indicator colour, rank + 1, 13 wraps to 1; fully wild | none |
| False joker | Equals the okey's face value; not wild | none |
| Draw | Stock top, or previous player's latest discard | none |
| Take-then-discard same tile | Not addressed; assume allowed | block it (unverified) |
| Run | 3+ consecutive, same colour; 12-13-1 valid, 13-1-2 invalid | none for classic okey |
| Set | 3 or 4, same rank, distinct colours | none |
| Normal win | 14 tiles in runs/sets, discard the 15th | none |
| Pairs win | Exactly 7 identical pairs; okey pairs with anything | explicit declaration required (one platform) |
| Okey + okey pair | Assume valid (derived) | unverified |
| Okey-discard win | Double | double-okey x4 house rule |
| Pairs + okey discard | Stacks: 8 | unspecified in Tier A |
| Show indicator | Before own first draw; each other player -1 | half the pot; rule disabled |
| Scoring | Start 20; -2 normal, -4 okey, -4 pairs, -1 indicator, to non-winners | base 1 (tr.wiki); start 6/12/30; düşme (winner counts down); chips + çanak pot |
| Katlamalı | Not a classic-okey mode on available evidence | 101-only rising opening threshold |
| Partnership | Individual | Opposite seats partnered; opposing team loses the points |
| Stock runs out | Hand void, no score; indicator not drawable | indicator drawn as last tile |
| Last discard on empty stock | Next player may take it only to win | unspecified |
| Match end | A score reaches 0 or below | elimination; first to 0 wins (düşme) |
| Match winner | Highest score (pagat: top two win, bottom two lose) | as above |
| One-colour hand | Off | x2, or flat 8; ordered 1..13 ends the game |

## Unverified / could not confirm

1. Official rules of Okey Plus, Çanak Okey Plus, Mynet Okey, Okey.net, VIP Okey, Okey Extra (in-app only; no public page reached).
2. Take a discard and immediately discard it.
3. Two okeys as a pair; false-joker pair combinations (derived, not quoted).
4. Whether a false-joker discard earns the okey-finish bonus.
5. Pairs + okey stacking in the Pagat rule set (only [NOVEL] and a forum state it).
6. Team score representation in eşli play; indicator points in eşli.
7. Play continuation after taking the last discard on an empty stock.
8. Dealer rotation after a void hand; tie-breaks at match end.
9. Existence of "açık okey", "cezalı okey", and any "katlamalı" mode for classic okey.
10. Exact çanak-breaking conditions and multipliers on the major platforms.
11. All figures are from tool paraphrases of the pages, not verbatim reads.

## Sources

- `[PAGAT]` https://www.pagat.com/rummy/okey.html
- `[ENWIKI]` https://en.wikipedia.org/wiki/Okey
- `[TRWIKI]` https://tr.wikipedia.org/wiki/Okey
- `[LITE]` https://litegames.freshdesk.com/en/support/solutions/articles/60000688857-okey-rules
- `[NOVEL]` https://novelgames.com/okey
- `[RULESPAL]` https://rulespal.com/okey/rulebook
- `[ALTINSTAR]` https://altinstar.com/en/how-to-play-okey/duz-okey-rules
- `[HYILMAZ]` https://apps.apple.com/app/id1078091420 (Okey - İnternetsiz, store description)
- `[LILACH]` https://www.lilachbullock.com/okey-nasil-oynanir/
- `[DH-OKEY]` https://forum.donanimhaber.com/okey-den-anlayanlar--96142417
- `[DH-RENKLI]` https://forum.donanimhaber.com/renkli-sayili-okeyden-anlayan-bir-baksin--94738226
- `[OKEYTOO]` https://okeytoo.gitbook.io/okeytoogame/introduction-to-okeytoo/game-description-and-rules
- `[MYNET-CANAK]` https://apps.apple.com/us/app/-/id536523082 (Çanak Okey - Mynet, store description)
- `[OKEYCANLI]` https://mwm.ai/pt/apps/okey-canl/1166866208 (mirror of the Okey Canlı store description)
- Feature-only listings consulted: https://apps.apple.com/tr/app/canak-okey-plus/id808762868 , https://apps.apple.com/app/id681105354 , https://www.bluestacks.com/tr/apps/board/canak-okey-plus-on-pc.html
- Unreachable or unusable: okey.net (DNS failure), vipokey.com (parked domain), eksisozluk.com entry 48986635 (HTTP 403), okey-gg.pages.dev and okeyland-web.pages.dev (fetch failed), spielregeln.de (TLS error), blog.jawaker.com/en/okey-rules (covers Okey 101 only).
