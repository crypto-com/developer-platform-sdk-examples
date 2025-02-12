import { Balance } from "./balance";
import { Transfer } from "./transfer";
import { Session } from "./session";

import { Button } from "antd"
import { useSSOStore } from "../useSSOStore";
import { CreateSession } from "./createSession";
import { getAddressExplorerLink } from "../utils";


export const SSOTools = () => {
    const { loginWithPasskey, createAccountAndDeploy, isConnected, address, logout } = useSSOStore();

    if (!isConnected || !address) {
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
                <a href={getAddressExplorerLink(address)} target="_blank" rel="noopener noreferrer">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                </a>
            </div>
            <Button onClick={logout}>Logout</Button>

            <CreateSession  />

            <Transfer />

            <Balance />

            <div className="flex flex-col gap-4 mt-10">
                <Session />
            </div>
        </div>
    )
}