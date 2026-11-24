const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const plist=path.join(os.homedir(),'Library','LaunchAgents','com.labbook.sota-review.plist');
if(process.argv.includes('--uninstall')){
 if(process.platform==='darwin'&&fs.existsSync(plist))spawnSync('launchctl',['bootout',`gui/${process.getuid()}`,plist],{stdio:'ignore'});
 fs.rmSync(plist,{force:true});console.log('Removed legacy SOTA LaunchAgent.');
}else console.log('SOTA scheduling is built into the server and desktop app. Enable it in Settings, then keep the server running or minimize the desktop window. No separate service is needed.');
