"""
Neural Collaborative Filtering (NCF) model for travel destination recommendation.
Architecture: GMF + MLP (NeuMF) combined.
"""

import torch
import torch.nn as nn


class NCF(nn.Module):
    """
    Neural Matrix Factorization combining:
    - GMF (Generalized Matrix Factorization): element-wise product of embeddings
    - MLP (Multi-Layer Perceptron): concatenated embeddings through dense layers
    Final output = sigmoid(W * [GMF_out | MLP_out])
    """

    def __init__(
        self,
        num_users: int,
        num_items: int,
        embed_dim: int = 32,
        mlp_layers: list[int] = [64, 32, 16],
        dropout: float = 0.2,
    ):
        super().__init__()
        self.num_users = num_users
        self.num_items = num_items

        # GMF embeddings
        self.user_embed_gmf = nn.Embedding(num_users + 1, embed_dim, padding_idx=0)
        self.item_embed_gmf = nn.Embedding(num_items + 1, embed_dim, padding_idx=0)

        # MLP embeddings
        self.user_embed_mlp = nn.Embedding(num_users + 1, embed_dim, padding_idx=0)
        self.item_embed_mlp = nn.Embedding(num_items + 1, embed_dim, padding_idx=0)

        # MLP tower
        layers = []
        input_size = embed_dim * 2
        for size in mlp_layers:
            layers += [
                nn.Linear(input_size, size),
                nn.BatchNorm1d(size),
                nn.ReLU(),
                nn.Dropout(dropout),
            ]
            input_size = size
        self.mlp = nn.Sequential(*layers)

        # Output: concat(GMF_out, MLP_out) → 1
        self.output_layer = nn.Linear(embed_dim + mlp_layers[-1], 1)
        self.sigmoid = nn.Sigmoid()

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Embedding):
                nn.init.normal_(m.weight, std=0.01)
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, user: torch.Tensor, item: torch.Tensor) -> torch.Tensor:
        # GMF branch
        u_gmf = self.user_embed_gmf(user)
        i_gmf = self.item_embed_gmf(item)
        gmf_out = u_gmf * i_gmf  # element-wise product

        # MLP branch
        u_mlp = self.user_embed_mlp(user)
        i_mlp = self.item_embed_mlp(item)
        mlp_out = self.mlp(torch.cat([u_mlp, i_mlp], dim=-1))

        # Combine & predict
        combined = torch.cat([gmf_out, mlp_out], dim=-1)
        return self.sigmoid(self.output_layer(combined)).squeeze(-1)
