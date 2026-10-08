# CircleFlow — On-Chain Rotating Savings Protocol

> **Subtitle**: On-Chain Rotating Savings Protocol  
> **Network**: Ethereum Sepolia (Chain ID: `11155111`)  
> **Test Asset**: CircleFlow Token (`CFT`)  
> **Live Application**: [circle-flow.vercel.app](https://circle-flow.vercel.app/)

CircleFlow is a non-custodial, on-chain rotating savings protocol inspired by traditional African and global community savings circles (**Ajo**, **Esusu**, **Tandas**, **Chit Funds**, and **ROSCAs**).

In CircleFlow, a fixed group of participants (3, 4, or 5 members) commit to saving together. Each round, all members contribute an equal amount of CFT tokens into a pooled pot, and one member receives the entire pot according to a transparent, cryptographically secured payout order.

> [!IMPORTANT]
> **CircleFlow is NOT a lending platform.** Members do not take out loans, and no interest is charged. Participants simply save together in a rotating schedule with mathematically guaranteed solvency and on-chain collateral enforcement.

---

## ⚠️ Testnet Disclaimer & Security Limitations

> **Testnet Notice**: CircleFlow currently runs on Ethereum Sepolia and uses CFT as a test token. It has no real-world monetary value.

> [!WARNING]
> **Security Limitation**: CircleFlow can only protect obligations to the extent that sufficient security reserve is actually secured by the protocol. The reserve mechanism reduces counterparty/default risk; it does not create unlimited insurance or guarantee recovery beyond secured assets.

---

## 🏛️ Deployed & Verified Contracts (Ethereum Sepolia)

Both contracts are live and verified on the Ethereum Sepolia testnet:

| Contract | Address | Explorer Link | Etherscan Status |
| :--- | :--- | :--- | :--- |
| **CircleFlowToken (`CFT`)** | `0x4Fb8AFe76E931D44112CE4BFA2cBb801ED253805` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x4Fb8AFe76E931D44112CE4BFA2cBb801ED253805#code) | **Pass - Verified** |
| **CircleFlow Protocol** | `0xC403086b54EcE2148e3b520FA83896aBE70A5Bd2` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0xC403086b54EcE2148e3b520FA83896aBE70A5Bd2#code) | **Pass - Verified** |

- **Deployer Wallet**: `0x97184EBAEB9FDCe449d5FbaF1311601005F8E811`
- **Compiler**: Solidity `0.8.24` (`via_ir = true`, OpenZeppelin v5.0.2)
- **Multi-Platform Verification**: Verified on **Sepolia Etherscan** and **Sourcify**

---

## 💡 The Problem & The Solution

### The Problem
Traditional rotating savings circles (Ajo / Esusu / ROSCAs) operate purely on social trust:
1. **The Early Payout Default Risk**: The member who receives the pooled pot in Round 1 has already collected their lump sum. If they disappear or refuse to contribute to subsequent rounds, the later members bear the entire loss.
2. **Opaque & Biased Scheduling**: Organizers frequently grant early payouts to friends or preferred members, creating unfair structural advantages.
3. **Lack of Recourse**: In traditional settings, recovering funds from an early-round defaulter is difficult or impossible.

### The Solution
CircleFlow replaces social trust with **verifiable, self-executing smart contracts**:
1. **Dynamic Security Reserve Collateral**: Early payout recipients must lock an on-chain reserve that mathematically covers all their remaining future obligations:
   $$\text{RequiredReserve}(p) = (N - p) \times \text{contributionPerRound}$$
2. **Cryptographic Commit-Reveal Ordering**: The payout sequence is determined via trustless on-chain commit-reveal entropy and a deterministic Fisher-Yates shuffle. No creator or participant can manipulate the order.
3. **Automated Default Resolution**: If a post-payout member defaults past the grace period, their locked reserve is automatically drawn down by the contract to fund the pot for the scheduled recipient.
4. **Pre-Payout Default Protection**: If a member defaults before their payout, the contract safely refunds active contributors for that round, skips paying the defaulter, and smoothly advances to the next round without freezing.
5. **Decentralized Governance**: Active members can vote to remove unresponsive or malicious members with a $\ge 2/3$ supermajority vote.

---

## 🏗️ Architecture

CircleFlow operates with **strictly zero centralized backends**:

```
+-------------------------------------------------------------+
|                     React 18 Frontend                       |
|        TypeScript + Vite + Tailwind CSS + Lucide Icons      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|             wagmi v2 + viem + Reown AppKit                  |
|             TanStack Query (React Query)                    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|              Ethereum Sepolia (Chain ID 11155111)           |
|  +---------------------------+  +------------------------+  |
|  |   CircleFlow Protocol     |  | CircleFlow Token (CFT) |  |
|  |   Rotating Savings Engine |  | 1,000 CFT Faucet Asset |  |
|  +---------------------------+  +------------------------+  |
+-------------------------------------------------------------+
```

There are:
- **NO** Express or Node APIs
- **NO** PostgreSQL, MongoDB, Supabase, or Firebase
- **NO** centralized custody or server-side databases
- **NO** mock blockchain state or fabricated balances

---

## 🛡️ Core Protocol Rules

### 1. Configurable Group Sizes (3, 4, or 5 Members)
- Circle creator selects 3, 4, or 5 members.
- Total rounds strictly equals total members ($R = N$).

### 2. Constitution Immutability
- Once created and activated, contribution amounts, member counts, round duration, grace period, and late fee percentages are immutable.
- There are **no admin backdoors** or owner overrides.

### 3. Progressive Reserve Release
- As future rounds are funded, the member's remaining obligation decreases.
- Excess reserve above $(N - currentRound) \times \text{contribution}$ becomes progressively and permissionlessly withdrawable.
- Upon circle completion, 100% of unencumbered reserves are unlocked.

### 4. Bounded Faucet
- Testnet users can claim **1,000 CFT** once per wallet address.

---

## 🧪 Testing Suite & Invariant Verification

CircleFlow features 25 automated tests covering unit logic, complete lifecycles, and stateful fuzz invariants.

Run all tests:
```bash
cd contracts
forge test -vvv
```

### Test Results (25 / 25 Passing)
```
Ran 4 tests for test/CircleFlowToken.t.sol:CircleFlowTokenTest
[PASS] test_FaucetMultipleUsers() (gas: 172973)
[PASS] test_FaucetRevertsOnSecondClaim() (gas: 110034)
[PASS] test_FaucetSuccess() (gas: 95720)
[PASS] test_InitialSupply() (gas: 30643)

Ran 10 tests for test/CircleFlow.t.sol:CircleFlowTest
[PASS] test_CommitRevealAndPayoutOrderFinalization() (gas: 1272253)
[PASS] test_CreateGroup_4Members() (gas: 451690)
[PASS] test_CreateGroup_RevertsInvalidSize() (gas: 71846)
[PASS] test_FinalizePayoutOrder_RevertsInsufficientCoverage() (gas: 1045938)
[PASS] test_FullRotationCycle_3Members() (gas: 3386483)
[PASS] test_GracePeriodLateFee() (gas: 1659570)
[PASS] test_JoinGroup_RevertsWhenFull() (gas: 721922)
[PASS] test_JoinGroup_Success() (gas: 560641)
[PASS] test_PostPayoutDefaultUsesReserve() (gas: 2250587)
[PASS] test_RemovalProposalAndVoting() (gas: 1950633)

Ran 2 tests for test/CircleFlowInvariant.t.sol:CircleFlowInvariantTest
[PASS] testFuzz_CannotWithdrawProtectedReserve(uint256) (runs: 256)
[PASS] test_ContractSolvencyInvariant() (gas: 3096688)

Ran 9 tests for test/CircleFlowAudit.t.sol:CircleFlowAuditTest
[PASS] test_5MembersCircleFullCycle() (gas: 6882174)
[PASS] test_CannotAddMemberAfterActivation() (gas: 1502618)
[PASS] test_DuplicateContributionReverts() (gas: 1620349)
[PASS] test_InvalidRevealReverts() (gas: 760730)
[PASS] test_MultiRoundPostPayoutDefaultDrawdown() (gas: 3987205)
[PASS] test_MultipleEarlyPositionCandidates() (gas: 1571850)
[PASS] test_NonRevealTimeoutFinalization() (gas: 1227870)
[PASS] test_PrePayoutDefaultSafeRefundAndAdvancement() (gas: 2101594)
[PASS] test_RemovalGovernanceThresholds_5Members() (gas: 2782964)

Ran 4 test suites: 25 tests passed, 0 failed, 0 skipped (25 total tests)
```

### Protocol Solvency Invariant
$$\text{Balance}_{\text{contract}}(\text{CFT}) \ge \sum \text{MemberReserves} + \sum \text{RoundContributions}$$

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- An Ethereum Sepolia wallet (e.g. MetaMask) with Sepolia ETH for gas.

### 1. Clone the Repository
```bash
git clone https://github.com/CircleFlow/CircleFlow.git
cd CircleFlow
```

### 2. Smart Contract Setup & Compilation
```bash
cd contracts
forge install
forge build
forge test
```

### 3. Frontend Installation & Local Development
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
cd frontend
npm run build
```
The optimized production bundle will be generated in `frontend/dist/`.

---

## ⚙️ Environment Variables

### Root (`.env.example`) — For Deployment
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_API_KEY>
PRIVATE_KEY=<DEPLOYER_PRIVATE_KEY>
ETHERSCAN_API_KEY=<ETHERSCAN_API_KEY>
```

### Frontend (`frontend/.env.example`)
```env
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_API_KEY>
VITE_REOWN_PROJECT_ID=<REOWN_PROJECT_ID>
VITE_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
VITE_CIRCLEFLOW_TOKEN_ADDRESS=0x4Fb8AFe76E931D44112CE4BFA2cBb801ED253805
VITE_CIRCLEFLOW_CONTRACT_ADDRESS=0xC403086b54EcE2148e3b520FA83896aBE70A5Bd2
VITE_APP_URL=https://circle-flow.vercel.app
```

---

## 📖 End-to-End User Flow

1. **Get Test Tokens**:
   - Navigate to `/faucet` in the dApp.
   - Click **Claim 1,000 CFT Faucet** and sign the transaction in your wallet.
2. **Create or Join a Circle**:
   - **Create**: Navigate to `/groups/create`. Select group size (3, 4, or 5), round duration, contribution amount (e.g. 100 CFT), and initial security reserve. The app generates your entropy secret salt automatically.
   - **Join**: Find a forming circle on the `/dashboard`, review terms, deposit your reserve, and submit your commitment.
3. **Commit-Reveal Payout Order**:
   - Once all members have joined, each member reveals their secret salt with one click.
   - The contract shuffles positions in a trustless, deterministic manner.
   - If required, members top up their reserves to meet their specific assigned slot $(N - p) \times \text{contribution}$.
4. **Activate & Start Round 1**:
   - The creator calls `startCircle()`. Round 1 timer begins.
5. **Round Contributions & Payout**:
   - Every member calls `contribute(groupId)`.
   - Once the pot is full (or deadline passes), `executePayout(groupId)` sends the pooled pot directly to the scheduled member.
   - The contract automatically progresses to the next round.
6. **Reserve Withdrawal**:
   - As subsequent rounds are funded, members can withdraw excess reserve collateral from `/groups/:groupId`.
7. **Completion**:
   - After round $N$ completes, the circle transitions to `COMPLETED` and all remaining reserves are unlocked.

---

## 🔒 Security Best Practices

- **Checks-Effects-Interactions**: All state updates occur prior to token transfers.
- **SafeERC20**: OpenZeppelin's `safeTransfer` and `safeTransferFrom` prevent token transfer quirks.
- **ReentrancyGuard**: Applied to all deposit, contribution, payout, and withdrawal functions.
- **Zero Admin Backdoor**: No owner addresses, no fund confiscation functions.
- **Bounded Faucet**: Prevents balance manipulation on testnet.
- **Strict Error Handlers**: 27 custom Solidity errors mapped to human-readable user guides in the UI (`contractErrors.ts`).

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
