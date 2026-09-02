/**
 * Dimensionnement de position a partir du capital reel.
 *
 * C'est le module qui dit la verite sur un petit compte : si le lot minimum du
 * broker fait risquer plus que le budget de risque, il le dit au lieu d'arrondir.
 */
import { config } from './config.js';

export interface SizingResult {
  /** Lot theorique avant contrainte de lot minimum. */
  idealLots: number;
  /** Lot reellement passable chez le broker (null = impossible). */
  brokerLots: number | null;
  /** Perte encourue si le SL est touche, avec brokerLots. */
  riskAtBrokerLots: number;
  /** Budget de risque voulu (capital x riskPerTrade). */
  riskBudget: number;
  /** Part du capital reellement risquee avec le lot minimum, en fraction. */
  actualRiskFraction: number;
  feasible: boolean;
  reason: string;
}

/** @param slDistance distance entre l'entree et le stop, en prix. */
export function sizePosition(slDistance: number, balance: number = config.accountBalance): SizingResult {
  const riskBudget = balance * config.riskPerTrade;
  const lossPerLot = slDistance * config.contractSize;

  if (!(slDistance > 0) || !(lossPerLot > 0)) {
    return {
      idealLots: 0, brokerLots: null, riskAtBrokerLots: 0, riskBudget,
      actualRiskFraction: 0, feasible: false,
      reason: 'Distance de stop nulle ou invalide : impossible de dimensionner.',
    };
  }

  const idealLots = riskBudget / lossPerLot;
  const riskAtMinLot = config.minLot * lossPerLot;
  const actualRiskFraction = riskAtMinLot / balance;

  if (idealLots < config.minLot) {
    return {
      idealLots, brokerLots: null, riskAtBrokerLots: riskAtMinLot, riskBudget, actualRiskFraction,
      feasible: false,
      reason:
        `Lot theorique ${idealLots.toFixed(4)} sous le lot minimum ${config.minLot}. ` +
        `Au lot minimum, un stop touche coute ${riskAtMinLot.toFixed(2)} soit ` +
        `${(actualRiskFraction * 100).toFixed(1)}% du capital de ${balance.toFixed(2)} ` +
        `(budget vise : ${(config.riskPerTrade * 100).toFixed(1)}%, soit ${riskBudget.toFixed(2)}).`,
    };
  }

  const brokerLots = Math.floor(idealLots / config.lotStep) * config.lotStep;
  const risk = brokerLots * lossPerLot;
  return {
    idealLots, brokerLots, riskAtBrokerLots: risk, riskBudget,
    actualRiskFraction: risk / balance, feasible: true,
    reason: `Lot ${brokerLots.toFixed(2)} : un stop touche coute ${risk.toFixed(2)} (${((risk / balance) * 100).toFixed(1)}% du capital).`,
  };
}

/** Capital minimum pour que le lot minimum respecte le budget de risque. */
export function minimumViableBalance(slDistance: number): number {
  const lossPerLot = slDistance * config.contractSize;
  return (config.minLot * lossPerLot) / config.riskPerTrade;
}
