// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./StrategyStorage.sol";

contract DeltaNeutralPerp is StrategyStorage {

    int256 private _depositsSinceLastCharge; // todo del
    int256 private _withdrawalsSinceLastCharge; //  todo del
    int256 private _lastTotal; //  todo del

    uint32 internal _performanceFee; // fee charged every day by trigger server; 1e6
    uint32 internal _subscriptionFee; // fee charged once on deposit; 1e6

    uint32 internal constant _DAILY_SECONDS = 60 * 60 * 24; //  todo del
    uint32 internal constant _W_TOKEN_VALUE = 45; // current wToken value
    uint32 internal constant _SHORT_VALUE = 45; // current Short position in Perpetual.finance
    uint32 internal constant _RESERVE_VALUE = 10; // current reserve

    uint256 private _lastPfChargeTime; //  todo del
    uint256 private _depositLimit;

    IClearingHouse internal _perp;
    IVault internal _perpVault;

    mapping(address => bool) private _allowList;
    mapping(address => uint256) private _depositAmount;

    // __gap is reserved storage
    uint256[50] private __gap;


    uint256 public maxPoolSizeLimit;

    uint256 public maxUsersPoolSizeLimit;
    uint256 public maxDaoListPoolSizeLimit;
    uint256 public currentDaoDeposits;
    uint256 public currentCasualDeposits;

    mapping(address=>bool) private _daoMembersList; // daoMembers




    event USDCDeposited(address indexed user,
        uint256 usdcAmount,
        uint256 indexed depositAmount,
        uint256 indexed dcMintingAmount);

    event USDCWithdrawn(address indexed user, uint256 usdcAmount);

    event PositionAdjusted(bool indexed operationType, bool indexed positionType, uint256 usdcValue, uint256 wValue);

    event PFCharged(address indexed triger, uint256 pfAmount);

    event DepositAllowed(address indexed user);

    /**
    * @dev Sets the addresses for USDC stableCoin, triggerServer, deCommas Pool Token,
    * UniswapRouter, Perpetual ClearingHouse, Perpetual Vault(AccountBalance contract), Perpetual vToken for Strategy,
    * initialize to base shares for position
    */
    function initialize(address _usdc,
                                address router_,
                                address wToken_,
                                address vToken_,
                                IClearingHouse perp_,
                                IVault perpVault_,
                                address _triggerServer,
                                uint32 performanceFee_,
                                uint32 subscriptionFee_) public {
        __Ownable_init();
        _usdToken = _usdc;
        _router = router_; // UniSwap Router
        _wToken = wToken_; // wToken implementation for chain
        _vToken = vToken_; // perpBaseToken
        _perp = perp_; // Perpetual Clearing House
        _perpVault = perpVault_;
        triggerServer = _triggerServer;
        _performanceFee = performanceFee_;
        _subscriptionFee = subscriptionFee_;

        _lastPfChargeTime = 0;
        _lastTotal = 0;
        _depositsSinceLastCharge = 0;
        _withdrawalsSinceLastCharge = 0;

        _deadlineTime = 300;
        _feeToPair = 500;
        _sqrtPriceLimitX96toUni = 0;
        _depositLimit = 200 * 1e6;

        IERC20(_usdToken).approve(address(_router),
            115792089237316195423570985008687907853269984665640564039457584007913129639935);
        IERC20(_wToken).approve(address(_router),
            115792089237316195423570985008687907853269984665640564039457584007913129639935);
    }


    /**
    * @dev User can to deposit her USDC for strategy
    * @param amount USDC token amount
    */
    function depositUSDC(uint256 amount) public {
        require(amount != 0, "DNP: zero amount");
        require(_depositAmount[_msgSender()] + amount <= _depositLimit, "DNP: Exceeding deposit limit");

        if (_daoMembersList[_msgSender()]) {
            require(currentDaoDeposits+amount <= maxDaoListPoolSizeLimit, "DNP: Exceeding DAO total poolLimit");
            currentDaoDeposits+=amount;
        }
        else {
            require(_allowList[_msgSender()], "DNP: You are not allowed to deposit");
            require(currentCasualDeposits+amount <= maxUsersPoolSizeLimit, "DNP: Exceeding total poolLimit");
            currentCasualDeposits+=amount;
         }
        uint256 tvl = getTotalUSDCValue();
        uint256 mintingAmount = amount * 1e12; // user get token amount equal to USDC amount
        if (tvl > 100000) {
            uint256 share = Math.mulDiv(amount, 1e18, tvl);
            mintingAmount = Math.mulDiv(share, IdcToken(_dcToken).totalSupply(), 1e18);
        }

        _depositAmount[_msgSender()] += amount;
        require(IERC20(_usdToken).transferFrom(_msgSender(), address(this), amount), "DNP: usdc transfer failed");

        IdcToken(_dcToken).mint(_msgSender(), mintingAmount);
        emit USDCDeposited(_msgSender(), amount, _depositAmount[_msgSender()], mintingAmount);
    }


    /**
    * @dev User can to withdraw her USDC from strategy
    * @param amount dCommas Pool Token user's amount
    */
    function withdrawUSDC(uint256 amount) public {
        require(amount != 0, "DNP: zero amount");
        require(amount <= IdcToken(_dcToken).balanceOf(_msgSender()), "DNP: insufficient tokens");
        uint256 poolShare = Math.mulDiv(amount, 1e6, IdcToken(_dcToken).totalSupply());
        uint256 result = Math.mulDiv(getTotalUSDCValue(), poolShare, 1e6);
        require(result <= getTotalUSDCValue(), "DNP: trying to withdraw more than pool contains");

        if (result > _depositAmount[_msgSender()]) {
            _depositAmount[_msgSender()] = 0;
        } else {
            _depositAmount[_msgSender()] -= result;
        }

        if (getReserve() < result) {
            _closePositionsForWithdrawal(getReserve(), result);
        }
        if (result>=currentCasualDeposits) {
            currentCasualDeposits = 0;
        }
        else {
            currentCasualDeposits -= result;
        }
        require(IdcToken(_dcToken).transferFrom(_msgSender(), address(this), amount), "DNP: dcToken transfer failed");
        IdcToken(_dcToken).burn(amount);

        require(IERC20(_usdToken).transfer(_msgSender(), result), "DNP: usdc transfer failed");
        emit USDCWithdrawn(_msgSender(), result);
    }


    function setDcToken(address dcToken_) public onlyOwner {
        _dcToken = dcToken_; // dCommas Pool Token
    }


    function setUsersMaxPoolSizeLimit(uint256 _newLimit) public onlyOwner {
        require(_newLimit != 0, "DNP: zero amount");
        maxUsersPoolSizeLimit = _newLimit;
    }


    function setMaxDaoPoolSizeLimit(uint256 _newLimit) public onlyOwner {
        require(_newLimit != 0, "DNP: zero amount");
        maxDaoListPoolSizeLimit = _newLimit;
    }

    function setDepositLimit(uint256 _newLimit) public onlyOwner {
        require(_newLimit != 0, "DNP: zero amount");
        _depositLimit = _newLimit;
    }


    function allowDeposit(address[] memory users, bool isDAO) public onlyOwner {
        if(isDAO) {
            for(uint256 i = 0; i<users.length; i++) {
                require(!_allowList[users[i]], "DNP: User already allowed");
                _daoMembersList[users[i]] = true;
                emit DepositAllowed(users[i]);
            }
        }
        else {
            for(uint i = 0; i < users.length; i++) {
                _allowList[users[i]] = true;
                emit DepositAllowed(users[i]);
            }
        }
    }


    // DEBUG
    function denyDeposit(address user, bool isDAO) public onlyOwner {
        if(isDAO) {
            _daoMembersList[user] = false;
        }
        else {
            _allowList[user] = false;
        }
    }


    function approveUSDC() external onlyTrigger {
        IERC20(_usdToken).approve(_router,
            115792089237316195423570985008687907853269984665640564039457584007913129639935);
        IERC20(_usdToken).approve(address(_perpVault),
            115792089237316195423570985008687907853269984665640564039457584007913129639935);
    }

    /**
    * @dev TriggerServer manipulate to position in Perpetual.ClearingHouse
    * @param operationType true for openPosition / false for closePosition
    * @param positionType true for shorting the base token asset, false for longing the base token asset
    * @param amount how USDC need for position
    * Can only be called by the current TriggerServer
    */
    function adjustPosition(bool operationType, bool positionType, uint256 amount) public onlyTrigger() {
        require(amount != 0, "DNP: zero amount");
        //        uint256 wTokenToReserveProportion = Math.mulDiv(_RESERVE_VALUE, 100, _W_TOKEN_VALUE);
        //        uint256 wTokenAmountUSDC = Math.mulDiv(IERC20(_wToken).balanceOf(address(this)),
        //                                                    _nativeStrategyTokenPrice(0), 1e30);
        // Shows how much USDC should be on reserve to maintain proportion
        //        uint256 strategyReserve = Math.mulDiv(wTokenAmountUSDC, wTokenToReserveProportion, 100);

        //        if (wTokenAmountUSDC > 0 && operationType && positionType) {
        //            require(getReserve() - amount <= strategyReserve, "DNP: Proportion break");
        //        }

        if (operationType) { // openPosition
            uint256 usdcAmount = _calculateAmountToPosition(amount, _SHORT_VALUE);
            /// short/buy wToken
            if(positionType) {
                require(getReserve() >= amount, "DNP: Insufficient reserve");
                _buyTokensToUniswap(_usdToken, _wToken, usdcAmount);
                _depositToVault(usdcAmount);
                _openPosition(usdcAmount * 1e12, positionType);
                emit PositionAdjusted(operationType,
                    positionType,
                    usdcAmount,
                    usdcAmount);
            } else {
                /// long/sell wToken
                if (Math.mulDiv(IERC20(_wToken).balanceOf(address(this)),
                    _nativeStrategyTokenPrice(0), 1e18) < usdcAmount) {
                    _fullClose();
                } else {
                    _sellTokensToUniswap(_wToken, _usdToken, usdcAmount,
                        IERC20(_wToken).balanceOf(address(this)));
                    _openPosition(usdcAmount, positionType);
                    _withdrawFromPerp(usdcAmount);
                    emit PositionAdjusted(operationType,
                        positionType,
                        usdcAmount,
                        usdcAmount);
                }
            }
        } else {
            _fullClose();
        }
    }


    function directClosePosition(uint256 amount) public onlyTrigger() {
        _closePosition(amount);
    }


    function directBuyTokensToUniswap(address tokenA, address tokenB, uint256 amount) public onlyTrigger() {
        _buyTokensToUniswap(tokenA, tokenB, amount);
    }


    function directWithdrawUSDCtoPerpVault(uint256 amount) public onlyTrigger() {
        _withdrawFromPerp(amount);
    }


    function directDepositToVault(uint256 amount) public onlyTrigger() {
        _depositToVault(amount);
    }


    function directOpenPosition(uint256 amount, bool position) public onlyTrigger() {
        _openPosition(amount, position);
    }


    // Migrate Contract funds to new address
    function migrate(address newContract) public onlyTrigger {
        maxUsersPoolSizeLimit = 0; //forbid to enter this pool
        maxDaoListPoolSizeLimit = 0;
        _fullClose();
        require(IERC20(_usdToken).transfer(newContract, IERC20(_usdToken).balanceOf(address(this))),
            "DNP: usdc transfer failed");
    }


    function getDepositLimit() public view returns(uint256) {
        return _depositLimit;
    }


    function getTotalUSDCValue() public view returns (uint256) {
        return _abs(_perp.getAccountValue(address(this))) / 1e12 +
        getReserve() +
        Math.mulDiv(IERC20(_wToken).balanceOf(address(this)),
            _nativeStrategyTokenPrice(0), 1e18);
    }


    /**
    * @dev returns linked token current price
    * @return price in USDC (1e6)
     */
    function getDCTokenPrice() public view returns (uint256) {
        if (IdcToken(_dcToken).totalSupply() == 0) {
            return 0;
        }
        return Math.mulDiv(getTotalUSDCValue(), 1e18, IdcToken(_dcToken).totalSupply());
    }


    function getReserve() public view returns (uint256) {
        return (IERC20(_usdToken).balanceOf(address(this)));
    }


    /**
    * @dev if funding rate is more than 1 => long positions pays to short
    * vise versa otherwise
    * @return fundingRate_10_6
     */
    function getCurrentFundingRate() public view returns (uint256) {
        uint256 dailyMarketTwap = getDailyMarketTwap() / 1e12;
        uint256 dailyIndexTwap = _nativeStrategyTokenPrice(60 * 60); // 1 hour

        return Math.mulDiv(dailyMarketTwap, 1e6, dailyIndexTwap);
    }


    /// DEBUG
    function getDailyMarketTwap() public view returns(uint256) {
        uint160 dailyMarketTwap160X96 = IExchange(_perp.getExchange()).getSqrtMarkTwapX96(_vToken, 60 * 60 * 1);
        uint256 dailyMarketTwapX96 = Math.formatSqrtPriceX96ToPriceX96(dailyMarketTwap160X96);
        return Math.formatX96ToX10_18(dailyMarketTwapX96);
    }


    /// DEBUG
    function availableDeposit(address user) public view returns(uint256) {
        return _depositLimit - _depositAmount[user];
    }


    /// DEBUG
    function isAllowedToDeposit(address user) public view returns(bool) {
        return _allowList[user];
    }


    function _fullClose() private {
        _closePosition(0);
        _withdrawFromPerp(_perpVault.getFreeCollateral(address(this)));
        if (IERC20(_wToken).balanceOf(address(this)) > 0) {
            _buyTokensToUniswap(_wToken, _usdToken, IERC20(_wToken).balanceOf(address(this)));
        }
        emit PositionAdjusted(false, false, IERC20(_usdToken).balanceOf(address(this)), 0);
    }


    function _depositToVault(uint256 amount) private {
        require(amount != 0, "DNP: zero amount");
        //deposit to AccountBalance
        _perpVault.deposit(_usdToken, amount);
    }


    function _closePositionsForWithdrawal(uint256 reserve, uint256 toWithdraw) private {
        uint256 toClose = toWithdraw - reserve;
        toClose = (toClose + toClose / 10) / 2; // add 10% and take a half to close both positions
        uint256 wTokenAmount = Math.mulDiv(toClose, 1e18, _nativeStrategyTokenPrice(0));

        if (wTokenAmount > IERC20(_wToken).balanceOf(address(this))) {
            _fullClose();
        } else {
            _sellTokensToUniswap(_wToken, _usdToken, toClose, wTokenAmount);
            _openPosition(wTokenAmount, false);
            _withdrawFromPerp(toClose);
        }
    }


    function _withdrawFromPerp(uint256 amount) private {
        _perpVault.withdraw(_usdToken, amount);
    }


    /**
       * @dev amount should be in 1e18
    */
    function _openPosition(uint256 amount, bool positionType) private returns (bool) {
        // use positionType for isBaseToQuote(true = short, false = long), isExactInput (),  amount ()
        // Open Perp position
        _perp.openPosition(
            IClearingHouse.OpenPositionParams({
        baseToken : _vToken,
        isBaseToQuote : positionType, //true for shorting the baseTokenAsset, false for long the baseTokenAsset
        isExactInput : false, // for specifying exactInput or exactOutput ; similar to UniSwap V2's specs
        amount : amount, // Depending on the isExactInput param, this can be either the input or output
        oppositeAmountBound : 0,
        deadline : block.timestamp + _deadlineTime,
        sqrtPriceLimitX96 : _sqrtPriceLimitX96toUni,
        referralCode : 0x0000000000000000000000000000000000000000000000000000000000000000
        })
        );
        return true;
    }


    /**
    * @dev Close full position in Perpetual
  */
    function _closePosition(uint256 _amount) private returns (bool) {
        _perp.closePosition(
            IClearingHouse.ClosePositionParams({
        baseToken : _vToken,
        sqrtPriceLimitX96 : _sqrtPriceLimitX96toUni,
        oppositeAmountBound : _amount,
        deadline : block.timestamp + _deadlineTime,
        referralCode : 0x0000000000000000000000000000000000000000000000000000000000000000
        })
        );
        return true;
    }


    function _nativeStrategyTokenPrice(uint256 interval) private view returns (uint256) { // wBTC, wETH or other
        return IIndexPrice(_vToken).getIndexPrice(interval) / 1e12;
    }


    function _abs(int256 value) private pure returns(uint256) {
        return value >= 0 ? uint256(value) : uint256(-value);
    }


    function _calculateAmountToPosition(uint256 amount, uint256 share) private pure returns (uint256) {
        return (amount * share) / 100;
    }
}
