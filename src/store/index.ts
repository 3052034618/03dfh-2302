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
  ChangeLog,
  UserRole,
  ApprovalStatus,
  PricingEntry,
} from '@/types';

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

  submitApproval: (approval: Omit<Approval, 'id' | 'status' | 'submittedAt'>) => void;
  decideApproval: (id: string, decision: ApprovalStatus, comments?: string, annotations?: Record<string, string>) => void;

  addChangeLog: (log: Omit<ChangeLog, 'id'>) => void;

  getBranchById: (id: string) => Branch | undefined;
  getProjectById: (id: string) => Project | undefined;
  getProjectPriceForBranch: (projectId: string, branchId: string, versionId?: string) => number;
  getAccessibleBranches: () => Branch[];
  getPriceByDimension: (versionId: string, projectId: string, cityTier: string, storeLevel: string, doctorLevel: string) => number | undefined;
}

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
    set((state) => ({
      priceVersions: state.priceVersions.map((v) =>
        v.id === versionId ? { ...v, pricing: { ...v.pricing, [projectId]: pricing } } : v
      ),
    }));
  },

  updateBranchOverride: (branchId, overrides) => {
    set((state) => ({
      branches: state.branches.map((b) => (b.id === branchId ? { ...b, priceOverrides: overrides } : b)),
    }));
    const branch = get().branches.find((b) => b.id === branchId);
    if (branch) {
      get().addChangeLog({
        operator: get().currentUser?.name || '系统',
        role: get().currentUser?.role || 'hq-admin',
        action: 'update',
        module: 'branch',
        targetId: branchId,
        targetName: branch.name,
        oldValue: null,
        newValue: { overridesCount: overrides.length },
        affectedBranches: [branchId],
        affectedBranchesCount: 1,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    }
  },

  submitApproval: (approval) => {
    const newApproval: Approval = {
      ...approval,
      id: 'ap' + Date.now().toString(36),
      status: 'pending',
      submittedAt: new Date().toLocaleString('zh-CN'),
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
        const newItems = annotations
          ? a.items.map((item) => ({
              ...item,
              annotation: annotations[item.id] || item.annotation,
            }))
          : a.items;
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
        const effectiveVersions = get().priceVersions.filter((v) => v.status === 'effective');
        effectiveVersions.forEach((v) => {
          if (v.status !== 'effective') return;
        });
        set((s) => ({
          priceVersions: s.priceVersions.map((v) => {
            if (v.status === 'effective' && approval.items.length > 0) {
              const newPricing = { ...v.pricing };
              approval.items.forEach((item) => {
                if (newPricing[item.projectId]) {
                  newPricing[item.projectId] = newPricing[item.projectId].map((entry) => {
                    if (entry.cityTier === 'tier1' && entry.storeLevel === 'flagship' && entry.doctorLevel === 'attending') {
                      return { ...entry, price: item.newPrice };
                    }
                    return entry;
                  });
                }
              });
              return { ...v, pricing: newPricing };
            }
            return v;
          }),
        }));
      }
    }
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
    if (!branch || !project) return 0;

    const vid = versionId || get().priceVersions.find((v) => v.status === 'effective')?.id;
    const override = branch.priceOverrides.find((o) => o.projectId === projectId && o.versionId === vid);
    if (override) return override.customPrice;

    const version = get().priceVersions.find((v) => v.id === vid);
    const pricing = version?.pricing?.[projectId];
    if (pricing) {
      const match = pricing.find(
        (e) => e.cityTier === branch.cityTier && e.storeLevel === branch.level && e.doctorLevel === 'attending'
      );
      if (match) return match.price;
    }
    return project.basePrice;
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
}));
