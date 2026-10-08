// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {CircleFlowToken} from "../src/CircleFlowToken.sol";

contract CircleFlowTokenTest is Test {
    CircleFlowToken public token;
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    event FaucetClaimed(address indexed recipient, uint256 amount);

    function setUp() public {
        token = new CircleFlowToken();
    }

    function test_InitialSupply() public view {
        assertEq(token.name(), "CircleFlow Token");
        assertEq(token.symbol(), "CFT");
        assertEq(token.decimals(), 18);
        assertEq(token.balanceOf(address(this)), 100_000 * 10 ** 18);
    }

    function test_FaucetSuccess() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit FaucetClaimed(alice, 1_000 * 10 ** 18);
        token.faucet();

        assertEq(token.balanceOf(alice), 1_000 * 10 ** 18);
        assertTrue(token.hasClaimedFaucet(alice));
    }

    function test_FaucetRevertsOnSecondClaim() public {
        vm.prank(alice);
        token.faucet();

        vm.prank(alice);
        vm.expectRevert(CircleFlowToken.AlreadyClaimed.selector);
        token.faucet();
    }

    function test_FaucetMultipleUsers() public {
        vm.prank(alice);
        token.faucet();

        vm.prank(bob);
        token.faucet();

        assertEq(token.balanceOf(alice), 1_000 * 10 ** 18);
        assertEq(token.balanceOf(bob), 1_000 * 10 ** 18);
    }
}

