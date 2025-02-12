import { Button, Card } from "antd"
import { http } from "wagmi"
import { useSSOStore } from "../useSSOStore";
import { createZksyncSessionClient } from "zksync-sso/client";
import { CHAIN, CONTRACTS, WagmiConfig } from "../constants";
import { useState } from "react";
import { waitForTransactionReceipt } from "@wagmi/core";
import { getTXExplorerLink } from "../utils";
import { Hash } from "viem";
export const Transfer = () => {

    const { address, sessionConfig } = useSSOStore();
    const [loading, setLoading] = useState(false);
    const [hash, setHash] = useState<string | null>(null);

    return <Card>
        <p>Transfer 1 WEI to NULL address</p>
        <Button type="primary" loading={false} onClick={async () => {
            try {
             

            if (!sessionConfig || !address) {
                throw new Error("Session config or address not found");
            }

            setLoading(true);
            setHash(null);

            const addressArg = address;
            const sessionKey = localStorage.getItem('chatbot.sessionKey') as Hash;

            console.log("addressArg: ", addressArg);
            console.log("sessionKey: ", sessionKey);
            console.log("sessionConfig: ", sessionConfig);

            const sessionClient = createZksyncSessionClient({
                address: addressArg,
                sessionKey: sessionKey,
                sessionConfig: sessionConfig,
                chain: CHAIN,
                contracts: CONTRACTS,
                transport: http(),
            })


            const tx = await sessionClient.sendTransaction({
                to: "0x0000000000000000000000000000000000000000",
                value: 1n,
            })

            const receipt = await waitForTransactionReceipt(WagmiConfig, { hash: tx });

            setHash(receipt.transactionHash);
            setLoading(false);
        } catch (error) {
            console.error("Error transferring funds: ", error);
            setLoading(false);
        }

        }}>Transfer</Button>
        {
            hash && <p>Transaction hash: <a href={getTXExplorerLink(hash)} target="_blank" rel="noopener noreferrer">{hash}</a></p>
        }
    </Card>
}