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
} from '@/types';
import dayjs from 'dayjs';

export interface ProjectPriceResult {
  currentPrice: number;
  upcomingPrice?: number;
  upcomingDate?: string;
  isUpcoming: boolean;
}

interface SubmitApprovalItem extends Omit<ApprovalItem, 'status' | 'pricingChanges'> {
  status?: ApprovalItemStatus;
  pricingChanges?: PricingChangeDetail[];
}

interface SubmitApprovalPayload extends Omit<Approval, 'id' | 'status' | 'submittedAt' | 'items'> {
  items: SubmitApprovalItem[];
}

interface AppState {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  priceVersions: PriceVersion[];
  branches: Branch[];
  approvals: Approval[];
  changeLogs: ChangeLog[];

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

  getBranchById: (id: string) => Branch | undefined;
  getProjectById: (id: string) => Project | undefined;
  getProjectPriceForBranch: (projectId: string, branchId: string, versionId?: string) => ProjectPriceResult;
  getAccessibleBranches: () => Branch[];
  getPriceByDimension: (versionId: string, projectId: string, cityTier: string, storeLevel: string, doctorLevel: string) => number | undefined;

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
    set((state) => ({ projects: [newProject, ...state.projects] }));
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
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...project } : p)),
    }));
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
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
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

    set((state) => ({
      priceVersions: state.priceVersions.map((v) =>
        v.id === versionId ? { ...v, pricing: { ...v.pricing, [projectId]: pricing } } : v
      ),
    }));

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

    set((state) => ({
      branches: state.branches.map((b) => (b.id === branchId ? { ...b, priceOverrides: overrides } : b)),
    }));

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
    set((state) => ({
      branches: state.branches.map((b) => (b.id === branchId ? { ...b, upcomingOverrides: overrides } : b)),
    }));
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

      if (decision === 'approved') {
        approval.items.forEach((item) => {
          if (item.status === 'approved') {
            item.affectedBranches.forEach((branchId) => {
              const branch = get().branches.find((b) => b.id === branchId);
              if (branch) {
                const existingUpcoming = branch.upcomingOverrides || [];
                const newOverride: PriceOverride = {
                  projectId: item.projectId,
                  versionId: 'v1',
                  customPrice: item.newPrice,
                  effectiveDate: approval.effectiveDate,
                  note: approval.title,
                  isUpcoming: true,
                };
                const filtered = existingUpcoming.filter(
                  (o) => !(o.projectId === item.projectId && o.versionId === 'v1')
                );
                get().updateBranchUpcomingOverride(branchId, [...filtered, newOverride]);
              }
            });
          }
        });
      }
    }
  },

  decideApprovalItem: (approvalId, itemId, decision, annotation) => {
    set((state) => ({
      approvals: state.approvals.map((a) => {
        if (a.id !== approvalId) return a;
        const newItems = a.items.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            status: decision,
            annotation: annotation || item.annotation,
          };
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

      if (decision === 'approved') {
        item.affectedBranches.forEach((branchId) => {
          const branch = get().branches.find((b) => b.id === branchId);
          if (branch) {
            const existingUpcoming = branch.upcomingOverrides || [];
            const newOverride: PriceOverride = {
              projectId: item.projectId,
              versionId: 'v1',
              customPrice: item.newPrice,
              effectiveDate: approval.effectiveDate,
              note: approval.title,
              isUpcoming: true,
            };
            const filtered = existingUpcoming.filter(
              (o) => !(o.projectId === item.projectId && o.versionId === 'v1')
            );
            get().updateBranchUpcomingOverride(branchId, [...filtered, newOverride]);
          }
        });
      }
    }
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

  getBranchById: (id) => get().branches.find((b) => b.id === id),
  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getProjectPriceForBranch: (projectId, branchId, versionId) => {
    const branch = get().branches.find((b) => b.id === branchId);
    const project = get().projects.find((p) => p.id === projectId);
    if (!branch || !project) {
      return { currentPrice: 0, isUpcoming: false };
    }

    const vid = versionId || get().priceVersions.find((v) => v.status === 'effective')?.id;

    const override = branch.priceOverrides.find((o) => o.projectId === projectId && o.versionId === vid);
    let currentPrice = 0;
    if (override) {
      currentPrice = override.customPrice;
    } else {
      const version = get().priceVersions.find((v) => v.id === vid);
      const pricing = version?.pricing?.[projectId];
      if (pricing) {
        const match = pricing.find(
          (e) => e.cityTier === branch.cityTier && e.storeLevel === branch.level && e.doctorLevel === 'attending'
        );
        if (match) {
          currentPrice = match.price;
        }
      }
      if (!currentPrice) {
        currentPrice = project.basePrice;
      }
    }

    const upcomingOverride = branch.upcomingOverrides?.find(
      (o) => o.projectId === projectId && dayjs(o.effectiveDate).isAfter(dayjs())
    );

    if (upcomingOverride) {
      return {
        currentPrice,
        upcomingPrice: upcomingOverride.customPrice,
        upcomingDate: upcomingOverride.effectiveDate,
        isUpcoming: true,
      };
    }

    return { currentPrice, isUpcoming: false };
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
    const version = get().priceVersions.find((v) => v.id === versionId);
    const pricing = version?.pricing?.[projectId];
    const match = pricing?.find(
      (e) => e.cityTier === cityTier && e.storeLevel === storeLevel && e.doctorLevel === doctorLevel
    );
    return match?.price;
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
            route: `/projects/${p.id}`,
            highlight: keyword,
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
          route: `/branches/${b.id}`,
          highlight: keyword,
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
              route: `/price-preview?branchId=${userBranchId}`,
              highlight: keyword,
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
              route: `/branch-diff?projectId=${p.id}`,
              highlight: keyword,
            });
          }
        }
      });
    }

    return results.slice(0, limit);
  },
}));
