# Bot de paper-trading — BTCUSD M15 / Enigma Cipher / memoire deux fichiers

Bot de trading **papier uniquement**, en TypeScript + Node.js.
Il lit des bougies reelles, calcule un signal (strategie "Enigma Cipher"
reconstruite, ou croisement de moyennes mobiles), dimensionne la position depuis
le capital reel, simule un ordre papier, puis apprend de ses resultats reels via
deux fichiers de memoire.

> **Aucun ordre reel n'est jamais envoye.** Il n'existe aucun chemin de code vers
> un endpoint d'ordre live, et aucune cle API n'est demandee.

---

## Installation

```bash
npm install
cp .env.example .env    # optionnel : les defauts sont deja surs
```

Node 20+ requis.

## Les quatre commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm run scan` | Un passage : bougies -> signal -> risque -> memoire -> ordre papier simule |
| `npm run replay:raw` | Rejoue la strategie **sans memoire** sur l'historique reel. C'est la baseline honnete. |
| `npm run replay:memory` | Meme fenetre, mais chaque setup est confronte a la memoire, avec comparaison chiffree |
| `npm run memory:reset` | Vide `data/ledger.csv` et `data/learnings.md` |
| `npm run diagnose` | Montre a quel etage du filtre les bougies sont eliminees |
| `npm run propose` | Produit un ticket d'ordre complet — **n'envoie rien** |
| `npm run signals` | Liste tous les signaux, en UTC et en heure serveur MT4 |
| `npm run calibrate -- <iso>` | Detaille l'evaluation a une bougie donnee |

Reglages d'interpretation (les trois inconnues de la reconstruction) :
`HTF_MODE` (aligned / contrarian / clear / off), `CONTEXT_DEPTH_MODE` (clarity / sweep),
`READY_MODE` (cooldown / armed).

Ordre d'utilisation recommande :

```bash
npm run scan            # voir ou en est le marche
npm run replay:raw      # construire la baseline + remplir la memoire avec du reel
npm run replay:memory   # voir ce que la memoire change, chiffres a l'appui
npm run memory:reset    # repartir de zero
```


## La strategie "Enigma Cipher S" (par defaut)

> **Reconstruction, pas une copie.** Cette implementation est deduite des **noms et
> valeurs des parametres** de l'indicateur MT4 (v1.01, mode FF), lus sur des captures. Le code
> source du `.ex4` n'est pas disponible : **la logique interne exacte est inconnue**.
> Les fleches de l'indicateur et les signaux de ce bot peuvent differer. Comparez
> signal par signal sur le meme graphique avant d'accorder la moindre confiance a ces
> chiffres.

Lecture retenue : **un retournement apres balayage de liquidite**.

| Etage | Regle | Parametre |
|---|---|---|
| 1. Range | La bougie doit etre assez grande | `Min_Range_ATR` = 0.5 |
| 2. Corps | Le corps doit occuper une part du range | `Min_Body_Efficiency` = 0.25 |
| 3. Contexte | Sur les 8 bougies precedentes, le camp oppose domine | `Momentum_Bars` = 8, `Bear_Context_Max` = 0.4, `Bull_Context_Min` = 0.6 |
| 4. Pression | La bougie referme a l'oppose du contexte | `Bull_Reversal_Min` = 0.72, `Bear_Reversal_Max` = 0.28 |
| 5. Balayage | Elle casse l'extreme du contexte avant de refermer | `Min_Context_Depth` = 0.05 x ATR |
| 6. HTF | La derniere bougie H1 **cloturee** doit avoir une pression tranchee ; le sens de la regle est configurable (`HTF_MODE`) | `Use_HTF` = true, `HTF_Period` = H1, `HTF_Min_Pressure` = 0.6 |
| 7. Confirmation | Optionnelle, desactivee chez vous | `Require_Confirmation` = false |
| Sortie | SL a 1.8 x ATR, objectifs a 1R / 2R / 3R | `SL_ATR_Multi`, `TP1/2/3_RR` |

La **pression** d'une bougie est `(cloture - plus bas) / (plus haut - plus bas)` :
1.0 = cloture sur le haut, 0.0 = cloture sur le bas.

**Points d'incertitude assumes**, a verifier contre l'indicateur :
- `HTF_Min_Pressure` : le seuil de 60% est confirme par le tableau de bord, mais le
  **sens** de la regle reste indetermine (voir le calibrage ci-dessous). Mode par
  defaut : `contrarian`.
- `Min_Context_Depth` (0.05) : interprete comme la profondeur du balayage en multiples
  d'ATR. `npm run diagnose` montre combien de candidats il elimine.
- `Filter_Ready_Window` (5) : non implemente comme fenetre glissante ; les filtres sont
  evalues sur la bougie de signal.
- Les filtres desactives chez vous (`Use_Volume`, `Use_Session`, `Use_Spread`,
  `Use_Divergence`, `Use_CUSUM`, `Use_ZScore`, `Use_ER_Quality`, reversals ATR/RS) ne
  sont **pas** implementes, puisqu'ils sont a `false` dans votre configuration.

### Calibrage contre les fleches de l'indicateur

Une fleche a pu etre calibree exactement. Son objet MT4 portait `ECS_Line_1788221100_TP3` :
l'entier est un timestamp Unix.

| | |
|---|---|
| Timestamp de la fleche | 1788221100 = **31/08/2026 21:05 UTC** |
| Affichage MT4 | 01/09 00:05 -> **le serveur FBS tourne en UTC+3** |
| Bougie (barre d'etat MT4) | O 78789.70 H 78860.20 L 78692.10 C 78860.20 |
| Unite de temps | **M5** |

**Ce qui est confirme** — les valeurs calculees reproduisent le tableau de bord de
l'indicateur (`Live Pressure: Current / Context`, `HTF - last closed bar: Pressure (min 60%)`) :

| Etage | Mesure | Seuil | Verdict |
|---|---|---|---|
| Pression de la bougie | 100 % | achat >= 72 % | passe |
| Contexte sur 8 bougies | 34 % | achat <= 40 % | passe |
| Efficacite du corps | 0.40 | >= 0.25 | passe |
| Seuil HTF | 60 % confirme par le panneau | | |
| Bougie HTF | "last closed bar" confirme | | |

**Ce qui a ete corrige grace aux fleches** :

1. `HTF_Min_Pressure` — l'indicateur a signale un **achat avec une H1 a 21 %**, donc
   baissiere. Le mode `aligned` est elimine. `HTF_MODE` = `contrarian` (defaut), `clear`
   ou `off` restent possibles.
2. `Min_Context_Depth` — la section de l'indicateur s'appelle **CONTEXT CLARITY**.
   Ce n'est pas une profondeur de balayage mais la **nettete du contexte**, sa distance
   au neutre : `|contexte - 0.5| >= 0.05`. Avec l'ancienne lecture, tous les setups aux
   extremes reels etaient rejetes. `CONTEXT_DEPTH_MODE` = `clarity` (defaut) ou `sweep`.
3. `Filter_Ready_Window` = 5 (`Ready Window: 5 bars` au panneau) — sans lui un meme
   retournement produit une grappe de signaux consecutifs alors que l'indicateur ne
   dessine qu'une fleche. `READY_MODE` = `cooldown` (defaut) ou `armed`.

### Ce qui ne colle pas encore : la densite de signaux

Sur une fenetre d'environ 32 heures, le graphique MT4 montre **3 fleches**. La
reconstruction en produit beaucoup plus :

| `READY_MODE` | `HTF_MODE` | Signaux sur 41 h |
|---|---|---|
| cooldown | contrarian | 20 |
| cooldown | clear | 31 |
| cooldown | off | 38 |
| armed | contrarian | 26 |
| armed | clear | 36 |
| armed | off | 45 |

Meme la combinaison la plus stricte signale environ **5 fois trop**. Un etage
supplementaire de l'indicateur n'est donc pas reproduit — continuer a deviner serait
inefficace.

**Ce qui trancherait tout de suite** : les horodatages exacts de quelques fleches.
Survolez une fleche dans MT4, l'infobulle donne un nom d'objet du type
`ECS_Line_1788221100_TP3` dont l'entier est un timestamp Unix. Trois ou quatre suffisent :
il devient alors possible de garder l'interpretation qui reproduit ces bougies-la et
rejette les autres, au lieu d'en tester une a l'aveugle.

`npm run signals` sort la liste en heure serveur MT4, `npm run calibrate -- <iso>` detaille
une bougie precise, etage par etage.

## Mode proposition : du signal a l'ordre

Ce bot **n'envoie jamais d'ordre**. Il ne detient aucune cle d'API et n'a aucun endpoint
d'execution. `npm run propose` produit un **ticket** complet — sens, taille, entree, stop,
objectifs, perte encourue en devise et en % du compte — l'archive dans
`data/proposals.jsonl`, et s'arrete la. Un humain relit et decide.

Le ticket refuse de lui-meme quand : aucun setup, capital insuffisant pour le stop, ou
mise en garde de la memoire. Il signale aussi l'age des donnees — un ticket bati sur des
bougies perimees ne vaut rien.

```
┌─ TICKET D ORDRE — PROPOSITION, RIEN N A ETE ENVOYE
│ Statut        : REFUSE
│ Marche        : BTCUSDT 15m
│ Capital       : 19.60 USDT
│ Donnees       : SNAPSHOT ARCHIVE — derniere bougie il y a 30 minutes
│ Motif         : Pas de setup : pression 1.00, contexte 0.54 (seuils 0.72/0.4 et 0.28/0.6).
└─ Aucun ordre envoye.
```

Un profil pret pour un compte futures crypto a tailles fractionnaires est fourni dans
`.env.moonx.example` (aucune cle, uniquement des tailles et un solde a declarer).

## Le probleme du capital de 20 $

C'est le point le plus important de ce document, et il ne depend d'aucune opinion :
c'est de l'arithmetique sur vos propres parametres.

Le stop de la strategie vaut **1.8 x ATR**. Sur BTCUSD M15, avec l'ATR mesure sur les
donnees reelles de la fenetre de test :

| Hypothese ATR | SL (1.8 ATR) | Perte au lot min 0.01 | % d'un compte de 20 $ | Capital pour risquer 1% | pour 2% | pour 5% |
|---|---|---|---|---|---|---|
| ATR moyen de la fenetre : 193 $ | 348 $ | 3.48 $ | 17 % | 348 $ | 174 $ | 70 $ |
| ATR actuel (plus volatil) : 316 $ | 569 $ | 5.69 $ | 28 % | 569 $ | 285 $ | 114 $ |

Hypotheses : BTCUSD, taille de contrat 1 BTC par lot, lot minimum 0.01.
**Verifiez ces deux valeurs** dans MT4 : clic droit sur BTCUSD dans Market Watch ->
Specification. Si votre broker utilise d'autres valeurs, changez `CONTRACT_SIZE` et
`MIN_LOT` dans `.env`, tout le calcul suit.

Cette table vaut pour **MT4 / FBS**, ou le lot minimum BTCUSD est 0.01 BTC.
Sur un compte **futures crypto a tailles fractionnaires**, le calcul est bien plus
favorable : une position de 0.001 BTC met en jeu 0.35 a 0.57 USDT sur ce meme stop, soit
1.8 a 2.9 % d'un compte de 19.60 USDT — dimensionnable. Verifiez la taille d'ordre
minimum de votre venue avant d'y compter.

Conclusion pour MT4 : **au lot minimum, un seul stop coute 17 a 28 % de votre compte.**
Trois pertes d'affilee — ce qui arrive avec n'importe quelle strategie — et il ne reste
presque rien. Le bot refuse donc ces trades et l'ecrit noir sur blanc :

```
ATTENTION | 2 setup(s) sur 2 rejete(s) par le dimensionnement.
ATTENTION | Lot theorique 0.0006 sous le lot minimum 0.01. Au lot minimum, un stop
            touche coute 3.57 soit 17.9% du capital de 20.00 (budget vise : 1.0%).
            Capital necessaire pour respecter 1.0% de risque : environ 357.20.
```

### Les options reelles

1. **Rester en papier** avec ce bot jusqu'a ce que le capital suive. Gratuit, et c'est
   ce que le projet fait deja.
2. **Un compte Cent**, si votre broker en propose un. Le lot y porte 100 fois moins :
   20 $ deviennent 2000 cents et le risque par trade redevient dimensionnable. C'est la
   seule facon connue de trader 20 $ sans risquer 20 % par position. Verifiez les specs
   avant d'ouvrir quoi que ce soit.
3. **Un instrument a plus petit notionnel** que le BTC. Le calcul est le meme : mettez
   `CONTRACT_SIZE`, `MIN_LOT` et l'ATR de l'instrument dans `.env`, le bot vous dira
   immediatement si c'est finançable.
4. **Augmenter le capital** avant de trader cette strategie sur BTCUSD : environ 350 $
   pour un risque de 1 % par trade, 175 $ pour 2 %.

Ce qui **ne marche pas** : augmenter le risque par trade jusqu'a ce que ca passe. A 20 %
de risque par position, une serie de 4 pertes — statistiquement banale — efface le compte.
Ce n'est pas de la prudence excessive, c'est la raison pour laquelle le module de
dimensionnement existe.

> Votre capture montre un compte **FBS-Real-9**, donc un compte reel, avec AutoTrading
> actif et un solde de 0.00 USD. Ce bot ne s'y connecte pas et ne peut pas y envoyer
> d'ordre : il n'a aucun adaptateur broker. Rien de ce qu'il fait ne touche ce compte.

## Configurer / experimenter

Tout est dans `src/config.ts`, surchargeable par `.env` ou en ligne :

```bash
SYMBOL=ETHUSDT INTERVAL=15m npm run replay:raw
FAST_MA=5 SLOW_MA=34 npm run replay:raw
QUANTITY=0.1 MAX_POSITION=0.05 npm run scan     # -> SKIP, quantite > max
REPLAY_HORIZON=24 npm run replay:raw
```

| Variable | Defaut | Role |
|---|---|---|
| `TRADING_MODE` | `paper` | Garde-fou. Toute autre valeur bloque l'execution. |
| `SYMBOL` / `INTERVAL` | `BTCUSDT` / `5m` | Marche analyse |
| `CANDLE_LIMIT` | `500` | Nombre de bougies chargees |
| `FAST_MA` / `SLOW_MA` | `9` / `21` | Moyennes du croisement |
| `REGIME_MA` | `50` | MA longue qui qualifie le regime du setup |
| `QUANTITY` / `MAX_POSITION` | `0.01` / `0.05` | Taille et plafond de position |
| `REPLAY_HORIZON` | `12` | Bougies avant mesure du resultat d'un setup |
| `MEMORY_MIN_LOSSES` | `2` | Pertes reelles avant blocage |
| `MEMORY_MAX_WIN_RATE` | `0.5` | Seuil de reussite sous lequel un setup est mauvais |
| `ALLOW_CACHE_FALLBACK` | `true` | Autorise le snapshot reel en repli |
| `STRATEGY` | `enigma` | `enigma` ou `ma` |
| `ACCOUNT_BALANCE` | `20` | Capital, en devise du compte |
| `RISK_PER_TRADE` | `0.01` | Risque par trade (0.01 = 1%) |
| `CONTRACT_SIZE` | `1` | Taille d'un lot (BTCUSD : 1 BTC) |
| `MIN_LOT` / `LOT_STEP` | `0.01` | Contraintes du broker |
| `SL_ATR_MULTI` | `1.8` | Stop en multiples d'ATR |
| `TARGET_RR` | `1` | Objectif utilise en replay : 1, 2 ou 3 |
| `MIN_CONTEXT_DEPTH` | `0.05` | Profondeur de balayage exigee (x ATR) |
| `HTF_MIN_PRESSURE` | `0.6` | Pression H1 exigee |
| `USE_HTF`, `USE_CONTEXT_DEPTH` | `true` | Activation des etages du filtre |

## Structure

```
src/
  config.ts          configuration unique (env + defauts)
  types.ts           types partages
  logger.ts          logs horodates
  market.ts          bougies reelles : HTTP public puis repli snapshot
  strategy.ts        aiguillage de strategie + croisement MA 9/21
  enigma.ts          strategie Enigma Cipher (reconstruction)
  indicators.ts      ATR, pression, efficacite du corps, agregation HTF
  sizing.ts          taille de position depuis le capital reel
  diagnose.ts        funnel du filtre
  proposal.ts        ticket d ordre — n envoie rien
  risk.ts            approuve / rejette, avec raison
  execution.ts       simulation papier + garde-fou TRADING_MODE
  memory.ts          lecture/ecriture ledger.csv et learnings.md
  adaptiveFilter.ts  transforme la memoire en verdict SKIP / pas SKIP
  replay.ts          replay raw et replay memoire + comparaison
  bot.ts             orchestration d'un scan
  index.ts           CLI
data/
  cache/             snapshots de bougies REELLES (repli hors ligne)
  ledger.csv         memoire machine (gitignore)
  learnings.md       memoire lisible (gitignore)
trading_bot_instructions.md   regles de reference du bot
```

## Regles de securite et limites

- Paper/local uniquement. Pas de trading live, pas de cle API, pas de secret en clair.
- La strategie Enigma est une **reconstruction non verifiee** (voir plus haut).
- Le replay simule SL et TP bougie par bougie. Il ne voit pas l'interieur d'une bougie :
  si SL et TP sont touches dans la meme bougie, il compte le **stop** (hypothese prudente).
- **Ni les frais, ni le spread, ni le swap, ni le slippage ne sont modelises.** Sur BTCUSD
  le spread est large : les PnL affiches sont **optimistes**.
- Une fenetre de quelques centaines de bougies n'a aucune valeur statistique.
  Ne concluez rien sur la rentabilite a partir de ces chiffres.
- Le filtre memoire peut degrader les resultats : sur la fenetre de test livree,
  c'est exactement ce qui s'est produit (voir plus bas). C'est une information utile,
  pas un bug.
- Ceci est un projet d'experimentation. Ce n'est pas un conseil financier.

## Resultat reel du premier run (a titre d'exemple, pas de promesse)

Strategie Enigma, BTCUSD M15, 500 bougies reelles (28 aout -> 2 sept), SL 1.8 ATR, cible 1R :

| | valeur |
|---|---|
| Setups detectes | 2 |
| Setups pris avec 20 $ de capital | **0** (rejetes par le dimensionnement) |
| Resultat au lot minimum, a titre de mesure | 2 gagnants, +2.00 R, +5.03 $ |

Le chiffre a retenir n'est pas le +5.03 $ : c'est le **0**. Avec 20 $, cette strategie sur
cet instrument n'est pas finançable, et deux trades ne demontrent rien.
