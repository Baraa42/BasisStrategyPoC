// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Math.sol";

import "../interfaces/IdcToken.sol";
import "../integrations/perpetual/IVault.sol";
import "../integrations/perpetual/IExchange.sol";
import "../integrations/uniswap/IV3SwapRouter.sol";
import "../integrations/perpetual/IIndexPrice.sol";
import "../integrations/perpetual/IClearingHouse.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract StrategyStorage is OwnableUpgradeable {

    uint24 internal _feeToPair;
    uint160 internal _deadlineTime;
    uint160 internal _sqrtPriceLimitX96toUni;

    address internal _router;
    address internal _dcToken;
    address internal _usdToken; // baseToken - usdc
    address internal _wToken; // wrapped Native Token
    address internal _vToken; /// Native Strategy Perp Token

    address public escrowServer;
    address public triggerServer;

    modifier onlyTrigger() {
        require(triggerServer == _msgSender(), "StrategyStorage: caller is not trigger");
        _;
    }


    function setTriggerServer(address _newTriggerServer) public onlyOwner {
        require(_newTriggerServer != (address(0x0)), "StrategyStorage: zero address");
        triggerServer = _newTriggerServer;
    }


    function setEscrow(address _newEscrow) public onlyOwner {
        require(_newEscrow != address(0x0), "StrategyStorage: zero address");
        escrowServer = _newEscrow;
    }


    function setVToken(address newVToken) public onlyOwner {
        _vToken = newVToken;
    }


    function emergencyWithdraw(IERC20 _token) public onlyOwner {
        require(escrowServer != address(0x0), "StrategyStorage: zero address");
        require(_token.transfer(escrowServer, _token.balanceOf(address(this))), "DNP: ERC20 transfer failed");
    }


    function approveTokenForUni(IERC20 token, uint256 amount) public onlyOwner {
        token.approve(_router, amount);
    }


    function _buyTokensToUniswap(address _tokenA, address _tokenB, uint256 amount) internal {
        IV3SwapRouter(_router).exactInputSingle(IV3SwapRouter.ExactInputSingleParams({
            tokenIn: _tokenA,
            tokenOut: _tokenB,
            fee: _feeToPair,
            recipient: address(this),
            amountIn: amount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: _sqrtPriceLimitX96toUni
        }));
    }


    // We want to sell `tokenA` for `tokenB` and receive `amount` of `tokenB`
    // We want to spend no more than `amountInMaximum` of tokenA
    function _sellTokensToUniswap(address _tokenA, address _tokenB, uint256 amount, uint256 amountInMaximum) internal {
        IV3SwapRouter(_router).exactOutputSingle(IV3SwapRouter.ExactOutputSingleParams({
        tokenIn: _tokenA,
        tokenOut: _tokenB,
        fee: _feeToPair,
        recipient: address(this),
        amountOut: amount,
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: _sqrtPriceLimitX96toUni
        }));
    }
}
