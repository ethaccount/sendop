/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  IERC7579AccountView,
  IERC7579AccountViewInterface,
} from "../../../manual/IERC7579Account.sol/IERC7579AccountView";

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
] as const;

export class IERC7579AccountView__factory {
  static readonly abi = _abi;
  static createInterface(): IERC7579AccountViewInterface {
    return new Interface(_abi) as IERC7579AccountViewInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): IERC7579AccountView {
    return new Contract(
      address,
      _abi,
      runner
    ) as unknown as IERC7579AccountView;
  }
}
