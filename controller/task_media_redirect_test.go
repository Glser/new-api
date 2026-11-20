package controller

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTaskMediaRedirectClientStripsProviderCredentialsWhenAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(nil)
	c.Request, _ = http.NewRequest(http.MethodGet, "http://127.0.0.1/video", nil)
	client := taskMediaRedirectClient(&http.Client{}, "", c, map[string]string{"Range": "bytes=0-1"}, false, true)
	require.NotNil(t, client.CheckRedirect)

	origin, err := http.NewRequest(http.MethodGet, "https://93.184.215.33/files/1", nil)
	require.NoError(t, err)
	redirect, err := http.NewRequest(http.MethodGet, "https://93.184.216.34/files/1?signature=test", nil)
	require.NoError(t, err)
	redirect.Header.Set("Authorization", "Bearer provider-secret")
	redirect.Header.Set("Range", "bytes=0-1")

	require.NoError(t, client.CheckRedirect(redirect, []*http.Request{origin}))
	assert.Empty(t, redirect.Header.Get("Authorization"))
	assert.Equal(t, "bytes=0-1", redirect.Header.Get("Range"))
}

func TestTaskMediaRedirectClientRejectsCredentialedCrossOriginByDefault(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(nil)
	c.Request, _ = http.NewRequest(http.MethodGet, "http://127.0.0.1/video", nil)
	client := taskMediaRedirectClient(&http.Client{}, "", c, nil, false, false)
	require.NotNil(t, client.CheckRedirect)

	origin, err := http.NewRequest(http.MethodGet, "https://93.184.215.33/files/1", nil)
	require.NoError(t, err)
	redirect, err := http.NewRequest(http.MethodGet, "https://93.184.216.34/files/1?signature=test", nil)
	require.NoError(t, err)
	redirect.Header.Set("Authorization", "Bearer provider-secret")

	err = client.CheckRedirect(redirect, []*http.Request{origin})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "credentialed cross-origin redirect")
	assert.Equal(t, "Bearer provider-secret", redirect.Header.Get("Authorization"))
}
