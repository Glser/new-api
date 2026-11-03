package operation_setting

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/config"
	"github.com/stretchr/testify/require"
)

func TestLoadContactSupportImagesFromOptions(t *testing.T) {
	original := generalSetting.ContactSupportImageURL
	t.Cleanup(func() { generalSetting.ContactSupportImageURL = original })
	for _, value := range []string{"https://example.com/1.png，https://example.com/2.png", ""} {
		require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{
			"general_setting.contact_support_image_url": value,
		}))
		require.Equal(t, value, GetGeneralSetting().ContactSupportImageURL)
	}
}
