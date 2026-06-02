var fs=require("fs");
["jarvis.md","auto.md"].forEach(function(name){
var path="src/templates/platforms/claude/commands/"+name;
var c=fs.readFileSync(path,"utf8");
var old=/Plan Mode.*planner.*:
[sS]*?最多 2 轮)/;
c=c.replace(old,"计划产出后编排者与用户确认关键决策（parallel_batches、Agent 分配），确认无误后推进到 Gate C-impl");
fs.writeFileSync(path,c,"utf8");
console.log(name+" done");
});
