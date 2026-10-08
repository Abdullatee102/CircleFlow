// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CircleFlowToken} from "../src/CircleFlowToken.sol";
import {CircleFlow} from "../src/CircleFlow.sol";

contract DeployScript is Script {
    function run() external returns (address cftAddress, address circleFlowAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=========================================");
        console.log("CircleFlow Protocol Deployment");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("=========================================");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy CircleFlowToken (CFT)
        CircleFlowToken cft = new CircleFlowToken();
        cftAddress = address(cft);
        console.log("CircleFlowToken (CFT) deployed at:", cftAddress);

        // 2. Deploy CircleFlow protocol contract
        CircleFlow circleFlow = new CircleFlow(cftAddress);
        circleFlowAddress = address(circleFlow);
        console.log("CircleFlow Protocol deployed at:", circleFlowAddress);

        vm.stopBroadcast();

        console.log("=========================================");
        console.log("Deployment completed successfully!");
        console.log("=========================================");
    }
}
