// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Counter} from "../src/Counter.sol";

/*

cd contracts

// deploy & verify on sepolia
forge script script/deployCounter.s.sol --rpc-url $sepolia --broadcast --verify

// verify on sepolia
forge verify-contract \
    --chain-id 11155111 \
    --compiler-version v0.8.28+commit.8e94f5c9 \
    --watch \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    0x0000000000000000000000000000000000000000 \
    Counter

*/

contract DeployCounter is Script {
    function setUp() public {}

    function run() public {
        bytes32 salt = vm.envBytes32("SALT");
        console.logBytes32(salt);

        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        Counter publicPaymaster = new Counter{salt: salt}();

        console.log("Counter at:", address(publicPaymaster));

        vm.stopBroadcast();
    }
}
