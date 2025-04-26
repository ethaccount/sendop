import { ADDRESS } from '@/addresses'
import { Counter__factory } from '@/contract-types'
import { setupCLI } from './utils/cli'

const { signer } = await setupCLI(['r', 'p'])

const counter = Counter__factory.connect(ADDRESS.Counter, signer)

const randomNumber = Math.floor(Math.random() * 10000)
const tx = await counter.setNumber(randomNumber)
const receipt = await tx.wait()

console.log(JSON.stringify(receipt?.toJSON(), null, 2))
