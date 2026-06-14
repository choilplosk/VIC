'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './vicnav.module.css'

interface Props {
  perfil: string
  nome: string
}

export default function VicNav({ perfil, nome }: Props) {
  const path = usePathname()
  const iniciais = nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
  const isAdmin = perfil === 'coordenadora'

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <span className={styles.brand}>VIC <em>·</em> Studio boti</span>
        <nav className={styles.nav}>
          {isAdmin && (
            <Link
              href="/vic/dashboard"
              className={`${styles.navLink} ${path === '/vic/dashboard' ? styles.navActive : ''}`}
            >
              Dashboard
            </Link>
          )}
          <Link
            href="/vic/agenda"
            className={`${styles.navLink} ${path === '/vic/agenda' ? styles.navActive : ''}`}
          >
            Agenda
          </Link>
          <Link
            href="/vic/gerar"
            className={`${styles.navLink} ${path === '/vic/gerar' ? styles.navActive : ''}`}
          >
            Emitir voucher
          </Link>
          {isAdmin && (
            <Link
              href="/vic/config"
              className={`${styles.navLink} ${path === '/vic/config' ? styles.navActive : ''}`}
            >
              Configurações
            </Link>
          )}
        </nav>
      </div>
      <div className={styles.user}>
        <div className={styles.avatar}>{iniciais}</div>
        <span>{nome.split(' ')[0]}</span>
      </div>
    </div>
  )
}
