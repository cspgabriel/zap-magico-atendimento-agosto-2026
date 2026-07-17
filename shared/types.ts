export interface Contact {
  id: string
  name: string
  phone: string
  group_name?: string
  notes?: string
}

export interface Template {
  id: string
  name: string
  message: string
}

export interface Campaign {
  id: string
  name: string
  template_id: string
  total_contacts: number
  sent_count: number
  fail_count: number
  status: 'pending' | 'running' | 'paused' | 'completed'
  delay_min: number
  delay_max: number
  pause_every: number
  pause_duration: number
  daily_limit: number
  created_at: string
  finished_at?: string
}

export interface CampaignMessage {
  id: string
  campaign_id: string
  contact_id: string
  contact_name: string
  phone: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  error?: string
  sent_at?: string
}

export interface Settings {
  delay_min: number
  delay_max: number
  pause_every: number
  pause_duration: number
  daily_limit: number
  wa_instance_name: string
}

export interface ConnectionState {
  connected: boolean
  qrCode?: string
  phone?: string
  status: 'disconnected' | 'connecting' | 'connected'
  error?: string
}

export interface SendLog {
  id: string
  phone: string
  contact_name?: string
  message: string
  status: 'sent' | 'failed'
  error?: string
  sent_at: string
}
