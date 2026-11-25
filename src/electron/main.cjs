const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
let server;
function startServer(){return new Promise((resolve,reject)=>{
 if(server?.listening)return resolve();
 if(app.isPackaged)process.env.LABBOOK_DATA_DIR=path.join(app.getPath('userData'),'data');
 server=require('../server/server.cjs');server.once('error',reject);server.listen(4174,'127.0.0.1',resolve);
})}
async function createWindow(){ await startServer(); const win=new BrowserWindow({width:1440,height:920,minWidth:980,minHeight:680,backgroundColor:'#fbfaf7',title:'Lab Book',webPreferences:{contextIsolation:true}}); win.loadURL('http://127.0.0.1:4174'); }
app.whenReady().then(createWindow); app.on('window-all-closed',()=>{if(process.platform!=='darwin'){server?.close();app.quit()}}); app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
