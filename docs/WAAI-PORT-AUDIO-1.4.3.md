# Port de áudio WAAI para Zap Mágico 1.4.3

## O que foi reaproveitado

- Contrato de resposta composta do WAAI: texto (`Message`) e mídia (`File`) tratados como uma unidade.
- Processamento assíncrono cancelável e isolado por conversa do `AutoReplyService`.
- Normalização de mídia antes de entregar a mensagem ao provedor de IA.
- Separação entre gerar resposta, preparar arquivo e enviar ao destinatário.

## Adaptação nativa

O WAAI 3.3.6 usa .NET Framework 4.8, WinForms, WebView2 e automação do WhatsApp Web. O código principal está protegido por um dispatcher virtualizado (`<Module>.Invoke`), portanto os binários, proteção, licença e automação DOM não foram incorporados.

No Zap Mágico, o mesmo fluxo foi reimplementado em TypeScript sobre Electron + Baileys:

1. Detectar texto ou áudio, inclusive dentro de mensagens efêmeras/view-once.
2. Baixar o áudio da conversa correta (`accountId + chat/grupo`).
3. Transcrever via OpenRouter ou OpenAI.
4. Gerar a resposta textual com o histórico daquela conversa.
5. Gerar voz no formato aceito pelo modelo.
6. Normalizar PCM 16-bit/24 kHz para WAV quando necessário.
7. Converter qualquer saída para OGG/Opus e enviar como PTT.
8. Registrar geração, falha e mensagem no SQL da conta.

## Correções específicas

- Gemini TTS exige `response_format=pcm`; o app antes forçava MP3 e recebia HTTP 400.
- O modo automático escolhe PCM para Gemini e MP3 para os demais modelos, com fallback automático para PCM.
- Trocar o modelo seleciona uma voz publicada por ele, evitando combinações inválidas.
- O teste do painel percorre o pipeline final e produz OGG/Opus pronto para WhatsApp.
- Falhas de transcrição deixaram de ser silenciosas e o áudio continua visível no Inbox.
- Mensagens encapsuladas por `ephemeralMessage`, `viewOnceMessage` e variantes agora são reconhecidas.

## Evidência

- Gemini/OpenRouter: PCM 24 kHz gerado e normalizado com sucesso.
- Pipeline completo: TTS -> WAV/MP3 -> OGG/Opus -> STT aprovado em português.
- Nenhum executável ou DLL do WAAI é carregado pelo Zap Mágico.
