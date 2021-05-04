'use strict';

exports.dtFmt = dt =>
{
  switch(typeof dt)
  {
  case "number": dt=new Date(dt); break;
  case "object": if( dt instanceof Date && !isNaN(dt.getTime()) ) break;
  case "string": dt=new Date(dt); break;
  case "undefined":
  default:
    dt=new Date();
    break;
  }
  return dt.getFullYear()
    +"-"+("0"  +(dt.getMonth       ()+1)).slice(-2)
    +"-"+("0"  + dt.getDate        ()   ).slice(-2)
    +" "+("0"  + dt.getHours       ()   ).slice(-2)
    +":"+("0"  + dt.getMinutes     ()   ).slice(-2)
    +":"+("0"  + dt.getSeconds     ()   ).slice(-2)
    +"."+("000"+ dt.getMilliseconds()   ).slice(-3)
  ;
};

exports.base    = __dirname
exports.filter  = null
exports.glb     = {}
exports.tab     = undefined
exports.log =
{
  err: (...msg) =>
  {
    if(exports.glb.test) return
    for(const err of msg)
    {
      if(err instanceof Error)console.log(`${err}\nerror object\n${JSON.stringify(err,exports.filter,exports.tab)}\nerror object string\n${err.stack}\nerror stack\n${exports.dtFmt()}: ${((new Error()).stack||'\n\n').split('\n')[2].trim()}`)
      else                    console.log(err)
    }
  },
  msg: (...msg) => { if(!exports.glb.test) for(const txt of msg) console.log(txt) }
}

exports.hdr = () =>
{
  const stk = (new Error()).stack || ''
  const str = `${exports.dtFmt()}: ${stk.split('\n')[2].trim()}`
  const lid = str.replace(`(${exports.base}`, '(.')
  return lid
}

exports.err = err =>
{
  const stk = (new Error()).stack || ''
  const str = `${exports.dtFmt()}: ${stk.split('\n')[2].trim()}`
  const lid = str.replace(`(${exports.base}`, '(.')
  return `${err} err\n${JSON.stringify(err,null,2)} str\n${err.stack} stk\n${lid}`
}

exports.randomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

exports.sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    })
};
