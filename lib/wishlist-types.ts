export type WishlistListing = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  description: string | null;
  canReceiveInquiries: boolean;
  createdAt: string;
};
