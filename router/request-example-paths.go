package router

import (
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

type requestExamplePath struct {
	Path    string   `json:"path"`
	Methods []string `json:"methods"`
}

// Read routes at request time: SetApiRouter runs before the relay routers.
func requestExamplePathsHandler(engine *gin.Engine) gin.HandlerFunc {
	return func(c *gin.Context) {
		common.ApiSuccess(c, collectRequestExamplePaths(engine.Routes()))
	}
}

// The catalog describes built-in HTTP relay endpoints, not protocol defaults.
// Plugin-defined routes are dispatched separately and retain custom path input.
func collectRequestExamplePaths(routes gin.RoutesInfo) []requestExamplePath {
	paths := make(map[string]map[string]bool)
	for _, route := range routes {
		if !isRequestExampleRoute(route) {
			continue
		}
		for _, path := range requestExampleRoutePaths(route.Path) {
			if paths[path] == nil {
				paths[path] = make(map[string]bool)
			}
			paths[path][route.Method] = true
		}
	}
	result := make([]requestExamplePath, 0, len(paths))
	for path, available := range paths {
		methods := make([]string, 0, len(available))
		// Prefer submission when a path supports both submission and retrieval.
		for _, method := range []string{"POST", "GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"} {
			if available[method] {
				methods = append(methods, method)
			}
		}
		result = append(result, requestExamplePath{Path: path, Methods: methods})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Path < result[j].Path })
	return result
}

func isRequestExampleRoute(route gin.RouteInfo) bool {
	// Realtime requires a WebSocket handshake and cannot use the HTTP sample.
	if route.Path == "/v1/realtime" || strings.HasSuffix(route.Handler, ".RelayNotImplemented") {
		return false
	}
	for _, prefix := range []string{"/v1/", "/v1beta/", "/mj/", "/:mode/mj/"} {
		if strings.HasPrefix(route.Path, prefix) {
			return true
		}
	}
	return false
}

func requestExampleRoutePaths(path string) []string {
	// Gin registers Gemini actions under one wildcard. Expand the actions
	// handled by GeminiHandler and GeminiEmbeddingHandler into usable templates.
	if path == "/v1/models/*path" || path == "/v1beta/models/*path" {
		base := strings.TrimSuffix(path, "*path") + "{model}:"
		return []string{
			base + "generateContent",
			base + "streamGenerateContent?alt=sse",
			base + "embedContent",
			base + "batchEmbedContents",
		}
	}
	segments := strings.Split(path, "/")
	for i, segment := range segments {
		if strings.HasPrefix(segment, "*") {
			// An unknown wildcard has no concrete sample URL.
			return nil
		}
		if strings.HasPrefix(segment, ":") {
			segments[i] = "{" + strings.TrimPrefix(segment, ":") + "}"
		}
	}
	return []string{strings.Join(segments, "/")}
}
