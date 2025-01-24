/* eslint-disable @typescript-eslint/no-explicit-any */
import { ssoService } from "../../sso";


type Action = 'createSSOWallet' | 'createSSOSession';



export function validateAction(action: string): Action {
    const validActions: Record<string, Action> = {
        createSSOWallet: "createSSOWallet",
        createSSOSession: "createSSOSession"
    };
    
    const validatedAction = validActions[action];
    if (!validatedAction) throw new Error("Invalid action");
    return validatedAction;
}

export async function handleAction(action: Action, data: any) {
  if (action === "createSSOWallet" && data.status === "Success") {
    return ssoService.createWallet();
  }
}