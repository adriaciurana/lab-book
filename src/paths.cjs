const path=require('node:path');
// Keep persistent files and configuration outside the source tree.
const projectRoot=path.resolve(__dirname,'..');
module.exports={projectRoot};
