import os
from playwright.sync_api import sync_playwright

port = os.environ.get("ZAP_QA_CDP_PORT", "5317")

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
    context = browser.contexts[0]
    page = context.pages[0]
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.wait_for_load_state("domcontentloaded")
    page.evaluate("localStorage.setItem('zap-ai-guide-seen-v2', '1')")
    page.reload(wait_until="domcontentloaded")
    def open_manager():
        page.get_by_title("Gerenciar contas WhatsApp").evaluate("element => element.click()")

    open_manager()
    page.get_by_label("Nome da nova conta").fill("Conta QA")
    page.get_by_role("button", name="Adicionar e conectar").click()
    page.locator(".qr-frame img").wait_for(timeout=45000)
    page.get_by_role("button", name="Cancelar conexão").click()
    page.get_by_text("Desconectado", exact=True).wait_for(timeout=15000)

    open_manager()
    row = page.locator(".account-row").filter(has_text="Conta QA")
    row.get_by_role("button", name="Conectar").click()
    page.locator(".qr-frame img").wait_for(timeout=45000)
    page.get_by_role("button", name="Cancelar conexão").click()
    open_manager()
    page.on("dialog", lambda dialog: dialog.accept())
    row = page.locator(".account-row").filter(has_text="Conta QA")
    row.get_by_title("Excluir conta").click()
    row.wait_for(state="detached", timeout=15000)
    page.screenshot(path="release/qa-accounts-1.3.1.png", full_page=True)
    assert not errors, errors
    print("QA_OK electron real IPC create QR disconnect reconnect delete")
    browser.close()
