// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {CircleFlow} from "../src/CircleFlow.sol";
import {CircleFlowToken} from "../src/CircleFlowToken.sol";

contract CircleFlowAuditTest is Test {
    CircleFlowToken public token;
    CircleFlow public circleFlow;

    address public alice = address(0xA1);
    address public bob = address(0xB2);
    address public chris = address(0xC3);
    address public david = address(0xD4);
    address public emma = address(0xE5);

    bytes32 public secAlice = bytes32(uint256(1001));
    bytes32 public secBob = bytes32(uint256(1002));
    bytes32 public secChris = bytes32(uint256(1003));
    bytes32 public secDavid = bytes32(uint256(1004));
    bytes32 public secEmma = bytes32(uint256(1005));

    bytes32 public comAlice;
    bytes32 public comBob;
    bytes32 public comChris;
    bytes32 public comDavid;
    bytes32 public comEmma;

    uint256 public constant CONTRIB = 100 * 10 ** 18;
    uint256 public constant DURATION = 7 days;
    uint256 public constant GRACE = 2 days;
    uint256 public constant LATE_FEE = 100; // 1%

    function setUp() public {
        token = new CircleFlowToken();
        circleFlow = new CircleFlow(address(token));

        comAlice = keccak256(abi.encodePacked(secAlice, alice));
        comBob = keccak256(abi.encodePacked(secBob, bob));
        comChris = keccak256(abi.encodePacked(secChris, chris));
        comDavid = keccak256(abi.encodePacked(secDavid, david));
        comEmma = keccak256(abi.encodePacked(secEmma, emma));

        address[5] memory allUsers = [alice, bob, chris, david, emma];
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(allUsers[i]);
            token.faucet();
            vm.prank(allUsers[i]);
            token.approve(address(circleFlow), type(uint256).max);
        }
    }

    // --- SECTION 3 & 5: 5-MEMBER CIRCLE FULL LIFECYCLE ---

    function test_5MembersCircleFullCycle() public {
        // 5 members, 5 rounds
        // Position 1 needs 4*CONTRIB = 400
        // Position 2 needs 3*CONTRIB = 300
        // Position 3 needs 2*CONTRIB = 200
        // Position 4 needs 1*CONTRIB = 100
        // Position 5 needs 0
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(5, CONTRIB, DURATION, GRACE, LATE_FEE, 400 * 10 ** 18, comAlice);

        vm.prank(bob);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comChris);
        vm.prank(david);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comDavid);
        vm.prank(emma);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comEmma);

        // All reveal
        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        vm.prank(chris);
        circleFlow.revealPayoutSecret(gid, secChris);
        vm.prank(david);
        circleFlow.revealPayoutSecret(gid, secDavid);
        vm.prank(emma);
        circleFlow.revealPayoutSecret(gid, secEmma);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);
        assertEq(order.length, 5);

        address[5] memory allUsers = [alice, bob, chris, david, emma];

        // Run through all 5 rounds
        for (uint256 r = 1; r <= 5; r++) {
            assertEq(circleFlow.getGroup(gid).currentRound, r);

            for (uint256 i = 0; i < 5; i++) {
                vm.prank(allUsers[i]);
                circleFlow.contribute(gid);
            }

            address recipient = order[r - 1];
            uint256 balBefore = token.balanceOf(recipient);

            circleFlow.executePayout(gid);

            uint256 balAfter = token.balanceOf(recipient);
            // 5 members * 100 CFT = 500 CFT
            assertEq(balAfter - balBefore, 500 * 10 ** 18);
        }

        // Group is now COMPLETED
        CircleFlow.CircleGroup memory g = circleFlow.getGroup(gid);
        assertEq(uint256(g.status), uint256(CircleFlow.GroupStatus.COMPLETED));

        // All members can withdraw their remaining reserve safely
        for (uint256 i = 0; i < 5; i++) {
            uint256 withdrawable = circleFlow.getWithdrawableReserve(gid, allUsers[i]);
            assertEq(withdrawable, 400 * 10 ** 18);
            vm.prank(allUsers[i]);
            circleFlow.withdrawExcessReserve(gid);
        }
    }

    // --- SECTION 8: MULTIPLE MEMBERS QUALIFYING FOR SAME EARLY POSITION ---

    function test_MultipleEarlyPositionCandidates() public {
        // 4 members, 100 CFT contribution
        // Alice -> 300 reserve (qualifies for position 1)
        // Bob   -> 300 reserve (qualifies for position 1)
        // Chris -> 200 reserve (qualifies for position 2)
        // David -> 100 reserve (qualifies for position 3)
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(4, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, comAlice);

        vm.prank(bob);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comChris);
        vm.prank(david);
        circleFlow.joinGroup(gid, 100 * 10 ** 18, comDavid);

        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        vm.prank(chris);
        circleFlow.revealPayoutSecret(gid, secChris);
        vm.prank(david);
        circleFlow.revealPayoutSecret(gid, secDavid);

        circleFlow.finalizePayoutOrder(gid);

        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);
        assertEq(order.length, 4);

        // Position 1 (index 0) must be either Alice or Bob
        assertTrue(order[0] == alice || order[0] == bob);
        // Position 2 (index 1) must be either Alice or Bob or Chris
        assertTrue(order[1] == alice || order[1] == bob || order[1] == chris);

        // Both Alice and Bob got valid positions, order is finalized
        assertTrue(circleFlow.getGroup(gid).payoutOrderFinalized);
    }

    // --- SECTION 7: NON-REVEAL TIMEOUT HANDLING ---

    function test_NonRevealTimeoutFinalization() public {
        // 3 members: Alice, Bob, Chris
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, comAlice);

        vm.prank(bob);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comChris);

        // Alice and Bob reveal
        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        // Chris REFUSES / FORGETS to reveal!

        // Before 24 hours, finalizing reverts RevealWindowNotOpen
        vm.expectRevert(CircleFlow.RevealWindowNotOpen.selector);
        circleFlow.finalizePayoutOrder(gid);

        // Warp past REVEAL_WINDOW_DURATION (24 hours)
        vm.warp(block.timestamp + 24 hours + 1);

        // Now finalization SUCCEEDS deterministically using Chris's commitment hash as fallback entropy!
        circleFlow.finalizePayoutOrder(gid);
        assertTrue(circleFlow.getGroup(gid).payoutOrderFinalized);
    }

    function test_InvalidRevealReverts() public {
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, comAlice);

        vm.prank(bob);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comChris);

        // Alice tries to reveal with incorrect secret
        bytes32 wrongSecret = bytes32(uint256(999999));
        vm.prank(alice);
        vm.expectRevert(CircleFlow.InvalidSecret.selector);
        circleFlow.revealPayoutSecret(gid, wrongSecret);
    }

    // --- SECTION 12: PRE-PAYOUT DEFAULT (SAFE REFUND & ROTATION ADVANCEMENT) ---

    function test_PrePayoutDefaultSafeRefundAndAdvancement() public {
        // 3 members: Alice (300 reserve), Bob (300 reserve), Chris (300 reserve)
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, comAlice);
        vm.prank(bob);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, comChris);

        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        vm.prank(chris);
        circleFlow.revealPayoutSecret(gid, secChris);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);
        address recipientR1 = order[0];
        address other1 = order[1];
        address other2 = order[2];

        // Suppose recipientR1 defaults on Round 1 (fails to contribute to their own payout round!)
        // other1 and other2 contribute
        vm.prank(other1);
        circleFlow.contribute(gid);
        vm.prank(other2);
        circleFlow.contribute(gid);

        // Warp past deadline + grace
        vm.warp(block.timestamp + DURATION + GRACE + 1);

        // Mark recipientR1 defaulted
        circleFlow.markMemberDefaulted(gid, 1, recipientR1);

        uint256 balOther1Before = token.balanceOf(other1);
        uint256 balOther2Before = token.balanceOf(other2);

        // Execute payout: Recipient is defaulted!
        // Protocol must NOT pay recipientR1, but REFUND other1 and other2, and advance to Round 2!
        circleFlow.executePayout(gid);

        // Verify refunds
        assertEq(token.balanceOf(other1) - balOther1Before, CONTRIB);
        assertEq(token.balanceOf(other2) - balOther2Before, CONTRIB);

        // Recipient received 0 payout
        CircleFlow.MemberInfo memory rInfo = circleFlow.getMemberInfo(gid, recipientR1);
        assertEq(uint256(rInfo.status), uint256(CircleFlow.MemberStatus.DEFAULTED));

        // Group safely progressed to Round 2!
        assertEq(circleFlow.getGroup(gid).currentRound, 2);
    }

    // --- SECTION 12: MULTI-ROUND POST-PAYOUT DEFAULT DRAWDOWN ---

    function test_MultiRoundPostPayoutDefaultDrawdown() public {
        // 4 members
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(4, CONTRIB, DURATION, GRACE, LATE_FEE, 300 * 10 ** 18, comAlice);
        vm.prank(bob);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, comChris);
        vm.prank(david);
        circleFlow.joinGroup(gid, 300 * 10 ** 18, comDavid);

        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        vm.prank(chris);
        circleFlow.revealPayoutSecret(gid, secChris);
        vm.prank(david);
        circleFlow.revealPayoutSecret(gid, secDavid);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);
        address firstRecipient = order[0];

        // Round 1: all contribute and firstRecipient receives pot
        address[4] memory membersList = [alice, bob, chris, david];
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(membersList[i]);
            circleFlow.contribute(gid);
        }
        circleFlow.executePayout(gid);
        assertEq(circleFlow.getGroup(gid).currentRound, 2);

        // Round 2: other 3 members contribute on time
        for (uint256 i = 0; i < 4; i++) {
            if (membersList[i] != firstRecipient) {
                vm.prank(membersList[i]);
                circleFlow.contribute(gid);
            }
        }
        // First recipient fails to contribute -> warp past grace
        vm.warp(block.timestamp + DURATION + GRACE + 1);
        circleFlow.markMemberDefaulted(gid, 2, firstRecipient);
        assertEq(circleFlow.getMemberInfo(gid, firstRecipient).reserveUsed, CONTRIB);
        circleFlow.executePayout(gid);
        assertEq(circleFlow.getGroup(gid).currentRound, 3);

        // Round 3: other 3 members contribute on time
        for (uint256 i = 0; i < 4; i++) {
            if (membersList[i] != firstRecipient) {
                vm.prank(membersList[i]);
                circleFlow.contribute(gid);
            }
        }
        // First recipient defaults AGAIN in Round 3!
        vm.warp(block.timestamp + DURATION + GRACE + 1);
        circleFlow.markMemberDefaulted(gid, 3, firstRecipient);
        assertEq(circleFlow.getMemberInfo(gid, firstRecipient).reserveUsed, 2 * CONTRIB);
        circleFlow.executePayout(gid);
        assertEq(circleFlow.getGroup(gid).currentRound, 4);
    }

    // --- SECTION 10 & 4: DUPLICATE CONTRIBUTION & CONSTITUTION IMMUTABILITY ---

    function test_DuplicateContributionReverts() public {
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, comAlice);
        vm.prank(bob);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comChris);

        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        vm.prank(chris);
        circleFlow.revealPayoutSecret(gid, secChris);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        // Alice contributes
        vm.prank(alice);
        circleFlow.contribute(gid);

        // Alice tries to contribute again in the same round
        vm.prank(alice);
        vm.expectRevert(CircleFlow.AlreadyContributed.selector);
        circleFlow.contribute(gid);
    }

    function test_CannotAddMemberAfterActivation() public {
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(3, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, comAlice);
        vm.prank(bob);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, comChris);

        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        vm.prank(chris);
        circleFlow.revealPayoutSecret(gid, secChris);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        // David tries to join after activation
        vm.prank(david);
        vm.expectRevert(CircleFlow.CannotAddMemberAfterActivation.selector);
        circleFlow.joinGroup(gid, 100 * 10 ** 18, comDavid);
    }

    // --- SECTION 13: REMOVAL GOVERNANCE THRESHOLDS (5 MEMBERS) ---

    function test_RemovalGovernanceThresholds_5Members() public {
        // 5 members. Eligible non-target voters = 4. 2/3 threshold is ceil(4 * 2 / 3) = 3 votes.
        vm.prank(alice);
        uint256 gid = circleFlow.createGroup(5, CONTRIB, DURATION, GRACE, LATE_FEE, 400 * 10 ** 18, comAlice);
        vm.prank(bob);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comBob);
        vm.prank(chris);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comChris);
        vm.prank(david);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comDavid);
        vm.prank(emma);
        circleFlow.joinGroup(gid, 400 * 10 ** 18, comEmma);

        vm.prank(alice);
        circleFlow.revealPayoutSecret(gid, secAlice);
        vm.prank(bob);
        circleFlow.revealPayoutSecret(gid, secBob);
        vm.prank(chris);
        circleFlow.revealPayoutSecret(gid, secChris);
        vm.prank(david);
        circleFlow.revealPayoutSecret(gid, secDavid);
        vm.prank(emma);
        circleFlow.revealPayoutSecret(gid, secEmma);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);

        // Emma defaults
        vm.warp(block.timestamp + DURATION + GRACE + 1);
        circleFlow.markMemberDefaulted(gid, 1, emma);

        // Alice proposes removal of Emma (Alice auto-votes YES: 1 vote)
        vm.prank(alice);
        uint256 pid = circleFlow.createRemovalProposal(gid, emma);

        // Target Emma tries to vote
        vm.prank(emma);
        vm.expectRevert(CircleFlow.TargetCannotVote.selector);
        circleFlow.voteOnRemoval(gid, pid, false);

        // Bob votes YES (Total: 2 votes out of 4 -> 50% < 66.67%)
        vm.prank(bob);
        circleFlow.voteOnRemoval(gid, pid, true);

        // Bob tries to vote again
        vm.prank(bob);
        vm.expectRevert(CircleFlow.AlreadyVoted.selector);
        circleFlow.voteOnRemoval(gid, pid, true);

        // Execution with 2 votes fails
        vm.expectRevert(CircleFlow.RemovalThresholdNotMet.selector);
        circleFlow.executeRemoval(gid, pid);

        // Chris votes YES (Total: 3 votes out of 4 -> 75% >= 66.67%)
        vm.prank(chris);
        circleFlow.voteOnRemoval(gid, pid, true);

        // Execution now succeeds!
        circleFlow.executeRemoval(gid, pid);
        assertEq(uint256(circleFlow.getMemberInfo(gid, emma).status), uint256(CircleFlow.MemberStatus.REMOVED));
    }
}

