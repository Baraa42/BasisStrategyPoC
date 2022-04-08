const hre = require("hardhat");
const {ether, expectRevert, BN} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');

const { gasspectEVM } = require('../test/helpers/profileEVM');
const { assertRoughlyEqualValues, toBN, usdc } = require('../test/helpers/utils');
const {toWei} = require("web3-utils");

const wToken = artifacts.require('wToken');
const DeltaNeutralPerp = artifacts.require('DeltaNeutralPerp');
const DcToken = artifacts.require('DcToken');
const USDC_DONOR = "0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4"; // I'm sorry man

const {USDC_OPTIMISM,
    UNISWAP_OPTIMISM,
    WETH_OPTIMISM,
    VETH_PERP_OPTIMISM,
    PERP_EXCHANGE_OPTIMISM,
    PERP_ACCOUNT_BALANCE_OPTIMISM,
    CLEARINGHOUSE_OPTIMISM,
    PERP_VAULT_OPTIMISM} = require('../config/addresses.json');

const abiUsdc = require("../abi/wToken.json");
const clearingHouseAbi = require("../config/Optimism_Mainnet/perp/clearingHouseAbi.json"); //
const vaultAbi = require("../config/Optimism_Mainnet/perp/vaultAbi.json"); // vault
const accountBalanceAbi  = require("../config/Optimism_Mainnet/perp/accountBalanceAbi.json");;
const exchangeAbi  = require("../config/Optimism_Mainnet/perp/exchageAbi.json");;

contract('DeltaNeutral Strategy in Optimism Mainnet', function ([wallet1, wallet2,wallet3,triggerServer,escrowServer]) {

    before(async function () {

        if (process.env.ENVIRONMENT==="CI") {
            this.skip("Skipped on CI");
        }
        const provider = new hre.ethers.providers.JsonRpcProvider();
        await provider.send("hardhat_impersonateAccount", [USDC_DONOR]);
        const signer = await provider.getSigner(USDC_DONOR);

        this.usdcToken = new ethers.Contract(USDC_OPTIMISM, abiUsdc, signer);
        this.perpClearingHouse = new ethers.Contract(CLEARINGHOUSE_OPTIMISM, clearingHouseAbi, signer);
        this.perpVault = new ethers.Contract(PERP_VAULT_OPTIMISM, vaultAbi, signer);
        this.perpExchange = new ethers.Contract(PERP_EXCHANGE_OPTIMISM, exchangeAbi, signer);
        this.perpAccountBalance = new ethers.Contract(PERP_ACCOUNT_BALANCE_OPTIMISM, accountBalanceAbi, signer);

        console.log("usdcContract", this.usdcToken.address);

        this.dcToken = await DcToken.new("dcETH", "dcETH", {from: wallet1});
        this.dcStrategy = await DeltaNeutralPerp.new({from: wallet1});
        await this.dcStrategy.initialize(USDC_OPTIMISM,
                                        UNISWAP_OPTIMISM,
                                        WETH_OPTIMISM,
                                        VETH_PERP_OPTIMISM,
                                        CLEARINGHOUSE_OPTIMISM,
                                        PERP_VAULT_OPTIMISM,
                                        triggerServer);

        console.log("USDC_DONOR Balance is ", (await this.usdcToken.balanceOf(USDC_DONOR)).toString()); // 151284939659

        await this.usdcToken.transfer(wallet1, 500000000);
        console.log("wallet1 Balance is ", (await this.usdcToken.balanceOf(wallet1)).toString()); // 500000000

        await this.usdcToken.transfer(wallet2, 500000000);
        console.log("wallet2 Balance is ", (await this.usdcToken.balanceOf(wallet2)).toString()); // 500000000

        await this.usdcToken.transfer(wallet3, 500000000);
        console.log("wallet3 Balance is ", (await this.usdcToken.balanceOf(wallet3)).toString()); // 500000000

        await this.usdcToken.transfer(triggerServer, 500000000);
        console.log("triggerServer Balance is ", (await this.usdcToken.balanceOf(triggerServer)).toString()); // 500000000

        await this.dcStrategy.setDcToken(this.dcToken.address, {from: wallet1})
        await this.dcToken.addGovernance(this.dcStrategy.address, {from: wallet1});
        await this.dcStrategy.setTriggerServer(triggerServer, {from: wallet1});
        await this.dcStrategy.setEscrow(escrowServer, {from: wallet1});
        await this.usdcToken.approve(this.dcStrategy.address, 1000000000);
        await this.dcStrategy.setUsersMaxPoolSizeLimit(10000000000, {from: wallet1}); // 10,000.00 USD
        await this.dcStrategy.setMaxDaoPoolSizeLimit(10000000000, {from: wallet1}); // 10,000.00 USD
    });

    describe('direct call', async function () {
        it('directBuyTokensToUniswap', async function () {
            await this.usdcToken.approve(this.dcStrategy.address, 200000000, { from: USDC_DONOR });

            await this.dcStrategy.allowDeposit([USDC_DONOR], true);

            await this.dcStrategy.depositUSDC(200000000, { from: USDC_DONOR });

            await this.dcStrategy.directBuyTokensToUniswap(USDC_OPTIMISM, WETH_OPTIMISM, 22500000, {from: triggerServer})
            console.log("directBuyTokensToUniswap check")

            await this.dcStrategy.directDepositToVault(22500000,{from: triggerServer})
            console.log("directDepositToVault check")

            await this.dcStrategy.directOpenPosition(22500000, true, {from: triggerServer})
            console.log("directOpenPosition check")
        });

        it('directBuyTokensToUniswap', async function () {
             await this.dcStrategy.adjustPosition(true, true, 50000000, {from: triggerServer});

             let balanceInPerp = await this.perpVault.getBalance(this.dcStrategy.address);
            console.log("       Balance in PERP: ",  balanceInPerp.toString());

            let freeCollateralInPerp = await this.perpVault.getFreeCollateral(this.dcStrategy.address);
            console.log("       Free Collateral in PERP: ", freeCollateralInPerp.toString());

            let positionSize = await this.perpAccountBalance.getTotalPositionSize(this.dcStrategy.address, VETH_PERP_OPTIMISM);
            console.log("       Total position size in PERP is ", positionSize.toString());

            let pnLnFee = await this.perpAccountBalance.getPnlAndPendingFee(this.dcStrategy.address);
            console.log("       PnL and Pending fee in PERP is ", pnLnFee.toString());
        });
    });

    describe('deposit USDC to Strategy', async function () {
        it('depositUSDC', async function () {
            await this.dcStrategy.allowDeposit([USDC_DONOR], false);
            let totalUSD = await this.dcStrategy.getTotalUSDCValue();
            expect(totalUSD.toString()).to.equal("0");
        });
    });

    describe('Check rates', async function () {
        it('check funding rate', async function () {
            let fundingRate = await this.dcStrategy.getCurrentFundingRate({ from: triggerServer })
            //marketTwap = 4096000000000000636562, index = 4700000000000000000000. fraction is 0.871489
            // market price is lower than index price - NEGATIVE funding. Real funding is 1 - fraction
            expect(fundingRate.toString()).to.equal("871489");
        });
    });

    describe('Check  DepositLimit', async function () {
        it('deny deposit', async function () {

            await expectRevert(this.dcStrategy.denyDeposit(wallet3, false, {from: wallet3}), 'Ownable: caller is not the owner');
            await this.dcStrategy.denyDeposit(wallet3, false, {from: wallet1});
        });
    });
});
