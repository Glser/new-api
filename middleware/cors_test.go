package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func corsPreflight(handler gin.HandlerFunc, origin string, headers string) *httptest.ResponseRecorder {
	router := gin.New()
	router.Use(handler)
	router.GET("/resource", func(c *gin.Context) { c.Status(http.StatusOK) })
	request := httptest.NewRequest(http.MethodOptions, "/resource", nil)
	request.Header.Set("Origin", origin)
	request.Header.Set("Access-Control-Request-Method", http.MethodGet)
	request.Header.Set("Access-Control-Request-Headers", headers)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	return recorder
}

func TestDashboardCORSAcceptsConfiguredCredentialedOrigins(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", " https://api.oioi.lat, https://flow.oioi.lat, ")
	for _, origin := range []string{"https://api.oioi.lat", "https://flow.oioi.lat"} {
		response := corsPreflight(DashboardCORS(), origin, "authorization,content-type,x-auth-session,cache-control")
		require.Equal(t, http.StatusNoContent, response.Code)
		require.Equal(t, origin, response.Header().Get("Access-Control-Allow-Origin"))
		require.Equal(t, "true", response.Header().Get("Access-Control-Allow-Credentials"))
		for _, header := range []string{"Authorization", "Content-Type", "X-Auth-Session", "Cache-Control"} {
			require.Contains(t, response.Header().Get("Access-Control-Allow-Headers"), header)
		}
	}
}

func TestDashboardCORSRejectsUnlistedOrigins(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://flow.oioi.lat")
	response := corsPreflight(DashboardCORS(), "https://unlisted.example", "authorization")
	require.Equal(t, http.StatusForbidden, response.Code)
	require.Empty(t, response.Header().Get("Access-Control-Allow-Origin"))
}

func TestDashboardCORSRetainsUnsetCompatibility(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", " , ")
	response := corsPreflight(DashboardCORS(), "http://localhost:3100", "authorization")
	require.Equal(t, http.StatusNoContent, response.Code)
	require.Equal(t, "*", response.Header().Get("Access-Control-Allow-Origin"))
}

func TestRelayCORSIsIndependentOfDashboardOrigins(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://flow.oioi.lat")
	response := corsPreflight(CORS(), "https://existing-relay-client.example", "x-api-key,anthropic-version")
	require.Equal(t, http.StatusNoContent, response.Code)
	require.Equal(t, "*", response.Header().Get("Access-Control-Allow-Origin"))
	require.Equal(t, "*", response.Header().Get("Access-Control-Allow-Headers"))
}
