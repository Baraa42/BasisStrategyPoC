const hre = require("hardhat");
const { ethers, upgrades, artifacts} = require("hardhat");
const {BigNumber} = require("ethers");

const MAX_POOL_SIZE_LIMIT = '100000000000'; // 100,000.00 $

const { USDC_OPTIMISM_KOVAN,
    CUSTOM_UNISWAP_OPTIMISM_KOVAN,
    CUSTOM_WETH_OPTIMISM_KOVAN,
    VETH_PERP_OPTIMISM_KOVAN,
    CLEARINGHOUSE_OPTIMISM_KOVAN,
    PERP_VAULT_OPTIMISM_KOVAN,
    PROXY_OWNER_KOVAN,
    TRIGGER_SERVER_KOVAN} = require('../../config/addresses.json');

async function main() {
    console.log('Running deploy script');
    /// Deploy strategy

    const DeltaNeutralPerp = await hre.ethers.getContractFactory("DeltaNeutralPerp");
    const strategy = await upgrades.deployProxy(DeltaNeutralPerp, [USDC_OPTIMISM_KOVAN,
                                                                        CUSTOM_UNISWAP_OPTIMISM_KOVAN,
                                                                        CUSTOM_WETH_OPTIMISM_KOVAN,
                                                                        VETH_PERP_OPTIMISM_KOVAN,
                                                                        CLEARINGHOUSE_OPTIMISM_KOVAN,
                                                                        PERP_VAULT_OPTIMISM_KOVAN,
                                                                        TRIGGER_SERVER_KOVAN]);
    await strategy.deployed();
    console.log("DeltaNeutral_Perp_WETH deployed to:", strategy.address);
    console.log("Transferring ownership of ProxyAdmin...");
    // The owner of the ProxyAdmin can upgrade our contracts
    await upgrades.admin.transferProxyAdminOwnership(PROXY_OWNER_KOVAN);
    console.log("Transferred ownership of ProxyAdmin to:", PROXY_OWNER_KOVAN);
    console.log("DeltaNeutral_Perp_WETH owner to:", await strategy.owner());


    const dcTokenFactory = await hre.ethers.getContractFactory("DcToken");
    const dcToken = await dcTokenFactory.deploy("DC Token", "DCT");
    await dcToken.deployed();
    console.log("dcToken deployed to:", dcToken.address);
    await dcToken.addGovernance(strategy.address);
    console.log("Set dcToken governance to strategy: ", strategy.address);

    await strategy.setDcToken(dcToken.address);
    console.log("DeltaNeutralPerp_WETH set dcToken to:", dcToken.address);

    await strategy.setEscrow(PROXY_OWNER_KOVAN);
    console.log("DeltaNeutral_Perp_WETH set escrow to:", PROXY_OWNER_KOVAN);

    await strategy.setUsersMaxPoolSizeLimit(MAX_POOL_SIZE_LIMIT);
    console.log("DeltaNeutralPerp set Max_Users_Pool_Limit to:", MAX_POOL_SIZE_LIMIT);

    await strategy.setMaxDaoPoolSizeLimit(MAX_POOL_SIZE_LIMIT);
    console.log("DeltaNeutralPerp set Max_DAO_Size_Limit to:", MAX_POOL_SIZE_LIMIT);

    console.log("Verifying strategy");
    let strategyImplAddress = await upgrades.erc1967.getImplementationAddress(strategy.address);
    console.log("Strategy implementation: ", strategyImplAddress);

    await hre.run("verify:verify", {
        address: strategyImplAddress,
    });
    console.log("Verifying dcToken");
    await hre.run("verify:verify", {
        address: dcToken.address,
        constructorArguments: [
            "DC Token",
            "DCT",
        ],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
