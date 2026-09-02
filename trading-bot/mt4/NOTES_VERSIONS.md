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
