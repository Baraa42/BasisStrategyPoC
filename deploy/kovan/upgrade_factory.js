const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

const { DCFACTORY_KOVAN} = require('../../config/addresses.json');

async function main() {
    console.log('Running deploy script');
    const DcTokenFactory = await hre.ethers.getContractFactory("DcTokenFactory");
    console.log("Preparing upgrade...");
    const factory2 = await upgrades.prepareUpgrade(DCFACTORY_KOVAN, DcTokenFactory);
    console.log("DcTokenFactoryV2", factory2)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
