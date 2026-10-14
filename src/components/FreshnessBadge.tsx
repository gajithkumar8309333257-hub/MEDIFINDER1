import React, { useState, useEffect } from 'react';
import { evaluateFreshness } from '../lib/freshness';
import { useTranslation } from '../i18n';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface FreshnessBadgeProps {
  verifiedAt?: string | null;
  updatedAt?: string;
  showWarningIfStale?: boolean;
}

export const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({
  verifiedAt,
  updatedAt,
  showWarningIfStale = true,
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(new Date());

  // Periodically re-evaluate freshness every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const evalResult = evaluateFreshness(verifiedAt || updatedAt, now);

  const getStyle = () => {
    switch (evalResult.status) {
      case 'recent':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle,
        };
      case 'aging':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Clock,
        };
      case 'stale':
      default:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertCircle,
        };
    }
  };

  const config = getStyle();
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${config.bg}`}
      >
        <Icon className="w-3 h-3" />
        <span>{evalResult.displayLabel}</span>
      </div>

      {showWarningIfStale && evalResult.isStale && (
        <div className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50/80 px-2 py-1 rounded border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
          <span>{t('stale_warning')}</span>
        </div>
      )}
    </div>
  );
};
