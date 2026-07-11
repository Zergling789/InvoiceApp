import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../..");const cache=path.join(root,".cache","mustang");await mkdir(cache,{recursive:true});
const target=path.join(cache,"Mustang-CLI-2.24.0.jar");const expected="e4904ffa0afdce3f5836dceb927c440a05ed5d60386fdd37e17a4b2f7652edbf";let valid=false;try{valid=createHash("sha256").update(await readFile(target)).digest("hex")===expected}catch{}if(!valid){const response=await fetch("https://github.com/ZUGFeRD/mustangproject/releases/download/core-2.24.0/Mustang-CLI-2.24.0.jar");if(!response.ok)throw new Error(`Mustang-Download fehlgeschlagen (${response.status})`);await writeFile(target,Buffer.from(await response.arrayBuffer()));}if(createHash("sha256").update(await readFile(target)).digest("hex")!==expected)throw new Error("Mustang-Prüfsumme ungültig");console.log(`Mustang CLI bereit: ${target}`);
