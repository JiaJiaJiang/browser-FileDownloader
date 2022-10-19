import babel from "@rollup/plugin-babel";
import { nodeResolve } from '@rollup/plugin-node-resolve';
export default {
	input: ["./src/index.js"],
	output: {
		file: "./dist/FileDownloader.js",
		format: "umd",
		name: "FileDownloader",
	},
	plugins: [babel(),nodeResolve()],
}