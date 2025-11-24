import { useCallback, useEffect, useMemo, useState } from 'react';
import { message, Modal, Pagination, Spin } from 'antd';
import type { PaginationProps } from 'antd';
import StyleCard from '../components/StyleCard';
import StyleMaterialsActionBar from '../components/StyleMaterialsActionBar';
import { stylesApi } from '../api/styles';
import type { PaginatedStyleData, StyleData } from '../types/style';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [records, setRecords] = useState<StyleData[]>([]);
  const [pageState, setPageState] = useState<PageState>(defaultPageState);
  const currentPage = pageState.current;
  const currentPageSize = pageState.pageSize;
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const fetchList = useCallback(async (page = 1, pageSize = currentPageSize, keywordValue?: string) => {
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
  }, [currentPageSize, keyword]);

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

  const handleEdit = useCallback(
    (style: StyleData) => {
      navigate(`/foundation/product/detail?id=${style.id}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (style: StyleData) => {
      Modal.confirm({
        title: '删除款式',
        content: `确定要删除「${style.styleNo} ${style.styleName}」吗？`,
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        centered: true,
        onOk: async () => {
          try {
            await stylesApi.delete(style.id);
            message.success('删除成功');
            const trimmedKeyword = keyword.trim();
            const nextPage = currentPage > 1 && records.length <= 1 ? currentPage - 1 : currentPage;
            await fetchList(nextPage, currentPageSize, trimmedKeyword);
          } catch (error) {
            console.error('Failed to delete style', error);
            message.error('删除失败，请稍后重试');
            throw error;
          }
        },
      });
    },
    [currentPage, currentPageSize, fetchList, keyword, records.length],
  );

  const handleNew = useCallback(() => {
    navigate('/foundation/product/detail');
  }, [navigate]);

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
            <StyleCard
              key={item.id}
              style={item}
              onSample={handleSample}
              onProduction={handleProduction}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
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
