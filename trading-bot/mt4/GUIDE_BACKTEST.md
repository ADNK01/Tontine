# Lancer le backtest dans le Strategy Tester de MT4

Objectif : faire juger l'indicateur **réel** par MetaTrader, sur ton historique
local — c'est-à-dire répondre à la question que mon environnement ne peut pas
trancher, faute d'accès à des données longues.

Compte ~30 minutes la première fois, dont l'essentiel en téléchargement d'historique.

---

## Avant de commencer : le fichier à utiliser

Deux EA sont fournis. **Utilise `WyckoffTester.mq4`.**

| Fichier | Quand |
|---|---|
| `WyckoffTester.mq4` | **Celui-ci.** Passe les 113 paramètres de l'indicateur explicitement. |
| `EnigmaTester.mq4` | Version simple, sans paramètres. Ne s'en servir que pour un test de plomberie. |

La différence est décisive : `iCustom` appelé sans paramètres charge l'indicateur
avec ses **valeurs par défaut**, pas les tiennes. Avec `EnigmaTester`, tu testerais
autre chose que ce que tu vois sur ton graphique — et autre chose que ce que j'ai
mesuré.

---

## Étape 1 — Installer les fichiers

1. MT4 → **Fichier → Ouvrir le dossier des données**
2. Copier `Enigma_Wyckoff_Pro_V5.mq4` dans `MQL4/Indicators/`
3. Copier `WyckoffTester.mq4` dans `MQL4/Experts/`
4. MT4 → **Outils → Éditeur MetaQuotes** (ou F4)
5. Ouvrir chacun des deux fichiers et **compiler (F7)**
6. Vérifier « 0 error(s) » en bas. S'il y a une erreur, envoie-la moi.
7. Revenir dans MT4 → **Affichage → Navigateur** → clic droit → **Actualiser**

> Le nom par défaut dans l'EA est `Enigma_Wyckoff_Pro_V5`. Il doit correspondre
> **exactement** au nom du fichier compilé, sans extension. Si tu l'as renommé,
> corrige le paramètre `IndicatorName`.

---

## Étape 2 — Télécharger l'historique (à ne pas sauter)

C'est la cause n°1 de backtests aberrants. MT4 ne teste que ce qu'il a en mémoire.

1. **Outils → Centre d'historique** (F2)
2. Dans l'arbre, ouvrir la catégorie contenant **BTCUSD**
3. Double-cliquer sur **Journalier (1440)** → **Télécharger**
4. Répéter pour **H1 (60)** et **M1 (1)** si tu comptes tester en « Every tick »
5. Fermer, puis **redémarrer MT4**

**À vérifier** : ouvre un graphique BTCUSD D1 et remonte vers la gauche (touche
Origine). Note la date la plus ancienne réellement affichée. C'est la limite réelle
de ton test — beaucoup de courtiers ne fournissent que 1 à 3 ans sur les CFD crypto.
Dis-moi ce que tu trouves.

---

## Étape 3 — Trouver les index de buffer (une seule fois)

Les flèches d'achat et de vente vivent dans des « buffers » numérotés. Le code source
indique **0 pour les achats, 1 pour les ventes** — mais autant le vérifier.

1. Attacher `WyckoffTester` à un graphique BTCUSD **D1**
2. Mettre `ModeDiagnostic = true` → il n'enverra **aucun ordre**
3. Onglet **Experts** en bas : il imprime la valeur des 5 buffers à chaque bougie
4. Sur une bougie portant une flèche d'achat, le buffer affichant un **prix** (et non
   « vide ») est `BuyBufferIndex`
5. Remettre `ModeDiagnostic = false`

---

## Étape 4 — Régler le Strategy Tester

**Affichage → Strategy Tester** (Ctrl+R)

| Champ | Valeur | Pourquoi |
|---|---|---|
| Expert Advisor | `WyckoffTester` | |
| Symbole | `BTCUSD` | |
| Période | **D1** | Le journalier est la seule échelle où mes tests montrent quelque chose |
| Modèle | **Prix d'ouverture uniquement** pour commencer | L'EA ne décide qu'à l'ouverture d'une bougie : c'est correct et bien plus rapide |
| Utiliser la date | ✅ coché, la plage la plus large que ton historique permet | |
| Spread | **Courant**, ou la valeur réelle de ton BTCUSD | Un spread à 0 rend le résultat faussement bon |
| Optimisation | ❌ décoché pour le premier test | |

Puis **Propriétés de l'expert** :

- **Onglet Tests** : « Dépôt initial » = ton capital réel, **20**. Un test lancé à
  10 000 ne dit rien de ce que vivra un compte de 20 $ — c'est le dimensionnement
  qui change tout.
- **Onglet Entrées** : régler les paramètres.

### Réglages à utiliser pour reproduire mes mesures

| Paramètre | Valeur |
|---|---|
| `X_RSI_Swing_Bars` | **8** |
| `X_Use_ER_Quality` | **false** |
| `X_Use_CUSUM` | **false** |
| `X_SL_ATR_Multi` | 3.0 |
| `TP_RR` | 1.0 |
| `RisquePctParTrade` | 1.0 |
| `X_Min_Bars_Between` | 5 |

C'est le réglage qui, dans mes tests, réveille le moteur de divergence — et qui
n'existe dans **aucune** des trois versions livrées (V3, V4 et V5 le désactivent
toutes, chacune à sa façon).

Puis **Démarrer**.

---

## Étape 5 — Lire le résultat sans se tromper

Onglets **Résultats**, **Graphique** et **Rapport**.

**Le premier chiffre à regarder n'est pas le profit, c'est le nombre de trades.**
En dessous de 30, aucune conclusion n'est possible, quel que soit le résultat. Mes
mesures ont produit 7 à 10 signaux par actif sur 17 mois : attends-toi à peu.

Ensuite, dans cet ordre :

1. **Trades totaux** — moins de 30 → arrête-toi là, le reste n'est pas interprétable.
2. **Drawdown maximal relatif** — c'est lui qui te ruine, pas le profit.
3. **Facteur de profit** — au-dessus de 1,5 sur peu de trades ne veut rien dire.
4. **Gain moyen / perte moyenne** — doit refléter ton rapport 1:1.
5. **Qualité de modélisation** (en haut du rapport) — en dessous de 90 %, le test est
   approximatif. En mode « Prix d'ouverture uniquement » elle sera basse par
   construction : c'est normal pour un premier passage, pas pour une conclusion.

---

## Les quatre pièges qui rendent un backtest faux

**1. Zéro trade, sans erreur.** Trois causes possibles, dans cet ordre :
- *Période d'essai de l'indicateur expirée.* Une fois expiré, il vide ses buffers
  **sans message d'erreur** : plus aucune flèche, donc plus aucun trade. Le fichier
  V5 expire le **4 septembre 2026**. Dans le Strategy Tester, `TimeCurrent()` renvoie
  la date **simulée** : tester une période antérieure fonctionne normalement.
  Vérifie le compteur de jours affiché sur ton graphique.
- *Mauvais index de buffer* → refais l'étape 3.
- *Capital insuffisant* → voir piège 3.

**2. Historique trop court.** La stratégie a besoin d'environ 160 bougies de marge
avant de pouvoir évaluer une divergence. Sur 300 bougies journalières, une bonne
partie des signaux sortira d'une branche dégradée du code qui ne produit **que des
achats**. Tu le verras tout de suite : 100 % d'achats = tu es dans ce cas.

**3. Le lot minimum.** Avec 20 $ de dépôt et un stop à 3 × ATR, l'EA refusera
probablement chaque trade et l'écrira dans l'onglet **Journal**, avec le capital
qu'il faudrait. Ce n'est pas un bug. Pour mesurer la **stratégie** indépendamment de
ton capital, relance avec un dépôt de 10 000 — mais alors le résultat ne dit plus
rien sur la faisabilité à 20 $. Ce sont deux questions distinctes, ne les mélange pas.

**4. Spread à zéro.** Sur BTCUSD le spread est large et se retranche de chaque trade.
Un test sans spread est systématiquement flatteur.

---

## Ce que j'aimerais que tu me renvoies

Une capture de l'onglet **Rapport** complet, plus :

1. La date la plus ancienne disponible sur ton graphique BTCUSD D1
2. Le nombre de trades total
3. Le contenu de l'onglet **Journal** s'il y a des messages en rouge
4. Le pourcentage d'achats et de ventes (mes tests donnent 79 % d'achats)

Avec ça je te dis si le résultat confirme ou contredit ce que j'ai mesuré — et
surtout s'il est interprétable.

---

## Sécurité

`AutoriserTradesReels` vaut **false** par défaut : sur un graphique en direct, l'EA
n'enverra **aucun ordre** tant que tu ne l'auras pas basculé toi-même. Le Strategy
Tester, lui, trade normalement — un backtest fonctionne donc immédiatement, sans
rien toucher.

Ton terminal est connecté à un compte **réel** avec l'AutoTrading actif. Ce
garde-fou n'est pas décoratif.
