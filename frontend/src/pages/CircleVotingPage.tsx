import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount, useWriteContract } from 'wagmi';
import {
  useGroup,
  useGroupMembers,
  useRemovalProposal,
  useMemberInfo,
} from '../hooks/useCircleFlow';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { TransactionModal, TxStep } from '../components/common/TransactionModal';
import {
  CIRCLEFLOW_CONTRACT_ADDRESS,
  CIRCLEFLOW_ABI,
  formatAddress,
} from '../config/contracts';
import { parseContractError, ParsedContractError } from '../errors/contractErrors';
import { ArrowLeft, Vote, ShieldAlert, CheckCircle2, XCircle, Clock } from 'lucide-react';

export const CircleVotingPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const idNum = Number(groupId || '1');
  const { address } = useAccount();

  const { data: group } = useGroup(idNum);
  const { data: memberAddrs } = useGroupMembers(idNum);
  const { data: userInfo } = useMemberInfo(idNum, address);

  // Proposal 1 query (or multiple)
  const { data: proposal, refetch: refetchProposal } = useRemovalProposal(idNum, 1n);

  const { writeContractAsync } = useWriteContract();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'create' | 'vote_yes' | 'vote_no' | 'execute'>('create');
  const [targetAddressInput, setTargetAddressInput] = useState('');
  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [parsedError, setParsedError] = useState<ParsedContractError | null>(null);

  const now = Math.floor(Date.now() / 1000);
  const isTarget = address && proposal && proposal.targetMember.toLowerCase() === address.toLowerCase();
  const isActiveMember = userInfo && userInfo.status === 2;

  // Threshold: >= 2/3 of eligible voters (eligible voters = targetMembers - 1)
  const eligibleVotersCount = group ? Number(group.targetMembers) - 1 : 1;
  const requiredYesVotes = Math.ceil((eligibleVotersCount * 2) / 3);
  const hasThreshold = proposal && Number(proposal.yesVotes) >= requiredYesVotes;

  const handleAction = async () => {
    try {
      setTxStep('preparing');
      setParsedError(null);
      let hash: `0x${string}` | undefined;

      if (modalAction === 'create') {
        setTxStep('waiting_wallet');
        hash = await writeContractAsync({
          address: CIRCLEFLOW_CONTRACT_ADDRESS,
          abi: CIRCLEFLOW_ABI,
          functionName: 'createRemovalProposal',
          args: [BigInt(idNum), targetAddressInput as `0x${string}`],
        });
      } else if (modalAction === 'vote_yes' || modalAction === 'vote_no') {
        setTxStep('waiting_wallet');
        hash = await writeContractAsync({
          address: CIRCLEFLOW_CONTRACT_ADDRESS,
          abi: CIRCLEFLOW_ABI,
          functionName: 'voteOnRemoval',
          args: [BigInt(idNum), 1n, modalAction === 'vote_yes'],
        });
      } else if (modalAction === 'execute') {
        setTxStep('waiting_wallet');
        hash = await writeContractAsync({
          address: CIRCLEFLOW_CONTRACT_ADDRESS,
          abi: CIRCLEFLOW_ABI,
          functionName: 'executeRemoval',
          args: [BigInt(idNum), 1n],
        });
      }

      setTxHash(hash);
      setTxStep('confirming');
      await new Promise((r) => setTimeout(r, 6000));
      await refetchProposal();
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
            <Vote className="w-6 h-6 text-purple-400" />
            Circle #{idNum} Governance & Removal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Democratic peer review for objectively defaulted members. Requires a 2/3 majority of eligible active members.
          </p>
        </div>
      </div>

      {/* Active Proposal View */}
      {proposal && proposal.id > 0n ? (
        <Card className="space-y-6 border-purple-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase text-purple-400 tracking-wider">
                Active Removal Proposal #{proposal.id.toString()}
              </span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                Target: {formatAddress(proposal.targetMember)} {isTarget && '(You)'}
              </h3>
            </div>
            <Badge variant={proposal.executed ? 'gray' : 'purple'}>
              {proposal.executed ? 'Executed' : 'Voting Active'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Eligible Voters</span>
              <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">{eligibleVotersCount} Members</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Required Majority</span>
              <span className="text-sm font-bold text-amber-300 font-mono mt-0.5 block">{requiredYesVotes} YES Votes</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">YES Votes</span>
              <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">{proposal.yesVotes.toString()}</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">NO Votes</span>
              <span className="text-sm font-bold text-rose-400 font-mono mt-0.5 block">{proposal.noVotes.toString()}</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Voting concludes: <strong>{new Date(Number(proposal.deadline) * 1000).toLocaleString()}</strong></span>
          </div>

          {/* Voting Action Buttons */}
          {!proposal.executed && (
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setModalAction('vote_yes');
                    setTxStep('idle');
                    setIsModalOpen(true);
                  }}
                  disabled={!isActiveMember || isTarget}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Vote YES
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setModalAction('vote_no');
                    setTxStep('idle');
                    setIsModalOpen(true);
                  }}
                  disabled={!isActiveMember || isTarget}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Vote NO
                </Button>
              </div>

              {hasThreshold && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setModalAction('execute');
                    setTxStep('idle');
                    setIsModalOpen(true);
                  }}
                >
                  Execute Removal Decision
                </Button>
              )}
            </div>
          )}

          {isTarget && (
            <p className="text-xs text-amber-400/90 italic">
              Notice: The subject of a removal proposal cannot vote on their own proposal.
            </p>
          )}
        </Card>
      ) : (
        <Card className="text-center py-12 space-y-4 bg-slate-950/40 border-dashed border-slate-800">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-300 text-base">No Active Removal Proposals</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Removal proposals can only be created by active members targeting peers who have objectively defaulted on their contribution obligations.
          </p>
        </Card>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Removal Governance"
        actionSummary={{
          what:
            modalAction === 'vote_yes'
              ? 'Vote in favor of removing the defaulted member'
              : modalAction === 'vote_no'
              ? 'Vote against member removal'
              : 'Execute democratic removal outcome',
          why: 'Removal revokes voting and future participation rights. Financial collateral remains locked to protect peers.',
        }}
        step={txStep}
        txHash={txHash}
        error={parsedError}
        onConfirm={handleAction}
      />
    </div>
  );
};

