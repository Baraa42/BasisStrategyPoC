// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

// Unneeded dependency, only for seetleFunding, which we don't use internally.
// import { Funding } from "../lib/Funding.sol";

interface IExchange {
    /// @param amount when closing position, amount(uint256) == takerPositionSize(int256),
    ///        as amount is assigned as takerPositionSize in ClearingHouse.closePosition()
    struct SwapParams {
        address trader;
        address baseToken;
        bool isBaseToQuote;
        bool isExactInput;
        bool isClose;
        uint256 amount;
        uint160 sqrtPriceLimitX96;
    }

    struct SwapResponse {
        uint256 base;
        uint256 quote;
        int256 exchangedPositionSize;
        int256 exchangedPositionNotional;
        uint256 fee;
        uint256 insuranceFundFee;
        int256 pnlToBeRealized;
        uint256 sqrtPriceAfterX96;
        int24 tick;
        bool isPartialClose;
    }

    struct SwapCallbackData {
        address trader;
        address baseToken;
        address pool;
        uint24 uniswapFeeRatio;
        uint256 fee;
    }

    struct RealizePnlParams {
        address trader;
        address baseToken;
        int256 base;
        int256 quote;
    }

    event FundingUpdated(address indexed baseToken, uint256 markTwap, uint256 indexTwap);

    event MaxTickCrossedWithinBlockChanged(address indexed baseToken, uint24 maxTickCrossedWithinBlock);

    /// @param accountBalance The address of accountBalance contract
    event AccountBalanceChanged(address accountBalance);

    function swap(SwapParams memory params) external returns (SwapResponse memory);

    function getMaxTickCrossedWithinBlock(address baseToken) external view returns (uint24);

    function getAllPendingFundingPayment(address trader) external view returns (int256);

    /// @dev this is the view version of _updateFundingGrowth()
    /// @return the pending funding payment of a trader in one market, including liquidity & balance coefficients
    function getPendingFundingPayment(address trader, address baseToken) external view returns (int256);

    function getSqrtMarkTwapX96(address baseToken, uint32 twapInterval) external view returns (uint160);

    function getPnlToBeRealized(RealizePnlParams memory params) external view returns (int256);

    function getOrderBook() external view returns (address);

    function getAccountBalance() external view returns (address);

    function getClearingHouseConfig() external view returns (address);
}
