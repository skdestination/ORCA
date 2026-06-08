import fs from 'fs';
const p = 'node_modules/@richardaware74/capacitor-ffmpeg-kit/android/build.gradle';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/'com\.arthenica:ffmpeg-kit-full.*/g, "'com.arthenica:ffmpeg-kit-full:6.0.LTS'");
  c = c.replace(/mavenCentral\(\)/g, "mavenCentral()\n        maven { url 'https://maven.aliyun.com/repository/public' }");
  fs.writeFileSync(p, c);
  console.log('Patched ffmpeg-kit version to 6.0.LTS and added aliyun repo');
}
