// Code-drawn illustrations keep the character sheet sharp at every panel width.
export function equipmentIcon(kind) {
  const paths = {
    weapon: '<path d="m9 27 15-20 2-2 1 5-15 19M7 24l8 6m-5-3-4 5m-2-2 4 4"/>',
    staff: '<path d="M11 32 21 9c-6-7-13 1-8 5 5 4 13-2 10-8M9 22l7 3"/>',
    artifact: '<path d="M14 5h8v5l-2 3c0 4 7 5 7 12 0 10-18 10-18 0 0-7 7-8 7-12l-2-3ZM14 9h8M10 23c5 2 11 2 16 0"/><path d="M18 19v10m-3-7 3 3 3-3"/>',
    skills: '<circle cx="18" cy="18" r="12"/><path d="M18 6c-11 5 11 19 0 24M6 18h24M18 2v3m0 26v3M2 18h3m26 0h3"/><circle cx="18" cy="18" r="3"/>',
    inventory: '<path d="m12 6 6 2 6-2-3 7c2 3 8 6 8 13 0 9-22 9-22 0 0-7 6-10 8-13ZM12 13h12m-10 4 9-1m-5 5v8m-3-4h6"/>'
  };
  return `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.weapon}</svg>`;
}

export function cultivatorArt({ staff = false, bottle = false, armed = true } = {}) {
  return `<svg class="equipment-figure" viewBox="0 0 320 330" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="eq-aura"><stop stop-color="#97b787" stop-opacity=".2"/><stop offset="1" stop-color="#97b787" stop-opacity="0"/></radialGradient>
      <linearGradient id="eq-robe" x1="123" y1="108" x2="190" y2="292" gradientUnits="userSpaceOnUse"><stop stop-color="#7f9981"/><stop offset=".45" stop-color="#405f54"/><stop offset="1" stop-color="#233e36"/></linearGradient>
      <linearGradient id="eq-sleeve"><stop stop-color="#344b42"/><stop offset=".6" stop-color="#607d69"/><stop offset="1" stop-color="#29483e"/></linearGradient>
      <linearGradient id="eq-silk"><stop stop-color="#d5ceaa"/><stop offset="1" stop-color="#82967a"/></linearGradient>
      <linearGradient id="eq-jade"><stop stop-color="#b7d8a1"/><stop offset=".45" stop-color="#648c66"/><stop offset="1" stop-color="#365742"/></linearGradient>
    </defs>
    <ellipse cx="160" cy="172" rx="122" ry="154" fill="url(#eq-aura)"/>
    <g stroke="#b7b484" stroke-width=".6">
      <circle cx="160" cy="150" r="104" opacity=".16"/><circle cx="160" cy="150" r="96" stroke-dasharray="1 6" opacity=".3"/>
      <path d="M160 18v288M65 150h190" opacity=".12"/>
      <path d="m160 27 4 7-4 7-4-7Zm0 261 4 7-4 7-4-7Z" opacity=".5"/>
      <ellipse cx="160" cy="308" rx="61" ry="10" opacity=".5"/><ellipse cx="160" cy="308" rx="48" ry="6" opacity=".22"/>
    </g>
    <g class="equipment-link" stroke="#a0af87" stroke-width=".8">
      <path data-link="weapon" d="M79 93h19l15 106"/><path data-link="artifact" d="M240 118h-20l-17 87"/>
      <path data-link="skills" d="M79 246h22l59-71"/><path data-link="inventory" d="M240 267h-17l-16-35"/>
    </g>
    <g stroke-linejoin="round">
      <path d="m140 270-3 32-8 4v5h25l3-40m8-1 1 39h26v-5l-10-5-2-29" fill="#172d29" stroke="#8c9676" stroke-width=".8"/>
      <path d="M147 91c-8 9-19 14-25 17l-19 52 12 24 12-20-13 112c22 19 69 22 92 0l-15-113 12 21 15-24-20-50-22-20Z" fill="url(#eq-robe)" stroke="#92a084" stroke-width=".8"/>
      <path d="m150 96 10 13 12-15 10 32-17 44-26-44Z" fill="url(#eq-silk)"/>
      <path d="m147 97 30 41-13 31-10-20-16-40Z" fill="#627961" stroke="#bfc6a0" stroke-width=".8"/>
      <path d="m174 99-30 48 8 20 29-43Z" fill="#3f6253" stroke="#b9be94" stroke-width=".8"/>
      <path d="m130 111-11 51-18 32 16 8 22-36m49-54 14 52 17 31-17 9-22-40" fill="url(#eq-sleeve)" stroke="#8c9f80" stroke-width=".8"/>
      <path d="m102 188 19 9-4 8-20-10m103-5-1 9 19-8-3-8" fill="#b6b492" stroke="#526a54"/>
      <path d="m105 199-3 10 4 5 6-2 4-11m89 1 2 10 7 3 4-6-6-10" fill="#c8b48f" stroke="#897e64"/>
      <path d="m137 176-8 99m22-91-7 104m20-106 1 107m13-111 15 96" stroke="#a7b294" stroke-width=".8" opacity=".4"/>
      <path d="m138 182-17 88 17 8 19-94m11 0 7 98 20-6-17-92" fill="#9eaa8a" opacity=".14"/>
      <path d="m132 164 53 1 2 11-57-1Z" fill="#253a30" stroke="#bdad7d"/>
      <path d="m155 163 12 1 1 13-13-1Z" fill="#9c956b"/><path d="m158 166 6 1v6l-6-1Z" fill="#3c5540"/>
      <path d="m169 175 8 49 8-7-9-42m-25 0-5 42 8-6 4-35" fill="#b4b18a" stroke="#c4bb8c" stroke-width=".5"/>
      <path d="M146 74v22l14 9 13-11V74" fill="#b39f7f"/>
      <path d="M144 60c0-14 33-15 33 2l-3 20-7 10h-12l-10-11Z" fill="#d1bc97" stroke="#9e977c" stroke-width=".7"/>
      <path d="M142 74c-7-24 5-30 18-30 19 0 23 13 19 31l-6-17-13-4-13 9-2 17Z" fill="#1a2b27" stroke="#7b8c75" stroke-width=".8"/>
      <path d="M151 46c-11-19 25-22 19 0" fill="#22362d" stroke="#8f9a79" stroke-width=".8"/>
      <path d="m148 42 28-3m-25 5 19-2" stroke="#c3b17c" stroke-width="1.6"/>
      <path d="m149 72 6-1m10 0 6 1m-12 3-1 6h4m-6 4h8" stroke="#706e58" stroke-width=".8"/>
      <path d="M176 56c5 26-4 40 7 56l-8-6c-6-15-1-31-2-43" fill="#20392f"/>
      <path d="m145 119 6 6m-9 1 6 6m24 62 6 12m-38 46-6 16 8-4m37-18 7 18-9-4" stroke="#c1b784" stroke-width=".8" opacity=".6"/>
      <path d="m187 177 12 44" stroke="#b3a77c"/>
      <path d="m194 219 11-3 3 8c17 16 5 31-10 23-11-6-7-16-2-22Z" fill="#7d7050" stroke="#c3b487" stroke-width=".8"/>
      <path d="m193 225 17-3m-17 4 18-3m-9 7v9m-4-5 9-1" stroke="#c4b487" stroke-width=".8"/>
      ${armed ? staff ? '<path d="m104 215-5 81m7-99 5-54c-15-21 13-27 13-11 0 10-17 11-16-2" stroke="#93a77b" stroke-width="4"/><path d="m101 242 6-8-5-8" stroke="#c3c69a"/>' : '<path d="m104 216-8 70-5 15-3-16 10-70Z" fill="#a8b9ad" stroke="#d1d5ba" stroke-width=".7"/><path d="m99 220-8 66" stroke="#567c6e"/><path d="m89 216 24 2-3 4-19-1Z" fill="#bbad7f"/><path d="m103 199-2 17" stroke="#7e6d48" stroke-width="4"/><path d="m100 200 7 1" stroke="#cebb83" stroke-width="2"/>' : ''}
      ${bottle ? '<path d="M190 180h7v6l-2 3c1 5 8 5 8 14 0 12-21 12-21 0 0-9 7-9 9-14l-1-3Z" fill="url(#eq-jade)" stroke="#b1c995" stroke-width=".8"/><path d="M189 182h9m-13 19c5 3 10 3 15 0m-8-6v11" stroke="#d8ddb2" stroke-width=".7"/>' : ''}
    </g>
    <g fill="#c7c392" stroke="#1c3329" stroke-width="2"><circle cx="111" cy="199" r="3"/><circle cx="203" cy="205" r="3"/><circle cx="160" cy="175" r="3"/><circle cx="207" cy="232" r="3"/></g>
  </svg>`;
}
