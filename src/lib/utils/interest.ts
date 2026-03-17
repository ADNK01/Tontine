import type { InterestMethod, RepaymentScheduleItem } from "@/lib/types/database";
import { addMonths, format } from "date-fns";

export function calculateTotalInterest(
  principal: number,
  annualRate: number,
  termMonths: number,
  method: InterestMethod
): number {
  const rate = annualRate / 100;
  if (method === "flat") {
    return principal * rate * (termMonths / 12);
  }
  // Reducing balance
  const monthlyRate = rate / 12;
  if (monthlyRate === 0) return 0;
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return emi * termMonths - principal;
}

export function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  method: InterestMethod,
  startDate: Date
): RepaymentScheduleItem[] {
  const schedule: RepaymentScheduleItem[] = [];
  const rate = annualRate / 100;
  const monthlyRate = rate / 12;

  if (method === "flat") {
    const totalInterest = principal * rate * (termMonths / 12);
    const monthlyInterest = totalInterest / termMonths;
    const monthlyPrincipal = principal / termMonths;
    const monthlyPayment = monthlyPrincipal + monthlyInterest;
    let balance = principal;

    for (let i = 1; i <= termMonths; i++) {
      balance -= monthlyPrincipal;
      schedule.push({
        period: i,
        date: format(addMonths(startDate, i), "yyyy-MM-dd"),
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(monthlyPrincipal * 100) / 100,
        interest: Math.round(monthlyInterest * 100) / 100,
        balance: Math.max(0, Math.round(balance * 100) / 100),
      });
    }
  } else {
    // Reducing balance (EMI)
    const emi = monthlyRate === 0
      ? principal / termMonths
      : principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    let balance = principal;

    for (let i = 1; i <= termMonths; i++) {
      const interest = balance * monthlyRate;
      const principalPart = emi - interest;
      balance -= principalPart;
      schedule.push({
        period: i,
        date: format(addMonths(startDate, i), "yyyy-MM-dd"),
        payment: Math.round(emi * 100) / 100,
        principal: Math.round(principalPart * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.max(0, Math.round(balance * 100) / 100),
      });
    }
  }

  return schedule;
}

export function calculatePenalty(
  overdueAmount: number,
  penaltyRate: number,
  daysOverdue: number
): number {
  return Math.round(overdueAmount * (penaltyRate / 100) * (daysOverdue / 365) * 100) / 100;
}
