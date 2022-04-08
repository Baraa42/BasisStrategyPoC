// SPDX-License-Identifier: MIT

// "SPDX-License-Identifier: MIT"
pragma solidity ^0.8.0;

interface IdcTokenFactory {

    function initNewDeToken(string memory _name,
                            string memory _symbol,
                            address _token0,
                            address _token1) external returns(address);

    function getDcToken(uint256 _tokenId) external view returns(address);


    function isDcToken(address dcToken) external view returns(bool);
}