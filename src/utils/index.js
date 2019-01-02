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

exports.hdr = () =>
{
  return `${exports.dtFmt()}: ${((new Error()).stack||'\n\n').split('\n')[2].trim()}`;
};

exports.err = err =>
{
  return `${err}\n${JSON.stringify(err,null,2)}\n${err.stack}\n${exports.dtFmt()}: ${((new Error()).stack||'\n\n').split('\n')[2].trim()}`;
};

exports.randomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

exports.sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    })
};
