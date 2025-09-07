import json
import logging
import hashlib
import base64
from pathlib import Path

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer_ = algorand.account.from_environment("DEPLOYER")

    sources_dir = Path(__file__).parent.parent.parent / "sources"
    for source_file in sources_dir.glob("*.json"):
        with open(source_file, 'r') as f:
            source_data = json.load(f)

        content_str = source_data.get("content", "")
        content_hash = hashlib.sha256(content_str.encode()).hexdigest()
        
        txn_result = algorand.send.asset_create(
            algokit_utils.AssetCreateParams(
                sender=deployer_.address,
                total=1, 
                decimals=0,
                default_frozen=False,
                manager=deployer_.address,
                reserve=deployer_.address,
                unit_name=source_data.get("source", "SRC")[:8],  # Use source name
                asset_name=source_data.get("title", "News Source")[:32],  # Use title
                note=content_hash.encode(), 
            )
        )

    # After (re)deploy, verify frontend sources against on-chain postings
    _verify_frontend_sources_against_chain(algorand, deployer_.address)


def _verify_frontend_sources_against_chain(algorand: algokit_utils.AlgorandClient, deployer_address: str) -> None:
    """
    For each JSON in frontend/sources, compute the sha256 hex of the "content" field and
    check if there exists an asset creation transaction by the deployer with a matching note.

    The deploy step stores the hex digest bytes as the transaction note for asset creation.
    We query the Indexer for acfg transactions from the deployer and compare notes.
    """
    logger.info("Verifying frontend sources against on-chain records…")

    # Try to get an Indexer client from the Algorand client
    indexer = getattr(algorand, "indexer", None) or getattr(algorand, "indexer_client", None)
    if indexer is None:
        logger.warning("Indexer client not available; skipping on-chain verification.")
        return

    frontend_sources_dir = Path(__file__).parent.parent.parent / "frontend" / "sources"
    if not frontend_sources_dir.exists():
        logger.warning(f"Frontend sources directory not found: {frontend_sources_dir}")
        return

    mismatches: list[str] = []
    verified_count = 0

    for source_file in sorted(frontend_sources_dir.glob("*.json")):
        try:
            with open(source_file, 'r') as f:
                source_data = json.load(f)
            content_str = source_data.get("content", "")
            content_hash_hex = hashlib.sha256(content_str.encode()).hexdigest()

            # Search for asset creation (acfg) txns from the deployer with this note
            try:
                search = indexer.search_transactions(
                    address=deployer_address,
                    txn_type="acfg",
                    note_prefix=content_hash_hex.encode(),
                    limit=50,
                )
                txns = search.get("transactions", []) if hasattr(search, "get") else search["transactions"]
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Indexer query failed for {source_file.name}: {e}")
                mismatches.append(source_file.name)
                continue

            found_match = False
            for tx in txns:
                note_b64 = tx.get("note")
                if not note_b64:
                    continue
                try:
                    note_bytes = base64.b64decode(note_b64)
                    if note_bytes.decode() == content_hash_hex:
                        found_match = True
                        break
                except Exception:  # noqa: BLE001
                    continue

            if found_match:
                logger.info(f"Verified on-chain: {source_file.name}")
                verified_count += 1
            else:
                logger.error(f"No on-chain match found for: {source_file.name}")
                mismatches.append(source_file.name)
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to verify {source_file}: {e}")
            mismatches.append(source_file.name)

    logger.info(f"Frontend verification complete. Verified: {verified_count}, Missing: {len(mismatches)}")
    if mismatches:
        logger.info("Missing or mismatched files:")
        for name in mismatches:
            logger.info(f" - {name}")
