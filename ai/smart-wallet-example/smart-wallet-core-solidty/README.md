# OTK Contract for hackaton

## Step 1

Setup the project

```aiignore
yarn
export NODE_TLS_REJECT_UNAUTHORIZED=0
yarn compile
```

Create .env with

```aiignore
DEPLOYER_WALLET_PRIVATE_KEY=
```

## Step 2

Deploy Smart account with otk addresses

```aiignore
yarn deploy --args "addr1,addr2"
```

Result

```
"OTKAccount" was successfully deployed:
 - Contract address: 0xd8bD9E58C04BD06bE17db0c3201b7833Eb4BE8c1
 - Contract source: contracts/OTKAccount.sol:OTKAccount
 - Encoded constructor arguments: ...
```

## Step 3

Interact with the smart account

Add in .env with (see file generated-wallet.txt to auto generated wallet)

```aiignore
WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
#WALLET_PRIVATE_KEY=...
```

change in deploy/interact.ts

```aiignore

const SMART_CONTRACT_ADDRESS =
```

and run

```aiignore
yarn interact
```

The script will send a transfer transaction from smart account address and sign with the chosen wallet private key
