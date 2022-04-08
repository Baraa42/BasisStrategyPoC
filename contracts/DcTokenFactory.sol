// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IdcToken.sol";
import "./token/DcToken.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract DcTokenFactory is OwnableUpgradeable {

    address[] private _dcTokens;

    mapping(address => bool) private _allDcTokens;

    // __gap is reserved storage
    uint256[50] private __gap;

    event InitializedNewDCToken(address indexed token, string name, string indexed symbol);

    event AddedNewGovernance(address indexed token, address member);


    function initialize() public {
        __Ownable_init();
    }

    function initNewDcToken(string memory _name,
                            string memory _symbol) public onlyOwner returns(address) {
        DcToken newToken = new DcToken(_name, _symbol);
        _allDcTokens[address(newToken)] = true;
        _dcTokens.push(address(newToken));
        emit InitializedNewDCToken(address(newToken), _name, _symbol);
        return address(newToken);
    }


    function addGovernanceToDcToken(address _member, address _dcToken) public onlyOwner {
        IdcToken(_dcToken).addGovernance(_member);
        emit AddedNewGovernance(_dcToken, _member);
    }


    function removeGovernanceToDcToken(address _member, address _dcToken) public onlyOwner {
        IdcToken(_dcToken).removeGovernance(_member);
    }


    function pauseToDcToken(address _dcToken) public onlyOwner {
        IdcToken(_dcToken).pause();
    }


    function unpauseToDcToken(address _dcToken) public onlyOwner {
        IdcToken(_dcToken).unpause();
    }


    function getDcToken(uint256 _tokenId) public view returns(address) {
        return _dcTokens[_tokenId];
    }


    function isDcToken(address dcToken) public view returns(bool) {
        return _allDcTokens[dcToken];
    }

}
