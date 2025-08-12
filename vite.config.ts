// replace 'campaign-builder' below with package name

import copy from 'rollup-plugin-copy';
import scss from 'rollup-plugin-scss';
import path from 'path';
import envCompatible from 'vite-plugin-env-compatible';
import * as fsPromises from 'fs/promises';
import { createHtmlPlugin } from 'vite-plugin-html';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { defineConfig, Plugin } from 'vite';
// import Components from 'unplugin-vue-components/vite';
// import { PrimeVueResolver } from '@primevue/auto-import-resolver';

// to get the version number
import npmPackage from './package.json';

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'; 

  return {
    // base: './',
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname,'src')
        },
        {
          find: '@module',
          replacement: path.resolve(__dirname,'static/module.json')
        },
      ],
      extensions: [
        '.mjs',
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.json',
      ]
    },
    plugins: [
      // copy the static module file
      copy({
        targets: [
          { src: 'static/lang', dest: 'dist' },
          { src: 'static/templates', dest: 'dist' }
        ],
        hook: 'writeBundle',
      }),
      // combine all the scss output into one file
      scss({
        api: 'modern',
        output: 'styles/style.css',
        sourceMap: isDevelopment,
        include: ['src/**/*.scss', 'src/**/*.css', ],
        watch: ['src/**/*.scss', 'src/**/*.css', 'src/'],
      }),
      viteCommonjs(),
      envCompatible(),
      createHtmlPlugin({
        inject: {
          data: {
            title: 'easy-phasey'
          }
        }
      }),
      updateModuleManifestPlugin(),
    ],
    build: {
      sourcemap: true,
      outDir: 'dist',
      rollupOptions: {
        input: 'src/main.ts',
        output: {
          // rename output.css to campaign-builder.css
          assetFileNames: (assetInfo): string => {
            if (assetInfo.name === 'output.css') 
              return 'styles/easy-phasey.css';
            else if (assetInfo.name ==='output.css.map')
              return 'styles/easy-phasey.css.map';
            else if (assetInfo.name)
              return assetInfo.name;
            else
              throw 'Asset missing name';
          },        
          entryFileNames: 'scripts/index.js',
          // chunkFileNames: 'scripts/[name].js',
          format: 'es',
          // inlineDynamicImports: true,
        },
      },
    }
  };
});


// a plugin to save the manifest, setting the version # from the npm package.json
function updateModuleManifestPlugin(): Plugin {
  return {
    name: 'update-module-manifest',
    async writeBundle(): Promise<void> {
      // get github info
      const githubProject = process.env.GH_PROJECT;
      const githubTag = process.env.GH_TAG;

      // get the version number
      const moduleVersion = npmPackage.version;

      // read the static file
      const manifestContents: string = await fsPromises.readFile(
        'static/module.json',
        'utf-8'
      );

      // convert to JSON
      const manifestJson = JSON.parse(manifestContents) as Record<string,unknown>;

      // set the version #
      if (moduleVersion) {
        delete manifestJson['## comment:version'];
        manifestJson.version = moduleVersion;
      }

      // set the release info
      if (githubProject) {
        const baseUrl = `https://github.com/${githubProject}/releases`;
        manifestJson.manifest = `${baseUrl}/latest/download/module.json`;

        if (githubTag) {
          manifestJson.download = `${baseUrl}/download/${githubTag}/module.zip`;
        }
      }

      // write the updated file
      await fsPromises.writeFile(
        'dist/module.json',
        JSON.stringify(manifestJson, null, 4)
      );
    },
  };
}