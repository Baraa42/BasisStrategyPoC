const hre = require("hardhat");
require('dotenv').config();
//const { BigNumber } = require("ethers");


const { USDC_OPTIMISM, dcSTRATEGY_KOVAN, UNISWAP_OPTIMISM} = require('../config/addresses.json');
const Proxy_Owner = "0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4";

async function main() {

    const abiStrategy = require("../abi/DeltaNeutralPerp.json");
    const abiUsdc = require("../abi/wToken.json");
    //const abiDcToken = require("../abi/DcToken.json");

    const provider = new hre.ethers.providers.JsonRpcProvider();
    await provider.send("hardhat_impersonateAccount", [Proxy_Owner]);
    const signer = await provider.getSigner(Proxy_Owner);

    const DcToken = await hre.ethers.getContractFactory('DcToken');//hre.ethers.getContractFactory("DcToken");
    const dcTokenAddress = await DcToken.deploy("DcETH", "DcETH");
    await dcTokenAddress.deployed();
    console.log("DcToken is ", dcTokenAddress.address);

 const strategyContract = new ethers.Contract(dcSTRATEGY_KOVAN, abiStrategy, signer);

 console.log("dcSTRATEGYADDRESS is", strategyContract.address);
 await strategyContract.setRouter(UNISWAP_OPTIMISM);

 const usdcContract = new ethers.Contract(USDC_OPTIMISM, abiUsdc, signer);
 console.log("usdcContract", usdcContract.address);

 console.log("USDCBalance of user after transfer 10", (await usdcContract.balanceOf(Proxy_Owner)).toString());
 await usdcContract.approve(dcSTRATEGY_KOVAN, BigNumber.from("1000000000"));
 await usdcContract.transfer(UNISWAP_OPTIMISM, BigNumber.from("1000000000"));

 await strategyContract.allowDeposit(Proxy_Owner);

 await strategyContract.depositUSDC(10000000);
 console.log("USDCBalance of user after transfer 10", (await usdcContract.balanceOf(Proxy_Owner)).toString());
 console.log("USDCBalance of strategy after transfer 10", (await usdcContract.balanceOf(strategyContract.address)).toString());

    await strategyContract.depositUSDC(BigNumber.from("10000000"));
    await strategyContract.depositUSDC(BigNumber.from("15000000"));
    await strategyContract.depositUSDC(BigNumber.from("30000000"));
    await strategyContract.depositToVault(BigNumber.from("10000000"));
    await strategyContract.adjustPosition(true, true, BigNumber.from("10000000"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
