import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export const money = (amount: number) => `${Math.round(amount).toLocaleString('ar-YE')} ريال`

export const Modal = ({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) => (
  <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
      </header>
      {children}
    </section>
  </div>
)

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="field"><span>{label}</span>{children}</label>
)
