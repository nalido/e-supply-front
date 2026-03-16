import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { CSSProperties } from 'react'

type SearchFieldProps = {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  style?: CSSProperties
  className?: string
  onPressEnter?: () => void
}

const SearchField = ({ value, onChange, placeholder, allowClear = true, style, className, onPressEnter }: SearchFieldProps) => {
  return (
    <Input
      allowClear={allowClear}
      value={value}
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      style={style}
      className={className}
      onChange={(event) => onChange?.(event.target.value)}
      onPressEnter={onPressEnter}
    />
  )
}

export default SearchField
