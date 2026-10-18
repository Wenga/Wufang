export function normalize(raw,total){return {view:Number.isInteger(raw?.view)&&raw.view>=0&&raw.view<total?raw.view:0,done:[...new Set(Array.isArray(raw?.done)?raw.done.filter(i=>Number.isInteger(i)&&i>=0&&i<total):[])]};}
export function browse(state,view,total){return {...state,view:Math.max(0,Math.min(total-1,view))};}
export function complete(state,total){return {view:Math.min(total-1,state.view+1),done:[...new Set([...state.done,state.view])]};}
