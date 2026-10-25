package controller

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestGetSubscriptionPlansIncludesQuotaPreview(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	previousDB := model.DB
	model.DB = db
	payment := operation_setting.GetPaymentSetting()
	previousPayment := *payment
	t.Cleanup(func() {
		model.DB = previousDB
		*payment = previousPayment
		sqlDB, closeErr := db.DB()
		if closeErr == nil {
			_ = sqlDB.Close()
		}
	})
	payment.ComplianceConfirmed = true
	payment.ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion
	require.NoError(t, db.AutoMigrate(&model.SubscriptionPlan{}))
	plan := model.SubscriptionPlan{
		Title: "Test day plan", Enabled: true, DurationUnit: "day", DurationValue: 1,
		QuotaResetPeriod: "custom", QuotaResetCustomSeconds: 10 * 3600, TotalAmount: 50,
	}
	require.NoError(t, db.Create(&plan).Error)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/subscription/plans", nil)
	GetSubscriptionPlans(c)
	require.Equal(t, 200, w.Code)
	var response struct {
		Success bool                  `json:"success"`
		Data    []SubscriptionPlanDTO `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	require.True(t, response.Success)
	require.Len(t, response.Data, 1)
	require.EqualValues(t, 50, response.Data[0].Plan.TotalAmount)
	require.NotNil(t, response.Data[0].QuotaSummary)
	require.EqualValues(t, 150, response.Data[0].QuotaSummary.TotalAmount)
	require.EqualValues(t, 3, response.Data[0].QuotaSummary.CycleCount)
}

func TestPopulateSubscriptionQuotaSummaries(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	previousDB := model.DB
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		sqlDB, closeErr := db.DB()
		if closeErr == nil {
			_ = sqlDB.Close()
		}
	})
	require.NoError(t, db.AutoMigrate(&model.SubscriptionPlan{}))
	// Disabled plans still describe subscriptions that were purchased earlier.
	plan := model.SubscriptionPlan{
		Title: "Purchased plan", Enabled: false, TotalAmount: 500,
		DurationUnit: "day", DurationValue: 1,
		QuotaResetPeriod: "custom", QuotaResetCustomSeconds: 10 * 3600,
	}
	require.NoError(t, db.Create(&plan).Error)
	start := time.Date(2026, time.October, 25, 18, 0, 0, 0, time.UTC).Unix()
	sub := &model.UserSubscription{PlanId: plan.Id, AmountTotal: 10, StartTime: start, EndTime: start + 48*3600}
	all := []model.SubscriptionSummary{
		{Subscription: sub},
		{Subscription: &model.UserSubscription{PlanId: plan.Id + 100, AmountTotal: 10, StartTime: start, EndTime: start + 86400}},
	}
	active := []model.SubscriptionSummary{{Subscription: sub}}
	populateSubscriptionQuotaSummaries(all, active)
	require.EqualValues(t, 50, all[0].QuotaSummary.TotalAmount)
	require.EqualValues(t, 5, all[0].QuotaSummary.CycleCount)
	require.Equal(t, all[0].QuotaSummary, active[0].QuotaSummary)
	require.Nil(t, all[1].QuotaSummary)
}
