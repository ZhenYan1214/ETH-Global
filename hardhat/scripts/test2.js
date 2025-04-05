const hre = require("hardhat");
const { ethers } = hre;

const WETH_ADDRESS   = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS   = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const YEARN_VAULT    = "0xBe53A109B494E5c9f97b9Cd39Fe969BE68BF6204";
const POOL_FEE = 500;

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0]; // owner
  const user1 = signers[1];
  const user2 = signers[2];
  const user3 = signers[3];
  const user4 = signers[4];
  const user5 = signers[5]; // 第五位

  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);
  console.log("User4:", user4.address);
  console.log("User5:", user5.address);

  // ------------------------------------------------
  // 1) 部署合約：SwapETHForUSDC & PiggyVault
  // ------------------------------------------------
  const SwapETHForUSDC = await ethers.getContractFactory("SwapETHForUSDC");
  const swapContract = await SwapETHForUSDC.deploy(USDC_ADDRESS);
  await swapContract.waitForDeployment();
  console.log("SwapETHForUSDC deployed at:", await swapContract.getAddress());

  const PiggyVault = await ethers.getContractFactory("PiggyVault");
  const vault = await PiggyVault.deploy(
    deployer.address, // vault owner
    USDC_ADDRESS,
    YEARN_VAULT
  );
  await vault.waitForDeployment();
  console.log("PiggyVault deployed at:", await vault.getAddress());

  // 取得 USDC ERC20
  const usdc = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    USDC_ADDRESS,
    deployer
  );

  // ------------------------------------------------
  // 2) 給五位使用者各自換一些 ETH -> USDC
  // ------------------------------------------------
  // 每位 user 都 swap 0.5 ETH => USDC
  const halfETH = ethers.parseEther("0.5");

  async function swapForUser(u) {
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

  await swapForUser(user1);
  await swapForUser(user2);
  await swapForUser(user3);
  await swapForUser(user4);
  await swapForUser(user5);

  // 幫助函式：印出某 user 的 vault share & USDC
  async function logUserBalance(u, label) {
    const share = await vault.balanceOf(u.address);
    const ubal = await usdc.balanceOf(u.address);
    console.log(`${label} - user: ${u.address}, VaultShare: ${ethers.formatUnits(share, 6)}, USDC: ${ethers.formatUnits(ubal, 6)}`);
  }

  // ------------------------------------------------
  // 3) 複雜交錯存入
  // ------------------------------------------------
  console.log("\n=== Step 3: complex deposit patterns ===");

  // user1: deposit() 一半
  {
    const b1 = await usdc.balanceOf(user1.address);
    const depositAmt = b1 / 2n;
    await usdc.connect(user1).approve(vault, ethers.MaxUint256);
    await vault.connect(user1).deposit(depositAmt, user1.address);
    console.log("User1 deposit() half:", ethers.formatUnits(depositAmt, 6));
    await logUserBalance(user1, "After user1 deposit");
  }

  // user2: depositAndInvest() 三分之二
  {
    const b2 = await usdc.balanceOf(user2.address);
    const depositAmt = (b2 * 2n) / 3n;
    await usdc.connect(user2).approve(vault, ethers.MaxUint256);
    await vault.connect(user2).depositAndInvest(depositAmt, user2.address);
    console.log("User2 depositAndInvest() 2/3:", ethers.formatUnits(depositAmt, 6));
    await logUserBalance(user2, "After user2 depositAndInvest");
  }

  // user3: deposit() 全部 (pending)
  {
    const b3 = await usdc.balanceOf(user3.address);
    await usdc.connect(user3).approve(vault, ethers.MaxUint256);
    await vault.connect(user3).deposit(b3, user3.address);
    console.log("User3 deposit() all:", ethers.formatUnits(b3, 6));
    await logUserBalance(user3, "After user3 deposit");
  }

  // user4: depositAndInvest() 全部
  {
    const b4 = await usdc.balanceOf(user4.address);
    await usdc.connect(user4).approve(vault, ethers.MaxUint256);
    await vault.connect(user4).depositAndInvest(b4, user4.address);
    console.log("User4 depositAndInvest() all:", ethers.formatUnits(b4, 6));
    await logUserBalance(user4, "After user4 depositAndInvest");
  }

  // user5: deposit() 一半
  {
    const b5 = await usdc.balanceOf(user5.address);
    const depositAmt = b5 / 2n;
    await usdc.connect(user5).approve(vault, ethers.MaxUint256);
    await vault.connect(user5).deposit(depositAmt, user5.address);
    console.log("User5 deposit() half:", ethers.formatUnits(depositAmt, 6));
    await logUserBalance(user5, "After user5 deposit");
  }

  console.log("\n=== Debug: Vault pending/invested state before user1 invest ===");
  const pendingUSDC = await vault.totalPendingUSDC();
  const pendingShares = await vault.totalPendingPiggyShares();
  const investedShares = await vault.investedPiggyShares();
  const yearnShares = await vault.yearnSharesBalance();
  console.log("🧾 totalPendingUSDC:", ethers.formatUnits(pendingUSDC, 6));
  console.log("🧾 totalPendingPiggyShares:", ethers.formatUnits(pendingShares, 6));
  console.log("🪙 investedPiggyShares:", ethers.formatUnits(investedShares, 6));
  console.log("📊 yearnSharesBalance:", ethers.formatUnits(yearnShares, 6));

  // ------------------------------------------------
  // 4) user1 / user2 輪流 invest => 全池 pending
  // ------------------------------------------------
  console.log("\n=== Step 4: user1 / user2 invests entire pool pending ===");
  await vault.connect(user1).invest();
  console.log("User1 called invest");

  // 觀測 user3, user5 是否 pending 已被投資
  await logUserBalance(user3, "user3 after invests");
  await logUserBalance(user5, "user5 after invests");

  // ------------------------------------------------
  // 5) user1 partial redeemInvested; user2 redeemPending (若有)
  // ------------------------------------------------
  console.log("\n=== Step 5: partial redeem or pending redeem ===");
  {
    const s1 = await vault.balanceOf(user1.address);
    const halfS1 = s1 / 2n;
    console.log("User1 total shares:", ethers.formatUnits(s1, 6), " => redeem half:", ethers.formatUnits(halfS1, 6));
    await vault.connect(user1).redeemInvested(halfS1);
    console.log("User1 partial redeemInvested half");
    await logUserBalance(user1, "user1 after partial redeemInvested");
  }

  // user2 redeemPending => 若 user2 沒有pending，就等於會失敗或 0
  try {
    const s2 = await vault.balanceOf(user2.address);
    console.log("User2 total shares:", ethers.formatUnits(s2, 6));
    // test redeemPending for half
    const halfS2 = s2 / 2n;
    await vault.connect(user2).redeemPending(halfS2);
    console.log("User2 redeemPending half => done");
    await logUserBalance(user2, "user2 after redeemPending");
  } catch(e) {
    console.log("User2 redeemPending failed or no pending");
  }

  // ------------------------------------------------
  // 6) user3 invests again; user4 invests again
  // ------------------------------------------------
  console.log("\n=== Step 6: user3 / user4 invests entire pool again ===");
//   await vault.connect(user3).invest();
//   console.log("User3 invests entire pool pending");
//   await vault.connect(user4).invest();
//   console.log("User4 invests entire pool pending again");

  // ------------------------------------------------
  // 7) user5 redeem all shares; user2 partial redeemInvested
  // ------------------------------------------------
  console.log("\n=== Step 7: user5 redeem all, user2 partial redeemInvested ===");
  {
    const user5shares = await vault.balanceOf(user5.address);
    console.log("User5 shares =>", ethers.formatUnits(user5shares, 6), "will redeemAll");
    if (user5shares > 0n) {
      await vault.connect(user5).redeem(user5shares, user5.address, user5.address);
      console.log("User5 redeemed all shares");
      await logUserBalance(user5, "user5 after redeemAll");
    }
  }

  {
    const s2 = await vault.balanceOf(user2.address);
    const part = s2 / 3n; // 1/3
    if (part > 0n) {
      console.log("User2 partial redeemInvested =>", ethers.formatUnits(part, 6));
      await vault.connect(user2).redeemInvested(part);
      await logUserBalance(user2, "user2 after partial redeemInvested");
    }
  }

  // ------------------------------------------------
  // 8) user1 / user3 / user4 each do final invests => maybe no effect
  // ------------------------------------------------
  console.log("\n=== Step 8: final invests from user1, user3, user4 ===");
//   await vault.connect(user1).invest();
//   console.log("User1 invests final");
//   await vault.connect(user3).invest();
//   console.log("User3 invests final");
//   await vault.connect(user4).invest();
//   console.log("User4 invests final");

  // ------------------------------------------------
  // 9) 全部人做最後贖回 or 僅檢查餘額
  // ------------------------------------------------
  console.log("\n=== Step 9: final check + auto redeem if shares > 0 ===");

    const users = [user1, user2, user3, user4, user5];

    for (const user of users) {
    const shares = await vault.balanceOf(user.address);
    console.log(`Checking user ${user.address} - VaultShares: ${ethers.formatUnits(shares, 6)}`);
    
    if (shares > 0n) {
        try {
        await vault.connect(user).redeem(shares, user.address, user.address);
        console.log(`✅ User ${user.address} redeemed ALL shares`);
        } catch (e) {
        console.log(`❌ User ${user.address} redeem failed: ${e.reason || e.message}`);
        }
    } else {
        console.log(`⚠️  User ${user.address} has 0 shares, skipping`);
    }
    }

    // 最終餘額檢查
    console.log("\n=== Final balance check after full redeem ===");
    for (const user of users) {
    await logUserBalance(user, "Final");
    }
}

main().catch((error) => {
  console.error("Main execution failed:", error);
  process.exitCode = 1;
});
