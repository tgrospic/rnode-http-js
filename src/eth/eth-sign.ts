import { ec } from 'elliptic'
import * as ethUtil from 'ethereumjs-util'

import { decodeAscii } from '../codecs'
import { deployDataProtobufSerialize, DeploySignedProto } from '../rnode-sign'

/**
 * Recover public key from Ethereum signed data and signature.
 *
 * @param data - Signed message bytes
 * @param sigHex - Signature base 16
 * @returns Public key base 16
 */
export const recoverPublicKeyEth = (data: Uint8Array | number[], sigHex: string) => {
  // Ethereum lib to recover public key from massage and signature
  const hashed    = ethUtil.hashPersonalMessage(ethUtil.toBuffer([...data]))
  const {v, r, s} = ethUtil.fromRpcSig(sigHex)
  // Public key without prefix
  const pubkeyRecover = ethUtil.ecrecover(hashed, v, r, s)

  return ethUtil.bufferToHex(Buffer.from([4, ...pubkeyRecover]))
}

/**
 * Verify deploy signed with Ethereum compatible signature.
 */
export const verifyDeployEth = (deploySigned: DeploySignedProto) => {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
    deployer, sig,
  } = deploySigned

  // Serialize deploy data for signing
  const deploySerialized = deployDataProtobufSerialize({
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
  })

  // Create a hash of message with prefix
  // https://github.com/ethereumjs/ethereumjs-util/blob/4a8001c/src/signature.ts#L136
  const deployLen = deploySerialized.length
  const msgPrefix = `\x19Ethereum Signed Message:\n${deployLen}`
  const prefixBin = decodeAscii(msgPrefix)
  const msg       = [...prefixBin, ...deploySerialized]
  const hashed    = ethUtil.keccak256(Buffer.from(msg))

  // Check deployer's signature
  const crypt   = new ec('secp256k1')
  const key     = crypt.keyFromPublic(deployer)
  const sigRS   = { r: sig.slice(0, 32), s: sig.slice(32, 64) }
  const isValid = key.verify(hashed, sigRS)

  return isValid
}
