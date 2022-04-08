const hre = require("hardhat");
const { ethers, upgrades, artifacts} = require("hardhat");
const {BigNumber} = require("ethers");

const { USDC_OPTIMISM_KOVAN,
    VETH_PERP_OPTIMISM_KOVAN,
    PROXY_OWNER_KOVAN,
    CUSTOM_WETH_OPTIMISM_KOVAN,
    TRIGGER_SERVER_KOVAN} = require('../../config/addresses.json');

const DcEth = artifacts.require('wToken');

async function main() {
    console.log('Running deploy uni mock proxy script');
    /// Deploy strategy

    const UniMockFactory = await hre.ethers.getContractFactory("UniswapETHSwapperMock");
    const uniMock = await upgrades.deployProxy(UniMockFactory, [USDC_OPTIMISM_KOVAN,
        VETH_PERP_OPTIMISM_KOVAN,
        CUSTOM_WETH_OPTIMISM_KOVAN,
        TRIGGER_SERVER_KOVAN]);
    await uniMock.deployed();
    console.log("UniMock deployed to:", uniMock.address);
    console.log("Transferring ownership of ProxyAdmin...");
    // The owner of the ProxyAdmin can upgrade our contracts
    await upgrades.admin.transferProxyAdminOwnership(PROXY_OWNER_KOVAN);
    console.log("Transferred ownership of ProxyAdmin to:", PROXY_OWNER_KOVAN);
    console.log("UniMock owner to:", await uniMock.owner());

    const customWETH = await DcEth.at(CUSTOM_WETH_OPTIMISM_KOVAN);
    await customWETH.setRouter(uniMock.address);

    console.log("Verifying UniMock");
    let uniMockImplAddress = await upgrades.erc1967.getImplementationAddress(uniMock.address);
    console.log("UniMock implementation: ", uniMockImplAddress);

    await hre.run("verify:verify", {
        address: uniMockImplAddress,
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
