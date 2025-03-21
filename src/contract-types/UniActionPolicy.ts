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

export type LimitUsageStruct = { limit: BigNumberish; used: BigNumberish };

export type LimitUsageStructOutput = [limit: bigint, used: bigint] & {
  limit: bigint;
  used: bigint;
};

export type ParamRuleStruct = {
  condition: BigNumberish;
  offset: BigNumberish;
  isLimited: boolean;
  ref: BytesLike;
  usage: LimitUsageStruct;
};

export type ParamRuleStructOutput = [
  condition: bigint,
  offset: bigint,
  isLimited: boolean,
  ref: string,
  usage: LimitUsageStructOutput
] & {
  condition: bigint;
  offset: bigint;
  isLimited: boolean;
  ref: string;
  usage: LimitUsageStructOutput;
};

export type ParamRulesStruct = {
  length: BigNumberish;
  rules: ParamRuleStruct[];
};

export type ParamRulesStructOutput = [
  length: bigint,
  rules: ParamRuleStructOutput[]
] & { length: bigint; rules: ParamRuleStructOutput[] };

export interface UniActionPolicyInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "actionConfigs"
      | "checkAction"
      | "initializeWithMultiplexer"
      | "supportsInterface"
  ): FunctionFragment;

  getEvent(nameOrSignatureOrTopic: "PolicySet"): EventFragment;

  encodeFunctionData(
    functionFragment: "actionConfigs",
    values: [BytesLike, AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "checkAction",
    values: [BytesLike, AddressLike, AddressLike, BigNumberish, BytesLike]
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
    functionFragment: "actionConfigs",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "checkAction",
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

export interface UniActionPolicy extends BaseContract {
  connect(runner?: ContractRunner | null): UniActionPolicy;
  waitForDeployment(): Promise<this>;

  interface: UniActionPolicyInterface;

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

  actionConfigs: TypedContractMethod<
    [id: BytesLike, msgSender: AddressLike, userOpSender: AddressLike],
    [
      [bigint, ParamRulesStructOutput] & {
        valueLimitPerUse: bigint;
        paramRules: ParamRulesStructOutput;
      }
    ],
    "view"
  >;

  checkAction: TypedContractMethod<
    [
      id: BytesLike,
      account: AddressLike,
      arg2: AddressLike,
      value: BigNumberish,
      data: BytesLike
    ],
    [bigint],
    "nonpayable"
  >;

  initializeWithMultiplexer: TypedContractMethod<
    [account: AddressLike, configId: BytesLike, initData: BytesLike],
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
    nameOrSignature: "actionConfigs"
  ): TypedContractMethod<
    [id: BytesLike, msgSender: AddressLike, userOpSender: AddressLike],
    [
      [bigint, ParamRulesStructOutput] & {
        valueLimitPerUse: bigint;
        paramRules: ParamRulesStructOutput;
      }
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "checkAction"
  ): TypedContractMethod<
    [
      id: BytesLike,
      account: AddressLike,
      arg2: AddressLike,
      value: BigNumberish,
      data: BytesLike
    ],
    [bigint],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "initializeWithMultiplexer"
  ): TypedContractMethod<
    [account: AddressLike, configId: BytesLike, initData: BytesLike],
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
  };
}
