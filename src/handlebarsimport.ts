
// browser field in package.json for handlebars 4.7.7 is bad,
// and breaks esbuild
// direct import from file works for now, but is fragile
//import Handlebars from "handlebars/dist/cjs/handlebars.js";
// however the above break typescript
import Handlebars from "handlebars";
// re-export
export {Handlebars};
