import json
import logging
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
