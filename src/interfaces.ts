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
    TSimple7702AccountV08: TSimple7702AccountV08__factory.createInterface(),
    TWebAuthnValidator: TWebAuthnValidator__factory.createInterface(),
    TEntryPointV07: TEntryPointV07__factory.createInterface(),
    TKernelV3: TKernelV3__factory.createInterface(),
    TCounter: TCounter__factory.createInterface(),
    TERC20SpendingLimitPolicy: TERC20SpendingLimitPolicy__factory.createInterface(),
    TEntryPointV08: TEntryPointV08__factory.createInterface(),
    TRegistry: TRegistry__factory.createInterface(),
    TSafe7579Launchpad: TSafe7579Launchpad__factory.createInterface(),
    TISafe7579: TISafe7579__factory.createInterface(),
    TSafeProxyFactory: TSafeProxyFactory__factory.createInterface(),
    TISafe: TISafe__factory.createInterface(),
    TIERC20: TIERC20__factory.createInterface(),
    TIHook: TIHook__factory.createInterface(),
    TIValidator: TIValidator__factory.createInterface(),
    TIExecutor: TIExecutor__factory.createInterface(),
    TIModule: TIModule__factory.createInterface(),
    TISigner: TISigner__factory.createInterface(),
    TIFallback: TIFallback__factory.createInterface(),
    TIPolicy: TIPolicy__factory.createInterface(),
    TIERC1271: TIERC1271__factory.createInterface(),
    TIERC2612: TIERC2612__factory.createInterface(),
    TScheduledOrders: TScheduledOrders__factory.createInterface(),
    TScheduledTransfers: TScheduledTransfers__factory.createInterface(),
    TIERC7579Account: TIERC7579Account__factory.createInterface(),
    TIERC7579AccountView: TIERC7579AccountView__factory.createInterface(),
    TIERC7579AccountEvents: TIERC7579AccountEvents__factory.createInterface(),
    TSimpleAccountV08: TSimpleAccountV08__factory.createInterface(),
    TOwnableValidator: TOwnableValidator__factory.createInterface(),
    TSimpleAccountFactoryV08: TSimpleAccountFactoryV08__factory.createInterface(),
    TKernelV3Factory: TKernelV3Factory__factory.createInterface(),
    TSmartSession: TSmartSession__factory.createInterface(),
    TSudoPolicy: TSudoPolicy__factory.createInterface(),
    TECDSAValidator: TECDSAValidator__factory.createInterface(),
    TNexus: TNexus__factory.createInterface(),
    TNexusBootstrap: TNexusBootstrap__factory.createInterface(),
    TUniActionPolicy: TUniActionPolicy__factory.createInterface(),
    TNexusFactory: TNexusFactory__factory.createInterface()
};
