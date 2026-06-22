import { useState, useMemo, useRef } from 'react';
import {
  Select,
  Tabs,
  Tag,
  Card,
  Space,
  Button,
  Tooltip,
  Dropdown,
  message,
  Spin,
  Empty,
  Row,
  Col,
  Avatar,
  Divider,
  Badge,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  LockOutlined,
  EnvironmentOutlined,
  BankOutlined,
  AimOutlined,
  ScissorOutlined,
  CrownOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppStore } from '@/store';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  ProjectCategory,
  Branch,
  Project,
} from '@/types';

const { Option } = Select;

const CATEGORY_ICONS: Record<ProjectCategory, React.ReactNode> = {
  hyaluronic: <StarOutlined />,
  photoelectric: <ScissorOutlined />,
  skin: <AimOutlined />,
  'anti-aging': <CrownOutlined />,
};

const CATEGORY_TEXT_COLORS: Record<ProjectCategory, string> = {
  hyaluronic: 'text-fuchsia-500',
  photoelectric: 'text-blue-500',
  skin: 'text-green-500',
  'anti-aging': 'text-yellow-500',
};

const ALL_CATEGORIES: (ProjectCategory | 'all')[] = ['all', 'hyaluronic', 'photoelectric', 'skin', 'anti-aging'];

export default function PricePreview() {
  const currentUser = useAppStore((s) => s.currentUser);
  const projects = useAppStore((s) => s.projects);
  const getAccessibleBranches = useAppStore((s) => s.getAccessibleBranches);
  const getProjectPriceForBranch = useAppStore((s) => s.getProjectPriceForBranch);
  const priceVersions = useAppStore((s) => s.priceVersions);

  const accessibleBranches = useMemo(() => getAccessibleBranches(), [getAccessibleBranches]);
  const isStoreManager = currentUser?.role === 'store-manager';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isStoreManager && currentUser?.branchId ? currentUser.branchId : accessibleBranches[0]?.id || ''
  );
  const [activeCategory, setActiveCategory] = useState<ProjectCategory | 'all'>('all');
  const [exportingType, setExportingType] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedBranch: Branch | undefined = useMemo(
    () => accessibleBranches.find((b) => b.id === selectedBranchId) || accessibleBranches[0],
    [accessibleBranches, selectedBranchId]
  );

  const effectiveVersion = useMemo(
    () => priceVersions.find((v) => v.status === 'effective'),
    [priceVersions]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (p.status !== 'active') return false;
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      return true;
    });
  }, [projects, activeCategory]);

  const getProjectFinalPrice = (project: Project) => {
    if (!selectedBranch) return project.basePrice;
    return getProjectPriceForBranch(project.id, selectedBranch.id, effectiveVersion?.id);
  };

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = { all: projects.filter((p) => p.status === 'active').length };
    (Object.keys(CATEGORY_LABELS) as ProjectCategory[]).forEach((cat) => {
      counts[cat] = projects.filter((p) => p.status === 'active' && p.category === cat).length;
    });
    return counts;
  }, [projects]);

  const tabItems = ALL_CATEGORIES.map((cat) => ({
    key: cat,
    label: (
      <span className="flex items-center gap-2 px-1">
        {cat !== 'all' ? <span className={CATEGORY_TEXT_COLORS[cat as ProjectCategory]}>{CATEGORY_ICONS[cat as ProjectCategory]}</span> : <BankOutlined className="text-slate-500" />}
        <span>{cat === 'all' ? '全部项目' : CATEGORY_LABELS[cat as ProjectCategory]}</span>
        <Tag color={cat === 'all' ? 'default' : CATEGORY_COLORS[cat as ProjectCategory]} className="ml-1 border-0 !mx-0">
          {categoryCount[cat] || 0}
        </Tag>
      </span>
    ),
  }));

  const handleExportExcel = () => {
    setExportingType('excel');
    try {
      const data = filteredProjects.map((p) => {
        const finalPrice = getProjectFinalPrice(p);
        const hasDiscount = finalPrice < p.basePrice;
        return {
          分类: CATEGORY_LABELS[p.category],
          项目名称: p.name,
          品牌: p.materialBrand,
          疗程: `${p.sessions}次`,
          适用部位: p.applicableParts.join('、'),
          原价: p.basePrice,
          最终价: finalPrice,
          折扣: hasDiscount ? `${((finalPrice / p.basePrice) * 10).toFixed(1)}折` : '原价',
          底价: p.floorPrice,
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 10 }, { wch: 28 }, { wch: 14 }, { wch: 8 },
        { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '价目表');
      const fileName = `${selectedBranch?.name || '全院'}_价目表_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success('Excel 导出成功');
    } catch (e) {
      console.error(e);
      message.error('Excel 导出失败');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExportingType('pdf');
    try {
      message.loading({ content: '正在生成 PDF...', key: 'pdf', duration: 0 });
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      const fileName = `${selectedBranch?.name || '全院'}_价目表_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      message.success({ content: 'PDF 导出成功', key: 'pdf' });
    } catch (e) {
      console.error(e);
      message.error({ content: 'PDF 导出失败', key: 'pdf' });
    } finally {
      setExportingType(null);
    }
  };

  const handlePrint = () => {
    setExportingType('print');
    setTimeout(() => {
      window.print();
      setExportingType(null);
    }, 300);
  };

  const exportMenu = {
    items: [
      {
        key: 'excel',
        label: (
          <span className="flex items-center gap-2">
            <FileExcelOutlined className="text-emerald-600" />
            导出 Excel
          </span>
        ),
        onClick: handleExportExcel,
      },
      {
        key: 'pdf',
        label: (
          <span className="flex items-center gap-2">
            <FilePdfOutlined className="text-rose-600" />
            导出 PDF
          </span>
        ),
        onClick: handleExportPDF,
      },
      {
        key: 'print',
        label: (
          <span className="flex items-center gap-2">
            <PrinterOutlined className="text-blue-600" />
            打印价目表
          </span>
        ),
        onClick: handlePrint,
      },
    ],
  };

  const cardContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const cardItem = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 min-h-screen bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-pink-50/30 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 -top-32 w-96 h-96 bg-gradient-to-br from-fuchsia-200/30 to-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute -right-32 top-40 w-[28rem] h-[28rem] bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-gradient-to-tr from-amber-200/20 to-rose-200/30 rounded-full blur-3xl" />
        {selectedBranch && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="text-[180px] font-black text-slate-400/5 leading-none whitespace-nowrap rotate-[-18deg] tracking-widest"
              style={{ userSelect: 'none' }}
            >
              {selectedBranch.name}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">价目表预览</h1>
              {effectiveVersion && (
                <Tag color="green" className="border-0">
                  当前版本：{effectiveVersion.name}
                </Tag>
              )}
            </div>
            <p className="text-sm text-slate-500">查看各院区的最终执行价格，支持多格式导出</p>
          </div>

          <Space className="w-full lg:w-auto">
            <div className="flex-1 lg:w-72">
              <Select
                value={selectedBranchId}
                onChange={setSelectedBranchId}
                disabled={isStoreManager}
                className="w-full"
                size="large"
                style={{ minWidth: 260 }}
                suffixIcon={isStoreManager ? <LockOutlined className="text-amber-500" /> : <EnvironmentOutlined className="text-slate-400" />}
                optionLabelProp="label"
              >
                {accessibleBranches.map((b) => (
                  <Option key={b.id} value={b.id} label={b.name}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <EnvironmentOutlined className="text-blue-500 shrink-0" />
                        <span className="truncate">{b.name}</span>
                        {isStoreManager && b.id === currentUser?.branchId && (
                          <Tag color="amber" className="border-0 text-xs shrink-0">
                            <LockOutlined /> 本院区
                          </Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Tag color="default" className="border-0 text-xs bg-slate-100">
                          {b.city}
                        </Tag>
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>

            <Dropdown menu={exportMenu} placement="bottomRight" trigger={['click']}>
              <Button
                type="primary"
                size="large"
                icon={<DownloadOutlined />}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 border-0 font-medium"
              >
                导出 / 打印
              </Button>
            </Dropdown>
          </Space>
        </div>

        {selectedBranch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <Card
              size="small"
              className="shadow-sm border border-indigo-100/60 bg-gradient-to-r from-white/80 via-indigo-50/40 to-violet-50/40 backdrop-blur-sm"
              styles={{ body: { padding: '14px 20px' } }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200/50">
                    <EnvironmentOutlined className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{selectedBranch.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{selectedBranch.city}</span>
                      <span className="text-slate-300">|</span>
                      <span>{selectedBranch.address}</span>
                      <span className="text-slate-300">|</span>
                      <span>{selectedBranch.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <div className="text-center px-3 py-1.5 bg-white/70 rounded-lg">
                    <p className="text-xs text-slate-500">项目总数</p>
                    <p className="text-lg font-bold text-indigo-600">{filteredProjects.length}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <Card
          className="shadow-sm border border-slate-200/60 bg-white/60 backdrop-blur-md"
          styles={{ body: { padding: 0 } }}
        >
          <div className="px-6 pt-4 border-b border-slate-100/70">
            <Tabs
              activeKey={activeCategory}
              onChange={(k) => setActiveCategory(k as ProjectCategory | 'all')}
              items={tabItems}
              size="large"
              className="preview-tabs"
            />
          </div>

          <div ref={printRef} className="p-6">
            {selectedBranch && (
              <div className="print-only mb-6 pb-4 border-b-2 border-dashed border-slate-300 hidden">
                <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">{selectedBranch.name}</h2>
                <p className="text-center text-slate-600">项目价目表 · 生成日期：{new Date().toLocaleDateString('zh-CN')}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {filteredProjects.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Empty description="该分类暂无项目" className="py-16" />
                </motion.div>
              ) : (
                <motion.div
                  key={activeCategory}
                  variants={cardContainer}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                >
                  <Row gutter={[20, 20]}>
                    {filteredProjects.map((project) => {
                      const finalPrice = getProjectFinalPrice(project);
                      const hasDiscount = finalPrice < project.basePrice;
                      const discountRate = hasDiscount ? (finalPrice / project.basePrice) * 10 : 10;
                      const floorGap = finalPrice - project.floorPrice;
                      const nearFloor = floorGap / project.floorPrice < 0.1;

                      return (
                        <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
                          <motion.div variants={cardItem} whileHover={{ y: -4 }}>
                            <Card
                              hoverable
                              className="h-full overflow-hidden group border-0 shadow-md shadow-slate-200/60 rounded-2xl"
                              styles={{ body: { padding: 0 } }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.65)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.08)',
                              }}
                            >
                              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                                <img
                                  src={project.imageUrl}
                                  alt={project.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                  <Tag
                                    color={CATEGORY_COLORS[project.category]}
                                    className="border-0 backdrop-blur-sm bg-opacity-90 font-medium shadow-sm"
                                  >
                                    <span className="mr-1">{CATEGORY_ICONS[project.category]}</span>
                                    {CATEGORY_LABELS[project.category]}
                                  </Tag>
                                  {hasDiscount && (
                                    <Badge.Ribbon
                                      text={`${discountRate.toFixed(1)}折`}
                                      color="magenta"
                                      className="!font-bold"
                                    />
                                  )}
                                </div>

                                <div className="absolute top-3 right-3">
                                  <div className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
                                    <span className="text-xs font-semibold text-slate-700">
                                      {project.sessions > 1 ? `${project.sessions}次疗程` : '单次体验'}
                                    </span>
                                  </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <div className="flex items-end justify-between gap-3">
                                    <div className="min-w-0">
                                      <h3 className="text-white font-bold text-lg leading-tight truncate drop-shadow-lg">
                                        {project.name}
                                      </h3>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-xs text-white/85 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                          {project.materialBrand}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 space-y-3">
                                <div className="flex flex-wrap gap-1">
                                  {project.applicableParts.slice(0, 4).map((part) => (
                                    <Tag
                                      key={part}
                                      className="border-0 bg-slate-100 text-slate-600 text-xs !mx-0"
                                    >
                                      {part}
                                    </Tag>
                                  ))}
                                  {project.applicableParts.length > 4 && (
                                    <Tooltip title={project.applicableParts.join('、')}>
                                      <Tag className="border-0 bg-slate-100 text-slate-500 text-xs cursor-help !mx-0">
                                        +{project.applicableParts.length - 4}
                                      </Tag>
                                    </Tooltip>
                                  )}
                                </div>

                                <Divider className="!my-2 !border-slate-100" />

                                <div className="flex items-end justify-between gap-2">
                                  <div>
                                    {hasDiscount && (
                                      <div className="text-xs text-slate-400 line-through mb-0.5">
                                        ¥{project.basePrice.toLocaleString()}
                                      </div>
                                    )}
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xs text-rose-500 font-semibold">¥</span>
                                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 leading-none">
                                        {finalPrice.toLocaleString()}
                                      </span>
                                    </div>
                                    {nearFloor && (
                                      <div className="mt-1">
                                        <Tag color="warning" className="border-0 text-[10px] !mx-0 py-0 px-1.5">
                                          接近底价
                                        </Tag>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="text-[10px] text-slate-400 mb-0.5">底价</div>
                                    <div className="text-sm font-semibold text-slate-600">
                                      ¥{project.floorPrice.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        </Col>
                      );
                    })}
                  </Row>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {exportingType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
              <Spin size="large" />
              <p className="text-slate-700 font-medium">
                {exportingType === 'excel' && '正在生成 Excel...'}
                {exportingType === 'pdf' && '正在生成 PDF...'}
                {exportingType === 'print' && '准备打印...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print-only {
            display: block !important;
          }
          .no-print,
          .ant-dropdown,
          .fixed,
          .sticky {
            display: none !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
