import { Button } from "antd"
import { useSSOStore } from "../useSSOConnector";
import { Session } from "./session";
import { CreateSession } from "./createSession";
import { Transfer } from "./transfer";


export const Passkey = () => {
    const { loginWithPasskey, createAccountAndDeploy, isConnected, address, logout } = useSSOStore();

    if (!isConnected) {
        return (
            <div className="flex flex-col gap-2 mt-4">
                <Button type="primary" onClick={createAccountAndDeploy}>Create Account With Passkey</Button>
                <Button type="primary" onClick={loginWithPasskey}>Login With Passkey</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2 mt-4 overflow-y-auto">
            <hr className="border-t-2 border-gray-300" />
            <div className="text-lg font-bold text-center">SSO Tools</div>
            <div className="text-lg font-bold text-center">
                <a href={`https://sepolia.explorer.zksync.io/address/${address}`} target="_blank" rel="noopener noreferrer">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                </a>
            </div>
            <Button onClick={logout}>Logout</Button>

            <CreateSession  />

            <Transfer />

            <div className="flex flex-col gap-4 mt-10">
                <Session />
            </div>
        </div>
    )
}