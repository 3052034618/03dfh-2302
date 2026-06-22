import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Form, Input, message } from 'antd';
import { User, Lock, Building2, ShieldCheck, Store, Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store';
import type { UserRole } from '@/types';
import { USER_ROLE_LABELS } from '@/types';

const roleOptions: Array<{
  role: UserRole;
  icon: typeof Building2;
  title: string;
  desc: string;
  features: string[];
}> = [
  {
    role: 'hq-admin',
    icon: Building2,
    title: USER_ROLE_LABELS['hq-admin'],
    desc: '集团总部，全权管理价格体系',
    features: ['项目库维护', '价格版本发布', '全院区差异配置'],
  },
  {
    role: 'finance',
    icon: ShieldCheck,
    title: USER_ROLE_LABELS['finance'],
    desc: '财务审核，把控价格合规与毛利',
    features: ['审批价格变更', '毛利分析', '驳回不合理定价'],
  },
  {
    role: 'store-manager',
    icon: Store,
    title: USER_ROLE_LABELS['store-manager'],
    desc: '院区店长，查看本院执行价目表',
    features: ['查看工作台数据', '浏览价目表', '本院价格预览'],
  },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('hq-admin');
  const [loading, setLoading] = useState(false);
  const login = useAppStore((s) => s.login);
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const user = useAppStore.getState().users.find((u) => u.role === role);
    if (user) {
      form.setFieldsValue({
        username: user.name,
        password: 'demo123',
      });
    }
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      login(selectedRole);
      const user = useAppStore.getState().currentUser;
      message.success(`欢迎回来，${user?.name}！已切换至${USER_ROLE_LABELS[selectedRole]}视图`);
      setLoading(false);
      navigate(from, { replace: true });
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex bg-navy-gradient">
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-brand-gold-500 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-brand-gold-400 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-gold-500 flex items-center justify-center shadow-gold-lg">
              <Sparkles className="w-7 h-7 text-brand-navy-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display tracking-wide">医美价格工作台</h1>
              <p className="text-slate-400 text-sm mt-0.5">Aesthetic Medical Pricing Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold font-display leading-tight mb-6">
            智能定价
            <br />
            <span className="text-transparent bg-clip-text bg-gold-gradient">精准管控 · 高效协同</span>
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-10">
            从项目库到价目表，从总部到院区，一套系统搞定全链路价格管理。
            三维定价矩阵、智能审批流、实时变更追踪，让每一分钱都清晰可控。
          </p>

          <div className="grid grid-cols-3 gap-6">
            {[
              { num: '3', label: '角色协同' },
              { num: '10+', label: '院区覆盖' },
              { num: '99%', label: '毛利精准' },
            ].map((s) => (
              <div key={s.label} className="border-l-2 border-brand-gold-500/50 pl-4">
                <div className="text-3xl font-bold text-brand-gold-400 font-display">{s.num}</div>
                <div className="text-slate-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">
          © 2026 医美价格工作台 · 演示系统
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-navy-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-gold-400" />
            </div>
            <h1 className="text-xl font-bold font-display text-brand-navy-600">医美价格工作台</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold font-display text-brand-navy-600 mb-2">账号登录</h2>
            <p className="text-slate-500">选择角色，一键体验不同视角的工作台</p>
          </div>

          <div className="space-y-3 mb-8">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const active = selectedRole === opt.role;
              return (
                <button
                  key={opt.role}
                  onClick={() => handleRoleSelect(opt.role)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
                    active
                      ? 'border-brand-gold-500 bg-brand-gold-50 shadow-gold-sm'
                      : 'border-slate-200 bg-white hover:border-brand-navy-200 hover:shadow-card'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        active ? 'bg-brand-navy-500 text-brand-gold-400' : 'bg-slate-100 text-slate-500 group-hover:bg-brand-navy-100 group-hover:text-brand-navy-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${active ? 'text-brand-navy-600' : 'text-slate-800'}`}>
                          {opt.title}
                        </h3>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            active ? 'border-brand-gold-500 bg-brand-gold-500' : 'border-slate-300'
                          }`}
                        >
                          {active && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${active ? 'text-brand-navy-500' : 'text-slate-500'}`}>
                        {opt.desc}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {opt.features.map((f) => (
                          <span
                            key={f}
                            className={`text-xs px-2 py-0.5 rounded-md ${
                              active
                                ? 'bg-brand-gold-500/20 text-brand-gold-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-5">
            <Form.Item
              label="账号"
              name="username"
              rules={[{ required: true, message: '请输入账号' }]}
              initialValue="李雅琴"
            >
              <Input
                prefix={<User className="w-4 h-4 text-slate-400" />}
                placeholder="请输入用户名"
                size="large"
                className="input-field !py-1"
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
              initialValue="demo123"
            >
              <Input.Password
                prefix={<Lock className="w-4 h-4 text-slate-400" />}
                placeholder="请输入密码（演示系统任意密码）"
                size="large"
                className="input-field !py-1"
              />
            </Form.Item>

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3 text-base gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  进入工作台
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </Form>

          <div className="mt-8 p-4 rounded-xl bg-brand-navy-500/5 border border-brand-navy-500/10">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-brand-navy-500">演示提示：</span>
              选择上方角色可自动填充账号，点击「进入工作台」即可体验不同角色的权限视图。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
