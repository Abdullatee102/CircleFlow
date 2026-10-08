import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ShieldCheck, ArrowDownCircle, Info, Lock } from 'lucide-react';
import { formatCFT } from '../../config/contracts';

interface ReserveCardProps {
  committedReserve: bigint;
  requiredReserve: bigint;
  withdrawableReserve: bigint;
  reserveUsed: bigint;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

export const ReserveCard: React.FC<ReserveCardProps> = ({
  committedReserve,
  requiredReserve,
  withdrawableReserve,
  reserveUsed,
  onWithdraw,
  isWithdrawing = false,
}) => {
  const lockedReserve = committedReserve > reserveUsed ? committedReserve - reserveUsed : 0n;

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              Security Reserve
              <span className="text-[11px] font-normal text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Self-Collateralized
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Protects other members against post-payout defaults. Decreases as obligations are met.
            </p>
          </div>
        </div>

        {withdrawableReserve > 0n && onWithdraw && (
          <Button
            size="sm"
            variant="primary"
            onClick={onWithdraw}
            isLoading={isWithdrawing}
            className="self-start sm:self-center shrink-0"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Withdraw {formatCFT(withdrawableReserve)}</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {/* Total Locked */}
        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Locked
          </span>
          <span className="text-base font-bold text-slate-100 font-mono mt-1 block">
            {formatCFT(lockedReserve)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Committed collateral</span>
        </div>

        {/* Required */}
        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
          <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-400" /> Required
          </span>
          <span className="text-base font-bold text-amber-300 font-mono mt-1 block">
            {formatCFT(requiredReserve)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Protects future rounds</span>
        </div>

        {/* Withdrawable */}
        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">
            Withdrawable
          </span>
          <span className="text-base font-bold text-emerald-300 font-mono mt-1 block">
            {formatCFT(withdrawableReserve)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Unencumbered excess</span>
        </div>

        {/* Used Reserve / Resolution */}
        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
          <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider block">
            Used / Settled
          </span>
          <span className="text-base font-bold text-rose-300 font-mono mt-1 block">
            {formatCFT(reserveUsed)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Consumed for defaults</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-950/40 rounded-xl border border-slate-800/50 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          Your required reserve corresponds to <code className="text-slate-300 font-mono">future obligations × contribution amount</code>. When you pay each round on time, your remaining obligation shrinks, freeing up the difference for withdrawal!
        </p>
      </div>
    </Card>
  );
};

