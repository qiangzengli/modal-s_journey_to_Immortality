// API names stay application-relative; the page directory is the deployment root.
// Canonical entry URLs end in / (or index.html), both locally and behind a proxy.
export function gameRequest(path, options) {
  return fetch(`.${path}`, options);
}
