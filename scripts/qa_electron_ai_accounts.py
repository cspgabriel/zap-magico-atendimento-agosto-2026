import os
from playwright.sync_api import sync_playwright

port = os.environ.get("ZAP_QA_CDP_PORT", "5317")

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
    page = browser.contexts[0].pages[0]
    page.wait_for_load_state("domcontentloaded")
    result = page.evaluate("""async () => {
      await window.zap.aiSaveConfig('qa-account-a', {systemPrompt:'Prompt exclusivo A', assistantMode:'personal', adminNumber:'+55 (21) 99999-9999', allowGroups:true, authorizedGroups:['120363000000001@g.us'], responseLength:'medium'});
      await window.zap.aiSaveConfig('qa-account-b', {systemPrompt:'Prompt exclusivo B', assistantMode:'service'});
      const a = await window.zap.aiGetConfig('qa-account-a');
      const b = await window.zap.aiGetConfig('qa-account-b');
      const fresh = await window.zap.aiGetConfig('qa-account-c');
      return {a, b, fresh};
    }""")
    assert result["a"]["systemPrompt"] == "Prompt exclusivo A"
    assert result["a"]["adminNumber"] == "5521999999999"
    assert result["a"]["authorizedGroups"] == ["120363000000001@g.us"]
    assert result["a"]["responseLength"] == "medium"
    assert result["b"]["systemPrompt"] == "Prompt exclusivo B"
    assert result["b"]["assistantMode"] == "service"
    assert result["fresh"]["systemPrompt"] == ""
    print("QA_OK packaged IPC ai config isolated by account")
    browser.close()
