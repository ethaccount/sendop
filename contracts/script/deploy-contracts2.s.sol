// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CharityPaymaster} from "../src/CharityPaymaster.sol";
import {IEntryPoint} from "aa-0.7/contracts/interfaces/IEntryPoint.sol";
import {Counter} from "../src/Counter.sol";

/*
(in /contracts directory)

forge script --rpc-url $sepolia script/deploy-contracts2.s.sol --account dev --broadcast --verify

*/

contract DeployContracts is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        Counter counter = new Counter();
        console.log("Counter deployed at", address(counter));

        CharityPaymaster paymaster = new CharityPaymaster();
        console.log("CharityPaymaster deployed at", address(paymaster));

        IEntryPoint(0x0000000071727De22E5E9d8BAf0edAc6f37da032).depositTo{value: 0.1 ether}(address(paymaster));
        console.log("Deposited 0.1 ETH to EntryPoint for paymaster");

        vm.stopBroadcast();
    }
}
