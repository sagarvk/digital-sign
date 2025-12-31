const API_BASE = import.meta.env.VITE_API_BASE || "";
export async function signPdf({ file }) {
  const fd = new FormData();
  fd.append("pdf", file);

  const res = await fetch(`${API_BASE}/api/sign`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename="([^"]+)"/);
  return { blob, filename: m?.[1] || "[Signed].pdf" };
}
