import React from 'react';
import { Card } from '../common/Card';
import { formatAddress, formatCFT } from '../../config/contracts';
import { Sparkles, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

interface PayoutOrderListProps {
  order: `0x${string}`[];
  targetMembers: bigint | number;
  contributionPerRound: bigint;
  currentRound: bigint | number;
  userAddress?: `0x${string}`;
}

export const PayoutOrderList: React.FC<PayoutOrderListProps> = ({
  order,
  targetMembers,
  contributionPerRound,
  currentRound,
  userAddress,
}) => {
  const roundPot = contributionPerRound * BigInt(targetMembers);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Payout Rotation Sequence
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Fairly determined on-chain via commit-reveal randomness and reserve capacity.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60">
        {order.map((recipient, idx) => {
          const position = idx + 1;
          const isCurrentUser = userAddress && recipient.toLowerCase() === userAddress.toLowerCase();
          const isCurrentRound = BigInt(position) === currentRound;
          const isCompleted = BigInt(position) < currentRound;
          // Position p requires: (N - p) * contributionPerRound
          const requiredReserve = (Number(targetMembers) - position) * Number(contributionPerRound);

          return (
            <div
              key={recipient}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                isCurrentUser
                  ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500'
                  : isCurrentRound
                  ? 'bg-sky-500/5'
                  : 'hover:bg-slate-900/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs font-mono border ${
                    isCompleted
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : isCurrentRound
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  #{position}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-200">
                      {formatAddress(recipient)}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded">
                        Your Turn
                      </span>
                    )}
                    {isCurrentRound && (
                      <span className="text-[10px] font-bold bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded animate-pulse">
                        Current Payout
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Completed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span>
                      Expected Payout: <strong className="text-emerald-400">{formatCFT(roundPot)}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" /> Required Reserve:{' '}
                      <strong className="text-slate-300">{formatCFT(BigInt(requiredReserve))}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 self-end sm:self-center">
                <span>Scheduled for: </span>
                <strong className="text-slate-200">Round {position}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

