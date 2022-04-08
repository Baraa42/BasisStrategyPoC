// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract VaultMock {
    event Deposited(address indexed collateralToken, address indexed trader, uint256 amount);

    event Withdrawn(address indexed collateralToken, address indexed trader, uint256 amount);

   constructor() {}

    uint256 amount;

    function deposit(address token, uint256 amountX10_D) external {
        IERC20(token).transferFrom(msg.sender, address(this), amountX10_D);
        amount += amountX10_D;
    }

    /// @param token the address of the token sender is going to withdraw
    ///        once multi-collateral is implemented, the token is not limited to settlementToken
    /// @param amountX10_D the amount of the token to withdraw in decimals D (D = _decimals)
    function withdraw(address token, uint256 amountX10_D) external {
        console.log("[VAULT] Contains: %s, withdraw: %s", IERC20(token).balanceOf(address(this)), amountX10_D);
        IERC20(token).transfer(msg.sender, amountX10_D);
        amount -= amountX10_D;
    }

    function getBalance(address account) external view returns (int256) {}

    /// @param trader The address of the trader to query
    /// @return freeCollateral Max(0, amount of collateral available for withdraw or opening new positions or orders)
    function getFreeCollateral(address trader) external view returns (uint256) {
        return amount;
    }

    /// @dev there are three configurations for different insolvency risk tolerances: conservative, moderate, aggressive
    ///      we will start with the conservative one and gradually move to aggressive to increase capital efficiency
    /// @param trader the address of the trader
    /// @param ratio the margin requirement ratio, imRatio or mmRatio
    /// @return freeCollateralByRatio freeCollateral, by using the input margin requirement ratio; can be negative
    function getFreeCollateralByRatio(address trader, uint24 ratio) external view returns (int256) {}

    function getSettlementToken() external view returns (address) {}

    /// @dev cached the settlement token's decimal for gas optimization
    function decimals() external view returns (uint8) {}

    function getTotalDebt() external view returns (uint256){}

    function getClearingHouseConfig() external view returns (address){}

    function getAccountBalance() external view returns (address){}

    function getInsuranceFund() external view returns (address){}

    function getExchange() external view returns (address){}

    function getClearingHouse() external view returns (address){}
}
