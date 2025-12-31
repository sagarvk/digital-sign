export function formatISTDate(date = new Date()) {
  const tz = process.env.STAMP_TZ || "Asia/Kolkata";
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(date).replace(",", "")} IST`;
}
