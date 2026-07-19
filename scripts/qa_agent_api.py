import json
import os
import urllib.error
import urllib.request
from playwright.sync_api import sync_playwright

cdp_port = os.environ.get("ZAP_QA_CDP_PORT", "5317")
api_port = 3219

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{cdp_port}")
    page = browser.contexts[0].pages[0]
    config = page.evaluate(f"window.zap.agentApiSaveConfig({{enabled:true,port:{api_port},regenerateToken:true}})")
    assert config["running"] is True, config
    token = config["token"]

    health = json.load(urllib.request.urlopen(f"http://127.0.0.1:{api_port}/v1/health"))
    assert health["ok"] is True

    try:
        urllib.request.urlopen(f"http://127.0.0.1:{api_port}/v1/accounts")
        raise AssertionError("API accepted request without token")
    except urllib.error.HTTPError as error:
        assert error.code == 401

    request = urllib.request.Request(f"http://127.0.0.1:{api_port}/v1/accounts", headers={"Authorization": f"Bearer {token}"})
    accounts = json.load(urllib.request.urlopen(request))
    assert len(accounts) >= 1

    request = urllib.request.Request(f"http://127.0.0.1:{api_port}/v1/ai/media-usage?accountId=default", headers={"Authorization": f"Bearer {token}"})
    usage = json.load(urllib.request.urlopen(request))
    assert "image" in usage and "voice" in usage

    payload = json.dumps({"accountId": "default", "to": "5521999999999", "message": "QA"}).encode()
    request = urllib.request.Request(f"http://127.0.0.1:{api_port}/v1/messages/send", data=payload, method="POST", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    send_result = json.load(urllib.request.urlopen(request))
    assert send_result["success"] is False

    page.evaluate(f"window.zap.agentApiSaveConfig({{enabled:false,port:{api_port}}})")
    print("QA_OK agent API health auth accounts send-route disable")
    browser.close()
