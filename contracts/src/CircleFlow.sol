// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CircleFlow
 * @notice On-Chain Rotating Savings Protocol inspired by traditional Ajo / Esusu / ROSCA circles.
 * @dev Manages rotating savings circles with trustless financial security reserves, fair on-chain
 *      commit-reveal payout sequencing, dynamic collateralization, automated default handling,
 *      and decentralized removal governance.
 */
contract CircleFlow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- ENUMS ---

    enum GroupStatus {
        CREATED,
        FORMING,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    enum RoundStatus {
        UPCOMING,
        OPEN,
        GRACE_PERIOD,
        FINALIZABLE,
        PAYOUT_COMPLETED,
        CANCELLED
    }

    enum MemberStatus {
        NONE,
        JOINED,
        ACTIVE,
        LATE,
        DEFAULTED,
        RESOLVED,
        REMOVED,
        COMPLETED
    }

    // --- STRUCTS ---

    struct CircleGroup {
        uint256 id;
        address creator;
        uint256 targetMembers;
        uint256 contributionPerRound;
        uint256 roundDuration;
        uint256 gracePeriod;
        uint256 lateFeePercent; // In basis points (e.g., 100 = 1%)
        GroupStatus status;
        uint256 currentRound;
        uint256 createdAt;
        uint256 activatedAt;
        uint256 completedAt;
        bool payoutOrderFinalized;
    }

    struct RoundInfo {
        uint256 roundNumber;
        uint256 startTime;
        uint256 contributionDeadline;
        uint256 gracePeriodEnd;
        uint256 totalCollected;
        uint256 lateFeesCollected;
        bool payoutExecuted;
        address recipient;
    }

    struct MemberInfo {
        address addr;
        MemberStatus status;
        uint256 reserveCommitted;
        uint256 reserveUsed;
        uint256 reserveWithdrawn;
        uint256 assignedPosition; // 1-indexed (1 to targetMembers)
        bytes32 secretCommitment;
        bytes32 revealedSecret;
        bool hasRevealed;
    }

    struct RemovalProposal {
        uint256 id;
        address targetMember;
        address proposer;
        uint256 createdAt;
        uint256 deadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
    }

    // --- CUSTOM ERRORS ---

    error InvalidGroupSize();
    error GroupNotForming();
    error GroupAlreadyActive();
    error GroupNotActive();
    error GroupFull();
    error MemberAlreadyJoined();
    error NotMember();
    error NotActiveMember();
    error InvalidContributionAmount();
    error AlreadyContributed();
    error ContributionWindowClosed();
    error ContributionDeadlineNotReached();
    error GracePeriodActive();
    error MemberAlreadyDefaulted();
    error InsufficientReserveCoverage();
    error ProtectedReserve();
    error InsufficientAvailableBalance();
    error PayoutNotReady();
    error PayoutAlreadyExecuted();
    error RoundAlreadyCompleted();
    error InvalidPayoutOrder();
    error PayoutOrderNotFinalized();
    error CannotAddMemberAfterActivation();
    error CannotChangeConstitution();
    error Unauthorized();
    error InvalidRemovalProposal();
    error AlreadyVoted();
    error TargetCannotVote();
    error VotingPeriodActive();
    error VotingPeriodEnded();
    error RemovalThresholdNotMet();
    error GroupNotCancelled();
    error CommitmentAlreadySubmitted();
    error RevealWindowNotOpen();
    error RevealPeriodEnded();
    error InvalidSecret();
    error SecretAlreadyRevealed();
    error NotAllMembersCommitted();
    error PayoutOrderAlreadyFinalized();
    error ProposalAlreadyExists();
    error ProposalNotActive();
    error TargetNotDefaulted();
    error MemberDefaultedCannotReceivePayout();
    error NothingToWithdraw();

    // --- EVENTS ---

    event GroupCreated(
        uint256 indexed groupId,
        address indexed creator,
        uint256 targetMembers,
        uint256 contributionPerRound,
        uint256 roundDuration,
        uint256 gracePeriod,
        uint256 lateFeePercent
    );
    event MemberJoined(uint256 indexed groupId, address indexed member, uint256 reserveDeposited);
    event GroupStarted(uint256 indexed groupId, uint256 totalMembers, uint256 startTime);
    event ContributionMade(
        uint256 indexed groupId, uint256 indexed roundNumber, address indexed member, uint256 amount, uint256 lateFee
    );
    event MemberMarkedLate(uint256 indexed groupId, uint256 indexed roundNumber, address indexed member);
    event MemberDefaulted(uint256 indexed groupId, uint256 indexed roundNumber, address indexed member);
    event LateFeePaid(uint256 indexed groupId, uint256 indexed roundNumber, address indexed member, uint256 amount);
    event SecurityReserveDeposited(
        uint256 indexed groupId, address indexed member, uint256 amount, uint256 totalCommitted
    );
    event SecurityReserveLocked(uint256 indexed groupId, address indexed member, uint256 amount);
    event SecurityReserveUsed(
        uint256 indexed groupId, uint256 indexed roundNumber, address indexed member, uint256 amount
    );
    event SecurityReserveReleased(uint256 indexed groupId, address indexed member, uint256 amount);
    event PayoutOrderCommitted(uint256 indexed groupId, address indexed member, bytes32 commitment);
    event PayoutOrderRevealed(uint256 indexed groupId, address indexed member, bytes32 secret);
    event PayoutOrderFinalized(uint256 indexed groupId, address[] payoutOrder);
    event RemovalProposalCreated(
        uint256 indexed groupId,
        uint256 indexed proposalId,
        address indexed targetMember,
        address proposer,
        uint256 deadline
    );
    event RemovalVoteCast(uint256 indexed groupId, uint256 indexed proposalId, address indexed voter, bool support);
    event MemberRemoved(uint256 indexed groupId, address indexed member);
    event RoundOpened(uint256 indexed groupId, uint256 indexed roundNumber, uint256 deadline, uint256 gracePeriodEnd);
    event RoundFinalizable(uint256 indexed groupId, uint256 indexed roundNumber);
    event PayoutExecuted(
        uint256 indexed groupId, uint256 indexed roundNumber, address indexed recipient, uint256 amount
    );
    event RoundCompleted(uint256 indexed groupId, uint256 indexed roundNumber);
    event DefaultedPayoutSkipped(uint256 indexed groupId, uint256 indexed roundNumber, address indexed recipient);
    event RoundContributionRefunded(
        uint256 indexed groupId, uint256 indexed roundNumber, address indexed member, uint256 amount
    );
    event GroupCompleted(uint256 indexed groupId);
    event GroupCancelled(uint256 indexed groupId);

    // --- STATE VARIABLES ---

    IERC20 public immutable token;
    uint256 public nextGroupId = 1;

    /// @dev Default removal proposal voting duration: 3 days
    uint256 public constant REMOVAL_VOTING_PERIOD = 3 days;

    /// @dev Reveal window duration after all members join: 24 hours
    uint256 public constant REVEAL_WINDOW_DURATION = 24 hours;

    // groupId => CircleGroup
    mapping(uint256 => CircleGroup) public groups;

    // groupId => array of member addresses in order of joining
    mapping(uint256 => address[]) internal groupMembers;

    // groupId => member address => MemberInfo
    mapping(uint256 => mapping(address => MemberInfo)) public members;

    // groupId => roundNumber (1-indexed) => RoundInfo
    mapping(uint256 => mapping(uint256 => RoundInfo)) public rounds;

    // groupId => roundNumber => member address => contributed boolean
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasContributed;

    // groupId => roundNumber => member address => marked late boolean
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public isMarkedLate;

    // groupId => roundNumber => member address => defaulted boolean
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public isMarkedDefaulted;

    // groupId => finalized payout order (array of addresses: index 0 is round 1 recipient, etc.)
    mapping(uint256 => address[]) internal finalizedPayoutOrder;

    // groupId => timestamp when all target members joined
    mapping(uint256 => uint256) public allMembersJoinedAt;

    // Removal proposals: groupId => proposal count
    mapping(uint256 => uint256) public proposalCount;
    // groupId => proposalId => RemovalProposal
    mapping(uint256 => mapping(uint256 => RemovalProposal)) public removalProposals;
    // groupId => proposalId => voter address => voted boolean
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVotedRemoval;
    // groupId => target address => has active proposal
    mapping(uint256 => mapping(address => bool)) public hasActiveProposal;

    constructor(address _tokenAddress) {
        if (_tokenAddress == address(0)) revert Unauthorized();
        token = IERC20(_tokenAddress);
    }

    // --- GROUP CREATION & JOINING ---

    /**
     * @notice Create a new savings circle
     * @param targetMembers Allowed group size: 3, 4, or 5 members
     * @param contributionPerRound The fixed contribution required from each member per round
     * @param roundDuration Duration of each round's standard contribution window
     * @param gracePeriod Duration after deadline where late contribution is accepted with penalty
     * @param lateFeePercent Penalty in basis points (e.g., 100 = 1%)
     * @param initialReserveDeposit Amount of CFT deposited as creator's initial security reserve commitment
     * @param secretCommitment Hash of creator's secret: keccak256(abi.encodePacked(secret, msg.sender))
     * @return groupId The created circle identifier
     */
    function createGroup(
        uint256 targetMembers,
        uint256 contributionPerRound,
        uint256 roundDuration,
        uint256 gracePeriod,
        uint256 lateFeePercent,
        uint256 initialReserveDeposit,
        bytes32 secretCommitment
    ) external nonReentrant returns (uint256 groupId) {
        if (targetMembers < 3 || targetMembers > 5) revert InvalidGroupSize();
        if (contributionPerRound == 0) revert InvalidContributionAmount();
        if (roundDuration < 1 hours || gracePeriod < 15 minutes) revert CannotChangeConstitution();

        groupId = nextGroupId++;

        CircleGroup storage group = groups[groupId];
        group.id = groupId;
        group.creator = msg.sender;
        group.targetMembers = targetMembers;
        group.contributionPerRound = contributionPerRound;
        group.roundDuration = roundDuration;
        group.gracePeriod = gracePeriod;
        group.lateFeePercent = lateFeePercent;
        group.status = GroupStatus.FORMING;
        group.createdAt = block.timestamp;

        // Register creator as first member
        groupMembers[groupId].push(msg.sender);
        MemberInfo storage member = members[groupId][msg.sender];
        member.addr = msg.sender;
        member.status = MemberStatus.JOINED;
        member.secretCommitment = secretCommitment;

        emit GroupCreated(
            groupId, msg.sender, targetMembers, contributionPerRound, roundDuration, gracePeriod, lateFeePercent
        );

        if (secretCommitment != bytes32(0)) {
            emit PayoutOrderCommitted(groupId, msg.sender, secretCommitment);
        }

        if (initialReserveDeposit > 0) {
            token.safeTransferFrom(msg.sender, address(this), initialReserveDeposit);
            member.reserveCommitted = initialReserveDeposit;
            emit SecurityReserveDeposited(groupId, msg.sender, initialReserveDeposit, initialReserveDeposit);
        }

        emit MemberJoined(groupId, msg.sender, initialReserveDeposit);
    }

    /**
     * @notice Join an existing forming savings circle
     * @param groupId The circle identifier
     * @param reserveDeposit Initial security reserve commitment deposited in CFT
     * @param secretCommitment Hash of member's secret: keccak256(abi.encodePacked(secret, msg.sender))
     */
    function joinGroup(uint256 groupId, uint256 reserveDeposit, bytes32 secretCommitment) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.FORMING) {
            if (group.status == GroupStatus.ACTIVE) revert CannotAddMemberAfterActivation();
            revert GroupNotForming();
        }
        if (groupMembers[groupId].length >= group.targetMembers) revert GroupFull();
        if (members[groupId][msg.sender].status != MemberStatus.NONE) revert MemberAlreadyJoined();

        groupMembers[groupId].push(msg.sender);
        MemberInfo storage member = members[groupId][msg.sender];
        member.addr = msg.sender;
        member.status = MemberStatus.JOINED;
        member.secretCommitment = secretCommitment;

        if (secretCommitment != bytes32(0)) {
            emit PayoutOrderCommitted(groupId, msg.sender, secretCommitment);
        }

        if (reserveDeposit > 0) {
            token.safeTransferFrom(msg.sender, address(this), reserveDeposit);
            member.reserveCommitted = reserveDeposit;
            emit SecurityReserveDeposited(groupId, msg.sender, reserveDeposit, reserveDeposit);
        }

        emit MemberJoined(groupId, msg.sender, reserveDeposit);

        if (groupMembers[groupId].length == group.targetMembers) {
            allMembersJoinedAt[groupId] = block.timestamp;
        }
    }

    /**
     * @notice Deposit additional security reserve while group is still forming
     * @param groupId The circle identifier
     * @param additionalAmount Additional CFT to deposit into the member's reserve
     */
    function depositAdditionalReserve(uint256 groupId, uint256 additionalAmount) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.FORMING) revert GroupNotForming();
        MemberInfo storage member = members[groupId][msg.sender];
        if (member.status == MemberStatus.NONE) revert NotMember();
        if (additionalAmount == 0) revert InvalidContributionAmount();

        token.safeTransferFrom(msg.sender, address(this), additionalAmount);
        member.reserveCommitted += additionalAmount;

        emit SecurityReserveDeposited(groupId, msg.sender, additionalAmount, member.reserveCommitted);
    }

    /**
     * @notice Update or submit commit-reveal secret commitment during FORMING
     * @param groupId The circle identifier
     * @param secretCommitment keccak256(abi.encodePacked(secret, msg.sender))
     */
    function commitPayoutSecret(uint256 groupId, bytes32 secretCommitment) external {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.FORMING) revert GroupNotForming();
        MemberInfo storage member = members[groupId][msg.sender];
        if (member.status == MemberStatus.NONE) revert NotMember();
        if (secretCommitment == bytes32(0)) revert InvalidSecret();

        member.secretCommitment = secretCommitment;
        emit PayoutOrderCommitted(groupId, msg.sender, secretCommitment);
    }

    /**
     * @notice Reveal secret for fair payout sequence derivation
     * @param groupId The circle identifier
     * @param secret The pre-image secret such that keccak256(abi.encodePacked(secret, msg.sender)) matches
     */
    function revealPayoutSecret(uint256 groupId, bytes32 secret) external {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.FORMING) revert GroupNotForming();
        if (groupMembers[groupId].length < group.targetMembers) revert RevealWindowNotOpen();

        MemberInfo storage member = members[groupId][msg.sender];
        if (member.status == MemberStatus.NONE) revert NotMember();
        if (member.hasRevealed) revert SecretAlreadyRevealed();
        if (keccak256(abi.encodePacked(secret, msg.sender)) != member.secretCommitment) revert InvalidSecret();

        member.revealedSecret = secret;
        member.hasRevealed = true;

        emit PayoutOrderRevealed(groupId, msg.sender, secret);
    }

    // --- FAIR PAYOUT ORDER RESOLUTION & ACTIVATION ---

    /**
     * @notice Finalize the payout order fairly using commit-reveal entropy and reserve capacity
     * @param groupId The circle identifier
     */
    function finalizePayoutOrder(uint256 groupId) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.FORMING) revert GroupNotForming();
        if (group.payoutOrderFinalized) revert PayoutOrderAlreadyFinalized();
        uint256 n = group.targetMembers;
        if (groupMembers[groupId].length < n) revert GroupNotForming();

        // Reveal window check: either all members revealed, or REVEAL_WINDOW_DURATION has elapsed
        uint256 joinedAt = allMembersJoinedAt[groupId];
        bool allRevealed = true;
        for (uint256 i = 0; i < n; i++) {
            if (!members[groupId][groupMembers[groupId][i]].hasRevealed) {
                allRevealed = false;
                break;
            }
        }

        if (!allRevealed && block.timestamp < joinedAt + REVEAL_WINDOW_DURATION) {
            revert RevealWindowNotOpen();
        }

        // Derive deterministic randomness seed from revealed secrets (with fallback for non-revealers)
        bytes32 combinedSeed = keccak256(abi.encodePacked(groupId, block.chainid, n));
        for (uint256 i = 0; i < n; i++) {
            address mAddr = groupMembers[groupId][i];
            MemberInfo storage m = members[groupId][mAddr];
            if (m.hasRevealed) {
                combinedSeed = keccak256(abi.encodePacked(combinedSeed, m.revealedSecret, mAddr));
            } else {
                // Deterministic fallback for non-revealers
                combinedSeed = keccak256(abi.encodePacked(combinedSeed, m.secretCommitment, mAddr, i));
            }
        }

        // Determine assignment:
        // Position p (1-indexed from 1 to n) requires: (n - p) * contributionPerRound
        // We order positions 1 to n. Position 1 requires highest reserve: (n - 1) * contributionPerRound
        // Every assigned member MUST have reserveCommitted >= (n - p) * contributionPerRound.
        // If multiple members qualify for a position, resolve competition fairly via combinedSeed!

        address[] memory order = _computeFairPayoutOrder(groupId, combinedSeed);

        // Validate final financial soundness
        for (uint256 p = 1; p <= n; p++) {
            address mAddr = order[p - 1];
            uint256 required = (n - p) * group.contributionPerRound;
            if (members[groupId][mAddr].reserveCommitted < required) {
                revert InsufficientReserveCoverage();
            }
            members[groupId][mAddr].assignedPosition = p;
        }

        finalizedPayoutOrder[groupId] = order;
        group.payoutOrderFinalized = true;

        emit PayoutOrderFinalized(groupId, order);
    }

    /**
     * @dev Internal helper to match members to positions based on reserve coverage and fair seed
     */
    function _computeFairPayoutOrder(uint256 groupId, bytes32 seed) internal view returns (address[] memory) {
        CircleGroup storage group = groups[groupId];
        uint256 n = group.targetMembers;
        uint256 contrib = group.contributionPerRound;

        address[] memory candidateList = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            candidateList[i] = groupMembers[groupId][i];
        }

        // Shuffle candidates with seed (Fisher-Yates) to get fair initial permutation
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 swapIdx = uint256(keccak256(abi.encodePacked(seed, i))) % (i + 1);
            address temp = candidateList[i];
            candidateList[i] = candidateList[swapIdx];
            candidateList[swapIdx] = temp;
        }

        // Now assign positions 1 to n.
        // For position p = 1 .. n:
        // We pick from remaining available candidates the candidate that qualifies (reserve >= (n - p) * contrib).
        // Since candidates were fairly randomized, we select the first eligible candidate in candidateList.
        address[] memory finalOrder = new address[](n);
        bool[] memory used = new bool[](n);

        for (uint256 p = 1; p <= n; p++) {
            uint256 requiredReserve = (n - p) * contrib;
            bool found = false;

            for (uint256 i = 0; i < n; i++) {
                if (!used[i]) {
                    address mAddr = candidateList[i];
                    if (members[groupId][mAddr].reserveCommitted >= requiredReserve) {
                        finalOrder[p - 1] = mAddr;
                        used[i] = true;
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                // No remaining candidate has enough reserve to cover position p!
                revert InsufficientReserveCoverage();
            }
        }

        return finalOrder;
    }

    /**
     * @notice Start the circle and begin Round 1
     * @param groupId The circle identifier
     */
    function startGroup(uint256 groupId) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.FORMING) revert GroupNotForming();
        if (!group.payoutOrderFinalized) revert PayoutOrderNotFinalized();

        uint256 n = group.targetMembers;

        // Transition members and group to ACTIVE
        group.status = GroupStatus.ACTIVE;
        group.activatedAt = block.timestamp;
        group.currentRound = 1;

        for (uint256 i = 0; i < n; i++) {
            address mAddr = groupMembers[groupId][i];
            members[groupId][mAddr].status = MemberStatus.ACTIVE;

            // Emit locked reserve event for required amount
            uint256 p = members[groupId][mAddr].assignedPosition;
            uint256 req = (n - p) * group.contributionPerRound;
            emit SecurityReserveLocked(groupId, mAddr, req);
        }

        // Initialize Round 1
        RoundInfo storage round = rounds[groupId][1];
        round.roundNumber = 1;
        round.startTime = block.timestamp;
        round.contributionDeadline = block.timestamp + group.roundDuration;
        round.gracePeriodEnd = round.contributionDeadline + group.gracePeriod;
        round.recipient = finalizedPayoutOrder[groupId][0];

        emit GroupStarted(groupId, n, block.timestamp);
        emit RoundOpened(groupId, 1, round.contributionDeadline, round.gracePeriodEnd);
    }

    // --- ROUND CONTRIBUTIONS ---

    /**
     * @notice Contribute to the current active round
     * @param groupId The circle identifier
     */
    function contribute(uint256 groupId) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.ACTIVE) revert GroupNotActive();

        uint256 r = group.currentRound;
        RoundInfo storage round = rounds[groupId][r];
        MemberInfo storage member = members[groupId][msg.sender];

        if (member.status != MemberStatus.ACTIVE && member.status != MemberStatus.LATE) {
            revert NotActiveMember();
        }
        if (hasContributed[groupId][r][msg.sender]) revert AlreadyContributed();

        uint256 requiredAmount = group.contributionPerRound;
        uint256 lateFee = 0;

        if (block.timestamp <= round.contributionDeadline) {
            // Normal contribution window
        } else if (block.timestamp <= round.gracePeriodEnd) {
            // In grace period: apply late fee
            lateFee = (group.contributionPerRound * group.lateFeePercent) / 10000;
            if (!isMarkedLate[groupId][r][msg.sender]) {
                isMarkedLate[groupId][r][msg.sender] = true;
                member.status = MemberStatus.LATE;
                emit MemberMarkedLate(groupId, r, msg.sender);
            }
        } else {
            // Contribution window has completely closed!
            revert ContributionWindowClosed();
        }

        hasContributed[groupId][r][msg.sender] = true;
        round.totalCollected += requiredAmount;

        // Transfer contribution
        token.safeTransferFrom(msg.sender, address(this), requiredAmount + lateFee);

        emit ContributionMade(groupId, r, msg.sender, requiredAmount, lateFee);

        if (lateFee > 0) {
            round.lateFeesCollected += lateFee;
            emit LateFeePaid(groupId, r, msg.sender, lateFee);
            // Revert member back to ACTIVE if they were LATE
            member.status = MemberStatus.ACTIVE;
        }

        // Check if round is now fully collected
        if (_isRoundFullyCollected(groupId, r)) {
            emit RoundFinalizable(groupId, r);
        }
    }

    // --- DEFAULT HANDLING ---

    /**
     * @notice Permissionless transition to mark a member as DEFAULTED if contribution window expired
     * @param groupId The circle identifier
     * @param roundNumber The round index
     * @param target The member address
     */
    function markMemberDefaulted(uint256 groupId, uint256 roundNumber, address target) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.ACTIVE) revert GroupNotActive();
        if (roundNumber != group.currentRound) revert RoundAlreadyCompleted();

        RoundInfo storage round = rounds[groupId][roundNumber];
        if (block.timestamp <= round.gracePeriodEnd) revert GracePeriodActive();

        MemberInfo storage member = members[groupId][target];
        if (member.status == MemberStatus.NONE) revert NotMember();
        if (isMarkedDefaulted[groupId][roundNumber][target]) {
            revert MemberAlreadyDefaulted();
        }
        if (hasContributed[groupId][roundNumber][target]) revert AlreadyContributed();

        isMarkedDefaulted[groupId][roundNumber][target] = true;
        member.status = MemberStatus.DEFAULTED;

        emit MemberDefaulted(groupId, roundNumber, target);

        // If member already received their payout in an earlier round (post-payout default),
        // protocol deterministically consumes their locked security reserve to fulfill the round obligation!
        if (member.assignedPosition < roundNumber) {
            uint256 needed = group.contributionPerRound;
            uint256 availableReserve = member.reserveCommitted > (member.reserveUsed + member.reserveWithdrawn)
                ? member.reserveCommitted - (member.reserveUsed + member.reserveWithdrawn)
                : 0;

            uint256 toUse = needed <= availableReserve ? needed : availableReserve;
            if (toUse > 0) {
                member.reserveUsed += toUse;
                round.totalCollected += toUse;
                hasContributed[groupId][roundNumber][target] = true;
                emit SecurityReserveUsed(groupId, roundNumber, target, toUse);
            }
        }

        if (_isRoundFullyCollected(groupId, roundNumber)) {
            emit RoundFinalizable(groupId, roundNumber);
        }
    }

    /**
     * @dev Checks if all non-defaulted contributions (and reserve-backed defaults) have been satisfied
     */
    function _isRoundFullyCollected(uint256 groupId, uint256 roundNumber) internal view returns (bool) {
        CircleGroup storage group = groups[groupId];
        uint256 n = group.targetMembers;
        for (uint256 i = 0; i < n; i++) {
            address mAddr = groupMembers[groupId][i];
            MemberInfo storage m = members[groupId][mAddr];
            // If member is defaulted or removed before their payout, they do not block round finalization
            if (
                (m.status == MemberStatus.DEFAULTED || m.status == MemberStatus.REMOVED)
                    && m.assignedPosition >= roundNumber
            ) {
                continue;
            }
            if (!hasContributed[groupId][roundNumber][mAddr]) {
                return false;
            }
        }
        return true;
    }

    // --- PAYOUT EXECUTION ---

    /**
     * @notice Execute payout for the current round
     * @dev HARD RULE: scheduled recipient must have sufficient security reserve covering all remaining obligations.
     *      If scheduled recipient defaulted/removed prior to payout, refunds contributing members and advances rotation.
     * @param groupId The circle identifier
     */
    function executePayout(uint256 groupId) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.ACTIVE) revert GroupNotActive();

        uint256 r = group.currentRound;
        RoundInfo storage round = rounds[groupId][r];
        if (round.payoutExecuted) revert PayoutAlreadyExecuted();

        // Round must be ready for payout
        if (!_isRoundFullyCollected(groupId, r)) revert PayoutNotReady();

        address recipient = finalizedPayoutOrder[groupId][r - 1];
        MemberInfo storage recipientInfo = members[groupId][recipient];

        // Pre-payout defaulted or removed members cannot receive payout!
        // Deterministic safe resolution: refund active round contributors, skip payout, advance round
        if (recipientInfo.status == MemberStatus.DEFAULTED || recipientInfo.status == MemberStatus.REMOVED) {
            round.payoutExecuted = true;

            for (uint256 i = 0; i < group.targetMembers; i++) {
                address mAddr = groupMembers[groupId][i];
                if (hasContributed[groupId][r][mAddr] && mAddr != recipient) {
                    uint256 refundAmount = group.contributionPerRound;
                    if (isMarkedLate[groupId][r][mAddr]) {
                        uint256 lateFee = (group.contributionPerRound * group.lateFeePercent) / 10000;
                        refundAmount += lateFee;
                    }
                    token.safeTransfer(mAddr, refundAmount);
                    emit RoundContributionRefunded(groupId, r, mAddr, refundAmount);
                }
            }

            emit DefaultedPayoutSkipped(groupId, r, recipient);
            emit RoundCompleted(groupId, r);

            _advanceOrCompleteGroup(groupId, r);
            return;
        }

        // HARD CONTRACT INVARIANT: Recipient remaining future obligations must be secured
        uint256 remainingFutureRounds = group.targetMembers - r;
        uint256 requiredReserve = remainingFutureRounds * group.contributionPerRound;
        uint256 netCommitted = recipientInfo.reserveCommitted
            > (recipientInfo.reserveUsed + recipientInfo.reserveWithdrawn)
            ? recipientInfo.reserveCommitted - (recipientInfo.reserveUsed + recipientInfo.reserveWithdrawn)
            : 0;

        if (netCommitted < requiredReserve) {
            revert InsufficientReserveCoverage();
        }

        round.payoutExecuted = true;
        uint256 payoutAmount = round.totalCollected;

        // Checks-Effects-Interactions: Transfer payout
        token.safeTransfer(recipient, payoutAmount);
        emit PayoutExecuted(groupId, r, recipient, payoutAmount);
        emit RoundCompleted(groupId, r);

        _advanceOrCompleteGroup(groupId, r);
    }

    /**
     * @dev Internal helper to progress round or complete circle
     */
    function _advanceOrCompleteGroup(uint256 groupId, uint256 r) internal {
        CircleGroup storage group = groups[groupId];
        if (r < group.targetMembers) {
            uint256 nextR = r + 1;
            group.currentRound = nextR;

            RoundInfo storage nextRound = rounds[groupId][nextR];
            nextRound.roundNumber = nextR;
            nextRound.startTime = block.timestamp;
            nextRound.contributionDeadline = block.timestamp + group.roundDuration;
            nextRound.gracePeriodEnd = nextRound.contributionDeadline + group.gracePeriod;
            nextRound.recipient = finalizedPayoutOrder[groupId][nextR - 1];

            emit RoundOpened(groupId, nextR, nextRound.contributionDeadline, nextRound.gracePeriodEnd);
        } else {
            // Group completed!
            group.status = GroupStatus.COMPLETED;
            group.completedAt = block.timestamp;

            for (uint256 i = 0; i < group.targetMembers; i++) {
                address mAddr = groupMembers[groupId][i];
                if (members[groupId][mAddr].status == MemberStatus.ACTIVE) {
                    members[groupId][mAddr].status = MemberStatus.COMPLETED;
                }
            }

            emit GroupCompleted(groupId);
        }
    }

    // --- SECURITY RESERVE WITHDRAWAL ---

    /**
     * @notice Withdraw excess, completed, or unencumbered security reserve
     * @param groupId The circle identifier
     */
    function withdrawExcessReserve(uint256 groupId) external nonReentrant {
        MemberInfo storage member = members[groupId][msg.sender];
        if (member.status == MemberStatus.NONE) revert NotMember();

        uint256 withdrawable = getWithdrawableReserve(groupId, msg.sender);
        if (withdrawable == 0) revert NothingToWithdraw();

        member.reserveWithdrawn += withdrawable;

        token.safeTransfer(msg.sender, withdrawable);
        emit SecurityReserveReleased(groupId, msg.sender, withdrawable);
    }

    /**
     * @notice Calculate legally withdrawable security reserve for a member
     * @param groupId The circle identifier
     * @param memberAddr The member address
     */
    function getWithdrawableReserve(uint256 groupId, address memberAddr) public view returns (uint256) {
        CircleGroup storage group = groups[groupId];
        MemberInfo storage member = members[groupId][memberAddr];
        if (member.status == MemberStatus.NONE) return 0;

        uint256 netAvailable = member.reserveCommitted > (member.reserveUsed + member.reserveWithdrawn)
            ? member.reserveCommitted - (member.reserveUsed + member.reserveWithdrawn)
            : 0;

        if (group.status == GroupStatus.CANCELLED || group.status == GroupStatus.COMPLETED) {
            return netAvailable;
        }

        if (group.status == GroupStatus.FORMING) {
            // While forming, reserve is committed to the circle. Can only withdraw if circle cancelled
            return 0;
        }

        if (group.status == GroupStatus.ACTIVE) {
            if (member.status == MemberStatus.DEFAULTED || member.status == MemberStatus.REMOVED) {
                return 0;
            }
            uint256 req = getRequiredReserve(groupId, memberAddr);
            if (netAvailable > req) {
                return netAvailable - req;
            }
            return 0;
        }

        return 0;
    }

    /**
     * @notice Calculate required protected security reserve for a member at current state
     * @param groupId The circle identifier
     * @param memberAddr The member address
     */
    function getRequiredReserve(uint256 groupId, address memberAddr) public view returns (uint256) {
        CircleGroup storage group = groups[groupId];
        MemberInfo storage member = members[groupId][memberAddr];
        if (member.status == MemberStatus.NONE || group.status != GroupStatus.ACTIVE) return 0;

        uint256 p = member.assignedPosition;
        uint256 currentR = group.currentRound;

        if (p <= currentR) {
            // Member has either already reached their payout round or passed it.
            // Remaining future rounds after payout that are still unfulfilled:
            uint256 remainingFutureRounds = (group.targetMembers >= currentR) ? (group.targetMembers - currentR) : 0;
            return remainingFutureRounds * group.contributionPerRound;
        } else {
            // Member has NOT yet received payout. Their scheduled payout position is p.
            // They must maintain required reserve for their assigned position p:
            uint256 futureRoundsAfterPayout = group.targetMembers - p;
            return futureRoundsAfterPayout * group.contributionPerRound;
        }
    }

    // --- REMOVAL GOVERNANCE ---

    /**
     * @notice Create a removal proposal for an objectively defaulted member
     * @param groupId The circle identifier
     * @param target The defaulted member address
     */
    function createRemovalProposal(uint256 groupId, address target) external nonReentrant returns (uint256 proposalId) {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.ACTIVE) revert GroupNotActive();

        MemberInfo storage targetInfo = members[groupId][target];
        if (targetInfo.status != MemberStatus.DEFAULTED) revert TargetNotDefaulted();
        if (hasActiveProposal[groupId][target]) revert ProposalAlreadyExists();

        MemberInfo storage proposerInfo = members[groupId][msg.sender];
        if (proposerInfo.status != MemberStatus.ACTIVE) revert NotActiveMember();
        if (msg.sender == target) revert TargetCannotVote();

        proposalId = ++proposalCount[groupId];
        RemovalProposal storage proposal = removalProposals[groupId][proposalId];
        proposal.id = proposalId;
        proposal.targetMember = target;
        proposal.proposer = msg.sender;
        proposal.createdAt = block.timestamp;
        proposal.deadline = block.timestamp + REMOVAL_VOTING_PERIOD;
        proposal.yesVotes = 1; // Proposer automatically votes YES

        hasActiveProposal[groupId][target] = true;
        hasVotedRemoval[groupId][proposalId][msg.sender] = true;

        emit RemovalProposalCreated(groupId, proposalId, target, msg.sender, proposal.deadline);
        emit RemovalVoteCast(groupId, proposalId, msg.sender, true);
    }

    /**
     * @notice Vote on a removal proposal
     * @param groupId The circle identifier
     * @param proposalId The proposal index
     * @param support True for YES, False for NO
     */
    function voteOnRemoval(uint256 groupId, uint256 proposalId, bool support) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.ACTIVE) revert GroupNotActive();

        RemovalProposal storage proposal = removalProposals[groupId][proposalId];
        if (proposal.id == 0 || proposal.executed) revert ProposalNotActive();
        if (block.timestamp > proposal.deadline) revert VotingPeriodEnded();

        if (msg.sender == proposal.targetMember) revert TargetCannotVote();
        if (hasVotedRemoval[groupId][proposalId][msg.sender]) revert AlreadyVoted();

        MemberInfo storage voterInfo = members[groupId][msg.sender];
        if (voterInfo.status != MemberStatus.ACTIVE) revert NotActiveMember();

        hasVotedRemoval[groupId][proposalId][msg.sender] = true;
        if (support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit RemovalVoteCast(groupId, proposalId, msg.sender, support);
    }

    /**
     * @notice Execute removal proposal if threshold (>= 2/3 of eligible voters) is met
     * @param groupId The circle identifier
     * @param proposalId The proposal index
     */
    function executeRemoval(uint256 groupId, uint256 proposalId) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.ACTIVE) revert GroupNotActive();

        RemovalProposal storage proposal = removalProposals[groupId][proposalId];
        if (proposal.id == 0 || proposal.executed) revert ProposalNotActive();

        // Eligible voters = non-target active members
        uint256 eligibleVoters = 0;
        uint256 n = group.targetMembers;
        for (uint256 i = 0; i < n; i++) {
            address mAddr = groupMembers[groupId][i];
            if (mAddr != proposal.targetMember && members[groupId][mAddr].status == MemberStatus.ACTIVE) {
                eligibleVoters++;
            }
        }

        // Threshold: at least 2/3 yes votes (yesVotes * 3 >= eligibleVoters * 2)
        if (eligibleVoters == 0 || (proposal.yesVotes * 3 < eligibleVoters * 2)) {
            revert RemovalThresholdNotMet();
        }

        proposal.executed = true;
        hasActiveProposal[groupId][proposal.targetMember] = false;

        MemberInfo storage targetInfo = members[groupId][proposal.targetMember];
        targetInfo.status = MemberStatus.REMOVED;

        emit MemberRemoved(groupId, proposal.targetMember);
    }

    // --- CANCELLATION ---

    /**
     * @notice Safe cancellation of circle during FORMING if creator desires or if target not reached
     * @dev Never allows arbitrary admin cancellation after activation.
     * @param groupId The circle identifier
     */
    function cancelGroup(uint256 groupId) external nonReentrant {
        CircleGroup storage group = groups[groupId];
        if (group.status != GroupStatus.FORMING) revert GroupNotForming();
        if (msg.sender != group.creator) revert Unauthorized();

        group.status = GroupStatus.CANCELLED;
        emit GroupCancelled(groupId);
    }

    // --- VIEW FUNCTIONS ---

    function getGroup(uint256 groupId) external view returns (CircleGroup memory) {
        return groups[groupId];
    }

    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        return groupMembers[groupId];
    }

    function getFinalizedPayoutOrder(uint256 groupId) external view returns (address[] memory) {
        return finalizedPayoutOrder[groupId];
    }

    function getRoundInfo(uint256 groupId, uint256 roundNumber) external view returns (RoundInfo memory) {
        return rounds[groupId][roundNumber];
    }

    function getMemberInfo(uint256 groupId, address memberAddr) external view returns (MemberInfo memory) {
        return members[groupId][memberAddr];
    }

    function getRemovalProposal(uint256 groupId, uint256 proposalId) external view returns (RemovalProposal memory) {
        return removalProposals[groupId][proposalId];
    }

    function getActiveCirclesCount() external view returns (uint256 count) {
        for (uint256 i = 1; i < nextGroupId; i++) {
            if (groups[i].status == GroupStatus.ACTIVE) {
                count++;
            }
        }
    }
}
