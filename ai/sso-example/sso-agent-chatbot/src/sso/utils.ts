import { CHAIN } from "./constants";

export const getTXExplorerLink = (txHash: string) => {
    return `${CHAIN.blockExplorers?.native.url}tx/${txHash}`;
}

export const getAddressExplorerLink = (address: string) => {
    return `${CHAIN.blockExplorers?.native.url}address/${address}`;
}