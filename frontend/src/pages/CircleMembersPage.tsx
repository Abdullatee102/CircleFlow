import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useGroup, useGroupMembers, useRoundInfo } from '../hooks/useCircleFlow';
import { MemberList } from '../components/circle/MemberList';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ArrowLeft, Users, ShieldCheck } from 'lucide-react';
import { formatCFT } from '../config/contracts';

export const CircleMembersPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const idNum = Number(groupId || '1');
  const { address } = useAccount();

  const { data: group } = useGroup(idNum);
  const { data: memberAddrs } = useGroupMembers(idNum);
  const { data: roundInfo } = useRoundInfo(idNum, group?.currentRound || 1n);

  return (
    <div className="space-y-6 py-6 max-w-5xl mx-auto">
      {/* Top back button */}
      <Link to={`/groups/${idNum}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Circle #{idNum}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Circle #{idNum} — Members & Collateral
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Breakdown of participants, security reserves, position eligibility, and payment statuses.
          </p>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/40">
        <div>
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
            Target Size
          </span>
          <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">
            {group?.targetMembers.toString()} Members
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
            Joined
          </span>
          <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
            {memberAddrs?.length || 0} Members
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
            Contribution
          </span>
          <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">
            {formatCFT(group?.contributionPerRound)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
            Round Pot
          </span>
          <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
            {formatCFT(group ? group.contributionPerRound * BigInt(group.targetMembers) : 0n)}
          </span>
        </div>
      </Card>

      {/* Full Member List */}
      {memberAddrs && (
        <MemberList
          members={memberAddrs.map((addr: `0x${string}`) => ({
            address: addr,
          }))}
          currentRoundNumber={group?.status === 2 ? group.currentRound : undefined}
          userAddress={address}
          payoutRecipient={roundInfo?.recipient}
        />
      )}
    </div>
  );
};

