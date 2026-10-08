// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {CircleFlow} from "../src/CircleFlow.sol";
import {CircleFlowToken} from "../src/CircleFlowToken.sol";

contract CircleFlowTest is Test {
    CircleFlowToken public token;
    CircleFlow public circleFlow;

    address public creator = address(0x100);
    address public member2 = address(0x200);
    address public member3 = address(0x300);
    address public member4 = address(0x400);
    address public member5 = address(0x500);

    bytes32 public secret1 = bytes32(uint256(111));
    bytes32 public secret2 = bytes32(uint256(222));
    bytes32 public secret3 = bytes32(uint256(333));
    bytes32 public secret4 = bytes32(uint256(444));
    bytes32 public secret5 = bytes32(uint256(555));

    bytes32 public commit1;
    bytes32 public commit2;
    bytes32 public commit3;
    bytes32 public commit4;
    bytes32 public commit5;

    uint256 public constant CONTRIB = 100 * 10 ** 18;
    uint256 public constant DURATION = 30 days;
    uint256 public constant GRACE = 2 days;
    uint256 public constant LATE_FEE = 100; // 1%

    function setUp() public {
        token = new CircleFlowToken();
        circleFlow = new CircleFlow(address(token));

        commit1 = keccak256(abi.encodePacked(secret1, creator));
        commit2 = keccak256(abi.encodePacked(secret2, member2));
        commit3 = keccak256(abi.encodePacked(secret3, member3));
        commit4 = keccak256(abi.encodePacked(secret4, member4));
        commit5 = keccak256(abi.encodePacked(secret5, member5));

        // Fund test users
        address[5] memory users = [creator, member2, member3, member4, member5];
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(users[i]);
            token.faucet();
            vm.prank(users[i]);
            token.approve(address(circleFlow), type(uint256).max);
        }
    }

    // --- GROUP CREATION & SIZES ---

    function test_CreateGroup_4Members() public {
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(4, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, commit1);

        CircleFlow.CircleGroup memory g = circleFlow.getGroup(gid);
        assertEq(g.targetMembers, 4);
        assertEq(g.contributionPerRound, CONTRIB);
        assertEq(uint256(g.status), uint256(CircleFlow.GroupStatus.FORMING));
        assertEq(g.creator, creator);

        CircleFlow.MemberInfo memory m = circleFlow.getMemberInfo(gid, creator);
        assertEq(m.reserveCommitted, 300 * 10 ** 18);
        assertEq(uint256(m.status), uint256(CircleFlow.MemberStatus.JOINED));
    }

    function test_CreateGroup_RevertsInvalidSize() public {
        vm.prank(creator);
        vm.expectRevert(CircleFlow.InvalidGroupSize.selector);
        circleFlow.createGroup(2, CONTRIB, DURATION, GRACE, LATE_FEE, 100, commit1);

        vm.prank(creator);
        vm.expectRevert(CircleFlow.InvalidGroupSize.selector);
        circleFlow.createGroup(6, CONTRIB, DURATION, GRACE, LATE_FEE, 100, commit1);
    }

    function test_JoinGroup_Success() public {
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 100 * 10 ** 18, commit2);

        address[] memory mems = circleFlow.getGroupMembers(gid);
        assertEq(mems.length, 2);
        assertEq(mems[1], member2);
    }

    function test_JoinGroup_RevertsWhenFull() public {
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 100 * 10 ** 18, commit2);

        vm.prank(member3);
        circleFlow.joinGroup(gid, 0, commit3);

        vm.prank(member4);
        vm.expectRevert(CircleFlow.GroupFull.selector);
        circleFlow.joinGroup(gid, 0, commit4);
    }

    // --- PAYOUT ORDER & COMMIT REVEAL ---

    function test_CommitRevealAndPayoutOrderFinalization() public {
        // 3 members: Position 1 requires 200, Position 2 requires 100, Position 3 requires 0
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 100 * 10 ** 18, commit2);

        vm.prank(member3);
        circleFlow.joinGroup(gid, 0, commit3);

        // Reveals
        vm.prank(creator);
        circleFlow.revealPayoutSecret(gid, secret1);
        vm.prank(member2);
        circleFlow.revealPayoutSecret(gid, secret2);
        vm.prank(member3);
        circleFlow.revealPayoutSecret(gid, secret3);

        // Finalize payout order
        circleFlow.finalizePayoutOrder(gid);

        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);
        assertEq(order.length, 3);

        // Creator has 200 CFT reserve, so creator must qualify for Position 1 if assigned
        CircleFlow.MemberInfo memory m1 = circleFlow.getMemberInfo(gid, order[0]);
        assertGe(m1.reserveCommitted, 200 * 10 ** 18);

        CircleFlow.MemberInfo memory m2 = circleFlow.getMemberInfo(gid, order[1]);
        assertGe(m2.reserveCommitted, 100 * 10 ** 18);

        CircleFlow.CircleGroup memory g = circleFlow.getGroup(gid);
        assertTrue(g.payoutOrderFinalized);
    }

    function test_FinalizePayoutOrder_RevertsInsufficientCoverage() public {
        // 3 members with nobody having 200 CFT for Position 1
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 50 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 50 * 10 ** 18, commit2);

        vm.prank(member3);
        circleFlow.joinGroup(gid, 50 * 10 ** 18, commit3);

        vm.prank(creator);
        circleFlow.revealPayoutSecret(gid, secret1);
        vm.prank(member2);
        circleFlow.revealPayoutSecret(gid, secret2);
        vm.prank(member3);
        circleFlow.revealPayoutSecret(gid, secret3);

        vm.expectRevert(CircleFlow.InsufficientReserveCoverage.selector);
        circleFlow.finalizePayoutOrder(gid);
    }

    // --- FULL ROTATION CYCLE ---

    function test_FullRotationCycle_3Members() public {
        // Setup 3 members with sufficient reserves:
        // Position 1 requires 200 CFT, Position 2 requires 100 CFT, Position 3 requires 0 CFT
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, commit2);

        vm.prank(member3);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, commit3);

        vm.prank(creator);
        circleFlow.revealPayoutSecret(gid, secret1);
        vm.prank(member2);
        circleFlow.revealPayoutSecret(gid, secret2);
        vm.prank(member3);
        circleFlow.revealPayoutSecret(gid, secret3);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);

        // --- ROUND 1 ---
        assertEq(circleFlow.getGroup(gid).currentRound, 1);

        vm.prank(creator);
        circleFlow.contribute(gid);
        vm.prank(member2);
        circleFlow.contribute(gid);
        vm.prank(member3);
        circleFlow.contribute(gid);

        // Recipient for round 1
        address r1Recipient = order[0];
        uint256 balBefore1 = token.balanceOf(r1Recipient);

        circleFlow.executePayout(gid);

        assertEq(token.balanceOf(r1Recipient), balBefore1 + (3 * CONTRIB));
        assertEq(circleFlow.getGroup(gid).currentRound, 2);

        // --- ROUND 2 ---
        vm.prank(creator);
        circleFlow.contribute(gid);
        vm.prank(member2);
        circleFlow.contribute(gid);
        vm.prank(member3);
        circleFlow.contribute(gid);

        address r2Recipient = order[1];
        uint256 balBefore2 = token.balanceOf(r2Recipient);

        circleFlow.executePayout(gid);

        assertEq(token.balanceOf(r2Recipient), balBefore2 + (3 * CONTRIB));
        assertEq(circleFlow.getGroup(gid).currentRound, 3);

        // --- ROUND 3 ---
        vm.prank(creator);
        circleFlow.contribute(gid);
        vm.prank(member2);
        circleFlow.contribute(gid);
        vm.prank(member3);
        circleFlow.contribute(gid);

        address r3Recipient = order[2];
        uint256 balBefore3 = token.balanceOf(r3Recipient);

        circleFlow.executePayout(gid);

        assertEq(token.balanceOf(r3Recipient), balBefore3 + (3 * CONTRIB));

        // Group is now COMPLETED!
        CircleFlow.CircleGroup memory completedGroup = circleFlow.getGroup(gid);
        assertEq(uint256(completedGroup.status), uint256(CircleFlow.GroupStatus.COMPLETED));

        // All members can withdraw their entire remaining reserve!
        uint256 creatorWithdrawable = circleFlow.getWithdrawableReserve(gid, creator);
        assertEq(creatorWithdrawable, 300 * 10 ** 18);

        vm.prank(creator);
        circleFlow.withdrawExcessReserve(gid);
        assertEq(circleFlow.getWithdrawableReserve(gid, creator), 0);
    }

    // --- GRACE PERIOD & LATE FEE ---

    function test_GracePeriodLateFee() public {
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, commit2);
        vm.prank(member3);
        circleFlow.joinGroup(gid, 100 * 10 ** 18, commit3);

        vm.prank(creator);
        circleFlow.revealPayoutSecret(gid, secret1);
        vm.prank(member2);
        circleFlow.revealPayoutSecret(gid, secret2);
        vm.prank(member3);
        circleFlow.revealPayoutSecret(gid, secret3);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        // Warp past deadline into grace period (DURATION + 1 day)
        vm.warp(block.timestamp + DURATION + 1 days);

        uint256 balBefore = token.balanceOf(creator);
        vm.prank(creator);
        circleFlow.contribute(gid);

        // Late fee is 1% of 100 CFT = 1 CFT
        uint256 expectedFee = (CONTRIB * LATE_FEE) / 10000;
        assertEq(token.balanceOf(creator), balBefore - (CONTRIB + expectedFee));
    }

    // --- POST-PAYOUT DEFAULT & RESERVE USAGE ---

    function test_PostPayoutDefaultUsesReserve() public {
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, commit2);
        vm.prank(member3);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, commit3);

        vm.prank(creator);
        circleFlow.revealPayoutSecret(gid, secret1);
        vm.prank(member2);
        circleFlow.revealPayoutSecret(gid, secret2);
        vm.prank(member3);
        circleFlow.revealPayoutSecret(gid, secret3);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);
        address firstRecipient = order[0];

        // Round 1 contributions
        vm.prank(creator);
        circleFlow.contribute(gid);
        vm.prank(member2);
        circleFlow.contribute(gid);
        vm.prank(member3);
        circleFlow.contribute(gid);

        // Round 1 payout executed to first recipient
        circleFlow.executePayout(gid);
        assertEq(circleFlow.getGroup(gid).currentRound, 2);

        // In Round 2, first recipient fails to contribute!
        // Warp past round 2 grace period
        vm.warp(block.timestamp + DURATION + GRACE + 1);

        // Member 2 and 3 contribute or mark defaulted
        circleFlow.markMemberDefaulted(gid, 2, firstRecipient);

        CircleFlow.MemberInfo memory m = circleFlow.getMemberInfo(gid, firstRecipient);
        assertEq(uint256(m.status), uint256(CircleFlow.MemberStatus.DEFAULTED));
        assertEq(m.reserveUsed, CONTRIB); // 100 CFT consumed from reserve to cover obligation!
    }

    // --- REMOVAL GOVERNANCE ---

    function test_RemovalProposalAndVoting() public {
        vm.prank(creator);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, commit1);

        vm.prank(member2);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, commit2);
        vm.prank(member3);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, commit3);

        vm.prank(creator);
        circleFlow.revealPayoutSecret(gid, secret1);
        vm.prank(member2);
        circleFlow.revealPayoutSecret(gid, secret2);
        vm.prank(member3);
        circleFlow.revealPayoutSecret(gid, secret3);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        // Warp past deadline + grace period
        vm.warp(block.timestamp + DURATION + GRACE + 1);

        // Default member3
        circleFlow.markMemberDefaulted(gid, 1, member3);

        // Creator creates removal proposal for member3
        vm.prank(creator);
        uint256 pid = circleFlow.createRemovalProposal(gid, member3);

        // Member 2 votes YES
        vm.prank(member2);
        circleFlow.voteOnRemoval(gid, pid, true);

        // Execute removal
        circleFlow.executeRemoval(gid, pid);

        CircleFlow.MemberInfo memory targetInfo = circleFlow.getMemberInfo(gid, member3);
        assertEq(uint256(targetInfo.status), uint256(CircleFlow.MemberStatus.REMOVED));
    }
}

