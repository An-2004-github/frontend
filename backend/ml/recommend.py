"""
Inference helper for NCF recommendation model.
Loaded once at app startup and reused across requests.
"""

import os
import json
import pickle
import torch
import numpy as np
from typing import Optional

from ml.model import NCF

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved")
DEVICE    = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class Recommender:
    """Singleton-like recommender. Call load() once, then predict() many times."""

    def __init__(self):
        self.model:    Optional[NCF]  = None
        self.user2idx: dict = {}
        self.item2idx: dict = {}
        self.idx2item: dict = {}
        self.all_item_idxs: list[int] = []
        self._ready = False

    def load(self) -> bool:
        """Load model + mappings from disk. Returns True if successful."""
        model_path = os.path.join(MODEL_DIR, "ncf_best.pt")
        meta_path  = os.path.join(MODEL_DIR, "meta.json")
        if not os.path.exists(model_path) or not os.path.exists(meta_path):
            return False

        try:
            with open(meta_path) as f:
                meta = json.load(f)
            with open(os.path.join(MODEL_DIR, "user2idx.pkl"), "rb") as f:
                self.user2idx = pickle.load(f)
            with open(os.path.join(MODEL_DIR, "item2idx.pkl"), "rb") as f:
                self.item2idx = pickle.load(f)
            with open(os.path.join(MODEL_DIR, "idx2item.pkl"), "rb") as f:
                self.idx2item = pickle.load(f)

            self.model = NCF(
                num_users=meta["num_users"],
                num_items=meta["num_items"],
                embed_dim=meta["embed_dim"],
                mlp_layers=meta["mlp_layers"],
                dropout=meta.get("dropout", 0.2),
            ).to(DEVICE)
            self.model.load_state_dict(torch.load(model_path, map_location=DEVICE))
            self.model.eval()

            self.all_item_idxs = list(self.item2idx.values())
            self._ready = True
            print(f"[NCF] Model loaded. Users={meta['num_users']}, Items={meta['num_items']}")
            return True
        except Exception as e:
            print(f"[NCF] Failed to load model: {e}")
            return False

    @property
    def ready(self) -> bool:
        return self._ready

    def predict(
        self,
        user_id: int,
        top_k: int = 8,
        exclude_dest_ids: list[int] = [],
        boost_dest_ids: dict[int, float] = {},   # dest_id → boost weight (0..1)
    ) -> list[dict]:
        """
        Predict top-K destination IDs for a user.
        boost_dest_ids: destinations to boost score (e.g. from recent searches).
        Returns list of {"destination_id": int, "score": float, "boosted": bool}
        """
        if not self._ready or self.model is None:
            return []

        user_idx = self.user2idx.get(user_id)

        # Unknown user → return popular items
        if user_idx is None:
            return self._popular_items(top_k, exclude_dest_ids, boost_dest_ids)

        exclude_idxs = {self.item2idx[d] for d in exclude_dest_ids if d in self.item2idx}
        candidate_idxs = [i for i in self.all_item_idxs if i not in exclude_idxs]

        if not candidate_idxs:
            return []

        u_tensor = torch.tensor([user_idx] * len(candidate_idxs), dtype=torch.long).to(DEVICE)
        i_tensor = torch.tensor(candidate_idxs, dtype=torch.long).to(DEVICE)

        with torch.no_grad():
            scores = self.model(u_tensor, i_tensor).cpu().numpy()

        # Apply search boost: score = score + boost_weight * (1 - score)
        # This nudges score upward without exceeding 1.0
        boost_map = {self.item2idx[d]: w for d, w in boost_dest_ids.items() if d in self.item2idx}
        boosted_flags = []
        for i, c_idx in enumerate(candidate_idxs):
            if c_idx in boost_map:
                scores[i] = scores[i] + boost_map[c_idx] * (1.0 - scores[i])
                boosted_flags.append(True)
            else:
                boosted_flags.append(False)

        sorted_indices = np.argsort(-scores)[:top_k]
        results = []
        for idx in sorted_indices:
            dest_id = self.idx2item.get(candidate_idxs[idx])
            if dest_id is not None:
                results.append({
                    "destination_id": dest_id,
                    "score":   float(scores[idx]),
                    "boosted": boosted_flags[idx],
                })
        return results

    def _popular_items(self, top_k: int, exclude_dest_ids: list[int], boost_dest_ids: dict[int, float] = {}) -> list[dict]:
        """Fallback: average score across all user embeddings → popularity proxy."""
        if not self._ready or self.model is None:
            return []

        exclude_idxs = {self.item2idx[d] for d in exclude_dest_ids if d in self.item2idx}
        candidate_idxs = [i for i in self.all_item_idxs if i not in exclude_idxs][:50]

        if not candidate_idxs:
            return []

        all_user_idxs = list(self.user2idx.values())
        if len(all_user_idxs) > 20:
            all_user_idxs = all_user_idxs[:20]  # sample for speed

        scores_sum = np.zeros(len(candidate_idxs))
        with torch.no_grad():
            for u_idx in all_user_idxs:
                u_tensor = torch.tensor([u_idx] * len(candidate_idxs), dtype=torch.long).to(DEVICE)
                i_tensor = torch.tensor(candidate_idxs, dtype=torch.long).to(DEVICE)
                scores_sum += self.model(u_tensor, i_tensor).cpu().numpy()

        avg_scores = scores_sum / max(len(all_user_idxs), 1)

        # Apply boost
        boost_map = {self.item2idx[d]: w for d, w in boost_dest_ids.items() if d in self.item2idx}
        boosted_flags = []
        for i, c_idx in enumerate(candidate_idxs):
            if c_idx in boost_map:
                avg_scores[i] = avg_scores[i] + boost_map[c_idx] * (1.0 - avg_scores[i])
                boosted_flags.append(True)
            else:
                boosted_flags.append(False)

        sorted_indices = np.argsort(-avg_scores)[:top_k]
        results = []
        for idx in sorted_indices:
            dest_id = self.idx2item.get(candidate_idxs[idx])
            if dest_id is not None:
                results.append({
                    "destination_id": dest_id,
                    "score":   float(avg_scores[idx]),
                    "boosted": boosted_flags[idx],
                })
        return results


# Global singleton
recommender = Recommender()
