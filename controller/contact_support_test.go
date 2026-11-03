package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetStatusReturnsContactSupportImages(t *testing.T) {
	settings := operation_setting.GetGeneralSetting()
	original := settings.ContactSupportImageURL
	t.Cleanup(func() { settings.ContactSupportImageURL = original })
	for _, value := range []string{"https://example.com/1.png,https://example.com/2.png", ""} {
		settings.ContactSupportImageURL = value
		response := httptest.NewRecorder()
		context, _ := gin.CreateTestContext(response)
		context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
		GetStatus(context)
		var payload struct {
			Success bool `json:"success"`
			Data    struct {
				Images string `json:"contact_support_image_url"`
			} `json:"data"`
		}
		require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
		require.True(t, payload.Success)
		require.Equal(t, value, payload.Data.Images)
	}
}
