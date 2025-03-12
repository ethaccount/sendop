import {
  ENTRY_POINT_V07,
  REGISTRY,
  KERNEL_FACTORY,
  MY_ACCOUNT_FACTORY,
  K1_VALIDATOR,
  WEB_AUTHN_VALIDATOR,
  SMART_SESSION,
  SUDO_POLICY,
  UNI_ACTION_POLICY,
  ERC20_SPENDING_LIMIT_POLICY
} from '@/address'

import {
  EntryPointV07__factory,
  Registry__factory,
  KernelFactory__factory,
  MyAccountFactory__factory,
  K1Validator__factory,
  WebAuthnValidator__factory,
  SmartSession__factory,
  SudoPolicy__factory,
  UniActionPolicy__factory,
  ERC20SpendingLimitPolicy__factory
} from '@/contract-types'

import type { ContractRunner } from 'ethers'

export function connectEntryPointV07(runner: ContractRunner) {
  return EntryPointV07__factory.connect(ENTRY_POINT_V07, runner)
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
