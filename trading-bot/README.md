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

Ordre d'utilisation recommande :

```bash
npm run scan            # voir ou en est le marche
npm run replay:raw      # construire la baseline + remplir la memoire avec du reel
npm run replay:memory   # voir ce que la memoire change, chiffres a l'appui
npm run memory:reset    # repartir de zero
```


## La strategie "Enigma Cipher S" (par defaut)

> **Reconstruction, pas une copie.** Cette implementation est deduite des **noms et
> valeurs des parametres** de l'indicateur MT4, lus sur des captures d'ecran. Le code
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
| 6. HTF | L'unite superieure valide le sens | `Use_HTF` = true, `HTF_Period` = H1, `HTF_Min_Pressure` = 0.6 |
| 7. Confirmation | Optionnelle, desactivee chez vous | `Require_Confirmation` = false |
| Sortie | SL a 1.8 x ATR, objectifs a 1R / 2R / 3R | `SL_ATR_Multi`, `TP1/2/3_RR` |

La **pression** d'une bougie est `(cloture - plus bas) / (plus haut - plus bas)` :
1.0 = cloture sur le haut, 0.0 = cloture sur le bas.

**Points d'incertitude assumes**, a verifier contre l'indicateur :
- `Min_Context_Depth` (0.05) : interprete comme la profondeur du balayage en multiples
  d'ATR. C'est l'etage qui elimine le plus de candidats — si le vrai sens differe, le
  nombre de signaux change beaucoup. `npm run diagnose` le montre.
- `Filter_Ready_Window` (5) : non implemente comme fenetre glissante ; les filtres sont
  evalues sur la bougie de signal.
- Les filtres desactives chez vous (`Use_Volume`, `Use_Session`, `Use_Spread`,
  `Use_Divergence`, `Use_CUSUM`, `Use_ZScore`, `Use_ER_Quality`, reversals ATR/RS) ne
  sont **pas** implementes, puisqu'ils sont a `false` dans votre configuration.

### Ce que ca donne sur donnees reelles

Fenetre BTCUSD M15, 400 bougies reelles (29 aout -> 2 sept), bougies H1 alignees sur l'horloge :

```
Bougies analysees : 375
SIGNAUX RETENUS   : 0 achat, 0 vente
    28  Range trop petit          75  Corps trop faible
   233  Pression/contexte hors seuils
    29  Balayage trop court       10  Filtre H1 contraire
```

**Zero signal en quatre jours.** Comme l'indicateur, lui, dessine des fleches sur la
meme periode, cela veut dire que **la reconstruction diverge de l'original**. Le
coupable est identifie par test de sensibilite :

| Configuration | Signaux sur 375 bougies |
|---|---|
| Tous les filtres (defaut) | **0** |
| Sans le filtre H1 | 10 |
| Sans le filtre de balayage | 4 |
| Sans H1 ni balayage | 39 |
| H1 assoupli a 0.5 | 0 |

C'est **l'interpretation de `HTF_Min_Pressure` qui bloque tout**. Ma lecture — "la
bougie H1 precedente doit clore a au moins 60% de son range dans le sens du trade" —
est trop stricte pour etre celle de l'indicateur.

**Calibrage necessaire** : relevez l'horodatage exact de 3 a 5 fleches sur votre
graphique (date, heure, sens). Ces points suffisent a retrouver la vraie regle H1 :
il suffit de garder l'interpretation qui reproduit vos fleches et rejette le reste.

## D'ou viennent les donnees

1. **Source par defaut** : endpoint public Binance `GET /api/v3/klines`. Aucune cle.
2. **Repli** : si l'endpoint est injoignable (reseau bloque, 403, timeout), le bot
   bascule sur un snapshot de bougies **reelles** archive dans `data/cache/`, et
   l'annonce en gros dans les logs avec la fenetre de dates concernee.
3. Si les deux echouent, le bot **echoue bruyamment**. Il n'invente jamais de bougie.

Pour interdire le repli et exiger du temps reel : `ALLOW_CACHE_FALLBACK=false`.

## Execution papier

`src/execution.ts` ne fait que construire un objet d'ordre et le logger.
Le garde-fou `assertPaperMode()` refuse de s'executer si `TRADING_MODE` vaut
autre chose que `paper`. Brancher un vrai broker demanderait d'ecrire un
adaptateur qui n'existe pas dans ce depot — c'est volontaire.

### Mode MCP / API paper optionnel

Non branche pour l'instant. Si vous ajoutez un jour un adaptateur broker en
paper/test **deja verifie**, respectez ces regles :
- les identifiants restent dans la config du client MCP ou dans des variables
  d'environnement serveur, jamais dans le code ni dans le chat ;
- preferez une cle API restreinte ou un sous-compte de test ;
- l'adaptateur reste derriere `assertPaperMode()` ;
- ajoutez alors les scripts `broker:check` et `broker:preview` (verification de
  compte et previsualisation seulement, jamais d'envoi d'ordre).

## La memoire

Deux fichiers, dans `data/` :

- **`ledger.csv`** — `timestamp,symbol,action,price,quantity,reason,mode,outcome,pnl`
  Une ligne par trade papier, par resultat de replay et par SKIP decide par la memoire.
- **`learnings.md`** — une section par setup, en francais clair, ecrite uniquement
  quand des pertes reelles repetees le justifient.

Les deux sont ignores par git : votre memoire est locale a votre experimentation.

### Quand la memoire bloque un signal

Les trois conditions doivent etre reunies :
1. au moins `MEMORY_MIN_LOSSES` pertes **reelles** deja enregistrees sur ce setup ;
2. un taux de reussite sous `MEMORY_MAX_WIN_RATE` ;
3. une lecon correspondante presente dans `learnings.md`.

Sinon le signal passe, et le log dit pourquoi. Aucune perte n'est semee a la main,
aucun echec n'est force. Si la memoire est vide, `replay:memory` vous dit de lancer
`replay:raw` d'abord.

**Anti-lookahead** : lors d'un replay, seules les lignes de ledger anterieures au
setup evalue sont prises en compte. `learnings.md`, lui, est un fichier global —
si vous le remplissez avec la meme fenetre que celle que vous rejouez, la comparaison
est *in-sample*. Pour un test propre : construisez la memoire sur une fenetre, puis
rejouez sur une autre (autre `SYMBOL`, autre `INTERVAL`, autre periode).


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
