const hre = require("hardhat");
const {upgrades} = require("hardhat");

const {USDC_OPTIMISM,
    UNISWAP_OPTIMISM,
    CLEARINGHOUSE_OPTIMISM,
    WETH_OPTIMISM,
    VETH_PERP_OPTIMISM,
    PERP_VAULT_OPTIMISM,
    PROXY_OWNER_OPTIMISM,
    TRIGGER_SERVER_OPTIMISM} = require('../../config/addresses.json');

const PERFORMANCE_FEE = '0';
const SUBSCRIPTION_FEE = '0';
const MAX_POOL_SIZE_LIMIT = '100000000000'; // 100,000.00 $

async function main() {
    console.log('Running deploy script');

    /// Deploy Factory
    const DcTokenFactory = await hre.ethers.getContractFactory("DcTokenFactory");
    const factory = await upgrades.deployProxy(DcTokenFactory, );
    await factory.deployed();

    console.log("DcTokenFactory deployed to:", factory.address);
    console.log("Transferring ownership of ProxyAdmin...");

    // The owner of the ProxyAdmin can upgrade our contracts
    await upgrades.admin.transferProxyAdminOwnership(PROXY_OWNER_OPTIMISM);
    console.log("Transferred ownership of ProxyAdmin to:", PROXY_OWNER_OPTIMISM);
    console.log("DcTokenFactory owner to:", await factory.owner());

    /// Create new dcToken
    await factory.initNewDcToken("dcBETH", "DeCommas basis strategy token ETH/USDC");
    console.log("dcToken deployed to:", await factory.getDcToken(0));

    /// Deploy Strategy
    const DeltaNeutralPerp = await hre.ethers.getContractFactory("DeltaNeutralPerp");
    const strategy = await upgrades.deployProxy(DeltaNeutralPerp, [USDC_OPTIMISM,
                                                UNISWAP_OPTIMISM,
                                                WETH_OPTIMISM,
                                                VETH_PERP_OPTIMISM,
                                                CLEARINGHOUSE_OPTIMISM,
                                                PERP_VAULT_OPTIMISM,
                                                TRIGGER_SERVER_OPTIMISM,
                                                PERFORMANCE_FEE,
                                                SUBSCRIPTION_FEE]);
    await strategy.deployed();
    console.log("DeltaNeutralPerp deployed to:", strategy.address);
    console.log("Transferring ownership of ProxyAdmin...");

    // The owner of the ProxyAdmin can upgrade our contracts
    await upgrades.admin.transferProxyAdminOwnership(PROXY_OWNER_OPTIMISM);
    console.log("Transferred ownership of ProxyAdmin to:", PROXY_OWNER_OPTIMISM);
    console.log("DeltaNeutralPerp owner to:", await strategy.owner());

    await strategy.setDcToken(await factory.getDcToken(0));
    console.log("DeltaNeutralPerp set dcToken to:", await factory.getDcToken(0));

    await strategy.setEscrow(PROXY_OWNER_OPTIMISM);
    console.log("DeltaNeutralPerp set escrow to:", PROXY_OWNER_OPTIMISM);

    await strategy.setMaxPoolSizeLimit(MAX_POOL_SIZE_LIMIT);
    console.log("DeltaNeutralPerp set Max_Pool_Size_Limit to:", MAX_POOL_SIZE_LIMIT);

    /// init strategy
    await factory.addGovernanceToDcToken(strategy.address, await factory.getDcToken(0));
    console.log("DcTokenFactory added governance to:", strategy.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
