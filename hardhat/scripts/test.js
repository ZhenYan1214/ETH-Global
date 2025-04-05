const hre = require("hardhat");
const { ethers } = hre;

const WETH_ADDRESS   = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS   = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const YEARN_VAULT    = "0xBe53A109B494E5c9f97b9Cd39Fe969BE68BF6204";
const POOL_FEE = 500;

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const user1 = signers[1];
  const user2 = signers[2];
  const user3 = signers[3];
  const user4 = signers[4];
  const user5 = signers[5];

  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);
  console.log("User4:", user4.address);
  console.log("User5:", user5.address);

  // ------------------------------------------------
  // 部署合約
  // ------------------------------------------------
  const SwapETHForUSDC = await ethers.getContractFactory("SwapETHForUSDC");
  const swapContract = await SwapETHForUSDC.deploy(USDC_ADDRESS);
  await swapContract.waitForDeployment();
  console.log("SwapETHForUSDC deployed at:", await swapContract.getAddress());

  const PiggyVault = await ethers.getContractFactory("PiggyVault");
  const vault = await PiggyVault.deploy(
    deployer.address,
    USDC_ADDRESS,
    YEARN_VAULT
  );
  await vault.waitForDeployment();
  console.log("PiggyVault deployed at:", await vault.getAddress());

  // 取得 USDC
  const usdc = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    USDC_ADDRESS,
    deployer
  );

  // 幫助函式：印出 vault 狀態
  async function logVaultState(label) {
    const pendingUSDC = await vault.totalPendingUSDC();
    const pendingPiggy = await vault.totalPendingPiggyShares();
    const investedPiggy = await vault.investedPiggyShares();
    const yearnBal = await vault.yearnSharesBalance();

    console.log(`\n[${label}] Vault state:`);
    console.log("totalPendingUSDC:", ethers.formatUnits(pendingUSDC, 6));
    console.log("totalPendingPiggy:", ethers.formatUnits(pendingPiggy, 6));
    console.log("investedPiggy:", ethers.formatUnits(investedPiggy, 6));
    console.log("yearnSharesBalance:", ethers.formatUnits(yearnBal, 6));
  }

  // 幫助函式：印出使用者 share / pending / USDC餘額
  async function logUserState(u, label) {
    const userShares = await vault.balanceOf(u.address);
    const userUsdc = await usdc.balanceOf(u.address);
    const info = await vault.userInfo(u.address);

    console.log(`[${label}] user: ${u.address}`);
    console.log("Vault shares:", ethers.formatUnits(userShares, 6));
    console.log("User USDC:", ethers.formatUnits(userUsdc, 6));
    console.log("UserInfo pending:", ethers.formatUnits(info.pending, 6));
    console.log("UserInfo shares:", ethers.formatUnits(info.shares, 6));
    console.log("UserInfo deposited:", ethers.formatUnits(info.deposited, 6));
    console.log("-----");
  }

  // ------------------------------------------------
  // 幫助函式：swap 0.5 ETH => USDC
  // ------------------------------------------------
  async function swapHalfETHForUser(u) {
    const halfETH = ethers.parseEther("0.5");
    await swapContract.connect(u).swapEthForUsdc(
      WETH_ADDRESS,
      UNISWAP_ROUTER,
      halfETH,
      0,
      POOL_FEE,
      { value: halfETH }
    );
    const bal = await usdc.balanceOf(u.address);
    console.log(`User ${u.address} USDC after swap:`, ethers.formatUnits(bal, 6));
  }

  // ------------------------------------------------
  // 給五位使用者都換 0.5 ETH => USDC
  // ------------------------------------------------
  await swapHalfETHForUser(user1);
  await swapHalfETHForUser(user2);
  await swapHalfETHForUser(user3);
  await swapHalfETHForUser(user4);
  await swapHalfETHForUser(user5);

  // ------------------------------------------------
  // Step 3: 複雜存款流程
  // ------------------------------------------------
  console.log("\n=== Step 3: complex deposit patterns ===");

  // user1 deposit half
  {
    const bal1 = await usdc.balanceOf(user1.address);
    const depositAmt = bal1 / 2n;
    await usdc.connect(user1).approve(vault, ethers.MaxUint256);
    const tx = await vault.connect(user1).deposit(depositAmt, user1.address);
    await tx.wait();
    console.log("User1 deposit() half:", ethers.formatUnits(depositAmt, 6));
    await logVaultState("After user1 deposit");
    await logUserState(user1, "user1 deposit");
  }

  // user2 depositAndInvest 2/3
  {
    const bal2 = await usdc.balanceOf(user2.address);
    const depositAmt = (bal2 * 2n) / 3n;
    await usdc.connect(user2).approve(vault, ethers.MaxUint256);
    const tx = await vault.connect(user2).depositAndInvest(depositAmt, user2.address);
    await tx.wait();
    console.log("User2 depositAndInvest() 2/3:", ethers.formatUnits(depositAmt, 6));
    await logVaultState("After user2 depositAndInvest");
    await logUserState(user2, "user2 depositAndInvest");
  }

  // user3 deposit all
  {
    const bal3 = await usdc.balanceOf(user3.address);
    await usdc.connect(user3).approve(vault, ethers.MaxUint256);
    const tx = await vault.connect(user3).deposit(bal3, user3.address);
    await tx.wait();
    console.log("User3 deposit() all:", ethers.formatUnits(bal3, 6));
    await logVaultState("After user3 deposit all");
    await logUserState(user3, "user3 deposit");
  }

  // user4 depositAndInvest all
  {
    const bal4 = await usdc.balanceOf(user4.address);
    await usdc.connect(user4).approve(vault, ethers.MaxUint256);
    const tx = await vault.connect(user4).depositAndInvest(bal4, user4.address);
    await tx.wait();
    console.log("User4 depositAndInvest() all:", ethers.formatUnits(bal4, 6));
    await logVaultState("After user4 depositAndInvest");
    await logUserState(user4, "user4 depositAndInvest");
  }

  // user5 deposit half
  {
    const bal5 = await usdc.balanceOf(user5.address);
    const depositAmt = bal5 / 2n;
    await usdc.connect(user5).approve(vault, ethers.MaxUint256);
    const tx = await vault.connect(user5).deposit(depositAmt, user5.address);
    await tx.wait();
    console.log("User5 deposit() half:", ethers.formatUnits(depositAmt, 6));
    await logVaultState("After user5 deposit half");
    await logUserState(user5, "user5 deposit");
  }

  // ------------------------------------------------
  // Step 4: user1 / user2 invests entire pool pending
  // ------------------------------------------------
  console.log("\n=== Step 4: user1 / user2 invests entire pool pending ===");
  {
    // user1 invests
    console.log("User1 calls invest()...");
    const tx = await vault.connect(user1).invest();
    await tx.wait();
    await logVaultState("After user1 invests");
    await logUserState(user1, "user1 after invests");

    // user2 invests
    console.log("User2 calls invest()...");
    const tx2 = await vault.connect(user2).invest();
    await tx2.wait();
    await logVaultState("After user2 invests");
    await logUserState(user2, "user2 after invests");
  }

  // ------------------------------------------------
  // Step 5: partial redeem or pending redeem
  // ------------------------------------------------
  console.log("\n=== Step 5: partial redeem or pending redeem ===");
  {
    // user1 partial redeemInvested
    const user1Shares = await vault.balanceOf(user1.address);
    const halfUser1 = user1Shares / 2n;
    console.log("User1 total shares:", ethers.formatUnits(user1Shares, 6),
                " => redeemInvested half:", ethers.formatUnits(halfUser1, 6));
    const tx = await vault.connect(user1).redeemInvested(halfUser1);
    await tx.wait();
    console.log("User1 partial redeemInvested half => done");
    await logVaultState("After user1 partial redeemInvested");
    await logUserState(user1, "user1 after partial redeemInvested");
  }

  {
    // user2 try redeemPending (if any)
    const user2Shares = await vault.balanceOf(user2.address);
    console.log("User2 total shares:", ethers.formatUnits(user2Shares, 6));
    const halfUser2 = user2Shares / 2n;
    console.log("User2 redeemPending half =>", ethers.formatUnits(halfUser2, 6));

    try {
      const tx = await vault.connect(user2).redeemPending(halfUser2);
      await tx.wait();
      console.log("User2 redeemPending half => done");
    } catch(e) {
      console.log("User2 redeemPending failed or no pending =>", e.reason);
    }
    await logVaultState("After user2 redeemPending");
    await logUserState(user2, "user2 after redeemPending");
  }

  // ... 你可再繼續 Step 6, Step 7, etc. 做更多測試
  // ...
}

main().catch((error) => {
  console.error("Main execution failed:", error);
  process.exitCode = 1;
});
