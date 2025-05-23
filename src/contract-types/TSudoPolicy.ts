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

export interface TSudoPolicyInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "check1271SignedAction"
      | "checkAction"
      | "checkUserOpPolicy"
      | "initializeWithMultiplexer"
      | "supportsInterface"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "PolicySet"
      | "SudoPolicyInstalledMultiplexer"
      | "SudoPolicyRemoved"
      | "SudoPolicySet"
      | "SudoPolicyUninstalledAllAccount"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "check1271SignedAction",
    values: [BytesLike, AddressLike, AddressLike, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "checkAction",
    values: [BytesLike, AddressLike, AddressLike, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "checkUserOpPolicy",
    values: [BytesLike, PackedUserOperationStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "initializeWithMultiplexer",
    values: [AddressLike, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "supportsInterface",
    values: [BytesLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "check1271SignedAction",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "checkAction",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "checkUserOpPolicy",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "initializeWithMultiplexer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "supportsInterface",
    data: BytesLike
  ): Result;
}

export namespace PolicySetEvent {
  export type InputTuple = [
    id: BytesLike,
    multiplexer: AddressLike,
    account: AddressLike
  ];
  export type OutputTuple = [id: string, multiplexer: string, account: string];
  export interface OutputObject {
    id: string;
    multiplexer: string;
    account: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace SudoPolicyInstalledMultiplexerEvent {
  export type InputTuple = [
    account: AddressLike,
    multiplexer: AddressLike,
    id: BytesLike
  ];
  export type OutputTuple = [account: string, multiplexer: string, id: string];
  export interface OutputObject {
    account: string;
    multiplexer: string;
    id: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace SudoPolicyRemovedEvent {
  export type InputTuple = [
    account: AddressLike,
    multiplexer: AddressLike,
    id: BytesLike
  ];
  export type OutputTuple = [account: string, multiplexer: string, id: string];
  export interface OutputObject {
    account: string;
    multiplexer: string;
    id: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace SudoPolicySetEvent {
  export type InputTuple = [
    account: AddressLike,
    multiplexer: AddressLike,
    id: BytesLike
  ];
  export type OutputTuple = [account: string, multiplexer: string, id: string];
  export interface OutputObject {
    account: string;
    multiplexer: string;
    id: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace SudoPolicyUninstalledAllAccountEvent {
  export type InputTuple = [account: AddressLike];
  export type OutputTuple = [account: string];
  export interface OutputObject {
    account: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface TSudoPolicy extends BaseContract {
  connect(runner?: ContractRunner | null): TSudoPolicy;
  waitForDeployment(): Promise<this>;

  interface: TSudoPolicyInterface;

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

  check1271SignedAction: TypedContractMethod<
    [
      id: BytesLike,
      requestSender: AddressLike,
      account: AddressLike,
      hash: BytesLike,
      signature: BytesLike
    ],
    [boolean],
    "view"
  >;

  checkAction: TypedContractMethod<
    [
      arg0: BytesLike,
      arg1: AddressLike,
      arg2: AddressLike,
      arg3: BigNumberish,
      arg4: BytesLike
    ],
    [bigint],
    "view"
  >;

  checkUserOpPolicy: TypedContractMethod<
    [arg0: BytesLike, arg1: PackedUserOperationStruct],
    [bigint],
    "view"
  >;

  initializeWithMultiplexer: TypedContractMethod<
    [account: AddressLike, configId: BytesLike, arg2: BytesLike],
    [void],
    "nonpayable"
  >;

  supportsInterface: TypedContractMethod<
    [interfaceID: BytesLike],
    [boolean],
    "view"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "check1271SignedAction"
  ): TypedContractMethod<
    [
      id: BytesLike,
      requestSender: AddressLike,
      account: AddressLike,
      hash: BytesLike,
      signature: BytesLike
    ],
    [boolean],
    "view"
  >;
  getFunction(
    nameOrSignature: "checkAction"
  ): TypedContractMethod<
    [
      arg0: BytesLike,
      arg1: AddressLike,
      arg2: AddressLike,
      arg3: BigNumberish,
      arg4: BytesLike
    ],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "checkUserOpPolicy"
  ): TypedContractMethod<
    [arg0: BytesLike, arg1: PackedUserOperationStruct],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "initializeWithMultiplexer"
  ): TypedContractMethod<
    [account: AddressLike, configId: BytesLike, arg2: BytesLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "supportsInterface"
  ): TypedContractMethod<[interfaceID: BytesLike], [boolean], "view">;

  getEvent(
    key: "PolicySet"
  ): TypedContractEvent<
    PolicySetEvent.InputTuple,
    PolicySetEvent.OutputTuple,
    PolicySetEvent.OutputObject
  >;
  getEvent(
    key: "SudoPolicyInstalledMultiplexer"
  ): TypedContractEvent<
    SudoPolicyInstalledMultiplexerEvent.InputTuple,
    SudoPolicyInstalledMultiplexerEvent.OutputTuple,
    SudoPolicyInstalledMultiplexerEvent.OutputObject
  >;
  getEvent(
    key: "SudoPolicyRemoved"
  ): TypedContractEvent<
    SudoPolicyRemovedEvent.InputTuple,
    SudoPolicyRemovedEvent.OutputTuple,
    SudoPolicyRemovedEvent.OutputObject
  >;
  getEvent(
    key: "SudoPolicySet"
  ): TypedContractEvent<
    SudoPolicySetEvent.InputTuple,
    SudoPolicySetEvent.OutputTuple,
    SudoPolicySetEvent.OutputObject
  >;
  getEvent(
    key: "SudoPolicyUninstalledAllAccount"
  ): TypedContractEvent<
    SudoPolicyUninstalledAllAccountEvent.InputTuple,
    SudoPolicyUninstalledAllAccountEvent.OutputTuple,
    SudoPolicyUninstalledAllAccountEvent.OutputObject
  >;

  filters: {
    "PolicySet(bytes32,address,address)": TypedContractEvent<
      PolicySetEvent.InputTuple,
      PolicySetEvent.OutputTuple,
      PolicySetEvent.OutputObject
    >;
    PolicySet: TypedContractEvent<
      PolicySetEvent.InputTuple,
      PolicySetEvent.OutputTuple,
      PolicySetEvent.OutputObject
    >;

    "SudoPolicyInstalledMultiplexer(address,address,bytes32)": TypedContractEvent<
      SudoPolicyInstalledMultiplexerEvent.InputTuple,
      SudoPolicyInstalledMultiplexerEvent.OutputTuple,
      SudoPolicyInstalledMultiplexerEvent.OutputObject
    >;
    SudoPolicyInstalledMultiplexer: TypedContractEvent<
      SudoPolicyInstalledMultiplexerEvent.InputTuple,
      SudoPolicyInstalledMultiplexerEvent.OutputTuple,
      SudoPolicyInstalledMultiplexerEvent.OutputObject
    >;

    "SudoPolicyRemoved(address,address,bytes32)": TypedContractEvent<
      SudoPolicyRemovedEvent.InputTuple,
      SudoPolicyRemovedEvent.OutputTuple,
      SudoPolicyRemovedEvent.OutputObject
    >;
    SudoPolicyRemoved: TypedContractEvent<
      SudoPolicyRemovedEvent.InputTuple,
      SudoPolicyRemovedEvent.OutputTuple,
      SudoPolicyRemovedEvent.OutputObject
    >;

    "SudoPolicySet(address,address,bytes32)": TypedContractEvent<
      SudoPolicySetEvent.InputTuple,
      SudoPolicySetEvent.OutputTuple,
      SudoPolicySetEvent.OutputObject
    >;
    SudoPolicySet: TypedContractEvent<
      SudoPolicySetEvent.InputTuple,
      SudoPolicySetEvent.OutputTuple,
      SudoPolicySetEvent.OutputObject
    >;

    "SudoPolicyUninstalledAllAccount(address)": TypedContractEvent<
      SudoPolicyUninstalledAllAccountEvent.InputTuple,
      SudoPolicyUninstalledAllAccountEvent.OutputTuple,
      SudoPolicyUninstalledAllAccountEvent.OutputObject
    >;
    SudoPolicyUninstalledAllAccount: TypedContractEvent<
      SudoPolicyUninstalledAllAccountEvent.InputTuple,
      SudoPolicyUninstalledAllAccountEvent.OutputTuple,
      SudoPolicyUninstalledAllAccountEvent.OutputObject
    >;
  };
}
