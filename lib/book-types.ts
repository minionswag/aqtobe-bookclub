export type DealType = "EXCHANGE" | "SALE" | "RENT";

export type BookListing = {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  condition: string;
  dealType: DealType;
  price: number | null;
  district: string;
  contactInfo: string;
};
