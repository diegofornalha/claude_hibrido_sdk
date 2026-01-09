/**
 * Modelos de Lead/CRM - CRM
 * Interfaces e tipos para gerenciamento de leads no funil de vendas
 */

export type LeadState =
  | 'novo'
  | 'CRM_pendente'
  | 'CRM_agendado'
  | 'em_atendimento'
  | 'proposta_enviada'
  | 'produto_vendido'
  | 'perdido';

export type LeadTemperatura = 'fria' | 'morna' | 'quente';

export interface LeadOrigem {
  source: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  form_name?: string;
  captured_at?: string;
}

export interface LeadData {
  user_id: number;
  nome: string;
  email: string;
  telefone?: string;
  profissao?: string;
  created_at: string;
  current_state: LeadState;
  temperatura?: LeadTemperatura;
  owner_team?: string;
  origem?: LeadOrigem;
  ultimo_contato?: string;
  proximo_follow_up?: string;
}

export interface LeadEvent {
  event_id: number;
  event_type: string;
  created_at: string;
  created_by?: number;
  event_data?: Record<string, unknown>;
}

export interface LeadStateConfig {
  label: string;
  emoji: string;
  bgClass: string;
  textClass: string;
}

export const LEAD_STATE_CONFIG: Record<LeadState, LeadStateConfig> = {
  novo: {
    label: 'Novo',
    emoji: '',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700'
  },
  CRM_pendente: {
    label: 'Aguardando',
    emoji: '',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700'
  },
  CRM_agendado: {
    label: 'Agendado',
    emoji: '',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700'
  },
  em_atendimento: {
    label: 'Atendimento',
    emoji: '',
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-700'
  },
  proposta_enviada: {
    label: 'Proposta',
    emoji: '',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-700'
  },
  produto_vendido: {
    label: 'Vendido',
    emoji: '',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700'
  },
  perdido: {
    label: 'Perdido',
    emoji: '',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700'
  }
};

export const LEAD_TEMPERATURA_CONFIG: Record<LeadTemperatura, { label: string; class: string }> = {
  fria: { label: 'Fria', class: 'text-blue-600' },
  morna: { label: 'Morna', class: 'text-yellow-600' },
  quente: { label: 'Quente', class: 'text-red-600 font-bold' }
};
