import { Card, Statistic, Row, Col, Progress, Tag, List, Avatar } from 'antd';
import {
  TrendingUp,
  Package,
  FileCheck2,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { USER_ROLE_LABELS, VERSION_STATUS_LABELS, VERSION_STATUS_COLORS } from '@/types';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@/types';

const roleSpecificCards: Record<UserRole, Array<{ title: string; value: string | number; sub?: string; icon: typeof TrendingUp; trend?: 'up' | 'down'; color: string }>> = {
  'hq-admin': [
    { title: '在管项目数', value: 12, icon: Package, color: 'from-blue-500 to-blue-600', trend: 'up', sub: '+2 本月新增' },
    { title: '生效价格版本', value: 1, icon: TrendingUp, color: 'from-brand-gold-400 to-brand-gold-600', sub: '共3个版本' },
    { title: '待审批变更', value: 1, icon: FileCheck2, color: 'from-orange-500 to-red-500', trend: 'up', sub: '1条待处理' },
    { title: '覆盖院区数', value: 10, icon: MapPin, color: 'from-emerald-500 to-teal-500', sub: '3城10院' },
  ],
  finance: [
    { title: '待审批事项', value: 1, icon: FileCheck2, color: 'from-orange-500 to-red-500', trend: 'up' },
    { title: '本月已审批', value: 1, icon: TrendingUp, color: 'from-emerald-500 to-teal-500', trend: 'up' },
    { title: '驳回率', value: '33%', icon: ArrowDownRight, color: 'from-purple-500 to-indigo-500' },
    { title: '涉及项目数', value: 6, icon: Package, color: 'from-blue-500 to-blue-600' },
  ],
  'store-manager': [
    { title: '本院在售项目', value: 12, icon: Package, color: 'from-blue-500 to-blue-600' },
    { title: '生效版本', value: 1, icon: TrendingUp, color: 'from-brand-gold-400 to-brand-gold-600' },
    { title: '本院差异价', value: 0, icon: MapPin, color: 'from-emerald-500 to-teal-500' },
    { title: '即将生效变更', value: 1, icon: Calendar, color: 'from-orange-500 to-red-500', trend: 'up' },
  ],
};

export default function Dashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const priceVersions = useAppStore((s) => s.priceVersions);
  const approvals = useAppStore((s) => s.approvals);
  const changeLogs = useAppStore((s) => s.changeLogs);
  const navigate = useNavigate();

  if (!currentUser) return null;

  const stats = roleSpecificCards[currentUser.role];
  const recentLogs = changeLogs.slice(0, 5);
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-navy-600">工作台首页</h1>
          <p className="text-slate-500 mt-1">
            欢迎回来，{currentUser.name} · {USER_ROLE_LABELS[currentUser.role]}
            {currentUser.branchName && <span className="text-brand-gold-600 ml-2">· {currentUser.branchName}</span>}
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <div>今日日期</div>
          <div className="font-semibold text-brand-navy-600">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Col xs={24} sm={12} lg={6} key={idx}>
              <Card className="!p-0 overflow-hidden !border-0 shadow-card hover:shadow-gold-md transition-all">
                <div className={`bg-gradient-to-br ${s.color} p-4 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-90">{s.title}</span>
                    <Icon className="w-5 h-5 opacity-80" />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="text-3xl font-bold font-display">{s.value}</div>
                    {s.trend && (
                      <span className="flex items-center gap-0.5 text-sm bg-white/20 rounded-full px-2 py-0.5">
                        {s.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>
                  {s.sub && <div className="text-xs mt-1 opacity-80">{s.sub}</div>}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="价格版本概览" className="!border-0 shadow-card" extra={<Tag color="gold">共 {priceVersions.length} 个版本</Tag>}>
            <div className="space-y-4">
              {priceVersions.map((v) => (
                <div key={v.id} className="p-4 rounded-xl border border-slate-100 hover:border-brand-gold-200 hover:bg-brand-gold-50/30 transition-all cursor-pointer" onClick={() => navigate('/versions')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-brand-navy-600">{v.name}</div>
                      <Tag color={VERSION_STATUS_COLORS[v.status]}>{VERSION_STATUS_LABELS[v.status]}</Tag>
                    </div>
                    <div className="text-sm text-slate-500">{Object.keys(v.pricing).length} 个项目</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-slate-500">有效期：{v.effectiveDate} ~ {v.expireDate}</div>
                    <div className="text-xs text-slate-400">创建人：{v.createdBy}</div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>项目配置完成度</span>
                      <span>{Object.keys(v.pricing).length}/12</span>
                    </div>
                    <Progress percent={Math.round((Object.keys(v.pricing).length / 12) * 100)} size="small" showInfo={false} strokeColor={{ from: '#C9A96E', to: '#8C7449' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10} className="space-y-4">
          {pendingApprovals.length > 0 && (
            <Card
              title="待我审批"
              className="!border-0 shadow-card"
              extra={<Tag color="red">{pendingApprovals.length} 条</Tag>}
            >
              <div className="space-y-3">
                {pendingApprovals.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 cursor-pointer transition-all" onClick={() => navigate('/approvals')}>
                    <div className="font-medium text-slate-800 text-sm">{a.title}</div>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>提交人：{a.submitter}</span>
                      <span>{a.items.length} 个调整项</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="最近变更" className="!border-0 shadow-card">
            <List
              dataSource={recentLogs}
              renderItem={(log) => (
                <List.Item className="!px-0 py-3 border-b-0 last:pb-0">
                  <List.Item.Meta
                    avatar={<Avatar size={36} style={{ backgroundColor: log.action === 'approve' ? '#12B76A' : log.action === 'reject' ? '#E5484D' : '#1B2A4A' }}>{log.operator[0]}</Avatar>}
                    title={<div className="text-sm font-medium text-slate-700">{log.targetName}</div>}
                    description={
                      <div className="text-xs space-x-2">
                        <span className="text-slate-500">{log.operator}</span>
                        <Tag className="!m-0" color={log.action === 'approve' ? 'green' : log.action === 'reject' ? 'red' : 'blue'}>
                          {log.action === 'create' ? '新增' : log.action === 'update' ? '修改' : log.action === 'approve' ? '通过' : log.action === 'reject' ? '驳回' : '发布'}
                        </Tag>
                        <span className="text-slate-400">{log.timestamp}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
