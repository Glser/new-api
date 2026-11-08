package controller

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type modelMetaResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    model.Model `json:"data"`
}

func callModelMeta(t *testing.T, handler gin.HandlerFunc, method string, body string) modelMetaResponse {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(method, "/api/models/", strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")
	handler(ctx)

	var resp modelMetaResponse
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &resp), recorder.Body.String())
	return resp
}

func TestModelMetaCategoryIsValidatedAndSaved(t *testing.T) {
	db := setupModelListControllerTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Option{}))

	rejected := callModelMeta(t, CreateModelMeta, http.MethodPost,
		`{"model_name":"tts-1","category":"no-such-category","status":1}`)
	require.False(t, rejected.Success)
	require.Contains(t, rejected.Message, "no-such-category")

	created := callModelMeta(t, CreateModelMeta, http.MethodPost,
		`{"model_name":"tts-1","category":"audio","status":1}`)
	require.True(t, created.Success, created.Message)

	var stored model.Model
	require.NoError(t, db.First(&stored, created.Data.Id).Error)
	require.Equal(t, "audio", stored.Category)

	// 清空分类表示改回自动推算，更新时需要把空值写回数据库
	updated := callModelMeta(t, UpdateModelMeta, http.MethodPut,
		`{"id":`+strconv.Itoa(created.Data.Id)+`,"model_name":"tts-1","category":"","status":1}`)
	require.True(t, updated.Success, updated.Message)
	require.NoError(t, db.First(&stored, created.Data.Id).Error)
	require.Equal(t, "", stored.Category)
}
