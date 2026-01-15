// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PiggyBatchSwap} from "../src/PiggyBatchSwap.sol";
import {PiggyPermit2Batcher} from "../src/PiggyPermit2Batcher.sol";
import {PiggyVaultRouter} from "../src/PiggyVaultRouter.sol";
import {PiggyFeeCollector} from "../src/PiggyFeeCollector.sol";
import {PiggyDustSweeper} from "../src/PiggyDustSweeper.sol";

/// @title DeployMainnet
/// @notice Full deployment script for Ethereum Mainnet
contract DeployMainnet is Script {
    // ============================================================
    // MAINNET ADDRESSES
    // ============================================================

    // DEX Routers
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant UNISWAP_V3_ROUTER_02 = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address constant ONEINCH_ROUTER = 0x111111125421cA6dc452d289314280a0f8842A65;
    address constant ZEROX_PROXY = 0xDef1C0ded9bec7F1a1670819833240f027b25EfF;

    // DeFi Vaults
    address constant AAVE_V3_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address constant LIDO = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    address constant WSTETH = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;

    // Yearn Vaults
    address constant YEARN_USDC = 0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE;
    address constant YEARN_DAI = 0xdA816459F1AB5631232FE5e97a05BBBb94970c95;
    address constant YEARN_WETH = 0xa258C4606Ca8206D8aA700cE2143D7db854D168c;

    // Configuration
    uint256 constant INITIAL_FEE_BPS = 30; // 0.3%

    // ============================================================
    // DEPLOYED CONTRACTS
    // ============================================================

    PiggyBatchSwap public batchSwap;
    PiggyPermit2Batcher public permit2Batcher;
    PiggyVaultRouter public vaultRouter;
    PiggyFeeCollector public feeCollector;
    PiggyDustSweeper public dustSweeper;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);

        console2.log("=== Deploying to Ethereum Mainnet ===");
        console2.log("Deployer:", deployer);
        console2.log("Treasury:", treasury);
        console2.log("Chain ID:", block.chainid);

        require(block.chainid == 1, "Not mainnet");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Fee Collector first
        feeCollector = new PiggyFeeCollector(treasury, INITIAL_FEE_BPS);
        console2.log("PiggyFeeCollector:", address(feeCollector));

        // 2. Deploy BatchSwap (no fee - handled by DustSweeper)
        batchSwap = new PiggyBatchSwap(address(feeCollector), 0);
        console2.log("PiggyBatchSwap:", address(batchSwap));

        // 3. Deploy Permit2Batcher
        permit2Batcher = new PiggyPermit2Batcher(address(batchSwap));
        console2.log("PiggyPermit2Batcher:", address(permit2Batcher));

        // 4. Deploy VaultRouter
        vaultRouter = new PiggyVaultRouter();
        console2.log("PiggyVaultRouter:", address(vaultRouter));

        // 5. Deploy DustSweeper
        dustSweeper = new PiggyDustSweeper(
            address(batchSwap),
            address(vaultRouter),
            address(feeCollector)
        );
        console2.log("PiggyDustSweeper:", address(dustSweeper));

        // Configure BatchSwap routers
        _configureRouters();

        // Configure VaultRouter vaults
        _configureVaults();

        // Configure FeeCollector
        feeCollector.setDepositorApproval(address(dustSweeper), true);
        feeCollector.setDepositorApproval(address(batchSwap), true);

        vm.stopBroadcast();

        // Log summary
        _logDeploymentSummary();
    }

    function _configureRouters() internal {
        batchSwap.setRouterApproval(UNISWAP_V3_ROUTER, true);
        batchSwap.setRouterApproval(UNISWAP_V3_ROUTER_02, true);
        batchSwap.setRouterApproval(ONEINCH_ROUTER, true);
        batchSwap.setRouterApproval(ZEROX_PROXY, true);

        console2.log("Routers configured");
    }

    function _configureVaults() internal {
        // Aave
        vaultRouter.setVaultApproval(AAVE_V3_POOL, PiggyVaultRouter.VaultType.AAVE_V3, true);

        // Lido
        vaultRouter.setVaultApproval(LIDO, PiggyVaultRouter.VaultType.LIDO, true);
        vaultRouter.setVaultApproval(WSTETH, PiggyVaultRouter.VaultType.LIDO_WSTETH, true);

        // Yearn
        vaultRouter.setVaultApproval(YEARN_USDC, PiggyVaultRouter.VaultType.YEARN_V2, true);
        vaultRouter.setVaultApproval(YEARN_DAI, PiggyVaultRouter.VaultType.YEARN_V2, true);
        vaultRouter.setVaultApproval(YEARN_WETH, PiggyVaultRouter.VaultType.YEARN_V2, true);

        console2.log("Vaults configured");
    }

    function _logDeploymentSummary() internal view {
        console2.log("");
        console2.log("=== Deployment Summary ===");
        console2.log("PiggyFeeCollector:", address(feeCollector));
        console2.log("PiggyBatchSwap:", address(batchSwap));
        console2.log("PiggyPermit2Batcher:", address(permit2Batcher));
        console2.log("PiggyVaultRouter:", address(vaultRouter));
        console2.log("PiggyDustSweeper:", address(dustSweeper));
        console2.log("");
        console2.log("Fee: 0.3%");
        console2.log("Routers: Uniswap V3, 1inch, 0x");
        console2.log("Vaults: Aave V3, Lido, Yearn");
    }
}
