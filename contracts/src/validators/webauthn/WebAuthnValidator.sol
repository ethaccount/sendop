// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IValidator} from "../../interfaces/IERC7579Module.sol";
import {MODULE_TYPE_VALIDATOR} from "../../types/Constants.sol";
import {PackedUserOperation} from "aa-0.7/contracts/interfaces/PackedUserOperation.sol";
import {
    SIG_VALIDATION_FAILED_UINT,
    SIG_VALIDATION_SUCCESS_UINT,
    ERC1271_MAGICVALUE,
    ERC1271_INVALID
} from "../../types/Constants.sol";
import {WebAuthn} from "./WebAuthn.sol";

struct WebAuthnValidatorData {
    uint256 pubKeyX;
    uint256 pubKeyY;
}

/*
    forge create --account dev \
    --rpc-url $sepolia \
    ./src/modules/webauthn/WebAuthnValidator.sol:WebAuthnValidator \
    --broadcast --verify
*/

/**
 * @title WebAuthnValidator
 * @author Modified from https://github.com/zerodevapp/kernel-7579-plugins
 * @notice This validator uses the P256 curve to validate signatures.
 */
contract WebAuthnValidator is IValidator {
    // The location of the challenge in the clientDataJSON
    uint256 constant CHALLENGE_LOCATION = 23;

    // Emitted when a bad key is provided.
    error InvalidPublicKey();

    // Emitted when the public key of a kernel is changed.
    event WebAuthnPublicKeyRegistered(
        address indexed kernel, bytes32 indexed authenticatorIdHash, uint256 pubKeyX, uint256 pubKeyY
    );

    // The P256 public keys of a kernel.
    mapping(address kernel => WebAuthnValidatorData WebAuthnValidatorData) public webAuthnValidatorStorage;

    /**
     * @notice Install WebAuthn validator for a kernel account.
     * @dev The kernel account need to be the `msg.sender`.
     * @dev The public key is encoded as `abi.encode(WebAuthnValidatorData)` inside the data, so (uint256,uint256).
     * @dev The authenticatorIdHash is the hash of the authenticatorId. It enables to find public keys on-chain via event logs.
     */
    function onInstall(bytes calldata _data) external override {
        // check if the webauthn validator is already initialized
        if (_isInitialized(msg.sender)) revert AlreadyInitialized(msg.sender);
        // check validity of the public key
        (WebAuthnValidatorData memory webAuthnData, bytes32 authenticatorIdHash) =
            abi.decode(_data, (WebAuthnValidatorData, bytes32));
        if (webAuthnData.pubKeyX == 0 || webAuthnData.pubKeyY == 0) {
            revert InvalidPublicKey();
        }
        // Update the key (so a sstore)
        webAuthnValidatorStorage[msg.sender] = webAuthnData;
        // And emit the event
        emit WebAuthnPublicKeyRegistered(msg.sender, authenticatorIdHash, webAuthnData.pubKeyX, webAuthnData.pubKeyY);
    }

    /**
     * @notice Uninstall WebAuthn validator for a kernel account.
     * @dev The kernel account need to be the `msg.sender`.
     */
    function onUninstall(bytes calldata) external override {
        if (!_isInitialized(msg.sender)) revert NotInitialized(msg.sender);
        delete webAuthnValidatorStorage[msg.sender];
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == MODULE_TYPE_VALIDATOR;
    }

    function isInitialized(address smartAccount) external view override returns (bool) {
        return _isInitialized(smartAccount);
    }

    function _isInitialized(address smartAccount) internal view returns (bool) {
        return webAuthnValidatorStorage[smartAccount].pubKeyX != 0;
    }

    /**
     * @notice Validate a user operation.
     */
    function validateUserOp(PackedUserOperation calldata _userOp, bytes32 _userOpHash)
        external
        view
        override
        returns (uint256)
    {
        return _verifySignature(msg.sender, _userOpHash, _userOp.signature);
    }

    /**
     * @notice Verify a signature with sender for ERC-1271 validation.
     */
    function isValidSignatureWithSender(address sender, bytes32 hash, bytes calldata data)
        external
        view
        returns (bytes4)
    {
        return _verifySignature(msg.sender, hash, data) == SIG_VALIDATION_SUCCESS_UINT
            ? ERC1271_MAGICVALUE
            : ERC1271_INVALID;
    }

    /**
     * @notice Verify a signature.
     */
    function _verifySignature(address account, bytes32 hash, bytes calldata signature) private view returns (uint256) {
        // decode the signature
        (
            bytes memory authenticatorData,
            string memory clientDataJSON,
            uint256 responseTypeLocation,
            uint256 r,
            uint256 s,
            bool usePrecompiled
        ) = abi.decode(signature, (bytes, string, uint256, uint256, uint256, bool));

        // get the public key from storage
        WebAuthnValidatorData memory webAuthnData = webAuthnValidatorStorage[account];

        // verify the signature using the signature and the public key
        bool isValid = WebAuthn.verifySignature(
            abi.encodePacked(hash),
            authenticatorData,
            true,
            clientDataJSON,
            CHALLENGE_LOCATION,
            responseTypeLocation,
            r,
            s,
            webAuthnData.pubKeyX,
            webAuthnData.pubKeyY,
            usePrecompiled
        );

        // return the validation data
        if (isValid) {
            return SIG_VALIDATION_SUCCESS_UINT;
        }

        return SIG_VALIDATION_FAILED_UINT;
    }
}
