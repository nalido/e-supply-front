import { Button } from 'antd'
import type { ButtonProps } from 'antd'
import SearchField from './SearchField'
import InputActionGroup from './InputActionGroup'

type SearchWithButtonProps = {
  value?: string
  onChange?: (value: string) => void
  onSearch?: () => void
  placeholder?: string
  buttonText?: string
  buttonProps?: ButtonProps
  className?: string
}

const SearchWithButton = ({
  value,
  onChange,
  onSearch,
  placeholder,
  buttonText = '查询',
  buttonProps,
  className,
}: SearchWithButtonProps) => {
  return (
    <InputActionGroup
      className={className}
      input={<SearchField value={value} onChange={onChange} onPressEnter={onSearch} placeholder={placeholder} />}
      action={<Button type="primary" onClick={onSearch} {...buttonProps}>{buttonText}</Button>}
    />
  )
}

export default SearchWithButton
