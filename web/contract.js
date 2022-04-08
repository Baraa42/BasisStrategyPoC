// import MetaMaskOnboarding from '@metamask/onboarding'

import { ethers } from "./ethers.esm.min.js";

import 'web3'

const forwarderOrigin = 'http://localhost:7545';

const getAccountsButton = document.getElementById('getAccounts');
const balanceUSDT = document.getElementById('balanceUsdt');
const balanceDC = document.getElementById('balanceDc');

const user_address = '0x476268da7fa59D7F78650aC59202cF3c66c56006';
const usdc_address = '0x3e22e37cb472c872b5de121134cfd1b57ef06560';
const strategy_address = '0xD486c35aa0b3a560e8d064cE887e7E9fc2105431';
const dc_token_address = '0xaB77763010025e5167DE4fEcA7e8Df6567f6701E';

const initialize = async () => {

    const connectBtn = document.getElementById('connectButton');
    const depositBtn = document.getElementById('btnDeposit');
    const withdrawBtn = document.getElementById('btnWithdraw');

    const depositAmount = document.getElementById('depo');
    const withdrawAmount = document.getElementById('withdraw');


    var usdtAbi;
    var dcTokenAbi;
    var strategyAbi;

    const isMetaMaskInstalled = () => {
        const { ethereum } = window;
        return Boolean(ethereum && ethereum.isMetaMask);
    };

    const onboarding = new MetaMaskOnboarding({ forwarderOrigin });

    const onClickInstall = () => {
        connectBtn.innerText = 'Onboarding in progress';
        connectBtn.disabled = true;
        onboarding.startOnboarding();
    };

    const onClickConnect = async () => {
        try {
            let selector = web3.eth.abi.encodeFunctionSignature("getCurrentFundingRate()");
            console.log(selector);
            // await ethereum.request({ method: 'eth_requestAccounts' });
        } catch (error) {
            console.error(error);
        }
    };

    const MetaMaskClientCheck = () => {
        if (!isMetaMaskInstalled()) {
            connectBtn.innerText = 'Click here to install MetaMask!';
            connectBtn.onclick = onClickInstall;
            connectBtn.disabled = false;
        } else {
            connectBtn.innerText = 'Connect';
            connectBtn.onclick = onClickConnect;
            connectBtn.disabled = false;
        }
    };
    MetaMaskClientCheck();

    getAccountsButton.addEventListener('click', async () => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum)
            const signer = provider.getSigner()

            var abi = [
                    {
                        "inputs": [
                            {
                                "internalType": "address",
                                "name": "account",
                                "type": "address"
                            }
                        ],
                        "name": "balanceOf",
                        "outputs": [
                            {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                            }
                        ],
                        "stateMutability": "view",
                        "type": "function",
                        "constant": true
                    },
                    {
                        "inputs": [
                            {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "addedValue",
                                "type": "uint256"
                            }
                        ],
                        "name": "increaseAllowance",
                        "outputs": [
                            {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                            }
                        ],
                        "stateMutability": "nonpayable",
                        "type": "function"
                    },
                    {
                        "inputs": [
                            {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "subtractedValue",
                                "type": "uint256"
                            }
                        ],
                        "name": "decreaseAllowance",
                        "outputs": [
                            {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                            }
                        ],
                        "stateMutability": "nonpayable",
                        "type": "function"
                    },
                    {
                        "inputs": [
                            {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                            },
                            {
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                            }
                        ],
                        "name": "approve",
                        "outputs": [
                            {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                            }
                        ],
                        "stateMutability": "nonpayable",
                        "type": "function"
                    },
                ];

            usdtAbi = new ethers.Contract(usdc_address, abi, provider);
            var balance = await usdtAbi.balanceOf(user_address);
            console.log("balance is: " + balance);
            balanceUSDT.innerHTML = balance / 1e6 || 'You are empty';

            var dc_abi = [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "account",
                            "type": "address"
                        }
                    ],
                    "name": "balanceOf",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];
            dcTokenAbi = new ethers.Contract(dc_token_address, dc_abi, provider);
            var dcBalance = await dcTokenAbi.balanceOf(user_address);
            console.log("DC balance is: " + dcBalance);
            balanceDC.innerHTML = dcBalance / 1e18 || 'You are empty';
        } catch (err) {
            console.error(err)
            balanceUSDT.innerHTML = `Error: ${err.message}`
            balanceDC.innerHTML = `Error: ${err.message}`
        }
    });

    depositBtn.addEventListener('click', async () => {
        if (depositAmount.value === '') {
            alert("Input smth!");
            return;
        }
        var toDepo = ethers.BigNumber.from(depositAmount.value + '000000');
        console.log("to depo: " + toDepo);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        var strategy_abi = [
            {
                "inputs": [
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "name": "depositUSDC",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "name": "withdrawUSDC",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];
        strategyAbi = new ethers.Contract(strategy_address, strategy_abi, provider);

        const tx = signer.sendTransaction({
           to: strategy_address
        });
        await usdtAbi.approve(strategy_address, toDepo);
        var depoOk = await strategyAbi.depositUSDC(toDepo);
        alert(depoOk);
    });
};
window.addEventListener('DOMContentLoaded', initialize);
