import React from 'react';
import { Crown, Shield, Eye } from 'lucide-react';
import type { Role } from '../../types';

interface RoleBadgeProps {
  role: Role | string;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const isSm = size === 'sm';

  switch (role) {
    case 'host':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs tracking-wide'
          }`}
        >
          <Crown className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          HOST
        </span>
      );
    case 'moderator':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs tracking-wide'
          }`}
        >
          <Shield className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          MOD
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-normal rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'
          }`}
        >
          <Eye className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          VIEWER
        </span>
      );
  }
};
