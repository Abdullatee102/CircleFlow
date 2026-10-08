// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title CircleFlowToken (CFT)
 * @notice Test ERC-20 asset for the CircleFlow protocol on Ethereum Sepolia.
 * @dev This token has NO REAL-WORLD VALUE and is strictly intended for testing and demonstration.
 */
contract CircleFlowToken is ERC20 {
    /// @notice Amount dispensed per faucet claim (1,000 CFT)
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** 18;

    /// @notice Maximum supply cap for faucet minting (10,000,000 CFT)
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;

    /// @notice Tracks whether an address has claimed from the faucet
    mapping(address => bool) public hasClaimedFaucet;

    /// @notice Emitted when a user claims tokens from the faucet
    event FaucetClaimed(address indexed recipient, uint256 amount);

    /// @notice Thrown when an address attempts to claim from the faucet more than once
    error AlreadyClaimed();

    /// @notice Thrown when a claim would exceed the maximum supply cap
    error MaxSupplyExceeded();

    constructor() ERC20("CircleFlow Token", "CFT") {
        // Mint an initial supply to deployer for testing and liquidity seeding
        _mint(msg.sender, 100_000 * 10 ** 18);
    }

    /**
     * @notice Claim a one-time allotment of 1,000 CFT from the faucet.
     * @dev Strictly bounded: 1 claim per wallet, capped total supply.
     */
    function faucet() external {
        if (hasClaimedFaucet[msg.sender]) {
            revert AlreadyClaimed();
        }
        if (totalSupply() + FAUCET_AMOUNT > MAX_SUPPLY) {
            revert MaxSupplyExceeded();
        }

        hasClaimedFaucet[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}

