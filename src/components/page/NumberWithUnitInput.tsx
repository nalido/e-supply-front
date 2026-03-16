import { InputNumber } from 'antd'
import type { InputNumberProps } from 'antd'

type NumberWithUnitInputProps = InputNumberProps & {
  unit?: string
}

const NumberWithUnitInput = ({ unit, ...props }: NumberWithUnitInputProps) => {
  return <InputNumber addonAfter={unit} {...props} />
}

export default NumberWithUnitInput
