/**
 * The link students are sent to for a Google Form, or null if `value` isn't a link to one.
 *
 * Teachers often paste the editor link from their address bar (…/d/<id>/edit), which only the
 * form's editors can open. Every docs.google.com form link is rewritten to that form's /viewform
 * page: for an editor id, Google 301-redirects it to the published /d/e/<id>/viewform page and
 * keeps the query string (embedded=true and any pre-filled entry.* answers). forms.gle short
 * links are kept as they are.
 */
export function studentFormUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname === "forms.gle") {
    const code = url.pathname.match(/^\/([A-Za-z0-9]+)\/?$/);
    return code ? `https://forms.gle/${code[1]}` : null;
  }
  // /forms/d/<editor id>/… or /forms/d/e/<published id>/…, optionally under /u/<n>/
  // when the teacher is signed in to several Google accounts.
  const form =
    url.hostname === "docs.google.com" &&
    url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(e\/)?([\w-]{20,})(?:\/|$)/);
  if (!form) return null;
  const student = new URL(
    `https://docs.google.com/forms/d/${form[1] ?? ""}${form[2]}/viewform`,
  );
  // Keep pre-filled answers; drop editor and tracking parameters (usp, edit_requested, ...).
  for (const [key, answer] of url.searchParams)
    if (key.startsWith("entry.")) student.searchParams.append(key, answer);
  return student.toString();
}
