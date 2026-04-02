"""
Training script for NCF recommendation model.
Run: python backend/ml/train.py

Requires: torch, pandas, numpy, scikit-learn
Install: pip install torch pandas numpy scikit-learn
"""

import os
import json
import pickle
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sqlalchemy import text

# Add parent dir to path so we can import database
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine
from ml.model import NCF

# ── Config ───────────────────────────────────────────────────────
EMBED_DIM   = 32
MLP_LAYERS  = [64, 32, 16]
DROPOUT     = 0.2
EPOCHS      = 30
BATCH_SIZE  = 256
LR          = 0.001
NEG_RATIO   = 4       # negative samples per positive
MODEL_DIR   = os.path.join(os.path.dirname(__file__), "saved")
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

os.makedirs(MODEL_DIR, exist_ok=True)


# Action → implicit feedback score
# Thứ tự ưu tiên: book/payment > view_detail > click > search/view_list
ACTION_WEIGHTS = {
    "book":         1.0,
    "payment":      1.0,
    "confirmed":    1.0,
    "view_detail":  0.7,
    "click":        0.6,
    "view":         0.4,
    "search":       0.35,
    "view_list":    0.3,
}


# ── 1. Load interactions from DB ─────────────────────────────────
def load_interactions() -> list[tuple[int, int, float]]:
    """
    Extract (user_id, destination_id, score) từ:
    - bookings (confirmed/pending) → score cao nhất
    - reviews → explicit rating
    - user_interactions → implicit feedback theo action type
    - search_logs → search intent (keyword → destination)
    Returns list of (user_id, destination_id, score)
    """
    with engine.connect() as conn:
        # ── A. Hotel bookings ─────────────────────────────────────
        hotel_rows = conn.execute(text("""
            SELECT DISTINCT b.user_id, h.destination_id,
                   CASE b.status
                       WHEN 'confirmed' THEN 1.0
                       WHEN 'pending'   THEN 0.8
                       ELSE 0.5
                   END AS score
            FROM bookings b
            JOIN booking_items bi ON bi.booking_id = b.booking_id
            JOIN room_types rt    ON rt.room_type_id = bi.entity_id AND bi.entity_type = 'room'
            JOIN hotels h         ON h.hotel_id = rt.hotel_id
            WHERE b.status IN ('confirmed','pending')
              AND h.destination_id IS NOT NULL
        """)).fetchall()

        # ── B. Flight bookings → destination by to_city ──────────
        flight_rows = conn.execute(text("""
            SELECT DISTINCT b.user_id, d.destination_id, 0.9 AS score
            FROM bookings b
            JOIN booking_items bi ON bi.booking_id = b.booking_id
            JOIN flights f        ON f.flight_id = bi.entity_id AND bi.entity_type = 'flight'
            JOIN destinations d   ON d.city = f.to_city
            WHERE b.status IN ('confirmed','pending')
        """)).fetchall()

        # ── C. Bus bookings ───────────────────────────────────────
        bus_rows = conn.execute(text("""
            SELECT DISTINCT b.user_id, d.destination_id, 0.9 AS score
            FROM bookings b
            JOIN booking_items bi ON bi.booking_id = b.booking_id
            JOIN buses bs         ON bs.bus_id = bi.entity_id AND bi.entity_type = 'bus'
            JOIN destinations d   ON d.city = bs.to_city
            WHERE b.status IN ('confirmed','pending')
        """)).fetchall()

        # ── D. Reviews (explicit 1-5 → normalize 0-1) ───────────
        review_rows = conn.execute(text("""
            SELECT r.user_id, h.destination_id, (r.rating / 5.0) AS score
            FROM reviews r
            JOIN hotels h ON h.hotel_id = r.entity_id AND r.entity_type = 'hotel'
            WHERE h.destination_id IS NOT NULL
        """)).fetchall()

        # ── E. user_interactions (implicit feedback) ─────────────
        # entity_type='hotel' → map to destination
        # entity_type='flight'/'bus' → skip (no direct dest mapping here)
        interact_rows = conn.execute(text("""
            SELECT ui.user_id, h.destination_id, ui.action
            FROM user_interactions ui
            JOIN hotels h ON h.hotel_id = ui.entity_id AND ui.entity_type = 'hotel'
            WHERE h.destination_id IS NOT NULL
              AND ui.user_id IS NOT NULL
        """)).fetchall()

        # ── F. search_logs (search intent → destination match) ───
        # Match keyword against destination city/name
        search_rows = conn.execute(text("""
            SELECT sl.user_id, d.destination_id,
                   COUNT(*) AS search_count
            FROM search_logs sl
            JOIN destinations d ON (
                d.city  LIKE CONCAT('%', sl.keyword, '%') OR
                d.name  LIKE CONCAT('%', sl.keyword, '%') OR
                sl.keyword LIKE CONCAT('%', d.city, '%')
            )
            WHERE sl.user_id IS NOT NULL
            GROUP BY sl.user_id, d.destination_id
        """)).fetchall()

        # ── Merge all interactions ────────────────────────────────
        # Use dict to aggregate: keep MAX score per (user, dest) pair
        score_map: dict[tuple[int, int], float] = {}

        def _add(uid, did, s):
            key = (int(uid), int(did))
            score_map[key] = max(score_map.get(key, 0.0), float(s))

        for row in hotel_rows:
            _add(row[0], row[1], row[2])
        for row in flight_rows:
            _add(row[0], row[1], row[2])
        for row in bus_rows:
            _add(row[0], row[1], row[2])
        for row in review_rows:
            _add(row[0], row[1], row[2])

        for row in interact_rows:
            action = str(row[2]).lower()
            w = ACTION_WEIGHTS.get(action, 0.3)
            _add(row[0], row[1], w)

        for row in search_rows:
            # Each search keyword match counts, capped at 0.65 regardless of count
            count = int(row[2])
            w = min(0.35 + count * 0.05, 0.65)
            _add(row[0], row[1], w)

        interactions = [(uid, did, score) for (uid, did), score in score_map.items()]

        print(f"[NCF] Data sources:")
        print(f"  Hotel bookings  : {len(hotel_rows)}")
        print(f"  Flight bookings : {len(flight_rows)}")
        print(f"  Bus bookings    : {len(bus_rows)}")
        print(f"  Reviews         : {len(review_rows)}")
        print(f"  User interactions: {len(interact_rows)}")
        print(f"  Search logs     : {len(search_rows)}")
        print(f"  → Total unique (user,dest) pairs: {len(interactions)}")

        return interactions


def load_all_destinations() -> list[int]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT destination_id FROM destinations")).fetchall()
        return [int(r[0]) for r in rows]


# ── 2. Build index mappings ───────────────────────────────────────
def build_mappings(interactions, all_dest_ids):
    user_ids  = sorted(set(u for u, _, _ in interactions))
    item_ids  = sorted(set(all_dest_ids))

    user2idx  = {uid: i + 1 for i, uid in enumerate(user_ids)}   # 1-indexed (0 = padding)
    item2idx  = {did: i + 1 for i, did in enumerate(item_ids)}

    return user2idx, item2idx


# ── 3. Dataset ────────────────────────────────────────────────────
class InteractionDataset(Dataset):
    def __init__(self, samples):
        self.users  = torch.tensor([s[0] for s in samples], dtype=torch.long)
        self.items  = torch.tensor([s[1] for s in samples], dtype=torch.long)
        self.labels = torch.tensor([s[2] for s in samples], dtype=torch.float)

    def __len__(self):
        return len(self.users)

    def __getitem__(self, idx):
        return self.users[idx], self.items[idx], self.labels[idx]


def make_samples(interactions, user2idx, item2idx, all_item_idxs, neg_ratio=NEG_RATIO):
    """Convert raw interactions to (user_idx, item_idx, label) with negative sampling."""
    # Positive samples
    pos_set = {(u, d) for u, d, _ in interactions}
    samples = []

    for user_id, dest_id, score in interactions:
        u = user2idx.get(user_id)
        i = item2idx.get(dest_id)
        if u is None or i is None:
            continue
        samples.append((u, i, score))

        # Negative samples (destinations user never visited)
        neg_added = 0
        attempts  = 0
        while neg_added < neg_ratio and attempts < 100:
            neg_dest = random.choice(all_item_idxs)
            if (user_id, neg_dest) not in pos_set:
                samples.append((u, neg_dest, 0.0))
                neg_added += 1
            attempts += 1

    random.shuffle(samples)
    return samples


# ── 4. Train ──────────────────────────────────────────────────────
def train():
    print(f"[NCF] Using device: {DEVICE}")

    # Load data
    print("[NCF] Loading interactions from DB...")
    interactions = load_interactions()
    all_dest_ids = load_all_destinations()

    if len(interactions) < 10:
        print(f"[NCF] WARNING: Only {len(interactions)} interactions found.")
        print("[NCF] Generating synthetic data for demo purposes...")
        interactions = _generate_synthetic(all_dest_ids)

    print(f"[NCF] Interactions: {len(interactions)}, Destinations: {len(all_dest_ids)}")

    user2idx, item2idx = build_mappings(interactions, all_dest_ids)
    idx2item = {v: k for k, v in item2idx.items()}  # reverse: idx → dest_id
    all_item_idxs = list(item2idx.keys())            # original dest_ids for negative sampling

    samples = make_samples(interactions, user2idx, item2idx, all_item_idxs)
    train_s, val_s = train_test_split(samples, test_size=0.1, random_state=42)

    train_loader = DataLoader(InteractionDataset(train_s), batch_size=BATCH_SIZE, shuffle=True)
    val_loader   = DataLoader(InteractionDataset(val_s),   batch_size=BATCH_SIZE)

    # Model
    model = NCF(
        num_users=len(user2idx),
        num_items=len(item2idx),
        embed_dim=EMBED_DIM,
        mlp_layers=MLP_LAYERS,
        dropout=DROPOUT,
    ).to(DEVICE)

    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)
    criterion = nn.BCELoss()

    best_val_loss = float("inf")
    print(f"[NCF] Training {EPOCHS} epochs, {len(train_s)} train / {len(val_s)} val samples")

    for epoch in range(1, EPOCHS + 1):
        # Train
        model.train()
        train_loss = 0.0
        for users, items, labels in train_loader:
            users, items, labels = users.to(DEVICE), items.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            preds = model(users, items)
            loss  = criterion(preds, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        # Validate
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for users, items, labels in val_loader:
                users, items, labels = users.to(DEVICE), items.to(DEVICE), labels.to(DEVICE)
                preds    = model(users, items)
                val_loss += criterion(preds, labels).item()

        avg_train = train_loss / len(train_loader)
        avg_val   = val_loss   / len(val_loader)
        scheduler.step(avg_val)

        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:3d} | train_loss={avg_train:.4f} | val_loss={avg_val:.4f}")

        if avg_val < best_val_loss:
            best_val_loss = avg_val
            torch.save(model.state_dict(), os.path.join(MODEL_DIR, "ncf_best.pt"))

    print(f"[NCF] Best val loss: {best_val_loss:.4f}")

    # Save mappings & config
    meta = {
        "num_users": len(user2idx),
        "num_items": len(item2idx),
        "embed_dim": EMBED_DIM,
        "mlp_layers": MLP_LAYERS,
        "dropout": DROPOUT,
    }
    with open(os.path.join(MODEL_DIR, "meta.json"), "w") as f:
        json.dump(meta, f)
    with open(os.path.join(MODEL_DIR, "user2idx.pkl"), "wb") as f:
        pickle.dump(user2idx, f)
    with open(os.path.join(MODEL_DIR, "item2idx.pkl"), "wb") as f:
        pickle.dump(item2idx, f)
    with open(os.path.join(MODEL_DIR, "idx2item.pkl"), "wb") as f:
        pickle.dump(idx2item, f)

    print(f"[NCF] Saved model & mappings to {MODEL_DIR}")


# ── 5. Synthetic data (fallback nếu DB ít dữ liệu) ───────────────
def _generate_synthetic(all_dest_ids: list[int]) -> list[tuple]:
    """Generate fake interactions for demo when real data is sparse."""
    import random
    random.seed(42)
    n_users  = 50
    n_sample = 8
    interactions = []
    for user_id in range(1, n_users + 1):
        chosen = random.sample(all_dest_ids, min(n_sample, len(all_dest_ids)))
        for dest_id in chosen:
            score = random.uniform(0.6, 1.0)
            interactions.append((user_id, dest_id, score))
    return interactions


if __name__ == "__main__":
    train()
