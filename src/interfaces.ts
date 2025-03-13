import { EntryPointV7__factory } from '@/contract-types';
import { Registry__factory } from '@/contract-types';
import { KernelV3Factory__factory } from '@/contract-types';
import { MyAccountFactory__factory } from '@/contract-types';
import { KernelV3__factory } from '@/contract-types';
import { ECDSAValidator__factory } from '@/contract-types';
import { K1Validator__factory } from '@/contract-types';
import { WebAuthnValidator__factory } from '@/contract-types';
import { SmartSession__factory } from '@/contract-types';
import { SudoPolicy__factory } from '@/contract-types';
import { UniActionPolicy__factory } from '@/contract-types';
import { ERC20SpendingLimitPolicy__factory } from '@/contract-types';
import { ScheduledTransfers__factory } from '@/contract-types';
import { ScheduledOrders__factory } from '@/contract-types';
import { Counter__factory } from '@/contract-types';
import { CharityPaymaster__factory } from '@/contract-types';

const INTERFACES = {
    EntryPointV7: EntryPointV7__factory.createInterface(),
    Registry: Registry__factory.createInterface(),
    KernelV3Factory: KernelV3Factory__factory.createInterface(),
    MyAccountFactory: MyAccountFactory__factory.createInterface(),
    KernelV3: KernelV3__factory.createInterface(),
    ECDSAValidator: ECDSAValidator__factory.createInterface(),
    K1Validator: K1Validator__factory.createInterface(),
    WebAuthnValidator: WebAuthnValidator__factory.createInterface(),
    SmartSession: SmartSession__factory.createInterface(),
    SudoPolicy: SudoPolicy__factory.createInterface(),
    UniActionPolicy: UniActionPolicy__factory.createInterface(),
    ERC20SpendingLimitPolicy: ERC20SpendingLimitPolicy__factory.createInterface(),
    ScheduledTransfers: ScheduledTransfers__factory.createInterface(),
    ScheduledOrders: ScheduledOrders__factory.createInterface(),
    Counter: Counter__factory.createInterface(),
    CharityPaymaster: CharityPaymaster__factory.createInterface()
};

export default INTERFACES;
