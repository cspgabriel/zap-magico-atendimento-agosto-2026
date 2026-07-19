# Zap Mágico Atendimento · 1.4.1

Aplicativo desktop local-first para atendimento WhatsApp via QR Code, com Inbox, CRM leve e assistência de IA.

## Recursos

- Multiplas contas WhatsApp por QR Code, com sessão isolada por conta.
- Sessões espelhadas e criptografadas no SQL local.
- Inbox em tempo real separado por conta para conversas privadas.
- Status, prioridade, etiquetas, notas internas e conversas fixadas.
- Busca global e dentro da conversa.
- Pipeline CRM com etapas, responsável e valor da oportunidade.
- Automações por palavra-chave: resposta, etiqueta, status e prioridade.
- Sugestao de resposta com IA e editor para revisao manual.
- OpenRouter, Gemini, OpenAI e DeepSeek como provedores opcionais.
- Catálogo OpenRouter pesquisável, com filtros de modelos grátis/pagos, contexto e preço por milhão de tokens.
- Modos de IA: atendimento para todos ou assistente pessoal restrito ao ADMIN e autorizados.
- Identificação automática por número WhatsApp (PN), JID alternativo e LID do Baileys 7.
- Prompt, modo, permissões, provedor e base de conhecimento isolados por conta WhatsApp.
- Recuperação de sessão 401 sem loop: credencial inválida é limpa e o app solicita novo QR.
- ADMIN e autorizados selecionáveis diretamente dos chats ativos da conta.
- Seleção múltipla de autorizados entre conversas privadas e participantes dos grupos, incluindo PN/LID quando fornecidos pelo WhatsApp.
- IA opcional em grupos escolhidos: qualquer participante do grupo autorizado pode acionar a resposta; ADMIN e autorizados restringem somente chats privados.
- No contexto de grupo, cada participante mantém identidade própria e a IA responde abertamente à conversa mais recente sem assumir que todos são o ADMIN.
- Tamanho de saída automático, curto (350), médio (700) ou longo (1.400 caracteres).
- Central de envios unificada e página separada de histórico operacional.
- API local autenticada para agentes, n8n e integrações externas.
- Conexao WhatsApp Web por QR Code usando Baileys.
- Banco, configuracoes, documentos e sessao armazenados localmente.

## Operacao local

O app inicia sem servidor, Firebase, Docker ou banco externo. O WhatsApp precisa de internet e pareamento por QR Code. A IA precisa de uma chave de provedor apenas quando o usuario quiser gerar respostas; o Inbox e o banco local continuam funcionando sem IA.

Chaves sao armazenadas criptografadas pelo Electron `safeStorage` e nunca devem ser commitadas.

## API local para agentes

Ative em `Configurações > API local para agentes`. O serviço escuta apenas em `127.0.0.1` e exige `Authorization: Bearer SEU_TOKEN` (exceto `/v1/health`).

- `GET /v1/health`
- `GET /v1/accounts`
- `GET /v1/accounts/:id/status`
- `GET /v1/inbox?accountId=default&limit=100`
- `GET /v1/ai/access-candidates?accountId=default`
- `POST /v1/messages/send` com `accountId`, `to` e `message`
- `POST /v1/ai/generate` com `accountId`, `text`, `action` e `provider` opcionais

## Build

```powershell
npm install
npm run build
npm run package
```

## Instalador

O instalador atual fica em:

```text
release/v1.4.1/Zap Mágico WPP Web QR Setup 1.4.1.exe
```

## Dados locais

O app salva banco, mensagens, metadados do atendimento, automacoes, pipeline, configuracoes e snapshots criptografados das sessoes WhatsApp no `userData` do Electron. Esses arquivos nao entram no Git.

## Escopo de seguranca

Campanhas sao secundarias, moderadas e limitadas. O envio direto permanece sujeito a revisao do atendente. Grupos e status nao entram no Inbox privado. Eventos mantem conta, JID de origem e ID da mensagem para auditoria e deduplicacao.
