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
} from "../../common";

export interface TScheduledTransfersInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "accountJobCount"
      | "addOrder"
      | "executeOrder"
      | "executionLog"
      | "isInitialized"
      | "isModuleType"
      | "name"
      | "onInstall"
      | "onUninstall"
      | "toggleOrder"
      | "version"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "ExecutionAdded"
      | "ExecutionStatusUpdated"
      | "ExecutionTriggered"
      | "ExecutionsCancelled"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "accountJobCount",
    values: [AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "addOrder", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "executeOrder",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "executionLog",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "isInitialized",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "isModuleType",
    values: [BigNumberish]
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
    functionFragment: "toggleOrder",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "version", values?: undefined): string;

  decodeFunctionResult(
    functionFragment: "accountJobCount",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "addOrder", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "executeOrder",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "executionLog",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isInitialized",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isModuleType",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "onInstall", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "onUninstall",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "toggleOrder",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "version", data: BytesLike): Result;
}

export namespace ExecutionAddedEvent {
  export type InputTuple = [smartAccount: AddressLike, jobId: BigNumberish];
  export type OutputTuple = [smartAccount: string, jobId: bigint];
  export interface OutputObject {
    smartAccount: string;
    jobId: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ExecutionStatusUpdatedEvent {
  export type InputTuple = [smartAccount: AddressLike, jobId: BigNumberish];
  export type OutputTuple = [smartAccount: string, jobId: bigint];
  export interface OutputObject {
    smartAccount: string;
    jobId: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ExecutionTriggeredEvent {
  export type InputTuple = [smartAccount: AddressLike, jobId: BigNumberish];
  export type OutputTuple = [smartAccount: string, jobId: bigint];
  export interface OutputObject {
    smartAccount: string;
    jobId: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ExecutionsCancelledEvent {
  export type InputTuple = [smartAccount: AddressLike];
  export type OutputTuple = [smartAccount: string];
  export interface OutputObject {
    smartAccount: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface TScheduledTransfers extends BaseContract {
  connect(runner?: ContractRunner | null): TScheduledTransfers;
  waitForDeployment(): Promise<this>;

  interface: TScheduledTransfersInterface;

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

  accountJobCount: TypedContractMethod<
    [smartAccount: AddressLike],
    [bigint],
    "view"
  >;

  addOrder: TypedContractMethod<[orderData: BytesLike], [void], "nonpayable">;

  executeOrder: TypedContractMethod<
    [jobId: BigNumberish],
    [void],
    "nonpayable"
  >;

  executionLog: TypedContractMethod<
    [smartAccount: AddressLike, jobId: BigNumberish],
    [
      [bigint, bigint, bigint, bigint, boolean, bigint, string] & {
        executeInterval: bigint;
        numberOfExecutions: bigint;
        numberOfExecutionsCompleted: bigint;
        startDate: bigint;
        isEnabled: boolean;
        lastExecutionTime: bigint;
        executionData: string;
      }
    ],
    "view"
  >;

  isInitialized: TypedContractMethod<
    [smartAccount: AddressLike],
    [boolean],
    "view"
  >;

  isModuleType: TypedContractMethod<[typeID: BigNumberish], [boolean], "view">;

  name: TypedContractMethod<[], [string], "view">;

  onInstall: TypedContractMethod<[data: BytesLike], [void], "nonpayable">;

  onUninstall: TypedContractMethod<[arg0: BytesLike], [void], "nonpayable">;

  toggleOrder: TypedContractMethod<[jobId: BigNumberish], [void], "nonpayable">;

  version: TypedContractMethod<[], [string], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "accountJobCount"
  ): TypedContractMethod<[smartAccount: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "addOrder"
  ): TypedContractMethod<[orderData: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "executeOrder"
  ): TypedContractMethod<[jobId: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "executionLog"
  ): TypedContractMethod<
    [smartAccount: AddressLike, jobId: BigNumberish],
    [
      [bigint, bigint, bigint, bigint, boolean, bigint, string] & {
        executeInterval: bigint;
        numberOfExecutions: bigint;
        numberOfExecutionsCompleted: bigint;
        startDate: bigint;
        isEnabled: boolean;
        lastExecutionTime: bigint;
        executionData: string;
      }
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "isInitialized"
  ): TypedContractMethod<[smartAccount: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "isModuleType"
  ): TypedContractMethod<[typeID: BigNumberish], [boolean], "view">;
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
    nameOrSignature: "toggleOrder"
  ): TypedContractMethod<[jobId: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "version"
  ): TypedContractMethod<[], [string], "view">;

  getEvent(
    key: "ExecutionAdded"
  ): TypedContractEvent<
    ExecutionAddedEvent.InputTuple,
    ExecutionAddedEvent.OutputTuple,
    ExecutionAddedEvent.OutputObject
  >;
  getEvent(
    key: "ExecutionStatusUpdated"
  ): TypedContractEvent<
    ExecutionStatusUpdatedEvent.InputTuple,
    ExecutionStatusUpdatedEvent.OutputTuple,
    ExecutionStatusUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "ExecutionTriggered"
  ): TypedContractEvent<
    ExecutionTriggeredEvent.InputTuple,
    ExecutionTriggeredEvent.OutputTuple,
    ExecutionTriggeredEvent.OutputObject
  >;
  getEvent(
    key: "ExecutionsCancelled"
  ): TypedContractEvent<
    ExecutionsCancelledEvent.InputTuple,
    ExecutionsCancelledEvent.OutputTuple,
    ExecutionsCancelledEvent.OutputObject
  >;

  filters: {
    "ExecutionAdded(address,uint256)": TypedContractEvent<
      ExecutionAddedEvent.InputTuple,
      ExecutionAddedEvent.OutputTuple,
      ExecutionAddedEvent.OutputObject
    >;
    ExecutionAdded: TypedContractEvent<
      ExecutionAddedEvent.InputTuple,
      ExecutionAddedEvent.OutputTuple,
      ExecutionAddedEvent.OutputObject
    >;

    "ExecutionStatusUpdated(address,uint256)": TypedContractEvent<
      ExecutionStatusUpdatedEvent.InputTuple,
      ExecutionStatusUpdatedEvent.OutputTuple,
      ExecutionStatusUpdatedEvent.OutputObject
    >;
    ExecutionStatusUpdated: TypedContractEvent<
      ExecutionStatusUpdatedEvent.InputTuple,
      ExecutionStatusUpdatedEvent.OutputTuple,
      ExecutionStatusUpdatedEvent.OutputObject
    >;

    "ExecutionTriggered(address,uint256)": TypedContractEvent<
      ExecutionTriggeredEvent.InputTuple,
      ExecutionTriggeredEvent.OutputTuple,
      ExecutionTriggeredEvent.OutputObject
    >;
    ExecutionTriggered: TypedContractEvent<
      ExecutionTriggeredEvent.InputTuple,
      ExecutionTriggeredEvent.OutputTuple,
      ExecutionTriggeredEvent.OutputObject
    >;

    "ExecutionsCancelled(address)": TypedContractEvent<
      ExecutionsCancelledEvent.InputTuple,
      ExecutionsCancelledEvent.OutputTuple,
      ExecutionsCancelledEvent.OutputObject
    >;
    ExecutionsCancelled: TypedContractEvent<
      ExecutionsCancelledEvent.InputTuple,
      ExecutionsCancelledEvent.OutputTuple,
      ExecutionsCancelledEvent.OutputObject
    >;
  };
}
