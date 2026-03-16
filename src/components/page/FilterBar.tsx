import type { ReactNode } from 'react'

type FilterBarProps = {
  left?: ReactNode
  right?: ReactNode
  className?: string
}

const FilterBar = ({ left, right, className }: FilterBarProps) => {
  return (
    <div className={["oc-filter-bar", className].filter(Boolean).join(' ')}>
      <div className="oc-filter-bar__left">{left}</div>
      <div className="oc-filter-bar__right">{right}</div>
    </div>
  )
}

export default FilterBar
