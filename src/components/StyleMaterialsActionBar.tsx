import { Button, Input, Space } from 'antd';
import { ExportOutlined, ImportOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';

type StyleMaterialsActionBarProps = {
  keyword: string;
  loading?: boolean;
  onKeywordChange: (value: string) => void;
  onSubmit: () => void;
  onNew: () => void;
  onImport: () => void;
  onExport: () => void;
};

const StyleMaterialsActionBar = ({
  keyword,
  loading,
  onKeywordChange,
  onSubmit,
  onNew,
  onImport,
  onExport,
}: StyleMaterialsActionBarProps) => {
  return (
    <div className="style-action-bar">
      <Space className="style-action-bar__left" size={12}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
          新建
        </Button>
        <Button icon={<ImportOutlined />} onClick={onImport}>
          导入
        </Button>
        <Button icon={<ExportOutlined />} onClick={onExport}>
          导出
        </Button>
      </Space>
      <Input.Search
        className="style-action-bar__search"
        placeholder="款号/款名"
        allowClear
        enterButton={<Button icon={<SearchOutlined />} loading={loading} />}
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onSearch={() => onSubmit()}
      />
    </div>
  );
};

export default StyleMaterialsActionBar;
