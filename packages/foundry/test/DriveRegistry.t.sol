// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { DriveRegistry } from "../src/DriveRegistry.sol";

contract DriveRegistryTest is Test {
    DriveRegistry internal reg;

    address internal owner = makeAddr("owner");
    address internal grantee = makeAddr("grantee");
    address internal stranger = makeAddr("stranger");

    string internal constant CID = "bafyCiphertextExample";
    string internal constant NAME = "secret.pdf";
    string internal constant WRAPPED = "bafyWrappedKeyForGrantee";
    uint256 internal constant SIZE = 12345;

    // Mirror the contract's events so we can expectEmit.
    event FileRegistered(
        uint256 indexed fileId, address indexed owner, string cid, string name, uint256 size, uint64 createdAt
    );
    event AccessGranted(
        uint256 indexed fileId, address indexed owner, address indexed grantee, string wrappedKeyCid, uint64 at
    );
    event AccessRevoked(uint256 indexed fileId, address indexed owner, address indexed grantee, uint64 at);
    event FileDeleted(uint256 indexed fileId, address indexed owner, uint64 at);

    function setUp() public {
        reg = new DriveRegistry();
    }

    function _register() internal returns (uint256 fileId) {
        vm.prank(owner);
        fileId = reg.registerFile(CID, NAME, SIZE);
    }

    // AC-1: registerFile emits FileRegistered with incrementing id + caller as owner.
    function test_registerFile_emitsEvent_andStores() public {
        vm.expectEmit(true, true, false, true);
        emit FileRegistered(0, owner, CID, NAME, SIZE, uint64(block.timestamp));

        vm.prank(owner);
        uint256 fileId = reg.registerFile(CID, NAME, SIZE);
        assertEq(fileId, 0);

        DriveRegistry.FileMeta memory m = reg.getFile(fileId);
        assertEq(m.owner, owner);
        assertEq(m.cid, CID);
        assertEq(m.name, NAME);
        assertEq(m.size, SIZE);
        assertTrue(m.exists);
    }

    function test_registerFile_incrementsId() public {
        uint256 a = _register();
        uint256 b = _register();
        assertEq(a, 0);
        assertEq(b, 1);
    }

    // AC-3: owner grants access to non-zero grantee on existing file.
    function test_grantAccess_storesWrappedKey_andEmits() public {
        uint256 fileId = _register();

        vm.expectEmit(true, true, true, true);
        emit AccessGranted(fileId, owner, grantee, WRAPPED, uint64(block.timestamp));

        vm.prank(owner);
        reg.grantAccess(fileId, grantee, WRAPPED);

        assertEq(reg.getWrappedKey(fileId, grantee), WRAPPED);
        assertTrue(reg.hasAccess(fileId, grantee));
    }

    // AC-2: non-owner cannot grant.
    function test_grantAccess_revertsForNonOwner() public {
        uint256 fileId = _register();
        vm.prank(stranger);
        vm.expectRevert(DriveRegistry.NotOwner.selector);
        reg.grantAccess(fileId, grantee, WRAPPED);
    }

    // AC-4: zero-address grantee reverts.
    function test_grantAccess_revertsForZeroGrantee() public {
        uint256 fileId = _register();
        vm.prank(owner);
        vm.expectRevert(DriveRegistry.ZeroAddress.selector);
        reg.grantAccess(fileId, address(0), WRAPPED);
    }

    // AC-4: grant on non-existent file reverts.
    function test_grantAccess_revertsForMissingFile() public {
        vm.prank(owner);
        vm.expectRevert(DriveRegistry.NoSuchFile.selector);
        reg.grantAccess(999, grantee, WRAPPED);
    }

    // AC-5: revoke clears key + emits.
    function test_revokeAccess_clearsKey_andEmits() public {
        uint256 fileId = _register();
        vm.prank(owner);
        reg.grantAccess(fileId, grantee, WRAPPED);

        vm.expectEmit(true, true, true, true);
        emit AccessRevoked(fileId, owner, grantee, uint64(block.timestamp));

        vm.prank(owner);
        reg.revokeAccess(fileId, grantee);

        assertEq(reg.getWrappedKey(fileId, grantee), "");
        assertFalse(reg.hasAccess(fileId, grantee));
    }

    // AC-2: non-owner cannot revoke.
    function test_revokeAccess_revertsForNonOwner() public {
        uint256 fileId = _register();
        vm.prank(owner);
        reg.grantAccess(fileId, grantee, WRAPPED);

        vm.prank(stranger);
        vm.expectRevert(DriveRegistry.NotOwner.selector);
        reg.revokeAccess(fileId, grantee);
    }

    // AC-6: delete tombstones + emits; subsequent grant reverts.
    function test_deleteFile_tombstones_andBlocksGrant() public {
        uint256 fileId = _register();

        vm.expectEmit(true, true, false, true);
        emit FileDeleted(fileId, owner, uint64(block.timestamp));

        vm.prank(owner);
        reg.deleteFile(fileId);

        DriveRegistry.FileMeta memory m = reg.getFile(fileId);
        assertFalse(m.exists);

        vm.prank(owner);
        vm.expectRevert(DriveRegistry.NoSuchFile.selector);
        reg.grantAccess(fileId, grantee, WRAPPED);
    }

    // AC-2: non-owner cannot delete.
    function test_deleteFile_revertsForNonOwner() public {
        uint256 fileId = _register();
        vm.prank(stranger);
        vm.expectRevert(DriveRegistry.NotOwner.selector);
        reg.deleteFile(fileId);
    }

    // Double revoke is a no-op that still emits (idempotent-safe) — key stays empty.
    function test_revoke_withoutGrant_isSafe() public {
        uint256 fileId = _register();
        vm.prank(owner);
        reg.revokeAccess(fileId, grantee);
        assertEq(reg.getWrappedKey(fileId, grantee), "");
    }

    // AC-7 helper: owner file enumeration via getOwnerFileIds.
    function test_getOwnerFileIds_tracksOwnership() public {
        uint256 a = _register();
        uint256 b = _register();
        uint256[] memory ids = reg.getOwnerFileIds(owner);
        assertEq(ids.length, 2);
        assertEq(ids[0], a);
        assertEq(ids[1], b);
    }

    // Fuzz: any non-owner is always rejected on mutations.
    function testFuzz_onlyOwnerCanMutate(address caller) public {
        vm.assume(caller != owner);
        vm.assume(caller != address(0));
        uint256 fileId = _register();

        vm.prank(caller);
        vm.expectRevert(DriveRegistry.NotOwner.selector);
        reg.deleteFile(fileId);
    }
}
