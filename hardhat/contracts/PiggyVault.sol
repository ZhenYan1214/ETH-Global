// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC4626Extended is IERC20 {
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);
}

contract PiggyVault is ERC4626, Ownable, ReentrancyGuard {
    IERC4626Extended public yearnVault;
    IERC20 public usdc;

    struct UserInfo {
        uint256 deposited;
        uint256 shares;
        uint256 pending;
        uint256 lastUpdateTime;
    }
    mapping(address => UserInfo) public userInfo;

    uint256 public totalPendingUSDC;
    uint256 public yearnSharesBalance;
    uint256 public lastPendingInvestedTime;

    uint256 public performanceFee = 10; // 10%
    uint256 public maxGasPrice = 100 gwei;
    uint256 public totalDeposited;
    uint256 public accumulatedFees;

    address public admin;

    event Invested(address indexed user, uint256 usdcAmount, uint256 yearnShares);
    event Divested(uint256 amount);
    event FeeWithdrawn(address to, uint256 amount);

    constructor(address _initialOwner, address _usdc, address _yearnVault)
        ERC20("PiggyShare", "PSHARE")
        ERC4626(IERC20(_usdc))
        Ownable(_initialOwner)
    {
        usdc = IERC20(_usdc);
        yearnVault = IERC4626Extended(_yearnVault);
        usdc.approve(address(yearnVault), type(uint256).max);
        transferOwnership(_initialOwner);
    }

    modifier gasGuard() {
        require(tx.gasprice <= maxGasPrice, "Gas price too high");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin call");
        _;
    }

    function _updateUserPending(address userAddr) internal {
        if (userInfo[userAddr].lastUpdateTime < lastPendingInvestedTime) {
            userInfo[userAddr].pending = 0;
            userInfo[userAddr].lastUpdateTime = block.timestamp;
        }
    }

    function totalAssets() public view override returns (uint256) {
        return yearnVault.convertToAssets(yearnSharesBalance) + totalPendingUSDC;
    }

    function deposit(uint256 assets, address receiver) public override nonReentrant gasGuard returns (uint256) {
        require(assets > 0, "Zero deposit");

        usdc.transferFrom(msg.sender, address(this), assets);
        uint256 shares = convertToShares(assets);
        require(shares > 0, "Zero shares");

        _mint(receiver, shares);

        UserInfo storage user = userInfo[receiver];
        _updateUserPending(receiver);

        uint256 prevValue = user.deposited * user.shares;
        uint256 newValue = assets * shares;
        uint256 totalShares = user.shares + shares;

        if (totalShares > 0) {
            user.deposited = (prevValue + newValue) / totalShares;
        }

        user.shares += shares;
        user.pending += shares;
        user.lastUpdateTime = block.timestamp;

        totalDeposited += assets;
        totalPendingUSDC += assets;

        emit Deposit(msg.sender, receiver, assets, shares);
        return shares;
    }

    function depositAll(address receiver) public nonReentrant gasGuard returns (uint256) {
        uint256 balance = usdc.balanceOf(msg.sender);
        return deposit(balance, receiver);
    }

    function invest() public nonReentrant {
        require(totalPendingUSDC > 0, "Nothing to invest");

        uint256 amountInvested = totalPendingUSDC;
        uint256 sharesReceived = yearnVault.deposit(amountInvested, address(this));
        yearnSharesBalance += sharesReceived;
        totalPendingUSDC = 0;
        lastPendingInvestedTime = block.timestamp;

        emit Invested(msg.sender, amountInvested, sharesReceived);
    }

    function redeem(uint256 shares, address receiver, address owner) public override nonReentrant gasGuard returns (uint256) {
        UserInfo storage user = userInfo[owner];
        require(user.shares >= shares, "Insufficient user shares");

        _updateUserPending(owner);

        uint256 pendingShares = user.pending >= shares ? shares : user.pending;
        uint256 vaultShares = shares - pendingShares;

        uint256 assetsFromPending = convertToAssets(pendingShares);
        uint256 assetsFromVault = 0;

        if (vaultShares > 0) {
            require(yearnSharesBalance >= vaultShares, "Vault shares insufficient");
            assetsFromVault = yearnVault.redeem(vaultShares, address(this), address(this));
            yearnSharesBalance -= vaultShares;
        }

        uint256 totalAssetsOut = assetsFromPending + assetsFromVault;
        uint256 cost = (user.shares > 0) ? (user.deposited * shares / user.shares) : 0;
        uint256 gain = totalAssetsOut > cost ? totalAssetsOut - cost : 0;
        uint256 fee = (gain * performanceFee) / 100;
        uint256 finalAmount = totalAssetsOut - fee;

        user.shares -= shares;
        user.pending -= pendingShares;
        user.deposited -= cost;

        _burn(owner, shares);
        accumulatedFees += fee;
        usdc.transfer(receiver, finalAmount);

        emit Divested(finalAmount);
        return totalAssetsOut;
    }

    function redeemPending(uint256 shares) external nonReentrant gasGuard returns (uint256) {
        UserInfo storage user = userInfo[msg.sender];
        _updateUserPending(msg.sender);
        require(user.pending >= shares, "Insufficient pending");

        uint256 assets = convertToAssets(shares);
        uint256 cost = (user.shares > 0) ? (user.deposited * shares / user.shares) : 0;

        user.shares -= shares;
        user.pending -= shares;
        user.deposited -= cost;

        _burn(msg.sender, shares);
        usdc.transfer(msg.sender, assets);

        emit Divested(assets);
        return assets;
    }

    function redeemInvested(uint256 shares) external nonReentrant gasGuard returns (uint256) {
        UserInfo storage user = userInfo[msg.sender];
        _updateUserPending(msg.sender);

        uint256 invested = user.shares - user.pending;
        require(invested >= shares, "Not enough invested shares");

        uint256 assets = yearnVault.redeem(shares, address(this), address(this));
        yearnSharesBalance -= shares;

        uint256 cost = (user.shares > 0) ? (user.deposited * shares / user.shares) : 0;
        uint256 gain = assets > cost ? assets - cost : 0;
        uint256 fee = (gain * performanceFee) / 100;
        uint256 finalAmount = assets - fee;

        user.shares -= shares;
        user.deposited -= cost;

        _burn(msg.sender, shares);
        accumulatedFees += fee;
        usdc.transfer(msg.sender, finalAmount);

        emit Divested(finalAmount);
        return assets;
    }

    function withdrawAccumulatedFees(address receiver) external {
        require(msg.sender == owner() || msg.sender == admin, "Not authorized");
        require(accumulatedFees > 0, "No fees");

        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        usdc.transfer(receiver, amount);

        emit FeeWithdrawn(receiver, amount);
    }

    function isPendingStale(address user) external view returns (bool) {
        return userInfo[user].pending > 0 && userInfo[user].lastUpdateTime < lastPendingInvestedTime;
    }

    function previewUserPendingAndInvestedAssets(address user) external view returns (uint256 pendingAssets, uint256 investedAssets) {
        UserInfo storage u = userInfo[user];
        uint256 effectivePending = (u.lastUpdateTime < lastPendingInvestedTime) ? 0 : u.pending;
        uint256 investedShares = u.shares - effectivePending;

        pendingAssets = convertToAssets(effectivePending);
        investedAssets = convertToAssets(investedShares);
    }

    function previewRedeemValue(address userAddr) external view returns (uint256) {
        UserInfo storage user = userInfo[userAddr];
        uint256 assets = convertToAssets(user.shares);
        uint256 originalCost = user.deposited;
        uint256 gain = assets > originalCost ? assets - originalCost : 0;
        uint256 fee = (gain * performanceFee) / 100;
        return assets - fee;
    }


    function setPerformanceFee(uint256 newFee) external onlyAdmin {
        require(newFee <= 100, "Fee too high");
        performanceFee = newFee;
    }

    function setMaxGasPrice(uint256 newGasPrice) external onlyAdmin {
        maxGasPrice = newGasPrice;
    }

    function setAdmin(address newAdmin) external onlyOwner {
        admin = newAdmin;
    }

    function setUSDCAddress(address _usdc) external onlyAdmin {
        usdc = IERC20(_usdc);
    }

    function setYearnVaultAddress(address _yearnVault) external onlyAdmin {
        yearnVault = IERC4626Extended(_yearnVault);
    }
}
