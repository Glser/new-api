package controller

import (
	"encoding/json"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

const channelTopologyLayoutOptionKey = "ChannelTopologyLayout"
const maxChannelTopologyLayoutBytes = 1 << 20

func emptyChannelTopologyLayout() map[string]any {
	return map[string]any{
		"version":   1,
		"viewport":  map[string]any{},
		"positions": map[string]any{},
		"collapsed": map[string]any{},
	}
}

func GetChannelTopologyLayout(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	value := common.OptionMap[channelTopologyLayoutOptionKey]
	common.OptionMapRWMutex.RUnlock()

	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		common.ApiSuccess(c, emptyChannelTopologyLayout())
		return
	}

	var parsed any
	if err := json.Unmarshal([]byte(trimmed), &parsed); err != nil {
		common.ApiSuccess(c, emptyChannelTopologyLayout())
		return
	}
	common.ApiSuccess(c, parsed)
}

func UpdateChannelTopologyLayout(c *gin.Context) {
	raw, err := c.GetRawData()
	if err != nil || len(raw) == 0 {
		common.ApiErrorMsg(c, "invalid layout")
		return
	}
	if len(raw) > maxChannelTopologyLayoutBytes {
		common.ApiErrorMsg(c, "layout too large")
		return
	}

	var parsed map[string]any
	if err := json.Unmarshal(raw, &parsed); err != nil {
		common.ApiErrorMsg(c, "invalid layout")
		return
	}
	if _, ok := parsed["version"]; !ok {
		parsed["version"] = 1
	}

	compact, err := json.Marshal(parsed)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateOption(channelTopologyLayoutOptionKey, string(compact)); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, parsed)
}
