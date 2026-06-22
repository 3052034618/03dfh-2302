import { useState, useMemo } from 'react';
import { Table, Tabs, Input, DatePicker, Tag, Space, Card, Button, Avatar } from 'antd';
import { SearchOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { APPROVAL_STATUS_LABELS, APPROVAL_STATUS_COLORS, ApprovalStatus } from '@/types';
import type { ColumnsType } from 'antd/es/table';
import type { Approval } from '@/types';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

type TabKey = 'pending' | 'approved' | 'rejected' | 'partial';

export default function ApprovalList() {
  const navigate = useNavigate();
  const approvals = useAppStore((s) => s.approvals);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      if (a.status !== activeTab) return false;
      if (searchText) {
        const keyword = searchText.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(keyword);
        const matchSubmitter = a.submitter.toLowerCase().includes(keyword);
        const matchItems = a.items.some((i) => i.projectName.toLowerCase().includes(keyword));
        if (!matchTitle && !matchSubmitter && !matchItems) return false;
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        const submitTime = dayjs(a.submittedAt);
        if (submitTime.isBefore(dateRange[0], 'day') || submitTime.isAfter(dateRange[1], 'day')) {
          return false;
        }
      }
      return true;
    });
  }, [approvals, activeTab, searchText, dateRange]);

  const tabItems = [
    {
      key: 'pending' as TabKey,
      label: (
        <span className="flex items-center gap-2">
          <ClockCircleOutlined className="text-amber-500" />
          待我审批
          <Tag color="warning" className="ml-1 border-0">
            {approvals.filter((a) => a.status === 'pending').length}
          </Tag>
        </span>
      ),
    },
    {
      key: 'partial' as TabKey,
      label: (
        <span className="flex items-center gap-2">
          <CheckCircleOutlined className="text-blue-500" />
          部分通过
          <Tag color="processing" className="ml-1 border-0">
            {approvals.filter((a) => a.status === 'partial').length}
          </Tag>
        </span>
      ),
    },
    {
      key: 'approved' as TabKey,
      label: (
        <span className="flex items-center gap-2">
          <CheckCircleOutlined className="text-emerald-500" />
          已通过
          <Tag color="success" className="ml-1 border-0">
            {approvals.filter((a) => a.status === 'approved').length}
          </Tag>
        </span>
      ),
    },
    {
      key: 'rejected' as TabKey,
      label: (
        <span className="flex items-center gap-2">
          <CloseCircleOutlined className="text-rose-500" />
          已驳回
          <Tag color="error" className="ml-1 border-0">
            {approvals.filter((a) => a.status === 'rejected').length}
          </Tag>
        </span>
      ),
    },
  ];

  const columns: ColumnsType<Approval> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 320,
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={40}
            style={{
              backgroundColor: record.status === 'pending' ? '#f59e0b' : record.status === 'approved' ? '#10b981' : '#f43f5e',
              verticalAlign: 'middle',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {text.slice(0, 2)}
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer transition-colors" onClick={() => navigate(`/approvals/${record.id}`)}>
              {text}
            </span>
            <span className="text-xs text-slate-400 mt-0.5">单号: {record.id}</span>
          </div>
        </div>
      ),
    },
    {
      title: '提交人',
      dataIndex: 'submitter',
      key: 'submitter',
      width: 120,
      render: (name) => (
        <div className="flex items-center gap-2">
          <Avatar size={28} style={{ backgroundColor: '#6366f1', fontSize: 12 }}>
            {name.slice(0, 1)}
          </Avatar>
          <span className="text-slate-700">{name}</span>
        </div>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180,
      sorter: (a, b) => dayjs(a.submittedAt).unix() - dayjs(b.submittedAt).unix(),
      render: (time) => <span className="text-slate-600">{time}</span>,
    },
    {
      title: '项目统计',
      key: 'itemsCount',
      width: 200,
      align: 'center',
      render: (_, record) => {
        const total = record.items.length;
        const approved = record.items.filter((i) => i.status === 'approved').length;
        const rejected = record.items.filter((i) => i.status === 'rejected').length;
        const pending = record.items.filter((i) => i.status === 'pending').length;
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-700">共 {total} 项</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {approved > 0 && (
                <span className="text-emerald-600 font-medium">
                  ✓ {approved}
                </span>
              )}
              {rejected > 0 && (
                <span className="text-rose-600 font-medium">
                  ✕ {rejected}
                </span>
              )}
              {pending > 0 && (
                <span className="text-amber-600 font-medium">
                  ○ {pending}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: '影响院区数',
      key: 'branchesCount',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const branchIds = new Set(record.items.flatMap((i) => i.affectedBranches));
        const count = branchIds.size;
        return (
          <Tag color={count >= 8 ? 'magenta' : count >= 3 ? 'purple' : 'cyan'} className="border-0 font-medium">
            {count} 院
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ApprovalStatus) => (
        <Tag color={APPROVAL_STATUS_COLORS[status]} className="border-0 font-medium px-3 py-1">
          {APPROVAL_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/approvals/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">审批中心</h1>
            <p className="text-sm text-slate-500 mt-1">管理所有价格变更审批流程</p>
          </div>
          <Space wrap>
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="搜索标题 / 提交人 / 项目名"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-72"
            />
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              placeholder={['开始日期', '结束日期']}
              className="w-auto"
            />
          </Space>
        </div>

        <Card
          className="shadow-sm border border-slate-200/60"
          styles={{ body: { padding: 0 } }}
        >
          <div className="px-6 pt-4 border-b border-slate-100">
            <Tabs
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as TabKey)}
              items={tabItems}
              size="large"
              className="approval-tabs"
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'pending' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'pending' ? 10 : -10 }}
              transition={{ duration: 0.25 }}
            >
              <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredApprovals}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条审批`,
                }}
                size="middle"
                className="px-4 py-3"
                scroll={{ x: 1100 }}
                rowClassName={() => 'hover:bg-blue-50/40 transition-colors'}
              />
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </motion.div>
  );
}
