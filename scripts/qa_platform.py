from playwright.sync_api import sync_playwright

MOCK = r"""
(() => {
  localStorage.setItem('zap-ai-guide-seen-v2','1');
  const listeners = {};
  let rules = [];
  let deals = [];
  const blankAi = () => ({provider:'auto',providers:[],systemPrompt:'',autoReply:true,assistantMode:'service',adminNumber:'',authorizedNumbers:[],knowledge:[]});
  let aiConfigs = {};
  window.__qaAiConfigs = aiConfigs;
  let accounts = [{id:'default',name:'WhatsApp principal',phone:'5521999999999',status:'connected',connected:true},{id:'sales',name:'Comercial',phone:'',status:'disconnected',connected:false}];
  window.electron = {minimize:async()=>{},maximize:async()=>{},close:async()=>{}};
  const ok = async () => ({success:true});
  window.zap = new Proxy({
    on:(channel,cb)=>{(listeners[channel] ||= []).push(cb);return()=>{}},
    getAccounts:async()=>accounts, createAccount:async(name)=>{const id='new';accounts.push({id,name,status:'disconnected',connected:false});return{success:true,id}},
    renameAccount:ok,deleteAccount:ok,unlink:async(id)=>{accounts=accounts.map(a=>a.id===id?{...a,status:'disconnected',connected:false,phone:''}:a);return{success:true}},
    connect:async(id)=>{accounts=accounts.map(a=>a.id===id?{...a,status:'connecting',connected:false}:a);return{success:true}},
    disconnect:async(id)=>{accounts=accounts.map(a=>a.id===id?{...a,status:'disconnected',connected:false}:a);return{success:true}},
    getStatus:async(id)=>{const a=accounts.find(x=>x.id===id);return{accountId:id,connected:Boolean(a?.connected),status:a?.status||'disconnected',phone:a?.phone||''}},
    getUnreadCount:async()=>1,getInbox:async()=>[{id:'m1',account_id:'default',phone:'5521988887777',contact_name:'Cliente Demo',message:'Quero saber o preço',from_me:0,read:0,received_at:'2026-07-18 14:00:00'}],
    getConversationMeta:async()=>[],getTemplates:async()=>[],markRead:ok,markAllRead:ok,saveConversationMeta:async(x)=>x,sendMessage:ok,
    getAutomations:async()=>rules,saveAutomation:async(r)=>{const row={...r,id:r.id||'r1',executions:r.executions||0,enabled:r.enabled===false?0:1};rules=rules.filter(x=>x.id!==row.id).concat(row);return{success:true,id:row.id}},deleteAutomation:async(id)=>{rules=rules.filter(x=>x.id!==id);return{success:true}},
    getDeals:async()=>deals,saveDeal:async(d)=>{const row={...d,id:d.id||'d1'};deals=deals.filter(x=>x.id!==row.id).concat(row);return{success:true,id:row.id}},deleteDeal:async(id)=>{deals=deals.filter(x=>x.id!==id);return{success:true}},
    aiGetConfig:async(accountId='default')=>aiConfigs[accountId]||blankAi(),aiSaveConfig:async(accountId,input)=>{const current=aiConfigs[accountId]||blankAi();if(input.assistantMode==='personal'&&!String(input.adminNumber||current.adminNumber).replace(/\D/g,''))throw new Error('Informe o número ADMIN');aiConfigs[accountId]={...current,...input,adminNumber:String(input.adminNumber||'').replace(/\D/g,''),authorizedNumbers:input.authorizedNumbers||current.authorizedNumbers};window.__qaAiConfigs=aiConfigs;return aiConfigs[accountId]},getSettings:async()=>({}),getContacts:async()=>[],getCampaigns:async()=>[],getStats:async()=>({}),getSendLog:async()=>[],aiListKnowledge:async()=>[],warmupPlans:async()=>[],warmupList:async()=>[]
  },{get:(t,p)=>p in t?t[p]:ok});
})();
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.add_init_script(MOCK)
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto("http://localhost:5173", wait_until="networkidle")
    page.wait_for_timeout(800)
    print("BOOT_ERRORS", errors)
    page.get_by_title("Gerenciar contas WhatsApp").click()
    page.get_by_label("Nome da nova conta").fill("Suporte")
    page.get_by_role("button", name="Adicionar e conectar").click()
    page.get_by_title("Gerenciar contas WhatsApp").click()
    support = page.locator(".account-row").filter(has_text="Suporte")
    support.get_by_role("button", name="Pausar").click()
    support.get_by_role("button", name="Conectar").wait_for()
    page.locator(".account-modal").get_by_title("Fechar").click()
    page.get_by_role("button", name="Automações").click()
    page.get_by_role("button", name="Nova automação").click()
    page.get_by_label("Nome").fill("Triagem de preço")
    page.get_by_label("Mensagem contém").fill("preço")
    page.get_by_label("Adicionar etiqueta").fill("lead quente")
    page.get_by_label("Resposta automática").fill("Olá! Já vou te ajudar com os valores.")
    page.get_by_role("button", name="Salvar e ativar").click()
    page.get_by_text("Triagem de preço").wait_for()
    page.get_by_role("button", name="Pipeline CRM").click()
    page.get_by_role("button", name="Nova oportunidade").click()
    page.get_by_label("Contato").fill("Cliente Demo")
    page.get_by_label("WhatsApp").fill("5521988887777")
    page.get_by_label("Valor").fill("2500")
    page.get_by_role("button", name="Criar oportunidade").click()
    page.get_by_text("Cliente Demo").wait_for()
    page.get_by_role("button", name="Atendimento 1", exact=True).click()
    page.get_by_text("Cliente Demo").first.wait_for()
    page.get_by_role("button", name="Assistente IA", exact=True).click()
    page.get_by_role("button", name="Assistente pessoal IA").click()
    page.get_by_label("Número ADMIN *").fill("+55 (21) 99999-9999")
    page.get_by_label("Outros números autorizados").fill("5511988887777\n5511977776666")
    page.get_by_role("button", name="Salvar modo e permissões").click()
    page.get_by_text("Configuração salva").wait_for()
    ai_config = page.evaluate("window.__qaAiConfigs.new")
    assert ai_config["assistantMode"] == "personal"
    assert ai_config["adminNumber"] == "5521999999999"
    assert len(ai_config["authorizedNumbers"]) == 2
    page.locator(".account-switcher select").select_option("default")
    page.get_by_text("Configuração isolada · default").wait_for()
    assert page.get_by_label("Número ADMIN *").count() == 0
    page.locator(".account-switcher select").select_option("new")
    page.get_by_text("Configuração isolada · new").wait_for()
    assert page.get_by_label("Número ADMIN *").input_value() == "5521999999999"
    page.screenshot(path="release/qa-platform.png", full_page=True)
    assert not errors, errors
    print("QA_OK automations pipeline inbox multiconta ai-personal-access")
    browser.close()
