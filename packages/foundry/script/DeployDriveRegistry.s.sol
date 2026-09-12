// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DriveRegistry} from "../src/DriveRegistry.sol";

/// @notice Deploys DriveRegistry. Works on local anvil and Base Sepolia.
/// Usage (local):        forge script script/DeployDriveRegistry.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key $PK
/// Usage (Base Sepolia): forge script script/DeployDriveRegistry.s.sol --rpc-url base_sepolia --broadcast --verify --private-key $PK
contract DeployDriveRegistry is Script {
    function run() external returns (DriveRegistry reg) {
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        if (pk == 0) {
            // Fall back to the default anvil account for local deploys.
            pk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        vm.startBroadcast(pk);
        reg = new DriveRegistry();
        vm.stopBroadcast();
        console.log("DriveRegistry deployed at:", address(reg));
    }
}
