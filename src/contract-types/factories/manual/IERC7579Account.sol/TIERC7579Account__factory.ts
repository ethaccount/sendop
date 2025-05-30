/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  TIERC7579Account,
  TIERC7579AccountInterface,
} from "../../../manual/IERC7579Account.sol/TIERC7579Account";

const _abi = [
  {
    type: "function",
    name: "accountId",
    inputs: [],
    outputs: [
      {
        name: "accountImplementationId",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "execute",
    inputs: [
      {
        name: "mode",
        type: "bytes32",
        internalType: "ModeCode",
      },
      {
        name: "executionCalldata",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "executeFromExecutor",
    inputs: [
      {
        name: "mode",
        type: "bytes32",
        internalType: "ModeCode",
      },
      {
        name: "executionCalldata",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "bytes[]",
        internalType: "bytes[]",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "installModule",
    inputs: [
      {
        name: "moduleTypeId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "module",
        type: "address",
        internalType: "address",
      },
      {
        name: "initData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "isModuleInstalled",
    inputs: [
      {
        name: "moduleTypeId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "module",
        type: "address",
        internalType: "address",
      },
      {
        name: "additionalContext",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isValidSignature",
    inputs: [
      {
        name: "hash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsExecutionMode",
    inputs: [
      {
        name: "encodedMode",
        type: "bytes32",
        internalType: "ModeCode",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsModule",
    inputs: [
      {
        name: "moduleTypeId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "uninstallModule",
    inputs: [
      {
        name: "moduleTypeId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "module",
        type: "address",
        internalType: "address",
      },
      {
        name: "deInitData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "ModuleInstalled",
    inputs: [
      {
        name: "moduleTypeId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "module",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ModuleUninstalled",
    inputs: [
      {
        name: "moduleTypeId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "module",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
] as const;

export class TIERC7579Account__factory {
  static readonly abi = _abi;
  static createInterface(): TIERC7579AccountInterface {
    return new Interface(_abi) as TIERC7579AccountInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): TIERC7579Account {
    return new Contract(address, _abi, runner) as unknown as TIERC7579Account;
  }
}
