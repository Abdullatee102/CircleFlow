import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import {
  CIRCLEFLOW_CONTRACT_ADDRESS,
  CIRCLEFLOW_TOKEN_ADDRESS,
  CIRCLEFLOW_ABI,
  TOKEN_ABI,
  RPC_URL,
} from '../config/contracts';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

export interface CircleGroupData {
  id: bigint;
  creator: `0x${string}`;
  targetMembers: bigint | number;
  contributionPerRound: bigint;
  roundDuration: bigint;
  gracePeriod: bigint;
  lateFeePercent: bigint | number;
  status: number; // 0: CREATED, 1: FORMING, 2: ACTIVE, 3: COMPLETED, 4: CANCELLED
  currentRound: bigint;
  createdAt: bigint;
  activatedAt: bigint;
  completedAt: bigint;
  payoutOrderFinalized: boolean;
}

export interface RoundInfoData {
  roundNumber: bigint;
  startTime: bigint;
  contributionDeadline: bigint;
  gracePeriodEnd: bigint;
  totalCollected: bigint;
  lateFeesCollected: bigint;
  payoutExecuted: boolean;
  recipient: `0x${string}`;
}

export interface MemberInfoData {
  addr: `0x${string}`;
  status: number; // 0: NONE, 1: JOINED, 2: ACTIVE, 3: LATE, 4: DEFAULTED, 5: RESOLVED, 6: REMOVED, 7: COMPLETED
  reserveCommitted: bigint;
  reserveUsed: bigint;
  reserveWithdrawn: bigint;
  assignedPosition: bigint;
  secretCommitment: `0x${string}`;
  revealedSecret: `0x${string}`;
  hasRevealed: boolean;
}

export interface RemovalProposalData {
  id: bigint;
  targetMember: `0x${string}`;
  proposer: `0x${string}`;
  createdAt: bigint;
  deadline: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  executed: boolean;
}

// Hook: CFT Token Balance
export function useCFTBalance(address?: `0x${string}`) {
  const query = useReadContract({
    address: CIRCLEFLOW_TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 10000,
    },
  });
  return {
    ...query,
    data: query.data as bigint | undefined,
  };
}

// Hook: Has Claimed Faucet
export function useHasClaimedFaucet(address?: `0x${string}`) {
  const query = useReadContract({
    address: CIRCLEFLOW_TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'hasClaimedFaucet',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });
  return {
    ...query,
    data: query.data as boolean | undefined,
  };
}

// Hook: CFT Token Allowance
export function useCFTAllowance(owner?: `0x${string}`, spender = CIRCLEFLOW_CONTRACT_ADDRESS) {
  const query = useReadContract({
    address: CIRCLEFLOW_TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'allowance',
    args: owner ? [owner, spender] : undefined,
    query: {
      enabled: Boolean(owner),
      refetchInterval: 10000,
    },
  });
  return {
    ...query,
    data: query.data as bigint | undefined,
  };
}

// Hook: Group Data
export function useGroup(groupId: bigint | number) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getGroup',
    args: [BigInt(groupId)],
    query: {
      enabled: Boolean(groupId),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as CircleGroupData | undefined,
  };
}

// Hook: Group Members
export function useGroupMembers(groupId: bigint | number) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getGroupMembers',
    args: [BigInt(groupId)],
    query: {
      enabled: Boolean(groupId),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as `0x${string}`[] | undefined,
  };
}

// Hook: Finalized Payout Order
export function useFinalizedPayoutOrder(groupId: bigint | number) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getFinalizedPayoutOrder',
    args: [BigInt(groupId)],
    query: {
      enabled: Boolean(groupId),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as `0x${string}`[] | undefined,
  };
}

// Hook: Round Info
export function useRoundInfo(groupId: bigint | number, roundNumber: bigint | number) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getRoundInfo',
    args: [BigInt(groupId), BigInt(roundNumber)],
    query: {
      enabled: Boolean(groupId) && Boolean(roundNumber),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as RoundInfoData | undefined,
  };
}

// Hook: Member Info
export function useMemberInfo(groupId: bigint | number, memberAddress?: `0x${string}`) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getMemberInfo',
    args: memberAddress ? [BigInt(groupId), memberAddress] : undefined,
    query: {
      enabled: Boolean(groupId) && Boolean(memberAddress),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as MemberInfoData | undefined,
  };
}

// Hook: Withdrawable Reserve
export function useWithdrawableReserve(groupId: bigint | number, memberAddress?: `0x${string}`) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getWithdrawableReserve',
    args: memberAddress ? [BigInt(groupId), memberAddress] : undefined,
    query: {
      enabled: Boolean(groupId) && Boolean(memberAddress),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as bigint | undefined,
  };
}

// Hook: Required Reserve
export function useRequiredReserve(groupId: bigint | number, memberAddress?: `0x${string}`) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getRequiredReserve',
    args: memberAddress ? [BigInt(groupId), memberAddress] : undefined,
    query: {
      enabled: Boolean(groupId) && Boolean(memberAddress),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as bigint | undefined,
  };
}

// Hook: Has Contributed in Round
export function useHasContributed(
  groupId: bigint | number,
  roundNumber: bigint | number,
  memberAddress?: `0x${string}`
) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'hasContributed',
    args: memberAddress ? [BigInt(groupId), BigInt(roundNumber), memberAddress] : undefined,
    query: {
      enabled: Boolean(groupId) && Boolean(roundNumber) && Boolean(memberAddress),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as boolean | undefined,
  };
}

// Hook: Removal Proposal
export function useRemovalProposal(groupId: bigint | number, proposalId: bigint | number) {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'getRemovalProposal',
    args: [BigInt(groupId), BigInt(proposalId)],
    query: {
      enabled: Boolean(groupId) && Boolean(proposalId),
      refetchInterval: 8000,
    },
  });
  return {
    ...query,
    data: query.data as RemovalProposalData | undefined,
  };
}

// Hook: Next Group ID
export function useNextGroupId() {
  const query = useReadContract({
    address: CIRCLEFLOW_CONTRACT_ADDRESS,
    abi: CIRCLEFLOW_ABI,
    functionName: 'nextGroupId',
    query: {
      refetchInterval: 10000,
    },
  });
  return {
    ...query,
    data: query.data as bigint | undefined,
  };
}

// Hook: Fetch all existing circles on Sepolia
export function useAllCircles() {
  const { data: nextId, isLoading: isNextLoading } = useNextGroupId();

  return useQuery({
    queryKey: ['allCircles', nextId?.toString()],
    enabled: Boolean(nextId && (nextId as bigint) > 1n),
    queryFn: async () => {
      if (!nextId || (nextId as bigint) <= 1n) return [];
      const total = Number(nextId) - 1;
      const promises = [];
      for (let i = 1; i <= total; i++) {
        promises.push(
          publicClient.readContract({
            address: CIRCLEFLOW_CONTRACT_ADDRESS,
            abi: CIRCLEFLOW_ABI as any,
            functionName: 'getGroup',
            args: [BigInt(i)],
          })
        );
      }
      const results = await Promise.all(promises);
      return results as CircleGroupData[];
    },
    refetchInterval: 10000,
  });
}

