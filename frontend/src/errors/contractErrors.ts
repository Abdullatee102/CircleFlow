export interface ParsedContractError {
  title: string;
  message: string;
  action: string;
  raw?: string;
}

const ERROR_MAP: Record<string, { title: string; message: string; action: string }> = {
  InsufficientReserveCoverage: {
    title: "Insufficient reserve coverage",
    message: "Your Circle currently does not have enough committed security reserve to safely support the selected contribution and payout arrangement.",
    action: "Increase your reserve commitment, reduce the contribution amount, or adjust the Circle configuration."
  },
  ProtectedReserve: {
    title: "Protected reserve locked",
    message: "Your reserve is still protecting an outstanding future obligation. You cannot withdraw this amount yet.",
    action: "It will become available after your remaining round obligations are satisfied or properly resolved."
  },
  AlreadyContributed: {
    title: "Contribution already made",
    message: "You have already contributed for this round.",
    action: "Wait for the current round to complete and the next round to open."
  },
  ContributionWindowClosed: {
    title: "Contribution window closed",
    message: "The contribution deadline and grace period have expired for this round.",
    action: "Check the round status and resolve any default actions."
  },
  PayoutNotReady: {
    title: "Payout is not ready yet",
    message: "The round has not satisfied all conditions required before the scheduled payout can be released.",
    action: "Ensure all member contributions or reserve-backed default resolutions are completed."
  },
  PayoutOrderNotFinalized: {
    title: "Payout order still pending",
    message: "The payout order is still being finalized. The Circle is not ready to start contributions yet.",
    action: "Ensure all members reveal their commitments or wait for the reveal window to conclude."
  },
  GroupFull: {
    title: "This Circle is full",
    message: "This Circle has reached its configured member capacity.",
    action: "Explore other forming circles or create a new one."
  },
  CannotAddMemberAfterActivation: {
    title: "Circle already started",
    message: "This Circle has already started and cannot accept new members after activation.",
    action: "Explore forming circles or start a new cycle."
  },
  MemberAlreadyDefaulted: {
    title: "Member already defaulted",
    message: "This member has already been marked as defaulted for this obligation.",
    action: "No duplicate default action is required."
  },
  RemovalThresholdNotMet: {
    title: "Removal was not approved",
    message: "The required threshold of eligible members (at least 2/3) did not vote in favor of removal.",
    action: "Review proposal results or submit another proposal if conditions change."
  },
  InvalidGroupSize: {
    title: "Invalid group size",
    message: "CircleFlow supports rotating circles of 3, 4, or 5 members only.",
    action: "Select 3, 4, or 5 members during circle creation."
  },
  GroupNotForming: {
    title: "Circle not in forming stage",
    message: "This action is only permitted while the Circle is forming.",
    action: "Verify current circle status."
  },
  NotMember: {
    title: "Wallet not in Circle",
    message: "Your connected wallet is not a registered member of this Circle.",
    action: "Join the circle or switch to your participating wallet."
  },
  NotActiveMember: {
    title: "Inactive member status",
    message: "Only active members in good standing can perform this action.",
    action: "Check your membership status."
  },
  TargetCannotVote: {
    title: "Voter conflict of interest",
    message: "The subject of a removal proposal cannot vote on their own removal.",
    action: "Only independent active members can vote."
  },
  AlreadyVoted: {
    title: "Vote already recorded",
    message: "You have already cast your vote on this proposal.",
    action: "Wait for the voting window to close."
  },
  VotingPeriodEnded: {
    title: "Voting period concluded",
    message: "The deadline for voting on this proposal has passed.",
    action: "Execute the proposal to finalize the result."
  },
  NothingToWithdraw: {
    title: "Nothing to withdraw",
    message: "You currently have 0 withdrawable security reserve.",
    action: "Reserves remain locked while protecting active obligations."
  },
  AlreadyClaimed: {
    title: "Faucet already claimed",
    message: "You have already claimed your 1,000 CFT test allocation from this wallet.",
    action: "Each wallet is limited to one faucet claim."
  },
  MemberDefaultedCannotReceivePayout: {
    title: "Defaulted member cannot receive payout",
    message: "A member who defaulted before their scheduled payout is ineligible to receive the pooled funds.",
    action: "The round must be resolved deterministically under CircleFlow protocol rules."
  }
};

export const parseContractError = (err: any): ParsedContractError => {
  const errMsg = err?.message || String(err || '');
  const data = err?.data || err?.error?.data;

  // Check known custom errors in error message
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (errMsg.includes(key) || (typeof data === 'string' && data.includes(key))) {
      return { ...val, raw: errMsg };
    }
  }

  // Handle common wallet / network errors
  if (errMsg.includes('User rejected') || errMsg.includes('user rejected') || errMsg.includes('ACTION_REJECTED')) {
    return {
      title: 'Transaction cancelled',
      message: 'You rejected the transaction in your wallet.',
      action: 'Try again when you are ready to sign.',
      raw: errMsg
    };
  }

  if (errMsg.includes('insufficient funds') || errMsg.includes('exceeds balance')) {
    return {
      title: 'Insufficient ETH for gas',
      message: 'Your wallet does not have enough Sepolia ETH to pay for transaction gas fees.',
      action: 'Obtain testnet Sepolia ETH from a faucet.',
      raw: errMsg
    };
  }

  if (errMsg.includes('ChainMismatchError') || errMsg.includes('wrong network') || errMsg.includes('Unsupported chain')) {
    return {
      title: 'Wrong network',
      message: 'CircleFlow runs on Ethereum Sepolia (Chain ID 11155111).',
      action: 'Switch your wallet to Ethereum Sepolia to continue.',
      raw: errMsg
    };
  }

  return {
    title: 'Transaction failed',
    message: 'The blockchain transaction could not be completed.',
    action: 'Check your token allowance, reserve balance, or transaction parameters.',
    raw: errMsg
  };
};

