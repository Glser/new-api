import { readFileSync, writeFileSync } from "node:fs"

const zhPath = "D:/go/new-api/web/src/i18n/locales/zh.json"
let zh = readFileSync(zhPath, "utf8").replace(/\r\n/g, "\n")
zh = zh.replace(/\n  \},\n\}\n?$/, "\n  }\n}\n")
JSON.parse(zh)
writeFileSync(zhPath, zh)
console.log("zh ok", JSON.parse(zh).translation.hero_title_p1)

for (const file of ["en.json", "zh-TW.json", "ja.json", "fr.json", "ru.json", "vi.json"]) {
  const text = readFileSync(`D:/go/new-api/web/src/i18n/locales/${file}`, "utf8")
  console.log(file, text.includes('\n  "hero_badge_tag"'), JSON.stringify(text.slice(-30)))
}
