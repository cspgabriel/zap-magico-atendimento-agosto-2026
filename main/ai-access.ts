export function normalizeAiIdentity(value: unknown) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  const isLid = raw.includes('@lid') || raw.startsWith('lid:')
  const withoutDomain = raw.replace(/@(?:s\.whatsapp\.net|lid)$/i, '').replace(/^lid:/i, '')
  const user = withoutDomain.replace(/:\d+$/, '')
  const digits = user.replace(/\D/g, '')
  if (!digits) return ''
  return isLid ? `lid:${digits}` : digits
}

export function normalizeAiIdentityList(values: unknown) {
  const source = Array.isArray(values) ? values : String(values || '').split(/[\n,;]+/)
  return [...new Set(source.map(normalizeAiIdentity).filter(Boolean))]
}

export async function matchesAuthorizedAiIdentity(
  allowedIdentities: string[],
  senderIdentities: string[],
  resolvePhoneForLid?: (lidJid: string) => Promise<string | null>,
) {
  const allowed = new Set(normalizeAiIdentityList(allowedIdentities))
  const candidates = new Set(normalizeAiIdentityList(senderIdentities))
  if ([...candidates].some(identity => allowed.has(identity))) return true
  if (!resolvePhoneForLid) return false
  for (const identity of candidates) {
    if (!identity.startsWith('lid:')) continue
    try {
      const phone = normalizeAiIdentity(await resolvePhoneForLid(`${identity.slice(4)}@lid`))
      if (phone && allowed.has(phone)) return true
    } catch {}
  }
  return false
}
