package model

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const validModelFeatures = `{
  "version": 1,
  "video": {
    "input": {
      "modes": ["text", "frames", "reference"],
      "frames": {
        "image": {
          "min": 1,
          "max": 2,
          "roles": ["first_frame", "last_frame"]
        }
      },
      "reference": {
        "image": {"min": 0, "max": 9},
        "video": {"min": 0, "max": 3},
        "audio": {"min": 0, "max": 1}
      }
    },
    "output": {
      "resolutions": ["480p", "720p", "768p", "1080p"],
      "aspect_ratios": ["16:9", "9:16"],
      "duration_seconds": [5, 10],
      "defaults": {
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "duration_seconds": 5
      },
      "resolution_constraints": {
        "1080p": {"aspect_ratios": ["16:9"]}
      },
      "size_overrides": {
        "768p|16:9": "1366x768"
      }
    },
    "generate_audio": {"supported": true, "default": true},
    "watermark": {"supported": true, "default": false}
  }
}`

func TestValidateModelFeaturesAcceptsCompactVideoCapabilities(t *testing.T) {
	assert.NoError(t, ValidateModelFeatures(validModelFeatures))
	assert.NoError(t, ValidateModelFeatures(""))
}

func TestValidateModelFeaturesRejectsInvalidCapabilities(t *testing.T) {
	testCases := []struct {
		name string
		raw  string
	}{
		{name: "version required", raw: `{"video":{}}`},
		{name: "unknown field", raw: `{"version":1,"unknown":true}`},
		{name: "unknown input mode", raw: `{"version":1,"video":{"input":{"modes":["magic"]}}}`},
		{name: "count reversed", raw: `{"version":1,"video":{"input":{"modes":["reference"],"reference":{"image":{"min":2,"max":1}}}}}`},
		{name: "unsupported media", raw: `{"version":1,"video":{"input":{"modes":["reference"],"reference":{"pdf":{"max":1}}}}}`},
		{name: "invalid ratio", raw: `{"version":1,"video":{"output":{"aspect_ratios":["16 by 9"]}}}`},
		{name: "invalid duration", raw: `{"version":1,"video":{"output":{"duration_seconds":[0]}}}`},
		{name: "default outside allowed values", raw: `{"version":1,"video":{"output":{"resolutions":["720p"],"defaults":{"resolution":"1080p"}}}}`},
		{name: "constraint outside global values", raw: `{"version":1,"video":{"output":{"resolutions":["1080p"],"aspect_ratios":["16:9"],"resolution_constraints":{"1080p":{"aspect_ratios":["9:16"]}}}}}`},
		{name: "invalid size override", raw: `{"version":1,"video":{"output":{"resolutions":["768p"],"aspect_ratios":["16:9"],"size_overrides":{"768p|16:9":"wide"}}}}`},
		{name: "switch default without support", raw: `{"version":1,"video":{"watermark":{"supported":false,"default":true}}}`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Error(t, ValidateModelFeatures(testCase.raw))
		})
	}
}

func TestPricingReturnsParsedModelFeatures(t *testing.T) {
	resetPricingEndpointTestTables(t)

	channel := &Channel{
		Id:     501,
		Type:   constant.ChannelTypeOpenAI,
		Key:    "test-key",
		Status: 1,
		Name:   "feature-channel",
	}
	require.NoError(t, DB.Create(channel).Error)
	require.NoError(t, DB.Create(&Ability{
		Group:     "default",
		Model:     "feature-video-model",
		ChannelId: channel.Id,
		Enabled:   true,
	}).Error)
	require.NoError(t, DB.Create(&Model{
		ModelName: "feature-video-model",
		Category:  "video",
		Features:  validModelFeatures,
		Status:    1,
		NameRule:  NameRuleExact,
	}).Error)

	pricing := GetPricing()
	var found *Pricing
	for index := range pricing {
		if pricing[index].ModelName == "feature-video-model" {
			found = &pricing[index]
			break
		}
	}
	require.NotNil(t, found)
	require.NotNil(t, found.Features)
	video, ok := found.Features["video"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "video", found.Category)
	assert.Equal(t, float64(1), found.Features["version"])

	input, ok := video["input"].(map[string]any)
	require.True(t, ok)
	reference, ok := input["reference"].(map[string]any)
	require.True(t, ok)
	image, ok := reference["image"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, float64(9), image["max"])
}
