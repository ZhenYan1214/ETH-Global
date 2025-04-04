// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
    // weth:        0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    // usdc:        0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    // router:      0xe592427a0aece92de3edee1f18e0157c05861564
/// @notice 單路徑 swap：ETH -> WETH -> USDC（使用者輸入地址）
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

contract SwapETHForUSDC {
    address public usdcToken;

    constructor(address _usdcToken) {
        usdcToken = _usdcToken;
    }

    /**
     * @dev 執行 swap (ETH -> WETH -> USDC)
     * @param weth WETH 合約地址
     * @param swapRouter Uniswap V3 Router 地址
     * @param amountIn 欲交換的 ETH 數量
     * @param amountOutMinimum 最小可接受 USDC 數量
     * @param poolFee Uniswap V3 的費率：500 / 3000 / 10000
     */
    function swapEthForUsdc(
        address weth,
        address swapRouter,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external payable returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be > 0");
        require(msg.value == amountIn, "ETH amount mismatch");

        // 1. Wrap ETH 為 WETH
        IWETH(weth).deposit{value: amountIn}();

        // 2. Approve router 花我們的 WETH
        IWETH(weth).approve(swapRouter, amountIn);

        // 3. 準備交易參數
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: usdcToken,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        // 4. 執行 swap
        amountOut = ISwapRouter(swapRouter).exactInputSingle(params);
    }

    /// @notice 查詢指定地址的 USDC 餘額
    function getUsdcBalance(address account) external view returns (uint256) {
        return IERC20(usdcToken).balanceOf(account);
    }

    receive() external payable {}
}