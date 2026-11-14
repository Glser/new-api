package jsplugin

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	pluginruntime "github.com/QuantumNous/new-api/pkg/jsplugin"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func (a *TaskAdaptor) hasSubmissionPreparation() bool {
	return a.plugin != nil && (pluginHasCapability(a.plugin, pluginruntime.CapabilityAssetImport) || pluginHasCapability(a.plugin, pluginruntime.CapabilityPrepare))
}

func pluginHasCapability(plugin *pluginruntime.LoadedPlugin, capability string) bool {
	if plugin == nil {
		return false
	}
	return containsString(plugin.Meta.RequiredCapabilities, capability)
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

// PrepareSubmission runs request-time provider preparation after channel
// selection and quota reservation. It deliberately does not persist raw media:
// multipart bytes are streamed to the provider descriptor and become usable to
// later hooks only as provider asset IDs.
func (a *TaskAdaptor) PrepareSubmission(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	if a.plugin == nil {
		return nil
	}
	if pluginHasCapability(a.plugin, pluginruntime.CapabilityAssetImport) {
		if taskErr := a.prepareReferences(c, info); taskErr != nil {
			return taskErr
		}
	}
	if pluginHasCapability(a.plugin, pluginruntime.CapabilityPrepare) {
		if taskErr := a.prepareProvider(c, info); taskErr != nil {
			return taskErr
		}
	}
	// The final generation descriptor is built only after every required
	// preparation step has explicitly succeeded.
	if _, err := a.buildSubmit(c, info); err != nil {
		return service.TaskErrorWrapperLocal(err, "plugin_request_invalid", http.StatusBadRequest)
	}
	return nil
}

func (a *TaskAdaptor) prepareReferences(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	references, ok := requestReferences(c)
	if !ok {
		return nil
	}
	resolved := make([]map[string]any, 0, len(references))
	files := a.submitContext(c, info)["files"].([]map[string]any)
	for index, reference := range references {
		localID, _ := reference["id"].(string)
		if strings.TrimSpace(localID) == "" {
			localID = fmt.Sprintf("reference_%d", index)
		}
		source, _ := reference["source"].(map[string]any)
		sourceType, _ := source["type"].(string)
		field, _ := source["field"].(string)
		var file map[string]any
		if sourceType == "form" {
			for _, candidate := range files {
				if candidate["field"] == field {
					file = candidate
					break
				}
			}
		}
		if file == nil {
			return service.TaskErrorWrapperLocal(fmt.Errorf("reference %s requires a multipart form file", localID), "plugin_reference_invalid", http.StatusBadRequest)
		}
		assetCtx := a.submitContext(c, info)
		assetCtx["asset"] = map[string]any{
			"localId":  localID,
			"kind":     reference["kind"],
			"role":     reference["role"],
			"fileRef":  file["ref"],
			"filename": file["filename"],
			"mimeType": file["mimeType"],
			"size":     file["size"],
		}
		value, err := a.plugin.Engine.CallPath(c.Request.Context(), "assets", []string{"buildImportRequest"}, assetCtx)
		if err != nil {
			return service.TaskErrorWrapperLocal(err, "plugin_asset_import_failed", http.StatusBadGateway)
		}
		var descriptor requestDescriptor
		if err = convert(value, &descriptor); err != nil {
			return service.TaskErrorWrapperLocal(err, "plugin_asset_import_invalid", http.StatusBadGateway)
		}
		response, taskErr := a.executePreparationRequest(c, info, &descriptor)
		if taskErr != nil {
			return taskErr
		}
		value, err = a.plugin.Engine.CallPath(c.Request.Context(), "assets", []string{"parseImportResponse"}, assetCtx, response)
		if err != nil {
			return service.TaskErrorWrapperLocal(err, "plugin_asset_import_failed", http.StatusBadGateway)
		}
		outcome, _ := value.(map[string]any)
		outcomeName, _ := outcome["outcome"].(string)
		if outcomeName != "imported" {
			return rejectedPreparationError(outcome, "asset import was not confirmed")
		}
		providerAssetID, _ := outcome["providerAssetId"].(string)
		if strings.TrimSpace(providerAssetID) == "" {
			return service.TaskErrorWrapperLocal(fmt.Errorf("plugin asset import returned an empty providerAssetId"), "plugin_asset_import_invalid", http.StatusBadGateway)
		}
		entry := map[string]any{
			"localId":         localID,
			"kind":            reference["kind"],
			"role":            reference["role"],
			"providerAssetId": providerAssetID,
		}
		if metadata, exists := outcome["providerMetadata"]; exists {
			entry["providerMetadata"] = metadata
		}
		resolved = append(resolved, entry)
	}
	c.Set("task_resolved_references", resolved)
	return nil
}

func (a *TaskAdaptor) prepareProvider(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	ctx := a.submitContext(c, info)
	value, err := a.plugin.Engine.CallPath(c.Request.Context(), "prepare", []string{"buildRequest"}, ctx)
	if err != nil {
		return service.TaskErrorWrapperLocal(err, "plugin_prepare_failed", http.StatusBadGateway)
	}
	var descriptor requestDescriptor
	if err = convert(value, &descriptor); err != nil {
		return service.TaskErrorWrapperLocal(err, "plugin_prepare_invalid", http.StatusBadGateway)
	}
	response, taskErr := a.executePreparationRequest(c, info, &descriptor)
	if taskErr != nil {
		return taskErr
	}
	value, err = a.plugin.Engine.CallPath(c.Request.Context(), "prepare", []string{"parseResponse"}, ctx, response)
	if err != nil {
		return service.TaskErrorWrapperLocal(err, "plugin_prepare_failed", http.StatusBadGateway)
	}
	outcome, _ := value.(map[string]any)
	outcomeName, _ := outcome["outcome"].(string)
	if outcomeName != "prepared" {
		return rejectedPreparationError(outcome, "provider preparation was not confirmed")
	}
	state, exists := outcome["state"]
	if !exists || state == nil {
		return service.TaskErrorWrapperLocal(fmt.Errorf("plugin prepare returned no state"), "plugin_prepare_invalid", http.StatusBadGateway)
	}
	c.Set("task_prepare_state", state)
	return nil
}

func (a *TaskAdaptor) executePreparationRequest(c *gin.Context, info *relaycommon.RelayInfo, descriptor *requestDescriptor) (map[string]any, *dto.TaskError) {
	if descriptor.ResponseType == "" {
		descriptor.ResponseType = "json"
	}
	if descriptor.ResponseType != "json" {
		return nil, service.TaskErrorWrapperLocal(fmt.Errorf("preparation descriptor supports JSON only"), "plugin_prepare_invalid", http.StatusBadGateway)
	}
	if strings.TrimSpace(descriptor.URL) == "" {
		return nil, service.TaskErrorWrapperLocal(fmt.Errorf("preparation descriptor returned an empty URL"), "plugin_prepare_invalid", http.StatusBadGateway)
	}
	if err := pluginruntime.ValidateRequestURL(descriptor.URL, info.ChannelBaseUrl, a.plugin.Meta.AllowedHosts); err != nil {
		return nil, service.TaskErrorWrapperLocal(err, "plugin_prepare_invalid", http.StatusBadRequest)
	}
	previous := a.submit
	a.submit = descriptor
	defer func() { a.submit = previous }()
	body, err := a.BuildRequestBody(c, info)
	if err != nil {
		return nil, service.TaskErrorWrapperLocal(err, "plugin_prepare_invalid", http.StatusBadRequest)
	}
	resp, err := a.DoRequest(c, info, body)
	if err != nil {
		return nil, service.TaskErrorWrapper(err, "plugin_prepare_failed", http.StatusBadGateway)
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, service.TaskErrorWrapper(fmt.Errorf("%s", strings.TrimSpace(string(raw))), "plugin_prepare_failed", resp.StatusCode)
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxTaskPluginPersistedJSONBytes+1))
	if err != nil {
		return nil, service.TaskErrorWrapper(err, "plugin_prepare_failed", http.StatusBadGateway)
	}
	if len(raw) > maxTaskPluginPersistedJSONBytes {
		return nil, service.TaskErrorWrapperLocal(fmt.Errorf("preparation response exceeds size limit"), "plugin_prepare_failed", http.StatusBadGateway)
	}
	headers := map[string][]string{}
	for name, values := range resp.Header {
		headers[name] = append([]string(nil), values...)
	}
	var decoded any
	if len(raw) > 0 && common.Unmarshal(raw, &decoded) == nil {
		return map[string]any{"statusCode": resp.StatusCode, "headers": headers, "body": decoded}, nil
	}
	return map[string]any{"statusCode": resp.StatusCode, "headers": headers, "body": string(raw)}, nil
}

func requestReferences(c *gin.Context) ([]map[string]any, bool) {
	requestValue, exists := c.Get("task_request")
	if !exists {
		return nil, false
	}
	request, ok := requestValue.(map[string]any)
	if !ok {
		return nil, false
	}
	metadata, _ := request["metadata"].(map[string]any)
	rawReferences, _ := metadata["references"].([]any)
	if len(rawReferences) == 0 {
		return nil, false
	}
	references := make([]map[string]any, 0, len(rawReferences))
	for _, raw := range rawReferences {
		reference, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		references = append(references, reference)
	}
	return references, len(references) > 0
}

func rejectedPreparationError(outcome map[string]any, fallback string) *dto.TaskError {
	if outcome == nil {
		return service.TaskErrorWrapperLocal(errors.New(fallback), "plugin_prepare_failed", http.StatusBadGateway)
	}
	message, _ := outcome["message"].(string)
	if strings.TrimSpace(message) == "" {
		message = fallback
	}
	code, _ := outcome["code"].(string)
	if strings.TrimSpace(code) == "" {
		code = "plugin_prepare_failed"
	}
	return service.TaskErrorWrapperLocal(fmt.Errorf("%s", message), code, http.StatusBadGateway)
}
