const hre = require("hardhat");
const { ethers, upgrades, artifacts} = require("hardhat");
const Factory = artifacts.require('DcTokenFactory');

const PERFORMANCE_FEE = '100000'; //10%
const SUBSCRIPTION_FEE = '50000'; // 5%
const MAX_POOL_SIZE_LIMIT = '100000000000'; // 100,000.00 $

const { USDC_OPTIMISM_KOVAN,
    DCFACTORY_KOVAN,
    CUSTOM_UNISWAP_BTC_OPTIMISM_KOVAN,
    CUSTOM_WBTC_OPTIMISM_KOVAN,
    VBTC_PERP_OPTIMISM_KOVAN,
    CLEARINGHOUSE_OPTIMISM_KOVAN,
    PERP_VAULT_OPTIMISM_KOVAN,
    DC_BTC_TOKEN_KOVAN,
    PROXY_OWNER_KOVAN,
    TRIGGER_SERVER_KOVAN} = require('../../config/addresses.json');

async function main() {
    console.log('Running deploy script');
    /// Deploy strategy

    const DeltaNeutralPerp = await hre.ethers.getContractFactory("DeltaNeutralPerp");
    const strategy = await upgrades.deployProxy(DeltaNeutralPerp, [USDC_OPTIMISM_KOVAN,
                                                                        CUSTOM_UNISWAP_BTC_OPTIMISM_KOVAN,
                                                                        CUSTOM_WBTC_OPTIMISM_KOVAN,
                                                                        VBTC_PERP_OPTIMISM_KOVAN,
                                                                        CLEARINGHOUSE_OPTIMISM_KOVAN,
                                                                        PERP_VAULT_OPTIMISM_KOVAN,
                                                                        TRIGGER_SERVER_KOVAN,
                                                                        PERFORMANCE_FEE,
                                                                        SUBSCRIPTION_FEE]);
    await strategy.deployed();
    console.log("DeltaNeutral_Perp_WBTC deployed to:", strategy.address);
    console.log("Transferring ownership of ProxyAdmin...");
    // The owner of the ProxyAdmin can upgrade our contracts
    await upgrades.admin.transferProxyAdminOwnership(PROXY_OWNER_KOVAN);
    console.log("Transferred ownership of ProxyAdmin to:", PROXY_OWNER_KOVAN);
    console.log("DeltaNeutral_Perp_WBTC owner to:", await strategy.owner());

    await strategy.setDcToken(DC_BTC_TOKEN_KOVAN);
    console.log("DeltaNeutral_Perp_WBTC set dcToken to:", DC_BTC_TOKEN_KOVAN);
    await strategy.setEscrow(PROXY_OWNER_KOVAN);
    console.log("DeltaNeutral_Perp_WBTC set escrow to:", PROXY_OWNER_KOVAN);

    await strategy.setMaxPoolSizeLimit(MAX_POOL_SIZE_LIMIT);
    console.log("DeltaNeutralPerp set Max_Pool_Size_Limit to:", MAX_POOL_SIZE_LIMIT);

    console.log("Verifying strategy");
    let strategyImplAddress = await upgrades.erc1967.getImplementationAddress(strategy.address);
    console.log("Strategy implementation: ", strategyImplAddress);

    await hre.run("verify:verify", {
        address: strategyImplAddress,
    });

    /// init strategy
    const factoryContract = await Factory.at(DCFACTORY_KOVAN);

    await factoryContract.addGovernanceToDcToken(strategy.address, DC_BTC_TOKEN_KOVAN);
    console.log("DcTokenFactory added governance to:", strategy.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
