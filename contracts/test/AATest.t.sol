// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {PublicPaymaster} from "../src/PublicPaymaster.sol";
import {EntryPoint as EntryPoint07} from "aa-0.7/contracts/core/EntryPoint.sol";
import {EntryPoint as EntryPoint08} from "aa-0.8/contracts/core/EntryPoint.sol";

contract AATest is Test {
    PublicPaymaster public paymaster;
    EntryPoint07 ep7 = new EntryPoint07();
    EntryPoint08 ep8 = new EntryPoint08();

    function setUp() public {
        vm.etch(0x0000000071727De22E5E9d8BAf0edAc6f37da032, address(ep7).code);
        vm.etch(0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108, address(ep8).code);
    }
}
