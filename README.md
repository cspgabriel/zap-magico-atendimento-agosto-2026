# Zap Mágico Atendimento · Agosto 2026

Aplicativo desktop local-first para atendimento WhatsApp via QR Code, com Inbox, CRM leve e assistência de IA.

## Recursos

- Conexao WhatsApp por QR Code.
- Inbox em tempo real para conversas privadas.
- Status, prioridade, etiquetas, notas internas e conversas fixadas.
- Busca global e dentro da conversa.
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
release/Zap Mágico WPP Web QR Setup 1.2.0.exe
```

## Dados locais

O app salva banco, metadados do atendimento, configuracoes e sessao WhatsApp no `userData` do Electron. Esses arquivos nao entram no Git.

## Escopo de seguranca

O envio permanece manual e sujeito a revisao do atendente. Grupos e status nao entram no Inbox privado. Eventos mantem o JID de origem para auditoria e deduplicacao.
