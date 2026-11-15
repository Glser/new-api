package controller

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModelMetaFeaturesAreValidatedAndSaved(t *testing.T) {
	db := setupModelListControllerTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Option{}))

	features := `{"version":1,"video":{"input":{"modes":["text","reference"],"reference":{"image":{"max":9},"video":{"max":3},"audio":{"max":1}}},"output":{"resolutions":["720p"],"aspect_ratios":["16:9"],"duration_seconds":[5,10],"defaults":{"resolution":"720p","aspect_ratio":"16:9","duration_seconds":5}},"watermark":{"supported":true,"default":false}}}`
	rejected := callModelMeta(t, CreateModelMeta, http.MethodPost,
		`{"model_name":"video-features","features":"{\"version\":1,\"video\":{\"unknown\":true}}","status":1}`)
	require.False(t, rejected.Success)
	assert.Contains(t, rejected.Message, "invalid features")

	created := callModelMeta(t, CreateModelMeta, http.MethodPost,
		`{"model_name":"video-features","features":`+strconv.Quote(features)+`,"status":1}`)
	require.True(t, created.Success, created.Message)

	var stored model.Model
	require.NoError(t, db.First(&stored, created.Data.Id).Error)
	assert.Equal(t, features, stored.Features)

	updated := callModelMeta(t, UpdateModelMeta, http.MethodPut,
		`{"id":`+strconv.Itoa(created.Data.Id)+`,"model_name":"video-features","features":"","status":1}`)
	require.True(t, updated.Success, updated.Message)
	require.NoError(t, db.First(&stored, created.Data.Id).Error)
	assert.Equal(t, "", stored.Features)
}
