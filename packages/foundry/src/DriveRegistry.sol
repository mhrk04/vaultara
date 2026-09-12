// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DriveRegistry
/// @notice Onchain registry for DecentralDrive: records ownership of client-side-encrypted
///         files (referenced by IPFS CID) and revocable, auditable access grants.
/// @dev    Holds NO funds. Solidity is used only for ownership + commitments; the encrypted
///         blob and wrapped decryption keys live on IPFS. Every state change emits an event
///         so an indexer (The Graph) can build the live access log.
contract DriveRegistry {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------
    struct FileMeta {
        address owner; // who registered the file
        string cid; // IPFS CID of the encrypted blob
        string name; // display name (short; treated as non-secret by policy)
        uint256 size; // plaintext byte size, for UI
        uint64 createdAt; // block timestamp at registration
        bool exists; // false after deleteFile (tombstone)
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------
    uint256 public nextFileId;
    mapping(uint256 => FileMeta) private _files;

    /// fileId => grantee => wrapped-key CID ("" means no active grant)
    mapping(uint256 => mapping(address => string)) private _wrappedKeys;

    /// owner => list of fileIds they have registered (append-only; may include deleted)
    mapping(address => uint256[]) private _ownerFileIds;

    // ---------------------------------------------------------------------
    // Events (indexer-first)
    // ---------------------------------------------------------------------
    event FileRegistered(
        uint256 indexed fileId, address indexed owner, string cid, string name, uint256 size, uint64 createdAt
    );
    event AccessGranted(
        uint256 indexed fileId, address indexed owner, address indexed grantee, string wrappedKeyCid, uint64 at
    );
    event AccessRevoked(uint256 indexed fileId, address indexed owner, address indexed grantee, uint64 at);
    event FileDeleted(uint256 indexed fileId, address indexed owner, uint64 at);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------
    error NotOwner();
    error ZeroAddress();
    error NoSuchFile();
    error EmptyCid();

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------
    modifier onlyFileOwner(uint256 fileId) {
        FileMeta storage f = _files[fileId];
        if (!f.exists) revert NoSuchFile();
        if (f.owner != msg.sender) revert NotOwner();
        _;
    }

    // ---------------------------------------------------------------------
    // Mutations
    // ---------------------------------------------------------------------

    /// @notice Register an encrypted file. Caller becomes the owner.
    /// @return fileId the new file's id.
    function registerFile(string calldata cid, string calldata name, uint256 size) external returns (uint256 fileId) {
        if (bytes(cid).length == 0) revert EmptyCid();

        fileId = nextFileId++;
        _files[fileId] = FileMeta({
            owner: msg.sender, cid: cid, name: name, size: size, createdAt: uint64(block.timestamp), exists: true
        });
        _ownerFileIds[msg.sender].push(fileId);

        emit FileRegistered(fileId, msg.sender, cid, name, size, uint64(block.timestamp));
    }

    /// @notice Grant `grantee` access by publishing the wrapped decryption key pointer onchain.
    function grantAccess(uint256 fileId, address grantee, string calldata wrappedKeyCid)
        external
        onlyFileOwner(fileId)
    {
        if (grantee == address(0)) revert ZeroAddress();

        _wrappedKeys[fileId][grantee] = wrappedKeyCid;
        emit AccessGranted(fileId, msg.sender, grantee, wrappedKeyCid, uint64(block.timestamp));
    }

    /// @notice Revoke `grantee`'s access. Clears the wrapped-key pointer. Idempotent.
    function revokeAccess(uint256 fileId, address grantee) external onlyFileOwner(fileId) {
        delete _wrappedKeys[fileId][grantee];
        emit AccessRevoked(fileId, msg.sender, grantee, uint64(block.timestamp));
    }

    /// @notice Delete (tombstone) a file. Grants can no longer be added afterward.
    function deleteFile(uint256 fileId) external onlyFileOwner(fileId) {
        _files[fileId].exists = false;
        emit FileDeleted(fileId, msg.sender, uint64(block.timestamp));
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function getFile(uint256 fileId) external view returns (FileMeta memory) {
        return _files[fileId];
    }

    function getWrappedKey(uint256 fileId, address grantee) external view returns (string memory) {
        return _wrappedKeys[fileId][grantee];
    }

    function hasAccess(uint256 fileId, address grantee) external view returns (bool) {
        return bytes(_wrappedKeys[fileId][grantee]).length != 0;
    }

    function getOwnerFileIds(address owner) external view returns (uint256[] memory) {
        return _ownerFileIds[owner];
    }
}
