import type { ReactNode } from 'react'

type BulkActionBarProps = {
  selectionText?: ReactNode
  actions?: ReactNode
  className?: string
}

const BulkActionBar = ({ selectionText, actions, className }: BulkActionBarProps) => {
  return (
    <div className={["oc-bulk-action-bar", className].filter(Boolean).join(' ')}>
      <div className="oc-bulk-action-bar__info">{selectionText}</div>
      <div className="oc-bulk-action-bar__actions">{actions}</div>
    </div>
  )
}

export default BulkActionBar
