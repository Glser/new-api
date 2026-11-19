package router

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// Both Gin parameters and frontend template substitutions identify the same
// route shape. Ignore only a trailing slash and query parameters, not methods.
func frontendSecurityRouteKey(method, path string) string {
	path, _, _ = strings.Cut(path, "?")
	parts := strings.Split(strings.TrimSuffix(path, "/"), "/")
	for i, part := range parts {
		if strings.HasPrefix(part, ":") || strings.HasPrefix(part, "${") {
			parts[i] = ":parameter"
		}
	}
	return strings.ToUpper(method) + " " + strings.Join(parts, "/")
}

// Keep the retained/customized frontend API clients aligned with the actual
// merged backend router. Backend-only tests cannot detect removed URLs that
// an older frontend still calls.
func TestFrontendSecurityClientsUseRegisteredRoutes(t *testing.T) {
	engine := newAccessTokenScopeTestEngine(t)
	routes := make(map[string]bool)
	for _, route := range engine.Routes() {
		routes[frontendSecurityRouteKey(route.Method, route.Path)] = true
	}
	calls := regexp.MustCompile("(?s)api\\.(get|post|put|patch|delete)(?:<.*?>)?\\(\\s*['\"`]([^'\"`]+)['\"`]")
	for _, file := range []string{
		"features/security/api.ts",
		"features/users/api.ts",
	} {
		t.Run(file, func(t *testing.T) {
			content, err := os.ReadFile(filepath.Join("..", "web", "src", filepath.FromSlash(file)))
			if err != nil {
				t.Fatal(err)
			}
			matches := calls.FindAllStringSubmatch(string(content), -1)
			if len(matches) == 0 {
				t.Fatal("no frontend API calls found; update the contract scanner")
			}
			for _, match := range matches {
				key := frontendSecurityRouteKey(match[1], match[2])
				if !routes[key] {
					t.Errorf("frontend calls an unregistered backend route: %s", key)
				}
			}
			t.Logf("checked %d frontend API routes", len(matches))
		})
	}
}
