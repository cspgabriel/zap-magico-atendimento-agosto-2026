import os
from playwright.sync_api import sync_playwright

port = os.environ.get("ZAP_QA_CDP_PORT", "5322")

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
    page = browser.contexts[0].pages[0]
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.evaluate("localStorage.setItem('zap-ai-guide-seen-v2','1')")
    page.reload(wait_until="domcontentloaded")
    page.get_by_label("Ativar tema claro").wait_for()
    page.get_by_label("Ativar tema claro").click()
    page.get_by_label("Ativar tema escuro").wait_for()
    page.get_by_label("Ativar tema escuro").click()
    select_colors = page.locator(".account-switcher select option").first.evaluate("el => { const s=getComputedStyle(el); return [s.color,s.backgroundColor] }")
    assert select_colors[0] != select_colors[1], select_colors
    page.get_by_role("button", name="Assistente IA", exact=True).click()
    page.get_by_role("button", name="Foto e voz", exact=False).click()
    page.get_by_text("Foto, voz e audição", exact=True).wait_for()
    page.get_by_role("button", name="Atualizar modelos").wait_for(timeout=60000)
    page.get_by_label("Provedor de imagem").wait_for()
    page.get_by_label("Provedor de voz").wait_for()
    page.get_by_label("Provedor de transcrição").wait_for()
    page.get_by_role("switch", name="Ouvir áudios").wait_for()
    page.screenshot(path="release/qa-packaged-media-1.4.2.png", full_page=True)
    assert not errors, errors
    print("QA_OK packaged theme selector media providers image-to-image voice transcription")
    browser.close()
