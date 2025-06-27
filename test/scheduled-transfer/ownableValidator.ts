import { ADDRESS } from '@/addresses'
import { TOwnableValidator__factory, TSmartSession__factory } from '@/contract-types'
import { getEmptyUserOp, getUserOpHash } from '@/ethers-erc4337'
import { randomBytes32 } from '@/utils'
import { getBytes, JsonRpcProvider } from 'ethers'
import { setup } from '../utils'

const kernelAddress = '0x1e1657CE5DDB70654707355f2c6fDA43Daf066De'
const permissionId = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'

const { logger, chainId, CLIENT_URL, account1 } = await setup({ chainId: 1337n })

logger.info(`Chain ID: ${chainId}`)
logger.info(`Kernel address: ${kernelAddress}`)

const client = new JsonRpcProvider(CLIENT_URL)
const ownableValidator = TOwnableValidator__factory.connect(ADDRESS.OwnableValidator, client)

// smartsession only uses ownableValidator's validateSignatureWithData, no state is stored in ownableValidator

// const owners = await ownableValidator.getOwners(kernelAddress)
// logger.info(`Owners: ${owners}`)

// const threshold = await ownableValidator.threshold(kernelAddress)
// logger.info(`Threshold: ${threshold}`)

const events = await ownableValidator.queryFilter(ownableValidator.filters.OwnerAdded())
for (const event of events) {
	if (event.args.account === kernelAddress) {
		logger.info(`Owner added: ${event.args.owner}`)
	}
}

// validateSignatureWithData (simple)
// const hash = randomBytes32()
// const signature = await account1.signMessage(getBytes(hash))
// const data = abiEncode(['uint256', 'address[]'], [1, [account1.address].sort()])

// const validateSignatureWithData = await ownableValidator.validateSignatureWithData(hash, signature, data)
// logger.info('validateSignatureWithData:', validateSignatureWithData)

// validateUserOp
// const userOp = getEmptyUserOp()
// userOp.nonce = randomBytes32()
// userOp.sender = kernelAddress
// const userOpHash = getUserOpHash(packUserOp(userOp), ADDRESS.EntryPointV07, chainId)
// userOp.signature = await account1.signMessage(getBytes(userOpHash))
// const validateUserOp = await ownableValidator.validateUserOp(packUserOp(userOp), userOpHash)
// logger.info('validateUserOp:', validateUserOp)

// validateSignatureWithData (data == config of smartsession.getSessionValidatorAndConfig)
const userOp = getEmptyUserOp()
userOp.nonce = BigInt(randomBytes32())
userOp.sender = kernelAddress
const userOpHash = getUserOpHash(userOp, 'v0.7', chainId)
const signature = await account1.signMessage(getBytes(userOpHash))
const smartsession = TSmartSession__factory.connect(ADDRESS.SmartSession, client)
const session = await smartsession.getSessionValidatorAndConfig(kernelAddress, permissionId)

const validateSignatureWithData = await ownableValidator.validateSignatureWithData(
	userOpHash,
	signature,
	session.sessionValidatorData,
)
logger.info('validateSignatureWithData:', validateSignatureWithData)

const validateSignatureWithData2 = await ownableValidator.validateSignatureWithData(
	'0x9c5e446d0d2ca04f18037158b3f90c03ef1fec19059d5ce979037e04eb126827',
	'0x40adb125734dc26270e99102b4e5c6f68e90ea7a25f2c2a1c784cf101bfc4d7e605ac3208c62b11eb8b7f1952637b09dfbad7086d4f19bbba7a7796a417a944d1b',
	session.sessionValidatorData,
)
logger.info('validateSignatureWithData2:', validateSignatureWithData2)
