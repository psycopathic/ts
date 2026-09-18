import { Link } from "react-router";
import { MessageCircleIcon } from "lucide-react";
import type { Product, ProductComment } from "../lib/api";

const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

type ProductCardProps = {
  product: Product & {
    user?: {
      name: string;
      imageUrl?: string;
    };
    comments?: ProductComment[];
  };
};

function ProductCard({ product }: ProductCardProps) {
  const isNew = new Date(product.createdAt).getTime() > oneWeekAgo;

  return (
    <Link
      to={`/product/${product.id}`}
      className="card bg-base-300 transition-colors hover:bg-base-200"
    >
      <figure className="px-4 pt-4">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="h-40 w-full rounded-xl object-cover"
        />
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title text-base">
          {product.title}
          {isNew && <span className="badge badge-secondary badge-sm">NEW</span>}
        </h2>
        <p className="line-clamp-2 text-sm text-base-content/70">{product.description}</p>

        <div className="divider my-1" />

        <div className="flex items-center justify-between">
          {product.user ? (
            <div className="flex items-center gap-2">
              <div className="avatar avatar-placeholder">
                <div className="w-6 rounded-full bg-primary text-primary-content ring-1 ring-primary">
                  {product.user.imageUrl ? (
                    <img src={product.user.imageUrl} alt={product.user.name} />
                  ) : (
                    <span className="text-xs">{product.user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-base-content/60">{product.user.name}</span>
            </div>
          ) : (
            <span />
          )}
          {product.comments && (
            <div className="flex items-center gap-1 text-base-content/50">
              <MessageCircleIcon className="size-3" />
              <span className="text-xs">{product.comments.length}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
