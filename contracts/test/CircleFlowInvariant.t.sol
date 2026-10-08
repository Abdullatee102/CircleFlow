// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {CircleFlow} from "../src/CircleFlow.sol";
import {CircleFlowToken} from "../src/CircleFlowToken.sol";

contract CircleFlowInvariantTest is Test {
    CircleFlowToken public token;
    CircleFlow public circleFlow;

    address public creator = address(0x101);
    address public member2 = address(0x202);
    address public member3 = address(0x303);
    address public member4 = address(0x404);

    uint256 public constant CONTRIB = 50 * 10 ** 18;
    uint256 public constant DURATION = 14 days;
    uint256 public constant GRACE = 1 days;
    uint256 public constant LATE_FEE = 100; // 1%

    uint256 public gid;

    function setUp() public {
        token = new CircleFlowToken();
        circleFlow = new CircleFlow(address(token));

        address[4] memory users = [creator, member2, member3, member4];
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(users[i]);
            token.faucet();
            vm.prank(users[i]);
            token.approve(address(circleFlow), type(uint256).max);
        }

        bytes32 sec1 = bytes32(uint256(1));
        bytes32 sec2 = bytes32(uint256(2));
        bytes32 sec3 = bytes32(uint256(3));
        bytes32 sec4 = bytes32(uint256(4));

        vm.prank(creator);
        gid = circleFlow.createGroup(
            4, CONTRIB, DURATION, GRACE, LATE_FEE, 200 * 10 ** 18, keccak256(abi.encodePacked(sec1, creator))
        );

        vm.prank(member2);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, keccak256(abi.encodePacked(sec2, member2)));

        vm.prank(member3);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, keccak256(abi.encodePacked(sec3, member3)));

        vm.prank(member4);
        circleFlow.joinGroup(gid, 200 * 10 ** 18, keccak256(abi.encodePacked(sec4, member4)));

        vm.prank(creator);
        circleFlow.revealPayoutSecret(gid, sec1);
        vm.prank(member2);
        circleFlow.revealPayoutSecret(gid, sec2);
        vm.prank(member3);
        circleFlow.revealPayoutSecret(gid, sec3);
        vm.prank(member4);
        circleFlow.revealPayoutSecret(gid, sec4);

        circleFlow.finalizePayoutOrder(gid);
        circleFlow.startGroup(gid);
    }

    /// @notice Fuzz testing: premature withdrawal of protected reserve must always revert
    function testFuzz_CannotWithdrawProtectedReserve(uint256 roundToTest) public {
        vm.assume(roundToTest >= 1 && roundToTest <= 4);

        // Before obligations are finished, required reserve must be > 0 for early positions
        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);
        address p1Member = order[0];

        // p1Member has position 1 (requires 3 * 50 = 150 CFT locked)
        uint256 required = circleFlow.getRequiredReserve(gid, p1Member);
        assertEq(required, 150 * 10 ** 18);

        // Member deposited 200 CFT. Withdrawable is 200 - 150 = 50 CFT.
        // If they try to withdraw excess, they only get 50 CFT, never the full 200 CFT!
        uint256 withdrawable = circleFlow.getWithdrawableReserve(gid, p1Member);
        assertEq(withdrawable, 50 * 10 ** 18);

        vm.prank(p1Member);
        circleFlow.withdrawExcessReserve(gid);

        // After withdrawing the excess, withdrawable is 0!
        assertEq(circleFlow.getWithdrawableReserve(gid, p1Member), 0);

        // Second withdrawal attempt must revert with NothingToWithdraw
        vm.prank(p1Member);
        vm.expectRevert(CircleFlow.NothingToWithdraw.selector);
        circleFlow.withdrawExcessReserve(gid);
    }

    /// @notice Financial Invariant: Contract solvency invariant holds across rounds
    function test_ContractSolvencyInvariant() public {
        address[] memory order = circleFlow.getFinalizedPayoutOrder(gid);

        for (uint256 r = 1; r <= 4; r++) {
            // All members contribute
            vm.prank(creator);
            circleFlow.contribute(gid);
            vm.prank(member2);
            circleFlow.contribute(gid);
            vm.prank(member3);
            circleFlow.contribute(gid);
            vm.prank(member4);
            circleFlow.contribute(gid);

            // Execute payout
            circleFlow.executePayout(gid);

            // Invariant check: Contract token balance >= total remaining unwithdrawn reserves
            uint256 totalContractBalance = token.balanceOf(address(circleFlow));
            uint256 totalCommittedRemaining = 0;

            for (uint256 i = 0; i < 4; i++) {
                CircleFlow.MemberInfo memory m = circleFlow.getMemberInfo(gid, order[i]);
                totalCommittedRemaining += (m.reserveCommitted - m.reserveUsed - m.reserveWithdrawn);
            }

            assertGe(totalContractBalance, totalCommittedRemaining);
        }
    }
}
