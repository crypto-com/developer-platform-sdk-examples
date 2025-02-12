import { zksyncSepoliaTestnet } from "./chains";

export const chain = zksyncSepoliaTestnet;
export const authServerUrl = "https://auth-test.zksync.dev/confirm";

export const contracts = {
  session: "0x64Bf5C3229CafF50e39Ec58C4BFBbE67bEA90B0F",
  passkey: "0x0F65cFE984d494DAa7165863f1Eb61C606e45fFb",
  accountFactory: "0x73CFa70318FD25F2166d47Af9d93Cf72eED48724",
  accountPaymaster: "0xA46D949858335308859076FA605E773eB679e534",
} as const; 