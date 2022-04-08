// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract wToken is ERC20, Ownable {
    // solhint-disable-next-line no-empty-blocks
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    address private _router;

    function router() public view returns (address) {
        return _router;
    }

    modifier onlyRouter() {
        require(router() == _msgSender(), "Ownable: caller is not the router");
        _;
    }

    function setRouter(address newRouter) external onlyOwner {
        _router = newRouter;
    }

    function mint(address account, uint256 amount) external onlyRouter {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyRouter {
        _burn(account, amount);
    }
}
