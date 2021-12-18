// @ts-ignore
import blake from 'blakejs'
import { ec } from 'elliptic'
import jspb from 'google-protobuf'

/**
 * These deploy types are based on protobuf specification which must be
 * used to create the hash and signature of deploy data.
 * Deploy object sent to Web API is slightly different, see [rnode-web.ts](rnode-web.ts).
 */

/**
 * Deploy data (required for signing)
 */
export interface DeployData {
  readonly term: string
  readonly timestamp: number
  readonly phloPrice: number
  readonly phloLimit: number
  readonly validAfterBlockNumber: number
}

/**
 * Signed DeployData object (protobuf specification)
 */
export interface DeploySignedProto {
  readonly term: string
  readonly timestamp: number
  readonly phloPrice: number
  readonly phloLimit: number
  readonly validAfterBlockNumber: number
  readonly sigAlgorithm: string
  readonly deployer: Uint8Array
  readonly sig: Uint8Array
}

/**
 * Sign deploy data.
 */
export const signDeploy = function (privateKey: ec.KeyPair | string, deployObj: DeployData): DeploySignedProto {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
  } = deployObj

  // Currently supported algorithm
  const sigAlgorithm = 'secp256k1'

  // Serialize deploy data for signing
  const deploySerialized = deployDataProtobufSerialize({
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
  })

  // Signing key
  const crypt    = new ec(sigAlgorithm)
  const key      = getSignKey(crypt, privateKey)
  const deployer = Uint8Array.from(key.getPublic('array'))
  // Hash and sign serialized deploy
  const hashed   = blake.blake2bHex(deploySerialized, void 666, 32)
  const sigArray = key.sign(hashed, {canonical: true}).toDER()
  const sig      = Uint8Array.from(sigArray)

  // Return deploy object / ready for sending to RNode
  return {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
    sigAlgorithm, deployer, sig,
  }
}

/**
 * Verify deploy signature.
 */
export const verifyDeploy = (deployObj: DeploySignedProto) => {
  const {
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
    sigAlgorithm, deployer, sig,
  } = deployObj

  // Serialize deploy data for signing
  const deploySerialized = deployDataProtobufSerialize({
    term, timestamp, phloPrice, phloLimit, validAfterBlockNumber,
  })

  // Signing public key to verify
  const crypt   = new ec(sigAlgorithm)
  const key     = crypt.keyFromPublic(deployer)
  // Hash and verify signature
  const hashed  = blake.blake2bHex(deploySerialized, void 666, 32)
  const isValid = key.verify(hashed, sig)

  return isValid
}

/**
 * Serialization of DeployDataProto object without generated JS code.
 */
export const deployDataProtobufSerialize = (deployData: DeployData) => {
  const { term, timestamp, phloPrice, phloLimit, validAfterBlockNumber } = deployData

  // Create binary stream writer
  const writer = new jspb.BinaryWriter()
  // Write fields (protobuf doesn't serialize default values)
  const writeString = (order: number, val: string) => val != "" && writer.writeString(order, val)
  const writeInt64  = (order: number, val: number) => val != 0  && writer.writeInt64(order, val)

  // https://github.com/rchain/rchain/blob/f7e46a9/models/src/main/protobuf/CasperMessage.proto#L134-L143
  // message DeployDataProto {
  //   bytes  deployer     = 1; //public key
  //   string term         = 2; //rholang source code to deploy (will be parsed into `Par`)
  //   int64  timestamp    = 3; //millisecond timestamp
  //   bytes  sig          = 4; //signature of (hash(term) + timestamp) using private key
  //   string sigAlgorithm = 5; //name of the algorithm used to sign
  //   int64 phloPrice     = 7; //phlo price
  //   int64 phloLimit     = 8; //phlo limit for the deployment
  //   int64 validAfterBlockNumber = 10;
  // }

  // Serialize fields
  writeString(2, term)
  writeInt64(3, timestamp)
  writeInt64(7, phloPrice)
  writeInt64(8, phloLimit)
  writeInt64(10, validAfterBlockNumber)

  return writer.getResultBuffer()
}

/**
 * Fix for ec.keyFromPrivate not accepting KeyPair.
 * - detect KeyPair if it have `sign` function
 */
const getSignKey = (crypt: ec, pk: ec.KeyPair | string) =>
  pk && typeof pk != 'string' && pk.sign && pk.sign.constructor == Function ? pk : crypt.keyFromPrivate(pk)
