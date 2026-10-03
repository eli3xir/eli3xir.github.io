/* Copy the exact dependency closure from an official Three.js npm package. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const packageDir = path.resolve(process.argv[2] || path.join(root, 'temp-docs/research/package'));
const version = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')).version;
if (version !== '0.185.1') throw new Error(`Unexpected Three.js version: ${version}`);
const source = path.join(packageDir, 'examples/jsm');
const dest = path.join(root, 'vendor/three/addons');
const copied = new Set();
function copy(relative) {
  const src = path.resolve(source, relative);
  if (!src.startsWith(source + path.sep)) throw new Error('Import escapes addon directory');
  if (copied.has(src)) return;
  copied.add(src);
  const code = fs.readFileSync(src, 'utf8');
  const output = path.join(dest, path.relative(source, src));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, code);
  for (const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
    copy(path.relative(source, path.resolve(path.dirname(src), match[1])));
  }
}
for (const entry of [
  'loaders/GLTFLoader.js', 'environments/RoomEnvironment.js',
  'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
  'postprocessing/UnrealBloomPass.js', 'postprocessing/OutputPass.js',
  'postprocessing/ShaderPass.js', 'lights/RectAreaLightUniformsLib.js',
  'utils/BufferGeometryUtils.js',
]) copy(entry);
fs.copyFileSync(path.join(packageDir, 'LICENSE'), path.join(root, 'vendor/three/LICENSE'));
console.log(`Vendored Three.js ${version}: ${copied.size} addon files`);
