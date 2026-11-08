package controller

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/model_plaza_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateOptionRejectsInvalidRequestExamples(t *testing.T) {
	value := `{"openai":{"auth":"basic","body":{}}}`
	body := `{"key":"` + model_plaza_setting.RequestExamplesOptionKey + `","value":` + strconv.Quote(value) + `}`

	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/option/", strings.NewReader(body))

	UpdateOption(context)

	var payload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	assert.False(t, payload.Success)
	assert.Contains(t, payload.Message, "auth")
}

func TestGetDefaultRequestExamplesEndpoint(t *testing.T) {
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/option/request_examples/defaults", nil)

	GetDefaultRequestExamples(context)

	var payload struct {
		Success bool                                          `json:"success"`
		Data    map[string]model_plaza_setting.RequestExample `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	require.True(t, payload.Success)
	require.Equal(t, model_plaza_setting.AuthXAPIKey, payload.Data["anthropic"].Auth)
	require.Contains(t, payload.Data["jina-rerank"].Body, "query")
}
