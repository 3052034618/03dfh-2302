import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  AlertCircle,
  Sparkles,
  DollarSign,
  Package,
  Hash,
  UserX,
  MapPin,
  Tag as TagIcon,
  FileText,
  ToggleLeft,
  ToggleRight,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Radio,
  Checkbox,
  Button,
  message,
  Avatar,
  Tooltip,
  Divider,
} from 'antd';
import {
  CATEGORY_LABELS,
  MATERIAL_BRANDS,
  APPLICABLE_PARTS,
  CONTRAINDICATIONS,
  type Project,
  type ProjectCategory,
} from '@/types';

const { TextArea } = Input;
const { Option } = Select;

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  editData?: Project | null;
}

interface FormValues {
  name: string;
  category: ProjectCategory;
  materialBrand: string;
  applicableParts: string[];
  sessions: number;
  contraindications: string[];
  basePrice: number;
  floorPrice: number;
  description?: string;
  status: 'active' | 'inactive';
  imageUrl: string;
}

export default function ProjectForm({ open, onClose, editData }: ProjectFormProps) {
  const [form] = Form.useForm<FormValues>();
  const addProject = useAppStore((s) => s.addProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const projects = useAppStore((s) => s.projects);

  const [submitting, setSubmitting] = useState(false);

  const basePrice = Form.useWatch('basePrice', form);
  const floorPrice = Form.useWatch('floorPrice', form);

  const isEditing = !!editData;

  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
          name: editData.name,
          category: editData.category,
          materialBrand: editData.materialBrand,
          applicableParts: editData.applicableParts,
          sessions: editData.sessions,
          contraindications: editData.contraindications,
          basePrice: editData.basePrice,
          floorPrice: editData.floorPrice,
          description: editData.description,
          status: editData.status,
          imageUrl: editData.imageUrl,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          category: 'hyaluronic',
          materialBrand: '乔雅登',
          sessions: 1,
          status: 'active',
          basePrice: 5000,
          floorPrice: 3500,
          imageUrl:
            'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=200&h=200&fit=crop',
          applicableParts: [],
          contraindications: [],
        });
      }
    }
  }, [open, editData, form]);

  const validateFloorPrice = (_: any, value: number) => {
    const bp = basePrice ?? form.getFieldValue('basePrice');
    if (value && bp && value > bp) {
      return Promise.reject(new Error('底价不能高于基础价'));
    }
    return Promise.resolve();
  };

  const validateUniqueName = (_: any, value: string) => {
    if (!value) return Promise.resolve();
    const trimmed = value.trim();
    const exists = projects.some(
      (p) => p.name === trimmed && (!editData || p.id !== editData.id)
    );
    if (exists) {
      return Promise.reject(new Error('项目名称已存在'));
    }
    return Promise.resolve();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name.trim(),
        category: values.category,
        materialBrand: values.materialBrand,
        applicableParts: values.applicableParts,
        sessions: values.sessions,
        contraindications: values.contraindications,
        basePrice: values.basePrice,
        floorPrice: values.floorPrice,
        description: values.description?.trim() || undefined,
        status: values.status,
        imageUrl: values.imageUrl,
      };

      await new Promise((r) => setTimeout(r, 400));

      if (editData) {
        updateProject(editData.id, payload);
        message.success(`项目「${payload.name}」已更新`);
      } else {
        addProject(payload);
        message.success(`项目「${payload.name}」创建成功`);
      }

      setSubmitting(false);
      onClose();
    } catch (err: any) {
      if (err?.errorFields) {
        message.warning('请检查表单填写');
      }
      setSubmitting(false);
    }
  };

  const priceWarning =
    basePrice && floorPrice && floorPrice / basePrice < 0.7;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
            <Package size={18} className="text-brand-gold-400" />
          </div>
          <div>
            <div className="text-white font-display font-semibold">
              {isEditing ? '编辑项目' : '新增项目'}
            </div>
            {isEditing && editData && (
              <div className="text-white/60 text-xs mt-0.5">
                ID：{editData.id}
              </div>
            )}
          </div>
        </div>
      }
      width={880}
      destroyOnClose
      maskClosable={false}
      footer={null}
      className="project-form-modal"
      closeIcon={<X size={18} />}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className="pt-5 px-2"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="md:col-span-5 space-y-4"
          >
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <Camera size={15} className="text-brand-gold-600" />
                <span className="font-medium text-slate-700 text-sm">项目展示图</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="group relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand-gold-400 transition-colors bg-white">
                  <Avatar
                    size={128}
                    shape="square"
                    src={form.getFieldValue('imageUrl')}
                    className="!w-full !h-full rounded-none"
                  />
                  <div className="absolute inset-0 bg-brand-navy-500/0 group-hover:bg-brand-navy-500/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Camera size={22} className="text-white" />
                  </div>
                </div>
                <Form.Item name="imageUrl" className="mb-0 w-full">
                  <Input
                    size="small"
                    placeholder="图片 URL"
                    prefix={<Sparkles size={13} className="text-slate-400" />}
                    className="!rounded-lg text-xs"
                  />
                </Form.Item>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <ToggleRight size={15} className="text-brand-gold-600" />
                <span className="font-medium text-slate-700 text-sm">项目状态</span>
              </div>
              <Form.Item name="status" className="mb-0">
                <Radio.Group className="!w-full" optionType="button" buttonStyle="solid">
                  <Radio.Button value="active" className="!flex-1 !text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <ToggleRight size={14} />
                      上架
                    </span>
                  </Radio.Button>
                  <Radio.Button value="inactive" className="!flex-1 !text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <ToggleLeft size={14} />
                      下架
                    </span>
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={15} className="text-emerald-600" />
                <span className="font-medium text-slate-700 text-sm">价格信息</span>
              </div>
              <div className="space-y-4">
                <Form.Item
                  name="basePrice"
                  label={
                    <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                      <Hash size={12} />
                      基础价 (元)
                    </span>
                  }
                  rules={[
                    { required: true, message: '请输入基础价' },
                    { type: 'number', min: 100, message: '基础价不能低于 100 元' },
                  ]}
                  className="mb-4"
                >
                  <InputNumber
                    min={0 as number}
                    step={100}
                    size="large"
                    className="!w-full"
                    formatter={(v) => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => Number(String(v).replace(/[^\d.]/g, '')) || 0}
                  />
                </Form.Item>

                <Form.Item
                  name="floorPrice"
                  label={
                    <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                      <AlertTriangle size={12} />
                      底价 (元)
                    </span>
                  }
                  rules={[
                    { required: true, message: '请输入底价' },
                    { type: 'number', min: 50, message: '底价不能低于 50 元' },
                    { validator: validateFloorPrice },
                  ]}
                  className="mb-2"
                >
                  <InputNumber
                    min={0 as number}
                    step={100}
                    size="large"
                    className="!w-full"
                    formatter={(v) => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => Number(String(v).replace(/[^\d.]/g, '')) || 0}
                  />
                </Form.Item>

                {basePrice && floorPrice && (
                  <AnimatePresence>
                    <motion.div
                      key={priceWarning ? 'warning' : 'ok'}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`rounded-xl p-3 flex items-start gap-2 text-sm ${
                        priceWarning
                          ? 'bg-amber-50 border border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                      <div>
                        底价/基础价比率：
                        <span className="mx-1 font-semibold">
                          {((floorPrice / basePrice) * 100).toFixed(1)}%
                        </span>
                        {priceWarning ? (
                          <>
                            ，低于建议下限 <span className="font-semibold">70%</span>，请确认毛利空间
                          </>
                        ) : (
                          <>，在合理区间内</>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="md:col-span-7 space-y-5"
          >
            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={15} className="text-brand-gold-600" />
                <span className="font-medium text-slate-700 text-sm">基本信息</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  name="name"
                  label={<span className="text-sm font-medium text-slate-600">项目名称</span>}
                  rules={[
                    { required: true, message: '请输入项目名称' },
                    { min: 2, max: 50, message: '名称长度 2-50 字符' },
                    { validator: validateUniqueName },
                  ]}
                  className="md:col-span-2 mb-4"
                >
                  <Input
                    size="large"
                    placeholder="如：乔雅登雅致 1ml"
                    prefix={<Sparkles size={15} className="text-brand-gold-500" />}
                    maxLength={50}
                    showCount
                  />
                </Form.Item>

                <Form.Item
                  name="category"
                  label={<span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                    <TagIcon size={12} />
                    项目分类
                  </span>}
                  rules={[{ required: true, message: '请选择分类' }]}
                  className="mb-4"
                >
                  <Select size="large">
                    {(Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map((cat) => (
                      <Option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="materialBrand"
                  label={<span className="text-sm font-medium text-slate-600">产品品牌</span>}
                  rules={[{ required: true, message: '请选择或输入品牌' }]}
                  className="mb-4"
                >
                  <Select size="large" showSearch allowClear optionFilterProp="children">
                    {MATERIAL_BRANDS.map((b) => (
                      <Option key={b} value={b}>
                        {b}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="sessions"
                  label={<span className="text-sm font-medium text-slate-600">疗程次数</span>}
                  rules={[{ required: true, message: '请输入疗程次数' }]}
                  className="mb-4"
                >
                  <InputNumber
                    min={1}
                    max={50}
                    size="large"
                    className="!w-full"
                    addonAfter="次"
                  />
                </Form.Item>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={15} className="text-blue-500" />
                <span className="font-medium text-slate-700 text-sm">适用部位</span>
                <span className="text-xs text-slate-400">（可多选）</span>
              </div>
              <Form.Item
                name="applicableParts"
                rules={[{ required: true, message: '请至少选择一个适用部位', type: 'array', min: 1 }]}
                className="mb-0"
              >
                <Checkbox.Group className="flex flex-wrap gap-2">
                  {APPLICABLE_PARTS.map((part) => (
                    <Checkbox
                      key={part}
                      value={part}
                      className="!mb-0 [&_.ant-checkbox-inner]:rounded-md [&:hover_.ant-checkbox-inner]:border-blue-400"
                    >
                      <span className="text-sm">{part}</span>
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </Form.Item>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-rose-50/40 via-white to-orange-50/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserX size={15} className="text-rose-500" />
                <span className="font-medium text-slate-700 text-sm">禁用人群</span>
                <Tooltip title="勾选后，前台下单时将提示风险">
                  <AlertCircle size={13} className="text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Form.Item name="contraindications" className="mb-0">
                <Checkbox.Group className="flex flex-wrap gap-2">
                  {CONTRAINDICATIONS.map((c) => (
                    <Checkbox
                      key={c}
                      value={c}
                      className="!mb-0 [&_.ant-checkbox-inner]:rounded-md [&:hover_.ant-checkbox-inner]:border-rose-400"
                    >
                      <span className="text-sm">{c}</span>
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </Form.Item>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={15} className="text-slate-500" />
                <span className="font-medium text-slate-700 text-sm">项目描述</span>
                <span className="text-xs text-slate-400">（选填）</span>
              </div>
              <Form.Item
                name="description"
                className="mb-0"
              >
                <TextArea
                  rows={3}
                  maxLength={200}
                  showCount
                  placeholder="简要描述项目特点、适用场景等（选填）"
                  className="!rounded-xl !resize-none"
                />
              </Form.Item>
            </div>
          </motion.div>
        </div>

        <Divider className="!my-6 !border-slate-100" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle size={12} />
            提交后将自动记录操作日志，并同步至所有院区
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="large"
              onClick={onClose}
              disabled={submitting}
              className="!rounded-xl !px-5 !h-11"
            >
              取消
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                type="primary"
                size="large"
                icon={submitting ? undefined : <Save size={15} />}
                onClick={handleSubmit}
                loading={submitting}
                className="!bg-brand-navy-500 !border-brand-gold-500 hover:!bg-brand-navy-600 !px-6 !h-11 !rounded-xl !font-medium shadow-navy-md"
              >
                {submitting ? '保存中...' : isEditing ? '保存修改' : '创建项目'}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </Form>
    </Modal>
  );
}
