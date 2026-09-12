import { BigInt } from "@graphprotocol/graph-ts";
// BigInt is used in the eventId signature below.
import {
  FileRegistered,
  AccessGranted,
  AccessRevoked,
  FileDeleted,
} from "../generated/DriveRegistry/DriveRegistry";
import { File, Grant, AccessEvent } from "../generated/schema";

function eventId(txHash: string, logIndex: BigInt): string {
  return txHash + "-" + logIndex.toString();
}

export function handleFileRegistered(event: FileRegistered): void {
  const fileId = event.params.fileId.toString();

  const file = new File(fileId);
  file.fileId = event.params.fileId;
  file.owner = event.params.owner;
  file.cid = event.params.cid;
  file.name = event.params.name;
  file.size = event.params.size;
  file.createdAt = event.params.createdAt;
  file.deleted = false;
  file.save();

  const ev = new AccessEvent(eventId(event.transaction.hash.toHex(), event.logIndex));
  ev.kind = "REGISTER";
  ev.fileId = event.params.fileId;
  ev.owner = event.params.owner;
  ev.fileName = event.params.name;
  ev.timestamp = event.block.timestamp;
  ev.txHash = event.transaction.hash;
  ev.save();
}

export function handleAccessGranted(event: AccessGranted): void {
  const grantId = event.params.fileId.toString() + "-" + event.params.grantee.toHex();

  let grant = Grant.load(grantId);
  if (grant == null) {
    grant = new Grant(grantId);
    grant.file = event.params.fileId.toString();
    grant.grantee = event.params.grantee;
  }
  grant.owner = event.params.owner;
  grant.wrappedKeyCid = event.params.wrappedKeyCid;
  grant.active = true;
  grant.grantedAt = event.block.timestamp;
  grant.revokedAt = null;
  grant.save();

  const file = File.load(event.params.fileId.toString());

  const ev = new AccessEvent(eventId(event.transaction.hash.toHex(), event.logIndex));
  ev.kind = "GRANT";
  ev.fileId = event.params.fileId;
  ev.owner = event.params.owner;
  ev.grantee = event.params.grantee;
  ev.fileName = file != null ? file.name : null;
  ev.timestamp = event.block.timestamp;
  ev.txHash = event.transaction.hash;
  ev.save();
}

export function handleAccessRevoked(event: AccessRevoked): void {
  const grantId = event.params.fileId.toString() + "-" + event.params.grantee.toHex();
  const grant = Grant.load(grantId);
  if (grant != null) {
    grant.active = false;
    grant.revokedAt = event.block.timestamp;
    grant.save();
  }

  const file = File.load(event.params.fileId.toString());

  const ev = new AccessEvent(eventId(event.transaction.hash.toHex(), event.logIndex));
  ev.kind = "REVOKE";
  ev.fileId = event.params.fileId;
  ev.owner = event.params.owner;
  ev.grantee = event.params.grantee;
  ev.fileName = file != null ? file.name : null;
  ev.timestamp = event.block.timestamp;
  ev.txHash = event.transaction.hash;
  ev.save();
}

export function handleFileDeleted(event: FileDeleted): void {
  const file = File.load(event.params.fileId.toString());
  if (file != null) {
    file.deleted = true;
    file.save();
  }

  const ev = new AccessEvent(eventId(event.transaction.hash.toHex(), event.logIndex));
  ev.kind = "DELETE";
  ev.fileId = event.params.fileId;
  ev.owner = event.params.owner;
  ev.fileName = file != null ? file.name : null;
  ev.timestamp = event.block.timestamp;
  ev.txHash = event.transaction.hash;
  ev.save();
}
