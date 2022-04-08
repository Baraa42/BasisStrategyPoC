// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IdcToken {

    function mint(address _to, uint256 _amount) external returns(bool);

    function burn(uint256 _amount) external returns(bool);

    function addGovernance(address _member) external;

    function removeGovernance(address _member) external;

    function isGovernance(address governance_) external;

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function pause() external;

    function unpause() external;

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);
}
