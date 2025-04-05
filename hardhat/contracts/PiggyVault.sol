// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// -------------------------------------------
// OpenZeppelin 依賴
// -------------------------------------------
// ERC4626: 用於建立有資產(USDC)對應倉庫份額的標準化抽象
// Ownable: 提供簡易的Owner權限管理
// ReentrancyGuard: 防止函式間重入攻擊
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// -------------------------------------------
// Yearn Vault 介面
// -------------------------------------------
// 遵循 ERC4626Extended 介面，可進行 deposit / redeem
// 並查詢 share / asset 之間的轉換
interface IERC4626Extended is IERC20 {
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);
}

/**
 * @title PiggyVault
 * @dev 這是一個將 USDC 存入 Yearn Vault 的二次封裝合約，支援 pending 狀態與已投資狀態的 shares 管理
 * 
 * 功能重點：
 * 1. deposit / depositAndInvest：使用者存入 USDC，分別處理「只存不投資 (pending)」或「立即投資」。
 * 2. invest：可一次性將整個池子的 pending USDC 全部投到 Yearn。
 * 3. redeem：支援同時贖回 pending + invested 的 shares。
 * 4. redeemPending / redeemInvested：可分別只贖回尚未投資的 shares 或已投資的 shares。
 * 5. fee 機制：計算收益後抽成 performanceFee。累積於 accumulatedFees，可由 withdrawAccumulatedFees() 提領。
 */
contract PiggyVault is ERC4626, Ownable, ReentrancyGuard {
    // -------------------------------------------
    // 公開狀態：Yearn 與 USDC
    // -------------------------------------------
    IERC4626Extended public yearnVault; // 目標 Yearn Vault 合約
    IERC20 public usdc;                // 主要資產（USDC）

    // -------------------------------------------
    // 使用者資訊結構
    // -------------------------------------------
    struct UserInfo {
        uint256 deposited;      // 以"每股成本"的方式記錄使用者的加權平均成本 (USDC per share)
        uint256 shares;         // 該使用者持有的 piggyVault shares (總量)
        uint256 pending;        // 其中多少 share 還未投資 (pending 狀態)
        uint256 lastUpdateTime; // 上一次操作/更新時間 (用於 lazy 清除 pending)
    }
    // 每個使用者地址對應的資料
    mapping(address => UserInfo) public userInfo;

    // -------------------------------------------
    // 最小改動: 比例法 用到的全域變數
    // -------------------------------------------
    // totalPendingPiggyShares: 全池累計的「尚未投資」的 share 數量
    uint256 public totalPendingPiggyShares;
    // investedPiggyShares: 全池累計「已投資」的 share 數量
    uint256 public investedPiggyShares;
    // yearnSharesBalance: Vault 目前在 YearnVault 中持有多少 yearn share
    uint256 public yearnSharesBalance;
    // totalPendingUSDC: 全池尚未投資的 USDC
    uint256 public totalPendingUSDC;
    // lastPendingInvestedTime: 最後一次將 pending 投資後的時間，若使用者 pending 早於此時間，會被視作 stale
    uint256 public lastPendingInvestedTime;

    // -------------------------------------------
    // 其他參數
    // -------------------------------------------
    uint256 public performanceFee = 10; // 10% 的收益抽成
    uint256 public maxGasPrice = 100 gwei; // 避免用戶在極端gas下做交易
    uint256 public totalDeposited; // 歷史上總共存進來多少 USDC
    uint256 public accumulatedFees; // 累積的抽成費用

    address public admin; // 管理員 (非Owner 但可設定部分參數)

    // -------------------------------------------
    // 事件
    // -------------------------------------------
    event Invested(address indexed user, uint256 usdcAmount, uint256 yearnShares);
    event Divested(uint256 amount);
    event FeeWithdrawn(address to, uint256 amount);
    event DepositAndInvest(address indexed user, uint256 assetsIn, uint256 mintedPiggyShares, uint256 yearnSharesOut);

    /**
     * @dev 建構函式
     * @param _initialOwner 初始化的 owner，通常為部署者或多簽地址
     * @param _usdc USDC token 合約地址
     * @param _yearnVault 目標 Yearn Vault 地址
     */
    constructor(address _initialOwner, address _usdc, address _yearnVault)
        ERC20("PiggyShare", "PSHARE")           // name, symbol
        ERC4626(IERC20(_usdc))                 // asset = USDC
        Ownable(_initialOwner)                 // 設置Owner
    {
        transferOwnership(_initialOwner);       // 明確指定 owner
        usdc = IERC20(_usdc);
        yearnVault = IERC4626Extended(_yearnVault);

        // 預先把 Vault 的 USDC 全額度授權給 yearnVault
        usdc.approve(address(yearnVault), type(uint256).max);
    }

    // -------------------------------------------
    // 修飾器
    // -------------------------------------------
    modifier gasGuard() {
        require(tx.gasprice <= maxGasPrice, "Gas price too high");
        _;
    }
    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin call");
        _;
    }

    // -------------------------------------------
    // (1) 將 deposit 的核心邏輯抽成 internal: _depositInternal()
    // -------------------------------------------
    /**
     * @dev 實際的存款邏輯，不加 nonReentrant 以便被其他函式組合調用
     * @param assets USDC 數量
     * @param receiver 接收 share 的地址
     */
    function _depositInternal(uint256 assets, address receiver) internal returns (uint256) {
        require(assets > 0, "Zero deposit");

        // 1. transferFrom 收取 USDC
        usdc.transferFrom(msg.sender, address(this), assets);

        // 2. 計算要鑄造多少 Vault share (依照 convertToShares)
        uint256 shares = convertToShares(assets);
        require(shares > 0, "Zero shares");

        // 3. mint share 給 receiver
        _mint(receiver, shares);

        // 4. 更新使用者資訊
        UserInfo storage user = userInfo[receiver];
        _updateUserPending(receiver); // lazy 清除

        // (A) 加權平均成本：newValue = assets; prevValue = user.deposited * user.shares
        uint256 prevValue = user.deposited * user.shares;
        uint256 newValue = assets;
        uint256 totalShares = user.shares + shares;
        if (totalShares > 0) {
            user.deposited = (prevValue + newValue) / totalShares;
        }

        user.shares += shares;
        user.pending += shares; 
        user.lastUpdateTime = block.timestamp;

        // 5. 全域 pending 計數
        totalPendingPiggyShares += shares;
        totalPendingUSDC += assets;
        totalDeposited += assets;

        // 6. 觸發事件
        emit Deposit(msg.sender, receiver, assets, shares);
        return shares;
    }

    // -------------------------------------------
    // (2) deposit(): 外部函式, 帶 nonReentrant
    // -------------------------------------------
    /**
     * @dev 使用者存 USDC 進 Vault (pending)，不會馬上投資
     * @param assets 存款金額 (USDC)
     * @param receiver 誰能收到對應 share
     */
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        gasGuard
        returns (uint256)
    {
        return _depositInternal(assets, receiver);
    }

    /**
     * @dev 可選：一次把 msg.sender 的 USDC 全部存進 Vault
     */
    function depositAll(address receiver)
        public
        nonReentrant
        gasGuard
        returns (uint256)
    {
        uint256 balance = usdc.balanceOf(msg.sender);
        return deposit(balance, receiver);
    }

    // -------------------------------------------
    // (3) depositAndInvest(): 一次存款 + 投資
    // -------------------------------------------
    /**
     * @dev 一次性把這筆 USDC 存入 & 立刻投資
     *      (不會動到其他人的 pending)
     */
    function depositAndInvest(uint256 assets, address receiver)
    external
    nonReentrant
    gasGuard
    returns (uint256)
{
    require(assets > 0, "Zero deposit");

    // 1) 從 msg.sender 收取 USDC
    usdc.transferFrom(msg.sender, address(this), assets);

    // 2) 用 convertToShares 計算要鑄造多少 piggyVault share
    uint256 shares = convertToShares(assets);
    require(shares > 0, "Zero shares");

    // 3) 鑄造 piggyVault share 給 receiver
    _mint(receiver, shares);

    // 4) 更新使用者資訊 (加權平均成本 / user.shares)
    UserInfo storage user = userInfo[receiver];
    _updateUserPending(receiver); // 可留著確保若有 stale pending 就清理

    uint256 prevValue = user.deposited * user.shares; 
    uint256 newValue = assets;                      
    uint256 totalShares = user.shares + shares;
    if (totalShares > 0) {
        user.deposited = (prevValue + newValue) / totalShares;
    }

    // 只增加 user.shares，但不增加 user.pending
    user.shares += shares;
    user.lastUpdateTime = block.timestamp;

    // ★ 不動 totalPendingPiggyShares / totalPendingUSDC
    //   因為這筆 USDC 不是要留在 pending 狀態

    // 作為統計記錄可保留
    totalDeposited += assets;

    // 5) 直接將這筆 USDC 投入 Yearn
    uint256 yearnSharesOut = yearnVault.deposit(assets, address(this));
    yearnSharesBalance += yearnSharesOut;

    // 6) piggyVault share 轉為 invested
    investedPiggyShares += shares;

    // 7) 事件
    emit Invested(msg.sender, assets, yearnSharesOut);
    emit DepositAndInvest(receiver, assets, shares, yearnSharesOut);

    return shares;
}


    // -------------------------------------------
    // (4) invest(): 把整池 pending USDC 全投進 Yearn
    // -------------------------------------------
    function invest() public nonReentrant {
        require(totalPendingUSDC > 0, "Nothing to invest");

        // 1. 把 totalPendingUSDC 全數轉去 yearnVault
        uint256 amountInvested = totalPendingUSDC;
        uint256 sharesReceived = yearnVault.deposit(amountInvested, address(this));
        yearnSharesBalance += sharesReceived;

        // 2. 把全域 pending piggyShares 移到 invested
        investedPiggyShares += totalPendingPiggyShares;
        totalPendingPiggyShares = 0;
        totalPendingUSDC = 0;
        lastPendingInvestedTime = block.timestamp;

        emit Invested(msg.sender, amountInvested, sharesReceived);
    }

    // -------------------------------------------
    // (5) redeem(): 一次贖回 => 同時處理 pending + invested
    // -------------------------------------------
    /**
     * @dev 若使用者要贖回 shares，會優先從 pending shares 扣，若不夠再從 invested shares 扣
     * @param shares 要贖回的 piggyVault share 數量
     * @param receiver 收款人地址
     * @param owner 誰的 share 要被贖回
     */
    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        gasGuard
        returns (uint256)
    {
        UserInfo storage user = userInfo[owner];
        require(user.shares >= shares, "Insufficient user shares");

        // 檢查是否 stale pending
        _updateUserPending(owner);

        // 1. 從 pendingShares 扣
        uint256 pendingShares = user.pending >= shares ? shares : user.pending;
        // 2. 若仍不足，再從 investedShares 裏面扣
        uint256 vaultShares = shares - pendingShares;

        // 3. 分別計算：pending 對應多少 USDC，invested 對應多少 USDC
        uint256 assetsFromPending = convertToAssets(pendingShares);
        uint256 assetsFromVault = 0;

        // 若有扣到 pending
        if (pendingShares > 0) {
            user.pending -= pendingShares;
            totalPendingPiggyShares -= pendingShares;
            // ★ 同步扣除對應的 totalPendingUSDC
            totalPendingUSDC -= assetsFromPending;
        }

        // 若要從 invested 贖回
        if (vaultShares > 0) {
            require(investedPiggyShares >= vaultShares, "Invested shares insufficient");

            // 計算對應多少 yearn share
            uint256 yearnSharesToRedeem = (vaultShares * yearnSharesBalance) / investedPiggyShares;
            require(yearnSharesToRedeem <= yearnSharesBalance, "Vault shares insufficient");

            // 和 yearn 互動
            assetsFromVault = yearnVault.redeem(yearnSharesToRedeem, address(this), address(this));

            // 更新比例
            yearnSharesBalance -= yearnSharesToRedeem;
            investedPiggyShares -= vaultShares;
        }

        // 4. 合計贖回金額
        uint256 totalAssetsOut = assetsFromPending + assetsFromVault;

        // 5. 計算成本、收益、抽成
        uint256 cost = (user.shares > 0)
            ? (user.deposited * shares / user.shares)
            : 0;
        uint256 gain = totalAssetsOut > cost ? (totalAssetsOut - cost) : 0;
        uint256 fee = (gain * performanceFee) / 100;
        uint256 finalAmount = totalAssetsOut - fee;

        // 6. 更新 user.shares / deposited
        user.shares -= shares;
        user.deposited -= cost;

        // 燒毀 piggyVault share
        _burn(owner, shares);

        // 把費用累加到 accumulatedFees
        accumulatedFees += fee;
        // 把剩餘的 USDC 轉給使用者
        usdc.transfer(receiver, finalAmount);

        emit Divested(finalAmount);
        return totalAssetsOut;
    }

    // -------------------------------------------
    // (6) redeemPending(): 只贖回使用者 pending 份額
    // -------------------------------------------
    /**
     * @dev 使用者若只想贖回未投資的 shares，可呼叫此函式
     * @param shares 要贖回的 pending share 數量
     */
    function redeemPending(uint256 shares)
        external
        nonReentrant
        gasGuard
        returns (uint256)
    {
        UserInfo storage user = userInfo[msg.sender];
        _updateUserPending(msg.sender);
        require(user.pending >= shares, "Insufficient pending");

        // 1. 對應 USDC
        uint256 assets = convertToAssets(shares);

        // 2. 計算成本 cost，做 clamp 避免下溢
        uint256 cost = 0;
        if (user.shares > 0) {
            cost = (user.deposited * shares) / user.shares;
            // 若計算結果大於 user.deposited，就壓回
            if (cost > user.deposited) {
                cost = user.deposited;
            }
        }

        // 3. 更新使用者資訊
        user.shares -= shares;
        user.pending -= shares;
        user.deposited -= cost;

        // 4. 從全域 pending扣除 share 和對應USDC
        totalPendingPiggyShares -= shares;
        totalPendingUSDC -= assets;

        // 5. 燒毀 share & 轉出 USDC
        _burn(msg.sender, shares);
        usdc.transfer(msg.sender, assets);

        emit Divested(assets);
        return assets;
    }

    // -------------------------------------------
    // (7) redeemInvested(): 只贖回使用者已投資份額
    // -------------------------------------------
    /**
     * @dev 使用者若只想贖回已投資的 shares，可呼叫此函式
     * @param shares 要贖回的 invested share 數量
     */
    function redeemInvested(uint256 shares)
        external
        nonReentrant
        gasGuard
        returns (uint256)
    {
        UserInfo storage user = userInfo[msg.sender];
        _updateUserPending(msg.sender);

        // 1. 計算使用者「已投資」的 share 數量
        uint256 invested = user.shares - user.pending;
        require(invested >= shares, "Not enough invested shares");
        require(investedPiggyShares >= shares, "Invested shares insufficient");

        // 2. yearn share 按比例計算
        uint256 yearnSharesToRedeem = (shares * yearnSharesBalance) / investedPiggyShares;
        require(yearnSharesToRedeem <= yearnSharesBalance, "Vault shares insufficient");

        // 3. 從 Yearn 取回 USDC
        uint256 assets = yearnVault.redeem(yearnSharesToRedeem, address(this), address(this));
        yearnSharesBalance -= yearnSharesToRedeem;
        investedPiggyShares -= shares;

        // 4. 計算 cost / gain / fee
        uint256 cost = (user.shares > 0) ? (user.deposited * shares / user.shares) : 0;
        uint256 gain = (assets > cost) ? (assets - cost) : 0;
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

    // -------------------------------------------
    // 權限操作
    // -------------------------------------------
    /**
     * @dev 提領合約抽成累積的費用
     * @param receiver 接收這筆 fee 的地址 (多半是Owner或指定收費帳戶)
     */
    function withdrawAccumulatedFees(address receiver) external {
        require(msg.sender == owner() || msg.sender == admin, "Not authorized");
        require(accumulatedFees > 0, "No fees");

        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        usdc.transfer(receiver, amount);

        emit FeeWithdrawn(receiver, amount);
    }

    /**
     * @dev 設定 performanceFee 百分比, 最高 100%
     */
    function setPerformanceFee(uint256 newFee) external onlyAdmin {
        require(newFee <= 100, "Fee too high");
        performanceFee = newFee;
    }

    /**
     * @dev 設定 maxGasPrice
     */
    function setMaxGasPrice(uint256 newGasPrice) external onlyAdmin {
        maxGasPrice = newGasPrice;
    }

    /**
     * @dev 設定 admin
     */
    function setAdmin(address newAdmin) external onlyOwner {
        admin = newAdmin;
    }

    /**
     * @dev 可替換合約所使用的 USDC 地址 (需要 admin 權限)
     */
    function setUSDCAddress(address _usdc) external onlyAdmin {
        usdc = IERC20(_usdc);
    }

    /**
     * @dev 可替換目標 Yearn Vault (需要 admin 權限)
     *      並重新對新 Vault 做最大額度 approve
     */
    function setYearnVaultAddress(address _yearnVault) external onlyAdmin {
        yearnVault = IERC4626Extended(_yearnVault);
        usdc.approve(_yearnVault, type(uint256).max);
    }

    // -------------------------------------------
    // 檢視輔助函式
    // -------------------------------------------

    /**
     * @dev internal: 若使用者的 pending 早於 lastPendingInvestedTime, 則自動視為 0
     */
    function _updateUserPending(address userAddr) internal {
        if (userInfo[userAddr].lastUpdateTime < lastPendingInvestedTime) {
            // stale pending 視為已投資
            userInfo[userAddr].pending = 0;
            userInfo[userAddr].lastUpdateTime = block.timestamp;
        }
    }

    /**
     * @dev 覆寫 ERC4626 的 totalAssets()
     *      Yearn 裏面的 + 尚未投資的 USDC 總和
     */
    function totalAssets() public view override returns (uint256) {
        return yearnVault.convertToAssets(yearnSharesBalance) + totalPendingUSDC;
    }

    /**
     * @dev 查詢使用者 pending 是否已過期 (在上次 invest() 之前)
     */
    function isPendingStale(address user) external view returns (bool) {
        return (
            userInfo[user].pending > 0 &&
            userInfo[user].lastUpdateTime < lastPendingInvestedTime
        );
    }

    /**
     * @dev 預覽使用者「pending」與「invested」roughly 轉換成多少 USDC (僅用 convertToAssets)
     * @param user 使用者地址
     * @return pendingAssets 未投資(pending)可對應的 USDC
     * @return investedAssets 已投資(invested)可對應的 USDC
     */
    function previewUserPendingAndInvestedAssets(address user)
        external
        view
        returns (uint256 pendingAssets, uint256 investedAssets)
    {
        UserInfo storage u = userInfo[user];
        uint256 effectivePending = (u.lastUpdateTime < lastPendingInvestedTime)
            ? 0
            : u.pending;
        uint256 investedSharesOfUser = u.shares - effectivePending;

        pendingAssets = convertToAssets(effectivePending);
        investedAssets = convertToAssets(investedSharesOfUser);
    }

    /**
     * @dev 預覽整體贖回可拿多少 (大略計算，未必與最終 Yearn 調用相同)
     */
    function previewRedeemValue(address userAddr) external view returns (uint256) {
        UserInfo storage user = userInfo[userAddr];
        uint256 assets = convertToAssets(user.shares);
        uint256 originalCost = user.deposited;
        uint256 gain = (assets > originalCost) ? (assets - originalCost) : 0;
        uint256 fee = (gain * performanceFee) / 100;
        return assets - fee;
    }

    // -------------------------------------------
    // 測試用：允許合約收 ETH & 提 ETH (可自行刪除)
    // -------------------------------------------
    receive() external payable {}
    function withdrawTestETH(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Not enough ETH");
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdraw ETH failed");
    }
}
