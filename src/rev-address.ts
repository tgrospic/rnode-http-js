import { keccak256 } from 'js-sha3'
// @ts-ignore
import blake from 'blakejs'
import { ec } from 'elliptic'
import { decodeBase16, encodeBase58, encodeBase16, decodeBase58safe } from './codecs'

/**
 * Represents different formats of REV address
 */
export interface RevAddress {
  revAddr: string
  ethAddr?: string
  pubKey?: string
  privKey?: string
}

export interface RevAccount extends RevAddress {
  name: string
}

const secp256k1 = new ec('secp256k1')

// Algorithm to generate ETH and REV address is taken from RNode source
// https://github.com/rchain/rchain/blob/bf7a30e1/rholang/src/main/scala/coop/rchain/rholang/interpreter/util/AddressTools.scala#L47

// Prefix as defined in https://github.com/rchain/rchain/blob/c6721a6/rholang/src/main/scala/coop/rchain/rholang/interpreter/util/RevAddress.scala#L13
const prefix = { coinId : "000000", version: "00" }

/**
 * Get REV address from ETH address.
 */
export const getAddrFromEth = (ethAddrRaw: string) => {
  const ethAddr = ethAddrRaw.replace(/^0x/, '')
  if (!ethAddr || ethAddr.length !== 40) return

  // Hash ETH address
  const ethAddrBytes = decodeBase16(ethAddr)
  const ethHash      = keccak256(ethAddrBytes)

  // Add prefix with hash and calculate checksum (blake2b-256 hash)
  const payload      = `${prefix.coinId}${prefix.version}${ethHash}`
  const payloadBytes = decodeBase16(payload)
  const checksum     = blake.blake2bHex(payloadBytes, void 666, 32).slice(0, 8)

  // Return REV address
  return encodeBase58(`${payload}${checksum}`)
}

/**
 * Get REV address (with ETH address) from public key.
 */
export const getAddrFromPublicKey = (publicKeyRaw: string) => {
  const publicKey = publicKeyRaw.replace(/^0x/, '')
  if (!publicKey || publicKey.length !== 130) return

  // Public key bytes from hex string
  const pubKeyBytes = decodeBase16(publicKey)
  // Remove one byte from pk bytes and hash
  const pkHash = keccak256(pubKeyBytes.slice(1))
  // Take last 40 chars from hashed pk (ETH address)
  const pkHash40 = pkHash.slice(-40)

  // Return both REV and ETH address
  return <RevAddress>{
    revAddr: getAddrFromEth(pkHash40),
    ethAddr: pkHash40,
  }
}

/**
 * Get REV address (with ETH address and public key) from private key.
 */
export const getAddrFromPrivateKey = (privateKeyRaw: string) => {
  const privateKey = privateKeyRaw.replace(/^0x/, '')
  if (!privateKey || privateKey.length !== 64) return

  // Generate REV address from private key
  const key    = secp256k1.keyFromPrivate(privateKey)
  const pubKey = key.getPublic('hex')
  const addr   = getAddrFromPublicKey(pubKey)

  // Return public key, REV and ETH address
  return <RevAddress>{ pubKey, ...addr }
}

/**
 * Verify REV address
 */
export const verifyRevAddr = (revAddr: string) => {
  const revBytes = decodeBase58safe(revAddr)
  if (!revBytes) return

  // Extract payload and checksum
  const revHex   = encodeBase16(revBytes)
  const payload  = revHex.slice(0, -8) // without checksum
  const checksum = revHex.slice(-8)    // without payload
  // Calculate checksum
  const payloadBytes = decodeBase16(payload)
  const checksumCalc = blake.blake2bHex(payloadBytes, void 666, 32).slice(0, 8)

  return checksum === checksumCalc
}

/**
 * Generates new private and public key, ETH and REV address.
 */
export const newRevAccount = () => {
  // Generate new key and REV address from it
  const key     = secp256k1.genKeyPair()
  const privKey = key.getPrivate('hex')
  const addr    = getAddrFromPrivateKey(privKey)

  // Return public key, REV and ETH address
  return <RevAddress>{ privKey, ...addr }
}

/**
 * Creates REV address from different formats
 * (private key -> public key -> ETH address -> REV address)
 */
export const createRevAccount = (text: string) => {
  const val = text.replace(/^0x/, '').trim()

  // Account from private key, public key, ETH or REV address
  const fromPriv = getAddrFromPrivateKey(val)
  const fromPub  = getAddrFromPublicKey(val)
  const fromEth  = getAddrFromEth(val)
  const isRev    = verifyRevAddr(val)

  if (isRev) {
    return <RevAddress>{revAddr: text}
  } else if (!!fromPriv) {
    return {privKey: val, ...fromPriv}
  } else if (!!fromPub) {
    return {pubKey: val, ...fromPub}
  } else if (!!fromEth) {
    return {privKey: '', pubKey: '', ethAddr: val, revAddr: fromEth}
  } else return void 666
}
