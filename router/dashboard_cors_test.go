package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestDashboardPreflightUsesScopedCORSWithRelayRouter(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://flow.oioi.lat")
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	SetApiRouter(engine)
	SetRelayRouter(engine)

	for _, path := range []string{"/api/user/auth/refresh", "/api/token/", "/api/token/123/key"} {
		for _, origin := range []string{"https://flow.oioi.lat", "https://unlisted.example"} {
			t.Run(path+"/"+origin, func(t *testing.T) {
				request := httptest.NewRequest(http.MethodOptions, path, nil)
				request.Header.Set("Origin", origin)
				request.Header.Set("Access-Control-Request-Method", http.MethodPost)
				request.Header.Set("Access-Control-Request-Headers", "authorization,content-type,x-auth-session,cache-control")
				response := httptest.NewRecorder()
				engine.ServeHTTP(response, request)
				if origin == "https://unlisted.example" {
					require.Equal(t, http.StatusForbidden, response.Code)
					require.Empty(t, response.Header().Get("Access-Control-Allow-Origin"))
					return
				}
				require.Equal(t, http.StatusNoContent, response.Code)
				require.Equal(t, origin, response.Header().Get("Access-Control-Allow-Origin"))
				require.Equal(t, "true", response.Header().Get("Access-Control-Allow-Credentials"))
				require.Contains(t, response.Header().Get("Access-Control-Allow-Headers"), "Cache-Control")
			})
		}
	}

	request := httptest.NewRequest(http.MethodOptions, "/v1/chat/completions", nil)
	request.Header.Set("Origin", "https://existing-relay-client.example")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, request)
	require.Equal(t, http.StatusNoContent, response.Code)
	require.Equal(t, "*", response.Header().Get("Access-Control-Allow-Origin"))
}
