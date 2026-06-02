var fs=require("fs");
var c=fs.readFileSync("src/hook.ts","utf8");

// Replace: when write_code denied but write_doc allowed, exit 0 instead of 2
var old = ;

var neu = ;

if(c.includes(old)){ c=c.replace(old,neu); fs.writeFileSync("src/hook.ts",c,"utf8"); console.log("Done"); }
else { console.log("Old string not found"); }