import { useState, useMemo, useEffect, Fragment } from 'react';
import {
  Breadcrumb,
  Tag,
  Select,
  Button,
  Tooltip,
  InputNumber,
  Modal,
  Form,
  message,
  Space,
  Empty,
} from 'antd';
import {
  ArrowLeft,
  AlertTriangle,
  Save,
  Send,
  Home,
  Layers,
  CalendarDays,
  User,
  Building2,
  Stethoscope,
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  VERSION_TYPE_LABELS,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_COLORS,
  CITY_TIER_LABELS,
  STORE_LEVEL_LABELS,
  DOCTOR_LEVEL_LABELS,
  CATEGORY_LABELS,
  type VersionType,
  type VersionStatus,
  type PricingEntry,
  type CityTier,
  type StoreLevel,
  type DoctorLevel,
  type Project,
} from '@/types';

const typeTagColors: Record<VersionType, string> = {
  base: 'blue',
  holiday: 'orange',
  anniversary: 'magenta',
  loyalty: 'purple',
};

const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
const storeLevels: StoreLevel[] = ['flagship', 'standard', 'community'];
const doctorLevels: DoctorLevel[] = ['director', 'senior', 'attending', 'junior'];

function buildDefaultPricing(basePrice: number, floorPrice: number): PricingEntry[] {
  const entries: PricingEntry[] = [];
  const ctMult: Record<CityTier, number> = { tier1: 1.15, tier2: 1.0, tier3: 0.88 };
  const slMult: Record<StoreLevel, number> = { flagship: 1.1, standard: 1.0, community: 0.92 };
  const dlMult: Record<DoctorLevel, number> = { director: 1.25, senior: 1.1, attending: 1.0, junior: 0.9 };

  for (const ct of cityTiers) {
    for (const sl of storeLevels) {
      for (const dl of doctorLevels) {
        const raw = basePrice * ctMult[ct] * slMult[sl] * dlMult[dl];
        const price = Math.max(Math.round(raw / 100) * 100, floorPrice);
        entries.push({ cityTier: ct, storeLevel: sl, doctorLevel: dl, price });
      }
    }
  }
  return entries;
}

export default function VersionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    priceVersions,
    projects,
    updatePricing,
    updatePriceVersion,
    submitApproval,
    currentUser,
  } = useAppStore();

  const version = priceVersions.find((v) => v.id === id);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [localPricing, setLocalPricing] = useState<Record<string, PricingEntry[]>>({});
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [submitForm] = Form.useForm();
  const [addProjectForm] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (version) {
      setLocalPricing({ ...version.pricing });
      const firstKey = Object.keys(version.pricing)[0];
      if (firstKey) setSelectedProjectId(firstKey);
    }
  }, [version?.id]);

  const isEditable = version?.status === 'draft';

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({
      label: (
        <div className="flex items-center justify-between">
          <span>{p.name}</span>
          <Tag color="default" className="ml-2 !text-xs">
            {CATEGORY_LABELS[p.category]}
          </Tag>
        </div>
      ),
      value: p.id,
      disabled: version ? Object.keys(version.pricing).includes(p.id) : false,
    }));
  }, [projects, version]);

  const filteredProjects = useMemo(() => {
    return projects.filter(
      (p) => !version || Object.keys(version.pricing).includes(p.id)
    );
  }, [projects, version]);

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const currentPricing = localPricing[selectedProjectId] || [];

  const getPrice = (cityTier: string, storeLevel: string, doctorLevel: string): number => {
    const entry = currentPricing.find(
      (e) => e.cityTier === cityTier && e.storeLevel === storeLevel && e.doctorLevel === doctorLevel
    );
    return entry?.price ?? 0;
  };

  const isBelowFloor = (price: number): boolean => {
    if (!currentProject) return false;
    return price < currentProject.floorPrice;
  };

  const updatePrice = (cityTier: string, storeLevel: string, doctorLevel: string, value: number | null) => {
    if (!selectedProjectId || !value) return;
    const newPricing = [...currentPricing];
    const idx = newPricing.findIndex(
      (e) => e.cityTier === cityTier && e.storeLevel === storeLevel && e.doctorLevel === doctorLevel
    );
    if (idx >= 0) {
      newPricing[idx] = { ...newPricing[idx], price: value };
    } else {
      newPricing.push({ cityTier, storeLevel, doctorLevel, price: value });
    }
    setLocalPricing({ ...localPricing, [selectedProjectId]: newPricing });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!version) return;
    Object.keys(localPricing).forEach((pid) => {
      updatePricing(version.id, pid, localPricing[pid]);
    });
    setHasChanges(false);
    message.success('定价已保存');
  };

  const handleSubmitApproval = async () => {
    if (!version) return;
    try {
      const values = await submitForm.validateFields();
      handleSave();
      const items = Object.keys(localPricing).map((pid) => {
        const project = projects.find((p) => p.id === pid);
        const pricing = localPricing[pid];
        const baseEntry = pricing?.find(
          (e) => e.cityTier === 'tier2' && e.storeLevel === 'standard' && e.doctorLevel === 'attending'
        );
        return {
          id: `${version.id}-${pid}-${Date.now()}`,
          projectId: pid,
          projectName: project?.name || '',
          category: project?.category || 'hyaluronic',
          oldPrice: project?.basePrice || 0,
          newPrice: baseEntry?.price || project?.basePrice || 0,
          floorPrice: project?.floorPrice || 0,
          affectedBranches: useAppStore.getState().branches.map((b) => b.id),
          note: '',
        };
      });
      submitApproval({
        title: `${version.name} 价格审批`,
        submitter: currentUser?.name || '系统',
        reason: values.reason,
        effectiveDate: version.effectiveDate,
        items,
      });
      updatePriceVersion(version.id, { status: 'pending' });
      message.success('已提交审批');
      setSubmitModalOpen(false);
      submitForm.resetFields();
    } catch {
      // 表单校验失败
    }
  };

  const handleAddProject = async () => {
    try {
      const values = await addProjectForm.validateFields();
      const project = projects.find((p) => p.id === values.projectId);
      if (!project) return;
      const newPricing = buildDefaultPricing(project.basePrice, project.floorPrice);
      setLocalPricing({ ...localPricing, [values.projectId]: newPricing });
      setSelectedProjectId(values.projectId);
      setHasChanges(true);
      setAddProjectModalOpen(false);
      addProjectForm.resetFields();
      message.success('项目已添加');
    } catch {
      // 表单校验失败
    }
  };

  const handleCopyCell = (fromCT: string, fromSL: string, fromDL: string) => {
    const sourcePrice = getPrice(fromCT, fromSL, fromDL);
    if (!sourcePrice) return;
    const newPricing = [...currentPricing];
    for (const ct of cityTiers) {
      for (const sl of storeLevels) {
        for (const dl of doctorLevels) {
          const idx = newPricing.findIndex(
            (e) => e.cityTier === ct && e.storeLevel === sl && e.doctorLevel === dl
          );
          if (idx >= 0) {
            newPricing[idx] = { ...newPricing[idx], price: sourcePrice };
          }
        }
      }
    }
    setLocalPricing({ ...localPricing, [selectedProjectId]: newPricing });
    setHasChanges(true);
    message.success('已复制到所有单元格');
  };

  const belowFloorCount = useMemo(() => {
    if (!currentProject) return 0;
    return currentPricing.filter((p) => p.price < currentProject.floorPrice).length;
  }, [currentPricing, currentProject]);

  if (!version) {
    return (
      <div className="p-12 flex items-center justify-center min-h-screen">
        <Empty description="版本不存在或已被删除" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-gold-50/30">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="px-6 pt-4">
          <Breadcrumb
            items={[
              {
                title: (
                  <span
                    className="cursor-pointer flex items-center gap-1 hover:text-brand-navy-500 transition-colors"
                    onClick={() => navigate('/price-versions')}
                  >
                    <Home className="w-3.5 h-3.5" />
                    价格版本管理
                  </span>
                ),
              },
              { title: <span className="font-medium text-brand-navy-700">{version.name}</span> },
            ]}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 py-5"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <Button
                type="text"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/price-versions')}
                className="mr-2"
              />
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-navy-500 to-brand-navy-700 flex items-center justify-center shadow-navy-md">
                <Layers className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-brand-navy-700 font-display">
                    {version.name}
                  </h1>
                  <Tag color={typeTagColors[version.type]} className="font-medium text-sm px-3 py-0.5">
                    {VERSION_TYPE_LABELS[version.type]}
                  </Tag>
                  <Tag
                    color={VERSION_STATUS_COLORS[version.status as VersionStatus]}
                    className="font-medium text-sm px-3 py-0.5"
                  >
                    {VERSION_STATUS_LABELS[version.status]}
                  </Tag>
                </div>
                <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    <span>生效：{version.effectiveDate}</span>
                    <span className="text-gray-300">~</span>
                    <span>到期：{version.expireDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>创建人：{version.createdBy}</span>
                  </div>
                </div>
                {version.description && (
                  <p className="mt-2 text-sm text-gray-500 bg-gray-50 inline-block px-3 py-1.5 rounded-lg">
                    {version.description}
                  </p>
                )}
              </div>
            </div>

            <Space size="middle">
              {isEditable && (
                <>
                  <Button
                    icon={<Copy className="w-4 h-4" />}
                    onClick={() => setAddProjectModalOpen(true)}
                    className="border-brand-navy-200 text-brand-navy-600 hover:border-brand-navy-400 hover:text-brand-navy-700"
                  >
                    添加项目
                  </Button>
                  <Button
                    type="primary"
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="bg-brand-navy-500 hover:bg-brand-navy-600 shadow-navy-md"
                  >
                    保存
                  </Button>
                  {Object.keys(localPricing).length > 0 && (
                    <Button
                      type="primary"
                      danger
                      icon={<Send className="w-4 h-4" />}
                      onClick={() => setSubmitModalOpen(true)}
                      className="bg-semantic-warning hover:bg-semantic-warning/90 !border-0"
                    >
                      提交审批
                    </Button>
                  )}
                </>
              )}
            </Space>
          </div>
        </motion.div>
      </div>

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">选择项目：</span>
              <Select
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                options={
                  filteredProjects.length > 0
                    ? filteredProjects.map((p: Project) => ({
                        label: (
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            <Tag color="default" className="!text-xs">
                              {CATEGORY_LABELS[p.category]}
                            </Tag>
                          </div>
                        ),
                        value: p.id,
                      }))
                    : []
                }
                style={{ width: 320 }}
                placeholder="请选择项目"
                allowClear={false}
                size="large"
                disabled={filteredProjects.length === 0}
              />
              {filteredProjects.length === 0 && isEditable && (
                <Button
                  type="link"
                  icon={<Copy className="w-4 h-4" />}
                  onClick={() => setAddProjectModalOpen(true)}
                  size="small"
                >
                  先添加项目
                </Button>
              )}
            </div>
            {currentProject && belowFloorCount > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl"
              >
                <AlertTriangle className="w-4 h-4 text-semantic-danger" />
                <span className="text-sm text-semantic-danger font-medium">
                  有 {belowFloorCount} 个定价低于底价 ¥{currentProject.floorPrice.toLocaleString()}
                </span>
              </motion.div>
            )}
          </div>

          {currentProject ? (
            <div className="p-6 overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedProjectId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mb-4 flex items-center gap-4 p-4 bg-gradient-to-r from-brand-gold-50/60 to-transparent rounded-xl border border-brand-gold-100">
                    <img
                      src={currentProject.imageUrl}
                      alt={currentProject.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-brand-navy-700">
                          {currentProject.name}
                        </h3>
                        <Tag color="blue" className="!text-xs">
                          {CATEGORY_LABELS[currentProject.category]}
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {currentProject.materialBrand} · {currentProject.sessions}次疗程
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-600">
                          基准价：<span className="font-semibold text-brand-navy-600">¥{currentProject.basePrice.toLocaleString()}</span>
                        </span>
                        <span className="text-gray-600">
                          底价：<span className="font-semibold text-semantic-danger">¥{currentProject.floorPrice.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-brand-navy-500 to-brand-navy-600 text-white">
                          <th
                            className="py-4 px-4 text-left font-semibold text-sm border-r border-white/10 min-w-[140px]"
                            rowSpan={2}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>城市层级</span>
                            </div>
                            <div className="text-xs text-white/70 mt-0.5 font-normal">/ 门店等级</div>
                          </th>
                          {doctorLevels.map((dl) => (
                            <th
                              key={dl}
                              colSpan={storeLevels.length}
                              className="py-3 px-3 text-center font-semibold text-sm border-r border-white/10 last:border-r-0"
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <Stethoscope className="w-4 h-4" />
                                <span>{DOCTOR_LEVEL_LABELS[dl]}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-brand-navy-50 text-brand-navy-700">
                          {doctorLevels.flatMap((dl) =>
                            storeLevels.map((sl) => (
                              <th
                                key={`${dl}-${sl}`}
                                className="py-2.5 px-2 text-center font-medium text-xs border-r border-gray-200 last:border-r-0 bg-white/50"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <Building2 className="w-3 h-3 text-gray-400" />
                                  {STORE_LEVEL_LABELS[sl]}
                                </div>
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {cityTiers.map((ct, ctIdx) => (
                          <Fragment key={ct}>
                            <tr className={ctIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="py-4 px-4 border-r border-b border-gray-200">
                                <div className="font-semibold text-brand-navy-700">
                                  {CITY_TIER_LABELS[ct]}
                                </div>
                              </td>
                              {doctorLevels.map((dl) =>
                                storeLevels.map((sl) => {
                                  const price = getPrice(ct, sl, dl);
                                  const below = isBelowFloor(price);
                                  const isFirstCell = ctIdx === 0 && dl === 'director' && sl === 'flagship';
                                  return (
                                    <td
                                      key={`${ct}-${dl}-${sl}`}
                                      className={`py-3 px-2 border-r border-b border-gray-200 last:border-r-0 ${
                                        below ? 'bg-red-50/40' : ''
                                      }`}
                                    >
                                      <div className="relative group">
                                        {below && (
                                          <motion.div
                                            className="absolute inset-0 rounded-lg pointer-events-none animate-pulse-border border-2 border-semantic-danger"
                                            initial={{ opacity: 0.8 }}
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                          />
                                        )}
                                        <div className="relative flex items-center justify-center">
                                          {isEditable ? (
                                            <InputNumber
                                              value={price}
                                              onChange={(v) => updatePrice(ct, sl, dl, v as number)}
                                              className={`!w-full ${below ? '!border-semantic-danger' : ''}`}
                                              size="small"
                                              min={0}
                                              step={100}
                                              formatter={(value) =>
                                                `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                              }
                                              parser={(value) =>
                                                Number(value?.replace(/¥\s?|(,*)/g, '') || 0) as unknown as undefined
                                              }
                                            />
                                          ) : (
                                            <span
                                              className={`font-semibold ${
                                                below ? 'text-semantic-danger' : 'text-brand-navy-700'
                                              }`}
                                            >
                                              ¥{price.toLocaleString()}
                                            </span>
                                          )}
                                          {below && (
                                            <Tooltip
                                              title={
                                                <div className="text-xs">
                                                  <div className="font-semibold mb-1 text-semantic-danger">
                                                    ⚠️ 低于底价
                                                  </div>
                                                  <div>底价：¥{currentProject.floorPrice.toLocaleString()}</div>
                                                  <div>差价：¥{(currentProject.floorPrice - price).toLocaleString()}</div>
                                                </div>
                                              }
                                            >
                                              <AlertTriangle className="w-4 h-4 text-semantic-danger absolute -right-1 -top-1 bg-white rounded-full" />
                                            </Tooltip>
                                          )}
                                        </div>
                                        {isEditable && isFirstCell && (
                                          <Tooltip title="将此价格复制到所有单元格">
                                            <Button
                                              type="text"
                                              size="small"
                                              icon={<Copy className="w-3 h-3" />}
                                              className="!h-5 !px-1 mt-1 text-gray-400 hover:text-brand-navy-500"
                                              onClick={() => handleCopyCell(ct, sl, dl)}
                                            />
                                          </Tooltip>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })
                              )}
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-16">
              <Empty description="请选择或添加项目后配置定价" />
            </div>
          )}
        </motion.div>
      </div>

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
          submitForm.resetFields();
        }}
        okText="提交"
        cancelText="取消"
        width={540}
        okButtonProps={{ className: 'bg-semantic-warning hover:bg-semantic-warning/90' }}
      >
        <div className="mb-4 space-y-2">
          <div className="p-3 bg-brand-gold-50/50 rounded-lg text-sm border border-brand-gold-100">
            <span className="font-medium text-brand-navy-700">{version.name}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-gray-600">
              共 {Object.keys(localPricing).length} 个项目
            </span>
          </div>
          {belowFloorCount > 0 && (
            <div className="p-3 bg-red-50 rounded-lg text-sm border border-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-semantic-danger flex-shrink-0 mt-0.5" />
              <span className="text-semantic-danger">
                检测到 {belowFloorCount} 个定价低于底价，请财务重点审核毛利空间
              </span>
            </div>
          )}
        </div>
        <Form form={submitForm} layout="vertical">
          <Form.Item
            label="审批说明"
            name="reason"
            rules={[{ required: true, message: '请填写审批说明' }]}
          >
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-navy-500 focus:ring-1 focus:ring-brand-navy-500 transition-all resize-none min-h-[100px]"
              placeholder="请详细说明价格调整的原因、背景、预期效果、毛利测算等"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-brand-navy-500" />
            <span className="font-semibold">添加定价项目</span>
          </div>
        }
        open={addProjectModalOpen}
        onOk={handleAddProject}
        onCancel={() => {
          setAddProjectModalOpen(false);
          addProjectForm.resetFields();
        }}
        okText="添加"
        cancelText="取消"
        width={500}
        okButtonProps={{ className: 'bg-brand-navy-500 hover:bg-brand-navy-600' }}
      >
        <Form form={addProjectForm} layout="vertical" className="mt-2">
          <Form.Item
            label="选择项目"
            name="projectId"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select
              options={projectOptions}
              placeholder="请选择要添加定价的项目"
              size="large"
              showSearch
              optionFilterProp="label"
              listHeight={320}
            />
          </Form.Item>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="mb-1">💡 添加后将根据项目基准价和底价自动生成三维定价矩阵：</p>
            <p>城市层级 × 门店等级 × 医生职级 = 3 × 3 × 4 = 36 个定价维度</p>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
