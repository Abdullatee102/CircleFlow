import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount, useWriteContract } from 'wagmi';
import { keccak256, encodePacked, parseUnits } from 'viem';
import {
  useGroup,
  useGroupMembers,
  useFinalizedPayoutOrder,
  useRoundInfo,
  useMemberInfo,
  useWithdrawableReserve,
  useRequiredReserve,
  useHasContributed,
  useCFTBalance,
  useCFTAllowance,
} from '../hooks/useCircleFlow';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ReserveCard } from '../components/circle/ReserveCard';
import { RoundTimeline } from '../components/circle/RoundTimeline';
import { PayoutOrderList } from '../components/circle/PayoutOrderList';
import { MemberList } from '../components/circle/MemberList';
import { TransactionModal, TxStep } from '../components/common/TransactionModal';
import { AlertBanner } from '../components/common/AlertBanner';
import {
  CIRCLEFLOW_CONTRACT_ADDRESS,
  CIRCLEFLOW_TOKEN_ADDRESS,
  CIRCLEFLOW_ABI,
  TOKEN_ABI,
  formatCFT,
  formatAddress,
} from '../config/contracts';
import { parseContractError, ParsedContractError } from '../errors/contractErrors';
import {
  Users,
  Coins,
  ShieldCheck,
  RotateCw,
  Sparkles,
  ArrowRight,
  Vote,
  Activity,
  UserPlus,
  Play,
  KeyRound,
} from 'lucide-react';

export const CircleDetailsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const idNum = Number(groupId || '1');
  const { address, isConnected } = useAccount();

  // On-chain reads
  const { data: group, refetch: refetchGroup } = useGroup(idNum);
  const { data: memberAddrs, refetch: refetchMembers } = useGroupMembers(idNum);
  const { data: payoutOrder, refetch: refetchPayoutOrder } = useFinalizedPayoutOrder(idNum);
  const { data: userInfo, refetch: refetchUserInfo } = useMemberInfo(idNum, address);
  const { data: withdrawableRes, refetch: refetchWithdrawable } = useWithdrawableReserve(idNum, address);
  const { data: requiredRes, refetch: refetchRequired } = useRequiredReserve(idNum, address);
  const { data: cftBalance, refetch: refetchBalance } = useCFTBalance(address);
  const { data: allowance, refetch: refetchAllowance } = useCFTAllowance(address);

  const currentRoundNum = group?.currentRound || 1n;
  const { data: roundInfo, refetch: refetchRound } = useRoundInfo(idNum, currentRoundNum);
  const { data: hasContributedUser, refetch: refetchContributed } = useHasContributed(idNum, currentRoundNum, address);

  // Wagmi write hooks
  const { writeContractAsync } = useWriteContract();
  const { writeContractAsync: writeTokenAsync } = useWriteContract();

  // Transaction Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    what: string;
    why: string;
    locked?: string;
    available?: string;
    actionType:
      | 'join'
      | 'deposit_reserve'
      | 'reveal'
      | 'finalize_order'
      | 'start_circle'
      | 'contribute'
      | 'execute_payout'
      | 'withdraw_reserve';
    amount?: bigint;
  }>({
    isOpen: false,
    title: '',
    what: '',
    why: '',
    actionType: 'contribute',
  });

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [parsedError, setParsedError] = useState<ParsedContractError | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Join form states
  const [joinReserveInput, setJoinReserveInput] = useState('200');

  const isMember = userInfo && userInfo.status !== 0;
  const isCreator = group && address && group.creator.toLowerCase() === address.toLowerCase();

  const refetchAll = async () => {
    await Promise.all([
      refetchGroup(),
      refetchMembers(),
      refetchPayoutOrder(),
      refetchUserInfo(),
      refetchWithdrawable(),
      refetchRequired(),
      refetchRound(),
      refetchContributed(),
      refetchBalance(),
      refetchAllowance(),
    ]);
  };

  const needsApproval = useMemo(() => {
    if (!allowance || !modalState.amount) return false;
    return allowance < modalState.amount;
  }, [allowance, modalState.amount]);

  const handleApprove = async () => {
    if (!modalState.amount) return;
    try {
      setIsApproving(true);
      await writeTokenAsync({
        address: CIRCLEFLOW_TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [CIRCLEFLOW_CONTRACT_ADDRESS, modalState.amount * 10n],
      });
      await new Promise((r) => setTimeout(r, 4000));
      await refetchAllowance();
      setIsApproving(false);
    } catch (err: any) {
      setIsApproving(false);
      setParsedError(parseContractError(err));
    }
  };

  const executeAction = async () => {
    if (!address) return;
    try {
      setTxStep('preparing');
      setParsedError(null);

      let hash: `0x${string}` | undefined;

      switch (modalState.actionType) {
        case 'join': {
          const reserveWei = parseUnits(joinReserveInput || '0', 18);
          const rand = crypto.getRandomValues(new Uint8Array(32));
          const secret = ('0x' + Array.from(rand).map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
          const commitment = keccak256(encodePacked(['bytes32', 'address'], [secret, address]));
          localStorage.setItem(`circleflow_secret_${idNum}_${address.toLowerCase()}`, secret);

          setTxStep('waiting_wallet');
          hash = await writeContractAsync({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI,
            functionName: 'joinGroup',
            args: [BigInt(idNum), reserveWei, commitment],
          });
          break;
        }

        case 'reveal': {
          let secret = localStorage.getItem(`circleflow_secret_${idNum}_${address.toLowerCase()}`);
          if (!secret) {
            secret = localStorage.getItem(`circleflow_secret_${address.toLowerCase()}_pending`);
          }
          if (!secret) {
            secret = '0x1111111111111111111111111111111111111111111111111111111111111111';
          }
          setTxStep('waiting_wallet');
          hash = await writeContractAsync({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI,
            functionName: 'revealPayoutSecret',
            args: [BigInt(idNum), secret as `0x${string}`],
          });
          break;
        }

        case 'finalize_order': {
          setTxStep('waiting_wallet');
          hash = await writeContractAsync({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI,
            functionName: 'finalizePayoutOrder',
            args: [BigInt(idNum)],
          });
          break;
        }

        case 'start_circle': {
          setTxStep('waiting_wallet');
          hash = await writeContractAsync({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI,
            functionName: 'startGroup',
            args: [BigInt(idNum)],
          });
          break;
        }

        case 'contribute': {
          setTxStep('waiting_wallet');
          hash = await writeContractAsync({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI,
            functionName: 'contribute',
            args: [BigInt(idNum)],
          });
          break;
        }

        case 'execute_payout': {
          setTxStep('waiting_wallet');
          hash = await writeContractAsync({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI,
            functionName: 'executePayout',
            args: [BigInt(idNum)],
          });
          break;
        }

        case 'withdraw_reserve': {
          setTxStep('waiting_wallet');
          hash = await writeContractAsync({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI,
            functionName: 'withdrawExcessReserve',
            args: [BigInt(idNum)],
          });
          break;
        }
      }

      setTxHash(hash);
      setTxStep('confirming');
      await new Promise((r) => setTimeout(r, 6000));
      await refetchAll();
      setTxStep('confirmed');
    } catch (err: any) {
      console.error(err);
      setParsedError(parseContractError(err));
      setTxStep('failed');
    }
  };

  if (!group || group.targetMembers === 0n) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500 animate-spin">
          <RotateCw className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-300">Loading Circle #{idNum}...</h3>
        <p className="text-xs text-slate-500">
          Querying on-chain state from Ethereum Sepolia smart contract.
        </p>
      </div>
    );
  }

  const potSize = group.contributionPerRound * BigInt(group.targetMembers);
  const isFull = memberAddrs && memberAddrs.length >= Number(group.targetMembers);

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
                Circle #{idNum}
              </h1>
              <Badge
                variant={
                  group.status === 2
                    ? 'brand'
                    : group.status === 1
                    ? 'blue'
                    : group.status === 3
                    ? 'gray'
                    : 'red'
                }
                size="md"
              >
                {group.status === 1 && 'Forming'}
                {group.status === 2 && 'Active'}
                {group.status === 3 && 'Completed'}
                {group.status === 4 && 'Cancelled'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>Creator: <strong className="text-slate-300 font-mono">{formatAddress(group.creator)}</strong></span>
              <span>•</span>
              <span>Rounds: <strong className="text-slate-300">{group.targetMembers.toString()} total</strong></span>
            </p>
          </div>

          {/* Quick Sub-navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/groups/${idNum}/members`}>
              <Button size="sm" variant="outline">
                <Users className="w-4 h-4 mr-1 text-slate-400" /> Members
              </Button>
            </Link>
            <Link to={`/groups/${idNum}/round`}>
              <Button size="sm" variant="outline">
                <RotateCw className="w-4 h-4 mr-1 text-sky-400" /> Round Details
              </Button>
            </Link>
            <Link to={`/groups/${idNum}/voting`}>
              <Button size="sm" variant="outline">
                <Vote className="w-4 h-4 mr-1 text-purple-400" /> Governance
              </Button>
            </Link>
            <Link to={`/groups/${idNum}/activity`}>
              <Button size="sm" variant="outline">
                <Activity className="w-4 h-4 mr-1 text-emerald-400" /> Activity
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div>
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
              Contribution
            </span>
            <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">
              {formatCFT(group.contributionPerRound)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
              Round Pot
            </span>
            <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
              {formatCFT(potSize)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
              Progress
            </span>
            <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">
              {group.status === 2
                ? `Round ${group.currentRound.toString()} of ${group.targetMembers.toString()}`
                : `${memberAddrs?.length || 1} / ${group.targetMembers.toString()} Members`}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
              Late Penalty
            </span>
            <span className="text-base font-bold text-amber-300 font-mono mt-0.5 block">
              {Number(group.lateFeePercent) / 100}%
            </span>
          </div>
        </div>
      </Card>

      {/* Member Collateral & Reserve Card */}
      {isMember && (
        <ReserveCard
          committedReserve={userInfo?.reserveCommitted || 0n}
          requiredReserve={requiredRes || 0n}
          withdrawableReserve={withdrawableRes || 0n}
          reserveUsed={userInfo?.reserveUsed || 0n}
          onWithdraw={() => {
            setTxStep('idle');
            setModalState({
              isOpen: true,
              title: 'Withdraw Excess Security Reserve',
              what: `Withdraw ${formatCFT(withdrawableRes)} from Circle #${idNum}`,
              why: 'This reserve is no longer protecting future obligations and is unencumbered.',
              actionType: 'withdraw_reserve',
            });
          }}
        />
      )}

      {/* Group FORMING Controls */}
      {group.status === 1 && (
        <Card className="border-sky-500/20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Circle Formation Stage
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Waiting for {group.targetMembers.toString()} members to deposit collateral and reveal secret entropy.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full border border-sky-500/20">
              {memberAddrs?.length || 1} / {group.targetMembers.toString()} Joined
            </span>
          </div>

          {/* Join Form if not yet a member */}
          {!isMember && !isFull && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-semibold text-sm text-slate-200">Join This Savings Circle</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Commit your security reserve to join. Higher reserve deposits qualify you for earlier payout rounds.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    value={joinReserveInput}
                    onChange={(e) => setJoinReserveInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Reserve in CFT"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">CFT</span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const resWei = parseUnits(joinReserveInput || '0', 18);
                    setTxStep('idle');
                    setModalState({
                      isOpen: true,
                      title: 'Join Savings Circle',
                      what: `Deposit ${joinReserveInput} CFT collateral to join Circle #${idNum}`,
                      why: 'Registers your membership and commits cryptographic entropy for fair order determination.',
                      amount: resWei,
                      locked: `${joinReserveInput} CFT`,
                      available: formatCFT(cftBalance ? (cftBalance >= resWei ? cftBalance - resWei : 0n) : 0n),
                      actionType: 'join',
                    });
                  }}
                  disabled={!isConnected}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Join Circle
                </Button>
              </div>
            </div>
          )}

          {/* Formation Step Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {/* Reveal secret button */}
            {isMember && !userInfo?.hasRevealed && isFull && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setTxStep('idle');
                  setModalState({
                    isOpen: true,
                    title: 'Reveal Payout Secret',
                    what: 'Submit cryptographic reveal for fair sequence generation',
                    why: 'Reveals your secret commit to ensure deterministic, untamperable payout order.',
                    actionType: 'reveal',
                  });
                }}
              >
                <KeyRound className="w-4 h-4 mr-1 text-sky-400" /> Reveal Payout Secret
              </Button>
            )}

            {/* Finalize order button */}
            {isFull && !group.payoutOrderFinalized && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setTxStep('idle');
                  setModalState({
                    isOpen: true,
                    title: 'Finalize Payout Order',
                    what: 'Derive and lock the fair payout rotation sequence',
                    why: 'Validates all member reserve capacities and establishes the order on-chain.',
                    actionType: 'finalize_order',
                  });
                }}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Finalize Payout Sequence
              </Button>
            )}

            {/* Start Circle button */}
            {group.payoutOrderFinalized && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setTxStep('idle');
                  setModalState({
                    isOpen: true,
                    title: 'Start Circle (Begin Round 1)',
                    what: 'Activate savings circle and start Round 1 timer',
                    why: 'Locks the constitution, freezes member parameters, and opens contributions.',
                    actionType: 'start_circle',
                  });
                }}
              >
                <Play className="w-4 h-4 mr-1" /> Start Circle & Begin Round 1
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ACTIVE Round Controls */}
      {group.status === 2 && roundInfo && (
        <div className="space-y-6">
          <RoundTimeline
            roundInfo={roundInfo}
            targetPot={potSize}
            totalMembers={group.targetMembers}
            currentRound={group.currentRound}
            lateFeePercent={group.lateFeePercent}
            userAddress={address}
          />

          {/* Quick Actions for Current Round */}
          <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-100">Round {group.currentRound.toString()} Action</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasContributedUser
                  ? 'You have fulfilled your contribution for this round.'
                  : `Your contribution of ${formatCFT(group.contributionPerRound)} is due for this round.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isMember && !hasContributedUser && (
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => {
                    setTxStep('idle');
                    setModalState({
                      isOpen: true,
                      title: `Contribute for Round ${group.currentRound.toString()}`,
                      what: `Deposit ${formatCFT(group.contributionPerRound)} round contribution`,
                      why: 'Pooled into the round pot for the scheduled recipient.',
                      amount: group.contributionPerRound,
                      actionType: 'contribute',
                    });
                  }}
                >
                  <Coins className="w-4 h-4 mr-1" /> Pay Round Contribution
                </Button>
              )}

              {roundInfo.totalCollected >= potSize && !roundInfo.payoutExecuted && (
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => {
                    setTxStep('idle');
                    setModalState({
                      isOpen: true,
                      title: 'Execute Round Payout',
                      what: `Release ${formatCFT(roundInfo.totalCollected)} pot to ${formatAddress(roundInfo.recipient)}`,
                      why: 'All round contributions satisfied; recipient security reserve verified.',
                      actionType: 'execute_payout',
                    });
                  }}
                >
                  Release Payout to Recipient
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Payout Order Sequence */}
      {payoutOrder && payoutOrder.length > 0 && (
        <PayoutOrderList
          order={payoutOrder}
          targetMembers={group.targetMembers}
          contributionPerRound={group.contributionPerRound}
          currentRound={group.currentRound}
          userAddress={address}
        />
      )}

      {/* Members List */}
      {memberAddrs && (
        <MemberList
          members={memberAddrs.map((addr: `0x${string}`) => ({
            address: addr,
            hasContributedCurrentRound: false,
          }))}
          currentRoundNumber={group.status === 2 ? group.currentRound : undefined}
          userAddress={address}
          payoutRecipient={roundInfo?.recipient}
        />
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        title={modalState.title}
        actionSummary={{
          what: modalState.what,
          why: modalState.why,
          lockedAmount: modalState.locked,
          availableAmount: modalState.available,
          needsApproval,
          approvalPending: isApproving,
        }}
        step={txStep}
        txHash={txHash}
        error={parsedError}
        onConfirm={executeAction}
        onApprove={handleApprove}
      />
    </div>
  );
};

