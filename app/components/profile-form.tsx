"use client";

import { useState, type FormEvent } from "react";

export function ProfileForm({
  initialName,
  initialBio,
  initialCity,
}: {
  initialName: string;
  initialBio: string;
  initialCity: string;
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [city, setCity] = useState(initialCity);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, city }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить профиль.");
      setStatus("Профиль сохранён");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось сохранить профиль.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={save}>
      <label>Имя<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
      <label>Город<input value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} placeholder="Актобе" /></label>
      <label>О себе<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} rows={3} /></label>
      <div className="profile-form-footer">
        <button className="account-create-link" disabled={saving} type="submit">{saving ? "Сохраняем..." : "Сохранить профиль"}</button>
        {status && <span role="status">{status}</span>}
      </div>
    </form>
  );
}
