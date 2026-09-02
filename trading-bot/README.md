# Bot de paper-trading — BTCUSDT / MA 9-21 / memoire deux fichiers

Bot de trading **papier uniquement**, en TypeScript + Node.js.
Il lit des bougies reelles, calcule un signal de croisement de moyennes mobiles,
le passe par un controle de risque, simule un ordre papier, puis apprend de ses
resultats reels via deux fichiers de memoire.

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

Ordre d'utilisation recommande :

```bash
npm run scan            # voir ou en est le marche
npm run replay:raw      # construire la baseline + remplir la memoire avec du reel
npm run replay:memory   # voir ce que la memoire change, chiffres a l'appui
npm run memory:reset    # repartir de zero
```

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

## Structure

```
src/
  config.ts          configuration unique (env + defauts)
  types.ts           types partages
  logger.ts          logs horodates
  market.ts          bougies reelles : HTTP public puis repli snapshot
  strategy.ts        croisement MA 9/21 + etiquetage du regime
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
- Le replay mesure une sortie **a horizon fixe** (N bougies), pas un stop-loss ni un
  take-profit reels. Les frais et le slippage ne sont pas modelises : les PnL affiches
  sont donc **optimistes** par rapport a une execution reelle.
- Une fenetre de quelques centaines de bougies n'a aucune valeur statistique.
  Ne concluez rien sur la rentabilite a partir de ces chiffres.
- Le filtre memoire peut degrader les resultats : sur la fenetre de test livree,
  c'est exactement ce qui s'est produit (voir plus bas). C'est une information utile,
  pas un bug.
- Ceci est un projet d'experimentation. Ce n'est pas un conseil financier.

## Resultat reel du premier run (a titre d'exemple, pas de promesse)

Fenetre BTCUSDT 1h, 500 bougies reelles (2026-08-12 -> 2026-09-02), horizon 12 bougies,
quantite 0.01 :

| | sans memoire | avec memoire |
|---|---|---|
| Setups pris | 20 | 15 (5 filtres) |
| Taux de reussite | 55.0% | 53.3% |
| PnL total | +11.77 USDT | +0.07 USDT |
| Drawdown max | 51.06 | 51.06 |

La memoire a filtre 5 setups, dont plusieurs qui auraient ete gagnants : elle a
**coute** 11.70 USDT sur cette fenetre. Les chiffres sont ceux des donnees reelles.
