import { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Filter,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from 'lucide-react';
import {
  Input,
  Select,
  Button,
  Tag,
  Tooltip,
  Popconfirm,
  Image,
  Avatar,
  Empty,
  message,
  Pagination,
  Card,
} from 'antd';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  MATERIAL_BRANDS,
  type Project,
  type ProjectCategory,
} from '@/types';
import ProjectForm from './ProjectForm';

const { Option } = Select;

const categoryTagColors: Record<ProjectCategory, string> = {
  hyaluronic: 'magenta',
  photoelectric: 'blue',
  skin: 'green',
  'anti-aging': 'gold',
};

export default function ProjectList() {
  const projects = useAppStore((s) => s.projects);
  const updateProject = useAppStore((s) => s.updateProject);

  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const uniqueBrands = useMemo(() => {
    const brands = new Set(projects.map((p) => p.materialBrand));
    return Array.from(brands);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchText && !p.name.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (brandFilter !== 'all' && p.materialBrand !== brandFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, searchText, categoryFilter, brandFilter, statusFilter]);

  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, page]);

  const totalPages = Math.ceil(filteredProjects.length / pageSize);

  const handleToggleStatus = (project: Project) => {
    const newStatus = project.status === 'active' ? 'inactive' : 'active';
    updateProject(project.id, { status: newStatus });
    message.success(`已${newStatus === 'active' ? '上架' : '下架'}「${project.name}」`);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setCategoryFilter('all');
    setBrandFilter('all');
    setStatusFilter('all');
    setPage(1);
    message.info('已重置筛选条件');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  const formatPrice = (n: number) => `¥${n.toLocaleString()}`;

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/40">
            <Layers size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-brand-navy-500">项目库管理</h1>
            <p className="text-slate-400 text-sm mt-0.5">维护医美项目基础信息与价格数据</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            type="primary"
            size="large"
            icon={<Plus size={16} />}
            onClick={handleCreate}
            className="!bg-brand-navy-500 !border-brand-gold-500 hover:!bg-brand-navy-600 !px-5 !rounded-xl !h-11 !font-medium shadow-navy-md"
          >
            新增项目
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-brand-gold-600" />
          <span className="font-medium text-brand-navy-500">筛选条件</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm text-slate-500 mb-1.5">项目名称</label>
            <Input
              prefix={<Search size={16} className="text-slate-400" />}
              placeholder="搜索项目名称..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              allowClear
              size="large"
              className="!rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1.5">项目分类</label>
            <Select
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              size="large"
              className="!w-full !rounded-xl"
              allowClear
            >
              <Option value="all">全部分类</Option>
              {(Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map((cat) => (
                <Option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1.5">产品品牌</label>
            <Select
              value={brandFilter}
              onChange={(v) => {
                setBrandFilter(v);
                setPage(1);
              }}
              size="large"
              className="!w-full !rounded-xl"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              <Option value="all">全部品牌</Option>
              {uniqueBrands.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm text-slate-500 mb-1.5">状态</label>
              <Select
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                size="large"
                className="!w-full !rounded-xl"
                allowClear
              >
                <Option value="all">全部状态</Option>
                <Option value="active">上架中</Option>
                <Option value="inactive">已下架</Option>
              </Select>
            </div>
            <Tooltip title="重置筛选">
              <motion.button
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.4 }}
                onClick={handleResetFilters}
                className="w-11 h-11 rounded-xl border border-slate-200 hover:border-brand-gold-400 hover:bg-brand-gold-50 flex items-center justify-center transition-colors"
              >
                <RefreshCw size={18} className="text-slate-500 hover:text-brand-gold-600" />
              </motion.button>
            </Tooltip>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-slate-400">
            共找到
            <span className="mx-1 font-semibold text-brand-navy-500">{filteredProjects.length}</span>
            个项目
          </span>
          {statusFilter !== 'all' && (
            <Tag
              closable
              onClose={() => setStatusFilter('all')}
              color={statusFilter === 'active' ? 'success' : 'default'}
            >
              状态：{statusFilter === 'active' ? '上架中' : '已下架'}
            </Tag>
          )}
          {categoryFilter !== 'all' && (
            <Tag
              closable
              onClose={() => setCategoryFilter('all')}
              color={categoryTagColors[categoryFilter]}
            >
              分类：{CATEGORY_LABELS[categoryFilter]}
            </Tag>
          )}
          {brandFilter !== 'all' && (
            <Tag closable onClose={() => setBrandFilter('all')} color="geekblue">
              品牌：{brandFilter}
            </Tag>
          )}
          {searchText && (
            <Tag closable onClose={() => setSearchText('')} color="gold">
              搜索：{searchText}
            </Tag>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {paginatedProjects.length === 0 ? (
          <motion.div variants={itemVariants} className="card py-16">
            <Empty description="暂无符合条件的项目" />
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="table-header-cell">项目信息</th>
                    <th className="table-header-cell">分类</th>
                    <th className="table-header-cell">品牌</th>
                    <th className="table-header-cell">疗程</th>
                    <th className="table-header-cell">基础价 / 底价</th>
                    <th className="table-header-cell">适用部位</th>
                    <th className="table-header-cell">禁用人群</th>
                    <th className="table-header-cell text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {paginatedProjects.map((p, idx) => (
                      <motion.tr
                        key={p.id}
                        variants={itemVariants}
                        layout
                        className={`border-b border-slate-50 hover:bg-brand-gold-50/40 transition-colors ${
                          p.status === 'inactive' ? 'bg-slate-50/50' : ''
                        }`}
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar
                                size={48}
                                shape="square"
                                src={p.imageUrl}
                                className="rounded-lg shadow-sm border border-slate-100"
                              >
                                {p.name.slice(0, 1)}
                              </Avatar>
                              {p.status === 'inactive' && (
                                <div className="absolute inset-0 bg-slate-900/60 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-[10px] font-medium">已下架</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`font-semibold truncate max-w-[200px] ${
                                  p.status === 'inactive' ? 'text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                {p.name}
                              </div>
                              {p.description && (
                                <Tooltip title={p.description}>
                                  <div className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
                                    {p.description}
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <Tag
                            color={categoryTagColors[p.category]}
                            bordered={false}
                            className="!rounded-md !py-0.5 !px-2.5"
                          >
                            {CATEGORY_LABELS[p.category]}
                          </Tag>
                        </td>
                        <td className="table-cell">
                          <span className="text-slate-700 font-medium">{p.materialBrand}</span>
                        </td>
                        <td className="table-cell">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
                            {p.sessions} 次
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-slate-500 text-xs">基础</span>
                              <span className="font-semibold text-slate-800">{formatPrice(p.basePrice)}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-slate-400 text-xs">底价</span>
                              <span className="font-medium text-semantic-danger">{formatPrice(p.floorPrice)}</span>
                            </div>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                                style={{
                                  width: `${Math.min(100, (p.floorPrice / p.basePrice) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {p.applicableParts.slice(0, 3).map((part) => (
                              <span
                                key={part}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                              >
                                {part}
                              </span>
                            ))}
                            {p.applicableParts.length > 3 && (
                              <Tooltip title={p.applicableParts.join('、')}>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 cursor-help">
                                  +{p.applicableParts.length - 3}
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          {p.contraindications.length > 0 ? (
                            <Tooltip title={p.contraindications.join('、')}>
                              <div className="flex items-center gap-1.5 cursor-help">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-semibold border border-rose-200">
                                  {p.contraindications.length}
                                </span>
                                <span className="text-xs text-slate-500">项禁忌</span>
                              </div>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-slate-300">无</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip title="查看详情">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.92 }}
                                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
                              >
                                <Eye size={14} className="text-slate-500" />
                              </motion.button>
                            </Tooltip>
                            <Tooltip title="编辑">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleEdit(p)}
                                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                              >
                                <Edit3 size={14} className="text-blue-600" />
                              </motion.button>
                            </Tooltip>
                            <Popconfirm
                              title={p.status === 'active' ? '确定下架该项目？' : '确定上架该项目？'}
                              description={`将「${p.name}」${p.status === 'active' ? '下架' : '上架'}`}
                              okText="确定"
                              cancelText="取消"
                              okButtonProps={{
                                className: '!bg-brand-navy-500',
                              }}
                              onConfirm={() => handleToggleStatus(p)}
                            >
                              <Tooltip title={p.status === 'active' ? '点击下架' : '点击上架'}>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.92 }}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    p.status === 'active'
                                      ? 'bg-emerald-50 hover:bg-emerald-100'
                                      : 'bg-amber-50 hover:bg-amber-100'
                                  }`}
                                >
                                  {p.status === 'active' ? (
                                    <ToggleRight size={16} className="text-emerald-600" />
                                  ) : (
                                    <ToggleLeft size={16} className="text-amber-600" />
                                  )}
                                </motion.button>
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {filteredProjects.length > pageSize && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
                <div className="text-sm text-slate-500">
                  第 <span className="font-semibold text-brand-navy-500">{page}</span> /{' '}
                  <span className="font-semibold text-brand-navy-500">{totalPages}</span> 页，共{' '}
                  <span className="font-semibold text-brand-navy-500">{filteredProjects.length}</span> 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="large"
                    icon={<ChevronLeft size={16} />}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="!rounded-xl"
                  >
                    上一页
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (page <= 4) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                      return (
                        <motion.button
                          key={pageNum}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setPage(pageNum)}
                          className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                            page === pageNum
                              ? 'bg-brand-navy-500 text-white shadow-navy-md border border-brand-gold-500/40'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-gold-400 hover:text-brand-gold-700'
                          }`}
                        >
                          {pageNum}
                        </motion.button>
                      );
                    })}
                  </div>
                  <Button
                    size="large"
                    icon={<ChevronRight size={16} />}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="!rounded-xl"
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <ProjectForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
        editData={editingProject}
      />
    </div>
  );
}
