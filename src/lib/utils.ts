import { randomBytes } from 'crypto'

/**
 * Gera um token curto e único para o link do voucher.
 * Formato: 12 caracteres alfanuméricos (ex: a3f9kx2m8qvz)
 */
export function gerarToken(): string {
  return randomBytes(9).toString('base64url').slice(0, 12)
}

/**
 * Calcula a data de expiração do voucher.
 * Padrão: 30 dias a partir de agora (configurável).
 */
export function calcularExpiracao(dias: number = 30): Date {
  const expira = new Date()
  expira.setDate(expira.getDate() + dias)
  return expira
}

/**
 * Monta a URL pública do voucher para enviar ao cliente.
 */
export function montarUrlVoucher(token: string): string {
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://boticarioniteroi.com.br'
  return `${base}/vic/${token}`
}

/**
 * Formata número de WhatsApp para uso em links wa.me
 * Entrada: '21990001111' → Saída: '5521990001111'
 */
export function formatarWpp(numero: string): string {
  const limpo = numero.replace(/\D/g, '')
  return limpo.startsWith('55') ? limpo : `55${limpo}`
}
