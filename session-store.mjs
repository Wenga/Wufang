import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,copyFileSync} from 'node:fs';
import {join} from 'node:path';

const fresh=()=>({version:1,id:crypto.randomUUID(),createdAt:Date.now(),records:[],settings:{landscape:true,height:.5,fontSize:25}});
export class SessionStore {
  constructor(directory=null){
    this.directory=directory;
    if(directory)mkdirSync(directory,{recursive:true});
    this.file=directory?join(directory,'current.json'):null;
    this.state=this.file&&existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')):fresh();
    if(this.state.version!==1||!Array.isArray(this.state.records)||!this.state.settings)throw Error('活动存档格式无效，请保留文件并检查，未自动覆盖。');
  }
  save(state){
    if(this.file){writeFileSync(this.file+'.tmp',JSON.stringify(state),'utf8');renameSync(this.file+'.tmp',this.file);}
    this.state=state;
  }
  append(record){this.save({...this.state,records:[...this.state.records,record]});}
  settings(settings){this.save({...this.state,settings:{...this.state.settings,...settings}});}
  reset(){
    if(this.file&&existsSync(this.file))copyFileSync(this.file,join(this.directory,`session-${this.state.id}.json`));
    this.save({...fresh(),settings:this.state.settings});
  }
}
