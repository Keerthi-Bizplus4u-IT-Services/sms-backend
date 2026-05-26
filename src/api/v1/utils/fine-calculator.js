/**
 * Tiered fine calculation utility
 * Applies grace period, tiered daily rates, and max cap
 */

/**
 * Calculate fine for an overdue book return
 * @param {Date|string} dueDate - when the book was due
 * @param {Date|string} returnDate - when the book was actually returned
 * @param {Array} fineRules - sorted tiered rules for this borrower type
 *   Each rule: { tier_start_day, tier_end_day, fine_per_day, grace_period_days, max_fine_amount }
 * @returns {{ daysOverdue: number, fineAmount: number, breakdown: Array }}
 */
function calculateFine(dueDate, returnDate, fineRules = []) {
  const due = new Date(dueDate);
  const returned = new Date(returnDate);

  due.setHours(0, 0, 0, 0);
  returned.setHours(0, 0, 0, 0);

  const diffMs = returned.getTime() - due.getTime();
  const totalDaysLate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (totalDaysLate === 0 || fineRules.length === 0) {
    return { daysOverdue: totalDaysLate, fineAmount: 0, breakdown: [] };
  }

  // Sort rules by tier_start_day
  const rules = [...fineRules].sort((a, b) => a.tier_start_day - b.tier_start_day);

  // Apply grace period from the first rule (or max across rules)
  const gracePeriod = Math.max(0, ...rules.map(r => r.grace_period_days || 0));
  const chargeableDays = Math.max(0, totalDaysLate - gracePeriod);

  if (chargeableDays === 0) {
    return { daysOverdue: totalDaysLate, fineAmount: 0, breakdown: [] };
  }

  let totalFine = 0;
  const breakdown = [];
  let daysAccountedFor = 0;

  for (const rule of rules) {
    if (daysAccountedFor >= chargeableDays) break;

    const tierStart = rule.tier_start_day - 1; // Convert to 0-indexed
    const tierEnd = rule.tier_end_day != null ? rule.tier_end_day : Infinity;
    const tierLength = tierEnd === Infinity ? Infinity : (tierEnd - rule.tier_start_day + 1);

    // How many chargeable days fall in this tier
    const daysInTier = Math.min(
      tierLength === Infinity ? chargeableDays - daysAccountedFor : tierLength,
      chargeableDays - daysAccountedFor
    );

    if (daysInTier <= 0) continue;

    const tierAmount = daysInTier * parseFloat(rule.fine_per_day);
    totalFine += tierAmount;
    daysAccountedFor += daysInTier;

    breakdown.push({
      tier: `Day ${rule.tier_start_day}${rule.tier_end_day ? '-' + rule.tier_end_day : '+'}`,
      days: daysInTier,
      ratePerDay: parseFloat(rule.fine_per_day),
      amount: Math.round(tierAmount * 100) / 100
    });
  }

  // Apply max fine cap (use the highest max_fine_amount from rules)
  const maxCaps = rules.filter(r => r.max_fine_amount != null).map(r => parseFloat(r.max_fine_amount));
  if (maxCaps.length > 0) {
    const maxFine = Math.max(...maxCaps);
    totalFine = Math.min(totalFine, maxFine);
  }

  totalFine = Math.round(totalFine * 100) / 100;

  return { daysOverdue: totalDaysLate, fineAmount: totalFine, breakdown };
}

/**
 * Default fine rules when no school-specific rules exist
 */
const DEFAULT_FINE_RULES = {
  student: [
    { tier_start_day: 1, tier_end_day: 7, fine_per_day: 1, grace_period_days: 0, max_fine_amount: null },
    { tier_start_day: 8, tier_end_day: null, fine_per_day: 3, grace_period_days: 0, max_fine_amount: 500 }
  ],
  teacher: [
    { tier_start_day: 1, tier_end_day: null, fine_per_day: 2, grace_period_days: 3, max_fine_amount: 500 }
  ],
  staff: [
    { tier_start_day: 1, tier_end_day: null, fine_per_day: 2, grace_period_days: 3, max_fine_amount: 500 }
  ]
};

module.exports = { calculateFine, DEFAULT_FINE_RULES };
