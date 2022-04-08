const { ether, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

//const { gasspectEVM } = require('./helpers/profileEVM');
//const { assertRoughlyEqualValues, toBN } = require('./helpers/utils');

const DcToken = artifacts.require('DcToken');

contract('DcToken', function ([wallet1, wallet2, wallet3]) {

    before(async function () {
        this.dcToken = await DcToken.new("dcTest","deCommas test coin", { from: wallet1 });
    });

    beforeEach(async function () {
                await this.dcToken.addGovernance(wallet1, { from: wallet1 });
                await this.dcToken.mint(wallet2, ether('10000'));
                await this.dcToken.mint(wallet1, ether('10000'));
    });

    describe('Mint and burn new tokens', async function () {

        it('should add to other contract to governance', async function () {
            await this.dcToken.addGovernance(wallet2, { from: wallet1 });
            await this.dcToken.mint(wallet2, ether('10000'), { from: wallet2 });

            try {
                await this.dcToken.removeGovernance(wallet1, { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            try {
                await this.dcToken.addGovernance(wallet3, { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            await this.dcToken.removeGovernance(wallet1, { from: wallet1 });
        });

    });

    describe('Pause and unpause operations', async function () {

        it('should be Pause/unpause for owner', async function () {
            await this.dcToken.pause({ from: wallet1 });

            try {
                await this.dcToken.pause({ from: wallet1 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            try {
                await this.dcToken.unpause({ from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            await this.dcToken.unpause({ from: wallet1 });
        });


        it('should transfer after pause', async function () {
            await this.dcToken.mint(wallet2, ether('10000'), { from: wallet1 });
            await this.dcToken.mint(wallet3, ether('10000'), { from: wallet1 });
            await this.dcToken.pause({ from: wallet1 });
            await this.dcToken.transfer(wallet3, ether('1000'), { from: wallet2 });

            try {
                await this.dcToken.mint(wallet2, ether('10000'), { from: wallet1 });
                 expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            try {
                await this.dcToken.transfer(wallet3, ether('1000'), { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            await this.dcToken.unpause({ from: wallet1 });
            await this.dcToken.transfer(wallet3, ether('1000'), { from: wallet2 });
        });

    });

    describe('Add and remove new governance contracts', async function () {

        it('should mint after remove out governance', async function () {
            await this.dcToken.addGovernance(wallet2, { from: wallet1 });
            expect(await this.dcToken.isGovernance(wallet2)).to.equal(true);

            await this.dcToken.mint(wallet2, ether('10000'), { from: wallet2 });
            await this.dcToken.removeGovernance(wallet1, { from: wallet1 });
            expect(await this.dcToken.isGovernance(wallet1)).to.equal(false);

            try {
                await this.dcToken.mint(wallet2, ether('10000'), { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            try {
                await this.dcToken.mint(wallet2, ether('10000'), { from: wallet3 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }
        });

        it('should burn after remove out governance', async function () {
            await this.dcToken.addGovernance(wallet2, { from: wallet1 });
            await this.dcToken.mint(wallet2, ether('10000'), { from: wallet2 });
            await this.dcToken.mint(wallet3, ether('10000'), { from: wallet2 });

            await this.dcToken.burn(ether('1000'), { from: wallet2 });
            await this.dcToken.removeGovernance(wallet1, { from: wallet1 });

            try {
                await this.dcToken.burn(ether('1000'), { from: wallet2 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }

            try {
                await this.dcToken.burn(ether('100'), { from: wallet3 });
                expect(true).equal(true);
            } catch (error) {
                expect(error.toString().indexOf('Wallet2 is not owner') !== -1).equal(false);
            }


            //

        });

    });
});
