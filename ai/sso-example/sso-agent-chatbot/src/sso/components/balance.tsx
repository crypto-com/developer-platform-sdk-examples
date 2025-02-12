import { useBalance } from "wagmi"
import { useSSOStore } from "../useSSOConnector"
import { ethers } from "ethers"
import { Card } from "antd"

export const Balance = () => {
    const { address } = useSSOStore()
    const result = useBalance({ address: address as `0x${string}` })

    if (result.isLoading) {
        return <div>Loading...</div>
    }

    if (result.isError) {
        return <div>Error</div>
    }

    return <Card>
        <p>Balance</p>
        <p>{ethers.formatEther(result.data?.value.toString() || "0")} ETH</p>
        <button onClick={() => {
            result.refetch()
        }}>Refetch</button>
    </Card>
}