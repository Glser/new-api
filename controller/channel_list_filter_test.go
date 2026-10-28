/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestParseStatusFilter(t *testing.T) {
	t.Parallel()

	tests := []struct {
		in   string
		want int
	}{
		{in: "", want: -1},
		{in: "all", want: -1},
		{in: "enabled", want: common.ChannelStatusEnabled},
		{in: "ENABLED", want: common.ChannelStatusEnabled},
		{in: "1", want: common.ChannelStatusEnabled},
		{in: "disabled", want: 0},
		{in: "0", want: 0},
		{in: "manually_disabled", want: common.ChannelStatusManuallyDisabled},
		{in: "manual", want: common.ChannelStatusManuallyDisabled},
		{in: "2", want: common.ChannelStatusManuallyDisabled},
		{in: "auto_disabled", want: common.ChannelStatusAutoDisabled},
		{in: "auto", want: common.ChannelStatusAutoDisabled},
		{in: "3", want: common.ChannelStatusAutoDisabled},
	}

	for _, test := range tests {
		t.Run(test.in, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, test.want, parseStatusFilter(test.in))
		})
	}
}

func TestParseTagFilter(t *testing.T) {
	t.Parallel()

	tag, untagged := parseTagFilter("")
	require.Equal(t, "", tag)
	require.False(t, untagged)

	tag, untagged = parseTagFilter("  prod  ")
	require.Equal(t, "prod", tag)
	require.False(t, untagged)

	tag, untagged = parseTagFilter(untaggedTagFilter)
	require.Equal(t, "", tag)
	require.True(t, untagged)
}

func TestFilterSearchedChannelsByFacets(t *testing.T) {
	t.Parallel()

	prod := "prod"
	backup := "backup"
	channels := []*model.Channel{
		{Id: 1, Type: 1, Status: common.ChannelStatusEnabled, Tag: &prod},
		{Id: 2, Type: 1, Status: common.ChannelStatusAutoDisabled, Tag: &prod},
		{Id: 3, Type: 14, Status: common.ChannelStatusManuallyDisabled, Tag: &backup},
		{Id: 4, Type: 14, Status: common.ChannelStatusEnabled, Tag: nil},
	}

	autoDisabled := filterSearchedChannels(channels, common.ChannelStatusAutoDisabled, -1, "", false)
	require.Len(t, autoDisabled, 1)
	require.Equal(t, 2, autoDisabled[0].Id)

	openai := filterSearchedChannels(channels, -1, 1, "", false)
	require.Len(t, openai, 2)

	untagged := filterSearchedChannels(channels, -1, -1, "", true)
	require.Len(t, untagged, 1)
	require.Equal(t, 4, untagged[0].Id)

	prodChannels := filterSearchedChannels(channels, -1, -1, "prod", false)
	require.Len(t, prodChannels, 2)

	facets := countSearchFacets(channels, -1, -1, "", false)
	require.Equal(t, int64(2), facets.TypeCounts[1])
	require.Equal(t, int64(2), facets.TypeCounts[14])
	require.Equal(t, int64(2), facets.StatusCounts[int64(common.ChannelStatusEnabled)])
	require.Equal(t, int64(1), facets.StatusCounts[int64(common.ChannelStatusAutoDisabled)])
	require.Equal(t, int64(1), facets.UntaggedCount)
	require.Equal(t, int64(2), facets.TagCounts["prod"])
	require.Equal(t, int64(1), facets.TagCounts["backup"])

	openaiFacets := countSearchFacets(channels, -1, 1, "", false)
	require.Equal(t, int64(2), openaiFacets.TypeCounts[1])
	require.Equal(t, int64(1), openaiFacets.StatusCounts[int64(common.ChannelStatusEnabled)])
	require.Equal(t, int64(1), openaiFacets.StatusCounts[int64(common.ChannelStatusAutoDisabled)])
	require.Equal(t, int64(0), openaiFacets.UntaggedCount)
	require.Equal(t, int64(2), openaiFacets.TagCounts["prod"])
}
