# RNode Web API client

This library is a thin layer around RNode HTTP API with helper functions to create, sign and validate deploy, pull deploy result until block is proposed and Ethereum signature support to enable use of Metamask with hardware wallet.

In the browser connection to RNode can be done with **RNode Web API**.
Web API has defined schema only in Scala source, for the new info please check [RChain issue 2974](https://github.com/rchain/rchain/issues/2974).

For gRPC connection from nodejs please check [**@tgrospic/rnode-grpc-js**](https://github.com/tgrospic/rnode-grpc-js).

**Example of single page wallet can be found in this repository [tgrospic/rnode-client-js](https://github.com/tgrospic/rnode-client-js)**.

## RNode connection to Metamask (with hardware wallet)

Helper functions are in [eth-wrapper.js](src/eth/eth-wrapper.js) which contains the code for communication with Metamask, getting selected ETH address and sending deploys for signing.
In [eth-sign.js](src/eth/eth-sign.js) are functions to verify deploy signature and to extract public key.  
This is all that is needed for communication with Metamask and also for connected hardware wallets (Ledger, Trezor). How to use these functions and send deploys to RNode is in [rnode-web.js](src/rnode-web.js).

## Install

The package includes TypeScript definitions.

```sh
npm install @tgrospic/rnode-http-js
```
