// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() ERC20("SAManager", "SAM") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
