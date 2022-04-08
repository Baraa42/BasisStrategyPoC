// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "../integrations/perpetual/IExchange.sol";
import "../integrations/lib/FullMath.sol";

contract ExchangeMock is IExchange {

    constructor() {}

    function swap(SwapParams memory params) external override returns (SwapResponse memory) {
        revert("Unimplemented!");
    }

    function getMaxTickCrossedWithinBlock(address baseToken) external view override returns (uint24) {
        return 0;
    }

    function getAllPendingFundingPayment(address trader) external view override returns (int256) {
        return 0;
    }

    /// @dev this is the view version of _updateFundingGrowth()
    /// @return the pending funding payment of a trader in one market, including liquidity & balance coefficients
    function getPendingFundingPayment(address trader, address baseToken) external view override returns (int256) {
        return 0;
    }

    function getSqrtMarkTwapX96(address baseToken, uint32 twapInterval) external view override returns (uint160) {
        return 5070602400912918000000000000000;
//        return 5010417276024814852820321803165; REAL
    }

    function getPnlToBeRealized(RealizePnlParams memory params) external view override returns (int256) {
        return 0;
    }

    function getOrderBook() external view override returns (address) {
        return address(0);
    }

    function getAccountBalance() external view override returns (address) {
        return address(0);
    }

    function getClearingHouseConfig() external view override returns (address) {
        return address(0);
    }
}
