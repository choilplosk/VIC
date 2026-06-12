export type TierNivel = 'bronze' | 'prata' | 'ouro' | 'diamante'
export type VoucherStatus = 'pendente' | 'agendado' | 'utilizado' | 'expirado' | 'cancelado'
export type AgendamentoStatus = 'aguardando' | 'confirmado' | 'concluido' | 'cancelado' | 'nao_compareceu'
export type PerfilVIC = 'comercial' | 'atendente' | 'coordenadora'
export type LojaTipo = 'vic' | 'atacado'

export interface Voucher {
  id: string
  token: string
  cliente_nome: string
  cliente_wpp: string
  empresa_nome: string | null
  produtos: string[]
  valor_compra: number | null
  nivel: TierNivel
  comercial_id: string
  status: VoucherStatus
  expira_em: string
  criado_em: string
}

export interface Agendamento {
  id: string
  voucher_id: string
  loja_id: string
  servico: string
  data: string
  hora: string
  status: AgendamentoStatus
  reagendamentos: number
  observacoes: string | null
  criado_em: string
}

export interface AgendamentoCompleto extends Agendamento {
  cliente_nome: string
  cliente_wpp: string
  nivel: TierNivel
  produtos: string[]
  valor_compra: number | null
  empresa_nome: string | null
  voucher_status: VoucherStatus
  loja_nome: string
  loja_bairro: string
  loja_wpp: string | null
  comercial_nome: string | null
}

export interface Loja {
  id: string
  nome: string
  bairro: string
  endereco: string
  tipo: LojaTipo
  whatsapp: string | null
  ativa: boolean
}

export interface ConfiguracaoTier {
  nivel: TierNivel
  valor_minimo: number
  duracao_minutos: number
  servicos: string[]
  ativo: boolean
}

export interface SlotDisponivel {
  hora: string
  disponivel: boolean
}
