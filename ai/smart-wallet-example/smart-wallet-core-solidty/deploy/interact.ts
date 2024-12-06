import * as hre from "hardhat";
import {parseEther} from "ethers";
import {getWallet} from "./utils";

const SMART_CONTRACT_ADDRESS = "0xCa9e91C7481A85889d05670B9233D9cAd9F4F7B9";
const provider = hre.zksyncEthers.providerL2;


export default async function () {
  const wallet = getWallet();
  const nonce = await provider.getTransactionCount(SMART_CONTRACT_ADDRESS);
  console.log("sending transaction using ", wallet.address);

  const response = await wallet.sendTransaction({
    nonce: nonce,
    to: wallet.address,
    value: parseEther("0.01"),
    from: SMART_CONTRACT_ADDRESS,
  });

  console.log(response);
}