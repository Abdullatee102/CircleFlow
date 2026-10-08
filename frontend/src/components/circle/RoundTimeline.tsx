import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Clock, Gift, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatAddress, formatCFT } from '../../config/contracts';
import { RoundInfoData } from '../../hooks/useCircleFlow';

interface RoundTimelineProps {
  roundInfo: RoundInfoData;
  targetPot: bigint;
  totalMembers: bigint | number;
  currentRound: bigint | number;
  lateFeePercent: bigint | number;
  userAddress?: `0x${string}`;
}

export const RoundTimeline: React.FC<RoundTimelineProps> = ({
  roundInfo,
  targetPot,
  totalMembers,
  currentRound,
  lateFeePercent,
  userAddress,
}) => {
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(roundInfo.contributionDeadline);
  const graceEnd = Number(roundInfo.gracePeriodEnd);

  const isCollected = roundInfo.totalCollected >= targetPot;
  const isPastDeadline = now > deadline;
  const isPastGrace = now > graceEnd;
  const isInGrace = isPastDeadline && !isPastGrace;

  const isUserRecipient = userAddress && roundInfo.recipient.toLowerCase() === userAddress.toLowerCase();

  const getStatus = () => {
    if (roundInfo.payoutExecuted) {
      return { text: 'Payout Completed', variant: 'brand' as const };
    }
    if (isCollected) {
      return { text: 'Ready for Payout', variant: 'brand' as const };
    }
    if (isInGrace) {
      return { text: 'Grace Period Active', variant: 'yellow' as const };
    }
    if (isPastGrace) {
      return { text: 'Default Resolution Window', variant: 'red' as const };
    }
    return { text: 'Contribution Open', variant: 'blue' as const };
  };

  const status = getStatus();
  const progressPercent = targetPot > 0n ? Math.min(100, Number((roundInfo.totalCollected * 100n) / targetPot)) : 0;

  return (
    <Card className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
            Current Phase
          </span>
          <h3 className="text-xl font-black text-slate-100 flex items-center gap-2 mt-0.5">
            Round {currentRound.toString()} of {totalMembers.toString()}
          </h3>
        </div>
        <Badge variant={status.variant} size="md">
          {status.text}
        </Badge>
      </div>

      {/* Recipient Banner */}
      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">
              Scheduled Recipient
            </span>
            <span className="font-mono text-sm font-bold text-slate-100">
              {formatAddress(roundInfo.recipient)} {isUserRecipient && '(You)'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 font-medium block">Round Pot</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">
            {formatCFT(targetPot)}
          </span>
        </div>
      </div>

      {/* Pot Collection Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Collected: <strong className="text-white font-mono">{formatCFT(roundInfo.totalCollected)}</strong></span>
          <span>Target: <strong className="text-emerald-400 font-mono">{formatCFT(targetPot)}</strong></span>
        </div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-right text-[11px] text-slate-500 font-mono">
          {progressPercent}% Collected
        </div>
      </div>

      {/* Timelines and Deadlines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Deadline */}
        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 flex items-start gap-3">
          <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs text-slate-400 font-medium block">Contribution Deadline</span>
            <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
              {new Date(deadline * 1000).toLocaleString()}
            </span>
            {isPastDeadline ? (
              <span className="text-[10px] text-amber-400 font-medium mt-0.5 block">Expired</span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">Open for payment</span>
            )}
          </div>
        </div>

        {/* Grace Period */}
        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs text-slate-400 font-medium block">
              Grace Period ({Number(lateFeePercent) / 100}% Late Fee)
            </span>
            <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
              {new Date(graceEnd * 1000).toLocaleString()}
            </span>
            {isInGrace && (
              <span className="text-[10px] text-amber-400 font-semibold mt-0.5 block animate-pulse">
                Late contribution accepted with penalty
              </span>
            )}
            {isPastGrace && (
              <span className="text-[10px] text-rose-400 font-semibold mt-0.5 block">
                Grace period ended
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

