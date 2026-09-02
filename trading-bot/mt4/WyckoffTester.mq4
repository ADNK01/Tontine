//+------------------------------------------------------------------+
//|  WyckoffTester.mq4                                               |
//|                                                                  |
//|  EA de backtest pour l'indicateur "SDC Exhaust / Sdv_Wyckoff".   |
//|  Il ne decide rien : il lit les fleches de l'indicateur et ouvre  |
//|  la position correspondante.                                     |
//|                                                                  |
//|  DIFFERENCE ESSENTIELLE avec EnigmaTester.mq4 : cet EA passe      |
//|  EXPLICITEMENT les 113 parametres a iCustom, dans l'ordre exact   |
//|  de leur declaration dans le source. Sans cela, l'indicateur      |
//|  tournerait avec ses valeurs par defaut et vous testeriez autre   |
//|  chose que vos reglages.                                         |
//|                                                                  |
//|  Le dessin (zones, boites, tableau de bord) et les alertes sont   |
//|  forces a false : dans le Strategy Tester ils ralentissent        |
//|  enormement et les popups bloquent le test.                      |
//|                                                                  |
//|  Le stop est calcule comme dans l'indicateur : depuis l'EXTREME   |
//|  de la bougie de signal, pas depuis le prix d'entree.            |
//+------------------------------------------------------------------+
#property strict
#property description "Backtest de l'indicateur Wyckoff : lit ses fleches, ouvre la position."

//--- Nom du fichier indicateur, sans extension.
//    Dans un sous-dossier : "MonDossier\\Sdv_Wyckoff"
input string   IndicatorName        = "Enigma_Wyckoff_Pro_V5";
input int      BuyBufferIndex       = 0;      // BuyArr dans le source
input int      SellBufferIndex      = 1;      // SellArr dans le source

//=== PARAMETRES DE L'INDICATEUR (passes a iCustom) ==================
input int              X_Range_Lookback         = 20; // Max bars to scan back for a momentum run
input int              X_Range_Min_Age          = 3; // Min consecutive run bars required
input double           X_Sweep_ATR_Min          = 0.3; // Min run displacement (x ATR)
input double           X_Sweep_ATR_Max          = 5.0; // Max run displacement (x ATR)
input int              X_Filter_Ready_Window    = 5; // Readiness (3-20) lower = better
input bool             X_Use_Quantum_Div        = true; // Enable Quantum/Thermodynamic Divergence
input bool             X_Use_Kinetic_Energy     = true; // 1. Wyckoff Effort vs Result (KE Decay)
input double           X_KE_Decay_Threshold     = 0.5; // Max Recent KE / Past KE (0.5-0.9)
input bool             X_Use_OrderFlow_Delta    = true; // 2. Order Flow Absorption (Delta Shift)
input bool             X_Use_Phase_Velocity     = true; // 3. Momentum Velocity Shift (RSI Slope)
input int              X_Quantum_Lookback       = 15; // Bars to measure Energy/Delta before pivot
input int              X_Div_Lookback           = 100; // Max bars back for prior pivot
input int              X_Div_Min_Gap            = 5; // Min bars between pivot pair
input double           X_Price_Min_Diff_ATR     = 1.0; // Min price diff (1-4)
input int              X_Min_Quantum_Confirms   = 1; // Min Quantum confirmations needed (1-3)
input bool             X_Use_Hidden_Div         = true; // Enable Hidden Divergence (Uses standard RSI)
input int              X_Div_RSI_Period         = 7; // RSI Period (for Velocity & Hidden)
input double           X_Min_Osc_Diff           = 2.0; // Min RSI diff for Hidden Div
input int              X_Reversal_Bars          = 50; // Reversal Bars
input bool             X_Use_ER_Quality         = false; // Filter 3 (Kaufman ER)
input double           X_ER_Min_Quality         = 0.3; // (0-1, higher=stricter)
input bool             X_Use_CUSUM              = false; // Filter 4 (CUSUM)
input double           X_CUSUM_Threshold        = 3.0; // Score to confirm
input bool             X_Use_HTF                = false; // Enable HTF Confirmation
input ENUM_TIMEFRAMES  X_HTF_Period             = PERIOD_H1; // Higher Timeframe
input int              X_ATR_Period             = 14; // ATR Period
input double           X_SL_ATR_Multi           = 3.0; // SL = ATR × this
input int              X_Min_Bars_Between       = 5;
input int              X_Scan_Window            = 5000;
input int              X_RSI_Swing_Bars         = 8; // Price Structure Lookback

//=== GESTION DU RISQUE (cote EA) ====================================
input double   TP_RR                = 1.0;    // Objectif, en multiples du risque
input double   RisquePctParTrade    = 1.0;    // % du capital risque par trade

//=== SECURITES ======================================================
input bool     ModeDiagnostic       = false;  // Imprime les buffers, ne trade pas
input bool     AutoriserTradesReels = false;  // Obligatoire hors Strategy Tester
input double   SpreadMaxPoints      = 0;      // 0 = pas de limite
input int      Slippage             = 50;     // En points, large sur BTCUSD
input bool     UnePositionMax       = true;
input int      MagicNumber          = 990002;

datetime g_derniereBougie = 0;
bool     g_avertiUneFois  = false;

//+------------------------------------------------------------------+
//| Lecture d'un buffer de l'indicateur, tous parametres transmis     |
//+------------------------------------------------------------------+
double LireBuffer(const int buffer, const int shift)
  {
   return iCustom(NULL, 0, IndicatorName,
      "", X_Range_Lookback, X_Range_Min_Age, X_Sweep_ATR_Min,
      X_Sweep_ATR_Max, false, "", X_Filter_Ready_Window,
      "", 100, 2.5, false,
      false, false, "", false,
      1.5, "", false, 15,
      5.0, "", false, 20,
      100.0, -100.0, 3, "",
      X_Use_Quantum_Div, X_Use_Kinetic_Energy, X_KE_Decay_Threshold, X_Use_OrderFlow_Delta,
      X_Use_Phase_Velocity, X_Quantum_Lookback, X_Div_Lookback, X_Div_Min_Gap,
      X_Price_Min_Diff_ATR, X_Min_Quantum_Confirms, X_Use_Hidden_Div, X_Div_RSI_Period,
      X_Min_Osc_Diff, "", X_Reversal_Bars, false,
      1.0, false, 1.0, 14,
      X_Use_ER_Quality, X_ER_Min_Quality, X_Use_CUSUM, X_CUSUM_Threshold,
      false, 2.0, "", false,
      2.0, true, "", false,
      14, 65.0, 35.0, "",
      false, 14, 20.0, "",
      X_Use_HTF, X_HTF_Period, "", false,
      50, "", false, 20,
      "", false, 7, 20,
      "", false, 3.0, "",
      X_ATR_Period, X_SL_ATR_Multi, 1.0, 1.618,
      2.618, "", false, C'0,50,120',
      C'120,30,0', false, false, clrRed,
      clrLime, clrGold, clrDeepSkyBlue, 25,
      "", C'0,40,80', C'80,20,0', "",
      false, false, X_Min_Bars_Between, X_Scan_Window,
      X_RSI_Swing_Bars, "", false, false,
      false,
      buffer, shift);
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   LireBuffer(BuyBufferIndex, 1);
   int err = GetLastError();
   if(err == 4072 || err == 4055 || err == 4802)
     {
      Print("ERREUR : indicateur introuvable ou refuse de se charger -> ", IndicatorName);
      return(INIT_FAILED);
     }
   if(!AutoriserTradesReels && !IsTesting())
      Print("WyckoffTester : AutoriserTradesReels=false, aucun ordre ne sera envoye sur ce graphique. ",
            "Le Strategy Tester trade normalement.");
   if(ModeDiagnostic) Print("WyckoffTester : MODE DIAGNOSTIC, aucun ordre ne sera envoye.");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
bool FlechePresente(const int buffer, const int shift)
  {
   double v = LireBuffer(buffer, shift);
   if(v == EMPTY_VALUE)      return(false);
   if(!MathIsValidNumber(v)) return(false);
   if(v == 0.0)              return(false);
   if(v > High[shift] * 3.0) return(false);
   if(v < Low[shift]  * 0.3) return(false);
   return(true);
  }

//+------------------------------------------------------------------+
void Diagnostic(const int shift)
  {
   string ligne = "Bougie " + TimeToString(Time[shift], TIME_DATE|TIME_MINUTES) + " |";
   for(int b = 0; b < 5; b++)
     {
      double v = LireBuffer(b, shift);
      if(v == EMPTY_VALUE || !MathIsValidNumber(v))
         ligne = ligne + " [" + IntegerToString(b) + "]=vide";
      else
         ligne = ligne + " [" + IntegerToString(b) + "]=" + DoubleToString(v, Digits);
     }
   Print(ligne);
  }

//+------------------------------------------------------------------+
double CalculerLot(const double distanceStop)
  {
   if(distanceStop <= 0.0) return(0.0);
   double capital   = AccountBalance();
   double aRisquer  = capital * RisquePctParTrade / 100.0;
   double tickValue = MarketInfo(Symbol(), MODE_TICKVALUE);
   double tickSize  = MarketInfo(Symbol(), MODE_TICKSIZE);
   if(tickValue <= 0.0 || tickSize <= 0.0)
     { Print("ERREUR : tickValue/tickSize indisponibles pour ", Symbol()); return(0.0); }

   double perteParLot = (distanceStop / tickSize) * tickValue;
   if(perteParLot <= 0.0) return(0.0);

   double lot    = aRisquer / perteParLot;
   double minLot = MarketInfo(Symbol(), MODE_MINLOT);
   double maxLot = MarketInfo(Symbol(), MODE_MAXLOT);
   double pas    = MarketInfo(Symbol(), MODE_LOTSTEP);
   if(pas <= 0.0) pas = 0.01;
   lot = MathFloor(lot / pas) * pas;

   if(lot < minLot)
     {
      if(!g_avertiUneFois)
        {
         double perteAuLotMin = minLot * perteParLot;
         Print("CAPITAL INSUFFISANT : lot theorique ", DoubleToString(lot, 4),
               " sous le minimum ", DoubleToString(minLot, 2),
               ". Au lot minimum un stop couterait ", DoubleToString(perteAuLotMin, 2),
               " soit ", DoubleToString(perteAuLotMin / capital * 100.0, 1), "% du capital. ",
               "Capital necessaire : ", DoubleToString(perteAuLotMin / (RisquePctParTrade/100.0), 2));
         g_avertiUneFois = true;
        }
      return(0.0);
     }
   if(lot > maxLot) lot = maxLot;

   int lotDigits = 2;
   if(pas >= 0.1) lotDigits = 1; else if(pas >= 0.001 && pas < 0.01) lotDigits = 3;
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
void EnvoyerOrdre(const int type, const double lot, const double prix,
                  const double sl, const double tp)
  {
   int ticket = OrderSend(Symbol(), type, lot, prix, Slippage, sl, tp, "Wyckoff",
                          MagicNumber, 0, (type == OP_BUY ? clrDodgerBlue : clrOrangeRed));
   if(ticket > 0) return;

   int err = GetLastError();
   if(err != 130 && err != 145)
     { Print("ECHEC OrderSend, erreur ", err, ", lot ", DoubleToString(lot,2)); return; }

   Print("Stops refuses a l'ouverture (erreur ", err, "), ouverture nue puis OrderModify.");
   RefreshRates();
   double prix2 = (type == OP_BUY ? Ask : Bid);
   ticket = OrderSend(Symbol(), type, lot, NormalizeDouble(prix2, Digits), Slippage,
                      0, 0, "Wyckoff", MagicNumber, 0, clrGray);
   if(ticket <= 0) { Print("ECHEC OrderSend (2e tentative), erreur ", GetLastError()); return; }
   if(OrderSelect(ticket, SELECT_BY_TICKET))
      if(!OrderModify(ticket, OrderOpenPrice(), sl, tp, 0, clrGray))
         Print("ATTENTION : position ouverte SANS stop, OrderModify a echoue, erreur ", GetLastError());
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   if(Time[0] == g_derniereBougie) return;
   g_derniereBougie = Time[0];
   if(Bars < 200) return;

   if(ModeDiagnostic) { Diagnostic(1); return; }
   if(!AutoriserTradesReels && !IsTesting()) return;
   if(UnePositionMax && PositionOuverte()) return;

   if(SpreadMaxPoints > 0 && MarketInfo(Symbol(), MODE_SPREAD) > SpreadMaxPoints) return;

   bool achat = FlechePresente(BuyBufferIndex,  1);
   bool vente = FlechePresente(SellBufferIndex, 1);
   if(!achat && !vente) return;
   if(achat && vente)   return;

   double atr = iATR(NULL, 0, X_ATR_Period, 1);
   if(atr <= 0.0) return;

   RefreshRates();
   double prix = NormalizeDouble(achat ? Ask : Bid, Digits);

   //--- Stop calcule comme dans l'indicateur : depuis l'EXTREME de la bougie
   double sl = achat ? Low[1]  - atr * X_SL_ATR_Multi
                     : High[1] + atr * X_SL_ATR_Multi;
   sl = NormalizeDouble(sl, Digits);

   double risque = MathAbs(prix - sl);
   if(risque <= 0.0) return;

   double stopLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
   if(risque < stopLevel)
     {
      Print("Stop de ", DoubleToString(risque, Digits), " sous la distance minimale du broker (",
            DoubleToString(stopLevel, Digits), "). Trade ignore plutot que risque elargi.");
      return;
     }

   double lot = CalculerLot(risque);
   if(lot <= 0.0) return;

   double tp = NormalizeDouble(achat ? prix + risque * TP_RR : prix - risque * TP_RR, Digits);
   EnvoyerOrdre(achat ? OP_BUY : OP_SELL, lot, prix, sl, tp);
  }
//+------------------------------------------------------------------+
