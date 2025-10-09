import { Input, Space, Tag } from 'antd';
import { useRef, useState } from 'react';
import type { InputRef } from 'antd';

type ColorTagsInputProps = {
  value?: string[];
  onChange?: (next: string[]) => void;
};

const ColorTagsInput = ({ value = [], onChange }: ColorTagsInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<InputRef>(null);

  const triggerChange = (next: string[]) => {
    onChange?.(next);
  };

  const handleAdd = () => {
    const normalized = inputValue.trim();
    if (!normalized) {
      return;
    }
    const exists = value.some((item) => item.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setInputValue('');
      return;
    }
    triggerChange([...value, normalized]);
    setInputValue('');
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleRemove = (color: string) => {
    triggerChange(value.filter((item) => item !== color));
  };

  return (
    <Space size={[8, 8]} wrap>
      {value.map((color) => (
        <Tag
          key={color}
          closable
          onClose={(event) => {
            event.preventDefault();
            handleRemove(color);
          }}
        >
          {color}
        </Tag>
      ))}
      <Input
        ref={inputRef}
        size="small"
        placeholder="输入颜色后回车"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onPressEnter={(event) => {
          event.preventDefault();
          handleAdd();
        }}
        onBlur={() => {
          if (!inputValue.trim()) {
            setInputValue('');
          }
        }}
        style={{ width: 160 }}
      />
    </Space>
  );
};

export default ColorTagsInput;
