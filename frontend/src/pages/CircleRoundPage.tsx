import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount, useWriteContract } from 'wagmi';
import {
  useGroup,
  useGroupMembers,
  useRoundInfo,
  useMemberInfo,
  useHasContributed,
} from '../hooks/useCircleFlow';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { RoundTimeline } from '../components/circle/RoundTimeline';
import { TransactionModal, TxStep } from '../components/common/TransactionModal';
import {
  CIRCLEFLOW_CONTRACT_ADDRESS,
  CIRCLEFLOW_ABI,
  formatCFT,
  formatAddress,
} from '../config/contracts';
import { parseContractError, ParsedContractError } from '../errors/contractErrors';
import { ArrowLeft, Clock, ShieldAlert, Coins, Gift, AlertTriangle } from 'lucide-react';

export const CircleRoundPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const idNum = Number(groupId || '1');
  const { address } = useAccount();

  const { data: group, refetch: refetchGroup } = useGroup(idNum);
  const currentR = group?.currentRound || 1n;
  const { data: roundInfo, refetch: refetchRound } = useRoundInfo(idNum, currentR);
  const { data: memberAddrs } = useGroupMembers(idNum);
  const { data: userInfo, refetch: refetchUserInfo } = useMemberInfo(idNum, address);
  const { data: hasContributed, refetch: refetchContributed } = useHasContributed(idNum, currentR, address);

  const { writeContractAsync } = useWriteContract();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'contribute' | 'default' | 'payout'>('contribute');
  const [defaultTarget, setDefaultTarget] = useState<`0x${string}` | null>(null);
  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [parsedError, setParsedError] = useState<ParsedContractError | null>(null);

  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(roundInfo?.contributionDeadline || 0);
  const graceEnd = Number(roundInfo?.gracePeriodEnd || 0);

  const isPastDeadline = now > deadline;
  const isPastGrace = now > graceEnd;
  const isInGrace = isPastDeadline && !isPastGrace;

  const potSize = group ? group.contributionPerRound * BigInt(group.targetMembers) : 0n;

  const handleAction = async () => {
    try {
      setTxStep('preparing');
      setParsedError(null);
      let hash: `0x${string}` | undefined;

      if (modalType === 'contribute') {
        setTxStep('waiting_wallet');
        hash = await writeContractAsync({
          address: CIRCLEFLOW_CONTRACT_ADDRESS,
          abi: CIRCLEFLOW_ABI,
          functionName: 'contribute',
          args: [BigInt(idNum)],
        });
      } else if (modalType === 'payout') {
        setTxStep('waiting_wallet');
        hash = await writeContractAsync({
          address: CIRCLEFLOW_CONTRACT_ADDRESS,
          abi: CIRCLEFLOW_ABI,
          functionName: 'executePayout',
          args: [BigInt(idNum)],
        });
      } else if (modalType === 'default' && defaultTarget) {
        setTxStep('waiting_wallet');
        hash = await writeContractAsync({
          address: CIRCLEFLOW_CONTRACT_ADDRESS,
          abi: CIRCLEFLOW_ABI,
          functionName: 'markMemberDefaulted',
          args: [BigInt(idNum), currentR, defaultTarget],
        });
      }

      setTxHash(hash);
      setTxStep('confirming');
      await new Promise((r) => setTimeout(r, 6000));
      await Promise.all([refetchGroup(), refetchRound(), refetchUserInfo(), refetchContributed()]);
      setTxStep('confirmed');
    } catch (err: any) {
      console.error(err);
      setParsedError(parseContractError(err));
      setTxStep('failed');
    }
  };

  return (
    <div className="space-y-6 py-6 max-w-5xl mx-auto">
      <Link to={`/groups/${idNum}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Circle #{idNum}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Coins className="w-6 h-6 text-emerald-400" />
            Round {currentR.toString()} Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track round pool collection, deadlines, late grace period status, and payout distribution.
          </p>
        </div>
      </div>

      {roundInfo && group && (
        <RoundTimeline
          roundInfo={roundInfo}
          targetPot={potSize}
          totalMembers={group.targetMembers}
          currentRound={group.currentRound}
          lateFeePercent={group.lateFeePercent}
          userAddress={address}
        />
      )}

      {/* Late & Grace Period Alert */}
      {isInGrace && !hasContributed && (
        <Card className="bg-amber-500/10 border-amber-500/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>You're late on this round!</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The standard contribution window has closed. You can still fulfill your obligation during the grace period
            with a {Number(group?.lateFeePercent || 0) / 100}% penalty fee.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setModalType('contribute');
                setTxStep('idle');
                setIsModalOpen(true);
              }}
            >
              Pay Contribution + Late Fee
            </Button>
          </div>
        </Card>
      )}

      {/* Default Alert */}
      {isPastGrace && !hasContributed && userInfo?.status === 4 && (
        <Card className="bg-rose-500/10 border-rose-500/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>You have been marked as defaulted for this obligation</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The contribution deadline and grace period have expired. Your committed security reserve is subject
            to protocol resolution rules to protect the rotating pool.
          </p>
          <div className="text-xs font-mono text-slate-300">
            Remaining Collateral: <strong>{formatCFT(userInfo.reserveCommitted - userInfo.reserveUsed)}</strong>
          </div>
        </Card>
      )}

      {/* Action Card */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-100 text-sm">Actions for Round {currentR.toString()}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {roundInfo?.payoutExecuted
              ? 'Payout already completed for this round.'
              : roundInfo && roundInfo.totalCollected >= potSize
              ? 'Round pot fully collected. Ready to release payout.'
              : 'Collecting member contributions.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!hasContributed && !isPastGrace && (
            <Button
              size="md"
              variant="primary"
              onClick={() => {
                setModalType('contribute');
                setTxStep('idle');
                setIsModalOpen(true);
              }}
            >
              Pay Contribution
            </Button>
          )}

          {roundInfo && roundInfo.totalCollected >= potSize && !roundInfo.payoutExecuted && (
            <Button
              size="md"
              variant="primary"
              onClick={() => {
                setModalType('payout');
                setTxStep('idle');
                setIsModalOpen(true);
              }}
            >
              <Gift className="w-4 h-4 mr-1" /> Execute Round Payout
            </Button>
          )}
        </div>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'contribute'
            ? `Contribute Round ${currentR.toString()}`
            : modalType === 'payout'
            ? `Release Round ${currentR.toString()} Payout`
            : 'Resolve Default'
        }
        actionSummary={{
          what:
            modalType === 'contribute'
              ? `Pay ${formatCFT(group?.contributionPerRound)} contribution for round ${currentR.toString()}`
              : `Distribute ${formatCFT(roundInfo?.totalCollected)} to ${formatAddress(roundInfo?.recipient || '')}`,
          why:
            modalType === 'contribute'
              ? 'Fulfills your scheduled cycle obligation.'
              : 'Transfers pooled funds to the scheduled recipient.',
        }}
        step={txStep}
        txHash={txHash}
        error={parsedError}
        onConfirm={handleAction}
      />
    </div>
  );
};

