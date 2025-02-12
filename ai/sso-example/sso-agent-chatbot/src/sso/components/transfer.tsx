import { Button, Card } from "antd"
import { http, useSendTransaction } from "wagmi"
import { useSSOStore, wagmiConfig } from "../useSSOConnector";
import { createZksyncSessionClient } from "zksync-sso/client";
import { SessionConfig } from "zksync-sso/utils";
import { chain, contracts } from "../constants";
import { useState } from "react";
import { waitForTransactionReceipt } from "@wagmi/core";

export const Transfer = () => {

    const { address, sessionConfig } = useSSOStore();
    const [loading, setLoading] = useState(false);
    const [hash, setHash] = useState<string | null>(null);

    return <Card>
        <p>Transfer 1 WEI to NULL address</p>
        <Button type="primary" loading={false} onClick={async () => {
            try {
             

            if (!sessionConfig) {
                throw new Error("Session config not found");
            }

            setLoading(true);
            setHash(null);

            const addressArg = address as `0x${string}`;
            const sessionKey = localStorage.getItem('chatbot.sessionKey') as `0x${string}`;

            console.log("addressArg: ", addressArg);
            console.log("sessionKey: ", sessionKey);
            console.log("sessionConfig: ", sessionConfig);

            const sessionClient = createZksyncSessionClient({
                address: addressArg,
                sessionKey: sessionKey,
                sessionConfig: sessionConfig,
                chain: chain,
                contracts: contracts,
                transport: http(),
            })


            const tx = await sessionClient.sendTransaction({
                to: "0x0000000000000000000000000000000000000000",
                value: 1n,
            })

            const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: tx });

            setHash(receipt.transactionHash);
            setLoading(false);
        } catch (error) {
            console.error("Error transferring funds: ", error);
            setLoading(false);
        }

        }}>Transfer</Button>
        {
            hash && <p>Transaction hash: <a href={`https://sepolia.explorer.zksync.io/tx/${hash}`} target="_blank" rel="noopener noreferrer">{hash}</a></p>
        }
    </Card>
}