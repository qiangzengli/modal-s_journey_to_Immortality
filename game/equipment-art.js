// Code-drawn illustrations keep the character sheet sharp at every panel width.
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
      <radialGradient id="eq-aura"><stop stop-color="#87c8b3" stop-opacity=".22"/><stop offset="1" stop-color="#87c8b3" stop-opacity="0"/></radialGradient>
      <linearGradient id="eq-robe" x1="129" y1="100" x2="195" y2="292" gradientUnits="userSpaceOnUse"><stop stop-color="#84b3a7"/><stop offset=".28" stop-color="#426e66"/><stop offset=".7" stop-color="#294a49"/><stop offset="1" stop-color="#152e32"/></linearGradient>
      <linearGradient id="eq-sleeve" x1="118" y1="103" x2="185" y2="192" gradientUnits="userSpaceOnUse"><stop stop-color="#6f9c91"/><stop offset=".55" stop-color="#365f59"/><stop offset="1" stop-color="#182f35"/></linearGradient>
      <linearGradient id="eq-silk"><stop stop-color="#f2ebd4"/><stop offset=".45" stop-color="#c6d5c1"/><stop offset="1" stop-color="#6d9a90"/></linearGradient>
      <linearGradient id="eq-skin"><stop stop-color="#e8ceb0"/><stop offset=".55" stop-color="#f4dfbe"/><stop offset="1" stop-color="#bd9880"/></linearGradient>
      <linearGradient id="eq-hair"><stop stop-color="#101d27"/><stop offset=".5" stop-color="#233d43"/><stop offset="1" stop-color="#101f27"/></linearGradient>
      <linearGradient id="eq-metal"><stop stop-color="#718e8c"/><stop offset=".45" stop-color="#e1e8d7"/><stop offset=".65" stop-color="#b1c9ba"/><stop offset="1" stop-color="#6b918a"/></linearGradient>
      <linearGradient id="eq-jade"><stop stop-color="#b2d8b3"/><stop offset=".5" stop-color="#649780"/><stop offset="1" stop-color="#23564d"/></linearGradient>
    </defs>
    <ellipse cx="161" cy="170" rx="102" ry="154" fill="url(#eq-aura)"/>
    <g stroke="#a6c5ad" stroke-width=".6"><circle cx="160" cy="152" r="100" opacity=".16"/><circle cx="160" cy="152" r="94" stroke-dasharray="1 7" opacity=".24"/><path d="M160 15v14m0 269v13M63 152h12m170 0h12" opacity=".35"/><ellipse cx="163" cy="311" rx="58" ry="7" opacity=".3"/></g>
    <path d="M101 286c-35-48-10-116 26-137M204 247c25-28 29-59 22-79" stroke="#a4d5c3" stroke-width=".7" opacity=".24"/>
    <g stroke-linecap="round" stroke-linejoin="round">
      <!-- Long tied hair and wind-lifted silk sit behind the body. -->
      <path d="M174 47c22 19 4 55 22 83 7 12 15 14 19 28-15-8-28-22-33-37 3 22 11 39 6 64-1-24-11-40-19-59l-9-63Z" fill="url(#eq-hair)" stroke="#5c8178" stroke-width=".6"/>
      <path d="M178 61c8 25-1 46 18 77m-23-63c-2 28 5 56 11 70" stroke="#8dafa0" stroke-width=".6" opacity=".45"/>
      <path d="M171 42c23 2 18 36 39 41-17-2-25-18-29-28 4 32 11 36 28 44-25-6-28-26-34-47Z" fill="#9fbfb0" opacity=".75"/>
      <path d="M145 273c-4 13-4 25-7 31l-12 6c-3 4 18 5 26 1l9-39m11-3 1 30 8 9c3 4 21 3 19-1l-12-11-1-29" fill="#172b30" stroke="#75968a" stroke-width=".7"/>
      <path d="m143 296 11 2m20-8 12-3m-53 22 18-2m33-3 10 2" stroke="#acb9a0" stroke-width="1"/>
      <!-- The split robe creates a narrow waist and a long, asymmetric silhouette. -->
      <path d="m143 150-19 85c-5 20-11 36-18 49 26-1 40 12 53 15 17-2 37-15 56-10-13-19-17-47-23-72l-12-67Z" fill="url(#eq-robe)" stroke="#82a99b" stroke-width=".8"/>
      <path d="m157 165-17 101-7 26 29 8 20-12-14-126Z" fill="#223f43"/>
      <path d="m155 168-6 61-13 61 18 6 11-71 4-57Z" fill="url(#eq-silk)"/>
      <path d="m168 172 9 65 25 52 12 1c-19-34-19-70-34-120Z" fill="#46766c"/>
      <path d="M147 174c-6 45-21 79-30 109m25-59-13 65m48-105c6 41 10 75 28 99m-47-66-5 64" stroke="#9bc4b1" stroke-width=".8" opacity=".48"/>
      <path d="M111 281c19-1 32 12 48 15m21-11c11-4 22-1 29 1" stroke="#c9d4b4" stroke-width="1.2"/>
      <path d="M153 83c-10 7-22 9-30 17l8 34 9 32 42-2 10-39-2-24-22-17Z" fill="url(#eq-robe)" stroke="#8fb4a2" stroke-width=".7"/>
      <path d="m149 84 11 13 12-14 7 19-18 44-25-41Z" fill="url(#eq-silk)"/>
      <path d="m145 87 22 31-11 29-21-49Z" fill="#a9c4b1" stroke="#d9dfc4" stroke-width=".7"/>
      <path d="m174 87-31 48 3 17 38-53Z" fill="#2b5651" stroke="#d3d7b7" stroke-width="1.2"/>
      <path d="m178 94-28 45" stroke="#899f84" stroke-width=".6"/>
      <!-- Broad silk shoulders taper into fitted bracers. -->
      <path d="M134 96c-14 4-16 13-18 26l-8 39-5 13 19 9 12-30 7-30Z" fill="url(#eq-sleeve)" stroke="#88b2a1" stroke-width=".8"/>
      <path d="M124 101c-7 18-8 34-10 50m9-23-4 28m8 4-11 17" stroke="#abcdb8" stroke-width=".7" opacity=".5"/>
      <path d="m107 165 20 9-4 14-21-8Z" fill="#193d3d" stroke="#c4cfaf" stroke-width=".9"/>
      <path d="m105 171 18 8m-16-3 14 6" stroke="#95afa0" stroke-width=".6"/>
      <path d="m106 181-3 9 3 7 7 1 5-6 1-6Z" fill="url(#eq-skin)" stroke="#ae9b81" stroke-width=".6"/>
      <path d="m107 187 6 3m-7 1 6 3" stroke="#9a7d65" stroke-width=".7"/>
      <path d="M183 96c11 5 17 21 21 40l6 15c-7 9-20 13-31 6l-13-12 9-11 16 6-9-29Z" fill="url(#eq-sleeve)" stroke="#8fafa0" stroke-width=".8"/>
      <path d="m191 110 8 28-10 9m-3 5 14-4" stroke="#acc5ae" stroke-width=".7" opacity=".55"/>
      <path d="m172 130 12 9-7 13-13-9Z" fill="#1c4040" stroke="#c0cdb0" stroke-width=".8"/>
      <path d="m170 137 10 7" stroke="#94b39e"/>
      <path d="m166 140-3-7-3-5 1-2 4 4-1-12c0-3 3-3 3 0l2 9 1-13c1-2 3-2 3 1l1 15 3 6-5 8Z" fill="url(#eq-skin)" stroke="#ad987b" stroke-width=".6"/>
      <path d="m166 130 4 3 3-3" stroke="#a18970" stroke-width=".6"/>
      <!-- Silver cloud embroidery and a jade clasp. -->
      <path d="M126 106c5-9 13-7 13-3 0 3-5 4-5 1m-10 8c6-5 12-3 10 2m48-12c5-5 10-1 8 3m-2 4 5 3m-67 140c5-8 12-8 12-3s-7 4-5 0m-9 10c6-2 9 1 7 4m63-17c-6-7-11-2-7 1s10 1 10 5" stroke="#d1d5b2" stroke-width=".75" opacity=".8"/>
      <path d="m139 157 43-3 2 12-44 4Z" fill="#142f32" stroke="#9cb5a1" stroke-width=".9"/>
      <path d="m141 161 38-3m-38 8 39-3" stroke="#ced3b2" stroke-width=".6"/>
      <path d="m158 156 10-1 5 6-6 7-10-1-3-5Z" fill="url(#eq-metal)"/><path d="m161 158 6 1 2 4-6 3-4-4Z" fill="url(#eq-jade)"/>
      <path d="m169 168 12 46 17 19-9-20-12-48m-20 3-7 42 4 13 9-54" fill="url(#eq-silk)" stroke="#a9bfa4" stroke-width=".6"/>
      <path d="M176 167c17 8 25 34 45 33-22 8-29-13-41-22 15 24 21 36 40 44-26-2-38-29-49-48Z" fill="#739f90" opacity=".85"/>
      <!-- A smaller, three-quarter face and defined eyes avoid a mask-like expression. -->
      <path d="m153 69-2 17 9 12 12-14-3-15Z" fill="url(#eq-skin)"/><path d="m153 76 14 5-13 7Z" fill="#b39a7d" opacity=".55"/>
      <path d="M150 47c6-10 24-7 26 5l-3 18-7 10-7 2-10-8-3-15Z" fill="url(#eq-skin)" stroke="#b5a58b" stroke-width=".5"/>
      <path d="M147 58c-6-19 5-24 15-24 15 0 23 13 14 29l-3-14-9-6-9 6-7 19Z" fill="url(#eq-hair)" stroke="#7b9f92" stroke-width=".6"/>
      <path d="M163 39c-1 10-12 13-15 24m21-23c3 8 6 10 7 17m-14-20c-8 1-11 5-12 10" stroke="#a1b7a6" stroke-width=".6" opacity=".65"/>
      <path d="m150 56 8 2m7 0 7-2" stroke="#3a4540" stroke-width="1.2"/>
      <path d="m150 61 7-1-2 2-4 1m13-2 6 1-2 1-4-1" fill="#f6e8cf"/><path d="m150 61 7-1m7 1 6 1" stroke="#283a37" stroke-width=".8"/>
      <ellipse cx="154" cy="61" rx=".75" ry="1" fill="#1a302f"/><ellipse cx="166" cy="62" rx=".65" ry=".9" fill="#1a302f"/>
      <path d="m161 62-2 6 3 1m-7 5 7 1 3-1" stroke="#a5846c" stroke-width=".7"/><path d="m157 75 4 1" stroke="#e7be9c" stroke-width=".7"/>
      <path d="M149 53c-2 16 0 20-5 26 3-1 5-5 6-9m24-17c2 10 0 20 7 27-5-1-7-8-8-13" fill="#21363b"/>
      <path d="M155 36c-8-16 19-19 17-1" fill="url(#eq-hair)" stroke="#7c9a8a" stroke-width=".7"/>
      <path d="m153 33 2-11 7 5 8-8 3 14-10 6Z" fill="url(#eq-metal)" stroke="#c9d4bb" stroke-width=".7"/>
      <path d="m158 31 5-4 6 3-6 6Z" fill="url(#eq-jade)"/><path d="m148 35 31-5" stroke="#d6d8bc" stroke-width="1.4"/>
      <!-- Equipment stays tied to actual ownership. -->
      <path d="m183 168 9 39" stroke="#abb897" stroke-width=".8"/><path d="m188 206 10-2 1 7c12 12 6 25-7 21-12-4-10-14-4-20Z" fill="#48685c" stroke="#9eaf8c" stroke-width=".7"/>
      <path d="m187 212 13-3m-12 5 12-2m-6 4v10m-3-5 6-1" stroke="#c0c5a4" stroke-width=".7"/>
      ${armed ? staff ? '<path d="m108 195-9 111m11-122 4-51c-14-18 14-29 15-12 1 10-16 13-16 1" stroke="#779a7e" stroke-width="3.5"/><path d="m110 167 5-8-4-10m-10 114 5-8" stroke="#c8d1aa" stroke-width="1"/>' : '<path d="m108 194-9 100 1 17 6-16 9-100Z" fill="url(#eq-metal)" stroke="#c1d4c7" stroke-width=".6"/><path d="m112 198-11 103" stroke="#eff1dd" stroke-width=".8"/><path d="m98 191 13 3 12-1-4 5-8 1-11-4Z" fill="url(#eq-metal)" stroke="#b4c7b4" stroke-width=".7"/><path d="m110 177 1 15" stroke="#26484a" stroke-width="3.5"/><path d="m108 179 5 1m-5 4 5 1m-5 3 5 1" stroke="#b2bfa0" stroke-width=".6"/><path d="m108 176 4-2 3 4-4 2Z" fill="#adbea5"/>' : ''}
      ${bottle ? '<path d="M183 173h6v5l-1 3c1 3 6 5 6 11 0 10-16 10-16 0 0-6 5-8 6-11l-1-3Z" fill="url(#eq-jade)" stroke="#bcd1a7" stroke-width=".6"/><path d="m182 175 8 1m-9 15c4 2 8 2 11 0m-6-6v10" stroke="#d5dfb5" stroke-width=".6"/>' : ''}
    </g>
    <g fill="#c8dbc1" opacity=".65"><circle cx="119" cy="68" r="1"/><circle cx="205" cy="98" r=".8"/><circle cx="209" cy="252" r="1"/><circle cx="128" cy="298" r=".7"/></g>
  </svg>`;
}
