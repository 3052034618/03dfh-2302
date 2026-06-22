import { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Tooltip,
  InputNumber,
  DatePicker,
  Input,
  Modal,
  Select,
  message,
  Empty,
  Card,
  Badge,
  Avatar,
  Form,
} from 'antd';
import {
  MapPin,
  Phone,
  Building2,
  AlertTriangle,
  Save,
  Copy,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import {
  CITY_TIER_LABELS,
  STORE_LEVEL_LABELS,
  CATEGORY_LABELS,
  VERSION_TYPE_LABELS,
  type Branch,
  type PriceOverride,
  type PriceVersion,
  type Project,
  type VersionType,
} from '@/types';
import type { ColumnsType } from 'antd/es/table';

interface OverrideRow {
  key: string;
  projectId: string;
  projectName: string;
  category: Project['category'];
  versionId: string;
  versionName: string;
  versionType: VersionType;
  standardPrice: number;
  customPrice: number;
  floorPrice: number;
  effectiveDate: string;
  note: string;
}

export default function BranchDiff() {
  const {
    branches,
    projects,
    priceVersions,
    updateBranchOverride,
    getProjectPriceForBranch,
  } = useAppStore();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [localOverrides, setLocalOverrides] = useState<Record<string, PriceOverride[]>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState<string>('');
  const [targetBranchIds, setTargetBranchIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [addForm] = Form.useForm();

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const branchesByCity = useMemo(() => {
    const map: Record<string, Branch[]> = {};
    branches.forEach((b) => {
      if (!map[b.city]) map[b.city] = [];
      map[b.city].push(b);
    });
    return map;
  }, [branches]);

  const cities = Object.keys(branchesByCity);

  const initializeBranchOverrides = (branchId: string) => {
    if (!localOverrides[branchId]) {
      const branch = branches.find((b) => b.id === branchId);
      setLocalOverrides((prev) => ({
        ...prev,
        [branchId]: branch ? [...branch.priceOverrides] : [],
      }));
    }
  };

  const getBranchOverrides = (branchId: string): PriceOverride[] => {
    initializeBranchOverrides(branchId);
    return localOverrides[branchId] || [];
  };

  const currentOverrides = getBranchOverrides(selectedBranchId);

  const overrideRows: OverrideRow[] = useMemo(() => {
    return currentOverrides.map((o, idx) => {
      const project = projects.find((p) => p.id === o.projectId);
      const version = priceVersions.find((v) => v.id === o.versionId);
      const standardPrice = selectedBranch
        ? getProjectPriceForBranch(o.projectId, selectedBranch.id, o.versionId)
        : project?.basePrice || 0;
      return {
        key: `${o.projectId}-${o.versionId}-${idx}`,
        projectId: o.projectId,
        projectName: project?.name || '未知项目',
        category: project?.category || 'hyaluronic',
        versionId: o.versionId,
        versionName: version?.name || '未知版本',
        versionType: version?.type || 'base',
        standardPrice,
        customPrice: o.customPrice,
        floorPrice: project?.floorPrice || 0,
        effectiveDate: o.effectiveDate,
        note: o.note || '',
      };
    });
  }, [currentOverrides, projects, priceVersions, selectedBranch, getProjectPriceForBranch]);

  const belowFloorCount = overrideRows.filter((r) => r.customPrice < r.floorPrice).length;

  const toggleCity = (city: string) => {
    const next = new Set(expandedCities);
    if (next.has(city)) {
      next.delete(city);
    } else {
      next.add(city);
    }
    setExpandedCities(next);
  };

  const selectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    initializeBranchOverrides(branchId);
  };

  const updateOverrideRow = (key: string, field: keyof PriceOverride, value: string | number) => {
    const overrides = [...getBranchOverrides(selectedBranchId)];
    const idx = overrideRows.findIndex((r) => r.key === key);
    if (idx >= 0) {
      overrides[idx] = { ...overrides[idx], [field]: value };
      setLocalOverrides((prev) => ({ ...prev, [selectedBranchId]: overrides }));
      setHasChanges((prev) => ({ ...prev, [selectedBranchId]: true }));
    }
  };

  const deleteOverrideRow = (key: string) => {
    const overrides = [...getBranchOverrides(selectedBranchId)];
    const idx = overrideRows.findIndex((r) => r.key === key);
    if (idx >= 0) {
      overrides.splice(idx, 1);
      setLocalOverrides((prev) => ({ ...prev, [selectedBranchId]: overrides }));
      setHasChanges((prev) => ({ ...prev, [selectedBranchId]: true }));
      message.success('已删除该定价');
    }
  };

  const handleSave = () => {
    if (!selectedBranch) return;
    updateBranchOverride(selectedBranch.id, getBranchOverrides(selectedBranchId));
    setHasChanges((prev) => ({ ...prev, [selectedBranchId]: false }));
    message.success('院区差异化定价已保存');
  };

  const handleAddOverride = async () => {
    try {
      const values = await addForm.validateFields();
      const project = projects.find((p) => p.id === values.projectId);
      const version = priceVersions.find((v) => v.id === values.versionId);
      if (!project || !version || !selectedBranch) return;

      const exists = currentOverrides.find(
        (o) => o.projectId === values.projectId && o.versionId === values.versionId
      );
      if (exists) {
        message.error('该项目在此版本中已有差异化定价');
        return;
      }

      const standardPrice = getProjectPriceForBranch(
        values.projectId,
        selectedBranch.id,
        values.versionId
      );
      const newOverride: PriceOverride = {
        projectId: values.projectId,
        versionId: values.versionId,
        customPrice: values.customPrice ?? standardPrice,
        effectiveDate: values.effectiveDate
          ? dayjs(values.effectiveDate).format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD'),
        note: values.note || '',
      };

      const overrides = [...getBranchOverrides(selectedBranchId), newOverride];
      setLocalOverrides((prev) => ({ ...prev, [selectedBranchId]: overrides }));
      setHasChanges((prev) => ({ ...prev, [selectedBranchId]: true }));
      setAddModalOpen(false);
      addForm.resetFields();
      message.success('已添加差异化定价');
    } catch {
      // 校验失败
    }
  };

  const handleCopyTemplate = () => {
    if (!sourceBranchId || targetBranchIds.length === 0) {
      message.error('请选择源院区和目标院区');
      return;
    }
    const sourceOverrides = getBranchOverrides(sourceBranchId);
    const newLocalOverrides = { ...localOverrides };
    const newHasChanges = { ...hasChanges };
    targetBranchIds.forEach((tid) => {
      initializeBranchOverrides(tid);
      const existing = newLocalOverrides[tid] || [];
      const merged = [...existing];
      sourceOverrides.forEach((so) => {
        const idx = merged.findIndex(
          (o) => o.projectId === so.projectId && o.versionId === so.versionId
        );
        if (idx >= 0) {
          merged[idx] = { ...so };
        } else {
          merged.push({ ...so });
        }
      });
      newLocalOverrides[tid] = merged;
      newHasChanges[tid] = true;
    });
    setLocalOverrides(newLocalOverrides);
    setHasChanges(newHasChanges);
    setCopyModalOpen(false);
    setSourceBranchId('');
    setTargetBranchIds([]);
    message.success(`已从 ${branches.find((b) => b.id === sourceBranchId)?.name} 复制到 ${targetBranchIds.length} 个院区`);
  };

  const versionTagColors: Record<VersionType, string> = {
    base: 'blue',
    holiday: 'orange',
    anniversary: 'magenta',
    loyalty: 'purple',
  };

  const columns: ColumnsType<OverrideRow> = [
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 220,
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <Tag color="default" className="!text-xs">
            {CATEGORY_LABELS[record.category]}
          </Tag>
          <span className="font-medium text-brand-navy-700">{text}</span>
        </div>
      ),
    },
    {
      title: '价格版本',
      key: 'version',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Tag color={versionTagColors[record.versionType]} className="!text-xs">
            {VERSION_TYPE_LABELS[record.versionType]}
          </Tag>
          <span className="text-sm text-gray-600 truncate max-w-[100px]">
            {record.versionName}
          </span>
        </div>
      ),
    },
    {
      title: '标准价',
      dataIndex: 'standardPrice',
      key: 'standardPrice',
      width: 130,
      align: 'right',
      render: (val: number) => (
        <span className="text-gray-500 font-medium">¥{val.toLocaleString()}</span>
      ),
    },
    {
      title: '院区自定义价',
      dataIndex: 'customPrice',
      key: 'customPrice',
      width: 170,
      render: (val: number, record) => {
        const below = val < record.floorPrice;
        return (
          <div className="relative">
            {below && (
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none animate-pulse-border border-2 border-semantic-danger"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <InputNumber
              value={val}
              onChange={(v) => updateOverrideRow(record.key, 'customPrice', v as number)}
              className={`!w-full relative z-10 ${below ? '!border-semantic-danger' : ''}`}
              size="small"
              min={0}
              step={100}
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value?.replace(/¥\s?|(,*)/g, '') || 0) as unknown as undefined}
            />
            {below && (
              <Tooltip
                title={
                  <div className="text-xs">
                    <div className="font-semibold mb-1 text-semantic-danger">⚠️ 低于底价</div>
                    <div>底价：¥{record.floorPrice.toLocaleString()}</div>
                    <div>差价：¥{(record.floorPrice - val).toLocaleString()}</div>
                  </div>
                }
              >
                <AlertTriangle className="w-4 h-4 text-semantic-danger absolute -right-1 -top-1 z-20 bg-white rounded-full" />
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: '差价率',
      key: 'diffRate',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (!record.standardPrice) return <span className="text-gray-400">-</span>;
        const rate = ((record.customPrice - record.standardPrice) / record.standardPrice) * 100;
        const isDown = rate < 0;
        const isUp = rate > 0;
        return (
          <Tag
            color={isDown ? 'red' : isUp ? 'green' : 'default'}
            className="font-semibold !text-xs"
          >
            {isUp ? '↑' : isDown ? '↓' : '='} {Math.abs(rate).toFixed(1)}%
          </Tag>
        );
      },
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 150,
      render: (val: string, record) => (
        <DatePicker
          value={dayjs(val)}
          onChange={(d) =>
            updateOverrideRow(record.key, 'effectiveDate', d ? dayjs(d).format('YYYY-MM-DD') : '')
          }
          size="small"
          className="!w-full"
        />
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      width: 180,
      render: (val: string, record) => (
        <Input
          value={val}
          onChange={(e) => updateOverrideRow(record.key, 'note', e.target.value)}
          size="small"
          placeholder="可选备注"
          className="!w-full"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={() => deleteOverrideRow(record.key)}
        />
      ),
    },
  ];

  const effectiveVersions = priceVersions.filter(
    (v) => v.status === 'effective' || v.status === 'approved'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-gold-50/30">
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-navy-700 font-display">
                院区差异化定价
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                为各院区配置独立于基准价的差异化价格，支持批量复制模板
              </p>
            </div>
            <Space size="middle">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  icon={<Copy className="w-4 h-4" />}
                  onClick={() => setCopyModalOpen(true)}
                  className="border-brand-gold-400 text-brand-navy-600 hover:border-brand-gold-500 bg-brand-gold-50/50"
                >
                  批量复制模板
                </Button>
              </motion.div>
              {selectedBranch && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="primary"
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSave}
                    disabled={!hasChanges[selectedBranchId]}
                    className="bg-brand-navy-500 hover:bg-brand-navy-600 shadow-navy-md"
                  >
                    保存修改
                  </Button>
                </motion.div>
              )}
            </Space>
          </div>
        </motion.div>

        <div className="grid grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="col-span-12 lg:col-span-4 xl:col-span-3"
          >
            <Card
              className="shadow-card border-gray-100 rounded-2xl overflow-hidden"
              styles={{ body: { padding: 0 } }}
              title={
                <div className="flex items-center gap-2 px-2">
                  <MapPin className="w-5 h-5 text-brand-navy-500" />
                  <span className="font-semibold text-brand-navy-700">院区列表</span>
                  <span className="text-xs text-gray-400 ml-1">
                    共 {branches.length} 家
                  </span>
                </div>
              }
            >
              <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
                {cities.map((city) => (
                  <div key={city} className="border-b border-gray-50 last:border-b-0">
                    <button
                      onClick={() => toggleCity(city)}
                      className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                      {expandedCities.has(city) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="font-medium text-brand-navy-700">{city}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {branchesByCity[city].length} 家院区
                      </span>
                    </button>
                    <AnimatePresence>
                      {expandedCities.has(city) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-2">
                            {branchesByCity[city].map((branch) => (
                              <motion.div
                                key={branch.id}
                                whileHover={{ x: 4 }}
                                onClick={() => selectBranch(branch.id)}
                                className={`mx-2 mb-1 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                                  selectedBranchId === branch.id
                                    ? 'bg-gradient-to-r from-brand-navy-500 to-brand-navy-600 text-white shadow-navy-md'
                                    : 'hover:bg-brand-gold-50/50 border border-transparent hover:border-brand-gold-200'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <Avatar
                                    className={`w-10 h-10 flex-shrink-0 ${
                                      selectedBranchId === branch.id
                                        ? 'bg-white/20'
                                        : 'bg-brand-gold-100'
                                    }`}
                                    icon={
                                      <Building2
                                        className={`w-5 h-5 ${
                                          selectedBranchId === branch.id
                                            ? 'text-white'
                                            : 'text-brand-navy-600'
                                        }`}
                                      />
                                    }
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">
                                      {branch.name}
                                    </div>
                                    <div
                                      className={`text-xs mt-1 flex items-center gap-2 ${
                                        selectedBranchId === branch.id
                                          ? 'text-white/80'
                                          : 'text-gray-500'
                                      }`}
                                    >
                                      <span>{CITY_TIER_LABELS[branch.cityTier]}</span>
                                      <span>·</span>
                                      <span>{STORE_LEVEL_LABELS[branch.level]}</span>
                                    </div>
                                    <div
                                      className={`text-xs mt-0.5 flex items-center gap-1 ${
                                        selectedBranchId === branch.id
                                          ? 'text-white/70'
                                          : 'text-gray-400'
                                      }`}
                                    >
                                      <Badge
                                        count={
                                          (localOverrides[branch.id] || branch.priceOverrides)
                                            .length
                                        }
                                        size="small"
                                        color={
                                          selectedBranchId === branch.id
                                            ? '#fff'
                                            : '#1B2A4A'
                                        }
                                        offset={[-2, 2]}
                                      >
                                        <span className="text-[11px] flex items-center gap-1">
                                          <Layers className="w-3 h-3" />
                                          差异化定价
                                        </span>
                                      </Badge>
                                    </div>
                                  </div>
                                  {selectedBranchId === branch.id && (
                                    <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="col-span-12 lg:col-span-8 xl:col-span-9"
          >
            {selectedBranch ? (
              <div className="space-y-4">
                <Card className="shadow-card border-gray-100 rounded-2xl overflow-hidden">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-navy-500 to-brand-navy-700 flex items-center justify-center shadow-navy-md flex-shrink-0">
                        <Building2 className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-brand-navy-700 font-display">
                          {selectedBranch.name}
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {selectedBranch.address}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            {selectedBranch.phone}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Tag color="blue" className="!text-xs">
                            {CITY_TIER_LABELS[selectedBranch.cityTier]}
                          </Tag>
                          <Tag color="gold" className="!text-xs">
                            {STORE_LEVEL_LABELS[selectedBranch.level]}
                          </Tag>
                          <Tag color="default" className="!text-xs">
                            {overrideRows.length} 项差异化定价
                          </Tag>
                          {hasChanges[selectedBranchId] && (
                            <Badge status="processing" text="有未保存修改" />
                          )}
                        </div>
                      </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="primary"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => setAddModalOpen(true)}
                        className="bg-brand-gold-500 hover:bg-brand-gold-600 !border-0 shadow-gold-md"
                      >
                        添加差异化定价
                      </Button>
                    </motion.div>
                  </div>
                </Card>

                {belowFloorCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-semantic-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-semantic-danger">
                        有 {belowFloorCount} 项定价低于底价，请谨慎确认
                      </div>
                      <div className="text-sm text-semantic-danger/80 mt-0.5">
                        低于底价可能影响项目毛利空间，建议提交财务审核后再执行
                      </div>
                    </div>
                  </motion.div>
                )}

                <Card className="shadow-card border-gray-100 rounded-2xl overflow-hidden">
                  {overrideRows.length > 0 ? (
                    <Table
                      rowKey="key"
                      columns={columns}
                      dataSource={overrideRows}
                      pagination={false}
                      scroll={{ x: 1200 }}
                      rowClassName={() => 'hover:bg-brand-gold-50/30 transition-colors'}
                    />
                  ) : (
                    <div className="p-12">
                      <Empty
                        description={
                          <div className="text-center">
                            <div className="font-medium text-gray-600 mb-1">
                              暂无差异化定价
                            </div>
                            <div className="text-sm text-gray-400">
                              点击「添加差异化定价」为该院区配置独立价格
                            </div>
                          </div>
                        }
                      />
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="shadow-card border-gray-100 rounded-2xl">
                <div className="p-12">
                  <Empty description="请从左侧选择院区" />
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-gold-500" />
            <span className="font-semibold">添加差异化定价</span>
          </div>
        }
        open={addModalOpen}
        onOk={handleAddOverride}
        onCancel={() => {
          setAddModalOpen(false);
          addForm.resetFields();
        }}
        okText="添加"
        cancelText="取消"
        width={520}
        okButtonProps={{ className: 'bg-brand-gold-500 hover:bg-brand-gold-600 !border-0' }}
      >
        <Form form={addForm} layout="vertical" className="mt-2">
          <Form.Item
            label="选择价格版本"
            name="versionId"
            rules={[{ required: true, message: '请选择价格版本' }]}
          >
            <Select
              placeholder="请选择生效中的价格版本"
              options={effectiveVersions.map((v: PriceVersion) => ({
                label: (
                  <div className="flex items-center gap-2">
                    <Tag color={versionTagColors[v.type]} className="!text-xs">
                      {VERSION_TYPE_LABELS[v.type]}
                    </Tag>
                    <span>{v.name}</span>
                  </div>
                ),
                value: v.id,
              }))}
              size="large"
            />
          </Form.Item>
          <Form.Item
            label="选择项目"
            name="projectId"
            rules={[{ required: true, message: '请选择项目' }]}
            dependencies={['versionId']}
          >
            {({ getFieldValue }) => {
              const vid = getFieldValue('versionId');
              const version = priceVersions.find((v) => v.id === vid);
              const availableProjects = version
                ? projects.filter((p) => version.pricing[p.id])
                : projects;
              return (
                <Select
                  placeholder="请选择项目"
                  options={availableProjects.map((p: Project) => ({
                    label: (
                      <div className="flex items-center justify-between">
                        <span>{p.name}</span>
                        <div className="flex items-center gap-2">
                          <Tag color="default" className="!text-xs">
                            {CATEGORY_LABELS[p.category]}
                          </Tag>
                          <span className="text-xs text-gray-400">
                            底价 ¥{p.floorPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ),
                    value: p.id,
                  }))}
                  size="large"
                  showSearch
                  optionFilterProp="label"
                  listHeight={320}
                  disabled={!vid}
                />
              );
            }}
          </Form.Item>
          <Form.Item
            label="院区自定义价"
            name="customPrice"
            dependencies={['projectId', 'versionId']}
          >
            {({ getFieldValue }) => {
              const pid = getFieldValue('projectId');
              const vid = getFieldValue('versionId');
              const project = projects.find((p) => p.id === pid);
              let standard = 0;
              if (pid && vid && selectedBranch) {
                standard = getProjectPriceForBranch(pid, selectedBranch.id, vid);
              }
              return (
                <div>
                  <InputNumber
                    placeholder="请输入自定义价格"
                    className="!w-full"
                    size="large"
                    min={0}
                    step={100}
                    formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => Number(value?.replace(/¥\s?|(,*)/g, '') || 0) as unknown as undefined}
                  />
                  {standard > 0 && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-gold-500" />
                      <span>
                        标准价：¥{standard.toLocaleString()}
                        {project && (
                          <span className="mx-2 text-gray-300">|</span>
                        )}
                        {project && (
                          <span className="text-semantic-danger">
                            底价：¥{project.floorPrice.toLocaleString()}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            }}
          </Form.Item>
          <Form.Item label="生效日期" name="effectiveDate">
            <DatePicker
              className="!w-full"
              size="large"
              placeholder="默认今天"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={2} placeholder="可选：说明定价原因、特殊规则等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-brand-navy-500" />
            <span className="font-semibold">批量复制模板</span>
          </div>
        }
        open={copyModalOpen}
        onOk={handleCopyTemplate}
        onCancel={() => {
          setCopyModalOpen(false);
          setSourceBranchId('');
          setTargetBranchIds([]);
        }}
        okText="复制"
        cancelText="取消"
        width={560}
        okButtonProps={{ className: 'bg-brand-navy-500 hover:bg-brand-navy-600' }}
      >
        <div className="space-y-5 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择源院区（复制来源）
            </label>
            <Select
              value={sourceBranchId || undefined}
              onChange={(v) => setSourceBranchId(v)}
              placeholder="请选择作为模板的院区"
              size="large"
              className="!w-full"
              options={branches.map((b) => ({
                label: (
                  <div className="flex items-center justify-between">
                    <span>{b.name}</span>
                    <Tag color="default" className="!text-xs">
                      {localOverrides[b.id]?.length || b.priceOverrides.length} 项定价
                    </Tag>
                  </div>
                ),
                value: b.id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择目标院区（粘贴目标）
            </label>
            <Select
              mode="multiple"
              value={targetBranchIds}
              onChange={setTargetBranchIds}
              placeholder="请选择一个或多个目标院区"
              size="large"
              className="!w-full"
              options={branches
                .filter((b) => b.id !== sourceBranchId)
                .map((b) => ({
                  label: `${b.city} - ${b.name}`,
                  value: b.id,
                }))}
              showSearch
              optionFilterProp="label"
              maxTagCount={3}
              maxTagPlaceholder={(omitted) => `+${omitted.length} 家院区`}
              disabled={!sourceBranchId}
            />
          </div>
          {sourceBranchId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-brand-gold-50/60 rounded-xl border border-brand-gold-200"
            >
              <div className="text-sm text-gray-600">
                将把
                <span className="font-semibold text-brand-navy-700 mx-1">
                  {branches.find((b) => b.id === sourceBranchId)?.name}
                </span>
                的
                <span className="font-semibold text-brand-navy-700 mx-1">
                  {(localOverrides[sourceBranchId]?.length ||
                    branches.find((b) => b.id === sourceBranchId)?.priceOverrides.length) || 0}
                </span>
                项差异化定价
                {targetBranchIds.length > 0 && (
                  <>
                    复制到
                    <span className="font-semibold text-brand-navy-700 mx-1">
                      {targetBranchIds.length}
                    </span>
                    家院区
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                若目标院区存在相同项目的定价，将被覆盖
              </div>
            </motion.div>
          )}
        </div>
      </Modal>
    </div>
  );
}
