// SVG icons and equipment layers surround a detailed, locally bundled portrait.
export function equipmentIcon(kind) {
  const paths = {
    weapon: '<path d="m9 27 15-20 2-2 1 5-15 19M7 24l8 6m-5-3-4 5m-2-2 4 4"/>',
    staff: '<path d="M11 32 21 9c-6-7-13 1-8 5 5 4 13-2 10-8M9 22l7 3"/>',
    artifact: '<path d="M14 5h8v5l-2 3c0 4 7 5 7 12 0 10-18 10-18 0 0-7 7-8 7-12l-2-3ZM14 9h8M10 23c5 2 11 2 16 0"/><path d="M18 19v10m-3-7 3 3 3-3"/>',
    skills: '<circle cx="18" cy="18" r="12"/><path d="M18 6c-11 5 11 19 0 24M6 18h24M18 2v3m0 26v3M2 18h3m26 0h3"/><circle cx="18" cy="18" r="3"/>',
    inventory: '<path d="m12 6 6 2 6-2-3 7c2 3 8 6 8 13 0 9-22 9-22 0 0-7 6-10 8-13ZM12 13h12m-10 4 9-1m-5 5v8m-3-4h6"/>',
    head: '<path d="m7 26 2-17 6 7 3-11 4 11 6-7 1 17ZM8 23h21m-14-3 3-4 4 4-4 4Z"/>',
    body: '<path d="m13 6 5 5 5-5 9 7-5 8-4-3 3 14H10l3-14-4 3-5-8ZM13 6l9 13m1-13L13 22m-1 2h12"/>',
    hands: '<path d="m11 6 15 5-6 22-15-5Zm-1 7 14 5m-16 2 13 5m-8-14 5 2-2 5-5-2Z"/>',
    feet: '<path d="M12 5h13l-2 19 7 5v4H8v-6l5-6ZM12 11h12M9 28h14"/>',
    waist: '<path d="M4 13h28v10H4Zm10-3h8v16h-8Zm3 3h2v10h-2"/>',
    ring: '<circle cx="18" cy="22" r="9"/><path d="m18 3 6 7-6 7-6-7ZM9 21a9 9 0 0 1 5-7m8 0a9 9 0 0 1 5 7"/>',
    pill: '<circle cx="18" cy="18" r="11"/><path d="M10 21c0-8 13-8 16-2M12 12l2-2m9 13 1-1"/>',
    array: '<path d="m18 3 13 8v14l-13 8-13-8V11Zm0 5 8 5v10l-8 5-8-5V13Zm0 3v14M11 14l14 8m-14 0 14-8"/>'
  };
  return `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.weapon}</svg>`;
}

export function cultivatorArt({ staff = false, bottle = false, armed = true } = {}) {
  return `<svg class="equipment-figure" viewBox="0 0 320 330" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="eq-aura"><stop stop-color="#8bb5a1" stop-opacity=".19"/><stop offset="1" stop-color="#87c8b3" stop-opacity="0"/></radialGradient>
      <linearGradient id="eq-sword-metal"><stop stop-color="#354744"/><stop offset=".35" stop-color="#b1b69b"/><stop offset=".52" stop-color="#e4dcc0"/><stop offset=".7" stop-color="#8a9a88"/><stop offset="1" stop-color="#3c5350"/></linearGradient>
      <linearGradient id="eq-sword-wrap"><stop stop-color="#101f21"/><stop offset=".5" stop-color="#38504a"/><stop offset="1" stop-color="#122622"/></linearGradient>
      <linearGradient id="eq-staff-wood"><stop stop-color="#253e2f"/><stop offset=".42" stop-color="#7f9571"/><stop offset=".7" stop-color="#a5ac81"/><stop offset="1" stop-color="#354e39"/></linearGradient>
    </defs>
    <ellipse cx="161" cy="170" rx="97" ry="151" fill="url(#eq-aura)"/>
    <g stroke="#a6c5ad" stroke-width=".5"><circle cx="160" cy="152" r="100" opacity=".13"/><circle cx="160" cy="152" r="94" stroke-dasharray="1 7" opacity=".2"/><path d="M160 10v9M63 152h12m170 0h12" opacity=".3"/></g>
    <ellipse cx="162" cy="313" rx="42" ry="4.5" fill="#071c16" opacity=".42"/>
    <ellipse cx="162" cy="313" rx="54" ry="7" stroke="#a3b8a0" stroke-width=".5" opacity=".22"/>
    <!-- Weapons are carried behind the shoulder, leaving the relaxed hands intact. -->
    ${armed ? staff ? `<g data-portrait-equipment="staff" transform="rotate(-14 134 82)" stroke-linecap="round" stroke-linejoin="round">
      <path d="M134 280V65c-10-2-16-8-14-17 2-9 14-14 19-8 5 6 1 13-5 12-5 0-5-6-1-8" stroke="#243e2e" stroke-width="5.2"/>
      <path d="M134 280V65c-10-2-16-8-14-17 2-9 14-14 19-8 5 6 1 13-5 12-5 0-5-6-1-8" stroke="url(#eq-staff-wood)" stroke-width="3.3"/>
      <path d="m131.7 71 4.6-2m-4.6 6 4.6-2m-4.6 6 4.6-2m-4.6 6 4.6-2" stroke="#b2ad84" stroke-width=".8"/>
      <path d="M124 48c-6-1-8-5-6-9 4 1 8 5 6 9m13-8c0-6 3-9 7-9 0 5-2 9-7 9" fill="#5d8063" stroke="#8da382" stroke-width=".4"/>
    </g>` : `<g data-portrait-equipment="sword" transform="rotate(-17 134 82)" stroke-linejoin="round">
      <path d="M131 81h6l-1 169-2 7-2-7Z" fill="url(#eq-sword-wrap)" stroke="#819483" stroke-width=".45"/>
      <path d="M132.7 86v163" stroke="#a0ac91" stroke-width=".5" opacity=".55"/>
      <path d="M131.7 49h4.6v29h-4.6Z" fill="url(#eq-sword-wrap)" stroke="#b2b39a" stroke-width=".45"/>
      <path d="m132 52 4 2m-4 2 4 2m-4 2 4 2m-4 2 4 2m-4 2 4 2m-4 2 4 2m-4 2 4 2" stroke="#839389" stroke-width=".65"/>
      <path d="m131 48 3-4 3 4-1 3h-4Zm-7 31 6-2 4 1 4-1 6 2-2 2-6-1-2 2-2-2-6 1Z" fill="url(#eq-sword-metal)" stroke="#a5ad93" stroke-width=".4"/>
      <path d="M130 78c-6 1-8 7-8 14" stroke="#a69d74" stroke-width=".6"/><path d="m120.8 91 .6 9 2.3-.3-.7-9Z" fill="#667e69"/>
    </g>` : ''}
    <image data-portrait-layer="character" href="/assets/cultivator/portrait.png" x="105" y="16" width="114" height="298"/>
    ${bottle ? '<image data-portrait-layer="bottle" href="/assets/cultivator/spirit-bottle.png" x="105" y="16" width="114" height="298"/>' : ''}
    <g fill="#c8dbc1" opacity=".42"><circle cx="109" cy="72" r=".7"/><circle cx="216" cy="99" r=".6"/><circle cx="214" cy="252" r=".8"/></g>
  </svg>`;
}
