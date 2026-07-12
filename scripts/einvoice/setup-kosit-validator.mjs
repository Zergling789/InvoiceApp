import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const cache = path.join(root, ".cache", "kosit");
const artifacts = [
  { name:"validator-1.6.2-standalone.jar", url:"https://github.com/itplr-kosit/validator/releases/download/v1.6.2/validator-1.6.2-standalone.jar", sha256:"244978514ad48f67c7573acfffc8f4fd73d81feda6f276710033f9913579857e" },
  { name:"xrechnung-3.0.2-validator-configuration-2026-01-31.zip", url:"https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-01-31/xrechnung-3.0.2-validator-configuration-2026-01-31.zip", sha256:"6a5a5911a421b25fbc423f62f93f894df7b236f5d73ca4f84bb222a945082704" },
];
await mkdir(cache,{recursive:true});
for(const artifact of artifacts){const target=path.join(cache,artifact.name);let valid=false;try{valid=createHash("sha256").update(await readFile(target)).digest("hex")===artifact.sha256}catch{}if(!valid){const response=await fetch(artifact.url);if(!response.ok)throw new Error(`Download fehlgeschlagen: ${artifact.name} (${response.status})`);await writeFile(target,Buffer.from(await response.arrayBuffer()));}const actual=createHash("sha256").update(await readFile(target)).digest("hex");if(actual!==artifact.sha256)throw new Error(`Prüfsumme ungültig: ${artifact.name}`);}
const config=path.join(cache,"config");await rm(config,{recursive:true,force:true});await mkdir(config,{recursive:true});
const archive=path.join(cache,artifacts[1].name);const unzip=process.platform==="win32"?spawnSync("tar",["-xf",archive,"-C",config],{stdio:"inherit"}):spawnSync("unzip",["-q",archive,"-d",config],{stdio:"inherit"});if(unzip.status!==0)throw new Error(`Validator-Konfiguration konnte nicht entpackt werden (${process.platform==="win32"?"tar":"unzip"} erforderlich).`);
console.log(`KoSIT Validator bereit: ${cache}`);
