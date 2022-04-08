// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Governance is Ownable, Pausable{

    mapping(address => bool) public governance;

    modifier onlyGovernance() {
        require(governance[_msgSender()], "dcGovernance: caller is not the governance");
        _;
    }


    function addGovernance(address _member) public onlyOwner {
        require(_member != address(0x0), "dcGovernance: zero address");
        governance[_member] = true;
    }


    function removeGovernance(address _member) public onlyOwner {
        require(_member != address(0x0), "dcGovernance: zero address");
        governance[_member] = false;
    }


    function isGovernance(address governance_) public view returns(bool) {
        return governance[governance_];
    }
}
