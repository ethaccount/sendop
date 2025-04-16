// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/*

forge create --rpc-url $sepolia --account dev src/Counter.sol:Counter --broadcast --verify

// verify
forge verify-contract \
    --chain-id 11155111 \
    --compiler-version v0.8.28+commit.8e94f5c9 \
    --watch \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    0x7AF8e2116217ea82F7eBfd84C22cB8063BfA01C5 \
    Counter

*/

contract Counter {
    uint256 public number;

    event NumberSet(address indexed caller, uint256 newNumber);
    event NumberIncremented(address indexed caller);

    function setNumber(uint256 newNumber) public {
        number = newNumber;
        emit NumberSet(msg.sender, newNumber);
    }

    function increment() public {
        number++;
        emit NumberIncremented(msg.sender);
    }
}
