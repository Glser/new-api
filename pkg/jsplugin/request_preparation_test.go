package jsplugin

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestPreparationCapabilityContract(t *testing.T) {
	source := `
export const meta = {apiVersion:1,key:"preparation",name:"Preparation",version:"1.0.0",author:{name:"Test"},models:["model"],fetchMode:"per_task",requiredCapabilities:["asset-import@1"]};
export function buildSubmitRequest(){return {url:"https://example.com/submit"}} export function parseSubmitResponse(){return {taskId:"1"}} export function buildQueryRequest(){return {url:"https://example.com/query"}} export function parseTaskResult(){return {status:"SUCCESS"}}
`
	_, err := CompilePlugin(source, Options{})
	require.ErrorContains(t, err, `assets.buildImportRequest`)
	source += `
export const assets = {buildImportRequest(){return {url:"https://example.com/assets"}}, parseImportResponse(){return {outcome:"imported",providerAssetId:"asset"}}};
`
	plugin, err := CompilePlugin(source, Options{})
	require.NoError(t, err)
	assert.Contains(t, plugin.Meta.RequiredCapabilities, CapabilityAssetImport)
}
