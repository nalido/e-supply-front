import type { ReactNode } from 'react'

type TableToolbarProps = {
  left?: ReactNode
  right?: ReactNode
  className?: string
}

const TableToolbar = ({ left, right, className }: TableToolbarProps) => {
  return (
    <div className={["oc-table-toolbar", className].filter(Boolean).join(' ')}>
      <div className="oc-table-toolbar__left">{left}</div>
      <div className="oc-table-toolbar__right">{right}</div>
    </div>
  )
}

export default TableToolbar
