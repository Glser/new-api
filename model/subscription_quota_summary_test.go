package model

import (
	"math"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestSubscriptionPlanQuotaSummary(t *testing.T) {
	start := time.Date(2026, time.October, 25, 18, 0, 0, 0, time.UTC)
	tests := []struct {
		name         string
		unit         string
		value        int
		period       string
		resetSeconds int64
		quota        int64
		cycles       int64
	}{
		{"no reset", "day", 30, "never", 0, 10, 1},
		{"three hour grants in a day", "day", 1, "custom", 3 * 3600, 5, 8},
		{"partial final custom window", "day", 1, "custom", 10 * 3600, 50, 3},
		{"month uses actual length", "month", 1, "custom", 10 * 3600, 10, 75},
		{"reset after expiry", "hour", 2, "custom", 3 * 3600, 5, 1},
		{"daily includes partial calendar windows", "day", 30, "daily", 0, 10, 31},
		{"weekly follows monday boundary", "day", 8, "weekly", 0, 10, 3},
		{"monthly follows calendar boundary", "month", 1, "monthly", 0, 10, 2},
		{"unlimited", "day", 1, "custom", 3600, 0, 24},
		{"one second intervals stay bounded", "year", 1, "custom", 1, 1, 365 * 86400},
		{"invalid reset acts as never", "day", 1, "custom", 0, 10, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan := &SubscriptionPlan{DurationUnit: tt.unit, DurationValue: tt.value, QuotaResetPeriod: tt.period, QuotaResetCustomSeconds: tt.resetSeconds, TotalAmount: tt.quota}
			got := GetSubscriptionPlanQuotaSummary(plan, start)
			require.NotNil(t, got)
			require.Equal(t, tt.cycles, got.CycleCount)
			require.Equal(t, tt.quota*tt.cycles, got.TotalAmount)
		})
	}
}

func TestSubscriptionPlanQuotaSummaryCalendarEdges(t *testing.T) {
	plan := &SubscriptionPlan{DurationUnit: "day", DurationValue: 1, QuotaResetPeriod: "daily", TotalAmount: 10}
	start := time.Date(2026, time.October, 25, 0, 0, 0, 0, time.UTC)
	// The reset at the exact expiry time cannot be spent.
	require.EqualValues(t, 1, GetSubscriptionPlanQuotaSummary(plan, start).CycleCount)
	plan.DurationUnit = "month"
	plan.QuotaResetPeriod = "monthly"
	start = time.Date(2026, time.January, 31, 12, 0, 0, 0, time.UTC)
	// Match Go AddDate normalization: Jan 31 + 1 month ends in March.
	require.EqualValues(t, 3, GetSubscriptionPlanQuotaSummary(plan, start).CycleCount)
	loc, err := time.LoadLocation("America/New_York")
	require.NoError(t, err)
	plan.DurationUnit = "day"
	plan.DurationValue = 3
	plan.QuotaResetPeriod = "daily"
	for _, day := range []time.Time{
		time.Date(2026, time.March, 7, 12, 0, 0, 0, loc),
		time.Date(2026, time.October, 31, 12, 0, 0, 0, loc),
	} {
		require.EqualValues(t, 4, GetSubscriptionPlanQuotaSummary(plan, day).CycleCount)
	}
}

func TestSubscriptionPlanQuotaSummaryInvalid(t *testing.T) {
	start := time.Now()
	require.Nil(t, GetSubscriptionPlanQuotaSummary(nil, start))
	require.Nil(t, GetSubscriptionPlanQuotaSummary(&SubscriptionPlan{}, start))
	require.Nil(t, GetSubscriptionPlanQuotaSummary(&SubscriptionPlan{DurationUnit: "day", DurationValue: 1, QuotaResetPeriod: "daily", TotalAmount: math.MaxInt64}, start))
}

func TestUserSubscriptionQuotaSummary(t *testing.T) {
	start := time.Date(2026, time.October, 25, 18, 0, 0, 0, time.UTC)
	// A plan can change after purchase. The user's purchased quota and extended
	// validity period must remain the source for their own estimate.
	plan := &SubscriptionPlan{
		DurationUnit: "day", DurationValue: 1, TotalAmount: 999,
		QuotaResetPeriod: "custom", QuotaResetCustomSeconds: 10 * 3600,
	}
	sub := &UserSubscription{
		StartTime: start.Unix(), EndTime: start.Add(48 * time.Hour).Unix(),
		AmountTotal: 10, AmountUsed: 3,
	}
	got := GetUserSubscriptionQuotaSummary(sub, plan)
	require.Equal(t, &SubscriptionQuotaSummary{TotalAmount: 50, CycleCount: 5}, got)
	require.EqualValues(t, 10, sub.AmountTotal)
	require.EqualValues(t, 3, sub.AmountUsed)

	sub.AmountTotal = 0
	require.EqualValues(t, 0, GetUserSubscriptionQuotaSummary(sub, plan).TotalAmount)
	sub.AmountTotal = 10
	plan.QuotaResetPeriod = "never"
	require.Equal(t, &SubscriptionQuotaSummary{TotalAmount: 10, CycleCount: 1}, GetUserSubscriptionQuotaSummary(sub, plan))
	require.Nil(t, GetUserSubscriptionQuotaSummary(nil, plan))
	require.Nil(t, GetUserSubscriptionQuotaSummary(sub, nil))
	sub.EndTime = sub.StartTime
	require.Nil(t, GetUserSubscriptionQuotaSummary(sub, plan))
}
