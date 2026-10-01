/**
 * Whether Adminium would mail an address at all. Its sender leaves reserved
 * names alone — `example.<anything>`, and a `.test`, `.invalid`, `.localhost`
 * or `.example` name — so a sample guest's address gets no email, and the
 * desk says so instead of "on its way".
 */
export function mailable(address: unknown): boolean {
  if (typeof address !== "string") return false;
  const at = address.trim().lastIndexOf("@");
  if (at <= 0) return false;
  const domain = address.trim().slice(at + 1).toLowerCase().replace(/\.$/, "");
  if (domain === "") return false;
  const labels = domain.split(".");
  const top = labels[labels.length - 1] ?? "";
  return !(labels[0] === "example" || ["test", "invalid", "localhost", "example"].includes(top));
}
