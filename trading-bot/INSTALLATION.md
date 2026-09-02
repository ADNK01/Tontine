# Lancer le backtest sur votre machine — Windows

Cinq minutes, dont quatre d'installation de Node.js. Aucune connaissance de
programmation requise : tout tient en une commande à la fin.

---

## 1. Installer Node.js

Aller sur **https://nodejs.org** → télécharger la version **LTS** → installer en
laissant toutes les options par défaut.

Pour vérifier : ouvrir **PowerShell** (touche Windows, taper « powershell ») et
saisir :

```powershell
node --version
```

Une version qui commence par `v20` ou plus est parfaite. Si la commande n'est pas
reconnue, fermez PowerShell, rouvrez-le, et réessayez.

---

## 2. Récupérer le projet

**Le plus simple** — télécharger l'archive :

https://github.com/ADNK01/Tontine/archive/refs/heads/claude/trading-bot-uv3evp.zip

Décompressez-la. Le dossier qui vous intéresse est **`trading-bot`**, à l'intérieur.
Déplacez-le où vous voulez, par exemple `C:\trading-bot`.

*Si vous avez Git installé, `git clone` fonctionne aussi.*

---

## 3. Ouvrir PowerShell dans le dossier

Dans l'Explorateur, ouvrez le dossier `trading-bot`, puis **Maj + clic droit** dans
la fenêtre → **« Ouvrir la fenêtre PowerShell ici »**.

Ou bien, dans un PowerShell déjà ouvert :

```powershell
cd C:\trading-bot
```

---

## 4. Installer les dépendances

```powershell
npm.cmd install
```

> **Pourquoi `.cmd` ?** Par défaut, Windows interdit l'exécution des scripts
> PowerShell, et `npm`/`npx` en sont. Écrire `npm.cmd` et `npx.cmd` contourne le
> problème sans rien modifier sur votre machine. Si `npm install` fonctionne chez
> vous, gardez-le, c'est équivalent.

Une minute environ. Des avertissements jaunes sont normaux ; seules les lignes
rouges `ERR!` posent problème.

---

## 5. Lancer le backtest

```powershell
npx.cmd tsx tools/backtest.ts BTCUSDT 1d 6
```

Trois arguments : le **symbole**, l'**unité de temps**, le nombre d'**années**.

La commande télécharge l'historique si nécessaire, puis affiche deux tableaux :
le balayage de paramètres, et le test contre des entrées aléatoires.

Autres exemples :

```powershell
npx.cmd tsx tools/backtest.ts ETHUSDT 1d 6
npx.cmd tsx tools/backtest.ts BTCUSDT 4h 3
npx.cmd tsx tools/backtest.ts SOLUSDT 1d 5
```

---

## Lire le résultat

```
swing | signaux | vraieDiv | achats | ventes | W/L  | resolus | reussite | total R
    8 |       7 |        5 |      5 |      2 | 4/0  |       4 |     100% | +4.4

swing | strategie | hasard moy | hasard 5%-95%     | percentile
    8 |    +0.629 |     -0.035 | -0.689 .. +0.499  |     97.8e
```

**Regardez `resolus` avant `total R`.** C'est le nombre de trades réellement
clôturés. En dessous de 30, aucune conclusion n'est possible, même avec un beau
résultat — c'est la règle la plus importante de tout ce document.

**`percentile`** situe la stratégie parmi 400 tirages d'entrées aléatoires soumises
aux mêmes règles de sortie. Au-delà de 95, les entrées apportent quelque chose.
Autour de 50, elles ne valent pas mieux que le hasard.

**`vraieDiv`** compte les signaux issus d'une vraie divergence. Le reste vient d'une
branche dégradée du code qui ne produit que des achats. Si `vraieDiv` est très
inférieur à `signaux`, l'historique est trop court.

---

## Si ça coince

**`npm.ps1 cannot be loaded because running scripts is disabled on this system`**
→ La protection par défaut de Windows. Trois solutions, de la plus simple à la plus
définitive :

1. **Ajouter `.cmd`** : `npm.cmd install`, `npx.cmd tsx ...`. Rien à modifier.
2. **Utiliser l'invite de commandes** plutôt que PowerShell : tapez `cmd` puis
   Entrée dans la même fenêtre, et les commandes sans `.cmd` fonctionnent.
3. **Autoriser les scripts pour votre compte**, une fois pour toutes :
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
   Cela modifie un réglage de sécurité de Windows pour votre session utilisateur :
   les scripts locaux deviennent exécutables, ceux téléchargés doivent être signés.
   C'est le réglage recommandé par Microsoft pour les développeurs, mais si vous
   préférez ne rien changer, la solution 1 suffit.

**`npm n'est pas reconnu`** → Node.js n'est pas installé, ou PowerShell doit être
rouvert.

**`Telechargement impossible` / `HTTP 403`** → Binance est bloqué par votre réseau
ou votre pays. Essayez le miroir :

```powershell
$env:KLINES_BASE_URL="https://data-api.binance.vision"
npx.cmd tsx tools/backtest.ts BTCUSDT 1d 6
```

**`signaux: 0`** → l'historique n'est pas assez long. Augmentez le nombre d'années,
ou passez sur une unité de temps plus grande.

**Autre chose** → copiez le message d'erreur tel quel, il est explicite.

---

## Ce que ce backtest ne dit pas

Il teste la **transcription TypeScript** de la stratégie, pas l'indicateur MT4
compilé. La transcription suit le code source ligne à ligne, mais elle n'a jamais
été confrontée flèche à flèche à l'indicateur réel.

Et rien ici ne modélise les **frais, le spread ni le slippage**. Les résultats sont
donc optimistes par rapport à une exécution réelle.
