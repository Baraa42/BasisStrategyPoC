// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import { IUniswapV3Pool } from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../integrations/lib/FullMath.sol";
import "../integrations/perpetual/IIndexPrice.sol";
import "../integrations/uniswap/IV3SwapRouter.sol";
import "./wToken.sol";

import "hardhat/console.sol";

/// @title Callback for IUniswapV3PoolActions#swap
/// @notice Any contract that calls IUniswapV3PoolActions#swap must implement this interface
contract UniswapV3SwapCallback {
    /// @notice Called to `msg.sender` after executing a swap via IUniswapV3Pool#swap.
    /// @dev In the implementation you must pay the pool tokens owed for the swap.
    /// The caller of this method must be checked to be a UniswapV3Pool deployed by the canonical UniswapV3Factory.
    /// amount0Delta and amount1Delta can both be 0 if no tokens were swapped.
    /// @param amount0Delta The amount of token0 that was sent (negative) or must be received (positive) by the pool by
    /// the end of the swap. If positive, the callback must send that amount of token0 to the pool.
    /// @param amount1Delta The amount of token1 that was sent (negative) or must be received (positive) by the pool by
    /// the end of the swap. If positive, the callback must send that amount of token1 to the pool.
    /// @param data Any data passed through by the caller via the IUniswapV3PoolActions#swap call
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) public {}
}


contract UniswapETHSwapperMock is IV3SwapRouter, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    event SwapSuccess(uint256 baseAmount, uint256 quoteAmount, uint256 price, bool isBuy);

    address private _vETH;
    wToken private _dcETH;
    address private _USDC;
    address payable private _trigger;

    function initialize(address USDC,
        address vETH,
        wToken dcETH,
        address payable trigger) public {
        __Ownable_init();

        _vETH = vETH;
        _dcETH = dcETH;
        _USDC = USDC;
        _trigger = trigger;
    }

    // Deposit native token to this contract
    function deposit() public payable {}

    function withdraw() public {
        require(msg.sender == _trigger, "Only trigger server can withdraw native");
        uint amount = address(this).balance;
        (bool success, ) = _trigger.call{value: amount}("");
        require(success, "Failed to send Ether");
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInputSingle(ExactInputSingleParams calldata params) external payable override returns (uint256 amountOut) {
        uint256 ethPrice = IIndexPrice(_vETH).getIndexPrice(0);

        if (params.tokenIn == _USDC) { //Buy currency for USDC
            uint256 toMint = FullMath.mulDiv(params.amountIn, 1e18, ethPrice); // 22500000 * 4080890000000000000000
            require(IERC20(_USDC).balanceOf(msg.sender) >= params.amountIn, "[UniSwap] Client has not enough USDC to sell");
            IERC20(_USDC).transferFrom(msg.sender, address(this), params.amountIn);
            if (params.tokenOut == address(_dcETH)) { //Buying wrapped ETH
                _dcETH.mint(params.recipient, toMint*1e12);
            } else if (params.tokenOut == address(0)) { //Buying native ETH
                require(address(this).balance >= toMint * 1e12, "[UniSwap] Not enough native liquidity on router");
                (bool sent, bytes memory data) = payable(params.recipient).call{value: toMint*1e12}("");
                require(sent, "Failed to send Ether");
            }

            emit SwapSuccess(params.amountIn, toMint, ethPrice, true);

            return toMint;
        } else { // Sell token and get USDC
//            console.log("USDC balance is %s", IERC20(_USDC).balanceOf(address(this)));
            require(_dcETH.balanceOf(msg.sender) >= params.amountIn, "[UniSwap] Client has not enough dcETH to sell");
            uint256 ethValue = FullMath.mulDiv(ethPrice, params.amountIn, 1e30);
            require(IERC20(_USDC).balanceOf(address(this)) >= ethValue, "[UniSwap] Router has not enough USDC");

//            console.log("Eth amount %s, value is: ", params.amountIn, ethValue);
            _dcETH.burn(msg.sender, params.amountIn);
            IERC20(_USDC).transfer(params.recipient, ethValue);

            emit SwapSuccess(params.amountIn, ethValue, ethPrice, false);

            return ethValue;
        }
    }


    /// @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInput(ExactInputParams calldata params) public payable override returns (uint256 amountOut) {}


    /// @notice Swaps as little as possible of one token for `amountOut` of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactOutputSingleParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutputSingle(ExactOutputSingleParams calldata params) public payable override returns (uint256 amountIn) {
        console.log("USDC balance is %s", IERC20(_USDC).balanceOf(address(this)));

        require(params.tokenIn == address(_dcETH) && params.tokenOut == address(_USDC),
            "UniMock: Only selling of ETH is supported");
        require(IERC20(_USDC).balanceOf(address(this)) >= params.amountOut, "[UniSwap] Not enough USDC on router");
        uint256 ethPrice = IIndexPrice(_vETH).getIndexPrice(0);
        uint256 ethValue = FullMath.mulDiv(1e30, params.amountOut, ethPrice);
//        console.log("Eth amount %s, value is: ", params.amountOut, ethValue);
        require(_dcETH.balanceOf(msg.sender) >= ethValue, "[UniSwap] Client has not enough dcETH to sell");
        _dcETH.burn(msg.sender, ethValue);
        IERC20(_USDC).transfer(params.recipient, params.amountOut);

        emit SwapSuccess(ethValue, params.amountOut, ethPrice, false);

        return ethValue;
    }


    /// @notice Swaps as little as possible of one token for `amountOut` of another along the specified path (reversed)
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactOutputParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutput(ExactOutputParams calldata params) public payable override returns (uint256 amountIn) {}

    function currentPrice() external view returns (uint256) {
        return IIndexPrice(_vETH).getIndexPrice(0);
    }
}
