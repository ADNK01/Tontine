# trading_bot_instructions.md

Fichier de reference du bot. Toute modification de comportement part d'ici.

## 1. Objectif du projet

Un bot de **paper-trading** en TypeScript/Node.js qui lit des bougies reelles,
applique une strategie de croisement de moyennes mobiles, filtre par le risque,
simule un ordre papier, et apprend de ses propres resultats reels.

- Marche de depart : **BTCUSD**, interval **M5** (celui du graphique MT4)
- Aucun trade reel, jamais. Le paper-trading vient en premier parce qu'une
  strategie non verifiee sur donnees reelles n'a aucune valeur.

## 2. Regles de securite

- Mode papier par defaut, verrouille par `TRADING_MODE=paper` (`assertPaperMode`).
- Aucun chemin de code vers un endpoint d'ordre reel.
- Aucune cle API demandee, stockee ou loggee. `.env` est ignore par git.
- Aucun secret expose a du code frontend (il n'y a pas de frontend).
- Aucune action si le controle de risque ne passe pas.

## 3. Regles de strategie

Strategie active : **Enigma Cipher S (reconstruction)**, parametres repris des captures
MT4. Le code source de l'indicateur n'etant pas disponible, la logique est deduite des
noms de parametres et **doit etre verifiee** signal par signal contre les fleches de
l'indicateur.

Etages du filtre, dans l'ordre :
1. Range de la bougie >= `Min_Range_ATR` (0.5) x ATR(14).
2. Corps >= `Min_Body_Efficiency` (0.25) du range.
3. Contexte sur `Momentum_Bars` (8) bougies : pression moyenne <= 0.4 (achat) ou >= 0.6 (vente).
4. Pression de la bougie de signal >= 0.72 (achat) ou <= 0.28 (vente).
5. Balayage de l'extreme du contexte >= `Min_Context_Depth` (0.05) x ATR.
6. Filtre H1 sur la derniere bougie cloturee, seuil `HTF_Min_Pressure` (0.6). Le SENS
   de la regle est indetermine : `HTF_MODE` = aligned / contrarian / clear / off.
   La seule fleche calibree (achat avec H1 a 21%) exclut `aligned`. Defaut : `contrarian`.
7. Confirmation desactivee (`Require_Confirmation` = false).

Sortie : **SL a 1.8 x ATR**, objectifs a 1R / 2R / 3R. Le replay sort au SL ou au TP,
avec le stop prioritaire si les deux sont touches dans la meme bougie.

Pas de repaint : la bougie en cours de formation est toujours exclue, et le filtre H1
n'utilise que des bougies H1 deja cloturees.

Strategie de repli disponible : croisement MA 9/21 (`STRATEGY=ma`).

## 4. Regles de risque

- Le capital est declare (`ACCOUNT_BALANCE`, defaut 20) et le risque par trade aussi
  (`RISK_PER_TRADE`, defaut 1%).
- La taille de position est **calculee** : `lot = (capital x risque) / (distance SL x taille contrat)`.
- Si le lot theorique tombe sous le lot minimum du broker -> **SKIP**, avec le capital
  minimum necessaire indique en clair. Aucun arrondi vers le haut, jamais.
- `MAX_POSITION` plafonne la taille meme quand le calcul l'autorise.
- Toute decision porte une raison en francais clair.

### Contrainte reelle actuelle

Avec 20 $ de capital, un SL de 1.8 x ATR sur BTCUSD M15 coute 17 a 28 % du compte au lot
minimum. **Aucun trade n'est finançable a 1 % de risque** : le bot refuse, et c'est le
comportement attendu, pas un bug.

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
