export type ProjectCategory = 'hyaluronic' | 'photoelectric' | 'skin' | 'anti-aging';

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  hyaluronic: '玻尿酸',
  photoelectric: '光电项目',
  skin: '皮肤管理',
  'anti-aging': '抗衰套餐',
};

export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  hyaluronic: 'magenta',
  photoelectric: 'blue',
  skin: 'green',
  'anti-aging': 'gold',
};

export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  applicableParts: string[];
  materialBrand: string;
  sessions: number;
  contraindications: string[];
  basePrice: number;
  floorPrice: number;
  imageUrl: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type VersionType = 'base' | 'holiday' | 'anniversary' | 'loyalty';
export type VersionStatus = 'draft' | 'pending' | 'approved' | 'effective' | 'expired';

export const VERSION_TYPE_LABELS: Record<VersionType, string> = {
  base: '基础版本',
  holiday: '节假日版本',
  anniversary: '周年庆版本',
  loyalty: '老客专享版本',
};

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已审批',
  effective: '生效中',
  expired: '已过期',
};

export const VERSION_STATUS_COLORS: Record<VersionStatus, string> = {
  draft: 'default',
  pending: 'warning',
  approved: 'processing',
  effective: 'success',
  expired: 'error',
};

export interface PricingEntry {
  cityTier: string;
  storeLevel: string;
  doctorLevel: string;
  price: number;
}

export interface PriceVersion {
  id: string;
  name: string;
  type: VersionType;
  status: VersionStatus;
  effectiveDate: string;
  expireDate: string;
  description: string;
  pricing: Record<string, PricingEntry[]>;
  createdBy: string;
  createdAt: string;
}

export type CityTier = 'tier1' | 'tier2' | 'tier3';
export type StoreLevel = 'flagship' | 'standard' | 'community';
export type DoctorLevel = 'director' | 'senior' | 'attending' | 'junior';

export const CITY_TIER_LABELS: Record<CityTier, string> = {
  tier1: '一线城市',
  tier2: '二线城市',
  tier3: '三线城市',
};

export const STORE_LEVEL_LABELS: Record<StoreLevel, string> = {
  flagship: '旗舰店',
  standard: '标准店',
  community: '社区店',
};

export const DOCTOR_LEVEL_LABELS: Record<DoctorLevel, string> = {
  director: '院长级',
  senior: '主任医师',
  attending: '主治医师',
  junior: '执业医师',
};

export interface PriceOverride {
  projectId: string;
  versionId: string;
  customPrice: number;
  effectiveDate: string;
  note?: string;
  isUpcoming?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  cityTier: CityTier;
  level: StoreLevel;
  phone: string;
  address: string;
  priceOverrides: PriceOverride[];
  upcomingOverrides: PriceOverride[];
}

export type UserRole = 'hq-admin' | 'finance' | 'store-manager';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  'hq-admin': '总部运营',
  finance: '财务审核',
  'store-manager': '院区店长',
};

export interface User {
  id: string;
  name: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  avatar: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'partial';
export type ApprovalItemStatus = 'pending' | 'approved' | 'rejected';

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  partial: '部分通过',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  partial: 'processing',
};

export const APPROVAL_ITEM_STATUS_LABELS: Record<ApprovalItemStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export const APPROVAL_ITEM_STATUS_COLORS: Record<ApprovalItemStatus, string> = {
  pending: 'default',
  approved: 'success',
  rejected: 'error',
};

export interface ApprovalItem {
  id: string;
  projectId: string;
  projectName: string;
  category: ProjectCategory;
  oldPrice: number;
  newPrice: number;
  floorPrice: number;
  affectedBranches: string[];
  note?: string;
  annotation?: string;
  status: ApprovalItemStatus;
  pricingChanges: PricingChangeDetail[];
}

export interface PricingChangeDetail {
  versionId: string;
  cityTier: CityTier;
  storeLevel: StoreLevel;
  doctorLevel: DoctorLevel;
  oldPrice: number;
  newPrice: number;
}

export interface ApprovalComment {
  approver: string;
  content: string;
  timestamp: string;
}

export interface Approval {
  id: string;
  title: string;
  submitter: string;
  submittedAt: string;
  reason: string;
  effectiveDate: string;
  status: ApprovalStatus;
  items: ApprovalItem[];
  approver?: string;
  approvedAt?: string;
  comments?: ApprovalComment[];
}

export type ChangeAction = 'create' | 'update' | 'approve' | 'reject' | 'publish';
export type ChangeModule = 'project' | 'price' | 'branch' | 'version';

export const CHANGE_ACTION_LABELS: Record<ChangeAction, string> = {
  create: '新增',
  update: '修改',
  approve: '审批通过',
  reject: '审批驳回',
  publish: '发布生效',
};

export const CHANGE_MODULE_LABELS: Record<ChangeModule, string> = {
  project: '项目库',
  price: '价格调整',
  branch: '院区差异',
  version: '版本管理',
};

export interface ChangeLog {
  id: string;
  operator: string;
  role: UserRole;
  action: ChangeAction;
  module: ChangeModule;
  targetId: string;
  targetName: string;
  oldValue: any;
  newValue: any;
  affectedBranches: string[];
  affectedBranchesCount: number;
  timestamp: string;
}

export const APPLICABLE_PARTS = [
  '额头', '眉间', '太阳穴', '眼周', '泪沟', '苹果肌',
  '鼻子', '法令纹', '脸颊', '嘴角', '下巴', '下颌线',
  '颈部', '手部', '全面部', '身体塑形',
];

export const MATERIAL_BRANDS = [
  '乔雅登', '瑞蓝', '艾莉薇', '濡白天使', '爱贝芙',
  '双美', '嗨体', '衡力', '保妥适', '吉适',
  '乐提葆', '热玛吉', '热拉提', '欧洲之星', '超声炮',
];

export const CONTRAINDICATIONS = [
  '孕妇或哺乳期女性',
  '18岁以下未成年人',
  '有严重过敏史者',
  '近期服用抗凝药物者',
  '注射部位有炎症或感染',
  '免疫功能低下患者',
  '有瘢痕疙瘩病史',
  '糖尿病患者（血糖未控制）',
];

export type SearchResultType = 'project' | 'branch' | 'price' | 'version';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  category?: string;
  price?: number;
  branchName?: string;
  route: string;
  highlight?: string;
  filters?: Record<string, string>;
}
