/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  IExecutor,
  IExecutorInterface,
} from "../../../manual/IERC7579Modules.sol/IExecutor";

const _abi = [
  {
    type: "function",
    name: "isInitialized",
    inputs: [
      {
        name: "smartAccount",
        type: "address",
        internalType: "address",
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
    name: "isModuleType",
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
    name: "onInstall",
    inputs: [
      {
        name: "data",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "onUninstall",
    inputs: [
      {
        name: "data",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "error",
    name: "AlreadyInitialized",
    inputs: [
      {
        name: "smartAccount",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "NotInitialized",
    inputs: [
      {
        name: "smartAccount",
        type: "address",
        internalType: "address",
      },
    ],
  },
] as const;

export class IExecutor__factory {
  static readonly abi = _abi;
  static createInterface(): IExecutorInterface {
    return new Interface(_abi) as IExecutorInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): IExecutor {
    return new Contract(address, _abi, runner) as unknown as IExecutor;
  }
}
