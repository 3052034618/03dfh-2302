import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Steps,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Space,
  Avatar,
  Divider,
  message,
  Empty,
  Tooltip,
  Badge,
  Checkbox,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  CommentOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  UndoOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
  APPROVAL_ITEM_STATUS_LABELS,
  APPROVAL_ITEM_STATUS_COLORS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CITY_TIER_LABELS,
  STORE_LEVEL_LABELS,
  DOCTOR_LEVEL_LABELS,
  ApprovalStatus,
  ApprovalItem,
  ApprovalItemStatus,
  PricingChangeDetail,
} from '@/types';
import type { StepsProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
type StepItem = NonNullable<StepsProps['items']>[number];

const { TextArea } = Input;

export default function ApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const approvals = useAppStore((s) => s.approvals);
  const branches = useAppStore((s) => s.branches);
  const decideApproval = useAppStore((s) => s.decideApproval);
  const approveItem = useAppStore((s) => s.approveItem);
  const rejectItem = useAppStore((s) => s.rejectItem);
  const revokeItem = useAppStore((s) => s.revokeItem);
  const batchApproveItems = useAppStore((s) => s.batchApproveItems);
  const batchRejectItems = useAppStore((s) => s.batchRejectItems);
  const currentUser = useAppStore((s) => s.currentUser);

  const [commentText, setCommentText] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const approval = useMemo(() => approvals.find((a) => a.id === id), [approvals, id]);

  const getBranchName = (bid: string) => branches.find((b) => b.id === bid)?.name || bid;

  if (!approval) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <Empty description="未找到该审批单" className="mb-6" />
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate('/approvals')}>
          返回审批列表
        </Button>
      </div>
    );
  }

  const isPending = approval.status === 'pending';
  const isPartial = approval.status === 'partial';
  const canDecide = (isPending || isPartial) && currentUser && (currentUser.role === 'finance' || currentUser.role === 'hq-admin');

  const stats = useMemo(() => {
    const total = approval.items.length;
    const approved = approval.items.filter((i) => i.status === 'approved').length;
    const rejected = approval.items.filter((i) => i.status === 'rejected').length;
    const pending = approval.items.filter((i) => i.status === 'pending').length;
    return { total, approved, rejected, pending };
  }, [approval.items]);

  const pendingItemIds = useMemo(
    () => approval.items.filter((i) => i.status === 'pending').map((i) => i.id),
    [approval.items]
  );

  const steps: StepItem[] = [
    {
      title: '提交申请',
      description: approval.submittedAt,
      icon: <FileTextOutlined />,
      status: 'finish' as const,
      subTitle: approval.submitter,
    },
    {
      title: '运营初审',
      description: '-',
      icon: <UserOutlined />,
      status: approval.status !== 'pending' ? 'finish' : 'process' as const,
      subTitle: '-',
    },
    {
      title: '财务审核',
      description: approval.approvedAt || (approval.status !== 'pending' && approval.status !== 'partial' ? '已完成' : '处理中'),
      icon: <SafetyCertificateOutlined />,
      status:
        approval.status === 'approved'
          ? 'finish' as const
          : approval.status === 'rejected'
          ? 'error' as const
          : approval.status === 'partial'
          ? 'process' as const
          : 'wait' as const,
      subTitle: approval.approver || '-',
    },
  ];

  const currentStep = approval.status === 'approved' ? 3 : approval.status === 'rejected' ? 3 : approval.status === 'partial' ? 2 : 1;

  const handleApproveAll = () => {
    decideApproval(approval.id, 'approved', commentText || undefined, Object.keys(annotations).length > 0 ? annotations : undefined);
    message.success('审批已全部通过');
    setApproveModalOpen(false);
    setCommentText('');
  };

  const handleRejectAll = () => {
    if (!rejectReason.trim()) {
      message.warning('请输入驳回原因');
      return;
    }
    decideApproval(approval.id, 'rejected', rejectReason);
    message.success('已驳回全部审批');
    setRejectModalOpen(false);
    setRejectReason('');
  };

  const handleApproveItem = (item: ApprovalItem) => {
    const annotation = annotations[item.id];
    approveItem(approval.id, item.id, annotation);
    message.success(`已通过「${item.projectName}」`);
  };

  const handleRejectItem = (item: ApprovalItem) => {
    const annotation = annotations[item.id];
    if (!annotation?.trim()) {
      message.warning('请先输入驳回批注');
      return;
    }
    rejectItem(approval.id, item.id, annotation);
    message.success(`已驳回「${item.projectName}」`);
  };

  const handleRevokeItem = (item: ApprovalItem) => {
    revokeItem(approval.id, item.id);
    message.success(`已撤销「${item.projectName}」的审批`);
  };

  const handleBatchApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要审批的项目');
      return;
    }
    const ids = selectedRowKeys as string[];
    const validIds = ids.filter((id) => pendingItemIds.includes(id));
    if (validIds.length === 0) {
      message.warning('选中项中没有待审核的项目');
      return;
    }
    batchApproveItems(approval.id, validIds, annotations);
    message.success(`已批量通过 ${validIds.length} 项`);
    setSelectedRowKeys([]);
  };

  const handleBatchReject = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要驳回的项目');
      return;
    }
    const ids = selectedRowKeys as string[];
    const validIds = ids.filter((id) => pendingItemIds.includes(id));
    if (validIds.length === 0) {
      message.warning('选中项中没有待审核的项目');
      return;
    }
    const allHaveAnnotations = validIds.every((id) => annotations[id]?.trim());
    if (!allHaveAnnotations) {
      message.warning('请为所有选中项填写驳回批注');
      return;
    }
    batchRejectItems(approval.id, validIds, annotations);
    message.success(`已批量驳回 ${validIds.length} 项`);
    setSelectedRowKeys([]);
  };

  const handleSelectAll = () => {
    if (selectedRowKeys.length === pendingItemIds.length) {
      setSelectedRowKeys([]);
    } else {
      setSelectedRowKeys([...pendingItemIds]);
    }
  };

  const handleInvertSelection = () => {
    const newSelected = pendingItemIds.filter((id) => !selectedRowKeys.includes(id));
    setSelectedRowKeys(newSelected);
  };

  const calculateMargin = (oldPrice: number, newPrice: number, floorPrice: number) => {
    const decrease = oldPrice - newPrice;
    const marginFromFloor = newPrice - floorPrice;
    const marginRate = floorPrice > 0 ? (marginFromFloor / floorPrice) * 100 : 0;
    return { decrease, marginFromFloor, marginRate };
  };

  const renderPricingChanges = (changes: PricingChangeDetail[]) => {
    const groupedByCity = changes.reduce((acc, change) => {
      if (!acc[change.cityTier]) acc[change.cityTier] = [];
      acc[change.cityTier].push(change);
      return acc;
    }, {} as Record<string, PricingChangeDetail[]>);

    return (
      <div className="p-4 bg-slate-50/80 rounded-lg space-y-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">定价矩阵变更详情（城市×门店等级×医生职级）</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(groupedByCity).map(([cityTier, cityChanges]) => (
            <div key={cityTier} className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-brand-navy-700 mb-2 pb-2 border-b border-slate-100">
                {CITY_TIER_LABELS[cityTier as keyof typeof CITY_TIER_LABELS]}
              </div>
              <div className="space-y-2">
                {cityChanges.slice(0, 6).map((change, idx) => {
                  const isUp = change.newPrice > change.oldPrice;
                  const diff = change.newPrice - change.oldPrice;
                  const diffPercent = change.oldPrice > 0 ? ((diff / change.oldPrice) * 100).toFixed(1) : '0';
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="text-slate-500">{STORE_LEVEL_LABELS[change.storeLevel as keyof typeof STORE_LEVEL_LABELS]}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">{DOCTOR_LEVEL_LABELS[change.doctorLevel as keyof typeof DOCTOR_LEVEL_LABELS]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through">¥{change.oldPrice.toLocaleString()}</span>
                        <span className={`font-semibold ${isUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                          ¥{change.newPrice.toLocaleString()}
                        </span>
                        <span className={`flex items-center gap-0.5 text-xs ${isUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                          {diffPercent}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                {cityChanges.length > 6 && (
                  <div className="text-xs text-slate-400 text-center pt-1">
                    还有 {cityChanges.length - 6} 项...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const columns: ColumnsType<ApprovalItem> = [
    {
      title: '',
      dataIndex: 'checkbox',
      key: 'checkbox',
      width: 50,
      fixed: 'left' as const,
      render: (_, record) => (
        <Checkbox
          checked={selectedRowKeys.includes(record.id)}
          disabled={record.status !== 'pending' || !canDecide}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRowKeys([...selectedRowKeys, record.id]);
            } else {
              setSelectedRowKeys(selectedRowKeys.filter((k) => k !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 220,
      fixed: 'left' as const,
      render: (text, record) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-800">{text}</span>
          <Tag color={CATEGORY_COLORS[record.category]} className="border-0 w-fit mt-0.5">
            {CATEGORY_LABELS[record.category]}
          </Tag>
        </div>
      ),
    },
    {
      title: '原价 / 申请价',
      key: 'price',
      width: 180,
      align: 'right' as const,
      render: (_, record) => {
        const { decrease } = calculateMargin(record.oldPrice, record.newPrice, record.floorPrice);
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="text-slate-400 line-through text-sm">¥{record.oldPrice.toLocaleString()}</span>
            <span className="text-xl font-bold text-brand-navy-700">¥{record.newPrice.toLocaleString()}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-emerald-600 font-medium">↓¥{decrease.toLocaleString()}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: '底价 / 距底价',
      key: 'floorPrice',
      width: 160,
      align: 'right' as const,
      render: (_, record) => {
        const { marginFromFloor, marginRate } = calculateMargin(record.oldPrice, record.newPrice, record.floorPrice);
        const isLowMargin = marginRate < 20;
        const isCritical = marginRate < 10;
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="font-semibold text-slate-700">¥{record.floorPrice.toLocaleString()}</span>
            <span
              className={`text-xs font-medium ${
                isCritical ? 'text-rose-500' : isLowMargin ? 'text-amber-500' : 'text-slate-400'
              }`}
            >
              +¥{marginFromFloor.toLocaleString()} ({marginRate.toFixed(1)}%)
            </span>
            {isCritical && (
              <Tooltip title="距底价不足10%，毛利率极低，请重点关注">
                <ExclamationCircleOutlined className="text-rose-500 text-xs" />
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: '影响院区',
      key: 'branches',
      width: 120,
      align: 'center' as const,
      render: (_, record) => (
        <Tooltip title={record.affectedBranches.map(getBranchName).join('、')}>
          <Tag color="geekblue" className="border-0 cursor-help">
            {record.affectedBranches.length} 院
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center' as const,
      render: (status: ApprovalItemStatus) => {
        const statusIcon =
          status === 'approved' ? (
            <CheckCircleOutlined className="text-emerald-500" />
          ) : status === 'rejected' ? (
            <CloseCircleOutlined className="text-rose-500" />
          ) : (
            <ClockCircleOutlined className="text-amber-500" />
          );
        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Tag
              color={APPROVAL_ITEM_STATUS_COLORS[status]}
              className="border-0 font-medium px-3 py-1"
              icon={statusIcon}
            >
              {APPROVAL_ITEM_STATUS_LABELS[status]}
            </Tag>
          </motion.div>
        );
      },
    },
    {
      title: '财务批注',
      key: 'annotation',
      width: 200,
      render: (_, record) => (
        <div className="space-y-1">
          {record.annotation ? (
            <div className="p-2 bg-brand-gold-50 rounded-lg border border-brand-gold-200">
              <p className="text-xs text-brand-gold-700 font-medium mb-0.5">
                {approval.approver || '财务'} 批注：
              </p>
              <p className="text-sm text-slate-700">{record.annotation}</p>
            </div>
          ) : canDecide ? (
            <Input
              size="small"
              placeholder="可输入批注..."
              value={annotations[record.id] || ''}
              onChange={(e) => setAnnotations({ ...annotations, [record.id]: e.target.value })}
              className="w-full"
            />
          ) : (
            <span className="text-slate-300 text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_, record) => {
        if (!canDecide) return <span className="text-slate-300">-</span>;
        if (record.status === 'pending') {
          return (
            <Space size="small">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => handleApproveItem(record)}
                >
                  通过
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => handleRejectItem(record)}
                >
                  驳回
                </Button>
              </motion.div>
            </Space>
          );
        }
        return (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              className="text-slate-500 hover:text-brand-navy-600 hover:bg-slate-50"
              onClick={() => handleRevokeItem(record)}
            >
              撤销
            </Button>
          </motion.div>
        );
      },
    },
  ];

  const getRowClassName = (record: ApprovalItem) => {
    const base = 'transition-colors duration-200';
    if (record.status === 'approved') {
      return `${base} bg-emerald-50/60 hover:bg-emerald-50`;
    }
    if (record.status === 'rejected') {
      return `${base} bg-rose-50/60 hover:bg-rose-50`;
    }
    return `${base} hover:bg-brand-gold-50/40`;
  };

  const statusBadgeColor =
    approval.status === 'pending'
      ? 'warning'
      : approval.status === 'approved'
      ? 'success'
      : approval.status === 'rejected'
      ? 'error'
      : 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 min-h-screen bg-gradient-to-br from-slate-50 via-brand-navy-50/20 to-brand-gold-50/30"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/approvals')}
            className="shrink-0"
          >
            返回列表
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-navy-800 tracking-tight truncate font-display">
                {approval.title}
              </h1>
              <Badge
                status={statusBadgeColor}
                text={
                  <Tag color={APPROVAL_STATUS_COLORS[approval.status as ApprovalStatus]} className="border-0 font-medium">
                    {APPROVAL_STATUS_LABELS[approval.status as ApprovalStatus]}
                  </Tag>
                }
              />
            </div>
            <p className="text-sm text-slate-500 mt-1">单号：{approval.id}</p>
          </div>
        </div>

        <Card className="shadow-sm border border-slate-200/60">
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="middle" className="mb-6">
            <Descriptions.Item label="提交人">
              <div className="flex items-center gap-2">
                <Avatar size={24} style={{ backgroundColor: '#1B2A4A', fontSize: 12 }}>
                  {approval.submitter.slice(0, 1)}
                </Avatar>
                <span>{approval.submitter}</span>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">{approval.submittedAt}</Descriptions.Item>
            <Descriptions.Item label="生效日期">
              <span className="text-brand-navy-600 font-medium">{approval.effectiveDate}</span>
            </Descriptions.Item>
            {approval.approver && (
              <Descriptions.Item label="审批人">
                <div className="flex items-center gap-2">
                  <Avatar size={24} style={{ backgroundColor: '#C9A96E', fontSize: 12 }}>
                    {approval.approver.slice(0, 1)}
                  </Avatar>
                  <span>{approval.approver}</span>
                </div>
              </Descriptions.Item>
            )}
            {approval.approvedAt && (
              <Descriptions.Item label="审批时间">{approval.approvedAt}</Descriptions.Item>
            )}
            <Descriptions.Item label="变更项目数">
              <Tag color="brand-navy-500" className="border-0">
                {approval.items.length} 项
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={12} sm={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center"
              >
                <Statistic title="共" value={stats.total} suffix="项" className="!text-slate-700" />
              </motion.div>
            </Col>
            <Col xs={12} sm={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center"
              >
                <Statistic
                  title="通过"
                  value={stats.approved}
                  suffix="项"
                  valueStyle={{ color: '#12B76A' }}
                />
              </motion.div>
            </Col>
            <Col xs={12} sm={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-center"
              >
                <Statistic
                  title="驳回"
                  value={stats.rejected}
                  suffix="项"
                  valueStyle={{ color: '#E5484D' }}
                />
              </motion.div>
            </Col>
            <Col xs={12} sm={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center"
              >
                <Statistic
                  title="待审"
                  value={stats.pending}
                  suffix="项"
                  valueStyle={{ color: '#F79009' }}
                />
              </motion.div>
            </Col>
          </Row>

          <Divider orientation="left" plain className="!mb-4">
            <span className="text-slate-600 font-medium">申请原因</span>
          </Divider>
          <div className="p-4 bg-gradient-to-r from-brand-navy-50/60 to-brand-gold-50/40 rounded-xl border border-brand-gold-100 mb-6">
            <p className="text-slate-700 leading-relaxed">{approval.reason}</p>
          </div>

          <Divider orientation="left" plain className="!mb-4">
            <span className="text-slate-600 font-medium">审批流程</span>
          </Divider>
          <div className="px-4 py-6 bg-slate-50/50 rounded-xl mb-6">
            <Steps
              current={currentStep}
              items={steps}
              size="default"
              className="max-w-3xl mx-auto"
            />
          </div>
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-brand-navy-500" />
              <span>变更明细</span>
              <Tag color="brand-navy-500" className="ml-2 border-0">
                共 {approval.items.length} 项
              </Tag>
            </div>
          }
          className="shadow-sm border border-slate-200/60"
          styles={{ body: { padding: 0 } }}
          extra={
            canDecide && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedRowKeys.length === pendingItemIds.length && pendingItemIds.length > 0}
                  indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < pendingItemIds.length}
                  onChange={handleSelectAll}
                >
                  全选待审
                </Checkbox>
                <Button size="small" type="text" onClick={handleInvertSelection}>
                  反选
                </Button>
                <Divider type="vertical" />
                <span className="text-sm text-slate-500">
                  已选 <span className="font-semibold text-brand-navy-600">{selectedRowKeys.length}</span> 项
                </span>
              </div>
            )
          }
        >
          {canDecide && selectedRowKeys.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-0 z-10 bg-brand-navy-600 text-white px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircleOutlined className="text-brand-gold-400" />
                <span className="text-sm">
                  已选中 <span className="font-semibold text-brand-gold-300">{selectedRowKeys.length}</span> 项待审核项目
                </span>
              </div>
              <Space size="middle">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={handleBatchApprove}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                  >
                    批量通过
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={handleBatchReject}
                    className="bg-rose-500 hover:bg-rose-600 text-white border-0"
                  >
                    批量驳回
                  </Button>
                </motion.div>
              </Space>
            </motion.div>
          )}

          <Table
            rowKey="id"
            columns={columns}
            dataSource={approval.items}
            pagination={false}
            size="middle"
            scroll={{ x: 1400 }}
            className="px-4 py-3"
            rowClassName={getRowClassName}
            expandable={{
              expandedRowRender: (record) => renderPricingChanges(record.pricingChanges || []),
              expandedRowKeys: expandedRowKeys as string[],
              onExpand: (expanded, record) => {
                if (expanded) {
                  setExpandedRowKeys([...expandedRowKeys, record.id]);
                } else {
                  setExpandedRowKeys(expandedRowKeys.filter((k) => k !== record.id));
                }
              },
              expandIconColumnIndex: 1,
            }}
          />
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <CommentOutlined className="text-brand-gold-600" />
              <span>审批意见</span>
              {approval.comments && approval.comments.length > 0 && (
                <Tag color="brand-gold-500" className="ml-2 border-0">
                  {approval.comments.length} 条
                </Tag>
              )}
            </div>
          }
          className="shadow-sm border border-slate-200/60"
        >
          {canDecide && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-3 font-medium">添加审批意见：</p>
              <TextArea
                rows={3}
                placeholder="请输入审批意见（可选）..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="mb-3"
                showCount
                maxLength={500}
              />
            </div>
          )}

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {approval.comments && approval.comments.length > 0 ? (
                approval.comments.map((comment, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.3 }}
                    className="flex gap-3 p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-100 shadow-sm"
                  >
                    <Avatar
                      size={40}
                      style={{ backgroundColor: '#C9A96E', fontSize: 14, fontWeight: 600 }}
                    >
                      {comment.approver.slice(0, 1)}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-semibold text-slate-800">{comment.approver}</span>
                        <Tag color="brand-gold-500" className="border-0 text-xs">
                          财务审核
                        </Tag>
                        <span className="text-xs text-slate-400">{comment.timestamp}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{comment.content}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <CommentOutlined className="text-3xl mb-2 block opacity-30" />
                  暂无审批意见
                </div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {canDecide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="sticky bottom-6 z-10"
          >
            <Card className="shadow-lg border-2 border-brand-gold-200 bg-white/95 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <InfoCircleOutlined className="text-brand-gold-500" />
                  <span className="text-sm">
                    将对所有<span className="font-semibold text-brand-navy-600">待审核</span>项执行操作，
                    <span className="text-emerald-600 font-medium">已通过</span>和
                    <span className="text-rose-600 font-medium">已驳回</span>项保持不变
                  </span>
                </div>
                <Space size="large" className="w-full sm:w-auto justify-end">
                  <Button
                    size="large"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setRejectModalOpen(true)}
                    className="px-8 font-medium"
                  >
                    全部驳回
                  </Button>
                  <Button
                    size="large"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => setApproveModalOpen(true)}
                    className="px-8 font-medium bg-gradient-to-r from-brand-navy-500 to-brand-navy-700 hover:from-brand-navy-600 hover:to-brand-navy-800 border-brand-gold-400"
                  >
                    全部通过
                  </Button>
                </Space>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-rose-500" />
            <span>确认驳回全部待审核项</span>
          </div>
        }
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleRejectAll}
        okText="确认驳回"
        okButtonProps={{ danger: true, size: 'large', icon: <CloseOutlined /> }}
        cancelButtonProps={{ size: 'large' }}
        width={520}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-rose-700 text-sm leading-relaxed">
              驳回后，所有<span className="font-semibold">待审核</span>项将标记为「已驳回」，
              已处理项保持不变。申请人需要重新修改后再次提交。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">待审核项</p>
              <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">已处理项</p>
              <p className="text-xl font-bold text-slate-700">{stats.approved + stats.rejected}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              驳回原因 <span className="text-rose-500">*</span>
            </label>
            <TextArea
              rows={4}
              placeholder="请详细说明驳回原因，以便申请人修改..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              showCount
              maxLength={500}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-emerald-500" />
            <span>确认通过全部待审核项</span>
          </div>
        }
        open={approveModalOpen}
        onCancel={() => setApproveModalOpen(false)}
        onOk={handleApproveAll}
        okText="确认通过"
        okButtonProps={{
          type: 'primary',
          size: 'large',
          icon: <CheckOutlined />,
          className: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0',
        }}
        cancelButtonProps={{ size: 'large' }}
        width={520}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-emerald-700 text-sm leading-relaxed">
              通过后，所有<span className="font-semibold">待审核</span>项将标记为「已通过」，
              新价格将按照生效日期
              <span className="font-bold mx-1">{approval.effectiveDate}</span>
              自动应用至对应院区。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">待审核项</p>
              <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">影响院区数</p>
              <p className="text-xl font-bold text-slate-800">
                {new Set(approval.items.flatMap((i) => i.affectedBranches)).size}
              </p>
            </div>
          </div>
          {commentText && (
            <div className="p-3 bg-brand-navy-50 rounded-lg border border-brand-navy-100">
              <p className="text-xs text-brand-navy-600 font-medium mb-1">您的审批意见：</p>
              <p className="text-sm text-slate-700">{commentText}</p>
            </div>
          )}
        </div>
      </Modal>
    </motion.div>
  );
}
