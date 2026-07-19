import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

port = os.environ.get("ZAP_QA_CDP_PORT", "5323")
reference = Path("resources/icon.png")
if not reference.exists():
    reference = Path("renderer/public/icon.png")
data_url = "data:image/png;base64," + base64.b64encode(reference.read_bytes()).decode()

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
    page = browser.contexts[0].pages[0]
    account_id = page.locator(".account-switcher select").input_value()
    result = page.evaluate(
        """async ({ accountId, reference }) => window.zap.aiGenerateImage(
            accountId,
            'Transforme esta referência em um ícone 3D verde sobre uma mesa de escritório moderna, iluminação profissional.',
            { inputReferences: [reference], quality: 'low' }
        )""",
        {"accountId": account_id, "reference": data_url},
    )
    assert result.get("success") is True, result.get("error")
    assert result.get("referenceCount") == 1, result
    print(f"QA_OK real image generation account={account_id} model={result.get('model')} references={result.get('referenceCount')}")
    browser.close()
