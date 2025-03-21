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
} from "../../common";

export interface IHookInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "isInitialized"
      | "isModuleType"
      | "onInstall"
      | "onUninstall"
      | "postCheck"
      | "preCheck"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "isInitialized",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "isModuleType",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "onInstall",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "onUninstall",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "postCheck",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "preCheck",
    values: [AddressLike, BigNumberish, BytesLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "isInitialized",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isModuleType",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "onInstall", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "onUninstall",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "postCheck", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "preCheck", data: BytesLike): Result;
}

export interface IHook extends BaseContract {
  connect(runner?: ContractRunner | null): IHook;
  waitForDeployment(): Promise<this>;

  interface: IHookInterface;

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

  isInitialized: TypedContractMethod<
    [smartAccount: AddressLike],
    [boolean],
    "view"
  >;

  isModuleType: TypedContractMethod<
    [moduleTypeId: BigNumberish],
    [boolean],
    "view"
  >;

  onInstall: TypedContractMethod<[data: BytesLike], [void], "payable">;

  onUninstall: TypedContractMethod<[data: BytesLike], [void], "payable">;

  postCheck: TypedContractMethod<[hookData: BytesLike], [void], "payable">;

  preCheck: TypedContractMethod<
    [msgSender: AddressLike, msgValue: BigNumberish, msgData: BytesLike],
    [string],
    "payable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "isInitialized"
  ): TypedContractMethod<[smartAccount: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "isModuleType"
  ): TypedContractMethod<[moduleTypeId: BigNumberish], [boolean], "view">;
  getFunction(
    nameOrSignature: "onInstall"
  ): TypedContractMethod<[data: BytesLike], [void], "payable">;
  getFunction(
    nameOrSignature: "onUninstall"
  ): TypedContractMethod<[data: BytesLike], [void], "payable">;
  getFunction(
    nameOrSignature: "postCheck"
  ): TypedContractMethod<[hookData: BytesLike], [void], "payable">;
  getFunction(
    nameOrSignature: "preCheck"
  ): TypedContractMethod<
    [msgSender: AddressLike, msgValue: BigNumberish, msgData: BytesLike],
    [string],
    "payable"
  >;

  filters: {};
}
