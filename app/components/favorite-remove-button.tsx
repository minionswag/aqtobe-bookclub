"use client";

import { useState } from "react";

export function FavoriteRemoveButton({ bookId }: { bookId: string }) {
  const [removed, setRemoved] = useState(false);

  async function remove() {
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    if (response.ok) setRemoved(true);
  }

  if (removed) return null;
  return <button className="favorite-remove-button" type="button" onClick={() => void remove()}>Убрать</button>;
}
