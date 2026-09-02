# trading_bot_instructions.md

Fichier de reference du bot. Toute modification de comportement part d'ici.

## 1. Objectif du projet

Un bot de **paper-trading** en TypeScript/Node.js qui lit des bougies reelles,
applique une strategie de croisement de moyennes mobiles, filtre par le risque,
simule un ordre papier, et apprend de ses propres resultats reels.

- Marche de depart : **BTCUSDT**, interval **5m**
- Aucun trade reel, jamais. Le paper-trading vient en premier parce qu'une
  strategie non verifiee sur donnees reelles n'a aucune valeur.

## 2. Regles de securite

- Mode papier par defaut, verrouille par `TRADING_MODE=paper` (`assertPaperMode`).
- Aucun chemin de code vers un endpoint d'ordre reel.
- Aucune cle API demandee, stockee ou loggee. `.env` est ignore par git.
- Aucun secret expose a du code frontend (il n'y a pas de frontend).
- Aucune action si le controle de risque ne passe pas.

## 3. Regles de strategie

- Indicateurs : SMA rapide **9**, SMA lente **21**, SMA de regime **50**.
- **BUY** : la MA9 croise au dessus de la MA21 sur la derniere bougie cloturee.
- **SELL** : la MA9 croise en dessous de la MA21.
- **HOLD** : pas de croisement frais sur cette bougie.
- Pas de repaint : la bougie en cours de formation est toujours exclue.
- Chaque setup est etiquete `SYMBOLE|MA9x21|CROSS_UP|TREND_UP` (croisement + regime),
  c'est cette cle que la memoire apprend.

## 4. Regles de risque

- `QUANTITY` configurable (defaut 0.01), `MAX_POSITION` configurable (defaut 0.05).
- Si `QUANTITY > MAX_POSITION` -> action finale **SKIP**.
- Quantite nulle ou negative -> **SKIP**.
- Toute decision porte une raison en francais clair.

## 5. Regles broker / MCP

- Aucun adaptateur broker n'est branche pour l'instant : l'execution est locale.
- Donnees de marche : endpoint public Binance `/api/v3/klines`, sans cle.
- Repli documente : snapshot de bougies **reelles** dans `data/cache/`, annonce
  bruyamment dans les logs. Jamais de bougies generees.
- Un futur adaptateur broker ne sera branche qu'apres verification en mode
  paper/test, et restera derriere le meme garde-fou `TRADING_MODE`.

## 6. Regles de memoire

- `data/ledger.csv` : journal machine.
  En-tete `timestamp,symbol,action,price,quantity,reason,mode,outcome,pnl`.
- `data/learnings.md` : lecons en francais clair, une section par setup.
- Les deux fichiers sont relus avant tout BUY/SELL du chemin memoire.
- Avant tout BUY/SELL : ce symbole a-t-il deja perdu sur un setup similaire ?
  learnings.md met-il en garde ? le signal repete-t-il un mauvais trade connu ?
- Blocage seulement si : `MEMORY_MIN_LOSSES` pertes **reelles** deja enregistrees
  ET taux de reussite < `MEMORY_MAX_WIN_RATE` ET lecon presente dans learnings.md.
- Anti-lookahead : seules les lignes de ledger anterieures au setup evalue comptent.
- Interdits : perte semee a la main, bougie inventee, echec force.

## 7. Definition of done

- `npm run scan`, `npm run replay:raw`, `npm run replay:memory`, `npm run memory:reset`
  fonctionnent.
- Les logs indiquent la source des donnees, le signal, le verdict de risque,
  le verdict de memoire et la decision finale.
- `replay:raw` reste une baseline honnete qui ignore la memoire.
- `replay:memory` affiche le contrefactuel et l'ecart reel.
- Aucun ordre reel n'est jamais passe.
