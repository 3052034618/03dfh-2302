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
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  ApprovalStatus,
  ApprovalItem,
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
  const currentUser = useAppStore((s) => s.currentUser);

  const [commentText, setCommentText] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [annotations, setAnnotations] = useState<Record<string, string>>({});

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
  const canDecide = isPending && currentUser && (currentUser.role === 'finance' || currentUser.role === 'hq-admin');

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
      description: approval.approvedAt || (approval.status !== 'pending' ? '已完成' : '待处理'),
      icon: <SafetyCertificateOutlined />,
      status:
        approval.status === 'approved'
          ? 'finish' as const
          : approval.status === 'rejected'
          ? 'error' as const
          : 'wait' as const,
      subTitle: approval.approver || '-',
    },
  ];

  const currentStep = approval.status === 'approved' ? 3 : approval.status === 'rejected' ? 3 : 1;

  const handleApprove = () => {
    decideApproval(approval.id, 'approved', commentText || undefined, Object.keys(annotations).length > 0 ? annotations : undefined);
    message.success('审批已通过');
    setApproveModalOpen(false);
    setCommentText('');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      message.warning('请输入驳回原因');
      return;
    }
    decideApproval(approval.id, 'rejected', rejectReason);
    message.success('已驳回该审批');
    setRejectModalOpen(false);
    setRejectReason('');
  };

  const calculateMargin = (oldPrice: number, newPrice: number, floorPrice: number) => {
    const decrease = oldPrice - newPrice;
    const marginFromFloor = newPrice - floorPrice;
    const marginRate = floorPrice > 0 ? (marginFromFloor / floorPrice) * 100 : 0;
    return { decrease, marginFromFloor, marginRate };
  };

  const columns: ColumnsType<ApprovalItem> = [
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 240,
      fixed: 'left' as const,
      render: (text, record) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-800">{text}</span>
          <Tag color={CATEGORY_COLORS[record.category]} className="border-0 w-fit mt-1">
            {CATEGORY_LABELS[record.category]}
          </Tag>
        </div>
      ),
    },
    {
      title: '原价',
      dataIndex: 'oldPrice',
      key: 'oldPrice',
      width: 130,
      align: 'right' as const,
      render: (price: number) => (
        <span className="text-slate-500 line-through text-lg">¥{price.toLocaleString()}</span>
      ),
    },
    {
      title: '申请价',
      dataIndex: 'newPrice',
      key: 'newPrice',
      width: 150,
      align: 'right' as const,
      render: (price: number, record) => {
        const { decrease, marginRate } = calculateMargin(record.oldPrice, price, record.floorPrice);
        const isLowMargin = marginRate < 5;
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xl font-bold text-blue-600">¥{price.toLocaleString()}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-emerald-600 font-medium">↓¥{decrease.toLocaleString()}</span>
              {isLowMargin && (
                <Tooltip title={`距底价仅 ${marginRate.toFixed(1)}%，毛利率偏低`}>
                  <ExclamationCircleOutlined className="text-amber-500 text-xs" />
                </Tooltip>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: '底价',
      dataIndex: 'floorPrice',
      key: 'floorPrice',
      width: 130,
      align: 'right' as const,
      render: (price: number, record) => {
        const { marginFromFloor, marginRate } = calculateMargin(record.oldPrice, record.newPrice, price);
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="font-semibold text-slate-700">¥{price.toLocaleString()}</span>
            <span className={`text-xs ${marginRate < 5 ? 'text-rose-500' : 'text-slate-400'}`}>
              +¥{marginFromFloor.toLocaleString()} ({marginRate.toFixed(1)}%)
            </span>
          </div>
        );
      },
    },
    {
      title: '影响院区',
      dataIndex: 'affectedBranches',
      key: 'affectedBranches',
      width: 280,
      render: (ids: string[]) => (
        <div className="flex flex-wrap gap-1">
          {ids.length > 5 ? (
            <>
              {ids.slice(0, 4).map((bid) => (
                <Tag key={bid} color="geekblue" className="border-0 text-xs">
                  {getBranchName(bid)}
                </Tag>
              ))}
              <Tooltip title={ids.map(getBranchName).join('、')}>
                <Tag color="default" className="border-0 text-xs cursor-help">
                  +{ids.length - 4} 个院区
                </Tag>
              </Tooltip>
            </>
          ) : (
            ids.map((bid) => (
              <Tag key={bid} color="geekblue" className="border-0 text-xs">
                {getBranchName(bid)}
              </Tag>
            ))
          )}
        </div>
      ),
    },
    {
      title: '运营备注',
      dataIndex: 'note',
      key: 'note',
      width: 200,
      render: (text) => (
        <Tooltip title={text}>
          <span className="text-slate-600 text-sm line-clamp-2">
            {text || <span className="text-slate-300">-</span>}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '财务批注',
      key: 'annotation',
      width: 220,
      fixed: 'right' as const,
      render: (_, record) => (
        <div className="space-y-2">
          {record.annotation ? (
            <div className="p-2 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs text-violet-600 font-medium mb-1">{approval.approver} 批注：</p>
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
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30"
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">{approval.title}</h1>
              <Badge
                status={
                  approval.status === 'pending'
                    ? 'warning'
                    : approval.status === 'approved'
                    ? 'success'
                    : 'error'
                }
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
                <Avatar size={24} style={{ backgroundColor: '#6366f1', fontSize: 12 }}>
                  {approval.submitter.slice(0, 1)}
                </Avatar>
                <span>{approval.submitter}</span>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">{approval.submittedAt}</Descriptions.Item>
            <Descriptions.Item label="生效日期">
              <span className="text-blue-600 font-medium">{approval.effectiveDate}</span>
            </Descriptions.Item>
            {approval.approver && (
              <Descriptions.Item label="审批人">
                <div className="flex items-center gap-2">
                  <Avatar size={24} style={{ backgroundColor: '#10b981', fontSize: 12 }}>
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
              <Tag color="blue" className="border-0">
                {approval.items.length} 项
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left" plain className="!mb-4">
            <span className="text-slate-600 font-medium">申请原因</span>
          </Divider>
          <div className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 rounded-xl border border-blue-100/60 mb-6">
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
              <FileTextOutlined className="text-blue-500" />
              <span>变更明细</span>
              <Tag color="blue" className="ml-2 border-0">
                共 {approval.items.length} 项
              </Tag>
            </div>
          }
          className="shadow-sm border border-slate-200/60"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={approval.items}
            pagination={false}
            size="middle"
            scroll={{ x: 1350 }}
            className="px-4 py-3"
            rowClassName={(record) => {
              const { marginRate } = calculateMargin(record.oldPrice, record.newPrice, record.floorPrice);
              return marginRate < 5 ? 'bg-amber-50/30 hover:bg-amber-50/50 !transition-colors' : 'hover:bg-blue-50/40 !transition-colors';
            }}
          />
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <CommentOutlined className="text-violet-500" />
              <span>审批意见</span>
              {approval.comments && approval.comments.length > 0 && (
                <Tag color="purple" className="ml-2 border-0">
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
                      style={{ backgroundColor: '#8b5cf6', fontSize: 14, fontWeight: 600 }}
                    >
                      {comment.approver.slice(0, 1)}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-semibold text-slate-800">{comment.approver}</span>
                        <Tag color="purple" className="border-0 text-xs">
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
            <Card className="shadow-lg border-2 border-blue-100 bg-white/95 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <InfoCircleOutlined className="text-blue-500" />
                  <span className="text-sm">请仔细核对所有变更项，确认无误后操作</span>
                </div>
                <Space size="large" className="w-full sm:w-auto justify-end">
                  <Button
                    size="large"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setRejectModalOpen(true)}
                    className="px-8 font-medium"
                  >
                    驳回申请
                  </Button>
                  <Button
                    size="large"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => setApproveModalOpen(true)}
                    className="px-8 font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0"
                  >
                    通过审批
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
            <span>确认驳回申请</span>
          </div>
        }
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleReject}
        okText="确认驳回"
        okButtonProps={{ danger: true, size: 'large', icon: <CloseOutlined /> }}
        cancelButtonProps={{ size: 'large' }}
        width={520}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-rose-700 text-sm leading-relaxed">
              驳回后，该审批将标记为「已驳回」，申请人需要重新修改后再次提交。
            </p>
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
            <span>确认通过审批</span>
          </div>
        }
        open={approveModalOpen}
        onCancel={() => setApproveModalOpen(false)}
        onOk={handleApprove}
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
              通过后，新价格将按照生效日期
              <span className="font-bold mx-1">{approval.effectiveDate}</span>
              自动应用至对应院区，相关变更将同步至价目表。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">变更项目数</p>
              <p className="text-xl font-bold text-slate-800">{approval.items.length}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">影响院区数</p>
              <p className="text-xl font-bold text-slate-800">
                {new Set(approval.items.flatMap((i) => i.affectedBranches)).size}
              </p>
            </div>
          </div>
          {commentText && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">您的审批意见：</p>
              <p className="text-sm text-slate-700">{commentText}</p>
            </div>
          )}
          {Object.keys(annotations).length > 0 && (
            <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs text-violet-600 font-medium mb-2">
                已批注 {Object.keys(annotations).length} 个项目
              </p>
              <SendOutlined className="text-violet-400 text-xs" />
            </div>
          )}
        </div>
      </Modal>
    </motion.div>
  );
}
