import { useState, useMemo } from 'react';
import {
  Select,
  DatePicker,
  Card,
  Avatar,
  Tag,
  Space,
  Button,
  Drawer,
  Descriptions,
  Empty,
  Tooltip,
  Divider,
  Collapse,
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  ExpandAltOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  EditOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  RocketOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
  ShopOutlined,
  PartitionOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import {
  CHANGE_ACTION_LABELS,
  CHANGE_MODULE_LABELS,
  USER_ROLE_LABELS,
  ChangeAction,
  ChangeModule,
  ChangeLog,
} from '@/types';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

const ACTION_COLORS: Record<ChangeAction, string> = {
  create: 'green',
  update: 'blue',
  approve: 'success',
  reject: 'error',
  publish: 'gold',
};

const ACTION_ICONS: Record<ChangeAction, React.ReactNode> = {
  create: <PlusOutlined />,
  update: <EditOutlined />,
  approve: <CheckCircleTwoTone twoToneColor="#52c41a" />,
  reject: <CloseCircleTwoTone twoToneColor="#ff4d4f" />,
  publish: <RocketOutlined className="text-amber-500" />,
};

const MODULE_ICONS: Record<ChangeModule, React.ReactNode> = {
  project: <MedicineBoxOutlined className="text-magenta-500" />,
  price: <DollarOutlined className="text-blue-500" />,
  branch: <ShopOutlined className="text-cyan-500" />,
  version: <PartitionOutlined className="text-violet-500" />,
};

export default function ChangeLogsPage() {
  const changeLogs = useAppStore((s) => s.changeLogs);
  const branches = useAppStore((s) => s.branches);
  const users = useAppStore((s) => s.users);

  const [moduleFilter, setModuleFilter] = useState<ChangeModule | undefined>();
  const [actionFilter, setActionFilter] = useState<ChangeAction | undefined>();
  const [operatorFilter, setOperatorFilter] = useState<string | undefined>();
  const [branchFilter, setBranchFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedLog, setSelectedLog] = useState<ChangeLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getBranchName = (bid: string) => branches.find((b) => b.id === bid)?.name || bid;

  const hasActiveFilters = moduleFilter || actionFilter || operatorFilter || branchFilter || dateRange;

  const filteredLogs = useMemo(() => {
    return changeLogs.filter((log) => {
      if (moduleFilter && log.module !== moduleFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      if (operatorFilter && log.operator !== operatorFilter) return false;
      if (branchFilter) {
        if (branchFilter === '全院') {
          if (!log.affectedBranches.includes('全院')) return false;
        } else {
          if (!log.affectedBranches.includes(branchFilter) && !log.affectedBranches.includes('全院')) return false;
        }
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        const logTime = dayjs(log.timestamp);
        if (logTime.isBefore(dateRange[0], 'day') || logTime.isAfter(dateRange[1], 'day')) return false;
      }
      return true;
    });
  }, [changeLogs, moduleFilter, actionFilter, operatorFilter, branchFilter, dateRange]);

  const handleResetFilters = () => {
    setModuleFilter(undefined);
    setActionFilter(undefined);
    setOperatorFilter(undefined);
    setBranchFilter(undefined);
    setDateRange(null);
  };

  const handleViewDetail = (log: ChangeLog) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  };

  const groupLogsByDate = useMemo(() => {
    const groups: Record<string, ChangeLog[]> = {};
    filteredLogs.forEach((log) => {
      const date = dayjs(log.timestamp).format('YYYY年MM月DD日');
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return Object.entries(groups).sort((a, b) => dayjs(b[0], 'YYYY年MM月DD日').unix() - dayjs(a[0], 'YYYY年MM月DD日').unix());
  }, [filteredLogs]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">变更日志</h1>
            <p className="text-sm text-slate-500 mt-1">记录系统中所有关键操作的历史轨迹</p>
          </div>
          <Space>
            {hasActiveFilters && (
              <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
                重置筛选
              </Button>
            )}
          </Space>
        </div>

        <Card className="shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <FilterOutlined className="text-slate-500" />
            <span className="font-medium text-slate-700">筛选条件</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              allowClear
              placeholder="模块"
              value={moduleFilter}
              onChange={(v) => setModuleFilter(v)}
              className="w-full"
            >
              {Object.entries(CHANGE_MODULE_LABELS).map(([key, label]) => (
                <Option key={key} value={key}>
                  <span className="flex items-center gap-2">
                    {MODULE_ICONS[key as ChangeModule]}
                    {label}
                  </span>
                </Option>
              ))}
            </Select>

            <Select
              allowClear
              placeholder="操作类型"
              value={actionFilter}
              onChange={(v) => setActionFilter(v)}
              className="w-full"
            >
              {Object.entries(CHANGE_ACTION_LABELS).map(([key, label]) => (
                <Option key={key} value={key}>
                  <span className="flex items-center gap-2">
                    {ACTION_ICONS[key as ChangeAction]}
                    {label}
                  </span>
                </Option>
              ))}
            </Select>

            <Select
              allowClear
              placeholder="操作人"
              value={operatorFilter}
              onChange={(v) => setOperatorFilter(v)}
              className="w-full"
              showSearch
              optionFilterProp="label"
            >
              {users.map((u) => (
                <Option key={u.name} value={u.name} label={u.name}>
                  <div className="flex items-center gap-2">
                    <Avatar size={20} src={u.avatar} style={{ fontSize: 10 }}>
                      {u.name.slice(0, 1)}
                    </Avatar>
                    <span>{u.name}</span>
                    <Tag color="default" className="text-xs border-0 ml-auto">
                      {USER_ROLE_LABELS[u.role]}
                    </Tag>
                  </div>
                </Option>
              ))}
            </Select>

            <Select
              allowClear
              placeholder="影响院区"
              value={branchFilter}
              onChange={(v) => setBranchFilter(v)}
              className="w-full"
              showSearch
              optionFilterProp="label"
            >
              <Option value="全院">全院</Option>
              {branches.map((b) => (
                <Option key={b.id} value={b.id} label={b.name}>
                  <span>{b.name}</span>
                </Option>
              ))}
            </Select>

            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              placeholder={['开始', '结束']}
              className="w-full"
            />
          </div>
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500">当前筛选后：</span>
              <Tag color="gold" className="border-0">
                共 {filteredLogs.length} 条记录
              </Tag>
            </div>
          )}
        </Card>

        {filteredLogs.length === 0 ? (
          <Card className="shadow-sm border border-slate-200/60">
            <Empty description="暂无符合条件的变更记录" className="py-12" />
          </Card>
        ) : (
          <div className="relative">
            <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-300 via-amber-200 to-slate-100" />

            {groupLogsByDate.map(([date, logs], dateIdx) => (
              <motion.div
                key={date}
                variants={container}
                initial="hidden"
                animate="show"
                className="mb-8"
              >
                <motion.div variants={item} className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50 shrink-0">
                    <ClockCircleOutlined className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{date}</h3>
                    <p className="text-xs text-slate-500">{logs.length} 条变更</p>
                  </div>
                </motion.div>

                <div className="ml-6 space-y-4 relative">
                  <AnimatePresence initial={false}>
                    {logs.map((log, idx) => (
                      <motion.div
                        key={log.id}
                        variants={item}
                        custom={dateIdx * logs.length + idx}
                        layout
                        className="relative pl-10"
                      >
                        <div className="absolute left-[13px] top-6 w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 border-4 border-white shadow-md z-10" />
                        <div className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200" />

                        <Card
                          size="small"
                          className="hover:shadow-md transition-all duration-300 border border-slate-200/70 hover:border-amber-200 group cursor-pointer"
                          styles={{ body: { padding: '16px 20px' } }}
                          onClick={() => handleViewDetail(log)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Tag color={ACTION_COLORS[log.action]} className="border-0 font-medium">
                                  <span className="mr-1">{ACTION_ICONS[log.action]}</span>
                                  {CHANGE_ACTION_LABELS[log.action]}
                                </Tag>
                                <Tag color="geekblue" className="border-0">
                                  <span className="mr-1">{MODULE_ICONS[log.module]}</span>
                                  {CHANGE_MODULE_LABELS[log.module]}
                                </Tag>
                                <Tag color="default" className="border-0 bg-slate-100">
                                  {USER_ROLE_LABELS[log.role]}
                                </Tag>
                              </div>

                              <div className="flex items-center gap-2 mb-2">
                                <Avatar size={26} src={users.find((u) => u.name === log.operator)?.avatar}>
                                  {log.operator.slice(0, 1)}
                                </Avatar>
                                <span className="font-semibold text-slate-800">{log.operator}</span>
                                <ArrowRightOutlined className="text-slate-400 text-xs" />
                                <span className="text-slate-700 font-medium truncate">{log.targetName}</span>
                              </div>

                              <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <ClockCircleOutlined />
                                  {log.timestamp}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ShopOutlined />
                                  影响 {log.affectedBranchesCount} 个院区
                                </span>
                              </div>
                            </div>

                            <Tooltip title="查看详情">
                              <Button
                                type="text"
                                size="small"
                                icon={<ExpandAltOutlined />}
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetail(log);
                                }}
                              />
                            </Tooltip>
                          </div>

                          {(log.oldValue || log.newValue) && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Collapse
                                ghost
                                size="small"
                                className="mt-3 !border-0"
                                expandIconPosition="end"
                              >
                                <Panel
                                  header={<span className="text-xs text-slate-500">快速预览变更内容</span>}
                                  key="1"
                                >
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                      <p className="text-slate-500 font-medium mb-1">变更前</p>
                                      <pre className="text-slate-700 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                                        {formatValue(log.oldValue)}
                                      </pre>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                      <p className="text-emerald-600 font-medium mb-1">变更后</p>
                                      <pre className="text-slate-700 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                                        {formatValue(log.newValue)}
                                      </pre>
                                    </div>
                                  </div>
                                </Panel>
                              </Collapse>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <ExpandAltOutlined className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">变更详情</h3>
              <p className="text-xs text-slate-500">{selectedLog?.id}</p>
            </div>
          </div>
        }
        placement="right"
        width={560}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        extra={
          <Button size="small" onClick={() => setDrawerOpen(false)}>
            关闭
          </Button>
        }
      >
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Tag color={ACTION_COLORS[selectedLog.action]} className="border-0 font-medium px-3 py-1">
                <span className="mr-1">{ACTION_ICONS[selectedLog.action]}</span>
                {CHANGE_ACTION_LABELS[selectedLog.action]}
              </Tag>
              <Tag color="geekblue" className="border-0 px-3 py-1">
                <span className="mr-1">{MODULE_ICONS[selectedLog.module]}</span>
                {CHANGE_MODULE_LABELS[selectedLog.module]}
              </Tag>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="操作目标">{selectedLog.targetName}</Descriptions.Item>
              <Descriptions.Item label="目标ID">
                <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{selectedLog.targetId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                <div className="flex items-center gap-2">
                  <Avatar size={20} src={users.find((u) => u.name === selectedLog.operator)?.avatar}>
                    {selectedLog.operator.slice(0, 1)}
                  </Avatar>
                  <span>{selectedLog.operator}</span>
                  <Tag color="default" className="text-xs border-0">
                    {USER_ROLE_LABELS[selectedLog.role]}
                  </Tag>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="操作时间">{selectedLog.timestamp}</Descriptions.Item>
              <Descriptions.Item label="影响院区数">{selectedLog.affectedBranchesCount} 个</Descriptions.Item>
            </Descriptions>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">影响院区：</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedLog.affectedBranches.map((bid) => (
                  <Tag key={bid} color="cyan" className="border-0">
                    {bid === '全院' ? '全院' : getBranchName(bid)}
                  </Tag>
                ))}
              </div>
            </div>

            <Divider plain className="!m-0">
              <span className="text-slate-500 text-sm font-medium">变更内容对比</span>
            </Divider>

            <div className="grid grid-cols-1 gap-4">
              {selectedLog.oldValue !== null && selectedLog.oldValue !== undefined ? (
                <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100/30 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-2 mb-3">
                    <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                    <span className="text-sm font-semibold text-rose-700">变更前 (Old Value)</span>
                  </div>
                  <pre className="bg-white/70 backdrop-blur-sm p-3 rounded-lg text-slate-700 whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-x-auto">
                    {formatValue(selectedLog.oldValue)}
                  </pre>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/30 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CloseCircleTwoTone twoToneColor="#94a3b8" />
                    <span className="text-sm font-semibold text-slate-600">变更前</span>
                  </div>
                  <p className="text-slate-400 text-sm italic">无（新建操作）</p>
                </div>
              )}

              <div className="flex justify-center">
                <ArrowRightOutlined className="text-2xl text-amber-400" />
              </div>

              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-100/30 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleTwoTone twoToneColor="#52c41a" />
                  <span className="text-sm font-semibold text-emerald-700">变更后 (New Value)</span>
                </div>
                <pre className="bg-white/70 backdrop-blur-sm p-3 rounded-lg text-slate-700 whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-x-auto">
                  {formatValue(selectedLog.newValue)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </Drawer>
    </motion.div>
  );
}
