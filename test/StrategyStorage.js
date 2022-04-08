const {ether, expectRevert, BN} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');
const { usdc } = require('./helpers/utils');
//const {address} = require("hardhat/internal/core/config/config-validation");

const DcTokenFactory = artifacts.require('DcTokenFactory');
const wToken = artifacts.require('wToken');
const VaultMock = artifacts.require('VaultMock');
const ClearingHouseMock = artifacts.require('ClearingHouseMock');
const ExchangeMock = artifacts.require('ExchangeMock');
const PerpTokenMock = artifacts.require('PerpTokenMock');
const UniswapRouterMock = artifacts.require('UniswapETHSwapperMock');
const DeltaNeutralPerp = artifacts.require('DeltaNeutralPerp');

const DcToken = artifacts.require('DcToken');

contract('Storage Strategy', function ([wallet1, wallet2, triggerServer, escrowServer]) {

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
        this.uniRouter = await UniswapRouterMock.new(this.usdcToken.address, this.vToken.address, this.wethToken.address, triggerServer);
        await this.dcStrategy.initialize(this.usdcToken.address,
                                        this.uniRouter.address,
                                        this.wethToken.address,
                                        this.vToken.address,
                                        this.perpHouse.address,
                                        this.perpVault.address,
                                        triggerServer,0,0);

        await this.usdcToken.mint(wallet2, ether('10000'), {from: wallet1});
        await this.usdcToken.mint(this.dcStrategy.address, ether('10000'), {from: wallet1});
        await this.dcStrategy.setDcToken(this.dcToken.address, {from: wallet1})
        await this.dcToken.addGovernance(this.dcStrategy.address, {from: wallet1});
        await this.dcStrategy.setTriggerServer(triggerServer, {from: wallet1});

        try {
            await this.dcStrategy.emergencyWithdraw(this.usdcToken.address, {from: wallet1})
            expect(true).equal(true);
        } catch (error) {
            expect(error.toString().indexOf('0x0 Escrow') !== -1).equal(false);
        }
        await this.dcStrategy.setEscrow(escrowServer, {from: wallet1});
        await this.wethToken.setRouter(this.uniRouter.address, {from: wallet1});
        await this.dcStrategy.setUsersMaxPoolSizeLimit(100000000000, {from: wallet1});
    });


    describe('set Trigger Server', async function () {
        it('only Owner', async function () {
            try {
                await this.dcStrategy.setTriggerServer(wallet1, {from: wallet2})
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }
            expect(await this.dcStrategy.triggerServer()).to.equal(triggerServer);
            await this.dcStrategy.setTriggerServer(wallet2, {from: wallet1})
            expect(await this.dcStrategy.triggerServer()).to.equal(wallet2);
        });

        it('address 0x0', async function () {
            try {
                await this.dcStrategy.setTriggerServer('0x0000000000000000000000000000000000000000', {from: wallet1})
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('0x0000000000000000000000000000000000000000') !== -1).equal(false);
            }
            expect(await this.dcStrategy.triggerServer()).to.equal(wallet2);
        });
    });

    describe('setEscrow', async function () {
        it('Only Owner', async function () {
            try {
                await this.dcStrategy.setEscrow(wallet1, {from: wallet2})
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }
            expect(await this.dcStrategy.escrowServer()).to.equal(escrowServer);
            await this.dcStrategy.setEscrow(wallet2, {from: wallet1})
            expect(await this.dcStrategy.escrowServer()).to.equal(wallet2);
        });

        it('address 0x0', async function () {
            try {
                await this.dcStrategy.setEscrow('0x0 Escrow', {from: wallet1})
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('0x0000000000000000000000000000000000000000') !== -1).equal(false);
            }
            expect(await this.dcStrategy.escrowServer()).to.equal(wallet2);
        });
    });

    describe('emergency Withdraw', async function () {
        it('only Onwer', async function () {
            expect(await this.dcStrategy.escrowServer()).to.equal(wallet2);
            await this.dcStrategy.setEscrow(escrowServer, {from: wallet1});
            //expect(().toString()).to.equal(" ");

            console.log("strategyUSDCBalance before is " + await this.usdcToken.balanceOf(this.dcStrategy.address));
            expect((await this.usdcToken.balanceOf(escrowServer)).toString()).to.equal("0");

            await this.dcStrategy.emergencyWithdraw(this.usdcToken.address, {from: wallet1});

            expect((await this.usdcToken.balanceOf(this.dcStrategy.address)).toString()).to.equal("0");
            console.log("escrowUSDCBalance after is  " + await this.usdcToken.balanceOf(escrowServer));
        });
    });


    describe('Approve for Uni', async function () {
        it('get Deposit Amount', async function () {
            await this.dcStrategy.approveTokenForUni(this.usdcToken.address, ether('100000'), {from: wallet1});
            await this.dcStrategy.approveTokenForUni(this.wethToken.address, ether('100000'), {from: wallet1});
            try {
                await this.dcStrategy.approveTokenForUni(this.wethToken.address, ether('100000'), {from: wallet2});
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }
        });
    });
});
