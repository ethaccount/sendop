import {
  ENTRY_POINT_V0_7,
  REGISTRY,
  KERNEL_FACTORY,
  MY_ACCOUNT_FACTORY,
  KERNEL_V0_3_1,
  K1_VALIDATOR,
  WEB_AUTHN_VALIDATOR,
  SMART_SESSION,
  SUDO_POLICY,
  UNI_ACTION_POLICY,
  ERC20_SPENDING_LIMIT_POLICY,
  SCHEDULED_TRANSFERS,
  SCHEDULED_ORDERS,
  COUNTER,
  CHARITY_PAYMASTER
} from '@/address'

import {
  EntryPointV07__factory,
  Registry__factory,
  KernelFactory__factory,
  MyAccountFactory__factory,
  KernelV031__factory,
  K1Validator__factory,
  WebAuthnValidator__factory,
  SmartSession__factory,
  SudoPolicy__factory,
  UniActionPolicy__factory,
  ERC20SpendingLimitPolicy__factory,
  ScheduledTransfers__factory,
  ScheduledOrders__factory,
  Counter__factory,
  CharityPaymaster__factory
} from '@/contract-types'

import type { ContractRunner } from 'ethers'

export function connectEntryPointV07(runner: ContractRunner) {
  return EntryPointV07__factory.connect(ENTRY_POINT_V0_7, runner)
}

export function connectRegistry(runner: ContractRunner) {
  return Registry__factory.connect(REGISTRY, runner)
}

export function connectKernelFactory(runner: ContractRunner) {
  return KernelFactory__factory.connect(KERNEL_FACTORY, runner)
}

export function connectMyAccountFactory(runner: ContractRunner) {
  return MyAccountFactory__factory.connect(MY_ACCOUNT_FACTORY, runner)
}

export function connectKernelV031(runner: ContractRunner) {
  return KernelV031__factory.connect(KERNEL_V0_3_1, runner)
}

export function connectK1Validator(runner: ContractRunner) {
  return K1Validator__factory.connect(K1_VALIDATOR, runner)
}

export function connectWebAuthnValidator(runner: ContractRunner) {
  return WebAuthnValidator__factory.connect(WEB_AUTHN_VALIDATOR, runner)
}

export function connectSmartSession(runner: ContractRunner) {
  return SmartSession__factory.connect(SMART_SESSION, runner)
}

export function connectSudoPolicy(runner: ContractRunner) {
  return SudoPolicy__factory.connect(SUDO_POLICY, runner)
}

export function connectUniActionPolicy(runner: ContractRunner) {
  return UniActionPolicy__factory.connect(UNI_ACTION_POLICY, runner)
}

export function connectErc20SpendingLimitPolicy(runner: ContractRunner) {
  return ERC20SpendingLimitPolicy__factory.connect(ERC20_SPENDING_LIMIT_POLICY, runner)
}

export function connectScheduledTransfers(runner: ContractRunner) {
  return ScheduledTransfers__factory.connect(SCHEDULED_TRANSFERS, runner)
}

export function connectScheduledOrders(runner: ContractRunner) {
  return ScheduledOrders__factory.connect(SCHEDULED_ORDERS, runner)
}

export function connectCounter(runner: ContractRunner) {
  return Counter__factory.connect(COUNTER, runner)
}

export function connectCharityPaymaster(runner: ContractRunner) {
  return CharityPaymaster__factory.connect(CHARITY_PAYMASTER, runner)
}
