from playwright.sync_api import sync_playwright

MOCK = r"""
(() => {
  localStorage.setItem('zap-ai-guide-seen-v2','1');
  const listeners = {};
  let rules = [];
  let deals = [];
  const blankAi = () => ({provider:'auto',providers:[{id:'openrouter',configured:false,model:'openai/gpt-4o-mini'},{id:'gemini',configured:false,model:'gemini-2.0-flash'},{id:'openai',configured:false,model:'gpt-4o-mini'},{id:'deepseek',configured:false,model:'deepseek-chat'}],systemPrompt:'',autoReply:true,assistantMode:'service',adminNumber:'',authorizedNumbers:[],allowGroups:false,authorizedGroups:[],responseLength:'auto',knowledge:[{name:'rosto-referencia.png',kind:'image'}],imageEnabled:false,imageProvider:'openrouter',imageUseTextKey:true,imageUseKnowledgeReferences:true,imageInstructions:'',imageModel:'openai/gpt-image-1-mini',imageAspectRatio:'1:1',imageResolution:'1K',imageQuality:'auto',imageDailyLimit:5,voiceEnabled:false,voiceProvider:'openrouter',voiceUseTextKey:true,voiceReplyMode:'request',voiceModel:'google/gemini-3.1-flash-tts-preview',voiceName:'Kore',voiceSpeed:1,voiceDailyLimit:20,transcriptionEnabled:false,transcriptionProvider:'openrouter',transcriptionUseTextKey:true,transcriptionModel:'openai/gpt-4o-mini-transcribe',transcriptionLanguage:'pt',mediaGroupAccess:'everyone'});
  let aiConfigs = {};
  window.__qaAiConfigs = aiConfigs;
  let accounts = [{id:'default',name:'WhatsApp principal',phone:'5521999999999',status:'connected',connected:true},{id:'sales',name:'Comercial',phone:'',status:'disconnected',connected:false}];
  let agentApi = {enabled:true,port:3210,token:'zpm_token_seguro_para_qa',running:true,error:'',baseUrl:'http://127.0.0.1:3210/v1'};
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
    aiGetConfig:async(accountId='default')=>aiConfigs[accountId]||blankAi(),aiSaveConfig:async(accountId,input)=>{const current=aiConfigs[accountId]||blankAi();if(input.assistantMode==='personal'&&!String(input.adminNumber||current.adminNumber).replace(/\D/g,''))throw new Error('Informe o número ADMIN');aiConfigs[accountId]={...current,...input,adminNumber:String(input.adminNumber||'').replace(/\D/g,''),authorizedNumbers:input.authorizedNumbers||current.authorizedNumbers};window.__qaAiConfigs=aiConfigs;return aiConfigs[accountId]},aiAccessCandidates:async()=>({connected:true,contacts:[{id:'5521999999999',name:'Gabriel ADMIN'},{id:'5511988887777',name:'Atendimento SP'}],members:[{id:'5521977776666@s.whatsapp.net',name:'Maria do Financeiro',group_names:'Diretoria AgenciAR',is_admin:0},{id:'lid:987654321',name:'João Suporte',group_names:'Suporte',is_admin:1}],groups:[{id:'120363000000001@g.us',name:'Diretoria AgenciAR',participant_count:8},{id:'120363000000002@g.us',name:'Suporte',participant_count:4}]}),aiListModels:async()=>({success:true,models:[{id:'openrouter/free',name:'Free Models Router',isFree:true,promptPrice:0,completionPrice:0,contextLength:200000},{id:'google/gemini-2.5-flash:free',name:'Gemini 2.5 Flash Free',isFree:true,promptPrice:0,completionPrice:0,contextLength:1000000},{id:'anthropic/claude-sonnet-4',name:'Claude Sonnet 4',isFree:false,promptPrice:0.000003,completionPrice:0.000015,contextLength:200000}]}),aiListMediaModels:async(accountId,kind)=>({success:true,models:kind==='image'?[{id:'openai/gpt-image-1-mini',name:'GPT Image 1 Mini',isFree:false,minImagePrice:.005,maxReferences:16,pricingLines:[{billable:'output_image',unit:'image',costUsd:.005}]},{id:'mock/free-image',name:'Free Image',isFree:true,minImagePrice:0,maxReferences:4}]:kind==='voice'?[{id:'google/gemini-3.1-flash-tts-preview',name:'Gemini Flash TTS',isFree:false,promptPrice:.000001,inputPricePerMillion:1,outputPricePerMillion:20,ptBrSupported:true,supportedParameters:['voice','response_format'],voices:[{id:'Kore',gender:'female',locale:'multilíngue · inclui pt-BR'},{id:'Leda',gender:'female',locale:'multilíngue · inclui pt-BR'},{id:'Puck',gender:'male',locale:'multilíngue · inclui pt-BR'}]}]:[{id:'openai/gpt-4o-mini-transcribe',name:'GPT-4o Mini Transcribe',ptBrSupported:true,inputPricePerMillion:1.25,outputPricePerMillion:5}]}),aiMediaUsage:async()=>({image:1,voice:2,imageLimit:5,voiceLimit:20}),aiGenerateImage:async(accountId,prompt,overrides)=>{window.__qaImageOverrides=overrides;return{success:true,base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',mediaType:'image/png',model:'openai/gpt-image-1-mini',referenceCount:(overrides?.inputReferences||[]).length+1}},aiGenerateSpeech:async()=>({success:true,base64:'SUQz',mediaType:'audio/mpeg',model:'google/gemini-3.1-flash-tts-preview',voice:'Kore'}),aiTranscribeAudio:async()=>({success:true,text:'Olá, quero saber o preço.'}),agentApiGetConfig:async()=>agentApi,agentApiSaveConfig:async(input)=>{agentApi={...agentApi,...input,token:input.regenerateToken?'zpm_token_regenerado_qa':agentApi.token,running:input.enabled??agentApi.enabled};return agentApi},getSettings:async()=>({theme:'dark',darkThemeDefaultV142:'applied'}),getContacts:async()=>[],getCampaigns:async()=>[{id:'c1',account_id:'new',name:'Retorno clientes',status:'completed',total_contacts:10,sent_count:8,fail_count:2,created_at:'2026-07-18 14:00:00',finished_at:'2026-07-18 14:12:00'},{id:'c2',account_id:'new',name:'Confirmação de agenda',status:'running',total_contacts:5,sent_count:3,fail_count:0,created_at:'2026-07-19 09:00:00'}],getCampaignMessages:async(id)=>[{id:'cm1',campaign_id:id,contact_name:'Cliente Demo',phone:'5521988887777',message:'Olá Cliente Demo, sua agenda está confirmada.',status:'sent'}],getStats:async()=>({total:12,today:4,todaySent:3,todayFailed:1}),getSendLog:async()=>[],aiListKnowledge:async()=>[],warmupPlans:async()=>[],warmupList:async()=>[]
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
    page.get_by_role("button", name="Modelos e chaves", exact=False).click()
    page.get_by_label("Pesquisar modelos OpenRouter").wait_for()
    page.get_by_role("button", name="Grátis", exact=True).click()
    assert "2 de 3 modelos" in page.get_by_text("2 de 3 modelos").inner_text()
    page.get_by_label("Pesquisar modelos OpenRouter").fill("gemini")
    page.get_by_text("1 de 3 modelos").wait_for()
    page.get_by_label("Pesquisar modelos OpenRouter").fill("")
    page.get_by_role("button", name="Pagos", exact=True).click()
    page.get_by_text("1 de 3 modelos").wait_for()
    page.get_by_role("button", name="Todos", exact=True).click()
    page.screenshot(path="release/qa-ai-models-1.4.2.png", full_page=True)
    page.get_by_role("button", name="Comportamento", exact=False).click()
    page.get_by_role("button", name="Assistente pessoal IA").click()
    page.get_by_label("Escolher ADMIN dos chats ativos").select_option("5521999999999")
    page.get_by_label("Adicionar contato autorizado").select_option("5511988887777")
    page.get_by_label("Pesquisar pessoas autorizadas").fill("Maria")
    page.get_by_text("Maria do Financeiro", exact=True).click()
    page.get_by_role("button", name="Adicionar selecionados (1)").click()
    page.get_by_label("Tamanho das respostas").select_option("medium")
    page.get_by_text("Permitir IA em grupos escolhidos").click()
    page.get_by_text("Diretoria AgenciAR", exact=True).click()
    page.get_by_role("button", name="Salvar modo e permissões").click()
    page.get_by_text("Configuração salva").wait_for()
    ai_config = page.evaluate("window.__qaAiConfigs.new")
    assert ai_config["assistantMode"] == "personal"
    assert ai_config["adminNumber"] == "5521999999999"
    assert len(ai_config["authorizedNumbers"]) == 2
    assert ai_config["responseLength"] == "medium"
    assert ai_config["authorizedGroups"] == ["120363000000001@g.us"]
    page.locator(".account-switcher select").select_option("default")
    page.get_by_test_id("ai-account-id").filter(has_text="default").wait_for()
    assert page.get_by_label("Número ADMIN *").count() == 0
    page.locator(".account-switcher select").select_option("new")
    page.get_by_test_id("ai-account-id").filter(has_text="new").wait_for()
    assert page.get_by_label("Número ADMIN *").input_value() == "5521999999999"
    page.get_by_role("button", name="Foto e voz", exact=False).click()
    page.get_by_role("switch", name="Gerar imagens").click()
    page.get_by_role("switch", name="Gerar voz").click()
    page.get_by_label("Formato da imagem").select_option("9:16")
    page.get_by_label("Qualidade da imagem").select_option("high")
    page.get_by_label("Quando responder por voz").select_option("always")
    page.get_by_role("button", name="Leda", exact=False).click()
    page.get_by_role("switch", name="Ouvir áudios").click()
    page.get_by_label("Permissão de mídia em grupos").select_option("authorized")
    page.get_by_role("button", name="Salvar foto, voz e audição").click()
    page.get_by_text("Configuração salva").wait_for()
    media_config = page.evaluate("window.__qaAiConfigs.new")
    assert media_config["imageEnabled"] is True and media_config["voiceEnabled"] is True
    assert media_config["transcriptionEnabled"] is True
    assert media_config["imageAspectRatio"] == "9:16" and media_config["voiceName"] == "Leda"
    assert media_config["mediaGroupAccess"] == "authorized"
    page.screenshot(path="release/qa-ai-media-1.4.2.png", full_page=True)
    page.get_by_role("button", name="Testar IA", exact=False).click()
    page.get_by_role("button", name="Imagem", exact=True).click()
    page.get_by_label("Imagens de referência do teste").set_input_files({"name":"referencia.png","mimeType":"image/png","buffer":bytes.fromhex("89504e470d0a1a0a")})
    page.get_by_label("Descrição da imagem").fill("foto profissional de atendimento")
    page.get_by_role("button", name="Gerar imagem").click()
    page.get_by_alt_text("Prévia gerada pela IA").wait_for()
    assert len(page.evaluate("window.__qaImageOverrides.inputReferences")) == 1
    page.screenshot(path="release/qa-ai-access-1.4.2.png", full_page=True)
    page.get_by_role("button", name="Central de envios").click()
    page.get_by_text("Mensagem individual").wait_for()
    page.get_by_role("button", name="Nova campanha moderada").click()
    page.get_by_text("Campanhas moderadas").wait_for()
    page.get_by_role("button", name="Histórico de envios").click()
    page.get_by_text("Histórico de campanhas moderadas").wait_for()
    page.get_by_role("button", name="Campanhas", exact=True).click()
    page.get_by_role("heading", name="Campanhas", exact=True).wait_for()
    page.get_by_text("Retorno clientes", exact=True).first.wait_for()
    page.get_by_text("Mensagem completa enviada").wait_for()
    page.screenshot(path="release/qa-campaigns-1.4.2.png", full_page=True)
    page.get_by_role("button", name="Instalar no agente IA").click()
    page.get_by_role("heading", name="Instalar no agente IA", exact=True).wait_for()
    page.get_by_text("Ponte local do agente").wait_for()
    page.get_by_role("button", name="Copiar prompt").wait_for()
    page.screenshot(path="release/qa-agent-install-1.4.2.png", full_page=True)
    page.get_by_role("button", name="Configurações").click()
    page.get_by_text("Sistema Anti-Ban").wait_for()
    assert page.get_by_role("button", name="Escuro").count() == 1
    page.screenshot(path="release/qa-settings-dark-1.4.2.png", full_page=True)
    page.screenshot(path="release/qa-platform.png", full_page=True)
    assert not errors, errors
    print("QA_OK multiconta ai-admin-chat groups response-length send-center history")
    browser.close()
