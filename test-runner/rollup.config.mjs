import typescript from 'rollup-plugin-typescript2';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const outputDirectory = 'dist';

function getEnv(key, defaultValue) {
  const value = process.env[key];

  if (!value && !defaultValue) {
    throw new Error(`Missing environment variable ${key}`);
  }

  if (!value) {
    console.warn(`Missing environment variable "${key}". Using default value: ${defaultValue}`);

    return defaultValue;
  }

  return value;
}

function makeConfig(entryFile, artifactName) {
  /**
   * @type {import('rollup').RollupOptions}
   * */
  const commonInput = {
    input: entryFile,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
      }),
      nodeResolve(),
      commonjs(),
    ],
  };

  /**
   * @type {import('rollup').OutputOptions}
   * */
  const commonOutput = {
    exports: 'named',
    sourcemap: true,
  };

  return [
    {
      ...commonInput,
      output: [
        {
          ...commonOutput,
          file: `${outputDirectory}/${artifactName}.js`,
          format: 'cjs',
        },
      ],
    },
  ];
}

export default [...makeConfig('src/main.ts', 'main')];
