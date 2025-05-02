import { TSimple7702AccountV08__factory } from '@/contract-types/factories/TSimple7702AccountV08__factory';
import { TWebAuthnValidator__factory } from '@/contract-types/factories/TWebAuthnValidator__factory';
import { TEntryPointV07__factory } from '@/contract-types/factories/TEntryPointV07__factory';
import { TKernelV3__factory } from '@/contract-types/factories/TKernelV3__factory';
import { TCounter__factory } from '@/contract-types/factories/TCounter__factory';
import { TERC20SpendingLimitPolicy__factory } from '@/contract-types/factories/TERC20SpendingLimitPolicy__factory';
import { TEntryPointV08__factory } from '@/contract-types/factories/TEntryPointV08__factory';
import { TRegistry__factory } from '@/contract-types/factories/TRegistry__factory';
import { TSafe7579Launchpad__factory } from '@/contract-types/factories/manual/safe/Safe7579Launchpad.sol/TSafe7579Launchpad__factory';
import { TISafe7579__factory } from '@/contract-types/factories/manual/safe/ISafe7579.sol/TISafe7579__factory';
import { TSafeProxyFactory__factory } from '@/contract-types/factories/manual/safe/SafeProxyFactory.sol/TSafeProxyFactory__factory';
import { TISafe__factory } from '@/contract-types/factories/manual/safe/ISafe.sol/TISafe__factory';
import { TIERC20__factory } from '@/contract-types/factories/manual/TIERC20__factory';
import { TIHook__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/TIHook__factory';
import { TIValidator__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/TIValidator__factory';
import { TIExecutor__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/TIExecutor__factory';
import { TIModule__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/TIModule__factory';
import { TISigner__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/TISigner__factory';
import { TIFallback__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/TIFallback__factory';
import { TIPolicy__factory } from '@/contract-types/factories/manual/IERC7579Modules.sol/TIPolicy__factory';
import { TIERC1271__factory } from '@/contract-types/factories/manual/TIERC1271__factory';
import { TIERC2612__factory } from '@/contract-types/factories/manual/TIERC2612__factory';
import { TScheduledOrders__factory } from '@/contract-types/factories/manual/ScheduledOrders.sol/TScheduledOrders__factory';
import { TScheduledTransfers__factory } from '@/contract-types/factories/manual/ScheduledTransfers.sol/TScheduledTransfers__factory';
import { TIERC7579Account__factory } from '@/contract-types/factories/manual/IERC7579Account.sol/TIERC7579Account__factory';
import { TIERC7579AccountView__factory } from '@/contract-types/factories/manual/IERC7579Account.sol/TIERC7579AccountView__factory';
import { TIERC7579AccountEvents__factory } from '@/contract-types/factories/manual/IERC7579Account.sol/TIERC7579AccountEvents__factory';
import { TSimpleAccountV08__factory } from '@/contract-types/factories/manual/TSimpleAccountV08__factory';
import { TOwnableValidator__factory } from '@/contract-types/factories/manual/OwnableValidator.sol/TOwnableValidator__factory';
import { TSimpleAccountFactoryV08__factory } from '@/contract-types/factories/TSimpleAccountFactoryV08__factory';
import { TKernelV3Factory__factory } from '@/contract-types/factories/TKernelV3Factory__factory';
import { TSmartSession__factory } from '@/contract-types/factories/TSmartSession__factory';
import { TSudoPolicy__factory } from '@/contract-types/factories/TSudoPolicy__factory';
import { TECDSAValidator__factory } from '@/contract-types/factories/TECDSAValidator__factory';
import { TNexus__factory } from '@/contract-types/factories/TNexus__factory';
import { TNexusBootstrap__factory } from '@/contract-types/factories/TNexusBootstrap__factory';
import { TUniActionPolicy__factory } from '@/contract-types/factories/TUniActionPolicy__factory';
import { TNexusFactory__factory } from '@/contract-types/factories/TNexusFactory__factory';

export const INTERFACES = {
    Simple7702AccountV08: TSimple7702AccountV08__factory.createInterface(),
    WebAuthnValidator: TWebAuthnValidator__factory.createInterface(),
    EntryPointV07: TEntryPointV07__factory.createInterface(),
    KernelV3: TKernelV3__factory.createInterface(),
    Counter: TCounter__factory.createInterface(),
    ERC20SpendingLimitPolicy: TERC20SpendingLimitPolicy__factory.createInterface(),
    EntryPointV08: TEntryPointV08__factory.createInterface(),
    Registry: TRegistry__factory.createInterface(),
    Safe7579Launchpad: TSafe7579Launchpad__factory.createInterface(),
    ISafe7579: TISafe7579__factory.createInterface(),
    SafeProxyFactory: TSafeProxyFactory__factory.createInterface(),
    ISafe: TISafe__factory.createInterface(),
    IERC20: TIERC20__factory.createInterface(),
    IHook: TIHook__factory.createInterface(),
    IValidator: TIValidator__factory.createInterface(),
    IExecutor: TIExecutor__factory.createInterface(),
    IModule: TIModule__factory.createInterface(),
    ISigner: TISigner__factory.createInterface(),
    IFallback: TIFallback__factory.createInterface(),
    IPolicy: TIPolicy__factory.createInterface(),
    IERC1271: TIERC1271__factory.createInterface(),
    IERC2612: TIERC2612__factory.createInterface(),
    ScheduledOrders: TScheduledOrders__factory.createInterface(),
    ScheduledTransfers: TScheduledTransfers__factory.createInterface(),
    IERC7579Account: TIERC7579Account__factory.createInterface(),
    IERC7579AccountView: TIERC7579AccountView__factory.createInterface(),
    IERC7579AccountEvents: TIERC7579AccountEvents__factory.createInterface(),
    SimpleAccountV08: TSimpleAccountV08__factory.createInterface(),
    OwnableValidator: TOwnableValidator__factory.createInterface(),
    SimpleAccountFactoryV08: TSimpleAccountFactoryV08__factory.createInterface(),
    KernelV3Factory: TKernelV3Factory__factory.createInterface(),
    SmartSession: TSmartSession__factory.createInterface(),
    SudoPolicy: TSudoPolicy__factory.createInterface(),
    ECDSAValidator: TECDSAValidator__factory.createInterface(),
    Nexus: TNexus__factory.createInterface(),
    NexusBootstrap: TNexusBootstrap__factory.createInterface(),
    UniActionPolicy: TUniActionPolicy__factory.createInterface(),
    NexusFactory: TNexusFactory__factory.createInterface()
};
