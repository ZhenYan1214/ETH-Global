const hre = require("hardhat");
const { ethers } = hre;

// 測試時請確認以下地址為你在本地 or 測試網要使用的合約
const WETH_ADDRESS   = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS   = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const YEARN_VAULT    = "0xBe53A109B494E5c9f97b9Cd39Fe969BE68BF6204";
const POOL_FEE = 500;

// ----------------------------------------------
// 幫助函式：印出當前狀態 (Vault & 使用者) 以做排查
// ----------------------------------------------
async function logVaultState(title, vault, usdc, deployerAddr) {
  const vaultAddr = await vault.getAddress();

  // Vault & User USDC 餘額
  const vaultUsdcBal = await usdc.balanceOf(vaultAddr);
  const userUsdcBal  = await usdc.balanceOf(deployerAddr);

  // Vault 全域狀態
  const totalPendingUSDC = await vault.totalPendingUSDC();
  const totalPendingPiggy = await vault.totalPendingPiggyShares();
  const investedPiggy = await vault.investedPiggyShares();
  const yearnSharesBal = await vault.yearnSharesBalance();

  // 使用者 info
  const userVaultShares = await vault.balanceOf(deployerAddr);
  // struct UserInfo { deposited, shares, pending, lastUpdateTime }
  const userInfo = await vault.userInfo(deployerAddr);
  // ethers v6 讀 struct: userInfo[0], userInfo[1], ...

  console.log(`\n[${title}] State:`);
  console.log(`Vault USDC:         ${ethers.formatUnits(vaultUsdcBal, 6)}`);
  console.log(`User  USDC:         ${ethers.formatUnits(userUsdcBal, 6)}`);
  console.log(`totalPendingUSDC:   ${ethers.formatUnits(totalPendingUSDC, 6)}`);
  console.log(`totalPendingPiggy:  ${ethers.formatUnits(totalPendingPiggy, 6)}`);
  console.log(`investedPiggy:      ${ethers.formatUnits(investedPiggy, 6)}`);
  console.log(`yearnSharesBalance: ${ethers.formatUnits(yearnSharesBal, 6)}`);
  console.log(`User Vault shares:  ${ethers.formatUnits(userVaultShares, 6)}`);

  console.log(`UserInfo.deposited: ${ethers.formatUnits(userInfo.deposited, 6)}`);
  console.log(`UserInfo.shares:    ${ethers.formatUnits(userInfo.shares, 6)}`);
  console.log(`UserInfo.pending:   ${ethers.formatUnits(userInfo.pending, 6)}`);
  console.log(`UserInfo.lastUpdate:${userInfo.lastUpdateTime}`);
  console.log("----------------------------------------------------\n");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running as:", deployer.address);

  // ------------------------------------------------
  // 1) 部署合約：SwapETHForUSDC
  // ------------------------------------------------
  const SwapETHForUSDC = await ethers.getContractFactory("SwapETHForUSDC");
  const swapContract = await SwapETHForUSDC.deploy(USDC_ADDRESS);
  await swapContract.waitForDeployment();
  const swapAddress = await swapContract.getAddress();
  console.log("SwapETHForUSDC deployed at:", swapAddress);

  // ------------------------------------------------
  // 2) 部署新的 PiggyVault
  //    (需保證包含 depositAndInvest, redeemPending, redeemInvested 等函式)
  // ------------------------------------------------
  const PiggyVault = await ethers.getContractFactory("PiggyVault");
  const vault = await PiggyVault.deploy(
    deployer.address, // _initialOwner
    USDC_ADDRESS,     // _usdc
    YEARN_VAULT       // _yearnVault
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("PiggyVault deployed at:", vaultAddress);

  // 讀取 WETH / Router code length 以確認
  const wethCode = await ethers.provider.getCode(WETH_ADDRESS);
  const routerCode = await ethers.provider.getCode(UNISWAP_ROUTER);
  console.log("WETH contract code length:", wethCode.length);
  console.log("Uniswap Router code length:", routerCode.length);

  // 取得 USDC ERC20 物件
  const usdc = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    USDC_ADDRESS,
    deployer
  );

  // ------------------------------------------------
  // (A) 測試「分段流程」：swap -> deposit -> invest
  // ------------------------------------------------
  console.log("\n=== (A) Test '分段流程' ===");
  const oneETH = ethers.parseEther("1");

  // 1. Swap 1 ETH → USDC
  const txSwapA = await swapContract.swapEthForUsdc(
    WETH_ADDRESS,
    UNISWAP_ROUTER,
    oneETH,
    0,
    POOL_FEE,
    { value: oneETH }
  );
  await txSwapA.wait();
  console.log("✅ Swapped 1 ETH → USDC (分段)");

  // 2. deployer 的真實 USDC
  const usdcBalanceA = await usdc.balanceOf(deployer.address);
  console.log("User real USDC after swap (A):", ethers.formatUnits(usdcBalanceA, 6));

  // 3. Approve Vault
  await usdc.approve(vaultAddress, ethers.MaxUint256);
  console.log("✅ Approved USDC to vault (A)");

  // 4. Deposit
  const depositTxA = await vault.deposit(usdcBalanceA, deployer.address);
  await depositTxA.wait();
  console.log("✅ Deposited USDC into vault (pending) (A)");

  // 4.1 印出狀態
  await logVaultState("After deposit(A)", vault, usdc, deployer.address);

  // 5. invest
  const investTxA = await vault.invest();
  await investTxA.wait();
  console.log("✅ Invested pending USDC into Yearn (A)");

  // 5.1 再印出狀態
  await logVaultState("After invest(A)", vault, usdc, deployer.address);

  // 6. Vault share
  const sharesA = await vault.balanceOf(deployer.address);
  console.log("Vault shares (A after invest):", ethers.formatUnits(sharesA, 6));

  // ------------------------------------------------
  // (B) 一鍵流程：swap -> depositAndInvest
  // ------------------------------------------------
  console.log("\n=== (B) Test '一鍵流程' => depositAndInvest ===");
  const txSwapB = await swapContract.swapEthForUsdc(
    WETH_ADDRESS,
    UNISWAP_ROUTER,
    oneETH,
    0,
    POOL_FEE,
    { value: oneETH }
  );
  await txSwapB.wait();
  console.log("✅ Swapped 1 ETH → USDC (一鍵)");

  const usdcBalanceB = await usdc.balanceOf(deployer.address);
  console.log("User real USDC (B):", ethers.formatUnits(usdcBalanceB, 6));

  // Approve
  await usdc.approve(vaultAddress, ethers.MaxUint256);

  // depositAndInvest
  const daiTx = await vault.depositAndInvest(usdcBalanceB, deployer.address);
  await daiTx.wait();
  console.log("✅ depositAndInvest 成功 (B)");

  // (B).1 印出狀態
  await logVaultState("After depositAndInvest(B)", vault, usdc, deployer.address);

  // 查看新的 shares
  const sharesBTotal = await vault.balanceOf(deployer.address);
  const sharesNewlyMintedB = sharesBTotal - sharesA;
  console.log("Vault shares (B newly minted):", ethers.formatUnits(sharesNewlyMintedB, 6));
  console.log("Vault shares (B total):", ethers.formatUnits(sharesBTotal, 6));

  // ------------------------------------------------
  // (C) 預覽 & 贖回全部
  // ------------------------------------------------
  console.log("\n=== (C) Redeem all shares ===");
  const previewC = await vault.previewRedeemValue(deployer.address);
  console.log("previewRedeemValue:", ethers.formatUnits(previewC, 6));

  const redeemTxC = await vault.redeem(sharesBTotal, deployer.address, deployer.address);
  await redeemTxC.wait();
  console.log("✅ Redeemed all vault shares (C)");

  const finalUsdcC = await usdc.balanceOf(deployer.address);
  console.log("Final USDC after redeem (C):", ethers.formatUnits(finalUsdcC, 6));

  // (C).1 印出狀態
  await logVaultState("After redeemAll(C)", vault, usdc, deployer.address);

  // ------------------------------------------------
  // (D) 測試 redeemPending()
  // ------------------------------------------------
  console.log("\n=== (D) Test redeemPending() ===");
  // Swap 1 ETH -> USDC
  const txSwapD = await swapContract.swapEthForUsdc(
    WETH_ADDRESS,
    UNISWAP_ROUTER,
    oneETH,
    0,
    POOL_FEE,
    { value: oneETH }
  );
  await txSwapD.wait();
  console.log("✅ Swapped 1 ETH → USDC (D for redeemPending)");

  const usdcBalanceD = await usdc.balanceOf(deployer.address);
  console.log("User real USDC (D):", ethers.formatUnits(usdcBalanceD, 6));

  await usdc.approve(vaultAddress, ethers.MaxUint256);
  const depositTxD = await vault.deposit(usdcBalanceD, deployer.address);
  await depositTxD.wait();
  console.log("✅ Deposit => pending (D)");

  // (D).1 印出狀態
  await logVaultState("After deposit(D)", vault, usdc, deployer.address);

  const sharesPendingD = await vault.balanceOf(deployer.address);
  console.log("User vault shares (all pending):", ethers.formatUnits(sharesPendingD, 6));

  // redeemPending
  const redeemPendingTx = await vault.redeemPending(sharesPendingD);
  await redeemPendingTx.wait();
  console.log("✅ redeemPending, got USDC back (D)");

  const usdcAfterRP = await usdc.balanceOf(deployer.address);
  console.log("USDC after redeemPending (D):", ethers.formatUnits(usdcAfterRP, 6));

  // (D).2 印出狀態
  await logVaultState("After redeemPending(D)", vault, usdc, deployer.address);

  // ------------------------------------------------
  // (E) 測試 redeemInvested()
  // ------------------------------------------------
  console.log("\n=== (E) Test redeemInvested() ===");
  // Swap 1 ETH -> USDC
  const txSwapE = await swapContract.swapEthForUsdc(
    WETH_ADDRESS,
    UNISWAP_ROUTER,
    oneETH,
    0,
    POOL_FEE,
    { value: oneETH }
  );
  await txSwapE.wait();
  console.log("✅ Swapped 1 ETH → USDC (E for redeemInvested)");

  const usdcBalanceE = await usdc.balanceOf(deployer.address);
  console.log("User real USDC (E):", ethers.formatUnits(usdcBalanceE, 6));

  // --- 在這裡插入檢查 deposit 前狀態 ---
  await logVaultState("Before deposit(E)", vault, usdc, deployer.address);

  // deposit
  await usdc.approve(vaultAddress, ethers.MaxUint256);
  console.log("Deployer USDC before deposit (E):", ethers.formatUnits(
    await usdc.balanceOf(deployer.address), 6
  ));

  const depositTxE = await vault.deposit(usdcBalanceE, deployer.address);
  await depositTxE.wait();
  console.log("✅ Deposit (E) => pending");

  console.log("Deployer USDC after deposit (E):", ethers.formatUnits(
    await usdc.balanceOf(deployer.address), 6
  ));
  console.log("Vault USDC after deposit (E):", ethers.formatUnits(
    await usdc.balanceOf(vaultAddress), 6
  ));

  // (E).1 再印出狀態
  await logVaultState("After deposit(E)", vault, usdc, deployer.address);

  // invest
  const investTxE = await vault.invest();
  await investTxE.wait();
  console.log("✅ Invest => now user shares are invested (E)");

  // (E).2 再印出狀態
  await logVaultState("After invest(E)", vault, usdc, deployer.address);

  const sharesInvestedE = await vault.balanceOf(deployer.address);
  console.log("User vault shares (invested E):", ethers.formatUnits(sharesInvestedE, 6));

  // redeemInvested 全部
  const redeemInvestedTx = await vault.redeemInvested(sharesInvestedE);
  await redeemInvestedTx.wait();
  console.log("✅ redeemInvested, got USDC back (E)");

  const finalUsdcE = await usdc.balanceOf(deployer.address);
  console.log("Final USDC after redeemInvested (E):", ethers.formatUnits(finalUsdcE, 6));

  // (E).3 最後印出狀態
  await logVaultState("After redeemInvested(E)", vault, usdc, deployer.address);

// ------------------------------------------------
// (F) 測試 withdrawAccumulatedFees()
// ------------------------------------------------
console.log("\n=== (F) Withdraw Accumulated Fees ===");

// 先看看提領前的 Vault 狀態
await logVaultState("Before withdrawFees(F)", vault, usdc, deployer.address);

// 呼叫 withdrawAccumulatedFees，把累積費用提領到 deployer
const feeTx = await vault.withdrawAccumulatedFees(deployer.address);
await feeTx.wait();
console.log("✅ Fees withdrawn (F)");

// 再次檢查
await logVaultState("After withdrawFees(F)", vault, usdc, deployer.address);

console.log("\n=== All tests + Fee withdrawal done ===");
}

main().catch((error) => {
  console.error("Main execution failed:", error);
  process.exitCode = 1;
});
