// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PublicPaymaster} from "../src/PublicPaymaster.sol";

/*

cd contracts

// deploy & verify on sepolia
forge script script/deployPublicPaymaster.s.sol --rpc-url $sepolia --broadcast --verify

// verify on sepolia
forge verify-contract \                                                           17s
    --chain-id 11155111 \
    --compiler-version v0.8.28+commit.8e94f5c9 \
    --watch \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D \
    PublicPaymaster

// ep8 balanceOf
cast to-unit $(cast call --rpc-url $sepolia $ep8 "balanceOf(address)" 0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D) 18

// ep7 balanceOf
cast to-unit $(cast call --rpc-url $sepolia $ep7 "balanceOf(address)" 0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D) 18

// deposit to ep8
cast send --account dev --rpc-url $sepolia \
    $ep8 \
    "depositTo(address account)" \
    0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D \
    --value 0.5ether
    

// deposit to ep7
cast send --account dev --rpc-url $sepolia \
    $ep7 \
    "depositTo(address account)" \
    0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D \
    --value 0.5ether

*/

contract DeployPublicPaymaster is Script {
    function setUp() public {}

    function run() public {
        bytes32 salt = vm.envBytes32("SALT");
        console.logBytes32(salt);

        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        PublicPaymaster publicPaymaster = new PublicPaymaster{salt: salt}();

        console.log("PublicPaymaster at:", address(publicPaymaster));

        vm.stopBroadcast();
    }
}
