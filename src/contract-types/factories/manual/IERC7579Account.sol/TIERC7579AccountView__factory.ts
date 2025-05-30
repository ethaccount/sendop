/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  TIERC7579AccountView,
  TIERC7579AccountViewInterface,
} from "../../../manual/IERC7579Account.sol/TIERC7579AccountView";

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

export class TIERC7579AccountView__factory {
  static readonly abi = _abi;
  static createInterface(): TIERC7579AccountViewInterface {
    return new Interface(_abi) as TIERC7579AccountViewInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): TIERC7579AccountView {
    return new Contract(
      address,
      _abi,
      runner
    ) as unknown as TIERC7579AccountView;
  }
}
