# Hydrogen upgrade guide: 2026.4.1 to 2026.4.3

----

## Features

### Add Vite 8 support [#3617](https://github.com/Shopify/hydrogen/pull/3617)

#### Replace vite-tsconfig-paths with Vite's built-in tsconfig path resolution
> Vite 8 supports tsconfig path aliases natively. Remove the vite-tsconfig-paths plugin from vite.config.ts before the dependency is removed from package.json.
[#3617](https://github.com/Shopify/hydrogen/pull/3617)
```diff
// vite.config.ts
 import {defineConfig} from 'vite';
 import {hydrogen} from '@shopify/hydrogen/vite';
 import {oxygen} from '@shopify/mini-oxygen/vite';
 import {reactRouter} from '@react-router/dev/vite';
-import tsconfigPaths from 'vite-tsconfig-paths';
 
 export default defineConfig({
-  plugins: [hydrogen(), oxygen(), reactRouter(), tsconfigPaths()],
+  plugins: [hydrogen(), oxygen(), reactRouter()],
+  resolve: {
+    tsconfigPaths: true,
+  },
 });
```

----
