const hre = require("hardhat");
require('dotenv').config();
const { BigNumber } = require("ethers");
const {artifacts} = require("hardhat");
const ROUTER = "0x88037a7ce1df82eccc787e24e1afc8696faa8813";
const WETH = "0xF26F03Fc8A5C7094639924230b4693d2C9b39041";
const USDC = "0x3e22e37cb472c872b5de121134cfd1b57ef06560";
const TRIGGER = "0x9F4e3682643971dd336BE7b456ba52f070aeDfb9";
const UniRouter = artifacts.require('UniswapETHSwapperMock');
const DcEth = artifacts.require('DcETH');

async function main() {

    const routerContract = await UniRouter.at(ROUTER);
    const customWETH = await DcEth.at(WETH);
    console.log("address of spender before", await customWETH.balanceOf(TRIGGER).toString())
    //console.log("price eth before", await routerContract.currentPrice(TRIGGER))
    const tx = await routerContract.exactInputSingle([USDC, WETH, 500, TRIGGER, 1640191802, 4500000, 0, 0]);
    console.log(tx);
    console.log("address of spender after", await customWETH.balanceOf(TRIGGER).toString())
  //  console.log("price eth before", await routerContract.currentPrice(TRIGGER))
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
