import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { decodeEventLog, encodeAbiParameters, toEventSelector } from 'viem';
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

const ACTIVITY_START_BLOCK = 11869000n;
const LOG_BLOCK_RANGE = 5000n;

type CircleActivityLog = {
  args?: {
    groupId?: bigint;
    member?: `0x${string}`;
    recipient?: `0x${string}`;
    creator?: `0x${string}`;
    roundNumber?: bigint;
    amount?: bigint;
    reserveDeposited?: bigint;
  };
  eventName?: string;
  transactionHash?: `0x${string}`;
  blockNumber?: bigint;
  logIndex?: number | null;
};

export const CircleActivityPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const idNum = Number(groupId || '1');

  const { data: logs, isLoading, isError, error } = useQuery<CircleActivityLog[]>({
    queryKey: ['circleActivityLogs', idNum],
    queryFn: async () => {
      const latestBlock = await publicClient.getBlockNumber();
      const circleEvents = CIRCLEFLOW_ABI.filter((item: any) =>
        item.type === 'event' &&
        item.inputs.some((input: any) => input.name === 'groupId' && input.indexed),
      );
      const eventTopics = circleEvents.map((event: any) => toEventSelector(event));
      const groupIdTopic = encodeAbiParameters([{ type: 'uint256' }], [BigInt(idNum)]);
      const logs: CircleActivityLog[] = [];

      for (let fromBlock = ACTIVITY_START_BLOCK; fromBlock <= latestBlock; fromBlock += LOG_BLOCK_RANGE) {
        const toBlock =
          fromBlock + LOG_BLOCK_RANGE - 1n < latestBlock
            ? fromBlock + LOG_BLOCK_RANGE - 1n
            : latestBlock;
        const chunk = (await publicClient.request({
          method: 'eth_getLogs',
          params: [{
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            topics: [eventTopics, groupIdTopic],
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: `0x${toBlock.toString(16)}`,
          }],
        } as any)) as Array<{
          data: `0x${string}`;
          topics: [`0x${string}`, ...`0x${string}`[]];
          transactionHash: `0x${string}`;
          blockNumber: `0x${string}`;
          logIndex: `0x${string}`;
        }>;
        logs.push(
          ...chunk.map((log) => {
            const decoded = decodeEventLog({
              abi: CIRCLEFLOW_ABI as any,
              data: log.data,
              topics: log.topics,
              strict: false,
            }) as {
              eventName: string;
              args: CircleActivityLog['args'];
            };
            return {
              ...decoded,
              transactionHash: log.transactionHash,
              blockNumber: BigInt(log.blockNumber),
              logIndex: Number(BigInt(log.logIndex)),
            };
          }),
        );
      }

      return logs.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
        }
        return (b.logIndex ?? 0) - (a.logIndex ?? 0);
      });
    },
    refetchInterval: 60000,
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
        ) : isError ? (
          <div role="alert" className="py-12 px-6 text-center text-xs text-rose-300">
            Could not load Circle #{idNum} activity from Sepolia.
            <p className="mt-2 text-slate-400">
              {error instanceof Error ? error.message : 'The blockchain RPC request failed.'}
            </p>
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {logs.map((log, idx) => {
              const eventName = log.eventName;
              const txHash = log.transactionHash;
              const blockNumber = log.blockNumber;
              const member = log.args?.member || log.args?.creator;
              const amount = log.args?.amount || log.args?.reserveDeposited;

              return (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      <span className="text-emerald-400">{eventName}</span>
                    </div>

                    <div className="text-slate-400 text-[11px] space-x-2">
                      {member && (
                        <span>Member: <strong className="text-slate-300">{formatAddress(member)}</strong></span>
                      )}
                      {log.args?.recipient && (
                        <span>Recipient: <strong className="text-slate-300">{formatAddress(log.args.recipient)}</strong></span>
                      )}
                      {log.args?.roundNumber !== undefined && (
                        <span>Round: <strong className="text-slate-300">#{log.args.roundNumber.toString()}</strong></span>
                      )}
                      {amount !== undefined && (
                        <span>Amount: <strong className="text-emerald-300">{formatCFT(amount)}</strong></span>
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
