import React from 'react';
import { CrowdLevel, CrowdSourceType } from '../types';
import { useTranslation } from '../i18n';
import { Users, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface CrowdBadgeProps {
  level: CrowdLevel;
  waitingCount?: number;
  source?: CrowdSourceType;
  showDetails?: boolean;
}

export const CrowdBadge: React.FC<CrowdBadgeProps> = ({
  level,
  waitingCount,
  source = 'queue_system',
  showDetails = false,
}) => {
  const { t } = useTranslation();

  const getBadgeStyle = () => {
    switch (level) {
      case 'low':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: t('crowd_low'),
          icon: CheckCircle2,
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: t('crowd_moderate'),
          icon: Users,
        };
      case 'high':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: t('crowd_high'),
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: t('crowd_unknown'),
          icon: Info,
        };
    }
  };

  const config = getBadgeStyle();
  const Icon = config.icon;

  const getSourceDescription = () => {
    switch (source) {
      case 'queue_system':
        return t('source_queue');
      case 'appointment_counts':
        return t('source_appointments');
      case 'staff_update':
        return t('source_staff');
      case 'demo_simulation':
      default:
        return t('source_demo');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} shadow-2xs`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label}</span>
        {waitingCount !== undefined && (
          <span className="font-normal opacity-90">({waitingCount} in queue)</span>
        )}
      </div>

      {showDetails && (
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          {getSourceDescription()}
        </span>
      )}
    </div>
  );
};
