const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const label='com.labbook.sota-review',plist=path.join(os.homedir(),'Library','LaunchAgents',label+'.plist');
if(process.argv.includes('--uninstall')){try{fs.unlinkSync(plist);console.log('Removed '+plist)}catch(error){if(error.code!=='ENOENT')throw error}process.exit(0)}
const root=path.resolve(__dirname,'..'),node=process.execPath;fs.mkdirSync(path.dirname(plist),{recursive:true});
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${node}</string><string>${root}/scripts/sota-scheduler.cjs</string></array><key>WorkingDirectory</key><string>${root}</string><key>StartInterval</key><integer>86400</integer><key>RunAtLoad</key><true/><key>StandardOutPath</key><string>${root}/data/sota-review.log</string><key>StandardErrorPath</key><string>${root}/data/sota-review.error.log</string></dict></plist>`;
fs.writeFileSync(plist,xml);console.log('Installed '+plist+' (every 3 days)');
