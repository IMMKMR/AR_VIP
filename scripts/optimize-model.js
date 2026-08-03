import { NodeIO } from '@gltf-transform/core';
import { quantize, prune, resample, dedup, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';

async function optimizeGLB() {
  const io = new NodeIO();
  await MeshoptSimplifier.ready;

  const inputPath = path.resolve('public/blue_suitcase.glb');
  const outputPath = path.resolve('public/blue_suitcase_opt.glb');

  console.log('Reading GLB model...');
  const document = await io.read(inputPath);

  console.log('Welding vertices & simplifying high-poly mesh to 5% polygon count...');
  await document.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.05, error: 0.02 }),
    dedup(),
    resample(),
    prune(),
    quantize()
  );

  console.log('Writing lightweight optimized GLB model...');
  const optimizedBuffer = await io.writeBinary(document);
  fs.writeFileSync(outputPath, optimizedBuffer);
  fs.writeFileSync(inputPath, optimizedBuffer);

  const newSize = (optimizedBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`🚀 ULTRA OPTIMIZATION SUCCESS! Model size is now ${newSize} MB`);
}

optimizeGLB().catch(console.error);
