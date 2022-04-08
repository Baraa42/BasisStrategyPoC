const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

const { dcSTRATEGY_KOVAN_WETH } = require('../../config/addresses.json');

async function main() {
    console.log('Running deploy script');
    const DeltaNeutralPerp = await hre.ethers.getContractFactory("DeltaNeutralPerp");

    console.log('Force importing proxy');
    await upgrades.forceImport(dcSTRATEGY_KOVAN_WETH, DeltaNeutralPerp);
    console.log("Preparing upgrade...");
    const strategyV2 = await upgrades.prepareUpgrade(dcSTRATEGY_KOVAN_WETH, DeltaNeutralPerp);

    console.log("DeltaNeutralPerpV2", strategyV2);
    const upgraded = await upgrades.upgradeProxy(dcSTRATEGY_KOVAN_WETH, DeltaNeutralPerp);
    console.log("DeltaNeutralPerpV2 upgraded with ", upgraded.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
