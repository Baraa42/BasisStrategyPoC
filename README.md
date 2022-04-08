# POC Strategy 3commas USDC

## About:
[About](https://3commas.atlassian.net/wiki/spaces/G/pages/edit-v2/1963688061)

### Basic:
[USDC from Optimism Ethereum](https://optimistic.etherscan.io/token/0x7f5c764cbc14f9669b88837ca1490cca17c31607)
```

### Addresses:

#### Kovan Optimism
[Token Factory](https://kovan-optimistic.etherscan.io/address/0x861bd353A6b1ff598d8c2E226c828392c82d151D#code)

[Strategy1](https://kovan-optimistic.etherscan.io/address/0xe10F907951053792c9A8b833eb1CeCF9FA7dae61#code)

#### Optimism Mainnet
[Token Factory]()

[Strategy1]()

##How to use:

### STAGE
##### build:
```
yarn
```

##### Export Environment:
add `process.env` or
```
export OPTIMISTIC_PRIVATE_KEY=key
export OPTIMISTIC_KOVAN_PRIVATE_KEY=key
export ALCHEMY_API_KEY=key
```

##### compile:
```
npx hardhat compile
```

##### security and style check:
```
solhint 'contracts/**/*.sol'
```

```
slither . --exclude naming-convention,unused-state,unchecked-transfer,unused-return,events-access,events-maths,missing-zero-check,assembly,pragma,solc-version,similar-names,too-many-digits,external-function,shadowing-state,low-level-calls,shadowing-local, missing-inheritance --json slither_report.json
```
##### test:
```
npx hardhat test
npx hardhat test --network localhost
```

##### test coverage:
```
npx hardhat coverage
```

##### contracts size
```
npx hardhat size-contracts
```

##### Local tests
```
npx hardhat node --fork https://opt-kovan.g.alchemy.com/v2/{ALCHEMY_API_KEY} --fork-block-number 534637 --no-deploy
npx hardhat run scripts/Dnp_optimism.js --network localhost

```

```
npx hardhat node --fork https://opt-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY} --fork-block-number 2944129 --no-deploy
```

##### Init new ABI
```
yarn run hardhat export-abi
yarn run hardhat clear-abi
```

##### Deploy to KOVAN-OPTIMISM
```
npx hardhat run deploy/kovan/deploy_factory.js --network kovanoptimism

npx hardhat run deploy/kovan/deploy_strategy_weth.js --network kovanoptimism
npx hardhat run deploy/kovan/deploy_dc_token.js --network kovanoptimism
npx hardhat run deploy/kovan/deploy_strategy_wbtc.js --network kovanoptimism

```
### PRODUCTION
##### Clone
```
git clone https://gitlab.pwlnh.com/deprotocol/poc-strategy.git
```
##### Build
```
cd /poc-strategy
git checkout development
yarn
```
##### Build
```
touch process.env
export OPTIMISTIC_PRIVATE_KEY=YOUR_KEY
export ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
export MAINNET_ETHERSCAN_KEY=MAINNET_ETHERSCAN_KEY
```
##### Check to Compilation
```
npx hardhat compile
```

##### Check to Test
```
npx hardhat coverage
```

##### Create ABI
```
yarn run hardhat export-abi
```
##### Deploy
1. Check 'TRIGGER_SERVER_OPTIMISM' address in /config/addresses.json.

2. Check 'PROXY_OWNER_OPTIMISM' address in /config/addresses.json.

3. Run Script:
```
npx hardhat run deploy/optimism/deploy.js --network optimism
```

##### Save addresses to addresses.json

##### Verify to EtherScan
```
npx hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
npx hardhat verify DEPLOYED_CONTRACT_ADDRESS
```

###### Verify AS Proxy:
https://kovan-optimistic.etherscan.io/proxyContractChecker?a=<proxyAddress>

##### Flatten
```
npx hardhat flat --output flattener/{{contract_name}}.sol contracts/{{contract_name}}.sol 
```

## Perp Methods:

#### Account Value
1e18 in USDC
return value - ???
```
ClearingHouse(0x82ac2CE43e33683c58BE4cDc40975E73aA50f459).getAccountValue
```

#### Account Balance
```
Vault(0xAD7b4C162707E0B2b5f6fdDbD3f8538A5fbA0d60).getBalance(dcSTRATEGY_WETH)
```

#### Get Free Collateral
1e6 in USDC
```
Vault(0xad7b4c162707e0b2b5f6fddbd3f8538a5fba0d60).getFreeCollateral(dcSTRATEGY_WETH)
```

#### Account Info
```
AccountBalance(0xA7f3FC32043757039d5e13d790EE43edBcBa8b7c).getAccountInfo(dcSTRATEGY_WETH,VETH_PERP_OPTIMISM)
```


#### get All Pending funding Payments 
@return the pending funding payment of a trader in one market, including liquidity & balance coefficients
1e18 in USD
```
Exchange(0xBd7a3B7DbEb096F0B832Cf467B94b091f30C34ec).getAllPendingFundingPayment(dcSTRATEGY_WETH)
```

#### get pending funding payment for baseToken
@return the pending funding payment of a trader in one market, including liquidity & balance coefficients
1e18 in USD
```
Exchange(0xBd7a3B7DbEb096F0B832Cf467B94b091f30C34ec).getPendingFundingPayment(dcSTRATEGY_WETH, VETH_PERP_OPTIMISM)
```


#### Pending PNL and Fee 
1e18 in USD
/// @return owedRealizedPnl the pnl realized already but stored temporarily in AccountBalance
/// @return unrealizedPnl the pnl not yet realized
/// @return pendingFee the pending fee of maker earned
```
AccountBalance(0xA7f3FC32043757039d5e13d790EE43edBcBa8b7c).getPnlAndPendingFee(dcSTRATEGY_WETH)
```

#### get Margin Requirement For Liquidation
/// @dev this is different from Vault._getTotalMarginRequirement(), which is for freeCollateral calculation
    /// @return int instead of uint, as it is compared with ClearingHouse.getAccountValue(), which is also an int
```
AccountBalance(0xA7f3FC32043757039d5e13d790EE43edBcBa8b7c).getMarginRequirementForLiquidation(dcSTRATEGY_WETH)
```

#### Total Account Debt Value 
1e18 in USD
```
AccountBalance(0xA7f3FC32043757039d5e13d790EE43edBcBa8b7c).getTotalDebtValue(dcSTRATEGY_WETH)
```

#### Total Position Size (result)
1e18 in USD
"-" for open Short Position, "+" for open Long Position
```
AccountBalance(0xA7f3FC32043757039d5e13d790EE43edBcBa8b7c).getTotalPositionSize(dcSTRATEGY_WETH,VETH_PERP_OPTIMISM)
```
