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
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "./common";

export interface TNexusFactoryInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "ACCOUNT_IMPLEMENTATION"
      | "addStake"
      | "cancelOwnershipHandover"
      | "completeOwnershipHandover"
      | "computeAccountAddress"
      | "createAccount"
      | "owner"
      | "ownershipHandoverExpiresAt"
      | "renounceOwnership"
      | "requestOwnershipHandover"
      | "transferOwnership"
      | "unlockStake"
      | "withdrawStake"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "AccountCreated"
      | "OwnershipHandoverCanceled"
      | "OwnershipHandoverRequested"
      | "OwnershipTransferred"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "ACCOUNT_IMPLEMENTATION",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "addStake",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "cancelOwnershipHandover",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "completeOwnershipHandover",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "computeAccountAddress",
    values: [BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "createAccount",
    values: [BytesLike, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "ownershipHandoverExpiresAt",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "requestOwnershipHandover",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "unlockStake",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawStake",
    values: [AddressLike, AddressLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "ACCOUNT_IMPLEMENTATION",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "addStake", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "cancelOwnershipHandover",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "completeOwnershipHandover",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "computeAccountAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "createAccount",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "ownershipHandoverExpiresAt",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "requestOwnershipHandover",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "unlockStake",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawStake",
    data: BytesLike
  ): Result;
}

export namespace AccountCreatedEvent {
  export type InputTuple = [
    account: AddressLike,
    initData: BytesLike,
    salt: BytesLike
  ];
  export type OutputTuple = [account: string, initData: string, salt: string];
  export interface OutputObject {
    account: string;
    initData: string;
    salt: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace OwnershipHandoverCanceledEvent {
  export type InputTuple = [pendingOwner: AddressLike];
  export type OutputTuple = [pendingOwner: string];
  export interface OutputObject {
    pendingOwner: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace OwnershipHandoverRequestedEvent {
  export type InputTuple = [pendingOwner: AddressLike];
  export type OutputTuple = [pendingOwner: string];
  export interface OutputObject {
    pendingOwner: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace OwnershipTransferredEvent {
  export type InputTuple = [oldOwner: AddressLike, newOwner: AddressLike];
  export type OutputTuple = [oldOwner: string, newOwner: string];
  export interface OutputObject {
    oldOwner: string;
    newOwner: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface TNexusFactory extends BaseContract {
  connect(runner?: ContractRunner | null): TNexusFactory;
  waitForDeployment(): Promise<this>;

  interface: TNexusFactoryInterface;

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

  ACCOUNT_IMPLEMENTATION: TypedContractMethod<[], [string], "view">;

  addStake: TypedContractMethod<
    [epAddress: AddressLike, unstakeDelaySec: BigNumberish],
    [void],
    "payable"
  >;

  cancelOwnershipHandover: TypedContractMethod<[], [void], "payable">;

  completeOwnershipHandover: TypedContractMethod<
    [pendingOwner: AddressLike],
    [void],
    "payable"
  >;

  computeAccountAddress: TypedContractMethod<
    [initData: BytesLike, salt: BytesLike],
    [string],
    "view"
  >;

  createAccount: TypedContractMethod<
    [initData: BytesLike, salt: BytesLike],
    [string],
    "payable"
  >;

  owner: TypedContractMethod<[], [string], "view">;

  ownershipHandoverExpiresAt: TypedContractMethod<
    [pendingOwner: AddressLike],
    [bigint],
    "view"
  >;

  renounceOwnership: TypedContractMethod<[], [void], "payable">;

  requestOwnershipHandover: TypedContractMethod<[], [void], "payable">;

  transferOwnership: TypedContractMethod<
    [newOwner: AddressLike],
    [void],
    "payable"
  >;

  unlockStake: TypedContractMethod<
    [epAddress: AddressLike],
    [void],
    "nonpayable"
  >;

  withdrawStake: TypedContractMethod<
    [epAddress: AddressLike, withdrawAddress: AddressLike],
    [void],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "ACCOUNT_IMPLEMENTATION"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "addStake"
  ): TypedContractMethod<
    [epAddress: AddressLike, unstakeDelaySec: BigNumberish],
    [void],
    "payable"
  >;
  getFunction(
    nameOrSignature: "cancelOwnershipHandover"
  ): TypedContractMethod<[], [void], "payable">;
  getFunction(
    nameOrSignature: "completeOwnershipHandover"
  ): TypedContractMethod<[pendingOwner: AddressLike], [void], "payable">;
  getFunction(
    nameOrSignature: "computeAccountAddress"
  ): TypedContractMethod<
    [initData: BytesLike, salt: BytesLike],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "createAccount"
  ): TypedContractMethod<
    [initData: BytesLike, salt: BytesLike],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "ownershipHandoverExpiresAt"
  ): TypedContractMethod<[pendingOwner: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "renounceOwnership"
  ): TypedContractMethod<[], [void], "payable">;
  getFunction(
    nameOrSignature: "requestOwnershipHandover"
  ): TypedContractMethod<[], [void], "payable">;
  getFunction(
    nameOrSignature: "transferOwnership"
  ): TypedContractMethod<[newOwner: AddressLike], [void], "payable">;
  getFunction(
    nameOrSignature: "unlockStake"
  ): TypedContractMethod<[epAddress: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "withdrawStake"
  ): TypedContractMethod<
    [epAddress: AddressLike, withdrawAddress: AddressLike],
    [void],
    "nonpayable"
  >;

  getEvent(
    key: "AccountCreated"
  ): TypedContractEvent<
    AccountCreatedEvent.InputTuple,
    AccountCreatedEvent.OutputTuple,
    AccountCreatedEvent.OutputObject
  >;
  getEvent(
    key: "OwnershipHandoverCanceled"
  ): TypedContractEvent<
    OwnershipHandoverCanceledEvent.InputTuple,
    OwnershipHandoverCanceledEvent.OutputTuple,
    OwnershipHandoverCanceledEvent.OutputObject
  >;
  getEvent(
    key: "OwnershipHandoverRequested"
  ): TypedContractEvent<
    OwnershipHandoverRequestedEvent.InputTuple,
    OwnershipHandoverRequestedEvent.OutputTuple,
    OwnershipHandoverRequestedEvent.OutputObject
  >;
  getEvent(
    key: "OwnershipTransferred"
  ): TypedContractEvent<
    OwnershipTransferredEvent.InputTuple,
    OwnershipTransferredEvent.OutputTuple,
    OwnershipTransferredEvent.OutputObject
  >;

  filters: {
    "AccountCreated(address,bytes,bytes32)": TypedContractEvent<
      AccountCreatedEvent.InputTuple,
      AccountCreatedEvent.OutputTuple,
      AccountCreatedEvent.OutputObject
    >;
    AccountCreated: TypedContractEvent<
      AccountCreatedEvent.InputTuple,
      AccountCreatedEvent.OutputTuple,
      AccountCreatedEvent.OutputObject
    >;

    "OwnershipHandoverCanceled(address)": TypedContractEvent<
      OwnershipHandoverCanceledEvent.InputTuple,
      OwnershipHandoverCanceledEvent.OutputTuple,
      OwnershipHandoverCanceledEvent.OutputObject
    >;
    OwnershipHandoverCanceled: TypedContractEvent<
      OwnershipHandoverCanceledEvent.InputTuple,
      OwnershipHandoverCanceledEvent.OutputTuple,
      OwnershipHandoverCanceledEvent.OutputObject
    >;

    "OwnershipHandoverRequested(address)": TypedContractEvent<
      OwnershipHandoverRequestedEvent.InputTuple,
      OwnershipHandoverRequestedEvent.OutputTuple,
      OwnershipHandoverRequestedEvent.OutputObject
    >;
    OwnershipHandoverRequested: TypedContractEvent<
      OwnershipHandoverRequestedEvent.InputTuple,
      OwnershipHandoverRequestedEvent.OutputTuple,
      OwnershipHandoverRequestedEvent.OutputObject
    >;

    "OwnershipTransferred(address,address)": TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
    OwnershipTransferred: TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
  };
}
