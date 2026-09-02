# Ce que la lecture du code source a appris

Source lu : `Enigma_Wyckoff_Pro_V3.mq4`, en-tete interne `Sdv_Wyckoff.mq4` /
"SDC EXHAUST 3.02 (QUANTUM ENGINE)", version 3.03.

**Ce n'est pas le code de "Enigma Cipher S v1.01 (FF)"** — celui charge sur le
graphique BTCUSD M5. C'est un indicateur different du meme auteur, avec une liste
de parametres qui ne correspond pas a celle de la boite de dialogue :

| Enigma Cipher S (captures) | Sdv_Wyckoff (source lue) |
|---|---|
| `Momentum_Bars`, `Bull_Context_Min`, `Bull_Reversal_Min` | `Range_Lookback`, `Range_Min_Age`, `Sweep_ATR_Min/Max` |
| `Min_Body_Efficiency`, `Min_Range_ATR` | `SDC_*`, `Ratio_*`, `CCI_*`, `Quantum_Div_*` |
| `HTF_Min_Pressure` | pas de seuil de pression HTF |
| `Filter_Ready_Window` | `Filter_Ready_Window` (seul parametre commun) |

La reconstruction TypeScript vise l'autre indicateur. Mais l'architecture est
manifestement partagee, et trois questions ouvertes trouvent ici une reponse
sourcee plutot que devinee.

## 1. `Filter_Ready_Window` : ni delai de recharge, ni fenetre d'armement

C'est une **fenetre de tolerance par filtre**. Chaque filtre de "readiness" est
teste sur les `Filter_Ready_Window` bougies **precedant** la bougie de declenchement,
et il suffit qu'il ait ete satisfait **une seule fois** dans cette fenetre :

```
for(int w=0; w<=maxW2; w++)
   if(CheckSDC(triggerBar+w, sig)) { sdcOk = true; break; }
if(!sdcOk) return 0;
```

Les filtres d'execution (EMA, volume, session, spread), eux, doivent passer **sur la
bougie de signal elle-meme**. D'ou le nom "FILTER-FIRST ARCHITECTURE".

Mes deux lectures precedentes (`cooldown` et `armed`) sont donc fausses toutes les deux.

## 2. L'espacement des fleches est un parametre distinct

`Min_Bars_Between = 5` : deux signaux ne peuvent pas etre separes de moins de 5
bougies. C'est ce parametre, et non `Filter_Ready_Window`, qui empeche les grappes
de fleches consecutives.

## 3. Le filtre HTF a une porte de secours

`CheckHTF()` accepte le signal par **deux chemins** :

1. **Biais** : la bougie HTF cloturee va dans le sens du trade (`htfC > htfO` pour un
   achat) ET son corps fait au moins 35 % de son range.
2. **Spring / Upthrust** : la bougie HTF a balaye sous le plus bas des
   `Range_Lookback` bougies HTF precedentes, d'une amplitude comprise entre
   `Sweep_ATR_Min` et `Sweep_ATR_Max` x ATR HTF, puis a referme au-dessus.

C'est cette seconde porte qui explique l'observation qui bloquait tout : une fleche
d'ACHAT peut apparaitre alors que la H1 est **baissiere**. Elle ne passe pas par le
biais, elle passe par le spring.

Le filtre lit bien la derniere bougie HTF **cloturee** (`if(hs==0) hs=1`), ce que le
tableau de bord annonce et ce que la reconstruction faisait deja correctement.

## 4. Le declencheur, pour reference

`DetectWyckoff()` — un epuisement de mouvement, pas un motif de pression :

- **Achat** : une serie d'au moins `Range_Min_Age` plus-bas consecutifs, d'une
  amplitude comprise entre `Sweep_ATR_Min` et `Sweep_ATR_Max` x ATR, puis une bougie
  qui **cloture au-dessus du milieu de la serie** et en hausse.
- **Vente** : symetrique sur une serie de plus-hauts.

## 5. Piege de backtest : la periode d'essai

```
#define TRIAL_DAYS  31
datetime TRIAL_START = D'2026.08.04';
```

Expiration le **4 septembre 2026**. Une fois expire, `OnCalculate` remplit tous les
buffers de `EMPTY_VALUE` et sort. Aucune erreur, aucune alerte a un EA : les fleches
disparaissent simplement. Un backtest lance apres cette date rend zero trade.

Dans le Strategy Tester, `TimeCurrent()` renvoie la date **simulee** : tester une
periode anterieure au 4 septembre 2026 fonctionne normalement.

L'indicateur du graphique, "Enigma Cipher S v1.01", affiche un compteur different
(356 jours) : c'est un build distinct, avec sa propre date.
