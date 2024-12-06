import * as hre from "hardhat";
import {Wallet} from "zksync-ethers";
const provider = hre.zksyncEthers.providerL2;

export default async function () {
  for (let i = 0; i < 10; i++) {
    let wallet = Wallet.createRandom(provider)
    console.log("generating wallet address ", wallet.address, "private key ", wallet.privateKey);
  }
}