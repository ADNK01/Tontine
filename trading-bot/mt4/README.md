# EnigmaTester.mq4 — backtester l'indicateur, sans le reconstruire

`EnigmaTester.mq4` ne contient aucune strategie. Il lit les **fleches** d'un
indicateur via ses buffers et ouvre la position correspondante, avec une taille
calculee depuis le risque. Son seul but : laisser le **Strategy Tester** de MT4
juger l'indicateur reel, plutot qu'une reconstruction approximative.

C'est le chemin le plus fiable pour repondre a "est-ce que cette strategie vaut
quelque chose", parce qu'il n'y a rien a deviner : c'est l'indicateur lui-meme
qui signale.

## Installation

1. MT4 -> Fichier -> Ouvrir le dossier des donnees.
2. Copier `EnigmaTester.mq4` dans `MQL4/Experts/`.
3. L'indicateur doit etre dans `MQL4/Indicators/` (`.ex4` ou `.mq4`).
4. MetaEditor -> ouvrir `EnigmaTester.mq4` -> Compiler (F7).
5. Il apparait dans le Navigateur, section Conseillers experts.

## Trouver les index de buffer (a faire en premier)

L'EA doit savoir quel buffer porte les fleches d'achat et lequel porte les ventes.

1. Attacher l'EA a un graphique avec `ModeDiagnostic = true`.
2. Il n'envoie aucun ordre : il imprime la valeur des 8 buffers a chaque bougie,
   dans l'onglet **Experts**.
3. Sur une bougie portant une fleche d'achat, le buffer qui affiche un prix (et non
   "vide") est `BuyBufferIndex`. Idem pour la vente.

Pour la famille `Sdv_Wyckoff` / `SDC Exhaust`, la lecture du code source donne
directement **buffer 0 = achats, buffer 1 = ventes**.

## Backtest

Strategy Tester : modelisation **Every tick**, 12 mois minimum, spread egal a votre
spread reel, capital de depart egal a votre capital reel. Un backtest lance avec
10 000 $ de capital ne dit rien de ce que vivra un compte de 20 $ : c'est le
dimensionnement qui change tout.

## Trois pieges qui rendent un backtest faux

**1. iCustom utilise les parametres par DEFAUT de l'indicateur, pas les votres.**
`iCustom(NULL, 0, "Enigma Cipher S", buffer, shift)` charge l'indicateur avec les
valeurs ecrites dans son fichier source. Si vos reglages du graphique en different,
vous testez une autre strategie que celle que vous voyez. Pour tester vos reglages
exacts, il faut lister tous les parametres dans l'appel, dans leur ordre exact de
declaration.

**2. La periode d'essai vide les buffers en silence.**
Ces indicateurs embarquent une date d'expiration. Une fois expiree, l'indicateur
remplit ses buffers de `EMPTY_VALUE` et n'affiche qu'un message : aucune erreur.
L'EA ne voit plus aucune fleche, le backtest rend **zero trade**, et cela ressemble
a une strategie qui ne signale jamais. Verifiez le compteur de jours affiche sur le
graphique avant toute conclusion.

**3. Le lot minimum.**
Si le capital ne permet pas d'atteindre le lot minimum du broker au risque demande,
l'EA refuse le trade et l'ecrit dans le journal, avec le capital qui serait
necessaire. Il n'arrondit jamais vers le haut.

## Securites presentes dans cette version

- `AutoriserTradesReels = false` par defaut : **aucun ordre n'est envoye** sur un
  graphique live tant que vous ne l'avez pas passe a `true` vous-meme. Le Strategy
  Tester, lui, trade toujours — un backtest fonctionne donc immediatement.
- Respect du `STOPLEVEL` du broker : si le stop calcule est plus serre que la
  distance minimale autorisee, le trade est ignore plutot que le risque elargi.
- Repli automatique si le broker refuse SL/TP a l'ouverture (erreur 130) : ouverture
  puis `OrderModify`, avec avertissement en clair si la modification echoue.
- `Slippage` configurable, a 50 points par defaut. Sur BTCUSD, une valeur trop
  serree fait echouer la plupart des ordres.
- Une seule position a la fois, identifiee par `MagicNumber`.

## Ce que ce fichier ne fait pas

Il ne decide rien, ne filtre rien, n'apprend rien. Toute la logique reste dans
l'indicateur. Le journal de memoire (`ledger.csv`, `learnings.md`) et le
dimensionnement adaptatif vivent dans le projet TypeScript, un etage au-dessus.
