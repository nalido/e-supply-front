import { useCallback, useEffect, useMemo, useState } from 'react';
import { message, Pagination, Spin } from 'antd';
import type { PaginationProps } from 'antd';
import StyleCard from '../components/StyleCard';
import StyleMaterialsActionBar from '../components/StyleMaterialsActionBar';
import { styles as stylesApi } from '../api/mock';
import type { PaginatedStyleData, StyleData } from '../types/style';
import '../styles/style-materials.css';

type PageState = {
  current: number;
  pageSize: number;
  total: number;
};

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
};

const defaultPageState: PageState = {
  current: 1,
  pageSize: 10,
  total: 0,
};

const StyleMaterials = () => {
  const [records, setRecords] = useState<StyleData[]>([]);
  const [pageState, setPageState] = useState<PageState>(defaultPageState);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const fetchList = useCallback(async (page = 1, pageSize = pageState.pageSize, keywordValue?: string) => {
    setLoading(true);
    try {
      const response: PaginatedStyleData = await stylesApi.list({
        page,
        pageSize,
        keyword: keywordValue ?? keyword,
      });
      setRecords(response.list);
      setPageState({ current: response.page, pageSize: response.pageSize, total: response.total });
    } catch (error) {
      console.error('Failed to load style materials', error);
      message.error('加载款式资料失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [keyword, pageState.pageSize]);

  useEffect(() => {
    fetchList(1, pageState.pageSize, debouncedKeyword);
  }, [debouncedKeyword, fetchList, pageState.pageSize]);

  const handleSubmitSearch = useCallback(() => {
    fetchList(1, pageState.pageSize, keyword.trim());
  }, [fetchList, keyword, pageState.pageSize]);

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value);
  }, []);

  const handleSample = useCallback((styleId: string) => {
    message.info(`打板操作：${styleId}`);
  }, []);

  const handleProduction = useCallback((styleId: string) => {
    message.info(`下大货操作：${styleId}`);
  }, []);

  const handleNew = useCallback(() => {
    message.info('新建款式功能开发中');
  }, []);

  const handleImport = useCallback(() => {
    message.info('导入功能开发中');
  }, []);

  const handleExport = useCallback(() => {
    message.info('导出功能开发中');
  }, []);

  const handlePageChange: PaginationProps['onChange'] = useCallback((page, pageSize) => {
    fetchList(page, pageSize, keyword.trim());
  }, [fetchList, keyword]);

  const emptyText = useMemo(() => (keyword.trim() ? '没有找到匹配的款式' : '暂无款式数据'), [keyword]);

  return (
    <div className="style-materials-container">
      <StyleMaterialsActionBar
        keyword={keyword}
        loading={loading}
        onKeywordChange={handleKeywordChange}
        onSubmit={handleSubmitSearch}
        onNew={handleNew}
        onImport={handleImport}
        onExport={handleExport}
      />
      <Spin spinning={loading} tip="加载中...">
        <div className="style-grid">
          {records.map((item) => (
            <StyleCard key={item.id} style={item} onSample={handleSample} onProduction={handleProduction} />
          ))}
        </div>
        {!loading && records.length === 0 && <div className="style-empty">{emptyText}</div>}
      </Spin>
      <div className="style-pagination">
        <Pagination
          current={pageState.current}
          pageSize={pageState.pageSize}
          total={pageState.total}
          showSizeChanger
          showQuickJumper
          pageSizeOptions={['10', '15', '20', '30']}
          showTotal={(total) => `共 ${total} 条`}
          onChange={handlePageChange}
          onShowSizeChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default StyleMaterials;
