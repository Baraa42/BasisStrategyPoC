// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../integrations/perpetual/IIndexPrice.sol";

contract PerpTokenMock is ERC20, Ownable, IIndexPrice {

    uint256 private _price;

    // solhint-disable-next-line no-empty-blocks
    constructor(string memory name, string memory symbol, uint256 price) ERC20(name, symbol) {
        _price = price;
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    function getIndexPrice(uint256 interval) external view override returns (uint256) {
        return _price;
    }
}
