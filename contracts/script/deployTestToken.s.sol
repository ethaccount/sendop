// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {TestToken} from "../src/TestToken.sol";

/*

cd contracts

// deploy & verify on sepolia
forge script script/deployTestToken.s.sol --rpc-url $sepolia --broadcast --verify

// verify on sepolia
forge verify-contract \
    --chain-id 11155111 \
    --compiler-version v0.8.28+commit.8e94f5c9 \
    --watch \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    0xef26611a6f2cb9f2f6234F4635d98a7094c801Ce \
    TestToken
*/

contract DeployTestToken is Script {
    function setUp() public {}

    function run() public {
        bytes32 salt = vm.envBytes32("SALT");
        console.logBytes32(salt);

        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        TestToken publicPaymaster = new TestToken{salt: salt}();

        console.log("TestToken at:", address(publicPaymaster));

        vm.stopBroadcast();
    }
}
