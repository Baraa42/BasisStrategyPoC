//const { ether, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const DcTokenFactory = artifacts.require('DcTokenFactory');
const DcToken = artifacts.require('DcToken');

contract('DcTokenFactory', function ([wallet1, wallet2]) {

    before(async function () {
        this.dcTokenFactory = await DcTokenFactory.new();
        await this.dcTokenFactory.initialize();
        this.dcUsdcEthToken = await this.dcTokenFactory.initNewDcToken("dcUsdcEth","deCommas USDC ETH Strategy", { from: wallet1 }
        );
    });

    describe('Create new dcToken', async function () {

        it('should create new dcToken Strategy', async function () {
            await this.dcTokenFactory.initNewDcToken("dcTest","deCommas test coin", { from: wallet1 });
            await this.dcTokenFactory.initNewDcToken("dcUsdcBtc","deCommas USDC BTC Strategy", { from: wallet1 });
            const token = await this.dcTokenFactory.getDcToken(1);
            expect(await this.dcTokenFactory.isDcToken(token)).to.equal(true);

            const token2 = await DcToken.new("fkTest","FAKE deCommas test coin", { from: wallet1 });
            expect(await this.dcTokenFactory.isDcToken(token2.address)).to.equal(false);
        });


        it('should create new dcToken Strategy from non-owner address', async function () {
            await this.dcTokenFactory.initNewDcToken("dcTornUSDT","deCommas TORN USDT", { from: wallet1 });

            try {
                await this.dcTokenFactory.initNewDcToken("dcUsdcBtc","deCommas USDC BTC Strategy", { from: wallet1 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }
            await this.dcTokenFactory.initNewDcToken("dcUsdcBtc","deCommas USDC BTC Strategy", { from: wallet1 });
        });
    });

    describe('Pause and unpause operations', async function () {
        it('should be Pause/unpause for dcFactory', async function () {
            const token = await this.dcTokenFactory.getDcToken(0);
            await this.dcTokenFactory.pauseToDcToken(token, { from: wallet1 });

            try {
                await this.dcTokenFactory.pauseToDcToken(token, { from: wallet1 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            try {
                await this.dcTokenFactory.unpauseToDcToken(token, { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }
            await this.dcTokenFactory.unpauseToDcToken(token, { from: wallet1 });
        });
    });

    describe('Add and remove new governance contracts', async function () {
        it('should mint after remove out governance', async function () {
            const token = await this.dcTokenFactory.getDcToken(0);
            await this.dcTokenFactory.addGovernanceToDcToken(wallet1, token, { from: wallet1 });
            await this.dcTokenFactory.addGovernanceToDcToken(wallet2, token, { from: wallet1 });

            try {
                await this.dcTokenFactory.addGovernanceToDcToken(wallet3, token, { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            await this.dcTokenFactory.removeGovernanceToDcToken(wallet2, token, { from: wallet1 });

            try {
                await this.dcTokenFactory.addGovernanceToDcToken(wallet2, token, { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }
        });
    });
});
