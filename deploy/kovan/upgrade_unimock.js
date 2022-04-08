const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

const { CUSTOM_UNISWAP_OPTIMISM_KOVAN } = require('../../config/addresses.json');

async function main() {
    console.log('Running deploy script');
    const UniswapETHSwapperMock = await hre.ethers.getContractFactory("UniswapETHSwapperMock");
    console.log("Preparing upgrade...");
    const uniMock = await upgrades.prepareUpgrade(CUSTOM_UNISWAP_OPTIMISM_KOVAN, UniswapETHSwapperMock);
    console.log("uniMock", uniMock);
    const upgraded = await upgrades.upgradeProxy(CUSTOM_UNISWAP_OPTIMISM_KOVAN, UniswapETHSwapperMock);
    console.log("UniswapETHSwapperMock upgraded with ", upgraded.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
