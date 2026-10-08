import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, encodePacked, parseUnits } from 'viem';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { TransactionModal, TxStep } from '../components/common/TransactionModal';
import { useCFTBalance, useCFTAllowance } from '../hooks/useCircleFlow';
import {
  CIRCLEFLOW_CONTRACT_ADDRESS,
  CIRCLEFLOW_TOKEN_ADDRESS,
  CIRCLEFLOW_ABI,
  TOKEN_ABI,
  formatCFT,
} from '../config/contracts';
import { parseContractError, ParsedContractError } from '../errors/contractErrors';
import { Users, Coins, Clock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export const CreateCirclePage: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  // Form states
  const [targetMembers, setTargetMembers] = useState<number>(4);
  const [contributionAmount, setContributionAmount] = useState<string>('100');
  const [roundDurationDays, setRoundDurationDays] = useState<number>(30);
  const [gracePeriodHours, setGracePeriodHours] = useState<number>(48);
  const [lateFeePercent, setLateFeePercent] = useState<number>(1);
  const [initialReserve, setInitialReserve] = useState<string>('300');

  // Transaction states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [parsedError, setParsedError] = useState<ParsedContractError | null>(null);

  // Queries
  const { data: cftBalance, refetch: refetchBalance } = useCFTBalance(address);
  const { data: allowance, refetch: refetchAllowance } = useCFTAllowance(address);

  // Calculations
  const contribWei = useMemo(() => {
    try {
      return parseUnits(contributionAmount || '0', 18);
    } catch {
      return 0n;
    }
  }, [contributionAmount]);

  const reserveWei = useMemo(() => {
    try {
      return parseUnits(initialReserve || '0', 18);
    } catch {
      return 0n;
    }
  }, [initialReserve]);

  const totalPotWei = contribWei * BigInt(targetMembers);

  // Required reserve calculation for all positions (1 to N)
  // Position p requires: (N - p) * contribution
  const positionReserves = useMemo(() => {
    return Array.from({ length: targetMembers }, (_, i) => {
      const position = i + 1;
      const futureRounds = targetMembers - position;
      const req = contribWei * BigInt(futureRounds);
      return { position, futureRounds, req };
    });
  }, [targetMembers, contribWei]);

  // Wagmi contracts
  const { writeContractAsync: writeTokenAsync } = useWriteContract();
  const { writeContractAsync: writeCircleFlowAsync } = useWriteContract();

  const [isApproving, setIsApproving] = useState(false);

  const needsApproval = useMemo(() => {
    if (!allowance) return reserveWei > 0n;
    return allowance < reserveWei;
  }, [allowance, reserveWei]);

  // Handle Token Approval
  const handleApprove = async () => {
    if (!address) return;
    try {
      setIsApproving(true);
      const hash = await writeTokenAsync({
        address: CIRCLEFLOW_TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [CIRCLEFLOW_CONTRACT_ADDRESS, reserveWei * 10n],
      });
      // Wait for allowance confirmation
      await new Promise((r) => setTimeout(r, 4000));
      await refetchAllowance();
      setIsApproving(false);
    } catch (err: any) {
      setIsApproving(false);
      setParsedError(parseContractError(err));
    }
  };

  // Handle Circle Creation
  const handleCreate = async () => {
    if (!address) return;

    try {
      setTxStep('preparing');
      setParsedError(null);

      // Generate random secret and save commitment to local storage for fair reveal
      const randomSecretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secretHex = ('0x' + Array.from(randomSecretBytes).map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
      const commitment = keccak256(encodePacked(['bytes32', 'address'], [secretHex, address]));

      const roundDurationSec = BigInt(roundDurationDays * 86400);
      const gracePeriodSec = BigInt(gracePeriodHours * 3600);
      const lateFeeBps = BigInt(lateFeePercent * 100);

      setTxStep('waiting_wallet');

      const hash = await writeCircleFlowAsync({
        address: CIRCLEFLOW_CONTRACT_ADDRESS,
        abi: CIRCLEFLOW_ABI,
        functionName: 'createGroup',
        args: [
          BigInt(targetMembers),
          contribWei,
          roundDurationSec,
          gracePeriodSec,
          lateFeeBps,
          reserveWei,
          commitment,
        ],
      });

      setTxHash(hash);
      setTxStep('confirming');

      // Save secret locally for reveal step
      localStorage.setItem(`circleflow_secret_${address.toLowerCase()}_pending`, secretHex);

      // Wait a moment for transaction confirmation
      await new Promise((r) => setTimeout(r, 6000));
      await refetchBalance();
      setTxStep('confirmed');
    } catch (err: any) {
      console.error(err);
      setParsedError(parseContractError(err));
      setTxStep('failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          Create a Savings Circle
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Form a decentralized, financially protected rotating savings group with your peers.
        </p>
      </div>

      {!isConnected && (
        <AlertBanner
          type="warning"
          title="Wallet Connection Required"
          message="Please connect your Ethereum Sepolia wallet to configure and launch a savings circle."
        />
      )}

      {/* Main Form */}
      <Card className="space-y-6">
        {/* Group Size Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Group Size (Number of Members & Rounds)
          </label>
          <p className="text-xs text-slate-400">
            CircleFlow supports configurable groups of 3, 4, or 5 participants.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {[3, 4, 5].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setTargetMembers(size);
                  // Default suggested reserve = (size - 1) * contribution
                  const suggested = (size - 1) * Number(contributionAmount || 0);
                  setInitialReserve(suggested.toString());
                }}
                className={`py-3 px-4 rounded-xl border text-center transition ${
                  targetMembers === size
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                }`}
              >
                <span className="text-lg block font-mono font-bold">{size}</span>
                <span className="text-[11px] block text-slate-400">Members</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contribution Amount */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            Fixed Contribution Per Round (CFT)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              value={contributionAmount}
              onChange={(e) => {
                setContributionAmount(e.target.value);
                const suggested = (targetMembers - 1) * Number(e.target.value || 0);
                setInitialReserve(suggested.toString());
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 100"
            />
            <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-500">
              CFT
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block">
            Round Pot: <strong className="text-emerald-400 font-mono">{formatCFT(totalPotWei)}</strong> pooled each round.
          </span>
        </div>

        {/* Timelines Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Round Duration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Round Duration
            </label>
            <select
              value={roundDurationDays}
              onChange={(e) => setRoundDurationDays(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={1}>1 Day (Fast Test)</option>
              <option value={7}>7 Days (Weekly)</option>
              <option value={14}>14 Days (Bi-weekly)</option>
              <option value={30}>30 Days (Monthly)</option>
            </select>
          </div>

          {/* Grace Period */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Grace Period
            </label>
            <select
              value={gracePeriodHours}
              onChange={(e) => setGracePeriodHours(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={1}>1 Hour (Fast Test)</option>
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours (Standard)</option>
              <option value={72}>72 Hours</option>
            </select>
          </div>

          {/* Late Penalty Fee */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Late Fee
            </label>
            <select
              value={lateFeePercent}
              onChange={(e) => setLateFeePercent(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={1}>1% (Default)</option>
              <option value={2}>2%</option>
              <option value={5}>5%</option>
            </select>
          </div>
        </div>

        {/* Creator's Initial Security Reserve Deposit */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Your Initial Security Reserve Commitment (CFT)
          </label>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your committed reserve determines which payout positions you can safely qualify for.
            To qualify for the earliest payout (Position 1), you need{' '}
            <strong className="text-emerald-400">
              {formatCFT(contribWei * BigInt(targetMembers - 1))}
            </strong>.
          </p>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={initialReserve}
              onChange={(e) => setInitialReserve(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 300"
            />
            <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-500">
              CFT
            </span>
          </div>
        </div>

        {/* Required Reserve Preview Table */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Position Reserve Eligibility Preview
          </h4>
          <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Position</th>
                  <th className="p-2.5">Future Rounds</th>
                  <th className="p-2.5">Required Collateral</th>
                  <th className="p-2.5">You Qualify?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {positionReserves.map((p) => {
                  const qualifies = reserveWei >= p.req;
                  return (
                    <tr key={p.position} className="hover:bg-slate-900/40">
                      <td className="p-2.5 text-slate-200 font-bold">Position #{p.position}</td>
                      <td className="p-2.5 text-slate-400">{p.futureRounds} remaining</td>
                      <td className="p-2.5 text-amber-300 font-bold">{formatCFT(p.req)}</td>
                      <td className="p-2.5">
                        {qualifies ? (
                          <span className="text-emerald-400 font-semibold">✓ Qualified</span>
                        ) : (
                          <span className="text-slate-500">Needs more reserve</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800/80">
          <Button
            size="lg"
            variant="primary"
            onClick={() => {
              setTxStep('idle');
              setIsModalOpen(true);
            }}
            disabled={!isConnected || contribWei === 0n}
            className="w-full"
          >
            Review & Create Circle
          </Button>
        </div>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (txStep === 'confirmed') {
            navigate('/dashboard');
          }
        }}
        title="Create Savings Circle"
        actionSummary={{
          what: `Launch ${targetMembers}-member Circle with ${contributionAmount} CFT contribution and deposit ${initialReserve} CFT reserve`,
          why: 'Initializes the trustless Circle contract on Sepolia and registers your position with cryptographic commit-reveal entropy.',
          lockedAmount: `${initialReserve} CFT`,
          availableAmount: formatCFT(
            cftBalance && reserveWei ? (cftBalance >= reserveWei ? cftBalance - reserveWei : 0n) : 0n
          ),
          needsApproval,
          approvalPending: isApproving,
        }}
        step={txStep}
        txHash={txHash}
        error={parsedError}
        onConfirm={handleCreate}
        onApprove={handleApprove}
        confirmLabel="Confirm Creation in Wallet"
      />
    </div>
  );
};

