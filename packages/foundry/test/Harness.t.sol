// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";

/// @dev Milestone 1 harness test — proves the Foundry toolchain compiles and runs.
contract HarnessTest is Test {
    function test_harness_runs() public pure {
        assertEq(uint256(1) + 1, 2);
    }
}
