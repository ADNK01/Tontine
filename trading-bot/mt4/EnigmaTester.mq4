//+------------------------------------------------------------------+
//|  EnigmaTester.mq4                                                |
//|                                                                  |
//|  EA MINIMAL pour MetaTrader 4.                                   |
//|  Il ne decide RIEN : il lit les fleches d'un indicateur          |
//|  (buffers) et ouvre la position correspondante, avec une taille  |
//|  calculee depuis le risque. But unique : permettre au Strategy   |
//|  Tester d'evaluer la logique de l'indicateur.                    |
//|                                                                  |
//|  Portage MQL4 de la version MQL5, avec corrections :             |
//|   - securite : refuse de trader en reel sans autorisation        |
//|     explicite (le Strategy Tester, lui, trade toujours)          |
//|   - respect du STOPLEVEL du broker                               |
//|   - repli OrderModify si le broker refuse SL/TP a l'ouverture    |
//|   - slippage configurable (indispensable sur BTCUSD)             |
//|   - mode diagnostic pour TROUVER les index de buffer             |
//|                                                                  |
//|  LIRE LES NOTES EN BAS DU FICHIER AVANT UTILISATION.             |
//+------------------------------------------------------------------+
#property strict
#property description "Lit les fleches d'un indicateur et ouvre la position correspondante."

//--- Nom exact du fichier indicateur, SANS extension.
//    Dans un sous-dossier : "MonDossier\\Enigma Cipher S"
input string IndicatorName        = "Enigma Cipher S";

//--- Index des buffers contenant les fleches (voir NOTE 1 et ModeDiagnostic)
input int    BuyBufferIndex       = 0;
input int    SellBufferIndex      = 1;

//--- Gestion du risque
input int    ATR_Period           = 14;
input double SL_ATR_Multi         = 1.8;    // SL = ATR x ce coefficient
input double TP_RR                = 3.0;    // TP = SL x ce coefficient (1.0 / 2.0 / 3.0)
input double RisquePctParTrade    = 1.0;    // % du capital risque par trade

//--- Securites
input bool   ModeDiagnostic       = false;  // Affiche les buffers a chaque bougie, ne trade pas
input bool   AutoriserTradesReels = false;  // OBLIGATOIRE pour trader hors Strategy Tester
input double SpreadMaxPoints      = 0;      // 0 = pas de limite
input int    Slippage             = 50;     // en points — large sur BTCUSD
input bool   UnePositionMax       = true;
input int    MagicNumber          = 990001;

datetime g_derniereBougie = 0;
bool     g_avertiUneFois  = false;

//+------------------------------------------------------------------+
int OnInit()
  {
   //--- verification que l'indicateur repond
   double test = iCustom(NULL, 0, IndicatorName, BuyBufferIndex, 1);
   if(GetLastError() == ERR_INDICATOR_CANNOT_LOAD || GetLastError() == 4072)
     {
      Print("ERREUR : indicateur introuvable ou refuse de se charger -> ", IndicatorName);
      return(INIT_FAILED);
     }

   if(!AutoriserTradesReels && !IsTesting())
      Print("EnigmaTester : AutoriserTradesReels=false. Aucun ordre ne sera envoye sur ce graphique. ",
            "Le Strategy Tester, lui, trade normalement.");

   if(ModeDiagnostic)
      Print("EnigmaTester : MODE DIAGNOSTIC actif. Aucun ordre ne sera envoye.");

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Une fleche est-elle presente sur la bougie 'shift' ?              |
//+------------------------------------------------------------------+
bool FlechePresente(const int buffer, const int shift)
  {
   double v = iCustom(NULL, 0, IndicatorName, buffer, shift);

   if(v == EMPTY_VALUE)          return(false);
   if(!MathIsValidNumber(v))     return(false);
   if(v == 0.0)                  return(false);
   //--- garde-fou : une fleche est dessinee au niveau du prix.
   //    Une valeur hors de portee signale un mauvais index de buffer.
   if(v > High[shift] * 3.0)     return(false);
   if(v < Low[shift]  * 0.3)     return(false);

   return(true);
  }

//+------------------------------------------------------------------+
//| Affiche tous les buffers : sert a identifier les bons index      |
//+------------------------------------------------------------------+
void Diagnostic(const int shift)
  {
   string ligne = "Bougie " + TimeToString(Time[shift], TIME_DATE|TIME_MINUTES) + " |";
   for(int b = 0; b < 8; b++)
     {
      double v = iCustom(NULL, 0, IndicatorName, b, shift);
      if(v == EMPTY_VALUE || !MathIsValidNumber(v))
         ligne = ligne + " [" + IntegerToString(b) + "]=vide";
      else
         ligne = ligne + " [" + IntegerToString(b) + "]=" + DoubleToString(v, Digits);
     }
   Print(ligne);
  }

//+------------------------------------------------------------------+
//| Taille de position calculee depuis le risque, pas choisie        |
//+------------------------------------------------------------------+
double CalculerLot(const double distanceStop)
  {
   if(distanceStop <= 0.0) return(0.0);

   double capital  = AccountBalance();
   double aRisquer = capital * RisquePctParTrade / 100.0;

   double tickValue = MarketInfo(Symbol(), MODE_TICKVALUE);
   double tickSize  = MarketInfo(Symbol(), MODE_TICKSIZE);
   if(tickValue <= 0.0 || tickSize <= 0.0)
     {
      Print("ERREUR : tickValue/tickSize indisponibles pour ", Symbol());
      return(0.0);
     }

   double perteParLot = (distanceStop / tickSize) * tickValue;
   if(perteParLot <= 0.0) return(0.0);

   double lot = aRisquer / perteParLot;

   double minLot = MarketInfo(Symbol(), MODE_MINLOT);
   double maxLot = MarketInfo(Symbol(), MODE_MAXLOT);
   double pas    = MarketInfo(Symbol(), MODE_LOTSTEP);
   if(pas <= 0.0) pas = 0.01;

   lot = MathFloor(lot / pas) * pas;

   //--- capital insuffisant : on ne trade pas, et on le dit une fois
   if(lot < minLot)
     {
      if(!g_avertiUneFois)
        {
         double perteAuLotMin = minLot * perteParLot;
         Print("CAPITAL INSUFFISANT : lot theorique ", DoubleToString(lot, 4),
               " sous le lot minimum ", DoubleToString(minLot, 2),
               ". Au lot minimum un stop touche couterait ", DoubleToString(perteAuLotMin, 2),
               " soit ", DoubleToString(perteAuLotMin / capital * 100.0, 1), "% du capital de ",
               DoubleToString(capital, 2),
               ". Capital necessaire pour ", DoubleToString(RisquePctParTrade, 1), "% de risque : ",
               DoubleToString(perteAuLotMin / (RisquePctParTrade / 100.0), 2));
         g_avertiUneFois = true;
        }
      return(0.0);
     }

   if(lot > maxLot) lot = maxLot;

   int lotDigits = 2;
   if(pas >= 0.1)        lotDigits = 1;
   else if(pas >= 0.01)  lotDigits = 2;
   else if(pas >= 0.001) lotDigits = 3;

   return(NormalizeDouble(lot, lotDigits));
  }

//+------------------------------------------------------------------+
bool PositionOuverte()
  {
   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() == Symbol() && OrderMagicNumber() == MagicNumber) return(true);
     }
   return(false);
  }

//+------------------------------------------------------------------+
//| Envoie l'ordre. Repli sans SL/TP puis OrderModify si le broker   |
//| refuse les stops a l'ouverture (erreur 130, courant en ECN).     |
//+------------------------------------------------------------------+
void EnvoyerOrdre(const int type, const double lot, const double prix,
                  const double sl, const double tp)
  {
   int ticket = OrderSend(Symbol(), type, lot, prix, Slippage, sl, tp, "Enigma",
                          MagicNumber, 0, (type == OP_BUY ? clrDodgerBlue : clrOrangeRed));

   if(ticket > 0) return;

   int err = GetLastError();
   if(err != 130 && err != 145)
     {
      Print("ECHEC OrderSend, erreur ", err, " (lot ", DoubleToString(lot, 2),
            ", prix ", DoubleToString(prix, Digits), ")");
      return;
     }

   //--- le broker refuse les stops a l'ouverture : on ouvre nu, puis on modifie
   Print("Stops refuses a l'ouverture (erreur ", err, "), tentative sans SL/TP puis OrderModify.");
   RefreshRates();
   double prix2 = (type == OP_BUY ? Ask : Bid);
   ticket = OrderSend(Symbol(), type, lot, NormalizeDouble(prix2, Digits), Slippage,
                      0, 0, "Enigma", MagicNumber, 0, clrGray);
   if(ticket <= 0)
     {
      Print("ECHEC OrderSend (2e tentative), erreur ", GetLastError());
      return;
     }

   if(OrderSelect(ticket, SELECT_BY_TICKET))
     {
      if(!OrderModify(ticket, OrderOpenPrice(), sl, tp, 0, clrGray))
         Print("ATTENTION : position ouverte SANS stop, OrderModify a echoue, erreur ", GetLastError(),
               ". Placez le stop a la main immediatement.");
     }
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   //--- on ne travaille qu'a l'ouverture d'une nouvelle bougie, donc sur
   //    un signal definitif : la bougie 1 est cloturee, aucun repaint possible
   if(Time[0] == g_derniereBougie) return;
   g_derniereBougie = Time[0];

   if(Bars < 100) return;

   if(ModeDiagnostic)
     {
      Diagnostic(1);
      return;
     }

   if(!AutoriserTradesReels && !IsTesting()) return;

   if(UnePositionMax && PositionOuverte()) return;

   if(SpreadMaxPoints > 0)
     {
      double spread = MarketInfo(Symbol(), MODE_SPREAD);
      if(spread > SpreadMaxPoints) return;
     }

   //--- shift 1 = derniere bougie CLOTUREE
   bool achat = FlechePresente(BuyBufferIndex,  1);
   bool vente = FlechePresente(SellBufferIndex, 1);
   if(!achat && !vente) return;
   if(achat && vente)   return;   // signal contradictoire : on passe

   double atr = iATR(NULL, 0, ATR_Period, 1);
   if(atr <= 0.0) return;

   double distanceStop = SL_ATR_Multi * atr;

   //--- le broker impose une distance minimale entre le prix et les stops
   double stopLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
   if(distanceStop < stopLevel)
     {
      Print("Stop de ", DoubleToString(distanceStop, Digits),
            " sous la distance minimale du broker (", DoubleToString(stopLevel, Digits),
            "). Trade ignore plutot que d'elargir le risque.");
      return;
     }

   double lot = CalculerLot(distanceStop);
   if(lot <= 0.0) return;

   RefreshRates();

   if(achat)
     {
      double prix = NormalizeDouble(Ask, Digits);
      double sl   = NormalizeDouble(prix - distanceStop,          Digits);
      double tp   = NormalizeDouble(prix + distanceStop * TP_RR,  Digits);
      EnvoyerOrdre(OP_BUY, lot, prix, sl, tp);
     }
   else
     {
      double prix = NormalizeDouble(Bid, Digits);
      double sl   = NormalizeDouble(prix + distanceStop,          Digits);
      double tp   = NormalizeDouble(prix - distanceStop * TP_RR,  Digits);
      EnvoyerOrdre(OP_SELL, lot, prix, sl, tp);
     }
  }

//+------------------------------------------------------------------+
//  NOTE 1 - TROUVER LES INDEX DE BUFFER
//  Mettez ModeDiagnostic = true et attachez l'EA au graphique. A
//  chaque nouvelle bougie il imprime la valeur des 8 buffers dans
//  l'onglet Experts. Sur une bougie portant une fleche d'achat, le
//  buffer qui affiche un PRIX (et non "vide") est BuyBufferIndex.
//  Repetez avec une fleche de vente pour SellBufferIndex.
//  Pour la famille Sdv_Wyckoff / SDC Exhaust, la source montre
//  BuyArr en buffer 0 et SellArr en buffer 1.
//
//  NOTE 2 - PARAMETRES DE L'INDICATEUR
//  iCustom est appele SANS parametres : l'indicateur tourne donc avec
//  les valeurs par DEFAUT de son fichier source, pas avec celles que
//  vous avez reglees sur le graphique. Si vos reglages different des
//  defauts, vous testez autre chose que ce que vous voyez.
//  Pour tester vos reglages exacts, il faut passer tous les parametres
//  a iCustom dans l'ordre exact de leur declaration.
//
//  NOTE 3 - PERIODE D'ESSAI DE L'INDICATEUR
//  Ces indicateurs contiennent une date d'expiration. Une fois expire,
//  l'indicateur vide ses buffers SANS erreur : l'EA ne voit plus aucune
//  fleche et le backtest rend zero trade, ce qui ressemble a une
//  strategie qui ne signale jamais. Verifiez le compteur de jours sur
//  le graphique avant de conclure quoi que ce soit.
//
//  NOTE 4 - REGLAGES DU STRATEGY TESTER
//  Modelisation : "Every tick". Periode : au moins 12 mois.
//  Verifiez que le spread du test correspond a votre spread reel.
//  Le capital de test doit etre votre capital reel, sinon le
//  dimensionnement teste n'est pas celui que vous vivrez.
//+------------------------------------------------------------------+
