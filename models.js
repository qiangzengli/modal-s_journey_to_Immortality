import * as THREE from 'three';

const PRESETS = {
  hanli: { name: '韩立', skin: 0xc58f6b, robe: 0x365f62, robe2: 0x8ca3a0, hair: 0x111a1b, belt: 0xb8914e, build: .96, ponytail: true, cutout: './assets/generated/hanli-cutout-v2.png' },
  zhangtie: { name: '张铁', skin: 0x9b684b, robe: 0x5d4c38, robe2: 0x9c8460, hair: 0x191411, belt: 0x8a7145, build: 1.08, topknot: true },
  lifeiyu: { name: '厉飞雨', skin: 0xc49270, robe: 0x394d61, robe2: 0x8b9cad, hair: 0x111317, belt: 0xb88350, build: 1.02, ponytail: true, sword: true },
  modafu: { name: '墨大夫', skin: 0x9b7567, robe: 0x292829, robe2: 0x655e58, hair: 0xb5b1a9, belt: 0x5d4735, build: .98, beard: true, topknot: true, cutout: './assets/generated/modafu-cutout.png' },
  mocaihuan: { name: '墨彩环', skin: 0xd4a382, robe: 0x26716c, robe2: 0xd2c9a8, hair: 0x23191c, belt: 0xbca16a, build: .9, ponytail: true, ornament: true, cutout: './assets/generated/mocaihuan.png', lumaKey: true },
  examiner: { name: '七玄门执事', skin: 0xb98564, robe: 0x4f3b31, robe2: 0x90735b, hair: 0x26201d, belt: 0x9b7744, build: 1.03, topknot: true },
  gangmaster: { name: '惊蛟会高手', skin: 0xa8785f, robe: 0x492b2d, robe2: 0x8a4d45, hair: 0x171313, belt: 0x8d6941, build: 1.08, sword: true, cutout: './assets/generated/gangmaster-cutout.png' }
};

const textureLoader = new THREE.TextureLoader();

const mat = (color, roughness = .78, metalness = .03) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const add = (parent, geometry, material, position, scale, rotation) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

function createNameplate(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(5, 15, 17, .84)';
  ctx.fillRect(46, 22, 420, 74);
  ctx.strokeStyle = '#d9b66d';
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 22, 420, 74);
  ctx.fillStyle = '#f4eedf';
  ctx.font = '600 38px Microsoft YaHei, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.y = 2.45;
  sprite.scale.set(2.3, .58, 1);
  return sprite;
}

function createCutout(c) {
  const texture = textureLoader.load(c.cutout);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  let material;
  if (c.lumaKey) {
    material = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(map, vUv);
          float lightness = max(texel.r, max(texel.g, texel.b));
          float keyedAlpha = smoothstep(0.035, 0.19, lightness);
          float edgeAlpha = texel.a * keyedAlpha;
          if (edgeAlpha < 0.025) discard;
          gl_FragColor = vec4(texel.rgb, edgeAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  } else {
    material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: .025,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
  }
  const cutout = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 2.73), material);
  cutout.position.y = 1.37;
  cutout.renderOrder = 4;
  cutout.userData.isCutout = true;
  return cutout;
}

export function createCharacterModel(id, { showName = true } = {}) {
  const c = PRESETS[id] || PRESETS.examiner;
  const root = new THREE.Group();
  root.userData.characterId = id;
  root.userData.displayName = c.name;
  const body = new THREE.Group();
  body.scale.setScalar(c.build);
  root.add(body);

  const robe = mat(c.robe);
  const robe2 = mat(c.robe2);
  const skin = mat(c.skin, .72);
  const hair = mat(c.hair, .58);
  const belt = mat(c.belt, .45, .18);
  add(body, new THREE.CylinderGeometry(.3, .42, .8, 10), robe, [0, 1.05, 0]);
  add(body, new THREE.ConeGeometry(.49, 1.05, 10), robe, [0, .48, 0]);
  add(body, new THREE.BoxGeometry(.55, .08, .4), robe2, [0, 1.28, .02]);
  add(body, new THREE.TorusGeometry(.34, .035, 7, 20), belt, [0, .84, 0], null, [Math.PI / 2, 0, 0]);
  add(body, new THREE.BoxGeometry(.2, .58, .2), robe2, [-.15, .2, 0]);
  add(body, new THREE.BoxGeometry(.2, .58, .2), robe2, [.15, .2, 0]);
  add(body, new THREE.BoxGeometry(.25, .13, .38), mat(0x15191b), [-.15, -.08, .04]);
  add(body, new THREE.BoxGeometry(.25, .13, .38), mat(0x15191b), [.15, -.08, .04]);

  for (const side of [-1, 1]) {
    add(body, new THREE.CapsuleGeometry(.145, .58, 5, 8), robe, [side * .48, 1.04, 0], null, [0, 0, side * .2]);
    add(body, new THREE.SphereGeometry(.12, 12, 8), skin, [side * .54, .68, .02]);
  }
  add(body, new THREE.CylinderGeometry(.2, .23, .18, 10), skin, [0, 1.54, 0]);
  add(body, new THREE.SphereGeometry(.33, 20, 14), skin, [0, 1.82, 0], [1, 1.08, .92]);
  add(body, new THREE.SphereGeometry(.035, 10, 8), mat(0x2a201c, .4), [-.115, 1.86, .286], [1.25, .55, .45]);
  add(body, new THREE.SphereGeometry(.035, 10, 8), mat(0x2a201c, .4), [.115, 1.86, .286], [1.25, .55, .45]);
  add(body, new THREE.BoxGeometry(.1, .015, .018), mat(0x754e42), [0, 1.7, .302]);
  add(body, new THREE.SphereGeometry(.35, 18, 12), hair, [0, 1.99, -.045], [1.02, .65, .94]);
  add(body, new THREE.BoxGeometry(.16, .48, .08), hair, [-.25, 1.82, -.02], null, [0, 0, -.12]);
  if (c.topknot) add(body, new THREE.SphereGeometry(.16, 12, 9), hair, [0, 2.24, -.03], [1, 1.2, 1]);
  if (c.ponytail) add(body, new THREE.CapsuleGeometry(.09, .72, 5, 8), hair, [0, 1.64, -.28], null, [.15, 0, 0]);
  if (c.beard) add(body, new THREE.ConeGeometry(.14, .5, 9), hair, [0, 1.54, .28], null, [Math.PI, 0, 0]);
  if (c.ornament) {
    add(body, new THREE.SphereGeometry(.06, 10, 8), mat(0x74b7a8, .3, .25), [-.18, 2.13, .02]);
    add(body, new THREE.SphereGeometry(.045, 10, 8), mat(0xe7d39c, .3, .25), [.16, 2.15, .02]);
  }
  if (c.sword) {
    add(body, new THREE.BoxGeometry(.07, 1.35, .04), mat(0xb9c3c0, .28, .7), [-.45, .82, -.22], null, [0, 0, -.2]);
    add(body, new THREE.BoxGeometry(.28, .04, .08), belt, [-.55, 1.42, -.22], null, [0, 0, -.2]);
  }
  if (c.cutout) {
    body.visible = false;
    const cutout = createCutout(c);
    root.userData.billboard = cutout;
    root.add(cutout);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(.58, 28),
      new THREE.MeshBasicMaterial({ color: 0x020607, transparent: true, opacity: .48, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .012;
    shadow.scale.set(1.2, .42, 1);
    root.add(shadow);
  }
  if (showName) {
    const nameplate = createNameplate(c.name);
    nameplate.position.y = c.cutout ? 3.08 : 2.45;
    root.add(nameplate);
  }
  return root;
}

export function createQuestMarker() {
  const root = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({ color: 0xffd67c, emissive: 0xb76d16, emissiveIntensity: 1.8, metalness: .4, roughness: .3 });
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.18), glow);
  diamond.position.y = 2.9;
  diamond.rotation.z = Math.PI / 4;
  root.add(diamond);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.34, .025, 8, 30), glow);
  ring.position.y = .04;
  ring.rotation.x = Math.PI / 2;
  root.add(ring);
  root.userData.animate = time => {
    diamond.position.y = 2.88 + Math.sin(time * 2.8) * .1;
    diamond.rotation.y = time * 1.7;
    ring.scale.setScalar(1 + Math.sin(time * 3) * .08);
  };
  return root;
}

export function createStoryProp(type) {
  const root = new THREE.Group();
  if (type === 'bottle') {
    add(root, new THREE.CylinderGeometry(.13, .18, .5, 12), mat(0x3c8e72, .18, .35), [0, .3, 0]);
    add(root, new THREE.CylinderGeometry(.07, .09, .18, 10), mat(0x80c4a6, .2, .3), [0, .63, 0]);
  } else if (type === 'letter' || type === 'clue') {
    add(root, new THREE.BoxGeometry(.62, .04, .42), mat(0xd8c89d), [0, .13, 0], null, [0, .2, 0]);
    add(root, new THREE.CylinderGeometry(.08, .08, .055, 14), mat(0x8b302d, .5), [0, .17, 0], null, [Math.PI / 2, 0, 0]);
    if (type === 'clue') add(root, new THREE.TorusGeometry(.42, .025, 8, 28), new THREE.MeshBasicMaterial({ color: 0xf3cd7b, transparent: true, opacity: .78 }), [0, .05, 0], null, [Math.PI / 2, 0, 0]);
  } else if (type === 'herb') {
    add(root, new THREE.CylinderGeometry(.025, .04, .52, 7), mat(0x4f7b4d), [0, .27, 0]);
    for (const side of [-1, 1]) {
      add(root, new THREE.SphereGeometry(.13, 12, 7), mat(side > 0 ? 0x78b76d : 0x4c9564), [side * .12, .26 + side * .08, 0], [1, .42, .65], [0, 0, side * .55]);
    }
    add(root, new THREE.SphereGeometry(.075, 12, 8), new THREE.MeshStandardMaterial({ color: 0xbfe8a5, emissive: 0x4c8f55, emissiveIntensity: .7 }), [0, .56, 0]);
  } else if (type === 'waypoint') {
    const light = new THREE.MeshStandardMaterial({ color: 0xf6d790, emissive: 0x93611f, emissiveIntensity: 1.4, roughness: .3 });
    add(root, new THREE.CylinderGeometry(.12, .2, .42, 8), mat(0x625d50), [0, .21, 0]);
    add(root, new THREE.OctahedronGeometry(.14), light, [0, .66, 0]);
  } else if (type === 'dummy') {
    add(root, new THREE.CylinderGeometry(.08, .1, 1.65, 8), mat(0x5f3e27), [0, .83, 0]);
    add(root, new THREE.BoxGeometry(1.05, .12, .12), mat(0x785037), [0, 1.24, 0]);
    add(root, new THREE.CylinderGeometry(.32, .36, .58, 8), mat(0x80674c), [0, .84, 0]);
    add(root, new THREE.SphereGeometry(.22, 12, 9), mat(0x8d775d), [0, 1.55, 0]);
  } else {
    add(root, new THREE.OctahedronGeometry(.34), new THREE.MeshStandardMaterial({ color: 0x75c8b4, emissive: 0x1e6357, emissiveIntensity: .8, roughness: .25 }), [0, .4, 0]);
  }
  root.userData.displayName = ({ herb: '药草', clue: '可疑线索', waypoint: '前路', dummy: '练功木人', bottle: '神秘小瓶', letter: '书信', altar: '修炼台' })[type] || '目标';
  return root;
}

export { PRESETS };
