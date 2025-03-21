import { ERC20SpendingLimitPolicy__factory } from '@/contract-types/factories/ERC20SpendingLimitPolicy__factory';
import { NexusBootstrap__factory } from '@/contract-types/factories/NexusBootstrap__factory';
import { CharityPaymaster__factory } from '@/contract-types/factories/CharityPaymaster__factory';
import { EntryPointV7__factory } from '@/contract-types/factories/EntryPointV7__factory';
import { SudoPolicy__factory } from '@/contract-types/factories/SudoPolicy__factory';
import { Nexus__factory } from '@/contract-types/factories/Nexus__factory';
import { ECDSAValidator__factory } from '@/contract-types/factories/ECDSAValidator__factory';
import { K1Validator__factory } from '@/contract-types/factories/K1Validator__factory';
import { Registry__factory } from '@/contract-types/factories/Registry__factory';
import { WebAuthnValidator__factory } from '@/contract-types/factories/WebAuthnValidator__factory';
import { IValidator__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/IValidator__factory';
import { IPolicy__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/IPolicy__factory';
import { ISigner__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/ISigner__factory';
import { IModule__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/IModule__factory';
import { IFallback__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/IFallback__factory';
import { IHook__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/IHook__factory';
import { IExecutor__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/IExecutor__factory';
import { ScheduledOrders__factory } from '@/contract-types/factories/manual/ScheduledOrders__factory';
import { ScheduledTransfers__factory } from '@/contract-types/factories/manual/ScheduledTransfers__factory';
import { OwnableValidator__factory } from '@/contract-types/factories/manual/OwnableValidator__factory';
import { IERC7579Account__factory } from '@/contract-types/factories/manual/IERC7579Account.sol/IERC7579Account__factory';
import { IERC7579AccountEvents__factory } from '@/contract-types/factories/manual/IERC7579Account.sol/IERC7579AccountEvents__factory';
import { IERC7579AccountView__factory } from '@/contract-types/factories/manual/IERC7579Account.sol/IERC7579AccountView__factory';
import { KernelV3__factory } from '@/contract-types/factories/KernelV3__factory';
import { UniActionPolicy__factory } from '@/contract-types/factories/UniActionPolicy__factory';
import { NexusFactory__factory } from '@/contract-types/factories/NexusFactory__factory';
import { KernelV3Factory__factory } from '@/contract-types/factories/KernelV3Factory__factory';
import { SmartSession__factory } from '@/contract-types/factories/SmartSession__factory';
import { Counter__factory } from '@/contract-types/factories/Counter__factory';

export const INTERFACES = {
    ERC20SpendingLimitPolicy: ERC20SpendingLimitPolicy__factory.createInterface(),
    NexusBootstrap: NexusBootstrap__factory.createInterface(),
    CharityPaymaster: CharityPaymaster__factory.createInterface(),
    EntryPointV7: EntryPointV7__factory.createInterface(),
    SudoPolicy: SudoPolicy__factory.createInterface(),
    Nexus: Nexus__factory.createInterface(),
    ECDSAValidator: ECDSAValidator__factory.createInterface(),
    K1Validator: K1Validator__factory.createInterface(),
    Registry: Registry__factory.createInterface(),
    WebAuthnValidator: WebAuthnValidator__factory.createInterface(),
    IValidator: IValidator__factory.createInterface(),
    IPolicy: IPolicy__factory.createInterface(),
    ISigner: ISigner__factory.createInterface(),
    IModule: IModule__factory.createInterface(),
    IFallback: IFallback__factory.createInterface(),
    IHook: IHook__factory.createInterface(),
    IExecutor: IExecutor__factory.createInterface(),
    ScheduledOrders: ScheduledOrders__factory.createInterface(),
    ScheduledTransfers: ScheduledTransfers__factory.createInterface(),
    OwnableValidator: OwnableValidator__factory.createInterface(),
    IERC7579Account: IERC7579Account__factory.createInterface(),
    IERC7579AccountEvents: IERC7579AccountEvents__factory.createInterface(),
    IERC7579AccountView: IERC7579AccountView__factory.createInterface(),
    KernelV3: KernelV3__factory.createInterface(),
    UniActionPolicy: UniActionPolicy__factory.createInterface(),
    NexusFactory: NexusFactory__factory.createInterface(),
    KernelV3Factory: KernelV3Factory__factory.createInterface(),
    SmartSession: SmartSession__factory.createInterface(),
    Counter: Counter__factory.createInterface()
};
