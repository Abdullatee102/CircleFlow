import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicClient } from '../hooks/useCircleFlow';
import {
  CIRCLEFLOW_CONTRACT_ADDRESS,
  CIRCLEFLOW_ABI,
  EXPLORER_URL,
  formatAddress,
  formatCFT,
} from '../config/contracts';
import { Card } from '../components/common/Card';
import { ArrowLeft, Activity, ExternalLink, ShieldCheck, Coins, Users, Gift } from 'lucide-react';

export const CircleActivityPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const idNum = Number(groupId || '1');

  // Query actual blockchain logs from Ethereum Sepolia
  const { data: logs, isLoading } = useQuery({
    queryKey: ['circleActivityLogs', idNum],
    queryFn: async () => {
      try {
        const events = await publicClient.getContractEvents({
          address: CIRCLEFLOW_CONTRACT_ADDRESS,
          abi: CIRCLEFLOW_ABI as any,
          fromBlock: 11869000n, // Sepolia deployment block
        });

        // Filter events belonging to this groupId
        const filtered = events.filter((e: any) => {
          const gId = e.args?.groupId;
          return gId && Number(gId) === idNum;
        });

        // Sort descending by blockNumber / logIndex
        return filtered.reverse();
      } catch (err) {
        console.error('Error fetching logs:', err);
        return [];
      }
    },
    refetchInterval: 12000,
  });

  return (
    <div className="space-y-6 py-6 max-w-5xl mx-auto">
      <Link to={`/groups/${idNum}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Circle #{idNum}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Circle #{idNum} — On-Chain Activity Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real Ethereum Sepolia blockchain event history. Zero mock logs.
          </p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Smart Contract Events Log
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {logs?.length || 0} Events Found
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Reading blockchain logs from Ethereum Sepolia RPC...
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {logs.map((log: any, idx: number) => {
              const eventName = log.eventName;
              const txHash = log.transactionHash;
              const blockNumber = log.blockNumber;

              return (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      <span className="text-emerald-400">{eventName}</span>
                    </div>

                    <div className="text-slate-400 text-[11px] space-x-2">
                      {log.args?.member && (
                        <span>Member: <strong className="text-slate-300">{formatAddress(log.args.member)}</strong></span>
                      )}
                      {log.args?.recipient && (
                        <span>Recipient: <strong className="text-slate-300">{formatAddress(log.args.recipient)}</strong></span>
                      )}
                      {log.args?.roundNumber && (
                        <span>Round: <strong className="text-slate-300">#{log.args.roundNumber.toString()}</strong></span>
                      )}
                      {log.args?.amount && (
                        <span>Amount: <strong className="text-emerald-300">{formatCFT(log.args.amount)}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center text-[11px] text-slate-500">
                    <span>Block #{blockNumber?.toString()}</span>
                    <a
                      href={`${EXPLORER_URL}/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-sans underline"
                    >
                      Tx <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-500">
            No contract logs found for Circle #{idNum} yet.
          </div>
        )}
      </Card>
    </div>
  );
};

