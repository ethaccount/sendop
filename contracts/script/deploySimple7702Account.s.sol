// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Simple7702Account} from "aa-0.8/contracts/accounts/Simple7702Account.sol";

/*
cd contracts

// deploy on sepolia
forge script script/deploySimple7702Account.s.sol --rpc-url $sepolia --broadcast --verify

// verify on sepolia
forge verify-contract \                                                           17s
    --chain-id 11155111 \
    --compiler-version v0.8.28+commit.8e94f5c9 \
    --watch \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    0x7dA87e0C662214E76c7872674c8F3ace7c457232 \
    Simple7702Account
*/

contract DeploySimple7702Account is Script {
    function setUp() public {}

    function run() public {
        bytes32 salt = vm.envBytes32("SALT");
        console.logBytes32(salt);

        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        Simple7702Account simple7702Account = new Simple7702Account{salt: salt}();

        console.log("Simple7702Account at:", address(simple7702Account));

        vm.stopBroadcast();
    }
}
