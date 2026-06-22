import { Card, Typography } from 'antd';
import { Wrench } from 'lucide-react';

const { Title, Paragraph } = Typography;

interface PlaceholderProps {
  title: string;
  description?: string;
}

export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-brand-navy-600">{title}</h1>
        {description && <p className="text-slate-500 mt-1">{description}</p>}
      </div>
      <Card className="!border-0 shadow-card">
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-brand-gold-500/10 flex items-center justify-center mb-6">
            <Wrench className="w-10 h-10 text-brand-gold-500" />
          </div>
          <Title level={3} className="!text-brand-navy-600 !mb-2">
            {title} - 开发中
          </Title>
          <Paragraph className="!text-slate-500 !max-w-md !mb-0">
            该模块正在紧张开发中，敬请期待。您可以继续体验其他已完成的功能模块。
          </Paragraph>
        </div>
      </Card>
    </div>
  );
}
