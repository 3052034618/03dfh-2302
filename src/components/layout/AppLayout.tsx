import { useState } from 'react';
import {
  Outlet,
  NavLink,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Tags,
  MapPin,
  FileCheck2,
  History,
  Eye,
  Sparkles,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Building2,
  ShieldCheck,
  Store,
  Bell,
} from 'lucide-react';
import { Dropdown, Avatar, Badge, Tooltip, Modal } from 'antd';
import GlobalSearch from '@/components/GlobalSearch';
import type { MenuProps } from 'antd';
import { useAppStore } from '@/store';
import type { UserRole } from '@/types';
import { USER_ROLE_LABELS } from '@/types';

interface MenuItem {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: '工作台首页',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['hq-admin', 'finance', 'store-manager'],
  },
  {
    key: 'projects',
    label: '项目库',
    icon: FolderKanban,
    path: '/projects',
    roles: ['hq-admin'],
  },
  {
    key: 'versions',
    label: '价格版本',
    icon: Tags,
    path: '/versions',
    roles: ['hq-admin'],
  },
  {
    key: 'branches',
    label: '院区差异',
    icon: MapPin,
    path: '/branches',
    roles: ['hq-admin'],
  },
  {
    key: 'approvals',
    label: '审批中心',
    icon: FileCheck2,
    path: '/approvals',
    roles: ['hq-admin', 'finance'],
  },
  {
    key: 'changelogs',
    label: '变更日志',
    icon: History,
    path: '/changelogs',
    roles: ['hq-admin', 'finance'],
  },
  {
    key: 'preview',
    label: '价目表预览',
    icon: Eye,
    path: '/preview',
    roles: ['hq-admin', 'finance', 'store-manager'],
  },
];

const roleSwitchOptions: Array<{
  role: UserRole;
  icon: typeof Building2;
  label: string;
}> = [
  { role: 'hq-admin', icon: Building2, label: USER_ROLE_LABELS['hq-admin'] },
  { role: 'finance', icon: ShieldCheck, label: USER_ROLE_LABELS['finance'] },
  { role: 'store-manager', icon: Store, label: USER_ROLE_LABELS['store-manager'] },
];

const breadcrumbMap: Record<string, string[]> = {
  '/dashboard': ['工作台首页'],
  '/projects': ['项目库'],
  '/projects/new': ['项目库', '新增项目'],
  '/versions': ['价格版本'],
  '/versions/new': ['价格版本', '新建版本'],
  '/branches': ['院区差异'],
  '/approvals': ['审批中心'],
  '/changelogs': ['变更日志'],
  '/preview': ['价目表预览'],
};

export default function AppLayout() {
  const currentUser = useAppStore((s) => s.currentUser);
  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const approvals = useAppStore((s) => s.approvals);
  const navigate = useNavigate();
  const location = useLocation();
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const accessibleMenus = menuItems.filter((m) => m.roles.includes(currentUser.role));
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const breadcrumb = breadcrumbMap[location.pathname] || ['工作台首页'];

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录？',
      content: '退出后需要重新登录才能访问系统',
      okText: '确认退出',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        logout();
        navigate('/login', { replace: true });
      },
    });
  };

  const handleRoleSwitch = (role: UserRole) => {
    setRoleModalOpen(false);
    login(role);
    const firstMenu = menuItems.find((m) => m.roles.includes(role));
    if (firstMenu) {
      navigate(firstMenu.path, { replace: true });
    }
  };

  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <User className="w-4 h-4" />,
      label: '个人信息',
      onClick: () => {},
    },
    {
      key: 'switch',
      icon: <ChevronRight className="w-4 h-4" />,
      label: '切换角色',
      onClick: () => setRoleModalOpen(true),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOut className="w-4 h-4" />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-60 bg-navy-gradient flex flex-col text-white flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-gold-500 flex items-center justify-center shadow-gold-md">
              <Sparkles className="w-5 h-5 text-brand-navy-900" />
            </div>
            <div>
              <div className="font-bold font-display text-base leading-tight">价格工作台</div>
              <div className="text-[10px] text-slate-400 tracking-wider uppercase">Pricing Platform</div>
            </div>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {accessibleMenus.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''}`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.key === 'approvals' && pendingCount > 0 && (
                  <Badge
                    count={pendingCount}
                    size="small"
                    classNames={{ root: 'flex-shrink-0' }}
                    color="#E5484D"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div
            className="p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => setRoleModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={currentUser.avatar}
                size={36}
                className="flex-shrink-0 ring-2 ring-brand-gold-500/50"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{currentUser.name}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="text-brand-gold-400">●</span>
                  {USER_ROLE_LABELS[currentUser.role]}
                  {currentUser.branchName && (
                    <span className="truncate">· {currentUser.branchName}</span>
                  )}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-6 flex-shrink-0">
          <nav className="flex items-center gap-1.5 text-sm flex-shrink-0">
            <span className="text-slate-400">首页</span>
            {breadcrumb.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span
                  className={
                    idx === breadcrumb.length - 1
                      ? 'text-brand-navy-600 font-semibold'
                      : 'text-slate-500'
                  }
                >
                  {item}
                </span>
              </span>
            ))}
          </nav>

          <div className="flex-1 max-w-md mx-auto">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3">
            <Tooltip title="消息通知">
              <Badge count={pendingCount} size="small" offset={[-2, 2]}>
                <button className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-brand-navy-500 transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
              </Badge>
            </Tooltip>

            <button
              onClick={() => setRoleModalOpen(true)}
              className="h-9 px-3 rounded-lg border border-brand-gold-500/30 bg-brand-gold-500/10 text-brand-gold-600 text-xs font-medium hover:bg-brand-gold-500/20 transition-colors flex items-center gap-1.5"
            >
              <span>切换角色</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" trigger={['click']}>
              <button className="flex items-center gap-2.5 hover:bg-slate-100 rounded-lg px-2 py-1.5 transition-colors">
                <Avatar src={currentUser.avatar} size={32} />
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-semibold text-brand-navy-600 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {USER_ROLE_LABELS[currentUser.role]}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <Modal
        title="切换角色"
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        footer={null}
        width={480}
      >
        <p className="text-slate-500 text-sm mb-5">
          切换角色将以不同权限视角重新进入工作台，当前操作不会被保存
        </p>
        <div className="space-y-3">
          {roleSwitchOptions.map((opt) => {
            const Icon = opt.icon;
            const isCurrent = currentUser.role === opt.role;
            return (
              <button
                key={opt.role}
                disabled={isCurrent}
                onClick={() => handleRoleSwitch(opt.role)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  isCurrent
                    ? 'border-brand-gold-500 bg-brand-gold-50 cursor-default'
                    : 'border-slate-200 hover:border-brand-navy-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isCurrent ? 'bg-brand-navy-500 text-brand-gold-400' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${isCurrent ? 'text-brand-navy-600' : 'text-slate-800'}`}>
                    {opt.label}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {opt.role === 'hq-admin' && '拥有全部功能权限，负责价格体系管理'}
                    {opt.role === 'finance' && '负责价格审批与毛利审核'}
                    {opt.role === 'store-manager' && '查看院区数据与价目表预览'}
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-gold-500 text-white">
                    当前
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
