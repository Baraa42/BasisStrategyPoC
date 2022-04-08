const hre = require("hardhat");
const { ethers, upgrades, artifacts} = require("hardhat");
const Factory = artifacts.require('DcTokenFactory');
const {DCFACTORY_KOVAN} = require('../../config/addresses.json');
const NAME = "dcBTC Token";
const SYMBOL = "dcBTC";
const TOKEN_ID = "";

async function main() {
    console.log('Running deploy script');
    /// Deploy dcToken
    const factoryContract = await Factory.at(DCFACTORY_KOVAN);

    await factoryContract.initNewDcToken(NAME, SYMBOL);

    console.log("dcBTC Token to:", await factoryContract.getDcToken(TOKEN_ID));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
