import { Button, Input, Space } from 'antd';
import { ExportOutlined, ImportOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';

type MaterialActionBarProps = {
  keyword: string;
  loading?: boolean;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
};

const MaterialActionBar = ({
  keyword,
  loading,
  onKeywordChange,
  onSearch,
  onCreate,
  onImport,
  onExport,
}: MaterialActionBarProps) => {
  return (
    <div className="material-action-bar">
      <Space className="material-action-bar__left" size={12}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
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
        className="material-action-bar__search"
        placeholder="名称"
        allowClear
        enterButton={<Button icon={<SearchOutlined />} loading={loading} />}
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onSearch={() => onSearch()}
      />
    </div>
  );
};

export default MaterialActionBar;
