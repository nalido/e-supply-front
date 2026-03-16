import { Space } from 'antd'
import type { ReactNode } from 'react'

type InputActionGroupProps = {
  input: ReactNode
  action: ReactNode
  className?: string
}

const InputActionGroup = ({ input, action, className }: InputActionGroupProps) => {
  return (
    <Space.Compact className={["oc-input-action-group", className].filter(Boolean).join(' ')} block>
      {input}
      {action}
    </Space.Compact>
  )
}

export default InputActionGroup
