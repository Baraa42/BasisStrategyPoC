const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

const {PROXY_OWNER_KOVAN} = require('../../config/addresses.json');

async function main() {
    console.log('Running deploy script');
    /// Deploy dcFactory
    const DcTokenFactory = await hre.ethers.getContractFactory("DcTokenFactory");
    const factory = await upgrades.deployProxy(DcTokenFactory, );
    await factory.deployed();

    console.log("DcTokenFactory deployed to:", factory.address);
    console.log("Transferring ownership of ProxyAdmin...");
    // The owner of the ProxyAdmin can upgrade our contracts
    await upgrades.admin.transferProxyAdminOwnership(PROXY_OWNER_KOVAN);
    console.log("Transferred ownership of ProxyAdmin to:", PROXY_OWNER_KOVAN);
    console.log("DcTokenFactory owner to:", await factory.owner());

    /// Create new dcToken
    await factory.initNewDcToken("dcETH Token", "dcETH");
    console.log("KOVAN dcToken deployed to:", await factory.getDcToken(0));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
