import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Users, Clock, ArrowRight, ShieldCheck, Coins } from 'lucide-react';
import { CircleGroupData } from '../../hooks/useCircleFlow';
import { formatCFT } from '../../config/contracts';

interface CircleCardProps {
  group: CircleGroupData;
  userAddress?: `0x${string}`;
}

export const CircleCard: React.FC<CircleCardProps> = ({ group, userAddress }) => {
  const statusLabels: Record<number, { text: string; variant: 'brand' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
    0: { text: 'Created', variant: 'gray' },
    1: { text: 'Forming', variant: 'blue' },
    2: { text: 'Active', variant: 'brand' },
    3: { text: 'Completed', variant: 'gray' },
    4: { text: 'Cancelled', variant: 'red' },
  };

  const status = statusLabels[group.status] || { text: 'Unknown', variant: 'gray' };
  const potSize = group.contributionPerRound * BigInt(group.targetMembers);
  const isCreator = userAddress && group.creator.toLowerCase() === userAddress.toLowerCase();

  return (
    <Link to={`/groups/${group.id.toString()}`} className="block group">
      <Card className="h-full flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-100 text-base">
                Circle #{group.id.toString()}
              </span>
              {isCreator && (
                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  Creator
                </span>
              )}
            </div>
            <Badge variant={status.variant}>{status.text}</Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Contribution
              </span>
              <span className="text-sm font-bold text-slate-100 font-mono mt-0.5 block">
                {formatCFT(group.contributionPerRound)}
              </span>
            </div>

            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Round Pot
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                {formatCFT(potSize)}
              </span>
            </div>
          </div>

          {/* Meta Details */}
          <div className="space-y-1.5 text-xs text-slate-400 py-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Group Size:
              </span>
              <span className="font-semibold text-slate-200">
                {group.targetMembers.toString()} Members
              </span>
            </div>

            {group.status === 2 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-slate-500" />
                  Current Round:
                </span>
                <span className="font-semibold text-slate-200">
                  Round {group.currentRound.toString()} of {group.targetMembers.toString()}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Round Duration:
              </span>
              <span className="font-semibold text-slate-200">
                {Math.round(Number(group.roundDuration) / 86400)} days
              </span>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
          <span>View Circle Details</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </Card>
    </Link>
  );
};

