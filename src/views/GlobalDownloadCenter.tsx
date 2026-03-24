import { PageHeader } from '../components/page'
import DownloadRecordsSection from './order-report/DownloadRecordsSection'

const GlobalDownloadCenter = () => {
  return (
    <div className="oc-page">
      <PageHeader
        title="下载中心"
        subtitle="统一查看各业务模块的导出结果、下载文件和筛选条件。导出文件默认保留 24 小时。"
      />
      <DownloadRecordsSection />
    </div>
  )
}

export default GlobalDownloadCenter
