import base64
import os
from playwright.sync_api import sync_playwright


port = os.environ.get("ZAP_QA_CDP_PORT", "5325")
provider = os.environ.get("ZAP_QA_VOICE_PROVIDER", "")
model = os.environ.get("ZAP_QA_VOICE_MODEL", "")
voice = os.environ.get("ZAP_QA_VOICE_NAME", "")

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
    page = browser.contexts[0].pages[0]
    account_id = page.locator(".account-switcher select").input_value()
    result = page.evaluate(
        """async ({accountId, provider, model, voice}) => window.zap.aiGenerateWhatsAppSpeech(
            accountId,
            'Olá! Este é um teste de voz em português do Zap Mágico.',
            Object.fromEntries(Object.entries({provider, model, voice}).filter(([, value]) => value))
        )""",
        {"accountId": account_id, "provider": provider, "model": model, "voice": voice},
    )
    if not result.get("success"):
        raise AssertionError(result.get("error"))
    audio_size = len(result.get("base64", ""))
    assert audio_size > 1000, result
    assert result.get("audioFormat") == "ogg", result
    assert result.get("whatsappReady") is True, result
    assert base64.b64decode(result["base64"])[:4] == b"OggS", result
    transcript = page.evaluate(
        """async ({accountId, audio}) => window.zap.aiTranscribeAudio(accountId, audio, 'ogg')""",
        {"accountId": account_id, "audio": result["base64"]},
    )
    assert transcript.get("success") is True, transcript.get("error")
    assert transcript.get("text"), transcript
    print(
        "QA_OK real voice generation "
        f"account={account_id} model={result.get('model')} "
        f"voice={result.get('voice')} base64_size={audio_size} stt=ok"
    )
    browser.close()
