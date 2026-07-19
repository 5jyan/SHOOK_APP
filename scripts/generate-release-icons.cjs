const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const imageDir = path.join(root, 'assets', 'images');
const source = PNG.sync.read(fs.readFileSync(path.join(imageDir, 'Shook-icon-foreground.png')));

function generate(name, size, background, logoScale, opaque = true) {
  const output = new PNG({ width: size, height: size });
  const scaledCanvas = Math.round(size * logoScale);
  const offset = Math.round((size - scaledCanvas) / 2);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const targetIndex = (y * size + x) * 4;
      output.data[targetIndex] = background[0];
      output.data[targetIndex + 1] = background[1];
      output.data[targetIndex + 2] = background[2];
      output.data[targetIndex + 3] = opaque ? 255 : 0;

      if (x < offset || y < offset || x >= offset + scaledCanvas || y >= offset + scaledCanvas) continue;
      const sourceX = Math.min(source.width - 1, Math.floor((x - offset) * source.width / scaledCanvas));
      const sourceY = Math.min(source.height - 1, Math.floor((y - offset) * source.height / scaledCanvas));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[sourceIndex + 3] / 255;
      if (!opaque) {
        output.data[targetIndex] = source.data[sourceIndex];
        output.data[targetIndex + 1] = source.data[sourceIndex + 1];
        output.data[targetIndex + 2] = source.data[sourceIndex + 2];
        output.data[targetIndex + 3] = source.data[sourceIndex + 3];
        continue;
      }
      for (let channel = 0; channel < 3; channel += 1) {
        output.data[targetIndex + channel] = Math.round(
          source.data[sourceIndex + channel] * alpha + background[channel] * (1 - alpha)
        );
      }
    }
  }

  fs.writeFileSync(path.join(imageDir, name), PNG.sync.write(output));
}

generate('Shook-app-icon.png', 1024, [255, 255, 255], 1.44);
generate('Shook-play-store-icon.png', 512, [255, 255, 255], 1.44);
generate('Shook-splash-dark.png', 1024, [16, 16, 19], 0.72);
generate('Shook-adaptive-foreground.png', 1024, [0, 0, 0], 1.4976, false);
