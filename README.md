# Zap Mágico Atendimento · 1.3.1

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
- Conexao WhatsApp Web por QR Code usando Baileys.
- Banco, configuracoes, documentos e sessao armazenados localmente.

## Operacao local

O app inicia sem servidor, Firebase, Docker ou banco externo. O WhatsApp precisa de internet e pareamento por QR Code. A IA precisa de uma chave de provedor apenas quando o usuario quiser gerar respostas; o Inbox e o banco local continuam funcionando sem IA.

Chaves sao armazenadas criptografadas pelo Electron `safeStorage` e nunca devem ser commitadas.

## Build

```powershell
npm install
npm run build
npm run package
```

## Instalador

O instalador atual fica em:

```text
release/v1.3.1/Zap Mágico WPP Web QR Setup 1.3.1.exe
```

## Dados locais

O app salva banco, mensagens, metadados do atendimento, automacoes, pipeline, configuracoes e snapshots criptografados das sessoes WhatsApp no `userData` do Electron. Esses arquivos nao entram no Git.

## Escopo de seguranca

Campanhas sao secundarias, moderadas e limitadas. O envio direto permanece sujeito a revisao do atendente. Grupos e status nao entram no Inbox privado. Eventos mantem conta, JID de origem e ID da mensagem para auditoria e deduplicacao.
