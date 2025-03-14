/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "./common";

export type PackedUserOperationStruct = {
  sender: AddressLike;
  nonce: BigNumberish;
  initCode: BytesLike;
  callData: BytesLike;
  accountGasLimits: BytesLike;
  preVerificationGas: BigNumberish;
  gasFees: BytesLike;
  paymasterAndData: BytesLike;
  signature: BytesLike;
};

export type PackedUserOperationStructOutput = [
  sender: string,
  nonce: bigint,
  initCode: string,
  callData: string,
  accountGasLimits: string,
  preVerificationGas: bigint,
  gasFees: string,
  paymasterAndData: string,
  signature: string
] & {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  accountGasLimits: string;
  preVerificationGas: bigint;
  gasFees: string;
  paymasterAndData: string;
  signature: string;
};

export interface OwnableValidatorInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "addOwner"
      | "getOwners"
      | "isInitialized"
      | "isModuleType"
      | "isValidSignatureWithSender"
      | "name"
      | "onInstall"
      | "onUninstall"
      | "ownerCount"
      | "removeOwner"
      | "setThreshold"
      | "threshold"
      | "validateSignatureWithData"
      | "validateUserOp"
      | "version"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "addOwner",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getOwners",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "isInitialized",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "isModuleType",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "isValidSignatureWithSender",
    values: [AddressLike, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "name", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "onInstall",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "onUninstall",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "ownerCount",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "removeOwner",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setThreshold",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "threshold",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "validateSignatureWithData",
    values: [BytesLike, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "validateUserOp",
    values: [PackedUserOperationStruct, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "version", values?: undefined): string;

  decodeFunctionResult(functionFragment: "addOwner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getOwners", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "isInitialized",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isModuleType",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isValidSignatureWithSender",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "onInstall", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "onUninstall",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "ownerCount", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "removeOwner",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setThreshold",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "threshold", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "validateSignatureWithData",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "validateUserOp",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "version", data: BytesLike): Result;
}

export interface OwnableValidator extends BaseContract {
  connect(runner?: ContractRunner | null): OwnableValidator;
  waitForDeployment(): Promise<this>;

  interface: OwnableValidatorInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  addOwner: TypedContractMethod<[owner: AddressLike], [void], "nonpayable">;

  getOwners: TypedContractMethod<[account: AddressLike], [string[]], "view">;

  isInitialized: TypedContractMethod<
    [smartAccount: AddressLike],
    [boolean],
    "view"
  >;

  isModuleType: TypedContractMethod<[typeID: BigNumberish], [boolean], "view">;

  isValidSignatureWithSender: TypedContractMethod<
    [arg0: AddressLike, hash: BytesLike, data: BytesLike],
    [string],
    "view"
  >;

  name: TypedContractMethod<[], [string], "view">;

  onInstall: TypedContractMethod<[data: BytesLike], [void], "nonpayable">;

  onUninstall: TypedContractMethod<[arg0: BytesLike], [void], "nonpayable">;

  ownerCount: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  removeOwner: TypedContractMethod<
    [prevOwner: AddressLike, owner: AddressLike],
    [void],
    "nonpayable"
  >;

  setThreshold: TypedContractMethod<
    [_threshold: BigNumberish],
    [void],
    "nonpayable"
  >;

  threshold: TypedContractMethod<[account: AddressLike], [bigint], "view">;

  validateSignatureWithData: TypedContractMethod<
    [hash: BytesLike, signature: BytesLike, data: BytesLike],
    [boolean],
    "view"
  >;

  validateUserOp: TypedContractMethod<
    [userOp: PackedUserOperationStruct, userOpHash: BytesLike],
    [bigint],
    "view"
  >;

  version: TypedContractMethod<[], [string], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "addOwner"
  ): TypedContractMethod<[owner: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "getOwners"
  ): TypedContractMethod<[account: AddressLike], [string[]], "view">;
  getFunction(
    nameOrSignature: "isInitialized"
  ): TypedContractMethod<[smartAccount: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "isModuleType"
  ): TypedContractMethod<[typeID: BigNumberish], [boolean], "view">;
  getFunction(
    nameOrSignature: "isValidSignatureWithSender"
  ): TypedContractMethod<
    [arg0: AddressLike, hash: BytesLike, data: BytesLike],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "name"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "onInstall"
  ): TypedContractMethod<[data: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "onUninstall"
  ): TypedContractMethod<[arg0: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "ownerCount"
  ): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "removeOwner"
  ): TypedContractMethod<
    [prevOwner: AddressLike, owner: AddressLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "setThreshold"
  ): TypedContractMethod<[_threshold: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "threshold"
  ): TypedContractMethod<[account: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "validateSignatureWithData"
  ): TypedContractMethod<
    [hash: BytesLike, signature: BytesLike, data: BytesLike],
    [boolean],
    "view"
  >;
  getFunction(
    nameOrSignature: "validateUserOp"
  ): TypedContractMethod<
    [userOp: PackedUserOperationStruct, userOpHash: BytesLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "version"
  ): TypedContractMethod<[], [string], "view">;

  filters: {};
}
