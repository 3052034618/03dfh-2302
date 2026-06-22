import { create } from 'zustand';
import {
  mockUsers,
  mockProjects,
  mockPriceVersions,
  mockBranches,
  mockApprovals,
  mockChangeLogs,
} from '@/data/mock';
import type {
  Project,
  PriceVersion,
  Branch,
  User,
  Approval,
  ApprovalItem,
  ChangeLog,
  UserRole,
  ApprovalStatus,
  ApprovalItemStatus,
  PricingEntry,
  PriceOverride,
  SearchResult,
  SearchResultType,
  PricingChangeDetail,
  CityTier,
  StoreLevel,
  DoctorLevel,
} from '@/types';
import dayjs from 'dayjs';

export interface ProjectPriceResult {
  currentPrice: number;
  upcomingPrice?: number;
  upcomingDate?: string;
  isUpcoming: boolean;
}

export interface BranchPricingEntry {
  projectId: string;
  cityTier: string;
  storeLevel: string;
  doctorLevel: string;
  currentPrice: number;
  upcomingPrice?: number;
  upcomingEffectiveDate?: string;
  source: 'matrix' | 'override' | 'approval';
  approvalId?: string;
}

export interface DimensionPriceResult {
  currentPrice: number;
  upcomingPrice?: number;
  upcomingDate?: string;
}

interface SubmitApprovalItem extends Omit<ApprovalItem, 'status' | 'pricingChanges'> {
  status?: ApprovalItemStatus;
  pricingChanges?: PricingChangeDetail[];
}

interface SubmitApprovalPayload extends Omit<Approval, 'id' | 'status' | 'submittedAt' | 'items'> {
  items: SubmitApprovalItem[];
}

const CITY_TIERS: CityTier[] = ['tier1', 'tier2', 'tier3'];
const STORE_LEVELS: StoreLevel[] = ['flagship', 'standard', 'community'];
const DOCTOR_LEVELS: DoctorLevel[] = ['director', 'senior', 'attending', 'junior'];

function buildBranchPricing(
  branches: Branch[],
  projects: Project[],
  priceVersions: PriceVersion[]
): Record<string, BranchPricingEntry[]> {
  const result: Record<string, BranchPricingEntry[]> = {};
  const effectiveVersion = priceVersions.find((v) => v.status === 'effective');
  if (!effectiveVersion) return result;

  branches.forEach((branch) => {
    const entries: BranchPricingEntry[] = [];

    projects.forEach((project) => {
      const matrixEntries = effectiveVersion.pricing[project.id] || [];

      DOCTOR_LEVELS.forEach((dl) => {
        const match = matrixEntries.find(
          (e) =>
            e.cityTier === branch.cityTier &&
            e.storeLevel === branch.level &&
            e.doctorLevel === dl
        );

        const override = branch.priceOverrides.find(
          (o) => o.projectId === project.id && (o.versionId === effectiveVersion.id || !o.versionId)
        );
        const upcomingOverride = branch.upcomingOverrides?.find(
          (o) =>
            o.projectId === project.id &&
            (o.versionId === effectiveVersion.id || !o.versionId) &&
            dayjs(o.effectiveDate).isAfter(dayjs())
        );

        let currentPrice = match?.price ?? project.basePrice;
        let source: BranchPricingEntry['source'] = 'matrix';

        if (override && dl === 'attending') {
          currentPrice = override.customPrice;
          source = 'override';
        }

        const entry: BranchPricingEntry = {
          projectId: project.id,
          cityTier: branch.cityTier,
          storeLevel: branch.level,
          doctorLevel: dl,
          currentPrice,
          source,
        };

        if (upcomingOverride && dl === 'attending') {
          entry.upcomingPrice = upcomingOverride.customPrice;
          entry.upcomingEffectiveDate = upcomingOverride.effectiveDate;
        }

        entries.push(entry);
      });
    });

    result[branch.id] = entries;
  });

  return result;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  priceVersions: PriceVersion[];
  branches: Branch[];
  approvals: Approval[];
  changeLogs: ChangeLog[];
  branchPricing: Record<string, BranchPricingEntry[]>;

  _lastActivateRun: number;
  _applyApprovalItemToPricing: (
    item: ApprovalItem,
    effectiveDate: string,
    approvalId: string,
    approvalTitle: string
  ) => void;

  login: (role: UserRole) => void;
  logout: () => void;

  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addPriceVersion: (version: Omit<PriceVersion, 'id' | 'createdAt'>) => void;
  updatePriceVersion: (id: string, version: Partial<PriceVersion>) => void;
  updatePricing: (versionId: string, projectId: string, pricing: PricingEntry[]) => void;

  updateBranchOverride: (branchId: string, overrides: Branch['priceOverrides']) => void;
  updateBranchUpcomingOverride: (branchId: string, overrides: Branch['upcomingOverrides']) => void;

  submitApproval: (approval: SubmitApprovalPayload) => void;
  decideApproval: (id: string, decision: ApprovalStatus, comments?: string, annotations?: Record<string, string>) => void;
  decideApprovalItem: (approvalId: string, itemId: string, decision: ApprovalItemStatus, annotation?: string) => void;
  approveItem: (approvalId: string, itemId: string, annotation?: string) => void;
  rejectItem: (approvalId: string, itemId: string, annotation?: string) => void;
  revokeItem: (approvalId: string, itemId: string) => void;
  batchApproveItems: (approvalId: string, itemIds: string[], annotations?: Record<string, string>) => void;
  batchRejectItems: (approvalId: string, itemIds: string[], annotations?: Record<string, string>) => void;

  addChangeLog: (log: Omit<ChangeLog, 'id'>) => void;

  activateUpcomingPrices: () => void;

  getBranchById: (id: string) => Branch | undefined;
  getProjectById: (id: string) => Project | undefined;
  getProjectPriceForBranch: (
    projectId: string,
    branchId: string,
    versionId?: string,
    doctorLevel?: DoctorLevel
  ) => ProjectPriceResult;
  getAccessibleBranches: () => Branch[];
  getPriceByDimension: (
    versionId: string,
    projectId: string,
    cityTier: string,
    storeLevel: string,
    doctorLevel: string
  ) => number | undefined;
  getDimensionPriceDetail: (
    branchId: string,
    projectId: string,
    doctorLevel: DoctorLevel
  ) => DimensionPriceResult | undefined;

  globalSearch: (keyword: string, limit?: number) => SearchResult[];
}

const genId = () => Math.random().toString(36).slice(2, 10);

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: mockUsers[0],
  users: mockUsers,
  projects: mockProjects,
  priceVersions: mockPriceVersions,
  branches: mockBranches,
  approvals: mockApprovals,
  changeLogs: mockChangeLogs,
  branchPricing: buildBranchPricing(mockBranches, mockProjects, mockPriceVersions),
  _lastActivateRun: 0,

  login: (role) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    set({ currentUser: user });
  },
  logout: () => set({ currentUser: null }),

  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: 'p' + Date.now().toString(36),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set((state) => {
      const newProjects = [newProject, ...state.projects];
      return {
        projects: newProjects,
        branchPricing: buildBranchPricing(state.branches, newProjects, state.priceVersions),
      };
    });
    get().addChangeLog({
      operator: get().currentUser?.name || '系统',
      role: get().currentUser?.role || 'hq-admin',
      action: 'create',
      module: 'project',
      targetId: newProject.id,
      targetName: newProject.name,
      oldValue: null,
      newValue: { name: newProject.name, category: newProject.category, basePrice: newProject.basePrice },
      affectedBranches: ['全院'],
      affectedBranchesCount: get().branches.length,
      timestamp: new Date().toLocaleString('zh-CN'),
    });
  },
  updateProject: (id, project) => {
    set((state) => {
      const newProjects = state.projects.map((p) => (p.id === id ? { ...p, ...project } : p));
      return {
        projects: newProjects,
        branchPricing: buildBranchPricing(state.branches, newProjects, state.priceVersions),
      };
    });
    const updated = get().projects.find((p) => p.id === id);
    if (updated) {
      get().addChangeLog({
        operator: get().currentUser?.name || '系统',
        role: get().currentUser?.role || 'hq-admin',
        action: 'update',
        module: 'project',
        targetId: id,
        targetName: updated.name,
        oldValue: null,
        newValue: project,
        affectedBranches: ['全院'],
        affectedBranchesCount: get().branches.length,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    }
  },
  deleteProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    set((state) => {
      const newProjects = state.projects.filter((p) => p.id !== id);
      return {
        projects: newProjects,
        branchPricing: buildBranchPricing(state.branches, newProjects, state.priceVersions),
      };
    });
    if (project) {
      get().addChangeLog({
        operator: get().currentUser?.name || '系统',
        role: get().currentUser?.role || 'hq-admin',
        action: 'update',
        module: 'project',
        targetId: id,
        targetName: project.name,
        oldValue: { status: 'active' },
        newValue: { status: 'deleted' },
        affectedBranches: ['全院'],
        affectedBranchesCount: get().branches.length,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    }
  },

  addPriceVersion: (version) => {
    const newVersion: PriceVersion = {
      ...version,
      id: 'v' + Date.now().toString(36),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set((state) => ({ priceVersions: [newVersion, ...state.priceVersions] }));
    get().addChangeLog({
      operator: get().currentUser?.name || '系统',
      role: get().currentUser?.role || 'hq-admin',
      action: 'create',
      module: 'version',
      targetId: newVersion.id,
      targetName: newVersion.name,
      oldValue: null,
      newValue: { type: newVersion.type, projectsCount: Object.keys(newVersion.pricing).length },
      affectedBranches: ['全院'],
      affectedBranchesCount: get().branches.length,
      timestamp: new Date().toLocaleString('zh-CN'),
    });
  },
  updatePriceVersion: (id, version) => {
    set((state) => ({
      priceVersions: state.priceVersions.map((v) => (v.id === id ? { ...v, ...version } : v)),
    }));
  },
  updatePricing: (versionId, projectId, pricing) => {
    const version = get().priceVersions.find((v) => v.id === versionId);
    const project = get().projects.find((p) => p.id === projectId);
    const oldPricing = version?.pricing?.[projectId];
    const oldPrice = oldPricing?.find(
      (e) => e.cityTier === 'tier1' && e.storeLevel === 'flagship' && e.doctorLevel === 'attending'
    )?.price;
    const newPrice = pricing.find(
      (e) => e.cityTier === 'tier1' && e.storeLevel === 'flagship' && e.doctorLevel === 'attending'
    )?.price;

    set((state) => {
      const newPriceVersions = state.priceVersions.map((v) =>
        v.id === versionId ? { ...v, pricing: { ...v.pricing, [projectId]: pricing } } : v
      );
      return {
        priceVersions: newPriceVersions,
        branchPricing: buildBranchPricing(state.branches, state.projects, newPriceVersions),
      };
    });

    if (project && version && oldPrice !== newPrice) {
      get().addChangeLog({
        operator: get().currentUser?.name || '系统',
        role: get().currentUser?.role || 'hq-admin',
        action: 'update',
        module: 'price',
        targetId: `${versionId}-${projectId}`,
        targetName: `${project.name} 价格矩阵修改`,
        oldValue: { projectName: project.name, oldPrice, versionName: version.name },
        newValue: { projectName: project.name, newPrice, versionName: version.name },
        affectedBranches: get().branches.map((b) => b.id),
        affectedBranchesCount: get().branches.length,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    }
  },

  updateBranchOverride: (branchId, overrides) => {
    const branch = get().branches.find((b) => b.id === branchId);
    const oldOverrides = branch?.priceOverrides || [];

    const changedItems: Array<{ projectId: string; oldPrice?: number; newPrice?: number; note?: string }> = [];
    overrides.forEach((ov) => {
      const old = oldOverrides.find((o) => o.projectId === ov.projectId && o.versionId === ov.versionId);
      if (!old || old.customPrice !== ov.customPrice) {
        changedItems.push({
          projectId: ov.projectId,
          oldPrice: old?.customPrice,
          newPrice: ov.customPrice,
          note: ov.note,
        });
      }
    });

    set((state) => {
      const newBranches = state.branches.map((b) => (b.id === branchId ? { ...b, priceOverrides: overrides } : b));
      return {
        branches: newBranches,
        branchPricing: buildBranchPricing(newBranches, state.projects, state.priceVersions),
      };
    });

    if (branch && changedItems.length > 0) {
      changedItems.forEach((item) => {
        const project = get().projects.find((p) => p.id === item.projectId);
        get().addChangeLog({
          operator: get().currentUser?.name || '系统',
          role: get().currentUser?.role || 'hq-admin',
          action: 'update',
          module: 'branch',
          targetId: `${branchId}-${item.projectId}`,
          targetName: `${branch.name} ${project?.name || item.projectId} 差异价变更`,
          oldValue: {
            projectName: project?.name || item.projectId,
            oldPrice: item.oldPrice,
            branchName: branch.name,
          },
          newValue: {
            projectName: project?.name || item.projectId,
            newPrice: item.newPrice,
            branchName: branch.name,
            note: item.note,
          },
          affectedBranches: [branchId],
          affectedBranchesCount: 1,
          timestamp: new Date().toLocaleString('zh-CN'),
        });
      });
    }
  },
  updateBranchUpcomingOverride: (branchId, overrides) => {
    set((state) => {
      const newBranches = state.branches.map((b) =>
        b.id === branchId ? { ...b, upcomingOverrides: overrides } : b
      );
      return {
        branches: newBranches,
        branchPricing: buildBranchPricing(newBranches, state.projects, state.priceVersions),
      };
    });
  },

  submitApproval: (approval) => {
    const newApproval: Approval = {
      ...approval,
      id: 'ap' + Date.now().toString(36),
      status: 'pending',
      submittedAt: new Date().toLocaleString('zh-CN'),
      items: approval.items.map((item) => ({
        ...item,
        status: 'pending' as ApprovalItemStatus,
        pricingChanges: item.pricingChanges || [],
      })),
    };
    set((state) => ({ approvals: [newApproval, ...state.approvals] }));
    get().addChangeLog({
      operator: newApproval.submitter,
      role: get().currentUser?.role || 'hq-admin',
      action: 'update',
      module: 'price',
      targetId: newApproval.id,
      targetName: newApproval.title,
      oldValue: { status: 'draft' },
      newValue: { status: 'pending', itemsCount: newApproval.items.length },
      affectedBranches: Array.from(new Set(newApproval.items.flatMap((i) => i.affectedBranches))),
      affectedBranchesCount: new Set(newApproval.items.flatMap((i) => i.affectedBranches)).size,
      timestamp: newApproval.submittedAt,
    });
  },

  decideApproval: (id, decision, comments, annotations) => {
    let approvalItemsToProcess: ApprovalItem[] = [];
    let effectiveDate = '';
    let approvalTitle = '';
    let approvalId = id;

    set((state) => ({
      approvals: state.approvals.map((a) => {
        if (a.id !== id) return a;
        const itemStatus = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'pending';
        const newItems = a.items.map((item) => ({
          ...item,
          status: itemStatus as ApprovalItemStatus,
          annotation: annotations?.[item.id] || item.annotation,
        }));
        const newComments = comments
          ? [
              ...(a.comments || []),
              { approver: get().currentUser?.name || '', content: comments, timestamp: new Date().toLocaleString('zh-CN') },
            ]
          : a.comments;

        if (decision === 'approved') {
          approvalItemsToProcess = newItems.filter((i) => i.status === 'approved');
          effectiveDate = a.effectiveDate;
          approvalTitle = a.title;
        }

        return {
          ...a,
          status: decision,
          items: newItems,
          approver: get().currentUser?.name,
          approvedAt: new Date().toLocaleString('zh-CN'),
          comments: newComments,
        };
      }),
    }));

    const approval = get().approvals.find((a) => a.id === id);
    if (approval) {
      get().addChangeLog({
        operator: get().currentUser?.name || '系统',
        role: get().currentUser?.role || 'finance',
        action: decision === 'approved' ? 'approve' : 'reject',
        module: 'price',
        targetId: id,
        targetName: approval.title,
        oldValue: { status: 'pending' },
        newValue: { status: decision },
        affectedBranches: Array.from(new Set(approval.items.flatMap((i) => i.affectedBranches))),
        affectedBranchesCount: new Set(approval.items.flatMap((i) => i.affectedBranches)).size,
        timestamp: new Date().toLocaleString('zh-CN'),
      });

      if (decision === 'approved' && approvalItemsToProcess.length > 0) {
        approvalItemsToProcess.forEach((item) => {
          get()._applyApprovalItemToPricing(item, effectiveDate, approvalId, approvalTitle);
        });
      }
    }
  },

  decideApprovalItem: (approvalId, itemId, decision, annotation) => {
    let processedItem: ApprovalItem | null = null;
    let effectiveDate = '';
    let approvalTitle = '';

    set((state) => ({
      approvals: state.approvals.map((a) => {
        if (a.id !== approvalId) return a;
        const newItems = a.items.map((item) => {
          if (item.id !== itemId) return item;
          const updated = {
            ...item,
            status: decision,
            annotation: annotation || item.annotation,
          };
          if (decision === 'approved') {
            processedItem = updated;
            effectiveDate = a.effectiveDate;
            approvalTitle = a.title;
          }
          return updated;
        });

        const approvedCount = newItems.filter((i) => i.status === 'approved').length;
        const rejectedCount = newItems.filter((i) => i.status === 'rejected').length;
        const totalCount = newItems.length;
        let overallStatus: ApprovalStatus = 'pending';
        if (approvedCount === totalCount) {
          overallStatus = 'approved';
        } else if (rejectedCount === totalCount) {
          overallStatus = 'rejected';
        } else if (approvedCount > 0 || rejectedCount > 0) {
          overallStatus = 'partial';
        }

        return {
          ...a,
          status: overallStatus,
          items: newItems,
          approver: get().currentUser?.name,
          approvedAt: overallStatus !== 'pending' ? new Date().toLocaleString('zh-CN') : a.approvedAt,
        };
      }),
    }));

    const approval = get().approvals.find((a) => a.id === approvalId);
    const item = approval?.items.find((i) => i.id === itemId);
    if (approval && item) {
      get().addChangeLog({
        operator: get().currentUser?.name || '系统',
        role: get().currentUser?.role || 'finance',
        action: decision === 'approved' ? 'approve' : 'reject',
        module: 'price',
        targetId: `${approvalId}-${itemId}`,
        targetName: `审批单项${decision === 'approved' ? '通过' : '驳回'}-${item.projectName}`,
        oldValue: {
          projectName: item.projectName,
          oldPrice: item.oldPrice,
          status: 'pending',
        },
        newValue: {
          projectName: item.projectName,
          newPrice: item.newPrice,
          status: decision,
          annotation: annotation || item.annotation,
        },
        affectedBranches: item.affectedBranches,
        affectedBranchesCount: item.affectedBranches.length,
        timestamp: new Date().toLocaleString('zh-CN'),
      });

      if (decision === 'approved' && processedItem) {
        get()._applyApprovalItemToPricing(processedItem, effectiveDate, approvalId, approvalTitle);
      }
    }
  },

  _applyApprovalItemToPricing: (
    item: ApprovalItem,
    effectiveDate: string,
    approvalId: string,
    approvalTitle: string
  ) => {
    const today = dayjs();
    const effDate = dayjs(effectiveDate);
    const isEffective = !effDate.isAfter(today);

    set((state) => {
      const newBranchPricing = { ...state.branchPricing };

      item.affectedBranches.forEach((branchId) => {
        const branch = state.branches.find((b) => b.id === branchId);
        if (!branch) return;

        const entries = [...(newBranchPricing[branchId] || [])];

        if (item.pricingChanges && item.pricingChanges.length > 0) {
          item.pricingChanges.forEach((pc) => {
            const idx = entries.findIndex(
              (e) =>
                e.projectId === item.projectId &&
                e.cityTier === pc.cityTier &&
                e.storeLevel === pc.storeLevel &&
                e.doctorLevel === pc.doctorLevel
            );

            if (idx >= 0) {
              if (isEffective) {
                entries[idx] = {
                  ...entries[idx],
                  currentPrice: pc.newPrice,
                  upcomingPrice: undefined,
                  upcomingEffectiveDate: undefined,
                  source: 'approval',
                  approvalId,
                };
              } else {
                entries[idx] = {
                  ...entries[idx],
                  upcomingPrice: pc.newPrice,
                  upcomingEffectiveDate: effectiveDate,
                  source: entries[idx].source,
                  approvalId,
                };
              }
            } else {
              const newEntry: BranchPricingEntry = {
                projectId: item.projectId,
                cityTier: pc.cityTier,
                storeLevel: pc.storeLevel,
                doctorLevel: pc.doctorLevel,
                currentPrice: isEffective ? pc.newPrice : pc.oldPrice,
                upcomingPrice: isEffective ? undefined : pc.newPrice,
                upcomingEffectiveDate: isEffective ? undefined : effectiveDate,
                source: 'approval',
                approvalId,
              };
              entries.push(newEntry);
            }
          });
        } else {
          DOCTOR_LEVELS.forEach((dl) => {
            const idx = entries.findIndex(
              (e) =>
                e.projectId === item.projectId &&
                e.cityTier === branch.cityTier &&
                e.storeLevel === branch.level &&
                e.doctorLevel === dl
            );

            const ratio = dl === 'director' ? 1.25 : dl === 'senior' ? 1.1 : dl === 'attending' ? 1.0 : 0.9;
            const doctorPrice = Math.max(Math.round((item.newPrice * ratio) / 100) * 100, item.floorPrice);

            if (idx >= 0) {
              if (isEffective) {
                entries[idx] = {
                  ...entries[idx],
                  currentPrice: doctorPrice,
                  upcomingPrice: undefined,
                  upcomingEffectiveDate: undefined,
                  source: 'approval',
                  approvalId,
                };
              } else {
                entries[idx] = {
                  ...entries[idx],
                  upcomingPrice: doctorPrice,
                  upcomingEffectiveDate: effectiveDate,
                  approvalId,
                };
              }
            }
          });
        }

        newBranchPricing[branchId] = entries;
      });

      return { branchPricing: newBranchPricing };
    });

    const project = get().getProjectById(item.projectId);
    const cityTierLabels: Record<string, string> = { tier1: '一线城市', tier2: '二线城市', tier3: '三线城市' };
    const storeLevelLabels: Record<string, string> = { flagship: '旗舰店', standard: '标准店', community: '社区店' };
    const doctorLevelLabels: Record<string, string> = {
      director: '院长级',
      senior: '主任医师',
      attending: '主治医师',
      junior: '执业医师',
    };

    item.affectedBranches.forEach((branchId) => {
      const branch = get().getBranchById(branchId);
      if (!branch) return;

      if (item.pricingChanges && item.pricingChanges.length > 0) {
        item.pricingChanges.forEach((pc) => {
          const targetName = `${branch.name} · ${project?.name || item.projectName} · ${cityTierLabels[pc.cityTier] || pc.cityTier} · ${storeLevelLabels[pc.storeLevel] || pc.storeLevel} · ${doctorLevelLabels[pc.doctorLevel] || pc.doctorLevel}`;
          get().addChangeLog({
            operator: get().currentUser?.name || '系统',
            role: get().currentUser?.role || 'finance',
            action: 'approve',
            module: 'price',
            targetId: `${approvalId}-${item.id}-${pc.cityTier}-${pc.storeLevel}-${pc.doctorLevel}`,
            targetName,
            oldValue: pc.oldPrice,
            newValue: pc.newPrice,
            affectedBranches: [branchId],
            affectedBranchesCount: 1,
            timestamp: new Date().toLocaleString('zh-CN'),
          });
        });
      } else {
        const targetName = `${branch.name} · ${project?.name || item.projectName} · ${cityTierLabels[branch.cityTier] || branch.cityTier} · ${storeLevelLabels[branch.level] || branch.level} · 全职级`;
        get().addChangeLog({
          operator: get().currentUser?.name || '系统',
          role: get().currentUser?.role || 'finance',
          action: 'approve',
          module: 'price',
          targetId: `${approvalId}-${item.id}-${branchId}`,
          targetName,
          oldValue: item.oldPrice,
          newValue: item.newPrice,
          affectedBranches: [branchId],
          affectedBranchesCount: 1,
          timestamp: new Date().toLocaleString('zh-CN'),
        });
      }
    });
  },

  approveItem: (approvalId, itemId, annotation) => {
    get().decideApprovalItem(approvalId, itemId, 'approved', annotation);
  },
  rejectItem: (approvalId, itemId, annotation) => {
    get().decideApprovalItem(approvalId, itemId, 'rejected', annotation);
  },
  revokeItem: (approvalId, itemId) => {
    get().decideApprovalItem(approvalId, itemId, 'pending');
  },
  batchApproveItems: (approvalId, itemIds, annotations) => {
    itemIds.forEach((itemId) => {
      get().decideApprovalItem(approvalId, itemId, 'approved', annotations?.[itemId]);
    });
  },
  batchRejectItems: (approvalId, itemIds, annotations) => {
    itemIds.forEach((itemId) => {
      get().decideApprovalItem(approvalId, itemId, 'rejected', annotations?.[itemId]);
    });
  },

  addChangeLog: (log) => {
    const newLog: ChangeLog = {
      ...log,
      id: 'cl' + Date.now().toString(36),
    };
    set((state) => ({ changeLogs: [newLog, ...state.changeLogs] }));
  },

  activateUpcomingPrices: () => {
    const now = Date.now();
    if (now - get()._lastActivateRun < 10000) {
      return;
    }
    set({ _lastActivateRun: now });

    const today = dayjs();
    let hasChanges = false;
    const activatedEntries: Array<{
      branchId: string;
      projectId: string;
      oldPrice: number;
      newPrice: number;
      doctorLevel: string;
      cityTier: string;
      storeLevel: string;
    }> = [];

    set((state) => {
      const newBranchPricing: Record<string, BranchPricingEntry[]> = {};

      Object.entries(state.branchPricing).forEach(([branchId, entries]) => {
        const newEntries = entries.map((e) => {
          if (e.upcomingPrice !== undefined && e.upcomingEffectiveDate && !dayjs(e.upcomingEffectiveDate).isAfter(today)) {
            hasChanges = true;
            activatedEntries.push({
              branchId,
              projectId: e.projectId,
              oldPrice: e.currentPrice,
              newPrice: e.upcomingPrice,
              doctorLevel: e.doctorLevel,
              cityTier: e.cityTier,
              storeLevel: e.storeLevel,
            });
            return {
              ...e,
              currentPrice: e.upcomingPrice,
              upcomingPrice: undefined,
              upcomingEffectiveDate: undefined,
            };
          }
          return e;
        });
        newBranchPricing[branchId] = newEntries;
      });

      return hasChanges ? { branchPricing: newBranchPricing } : {};
    });

    if (hasChanges && activatedEntries.length > 0) {
      const cityTierLabels: Record<string, string> = { tier1: '一线城市', tier2: '二线城市', tier3: '三线城市' };
      const storeLevelLabels: Record<string, string> = { flagship: '旗舰店', standard: '标准店', community: '社区店' };
      const doctorLevelLabels: Record<string, string> = {
        director: '院长级',
        senior: '主任医师',
        attending: '主治医师',
        junior: '执业医师',
      };

      activatedEntries.forEach((ae) => {
        const branch = get().getBranchById(ae.branchId);
        const project = get().getProjectById(ae.projectId);
        const targetName = `${branch?.name || ae.branchId} · ${project?.name || ae.projectId} · ${cityTierLabels[ae.cityTier] || ae.cityTier} · ${storeLevelLabels[ae.storeLevel] || ae.storeLevel} · ${doctorLevelLabels[ae.doctorLevel] || ae.doctorLevel}`;
        get().addChangeLog({
          operator: '系统',
          role: 'hq-admin',
          action: 'publish',
          module: 'price',
          targetId: `${ae.branchId}-${ae.projectId}-${ae.cityTier}-${ae.storeLevel}-${ae.doctorLevel}`,
          targetName: `${targetName} 到期自动生效`,
          oldValue: ae.oldPrice,
          newValue: ae.newPrice,
          affectedBranches: [ae.branchId],
          affectedBranchesCount: 1,
          timestamp: new Date().toLocaleString('zh-CN'),
        });
      });
    }
  },

  getBranchById: (id) => get().branches.find((b) => b.id === id),
  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getProjectPriceForBranch: (projectId, branchId, versionId, doctorLevel = 'attending') => {
    get().activateUpcomingPrices();

    const branch = get().branches.find((b) => b.id === branchId);
    const project = get().projects.find((p) => p.id === projectId);
    if (!branch || !project) {
      return { currentPrice: 0, isUpcoming: false };
    }

    const entries = get().branchPricing[branchId] || [];
    const match = entries.find(
      (e) => e.projectId === projectId && e.doctorLevel === doctorLevel
    );

    if (!match) {
      const vid = versionId || get().priceVersions.find((v) => v.status === 'effective')?.id;
      const version = get().priceVersions.find((v) => v.id === vid);
      const pricing = version?.pricing?.[projectId];
      const matrixMatch = pricing?.find(
        (e) => e.cityTier === branch.cityTier && e.storeLevel === branch.level && e.doctorLevel === doctorLevel
      );
      return {
        currentPrice: matrixMatch?.price || project.basePrice,
        isUpcoming: false,
      };
    }

    if (match.upcomingPrice !== undefined && match.upcomingEffectiveDate) {
      return {
        currentPrice: match.currentPrice,
        upcomingPrice: match.upcomingPrice,
        upcomingDate: match.upcomingEffectiveDate,
        isUpcoming: true,
      };
    }

    return { currentPrice: match.currentPrice, isUpcoming: false };
  },

  getAccessibleBranches: () => {
    const user = get().currentUser;
    if (!user) return [];
    if (user.role === 'store-manager' && user.branchId) {
      return get().branches.filter((b) => b.id === user.branchId);
    }
    return get().branches;
  },

  getPriceByDimension: (versionId, projectId, cityTier, storeLevel, doctorLevel) => {
    get().activateUpcomingPrices();

    const version = get().priceVersions.find((v) => v.id === versionId);
    if (version?.status === 'effective') {
      const matchingBranch = get().branches.find(
        (b) => b.cityTier === cityTier && b.level === storeLevel
      );
      if (matchingBranch) {
        const entries = get().branchPricing[matchingBranch.id] || [];
        const match = entries.find(
          (e) => e.projectId === projectId && e.doctorLevel === doctorLevel
        );
        if (match) return match.currentPrice;
      }
    }

    const pricing = version?.pricing?.[projectId];
    const match = pricing?.find(
      (e) => e.cityTier === cityTier && e.storeLevel === storeLevel && e.doctorLevel === doctorLevel
    );
    return match?.price;
  },

  getDimensionPriceDetail: (branchId, projectId, doctorLevel) => {
    get().activateUpcomingPrices();
    const entries = get().branchPricing[branchId] || [];
    const match = entries.find(
      (e) => e.projectId === projectId && e.doctorLevel === doctorLevel
    );
    if (!match) return undefined;
    return {
      currentPrice: match.currentPrice,
      upcomingPrice: match.upcomingPrice,
      upcomingDate: match.upcomingEffectiveDate,
    };
  },

  globalSearch: (keyword, limit = 20) => {
    if (!keyword.trim()) return [];

    const kw = keyword.toLowerCase();
    const user = get().currentUser;
    const isStoreManager = user?.role === 'store-manager';
    const userBranchId = user?.branchId;

    const results: SearchResult[] = [];

    get().projects.forEach((p) => {
      if (
        p.name.toLowerCase().includes(kw) ||
        p.materialBrand.toLowerCase().includes(kw) ||
        p.description?.toLowerCase().includes(kw)
      ) {
        if (!isStoreManager || (isStoreManager && userBranchId)) {
          results.push({
            type: 'project',
            id: p.id,
            title: p.name,
            subtitle: p.materialBrand,
            category: p.category,
            price: p.basePrice,
            route: `/projects?search=${encodeURIComponent(keyword)}&highlightId=${p.id}`,
            highlight: keyword,
            filters: { search: keyword, highlightId: p.id },
          });
        }
      }
    });

    get().branches.forEach((b) => {
      if (isStoreManager && b.id !== userBranchId) return;
      if (b.name.toLowerCase().includes(kw) || b.city.toLowerCase().includes(kw) || b.address.toLowerCase().includes(kw)) {
        results.push({
          type: 'branch',
          id: b.id,
          title: b.name,
          subtitle: `${b.city} · ${b.address}`,
          branchName: b.name,
          route: `/branches?branchId=${b.id}`,
          highlight: keyword,
          filters: { branchId: b.id },
        });
      }
    });

    get().priceVersions.forEach((v) => {
      if (v.name.toLowerCase().includes(kw) || v.description?.toLowerCase().includes(kw)) {
        results.push({
          type: 'version',
          id: v.id,
          title: v.name,
          subtitle: `${v.type} · ${v.status}`,
          route: `/price-versions/${v.id}`,
          highlight: keyword,
          filters: { versionId: v.id },
        });
      }
    });

    if (isStoreManager && userBranchId) {
      const branch = get().branches.find((b) => b.id === userBranchId);
      if (branch) {
        branch.priceOverrides.forEach((ov) => {
          const project = get().projects.find((p) => p.id === ov.projectId);
          if (project && (project.name.toLowerCase().includes(kw) || project.materialBrand.toLowerCase().includes(kw))) {
            results.push({
              type: 'price',
              id: `${userBranchId}-${ov.projectId}`,
              title: project.name,
              subtitle: `${branch.name} 差异价`,
              price: ov.customPrice,
              branchName: branch.name,
              route: `/price-preview?branchId=${userBranchId}&projectId=${ov.projectId}`,
              highlight: keyword,
              filters: { branchId: userBranchId, projectId: ov.projectId },
            });
          }
        });
      }
    } else {
      get().projects.forEach((p) => {
        if (p.name.toLowerCase().includes(kw) || p.materialBrand.toLowerCase().includes(kw)) {
          const hasOverride = get().branches.some((b) =>
            b.priceOverrides.some((o) => o.projectId === p.id)
          );
          if (hasOverride) {
            results.push({
              type: 'price',
              id: `price-${p.id}`,
              title: p.name,
              subtitle: '多院区差异价',
              price: p.basePrice,
              route: `/price-preview?projectId=${p.id}`,
              highlight: keyword,
              filters: { projectId: p.id },
            });
          }
        }
      });
    }

    return results.slice(0, limit);
  },
}));
