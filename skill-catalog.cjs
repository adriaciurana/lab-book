const fs=require('node:fs'),path=require('node:path');
const resources={instructions:'SKILL.md',communication:'references/communication.md',visual:'references/visual-style.md',workspace:'references/lab-book.md',template:'assets/stream.html',figure:'assets/framework.svg'};
function readSkill(name,resource='instructions'){
 if(!['lab-book-research','research-stream-author'].includes(name))throw Error('Unknown skill');
 if(resource==='bundle')return ['instructions','communication','visual','workspace'].map(key=>readSkill(name,key)).join('\n\n');
 if(!Object.hasOwn(resources,resource)||name==='lab-book-research'&&resource!=='instructions')throw Error('Unknown skill resource');
 const text=fs.readFileSync(path.join(__dirname,'skills',name,resources[resource]),'utf8');
 return resource==='template'?text.replace('<div data-stream-figure="framework"></div>',readSkill(name,'figure')):text;
}
module.exports={readSkill};
