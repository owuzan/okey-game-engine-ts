# Okey Engine

The language of the Turkish tile games Okey and Okey 101, as this engine uses it. Code uses the English term; the Turkish word is what players say.

## Language

### Tiles

**Tile** (taş):
One of the 106 physical pieces: two copies of each number 1 to 13 in four colours, plus two false jokers.
_Avoid_: Card, piece, stone

**Face**:
What a tile shows: a colour and a number. Two tiles share each face.
_Avoid_: Value, rank

**Indicator** (gösterge):
The tile turned face up at the start of a hand; it decides which face is the okey.
_Avoid_: Trump, marker

**Okey**:
A tile whose face is one above the indicator in the same colour (13 wraps to 1). It is wild: it may stand for any tile.
_Avoid_: Joker, wildcard

**False joker** (sahte okey):
One of the two unnumbered tiles. It is not wild; it stands for the okey's face and nothing else.
_Avoid_: Joker, fake okey

**Rack** (ıstaka):
The tiles a player holds, hidden from the others.
_Avoid_: Hand (a hand is a deal), board

**Draw pile** (deste):
The face-down tiles players draw from.
_Avoid_: Stock, deck

**Discard** (atılan taş):
A tile thrown face up at the end of a turn; only the next player may take the top one.

### Melds

**Meld** (per):
A valid set of tiles: a run, a group or a pair.
_Avoid_: Set (ambiguous), combination

**Run** (seri):
Three or more consecutive numbers of one colour.
_Avoid_: Sequence, straight

**Group** (grup):
Three or four tiles of one number in different colours.
_Avoid_: Set, kind

**Pair** (çift):
Two tiles with the same face.

**High one**:
A 1 placed after 13 in a run (12-13-1). Allowed in classic Okey, never in Okey 101.

**Arrangement** (dizim):
A split of a rack into melds and leftover tiles. A runs arrangement (seri dizim) uses runs and groups; a pairs arrangement (çift dizim) uses pairs.

### Play

**Seat**:
A player's position, numbered from 0; play passes to the next number.
_Avoid_: Player id, index

**Side**:
Who a seat scores for: itself, or its team in partnership play.
_Avoid_: Team (only when there are teams)

**Partnership play** (eşli):
Four players in two teams of opposite seats. Its opposite is individual play (eşsiz).

**Hand** (el):
One deal, played until someone goes out or the draw pile runs out.
_Avoid_: Round, game

**Match** (maç):
A series of hands with a running score.
_Avoid_: Game, session

**Dealer** (dağıtan):
The seat that deals; the next seat is the starter and holds one extra tile.

**Go out** (bitmek):
To end the hand by discarding one's last unmelded tile.
_Avoid_: Win (a hand can be won only by going out, but a match is won on score)

**Okey finish** (okey atarak bitme):
Going out with an okey as the final discard.

**Pairs finish** (çifte bitme):
In classic Okey, going out with seven pairs. In Okey 101, going out after opening with pairs.

**Show the indicator** (gösterge göstermek):
In classic Okey, revealing the twin of the indicator before one's first move to score points.

### Okey 101

**Open** (el açmak):
To lay one's first melds on the table, meeting the opening barrier.

**Opening barrier** (baraj):
What an opening must reach: 101 points in runs and groups, or five pairs.

**Escalation** (katlamalı):
The variant where each opening in a hand must beat the previous one by a point, or by a pair. Scores are not multiplied.
_Avoid_: Doubling, folding

**Table** (yer):
The melds laid face up during a hand.

**Lay off** (işlemek):
To add a tile to a run or group already on the table.

**Layable tile** (işlek taş):
A tile that fits a meld on the table; discarding one is penalised.

**Okey swap** (yerden okey almak):
Replacing an okey on the table with the tile it stands for and taking the okey.

**From hand** (elden bitme):
Going out by laying every tile but one in a single turn, without having opened before.

**Penalty** (ceza):
Points added to a player's hand score for a breach during play, 101 by default.
