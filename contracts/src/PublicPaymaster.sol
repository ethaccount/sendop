// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import "aa-0.8/contracts/interfaces/IPaymaster.sol";

contract PublicPaymaster is IPaymaster {
    function validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost)
        external
        returns (bytes memory context, uint256 validationData)
    {
        return ("", 0);
    }

    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost, uint256 actualUserOpFeePerGas)
        external
    {}
}
