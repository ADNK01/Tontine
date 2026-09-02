# Stratégie « SDC Exhaust / Wyckoff » — spécification complète

Document autonome. Il contient tout ce qu'il faut pour implémenter la stratégie
sans accès au code d'origine. Transcrit depuis le source MQL4
`Enigma_Wyckoff_Pro_V3.mq4` (en-tête interne `Sdv_Wyckoff.mq4`,
« SDC EXHAUST 3.02 — QUANTUM ENGINE », version 3.03).

Ce n'est pas une interprétation : chaque règle ci-dessous vient du code source.

---

## 1. Idée en une phrase

On cherche un **mouvement qui s'épuise** : une série de plus-bas consécutifs dont
la pression vendeuse faiblit (divergence), suivie d'une bougie qui **reprend plus
de la moitié du terrain perdu**. Symétrique à la vente.

---

## 2. Données nécessaires

| Élément | Valeur |
|---|---|
| Unité de temps | fonctionne sur toutes ; testé ici en M5 |
| Historique minimum | **≈ 300 bougies**, 500+ recommandé |
| Champs requis | ouverture, plus haut, plus bas, clôture, **volume** |

L'historique est contraignant : la recherche de pivots exige 50 bougies de chaque
côté, et la recherche de divergence remonte 100 bougies au-delà. Sur une fenêtre
trop courte la stratégie dégénère (voir §10, piège n°1).

---

## 3. Conventions

Indexation **à la MetaTrader** : l'indice `0` est la bougie en cours de formation,
`1` la dernière clôturée, `2` la précédente, etc. **L'indice augmente vers le
passé.** Toutes les règles ci-dessous utilisent cette convention.

**Règle anti-repeint absolue** : aucune décision n'utilise la bougie `0`. Tout se
calcule sur des bougies closes, à partir de l'indice `1`.

### Indicateurs

**ATR(période, i)** — moyenne **simple** des True Range sur `période` bougies à
partir de `i` (c'est la définition de MetaTrader 4, pas le lissage de Wilder) :

```
TR(k)  = max( High[k] - Low[k],
              |High[k] - Close[k+1]|,
              |Low[k]  - Close[k+1]| )
ATR(p, i) = moyenne des TR(k) pour k de i à i+p-1
```

**RSI(période, i)** — RSI de Wilder classique sur les clôtures.

---

## 4. Étape 1 — Cache des pivots de prix

Pour chaque bougie `idx`, avec `sw = 50` (`RSI_Swing_Bars`) :

- **Creux** : `Low[idx]` est un creux si `Low[idx+j] > Low[idx]` pour tout
  `j` de 1 à 50 (passé) **et** `Low[idx-j] >= Low[idx]` pour tout `j` de 1 à 50 (futur).
- **Sommet** : `High[idx]` est un sommet si `High[idx+j] < High[idx]` pour tout
  `j` de 1 à 50 **et** `High[idx-j] <= High[idx]` pour tout `j` de 1 à 50.

Un pivot n'est donc confirmé que 50 bougies après son apparition. C'est ce qui
rend l'indicateur non repeignant, et ce qui explique le besoin d'historique.

---

## 5. Étape 2 — Divergence (le filtre principal)

Ancrée sur une bougie `bar`. On cherche une **paire de pivots** `(p1, p2)` avec
`p1` le plus récent, `p2` le plus ancien.

Contraintes de recherche :
- `p1` part de `bar` et va jusqu'à `bar + 100 - 5`
- `p2` part de `p1 + 5` (`Div_Min_Gap`) et va jusqu'à `bar + 100` (`Div_Lookback`)
- les deux doivent être des pivots confirmés (§4)

Soit `atr = ATR(14, bar)` et `écart_min = atr × 1.0` (`Price_Min_Diff_ATR`).

### 5a. Divergence quantique (achat)

Condition de prix : `Low[p1] < Low[p2]` **et** `Low[p2] - Low[p1] >= écart_min`
(le prix fait un plus-bas plus bas).

Trois confirmations, il en faut **au moins 1** (`Min_Quantum_Confirms`) :

**Énergie cinétique** — l'effort vendeur s'épuise. Sur `lookback = 15` bougies à
partir du pivot :
```
énergie(p, sens=achat) = Σ  Volume[i] × ((Open[i] - Close[i]) / point)²
                         pour les bougies baissières uniquement (Close[i] < Open[i])
                         i de p à p+14
```
Confirmé si `énergie(p2) > 0` et `énergie(p1) / énergie(p2) < 0.5` (`KE_Decay_Threshold`).
Traduction : il a fallu **deux fois moins d'effort** pour faire ce nouveau plus-bas.

**Delta de flux d'ordres** — l'absorption. Sur les mêmes 15 bougies :
```
delta(p) = Σ  [ Volume[i] × (Close[i] - Low[i]) / (High[i] - Low[i])
              - Volume[i] × (High[i] - Close[i]) / (High[i] - Low[i]) ]
           (bougies de range nul ignorées)
```
Confirmé si `delta(p1) > delta(p2)` : moins de vente au nouveau plus-bas.

**Vélocité de phase** — la pente du RSI :
```
vélocité(p) = RSI(7, p) - RSI(7, p+5)
```
Confirmé si `vélocité(p1) > vélocité(p2)`.

### 5b. Divergence cachée (achat)

Condition de prix : `Low[p1] > Low[p2]` **et** `Low[p1] - Low[p2] >= écart_min`
(le prix fait un plus-bas **plus haut** — retracement dans une tendance).

Confirmé si `RSI(7, p1) < RSI(7, p2)` **et** `RSI(7, p2) - RSI(7, p1) >= 2.0`
(`Min_Osc_Diff`).

### 5c. Côté vente

Strictement symétrique, sur `High[]` et les pivots sommets :
- quantique : `High[p1] > High[p2]`, écart ≥ `écart_min`, énergie mesurée sur les
  bougies **haussières**, `delta(p1) < delta(p2)`, `vélocité(p1) < vélocité(p2)` ;
- cachée : `High[p1] < High[p2]`, écart ≥ `écart_min`, `RSI(p1) > RSI(p2)` avec
  un écart ≥ 2.0.

**Sortie de l'étape** : dès qu'une paire valide (quantique **ou** cachée) est
trouvée, on s'arrête et on retient le sens. Le sens **achat est testé en premier**.

---

## 6. Étape 3 — Déclencheur : épuisement de mouvement

Testé sur une bougie `b`. Soit `atr = ATR(14, b)`.

```
amplitude_min = atr × 0.3   (Sweep_ATR_Min)
amplitude_max = atr × 5.0   (Sweep_ATR_Max)
```

**Signal d'ACHAT** :
1. Partant de `b+1`, compter la série de **plus-bas consécutifs** :
   tant que `Low[idx] < Low[idx+1]`, avancer vers le passé (max 20 bougies,
   `Range_Lookback`).
2. Il faut **au moins 3 bougies** dans la série (`Range_Min_Age`).
3. Soit `runLow` le plus bas de la série et `runTop` le plus haut.
   `amplitude = runTop - runLow` doit être comprise entre `amplitude_min` et
   `amplitude_max`.
4. **Déclenchement** si `Close[b] > runLow + amplitude/2` **et** `Close[b] > Open[b]`.

**Signal de VENTE** : symétrique — série de plus-hauts consécutifs
(`High[idx] > High[idx+1]`), puis `Close[b] < runHigh - amplitude/2` et
`Close[b] < Open[b]`.

---

## 7. Étape 4 — Appariement divergence → déclencheur

C'est le point le plus souvent mal compris.

La divergence est ancrée sur `bar`. On cherche ensuite le déclencheur sur
**`bar`, puis `bar-1`, `bar-2`… jusqu'à `bar-5`** (`Filter_Ready_Window`),
c'est-à-dire sur des bougies **plus récentes** que l'ancre.

- Le déclencheur doit être **dans le même sens** que la divergence.
- Le premier trouvé gagne ; la flèche se pose sur **cette** bougie, pas sur l'ancre.
- Si aucun déclencheur dans la fenêtre : rien.

Formulé autrement : *la divergence arme, le déclencheur tire, dans les 5 bougies.*

---

## 8. Étape 5 — Espacement

Un signal est rejeté si un signal précédent existe à moins de **5 bougies**
(`Min_Bars_Between`), en regardant jusqu'à 150 bougies en arrière (`Scan_Window`).

Sans cette règle, un même retournement produit une grappe de signaux.

---

## 9. Étape 6 — Entrée, stop, objectifs

```
entrée = Close[bougie_de_déclenchement]
atr    = ATR(14, bougie_de_déclenchement)

ACHAT :  stop = Low[bougie]  - atr × 3.0
VENTE :  stop = High[bougie] + atr × 3.0

risque = |entrée - stop|

TP1 = entrée ± risque × 1.0
TP2 = entrée ± risque × 1.618
TP3 = entrée ± risque × 2.618
```

**Attention** : le stop part de **l'extrême de la bougie**, pas du prix d'entrée.
Le risque réel est donc `|Close - Low| + 3×ATR`, sensiblement plus large que
`3×ATR`. C'est une erreur classique de réimplémentation.

---

## 10. Pièges à connaître

**1. Historique insuffisant = le filtre laisse passer.**
Quand `bar + 160 >= nombre_de_bougies`, ou que l'ATR est indisponible, ou qu'il
n'y a pas assez de pivots en cache, le code d'origine **valide** la divergence au
lieu de la rejeter. Comme le sens achat est testé en premier, une fenêtre trop
courte produit **uniquement des signaux d'achat**. Ce n'est pas un bug de
transcription, c'est le comportement de la source. À reproduire pour être fidèle,
mais à connaître avant d'interpréter un résultat.

**2. `Volume` signifie volume de TICKS chez MetaTrader**, pas volume échangé.
L'énergie cinétique et le delta en dépendent directement. Implémenter la stratégie
sur des données à volume réel (données d'échange crypto) donne des mesures
différentes de celles de MetaTrader. Ce n'est ni mieux ni pire, c'est autre chose.

**3. Filtres désactivés par défaut.** Le code contient beaucoup d'autres filtres,
tous à `false` dans les réglages d'origine : canal de régression (SDC), squeeze,
ratio d'accumulation, croisement CCI, bougie de retournement, RSI, ADX, **HTF**,
EMA, volume, session, spread. Ne pas les implémenter tant qu'ils ne sont pas
activés — ils ne participent à aucun signal.

**4. Architecture « filter-first ».** Si un jour vous activez ces filtres, sachez
qu'ils ne fonctionnent pas tous pareil :
- filtres de *readiness* (SDC, ratio, CCI, RSI, ADX, HTF) : il suffit qu'ils aient
  été satisfaits **au moins une fois** dans les 5 bougies précédant le déclencheur ;
- filtres d'*exécution* (EMA, volume, session, spread) : ils doivent passer **sur
  la bougie de signal elle-même**.

**5. Période d'essai.** L'indicateur d'origine embarque une date d'expiration
(31 jours à partir du 4 août 2026). Une fois expiré, il vide ses buffers **sans
message d'erreur** : un robot qui le lit ne voit plus aucun signal. Une
réimplémentation à partir de cette spécification n'a évidemment pas cette limite.

---

## 11. Paramètres par défaut

| Paramètre | Valeur | Rôle |
|---|---|---|
| `ATR_Period` | 14 | ATR, moyenne simple des TR |
| `Range_Lookback` | 20 | Longueur max de la série d'épuisement |
| `Range_Min_Age` | 3 | Longueur min de la série |
| `Sweep_ATR_Min` | 0.3 | Amplitude min de la série (× ATR) |
| `Sweep_ATR_Max` | 5.0 | Amplitude max de la série (× ATR) |
| `Filter_Ready_Window` | 5 | Bougies entre l'ancre et le déclencheur |
| `Use_Quantum_Div` | true | Divergence quantique active |
| `Use_Kinetic_Energy` | true | Confirmation 1 |
| `KE_Decay_Threshold` | 0.5 | Ratio d'énergie max |
| `Use_OrderFlow_Delta` | true | Confirmation 2 |
| `Use_Phase_Velocity` | true | Confirmation 3 |
| `Quantum_Lookback` | 15 | Bougies mesurées depuis le pivot |
| `Min_Quantum_Confirms` | 1 | Confirmations nécessaires |
| `Use_Hidden_Div` | true | Divergence cachée active |
| `Div_RSI_Period` | 7 | RSI de la divergence |
| `Min_Osc_Diff` | 2.0 | Écart RSI min (divergence cachée) |
| `Div_Lookback` | 100 | Recherche du pivot ancien |
| `Div_Min_Gap` | 5 | Écart min entre les deux pivots |
| `Price_Min_Diff_ATR` | 1.0 | Écart de prix min entre pivots (× ATR) |
| `RSI_Swing_Bars` | 50 | Bougies de chaque côté d'un pivot |
| `SL_ATR_Multi` | 3.0 | Stop depuis l'extrême (× ATR) |
| `TP1_RR` / `TP2_RR` / `TP3_RR` | 1.0 / 1.618 / 2.618 | Objectifs |
| `Min_Bars_Between` | 5 | Espacement des signaux |
| `Scan_Window` | 150 | Portée de la recherche du signal précédent |

---

## 12. Pseudo-code

```
pour bar de la plus ancienne bougie exploitable jusqu'à 1 :

    si une flèche existe déjà sur bar : passer

    # --- divergence ---
    sens = 0
    si divergence_haussière(bar) : sens = +1
    sinon si divergence_baissière(bar) : sens = -1
    sinon : passer

    # --- déclencheur dans les 5 bougies suivantes ---
    déclencheur = aucun
    pour k de 0 à 5 :
        b = bar - k
        d = épuisement(b)
        si d existe et d.sens == sens :
            déclencheur = b ; arrêter
    si déclencheur == aucun : passer

    # --- espacement ---
    si un signal existe à moins de 5 bougies avant déclencheur : passer

    # --- placement ---
    entrée = Close[déclencheur]
    atr    = ATR(14, déclencheur)
    stop   = (sens > 0) ? Low[déclencheur] - 3×atr
                        : High[déclencheur] + 3×atr
    risque = |entrée - stop|
    TP1/TP2/TP3 = entrée ± risque × (1.0 / 1.618 / 2.618)
    poser le signal sur déclencheur
```

---

## 13. Vérification sur données réelles

Transcription exécutée sur des bougies BTCUSDT réelles. « Vraie divergence » =
le moteur a validé une paire de pivots ; « branche permissive » = §10, piège n°1.

| Données | Signaux | dont vraie divergence | Sens |
|---|---|---|---|
| 500 jours (avril 2025 → sept. 2026) | 3 à 5 selon la version | 0 à 2 | **100 % achats** |
| 500 heures (20 jours) | 1 à 2 | 0 | **100 % achats** |
| 500 bougies M5 (41 h) | 2 | 0 | **100 % achats** |

**Aucune vente n'a jamais été produite**, sur aucune échelle, aucune version,
17 mois de données. C'est une conséquence directe du piège n°1 : la branche
permissive teste le sens haussier en premier et le retient.

**Le moteur de divergence ne se déclenche presque jamais.** Avec
`RSI_Swing_Bars = 50`, un pivot doit être l'extrême de 101 bougies : on en compte
3 creux et 4 sommets sur 500 bougies journalières. Apparier deux de ces pivots dans
une fenêtre de 100 bougies est arithmétiquement quasi impossible. Sur 17 mois, la
divergence a validé **2 signaux** — et uniquement dans la configuration V3.

Conclusion opérationnelle : telle qu'elle est livrée, cette stratégie se comporte
comme un **détecteur d'épuisement uniquement à l'achat**, et non comme le moteur de
divergence annoncé. À implémenter en le sachant.

Le détail par version est dans `mt4/NOTES_VERSIONS.md`.

## 14. Gestion du risque — indépendante de la stratégie

La stratégie dit *quand* et *où*. Elle ne dit pas *combien*. La taille se calcule :

```
risque_en_devise = capital × pourcentage_risqué_par_trade
perte_par_unité  = |entrée - stop| × taille_du_contrat
taille           = risque_en_devise / perte_par_unité
```

Si la taille obtenue est sous la taille minimale du courtier, **le trade ne se
prend pas**. Ne jamais arrondir vers le haut : c'est la façon la plus courante de
transformer un risque de 1 % en risque de 20 %.

Ordre de grandeur mesuré sur BTCUSD : un stop à 3 × ATR sur M5, au lot minimum de
0.01 BTC, coûte plusieurs dollars. Sur un compte de 20 $, cela représente des
dizaines de pourcents par trade — infinançable. Le calcul doit être refait pour
chaque instrument et chaque courtier.
