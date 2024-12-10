import { deployAccount, getWallet } from "./utils";
import { parseEther } from "ethers";
import { Command } from "commander";

const deployer_pk = process.env.DEPLOYER_WALLET_PRIVATE_KEY;
const funding_amount = "500";

async function main() {
  const program = new Command();
  program.version("0.1.0").name("deploy").description("deploy otk");

  program
    .option("--args <contract-constructor-arguments>")
    .action(async (cmd) => {
      await contractDeployment(cmd);
    });

  await program.parseAsync(process.argv);
}

async function contractDeployment(cmd: any) {
  const wallet = getWallet(deployer_pk);
  console.log("deploy smart account using address " + wallet.address);

  const list = cmd.args
    ? cmd.args.split(",")
    : [
        "0xE9d72Fd888B13938e4A047D975d8Df2417a43352",
        "0xdE8625bb9984769291fCa01743C8658C148C7978",
        "0xb8bE15cC618bbCAEb7803B45852F0B04FB6eCE09",
        "0xE84Ee3b506Db69Cf7e8059d76D250339bf364a8B",
        "0xd54BdE6ADea079Cb68E1d9aA1E308AC52f3A7553",
        "0xf9C81c9e0D877019ff3971FEE02E7576BD6b96fd",
        "0x8117da100cdCbC54E44cd853Fbb0f516eEe36016",
        "0x2B7863b0e977c2aC7a532341F8C582FC3E148CFC",
        "0xc053aE741550f7648821EC436219B5F4cc77ecFf",
        "0x6D4fba9F66ca17c04d4ae50Be237C5f8Bc841CA3",
      ];
  const constructorArguments = [list];
  const contractArtifactName = "OTKAccount";
  const result = await deployAccount(
    contractArtifactName,
    constructorArguments,
    { wallet: wallet }
  );
  const contractAddr = await result.getAddress();
  console.log("funding with " + funding_amount + " zktcro");

  const response = await wallet.sendTransaction({
    to: contractAddr,
    value: parseEther(funding_amount),
  });

  console.log(response);

  console.log(`CONTRACT_DEPLOYED_ADDR=${contractAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
