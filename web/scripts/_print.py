from pathlib import Path
import sys
sys.stdout.reconfigure(encoding="utf-8")
p = Path(r"web/src/features/usage-logs/components/dialogs/details-dialog.tsx")
lines = p.read_text(encoding="utf-8").splitlines()
for i, line in enumerate(lines[160:450], 161):
    print(f"{i}: {line}")
