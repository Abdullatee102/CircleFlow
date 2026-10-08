import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatAddress, formatCFT } from '../../config/contracts';
import { MemberInfoData } from '../../hooks/useCircleFlow';
import { CheckCircle2, Clock, ShieldAlert, UserCheck, ShieldCheck } from 'lucide-react';

interface MemberListProps {
  members: Array<{
    address: `0x${string}`;
    info?: MemberInfoData;
    hasContributedCurrentRound?: boolean;
    isLate?: boolean;
    isDefaulted?: boolean;
  }>;
  currentRoundNumber?: bigint;
  userAddress?: `0x${string}`;
  payoutRecipient?: `0x${string}`;
  onAction?: (addr: `0x${string}`) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentRoundNumber,
  userAddress,
  payoutRecipient,
}) => {
  const memberStatusLabels: Record<number, { text: string; variant: 'brand' | 'yellow' | 'red' | 'gray' | 'purple' | 'blue' }> = {
    0: { text: 'None', variant: 'gray' },
    1: { text: 'Joined', variant: 'blue' },
    2: { text: 'Active', variant: 'brand' },
    3: { text: 'Late', variant: 'yellow' },
    4: { text: 'Defaulted', variant: 'red' },
    5: { text: 'Resolved', variant: 'purple' },
    6: { text: 'Removed', variant: 'gray' },
    7: { text: 'Completed', variant: 'brand' },
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
        <h3 className="font-bold text-slate-100 text-sm">Circle Members ({members.length})</h3>
        <span className="text-xs text-slate-400">Position & Payment Status</span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {members.map((m, index) => {
          const isCurrentUser = userAddress && m.address.toLowerCase() === userAddress.toLowerCase();
          const isRecipient = payoutRecipient && m.address.toLowerCase() === payoutRecipient.toLowerCase();
          const status = m.info ? memberStatusLabels[m.info.status] || { text: 'Unknown', variant: 'gray' } : { text: 'Joined', variant: 'blue' };

          return (
            <div
              key={m.address}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                isCurrentUser ? 'bg-emerald-500/5' : 'hover:bg-slate-900/40'
              }`}
            >
              {/* Member details */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 font-mono border border-slate-700">
                  {m.info?.assignedPosition ? `#${m.info.assignedPosition.toString()}` : `#${index + 1}`}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-200">
                      {formatAddress(m.address)}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded">
                        You
                      </span>
                    )}
                    {isRecipient && (
                      <span className="text-[10px] font-bold bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded">
                        Round Recipient
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>
                      Collateral: <strong className="text-slate-300">{formatCFT(m.info?.reserveCommitted)}</strong>
                    </span>
                    {m.info && m.info.reserveUsed > 0n && (
                      <span className="text-rose-400">
                        Used: {formatCFT(m.info.reserveUsed)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Round Payment Indicator */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                {Boolean(currentRoundNumber) && (
                  <div>
                    {m.hasContributedCurrentRound ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Contributed
                      </span>
                    ) : m.isDefaulted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <ShieldAlert className="w-3.5 h-3.5" /> Defaulted
                      </span>
                    ) : m.isLate ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> Late
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                )}

                <Badge variant={status.variant as any}>{status.text}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
