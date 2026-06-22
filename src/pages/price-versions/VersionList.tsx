import { useState, useMemo } from 'react';
import {
  Tabs,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
} from 'antd';
import {
  Plus,
  Eye,
  Edit3,
  Send,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  VERSION_TYPE_LABELS,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_COLORS,
  type VersionType,
  type VersionStatus,
  type PriceVersion,
} from '@/types';
import type { TabsProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const typeTagColors: Record<VersionType, string> = {
  base: 'blue',
  holiday: 'orange',
  anniversary: 'magenta',
  loyalty: 'purple',
};

const statusMap: Record<VersionStatus, VersionStatus> = {
  draft: 'draft',
  pending: 'pending',
  approved: 'approved',
  effective: 'effective',
  expired: 'expired',
};

export default function VersionList() {
  const navigate = useNavigate();
  const { priceVersions, projects, addPriceVersion, updatePriceVersion, submitApproval, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submittingVersion, setSubmittingVersion] = useState<PriceVersion | null>(null);
  const [form] = Form.useForm();
  const [submitForm] = Form.useForm();

  const tabItems: TabsProps['items'] = [
    { key: 'all', label: '全部' },
    { key: 'base', label: '基础版本' },
    { key: 'holiday', label: '节假日版本' },
    { key: 'anniversary', label: '周年庆版本' },
    { key: 'loyalty', label: '老客专享版本' },
  ];

  const filteredVersions = useMemo(() => {
    if (activeTab === 'all') return priceVersions;
    return priceVersions.filter((v) => v.type === activeTab);
  }, [activeTab, priceVersions]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.effectiveRange;
      addPriceVersion({
        name: values.name,
        type: values.type,
        status: 'draft',
        effectiveDate: start.format('YYYY-MM-DD'),
        expireDate: end.format('YYYY-MM-DD'),
        description: values.description || '',
        pricing: {},
        createdBy: currentUser?.name || '系统',
      });
      message.success('价格版本创建成功');
      setCreateModalOpen(false);
      form.resetFields();
    } catch {
      // 表单校验失败
    }
  };

  const handleSubmitApproval = async () => {
    if (!submittingVersion) return;
    try {
      const values = await submitForm.validateFields();
      const effectiveDate = values.effectiveDate
        ? values.effectiveDate.format('YYYY-MM-DD')
        : submittingVersion.effectiveDate;
      const items = Object.keys(submittingVersion.pricing).map((pid) => {
        const project = projects.find((p) => p.id === pid);
        const pricing = submittingVersion.pricing[pid];
        const baseEntry = pricing?.find(
          (e) => e.cityTier === 'tier2' && e.storeLevel === 'standard' && e.doctorLevel === 'attending'
        );
        return {
          id: `${submittingVersion.id}-${pid}`,
          projectId: pid,
          projectName: project?.name || '',
          category: project?.category || 'hyaluronic',
          oldPrice: project?.basePrice || 0,
          newPrice: baseEntry?.price || project?.basePrice || 0,
          floorPrice: project?.floorPrice || 0,
          affectedBranches: useAppStore.getState().branches.map((b) => b.id),
          note: '',
          status: 'pending' as const,
          pricingChanges: [],
        };
      });
      submitApproval({
        title: `${submittingVersion.name} 价格审批`,
        submitter: currentUser?.name || '系统',
        reason: values.reason,
        effectiveDate,
        items,
      });
      updatePriceVersion(submittingVersion.id, { status: 'pending' });
      message.success('已提交审批');
      setSubmitModalOpen(false);
      setSubmittingVersion(null);
      submitForm.resetFields();
    } catch {
      // 表单校验失败
    }
  };

  const openSubmitModal = (version: PriceVersion) => {
    setSubmittingVersion(version);
    setSubmitModalOpen(true);
  };

  const columns: ColumnsType<PriceVersion> = [
    {
      title: '版本名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-navy-500 to-brand-navy-700 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-brand-navy-700">{text}</div>
            <div className="text-xs text-gray-400 mt-0.5">创建人：{record.createdBy}</div>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: VersionType) => (
        <Tag color={typeTagColors[type]} className="font-medium">
          {VERSION_TYPE_LABELS[type]}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: VersionStatus) => (
        <Tag color={VERSION_STATUS_COLORS[statusMap[status]]} className="font-medium">
          {VERSION_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '生效期',
      key: 'effectivePeriod',
      width: 220,
      render: (_, record) => (
        <div className="flex items-center gap-2 text-gray-600">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span className="text-sm">
            {record.effectiveDate} ~ {record.expireDate}
          </span>
        </div>
      ),
    },
    {
      title: '项目数',
      key: 'projectsCount',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <span className="font-semibold text-brand-navy-600">
          {Object.keys(record.pricing).length}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => navigate(`/price-versions/${record.id}`)}
          >
            详情
          </Button>
          {(record.status === 'draft') && Object.keys(record.pricing).length > 0 && (
            <Button
              type="link"
              size="small"
              icon={<Send className="w-4 h-4" />}
              onClick={() => openSubmitModal(record)}
              className="text-semantic-warning"
            >
              提交审批
            </Button>
          )}
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<Edit3 className="w-4 h-4" />}
              onClick={() => navigate(`/price-versions/${record.id}`)}
            >
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-gold-50/30">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy-700 font-display">
              价格版本管理
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              管理基础版本、节假日促销、周年庆活动、老客专享等多版本价格体系
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="primary"
              size="large"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setCreateModalOpen(true)}
              className="bg-brand-navy-500 hover:bg-brand-navy-600 shadow-navy-md"
            >
              新建版本
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
      >
        <div className="px-6 pt-4 border-b border-gray-100">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            className="version-tabs"
          />
        </div>
        <div className="p-6 pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredVersions}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 个版本`,
                }}
                scroll={{ x: 1000 }}
                rowClassName={() => 'hover:bg-brand-gold-50/30 transition-colors'}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-navy-500" />
            <span className="font-semibold">新建价格版本</span>
          </div>
        }
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        okText="创建版本"
        cancelText="取消"
        width={560}
        okButtonProps={{ className: 'bg-brand-navy-500 hover:bg-brand-navy-600' }}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
          initialValues={{ type: 'base' }}
        >
          <Form.Item
            label="版本名称"
            name="name"
            rules={[{ required: true, message: '请输入版本名称' }]}
          >
            <Input placeholder="如：2026年度基础价" />
          </Form.Item>
          <Form.Item
            label="版本类型"
            name="type"
            rules={[{ required: true, message: '请选择版本类型' }]}
          >
            <Select
              options={[
                { value: 'base', label: VERSION_TYPE_LABELS.base },
                { value: 'holiday', label: VERSION_TYPE_LABELS.holiday },
                { value: 'anniversary', label: VERSION_TYPE_LABELS.anniversary },
                { value: 'loyalty', label: VERSION_TYPE_LABELS.loyalty },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="生效日期范围"
            name="effectiveRange"
            rules={[{ required: true, message: '请选择生效日期范围' }]}
          >
            <RangePicker
              className="w-full"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          <Form.Item label="版本说明" name="description">
            <TextArea rows={3} placeholder="可选：说明版本适用场景、特殊规则等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-semantic-warning" />
            <span className="font-semibold">提交审批</span>
          </div>
        }
        open={submitModalOpen}
        onOk={handleSubmitApproval}
        onCancel={() => {
          setSubmitModalOpen(false);
          setSubmittingVersion(null);
          submitForm.resetFields();
        }}
        okText="提交"
        cancelText="取消"
        width={520}
        okButtonProps={{ className: 'bg-semantic-warning hover:bg-semantic-warning/90' }}
      >
        {submittingVersion && (
          <div className="mb-4 p-4 bg-brand-gold-50/50 rounded-xl border border-brand-gold-100">
            <div className="text-sm font-medium text-brand-navy-700 mb-1">
              {submittingVersion.name}
            </div>
            <div className="text-xs text-gray-500">
              包含 {Object.keys(submittingVersion.pricing).length} 个项目，
              生效期 {submittingVersion.effectiveDate} ~ {submittingVersion.expireDate}
            </div>
          </div>
        )}
        <Form form={submitForm} layout="vertical">
          <Form.Item
            label="生效日期"
            name="effectiveDate"
            rules={[{ required: true, message: '请选择生效日期' }]}
          >
            <DatePicker
              className="w-full"
              placeholder="请选择审批通过后的生效日期"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          <Form.Item
            label="调整原因"
            name="reason"
            rules={[{ required: true, message: '请填写调整原因' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细说明价格调整的原因、背景、预期效果等"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
