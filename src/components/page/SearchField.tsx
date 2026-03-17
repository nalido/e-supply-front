import { SearchOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import type { ButtonProps } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'

type SearchFieldProps = {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  style?: CSSProperties
  className?: string
  enterButton?: ReactNode | boolean
  buttonProps?: ButtonProps
  onPressEnter?: () => void
}

const SearchField = ({
  value,
  defaultValue,
  onChange,
  onSearch,
  placeholder,
  allowClear = true,
  style,
  className,
  onPressEnter,
}: SearchFieldProps) => {
  const [innerValue, setInnerValue] = useState(value ?? defaultValue ?? '')

  useEffect(() => {
    if (value !== undefined) {
      setInnerValue(value)
    }
  }, [value])

  const triggerSearch = () => {
    onSearch?.(innerValue)
    onPressEnter?.()
  }

  const inputNode = (
    <Input
      allowClear={allowClear}
      value={innerValue}
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      style={style}
      className={className}
      onChange={(event) => {
        const nextValue = event.target.value
        setInnerValue(nextValue)
        onChange?.(nextValue)
      }}
      onPressEnter={triggerSearch}
    />
  )

  return inputNode;
}

export default SearchField
