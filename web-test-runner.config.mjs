import { esbuildPlugin } from "@web/dev-server-esbuild";

export default {
  nodeResolve: true,
  files: "src/**/*.test.tsx",
  plugins: [
    esbuildPlugin({
      ts: true,
      tsx: true,
      target: "auto",
      jsx: "plusnew",
      jsxFactory: "plusnew.createElement",
      jsxFragment: "plusnew.Fragment"
    }),
  ],
}