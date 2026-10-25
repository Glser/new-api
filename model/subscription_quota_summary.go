package model

import (
	"math"
	"time"
)

// SubscriptionQuotaSummary describes the scheduled grants over a plan's full
// validity period. It is a preview, not a balance available for immediate use.
type SubscriptionQuotaSummary struct {
	TotalAmount int64 `json:"total_amount"`
	CycleCount  int64 `json:"cycle_count"`
}

func GetSubscriptionPlanQuotaSummary(plan *SubscriptionPlan, start time.Time) *SubscriptionQuotaSummary {
	endUnix, err := calcPlanEndTime(start, plan)
	if err != nil {
		return nil
	}
	return subscriptionQuotaSummary(plan, start, endUnix, plan.TotalAmount)
}

// GetUserSubscriptionQuotaSummary uses the purchased subscription's quota and
// actual validity dates, including extensions, rather than the current plan's duration.
func GetUserSubscriptionQuotaSummary(sub *UserSubscription, plan *SubscriptionPlan) *SubscriptionQuotaSummary {
	if sub == nil {
		return nil
	}
	return subscriptionQuotaSummary(plan, time.Unix(sub.StartTime, 0), sub.EndTime, sub.AmountTotal)
}

func subscriptionQuotaSummary(plan *SubscriptionPlan, start time.Time, endUnix, amount int64) *SubscriptionQuotaSummary {
	if plan == nil || endUnix <= start.Unix() || amount < 0 {
		return nil
	}
	cycles := int64(1)
	period := NormalizeResetPeriod(plan.QuotaResetPeriod)
	if period == SubscriptionResetCustom && plan.QuotaResetCustomSeconds > 0 {
		// The initial grant counts; a reset exactly at expiry does not.
		cycles = 1 + (endUnix-start.Unix()-1)/plan.QuotaResetCustomSeconds
	} else if next := calcNextResetTime(start, plan, endUnix); next > 0 && next < endUnix {
		first := time.Unix(next, 0).In(start.Location())
		last := time.Unix(endUnix-1, 0).In(start.Location())
		switch period {
		case SubscriptionResetDaily, SubscriptionResetWeekly:
			// Count calendar dates, so DST changes do not add or lose a grant.
			firstDate := time.Date(first.Year(), first.Month(), first.Day(), 0, 0, 0, 0, time.UTC)
			lastDate := time.Date(last.Year(), last.Month(), last.Day(), 0, 0, 0, 0, time.UTC)
			days := (lastDate.Unix() - firstDate.Unix()) / 86400
			if period == SubscriptionResetWeekly {
				days /= 7
			}
			cycles += 1 + days
		case SubscriptionResetMonthly:
			cycles += 1 + int64((last.Year()-first.Year())*12+int(last.Month())-int(first.Month()))
		}
	}
	if amount > 0 && cycles > math.MaxInt64/amount {
		return nil
	}
	return &SubscriptionQuotaSummary{TotalAmount: amount * cycles, CycleCount: cycles}
}
