const {ether, expectRevert, BN, expectEvent} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');

const { gasspectEVM } = require('./helpers/profileEVM');
const { assertRoughlyEqualValues, toBN, usdc } = require('./helpers/utils');
const {toWei} = require("web3-utils");

//const {address} = require("hardhat/internal/core/config/config-validation");

const DcTokenFactory = artifacts.require('DcTokenFactory');
const wToken = artifacts.require('wToken');
const VaultMock = artifacts.require('VaultMock');
const ClearingHouseMock = artifacts.require('ClearingHouseMock');
const ExchangeMock = artifacts.require('ExchangeMock');
const PerpTokenMock = artifacts.require('PerpTokenMock');
const UniswapETHSwapperMock = artifacts.require('UniswapETHSwapperMock');
const DeltaNeutralPerp = artifacts.require('DeltaNeutralPerp');

const DcToken = artifacts.require('DcToken');

contract('DeltaNeutralPerp Local Network', function ([wallet1, wallet2, wallet3, triggerServer, escrowServer,
                                                         wallet4, wallet5, wallet6,wallet7, wallet8, wallet9,
                                                         wallet10, wallet11, wallet12, wallet13, wallet14]) {

    before(async function () {
        this.usdcToken = await PerpTokenMock.new("USDC Token", "USDC", usdc("1"));
        this.dcTokenFactory = await DcTokenFactory.new();
        this.dcToken = await DcToken.new("dcTest", "deCommas test coin", {from: wallet1});
        this.wethToken = await wToken.new("dcETH","dcETH");
        this.vToken = await PerpTokenMock.new("vETH", "vETH Perpetual Finance", ether("4700"));
        this.exchange = await ExchangeMock.new();
        this.perpHouse = await ClearingHouseMock.new(this.exchange.address);
        this.perpVault = await VaultMock.new();
        this.dcStrategy = await DeltaNeutralPerp.new({from: wallet1});
        this.uniRouter = await UniswapETHSwapperMock.new({from: wallet1});
        await this.uniRouter.initialize(this.usdcToken.address,
                                        this.vToken.address,
                                        this.wethToken.address,
                                        triggerServer);
        await this.dcStrategy.initialize(this.usdcToken.address,
                                        this.uniRouter.address,
                                        this.wethToken.address,
                                        this.vToken.address,
                                        this.perpHouse.address,
                                        this.perpVault.address,
                                        triggerServer,0,0);
        await this.usdcToken.mint(wallet1, usdc('10000'), {from: wallet1});
        await this.usdcToken.mint(wallet2, usdc('10000'), {from: wallet1});
        await this.usdcToken.mint(wallet3, usdc('10000'), {from: wallet1});
        await this.usdcToken.mint(this.uniRouter.address, usdc('10000'), {from: wallet1});
        await this.dcStrategy.setDcToken(this.dcToken.address, {from: wallet1})
        await this.dcToken.addGovernance(this.dcStrategy.address, {from: wallet1});
        await this.dcStrategy.setTriggerServer(triggerServer, {from: wallet1});
        await this.dcStrategy.setEscrow(escrowServer, {from: wallet1});
        await this.wethToken.setRouter(this.uniRouter.address, {from: wallet1});
        await this.dcStrategy.setUsersMaxPoolSizeLimit(10000000000, {from: wallet1}); // 10,000.00 USD
        await this.dcStrategy.setMaxDaoPoolSizeLimit(10000000000, {from: wallet1}); // 10,000.00 USD
    });


    describe('deposit USDC to Strategy', async function () {

        it('depositUSDC', async function () {
            //Zero state
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet2 });
            let totalUSD = await this.dcStrategy.getTotalUSDCValue();
            expect(totalUSD.toString()).to.equal("0");
            // Test deposit allowance
            await expectRevert(this.dcStrategy.depositUSDC(usdc('100'), { from: wallet2 }),
                "You are not allowed to deposit");
            await this.dcStrategy.allowDeposit([wallet2], false,{from: wallet1});
            console.log("Wallet is allowed = ", await this.dcStrategy.isAllowedToDeposit(wallet2));
            console.log((await this.dcStrategy.availableDeposit(wallet2)).toString());
            await expectRevert(this.dcStrategy.depositUSDC(usdc('1000'), { from: wallet2 }),
                "Exceeding deposit limit");
            // Deposit 100
            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet2 })
            let usdcBalance = await this.usdcToken.balanceOf(this.dcStrategy.address);
            expect(usdcBalance.toString()).to.equal("100000000");
            let totalDC = await this.dcToken.totalSupply();
            expect(totalDC.toString()).to.equal("100000000000000000000");
            let userDC = await this.dcToken.balanceOf(wallet2);
            expect(userDC.toString()).to.equal("100000000000000000000");

            await expectRevert(this.dcStrategy.depositUSDC(usdc('400'), { from: wallet2 }),
                "Exceeding deposit limit");

            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet2 })
            usdcBalance = await this.usdcToken.balanceOf(this.dcStrategy.address);
            expect(usdcBalance.toString()).to.equal("200000000");
            userDC = await this.dcToken.balanceOf(wallet2);
            expect(userDC.toString()).to.equal("200000000000000000000");
            totalDC = await this.dcToken.totalSupply();
            expect(totalDC.toString()).to.equal("200000000000000000000");
            // wallet2 has 200 USD in pool now

            // add funds to perp vault
            await this.perpHouse.setAccountBalance(this.dcStrategy.address, ether('1000'));
            await this.usdcToken.approve(this.perpVault.address, usdc('1000'), { from: wallet1 });
            await this.perpVault.deposit(this.usdcToken.address, usdc('1000'), { from: wallet1 });

            // user2
            // Deposit 200 USD
            await this.dcStrategy.allowDeposit([wallet3],false, {from: wallet1});
            await this.usdcToken.approve(this.dcStrategy.address, usdc('200'), { from: wallet3 });
            await this.dcStrategy.depositUSDC(usdc('200'), { from: wallet3 });
            // Pool contains 200(wallet2) + 1000(perp) + 200(wallet3)  USD
            usdcBalance = await this.usdcToken.balanceOf(this.dcStrategy.address);
            expect(usdcBalance.toString()).to.equal("400000000");
            totalDC = await this.dcToken.totalSupply();
            expect(totalDC.toString()).to.equal("233333333333333333200");
            // wallet3 has 200/1400 = 1/7 of pool
            userDC = await this.dcToken.balanceOf(wallet3);
            expect(userDC.toString()).to.equal("33333333333333333200");
        });

        it('withdrawUSDC', async function () {
            let userBalanceStart = await this.usdcToken.balanceOf(wallet2);
            await this.dcToken.approve(this.dcStrategy.address, ether('100'), { from: wallet2 });

            console.log("dcToken User Balance is ", (await this.dcToken.balanceOf(wallet2)).toString());

            await expectRevert(this.dcStrategy.withdrawUSDC(ether('205'), { from: wallet2 }),
                'DNP: insufficient tokens');

         //   await expectRevert(this.dcStrategy.withdrawUSDC(ether('190'), { from: wallet2 }),
         //       'DNP: trying to withdraw more than pool contains');

            await this.dcStrategy.withdrawUSDC(ether('50'), { from: wallet2 })
            let userBalanceFinish = await this.usdcToken.balanceOf(wallet2);
            // 50 DCs = 50/233 share * 1400$ =~ 300
            let expectedBalance = userBalanceStart.add(new BN('299999000'));
            expect(userBalanceFinish.toString()).to.equal(expectedBalance.toString());
            let usdcStrategyBalance = await this.usdcToken.balanceOf(this.dcStrategy.address);
            expect(usdcStrategyBalance.toString()).to.equal('100001000');
        });


        it('adjust', async function () {

            await this.usdcToken.approve(this.dcStrategy.address, usdc('200'), { from: wallet2 });
            await this.dcStrategy.allowDeposit([wallet2],false, {from: wallet1});
          //  await this.dcStrategy.depositUSDC(usdc('200'), { from: wallet2 });
            let usdcStrategyBalance = await this.usdcToken.balanceOf(this.dcStrategy.address);
            expect(usdcStrategyBalance.toString()).to.equal('100001000');

            let tvl = await this.dcStrategy.getTotalUSDCValue({ from: triggerServer })
            expect(tvl.toString()).to.equal('1100001000');

            /// zero amount
            await expectRevert(this.dcStrategy.adjustPosition(true,true, usdc('0'), { from: triggerServer }),
                'DNP: zero amount');

            /// first short/buy position
            let strategyWETHBalance = await this.wethToken.balanceOf(this.dcStrategy.address);
            expect(strategyWETHBalance.toString()).to.equal('0');
            await this.dcStrategy.adjustPosition(true, true, usdc('100'), { from: triggerServer });
            strategyWETHBalance = await this.wethToken.balanceOf(this.dcStrategy.address);
            expect(strategyWETHBalance.toString()).to.equal('9574000000000000');

            console.log("Ether Price is ", (await this.uniRouter.currentPrice()).toString());
            console.log("dcToken User Balance is ", (await this.dcToken.balanceOf(wallet2)).toString());

            // TVL before withdraw
            tvl = await this.dcStrategy.getTotalUSDCValue({ from: triggerServer })
            expect(tvl.toString()).to.equal('1099998800');
            let reserve = await this.dcStrategy.getReserve({ from: triggerServer })
            expect(reserve.toString()).to.equal('10001000');
            await expectRevert(this.dcStrategy.adjustPosition(true, true, usdc('1600'), { from: triggerServer }),
                'DNP: Insufficient reserve');

            await this.dcToken.approve(this.dcStrategy.address, ether('150'),  {from: wallet2});
            let userBalance = await this.usdcToken.balanceOf(wallet2);
            let initialUserBalance = userBalance;
            expect(userBalance.toString()).to.equal("10099999000");
            let totalDC = await this.dcToken.totalSupply();
            expect(totalDC.toString()).to.equal("183333333333333333200");
            await this.dcStrategy.withdrawUSDC(ether('10'), { from: wallet2 });
            userBalance = await this.usdcToken.balanceOf(wallet2);
            expect(userBalance.toString()).to.equal("10159998434");

            let delta = userBalance.sub(initialUserBalance);
            console.log("User withdraw $", delta.toString());

            // Initial tvl and reserve (after withdrawal)
            let expectedTvl = tvl.sub(delta);
            tvl = await this.dcStrategy.getTotalUSDCValue({ from: triggerServer })

            expect(tvl.toString()).to.equal('5850879403030418');
            console.log("Initial tvl is$ ", tvl.toString());
            reserve = await this.dcStrategy.getReserve({ from: triggerServer })
            expect(reserve.toString()).to.equal('4999842');
            strategyWETHBalance = await this.wethToken.balanceOf(this.dcStrategy.address);
            expect(strategyWETHBalance.toString()).to.equal('3723119574468086');
            let perpValue = await this.perpHouse.getAccountValue(this.dcStrategy.address);
            expect(perpValue.toString()).to.equal('-5850879380531914000000000000');

            // Decrease short todo will be fixed
            let receipt = await this.dcStrategy.adjustPosition(true, false, 50000000, { from: triggerServer });
         //   await expectEvent(receipt, "PositionAdjusted", { operationType: true, positionType: false,
          //      usdcValue: "22500000", wValue: "22500000" })
       //     await expectEvent.inTransaction(receipt.tx, this.uniRouter, "SwapSuccess",
        //        {baseAmount: "4787234042553191", quoteAmount: "22500000", price: "4700000000000000000000", isBuy: false})

            strategyWETHBalance = await this.wethToken.balanceOf(this.dcStrategy.address);
            expect(strategyWETHBalance.toString()).to.equal('0'); // 4786765957446809
            perpValue = await this.perpHouse.getAccountValue(this.dcStrategy.address);
            expect(perpValue.toString()).to.equal('-5850879380531914000000000000');
            reserve = await this.dcStrategy.getReserve({ from: triggerServer })
            expect(reserve.toString()).to.equal('1039999366');
            tvl = await this.dcStrategy.getTotalUSDCValue({ from: triggerServer })
            // expect(tvl.toString()).to.equal('5850880420531280');
            expect(tvl.toString()).to.equal('5850880420531280'); //TVL stays the same after adjusting position!
            // todo will be fixed
            //await expectRevert(this.dcStrategy.adjustPosition(true, false, 500000000, { from: triggerServer }),
            //    "ERC20: burn amount exceeds balance" //No resources to sell
            //);

            // Full close position todo will be fixed
            //receipt = await this.dcStrategy.adjustPosition(false, true, 1, { from: triggerServer });
            //await expectEvent(receipt, "PositionAdjusted", { operationType: false, positionType: true,
            //    usdcValue: "177499579", wValue: "0" })
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


    describe('Check MaxPoolSizeLimit', async function () {

        it('only Owner', async function () {

            await expectRevert(this.dcStrategy.setUsersMaxPoolSizeLimit(100000000, {from: wallet2}), '' +
                'Ownable: caller is not the owner');
            await this.dcStrategy.setUsersMaxPoolSizeLimit(500000000000, {from: wallet1})
         });

        it('check pool size', async function () {
            await this.usdcToken.mint(wallet6, usdc('10000'), {from: wallet1});
            await this.usdcToken.mint(wallet4, usdc('10000'), {from: wallet1});
            await this.usdcToken.mint(wallet5, usdc('10000'), {from: wallet1});

            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet1});
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet3});
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet4});
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet5});
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet6});

            await this.dcStrategy.allowDeposit([wallet1, wallet3, wallet4, wallet5, wallet6], false, {from: wallet1});

            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet1 });
            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet4 });
            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet5 });
            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet6 });

            await this.dcStrategy.setUsersMaxPoolSizeLimit(500000000, {from: wallet1})

            await expectRevert(this.dcStrategy.depositUSDC(usdc('100'), { from: wallet5}),
                'DNP: Exceeding total poolLimit');
        });
    });

    describe('Allow deposit', async  function () {
        it('new DAO users', async function () {
            await this.dcStrategy.allowDeposit([wallet7, wallet8, wallet9,wallet10], true, {from: wallet1});

            await expectRevert(this.dcStrategy.allowDeposit([wallet1, wallet2, wallet3], true, {from: wallet1}),
                'DNP: User already allowed');

            await this.dcStrategy.allowDeposit([wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2,
                wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1,
                wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6,
                wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5,
                wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6], false, {from: wallet1}); // 48
        })

        it('casual users', async function () {

            await expectRevert(this.dcStrategy.depositUSDC(usdc('190'), { from: wallet11 }),
                'DNP: You are not allowed to deposit');

            await this.dcStrategy.allowDeposit([wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2,
                wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1,
                wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6,
                wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5,
                wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4,
                wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3,
                wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2,
                wallet3, wallet4, wallet5, wallet6, wallet11, wallet2, wallet3, wallet4, wallet5, wallet6, wallet1,
                wallet2, wallet3, wallet4, wallet5, wallet6, wallet1, wallet2, wallet3, wallet14, wallet12, wallet13],
                false, {from: wallet1});
        })

        it('Check max DAO limit', async function () {
            await this.usdcToken.mint(wallet7, usdc('100'), {from: wallet1});
            await this.usdcToken.mint(wallet8, usdc('10000'), {from: wallet1});
            await this.usdcToken.mint(wallet9, usdc('100'), {from: wallet1});
            await this.usdcToken.mint(wallet10, usdc('10000'), {from: wallet1});
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet7 });
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet8 });
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet9 });
            await this.usdcToken.approve(this.dcStrategy.address, usdc('1000'), { from: wallet10 });

            await this.dcStrategy.setMaxDaoPoolSizeLimit(450000000, { from: wallet1 })

            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet7 });
            await this.dcStrategy.depositUSDC(usdc('200'), { from: wallet8 });
            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet9 });
            await expectRevert(this.dcStrategy.depositUSDC(usdc('100'), { from: wallet10 }),
                'DNP: Exceeding DAO total poolLimit');
            await this.dcStrategy.depositUSDC(usdc('50'), { from: wallet10 });
        })
        it('Check max global Users limit', async function () {
            await this.usdcToken.mint(wallet11, usdc('200'), {from: wallet1});
            await this.usdcToken.mint(wallet12, usdc('200'), {from: wallet1});
            await this.usdcToken.mint(wallet13, usdc('200'), {from: wallet1});
            await this.usdcToken.mint(wallet14, usdc('200'), {from: wallet1});
            await this.usdcToken.approve(this.dcStrategy.address, usdc('200'), { from: wallet11 });
            await this.usdcToken.approve(this.dcStrategy.address, usdc('200'), { from: wallet12 });
            await this.usdcToken.approve(this.dcStrategy.address, usdc('200'), { from: wallet13 });
            await this.usdcToken.approve(this.dcStrategy.address, usdc('200'), { from: wallet14 });

            await this.dcStrategy.setUsersMaxPoolSizeLimit(1500000000, { from: wallet1 })

            await expectRevert(this.dcStrategy.depositUSDC(usdc('250'), { from: wallet11 }),
                'DNP: Exceeding deposit limit');

            await this.dcStrategy.depositUSDC(usdc('200'), { from: wallet11 });

            await this.dcStrategy.depositUSDC(usdc('200'), { from: wallet12 });
            await this.dcStrategy.depositUSDC(usdc('200'), { from: wallet13 });
            await expectRevert(this.dcStrategy.depositUSDC(usdc('150'), { from: wallet14 }),
                'DNP: Exceeding total poolLimit');
            await this.dcStrategy.depositUSDC(usdc('100'), { from: wallet14 });
        })
    })
});
