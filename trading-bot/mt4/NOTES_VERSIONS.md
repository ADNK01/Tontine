# V3, V4, V5 — ce qui change réellement

## Les trois fichiers ont le même algorithme

Comparaison ligne à ligne des trois sources (1778 lignes chacune) :
**aucune différence de logique**. Pas une fonction modifiée, pas une condition
changée. Seuls diffèrent quatre réglages par défaut, le numéro de version et le
libellé du tableau de bord.

| Paramètre | V3 | V4 | V5 |
|---|---|---|---|
| `Div_Lookback` | 100 | 50 | 100 |
| `Reversal_Bars` | 15 | 50 | 50 |
| `Use_ER_Quality` | false | **true** | false |
| `ER_Min_Quality` | 0.2 | 0.3 | 0.3 |
| `Use_CUSUM` | false | **true** | **true** |
| `Scan_Window` | 150 | 5000 | 5000 |
| `RSI_Swing_Bars` | 50 | **5** | 50 |

Autrement dit : passer de V3 à V5 revient à cocher deux cases dans la fenêtre de
propriétés. Rien n'oblige à recharger un fichier.

## Ce que ça donne sur des données réelles

Transcription exécutée sur des bougies BTCUSDT réelles, trois échelles de temps.
« Vraie divergence » signifie que le moteur de divergence a réellement validé une
paire de pivots ; « branche permissive » signifie que le code a laissé passer faute
d'historique suffisant (voir §10 de `STRATEGIE_WYCKOFF.md`).

### Journalier — 500 jours (21 avril 2025 → 2 septembre 2026)

| Version | Pivots trouvés | Signaux | dont vraie divergence |
|---|---|---|---|
| V3 | 3 creux, 4 sommets | 5 | **2** |
| V4 | 27 creux, 26 sommets | 1 | 0 |
| V5 | 3 creux, 4 sommets | 3 | **0** |

### H1 — 500 heures (12 août → 2 septembre 2026)

| Version | Pivots | Signaux | dont vraie divergence |
|---|---|---|---|
| V3 | 2 creux, 3 sommets | 2 | 0 |
| V4 | 28 creux, 36 sommets | 1 | 0 |
| V5 | 2 creux, 3 sommets | 2 | 0 |

### M5 — 500 bougies (~41 h)

Les trois versions : 2 signaux, **0** par vraie divergence.

## Trois constats

**1. Tous les signaux sont des ACHATS.** Sur les trois échelles, les trois versions,
17 mois de données : pas une seule vente. Ce n'est pas le marché, c'est le code. La
branche permissive teste le sens haussier en premier et le retient ; chaque fois
qu'elle s'active, le signal est un achat.

**2. Le moteur de divergence ne se déclenche presque jamais.** Avec
`RSI_Swing_Bars = 50`, un pivot doit être l'extrême de 101 bougies : on en trouve
**3 creux et 4 sommets sur 500 bougies**. Il faut ensuite en apparier deux, séparés
d'au moins 5 bougies, dans une fenêtre de 100 — et que les deux passent le filtre de
qualité. C'est arithmétiquement presque impossible. La quasi-totalité des signaux
sort donc de la branche permissive, pas du « QUANTUM ENGINE ».

**3. Le CUSUM de V5 supprime les seuls vrais signaux.** V3 et V5 voient exactement
les mêmes pivots. V3 valide 2 divergences réelles en 17 mois ; V5, avec
`Use_CUSUM = true`, en valide **zéro**. La V5 n'est donc pas une V3 améliorée : sur
ces données, elle désactive de fait la couche qui donne son nom à l'indicateur.

## Conséquence pratique

Si l'objectif est que le moteur de divergence serve à quelque chose :
- **V3** est la seule des trois où il produit quoi que ce soit ;
- même là, 2 signaux en 17 mois ne permettent aucune conclusion statistique ;
- abaisser `RSI_Swing_Bars` (V4 le met à 5) multiplie les pivots par neuf, mais V4
  annule le gain avec ses filtres supplémentaires. Un réglage intermédiaire —
  `RSI_Swing_Bars` bas **sans** `Use_ER_Quality` ni `Use_CUSUM` — n'existe dans
  aucune des trois versions livrées, et reste à tester.

Ces chiffres viennent de la transcription TypeScript (`src/wyckoff.ts`), pas de
l'indicateur lui-même. Ils décrivent la logique du code source. Pour mesurer
l'indicateur réel, utiliser `mt4/EnigmaTester.mq4` dans le Strategy Tester.

---

# Test du réglage absent des trois versions

`RSI_Swing_Bars` bas, **sans** `Use_ER_Quality` **ni** `Use_CUSUM` — la combinaison
qu'aucune des trois versions livrées ne propose.

Sortie simulée bougie par bougie : stop ou objectif, stop prioritaire si les deux
sont touchés dans la même bougie, durée de vie maximale 50 bougies. Objectif TP1
(1R) sauf mention contraire. Outil : `tools/sweep.ts`.

## 1. Le moteur de divergence se réveille

C'était l'objectif du test, et il est atteint.

| `RSI_Swing_Bars` | Signaux par vraie divergence (BTC journalier) |
|---|---|
| 50 (V3/V5) | 2 |
| 20 | 6 |
| 12 | 5 |
| 8 | 5 |
| 5 | 6 |
| 3 | 4 |

Abaisser le paramètre multiplie les pivots disponibles, donc les paires
appariables. La couche de divergence cesse d'être décorative.

## 2. Des ventes apparaissent — mais seulement en journalier

| Échelle | Ventes produites |
|---|---|
| Journalier | 2 à 3 sur 7 à 9 signaux |
| H1 | 0 à 1 |
| M5 | **0, à tous les réglages** |

Le biais acheteur se réduit sans disparaître, et il reste total en M5.

## 3. Le résultat se sépare nettement par échelle de temps

BTCUSDT, toutes valeurs de `RSI_Swing_Bars` testées :

| Échelle | Total R (min → max) |
|---|---|
| Journalier | **+1.50 → +4.40** (positif partout) |
| H1 | −0.85 → +1.53 (autour de zéro) |
| M5 | **−2.00 → −4.63** (négatif partout) |

Ce n'est pas une cellule isolée : le signe est constant sur les six réglages de
chaque échelle. C'est l'observation la plus solide de tout ce test.

## 4. Contrôles de robustesse

**Second actif.** ETHUSDT journalier, mêmes réglages : positif partout également
(+2.83 à +3.83 R). Le résultat journalier n'est donc pas propre à BTC.

**Direction du marché.** Sur la période (21 avril 2025 → 2 septembre 2026) :
- BTC **−11.7 %** (87 516 → 77 304)
- ETH **+51.5 %** (1 580 → 2 394)

Une stratégie quasi exclusivement acheteuse qui gagne sur BTC pendant que BTC perd
11.7 % n'est pas expliquée par la tendance. Le résultat ETH, lui, est confondu avec
un marché en hausse de 51 % : il ne prouve rien à lui seul.

**Objectif de sortie.** `RSI_Swing_Bars = 8`, cibles 1R / 2R / 3R :
positif dans les six cas, et croissant avec la cible. L'avantage ne tient donc pas
à une valeur d'objectif particulière.

## 5. Pourquoi il ne faut rien conclure

| Actif | Cible | Signaux | Trades réellement clôturés |
|---|---|---|---|
| BTC | 1R | 7 | **4** |
| BTC | 2R | 7 | **1** |
| BTC | 3R | 7 | **0** |
| ETH | 1R | 8 | 5 |
| ETH | 3R | 8 | 3 |

Le « 100 % de réussite » de BTC à 1R repose sur **quatre trades**. À 3R, aucun
trade ne se clôture en 50 bougies : le +4.96 R affiché n'est que la valorisation de
positions encore ouvertes, pas un résultat.

Par ailleurs, ces chiffres sortent d'un **balayage de paramètres sur un jeu de
données unique**. Choisir `RSI_Swing_Bars = 8` parce que c'est la meilleure cellule
du tableau, c'est du sur-ajustement, pas une découverte. La valeur de ce test tient
aux **régularités de signe** (journalier positif, M5 négatif, sur tous les
réglages), pas au classement des cellules.

## 6. Ce qui en ressort d'utilisable

1. **Cette stratégie n'est pas faite pour le M5.** Négative à tous les réglages, et
   sans une seule vente. C'est l'échelle du graphique actuel — c'est donc le point
   le plus actionnable de tout ce document.
2. **Le journalier mérite un vrai test**, sur plusieurs années et plusieurs actifs,
   avec frais et spread. Pas sur 500 bougies.
3. **Désactiver ER et CUSUM et baisser `RSI_Swing_Bars`** est ce qui rend le moteur
   de divergence fonctionnel. Aucune des trois versions livrées ne le fait.

---

# Test sur plusieurs années — ce qui a été possible, et ce qui ne l'a pas été

## Le blocage, dit franchement

Aucune source d'historique long n'est joignable depuis cet environnement. Stooq,
Yahoo Finance, CoinGecko et CryptoCompare répondent tous **403 (refus de politique
réseau)** au niveau de la passerelle. Le connecteur de marché disponible plafonne à
500 bougies par appel et ne permet pas de remonter plus loin dans le passé.

**500 bougies journalières = 17 mois.** Un vrai test journalier pluriannuel n'a donc
pas pu être exécuté ici. Deux substituts ont été utilisés, chacun avec ses limites,
et aucun ne remplace ce qui manque.

## Substitut 1 — hebdomadaire, 9 ans : inexploitable

BTC hebdomadaire, 473 semaines (août 2017 → août 2026) :

| `RSI_Swing_Bars` | 3 | 5 | 8 | 12 | 20 | 50 |
|---|---|---|---|---|---|---|
| Signaux en 9 ans | 3 | 3 | 3 | 3 | 2 | **0** |
| Trades clôturés | 1 | 1 | 1 | 0 | 0 | 0 |

**Trois signaux en neuf ans.** La stratégie est trop lente pour cette échelle : rien
n'en sort, et rien ne peut en être conclu. Ce n'est pas un mauvais résultat, c'est
une absence de résultat.

## Substitut 2 — journalier, 5 actifs, 17 mois

`RSI_Swing_Bars = 8`, sans ER ni CUSUM, cible 1R, sortie à 50 bougies max.
Période commune : avril 2025 → septembre 2026.

| Actif | Marché sur la période | Signaux | Achats/Ventes | W/L | Total R |
|---|---|---|---|---|---|
| BTCUSDT | −11.7 % | 7 | 5/2 | 4/0 | +4.40 |
| ETHUSDT | +51.5 % | 8 | 7/1 | 4/1 | +3.83 |
| SOLUSDT | −27.1 % | 10 | 8/2 | 5/1 | +3.53 |
| BNBUSDT | +15.1 % | 8 | 5/3 | 3/3 | +0.28 |
| XRPUSDT | −35.6 % | 10 | 9/1 | 5/1 | +3.20 |
| **Total** | | **43** | 34/9 | **21/6** | **+15.24** |

Réussite globale 77.8 %, espérance **+0.354 R par signal**. À `RSI_Swing_Bars = 5` :
41 signaux, 20/3, **+17.62 R**, espérance +0.430 R. Positif sur les cinq actifs dans
les deux réglages.

Trois des cinq marchés ont **baissé** sur la période, alors que la stratégie est
acheteuse à 79 %. La tendance n'explique donc pas le résultat.

## Le contrôle qui compte : entrées aléatoires

Un taux de réussite de 78 % à un rapport 1:1 est une affirmation forte. Elle a été
testée contre le hasard : 400 tirages d'entrées aléatoires, même nombre d'entrées,
même répartition achats/ventes, **exactement les mêmes règles de sortie**
(`tools/nulltest.ts`).

| Actif | Espérance stratégie | Espérance hasard | Hasard 5 %–95 % | Percentile |
|---|---|---|---|---|
| BTCUSDT | **+0.629** | −0.020 | −0.570 … +0.568 | **98e** |
| ETHUSDT | **+0.479** | −0.054 | −0.592 … +0.447 | **96e** |
| SOLUSDT | **+0.353** | −0.017 | −0.418 … +0.443 | 91e |
| BNBUSDT | +0.035 | +0.078 | −0.379 … +0.500 | 43e |
| XRPUSDT | **+0.320** | −0.175 | −0.565 … +0.299 | **96e** |

Deux enseignements :

1. **Les règles de sortie seules n'ont aucun avantage** : le hasard tourne autour de
   zéro (−0.175 à +0.078). Le test est donc valide — il mesure bien les entrées.
2. **Les entrées portent une information** sur 4 actifs sur 5, au-delà du 90e
   percentile du hasard. Sur BNB, aucun avantage (43e percentile).

## Pourquoi cela ne suffit toujours pas

**Une seule fenêtre temporelle.** Les cinq actifs couvrent les *mêmes* 17 mois, et
ce sont cinq crypto-actifs fortement corrélés. Ce n'est pas cinq observations
indépendantes : c'est beaucoup plus proche d'**une seule**. C'est la faiblesse
principale, et le test pluriannuel qui la corrigerait est précisément celui que
l'environnement n'a pas permis.

**27 trades réellement clôturés.** Le reste est marqué au marché à 50 bougies.

**Ni frais, ni spread, ni slippage.** Sur un CFD BTCUSD le spread est loin d'être
négligeable, et il se retranche de chaque trade.

## Ce qui reste vrai, tous tests confondus

1. La stratégie est **négative en M5** à tous les réglages, sans une seule vente.
2. Elle est **inexploitable en hebdomadaire** : 3 signaux en 9 ans.
3. En **journalier**, elle bat le hasard sur 4 actifs sur 5 — sur une seule fenêtre
   de 17 mois, avec 27 trades clôturés, hors frais. C'est un résultat encourageant,
   ce n'est pas une preuve, et cela ne justifie aucune mise en jeu d'argent réel.

Le test qui trancherait : plusieurs années de journalier, sur des actifs non
corrélés, frais inclus. Il demande une source de données que cet environnement ne
peut pas atteindre — mais que le Strategy Tester de MetaTrader, lui, possède
localement.
