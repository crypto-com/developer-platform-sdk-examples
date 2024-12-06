import { getWallet } from "./utils";
import {parseEther} from "ethers";

// Address of the contract to interact with
const CONTRACT_ADDRESS = "0xCdE2672D97855766094A12713b98568cFC425810";
if (!CONTRACT_ADDRESS) throw "⛔️ Provide address of the contract to interact with!";

// An example of a script to interact with the contract
export default async function () {
    const wallet = getWallet();

    console.log("transferring 10 zktcro from ", wallet.address);

    const response = await wallet.sendTransaction({
        to: CONTRACT_ADDRESS,
        value: parseEther("1"),
        from: "",
    });

    console.log(response);
}